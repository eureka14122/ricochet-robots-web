import { solvePuzzle } from "./solver.mjs";
import { cellId, makePrng, normalizeSeed, pick, ROBOTS } from "./model.mjs";

const SIZE = 16;
const BASE_WALLS_H = ["2,12", "8,9"];
const BASE_WALLS_V = ["8,12", "10,10"];
const BASE_BLOCKED = ["7,7", "8,7", "7,8", "8,8"];
const TARGET_SYMBOLS = ["star", "moon", "gear", "bolt"];

export function generatePuzzle(seedInput = Date.now()) {
  const seed = normalizeSeed(seedInput);
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const puzzle = buildCandidate(seed, attempt, true);
    const solution = solvePuzzle(puzzle.board, puzzle.robots, {
      maxDepth: 12,
      maxStates: 80_000,
    });
    if (solution.status === "solved" && solution.depth >= 4 && solution.depth <= 12) {
      return { ...puzzle, solutionDepth: solution.depth };
    }
  }

  const fallback = buildCandidate(seed, 0, false);
  const solution = solvePuzzle(fallback.board, fallback.robots, {
    maxDepth: 12,
    maxStates: 80_000,
  });
  if (solution.status !== "solved" || solution.depth < 4 || solution.depth > 12) {
    throw new Error("Generator fallback puzzle is not valid");
  }
  return { ...fallback, solutionDepth: solution.depth };
}

function buildCandidate(seed, attempt, addNoise) {
  const prng = makePrng(seed + attempt * 10_007);
  const mirrorX = prng() > 0.5;
  const mirrorY = prng() > 0.5;
  const wallsH = new Set(BASE_WALLS_H.map((wall) => transformWallH(wall, mirrorX, mirrorY)));
  const wallsV = new Set(BASE_WALLS_V.map((wall) => transformWallV(wall, mirrorX, mirrorY)));
  const blocked = new Set(BASE_BLOCKED.map((cell) => transformCell(cell, mirrorX, mirrorY)));

  if (addNoise) {
    addDecorativeWalls(wallsH, wallsV, blocked, prng);
  }

  const board = {
    size: SIZE,
    wallsH,
    wallsV,
    blocked,
    target: {
      color: pick(prng, ROBOTS),
      cell: transformCell(cellId(10, 10), mirrorX, mirrorY),
      symbol: pick(prng, TARGET_SYMBOLS),
    },
  };

  return {
    seed,
    board,
    robots: {
      red: transformCell(cellId(2, 2), mirrorX, mirrorY),
      blue: transformCell(cellId(13, 3), mirrorX, mirrorY),
      green: transformCell(cellId(4, 14), mirrorX, mirrorY),
      yellow: transformCell(cellId(13, 14), mirrorX, mirrorY),
    },
  };
}

function addDecorativeWalls(wallsH, wallsV, blocked, prng) {
  const protectedCells = new Set([
    cellId(2, 2),
    cellId(2, 12),
    cellId(8, 12),
    cellId(8, 10),
    cellId(10, 10),
    cellId(13, 3),
    cellId(4, 14),
    cellId(13, 14),
    ...blocked,
  ]);

  for (let i = 0; i < 20; i += 1) {
    const x = 1 + Math.floor(prng() * (SIZE - 2));
    const y = 1 + Math.floor(prng() * (SIZE - 2));
    const key = cellId(x, y);
    if (protectedCells.has(key)) continue;
    if (prng() > 0.5 && y < SIZE - 1) {
      wallsH.add(key);
    } else if (x < SIZE - 1) {
      wallsV.add(key);
    }
  }
}

function transformCell(cell, mirrorX, mirrorY) {
  const [x, y] = cell.split(",").map(Number);
  return cellId(mirrorX ? SIZE - 1 - x : x, mirrorY ? SIZE - 1 - y : y);
}

function transformWallH(wall, mirrorX, mirrorY) {
  const [x, y] = wall.split(",").map(Number);
  return cellId(mirrorX ? SIZE - 1 - x : x, mirrorY ? SIZE - 2 - y : y);
}

function transformWallV(wall, mirrorX, mirrorY) {
  const [x, y] = wall.split(",").map(Number);
  return cellId(mirrorX ? SIZE - 2 - x : x, mirrorY ? SIZE - 1 - y : y);
}
