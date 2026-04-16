/**
 * Tests for CrossDisciplinaryDeepLearningEngine
 *
 * Tests the multi-domain knowledge integration including formulas and algorithms
 * from physics, biology, finance, music theory, ecology, and more.
 */

import { describe, it, expect } from "vitest";
import {
  CrossDisciplinaryDeepLearningEngine,
  crossDisciplinaryEngine,
  type ScientificDomain,
  type CrossDomainFormula,
  type CrossDomainAlgorithm,
} from "../../engines/CrossDisciplinaryDeepLearningEngine.js";

describe("CrossDisciplinaryDeepLearningEngine", () => {
  // ==========================================================================
  // INSTANTIATION
  // ==========================================================================

  describe("instantiation", () => {
    it("should export singleton crossDisciplinaryEngine", () => {
      expect(crossDisciplinaryEngine).toBeDefined();
      expect(crossDisciplinaryEngine).toBeInstanceOf(CrossDisciplinaryDeepLearningEngine);
    });

    it("should create new instance with constructor", () => {
      const engine = new CrossDisciplinaryDeepLearningEngine();
      expect(engine).toBeInstanceOf(CrossDisciplinaryDeepLearningEngine);
    });

    it("should have loaded formulas and algorithms", () => {
      const stats = crossDisciplinaryEngine.getStats() as {
        totalFormulas: number;
        totalAlgorithms: number;
      };
      expect(stats.totalFormulas).toBeGreaterThan(0);
      expect(stats.totalAlgorithms).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // PHYSICS FORMULAS
  // ==========================================================================

  describe("physics formulas", () => {
    it("should have cutting heat generation formula", () => {
      const formula = crossDisciplinaryEngine.getFormula("thermo-heat-generation");
      expect(formula).toBeDefined();
      expect(formula?.domain).toBe("physics");
      expect(formula?.subdomain).toBe("thermodynamics");
    });

    it("should execute cutting heat generation formula", () => {
      const result = crossDisciplinaryEngine.executeFormula("thermo-heat-generation", 1000, 100, 0.9);
      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThan(0);
    });

    it("should have Reynolds number formula", () => {
      const formula = crossDisciplinaryEngine.getFormula("fluid-reynolds");
      expect(formula).toBeDefined();
      expect(formula?.subdomain).toBe("fluid_dynamics");
    });

    it("should execute Reynolds number formula", () => {
      const result = crossDisciplinaryEngine.executeFormula("fluid-reynolds", 1000, 2, 0.01, 0.001);
      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThan(0);
    });

    it("should have tool vibration modes formula", () => {
      const formula = crossDisciplinaryEngine.getFormula("wave-vibration-modes");
      expect(formula).toBeDefined();
      expect(formula?.subdomain).toBe("wave_mechanics");
    });

    it("should have quantum tunneling formula", () => {
      const formula = crossDisciplinaryEngine.getFormula("quantum-tunneling");
      expect(formula).toBeDefined();
      expect(formula?.subdomain).toBe("quantum_inspired");
    });
  });

  // ==========================================================================
  // BIOLOGY ALGORITHMS
  // ==========================================================================

  describe("biology algorithms", () => {
    it("should have genetic algorithm", () => {
      const algo = crossDisciplinaryEngine.getAlgorithm("bio-genetic-algorithm");
      expect(algo).toBeDefined();
      expect(algo?.domain).toBe("biology");
      expect(algo?.subdomain).toBe("evolution");
    });

    it("should have particle swarm optimization", () => {
      const algo = crossDisciplinaryEngine.getAlgorithm("bio-particle-swarm");
      expect(algo).toBeDefined();
      expect(algo?.subdomain).toBe("swarm_intelligence");
    });

    it("should have ant colony optimization", () => {
      const algo = crossDisciplinaryEngine.getAlgorithm("bio-ant-colony");
      expect(algo).toBeDefined();
      expect(algo?.subdomain).toBe("swarm_intelligence");
    });

    it("should execute genetic algorithm", () => {
      const result = crossDisciplinaryEngine.executeAlgorithm("bio-genetic-algorithm", {
        populationSize: 10,
        generations: 5,
        parameterRanges: {
          speed: { min: 50, max: 200 },
          feed: { min: 0.1, max: 0.5 },
        },
        fitnessFunction: (ind: Record<string, number>) => 1 / (ind.speed * ind.feed + 0.001),
      });
      expect(result).toBeDefined();
      expect((result as any).individual).toBeDefined();
    });
  });

  // ==========================================================================
  // FINANCE FORMULAS
  // ==========================================================================

  describe("finance formulas", () => {
    it("should have Black-Scholes formula", () => {
      const formula = crossDisciplinaryEngine.getFormula("finance-black-scholes");
      expect(formula).toBeDefined();
      expect(formula?.domain).toBe("finance");
      expect(formula?.subdomain).toBe("options_pricing");
    });

    it("should execute Black-Scholes formula", () => {
      const result = crossDisciplinaryEngine.executeFormula("finance-black-scholes", 100, 95, 0.05, 0.2, 1);
      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThan(0);
    });

    it("should have Value at Risk formula", () => {
      const formula = crossDisciplinaryEngine.getFormula("finance-value-at-risk");
      expect(formula).toBeDefined();
    });

    it("should have Sharpe Ratio formula", () => {
      const formula = crossDisciplinaryEngine.getFormula("finance-sharpe-ratio");
      expect(formula).toBeDefined();
    });
  });

  // ==========================================================================
  // MUSIC THEORY FORMULAS
  // ==========================================================================

  describe("music theory formulas", () => {
    it("should have harmonic series formula", () => {
      const formula = crossDisciplinaryEngine.getFormula("music-harmonics");
      expect(formula).toBeDefined();
      expect(formula?.domain).toBe("music_theory");
    });

    it("should execute harmonic series formula", () => {
      const result = crossDisciplinaryEngine.executeFormula("music-harmonics", 440, 5) as {
        harmonics: unknown[];
      };
      expect(result).toBeDefined();
      expect(result.harmonics).toHaveLength(5);
    });

    it("should have beat frequency formula", () => {
      const formula = crossDisciplinaryEngine.getFormula("music-beat-frequency");
      expect(formula).toBeDefined();
    });

    it("should execute beat frequency formula", () => {
      const result = crossDisciplinaryEngine.executeFormula("music-beat-frequency", 440, 442);
      expect(result).toBe(2);
    });

    it("should have consonance ratio formula", () => {
      const formula = crossDisciplinaryEngine.getFormula("music-consonance");
      expect(formula).toBeDefined();
    });
  });

  // ==========================================================================
  // ECOLOGY FORMULAS
  // ==========================================================================

  describe("ecology formulas", () => {
    it("should have logistic growth formula", () => {
      const formula = crossDisciplinaryEngine.getFormula("ecology-logistic-growth");
      expect(formula).toBeDefined();
      expect(formula?.domain).toBe("ecology");
    });

    it("should execute logistic growth formula", () => {
      const result = crossDisciplinaryEngine.executeFormula("ecology-logistic-growth", 10, 0.5, 100, 5);
      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThan(10);
      expect(result).toBeLessThanOrEqual(100);
    });

    it("should have Lotka-Volterra equations", () => {
      const formula = crossDisciplinaryEngine.getFormula("ecology-predator-prey");
      expect(formula).toBeDefined();
    });
  });

  // ==========================================================================
  // INFORMATION THEORY FORMULAS
  // ==========================================================================

  describe("information theory formulas", () => {
    it("should have Shannon entropy formula", () => {
      const formula = crossDisciplinaryEngine.getFormula("info-shannon-entropy");
      expect(formula).toBeDefined();
      expect(formula?.domain).toBe("information_theory");
    });

    it("should execute Shannon entropy formula", () => {
      const result = crossDisciplinaryEngine.executeFormula("info-shannon-entropy", 0.5, 0.5);
      expect(typeof result).toBe("number");
      expect(result).toBeCloseTo(1.0, 5); // Maximum entropy for 2 equally likely outcomes
    });

    it("should have mutual information formula", () => {
      const formula = crossDisciplinaryEngine.getFormula("info-mutual-information");
      expect(formula).toBeDefined();
    });
  });

  // ==========================================================================
  // STATISTICS ALGORITHMS
  // ==========================================================================

  describe("statistics algorithms", () => {
    it("should have Monte Carlo simulation", () => {
      const algo = crossDisciplinaryEngine.getAlgorithm("stats-monte-carlo");
      expect(algo).toBeDefined();
      expect(algo?.domain).toBe("statistics");
    });

    it("should have Bayesian update", () => {
      const algo = crossDisciplinaryEngine.getAlgorithm("stats-bayesian-update");
      expect(algo).toBeDefined();
    });

    it("should execute Bayesian update", () => {
      const result = crossDisciplinaryEngine.executeAlgorithm("stats-bayesian-update", {
        prior: 0.5,
        likelihood: 0.8,
        marginal: 0.6,
      });
      expect(typeof result).toBe("number");
      expect(result).toBeCloseTo(0.667, 2);
    });
  });

  // ==========================================================================
  // COMPUTER SCIENCE ALGORITHMS
  // ==========================================================================

  describe("computer science algorithms", () => {
    it("should have Voronoi algorithm", () => {
      const algo = crossDisciplinaryEngine.getAlgorithm("cs-voronoi");
      expect(algo).toBeDefined();
      expect(algo?.domain).toBe("computer_science");
    });

    it("should have A* pathfinding", () => {
      const algo = crossDisciplinaryEngine.getAlgorithm("cs-astar");
      expect(algo).toBeDefined();
    });

    it("should execute A* pathfinding", () => {
      const result = crossDisciplinaryEngine.executeAlgorithm("cs-astar", {
        start: { x: 0, y: 0 },
        goal: { x: 5, y: 5 },
        obstacles: new Set<string>(),
        gridSize: 10,
      }) as { path: unknown[]; cost: number };
      expect(result).toBeDefined();
      expect(result.path).toBeDefined();
      expect(result.cost).toBeLessThan(Infinity);
    });
  });

  // ==========================================================================
  // DEEP REASONING
  // ==========================================================================

  describe("deepReason()", () => {
    it("should reason about thermal problems", () => {
      const result = crossDisciplinaryEngine.deepReason("cutting temperature heat management");
      expect(result.relevantDomains).toContain("physics");
      expect(result.applicableFormulas.length).toBeGreaterThan(0);
    });

    it("should reason about optimization problems", () => {
      const result = crossDisciplinaryEngine.deepReason("optimize toolpath parameters");
      expect(result.applicableAlgorithms.length).toBeGreaterThan(0);
    });

    it("should reason about vibration problems", () => {
      const result = crossDisciplinaryEngine.deepReason("chatter vibration frequency");
      expect(result.relevantDomains.length).toBeGreaterThan(0);
    });

    it("should provide manufacturing insight", () => {
      const result = crossDisciplinaryEngine.deepReason("risk assessment investment");
      expect(result.manufacturingInsight).toBeDefined();
      expect(result.manufacturingInsight.length).toBeGreaterThan(0);
    });

    it("should include confidence score", () => {
      const result = crossDisciplinaryEngine.deepReason("thermal management");
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  // ==========================================================================
  // LISTING & SEARCH
  // ==========================================================================

  describe("listFormulas()", () => {
    it("should list all formulas", () => {
      const formulas = crossDisciplinaryEngine.listFormulas();
      expect(formulas.length).toBeGreaterThan(0);
    });

    it("should filter by domain", () => {
      const physicsFormulas = crossDisciplinaryEngine.listFormulas("physics");
      expect(physicsFormulas.every((f) => f.domain === "physics")).toBe(true);
    });
  });

  describe("listAlgorithms()", () => {
    it("should list all algorithms", () => {
      const algos = crossDisciplinaryEngine.listAlgorithms();
      expect(algos.length).toBeGreaterThan(0);
    });

    it("should filter by domain", () => {
      const bioAlgos = crossDisciplinaryEngine.listAlgorithms("biology");
      expect(bioAlgos.every((a) => a.domain === "biology")).toBe(true);
    });
  });

  describe("search()", () => {
    it("should find heat-related content", () => {
      const results = crossDisciplinaryEngine.search("heat");
      expect(results.formulas.length).toBeGreaterThan(0);
    });

    it("should find optimization algorithms", () => {
      const results = crossDisciplinaryEngine.search("optimization");
      expect(results.algorithms.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // LEARNING PATTERNS
  // ==========================================================================

  describe("getLearningPatterns()", () => {
    it("should return learning patterns", () => {
      const patterns = crossDisciplinaryEngine.getLearningPatterns();
      expect(patterns.length).toBeGreaterThan(0);
    });

    it("should have cross-domain mappings", () => {
      const patterns = crossDisciplinaryEngine.getLearningPatterns();
      const hasCrossDomain = patterns.some((p) => p.fromDomain !== p.toDomain);
      expect(hasCrossDomain).toBe(true);
    });
  });

  // ==========================================================================
  // STATISTICS & SUMMARY
  // ==========================================================================

  describe("getStats()", () => {
    it("should return statistics", () => {
      const stats = crossDisciplinaryEngine.getStats() as {
        totalFormulas: number;
        totalAlgorithms: number;
        totalLearningPatterns: number;
        domains: string[];
      };
      expect(stats.totalFormulas).toBeGreaterThan(0);
      expect(stats.totalAlgorithms).toBeGreaterThan(0);
      expect(stats.domains.length).toBeGreaterThan(0);
    });

    it("should have formulas by domain breakdown", () => {
      const stats = crossDisciplinaryEngine.getStats() as {
        formulasByDomain: Record<string, number>;
      };
      expect(Object.keys(stats.formulasByDomain).length).toBeGreaterThan(0);
    });
  });

  describe("getSummary()", () => {
    it("should return formatted summary", () => {
      const summary = crossDisciplinaryEngine.getSummary();
      expect(summary).toContain("CrossDisciplinaryDeepLearningEngine");
      expect(summary).toContain("Formulas:");
      expect(summary).toContain("Algorithms:");
    });
  });

  // ==========================================================================
  // CONTROL THEORY ALGORITHMS (MIT 2.004)
  // ==========================================================================

  describe("control theory algorithms", () => {
    it("should have PID controller algorithm", () => {
      const algo = crossDisciplinaryEngine.getAlgorithm("control-pid");
      expect(algo).toBeDefined();
      expect(algo?.subdomain).toBe("control_systems");
    });

    it("should execute PID controller", () => {
      const result = crossDisciplinaryEngine.executeAlgorithm("control-pid", {
        Kp: 1.0,
        Ki: 0.1,
        Kd: 0.05,
        setpoint: 100,
        measured: 95,
        dt: 0.01,
      }) as { output: number; error: number };
      expect(result).toBeDefined();
      expect(result.error).toBe(5);
      expect(result.output).toBeGreaterThan(0);
    });

    it("should have LQR algorithm", () => {
      const algo = crossDisciplinaryEngine.getAlgorithm("control-lqr");
      expect(algo).toBeDefined();
      expect(algo?.subdomain).toBe("optimal_control");
    });

    it("should have Kalman filter algorithm", () => {
      const algo = crossDisciplinaryEngine.getAlgorithm("control-kalman");
      expect(algo).toBeDefined();
      expect(algo?.subdomain).toBe("state_estimation");
    });
  });

  // ==========================================================================
  // MATERIALS SCIENCE FORMULAS (MIT 3.22)
  // ==========================================================================

  describe("materials science formulas", () => {
    it("should have Johnson-Cook formula", () => {
      const formula = crossDisciplinaryEngine.getFormula("mat-johnson-cook");
      expect(formula).toBeDefined();
      expect(formula?.subdomain).toBe("constitutive_models");
    });

    it("should execute Johnson-Cook flow stress", () => {
      // AISI 4340 steel: A=792, B=510, n=0.26, C=0.014, m=1.03
      const result = crossDisciplinaryEngine.executeFormula(
        "mat-johnson-cook",
        0.1,  // strain
        1000, // strain rate
        500,  // temperature K
        792,  // A
        510,  // B
        0.26, // n
        0.014, // C
        1.03  // m
      ) as number;
      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThan(0);
    });

    it("should have extended Taylor tool life", () => {
      const formula = crossDisciplinaryEngine.getFormula("mat-taylor-toollife");
      expect(formula).toBeDefined();
    });

    it("should have Kienzle specific cutting force", () => {
      const formula = crossDisciplinaryEngine.getFormula("mat-specific-cutting-force");
      expect(formula).toBeDefined();
    });

    it("should execute Kienzle formula", () => {
      // Steel: Kc1.1=1800, mc=0.24, h=0.1mm
      const result = crossDisciplinaryEngine.executeFormula("mat-specific-cutting-force", 1800, 0.1, 0.24) as number;
      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThan(1800); // Should be higher due to size effect
    });
  });

  // ==========================================================================
  // GEOMETRIC ALGORITHMS (Stanford CS348A)
  // ==========================================================================

  describe("geometric algorithms", () => {
    it("should have NURBS evaluation algorithm", () => {
      const algo = crossDisciplinaryEngine.getAlgorithm("geo-nurbs-eval");
      expect(algo).toBeDefined();
      expect(algo?.subdomain).toBe("cad_geometry");
    });

    it("should have Bezier evaluation algorithm", () => {
      const algo = crossDisciplinaryEngine.getAlgorithm("geo-bezier");
      expect(algo).toBeDefined();
    });

    it("should execute Bezier evaluation", () => {
      const result = crossDisciplinaryEngine.executeAlgorithm("geo-bezier", {
        controlPoints: [
          { x: 0, y: 0 },
          { x: 1, y: 2 },
          { x: 2, y: 2 },
          { x: 3, y: 0 },
        ],
        t: 0.5,
      }) as { x: number; y: number };
      expect(result).toBeDefined();
      expect(result.x).toBeCloseTo(1.5, 1);
    });

    it("should have Laplacian smoothing algorithm", () => {
      const algo = crossDisciplinaryEngine.getAlgorithm("geo-laplacian-smooth");
      expect(algo).toBeDefined();
      expect(algo?.subdomain).toBe("mesh_processing");
    });
  });

  // ==========================================================================
  // ROBOTICS ALGORITHMS (Stanford CS223A)
  // ==========================================================================

  describe("robotics algorithms", () => {
    it("should have forward kinematics algorithm", () => {
      const algo = crossDisciplinaryEngine.getAlgorithm("robot-forward-kinematics");
      expect(algo).toBeDefined();
      expect(algo?.subdomain).toBe("kinematics");
    });

    it("should execute forward kinematics", () => {
      const result = crossDisciplinaryEngine.executeAlgorithm("robot-forward-kinematics", {
        dhParams: [
          { theta: 0, d: 100, a: 0, alpha: Math.PI / 2 },
          { theta: 0, d: 0, a: 100, alpha: 0 },
        ],
      }) as { position: { x: number; y: number; z: number } };
      expect(result).toBeDefined();
      expect(result.position).toBeDefined();
    });

    it("should have RTCP algorithm", () => {
      const algo = crossDisciplinaryEngine.getAlgorithm("robot-rtcp");
      expect(algo).toBeDefined();
    });

    it("should have S-curve motion profile algorithm", () => {
      const algo = crossDisciplinaryEngine.getAlgorithm("robot-scurve");
      expect(algo).toBeDefined();
      expect(algo?.subdomain).toBe("motion_planning");
    });

    it("should execute S-curve motion profile", () => {
      const result = crossDisciplinaryEngine.executeAlgorithm("robot-scurve", {
        distance: 100,
        vMax: 10,
        aMax: 5,
        jMax: 10,
      }) as { type: string; totalTime: number };
      expect(result).toBeDefined();
      expect(result.type).toBeDefined();
      expect(result.totalTime).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // MACHINE LEARNING ALGORITHMS (Stanford CS229)
  // ==========================================================================

  describe("machine learning algorithms", () => {
    it("should have linear regression algorithm", () => {
      const algo = crossDisciplinaryEngine.getAlgorithm("ml-linear-regression");
      expect(algo).toBeDefined();
      expect(algo?.subdomain).toBe("regression");
    });

    it("should have K-means clustering algorithm", () => {
      const algo = crossDisciplinaryEngine.getAlgorithm("ml-kmeans");
      expect(algo).toBeDefined();
      expect(algo?.subdomain).toBe("clustering");
    });

    it("should execute K-means clustering", () => {
      const result = crossDisciplinaryEngine.executeAlgorithm("ml-kmeans", {
        X: [[1, 1], [1.5, 2], [3, 4], [5, 7], [3.5, 5], [4.5, 5]],
        k: 2,
      }) as { centroids: number[][]; labels: number[] };
      expect(result).toBeDefined();
      expect(result.centroids).toHaveLength(2);
      expect(result.labels).toHaveLength(6);
    });

    it("should have CNN convolution algorithm", () => {
      const algo = crossDisciplinaryEngine.getAlgorithm("ml-cnn-conv2d");
      expect(algo).toBeDefined();
      expect(algo?.subdomain).toBe("deep_learning");
    });

    it("should execute 2D convolution", () => {
      const result = crossDisciplinaryEngine.executeAlgorithm("ml-cnn-conv2d", {
        input: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
        kernel: [[1, 0], [0, 1]],
      }) as number[][];
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(result[0].length).toBe(2);
    });
  });

  // ==========================================================================
  // PRECISION ENGINEERING FORMULAS (MIT 2.75)
  // ==========================================================================

  describe("precision engineering formulas", () => {
    it("should have error budget RSS formula", () => {
      const formula = crossDisciplinaryEngine.getFormula("precision-error-budget");
      expect(formula).toBeDefined();
      expect(formula?.subdomain).toBe("precision_engineering");
    });

    it("should execute error budget RSS", () => {
      const result = crossDisciplinaryEngine.executeFormula("precision-error-budget", 0.003, 0.004, 0.005) as number;
      expect(typeof result).toBe("number");
      expect(result).toBeCloseTo(Math.sqrt(0.003**2 + 0.004**2 + 0.005**2), 5);
    });

    it("should have thermal expansion formula", () => {
      const formula = crossDisciplinaryEngine.getFormula("precision-thermal-expansion");
      expect(formula).toBeDefined();
    });

    it("should execute thermal expansion compensation", () => {
      // Steel: α=11.7e-6, L=100mm, ΔT=10°C
      const result = crossDisciplinaryEngine.executeFormula("precision-thermal-expansion", 11.7e-6, 100, 10) as { expansion: number; compensation: number };
      expect(result).toBeDefined();
      expect(result.expansion).toBeCloseTo(0.0117, 4);
      expect(result.compensation).toBeCloseTo(-0.0117, 4);
    });

    it("should have Abbe error formula", () => {
      const formula = crossDisciplinaryEngine.getFormula("precision-abbe-error");
      expect(formula).toBeDefined();
      expect(formula?.subdomain).toBe("metrology");
    });

    it("should have Merchant shear plane formula", () => {
      const formula = crossDisciplinaryEngine.getFormula("precision-merchant-shear");
      expect(formula).toBeDefined();
    });
  });

  // ==========================================================================
  // EXPANDED LEARNING PATTERNS
  // ==========================================================================

  describe("expanded learning patterns", () => {
    it("should have control theory to machining pattern", () => {
      const patterns = crossDisciplinaryEngine.getLearningPatterns();
      const controlPattern = patterns.find(p => p.id === "control-to-machining");
      expect(controlPattern).toBeDefined();
    });

    it("should have geometry to CAM pattern", () => {
      const patterns = crossDisciplinaryEngine.getLearningPatterns();
      const geoPattern = patterns.find(p => p.id === "geometry-to-cam");
      expect(geoPattern).toBeDefined();
    });

    it("should have ML to prediction pattern", () => {
      const patterns = crossDisciplinaryEngine.getLearningPatterns();
      const mlPattern = patterns.find(p => p.id === "ml-to-prediction");
      expect(mlPattern).toBeDefined();
    });

    it("should have materials to forces pattern", () => {
      const patterns = crossDisciplinaryEngine.getLearningPatterns();
      const matPattern = patterns.find(p => p.id === "materials-to-forces");
      expect(matPattern).toBeDefined();
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  describe("error handling", () => {
    it("should return null for unknown formula", () => {
      const formula = crossDisciplinaryEngine.getFormula("unknown-id");
      expect(formula).toBeUndefined();
    });

    it("should return null for unknown algorithm", () => {
      const algo = crossDisciplinaryEngine.getAlgorithm("unknown-id");
      expect(algo).toBeUndefined();
    });

    it("should return null when executing unknown formula", () => {
      const result = crossDisciplinaryEngine.executeFormula("unknown-id", 1, 2, 3);
      expect(result).toBeNull();
    });

    it("should return null when executing unknown algorithm", () => {
      const result = crossDisciplinaryEngine.executeAlgorithm("unknown-id", {});
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // TYPE SAFETY
  // ==========================================================================

  describe("type definitions", () => {
    it("should have ScientificDomain type", () => {
      const domains: ScientificDomain[] = [
        "physics",
        "biology",
        "finance",
        "music_theory",
        "ecology",
      ];
      expect(domains).toHaveLength(5);
    });

    it("should have CrossDomainFormula type", () => {
      const formula: CrossDomainFormula = {
        id: "test",
        domain: "physics",
        subdomain: "test",
        name: "Test",
        description: "Test formula",
        formula: "x = y",
        variables: [],
        implementation: () => 0,
        manufacturingApplication: "Test",
        confidence: 0.9,
        source: "test",
      };
      expect(formula.id).toBe("test");
    });

    it("should have CrossDomainAlgorithm type", () => {
      const algo: CrossDomainAlgorithm = {
        id: "test",
        domain: "biology",
        subdomain: "test",
        name: "Test",
        description: "Test algorithm",
        complexity: { time: "O(n)", space: "O(1)" },
        implementation: () => null,
        manufacturingApplication: "Test",
        source: "test",
      };
      expect(algo.id).toBe("test");
    });
  });
});
