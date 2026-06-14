#!/usr/bin/env node
/**
 * claude-md-collapse-milestones.mjs — U-OBF-F2, OBSIDIAN-BRAIN-FIX-MS0.
 *
 * Collapses milestone-narrative sections in CLAUDE.md to one-line pointers
 * (header + summary + wiki + memory links). Each milestone already has a
 * `knowledge/wiki/architecture/<slug>.md` entry — the full detail lives
 * there; CLAUDE.md should be a ≤200-line doctrine pointer index per its
 * own KNOWLEDGE VAULT section, not a 50KB narrative archive.
 *
 * Doctrine sections (process rules: SCRUTINY GATE, MANDATORY
 * SELF-AWARENESS, BUILD/TEST/CI, etc.) are NOT touched — they encode
 * operational rules that need to be in-context, not pointers.
 *
 * Atomic-write + idempotent (re-run with the same spec is a no-op).
 * Dry-run via --dry-run; --json for machine output.
 *
 * Pure-core: collapseSection(text, headerPrefix, replacement)
 * FS layer: run()
 */
import fs from "node:fs";

const CLAUDE_MD = process.env.PRISM_CLAUDE_MD || "H:/prism/CLAUDE.md";

/**
 * The collapse spec. Each entry:
 *   - headerPrefix — startsWith match on the section's `## ...` line. Must
 *     uniquely identify ONE section. The match is case-sensitive and
 *     starts-with (so `## FLEET-REAPER-MS0 ` matches but not `## FLEET-REAPER-MS1`).
 *   - replacement — the single line to substitute for the entire section
 *     (header through the last non-blank line before the next `## ` or EOF).
 */
