# TODO List - Visual Flow Frontend

## Immediate Tasks

### Code Cleanup & Refactoring

- [ ] **Consolidate flowName/safeFlowName in AutosaveIndicator**
  - **Location:** `src/components/AutosaveIndicator.tsx`
  - **Current state:** Using defensive `safeFlowName` check to prevent React rendering errors
  - **Future:** Once stable, consolidate to single flowName variable
  - **When:** After confirming all features work correctly and no edge cases with event objects
  - **File:** Lines 32-133

- [ ] **Consolidate flows/rawFlows in FlowListSidebar**
  - **Location:** `src/components/FlowListSidebar.tsx`
  - **Current state:** Using defensive sanitization layer that transforms `rawFlows` to `flows`
  - **Future:** Once database data is confirmed stable, may be able to remove sanitization
  - **When:** After confirming no corrupted data in IndexedDB and pattern is validated
  - **File:** Lines 17-36
  - **Note:** May keep sanitization permanently for defensive programming

### Bug Fixes

- [ ] **Fix pre-existing TypeScript errors (~100 errors)**
  - **Priority:** Low (not blocking)
  - **Affected files:**
    - `src/nodes/*.tsx` - NodeProps type mismatches (6 files)
    - `src/services/WorkflowExportService.ts`
    - `src/services/WorkflowImportService.ts`
    - `src/services/codeExecutionService.ts`
    - `src/utils/validation.ts`
  - **Impact:** Build completes, app runs fine
  - **Estimated time:** 2-3 hours

- [ ] **Update backend CORS for port 5175**
  - **File:** `../prompt-flow-backend/src/server.ts`
  - **Change:** Add `http://localhost:5175` to allowed origins
  - **Current:** Allows 5173, 5174
  - **Impact:** Backend API calls from frontend will fail CORS

## Phase 2 - Backend Integration (Optional)

**📚 Complete guides available:**
- `docs/FRONTEND_SYNC_INTEGRATION_GUIDE.md` - Step-by-step implementation
- `docs/ARCHITECTURE_COMPARISON.md` - Why bifurcated architecture
- `../prompt-flow-backend/docs/BACKEND_INTEGRATION_HANDOFF.md` - Backend reference

**⏱️ Total time estimate:** 2-4 hours
**✅ Backend status:** Ready (all endpoints tested)

### Quick Start (5 minutes)

- [ ] **Test backend connection**
  - **File:** Create `src/services/backendApi.ts`
  - **Code:** Copy from `docs/FRONTEND_SYNC_INTEGRATION_GUIDE.md` (Option 1)
  - **Test:** Run in browser console
  - **Expected:** `true` if backend is running

### Full Integration (2-4 hours)

- [ ] **Create backend API client with retry logic**
  - **File:** `src/services/backendApi.ts`
  - **Reference:** `docs/FRONTEND_SYNC_INTEGRATION_GUIDE.md` (Step 1)
  - **Features:**
    - Automatic retry (1s, 2s, 5s delays)
    - Offline detection (30s cache)
    - 5s timeout per request
  - **Time estimate:** 30-45 minutes

