# Context Bundles

## Available Bundles

### Micro Bundles (< 100 tokens)
Quick-reference, auto-unload after 5-10m

**status** (50 tokens)
- Project module status and savings
- Auto-unload: 5m

**commands** (80 tokens)
- Quick command reference
- Launch scripts, slash commands, delegation syntax
- Auto-unload: 10m

**savings** (60 tokens)
- Token savings summary by configuration and delegation
- Auto-unload: 5m

### Standard Bundles (100-500 tokens)
Workflow-focused, auto-unload after 15-20m

**deployment** (300 tokens)
- Railway deployment complete workflow
- Commands, troubleshooting, best practices
- Auto-unload: 15m

**delegation** (350 tokens)
- Sub-agent delegation patterns and usage
- All 4 agents with savings metrics
- Auto-unload: 20m

### Composite Bundles (500+ tokens)
Multiple bundles combined, manual unload

**fullstack-dev** (750 tokens)
- deployment + delegation + context
- For complete development workflows
- Manual unload required

## Usage

**Load Bundle:**
```
/load status          # Load micro bundle
/load deployment      # Load standard bundle
/load fullstack-dev   # Load composite
```

**Unload Bundle:**
```
/unload deployment    # Unload specific
/unload all           # Clear all bundles
```

**List Bundles:**
```
/bundles              # Show this list
```

## Bundle Benefits

**Token Savings:**
- Micro vs traditional slash cmd: 650-700 tokens (93%)
- Standard vs full docs: 400-600 tokens (60-80%)
- Composite vs individual loading: 1000-1500 tokens (60-70%)

**Auto-Unload:**
- Bundles expire automatically
- No persistent context bloat
- Clean session management

**Focused Context:**
- Load only what you need
- Smaller, more relevant information
- Better for specific tasks

## Current Session

Use `/load status` to see current bundles loaded.

See `docs/MODULE4_CONTEXT_BUNDLES.md` for complete guide.
