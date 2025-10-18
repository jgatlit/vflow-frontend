# Orchestration Workflow Templates

Pre-defined workflow templates for common orchestration scenarios.

## ⚠️ MANDATORY: Pre-Research Protocol

**BEFORE delegating to code-research-specialist in ANY workflow:**

1. **Check existing research** (15s): Scan `research/` for recent files (<7 days)
2. **Calculate confidence** (10s): Base 1.0 - penalties (recent: -0.40, context: -0.40, standard: -0.30)
3. **Decision**: SKIP if <0.70 (use existing), proceed with constraints if ≥0.70

**Multi-Phase Projects**: Phase 1 research typically covers 80-90% of Phase 2 needs. Check before delegating!

**See**: Global `code-research-specialist` agent, `AGENT_HANDOFF.md` Anti-Pattern section

---

## Full-Stack Feature Development

**Objective**: Implement complete feature with frontend + backend + tests

**Workflow**:
```
1. Research → code-research-specialist
   Input: Feature requirements
   Output: patterns.json bundle (350 tokens)

2. Parallel Implementation:
   a. Backend API → general-purpose
      Input: load:patterns
      Output: API endpoint paths

   b. Frontend UI → general-purpose
      Input: load:patterns
      Output: Component file paths

   c. Database → general-purpose
      Input: Feature requirements
      Output: Migration file

3. Testing → frontend-testing-specialist
   Input: All file paths from step 2
   Output: Test results summary

4. Deployment → general-purpose (deploy config)
   Input: Test confirmation
   Output: Deployment URL
```

**Token Savings**: ~85-100k tokens (49-57% reduction)
**Time**: 20-30 minutes (with parallelization)

## Codebase Migration

**Objective**: Migrate code from one framework/pattern to another

**Workflow**:
```
1. Analysis → doc-context-manager
   Input: Source codebase
   Output: migration-map.json (list of files to migrate)

2. Pattern Research → code-research-specialist
   Input: "Migrate from X to Y best practices"
   Output: migration-patterns.json bundle (300 tokens)

3. Parallel Migration → N general-purpose agents
   Input: One file per agent + load:migration-patterns
   Output: New file paths

4. Testing → frontend-testing-specialist
   Input: All migrated file paths
   Output: Test results

5. Documentation → doc-manager
   Input: Migration summary
   Output: docs/migration-guide.md
```

**Token Savings**: ~130-150k tokens (65-75% reduction)
**Time**: 30-45 minutes

## Security Audit & Remediation

**Objective**: Find and fix security vulnerabilities

**Workflow**:
```
1. Security Audit → code-research-specialist
   Input: Codebase
   Output: security-audit.md (vulnerability list)

2. Remediation Research → code-research-specialist
   Input: Vulnerability types found
   Output: security-fixes.json bundle (400 tokens)

3. Parallel Fixes → N general-purpose agents
   Input: One vulnerability per agent + load:security-fixes
   Output: Fix descriptions

4. Validation → frontend-testing-specialist
   Input: All fixed files
   Output: Security test results

5. Documentation → doc-manager
   Input: Audit + fixes summary
   Output: docs/security-audit-report.md
```

**Token Savings**: ~60-90k tokens (33-50% reduction)
**Time**: 45-60 minutes

## Performance Optimization

**Objective**: Profile, analyze, and optimize performance

**Workflow**:
```
1. Profiling → general-purpose
   Input: Application + performance goals
   Output: profile-results.json (bottleneck list)

2. Pattern Research → code-research-specialist
   Input: "Performance optimization for [bottlenecks]"
   Output: optimization-patterns.json bundle (350 tokens)

3. Iterative Optimization Loop (3 rounds):
   Round 1:
   a. Implement fixes → general-purpose
      Input: load:optimization-patterns + profile results
      Output: Optimized code

   b. Benchmark → general-purpose
      Input: Optimized code
      Output: New metrics

   c. Analyze → Parent orchestrator
      Input: Metrics comparison
      Output: Continue or done?

4. Final Documentation → doc-manager
   Input: All optimization summaries
   Output: docs/performance-improvements.md
```

**Token Savings**: ~40-60k tokens (33-43% reduction)
**Time**: 35-50 minutes

## Multi-Service Deployment

**Objective**: Deploy multiple services simultaneously

