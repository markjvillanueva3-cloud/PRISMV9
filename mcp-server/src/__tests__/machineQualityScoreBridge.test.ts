/**
 * machineQualityScoreBridge.test.ts — U-DB-MACHINE-QUALITY-SCORE.
 *
 * Coverage:
 *   - reputationTierFor across 5 spanning manufacturers (DMG MORI=S, Okuma=A,
 *     Haas=B, Centroid=C, Shapeoko=D)
 *   - score() composite for 3 spanning machine profiles (top-tier vs
 *     mid-tier vs hobby)
 *   - missing_fields surfaces every MISSING_FIELD when machine is bare
 *   - accuracy_compensation_factor monotonic with score
 *   - failure modes: no machine + no machine_id → ok:false
 *   - Zod schemas accept + reject correctly
 *   - All 7 prism_intelligence DB-bridge actions parse representative input
 *
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-MACHINE-QUALITY-SCORE (slot juliett, 2026-05-25)
 */

import { describe, it, expect } from "vitest";
import { ACTION_INTELLIGENCE_SCHEMAS } from "../schemas/intelligenceActionSchemas.js";
import {
  MachineQualityScoreEngine,
  machineQualityScoreEngine,
  REPUTATION_TIERS,
  MISSING_FIELDS,
} from "../engines/MachineQualityScoreEngine.js";

describe("U-DB-MACHINE-QUALITY-SCORE — REPUTATION_TIERS canonical", () => {
  it("contains all 5 tiers S/A/B/C/D across spanning manufacturers", () => {
    expect(REPUTATION_TIERS["DMG MORI"]).toBe("S");
    expect(REPUTATION_TIERS["Okuma"]).toBe("A");
    expect(REPUTATION_TIERS["Haas"]).toBe("B");
    expect(REPUTATION_TIERS["Centroid"]).toBe("C");
    expect(REPUTATION_TIERS["Shapeoko"]).toBe("D");
  });

  it("MISSING_FIELDS lists 8 specific high-ROI gap fields", () => {
    expect(MISSING_FIELDS).toContain("positioning_accuracy_um");
    expect(MISSING_FIELDS).toContain("repeatability_um");
    expect(MISSING_FIELDS).toContain("way_type");
    expect(MISSING_FIELDS).toContain("max_rapid_mm_min");
    expect(MISSING_FIELDS).toContain("max_accel_g");
    expect(MISSING_FIELDS).toContain("look_ahead_blocks");
    expect(MISSING_FIELDS).toContain("machine_mass_kg");
    expect(MISSING_FIELDS).toContain("manufacturer_tier");
    expect(MISSING_FIELDS.length).toBe(8);
  });
});

describe("U-DB-MACHINE-QUALITY-SCORE — reputationTierFor (5 spanning manufacturers)", () => {
  const e = new MachineQualityScoreEngine();
  it("DMG MORI → S", () => expect(e.reputationTierFor("DMG MORI")).toBe("S"));
  it("Okuma → A",   () => expect(e.reputationTierFor("Okuma")).toBe("A"));
  it("Haas → B",    () => expect(e.reputationTierFor("Haas")).toBe("B"));
  it("Centroid → C",() => expect(e.reputationTierFor("Centroid")).toBe("C"));
  it("Shapeoko → D",() => expect(e.reputationTierFor("Shapeoko")).toBe("D"));
  it("case-insensitive partial match: 'mitsubishi mv1200r' → S", () => {
    expect(e.reputationTierFor("Mitsubishi MV1200R")).toBe("S");
  });
  it("unknown manufacturer → UNKNOWN", () => {
    expect(e.reputationTierFor("ZZZ_FAKE_MFG")).toBe("UNKNOWN");
  });
  it("null/empty → UNKNOWN (no throw)", () => {
    expect(e.reputationTierFor(null)).toBe("UNKNOWN");
    expect(e.reputationTierFor("")).toBe("UNKNOWN");
    expect(e.reputationTierFor(undefined)).toBe("UNKNOWN");
  });
});

