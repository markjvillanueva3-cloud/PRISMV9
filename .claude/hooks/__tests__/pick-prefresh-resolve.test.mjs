/**
 * pick-prefresh-resolve.test.mjs — U-FEEDBACK-FORCING (RGS-TOOL-AUTOINVOKE-MS1)
 *
 * Exercises the 4-tier resolveUnitKey fallback chain in pick-prefresh-inject.mjs:
 *   1. composite-typed   — prompt contains MS::U-ID
 *   2. claim-by-bare-id  — prompt has bare U-... + matching fresh slot-task-claim
 *   3. claim-by-slot     — chat's own fresh slot-task-claim (no ID in prompt)
 *   4. current-position  — state/shared/CURRENT_POSITION.md
 * Plus the negative path: no signal at all returns continue:true with no inject.
 *
 * Hermetic: spawns hook as a subprocess, redirects all fallback file reads to
 * temp paths via PRISM_* env knobs. Sidecar + picked-events also go to temp.
 *
 * Run with:
 *   node --test H:/prism/.claude/hooks/__tests__/pick-prefresh-resolve.test.mjs
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const HOOK = "H:/prism/.claude/hooks/pick-prefresh-inject.mjs";

let tmpDir;
let sidecarPath;
let pickedPath;
let claimsPath;
let chatSlotsPath;
let currentPositionPath;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pick-prefresh-resolve-"));
  sidecarPath = path.join(tmpDir, "roadmap-tool-plans.json");
  pickedPath = path.join(tmpDir, "roadmap-tool-plan-picked.jsonl");
  claimsPath = path.join(tmpDir, "slot-task-claims.json");
  chatSlotsPath = path.join(tmpDir, "chat-slots.json");
  currentPositionPath = path.join(tmpDir, "CURRENT_POSITION.md");
});

afterEach(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best-effort */ }
});

function runHook(stdinObj, envOverrides = {}) {
  // Note: the hook reads fallback paths from constants (STATE_DIR-relative).
  // To redirect them, we hijack the STATE_DIR-relative paths the hook hardcodes
  // by passing tmp paths through the dedicated env knobs added in this unit.
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(stdinObj),
    encoding: "utf-8",
    timeout: 12_000,
    env: {
      ...process.env,
      // Explicitly null parent-shell knobs that could silently neutralize the
      // hook (PRISM_PICK_PREFRESH_DISABLE=1 → hook returns continue:true with
      // no inject; PRISM_RGS_TOOL_PLAN_INJECT=0 → tool-plan section suppressed).
      // Both make tests fail-pass undetectably if leaked from the parent.
      PRISM_PICK_PREFRESH_DISABLE: "",
      PRISM_RGS_TOOL_PLAN_INJECT: "",
      PRISM_MEMORY_RELEVANCE: "0", // unrelated hook noise in additionalContext
      PRISM_PICK_PREFRESH_STALE_MIN: "999",
      PRISM_RGS_SIDECAR_PATH: sidecarPath,
      PRISM_RGS_PICKED_PATH: pickedPath,
      PRISM_SLOT_TASK_CLAIMS_PATH: claimsPath,
      PRISM_CHAT_SLOTS_PATH: chatSlotsPath,
      PRISM_CURRENT_POSITION_PATH: currentPositionPath,
      ...envOverrides,
    },
  });
  if (r.error) throw new Error(`spawn error: ${r.error.message}`);
  if (!r.stdout && r.status !== 0) {
    throw new Error(`hook crashed (exit ${r.status}): ${r.stderr?.slice(0, 600)}`);
  }
  try {
    return JSON.parse(r.stdout || "{}");
  } catch {
    throw new Error(`hook emitted non-JSON: ${r.stdout?.slice(0, 300)}`);
  }
}

function writeSidecar(plans, opts = {}) {
  const generatedAt = opts.generatedAt ?? new Date().toISOString();
  fs.writeFileSync(sidecarPath, JSON.stringify({
    schemaVersion: "1.0.0",
    generatedAt,
    degraded: false,
    plans,
  }));
}

function writeClaims(claimsMap) {
  fs.writeFileSync(claimsPath, JSON.stringify({
    schemaVersion: 1,
    lastSweepAt: new Date().toISOString(),
    claims: claimsMap,
  }));
}

function writeChatSlots(slotsMap) {
  // Mirrors the live chat-slots.json shape: { schemaVersion, slots: { name: state } }
  fs.writeFileSync(chatSlotsPath, JSON.stringify({
    schemaVersion: 2,
    slots: slotsMap,
  }));
}

