import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
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
  ComputerDesktopIcon: () => <div data-testid="desktop-icon" />,
  ClipboardDocumentListIcon: () => <div data-testid="clipboard-icon" />,
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
  it("renders landing page by default", async () => {
    render(<App />);
    const heading = await screen.findAllByText(/HandoverKey/i);
    expect(heading[0]).toBeInTheDocument();
  });

  it("navigates to register page", async () => {
    render(<App />);
    const registerLink = await screen.findByRole("link", {
      name: /get started/i,
    });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute("href", "/register");
  });

  it("renders NotFound page for unknown routes", async () => {
    window.history.pushState({}, "", "/some-unknown-page");
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/page not found/i)).toBeInTheDocument();
    });
  });
});
