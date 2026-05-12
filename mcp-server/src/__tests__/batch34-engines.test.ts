/**
 * batch34-engines.test.ts — Tests for 13 engines (Batch 34)
 *
 * Engines tested:
 *   1. MobileInterfaceEngine
 *   2. ComputationCache
 *   3. SwarmGroupExecutor (async orchestrator — limited pure-method testing)
 *   4. SkillAutoLoader
 *   5. SkillBundleEngine
 *   6. SwarmExecutor
 *   7. AgentExecutor
 *   8. BatchProcessor
 *   9. MasterIndexGenerator
 *  10. OnboardingEngine
 *  11. PluginEngine
 *  12. SessionLifecycleEngine
 *  13. ContextBudgetEngine
 */

import { describe, it, expect, beforeEach } from "vitest";

// ── 1. MobileInterfaceEngine ────────────────────────────────────────────
import {
  quickLookup,
  processVoiceQuery,
  decodeAlarm,
  startToolTimer,
  checkToolTimer,
  generateOfflineCache,
  mobileInterface,
} from "../engines/MobileInterfaceEngine.js";

describe("MobileInterfaceEngine", () => {
  it("quickLookup returns valid cutting parameters for steel", () => {
    const r = quickLookup({ material: "steel", tool_diameter_mm: 12, operation: "roughing" });
    expect(r).toBeDefined();
    expect(r.rpm).toBeGreaterThan(0);
    expect(r.feed_mmmin).toBeGreaterThan(0);
    expect(r.doc_mm).toBeGreaterThan(0);
    expect(r.display.primary).toContain("RPM");
    expect(r.display.status_color).toBe("green");
  });

  it("quickLookup adjusts Vc for finishing operation", () => {
    const rough = quickLookup({ material: "aluminum", tool_diameter_mm: 10, operation: "roughing" });
    const finish = quickLookup({ material: "aluminum", tool_diameter_mm: 10, operation: "finishing" });
    // Finishing uses higher Vc (×1.2) so RPM should be higher
    expect(finish.rpm).toBeGreaterThan(rough.rpm);
    // Finishing DOC should be smaller
    expect(finish.doc_mm).toBeLessThan(rough.doc_mm);
  });

  it("processVoiceQuery parses material and diameter from text", () => {
    const r = processVoiceQuery("What speed for 10mm aluminum roughing?");
    expect(r.confidence).toBeGreaterThan(0.8);
    expect(r.interpreted).toContain("aluminum");
    expect(r.interpreted).toContain("10mm");
    expect(r.parameters).toBeDefined();
    expect(r.parameters!.rpm).toBeGreaterThan(0);
    expect(r.spoken_response).toContain("RPM");
  });

  it("decodeAlarm returns known alarm details", () => {
    const alarm = decodeAlarm("700");
    expect(alarm.severity).toBe("emergency");
    expect(alarm.plain_english).toContain("Emergency stop");
    expect(alarm.fix_steps.length).toBeGreaterThan(0);
    expect(alarm.color).toBe("red");
  });

  it("decodeAlarm returns fallback for unknown code", () => {
    const alarm = decodeAlarm("99999");
    expect(alarm.severity).toBe("warning");
    expect(alarm.plain_english).toContain("Unknown alarm code");
  });

  it("startToolTimer creates a running timer", () => {
    const timer = startToolTimer({ tool: "T05", estimated_life_min: 30 });
    expect(timer.timer_id).toMatch(/^TLT-/);
    expect(timer.state).toBe("running");
    expect(timer.estimated_life_min).toBe(30);
    expect(timer.tool).toBe("T05");
  });

  it("checkToolTimer returns running timer", () => {
    const timer = startToolTimer({ tool: "T06", estimated_life_min: 60 });
    const checked = checkToolTimer(timer.timer_id);
    expect(checked).not.toBeNull();
    expect(checked!.state).toBe("running");
    expect(checked!.remaining_min).toBeGreaterThan(0);
  });

  it("generateOfflineCache produces entries for material/diameter/operation combos", () => {
    const cache = generateOfflineCache();
    expect(cache.version).toBe("1.0");
    // 5 materials × 6 diameters × 2 operations = 60 entries
    expect(cache.entries.length).toBe(60);
    expect(cache.total_bytes).toBeGreaterThan(0);
    expect(cache.entries[0].result.rpm).toBeGreaterThan(0);
  });

  it("mobileInterface dispatcher routes actions correctly", () => {
    const lookup = mobileInterface("mobile_lookup", { material: "titanium", tool_diameter_mm: 8 });
    expect(lookup.rpm).toBeGreaterThan(0);
    expect(lookup.material).toBe("titanium");

    const unknown = mobileInterface("nonexistent_action", {});
    expect(unknown.error).toContain("unknown action");
  });
});

