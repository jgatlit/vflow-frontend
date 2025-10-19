# Backend Sync Fix - Device ID Implementation

## Problem Summary

The frontend was experiencing continuous 500 errors when trying to sync flows to the backend:

```
POST http://localhost:3000/api/flows [500 Internal Server Error]
Error: Foreign key constraint violated on the foreign key
```

## Root Cause

1. **Frontend sent:** `x-user-id: user-1`
2. **Database had:** `id: test-user-1`
3. **Result:** Foreign key constraint violation because `user-1` didn't exist in the `users` table

The Prisma schema requires `authorId` to reference an existing `User`:
```prisma
authorId       String?
author         User?         @relation("UserFlows", fields: [authorId], references: [id])
```

## Solution Implemented

### Option B + C: Device ID Generation + Auto-Create Users

We implemented a two-part solution that allows the frontend to work without authentication while maintaining database integrity:

### Frontend Changes (`src/services/backendApi.ts`)

1. **Device ID Generation Function**
   - Generates a stable, persistent device identifier using `crypto.randomUUID()`
   - Stores in `localStorage` under key `visual-flow-device-id`
   - Format: `device-{uuid}` (e.g., `device-abc123-def456-...`)
   - Reuses same ID across browser sessions

2. **Updated Request Headers**
   - Changed from hardcoded `'x-user-id': 'user-1'`
   - To dynamic `'x-user-id': getDeviceId()`

```typescript
function getDeviceId(): string {
  const STORAGE_KEY = 'visual-flow-device-id';
  let deviceId = localStorage.getItem(STORAGE_KEY);

  if (!deviceId) {
    deviceId = `device-${crypto.randomUUID()}`;
    localStorage.setItem(STORAGE_KEY, deviceId);
    console.log('Generated new device ID:', deviceId);
  }

  return deviceId;
}
```

### Backend Changes (`src/services/FlowService.ts`)

1. **Auto-Create Device Users**
   - New private method: `getOrCreateDeviceUser(deviceId: string)`
   - Checks if user exists, creates if missing
   - Creates users with format:
     - `id`: device ID (e.g., `device-abc123...`)
     - `email`: `{deviceId}@device.local`
     - `name`: `Device User {first-8-chars}`
     - `password`: `device-user-no-password`

2. **Smart AuthorId Handling**
   - If `authorId` starts with `device-`, auto-create device user
   - If `authorId` exists but user not found, create as device user
   - Allows `null` authorId if not provided

```typescript
async create(data: FlowCreateInput) {
  let authorId = data.authorId;

  if (authorId) {
    if (authorId.startsWith('device-')) {
      await this.getOrCreateDeviceUser(authorId);
    } else {
      const userExists = await prisma.user.findUnique({
        where: { id: authorId },
      });

      if (!userExists) {
        await this.getOrCreateDeviceUser(authorId);
      }
    }
  }

  // ... create flow with authorId
}
```

## Configuration

Updated `.env` file:
```env
VITE_API_URL=http://localhost:3000
VITE_BACKEND_URL=http://localhost:3000
VITE_ENABLE_BACKEND_SYNC=true
```

## Benefits

1. **No Authentication Required** - Frontend works immediately without user login
2. **Stable Ownership** - Each browser instance maintains consistent device ID
3. **Foreign Key Compliance** - All flows have valid `authorId` references
4. **Backward Compatible** - Works with existing user IDs
5. **Future-Proof** - Easy to migrate device users to real users later

## Testing Results

✅ Backend successfully creates device users on first request:
```bash
curl -X POST http://localhost:3000/api/flows \
  -H "Content-Type: application/json" \
  -H "x-user-id: device-test-12345" \
  -d '{"name":"Test Flow","flow":{"nodes":[],"edges":[]}}'

# Backend logs:
Created device user: device-test-12345

# Response: 200 OK with flow data
```

## Migration Path

When implementing real authentication:

1. Frontend: Replace `getDeviceId()` with `getUserId()` from auth context
2. Backend: Keep device user logic as fallback for unauthenticated requests
3. Optional: Add migration script to convert device users to real users

## Files Modified

- `prompt-flow-frontend/src/services/backendApi.ts` - Device ID generation
- `prompt-flow-backend/src/services/FlowService.ts` - Auto-create users
- `prompt-flow-frontend/.env` - Backend sync configuration

## Verification Steps

1. Clear localStorage to test new device ID generation
2. Open frontend and create/edit a flow
3. Check browser console for "Generated new device ID" message
4. Check backend console for "Created device user" message
5. Verify flows save successfully without errors

---

**Status:** ✅ Implemented and Tested
**Date:** 2025-10-19
**Impact:** Resolves 500 error loop, enables functional backend sync
