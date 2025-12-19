import {
  describe,
  beforeAll,
  afterAll,
  afterEach,
  it,
  expect,
  vi,
  beforeEach,
} from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Login from "../../pages/Login";
import Register from "../../pages/Register";
import Dashboard from "../../pages/Dashboard";
import { AuthProvider } from "../../contexts/AuthContext";
import React from "react";
import api from "../../services/api";

// Mock Heroicons with all used components
vi.mock("@heroicons/react/24/outline", () => ({
  ShieldCheckIcon: () => <div data-testid="shield-icon" />,
  UserGroupIcon: () => <div data-testid="user-icon" />,
  ClockIcon: () => <div data-testid="clock-icon" />,
  KeyIcon: () => <div data-testid="key-icon" />,
  LockClosedIcon: () => <div data-testid="lock-icon" />,
  DocumentTextIcon: () => <div data-testid="doc-icon" />,
  MagnifyingGlassIcon: () => <div data-testid="search-icon" />,
  PlusIcon: () => <div data-testid="plus-icon" />,
  Bars3Icon: () => <div data-testid="bars-icon" />,
  XMarkIcon: () => <div data-testid="xmark-icon" />,
  HomeIcon: () => <div data-testid="home-icon" />,
  Cog6ToothIcon: () => <div data-testid="cog-icon" />,
  ArrowRightOnRectangleIcon: () => <div data-testid="logout-icon" />,
  ExclamationTriangleIcon: () => <div data-testid="warning-icon" />,
  DocumentIcon: () => <div data-testid="document-icon" />,
  CheckCircleIcon: () => <div data-testid="check-icon" />,
  XCircleIcon: () => <div data-testid="error-icon" />,
  InformationCircleIcon: () => <div data-testid="info-icon" />,
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}));

// Mock API
vi.mock("../../services/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock Encryption Service
vi.mock("../../services/encryption", () => ({
  deriveAuthKey: vi.fn().mockResolvedValue("mock-auth-key"),
  setMasterKey: vi.fn().mockResolvedValue(undefined),
  clearMasterKey: vi.fn(),
  generateEncryptionSalt: vi.fn().mockReturnValue("mock-salt"),
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();

  (api.get as any).mockImplementation((url: string) => {
    if (url.includes("/auth/profile")) {
      return Promise.resolve({
        data: {
          user: { id: "user-1", email: "test@example.com", salt: "mock-salt" },
        },
      });
    }
    return Promise.resolve({ data: {} });
  });
});

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
    (api.post as any).mockResolvedValue({
      data: {
        user: { id: "user-1", email: "test@example.com", salt: "mock-salt" },
        tokens: { accessToken: "token-123", refreshToken: "refresh-123" },
      },
    });

    const user = userEvent.setup();
    renderWithProviders(<Login />);

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "Password123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(localStorage.getItem("token")).toBe("token-123");
    });
  });

  it("registers new user and stores token", async () => {
    (api.post as any).mockResolvedValue({
      data: {
        user: { id: "user-2", email: "new@example.com", salt: "mock-salt" },
        tokens: { accessToken: "token-999", refreshToken: "refresh-999" },
      },
    });

    const user = userEvent.setup();
    renderWithProviders(<Register />);

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/full name/i), "John Doe");
    await user.type(screen.getByLabelText(/email/i), "new@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "Password123!");
    await user.type(screen.getByLabelText(/confirm password/i), "Password123!");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(localStorage.getItem("token")).toBe("token-999");
    });
  });
});
