import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  assert.equal(first.solutionDepth, second.solutionDepth);
});

test("different seeds produce valid distinct puzzles", () => {
  const first = generatePuzzle(1024);
  const second = generatePuzzle(20260413);
  assert.notEqual(
    `${serializeBoard(first.board)}|${serializeRobots(first.robots)}`,
    `${serializeBoard(second.board)}|${serializeRobots(second.robots)}`,
  );
  assert.ok(first.solutionDepth >= 4 && first.solutionDepth <= 12);
  assert.ok(second.solutionDepth >= 4 && second.solutionDepth <= 12);
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

test("all source templates retain their certified optimal depth", () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 1024, 20260413]) {
    const puzzle = generatePuzzle(seed);
    const solution = solvePuzzle(puzzle.board, puzzle.robots, {
      maxDepth: 12,
      maxStates: 80_000,
    });
    assert.equal(solution.status, "solved", `seed ${seed} must be solvable`);
    assert.equal(solution.depth, puzzle.solutionDepth, `seed ${seed} depth drifted`);
  }
});

test("seeded variants provide broad deterministic puzzle variety", () => {
  const fingerprints = new Set();
  for (let seed = 1; seed <= 1000; seed += 1) {
    const puzzle = generatePuzzle(seed);
    fingerprints.add(`${serializeBoard(puzzle.board)}|${serializeRobots(puzzle.robots)}`);
  }
  assert.ok(fingerprints.size >= 750, `expected at least 750 variants, saw ${fingerprints.size}`);
});

test("runtime generation does not import the breadth-first solver", () => {
  const source = readFileSync(new URL("../src/generator.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /from\s+["']\.\/solver\.mjs["']/);
});
