/**
 * PRISM Boot Smoke Tests
 * ======================
 * Runs 5 canary tests at startup to detect broken subsystems.
 * Calls engine functions directly (not dispatchers) to avoid cadence side effects.
 *
 * @version 1.2.0 — H1-MS3
 */

import { log } from "./Logger.js";

interface SmokeResult {
  passed: number;
  failed: number;
  total_ms: number;
  failures: Array<{ test: string; error: string }>;
}

/** Runs smoke tests.
 * @returns promise< smoke result>
 */
export async function runSmokeTests(): Promise<SmokeResult> {
  const start = Date.now();
  const failures: Array<{ test: string; error: string }> = [];
  let passed = 0;

  // Test 1: Material registry
  try {
    const { materialRegistry } = await import("../registries/MaterialRegistry.js");
    const mat = await materialRegistry.get("AS-4140-ANNEALED");
    if (mat && Object.keys(mat).length >= 10) { passed++; }
    else { failures.push({ test: "material_get", error: `Got ${Object.keys(mat || {}).length} params, expected ≥10` }); }
  } catch (e: any) {
    failures.push({ test: "material_get", error: e.message?.slice(0, 100) || "unknown" });
  }

  // Test 2: Speed/Feed calculation
  try {
    const { calculateSpeedFeed } = await import("../engines/ManufacturingCalculations.js");
    const result = calculateSpeedFeed({
      tool_material: "Carbide",
      operation: "roughing",
      tool_diameter: 12,
      number_of_teeth: 4
    });
    if (result && result.cutting_speed > 0) { passed++; }
    else { failures.push({ test: "speed_feed", error: "No valid speed/feed result" }); }
  } catch (e: any) {
    failures.push({ test: "speed_feed", error: e.message?.slice(0, 100) || "unknown" });
  }

  // Test 3: Thread calculation
  try {
    const { ThreadCalculationEngine } = await import("../engines/ThreadCalculationEngine.js");
    const engine = new ThreadCalculationEngine();
    const result = engine.calculateTapDrill("M10x1.5");
    if (result && result.tapDrillMM > 0) { passed++; }
    else { failures.push({ test: "thread_calc", error: "tapDrillMM ≤ 0 or missing" }); }
  } catch (e: any) {
    failures.push({ test: "thread_calc", error: e.message?.slice(0, 100) || "unknown" });
  }

  // Test 4: Toolpath strategy
  try {
    const { ToolpathGenerationEngine } = await import("../engines/ToolpathGenerationEngine.js");
    const engine = new ToolpathGenerationEngine();
    const result = engine.selectStrategy("pocket");
    if (result && (result.strategy || (result as any).strategy_id || (result as any).name)) { passed++; }
    else { failures.push({ test: "toolpath_select", error: "No strategy returned" }); }
  } catch (e: any) {
    failures.push({ test: "toolpath_select", error: e.message?.slice(0, 100) || "unknown" });
  }

  // Test 5: Knowledge stats
  try {
    const { KnowledgeQueryEngine } = await import("../engines/KnowledgeQueryEngine.js");
    const engine = new KnowledgeQueryEngine();
    const stats = await engine.getStats();
    const total = stats?.total_entries || (stats as any)?.total || 0;
    if (total > 1000) { passed++; }
    else { failures.push({ test: "knowledge_stats", error: `total=${total}, expected >1000` }); }
  } catch (e: any) {
    failures.push({ test: "knowledge_stats", error: e.message?.slice(0, 100) || "unknown" });
  }

  const total_ms = Date.now() - start;
  const result: SmokeResult = { passed, failed: failures.length, total_ms, failures };

  if (failures.length === 0) {
    log.info(`[SMOKE] ${passed}/5 passed (${total_ms}ms)`);
  } else {
    log.warn(`[SMOKE] ${passed}/5 passed, ${failures.length} FAILED (${total_ms}ms): ${failures.map(f => f.test).join(", ")}`);
    for (const f of failures) {
      log.warn(`[SMOKE]   ✗ ${f.test}: ${f.error}`);
    }
  }

  return result;
}
