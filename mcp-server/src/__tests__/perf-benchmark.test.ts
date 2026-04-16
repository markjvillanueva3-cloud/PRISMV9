/**
 * Performance benchmarks for registry lookups, engine calculations, and memory.
 * Run: npx vitest run perf-benchmark
 */
import { describe, it, expect } from "vitest";
import { registryManager } from "../registries/manager.js";
import { calculateKienzleCuttingForce } from "../engines/ManufacturingCalculations.js";

describe("Performance Benchmarks", () => {
  it("registry initialization time", async () => {
    const start = performance.now();
    await registryManager.initialize();
    const elapsed = performance.now() - start;
    console.log(`Registry init: ${elapsed.toFixed(0)}ms`);
    console.log(`Total entries: ${registryManager.getTotalEntries()}`);
    expect(elapsed).toBeLessThan(15000); // Allow headroom under system load
  });

  it("material lookup x1000", async () => {
    await registryManager.initialize();
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      registryManager.materials.get("AISI 4140");
    }
    const elapsed = performance.now() - start;
    console.log(`Material lookup x1000: ${elapsed.toFixed(2)}ms (${(elapsed/1000).toFixed(4)}ms avg)`);
    expect(elapsed).toBeLessThan(1000);
  });

  it("material search x100", async () => {
    await registryManager.initialize();
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      registryManager.materials.search("titanium");
    }
    const elapsed = performance.now() - start;
    console.log(`Material search x100: ${elapsed.toFixed(2)}ms (${(elapsed/100).toFixed(2)}ms avg)`);
    expect(elapsed).toBeLessThan(5000);
  });

  it("tool lookup x1000", async () => {
    await registryManager.initialize();
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      registryManager.tools.get("CNMG120408");
    }
    const elapsed = performance.now() - start;
    console.log(`Tool lookup x1000: ${elapsed.toFixed(2)}ms (${(elapsed/1000).toFixed(4)}ms avg)`);
    expect(elapsed).toBeLessThan(1000);
  });

  it("formula lookup x1000", async () => {
    await registryManager.initialize();
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      registryManager.formulas.get("kienzle_cutting_force");
    }
    const elapsed = performance.now() - start;
    console.log(`Formula lookup x1000: ${elapsed.toFixed(2)}ms (${(elapsed/1000).toFixed(4)}ms avg)`);
    expect(elapsed).toBeLessThan(1000);
  });

  it("Kienzle cutting force x1000", () => {
    const conditions = {
      cutting_speed: 200,
      feed_per_tooth: 0.25,
      axial_depth: 2.0,
      radial_depth: 10.0,
      tool_diameter: 50,
      number_of_teeth: 4,
    };
    const coefficients = { kc1_1: 1500, mc: 0.26 };
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      calculateKienzleCuttingForce(conditions, coefficients);
    }
    const elapsed = performance.now() - start;
    console.log(`Kienzle force x1000: ${elapsed.toFixed(2)}ms (${(elapsed/1000).toFixed(4)}ms avg)`);
    expect(elapsed).toBeLessThan(500);
  });

  it("memory usage snapshot", async () => {
    await registryManager.initialize();
    // Wait briefly for secondary registries (parallelized, typically <500ms)
    await new Promise(resolve => setTimeout(resolve, 500));
    const mem = process.memoryUsage();
    console.log(`RSS: ${(mem.rss / 1024 / 1024).toFixed(1)}MB`);
    console.log(`Heap used: ${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB`);
    console.log(`Heap total: ${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB`);
    console.log(`External: ${(mem.external / 1024 / 1024).toFixed(1)}MB`);
    expect(mem.heapUsed).toBeLessThan(512 * 1024 * 1024); // <512MB
  });
});
