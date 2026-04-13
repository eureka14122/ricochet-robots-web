import {
  cloneRobots,
  DIRECTIONS,
  DIRECTION_DELTAS,
  inBounds,
  parseCell,
  cellId,
} from "./model.mjs";

export function createGame({ board, robots, seed }) {
  const game = {
    board,
    robots: cloneRobots(robots),
    seed,
    moveCount: 0,
    history: [],
    status: "playing",
  };
  return hasWon(game) ? { ...game, status: "won" } : game;
}

export function hasWon(game) {
  const target = game.board.target;
  return game.robots[target.color] === target.cell;
}

export function wallBlocks(board, cell, dir) {
  const { x, y } = parseCell(cell);
  if (dir === DIRECTIONS.up) {
    return y === 0 || board.wallsH.has(cellId(x, y - 1));
  }
  if (dir === DIRECTIONS.down) {
    return y === board.size - 1 || board.wallsH.has(cellId(x, y));
  }
  if (dir === DIRECTIONS.left) {
    return x === 0 || board.wallsV.has(cellId(x - 1, y));
  }
  if (dir === DIRECTIONS.right) {
    return x === board.size - 1 || board.wallsV.has(cellId(x, y));
  }
  throw new Error(`Unknown direction: ${dir}`);
}

export function getSlideDestination(board, robots, robot, dir) {
  const delta = DIRECTION_DELTAS[dir];
  if (!delta) {
    throw new Error(`Unknown direction: ${dir}`);
  }

  const occupied = new Set(Object.entries(robots)
    .filter(([color]) => color !== robot)
    .map(([, cell]) => cell));

  let current = robots[robot];
  while (!wallBlocks(board, current, dir)) {
    const { x, y } = parseCell(current);
    const next = cellId(x + delta.dx, y + delta.dy);
    if (!inBounds(board, x + delta.dx, y + delta.dy)) break;
    if (board.blocked.has(next) || occupied.has(next)) break;
    current = next;
  }
  return current;
}

export function moveRobot(game, robot, dir) {
  if (game.status === "won") {
    return { moved: false, game };
  }

  const from = game.robots[robot];
  const to = getSlideDestination(game.board, game.robots, robot, dir);
  if (from === to) {
    return { moved: false, game };
  }

  const move = { robot, dir, from, to };
  const robots = cloneRobots(game.robots);
  robots[robot] = to;
  const nextGame = {
    ...game,
    robots,
    moveCount: game.moveCount + 1,
    history: [...game.history, move],
  };
  return {
    moved: true,
    move,
    game: {
      ...nextGame,
      status: hasWon(nextGame) ? "won" : "playing",
    },
  };
}

export function undoMove(game) {
  if (game.history.length === 0) {
    return game;
  }

  const history = game.history.slice(0, -1);
  const last = game.history.at(-1);
  const robots = cloneRobots(game.robots);
  robots[last.robot] = last.from;
  return {
    ...game,
    robots,
    history,
    moveCount: Math.max(0, game.moveCount - 1),
    status: "playing",
  };
}

export function resetGame(game) {
  let robots = cloneRobots(game.robots);
  for (let i = game.history.length - 1; i >= 0; i -= 1) {
    const move = game.history[i];
    robots[move.robot] = move.from;
  }
  return {
    ...game,
    robots,
    history: [],
    moveCount: 0,
    status: "playing",
  };
}
