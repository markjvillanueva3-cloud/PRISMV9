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
import { consultAwareness, extractAwarenessKeywords, wrapWithAwareness, type AwarenessConsultResult } from "./awarenessMiddleware.js";

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

// PDF-EXT-MS0: PDF Extraction Pipeline
const PDF_EXTRACTION_ACTIONS = [
  "pdf_source_list", "pdf_source_stats", "pdf_source_discover",
  "pdf_extract_tables", "pdf_extract_formulas", "pdf_extract_materials",
  "pdf_batch_process", "pdf_batch_priority", "pdf_batch_stats",
] as const;

// PDF-EXT-MS1: Catalog Extraction + Resource Tracking
const CATALOG_EXTRACTION_ACTIONS = [
  "resource_scan", "resource_stats", "resource_pending", "resource_report",
  "catalog_extract", "catalog_merge", "catalog_export", "catalog_stats",
] as const;

// PDF-EXT-MS2: MIT Academic Course Extraction
const MIT_ACADEMIC_ACTIONS = [
  "mit_course_stats", "mit_course_algorithms", "mit_course_engine_map",
  "mit_course_search", "mit_course_manufacturing", "mit_course_report",
  "mit_course_data",
  "lecture_scan_course", "lecture_extract_formulas", "lecture_get_formulas",
  "lecture_get_problems", "lecture_stats",
  // PP-AGI-S0/U-S0-03: Additional MIT course integration actions
  "mit_course_list", "mit_course_detail", "mit_course_apply",
  "mit_course_recommend", "mit_course_tier", "mit_course_domains",
  "mit_course_prism_map",
] as const;

// PDF-EXT-MS2: Knowledge Ingestion Pipeline
const INGESTION_PIPELINE_ACTIONS = [
  "ingestion_discover", "ingestion_pending", "ingestion_run",
  "ingestion_ingest_one", "ingestion_stats",
] as const;

// PDF-EXT-MS3: Extracted Knowledge Wiring
const EXTRACTED_WIRING_ACTIONS = [
  "extracted_wire_all", "extracted_search", "extracted_stats",
] as const;

// Workflow Template Actions (auto-ingested from hyperMILL/hyperCAD-S)
const WORKFLOW_TEMPLATE_ACTIONS = [
  "workflow_suggest", "workflow_validate", "workflow_quick_ref",
  "workflow_order_of_ops", "workflow_search", "workflow_stats",
] as const;

// TK-MS1: Knowledge Spine Engine Actions
const KNOWLEDGE_SPINE_ACTIONS = [
  // Applicability (U-TK05)
  "knowledge_score_tips", "knowledge_top_tips", "knowledge_is_relevant",
  // Promotion (U-TK09)
  "knowledge_promote", "knowledge_demote", "knowledge_evaluate_promotion", "knowledge_promotion_stats",
  // Conflict Resolution (U-TK06)
  "knowledge_detect_conflicts", "knowledge_resolve_conflict", "knowledge_suggest_resolution",
  // Consumer Registry (U-TK07)
  "knowledge_list_consumers", "knowledge_register_consumer", "knowledge_propagation_targets", "knowledge_consumer_stats",
  // Feedback Ingestion (U-TK08)
  "knowledge_submit_feedback", "knowledge_feedback_summary", "knowledge_feedback_stats",
] as const;

// KAR-MS3: Knowledge-Augmented Reasoning Wiring Actions
const KAR_WIRING_ACTIONS = [
  // Lineage Tracking (U-KAR24)
  "knowledge_lineage_trace", "knowledge_lineage_report", "knowledge_lineage_stats",
  // Wiring Routes (U-KAR25)
  "knowledge_wiring_resolve", "knowledge_wiring_manifest", "knowledge_wiring_consumers",
  // Atom Management (U-KAR26)
  "knowledge_atom_validate", "knowledge_atom_create", "knowledge_atom_batch",
  // Conflict Resolution (U-KAR27)
  "knowledge_conflict_detect", "knowledge_conflict_resolve_authority",
] as const;

/** U-AWR26: VideoLearningEngine ingestion pipeline — 73 mp4/mov/mkv videos. */
const VIDEO_ACTIONS = [
  "video_check_prerequisites",
  "video_get_info",
  "video_extract_keyframes",
  "video_transcribe",
  "video_process",
  "video_process_directory",
  "video_extract_playbook_rules",
] as const;

/** PP-AGI-S0/U-S0-05: FormulaOrchestrator wiring — formula discovery, validation, coverage */
const FORMULA_ORCHESTRATOR_ACTIONS = [
  "formula_validate",           // Validate formula against physics constraints
  "formula_wire",               // Wire formula to engine as source/consumer
  "formula_by_domain",          // Get formulas by domain (lathe/mill/wedm/general)
  "formula_coverage",           // Get formula coverage report
  "formula_mapping",            // Get formula-to-engine mapping
  "formula_orphans",            // Get orphan formulas not wired to any engine
  "formula_validation_stats",   // Get validation statistics
] as const;

/** PP-AGI-S0/U-S0-04: Tribal knowledge activation — activate 3,594 dormant tips */
const TRIBAL_ACTIVATION_ACTIONS = [
  "tribal_activate",            // Activate tips for decision context
  "tribal_by_problem",          // Get troubleshooting tips for a problem
  "tribal_for_speedfeed",       // Tips for speed/feed decisions
  "tribal_for_toolpath",        // Tips for toolpath selection
  "tribal_for_controller",      // Tips for controller output
  "tribal_for_troubleshoot",    // Tips for problem diagnosis
  "tribal_activation_stats",    // Activation system statistics
  "tribal_awareness",           // Self-awareness integration
] as const;

/** INTEL-OLLAMA-OBSIDIAN-MS0/P14-U02: Knowledge Ingestion Pipeline (KIP) — PDF→Qdrant batch worker. */
const KIP_INGEST_ACTIONS = [
  "wiki_ingest_pdf",            // Ingest one PDF: extract → chunk → embed → upsert under kind='wiki'
  "wiki_ingest_dryrun",         // Same but skip Qdrant upsert (returns chunk count + chars)
] as const;

/** INTEL-OLLAMA-OBSIDIAN-MS0/P14-U02: Vault RAG + Resources/ classification — surfaces ObsidianMemoryRagEngine + ResourcesClassifierEngine. */
const VAULT_RAG_ACTIONS = [
  "wiki_rag_query",             // Top-K vault recall (memories + tribal) for a prompt
  "wiki_rag_should_trigger",    // Cheap predicate: would RAG fire for this query?
  "wiki_classify_file",         // Bucket one file (machining/binary/general/mixed)
  "wiki_summarize_dir",         // Aggregate FileEntry[] into a DirSummary (KIP planner)
] as const;

/** INTEL-OLLAMA-OBSIDIAN-MS0/P14-U03: Vault auto-backlinks — surfaces VaultBacklinkEngine. */
const VAULT_BACKLINK_ACTIONS = [
  "wiki_backlink_for_chunk",    // Score one chunk against engine/action/skill corpora → top-K per kind
  "wiki_backlink_render",       // Render a BacklinkResult to a "## Related PRISM" markdown section
  "wiki_backlink_parse_digest", // Parse ENGINE_DIGEST.md / DISPATCHER_DIGEST.md text → BacklinkCandidate[]
] as const;

