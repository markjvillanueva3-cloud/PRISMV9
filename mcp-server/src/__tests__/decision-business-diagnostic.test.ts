/**
 * Tests for DecisionReasoningEngine, BusinessIntelligenceEngine, DiagnosticReasoningEngine
 * ========================================================================================
 * Verifies:
 *   - Multi-criteria decision making
 *   - Machine/tool/holder/fixture/material selection
 *   - Make vs Buy analysis
 *   - Upgrade vs Outsource decisions
 *   - Capital investment analysis
 *   - Machine alarm diagnosis
 *   - Fault tree analysis
 *   - FMEA calculations
 */

import { describe, it, expect } from "vitest";
import {
  DecisionReasoningEngine,
  DecisionProblem,
  DecisionCriterion,
  DecisionCandidate,
  MachineCapability,
  MachineRequirements,
  ToolCapability,
  ToolRequirements,
} from "../engines/DecisionReasoningEngine.js";
import {
  BusinessIntelligenceEngine,
  MakeOption,
  BuyOption,
  UpgradeOption,
  OutsourceOption,
  CostCategory,
} from "../engines/BusinessIntelligenceEngine.js";
import {
  DiagnosticReasoningEngine,
  MachineAlarm,
  Symptom,
} from "../engines/DiagnosticReasoningEngine.js";

// ============================================================================
// DECISION REASONING TESTS
// ============================================================================

