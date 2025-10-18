# Research Context

## ⚠️ MANDATORY: Pre-Research Protocol

**BEFORE delegating to code-research-specialist, you MUST:**

1. **Check for existing research** (15 seconds)
   ```bash
   ls -lt research/ | head -10
   grep -ri "[topic-keywords]" research/*.md
   ```

2. **Calculate research necessity confidence** (10 seconds)
   - Base confidence: 1.0
   - Penalties: Recent research (-0.40), Phase context (-0.40), Standard pattern (-0.30)
   - **SKIP if confidence <0.70**, proceed if ≥0.70

3. **If proceeding, enforce constraints**:
   - Token budget: 15k MAX
   - Time limit: 5 minutes MAX
   - Output format: Executive summary (500-1000 tokens) + detailed file

**See**: `code-research-specialist` agent for full protocol, `AGENT_HANDOFF.md` Anti-Pattern section

---

## Documentation Tools Available
When you need to research libraries, APIs, or best practices, use this context.

**Available Tools:**
- Context7: resolve-library-id, get-library-docs
- Ref: ref_search_documentation, ref_read_url

**Use Cases:**
- Researching library documentation
- Finding API references
- Looking up best practices
- Studying implementation patterns

**Launch Command:**
```bash
./scripts/launch-research.sh
```

**Token Impact:** ~3k tokens for Context7 + Ref MCP tools
