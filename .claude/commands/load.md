# Load Context Bundle

Load a specific context bundle into the current session.

## Usage

```
/load <bundle-name>
```

## Available Bundles

**Micro (auto-unload 5-10m):**
- `status` - Project status (50 tokens)
- `commands` - Command reference (80 tokens)
- `savings` - Token savings (60 tokens)

**Standard (auto-unload 15-20m):**
- `deployment` - Deploy workflow (300 tokens)
- `delegation` - Agent delegation (350 tokens)

**Composite (manual unload):**
- `fullstack-dev` - Complete dev context (750 tokens)

## Examples

```
/load status
# Quick project status check
# Auto-unloads after 5 minutes

/load deployment
# Load Railway deployment guide
# Auto-unloads after task complete

/load fullstack-dev
# Load complete development context
# Requires manual /unload
```

## Benefits

- **Smaller context**: Load only what you need
- **Auto-cleanup**: Micro/standard bundles auto-unload
- **Token efficient**: 60-93% savings vs traditional commands

## See Also

- `/bundles` - List all available bundles
- `/unload` - Remove loaded bundles
- `docs/MODULE4_CONTEXT_BUNDLES.md` - Complete guide
