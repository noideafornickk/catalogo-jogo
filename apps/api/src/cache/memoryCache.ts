type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  constructor() {
    const cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60_000);

    cleanupTimer.unref();
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }
}

export const memoryCache = new MemoryCache();
