# Build Workflow

Execute build workflow with pre/post hooks and verification.

## Usage

```
/build [target]
```

**Targets:**
- `backend` - Build backend only
- `frontend` - Build frontend only
- `fullstack` - Build complete application

## What It Does

1. Runs pre-build hooks (linting, type checking)
2. Executes build process
3. Runs post-build verification
4. Reports build status and artifacts

## Workflow

**Pre-Build:**
- Linting (ESLint, Prettier)
- Type checking (TypeScript)
- Dependency validation

**Build:**
- Backend: Compile TypeScript, bundle server
- Frontend: Webpack/Vite build, asset optimization
- Fullstack: Both backend and frontend

**Post-Build:**
- Build verification tests
- Bundle size analysis
- Artifact validation

## Token Cost

~1.5k tokens (command + configuration)

## Example

```bash
# Build backend
/build backend

# Build frontend with optimization
/build frontend

# Build everything
/build fullstack
```

## Output

```
Build Status: ✅ SUCCESS
Target: backend
Time: 45s
Artifacts:
  - dist/server.js (2.3MB)
  - dist/server.js.map (450KB)
Warnings: 0
Errors: 0
```

## Integration

Works with:
- CI/CD pipelines
- Pre-deployment verification
- Local development builds

## See Also

- `/test` - Run tests after build
- `/deploy` - Deploy built artifacts
- `docs/MODULE6_EXECUTION_ORCHESTRATION.md`
