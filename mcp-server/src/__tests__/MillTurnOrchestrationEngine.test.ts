/**
 * MillTurnOrchestrationEngine tests — MILL-MASTER-P1-U09-L2-AGG
 * Covers list/count, route(ctx) decision, invoke() success + failure paths,
 * and the mill_turn_orchestrate dispatcher schema.
 */

import { describe, expect, it } from "vitest";
import {
  millTurnOrchestrationEngine,
  MillTurnOrchestrationEngine,
} from "../engines/MillTurnOrchestrationEngine.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";

const EXPECTED_MEMBER_COUNT = 2;
const EXPECTED_MEMBERS = ["mill_turn", "swiss"] as const;

// Bar-feeder calc anchors — used to verify a real engine call round-trips through aggregator
const BAR_DIAMETER_MM = 20;
const BAR_LENGTH_MM = 3000;
const PART_LENGTH_MM = 50;
const EXPECTED_PARTS_PER_BAR = 55;

describe("MillTurnOrchestrationEngine.list + count", () => {
  it("list() returns exactly the 2 canonical member ids in declaration order", () => {
    const members = millTurnOrchestrationEngine.list();
    expect(members).toEqual([...EXPECTED_MEMBERS]);
  });

  it("count() returns 2 matching list().length", () => {
    expect(millTurnOrchestrationEngine.count()).toBe(EXPECTED_MEMBER_COUNT);
    expect(millTurnOrchestrationEngine.count()).toBe(millTurnOrchestrationEngine.list().length);
  });

  it("list() members are unique (no duplicates)", () => {
    const members = millTurnOrchestrationEngine.list();
    expect(new Set(members).size).toBe(members.length);
  });
});

describe("MillTurnOrchestrationEngine.route", () => {
  it("routes to swiss when machine_class is explicitly swiss", () => {
    const out = millTurnOrchestrationEngine.route({ machine_class: "swiss" });
    expect(out.selected_member).toBe("swiss");
    expect(out.rationale).toContain("Swiss");
    expect(out.rationale).toContain("MillTurnSwissPipelineEngine");
  });

  it("routes to swiss when has_guide_bushing is true", () => {
    const out = millTurnOrchestrationEngine.route({ has_guide_bushing: true });
    expect(out.selected_member).toBe("swiss");
    expect(out.rationale).toContain("guide bushing");
  });

  it("routes to mill_turn when machine_class is mill-turn", () => {
    const out = millTurnOrchestrationEngine.route({ machine_class: "mill-turn" });
    expect(out.selected_member).toBe("mill_turn");
    expect(out.rationale).toContain("MillTurnCAMEngine");
  });

  it("routes to mill_turn when ctx is empty (no swiss markers)", () => {
    const out = millTurnOrchestrationEngine.route({});
    expect(out.selected_member).toBe("mill_turn");
  });

  it("routes to mill_turn when only sub_spindle or multi_channel is set", () => {
    const sub = millTurnOrchestrationEngine.route({ has_sub_spindle: true });
    expect(sub.selected_member).toBe("mill_turn");
    const multi = millTurnOrchestrationEngine.route({ multi_channel: true });
    expect(multi.selected_member).toBe("mill_turn");
  });

  it("prefers swiss over mill_turn when both guide_bushing and sub_spindle are set", () => {
    const out = millTurnOrchestrationEngine.route({
      has_guide_bushing: true,
      has_sub_spindle: true,
      multi_channel: true,
    });
    expect(out.selected_member).toBe("swiss");
  });
});

describe("MillTurnOrchestrationEngine.invoke — happy path", () => {
  const SWISS_IMPORT_TIMEOUT_MS = 30_000;
  it("invokes swiss calculate with bar_feeder_calc and returns computed parts_per_bar", async () => {
    const out = await millTurnOrchestrationEngine.invoke("swiss", "calculate", {
      action: "bar_feeder_calc",
      params: {
        bar_diameter_mm: BAR_DIAMETER_MM,
        bar_length_mm: BAR_LENGTH_MM,
        part_length_mm: PART_LENGTH_MM,
      },
    });
    expect(out.ok).toBe(true);
    expect(out.member).toBe("swiss");
    expect(out.method).toBe("calculate");
    const result = out.result as { parts_per_bar: number; total_material_per_part_mm: number };
    expect(result.parts_per_bar).toBe(EXPECTED_PARTS_PER_BAR);
    // material = part + cut_off(3) + facing(0.5) = 53.5
    expect(result.total_material_per_part_mm).toBeCloseTo(53.5, 3);
  }, SWISS_IMPORT_TIMEOUT_MS);
});

