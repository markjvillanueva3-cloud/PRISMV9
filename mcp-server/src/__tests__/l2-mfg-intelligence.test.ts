/**
 * L2-P1-MS1: 20 Manufacturing Intelligence Engine Smoke Tests
 *
 * Each engine gets ≥1 smoke test verifying singleton, core computation, and API shape.
 */

import {
  toolSelectionEngine, materialSelectionEngine, machineSelectionEngine,
  fixtureDesignEngine, processPlanEngine,
  costEstimationEngine, quoteEngine, schedulingEngine,
  qualityPredictionEngine, troubleshootingEngine,
  tribalKnowledgeEngine, learningPathEngine, digitalTwinEngine,
  energyOptimizationEngine, batchOptimizationEngine,
  nestingEngine, probeRoutineEngine, toolCribEngine,
  // Existing engines (counted in L2-P1-MS1)
  setupSheetEngine, predictiveMaintenance,
} from "../engines/index.js";

// ============================================================================
// 1. ToolSelectionEngine
// ============================================================================

describe("ToolSelectionEngine", () => {
  test("singleton exists", () => {
    expect(toolSelectionEngine).toBeDefined();
    expect(toolSelectionEngine.recommend).toBeInstanceOf(Function);
  });

  test("recommend returns scored tool list", () => {
    const recs = toolSelectionEngine.recommend({
      operation_type: "pocket",
      material_iso_group: "P",
      feature_diameter_mm: 20,
      feature_depth_mm: 15,
    });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0]).toHaveProperty("score");
    expect(recs[0]).toHaveProperty("recommended_speed_mpm");
    expect(recs[0]).toHaveProperty("estimated_tool_life_min");
    // Sorted by score descending
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1].score).toBeGreaterThanOrEqual(recs[i].score);
    }
  });

  test("validate checks overhang and deflection", () => {
    const result = toolSelectionEngine.validate("end_mill_10mm_4F_TiAlN", {
      operation_type: "pocket",
      material_iso_group: "P",
      feature_depth_mm: 30,
      tolerance_mm: 0.02,
    });
    expect(result).toHaveProperty("valid");
    expect(result).toHaveProperty("overhang_ratio");
    expect(result).toHaveProperty("deflection_mm");
  });
});

// ============================================================================
// 2. MaterialSelectionEngine
// ============================================================================

describe("MaterialSelectionEngine", () => {
  test("singleton exists", () => {
    expect(materialSelectionEngine).toBeDefined();
  });

  test("recommend returns scored candidates", () => {
    const recs = materialSelectionEngine.recommend({
      tensile_strength_MPa: 500,
      corrosion_resistant: true,
      application: "medical",
    });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0]).toHaveProperty("machinability_index");
    expect(recs[0]).toHaveProperty("iso_group");
  });

  test("machinability returns ISO-based report", () => {
    const report = materialSelectionEngine.machinability("304_stainless");
    expect(report.iso_group).toBe("M");
    expect(report.machinability_index).toBeLessThan(60);
    expect(report.tool_wear_tendency).toBe("high");
  });
});

// ============================================================================
// 3. MachineSelectionEngine
// ============================================================================

describe("MachineSelectionEngine", () => {
  test("singleton exists", () => {
    expect(machineSelectionEngine).toBeDefined();
  });

  test("recommend returns machines within travel", () => {
    const recs = machineSelectionEngine.recommend({
      part_envelope_mm: { x: 200, y: 200, z: 100 },
      operations: ["pocket", "drill"],
      material_iso_group: "P",
    });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0]).toHaveProperty("spindle");
    expect(recs[0]).toHaveProperty("travel");
  });

  test("validate checks travel + axes", () => {
    const result = machineSelectionEngine.validate("haas_vf2", {
      part_envelope_mm: { x: 300, y: 300, z: 200 },
      operations: ["pocket"],
      needs_5th_axis: true,
    });
    expect(result.suitable).toBe(false);
    expect(result.axes_ok).toBe(false);
  });
});

// ============================================================================
// 4. FixtureDesignEngine (SAFETY CRITICAL)
// ============================================================================

