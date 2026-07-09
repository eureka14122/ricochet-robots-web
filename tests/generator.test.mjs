import assert from "node:assert/strict";
import test from "node:test";

import { generatePuzzle } from "../src/generator.mjs";
import { serializeBoard, serializeRobots } from "../src/model.mjs";
import { solvePuzzle } from "../src/solver.mjs";

test("same seed generates the same puzzle", () => {
  const first = generatePuzzle(20260413);
  const second = generatePuzzle(20260413);

  assert.equal(serializeBoard(first.board), serializeBoard(second.board));
  assert.equal(serializeRobots(first.robots), serializeRobots(second.robots));
  assert.deepEqual(first.board.target, second.board.target);
});

test("generated puzzle is solvable with a default-length solution", () => {
  const puzzle = generatePuzzle(1024);
  const solution = solvePuzzle(puzzle.board, puzzle.robots, {
    maxDepth: 12,
    maxStates: 80_000,
  });

  assert.equal(solution.status, "solved");
  assert.ok(solution.depth >= 4, `expected depth >= 4, got ${solution.depth}`);
  assert.ok(solution.depth <= 12, `expected depth <= 12, got ${solution.depth}`);
  assert.equal(solution.capped, false);
});

test("generated puzzle exposes its optimal depth as solutionDepth", () => {
  const puzzle = generatePuzzle(1024);
  const solution = solvePuzzle(puzzle.board, puzzle.robots, {
    maxDepth: 12,
    maxStates: 80_000,
  });

  assert.equal(puzzle.solutionDepth, solution.depth);
});

test("target color varies and the target robot never starts on the goal", () => {
  const colors = new Set();
  for (let seed = 1; seed <= 12; seed += 1) {
    const puzzle = generatePuzzle(seed);
    const { color, cell } = puzzle.board.target;
    assert.notEqual(
      puzzle.robots[color],
      cell,
      `seed ${seed} places the ${color} robot on its own target`,
    );
    colors.add(color);
  }
  assert.ok(colors.size >= 2, `expected multiple target colors, saw ${[...colors].join(", ")}`);
});
