import { DIRECTIONS } from "./model.mjs";

const ROBOT_BY_KEY = Object.freeze({
  "1": "red",
  "2": "blue",
  "3": "green",
  "4": "yellow",
});

const DIRECTION_BY_KEY = Object.freeze({
  ArrowUp: DIRECTIONS.up,
  w: DIRECTIONS.up,
  W: DIRECTIONS.up,
  ArrowDown: DIRECTIONS.down,
  s: DIRECTIONS.down,
  ArrowLeft: DIRECTIONS.left,
  a: DIRECTIONS.left,
  A: DIRECTIONS.left,
  ArrowRight: DIRECTIONS.right,
  d: DIRECTIONS.right,
  D: DIRECTIONS.right,
});

export function getKeyCommand(key) {
  if (ROBOT_BY_KEY[key]) {
    return { type: "select", robot: ROBOT_BY_KEY[key] };
  }
  if (key === "S") {
    return { type: "action", action: "solve" };
  }
  if (DIRECTION_BY_KEY[key]) {
    return { type: "move", dir: DIRECTION_BY_KEY[key] };
  }
  if (key === "z" || key === "Z") {
    return { type: "action", action: "undo" };
  }
  if (key === "r" || key === "R") {
    return { type: "action", action: "reset" };
  }
  if (key === "n" || key === "N") {
    return { type: "action", action: "new" };
  }
  if (key === "h" || key === "H") {
    return { type: "action", action: "hint" };
  }
  return { type: "none" };
}