export const COLLAPSE_SPEC = [
  {
    headerPrefix: "## SESSION CONTINUITY STACK",
    replacement:
      "## SESSION CONTINUITY STACK (2026-05-15) — terminal-pin + auto-resume on /compact + auto-precompact + per-subagent pre-search across the up-to-13-chat fleet. Wiki: [[session-continuity-stack]] · [[subagent-per-task-presearch]]. Memory: [[reference_session_continuity_stack_2026_05_15]] · [[reference_twid_resolver_cache_2026_05_15]] · [[reference_precompact_hook_autowrite_2026_05_15]] · [[feedback_fleet_design_10_chats]] · [[feedback_reflect_all_changes_post_update]].",
  },
  {
    headerPrefix: "## GOLF SLOT (7th hygiene chat",
    replacement:
      "## GOLF SLOT — fleet-hygiene-only chat (write-allowlist + self-DOS deny + slot-keyed handoff). Claim with `/checkin --golf`. Knobs: `PRISM_GOLF_DISABLE` (planned), `PRISM_GOLF_FAIL_CLOSED=1` (deny-all), `PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1` (logged). Detail: [[feedback_golf_owns_reaper]]; reaper ownership SUPERSEDED alpha→golf 2026-05-16.",
  },
  {
    headerPrefix: "## KNOWLEDGE VAULT — 5-namespace schema",
    replacement:
      "## KNOWLEDGE VAULT (U-VAULT01, 2026-05-15) — memory + wiki + commands + handoffs + specs. CLAUDE.md is the doctrine POINTER INDEX (≤200 lines), NOT a 6th namespace. Promotion: fleeting → memory → wiki → CLAUDE.md pointer. Schema: [`knowledge/wiki/architecture/knowledge-vault-schema.md`]. Bug-finding→wiki gate hook: `stop-bug-finding-wiki-gate.mjs` (advisory). Memory: [[reference_u_vault01_knowledge_vault_schema]] · [[feedback_always_update_wiki_on_bug_finding]].",
  },
  {
    headerPrefix: "## DEV PRODUCTIVITY HOOKS",
    replacement:
      "## DEV PRODUCTIVITY HOOKS (2026-05-14) — 3 UserPromptSubmit injectors fire on slash-command keywords: `loop-iteration-inject` (`/loop`), `pick-prefresh-inject` (`/pick-unit`/`/pick-task`/`/checkin`/`/pick-build-close`), `goal-prereq-inject` (`/goal`). Knobs: `PRISM_LOOP_INJECT_DISABLE` · `PRISM_PICK_PREFRESH_DISABLE` · `PRISM_GOAL_PREREQ_DISABLE`. Companion artifacts: `.claude/helpers/loop-state.mjs`, `scripts/hook-health-check.mjs`, `/pick-build-close` skill. Wiki: [[dev-velocity-autotrigger]]. Memory: [[reference_dev_velocity_autotrigger]].",
  },
  {
    headerPrefix: "## GOAL-COMPLETE GATE",
    replacement:
      "## GOAL-COMPLETE GATE (2026-05-13) — `.claude/hooks/goal-complete-gate.mjs` (Stop, Tier-0) blocks task completion if /goal was invoked this session AND `state/shared/CLOSE-OUT-CANDIDATES.json` is stale (>2h, knob `PRISM_GOAL_GATE_STALE_HRS`) OR untriaged candidates exist (must appear in last-30 commit bodies OR `CLOSE-OUT-DEFERRED.md`). Disable: `PRISM_GOAL_GATE_DISABLE=1`. Bypass (logged): `PRISM_GOAL_GATE_AUDIT_BYPASS=1`. Wiki: [[close-out-audit]].",
  },
  {
    headerPrefix: "## CLOSE-OUT AUTOMATION",
    replacement:
      "## CLOSE-OUT AUTOMATION (2026-05-13) — `scripts/audit-close-out-candidates.mjs` surfaces silent close-out debt (shipped artifacts vs envelope `pending`). Skill: `/close-out-audit`. Hook: `.claude/hooks/close-out-audit-suggest.mjs` (UserPromptSubmit, advisory). Reports: `state/shared/CLOSE-OUT-CANDIDATES.{json,md}` (`advisoryOnly:true, mustHumanVerify:true`). Knobs: `PRISM_CLOSE_OUT_AUDIT_INJECT=0` · `PRISM_CLOSE_OUT_AUDIT_STALE_HRS=N` · `PRISM_CLOSE_OUT_AUDIT_K=N`. Wiki: [[close-out-audit]].",
  },
  {
    headerPrefix: "## MISC-TASKS INVENTORY",
    replacement:
      "## MISC-TASKS INVENTORY (2026-05-16) — 318 orphaned incomplete tasks extracted across 912 transcripts + 504 handoffs + 25 debt files. Spec: `state/shared/specs/MISC-TASKS-INVENTORY.{json,md,html}` (advisory). Surfaced in /system-viz `ghost.misc_tasks` roost. Wiki: [[misc-tasks-extraction]]. Memory: [[misc-tasks-extraction-2026-05-16]].",
  },
  {
    headerPrefix: "## ROADMAP CONSOLIDATION",
    replacement:
      "## ROADMAP CONSOLIDATION (2026-05-16) — `scripts/consolidate-roadmaps.mjs` unifies MILESTONE_PROGRESS + roadmap-index + envelopes + BUILD_STATE + MISC-TASKS + prose-roadmap extraction. Spec: `state/shared/specs/ROADMAP-CONSOLIDATED.{json,md,html}` (849 milestones, 4497 pending, 26 wiring + 16 deep-integration bridges, advisory). Surfaced as /system-viz `ghost.bridge_synergy` roost. Wiki: [[roadmap-consolidation]]. Memory: [[roadmap-consolidation-2026-05-16]].",
  },
  {
    headerPrefix: "## `/checkin-<nato> /loop <task>`",
    replacement:
      "## /checkin-<nato> /loop <task> (2026-05-16) — single canonical entry: slot-claim → slot-worktree cutover → routing hooks → injection chain → roadmap pickup → autonomous-loop (`/checkin` Step 12) → slot-routed commits → auto-handoff across /compact. Detail: [[checkin]]. Wiki: [[checkin-loop-fullstack]]. Memory: [[checkin-loop-fullstack-2026-05-16]].",
  },
  {
    headerPrefix: "## DEV-VELOCITY-AUTOTRIGGER-MS0",
    replacement:
      "## DEV-VELOCITY-AUTOTRIGGER-MS0 (2026-05-12..13) — 13 units: 11 skills + `skill-auto-trigger.mjs` UserPromptSubmit hook reading `knowledge/wiki/architecture/_skill-triggers.jsonl` (regenerated by `extract-skill-triggers.mjs`). Top-K suggest-only, knob `PRISM_SKILL_AUTO_TRIGGER_DISABLE=1`. Memory: [[reference_dev_velocity_autotrigger]].",
  },
  {
    headerPrefix: "## WEDM AGI Status",
    replacement:
      "## WEDM AGI Status — 62 engines + 101 tests + 23 skills + 14 formulas + 46 tribal tips + 5 controller dialects + 5 MIT courses + 26 indexed JM Die programs. SVI psi 0.875. Re-generate via `wedm_generate_digest.ts`. Detail: `knowledge/wiki/architecture/wedm-status.md`.",
  },
  {
    headerPrefix: "## OLLAMA OFFLOAD DASHBOARD",
    replacement:
      "## OLLAMA OFFLOAD DASHBOARD (P0-U03) — `node scripts/ollama-offload-dashboard.mjs [--json|--window=48h|--reset]`. State: `mcp-server/data/state/ollama-offload-stats.json` (schemaVersion 2.0.0). Healthy install: offload rate ≥30%. `offloaded=0, keptOnClaude>0` → Ollama unreachable; check `http://127.0.0.1:11434/api/tags` + `.claude/cache/ollama-rate-limit.json`. Wiki: [[ollama-pipeline-ms0]]. Memory: [[reference_ollama_pipeline_ms0_2026_05_15]].",
  },
  {
    headerPrefix: "## KNOWLEDGE-CONVERSION-MS0",
    replacement:
      "## KNOWLEDGE-CONVERSION-MS0 (2026-05-17, 7 units) — MIT-OCW + monolith → PRISM via 3-lane router (Lane A direct-wire 259 tribal tips · Lane B port-verify · Lane C 6-node-type forge-queue). 7 algorithms shipped: OperatorSplitting/ODEIntegrator/LinearStateSpace/FDM/GradientDescent/FEM/Lagrangian (148/148 tests) + SafeExpressionEvaluator (60 tests). Wiki: [[knowledge-conversion-ms0]] · [[course-forge-stubs-emitter]] · [[course-forge-conversions]]. Memory: [[reference_knowledge_conversion_ms0_2026_05_17]] · [[reference_course_forge_conversions_2026_05_17]].",
  },
  {
    headerPrefix: "## RGS-TOOL-AUTOINVOKE-MS0",
    replacement:
      "## RGS-TOOL-AUTOINVOKE-MS0+MS1 (2026-05-16) — toolchain enrichment for 4404 open roadmap units. Rule table `scripts/lib/rgs-pipeline-rules.mjs` (5 domain rules + structural Wire-EDM exclusion). Sidecar: `state/shared/roadmap-tool-plans.json`. MS1 fixed 10 P0 bugs MS0 hermetic tests missed (the pure-core + injected-readers rule MUST ship a real-data E2E). U-CRON nightly replan, U-DISPATCHER wires `prism_dev:roadmap_tool_plan_{query,build,coverage}`. Knobs: `PRISM_RGS_TOOL_PLAN_INJECT=0`, `PRISM_RGS_OUTCOME_RECORD_DISABLE=1`. Wiki: [[rgs-tool-autoinvoke-ms0]] · [[rgs-tool-autoinvoke-ms1]].",
  },
  {
    headerPrefix: "## JULIETT-12CHAT-ALLOCATION-MS0",
    replacement:
      "## JULIETT-12CHAT-ALLOCATION-MS0 (2026-05-17) — 12-chat ROI allocation across alpha..mike + golf hygiene. 25 agents / 3 iters / 5-wave ordering / CLEAR-NOT-COMPACT doctrine / 11 bypass systems / 5 silent-degrade fixes (F1-F5). PATCH-SIBLING convention codified. Wiki: [[juliett-12chat-allocation-ms0]]. Memory: [[reference_juliett_12chat_allocation_2026_05_17]] · [[reference_juliett_devtools_synergy_map_2026_05_17]].",
  },
  {
    headerPrefix: "## OLLAMA-PIPELINE-MS0",
    replacement:
      "## OLLAMA-PIPELINE-MS0 (2026-05-15) — wires local LLM into skill pipelines via 3 artifacts: `scripts/ollama-docker-health.mjs` (CLI probe), `.claude/hooks/ollama-pipeline-injector.mjs` (UserPromptSubmit, 9 trigger skills), `.claude/hooks/ollama-prewarm-on-pipeline.mjs` (detached prewarm, 10-min model cooldown). Knobs: `PRISM_OLLAMA_PIPELINE_INJECT=0` · `PRISM_OLLAMA_PREWARM_DISABLE=1`. Wiki: [[ollama-pipeline-ms0]]. Memory: [[reference_ollama_pipeline_ms0_2026_05_15]].",
  },
  {
    headerPrefix: "## NN-GRAPH-MS0",
    replacement:
      "## NN-GRAPH-MS0 (2026-05-16) — GraphSAGE GNN as 5th tier of wiring-inference cascade for UNKNOWN `ghost.unwired-engine` nodes. `scripts/seed-ghost-gnn-classify.mjs` does k-NN label-propagation. Eval harness: `scripts/lib/nn-graph-eval.mjs` (AUROC≥0.78 / macro-F1≥0.55 / Brier≤0.15). Status: `shipped-research-only`; deploy gate DEFERRED (poolSize:0 — dormant by data, not bug). Knobs: `PRISM_NNG_{DISABLE,MIN_CONF,REF_MIN_CONF,TOPK,CHECKPOINT}`. Wiki: [[nn-graph-ms0]]. Memory: [[reference_nn_graph_ms0_2026_05_16]].",
  },
  {
    headerPrefix: "## NN-GRAPH-MS1",
    replacement:
      "## NN-GRAPH-MS1 (2026-05-17) — U-NNG-PIPELINE-STRATIFIED-WIRE: wires stratified neg-sampling through `runTrainingPipeline` (closes heterophily AUROC=0.096 cause, code-side fix). Opt-in `--node-type-field <field> --neg-p-hard <0..1>`; byte-identical legacy path when unset. 74+183 tests. Deploy gate stays data-side. Wiki: [[u-nng-pipeline-stratified-wire]]. Memory: [[reference_u_nng_pipeline_stratified_wire_2026_05_17]].",
  },
  {
    headerPrefix: "## NN-GRAPH-MS2",
    replacement:
      "## NN-GRAPH-MS2 (2026-05-17) — autonomous NN lifecycle: U1 reference-pool seed-ghost regen-viz stage (closes poolSize:0 by data); U2 self-retrain scheduled task (drift→retrain→eval→promote-only-on-gate-pass, safety invariant: deferred OR sub-gate → NEVER promoted). Knobs: `PRISM_NN_RETRAIN_{DISABLE,DRY_RUN,MIN_NODE_DELTA_PCT,MIN_EDGE_DELTA_PCT,MIN_GHOST_DELTA_PCT,MAX_AGE_HOURS}`. Memory: [[reference_nn_graph_ms2_u1_2026_05_17]] · [[reference_nn_graph_ms2_u2_2026_05_17]].",
  },
  {
    headerPrefix: "## FLEET-REAPER-MS0",
    replacement:
      "## FLEET-REAPER-MS0 (2026-05-14) — slot-aware orphan-process reaper for the 13-chat fleet. Maps PIDs → slots via ancestry + `chat-slots.json`. Confirm-after-N-ticks gate (default 2 × 300s). 3 runners: in-session Monitor (`/fleet-reaper`), `PRISM Fleet Reaper` scheduled task, Stop hook. Kill switch: `PRISM_FLEET_REAPER_DISABLE=1`. Wiki: [[fleet-reaper]]. Memory: [[reference_fleet_reaper]].",
  },
  {
    headerPrefix: "## FLEET-REAPER-MS1",
    replacement:
      "## FLEET-REAPER-MS1+Tier1+Tier2 (2026-05-14..17) — Phase 2 adds bash-classifier leftover-task detection, soft-relief (BelowNormal + working-set trim), GPU probe + Ollama coordinator, alpha-slot guardian (ownership SUPERSEDED → golf 2026-05-16, see [[feedback_golf_owns_reaper]]). Tier1: `tierFromPressure` 3-band gate + 256MB ballast. Tier2: critical-service auto-restart (advisory by default, `PRISM_FLEET_REAPER_SERVICE_RESTART=1`). Autonomy hardening 2026-05-16b: PS5.1 C0-strip + S4U/AtStartup installer (one elevated command sets it set-and-forget). Memory: [[reference_fleet_reaper_ms1]] · [[reference_fleet_reaper_tier1_2026_05_17]] · [[reference_fleet_reaper_autonomy_robust_2026_05_16]].",
  },
  {
    headerPrefix: "## FLEET-MEMORY-MONITOR-MS0",
    replacement:
      "## FLEET-MEMORY-MONITOR-MS0 (2026-05-16) — 5-min RAM + per-chat-tree memory monitor via Windows scheduled task (independent of any chat slot). Attribution via claude.exe trees (slot.pid is ephemeral — never load-bear on it). Emits ONE advisory line to AGENT_CHAT.jsonl naming the largest tree as `/compact` target. Knobs: `PRISM_FLEET_MEMMON_{DISABLE,WARN_PCT,CRIT_PCT,ADVISORY_COOLDOWN_SEC,SUSTAINED_TICKS,PS_TIMEOUT_MS}`. Exit codes 0/1/2/3. Wiki: [[fleet-memory-monitor]]. Memory: [[reference_fleet_memory_monitor_2026_05_16]].",
  },
];

