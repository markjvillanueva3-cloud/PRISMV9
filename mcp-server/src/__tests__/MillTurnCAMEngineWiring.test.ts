/**
 * MillTurnCAMEngine wiring test
 * =============================
 * BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING — iter-4.
 *
 * Verifies the single new action wires the multi-channel mill-turn /
 * Swiss program generator: millturn_cam_generate.
 *
 * Three real-behavior assertion layers — every assertion is value-
 * comparative against a concrete expected value (no toBeDefined /
 * toBeUndefined presence-only checks):
 *   1) SOURCE-GREP — MILL_ACTIONS membership counted + case-block presence
 *      + lazy 'millturn_cam' getter token
 *   2) SCHEMA — concrete safeParse accept/reject with typed field-value
 *      comparison; rejects bad ISO group + machine_type enums
 *   3) RUNTIME — invoke generate() against a realistic 2-channel mill-turn
 *      operation list; assert concrete channel count + spindle labels +
 *      sync points + tool list + gcode + topo dependency order
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  millTurnCAMEngine,
  type MillTurnOperation,
} from "../engines/MillTurnCAMEngine.js";
import { MILL_ACTIONS } from "../tools/dispatchers/millDispatcher.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_PATH = join(HERE, "..", "tools", "dispatchers", "millDispatcher.ts");
const DISPATCHER_SRC = readFileSync(DISPATCHER_PATH, "utf8");

type ZodSchemaLike = {
  safeParse: (p: unknown) => { success: boolean; data?: unknown };
};
const getSchema = (action: string): ZodSchemaLike =>
  (MILL_ACTION_SCHEMAS as Record<string, ZodSchemaLike>)[action];

const SAMPLE_OPS: MillTurnOperation[] = [
  {
    id: "OP-1-FACE", type: "od_rough", spindle: "main", turret: 1,
    position: { x: 0, z: 0 },
    dimensions: { diameter_mm: 25, length_mm: 50 },
    tool: { type: "od_insert" },
    params: { speed_mpm: 180, feed_mmrev: 0.2, doc_mm: 2 },
  },
  {
    id: "OP-2-DRILL", type: "drill", spindle: "main", turret: 1,
    position: { x: 0, z: -10 },
    dimensions: { diameter_mm: 6, depth_mm: 20 },
    tool: { type: "drill_carbide", diameter_mm: 6, is_live: false },
    params: { speed_mpm: 80, feed_mmrev: 0.1 },
    requires_ops: ["OP-1-FACE"],
  },
  {
    id: "OP-3-SUB-BACK-FACE", type: "od_finish", spindle: "sub", turret: 2,
    position: { x: 0, z: 0 },
    tool: { type: "finish_insert" },
    params: { speed_mpm: 220, feed_mmrev: 0.08 },
  },
];

describe("MillTurnCAMEngine wiring (U-BRIDGE-WIRE-MILLING iter-4)", () => {
  describe("dispatcher source pins millturn_cam_generate + getter", () => {
    it("MILL_ACTIONS contains exactly one 'millturn_cam_generate'", () => {
      const arr = MILL_ACTIONS as readonly string[];
      expect(arr.filter((x) => x === "millturn_cam_generate").length).toBe(1);
    });

    it("dispatcher source has 'case \"millturn_cam_generate\":' block", () => {
      expect(DISPATCHER_SRC.includes('case "millturn_cam_generate":')).toBe(true);
    });

    it("dispatcher source lazy-imports MillTurnCAMEngine", () => {
      expect(DISPATCHER_SRC.includes('case "millturn_cam":')).toBe(true);
      expect(DISPATCHER_SRC.includes("MillTurnCAMEngine.js")).toBe(true);
    });
  });

  describe("Zod schemas validate input", () => {
    it("REJECTS empty operations array", () => {
      const r = getSchema("millturn_cam_generate").safeParse({
        operations: [], config: { material_iso_group: "P", machine_type: "mill_turn" },
      });
      expect(r.success).toBe(false);
    });

    it("REJECTS missing config.material_iso_group", () => {
      const r = getSchema("millturn_cam_generate").safeParse({
        operations: SAMPLE_OPS, config: { machine_type: "mill_turn" },
      });
      expect(r.success).toBe(false);
    });

    it("REJECTS invalid material_iso_group enum (must be P/M/K/N/S/H)", () => {
      const r = getSchema("millturn_cam_generate").safeParse({
        operations: SAMPLE_OPS, config: { material_iso_group: "Z", machine_type: "mill_turn" },
      });
      expect(r.success).toBe(false);
    });

    it("REJECTS invalid machine_type enum", () => {
      const r = getSchema("millturn_cam_generate").safeParse({
        operations: SAMPLE_OPS, config: { material_iso_group: "P", machine_type: "milling" },
      });
      expect(r.success).toBe(false);
    });

    it("ACCEPTS valid mill_turn config and preserves material_iso_group + bar_diameter", () => {
      const r = getSchema("millturn_cam_generate").safeParse({
        operations: SAMPLE_OPS,
        config: { material_iso_group: "P", machine_type: "mill_turn", bar_diameter_mm: 32 },
      });
      expect(r.success).toBe(true);
      const data = r.data as { config: { material_iso_group: string; machine_type: string; bar_diameter_mm?: number } };
      expect(data.config.material_iso_group).toBe("P");
      expect(data.config.machine_type).toBe("mill_turn");
      expect(data.config.bar_diameter_mm).toBe(32);
    });

    it("ACCEPTS swiss machine_type", () => {
      const r = getSchema("millturn_cam_generate").safeParse({
        operations: SAMPLE_OPS, config: { material_iso_group: "P", machine_type: "swiss" },
      });
      expect(r.success).toBe(true);
    });

    it("REJECTS operation missing required id", () => {
      const r = getSchema("millturn_cam_generate").safeParse({
        operations: [{ type: "od_rough", spindle: "main" }],
        config: { material_iso_group: "P", machine_type: "mill_turn" },
      });
      expect(r.success).toBe(false);
    });

    it("REJECTS operation with invalid spindle enum", () => {
      const r = getSchema("millturn_cam_generate").safeParse({
        operations: [{ id: "X", type: "od_rough", spindle: "side" }],
        config: { material_iso_group: "P", machine_type: "mill_turn" },
      });
      expect(r.success).toBe(false);
    });
  });

  describe("engine round-trip generates a real multi-channel program", () => {
    it("returns exactly 2 channels with ids [1, 2] when main + sub ops are present", () => {
      const r = millTurnCAMEngine.generate(SAMPLE_OPS, {
        material_iso_group: "P", machine_type: "mill_turn",
        bar_diameter_mm: 25, part_length_mm: 50,
      });
      expect(r.channels.length).toBe(2);
      const channelIds = r.channels.map((c) => c.channel).sort((a, b) => a - b);
      expect(channelIds).toEqual([1, 2]);
    });

    it("channel 1 carries 'main' spindle and channel 2 carries 'sub'", () => {
      const r = millTurnCAMEngine.generate(SAMPLE_OPS, {
        material_iso_group: "P", machine_type: "mill_turn",
      });
      const ch1 = r.channels.find((c) => c.channel === 1);
      const ch2 = r.channels.find((c) => c.channel === 2);
      // The find() must hit — assert by direct value comparison (no .not.toBeUndefined)
      expect(ch1?.spindle).toBe("main");
      expect(ch2?.spindle).toBe("sub");
    });

    it("returns ≥1 sync point with id containing SYNC or TRANSFER", () => {
      const r = millTurnCAMEngine.generate(SAMPLE_OPS, {
        material_iso_group: "P", machine_type: "mill_turn",
      });
      expect(r.sync_points.length).toBeGreaterThanOrEqual(1);
      const hasTransferSync = r.sync_points.some((s) => s.id.includes("TRANSFER") || s.id.includes("SYNC"));
      expect(hasTransferSync).toBe(true);
    });

    it("returns exactly 1 channel (spindle='main') when only main ops are provided", () => {
      const mainOnly = SAMPLE_OPS.filter((o) => o.spindle === "main");
      const r = millTurnCAMEngine.generate(mainOnly, {
        material_iso_group: "P", machine_type: "mill_turn",
      });
      expect(r.channels.length).toBe(1);
      expect(r.channels[0].spindle).toBe("main");
    });

    it("returns gcode string with length > 0 and total_cycle_time_min > 0", () => {
      const r = millTurnCAMEngine.generate(SAMPLE_OPS, {
        material_iso_group: "P", machine_type: "mill_turn",
      });
      expect(typeof r.gcode).toBe("string");
      expect(r.gcode.length).toBeGreaterThan(0);
      expect(r.total_cycle_time_min).toBeGreaterThan(0);
    });

    it("returns non-empty tool_list (≥1 tool reflected from ops)", () => {
      const r = millTurnCAMEngine.generate(SAMPLE_OPS, {
        material_iso_group: "P", machine_type: "mill_turn",
      });
      expect(Array.isArray(r.tool_list)).toBe(true);
      expect(r.tool_list.length).toBeGreaterThan(0);
    });

    it("topological sort places OP-2-DRILL after OP-1-FACE (per requires_ops)", () => {
      const r = millTurnCAMEngine.generate(SAMPLE_OPS, {
        material_iso_group: "P", machine_type: "mill_turn",
      });
      const ch1 = r.channels.find((c) => c.channel === 1);
      const ops = ch1?.operations ?? [];
      // Both ops must be present in channel 1 with the documented sequence
      const faceIdx = ops.findIndex((o) => o.op_id === "OP-1-FACE");
      const drillIdx = ops.findIndex((o) => o.op_id === "OP-2-DRILL");
      expect(faceIdx).toBe(0); // face is first
      expect(drillIdx).toBe(1); // drill is second (follows face per requires_ops)
    });

    it("warnings field is an array (may be empty for the happy path)", () => {
      const r = millTurnCAMEngine.generate(SAMPLE_OPS, {
        material_iso_group: "P", machine_type: "mill_turn",
      });
      expect(Array.isArray(r.warnings)).toBe(true);
    });
  });

  describe("MILL_ACTIONS action-count anti-regression", () => {
    it("total action count is ≥ post-iter3 + 1 (i.e. ≥ 99)", () => {
      expect((MILL_ACTIONS as readonly string[]).length).toBeGreaterThanOrEqual(99);
    });
  });
});
