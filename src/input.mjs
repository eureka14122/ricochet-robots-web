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

export function getKeyCommand(input) {
  const event = typeof input === "string" ? { key: input } : input;
  const key = event?.key ?? "";
  const commandModifier = Boolean(event?.ctrlKey || event?.metaKey);

  if (event?.altKey) return { type: "none" };
  if (commandModifier) {
    if (key.toLowerCase() === "z") {
      return { type: "action", action: event?.shiftKey ? "redo" : "undo" };
    }
    if (key.toLowerCase() === "y" && !event?.shiftKey) {
      return { type: "action", action: "redo" };
    }
    return { type: "none" };
  }

  if (ROBOT_BY_KEY[key]) {
    return { type: "select", robot: ROBOT_BY_KEY[key] };
  }
  if (key === "S") {
    return { type: "action", action: "solve" };
  }
  if (DIRECTION_BY_KEY[key]) {
    return { type: "move", dir: DIRECTION_BY_KEY[key] };
  }
  if (key === "r" || key === "R") {
    return { type: "action", action: "reset" };
  }
  if (key === "u") {
    return { type: "action", action: "undo" };
  }
  if (key === "U") {
    return { type: "action", action: "redo" };
  }
  if (key === "n" || key === "N") {
    return { type: "action", action: "new" };
  }
  if (key === "h" || key === "H") {
    return { type: "action", action: "hint" };
  }
  return { type: "none" };
}

export function getSwipeDirection(gesture, options = {}) {
  const minDistance = options.minDistance ?? 28;
  const maxDuration = options.maxDuration ?? 1_200;
  const axisBias = options.axisBias ?? 1.15;
  const dx = gesture.endX - gesture.startX;
  const dy = gesture.endY - gesture.startY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (gesture.durationMs > maxDuration || Math.max(absX, absY) < minDistance) return null;
  if (absX > absY * axisBias) return dx > 0 ? DIRECTIONS.right : DIRECTIONS.left;
  if (absY > absX * axisBias) return dy > 0 ? DIRECTIONS.down : DIRECTIONS.up;
  return null;
}

export function isEditableTarget(target) {
  if (!target || typeof target !== "object") return false;
  const tagName = String(target.tagName ?? "").toLowerCase();
  return target.isContentEditable === true
    || tagName === "input"
    || tagName === "textarea"
    || tagName === "select";
}
