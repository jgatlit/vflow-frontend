/**
 * Trace Cache Context
 *
 * Provides in-memory caching for LangSmith traces to avoid repeated API calls.
 * Works in conjunction with backend database caching for multi-layer performance.
 *
 * Cache Strategy:
 * 1. Check frontend cache (instant - 0ms)
 * 2. If miss, fetch from backend (which checks its own cache)
 * 3. Store in frontend cache for session
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { LangSmithTrace } from '../services/traceService';
import { fetchTrace } from '../services/traceService';

interface CachedTrace {
  data: LangSmithTrace;
  cachedAt: number;
}

interface TraceCacheContextValue {
  getTrace: (traceId: string, forceRefresh?: boolean) => Promise<LangSmithTrace>;
  clearCache: () => void;
  getCacheStats: () => { hits: number; misses: number; size: number };
}

const TraceCacheContext = createContext<TraceCacheContextValue | null>(null);

export function TraceCacheProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState<Map<string, CachedTrace>>(new Map());
  const [stats, setStats] = useState({ hits: 0, misses: 0 });

  const getTrace = useCallback(
    async (traceId: string, forceRefresh = false): Promise<LangSmithTrace> => {
      // Check frontend cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = cache.get(traceId);
        if (cached) {
          console.log(`[TraceCache] Frontend cache HIT for ${traceId} (${Date.now() - cached.cachedAt}ms old)`);
          setStats((s) => ({ ...s, hits: s.hits + 1 }));
          return cached.data;
        }
        console.log(`[TraceCache] Frontend cache MISS for ${traceId} - fetching from backend`);
        setStats((s) => ({ ...s, misses: s.misses + 1 }));
      } else {
        console.log(`[TraceCache] Force refresh requested for ${traceId}`);
      }

      // Fetch from backend (which has its own cache)
      const trace = await fetchTrace(traceId, forceRefresh);

      // Store in frontend cache
      setCache((prev) => {
        const newCache = new Map(prev);
        newCache.set(traceId, {
          data: trace,
          cachedAt: Date.now(),
        });
        return newCache;
      });

      console.log(`[TraceCache] Cached trace ${traceId} in frontend cache`);
      return trace;
    },
    [cache]
  );

  const clearCache = useCallback(() => {
    setCache(new Map());
    setStats({ hits: 0, misses: 0 });
    console.log('[TraceCache] Cleared frontend cache');
  }, []);

  const getCacheStats = useCallback(() => {
    return {
      hits: stats.hits,
      misses: stats.misses,
      size: cache.size,
    };
  }, [cache.size, stats]);

  return (
    <TraceCacheContext.Provider value={{ getTrace, clearCache, getCacheStats }}>
      {children}
    </TraceCacheContext.Provider>
  );
}

export function useTraceCache() {
  const context = useContext(TraceCacheContext);
  if (!context) {
    throw new Error('useTraceCache must be used within TraceCacheProvider');
  }
  return context;
}
