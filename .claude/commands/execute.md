# Full Execution Workflow

General execution workflow coordinator for complete end-to-end feature automation.

## Usage

```
/execute [workflow-name]
```

**Workflows:**
- `full-stack-feature` - Complete feature (backend + frontend + tests + deploy)
- `api-only` - API feature (backend + tests + deploy)
- `frontend-only` - Frontend feature (UI + tests)

## What It Does

Orchestrates complete feature lifecycle:
1. Loads full-execution bundle (800 tokens)
2. Implementation phase (parallel)
3. Testing phase (progressive)
4. Deployment phase (conditional)
5. Comprehensive reporting

## Full-Stack Feature Workflow

**Phase 1: Implementation** (20-30 min, parallel)
- backend-builder: API endpoints
- frontend-builder: UI components
- backend-builder: Database migrations

**Phase 2: Testing** (10-15 min, progressive)
- testing-specialist: Unit → Integration → E2E
- Stop on failure for fast feedback
- Target: 80%+ coverage

**Phase 3: Deployment** (5-10 min, conditional)
- deployment-orchestrator: Deploy to staging
- Safety checks and verification
- Automatic rollback on failure

## Token Efficiency

**Traditional Single-Agent:**
- Parent context: 154.5k tokens
- Budget used: 77%
- Risk: HIGH

**Module 6 Orchestrated:**
- Parent context: 8.5k tokens
- Budget used: 4.25%
- Risk: NONE
- **Savings: 146k tokens (94%)**

## Time Efficiency

- Traditional: 60-90 minutes (sequential)
- Module 6: 30-45 minutes (parallel)
- **50% faster**

## Example

```bash
# Full-stack feature from spec
/execute full-stack-feature from ./specs/user-profile.md

# API-only feature
/execute api-only from ./specs/notifications-api.md

# Frontend-only feature
/execute frontend-only from ./specs/dashboard-ui.md
```

## Output

```
Execution Status: ✅ COMPLETE

Workflow: full-stack-feature
Spec: ./specs/user-profile.md
Duration: 38 minutes

Phase 1: Implementation ✅ (25 min)
  Backend: 5 endpoints implemented
  Frontend: 8 components created
  Database: 3 migrations applied

Phase 2: Testing ✅ (10 min)
  Unit: 45/45 passing
  Integration: 12/12 passing
  E2E: 5/5 passing
  Coverage: 87%

Phase 3: Deployment ✅ (3 min)
  Environment: staging
  URL: https://myapp-staging.railway.app
  Health: All checks passing

Token Usage:
  Parent: 8.5k tokens (4.25% of budget)
  Agents: 78k tokens (isolated)
  Savings: 146k tokens (94% reduction)

Next Steps:
  - Verify feature in staging
  - Deploy to production: /deploy production
```

## Workflow Breakdown

### Full-Stack Feature (30-45 min)

```javascript
{
  phases: ['implement', 'test', 'deploy'],
  agents: [
    'backend-builder',
    'frontend-builder',
    'testing-specialist',
    'deployment-orchestrator'
  ],
  parallel: ['backend', 'frontend'],
  progressive: ['unit', 'integration', 'e2e'],
  tokens: '78k isolated, 8.5k parent'
}
```

### API-Only (20-30 min)

```javascript
{
  phases: ['implement', 'test', 'deploy'],
  agents: [
    'backend-builder',
    'testing-specialist',
    'deployment-orchestrator'
  ],
  tokens: '48k isolated, 5k parent'
}
```

### Frontend-Only (15-25 min)

```javascript
{
  phases: ['implement', 'test'],
  agents: [
    'frontend-builder',
    'testing-specialist'
  ],
  tokens: '33k isolated, 4k parent'
}
```

## Integration

Combines ALL modules:
- Module 1: Minimal MCP configs
- Module 2: Context priming
- Module 3: Sub-agent delegation
- Module 4: Context bundles
- Module 5: Orchestration patterns
- Module 6: Execution agents

## Best Practices

1. **Use full-execution bundle** for complete context
2. **Let workflow handle orchestration** (don't micromanage)
3. **Monitor token usage** throughout execution
4. **Verify in staging** before production
5. **Review results** and iterate

## See Also

- `/implement` - Implementation only
- `/test` - Testing only
- `/deploy` - Deployment only
- `docs/MODULE6_EXECUTION_ORCHESTRATION.md` - Complete guide
