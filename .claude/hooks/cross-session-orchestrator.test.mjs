// tier: T1
// Tests for .claude/hooks/cross-session-orchestrator.mjs (the RUNTIME .mjs hook actually
// wired in settings.json --pre/--post; distinct from the TS-source crossSessionOrchestratorHook
// test). COORD-MS0/U-COORD05; runtime hook covered 2026-06-10, slot:bravo.
//
// node:test -- the hook is now import-safe (isDirect guard) and exports its pure helpers, so
// a static import is hermetic (main()'s fd-0 read + dist-engine import never run). Covers the
// pure decision/sanitize/adapter logic; the engine-dependent claim/broadcast paths are
// integration-tested via the dist engine elsewhere.
//
// Run: node --test H:/prism/.claude/hooks/cross-session-orchestrator.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTtl, extractFilePath, sanitizePath, formatBlockReason, getBroadcaster } from "./cross-session-orchestrator.mjs";

test("sanitizePath: SECURITY -- strips null bytes, trims, caps length, empty -> null", () => {
  assert.equal(sanitizePath("  H:/prism/x.ts  "), "H:/prism/x.ts");      // trimmed
  assert.equal(sanitizePath("H:/prism/x\0y.ts"), "H:/prism/xy.ts");      // null byte (adversarial) stripped
  assert.equal(sanitizePath(""), null);
  assert.equal(sanitizePath("   "), null);                                // whitespace-only -> null
  assert.equal(sanitizePath(null), null);
  assert.equal(sanitizePath("x".repeat(5000)), null);                     // pathological length rejected (>4096)
  assert.equal(sanitizePath("x".repeat(4096)), "x".repeat(4096));         // at the cap is allowed
});

test("extractFilePath: file_path/path for edits, notebook_path for NotebookEdit", () => {
  assert.equal(extractFilePath("Edit", { file_path: "/a.ts" }), "/a.ts");
  assert.equal(extractFilePath("Write", { path: "/p.ts" }), "/p.ts");          // path fallback
  assert.equal(extractFilePath("MultiEdit", { filePath: "/m.ts" }), "/m.ts");  // camelCase fallback
  assert.equal(extractFilePath("NotebookEdit", { notebook_path: "/n.ipynb" }), "/n.ipynb");
  assert.equal(extractFilePath("NotebookEdit", { file_path: "/wrong.ts" }), null); // notebook uses notebook_path only
  assert.equal(extractFilePath("Edit", {}), null);
  assert.equal(extractFilePath("Edit", null), null);
});

test("parseTtl: env override when valid+positive, else the 15-min default", () => {
  const saved = process.env.PRISM_COORD_ORCH_TTL_MS;
  try {
    delete process.env.PRISM_COORD_ORCH_TTL_MS;
    assert.equal(parseTtl(), 15 * 60 * 1000);                 // default
    process.env.PRISM_COORD_ORCH_TTL_MS = "60000";
    assert.equal(parseTtl(), 60000);                          // valid override
    process.env.PRISM_COORD_ORCH_TTL_MS = "not-a-number";
    assert.equal(parseTtl(), 15 * 60 * 1000);                 // invalid -> default
    process.env.PRISM_COORD_ORCH_TTL_MS = "-5";
    assert.equal(parseTtl(), 15 * 60 * 1000);                 // non-positive -> default
  } finally {
    if (saved === undefined) delete process.env.PRISM_COORD_ORCH_TTL_MS;
    else process.env.PRISM_COORD_ORCH_TTL_MS = saved;
  }
});

test("formatBlockReason: includes tool, target, holder, and the block banner", () => {
  const msg = formatBlockReason({ holder: "claude-peer99", error: "active claim" }, "Edit", "H:/prism/x.ts");
  assert.match(msg, /blocked/);
  assert.match(msg, /H:\/prism\/x\.ts/);
  assert.match(msg, /claude-peer99/);
  assert.match(msg, /Edit/);
});

test("getBroadcaster: prefers broadcastMessage, falls back to broadcast, null when neither", () => {
  let viaNew = null;
  const newEngine = { broadcastMessage: (m) => { viaNew = m; return "new"; }, broadcast: () => "old" };
  const bNew = getBroadcaster(newEngine);
  assert.equal(typeof bNew, "function");
  assert.equal(bNew({ x: 1 }), "new");           // prefers broadcastMessage
  assert.deepEqual(viaNew, { x: 1 });

  let viaOld = null;
  const oldEngine = { broadcast: (m) => { viaOld = m; return "old"; } };
  assert.equal(getBroadcaster(oldEngine)({ y: 2 }), "old"); // falls back to broadcast
  assert.deepEqual(viaOld, { y: 2 });

  assert.equal(getBroadcaster({}), null);        // neither -> null (caller skips broadcast)
});
