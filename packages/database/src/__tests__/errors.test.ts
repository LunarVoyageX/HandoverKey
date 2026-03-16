import {
  DatabaseError,
  ConnectionError,
  QueryError,
  TransactionError,
  NotFoundError,
} from "../errors";

describe("DatabaseError", () => {
  it("stores message, code, and name", () => {
    const err = new DatabaseError("test msg", "TEST_CODE");
    expect(err.message).toBe("test msg");
    expect(err.code).toBe("TEST_CODE");
    expect(err.name).toBe("DatabaseError");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DatabaseError);
  });

  it("stores original error when provided", () => {
    const original = new Error("original");
    const err = new DatabaseError("wrapped", "WRAP", original);
    expect(err.originalError).toBe(original);
  });

  it("has no original error when not provided", () => {
    const err = new DatabaseError("no cause", "NONE");
    expect(err.originalError).toBeUndefined();
  });
});

describe("ConnectionError", () => {
  it("extends DatabaseError with CONNECTION_ERROR code", () => {
    const err = new ConnectionError("connection failed");
    expect(err).toBeInstanceOf(DatabaseError);
    expect(err).toBeInstanceOf(ConnectionError);
    expect(err.code).toBe("CONNECTION_ERROR");
    expect(err.name).toBe("ConnectionError");
    expect(err.message).toBe("connection failed");
  });

  it("wraps an original error", () => {
    const cause = new Error("ECONNREFUSED");
    const err = new ConnectionError("db down", cause);
    expect(err.originalError).toBe(cause);
  });
});

describe("QueryError", () => {
  it("extends DatabaseError with QUERY_ERROR code", () => {
    const err = new QueryError("syntax error");
    expect(err).toBeInstanceOf(DatabaseError);
    expect(err).toBeInstanceOf(QueryError);
    expect(err.code).toBe("QUERY_ERROR");
    expect(err.name).toBe("QueryError");
  });

  it("wraps an original error", () => {
    const cause = new Error("duplicate key");
    const err = new QueryError("insert failed", cause);
    expect(err.originalError).toBe(cause);
  });
});

describe("TransactionError", () => {
  it("extends DatabaseError with TRANSACTION_ERROR code", () => {
    const err = new TransactionError("rollback");
    expect(err).toBeInstanceOf(DatabaseError);
    expect(err).toBeInstanceOf(TransactionError);
    expect(err.code).toBe("TRANSACTION_ERROR");
    expect(err.name).toBe("TransactionError");
  });
});

describe("NotFoundError", () => {
  it("extends DatabaseError with NOT_FOUND code", () => {
    const err = new NotFoundError("User");
    expect(err).toBeInstanceOf(DatabaseError);
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.name).toBe("NotFoundError");
    expect(err.message).toBe("User not found");
  });

  it("formats resource name in message", () => {
    const err = new NotFoundError("Vault entry");
    expect(err.message).toBe("Vault entry not found");
  });
});
