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

const ACTIONS = [
  "search", "cross_query", "formula", "relations", "stats",
  "tribal_capture", "tribal_search", "tribal_suggest", "tribal_stats",
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
          // ── OBSIDIAN-MS0: Obsidian Vault Sync ──
          case "obsidian_sync_pull": {
            const { obsidianVaultSyncEngine } = await import("../../engines/ObsidianVaultSyncEngine.js");
            result = await obsidianVaultSyncEngine.pull({
              vault_path: params.vault_path || "",
              sync_folder: params.sync_folder,
              incremental: params.incremental ?? true,
              dry_run: params.dry_run ?? false,
            });
            break;
          }
          case "obsidian_sync_push": {
            const { obsidianVaultSyncEngine } = await import("../../engines/ObsidianVaultSyncEngine.js");
            result = await obsidianVaultSyncEngine.push({
              vault_path: params.vault_path || "",
              sync_folder: params.sync_folder ?? "PRISM",
              tip_ids: params.tip_ids,
              incremental: params.incremental ?? true,
              dry_run: params.dry_run ?? false,
            });
            break;
          }
          case "obsidian_sync_status": {
            const { obsidianVaultSyncEngine } = await import("../../engines/ObsidianVaultSyncEngine.js");
            result = obsidianVaultSyncEngine.status(params.vault_path);
            break;
          }
          case "obsidian_sync_config": {
            const { obsidianVaultSyncEngine } = await import("../../engines/ObsidianVaultSyncEngine.js");
            result = obsidianVaultSyncEngine.configure({
              vault_path: params.vault_path,
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
        }
        return { content: [{ type: "text", text: JSON.stringify(slimResponse(result)) }] };
      } catch (error: any) {
        return dispatcherError(error, action, "prism_knowledge");
      }
    }
  );
}
