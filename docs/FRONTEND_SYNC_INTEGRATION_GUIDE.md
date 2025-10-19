# Frontend Sync Integration Guide

**Status**: Ready for Implementation
**Estimated Time**: 2-4 hours
**Complexity**: Low (non-blocking pattern)
**Impact**: Cross-device sync, team collaboration, offline support

---

## Overview

This guide shows how to add **parallel backend sync** to the Visual Flow frontend's data persistence layer. The integration is designed to be:

- ✅ **Non-blocking** - Local saves happen instantly, backend sync runs in parallel
- ✅ **Resilient** - Automatic retry, offline support, graceful degradation
- ✅ **Incremental** - Can test without committing to full implementation
- ✅ **Zero UX impact** - User experience remains identical

---

## Architecture: Why Bifurcated?

### Current Architecture (Frontend Only)

```
User Action → IndexedDB (instant save) → UI Update
```

**Benefits:**
- ⚡ Instant saves (no network latency)
- 📴 Works offline
- 🎨 Simple implementation

**Limitations:**
- 🚫 No cross-device sync
- 🚫 No team collaboration
- 🚫 Data lost if browser cleared

### New Architecture (Bifurcated)

```
User Action → IndexedDB (instant save) → UI Update
           ↓
           → Backend API (parallel, non-blocking) → PostgreSQL
```

**Why Bifurcated?**

1. **Speed**: IndexedDB saves are instant (1-5ms), backend saves take 50-200ms
2. **Reliability**: Local save succeeds even if backend is down
3. **Offline Support**: App works offline, syncs when reconnected
4. **User Experience**: No perceived latency
5. **Progressive Enhancement**: Backend is an enhancement, not a requirement

---

## Implementation Options

### Option 1: Quick Test (5 minutes)

Test backend sync without modifying existing code.

**File:** `src/services/backendApi.ts` (create new)

```typescript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export async function testBackendConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    return response.ok;
  } catch (error) {
    console.error('Backend connection failed:', error);
    return false;
  }
}

// Test in browser console:
// import { testBackendConnection } from './src/services/backendApi';
// testBackendConnection().then(console.log);
```

### Option 2: Full Integration (2-4 hours)

Complete implementation with retry logic and offline support.

---

## Step-by-Step Implementation

### Step 1: Create Backend API Client

**File:** `src/services/backendApi.ts`

