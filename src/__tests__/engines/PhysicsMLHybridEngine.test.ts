import { describe, it, expect } from 'vitest';
import {
  physicsMLHybridEngine,
  PhysicsMLHybridEngine,
} from '../../engines/PhysicsMLHybridEngine.js';

describe('PhysicsMLHybridEngine', () => {
  const engine = physicsMLHybridEngine;

  it('exports a singleton instance', () => {
    expect(engine).toBeInstanceOf(PhysicsMLHybridEngine);
    expect(engine.name).toBe('PhysicsMLHybridEngine');
  });

  // ══════════════════════════════════════════════════════════════════════
  // GROUP A: Coupled Physics (Formulas 5-10)
  // ══════════════════════════════════════════════════════════════════════

  describe('Group A: coupledPhysics', () => {
    // HYB-005: Force-Thermal Coupling
    it('HYB-005: force-thermal coupling reduces force at high temperature', () => {
      const r = engine.forceThermalCoupling({
        Fc_base_N: 1000,
        beta: 0.001,
        temperature_C: 500,
        referenceTemp_C: 20,
      });
      expect(r.Fc_N).toBeCloseTo(1000 * (1 - 0.001 * 480), 1);
      expect(r.reductionPercent).toBeCloseTo(48, 0);
      expect(r.formula).toContain('Fc(T)');
      expect(r.confidence).toBeGreaterThan(0);
    });

    it('HYB-005: force-thermal with no temp rise returns base force', () => {
      const r = engine.forceThermalCoupling({
        Fc_base_N: 500,
        beta: 0.002,
        temperature_C: 20,
        referenceTemp_C: 20,
      });
      expect(r.Fc_N).toBeCloseTo(500, 1);
      expect(r.reductionPercent).toBeCloseTo(0, 1);
    });

    // HYB-006: Wear-Surface Coupling
    it('HYB-006: wear-surface coupling degrades Ra with flank wear', () => {
      const r = engine.wearSurfaceCoupling({
        Ra_new_um: 0.8,
        gamma: 5,
        flankWear_mm: 0.2,
      });
      expect(r.Ra_um).toBeCloseTo(0.8 * (1 + 5 * 0.2), 4);
      expect(r.degradationPercent).toBeCloseTo(100, 0);
      expect(r.formula).toContain('Ra(VB)');
    });

    it('HYB-006: zero wear returns original Ra', () => {
      const r = engine.wearSurfaceCoupling({
        Ra_new_um: 1.6,
        gamma: 3,
        flankWear_mm: 0,
      });
      expect(r.Ra_um).toBeCloseTo(1.6, 4);
    });

    // HYB-007: Vibration-Wear Coupling
    it('HYB-007: vibration accelerates tool wear', () => {
      const r = engine.vibrationWearCoupling({
        VB_initial_mm: 0.05,
        baseWearRate_mmPerMin: 0.01,
        delta: 10,
        vibrationAmplitude_mm: 0.05,
        duration_min: 10,
      });
      const expectedAmp = 1 + 10 * 0.05;
      expect(r.amplification).toBeCloseTo(expectedAmp, 4);
      expect(r.VB_final_mm).toBeGreaterThan(0.05);
      expect(r.VB_final_mm).toBeCloseTo(0.05 + 0.01 * expectedAmp * 10, 2);
      expect(r.wearHistory.length).toBeGreaterThan(1);
    });

    // HYB-008: Thermal-Deflection Coupling
    it('HYB-008: thermal-deflection coupling sums force and thermal deflection', () => {
      const r = engine.thermalDeflectionCoupling({
        force_N: 100,
        toolLength_mm: 50,
        toolDiameter_mm: 10,
        elasticModulus_GPa: 210,
        thermalExpCoeff: 12e-6,
        tempRise_C: 100,
      });
      expect(r.deflection_force_mm).toBeGreaterThan(0);
      expect(r.deflection_thermal_mm).toBeCloseTo(12e-6 * 100 * 50, 6);
      expect(r.deflection_total_mm).toBeCloseTo(
        r.deflection_force_mm + r.deflection_thermal_mm, 6
      );
      expect(r.thermalContributionPercent).toBeGreaterThan(0);
      expect(r.thermalContributionPercent).toBeLessThan(100);
    });

    // HYB-009: Coupled Thermal-Mechanical
    it('HYB-009: coupled thermal-mechanical includes thermal force', () => {
      const r = engine.coupledThermalMechanical({
        stiffness_N_per_mm: 50000,
        appliedForce_N: 1000,
        thermalExpCoeff: 12e-6,
        tempRise_C: 50,
        constrainedLength_mm: 100,
        crossSectionArea_mm2: 100,
        elasticModulus_GPa: 200,
      });
      // F_thermal = 200e3 * 100 * 12e-6 * 50 = 12000 N
      expect(r.thermalForce_N).toBeCloseTo(12000, 0);
      expect(r.displacement_mm).toBeCloseTo((1000 + 12000) / 50000, 4);
      expect(r.totalStress_MPa).toBeGreaterThan(0);
    });

    // HYB-010: Fluid-Structure Interaction
    it('HYB-010: FSI pressure increases with structural deformation', () => {
      const base = engine.fluidStructureInteraction({
        fluidVelocity_m_s: 5,
        fluidDensity_kg_m3: 1000,
        structureDeflection_mm: 0,
        channelWidth_mm: 10,
      });
      const deformed = engine.fluidStructureInteraction({
        fluidVelocity_m_s: 5,
        fluidDensity_kg_m3: 1000,
        structureDeflection_mm: 5,
        channelWidth_mm: 10,
      });
      expect(deformed.pressure_Pa).toBeGreaterThan(base.pressure_Pa);
      expect(deformed.couplingFactor).toBeCloseTo(2, 1);
      expect(base.reynoldsNumber).toBeGreaterThan(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // GROUP B: Hybrid ML-Physics (Formulas 1-4)
  // ══════════════════════════════════════════════════════════════════════

  describe('Group B: hybridMLPhysics', () => {
    // HYB-001: Residual Learning
    it('HYB-001: residual learning corrects physics bias', () => {
      const r = engine.residualLearning({
        physicsValue: 100,
        observations: [105, 108, 103, 107],
        physicsPredictions: [100, 100, 100, 100],
      });
      // Mean residual = (5+8+3+7)/4 = 5.75
      expect(r.meanResidual).toBeCloseTo(5.75, 2);
      expect(r.correctedValue).toBeCloseTo(105.75, 2);
      expect(r.residualStd).toBeGreaterThan(0);
    });

    it('HYB-001: residual learning with queryPoint uses local weighting', () => {
      const r = engine.residualLearning({
        physicsValue: 200,
        observations: [210, 195, 208],
        physicsPredictions: [200, 190, 205],
        queryPoint: 200,
      });
      expect(r.correctedValue).toBeDefined();
      expect(r.residualEstimate).not.toEqual(r.meanResidual);
    });

    // HYB-002: Physics-Guided Loss
    it('HYB-002: physics-guided loss combines data and physics terms', () => {
      const r = engine.physicsGuidedLoss({
        predictions: [10, 20, 30],
        observations: [11, 19, 31],
        physicsConstraintValues: [0, 0.5, 0],
        lambda: 10,
      });
      // dataLoss = ((1)^2 + (1)^2 + (1)^2)/3 = 1
      expect(r.dataLoss).toBeCloseTo(1, 2);
      // physicsLoss = (0 + 0.25 + 0)/3 ≈ 0.0833
      expect(r.physicsLoss).toBeCloseTo(0.0833, 3);
      expect(r.totalLoss).toBeCloseTo(1 + 10 * 0.0833, 2);
      expect(r.physicsViolationCount).toBe(1);
    });

    // HYB-003: Hybrid Uncertainty
    it('HYB-003: hybrid uncertainty with zero correlation', () => {
      const r = engine.hybridUncertainty({
        sigma_physics: 3,
        sigma_ML: 4,
      });
      expect(r.variance_hybrid).toBeCloseTo(9 + 16, 4);
      expect(r.sigma_hybrid).toBeCloseTo(5, 4);
      expect(r.crossTerm).toBeCloseTo(0, 4);
    });

    it('HYB-003: hybrid uncertainty with positive correlation', () => {
      const r = engine.hybridUncertainty({
        sigma_physics: 3,
        sigma_ML: 4,
        correlation_rho: 0.5,
      });
      expect(r.variance_hybrid).toBeCloseTo(9 + 16 + 2 * 0.5 * 3 * 4, 4);
      expect(r.crossTerm).toBeCloseTo(12, 4);
    });

    // HYB-004: Adaptive Weighting
    it('HYB-004: adaptive weighting favors physics when ML uncertain', () => {
      const r = engine.adaptiveWeighting({
        physicsValue: 100,
        mlValue: 120,
        sigma_physics: 5,
        sigma_ML: 20,
      });
      // α_physics = 400/(25+400) = 0.941
      expect(r.alpha_physics).toBeGreaterThan(0.9);
      expect(r.dominantModel).toBe('physics');
      expect(r.blendedValue).toBeCloseTo(
        r.alpha_physics * 100 + r.alpha_ML * 120, 2
      );
    });

    it('HYB-004: adaptive weighting favors ML when physics uncertain', () => {
      const r = engine.adaptiveWeighting({
        physicsValue: 100,
        mlValue: 120,
        sigma_physics: 20,
        sigma_ML: 5,
      });
      expect(r.alpha_ML).toBeGreaterThan(0.9);
      expect(r.dominantModel).toBe('ML');
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // GROUP C: Optimization (Formulas 11-13)
  // ══════════════════════════════════════════════════════════════════════

  describe('Group C: optimization', () => {
    // HYB-011: Multi-Objective Balance
    it('HYB-011: multi-objective finds best weighted candidate', () => {
      const r = engine.multiObjectiveBalance({
        objectives: [
          { name: 'cost', values: [10, 20, 15], weight: 0.6 },
          { name: 'time', values: [30, 10, 20], weight: 0.4 },
        ],
        candidates: 3,
      });
      expect(r.bestIndex).toBeDefined();
      expect(r.scores.length).toBe(3);
      expect(r.feasibleCount).toBe(3);
      expect(r.paretoFrontIndices.length).toBeGreaterThan(0);
    });

    it('HYB-011: constraints filter infeasible candidates', () => {
      const r = engine.multiObjectiveBalance({
        objectives: [
          { name: 'cost', values: [10, 5, 15], weight: 1.0 },
        ],
        constraints: [
          { name: 'power', values: [50, 120, 80], limit: 100 },
        ],
        candidates: 3,
      });
      // Candidate 1 (index 1) violates power constraint
      expect(r.feasibleCount).toBe(2);
      expect(r.bestIndex).not.toBe(1);
    });

    // HYB-012: Robust Optimization
    it('HYB-012: robust optimization balances nominal and worst-case', () => {
      const r = engine.robustOptimization({
        nominalObjective: [10, 15, 12],
        worstCaseObjective: [30, 18, 25],
        robustnessWeight: 0.5,
      });
      // Scores: [20, 16.5, 18.5] → best = index 1
      expect(r.bestIndex).toBe(1);
      expect(r.bestRobustScore).toBeCloseTo(16.5, 2);
      expect(r.nominalBestIndex).toBe(0);
    });

    // HYB-013: Stochastic Optimization
    it('HYB-013: stochastic optimization minimizes expected value', () => {
      const r = engine.stochasticOptimization({
        candidateScenarios: [
          [10, 20, 30],   // E=20
          [15, 15, 15],   // E=15
          [5, 25, 35],    // E=21.67
        ],
      });
      expect(r.bestIndex).toBe(1); // lowest expected value
      expect(r.expectedValues[1]).toBeCloseTo(15, 2);
      expect(r.cvarValues.length).toBe(3);
    });

    it('HYB-013: stochastic with risk aversion considers CVaR', () => {
      const r = engine.stochasticOptimization({
        candidateScenarios: [
          [10, 10, 100],  // E≈40, high tail
          [30, 30, 30],   // E=30, no tail risk
        ],
        riskAversion: 1.0, // pure CVaR
      });
      // Candidate 1 has lower CVaR (no tail risk)
      expect(r.bestIndex).toBe(1);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // GROUP D: Online Learning (Formulas 14-16)
  // ══════════════════════════════════════════════════════════════════════

  describe('Group D: onlineLearning', () => {
    // HYB-014: Online Learning Force
    it('HYB-014: online learning adjusts kc toward actual force', () => {
      const r = engine.onlineLearningForce({
        kc_initial: 2000,
        observations: [
          { Fc_actual_N: 1100, Fc_predicted_N: 1000 },
          { Fc_actual_N: 1080, Fc_predicted_N: 1000 },
          { Fc_actual_N: 1050, Fc_predicted_N: 1000 },
        ],
        learningRate: 0.1,
        chipArea_mm2: 1.0,
      });
      expect(r.kc_final).toBeGreaterThan(2000);
      expect(r.kc_history.length).toBe(4); // initial + 3 updates
      expect(r.totalCorrection).toBeGreaterThan(0);
    });

    // HYB-015: Transfer Learning
    it('HYB-015: transfer learning adapts source parameters', () => {
      const r = engine.transferLearning({
        sourceParams: [100, 0.5],
        targetObservations: [110, 115, 108],
        sourcePredictsOnTarget: [100, 100, 100],
        adaptationRate: 0.1,
      });
      expect(r.targetParams.length).toBe(2);
      expect(r.transferGap).toBeGreaterThan(0);
      expect(r.sourceRMSE).toBeGreaterThan(0);
      expect(r.improvementPercent).toBeGreaterThan(0);
    });

    // HYB-016: Meta-Learning Rate
    it('HYB-016: meta-learning adapts rate by task similarity', () => {
      const r = engine.metaLearningRate({
        baseRate: 0.01,
        taskFeatures: [1, 0, 1],
        trainedTaskFeatures: [
          [1, 0, 1],   // identical → sim ≈ 1
          [0, 1, 0],   // orthogonal → sim ≈ 0
        ],
      });
      expect(r.similarity).toBeCloseTo(1, 1);
      expect(r.mostSimilarTaskIndex).toBe(0);
      expect(r.adaptedRate).toBeCloseTo(0.01, 2);
    });

    it('HYB-016: meta-learning with trained rates uses similarity weighting', () => {
      const r = engine.metaLearningRate({
        baseRate: 0.01,
        taskFeatures: [1, 0],
        trainedTaskFeatures: [[1, 0], [0, 1]],
        trainedTaskRates: [0.05, 0.001],
      });
      // Should weight toward 0.05 since task is similar to first trained task
      expect(r.adaptedRate).toBeGreaterThan(0.01);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // GROUP E: System Level (Formulas 17-20)
  // ══════════════════════════════════════════════════════════════════════

  describe('Group E: systemLevel', () => {
    // HYB-017: Unified Machining Model
    it('HYB-017: unified model produces force, power, Ra, tool life, MRR', () => {
      const r = engine.unifiedMachiningModel({
        material: { tensile_MPa: 600, thermalCond_W_mK: 50 },
        machine: { power_kW: 15, rigidity_N_um: 20, maxRPM: 12000 },
        tool: { diameter_mm: 10, flutes: 4 },
        process: { speed_mpm: 150, feed_mmrev: 0.1, depth_mm: 2 },
      });
      expect(r.cuttingForce_N).toBeGreaterThan(0);
      expect(r.power_kW).toBeGreaterThan(0);
      expect(r.surfaceRoughness_um).toBeGreaterThan(0);
      expect(r.toolLife_min).toBeGreaterThan(0);
      expect(r.mrr_cm3_min).toBeGreaterThan(0);
      expect(r.machinability_index).toBeGreaterThanOrEqual(0);
      expect(r.machinability_index).toBeLessThanOrEqual(1);
      expect(r.constraints).toHaveProperty('power_ok');
    });

    // HYB-018: Self-Optimizing Process
    it('HYB-018: self-optimizing reduces feed when force exceeds limit', () => {
      const r = engine.selfOptimizingProcess({
        currentParams: { speed_mpm: 200, feed_mmrev: 0.15, depth_mm: 3 },
        performance: { force_N: 1500, roughness_um: 1.2, toolWear_mm: 0.1, mrr_cm3_min: 50 },
        targets: { maxForce_N: 1000 },
      });
      expect(r.nextParams.feed_mmrev).toBeLessThan(0.15);
      expect(r.violatedConstraints).toContain('force');
      expect(r.adjustments.feed_pct).toBeLessThan(0);
    });

    it('HYB-018: no violations allows MRR increase', () => {
      const r = engine.selfOptimizingProcess({
        currentParams: { speed_mpm: 100, feed_mmrev: 0.1, depth_mm: 1 },
        performance: { force_N: 500, roughness_um: 0.8, toolWear_mm: 0.1, mrr_cm3_min: 5 },
        targets: { maxForce_N: 1000, maxRoughness_um: 1.6, maxWear_mm: 0.3, minMRR: 20 },
      });
      expect(r.violatedConstraints.length).toBe(0);
      expect(r.nextParams.feed_mmrev).toBeGreaterThanOrEqual(0.1);
    });

    // HYB-019: Explainable Prediction
    it('HYB-019: explainable prediction shows feature contributions', () => {
      const r = engine.explainablePrediction({
        features: [
          { name: 'speed', value: 200, unit: 'm/min' },
          { name: 'feed', value: 0.1, unit: 'mm/rev' },
          { name: 'depth', value: 2, unit: 'mm' },
        ],
        coefficients: [0.5, 100, 10],
        intercept: 5,
      });
      // y = 5 + 200*0.5 + 0.1*100 + 2*10 = 5 + 100 + 10 + 20 = 135
      expect(r.prediction).toBeCloseTo(135, 2);
      expect(r.contributions.length).toBe(3);
      expect(r.topFeature).toBe('speed'); // largest contribution
      expect(r.explanation).toContain('speed');
    });

    // HYB-020: Confidence-Weighted Ensemble
    it('HYB-020: ensemble weights by confidence', () => {
      const r = engine.confidenceWeightedEnsemble({
        models: [
          { name: 'physics', prediction: 100, confidence: 0.9 },
          { name: 'ML', prediction: 120, confidence: 0.3 },
        ],
      });
      // ŷ = (0.9*100 + 0.3*120) / (0.9+0.3) = (90+36)/1.2 = 105
      expect(r.ensemblePrediction).toBeCloseTo(105, 2);
      expect(r.weights[0].normalizedWeight).toBeCloseTo(0.75, 2);
      expect(r.modelCount).toBe(2);
      expect(r.ensembleUncertainty).toBeGreaterThan(0);
    });

    it('HYB-020: minConfidence filters low-confidence models', () => {
      const r = engine.confidenceWeightedEnsemble({
        models: [
          { name: 'A', prediction: 100, confidence: 0.8 },
          { name: 'B', prediction: 200, confidence: 0.1 },
        ],
        minConfidence: 0.5,
      });
      expect(r.modelCount).toBe(1);
      expect(r.ensemblePrediction).toBeCloseTo(100, 2);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // Dispatch routing
  // ══════════════════════════════════════════════════════════════════════

  describe('calculate() dispatch', () => {
    it('routes hybrid_coupled_physics to forceThermalCoupling', () => {
      const r = engine.calculate('hybrid_coupled_physics', 'force_thermal_coupling', {
        Fc_base_N: 500, beta: 0.001, temperature_C: 200, referenceTemp_C: 20,
      });
      expect(r.Fc_N).toBeDefined();
    });

    it('routes hybrid_ml_physics to residualLearning', () => {
      const r = engine.calculate('hybrid_ml_physics', 'residual_learning', {
        physicsValue: 50, observations: [55], physicsPredictions: [50],
      });
      expect(r.correctedValue).toBeDefined();
    });

    it('routes hybrid_optimization to robustOptimization', () => {
      const r = engine.calculate('hybrid_optimization', 'robust_optimization', {
        nominalObjective: [10, 20], worstCaseObjective: [25, 22],
      });
      expect(r.bestIndex).toBeDefined();
    });

    it('routes hybrid_online_learning to onlineLearningForce', () => {
      const r = engine.calculate('hybrid_online_learning', 'online_learning_force', {
        kc_initial: 1500, observations: [{ Fc_actual_N: 110, Fc_predicted_N: 100 }], learningRate: 0.05,
      });
      expect(r.kc_final).toBeDefined();
    });

    it('routes hybrid_system_level to confidenceWeightedEnsemble', () => {
      const r = engine.calculate('hybrid_system_level', 'confidence_weighted_ensemble', {
        models: [{ name: 'A', prediction: 10, confidence: 0.9 }],
      });
      expect(r.ensemblePrediction).toBeDefined();
    });

    it('throws on unknown action', () => {
      expect(() => engine.calculate('bad_action' as any, 'x', {})).toThrow('Unknown hybrid action');
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // Edge cases and validation
  // ══════════════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('force-thermal clamps to prevent negative force', () => {
      const r = engine.forceThermalCoupling({
        Fc_base_N: 100, beta: 0.1, temperature_C: 1000, referenceTemp_C: 0,
      });
      // 1 - 0.1*1000 = -99, clamped to 0.01
      expect(r.Fc_N).toBeCloseTo(100 * 0.01, 1);
    });

    it('adaptive weighting handles both sigmas zero', () => {
      const r = engine.adaptiveWeighting({
        physicsValue: 100, mlValue: 200, sigma_physics: 0, sigma_ML: 0,
      });
      expect(r.alpha_physics).toBeCloseTo(0.5, 4);
      expect(r.blendedValue).toBeCloseTo(150, 2);
    });

    it('hybrid uncertainty rejects invalid correlation', () => {
      expect(() => engine.hybridUncertainty({
        sigma_physics: 1, sigma_ML: 1, correlation_rho: 1.5,
      })).toThrow('correlation_rho');
    });

    it('explainable prediction with zero contributions', () => {
      const r = engine.explainablePrediction({
        features: [{ name: 'x', value: 0, unit: '' }],
        coefficients: [5],
        intercept: 10,
      });
      expect(r.prediction).toBeCloseTo(10, 4);
    });
  });
});
