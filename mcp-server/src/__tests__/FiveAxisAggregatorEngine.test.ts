/**
 * FiveAxisAggregatorEngine tests — MILL-MASTER-P1-U09-L2-AGG
 */

import { describe, expect, it } from "vitest";
import { fiveAxisAggregatorEngine, FiveAxisAggregatorEngine } from "../engines/FiveAxisAggregatorEngine.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";

const EXPECTED_MEMBER_COUNT = 9;

const EXPECTED_MEMBERS = [
  "orchestration",
  "ai_ultra",
  "deep_learning",
  "cam_integration",
  "toolpath_integration",
  "toolpath_synthesis",
  "post",
  "decision",
  "cad_template",
] as const;

describe("FiveAxisAggregatorEngine.list + count", () => {
  it("list() returns exactly the 9 canonical member ids in declaration order", () => {
    const members = fiveAxisAggregatorEngine.list();
    expect(members).toEqual([...EXPECTED_MEMBERS]);
  });

  it("count() returns 9 matching list().length", () => {
    expect(fiveAxisAggregatorEngine.count()).toBe(EXPECTED_MEMBER_COUNT);
    expect(fiveAxisAggregatorEngine.count()).toBe(fiveAxisAggregatorEngine.list().length);
  });

  it("list() members are unique (no duplicates)", () => {
    const members = fiveAxisAggregatorEngine.list();
    const set = new Set(members);
    expect(set.size).toBe(members.length);
  });
});

describe("FiveAxisAggregatorEngine.invoke — happy path", () => {
  it("returns ok:true and the method return value when invoking getRegisteredHooks on cad_template", async () => {
    await fiveAxisAggregatorEngine.invoke("cad_template", "clearAll");
    const out = await fiveAxisAggregatorEngine.invoke("cad_template", "getRegisteredHooks");
    expect(out.ok).toBe(true);
    expect(out.member).toBe("cad_template");
    expect(out.method).toBe("getRegisteredHooks");
    expect(Array.isArray(out.result)).toBe(true);
    expect((out.result as unknown[]).length).toBe(0);
  });

  it("returns the live value of the method on each call (state observable through aggregator)", async () => {
    await fiveAxisAggregatorEngine.invoke("cad_template", "clearAll");
    const before = await fiveAxisAggregatorEngine.invoke("cad_template", "getRegisteredHooks");
    const beforeLen = (before.result as unknown[]).length;
    // clearAll + immediate getRegisteredHooks should be 0, and second read matches.
    const again = await fiveAxisAggregatorEngine.invoke("cad_template", "getRegisteredHooks");
    expect(beforeLen).toBe(0);
    expect((again.result as unknown[]).length).toBe(0);
  });
});

describe("FiveAxisAggregatorEngine.invoke — failure modes", () => {
  it("returns ok:false with 'Unknown member' reason when member is not registered", async () => {
    const out = await fiveAxisAggregatorEngine.invoke("not_a_member" as never, "anything");
    expect(out.ok).toBe(false);
    expect(out.member).toBe("not_a_member");
    expect(out.method).toBe("anything");
    expect(out.reason).toContain("Unknown member");
    expect(out.reason).toContain("not_a_member");
  });

  it("returns ok:false with 'Method not on' reason when method does not exist on the engine", async () => {
    const out = await fiveAxisAggregatorEngine.invoke("decision", "thisMethodDoesNotExistOnDecision");
    expect(out.ok).toBe(false);
    expect(out.member).toBe("decision");
    expect(out.method).toBe("thisMethodDoesNotExistOnDecision");
    expect(out.reason).toMatch(/Method 'thisMethodDoesNotExistOnDecision' not on fiveAxisDecisionEngine/);
  });

  it("returns ok:false when property exists on the engine but is not callable", async () => {
    // 'eventLog' is a static Array property on FiveAxisCADTemplateEngine, not a function.
    const out = await fiveAxisAggregatorEngine.invoke("cad_template", "eventLog");
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/Method 'eventLog' not on fiveAxisCADTemplateEngine/);
  });
});

