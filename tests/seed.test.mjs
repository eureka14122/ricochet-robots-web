import assert from "node:assert/strict";
import test from "node:test";

import {
  createPuzzleUrl,
  createRandomSeed,
  normalizeSeed,
  parseSeed,
  resolveSeedFromSearch,
  seedLimits,
} from "../src/seed.mjs";

test("seed parser accepts only bounded decimal uint32 values", () => {
  assert.equal(parseSeed("0001024"), 1024);
  assert.equal(parseSeed(seedLimits.max), seedLimits.max);
  for (const invalid of [undefined, "", "0", "-1", "12x", "1.5", "4294967296", "9".repeat(1000)]) {
    assert.equal(parseSeed(invalid), null);
  }
  assert.equal(normalizeSeed("invalid", 42), 42);
});

test("URL seed round-trips through a minimal canonical permalink", () => {
  const url = createPuzzleUrl("https://example.test/game?old=1#debug", 1024);
  const resolved = resolveSeedFromSearch(url.search, 9);
  assert.equal(url.href, "https://example.test/game?seed=1024");
  assert.deepEqual(resolved, { seed: 1024, fromUrl: true, needsCanonicalUrl: false });
});

test("missing, invalid, extra, and oversized query state falls back safely", () => {
  assert.deepEqual(resolveSeedFromSearch("", 55), { seed: 55, fromUrl: false, needsCanonicalUrl: true });
  assert.deepEqual(resolveSeedFromSearch("?seed=nope", 55), { seed: 55, fromUrl: false, needsCanonicalUrl: true });
  assert.deepEqual(resolveSeedFromSearch("?seed=0055&extra=x", 9), { seed: 55, fromUrl: true, needsCanonicalUrl: true });
  const oversized = `?seed=12&junk=${"x".repeat(seedLimits.maxSearchLength)}`;
  assert.deepEqual(resolveSeedFromSearch(oversized, 55), { seed: 55, fromUrl: false, needsCanonicalUrl: true });
});

test("new seed generation avoids the previous seed", () => {
  const crypto = { getRandomValues(values) { values[0] = 12; return values; } };
  assert.equal(createRandomSeed(11, { crypto }), 12);
  assert.equal(createRandomSeed(12, { crypto }), 13);
});
