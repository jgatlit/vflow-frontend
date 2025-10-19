# Reverse Proxy Implementation - Backend Developer Handoff

**Date:** 2025-10-18
**From:** Frontend Team
**To:** Backend Developer
**Objective:** Serve frontend through backend on single port (3000)

---

## Executive Summary

**Current Architecture:**
```
Frontend (Vite dev server) → :5173
Backend (Express API)      → :3000
```

**Target Architecture:**
```
Single Port :3000
├── / (root + static files)  → Frontend (React/Vite build)
└── /api/*                   → Backend API routes
```

**Benefits:**
- ✅ Single port exposure (simpler deployment)
- ✅ No CORS issues (same origin)
- ✅ Better production configuration
- ✅ Easier reverse proxy setup (nginx, Railway, etc.)

---

## Frontend Requirements

### 1. Static File Serving

**Backend must serve these frontend build artifacts:**

```
dist/
├── index.html           # Entry point (serve at /, /flows, /flows/:id, etc.)
├── assets/
│   ├── index-[hash].js  # Main bundle
│   ├── index-[hash].css # Styles
│   └── *.svg, *.png     # Static assets
└── vite.svg            # Favicon
```

**Build command:** `npm run build` (creates `dist/` directory)

**Serving requirements:**
- Serve `index.html` for all non-API routes (SPA fallback)
- Serve static assets from `dist/assets/` with correct MIME types
- Enable gzip/brotli compression for `.js` and `.css` files
- Cache static assets with immutable headers (files have content hashes)

### 2. API Route Preservation

**All existing API routes must remain unchanged:**

```
/health                  # Health check
/api/flows              # Flow CRUD
/api/flows/:id          # Flow operations
/api/executions         # Execution history
/api/executions/:id     # Execution details
```

**Important:** Frontend assumes these exact paths - do NOT change!

### 3. Frontend API Configuration

**Current frontend configuration** (`.env.local`):
```bash
VITE_BACKEND_URL=http://localhost:3000
VITE_ENABLE_BACKEND_SYNC=true
```

**After reverse proxy implementation:**
```bash
# Development (frontend dev server separate)
VITE_BACKEND_URL=http://localhost:3000

# Production (frontend served through backend)
VITE_BACKEND_URL=  # Empty - same origin, relative paths
```

**Code location:** `src/services/backendApi.ts:3`
```typescript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
// Empty string = relative paths (same origin)
```

### 4. CORS Configuration

**Current:** CORS enabled for `http://localhost:5173` (Vite dev server)

**After reverse proxy:**
- **Development mode:** Keep CORS for `localhost:5173` (frontend dev server)
- **Production mode:** No CORS needed (same origin)

**Recommendation:** Detect environment and conditionally enable CORS:
```javascript
if (process.env.NODE_ENV === 'development') {
  app.use(cors({ origin: 'http://localhost:5173' }));
}
```

---

## Backend Implementation Tasks

### Task 1: Add Static File Serving (30 min)

**File:** `src/server.ts` or equivalent

**Add middleware to serve frontend:**
```javascript
import express from 'express';
import path from 'path';

const app = express();

// ... existing middleware (body-parser, etc.) ...

// Serve static files from frontend build
app.use(express.static(path.join(__dirname, '../../prompt-flow-frontend/dist'), {
  maxAge: '1y',        // Cache static assets
  immutable: true,     // Assets have content hashes
  index: false         // Don't auto-serve index.html (we'll handle routing)
}));

// ... API routes ...

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res, next) => {
  // Skip if API route
  if (req.path.startsWith('/api') || req.path === '/health') {
    return next();
  }

  // Serve frontend
  res.sendFile(path.join(__dirname, '../../prompt-flow-frontend/dist/index.html'));
});
```

**Key Details:**
- Static middleware BEFORE API routes (for asset serving)
- SPA fallback AFTER API routes (to preserve API functionality)
- Check `req.path.startsWith('/api')` to avoid serving HTML for API calls

### Task 2: Build Integration (15 min)

**Option A: Manual Build (Simple)**
```bash
# From project root
cd prompt-flow-frontend
npm run build
cd ..
npm start  # Backend serves frontend
```

**Option B: Automated Build (Recommended)**

Add to backend `package.json`:
```json
{
  "scripts": {
    "build": "npm run build --prefix ../prompt-flow-frontend",
    "build:all": "npm run build && npm run build:backend",
    "start": "node dist/server.js",
    "start:prod": "npm run build:all && npm start"
  }
}
```