/**
 * Replace a section's entire body (header through last line before next `## `
 * or EOF) with `replacement`. Returns { ok, content, replacedLineCount }.
 * Returns { ok:false } if the header is not found OR matches multiple times.
 */
export function collapseSection(text, headerPrefix, replacement) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const matches = lines
    .map((l, i) => (l.startsWith(headerPrefix) ? i : -1))
    .filter((i) => i >= 0);
  if (matches.length > 1) return { ok: false, reason: "header_ambiguous", headerPrefix, matches };
  if (matches.length === 0) {
    // Header not found. This is either (a) the section never existed, or
    // (b) the section is ALREADY collapsed under a replacement whose prefix
    // intentionally drops the original headerPrefix shape (e.g. headerPrefix
    // "## GOLF SLOT (7th hygiene chat" → replacement "## GOLF SLOT — ...").
    // Disambiguate via replacement-presence: only treat as alreadyCollapsed
    // when the literal replacement line already exists in the text. We do
    // this AFTER the headerPrefix check (per P1 from reviewer): if the
    // original header is still present elsewhere, we must collapse it, not
    // pretend an already-collapsed copy elsewhere covers it.
    if (lines.some((l) => l === replacement)) {
      return { ok: true, content: text, replacedLineCount: 0, alreadyCollapsed: true };
    }
    return { ok: false, reason: "header_not_found", headerPrefix };
  }
  const startIdx = matches[0];
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) { endIdx = i; break; }
  }
  // Trim trailing blank lines from the replaced section (preserve a single
  // blank between the new one-liner and the next section).
  let trimEnd = endIdx;
  while (trimEnd > startIdx + 1 && lines[trimEnd - 1].trim() === "") trimEnd--;
  const replacedLineCount = trimEnd - startIdx;
  // Already collapsed (same headerPrefix, single-line, content matches replacement).
  if (replacedLineCount === 1 && lines[startIdx] === replacement) {
    return { ok: true, content: text, replacedLineCount: 0, alreadyCollapsed: true };
  }
  // Splice: keep prelude, emit replacement, emit one blank, emit next section onwards.
  // Without the explicit blank, sequential collapsed sections fuse with no
  // separator (regression observed in test 5 of the F2 suite — adjacent ##
  // headers must stay legible).
  const tail = lines.slice(endIdx);
  const wantsBlank = tail.length > 0 && /^## /.test(tail[0]);
  const newLines = wantsBlank
    ? [...lines.slice(0, startIdx), replacement, "", ...tail]
    : [...lines.slice(0, startIdx), replacement, ...tail];
  return { ok: true, content: newLines.join(eol), replacedLineCount, eol };
}

