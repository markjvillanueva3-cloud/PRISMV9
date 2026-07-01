/**
 * camDispatcher U-CAM-LOOP-ONRAMP round-trip tests (slot:kilo 2026-06-30)
 * =======================================================================
 *
 * PROVES the CLOSE-THE-LOOP CAM producer ON-RAMP: a completed terminal CAM
 * dispatch (toolpath_generate / collision_check_full / post_process) through the
 * LIVE `prism_cam` dispatcher now emits a LABELLED (non-`pending`) outcome into
 * india's training seam (`camOutcomeCaptureWireEngine.recordOutcome`). The
 * dispatcher attaches the emission result to `result._camOutcome`, so a green
 * run means the runner produced a training-usable label, not `pending`.
 *
 * Each test FAILS if a completed CAM run does NOT produce a labelled outcome:
 *   - the `_camOutcome` block is absent (verdict read is undefined), OR
 *   - `_camOutcome.verdict === "pending"` (the un-labelled state the seam skips).
 *
 * END-TO-END proof (not stub): the last describe subscribes india's REAL
 * FeedbackBus singleton and asserts a `prism_cam` collision_check_full round-trip
 * actually fires `outcome.recorded` with a labelled CAM record on the training
 * leg the neural learner consumes.
 *
 * Verdict is derived from the outcome's OWN signals (R12 honest, never faked):
 *   collision_check_full -> CollisionResult.collision_count / has_collision
 *   toolpath_generate    -> collision check on the generated moves+bodies
 *   post_process         -> PostResult.line_count / gcode / CRITICAL warnings
 *
 * Coverage: happy (x3 actions) + >=3 failure modes + >=2 adversarial.
 * Harness mirrors camDispatcher.holderSelect-wire.test.ts (LIVE registerCamDispatcher).
 *
 * @milestone CLOSE-THE-LOOP-CAM
 * @unit U-CAM-LOOP-ONRAMP
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";
import {
  feedbackBusEngine,
  type FeedbackEvent,
} from "../engines/FeedbackBusEngine.js";

// ── LIVE dispatcher round-trip harness (mirrors holderSelect-wire.test) ──────
interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, handler });
  }
}
function newServer(): MockMCPServer {
  const s = new MockMCPServer();
  registerCamDispatcher(s as unknown as { tool: MockMCPServer["tool"] });
  return s;
}
async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, any> }> {
  const tool = server.tools.find((t) => t.name === "prism_cam")!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, any> };
  }
  const text = (raw as { content: { type: string; text: string }[] }).content[0]!.text;
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, data: { rawText: text } };
  }
}

/** The camOutcome attached by the on-ramp (undefined when nothing was recorded). */
interface CamOutcome {
  emitted: boolean;
  verdict: string;
  bridge: string;
  process: string;
  busOk: boolean;
  storeOk: boolean;
  lineage_id: string;
}
const outcomeOf = (d: Record<string, any>): CamOutcome | undefined =>
  d?._camOutcome as CamOutcome | undefined;

// A pair of axis-aligned bodies far apart -> a clean (0-collision) full check.
const CLEAR_BODIES = [
  { id: "tool", is_moving: true, aabb: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } } },
  { id: "fixture", is_moving: false, aabb: { min: { x: 100, y: 100, z: 0 }, max: { x: 120, y: 120, z: 20 } } },
];
// A moving tool that sweeps straight through a static fixture -> collision.
const COLLIDING_BODIES = [
  { id: "holder", is_moving: true, aabb: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } } },
  { id: "clamp", is_moving: false, aabb: { min: { x: 2, y: 2, z: 2 }, max: { x: 8, y: 8, z: 8 } } },
];
const SWEEP_MOVES = [
  { from: { x: 0, y: 0, z: 0 }, to: { x: 5, y: 5, z: 5 }, type: "feed" },
];

