/**
 * PRISM Boot Smoke Tests
 * ======================
 * Runs 5 canary tests at startup to detect broken subsystems.
 * Calls engine functions directly (not dispatchers) to avoid cadence side effects.
 * 
 * @version 1.0.0 — H1-MS3
 */

import { log } from "./Logger.js";

interface SmokeResult {
  passed: number;
  failed: number;
  total_ms: number;
  failures: Array<{ test: string; error: string }>;
}

export async function runSmokeTests(): Promise<SmokeResult> {
  const start = Date.now();
  const failures: Array<{ test: string; error: string }> = [];
  let passed = 0;

  // Test 1: Material registry
  try {
    const { materialRegistry } = await import("../registries/MaterialRegistry.js");
    const mat = materialRegistry.get("AS-4140-ANNEALED");
    if (mat && Object.keys(mat).length >= 50) { passed++; }
    else { failures.push({ test: "material_get", error: `Got ${Object.keys(mat || {}).length} params, expected ≥50` }); }
  } catch (e: any) {
    failures.push({ test: "material_get", error: e.message?.slice(0, 100) || "unknown" });
  }

  // Test 2: Speed/Feed calculation
  try {
    const { SpeedFeedEngine } = await import("../engines/SpeedFeedEngine.js");
    const engine = new SpeedFeedEngine();
    const result = engine.calculate({
      material: "4140",
      operation: "milling",
      tool_diameter: 12,
      tool_type: "endmill",
      num_flutes: 4
    });
    if (result && (result.cutting_speed > 0 || result.Vc > 0)) { passed++; }
    else { failures.push({ test: "speed_feed", error: "Vc ≤ 0 or missing" }); }
  } catch (e: any) {
    failures.push({ test: "speed_feed", error: e.message?.slice(0, 100) || "unknown" });
  }

  // Test 3: Thread calculation  
  try {
    const { ThreadEngine } = await import("../engines/ThreadEngine.js");
    const engine = new ThreadEngine();
    const result = engine.calculateTapDrill({ type: "metric", size: "M10", pitch: 1.5 });
    if (result && result.tap_drill_diameter > 0) { passed++; }
    else { failures.push({ test: "thread_calc", error: "tap_drill ≤ 0 or missing" }); }
  } catch (e: any) {
    failures.push({ test: "thread_calc", error: e.message?.slice(0, 100) || "unknown" });
  }

  // Test 4: Toolpath strategy
  try {
    const { ToolpathEngine } = await import("../engines/ToolpathEngine.js");
    const engine = new ToolpathEngine();
    const result = engine.selectStrategy({ feature: "pocket", material_class: "steel", goal: "roughing" });
    if (result && (result.strategy_id || result.id || result.name)) { passed++; }
    else { failures.push({ test: "toolpath_select", error: "No strategy returned" }); }
  } catch (e: any) {
    failures.push({ test: "toolpath_select", error: e.message?.slice(0, 100) || "unknown" });
  }

  // Test 5: Knowledge stats
  try {
    const { KnowledgeQueryEngine } = await import("../engines/KnowledgeQueryEngine.js");
    const engine = new KnowledgeQueryEngine();
    const stats = await engine.getStats();
    const total = stats?.total_entries || stats?.total || 0;
    if (total > 25000) { passed++; }
    else { failures.push({ test: "knowledge_stats", error: `total=${total}, expected >25000` }); }
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
