/**
 * PRISM D8 — Smoke Test Suite
 * ==============================
 * Tests every dispatcher with minimal valid params.
 * Each test is isolated — one failure doesn't block others.
 * Results written to C:\PRISM\state\test-results\
 *
 * Two modes:
 * 1. Direct: Called from devDispatcher action=test_smoke (runs in-process)
 * 2. ATCS: Each test = autonomous unit, validated by ralph_loop
 *
 * SAFETY: Read-only tests only. No state modification.
 * @version 1.0.0
 * @date 2026-02-09
 * @dimension D8 — Test Infrastructure
 */

import * as fs from "fs";
import { safeWriteSync } from "../utils/atomicWrite.js";
import * as path from "path";

const TEST_RESULTS_DIR = "C:\\PRISM\\state\\test-results";
if (!fs.existsSync(TEST_RESULTS_DIR)) fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });

// ============================================================================
// TYPES
// ============================================================================

export interface SmokeTest {
  id: string;
  dispatcher: string;
  action: string;
  params: Record<string, any>;
  description: string;
  expect: "success" | "error_ok";  // error_ok = test passes even if error returned
}

export interface TestResult {
  id: string;
  dispatcher: string;
  action: string;
  status: "PASS" | "FAIL" | "ERROR" | "SKIP";
  duration_ms: number;
  response_preview: string;
  error?: string;
  timestamp: string;
}

export interface SmokeReport {
  run_id: string;
  timestamp: string;
  duration_ms: number;
  total: number;
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
  pass_rate: number;
  results: TestResult[];
  broken_dispatchers: string[];
  healthy_dispatchers: string[];
}

// ============================================================================
// 24 SMOKE TESTS — One per dispatcher, minimal valid read-only params
// ============================================================================

export const SMOKE_TESTS: SmokeTest[] = [
  // MANUFACTURING (5)
  { id: "SMK-001", dispatcher: "prism_data", action: "material_search",
    params: { query: "1045" }, description: "Search materials DB", expect: "success" },
  { id: "SMK-002", dispatcher: "prism_calc", action: "mrr",
    params: { cutting_speed: 200, feed_per_tooth: 0.1, axial_depth: 2, radial_depth: 6, tool_diameter: 12, number_of_teeth: 4 },
    description: "Calculate MRR", expect: "success" },
  { id: "SMK-003", dispatcher: "prism_safety", action: "check_spindle_torque",
    params: { power_kw: 10, spindle_speed_rpm: 5000 },
    description: "Check spindle torque", expect: "success" },
  { id: "SMK-004", dispatcher: "prism_thread", action: "calculate_tap_drill",
    params: { thread_designation: "M10", engagement_percent: 75 },
    description: "Calculate tap drill", expect: "success" },
  { id: "SMK-005", dispatcher: "prism_toolpath", action: "stats",
    params: {}, description: "Toolpath strategy stats", expect: "success" },

  // VALIDATION (3)
  { id: "SMK-006", dispatcher: "prism_validate", action: "safety",
    params: { content: "test", context: "smoke" }, description: "Safety validation", expect: "success" },
  { id: "SMK-007", dispatcher: "prism_omega", action: "history",
    params: {}, description: "Omega history", expect: "success" },
  { id: "SMK-008", dispatcher: "prism_ralph", action: "scrutinize",
    params: { content: "test" }, description: "Ralph scrutinize", expect: "error_ok" },

  // SESSION (3)
  { id: "SMK-009", dispatcher: "prism_session", action: "context_size",
    params: {}, description: "Context size", expect: "success" },
  { id: "SMK-010", dispatcher: "prism_context", action: "todo_read",
    params: {}, description: "Read todo", expect: "success" },
  { id: "SMK-011", dispatcher: "prism_gsd", action: "quick",
    params: {}, description: "GSD quick", expect: "success" },

  // DEVELOPMENT (4)
  { id: "SMK-012", dispatcher: "prism_dev", action: "server_info",
    params: {}, description: "Server info", expect: "success" },
  { id: "SMK-013", dispatcher: "prism_doc", action: "list",
    params: {}, description: "List docs", expect: "success" },
  { id: "SMK-014", dispatcher: "prism_sp", action: "evidence_level",
    params: { claim: "test", evidence: "test" }, description: "Evidence level", expect: "success" },
  { id: "SMK-015", dispatcher: "prism_guard", action: "lkg_status",
    params: {}, description: "LKG status", expect: "success" },

  // ORCHESTRATION (4)
  { id: "SMK-016", dispatcher: "prism_orchestrate", action: "queue_stats",
    params: {}, description: "Queue stats", expect: "success" },
  { id: "SMK-017", dispatcher: "prism_autopilot_d", action: "registry_status",
    params: {}, description: "Registry status", expect: "success" },
  { id: "SMK-018", dispatcher: "prism_manus", action: "list_tasks",
    params: {}, description: "List manus tasks", expect: "success" },
  { id: "SMK-019", dispatcher: "prism_atcs", action: "task_status",
    params: {}, description: "ATCS status", expect: "success" },

  // KNOWLEDGE (4)
  { id: "SMK-020", dispatcher: "prism_skill_script", action: "skill_stats",
    params: {}, description: "Skill stats", expect: "success" },
  { id: "SMK-021", dispatcher: "prism_knowledge", action: "stats",
    params: {}, description: "Knowledge stats", expect: "success" },
  { id: "SMK-022", dispatcher: "prism_hook", action: "status",
    params: {}, description: "Hook status", expect: "success" },
  { id: "SMK-023", dispatcher: "prism_generator", action: "stats",
    params: {}, description: "Generator stats", expect: "success" },

  // AUTONOMOUS (1)
  { id: "SMK-024", dispatcher: "prism_autonomous", action: "auto_status",
    params: {}, description: "Autonomous status", expect: "success" },
];

