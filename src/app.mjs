import { copyText } from "./clipboard.mjs";
import { generatePuzzle } from "./generator.mjs";
import {
  createGameHistory,
  historyControls,
  historyMoves,
  reduceGameHistory,
  restoreGameHistory,
  serializeGameHistory,
} from "./history.mjs";
import { getKeyCommand, getSwipeDirection, isEditableTarget } from "./input.mjs";
import { solvePuzzle } from "./solver.mjs";
import {
  DIRECTION_LABELS,
  ROBOT_LABELS,
} from "./model.mjs";
import {
  createPuzzleUrl,
  createRandomSeed,
  parseSeed,
  resolveSeedFromSearch,
} from "./seed.mjs";
import {
  formatMove,
  renderBoard,
  renderHistoryList,
  renderSolutionList,
  targetGlyph,
} from "./renderer.mjs";

const SESSION_KEY = "ricochet-robots-session-v1";
const MAX_SESSION_LENGTH = 64_000;

const elements = {
  board: document.querySelector("#board"),
  targetBadge: document.querySelector("#targetBadge"),
  targetText: document.querySelector("#targetText"),
  statusText: document.querySelector("#statusText"),
  moveCount: document.querySelector("#moveCount"),
  seedText: document.querySelector("#seedText"),
  selectedText: document.querySelector("#selectedText"),
  seedInput: document.querySelector("#seedInput"),
  solverStatus: document.querySelector("#solverStatus"),
  solutionList: document.querySelector("#solutionList"),
  winOverlay: document.querySelector("#winOverlay"),
  winSummary: document.querySelector("#winSummary"),
  copyStatus: document.querySelector("#copyStatus"),
  undoButton: document.querySelector('[data-action="undo"]'),
  redoButton: document.querySelector('[data-action="redo"]'),
  resetButton: document.querySelector('[data-action="reset"]'),
  historySummary: document.querySelector("#historySummary"),
  historyList: document.querySelector("#historyList"),
};

const state = {
  timeline: null,
  solver: { status: "idle", mode: "hint", moves: [] },
  worker: createWorker(),
  requestId: 0,
};

wireControls();
startFromLocation({ restoreSession: true });

function startFromLocation({ restoreSession = false } = {}) {
  const fallback = createRandomSeed(state.timeline?.game.seed);
  const resolved = resolveSeedFromSearch(window.location.search, fallback);
  startPuzzle(resolved.seed, {
    urlMode: resolved.needsCanonicalUrl ? "replace" : "none",
    restoreSession,
  });
  if (!resolved.fromUrl) announce("链接中的种子无效或缺失，已安全生成新局。", "notice");
}

function startPuzzle(seed, { urlMode = "push", restoreSession = false } = {}) {
  const puzzle = generatePuzzle(seed);
  state.timeline = restoreSession
    ? restoreGameHistory(puzzle, readStoredHistory(seed)) ?? createGameHistory(puzzle)
    : createGameHistory(puzzle);
  state.solver = { status: "idle", mode: "hint", moves: [] };
  state.requestId += 1;
  elements.seedInput.value = String(seed);
  dismissWin();
  if (urlMode !== "none") {
    const url = createPuzzleUrl(window.location.href, seed);
    window.history[urlMode === "replace" ? "replaceState" : "pushState"]({ seed }, "", url);
  }
  render();
}

function wireControls() {
  elements.board.addEventListener("click", (event) => {
    if (elements.board.dataset.suppressClick === "true") {
      delete elements.board.dataset.suppressClick;
      return;
    }
    const robotButton = event.target.closest("[data-robot]");
    if (!robotButton) return;
    state.timeline = reduceGameHistory(state.timeline, { type: "select", robot: robotButton.dataset.robot });
    render();
  });

  wireBoardGestures();

  document.querySelectorAll("[data-select-robot]").forEach((button) => {
    button.addEventListener("click", () => {
      state.timeline = reduceGameHistory(state.timeline, { type: "select", robot: button.dataset.selectRobot });
      render();
    });
  });

  document.querySelectorAll("[data-dir]").forEach((button) => {
    button.addEventListener("click", () => play(button.dataset.dir));
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => void handleAction(button.dataset.action));
  });

  document.addEventListener("keydown", (event) => {
    if (isEditableTarget(event.target)) return;
    const handled = handleKey(event);
    if (handled) event.preventDefault();
  });

  elements.seedInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") void handleAction("seed");
  });

  window.addEventListener("popstate", () => startFromLocation());

  elements.winOverlay?.addEventListener("click", (event) => {
    if (event.target === elements.winOverlay || event.target.closest("[data-win-close]")) {
      dismissWin();
    }
  });
}

