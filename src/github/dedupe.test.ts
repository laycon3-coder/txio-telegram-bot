import test from "node:test";
import assert from "node:assert/strict";

import { shouldProcessDelivery, _resetDeliveryCache } from "./dedupe.js";

// Reset the module-level cache before each logical test to keep tests
// independent of each other.

test("first delivery is processed", () => {
  _resetDeliveryCache();
  assert.equal(shouldProcessDelivery("abc-123"), true);
});

test("duplicate delivery id is skipped", () => {
  _resetDeliveryCache();
  assert.equal(shouldProcessDelivery("dup-id"), true, "first delivery should be processed");
  assert.equal(shouldProcessDelivery("dup-id"), false, "duplicate delivery should be skipped");
});

test("two different delivery ids are both processed", () => {
  _resetDeliveryCache();
  assert.equal(shouldProcessDelivery("id-one"), true);
  assert.equal(shouldProcessDelivery("id-two"), true);
});

test("undefined delivery id is always allowed through", () => {
  _resetDeliveryCache();
  assert.equal(shouldProcessDelivery(undefined), true, "first undefined should be allowed");
  assert.equal(shouldProcessDelivery(undefined), true, "second undefined should also be allowed");
});

test("cache evicts oldest entry when MAX_CACHE_SIZE is reached", () => {
  _resetDeliveryCache();
  const MAX = 1_000;

  // Fill the cache to capacity with ids "0" through "999".
  for (let i = 0; i < MAX; i++) {
    assert.equal(shouldProcessDelivery(String(i)), true, `entry ${i} should be accepted`);
  }

  // Cache is now full: {0, 1, ..., 999}
  // Adding "1000" evicts the oldest entry ("0"). Cache: {1, ..., 999, 1000}
  assert.equal(shouldProcessDelivery("1000"), true, "new entry after max should be accepted");

  // "0" was evicted, so it looks new again — it should be accepted.
  // This also evicts "1". Cache: {2, ..., 999, 1000, 0}
  assert.equal(shouldProcessDelivery("0"), true, "evicted entry should be re-accepted as new");

  // "2" through "999" are still in the cache — should be duplicates.
  assert.equal(shouldProcessDelivery("2"), false, "non-evicted entry should still be a duplicate");
  assert.equal(shouldProcessDelivery("500"), false, "non-evicted entry should still be a duplicate");
  assert.equal(shouldProcessDelivery("999"), false, "non-evicted entry should still be a duplicate");
  assert.equal(shouldProcessDelivery("1000"), false, "recently added entry should be a duplicate");
  assert.equal(shouldProcessDelivery("0"), false, "re-added entry should now be a duplicate");

  // "1" was evicted when "0" was re-added, so it should be accepted again.
  assert.equal(shouldProcessDelivery("1"), true, "second evicted entry should be re-accepted as new");
});