describe("U-DB-MACHINE-QUALITY-SCORE — score() composite (3 spanning profiles)", () => {
  it("top-tier (DMG MORI + Fanuc + box-way + 5μm accuracy + 24000mm/min rapid + 1.5g + 1000 look-ahead + 8000kg)", async () => {
    const r = await machineQualityScoreEngine.score({
      machine: {
        id: "test-top", manufacturer: "DMG MORI", model: "NMV5000DCG",
        controller: { family: "fanuc_31i" },
        way_type: "box_way",
        positioning_accuracy_um: 5,
        repeatability_um: 3,
        max_rapid_mm_min: 24000,
        max_accel_g: 1.5,
        look_ahead_blocks: 1000,
        machine_mass_kg: 8000,
      },
    });
    expect(r.ok).toBe(true);
    expect(r.tier).toBe("S");
    expect(r.score).toBeGreaterThanOrEqual(75);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.missing_fields.length).toBe(0);
    expect(r.accuracy_compensation_factor).toBeGreaterThanOrEqual(0.85);
  });

  it("mid-tier (Haas + Haas NGC + linear rail + 10μm accuracy + 18000mm/min + 0.8g + 200 look-ahead + 4500kg)", async () => {
    const r = await machineQualityScoreEngine.score({
      machine: {
        id: "test-mid", manufacturer: "Haas", model: "VF-2",
        controller: { family: "haas_ngc" },
        way_type: "linear_rail",
        positioning_accuracy_um: 10,
        repeatability_um: 8,
        max_rapid_mm_min: 18000,
        max_accel_g: 0.8,
        look_ahead_blocks: 200,
        machine_mass_kg: 4500,
      },
    });
    expect(r.ok).toBe(true);
    expect(r.tier).toBe("B");
    expect(r.score).toBeGreaterThan(50);
    expect(r.score).toBeLessThan(85);
    expect(r.missing_fields.length).toBe(0);
  });

  it("hobby (Shapeoko + GRBL + V-way + 100μm + 5000mm/min + 0.3g + 16 look-ahead + 50kg)", async () => {
    const r = await machineQualityScoreEngine.score({
      machine: {
        id: "test-hobby", manufacturer: "Shapeoko", model: "Pro",
        controller: { family: "grbl" },
        way_type: "v_way",
        positioning_accuracy_um: 100,
        repeatability_um: 50,
        max_rapid_mm_min: 5000,
        max_accel_g: 0.3,
        look_ahead_blocks: 16,
        machine_mass_kg: 50,
      },
    });
    expect(r.ok).toBe(true);
    expect(r.tier).toBe("D");
    expect(r.score).toBeLessThan(50);
    expect(r.accuracy_compensation_factor).toBeLessThan(0.75);
  });
});

describe("U-DB-MACHINE-QUALITY-SCORE — missing_fields audit", () => {
  it("bare-bones machine surfaces ALL 8 missing fields", async () => {
    const r = await machineQualityScoreEngine.score({
      machine: { id: "bare", manufacturer: "ZZZ_FAKE", model: "X" },
    });
    expect(r.ok).toBe(true);
    expect(r.missing_fields.length).toBe(8);
    for (const f of MISSING_FIELDS) {
      expect(r.missing_fields).toContain(f);
    }
  });

  it("missing_count drops as fields are filled in (3-step ramp)", async () => {
    const bare = await machineQualityScoreEngine.score({
      machine: { id: "x", manufacturer: "ZZZ", model: "Y" },
    });
    const half = await machineQualityScoreEngine.score({
      machine: {
        id: "x", manufacturer: "ZZZ", model: "Y",
        positioning_accuracy_um: 10, repeatability_um: 7, way_type: "linear_rail", max_rapid_mm_min: 12000,
      },
    });
    const full = await machineQualityScoreEngine.score({
      machine: {
        id: "x", manufacturer: "Okuma", model: "Z",
        positioning_accuracy_um: 5, repeatability_um: 3,
        way_type: "box_way", max_rapid_mm_min: 24000,
        max_accel_g: 1.0, look_ahead_blocks: 500, machine_mass_kg: 6000,
      },
    });
    expect(bare.missing_fields.length).toBeGreaterThan(half.missing_fields.length);
    expect(half.missing_fields.length).toBeGreaterThan(full.missing_fields.length);
    expect(full.missing_fields.length).toBe(0);
  });
});