**Workflow**:
```
1. Pre-deployment Checks → general-purpose (deploy config)
   Input: Service list
   Output: Readiness report

2. Parallel Deployment → N general-purpose agents
   Service A: Deploy backend API
   Service B: Deploy frontend
   Service C: Deploy worker service
   Service D: Deploy database migrations

3. Integration Testing → frontend-testing-specialist
   Input: All deployment URLs
   Output: Integration test results

4. Monitoring Setup → general-purpose
   Input: Deployment URLs
   Output: Monitoring dashboard URL

5. Documentation → doc-manager
   Input: Deployment summary
   Output: docs/deployment-runbook.md
```

**Token Savings**: ~70-95k tokens (40-55% reduction)
**Time**: 25-35 minutes

## Documentation Generation

**Objective**: Generate comprehensive documentation for project

**Workflow**:
```
1. Context Analysis → doc-context-manager
   Input: Entire codebase
   Output: documentation-map.json (what needs docs)

2. Parallel Documentation → N doc-manager agents
   Agent 1: API documentation
   Agent 2: Architecture guide
   Agent 3: Setup instructions
   Agent 4: Contributing guide
   Agent 5: Troubleshooting guide

3. Cross-Reference → doc-context-manager
   Input: All generated docs
   Output: Updated docs with cross-references

4. Review → code-research-specialist
   Input: All documentation
   Output: Quality review + suggestions
```

**Token Savings**: ~80-110k tokens (50-65% reduction)
**Time**: 30-40 minutes

## Feature Flag Rollout

**Objective**: Implement feature flags and gradual rollout

**Workflow**:
```
1. Research → code-research-specialist
   Input: "Feature flag best practices for [stack]"
   Output: feature-flag-patterns.json bundle (300 tokens)

2. Parallel Implementation:
   a. Backend flags → general-purpose
      Input: load:feature-flag-patterns
      Output: Flag service implementation

   b. Frontend flags → general-purpose
      Input: load:feature-flag-patterns
      Output: Flag component implementation

   c. Admin UI → general-purpose
      Input: load:feature-flag-patterns
      Output: Flag management UI

3. Testing → frontend-testing-specialist
   Input: All implementations
   Output: Flag testing results

4. Deployment → general-purpose (deploy config)
   Input: Test confirmation
   Output: Deployment with flags disabled

5. Documentation → doc-manager
   Input: Implementation summary
   Output: docs/feature-flags-guide.md
```

**Token Savings**: ~65-85k tokens (40-52% reduction)
**Time**: 35-45 minutes

## API Integration

**Objective**: Integrate third-party API into application

**Workflow**:
```
1. API Research → code-research-specialist
   Input: "Best practices for [API] integration"
   Output: api-integration.json bundle (350 tokens)

2. Parallel Implementation:
   a. API client → general-purpose
      Input: load:api-integration + API docs
      Output: Client implementation

   b. Type definitions → general-purpose
      Input: API schema
      Output: TypeScript types

   c. Error handling → general-purpose
      Input: load:api-integration
      Output: Error handler implementation

3. Testing → frontend-testing-specialist
   Input: API client + mocks
   Output: Integration test results

4. Documentation → doc-manager
   Input: API client usage
   Output: docs/api-integration-guide.md
```

**Token Savings**: ~55-75k tokens (35-48% reduction)
**Time**: 25-35 minutes

## Workflow Selection Guide

**Use Sequential** when:
- Steps have strict dependencies
- Each step builds on previous results
- Need linear progression

**Use Parallel** when:
- Tasks are independent
- Speed is important
- Multiple domains involved

**Use Hierarchical** when:
- Project has 10+ tasks
- Natural team divisions exist
- Sub-workflows needed

**Use Iterative** when:
- Quality refinement needed
- Multiple review rounds expected
- Optimization required

## Custom Workflow Template

```javascript
// Define your workflow
const myWorkflow = {
  name: 'Custom Feature Workflow',
  steps: [
    {
      phase: 'research',
      agent: 'code-research-specialist',
      input: 'requirements',
      output: 'patterns.json'
    },
    {
      phase: 'implementation',
      agent: 'general-purpose',
      parallel: ['backend', 'frontend', 'tests'],
      input: 'load:patterns',
      output: 'file-paths'
    },
    {
      phase: 'deployment',
      agent: 'general-purpose',
      config: 'deploy',
      input: 'file-paths',
      output: 'deployment-url'
    }
  ]
};

// Estimated savings: Calculate based on pattern type
```

## See Also

- `/orchestrate` - Orchestration patterns overview
- `/delegate` - Sub-agent delegation
- `docs/MODULE5_MULTI_AGENT_ORCHESTRATION.md` - Complete guide
