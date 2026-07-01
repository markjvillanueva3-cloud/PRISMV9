// TOKEN-SAVINGS-PIVOT/U-PSN-OLLAMA-POSTREAD (iter15-#2, 2026-05-23, slot:alpha)
import { test } from "node:test";
import assert from "node:assert/strict";
import { isLargeRead, formatOffloadNudge } from "../posttool-ollama-offload-nudge.mjs";

test("isLargeRead: CLAUDE.md → true", () => assert.equal(isLargeRead("H:/prism/CLAUDE.md"), true));
test("isLargeRead: ENGINE_DIGEST.md → true", () => assert.equal(isLargeRead("mcp-server/data/docs/ENGINE_DIGEST.md"), true));
test("isLargeRead: MEMORY.md → true", () => assert.equal(isLargeRead("memory/MEMORY.md"), true));
test("isLargeRead: PRISM-INVENTORY-LATEST.md → true", () => assert.equal(isLargeRead("H:/prism/PRISM-INVENTORY-LATEST.md"), true));
test("isLargeRead: wiki/index.md → true", () => assert.equal(isLargeRead("H:/prism/knowledge/wiki/index.md"), true));
test("isLargeRead: small file → false", () => assert.equal(isLargeRead("src/engine.ts"), false));
test("isLargeRead: null → false", () => assert.equal(isLargeRead(null), false));
test("isLargeRead: empty → false", () => assert.equal(isLargeRead(""), false));
test("isLargeRead: non-string → false", () => assert.equal(isLargeRead(42), false));

test("formatOffloadNudge: Read of CLAUDE.md emits nudge", () => {
  const n = formatOffloadNudge("Read", "H:/prism/CLAUDE.md");
  assert.ok(n !== null);
  assert.ok(n.includes("prism_dev:ollama_hook_query"));
  assert.ok(n.includes("code_explain"));
  assert.ok(n.includes("PRISM_OLLAMA_POSTREAD_DISABLE"));
});

test("formatOffloadNudge: Read of small file → null", () => {
  assert.equal(formatOffloadNudge("Read", "src/x.ts"), null);
});

test("formatOffloadNudge: non-Read tool → null", () => {
  assert.equal(formatOffloadNudge("Bash", "CLAUDE.md"), null);
  assert.equal(formatOffloadNudge("Edit", "CLAUDE.md"), null);
});

test("formatOffloadNudge: null filePath → null", () => {
  assert.equal(formatOffloadNudge("Read", null), null);
  assert.equal(formatOffloadNudge("Read", ""), null);
});

test("formatOffloadNudge: nudge points at /ollama-bridge skill as fallback", () => {
  const n = formatOffloadNudge("Read", "MEMORY.md");
  assert.ok(n.includes("/ollama-bridge"));
});
