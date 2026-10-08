import assert from "node:assert/strict";
import test from "node:test";

import {
  createGameHistory,
  historyControls,
  historyMoves,
  reduceGameHistory,
  restoreGameHistory,
  serializeGameHistory,
} from "../src/history.mjs";
import { cellId } from "../src/model.mjs";

function makePuzzle() {
  return {
    board: {
      size: 4,
      wallsH: new Set(),
      wallsV: new Set(),
      blocked: new Set(),
      target: { color: "red", cell: cellId(0, 3), symbol: "star" },
    },
    robots: {
      red: cellId(0, 0),
      blue: cellId(2, 1),
      green: cellId(3, 3),
      yellow: cellId(1, 3),
    },
    seed: 77,
    solutionDepth: 1,
  };
}

test("undo and redo traverse multiple moves and keep the matching selection", () => {
  let state = createGameHistory(makePuzzle());
  state = reduceGameHistory(state, { type: "select", robot: "blue" });
  state = reduceGameHistory(state, { type: "move", dir: "up" });
  state = reduceGameHistory(state, { type: "select", robot: "green" });
  state = reduceGameHistory(state, { type: "move", dir: "left" });
  const finalRobots = state.game.robots;

  state = reduceGameHistory(state, { type: "undo" });
  assert.equal(state.game.moveCount, 1);
  assert.equal(state.selectedRobot, "green");
  state = reduceGameHistory(state, { type: "undo" });
  assert.equal(state.game.moveCount, 0);
  assert.equal(state.selectedRobot, "blue");
  state = reduceGameHistory(state, { type: "redo" });
  state = reduceGameHistory(state, { type: "redo" });

  assert.equal(state.game.moveCount, 2);
  assert.deepEqual(state.game.robots, finalRobots);
  assert.equal(state.selectedRobot, "green");
});

test("history boundaries are identity no-ops", () => {
  const initial = createGameHistory(makePuzzle());
  assert.equal(reduceGameHistory(initial, { type: "undo" }), initial);
  assert.equal(reduceGameHistory(initial, { type: "redo" }), initial);
});

test("a move after undo clears the redo branch", () => {
  let state = createGameHistory(makePuzzle());
  state = reduceGameHistory(state, { type: "select", robot: "blue" });
  state = reduceGameHistory(state, { type: "move", dir: "up" });
  state = reduceGameHistory(state, { type: "undo" });
  assert.equal(historyControls(state).canRedo, true);
  state = reduceGameHistory(state, { type: "move", dir: "down" });
  assert.equal(historyControls(state).canRedo, false);
});

test("reset keeps the seed and board while clearing both history stacks", () => {
  let state = createGameHistory(makePuzzle());
  const board = state.game.board;
  state = reduceGameHistory(state, { type: "select", robot: "blue" });
  state = reduceGameHistory(state, { type: "move", dir: "up" });
  state = reduceGameHistory(state, { type: "undo" });
  state = reduceGameHistory(state, { type: "reset" });

  assert.equal(state.game.seed, 77);
  assert.equal(state.game.board, board);
  assert.deepEqual(state.game.robots, makePuzzle().robots);
  assert.equal(state.game.moveCount, 0);
  assert.equal(state.past.length, 0);
  assert.equal(state.future.length, 0);
});

test("win, undo, and redo restore the correct status without another move", () => {
  let state = createGameHistory(makePuzzle());
  state = reduceGameHistory(state, { type: "move", dir: "down" });
  assert.equal(state.game.status, "won");
  assert.equal(state.game.moveCount, 1);
  state = reduceGameHistory(state, { type: "undo" });
  assert.equal(state.game.status, "playing");
  assert.equal(state.game.moveCount, 0);
  state = reduceGameHistory(state, { type: "redo" });
  assert.equal(state.game.status, "won");
  assert.equal(state.game.moveCount, 1);
});

test("history exposes completed and pending move tracks", () => {
  let state = createGameHistory(makePuzzle());
  state = reduceGameHistory(state, { type: "select", robot: "blue" });
  state = reduceGameHistory(state, { type: "move", dir: "up" });
  state = reduceGameHistory(state, { type: "select", robot: "green" });
  state = reduceGameHistory(state, { type: "move", dir: "left" });
  state = reduceGameHistory(state, { type: "undo" });

  const moves = historyMoves(state);
  assert.deepEqual(moves.done.map(({ robot, dir }) => [robot, dir]), [["blue", "up"]]);
  assert.deepEqual(moves.pending.map(({ robot, dir }) => [robot, dir]), [["green", "left"]]);
});

test("session history round-trips moves, redo, selection, and win state safely", () => {
  const puzzle = makePuzzle();
  let state = createGameHistory(puzzle);
  state = reduceGameHistory(state, { type: "select", robot: "blue" });
  state = reduceGameHistory(state, { type: "move", dir: "up" });
  state = reduceGameHistory(state, { type: "select", robot: "green" });
  state = reduceGameHistory(state, { type: "move", dir: "left" });
  state = reduceGameHistory(state, { type: "undo" });
  state = reduceGameHistory(state, { type: "select", robot: "yellow" });

  const restored = restoreGameHistory(puzzle, serializeGameHistory(state));
  assert.ok(restored);
  assert.deepEqual(restored.game.robots, state.game.robots);
  assert.equal(restored.game.moveCount, 1);
  assert.equal(restored.selectedRobot, "yellow");
  assert.equal(historyControls(restored).canRedo, true);
  const redone = reduceGameHistory(restored, { type: "redo" });
  assert.equal(redone.game.moveCount, 2);
  assert.equal(redone.selectedRobot, "green");
});

test("invalid or tampered stored history is rejected", () => {
  const puzzle = makePuzzle();
  const stored = serializeGameHistory(createGameHistory(puzzle));
  assert.equal(restoreGameHistory(puzzle, { ...stored, seed: 88 }), null);
  assert.equal(restoreGameHistory(puzzle, { ...stored, past: [{ robot: "red", dir: "sideways", from: "0,0", to: "0,3" }] }), null);
});

test("hundreds of moves retain undo/redo and session restoration", () => {
  const puzzle = makePuzzle();
  let state = createGameHistory(puzzle);
  state = reduceGameHistory(state, { type: "select", robot: "blue" });
  for (let index = 0; index < 300; index += 1) {
    state = reduceGameHistory(state, { type: "move", dir: index % 2 === 0 ? "up" : "down" });
  }
  assert.equal(state.game.moveCount, 300);
  assert.equal(historyMoves(state).done.length, 300);
  const restored = restoreGameHistory(puzzle, serializeGameHistory(state));
  assert.ok(restored);
  assert.equal(restored.game.moveCount, 300);
  for (let i = 0; i < 155; i += 1) state = reduceGameHistory(state, { type: "undo" });
  assert.equal(state.game.moveCount, 145);
  assert.equal(historyMoves(state).pending.length, 155);
  for (let i = 0; i < 155; i += 1) state = reduceGameHistory(state, { type: "redo" });
  assert.equal(state.game.moveCount, 300);
  assert.deepEqual(state.game.robots, restored.game.robots);
});
