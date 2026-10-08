import assert from "node:assert/strict";
import test from "node:test";

import { formatMove, formatSolution, renderHistoryList, targetGlyph } from "../src/renderer.mjs";

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

test("history renderer distinguishes completed and redo-pending moves", () => {
  const makeNode = (tagName) => ({
    tagName,
    children: [],
    append(...children) { this.children.push(...children); },
    setAttribute(key, value) { this[key] = value; },
    dataset: {},
  });
  const list = {
    ownerDocument: { createElement: makeNode },
    replaceChildren(...children) { this.children = children; },
  };
  renderHistoryList(list, {
    done: [{ robot: "red", dir: "up" }],
    pending: [{ robot: "blue", dir: "right" }],
  });
  assert.equal(list.children.length, 2);
  assert.equal(list.children[0].className, "history-done");
  assert.equal(list.children[1].className, "history-pending");
  assert.equal(list.children[1].children[0].children[1].textContent, "蓝 右");
  assert.equal(list.children[1].children[0].dataset.historyStep, "2");
});

test("large histories render only the requested page without losing move numbers", () => {
  const makeNode = (tagName) => ({
    tagName, dataset: {}, children: [],
    append(...items) { this.children.push(...items); },
    setAttribute(key, value) { this[key] = value; },
  });
  const list = {
    ownerDocument: { createElement: makeNode },
    replaceChildren(...children) { this.children = children; },
  };
  const makeMove = (robot) => ({ robot, dir: "up", from: "0,0", to: "0,1" });
  renderHistoryList(list, {
    done: Array.from({ length: 235 }, () => makeMove("red")),
    pending: Array.from({ length: 265 }, () => makeMove("blue")),
  }, { start: 228, limit: 15 });
  assert.equal(list.children.length, 15);
  assert.equal(list.children[0].children[0].dataset.historyStep, "229");
  assert.equal(list.children[14].children[0].dataset.historyStep, "243");
  assert.equal(list.children[0].className, "history-done");
  assert.equal(list.children[14].className, "history-pending");
});