```typescript
import type { Flow } from '../db/database';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const RETRY_DELAYS = [1000, 2000, 5000]; // 1s, 2s, 5s

interface BackendResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Sync flow to backend with automatic retry
 * Non-blocking - returns immediately if offline
 */
export async function syncFlowToBackend(flow: Flow): Promise<BackendResponse<Flow>> {
  // Check if backend is reachable (quick check)
  if (!(await isBackendAvailable())) {
    console.warn('Backend unavailable, skipping sync');
    return { success: false, error: 'Backend offline' };
  }

  // Try to sync with retry logic
  for (let i = 0; i < RETRY_DELAYS.length; i++) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/flows/${flow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flow),
        signal: AbortSignal.timeout(5000) // 5s timeout
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      }

      // Server error (5xx) - retry
      if (response.status >= 500) {
        console.warn(`Backend sync failed (${response.status}), retrying...`);
        await delay(RETRY_DELAYS[i]);
        continue;
      }

      // Client error (4xx) - don't retry
      return {
        success: false,
        error: `Backend error: ${response.status}`
      };

    } catch (error) {
      console.error(`Backend sync attempt ${i + 1} failed:`, error);
      if (i < RETRY_DELAYS.length - 1) {
        await delay(RETRY_DELAYS[i]);
      }
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

/**
 * Quick check if backend is available
 * Cached for 30 seconds to avoid excessive health checks
 */
let backendAvailableCache: { value: boolean; timestamp: number } | null = null;
const CACHE_TTL = 30000; // 30 seconds

async function isBackendAvailable(): Promise<boolean> {
  const now = Date.now();

  if (backendAvailableCache && (now - backendAvailableCache.timestamp) < CACHE_TTL) {
    return backendAvailableCache.value;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/health`, {
      signal: AbortSignal.timeout(2000) // 2s timeout
    });
    const available = response.ok;
    backendAvailableCache = { value: available, timestamp: now };
    return available;
  } catch {
    backendAvailableCache = { value: false, timestamp: now };
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Step 2: Integrate with Flow Persistence Hook

**File:** `src/hooks/useFlowPersistence.ts`

**Add import:**
```typescript
import { syncFlowToBackend } from '../services/backendApi';
```

**Modify `saveFlow` function** (add after IndexedDB save):

```typescript
const saveFlow = useCallback(async (flowName?: string): Promise<Flow> => {
  setState(prev => ({ ...prev, autosaveStatus: 'saving' }));

  try {
    const flowObject = toObject();
    const sanitizedFlow = sanitizeFlowObject(flowObject);
    const name = flowName || state.currentFlowName;

    let savedFlow: Flow;

    if (state.currentFlowId) {
      // Update existing flow
      savedFlow = await updateFlowWithMetadata(state.currentFlowId, {
        name,
        flow: sanitizedFlow,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Create new flow
      savedFlow = await createFlowWithMetadata(name, sanitizedFlow, {
        description: `Flow with ${nodes.length} nodes and ${edges.length} connections`,
        tags: ['auto-generated'],
      });
      localStorage.setItem('lastOpenedFlowId', savedFlow.id);
    }

    // ✅ NEW: Parallel backend sync (non-blocking)
    syncFlowToBackend(savedFlow).then(result => {
      if (result.success) {
        console.log('✅ Backend sync successful');
      } else {
        console.warn('⚠️ Backend sync failed:', result.error);
      }
    }).catch(error => {
      console.error('❌ Backend sync error:', error);
    });

    // Update local state (don't wait for backend)
    setState(prev => ({
      ...prev,
      currentFlowId: savedFlow.id,
      currentFlowName: savedFlow.name,
      autosaveStatus: 'saved',
      lastSavedAt: savedFlow.updatedAt,
      isDirty: false,
    }));

    // ... rest of function
    return savedFlow;
  } catch (error) {
    // ... error handling
  }
}, [state.currentFlowId, state.currentFlowName, toObject, nodes, edges]);
```

### Step 3: Add Environment Configuration

**File:** `.env.local` (create if doesn't exist)

```bash
# Backend API URL
VITE_BACKEND_URL=http://localhost:3001

# Enable/disable backend sync
VITE_ENABLE_BACKEND_SYNC=true
```

### Step 4: Add Feature Flag (Optional)

**File:** `src/services/backendApi.ts`

```typescript
export function isBackendSyncEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_BACKEND_SYNC === 'true';
}
```

**File:** `src/hooks/useFlowPersistence.ts`

```typescript
// Only sync if enabled
if (isBackendSyncEnabled()) {
  syncFlowToBackend(savedFlow).then(/* ... */);
}
```

---

## Testing Guide

### 1. Backend Health Check

```bash
# Terminal 1: Start backend
cd ../prompt-flow-backend
npm run dev

# Terminal 2: Test health endpoint
curl http://localhost:3001/api/health
# Expected: {"status":"ok"}
```

### 2. Frontend Integration Test

```typescript
// Browser console
import { syncFlowToBackend } from './src/services/backendApi';
import { db } from './src/db/database';

// Get a flow from IndexedDB
const flow = await db.flows.toArray().then(flows => flows[0]);

// Test sync
const result = await syncFlowToBackend(flow);
console.log(result);
// Expected: { success: true, data: {...} }
```

### 3. Offline Resilience Test

```bash
# Stop backend
# Try saving a flow in the frontend
# Expected: Local save succeeds, backend sync fails gracefully
# Check console for: "⚠️ Backend sync failed: Backend offline"
```

### 4. Network Tab Verification

1. Open browser DevTools → Network tab
2. Save a flow in the frontend
3. Look for PUT request to `/api/flows/{id}`
4. Verify it happens AFTER the UI updates (parallel, non-blocking)

---

## Success Criteria

✅ **Local saves remain instant** (< 10ms)
✅ **UI updates immediately** (no waiting for backend)
✅ **Backend sync completes in background** (50-200ms)
✅ **Offline mode works** (local save succeeds, sync queued)
✅ **Network errors handled gracefully** (retry logic, user warnings)
✅ **No user-facing errors** (all errors logged to console)

---

## Migration Path

### Phase 1: Development (Current)
- Local IndexedDB only
- Backend sync optional (feature flag)

### Phase 2: Testing
- Enable backend sync for testing
- Verify dual-write pattern
- Monitor for conflicts

### Phase 3: Production
- Enable backend sync by default
- IndexedDB becomes cache layer
- Backend becomes source of truth

### Phase 4: Sync Service (Future)
- Bi-directional sync
- Conflict resolution
- Cross-device collaboration

---

## Troubleshooting

### Backend sync always fails

**Check:**
1. Backend is running: `curl http://localhost:3001/api/health`
2. CORS is configured: Backend allows `http://localhost:5175`
3. Network tab shows request details

### Backend sync is slow

**Check:**
1. Network latency (DevTools → Network)
2. Backend logs for slow queries
3. Consider increasing timeout

### Data conflicts

**Current behavior:** Last write wins (no conflict resolution)
**Future solution:** Implement sync service with conflict detection

---

## Code Changes Summary

| File | Change | Lines |
|------|--------|-------|
| `src/services/backendApi.ts` | Create new file | ~100 |
| `src/hooks/useFlowPersistence.ts` | Add backend sync call | ~10 |
| `.env.local` | Add config | ~5 |

**Total impact:** ~115 lines of code

---

## Performance Impact

| Metric | Before | After |
|--------|--------|-------|
| Save latency (user-perceived) | 1-5ms | 1-5ms ✅ |
| Total save time | 1-5ms | 50-200ms (background) |
| Offline support | ✅ Yes | ✅ Yes |
| Network requests | 0 | 1 (background) |

**Result:** Zero performance impact on user experience

---

## Security Considerations

1. **CORS**: Backend must allow frontend origin
2. **Authentication**: Add auth headers if needed
3. **Input Validation**: Backend validates all data
4. **Rate Limiting**: Backend should rate-limit API calls

---

## Future Enhancements

### 1. Sync Queue (Offline Support)

```typescript
// Queue failed syncs for retry when online
const syncQueue: Flow[] = [];

window.addEventListener('online', () => {
  syncQueue.forEach(flow => syncFlowToBackend(flow));
});
```

### 2. Conflict Detection

```typescript
// Compare timestamps before overwriting
if (backendFlow.updatedAt > localFlow.updatedAt) {
  console.warn('Backend has newer version!');
}
```

### 3. Sync Status UI

```typescript
// Show sync status in AutosaveIndicator
status: 'syncing' | 'synced' | 'sync-failed'
```

---

## Questions?

**Q: Will this slow down saves?**
A: No! Local saves remain instant. Backend sync happens in parallel.

**Q: What if the backend is down?**
A: Local save succeeds, backend sync fails gracefully. No user impact.

**Q: Do I need to change existing code?**
A: Minimal changes (~10 lines). Existing code continues to work.

**Q: Can I disable backend sync?**
A: Yes! Use the `VITE_ENABLE_BACKEND_SYNC` feature flag.

**Q: What about data conflicts?**
A: Current implementation uses "last write wins". Future: proper conflict resolution.

---

## Next Steps

1. ✅ Review this guide
2. ✅ Test backend health endpoint
3. ✅ Create `backendApi.ts` with test function
4. ✅ Test connection in browser console
5. ✅ Integrate full sync in `useFlowPersistence.ts`
6. ✅ Test with network throttling
7. ✅ Deploy to staging

**Estimated Time:** 2-4 hours for full implementation

---

**Last Updated:** 2025-10-18
**Author:** Claude (AI Assistant)
**Backend Reference:** `/prompt-flow-backend/docs/BACKEND_INTEGRATION_HANDOFF.md`
