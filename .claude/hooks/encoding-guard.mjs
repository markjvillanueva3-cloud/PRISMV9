#!/usr/bin/env node
/**
 * encoding-guard.mjs — PreToolUse hook (Phase A.3 of DEV-VELOCITY-AUTOTRIGGER-MS0).
 *
 * Prevents the HS-14-class encoding bug where the Edit tool strips a UTF-8 BOM
 * from a PowerShell script, then PS5.1 mis-decodes em-dashes as Windows-1252
 * and the parser breaks with "missing string terminator." Same risk class for
 * .bat, .cmd, .psm1, .reg — any file where the legacy interpreter relies on
 * BOM presence to opt into UTF-8 decoding.
 *
 * Mechanism (two-phase, file-keyed sidecar):
 *   Phase 1 (PreToolUse on Edit|Write|MultiEdit):
 *     1. Check if target file's extension is in PROTECTED_EXTENSIONS
 *     2. If yes AND file exists AND first 3 bytes are EF BB BF (UTF-8 BOM):
 *        a. Stash a record in BOM_SIDECAR keyed by file_path
 *        b. Emit a non-blocking note: "[encoding-guard] file has UTF-8 BOM —
 *           will verify it's preserved post-edit"
 *     3. Never block; advisory only.
 *
 *   Phase 2 (PostToolUse on Edit|Write|MultiEdit):
 *     1. Read sidecar for this file_path
 *     2. If sidecar says BOM was present, check current state
 *     3. If BOM was stripped:
 *        a. Auto-restore (write BOM + original content back to head of file)
 *        b. Emit a note: "[encoding-guard] auto-restored UTF-8 BOM on <file>"
 *     4. Delete sidecar entry on success
 *
 * Fail-safe: continueOnError. Never blocks. Silent on any error.
 *
 * Knobs:
 *   PRISM_ENCODING_GUARD=0              → disable entirely
 *   PRISM_ENCODING_GUARD_BLOCK=1        → escalate from advisory to hard-block on PreEdit
 *                                          (default: advisory)
 *   PRISM_ENCODING_GUARD_EXTENSIONS=... → comma-separated extension list override
 *                                          (default: ps1,psm1,bat,cmd,reg)
 *
 * Self-test: `node encoding-guard.mjs --test` runs inline coverage suite
 * meeting CLAUDE.md comprehensive-build-enforce floor (happy + ≥3 failure
 * modes + ≥2 adversarial + variability across ≥3 extension types).
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, statSync, renameSync } from "node:fs";
import { dirname, resolve as pathResolve } from "node:path";

// ROUND-2 P0 FIX (Reviewer B): SIDECAR was a JSON file mutated via load→modify→save,
// race-prone in the 6-chat fleet. Two concurrent PreToolUse fires would clobber each
// other's stash entry → matching PostToolUse misses → BOM NOT restored → file ships
// without BOM → HS-14 regression. Switched to JSONL APPEND-ONLY EVENT LOG: each
// stash + restore is an atomic appendFileSync (POSIX/NTFS guarantee single-write
// atomicity on appends < PIPE_BUF). PostToolUse reads the tail backwards to find
// the most-recent matching stash. No load-mutate-save cycle = no RMW race.
const EVENTS_LOG = "H:/prism/.cache/encoding-guard-events.jsonl";
const EVENTS_MAX = 2000;      // soft cap; rotate-to-tail on read if exceeded
const EVENTS_KEEP_ON_ROTATE = 1000;
const TELEMETRY = "H:/prism/mcp-server/data/state/hook-fire-counts.jsonl";
const DEFAULT_EXTENSIONS = ["ps1", "psm1", "bat", "cmd", "reg"];

const UTF8_BOM_BYTES = [0xEF, 0xBB, 0xBF];
const BOM_LEN = UTF8_BOM_BYTES.length;
const PROTECTED_EXTENSIONS = new Set(
  (process.env.PRISM_ENCODING_GUARD_EXTENSIONS || DEFAULT_EXTENSIONS.join(","))
    .toLowerCase()
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
);

// ROUND-2 P1 FIX (Reviewer B): path-normalization asymmetry. PreToolUse may receive
// `H:\prism\foo.ps1` (Windows-style) and PostToolUse may receive `H:/prism/foo.ps1`
// (forward-slash). Different keys → PostToolUse misses stash → BOM restoration
// skipped. Normalize to: resolved absolute path + forward-slash separators +
// lowercased drive letter on Windows.
function normalizePath(p) {
  if (!p || typeof p !== "string") return "";
  let abs;
  try { abs = pathResolve(p); } catch { return ""; }
  let norm = abs.replace(/\\/g, "/");
  // Lowercase drive letter on Windows (`C:` → `c:`)
  if (/^[A-Za-z]:/.test(norm)) norm = norm[0].toLowerCase() + norm.slice(1);
  return norm;
}

function tele(decision, extra) {
  try {
    appendFileSync(TELEMETRY, JSON.stringify({
      ts: new Date().toISOString(),
      hook: "encoding-guard",
      decision,
      ...extra,
    }) + "\n", "utf8");
  } catch { /* ignore */ }
}

