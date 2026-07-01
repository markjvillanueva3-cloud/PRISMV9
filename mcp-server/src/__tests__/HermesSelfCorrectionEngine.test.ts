/** HermesSelfCorrectionEngine tests — HZP07. */
import { describe, it, expect } from "vitest";
import {
  HermesSelfCorrectionEngine,
  type CorrectionRequest,
} from "../engines/HermesSelfCorrectionEngine.js";
import type { SlotSoul } from "../engines/SoulFrontmatterReaderEngine.js";

const SOUL = (over: Partial<SlotSoul> = {}): SlotSoul => ({
  slot: "bravo",
  role: "mill-specialist",
  voice: "v",
  tone: "t",
  refuse_list: ["inline-physics-constants"],
  preferred_subagent_type: "physics-reviewer",
  domain_filter: "mill|kienzle",
  hermes_role: "specialist-mill",
  body: "",
  ...over,
});

const req = (over: Partial<CorrectionRequest> = {}): CorrectionRequest => ({
  failure: {
    task_id: "t1",
    task_text: "compute kienzle force on titanium",
    failure_reason: "validation error",
    attempts_so_far: 1,
  },
  recent_corrections: [],
  applicable_refuses: [],
  ...over,
});

describe("HermesSelfCorrectionEngine.propose — failure-mode parsing", () => {
  it("timeout failure → 'reduce scope' step", () => {
    const r = HermesSelfCorrectionEngine.propose(
      req({ failure: { task_id: "t1", task_text: "x", failure_reason: "timeout after 30s", attempts_so_far: 1 } }),
      null,
    );
    expect(r.steps[0]).toMatch(/scope|batch/i);
  });

  it("zod/schema failure → 're-read input schema' step", () => {
    const r = HermesSelfCorrectionEngine.propose(
      req({ failure: { task_id: "t1", task_text: "x", failure_reason: "zod schema rejected", attempts_so_far: 1 } }),
      null,
    );
    expect(r.steps[0]).toMatch(/schema|validation/i);
  });

  it("permission/forbidden failure → sandbox-policy step", () => {
    const r = HermesSelfCorrectionEngine.propose(
      req({ failure: { task_id: "t1", task_text: "x", failure_reason: "permission denied", attempts_so_far: 1 } }),
      null,
    );
    expect(r.steps[0]).toMatch(/sandbox|policy|capability/i);
  });

  it("lock/conflict failure → wait-or-isolate step", () => {
    const r = HermesSelfCorrectionEngine.propose(
      req({ failure: { task_id: "t1", task_text: "x", failure_reason: "index.lock conflict", attempts_so_far: 1 } }),
      null,
    );
    expect(r.steps[0]).toMatch(/wait|worktree|isolate/i);
  });

  it("generic failure → 're-examine reason' step quotes the reason", () => {
    const r = HermesSelfCorrectionEngine.propose(
      req({ failure: { task_id: "t1", task_text: "x", failure_reason: "weird internal error #42", attempts_so_far: 1 } }),
      null,
    );
    expect(r.steps[0]).toContain("Re-examine the failure reason");
  });
});

describe("HermesSelfCorrectionEngine.propose — soul + correction blending", () => {
  it("soul.preferred_subagent_type populates recommend_subagent + dispatch step", () => {
    const r = HermesSelfCorrectionEngine.propose(req(), SOUL());
    expect(r.recommend_subagent).toBe("physics-reviewer");
    expect(r.steps.some((s) => s.includes("physics-reviewer"))).toBe(true);
  });

  it("null soul → no subagent recommendation", () => {
    const r = HermesSelfCorrectionEngine.propose(req(), null);
    expect(r.recommend_subagent).toBeNull();
  });

  it("active_refuses populated when soul refuses match the task text or reason", () => {
    const r = HermesSelfCorrectionEngine.propose(
      req({ failure: { task_id: "t1", task_text: "inline-physics-constants in engine", failure_reason: "x", attempts_so_far: 1 } }),
      SOUL(),
    );
    expect(r.active_refuses).toContain("inline-physics-constants");
  });

  it("recent_corrections above threshold matched + sorted by similarity desc", () => {
    const r = HermesSelfCorrectionEngine.propose(req({
      recent_corrections: [
        { text: "use the safe variant", similarity: 0.65 },
        { text: "check material first", similarity: 0.9 },
        { text: "ignore — unrelated", similarity: 0.1 },
      ],
    }), null);
    expect(r.matched_corrections.length).toBe(2);
    expect(r.matched_corrections[0].similarity).toBe(0.9);
  });

  it("escalate_to_human=true when attempts_so_far ≥ 3", () => {
    const r = HermesSelfCorrectionEngine.propose(
      req({ failure: { task_id: "t1", task_text: "x", failure_reason: "y", attempts_so_far: 3 } }),
      null,
    );
    expect(r.escalate_to_human).toBe(true);
    expect(r.steps[r.steps.length - 1]).toMatch(/escalate/i);
  });
});

describe("HermesSelfCorrectionEngine — validation + render", () => {
  it("attempts_so_far < 1 → zod throws", () => {
    expect(() =>
      HermesSelfCorrectionEngine.propose(req({ failure: { task_id: "t1", task_text: "x", failure_reason: "y", attempts_so_far: 0 } }), null),
    ).toThrow();
  });

  it("similarity > 1 → zod throws on RecentCorrection", () => {
    expect(() =>
      HermesSelfCorrectionEngine.propose(req({ recent_corrections: [{ text: "x", similarity: 1.5 }] }), null),
    ).toThrow();
  });

  it("renderProposal shows PLAN tag normally", () => {
    const md = HermesSelfCorrectionEngine.renderProposal(HermesSelfCorrectionEngine.propose(req(), SOUL()));
    expect(md.includes("[CORRECTION PLAN]")).toBe(true);
  });

  it("renderProposal shows ESCALATE tag on attempts ≥ 3", () => {
    const md = HermesSelfCorrectionEngine.renderProposal(
      HermesSelfCorrectionEngine.propose(
        req({ failure: { task_id: "t1", task_text: "x", failure_reason: "y", attempts_so_far: 5 } }),
        null,
      ),
    );
    expect(md.includes("[CORRECTION ESCALATE]")).toBe(true);
  });
});