### Task 3: Environment Detection (10 min)

**Detect development vs production:**
```javascript
const isDevelopment = process.env.NODE_ENV === 'development';

// Enable CORS only in development
if (isDevelopment) {
  app.use(cors({
    origin: 'http://localhost:5173',  // Vite dev server
    credentials: true
  }));
}

// Log startup info
console.log(`
🚀 Server running on http://localhost:${PORT}
📦 Mode: ${isDevelopment ? 'Development' : 'Production'}
${isDevelopment ? '🔧 CORS enabled for frontend dev server' : '🌐 Serving frontend from /'}
`);
```

### Task 4: Production Deployment (Railway-specific)

**Railway configuration** (`railway.json` or equivalent):
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build:all"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Environment variables (Railway dashboard):**
```bash
NODE_ENV=production
PORT=3000  # Railway auto-assigns
DATABASE_URL=postgresql://...  # Provided by Railway
```

---

## Testing Checklist

### Backend Developer Testing

**Before handing back to frontend:**

1. **Build frontend successfully**
   ```bash
   cd prompt-flow-frontend
   npm run build
   # Should create dist/ directory with index.html and assets/
   ```

2. **Start backend with frontend serving**
   ```bash
   npm start
   # Should show: "Serving frontend from /"
   ```

3. **Test static file serving**
   ```bash
   curl http://localhost:3000/
   # Should return HTML (index.html)

   curl http://localhost:3000/assets/index-*.js
   # Should return JavaScript bundle
   ```

4. **Test API routes unchanged**
   ```bash
   curl http://localhost:3000/health
   # Should return: {"status":"ok",...}

   curl http://localhost:3000/api/flows
   # Should return: {"flows":[...],"total":...}
   ```

5. **Test SPA fallback**
   ```bash
   curl http://localhost:3000/flows
   # Should return HTML (index.html)

   curl http://localhost:3000/flows/some-id-123
   # Should return HTML (index.html)
   ```

### Frontend Developer Validation

**After backend implementation:**

1. **Test development mode** (separate frontend/backend)
   ```bash
   # Terminal 1 - Backend
   cd prompt-flow-backend
   npm run dev

   # Terminal 2 - Frontend
   cd prompt-flow-frontend
   npm run dev
   # Should still work at localhost:5173
   ```

2. **Test production mode** (frontend through backend)
   ```bash
   # Build frontend
   cd prompt-flow-frontend
   npm run build

   # Start backend
   cd ../prompt-flow-backend
   npm start

   # Open browser: http://localhost:3000
   # Should see Visual Flow app
   ```

3. **Verify API calls work**
   - Open browser console
   - Trigger save/load flow
   - Check network tab: requests to `/api/flows` should succeed
   - No CORS errors in console

4. **Test React Router navigation**
   - Navigate to different routes (`/`, `/flows`, etc.)
   - Should work without 404 errors
   - Refresh page on any route - should still work

---

## Known Issues & Solutions

### Issue 1: 404 for Frontend Routes

**Symptom:** Refreshing page on `/flows` returns 404

**Cause:** SPA fallback not configured

**Solution:** Ensure `app.get('*', ...)` is AFTER all API routes and serves `index.html`

### Issue 2: API Routes Return HTML

**Symptom:** API calls return HTML instead of JSON

**Cause:** SPA fallback catching API routes

**Solution:** Add `if (req.path.startsWith('/api'))` check in SPA fallback

### Issue 3: Static Assets Not Loading

**Symptom:** Browser shows 404 for `assets/index-*.js`

**Cause:** Static middleware not configured or wrong path

**Solution:** Verify `express.static()` points to correct `dist/` directory

### Issue 4: CORS Errors in Production

**Symptom:** CORS errors even though same origin

**Cause:** Frontend still using absolute URL (`http://localhost:3000`)

**Solution:** Frontend should use relative paths (empty `VITE_BACKEND_URL`)

---

## File Structure After Implementation

```
prompt-flow-backend/
├── src/
│   ├── server.ts              # ADD: Static serving + SPA fallback
│   ├── routes/
│   │   ├── flows.ts          # UNCHANGED
│   │   └── executions.ts     # UNCHANGED
│   └── ...
├── package.json               # ADD: Build scripts
└── dist/                      # Backend build output

prompt-flow-frontend/
├── src/
│   ├── services/
│   │   └── backendApi.ts     # CHANGE: Use relative URLs in production
│   └── ...
├── .env.local                 # CHANGE: Empty VITE_BACKEND_URL for production
├── dist/                      # Frontend build output (served by backend)
│   ├── index.html
│   └── assets/
└── package.json               # UNCHANGED
```