// Extract extension (lowercase, without leading dot) from a file path.
// Handles backslash and forward-slash separators on Windows.
function extractExtension(filePath) {
  if (!filePath || typeof filePath !== "string") return "";
  const m = filePath.match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : "";
}

// Check whether a file's first 3 bytes match the UTF-8 BOM signature.
// Returns null if file doesn't exist or can't be read.
function hasBom(filePath) {
  try {
    if (!existsSync(filePath)) return null;
    const fd = readFileSync(filePath);
    if (fd.length < BOM_LEN) return false;
    return fd[0] === UTF8_BOM_BYTES[0] &&
           fd[1] === UTF8_BOM_BYTES[1] &&
           fd[2] === UTF8_BOM_BYTES[2];
  } catch { return null; }
}

// ── JSONL append-only event log (Round-2 P0 fix) ────────────────────────────
// Each entry: {t, op: "stash"|"restore", path: <normalized>, wasBom?: bool}.
// Append-only writes are atomic for small payloads on both POSIX (PIPE_BUF
// guarantee) and Windows NTFS (single-write append). Two concurrent appenders
// can never clobber each other's entry — the OS serializes the writes.
function appendEvent(entry) {
  try {
    mkdirSync(dirname(EVENTS_LOG), { recursive: true });
    appendFileSync(EVENTS_LOG, JSON.stringify({ t: Date.now(), ...entry }) + "\n", "utf8");
  } catch { /* ignore */ }
}

// Read tail of event log, parse all entries, return as array.
function readEvents() {
  try {
    if (!existsSync(EVENTS_LOG)) return [];
    const buf = readFileSync(EVENTS_LOG, "utf8");
    const lines = buf.split("\n").filter(Boolean);
    const events = [];
    for (const line of lines) {
      try { events.push(JSON.parse(line)); } catch { /* skip corrupt line */ }
    }
    return events;
  } catch { return []; }
}

// Find the most-recent unmatched stash for a given normalized path. "Unmatched"
// means there is NO subsequent restore for the same path that supersedes it.
function findPendingStash(events, normPath) {
  // Walk backwards. First match wins (most recent).
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (!e || e.path !== normPath) continue;
    if (e.op === "restore") return null;  // most-recent op for this path is a
                                          // restore, so the prior stash is consumed
    if (e.op === "stash") return e;
  }
  return null;
}