describe("U-CAM-LOOP-ONRAMP — happy: completed CAM dispatches emit LABELLED outcomes", () => {
  // ── collision_check_full: CLEAN check -> labelled SUCCESS (0 collisions) ──
  it("collision_check_full with clear geometry -> non-pending SUCCESS reaches recordOutcome", async () => {
    const s = newServer();
    const r = await call(s, "collision_check_full", {
      bodies: CLEAR_BODIES,
      moves: SWEEP_MOVES,
      safety_margin_mm: 2,
      machine: "VMC-01",
      strategy: "adaptive",
    });
    expect(r.ok).toBe(true);
    // The dispatch itself succeeded (real CollisionDetectionEngine.checkFull ran).
    expect(r.data.has_collision).toBe(false);
    expect(r.data.collision_count).toBe(0);
    // ON-RAMP PROOF: a labelled, non-pending outcome was recorded into india's seam.
    const o = outcomeOf(r.data);
    expect(o?.emitted).toBe(true);
    expect(o?.verdict).not.toBe("pending");   // <- the assertion that FAILS if unlabelled
    expect(o?.verdict).toBe("success");
    expect(o?.bridge).toBe("feature");         // toolpath family routes to "feature"
    expect(o?.process).toBe("mill");           // "VMC-01" -> mill
  });

  // ── collision_check_full: COLLISION -> labelled FAILURE ──────────────────
  it("collision_check_full with colliding geometry -> non-pending FAILURE reaches recordOutcome", async () => {
    const s = newServer();
    const r = await call(s, "collision_check_full", {
      bodies: COLLIDING_BODIES,
      moves: SWEEP_MOVES,
      machine: "lathe-multus",
    });
    expect(r.ok).toBe(true);
    expect(r.data.has_collision).toBe(true);
    expect(r.data.collision_count as number).toBeGreaterThan(0);
    const o = outcomeOf(r.data);
    expect(o?.emitted).toBe(true);
    expect(o?.verdict).not.toBe("pending");
    expect(o?.verdict).toBe("failure");        // derived from real collision_count>0
    expect(o?.process).toBe("lathe");          // "lathe-multus" -> lathe
  });

  // ── toolpath_generate: caller supplies moves+bodies -> collision-labelled ─
  it("toolpath_generate with collision geometry -> labelled outcome via the collision gate", async () => {
    const s = newServer();
    const r = await call(s, "toolpath_generate", {
      // caller-supplied moves + bodies let the on-ramp run the collision gate to LABEL
      moves: SWEEP_MOVES,
      bodies: COLLIDING_BODIES,
      strategy: "contour",
      material: "P20 Steel",
      machine: "VMC-02",
      width_mm: 40, length_mm: 40, depth_mm: 8,
    });
    expect(r.ok).toBe(true);
    const o = outcomeOf(r.data);
    expect(o?.emitted).toBe(true);
    expect(o?.verdict).not.toBe("pending");
    expect(o?.verdict).toBe("failure");        // collision gate on the moves labelled it
    expect(o?.bridge).toBe("feature");
  });

  // ── toolpath_generate: clean moves, no bodies -> labelled SUCCESS ────────
  it("toolpath_generate that produces moves (no collision geometry) -> labelled SUCCESS", async () => {
    const s = newServer();
    const r = await call(s, "toolpath_generate", {
      moves: SWEEP_MOVES,          // observable moves -> a clean completed toolpath
      strategy: "adaptive",
      material: "6061-T6",
      machine: "VMC-03",
      width_mm: 50, length_mm: 50, depth_mm: 10,
    });
    expect(r.ok).toBe(true);
    const o = outcomeOf(r.data);
    expect(o?.emitted).toBe(true);
    expect(o?.verdict).not.toBe("pending");
    expect(o?.verdict).toBe("success");        // moves present, 0 collisions observed
  });

  // ── post_process: emitted g-code -> labelled SUCCESS ─────────────────────
  it("post_process that emits g-code -> non-pending SUCCESS reaches recordOutcome", async () => {
    const s = newServer();
    const r = await call(s, "post_process", {
      moves: [
        { type: "rapid", x: 0, y: 0, z: 5 },
        { type: "feed", x: 10, y: 0, z: -2, f: 600 },
        { type: "feed", x: 10, y: 10, z: -2, f: 600 },
      ],
      controller: "fanuc",
      machine: "VMC-01",
      program_number: 1234,
    });
    expect(r.ok).toBe(true);
    expect((r.data.line_count as number) ?? 0).toBeGreaterThan(0);
    const o = outcomeOf(r.data);
    expect(o?.emitted).toBe(true);
    expect(o?.verdict).not.toBe("pending");
    expect(o?.verdict).toBe("success");
    expect(o?.bridge).toBe("post");            // post family routes to "post"
  });
});