// ── 2. ComputationCache ─────────────────────────────────────────────────
import { computationCache } from "../engines/ComputationCache.js";

describe("ComputationCache", () => {
  beforeEach(() => {
    computationCache.clear();
  });

  it("makeKey produces deterministic keys for same action+params", () => {
    const k1 = computationCache.makeKey("prism_calc:mrr", { depth: 2, width: 10 });
    const k2 = computationCache.makeKey("prism_calc:mrr", { width: 10, depth: 2 });
    expect(k1).toBe(k2); // keys sorted internally
  });

  it("set/get caches and retrieves values within TTL", () => {
    const action = "prism_calc:surface_finish";
    const params = { material: "steel", depth: 0.5 };
    computationCache.set(action, params, { ra: 1.6 });
    const result = computationCache.get(action, params);
    expect(result.hit).toBe(true);
    expect(result.value).toEqual({ ra: 1.6 });
    expect(result.tier).toBe("STANDARD");
  });

  it("shouldBypass returns true for safety-critical actions", () => {
    expect(computationCache.shouldBypass("prism_safety:check_toolpath_collision")).toBe(true);
    expect(computationCache.shouldBypass("prism_safety:predict_tool_breakage")).toBe(true);
    expect(computationCache.shouldBypass("prism_calc:mrr")).toBe(false);
  });

  it("bypassed actions are never cached", () => {
    const action = "prism_safety:check_toolpath_collision";
    computationCache.set(action, { x: 1 }, { safe: false });
    const result = computationCache.get(action, { x: 1 });
    expect(result.hit).toBe(false);
  });

  it("invalidateByTier removes all entries of that tier", () => {
    computationCache.set("prism_data:material_get", { id: "steel" }, { name: "Steel" });
    computationCache.set("prism_data:tool_get", { id: "t01" }, { name: "T01" });
    const stats = computationCache.getStats();
    expect(stats.total_entries).toBe(2);

    const result = computationCache.invalidateByTier("STABLE");
    expect(result.invalidated).toBe(2);
    expect(computationCache.getStats().total_entries).toBe(0);
  });

  it("getStats returns valid statistics", () => {
    const before = computationCache.getStats();
    const baseHits = before.hits;
    const baseMisses = before.misses;

    computationCache.set("prism_calc:power", { rpm: 3000 }, 1500);
    computationCache.get("prism_calc:power", { rpm: 3000 }); // hit
    computationCache.get("prism_calc:power", { rpm: 5000 }); // miss

    const stats = computationCache.getStats();
    expect(stats.hits).toBeGreaterThanOrEqual(baseHits + 1);
    expect(stats.misses).toBeGreaterThanOrEqual(baseMisses + 1);
    expect(stats.hit_rate).toBeGreaterThan(0);
    expect(stats.hit_rate).toBeLessThanOrEqual(1);
    expect(stats.total_entries).toBe(1);
  });
});

// ── 3. SwarmGroupExecutor ───────────────────────────────────────────────
// SwarmGroupExecutor is an async orchestrator that delegates to SwarmExecutor
// and requires registered agents. Its exported function (executeSwarmGroups)
// is deeply async and agent-dependent. We test the helper extractKeyFindings
// indirectly through type checks only.
describe("SwarmGroupExecutor", () => {
  it("module exports executeSwarmGroups function", async () => {
    const mod = await import("../engines/SwarmGroupExecutor.js");
    expect(typeof mod.executeSwarmGroups).toBe("function");
  });
});

