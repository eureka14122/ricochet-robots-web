import assert from "node:assert/strict";
import test from "node:test";

import { createGame, moveRobot, undoMove, hasWon } from "../src/engine.mjs";
import { cellId, DIRECTIONS } from "../src/model.mjs";

function makeBoard() {
  return {
    size: 6,
    wallsH: new Set(["1,2", "4,5"]),
    wallsV: new Set(["3,1"]),
    blocked: new Set([cellId(2, 2)]),
    target: { color: "red", cell: cellId(3, 3), symbol: "star" },
  };
}

test("red robot slides until the cell before a wall", () => {
  const game = createGame({
    board: makeBoard(),
    robots: {
      red: cellId(1, 0),
      blue: cellId(5, 5),
      green: cellId(0, 5),
      yellow: cellId(5, 0),
    },
    seed: 7,
  });

  const result = moveRobot(game, "red", DIRECTIONS.down);

  assert.equal(result.moved, true);
  assert.equal(result.game.robots.red, cellId(1, 2));
  assert.equal(result.game.moveCount, 1);
});

test("robot slides until the cell before another robot", () => {
  const game = createGame({
    board: makeBoard(),
    robots: {
      red: cellId(0, 0),
      blue: cellId(0, 3),
      green: cellId(5, 5),
      yellow: cellId(5, 0),
    },
    seed: 8,
  });

  const result = moveRobot(game, "red", DIRECTIONS.down);

  assert.equal(result.moved, true);
  assert.equal(result.game.robots.red, cellId(0, 2));
  assert.equal(result.game.moveCount, 1);
});

test("blocked moves do not count as moves", () => {
  const game = createGame({
    board: makeBoard(),
    robots: {
      red: cellId(0, 0),
      blue: cellId(0, 3),
      green: cellId(5, 5),
      yellow: cellId(5, 0),
    },
    seed: 9,
  });

  const result = moveRobot(game, "red", DIRECTIONS.left);

  assert.equal(result.moved, false);
  assert.equal(result.game, game);
  assert.equal(result.game.moveCount, 0);
});

test("reaching the target marks the puzzle as won", () => {
  const game = createGame({
    board: {
      ...makeBoard(),
      wallsH: new Set([...makeBoard().wallsH, "0,3"]),
      target: { color: "red", cell: cellId(0, 3), symbol: "star" },
    },
    robots: {
      red: cellId(0, 0),
      blue: cellId(5, 5),
      green: cellId(4, 5),
      yellow: cellId(5, 0),
    },
    seed: 10,
  });

  const result = moveRobot(game, "red", DIRECTIONS.down);

  assert.equal(hasWon(result.game), true);
  assert.equal(result.game.status, "won");
});

test("a won game rejects further moves", () => {
  const won = createGame({
    board: {
      ...makeBoard(),
      target: { color: "red", cell: cellId(0, 0), symbol: "star" },
    },
    robots: {
      red: cellId(0, 0),
      blue: cellId(5, 5),
      green: cellId(4, 5),
      yellow: cellId(5, 0),
    },
    seed: 12,
  });

  assert.equal(won.status, "won");

  const result = moveRobot(won, "blue", DIRECTIONS.left);

  assert.equal(result.moved, false);
  assert.equal(result.game, won);
});

test("createGame carries solutionDepth through to game state", () => {
  const game = createGame({
    board: makeBoard(),
    robots: {
      red: cellId(1, 0),
      blue: cellId(5, 5),
      green: cellId(0, 5),
      yellow: cellId(5, 0),
    },
    seed: 13,
    solutionDepth: 7,
  });

  assert.equal(game.solutionDepth, 7);
});

test("undo restores the previous robot positions and move count", () => {
  const game = createGame({
    board: makeBoard(),
    robots: {
      red: cellId(1, 0),
      blue: cellId(5, 5),
      green: cellId(0, 5),
      yellow: cellId(5, 0),
    },
    seed: 11,
  });

  const moved = moveRobot(game, "red", DIRECTIONS.down).game;
  const undone = undoMove(moved);

  assert.equal(undone.robots.red, cellId(1, 0));
  assert.equal(undone.moveCount, 0);
  assert.equal(undone.history.length, 0);
  assert.equal(undone.status, "playing");
});