const ACTIONS = [
  "search", "cross_query", "formula", "relations", "stats",
  "tribal_capture", "tribal_search", "tribal_suggest", "tribal_stats", "tribal_recategorize", "tribal_graph", "master_machinist_recommend",
  ...ACADEMY_ACTIONS,
  ...VISUAL_LAB_ACTIONS,
  ...KG_ACTIONS,
  ...TROUBLESHOOT_TREE_ACTIONS,
  ...INSTRUCTOR_ACTIONS,
  ...COURSE_BUILDER_ACTIONS,
  ...LEARN_ACTIONS,
  ...PDF_EXTRACTION_ACTIONS,
  ...CATALOG_EXTRACTION_ACTIONS,
  ...MIT_ACADEMIC_ACTIONS,
  ...INGESTION_PIPELINE_ACTIONS,
  ...EXTRACTED_WIRING_ACTIONS,
  ...WORKFLOW_TEMPLATE_ACTIONS,
  ...KNOWLEDGE_SPINE_ACTIONS,
  ...KAR_WIRING_ACTIONS,
  ...VIDEO_ACTIONS,
  ...FORMULA_ORCHESTRATOR_ACTIONS,
  ...TRIBAL_ACTIVATION_ACTIONS,
  ...KIP_INGEST_ACTIONS,
  ...VAULT_RAG_ACTIONS,
  ...VAULT_BACKLINK_ACTIONS,
] as const;