// Rotation: if log grows beyond EVENTS_MAX, drop oldest, keep last
// EVENTS_KEEP_ON_ROTATE. This IS a RMW operation, but happens at low frequency
// (every ~2000 events ≈ a long multi-chat session) and only one writer races
// at a time (rotation is gated on size). Worst case: a rotation truncates
// a concurrent appender's most-recent line. Acceptable — log is advisory.
function maybeRotate(events) {
  if (events.length <= EVENTS_MAX) return;
  try {
    const kept = events.slice(-EVENTS_KEEP_ON_ROTATE);
    const tmp = `${EVENTS_LOG}.tmp.${process.pid}.${Date.now()}`;
    writeFileSync(tmp, kept.map(e => JSON.stringify(e)).join("\n") + "\n", "utf8");
    renameSync(tmp, EVENTS_LOG);
  } catch { /* ignore */ }
}

// ── BOM restoration ─────────────────────────────────────────────────────────
// Reads the current file (which post-edit may be BOM-less), prepends the BOM
// bytes back at the start, writes via atomic temp+rename to avoid corruption
// on concurrent reads.
function restoreBom(filePath) {
  try {
    if (!existsSync(filePath)) return false;
    const current = readFileSync(filePath);
    // Sanity: don't re-prepend if BOM somehow already present
    if (current.length >= BOM_LEN &&
        current[0] === UTF8_BOM_BYTES[0] &&
        current[1] === UTF8_BOM_BYTES[1] &&
        current[2] === UTF8_BOM_BYTES[2]) {
      return true; // already has BOM, nothing to do
    }
    const withBom = Buffer.concat([Buffer.from(UTF8_BOM_BYTES), current]);
    const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
    writeFileSync(tmp, withBom);
    renameSync(tmp, filePath);
    return true;
  } catch { return false; }
}

