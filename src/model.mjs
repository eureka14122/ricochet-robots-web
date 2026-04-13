export const ROBOTS = Object.freeze(["red", "blue", "green", "yellow"]);

export const ROBOT_LABELS = Object.freeze({
  red: "红",
  blue: "蓝",
  green: "绿",
  yellow: "黄",
});

export const DIRECTIONS = Object.freeze({
  up: "up",
  down: "down",
  left: "left",
  right: "right",
});

export const DIRECTION_LABELS = Object.freeze({
  up: "上",
  down: "下",
  left: "左",
  right: "右",
});

export const DIRECTION_DELTAS = Object.freeze({
  up: Object.freeze({ dx: 0, dy: -1 }),
  down: Object.freeze({ dx: 0, dy: 1 }),
  left: Object.freeze({ dx: -1, dy: 0 }),
  right: Object.freeze({ dx: 1, dy: 0 }),
});

/**
 * @typedef {{ color: string, cell: string, symbol: string }} Target
 * @typedef {{ size: number, wallsH: Set<string>, wallsV: Set<string>, blocked: Set<string>, target: Target }} Board
 * @typedef {{ red: string, blue: string, green: string, yellow: string }} RobotState
 * @typedef {{ robot: string, dir: string, from: string, to: string }} Move
 * @typedef {{ board: Board, robots: RobotState, seed: number, moveCount: number, history: Move[], status: "playing" | "won" }} GameState
 * @typedef {{ status: "solved" | "unsolved" | "capped", depth: number, moves: Move[], explored: number, elapsedMs: number, capped: boolean }} SolverResult
 */

export function cellId(x, y) {
  return `${x},${y}`;
}

export function parseCell(cell) {
  const [x, y] = cell.split(",").map(Number);
  return { x, y };
}

export function inBounds(board, x, y) {
  return x >= 0 && y >= 0 && x < board.size && y < board.size;
}

export function cloneRobots(robots) {
  return {
    red: robots.red,
    blue: robots.blue,
    green: robots.green,
    yellow: robots.yellow,
  };
}

export function cloneBoard(board) {
  return {
    size: board.size,
    wallsH: new Set(board.wallsH),
    wallsV: new Set(board.wallsV),
    blocked: new Set(board.blocked),
    target: { ...board.target },
  };
}

export function serializeRobots(robots) {
  return ROBOTS.map((color) => `${color}:${robots[color]}`).join("|");
}

export function serializeBoard(board) {
  return JSON.stringify({
    size: board.size,
    wallsH: [...board.wallsH].sort(),
    wallsV: [...board.wallsV].sort(),
    blocked: [...board.blocked].sort(),
    target: board.target,
  });
}

export function makePrng(seed) {
  let state = seed >>> 0;
  return function next() {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(prng, items) {
  return items[Math.floor(prng() * items.length)];
}

export function normalizeSeed(seed = Date.now()) {
  return Math.abs(Number.parseInt(String(seed), 10) || 1) >>> 0;
}