function readPickedEvents() {
  try {
    return fs.readFileSync(pickedPath, "utf-8").trim().split("\n").filter(Boolean).map(JSON.parse);
  } catch { return []; }
}

const SAMPLE_PLAN = {
  pipelines: [{ skill: "forge-triple", confidence: 0.9 }],
  tribal: [{ id: "t1", tip: "fallback-resolved tip", score: 0.7, domain: "harness" }],
  skills: ["forge-triple"],
  mcpTools: [],
  agents: [],
  buildVsIntegrate: "build",
  complexityTier: "S",
  rationale: "U-FEEDBACK-FORCING resolver test",
  source: "test",
};

const freshHeartbeat = () => new Date(Date.now() - 60_000).toISOString();
const freshExpiresAt = () => new Date(Date.now() + 30 * 60_000).toISOString();
const staleHeartbeat = () => new Date(Date.now() - 60 * 60_000).toISOString();
const staleExpiresAt = () => new Date(Date.now() - 60_000).toISOString();

describe("resolveUnitKey — composite-typed (baseline, unchanged)", () => {
  test("composite MS::U-... in prompt resolves with resolutionSource=composite-typed", () => {
    writeSidecar({ "RGS-TOOL-AUTOINVOKE-MS1::U-FEEDBACK-FORCING": SAMPLE_PLAN });
    const out = runHook({
      prompt: "/pick-unit RGS-TOOL-AUTOINVOKE-MS1::U-FEEDBACK-FORCING",
      session_id: "deadbeef-aaaa-bbbb-cccc-000000000001",
    });
    assert.ok(out.hookSpecificOutput?.additionalContext?.includes("RGS-TOOL-AUTOINVOKE-MS1::U-FEEDBACK-FORCING"));
    const events = readPickedEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "picked");
    assert.equal(events[0].resolutionSource, "composite-typed");
    assert.equal(events[0].unitKey, "RGS-TOOL-AUTOINVOKE-MS1::U-FEEDBACK-FORCING");
  });
});

describe("resolveUnitKey — claim-by-bare-id (the load-bearing fix)", () => {
  test("bare U-... + exactly one fresh claim with matching unitId tail resolves", () => {
    const unitKey = "RGS-TOOL-AUTOINVOKE-MS1::U-FEEDBACK-FORCING";
    writeSidecar({ [unitKey]: SAMPLE_PLAN });
    writeClaims({
      lima: {
        slot: "lima",
        chatId: "claude-deadbeef",
        unitId: unitKey,
        claimedAt: new Date().toISOString(),
        lastHeartbeat: freshHeartbeat(),
        expiresAt: freshExpiresAt(),
        phase: "claimed",
      },
    });
    const out = runHook({
      prompt: "/checkin U-FEEDBACK-FORCING",
      session_id: "00000000-aaaa-bbbb-cccc-dddddddddddd", // different sid → not claim-by-slot
    });
    assert.ok(out.hookSpecificOutput?.additionalContext?.includes(unitKey));
    const events = readPickedEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0].resolutionSource, "claim-by-bare-id");
    assert.equal(events[0].unitKey, unitKey);
  });

  test("bare U-... + TWO claims tail-matching same id → ambiguous, falls through", () => {
    writeSidecar({
      "MS-A::U-AMBIG": { ...SAMPLE_PLAN, rationale: "plan-A" },
      "MS-B::U-AMBIG": { ...SAMPLE_PLAN, rationale: "plan-B" },
    });
    writeClaims({
      lima: {
        slot: "lima", chatId: "claude-aaaaaaaa", unitId: "MS-A::U-AMBIG",
        lastHeartbeat: freshHeartbeat(), expiresAt: freshExpiresAt(), phase: "claimed",
      },
      hotel: {
        slot: "hotel", chatId: "claude-bbbbbbbb", unitId: "MS-B::U-AMBIG",
        lastHeartbeat: freshHeartbeat(), expiresAt: freshExpiresAt(), phase: "claimed",
      },
    });
    const out = runHook({ prompt: "/pick-unit U-AMBIG", session_id: "ffff0000-1111-2222-3333-444444444444" });
    // Prefresh block still fires (full trigger) but tool-plan section absent.
    assert.ok(out.hookSpecificOutput?.additionalContext);
    assert.ok(!out.hookSpecificOutput.additionalContext.includes("U-AMBIG"),
      "must not pick either MS when ambiguous — would corrupt feedback telemetry");
    assert.equal(readPickedEvents().length, 0);
  });

  test("bare U-... longer than claim suffix MUST NOT match (regex invariant)", () => {
    // Prompt has U-FOO-BAR-EXTRA; only fresh claim is MS-Z::U-FOO. The
    // `endsWith("::U-FOO-BAR-EXTRA")` check on claim.unitId="MS-Z::U-FOO" is
    // false, so we must NOT resolve. Guards against a future regression that
    // weakens the suffix match to a substring/contains check.
    writeSidecar({
      "MS-Z::U-FOO": { ...SAMPLE_PLAN, rationale: "SHOULD NOT BE PICKED" },
    });
    writeClaims({
      lima: {
        slot: "lima", chatId: "claude-77777777", unitId: "MS-Z::U-FOO",
        lastHeartbeat: freshHeartbeat(), expiresAt: freshExpiresAt(), phase: "claimed",
      },
    });
    const out = runHook({ prompt: "/pick-unit U-FOO-BAR-EXTRA", session_id: "77777777-8888-9999-aaaa-bbbbbbbbbbbb" });
    assert.ok(out.hookSpecificOutput?.additionalContext);
    assert.ok(!out.hookSpecificOutput.additionalContext.includes("MS-Z::U-FOO"),
      "U-FOO-BAR-EXTRA must not match claim MS-Z::U-FOO via suffix");
    assert.equal(readPickedEvents().length, 0);
  });

  test("bare U-... + STALE claim tail-match is ignored (heartbeat expired)", () => {
    const unitKey = "MS-X::U-STALE-CLAIM";
    writeSidecar({ [unitKey]: SAMPLE_PLAN });
    writeClaims({
      lima: {
        slot: "lima", chatId: "claude-cccccccc", unitId: unitKey,
        lastHeartbeat: staleHeartbeat(), expiresAt: staleExpiresAt(), phase: "claimed",
      },
    });
    const out = runHook({ prompt: "/pick-unit U-STALE-CLAIM", session_id: "11112222-3333-4444-5555-666666666666" });
    assert.ok(out.hookSpecificOutput?.additionalContext);
    assert.ok(!out.hookSpecificOutput.additionalContext.includes(unitKey));
    assert.equal(readPickedEvents().length, 0);
  });
});

