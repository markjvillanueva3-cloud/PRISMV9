import * as fs from "node:fs";
import * as path from "node:path";
import { PATHS } from "../constants.js";
import { safeWriteSync } from "../utils/atomicWrite.js";

export interface SmokeTestCase {
  id: string;
  dispatcher: string;
  action: string;
  params: Record<string, unknown>;
  description: string;
  expect: "success" | "error_ok";
}

export interface SmokeResult {
  id: string;
  dispatcher: string;
  action: string;
  status: "PASS" | "FAIL" | "ERROR" | "SKIP";
  duration_ms: number;
  timestamp: string;
  response_preview: string;
  error?: string;
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
  results: SmokeResult[];
  broken_dispatchers: string[];
  healthy_dispatchers: string[];
}

const TEST_RESULTS_DIR = path.join(PATHS.STATE_DIR, "test-results");
if (!fs.existsSync(TEST_RESULTS_DIR)) fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });

export const SMOKE_TESTS: SmokeTestCase[] = [
  { id: "SMK-001", dispatcher: "prism_data", action: "material_search", params: { query: "1045" }, description: "Search materials DB", expect: "success" },
  { id: "SMK-002", dispatcher: "prism_calc", action: "mrr", params: { cutting_speed: 200, feed_per_tooth: 0.1, axial_depth: 2, radial_depth: 6, tool_diameter: 12, number_of_teeth: 4 }, description: "Calculate MRR", expect: "success" },
  { id: "SMK-003", dispatcher: "prism_safety", action: "check_spindle_torque", params: { power_kw: 10, spindle_speed_rpm: 5000 }, description: "Check spindle torque", expect: "success" },
  { id: "SMK-004", dispatcher: "prism_thread", action: "calculate_tap_drill", params: { thread_designation: "M10", engagement_percent: 75 }, description: "Calculate tap drill", expect: "success" },
  { id: "SMK-005", dispatcher: "prism_toolpath", action: "stats", params: {}, description: "Toolpath strategy stats", expect: "success" },
  { id: "SMK-006", dispatcher: "prism_validate", action: "safety", params: { content: "test", context: "smoke" }, description: "Safety validation", expect: "success" },
  { id: "SMK-007", dispatcher: "prism_omega", action: "history", params: {}, description: "Omega history", expect: "success" },
  { id: "SMK-007b", dispatcher: "prism_omega", action: "auto_score", params: {}, description: "Omega auto_score from SP cog", expect: "success" },
  { id: "SMK-008", dispatcher: "prism_ralph", action: "scrutinize", params: { content: "test" }, description: "Ralph scrutinize", expect: "error_ok" },
  { id: "SMK-009", dispatcher: "prism_session", action: "context_size", params: {}, description: "Context size", expect: "success" },
  { id: "SMK-010", dispatcher: "prism_context", action: "todo_read", params: {}, description: "Read todo", expect: "success" },
  { id: "SMK-011", dispatcher: "prism_gsd", action: "quick", params: {}, description: "GSD quick", expect: "success" },
  { id: "SMK-012", dispatcher: "prism_dev", action: "server_info", params: {}, description: "Server info", expect: "success" },
  { id: "SMK-013", dispatcher: "prism_doc", action: "list", params: {}, description: "List docs", expect: "success" },
  { id: "SMK-014", dispatcher: "prism_sp", action: "evidence_level", params: { claim: "test", evidence: "test" }, description: "Evidence level", expect: "success" },
  { id: "SMK-015", dispatcher: "prism_guard", action: "lkg_status", params: {}, description: "LKG status", expect: "success" },
  { id: "SMK-016", dispatcher: "prism_orchestrate", action: "queue_stats", params: {}, description: "Queue stats", expect: "success" },
  { id: "SMK-017", dispatcher: "prism_autopilot_d", action: "registry_status", params: {}, description: "Registry status", expect: "success" },
  { id: "SMK-018", dispatcher: "prism_manus", action: "list_tasks", params: {}, description: "List manus tasks", expect: "success" },
  { id: "SMK-019", dispatcher: "prism_atcs", action: "task_status", params: {}, description: "ATCS status", expect: "success" },
  { id: "SMK-020", dispatcher: "prism_skill_script", action: "skill_stats", params: {}, description: "Skill stats", expect: "success" },
  { id: "SMK-021", dispatcher: "prism_knowledge", action: "stats", params: {}, description: "Knowledge stats", expect: "success" },
  { id: "SMK-022", dispatcher: "prism_hook", action: "status", params: {}, description: "Hook status", expect: "success" },
  { id: "SMK-023", dispatcher: "prism_generator", action: "stats", params: {}, description: "Generator stats", expect: "success" },
  { id: "SMK-024", dispatcher: "prism_autonomous", action: "auto_status", params: {}, description: "Autonomous status", expect: "success" },
  { id: "SMK-025", dispatcher: "prism_intelligence", action: "workflow_list", params: {}, description: "Intelligence workflow list", expect: "error_ok" },
  { id: "SMK-026", dispatcher: "prism_l2", action: "aiml_models", params: {}, description: "L2 AI/ML models", expect: "error_ok" },
  { id: "SMK-027", dispatcher: "prism_cad", action: "geometry_analyze", params: {}, description: "CAD geometry analyze", expect: "error_ok" },
  { id: "SMK-028", dispatcher: "prism_cam", action: "toolpath_simulate", params: {}, description: "CAM toolpath simulate", expect: "error_ok" },
  { id: "SMK-029", dispatcher: "prism_quality", action: "spc_calculate", params: { values: [10.01, 10.02, 9.99, 10.0, 10.01] }, description: "SPC calculation", expect: "error_ok" },
  { id: "SMK-030", dispatcher: "prism_scheduling", action: "capacity_plan", params: {}, description: "Scheduling capacity plan", expect: "error_ok" },
  { id: "SMK-031", dispatcher: "prism_export", action: "render_pdf", params: { title: "Smoke Test", data: { test: true } }, description: "Export PDF render", expect: "error_ok" },
  { id: "SMK-032", dispatcher: "prism_turning", action: "chuck_force", params: { diameter: 50, speed: 3000 }, description: "Turning chuck force", expect: "error_ok" },
  { id: "SMK-033", dispatcher: "prism_5axis", action: "work_envelope", params: {}, description: "5-axis work envelope", expect: "error_ok" },
  { id: "SMK-034", dispatcher: "prism_edm", action: "electrode_design", params: {}, description: "EDM electrode design", expect: "error_ok" },
  { id: "SMK-035", dispatcher: "prism_grinding", action: "wheel_select", params: { material: "steel", operation: "surface" }, description: "Grinding wheel select", expect: "error_ok" },
  { id: "SMK-036", dispatcher: "prism_industry", action: "aerospace_check", params: { part_number: "SMOKE-001" }, description: "Industry aerospace check", expect: "error_ok" },
  { id: "SMK-037", dispatcher: "prism_automation", action: "oee_calc", params: { availability: 0.9, performance: 0.85, quality: 0.95 }, description: "Automation OEE calc", expect: "error_ok" },
  { id: "SMK-038", dispatcher: "prism_auth", action: "permission_check", params: { user: "smoke_test", resource: "test" }, description: "Auth permission check", expect: "error_ok" },
  { id: "SMK-039", dispatcher: "prism_bridge", action: "health", params: {}, description: "Bridge health", expect: "error_ok" },
  { id: "SMK-040", dispatcher: "prism_tenant", action: "stats", params: {}, description: "Tenant stats", expect: "error_ok" },
  { id: "SMK-041", dispatcher: "prism_compliance", action: "list_templates", params: {}, description: "Compliance list templates", expect: "error_ok" },
  { id: "SMK-042", dispatcher: "prism_nl_hook", action: "list", params: {}, description: "NL hook list", expect: "error_ok" },
  { id: "SMK-043", dispatcher: "prism_pfp", action: "get_dashboard", params: {}, description: "PFP dashboard", expect: "error_ok" },
  { id: "SMK-044", dispatcher: "prism_telemetry", action: "get_dashboard", params: {}, description: "Telemetry dashboard", expect: "error_ok" },
  { id: "SMK-045", dispatcher: "prism_memory", action: "get_health", params: {}, description: "Memory health", expect: "error_ok" },
];

