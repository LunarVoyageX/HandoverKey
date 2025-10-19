# Testing Guide

Simple testing approach for HandoverKey MVP.

## Philosophy

- **Test what matters**: Core functionality only
- **Keep it simple**: Basic unit tests for critical paths
- **No over-engineering**: Avoid complex mocking and edge cases
- **Fast feedback**: Tests should run quickly

## Running Tests

```bash
# Run all tests
npm run test

# Run tests for specific package
cd packages/api && npm test
cd apps/web && npm test
cd packages/shared && npm test

# Lint code
npm run lint
```

## Test Structure

### API Tests (`packages/api/src/**/*.test.ts`)

- Basic validation functions
- Core business logic
- Simple integration tests

### Web Tests (`apps/web/src/**/*.test.{ts,tsx}`)

- Encryption/decryption functionality
- Critical React components
- User interaction flows

### Shared Tests (`packages/shared/src/**/*.test.ts`)

- Utility functions
- Type validation
- Common helpers

## What We Test

### ✅ Essential Tests

- **Encryption/Decryption**: Core security functionality
- **Validation**: Email, UUID, input validation
- **Authentication**: Login/logout flows
- **Critical Components**: Main user interfaces

### ❌ What We Don't Test (Yet)

- Edge cases and error scenarios
- Performance and load testing
- Complex integration scenarios
- Security penetration testing
- Browser compatibility testing

## Writing Tests

### Simple Test Example

```typescript
// Good: Simple, focused test
describe("validateEmail", () => {
  it("should validate correct emails", () => {
    expect(validateEmail("test@example.com")).toBe(true);
    expect(validateEmail("invalid")).toBe(false);
  });
});
```

### Avoid Over-Engineering

```typescript
// Bad: Over-engineered test
describe("validateEmail - ReDoS Prevention", () => {
  it("should handle malicious ReDoS patterns without hanging", () => {
    const maliciousInputs = ["a@" + "a".repeat(1000) + ".com"];
    // ... complex performance testing
  });
});

// Good: Simple validation test
describe("validateEmail", () => {
  it("should validate basic email formats", () => {
    expect(validateEmail("user@domain.com")).toBe(true);
    expect(validateEmail("invalid")).toBe(false);
  });
});
```

## Test Guidelines

### Do

- Test the happy path first
- Test obvious failure cases
- Keep tests simple and readable
- Focus on business logic

### Don't

- Test implementation details
- Write complex mocks unless necessary
- Test third-party libraries
- Over-test edge cases in MVP

## CI/CD

Simple GitHub Actions workflow:

1. Install dependencies
2. Run linting
3. Build all packages
4. Run tests

No complex test environments or databases in CI for MVP.

## Adding Tests

When adding new features:

1. **Start simple**: Test the main functionality
2. **Add failure cases**: Test obvious error conditions
3. **Keep it focused**: One test per behavior
4. **Avoid complexity**: No complex setup or teardown

## Future Testing

After MVP, we can add:

- Integration tests with real database
- E2E tests with Playwright
- Performance testing
- Security testing
- Cross-browser testing

For now, keep it simple and ship the MVP! 🚀
