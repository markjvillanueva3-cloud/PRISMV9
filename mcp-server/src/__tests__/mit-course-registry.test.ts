/**
 * MIT Course Registry Engine Tests
 * PDF-EXT-MS2: Tests against REAL MIT course data in Resources folder
 *
 * These tests validate against actual ALGORITHM_REGISTRY.json, MIT_COURSE_INDEX.json,
 * and PRISM_COURSE_CATALOG.json files in H:/prism/resources/MIT COURSES/
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  MITCourseRegistryEngine,
  mitCourseRegistryEngine,
} from "../engines/MITCourseRegistryEngine.js";

// ============================================================================
// Real Data Tests - Validate against actual MIT course content
// ============================================================================

describe("MITCourseRegistryEngine", () => {
  beforeAll(async () => {
    await mitCourseRegistryEngine.init();
  });

  describe("Algorithm Registry (285 algorithms)", () => {
    it("should load algorithm registry with correct total count", () => {
      const stats = mitCourseRegistryEngine.getStats();
      // ALGORITHM_REGISTRY.json specifies 285 algorithms
      expect(stats.totalAlgorithms).toBe(285);
    });

    it("should have 87.8% PRISM engine coverage", () => {
      const stats = mitCourseRegistryEngine.getStats();
      // Coverage stats from ALGORITHM_REGISTRY.json
      expect(stats.coverage.totalPrismEngines).toBe(213);
      expect(stats.coverage.enginesMapped).toBe(187);
      expect(stats.coverage.coveragePercent).toBeCloseTo(87.8, 1);
    });

    it("should map Kienzle Force Model to correct PRISM engines", () => {
      const algos = mitCourseRegistryEngine.searchAlgorithms("Kienzle");
      expect(algos.length).toBeGreaterThan(0);

      const kienzle = algos.find((a) => a.name === "Kienzle Force Model");
      expect(kienzle).toBeDefined();
      expect(kienzle?.course).toBe("2.810");
      expect(kienzle?.prismEngines).toContain("PRISM_KIENZLE_FORCE");
      expect(kienzle?.prismEngines).toContain("PRISM_FORCE_CALCULATOR");
    });

    it("should map Taylor Tool Life to correct PRISM engines", () => {
      const algos = mitCourseRegistryEngine.searchAlgorithms("Taylor Tool Life");
      expect(algos.length).toBeGreaterThan(0);

      const taylor = algos.find((a) => a.name === "Taylor Tool Life");
      expect(taylor).toBeDefined();
      expect(taylor?.course).toBe("2.810");
      expect(taylor?.prismEngines).toContain("PRISM_TAYLOR_TOOL_LIFE");
      expect(taylor?.prismEngines).toContain("PRISM_TOOL_LIFE_ENGINE");
    });

    it("should map Stability Lobe Diagram to chatter engines", () => {
      const algos = mitCourseRegistryEngine.searchAlgorithms("Stability Lobe");
      expect(algos.length).toBeGreaterThan(0);

      const sld = algos.find((a) => a.name === "Stability Lobe Diagram");
      expect(sld).toBeDefined();
      expect(sld?.course).toBe("2.032");
      expect(sld?.prismEngines).toContain("PRISM_STABILITY_LOBES");
      expect(sld?.prismEngines).toContain("PRISM_CHATTER_PREDICTION_ENGINE");
    });

    it("should have optimization algorithms from MIT 6.079", () => {
      const algos = mitCourseRegistryEngine.getAlgorithmsByCourse("6.079");
      expect(algos.length).toBeGreaterThan(0);

      const names = algos.map((a) => a.name);
      expect(names).toContain("Gradient Descent");
      expect(names).toContain("Interior Point Method");
    });

    it("should have machine learning algorithms from MIT 6.867", () => {
      const algos = mitCourseRegistryEngine.getAlgorithmsByCourse("6.867");
      expect(algos.length).toBeGreaterThan(10); // 6.867 has many ML algorithms

      const names = algos.map((a) => a.name);
      expect(names).toContain("Linear Regression");
      expect(names).toContain("SVM");
      expect(names).toContain("Random Forest");
      expect(names).toContain("LSTM");
    });
  });

  describe("Course Index (225 courses)", () => {
    it("should load course index with correct total", () => {
      const stats = mitCourseRegistryEngine.getStats();
      expect(stats.totalCourses).toBe(225);
    });

    it("should have manufacturing category with relevant courses", () => {
      const mfgCourses = mitCourseRegistryEngine.getManufacturingCourses();
      expect(mfgCourses.length).toBeGreaterThan(0);

      const courseIds = mfgCourses.map((c) => c.id);
      expect(courseIds).toContain("2.810"); // Manufacturing Processes
      expect(courseIds).toContain("2.830"); // Control of Manufacturing
    });

    it("should have TIER_1 priority categories", () => {
      const categories = mitCourseRegistryEngine.getCategories();
      const tier1 = categories.filter((c) => c.priority === "TIER_1");

      expect(tier1.length).toBeGreaterThan(0);

      const tier1Names = tier1.map((c) => c.name);
      expect(tier1Names).toContain("manufacturing");
      expect(tier1Names).toContain("algorithms");
      expect(tier1Names).toContain("optimization");
      expect(tier1Names).toContain("machine_learning");
    });

    it("should return algorithms category with graph algorithms", () => {
      const algoCourses = mitCourseRegistryEngine.getCoursesByCategory("algorithms");
      expect(algoCourses.length).toBeGreaterThan(0);

      const courseIds = algoCourses.map((c) => c.id);
      expect(courseIds).toContain("6.046J"); // Design and Analysis of Algorithms
    });
  });

  describe("PRISM Course Catalog (92 courses scanned)", () => {
    it("should have extracted courses available", () => {
      const stats = mitCourseRegistryEngine.getStats();
      expect(stats.extractedCourses).toBeGreaterThan(0);
    });

    it("should have extracted 10.34 course", () => {
      const extracted = mitCourseRegistryEngine.getExtractedCourses();
      const course1034 = extracted.find((c) => c.courseId === "10.34-fall-2015");
      expect(course1034).toBeDefined();
      expect(course1034?.type).toBe("extracted");
      expect(course1034?.hasContent).toBe(true);
    });

    it("should have extracted 6.046j course", () => {
      const extracted = mitCourseRegistryEngine.getExtractedCourses();
      const course6046 = extracted.find((c) => c.courseId === "6.046j-spring-2015");
      expect(course6046).toBeDefined();
      expect(course6046?.type).toBe("extracted");
    });
  });

  describe("Engine-to-Algorithm Mapping", () => {
    it("should find algorithms for PRISM_KIENZLE_FORCE", () => {
      const mapping = mitCourseRegistryEngine.getAlgorithmsForEngine("PRISM_KIENZLE_FORCE");
      expect(mapping.algorithms.length).toBeGreaterThan(0);
      expect(mapping.algorithms[0].name).toBe("Kienzle Force Model");
      expect(mapping.algorithms[0].course).toBe("2.810");
    });

    it("should find algorithms for PRISM_TOOLPATH_OPTIMIZER", () => {
      const mapping = mitCourseRegistryEngine.getAlgorithmsForEngine("PRISM_TOOLPATH_OPTIMIZER");
      expect(mapping.algorithms.length).toBeGreaterThan(0);

      const names = mapping.algorithms.map((a) => a.name);
      expect(names).toContain("Dijkstra");
      expect(names).toContain("A*");
    });

    it("should find algorithms for PRISM_SCHEDULING_ENGINE", () => {
      const mapping = mitCourseRegistryEngine.getAlgorithmsForEngine("PRISM_SCHEDULING_ENGINE");
      expect(mapping.algorithms.length).toBeGreaterThan(0);

      const names = mapping.algorithms.map((a) => a.name);
      // Network optimization algorithms
      expect(names).toContain("Max Flow (Ford-Fulkerson)");
    });

    it("should find algorithms for PRISM_DEFLECTION_ENGINE", () => {
      const mapping = mitCourseRegistryEngine.getAlgorithmsForEngine("PRISM_DEFLECTION_ENGINE");
      expect(mapping.algorithms.length).toBeGreaterThan(0);

      const names = mapping.algorithms.map((a) => a.name);
      expect(names).toContain("Deflection Analysis");
      expect(names).toContain("LU Decomposition");
    });

    it("should find neural network algorithms for PRISM_NEURAL_NETWORK", () => {
      const mapping = mitCourseRegistryEngine.getAlgorithmsForEngine("PRISM_NEURAL_NETWORK");
      expect(mapping.algorithms.length).toBeGreaterThan(0);

      const names = mapping.algorithms.map((a) => a.name);
      expect(names).toContain("Feedforward NN");
    });
  });

  describe("Course Data Loading (Real Files)", () => {
    it("should load 10.34 course data.json", async () => {
      const data = await mitCourseRegistryEngine.loadCourseData("10.34-fall-2015");
      expect(data).not.toBeNull();

      expect(data?.title).toBe("Numerical Methods Applied to Chemical Engineering");
      expect(data?.term).toBe("Fall");
      expect(data?.year).toBe("2015");
      expect(data?.level).toContain("Graduate");
      expect(data?.instructors).toBeDefined();
      expect(data?.instructors?.length).toBeGreaterThan(0);
      expect(data?.instructors?.[0].last_name).toBe("Green");
    });

    it("should load 10.34 content map", async () => {
      const contentMap = await mitCourseRegistryEngine.loadContentMap("10.34-fall-2015");
      expect(contentMap).not.toBeNull();
      expect(contentMap?.size).toBeGreaterThan(50); // 10.34 has 74+ PDFs

      // Check for specific resource types
      const values = Array.from(contentMap?.values() ?? []);
      const hasLectures = values.some((v) => v.includes("lec"));
      const hasAssignments = values.some((v) => v.includes("hw") || v.includes("assignment"));
      expect(hasLectures).toBe(true);
      expect(hasAssignments).toBe(true);
    });
  });

  describe("PRISM Engine Mapping", () => {
    it("should map Force_Calculator to course 2.810", () => {
      const courses = mitCourseRegistryEngine.getCoursesForPrismEngine("Force_Calculator");
      expect(courses).toContain("2.810");
      expect(courses).toContain("2.003");
      expect(courses).toContain("3.11");
    });

    it("should map Chatter_Prediction to course 2.032", () => {
      const courses = mitCourseRegistryEngine.getCoursesForPrismEngine("Chatter_Prediction");
      expect(courses).toContain("2.032");
      expect(courses).toContain("6.011");
      expect(courses).toContain("2.004");
    });

    it("should map Scheduling_Engine to multiple courses", () => {
      const courses = mitCourseRegistryEngine.getCoursesForPrismEngine("Scheduling_Engine");
      expect(courses).toContain("2.854");
      expect(courses).toContain("15.083J");
      expect(courses).toContain("6.046J");
    });
  });

  describe("Algorithm Search", () => {
    it("should find FFT algorithms", () => {
      const results = mitCourseRegistryEngine.searchAlgorithms("FFT");
      expect(results.length).toBeGreaterThan(0);

      const fft = results.find((a) => a.name === "FFT");
      expect(fft).toBeDefined();
      expect(fft?.course).toBe("6.011");
      expect(fft?.prismEngines).toContain("PRISM_FFT_PREDICTIVE_CHATTER");
    });

    it("should find Kalman Filter", () => {
      const results = mitCourseRegistryEngine.searchAlgorithms("Kalman");
      expect(results.length).toBeGreaterThan(0);

      const kalman = results.find((a) => a.name === "Kalman Filter");
      expect(kalman).toBeDefined();
      expect(kalman?.prismEngines).toContain("PRISM_KALMAN_FILTER");
    });

    it("should find Newton-Raphson", () => {
      const results = mitCourseRegistryEngine.searchAlgorithms("Newton");
      expect(results.length).toBeGreaterThan(0);

      const names = results.map((a) => a.name);
      expect(names).toContain("Newton-Raphson");
      expect(names).toContain("Newton's Method");
    });

    it("should find all mesh-related algorithms", () => {
      const results = mitCourseRegistryEngine.searchAlgorithms("Mesh");
      expect(results.length).toBeGreaterThan(0);

      const names = results.map((a) => a.name);
      expect(names).toContain("Mesh Boolean");
      expect(names).toContain("Mesh Decimation");
    });
  });

  describe("Manufacturing Algorithm Coverage", () => {
    it("should have comprehensive 2.810 course algorithms", () => {
      const algos = mitCourseRegistryEngine.getAlgorithmsByCourse("2.810");
      expect(algos.length).toBeGreaterThan(5);

      const names = algos.map((a) => a.name);
      // Core cutting mechanics
      expect(names).toContain("Kienzle Force Model");
      expect(names).toContain("Merchant Force Model");
      expect(names).toContain("Taylor Tool Life");
      expect(names).toContain("Johnson-Cook Model");
      expect(names).toContain("Chip Formation Model");
      // Wear models
      expect(names).toContain("Flank Wear Model");
      expect(names).toContain("Crater Wear Model");
    });

    it("should have dynamics algorithms from 2.032", () => {
      const algos = mitCourseRegistryEngine.getAlgorithmsByCourse("2.032");
      expect(algos.length).toBeGreaterThan(0);

      const names = algos.map((a) => a.name);
      expect(names).toContain("Stability Lobe Diagram");
      expect(names).toContain("Modal Analysis");
      expect(names).toContain("Regenerative Chatter");
      expect(names).toContain("Rigid Body Dynamics");
    });

    it("should report manufacturing algorithm count", () => {
      const stats = mitCourseRegistryEngine.getStats();
      // 2.810, 2.003, 2.032, 2.830 combined should have many algorithms
      expect(stats.manufacturingAlgorithms).toBeGreaterThan(10);
    });
  });

  describe("All Mapped Engines", () => {
    it("should return sorted list of all PRISM engines", () => {
      const engines = mitCourseRegistryEngine.getAllMappedEngines();
      expect(engines.length).toBeGreaterThan(100);

      // Should include key PRISM engines
      expect(engines).toContain("PRISM_KIENZLE_FORCE");
      expect(engines).toContain("PRISM_TAYLOR_TOOL_LIFE");
      expect(engines).toContain("PRISM_STABILITY_LOBES");
      expect(engines).toContain("PRISM_COLLISION_ENGINE");
      expect(engines).toContain("PRISM_SCHEDULING_ENGINE");
      expect(engines).toContain("PRISM_NEURAL_NETWORK");

      // Should be sorted
      expect(engines).toEqual([...engines].sort());
    });
  });

  describe("Knowledge Report Generation", () => {
    it("should generate knowledge report for PRISM_KIENZLE_FORCE", () => {
      const report = mitCourseRegistryEngine.generateEngineKnowledgeReport("PRISM_KIENZLE_FORCE");
      expect(report).toContain("# Knowledge Augmentation Report: PRISM_KIENZLE_FORCE");
      expect(report).toContain("Kienzle Force Model");
      expect(report).toContain("MIT 2.810");
    });

    it("should generate knowledge report for PRISM_TOOLPATH_OPTIMIZER", () => {
      const report = mitCourseRegistryEngine.generateEngineKnowledgeReport("PRISM_TOOLPATH_OPTIMIZER");
      expect(report).toContain("Dijkstra");
      expect(report).toContain("A*");
      expect(report).toContain("6.046J");
    });

    it("should return empty message for unmapped engine", () => {
      const report = mitCourseRegistryEngine.generateEngineKnowledgeReport("PRISM_NONEXISTENT_ENGINE");
      expect(report).toContain("No academic algorithms mapped");
    });
  });
});

// ============================================================================
// Standalone Instance Tests
// ============================================================================

describe("MITCourseRegistryEngine - Standalone Instance", () => {
  it("should work with custom resources path", async () => {
    const engine = new MITCourseRegistryEngine("H:/prism/resources/MIT COURSES");
    await engine.init();

    const stats = engine.getStats();
    expect(stats.totalAlgorithms).toBe(285);
  });

  it("should handle missing files gracefully", async () => {
    const engine = new MITCourseRegistryEngine("/nonexistent/path");
    await engine.init();

    const stats = engine.getStats();
    expect(stats.totalAlgorithms).toBe(0);
    expect(stats.totalCourses).toBe(0);
  });
});