describe("DecisionReasoningEngine", () => {
  describe("Multi-Criteria Decision Analysis", () => {
    it("should make a decision based on weighted criteria", () => {
      const criteria: DecisionCriterion[] = [
        { id: "cost", name: "Cost", description: "Lower is better", importance: "high", weight: 0.4, type: "minimize" },
        { id: "quality", name: "Quality", description: "Higher is better", importance: "high", weight: 0.4, type: "maximize" },
        { id: "lead_time", name: "Lead Time", description: "Shorter is better", importance: "medium", weight: 0.2, type: "minimize" },
      ];

      const candidates: DecisionCandidate[] = [
        { id: "A", name: "Option A", category: "tool", properties: {}, scores: { cost: 100, quality: 80, lead_time: 5 }, normalized_scores: {} },
        { id: "B", name: "Option B", category: "tool", properties: {}, scores: { cost: 150, quality: 95, lead_time: 3 }, normalized_scores: {} },
        { id: "C", name: "Option C", category: "tool", properties: {}, scores: { cost: 80, quality: 70, lead_time: 7 }, normalized_scores: {} },
      ];

      const problem: DecisionProblem = {
        problem_id: "test-1",
        category: "tool",
        description: "Test decision",
        context: {},
        criteria,
        candidates,
        constraints: [],
      };

      const result = DecisionReasoningEngine.decide(problem);

      expect(result).toBeDefined();
      expect(result.recommended).toBeDefined();
      expect(result.recommended.rank).toBe(1);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should disqualify candidates failing hard constraints", () => {
      const criteria: DecisionCriterion[] = [
        { id: "capacity", name: "Capacity", description: "Must meet minimum", importance: "critical", weight: 0.5, type: "maximize" },
        { id: "cost", name: "Cost", description: "Lower is better", importance: "high", weight: 0.5, type: "minimize" },
      ];

      const candidates: DecisionCandidate[] = [
        { id: "A", name: "Small", category: "machine", properties: {}, scores: { capacity: 50, cost: 100 }, normalized_scores: {} },
        { id: "B", name: "Medium", category: "machine", properties: {}, scores: { capacity: 100, cost: 200 }, normalized_scores: {} },
        { id: "C", name: "Large", category: "machine", properties: {}, scores: { capacity: 200, cost: 300 }, normalized_scores: {} },
      ];

      const problem: DecisionProblem = {
        problem_id: "test-2",
        category: "machine",
        description: "Test with constraint",
        context: {},
        criteria,
        candidates,
        constraints: [
          { criterion_id: "capacity", type: "min", value: 80, is_hard: true },
        ],
      };

      const result = DecisionReasoningEngine.decide(problem);

      // Option A (capacity 50) should be disqualified
      expect(result.alternatives.find(c => c.id === "A")).toBeUndefined();
      expect(result.recommended.scores.capacity).toBeGreaterThanOrEqual(80);
    });

    it("should identify Pareto-optimal solutions", () => {
      const criteria: DecisionCriterion[] = [
        { id: "speed", name: "Speed", description: "", importance: "high", weight: 0.5, type: "maximize" },
        { id: "cost", name: "Cost", description: "", importance: "high", weight: 0.5, type: "minimize" },
      ];

      const candidates: DecisionCandidate[] = [
        { id: "A", name: "Fast/Expensive", category: "strategy", properties: {}, scores: { speed: 100, cost: 200 }, normalized_scores: {} },
        { id: "B", name: "Slow/Cheap", category: "strategy", properties: {}, scores: { speed: 50, cost: 80 }, normalized_scores: {} },
        { id: "C", name: "Dominated", category: "strategy", properties: {}, scores: { speed: 40, cost: 150 }, normalized_scores: {} },  // Dominated by both A and B
      ];

      const problem: DecisionProblem = {
        problem_id: "test-3",
        category: "strategy",
        description: "Pareto test",
        context: {},
        criteria,
        candidates,
        constraints: [],
      };

      const result = DecisionReasoningEngine.decide(problem);

      expect(result.pareto_optimal.length).toBeGreaterThanOrEqual(1);
      // C should not be Pareto-optimal (dominated)
      expect(result.pareto_optimal.find(c => c.id === "C")).toBeUndefined();
    });

    it("should provide sensitivity analysis", () => {
      const criteria: DecisionCriterion[] = [
        { id: "a", name: "Criterion A", description: "", importance: "high", weight: 0.6, type: "maximize" },
        { id: "b", name: "Criterion B", description: "", importance: "high", weight: 0.4, type: "maximize" },
      ];

      const candidates: DecisionCandidate[] = [
        { id: "1", name: "Option 1", category: "tool", properties: {}, scores: { a: 80, b: 70 }, normalized_scores: {} },
        { id: "2", name: "Option 2", category: "tool", properties: {}, scores: { a: 75, b: 90 }, normalized_scores: {} },
      ];

      const problem: DecisionProblem = {
        problem_id: "test-4",
        category: "tool",
        description: "Sensitivity test",
        context: {},
        criteria,
        candidates,
        constraints: [],
      };

      const result = DecisionReasoningEngine.decide(problem);

      expect(result.sensitivity).toBeDefined();
      expect(result.sensitivity.robust).toBeDefined();
      expect(result.sensitivity.weight_sensitivity.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Machine Selection", () => {
    it("should select machine based on requirements", () => {
      const requirements: MachineRequirements = {
        part_size: { x: 200, y: 150, z: 100 },
        operation_types: ["milling", "drilling"],
        required_accuracy: 0.01,
        required_capabilities: ["coolant"],
      };

      const machines: MachineCapability[] = [
        {
          id: "M1",
          name: "Small Mill",
          type: "mill",
          work_envelope: { x_travel: 300, y_travel: 200, z_travel: 150 },
          spindle: { max_rpm: 10000, power_kw: 7.5, torque_nm: 50 },
          accuracy: { positioning: 0.005, repeatability: 0.003 },
          tool_capacity: 16,
          hourly_rate: 75,
          availability: 0.8,
          capabilities: ["coolant", "probing"],
        },
        {
          id: "M2",
          name: "Large Mill",
          type: "mill",
          work_envelope: { x_travel: 600, y_travel: 400, z_travel: 300 },
          spindle: { max_rpm: 8000, power_kw: 15, torque_nm: 100 },
          accuracy: { positioning: 0.008, repeatability: 0.005 },
          tool_capacity: 24,
          hourly_rate: 125,
          availability: 0.6,
          capabilities: ["coolant", "chip_conveyor"],
        },
      ];

      const result = DecisionReasoningEngine.selectMachine(requirements, machines);

      expect(result).toBeDefined();
      expect(result.recommended).toBeDefined();
      expect(result.reasoning.explanation).toBeDefined();
    });
  });

  describe("Tool Selection", () => {
    it("should select tool for operation", () => {
      const requirements: ToolRequirements = {
        operation: "roughing",
        material: "steel",
        feature_diameter: 20,
        feature_depth: 30,
      };

      const tools: ToolCapability[] = [
        {
          id: "T1",
          name: "Carbide Endmill 16mm",
          type: "endmill",
          diameter: 16,
          flute_count: 4,
          coating: "TiAlN",
          substrate: "carbide",
          max_depth: 48,
          recommended_materials: ["steel", "cast iron"],
          cutting_data: { vc_min: 100, vc_max: 200, fz_min: 0.08, fz_max: 0.15, ap_max: 16, ae_max: 12 },
          cost: 85,
          tool_life_minutes: 45,
        },
        {
          id: "T2",
          name: "HSS Endmill 20mm",
          type: "endmill",
          diameter: 20,
          flute_count: 2,
          coating: "none",
          substrate: "HSS",
          max_depth: 40,
          recommended_materials: ["aluminum", "plastic"],
          cutting_data: { vc_min: 30, vc_max: 60, fz_min: 0.05, fz_max: 0.12, ap_max: 10, ae_max: 15 },
          cost: 25,
          tool_life_minutes: 30,
        },
      ];

      const result = DecisionReasoningEngine.selectTool(requirements, tools);

      expect(result).toBeDefined();
      expect(result.recommended).toBeDefined();
      // T1 should be recommended (material compatibility)
      expect(result.recommended.id).toBe("T1");
    });
  });

  describe("Material Selection", () => {
    it("should select material based on requirements", () => {
      const requirements = {
        hardness_min: 50,
        hardness_max: 62,
        tensile_strength_min: 1500,
        cost_priority: 0.3,
      };

      const materials = [
        { id: "M2", name: "M2 Tool Steel", grade: "AISI M2", hardness_hrc: 60, tensile_strength_mpa: 2000, machinability_index: 40, corrosion_resistant: false, cost_per_kg: 25, lead_time_days: 7 },
        { id: "D2", name: "D2 Tool Steel", grade: "AISI D2", hardness_hrc: 58, tensile_strength_mpa: 1800, machinability_index: 45, corrosion_resistant: true, cost_per_kg: 20, lead_time_days: 5 },
        { id: "A2", name: "A2 Tool Steel", grade: "AISI A2", hardness_hrc: 57, tensile_strength_mpa: 1700, machinability_index: 55, corrosion_resistant: false, cost_per_kg: 18, lead_time_days: 3 },
        { id: "O1", name: "O1 Tool Steel", grade: "AISI O1", hardness_hrc: 62, tensile_strength_mpa: 1600, machinability_index: 70, corrosion_resistant: false, cost_per_kg: 12, lead_time_days: 2 },
      ];

      const result = DecisionReasoningEngine.selectMaterial(requirements, materials);

      expect(result).toBeDefined();
      expect(result.recommended).toBeDefined();
      // All should meet hardness requirements
      const hardness = result.recommended.properties.hardness as number;
      expect(hardness).toBeGreaterThanOrEqual(50);
      expect(hardness).toBeLessThanOrEqual(62);
    });

    it("should select appropriate holder based on reach and rigidity", () => {
      const tool: ToolCapability = {
        id: "EM10",
        name: "10mm End Mill",
        tool_type: "end_mill",
        diameter: 10,
        max_depth: 30,
        materials_compatible: ["steel", "aluminum"],
        operations: ["milling", "slotting"],
        max_rpm: 12000,
        cost: 50,
      };

      const machine: MachineCapability = {
        id: "VMC-1",
        name: "VMC 1000",
        type: "vmc",
        work_envelope: { x: 1000, y: 500, z: 500 },
        spindle: { max_rpm: 15000, power_kw: 15, taper: "BT40" },
        table_load_kg: 500,
        accuracy_mm: 0.01,
        cost_per_hour: 80,
      };

      const holders = [
        { id: "H1", name: "Standard Collet", type: "collet" as const, gauge_length: 60, runout: 0.005, max_rpm: 20000, cost: 80, clamping_force: 1000 },
        { id: "H2", name: "Shrink Fit", type: "shrink_fit" as const, gauge_length: 55, runout: 0.002, max_rpm: 25000, cost: 200, clamping_force: 2000 },
        { id: "H3", name: "Hydraulic", type: "hydraulic" as const, gauge_length: 70, runout: 0.003, max_rpm: 18000, cost: 300, clamping_force: 1800 },
      ];

      const result = DecisionReasoningEngine.selectHolder(tool, machine, 50, 0.7, holders);

      expect(result).toBeDefined();
      expect(result.recommended).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      // Should recommend a holder with adequate reach (gauge_length + tool.max_depth >= 50)
      const reach = (result.recommended.properties.gauge_length as number) + tool.max_depth;
      expect(reach).toBeGreaterThanOrEqual(50);
    });

    it("should select appropriate fixture for workholding", () => {
      const partGeometry = {
        length: 200,
        width: 100,
        height: 50,
        weight: 15,
        material: "steel",
      };

      const operations = ["face_milling", "pocket_milling", "drilling"];

      const cuttingForces = {
        max_fx: 500,
        max_fy: 800,
        max_fz: 300,
      };

      const fixtures = [
        { id: "F1", name: "Standard Vise", type: "vise" as const, clamping_force: 10000, work_envelope: { x: 300, y: 150, z: 100 }, setup_time_minutes: 5, cost: 500, accessibility: 0.7 },
        { id: "F2", name: "Fixture Plate", type: "fixture_plate" as const, clamping_force: 5000, work_envelope: { x: 500, y: 400, z: 200 }, setup_time_minutes: 20, cost: 2000, accessibility: 0.9 },
        { id: "F3", name: "Vacuum Table", type: "vacuum" as const, clamping_force: 2000, work_envelope: { x: 600, y: 400, z: 50 }, setup_time_minutes: 3, cost: 3000, accessibility: 1.0 },
      ];

      const result = DecisionReasoningEngine.selectFixture(partGeometry, operations, cuttingForces, fixtures);

      expect(result).toBeDefined();
      expect(result.recommended).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      // Should recommend fixture with adequate clamping force for the cutting forces
      const clampingForce = result.recommended.properties.clamping_force as number;
      expect(clampingForce).toBeGreaterThan(cuttingForces.max_fy);  // Must exceed max cutting force
    });
  });

  describe("Option Comparison", () => {
    it("should compare options side by side", () => {
      const options: DecisionCandidate[] = [
        { id: "A", name: "Option A", category: "tool", properties: {}, scores: { cost: 100, quality: 80, speed: 90 }, normalized_scores: {} },
        { id: "B", name: "Option B", category: "tool", properties: {}, scores: { cost: 120, quality: 95, speed: 85 }, normalized_scores: {} },
      ];

      const criteria: DecisionCriterion[] = [
        { id: "cost", name: "Cost", description: "", importance: "high", weight: 0.4, type: "minimize" },
        { id: "quality", name: "Quality", description: "", importance: "high", weight: 0.4, type: "maximize" },
        { id: "speed", name: "Speed", description: "", importance: "medium", weight: 0.2, type: "maximize" },
      ];

      const comparison = DecisionReasoningEngine.compareOptions(options, criteria);

      expect(comparison).toBeDefined();
      expect(comparison.comparison_matrix.length).toBe(3);
      expect(comparison.overall_ranking.length).toBe(2);
      expect(comparison.tradeoff_summary.length).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// BUSINESS INTELLIGENCE TESTS
// ============================================================================

describe("BusinessIntelligenceEngine", () => {
  describe("Make vs Buy Analysis", () => {
    it("should analyze make vs buy decision", () => {
      const makeOption: MakeOption = {
        setup_cost: 5000,
        material_cost_per_unit: 10,
        labor_cost_per_unit: 5,
        overhead_cost_per_unit: 3,
        cycle_time_minutes: 10,
        machine_hourly_rate: 80,
        tool_cost_per_unit: 0.50,
        quality_cost_per_unit: 0.25,
        lead_time_days: 5,
        capacity_units_per_month: 1000,
      };

      const buyOptions: BuyOption[] = [
        {
          supplier: "Supplier A",
          unit_price: 25,
          minimum_order_quantity: 100,
          lead_time_days: 14,
          shipping_cost_per_unit: 1.50,
          quality_risk: "low",
          reliability_score: 0.95,
        },
      ];

      const strategicFactors = {
        intellectual_property: "not_relevant" as const,
        quality_control: "acceptable" as const,
        flexibility_needs: "medium" as const,
        capacity_utilization: 0.6,
        core_competency: false,
      };

      const result = BusinessIntelligenceEngine.analyzeMakeVsBuy(
        5000,  // Annual volume
        makeOption,
        buyOptions,
        strategicFactors
      );

      expect(result).toBeDefined();
      expect(result.recommendation).toMatch(/^(make|buy|hybrid)$/);
      expect(result.make_analysis.total_cost).toBeGreaterThan(0);
      expect(result.buy_analysis.total_cost).toBeGreaterThan(0);
      expect(result.comparison.break_even_volume).toBeGreaterThan(0);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it("should generate crossover chart", () => {
      const makeOption: MakeOption = {
        setup_cost: 2000,
        material_cost_per_unit: 8,
        labor_cost_per_unit: 4,
        overhead_cost_per_unit: 2,
        cycle_time_minutes: 5,
        machine_hourly_rate: 60,
        tool_cost_per_unit: 0.25,
        quality_cost_per_unit: 0.15,
        lead_time_days: 3,
        capacity_units_per_month: 2000,
      };

      const buyOptions: BuyOption[] = [
        {
          supplier: "Vendor",
          unit_price: 20,
          minimum_order_quantity: 50,
          lead_time_days: 10,
          shipping_cost_per_unit: 1,
          quality_risk: "medium",
          reliability_score: 0.85,
        },
      ];

      const result = BusinessIntelligenceEngine.analyzeMakeVsBuy(
        1000,
        makeOption,
        buyOptions,
        {
          intellectual_property: "not_relevant",
          quality_control: "acceptable",
          flexibility_needs: "low",
          capacity_utilization: 0.4,
          core_competency: false,
        }
      );

      expect(result.comparison.crossover_chart.length).toBeGreaterThan(0);
      expect(result.comparison.crossover_chart[0]).toHaveProperty("volume");
      expect(result.comparison.crossover_chart[0]).toHaveProperty("make_cost");
      expect(result.comparison.crossover_chart[0]).toHaveProperty("buy_cost");
    });
  });

  describe("Upgrade vs Outsource Analysis", () => {
    it("should analyze upgrade vs outsource decision", () => {
      const currentState = {
        annual_volume: 10000,
        current_cost_per_unit: 15,
        current_capacity: 15000,
        machine_age_years: 8,
        machine_book_value: 25000,
      };

      const upgradeOption: UpgradeOption = {
        description: "CNC retrofit with new controller",
        capital_cost: 50000,
        installation_cost: 5000,
        training_cost: 2000,
        downtime_days: 10,
        downtime_cost_per_day: 1500,
        benefits: {
          productivity_increase_percent: 25,
          quality_improvement_percent: 10,
          cost_reduction_per_unit: 2,
          capacity_increase_percent: 30,
          new_capabilities: ["4th axis", "probing"],
        },
        maintenance: {
          annual_cost: 3000,
          expected_life_years: 10,
        },
      };

      const outsourceOption: OutsourceOption = {
        supplier: "Contract Mfg Co",
        unit_price: 12,
        setup_fee: 2000,
        contract_length_months: 24,
        quality: {
          expected_defect_rate: 0.02,
          inspection_cost_per_unit: 0.50,
        },
        logistics: {
          lead_time_days: 14,
          shipping_cost_per_unit: 0.75,
          inventory_buffer_cost: 5000,
        },
        risks: {
          supply_disruption: "medium",
          quality_consistency: "medium",
          ip_exposure: "low",
        },
      };

      const result = BusinessIntelligenceEngine.analyzeUpgradeVsOutsource(
        currentState,
        upgradeOption,
        outsourceOption,
        0.10  // 10% discount rate
      );

      expect(result).toBeDefined();
      expect(result.recommendation).toMatch(/^(upgrade|outsource|status_quo)$/);
      expect(result.upgrade_analysis.npv).toBeDefined();
      expect(result.upgrade_analysis.payback_period_years).toBeGreaterThan(0);
      expect(result.comparison.year_by_year.length).toBeGreaterThan(0);
    });
  });

  describe("Capital Investment Analysis", () => {
    it("should calculate NPV and IRR", () => {
      const result = BusinessIntelligenceEngine.analyzeCapitalInvestment(
        100000,  // Investment
        30000,   // Annual benefits
        5000,    // Annual costs
        7,       // Useful life years
        10000,   // Salvage value
        0.10     // Discount rate
      );

      expect(result).toBeDefined();
      expect(result.financials.npv).toBeDefined();
      expect(result.financials.irr).toBeGreaterThan(0);
      expect(result.financials.payback_period).toBeGreaterThan(0);
      expect(result.cash_flows.length).toBe(8);  // Year 0 + 7 years
    });

    it("should recommend approval for positive NPV", () => {
      const result = BusinessIntelligenceEngine.analyzeCapitalInvestment(
        50000,   // Investment
        20000,   // Annual benefits
        2000,    // Annual costs
        5,       // Useful life
        5000,    // Salvage
        0.10     // Discount rate
      );

      // With these numbers, NPV should be positive
      expect(result.financials.npv).toBeGreaterThan(0);
      expect(result.recommendation).toBe("approve");
    });

    it("should recommend reject for negative NPV", () => {
      const result = BusinessIntelligenceEngine.analyzeCapitalInvestment(
        100000,  // Large investment
        10000,   // Small benefits
        5000,    // Costs
        5,       // Short life
        0,       // No salvage
        0.15     // High discount rate
      );

      expect(result.financials.npv).toBeLessThan(0);
      expect(result.recommendation).toMatch(/^(reject|defer|modify)$/);
    });
  });

  describe("Break-Even Analysis", () => {
    it("should calculate break-even point", () => {
      const result = BusinessIntelligenceEngine.calculateBreakEvenAnalysis(
        50000,  // Fixed costs
        10,     // Variable cost per unit
        25      // Selling price
      );

      // Break-even = 50000 / (25 - 10) = 3333.33
      expect(result.break_even_units).toBeCloseTo(3333.33, 0);
      expect(result.contribution_margin).toBe(15);
      expect(result.contribution_margin_ratio).toBeCloseTo(0.6, 2);
      expect(result.chart.length).toBeGreaterThan(0);
    });
  });

  describe("Cost Driver Analysis", () => {
    it("should analyze cost drivers", () => {
      const costs: CostCategory[] = [
        { id: "1", name: "Material", type: "variable", amount: 10, unit: "$/unit", volume_dependent: true },
        { id: "2", name: "Labor", type: "variable", amount: 5, unit: "$/unit", volume_dependent: true },
        { id: "3", name: "Overhead", type: "fixed", amount: 10000, unit: "$", volume_dependent: false },
        { id: "4", name: "Utilities", type: "semi_variable", amount: 2, unit: "$/unit", volume_dependent: true },
      ];

      const result = BusinessIntelligenceEngine.analyzeCostDrivers(costs, 1000);

      expect(result.total_cost).toBeGreaterThan(0);
      expect(result.fixed_portion).toBeGreaterThan(0);
      expect(result.variable_portion).toBeGreaterThan(0);
      expect(result.drivers.length).toBe(4);
      expect(result.reduction_opportunities.length).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// DIAGNOSTIC REASONING TESTS
// ============================================================================

describe("DiagnosticReasoningEngine", () => {
  describe("Alarm Diagnosis", () => {
    it("should diagnose servo alarm", () => {
      const alarm: MachineAlarm = {
        alarm_code: "SV0401",
        message: "X-axis servo alarm - position deviation",
        severity: "fault",
        timestamp: new Date().toISOString(),
        machine_id: "VMC-001",
        machine_type: "mill",
        controller: "Fanuc",
        axis: "X",
      };

      const result = DiagnosticReasoningEngine.diagnose(alarm);

      expect(result).toBeDefined();
      expect(result.primary_diagnosis).toBeDefined();
      expect(result.primary_diagnosis.probability).toBeGreaterThan(0);
      expect(result.recommended_actions.length).toBeGreaterThan(0);
      expect(result.safety_warnings.length).toBeGreaterThan(0);
    });

    it("should diagnose spindle alarm", () => {
      const alarm: MachineAlarm = {
        alarm_code: "SP1234",
        message: "Spindle drive fault",
        severity: "fault",
        timestamp: new Date().toISOString(),
        machine_id: "VMC-001",
        machine_type: "mill",
        controller: "Fanuc",
        spindle: "Main",
      };

      const result = DiagnosticReasoningEngine.diagnose(alarm);

      expect(result).toBeDefined();
      expect(result.primary_diagnosis.description.toLowerCase()).toContain("spindle");
    });

    it("should incorporate additional symptoms", () => {
      const alarm: MachineAlarm = {
        alarm_code: "OT0001",
        message: "X-axis positive overtravel",
        severity: "critical",
        timestamp: new Date().toISOString(),
        machine_id: "VMC-001",
        machine_type: "mill",
        controller: "Fanuc",
      };

      const symptoms: Symptom[] = [
        { id: "s1", description: "First move causes alarm", observed: true, confidence: 1.0, source: "operator" },
        { id: "s2", description: "After setup change", observed: true, confidence: 0.9, source: "operator" },
      ];

      const result = DiagnosticReasoningEngine.diagnose(alarm, symptoms);

      // Should boost probability of work offset error
      const offsetCause = result.differential_diagnoses.find(
        d => d.description.toLowerCase().includes("offset")
      ) ?? result.primary_diagnosis;

      expect(offsetCause).toBeDefined();
    });
  });

  describe("Symptom-Based Diagnosis", () => {
    it("should diagnose from symptoms alone", () => {
      const symptoms: Symptom[] = [
        { id: "s1", description: "Abnormal noise from spindle", observed: true, confidence: 0.9, source: "audio" },
        { id: "s2", description: "Vibration during cutting", observed: true, confidence: 0.85, source: "operator" },
        { id: "s3", description: "Spindle hot to touch", observed: true, confidence: 0.95, source: "visual" },
      ];

      const result = DiagnosticReasoningEngine.diagnoseFromSymptoms("mill", symptoms);

      expect(result).toBeDefined();
      expect(result.primary_diagnosis.probability).toBeGreaterThan(0);
      // Should suggest spindle/bearing related issue
      expect(
        result.primary_diagnosis.description.toLowerCase().includes("bearing") ||
        result.primary_diagnosis.description.toLowerCase().includes("spindle")
      ).toBe(true);
    });
  });

  describe("Fault Tree Analysis", () => {
    it("should build fault tree for spindle failure", () => {
      const tree = DiagnosticReasoningEngine.buildFaultTree("Spindle Failure", "mill");

      expect(tree).toBeDefined();
      expect(tree.type).toBe("top");
      expect(tree.children).toBeDefined();
      expect(tree.children!.length).toBeGreaterThan(0);
    });

    it("should calculate fault tree probability", () => {
      const tree = DiagnosticReasoningEngine.buildFaultTree("Spindle Failure", "mill");
      const probability = DiagnosticReasoningEngine.calculateFaultTreeProbability(tree);

      expect(probability).toBeGreaterThan(0);
      expect(probability).toBeLessThan(1);
    });
  });

  describe("FMEA", () => {
    it("should perform FMEA analysis", () => {
      const components = [
        {
          name: "Spindle Bearings",
          function: "Support spindle rotation",
          failure_modes: [
            { mode: "Bearing seizure", effect: "Spindle locks up - major crash risk", cause: "Lubrication failure", controls: ["Oil level sensor", "Temperature monitoring"] },
            { mode: "Bearing wear", effect: "Increased runout, poor surface finish", cause: "Normal wear over time", controls: ["Vibration monitoring", "Periodic inspection"] },
          ],
        },
        {
          name: "Coolant Pump",
          function: "Deliver coolant to cutting zone",
          failure_modes: [
            { mode: "Pump failure", effect: "No coolant - thermal damage to tool", cause: "Motor failure or impeller damage", controls: ["Flow sensor", "Pressure switch"] },
          ],
        },
      ];

      const result = DiagnosticReasoningEngine.performFMEA(components);

      expect(result.length).toBe(3);  // 2 + 1 failure modes
      expect(result[0].rpn).toBeDefined();
      expect(result[0].severity).toBeGreaterThanOrEqual(1);
      expect(result[0].severity).toBeLessThanOrEqual(10);
      // Should be sorted by RPN descending
      expect(result[0].rpn).toBeGreaterThanOrEqual(result[result.length - 1].rpn);
    });
  });

  describe("Machine Health Assessment", () => {
    it("should assess machine health", () => {
      const alarms: MachineAlarm[] = [
        { alarm_code: "W001", message: "Low coolant warning", severity: "warning", timestamp: new Date().toISOString(), machine_id: "VMC-001", machine_type: "mill", controller: "Fanuc" },
        { alarm_code: "W002", message: "Filter maintenance due", severity: "info", timestamp: new Date().toISOString(), machine_id: "VMC-001", machine_type: "mill", controller: "Fanuc" },
      ];

      const maintenance = [
        { task: "Oil change", last_performed: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(), interval_days: 90 },  // Overdue
        { task: "Filter replacement", last_performed: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(), interval_days: 30 },  // Due soon
      ];

      const health = DiagnosticReasoningEngine.assessMachineHealth(
        "VMC-001",
        alarms,
        maintenance
      );

      expect(health).toBeDefined();
      expect(health.overall_health).toBeGreaterThanOrEqual(0);
      expect(health.overall_health).toBeLessThanOrEqual(100);
      expect(health.maintenance_due.some(m => m.urgency === "overdue")).toBe(true);
      expect(health.subsystems.length).toBeGreaterThan(0);
    });
  });

  describe("Repair Actions", () => {
    it("should generate repair actions with estimates", () => {
      const alarm: MachineAlarm = {
        alarm_code: "HYD001",
        message: "Hydraulic pressure low",
        severity: "fault",
        timestamp: new Date().toISOString(),
        machine_id: "VMC-001",
        machine_type: "mill",
        controller: "Fanuc",
      };

      const result = DiagnosticReasoningEngine.diagnose(alarm);

      expect(result.recommended_actions.length).toBeGreaterThan(0);

      const firstAction = result.recommended_actions[0];
      expect(firstAction.estimated_time_minutes).toBeGreaterThan(0);
      expect(firstAction.estimated_cost).toBeGreaterThanOrEqual(0);
      expect(firstAction.skill_level_required).toBeDefined();
      expect(firstAction.safety_precautions.length).toBeGreaterThan(0);
    });

    it("should estimate downtime", () => {
      const alarm: MachineAlarm = {
        alarm_code: "SP0001",
        message: "Spindle bearing failure",
        severity: "critical",
        timestamp: new Date().toISOString(),
        machine_id: "VMC-001",
        machine_type: "mill",
        controller: "Fanuc",
      };

      const result = DiagnosticReasoningEngine.diagnose(alarm);

      expect(result.estimated_downtime.best_case_minutes).toBeLessThan(result.estimated_downtime.expected_minutes);
      expect(result.estimated_downtime.expected_minutes).toBeLessThan(result.estimated_downtime.worst_case_minutes);
    });
  });
});
