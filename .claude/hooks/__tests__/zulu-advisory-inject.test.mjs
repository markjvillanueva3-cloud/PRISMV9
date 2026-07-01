// ZULU-ORCHESTRATOR-MS0 / U-ZULU06 — tests for zulu-advisory-inject.mjs
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveSlotFromSlotsFile,
  buildChatState,
  renderAdvisory,
  normalizePressure,
} from "../zulu-advisory-inject.mjs";

describe("resolveSlotFromSlotsFile", () => {
  const slotsDoc = {
    slots: {
      bravo: { chatId: "5852a0b9-b93f-42e3-a8f0-deab5898423c" },
      hotel: { chatId: "claude-cb728a14" },
      delta: null,
      echo: { chatId: null },
    },
  };
  it("returns unknown on missing sessionId", () => {
    assert.equal(resolveSlotFromSlotsFile("", slotsDoc), "unknown");
    assert.equal(resolveSlotFromSlotsFile(null, slotsDoc), "unknown");
  });
  it("returns unknown on missing slotsDoc", () => {
    assert.equal(resolveSlotFromSlotsFile("anything", null), "unknown");
    assert.equal(resolveSlotFromSlotsFile("anything", {}), "unknown");
  });
  it("matches exact chatId", () => {
    assert.equal(resolveSlotFromSlotsFile("5852a0b9-b93f-42e3-a8f0-deab5898423c", slotsDoc), "bravo");
  });
  it("matches by claude- prefix substring", () => {
    // claude-cb728a14 minus prefix = "cb728a14"; if full sid contains it, match.
    assert.equal(resolveSlotFromSlotsFile("cb728a14-ffff-0000", slotsDoc), "hotel");
  });
  it("skips null/empty slot entries", () => {
    assert.equal(resolveSlotFromSlotsFile("no-match-here", slotsDoc), "unknown");
  });
  it("returns unknown when no slot matches", () => {
    assert.equal(resolveSlotFromSlotsFile("totally-different-id", slotsDoc), "unknown");
  });
});

describe("buildChatState", () => {
  it("returns null on missing pressure", () => {
    assert.equal(buildChatState(null), null);
    assert.equal(buildChatState(undefined), null);
  });
  it("populates from pressure + flags", () => {
    const s = buildChatState({ level: "critical", tokens: 945000 }, { hasActiveLoop: true, hasHandoff: true });
    assert.equal(s.pressureLevel, "critical");
    assert.equal(s.tokensEstimate, 945000);
    assert.equal(s.hasActiveLoop, true);
    assert.equal(s.hasUnresolvedHandoff, true);
    assert.equal(s.hasUncommittedCriticalWork, true); // conservative default
  });
  it("defaults flags to false when not provided", () => {
    const s = buildChatState({ level: "warn", tokens: 100 });
    assert.equal(s.hasActiveLoop, false);
    assert.equal(s.hasUnresolvedHandoff, false);
    assert.equal(s.hasUncommittedCriticalWork, true); // STILL true — conservative
  });
  it("zero tokens still builds state", () => {
    const s = buildChatState({ level: "clean", tokens: 0 });
    assert.equal(s.tokensEstimate, 0);
    assert.equal(s.pressureLevel, "clean");
  });
  it("rejects boolean=null on flags (strict equality)", () => {
    const s = buildChatState({ level: "warn", tokens: 1 }, { hasActiveLoop: null });
    assert.equal(s.hasActiveLoop, false); // === true only
  });
});

describe("renderAdvisory", () => {
  it("returns null on missing decision", () => {
    assert.equal(renderAdvisory(null, "bravo", {}), null);
    assert.equal(renderAdvisory({}, "bravo", {}), null);
  });
  it("returns null on noop (caller handles gate)", () => {
    assert.equal(renderAdvisory({ action: "noop", reason: "pressure-clean" }, "bravo", { level: "clean" }), null);
  });
  it("renders advise-only block", () => {
    const out = renderAdvisory({ action: "advise-only", reason: "pressure-warn-early-signal" }, "bravo", { level: "warn", tokens: 820000 });
    assert.match(out, /Zulu advisory/);
    assert.match(out, /slot=`bravo`/);
    assert.match(out, /pressure=warn/);
    assert.match(out, /~820K tokens/);
    assert.match(out, /advise-only/);
    assert.match(out, /pressure-warn-early-signal/);
  });
  it("renders /compact block on compact action", () => {
    const out = renderAdvisory(
      { action: "compact", reason: "critical-active-loop-preserve-continuity" },
      "hotel",
      { level: "critical", tokens: 950000 }
    );
    assert.match(out, /\*\*\/compact\*\*/);
    assert.match(out, /preserve-continuity/);
    assert.match(out, /hotel/);
    assert.match(out, /~950K tokens/);
  });
  it("renders /clear block on clear action", () => {
    const out = renderAdvisory(
      { action: "clear", reason: "critical-clean-continuity" },
      "echo",
      { level: "critical", tokens: 970000 }
    );
    assert.match(out, /\*\*\/clear\*\*/);
    assert.match(out, /cheaper than \/compact/);
  });
  it("includes the kill-switch hint", () => {
    const out = renderAdvisory(
      { action: "advise-only", reason: "x" },
      "bravo",
      { level: "warn", tokens: 100 }
    );
    assert.match(out, /PRISM_ZULU_DISABLE=1/);
    assert.match(out, /zulu-opt-in/);
  });
  it("handles unknown action with named fallback", () => {
    const out = renderAdvisory({ action: "weird-action", reason: "test" }, "bravo", { level: "warn", tokens: 1 });
    assert.match(out, /action=weird-action/);
  });
  it("emits no-measurement when tokens missing", () => {
    const out = renderAdvisory({ action: "advise-only", reason: "x" }, "bravo", { level: "warn" });
    assert.match(out, /no measurement/);
  });
});

describe("normalizePressure (the dormancy bug -- readChatPressure shape adapter)", () => {
  // R9: readChatPressure ACTUALLY returns {pressureLevel, tokensEstimate} (verified
  // chat-token-watch.mjs:279-280). The hook consumed {level, tokens}, so main() read
  // pressure.level === undefined and exited every prompt. The old tests hand-built
  // {level, tokens} and never exercised this producer->consumer seam, masking the
  // dormancy. These assert the REAL producer shape -- they FAIL on the pre-fix hook.
  it("maps the real readChatPressure shape {pressureLevel,tokensEstimate} -> {level,tokens}", () => {
    const raw = { sessionId: "x", slot: "bravo", pressureLevel: "critical", tokensEstimate: 945000, found: true };
    const n = normalizePressure(raw);
    assert.equal(n.level, "critical");
    assert.equal(n.tokens, 945000);
  });
  it("the normalized object feeds buildChatState end to end", () => {
    const n = normalizePressure({ pressureLevel: "warn", tokensEstimate: 820000 });
    const s = buildChatState(n, { hasActiveLoop: false });
    assert.equal(s.pressureLevel, "warn");
    assert.equal(s.tokensEstimate, 820000);
  });
  it("passes null/undefined through (fail-soft)", () => {
    assert.equal(normalizePressure(null), null);
    assert.equal(normalizePressure(undefined), undefined);
  });
  it("tolerates an already-normalized {level,tokens} object", () => {
    const n = normalizePressure({ level: "warn", tokens: 5 });
    assert.equal(n.level, "warn");
    assert.equal(n.tokens, 5);
  });
});
