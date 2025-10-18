# Implementation Orchestration

Trigger hierarchical implementation orchestration with specialized execution agents.

## Usage

```
/implement [feature-name] from [spec-file]
```

## What It Does

Orchestrates parallel implementation using specialized agents:
1. Loads implementation-patterns bundle (400 tokens)
2. Analyzes feature specification
3. Launches specialized agents in parallel:
   - backend-builder: API endpoints, server logic
   - frontend-builder: UI components, state management
   - backend-builder: Database migrations
4. Coordinates handoffs and aggregates results

## Specialized Agents

**backend-builder** (~15k tokens)
- Backend API implementation
- Database schema and migrations
- Authentication and authorization
- API documentation

**frontend-builder** (~15k tokens)
- React/Vue/Svelte components
- State management (Redux, Zustand)
- Form handling and validation
- Responsive UI implementation

## Token Optimization

- Without /implement: ~90k parent context
- With /implement: ~5k parent context
- **Savings: 85k tokens (94%)**

## Example

```
/implement user-profile-management from ./specs/profile-feature.md
```

**Workflow:**
1. Parent loads implementation-patterns (400 tokens)
2. Parallel execution:
   - Backend API: 15k tokens (isolated)
   - Frontend UI: 15k tokens (isolated)
   - Database: 15k tokens (isolated)
3. Parent receives summaries (~500 tokens)
4. Parent final context: ~5k tokens

**Time:** 20-30 minutes (with parallelization)

## Integration

Combines with:
- Module 3: Sub-agent delegation patterns
- Module 4: Context bundles (implementation-patterns)
- Module 5: Parallel orchestration pattern

## Next Steps

After /implement:
- Use `/test all` for comprehensive testing
- Use `/deploy staging` for deployment

## See Also

- `/build` - Execute build workflow
- `/test` - Testing orchestration
- `/execute` - Full workflow automation
- `docs/MODULE6_EXECUTION_ORCHESTRATION.md` - Complete guide
