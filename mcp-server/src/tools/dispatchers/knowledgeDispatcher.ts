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

const ACTIONS = [
  "search", "cross_query", "formula", "relations", "stats",
  "tribal_capture", "tribal_search", "tribal_suggest", "tribal_stats",
  ...ACADEMY_ACTIONS,
  ...VISUAL_LAB_ACTIONS,
  ...KG_ACTIONS,
  ...TROUBLESHOOT_TREE_ACTIONS,
] as const;

let knowledgeEngine: any = null;
let kgEngine: any = null;

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
        }
        return { content: [{ type: "text", text: JSON.stringify(slimResponse(result)) }] };
      } catch (error: any) {
        return dispatcherError(error, action, "prism_knowledge");
      }
    }
  );
}
