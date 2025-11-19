import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validateRequest, validateMultiple } from "../middleware";

// Mock request, response, and next function
const createMockRequest = (
  data: unknown,
  target: "body" | "query" | "params" = "body",
): Partial<Request> => {
  const req: any = {
    [target]: data,
    id: "test-request-id",
  };
  return req;
};

const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
};

const createMockNext = (): NextFunction => jest.fn();

describe("validateRequest middleware", () => {
  describe("body validation", () => {
    const TestSchema = z.object({
      email: z.string().email(),
      age: z.number().min(18),
    });

    it("should pass validation with valid data", async () => {
      const req = createMockRequest({ email: "test@example.com", age: 25 });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validateRequest(TestSchema, "body");
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.body).toEqual({ email: "test@example.com", age: 25 });
    });

    it("should fail validation with invalid email", async () => {
      const req = createMockRequest({ email: "invalid-email", age: 25 });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validateRequest(TestSchema, "body");
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: expect.arrayContaining([
            expect.objectContaining({
              field: "email",
              message: expect.any(String),
            }),
          ]),
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("should fail validation with age below minimum", async () => {
      const req = createMockRequest({ email: "test@example.com", age: 15 });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validateRequest(TestSchema, "body");
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: expect.arrayContaining([
            expect.objectContaining({
              field: "age",
              message: expect.stringContaining("18"),
            }),
          ]),
        }),
      );
    });

    it("should fail validation with missing required fields", async () => {
      const req = createMockRequest({ email: "test@example.com" });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validateRequest(TestSchema, "body");
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
        }),
      );
    });
  });

  describe("query validation", () => {
    const QuerySchema = z.object({
      page: z.coerce.number().int().min(1),
      limit: z.coerce.number().int().min(1).max(100),
    });

    it("should validate query parameters", async () => {
      const req = createMockRequest({ page: "2", limit: "50" }, "query");
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validateRequest(QuerySchema, "query");
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.query).toEqual({ page: 2, limit: 50 });
    });
  });

  describe("params validation", () => {
    const ParamsSchema = z.object({
      id: z.string().uuid(),
    });

    it("should validate URL parameters", async () => {
      const validUuid = "123e4567-e89b-12d3-a456-426614174000";
      const req = createMockRequest({ id: validUuid }, "params");
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validateRequest(ParamsSchema, "params");
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.params).toEqual({ id: validUuid });
    });

    it("should fail validation with invalid UUID", async () => {
      const req = createMockRequest({ id: "not-a-uuid" }, "params");
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validateRequest(ParamsSchema, "params");
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("input sanitization", () => {
    const SanitizeSchema = z.object({
      name: z.string(),
      description: z.string(),
    });

    it("should sanitize XSS attempts in strings", async () => {
      const req = createMockRequest({
        name: '<script>alert("xss")</script>John',
        description: "<img src=x onerror=alert(1)>Description",
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validateRequest(SanitizeSchema, "body");
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.name).not.toContain("<script>");
      expect(req.body.description).not.toContain("<img");
    });

    it("should sanitize nested objects", async () => {
      const NestedSchema = z.object({
        user: z.object({
          name: z.string(),
        }),
      });

      const req = createMockRequest({
        user: {
          name: '<script>alert("xss")</script>',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = validateRequest(NestedSchema, "body");
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.user.name).not.toContain("<script>");
    });
  });
});

describe("validateMultiple middleware", () => {
  const ParamsSchema = z.object({
    id: z.string().uuid(),
  });

  const BodySchema = z.object({
    name: z.string().min(1),
  });

  it("should validate multiple targets successfully", async () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    const req = {
      params: { id: validUuid },
      body: { name: "Test" },
      id: "test-request-id",
    } as unknown as Request;
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateMultiple({
      params: ParamsSchema,
      body: BodySchema,
    });
    await middleware(req, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should collect errors from multiple targets", async () => {
    const req = {
      params: { id: "invalid-uuid" },
      body: { name: "" },
      id: "test-request-id",
    } as unknown as Request;
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateMultiple({
      params: ParamsSchema,
      body: BodySchema,
    });
    await middleware(req, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({ field: "id" }),
          expect.objectContaining({ field: "name" }),
        ]),
      }),
    );
  });
});
