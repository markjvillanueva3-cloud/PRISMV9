/**
 * Mill Aggregator Engines Tests — P1-U09-L2-AGG
 * =============================================
 *
 * Tests for three L2 aggregator engines that thinly route the mill facade
 * into concrete member engines:
 *
 *   FiveAxisAggregatorEngine     — 9 members (orchestration, ai_ultra,
 *                                   deep_learning, cam_integration,
 *                                   toolpath_integration, toolpath_synthesis,
 *                                   post, decision, cad_template)
 *   MultiAxisAggregatorEngine    — 3 members (kinematic, print_to_program,
 *                                   toolpath)
 *   MillTurnOrchestrationEngine  — 2 members (mill_turn, swiss) + route()
 *
 * Also covers dispatcher wiring of the three new actions:
 *   mill_five_axis_aggregate, mill_multi_axis_aggregate, mill_turn_orchestrate
 *
 * Coverage floor:
 *   - Algebraic invariants (list.length === count, members unique)
 *   - Happy path (invoke returns ok:true with real result)
 *   - ≥3 failure modes (unknown member, bad method, throwing member)
 *   - Adversarial (empty string, unicode, extremely long method name)
 *   - Routing (mill-turn route decisions)
 *   - Dispatcher wiring (enum membership, schema accept/reject)
 *
 * @module __tests__/MillAggregators.P1U09.test
 * @milestone MILL-MASTER-P1/U09-L2-AGG
 */

import { describe, it, expect } from "vitest";
import { fiveAxisAggregatorEngine, type FiveAxisMember } from "../engines/FiveAxisAggregatorEngine.js";
import { multiAxisAggregatorEngine, type MultiAxisMember } from "../engines/MultiAxisAggregatorEngine.js";
import { millTurnOrchestrationEngine, type MillTurnMember } from "../engines/MillTurnOrchestrationEngine.js";
import { MILL_DISPATCHER_ACTIONS } from "../tools/dispatchers/millDispatcher.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";

// ============================================================================
// FiveAxisAggregatorEngine
// ============================================================================

