export declare const API_ENDPOINTS: {
    readonly AUTH: {
        readonly REGISTER: "/api/v1/auth/register";
        readonly LOGIN: "/api/v1/auth/login";
        readonly LOGOUT: "/api/v1/auth/logout";
        readonly REFRESH: "/api/v1/auth/refresh";
        readonly PROFILE: "/api/v1/auth/profile";
    };
    readonly VAULT: {
        readonly ENTRIES: "/api/v1/vault/entries";
        readonly SEARCH: "/api/v1/vault/search";
    };
    readonly USERS: {
        readonly PROFILE: "/api/v1/users/profile";
        readonly SUCCESSORS: "/api/v1/users/successors";
    };
    readonly HANDOVER: {
        readonly STATUS: "/api/v1/handover/status";
        readonly CHECK_IN: "/api/v1/handover/check-in";
        readonly AUDIT_LOGS: "/api/v1/handover/audit-logs";
    };
};
export declare const ENCRYPTION_CONSTANTS: {
    readonly ALGORITHM: "AES-GCM";
    readonly KEY_LENGTH: 256;
    readonly IV_LENGTH: 12;
    readonly TAG_LENGTH: 128;
    readonly PBKDF2_ITERATIONS: 100000;
    readonly SALT_LENGTH: 16;
};
export declare const VALIDATION_RULES: {
    readonly PASSWORD: {
        readonly MIN_LENGTH: 12;
        readonly REQUIRE_UPPERCASE: true;
        readonly REQUIRE_LOWERCASE: true;
        readonly REQUIRE_NUMBER: true;
        readonly REQUIRE_SPECIAL: true;
    };
    readonly EMAIL: {
        readonly MAX_LENGTH: 255;
    };
    readonly VAULT: {
        readonly MAX_FILE_SIZE: number;
        readonly MAX_CATEGORY_LENGTH: 100;
        readonly MAX_TAG_LENGTH: 50;
        readonly MAX_TAGS_PER_ENTRY: 10;
    };
};
export declare const DEFAULT_VALUES: {
    readonly HANDOVER_DELAY_DAYS: 90;
    readonly REMINDER_INTERVAL_DAYS: 7;
    readonly MAX_REMINDER_COUNT: 3;
    readonly SESSION_TIMEOUT_HOURS: 24;
    readonly REFRESH_TOKEN_DAYS: 7;
};
export declare const ERROR_MESSAGES: {
    readonly AUTH: {
        readonly INVALID_CREDENTIALS: "Invalid email or password";
        readonly ACCOUNT_LOCKED: "Account temporarily locked due to too many failed attempts";
        readonly TOKEN_EXPIRED: "Session expired, please log in again";
        readonly UNAUTHORIZED: "You are not authorized to perform this action";
        readonly EMAIL_ALREADY_EXISTS: "An account with this email already exists";
        readonly WEAK_PASSWORD: "Password does not meet security requirements";
    };
    readonly VAULT: {
        readonly ENTRY_NOT_FOUND: "Vault entry not found";
        readonly DECRYPTION_FAILED: "Failed to decrypt vault entry";
        readonly FILE_TOO_LARGE: "File size exceeds maximum allowed limit";
        readonly INVALID_CATEGORY: "Invalid category name";
        readonly TOO_MANY_TAGS: "Too many tags for this entry";
    };
    readonly GENERAL: {
        readonly INTERNAL_ERROR: "An internal error occurred";
        readonly VALIDATION_FAILED: "Input validation failed";
        readonly NETWORK_ERROR: "Network connection error";
        readonly RATE_LIMITED: "Too many requests, please try again later";
    };
};
//# sourceMappingURL=constants.d.ts.map