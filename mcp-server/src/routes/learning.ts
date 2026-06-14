/**
 * PRISM MCP Server — Learning & Knowledge Product Routes
 * Adapter layer that normalizes the live PRISM dispatcher surface into the
 * frontend learning contracts used by the web app.
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

type LearningDomain = "CAD" | "CAM" | "ShopPractice" | "MachineOperation";
type NormalizedModuleStatus = "locked" | "available" | "in_progress" | "completed";

const ALL_DOMAINS: LearningDomain[] = ["CAD", "CAM", "ShopPractice", "MachineOperation"];

const STATUS_BADGES = [
  {
    id: "first-module",
    name: "First Chips",
    description: "Complete your first lesson or module",
    threshold: 1,
    icon: "🏁",
  },
  {
    id: "path-builder",
    name: "Path Builder",
    description: "Complete five lessons or modules",
    threshold: 5,
    icon: "🧭",
  },
  {
    id: "steady-learner",
    name: "Steady Learner",
    description: "Complete ten lessons or modules",
    threshold: 10,
    icon: "📚",
  },
  {
    id: "shop-floor-pro",
    name: "Shop Floor Pro",
    description: "Reach twenty completed lessons or modules",
    threshold: 20,
    icon: "🏭",
  },
] as const;

function titleCase(value: string | undefined): string {
  if (!value) return "Learning";
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function inferIsoGroup(material: string | undefined): string | undefined {
  if (!material) return undefined;
  const query = material.toLowerCase();
  if (/aluminum|aluminium|6061|7075|brass|copper|bronze/.test(query)) return "N";
  if (/stainless|304|316|17-4|15-5/.test(query)) return "M";
  if (/titanium|ti-6al-4v|inconel|superalloy|hastelloy/.test(query)) return "S";
  if (/cast iron/.test(query)) return "K";
  if (/tool steel|d2|h13|hardened/.test(query)) return "H";
  return "P";
}

function normalizeDifficulty(level: string | undefined): "beginner" | "intermediate" | "advanced" {
  const value = (level || "").toLowerCase();
  if (value === "advanced" || value === "expert") return "advanced";
  if (value === "intermediate") return "intermediate";
  return "beginner";
}

function levelFromScore(score: number): "beginner" | "intermediate" | "advanced" | "expert" {
  if (score >= 85) return "expert";
  if (score >= 70) return "advanced";
  if (score >= 45) return "intermediate";
  return "beginner";
}

function domainFromSkill(skill: string): LearningDomain {
  const key = skill.toLowerCase();
  if (/cad|drawing|blueprint|gdt|model/.test(key)) return "CAD";
  if (/cam|g_code|toolpath|speed|feed|program|macro|tool_selection|machining/.test(key)) return "CAM";
  if (/machine|maintenance|alarm|controller|tool_setting|setup/.test(key)) return "MachineOperation";
  return "ShopPractice";
}

function domainFromCategory(category: string | undefined): LearningDomain {
  const key = (category || "").toLowerCase();
  if (/cad|drawing|blueprint|gdt/.test(key)) return "CAD";
  if (/cam|program|toolpath|g_code|speed|feed|surface_finish|thread|tooling/.test(key)) return "CAM";
  if (/machine|maintenance|safety|controller|operation/.test(key)) return "MachineOperation";
  return "ShopPractice";
}

function sourceFromRegistry(registry: string | undefined): "textbook" | "tribal" | "standard" | "manual" {
  switch ((registry || "").toLowerCase()) {
    case "formulas":
    case "materials":
      return "standard";
    case "skills":
    case "scripts":
      return "manual";
    case "hooks":
    case "agents":
      return "manual";
    default:
      return "textbook";
  }
}

function excerpt(text: string | undefined, max = 180): string {
  const source = (text || "").replace(/\s+/g, " ").trim();
  if (!source) return "";
  return source.length <= max ? source : `${source.slice(0, max - 1)}…`;
}

function asArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function buildCompletedModuleIds(params: Record<string, any>, totalModules: number): Set<string> {
  const completedIds = new Set<string>(asArray<string>(params.completed_module_ids));
  if (
    params.action === "update" &&
    typeof params.module_id === "string" &&
    Number(params.completion_pct ?? 0) >= 100
  ) {
    completedIds.add(params.module_id);
  }
  if (completedIds.size === 0 && typeof params.modules_completed === "number" && params.modules_completed > 0) {
    for (let i = 0; i < Math.min(totalModules, params.modules_completed); i += 1) {
      completedIds.add(`__implicit_${i}`);
    }
  }
  return completedIds;
}

function normalizeModules(
  rawModules: any[],
  params: Record<string, any>,
): { modules: any[]; currentModuleId: string | null } {
  const baseModules = asArray(rawModules).map((module, index) => ({
    id: String(module.id ?? `LM-${index + 1}`),
    title: String(module.title ?? `Module ${index + 1}`),
    domain: domainFromCategory(module.category),
    difficulty: normalizeDifficulty(module.target_level),
    duration_min: Math.max(15, Math.round(Number(module.duration_hours ?? 1) * 60)),
    prerequisites: asArray<string>(module.prerequisite_skills),
    description: String(module.description ?? ""),
    status: "locked" as NormalizedModuleStatus,
    completion_pct: 0,
  }));

  const completedIds = buildCompletedModuleIds(params, baseModules.length);
  const completedById = new Set<string>();
  const currentModuleIndex = baseModules.findIndex((_, index) => {
    const id = baseModules[index].id;
    if (completedIds.has(id) || completedIds.has(`__implicit_${index}`)) {
      completedById.add(id);
      return false;
    }
    return true;
  });

  const currentId = currentModuleIndex >= 0 ? baseModules[currentModuleIndex].id : null;

  const modules = baseModules.map((module, index) => {
    const isCompleted = completedIds.has(module.id) || completedIds.has(`__implicit_${index}`);
    if (isCompleted) {
      completedById.add(module.id);
      return { ...module, status: "completed" as const, completion_pct: 100 };
    }

    const prerequisitesMet = module.prerequisites.every((prereq) => completedById.has(prereq));
    if (currentId === module.id) {
      const percent = Number(
        params.action === "update" && params.module_id === module.id
          ? params.completion_pct ?? 0
          : 0,
      );
      return {
        ...module,
        status: "in_progress" as const,
        completion_pct: Math.max(0, Math.min(99, percent)),
      };
    }

    if (prerequisitesMet || index === 0) {
      return { ...module, status: "available" as const };
    }

    return module;
  });

  return { modules, currentModuleId: currentId };
}

function normalizeAssessment(raw: any, params: Record<string, any>) {
  const requestedDomains = asArray<string>(params.domains).filter((domain): domain is LearningDomain =>
    ALL_DOMAINS.includes(domain as LearningDomain),
  );
  const domains = requestedDomains.length > 0 ? requestedDomains : ALL_DOMAINS;
  const rawSkills = raw?.skills && typeof raw.skills === "object" ? raw.skills : {};
  const strengths = new Set(asArray<string>(raw?.strengths));
  const weaknesses = new Set(asArray<string>(raw?.gaps));

  const skills = domains.map((domain) => {
    const relevantEntries = Object.entries<any>(rawSkills).filter(([skill]) => domainFromSkill(skill) === domain);
    const scores = relevantEntries.map(([, detail]) => Number(detail?.score ?? 0));
    const score = scores.length > 0
      ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
      : 0;
    const domainStrengths = relevantEntries
      .map(([skill]) => skill)
      .filter((skill) => strengths.has(skill));
    const domainWeaknesses = relevantEntries
      .map(([skill]) => skill)
      .filter((skill) => weaknesses.has(skill));

    return {
      domain,
      score,
      level: levelFromScore(score),
      strengths: domainStrengths,
      weaknesses: domainWeaknesses,
    };
  });

  const overallScore = skills.length > 0
    ? Math.round(skills.reduce((sum, skill) => sum + skill.score, 0) / skills.length)
    : 0;

  return {
    overall_score: overallScore,
    skills,
    recommended_path: titleCase(raw?.role ?? params.target_role ?? "cnc_operator"),
    assessment_date: new Date().toISOString(),
  };
}

function normalizePlan(raw: any, params: Record<string, any>) {
  const { modules, currentModuleId } = normalizeModules(asArray(raw?.modules), params);
  const estimatedHours = Number(raw?.total_hours ?? modules.reduce((sum, module) => sum + module.duration_min, 0) / 60);
  const targetRole = String(raw?.target_role ?? params.target_role ?? "cnc_operator");

  return {
    path_id: String(raw?.operator_id ?? params.operator_id ?? "OP-001"),
    title: `${titleCase(targetRole)} Mastery Path`,
    modules,
    estimated_hours: Math.round(estimatedHours * 10) / 10,
    current_module_id: currentModuleId,
  };
}

function normalizeProgress(progressRaw: any, planRaw: any, params: Record<string, any>) {
  const { modules } = normalizeModules(asArray(planRaw?.modules), {
    ...params,
    modules_completed: Number(progressRaw?.modules_completed ?? params.modules_completed ?? 0),
  });
  const modulesCompleted = modules.filter((module) => module.status === "completed").length;
  const completedHours = modules
    .filter((module) => module.status === "completed")
    .reduce((sum, module) => sum + module.duration_min, 0) / 60;

  const domainProgress = ALL_DOMAINS.reduce<Record<LearningDomain, number>>((acc, domain) => {
    const domainModules = modules.filter((module) => module.domain === domain);
    if (domainModules.length === 0) {
      acc[domain] = 0;
      return acc;
    }
    const completed = domainModules.filter((module) => module.status === "completed").length;
    acc[domain] = Math.round((completed / domainModules.length) * 100);
    return acc;
  }, {
    CAD: 0,
    CAM: 0,
    ShopPractice: 0,
    MachineOperation: 0,
  });

  const today = new Date();
  const dailyHistory = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - offset));
    const minutes_spent =
      offset === 6 && Number(params.completion_pct ?? 0) > 0
        ? Math.max(15, Math.round(Number(params.completion_pct) * 0.6))
        : modulesCompleted > 0
        ? Math.round((completedHours * 60) / Math.max(modulesCompleted, 1))
        : 0;
    return {
      date: date.toISOString(),
      domain: "CAM" as LearningDomain,
      minutes_spent,
      modules_completed: offset === 6 ? modulesCompleted : 0,
    };
  });

  const now = new Date().toISOString();
  const badges = STATUS_BADGES.map((badge) => ({
    id: badge.id,
    name: badge.name,
    description: badge.description,
    earned_at: modulesCompleted >= badge.threshold ? now : null,
    icon: badge.icon,
  }));

  return {
    total_hours: Math.round(completedHours * 10) / 10,
    modules_completed: Number(progressRaw?.modules_completed ?? modulesCompleted),
    modules_total: Number(progressRaw?.modules_total ?? modules.length),
    current_streak_days: modulesCompleted > 0 ? Math.min(7, modulesCompleted) : 0,
    domain_progress: domainProgress,
    daily_history: dailyHistory,
    badges,
  };
}

function normalizeRecommendationModule(module: any) {
  return {
    id: String(module?.id ?? module?.module_id ?? "module"),
    title: String(module?.title ?? "Learning Module"),
    domain: domainFromCategory(module?.category),
    difficulty: normalizeDifficulty(module?.target_level),
    duration_min: Math.max(15, Math.round(Number(module?.duration_hours ?? 1) * 60)),
    prerequisites: asArray<string>(module?.prerequisite_skills),
    description: String(module?.description ?? ""),
    status: "available" as const,
    completion_pct: 0,
  };
}

function normalizeKnowledgeResult(result: any) {
  if (result?.title && result?.body) {
    return {
      id: String(result.id ?? result.title),
      title: String(result.title),
      excerpt: excerpt(result.body),
      domain: domainFromCategory(result.category),
      source: "tribal" as const,
      relevance_score: Math.min(1, Math.max(0, Number(result.confidence ?? 0) / 100)),
      content: String(result.body),
      tags: asArray<string>(result.tags),
    };
  }

  const registry = String(result?.registry ?? "knowledge");
  return {
    id: String(result?.id ?? registry),
    title: String(result?.name ?? "Knowledge Result"),
    excerpt: excerpt(result?.summary ?? result?.description ?? ""),
    domain: domainFromCategory(registry),
    source: sourceFromRegistry(registry),
    relevance_score: Number(result?.relevance_score ?? 0),
    content: typeof result?.data === "string"
      ? result.data
      : JSON.stringify(result?.data ?? result, null, 2),
    tags: [registry, result?.match_field].filter(Boolean),
  };
}

function normalizeMaterialRecommendations(results: any[]) {
  return asArray(results).map((candidate) => ({
    id: String(candidate.material_id ?? candidate.id ?? candidate.name),
    name: String(candidate.name ?? "Material"),
    iso_group: String(candidate.iso_group ?? candidate.iso ?? "P"),
    match_score: Math.min(1, Math.max(0, Number(candidate.score ?? candidate.match_score ?? 0) / 100)),
    properties: candidate.properties ?? {},
    pros: asArray<string>(candidate.rationale ?? candidate.pros),
    cons: asArray<string>(candidate.trade_offs ?? candidate.cons),
  }));
}

function normalizeToolRecommendations(result: any) {
  const candidates = asArray(result?.candidates ?? result);
  return candidates.map((candidate: any) => ({
    id: String(candidate.tool_id ?? candidate.id ?? candidate.designation ?? "tool"),
    name: String(candidate.designation ?? candidate.description ?? candidate.name ?? "Tool"),
    type: String(candidate.type ?? candidate.tool_type ?? "cutting_tool"),
    manufacturer: String(candidate.manufacturer ?? "PRISM"),
    match_score: Math.min(1, Math.max(0, Number(candidate.score ?? candidate.match_score ?? 0) / 100)),
    specs: {
      diameter_mm: Number(candidate.diameter_mm ?? 0),
      flutes: Number(candidate.flute_count ?? 0),
      helix_angle_deg: Number(candidate.helix_angle_deg ?? 35),
      coating: String(candidate.coating ?? "unknown"),
      max_doc_mm: Number(candidate.recommended_params?.ap_mm ?? 0),
      max_woc_mm: Number(candidate.recommended_params?.ae_mm ?? 0),
    },
    recommended_params: {
      speed_rpm: Number(candidate.recommended_params?.rpm ?? 0),
      feed_mmrev: Number(candidate.recommended_params?.feed_mmpt ?? candidate.recommended_feed_mmpt ?? 0),
      doc_mm: Number(candidate.recommended_params?.ap_mm ?? 0),
    },
  }));
}

function parseManufacturer(name: string): string {
  const parts = name.split(" ");
  return parts.length > 0 ? parts[0] : "PRISM";
}

function normalizeMachineRecommendations(results: any[]) {
  return asArray(results).map((candidate) => ({
    id: String(candidate.machine_id ?? candidate.id ?? candidate.name),
    name: String(candidate.name ?? "Machine"),
    type: String(candidate.type ?? "CNC"),
    manufacturer: parseManufacturer(String(candidate.name ?? "PRISM Machine")),
    match_score: Math.min(1, Math.max(0, Number(candidate.score ?? candidate.match_score ?? 0) / 100)),
    specs: {
      axes: Number(candidate.type?.toLowerCase().includes("5-axis") ? 5 : candidate.type?.toLowerCase().includes("4") ? 4 : 3),
      table_mm: {
        x: Number(candidate.travel?.x ?? 0),
        y: Number(candidate.travel?.y ?? 0),
      },
      spindle_rpm_max: Number(candidate.spindle?.max_rpm ?? 0),
      power_kw: Number(candidate.spindle?.power_kW ?? 0),
      accuracy_mm: Number(candidate.accuracy_mm ?? 0),
      weight_kg: 0,
    },
    capabilities: asArray<string>(candidate.rationale ?? []).slice(0, 6),
  }));
}

function normalizeTwin(raw: any, params: Record<string, any>) {
  const feed = Number(raw?.feed_rate_mm_min ?? raw?.feed_rate ?? 0);
  const temperature = Number(raw?.temperature_C ?? raw?.temperature ?? 0);
  const vibration = Number(raw?.vibration_mm_s ?? raw?.vibration ?? 0);
  const spindle = Number(raw?.spindle_rpm ?? 0);
  const alerts = [];

  if (temperature >= 60) {
    alerts.push({
      level: temperature >= 80 ? "critical" : "warning",
      message: "Spindle temperature is elevated",
      timestamp: new Date().toISOString(),
      parameter: "temperature_c",
      value: temperature,
      threshold: temperature >= 80 ? 80 : 60,
    });
  }
  if (vibration >= 4) {
    alerts.push({
      level: vibration >= 7 ? "critical" : "warning",
      message: "Machine vibration is above baseline",
      timestamp: new Date().toISOString(),
      parameter: "vibration_mms",
      value: vibration,
      threshold: vibration >= 7 ? 7 : 4,
    });
  }

  return {
    machine_id: String(raw?.machine_id ?? params.machine_id ?? "M001"),
    machine_name: String(raw?.machine_name ?? raw?.machine_id ?? params.machine_id ?? "PRISM Digital Twin"),
    status: raw?.state === "alarm" ? "alarm" : raw?.state === "maintenance" ? "maintenance" : raw?.state === "idle" ? "idle" : "running",
    spindle_rpm: spindle,
    feed_rate_mmmin: feed,
    position: {
      x: Number(params.position?.x ?? 0),
      y: Number(params.position?.y ?? 0),
      z: Number(params.position?.z ?? 0),
    },
    temperature_c: temperature,
    vibration_mms: vibration,
    tool_wear_pct: Number(params.tool_wear_pct ?? 12),
    current_program: params.current_program ?? null,
    uptime_hours: Number(params.uptime_hours ?? 0),
    alerts,
  };
}

async function handleRoute<T>(
  res: any,
  action: () => Promise<T>,
  normalize?: (result: T) => unknown,
) {
  try {
    const result = await action();
    res.json({ ok: true, data: normalize ? normalize(result) : result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
}

/** Creates learning router.
 * @param callTool - call tool
 * @returns router
 */
