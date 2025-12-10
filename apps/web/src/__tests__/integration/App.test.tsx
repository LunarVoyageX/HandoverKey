import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import App from "../../App";

// Mock the API
vi.mock("../services/api", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe("App Integration", () => {
  it("renders login page by default", () => {
    render(<App />);
    expect(screen.getByText(/Sign in to HandoverKey/i)).toBeInTheDocument();
  });

  it("navigates to register page", async () => {
    render(<App />);
    const registerLink = screen.getByText(/create a new account/i);
    expect(registerLink).toBeInTheDocument();
    // We can't easily test navigation with BrowserRouter inside App unless we mock window.location or use userEvent to click
    // But since it's a Link, we can check if it has the right href
    expect(registerLink).toHaveAttribute("href", "/register");
  });
});
