/**
 * Knowledge Dispatcher - Consolidates 5 knowledge tools → 1
 * Actions: search, cross_query, formula, relations, stats
 * Uses KnowledgeQueryEngine for cross-registry search
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { validateActionParams, dispatcherError } from "../../utils/dispatcherMiddleware.js";
import { ACTION_KNOWLEDGE_SCHEMAS } from "../../schemas/knowledgeActionSchemas.js";

const ACADEMY_ACTIONS = [
  "academy_courses", "academy_course_detail",
  "academy_start_course", "academy_complete_lesson",
  "academy_quiz_start", "academy_quiz_answer",
  "academy_quiz_result", "academy_dashboard",
  "academy_certification_check", "academy_formula_cards",
  "academy_generate_questions",
  // TrainingSchedulerEngine (2026-05-24, iter20)
  "academy_enroll", "academy_get_enrollments",
  "academy_refresh_status", "academy_recommend_remediation",
  "academy_schedule_generate", "academy_employee_report",
  "academy_recommend_next_course",
] as const;

const VISUAL_LAB_ACTIONS = [
  "visual_lab_tool", "visual_lab_workpiece", "visual_lab_animation",
  "visual_lab_toolpath", "visual_lab_stress", "visual_lab_chip",
  "visual_lab_params",
] as const;

const KG_ACTIONS = [
  "kg_schema", "kg_populate", "kg_query", "kg_recommend", "kg_gap",
] as const;

const TROUBLESHOOT_TREE_ACTIONS = [
  "troubleshoot_diagnose", "troubleshoot_by_symptom",
  "troubleshoot_tree", "troubleshoot_common",
] as const;

const COURSE_BUILDER_ACTIONS = [
  "course_build", "course_build_from_rules",
  "course_catalog", "course_quiz_generate",
  "course_pricing",
] as const;

const INSTRUCTOR_ACTIONS = [
  "instructor_create_class", "instructor_enroll",
  "instructor_grades", "instructor_analytics",
  "instructor_export", "instructor_assign",
] as const;

const LEARN_ACTIONS = [
  "learn_ingest_text", "learn_ingest_video",
  "learn_ingest_document", "learn_ingest_url",
  "learn_auto_tag", "learn_dedup_check",
  "learn_search_knowledge", "learn_get_stats",
  "learn_video_process", "learn_video_transcript",
  "learn_video_keyframes", "learn_video_knowledge",
  "learn_video_extract_actions", "learn_video_replay", "learn_video_pipeline_run",
  "learn_session_create", "learn_session_submit",
  "learn_session_clarify", "learn_session_summary",
  "learn_url_extract", "learn_url_detect",
  "learn_social_parse", "learn_social_batch",
  "learn_auto_link", "learn_gap_detect", "learn_validate_physics",
  "learn_search_enhanced", "learn_context_recommend",
  // LEARN-MS3: Course Auto-Generation
  "learn_course_build", "learn_course_from_rules", "learn_course_catalog",
  "learn_course_quiz", "learn_course_pricing", "learn_course_from_source",
  "learn_course_export",
  // LEARN-MS3: Curriculum Bridge
  "learn_curriculum_rpm", "learn_curriculum_force", "learn_curriculum_toollife",
  "learn_curriculum_material", "learn_curriculum_feedrate", "learn_curriculum_problemset",
  // LEARN-MS4: Feedback + Fleet Learning
  "learn_feedback_record", "learn_feedback_profile", "learn_feedback_calibrate",
  "learn_feedback_predict", "learn_feedback_compare",
  "learn_transfer_similarity", "learn_transfer_scale",
  "learn_transfer_apply", "learn_transfer_validate",
  "learn_fleet_status", "learn_fleet_plan",
  "learn_fleet_feedback", "learn_fleet_summary",
] as const;

const OBSIDIAN_ACTIONS = [
  "obsidian_sync_pull", "obsidian_sync_push",
  "obsidian_sync_status", "obsidian_sync_config",
  "obsidian_plugin_register", "obsidian_plugin_query",
  "obsidian_plugin_subscribe", "obsidian_plugin_unsubscribe",
  "obsidian_plugin_status",
  "obsidian_viz_regenerate", "obsidian_viz_status", "obsidian_viz_recall_top",
  "tribal_export_single", "tribal_export_bulk",
  "tribal_export_config", "tribal_export_status",
] as const;

const SHOP_NOTE_ACTIONS = [
  "shop_note_ingest", "shop_note_parse", "shop_note_batch",
  "shop_note_validate", "shop_note_status",
] as const;

// COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH9: Knowledge enrichment
const COG_KNOWLEDGE_ACTIONS = [
  "cognitive_tribal_maximizer_query",
  "cognitive_video_knowledge_query",
  "cognitive_extracted_knowledge_search",
] as const;

// U-SKU07 (SKILLS-UTILIZATION-MS0): scan community skill collections for PRISM-domain-relevant skills.
const SKILL_MARKETPLACE_ACTIONS = [
  "skill_marketplace_scan",
] as const;

// BRIDGE-WIRING/U-BRIDGE-WIRE-TRIBAL (2026-05-21, slot:foxtrot):
// Wire 3 unwired Tribal engines — MillTribalIntegration, TribalExplanation, TribalEvolution.
// Each action exposes the engine's full surface via a `mode` discriminator.
const TRIBAL_BRIDGE_ACTIONS = [
  "tribal_mill_integrate",
  "tribal_explain",
  "tribal_evolve",
] as const;

// WIRE-UNWIRED-MS0/U-WIRE-BACKLOG-TRIBAL batch 1 (2026-05-21, slot:foxtrot):
// Wire 3 more unwired tribal engines — LatheTribalInjector, TribalKnowledgeActivation,
// TribalKnowledgeAdvisor. Same mode-discriminator pattern as TRIBAL_BRIDGE_ACTIONS.
const TRIBAL_BACKLOG_ACTIONS_B1 = [
  "tribal_lathe_inject",
  "tribal_activate",
  "tribal_advisor",
] as const;

// WIRE-UNWIRED-MS0/U-WIRE-BACKLOG-TRIBAL batch 2 (2026-05-21, slot:foxtrot):
// Wire 3 more unwired tribal engines — CAMTribalKnowledge, MillTribalKnowledge,
// TribalEnrichmentCoordinator.
const TRIBAL_BACKLOG_ACTIONS_B2 = [
  "tribal_cam_lookup",
  "tribal_mill_query",
  "tribal_enrich",
] as const;

// WIRE-UNWIRED-MS0/U-WIRE-BACKLOG-TRIBAL batch 3 (2026-05-21, slot:foxtrot):
// Wire 3 more unwired tribal engines — TribalPlaybookEnforcement, TribalRAG,
// WEDMTribalRuntime.
const TRIBAL_BACKLOG_ACTIONS_B3 = [
  "tribal_playbook_enforce",
  "tribal_rag",
  "tribal_wedm_runtime",
] as const;

// WIRE-UNWIRED-MS0/U-WIRE-BACKLOG-TRIBAL batch 4 (2026-05-21, slot:foxtrot):
// Final 3 unwired tribal engines — CAMTribalKnowledgeInjection (static class),
// PostProcessorTribalKnowledgeIntegration, WEDMTribalTipLearner.
const TRIBAL_BACKLOG_ACTIONS_B4 = [
  "tribal_cam_tooltip",
  "tribal_pp_integrate",
  "tribal_wedm_learn",
] as const;

// U-PSN-KNOWLEDGE-DISP-CORPUS (papa /loop iter5, 2026-05-23) — mirror of the
// BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U6 corpus_* actions from cadDispatcher.
// Same engine singleton (BlueprintCorpusHarvestEngine), now reachable from
// prism_knowledge as the natural consumer (knowledge harvest IS knowledge work).
// Per CLAUDE.md §ENGINE WIRING: "wire to every dispatcher that would naturally
// consume it." MS1 spec U6 explicitly required this dispatcher.
const CORPUS_HARVEST_ACTIONS = [
  "corpus_harvest_mit",
  "corpus_harvest_vendor",
  "corpus_harvest_online",
  "corpus_enumerate",
  "corpus_verify_fresh",
  "corpus_build_index",
] as const;

const ACTIONS = [
  "search", "cross_query", "formula", "relations", "stats",
  "tribal_capture", "tribal_search", "tribal_suggest", "tribal_stats",
  // WIRE-UNWIRED-MS0/U-WIRE-JMPA: JMDIEPatternAnalyzer static analysis
  "jmdie_pattern_analyze", "jmdie_pattern_rules", "jmdie_pattern_tips",
  // FEATURE-GAP-AUDIT-MS0/U-GAP-POST-JMDIE-LEARNING: .cps post-processor corpus learning
  "jmdie_post_learn", "jmdie_post_corpus", "jmdie_post_query",
  "jmdie_post_catalog", "jmdie_post_stats", "jmdie_post_gaps", "jmdie_post_reset",
  ...ACADEMY_ACTIONS,
  ...VISUAL_LAB_ACTIONS,
  ...KG_ACTIONS,
  ...TROUBLESHOOT_TREE_ACTIONS,
  ...INSTRUCTOR_ACTIONS,
  ...COURSE_BUILDER_ACTIONS,
  ...LEARN_ACTIONS,
  ...OBSIDIAN_ACTIONS,
  ...SHOP_NOTE_ACTIONS,
  ...COG_KNOWLEDGE_ACTIONS,
  ...SKILL_MARKETPLACE_ACTIONS,
  ...TRIBAL_BRIDGE_ACTIONS,
  ...TRIBAL_BACKLOG_ACTIONS_B1,
  ...TRIBAL_BACKLOG_ACTIONS_B2,
  ...TRIBAL_BACKLOG_ACTIONS_B3,
  ...TRIBAL_BACKLOG_ACTIONS_B4,
  ...CORPUS_HARVEST_ACTIONS,
] as const;

let knowledgeEngine: any = null;
let kgEngine: any = null;
let instructorEngine: any = null;

/** In-memory session store for interactive learning sessions (LEARN-MS1) */
const learningSessions = new Map<string, any>();

async function getInstructorEngine(): Promise<any> {
  if (!instructorEngine) {
    try {
      const mod = await import(
        "../../engines/InstructorDashboardEngine.js"
      );
      instructorEngine =
        mod.instructorDashboardEngine ||
        new mod.InstructorDashboardEngine();
    } catch (e) {
      log.warn(
        "[knowledgeDispatcher] InstructorDashboardEngine N/A"
      );
    }
  }
  return instructorEngine;
}

async function getKGEngine(): Promise<any> {
  if (!kgEngine) {
    try {
      const mod = await import("../../engines/ManufacturingKnowledgeGraphEngine.js");
      kgEngine = mod.manufacturingKnowledgeGraphEngine || new mod.ManufacturingKnowledgeGraphEngine();
    } catch (e) {
      log.warn("[knowledgeDispatcher] ManufacturingKnowledgeGraphEngine not available");
    }
  }
  return kgEngine;
}

async function getEngine(): Promise<any> {
  if (!knowledgeEngine) {
    try {
      const mod = await import("../../engines/KnowledgeQueryEngine.js");
      knowledgeEngine = mod.knowledgeEngine || new mod.KnowledgeQueryEngine();
    } catch (e) {
      log.warn("[knowledgeDispatcher] KnowledgeQueryEngine not available, using fallback");
    }
  }
  return knowledgeEngine;
}

/**
 * Resolve the Obsidian vault path when a caller omits `vault_path`. Keeps
 * ObsidianVaultSyncEngine generic (it never hardcodes a path): explicit arg wins, then
 * `PRISM_OBSIDIAN_VAULT` env, then the canonical PRISM knowledge vault (cwd-relative, must
 * contain `.obsidian`), else "" — the unchanged fail-soft default (status → configured:false,
 * no regression). Fixes obsidian_sync_status reporting configured:false despite the vault
 * existing at H:/prism/knowledge.
 */
async function resolveObsidianVault(explicit?: unknown): Promise<string> {
  const e = typeof explicit === "string" ? explicit.trim() : "";
  if (e) return e;
  if (process.env.PRISM_OBSIDIAN_VAULT) return process.env.PRISM_OBSIDIAN_VAULT;
  const { access } = await import("node:fs/promises");
  const { resolve } = await import("node:path");
  for (const cand of [resolve(process.cwd(), "knowledge"), resolve(process.cwd(), "..", "knowledge")]) {
    try {
      await access(resolve(cand, ".obsidian")); // throws if absent
      return cand;
    } catch { /* not this candidate — try next */ }
  }
  return "";
}