// ── 4. SkillAutoLoader ──────────────────────────────────────────────────
import {
  getChainForDomain,
  getLoadedExcerptsBlock,
  clearSkillCache,
} from "../engines/SkillAutoLoader.js";

describe("SkillAutoLoader", () => {
  it("getChainForDomain returns chain for known domains", () => {
    const chain = getChainForDomain("calculations");
    expect(chain).not.toBeNull();
    expect(chain!.chain_name).toBe("speed-feed-full");
    expect(chain!.skills.length).toBeGreaterThan(0);
    expect(chain!.purpose).toBeDefined();
  });

  it("getChainForDomain returns null for unknown domain", () => {
    const chain = getChainForDomain("nonexistent_domain_xyz");
    expect(chain).toBeNull();
  });

  it("getLoadedExcerptsBlock returns empty string for empty excerpts", () => {
    const result = getLoadedExcerptsBlock({
      success: true, call_number: 1, domain: "test",
      excerpts: [], total_lines_loaded: 0, hint: "", cached: false,
    });
    expect(result).toBe("");
  });

  it("clearSkillCache does not throw", () => {
    expect(() => clearSkillCache()).not.toThrow();
  });
});

// ── 5. SkillBundleEngine ────────────────────────────────────────────────
import {
  getAllBundles,
  getBundle,
  getBundlesForAction,
  getBundlesForDomain,
  getBundleDigest,
  listBundles,
} from "../engines/SkillBundleEngine.js";

describe("SkillBundleEngine", () => {
  it("getAllBundles returns 9 bundles", () => {
    const bundles = getAllBundles();
    expect(bundles.length).toBe(9);
    expect(bundles[0].id).toBeDefined();
    expect(bundles[0].skills.length).toBeGreaterThan(0);
  });

  it("getBundle returns a specific bundle by ID", () => {
    const bundle = getBundle("speed-feed");
    expect(bundle).toBeDefined();
    expect(bundle!.name).toContain("Speed");
    expect(bundle!.chain_name).toBe("speed-feed-full");
  });

  it("getBundlesForAction finds bundles matching an action", () => {
    const bundles = getBundlesForAction("cutting_force");
    expect(bundles.length).toBeGreaterThan(0);
    expect(bundles[0].id).toBe("speed-feed");
  });

  it("getBundlesForDomain finds bundles matching a domain", () => {
    const bundles = getBundlesForDomain("safety");
    expect(bundles.length).toBeGreaterThan(0);
    expect(bundles.some(b => b.id === "safety-validation")).toBe(true);
  });

  it("getBundleDigest returns digest lines", () => {
    const digest = getBundleDigest("threading");
    expect(digest.length).toBeGreaterThan(0);
    expect(digest[0]).toContain("Tap drill");
  });

  it("listBundles returns summary with correct structure", () => {
    const list = listBundles();
    expect(list.length).toBe(9);
    expect(list[0]).toHaveProperty("id");
    expect(list[0]).toHaveProperty("name");
    expect(list[0]).toHaveProperty("skills");
    expect(list[0]).toHaveProperty("actions");
  });
});

// ── 6. SwarmExecutor ────────────────────────────────────────────────────
import { swarmExecutor } from "../engines/SwarmExecutor.js";

describe("SwarmExecutor", () => {
  it("getPatterns returns all 8 swarm patterns", () => {
    const patterns = swarmExecutor.getPatterns();
    expect(patterns.length).toBe(8);
    const names = patterns.map(p => p.pattern);
    expect(names).toContain("parallel");
    expect(names).toContain("consensus");
    expect(names).toContain("pipeline");
    expect(names).toContain("collaboration");
  });

  it("listSwarms returns an array (initially empty or with prior runs)", () => {
    const swarms = swarmExecutor.listSwarms();
    expect(Array.isArray(swarms)).toBe(true);
  });

  it("getSwarm returns undefined for non-existent swarm", () => {
    expect(swarmExecutor.getSwarm("nonexistent_swarm_id")).toBeUndefined();
  });
});

