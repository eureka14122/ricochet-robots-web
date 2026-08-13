import { cellId, makePrng, pick, ROBOTS } from "./model.mjs";
import { normalizeSeed } from "./seed.mjs";

const SIZE = 16;
const TARGET_SYMBOLS = ["star", "moon", "gear", "bolt"];

// These are puzzles produced by the original generator and certified by the
// solver. Mirrors and color relabelings preserve every legal move and optimal
// depth, so runtime generation never needs to run a blocking BFS.
const TEMPLATES = Object.freeze([
  template(1024, 4, "1,1 1,3 10,13 10,9 11,2 12,6 13,1 2,12 3,1 4,6 5,8 6,6 8,9", "10,10 14,6 4,2 4,4 4,7 5,11 8,12 8,6", "red", "10,10", "star", ["2,2", "13,3", "4,14", "13,14"]),
  template(20260413, 7, "10,4 13,10 13,12 13,5 2,9 3,2 3,4 5,13 5,3 7,9 9,4", "1,8 10,7 13,11 13,12 14,7 4,10 5,14 5,8 6,12 6,4", "blue", "5,10", "bolt", ["13,2", "2,3", "11,14", "2,14"]),
  template(1, 5, "13,10 13,12 4,6 6,10 7,9", "11,10 11,3 11,7 12,12 14,12 2,10 2,9 4,10 5,3 5,9 6,12 7,14 7,5 7,6 8,4 9,5", "blue", "5,10", "bolt", ["13,2", "2,3", "11,14", "2,14"]),
  template(2, 7, "1,5 12,1 12,14 13,5 2,2 2,8 3,9 7,4 8,5 9,6", "1,8 10,2 10,5 12,10 12,7 13,6 2,11 3,11 4,1 5,8 8,3", "blue", "10,5", "gear", ["2,13", "13,12", "4,1", "13,1"]),
  template(3, 7, "11,1 12,1 14,5 2,12 2,6 3,12 3,7 4,10 7,3 8,14 8,9 9,2", "10,10 10,3 11,2 12,9 13,12 3,5 4,3 4,7 5,11 6,10 8,12", "red", "10,10", "gear", ["2,2", "13,3", "4,14", "13,14"]),
  template(4, 6, "1,11 1,7 10,8 11,2 12,4 13,12 6,11 6,5 7,11 7,9 8,2 8,3 9,10", "1,9 12,13 14,7 3,10 4,10 4,2 5,11 6,12 8,11 8,5", "blue", "5,10", "gear", ["13,2", "2,3", "11,14", "2,14"]),
  template(5, 7, "10,2 13,11 13,2 13,4 4,1 4,3 5,11 5,5 5,6 7,5 9,1 9,5", "11,10 3,4 4,5 4,6 4,9 6,3 7,14 9,11", "red", "5,5", "moon", ["13,13", "2,12", "11,1", "2,1"]),
  template(6, 7, "1,10 10,4 13,13 2,12 4,6 4,9 8,3 8,9 9,9", "10,10 12,13 13,11 13,7 14,3 14,8 2,6 3,2 7,10 7,4 8,12 9,9", "yellow", "10,10", "moon", ["2,2", "13,3", "4,14", "13,14"]),
]);

export function generatePuzzle(seedInput = Date.now()) {
  const seed = normalizeSeed(seedInput);
  const exactIndex = TEMPLATES.findIndex(({ sourceSeed }) => sourceSeed === seed);
  const variant = exactIndex >= 0 ? identityVariant(exactIndex) : createVariant(seed);
  const source = TEMPLATES[variant.templateIndex];
  const colorMap = new Map(ROBOTS.map((color, index) => [color, variant.colors[index]]));
  const robots = {};

  for (const color of ROBOTS) {
    robots[colorMap.get(color)] = transformCell(source.robots[color], variant.mirrorX, variant.mirrorY);
  }

  return {
    seed,
    solutionDepth: source.solutionDepth,
    board: {
      size: SIZE,
      wallsH: new Set(source.wallsH.map((wall) => transformWallH(wall, variant.mirrorX, variant.mirrorY))),
      wallsV: new Set(source.wallsV.map((wall) => transformWallV(wall, variant.mirrorX, variant.mirrorY))),
      blocked: new Set(source.blocked.map((cell) => transformCell(cell, variant.mirrorX, variant.mirrorY))),
      target: {
        color: colorMap.get(source.target.color),
        cell: transformCell(source.target.cell, variant.mirrorX, variant.mirrorY),
        symbol: variant.symbol,
      },
    },
    robots,
  };
}

function identityVariant(templateIndex) {
  return {
    templateIndex,
    mirrorX: false,
    mirrorY: false,
    colors: [...ROBOTS],
    symbol: TEMPLATES[templateIndex].target.symbol,
  };
}

function createVariant(seed) {
  const prng = makePrng(seed);
  return {
    templateIndex: Math.floor(prng() * TEMPLATES.length),
    mirrorX: prng() > 0.5,
    mirrorY: prng() > 0.5,
    colors: shuffled(ROBOTS, prng),
    symbol: pick(prng, TARGET_SYMBOLS),
  };
}

function template(sourceSeed, solutionDepth, wallsH, wallsV, targetColor, targetCell, targetSymbol, robotCells) {
  return Object.freeze({
    sourceSeed,
    solutionDepth,
    wallsH: wallsH.split(" "),
    wallsV: wallsV.split(" "),
    blocked: ["7,7", "7,8", "8,7", "8,8"],
    target: { color: targetColor, cell: targetCell, symbol: targetSymbol },
    robots: Object.fromEntries(ROBOTS.map((color, index) => [color, robotCells[index]])),
  });
}

function shuffled(items, prng) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(prng() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
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