describe("MillTurnOrchestrationEngine.invoke — failure modes", () => {
  it("returns ok:false with 'Unknown member' reason when member is not registered", async () => {
    const out = await millTurnOrchestrationEngine.invoke("not_a_member" as never, "anything");
    expect(out.ok).toBe(false);
    expect(out.member).toBe("not_a_member");
    expect(out.method).toBe("anything");
    expect(out.reason).toContain("Unknown member");
    expect(out.reason).toContain("not_a_member");
  });

  it("returns ok:false with 'Method not on' reason when method does not exist", async () => {
    const out = await millTurnOrchestrationEngine.invoke("mill_turn", "thisMethodDoesNotExist");
    expect(out.ok).toBe(false);
    expect(out.member).toBe("mill_turn");
    expect(out.reason).toMatch(/Method 'thisMethodDoesNotExist' not on millTurnCAMEngine/);
  });

  it("returns ok:false with thrown-error message when member method throws", async () => {
    // calculate() with an unknown sub-action throws `Unknown mill-turn action: xxx`
    const out = await millTurnOrchestrationEngine.invoke("swiss", "calculate", {
      action: "not_a_valid_swiss_action",
    });
    expect(out.ok).toBe(false);
    expect(out.member).toBe("swiss");
    expect(out.method).toBe("calculate");
    expect(out.reason).toContain("Unknown mill-turn action");
    expect(out.reason).toContain("not_a_valid_swiss_action");
  });

  it("treats empty method name as missing method rather than throwing", async () => {
    const out = await millTurnOrchestrationEngine.invoke("swiss", "");
    expect(out.ok).toBe(false);
    expect(out.method).toBe("");
    expect(out.reason).toContain("Method ''");
  });
});

describe("MillTurnOrchestrationEngine.invocation counter", () => {
  it("starts at 0 on a fresh instance", () => {
    const isolated = new MillTurnOrchestrationEngine();
    expect(isolated.getInvocationCount()).toBe(0);
  });

  it("increments exactly once per invoke call regardless of outcome", async () => {
    const isolated = new MillTurnOrchestrationEngine();
    await isolated.invoke("mill_turn", "nonexistent_method");  // method-not-found path
    expect(isolated.getInvocationCount()).toBe(1);
    await isolated.invoke("bogus" as never, "whatever");       // unknown-member short-circuit
    expect(isolated.getInvocationCount()).toBe(2);
    await isolated.invoke("swiss", "calculate", {              // throw path
      action: "xxx_invalid",
    });
    expect(isolated.getInvocationCount()).toBe(3);
  });

  it("route() does NOT touch the invocation counter", () => {
    const isolated = new MillTurnOrchestrationEngine();
    isolated.route({});
    isolated.route({ machine_class: "swiss" });
    expect(isolated.getInvocationCount()).toBe(0);
  });
});

describe("MillTurnOrchestrationEngine.getSelfAwareness", () => {
  it("reports engine_name, member_count, members, and running counter", async () => {
    const isolated = new MillTurnOrchestrationEngine();
    await isolated.invoke("mill_turn", "nonexistent");
    await isolated.invoke("mill_turn", "nonexistent");
    const awareness = isolated.getSelfAwareness();
    expect(awareness.engine_name).toBe("MillTurnOrchestrationEngine");
    expect(awareness.member_count).toBe(EXPECTED_MEMBER_COUNT);
    expect(awareness.members).toEqual([...EXPECTED_MEMBERS]);
    expect(awareness.invocation_count).toBe(2);
  });

  it("singleton awareness mirrors list()/count() exactly", () => {
    const awareness = millTurnOrchestrationEngine.getSelfAwareness();
    expect(awareness.member_count).toBe(millTurnOrchestrationEngine.count());
    expect(awareness.members).toEqual(millTurnOrchestrationEngine.list());
    expect(awareness.engine_name).toBe("MillTurnOrchestrationEngine");
  });
});

describe("millDispatcher mill_turn_orchestrate schema", () => {
  const schema = MILL_ACTION_SCHEMAS.mill_turn_orchestrate!;
  const baseContext = { material: "303 stainless" };

  it("accepts op=list with required material context", () => {
    const parsed = schema.safeParse({ ...baseContext, op: "list" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.op).toBe("list");
      expect(parsed.data.material).toBe("303 stainless");
    }
  });

  it("accepts op=route with a swiss ctx", () => {
    const parsed = schema.safeParse({
      ...baseContext,
      op: "route",
      ctx: { machine_class: "swiss", has_guide_bushing: true },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.op).toBe("route");
      expect(parsed.data.ctx?.machine_class).toBe("swiss");
    }
  });

  it("accepts op=invoke with member+method+args", () => {
    const parsed = schema.safeParse({
      ...baseContext,
      op: "invoke",
      member: "mill_turn",
      method: "generate",
      args: [{ some: "payload" }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.member).toBe("mill_turn");
      expect(parsed.data.method).toBe("generate");
      expect(Array.isArray(parsed.data.args)).toBe(true);
    }
  });

  it("rejects an invalid member value outside the millTurnMember enum", () => {
    const parsed = schema.safeParse({
      ...baseContext,
      op: "invoke",
      member: "sinker_edm",
      method: "anything",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some(issue => issue.path.includes("member"))).toBe(true);
    }
  });

  it("rejects an invalid ctx.machine_class value", () => {
    const parsed = schema.safeParse({
      ...baseContext,
      op: "route",
      ctx: { machine_class: "laser" },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects missing material field even when op is valid", () => {
    const parsed = schema.safeParse({ op: "list" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some(issue => issue.path.includes("material"))).toBe(true);
    }
  });
});
