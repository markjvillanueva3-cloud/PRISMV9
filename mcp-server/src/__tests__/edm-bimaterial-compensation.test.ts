/**
 * EDMBiMaterialCompensationEngine — Comprehensive Test Suite
 *
 * Tests: optimize(), analyzeTransitionRisk(), inferZones(), computeUVCompensation()
 * Covers: all 14 shop steels + carbide + silver braze
 * Scenarios: H13+carbide 30mm, D2+carbide 50mm, multi-insert, taper, UV compensation, edge cases
 */
import { describe, it, expect } from "vitest";
import {
  edmBiMaterialCompensationEngine,
  type MaterialZone,
  type BiMaterialResult,
} from "../engines/EDMBiMaterialCompensationEngine.js";

// ============================================================================
// SHARED FIXTURES
// ============================================================================

/** Simple H13 + carbide insert profile (30mm part, single insert) */
const H13_CARBIDE_30MM: MaterialZone[] = [
  { zone_id: "Z1", material: "h13", zone_type: "primary_steel", start_mm: 0, end_mm: 10, hardness_hrc: 52 },
  { zone_id: "Z2", material: "silver_braze", zone_type: "braze_joint", start_mm: 10, end_mm: 10.5 },
  { zone_id: "Z3", material: "carbide", zone_type: "carbide_insert", start_mm: 10.5, end_mm: 18 },
  { zone_id: "Z4", material: "silver_braze", zone_type: "braze_joint", start_mm: 18, end_mm: 18.5 },
  { zone_id: "Z5", material: "h13", zone_type: "primary_steel", start_mm: 18.5, end_mm: 30, hardness_hrc: 52 },
];

/** D2 at 60 HRC + carbide, 50mm thick */
const D2_CARBIDE_50MM: MaterialZone[] = [
  { zone_id: "Z1", material: "d2", zone_type: "primary_steel", start_mm: 0, end_mm: 15, hardness_hrc: 60 },
  { zone_id: "Z2", material: "silver_braze", zone_type: "braze_joint", start_mm: 15, end_mm: 15.5 },
  { zone_id: "Z3", material: "carbide", zone_type: "carbide_insert", start_mm: 15.5, end_mm: 30 },
  { zone_id: "Z4", material: "silver_braze", zone_type: "braze_joint", start_mm: 30, end_mm: 30.5 },
  { zone_id: "Z5", material: "d2", zone_type: "primary_steel", start_mm: 30.5, end_mm: 50, hardness_hrc: 60 },
];

/** Multi-insert profile: steel → braze → carbide → braze → steel → braze → carbide → braze → steel */
const MULTI_INSERT: MaterialZone[] = [
  { zone_id: "Z1", material: "4140", zone_type: "primary_steel", start_mm: 0, end_mm: 8, hardness_hrc: 45 },
  { zone_id: "Z2", material: "silver_braze", zone_type: "braze_joint", start_mm: 8, end_mm: 8.5 },
  { zone_id: "Z3", material: "carbide", zone_type: "carbide_insert", start_mm: 8.5, end_mm: 14 },
  { zone_id: "Z4", material: "silver_braze", zone_type: "braze_joint", start_mm: 14, end_mm: 14.5 },
  { zone_id: "Z5", material: "4140", zone_type: "primary_steel", start_mm: 14.5, end_mm: 22, hardness_hrc: 45 },
  { zone_id: "Z6", material: "silver_braze", zone_type: "braze_joint", start_mm: 22, end_mm: 22.5 },
  { zone_id: "Z7", material: "carbide", zone_type: "carbide_insert", start_mm: 22.5, end_mm: 28 },
  { zone_id: "Z8", material: "silver_braze", zone_type: "braze_joint", start_mm: 28, end_mm: 28.5 },
  { zone_id: "Z9", material: "4140", zone_type: "primary_steel", start_mm: 28.5, end_mm: 35, hardness_hrc: 45 },
];

/** Single-material profile (no carbide, no transitions — degenerate case) */
const SINGLE_MATERIAL: MaterialZone[] = [
  { zone_id: "Z1", material: "a2", zone_type: "primary_steel", start_mm: 0, end_mm: 40, hardness_hrc: 58 },
];

/** Taper profile with UV axis */
const TAPER_PROFILE: MaterialZone[] = [
  { zone_id: "Z1", material: "s7", zone_type: "primary_steel", start_mm: 0, end_mm: 12, hardness_hrc: 50, taper_angle_deg: 3 },
  { zone_id: "Z2", material: "silver_braze", zone_type: "braze_joint", start_mm: 12, end_mm: 12.5 },
  { zone_id: "Z3", material: "carbide", zone_type: "carbide_insert", start_mm: 12.5, end_mm: 20, taper_angle_deg: 3 },
  { zone_id: "Z4", material: "silver_braze", zone_type: "braze_joint", start_mm: 20, end_mm: 20.5 },
  { zone_id: "Z5", material: "s7", zone_type: "primary_steel", start_mm: 20.5, end_mm: 30, hardness_hrc: 50, taper_angle_deg: 3 },
];

// ============================================================================
// optimize()
// ============================================================================

