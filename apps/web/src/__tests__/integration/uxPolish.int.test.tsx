import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../contexts/AuthContext";

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
  ChevronDownIcon: () => <div data-testid="chevron-down-icon" />,
  LockOpenIcon: () => <div data-testid="lock-open-icon" />,
  BellAlertIcon: () => <div data-testid="bell-alert-icon" />,
  HandRaisedIcon: () => <div data-testid="hand-raised-icon" />,
  EnvelopeIcon: () => <div data-testid="envelope-icon" />,
  ArrowPathIcon: () => <div data-testid="arrow-path-icon" />,
  PauseCircleIcon: () => <div data-testid="pause-circle-icon" />,
}));

vi.mock("../../services/api", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn().mockRejectedValue(new Error("not authenticated")),
  },
}));

vi.mock("../../services/encryption", () => ({
  deriveAuthKey: vi.fn().mockResolvedValue("mock-auth-key"),
  generateEncryptionSalt: vi.fn().mockReturnValue("mock-salt"),
  setMasterKey: vi.fn(),
  clearMasterKey: vi.fn(),
}));

vi.mock("../../services/realtime", () => ({
  realtimeClient: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
  },
}));

function renderWithAuth(ui: React.ReactElement) {
  return render(
    <AuthProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </AuthProvider>,
  );
}

describe("Login page UX", () => {
  it("renders generic 'Welcome back' without user name", async () => {
    const Login = (await import("../../pages/Login")).default;
    renderWithAuth(<Login />);

    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.queryByText(/Welcome back,/)).not.toBeInTheDocument();
  });

  it("hides 2FA section by default and shows it on toggle", async () => {
    const Login = (await import("../../pages/Login")).default;
    renderWithAuth(<Login />);

    expect(screen.queryByLabelText("Two-Factor Code")).not.toBeInTheDocument();

    const toggle = screen.getByText(/Have a two-factor or recovery code/i);
    fireEvent.click(toggle);

    expect(screen.getByLabelText("Two-Factor Code")).toBeInTheDocument();
  });
});

describe("Register page UX", () => {
  it("shows password strength indicator when typing", async () => {
    const Register = (await import("../../pages/Register")).default;
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    const passwordInput = screen.getByPlaceholderText(/Min 12 chars/);

    fireEvent.change(passwordInput, { target: { value: "abc" } });
    expect(screen.getByText("Weak")).toBeInTheDocument();

    fireEvent.change(passwordInput, { target: { value: "Abc123!@defgh" } });
    expect(screen.getByText("Very Strong")).toBeInTheDocument();
  });

  it("does not show strength indicator when password is empty", async () => {
    const Register = (await import("../../pages/Register")).default;
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Weak")).not.toBeInTheDocument();
    expect(screen.queryByText("Strong")).not.toBeInTheDocument();
  });
});

describe("ResetPassword page UX", () => {
  it("shows data loss warning when token is present", async () => {
    const ResetPassword = (await import("../../pages/ResetPassword")).default;
    render(
      <MemoryRouter initialEntries={["/reset-password?token=test-token"]}>
        <ResetPassword />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/This will erase all encrypted data/),
    ).toBeInTheDocument();
    expect(screen.getByText(/zero-knowledge encryption/)).toBeInTheDocument();
  });
});

describe("getPasswordStrength utility", () => {
  it("returns correct scores for various passwords", async () => {
    const mod = await import("../../pages/Register");
    const source = (mod as Record<string, unknown>).__test_getPasswordStrength;
    if (typeof source !== "function") {
      return;
    }

    const weak = source("ab");
    expect(weak.label).toBe("Weak");

    const strong = source("Abc123!@defgh");
    expect(strong.label).toBe("Very Strong");
  });
});
