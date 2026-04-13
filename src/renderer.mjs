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

      cells.push(`<div class="${classes.join(" ")}" data-cell="${cell}">${renderTarget(isTarget, game.board.target)}${renderRobot(robot, selectedRobot)}</div>`);
    }
  }

  boardEl.style.setProperty("--board-size", String(game.board.size));
  boardEl.innerHTML = cells.join("");
}

export function renderSolutionList(listEl, moves) {
  listEl.innerHTML = moves.map((move, index) => {
    const from = parseCell(move.from);
    const to = parseCell(move.to);
    return `<li><span>${index + 1}</span><strong>${formatMove(move)}</strong><small>${from.x},${from.y} → ${to.x},${to.y}</small></li>`;
  }).join("");
}

export function robotClass(robot) {
  return ROBOTS.includes(robot) ? `robot-${robot}` : "robot-unknown";
}

function renderTarget(isTarget, target) {
  if (!isTarget) return "";
  return `<span class="target-token" aria-label="目标">${targetGlyph(target.symbol)}</span>`;
}

function renderRobot(robot, selectedRobot) {
  if (!robot) return "";
  const selected = robot === selectedRobot ? " selected" : "";
  const label = `${ROBOT_LABELS[robot] ?? robot}色机器人`;
  return `<button class="robot-token ${robotClass(robot)}${selected}" data-robot="${robot}" type="button" aria-label="${label}">${robotSvg(robot)}</button>`;
}

function robotSvg(robot) {
  const face = robot === "yellow" ? "#212414" : "#ffffff";
  return `<svg viewBox="0 0 42 42" aria-hidden="true" focusable="false">
    <rect x="9" y="12" width="24" height="21" rx="6"></rect>
    <rect x="14" y="6" width="14" height="9" rx="4"></rect>
    <circle cx="17" cy="22" r="2.7" fill="${face}"></circle>
    <circle cx="25" cy="22" r="2.7" fill="${face}"></circle>
    <path d="M15 29h12" stroke="${face}" stroke-width="2.8" stroke-linecap="round"></path>
  </svg>`;
}
