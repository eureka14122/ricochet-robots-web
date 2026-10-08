// Browser-level regression smoke test. Run with: npm install --no-save playwright && node tests/browser-smoke.mjs
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, extname, resolve, sep, join } from "node:path";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const types = { ".html": "text/html", ".css": "text/css", ".mjs": "text/javascript", ".js": "text/javascript" };
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const path = resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
  if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try {
    const data = await readFile(path);
    res.writeHead(200, { "content-type": (types[extname(path)] || "application/octet-stream") + "; charset=utf-8" });
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolveListening => server.listen(0, "127.0.0.1", resolveListening));
const url = "http://127.0.0.1:" + server.address().port + "/?seed=1024";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "chrome" }),
  args: ["--no-sandbox"],
});
const screenshotDir = join(root, "artifacts");
await mkdir(screenshotDir, { recursive: true });

async function ready(page) {
  await page.goto(url);
  await page.locator("#boardLoading").waitFor({ state: "hidden", timeout: 20000 });
  assert.equal(await page.locator(".board-cell").count(), 256, "16x16 board should render");
}

async function checkLayout(width, height, mobile = false) {
  const page = await browser.newPage({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile });
  await ready(page);
  const before = await page.evaluate(() => {
    const board = document.querySelector("#board").getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      docWidth: document.documentElement.scrollWidth,
      boardWidth: board.width,
      boardHeight: board.height,
      boardLeft: board.left,
      boardRight: board.right,
    };
  });
  assert.ok(before.docWidth <= before.viewportWidth + 2, `page overflows at ${width}px: ${JSON.stringify(before)}`);
  assert.ok(Math.abs(before.boardWidth - before.boardHeight) < 2, "board must remain square");
  assert.ok(before.boardLeft >= -2 && before.boardRight <= before.viewportWidth + 2, "board must fit viewport");

  // The DOM renderer must stay bounded even with hundreds of completed and undone moves.
  const large = await page.evaluate(async () => {
    const { renderHistoryList } = await import("/src/renderer.mjs");
    const move = { robot: "red", dir: "up", from: "0,0", to: "0,1" };
    const pendingMove = { ...move, robot: "blue" };
    renderHistoryList(document.querySelector("#historyList"), {
      done: Array(235).fill(move), pending: Array(265).fill(pendingMove),
    }, { start: 225, limit: 15 });
    const panel = document.querySelector(".side-panel");
    const list = document.querySelector("#historyList");
    return {
      items: list.children.length,
      firstStep: list.querySelector("button")?.dataset.historyStep,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      panelWidth: panel.clientWidth,
      panelScrollWidth: panel.scrollWidth,
      historyWidth: list.clientWidth,
      historyScrollWidth: list.scrollWidth,
    };
  });
  assert.equal(large.items, 15);
  assert.equal(large.firstStep, "226");
  assert.ok(large.documentWidth <= large.viewportWidth + 2, `long history distorts viewport at ${width}px: ${JSON.stringify(large)}`);
  assert.ok(large.panelScrollWidth <= large.panelWidth + 2, `control rail width escapes at ${width}px: ${JSON.stringify(large)}`);
  assert.ok(large.historyScrollWidth <= large.historyWidth + 2, `history grid overflows at ${width}px: ${JSON.stringify(large)}`);
  await page.screenshot({ path: join(screenshotDir, `ricochet-${width}.png`), fullPage: true });

  if (mobile) {
    // A tap on the board must work with pointer capture enabled.
    await page.locator('#board [data-robot="blue"]').tap();
    assert.equal((await page.locator("#selectedText").textContent()).trim(), "蓝");
  }
  await page.close();
  return large;
}

try {
  const desktop = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  await ready(desktop);
  let moved = false;
  for (const robot of ["blue", "green", "yellow", "red"]) {
    await desktop.locator(`[data-select-robot="${robot}"]`).click();
    for (const direction of ["up", "down", "left", "right"]) {
      await desktop.locator(`[data-dir="${direction}"]`).click();
      const count = Number.parseInt(await desktop.locator("#moveCount").textContent(), 10);
      if (count > 0) { moved = true; break; }
    }
    if (moved) break;
  }
  assert.ok(moved, "direction controls must make a legal move");
  await desktop.locator('[data-action="undo"]').click();
  assert.equal(Number.parseInt(await desktop.locator("#moveCount").textContent(), 10), 0);
  await desktop.locator('#historyList [data-history-step="1"]').click();
  assert.equal(Number.parseInt(await desktop.locator("#moveCount").textContent(), 10), 1, "history step click must redo a move");
  await desktop.close();

  for (const [width, height, mobile] of [[1365,768,false],[820,1100,false],[390,844,true],[320,700,true]]) {
    const report = await checkLayout(width,height,mobile);
    console.log(`PASS viewport ${width}x${height}: ${report.items} history entries, no horizontal overflow`);
  }
  console.log("PASS: input controls, undo, history seeking, touch selection and responsive layouts");
} finally {
  await browser.close();
  await new Promise(resolveClosed => server.close(resolveClosed));
}
