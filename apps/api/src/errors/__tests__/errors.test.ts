import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  InternalServerError,
} from "../index";

describe("Custom Error Classes", () => {
  describe("AppError", () => {
    it("should create an AppError with correct properties", () => {
      const error = new AppError("Test error", 500, "TEST_ERROR", true);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe("TEST_ERROR");
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe("AppError");
    });

    it("should default isOperational to true", () => {
      const error = new AppError("Test error", 500, "TEST_ERROR");
      expect(error.isOperational).toBe(true);
    });
  });

  describe("ValidationError", () => {
    it("should create a ValidationError with correct properties", () => {
      const error = new ValidationError("Invalid input");

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe("Invalid input");
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe("ValidationError");
    });

    it("should include validation details", () => {
      const details = { field: "email", message: "Invalid email format" };
      const error = new ValidationError("Validation failed", details);

      expect(error.details).toEqual(details);
    });
  });

  describe("AuthenticationError", () => {
    it("should create an AuthenticationError with default message", () => {
      const error = new AuthenticationError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Authentication failed");
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe("AUTHENTICATION_ERROR");
      expect(error.name).toBe("AuthenticationError");
    });

    it("should create an AuthenticationError with custom message", () => {
      const error = new AuthenticationError("Invalid credentials");

      expect(error.message).toBe("Invalid credentials");
    });
  });

  describe("AuthorizationError", () => {
    it("should create an AuthorizationError with default message", () => {
      const error = new AuthorizationError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Insufficient permissions");
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe("AUTHORIZATION_ERROR");
      expect(error.name).toBe("AuthorizationError");
    });

    it("should create an AuthorizationError with custom message", () => {
      const error = new AuthorizationError("Access denied");

      expect(error.message).toBe("Access denied");
    });
  });

  describe("NotFoundError", () => {
    it("should create a NotFoundError with resource name", () => {
      const error = new NotFoundError("User");

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("User not found");
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe("NOT_FOUND");
      expect(error.name).toBe("NotFoundError");
    });
  });

  describe("ConflictError", () => {
    it("should create a ConflictError", () => {
      const error = new ConflictError("Resource already exists");

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Resource already exists");
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe("CONFLICT");
      expect(error.name).toBe("ConflictError");
    });
  });

  describe("RateLimitError", () => {
    it("should create a RateLimitError with default message", () => {
      const error = new RateLimitError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Too many requests");
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(error.name).toBe("RateLimitError");
    });

    it("should include retryAfter value", () => {
      const error = new RateLimitError("Rate limit exceeded", 60);

      expect(error.retryAfter).toBe(60);
    });
  });

  describe("DatabaseError", () => {
    it("should create a DatabaseError", () => {
      const error = new DatabaseError("Connection failed");

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Connection failed");
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe("DATABASE_ERROR");
      expect(error.isOperational).toBe(false);
      expect(error.name).toBe("DatabaseError");
    });

    it("should include original error", () => {
      const originalError = new Error("Connection timeout");
      const error = new DatabaseError(
        "Database operation failed",
        originalError,
      );

      expect(error.originalError).toBe(originalError);
    });
  });

  describe("ExternalServiceError", () => {
    it("should create an ExternalServiceError", () => {
      const error = new ExternalServiceError(
        "Service unavailable",
        "PaymentAPI",
      );

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Service unavailable");
      expect(error.statusCode).toBe(502);
      expect(error.code).toBe("EXTERNAL_SERVICE_ERROR");
      expect(error.service).toBe("PaymentAPI");
      expect(error.isOperational).toBe(false);
      expect(error.name).toBe("ExternalServiceError");
    });

    it("should include original error", () => {
      const originalError = new Error("Timeout");
      const error = new ExternalServiceError(
        "Service failed",
        "API",
        originalError,
      );

      expect(error.originalError).toBe(originalError);
    });
  });

  describe("InternalServerError", () => {
    it("should create an InternalServerError with default message", () => {
      const error = new InternalServerError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Internal server error");
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe("INTERNAL_ERROR");
      expect(error.isOperational).toBe(false);
      expect(error.name).toBe("InternalServerError");
    });

    it("should create an InternalServerError with custom message", () => {
      const error = new InternalServerError("Unexpected error occurred");

      expect(error.message).toBe("Unexpected error occurred");
    });
  });
});
