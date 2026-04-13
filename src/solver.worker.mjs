import { solvePuzzle } from "./solver.mjs";

self.addEventListener("message", (event) => {
  const { id, board, robots, options } = event.data;
  try {
    const solution = solvePuzzle(board, robots, options);
    self.postMessage({ id, solution });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