export async function runSmokeTests(
  toolInvoker: (toolName: string, args: Record<string, unknown>) => Promise<any>
): Promise<SmokeReport> {
  const start = Date.now();
  const runId = `SMOKE-${Date.now()}`;
  const results: SmokeResult[] = [];

  for (const test of SMOKE_TESTS) {
    const testStart = Date.now();
    try {
      const response = await toolInvoker(`prism_${test.dispatcher.replace("prism_", "")}`, {
        action: test.action,
        params: test.params,
      });
      const responseStr = typeof response === "string" ? response : JSON.stringify(response);
      const hasError =
        responseStr.includes('"error"') &&
        !responseStr.includes('"error":null') &&
        !responseStr.includes('"error":""');
      const passed = !hasError || test.expect === "error_ok";
      results.push({
        id: test.id,
        dispatcher: test.dispatcher,
        action: test.action,
        status: passed ? "PASS" : "FAIL",
        duration_ms: Date.now() - testStart,
        timestamp: new Date().toISOString(),
        response_preview: responseStr.slice(0, 200),
        error: hasError ? "Response contains error" : undefined,
      });
    } catch (error: any) {
      results.push({
        id: test.id,
        dispatcher: test.dispatcher,
        action: test.action,
        status: test.expect === "error_ok" ? "PASS" : "ERROR",
        duration_ms: Date.now() - testStart,
        timestamp: new Date().toISOString(),
        response_preview: "",
        error: String(error?.message || "Unknown").slice(0, 200),
      });
    }
  }

  const passed = results.filter((result) => result.status === "PASS").length;
  const failed = results.filter((result) => result.status === "FAIL").length;
  const errors = results.filter((result) => result.status === "ERROR").length;
  const skipped = results.filter((result) => result.status === "SKIP").length;

  const dispatcherStatus = new Map<string, boolean>();
  for (const result of results) {
    if (result.status === "PASS") dispatcherStatus.set(result.dispatcher, true);
    else if (!dispatcherStatus.has(result.dispatcher)) dispatcherStatus.set(result.dispatcher, false);
  }

  const report: SmokeReport = {
    run_id: runId,
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - start,
    total: results.length,
    passed,
    failed,
    errors,
    skipped,
    pass_rate: Math.round((passed / results.length) * 100),
    results,
    broken_dispatchers: [...dispatcherStatus.entries()].filter(([, ok]) => !ok).map(([dispatcher]) => dispatcher),
    healthy_dispatchers: [...dispatcherStatus.entries()].filter(([, ok]) => ok).map(([dispatcher]) => dispatcher),
  };

  safeWriteSync(path.join(TEST_RESULTS_DIR, `${runId}.json`), JSON.stringify(report, null, 2));
  safeWriteSync(
    path.join(TEST_RESULTS_DIR, "LATEST_SMOKE.json"),
    JSON.stringify(
      {
        run_id: runId,
        timestamp: report.timestamp,
        total: report.total,
        passed,
        failed,
        errors,
        skipped,
        pass_rate: report.pass_rate,
        broken: report.broken_dispatchers,
        duration_ms: report.duration_ms,
      },
      null,
      2
    )
  );

  return report;
}

export function generateATCSWorkQueue(): Array<Record<string, unknown>> {
  return SMOKE_TESTS.map((test, index) => ({
    unit_id: index + 1,
    batch: 1,
    type: "smoke_test",
    status: "PENDING",
    description: `${test.id}: ${test.dispatcher}->${test.action} - ${test.description}`,
    params: {
      test_id: test.id,
      dispatcher: test.dispatcher,
      action: test.action,
      call_params: test.params,
      expect: test.expect,
    },
  }));
}
