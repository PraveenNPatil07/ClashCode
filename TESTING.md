# ClashCode Testing Guide

This document outlines the testing strategy, tools, and conventions for the ClashCode project. We aim to maintain a robust and reliable application by adhering to good testing practices.

## Testing Tools

- **Unit Tests**: [Vitest](https://vitest.dev/)
- **End-to-End (E2E) Tests**: [Playwright](https://playwright.dev/)
- **Coverage**: Vitest v8 coverage provider

## Testing Strategy

### Unit Tests
Unit tests should isolate individual units of code (functions, controllers, components) to ensure they work correctly in isolation. 

**Conventions**:
1. Place unit test files next to the file they are testing. Use the `.unit.test.ts` or `.test.ts` (for frontend components) extension.
2. Mock external dependencies (e.g., database calls, network requests) heavily. For example, use `vi.mock` to mock `supabase` client calls in backend controllers.
3. Keep tests fast and isolated. They should not rely on a running database.

**Running Unit Tests**:
```bash
# Run all unit tests
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch
```

### End-to-End (E2E) Tests
E2E tests ensure that the entire application stack (frontend + backend + database) works correctly from a user's perspective. 

**Conventions**:
1. Place E2E tests in the `tests/e2e/` directory. Use the `.spec.ts` extension.
2. E2E tests should assume the environment is properly seeded using the `npm run seed` command.
3. Focus on critical user flows (e.g., signup, joining a battle, submitting code).

**Running E2E Tests**:
```bash
# Ensure your apps are running first (or Playwright will attempt to start them)
# Run E2E tests headlessly
npm run test:e2e

# Run E2E tests with a visible browser UI
npm run test:e2e:headed
```

## Writing Good Tests

- **Arrange, Act, Assert**: Structure your tests clearly. Set up the state (Arrange), perform the action (Act), and verify the outcome (Assert).
- **Clear Descriptions**: Use descriptive names for your `describe` and `it` blocks so that failures are easy to understand.
- **Do not test implementation details**: Test the inputs and outputs or side effects, rather than how a function achieves its result.

## Coverage

We use Vitest's coverage tool to track how much of our codebase is tested. While 100% coverage is not strictly required, core utilities and controllers should aim for >80% coverage.

```bash
# Generates a coverage report after running unit tests
npm run test:unit
```
