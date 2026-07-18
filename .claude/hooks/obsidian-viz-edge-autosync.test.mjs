// Tests for obsidian-viz-edge-autosync.mjs pure logic (XSUB-AUTOSYNC, slot:bravo 2026-06-12).
// Verifies INTENT (R9): a non-knowledge edit MUST NOT fire; a knowledge edit MUST fire;
// debounce suppresses thrash; the tree root resolves only when the generator exists.
import { test } from "node:test";
import assert from "node:assert/strict";
import { qualifies, resolveTreeRoot, isDebounced } from "./obsidian-viz-edge-autosync.mjs";

test("qualifies: knowledge notes fire, everything else does not", () => {
  // MUST fire
  assert.equal(qualifies("H:/prism-slot-bravo/knowledge/memories/feedback/x.md"), true);
  assert.equal(qualifies("H:/prism/knowledge/wiki/mill/mill-chip-thinning.md"), true);
  assert.equal(qualifies("H:/prism/knowledge/tribal/hypermill-cam-tips-hm-200.md"), true);
  assert.equal(qualifies("H:/prism-slot-bravo/mcp-server/src/engines/mill/MEMORY.md"), true);
  assert.equal(qualifies("C:/Users/wompu/.claude/projects/H--prism/memory/reference_x.md"), true);
  assert.equal(qualifies("C:\\Users\\wompu\\.claude\\projects\\H--PRISM\\memory\\reference_x.md"), true);
  // MUST NOT fire
  assert.equal(qualifies("H:/prism/mcp-server/src/engines/MillEngine.ts"), false, "a .ts engine is not a knowledge note");
  assert.equal(qualifies("H:/prism/mcp-server/src/engines/mill/CLAUDE.md"), false, "galaxy CLAUDE.md is not the Convention-C MEMORY.md source");
  assert.equal(qualifies("H:/prism/README.md"), false, "a non-knowledge md does not fire");
  assert.equal(qualifies("H:/prism/knowledge/wiki/mill/notes.txt"), false, "non-.md does not fire");
  assert.equal(qualifies("H:/prism/knowledge/specs/x.md"), false, "knowledge/ subdir outside memories|wiki|tribal does not fire");
  assert.equal(qualifies(""), false);
  assert.equal(qualifies(null), false);
  assert.equal(qualifies(undefined), false);
});

test("resolveTreeRoot: returns the owning tree only when the generator exists", () => {
  const has = () => true;   // generator present
  const none = () => false; // generator absent
  // knowledge path -> prefix before /knowledge/
  assert.equal(
    resolveTreeRoot("H:/prism-slot-bravo/knowledge/wiki/mill/x.md", {}, has),
    "H:/prism-slot-bravo"
  );
  // mcp-server path -> prefix before /mcp-server/
  assert.equal(
    resolveTreeRoot("H:/prism/mcp-server/src/engines/mill/MEMORY.md", {}, has),
    "H:/prism"
  );
  // backslash path normalizes
  assert.equal(
    resolveTreeRoot("H:\\prism-slot-bravo\\knowledge\\memories\\x.md", {}, has),
    "H:/prism-slot-bravo"
  );
  // C: brain -> PRISM_ROOT (env override honored)
  assert.equal(
    resolveTreeRoot("C:/Users/wompu/.claude/projects/H--prism/memory/x.md", { PRISM_ROOT: "H:/prism" }, has),
    "H:/prism"
  );
  // generator absent -> null (fail-soft skip)
  assert.equal(resolveTreeRoot("H:/prism/knowledge/wiki/mill/x.md", {}, none), null);
  // no recognizable root -> null
  assert.equal(resolveTreeRoot("H:/random/file.md", {}, has), null);
  assert.equal(resolveTreeRoot(null, {}, has), null);
});

test("isDebounced: suppresses within the window, fires outside, ignores bad stamps", () => {
  const now = 1_000_000;
  const win = 45_000;
  assert.equal(isDebounced(now - 1_000, now, win), true, "1s ago is within a 45s window");
  assert.equal(isDebounced(now - 44_999, now, win), true);
  assert.equal(isDebounced(now - 45_000, now, win), false, "exactly the window is NOT debounced");
  assert.equal(isDebounced(now - 60_000, now, win), false, "60s ago is outside");
  assert.equal(isDebounced(0, now, win), false, "no prior run (0) is not debounced");
  assert.equal(isDebounced(NaN, now, win), false);
  assert.equal(isDebounced(undefined, now, win), false);
});
