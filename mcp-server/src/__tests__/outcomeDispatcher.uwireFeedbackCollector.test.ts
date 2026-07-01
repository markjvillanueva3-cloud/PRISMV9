/**
 * outcomeDispatcher U-WIRE-FEEDBACK round-trip tests -- FeedbackCollectorEngine.
 *
 * Validates the 6 new feedback verbs (feedback_thumbs_up / _thumbs_down /
 * _adjusted / _aborted / _record_loose / _needs_attention) wire through
 * prism_outcome and that the engine's canonicalization + needs-attention
 * thresholds behave per its contract. The engine is the operator-facing front
 * door over OutcomeTrackingEngine (which lives in the same dispatcher), so the
 * natural home is outcomeDispatcher, not prism_dev.
 *
 * Two layers of REAL verification, no mock of the SUT:
 *   1. Behavioral -- a real OutcomeTrackingEngine over a throwaway temp dir
 *      (real JSONL round-trip on disk). Reference values (scrapLimit=2,
 *      adjustedLimit=3) are read from the engine body.
 *   2. Dispatcher round-trip -- the real registerOutcomeDispatcher() handler is
 *      captured and invoked, proving the action enum + schema gate + switch case
 *      route to the engine and back as JSON.
 *
 * Wired slot:papa 2026-06-11 /startup-papa /loop /goal (wire-unwired campaign,
 * continues the DR/Backup/KillSwitch quartet -- this is item #4).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-FEEDBACK
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  FeedbackCollectorEngine,
  feedbackCollectorEngine,
} from "../engines/FeedbackCollectorEngine.js";
import { OutcomeTrackingEngine } from "../engines/OutcomeTrackingEngine.js";

const tmpDirs: string[] = [];

/** Real engine over a real, isolated on-disk outcome log. */
function realEngine() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fbcollect-"));
  tmpDirs.push(dir);
  const tracker = new OutcomeTrackingEngine(dir);
  return { engine: new FeedbackCollectorEngine({ tracker }), tracker };
}

/** Real subclass (not a mock) whose log() fails, to exercise the catch path. */
class ThrowingTracker extends OutcomeTrackingEngine {
  override async log(): Promise<never> {
    throw new Error("disk full");
  }
}

afterAll(() => {
  for (const d of tmpDirs) {
    try {
      fs.rmSync(d, { recursive: true, force: true });
    } catch {
      /* best-effort temp cleanup */
    }
  }
});

describe("U-WIRE-FEEDBACK -- happy-path verbs (real round-trip, reference values)", () => {
  it("thumbsUp persists a good outcome with an exact UI summary", async () => {
    const { engine, tracker } = realEngine();
    const r = await engine.thumbsUp("P1", { machineId: "VMC-01", operatorId: "amir" });
    expect(r.ok).toBe(true);
    expect(r.error).toBeNull();
    expect(r.needsAttention).toBe(false);
    expect(r.summary).toBe("Good run logged for P1 on VMC-01 by amir.");
    const rows = await tracker.forProgram("P1");
    expect(rows.length).toBe(1);
    expect(rows[0].outcome).toBe("good");
    expect(rows[0].machineId).toBe("VMC-01");
  });

  it("thumbsDown persists a scrap with the reason captured in metrics.scrapReason", async () => {
    const { engine, tracker } = realEngine();
    await engine.thumbsDown("P1", "chatter");
    const rows = await tracker.forProgram("P1");
    expect(rows[0].outcome).toBe("scrap");
    expect(rows[0].metrics?.scrapReason).toBe("chatter");
  });

  it("aborted appends the reason to notes and persists an aborted outcome", async () => {
    const { engine, tracker } = realEngine();
    await engine.aborted("P3", "operator stopped", { notes: "shift end" });
    const rows = await tracker.forProgram("P3");
    expect(rows[0].outcome).toBe("aborted");
    expect(rows[0].notes).toBe("shift end | aborted: operator stopped");
  });

  it("recordLoose canonicalizes a loose 'scrap' string into the scrap kind", async () => {
    const { engine, tracker } = realEngine();
    const r = await engine.recordLoose("P4", "scrap");
    expect(r.ok).toBe(true);
    expect((await tracker.forProgram("P4"))[0].outcome).toBe("scrap");
  });
});

describe("U-WIRE-FEEDBACK -- needs-attention thresholds (boundary / adversarial)", () => {
  it("scrap needsAttention flips at exactly the 2-scrap threshold", async () => {
    const { engine } = realEngine();
    const r1 = await engine.thumbsDown("P1", "bad finish");
    expect(r1.needsAttention).toBe(false); // 1 scrap < 2
    const r2 = await engine.thumbsDown("P1", "bad finish again");
    expect(r2.needsAttention).toBe(true); // 2 scraps >= 2
    expect(r2.attentionReason).toBe("2 scrap outcomes");
  });

  it("adjusted needsAttention flips at exactly the 3-adjust threshold", async () => {
    const { engine } = realEngine();
    expect((await engine.adjusted("P2", { feedRatePct: 5 })).needsAttention).toBe(false); // 1
    expect((await engine.adjusted("P2", { feedRatePct: 5 })).needsAttention).toBe(false); // 2
    const r3 = await engine.adjusted("P2", { feedRatePct: 5 });
    expect(r3.needsAttention).toBe(true); // 3 >= 3
    expect(r3.attentionReason).toBe("3 adjusted outcomes");
  });

  it("programsNeedingAttention aggregates flagged programs sorted by scraps desc", async () => {
    const { engine } = realEngine();
    await engine.thumbsDown("A", "x");
    await engine.thumbsDown("A", "x"); // A: 2 scraps -> flagged
    await engine.adjusted("B", { feedRatePct: 1 });
    await engine.adjusted("B", { feedRatePct: 1 });
    await engine.adjusted("B", { feedRatePct: 1 }); // B: 3 adjusts -> flagged
    await engine.thumbsDown("C", "x"); // C: 1 scrap -> NOT flagged
    const flagged = await engine.programsNeedingAttention();
    expect(flagged.length).toBe(2);
    expect(flagged[0].programId).toBe("A"); // 2 scraps sorts ahead of B's 0
    expect(flagged[0].scraps).toBe(2);
    expect(flagged[0].reason).toBe("2 scrap outcomes");
    expect(flagged[1].programId).toBe("B");
    expect(flagged[1].reason).toBe("3 adjusted outcomes");
    expect(flagged.some((f) => f.programId === "C")).toBe(false);
  });
});

