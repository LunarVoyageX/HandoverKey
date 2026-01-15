import { validateEmail, isValidUUID } from "./validation";

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
});
