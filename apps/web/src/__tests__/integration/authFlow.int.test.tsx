import { describe, beforeAll, afterAll, afterEach, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Login from "../../pages/Login";
import Register from "../../pages/Register";
import Dashboard from "../../pages/Dashboard";
import { AuthProvider } from "../../contexts/AuthContext";

vi.mock("@heroicons/react/24/outline", () => ({
  ShieldCheckIcon: () => <div data-testid="shield-icon" />,
  UserGroupIcon: () => <div data-testid="user-icon" />,
  ClockIcon: () => <div data-testid="clock-icon" />,
}));

const server = setupServer(
  http.post("/api/auth/login", async ({ request }: { request: Request }) => {
    const body = (await request.json()) as { email: string };
    return HttpResponse.json({
      user: { id: "user-1", email: body.email },
      tokens: { accessToken: "token-123", refreshToken: "refresh-123" },
    });
  }),
  http.post("/api/auth/register", async ({ request }: { request: Request }) => {
    const body = (await request.json()) as { email: string };
    return HttpResponse.json(
      {
        user: { id: "user-2", email: body.email },
        tokens: { accessToken: "token-999", refreshToken: "refresh-999" },
      },
      { status: 201 },
    );
  }),
  http.get("/api/vault/entries", () => HttpResponse.json([])),
  http.get("/api/activity", () => HttpResponse.json({ data: [] })),
  http.get("/api/successors", () => HttpResponse.json({ successors: [] })),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={ui} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("Auth flows", () => {
  it("logs in and stores token", async () => {
    renderWithProviders(<Login />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "Password123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(localStorage.getItem("token")).toBe("token-123");
    });
  });

  it("registers new user and stores token", async () => {
    renderWithProviders(<Register />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), "new@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "Password123!");
    await user.type(screen.getByLabelText(/confirm password/i), "Password123!");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(localStorage.getItem("token")).toBe("token-999");
    });
  });
});
