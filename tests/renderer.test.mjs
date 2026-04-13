import assert from "node:assert/strict";
import test from "node:test";

import { formatMove, formatSolution, targetGlyph } from "../src/renderer.mjs";

test("formats one move with Chinese robot and direction labels", () => {
  assert.equal(formatMove({ robot: "red", dir: "up", from: "2,2", to: "2,0" }), "红 上");
});

test("formats a full solution path", () => {
  const moves = [
    { robot: "red", dir: "down", from: "2,2", to: "2,12" },
    { robot: "blue", dir: "right", from: "3,3", to: "8,3" },
  ];

  assert.equal(formatSolution(moves), "1. 红 下  2. 蓝 右");
});

test("returns a readable target glyph", () => {
  assert.equal(targetGlyph("star"), "★");
});
