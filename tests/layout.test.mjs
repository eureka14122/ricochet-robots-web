import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const renderer = readFileSync(new URL("../src/renderer.mjs", import.meta.url), "utf8");

test("desktop layout fits one viewport with a bounded board and tool rail", () => {
  assert.match(css, /body\s*\{[\s\S]*height:\s*100vh[\s\S]*overflow:\s*hidden/);
  assert.match(css, /\.app-shell\s*\{[\s\S]*height:\s*100vh/);
  assert.match(css, /\.board\s*\{[\s\S]*max-height:\s*calc\(100vh - 126px\)/);
  assert.match(css, /\.side-panel\s*\{[\s\S]*height:\s*calc\(100vh - 126px\)[\s\S]*overflow-y:\s*auto/);
});

test("mobile controls use touch-sized targets and the page can scroll", () => {
  assert.match(css, /@media \(max-width:\s*600px\)[\s\S]*min-height:\s*48px/);
  assert.match(css, /@media \(max-width:\s*960px\)[\s\S]*body\s*\{[\s\S]*overflow:\s*auto/);
  assert.match(css, /\.history-actions\s*\{[\s\S]*grid-template-columns:\s*repeat\(5/);
  assert.match(css, /\.board\s*\{[\s\S]*touch-action:\s*none/);
});

test("motion and interaction states include accessibility fallbacks", () => {
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /button:focus-visible/);
  assert.match(css, /button:disabled/);
  assert.match(html, /data-action="undo"[^>]*disabled/);
  assert.match(html, /data-action="redo"[^>]*disabled/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /id="historyList"/);
});

test("board renderer builds trusted DOM nodes instead of injecting HTML", () => {
  assert.doesNotMatch(renderer, /\.innerHTML\s*=/);
  assert.match(renderer, /replaceChildren/);
});
