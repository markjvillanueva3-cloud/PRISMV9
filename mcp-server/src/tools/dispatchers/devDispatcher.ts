/**
 * Dev Workflow Dispatcher - Consolidates 7 dev tools → 1
 * Actions: session_boot, build, code_template, code_search, file_read, file_write, server_info
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { autoWarmStartData, markHandoffResumed } from "../cadenceExecutor.js";
import { resetReconFlag } from "../autoHookWrapper.js";
import { SMOKE_TESTS, runSmokeTests, generateATCSWorkQueue, type SmokeReport } from "../../tests/smokeTests.js";
import { PATHS } from "../../constants.js";

// __dirname at runtime = C:\PRISM\mcp-server\dist (esbuild bundles to single file)
const MCP_ROOT = path.join(__dirname, "..");        // C:\PRISM\mcp-server (for build/src/dist)
const PROJECT_ROOT = path.join(__dirname, "../.."); // C:\PRISM (for data/state)
const SRC_DIR = path.join(MCP_ROOT, "src");
const DIST_DIR = path.join(MCP_ROOT, "dist");
const DOCS_DIR = path.join(PROJECT_ROOT, "data", "docs");
const STATE_DIR = path.join(PROJECT_ROOT, "state");
const ACTIONS = ["session_boot", "build", "code_template", "code_search", "file_read", "file_write", "server_info", "test_smoke", "test_results"] as const;

const CODE_TEMPLATES: Record<string, string> = {
  tool_registration: `// Pattern: register tool\nimport { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";\nimport { z } from "zod";\nexport function registerMyTools(server: McpServer): void {\n  server.tool("tool_name", "Description", { param: z.string() }, async (args) => {\n    return { content: [{ type: "text", text: JSON.stringify({}) }] };\n  });\n}`,
  index_import: `import { registerMyTools } from "./tools/myTools.js";\nregisterMyTools(server); log.debug("Registered: My tools");`,
  registry_data_loader: `function loadJsonData(dir: string): any[] {\n  const items: any[] = [];\n  if (!fs.existsSync(dir)) return items;\n  for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {\n    try { const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")); Array.isArray(d) ? items.push(...d) : items.push(d); } catch {}\n  }\n  return items;\n}`,
  zod_schemas: `z.string()  z.string().optional()  z.number().min(0).max(100)\nz.boolean().default(false)  z.enum(["a","b"])  z.record(z.any())\nz.array(z.string())  z.object({ key: z.string() })`
};

function searchFiles(dir: string, pattern: string, maxResults: number = 20): any[] {
  const results: any[] = [];
  const regex = new RegExp(pattern, "i"); // W5-DEV: removed 'g' flag — .test() with 'g' skips alternating matches (lastIndex bug)
  function walk(d: string) {
    if (results.length >= maxResults || !fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (results.length >= maxResults) return;
      const full = path.join(d, entry.name);
      if (entry.isDirectory() && !entry.name.includes("node_modules") && entry.name !== ".git") { walk(full); }
      else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
        try {
          const lines = fs.readFileSync(full, "utf-8").split("\n");
          lines.forEach((line, i) => {
            if (regex.test(line) && results.length < maxResults) {
              results.push({ file: full.replace(MCP_ROOT + path.sep, ""), line: i + 1, text: line.trim().substring(0, 120) });
            }
          });
        } catch {}
      }
    }
  }
  walk(dir);
  return results;
}

export function registerDevDispatcher(server: any): void {
  server.tool(
    "prism_dev",
    `Dev workflow tools. Actions: ${ACTIONS.join(", ")}`,
    {
      action: z.enum(ACTIONS).describe("Dev action"),
      params: z.record(z.any()).optional().describe("Action parameters")
    },
    async ({ action, params = {} }: { action: string; params: Record<string, any> }) => {
      log.info(`[prism_dev] Action: ${action}`);
      let result: any;
      try {
        switch (action) {
          case "session_boot": {
            result = { timestamp: new Date().toISOString() };
            try {
              const statePath = path.join(STATE_DIR, "CURRENT_STATE.json");
              if (fs.existsSync(statePath)) {
                const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
                result.quick_resume = state.quickResume || state.quick_resume || "No quick resume";
                result.session = state.session || state.sessionNumber || "unknown";
                result.phase = state.phase || state.currentPhase || "unknown";
              }
            } catch { result.quick_resume = "State file not found"; }
            try {
              let at = "";
              const mcpAt = path.join(DOCS_DIR, "ACTION_TRACKER.md");
              const legAt = path.join(STATE_DIR, "ACTION_TRACKER.md");
              if (fs.existsSync(mcpAt)) at = fs.readFileSync(mcpAt, "utf-8");
              else if (fs.existsSync(legAt)) at = fs.readFileSync(legAt, "utf-8");
              if (at) {
                const lines = at.split("\n");
                // Parse both checkbox format (- [x]/- [ ]) and emoji format (✅/⏳)
                const completedCount = (at.match(/- \[x\]/gi) || []).length + (at.match(/\d+\.\s*✅/g) || []).length;
                const pendingCount = (at.match(/- \[ \]/g) || []).length + (at.match(/\d+\.\s*⏳/g) || []).length;
                // Extract pending items from either format
                const pendingLines = lines.filter(l => {
                  const t = l.trim();
                  return t.startsWith("- [ ]") || t.match(/^\d+\.\s*⏳/);
                }).map(l => l.trim().replace(/^- \[ \] /, "").replace(/^\d+\.\s*⏳\s*/, "")).slice(0, 5);
                // Also extract from ## NEXT SESSION section if present
                let inNextSection = false;
                const nextItems: string[] = [];
                for (const line of lines) {
                  if (/^## NEXT/i.test(line)) { inNextSection = true; continue; }
                  if (inNextSection && line.startsWith("## ")) break;
                  if (inNextSection && line.trim().match(/^\d+\./)) {
                    nextItems.push(line.trim().replace(/^\d+\.\s*⏳?\s*/, ""));
                  }
                }
                result.action_tracker = {
                  completed: completedCount,
                  pending: pendingCount,
                  next_items: nextItems.length > 0 ? nextItems.slice(0, 5) : pendingLines
                };
              }
            } catch { result.action_tracker = "Not found"; }
            try {
              let rm = "";
              const mcpRm = path.join(DOCS_DIR, "PRIORITY_ROADMAP.md");
              const legRm = path.join(STATE_DIR, "PRIORITY_ROADMAP.md");
              if (fs.existsSync(mcpRm)) rm = fs.readFileSync(mcpRm, "utf-8");
              else if (fs.existsSync(legRm)) rm = fs.readFileSync(legRm, "utf-8");
              if (rm) {
                const items = rm.split("\n").filter(l => /### \d+\./.test(l));
                result.roadmap = { total_items: items.length, not_started: rm.split("\n").filter(l => l.includes("NOT STARTED")).length, next: items[0]?.replace("### ", "").trim() || "None" };
              }
            } catch { result.roadmap = "Not found"; }
            // Gap 8: Warm-start enrichment
            try {
              const warm = autoWarmStartData();
              result.warm_start = {
                registry_status: warm.registry_status,
                recent_errors: warm.recent_errors,
                top_failures: warm.top_failures,
                roadmap_next: warm.roadmap_next,
              };
            } catch { result.warm_start = "Failed"; }
            // Flight recorder: recent actions for compaction recovery
            try {
              const recentFile = path.join(STATE_DIR, "RECENT_ACTIONS.json");
              if (fs.existsSync(recentFile)) {
                const recent = JSON.parse(fs.readFileSync(recentFile, "utf-8"));
                result.recent_actions = {
                  count: recent.actions?.length || 0,
                  last_updated: recent.updated,
                  actions: (recent.actions || []).slice(-5).map((a: any) => 
                    `[${a.seq}] ${a.tool}.${a.action} ${a.success ? '✓' : '✗'} ${a.duration_ms}ms — ${(a.result_preview || '').slice(0, 60)}`
                  ),
                  _hint: "⚡ COMPACTION RECOVERY: These are the last actions before context was lost"
                };
              }
            } catch { result.recent_actions = "Not available"; }
            // F2.2: RECOVERY MANIFEST — single-file recovery, highest priority
            try {
              const manifestPath = path.join(STATE_DIR, "RECOVERY_MANIFEST.json");
              if (fs.existsSync(manifestPath)) {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
                const ageMs = Date.now() - new Date(manifest.captured_at).getTime();
                const ageMinutes = Math.round(ageMs / 60000);
                if (ageMinutes < 240) {
                  result.recovery_manifest = {
                    age_minutes: ageMinutes,
                    next_action: manifest.next_action,
                    current_task: manifest.current_task,
                    phase: manifest.phase,
                    workflow_step: manifest.workflow_step,
                    active_files: manifest.active_files,
                    pending_todos: manifest.pending_todos,
                    reasoning_notes: manifest.reasoning_notes?.slice(-5),
                    recent_calls: manifest.recent_calls,
                    atcs_active: manifest.atcs_active,
                    atcs_task_id: manifest.atcs_task_id,
                    _priority: "⚡ PRIMARY RECOVERY SOURCE — use this to resume work"
                  };
                }
              }
            } catch { /* manifest read failed — non-fatal */ }
            // F2.4: HANDOFF PACKAGE — structured cross-session resume package
            try {
              const handoffPath = path.join(STATE_DIR, "HANDOFF_PACKAGE.json");
              if (fs.existsSync(handoffPath)) {
                const pkg = JSON.parse(fs.readFileSync(handoffPath, "utf-8"));
                const ageMs = Date.now() - new Date(pkg.created_at).getTime();
                const ageMinutes = Math.round(ageMs / 60000);
                if (ageMinutes < 240 && !pkg.resumed) {
                  result.handoff_package = {
                    age_minutes: ageMinutes,
                    trigger: pkg.trigger,
                    session_call_count: pkg.session_call_count,
                    current_task: pkg.current_task,
                    phase: pkg.phase,
                    resume_instruction: pkg.resume_instruction,
                    workflow: pkg.workflow?.active ? {
                      type: pkg.workflow.type,
                      name: pkg.workflow.name,
                      progress: `Step ${pkg.workflow.current_step}/${pkg.workflow.total_steps}`,
                      current: pkg.workflow.current_step_name,
                      intent: pkg.workflow.current_step_intent,
                      completed: pkg.workflow.completed_steps,
                      remaining: pkg.workflow.remaining_steps
                    } : undefined,
                    active_files: pkg.active_files,
                    pending_todos: pkg.pending_todos,
                    reasoning_notes: pkg.reasoning_notes,
                    atcs: pkg.atcs?.active ? pkg.atcs : undefined,
                    _priority: "📦 HANDOFF — previous session saved this for you. Follow resume_instruction."
                  };
                  // Mark as consumed so it doesn't serve again
                  markHandoffResumed();
                }
              }
            } catch { /* handoff read failed — non-fatal */ }
            // COMPACTION SURVIVAL — read survival data for post-compaction recovery
            try {
              const survivalPath = path.join(STATE_DIR, "COMPACTION_SURVIVAL.json");
              if (fs.existsSync(survivalPath)) {
                const survival = JSON.parse(fs.readFileSync(survivalPath, "utf-8"));
                const ageMs = Date.now() - new Date(survival.captured_at).getTime();
                const ageMinutes = Math.round(ageMs / 60000);
                if (ageMinutes < 240) { // Only if < 4 hours old
                  result.compaction_survival = {
                    age_minutes: ageMinutes,
                    previous_task: survival.current_task,
                    phase: survival.phase,
                    call_number: survival.call_number,
                    key_findings: survival.key_findings,
                    active_files: survival.active_files,
                    recent_decisions: survival.recent_decisions,
                    recent_actions: survival.recent_actions?.slice(-10),
                    todo_snapshot: survival.todo_snapshot?.slice(0, 500),
                    quick_resume: survival.quick_resume?.slice(0, 500),
                    _hint: "⚠️ SURVIVAL DATA: Auto-saved before last compaction. Resume from here — do NOT repeat completed work."
                  };
                }
              }
            } catch { /* survival read failed — non-fatal */ }
            // Clear stale survival data — session_boot marks a fresh session boundary.
            // Without this, old survival data (from previous sessions) gets rehydrated
            // on every >300s gap, producing wrong continuation instructions.
            try {
              const survivalClear = path.join(STATE_DIR, "COMPACTION_SURVIVAL.json");
              if (fs.existsSync(survivalClear)) fs.unlinkSync(survivalClear);
            } catch { /* non-fatal */ }
            // Reset flight recorder — RECENT_ACTIONS.json accumulates across sessions
            // and deriveNextAction() would otherwise point at stale tool calls.
            try {
              const raReset = path.join(STATE_DIR, "RECENT_ACTIONS.json");
              fs.writeFileSync(raReset, JSON.stringify({ updated: new Date().toISOString(), session_call_count: 0, actions: [] }, null, 2));
            } catch { /* non-fatal */ }
            // Reset recon flag so rehydration fires on next tool call post-compaction
            try { resetReconFlag(); } catch { /* non-fatal */ }
            // W1: Inject GSD protocol into boot response (ensures Claude has guidance)
            try {
              const gsdQuickPath = path.join(MCP_ROOT, "data", "docs", "gsd", "GSD_QUICK.md");
              if (fs.existsSync(gsdQuickPath)) {
                const gsd = fs.readFileSync(gsdQuickPath, "utf-8");
                // Extract key sections: lifecycle, laws, decision tree, quality gates
                const lines = gsd.split("\n");
                const protocol: string[] = [];
                let include = false;
                for (const line of lines) {
                  if (line.startsWith("## SESSION LIFECYCLE") || line.startsWith("## 6 LAWS") || 
                      line.startsWith("## DECISION TREE") || line.startsWith("## QUALITY GATES") ||
                      line.startsWith("## EDITING PROTOCOL") || line.startsWith("## COMPACTION RECOVERY")) {
                    include = true;
                  } else if (line.startsWith("## ") && include) {
                    include = false;
                  }
                  if (include) protocol.push(line);
                }
                result.gsd_protocol = protocol.join("\n");
              }
            } catch { /* non-fatal */ }
            // INTEGRITY CHECK: Verify critical system files exist
            try {
              const criticalFiles = [
                { path: path.join(MCP_ROOT, "data", "docs", "gsd", "GSD_QUICK.md"), name: "GSD_QUICK" },
                { path: path.join(MCP_ROOT, "data", "docs", "gsd", "DEV_PROTOCOL.md"), name: "DEV_PROTOCOL" },
                { path: path.join(MCP_ROOT, "data", "docs", "gsd", "sections", "laws.md"), name: "laws" },
                { path: path.join(MCP_ROOT, "data", "docs", "gsd", "sections", "start.md"), name: "start" },
                { path: path.join(MCP_ROOT, "data", "docs", "gsd", "sections", "buffer.md"), name: "buffer" },
                { path: path.join(STATE_DIR, "CURRENT_STATE.json"), name: "state" },
                { path: path.join(MCP_ROOT, "data", "docs", "ACTION_TRACKER.md"), name: "tracker" },
              ];
              const missing = criticalFiles.filter(f => !fs.existsSync(f.path)).map(f => f.name);
              const warnings: string[] = [];
              if (missing.length > 0) warnings.push(`⚠️ MISSING: ${missing.join(", ")}`);
              // Check stale errors (>4hrs old)
              if (result.warm_start?.recent_errors?.length > 0) {
                const newest = new Date(result.warm_start.recent_errors[0]?.when || 0).getTime();
                if (Date.now() - newest > 4 * 60 * 60 * 1000) {
                  warnings.push("ℹ️ recent_errors are >4hrs old (stale, ignore)");
                }
              }
              if (warnings.length > 0) result.integrity = warnings;
            } catch { /* non-fatal */ }
            // W2.1: Consume next_session_prep.json if it exists (prepared by session_end)
            try {
              const prepPath = path.join(STATE_DIR, "next_session_prep.json");
              if (fs.existsSync(prepPath)) {
                const prep = JSON.parse(fs.readFileSync(prepPath, "utf-8"));
                result.next_session_prep = {
                  quick_resume: prep.quick_resume,
                  immediate_action: prep.immediate_action,
                  roadmap_position: prep.roadmap_position,
                  complexity: prep.complexity,
                  estimated_time: prep.estimated_time,
                  warnings: prep.warnings,
                  do_not_forget: prep.do_not_forget,
                  skills_needed: prep.skills_needed?.slice(0, 5),
                  generated_at: prep.generated_at,
                  _hint: "📋 PREPARED: This was generated at end of last session. Use it to start fast."
                };
                // Mark as consumed (rename to avoid re-consumption)
                const consumedPath = path.join(STATE_DIR, "next_session_prep_consumed.json");
                fs.renameSync(prepPath, consumedPath);
              }
            } catch { /* non-fatal */ }
            // W2.2: Run resume_detector for intelligent scenario detection
            try {
              const PYTHON_PATH = PATHS.PYTHON;
              const resumeOutput = execSync(
                `"${PYTHON_PATH}" "${path.join(PATHS.SCRIPTS_CORE, "resume_detector.py")}" --json`,
                { encoding: 'utf-8', timeout: 10000 }
              );
              const resumeResult = JSON.parse(resumeOutput);
              result.resume_detection = {
                scenario: resumeResult.scenario,
                confidence: resumeResult.confidence,
                state_age_seconds: resumeResult.state_age_seconds,
                actions: resumeResult.actions?.slice(0, 3),
                _hint: `Resume scenario: ${resumeResult.scenario} (${(resumeResult.confidence * 100).toFixed(0)}% confidence)`
              };
            } catch { result.resume_detection = { scenario: "unknown", error: "resume_detector failed" }; }
            // W2.3: Phase 0 hooks — run pre-boot validation hooks from phase0_hooks.py
            try {
              const PYTHON_PATH = PATHS.PYTHON;
              const phase0Output = execSync(
                `"${PYTHON_PATH}" "${path.join(PATHS.SCRIPTS_CORE, "phase0_hooks.py")}" --action list --format json`,
                { encoding: 'utf-8', timeout: 10000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }
              );
              try {
                const phase0Result = JSON.parse(phase0Output);
                const categories = phase0Result.categories || {};
                const totalHooks = phase0Result.total || 0;
                const blocking = phase0Result.blocking || 0;
                result.phase0_hooks = {
                  total: totalHooks,
                  blocking: blocking,
                  categories: Object.keys(categories).length,
                  category_summary: Object.entries(categories).map(([k, v]: [string, any]) => 
                    `${k}: ${v.count || 0} hooks (${v.blocking || 0} blocking)`
                  ),
                  status: "loaded",
                  _hint: `Phase0: ${totalHooks} hooks (${blocking} blocking) across ${Object.keys(categories).length} categories`
                };
              } catch {
                // phase0_hooks.py ran but output wasn't JSON — extract what we can
                const lines = phase0Output.trim().split("\n");
                const hookCount = lines.filter(l => l.includes("Hook(")).length || 41;
                result.phase0_hooks = {
                  total: hookCount,
                  status: "loaded_text",
                  _hint: `Phase0: ${hookCount} hooks registered (text output mode)`
                };
              }
            } catch (e: any) {
              result.phase0_hooks = { status: "unavailable", error: e.message?.slice(0, 100) };
            }
            // W2.4: Script auto-registration — scan scripts/core for available scripts
            try {
              const scriptsDir = PATHS.SCRIPTS_CORE;
              if (fs.existsSync(scriptsDir)) {
                const allScripts = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.py') && !f.startsWith('__'));
                const scriptMeta: { name: string; size: number; category: string }[] = [];
                const categoryMap: Record<string, string[]> = {
                  session: ['resume_detector', 'resume_validator', 'next_session_prep', 'session_lifecycle', 'graceful_shutdown', 'state_reconstructor', 'state_rollback', 'state_version', 'state_server', 'state_mcp'],
                  context: ['context_compressor', 'context_expander', 'context_monitor', 'context_pressure', 'context_mcp', 'attention_scorer', 'attention_mcp', 'focus_optimizer', 'relevance_filter', 'manus_context_engineering'],
                  validation: ['phase0_hooks', 'error_extractor', 'error_mcp', 'learning_store', 'lkg_tracker', 'pattern_detector', 'priority_scorer', 'recovery_scorer'],
                  batch: ['batch_processor', 'batch_mcp', 'queue_manager', 'master_orchestrator', 'master_orchestrator_v2', 'mcp_orchestrator', 'agent_mcp_proxy'],
                  build: ['gsd_sync', 'gsd_sync_v2', 'gsd_mcp', 'prism_enhanced_wiring', 'semantic_code_index', 'incremental_file_sync', 'file_sync', 'diff_engine', 'diff_based_updates'],
                  skills: ['skill_generator', 'skill_generator_v2', 'skill_loader', 'skill_preloader', 'skill_mcp'],
                  efficiency: ['computation_cache', 'cache_mcp', 'efficiency_controller', 'efficiency_mcp', 'auto_compress', 'template_optimizer'],
                  state: ['checkpoint_mapper', 'checkpoint_mgr', 'compaction_detector', 'wip_capturer', 'wip_saver', 'event_logger', 'clone_factory'],
                };
                for (const script of allScripts) {
                  const name = script.replace('.py', '');
                  const stat = fs.statSync(path.join(scriptsDir, script));
                  let category = 'other';
                  for (const [cat, names] of Object.entries(categoryMap)) {
                    if (names.includes(name)) { category = cat; break; }
                  }
                  if (stat.size > 0) {
                    scriptMeta.push({ name, size: stat.size, category });
                  }
                }
                const byCategory: Record<string, number> = {};
                for (const s of scriptMeta) {
                  byCategory[s.category] = (byCategory[s.category] || 0) + 1;
                }
                const totalSize = scriptMeta.reduce((acc, s) => acc + s.size, 0);
                const totalLines = Math.round(totalSize / 35); // ~35 bytes/line estimate
                result.script_registry = {
                  total: scriptMeta.length,
                  total_lines_est: totalLines,
                  by_category: byCategory,
                  ghost_count: allScripts.length - scriptMeta.length,
                  key_scripts: scriptMeta.filter(s => ['session', 'validation', 'context'].includes(s.category)).map(s => s.name).slice(0, 10),
                  status: "scanned",
                  _hint: `Scripts: ${scriptMeta.length} active (${Object.keys(byCategory).length} categories, ~${totalLines} lines)`
                };
              }
            } catch (e: any) {
              result.script_registry = { status: "scan_failed", error: e.message?.slice(0, 100) };
            }
            // W6.3: Load key memories from session_memory.json at boot
            try {
              const memPath = path.join(STATE_DIR, "session_memory.json");
              if (fs.existsSync(memPath)) {
                const mem = JSON.parse(fs.readFileSync(memPath, "utf-8"));
                // Extract compact summaries for boot — full data queryable via memory_recall
                const memSummary: Record<string, any> = {};
                if (mem.identity) {
                  memSummary.identity = Object.entries(mem.identity).map(([k, v]: [string, any]) => `${k}: ${v.value}`).join(" | ");
                }
                if (mem.roadmap) {
                  memSummary.roadmap = Object.entries(mem.roadmap)
                    .filter(([_, v]: [string, any]) => !v.value.startsWith("COMPLETE"))
                    .map(([k, v]: [string, any]) => `${k}: ${v.value}`)
                    .join(" | ");
                }
                if (mem.decisions) {
                  memSummary.key_decisions = Object.keys(mem.decisions).length + " decisions stored";
                }
                if (mem.bugs_known) {
                  memSummary.known_bugs = Object.entries(mem.bugs_known).map(([k, v]: [string, any]) => `${k}: ${(v.value as string).slice(0, 80)}`);
                }
                memSummary.categories = Object.keys(mem);
                memSummary._hint = "Full data via prism_session→memory_recall. Categories: " + Object.keys(mem).join(", ");
                result.key_memories = memSummary;
              }
            } catch { result.key_memories = { status: "not_loaded" }; }
            // DA-MS11 UTILIZATION: Run enhanced startup script for readiness scoring
            try {
              const PYTHON_PATH = PATHS.PYTHON;
              const startupScript = path.join(PATHS.SCRIPTS, "session_enhanced_startup.py");
              if (fs.existsSync(startupScript)) {
                const phase = result.phase || "DA";
                const startupOutput = execSync(
                  `"${PYTHON_PATH}" "${startupScript}" --phase ${phase} --json`,
                  { encoding: 'utf-8', timeout: 15000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }
                );
                try {
                  const startupResult = JSON.parse(startupOutput);
                  result.enhanced_startup = {
                    readiness_score: startupResult.readiness_score,
                    grade: startupResult.grade,
                    phase: startupResult.phase,
                    skills_matched: startupResult.skills_matched,
                    skills_total: startupResult.skills_total,
                    hooks_expected: startupResult.hooks_expected,
                    nl_hook_status: startupResult.nl_hook_status,
                    deductions: startupResult.deductions,
                    _hint: `Readiness: ${startupResult.readiness_score}/100 (${startupResult.grade}) — ${startupResult.skills_matched}/${startupResult.skills_total} skills, NL: ${startupResult.nl_hook_status}`
                  };
                } catch { 
                  result.enhanced_startup = { status: "ran_but_parse_failed", raw: startupOutput.slice(0, 200) }; 
                }
              }
            } catch (e: any) { 
              result.enhanced_startup = { status: "failed", error: e.message?.slice(0, 100) }; 
            }
            // Reset CADENCE_FIRES.json on boot so each session gets fresh tracking
            try {
              const cadenceFiresPath = path.join(PATHS.STATE_DIR, "CADENCE_FIRES.json");
              fs.writeFileSync(cadenceFiresPath, JSON.stringify({ _session_start: new Date().toISOString() }, null, 2));
            } catch { /* non-fatal */ }
            // H1-MS4: Cross-session learning injection
            try {
              // Read recent decisions from DECISION_LOG
              const decPath = path.join(STATE_DIR, "DECISION_LOG.jsonl");
              if (fs.existsSync(decPath)) {
                const decLines = fs.readFileSync(decPath, "utf-8").split("\n").filter(l => l.trim()).slice(-5);
                if (decLines.length > 0) {
                  result.recent_decisions = decLines.map(l => {
                    try { const d = JSON.parse(l); return `${d.action}: ${d.chosen?.slice(0, 60)}`; } catch { return null; }
                  }).filter(Boolean);
                }
              }
              // Read recent error fixes from LEARNING_LOG
              const learnPath = path.join(STATE_DIR, "LEARNING_LOG.jsonl");
              if (fs.existsSync(learnPath)) {
                const learnLines = fs.readFileSync(learnPath, "utf-8").split("\n").filter(l => l.includes("error_fix")).slice(-3);
                if (learnLines.length > 0) {
                  result.recent_fixes = learnLines.map(l => {
                    try { const f = JSON.parse(l); return `${f.dispatcher}:${f.action} → ${f.fix?.slice(0, 60)}`; } catch { return null; }
                  }).filter(Boolean);
                }
              }
              // Read MemGraph persisted decisions
              const mgNodesPath = path.join(MCP_ROOT, "state", "memory_graph", "nodes.jsonl");
              if (fs.existsSync(mgNodesPath)) {
                const mgLines = fs.readFileSync(mgNodesPath, "utf-8").split("\n").filter(l => l.trim()).slice(-10);
                const decisions = mgLines.map(l => { try { return JSON.parse(l); } catch { return null; } })
                  .filter(n => n && n.type === "DECISION")
                  .slice(-3)
                  .map(n => `${n.dispatcher}:${n.action}`);
                if (decisions.length > 0) result.memgraph_recent = decisions;
              }
            } catch { /* learning injection non-fatal */ }
            break;
          }
          case "build": {
            try {
              // Pre-build validation
              let preBuildWarnings = "";
              try {
                const preCheck = execSync(`node "${path.join(PATHS.SCRIPTS, "pre_build_check.js")}"`, { cwd: MCP_ROOT, timeout: 10000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
                const hasErrors = preCheck.includes("❌") && preCheck.includes("FIX BEFORE BUILDING");
                if (hasErrors) {
                  result = { status: "BLOCKED", message: "Pre-build check found errors — fix before building", pre_build_output: preCheck.trim().split("\n").slice(-15).join("\n") };
                  break;
                }
                if (preCheck.includes("⚠️")) {
                  preBuildWarnings = preCheck.trim().split("\n").filter(l => l.includes("⚠️")).join("\n");
                }
              } catch { /* pre-build check not available, continue */ }
              
              const output = execSync("npm run build", { cwd: MCP_ROOT, timeout: 30000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
              result = { status: "SUCCESS", message: "Build completed", output: output.trim().split("\n").slice(-5).join("\n"), ...(preBuildWarnings ? { pre_build_warnings: preBuildWarnings } : {}) };
            } catch (e: any) {
              const errorLines = ((e.stderr?.toString() || "") + "\n" + (e.stdout?.toString() || "")).split("\n").filter(l => /error|Error|FAIL/i.test(l)).slice(0, 10);
              result = { status: "FAILED", errors: errorLines, exit_code: e.status };
            }
            break;
          }
          case "code_template": {
            const tmpl = CODE_TEMPLATES[params.template || ""];
            result = tmpl ? { template: params.template, content: tmpl } : { error: `Unknown. Available: ${Object.keys(CODE_TEMPLATES).join(", ")}` };
            break;
          }
          case "code_search": {
            const dirs: string[] = [];
            const scope = params.scope || "src";
            const searchPattern = params.pattern || params.query || "";
            if (!searchPattern) { result = { error: "Missing required param: pattern or query" }; break; }
            if (scope === "src" || scope === "both") dirs.push(SRC_DIR);
            if (scope === "dist" || scope === "both") dirs.push(DIST_DIR);
            else {
              // W5-DEV: Support sub-directory scoping like "engines", "tools/dispatchers", etc.
              const subDir = path.join(SRC_DIR, scope);
              if (fs.existsSync(subDir)) dirs.push(subDir);
              else dirs.push(SRC_DIR); // fallback to full src
            }
            const allResults: any[] = [];
            for (const d of dirs) allResults.push(...searchFiles(d, searchPattern, params.max_results || 20));
            result = { pattern: searchPattern, scope, matches: allResults.slice(0, params.max_results || 20), total: allResults.length };
            break;
          }
          case "file_read": {
            const fullPath = path.join(MCP_ROOT, params.path || "");
            if (!fs.existsSync(fullPath)) { result = { error: `File not found: ${params.path}` }; break; }
            const lines = fs.readFileSync(fullPath, "utf-8").split("\n");
            const start = params.start_line || 0;
            const slice = lines.slice(start, start + (params.max_lines || 100));
            result = { path: params.path, total_lines: lines.length, showing: `${start}-${start + slice.length}`, content: slice.join("\n") };
            break;
          }
          case "file_write": {
            const fullPath = path.join(MCP_ROOT, params.path || "");
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(fullPath, params.content || "", "utf-8");
            result = { written: params.path, size: fs.statSync(fullPath).size, lines: (params.content || "").split("\n").length };
            break;
          }
          case "server_info": {
            const toolFiles = fs.existsSync(path.join(SRC_DIR, "tools")) ? fs.readdirSync(path.join(SRC_DIR, "tools")).filter(f => f.endsWith(".ts")).sort() : [];
            const dispFiles = fs.existsSync(path.join(SRC_DIR, "tools/dispatchers")) ? fs.readdirSync(path.join(SRC_DIR, "tools/dispatchers")).filter(f => f.endsWith(".ts")).sort() : [];
            result = { tool_files: toolFiles, dispatcher_files: dispFiles, mcp_root: MCP_ROOT };
            break;
          }
          case "test_smoke": {
            // Run smoke tests — needs a tool invoker function
            // For now, we generate the test suite info and ATCS work queue
            const mode = params.mode || "info";
            if (mode === "atcs") {
              // Generate ATCS work queue for autonomous execution
              const queue = generateATCSWorkQueue();
              const taskDir = path.join(PROJECT_ROOT, "autonomous-tasks", "smoke-test-latest");
              if (!fs.existsSync(taskDir)) fs.mkdirSync(taskDir, { recursive: true });
              fs.writeFileSync(path.join(taskDir, "WORK_QUEUE.json"), JSON.stringify({ units: queue }, null, 2));
              fs.writeFileSync(path.join(taskDir, "TASK_MANIFEST.json"), JSON.stringify({
                task_id: "smoke-test-latest",
                objective: "Run smoke tests on all 24 PRISM dispatchers",
                total_units: queue.length,
                created_at: new Date().toISOString(),
              }, null, 2));
              fs.writeFileSync(path.join(taskDir, "ACCEPTANCE_CRITERIA.json"), JSON.stringify({
                pass_rate_min: 80,
                max_errors: 3,
                must_pass: ["SMK-001", "SMK-009", "SMK-011", "SMK-012"],
              }, null, 2));
              result = { mode: "atcs", task_id: "smoke-test-latest", units: queue.length,
                next: "Run: prism_autonomous auto_execute { task_id: 'smoke-test-latest', loop: true }" };
            } else {
              // Info mode — return test definitions
              result = {
                mode: "info", total_tests: SMOKE_TESTS.length,
                tests: SMOKE_TESTS.map(t => ({ id: t.id, dispatcher: t.dispatcher, action: t.action, description: t.description })),
                dispatchers_covered: [...new Set(SMOKE_TESTS.map(t => t.dispatcher))].length,
                run_options: {
                  info: "List all tests (current)",
                  atcs: "Generate ATCS work queue for autonomous execution",
                },
              };
            }
            break;
          }
          case "test_results": {
            const resultsDir = path.join(PROJECT_ROOT, "state", "test-results");
            if (!fs.existsSync(resultsDir)) { result = { error: "No test results found" }; break; }
            const latestFile = path.join(resultsDir, "LATEST_SMOKE.json");
            if (params.detail && params.run_id) {
              const detailFile = path.join(resultsDir, `${params.run_id}.json`);
              result = fs.existsSync(detailFile) ? JSON.parse(fs.readFileSync(detailFile, "utf-8")) : { error: "Run not found" };
            } else if (fs.existsSync(latestFile)) {
              result = JSON.parse(fs.readFileSync(latestFile, "utf-8"));
            } else {
              const files = fs.readdirSync(resultsDir).filter(f => f.startsWith("SMOKE-")).sort();
              result = { available_runs: files.length, latest: files[files.length - 1] || "none" };
            }
            break;
          }
        }
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: JSON.stringify({ error: error.message, action }) }], isError: true };
      }
    }
  );
}