---

## Code Reference - Complete Implementation

**File:** `prompt-flow-backend/src/server.ts`

```typescript
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isDevelopment = process.env.NODE_ENV === 'development';

// CORS - Enable only in development for Vite dev server
if (isDevelopment) {
  app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
  }));
}

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check (must be before static serving)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Prompt Flow API is running'
  });
});

// API routes (must be before static serving)
app.use('/api/flows', flowsRouter);
app.use('/api/executions', executionsRouter);

// Serve frontend static files (only in production)
if (!isDevelopment) {
  const frontendDistPath = path.join(__dirname, '../../prompt-flow-frontend/dist');

  // Serve static assets with caching
  app.use(express.static(frontendDistPath, {
    maxAge: '1y',
    immutable: true,
    index: false
  }));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Server running on http://localhost:${PORT}
📦 Mode: ${isDevelopment ? 'Development' : 'Production'}
${isDevelopment ? '🔧 CORS enabled for frontend dev server' : '🌐 Serving frontend from /'}
  `);
});
```

---

## Frontend Changes Required

**File:** `prompt-flow-frontend/src/services/backendApi.ts`

**Current (Line 3):**
```typescript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
```

**Change to:**
```typescript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
// Empty string = relative URLs (same origin)
// Development: VITE_BACKEND_URL=http://localhost:3000 (separate servers)
// Production: VITE_BACKEND_URL= (empty, served through backend)
```

**File:** `prompt-flow-frontend/.env.local`

**Development (separate servers):**
```bash
VITE_BACKEND_URL=http://localhost:3000
VITE_ENABLE_BACKEND_SYNC=true
```

**Production (through backend):**
```bash
VITE_BACKEND_URL=
VITE_ENABLE_BACKEND_SYNC=true
```

---

## Success Criteria

**Backend developer delivers:**
- ✅ Backend serves frontend at `http://localhost:3000/`
- ✅ All API routes work unchanged
- ✅ SPA routing works (refresh on any route)
- ✅ Static assets load correctly
- ✅ No CORS errors in production
- ✅ Development mode still supports separate servers

**Frontend validation confirms:**
- ✅ App loads at `http://localhost:3000/`
- ✅ Navigation works
- ✅ API calls succeed (save/load flows)
- ✅ No console errors
- ✅ Build size reasonable (< 2MB)

---

## Timeline Estimate

| Task | Time | Assignee |
|------|------|----------|
| Backend: Add static serving | 30 min | Backend Dev |
| Backend: Build integration | 15 min | Backend Dev |
| Backend: Environment detection | 10 min | Backend Dev |
| Backend: Testing | 20 min | Backend Dev |
| **Backend Total** | **75 min** | **Backend Dev** |
| Frontend: Update API config | 5 min | Frontend Dev |
| Frontend: Test development mode | 10 min | Frontend Dev |
| Frontend: Test production mode | 15 min | Frontend Dev |
| **Frontend Total** | **30 min** | **Frontend Dev** |
| **Grand Total** | **~2 hours** | **Both** |

---

## Questions for Backend Developer?

**Before starting, please confirm:**

1. Is the frontend build directory path correct?
   - Expected: `../prompt-flow-frontend/dist/` relative to backend
   - Actual: _______________

2. Are you using CommonJS (`require`) or ES Modules (`import`)?
   - Current: ES Modules (`import`)
   - If different, path joining syntax may need adjustment

3. Do you prefer Option A (manual build) or Option B (automated)?
   - Option A: Simple, manual `npm run build` before deploy
   - Option B: Automated, adds build script to backend `package.json`

4. Any existing middleware that might conflict?
   - Existing static serving? _______________
   - Existing SPA fallback? _______________

---

## Support & Contact

**Questions during implementation:**
- Frontend Team: [Your contact info]
- Documentation: See `docs/IMPLEMENTATION_SUMMARY.md`
- API Reference: See `docs/BACKEND_INTEGRATION_HANDOFF.md`

**After implementation:**
- Ping frontend team for validation testing
- Schedule 15-min call if issues arise

---

**Last Updated:** 2025-10-18
**Status:** Ready for Backend Implementation
**Estimated Effort:** 75 minutes (backend) + 30 minutes (frontend validation)
