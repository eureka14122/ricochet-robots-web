import assert from "node:assert/strict";
import test from "node:test";
import { getHistoryPage } from "../src/history-window.mjs";

test("history pagination stays bounded with 500 moves", () => {
  const last = getHistoryPage(500, 500);
  assert.deepEqual([last.page, last.pageCount, last.start, last.end], [33, 34, 495, 500]);
  const earlier = getHistoryPage(500, 235, 14);
  assert.deepEqual([earlier.page, earlier.start, earlier.end], [14, 210, 225]);
  assert.equal(getHistoryPage(500, 235, 1000).page, 33);
});

test("history page follows the current undo/redo cursor", () => {
  assert.equal(getHistoryPage(500, 0).page, 0);
  assert.equal(getHistoryPage(500, 15).page, 0);
  assert.equal(getHistoryPage(500, 16).page, 1);
  assert.equal(getHistoryPage(500, 235).page, 15);
  assert.equal(getHistoryPage(0, 0).pageCount, 1);
});
