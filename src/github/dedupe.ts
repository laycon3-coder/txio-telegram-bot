// Bounded in-memory cache of recently-seen X-GitHub-Delivery ids.
//
// GitHub retries a failed delivery for up to ~72 hours, so a 24-hour TTL
// comfortably covers the window in which a duplicate can arrive. The size
// cap (1 000 entries) ensures the Map cannot grow unbounded under sustained
// high webhook volume; when the cap is reached the oldest entry is evicted
// first (Map iteration order == insertion order).
//
// Accepted limitation: the cache is in-process only. A duplicate that
// arrives after a process restart will not be caught. A persistent store
// (Redis, a DB table) would close that gap but is out of scope for this fix.

const deliveryCache = new Map<string, number>();
const DELIVERY_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
const MAX_CACHE_SIZE = 1_000;

function pruneExpiredDeliveries(now: number): void {
  for (const [id, seenAt] of deliveryCache.entries()) {
    if (now - seenAt > DELIVERY_TTL_MS) {
      deliveryCache.delete(id);
    }
  }
}

/** Clears the cache. For use in tests only. */
export function _resetDeliveryCache(): void {
  deliveryCache.clear();
}

/**
 * Returns `true` when this delivery should be processed (first time seen),
 * `false` when it is a duplicate that should be skipped.
 *
 * If `deliveryId` is absent (e.g. the header was missing), the delivery is
 * allowed through — we can't deduplicate what we can't identify.
 */
export function shouldProcessDelivery(deliveryId: string | undefined): boolean {
  if (!deliveryId) {
    return true;
  }

  const now = Date.now();
  pruneExpiredDeliveries(now);

  if (deliveryCache.has(deliveryId)) {
    return false;
  }

  // Evict the oldest entry when the cache is at capacity.
  if (deliveryCache.size >= MAX_CACHE_SIZE) {
    const oldest = deliveryCache.keys().next().value;
    if (oldest !== undefined) {
      deliveryCache.delete(oldest);
    }
  }

  deliveryCache.set(deliveryId, now);
  return true;
}
