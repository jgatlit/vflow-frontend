# Agent Delegation Guide

## ⚠️ MANDATORY: Pre-Research Protocol for code-research-specialist

**BEFORE delegating research tasks, you MUST:**

1. **Check existing research** (15s): `ls -lt research/ | head -10; grep -ri "[topic]" research/*.md`
2. **Calculate confidence** (10s): Base 1.0 - penalties (recent: -0.40, context: -0.40, standard: -0.30)
3. **Decision**: SKIP if <0.70, proceed with constraints if ≥0.70 (15k tokens, 5min limit)

**See**: Global `code-research-specialist` agent for full protocol, `AGENT_HANDOFF.md` Anti-Pattern section

---

## When to Delegate

Delegate specialized tasks to reduce parent agent token usage:

### Research Tasks → code-research-specialist
- Researching libraries, frameworks, APIs
- Evaluating architecture decisions
- Finding best practices and patterns
- **Savings**: ~33.6k tokens (88%)

### Documentation Tasks → doc-manager
- Creating/updating docs
- Applying style guides
- Organizing documentation
- **Savings**: ~35.1k tokens (92%)

### Context Analysis → doc-context-manager
- Understanding system architecture
- Mapping component relationships
- Analyzing complex codebases
- **Savings**: ~35.1k tokens (92%)

### Frontend Testing → frontend-testing-specialist
- UI/UX testing
- Browser automation
- Visual validation
- **Savings**: ~23.6k tokens (62%)

## Delegation Pattern

```
1. Parent (minimal config) identifies specialized task
2. Invokes Task tool with appropriate sub-agent
3. Sub-agent loads specialized tools, completes task
4. Returns results to parent
5. Parent synthesizes for user
```

## Example Usage

**Research:**
```
Task(
  subagent_type="code-research-specialist",
  prompt="Research [topic] and provide actionable recommendations"
)
```

**Documentation:**
```
Task(
  subagent_type="doc-manager",
  prompt="Create/update documentation for [feature]"
)
```

## Token Impact

| Without Delegation | With Delegation | Savings |
|-------------------|-----------------|---------|
| 38.1k (all tools) | 3-4.5k (focused) | ~35k |

See `docs/MODULE3_SUB_AGENT_DELEGATION.md` for complete guide.