export { ACTIONS };

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

        // MILL-AGI-P0.1: Awareness middleware — consult PRISM knowledge before execution
        let awareness: AwarenessConsultResult | null = null;
        try {
          const keywords = extractAwarenessKeywords(action, params);
          awareness = await consultAwareness({
            dispatcher: "knowledge",
            action,
            keywords,
          });
        } catch { /* awareness failure is non-blocking */ }

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
          case "tribal_recategorize": {
            const { tribalKnowledgeEngine } = await import("../../engines/TribalKnowledgeEngine.js");
            result = tribalKnowledgeEngine.recategorizeAll(params.force === true);
            break;
          }
          case "tribal_graph": {
            // TK-MS6 U-TK29: Query tribal knowledge graph
            const { seedTribalTips, queryTribalGraph } = await import("../../engines/KnowledgeGraphEngine.js");
            if (params.seed) {
              result = await seedTribalTips();
            } else {
              result = await queryTribalGraph({
                material: params.material ?? params.material_iso,
                machine: params.machine ?? params.machine_id,
                operation: params.operation ?? params.operation_type,
              });
            }
            break;
          }
          case "master_machinist_recommend": {
            // TK-MS6 U-TK30: "Master Machinist" recommendation mode
            const { tribalKnowledgeEngine } = await import("../../engines/TribalKnowledgeEngine.js");
            result = tribalKnowledgeEngine.masterMachinistRecommend({
              material: params.material ?? params.material_iso ?? params.material_iso_group,
              machine: params.machine ?? params.machine_id,
              operation: params.operation ?? params.operation_type,
              tolerance: params.tolerance ?? params.tolerance_class,
            });
            break;
          }
          // ── Knowledge Spine (TK-MS1) ──────────────────────────────────
          // U-TK05: Applicability Engine
          case "knowledge_score_tips": {
            const { knowledgeApplicabilityEngine } = await import("../../knowledge/index.js");
            const context = {
              material_iso: params.material_iso ?? params.material,
              operation_type: params.operation_type ?? params.operation,
              machine_id: params.machine_id,
              controller: params.controller,
              tolerance_class: params.tolerance_class,
              workholding: params.workholding,
            };
            const tips = params.tips ?? [];
            result = knowledgeApplicabilityEngine.scoreTips(tips, context);
            break;
          }
          case "knowledge_top_tips": {
            const { knowledgeApplicabilityEngine } = await import("../../knowledge/index.js");
            const { tribalKnowledgeEngine } = await import("../../engines/TribalKnowledgeEngine.js");
            const context = {
              material_iso: params.material_iso ?? params.material,
              operation_type: params.operation_type ?? params.operation,
              machine_id: params.machine_id,
              controller: params.controller,
              tolerance_class: params.tolerance_class,
              workholding: params.workholding,
            };
            const allTips = tribalKnowledgeEngine.search({ limit: 100 });
            result = knowledgeApplicabilityEngine.topTips(allTips, context, params.limit ?? 10);
            break;
          }
          case "knowledge_is_relevant": {
            const { knowledgeApplicabilityEngine } = await import("../../knowledge/index.js");
            const context = {
              material_iso: params.material_iso ?? params.material,
              operation_type: params.operation_type ?? params.operation,
            };
            result = { relevant: knowledgeApplicabilityEngine.isRelevant(params.tip, context, params.threshold ?? 0.5) };
            break;
          }
          // U-TK09: Promotion Engine
          case "knowledge_promote": {
            const { knowledgePromotionEngine } = await import("../../knowledge/index.js");
            result = knowledgePromotionEngine.promote(params.tip_id, params.to_stage, params.approver, params.force === true);
            break;
          }
          case "knowledge_demote": {
            const { knowledgePromotionEngine } = await import("../../knowledge/index.js");
            result = knowledgePromotionEngine.demote(params.tip_id, params.reason ?? "Demoted via API");
            break;
          }
          case "knowledge_evaluate_promotion": {
            const { knowledgePromotionEngine } = await import("../../knowledge/index.js");
            const tipId = params.tip_id ?? params.tip?.id ?? params.tip;
            result = knowledgePromotionEngine.evaluate(tipId, params.target_stage);
            break;
          }
          case "knowledge_promotion_stats": {
            const { knowledgePromotionEngine } = await import("../../knowledge/index.js");
            result = knowledgePromotionEngine.stats();
            break;
          }
          // U-TK06: Conflict Resolution Engine
          case "knowledge_detect_conflicts": {
            const { knowledgeConflictResolverEngine } = await import("../../knowledge/index.js");
            result = knowledgeConflictResolverEngine.detectConflicts({
              category: params.category,
              limit: params.limit,
              min_severity: params.min_severity,
            });
            break;
          }
          case "knowledge_resolve_conflict": {
            const { knowledgeConflictResolverEngine } = await import("../../knowledge/index.js");
            result = knowledgeConflictResolverEngine.resolve(params.conflict, params.strategy ?? "authority");
            break;
          }
          case "knowledge_suggest_resolution": {
            const { knowledgeConflictResolverEngine } = await import("../../knowledge/index.js");
            result = knowledgeConflictResolverEngine.suggest(params.conflict);
            break;
          }
          // U-TK07: Consumer Registry Engine
          case "knowledge_list_consumers": {
            const { knowledgeConsumerRegistryEngine } = await import("../../knowledge/index.js");
            result = knowledgeConsumerRegistryEngine.list();
            break;
          }
          case "knowledge_register_consumer": {
            const { knowledgeConsumerRegistryEngine } = await import("../../knowledge/index.js");
            result = knowledgeConsumerRegistryEngine.register({
              id: params.id,
              name: params.name,
              type: params.type ?? "engine",
              subscribedCategories: params.categories ?? [],
              subscribedDomains: params.domains ?? [],
              priority: params.priority ?? 5,
            });
            break;
          }
          case "knowledge_propagation_targets": {
            const { knowledgeConsumerRegistryEngine } = await import("../../knowledge/index.js");
            result = knowledgeConsumerRegistryEngine.getPropagationTargets(params.tip);
            break;
          }
          case "knowledge_consumer_stats": {
            const { knowledgeConsumerRegistryEngine } = await import("../../knowledge/index.js");
            result = knowledgeConsumerRegistryEngine.stats();
            break;
          }
          // U-TK08: Feedback Ingestion Engine
          case "knowledge_submit_feedback": {
            const { knowledgeFeedbackIngestEngine } = await import("../../knowledge/index.js");
            result = knowledgeFeedbackIngestEngine.submit({
              tip_id: params.tip_id,
              feedback_type: params.feedback_type ?? "helpful",
              comment: params.comment,
              submitted_by: params.user_id ?? "anonymous",
              context: params.context ?? {},
            });
            break;
          }
          case "knowledge_feedback_summary": {
            const { knowledgeFeedbackIngestEngine } = await import("../../knowledge/index.js");
            result = knowledgeFeedbackIngestEngine.summarize(params.tip_id);
            break;
          }
          case "knowledge_feedback_stats": {
            const { knowledgeFeedbackIngestEngine } = await import("../../knowledge/index.js");
            result = knowledgeFeedbackIngestEngine.stats();
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
            return { content: [{ type: "text", text: JSON.stringify(slimResponse(wrapWithAwareness(kgResult, awareness))) }] };
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
              // U-TK31: Domain-aware grouping
              groupBy: params.group_by ?? params.groupBy ?? "category",
              preferDomain: params.prefer_domain ?? params.preferDomain,
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

          // ── PDF-EXT-MS0: PDF Extraction Pipeline ──────────────
          case "pdf_source_list": {
            const { pdfSourceRegistryEngine } = await import("../../engines/PDFSourceRegistryEngine.js");
            await pdfSourceRegistryEngine.init();
            const sources = pdfSourceRegistryEngine.getAll();
            result = {
              count: sources.length,
              sources: sources.map(s => ({
                id: s.id, name: s.name, category: s.category,
                priority: s.priority, status: s.status,
              })),
            };
            break;
          }
          case "pdf_source_stats": {
            const { pdfSourceRegistryEngine } = await import("../../engines/PDFSourceRegistryEngine.js");
            await pdfSourceRegistryEngine.init();
            result = pdfSourceRegistryEngine.getStats();
            break;
          }
          case "pdf_source_discover": {
            const { pdfSourceRegistryEngine } = await import("../../engines/PDFSourceRegistryEngine.js");
            await pdfSourceRegistryEngine.init();
            const discovered = await pdfSourceRegistryEngine.discoverLocalPDFs(
              params.directory ?? params.path ?? process.cwd()
            );
            result = { discovered: discovered.length, sources: discovered };
            break;
          }
          case "pdf_extract_tables": {
            const { pdfSourceRegistryEngine } = await import("../../engines/PDFSourceRegistryEngine.js");
            const { pdfTableExtractionEngine } = await import("../../engines/PDFTableExtractionEngine.js");
            await pdfSourceRegistryEngine.init();
            await pdfTableExtractionEngine.init();
            const source = pdfSourceRegistryEngine.getAll().find(s => s.id === params.source_id);
            if (!source) {
              result = { error: `Source not found: ${params.source_id}` };
            } else {
              const tables = await pdfTableExtractionEngine.extractTables(source, {
                minConfidence: params.min_confidence ?? 0.7,
                validatePhysics: params.validate_physics !== false,
              });
              result = { source_id: params.source_id, tables_extracted: tables.length, tables };
            }
            break;
          }
          case "pdf_extract_formulas": {
            const { pdfFormulaExtractionEngine } = await import("../../engines/PDFFormulaExtractionEngine.js");
            await pdfFormulaExtractionEngine.init();
            const formulas = await pdfFormulaExtractionEngine.extractFormulas(
              params.source_id ?? "unknown",
              params.text ?? params.content ?? "",
              { minConfidence: params.min_confidence ?? 0.7 }
            );
            result = { source_id: params.source_id, formulas_extracted: formulas.length, formulas };
            break;
          }
          case "pdf_extract_materials": {
            const { pdfMaterialPropertyExtractionEngine } = await import("../../engines/PDFMaterialPropertyExtractionEngine.js");
            await pdfMaterialPropertyExtractionEngine.init();
            const materials = await pdfMaterialPropertyExtractionEngine.extractMaterials(
              params.source_id ?? "unknown",
              params.text ?? params.content ?? "",
              { minConfidence: params.min_confidence ?? 0.6 }
            );
            result = { source_id: params.source_id, materials_extracted: materials.length, materials };
            break;
          }
          case "pdf_batch_process": {
            const { pdfHandbookBatchProcessorEngine } = await import("../../engines/PDFHandbookBatchProcessorEngine.js");
            await pdfHandbookBatchProcessorEngine.init();
            result = await pdfHandbookBatchProcessorEngine.processBatch({
              categories: params.categories,
              maxConcurrent: params.max_concurrent ?? 3,
              extractTables: params.extract_tables !== false,
              extractFormulas: params.extract_formulas !== false,
              extractMaterials: params.extract_materials !== false,
              minConfidence: params.min_confidence ?? 0.7,
            });
            break;
          }
          case "pdf_batch_priority": {
            const { pdfHandbookBatchProcessorEngine } = await import("../../engines/PDFHandbookBatchProcessorEngine.js");
            await pdfHandbookBatchProcessorEngine.init();
            result = await pdfHandbookBatchProcessorEngine.processPrioritySources({
              minConfidence: params.min_confidence ?? 0.7,
            });
            break;
          }
          case "pdf_batch_stats": {
            const { pdfHandbookBatchProcessorEngine } = await import("../../engines/PDFHandbookBatchProcessorEngine.js");
            await pdfHandbookBatchProcessorEngine.init();
            result = await pdfHandbookBatchProcessorEngine.getHistoricalStats();
            break;
          }

          // ── PDF-EXT-MS1: Resource Tracking + Catalog Extraction ────
          case "resource_scan": {
            const { resourceExtractionStateEngine } = await import("../../engines/ResourceExtractionStateEngine.js");
            await resourceExtractionStateEngine.init();
            result = await resourceExtractionStateEngine.scanDirectory(
              params.directory ?? params.path ?? process.cwd(),
              {
                recursive: params.recursive !== false,
                extensions: params.extensions,
                maxFiles: params.max_files ?? 10000,
              }
            );
            break;
          }
          case "resource_stats": {
            const { resourceExtractionStateEngine } = await import("../../engines/ResourceExtractionStateEngine.js");
            await resourceExtractionStateEngine.init();
            result = resourceExtractionStateEngine.getStats();
            break;
          }
          case "resource_pending": {
            const { resourceExtractionStateEngine } = await import("../../engines/ResourceExtractionStateEngine.js");
            await resourceExtractionStateEngine.init();
            const pending = resourceExtractionStateEngine.getPending();
            result = {
              count: pending.length,
              resources: pending.slice(0, params.limit ?? 50).map(r => ({
                id: r.id, filename: r.filename, category: r.category, status: r.status,
              })),
            };
            break;
          }
          case "resource_report": {
            const { resourceExtractionStateEngine } = await import("../../engines/ResourceExtractionStateEngine.js");
            await resourceExtractionStateEngine.init();
            result = { report: resourceExtractionStateEngine.generateReport() };
            break;
          }
          case "catalog_extract": {
            const { resourceExtractionStateEngine } = await import("../../engines/ResourceExtractionStateEngine.js");
            const { catalogExtractionEngine } = await import("../../engines/CatalogExtractionEngine.js");
            await resourceExtractionStateEngine.init();
            await catalogExtractionEngine.init();
            const extractionResult = await catalogExtractionEngine.extractFromPDF(
              params.resource_id ?? "manual",
              params.text ?? params.content ?? "",
              {
                manufacturer: params.manufacturer ?? "unknown",
                catalogPath: params.catalog_path,
                mergeStrategy: params.merge_strategy ?? "prefer_manufacturer",
                minConfidence: params.min_confidence ?? 0.7,
                dryRun: params.dry_run === true,
              }
            );
            result = extractionResult;
            break;
          }
          case "catalog_merge": {
            const { catalogExtractionEngine } = await import("../../engines/CatalogExtractionEngine.js");
            await catalogExtractionEngine.init();
            const mergeResults = await catalogExtractionEngine.mergeWithExisting(
              params.manufacturer ?? "",
              params.strategy ?? "prefer_manufacturer"
            );
            result = {
              manufacturer: params.manufacturer,
              total: mergeResults.length,
              added: mergeResults.filter(r => r.action === "added").length,
              updated: mergeResults.filter(r => r.action === "updated").length,
              skipped: mergeResults.filter(r => r.action === "skipped").length,
              conflicts: mergeResults.filter(r => r.action === "conflict").length,
            };
            break;
          }
          case "catalog_export": {
            const { catalogExtractionEngine } = await import("../../engines/CatalogExtractionEngine.js");
            await catalogExtractionEngine.init();
            const tsCode = await catalogExtractionEngine.exportToTypeScript(
              params.manufacturer ?? ""
            );
            result = {
              manufacturer: params.manufacturer,
              generated: tsCode.length > 0,
              code: tsCode.slice(0, params.preview ? 2000 : undefined),
            };
            break;
          }
          case "catalog_stats": {
            const { catalogExtractionEngine } = await import("../../engines/CatalogExtractionEngine.js");
            await catalogExtractionEngine.init();
            result = catalogExtractionEngine.getStats();
            break;
          }

          // =====================================================================
          // PDF-EXT-MS2: MIT Academic Course Extraction
          // =====================================================================
          case "mit_course_stats": {
            const { mitCourseRegistryEngine } = await import("../../engines/MITCourseRegistryEngine.js");
            await mitCourseRegistryEngine.init();
            result = mitCourseRegistryEngine.getStats();
            break;
          }
          case "mit_course_algorithms": {
            const { mitCourseRegistryEngine } = await import("../../engines/MITCourseRegistryEngine.js");
            await mitCourseRegistryEngine.init();
            result = {
              courseId: params.course_id,
              algorithms: mitCourseRegistryEngine.getAlgorithmsByCourse(params.course_id ?? ""),
            };
            break;
          }
          case "mit_course_engine_map": {
            const { mitCourseRegistryEngine } = await import("../../engines/MITCourseRegistryEngine.js");
            await mitCourseRegistryEngine.init();
            result = mitCourseRegistryEngine.getAlgorithmsForEngine(params.engine_name ?? "");
            break;
          }
          case "mit_course_search": {
            const { mitCourseRegistryEngine } = await import("../../engines/MITCourseRegistryEngine.js");
            await mitCourseRegistryEngine.init();
            result = {
              pattern: params.pattern,
              algorithms: mitCourseRegistryEngine.searchAlgorithms(params.pattern ?? ""),
            };
            break;
          }
          case "mit_course_manufacturing": {
            const { mitCourseRegistryEngine } = await import("../../engines/MITCourseRegistryEngine.js");
            await mitCourseRegistryEngine.init();
            result = {
              courses: mitCourseRegistryEngine.getManufacturingCourses(),
              algorithmCount: mitCourseRegistryEngine.getStats().manufacturingAlgorithms,
            };
            break;
          }
          case "mit_course_report": {
            const { mitCourseRegistryEngine } = await import("../../engines/MITCourseRegistryEngine.js");
            await mitCourseRegistryEngine.init();
            result = {
              engine: params.engine_name,
              report: mitCourseRegistryEngine.generateEngineKnowledgeReport(params.engine_name ?? ""),
            };
            break;
          }
          case "mit_course_data": {
            const { mitCourseRegistryEngine } = await import("../../engines/MITCourseRegistryEngine.js");
            await mitCourseRegistryEngine.init();
            const metadata = await mitCourseRegistryEngine.loadCourseData(params.course_id ?? "");
            const contentMap = await mitCourseRegistryEngine.loadContentMap(params.course_id ?? "");
            result = {
              metadata,
              resourceCount: contentMap?.size ?? 0,
            };
            break;
          }
          // PP-AGI-S0/U-S0-03: Additional MIT course integration actions
          case "mit_course_list": {
            const { mitCourseIntegrationEngine } = await import("../../engines/MITCourseIntegrationEngine.js");
            result = {
              domain: params.domain,
              courses: mitCourseIntegrationEngine.listCourses(params.domain),
            };
            break;
          }
          case "mit_course_detail": {
            const { mitCourseIntegrationEngine } = await import("../../engines/MITCourseIntegrationEngine.js");
            result = mitCourseIntegrationEngine.getCourse(params.course_id ?? "");
            break;
          }
          case "mit_course_apply": {
            const { mitCourseIntegrationEngine } = await import("../../engines/MITCourseIntegrationEngine.js");
            result = mitCourseIntegrationEngine.applyToManufacturing(
              params.course_id ?? "",
              params.problem ?? ""
            );
            break;
          }
          case "mit_course_recommend": {
            const { mitCourseIntegrationEngine } = await import("../../engines/MITCourseIntegrationEngine.js");
            result = mitCourseIntegrationEngine.getCourseRecommendations(params.problem ?? "");
            break;
          }
          case "mit_course_tier": {
            const { mitCourseIntegrationEngine } = await import("../../engines/MITCourseIntegrationEngine.js");
            result = {
              tier: params.tier ?? "TIER_1",
              courses: mitCourseIntegrationEngine.getCoursesByTier(params.tier ?? "TIER_1"),
            };
            break;
          }
          case "mit_course_domains": {
            const { mitCourseIntegrationEngine } = await import("../../engines/MITCourseIntegrationEngine.js");
            result = {
              domains: mitCourseIntegrationEngine.getDomains(),
              stats: mitCourseIntegrationEngine.getStats(),
            };
            break;
          }
          case "mit_course_prism_map": {
            const { mitCourseIntegrationEngine } = await import("../../engines/MITCourseIntegrationEngine.js");
            result = {
              courseId: params.course_id,
              prismEngines: mitCourseIntegrationEngine.getPrismMapping(params.course_id ?? ""),
            };
            break;
          }
          case "lecture_scan_course": {
            const { lectureNoteExtractionEngine } = await import("../../engines/LectureNoteExtractionEngine.js");
            result = await lectureNoteExtractionEngine.scanCourse(params.course_id ?? "");
            break;
          }
          case "lecture_extract_formulas": {
            const { lectureNoteExtractionEngine } = await import("../../engines/LectureNoteExtractionEngine.js");
            const formulas = await lectureNoteExtractionEngine.extractFormulasFromText(
              params.text ?? "",
              params.course_id ?? "unknown",
              params.lecture_number
            );
            result = {
              extracted: formulas.length,
              formulas,
            };
            break;
          }
          case "lecture_get_formulas": {
            const { lectureNoteExtractionEngine } = await import("../../engines/LectureNoteExtractionEngine.js");
            if (params.category) {
              result = lectureNoteExtractionEngine.getFormulasByCategory(params.category);
            } else if (params.engine) {
              result = lectureNoteExtractionEngine.getFormulasForEngine(params.engine);
            } else {
              result = lectureNoteExtractionEngine.getFormulas();
            }
            break;
          }
          case "lecture_get_problems": {
            const { lectureNoteExtractionEngine } = await import("../../engines/LectureNoteExtractionEngine.js");
            if (params.course_id) {
              result = lectureNoteExtractionEngine.getProblemsByCourse(params.course_id);
            } else if (params.min_relevance) {
              result = lectureNoteExtractionEngine.getHighRelevanceProblems(params.min_relevance);
            } else {
              result = lectureNoteExtractionEngine.getProblems();
            }
            break;
          }
          case "lecture_stats": {
            const { lectureNoteExtractionEngine } = await import("../../engines/LectureNoteExtractionEngine.js");
            result = lectureNoteExtractionEngine.getStats();
            break;
          }

          // =====================================================================
          // PDF-EXT-MS2: Knowledge Ingestion Pipeline
          // =====================================================================
          case "ingestion_discover": {
            const { knowledgeIngestionOrchestratorEngine } = await import("../../engines/KnowledgeIngestionOrchestratorEngine.js");
            const resources = await knowledgeIngestionOrchestratorEngine.discoverResources(params.subdir);
            result = {
              total: resources.length,
              byCategory: resources.reduce((acc: Record<string, number>, r) => {
                acc[r.category] = (acc[r.category] || 0) + 1;
                return acc;
              }, {}),
              resources: resources.slice(0, params.limit ?? 50),
            };
            break;
          }
          case "ingestion_pending": {
            const { knowledgeIngestionOrchestratorEngine } = await import("../../engines/KnowledgeIngestionOrchestratorEngine.js");
            const pending = await knowledgeIngestionOrchestratorEngine.getPending();
            result = {
              total: pending.length,
              byCategory: pending.reduce((acc: Record<string, number>, r) => {
                acc[r.category] = (acc[r.category] || 0) + 1;
                return acc;
              }, {}),
              resources: pending.slice(0, params.limit ?? 20),
            };
            break;
          }
          case "ingestion_run": {
            const { knowledgeIngestionOrchestratorEngine } = await import("../../engines/KnowledgeIngestionOrchestratorEngine.js");
            result = await knowledgeIngestionOrchestratorEngine.runPipeline({
              maxResources: params.max_resources ?? 10,
              categories: params.categories,
            });
            break;
          }
          case "ingestion_ingest_one": {
            const { knowledgeIngestionOrchestratorEngine } = await import("../../engines/KnowledgeIngestionOrchestratorEngine.js");
            const discovered = await knowledgeIngestionOrchestratorEngine.discoverResources();
            const resource = discovered.find((r) => r.path === params.path || r.name === params.name);
            if (!resource) {
              result = { error: "Resource not found", path: params.path };
            } else {
              result = await knowledgeIngestionOrchestratorEngine.ingestResource(resource);
            }
            break;
          }
          case "ingestion_stats": {
            const { knowledgeIngestionOrchestratorEngine } = await import("../../engines/KnowledgeIngestionOrchestratorEngine.js");
            result = knowledgeIngestionOrchestratorEngine.getStats();
            break;
          }
          // ── PDF-EXT-MS3: Extracted Knowledge Wiring ──
          case "extracted_wire_all": {
            const { extractedKnowledgeWiringEngine } = await import("../../engines/ExtractedKnowledgeWiringEngine.js");
            result = await extractedKnowledgeWiringEngine.wireAll();
            break;
          }
          case "extracted_search": {
            const { extractedKnowledgeWiringEngine } = await import("../../engines/ExtractedKnowledgeWiringEngine.js");
            result = extractedKnowledgeWiringEngine.search(
              params.query ?? "",
              params.limit ?? 20
            );
            break;
          }
          case "extracted_stats": {
            const { extractedKnowledgeWiringEngine } = await import("../../engines/ExtractedKnowledgeWiringEngine.js");
            result = extractedKnowledgeWiringEngine.getStats();
            break;
          }
          // ── Workflow Template Actions ──
          case "workflow_suggest": {
            const { workflowTemplateEngine } = await import("../../engines/WorkflowTemplateEngine.js");
            result = workflowTemplateEngine.suggestSequence({
              process_type: params.process_type ?? "2d_milling",
              part_complexity: params.part_complexity,
              features: params.features,
              material_group: params.material_group,
              machine_type: params.machine_type,
            });
            break;
          }
          case "workflow_validate": {
            const { workflowTemplateEngine } = await import("../../engines/WorkflowTemplateEngine.js");
            result = workflowTemplateEngine.analyzeGaps(
              params.process_type ?? "2d_milling",
              params.operations ?? []
            );
            break;
          }
          case "workflow_quick_ref": {
            const { workflowTemplateEngine } = await import("../../engines/WorkflowTemplateEngine.js");
            result = {
              process_type: params.process_type,
              sequence: workflowTemplateEngine.getQuickReference(params.process_type ?? "2d_milling"),
            };
            break;
          }
          case "workflow_order_of_ops": {
            const { workflowTemplateEngine } = await import("../../engines/WorkflowTemplateEngine.js");
            result = workflowTemplateEngine.getOrderOfOperations();
            break;
          }
          case "workflow_search": {
            const { extractedKnowledgeBridge } = await import("../../data/extractedKnowledgeBridge.js");
            result = extractedKnowledgeBridge.search(params.query ?? "", params.limit ?? 20);
            break;
          }
          case "workflow_stats": {
            const { extractedKnowledgeBridge } = await import("../../data/extractedKnowledgeBridge.js");
            result = extractedKnowledgeBridge.getStats();
            break;
          }

          // ─── KAR-MS3: Knowledge-Augmented Reasoning Wiring ─────────────────

          // U-KAR24: Lineage Tracking
          case "knowledge_lineage_trace": {
            const { knowledgeLineageEngine } = await import("../../engines/KnowledgeLineageEngine.js");
            const traces = knowledgeLineageEngine.traceToSource(params.atom_id);
            result = {
              atom_id: params.atom_id,
              traces: traces.map(t => ({
                path: t.path,
                source: { id: t.source.id, label: t.source.label, type: t.source.type },
              })),
              trace_count: traces.length,
            };
            break;
          }
          case "knowledge_lineage_report": {
            const { knowledgeLineageEngine } = await import("../../engines/KnowledgeLineageEngine.js");
            const report = knowledgeLineageEngine.getLineageReport(params.atom_id);
            result = {
              atom: report.atom ? { id: report.atom.id, label: report.atom.label } : null,
              sources: report.sources.length,
              consumers: report.consumers.map(c => ({ id: c.consumer.id, action: c.action })),
              versions: report.versions.length,
              conflicts: report.conflicts.filter(c => c.status === "pending").length,
            };
            break;
          }
          case "knowledge_lineage_stats": {
            const { knowledgeLineageEngine } = await import("../../engines/KnowledgeLineageEngine.js");
            const stats = knowledgeLineageEngine.getStats();
            const authDist = knowledgeLineageEngine.getAuthorityDistribution();
            result = {
              ...stats,
              authority_distribution: authDist,
            };
            break;
          }

          // U-KAR25: Wiring Routes
          case "knowledge_wiring_resolve": {
            const { resolveWiringTargets, DEFAULT_WIRING_MANIFEST } = await import("../../schemas/WiringManifest.js");
            const atom = {
              source: { category: params.source_category ?? "unknown" },
              type: params.knowledge_type ?? "tip",
              category: params.domain ?? "general",
            };
            const targets = resolveWiringTargets(atom, DEFAULT_WIRING_MANIFEST);
            result = {
              source_category: params.source_category,
              knowledge_type: params.knowledge_type,
              targets: targets.map(t => ({
                engine: t.engine,
                action: t.action,
                priority: t.priority,
              })),
              target_count: targets.length,
            };
            break;
          }
          case "knowledge_wiring_manifest": {
            const { DEFAULT_WIRING_MANIFEST } = await import("../../schemas/WiringManifest.js");
            result = {
              schema_version: DEFAULT_WIRING_MANIFEST.schemaVersion,
              consumer_count: DEFAULT_WIRING_MANIFEST.consumers.length,
              rule_count: DEFAULT_WIRING_MANIFEST.wiring_rules.length,
              consumers: DEFAULT_WIRING_MANIFEST.consumers.map(c => ({
                id: c.id,
                name: c.name,
                type: c.type,
                accepts: c.accepts,
              })),
              settings: DEFAULT_WIRING_MANIFEST.settings,
            };
            break;
          }
          case "knowledge_wiring_consumers": {
            const { findConsumers, DEFAULT_WIRING_MANIFEST } = await import("../../schemas/WiringManifest.js");
            const consumers = findConsumers(
              DEFAULT_WIRING_MANIFEST,
              params.knowledge_type ?? "tip",
              params.domain ?? "general"
            );
            result = {
              knowledge_type: params.knowledge_type,
              domain: params.domain,
              consumers: consumers.map(c => ({
                id: c.id,
                name: c.name,
                priority: c.priority,
                wiring_method: c.wiring_method,
              })),
              consumer_count: consumers.length,
            };
            break;
          }

          // U-KAR26: Atom Management
          case "knowledge_atom_validate": {
            const { validateAtom } = await import("../../types/KnowledgeAtom.js");
            const validation = validateAtom(params.atom);
            result = {
              valid: validation.valid,
              errors: validation.errors,
              error_count: validation.errors.length,
            };
            break;
          }
          case "knowledge_atom_create": {
            const { createAtom } = await import("../../types/KnowledgeAtom.js");
            const { knowledgeLineageEngine } = await import("../../engines/KnowledgeLineageEngine.js");
            const atom = createAtom({
              title: params.title,
              content: params.content,
              type: params.type ?? "tip",
              category: params.category ?? "general",
              sourcePath: params.source_path ?? "manual_entry",
              sourceType: params.source_type ?? "tribal",
              authority: params.authority ?? "operator",
              confidence: params.confidence ?? 0.7,
              tags: params.tags ?? [],
            });
            // Register in lineage graph
            knowledgeLineageEngine.registerAtom(atom);
            knowledgeLineageEngine.recordVersion(atom, "Created via MCP action");
            result = {
              id: atom.id,
              title: atom.title,
              type: atom.type,
              confidence: atom.confidence,
              created: true,
            };
            break;
          }
          case "knowledge_atom_batch": {
            const { validateAtomBatch, createAtom } = await import("../../types/KnowledgeAtom.js");
            const { knowledgeLineageEngine } = await import("../../engines/KnowledgeLineageEngine.js");
            const atoms = (params.atoms ?? []).map((a: any) => createAtom({
              title: a.title,
              content: a.content,
              type: a.type ?? "tip",
              category: a.category ?? "general",
              sourcePath: a.source_path ?? "batch_import",
              sourceType: a.source_type ?? "tribal",
              authority: a.authority ?? "operator",
              confidence: a.confidence ?? 0.7,
              tags: a.tags ?? [],
            }));
            const validation = validateAtomBatch(atoms);
            // Register valid atoms
            for (const atom of validation.valid) {
              knowledgeLineageEngine.registerAtom(atom);
              knowledgeLineageEngine.recordVersion(atom, "Batch import");
            }
            result = {
              total: atoms.length,
              valid: validation.valid.length,
              invalid: validation.invalid.length,
              invalid_indices: validation.invalid.map(i => i.index),
            };
            break;
          }

          // U-KAR27: Conflict Resolution
          case "knowledge_conflict_detect": {
            const { knowledgeLineageEngine } = await import("../../engines/KnowledgeLineageEngine.js");
            const pending = knowledgeLineageEngine.getPendingConflicts();
            result = {
              pending_conflicts: pending.length,
              conflicts: pending.slice(0, params.limit ?? 10).map(c => ({
                id: c.id,
                atom_id: c.atomId,
                field: c.field,
                value_count: c.values.length,
                status: c.status,
              })),
            };
            break;
          }
          case "knowledge_conflict_resolve_authority": {
            const { knowledgeLineageEngine } = await import("../../engines/KnowledgeLineageEngine.js");
            const resolved = knowledgeLineageEngine.resolveConflictByAuthority(params.conflict_id);
            if (!resolved) {
              result = { error: "Conflict not found or already resolved", conflict_id: params.conflict_id };
            } else {
              result = {
                conflict_id: resolved.id,
                resolved_value: resolved.resolvedValue,
                resolution_method: resolved.resolutionMethod,
                notes: resolved.notes,
              };
            }
            break;
          }

          // ═════════════════════════════════════════════════════════════════
          // U-AWR26 — VideoLearningEngine pipeline actions
          // ═════════════════════════════════════════════════════════════════
          case "video_check_prerequisites": {
            const { videoLearningEngine } = await import("../../engines/VideoLearningEngine.js");
            result = await videoLearningEngine.checkPrerequisites();
            break;
          }
          case "video_get_info": {
            const { videoLearningEngine } = await import("../../engines/VideoLearningEngine.js");
            result = await videoLearningEngine.getVideoInfo(params.video_path as string);
            break;
          }
          case "video_extract_keyframes": {
            const { videoLearningEngine } = await import("../../engines/VideoLearningEngine.js");
            result = await videoLearningEngine.extractKeyframes(
              params.video_path as string,
              params.output_dir as string,
              params.options as any,
            );
            break;
          }
          case "video_transcribe": {
            const { videoLearningEngine } = await import("../../engines/VideoLearningEngine.js");
            result = await videoLearningEngine.transcribeAudio(
              params.audio_path as string,
              (params.model as string) ?? "whisper-1",
            );
            break;
          }
          case "video_process": {
            const { videoLearningEngine } = await import("../../engines/VideoLearningEngine.js");
            result = await videoLearningEngine.processVideo(params as any);
            break;
          }
          case "video_process_directory": {
            const { videoLearningEngine } = await import("../../engines/VideoLearningEngine.js");
            result = await videoLearningEngine.processDirectory(params as any);
            break;
          }
          case "video_extract_playbook_rules": {
            const { videoLearningEngine } = await import("../../engines/VideoLearningEngine.js");
            result = videoLearningEngine.extractPlaybookRules(
              params.transcript as any,
              params.keyframes as any,
            );
            break;
          }
          // ========== PP-AGI-S0/U-S0-05: FormulaOrchestrator Wiring ==========
          case "formula_validate": {
            const { formulaOrchestrator } = await import("../../engines/FormulaOrchestrator.js");
            await formulaOrchestrator.initialize();
            result = formulaOrchestrator.validateFormula(
              params.formula_id as string,
              params.test_values as Record<string, number> | undefined
            );
            break;
          }
          case "formula_wire": {
            const { formulaOrchestrator } = await import("../../engines/FormulaOrchestrator.js");
            await formulaOrchestrator.initialize();
            formulaOrchestrator.wireFormulaToEngine(
              params.formula_id as string,
              params.engine_id as string,
              (params.role as "source" | "consumer") ?? "consumer"
            );
            result = { success: true, formulaId: params.formula_id, engineId: params.engine_id, role: params.role ?? "consumer" };
            break;
          }
          case "formula_by_domain": {
            const { formulaOrchestrator } = await import("../../engines/FormulaOrchestrator.js");
            await formulaOrchestrator.initialize();
            result = formulaOrchestrator.getFormulasByDomain(
              (params.domain as "lathe" | "mill" | "wedm" | "general" | "all") ?? "all"
            );
            break;
          }
          case "formula_coverage": {
            const { formulaOrchestrator } = await import("../../engines/FormulaOrchestrator.js");
            await formulaOrchestrator.initialize();
            result = formulaOrchestrator.getFormulaCoverage();
            break;
          }
          case "formula_mapping": {
            const { formulaOrchestrator } = await import("../../engines/FormulaOrchestrator.js");
            await formulaOrchestrator.initialize();
            result = formulaOrchestrator.getFormulaMapping(params.formula_id as string);
            break;
          }
          case "formula_orphans": {
            const { formulaOrchestrator } = await import("../../engines/FormulaOrchestrator.js");
            await formulaOrchestrator.initialize();
            result = formulaOrchestrator.getOrphanFormulas();
            break;
          }
          case "formula_validation_stats": {
            const { formulaOrchestrator } = await import("../../engines/FormulaOrchestrator.js");
            await formulaOrchestrator.initialize();
            result = formulaOrchestrator.getValidationStats();
            break;
          }
          // ========== PP-AGI-S0/U-S0-04: Tribal Knowledge Activation ==========
          case "tribal_activate": {
            const { tribalKnowledgeActivationEngine } = await import("../../engines/TribalKnowledgeActivationEngine.js");
            result = tribalKnowledgeActivationEngine.activateTipsForContext({
              decision_type: params.decision_type ?? "general",
              material: params.material,
              iso_group: params.iso_group,
              operation: params.operation,
              machine: params.machine,
              controller: params.controller,
              tool_type: params.tool_type,
              tool_diameter_mm: params.tool_diameter_mm,
              target_ra_um: params.target_ra_um,
              symptom: params.symptom,
              cam_system: params.cam_system,
              keywords: params.keywords,
              hardness_hrc: params.hardness_hrc,
              cutting_speed: params.cutting_speed,
              feed_rate: params.feed_rate,
              depth_of_cut: params.depth_of_cut,
            });
            break;
          }
          case "tribal_by_problem": {
            const { tribalKnowledgeActivationEngine } = await import("../../engines/TribalKnowledgeActivationEngine.js");
            result = {
              problem: params.problem ?? params.symptom ?? "",
              tips: tribalKnowledgeActivationEngine.getTipsByProblem(
                params.problem ?? params.symptom ?? "",
                params.limit ?? 10
              ),
            };
            break;
          }
          case "tribal_for_speedfeed": {
            const { tribalKnowledgeActivationEngine } = await import("../../engines/TribalKnowledgeActivationEngine.js");
            result = tribalKnowledgeActivationEngine.activateForSpeedFeed({
              material: params.material ?? "",
              operation: params.operation ?? "",
              tool_type: params.tool_type,
              tool_diameter_mm: params.tool_diameter_mm,
              hardness_hrc: params.hardness_hrc,
            });
            break;
          }
          case "tribal_for_toolpath": {
            const { tribalKnowledgeActivationEngine } = await import("../../engines/TribalKnowledgeActivationEngine.js");
            result = tribalKnowledgeActivationEngine.activateForToolpath({
              operation: params.operation ?? "",
              material: params.material,
              cam_system: params.cam_system,
              feature: params.feature,
            });
            break;
          }
          case "tribal_for_controller": {
            const { tribalKnowledgeActivationEngine } = await import("../../engines/TribalKnowledgeActivationEngine.js");
            result = tribalKnowledgeActivationEngine.activateForController({
              controller: params.controller ?? "",
              operation: params.operation,
              feature: params.feature,
            });
            break;
          }
          case "tribal_for_troubleshoot": {
            const { tribalKnowledgeActivationEngine } = await import("../../engines/TribalKnowledgeActivationEngine.js");
            result = tribalKnowledgeActivationEngine.activateForTroubleshooting({
              symptom: params.symptom ?? params.problem ?? "",
              machine: params.machine,
              operation: params.operation,
              material: params.material,
            });
            break;
          }
          case "tribal_activation_stats": {
            const { tribalKnowledgeActivationEngine } = await import("../../engines/TribalKnowledgeActivationEngine.js");
            result = tribalKnowledgeActivationEngine.getStats();
            break;
          }
          case "tribal_awareness": {
            const { tribalKnowledgeActivationEngine } = await import("../../engines/TribalKnowledgeActivationEngine.js");
            result = tribalKnowledgeActivationEngine.getSelfAwareness();
            break;
          }
          // ── INTEL-OLLAMA-OBSIDIAN-MS0/P14-U02: Knowledge Ingestion Pipeline ──
          case "wiki_ingest_pdf":
          case "wiki_ingest_dryrun": {
            const { KnowledgeIngestEngine } = await import("../../engines/KnowledgeIngestEngine.js");
            const { qdrantMemoryEngine } = await import("../../engines/QdrantMemoryEngine.js");
            const { ensureQdrantEmbedder } = await import("../../engines/OllamaEmbedderFactory.js");
            const pdfPath = params.pdf_path ?? params.pdfPath ?? params.path;
            if (typeof pdfPath !== "string" || pdfPath.length === 0) {
              throw new Error("wiki_ingest_pdf: pdf_path required");
            }
            const meta = {
              source: params.source ?? params.source_id ?? pdfPath,
              title: params.title,
              vendor: params.vendor,
              category: params.category,
              tags: Array.isArray(params.tags) ? params.tags : undefined,
            };
            ensureQdrantEmbedder();
            const engine = new KnowledgeIngestEngine({ memory: qdrantMemoryEngine });
            const ingestResult = await engine.ingestPdf(pdfPath, meta, {
              targetChars: params.target_chars,
              overlapChars: params.overlap_chars,
              maxPages: params.max_pages,
              timeoutMs: params.timeout_ms,
              dryRun: action === "wiki_ingest_dryrun" || params.dry_run === true,
            });
            result = ingestResult;
            break;
          }
          // ── INTEL-OLLAMA-OBSIDIAN-MS0/P14-U02: Vault RAG (ObsidianMemoryRagEngine) ──
          case "wiki_rag_query": {
            const { obsidianMemoryRagEngine } = await import("../../engines/ObsidianMemoryRagEngine.js");
            const query = params.query ?? params.q;
            if (typeof query !== "string" || query.length === 0) {
              throw new Error("wiki_rag_query: query required");
            }
            result = obsidianMemoryRagEngine.query({
              query,
              memoriesDir: params.memories_dir ?? params.memoriesDir,
              tribalDir: params.tribal_dir ?? params.tribalDir,
              topK: params.top_k ?? params.topK,
              maxBodyChars: params.max_body_chars ?? params.maxBodyChars,
              forceSearch: params.force_search === true || params.forceSearch === true,
            });
            break;
          }
          case "wiki_rag_should_trigger": {
            const { obsidianMemoryRagEngine } = await import("../../engines/ObsidianMemoryRagEngine.js");
            const query = params.query ?? params.q;
            if (typeof query !== "string") {
              throw new Error("wiki_rag_should_trigger: query required");
            }
            result = {
              triggered: obsidianMemoryRagEngine.shouldTrigger(query, params.force_search === true || params.forceSearch === true),
            };
            break;
          }
          // ── INTEL-OLLAMA-OBSIDIAN-MS0/P14-U02: Resources/ classifier (ResourcesClassifierEngine) ──
          case "wiki_classify_file": {
            const { resourcesClassifierEngine } = await import("../../engines/ResourcesClassifierEngine.js");
            const relPath = params.rel_path ?? params.relPath;
            const ext = params.ext;
            const size = params.size;
            if (typeof relPath !== "string" || relPath.length === 0) {
              throw new Error("wiki_classify_file: rel_path required");
            }
            if (typeof ext !== "string") {
              throw new Error("wiki_classify_file: ext required (string, may be empty)");
            }
            if (typeof size !== "number" || !Number.isFinite(size) || size < 0) {
              throw new Error("wiki_classify_file: size required (non-negative number)");
            }
            result = {
              category: resourcesClassifierEngine.classifyFile({ relPath, ext, size }),
            };
            break;
          }
          case "wiki_summarize_dir": {
            const { resourcesClassifierEngine } = await import("../../engines/ResourcesClassifierEngine.js");
            const dirRelPath = params.dir_rel_path ?? params.dirRelPath;
            const entries = params.entries;
            if (typeof dirRelPath !== "string" || dirRelPath.length === 0) {
              throw new Error("wiki_summarize_dir: dir_rel_path required");
            }
            if (!Array.isArray(entries)) {
              throw new Error("wiki_summarize_dir: entries required (array)");
            }
            const normalized = entries.map((e: unknown) => {
              const obj = (e ?? {}) as Record<string, unknown>;
              const rel = (obj.rel_path ?? obj.relPath);
              const ext = obj.ext;
              const size = obj.size;
              return {
                relPath: typeof rel === "string" ? rel : "",
                ext: typeof ext === "string" ? ext : "",
                size: typeof size === "number" && Number.isFinite(size) ? size : 0,
              };
            });
            result = resourcesClassifierEngine.summarizeDir(dirRelPath, normalized);
            break;
          }
          // ── INTEL-OLLAMA-OBSIDIAN-MS0/P14-U03: Vault backlinks (VaultBacklinkEngine) ──
          case "wiki_backlink_for_chunk": {
            const { vaultBacklinkEngine } = await import("../../engines/VaultBacklinkEngine.js");
            const chunkText = params.chunk_text ?? params.chunkText;
            if (typeof chunkText !== "string") {
              throw new Error("wiki_backlink_for_chunk: chunk_text required (string)");
            }
            result = vaultBacklinkEngine.findBacklinksForChunk(chunkText, {
              topK: params.top_k ?? params.topK,
              minScore: params.min_score ?? params.minScore,
              candidatesEngine: Array.isArray(params.candidates_engine) ? params.candidates_engine : undefined,
              candidatesAction: Array.isArray(params.candidates_action) ? params.candidates_action : undefined,
              candidatesSkill: Array.isArray(params.candidates_skill) ? params.candidates_skill : undefined,
            });
            break;
          }
          case "wiki_backlink_render": {
            const { vaultBacklinkEngine } = await import("../../engines/VaultBacklinkEngine.js");
            const r = params.result;
            if (!r || typeof r !== "object") {
              throw new Error("wiki_backlink_render: result required (BacklinkResult shape)");
            }
            result = { markdown: vaultBacklinkEngine.renderBacklinksMarkdown(r) };
            break;
          }
          case "wiki_backlink_parse_digest": {
            const { vaultBacklinkEngine } = await import("../../engines/VaultBacklinkEngine.js");
            const text = params.digest_text ?? params.digestText;
            const kind = params.kind;
            if (typeof text !== "string") {
              throw new Error("wiki_backlink_parse_digest: digest_text required (string)");
            }
            if (kind !== "engine" && kind !== "dispatcher_action" && kind !== "skill") {
              throw new Error("wiki_backlink_parse_digest: kind must be one of engine|dispatcher_action|skill");
            }
            result = { candidates: vaultBacklinkEngine.parseDigest(text, kind) };
            break;
          }
        }
        return { content: [{ type: "text", text: JSON.stringify(slimResponse(wrapWithAwareness(result, awareness))) }] };
      } catch (error: any) {
        return dispatcherError(error, action, "prism_knowledge");
      }
    }
  );
}
