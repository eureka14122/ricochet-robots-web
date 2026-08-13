import { generatePuzzle } from "./generator.mjs";

self.addEventListener("message", (event) => {
  const { id, seed, restoreSession } = event.data;
  try {
    self.postMessage({ id, puzzle: generatePuzzle(seed), restoreSession });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
