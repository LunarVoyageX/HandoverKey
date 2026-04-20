import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Vault from "../../pages/Vault";
import { AuthProvider } from "../../contexts/AuthContext";
import { ToastProvider } from "../../contexts/ToastContext";
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

// Mock framer-motion — strip non-DOM props to silence React warnings
const MOTION_PROPS = new Set([
  "initial",
  "animate",
  "exit",
  "transition",
  "variants",
  "whileHover",
  "whileTap",
  "whileFocus",
  "whileDrag",
  "whileInView",
  "layout",
  "layoutId",
  "onAnimationComplete",
]);

function stripMotionProps<T extends Record<string, unknown>>(
  props: T,
): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!MOTION_PROPS.has(k)) clean[k] = v;
  }
  return clean;
}

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => (
      <div {...stripMotionProps(props)}>{children}</div>
    ),
    h1: ({ children, ...props }: React.ComponentProps<"h1">) => (
      <h1 {...stripMotionProps(props)}>{children}</h1>
    ),
    h2: ({ children, ...props }: React.ComponentProps<"h2">) => (
      <h2 {...stripMotionProps(props)}>{children}</h2>
    ),
    p: ({ children, ...props }: React.ComponentProps<"p">) => (
      <p {...stripMotionProps(props)}>{children}</p>
    ),
    button: ({ children, ...props }: React.ComponentProps<"button">) => (
      <button {...stripMotionProps(props)}>{children}</button>
    ),
    span: ({ children, ...props }: React.ComponentProps<"span">) => (
      <span {...stripMotionProps(props)}>{children}</span>
    ),
  },
}));

// Mock API
vi.mock("../../services/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock Encryption Service
vi.mock("../../services/encryption", () => ({
  encryptData: vi.fn().mockResolvedValue({
    encryptedData: "enc-data",
    iv: "iv",
    salt: "salt",
    algorithm: "AES-GCM",
  }),
  decryptData: vi.fn().mockResolvedValue({
    name: "Test Entry",
    secret: "test-secret",
    category: "Login",
    type: "password",
  }),
  arrayBufferToBase64: vi.fn().mockReturnValue("mock-base64"),
  clearMasterKey: vi.fn(),
  generateEncryptionSalt: vi.fn().mockReturnValue("mock-salt"),
  deriveAuthKey: vi.fn().mockResolvedValue("mock-auth-key"),
  setMasterKey: vi.fn().mockResolvedValue(undefined),
}));

describe("Vault Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    (api.get as Mock).mockImplementation((url: string) => {
      if (url.includes("/vault/entries")) {
        return Promise.resolve({
          data: [
            {
              id: "entry-1",
              encryptedData: "enc-data",
              iv: "iv",
              algorithm: "AES-GCM",
              category: "Login",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              version: 1,
            },
          ],
        });
      }
      if (url.includes("/activity")) {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url.includes("/auth/profile")) {
        return Promise.resolve({
          data: { user: { id: "user-1", email: "test@example.com" } },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it("should fetch and display vault entries", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <ToastProvider>
            <Vault />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText("Test Entry")).toBeInTheDocument();
    });

    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("should open modal and add new entry", async () => {
    (api.post as Mock).mockResolvedValue({
      data: {
        id: "entry-2",
        encryptedData: "enc-data",
        iv: "iv",
        algorithm: "AES-GCM",
        category: "Login",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      },
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AuthProvider>
          <ToastProvider>
            <Vault />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(
      () => {
        expect(screen.getByText("Test Entry")).toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    const addButton = screen.getByText(/Add Secret/i);
    await user.click(addButton);

    await user.type(screen.getByLabelText(/Name/i), "New Secret");
    await user.type(screen.getByLabelText(/Secret Content/i), "my-secret");

    const saveButton = screen.getByRole("button", { name: /^save$/i });
    await user.click(saveButton);

    await waitFor(
      () => {
        expect(screen.queryByText(/Save Secret/i)).not.toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    expect(api.post).toHaveBeenCalledWith("/vault/entries", expect.any(Object));
  }, 30000);
});
