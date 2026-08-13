import assert from "node:assert/strict";
import test from "node:test";

import { copyText } from "../src/clipboard.mjs";

test("copy uses the clipboard API when available", async () => {
  let copied = "";
  const result = await copyText("puzzle link", {
    navigator: { clipboard: { async writeText(text) { copied = text; } } },
    document: null,
  });
  assert.equal(result, true);
  assert.equal(copied, "puzzle link");
});

test("copy falls back to a temporary textarea and removes it", async () => {
  const textarea = {
    style: {},
    setAttribute() {},
    select() { this.selected = true; },
    remove() { this.removed = true; },
  };
  const document = {
    body: { append(node) { node.appended = true; } },
    createElement() { return textarea; },
    execCommand(command) { return command === "copy"; },
  };
  const result = await copyText("fallback", {
    navigator: { clipboard: { async writeText() { throw new Error("denied"); } } },
    document,
  });
  assert.equal(result, true);
  assert.equal(textarea.value, "fallback");
  assert.equal(textarea.selected, true);
  assert.equal(textarea.removed, true);
});
