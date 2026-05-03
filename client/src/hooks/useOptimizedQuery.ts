import { useCallback, useRef, useEffect, useState } from "react";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const queryCache = new Map<string, CacheEntry<any>>();

/**
 * Hook para optimizar queries con caché local
 * Evita refetches innecesarias dentro del TTL
 */
export function useOptimizedQuery<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  options?: {
    ttl?: number; // Time to live en milisegundos (default: 5 minutos)
    enabled?: boolean;
  }
) {
  const { ttl = 5 * 60 * 1000, enabled = true } = options || {};
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Verificar caché
    const cached = queryCache.get(queryKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      setData(cached.data);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await queryFn();

      if (isMountedRef.current) {
        setData(result);
        // Guardar en caché
        queryCache.set(queryKey, {
          data: result,
          timestamp: Date.now(),
          ttl,
        });
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [queryKey, queryFn, ttl, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const invalidate = useCallback(() => {
    queryCache.delete(queryKey);
    fetchData();
  }, [queryKey, fetchData]);

  return {
    data,
    isLoading,
    error,
    invalidate,
  };
}

/**
 * Limpia el caché de queries
 */
export function clearQueryCache() {
  queryCache.clear();
}

/**
 * Invalida un query específico
 */
export function invalidateQuery(queryKey: string) {
  queryCache.delete(queryKey);
}

/**
 * Invalida queries por patrón
 */
export function invalidateQueriesByPattern(pattern: string | RegExp) {
  const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
  const keysToDelete: string[] = [];

  queryCache.forEach((_, key) => {
    if (regex.test(key)) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => queryCache.delete(key));
}