// ============================================================================
// TEST RUNNER — In-process execution via dispatcher registry
// ============================================================================

/**
 * Run all smoke tests using the server's tool registry.
 * The server object has a _registeredTools map we can call directly.
 */
export async function runSmokeTests(
  toolInvoker: (toolName: string, params: Record<string, any>) => Promise<any>
): Promise<SmokeReport> {
  const start = Date.now();
  const runId = `SMOKE-${Date.now()}`;
  const results: TestResult[] = [];

  for (const test of SMOKE_TESTS) {
    const testStart = Date.now();
    try {
      const response = await toolInvoker(`prism_${test.dispatcher.replace('prism_', '')}`, {
        action: test.action, params: test.params
      });

      const responseStr = typeof response === "string" ? response : JSON.stringify(response);
      const hasError = responseStr.includes('"error"') &&
        !responseStr.includes('"error":null') &&
        !responseStr.includes('"error":""');

      const passed = !hasError || test.expect === "error_ok";
      results.push({
        id: test.id, dispatcher: test.dispatcher, action: test.action,
        status: passed ? "PASS" : "FAIL",
        duration_ms: Date.now() - testStart,
        timestamp: new Date().toISOString(),
        response_preview: responseStr.slice(0, 200),
        error: hasError ? "Response contains error" : undefined,
      });
    } catch (err: any) {
      results.push({
        id: test.id, dispatcher: test.dispatcher, action: test.action,
        status: test.expect === "error_ok" ? "PASS" : "ERROR",
        duration_ms: Date.now() - testStart,
        timestamp: new Date().toISOString(),
        response_preview: "",
        error: (err.message || "Unknown").slice(0, 200),
      });
    }
  }

  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  const errors = results.filter(r => r.status === "ERROR").length;
  const skipped = results.filter(r => r.status === "SKIP").length;

  const dispStatus = new Map<string, boolean>();
  for (const r of results) {
    if (r.status === "PASS") dispStatus.set(r.dispatcher, true);
    else if (!dispStatus.has(r.dispatcher)) dispStatus.set(r.dispatcher, false);
  }

  const report: SmokeReport = {
    run_id: runId, timestamp: new Date().toISOString(),
    duration_ms: Date.now() - start,
    total: results.length, passed, failed, errors, skipped,
    pass_rate: Math.round((passed / results.length) * 100),
    results,
    broken_dispatchers: [...dispStatus.entries()].filter(([_, ok]) => !ok).map(([d]) => d),
    healthy_dispatchers: [...dispStatus.entries()].filter(([_, ok]) => ok).map(([d]) => d),
  };

  // Persist
  safeWriteSync(path.join(TEST_RESULTS_DIR, `${runId}.json`), JSON.stringify(report, null, 2));
  safeWriteSync(path.join(TEST_RESULTS_DIR, "LATEST_SMOKE.json"), JSON.stringify({
    run_id: runId, timestamp: report.timestamp,
    total: report.total, passed, failed, errors, skipped,
    pass_rate: report.pass_rate,
    broken: report.broken_dispatchers,
    duration_ms: report.duration_ms,
  }, null, 2));

  return report;
}

/**
 * Generate ATCS work queue from smoke tests (for autonomous execution).
 */
export function generateATCSWorkQueue(): any[] {
  return SMOKE_TESTS.map((test, i) => ({
    unit_id: i + 1,
    batch: 1,
    type: "smoke_test",
    status: "PENDING",
    description: `${test.id}: ${test.dispatcher}→${test.action} — ${test.description}`,
    params: {
      test_id: test.id,
      dispatcher: test.dispatcher,
      action: test.action,
      call_params: test.params,
      expect: test.expect,
    },
  }));
}