describe("U-WIRE-FEEDBACK -- fail-loud input + error handling (R12)", () => {
  it("an empty programId is rejected, never persisted", async () => {
    const { engine, tracker } = realEngine();
    const r = await engine.thumbsUp("");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("programId required");
    expect(r.record).toBeNull();
    expect((await tracker.query()).length).toBe(0);
  });

  it("recordLoose rejects an unknown outcome string and persists nothing", async () => {
    const { engine, tracker } = realEngine();
    const bad = await engine.recordLoose("P4", "banana");
    expect(bad.ok).toBe(false);
    expect(bad.record).toBeNull();
    expect(bad.error).toBe("unknown outcome kind");
    expect((await tracker.query()).length).toBe(0);
  });

  it("a storage failure is caught and surfaced, never thrown", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fbcollect-throw-"));
    tmpDirs.push(dir);
    const engine = new FeedbackCollectorEngine({ tracker: new ThrowingTracker(dir) });
    const r = await engine.thumbsUp("P5");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("disk full");
    expect(r.summary).toBe("feedback failed: disk full");
  });

  it("the exported singleton is the real engine (rejects an unknown loose string)", async () => {
    const r = await feedbackCollectorEngine.recordLoose("singleton-probe", "banana");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("unknown outcome kind");
  });
});

describe("U-WIRE-FEEDBACK -- live dispatcher round-trip (prism_outcome handler)", () => {
  let handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;

  beforeAll(async () => {
    const { registerOutcomeDispatcher } = await import(
      "../tools/dispatchers/outcomeDispatcher.js"
    );
    // The dispatcher's feedback cases call the feedbackCollectorEngine singleton,
    // which writes through the outcomeTrackingEngine singleton's default store.
    // Guarantee its directory exists so the write-verb round-trips succeed
    // end-to-end (proving switch-case destructuring + engine dispatch).
    const { outcomeTrackingEngine } = await import(
      "../engines/OutcomeTrackingEngine.js"
    );
    fs.mkdirSync(path.dirname(outcomeTrackingEngine.getLogPath()), { recursive: true });
    const server = {
      tool: (_name: string, _desc: string, _schema: unknown, fn: typeof handler) => {
        handler = fn;
      },
    };
    registerOutcomeDispatcher(server);
  });

  async function call(action: string, params?: Record<string, unknown>) {
    const res = await handler({ action, params });
    return JSON.parse(res.content[0].text) as Record<string, unknown>;
  }

  it("feedback_thumbs_up with a missing programId is rejected by the dispatcher schema gate", async () => {
    const out = await call("feedback_thumbs_up", {});
    expect(out.ok).toBe(false);
    expect(out.error).toBe("invalid_params");
    expect(out.action).toBe("feedback_thumbs_up");
  });

  it("feedback_thumbs_up (valid) routes through the switch case to thumbsUp()", async () => {
    const out = await call("feedback_thumbs_up", {
      programId: "rt-up",
      meta: { machineId: "VMC-09" },
    });
    expect(out.ok).toBe(true);
    expect(out.needsAttention).toBe(false);
    expect(String(out.summary).startsWith("Good run logged for rt-up")).toBe(true);
  });

  it("feedback_thumbs_down (valid) destructures reason + routes to thumbsDown()", async () => {
    const out = await call("feedback_thumbs_down", { programId: "rt-down", reason: "burr" });
    expect(out.ok).toBe(true);
    expect(String(out.summary).startsWith("Scrap logged for rt-down")).toBe(true);
  });

  it("feedback_adjusted (valid) destructures adjustments + routes to adjusted()", async () => {
    const out = await call("feedback_adjusted", {
      programId: "rt-adj",
      adjustments: { feedRatePct: 5 },
    });
    expect(out.ok).toBe(true);
    expect(String(out.summary).startsWith("Adjustment recorded for rt-adj")).toBe(true);
  });

  it("feedback_aborted (valid) destructures reason + routes to aborted()", async () => {
    const out = await call("feedback_aborted", { programId: "rt-ab", reason: "estop" });
    expect(out.ok).toBe(true);
    expect(String(out.summary).startsWith("Aborted run logged for rt-ab")).toBe(true);
  });

  it("feedback_record_loose with an unknown string routes to recordLoose() and returns its rejection", async () => {
    const out = await call("feedback_record_loose", {
      programId: "rt-loose",
      loose: "banana",
    });
    expect(out.ok).toBe(false);
    expect(out.error).toBe("unknown outcome kind");
  });

  it("feedback_needs_attention routes through to programsNeedingAttention() and returns an array", async () => {
    const out = await call("feedback_needs_attention", {});
    expect(out.ok).toBe(true);
    expect(Array.isArray(out.programs)).toBe(true);
  });

  it("an unknown feedback action falls through to the dispatcher default branch", async () => {
    const out = await call("feedback_bogus", {});
    expect(out.ok).toBe(false);
    expect(out.error).toBe("unknown_action");
    expect(out.action).toBe("feedback_bogus");
  });
});