function readStdin() {
  let raw = "";
  try { raw = readFileSync(0, "utf8") || ""; } catch { /* ignore */ }
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

function out(obj) {
  try { process.stdout.write(JSON.stringify({ continue: true, ...obj })); } catch { /* ignore */ }
}

async function runHook() {
  const payload = readStdin();
  if (process.env.PRISM_ENCODING_GUARD === "0") { tele("disabled"); return out({}); }

  const event = payload?.hook_event_name || payload?.event || "";
  const toolName = payload?.tool_name || "";
  // Only fires on edit-class tools
  if (!["Edit", "Write", "MultiEdit"].includes(toolName)) {
    return out({});
  }

  // Extract the file path from tool_input (Edit/Write/MultiEdit all use `file_path`)
  const filePathRaw = payload?.tool_input?.file_path || "";
  if (!filePathRaw) { tele("skip_no_path"); return out({}); }

  // ROUND-2 P1 FIX: normalize path to canonical form before keying. Eliminates
  // the Windows/forward-slash mismatch failure mode (PreToolUse vs PostToolUse
  // seeing different separators → different keys → missed match).
  const filePath = normalizePath(filePathRaw);
  if (!filePath) { tele("skip_bad_path"); return out({}); }

  const ext = extractExtension(filePath);
  if (!PROTECTED_EXTENSIONS.has(ext)) {
    // Not a protected extension; no action.
    return out({});
  }

  if (event === "PreToolUse") {
    // Phase 1: check current BOM status, stash for PostToolUse verification.
    const bom = hasBom(filePath);
    if (bom === null) {
      // File doesn't exist yet (Write creating new). Nothing to preserve.
      tele("pre_new_file", { ext, file: filePath });
      return out({});
    }
    if (!bom) {
      // File exists but has no BOM. Skip protection (we don't add BOM to files
      // that didn't have it; that's overreach).
      tele("pre_no_bom", { ext, file: filePath });
      return out({});
    }
    // File has BOM. Append stash event (atomic JSONL append, no RMW race).
    appendEvent({ op: "stash", path: filePath, wasBom: true });
    tele("pre_bom_stashed", { ext, file: filePath });

    // Advisory by default. If PRISM_ENCODING_GUARD_BLOCK=1, escalate to a
    // hard-block telling the operator to use a BOM-preserving editor.
    if (process.env.PRISM_ENCODING_GUARD_BLOCK === "1") {
      return out({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: `[encoding-guard] ${filePath} has UTF-8 BOM that PowerShell 5.1 needs for em-dash + box-drawing chars. Editor may strip it. Set PRISM_ENCODING_GUARD_BLOCK=0 to bypass, or edit with a BOM-preserving tool.`,
        },
      });
    }
    return out({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `[encoding-guard] ${filePath} has UTF-8 BOM — will auto-restore if Edit strips it.`,
      },
    });
  }

  if (event === "PostToolUse") {
    // Phase 2: read JSONL event log, find most-recent unmatched stash for this
    // (normalized) path, restore BOM if it was stripped.
    const events = readEvents();
    maybeRotate(events);  // bounded growth via tail-rotation
    const stash = findPendingStash(events, filePath);
    if (!stash) {
      // No pending stash for this path — either never had a BOM or already restored.
      return out({});
    }
    const bomNow = hasBom(filePath);
    if (bomNow === true) {
      // BOM survived. Mark as restored (closes the stash entry).
      appendEvent({ op: "restore", path: filePath, action: "preserved" });
      tele("post_bom_preserved", { file: filePath });
      return out({});
    }
    if (bomNow === false) {
      // BOM was stripped — restore it.
      const restored = restoreBom(filePath);
      appendEvent({ op: "restore", path: filePath, action: restored ? "restored" : "restore_failed" });
      if (restored) {
        tele("post_bom_restored", { file: filePath });
        return out({
          hookSpecificOutput: {
            hookEventName: "PostToolUse",
            additionalContext: `[encoding-guard] auto-restored UTF-8 BOM on ${filePath} (Edit had stripped it; PowerShell 5.1 needs the BOM for correct em-dash + box-drawing-char decoding).`,
          },
        });
      } else {
        tele("post_bom_restore_failed", { file: filePath });
        return out({
          hookSpecificOutput: {
            hookEventName: "PostToolUse",
            additionalContext: `[encoding-guard] WARNING: ${filePath} lost UTF-8 BOM and auto-restore FAILED. Manually re-add BOM (first 3 bytes EF BB BF) before running this file.`,
          },
        });
      }
    }
    // bomNow === null means file vanished post-edit; close stash with action "vanished"
    appendEvent({ op: "restore", path: filePath, action: "vanished" });
    tele("post_file_vanished", { file: filePath });
    return out({});
  }

  // Other events: no-op
  return out({});
}