describe("U-DB-MACHINE-QUALITY-SCORE — failure modes + adversarial", () => {
  it("FAILURE: no machine and no machine_id → ok:false + warning", async () => {
    const r = await machineQualityScoreEngine.score({});
    expect(r.ok).toBe(false);
    expect(r.warning).toContain("must provide");
  });

  it("FAILURE: unknown machine_id → ok:false (graceful, no throw)", async () => {
    const r = await machineQualityScoreEngine.score({ machine_id: "DEFINITELY_NOT_A_MACHINE" });
    expect(r.ok).toBe(false);
  });

  it("ADVERSARIAL: NaN/Infinity in accuracy → treated as missing (no NaN propagation)", async () => {
    const r = await machineQualityScoreEngine.score({
      machine: { id: "x", manufacturer: "Haas", model: "VF", positioning_accuracy_um: NaN, max_rapid_mm_min: Infinity },
    });
    expect(r.ok).toBe(true);
    expect(isFinite(r.score)).toBe(true);
    expect(r.missing_fields).toContain("positioning_accuracy_um");
    expect(r.missing_fields).toContain("max_rapid_mm_min");
  });

  it("ADVERSARIAL: empty-string manufacturer → tier UNKNOWN, score remains finite", async () => {
    const r = await machineQualityScoreEngine.score({
      machine: { id: "x", manufacturer: "", model: "Y" },
    });
    expect(r.tier).toBe("UNKNOWN");
    expect(isFinite(r.score)).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});

describe("U-DB-MACHINE-QUALITY-SCORE — schema contract + wiring", () => {
  it("machine_quality_score schema accepts {machine_id: ...}", () => {
    const r = ACTION_INTELLIGENCE_SCHEMAS["machine_quality_score"].safeParse({ machine_id: "haas-vf2-001" });
    expect(r.success).toBe(true);
  });

  it("machine_quality_score schema accepts {machine: {...}}", () => {
    const r = ACTION_INTELLIGENCE_SCHEMAS["machine_quality_score"].safeParse({
      machine: { id: "x", manufacturer: "Haas", model: "VF-2" },
    });
    expect(r.success).toBe(true);
  });

  it("machine_quality_score schema rejects empty input (refine guard)", () => {
    const r = ACTION_INTELLIGENCE_SCHEMAS["machine_quality_score"].safeParse({});
    expect(r.success).toBe(false);
  });

  it("machine_quality_audit schema accepts empty input", () => {
    const r = ACTION_INTELLIGENCE_SCHEMAS["machine_quality_audit"].safeParse({});
    expect(r.success).toBe(true);
  });

  it("ALL 7 prism_intelligence DB-bridge actions parse representative input (wiring proof)", () => {
    const repInputs: Record<string, unknown> = {
      "feature_store_query": { domain: "mill", feature_group: "g", entity_ids: ["e1"] },
      "feature_store_put":   { domain: "mill", feature_group: "g", entity_id: "e1", event_ts: "2026-05-25T20:00:00.000Z", feature_values: {} },
      "feature_store_stats": {},
      "catalog_unified_match": { material: "test" },
      "catalog_resolve_for_consumer": { consumer: "quoting", material: "test" },
      "machine_quality_score": { machine_id: "haas-vf2-001" },
      "machine_quality_audit": {},
    };
    const liveActions = Object.keys(repInputs);
    for (const a of liveActions) {
      const r = (ACTION_INTELLIGENCE_SCHEMAS as Record<string, any>)[a].safeParse(repInputs[a]);
      expect(r.success).toBe(true);
    }
    expect(liveActions.length).toBe(7);
  });
});