- [ ] **Add parallel backend sync to flow save**
  - **File:** `src/hooks/useFlowPersistence.ts`
  - **Reference:** `docs/FRONTEND_SYNC_INTEGRATION_GUIDE.md` (Step 2)
  - **Change:** Add `syncFlowToBackend()` call after IndexedDB save
  - **Pattern:** Non-blocking (user doesn't wait)
  - **Code:** ~10 lines
  - **Time estimate:** 15-30 minutes

- [ ] **Add environment configuration**
  - **File:** `.env.local`
  - **Reference:** `docs/FRONTEND_SYNC_INTEGRATION_GUIDE.md` (Step 3)
  - **Variables:**
    - `VITE_BACKEND_URL=http://localhost:3001`
    - `VITE_ENABLE_BACKEND_SYNC=true`
  - **Time estimate:** 5 minutes

- [ ] **Add feature flag (optional)**
  - **File:** `src/services/backendApi.ts`
  - **Reference:** `docs/FRONTEND_SYNC_INTEGRATION_GUIDE.md` (Step 4)
  - **Purpose:** Toggle backend sync on/off
  - **Time estimate:** 10 minutes

### Testing (1-2 hours)

- [ ] **Test backend health check**
  - **Command:** `curl http://localhost:3001/api/health`
  - **Expected:** `{"status":"ok"}`

- [ ] **Test sync with browser console**
  - **Reference:** `docs/FRONTEND_SYNC_INTEGRATION_GUIDE.md` (Testing Guide)
  - **Expected:** `{ success: true, data: {...} }`

- [ ] **Test offline resilience**
  - **Steps:** Stop backend → Save flow → Check console
  - **Expected:** Local save succeeds, sync fails gracefully

- [ ] **Test network tab verification**
  - **Steps:** Open DevTools → Save flow → Check Network tab
  - **Expected:** PUT request after UI updates

### Success Criteria

- ✅ Local saves remain instant (< 10ms)
- ✅ UI updates immediately (no waiting)
- ✅ Backend sync completes in background (50-200ms)
- ✅ Offline mode works (local save succeeds)
- ✅ Network errors handled gracefully (retry logic)
- ✅ No user-facing errors (logged to console)

### Future Enhancements

- [ ] **Add backend execution tracking**
  - **File:** `src/services/executionService.ts`
  - **Change:** Sync execution records to backend
  - **Pattern:** Create before run, complete after run

- [ ] **Implement sync queue (offline support)**
  - **File:** `src/services/syncService.ts` (new)
  - **Features:**
    - Queue failed syncs for retry
    - Sync on window online event
    - Auto-sync every 5 minutes
    - Conflict detection

- [ ] **Add sync status UI**
  - **File:** `src/components/AutosaveIndicator.tsx`
  - **Change:** Add 'syncing' | 'synced' | 'sync-failed' states
  - **Pattern:** Show backend sync status separately from local save

## Phase 3 - Advanced Features

- [ ] **Conflict resolution UI**
  - Version history comparison
  - Manual merge interface
  - Automatic last-write-wins

- [ ] **Collaboration features**
  - Real-time cursors
  - Comments on nodes
  - Team permissions
  - Activity feed

- [ ] **Performance optimization**
  - Lazy loading for large flows
  - Virtual scrolling in flow list
  - Background sync worker
  - Cache optimization
  - Debounce improvements

## Testing

- [ ] **Write unit tests for persistence**
  - `useFlowPersistence` hook
  - Database functions
  - Sanitization helpers

- [ ] **Write integration tests**
  - Flow save/load cycle
  - Execution tracking
  - Flow list updates

- [ ] **E2E tests**
  - Full user workflows
  - Offline/online transitions
  - Cross-device sync (when backend integrated)

## Documentation

- [ ] **Update README with setup instructions**
  - IndexedDB requirements
  - Browser compatibility
  - Storage limits

- [ ] **Create user guide**
  - Flow management
  - Autosave behavior
  - Execution tracking
  - Data export/import

- [ ] **API documentation**
  - Database schema
  - Hook usage
  - Component props

## Known Issues

### Non-Critical

1. **CORS warning on export**
   - Export via local download works
   - Backend API export requires CORS fix
   - Not blocking functionality

2. **Deprecated warnings in console**
   - `InstallTrigger is deprecated`
   - `onmozfullscreenchange is deprecated`
   - Browser-specific, no impact

## Notes

- All persistence features are working with Dexie.js
- Backend integration is optional and can be added incrementally
- No breaking changes needed for backend sync
- Data migration plan exists in backend handoff docs

---

## Priority Order

1. **High:** Backend CORS fix (5 minutes)
2. **Medium:** TypeScript errors cleanup (2-3 hours)
3. **Low:** Code consolidation (safeFlowName) (30 minutes)
4. **Future:** Phase 2+ features (as needed)

---

Last Updated: 2025-10-18
