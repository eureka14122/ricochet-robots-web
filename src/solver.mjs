import { getSlideDestination } from "./engine.mjs";
import { cloneRobots, DIRECTIONS, ROBOTS, serializeRobots } from "./model.mjs";

const DEFAULT_MAX_DEPTH = 12;
const DEFAULT_MAX_STATES = 100_000;

export function solvePuzzle(board, robots, options = {}) {
  const startTime = Date.now();
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxStates = options.maxStates ?? DEFAULT_MAX_STATES;
  const startRobots = cloneRobots(robots);
  const startKey = serializeRobots(startRobots);
  const target = board.target;

  if (startRobots[target.color] === target.cell) {
    return result("solved", 0, [], 1, startTime, false);
  }

  const queue = [{ key: startKey, robots: startRobots, depth: 0 }];
  const visited = new Set([startKey]);
  const parents = new Map();
  let head = 0;

  while (head < queue.length) {
    const current = queue[head];
    head += 1;

    if (current.depth >= maxDepth) {
      continue;
    }

    for (const robot of ROBOTS) {
      for (const dir of Object.values(DIRECTIONS)) {
        const from = current.robots[robot];
        const to = getSlideDestination(board, current.robots, robot, dir);
        if (from === to) continue;

        const nextRobots = cloneRobots(current.robots);
        nextRobots[robot] = to;
        const nextKey = serializeRobots(nextRobots);
        if (visited.has(nextKey)) continue;

        if (visited.size >= maxStates) {
          return result("capped", -1, [], visited.size, startTime, true);
        }

        const move = { robot, dir, from, to };
        visited.add(nextKey);
        parents.set(nextKey, { parentKey: current.key, move });

        if (nextRobots[target.color] === target.cell) {
          return result("solved", current.depth + 1, reconstruct(nextKey, parents), visited.size, startTime, false);
        }

        queue.push({ key: nextKey, robots: nextRobots, depth: current.depth + 1 });
      }
    }
  }

  return result("unsolved", -1, [], visited.size, startTime, false);
}

function reconstruct(endKey, parents) {
  const moves = [];
  let cursor = endKey;
  while (parents.has(cursor)) {
    const entry = parents.get(cursor);
    moves.push(entry.move);
    cursor = entry.parentKey;
  }
  return moves.reverse();
}

function result(status, depth, moves, explored, startTime, capped) {
  return {
    status,
    depth,
    moves,
    explored,
    elapsedMs: Date.now() - startTime,
    capped,
  };
}
