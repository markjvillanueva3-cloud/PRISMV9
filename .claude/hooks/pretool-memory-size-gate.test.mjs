// tier: T0 — test suite paired with the T0 pretool-memory-size-gate.mjs (not wired as a hook itself; the validator regex requires T0..T4)
/**
 * pretool-memory-size-gate.test.mjs — paired with pretool-memory-size-gate.mjs.
 *
 * Test plan per state/shared/specs/UNITS/U-MEMORY-COMPRESS-V2.md:
 *   1. hard-block        — Edit at 23000B with +100B append → block
 *   2. pass-through      — Edit at 23000B with -200B trim → allow
 *   3. bypass knob       — PRISM_MEMORY_APPEND_OK=1 → allow (logged in reason)
 *   4. watchdog non-reg  — stop-memory-size-watchdog.mjs still loads/exports
 *
 * Coverage floor (comprehensive-build-enforce):
 *   happy + ≥3 failure modes + ≥2 adversarial + ≥3 variability configs.
 *
 * Tests BOTH the pure core (fast, in-process) AND the hook I/O contract via a
 * subprocess oracle — the "hermetic fakes don't prove production wiring" lesson
 * from U-INTEG-FIX-P0 (RGS-TOOL-AUTOINVOKE-MS1).
 *
 * Run: node --test H:/prism/.claude/hooks/pretool-memory-size-gate.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  isMemoryFile,
  applyEditToContent,
  simulateEdits,
  decideGate,
  MEMORY_GATE_THRESHOLD,
} from "./pretool-memory-size-gate.mjs";

const HOOK_PATH = fileURLToPath(new URL("./pretool-memory-size-gate.mjs", import.meta.url));

// ─── isMemoryFile ────────────────────────────────────────────────────────

test("isMemoryFile: canonical Windows path under projects/H--PRISM matches", () => {
  assert.equal(isMemoryFile("C:/Users/wompu/.claude/projects/H--PRISM/memory/MEMORY.md"), true);
});

test("isMemoryFile: case-insensitive match on project dir (H--PRISM vs H--prism)", () => {
  assert.equal(isMemoryFile("C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md"), true);
});

test("isMemoryFile: backslashes (Windows native) normalize and match", () => {
  assert.equal(isMemoryFile("C:\\Users\\wompu\\.claude\\projects\\H--PRISM\\memory\\MEMORY.md"), true);
});

test("isMemoryFile: random memory.md outside .claude/projects does NOT match", () => {
  assert.equal(isMemoryFile("C:/some/other/memory.md"), false);
  assert.equal(isMemoryFile("H:/PRISM/state/shared/memory/MEMORY.md"), false);
});

test("isMemoryFile: suffix-after-.md does NOT match — pin the $ anchor (e.g. MEMORY.md.backup)", () => {
  assert.equal(isMemoryFile("C:/Users/wompu/.claude/projects/H--PRISM/memory/MEMORY.md.backup"), false);
  assert.equal(isMemoryFile("C:/Users/wompu/.claude/projects/H--PRISM/memory/MEMORY.md.tmp"), false);
  assert.equal(isMemoryFile("C:/Users/wompu/.claude/projects/H--PRISM/memory/MEMORY.md~"), false);
});

test("isMemoryFile: missing /memory/ segment does NOT match — pin the path-shape contract", () => {
  // /.claude/projects/ is present but the path doesn't end in /memory/memory.md.
  assert.equal(isMemoryFile("C:/Users/wompu/.claude/projects/H--PRISM/MEMORY.md"), false);
  assert.equal(isMemoryFile("C:/Users/wompu/.claude/projects/H--PRISM/data/memory.md"), false);
});

test("isMemoryFile: uppercase MEMORY dir + MEMORY.MD ext still matches (case-insensitive contract)", () => {
  // Source toLowerCase()s before regex, so any case of /MEMORY/MEMORY.MD matches.
  // Pinning this so a future "match case-sensitively" refactor breaks this test.
  assert.equal(isMemoryFile("C:/Users/wompu/.claude/projects/H--PRISM/MEMORY/MEMORY.MD"), true);
});

test("isMemoryFile: empty / null / non-string → false (no crash)", () => {
  assert.equal(isMemoryFile(""), false);
  assert.equal(isMemoryFile(null), false);
  assert.equal(isMemoryFile(undefined), false);
  assert.equal(isMemoryFile(42), false);
  assert.equal(isMemoryFile({}), false);
});

// ─── applyEditToContent ─────────────────────────────────────────────────

test("applyEditToContent: normal single-occurrence replace", () => {
  const r = applyEditToContent("hello world", { old_string: "world", new_string: "claude" });
  assert.equal(r, "hello claude");
});

test("applyEditToContent: replace_all replaces every occurrence", () => {
  const r = applyEditToContent("a a a b", { old_string: "a", new_string: "X", replace_all: true });
  assert.equal(r, "X X X b");
});

test("applyEditToContent: needle absent returns null (signals not-simulable)", () => {
  const r = applyEditToContent("hello", { old_string: "absent", new_string: "z" });
  assert.equal(r, null);
});

test("applyEditToContent: empty old_string without replace_all → prepend (write-shaped)", () => {
  const r = applyEditToContent("body", { old_string: "", new_string: "HEADER\n" });
  assert.equal(r, "HEADER\nbody");
});

test("applyEditToContent: replace_all with empty needle is a no-op (not infinite split)", () => {
  const r = applyEditToContent("body", { old_string: "", new_string: "x", replace_all: true });
  assert.equal(r, "body");
});

test("applyEditToContent: null/non-object inputs → null (never crash)", () => {
  assert.equal(applyEditToContent(null, { old_string: "a", new_string: "b" }), null);
  assert.equal(applyEditToContent("x", null), null);
  assert.equal(applyEditToContent("x", 42), null);
});

test("applyEditToContent: empty edit object {} → content unchanged (undefined→empty prepend semantic)", () => {
  // Per source: missing old_string/new_string default to "" → treated as a
  // "prepend empty string" no-op write. Documented in the source comment.
  // This pins that contract — a future refactor that switches to null here
  // would break the simulateEdits fail-open path.
  assert.equal(applyEditToContent("x", {}), "x");
});

// ─── simulateEdits ──────────────────────────────────────────────────────

test("simulateEdits: top-level Edit shape (old_string/new_string)", () => {
  const r = simulateEdits("hello", { old_string: "hello", new_string: "world" });
  assert.equal(r, "world");
});

test("simulateEdits: MultiEdit edits[] applies sequentially", () => {
  const r = simulateEdits("aaa", {
    edits: [
      { old_string: "a", new_string: "b" },     // aaa → baa
      { old_string: "b", new_string: "c" },     // baa → caa
    ],
  });
  assert.equal(r, "caa");
});

test("simulateEdits: empty edits[] → null (cannot simulate nothing)", () => {
  assert.equal(simulateEdits("anything", { edits: [] }), null);
});

test("simulateEdits: mid-chain unmatched needle → null (whole sim is invalid)", () => {
  const r = simulateEdits("abc", {
    edits: [
      { old_string: "a", new_string: "X" },
      { old_string: "NOPE", new_string: "Y" },  // null
    ],
  });
  assert.equal(r, null);
});

test("simulateEdits: malformed payload → null", () => {
  assert.equal(simulateEdits(null, {}), null);
  assert.equal(simulateEdits("x", null), null);
});

// ─── decideGate — pure decision matrix ──────────────────────────────────

test("decideGate: edit grows past threshold → BLOCK", () => {
  const d = decideGate({ currentBytes: 23000, resultBytes: 23100, threshold: 22000 });
  assert.equal(d.block, true);
  assert.match(d.reason, /BLOCKED/);
  assert.match(d.reason, /22000B target ceiling/);
});

test("decideGate: edit reduces — even if still over threshold → ALLOW (R12: don't block reductions)", () => {
  const d = decideGate({ currentBytes: 23000, resultBytes: 22800, threshold: 22000 });
  assert.equal(d.block, false);
  assert.match(d.reason, /does not grow/);
});

test("decideGate: result stays at-or-under threshold → ALLOW regardless of growth", () => {
  const d = decideGate({ currentBytes: 21000, resultBytes: 21500, threshold: 22000 });
  assert.equal(d.block, false);
  assert.match(d.reason, /under ceiling/);
});

test("decideGate: PRISM_MEMORY_APPEND_OK bypass → ALLOW + bypass reason", () => {
  const d = decideGate({ currentBytes: 23000, resultBytes: 25000, threshold: 22000, appendOk: true });
  assert.equal(d.block, false);
  assert.match(d.reason, /PRISM_MEMORY_APPEND_OK/);
  assert.match(d.reason, /logged/);
});

test("decideGate: un-simulable edit (resultBytes null) → ALLOW (fail-open)", () => {
  const d = decideGate({ currentBytes: 23000, resultBytes: null, threshold: 22000 });
  assert.equal(d.block, false);
  assert.match(d.reason, /not simulable/);
});

test("decideGate: NaN resultBytes → ALLOW (fail-open on adversarial input)", () => {
  const d = decideGate({ currentBytes: 23000, resultBytes: NaN, threshold: 22000 });
  assert.equal(d.block, false);
  assert.match(d.reason, /not simulable/);
});

test("decideGate: Infinity resultBytes → ALLOW (fail-open — Number.isFinite is the gate)", () => {
  const d = decideGate({ currentBytes: 23000, resultBytes: Infinity, threshold: 22000 });
  assert.equal(d.block, false);
  assert.match(d.reason, /not simulable/);
});

test("decideGate: unknown currentBytes → ALLOW (fail-open)", () => {
  const d = decideGate({ currentBytes: NaN, resultBytes: 23100, threshold: 22000 });
  assert.equal(d.block, false);
  assert.match(d.reason, /unknown/);
});

test("decideGate: exact threshold boundary → ALLOW (≤ is the rule)", () => {
  const d = decideGate({ currentBytes: 21000, resultBytes: 22000, threshold: 22000 });
  assert.equal(d.block, false);
  assert.match(d.reason, /under ceiling/);
});

test("decideGate: exact-current edit (no growth, over threshold) → ALLOW", () => {
  const d = decideGate({ currentBytes: 23000, resultBytes: 23000, threshold: 22000 });
  assert.equal(d.block, false);
  assert.match(d.reason, /does not grow/);
});

test("decideGate: threshold+1 boundary — over-ceiling AND current+1 → BLOCK (pins strict-> regression)", () => {
  // A future swap of `>` to `>=` (or `<=` to `<`) would change behavior here.
  // currentBytes = threshold, resultBytes = threshold + 1: smallest possible block.
  const d = decideGate({ currentBytes: 22000, resultBytes: 22001, threshold: 22000 });
  assert.equal(d.block, true);
  assert.match(d.reason, /BLOCKED/);
});

test("decideGate: resultBytes === currentBytes + 1 but ≤ threshold → ALLOW (the < threshold path)", () => {
  const d = decideGate({ currentBytes: 21500, resultBytes: 21501, threshold: 22000 });
  assert.equal(d.block, false);
  assert.match(d.reason, /under ceiling/);
});

test("decideGate: resultBytes === threshold + 1 with no growth (current=threshold+1) → ALLOW", () => {
  // Tightens the boundary: result equals current AND both are over threshold.
  // Should still allow because "does not grow" — pins the AND-clause precisely.
  const d = decideGate({ currentBytes: 22001, resultBytes: 22001, threshold: 22000 });
  assert.equal(d.block, false);
  assert.match(d.reason, /does not grow/);
});

// ─── Variability — 3+ threshold configurations ──────────────────────────

test("decideGate: threshold = default MEMORY_GATE_THRESHOLD (env-driven, 22000 by default)", () => {
  assert.ok(MEMORY_GATE_THRESHOLD >= 1, "default threshold positive");
  const d = decideGate({ currentBytes: MEMORY_GATE_THRESHOLD + 1000, resultBytes: MEMORY_GATE_THRESHOLD + 1100 });
  assert.equal(d.block, true);
});

test("decideGate: threshold = 10000 (low-ceiling configuration)", () => {
  const d = decideGate({ currentBytes: 11000, resultBytes: 11100, threshold: 10000 });
  assert.equal(d.block, true);
});

test("decideGate: threshold = 50000 (high-ceiling configuration — same edit now passes)", () => {
  const d = decideGate({ currentBytes: 11000, resultBytes: 11100, threshold: 50000 });
  assert.equal(d.block, false);
  assert.match(d.reason, /under ceiling/);
});

// ─── Full hook subprocess oracle (the production-wiring proof) ──────────

function runHook(env = {}, payload = null) {
  const stdin = payload === null ? "" : JSON.stringify(payload);
  const r = spawnSync(process.execPath, [HOOK_PATH], {
    input: stdin,
    env: { ...process.env, ...env },
    encoding: "utf-8",
    timeout: 10000,
  });
  return { code: r.status, signal: r.signal, stdout: r.stdout || "", stderr: r.stderr || "" };
}

test("hook E2E: spec scenario — Edit at ~23000B with +100B append → BLOCK (exit 2, JSON reason)", () => {
  let dir;
  try {
    dir = mkdtempSync(join(tmpdir(), "gate-block-"));
    const memFile = join(dir, ".claude", "projects", "H--PRISM", "memory", "MEMORY.md");
    ensureParentDir(memFile);
    const body = "x".repeat(23000);
    writeFileSync(memFile, body);
    // Replace the very last char with that char + a 100-byte tail → +100B net growth.
    const lastChar = body.slice(-1);
    const r = runHook({}, {
      tool_name: "Edit",
      tool_input: {
        file_path: memFile,
        old_string: lastChar,
        new_string: lastChar + "y".repeat(100),
      },
    });
    assert.equal(r.code, 2, `expected exit 2 (block); stderr=${r.stderr}`);
    // Defensive parse — if a future stray console.log poisons stdout before
    // emitBlock writes JSON, slice to the first '{' rather than crashing.
    const out = parseHookJson(r.stdout);
    assert.equal(out.continue, false);
    assert.equal(out.decision, "block");
    assert.match(out.reason, /MEMORY\.md edit BLOCKED/);
  } finally { if (dir) rmSync(dir, { recursive: true, force: true }); }
});

test("hook E2E: spec scenario — Edit at ~23000B with -200B trim → ALLOW (exit 0)", () => {
  const dir = mkdtempSync(join(tmpdir(), "gate-trim-"));
  const memFile = join(dir, ".claude", "projects", "H--PRISM", "memory", "MEMORY.md");
  ensureParentDir(memFile);
  // Use a 200-char marker so the replace_all step removes exactly 200B in one shot.
  const marker = "z".repeat(200);
  const body = "x".repeat(22800) + marker;
  writeFileSync(memFile, body);
  try {
    const r = runHook({}, {
      tool_name: "Edit",
      tool_input: { file_path: memFile, old_string: marker, new_string: "" },
    });
    assert.equal(r.code, 0, `expected exit 0 (allow); stderr=${r.stderr}`);
    assert.equal(r.stdout, "");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("hook E2E: spec scenario — PRISM_MEMORY_APPEND_OK=1 bypass → ALLOW even on growth", () => {
  const dir = mkdtempSync(join(tmpdir(), "gate-bypass-"));
  const memFile = join(dir, ".claude", "projects", "H--PRISM", "memory", "MEMORY.md");
  ensureParentDir(memFile);
  const body = "x".repeat(23000);
  writeFileSync(memFile, body);
  try {
    const r = runHook({ PRISM_MEMORY_APPEND_OK: "1" }, {
      tool_name: "Edit",
      tool_input: {
        file_path: memFile,
        old_string: body.slice(-1),
        new_string: body.slice(-1) + "g".repeat(500),
      },
    });
    assert.equal(r.code, 0, `expected exit 0 (bypass); stderr=${r.stderr}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("hook E2E: PRISM_MEMORY_GROWTH_GATE_DISABLE=1 kill switch → ALLOW immediately", () => {
  const dir = mkdtempSync(join(tmpdir(), "gate-disable-"));
  const memFile = join(dir, ".claude", "projects", "H--PRISM", "memory", "MEMORY.md");
  ensureParentDir(memFile);
  writeFileSync(memFile, "x".repeat(50000)); // way over ceiling — would normally block
  try {
    const r = runHook({ PRISM_MEMORY_GROWTH_GATE_DISABLE: "1" }, {
      tool_name: "Edit",
      tool_input: { file_path: memFile, old_string: "x", new_string: "x".repeat(100), replace_all: true },
    });
    assert.equal(r.code, 0);
    assert.equal(r.stdout, "");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("hook E2E: non-Edit tool (Bash) → ALLOW (gate is scoped)", () => {
  const r = runHook({}, {
    tool_name: "Bash",
    tool_input: { command: "ls -la" },
  });
  assert.equal(r.code, 0);
  assert.equal(r.stdout, "");
});

test("hook E2E: Edit on non-MEMORY.md file → ALLOW (gate is scoped)", () => {
  const dir = mkdtempSync(join(tmpdir(), "gate-other-"));
  const other = join(dir, "other.md");
  writeFileSync(other, "x".repeat(30000));
  try {
    const r = runHook({}, {
      tool_name: "Edit",
      tool_input: { file_path: other, old_string: "x", new_string: "x".repeat(100), replace_all: true },
    });
    assert.equal(r.code, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ─── Failure modes / adversarial via subprocess ─────────────────────────

test("hook E2E: malformed JSON payload → ALLOW (fail-open, never block)", () => {
  const r = spawnSync(process.execPath, [HOOK_PATH], {
    input: "this is not JSON {{{",
    env: process.env,
    encoding: "utf-8",
    timeout: 5000,
  });
  assert.equal(r.status, 0);
});

test("hook E2E: empty stdin → ALLOW (interactive / no payload)", () => {
  const r = runHook({}, null);
  assert.equal(r.code, 0);
});

test("hook E2E: missing tool_name field → ALLOW", () => {
  const r = runHook({}, { tool_input: { file_path: "anywhere" } });
  assert.equal(r.code, 0);
});

test("hook E2E: missing target file (Edit on nonexistent path) → ALLOW (fail-open on unreadable)", () => {
  const r = runHook({}, {
    tool_name: "Edit",
    tool_input: {
      file_path: "C:/Users/anyone/.claude/projects/H--PRISM/memory/MEMORY.md.does-not-exist.42",
      old_string: "x", new_string: "y",
    },
  });
  // Path matches isMemoryFile pattern but file is absent → fail-open per R12.
  assert.equal(r.code, 0);
});

// ─── Non-regression: U-OBS-B1 stop-memory-size-watchdog still loads ────

test("non-regression: stop-memory-size-watchdog.mjs still parses (syntax check, no side-effects)", () => {
  // Per spec: existing watchdog must keep working after we add this gate.
  // We CANNOT dynamic-import it here because the watchdog's top-level may
  // detect main-invocation by argv[1] and write telemetry / read MEMORY.md.
  // `node --check` is the side-effect-free oracle: parses the file, exits
  // non-zero on syntax error, zero on success.
  const watchdog = fileURLToPath(new URL("./stop-memory-size-watchdog.mjs", import.meta.url));
  const r = spawnSync(process.execPath, ["--check", watchdog], {
    encoding: "utf-8",
    timeout: 10000,
  });
  // Check timeout-via-signal FIRST so the failure message is honest if the
  // probe was killed rather than parser-rejected.
  assert.equal(r.signal, null, `watchdog parse killed by signal: ${r.signal}`);
  assert.equal(r.status, 0, `watchdog parse regression: ${r.stderr || r.stdout}`);
});

// ─── Helper ──────────────────────────────────────────────────────────────

/** Ensure the parent directory of `filePath` exists (recursive). */
function ensureParentDir(filePath) {
  const dir = filePath.replace(/[\\/][^\\/]+$/, "");
  mkdirSync(dir, { recursive: true });
}

/**
 * Defensive JSON parse for hook stdout. The hook contract is "single JSON
 * object on stdout for blocks, nothing on allows". A future stray console.log
 * before emitBlock would prepend bytes; this slices to the first '{' to
 * survive that class of bug without crashing the test (R12: surface the bug
 * via the assertion that follows, not a JSON.parse SyntaxError).
 */
function parseHookJson(stdout) {
  const trimmed = (stdout || "").trim();
  const brace = trimmed.indexOf("{");
  if (brace === -1) {
    throw new Error(`hook stdout has no JSON object: ${JSON.stringify(trimmed.slice(0, 120))}`);
  }
  return JSON.parse(trimmed.slice(brace));
}