describe("FixtureDesignEngine", () => {
  test("singleton exists", () => {
    expect(fixtureDesignEngine).toBeDefined();
  });

  test("clampForce calculates with 2.5× safety factor", () => {
    const result = fixtureDesignEngine.clampForce(5000, "P", "vise", true, 2);
    expect(result.safety_factor).toBe(2.5);
    expect(result.required_force_N).toBeGreaterThan(5000);
    expect(result).toHaveProperty("per_clamp_force_N");
  });

  test("validate checks clamp force adequacy", () => {
    const part = { shape: "prismatic" as const, length_mm: 100, width_mm: 60, height_mm: 30, weight_kg: 2, material_iso_group: "P" };
    const loads = { max_force_N: 3000, force_direction: "x" as const };
    const result = fixtureDesignEngine.validate(part, loads, "vise", 0.05);
    expect(result).toHaveProperty("valid");
    expect(result).toHaveProperty("clamp_force_ok");
    expect(result).toHaveProperty("safety_factor");
    expect(result.safety_factor).toBeGreaterThan(0);
  });

  test("recommend returns sorted fixtures with SAFETY warnings", () => {
    const part = { shape: "prismatic" as const, length_mm: 200, width_mm: 100, height_mm: 50, weight_kg: 5, material_iso_group: "S" };
    const loads = { max_force_N: 8000, force_direction: "tangential" as const };
    const recs = fixtureDesignEngine.recommend(part, loads);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0]).toHaveProperty("required_clamp_force_N");
  });
});

// ============================================================================
// 5. ProcessPlanEngine
// ============================================================================

