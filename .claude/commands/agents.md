# Available Sub-Agents

## ⚠️ MANDATORY: Pre-Research Protocol for code-research-specialist

**BEFORE delegating to code-research-specialist:**

1. **Check existing** (15s): `ls -lt research/; grep -ri "[topic]" research/*.md`
2. **Calculate confidence** (10s): Base 1.0 - penalties (recent: -0.40, context: -0.40, standard: -0.30)
3. **Decision**: SKIP if <0.70, proceed if ≥0.70 with constraints (15k tokens, 5min)

**Multi-Phase Guidance**: Phase 1 research usually covers 80-90% of Phase 2. Always check before delegating!

**See**: Global `code-research-specialist` agent for full protocol, `AGENT_HANDOFF.md` Anti-Pattern section

---

## Research & Planning Agents (Modules 1-5)

### 1. code-research-specialist
**Purpose**: Technical research and documentation analysis
**Tools**: Ref, Context7, WebSearch
**Token Load**: ~3k (research config)
**Savings**: 35.1k tokens (92%)
**Best For**:
- Library/framework research
- Architecture decisions
- Best practice identification
- Migration planning

**Usage**:
```javascript
Task({
  subagent_type: 'code-research-specialist',
  prompt: 'Research Claude SDK async patterns for agent orchestration',
  return: 'Research document with patterns and examples'
});
```

---

### 2. doc-manager
**Purpose**: Documentation lifecycle management
**Tools**: Read, Write, Edit, Glob
**Token Load**: ~1.5k (minimal config)
**Savings**: 36.6k tokens (96%)
**Best For**:
- Creating documentation
- Updating existing docs
- Style guide enforcement
- Template application

**Usage**:
```javascript
Task({
  subagent_type: 'doc-manager',
  prompt: 'Create/update documentation for SwarmForge orchestrator',
  return: 'Documentation file paths'
});
```

---

### 3. doc-context-manager
**Purpose**: Contextual intelligence and analysis
**Tools**: Read, Grep, analysis tools
**Token Load**: ~1.5k (minimal config)
**Savings**: 36.6k tokens (96%)
**Best For**:
- System architecture analysis
- Cross-document relationships
- Context extraction
- Knowledge synthesis

**Usage**:
```javascript
Task({
  subagent_type: 'doc-context-manager',
  prompt: 'Analyze SwarmForge architecture and map component relationships',
  return: 'Architecture analysis document'
});
```

---

### 4. frontend-testing-specialist
**Purpose**: Comprehensive frontend testing
**Tools**: Playwright, testing frameworks
**Token Load**: ~11-13k (fullstack config)
**Savings**: 25-27k tokens (66-71%)
**Best For**:
- UI/UX testing
- Browser automation
- Visual validation
- E2E testing

**Usage**:
```javascript
Task({
  subagent_type: 'frontend-testing-specialist',
  prompt: 'Test SwarmForge CLI interface and wizard flows',
  return: 'Test results and visual validation report'
});
```

---

## Execution Agents (Module 6) ⭐ NEW

### 5. backend-builder
**Purpose**: Backend implementation specialist
**Tools**: Filesystem, package managers, database clients, API testing
**Token Load**: ~15k tokens
**Savings**: 23k tokens (61%)
**Best For**:
- Backend API implementation
- Database schemas and migrations
- Server logic and orchestration
- Authentication and authorization

**Usage**:
```javascript
Task({
  subagent_type: 'backend-builder',
  prompt: `Implement SwarmForge Orchestrator Core.

  Requirements:
  - Agent lifecycle management (create, start, stop, monitor)
  - Task distribution and coordination
  - State management (Redis or in-memory)
  - Event system (agent events, task events)

  Stack: Python 3.13+ + Claude SDK 0.1.3 + asyncio
  Include: Type hints, error handling, unit tests`,

  context: ['load:implementation-patterns'],
  return: 'File paths + component summary'
});
```

---

### 6. frontend-builder
**Purpose**: Frontend/CLI implementation specialist
**Tools**: Filesystem, npm/yarn, framework tools, component testing
**Token Load**: ~15k tokens
**Savings**: 23k tokens (61%)
**Best For**:
- CLI interfaces and wizards
- UI components (if web interface)
- Configuration management
- Interactive user experiences

**Usage**:
```javascript
Task({
  subagent_type: 'frontend-builder',
  prompt: `Implement SwarmForge CLI interface.

  Requirements:
  - Natural language input parsing
  - Interactive agent creation wizard
  - Progress visualization
  - Generated project preview

  Stack: Python + rich/typer for CLI
  Include: Input validation, error messages, help text`,

  context: ['load:implementation-patterns'],
  return: 'CLI module paths + command summary'
});
```

---

