import {
  validateEmail,
  isValidUUID,
} from "@handoverkey/shared/src/utils/validation";

describe("Basic Validation", () => {
  describe("validateEmail", () => {
    it("should validate correct emails", () => {
      expect(validateEmail("test@example.com")).toBe(true);
      expect(validateEmail("user.name@domain.co.uk")).toBe(true);
    });

    it("should reject invalid emails", () => {
      expect(validateEmail("invalid-email")).toBe(false);
      expect(validateEmail("")).toBe(false);
      expect(validateEmail("test@")).toBe(false);
      expect(validateEmail("@example.com")).toBe(false);
    });
  });

  describe("isValidUUID", () => {
    it("should validate correct UUIDs", () => {
      expect(isValidUUID("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
      expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    });

    it("should reject invalid UUIDs", () => {
      expect(isValidUUID("invalid-uuid")).toBe(false);
      expect(isValidUUID("")).toBe(false);
      expect(isValidUUID("123e4567-e89b-12d3-a456-42661417400")).toBe(false); // too short
    });
  });
});