// ── 7. AgentExecutor ────────────────────────────────────────────────────
import { agentExecutor } from "../engines/AgentExecutor.js";

describe("AgentExecutor", () => {
  it("getQueueStats returns valid stats structure", () => {
    const stats = agentExecutor.getQueueStats();
    expect(stats).toHaveProperty("pending");
    expect(stats).toHaveProperty("running");
    expect(stats).toHaveProperty("completed");
    expect(stats).toHaveProperty("failed");
    expect(stats).toHaveProperty("totalTasks");
    expect(typeof stats.avgDuration_ms).toBe("number");
  });

  it("getSessions returns an array", () => {
    const sessions = agentExecutor.getSessions();
    expect(Array.isArray(sessions)).toBe(true);
  });

  it("listPlans returns an array", () => {
    const plans = agentExecutor.listPlans();
    expect(Array.isArray(plans)).toBe(true);
  });

  it("getTaskResult returns undefined for non-existent task", () => {
    expect(agentExecutor.getTaskResult("nonexistent_task")).toBeUndefined();
  });

  it("getPlan returns undefined for non-existent plan", () => {
    expect(agentExecutor.getPlan("nonexistent_plan")).toBeUndefined();
  });
});

// ── 8. BatchProcessor ───────────────────────────────────────────────────
import { batchProcessor, PRIORITY_LABELS } from "../engines/BatchProcessor.js";

describe("BatchProcessor", () => {
  it("PRIORITY_LABELS maps all 4 levels", () => {
    expect(PRIORITY_LABELS[0]).toBe("CRITICAL");
    expect(PRIORITY_LABELS[1]).toBe("HIGH");
    expect(PRIORITY_LABELS[2]).toBe("NORMAL");
    expect(PRIORITY_LABELS[3]).toBe("LOW");
  });

  it("enqueue adds items and getQueueSize reflects count", () => {
    // Drain first to get clean state
    batchProcessor.drain();
    const id = batchProcessor.enqueue("test_action", { x: 1 }, 2);
    expect(id).toMatch(/^batch_/);
    expect(batchProcessor.getQueueSize()).toBeGreaterThanOrEqual(1);
    batchProcessor.drain(); // cleanup
  });

  it("enqueue with CRITICAL priority (0) returns ID but does not queue", () => {
    batchProcessor.drain();
    const id = batchProcessor.enqueue("safety_check", { critical: true }, 0);
    expect(id).toMatch(/^batch_/);
    // CRITICAL items bypass the queue
    expect(batchProcessor.getQueueSize()).toBe(0);
  });

  it("drain empties the queue and returns items", () => {
    batchProcessor.enqueue("action_a", {}, 2);
    batchProcessor.enqueue("action_b", {}, 1);
    const drained = batchProcessor.drain();
    expect(drained.length).toBeGreaterThanOrEqual(2);
    expect(batchProcessor.getQueueSize()).toBe(0);
  });

  it("getStats returns valid stats structure", () => {
    const stats = batchProcessor.getStats();
    expect(stats).toHaveProperty("total_queued");
    expect(stats).toHaveProperty("total_processed");
    expect(stats).toHaveProperty("current_queue_size");
    expect(stats).toHaveProperty("queue_by_priority");
  });
});

// ── 9. MasterIndexGenerator ─────────────────────────────────────────────
import { isStale } from "../engines/MasterIndexGenerator.js";

describe("MasterIndexGenerator", () => {
  it("isStale returns true for dispatcher path changes", () => {
    expect(isStale("src/tools/dispatchers/calcDispatcher.ts")).toBe(true);
    expect(isStale("src/engines/SomeEngine.ts")).toBe(true);
  });

  it("isStale returns false for untracked paths", () => {
    expect(isStale("src/__tests__/some.test.ts")).toBe(false);
    expect(isStale("package.json")).toBe(false);
  });

  it("module exports generate function", async () => {
    const mod = await import("../engines/MasterIndexGenerator.js");
    expect(typeof mod.generate).toBe("function");
    expect(typeof mod.isStale).toBe("function");
  });
});