describe("U-CAM-LOOP-ONRAMP — failure modes (the on-ramp never mislabels / never throws)", () => {
  // FAILURE 1: a non-outcome CAM action must NOT attach a camOutcome at all.
  it("FAILURE 1: a non-terminal CAM action (cam_holder_stats) records NO outcome", async () => {
    const s = newServer();
    const r = await call(s, "cam_holder_stats");
    expect(r.ok).toBe(true);
    expect(outcomeOf(r.data)).toBeUndefined();  // only terminal CAM actions produce outcomes
  });

  // FAILURE 2: empty geometry still yields an honest (non-pending) label, no throw.
  it("FAILURE 2: collision_check_full with empty geometry -> honest success, never pending", async () => {
    const s = newServer();
    // empty geometry: the engine returns a real safe result (no bodies to hit).
    const r = await call(s, "collision_check_full", { bodies: [], moves: [], machine: "VMC-01" });
    expect(r.ok).toBe(true);
    const o = outcomeOf(r.data);
    // has_collision:false -> a clean completed check -> labelled success (never pending).
    expect(o?.verdict).not.toBe("pending");
    expect(o?.verdict).toBe("success");
  });

  // FAILURE 3: unknown machine -> process defaults to mill, never throws.
  it("FAILURE 3: unknown machine string defaults process to mill (never throws)", async () => {
    const s = newServer();
    const r = await call(s, "collision_check_full", {
      bodies: CLEAR_BODIES, moves: SWEEP_MOVES, machine: "some-exotic-cell-999",
    });
    expect(r.ok).toBe(true);
    const o = outcomeOf(r.data);
    expect(o?.process).toBe("mill");            // unknown -> mill default
    expect(o?.verdict).toBe("success");
  });

  // FAILURE 4: post_process with no moves -> the real emit is honestly labelled.
  it("FAILURE 4: post_process with no moves still yields a non-pending label", async () => {
    const s = newServer();
    // Even a moveless post emits a program header/footer -> non-empty gcode.
    const r = await call(s, "post_process", { moves: [], controller: "fanuc", machine: "VMC-01" });
    expect(r.ok).toBe(true);
    const o = outcomeOf(r.data);
    expect(o?.verdict).not.toBe("pending");     // real emit -> a real label, never pending
    expect(o?.bridge).toBe("post");
  });
});

describe("U-CAM-LOOP-ONRAMP — adversarial (labelling can't be tricked / can't break a dispatch)", () => {
  // ADVERSARIAL 1: a WEDM machine hint routes process to wedm, not mill.
  it("ADVERSARIAL 1: wedm machine hint routes the outcome process to wedm", async () => {
    const s = newServer();
    const r = await call(s, "collision_check_full", {
      bodies: CLEAR_BODIES, moves: SWEEP_MOVES, machine: "wire_edm_cell",
    });
    expect(r.ok).toBe(true);
    const o = outcomeOf(r.data);
    expect(o?.process).toBe("wedm");
    expect(o?.verdict).toBe("success");
  });

  // ADVERSARIAL 2: the on-ramp must not corrupt the real dispatch payload.
  it("ADVERSARIAL 2: the collision result payload is intact alongside _camOutcome", async () => {
    const s = newServer();
    const r = await call(s, "collision_check_full", { bodies: COLLIDING_BODIES, moves: SWEEP_MOVES });
    expect(r.ok).toBe(true);
    // The real engine fields must survive untouched (the tap only ADDS _camOutcome).
    expect(typeof r.data.collision_count).toBe("number");
    expect(typeof r.data.minimum_clearance_mm).toBe("number");
    expect(r.data.recommendation).toBeTruthy();
    // And the outcome must faithfully reflect the same collision count.
    const o = outcomeOf(r.data);
    expect(o?.verdict).toBe((r.data.collision_count as number) > 0 ? "failure" : "success");
  });
});

describe("U-CAM-LOOP-ONRAMP — END-TO-END: a live prism_cam run reaches india's FeedbackBus", () => {
  let subHandle: ReturnType<typeof feedbackBusEngine.subscribe> | null = null;
  beforeEach(() => {
    feedbackBusEngine.reset();
  });
  afterEach(() => {
    if (subHandle) feedbackBusEngine.unsubscribe(subHandle);
    subHandle = null;
  });

  it("collision_check_full via prism_cam fires outcome.recorded with a LABELLED CAM record", async () => {
    const seen: FeedbackEvent[] = [];
    subHandle = feedbackBusEngine.subscribe("outcome.recorded", (ev) => seen.push(ev));

    const s = newServer();
    const r = await call(s, "collision_check_full", {
      bodies: CLEAR_BODIES, moves: SWEEP_MOVES, machine: "VMC-01", strategy: "adaptive",
    });
    expect(r.ok).toBe(true);
    // storeOk true means the CrossProcessOutcomeStore leg (-> FeedbackBus) fired.
    const o = outcomeOf(r.data);
    expect(o?.storeOk).toBe(true);

    // FeedbackBus fan-out is queueMicrotask-async — let it drain.
    await new Promise((res) => setTimeout(res, 0));

    // PROOF: the live prism_cam dispatch reached india's real FeedbackBus with a
    // labelled record — this is the neural-learner training leg.
    expect(seen.length).toBeGreaterThanOrEqual(1);
    const payload = seen[seen.length - 1]!.payload as {
      bridge: string;
      process: string;
      outcomeKind: string;
    };
    expect(payload.bridge).toBe("feature");
    expect(payload.process).toBe("mill");
    expect(payload.outcomeKind).toBe("success"); // labelled, NOT pending
  });
});