function wireBoardGestures() {
  let gesture = null;
  elements.board.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" || event.isPrimary === false) return;
    gesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: performance.now(),
      robot: event.target.closest?.("[data-robot]")?.dataset.robot ?? null,
    };
    elements.board.setPointerCapture?.(event.pointerId);
  });

  elements.board.addEventListener("pointerup", (event) => {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const dir = getSwipeDirection({
      startX: gesture.startX,
      startY: gesture.startY,
      endX: event.clientX,
      endY: event.clientY,
      durationMs: performance.now() - gesture.startedAt,
    });
    const robot = gesture.robot;
    gesture = null;
    if (!dir) return;
    elements.board.dataset.suppressClick = "true";
    if (robot) state.timeline = reduceGameHistory(state.timeline, { type: "select", robot });
    play(dir);
  });

  elements.board.addEventListener("pointercancel", () => {
    gesture = null;
  });
}

function handleKey(event) {
  const command = getKeyCommand(event);
  if (command.type === "select") {
    state.timeline = reduceGameHistory(state.timeline, { type: "select", robot: command.robot });
    render();
    return true;
  }
  if (command.type === "move") {
    play(command.dir);
    return true;
  }
  if (command.type === "action") {
    void handleAction(command.action);
    return true;
  }
  return false;
}

async function handleAction(action) {
  if (action === "undo" || action === "redo") {
    transitionHistory(action);
    clearSolution();
    return;
  }
  if (action === "reset") {
    transitionHistory("reset");
    clearSolution();
    return;
  }
  if (action === "new") {
    startPuzzle(createRandomSeed(state.timeline.game.seed));
    return;
  }
  if (action === "seed") {
    const seed = parseSeed(elements.seedInput.value);
    if (seed === null) {
      announce("种子需为 1–4294967295 的十进制整数，当前对局未改变。", "error");
      return;
    }
    startPuzzle(seed);
    return;
  }
  if (action === "copy") {
    const url = createPuzzleUrl(window.location.href, state.timeline.game.seed).href;
    const copied = await copyText(url);
    announce(copied ? "对局链接已复制。" : "复制失败，请手动复制地址栏中的链接。", copied ? "success" : "error");
    return;
  }
  if (action === "hint") {
    requestSolution("hint");
    return;
  }
  if (action === "solve") {
    requestSolution("full");
  }
}

function play(dir) {
  const game = state.timeline.game;
  if (game.status === "won") {
    return;
  }
  const previous = state.timeline;
  state.timeline = reduceGameHistory(previous, { type: "move", dir });
  if (state.timeline === previous) {
    elements.statusText.textContent = `${ROBOT_LABELS[state.timeline.selectedRobot]}色机器人向${DIRECTION_LABELS[dir]}没有可移动空间。`;
    return;
  }
  clearSolution();
  render();
  if (state.timeline.game.status === "won") {
    celebrateWin();
  }
}

function transitionHistory(type) {
  const previous = state.timeline;
  const next = reduceGameHistory(previous, { type });
  if (next === previous) return;
  state.timeline = next;
  if (previous.game.status === "won" && next.game.status !== "won") dismissWin();
  render();
  if (previous.game.status !== "won" && next.game.status === "won") celebrateWin();
}

function clearSolution() {
  state.requestId += 1;
  state.solver = { status: "idle", mode: "hint", moves: [] };
}

function requestSolution(mode) {
  const id = state.requestId + 1;
  state.requestId = id;
  state.solver = { status: "running", mode, moves: [] };
  render();

  const payload = {
    id,
    board: state.timeline.game.board,
    robots: state.timeline.game.robots,
    options: { maxDepth: 12, maxStates: 100_000 },
  };

  if (state.worker) {
    state.worker.postMessage(payload);
    return;
  }

  Promise.resolve().then(() => {
    receiveSolution(id, solvePuzzle(payload.board, payload.robots, payload.options));
  });
}

function receiveSolution(id, solution) {
  if (id !== state.requestId) return;
  state.solver = {
    status: solution.status,
    mode: state.solver.mode,
    moves: solution.moves,
    explored: solution.explored,
    elapsedMs: solution.elapsedMs,
    capped: solution.capped,
  };
  render();
}

function createWorker() {
  if (!("Worker" in window)) return null;
  try {
    const worker = new Worker(new URL("./solver.worker.mjs", import.meta.url), { type: "module" });
    worker.addEventListener("message", (event) => {
      if (event.data.error) {
        if (event.data.id !== state.requestId) return;
        state.solver = { status: "error", mode: state.solver.mode, moves: [], error: event.data.error };
        render();
        return;
      }
      receiveSolution(event.data.id, event.data.solution);
    });
    worker.addEventListener("error", () => {
      state.worker = null;
      state.solver = { status: "error", mode: state.solver.mode, moves: [], error: "Worker 加载失败，请用本地服务器打开页面。" };
      render();
    });
    return worker;
  } catch {
    return null;
  }
}

