import assert from "node:assert/strict";
import test from "node:test";

import { getKeyCommand } from "../src/input.mjs";

test("uppercase S requests the full solution", () => {
  assert.deepEqual(getKeyCommand("S"), { type: "action", action: "solve" });
});

test("lowercase s still moves down for WASD play", () => {
  assert.deepEqual(getKeyCommand("s"), { type: "move", dir: "down" });
});
