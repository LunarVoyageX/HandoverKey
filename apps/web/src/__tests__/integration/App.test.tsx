import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import App from "../../App";

// Mock Heroicons with all used components
vi.mock("@heroicons/react/24/outline", () => ({
  ShieldCheckIcon: () => <div data-testid="shield-icon" />,
  ClockIcon: () => <div data-testid="clock-icon" />,
  KeyIcon: () => <div data-testid="key-icon" />,
  UserGroupIcon: () => <div data-testid="user-icon" />,
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

// Mock the API
vi.mock("../../services/api", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: new Proxy(
    {},
    {
      get: (_target, prop) => {
        return ({ children, ...props }: React.ComponentProps<"div">) => {
          const Tag = String(prop) as keyof React.JSX.IntrinsicElements;
          return <Tag {...props}>{children}</Tag>;
        };
      },
    },
  ),
}));

describe("App Integration", () => {
  it("renders landing page by default", () => {
    render(<App />);
    expect(screen.getAllByText(/HandoverKey/i)[0]).toBeInTheDocument();
  });

  it("navigates to register page", async () => {
    render(<App />);
    const registerLink = screen.getByRole("link", { name: /get started/i });
    expect(registerLink).toBeInTheDocument();
    // We can't easily test navigation with BrowserRouter inside App unless we mock window.location or use userEvent to click
    // But since it's a Link, we can check if it has the right href
    expect(registerLink).toHaveAttribute("href", "/register");
  });
});
