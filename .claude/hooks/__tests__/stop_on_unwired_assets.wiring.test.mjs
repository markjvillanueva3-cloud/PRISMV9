/**
 * stop_on_unwired_assets.wiring.test.mjs — R15 validation for wiring the
 * transcript-scoped orphan-engine Stop gate into settings.json.
 *
 * WHY (R9): wiring a Stop hook fleet-wide is high-leverage; before arming it we
 * prove on LIVE data that (a) it BLOCKS a real unwired engine, (b) it APPROVES
 * an empty/no-engine session, and (c) it is transcript-scoped (so it cannot
 * block on the 89 pre-existing orphans a chat did not create this session).
 * The fixture engine is discovered from the real tree, not hand-mocked.
 *
 * node:test (scripts/ convention). Run:
 *   node --test H:/prism/.claude/hooks/__tests__/stop_on_unwired_assets.wiring.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const REPO = "H:/prism";
const HOOK = path.join(REPO, ".claude/hooks/stop_on_unwired_assets.mjs");
const NODE = process.execPath;
const HOOK_TIMEOUT_MS = 15000;
// Deterministic adversarial fixture: a temp engine under the engines tree with a
// unique singleton no dispatcher references and no test file -> the hook MUST
// block (ORPHAN + UNTESTED). Far more robust than discovering a "real" unwired
// engine whose wired-status must exactly match the hook's own heuristic.
const ORPHAN_DIR = path.join(REPO, "mcp-server/src/engines/__wiretest__");
const ORPHAN_REL = `mcp-server/src/engines/__wiretest__/ZzzWireOrphan${process.pid}Engine.ts`;
const ORPHAN_SINGLETON = `zzzWireOrphan${process.pid}Engine`;

function makeOrphanEngine() {
  fs.mkdirSync(ORPHAN_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(REPO, ORPHAN_REL),
    `// Temp orphan fixture for stop_on_unwired_assets wiring test. Auto-deleted.\n` +
    `export const ${ORPHAN_SINGLETON} = { compute() { return 1; } };\n`,
    "utf8",
  );
  return ORPHAN_REL;
}
function cleanupOrphan() {
  try { fs.rmSync(ORPHAN_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
}

/**
 * Env with the ambient YOLO-bypass flag stripped, so the test exercises the
 * hook's REAL enforcement logic regardless of the operator's session-wide
 * `PRISM_ALLOW_UNWIRED=1` (set 2026-05-24 as part of the YOLO-bypass cluster).
 * A test that inherited the bypass would only ever see "approve" and prove
 * nothing about the gate (R9 — a test that can't fail is worthless).
 */
function enforcingEnv() {
  const e = { ...process.env };
  delete e.PRISM_ALLOW_UNWIRED;
  return e;
}

/** Invoke the hook with a JSON stdin payload (enforcing env), return the decision. */
function runHook(stdinObj) {
  const res = spawnSync(NODE, [HOOK], {
    input: JSON.stringify(stdinObj),
    encoding: "utf8",
    timeout: HOOK_TIMEOUT_MS,
    env: enforcingEnv(),
  });
  // Hook prints a single JSON object to stdout.
  const out = (res.stdout || "").trim();
  try { return JSON.parse(out); } catch { return { decision: "PARSE_FAIL", raw: out, stderr: res.stderr }; }
}

/** Write a minimal Claude transcript JSONL whose only tool_use is a Write of `relPath`. */
function makeTranscript(relPath) {
  const abs = path.join(REPO, relPath).replace(/\\/g, "/");
  const line = JSON.stringify({
    message: { content: [{ type: "tool_use", name: "Write", input: { file_path: abs } }] },
  });
  const tmp = path.join(os.tmpdir(), `wiretest-${process.pid}-${Math.abs(hashStr(relPath))}.jsonl`);
  fs.writeFileSync(tmp, line + "\n", "utf8");
  return tmp;
}
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

test("empty stdin (no transcript scope) -> APPROVE (cannot block on fleet-wide state)", () => {
  const d = runHook({});
  assert.equal(d.decision, "approve", `expected approve, got ${JSON.stringify(d)}`);
});

test("transcript referencing a NON-engine file (.md) -> APPROVE", () => {
  const t = makeTranscript("state/shared/specs/X-ARTICLE-SYNERGY-AUDIT-2026-06-10.md");
  try {
    const d = runHook({ transcript_path: t });
    assert.equal(d.decision, "approve", `expected approve for non-engine edit, got ${JSON.stringify(d)}`);
  } finally { fs.rmSync(t, { force: true }); }
});

test("transcript referencing a freshly-created ORPHAN engine -> BLOCK (orphan + untested)", () => {
  const rel = makeOrphanEngine();
  const t = makeTranscript(rel);
  try {
    const d = runHook({ transcript_path: t });
    assert.equal(d.decision, "block", `expected BLOCK for orphan engine ${rel}, got ${JSON.stringify(d)}`);
    assert.match(d.reason, /ORPHAN ENGINE|UNTESTED ENGINE/, `block reason should name the orphan/untested asset: ${d.reason}`);
  } finally { fs.rmSync(t, { force: true }); cleanupOrphan(); }
});

test("PRISM_ALLOW_UNWIRED=1 escape hatch -> APPROVE even with an orphan engine in scope", () => {
  const rel = makeOrphanEngine();
  const t = makeTranscript(rel);
  try {
    const res = spawnSync(NODE, [HOOK], {
      input: JSON.stringify({ transcript_path: t }),
      encoding: "utf8", timeout: HOOK_TIMEOUT_MS,
      env: { ...process.env, PRISM_ALLOW_UNWIRED: "1" },
    });
    const d = JSON.parse((res.stdout || "").trim());
    assert.equal(d.decision, "approve", `escape hatch should approve, got ${JSON.stringify(d)}`);
  } finally { fs.rmSync(t, { force: true }); cleanupOrphan(); }
});
