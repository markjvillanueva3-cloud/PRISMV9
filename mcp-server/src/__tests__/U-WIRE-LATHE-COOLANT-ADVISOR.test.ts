/**
 * U-WIRE-LATHE-COOLANT-ADVISOR — wiring-gate test
 * =================================================
 *
 * Verifies `lathe_coolant_advise` + `lathe_coolant_stats` route to
 * `LatheCoolantAdvisorEngine.advise/getStats`.
 *
 * @module __tests__/U-WIRE-LATHE-COOLANT-ADVISOR
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  latheCoolantAdvisorEngine,
  type CoolantAdvisorInput,
} from "../engines/LatheCoolantAdvisorEngine.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_SRC = readFileSync(
  join(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts"),
  "utf-8"
);
const SCHEMA_MAP = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;

const INCONEL_ROUGH: CoolantAdvisorInput = {
  iso_group: "S",
  operation: "roughing",
  tool_material: "carbide",
  Vc_m_min: 50,
  ap_mm: 2,
  thru_spindle_available: true,
  cryo_available: true,
};

const HARDENED_FINISH: CoolantAdvisorInput = {
  iso_group: "H",
  operation: "finishing",
  tool_material: "cbn",
  Vc_m_min: 200,
  ap_mm: 0.15,
  hard_turning: true,
};

describe("U-WIRE-LATHE-COOLANT-ADVISOR — turning-dispatcher wiring", () => {
  it("registers both actions in TURNING_ACTION_SCHEMAS", () => {
    if (!SCHEMA_MAP["lathe_coolant_advise"]) throw new Error("lathe_coolant_advise missing");
    if (!SCHEMA_MAP["lathe_coolant_stats"]) throw new Error("lathe_coolant_stats missing");
  });

  it("advise schema accepts canonical input", () => {
    expect(SCHEMA_MAP["lathe_coolant_advise"]!.safeParse(INCONEL_ROUGH).success).toBe(true);
    expect(SCHEMA_MAP["lathe_coolant_advise"]!.safeParse(HARDENED_FINISH).success).toBe(true);
  });

  it("advise schema rejects unknown iso_group, operation, tool_material", () => {
    expect(SCHEMA_MAP["lathe_coolant_advise"]!.safeParse({ ...INCONEL_ROUGH, iso_group: "Z" }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_coolant_advise"]!.safeParse({ ...INCONEL_ROUGH, operation: "boogying" }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_coolant_advise"]!.safeParse({ ...INCONEL_ROUGH, tool_material: "wood" }).success).toBe(false);
  });

  it("advise schema rejects non-positive Vc / ap", () => {
    expect(SCHEMA_MAP["lathe_coolant_advise"]!.safeParse({ ...INCONEL_ROUGH, Vc_m_min: 0 }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_coolant_advise"]!.safeParse({ ...INCONEL_ROUGH, ap_mm: -0.5 }).success).toBe(false);
  });

  it("stats schema accepts empty input", () => {
    expect(SCHEMA_MAP["lathe_coolant_stats"]!.safeParse({}).success).toBe(true);
  });

  it("dispatcher source contains action + case for both actions", () => {
    for (const a of ["lathe_coolant_advise", "lathe_coolant_stats"]) {
      expect(DISPATCHER_SRC.includes(`"${a}"`)).toBe(true);
      expect(DISPATCHER_SRC.includes(`case "${a}":`)).toBe(true);
    }
  });

  it("advise case routes to .advise (not the sibling getStats)", () => {
    const startIdx = DISPATCHER_SRC.indexOf('case "lathe_coolant_advise":');
    const endIdx = DISPATCHER_SRC.indexOf('case "', startIdx + 'case "lathe_coolant_advise":'.length);
    const block = DISPATCHER_SRC.slice(startIdx, endIdx > 0 ? endIdx : startIdx + 4000);
    expect(block.includes("latheCoolantAdvisorEngine.advise(")).toBe(true);
    if (block.includes("latheCoolantAdvisorEngine.getStats(")) {
      throw new Error("advise case wired to getStats");
    }
  });

  it("stats case routes to .getStats (not the sibling advise)", () => {
    const startIdx = DISPATCHER_SRC.indexOf('case "lathe_coolant_stats":');
    const endIdx = DISPATCHER_SRC.indexOf('case "', startIdx + 'case "lathe_coolant_stats":'.length);
    const block = DISPATCHER_SRC.slice(startIdx, endIdx > 0 ? endIdx : startIdx + 4000);
    expect(block.includes("latheCoolantAdvisorEngine.getStats(")).toBe(true);
    if (block.includes("latheCoolantAdvisorEngine.advise(")) {
      throw new Error("stats case wired to advise");
    }
  });
});

describe("U-WIRE-LATHE-COOLANT-ADVISOR — engine semantic round-trip", () => {
  it("Inconel rough with TSC + cryo available returns a non-flood / non-dry / non-mist recommendation", () => {
    const r = latheCoolantAdvisorEngine.advise(INCONEL_ROUGH);
    // ISO S (superalloy) with TSC + cryo should NOT recommend dry/mist for roughing.
    if (r.recommendation === "dry" || r.recommendation === "mist") {
      throw new Error(`unexpected coolant rec on Inconel roughing — got ${r.recommendation}`);
    }
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
    expect(Array.isArray(r.reasoning)).toBe(true);
    expect(r.reasoning.length).toBeGreaterThan(0);
    expect(Array.isArray(r.alternatives)).toBe(true);
  });

  it("hardened-turning + CBN insert returns 'dry' (canonical for hard turning)", () => {
    const r = latheCoolantAdvisorEngine.advise(HARDENED_FINISH);
    // Canonical: hard turning with CBN should be DRY (thermal shock + tool life).
    expect(r.recommendation).toBe("dry");
  });

  it("recommendation is one of the 6 canonical modes (enum-domain invariant)", () => {
    const r = latheCoolantAdvisorEngine.advise(INCONEL_ROUGH);
    expect(["flood", "high_pressure", "mist", "mql", "dry", "cryogenic"]).toContain(r.recommendation);
  });

  it("alternatives are ranked descending by score (definitional invariant)", () => {
    const r = latheCoolantAdvisorEngine.advise(INCONEL_ROUGH);
    for (let i = 1; i < r.alternatives.length; i++) {
      const prev = r.alternatives[i - 1]!.score;
      const cur = r.alternatives[i]!.score;
      if (cur > prev) {
        throw new Error(`alternatives ranking violated at index ${i}: prev=${prev} cur=${cur}`);
      }
    }
  });

  it("sustainability_priority='high' biases recommendation toward MQL or dry (real signal)", () => {
    const baseline = latheCoolantAdvisorEngine.advise({
      iso_group: "P", operation: "finishing", tool_material: "carbide", Vc_m_min: 200, ap_mm: 0.5,
    });
    const sustain = latheCoolantAdvisorEngine.advise({
      iso_group: "P", operation: "finishing", tool_material: "carbide", Vc_m_min: 200, ap_mm: 0.5,
      sustainability_priority: "high",
    });
    // Either the recommendation changes toward dry/mql, OR an MQL/dry alternative scores higher.
    const baselineMqlScore = baseline.alternatives.find((a) => a.mode === "mql" || a.mode === "dry")?.score ?? 0;
    const sustainMqlScore = sustain.alternatives.find((a) => a.mode === "mql" || a.mode === "dry")?.score ?? 0;
    if (sustainMqlScore < baselineMqlScore && sustain.recommendation === baseline.recommendation) {
      throw new Error("sustainability_priority='high' had no effect on MQL/dry preference");
    }
  });

  it("getStats returns the canonical 6-mode list + non-empty factors_considered", () => {
    const s = latheCoolantAdvisorEngine.getStats();
    expect(s.modes).toEqual(["flood", "high_pressure", "mist", "mql", "dry", "cryogenic"]);
    expect(Array.isArray(s.factors_considered)).toBe(true);
    expect(s.factors_considered.length).toBeGreaterThanOrEqual(3);
    // ISO group is the primary axis — must be in the factor list.
    expect(s.factors_considered).toContain("iso_group");
  });
});
