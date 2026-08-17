import test from "node:test";
import assert from "node:assert/strict";

import { shouldProcessDelivery } from "./dedupe.js";

test("duplicate GitHub delivery IDs are ignored", () => {
  const firstId = "delivery-1";
  const secondId = "delivery-1";
  const thirdId = "delivery-2";

  assert.equal(shouldProcessDelivery(firstId), true);
  assert.equal(shouldProcessDelivery(secondId), false);
  assert.equal(shouldProcessDelivery(thirdId), true);
});