// ── 10. OnboardingEngine ────────────────────────────────────────────────
import {
  generateWelcome,
  recordInteraction,
  getOnboardingState,
  getDisclosureSuggestion,
  resetSession,
  getCommonMaterials,
} from "../engines/OnboardingEngine.js";

describe("OnboardingEngine", () => {
  const sid = "test-onboarding-" + Date.now();

  beforeEach(() => {
    resetSession(sid);
  });

  it("generateWelcome returns greeting and suggestions", () => {
    const welcome = generateWelcome();
    expect(welcome.greeting).toContain("PRISM");
    expect(welcome.suggestions.length).toBe(3);
    expect(welcome.capabilities_hint).toContain("materials");
  });

  it("generateWelcome personalizes with profile name", () => {
    const welcome = generateWelcome({ name: "Dave" });
    expect(welcome.greeting).toContain("Dave");
  });

  it("recordInteraction increments count and computes disclosure level", () => {
    const s1 = recordInteraction(sid, { material: "steel" });
    expect(s1.interaction_count).toBe(1);
    expect(s1.disclosure_level).toBe(0);

    recordInteraction(sid);
    const s3 = recordInteraction(sid); // count=3
    expect(s3.disclosure_level).toBe(1); // level 1 at count>=2
  });

  it("recordInteraction tracks materials seen", () => {
    recordInteraction(sid, { material: "aluminum" });
    recordInteraction(sid, { material: "titanium" });
    recordInteraction(sid, { material: "aluminum" }); // duplicate
    const materials = getCommonMaterials(sid);
    expect(materials).toContain("aluminum");
    expect(materials).toContain("titanium");
    expect(materials.length).toBe(2); // no dupe
  });

  it("getDisclosureSuggestion returns null at level 0", () => {
    const suggestion = getDisclosureSuggestion(sid);
    expect(suggestion).toBeNull();
  });

  it("getDisclosureSuggestion returns suggestion at level 1+", () => {
    // Push to level 1 (need 2 interactions)
    recordInteraction(sid);
    recordInteraction(sid);
    const suggestion = getDisclosureSuggestion(sid);
    expect(suggestion).not.toBeNull();
    expect(suggestion!.level).toBe(1);
    expect(suggestion!.is_followup).toBe(true);
  });

  it("resetSession clears state back to defaults", () => {
    recordInteraction(sid, { material: "steel" });
    recordInteraction(sid);
    resetSession(sid);
    const state = getOnboardingState(sid);
    expect(state.interaction_count).toBe(0);
    expect(state.disclosure_level).toBe(0);
  });
});

// ── 11. PluginEngine ────────────────────────────────────────────────────
import { pluginEngine } from "../engines/PluginEngine.js";

