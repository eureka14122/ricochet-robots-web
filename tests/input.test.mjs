import assert from "node:assert/strict";
import test from "node:test";

import { getKeyCommand, getSwipeDirection, isEditableTarget } from "../src/input.mjs";

test("uppercase S requests the full solution", () => {
  assert.deepEqual(getKeyCommand("S"), { type: "action", action: "solve" });
});

test("lowercase s still moves down for WASD play", () => {
  assert.deepEqual(getKeyCommand("s"), { type: "move", dir: "down" });
});

test("standard undo and redo shortcuts do not conflict with plain keys", () => {
  assert.deepEqual(getKeyCommand({ key: "z", ctrlKey: true }), { type: "action", action: "undo" });
  assert.deepEqual(getKeyCommand({ key: "Z", metaKey: true, shiftKey: true }), { type: "action", action: "redo" });
  assert.deepEqual(getKeyCommand({ key: "y", ctrlKey: true }), { type: "action", action: "redo" });
  assert.deepEqual(getKeyCommand("z"), { type: "none" });
  assert.deepEqual(getKeyCommand("R"), { type: "action", action: "reset" });
  assert.deepEqual(getKeyCommand("u"), { type: "action", action: "undo" });
  assert.deepEqual(getKeyCommand("U"), { type: "action", action: "redo" });
});

test("editable targets are protected from global shortcuts", () => {
  assert.equal(isEditableTarget({ tagName: "INPUT" }), true);
  assert.equal(isEditableTarget({ tagName: "textarea" }), true);
  assert.equal(isEditableTarget({ tagName: "SELECT" }), true);
  assert.equal(isEditableTarget({ tagName: "DIV", isContentEditable: true }), true);
  assert.equal(isEditableTarget({ tagName: "BUTTON" }), false);
});

test("touch swipes map only decisive, timely gestures to directions", () => {
  assert.equal(getSwipeDirection({ startX: 10, startY: 10, endX: 90, endY: 14, durationMs: 250 }), "right");
  assert.equal(getSwipeDirection({ startX: 90, startY: 20, endX: 10, endY: 10, durationMs: 250 }), "left");
  assert.equal(getSwipeDirection({ startX: 20, startY: 90, endX: 18, endY: 10, durationMs: 250 }), "up");
  assert.equal(getSwipeDirection({ startX: 20, startY: 10, endX: 18, endY: 90, durationMs: 250 }), "down");
  assert.equal(getSwipeDirection({ startX: 10, startY: 10, endX: 25, endY: 25, durationMs: 250 }), null);
  assert.equal(getSwipeDirection({ startX: 10, startY: 10, endX: 100, endY: 10, durationMs: 1_500 }), null);
});
