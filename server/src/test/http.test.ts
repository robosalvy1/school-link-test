import assert from "node:assert/strict";
import test from "node:test";
import { RateLimiter } from "../http.js";

test("rate limiter blocks after the configured request budget", () => {
  const limiter = new RateLimiter(1_000, 2);
  assert.equal(limiter.take("client", 0).allowed, true);
  assert.equal(limiter.take("client", 1).allowed, true);
  assert.equal(limiter.take("client", 2).allowed, false);
  assert.equal(limiter.take("client", 1_001).allowed, true);
});
