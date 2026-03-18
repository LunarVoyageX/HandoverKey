import {
  validateEmail,
  validatePassword,
  sanitizeInput,
  isValidUUID,
} from "./validation";

describe("Shared Validation Utils", () => {
  describe("validateEmail", () => {
    it("should validate basic email formats", () => {
      expect(validateEmail("test@example.com")).toBe(true);
      expect(validateEmail("user@domain.org")).toBe(true);
      expect(validateEmail("invalid")).toBe(false);
      expect(validateEmail("")).toBe(false);
    });
  });

  describe("isValidUUID", () => {
    it("should validate UUID format", () => {
      expect(isValidUUID("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
      expect(isValidUUID("invalid-uuid")).toBe(false);
      expect(isValidUUID("")).toBe(false);
    });
  });

  describe("validatePassword", () => {
    it("should accept a strong password", () => {
      const result = validatePassword("StrongPassword123!@");
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should report all unmet requirements", () => {
      const result = validatePassword("weak");
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          "Password must be at least 12 characters long",
          "Password must contain at least one uppercase letter",
          "Password must contain at least one number",
          "Password must contain at least one special character",
        ]),
      );
    });
  });

  describe("sanitizeInput", () => {
    it("should strip tags and dangerous protocols", () => {
      const input = `  <script>alert("xss")</script>javascript:hello  `;
      expect(sanitizeInput(input)).toBe(`alert("xss")hello`);
    });

    it("should decode entities and remove html", () => {
      expect(sanitizeInput("&lt;b&gt;safe&lt;/b&gt;")).toBe("safe");
    });

    it("should return empty for non-strings", () => {
      expect(sanitizeInput(null)).toBe("");
      expect(sanitizeInput(undefined)).toBe("");
      expect(sanitizeInput(123)).toBe("");
    });

    it("should enforce max length to mitigate abuse", () => {
      const longInput = "a".repeat(12000);
      expect(sanitizeInput(longInput)).toHaveLength(10000);
    });
  });
});