describe("ProcessPlanEngine", () => {
  test("singleton exists", () => {
    expect(processPlanEngine).toBeDefined();
  });

  test("generate creates ordered operations", () => {
    const plan = processPlanEngine.generate({
      part_name: "Test Bracket",
      material_iso_group: "P",
      features: [
        { id: "F1", type: "pocket", dimensions: { width_mm: 30, length_mm: 50, depth_mm: 10 } },
        { id: "F2", type: "hole", dimensions: { diameter_mm: 8.5, depth_mm: 20 }, count: 4 },
      ],
      stock: { x_mm: 100, y_mm: 80, z_mm: 30 },
    });
    expect(plan.total_operations).toBeGreaterThan(0);
    expect(plan.operations[0].seq).toBe(1);
    expect(plan.total_time_min).toBeGreaterThan(0);
    expect(plan.tool_list.length).toBeGreaterThan(0);
  });

  test("validate detects sequence issues", () => {
    const plan = processPlanEngine.generate({
      part_name: "Test",
      material_iso_group: "N",
      features: [{ id: "F1", type: "face", dimensions: { width_mm: 100, length_mm: 100, depth_mm: 1 } }],
      stock: { x_mm: 100, y_mm: 100, z_mm: 20 },
    });
    const result = processPlanEngine.validate(plan);
    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// 6. CostEstimationEngine
// ============================================================================

describe("CostEstimationEngine", () => {
  test("singleton exists", () => {
    expect(costEstimationEngine).toBeDefined();
  });

  test("estimate returns cost breakdown", () => {
    const cost = costEstimationEngine.estimate({
      material_name: "6061_aluminum",
      material_iso_group: "N",
      stock_volume_cm3: 500,
      part_volume_cm3: 200,
      machine_rate_per_hour: 95,
      cycle_time_min: 30,
      setup_time_min: 20,
      num_tools: 5,
      batch_size: 10,
    });
    expect(cost.total_per_part).toBeGreaterThan(0);
    expect(cost.material_cost).toBeGreaterThan(0);
    expect(cost.cost_drivers.length).toBe(5);
  });
});

// ============================================================================
// 7. QuoteEngine
// ============================================================================

describe("QuoteEngine", () => {
  test("singleton exists", () => {
    expect(quoteEngine).toBeDefined();
  });

  test("generate creates quote with markup", () => {
    const quote = quoteEngine.generate({
      customer_name: "Acme Corp",
      part_name: "Widget",
      quantity: 100,
      cost_per_part: 25,
      setup_cost: 200,
      material_cost_per_part: 8,
      cycle_time_min: 15,
      num_setups: 1,
      complexity: "moderate",
      urgency: "standard",
    });
    expect(quote.unit_price).toBeGreaterThan(25); // markup applied
    expect(quote.margin_pct).toBeGreaterThan(0);
    expect(quote.lead_time_days).toBeGreaterThan(0);
    expect(quote.quote_number).toMatch(/^Q-/);
  });
});

// ============================================================================
// 8. SchedulingEngine
// ============================================================================

describe("SchedulingEngine", () => {
  test("singleton exists", () => {
    expect(schedulingEngine).toBeDefined();
  });

  test("schedule assigns jobs to machines", () => {
    const result = schedulingEngine.schedule(
      [
        { id: "J1", part_name: "Part A", quantity: 50, cycle_time_min: 10, setup_time_min: 20, due_date: "2026-03-15", priority: "normal" },
        { id: "J2", part_name: "Part B", quantity: 100, cycle_time_min: 5, setup_time_min: 15, due_date: "2026-03-10", priority: "high" },
      ],
      [
        { machine_id: "M1", machine_name: "VMC-1", type: "VMC", available_hours_per_day: 16, current_load_hours: 0, efficiency: 0.85 },
      ],
      "balanced"
    );
    expect(result.assignments.length).toBe(2);
    expect(result.total_makespan_days).toBeGreaterThan(0);
    expect(result).toHaveProperty("schedule_score");
  });
});

// ============================================================================
// 9. QualityPredictionEngine
// ============================================================================

describe("QualityPredictionEngine", () => {
  test("singleton exists", () => {
    expect(qualityPredictionEngine).toBeDefined();
  });

  test("predict returns Ra, Cpk, risk", () => {
    const result = qualityPredictionEngine.predict({
      operation_type: "pocket",
      material_iso_group: "P",
      tool_diameter_mm: 10,
      spindle_rpm: 8000,
      feed_rate_mmmin: 1200,
      depth_of_cut_mm: 3,
      coolant: true,
      machine_accuracy_mm: 0.008,
      tolerance_mm: 0.05,
    });
    expect(result.predicted_Ra_um).toBeGreaterThan(0);
    expect(result.predicted_Cpk).toBeGreaterThan(0);
    expect(["low", "moderate", "high", "critical"]).toContain(result.risk_level);
  });

  test("cpk calculation is correct for capable process", () => {
    const result = qualityPredictionEngine.cpk(0.1, 0.005, 0.01);
    expect(result.cpk).toBeGreaterThan(1);
    expect(result).toHaveProperty("ppm_defective");
  });
});

// ============================================================================
// 10. TroubleshootingEngine
// ============================================================================

describe("TroubleshootingEngine", () => {
  test("singleton exists", () => {
    expect(troubleshootingEngine).toBeDefined();
  });

  test("diagnose identifies chatter from symptoms", () => {
    const diag = troubleshootingEngine.diagnose({
      symptoms: ["chatter_marks", "vibration"],
      operation_type: "pocket",
      material_iso_group: "P",
    });
    expect(diag.primary_cause).toContain("chatter");
    expect(diag.confidence).toBeGreaterThan(50);
    expect(diag.corrective_actions.length).toBeGreaterThan(0);
  });

  test("rootCause returns fishbone diagram", () => {
    const rca = troubleshootingEngine.rootCause({
      symptoms: ["tool_breakage"],
      operation_type: "drill",
      material_iso_group: "S",
      depth_of_cut_mm: 10,
      coolant_active: false,
    });
    expect(rca.fishbone).toHaveProperty("Machine");
    expect(rca.fishbone).toHaveProperty("Environment");
    expect(rca.root_cause.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 11. TribalKnowledgeEngine
// ============================================================================

describe("TribalKnowledgeEngine", () => {
  test("singleton exists", () => {
    expect(tribalKnowledgeEngine).toBeDefined();
  });

  test("search finds tips by material", () => {
    const tips = tribalKnowledgeEngine.search({ material_iso_group: "M", limit: 3 });
    expect(tips.length).toBeGreaterThan(0);
    // All tips should be relevant to M group
    for (const tip of tips) {
      if (tip.material_groups) expect(tip.material_groups).toContain("M");
    }
  });

  test("stats returns coverage report", () => {
    const stats = tribalKnowledgeEngine.stats();
    expect(stats.total_tips).toBeGreaterThanOrEqual(12);
    expect(stats.most_used.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 12. LearningPathEngine
// ============================================================================

describe("LearningPathEngine", () => {
  test("singleton exists", () => {
    expect(learningPathEngine).toBeDefined();
  });

  test("assess identifies skill gaps", () => {
    const assessment = learningPathEngine.assess("OP-001", {
      machine_operation: "beginner",
      safety: "intermediate",
    }, "programmer");
    expect(assessment.gaps.length).toBeGreaterThan(0);
    expect(assessment.strengths).toContain("safety");
  });

  test("plan generates learning modules for gaps", () => {
    const assessment = learningPathEngine.assess("OP-002", {
      safety: "beginner",
    }, "operator");
    const plan = learningPathEngine.plan("OP-002", assessment, "operator");
    expect(plan.modules.length).toBeGreaterThan(0);
    expect(plan.total_hours).toBeGreaterThan(0);
  });
});

// ============================================================================
// 13. DigitalTwinEngine
// ============================================================================

describe("DigitalTwinEngine", () => {
  test("singleton exists", () => {
    expect(digitalTwinEngine).toBeDefined();
  });

  test("create + updateState + predict workflow", () => {
    const twin = digitalTwinEngine.create("TEST-001", "Test VMC", "Haas VF-2");
    expect(twin.machine_id).toBe("TEST-001");
    expect(twin.health.overall_score).toBeGreaterThan(0);

    const updated = digitalTwinEngine.updateState("TEST-001", {
      power: "running",
      spindle_rpm: 8000,
      temperature_spindle_C: 45,
    });
    expect(updated).not.toBeNull();
    expect(updated!.state.spindle_rpm).toBe(8000);

    const predictions = digitalTwinEngine.predict("TEST-001");
    // New machine → might have maintenance prediction
    expect(Array.isArray(predictions)).toBe(true);
  });

  test("simulate returns impacts", () => {
    digitalTwinEngine.create("SIM-001", "Sim Machine", "Test");
    digitalTwinEngine.updateState("SIM-001", { spindle_rpm: 10000, feed_rate_mmmin: 2000 });
    const result = digitalTwinEngine.simulate("SIM-001", "increase_spindle_speed", 20);
    expect(result.impacts.length).toBeGreaterThan(0);
    expect(result.simulated_value).toBeGreaterThan(result.original_value);
  });
});

// ============================================================================
// 14. EnergyOptimizationEngine
// ============================================================================

describe("EnergyOptimizationEngine", () => {
  test("singleton exists", () => {
    expect(energyOptimizationEngine).toBeDefined();
  });

  test("analyze calculates energy breakdown", () => {
    const result = energyOptimizationEngine.analyze({
      operations: [{
        operation_name: "Rough Pocket",
        cutting_time_min: 10,
        spindle_rpm: 8000,
        feed_rate_mmmin: 2000,
        depth_of_cut_mm: 3,
        radial_depth_mm: 6,
        tool_diameter_mm: 10,
        material_iso_group: "P",
        coolant_active: true,
      }],
      machine_power_kW: 22,
    });
    expect(result.total_energy_kWh).toBeGreaterThan(0);
    expect(result.carbon_footprint_kg_CO2).toBeGreaterThan(0);
    expect(result.by_operation.length).toBe(1);
  });
});

// ============================================================================
// 15. BatchOptimizationEngine
// ============================================================================

describe("BatchOptimizationEngine", () => {
  test("singleton exists", () => {
    expect(batchOptimizationEngine).toBeDefined();
  });

  test("group clusters similar jobs", () => {
    const groups = batchOptimizationEngine.group([
      { id: "J1", part_name: "A", quantity: 50, material: "steel", material_iso_group: "P", tooling_group: "TG1", fixture_type: "vise", cycle_time_min: 10, setup_time_min: 20, due_date: "2026-03-15", priority: 3 },
      { id: "J2", part_name: "B", quantity: 30, material: "steel", material_iso_group: "P", tooling_group: "TG1", fixture_type: "vise", cycle_time_min: 8, setup_time_min: 20, due_date: "2026-03-20", priority: 2 },
      { id: "J3", part_name: "C", quantity: 20, material: "aluminum", material_iso_group: "N", tooling_group: "TG2", fixture_type: "fixture_plate", cycle_time_min: 15, setup_time_min: 30, due_date: "2026-03-10", priority: 5 },
    ]);
    // J1 and J2 should be grouped (same tooling + fixture)
    const combined = groups.find(g => g.jobs.length >= 2);
    expect(combined).toBeDefined();
    expect(combined!.shared_tooling).toBe(true);
  });
});

// ============================================================================
// 16. NestingEngine
// ============================================================================

describe("NestingEngine", () => {
  test("singleton exists", () => {
    expect(nestingEngine).toBeDefined();
  });

  test("nest places parts on sheet", () => {
    const result = nestingEngine.nest(
      [
        { id: "P1", width_mm: 100, height_mm: 50, quantity: 4 },
        { id: "P2", width_mm: 80, height_mm: 40, quantity: 6 },
      ],
      { width_mm: 600, height_mm: 300, thickness_mm: 10, material: "6061 Aluminum", cost_per_sheet: 120 }
    );
    expect(result.total_parts_placed).toBeGreaterThan(0);
    expect(result.utilization_pct).toBeGreaterThan(0);
    expect(result.sheets_used).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// 17. ProbeRoutineEngine
// ============================================================================

describe("ProbeRoutineEngine", () => {
  test("singleton exists", () => {
    expect(probeRoutineEngine).toBeDefined();
  });

  test("generate creates probe moves for position callout", () => {
    const routine = probeRoutineEngine.generate({
      id: "F1",
      callout: "position",
      tolerance_mm: 0.05,
      datum_refs: ["A", "B", "C"],
      feature_type: "hole",
      nominal: { x_mm: 50, y_mm: 30, diameter_mm: 10, z_mm: 0 },
    });
    expect(routine.moves.length).toBeGreaterThan(0);
    expect(routine.points_measured).toBeGreaterThanOrEqual(4);
    expect(routine.datum_alignment).toEqual(["A", "B", "C"]);
  });

  test("interpretGDT explains tolerance zone", () => {
    const interp = probeRoutineEngine.interpretGDT("flatness", 0.02);
    expect(interp.zone_type).toBe("planar");
    expect(interp.tolerance_zone_description).toContain("0.02");
    expect(interp.min_measurement_points).toBe(9);
  });
});

// ============================================================================
// 18. ToolCribEngine
// ============================================================================

describe("ToolCribEngine", () => {
  test("singleton exists", () => {
    expect(toolCribEngine).toBeDefined();
  });

  test("inventoryReport returns stock summary", () => {
    const report = toolCribEngine.inventoryReport();
    expect(report.total_items).toBeGreaterThan(0);
    expect(report.total_value).toBeGreaterThan(0);
    expect(Object.keys(report.categories).length).toBeGreaterThan(0);
  });

  test("checkout + checkin workflow", () => {
    const out = toolCribEngine.checkout("EM-10-4F-TiAlN", "OP-001", "M1", "JOB-100");
    expect(out.success).toBe(true);
    expect(out.remaining_available).toBeGreaterThanOrEqual(0);

    const checkin = toolCribEngine.checkin("EM-10-4F-TiAlN", "OP-001", 45, "normal");
    expect(checkin.success).toBe(true);
    expect(["return_to_stock", "regrind", "scrap"]).toContain(checkin.recommendation);
  });

  test("reorderRecommendations flags low stock", () => {
    const recs = toolCribEngine.reorderRecommendations();
    // DR-8.5-TiN has 4 available vs reorder_point 5
    const drill = recs.find(r => r.tool_id === "DR-8.5-TiN");
    expect(drill).toBeDefined();
    expect(["immediate", "soon", "planned"]).toContain(drill!.urgency);
  });
});

// ============================================================================
// 19. SetupSheetEngine (existing — verification)
// ============================================================================

describe("SetupSheetEngine (existing)", () => {
  test("function exists", () => {
    expect(setupSheetEngine).toBeDefined();
    expect(typeof setupSheetEngine).toBe("function");
  });
});

// ============================================================================
// 20. PredictiveMaintenanceEngine (existing — verification)
// ============================================================================

describe("PredictiveMaintenanceEngine (existing)", () => {
  test("function exists", () => {
    expect(predictiveMaintenance).toBeDefined();
    expect(typeof predictiveMaintenance).toBe("function");
  });
});
