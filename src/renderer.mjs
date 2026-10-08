import {
  DIRECTION_LABELS,
  ROBOT_LABELS,
  ROBOTS,
  cellId,
  parseCell,
} from "./model.mjs";

const TARGET_GLYPHS = Object.freeze({
  star: "★",
  moon: "◆",
  gear: "✦",
  bolt: "▲",
});

export function targetGlyph(symbol) {
  return TARGET_GLYPHS[symbol] ?? "★";
}

export function formatMove(move) {
  return `${ROBOT_LABELS[move.robot] ?? move.robot} ${DIRECTION_LABELS[move.dir] ?? move.dir}`;
}

export function formatSolution(moves) {
  if (!moves.length) return "已经在目标上。";
  return moves.map((move, index) => `${index + 1}. ${formatMove(move)}`).join("  ");
}

export function renderBoard(boardEl, { game, selectedRobot, solutionMoves = [] }) {
  const robotsByCell = new Map(Object.entries(game.robots).map(([robot, cell]) => [cell, robot]));
  const firstHint = solutionMoves[0] ?? null;
  const cells = [];
  const documentObject = boardEl.ownerDocument;

  for (let y = 0; y < game.board.size; y += 1) {
    for (let x = 0; x < game.board.size; x += 1) {
      const cell = cellId(x, y);
      const classes = ["board-cell"];
      const robot = robotsByCell.get(cell);
      const isTarget = game.board.target.cell === cell;

      if (game.board.wallsH.has(cell)) classes.push("wall-bottom");
      if (game.board.wallsH.has(cellId(x, y - 1))) classes.push("wall-top");
      if (game.board.wallsV.has(cell)) classes.push("wall-right");
      if (game.board.wallsV.has(cellId(x - 1, y))) classes.push("wall-left");
      if (game.board.blocked.has(cell)) classes.push("blocked");
      if (isTarget) classes.push("target-cell", `target-${game.board.target.color}`);
      if (firstHint?.from === cell) classes.push("hint-from");
      if (firstHint?.to === cell) classes.push("hint-to");

      const cellElement = documentObject.createElement("div");
      cellElement.className = classes.join(" ");
      cellElement.dataset.cell = cell;
      if (isTarget) cellElement.append(createTargetElement(documentObject, game.board.target));
      if (robot) cellElement.append(createRobotElement(documentObject, robot, selectedRobot));
      cells.push(cellElement);
    }
  }

  boardEl.style.setProperty("--board-size", String(game.board.size));
  boardEl.replaceChildren(...cells);
}

export function renderSolutionList(listEl, moves) {
  const documentObject = listEl.ownerDocument;
  const items = moves.map((move, index) => {
    const from = parseCell(move.from);
    const to = parseCell(move.to);
    const item = documentObject.createElement("li");
    const number = documentObject.createElement("span");
    const label = documentObject.createElement("strong");
    const detail = documentObject.createElement("small");
    number.textContent = String(index + 1);
    label.textContent = formatMove(move);
    detail.textContent = `${from.x},${from.y} → ${to.x},${to.y}`;
    item.append(number, label, detail);
    return item;
  });
  listEl.replaceChildren(...items);
}

/**
 * Renders only the requested history window, rather than adding one DOM node
 * for every move. The complete timeline remains in the game state.
 */
export function renderHistoryList(listEl, { done, pending }, { start = 0, limit = Number.MAX_SAFE_INTEGER } = {}) {
  const documentObject = listEl.ownerDocument;
  const total = done.length + pending.length;
  const offset = Math.max(0, Math.min(total, Math.trunc(start) || 0));
  const end = Math.min(total, offset + Math.max(0, Math.trunc(limit) || 0));
  const items = [];

  if (!total) {
    const empty = documentObject.createElement("li");
    empty.className = "history-empty";
    empty.textContent = "落子后，轨迹会记录在这里。";
    listEl.replaceChildren(empty);
    return;
  }

  for (let index = offset; index < end; index += 1) {
    const isPending = index >= done.length;
    const move = isPending ? pending[index - done.length] : done[index];
    const item = documentObject.createElement("li");
    const button = documentObject.createElement("button");
    const number = documentObject.createElement("span");
    const label = documentObject.createElement("strong");
    item.className = isPending ? "history-pending" : "history-done";
    button.type = "button";
    button.dataset.historyStep = String(index + 1);
    button.setAttribute("aria-label", `跳转到第 ${index + 1} 步：${formatMove(move)}`);
    if (index + 1 === done.length) button.setAttribute("aria-current", "step");
    number.textContent = String(index + 1).padStart(2, "0");
    label.textContent = formatMove(move);
    button.append(number, label);
    item.append(button);
    items.push(item);
  }
  listEl.replaceChildren(...items);
}

export function robotClass(robot) {
  return ROBOTS.includes(robot) ? `robot-${robot}` : "robot-unknown";
}

function createTargetElement(documentObject, target) {
  const token = documentObject.createElement("span");
  token.className = "target-token";
  token.setAttribute("aria-label", `${ROBOT_LABELS[target.color]}色机器人目标`);
  token.textContent = targetGlyph(target.symbol);
  const index = documentObject.createElement("small");
  index.textContent = String(ROBOTS.indexOf(target.color) + 1);
  token.append(index);
  return token;
}

function createRobotElement(documentObject, robot, selectedRobot) {
  const button = documentObject.createElement("button");
  const label = `${ROBOT_LABELS[robot] ?? robot}色机器人`;
  button.className = `robot-token ${robotClass(robot)}${robot === selectedRobot ? " selected" : ""}`;
  button.dataset.robot = robot;
  button.type = "button";
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-pressed", String(robot === selectedRobot));
  button.append(createRobotSvg(documentObject, robot));
  return button;
}

function createRobotSvg(documentObject, robot) {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = documentObject.createElementNS(namespace, "svg");
  svg.setAttribute("viewBox", "0 0 42 42");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const face = robot === "yellow" ? "#212414" : "#ffffff";
  const body = documentObject.createElementNS(namespace, "rect");
  body.setAttribute("x", "8"); body.setAttribute("y", "11"); body.setAttribute("width", "26"); body.setAttribute("height", "23"); body.setAttribute("rx", "5");
  const head = documentObject.createElementNS(namespace, "rect");
  head.setAttribute("x", "14"); head.setAttribute("y", "6"); head.setAttribute("width", "14"); head.setAttribute("height", "8"); head.setAttribute("rx", "3");
  const number = documentObject.createElementNS(namespace, "text");
  number.setAttribute("x", "21"); number.setAttribute("y", "28"); number.setAttribute("text-anchor", "middle"); number.setAttribute("fill", face); number.setAttribute("font-size", "14"); number.setAttribute("font-weight", "800");
  number.textContent = String(ROBOTS.indexOf(robot) + 1);
  svg.append(body, head, number);
  return svg;
}