function render() {
  const game = state.timeline.game;
  const solutionMoves = state.solver.status === "solved" ? state.solver.moves : [];
  const previous = captureRobotRects();
  renderBoard(elements.board, {
    game,
    selectedRobot: state.timeline.selectedRobot,
    solutionMoves,
  });
  playSlideAnimation(previous);

  const target = game.board.target;
  const par = game.solutionDepth;
  elements.targetBadge.textContent = targetGlyph(target.symbol);
  elements.targetBadge.className = `target-badge badge-${target.color}`;
  elements.targetText.textContent = `${ROBOT_LABELS[target.color]}色机器人到达目标`;
  elements.moveCount.textContent = par ? `${game.moveCount} / ${par}` : String(game.moveCount);
  elements.seedText.textContent = String(game.seed);
  elements.selectedText.textContent = ROBOT_LABELS[state.timeline.selectedRobot];
  document.querySelectorAll("[data-select-robot]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.selectRobot === state.timeline.selectedRobot));
  });
  elements.statusText.textContent = game.status === "won"
    ? winMessage(game.moveCount, par)
    : par
      ? `选择机器人，让它沿直线滑到障碍前。最优 ${par} 步。`
      : "选择机器人，然后让它沿直线滑到障碍前。";

  const controls = historyControls(state.timeline);
  elements.undoButton.disabled = !controls.canUndo;
  elements.redoButton.disabled = !controls.canRedo;
  elements.resetButton.disabled = !controls.canReset;

  const moves = historyMoves(state.timeline);
  elements.historySummary.textContent = moves.pending.length
    ? `${moves.done.length} 步已走 · ${moves.pending.length} 步待重做`
    : moves.done.length
      ? `${moves.done.length} 步已走`
      : "等待第一步";
  renderHistoryList(elements.historyList, moves);
  storeHistory(state.timeline);

  renderSolverPanel();
}

function captureRobotRects() {
  const rects = new Map();
  elements.board.querySelectorAll("[data-robot]").forEach((node) => {
    rects.set(node.dataset.robot, node.getBoundingClientRect());
  });
  return rects;
}

function playSlideAnimation(previous) {
  if (!previous.size || prefersReducedMotion()) return;
  elements.board.querySelectorAll("[data-robot]").forEach((node) => {
    const before = previous.get(node.dataset.robot);
    if (!before) return;
    const after = node.getBoundingClientRect();
    const dx = before.left - after.left;
    const dy = before.top - after.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    if (typeof node.animate !== "function") return;
    node.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: "translate(0, 0)" },
      ],
      { duration: 190, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" },
    );
  });
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function winMessage(steps, par) {
  if (!par) return `抵达目标，用了 ${steps} 步。`;
  if (steps <= par) return `完美！${steps} 步达成最优解。`;
  return `抵达目标，用了 ${steps} 步（最优 ${par} 步）。`;
}

function celebrateWin() {
  const overlay = elements.winOverlay;
  if (!overlay) return;
  const par = state.timeline.game.solutionDepth;
  const steps = state.timeline.game.moveCount;
  elements.winSummary.textContent = winMessage(steps, par);
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
}

function dismissWin() {
  elements.winOverlay?.classList.remove("show");
  elements.winOverlay?.setAttribute("aria-hidden", "true");
}

function announce(message, tone) {
  elements.copyStatus.textContent = message;
  elements.copyStatus.dataset.tone = tone;
}

function readStoredHistory(seed) {
  try {
    const raw = window.sessionStorage?.getItem(SESSION_KEY);
    if (!raw || raw.length > MAX_SESSION_LENGTH) return null;
    const stored = JSON.parse(raw);
    return stored?.seed === seed ? stored : null;
  } catch {
    return null;
  }
}

function storeHistory(timeline) {
  try {
    window.sessionStorage?.setItem(SESSION_KEY, JSON.stringify(serializeGameHistory(timeline)));
  } catch {
    // Storage may be unavailable in private or hardened browsing modes.
  }
}

function renderSolverPanel() {
  elements.solutionList.replaceChildren();

  if (state.solver.status === "idle") {
    elements.solverStatus.textContent = "还没有计算。";
    return;
  }
  if (state.solver.status === "running") {
    elements.solverStatus.textContent = "正在搜索最短路线...";
    return;
  }
  if (state.solver.status === "error") {
    elements.solverStatus.textContent = state.solver.error;
    return;
  }
  if (state.solver.status === "capped") {
    elements.solverStatus.textContent = "本次搜索达到上限，换个种子或重试。";
    return;
  }
  if (state.solver.status === "unsolved") {
    elements.solverStatus.textContent = "12 步内没有找到解。";
    return;
  }

  const moves = state.solver.mode === "hint" ? state.solver.moves.slice(0, 1) : state.solver.moves;
  const detail = state.solver.mode === "hint"
    ? `下一步：${formatMove(state.solver.moves[0])}`
    : `最短 ${state.solver.moves.length} 步，路线见下方`;
  elements.solverStatus.textContent = `${detail}。搜索 ${state.solver.explored} 个状态，用时 ${state.solver.elapsedMs} ms。`;
  renderSolutionList(elements.solutionList, moves);
}
