# Testing Orchestration

Comprehensive testing orchestration with progressive execution and specialized testing agent.

## Usage

```
/test [scope]
```

**Scopes:**
- `unit` - Unit tests only (fast)
- `integration` - Integration tests
- `e2e` - End-to-end tests
- `all` - Full test suite (progressive)

## What It Does

1. Loads testing-strategies bundle (350 tokens)
2. Delegates to testing-specialist agent (~18k isolated)
3. Executes tests progressively (stops on failure)
4. Generates coverage report
5. Returns aggregated results

## Testing Pyramid

- **70% Unit Tests** - Fast, isolated, many
- **20% Integration Tests** - API + DB, fewer
- **10% E2E Tests** - Full flows, critical paths

## Progressive Execution

```
Unit Tests (fast)
    ↓ All pass?
Integration Tests (medium)
    ↓ All pass?
E2E Tests (slow)
    ↓
Coverage Report
```

**Early stopping**: Fails fast on first failure for quick feedback

## Token Optimization

- Without /test: Parent loads testing tools (~38k)
- With /test: Delegate to testing-specialist (~18k isolated)
- Parent receives: Summary only (~500 tokens)
- **Savings: 37.5k tokens (99%)**

## Example

```bash
# Run all tests progressively
/test all

# Run only unit tests (fast)
/test unit

# Run integration tests
/test integration

# Run e2e tests only
/test e2e
```

## Output

```
Test Results: ✅ ALL PASSING

Unit Tests: 145/145 passing (2.5s)
Integration Tests: 28/28 passing (8.2s)
E2E Tests: 12/12 passing (45s)

Coverage: 87% (target: 80%)
  Statements: 88%
  Branches: 85%
  Functions: 89%
  Lines: 87%

Total: 185 tests passing
Time: 55.7s
```

## Coverage Target

- **Minimum**: 80% overall coverage
- **Recommended**: 85%+ for production code
- **Critical paths**: 100% coverage

## Integration

Combines with:
- Module 4: testing-strategies bundle
- testing-specialist agent
- Progressive execution pattern

## See Also

- `/implement` - Implementation orchestration
- `/deploy` - Deploy after tests pass
- `docs/MODULE6_EXECUTION_ORCHESTRATION.md`