describe("FiveAxisAggregatorEngine.invocation counter", () => {
  it("starts at 0 on a fresh instance", () => {
    const isolated = new FiveAxisAggregatorEngine();
    expect(isolated.getInvocationCount()).toBe(0);
  });

  it("increments by 1 on a successful invoke", async () => {
    const isolated = new FiveAxisAggregatorEngine();
    await isolated.invoke("cad_template", "clearEventLog");
    expect(isolated.getInvocationCount()).toBe(1);
  });

  it("increments by 1 on a failed invoke (method not on engine)", async () => {
    const isolated = new FiveAxisAggregatorEngine();
    await isolated.invoke("cad_template", "nonexistent_method");
    expect(isolated.getInvocationCount()).toBe(1);
  });

  it("increments by 1 on unknown member (short-circuit path still counts)", async () => {
    const isolated = new FiveAxisAggregatorEngine();
    await isolated.invoke("bogus" as never, "whatever");
    expect(isolated.getInvocationCount()).toBe(1);
  });

  it("accumulates across mixed successes and failures", async () => {
    const isolated = new FiveAxisAggregatorEngine();
    await isolated.invoke("cad_template", "clearEventLog");
    await isolated.invoke("cad_template", "nonexistent_method");
    await isolated.invoke("bogus" as never, "whatever");
    expect(isolated.getInvocationCount()).toBe(3);
  });
});

describe("FiveAxisAggregatorEngine.getSelfAwareness", () => {
  it("reports the engine name, member count, members, and running counter", async () => {
    const isolated = new FiveAxisAggregatorEngine();
    await isolated.invoke("cad_template", "clearEventLog");
    await isolated.invoke("cad_template", "clearEventLog");
    const awareness = isolated.getSelfAwareness();
    expect(awareness.engine_name).toBe("FiveAxisAggregatorEngine");
    expect(awareness.member_count).toBe(EXPECTED_MEMBER_COUNT);
    expect(awareness.members).toEqual([...EXPECTED_MEMBERS]);
    expect(awareness.invocation_count).toBe(2);
  });

  it("singleton awareness mirrors list()/count() exactly", () => {
    const awareness = fiveAxisAggregatorEngine.getSelfAwareness();
    expect(awareness.member_count).toBe(fiveAxisAggregatorEngine.count());
    expect(awareness.members).toEqual(fiveAxisAggregatorEngine.list());
    expect(awareness.engine_name).toBe("FiveAxisAggregatorEngine");
  });
});

describe("FiveAxisAggregatorEngine adversarial inputs", () => {
  it("treats empty method name as missing method and returns ok:false", async () => {
    const out = await fiveAxisAggregatorEngine.invoke("decision", "");
    expect(out.ok).toBe(false);
    expect(out.method).toBe("");
    expect(out.reason).toContain("Method ''");
    expect(out.reason).toContain("fiveAxisDecisionEngine");
  });

  it("treats undefined method name as missing method rather than throwing", async () => {
    const out = await fiveAxisAggregatorEngine.invoke("decision", undefined as never);
    expect(out.ok).toBe(false);
    expect(out.reason).toContain("not on fiveAxisDecisionEngine");
  });

  it("passes positional args through to the delegated method via spread (extras ignored by target)", async () => {
    const out = await fiveAxisAggregatorEngine.invoke(
      "cad_template",
      "getRegisteredHooks",
      "ignored1",
      42,
      { extra: true },
    );
    expect(out.ok).toBe(true);
    expect(Array.isArray(out.result)).toBe(true);
  });
});

describe("millDispatcher mill_five_axis_aggregate schema", () => {
  const schema = MILL_ACTION_SCHEMAS.mill_five_axis_aggregate!;

  const baseContext = { material: "4140" };

  it("accepts op=list with required material context", () => {
    const parsed = schema.safeParse({ ...baseContext, op: "list" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.op).toBe("list");
      expect(parsed.data.material).toBe("4140");
    }
  });

  it("accepts op=count with required material context", () => {
    const parsed = schema.safeParse({ ...baseContext, op: "count" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.op).toBe("count");
    }
  });

  it("accepts op=self_awareness with required material context", () => {
    const parsed = schema.safeParse({ ...baseContext, op: "self_awareness" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.op).toBe("self_awareness");
    }
  });

  it("accepts op=invoke with member+method+args preserved", () => {
    const parsed = schema.safeParse({
      ...baseContext,
      op: "invoke",
      member: "cad_template",
      method: "clearEventLog",
      args: [],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.op).toBe("invoke");
      expect(parsed.data.member).toBe("cad_template");
      expect(parsed.data.method).toBe("clearEventLog");
      expect(Array.isArray(parsed.data.args)).toBe(true);
    }
  });

  it("rejects missing op field (even with valid material context)", () => {
    const parsed = schema.safeParse({ ...baseContext, member: "cad_template" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some(issue => issue.path.includes("op"))).toBe(true);
    }
  });

  it("rejects missing material field (required by millContext)", () => {
    const parsed = schema.safeParse({ op: "list" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some(issue => issue.path.includes("material"))).toBe(true);
    }
  });

  it("rejects an invalid member value outside the five-axis member enum", () => {
    const parsed = schema.safeParse({
      ...baseContext,
      op: "invoke",
      member: "not_a_valid_member",
      method: "anything",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some(issue => issue.path.includes("member"))).toBe(true);
    }
  });
});
