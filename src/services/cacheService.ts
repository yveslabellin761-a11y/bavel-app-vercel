/**
 * High-speed In-Memory & LocalStorage Cache Manager
 * Prevents redundant Supabase & network API roundtrips.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // in milliseconds
}

class CacheService {
  private memoryCache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttlMs = 5 * 60 * 1000): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    };
    this.memoryCache.set(key, entry);

    try {
      // Store in session or local storage for offline resiliency
      sessionStorage.setItem(`bavel_cache_${key}`, JSON.stringify(entry));
    } catch {}
  }

  get<T>(key: string): T | null {
    const memEntry = this.memoryCache.get(key);
    if (memEntry) {
      if (Date.now() - memEntry.timestamp < memEntry.ttl) {
        return memEntry.data as T;
      }
      this.memoryCache.delete(key);
    }

    try {
      const stored = sessionStorage.getItem(`bavel_cache_${key}`);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        if (Date.now() - entry.timestamp < entry.ttl) {
          this.memoryCache.set(key, entry);
          return entry.data;
        }
        sessionStorage.removeItem(`bavel_cache_${key}`);
      }
    } catch {}

    return null;
  }

  invalidate(key: string): void {
    this.memoryCache.delete(key);
    try {
      sessionStorage.removeItem(`bavel_cache_${key}`);
    } catch {}
  }

  clearAll(): void {
    this.memoryCache.clear();
  }
}

export const cacheService = new CacheService();
