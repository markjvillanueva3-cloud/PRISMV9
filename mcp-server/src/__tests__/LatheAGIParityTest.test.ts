/**
 * Lathe AGI Parity Test — Scripted Canary
 * =========================================
 *
 * The 5-checkpoint canary defined in LATHE-AWARE-HARDEN-ROADMAP.md Phase 3.
 * All 5 MUST pass on any randomly-chosen fresh session. This is the AGI-parity
 * bar that validates the end-to-end Phase 3 (MS9-MS12) integration.
 *
 * Checkpoints:
 *   1. Query programming style → uses E107 (not ad-hoc)
 *   2. Propose conversational on Mazak → Mazatrol recommendation on simple part
 *   3. Find similar programs → uses E108.findSimilarPrograms()
 *   4. Compare costs → structured comparison from E109
 *   5. Recommend macro investment → high-repeat customer gets "macro" from E110
 *
 * @milestone LATHE-AWARE-HARDEN Phase 3 Sign-Off
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheProgrammingStyleSelectorEngine } from "../engines/LatheProgrammingStyleSelectorEngine.js";
import { latheProgramCatalogEngine } from "../engines/LatheProgramCatalogEngine.js";
import { latheProgrammingCostEngine } from "../engines/LatheProgrammingCostEngine.js";
import { lathePartFamilyPlanningEngine } from "../engines/LathePartFamilyPlanningEngine.js";

beforeEach(() => {
  latheProgramCatalogEngine.clear();
});

describe("Lathe AGI Parity — 5-Checkpoint Canary", () => {
  // ── Checkpoint 1 ───────────────────────────────────────────────────────

  it("CP1: query programming style returns a structured recommendation from E107", () => {
    const rec = latheProgrammingStyleSelectorEngine.selectProgrammingStyle({
      controller: "mazatrol_smooth_ai",
      part_complexity: "simple",
      lot_size: 1,
      family_parts_expected: 1,
      operator_skill_level: "beginner",
      available_cam_seats: 0,
      time_constraint: "normal",
      machine_availability: "shared",
    });

    // Must be a structured E107 response, not an ad-hoc string
    expect(rec.recommended_style).toBeDefined();
    expect(rec.reasoning.length).toBeGreaterThan(0);
    expect(rec.cost_estimate).toBeDefined();
    expect(rec.alternatives.length).toBeGreaterThan(0);
    expect(rec.future_planning).toBeDefined();
    expect(rec.controller_queried).toBe("mazatrol_smooth_ai");
  });

  // ── Checkpoint 2 ───────────────────────────────────────────────────────

  it("CP2: simple shaft on Mazak QT-250 (Mazatrol SmoothAi) → Mazatrol conversational", () => {
    const rec = latheProgrammingStyleSelectorEngine.selectProgrammingStyle({
      controller: "mazatrol_smooth_ai",
      part_complexity: "simple",
      lot_size: 1,
      family_parts_expected: 1,
      operator_skill_level: "beginner",
      available_cam_seats: 0,
      time_constraint: "normal",
      machine_availability: "shared",
    });

    expect(rec.recommended_style).toBe("conversational");
    expect(rec.conversational_type).toBe("mazatrol");
    // Reasoning should reference the Mazatrol capability
    expect(rec.reasoning.join(" ").toLowerCase()).toContain("mazatrol");
  });

  // ── Checkpoint 3 ───────────────────────────────────────────────────────

  it("CP3: find similar ALCOA programs using E108.findSimilarPrograms()", () => {
    // Seed the catalog with ALCOA programs to represent the archive
    latheProgramCatalogEngine.registerMany([
      {
        program_id: "ALCOA__die01.min",
        path: "/ALCOA/die01.min",
        programming_style: "macro",
        controller: "okuma_osp",
        customer: "ALCOA",
        features: ["threading", "grooving"],
        file_ext: ".min",
      },
      {
        program_id: "ALCOA__die02.min",
        path: "/ALCOA/die02.min",
        programming_style: "macro",
        controller: "okuma_osp",
        customer: "ALCOA",
        features: ["threading"],
        file_ext: ".min",
      },
      {
        program_id: "ITW__punch01.min",
        path: "/ITW/punch01.min",
        programming_style: "hardcode",
        controller: "fanuc",
        customer: "ITW",
        features: ["threading"],
        file_ext: ".min",
      },
    ]);

    const matches = latheProgramCatalogEngine.findSimilarPrograms({
      customer: "ALCOA",
      features: ["threading"],
    });

    expect(matches.length).toBeGreaterThan(0);
    // ALCOA programs should rank ahead of ITW for this query
    expect(matches[0]?.entry.customer).toBe("ALCOA");
    // Each match carries classification + reasoning
    expect(matches[0]?.entry.programming_style).toBeDefined();
    expect(matches[0]?.match_reasoning.length).toBeGreaterThan(0);
  });

  // ── Checkpoint 4 ───────────────────────────────────────────────────────

  it("CP4: compare CAM vs conversational cost returns structured E109 comparison", () => {
    const comp = latheProgrammingCostEngine.compareApproaches({
      controller: "mazatrol_smooth_ai",
      part_complexity: "moderate",
      lot_size: 10,
      available_cam_seats: 1,
    });

    expect(comp.ranked.length).toBe(4);
    // Each entry has programming + machine + setup costs broken out
    const cam = comp.ranked.find((r) => r.style === "cam")!;
    const conv = comp.ranked.find((r) => r.style === "conversational")!;
    expect(cam.cost.cost_breakdown.programming_labor).toBeDefined();
    expect(cam.cost.cost_breakdown.setup).toBeDefined();
    expect(cam.cost.cost_breakdown.cycle).toBeDefined();
    expect(conv.cost.cost_breakdown.programming_labor).toBeDefined();
    expect(comp.cheapest_feasible).toBeDefined();
  });

  // ── Checkpoint 5 ───────────────────────────────────────────────────────

  it("CP5: high-repeat fastener customer (ALCOA) gets 'macro' or higher investment from E110", () => {
    const r = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
      {
        part_complexity: "moderate",
        lot_size: 50,
        family_parts_expected: 5,
        features: ["threading"],
      },
      "ALCOA"
    );

    // ALCOA is detected as fasteners industry
    expect(r.industry).toBe("fasteners");
    // Fastener + medium family → macro/template/full_family_program (not "none")
    expect(["macro", "template", "full_family_program"]).toContain(
      r.recommended_investment
    );
    // ROI estimate is present
    expect(r.roi_estimate).toBeDefined();
    expect(typeof r.roi_estimate.year_1_savings).toBe("number");
  });

  // ── Additional parity check: new customer → lower investment ────────────

  it("Bonus: new aerospace customer's first complex part → low-investment approach", () => {
    const r = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
      {
        part_complexity: "very_complex",
        lot_size: 1,
        family_parts_expected: 1,
      },
      "Boeing Aerospace"
    );

    // Aerospace one-off should not trigger full family program
    expect(r.recommended_investment).not.toBe("full_family_program");
  });
});