function atomicWrite(file, content) {
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  try {
    fs.writeFileSync(tmp, content, "utf8");
    fs.renameSync(tmp, file);
    return { ok: true };
  } catch (e) {
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch { /* best-effort */ }
    return { ok: false, error: String((e && e.message) || e) };
  }
}

export function run(opts = {}) {
  const claudeMd = opts.claudeMd || CLAUDE_MD;
  const spec = opts.spec || COLLAPSE_SPEC;
  const dryRun = !!opts.dryRun;
  let text;
  try { text = fs.readFileSync(claudeMd, "utf8"); }
  catch (e) { return { ok: false, reason: "read_failed", error: String((e && e.message) || e) }; }
  const beforeBytes = Buffer.byteLength(text, "utf8");
  const beforeLines = text.split(/\r?\n/).length;
  const results = [];
  let collapsedCount = 0;
  let skippedCount = 0;
  for (const entry of spec) {
    const r = collapseSection(text, entry.headerPrefix, entry.replacement);
    if (r.ok) {
      text = r.content;
      if (r.alreadyCollapsed) {
        skippedCount++;
        results.push({ headerPrefix: entry.headerPrefix, status: "already_collapsed" });
      } else {
        collapsedCount++;
        results.push({ headerPrefix: entry.headerPrefix, status: "collapsed", linesRemoved: r.replacedLineCount - 1 });
      }
    } else {
      results.push({ headerPrefix: entry.headerPrefix, status: "skipped", reason: r.reason });
    }
  }
  const afterBytes = Buffer.byteLength(text, "utf8");
  const afterLines = text.split(/\r?\n/).length;
  if (dryRun) {
    return { ok: true, dryRun: true, beforeBytes, afterBytes, beforeLines, afterLines, collapsedCount, skippedCount, results };
  }
  const w = atomicWrite(claudeMd, text);
  if (!w.ok) return { ok: false, reason: "write_failed", error: w.error };
  return { ok: true, beforeBytes, afterBytes, beforeLines, afterLines, collapsedCount, skippedCount, results };
}

function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const asJson = argv.includes("--json");
  const r = run({ dryRun });
  if (asJson) { process.stdout.write(JSON.stringify(r, null, 2) + "\n"); }
  else if (r.ok) {
    process.stdout.write(
      `claude-md-collapse-milestones: ${r.collapsedCount} collapsed` +
      `${r.dryRun ? " (DRY-RUN)" : ""}, ${r.skippedCount} already-collapsed, ` +
      `${r.results.filter(x => x.status === "skipped").length} not-found\n` +
      `  CLAUDE.md ${r.beforeBytes} B / ${r.beforeLines} ln -> ` +
      `${r.afterBytes} B / ${r.afterLines} ln\n`
    );
    for (const res of r.results.filter((x) => x.status === "skipped")) {
      process.stdout.write(`  ! header not found: ${res.headerPrefix} (${res.reason})\n`);
    }
  } else {
    process.stdout.write(`claude-md-collapse-milestones: FAIL — ${r.reason}${r.error ? " (" + r.error + ")" : ""}\n`);
  }
  process.exit(r.ok ? 0 : 1);
}

const invokedDirectly =
  process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("claude-md-collapse-milestones.mjs");
if (invokedDirectly) main();
