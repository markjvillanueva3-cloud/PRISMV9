// Regression tests for precompact-auto-trigger.mjs compact-boundary fix
// (2026-05-15). Protect against the bug where estimateFromBytes() divided the
// ENTIRE transcript size by 3.5 and reported pre-compact bloat as current-
// context tokens (1.43M-token false positive observed in session 6eac1b66).
//
// Uses Node's built-in `node:test` runner so it runs without depending on
// vitest discovery config. Invoke with:
//   node --test H:/prism/.claude/hooks/__tests__/precompact-auto-trigger.test.mjs

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const HOOK = "H:/prism/.claude/hooks/precompact-auto-trigger.mjs";
const CONTEXT_CAP = 1_000_000;

// HERMETICITY (slot:alpha, 2026-06-09): the hook writes per-session dedup markers
// (precompact-auto-soft-fired-<sid>.marker + precompact-pending-<sid>.marker) to a
// HARDCODED shared CACHE_DIR. Tests use FIXED session ids, so a marker leaked by a
// prior run makes the next run's SOFT-inject assertions see a dedup-suppress —
// flaky fail-after-first-run (e.g. test-softlegit-cafebabe) that blocks
// stop_on_failing_tests fleet-wide. Clean ONLY this test's own markers (sids
// containing "test-" or "tta"); NEVER touch a live chat's marker (claude-<hex>,
// whose hex can spell neither token).
const HOOK_CACHE_DIR = path.resolve("H:/prism/.claude/cache");
function cleanTestMarkers() {
  let files;
  try { files = fs.readdirSync(HOOK_CACHE_DIR); } catch { return; }
  for (const f of files) {
    if (!f.startsWith("precompact-") || !f.endsWith(".marker")) continue;
    if (f.includes("test-") || f.includes("tta")) {
      try { fs.rmSync(path.join(HOOK_CACHE_DIR, f), { force: true }); } catch {}
    }
  }
}

let tmpDir;
let transcriptPath;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "precompact-test-"));
  transcriptPath = path.join(tmpDir, "transcript.jsonl");
  cleanTestMarkers(); // start from a clean dedup state (no leaked marker from a prior run)
});

afterEach(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  cleanTestMarkers(); // leave no marker behind for the next run
});

function writeJsonl(entries) {
  fs.writeFileSync(transcriptPath, entries.map(e => JSON.stringify(e)).join("\n") + "\n");
}

function runHook(stdinObj, extraEnv = {}) {
  // Default to isolated tmpdir overrides so tests CANNOT pick up the live
  // state/shared/token-budget-*.json or chat-slots.json. Legacy tests that
  // pre-date U-TA13 expect the byte-estimator / lastAssistantTokens path —
  // an empty sidecar dir forces that fallback. Tests that explicitly want
  // the sidecar path pass overrides via extraEnv.
  const defaultIso = {
    PRISM_TEST_SLOTS_FILE: path.join(tmpDir, "empty-chat-slots.json"),
    PRISM_TEST_SIDECAR_DIR: path.join(tmpDir, "empty-sidecar"),
    // HERMETICITY (U-PRECOMPACT-TEST-HERMETIC, 2026-06-18): pin the thresholds
    // to the hook's DOCUMENTED defaults (SOFT 880000 / HARD 940000, see
    // precompact-auto-trigger.mjs:124-125). The host OS env sets
    // PRECOMPACT_{SOFT,HARD}_TOKENS (e.g. 860000/900000 on this machine, or 99M
    // to silence in prod) which leaks through `...process.env` and makes the
    // 905K SOFT/HARD-boundary tests non-deterministic. Threshold-specific tests
    // (the 99M-clamp, PRECOMPACT_DISABLE) override via extraEnv (spread last).
    PRECOMPACT_SOFT_TOKENS: "880000",
    PRECOMPACT_HARD_TOKENS: "940000",
  };
  // Make sure the empty paths point at things that resolve to "unknown" + no sidecar
  try { fs.writeFileSync(defaultIso.PRISM_TEST_SLOTS_FILE, JSON.stringify({ slots: {} })); } catch {}
  try { fs.mkdirSync(defaultIso.PRISM_TEST_SIDECAR_DIR, { recursive: true }); } catch {}

  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(stdinObj),
    encoding: "utf-8",
    timeout: 10_000,
    env: { ...process.env, ...defaultIso, ...extraEnv },
  });
  if (r.status !== 0 && !r.stdout) {
    throw new Error(`hook crashed: ${r.stderr || r.error?.message || "unknown"}`);
  }
  try { return JSON.parse(r.stdout || "{}"); }
  catch { throw new Error(`hook emitted non-JSON: ${r.stdout?.slice(0, 200)}`); }
}

