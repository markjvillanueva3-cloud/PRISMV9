/** SoulAwareFanoutExtenderEngine tests — HZP05. */
import { describe, it, expect } from "vitest";
import {
  SoulAwareFanoutExtenderEngine,
  type ExtenderRequest,
} from "../engines/SoulAwareFanoutExtenderEngine.js";
import type { SlotSoul } from "../engines/SoulFrontmatterReaderEngine.js";

const SOUL = (over: Partial<SlotSoul> = {}): SlotSoul => ({
  slot: "bravo",
  role: "mill-specialist",
  voice: "v",
  tone: "t",
  refuse_list: [],
  preferred_subagent_type: "physics-reviewer",
  domain_filter: "mill|kienzle",
  hermes_role: "specialist-mill",
  body: "",
  ...over,
});

const req = (over: Partial<ExtenderRequest> = {}): ExtenderRequest => ({
  wave_1: [
    { subtask_id: "st1", slot: "bravo", hermes_role: "specialist", score: 5, reason: "domain-match" },
  ],
  subtasks: [
    { subtask_id: "st1", description: "compute kienzle force on titanium", domain: "mill" },
  ],
  ...over,
});

describe("SoulAwareFanoutExtenderEngine.extend — soul routing", () => {
  it("matched soul routes subagent_type", () => {
    const r = SoulAwareFanoutExtenderEngine.extend(req(), { bravo: SOUL() });
    expect(r.assignments[0].subagent_type).toBe("physics-reviewer");
    expect(r.assignments[0].soul_routed).toBe(true);
  });

  it("promotes soul.hermes_role over planner default", () => {
    const r = SoulAwareFanoutExtenderEngine.extend(req(), { bravo: SOUL() });
    expect(r.assignments[0].hermes_role).toBe("specialist-mill");
  });

  it("domain mismatch → no subagent (soul_routed=false)", () => {
    const r = SoulAwareFanoutExtenderEngine.extend(
      req({ subtasks: [{ subtask_id: "st1", description: "lathe rpm", domain: "lathe" }] }),
      { bravo: SOUL() },
    );
    expect(r.assignments[0].subagent_type).toBeNull();
    expect(r.assignments[0].soul_routed).toBe(false);
  });

  it("unresolved soul → assignment kept with null subagent", () => {
    const r = SoulAwareFanoutExtenderEngine.extend(req(), {});
    expect(r.unresolved_slots).toContain("bravo");
    expect(r.assignments[0].subagent_type).toBeNull();
    expect(r.assignments[0].reason).toContain("soul unresolved");
  });
});

describe("SoulAwareFanoutExtenderEngine.extend — refuse_list", () => {
  it("refusal hit removes the assignment + lists it in refused[]", () => {
    const r = SoulAwareFanoutExtenderEngine.extend(
      req({ subtasks: [{ subtask_id: "st1", description: "inline-physics-constants here", domain: "mill" }] }),
      { bravo: SOUL({ refuse_list: ["inline-physics-constants"] }) },
    );
    expect(r.assignments).toEqual([]);
    expect(r.refused.length).toBe(1);
    expect(r.refused[0].refusal).toBe("inline-physics-constants");
  });

  it("refusal token case-insensitive match in description", () => {
    const r = SoulAwareFanoutExtenderEngine.extend(
      req({ subtasks: [{ subtask_id: "st1", description: "Adding STUB-ENGINE-CREATION", domain: "mill" }] }),
      { bravo: SOUL({ refuse_list: ["stub-engine-creation"] }) },
    );
    expect(r.refused.length).toBe(1);
  });

  it("non-refusal description proceeds normally", () => {
    const r = SoulAwareFanoutExtenderEngine.extend(req(), { bravo: SOUL({ refuse_list: ["foo"] }) });
    expect(r.refused).toEqual([]);
    expect(r.assignments.length).toBe(1);
  });
});

describe("SoulAwareFanoutExtenderEngine — validation + render", () => {
  it("missing souls map throws", () => {
    expect(() => SoulAwareFanoutExtenderEngine.extend(req(), null as never)).toThrow();
  });

  it("wave_1 with subtask_id not in subtasks throws", () => {
    expect(() =>
      SoulAwareFanoutExtenderEngine.extend(req({ subtasks: [{ subtask_id: "other", description: "x", domain: "y" }] }), {}),
    ).toThrow();
  });

  it("empty wave_1 → zod throws", () => {
    expect(() => SoulAwareFanoutExtenderEngine.extend(req({ wave_1: [] }), {})).toThrow();
  });

  it("renderResult shows routed + unresolved counts", () => {
    const md = SoulAwareFanoutExtenderEngine.renderResult(
      SoulAwareFanoutExtenderEngine.extend(req(), { bravo: SOUL() }),
    );
    expect(md.includes("[SOUL-EXTEND]")).toBe(true);
    expect(md.includes("routed=1")).toBe(true);
    expect(md.includes("unresolved=0")).toBe(true);
  });

  it("renderResult shows refused count", () => {
    const md = SoulAwareFanoutExtenderEngine.renderResult(
      SoulAwareFanoutExtenderEngine.extend(
        req({ subtasks: [{ subtask_id: "st1", description: "bad-pattern", domain: "mill" }] }),
        { bravo: SOUL({ refuse_list: ["bad-pattern"] }) },
      ),
    );
    expect(md.includes("refused=1")).toBe(true);
  });
});