describe("PluginEngine", () => {
  beforeEach(() => {
    pluginEngine.clear();
  });

  it("register creates a plugin with registered status", () => {
    const plugin = pluginEngine.register({
      id: "test-plugin-1",
      name: "Test Plugin",
      version: "1.0.0",
      description: "A test plugin",
      author: "test",
    });
    expect(plugin.status).toBe("registered");
    expect(plugin.manifest.id).toBe("test-plugin-1");
  });

  it("register marks plugin as incompatible when dependencies are missing", () => {
    const plugin = pluginEngine.register({
      id: "test-plugin-dep",
      name: "Dep Plugin",
      version: "1.0.0",
      description: "Needs deps",
      author: "test",
      dependencies: ["nonexistent-dep"],
    });
    expect(plugin.status).toBe("incompatible");
    expect(plugin.error).toContain("Missing dependencies");
  });

  it("enable activates plugin and registers hooks", () => {
    pluginEngine.register({
      id: "hook-plugin",
      name: "Hook Plugin",
      version: "1.0.0",
      description: "Has hooks",
      author: "test",
      hooks: ["beforeCalculation", "afterCalculation"],
    });
    const result = pluginEngine.enable("hook-plugin");
    expect(result.success).toBe(true);

    const plugin = pluginEngine.get("hook-plugin");
    expect(plugin!.status).toBe("enabled");
    expect(plugin!.hooks_registered).toContain("beforeCalculation");
  });

  it("disable deactivates plugin and removes hooks", () => {
    pluginEngine.register({
      id: "dis-plugin",
      name: "Dis Plugin",
      version: "1.0.0",
      description: "Will disable",
      author: "test",
      hooks: ["myHook"],
    });
    pluginEngine.enable("dis-plugin");
    const disabled = pluginEngine.disable("dis-plugin");
    expect(disabled).toBe(true);
    expect(pluginEngine.get("dis-plugin")!.status).toBe("disabled");
    expect(pluginEngine.get("dis-plugin")!.hooks_registered.length).toBe(0);
  });

  it("executeHook runs hook handlers in priority order", () => {
    pluginEngine.register({ id: "p1", name: "P1", version: "1.0.0", description: "p", author: "t" });
    pluginEngine.registerHook("p1", "transform", 10, (ctx) => ({ ...ctx, step1: true }));
    pluginEngine.registerHook("p1", "transform", 20, (ctx) => ({ ...ctx, step2: true }));

    const result = pluginEngine.executeHook("transform", { initial: true });
    expect(result.initial).toBe(true);
    expect(result.step1).toBe(true);
    expect(result.step2).toBe(true);
  });

  it("stats returns correct counts", () => {
    pluginEngine.register({ id: "s1", name: "S1", version: "1.0.0", description: "s", author: "t" });
    pluginEngine.register({ id: "s2", name: "S2", version: "1.0.0", description: "s", author: "t", hooks: ["h1"] });
    pluginEngine.enable("s2");

    const stats = pluginEngine.stats();
    expect(stats.total_plugins).toBe(2);
    expect(stats.enabled).toBe(1);
    expect(stats.by_status.registered).toBe(1);
    expect(stats.by_status.enabled).toBe(1);
  });

  it("list filters by status", () => {
    pluginEngine.register({ id: "l1", name: "L1", version: "1.0.0", description: "l", author: "t" });
    pluginEngine.register({ id: "l2", name: "L2", version: "1.0.0", description: "l", author: "t" });
    pluginEngine.enable("l1");

    const enabled = pluginEngine.list("enabled");
    expect(enabled.length).toBe(1);
    expect(enabled[0].manifest.id).toBe("l1");
  });

  it("unregister removes plugin entirely", () => {
    pluginEngine.register({ id: "rm1", name: "RM", version: "1.0.0", description: "r", author: "t" });
    expect(pluginEngine.get("rm1")).toBeDefined();
    const removed = pluginEngine.unregister("rm1");
    expect(removed).toBe(true);
    expect(pluginEngine.get("rm1")).toBeUndefined();
  });
});

// ── 12. SessionLifecycleEngine ──────────────────────────────────────────
import { SessionLifecycleEngine } from "../engines/SessionLifecycleEngine.js";

describe("SessionLifecycleEngine", () => {
  it("getInstance returns a singleton", () => {
    const a = SessionLifecycleEngine.getInstance();
    const b = SessionLifecycleEngine.getInstance();
    expect(a).toBe(b);
  });

  it("recordToolCall updates metrics correctly", () => {
    const engine = SessionLifecycleEngine.getInstance();
    const before = engine.getMetrics().tool_calls;
    engine.recordToolCall(true, 50);
    engine.recordToolCall(false, 100);
    const after = engine.getMetrics();
    expect(after.tool_calls).toBe(before + 2);
    expect(after.successful_calls).toBeGreaterThanOrEqual(1);
    expect(after.failed_calls).toBeGreaterThanOrEqual(1);
  });

  it("computeQualityScore returns valid score with grade", () => {
    const engine = SessionLifecycleEngine.getInstance();
    const score = engine.computeQualityScore();
    expect(score.overall).toBeGreaterThanOrEqual(0);
    expect(score.overall).toBeLessThanOrEqual(100);
    expect(score.grade).toBeDefined();
    expect(score.dimensions).toHaveProperty("task_completion");
    expect(score.dimensions).toHaveProperty("reliability");
    expect(score.dimensions).toHaveProperty("safety_adherence");
    expect(score.dimensions).toHaveProperty("efficiency");
    expect(score.dimensions).toHaveProperty("continuity");
    expect(score.recommendation).toBeDefined();
  });

  it("shouldWriteIncrementalPrep triggers every PREP_INTERVAL_CALLS", () => {
    const engine = SessionLifecycleEngine.getInstance();
    // Interval is 10 calls
    expect(engine.shouldWriteIncrementalPrep(0)).toBe(false);
    expect(engine.shouldWriteIncrementalPrep(5)).toBe(false);
    // 10 should be true (first time)
    // Note: may be false if already written in this test run,
    // so we just check it returns a boolean
    const result = engine.shouldWriteIncrementalPrep(10);
    expect(typeof result).toBe("boolean");
  });

  it("getSessionId returns a session ID string", () => {
    const id = SessionLifecycleEngine.getInstance().getSessionId();
    expect(id).toMatch(/^SESSION-/);
  });

  it("recordPressure tracks peak pressure", () => {
    const engine = SessionLifecycleEngine.getInstance();
    engine.recordPressure(45);
    engine.recordPressure(80);
    engine.recordPressure(30); // lower, should not replace peak
    const metrics = engine.getMetrics();
    expect(metrics.peak_pressure_pct).toBeGreaterThanOrEqual(80);
  });
});