// U-TA13 helper: stand up an isolated chat-slots.json + token-budget sidecar
// in a tmp dir, hand the paths back via env-var overrides. Avoids the
// "mutate live shared chat-slots.json" anti-pattern (R12 — concurrent peers
// would see the fake slot mid-test).
function makeIsolatedSidecar({ tmpDir, slotName, chatId, sidecarBody }) {
  const slotsFile = path.join(tmpDir, "chat-slots.json");
  const sidecarDir = path.join(tmpDir, "sidecar");
  fs.mkdirSync(sidecarDir, { recursive: true });
  fs.writeFileSync(slotsFile, JSON.stringify({
    schemaVersion: "test",
    slots: { [slotName]: { chatId, lastHeartbeat: new Date().toISOString() } },
  }));
  fs.writeFileSync(path.join(sidecarDir, `token-budget-${slotName}.json`), JSON.stringify(sidecarBody));
  return { PRISM_TEST_SLOTS_FILE: slotsFile, PRISM_TEST_SIDECAR_DIR: sidecarDir };
}

function assistantEntry(totalTokens, opts = {}) {
  return {
    type: "assistant",
    timestamp: opts.timestamp || new Date().toISOString(),
    isCompactSummary: opts.isCompactSummary || false,
    message: {
      content: opts.content || [],
      usage: {
        input_tokens: 0,
        cache_read_input_tokens: totalTokens,
        cache_creation_input_tokens: 0,
      },
    },
  };
}

