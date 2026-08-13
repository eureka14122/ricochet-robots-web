const MAX_SEED = 0xffff_ffff;
const MAX_SEED_TEXT_LENGTH = 10;
const MAX_SEARCH_LENGTH = 1024;

export function parseSeed(input) {
  const text = typeof input === "number" && Number.isSafeInteger(input)
    ? String(input)
    : typeof input === "string"
      ? input.trim()
      : "";

  if (!text || text.length > MAX_SEED_TEXT_LENGTH || !/^\d+$/.test(text)) {
    return null;
  }

  const seed = Number(text);
  return Number.isSafeInteger(seed) && seed >= 1 && seed <= MAX_SEED ? seed : null;
}

export function normalizeSeed(input, fallback = 1) {
  return parseSeed(input) ?? parseSeed(fallback) ?? 1;
}

export function resolveSeedFromSearch(search, fallback) {
  const safeFallback = normalizeSeed(fallback);
  if (typeof search !== "string" || search.length > MAX_SEARCH_LENGTH) {
    return { seed: safeFallback, fromUrl: false, needsCanonicalUrl: true };
  }

  const params = new URLSearchParams(search);
  const rawSeed = params.get("seed");
  const parsed = parseSeed(rawSeed);
  const canonicalSearch = `?seed=${parsed ?? safeFallback}`;
  return {
    seed: parsed ?? safeFallback,
    fromUrl: parsed !== null,
    needsCanonicalUrl: search !== canonicalSearch,
  };
}

export function createPuzzleUrl(href, seed) {
  const url = new URL(href);
  url.search = `?seed=${normalizeSeed(seed)}`;
  url.hash = "";
  return url;
}

export function createRandomSeed(previousSeed, sources = {}) {
  const cryptoObject = sources.crypto ?? globalThis.crypto;
  const now = sources.now ?? Date.now;
  const random = sources.random ?? Math.random;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    let candidate;
    if (cryptoObject?.getRandomValues) {
      const values = new Uint32Array(1);
      cryptoObject.getRandomValues(values);
      candidate = values[0] || 1;
    } else {
      candidate = ((now() >>> 0) ^ Math.floor(random() * MAX_SEED)) >>> 0;
      if (candidate === 0) candidate = 1;
    }
    if (candidate !== previousSeed) return candidate;
  }

  return previousSeed === MAX_SEED ? 1 : normalizeSeed(previousSeed) + 1;
}

export const seedLimits = Object.freeze({
  max: MAX_SEED,
  maxTextLength: MAX_SEED_TEXT_LENGTH,
  maxSearchLength: MAX_SEARCH_LENGTH,
});