export function createLearningRouter(callTool: CallToolFn): Router {
  const router = Router();

  router.post("/assess", async (req, res) => {
    await handleRoute(
      res,
      () => callTool("prism_business", "learning_assess", req.body),
      (result) => normalizeAssessment(result, req.body),
    );
  });

  router.post("/plan", async (req, res) => {
    await handleRoute(
      res,
      () => callTool("prism_business", "learning_plan", req.body),
      (result) => normalizePlan(result, req.body),
    );
  });

  router.post("/progress", async (req, res) => {
    await handleRoute(res, async () => {
      const [plan, progress] = await Promise.all([
        callTool("prism_business", "learning_plan", req.body),
        callTool("prism_business", "learning_progress", req.body),
      ]);
      return { plan, progress };
    }, ({ plan, progress }) => normalizeProgress(progress, plan, req.body));
  });

  router.post("/recommend", async (req, res) => {
    await handleRoute(
      res,
      () => callTool("prism_business", "learning_recommend", req.body),
      (result) => asArray(result).slice(0, Number(req.body?.count ?? 5)).map(normalizeRecommendationModule),
    );
  });

  router.post("/knowledge/search", async (req, res) => {
    await handleRoute(
      res,
      () => callTool("prism_knowledge", "search", req.body),
      (result) => asArray(result).map(normalizeKnowledgeResult),
    );
  });

  router.post("/tribal", async (req, res) => {
    await handleRoute(
      res,
      () => callTool("prism_knowledge", "tribal_search", req.body),
      (result) => asArray(result).map(normalizeKnowledgeResult),
    );
  });

  router.post("/select/material", async (req, res) => {
    await handleRoute(res, async () => {
      const requirements = req.body?.requirements ?? {};
      return callTool("prism_calc", "material_select_recommend", {
        application: requirements.application,
        tensile_strength_MPa: requirements.tensile_min_mpa,
        hardness_HRC: requirements.hardness_range?.[0],
        max_hardness_HRC: requirements.hardness_range?.[1],
        corrosion_resistant: requirements.corrosion_resistant,
        weldable: requirements.weldable,
        limit: req.body?.count ?? 10,
      });
    }, normalizeMaterialRecommendations);
  });

  router.post("/select/tool", async (req, res) => {
    await handleRoute(res, async () => {
      const requirements = req.body?.requirements ?? {};
      return callTool("prism_cam", "smart_tool_select", {
        operation_type: String(req.body?.operation ?? "").toLowerCase().replace(/\s+/g, "_"),
        material_name: req.body?.material,
        material_iso_group: inferIsoGroup(req.body?.material),
        feature_diameter_mm: requirements.diameter_mm,
        feature_depth_mm: requirements.max_doc_mm,
        surface_finish_Ra: requirements.finish_required ? 0.8 : undefined,
        max_results: req.body?.count ?? 10,
      });
    }, normalizeToolRecommendations);
  });

  router.post("/select/machine", async (req, res) => {
    await handleRoute(res, async () => {
      const requirements = req.body?.part_requirements ?? {};
      return callTool("prism_calc", "machine_recommend", {
        part_envelope_mm: requirements.max_dimension_mm ?? { x: 0, y: 0, z: 0 },
        operations: asArray<string>(requirements.operations),
        material_iso_group: inferIsoGroup(requirements.material),
        required_accuracy_mm: requirements.tolerance_mm,
        needs_4th_axis: Number(requirements.axes_required ?? 3) >= 4 && Number(requirements.axes_required ?? 3) < 5,
        needs_5th_axis: Number(requirements.axes_required ?? 3) >= 5,
      });
    }, normalizeMachineRecommendations);
  });

  router.post("/twin", async (req, res) => {
    await handleRoute(
      res,
      () => callTool("prism_machine_live", "digital_twin_state", req.body),
      (result) => normalizeTwin(result, req.body),
    );
  });

  // ── Document Learning (CC-EXT-MS0 P0-U07) ──────────────────────────────
  // Express adapter for the prism_doc_learn dispatcher (documentLearningDispatcher).
  // Upload/extract/list/get/delete document knowledge from PDFs, notes, papers.
  router.post("/document/upload", async (req, res) => {
    await handleRoute(res, () => callTool("prism_doc_learn", "doc_upload", req.body));
  });

  router.post("/document/extract", async (req, res) => {
    await handleRoute(res, () => callTool("prism_doc_learn", "doc_extract", req.body));
  });

  router.get("/documents", async (_req, res) => {
    await handleRoute(res, () => callTool("prism_doc_learn", "doc_list", {}));
  });

  router.get("/document/:id", async (req, res) => {
    await handleRoute(res, () =>
      callTool("prism_doc_learn", "doc_get", { document_id: req.params.id }),
    );
  });

  router.delete("/document/:id", async (req, res) => {
    await handleRoute(res, () =>
      callTool("prism_doc_learn", "doc_delete", { document_id: req.params.id }),
    );
  });

  return router;
}