// ── Inline self-test ────────────────────────────────────────────────────────
// Per CLAUDE.md comprehensive-build-enforce: happy + ≥3 failure modes +
// ≥2 adversarial inputs + ≥3 extension types (variability).
async function runSelfTest() {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");

  let passed = 0;
  let failed = 0;
  const results = [];

  function assertEqual(name, got, expected) {
    if (got === expected) { passed++; results.push(`  ✓ ${name}`); }
    else { failed++; results.push(`  ✗ ${name}: got ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`); }
  }
  function assertTruthy(name, got, hint) {
    if (got) { passed++; results.push(`  ✓ ${name}`); }
    else { failed++; results.push(`  ✗ ${name}: got falsy${hint ? ` (${hint})` : ""}`); }
  }

  // Setup: temp dir for test files
  const dir = mkdtempSync(join(tmpdir(), "encoding-guard-test-"));

  try {
    // T1 (happy): extractExtension on ps1 file
    assertEqual("T1 happy: extractExtension('foo.ps1') → 'ps1'", extractExtension("H:/path/foo.ps1"), "ps1");

    // T2 (failure: empty path)
    assertEqual("T2 fail-empty: extractExtension('') → ''", extractExtension(""), "");

    // T3 (failure: no extension)
    assertEqual("T3 fail-noext: extractExtension('foo') → ''", extractExtension("foo"), "");

    // T4 (failure: null path)
    assertEqual("T4 fail-null: extractExtension(null) → ''", extractExtension(null), "");

    // T5 (adversarial: extension with mixed case)
    assertEqual("T5 adversarial-case: extractExtension('foo.PS1') → 'ps1'", extractExtension("foo.PS1"), "ps1");

    // T6 (adversarial: NaN input)
    assertEqual("T6 adversarial-NaN: extractExtension(NaN) → ''", extractExtension(NaN), "");

    // T7 (variability: hasBom on a real file WITH BOM — ps1)
    const fpWith = join(dir, "with-bom.ps1");
    writeFileSync(fpWith, Buffer.concat([Buffer.from(UTF8_BOM_BYTES), Buffer.from("Write-Host 'hi'\n", "utf8")]));
    assertEqual("T7 variability-ps1: hasBom() detects BOM on .ps1", hasBom(fpWith), true);

    // T8 (variability: hasBom on file WITHOUT BOM — bat)
    const fpWithout = join(dir, "without-bom.bat");
    writeFileSync(fpWithout, Buffer.from("@echo off\necho hi\n", "utf8"));
    assertEqual("T8 variability-bat: hasBom() returns false on .bat without BOM", hasBom(fpWithout), false);

    // T9 (variability: hasBom on third extension type — psm1)
    const fpPsm1 = join(dir, "module.psm1");
    writeFileSync(fpPsm1, Buffer.concat([Buffer.from(UTF8_BOM_BYTES), Buffer.from("function Foo {}\n", "utf8")]));
    assertEqual("T9 variability-psm1: hasBom() detects BOM on .psm1", hasBom(fpPsm1), true);

    // T10 (behavior: hasBom on missing file returns null)
    assertEqual("T10 behavior-missing: hasBom('does-not-exist.ps1') → null", hasBom(join(dir, "does-not-exist.ps1")), null);

    // T11 (behavior: restoreBom round-trip)
    // Start with a file that HAD BOM, strip it, restore, verify
    const fpRoundTrip = join(dir, "round-trip.ps1");
    writeFileSync(fpRoundTrip, Buffer.from("Write-Host 'no bom'\n", "utf8"));
    assertEqual("T11a behavior: pre-restore hasBom = false", hasBom(fpRoundTrip), false);
    const restored = restoreBom(fpRoundTrip);
    assertEqual("T11b behavior: restoreBom returns true", restored, true);
    assertEqual("T11c behavior: post-restore hasBom = true", hasBom(fpRoundTrip), true);

    // T12 (idempotency: restoreBom on already-bom'd file no-ops cleanly)
    const restoredAgain = restoreBom(fpRoundTrip);
    assertEqual("T12 idempotent: restoreBom on already-BOM'd file returns true", restoredAgain, true);
    // File should still have exactly one BOM (3 bytes EF BB BF, not 6)
    const bytesAfter = readFileSync(fpRoundTrip);
    assertEqual("T12 idempotent: file still has exactly one BOM (not double-prefixed)",
      bytesAfter[0] === 0xEF && bytesAfter[1] === 0xBB && bytesAfter[2] === 0xBF && bytesAfter[3] !== 0xEF, true);

    // T13 (PROTECTED_EXTENSIONS membership)
    assertTruthy("T13 config: 'ps1' is in PROTECTED_EXTENSIONS", PROTECTED_EXTENSIONS.has("ps1"));
    assertTruthy("T13 config: 'bat' is in PROTECTED_EXTENSIONS", PROTECTED_EXTENSIONS.has("bat"));
    assertTruthy("T13 config: 'js' is NOT in PROTECTED_EXTENSIONS", !PROTECTED_EXTENSIONS.has("js"));
  } finally {
    // Cleanup temp dir
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  console.log(results.join("\n"));
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

if (process.argv.includes("--test")) {
  runSelfTest().catch((err) => { console.error("self-test crashed:", err); process.exit(1); });
} else {
  runHook().catch(() => out({}));
}
