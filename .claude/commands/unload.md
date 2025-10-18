# Unload Context Bundle

Remove a loaded context bundle from the current session.

## Usage

```
/unload <bundle-name>
/unload all
```

## Examples

```
/unload deployment
# Remove deployment bundle from context

/unload fullstack-dev
# Remove composite bundle

/unload all
# Clear all loaded bundles
```

## Auto-Unload

Most bundles unload automatically:
- **Micro bundles**: 5-10 minutes
- **Standard bundles**: 15-20 minutes
- **Composite bundles**: Manual unload required

## Benefits

- **Clean context**: Remove unused information
- **Token savings**: Free up tokens for new work
- **Session management**: Keep context focused

## When to Unload

✅ Task complete
✅ Switching contexts
✅ Bundle no longer relevant
✅ Freeing tokens for other work

## See Also

- `/bundles` - List all bundles
- `/load` - Load a bundle
- `docs/MODULE4_CONTEXT_BUNDLES.md` - Complete guide
