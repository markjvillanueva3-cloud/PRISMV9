/**
 * Tests for FeedbackCollectorEngine (PP-0.19-U-LLM10)
 *
 * Wires a fresh per-test OutcomeTrackingEngine on a tmp dir so we can
 * assert side effects without stomping the real log.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { FeedbackCollectorEngine } from "../engines/FeedbackCollectorEngine.js";
import { OutcomeTrackingEngine } from "../engines/OutcomeTrackingEngine.js";

describe("FeedbackCollectorEngine", () => {
  let dir: string;
  let tracker: OutcomeTrackingEngine;
  let engine: FeedbackCollectorEngine;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "prism-feedback-"));
    tracker = new OutcomeTrackingEngine(dir);
    engine = new FeedbackCollectorEngine({ tracker });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("thumbsUp() logs a good outcome and returns UI summary", async () => {
    const out = await engine.thumbsUp("PRG-1", {
      machineId: "M1",
      operatorId: "mv",
    });
    expect(out.ok).toBe(true);
    expect(out.record?.outcome).toBe("good");
    expect(out.summary).toContain("PRG-1");
    expect(out.summary).toContain("M1");
    expect(out.summary).toContain("mv");
    expect(out.needsAttention).toBe(false);
  });

  it("thumbsDown() logs scrap with the operator-supplied reason", async () => {
    const out = await engine.thumbsDown("PRG-2", "chatter on finish pass", {
      machineId: "M1",
    });
    expect(out.ok).toBe(true);
    expect(out.record?.outcome).toBe("scrap");
    expect(out.record?.metrics?.scrapReason).toBe("chatter on finish pass");
  });

  it("adjusted() records the adjustment payload", async () => {
    const out = await engine.adjusted(
      "PRG-3",
      { feedRatePct: -10, freeText: "reduced feed" },
      { machineId: "M1" },
    );
    expect(out.ok).toBe(true);
    expect(out.record?.outcome).toBe("adjusted");
    expect(out.record?.adjustments?.feedRatePct).toBe(-10);
  });

  it("aborted() appends reason to notes", async () => {
    const out = await engine.aborted("PRG-4", "tool broke", {
      notes: "mid-cycle",
    });
    expect(out.ok).toBe(true);
    expect(out.record?.outcome).toBe("aborted");
    expect(out.record?.notes ?? "").toMatch(/mid-cycle/);
    expect(out.record?.notes ?? "").toMatch(/aborted: tool broke/);
  });

  it("programId required — rejects empty string", async () => {
    const out = await engine.thumbsUp("");
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/programId/);
    expect(out.record).toBeNull();
  });

  it("recordLoose() canonicalizes operator shorthand", async () => {
    const a = await engine.recordLoose("PRG-5", "ok");
    const b = await engine.recordLoose("PRG-5", "scrap");
    const c = await engine.recordLoose("PRG-5", "tuned");
    const d = await engine.recordLoose("PRG-5", "cancelled");
    expect(a.record?.outcome).toBe("good");
    expect(b.record?.outcome).toBe("scrap");
    expect(c.record?.outcome).toBe("adjusted");
    expect(d.record?.outcome).toBe("aborted");
  });

  it("recordLoose() rejects unknown strings with a helpful summary", async () => {
    const out = await engine.recordLoose("PRG-6", "maybe?");
    expect(out.ok).toBe(false);
    expect(out.summary).toMatch(/unknown outcome/);
  });

  it("flags needsAttention after crossing scrap threshold", async () => {
    const e = new FeedbackCollectorEngine({ tracker, scrapAttentionThreshold: 2 });
    await e.thumbsDown("BAD", "first");
    const second = await e.thumbsDown("BAD", "second");
    expect(second.needsAttention).toBe(true);
    expect(second.attentionReason).toMatch(/2 scrap/);
  });

  it("flags needsAttention after crossing adjusted threshold", async () => {
    const e = new FeedbackCollectorEngine({
      tracker,
      adjustedAttentionThreshold: 3,
    });
    await e.adjusted("ADJ", { feedRatePct: -5 });
    await e.adjusted("ADJ", { feedRatePct: -10 });
    const third = await e.adjusted("ADJ", { feedRatePct: -15 });
    expect(third.needsAttention).toBe(true);
    expect(third.attentionReason).toMatch(/3 adjusted/);
  });

  it("programsNeedingAttention() aggregates across all programs", async () => {
    await engine.thumbsDown("A", "x");
    await engine.thumbsDown("A", "y");
    await engine.thumbsUp("B");
    await engine.adjusted("C", { feedRatePct: -10 });
    await engine.adjusted("C", { feedRatePct: -15 });
    await engine.adjusted("C", { feedRatePct: -20 });

    const flagged = await engine.programsNeedingAttention();
    const ids = flagged.map((f) => f.programId).sort();
    expect(ids).toContain("A");
    expect(ids).toContain("C");
    expect(ids).not.toContain("B");
  });

  it("case-insensitive + whitespace tolerant loose mapping", async () => {
    const out = await engine.recordLoose("PRG-X", "  YES  ");
    expect(out.record?.outcome).toBe("good");
  });

  it("summary omits operator/machine clauses cleanly when meta is empty", async () => {
    const out = await engine.thumbsUp("PRG-Y");
    expect(out.summary).toMatch(/Good run logged for PRG-Y\./);
  });
});
