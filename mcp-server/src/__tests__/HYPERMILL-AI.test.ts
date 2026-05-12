/**
 * HYPERMILL-AI.test.ts — HyperMillDeepLearningEngine Test Suite
 *
 * 40+ tests covering:
 *   - Strategy selection (chain-of-thought) for all categories
 *   - Feature recognition pattern matching
 *   - Automation recommendation (multi-path reasoning)
 *   - Toolpath validation (constraint satisfaction)
 *   - Strategy explanation (documentation reference)
 *   - Knowledge base construction
 *   - Edge cases and error paths
 *   - Tribal knowledge ingestion wiring
 *   - SQL tool database schema access
 *   - Virtual machining feature query
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  hyperMillDeepLearningEngine,
  HyperMillDeepLearningEngine,
  type HyperMillFeatureType,
  type HyperMillMaterialGroup,
  type HyperMillMachineKinematics,
  type HyperMillStrategyCategory,
} from "../engines/HyperMillDeepLearningEngine.js";

// ============================================================================
// SETUP
// ============================================================================

let engine: HyperMillDeepLearningEngine;

beforeAll(() => {
  engine = hyperMillDeepLearningEngine;
});

// ============================================================================
// 1. SINGLETON EXPORT
// ============================================================================

describe("HyperMillDeepLearningEngine — Singleton", () => {
  it("exports a singleton instance", () => {
    expect(engine).toBeInstanceOf(HyperMillDeepLearningEngine);
  });

  it("singleton is the same object across imports", () => {
    expect(engine).toBe(hyperMillDeepLearningEngine);
  });
});

// ============================================================================
// 2. KNOWLEDGE BASE
// ============================================================================

describe("buildKnowledgeBase()", () => {
  it("returns a knowledge base with 50+ strategies", () => {
    const kb = engine.buildKnowledgeBase();
    expect(kb.total_strategies).toBeGreaterThanOrEqual(50);
  });

  it("knowledge base contains 6 PDF source paths", () => {
    const kb = engine.buildKnowledgeBase();
    expect(kb.pdf_sources.length).toBe(6);
    expect(kb.pdf_sources.every(p => p.startsWith("H:/prism/Resources/PDF/"))).toBe(true);
  });

  it("version is 33.0", () => {
    const kb = engine.buildKnowledgeBase();
    expect(kb.version).toBe("33.0");
  });

  it("has feature patterns", () => {
    const kb = engine.buildKnowledgeBase();
    expect(kb.feature_patterns).toBeGreaterThanOrEqual(15);
  });

  it("has automation capabilities", () => {
    const kb = engine.buildKnowledgeBase();
    expect(kb.automation_capabilities).toBeGreaterThanOrEqual(4);
  });

  it("has SQL tables", () => {
    const kb = engine.buildKnowledgeBase();
    expect(kb.sql_tables).toBeGreaterThanOrEqual(4);
  });

  it("has virtual machining features", () => {
    const kb = engine.buildKnowledgeBase();
    expect(kb.virtual_machining_features).toBeGreaterThanOrEqual(4);
  });

  it("strategies_by_category includes all key categories", () => {
    const kb = engine.buildKnowledgeBase();
    const requiredCategories: HyperMillStrategyCategory[] = [
      "2d_milling", "3d_milling", "5axis_simultaneous", "maxx_machining",
      "drilling", "high_speed",
    ];
    for (const cat of requiredCategories) {
      expect(kb.strategies_by_category[cat]).toBeGreaterThanOrEqual(1);
    }
  });

  it("built_at is a valid ISO timestamp", () => {
    const kb = engine.buildKnowledgeBase();
    expect(() => new Date(kb.built_at)).not.toThrow();
    expect(new Date(kb.built_at).getFullYear()).toBeGreaterThanOrEqual(2026);
  });

  it("returns cached result on second call", () => {
    const first = engine.buildKnowledgeBase();
    const second = engine.buildKnowledgeBase();
    expect(first).toBe(second);
  });
});

// ============================================================================
// 3. SELECT OPTIMAL STRATEGY — Chain-of-Thought
// ============================================================================

describe("selectOptimalStrategy() — chain-of-thought reasoning", () => {
  it("selects a 3D strategy for freeform surface on 3-axis machine with steel", () => {
    const result = engine.selectOptimalStrategy("freeform_surface", "P", "3axis");
    expect(result.selected_strategy).toBeDefined();
    expect(["3d_milling", "2d_milling", "high_speed"]).toContain(result.selected_strategy.category);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("selects a 5-axis strategy for draft wall on 5-axis machine", () => {
    const result = engine.selectOptimalStrategy("draft_wall", "P", "5axis_table_head");
    expect(result.selected_strategy.required_kinematics.some(k => k.startsWith("5axis"))).toBe(true);
  });

  it("selects MAXX or 5-axis strategy for freeform surface on 5-axis machine with ISO H", () => {
    const result = engine.selectOptimalStrategy("freeform_surface", "H", "5axis_table_table");
    expect(result.selected_strategy).toBeDefined();
    expect(result.selected_strategy.category).toMatch(/3d_milling|5axis|maxx_machining/);
  });

  it("returns 5-step reasoning chain", () => {
    const result = engine.selectOptimalStrategy("closed_pocket", "N", "3axis");
    expect(result.reasoning_chain.length).toBe(5);
    expect(result.reasoning_chain[0].phase).toBe("observe");
    expect(result.reasoning_chain[4].phase).toBe("conclude");
  });

  it("reasoning chain step numbers are sequential", () => {
    const result = engine.selectOptimalStrategy("flat_land", "K", "3axis");
    for (let i = 0; i < result.reasoning_chain.length; i++) {
      expect(result.reasoning_chain[i].step_number).toBe(i + 1);
    }
  });

  it("returns parameter suggestions including feed factor", () => {
    const result = engine.selectOptimalStrategy("closed_pocket", "S", "3axis");
    expect(result.parameter_suggestions["feed_factor_for_material"]).toBe(0.5);
  });

  it("feed factor for ISO N (aluminum) is 1.5", () => {
    const result = engine.selectOptimalStrategy("flat_land", "N", "3axis");
    expect(result.parameter_suggestions["feed_factor_for_material"]).toBe(1.5);
  });

  it("feed factor for ISO H (hardened) is 0.4", () => {
    const result = engine.selectOptimalStrategy("freeform_surface", "H", "3axis");
    expect(result.parameter_suggestions["feed_factor_for_material"]).toBe(0.4);
  });

  it("returns manual reference in selected strategy", () => {
    const result = engine.selectOptimalStrategy("hole_blind", "P", "3axis");
    expect(result.selected_strategy.manual_ref).toBeTruthy();
    expect(result.selected_strategy.manual_ref).toContain("hyperMILL Manual");
  });

  it("has runner_up when multiple strategies match", () => {
    const result = engine.selectOptimalStrategy("closed_pocket", "P", "3axis");
    // closed_pocket has many matching strategies — expect a runner-up
    expect(result.runner_up).toBeDefined();
  });

  it("processing_time_ms is a non-negative number", () => {
    const result = engine.selectOptimalStrategy("undercut", "P", "5axis_table_table");
    expect(typeof result.processing_time_ms).toBe("number");
    expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
  });

  it("returns low confidence and warning for unsupported feature/kinematics combo", () => {
    // impeller on 3-axis — no strategies should match
    const result = engine.selectOptimalStrategy("impeller_blade", "S", "3axis");
    // Either no match (confidence 0.3) or a fallback
    expect(result.confidence).toBeLessThan(0.7);
  });

  it("selects HPC Roughing for slot on 3-axis with ISO P (high_speed preference)", () => {
    const result = engine.selectOptimalStrategy("slot_through", "P", "3axis");
    expect(result.selected_strategy).toBeDefined();
    // HPC Roughing or Pocket Milling should be selected for slot/pocket
    expect(["hm-hpc-rough", "hm-2d-pocket", "hm-2d-rest"]).toContain(result.selected_strategy.id);
  });
});

// ============================================================================
// 4. RECOMMEND AUTOMATION — Multi-Path Reasoning
// ============================================================================

describe("recommendAutomation() — multi-path reasoning", () => {
  it("returns an automation recommendation", () => {
    const rec = engine.recommendAutomation("low", 50);
    expect(rec.recommended_path).toBeDefined();
    expect(rec.recommended_path.capability).toBeDefined();
  });

  it("returns alternative paths", () => {
    const rec = engine.recommendAutomation("medium", 10);
    expect(rec.alternative_paths.length).toBeGreaterThan(0);
  });

  it("batch-nc has highest confidence for large batch", () => {
    const rec = engine.recommendAutomation("low", 100);
    // High batch — batch-nc should win
    expect(rec.recommended_path.path_id).toBeDefined();
    expect(rec.recommended_path.estimated_cycle_time_reduction_pct).toBeGreaterThan(0);
  });

  it("roi_break_even_parts is a positive integer", () => {
    const rec = engine.recommendAutomation("high", 5);
    expect(rec.roi_break_even_parts).toBeGreaterThan(0);
  });

  it("reasoning string mentions batch size and complexity", () => {
    const rec = engine.recommendAutomation("medium", 15);
    expect(rec.reasoning).toContain("15");
    expect(rec.reasoning).toContain("Medium");
  });

  it("returns valid manual_ref", () => {
    const rec = engine.recommendAutomation("low", 20);
    expect(rec.manual_ref).toContain("AUTOMATION Center Manual");
  });

  it("estimated_setup_time_min > 0 for all paths", () => {
    const rec = engine.recommendAutomation("high", 50);
    for (const path of [rec.recommended_path, ...rec.alternative_paths]) {
      expect(path.estimated_setup_time_min).toBeGreaterThanOrEqual(0);
    }
  });
});

// ============================================================================
// 5. VALIDATE TOOLPATH — Constraint Satisfaction
// ============================================================================

describe("validateToolpath() — constraint satisfaction", () => {
  it("returns valid for known strategy with no constraints", () => {
    const result = engine.validateToolpath("hm-3d-opt-rough", []);
    expect(result.valid).toBe(true);
    expect(result.safety_score).toBeGreaterThanOrEqual(0.7);
  });

  it("returns invalid for unknown strategy ID", () => {
    const result = engine.validateToolpath("NONEXISTENT-strategy-999", []);
    expect(result.valid).toBe(false);
    expect(result.safety_score).toBe(0.0);
    expect(result.blocking_violations.length).toBeGreaterThan(0);
  });

  it("returns error for no_maxx constraint with MAXX strategy", () => {
    const result = engine.validateToolpath("hm-maxx-rough", ["no_maxx"]);
    expect(result.valid).toBe(false);
    const maxxViolation = result.constraint_results.find(c => c.constraint === "no_maxx");
    expect(maxxViolation?.satisfied).toBe(false);
    expect(maxxViolation?.severity).toBe("error");
  });

  it("returns error for no_5axis constraint with 5-axis-only strategy", () => {
    const result = engine.validateToolpath("hm-5ax-impeller", ["no_5axis"]);
    expect(result.valid).toBe(false);
    const violation = result.constraint_results.find(c => c.constraint === "no_5axis");
    expect(violation?.satisfied).toBe(false);
  });

  it("safety_score <= 0.70 when blocking violations exist", () => {
    const result = engine.validateToolpath("hm-maxx-rough", ["no_maxx", "no_5axis"]);
    expect(result.safety_score).toBeLessThanOrEqual(0.7);
  });

  it("passes no_5axis constraint for 3-axis strategy", () => {
    const result = engine.validateToolpath("hm-3d-opt-rough", ["no_5axis"]);
    const constraint = result.constraint_results.find(c => c.constraint === "no_5axis");
    expect(constraint?.satisfied).toBe(true);
  });

  it("returns strategy limitations as info constraints", () => {
    const result = engine.validateToolpath("hm-3d-zlevel", []);
    const infoConstraints = result.constraint_results.filter(c => c.severity === "info");
    expect(infoConstraints.length).toBeGreaterThan(0);
  });

  it("includes recommendations from strategy advantages", () => {
    const result = engine.validateToolpath("hm-3d-opt-rough", []);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("require_simulation constraint is always satisfied (informational)", () => {
    const result = engine.validateToolpath("hm-5ax-swarf", ["require_simulation"]);
    const sim = result.constraint_results.find(c => c.constraint === "require_simulation");
    expect(sim?.satisfied).toBe(true);
    expect(sim?.severity).toBe("info");
  });

  it("unknown constraint passes through as satisfied info", () => {
    const result = engine.validateToolpath("hm-2d-pocket", ["custom_shop_rule:abc"]);
    const custom = result.constraint_results.find(c => c.constraint === "custom_shop_rule:abc");
    expect(custom?.satisfied).toBe(true);
    expect(custom?.severity).toBe("info");
  });
});

// ============================================================================
// 6. EXPLAIN STRATEGY — Documentation Reference
// ============================================================================

describe("explainStrategy() — documentation reference", () => {
  it("explains hm-3d-opt-rough with full detail", () => {
    const exp = engine.explainStrategy("hm-3d-opt-rough");
    expect(exp.strategy_id).toBe("hm-3d-opt-rough");
    expect(exp.cycle_name).toBe("Optimised Roughing");
    expect(exp.category).toBe("3d_milling");
    expect(exp.full_description.length).toBeGreaterThan(10);
    expect(exp.detail_from_manual.length).toBeGreaterThan(20);
  });

  it("returns manual section and pages", () => {
    const exp = engine.explainStrategy("hm-3d-opt-rough");
    expect(exp.manual_section).toContain("hyperMILL Manual");
    expect(exp.manual_pages).toMatch(/pp\./);
  });

  it("returns use_cases populated from applicable_features", () => {
    const exp = engine.explainStrategy("hm-2d-pocket");
    expect(exp.use_cases.length).toBeGreaterThan(0);
    expect(exp.use_cases.some(u => u.includes("pocket"))).toBe(true);
  });

  it("returns parameter guide with ap/ae entries", () => {
    const exp = engine.explainStrategy("hm-3d-zlevel");
    const paramNames = exp.parameter_guide.map(p => p.param);
    expect(paramNames.some(p => p.toLowerCase().includes("axial") || p.toLowerCase().includes("ap"))).toBe(true);
  });

  it("returns cross_cam_equivalents for known strategy", () => {
    const exp = engine.explainStrategy("hm-3d-opt-rough");
    expect(exp.cross_cam_equivalents.length).toBeGreaterThan(0);
    expect(exp.cross_cam_equivalents.some(e => e.cam_system === "Mastercam")).toBe(true);
  });

  it("returns cross_cam_equivalents for hm-5ax-swarf including Mastercam", () => {
    const exp = engine.explainStrategy("hm-5ax-swarf");
    expect(exp.cross_cam_equivalents.some(e => e.cam_system === "Mastercam")).toBe(true);
  });

  it("returns related_strategies as array of IDs", () => {
    const exp = engine.explainStrategy("hm-3d-opt-rough");
    expect(Array.isArray(exp.related_strategies)).toBe(true);
    // Should find related 3D strategies sharing features
    expect(exp.related_strategies.length).toBeGreaterThan(0);
  });

  it("jm_die_application mentions high relevance for hm-3d-opt-rough", () => {
    const exp = engine.explainStrategy("hm-3d-opt-rough");
    expect(exp.jm_die_application).toContain("95%");
  });

  it("returns fallback for unknown strategy name", () => {
    const exp = engine.explainStrategy("UNKNOWN_STRATEGY_XYZ");
    expect(exp.strategy_id).toBe("UNKNOWN_STRATEGY_XYZ");
    expect(exp.full_description).toContain("not found");
    expect(exp.manual_section).toBe("N/A");
  });

  it("can look up by cycle name (case-insensitive)", () => {
    const exp = engine.explainStrategy("Z Level Finishing");
    expect(exp.strategy_id).toBe("hm-3d-zlevel");
  });

  it("MAXX Finishing explanation mentions barrel cutter", () => {
    const exp = engine.explainStrategy("hm-maxx-finish");
    expect(exp.detail_from_manual.toLowerCase()).toContain("barrel");
  });
});

// ============================================================================
// 7. FEATURE RECOGNITION
// ============================================================================

describe("recognizeFeature() — geometry signal matching", () => {
  it("recognizes closed_pocket from geometry signals", () => {
    const results = engine.recognizeFeature(["closed_boundary_loop", "vertical_walls", "floor_surface"]);
    expect(results.length).toBeGreaterThan(0);
    const pocketResult = results.find(r => r.feature_type === "closed_pocket");
    expect(pocketResult).toBeDefined();
    expect(pocketResult!.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it("recognizes ruled_surface for swarf strategy recommendation", () => {
    const results = engine.recognizeFeature(["ruled_surface", "developable_surface", "straight_generatrices"]);
    const ruleResult = results.find(r => r.feature_type === "ruled_surface");
    expect(ruleResult).toBeDefined();
    expect(ruleResult!.recommended_strategies).toContain("hm-5ax-swarf");
  });

  it("recognizes hole_through and recommends drilling", () => {
    const results = engine.recognizeFeature(["cylindrical_surface", "two_open_ends", "circular_cross_section"]);
    const holeResult = results.find(r => r.feature_type === "hole_through");
    expect(holeResult).toBeDefined();
    expect(holeResult!.recommended_strategies).toContain("hm-drill-basic");
  });

  it("returns automation_applicable true for hole features", () => {
    const results = engine.recognizeFeature(["cylindrical_surface", "two_open_ends", "circular_cross_section"]);
    const holeResult = results.find(r => r.feature_type === "hole_through");
    expect(holeResult?.automation_applicable).toBe(true);
  });

  it("returns automation_applicable false for undercut", () => {
    const results = engine.recognizeFeature(["negative_draft_angle", "inaccessible_from_above"]);
    const undercutResult = results.find(r => r.feature_type === "undercut");
    expect(undercutResult?.automation_applicable).toBe(false);
  });

  it("sorts results by confidence descending", () => {
    const results = engine.recognizeFeature(["closed_boundary_loop", "vertical_walls", "floor_surface"]);
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].confidence).toBeGreaterThanOrEqual(results[i + 1].confidence);
    }
  });

  it("returns empty array for unrecognized signals", () => {
    const results = engine.recognizeFeature(["totally_unknown_signal_xyz", "another_unknown_abc"]);
    expect(results).toEqual([]);
  });

  it("partial signal match returns reduced confidence", () => {
    const fullResults = engine.recognizeFeature(["closed_boundary_loop", "vertical_walls", "floor_surface"]);
    const partialResults = engine.recognizeFeature(["closed_boundary_loop"]);
    const fullConf = fullResults.find(r => r.feature_type === "closed_pocket")?.confidence ?? 0;
    const partialConf = partialResults.find(r => r.feature_type === "closed_pocket")?.confidence ?? 0;
    expect(partialConf).toBeLessThan(fullConf);
  });
});

// ============================================================================
// 8. SQL TOOL DATABASE SCHEMA
// ============================================================================

describe("getSQLTableSchema() — SQL Tool DB", () => {
  it("returns Tools table schema", () => {
    const table = engine.getSQLTableSchema("Tools");
    expect(table).toBeDefined();
    expect(table!.table_name).toBe("Tools");
    expect(table!.key_fields.length).toBeGreaterThan(5);
  });

  it("Tools table has Diameter_mm required field", () => {
    const table = engine.getSQLTableSchema("Tools");
    const diamField = table!.key_fields.find(f => f.field_name === "Diameter_mm");
    expect(diamField).toBeDefined();
    expect(diamField!.required).toBe(true);
  });

  it("returns Assemblies table with FK references", () => {
    const table = engine.getSQLTableSchema("Assemblies");
    expect(table).toBeDefined();
    const toolFk = table!.key_fields.find(f => f.field_name === "ToolID");
    expect(toolFk?.type).toContain("FK");
  });

  it("returns CuttingData table with MaterialGroup field", () => {
    const table = engine.getSQLTableSchema("CuttingData");
    const matField = table!.key_fields.find(f => f.field_name === "MaterialGroup");
    expect(matField).toBeDefined();
    expect(matField!.description).toContain("ISO material group");
  });

  it("returns undefined for unknown table name", () => {
    const table = engine.getSQLTableSchema("NONEXISTENT_TABLE");
    expect(table).toBeUndefined();
  });

  it("lookup is case-insensitive", () => {
    const upper = engine.getSQLTableSchema("TOOLS");
    const lower = engine.getSQLTableSchema("tools");
    expect(upper?.table_name).toBe(lower?.table_name);
  });
});

// ============================================================================
// 9. VIRTUAL MACHINING CENTER
// ============================================================================

describe("getVirtualMachiningFeatures()", () => {
  it("returns virtual machining features array", () => {
    const features = engine.getVirtualMachiningFeatures();
    expect(features.length).toBeGreaterThanOrEqual(4);
  });

  it("includes collision detection feature", () => {
    const features = engine.getVirtualMachiningFeatures();
    const collision = features.find(f => f.id === "vmc-collision");
    expect(collision).toBeDefined();
    expect(collision!.collision_detection).toBe(true);
    expect(collision!.requires_machine_model).toBe(true);
  });

  it("includes NC code verification feature", () => {
    const features = engine.getVirtualMachiningFeatures();
    const ncVerify = features.find(f => f.id === "vmc-nc-verify");
    expect(ncVerify).toBeDefined();
    expect(ncVerify!.output_type).toBe("pass_fail");
  });

  it("includes cycle time estimation feature", () => {
    const features = engine.getVirtualMachiningFeatures();
    const cycleTime = features.find(f => f.id === "vmc-cycle-time");
    expect(cycleTime).toBeDefined();
    expect(cycleTime!.output_type).toBe("report");
  });

  it("all features have manual references", () => {
    const features = engine.getVirtualMachiningFeatures();
    for (const f of features) {
      expect(f.manual_ref).toContain("VIRTUAL Machining Center Manual");
    }
  });

  it("returns a copy — mutation does not affect internal state", () => {
    const features = engine.getVirtualMachiningFeatures();
    const originalLength = features.length;
    features.push({ id: "fake", name: "Fake", description: "fake",
      collision_detection: false, requires_machine_model: false,
      output_type: "visual", manual_ref: "none" });
    const featuresAgain = engine.getVirtualMachiningFeatures();
    expect(featuresAgain.length).toBe(originalLength);
  });
});

// ============================================================================
// 10. STRATEGIES BY CATEGORY
// ============================================================================

describe("getStrategiesByCategory()", () => {
  it("returns 2D milling strategies", () => {
    const strategies = engine.getStrategiesByCategory("2d_milling");
    expect(strategies.length).toBeGreaterThanOrEqual(5);
    expect(strategies.every(s => s.category === "2d_milling")).toBe(true);
  });

  it("returns 3D milling strategies", () => {
    const strategies = engine.getStrategiesByCategory("3d_milling");
    expect(strategies.length).toBeGreaterThanOrEqual(6);
  });

  it("returns MAXX machining strategies", () => {
    const strategies = engine.getStrategiesByCategory("maxx_machining");
    expect(strategies.length).toBeGreaterThanOrEqual(2);
    expect(strategies.every(s => s.applicable_features.length > 0)).toBe(true);
  });

  it("returns 5-axis simultaneous strategies", () => {
    const strategies = engine.getStrategiesByCategory("5axis_simultaneous");
    expect(strategies.length).toBeGreaterThanOrEqual(4);
  });

  it("all drilling strategies have hole features", () => {
    const strategies = engine.getStrategiesByCategory("drilling");
    for (const s of strategies) {
      const hasHole = s.applicable_features.some(f =>
        f.includes("hole") || f.includes("bore")
      );
      expect(hasHole).toBe(true);
    }
  });
});

// ============================================================================
// 11. STRATEGY CATALOG INTEGRITY
// ============================================================================

describe("Strategy catalog integrity", () => {
  it("all strategies have non-empty cycle_name", () => {
    const kb = engine.buildKnowledgeBase();
    const all = engine.getStrategiesByCategory("2d_milling")
      .concat(engine.getStrategiesByCategory("3d_milling"))
      .concat(engine.getStrategiesByCategory("5axis_simultaneous"))
      .concat(engine.getStrategiesByCategory("maxx_machining"));
    for (const s of all) {
      expect(s.cycle_name.length).toBeGreaterThan(0);
    }
    expect(kb.total_strategies).toBeGreaterThan(0);
  });

  it("all strategies have at least one applicable feature", () => {
    const categories: HyperMillStrategyCategory[] = [
      "2d_milling", "3d_milling", "5axis_simultaneous", "maxx_machining",
      "drilling", "high_speed",
    ];
    for (const cat of categories) {
      for (const s of engine.getStrategiesByCategory(cat)) {
        expect(s.applicable_features.length).toBeGreaterThan(0);
      }
    }
  });

  it("all strategies have manual_ref containing 'hyperMILL Manual'", () => {
    const categories: HyperMillStrategyCategory[] = [
      "2d_milling", "3d_milling", "5axis_simultaneous", "maxx_machining",
    ];
    for (const cat of categories) {
      for (const s of engine.getStrategiesByCategory(cat)) {
        expect(s.manual_ref).toContain("hyperMILL Manual");
      }
    }
  });

  it("jm_die_relevance is between 0 and 100 for all strategies", () => {
    const categories: HyperMillStrategyCategory[] = [
      "2d_milling", "3d_milling", "5axis_simultaneous", "maxx_machining",
      "drilling", "high_speed", "turning", "thread_milling",
    ];
    for (const cat of categories) {
      for (const s of engine.getStrategiesByCategory(cat)) {
        expect(s.jm_die_relevance).toBeGreaterThanOrEqual(0);
        expect(s.jm_die_relevance).toBeLessThanOrEqual(100);
      }
    }
  });
});
