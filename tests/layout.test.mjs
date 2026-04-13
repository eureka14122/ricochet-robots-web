import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("desktop layout is constrained to one viewport without page scrolling", () => {
  assert.match(css, /body\s*\{[\s\S]*height:\s*100vh[\s\S]*overflow:\s*hidden/);
  assert.match(css, /\.app-shell\s*\{[\s\S]*height:\s*100vh/);
  assert.match(css, /\.board\s*\{[\s\S]*max-height:\s*calc\(100vh - 104px\)/);
  assert.match(css, /\.side-panel\s*\{[\s\S]*height:\s*calc\(100vh - 32px\)[\s\S]*overflow:\s*hidden/);
});

test("right rail keeps the solver visible in the fixed-height desktop layout", () => {
  assert.match(css, /\.side-panel\s*\{[\s\S]*grid-template-rows:\s*auto auto auto auto minmax\(110px,\s*1fr\)/);
  assert.match(css, /\.actions-panel\s*\{[\s\S]*display:\s*grid[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /\.solver-panel\s*\{[\s\S]*min-height:\s*0[\s\S]*display:\s*flex/);
});