describe("precompact-auto-trigger compact-boundary fix", () => {
  it("returns silent continue on a fresh small transcript", () => {
    writeJsonl([assistantEntry(50_000)]);
    const out = runHook({
      session_id: "test-fresh-12345678",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
    });
    assert.equal(out.continue, true);
    assert.equal(out.suppressOutput, true);
  });

  it("does NOT hard-block when a compact summary precedes huge pre-compact bytes", () => {
    // 6+ MB of pre-compact noise + isCompactSummary marker + small post-compact tail.
    // Without the fix, byte-estimate would report ~1.7M tokens → HARD BLOCK.
    const noisyTurn = (i) => ({
      type: "user",
      timestamp: new Date(Date.now() - 1000 * (1000 - i)).toISOString(),
      message: { content: "x".repeat(2000) },
    });
    const lines = [];
    for (let i = 0; i < 3000; i++) lines.push(noisyTurn(i));
    lines.push(assistantEntry(420_000, { isCompactSummary: true }));   // boundary
    lines.push(assistantEntry(285_000));                                // post-compact
    writeJsonl(lines);
    const st = fs.statSync(transcriptPath);
    assert.ok(st.size > 5_000_000, `expected >5MB transcript, got ${st.size}`);

    const out = runHook({
      session_id: "test-compact-12345678",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
    });
    // Pre-fix this returned {decision:"block",reason:"CONTEXT AT 1,xxx,xxx TOKENS..."}
    assert.notEqual(out.decision, "block", `unexpected hard-block: ${JSON.stringify(out)}`);
    assert.equal(out.continue, true);
  });

  it("DOES hard-block when post-compact tokens are legitimately high", () => {
    const lines = [
      assistantEntry(100_000, { isCompactSummary: true }),
      assistantEntry(950_000),
    ];
    writeJsonl(lines);
    const out = runHook({
      session_id: "test-hard-12345678",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
    });
    assert.equal(out.decision, "block");
    assert.match(out.reason, /CONTEXT AT|PRECOMPACT/);
  });

  it("falls back to legacy byte-estimate when no compact marker exists", () => {
    writeJsonl([assistantEntry(50_000)]);
    const out = runHook({
      session_id: "test-nocompact-12345678",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
    });
    assert.equal(out.continue, true);
  });

  it("tightened 1.1× cap sanity floor catches broken counts without hard-blocking", () => {
    const lines = [assistantEntry(100_000, { isCompactSummary: true })];
    const noisy = "x".repeat(2_000);
    for (let i = 0; i < 2_500; i++) lines.push({ type: "user", message: { content: noisy } });
    writeJsonl(lines);
    const st = fs.statSync(transcriptPath);
    assert.ok(st.size > CONTEXT_CAP * 1.1 * 3.5, `expected size to exceed sanity floor, got ${st.size}`);

    const out = runHook({
      session_id: "test-sanityfloor-12345678",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
    });
    // Either no block, or sanity-floor branch advisory — never decision:block.
    assert.notEqual(out.decision, "block");
    assert.equal(out.continue, true);
  });

  it("uses the LAST compact summary when the transcript has multiple", () => {
    const lines = [];
    lines.push(assistantEntry(800_000, { isCompactSummary: true }));   // early compact
    const noisy = "y".repeat(1500);
    for (let i = 0; i < 1500; i++) lines.push({ type: "user", message: { content: noisy } });
    lines.push(assistantEntry(200_000, { isCompactSummary: true }));   // last compact
    lines.push(assistantEntry(280_000));                                 // healthy
    writeJsonl(lines);
    const out = runHook({
      session_id: "test-multicompact-12345678",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
    });
    assert.notEqual(out.decision, "block");
    assert.equal(out.continue, true);
  });

  // U-TA13 (2026-05-20) — sidecar-first read order. The byte estimator was
  // silently disabled by the 1.1× sanity floor on every fleet session. These
  // tests pin the sidecar integration that fixes it.
  it("U-TA13: sidecar fresh + low ctx → silent continue (sidecar overrides bytes)", () => {
    // Pathological transcript that WOULD trip the legacy byte estimator past
    // the sanity floor, but the sidecar reports a true 100K tokens.
    const noisy = "z".repeat(2000);
    const lines = [];
    for (let i = 0; i < 3500; i++) lines.push({ type: "user", message: { content: noisy } });
    writeJsonl(lines);

    const env = makeIsolatedSidecar({
      tmpDir,
      slotName: "testta13a",
      chatId: "claude-tta13a01",
      sidecarBody: {
        schemaVersion: "1.0.0",
        capturedAt: new Date().toISOString(),
        ctx: { tokens: 100_000, maxTokens: CONTEXT_CAP, pct: 0.1 },
        zone: "GREEN",
      },
    });
    const out = runHook({
      session_id: "claude-tta13a01-xxxxx-xxxxx-xxxxx",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
    }, env);
    assert.notEqual(out.decision, "block", `unexpected block: ${JSON.stringify(out)}`);
    assert.equal(out.continue, true);
    assert.equal(out.suppressOutput, true, "should be silent — fresh sidecar says ctx is fine");
  });

  it("U-TA13: sidecar fresh + ctx >= HARD → hard block (the actual fix)", () => {
    // The pre-U-TA13 bug: every session with a long-running transcript hit the
    // sanity floor on the byte estimator and the HARD block was SUPPRESSED.
    // With the sidecar, the same scenario now correctly blocks because the
    // sidecar reports an authoritative tokens >= HARD value.
    writeJsonl([assistantEntry(50_000)]);  // small, healthy transcript

    const env = makeIsolatedSidecar({
      tmpDir,
      slotName: "testta13b",
      chatId: "claude-tta13b01",
      sidecarBody: {
        schemaVersion: "1.0.0",
        capturedAt: new Date().toISOString(),
        ctx: { tokens: 945_000, maxTokens: CONTEXT_CAP, pct: 0.945 },
        zone: "RED",
      },
    });
    const out = runHook({
      session_id: "claude-tta13b01-xxxxx-xxxxx-xxxxx",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
    }, env);
    assert.equal(out.decision, "block", `expected hard block, got: ${JSON.stringify(out)}`);
    assert.match(out.reason, /CONTEXT AT|PRECOMPACT/);
  });

  it("U-TA13: stale sidecar (>180s) → falls back to legacy logic", () => {
    writeJsonl([assistantEntry(50_000)]);
    const env = makeIsolatedSidecar({
      tmpDir,
      slotName: "testta13c",
      chatId: "claude-tta13c01",
      sidecarBody: {
        schemaVersion: "1.0.0",
        // capturedAt 4 minutes ago → past the 180s SIDECAR_TTL_MS → stale → ignored
        capturedAt: new Date(Date.now() - 240_000).toISOString(),
        ctx: { tokens: 945_000, maxTokens: CONTEXT_CAP, pct: 0.945 },
        zone: "RED",
      },
    });
    const out = runHook({
      session_id: "claude-tta13c01-xxxxx-xxxxx-xxxxx",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
    }, env);
    // Stale sidecar ignored → falls back to byte estimator → 50k tokens → no block
    assert.notEqual(out.decision, "block");
    assert.equal(out.continue, true);
  });

  it("U-TA13: anti-regression — sidecar with bytes-suspect transcript fires HARD block", () => {
    // The exact scenario from state/shared/precompact-trigger.jsonl: byte
    // estimator reports 1.5M+ tokens. WITHOUT U-TA13, the sanity floor at
    // 1.1× cap SUPPRESSED the block (this was the bug). WITH U-TA13 +
    // sidecar reporting genuine 945K, the block fires correctly.
    const noisy = "z".repeat(2000);
    const lines = [];
    for (let i = 0; i < 3500; i++) lines.push({ type: "user", message: { content: noisy } });
    writeJsonl(lines);
    const st = fs.statSync(transcriptPath);
    assert.ok(st.size / 3.5 > CONTEXT_CAP * 1.1, "transcript large enough to trip sanity floor without sidecar");

    const env = makeIsolatedSidecar({
      tmpDir,
      slotName: "testta13d",
      chatId: "claude-tta13d01",
      sidecarBody: {
        schemaVersion: "1.0.0",
        capturedAt: new Date().toISOString(),
        ctx: { tokens: 945_000, maxTokens: CONTEXT_CAP, pct: 0.945 },
        zone: "RED",
      },
    });
    const out = runHook({
      session_id: "claude-tta13d01-xxxxx-xxxxx-xxxxx",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
    }, env);
    assert.equal(out.decision, "block",
      "REGRESSION: sidecar should have overridden bytes-estimator sanity-floor suppression");
  });

  it("ignores assistant usage from before the most recent compact boundary", () => {
    const lines = [
      assistantEntry(950_000),                                  // pre-compact, would block
      assistantEntry(50_000, { isCompactSummary: true }),       // boundary
      assistantEntry(120_000),                                  // post-compact, healthy
    ];
    writeJsonl(lines);
    const out = runHook({
      session_id: "test-ignorepre-12345678",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
    });
    assert.notEqual(out.decision, "block");
    assert.equal(out.continue, true);
  });

  // ── CURRENT-FORMAT compact boundary (2026-06-10 fix) ──────────────────────
  // Claude Code now marks a compaction with a {"type":"system",
  // "subtype":"compact_boundary"} record, NOT the legacy "isCompactSummary":true
  // flag. The hook's findLastCompactOffset() + lastAssistantTokens() only knew
  // the legacy flag, so for every current-build transcript they counted the
  // WHOLE accumulated file -> a 3.3-3.85MB transcript byte-estimated into the
  // unguarded [HARD, 1.1xCAP] band -> decision:block every tool call -> the
  // alpha constant-compaction loop. These two tests pin both paths.
  const compactBoundary = (preTokens = 700_000) => ({
    type: "system",
    subtype: "compact_boundary",
    content: "Conversation compacted",
    isMeta: false,
    compactMetadata: { trigger: "auto", preTokens },
  });

  it("BYTE PATH: does NOT hard-block when a current compact_boundary precedes huge pre-compact bytes", () => {
    // Pre-compact bloat sized so the WHOLE-file byte estimate lands in the
    // [HARD, 1.1xCAP] block band; post-compact tail is all-user (no assistant
    // usage) so lastAssistantTokens()->null and the BYTE path is exercised.
    const noisy = "x".repeat(2000);
    const lines = [];
    for (let i = 0; i < 1650; i++) lines.push({ type: "user", message: { content: noisy } });
    lines.push(compactBoundary(700_000));                   // CURRENT-format boundary
    for (let i = 0; i < 8; i++) lines.push({ type: "user", message: { content: "ok" } }); // tiny post-compact
    writeJsonl(lines);
    const st = fs.statSync(transcriptPath);
    const wholeEst = Math.floor(st.size / 3.5);
    assert.ok(wholeEst >= 940_000 && wholeEst <= 1_100_000,
      `whole-file estimate must land in the unguarded block band, got ${wholeEst} (${st.size}B)`);
    const out = runHook({
      session_id: "test-cbboundary-12345678",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
    });
    // Pre-fix: findLastCompactOffset misses compact_boundary -> whole file -> HARD block.
    // Post-fix: boundary found -> counts only the tiny post-compact tail -> no block.
    assert.notEqual(out.decision, "block", `unexpected hard-block: ${JSON.stringify(out)}`);
    assert.equal(out.continue, true);
  });

  it("ASSISTANT PATH: ignores a pre-compact ~950K turn across a current compact_boundary", () => {
    // Right after a high-watermark compact, before any post-compact assistant
    // turn exists, lastAssistantTokens() must NOT read the pre-compact assistant
    // usage as current (it is treated as authoritative -> unsuppressed HARD block).
    const lines = [
      assistantEntry(950_000),               // pre-compact high-watermark
      compactBoundary(950_000),              // CURRENT-format boundary
      { type: "user", message: { content: "continue" } }, // no post-compact assistant yet
    ];
    writeJsonl(lines);
    const out = runHook({
      session_id: "test-cbassistant-12345678",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
    });
    // Pre-fix: returns 950K (assistant source, no suppression) -> HARD block -> loop.
    // Post-fix: boundary break -> null -> byte path over a tiny file -> no block.
    assert.notEqual(out.decision, "block", `unexpected hard-block: ${JSON.stringify(out)}`);
    assert.equal(out.continue, true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// SOFT-SANITY-FLOOR (2026-05-21 alpha) — closes the fleet-wide regression
// where the SOFT path emitted `/precompact REQUIRED` messages at byte-
// estimator over-counts, causing chats to compact on false alarms. The
// HARD path already had a sanity guard at line 399; SOFT did not.
// ─────────────────────────────────────────────────────────────────────
describe("precompact-auto-trigger SOFT sanity floor (byte-suspect suppression)", () => {
  it("SUPPRESSES SOFT inject when byte-estimator reports > 1.1× cap (no compact marker)", () => {
    // Build a transcript with ~5.5 MB of noise and NO compact marker. Byte
    // estimator: 5.5 MB / 3.5 ≈ 1.57 M tokens → above 1.1× cap → SUSPECT.
    // Pre-fix: SOFT inject fired with "REQUIRED" message → Claude compacted.
    // Post-fix: SOFT inject is SUPPRESSED, JSONL entry logged.
    const noisy = "y".repeat(2000);
    const lines = [];
    for (let i = 0; i < 3000; i++) lines.push({ type: "user", message: { content: noisy } });
    writeJsonl(lines);
    const st = fs.statSync(transcriptPath);
    assert.ok(st.size / 3.5 > CONTEXT_CAP * 1.1, "transcript must trigger 1.1× cap floor");

    const out = runHook({
      session_id: "test-softsuspect-deadbeef",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
    });
    // Below HARD (which already had its own sanity guard suppressing the block);
    // and above SOFT — the new fix kicks in: no additionalContext emitted.
    assert.equal(out.continue, true, "must allow continuation");
    assert.equal(out.suppressOutput, true, "must suppress output (no inject)");
    assert.notEqual(out.decision, "block", "must not hard-block (suspect estimate)");
    assert.equal(out.hookSpecificOutput, undefined, "must not emit additionalContext on byte-suspect");
  });

  it("STILL emits SOFT inject when sidecar (authoritative source) reports tokens >= SOFT", () => {
    // Sidecar takes precedence over byte-estimator. When the sidecar reports
    // a real 905K (above SOFT 880K, below HARD 940K), the SOFT inject must
    // fire normally — the new suspect-floor is gated by tokenSource === "bytes".
    writeJsonl([assistantEntry(50_000)]); // small transcript; sidecar wins
    // Use a unique slot/chatId per test run to avoid SOFT dedup markers from
    // prior runs in H:/prism/.claude/cache/ — softFiredPath() keys on session_id.
    const uniq = `${Date.now()}${Math.floor(Math.random()*1e6)}`.slice(0, 12);
    const slotName = `tsoft${uniq.slice(0,3)}`;
    const chatHex = `tsoftA${uniq}`.slice(0, 12);
    const env = makeIsolatedSidecar({
      tmpDir,
      slotName,
      chatId: `claude-${chatHex}`,
      sidecarBody: {
        schemaVersion: "1.0.0",
        capturedAt: new Date().toISOString(),
        ctx: { tokens: 905_000, maxTokens: CONTEXT_CAP, pct: 0.905 },
        zone: "RED",
      },
    });
    const out = runHook({
      session_id: `claude-${chatHex}-${uniq}-aaaa-bbbb`,
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
    }, env);
    // Sidecar reports 905K → SOFT (≥ 880K) fires; HARD (≥ 940K) does NOT.
    assert.notEqual(out.decision, "block", `must NOT hard-block at 905K; got: ${JSON.stringify(out)}`);
    assert.equal(out.continue, true);
    assert.ok(out.hookSpecificOutput?.additionalContext,
      `sidecar-sourced SOFT MUST emit inject; got: ${JSON.stringify(out)}`);
    assert.match(out.hookSpecificOutput.additionalContext, /per-agent-handoff\.mjs write --source live-chat/); // model-authored, ban-compliant
  });

  it("ALSO emits SOFT inject when source=bytes but tokens are in SOFT band [880K, HARD)", () => {
    // Build a transcript that puts the byte estimate in the SOFT band
    // (880K—939K — above SOFT, below HARD, well below 1.1× cap). Per-line
    // JSONL overhead averages 2080-2100 chars after JSON.stringify of a
    // content-only user entry, so 1540 entries lands ~3.18 MB → ~910K tokens.
    const noisy = "z".repeat(2000);
    const lines = [];
    for (let i = 0; i < 1540; i++) lines.push({ type: "user", message: { content: noisy } });
    writeJsonl(lines);
    const st = fs.statSync(transcriptPath);
    const estimate = Math.floor(st.size / 3.5);
    assert.ok(estimate >= 880_000 && estimate < 940_000,
      `byte estimate must land in SOFT band [880K, 940K), got ${estimate}`);

    const out = runHook({
      session_id: "test-softlegit-cafebabe",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
    });
    // Legit SOFT — emit the inject (with the new "[byte-estimated]" tag).
    assert.equal(out.continue, true);
    assert.ok(out.hookSpecificOutput?.additionalContext,
      `legit SOFT must emit inject; got: ${JSON.stringify(out)}`);
    assert.match(out.hookSpecificOutput.additionalContext, /per-agent-handoff\.mjs write --source live-chat/); // model-authored, ban-compliant
    assert.match(out.hookSpecificOutput.additionalContext, /byte-estimated/,
      "bytes-sourced inject must carry the [byte-estimated] caveat tag");
  });
});

// AUTO-COMPACTION-MODEL-HANDOFF-MS0 (2026-06-11, slot:alpha) -- U1 model-authored
// handoff directive + U2 threshold clamp (neutralize the stale 99M OS-env disable).
describe("AUTO-COMPACTION-MODEL-HANDOFF-MS0 U1+U2", () => {
  it("U2: clamps an implausible PRECOMPACT_HARD_TOKENS=99M back to default -> HARD block fires at 945K", () => {
    writeJsonl([assistantEntry(945_000)]);
    const out = runHook(
      { session_id: "test-clamp99m-aa01", transcript_path: transcriptPath, hook_event_name: "PreToolUse" },
      { PRECOMPACT_HARD_TOKENS: "99000000", PRECOMPACT_SOFT_TOKENS: "99000000" }
    );
    assert.equal(out.decision, "block", `clamp must restore the HARD block; got ${JSON.stringify(out)}`);
    assert.match(out.reason, /CONTEXT AT|PRECOMPACT/);
  });

  it("U2: PRECOMPACT_DISABLE=1 is the CLEAN disable -> NO block even at 945K with a valid threshold", () => {
    writeJsonl([assistantEntry(945_000)]);
    const out = runHook(
      { session_id: "test-disable-aa02", transcript_path: transcriptPath, hook_event_name: "PreToolUse" },
      { PRECOMPACT_DISABLE: "1", PRECOMPACT_HARD_TOKENS: "940000" }
    );
    assert.notEqual(out.decision, "block", `PRECOMPACT_DISABLE=1 must suppress the block; got ${JSON.stringify(out)}`);
  });

  it("U1: the model handoff-write Bash call passes THROUGH the HARD block (no deadlock)", () => {
    writeJsonl([assistantEntry(945_000)]);
    const out = runHook({
      session_id: "test-handoffwrite-aa03",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: { command: "node H:/prism/.claude/helpers/per-agent-handoff.mjs write --terminal x --resume y --state z" },
    }, { PRECOMPACT_HARD_TOKENS: "940000" });
    assert.notEqual(out.decision, "block", `handoff-write must pass through the HARD block; got ${JSON.stringify(out)}`);
    assert.equal(out.continue, true);
  });

  it("U1: a NON-handoff tool call at 945K is STILL hard-blocked (exemption is narrow), and the block names per-agent-handoff", () => {
    writeJsonl([assistantEntry(945_000)]);
    const out = runHook({
      session_id: "test-nonhandoff-aa04",
      transcript_path: transcriptPath,
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: { command: "git status" },
    }, { PRECOMPACT_HARD_TOKENS: "940000" });
    assert.equal(out.decision, "block", `non-handoff must still block; got ${JSON.stringify(out)}`);
    assert.match(out.reason, /per-agent-handoff\.mjs write --source live-chat/);
  });
});
