import assert from "node:assert/strict";
import test from "node:test";

import { solvePuzzle } from "../src/solver.mjs";
import { cellId } from "../src/model.mjs";

test("solver finds the known shortest route on a small board", () => {
  const board = {
    size: 4,
    wallsH: new Set(),
    wallsV: new Set(["1,1"]),
    blocked: new Set(),
    target: { color: "red", cell: cellId(0, 3), symbol: "star" },
  };
  const robots = {
    red: cellId(0, 0),
    blue: cellId(2, 1),
    green: cellId(3, 3),
    yellow: cellId(1, 3),
  };

  const solution = solvePuzzle(board, robots, {
    maxDepth: 6,
    maxStates: 10_000,
  });

  assert.equal(solution.status, "solved");
  assert.equal(solution.depth, 1);
  assert.deepEqual(solution.moves.map((move) => `${move.robot}:${move.dir}`), ["red:down"]);
});

test("solver reports capped when the search state limit is too small", () => {
  const board = {
    size: 6,
    wallsH: new Set(),
    wallsV: new Set(),
    blocked: new Set(),
    target: { color: "red", cell: cellId(3, 3), symbol: "star" },
  };
  const robots = {
    red: cellId(0, 0),
    blue: cellId(5, 1),
    green: cellId(1, 5),
    yellow: cellId(5, 5),
  };

  const solution = solvePuzzle(board, robots, {
    maxDepth: 12,
    maxStates: 1,
  });

  assert.equal(solution.status, "capped");
  assert.equal(solution.capped, true);
});