### 7. testing-specialist
**Purpose**: Comprehensive testing orchestration
**Tools**: Testing frameworks (Jest, Vitest, Playwright, pytest)
**Token Load**: ~18k tokens
**Savings**: 20k tokens (53%)
**Best For**:
- Unit test generation and execution
- Integration test orchestration
- End-to-end test implementation
- Test data generation and fixtures
- Coverage analysis and reporting

**Usage**:
```javascript
Task({
  subagent_type: 'testing-specialist',
  prompt: `Implement tests for SwarmForge Orchestrator.

  Scope:
  - Unit tests: Orchestrator, meta-agents, template engine
  - Integration tests: Full agent generation flow
  - E2E tests: Natural language → agent → execution

  Target: 80%+ coverage
  Framework: pytest + pytest-asyncio
  Include: Fixtures, mocks for Claude API, test data factories`,

  context: ['load:testing-strategies'],
  return: 'Test results + coverage report'
});
```

---

### 8. deployment-orchestrator
**Purpose**: Automated deployment with safety checks
**Tools**: Railway CLI, Docker, CI/CD tools, monitoring
**Token Load**: ~15k tokens
**Savings**: 23k tokens (61%)
**Best For**:
- Environment setup and configuration
- Database migration execution
- Deployment to staging/production
- Smoke testing and health checks
- Rollback procedures

**Usage**:
```javascript
Task({
  subagent_type: 'deployment-orchestrator',
  prompt: `Package SwarmForge for distribution.

  Deliverables:
  - Python package (setup.py + pyproject.toml)
  - CLI entry points
  - Template bundles
  - Installation verification

  Platform: PyPI + GitHub releases
  Include: README, LICENSE, version management`,

  context: ['load:deployment-recipes'],
  return: 'Package status + distribution URLs'
});
```

---

## Token Savings Summary

| Agent | Token Load | Savings vs Parent | Efficiency |
|-------|------------|-------------------|------------|
| code-research-specialist | 3k | 35.1k | 92% |
| doc-manager | 1.5k | 36.6k | 96% |
| doc-context-manager | 1.5k | 36.6k | 96% |
| frontend-testing-specialist | 11-13k | 25-27k | 66-71% |
| **backend-builder** | **15k** | **23k** | **61%** |
| **frontend-builder** | **15k** | **23k** | **61%** |
| **testing-specialist** | **18k** | **20k** | **53%** |
| **deployment-orchestrator** | **15k** | **23k** | **61%** |

---

## General Usage Pattern

```javascript
// 1. Identify specialized task
// 2. Select appropriate agent
// 3. Delegate via Task tool
// 4. Parent receives summary only (not full output)

Task({
  subagent_type: '<agent-name>',
  description: '<5-10 word description>',
  prompt: `<detailed-task-description>

  Requirements:
  - [List specific requirements]
  - [Include tech stack]
  - [Specify deliverables]

  Include: [What to include in implementation]`,

  context: ['load:<bundle-name>'], // Optional: load bundle first
  return: '<what-to-return>' // Request summary, not full code
});
```

---

## When to Use Which Agent

**Research Phase**:
- code-research-specialist → Technical research, API docs, best practices

**Planning Phase**:
- doc-context-manager → Architecture analysis, system understanding

**Implementation Phase**:
- **backend-builder** → Orchestrator, meta-agents, API endpoints
- **frontend-builder** → CLI, wizards, UI components
- Use both in parallel for full-stack features

**Testing Phase**:
- **testing-specialist** → Unit, integration, E2E tests
- frontend-testing-specialist → UI-specific testing

**Deployment Phase**:
- **deployment-orchestrator** → PyPI packaging, deployment

**Documentation Phase**:
- doc-manager → Create/update documentation

---

## Pro Tips

### 1. Use Execution Commands for Orchestration
```bash
# Instead of manual delegation
/implement orchestrator-core from ./docs/plan.md
# Automatically delegates to backend-builder with optimal config
```

### 2. Load Bundles Before Delegating
```bash
/load implementation-patterns
# Then delegate - agent gets patterns without full docs
```

### 3. Request Summaries, Not Full Outputs
```javascript
// ✅ GOOD
return: 'File paths + feature summary (NOT full code)'

// ❌ BAD
return: 'Complete implementation code'
```

### 4. Use Parallel Execution
```javascript
// Parallel implementation
const [backend, frontend] = await Promise.all([
  Task({ subagent_type: 'backend-builder', ... }),
  Task({ subagent_type: 'frontend-builder', ... })
]);
```

---

## See Also

- `/delegate` - Delegation patterns and decision tree
- `/orchestrate` - Multi-agent orchestration patterns
- `/implement` - Implementation command (uses backend-builder + frontend-builder)
- `/test` - Testing command (uses testing-specialist)
- `/deploy` - Deployment command (uses deployment-orchestrator)

---

**Total Agents**: 8 (4 research/planning + 4 execution)
**Average Savings**: 60-90% token reduction per delegation
**Module 6**: Adds specialized execution agents for implementation, testing, deployment
