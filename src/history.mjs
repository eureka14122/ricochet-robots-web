import { createGame, moveRobot, resetGame } from "./engine.mjs";
import { DIRECTIONS, ROBOTS } from "./model.mjs";

const HISTORY_VERSION = 1;
const MAX_STORED_MOVES = 500;

export function createGameHistory(puzzle) {
  return {
    game: createGame(puzzle),
    selectedRobot: puzzle.board.target.color,
    past: [],
    future: [],
  };
}

export function reduceGameHistory(state, action) {
  if (action.type === "select") {
    if (!ROBOTS.includes(action.robot) || action.robot === state.selectedRobot) return state;
    return { ...state, selectedRobot: action.robot };
  }

  if (action.type === "move") {
    const result = moveRobot(state.game, state.selectedRobot, action.dir);
    if (!result.moved) return state;
    return {
      game: result.game,
      selectedRobot: state.selectedRobot,
      past: [...state.past, entry(state, result.move)],
      future: [],
    };
  }

  if (action.type === "undo") {
    if (!state.past.length) return state;
    const previous = state.past.at(-1);
    return {
      ...previous.snapshot,
      past: state.past.slice(0, -1),
      future: [entry(state, previous.move), ...state.future],
    };
  }

  if (action.type === "redo") {
    if (!state.future.length) return state;
    const next = state.future[0];
    return {
      ...next.snapshot,
      past: [...state.past, entry(state, next.move)],
      future: state.future.slice(1),
    };
  }

  if (action.type === "reset") {
    return {
      game: resetGame(state.game),
      selectedRobot: state.game.board.target.color,
      past: [],
      future: [],
    };
  }

  return state;
}

export function historyControls(state) {
  return {
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    canReset: state.game.moveCount > 0 || state.past.length > 0 || state.future.length > 0,
  };
}

export function historyMoves(state) {
  return {
    done: state.past.map(({ move }) => move),
    pending: state.future.map(({ move }) => move),
  };
}

export function serializeGameHistory(state) {
  const moves = historyMoves(state);
  return {
    version: HISTORY_VERSION,
    seed: state.game.seed,
    selectedRobot: state.selectedRobot,
    past: moves.done.map(serializeMove),
    future: moves.pending.map(serializeMove),
  };
}

export function restoreGameHistory(puzzle, stored) {
  if (!isStoredHistory(stored, puzzle.seed)) return null;

  let state = createGameHistory(puzzle);
  for (const move of stored.past) {
    const next = replayMove(state, move);
    if (!next) return null;
    state = next;
  }

  const presentSelection = stored.selectedRobot;
  for (const move of stored.future) {
    const next = replayMove(state, move);
    if (!next) return null;
    state = next;
  }
  for (let index = 0; index < stored.future.length; index += 1) {
    state = reduceGameHistory(state, { type: "undo" });
  }

  return reduceGameHistory(state, { type: "select", robot: presentSelection });
}

function snapshot(state) {
  return { game: state.game, selectedRobot: state.selectedRobot };
}

function entry(state, move) {
  return { snapshot: snapshot(state), move };
}

function serializeMove({ robot, dir, from, to }) {
  return { robot, dir, from, to };
}

function replayMove(state, recorded) {
  let next = reduceGameHistory(state, { type: "select", robot: recorded.robot });
  const beforePastLength = next.past.length;
  next = reduceGameHistory(next, { type: "move", dir: recorded.dir });
  if (next.past.length !== beforePastLength + 1) return null;
  const actual = next.past.at(-1).move;
  return actual.from === recorded.from && actual.to === recorded.to ? next : null;
}

function isStoredHistory(stored, seed) {
  if (!stored || typeof stored !== "object" || stored.version !== HISTORY_VERSION || stored.seed !== seed) {
    return false;
  }
  if (!ROBOTS.includes(stored.selectedRobot) || !Array.isArray(stored.past) || !Array.isArray(stored.future)) {
    return false;
  }
  if (stored.past.length + stored.future.length > MAX_STORED_MOVES) return false;
  return [...stored.past, ...stored.future].every(isStoredMove);
}

function isStoredMove(move) {
  return move
    && typeof move === "object"
    && ROBOTS.includes(move.robot)
    && Object.values(DIRECTIONS).includes(move.dir)
    && /^\d{1,2},\d{1,2}$/.test(move.from)
    && /^\d{1,2},\d{1,2}$/.test(move.to);
}
