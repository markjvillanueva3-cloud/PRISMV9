/**
 * U-WIRE-LATHE-BIRDNEST — wiring-gate test
 * ==========================================
 *
 * Verifies `lathe_bird_nest_predict` + `lathe_bird_nest_stats` are exposed
 * on the turning dispatcher and route to the `LatheBirdNestPredictorEngine`
 * methods (the 291-LOC LATHE-PRO-MS7 chip-wrap risk engine that had 0
 * dispatcher references before this wire).
 *
 * @module __tests__/U-WIRE-LATHE-BIRDNEST
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  latheBirdNestPredictorEngine,
  type BirdNestInput,
  type BirdNestResult,
} from "../engines/LatheBirdNestPredictorEngine.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_PATH = join(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts");
const DISPATCHER_SRC = readFileSync(DISPATCHER_PATH, "utf-8");
const SCHEMA_MAP = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;

// ─── Canonical input — austenitic stainless on a slender Inconel-ish bar with flat insert + dry coolant.
// This combination drives the model into the "severe" tier so the mitigations + safety_notes paths
// are exercised by the round-trip test. Material is overridden via the explicit `ductility` field
// to keep the test deterministic across ISO-group taxonomy changes.
const SEVERE_INPUT: BirdNestInput = {
  ductility: "very_high",
  vc_m_min: 150,
  feed_mm_rev: 0.08,
  doc_mm: 1.5,
  clearance_length_mm: 100,
  length_over_diameter: 12,
  lead_angle_deg: 45,
  chipbreaker: "flat",
  coolant: "dry",
};

// ─── Mild input — short part, aggressive chipbreaker, TSC coolant — should drop to "low".
const LOW_INPUT: BirdNestInput = {
  ductility: "low",
  vc_m_min: 150,
  feed_mm_rev: 0.25,
  doc_mm: 1.5,
  clearance_length_mm: 200,
  length_over_diameter: 2,
  lead_angle_deg: 0,
  chipbreaker: "aggressive",
  coolant: "tsc",
};

describe("U-WIRE-LATHE-BIRDNEST — turning-dispatcher wiring", () => {
  // ── Schema surface
  it("registers lathe_bird_nest_predict with working safeParse on the canonical severe input", () => {
    const schema = SCHEMA_MAP["lathe_bird_nest_predict"];
    if (!schema) throw new Error("lathe_bird_nest_predict missing from TURNING_ACTION_SCHEMAS");
    expect(schema.safeParse(SEVERE_INPUT).success).toBe(true);
  });

  it("registers lathe_bird_nest_stats with working safeParse on empty input", () => {
    const schema = SCHEMA_MAP["lathe_bird_nest_stats"];
    if (!schema) throw new Error("lathe_bird_nest_stats missing from TURNING_ACTION_SCHEMAS");
    expect(schema.safeParse({}).success).toBe(true);
  });

  it("rejects lathe_bird_nest_predict input with non-positive vc_m_min", () => {
    expect(SCHEMA_MAP["lathe_bird_nest_predict"]!.safeParse({ ...SEVERE_INPUT, vc_m_min: 0 }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_bird_nest_predict"]!.safeParse({ ...SEVERE_INPUT, vc_m_min: -50 }).success).toBe(false);
  });

  it("rejects lathe_bird_nest_predict input with unknown chipbreaker class", () => {
    const bad = { ...SEVERE_INPUT, chipbreaker: "ultra_aggressive" as unknown as BirdNestInput["chipbreaker"] };
    expect(SCHEMA_MAP["lathe_bird_nest_predict"]!.safeParse(bad).success).toBe(false);
  });

  it("rejects lathe_bird_nest_predict input with unknown coolant delivery", () => {
    const bad = { ...SEVERE_INPUT, coolant: "cryogenic" as unknown as BirdNestInput["coolant"] };
    expect(SCHEMA_MAP["lathe_bird_nest_predict"]!.safeParse(bad).success).toBe(false);
  });

  it("rejects lathe_bird_nest_predict input missing the required chipbreaker field", () => {
    const bad: Partial<BirdNestInput> = { ...SEVERE_INPUT };
    delete (bad as { chipbreaker?: unknown }).chipbreaker;
    expect(SCHEMA_MAP["lathe_bird_nest_predict"]!.safeParse(bad).success).toBe(false);
  });

  // ── Dispatcher source surface (anti-regression grep)
  it("dispatcher source contains BOTH the action name and the case block for lathe_bird_nest_predict", () => {
    expect(DISPATCHER_SRC.includes('"lathe_bird_nest_predict"')).toBe(true);
    expect(DISPATCHER_SRC.includes('case "lathe_bird_nest_predict":')).toBe(true);
  });

  it("dispatcher source contains BOTH the action name and the case block for lathe_bird_nest_stats", () => {
    expect(DISPATCHER_SRC.includes('"lathe_bird_nest_stats"')).toBe(true);
    expect(DISPATCHER_SRC.includes('case "lathe_bird_nest_stats":')).toBe(true);
  });

  it("lathe_bird_nest_predict case calls .predict (not the sibling getStats)", () => {
    const startIdx = DISPATCHER_SRC.indexOf('case "lathe_bird_nest_predict":');
    if (startIdx < 0) throw new Error("lathe_bird_nest_predict case missing");
    // Slice to the next 'case "' label to capture the whole case body regardless of how many
    // type-guard lines it grows to — avoids a brittle fixed-width window where adding one more
    // input field would silently push the routing call past the slice end.
    const endIdx = DISPATCHER_SRC.indexOf('case "', startIdx + 'case "lathe_bird_nest_predict":'.length);
    const block = DISPATCHER_SRC.slice(startIdx, endIdx > 0 ? endIdx : startIdx + 4000);
    // Strip the type-only reference `predict>` (from `Parameters<typeof ...predict>[0]`)
    // so the negative-guard test on getStats is meaningful and the positive guard
    // really exercises the call site, not the type expression.
    expect(block.includes("latheBirdNestPredictorEngine.predict(")).toBe(true);
    if (block.includes("latheBirdNestPredictorEngine.getStats(")) {
      throw new Error("lathe_bird_nest_predict case wired to getStats — must call predict");
    }
  });

  it("lathe_bird_nest_stats case calls .getStats (not the sibling predict)", () => {
    const startIdx = DISPATCHER_SRC.indexOf('case "lathe_bird_nest_stats":');
    if (startIdx < 0) throw new Error("lathe_bird_nest_stats case missing");
    const block = DISPATCHER_SRC.slice(startIdx, startIdx + 600);
    expect(block.includes("latheBirdNestPredictorEngine.getStats(")).toBe(true);
    if (block.includes("latheBirdNestPredictorEngine.predict(")) {
      throw new Error("lathe_bird_nest_stats case wired to predict — must call getStats");
    }
  });

  it("dispatcher source carries both new actions twice each (enum entry + case label)", () => {
    expect((DISPATCHER_SRC.match(/"lathe_bird_nest_predict"/g) || []).length).toBeGreaterThanOrEqual(2);
    expect((DISPATCHER_SRC.match(/"lathe_bird_nest_stats"/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});

describe("U-WIRE-LATHE-BIRDNEST — engine semantic round-trip via the wired surface", () => {
  it("severe path returns risk_level='severe' with mitigations[] AND severity-tiered safety_notes", () => {
    const r: BirdNestResult = latheBirdNestPredictorEngine.predict(SEVERE_INPUT);
    expect(r.risk_level).toBe("severe");
    expect(r.risk_score).toBeGreaterThanOrEqual(0.75);
    expect(r.risk_score).toBeLessThanOrEqual(1);
    expect(r.mitigations.length).toBeGreaterThan(0);
    // Severe-tier safety_notes are unconditional in the engine — chip-whip warning must appear.
    const joined = r.safety_notes.join(" | ");
    if (!joined.includes("SEVERE")) {
      throw new Error(`safety_notes missing SEVERE tier on severe input — got: ${joined}`);
    }
  });

  it("low path returns risk_level='low' AND emits no severe-tier safety_notes", () => {
    const r: BirdNestResult = latheBirdNestPredictorEngine.predict(LOW_INPUT);
    expect(r.risk_level).toBe("low");
    expect(r.risk_score).toBeLessThan(0.25);
    if (r.safety_notes.some((n) => n.includes("SEVERE"))) {
      throw new Error("low-risk path emitted SEVERE safety note");
    }
  });

  it("coolant upgrade (dry → tsc) drops risk for the same geometry (mitigation invariant)", () => {
    const baseline = latheBirdNestPredictorEngine.predict(SEVERE_INPUT);
    const upgraded = latheBirdNestPredictorEngine.predict({ ...SEVERE_INPUT, coolant: "tsc" });
    if (upgraded.risk_score >= baseline.risk_score) {
      throw new Error(`TSC coolant did not reduce risk vs dry — baseline=${baseline.risk_score} upgraded=${upgraded.risk_score}`);
    }
  });

  it("getStats returns the model description + complete factor list + risk_levels enum", () => {
    const s = latheBirdNestPredictorEngine.getStats();
    expect(s.model.length).toBeGreaterThan(0);
    expect(s.factors.length).toBe(6);
    expect(s.risk_levels).toEqual(["low", "moderate", "high", "severe"]);
  });

  it("ISO-group fallback works when ductility is omitted (austenitic stainless → very_high)", () => {
    const noExplicit: BirdNestInput = { ...SEVERE_INPUT };
    delete (noExplicit as { ductility?: unknown }).ductility;
    const r = latheBirdNestPredictorEngine.predict({ ...noExplicit, material_iso_group: "M" });
    expect(r.factors.ductility_factor).toBeCloseTo(1.0, 2);
  });
});
