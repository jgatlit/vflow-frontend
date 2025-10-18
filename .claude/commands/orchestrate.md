# Multi-Agent Orchestration Patterns

Quick reference for token-optimized orchestration patterns.

## ⚠️ MANDATORY: Pre-Research Protocol

**BEFORE using code-research-specialist in orchestration:**

1. **Pre-check** (30s): Existing research? Phase context sufficient? Standard pattern?
2. **Calculate confidence**: Base 1.0 - penalties (recent: -0.40, context: -0.40, standard: -0.30)
3. **Decision**: SKIP if <0.70, proceed with constraints if ≥0.70 (15k tokens, 5min)

**Key**: Sequential chains and hierarchical patterns often have research overlap between phases. Always check first!

**See**: Global `code-research-specialist` agent, `AGENT_HANDOFF.md` Anti-Pattern section

---

## Core Patterns

### Sequential Chain
**Use**: Tasks with dependencies
**Structure**: Agent 1 → Agent 2 → Agent 3
**Savings**: 20-85k tokens (13-57%)

```
Research → Implement → Test → Deploy
Each agent: isolated context
Parent: summaries only
```

### Parallel Fan-Out
**Use**: Independent tasks
**Structure**: All agents run simultaneously
**Savings**: 50-115k tokens (25-58%)

```
Backend + Frontend + Database + Docs
All agents: parallel execution
Parent: collect summaries
```

### Hierarchical
**Use**: Complex projects with sub-workflows
**Structure**: Master → Sub-orchestrators → Agents
**Savings**: 120-215k tokens (30-54%)

```
Master
├─ Backend Team (sub-orchestrator)
├─ Frontend Team (sub-orchestrator)
└─ DevOps Team (sub-orchestrator)
```

### Iterative Refinement
**Use**: Tasks needing multiple rounds
**Structure**: Loop with fresh agents
**Savings**: 50-85k tokens (33-57%)

```
Attempt 1 → Review → Attempt 2 → Review → Done
Each attempt: fresh agent context
Parent: feedback tracking only
```

## Module Integration

**Module 1**: Switch MCP configs between phases
**Module 2**: Match agent to primed context
**Module 3**: Nested delegation in agents
**Module 4**: Pass bundles instead of full context

## Best Practices

1. **Parent = Minimal**: Orchestrator keeps 5-10k tokens
2. **Agents = Isolated**: Fresh context per task
3. **Handoffs = Light**: File paths, not contents
4. **Checkpoints**: Save state between steps

## Common Workflows

**Full-Stack Feature**:
1. Research → code-research-specialist
2. Parallel: Backend + Frontend + DB
3. Test → frontend-testing-specialist
4. Deploy → general-purpose

**Codebase Migration**:
1. Analyze → doc-context-manager
2. Research → code-research-specialist
3. Parallel migration (N agents)
4. Test → frontend-testing-specialist

**Security Audit**:
1. Audit → code-research-specialist
2. Research fixes → code-research-specialist
3. Parallel remediation
4. Validate → frontend-testing-specialist
5. Document → doc-manager

## When to Orchestrate

✅ Multi-step workflows (3+ phases)
✅ Different specialized tools needed
✅ Complex features (multiple domains)
✅ Parallelizable components
✅ Iterative refinement needed

❌ Single-file edits
❌ Quick bug fixes
❌ Simple queries
❌ Single-domain tasks

## See Also

- `/workflow` - Detailed workflow templates
- `/delegate` - Sub-agent delegation patterns
- `docs/MODULE5_MULTI_AGENT_ORCHESTRATION.md` - Complete guide
