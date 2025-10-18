# Deployment Orchestration

Automated deployment orchestration with safety checks, health verification, and automatic rollback.

## Usage

```
/deploy [environment]
```

**Environments:**
- `staging` - Deploy to staging (recommended first)
- `production` - Deploy to production (requires staging verification)

## What It Does

1. Loads deployment-recipes bundle (450 tokens)
2. Delegates to deployment-orchestrator agent (~15k isolated)
3. Executes pre-deployment safety checks
4. Runs deployment workflow (blue-green strategy)
5. Performs post-deployment verification
6. Automatic rollback on failure

## Safety Workflow

**Pre-Deployment Checks** (REQUIRED):
- ✅ All tests passing
- ✅ Database migrations ready
- ✅ Environment variables configured
- ✅ Rollback plan generated

**Deployment** (Blue-Green Strategy):
- Deploy new version (green) alongside old (blue)
- Run smoke tests on green
- Switch traffic from blue to green
- Keep blue running for instant rollback

**Post-Deployment Verification**:
- ✅ Smoke tests (critical endpoints)
- ✅ Error rate < 1%
- ✅ Response times < 500ms p95
- ✅ Database connectivity

**Automatic Rollback**:
- Triggers if any post-check fails
- Instant traffic switch back to blue
- Verification after rollback

## Token Optimization

- Parent loads deployment-recipes: 450 tokens
- Delegates to deployment-orchestrator: 15k isolated
- Parent receives: Summary (~300 tokens)
- **Parent final: ~800 tokens**

## Example

```bash
# Deploy to staging (always do this first)
/deploy staging

# Deploy to production (after staging verification)
/deploy production
```

## Output

```
Deployment Status: ✅ SUCCESS

Environment: staging
Strategy: blue-green
URL: https://myapp-staging.railway.app

Pre-Deployment Checks: ✅ ALL PASSED
  ✅ Tests: 185/185 passing
  ✅ Migrations: 3 pending, ready to apply
  ✅ Env Vars: All configured
  ✅ Rollback Plan: Generated

Deployment: ✅ COMPLETE
  Duration: 2m 15s
  Version: v1.2.3
  Commit: abc1234

Post-Deployment Verification: ✅ ALL PASSED
  ✅ Smoke Tests: 8/8 passing
  ✅ Error Rate: 0.1% (< 1% threshold)
  ✅ Response Times: 245ms p95 (< 500ms threshold)
  ✅ Database: Connected

Rollback Plan: Available (manual: railway rollback 12345)
```

## Deployment Strategies

**Blue-Green (Default)**:
- Zero downtime
- Instant rollback
- Lower risk

**Canary (Optional)**:
- Gradual rollout
- 10% → 50% → 100%
- Early detection

**Feature Flags (Optional)**:
- Deploy code disabled
- Enable gradually
- Instant disable

## Best Practices

1. **Always deploy to staging first**
2. **Run full test suite before production**
3. **Monitor error rates for 30+ minutes**
4. **Keep previous version for quick rollback**
5. **Document every production deployment**

## Integration

Combines with:
- Module 4: deployment-recipes bundle
- deployment-orchestrator agent
- Railway platform (or Docker)

## See Also

- `/test` - Run tests before deployment
- `/build` - Build before deployment
- `docs/MODULE6_EXECUTION_ORCHESTRATION.md`