/** Registers knowledge dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerKnowledgeDispatcher(server: any): void {
  server.tool(
    "prism_knowledge",
    `Unified knowledge query across 9 PRISM registries. Actions: ${ACTIONS.join(", ")}`,
    {
      action: z.enum(ACTIONS).describe("Knowledge action"),
      params: z.record(z.string(), z.any()).optional().describe("Action parameters")
    },
    async ({ action, params: rawParams = {} }: { action: string; params: Record<string, any> }) => {
      log.info(`[prism_knowledge] Action: ${action}`);
      const engine = await getEngine();
      let result: any;

      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }
        // SYS-MS6: Validate params against per-action Zod schema
        const validation = validateActionParams(action, params, ACTION_KNOWLEDGE_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action, "prism_knowledge"
          );
        }
        switch (action) {
          case "search": {
            if (!engine) { result = { error: "KnowledgeQueryEngine not loaded" }; break; }
            result = await engine.unifiedSearch(params.query || "", {
              registries: params.registries, limit: params.limit || 20, min_score: params.min_score || 0.2
            });
            break;
          }
          case "cross_query": {
            if (!engine) { result = { error: "KnowledgeQueryEngine not loaded" }; break; }
            result = await engine.crossRegistryQuery({
              task: params.task || "", context: params.context, required_registries: params.required_registries
            });
            break;
          }
          case "formula": {
            if (!engine) { result = { error: "KnowledgeQueryEngine not loaded" }; break; }
            result = await engine.findFormulas(params.need || "", {
              category: params.category, materialId: params.material_id, includeRelated: params.include_related !== false
            });
            break;
          }
          case "relations": {
            let kgEngine: any = null;
            try {
              const kgMod = await import("../../engines/KnowledgeGraphEngine.js");
              kgEngine = kgMod.knowledgeGraph;
            } catch { /* KnowledgeGraphEngine not available */ }
            if (!kgEngine) { result = { error: "KnowledgeGraphEngine not loaded" }; break; }
            result = kgEngine("graph_traverse", {
              start_node: params.source_id || params.node_id || "",
              edge_types: params.edge_types,
              depth: params.depth || 2,
            });
            break;
          }
          case "stats": {
            if (!engine) { result = { error: "KnowledgeQueryEngine not loaded" }; break; }
            result = await engine.getStats();
            break;
          }
          // ── Tribal Knowledge ──
          case "tribal_capture": {
            const { tribalKnowledgeEngine } = await import("../../engines/TribalKnowledgeEngine.js");
            result = tribalKnowledgeEngine.capture({
              title: params.title ?? "Untitled Tip",
              body: params.body ?? params.content ?? "",
              category: params.category ?? "general",
              source: params.source ?? "operator",
              material_groups: params.material_groups ?? (params.material_iso ? [params.material_iso] : undefined),
              operation_types: params.operation_types ?? (params.operation_type ? [params.operation_type] : undefined),
              confidence: params.confidence ?? 70,
              tags: params.tags ?? [],
            });
            break;
          }
          case "tribal_search": {
            const { tribalKnowledgeEngine } = await import("../../engines/TribalKnowledgeEngine.js");
            result = tribalKnowledgeEngine.search({
              query: params.query ?? "",
              category: params.category,
              material_iso_group: params.material_iso_group ?? params.material_iso,
              operation_type: params.operation_type,
              min_confidence: params.min_confidence,
              limit: params.limit ?? 10,
            });
            break;
          }
          case "tribal_suggest": {
            const { tribalKnowledgeEngine } = await import("../../engines/TribalKnowledgeEngine.js");
            result = tribalKnowledgeEngine.suggest(
              params.material_iso_group ?? params.material_iso ?? "P",
              params.operation_type ?? "milling",
            );
            break;
          }
          case "tribal_stats": {
            const { tribalKnowledgeEngine } = await import("../../engines/TribalKnowledgeEngine.js");
            result = tribalKnowledgeEngine.stats();
            break;
          }
          // ── BRIDGE-WIRING/U-BRIDGE-WIRE-TRIBAL (2026-05-21): 3 unwired tribal engines ──
          case "tribal_mill_integrate": {
            const { millTribalIntegrationEngine } = await import(
              "../../engines/MillTribalIntegrationEngine.js"
            );
            const mode = String(params.mode ?? "integrate");
            switch (mode) {
              case "integrate":
                result = await millTribalIntegrationEngine.integrateWithTraining();
                break;
              case "adjust":
                result = millTribalIntegrationEngine.getAdjustment(
                  String(params.material_iso ?? "P"),
                  String(params.operation_type ?? "rough_profile"),
                  String(params.tool_type ?? "flat_endmill"),
                  Number(params.tool_diameter_mm ?? 12),
                );
                break;
              case "check_failures":
                result = {
                  failures: millTribalIntegrationEngine.checkFailureModes(
                    String(params.material_iso ?? "P"),
                    String(params.operation_type ?? "rough_profile"),
                    Number(params.rpm ?? 2000),
                    Number(params.feed ?? 15),
                    Number(params.doc ?? 0.1),
                  ),
                };
                break;
              case "stats":
                result = millTribalIntegrationEngine.getStatistics();
                break;
              default:
                throw new Error(
                  `[tribal_mill_integrate] unknown mode: '${mode}'. ` +
                    `Expected one of: integrate, adjust, check_failures, stats.`,
                );
            }
            break;
          }
          case "tribal_explain": {
            const { tribalExplanationEngine } = await import(
              "../../engines/TribalExplanationEngine.js"
            );
            const mode = String(params.mode ?? "relevance");
            const ctx = (params.context ?? {}) as Record<string, unknown>;
            switch (mode) {
              case "relevance":
                if (!params.tip_id || typeof params.tip_id !== "string") {
                  throw new Error(
                    "[tribal_explain] mode 'relevance' requires string tip_id",
                  );
                }
                result = tribalExplanationEngine.explainTipRelevance(
                  params.tip_id,
                  ctx as any,
                );
                break;
              case "chain": {
                const tipIds = Array.isArray(params.tip_ids)
                  ? (params.tip_ids as unknown[]).filter(
                      (s): s is string => typeof s === "string",
                    )
                  : [];
                result = tribalExplanationEngine.buildReasoningChain(
                  ctx as any,
                  tipIds,
                );
                break;
              }
              case "predict":
                result = tribalExplanationEngine.predictUpcomingTips(
                  ctx as any,
                  (params.options ?? {}) as any,
                );
                break;
              case "synthesize": {
                const perspectives = Array.isArray(params.perspectives)
                  ? (params.perspectives as any[])
                  : [];
                result = tribalExplanationEngine.synthesizeAgentPerspectives(
                  perspectives,
                );
                break;
              }
              case "synthesize_multi": {
                const perspectives = Array.isArray(params.perspectives)
                  ? (params.perspectives as any[])
                  : [];
                result = {
                  syntheses:
                    tribalExplanationEngine.synthesizeMultipleTips(perspectives),
                };
                break;
              }
              default:
                throw new Error(
                  `[tribal_explain] unknown mode: '${mode}'. ` +
                    `Expected one of: relevance, chain, predict, synthesize, synthesize_multi.`,
                );
            }
            break;
          }
          case "tribal_evolve": {
            const { tribalEvolutionEngine } = await import(
              "../../engines/TribalEvolutionEngine.js"
            );
            const mode = String(params.mode ?? "history");
            switch (mode) {
              case "version_create":
                if (!params.tip_id || typeof params.tip_id !== "string") {
                  throw new Error(
                    "[tribal_evolve] mode 'version_create' requires string tip_id",
                  );
                }
                result = tribalEvolutionEngine.createTipVersion(
                  params.tip_id,
                  (params.changes ?? {}) as Record<string, unknown>,
                  (params.options ?? {}) as any,
                );
                break;
              case "history":
                if (!params.tip_id || typeof params.tip_id !== "string") {
                  throw new Error(
                    "[tribal_evolve] mode 'history' requires string tip_id",
                  );
                }
                result = { history: tribalEvolutionEngine.getTipHistory(params.tip_id) };
                break;
              case "diff":
                if (
                  typeof params.from_version !== "string" ||
                  typeof params.to_version !== "string"
                ) {
                  throw new Error(
                    "[tribal_evolve] mode 'diff' requires string from_version and to_version",
                  );
                }
                result = tribalEvolutionEngine.diffTipVersions(
                  params.from_version,
                  params.to_version,
                );
                break;
              case "rollback":
                if (
                  typeof params.tip_id !== "string" ||
                  typeof params.target_version !== "number"
                ) {
                  throw new Error(
                    "[tribal_evolve] mode 'rollback' requires string tip_id + number target_version",
                  );
                }
                tribalEvolutionEngine.rollbackTip(
                  params.tip_id,
                  params.target_version,
                );
                result = { ok: true, tip_id: params.tip_id };
                break;
              case "merge_detect":
                result = {
                  candidates: tribalEvolutionEngine.detectMergeCandidates(
                    (params.options ?? {}) as any,
                  ),
                };
                break;
              case "merge": {
                const tipIds = Array.isArray(params.tip_ids)
                  ? (params.tip_ids as unknown[]).filter(
                      (s): s is string => typeof s === "string",
                    )
                  : [];
                result = tribalEvolutionEngine.mergeTips(
                  tipIds,
                  (params.strategy ?? "union") as any,
                  (params.weights ?? undefined) as any,
                );
                break;
              }
              case "patterns":
                result = {
                  patterns: tribalEvolutionEngine.detectEmergingPatterns(
                    (params.options ?? {}) as any,
                  ),
                };
                break;
              case "candidate":
                if (!params.pattern || typeof params.pattern !== "object") {
                  throw new Error(
                    "[tribal_evolve] mode 'candidate' requires pattern object",
                  );
                }
                result = tribalEvolutionEngine.generateTipCandidate(
                  params.pattern as any,
                );
                break;
              case "queue_validate":
                if (!params.candidate || typeof params.candidate !== "object") {
                  throw new Error(
                    "[tribal_evolve] mode 'queue_validate' requires candidate object",
                  );
                }
                tribalEvolutionEngine.queueForValidation(params.candidate as any);
                result = { ok: true };
                break;
              case "validation_queue":
                result = { queue: tribalEvolutionEngine.getValidationQueue() };
                break;
              case "lifecycle_get":
                if (typeof params.tip_id !== "string") {
                  throw new Error(
                    "[tribal_evolve] mode 'lifecycle_get' requires string tip_id",
                  );
                }
                result = {
                  state: tribalEvolutionEngine.getTipLifecycleState(params.tip_id),
                };
                break;
              case "lifecycle_set":
                if (
                  typeof params.tip_id !== "string" ||
                  typeof params.state !== "string"
                ) {
                  throw new Error(
                    "[tribal_evolve] mode 'lifecycle_set' requires string tip_id + string state",
                  );
                }
                tribalEvolutionEngine.setTipLifecycleState(
                  params.tip_id,
                  params.state as any,
                );
                result = { ok: true };
                break;
              case "promote":
                if (typeof params.tip_id !== "string") {
                  throw new Error(
                    "[tribal_evolve] mode 'promote' requires string tip_id",
                  );
                }
                tribalEvolutionEngine.promoteTip(params.tip_id);
                result = { ok: true };
                break;
              case "deprecate":
                if (typeof params.tip_id !== "string") {
                  throw new Error(
                    "[tribal_evolve] mode 'deprecate' requires string tip_id",
                  );
                }
                tribalEvolutionEngine.deprecateTip(
                  params.tip_id,
                  String(params.reason ?? "no reason given"),
                );
                result = { ok: true };
                break;
              case "archive":
                if (typeof params.tip_id !== "string") {
                  throw new Error(
                    "[tribal_evolve] mode 'archive' requires string tip_id",
                  );
                }
                tribalEvolutionEngine.archiveTip(params.tip_id);
                result = { ok: true };
                break;
              case "events":
                if (typeof params.tip_id !== "string") {
                  throw new Error(
                    "[tribal_evolve] mode 'events' requires string tip_id",
                  );
                }
                result = {
                  events: tribalEvolutionEngine.getLifecycleEvents(params.tip_id),
                };
                break;
              case "active":
                result = { active: tribalEvolutionEngine.getActiveTips() };
                break;
              default:
                throw new Error(
                  `[tribal_evolve] unknown mode: '${mode}'. ` +
                    `Expected one of: version_create, history, diff, rollback, ` +
                    `merge_detect, merge, patterns, candidate, queue_validate, ` +
                    `validation_queue, lifecycle_get, lifecycle_set, promote, ` +
                    `deprecate, archive, events, active.`,
                );
            }
            break;
          }
          // ── WIRE-UNWIRED-MS0/U-WIRE-BACKLOG-TRIBAL batch 1 (2026-05-21) ──
          // 3 more unwired tribal engines.
          case "tribal_lathe_inject": {
            const { latheTribalInjectorEngine } = await import(
              "../../engines/LatheTribalInjectorEngine.js"
            );
            const mode = String(params.mode ?? "inject");
            switch (mode) {
              case "inject": {
                if (typeof params.target !== "string") {
                  throw new Error(
                    "[tribal_lathe_inject] mode 'inject' requires string target",
                  );
                }
                const tips = Array.isArray(params.tips) ? (params.tips as any[]) : [];
                result = latheTribalInjectorEngine.inject(
                  params.target as any,
                  tips,
                  (params.context ?? {}) as any,
                  (params.options ?? {}) as any,
                );
                break;
              }
              case "inject_all": {
                const tips = Array.isArray(params.tips) ? (params.tips as any[]) : [];
                result = latheTribalInjectorEngine.injectAll(
                  tips,
                  (params.context ?? {}) as any,
                  (params.options ?? {}) as any,
                );
                break;
              }
              case "audit_log":
                result = {
                  audit_log: latheTribalInjectorEngine.getAuditLog(
                    (params.target ?? undefined) as any,
                    typeof params.limit === "number" ? params.limit : 100,
                  ),
                };
                break;
              case "clear_audit":
                latheTribalInjectorEngine.clearAuditLog();
                result = { ok: true };
                break;
              case "stats":
                result = latheTribalInjectorEngine.getStats();
                break;
              default:
                throw new Error(
                  `[tribal_lathe_inject] unknown mode: '${mode}'. ` +
                    `Expected one of: inject, inject_all, audit_log, clear_audit, stats.`,
                );
            }
            break;
          }
          case "tribal_activate": {
            const { tribalKnowledgeActivationEngine } = await import(
              "../../engines/TribalKnowledgeActivationEngine.js"
            );
            const mode = String(params.mode ?? "by_context");
            const limit =
              typeof params.limit === "number" && params.limit > 0
                ? params.limit
                : 10;
            switch (mode) {
              case "by_context":
                if (!params.context || typeof params.context !== "object") {
                  throw new Error(
                    "[tribal_activate] mode 'by_context' requires context object",
                  );
                }
                result = tribalKnowledgeActivationEngine.activateTipsForContext(
                  params.context as any,
                );
                break;
              case "by_operation":
                if (typeof params.operation !== "string") {
                  throw new Error(
                    "[tribal_activate] mode 'by_operation' requires string operation",
                  );
                }
                result = {
                  tips: tribalKnowledgeActivationEngine.getTipsByOperation(
                    params.operation,
                    limit,
                  ),
                };
                break;
              case "by_material":
                if (typeof params.material !== "string") {
                  throw new Error(
                    "[tribal_activate] mode 'by_material' requires string material",
                  );
                }
                result = {
                  tips: tribalKnowledgeActivationEngine.getTipsByMaterial(
                    params.material,
                    limit,
                  ),
                };
                break;
              case "by_controller":
                if (typeof params.controller !== "string") {
                  throw new Error(
                    "[tribal_activate] mode 'by_controller' requires string controller",
                  );
                }
                result = {
                  tips: tribalKnowledgeActivationEngine.getTipsByController(
                    params.controller,
                    limit,
                  ),
                };
                break;
              case "by_problem":
                if (typeof params.problem !== "string") {
                  throw new Error(
                    "[tribal_activate] mode 'by_problem' requires string problem",
                  );
                }
                result = {
                  tips: tribalKnowledgeActivationEngine.getTipsByProblem(
                    params.problem,
                    limit,
                  ),
                };
                break;
              case "for_speedfeed":
                if (!params.params || typeof params.params !== "object") {
                  throw new Error(
                    "[tribal_activate] mode 'for_speedfeed' requires params object",
                  );
                }
                result = tribalKnowledgeActivationEngine.activateForSpeedFeed(
                  params.params as any,
                );
                break;
              case "for_toolpath":
                if (!params.params || typeof params.params !== "object") {
                  throw new Error(
                    "[tribal_activate] mode 'for_toolpath' requires params object",
                  );
                }
                result = tribalKnowledgeActivationEngine.activateForToolpath(
                  params.params as any,
                );
                break;
              case "for_controller":
                if (!params.params || typeof params.params !== "object") {
                  throw new Error(
                    "[tribal_activate] mode 'for_controller' requires params object",
                  );
                }
                result = tribalKnowledgeActivationEngine.activateForController(
                  params.params as any,
                );
                break;
              case "for_troubleshoot":
                if (!params.params || typeof params.params !== "object") {
                  throw new Error(
                    "[tribal_activate] mode 'for_troubleshoot' requires params object",
                  );
                }
                result = tribalKnowledgeActivationEngine.activateForTroubleshooting(
                  params.params as any,
                );
                break;
              case "integrate_pp":
                if (!params.params || typeof params.params !== "object") {
                  throw new Error(
                    "[tribal_activate] mode 'integrate_pp' requires params object",
                  );
                }
                result = tribalKnowledgeActivationEngine.integrateWithPPDecision(
                  params.params as any,
                );
                break;
              case "stats":
                result = tribalKnowledgeActivationEngine.getStats();
                break;
              case "awareness":
                result = tribalKnowledgeActivationEngine.getSelfAwareness();
                break;
              default:
                throw new Error(
                  `[tribal_activate] unknown mode: '${mode}'. ` +
                    `Expected one of: by_context, by_operation, by_material, by_controller, by_problem, ` +
                    `for_speedfeed, for_toolpath, for_controller, for_troubleshoot, integrate_pp, stats, awareness.`,
                );
            }
            break;
          }
          case "tribal_advisor": {
            const { tribalKnowledgeAdvisorEngine } = await import(
              "../../engines/TribalKnowledgeAdvisorEngine.js"
            );
            const mode = String(params.mode ?? "query");
            const ctx = (params.context ?? {}) as Record<string, unknown>;
            switch (mode) {
              case "modifiers":
                result = tribalKnowledgeAdvisorEngine.getModifiers(ctx as any);
                break;
              case "constraints":
                result = tribalKnowledgeAdvisorEngine.getConstraints(ctx as any);
                break;
              case "advisory":
                result = tribalKnowledgeAdvisorEngine.getAdvisory(ctx as any);
                break;
              case "query":
                result = tribalKnowledgeAdvisorEngine.query(ctx as any);
                break;
              default:
                throw new Error(
                  `[tribal_advisor] unknown mode: '${mode}'. ` +
                    `Expected one of: modifiers, constraints, advisory, query.`,
                );
            }
            break;
          }
          // ── WIRE-UNWIRED-MS0/U-WIRE-BACKLOG-TRIBAL batch 2 (2026-05-21) ──
          case "tribal_cam_lookup": {
            const { camTribalKnowledgeEngine } = await import(
              "../../engines/CAMTribalKnowledgeEngine.js"
            );
            if (!params.request || typeof params.request !== "object") {
              throw new Error(
                "[tribal_cam_lookup] requires a 'request' object with TribalLookupRequest shape",
              );
            }
            result = camTribalKnowledgeEngine.lookup(params.request as any);
            break;
          }
          case "tribal_mill_query": {
            const { millTribalKnowledgeEngine } = await import(
              "../../engines/MillTribalKnowledgeEngine.js"
            );
            const mode = String(params.mode ?? "query");
            switch (mode) {
              case "add":
                if (!params.tip || typeof params.tip !== "object") {
                  throw new Error(
                    "[tribal_mill_query] mode 'add' requires tip object",
                  );
                }
                millTribalKnowledgeEngine.add(params.tip as any);
                result = { ok: true };
                break;
              case "get":
                if (typeof params.id !== "string") {
                  throw new Error(
                    "[tribal_mill_query] mode 'get' requires string id",
                  );
                }
                result = { tip: millTribalKnowledgeEngine.get(params.id) };
                break;
              case "query":
                result = {
                  tips: millTribalKnowledgeEngine.query(
                    (params.query ?? {}) as any,
                  ),
                };
                break;
              case "categories":
                result = { categories: millTribalKnowledgeEngine.getCategories() };
                break;
              case "all_tips":
                result = { tips: millTribalKnowledgeEngine.getAllTips() };
                break;
              case "count_by_category":
                result = millTribalKnowledgeEngine.countByCategory();
                break;
              case "stats":
                result = millTribalKnowledgeEngine.getStats();
                break;
              case "awareness":
                result = millTribalKnowledgeEngine.getSelfAwareness();
                break;
              default:
                throw new Error(
                  `[tribal_mill_query] unknown mode: '${mode}'. ` +
                    `Expected one of: add, get, query, categories, all_tips, count_by_category, stats, awareness.`,
                );
            }
            break;
          }
          case "tribal_enrich": {
            const { tribalEnrichmentCoordinatorEngine } = await import(
              "../../engines/TribalEnrichmentCoordinatorEngine.js"
            );
            const mode = String(params.mode ?? "enrich");
            switch (mode) {
              case "enrich":
                if (!params.input || typeof params.input !== "object") {
                  throw new Error(
                    "[tribal_enrich] mode 'enrich' requires input object",
                  );
                }
                result = await tribalEnrichmentCoordinatorEngine.enrich(
                  params.input as any,
                );
                break;
              case "has_knowledge":
                if (!params.input || typeof params.input !== "object") {
                  throw new Error(
                    "[tribal_enrich] mode 'has_knowledge' requires input object",
                  );
                }
                result = {
                  has_knowledge: await tribalEnrichmentCoordinatorEngine.hasKnowledge(
                    params.input as any,
                  ),
                };
                break;
              case "tribal_only":
                if (!params.input || typeof params.input !== "object") {
                  throw new Error(
                    "[tribal_enrich] mode 'tribal_only' requires input object",
                  );
                }
                result = {
                  tips: await tribalEnrichmentCoordinatorEngine.getTribalOnly(
                    params.input as any,
                  ),
                };
                break;
              case "playbook_only":
                if (!params.input || typeof params.input !== "object") {
                  throw new Error(
                    "[tribal_enrich] mode 'playbook_only' requires input object",
                  );
                }
                result = {
                  rules: await tribalEnrichmentCoordinatorEngine.getPlaybookOnly(
                    params.input as any,
                  ),
                };
                break;
              case "controller_only":
                if (typeof params.controller !== "string") {
                  throw new Error(
                    "[tribal_enrich] mode 'controller_only' requires string controller",
                  );
                }
                result = {
                  tips: await tribalEnrichmentCoordinatorEngine.getControllerOnly(
                    params.controller as any,
                  ),
                };
                break;
              default:
                throw new Error(
                  `[tribal_enrich] unknown mode: '${mode}'. ` +
                    `Expected one of: enrich, has_knowledge, tribal_only, playbook_only, controller_only.`,
                );
            }
            break;
          }
          // ── WIRE-UNWIRED-MS0/U-WIRE-BACKLOG-TRIBAL batch 3 (2026-05-21) ──
          case "tribal_playbook_enforce": {
            const { tribalPlaybookEnforcementEngine } = await import(
              "../../engines/TribalPlaybookEnforcementEngine.js"
            );
            const mode = String(params.mode ?? "validate");
            switch (mode) {
              case "validate":
                if (!params.params || typeof params.params !== "object") {
                  throw new Error(
                    "[tribal_playbook_enforce] mode 'validate' requires params object",
                  );
                }
                if (!params.context || typeof params.context !== "object") {
                  throw new Error(
                    "[tribal_playbook_enforce] mode 'validate' requires context object",
                  );
                }
                result = tribalPlaybookEnforcementEngine.validate(
                  params.params as any,
                  params.context as any,
                );
                break;
              case "validate_single":
                if (!params.context || typeof params.context !== "object") {
                  throw new Error(
                    "[tribal_playbook_enforce] mode 'validate_single' requires context object",
                  );
                }
                if (typeof params.parameter !== "string") {
                  throw new Error(
                    "[tribal_playbook_enforce] mode 'validate_single' requires string parameter",
                  );
                }
                if (typeof params.value !== "number") {
                  throw new Error(
                    "[tribal_playbook_enforce] mode 'validate_single' requires number value",
                  );
                }
                result = tribalPlaybookEnforcementEngine.validateSingleParameter(
                  params.parameter,
                  params.value,
                  params.context as any,
                );
                break;
              case "recommended_ranges":
                if (typeof params.material !== "string") {
                  throw new Error(
                    "[tribal_playbook_enforce] mode 'recommended_ranges' requires string material",
                  );
                }
                result = {
                  ranges: tribalPlaybookEnforcementEngine.getRecommendedRanges(
                    params.material,
                  ),
                };
                break;
              case "search_guidance":
                if (typeof params.query !== "string") {
                  throw new Error(
                    "[tribal_playbook_enforce] mode 'search_guidance' requires string query",
                  );
                }
                result = {
                  tips: tribalPlaybookEnforcementEngine.searchGuidance(
                    params.query,
                    typeof params.material === "string" ? params.material : undefined,
                    typeof params.operation === "string"
                      ? (params.operation as any)
                      : undefined,
                  ),
                };
                break;
              case "rules_for_category":
                if (typeof params.category !== "string") {
                  throw new Error(
                    "[tribal_playbook_enforce] mode 'rules_for_category' requires string category",
                  );
                }
                result = {
                  rules: tribalPlaybookEnforcementEngine.getRulesForCategory(
                    params.category,
                    typeof params.operation === "string"
                      ? (params.operation as any)
                      : undefined,
                  ),
                };
                break;
              case "stats":
                result = tribalPlaybookEnforcementEngine.getStatistics();
                break;
              default:
                throw new Error(
                  `[tribal_playbook_enforce] unknown mode: '${mode}'. ` +
                    `Expected one of: validate, validate_single, recommended_ranges, ` +
                    `search_guidance, rules_for_category, stats.`,
                );
            }
            break;
          }
          case "tribal_rag": {
            const { TribalRAGEngine } = await import("../../engines/TribalRAGEngine.js");
            const mode = String(params.mode ?? "search");
            switch (mode) {
              case "build_index": {
                const tips = Array.isArray(params.tips) ? (params.tips as any[]) : [];
                result = TribalRAGEngine.buildIndex(
                  tips,
                  typeof params.index_path === "string" ? params.index_path : undefined,
                );
                break;
              }
              case "load_index":
                result = {
                  loaded: TribalRAGEngine.loadIndex(
                    typeof params.index_path === "string" ? params.index_path : undefined,
                  ),
                };
                break;
              case "search":
                if (!params.input || typeof params.input !== "object") {
                  throw new Error(
                    "[tribal_rag] mode 'search' requires input object (TribalQueryInput)",
                  );
                }
                result = TribalRAGEngine.search(params.input as any);
                break;
              case "index_stats":
                result = { summary: TribalRAGEngine.getIndexStats() };
                break;
              case "awareness":
                result = TribalRAGEngine.getSelfAwareness();
                break;
              default:
                throw new Error(
                  `[tribal_rag] unknown mode: '${mode}'. ` +
                    `Expected one of: build_index, load_index, search, index_stats, awareness.`,
                );
            }
            break;
          }
          case "tribal_wedm_runtime": {
            const { wedmTribalRuntimeEngine } = await import(
              "../../engines/WEDMTribalRuntimeEngine.js"
            );
            const mode = String(params.mode ?? "select");
            switch (mode) {
              case "reload":
                wedmTribalRuntimeEngine.reloadTips();
                result = { ok: true };
                break;
              case "select":
                if (!params.context || typeof params.context !== "object") {
                  throw new Error(
                    "[tribal_wedm_runtime] mode 'select' requires context object",
                  );
                }
                result = wedmTribalRuntimeEngine.select(params.context as any);
                break;
              case "get_tip":
                if (typeof params.id !== "string") {
                  throw new Error(
                    "[tribal_wedm_runtime] mode 'get_tip' requires string id",
                  );
                }
                result = { tip: wedmTribalRuntimeEngine.getTipById(params.id) };
                break;
              case "list_by_category":
                if (typeof params.category !== "string") {
                  throw new Error(
                    "[tribal_wedm_runtime] mode 'list_by_category' requires string category",
                  );
                }
                result = {
                  tips: wedmTribalRuntimeEngine.listByCategory(params.category),
                };
                break;
              case "stats":
                result = wedmTribalRuntimeEngine.getStats();
                break;
              case "register_learned":
                if (!params.tip || typeof params.tip !== "object") {
                  throw new Error(
                    "[tribal_wedm_runtime] mode 'register_learned' requires tip object",
                  );
                }
                wedmTribalRuntimeEngine.registerLearnedTip(params.tip as any);
                result = { ok: true };
                break;
              case "learned_count":
                result = { count: wedmTribalRuntimeEngine.getLearnedTipCount() };
                break;
              default:
                throw new Error(
                  `[tribal_wedm_runtime] unknown mode: '${mode}'. ` +
                    `Expected one of: reload, select, get_tip, list_by_category, ` +
                    `stats, register_learned, learned_count.`,
                );
            }
            break;
          }
          // ── WIRE-UNWIRED-MS0/U-WIRE-BACKLOG-TRIBAL batch 4 (2026-05-21) ──
          // Final 3 unwired tribal engines (12 of 12 in this milestone).
          case "tribal_cam_tooltip": {
            const { CAMTribalKnowledgeInjectionEngine } = await import(
              "../../engines/CAMTribalKnowledgeInjectionEngine.js"
            );
            const mode = String(params.mode ?? "render");
            switch (mode) {
              case "supported_targets":
                result = { targets: CAMTribalKnowledgeInjectionEngine.supportedTargets() };
                break;
              case "render":
                if (!params.context || typeof params.context !== "object") {
                  throw new Error(
                    "[tribal_cam_tooltip] mode 'render' requires context object",
                  );
                }
                result = CAMTribalKnowledgeInjectionEngine.renderTooltip(
                  params.context as any,
                  typeof params.limit === "number" ? params.limit : undefined,
                );
                break;
              case "stats":
                if (typeof params.session_id !== "string") {
                  throw new Error(
                    "[tribal_cam_tooltip] mode 'stats' requires string session_id",
                  );
                }
                result = CAMTribalKnowledgeInjectionEngine.getStats(params.session_id);
                break;
              case "reset_session":
                if (typeof params.session_id !== "string") {
                  throw new Error(
                    "[tribal_cam_tooltip] mode 'reset_session' requires string session_id",
                  );
                }
                CAMTribalKnowledgeInjectionEngine.resetSession(params.session_id);
                result = { ok: true };
                break;
              case "reset_all":
                CAMTribalKnowledgeInjectionEngine.resetAll();
                result = { ok: true };
                break;
              default:
                throw new Error(
                  `[tribal_cam_tooltip] unknown mode: '${mode}'. ` +
                    `Expected one of: supported_targets, render, stats, reset_session, reset_all.`,
                );
            }
            break;
          }
          case "tribal_pp_integrate": {
            const { postProcessorTribalKnowledgeIntegrationEngine } = await import(
              "../../engines/PostProcessorTribalKnowledgeIntegrationEngine.js"
            );
            const mode = String(params.mode ?? "for_context");
            switch (mode) {
              case "all_tips":
                result = {
                  tips: postProcessorTribalKnowledgeIntegrationEngine.getAllTips(),
                };
                break;
              case "get_tip":
                if (typeof params.id !== "string") {
                  throw new Error(
                    "[tribal_pp_integrate] mode 'get_tip' requires string id",
                  );
                }
                result = {
                  tip: postProcessorTribalKnowledgeIntegrationEngine.getTip(params.id),
                };
                break;
              case "by_priority":
                if (typeof params.priority !== "string") {
                  throw new Error(
                    "[tribal_pp_integrate] mode 'by_priority' requires string priority",
                  );
                }
                result = {
                  tips: postProcessorTribalKnowledgeIntegrationEngine.getTipsByPriority(
                    params.priority as any,
                  ),
                };
                break;
              case "by_category":
                if (typeof params.category !== "string") {
                  throw new Error(
                    "[tribal_pp_integrate] mode 'by_category' requires string category",
                  );
                }
                result = {
                  tips: postProcessorTribalKnowledgeIntegrationEngine.getTipsByCategory(
                    params.category,
                  ),
                };
                break;
              case "for_controller":
                if (typeof params.controller !== "string") {
                  throw new Error(
                    "[tribal_pp_integrate] mode 'for_controller' requires string controller",
                  );
                }
                result = {
                  tips: postProcessorTribalKnowledgeIntegrationEngine.getTipsForController(
                    params.controller,
                  ),
                };
                break;
              case "for_operation":
                if (typeof params.operation !== "string") {
                  throw new Error(
                    "[tribal_pp_integrate] mode 'for_operation' requires string operation",
                  );
                }
                result = {
                  tips: postProcessorTribalKnowledgeIntegrationEngine.getTipsForOperation(
                    params.operation,
                  ),
                };
                break;
              case "for_material":
                if (typeof params.material !== "string") {
                  throw new Error(
                    "[tribal_pp_integrate] mode 'for_material' requires string material",
                  );
                }
                result = {
                  tips: postProcessorTribalKnowledgeIntegrationEngine.getTipsForMaterial(
                    params.material,
                  ),
                };
                break;
              case "for_context":
                result = {
                  tips: postProcessorTribalKnowledgeIntegrationEngine.getTipsForContext(
                    (params.context ?? {}) as any,
                  ),
                };
                break;
              case "critical_safety":
                result = {
                  tips: postProcessorTribalKnowledgeIntegrationEngine.getCriticalSafetyTips(),
                };
                break;
              case "search":
                if (typeof params.query !== "string") {
                  throw new Error(
                    "[tribal_pp_integrate] mode 'search' requires string query",
                  );
                }
                result = {
                  tips: postProcessorTribalKnowledgeIntegrationEngine.searchTips(
                    params.query,
                  ),
                };
                break;
              case "inject_agi":
                result = postProcessorTribalKnowledgeIntegrationEngine.injectForAGIContext(
                  (params.context ?? {}) as any,
                );
                break;
              case "totals":
                result = postProcessorTribalKnowledgeIntegrationEngine.getTotalTips();
                break;
              case "category_distribution":
                result = postProcessorTribalKnowledgeIntegrationEngine.getCategoryDistribution();
                break;
              case "external_sources":
                result = {
                  sources: postProcessorTribalKnowledgeIntegrationEngine.getExternalSources(),
                };
                break;
              default:
                throw new Error(
                  `[tribal_pp_integrate] unknown mode: '${mode}'. ` +
                    `Expected one of: all_tips, get_tip, by_priority, by_category, ` +
                    `for_controller, for_operation, for_material, for_context, ` +
                    `critical_safety, search, inject_agi, totals, ` +
                    `category_distribution, external_sources.`,
                );
            }
            break;
          }
          case "tribal_wedm_learn": {
            const { wedmTribalTipLearnerEngine } = await import(
              "../../engines/WEDMTribalTipLearnerEngine.js"
            );
            const mode = String(params.mode ?? "process_queue");
            switch (mode) {
              case "process_queue": {
                const maxCandidates =
                  typeof params.max_candidates === "number"
                    ? params.max_candidates
                    : 50;
                const autoApproveThreshold =
                  typeof params.auto_approve_threshold === "number"
                    ? params.auto_approve_threshold
                    : 0.85;
                result = await wedmTribalTipLearnerEngine.processQueue(
                  maxCandidates,
                  autoApproveThreshold,
                );
                break;
              }
              case "pending_review":
                result = {
                  pending: wedmTribalTipLearnerEngine.getPendingReview(
                    typeof params.limit === "number" ? params.limit : 50,
                  ),
                };
                break;
              case "approve":
                if (typeof params.tip_id !== "string") {
                  throw new Error(
                    "[tribal_wedm_learn] mode 'approve' requires string tip_id",
                  );
                }
                result = {
                  approved: wedmTribalTipLearnerEngine.approveTip(params.tip_id),
                };
                break;
              case "reject":
                if (typeof params.tip_id !== "string") {
                  throw new Error(
                    "[tribal_wedm_learn] mode 'reject' requires string tip_id",
                  );
                }
                result = {
                  rejected: wedmTribalTipLearnerEngine.rejectTip(params.tip_id),
                };
                break;
              case "learned":
                result = {
                  learned: wedmTribalTipLearnerEngine.getLearnedTips(
                    typeof params.limit === "number" ? params.limit : 100,
                  ),
                };
                break;
              case "approved":
                result = {
                  approved: wedmTribalTipLearnerEngine.getApprovedTips(
                    typeof params.limit === "number" ? params.limit : 100,
                  ),
                };
                break;
              case "stats":
                result = wedmTribalTipLearnerEngine.getStats();
                break;
              case "reset":
                wedmTribalTipLearnerEngine.reset();
                result = { ok: true };
                break;
              default:
                throw new Error(
                  `[tribal_wedm_learn] unknown mode: '${mode}'. ` +
                    `Expected one of: process_queue, pending_review, approve, reject, ` +
                    `learned, approved, stats, reset.`,
                );
            }
            break;
          }
          // ── WIRE-UNWIRED-MS0/U-WIRE-JMPA: JMDIEPatternAnalyzer static analysis ──
          case "jmdie_pattern_analyze": {
            const { JMDIEPatternAnalyzer } = await import("../../engines/JMDIEPatternAnalyzer.js");
            result = JMDIEPatternAnalyzer.analyze();
            break;
          }
          case "jmdie_pattern_rules": {
            const { JMDIEPatternAnalyzer } = await import("../../engines/JMDIEPatternAnalyzer.js");
            result = { rules: JMDIEPatternAnalyzer.getRulesForPlaybook() };
            break;
          }
          case "jmdie_pattern_tips": {
            const { JMDIEPatternAnalyzer } = await import("../../engines/JMDIEPatternAnalyzer.js");
            result = { tips: JMDIEPatternAnalyzer.getTipsForTribalKnowledge() };
            break;
          }
          // ── FEATURE-GAP-AUDIT-MS0/U-GAP-POST-JMDIE-LEARNING: .cps post-processor corpus learning ──
          case "jmdie_post_learn": {
            const { JMDiePostProcessorLearningEngine } = await import(
              "../../engines/JMDiePostProcessorLearningEngine.js"
            );
            result = JMDiePostProcessorLearningEngine.learn(
              typeof params.sourceDir === "string" ? params.sourceDir : undefined,
            );
            break;
          }
          case "jmdie_post_corpus": {
            const { JMDiePostProcessorLearningEngine } = await import(
              "../../engines/JMDiePostProcessorLearningEngine.js"
            );
            result = JMDiePostProcessorLearningEngine.getCorpus();
            break;
          }
          case "jmdie_post_query": {
            const { JMDiePostProcessorLearningEngine } = await import(
              "../../engines/JMDiePostProcessorLearningEngine.js"
            );
            const family = String(params.family ?? "");
            const queryCorpus = JMDiePostProcessorLearningEngine.getCorpus();
            result = {
              family,
              profiles: JMDiePostProcessorLearningEngine.queryByController(family),
              // Surface the corpus warning so a caller can distinguish "this
              // family has zero posts" from "the corpus is unreachable" —
              // slimResponse() drops an empty profiles array from the envelope.
              ...(queryCorpus.warning ? { warning: queryCorpus.warning } : {}),
            };
            break;
          }
          case "jmdie_post_catalog": {
            const { JMDiePostProcessorLearningEngine } = await import(
              "../../engines/JMDiePostProcessorLearningEngine.js"
            );
            const catalogCorpus = JMDiePostProcessorLearningEngine.getCorpus();
            result = {
              catalog: JMDiePostProcessorLearningEngine.getEnhancementCatalog(),
              ...(catalogCorpus.warning ? { warning: catalogCorpus.warning } : {}),
            };
            break;
          }
          case "jmdie_post_stats": {
            const { JMDiePostProcessorLearningEngine } = await import(
              "../../engines/JMDiePostProcessorLearningEngine.js"
            );
            result = JMDiePostProcessorLearningEngine.getStats();
            break;
          }
          case "jmdie_post_gaps": {
            // INDIA-POST-GAPS (india /loop 2026-05-22) — per-post + corpus-wide
            // enhancement-gap analysis over the cached `.cps` corpus. Pure read,
            // no I/O. Surfaces (a) postGaps: family patterns the post lacks,
            // (b) corpusWideGaps: enhancements with <50% adoption (e.g.
            // sidecar_json_export 1/12, physics_data_integration 1/12),
            // (c) prioritized recommendations for high-ROI rollouts.
            const { JMDiePostProcessorLearningEngine } = await import(
              "../../engines/JMDiePostProcessorLearningEngine.js"
            );
            result = JMDiePostProcessorLearningEngine.gapReport();
            break;
          }
          case "jmdie_post_reset": {
            const { JMDiePostProcessorLearningEngine } = await import(
              "../../engines/JMDiePostProcessorLearningEngine.js"
            );
            // Clears the process-global corpus cache so a subsequent
            // jmdie_post_corpus / _query / _stats re-discovers from disk.
            JMDiePostProcessorLearningEngine.reset();
            result = { reset: true };
            break;
          }
          // ── OBSIDIAN-MS0: Obsidian Vault Sync ──
          case "obsidian_sync_pull": {
            const { obsidianVaultSyncEngine } = await import("../../engines/ObsidianVaultSyncEngine.js");
            result = await obsidianVaultSyncEngine.pull({
              vault_path: await resolveObsidianVault(params.vault_path),
              sync_folder: params.sync_folder,
              incremental: params.incremental ?? true,
              dry_run: params.dry_run ?? false,
            });
            break;
          }
          case "obsidian_sync_push": {
            const { obsidianVaultSyncEngine } = await import("../../engines/ObsidianVaultSyncEngine.js");
            result = await obsidianVaultSyncEngine.push({
              vault_path: await resolveObsidianVault(params.vault_path),
              sync_folder: params.sync_folder ?? "PRISM",
              tip_ids: params.tip_ids,
              incremental: params.incremental ?? true,
              dry_run: params.dry_run ?? false,
            });
            break;
          }
          case "obsidian_sync_status": {
            const { obsidianVaultSyncEngine } = await import("../../engines/ObsidianVaultSyncEngine.js");
            result = obsidianVaultSyncEngine.status(await resolveObsidianVault(params.vault_path));
            break;
          }
          case "obsidian_sync_config": {
            const { obsidianVaultSyncEngine } = await import("../../engines/ObsidianVaultSyncEngine.js");
            result = obsidianVaultSyncEngine.configure({
              vault_path: (await resolveObsidianVault(params.vault_path)) || undefined,
              sync_folder: params.sync_folder,
              enable_bidirectional: params.enable_bidirectional,
              conflict_strategy: params.conflict_strategy,
            });
            break;
          }
          // ── OBSIDIAN-MS0: Plugin Bridge (U-OBS-BRIDGE02) ──
          case "obsidian_plugin_register": {
            const { obsidianPluginBridgeEngine } = await import("../../engines/ObsidianPluginBridgeEngine.js");
            result = obsidianPluginBridgeEngine.register({
              plugin_id: params.plugin_id,
              plugin_name: params.plugin_name,
              version: params.version,
              vault_path: params.vault_path,
              capabilities: params.capabilities,
            });
            break;
          }
          case "obsidian_plugin_query": {
            const { obsidianPluginBridgeEngine } = await import("../../engines/ObsidianPluginBridgeEngine.js");
            result = await obsidianPluginBridgeEngine.query({
              api_key: params.api_key,
              action: params.action,
              params: params.query_params ?? params.params ?? {},
              timeout_ms: params.timeout_ms,
            });
            break;
          }
          case "obsidian_plugin_subscribe": {
            const { obsidianPluginBridgeEngine } = await import("../../engines/ObsidianPluginBridgeEngine.js");
            result = obsidianPluginBridgeEngine.subscribe({
              api_key: params.api_key,
              event_types: params.event_types,
              filter: params.filter,
            });
            break;
          }
          case "obsidian_plugin_unsubscribe": {
            const { obsidianPluginBridgeEngine } = await import("../../engines/ObsidianPluginBridgeEngine.js");
            result = obsidianPluginBridgeEngine.unsubscribe({
              api_key: params.api_key,
              subscription_id: params.subscription_id,
            });
            break;
          }
          case "obsidian_plugin_status": {
            const { obsidianPluginBridgeEngine } = await import("../../engines/ObsidianPluginBridgeEngine.js");
            result = obsidianPluginBridgeEngine.status(params.api_key);
            break;
          }
          // -- OBSIDIAN-VIZ-MS0/U-VIZ-DISPATCHER: live system map ──────
          case "obsidian_viz_regenerate": {
            // Detached spawn so the dispatcher returns fast. Runs the modern
            // regen-viz pipeline (FAST mode) — it rebuilds all augmentations,
            // merges, repairs/dedups, and includes generate-git-tree.mjs +
            // generate-vault-graph.mjs (the graph→Obsidian PRISM-System-Map.canvas
            // + the wiki-folder hubs) + generate-executive-briefing.mjs +
            // generate-wiki-debt-worklist.mjs. The --max-old-space-size / --stack-size
            // flags are required: the merged graph is >90 MB and JSON.stringify on
            // it blows the default Windows thread stack without them.
            const { spawn } = await import("node:child_process");
            const fullRegen = params?.full === true || params?.mode === "full";
            const args = ["--max-old-space-size=16384", "--stack-size=8192", "H:/prism/scripts/regen-viz.mjs"];
            if (fullRegen) args.push("--full");
            const child = spawn(process.execPath, args, {
              detached: true, stdio: "ignore", windowsHide: true, cwd: "H:/prism",
            });
            child.unref();
            result = {
              spawned: true,
              pid: child.pid ?? null,
              mode: fullRegen ? "full" : "fast",
              pipeline: "regen-viz.mjs",
              produces: [
                "H:/prism/state/shared/system-viz/system-graph.json",
                "H:/prism/knowledge/PRISM-System-Map.canvas",
                "H:/prism/state/shared/system-viz/EXECUTIVE-BRIEFING.md",
                "H:/prism/state/shared/system-viz/WIKI-DEBT-WORKLIST.md",
              ],
              note: `Regenerating in background (${fullRegen ? "FULL ~15-20 min" : "FAST ~60s"}); reload http://127.0.0.1:8765/ when done. Pass {full:true} for the heavy fs-deep + L11 + obsidian-bridge pass.`,
            };
            break;
          }
          case "obsidian_viz_status": {
            const { wikiRecallCounterEngine } = await import("../../engines/WikiRecallCounterEngine.js");
            const fs = await import("node:fs");
            const graphPath = "H:/prism/state/shared/system-viz/system-graph.json";
            let graphMeta: { exists: boolean; mtime?: string; nodes?: number; edges?: number; layers?: number } = { exists: false };
            try {
              const stat = fs.statSync(graphPath);
              const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
              graphMeta = {
                exists: true,
                mtime: stat.mtime.toISOString(),
                nodes: graph?.nodes?.length ?? 0,
                edges: graph?.edges?.length ?? 0,
                layers: graph?.layers?.length ?? 0,
              };
            } catch { /* graph not generated yet */ }
            const recall = wikiRecallCounterEngine.getStateSnapshot();
            result = {
              graph: graphMeta,
              recall: {
                schemaVersion: recall.schemaVersion,
                totalRecalls: recall.totalRecalls,
                entryCount: recall.entryCount,
                updatedAtIso: recall.updatedAtIso,
              },
            };
            break;
          }
          case "obsidian_viz_recall_top": {
            const { wikiRecallCounterEngine } = await import("../../engines/WikiRecallCounterEngine.js");
            const limit = Number.isFinite(params?.limit) ? Number(params.limit) : 20;
            const kind = params?.kind === "memory" || params?.kind === "wiki" ? params.kind : undefined;
            result = { top: wikiRecallCounterEngine.getTopRecalled(limit, kind) };
            break;
          }
          // -- Tribal Tip Export ------------------------------
          case "tribal_export_single": {
            const { tribalTipExportEngine, ExportSingleSchema } = await import("../../engines/TribalTipExportEngine.js");
            result = tribalTipExportEngine.exportSingle(ExportSingleSchema.parse(params));
            break;
          }
          case "tribal_export_bulk": {
            const { tribalTipExportEngine, ExportBulkSchema } = await import("../../engines/TribalTipExportEngine.js");
            result = tribalTipExportEngine.exportBulk(ExportBulkSchema.parse(params));
            break;
          }
          case "tribal_export_config": {
            const { tribalTipExportEngine, ExportConfigSchema } = await import("../../engines/TribalTipExportEngine.js");
            result = tribalTipExportEngine.configure(ExportConfigSchema.parse(params));
            break;
          }
          case "tribal_export_status": {
            const { tribalTipExportEngine } = await import("../../engines/TribalTipExportEngine.js");
            result = tribalTipExportEngine.status();
            break;
          }
          // ── Shop Floor Note Ingestion (OBSIDIAN-MS0) ─────────
          case "shop_note_ingest": {
            const { ShopFloorNoteIngestionEngine } = await import("../../engines/ShopFloorNoteIngestionEngine.js");
            const engine = new ShopFloorNoteIngestionEngine();
            result = await engine.ingest(params as any);
            break;
          }
          case "shop_note_parse": {
            const { ShopFloorNoteIngestionEngine } = await import("../../engines/ShopFloorNoteIngestionEngine.js");
            const engine = new ShopFloorNoteIngestionEngine();
            result = engine.parse(params as any);
            break;
          }
          case "shop_note_batch": {
            const { ShopFloorNoteIngestionEngine } = await import("../../engines/ShopFloorNoteIngestionEngine.js");
            const engine = new ShopFloorNoteIngestionEngine();
            result = await engine.batch(params as any);
            break;
          }
          case "shop_note_validate": {
            const { ShopFloorNoteIngestionEngine } = await import("../../engines/ShopFloorNoteIngestionEngine.js");
            const engine = new ShopFloorNoteIngestionEngine();
            result = engine.validate(params as any);
            break;
          }
          case "shop_note_status": {
            const { ShopFloorNoteIngestionEngine } = await import("../../engines/ShopFloorNoteIngestionEngine.js");
            const engine = new ShopFloorNoteIngestionEngine();
            result = engine.status();
            break;
          }
          // ── PRISM Academy ──────────────────────────────────
          case "academy_courses":
          case "academy_course_detail":
          case "academy_start_course":
          case "academy_complete_lesson":
          case "academy_dashboard":
          case "academy_certification_check":
          case "academy_formula_cards":
          case "academy_generate_questions":
          case "academy_quiz_start":
          case "academy_quiz_answer":
          case "academy_quiz_result": {
            const { CurriculumEngine } = await import("../../engines/CurriculumEngine.js");
            const { AssessmentEngine } = await import("../../engines/AssessmentEngine.js");
            const { LessonRendererEngine } = await import("../../engines/LessonRendererEngine.js");
            const curriculum = new CurriculumEngine();
            const assessment = new AssessmentEngine();
            const renderer = new LessonRendererEngine();
            const sid = params.student_id ?? "default";
            switch (action) {
              case "academy_courses":
                result = curriculum.getAllCourses().map(c => ({
                  id: c.id, title: c.title, level: c.level,
                  modules: c.modules.length, hours: c.estimatedHours,
                  prerequisites: c.prerequisites,
                }));
                break;
              case "academy_course_detail":
                result = curriculum.getCourse(params.course_id);
                break;
              case "academy_start_course":
                result = curriculum.startCourse(sid, params.course_id);
                break;
              case "academy_complete_lesson":
                result = curriculum.completeLesson(
                  sid, params.course_id, params.module_id,
                  params.lesson_id, params.time_minutes ?? 5
                );
                break;
              case "academy_dashboard":
                result = curriculum.getStudentDashboard(sid);
                break;
              case "academy_certification_check":
                result = curriculum.checkCertificationEligibility(
                  sid, params.level ?? "operator"
                );
                break;
              case "academy_formula_cards":
                result = renderer.getAllFormulaCards();
                break;
              case "academy_generate_questions":
                result = assessment.generateSpeedFeedQuestions(
                  params.difficulty ?? 2
                );
                break;
              case "academy_quiz_start": {
                const course = curriculum.getCourse(params.course_id);
                const mod = course?.modules.find(
                  m => m.id === params.module_id
                );
                const questions = mod?.quiz.questions.length
                  ? mod.quiz.questions
                  : assessment.generateSpeedFeedQuestions(2);
                result = assessment.startSession(
                  sid, mod?.quiz.id ?? "quiz", questions,
                  params.time_limit_minutes
                );
                break;
              }
              case "academy_quiz_answer":
                result = assessment.submitAnswer(
                  params.session_id, params.answer
                );
                break;
              case "academy_quiz_result":
                result = assessment.getResult(params.session_id);
                break;
              default:
                result = { error: `Unknown academy action: ${action}` };
            }
            break;
          }
          // ── PRISM Academy Scheduler (TrainingSchedulerEngine) ─
          case "academy_enroll":
          case "academy_get_enrollments":
          case "academy_refresh_status":
          case "academy_recommend_remediation":
          case "academy_schedule_generate":
          case "academy_employee_report":
          case "academy_recommend_next_course": {
            const { TrainingSchedulerEngine } = await import("../../engines/TrainingSchedulerEngine.js");
            const scheduler = new TrainingSchedulerEngine();
            const empId = params.employee_id ?? params.student_id ?? "default";
            switch (action) {
              case "academy_enroll":
                result = scheduler.enrollEmployee({
                  employeeId: empId,
                  courseId: params.course_id,
                  targetCompletionDate: params.target_completion_date,
                  priority: (params.priority ?? 2) as 1 | 2 | 3,
                  enrolledBy: params.enrolled_by ?? "self",
                });
                break;
              case "academy_get_enrollments":
                result = scheduler.getEnrollments(empId);
                break;
              case "academy_refresh_status":
                result = scheduler.refreshEnrollmentStatuses(empId);
                break;
              case "academy_recommend_remediation":
                result = scheduler.recommendRemediation(empId, params.course_id, params.module_id);
                break;
              case "academy_schedule_generate":
                result = scheduler.generateSchedule(
                  empId,
                  params.days ?? 7,
                  params.daily_minutes_budget ?? 60,
                );
                break;
              case "academy_employee_report":
                result = scheduler.generateReport(empId);
                break;
              case "academy_recommend_next_course":
                result = scheduler.recommendNextCourse(empId);
                break;
              default:
                result = { error: `Unknown scheduler action: ${action}` };
            }
            break;
          }
          // ── Visual Lab (3D Scene Descriptions) ─────────────
          case "visual_lab_tool":
          case "visual_lab_workpiece":
          case "visual_lab_animation":
          case "visual_lab_toolpath":
          case "visual_lab_stress":
          case "visual_lab_chip":
          case "visual_lab_params": {
            const { visualLabEngine } = await import(
              "../../engines/VisualLabEngine.js"
            );
            const actionMap: Record<string, string> = {
              visual_lab_tool: "tool_scene",
              visual_lab_workpiece: "workpiece_scene",
              visual_lab_animation: "cutting_animation",
              visual_lab_toolpath: "toolpath_preview",
              visual_lab_stress: "stress_overlay",
              visual_lab_chip: "chip_formation",
              visual_lab_params: "interactive_param",
            };
            result = visualLabEngine.calculate(
              actionMap[action] as any, params
            );
            break;
          }
          case "kg_schema":
          case "kg_populate":
          case "kg_query":
          case "kg_recommend":
          case "kg_gap": {
            const kg = await getKGEngine();
            if (!kg) return dispatcherError(new Error("KG engine unavailable"), action, "prism_knowledge");
            const kgResult = kg.calculate(action, params);
            return { content: [{ type: "text", text: JSON.stringify(slimResponse(kgResult)) }] };
          }
          // ── Troubleshooting Decision Tree ──────────────────
          case "troubleshoot_diagnose":
          case "troubleshoot_by_symptom":
          case "troubleshoot_tree":
          case "troubleshoot_common": {
            const { troubleshootingDecisionTreeEngine: dtEngine } = await import(
              "../../engines/TroubleshootingDecisionTreeEngine.js"
            );
            result = dtEngine.calculate(action, params);
            break;
          }
          // ── Instructor Dashboard ─────────────────────────
          case "instructor_create_class":
          case "instructor_enroll":
          case "instructor_grades":
          case "instructor_analytics":
          case "instructor_export":
          case "instructor_assign": {
            const ie = await getInstructorEngine();
            if (!ie) {
              return dispatcherError(
                new Error("InstructorDashboardEngine N/A"),
                action,
                "prism_knowledge"
              );
            }
            result = await ie.calculate(action, params);
            break;
          }
          // ── Course Builder (VAL-MS9) ───────────────────────
          case "course_build":
          case "course_build_from_rules":
          case "course_catalog":
          case "course_quiz_generate":
          case "course_pricing": {
            const { courseBuilderEngine: cbEngine } = await import(
              "../../engines/CourseBuilderEngine.js"
            );
            result = cbEngine.calculate(action, params);
            break;
          }
          // ── Learn Pipeline (LEARN-MS0) ────────────────────
          case "learn_ingest_text": {
            const { contentIngestionPipelineEngine } = await import("../../engines/ContentIngestionPipelineEngine.js");
            result = await contentIngestionPipelineEngine.ingest({
              content_type: "text",
              content: params.content ?? params.text ?? "",
              source: params.source,
              title: params.title,
              metadata: params.metadata,
            });
            break;
          }
          case "learn_ingest_video": {
            const { contentIngestionPipelineEngine } = await import("../../engines/ContentIngestionPipelineEngine.js");
            result = await contentIngestionPipelineEngine.ingest({
              content_type: "video",
              content: params.file_path ?? params.content ?? "",
              source: params.source,
              metadata: params.metadata,
            });
            break;
          }
          case "learn_ingest_document": {
            const { contentIngestionPipelineEngine } = await import("../../engines/ContentIngestionPipelineEngine.js");
            result = await contentIngestionPipelineEngine.ingest({
              content_type: "document",
              content: params.file_path ?? params.content ?? "",
              source: params.source,
              metadata: params.metadata,
            });
            break;
          }
          case "learn_ingest_url": {
            const { contentIngestionPipelineEngine } = await import("../../engines/ContentIngestionPipelineEngine.js");
            result = await contentIngestionPipelineEngine.ingest({
              content_type: "url",
              content: params.url ?? params.content ?? "",
              source: params.source,
              metadata: params.metadata,
            });
            break;
          }
          case "learn_auto_tag": {
            const { contentAutoTaggerEngine } = await import("../../engines/ContentAutoTaggerEngine.js");
            result = contentAutoTaggerEngine.tag(params.text ?? params.content ?? "");
            break;
          }
          case "learn_dedup_check": {
            const { knowledgeDeduplicationEngine } = await import("../../engines/KnowledgeDeduplicationEngine.js");
            const { tribalKnowledgeEngine } = await import("../../engines/TribalKnowledgeEngine.js");
            const existing = tribalKnowledgeEngine.search({ limit: params.corpus_limit ?? 500 });
            const corpus = existing.map((t: any) => ({ id: t.id, title: t.title, body: t.body }));
            result = knowledgeDeduplicationEngine.check(
              params.text ?? params.content ?? "",
              corpus,
              { duplicate_threshold: params.duplicate_threshold, related_threshold: params.related_threshold },
            );
            break;
          }
          case "learn_search_knowledge": {
            const { tribalKnowledgeEngine } = await import("../../engines/TribalKnowledgeEngine.js");
            result = tribalKnowledgeEngine.search({
              query: params.query ?? "",
              category: params.category,
              material_iso_group: params.material_iso_group,
              operation_type: params.operation_type,
              min_confidence: params.min_confidence,
              limit: params.limit ?? 20,
            });
            break;
          }
          case "learn_get_stats": {
            const { contentIngestionPipelineEngine } = await import("../../engines/ContentIngestionPipelineEngine.js");
            result = contentIngestionPipelineEngine.getStats();
            break;
          }
          // ── Video Learning Pipeline (LEARN-MS1) ──────────────
          case "learn_video_process": {
            const { videoLearningEngine } = await import("../../engines/VideoLearningEngine.js");
            result = await videoLearningEngine.processVideo(
              params.file_path ?? "",
              {
                output_dir: params.output_dir,
                domain_override: params.domain,
                max_keyframes: params.max_keyframes,
                skip_transcription: params.skip_transcription,
                skip_vision: params.skip_vision,
                scene_threshold: params.scene_threshold,
              }
            );
            break;
          }
          case "learn_video_transcript": {
            const { videoLearningEngine } = await import("../../engines/VideoLearningEngine.js");
            result = await videoLearningEngine.processVideo(
              params.file_path ?? "",
              {
                skip_vision: true,
                whisper_model: params.whisper_model,
              }
            );
            // Return just the transcript portion
            result = {
              transcript: result.transcript,
              duration_seconds: result.duration_seconds,
              video_path: result.video_path,
            };
            break;
          }
          case "learn_video_keyframes": {
            const { videoLearningEngine } = await import("../../engines/VideoLearningEngine.js");
            const prereqs = await videoLearningEngine.checkPrerequisites();
            if (!prereqs.ffmpeg) {
              result = { error: "FFmpeg not available — required for keyframe extraction", prerequisites: prereqs };
              break;
            }
            const outputDir = params.output_dir ?? "/tmp/prism-keyframes";
            const keyframes = await videoLearningEngine.extractKeyframes(
              params.file_path ?? "",
              outputDir,
              {
                maxFrames: params.max_keyframes,
                useSceneDetection: params.use_scene_detection !== false,
                sceneThreshold: params.scene_threshold,
                interval: params.interval,
              }
            );
            result = { keyframes_extracted: keyframes.length, keyframes, output_dir: outputDir };
            break;
          }
          case "learn_video_knowledge": {
            const { videoLearningEngine } = await import("../../engines/VideoLearningEngine.js");
            const fullResult = await videoLearningEngine.processVideo(
              params.file_path ?? "",
              {
                domain_override: params.domain,
                max_keyframes: params.max_keyframes,
              }
            );
            result = {
              knowledge_items: fullResult.knowledge_items,
              items_count: fullResult.knowledge_items.length,
              duration_seconds: fullResult.duration_seconds,
              api_cost_estimate: fullResult.api_cost_estimate,
            };
            break;
          }
          // ── U-BRIDGE-WIRE-VIDEO (BACKEND-DEV-LOOP iter15) ─────
          // Wires 3 previously-unwired Video engines into prism_knowledge
          // (VideoActionExtractorEngine / VideoReplayOrchestratorEngine /
          // VideoReplayPipelineEngine — each had 0 dispatcher refs before
          // 2026-05-18 iter15).
          case "learn_video_extract_actions": {
            const { videoActionExtractorEngine } = await import("../../engines/VideoActionExtractorEngine.js");
            const seq = await videoActionExtractorEngine.processVideoForActions(
              params.file_path ?? "",
              {
                keyframe_interval_s: params.keyframe_interval_s,
                max_keyframes: params.max_keyframes,
                target_software: params.target_software,
                ocr_enabled: params.ocr_enabled,
                min_confidence: params.min_confidence,
              },
            );
            result = {
              video_path: seq.video_path,
              software_detected: seq.software_detected,
              total_duration_s: seq.total_duration_s,
              actions: seq.actions,
              actions_count: seq.actions.length,
              summary: seq.summary,
              difficulty_rating: seq.difficulty_rating,
              operation_types_used: seq.operation_types_used,
            };
            break;
          }
          case "learn_video_replay": {
            const { videoReplayOrchestratorEngine } = await import("../../engines/VideoReplayOrchestratorEngine.js");
            const replay = videoReplayOrchestratorEngine.replayFromVideo(
              params.file_path ?? "",
              {
                mode: params.mode ?? "autonomous",
                target_software: params.target_software,
                output_format: params.output_format,
                max_retries: params.max_retries,
                tolerance_pct: params.tolerance_pct,
                parametric: params.parametric,
              },
            );
            result = {
              success: replay.success,
              video_path: replay.video_path,
              mode: replay.mode,
              actions_extracted: replay.actions_extracted,
              actions_executed: replay.actions_executed,
              actions_failed: replay.actions_failed,
              actions_skipped: replay.actions_skipped,
              generated_script: replay.generated_script,
              output_files: replay.output_files,
              execution_time_ms: replay.execution_time_ms,
              accuracy_score: replay.accuracy_score,
              errors: replay.errors,
              warnings: replay.warnings,
              summary: replay.summary,
            };
            break;
          }
          case "learn_video_pipeline_run": {
            const { videoReplayPipelineEngine } = await import("../../engines/VideoReplayPipelineEngine.js");
            const piped = await videoReplayPipelineEngine.runFullPipeline(
              params.file_path ?? "",
              {
                output_dir: params.output_dir,
                output_format: params.output_format,
                parametric: params.parametric,
                model: params.model,
                frame_interval_s: params.frame_interval_s,
                max_frames: params.max_frames,
                dry_run: params.dry_run,
                description_mode: params.description_mode,
              },
            );
            result = piped;
            break;
          }
          // ── Interactive Learning Sessions (LEARN-MS1) ────────
          case "learn_session_create": {
            const { interactiveLearningSessionEngine } = await import("../../engines/InteractiveLearningSessionEngine.js");
            const actions = (params.actions ?? []).map((a: any, i: number) => ({
              action_type: a.action_type ?? "unknown",
              step_number: a.step_number ?? i + 1,
              parameters: a.parameters ?? {},
              confidence: a.confidence ?? 0.5,
              timestamp: 0,
              source_frame: "",
            }));
            const session = interactiveLearningSessionEngine.startSession(
              params.video_path ?? "",
              actions,
            );
            learningSessions.set(session.session_id, session);
            result = {
              session_id: session.session_id,
              total_steps: session.total_steps,
              status: session.status,
              current_step: session.current_step,
            };
            break;
          }
          case "learn_session_submit": {
            const { interactiveLearningSessionEngine } = await import("../../engines/InteractiveLearningSessionEngine.js");
            const session = learningSessions.get(params.session_id);
            if (!session) {
              result = { error: `Session not found: ${params.session_id}` };
              break;
            }
            const step = params.step ?? session.current_step;
            const submitAction = params.action ?? "confirm";
            let updated = session;
            if (submitAction === "confirm") {
              updated = interactiveLearningSessionEngine.confirmStep(session, step);
            } else if (submitAction === "correct") {
              updated = interactiveLearningSessionEngine.applyCorrection(session, step, {
                action_type: params.correction?.action_type,
                parameters: params.correction?.parameters,
                confidence: params.correction?.confidence,
              });
            } else if (submitAction === "skip") {
              updated = interactiveLearningSessionEngine.skipStep(session, step, params.reason);
            }
            learningSessions.set(params.session_id, updated);
            result = {
              session_id: updated.session_id,
              current_step: updated.current_step,
              total_steps: updated.total_steps,
              status: updated.status,
              step_result: submitAction,
            };
            break;
          }
          case "learn_session_clarify": {
            const { interactiveLearningSessionEngine } = await import("../../engines/InteractiveLearningSessionEngine.js");
            const clarifySession = learningSessions.get(params.session_id);
            if (!clarifySession) {
              result = { error: `Session not found: ${params.session_id}` };
              break;
            }
            const reviewResult = interactiveLearningSessionEngine.reviewStep(
              clarifySession,
              params.step ?? clarifySession.current_step,
            );
            result = {
              session_id: params.session_id,
              step: params.step ?? clarifySession.current_step,
              action: reviewResult.action,
              question: reviewResult.question ?? null,
            };
            break;
          }
          case "learn_session_summary": {
            const { interactiveLearningSessionEngine } = await import("../../engines/InteractiveLearningSessionEngine.js");
            const summarySession = learningSessions.get(params.session_id);
            if (!summarySession) {
              result = { error: `Session not found: ${params.session_id}` };
              break;
            }
            result = interactiveLearningSessionEngine.getSessionSummary(summarySession);
            break;
          }
          // ── URL Content Extraction (LEARN-MS1-S2) ────────────
          case "learn_url_detect": {
            const { urlContentExtractorEngine } = await import("../../engines/URLContentExtractorEngine.js");
            result = urlContentExtractorEngine.detect(params.url ?? "");
            break;
          }
          case "learn_url_extract": {
            const { urlContentExtractorEngine } = await import("../../engines/URLContentExtractorEngine.js");
            if (params.html) {
              result = urlContentExtractorEngine.extractFromHTML(params.url ?? "", params.html);
            } else {
              result = urlContentExtractorEngine.extractFromURL(params.url ?? "");
            }
            break;
          }
          // ── Skill-Marketplace Scan (SKILLS-UTILIZATION-MS0 / U-SKU07) ──────
          case "skill_marketplace_scan": {
            // Scan community skill collections (anthropics/skills, wshobson/agents, obra/superpowers + skillsmp.com)
            // for PRISM-domain-relevant skills; score relevance, dedup against the library, RECOMMEND ONLY (never install).
            // Read-only; the dated state/shared/skill-marketplace-candidates-<date>.{md,json} artifacts are written by
            // scripts/skill-marketplace-scan.mjs / the monthly cron, not here (unless write=true).
            const { skillMarketplaceScannerEngine, DEFAULT_MARKETPLACE_SOURCES } = await import("../../engines/SkillMarketplaceScannerEngine.js");
            const wanted: string[] | null = Array.isArray(params.sources) ? params.sources.map((s: any) => String(s)) : null;
            const injected: Record<string, string> | null =
              params.sources_content && typeof params.sources_content === "object" && !Array.isArray(params.sources_content)
                ? Object.fromEntries(Object.entries(params.sources_content as Record<string, unknown>).map(([k, v]) => [k, String(v ?? "")]))
                : null;
            const sources: Array<{ id: string; url: string; content?: string; fetchError?: string }> = [];
            for (const src of DEFAULT_MARKETPLACE_SOURCES as ReadonlyArray<{ id: string; url: string; jsGated?: boolean }>) {
              if (wanted && !wanted.includes(src.id)) continue;
              if (injected && Object.prototype.hasOwnProperty.call(injected, src.id)) { sources.push({ id: src.id, url: src.url, content: injected[src.id] }); continue; }
              if (src.jsGated) { sources.push({ id: src.id, url: src.url, fetchError: "JS-rendered SPA — a raw fetch returns only the app shell; needs the Playwright MCP. Skipped." }); continue; }
              try {
                const res = await fetch(src.url, { signal: AbortSignal.timeout(15_000), headers: { "user-agent": "PRISM-skill-marketplace-scan/1.0 (+internal tooling)" } });
                if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
                sources.push({ id: src.id, url: src.url, content: await res.text() });
              } catch (e: any) { sources.push({ id: src.id, url: src.url, fetchError: String(e?.message ?? e) }); }
            }
            if (injected) for (const id of Object.keys(injected)) if (!sources.some((s) => s.id === id)) sources.push({ id, url: `(injected:${id})`, content: injected[id] });
            const scanResult = skillMarketplaceScannerEngine.scan({
              sources,
              ...(typeof params.min_relevance === "number" ? { minRelevance: params.min_relevance } : {}),
              ...(typeof params.cap === "number" ? { perSourceCap: params.cap } : {}),
              ...(typeof params.registry_path === "string" ? { registryPath: params.registry_path } : {}),
            });
            if (params.write === true) {
              const fsMod = await import("node:fs"); const pathMod = await import("node:path");
              const { SKILL_MARKETPLACE_OUTPUT_DIR } = await import("../../engines/SkillMarketplaceScannerEngine.js");
              const dateLabel = scanResult.generatedAt.slice(0, 10);
              fsMod.mkdirSync(SKILL_MARKETPLACE_OUTPUT_DIR, { recursive: true });
              fsMod.writeFileSync(pathMod.join(SKILL_MARKETPLACE_OUTPUT_DIR, `skill-marketplace-candidates-${dateLabel}.json`), JSON.stringify(scanResult, null, 2) + "\n", "utf-8");
              fsMod.writeFileSync(pathMod.join(SKILL_MARKETPLACE_OUTPUT_DIR, `skill-marketplace-candidates-${dateLabel}.md`), skillMarketplaceScannerEngine.renderMarkdown(scanResult, { dateLabel }), "utf-8");
            }
            // default: the full structured result (it's bounded — candidates cap at perSourceCap × #sources); markdown=true adds the rendered report
            result = params.markdown === true ? { ...scanResult, markdown: skillMarketplaceScannerEngine.renderMarkdown(scanResult) } : scanResult;
            break;
          }
          // ── Social Media Parsing (LEARN-MS1-S2) ──────────────
          case "learn_social_parse": {
            const { socialMediaParserEngine } = await import("../../engines/SocialMediaParserEngine.js");
            result = socialMediaParserEngine.parse({
              platform: params.platform ?? "unknown",
              author: params.author ?? "",
              text: params.text ?? params.content ?? "",
              images: params.images,
              url: params.url,
            });
            break;
          }
          case "learn_social_batch": {
            const { socialMediaParserEngine } = await import("../../engines/SocialMediaParserEngine.js");
            const posts = (params.posts ?? []).map((p: any) => ({
              platform: p.platform ?? "unknown",
              author: p.author ?? "",
              text: p.text ?? "",
              images: p.images,
              url: p.url,
            }));
            result = socialMediaParserEngine.parseBatch(posts);
            break;
          }
          // ── Knowledge Graph Enrichment (LEARN-MS2) ──────────────
          case "learn_auto_link": {
            const { contentIngestionPipelineEngine } = await import("../../engines/ContentIngestionPipelineEngine.js");
            result = contentIngestionPipelineEngine.autoLink(
              params.tip_id ?? params.tipId ?? "",
              params.text ?? params.content ?? "",
              params.tags ?? [],
              params.source ?? "manual",
            );
            break;
          }
          case "learn_gap_detect": {
            const { manufacturingKnowledgeGraphEngine } = await import("../../engines/ManufacturingKnowledgeGraphEngine.js");
            result = manufacturingKnowledgeGraphEngine.detectKnowledgeGaps(
              params.min_tips ?? params.minTips ?? 3,
              params.max_gaps ?? params.maxGaps ?? 50,
            );
            break;
          }
          case "learn_validate_physics": {
            const { knowledgePhysicsValidatorEngine } = await import("../../engines/KnowledgePhysicsValidatorEngine.js");
            if (params.texts && Array.isArray(params.texts)) {
              result = knowledgePhysicsValidatorEngine.validateBatch(params.texts, params.iso_group);
            } else {
              result = knowledgePhysicsValidatorEngine.validate(
                params.text ?? params.content ?? "",
                params.iso_group ?? params.isoGroup,
              );
            }
            break;
          }
          // ── Enhanced Knowledge Search + Context Recommendations (LEARN-MS2-S2) ──
          case "learn_search_enhanced": {
            const { contentIngestionPipelineEngine } = await import("../../engines/ContentIngestionPipelineEngine.js");
            result = contentIngestionPipelineEngine.enhancedSearch(
              params.query ?? params.text ?? "",
              {
                sources: params.sources,
                category: params.category,
                material_iso_group: params.material_iso_group,
                operation_type: params.operation_type,
                min_confidence: params.min_confidence,
                min_score: params.min_score,
                limit: params.limit,
                validate_physics: params.validate_physics,
              },
            );
            break;
          }
          case "learn_context_recommend": {
            const { manufacturingKnowledgeGraphEngine: mkgEngine } = await import("../../engines/ManufacturingKnowledgeGraphEngine.js");
            result = mkgEngine.contextRecommend(
              {
                material_iso: params.material_iso ?? params.material_iso_group,
                operation: params.operation ?? params.operation_type,
                machine_type: params.machine_type,
              },
              {
                limit: params.limit,
                min_confidence: params.min_confidence,
                validate_physics: params.validate_physics ?? true,
              },
            );
            break;
          }

          // ── LEARN-MS3: Course Auto-Generation ─────────────────
          case "learn_course_build": {
            const { courseBuilderEngine: cbe } = await import("../../engines/CourseBuilderEngine.js");
            result = cbe.courseBuild({
              camSystem: params.cam_system ?? params.camSystem ?? "",
              level: params.level ?? "beginner",
              maxModules: params.max_modules ?? params.maxModules ?? 10,
            });
            break;
          }
          case "learn_course_from_rules": {
            const { courseBuilderEngine: cbe } = await import("../../engines/CourseBuilderEngine.js");
            result = cbe.courseBuildFromRules({
              categories: params.categories ?? [],
              level: params.level ?? "intermediate",
              maxModules: params.max_modules ?? params.maxModules ?? 10,
            });
            break;
          }
          case "learn_course_catalog": {
            const { courseBuilderEngine: cbe } = await import("../../engines/CourseBuilderEngine.js");
            result = cbe.courseCatalog();
            break;
          }
          case "learn_course_quiz": {
            const { courseBuilderEngine: cbe } = await import("../../engines/CourseBuilderEngine.js");
            result = cbe.courseQuizGenerate({
              ruleCategories: params.rule_categories ?? params.ruleCategories,
              count: params.count ?? 10,
              difficulty: params.difficulty ?? "medium",
            });
            break;
          }
          case "learn_course_pricing": {
            const { courseBuilderEngine: cbe } = await import("../../engines/CourseBuilderEngine.js");
            result = cbe.coursePricing();
            break;
          }
          case "learn_course_from_source": {
            const { courseBuilderEngine: cbe } = await import("../../engines/CourseBuilderEngine.js");
            result = cbe.courseFromSource({
              material_iso_group: params.material_iso_group ?? params.material_iso,
              operation_type: params.operation_type ?? params.operation,
              level: params.level ?? "intermediate",
              maxModules: params.max_modules ?? 10,
              sources: params.sources,
            });
            break;
          }
          case "learn_course_export": {
            const { courseBuilderEngine: cbe } = await import("../../engines/CourseBuilderEngine.js");
            result = cbe.courseExport({
              courseId: params.course_id ?? params.courseId,
              camSystem: params.cam_system ?? params.camSystem,
              level: params.level ?? "intermediate",
              format: params.format ?? "json",
            });
            break;
          }

          // ── LEARN-MS3: Curriculum Bridge ──────────────────────
          case "learn_curriculum_rpm": {
            const { KnowledgeCurriculumBridgeEngine } = await import("../../engines/KnowledgeCurriculumBridgeEngine.js");
            const bridge = new KnowledgeCurriculumBridgeEngine();
            result = { problems: bridge.generateRpmProblems(params.count ?? 5, params.profile) };
            break;
          }
          case "learn_curriculum_force": {
            const { KnowledgeCurriculumBridgeEngine } = await import("../../engines/KnowledgeCurriculumBridgeEngine.js");
            const bridge = new KnowledgeCurriculumBridgeEngine();
            result = { problems: bridge.generateForceProblems(params.count ?? 5) };
            break;
          }
          case "learn_curriculum_toollife": {
            const { KnowledgeCurriculumBridgeEngine } = await import("../../engines/KnowledgeCurriculumBridgeEngine.js");
            const bridge = new KnowledgeCurriculumBridgeEngine();
            result = { problems: bridge.generateToolLifeProblems(params.count ?? 3) };
            break;
          }
          case "learn_curriculum_material": {
            const { KnowledgeCurriculumBridgeEngine } = await import("../../engines/KnowledgeCurriculumBridgeEngine.js");
            const bridge = new KnowledgeCurriculumBridgeEngine();
            result = { problems: bridge.generateMaterialIdProblems() };
            break;
          }
          case "learn_curriculum_feedrate": {
            const { KnowledgeCurriculumBridgeEngine } = await import("../../engines/KnowledgeCurriculumBridgeEngine.js");
            const bridge = new KnowledgeCurriculumBridgeEngine();
            result = { problems: bridge.generateFeedRateProblems(params.count ?? 5) };
            break;
          }
          case "learn_curriculum_problemset": {
            const { KnowledgeCurriculumBridgeEngine } = await import("../../engines/KnowledgeCurriculumBridgeEngine.js");
            const bridge = new KnowledgeCurriculumBridgeEngine();
            result = { problems: bridge.generateProblemSet(params.profile, params.count ?? 20) };
            break;
          }

          // ── LEARN-MS4: Feedback + Fleet Learning ──────────────
          case "learn_feedback_record": {
            const { MachineLearningFeedbackEngine } = await import("../../engines/MachineLearningFeedbackEngine.js");
            const mlfEngine = new MachineLearningFeedbackEngine();
            result = mlfEngine.recordMeasurement({
              machineId: params.machine_id ?? params.machineId ?? "",
              measurementType: params.measurement_type ?? params.measurementType ?? "dimension",
              measured: params.measured ?? 0,
              predicted: params.predicted,
              unit: params.unit ?? "mm",
              material: params.material,
              operation: params.operation,
              toolId: params.tool_id ?? params.toolId,
              parameters: params.parameters,
              partId: params.part_id,
              batchId: params.batch_id,
              notes: params.notes,
            });
            break;
          }
          case "learn_feedback_profile": {
            const { MachineLearningFeedbackEngine } = await import("../../engines/MachineLearningFeedbackEngine.js");
            const mlfEngine = new MachineLearningFeedbackEngine();
            result = mlfEngine.getMachineProfile({
              machineId: params.machine_id ?? params.machineId ?? "",
              measurementType: params.measurement_type ?? params.measurementType,
            });
            break;
          }
          case "learn_feedback_calibrate": {
            const { MachineLearningFeedbackEngine } = await import("../../engines/MachineLearningFeedbackEngine.js");
            const mlfEngine = new MachineLearningFeedbackEngine();
            result = mlfEngine.autoCalibrate({
              machineId: params.machine_id ?? params.machineId ?? "",
              measurementType: params.measurement_type ?? params.measurementType,
              minSamples: params.min_samples ?? params.minSamples ?? 5,
            });
            break;
          }
          case "learn_feedback_predict": {
            const { MachineLearningFeedbackEngine } = await import("../../engines/MachineLearningFeedbackEngine.js");
            const mlfEngine = new MachineLearningFeedbackEngine();
            result = mlfEngine.predict({
              machineId: params.machine_id ?? params.machineId ?? "",
              predictionType: params.prediction_type ?? params.measurement_type ?? "dimension",
              parameters: {
                speed_mpm: params.speed_mpm,
                feed_mmrev: params.feed_mmrev,
                depth_mm: params.depth_mm,
                material: params.material,
                toolDiameter_mm: params.tool_diameter_mm,
                nominal_mm: params.nominal_mm ?? params.base_value,
              },
            });
            break;
          }
          case "learn_feedback_compare": {
            const { MachineLearningFeedbackEngine } = await import("../../engines/MachineLearningFeedbackEngine.js");
            const mlfEngine = new MachineLearningFeedbackEngine();
            result = mlfEngine.compareMachines({
              machineIds: params.machine_ids ?? params.machineIds ?? [],
            });
            break;
          }
          case "learn_transfer_similarity": {
            const { transferLearningEngine: tlEngine } = await import("../../engines/TransferLearningEngine.js");
            result = tlEngine.machineSimilarity({
              source: params.source ?? {},
              target: params.target ?? {},
              weights: params.weights,
            });
            break;
          }
          case "learn_transfer_scale": {
            const { transferLearningEngine: tlEngine } = await import("../../engines/TransferLearningEngine.js");
            result = tlEngine.scaleParameters({
              source_params: params.source_params ?? params.parameters ?? { Vc: 0, fz: 0, ap: 0, ae: 0 },
              source_machine: params.source_machine ?? params.source ?? {},
              target_machine: params.target_machine ?? params.target ?? {},
              kc_n_per_mm2: params.kc_n_per_mm2,
            });
            break;
          }
          case "learn_transfer_apply": {
            const { transferLearningEngine: tlEngine } = await import("../../engines/TransferLearningEngine.js");
            result = tlEngine.gpTransfer({
              source_data: params.source_data ?? [],
              target_data: params.target_data ?? [],
              x_predict: params.x_predict ?? [],
              length_scale: params.length_scale,
              noise_var: params.noise_var,
            });
            break;
          }
          case "learn_transfer_validate": {
            const { transferLearningEngine: tlEngine } = await import("../../engines/TransferLearningEngine.js");
            result = tlEngine.validateTransfer({
              scaled_params: params.scaled_params ?? params.parameters ?? { Vc: 0, fz: 0, ap: 0, ae: 0 },
              target_machine: params.target_machine ?? params.target ?? {},
              kc_n_per_mm2: params.kc_n_per_mm2,
              tool_diameter_mm: params.tool_diameter_mm,
              tool_stickout_mm: params.tool_stickout_mm,
              deflection_limit_mm: params.deflection_limit_mm,
            });
            break;
          }
          case "learn_fleet_status": {
            const { FleetDeploymentLearningEngine } = await import("../../engines/FleetDeploymentLearningEngine.js");
            const fleet = new FleetDeploymentLearningEngine();
            result = fleet.fleetStatus();
            break;
          }
          case "learn_fleet_plan": {
            const { FleetDeploymentLearningEngine } = await import("../../engines/FleetDeploymentLearningEngine.js");
            const fleet = new FleetDeploymentLearningEngine();
            result = fleet.generateUpdatePlan();
            break;
          }
          case "learn_fleet_feedback": {
            const { FleetDeploymentLearningEngine } = await import("../../engines/FleetDeploymentLearningEngine.js");
            const fleet = new FleetDeploymentLearningEngine();
            result = fleet.ingestFeedback({
              machine_serial: params.machine_serial ?? "",
              program_id: params.program_id ?? "unknown",
              date: params.date ?? new Date().toISOString(),
              type: params.feedback_type ?? params.type ?? "cycle_time",
              predicted_value: params.predicted_value,
              actual_value: params.actual_value,
              delta_percent: params.delta_percent,
              operator_notes: params.operator_notes ?? params.notes,
              changes_made: params.changes_made,
            });
            break;
          }
          case "learn_fleet_summary": {
            const { FleetDeploymentLearningEngine } = await import("../../engines/FleetDeploymentLearningEngine.js");
            const fleet = new FleetDeploymentLearningEngine();
            result = fleet.fleetSummary();
            break;
          }

          // ── COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH9: Knowledge enrichment ──
          case "cognitive_tribal_maximizer_query": {
            try {
              const { tribalKnowledgeMaximizerEngine } = await import("../../engines/TribalKnowledgeMaximizerEngine.js");
              const tips = await tribalKnowledgeMaximizerEngine.query({
                domain: params.domain,
                category: params.category,
                minConfidence: params.min_confidence,
                keywords: params.keywords,
                limit: params.limit,
              });
              result = { tips, count: tips.length };
            } catch (e: any) {
              result = { tips: [], count: 0, engine_error: e?.message ?? "tribal query failed" };
            }
            break;
          }
          case "cognitive_video_knowledge_query": {
            try {
              const { videoKnowledgeIntegrationEngine } = await import("../../engines/VideoKnowledgeIntegrationEngine.js");
              const videos = await videoKnowledgeIntegrationEngine.query({
                topic: params.topic,
                source: params.source,
                limit: params.limit,
              });
              result = { videos, count: videos.length };
            } catch (e: any) {
              result = { videos: [], count: 0, engine_error: e?.message ?? "video query failed" };
            }
            break;
          }
          case "cognitive_extracted_knowledge_search": {
            try {
              const { extractedKnowledgeWiringEngine } = await import("../../engines/ExtractedKnowledgeWiringEngine.js");
              const atoms = extractedKnowledgeWiringEngine.search(params.query, params.limit ?? 20);
              result = { atoms, count: atoms.length };
            } catch (e: any) {
              result = { atoms: [], count: 0, engine_error: e?.message ?? "knowledge search failed" };
            }
            break;
          }
          // ─── U-PSN-KNOWLEDGE-DISP-CORPUS (papa /loop iter5, 2026-05-23) ───
          // BlueprintCorpusHarvestEngine mirror. Same singleton + same I/O
          // injection pattern as cadDispatcher; MCP path requires precomputed
          // content (fetcher functions can't cross MCP boundary).
          case "corpus_harvest_mit": {
            if (!Array.isArray(params.courseList) || !Array.isArray(params.precomputedContent)) {
              return dispatcherError(
                new Error("corpus_harvest_mit requires courseList[] + precomputedContent[] (one per course)"),
                action, "prism_knowledge",
              );
            }
            const { blueprintCorpusHarvestEngine } = await import("../../engines/BlueprintCorpusHarvestEngine.js");
            const courseList = params.courseList as Array<{ courseId: string; title: string; url: string; domain: string; tags?: string[] }>;
            const content = params.precomputedContent as Array<{ ok: true; content: string } | { ok: false; reason: string }>;
            const data = await blueprintCorpusHarvestEngine.harvestMIT({
              courseList: courseList as Parameters<typeof blueprintCorpusHarvestEngine.harvestMIT>[0]["courseList"],
              ...(typeof params.outputDir === "string" ? { outputDir: params.outputDir } : {}),
              io: { fetchMIT: async (c) => content[courseList.indexOf(c)] ?? { ok: false, reason: "no_content" } },
            });
            result = { success: true, data };
            break;
          }
          case "corpus_harvest_vendor": {
            if (!Array.isArray(params.pdfList) || !Array.isArray(params.precomputedContent)) {
              return dispatcherError(
                new Error("corpus_harvest_vendor requires pdfList[] + precomputedContent[]"),
                action, "prism_knowledge",
              );
            }
            const { blueprintCorpusHarvestEngine } = await import("../../engines/BlueprintCorpusHarvestEngine.js");
            const pdfList = params.pdfList as Array<{ filePath: string; vendor: string; domain: string; tags?: string[] }>;
            const content = params.precomputedContent as Array<{ ok: true; content: string } | { ok: false; reason: string }>;
            const data = await blueprintCorpusHarvestEngine.harvestVendorPDFs({
              pdfList: pdfList as Parameters<typeof blueprintCorpusHarvestEngine.harvestVendorPDFs>[0]["pdfList"],
              ...(typeof params.outputDir === "string" ? { outputDir: params.outputDir } : {}),
              io: { fetchVendorPDF: async (p) => content[pdfList.indexOf(p)] ?? { ok: false, reason: "no_content" } },
            });
            result = { success: true, data };
            break;
          }
          case "corpus_harvest_online": {
            if (!Array.isArray(params.urlList) || !Array.isArray(params.precomputedContent)) {
              return dispatcherError(
                new Error("corpus_harvest_online requires urlList[] + precomputedContent[]"),
                action, "prism_knowledge",
              );
            }
            const { blueprintCorpusHarvestEngine } = await import("../../engines/BlueprintCorpusHarvestEngine.js");
            const urlList = params.urlList as Array<{ url: string; domain: string; title: string; tags?: string[] }>;
            const content = params.precomputedContent as Array<{ ok: true; content: string } | { ok: false; reason: string }>;
            const data = await blueprintCorpusHarvestEngine.harvestOnline({
              urlList: urlList as Parameters<typeof blueprintCorpusHarvestEngine.harvestOnline>[0]["urlList"],
              ...(typeof params.outputDir === "string" ? { outputDir: params.outputDir } : {}),
              ...(typeof params.maxRetry404 === "number" ? { maxRetry404: params.maxRetry404 } : {}),
              io: { fetchOnline: async (s) => content[urlList.indexOf(s)] ?? { ok: false, reason: "no_content" } },
            });
            result = { success: true, data };
            break;
          }
          case "corpus_enumerate": {
            const { blueprintCorpusHarvestEngine } = await import("../../engines/BlueprintCorpusHarvestEngine.js");
            const data = blueprintCorpusHarvestEngine.enumerateCorpus(
              params as Parameters<typeof blueprintCorpusHarvestEngine.enumerateCorpus>[0],
            );
            result = { success: true, data, count: data.length };
            break;
          }
          case "corpus_verify_fresh": {
            if (!params.source) {
              return dispatcherError(
                new Error("corpus_verify_fresh requires source"),
                action, "prism_knowledge",
              );
            }
            const { blueprintCorpusHarvestEngine } = await import("../../engines/BlueprintCorpusHarvestEngine.js");
            const data = blueprintCorpusHarvestEngine.verifyCorpusFresh(
              params as Parameters<typeof blueprintCorpusHarvestEngine.verifyCorpusFresh>[0],
            );
            result = { success: true, data };
            break;
          }
          case "corpus_build_index": {
            if (!Array.isArray(params.precomputedVectors)) {
              return dispatcherError(
                new Error("corpus_build_index requires outputPath + precomputedVectors[] (MCP path — embedder cannot cross MCP boundary)"),
                action, "prism_knowledge",
              );
            }
            const { blueprintCorpusHarvestEngine } = await import("../../engines/BlueprintCorpusHarvestEngine.js");
            const vectors = params.precomputedVectors as Array<{ id: string; vector: number[] }>;
            const data = await blueprintCorpusHarvestEngine.buildEmbeddingIndex({
              outputPath: (params.outputPath as string) ?? "",
              io: { embed: async (e) => vectors[(e as any).index ?? 0]?.vector ?? [] },
            });
            result = { success: true, data };
            break;
          }
        }
        return { content: [{ type: "text", text: JSON.stringify(slimResponse(result)) }] };
      } catch (error: any) {
        return dispatcherError(error, action, "prism_knowledge");
      }
    }
  );
}