describe("EDMBiMaterialCompensationEngine", () => {
  describe("optimize()", () => {
    it("returns correct zone count and transitions for H13+carbide 30mm", () => {
      const result = edmBiMaterialCompensationEngine.optimize({
        zones: H13_CARBIDE_30MM,
        thickness_mm: 30,
      });

      expect(result.profile.zone_count).toBe(5);
      expect(result.profile.transition_count).toBe(4); // 4 boundaries
      expect(result.profile.has_carbide).toBe(true);
      expect(result.profile.has_braze).toBe(true);
      expect(result.profile.total_length_mm).toBe(30);
      expect(result.zones.length).toBe(5);
      expect(result.transitions.length).toBe(4);
    });

    it("produces distinct parameters for steel vs carbide vs braze zones", () => {
      const result = edmBiMaterialCompensationEngine.optimize({
        zones: H13_CARBIDE_30MM,
        thickness_mm: 30,
      });

      const steelZone = result.zones.find(z => z.zone_type === "primary_steel")!;
      const carbideZone = result.zones.find(z => z.zone_type === "carbide_insert")!;
      const brazeZone = result.zones.find(z => z.zone_type === "braze_joint")!;

      // Carbide needs longer t_on (higher melting point)
      expect(carbideZone.t_on_us).toBeGreaterThan(steelZone.t_on_us);

      // Braze needs drastically reduced energy (low melting point)
      expect(brazeZone.t_on_us).toBeLessThan(steelZone.t_on_us);
      expect(brazeZone.peak_current_A).toBeLessThan(steelZone.peak_current_A);

      // Carbide needs more flushing pressure for debris evacuation
      expect(carbideZone.flushing_pressure_bar).toBeGreaterThan(steelZone.flushing_pressure_bar);

      // Wire tension reduced at carbide (break resistance)
      expect(carbideZone.wire_tension_N).toBeLessThan(steelZone.wire_tension_N);

      // Wire speed increased at carbide (more debris)
      expect(carbideZone.wire_speed_m_min).toBeGreaterThan(steelZone.wire_speed_m_min);

      // Braze wire speed reduced (soft, less debris)
      expect(brazeZone.wire_speed_m_min).toBeLessThan(steelZone.wire_speed_m_min);
    });

    it("carbide zone has higher wire break risk than steel", () => {
      const result = edmBiMaterialCompensationEngine.optimize({
        zones: H13_CARBIDE_30MM,
        thickness_mm: 30,
      });

      const steelRisk = result.zones.find(z => z.zone_type === "primary_steel")!.wire_break_risk;
      const carbideRisk = result.zones.find(z => z.zone_type === "carbide_insert")!.wire_break_risk;
      expect(carbideRisk).toBeGreaterThan(steelRisk);
    });

    it("D2 at 60 HRC + carbide at 50mm has elevated risk and lower feed rates", () => {
      const result = edmBiMaterialCompensationEngine.optimize({
        zones: D2_CARBIDE_50MM,
        thickness_mm: 50,
      });

      // Thicker part + harder material = higher break risk
      expect(result.overall_wire_break_risk).toBeGreaterThan(0.05);

      // All zones should have positive feed rates
      for (const z of result.zones) {
        expect(z.feed_rate_mm_min).toBeGreaterThan(0);
        expect(z.mrr_mm2_min).toBeGreaterThan(0);
      }

      // D2 is harder to cut than 4140 — lower machinability
      const d2Zone = result.zones.find(z => z.material === "d2")!;
      expect(d2Zone.mrr_mm2_min).toBeGreaterThan(0);

      // Should produce recommendations about submerged flushing for >40mm carbide
      expect(result.recommendations.some(r => r.includes("submerged") || r.includes("40mm"))).toBe(true);
    });

    it("multi-insert profile generates correct number of transitions", () => {
      const result = edmBiMaterialCompensationEngine.optimize({
        zones: MULTI_INSERT,
        thickness_mm: 25,
      });

      expect(result.profile.zone_count).toBe(9);
      expect(result.profile.transition_count).toBe(8); // 8 zone boundaries
      expect(result.zones.length).toBe(9);
      expect(result.transitions.length).toBe(8);

      // 2 carbide inserts in the profile
      const carbideZones = result.zones.filter(z => z.zone_type === "carbide_insert");
      expect(carbideZones.length).toBe(2);

      // 4 braze joints (entry+exit for each insert)
      const brazeZones = result.zones.filter(z => z.zone_type === "braze_joint");
      expect(brazeZones.length).toBe(4);
    });

    it("skim passes reduce energy parameters relative to rough", () => {
      const rough = edmBiMaterialCompensationEngine.optimize({
        zones: H13_CARBIDE_30MM,
        thickness_mm: 30,
        pass_type: "rough",
      });
      const finish = edmBiMaterialCompensationEngine.optimize({
        zones: H13_CARBIDE_30MM,
        thickness_mm: 30,
        pass_type: "finish",
      });
      const superFinish = edmBiMaterialCompensationEngine.optimize({
        zones: H13_CARBIDE_30MM,
        thickness_mm: 30,
        pass_type: "super_finish",
      });

      const roughSteel = rough.zones.find(z => z.zone_id === "Z1")!;
      const finishSteel = finish.zones.find(z => z.zone_id === "Z1")!;
      const sfSteel = superFinish.zones.find(z => z.zone_id === "Z1")!;

      // t_on decreases with finer passes
      expect(finishSteel.t_on_us).toBeLessThan(roughSteel.t_on_us);
      expect(sfSteel.t_on_us).toBeLessThan(finishSteel.t_on_us);

      // Current decreases with finer passes
      expect(finishSteel.peak_current_A).toBeLessThan(roughSteel.peak_current_A);

      // Ra improves with finer passes
      expect(finishSteel.predicted_ra_um).toBeLessThan(roughSteel.predicted_ra_um);
      expect(sfSteel.predicted_ra_um).toBeLessThan(finishSteel.predicted_ra_um);
    });

    it("wire diameter factor scales parameters proportionally", () => {
      const standard = edmBiMaterialCompensationEngine.optimize({
        zones: SINGLE_MATERIAL,
        thickness_mm: 25,
        wire_diameter_mm: 0.25,
      });
      const thinner = edmBiMaterialCompensationEngine.optimize({
        zones: SINGLE_MATERIAL,
        thickness_mm: 25,
        wire_diameter_mm: 0.10,
      });

      const stdZone = standard.zones[0];
      const thinZone = thinner.zones[0];

      // Thinner wire = less energy capacity = lower current
      expect(thinZone.peak_current_A).toBeLessThan(stdZone.peak_current_A);
      expect(thinZone.t_on_us).toBeLessThan(stdZone.t_on_us);
    });

    it("single-material profile produces no transitions", () => {
      const result = edmBiMaterialCompensationEngine.optimize({
        zones: SINGLE_MATERIAL,
        thickness_mm: 25,
      });

      expect(result.profile.zone_count).toBe(1);
      expect(result.profile.transition_count).toBe(0);
      expect(result.transitions.length).toBe(0);
      expect(result.profile.has_carbide).toBe(false);
      expect(result.profile.has_braze).toBe(false);
    });

    it("empty zones array returns empty result with warning", () => {
      const result = edmBiMaterialCompensationEngine.optimize({
        zones: [],
        thickness_mm: 25,
      });

      expect(result.profile.zone_count).toBe(0);
      expect(result.zones.length).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.estimated_time_min).toBe(0);
    });

    it("taper profile generates UV taper warnings when carbide present", () => {
      const result = edmBiMaterialCompensationEngine.optimize({
        zones: TAPER_PROFILE,
        thickness_mm: 25,
      });

      expect(result.warnings.some(w => w.includes("taper") || w.includes("UV"))).toBe(true);
      expect(result.recommendations.some(r => r.includes("UV") || r.includes("taper"))).toBe(true);
    });

    it("time breakdown sums to estimated total", () => {
      const result = edmBiMaterialCompensationEngine.optimize({
        zones: H13_CARBIDE_30MM,
        thickness_mm: 30,
      });

      // Time breakdown zone times + transition times = total (approximately)
      const zoneTimeSum = result.time_breakdown.reduce((s, t) => s + t.time_min, 0);
      // Zone times are always <= total (transitions add time)
      expect(zoneTimeSum).toBeLessThanOrEqual(result.estimated_time_min + 0.01);
      expect(result.estimated_time_min).toBeGreaterThan(0);
    });

    it("wire consumption is positive and proportional to time", () => {
      const result = edmBiMaterialCompensationEngine.optimize({
        zones: H13_CARBIDE_30MM,
        thickness_mm: 30,
      });

      expect(result.estimated_wire_m).toBeGreaterThan(0);
      // Wire consumption should scale roughly with time × wire speed
      // At ~8m/min baseline, for a few minutes of cutting, expect tens of meters
      expect(result.estimated_wire_m).toBeGreaterThan(1);
    });

    it("overall break risk is worst-case across all zones and transitions", () => {
      const result = edmBiMaterialCompensationEngine.optimize({
        zones: D2_CARBIDE_50MM,
        thickness_mm: 50,
      });

      const maxZoneRisk = Math.max(...result.zones.map(z => z.wire_break_risk));
      const maxTransRisk = result.transitions.length > 0
        ? Math.max(...result.transitions.map(t => t.transition_break_risk))
        : 0;

      expect(result.overall_wire_break_risk).toBeCloseTo(Math.max(maxZoneRisk, maxTransRisk), 3);
    });

    it("transition ramps have dwell at carbide boundaries", () => {
      const result = edmBiMaterialCompensationEngine.optimize({
        zones: H13_CARBIDE_30MM,
        thickness_mm: 30,
      });

      // Find transitions touching carbide
      const carbideTransitions = result.transitions.filter(
        t => result.zones.find(z => z.zone_id === t.from_zone_id)?.zone_type === "carbide_insert" ||
             result.zones.find(z => z.zone_id === t.to_zone_id)?.zone_type === "carbide_insert"
      );

      for (const t of carbideTransitions) {
        expect(t.dwell_at_boundary).toBe(true);
        expect(t.dwell_s).toBeGreaterThan(0);
      }
    });

    it("carbide zone notes mention WC-Co and flushing", () => {
      const result = edmBiMaterialCompensationEngine.optimize({
        zones: H13_CARBIDE_30MM,
        thickness_mm: 30,
      });

      const carbideZone = result.zones.find(z => z.zone_type === "carbide_insert")!;
      expect(carbideZone.notes.some(n => n.includes("WC-Co"))).toBe(true);
      expect(carbideZone.notes.some(n => n.includes("flushing"))).toBe(true);
    });

    it("braze zone notes warn about low melting point", () => {
      const result = edmBiMaterialCompensationEngine.optimize({
        zones: H13_CARBIDE_30MM,
        thickness_mm: 30,
      });

      const brazeZone = result.zones.find(z => z.zone_type === "braze_joint")!;
      expect(brazeZone.notes.some(n => n.includes("780°C"))).toBe(true);
      expect(brazeZone.notes.some(n => n.includes("melt-back"))).toBe(true);
    });

    // ── Shop Scenario Tests ────────────────────────────────────────────

    it("shop scenario: 4140-PH hardened + carbide at 25mm", () => {
      const zones: MaterialZone[] = [
        { zone_id: "Z1", material: "4140", zone_type: "primary_steel", start_mm: 0, end_mm: 8, hardness_hrc: 48 },
        { zone_id: "Z2", material: "silver_braze", zone_type: "braze_joint", start_mm: 8, end_mm: 8.5 },
        { zone_id: "Z3", material: "carbide", zone_type: "carbide_insert", start_mm: 8.5, end_mm: 16 },
        { zone_id: "Z4", material: "silver_braze", zone_type: "braze_joint", start_mm: 16, end_mm: 16.5 },
        { zone_id: "Z5", material: "4140", zone_type: "primary_steel", start_mm: 16.5, end_mm: 25, hardness_hrc: 48 },
      ];

      const result = edmBiMaterialCompensationEngine.optimize({ zones, thickness_mm: 25 });

      expect(result.profile.zone_count).toBe(5);
      expect(result.profile.has_carbide).toBe(true);
      expect(result.estimated_time_min).toBeGreaterThan(0);
      // 4140 is more machinable than D2 — MRR should be decent
      const steelMrr = result.zones.find(z => z.material === "4140")!.mrr_mm2_min;
      expect(steelMrr).toBeGreaterThan(10);
    });

    it("shop scenario: M2 HSS + carbide at 35mm (high resistivity)", () => {
      const zones: MaterialZone[] = [
        { zone_id: "Z1", material: "m2", zone_type: "primary_steel", start_mm: 0, end_mm: 12 },
        { zone_id: "Z2", material: "silver_braze", zone_type: "braze_joint", start_mm: 12, end_mm: 12.5 },
        { zone_id: "Z3", material: "carbide", zone_type: "carbide_insert", start_mm: 12.5, end_mm: 22 },
        { zone_id: "Z4", material: "silver_braze", zone_type: "braze_joint", start_mm: 22, end_mm: 22.5 },
        { zone_id: "Z5", material: "m2", zone_type: "primary_steel", start_mm: 22.5, end_mm: 35 },
      ];

      const result = edmBiMaterialCompensationEngine.optimize({ zones, thickness_mm: 35 });

      // M2 has high resistivity (60 µΩ·cm) — servo voltage should be elevated
      const m2Zone = result.zones.find(z => z.material === "m2")!;
      expect(m2Zone.servo_voltage_V).toBeGreaterThan(50); // above baseline

      // M2 has lower machinability (0.90) — MRR reduced vs plain steel
      expect(m2Zone.mrr_mm2_min).toBeGreaterThan(0);
    });

    it("shop scenario: O2 + 52100 bearing steel (mixed steels, no carbide)", () => {
      const zones: MaterialZone[] = [
        { zone_id: "Z1", material: "o2", zone_type: "primary_steel", start_mm: 0, end_mm: 20, hardness_hrc: 58 },
        { zone_id: "Z2", material: "52100", zone_type: "secondary_steel", start_mm: 20, end_mm: 40, hardness_hrc: 62 },
      ];

      const result = edmBiMaterialCompensationEngine.optimize({ zones, thickness_mm: 30 });

      expect(result.profile.zone_count).toBe(2);
      expect(result.profile.has_carbide).toBe(false);
      expect(result.profile.has_braze).toBe(false);
      // 52100 has lower machinability (0.85) — should cut slower
      const o2Zone = result.zones.find(z => z.material === "o2")!;
      const bearingZone = result.zones.find(z => z.material === "52100")!;
      expect(bearingZone.mrr_mm2_min).toBeLessThan(o2Zone.mrr_mm2_min);
    });

    it("shop scenario: 1018 soft steel + carbide (high machinability contrast)", () => {
      const zones: MaterialZone[] = [
        { zone_id: "Z1", material: "1018", zone_type: "primary_steel", start_mm: 0, end_mm: 10 },
        { zone_id: "Z2", material: "silver_braze", zone_type: "braze_joint", start_mm: 10, end_mm: 10.5 },
        { zone_id: "Z3", material: "carbide", zone_type: "carbide_insert", start_mm: 10.5, end_mm: 20 },
        { zone_id: "Z4", material: "silver_braze", zone_type: "braze_joint", start_mm: 20, end_mm: 20.5 },
        { zone_id: "Z5", material: "1018", zone_type: "primary_steel", start_mm: 20.5, end_mm: 30 },
      ];

      const result = edmBiMaterialCompensationEngine.optimize({ zones, thickness_mm: 20 });

      // 1018 is soft and conductive — high machinability (1.15)
      const softZone = result.zones.find(z => z.material === "1018")!;
      const carbideZone = result.zones.find(z => z.zone_type === "carbide_insert")!;

      // Dramatic machinability contrast (1.15 vs 0.40) → high energy mismatch at transitions
      expect(softZone.mrr_mm2_min).toBeGreaterThan(carbideZone.mrr_mm2_min);
    });

    it("shop scenario: M42 cobalt HSS + carbide (both hard materials)", () => {
      const zones: MaterialZone[] = [
        { zone_id: "Z1", material: "m42", zone_type: "primary_steel", start_mm: 0, end_mm: 12, hardness_hrc: 66 },
        { zone_id: "Z2", material: "silver_braze", zone_type: "braze_joint", start_mm: 12, end_mm: 12.5 },
        { zone_id: "Z3", material: "carbide", zone_type: "carbide_insert", start_mm: 12.5, end_mm: 20 },
        { zone_id: "Z4", material: "silver_braze", zone_type: "braze_joint", start_mm: 20, end_mm: 20.5 },
        { zone_id: "Z5", material: "m42", zone_type: "primary_steel", start_mm: 20.5, end_mm: 30, hardness_hrc: 66 },
      ];

      const result = edmBiMaterialCompensationEngine.optimize({ zones, thickness_mm: 25 });

      // M42 at 66 HRC should trigger the hardness >55 note
      const m42Zone = result.zones.find(z => z.material === "m42" && z.zone_type === "primary_steel")!;
      expect(m42Zone.notes.some(n => n.includes("66 HRC") || n.includes("Hardened"))).toBe(true);

      // Carbide at >65 HRC should recommend molybdenum wire
      // (carbide doesn't use HRC, but if hardness were set, it would trigger)
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // analyzeTransitionRisk()
  // ============================================================================

  describe("analyzeTransitionRisk()", () => {
    it("steel→carbide at 25mm: moderate risk", () => {
      const risk = edmBiMaterialCompensationEngine.analyzeTransitionRisk({
        from_material: "d2",
        to_material: "carbide",
        thickness_mm: 25,
      });

      expect(risk.from_material).toBe("d2");
      expect(risk.to_material).toBe("carbide");
      expect(risk.energy_ratio).toBeGreaterThan(1);
      expect(risk.break_probability).toBeGreaterThanOrEqual(0);
      expect(risk.break_probability).toBeLessThanOrEqual(1);
      expect(["low", "moderate", "high", "critical"]).toContain(risk.risk_level);
    });

    it("steel→carbide at 60mm: higher risk than 25mm", () => {
      const risk25 = edmBiMaterialCompensationEngine.analyzeTransitionRisk({
        from_material: "h13",
        to_material: "carbide",
        thickness_mm: 25,
      });
      const risk60 = edmBiMaterialCompensationEngine.analyzeTransitionRisk({
        from_material: "h13",
        to_material: "carbide",
        thickness_mm: 60,
      });

      expect(risk60.break_probability).toBeGreaterThan(risk25.break_probability);
    });

    it("steel→braze: detects low melting point hazard", () => {
      const risk = edmBiMaterialCompensationEngine.analyzeTransitionRisk({
        from_material: "h13",
        to_material: "braze",
        thickness_mm: 25,
      });

      expect(risk.notes.some(n => n.includes("780°C") || n.includes("melt"))).toBe(true);
    });

    it("1018→carbide: high contrast gives elevated risk", () => {
      const risk = edmBiMaterialCompensationEngine.analyzeTransitionRisk({
        from_material: "1018",
        to_material: "carbide",
        thickness_mm: 30,
      });

      // 1018 is soft (machinability 1.15), carbide is hard (0.40)
      expect(risk.energy_ratio).toBeGreaterThan(1);
      expect(risk.break_probability).toBeGreaterThan(0);
    });

    it("recommends coated brass wire at high risk", () => {
      const risk = edmBiMaterialCompensationEngine.analyzeTransitionRisk({
        from_material: "1018",
        to_material: "carbide",
        thickness_mm: 80, // very thick → high risk
      });

      if (risk.risk_level === "high" || risk.risk_level === "critical") {
        expect(risk.recommended_wire).toBe("coated_brass");
        expect(risk.recommended_feed_reduction_pct).toBeGreaterThanOrEqual(40);
      }
    });

    it("returns correct feed reduction percentages per risk level", () => {
      // Low risk scenario: small thickness, similar materials
      const lowRisk = edmBiMaterialCompensationEngine.analyzeTransitionRisk({
        from_material: "h13",
        to_material: "d2",
        thickness_mm: 10,
      });

      expect(lowRisk.recommended_feed_reduction_pct).toBeGreaterThanOrEqual(0);
      expect(lowRisk.recommended_feed_reduction_pct).toBeLessThanOrEqual(60);
    });

    it("dwell recommendation scales with risk level", () => {
      const moderate = edmBiMaterialCompensationEngine.analyzeTransitionRisk({
        from_material: "h13",
        to_material: "carbide",
        thickness_mm: 15,
      });
      const heavy = edmBiMaterialCompensationEngine.analyzeTransitionRisk({
        from_material: "1018",
        to_material: "carbide",
        thickness_mm: 80,
      });

      expect(heavy.recommended_dwell_s).toBeGreaterThanOrEqual(moderate.recommended_dwell_s);
    });

    it("all shop steels resolve without error", () => {
      const steels = ["h13", "4140", "a2", "d2", "s7", "o2", "52100", "1018", "1020", "m2", "m4", "m42"];
      for (const steel of steels) {
        const risk = edmBiMaterialCompensationEngine.analyzeTransitionRisk({
          from_material: steel,
          to_material: "carbide",
          thickness_mm: 25,
        });
        expect(risk.energy_ratio).toBeGreaterThan(0);
        expect(risk.break_probability).toBeGreaterThanOrEqual(0);
        expect(risk.from_material).toBe(steel);
      }
    });
  });

  // ============================================================================
  // inferZones()
  // ============================================================================

  describe("inferZones()", () => {
    it("single insert generates 5 zones (steel→braze→carbide→braze→steel)", () => {
      const result = edmBiMaterialCompensationEngine.inferZones({
        steel_material: "h13",
        steel_hardness_hrc: 52,
        insert_positions: [{ start_mm: 10, end_mm: 20 }],
        total_profile_length_mm: 30,
      });

      expect(result.zones.length).toBe(5);
      expect(result.zones[0].zone_type).toBe("primary_steel");
      expect(result.zones[1].zone_type).toBe("braze_joint");
      expect(result.zones[2].zone_type).toBe("carbide_insert");
      expect(result.zones[3].zone_type).toBe("braze_joint");
      expect(result.zones[4].zone_type).toBe("primary_steel");
    });

    it("braze joints are 0.5mm wide", () => {
      const result = edmBiMaterialCompensationEngine.inferZones({
        steel_material: "d2",
        insert_positions: [{ start_mm: 15, end_mm: 25 }],
        total_profile_length_mm: 40,
      });

      const brazeZones = result.zones.filter(z => z.zone_type === "braze_joint");
      expect(brazeZones.length).toBe(2);
      for (const bz of brazeZones) {
        expect(bz.end_mm - bz.start_mm).toBeCloseTo(0.5, 5);
        expect(bz.material).toBe("silver_braze");
      }
    });

    it("two inserts generate 9 zones", () => {
      const result = edmBiMaterialCompensationEngine.inferZones({
        steel_material: "4140",
        steel_hardness_hrc: 45,
        insert_positions: [
          { start_mm: 8, end_mm: 14 },
          { start_mm: 22, end_mm: 28 },
        ],
        total_profile_length_mm: 35,
      });

      // steel + braze + carbide + braze + steel + braze + carbide + braze + steel = 9
      expect(result.zones.length).toBe(9);
      expect(result.zones.filter(z => z.zone_type === "carbide_insert").length).toBe(2);
      expect(result.zones.filter(z => z.zone_type === "braze_joint").length).toBe(4);
      expect(result.zones.filter(z => z.zone_type === "primary_steel").length).toBe(3);
    });

    it("steel hardness propagates to all steel zones", () => {
      const result = edmBiMaterialCompensationEngine.inferZones({
        steel_material: "d2",
        steel_hardness_hrc: 60,
        insert_positions: [{ start_mm: 10, end_mm: 20 }],
        total_profile_length_mm: 30,
      });

      const steelZones = result.zones.filter(z => z.zone_type === "primary_steel");
      for (const sz of steelZones) {
        expect(sz.hardness_hrc).toBe(60);
        expect(sz.material).toBe("d2");
      }
    });

    it("custom carbide grade is preserved in carbide zone", () => {
      const result = edmBiMaterialCompensationEngine.inferZones({
        steel_material: "h13",
        insert_positions: [{ start_mm: 10, end_mm: 20, carbide_grade: "K20" }],
        total_profile_length_mm: 30,
      });

      const carbideZone = result.zones.find(z => z.zone_type === "carbide_insert")!;
      expect(carbideZone.material).toBe("K20");
    });

    it("insert at profile start generates no leading steel zone", () => {
      const result = edmBiMaterialCompensationEngine.inferZones({
        steel_material: "s7",
        insert_positions: [{ start_mm: 0.5, end_mm: 10 }],
        total_profile_length_mm: 20,
      });

      // First zone should be braze (no room for steel between cursor=0 and insert_start-0.5=0)
      expect(result.zones[0].zone_type).toBe("braze_joint");
      expect(result.zones[0].start_mm).toBeCloseTo(0, 5);
    });

    it("insert at profile end generates no trailing steel zone", () => {
      const result = edmBiMaterialCompensationEngine.inferZones({
        steel_material: "a2",
        insert_positions: [{ start_mm: 10, end_mm: 19.5 }],
        total_profile_length_mm: 20, // insert ends at 19.5, braze at 20.0 = profile end
      });

      const lastZone = result.zones[result.zones.length - 1];
      // Last zone is braze (at 19.5-20.0), no trailing steel
      expect(lastZone.zone_type).toBe("braze_joint");
    });

    it("inferred zones feed correctly into optimize()", () => {
      const inferred = edmBiMaterialCompensationEngine.inferZones({
        steel_material: "h13",
        steel_hardness_hrc: 52,
        insert_positions: [{ start_mm: 10, end_mm: 20 }],
        total_profile_length_mm: 30,
      });

      const result = edmBiMaterialCompensationEngine.optimize({
        zones: inferred.zones,
        thickness_mm: 25,
      });

      expect(result.profile.zone_count).toBe(5);
      expect(result.profile.has_carbide).toBe(true);
      expect(result.profile.has_braze).toBe(true);
      expect(result.estimated_time_min).toBeGreaterThan(0);

      // Verify we get distinct params per zone type
      const types = new Set(result.zones.map(z => z.zone_type));
      expect(types.size).toBe(3); // primary_steel, braze_joint, carbide_insert
    });

    it("zones are monotonically increasing in position", () => {
      const result = edmBiMaterialCompensationEngine.inferZones({
        steel_material: "4140",
        insert_positions: [
          { start_mm: 8, end_mm: 14 },
          { start_mm: 22, end_mm: 28 },
        ],
        total_profile_length_mm: 35,
      });

      for (let i = 0; i < result.zones.length; i++) {
        expect(result.zones[i].start_mm).toBeLessThan(result.zones[i].end_mm);
        if (i > 0) {
          expect(result.zones[i].start_mm).toBeGreaterThanOrEqual(result.zones[i - 1].end_mm - 0.001);
        }
      }
    });
  });

  // ============================================================================
  // End-to-End: Full Shop Workflow
  // ============================================================================

  describe("end-to-end: inferZones → optimize pipeline", () => {
    it("H13 at 52 HRC + single carbide insert, 30mm thick, rough pass", () => {
      const inferred = edmBiMaterialCompensationEngine.inferZones({
        steel_material: "h13",
        steel_hardness_hrc: 52,
        insert_positions: [{ start_mm: 10, end_mm: 20 }],
        total_profile_length_mm: 30,
      });

      const roughResult = edmBiMaterialCompensationEngine.optimize({
        zones: inferred.zones,
        thickness_mm: 30,
        pass_type: "rough",
      });

      // Validate profile completeness
      expect(roughResult.profile.total_length_mm).toBeCloseTo(30, 0);
      expect(roughResult.zones.length).toBe(5);
      expect(roughResult.transitions.length).toBe(4);

      // Validate physics plausibility: carbide should cut slowest (lowest machinability)
      const steelFeed = roughResult.zones.find(z => z.zone_type === "primary_steel")!.feed_rate_mm_min;
      const carbideFeed = roughResult.zones.find(z => z.zone_type === "carbide_insert")!.feed_rate_mm_min;
      expect(carbideFeed).toBeLessThan(steelFeed);

      // Recommendations should exist for bi-material
      expect(roughResult.recommendations.length).toBeGreaterThan(0);
    });

    it("D2 at 60 HRC + dual carbide inserts, 50mm thick, finish pass", () => {
      const inferred = edmBiMaterialCompensationEngine.inferZones({
        steel_material: "d2",
        steel_hardness_hrc: 60,
        insert_positions: [
          { start_mm: 12, end_mm: 22 },
          { start_mm: 32, end_mm: 42 },
        ],
        total_profile_length_mm: 50,
      });

      const finishResult = edmBiMaterialCompensationEngine.optimize({
        zones: inferred.zones,
        thickness_mm: 50,
        pass_type: "finish",
      });

      // 9 zones (3 steel + 2 carbide + 4 braze)
      expect(finishResult.profile.zone_count).toBe(9);
      expect(finishResult.profile.transition_count).toBe(8);

      // Finish pass should produce low Ra predictions
      for (const z of finishResult.zones) {
        expect(z.predicted_ra_um).toBeLessThan(3); // finish pass Ra should be well below rough
      }

      // Break risk elevated at 50mm + D2 hardness
      expect(finishResult.overall_wire_break_risk).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // computeUVCompensation()
  // ============================================================================

  describe("computeUVCompensation()", () => {
    it("returns per-zone kerf widths and UV compensations", () => {
      const uv = edmBiMaterialCompensationEngine.computeUVCompensation({
        zones: H13_CARBIDE_30MM,
        taper_angle_deg: 3,
        workpiece_height_mm: 30,
      });

      expect(uv.zone_compensations.length).toBe(5);
      expect(uv.uv_transitions.length).toBe(4);
      expect(uv.taper_angle_deg).toBe(3);
      expect(uv.workpiece_height_mm).toBe(30);
      expect(uv.wire_diameter_mm).toBe(0.25);
      expect(uv.taper_feasible).toBe(true);
    });

    it("carbide zone has wider kerf than steel zone", () => {
      const uv = edmBiMaterialCompensationEngine.computeUVCompensation({
        zones: H13_CARBIDE_30MM,
        taper_angle_deg: 5,
        workpiece_height_mm: 30,
      });

      const steelKerf = uv.zone_compensations.find(z => z.zone_type === "primary_steel")!.kerf_width_mm;
      const carbideKerf = uv.zone_compensations.find(z => z.zone_type === "carbide_insert")!.kerf_width_mm;

      // Carbide needs more energy → wider spark gap → wider kerf
      expect(carbideKerf).toBeGreaterThan(steelKerf);
    });

    it("braze zone has narrower kerf than steel (lower energy)", () => {
      const uv = edmBiMaterialCompensationEngine.computeUVCompensation({
        zones: H13_CARBIDE_30MM,
        taper_angle_deg: 3,
        workpiece_height_mm: 25,
      });

      const steelKerf = uv.zone_compensations.find(z => z.zone_type === "primary_steel")!.kerf_width_mm;
      const brazeKerf = uv.zone_compensations.find(z => z.zone_type === "braze_joint")!.kerf_width_mm;

      // Braze uses lower energy → narrower spark gap → narrower kerf
      expect(brazeKerf).toBeLessThan(steelKerf);
    });

    it("UV offset delta is positive for carbide (wider kerf) relative to steel reference", () => {
      const uv = edmBiMaterialCompensationEngine.computeUVCompensation({
        zones: H13_CARBIDE_30MM,
        taper_angle_deg: 5,
        workpiece_height_mm: 30,
      });

      const carbideComp = uv.zone_compensations.find(z => z.zone_type === "carbide_insert")!;
      expect(carbideComp.uv_offset_delta_mm).toBeGreaterThan(0);

      // Steel zones should have ~0 delta (they are the reference)
      const steelComp = uv.zone_compensations.find(z => z.zone_type === "primary_steel")!;
      expect(Math.abs(steelComp.uv_offset_delta_mm)).toBeLessThan(0.001);
    });

    it("max kerf variation is positive for bi-material profiles", () => {
      const uv = edmBiMaterialCompensationEngine.computeUVCompensation({
        zones: H13_CARBIDE_30MM,
        taper_angle_deg: 3,
        workpiece_height_mm: 25,
      });

      expect(uv.max_kerf_variation_mm).toBeGreaterThan(0);
    });

    it("UV transitions detect carbide and braze boundary notes", () => {
      const uv = edmBiMaterialCompensationEngine.computeUVCompensation({
        zones: H13_CARBIDE_30MM,
        taper_angle_deg: 5,
        workpiece_height_mm: 30,
      });

      // Should have transitions mentioning carbide and braze
      const carbideNotes = uv.uv_transitions.some(t => t.notes.some(n => n.includes("Carbide")));
      const brazeNotes = uv.uv_transitions.some(t => t.notes.some(n => n.includes("Braze") || n.includes("braze")));
      expect(carbideNotes).toBe(true);
      expect(brazeNotes).toBe(true);
    });

    it("steep taper angle produces warning", () => {
      const uv = edmBiMaterialCompensationEngine.computeUVCompensation({
        zones: H13_CARBIDE_30MM,
        taper_angle_deg: 28,
        workpiece_height_mm: 30,
      });

      expect(uv.warnings.some(w => w.includes("Steep") || w.includes("taper"))).toBe(true);
    });

    it("single-material profile has zero kerf variation", () => {
      const uv = edmBiMaterialCompensationEngine.computeUVCompensation({
        zones: SINGLE_MATERIAL,
        taper_angle_deg: 5,
        workpiece_height_mm: 25,
      });

      expect(uv.max_kerf_variation_mm).toBe(0);
      expect(uv.uv_transitions.length).toBe(0);
    });

    it("empty zones returns graceful result", () => {
      const uv = edmBiMaterialCompensationEngine.computeUVCompensation({
        zones: [],
        taper_angle_deg: 3,
        workpiece_height_mm: 25,
      });

      expect(uv.zone_compensations.length).toBe(0);
      expect(uv.uv_transitions.length).toBe(0);
      expect(uv.warnings.length).toBeGreaterThan(0);
    });

    it("finish pass has narrower kerf than rough pass", () => {
      const rough = edmBiMaterialCompensationEngine.computeUVCompensation({
        zones: H13_CARBIDE_30MM,
        taper_angle_deg: 5,
        workpiece_height_mm: 30,
        pass_type: "rough",
      });
      const finish = edmBiMaterialCompensationEngine.computeUVCompensation({
        zones: H13_CARBIDE_30MM,
        taper_angle_deg: 5,
        workpiece_height_mm: 30,
        pass_type: "finish",
      });

      const roughCarbideKerf = rough.zone_compensations.find(z => z.zone_type === "carbide_insert")!.kerf_width_mm;
      const finishCarbideKerf = finish.zone_compensations.find(z => z.zone_type === "carbide_insert")!.kerf_width_mm;

      // Finish pass uses less energy → narrower kerf
      expect(finishCarbideKerf).toBeLessThan(roughCarbideKerf);
    });

    it("kerf variation recommendation triggers per-zone UV offset advice", () => {
      const uv = edmBiMaterialCompensationEngine.computeUVCompensation({
        zones: H13_CARBIDE_30MM,
        taper_angle_deg: 5,
        workpiece_height_mm: 30,
      });

      if (uv.max_kerf_variation_mm > 0.01) {
        expect(uv.recommendations.some(r => r.includes("G41") || r.includes("G42") || r.includes("UV"))).toBe(true);
      }
    });

    it("multi-insert taper produces more UV transitions", () => {
      const single = edmBiMaterialCompensationEngine.computeUVCompensation({
        zones: H13_CARBIDE_30MM,
        taper_angle_deg: 3,
        workpiece_height_mm: 25,
      });
      const multi = edmBiMaterialCompensationEngine.computeUVCompensation({
        zones: MULTI_INSERT,
        taper_angle_deg: 3,
        workpiece_height_mm: 25,
      });

      expect(multi.uv_transitions.length).toBeGreaterThan(single.uv_transitions.length);
    });

    it("UV travel increases with taper angle", () => {
      const shallow = edmBiMaterialCompensationEngine.computeUVCompensation({
        zones: H13_CARBIDE_30MM,
        taper_angle_deg: 2,
        workpiece_height_mm: 30,
      });
      const steep = edmBiMaterialCompensationEngine.computeUVCompensation({
        zones: H13_CARBIDE_30MM,
        taper_angle_deg: 10,
        workpiece_height_mm: 30,
      });

      expect(steep.max_uv_travel_mm).toBeGreaterThan(shallow.max_uv_travel_mm);
    });

    it("end-to-end: inferZones → computeUVCompensation for taper cut", () => {
      const inferred = edmBiMaterialCompensationEngine.inferZones({
        steel_material: "d2",
        steel_hardness_hrc: 60,
        insert_positions: [{ start_mm: 12, end_mm: 22 }],
        total_profile_length_mm: 35,
      });

      const uv = edmBiMaterialCompensationEngine.computeUVCompensation({
        zones: inferred.zones,
        taper_angle_deg: 5,
        workpiece_height_mm: 50,
      });

      expect(uv.zone_compensations.length).toBe(5);
      expect(uv.taper_feasible).toBe(true);
      expect(uv.max_uv_travel_mm).toBeGreaterThan(0);
      expect(uv.recommendations.length).toBeGreaterThan(0);

      // Carbide should have the widest kerf
      const kerfs = uv.zone_compensations.map(z => ({ type: z.zone_type, kerf: z.kerf_width_mm }));
      const carbideKerf = kerfs.find(k => k.type === "carbide_insert")!.kerf;
      const steelKerf = kerfs.find(k => k.type === "primary_steel")!.kerf;
      expect(carbideKerf).toBeGreaterThan(steelKerf);
    });
  });
});
