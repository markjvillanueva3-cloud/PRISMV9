/**
 * PostEmitSafetyGateEngine — pre-emit safety gate test suite.
 * Verifies the gate blocks (blockEmit=true) on every fault class and
 * passes cleanly when all checks succeed.  Closes P0 D5 from the bridge
 * assessment (echo slot soul refuses-list).
 *
 * Authored 2026-05-25 (slot:echo /goal overnight iter13).
 */

import { describe, it, expect } from "vitest";
import {
  postEmitSafetyGateEngine,
  PostEmitSafetyGateEngine,
  type GateOp,
  type SafetyGateConfig,
  type Violation,
} from "../engines/PostEmitSafetyGateEngine.js";

// VM30i-class machine envelope used as the default fixture.
const VM30i: SafetyGateConfig = {
  machine: { x_travel_mm: 762, y_travel_mm: 508, z_travel_mm: 508, margin_mm: 5 },
  safe_clearance_margin_mm: 5,
  stickout_safety_mm: 3,
};

function goodOp(overrides: Partial<GateOp> = {}): GateOp {
  return {
    index: 1,
    tool_number: 1,
    tool_diameter_mm: 12.0,
    tool_length_mm: 75.0,
    stickout_mm: 60.0,
    depth_mm: 25.0,
    rapid_z_mm: 25.0,
    feed_z_mm: 2.0,
    x_extent_mm: 100,
    y_extent_mm: 100,
    ...overrides,
  };
}

