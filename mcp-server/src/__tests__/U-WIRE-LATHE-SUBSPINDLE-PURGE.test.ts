/**
 * U-WIRE-LATHE-SUBSPINDLE-PURGE — wiring-gate test
 * =================================================
 *
 * Verifies `lathe_subspindle_purge_plan` + `lathe_subspindle_purge_stats`
 * route correctly to `LatheSubSpindleTransferPurgeEngine.plan/getStats`.
 *
 * @module __tests__/U-WIRE-LATHE-SUBSPINDLE-PURGE
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  latheSubSpindleTransferPurgeEngine,
  type SubSpindlePurgeInput,
  type SubSpindlePurgeResult,
} from "../engines/LatheSubSpindleTransferPurgeEngine.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_SRC = readFileSync(
  join(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts"),
  "utf-8"
);
const SCHEMA_MAP = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;

const CANONICAL: SubSpindlePurgeInput = {
  main_rpm: 3000,
  transfer_length_mm: 60,
  transfer_diameter_mm: 25,
  material_iso_group: "P",
  coolant_pressure_bar: 30,
  air_blast_available: true,
  air_blast_pressure_bar: 6,
  synchronous_transfer: true,
  controller: "okuma_osp",
};

const STICKY_NO_BLAST: SubSpindlePurgeInput = {
  ...CANONICAL,
  material_iso_group: "M",
  air_blast_available: false,
  synchronous_transfer: false,
};

describe("U-WIRE-LATHE-SUBSPINDLE-PURGE — turning-dispatcher wiring", () => {
  it("registers lathe_subspindle_purge_plan with working safeParse on canonical input", () => {
    const schema = SCHEMA_MAP["lathe_subspindle_purge_plan"];
    if (!schema) throw new Error("lathe_subspindle_purge_plan missing from TURNING_ACTION_SCHEMAS");
    expect(schema.safeParse(CANONICAL).success).toBe(true);
  });

  it("registers lathe_subspindle_purge_stats with working safeParse on empty input", () => {
    const schema = SCHEMA_MAP["lathe_subspindle_purge_stats"];
    if (!schema) throw new Error("lathe_subspindle_purge_stats missing");
    expect(schema.safeParse({}).success).toBe(true);
  });

  it("rejects plan input with negative main_rpm", () => {
    expect(SCHEMA_MAP["lathe_subspindle_purge_plan"]!.safeParse({ ...CANONICAL, main_rpm: -1 }).success).toBe(false);
  });

  it("rejects plan input with unknown controller family", () => {
    const bad = { ...CANONICAL, controller: "heidenhain" as unknown as SubSpindlePurgeInput["controller"] };
    expect(SCHEMA_MAP["lathe_subspindle_purge_plan"]!.safeParse(bad).success).toBe(false);
  });

  it("rejects plan input with non-boolean air_blast_available", () => {
    expect(SCHEMA_MAP["lathe_subspindle_purge_plan"]!.safeParse({ ...CANONICAL, air_blast_available: 1 }).success).toBe(false);
  });

  it("accepts main_rpm=0 (transfer from stopped spindle is legitimate)", () => {
    expect(SCHEMA_MAP["lathe_subspindle_purge_plan"]!.safeParse({ ...CANONICAL, main_rpm: 0 }).success).toBe(true);
  });

  // Dispatcher source surface
  it("dispatcher contains BOTH action name AND case block for lathe_subspindle_purge_plan", () => {
    expect(DISPATCHER_SRC.includes('"lathe_subspindle_purge_plan"')).toBe(true);
    expect(DISPATCHER_SRC.includes('case "lathe_subspindle_purge_plan":')).toBe(true);
  });

  it("dispatcher contains BOTH action name AND case block for lathe_subspindle_purge_stats", () => {
    expect(DISPATCHER_SRC.includes('"lathe_subspindle_purge_stats"')).toBe(true);
    expect(DISPATCHER_SRC.includes('case "lathe_subspindle_purge_stats":')).toBe(true);
  });

  it("plan case routes to .plan (not the sibling getStats)", () => {
    const startIdx = DISPATCHER_SRC.indexOf('case "lathe_subspindle_purge_plan":');
    if (startIdx < 0) throw new Error("plan case missing");
    const endIdx = DISPATCHER_SRC.indexOf('case "', startIdx + 'case "lathe_subspindle_purge_plan":'.length);
    const block = DISPATCHER_SRC.slice(startIdx, endIdx > 0 ? endIdx : startIdx + 4000);
    expect(block.includes("latheSubSpindleTransferPurgeEngine.plan(")).toBe(true);
    if (block.includes("latheSubSpindleTransferPurgeEngine.getStats(")) {
      throw new Error("plan case wired to getStats — must call plan");
    }
  });

  it("stats case routes to .getStats (not the sibling plan)", () => {
    const startIdx = DISPATCHER_SRC.indexOf('case "lathe_subspindle_purge_stats":');
    if (startIdx < 0) throw new Error("stats case missing");
    const endIdx = DISPATCHER_SRC.indexOf('case "', startIdx + 'case "lathe_subspindle_purge_stats":'.length);
    const block = DISPATCHER_SRC.slice(startIdx, endIdx > 0 ? endIdx : startIdx + 4000);
    expect(block.includes("latheSubSpindleTransferPurgeEngine.getStats(")).toBe(true);
    if (block.includes("latheSubSpindleTransferPurgeEngine.plan(")) {
      throw new Error("stats case wired to plan — must call getStats");
    }
  });
});

describe("U-WIRE-LATHE-SUBSPINDLE-PURGE — engine semantic round-trip", () => {
  it("canonical input returns a non-empty phases array with positive durations", () => {
    const r: SubSpindlePurgeResult = latheSubSpindleTransferPurgeEngine.plan(CANONICAL);
    expect(r.phases.length).toBeGreaterThan(0);
    for (const phase of r.phases) {
      expect(phase.duration_sec).toBeGreaterThan(0);
      expect(phase.name.length).toBeGreaterThan(0);
      expect(phase.action.length).toBeGreaterThan(0);
    }
  });

  it("total_transfer_time_sec equals sum of per-phase durations (definitional invariant)", () => {
    const r = latheSubSpindleTransferPurgeEngine.plan(CANONICAL);
    const sum = r.phases.reduce((s, p) => s + p.duration_sec, 0);
    expect(r.total_transfer_time_sec).toBeCloseTo(sum, 2);
  });

  it("sticky material (M) without air blast raises a recommendation for air-blast install", () => {
    const r = latheSubSpindleTransferPurgeEngine.plan(STICKY_NO_BLAST);
    const matchesAdvice = r.recommendations.some((rec) => /air blast/i.test(rec));
    if (!matchesAdvice) {
      throw new Error("missing 'install air blast' recommendation on sticky material + no-blast input");
    }
    // air_blast_duration must be 0 when air_blast_available=false
    expect(r.air_blast_duration_sec).toBe(0);
  });

  it("higher main_rpm produces longer spindle_decel_sec (monotonicity)", () => {
    const lo = latheSubSpindleTransferPurgeEngine.plan({ ...CANONICAL, main_rpm: 500 });
    const hi = latheSubSpindleTransferPurgeEngine.plan({ ...CANONICAL, main_rpm: 6000 });
    if (hi.spindle_decel_sec <= lo.spindle_decel_sec) {
      throw new Error(`decel did not grow with rpm — lo=${lo.spindle_decel_sec} hi=${hi.spindle_decel_sec}`);
    }
  });

  it("synchronous transfer is FASTER than stopped-spindle transfer (approach cost reduction)", () => {
    const sync = latheSubSpindleTransferPurgeEngine.plan({ ...CANONICAL, synchronous_transfer: true });
    const stopped = latheSubSpindleTransferPurgeEngine.plan({ ...CANONICAL, synchronous_transfer: false });
    if (sync.total_transfer_time_sec >= stopped.total_transfer_time_sec) {
      throw new Error(`sync transfer should be faster — sync=${sync.total_transfer_time_sec} stopped=${stopped.total_transfer_time_sec}`);
    }
  });

  it("getStats returns phases_modeled count + supported_controllers list", () => {
    const s = latheSubSpindleTransferPurgeEngine.getStats();
    expect(s.phases_modeled).toBeGreaterThan(0);
    expect(Array.isArray(s.supported_controllers)).toBe(true);
    expect(s.supported_controllers.length).toBeGreaterThan(0);
  });
});
