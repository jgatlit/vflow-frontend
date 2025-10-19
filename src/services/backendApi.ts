import type { Flow } from '../db/database';

// Empty string = relative URLs (same origin for production)
// Development should set VITE_BACKEND_URL=http://localhost:3000 for separate servers
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
const RETRY_DELAYS = [1000, 2000, 5000]; // 1s, 2s, 5s

interface BackendResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Generate or retrieve a stable device/client identifier
 * This allows the frontend to work without requiring user authentication
 * while still providing a consistent identifier for flow ownership
 */
function getDeviceId(): string {
  const STORAGE_KEY = 'visual-flow-device-id';

  let deviceId = localStorage.getItem(STORAGE_KEY);

  if (!deviceId) {
    // Generate a stable device ID using crypto.randomUUID()
    // Format: device-{uuid} to distinguish from real user IDs
    deviceId = `device-${crypto.randomUUID()}`;
    localStorage.setItem(STORAGE_KEY, deviceId);
    console.log('Generated new device ID:', deviceId);
  }

  return deviceId;
}

/**
 * Sync flow to backend with automatic retry
 * Non-blocking - returns immediately if offline
 * Uses upsert pattern: try PUT first, if 404 then POST
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
      // Get stable device identifier
      const deviceId = getDeviceId();

      // Try UPDATE first (PUT)
      let response = await fetch(`${BACKEND_URL}/api/flows/${flow.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': deviceId
        },
        body: JSON.stringify(flow),
        signal: AbortSignal.timeout(5000) // 5s timeout
      });

      // If 404 (not found), try CREATE (POST)
      if (response.status === 404) {
        console.log('Flow not found in backend, creating new...');
        response = await fetch(`${BACKEND_URL}/api/flows`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': deviceId
          },
          body: JSON.stringify(flow),
          signal: AbortSignal.timeout(5000)
        });
      }

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

      // Client error (4xx other than 404) - don't retry
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
    const response = await fetch(`${BACKEND_URL}/health`, {
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

/**
 * Feature flag to enable/disable backend sync
 */
export function isBackendSyncEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_BACKEND_SYNC === 'true';
}