describe("PostEmitSafetyGateEngine", () => {
  describe("happy path", () => {
    it("passes a fully-clean single-op program (blockEmit=false)", () => {
      const r = postEmitSafetyGateEngine.gate([goodOp()], VM30i);
      expect(r.pass).toBe(true);
      expect(r.blockEmit).toBe(false);
      expect(r.violations.length).toBe(0);
      expect(r.ops_checked).toBe(1);
      expect(r.envelope.x_travel_mm).toBe(762);
    });

    it("passes a 4-op clean program", () => {
      const r = postEmitSafetyGateEngine.gate(
        [goodOp({ index: 1 }), goodOp({ index: 2 }), goodOp({ index: 3 }), goodOp({ index: 4 })],
        VM30i,
      );
      expect(r.pass).toBe(true);
      expect(r.violations.length).toBe(0);
      expect(r.ops_checked).toBe(4);
    });

    it("info[] notes when no collision objects registered", () => {
      const r = postEmitSafetyGateEngine.gate([goodOp()], VM30i);
      expect(r.info.some((s) => s.includes("no collision objects registered"))).toBe(true);
    });

    it("info[] notes when collision objects ARE registered", () => {
      const r = postEmitSafetyGateEngine.gate([goodOp()], {
        ...VM30i,
        collision_objects: [
          { id: "fixture-vise", type: "fixture" },
          { id: "vise-jaw-left", type: "fixture" },
        ],
      });
      expect(r.info.some((s) => s.includes("2 collision object(s) registered"))).toBe(true);
    });
  });

  describe("envelope violations", () => {
    it("blocks on X travel exceeded", () => {
      const r = postEmitSafetyGateEngine.gate([goodOp({ x_extent_mm: 400 })], VM30i);
      expect(r.blockEmit).toBe(true);
      expect(r.violations[0].cause).toBe("envelope-x-violation");
      expect(r.violations[0].numeric?.x_extent).toBe(400);
    });

    it("blocks on Y travel exceeded", () => {
      const r = postEmitSafetyGateEngine.gate([goodOp({ y_extent_mm: 280 })], VM30i);
      expect(r.blockEmit).toBe(true);
      expect(r.violations[0].cause).toBe("envelope-y-violation");
    });

    it("blocks on Z depth exceeded", () => {
      const r = postEmitSafetyGateEngine.gate(
        [goodOp({ depth_mm: 600, stickout_mm: 700, tool_length_mm: 700 })],
        VM30i,
      );
      expect(r.blockEmit).toBe(true);
      const causes = r.violations.map((v) => v.cause);
      expect(causes).toContain("envelope-z-violation");
    });

    it("respects custom margin", () => {
      const tight: SafetyGateConfig = {
        machine: { x_travel_mm: 762, y_travel_mm: 508, z_travel_mm: 508, margin_mm: 100 },
      };
      const r = postEmitSafetyGateEngine.gate([goodOp({ x_extent_mm: 300 })], tight);
      expect(r.blockEmit).toBe(true);
      expect(r.violations[0].cause).toBe("envelope-x-violation");
    });
  });

  describe("clearance + reach + plunge", () => {
    it("blocks when rapid_z is below safe clearance margin", () => {
      const r = postEmitSafetyGateEngine.gate([goodOp({ rapid_z_mm: 2.0 })], VM30i);
      expect(r.blockEmit).toBe(true);
      expect(r.violations[0].cause).toBe("clearance-too-low");
      expect(r.violations[0].numeric?.rapid_z).toBe(2.0);
    });

    it("blocks when depth exceeds usable tool reach with exact numeric values", () => {
      // stickout=40, safety=3 → usable=37. depth=50 → block.
      const r = postEmitSafetyGateEngine.gate(
        [goodOp({ stickout_mm: 40, tool_length_mm: 50, depth_mm: 50 })],
        VM30i,
      );
      expect(r.blockEmit).toBe(true);
      const reach = r.violations.find((v: Violation) => v.cause === "tool-reach-insufficient");
      expect(reach?.cause).toBe("tool-reach-insufficient");
      expect(reach?.message).toContain("T1");
      expect(reach?.numeric?.usable_reach).toBe(37);
      expect(reach?.numeric?.depth).toBe(50);
    });

    it("blocks when feed_z > rapid_z (rapid-into-stock) with exact numeric values", () => {
      const r = postEmitSafetyGateEngine.gate(
        [goodOp({ rapid_z_mm: 5.0, feed_z_mm: 10.0 })],
        VM30i,
      );
      expect(r.blockEmit).toBe(true);
      const ris = r.violations.find((v: Violation) => v.cause === "rapid-into-stock");
      expect(ris?.cause).toBe("rapid-into-stock");
      expect(ris?.numeric?.feed_z).toBe(10);
      expect(ris?.numeric?.rapid_z).toBe(5);
    });

    it("clearance pass at the exact safe-margin boundary (rapid_z=5 == margin)", () => {
      const r = postEmitSafetyGateEngine.gate([goodOp({ rapid_z_mm: 5.0 })], VM30i);
      expect(r.pass).toBe(true);
      expect(r.violations.filter((v: Violation) => v.cause === "clearance-too-low").length).toBe(0);
    });
  });

  describe("invalid input + adversarial", () => {
    it("throws when ops is not an array", () => {
      expect(() => postEmitSafetyGateEngine.gate(undefined as unknown as GateOp[], VM30i)).toThrow(
        /ops must be an array/,
      );
    });

    it("throws when config.machine missing", () => {
      expect(() =>
        postEmitSafetyGateEngine.gate([goodOp()], {} as unknown as SafetyGateConfig),
      ).toThrow(/machine envelope required/);
    });

    it("flags invalid op shape (NaN depth_mm) as blocking violation", () => {
      const broken = goodOp({ depth_mm: NaN });
      const r = postEmitSafetyGateEngine.gate([broken], VM30i);
      expect(r.blockEmit).toBe(true);
      expect(r.violations[0].cause).toBe("invalid-op-shape");
      expect(r.violations[0].message).toContain("depth_mm");
    });

    it("flags invalid op shape (Infinity rapid_z_mm) as blocking", () => {
      const broken = goodOp({ rapid_z_mm: Infinity });
      const r = postEmitSafetyGateEngine.gate([broken], VM30i);
      expect(r.blockEmit).toBe(true);
      expect(r.violations[0].cause).toBe("invalid-op-shape");
      expect(r.violations[0].message).toContain("rapid_z_mm");
    });

    it("handles empty op array (passes vacuously)", () => {
      const r = postEmitSafetyGateEngine.gate([], VM30i);
      expect(r.pass).toBe(true);
      expect(r.blockEmit).toBe(false);
      expect(r.ops_checked).toBe(0);
    });
  });

  describe("multi-op aggregation", () => {
    it("collects violations from EVERY op (not just first)", () => {
      const ops: GateOp[] = [
        goodOp({ index: 1 }), // clean
        goodOp({ index: 2, x_extent_mm: 400 }), // envelope-x
        goodOp({ index: 3, rapid_z_mm: 1 }), // clearance
        goodOp({ index: 4, feed_z_mm: 50, rapid_z_mm: 25 }), // rapid-into-stock
      ];
      const r = postEmitSafetyGateEngine.gate(ops, VM30i);
      expect(r.blockEmit).toBe(true);
      expect(r.violations.length).toBeGreaterThanOrEqual(3);
      const opIndices = new Set(r.violations.map((v: Violation) => v.op_index));
      expect(opIndices.has(2)).toBe(true);
      expect(opIndices.has(3)).toBe(true);
      expect(opIndices.has(4)).toBe(true);
      expect(opIndices.has(1)).toBe(false); // op 1 is clean
    });

    it("ops_checked counts every op even when some blocked", () => {
      const r = postEmitSafetyGateEngine.gate(
        [goodOp({ index: 1, depth_mm: 600, stickout_mm: 700, tool_length_mm: 700 }), goodOp({ index: 2 })],
        VM30i,
      );
      expect(r.ops_checked).toBe(2);
    });
  });

  describe("singleton export", () => {
    it("postEmitSafetyGateEngine is a PostEmitSafetyGateEngine instance", () => {
      expect(postEmitSafetyGateEngine).toBeInstanceOf(PostEmitSafetyGateEngine);
    });

    it("singleton produces identical result to fresh instance for same input", () => {
      const fresh = new PostEmitSafetyGateEngine();
      const a = postEmitSafetyGateEngine.gate([goodOp()], VM30i);
      const b = fresh.gate([goodOp()], VM30i);
      expect(a.pass).toBe(b.pass);
      expect(a.violations.length).toBe(b.violations.length);
      expect(a.envelope).toEqual(b.envelope);
    });
  });

  describe("E2E: prism_cam dispatcher round-trip — real engine call through MCP envelope", () => {
    interface CapturedTool {
      name: string;
      handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
    }
    class CapturingMCPHost {
      tools: CapturedTool[] = [];
      tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
        this.tools.push({ name, handler });
      }
    }
    async function call(host: CapturingMCPHost, action: string, params: Record<string, unknown> = {}) {
      const t = host.tools.find((x) => x.name === "prism_cam");
      if (!t) throw new Error("prism_cam not registered");
      const raw = (await t.handler({ action, params })) as
        | { content: { type: string; text: string }[] }
        | { success: false; error: string };
      if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
        return { ok: false, data: raw };
      }
      const env = raw as { content: { type: string; text: string }[] };
      try {
        return { ok: true, data: JSON.parse(env.content[0]!.text) };
      } catch {
        return { ok: false, data: { rawText: env.content[0]?.text } };
      }
    }

    it("cam_post_emit_safety_gate through prism_cam — clean ops pass", async () => {
      const { registerCamDispatcher } = await import("../tools/dispatchers/camDispatcher.js");
      const host = new CapturingMCPHost();
      registerCamDispatcher(host as unknown as { tool: (...args: unknown[]) => void });
      const res = await call(host, "cam_post_emit_safety_gate", {
        ops: [goodOp()],
        config: VM30i,
      });
      expect(res.ok).toBe(true);
      const payload = res.data as { success?: boolean; data?: any };
      const gate = (payload.data ?? payload) as { pass: boolean; blockEmit: boolean; ops_checked: number };
      expect(gate.pass).toBe(true);
      expect(gate.blockEmit).toBe(false);
      expect(gate.ops_checked).toBe(1);
    });

    it("cam_post_emit_safety_gate through prism_cam — dirty ops block emit with X-violation", async () => {
      const { registerCamDispatcher } = await import("../tools/dispatchers/camDispatcher.js");
      const host = new CapturingMCPHost();
      registerCamDispatcher(host as unknown as { tool: (...args: unknown[]) => void });
      const res = await call(host, "cam_post_emit_safety_gate", {
        ops: [goodOp({ x_extent_mm: 400 })],
        config: VM30i,
      });
      expect(res.ok).toBe(true);
      const payload = res.data as { success?: boolean; data?: any };
      const gate = (payload.data ?? payload) as { pass: boolean; blockEmit: boolean; violations: Violation[] };
      expect(gate.blockEmit).toBe(true);
      expect(gate.violations[0].cause).toBe("envelope-x-violation");
      expect(gate.violations[0].numeric?.x_extent).toBe(400);
    });
  });
});