describe("resolveUnitKey — claim-by-slot (no ID in prompt, chat owns a claim)", () => {
  test("/checkin with no unit id resolves via chat's own slot-task-claim", () => {
    const unitKey = "OBSIDIAN-INTELLIGENCE-MS3::U-IMPLICIT-RESUME";
    writeSidecar({ [unitKey]: SAMPLE_PLAN });
    // sid → chatId = claude-<first 8 hex>
    const sid = "abcdef01-2222-3333-4444-555555555555";
    const chatId = "claude-abcdef01";
    writeChatSlots({
      lima: {
        chatId,
        host: "test",
        lastHeartbeat: new Date().toISOString(),
      },
    });
    writeClaims({
      lima: {
        slot: "lima", chatId, unitId: unitKey,
        lastHeartbeat: freshHeartbeat(), expiresAt: freshExpiresAt(), phase: "building",
      },
    });
    const out = runHook({ prompt: "/checkin", session_id: sid });
    assert.ok(out.hookSpecificOutput?.additionalContext?.includes(unitKey));
    const events = readPickedEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0].resolutionSource, "claim-by-slot");
    assert.equal(events[0].unitKey, unitKey);
  });

  test("/checkin with no unit id and STALE claim does not resolve", () => {
    const unitKey = "MS-Y::U-STALE-SLOT";
    writeSidecar({ [unitKey]: SAMPLE_PLAN });
    const sid = "fedcba98-7777-8888-9999-aaaaaaaaaaaa";
    const chatId = "claude-fedcba98";
    writeChatSlots({ lima: { chatId, host: "test", lastHeartbeat: new Date().toISOString() } });
    writeClaims({
      lima: {
        slot: "lima", chatId, unitId: unitKey,
        lastHeartbeat: staleHeartbeat(), expiresAt: staleExpiresAt(), phase: "claimed",
      },
    });
    const out = runHook({ prompt: "/checkin", session_id: sid });
    assert.ok(!out.hookSpecificOutput?.additionalContext?.includes(unitKey));
    assert.equal(readPickedEvents().length, 0);
  });

  test("/loop alone with no resolvable unit emits fast-path continue:true", () => {
    const out = runHook({ prompt: "/loop", session_id: "00000000-9999-9999-9999-999999999999" });
    assert.ok(!out.hookSpecificOutput, "fast-path must skip hookSpecificOutput entirely");
    assert.equal(out.continue, true);
  });
});