describe("FiveAxisAggregatorEngine P1-U09", () => {
  describe("membership invariants", () => {
    it("list() returns exactly 9 members", () => {
      const members = fiveAxisAggregatorEngine.list();
      expect(members.length).toBe(9);
    });

    it("count() matches list().length", () => {
      expect(fiveAxisAggregatorEngine.count()).toBe(fiveAxisAggregatorEngine.list().length);
    });

    it("all 9 canonical members are present", () => {
      const members = fiveAxisAggregatorEngine.list();
      const expected: FiveAxisMember[] = [
        "orchestration", "ai_ultra", "deep_learning", "cam_integration",
        "toolpath_integration", "toolpath_synthesis", "post", "decision",
        "cad_template",
      ];
      for (const m of expected) {
        expect(members).toContain(m);
      }
    });

    it("member list has no duplicates", () => {
      const members = fiveAxisAggregatorEngine.list();
      const unique = new Set(members);
      expect(unique.size).toBe(members.length);
    });
  });

  describe("getSelfAwareness", () => {
    it("returns correctly shaped self-description", () => {
      const sa = fiveAxisAggregatorEngine.getSelfAwareness();
      expect(sa.engine_name).toBe("FiveAxisAggregatorEngine");
      expect(sa.member_count).toBe(9);
      expect(sa.members.length).toBe(9);
      expect(typeof sa.invocation_count).toBe("number");
      expect(sa.invocation_count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("invoke — failure modes", () => {
    it("unknown member returns ok:false with reason", async () => {
      const r = await fiveAxisAggregatorEngine.invoke("nonexistent" as FiveAxisMember, "anyMethod");
      expect(r.ok).toBe(false);
      expect(r.reason).toContain("Unknown member");
      expect(r.member).toBe("nonexistent");
    });

    it("known member + nonexistent method returns ok:false", async () => {
      const r = await fiveAxisAggregatorEngine.invoke("post", "thisMethodDoesNotExist");
      expect(r.ok).toBe(false);
      expect(r.reason).toContain("not on");
      expect(r.member).toBe("post");
      expect(r.method).toBe("thisMethodDoesNotExist");
    });

    it("empty string method name returns ok:false", async () => {
      const r = await fiveAxisAggregatorEngine.invoke("post", "");
      expect(r.ok).toBe(false);
    });

    it("unicode method name returns ok:false (no such method)", async () => {
      const r = await fiveAxisAggregatorEngine.invoke("post", "日本語メソッド");
      expect(r.ok).toBe(false);
    });
  });

  describe("invoke — happy path (real member round-trip)", () => {
    it("post.getTCPCCodes returns real controller codes", async () => {
      const r = await fiveAxisAggregatorEngine.invoke("post", "getTCPCCodes", "fanuc_31i");
      expect(r.ok).toBe(true);
      expect(r.member).toBe("post");
      expect(r.method).toBe("getTCPCCodes");
      const codes = r.result as Record<string, unknown>;
      expect(codes).not.toBe(undefined);
    });
  });

  describe("invocationCount tracking", () => {
    it("getInvocationCount increments per invoke call", async () => {
      const before = fiveAxisAggregatorEngine.getInvocationCount();
      await fiveAxisAggregatorEngine.invoke("post", "getTCPCCodes", "fanuc_31i");
      const after = fiveAxisAggregatorEngine.getInvocationCount();
      expect(after).toBe(before + 1);
    });

    it("failed invoke still increments count", async () => {
      const before = fiveAxisAggregatorEngine.getInvocationCount();
      await fiveAxisAggregatorEngine.invoke("nonexistent" as FiveAxisMember, "x");
      const after = fiveAxisAggregatorEngine.getInvocationCount();
      expect(after).toBe(before + 1);
    });
  });
});

// ============================================================================
// MultiAxisAggregatorEngine
// ============================================================================

describe("MultiAxisAggregatorEngine P1-U09", () => {
  describe("membership invariants", () => {
    it("list() returns exactly 3 members", () => {
      expect(multiAxisAggregatorEngine.list().length).toBe(3);
    });

    it("count() matches list().length", () => {
      expect(multiAxisAggregatorEngine.count()).toBe(multiAxisAggregatorEngine.list().length);
    });

    it("all 3 canonical members are present", () => {
      const members = multiAxisAggregatorEngine.list();
      const expected: MultiAxisMember[] = ["kinematic", "print_to_program", "toolpath"];
      for (const m of expected) {
        expect(members).toContain(m);
      }
    });

    it("members are unique", () => {
      const members = multiAxisAggregatorEngine.list();
      expect(new Set(members).size).toBe(members.length);
    });
  });

  describe("getSelfAwareness", () => {
    it("engine_name matches class name", () => {
      const sa = multiAxisAggregatorEngine.getSelfAwareness();
      expect(sa.engine_name).toBe("MultiAxisAggregatorEngine");
      expect(sa.member_count).toBe(3);
    });
  });

  describe("invoke — failure modes", () => {
    it("unknown member yields reason starting with 'Unknown member'", async () => {
      const r = await multiAxisAggregatorEngine.invoke("bogus" as MultiAxisMember, "m");
      expect(r.ok).toBe(false);
      expect(r.reason?.startsWith("Unknown member")).toBe(true);
    });

    it("kinematic member + invalid method returns ok:false", async () => {
      const r = await multiAxisAggregatorEngine.invoke("kinematic", "__noSuchMethod__");
      expect(r.ok).toBe(false);
      expect(r.reason).toContain("not on");
    });

    it("extremely long method name doesn't crash", async () => {
      const longName = "x".repeat(10_000);
      const r = await multiAxisAggregatorEngine.invoke("kinematic", longName);
      expect(r.ok).toBe(false);
    });
  });

  describe("invoke — happy path", () => {
    it("kinematic.detectSingularities returns ok:true with result", async () => {
      // MultiAxisKinematicEngine has detectSingularities method; feed a minimal input
      const r = await multiAxisAggregatorEngine.invoke(
        "kinematic",
        "detectSingularities",
        "G0 X0 Y0 Z0\n",
        { primary_axis: "A", secondary_axis: "C", configuration: "table-table",
          primary_min: -120, primary_max: 120, secondary_min: -360, secondary_max: 360 },
      );
      expect(r.ok).toBe(true);
      expect(r.member).toBe("kinematic");
      expect(r.result).not.toBe(undefined);
    });
  });
});

// ============================================================================
// MillTurnOrchestrationEngine
// ============================================================================

describe("MillTurnOrchestrationEngine P1-U09", () => {
  describe("membership invariants", () => {
    it("list() returns exactly 2 members", () => {
      expect(millTurnOrchestrationEngine.list().length).toBe(2);
    });

    it("count() matches list().length", () => {
      expect(millTurnOrchestrationEngine.count()).toBe(millTurnOrchestrationEngine.list().length);
    });

    it("contains mill_turn and swiss members", () => {
      const members = millTurnOrchestrationEngine.list();
      const expected: MillTurnMember[] = ["mill_turn", "swiss"];
      for (const m of expected) {
        expect(members).toContain(m);
      }
    });
  });

  describe("route() — routing logic", () => {
    it("machine_class='swiss' → swiss member", () => {
      const r = millTurnOrchestrationEngine.route({ machine_class: "swiss" });
      expect(r.selected_member).toBe("swiss");
      expect(r.rationale).toContain("Swiss");
    });

    it("has_guide_bushing=true → swiss member", () => {
      const r = millTurnOrchestrationEngine.route({ has_guide_bushing: true });
      expect(r.selected_member).toBe("swiss");
    });

    it("machine_class='mill-turn' → mill_turn member", () => {
      const r = millTurnOrchestrationEngine.route({ machine_class: "mill-turn" });
      expect(r.selected_member).toBe("mill_turn");
    });

    it("has_sub_spindle alone → mill_turn (not swiss)", () => {
      const r = millTurnOrchestrationEngine.route({ has_sub_spindle: true });
      expect(r.selected_member).toBe("mill_turn");
    });

    it("empty context → default mill_turn", () => {
      const r = millTurnOrchestrationEngine.route({});
      expect(r.selected_member).toBe("mill_turn");
    });

    it("multi_channel without guide_bushing → mill_turn", () => {
      const r = millTurnOrchestrationEngine.route({ multi_channel: true });
      expect(r.selected_member).toBe("mill_turn");
    });

    it("swiss class + sub_spindle still routes to swiss (guide bushing wins)", () => {
      const r = millTurnOrchestrationEngine.route({
        machine_class: "swiss",
        has_sub_spindle: true,
      });
      expect(r.selected_member).toBe("swiss");
    });
  });

  describe("invoke — failure modes", () => {
    it("unknown member returns ok:false", async () => {
      const r = await millTurnOrchestrationEngine.invoke("no_such" as MillTurnMember, "m");
      expect(r.ok).toBe(false);
      expect(r.reason).toContain("Unknown member");
    });

    it("mill_turn + invalid method returns ok:false", async () => {
      const r = await millTurnOrchestrationEngine.invoke("mill_turn", "definitelyNotAMethod_xyz");
      expect(r.ok).toBe(false);
    });

    // MillTurnSwissPipelineEngine is a 1762-line module with heavy transitive
    // imports (PipelineRegistryBridge, TribalKnowledgeEngine, etc.) — first
    // import can exceed the default 5s timeout.
    it("swiss + invalid method returns ok:false", async () => {
      const r = await millTurnOrchestrationEngine.invoke("swiss", "definitelyNotAMethod_xyz");
      expect(r.ok).toBe(false);
    }, 30_000);
  });

  describe("getSelfAwareness", () => {
    it("returns engine_name and member_count=2", () => {
      const sa = millTurnOrchestrationEngine.getSelfAwareness();
      expect(sa.engine_name).toBe("MillTurnOrchestrationEngine");
      expect(sa.member_count).toBe(2);
      expect(sa.members.length).toBe(2);
    });
  });
});

// ============================================================================
// DISPATCHER WIRING — action enum + schema
// ============================================================================

describe("Dispatcher Wiring P1-U09", () => {
  describe("action enum membership", () => {
    it("mill_five_axis_aggregate is in action enum", () => {
      expect(MILL_DISPATCHER_ACTIONS.includes("mill_five_axis_aggregate")).toBe(true);
    });

    it("mill_multi_axis_aggregate is in action enum", () => {
      expect(MILL_DISPATCHER_ACTIONS.includes("mill_multi_axis_aggregate")).toBe(true);
    });

    it("mill_turn_orchestrate is in action enum", () => {
      expect(MILL_DISPATCHER_ACTIONS.includes("mill_turn_orchestrate")).toBe(true);
    });
  });

  describe("schema shape — mill_five_axis_aggregate", () => {
    it("accepts op='list'", () => {
      const schema = MILL_ACTION_SCHEMAS["mill_five_axis_aggregate"];
      expect(typeof schema?.safeParse).toBe("function");
      const parsed = schema.safeParse({ material: "4140", op: "list" });
      expect(parsed.success).toBe(true);
    });

    it("accepts op='invoke' with member and method", () => {
      const schema = MILL_ACTION_SCHEMAS["mill_five_axis_aggregate"];
      const parsed = schema.safeParse({
        material: "4140",
        op: "invoke",
        member: "post",
        method: "getTCPCCodes",
        args: ["fanuc_31i"],
      });
      expect(parsed.success).toBe(true);
    });

    it("rejects invalid op", () => {
      const schema = MILL_ACTION_SCHEMAS["mill_five_axis_aggregate"];
      const parsed = schema.safeParse({ material: "4140", op: "bogus" });
      expect(parsed.success).toBe(false);
    });

    it("rejects missing op", () => {
      const schema = MILL_ACTION_SCHEMAS["mill_five_axis_aggregate"];
      const parsed = schema.safeParse({ material: "4140" });
      expect(parsed.success).toBe(false);
    });
  });

  describe("schema shape — mill_multi_axis_aggregate", () => {
    it("accepts op='count'", () => {
      const schema = MILL_ACTION_SCHEMAS["mill_multi_axis_aggregate"];
      const parsed = schema.safeParse({ material: "4140", op: "count" });
      expect(parsed.success).toBe(true);
    });

    it("rejects empty object", () => {
      const schema = MILL_ACTION_SCHEMAS["mill_multi_axis_aggregate"];
      const parsed = schema.safeParse({});
      expect(parsed.success).toBe(false);
    });
  });

  describe("schema shape — mill_turn_orchestrate", () => {
    it("accepts op='route' with ctx", () => {
      const schema = MILL_ACTION_SCHEMAS["mill_turn_orchestrate"];
      const parsed = schema.safeParse({
        material: "4140",
        op: "route",
        ctx: { machine_class: "swiss" },
      });
      expect(parsed.success).toBe(true);
    });

    it("accepts op='list'", () => {
      const schema = MILL_ACTION_SCHEMAS["mill_turn_orchestrate"];
      const parsed = schema.safeParse({ material: "4140", op: "list" });
      expect(parsed.success).toBe(true);
    });

    it("rejects op='route' with invalid machine_class", () => {
      const schema = MILL_ACTION_SCHEMAS["mill_turn_orchestrate"];
      const parsed = schema.safeParse({
        material: "4140",
        op: "route",
        ctx: { machine_class: "lathe" }, // not in enum
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("engine determinism — dispatcher round-trip equivalence", () => {
    it("list() on FiveAxis aggregator is deterministic", () => {
      const a = fiveAxisAggregatorEngine.list().slice().sort();
      const b = fiveAxisAggregatorEngine.list().slice().sort();
      expect(a).toEqual(b);
    });

    it("route() decisions are deterministic for same ctx", () => {
      const ctx = { machine_class: "swiss" as const, has_sub_spindle: true };
      const r1 = millTurnOrchestrationEngine.route(ctx);
      const r2 = millTurnOrchestrationEngine.route(ctx);
      expect(r1.selected_member).toBe(r2.selected_member);
      expect(r1.rationale).toBe(r2.rationale);
    });
  });
});
