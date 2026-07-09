import { createGame, moveRobot, resetGame, undoMove } from "./engine.mjs";
import { generatePuzzle } from "./generator.mjs";
import { getKeyCommand } from "./input.mjs";
import { solvePuzzle } from "./solver.mjs";
import {
  DIRECTION_LABELS,
  ROBOT_LABELS,
  normalizeSeed,
} from "./model.mjs";
import {
  formatMove,
  renderBoard,
  renderSolutionList,
  targetGlyph,
} from "./renderer.mjs";

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
};

const state = {
  game: null,
  selectedRobot: "red",
  solver: { status: "idle", mode: "hint", moves: [] },
  worker: createWorker(),
  requestId: 0,
};

startPuzzle(Date.now());
wireControls();

function startPuzzle(seedInput) {
  const seed = normalizeSeed(seedInput);
  const puzzle = generatePuzzle(seed);
  state.game = createGame(puzzle);
  state.selectedRobot = puzzle.board.target.color;
  state.solver = { status: "idle", mode: "hint", moves: [] };
  state.requestId += 1;
  elements.seedInput.value = String(seed);
  dismissWin();
  render();
}

function wireControls() {
  elements.board.addEventListener("click", (event) => {
    const robotButton = event.target.closest("[data-robot]");
    if (!robotButton) return;
    state.selectedRobot = robotButton.dataset.robot;
    render();
  });

  document.querySelectorAll("[data-dir]").forEach((button) => {
    button.addEventListener("click", () => play(button.dataset.dir));
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });

  document.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement) return;
    const handled = handleKey(event.key);
    if (handled) event.preventDefault();
  });

  elements.winOverlay?.addEventListener("click", (event) => {
    if (event.target === elements.winOverlay || event.target.closest("[data-win-close]")) {
      dismissWin();
    }
  });
}

function handleKey(key) {
  const command = getKeyCommand(key);
  if (command.type === "select") {
    state.selectedRobot = command.robot;
    render();
    return true;
  }
  if (command.type === "move") {
    play(command.dir);
    return true;
  }
  if (command.type === "action") {
    handleAction(command.action);
    return true;
  }
  return false;
}

function handleAction(action) {
  if (action === "undo") {
    state.game = undoMove(state.game);
    clearSolution();
    render();
    return;
  }
  if (action === "reset") {
    state.game = resetGame(state.game);
    clearSolution();
    render();
    return;
  }
  if (action === "new") {
    startPuzzle(Date.now());
    return;
  }
  if (action === "seed") {
    startPuzzle(elements.seedInput.value);
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
  if (state.game.status === "won") {
    return;
  }
  const result = moveRobot(state.game, state.selectedRobot, dir);
  if (!result.moved) {
    elements.statusText.textContent = `${ROBOT_LABELS[state.selectedRobot]}色机器人向${DIRECTION_LABELS[dir]}没有可移动空间。`;
    return;
  }
  state.game = result.game;
  clearSolution();
  render();
  if (state.game.status === "won") {
    celebrateWin();
  }
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
    board: state.game.board,
    robots: state.game.robots,
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
  const solutionMoves = state.solver.status === "solved" ? state.solver.moves : [];
  const previous = captureRobotRects();
  renderBoard(elements.board, {
    game: state.game,
    selectedRobot: state.selectedRobot,
    solutionMoves,
  });
  playSlideAnimation(previous);

  const target = state.game.board.target;
  const par = state.game.solutionDepth;
  elements.targetBadge.textContent = targetGlyph(target.symbol);
  elements.targetBadge.className = `target-badge badge-${target.color}`;
  elements.targetText.textContent = `${ROBOT_LABELS[target.color]}色机器人到达目标`;
  elements.moveCount.textContent = par ? `${state.game.moveCount} / ${par}` : String(state.game.moveCount);
  elements.seedText.textContent = String(state.game.seed);
  elements.selectedText.textContent = ROBOT_LABELS[state.selectedRobot];
  elements.statusText.textContent = state.game.status === "won"
    ? winMessage(state.game.moveCount, par)
    : par
      ? `选择机器人，让它沿直线滑到障碍前。最优 ${par} 步。`
      : "选择机器人，然后让它沿直线滑到障碍前。";

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
  const par = state.game.solutionDepth;
  const steps = state.game.moveCount;
  elements.winSummary.textContent = winMessage(steps, par);
  overlay.classList.add("show");
}

function dismissWin() {
  elements.winOverlay?.classList.remove("show");
}

function renderSolverPanel() {
  elements.solutionList.innerHTML = "";

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
