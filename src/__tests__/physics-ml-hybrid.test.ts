import { describe, it, expect } from 'vitest';
import { physicsMLHybridEngine } from '../engines/PhysicsMLHybridEngine.js';

describe('PhysicsMLHybridEngine', () => {
  // ── Group A: Coupled Physics ──

  it('coupledPhysics — force-thermal coupling reduces force at elevated temperature', () => {
    const result = physicsMLHybridEngine.calculate('hybrid_coupled_physics', 'force_thermal_coupling', {
      Fc_base_N: 1000,
      beta: 0.002,
      temperature_C: 400,
      referenceTemp_C: 20,
    });
    expect(result.Fc_N).toBeLessThan(1000);
    expect(result.Fc_N).toBeGreaterThan(0);
    expect(result.reductionPercent).toBeGreaterThan(0);
  });

  it('coupledPhysics — wear-surface coupling increases Ra with flank wear', () => {
    const result = physicsMLHybridEngine.calculate('hybrid_coupled_physics', 'wear_surface_coupling', {
      Ra_new_um: 0.8,
      gamma: 5.0,
      flankWear_mm: 0.2,
    });
    expect(result.Ra_um).toBeGreaterThan(0.8);
    expect(result.degradationPercent).toBeGreaterThan(0);
  });

  it('coupledPhysics — vibration-wear coupling amplifies wear rate', () => {
    const result = physicsMLHybridEngine.calculate('hybrid_coupled_physics', 'vibration_wear_coupling', {
      VB_initial_mm: 0.1,
      baseWearRate_mmPerMin: 0.005,
      delta: 2.0,
      vibrationAmplitude_mm: 0.05,
      duration_min: 10,
    });
    expect(result.VB_final_mm).toBeGreaterThan(0.1);
    expect(result.amplification).toBeGreaterThanOrEqual(1);
  });

  // ── Group B: Hybrid ML-Physics ──

  it('hybridMLPhysics — residual learning corrects physics prediction', () => {
    const result = physicsMLHybridEngine.calculate('hybrid_ml_physics', 'residual_learning', {
      physicsValue: 100,
      observations: [105, 108, 103, 107, 104],
      physicsPredictions: [100, 100, 100, 100, 100],
    });
    expect(result.correctedValue).toBeGreaterThan(100);
    expect(result.meanResidual).toBeGreaterThan(0);
  });

  it('hybridMLPhysics — hybrid uncertainty combines physics and ML sigma', () => {
    const result = physicsMLHybridEngine.calculate('hybrid_ml_physics', 'hybrid_uncertainty', {
      sigma_physics: 5,
      sigma_ML: 3,
      correlation_rho: 0,
    });
    // Field is sigma_hybrid, not sigma_combined
    expect(result.sigma_hybrid).toBeGreaterThan(0);
    expect(result.variance_hybrid).toBeGreaterThan(0);
  });

  it('hybridMLPhysics — physics-guided loss computes total loss', () => {
    const result = physicsMLHybridEngine.calculate('hybrid_ml_physics', 'physics_guided_loss', {
      predictions: [10, 20, 30],
      observations: [11, 19, 31],
      physicsConstraintValues: [0.1, 0.0, 0.2],
      lambda: 0.5,
    });
    expect(result.totalLoss).toBeGreaterThan(0);
    expect(result.dataLoss).toBeGreaterThan(0);
  });

  // ── Group C: Optimization ──

  it('optimization — multi-objective balance selects best candidate', () => {
    const result = physicsMLHybridEngine.calculate('hybrid_optimization', 'multi_objective_balance', {
      objectives: [
        { name: 'cost', values: [50, 30, 70], weight: 0.4, minimize: true },
        { name: 'quality', values: [0.9, 0.7, 0.95], weight: 0.6, minimize: false },
      ],
      candidates: 3,
    });
    expect(result.bestIndex).toBeGreaterThanOrEqual(0);
    expect(result.bestIndex).toBeLessThan(3);
    expect(result.scores).toHaveLength(3);
  });

  // ── Group D: Online Learning ──

  it('onlineLearning — force update adjusts kc with observations', () => {
    const result = physicsMLHybridEngine.calculate('hybrid_online_learning', 'online_learning_force', {
      kc_initial: 2000,
      observations: [
        { Fc_actual_N: 1050, Fc_predicted_N: 1000 },
        { Fc_actual_N: 1080, Fc_predicted_N: 1020 },
        { Fc_actual_N: 1060, Fc_predicted_N: 1010 },
      ],
      learningRate: 0.1,
      chipArea_mm2: 0.5,
    });
    expect(result.kc_final).toBeGreaterThan(0);
    expect(result.kc_history.length).toBeGreaterThanOrEqual(3);
  });

  it('onlineLearning — transfer learning adapts parameters between domains', () => {
    const result = physicsMLHybridEngine.calculate('hybrid_online_learning', 'transfer_learning', {
      sourceParams: [1.0, 2.0, 3.0],
      targetObservations: [1.1, 2.2, 3.1],
      sourcePredictsOnTarget: [1.05, 2.1, 2.95],
      adaptationRate: 0.3,
    });
    expect(result.targetParams).toHaveLength(3);
    expect(result.adaptationDelta).toHaveLength(3);
  });

  // ── Group E: System Level ──

  it('systemLevel — confidence-weighted ensemble combines predictions', () => {
    const result = physicsMLHybridEngine.calculate('hybrid_system_level', 'confidence_weighted_ensemble', {
      models: [
        { name: 'physics', prediction: 100, confidence: 0.8 },
        { name: 'ml', prediction: 105, confidence: 0.9 },
        { name: 'empirical', prediction: 98, confidence: 0.7 },
      ],
    });
    expect(result.ensemblePrediction).toBeGreaterThan(0);
    expect(result.ensembleUncertainty).toBeGreaterThanOrEqual(0);
    expect(result.modelCount).toBe(3);
  });

  it('systemLevel — self-optimizing process adjusts parameters', () => {
    const result = physicsMLHybridEngine.calculate('hybrid_system_level', 'self_optimizing_process', {
      currentParams: { speed_mpm: 200, feed_mmrev: 0.15, depth_mm: 2.0 },
      performance: { force_N: 1200, roughness_um: 1.8, toolWear_mm: 0.25, mrr_cm3_min: 30 },
      targets: { maxForce_N: 1000, maxRoughness_um: 1.6, maxWear_mm: 0.3 },
    });
    expect(result).toBeDefined();
  });
});
