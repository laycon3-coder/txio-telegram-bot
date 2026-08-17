const deliveryCache = new Map<string, number>();
const DELIVERY_TTL_MS = 24 * 60 * 60 * 1000;

function pruneExpiredDeliveries(now: number): void {
  for (const [id, seenAt] of deliveryCache.entries()) {
    if (now - seenAt > DELIVERY_TTL_MS) {
      deliveryCache.delete(id);
    }
  }
}

export function shouldProcessDelivery(deliveryId: string | undefined): boolean {
  if (!deliveryId) {
    return true;
  }

  const now = Date.now();
  pruneExpiredDeliveries(now);

  const seenAt = deliveryCache.get(deliveryId);
  if (seenAt !== undefined) {
    return false;
  }

  deliveryCache.set(deliveryId, now);
  return true;
}