describe("resolveUnitKey — current-position (last-resort)", () => {
  test("CURRENT_POSITION.md with composite token resolves", () => {
    const unitKey = "NN-STACK-INTEG-MS0::U-CP-FALLBACK";
    writeSidecar({ [unitKey]: SAMPLE_PLAN });
    fs.writeFileSync(currentPositionPath, "# Current position\n\nWorking on " + unitKey + " — file 2/3.\n");
    const out = runHook({ prompt: "/pick-unit", session_id: "11111111-2222-3333-4444-555555555555" });
    assert.ok(out.hookSpecificOutput?.additionalContext?.includes(unitKey));
    const events = readPickedEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0].resolutionSource, "current-position");
  });

  test("CURRENT_POSITION.md with frontmatter milestone+unit lines resolves", () => {
    const unitKey = "MS-FM::U-FRONTMATTER";
    writeSidecar({ [unitKey]: SAMPLE_PLAN });
    fs.writeFileSync(currentPositionPath, "---\nmilestone: MS-FM\nunit: U-FRONTMATTER\n---\n");
    const out = runHook({ prompt: "/checkin", session_id: "22222222-3333-4444-5555-666666666666" });
    assert.ok(out.hookSpecificOutput?.additionalContext?.includes(unitKey));
    assert.equal(readPickedEvents()[0].resolutionSource, "current-position");
  });

  test("CURRENT_POSITION.md with commit-subject-style [MS]/U-... resolves", () => {
    const unitKey = "FLEET-REAPER-MS2::U-COMMIT-STYLE";
    writeSidecar({ [unitKey]: SAMPLE_PLAN });
    fs.writeFileSync(currentPositionPath, "[FLEET-REAPER-MS2]/U-COMMIT-STYLE: working\n");
    const out = runHook({ prompt: "/pick-task", session_id: "33333333-4444-5555-6666-777777777777" });
    assert.ok(out.hookSpecificOutput?.additionalContext?.includes(unitKey));
    assert.equal(readPickedEvents()[0].resolutionSource, "current-position");
  });

  test("no signal at all → null resolution, continue:true, no event recorded", () => {
    const out = runHook({ prompt: "/pick-unit just text no id", session_id: "44444444-5555-6666-7777-888888888888" });
    // Prefresh block still fires (it's a full trigger), but no tool-plan + no event
    assert.ok(out.hookSpecificOutput?.additionalContext);
    assert.ok(!/U-/.test(out.hookSpecificOutput.additionalContext.split("─── RGS")[1] || ""));
    assert.equal(readPickedEvents().length, 0);
  });
});

describe("resolveUnitKey — priority chain order (composite > claim-by-bare-id > claim-by-slot > current-position)", () => {
  test("composite in prompt beats matching active claim", () => {
    const promptUnit = "MS-PROMPT::U-WIN";
    const claimUnit  = "MS-CLAIM::U-WIN";
    writeSidecar({ [promptUnit]: { ...SAMPLE_PLAN, rationale: "PROMPT_WINS" } });
    writeClaims({
      lima: {
        slot: "lima", chatId: "claude-deadbeef", unitId: claimUnit,
        lastHeartbeat: freshHeartbeat(), expiresAt: freshExpiresAt(), phase: "claimed",
      },
    });
    runHook({ prompt: `/pick-unit ${promptUnit}`, session_id: "deadbeef-0000-0000-0000-000000000000" });
    const events = readPickedEvents();
    assert.equal(events[0].resolutionSource, "composite-typed");
    assert.equal(events[0].unitKey, promptUnit);
  });

  test("bare-id matching claim beats CURRENT_POSITION.md", () => {
    const claimUnit = "MS-CLAIM::U-MATCH";
    const cpUnit    = "MS-CP::U-MATCH";
    writeSidecar({ [claimUnit]: { ...SAMPLE_PLAN, rationale: "CLAIM_WINS" } });
    writeClaims({
      lima: {
        slot: "lima", chatId: "claude-aaaaaaaa", unitId: claimUnit,
        lastHeartbeat: freshHeartbeat(), expiresAt: freshExpiresAt(), phase: "claimed",
      },
    });
    fs.writeFileSync(currentPositionPath, `working on ${cpUnit}\n`);
    runHook({ prompt: "/checkin U-MATCH", session_id: "ffffffff-0000-0000-0000-000000000000" });
    assert.equal(readPickedEvents()[0].resolutionSource, "claim-by-bare-id");
    assert.equal(readPickedEvents()[0].unitKey, claimUnit);
  });
});