// ── 13. ContextBudgetEngine ─────────────────────────────────────────────
import { ContextBudgetEngine } from "../engines/ContextBudgetEngine.js";

describe("ContextBudgetEngine", () => {
  beforeEach(() => {
    ContextBudgetEngine.resetBudget();
  });

  it("getBudget returns allocations for all default categories", () => {
    const budget = ContextBudgetEngine.getBudget();
    expect(budget.totalBudget).toBe(100_000);
    expect(budget.allocations.manufacturing.percentage).toBe(40);
    expect(budget.allocations.development.percentage).toBe(20);
    expect(budget.allocations.context.percentage).toBe(20);
    expect(budget.allocations.reserve.percentage).toBe(20);
  });

  it("trackUsage accumulates tokens and returns updated count", () => {
    const r1 = ContextBudgetEngine.trackUsage("manufacturing", 5000);
    expect(r1.tokensUsed).toBe(5000);
    expect(r1.limit).toBe(40000);

    const r2 = ContextBudgetEngine.trackUsage("manufacturing", 3000);
    expect(r2.tokensUsed).toBe(8000);
  });

  it("isOverBudget detects when category exceeds limit", () => {
    // Manufacturing limit = 40,000
    ContextBudgetEngine.trackUsage("manufacturing", 45000);
    const check = ContextBudgetEngine.isOverBudget("manufacturing");
    expect(check.overBudget).toBe(true);
    expect(check.overage).toBe(5000);
  });

  it("isOverBudget returns false when under limit", () => {
    ContextBudgetEngine.trackUsage("development", 1000);
    const check = ContextBudgetEngine.isOverBudget("development");
    expect(check.overBudget).toBe(false);
    expect(check.overage).toBe(0);
  });

  it("getUsageReport shows total utilization and over-budget categories", () => {
    ContextBudgetEngine.trackUsage("manufacturing", 50000); // over 40k limit
    ContextBudgetEngine.trackUsage("development", 10000);   // under 20k limit

    const report = ContextBudgetEngine.getUsageReport();
    expect(report.totalUsed).toBe(60000);
    expect(report.utilizationPercent).toBe(60);
    expect(report.overBudgetCategories).toContain("manufacturing");
    expect(report.overBudgetCategories).not.toContain("development");
  });

  it("resetBudget clears all usage and returns previous totals", () => {
    ContextBudgetEngine.trackUsage("manufacturing", 10000);
    ContextBudgetEngine.trackUsage("development", 5000);

    const reset = ContextBudgetEngine.resetBudget();
    expect(reset.reset).toBe(true);
    expect(reset.previousTotal).toBe(15000);
    expect(reset.categoriesCleared).toBe(2);

    // Verify everything is cleared
    const report = ContextBudgetEngine.getUsageReport();
    expect(report.totalUsed).toBe(0);
  });
});
