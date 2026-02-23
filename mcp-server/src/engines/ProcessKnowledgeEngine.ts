/**
 * ProcessKnowledgeEngine — R20-MS2
 *
 * Tribal knowledge capture, retrieval, and reuse engine. Stores manufacturing
 * process knowledge (lessons learned, best practices, parameter recipes) in
 * an in-memory knowledge base with tag-based search and material/operation
 * categorization.
 *
 * Actions:
 *   pk_capture  — capture a piece of process knowledge
 *   pk_retrieve — retrieve knowledge by ID or tag
 *   pk_search   — search knowledge base by material/operation/keyword
 *   pk_validate — validate a parameter set against stored knowledge
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface KnowledgeEntry {
  id: string;
  type: "lesson_learned" | "best_practice" | "parameter_recipe" | "failure_mode" | "tip";
  title: string;
  description: string;
  material?: string;
  operation?: string;
  tags: string[];
  parameters?: Record<string, number>;
  constraints?: { parameter: string; min?: number; max?: number; reason: string }[];
  confidence: number; // 0-1
  source: string;
  created_at: string;
  usage_count: number;
}

// ── In-Memory Knowledge Base ───────────────────────────────────────────────

const knowledgeStore: Map<string, KnowledgeEntry> = new Map();
let nextId = 1;

// Seed with built-in manufacturing knowledge
const SEED_KNOWLEDGE: Omit<KnowledgeEntry, "id" | "created_at" | "usage_count">[] = [
  {
    type: "best_practice",
    title: "Titanium roughing: low speed, high feed",
    description: "For Ti-6Al-4V roughing, keep cutting speed below 60 m/min to control heat. Use high feed per tooth (0.15-0.25mm) to maintain chip thickness and prevent rubbing.",
    material: "titanium_ti6al4v",
    operation: "roughing",
    tags: ["titanium", "roughing", "speed", "feed", "heat_control"],
    parameters: { cutting_speed_m_min: 50, feed_per_tooth_mm: 0.18, depth_of_cut_mm: 3.0 },
    constraints: [
      { parameter: "cutting_speed_m_min", max: 65, reason: "Excessive heat generation above 65 m/min" },
      { parameter: "feed_per_tooth_mm", min: 0.1, reason: "Below 0.1mm causes rubbing and work hardening" },
    ],
    confidence: 0.9,
    source: "manufacturing_handbook",
  },
  {
    type: "lesson_learned",
    title: "Aluminum 7075: stress relieve before finish machining",
    description: "Al7075 T6 parts with thin walls should be stress-relieved between roughing and finishing to prevent warping. Hold at 177°C for 2 hours.",
    material: "aluminum_7075",
    operation: "finishing",
    tags: ["aluminum", "7075", "stress_relieve", "warping", "thin_wall"],
    parameters: {},
    constraints: [],
    confidence: 0.85,
    source: "shop_experience",
  },
  {
    type: "best_practice",
    title: "Stainless 304: avoid work hardening",
    description: "Use positive rake geometry and maintain constant chip load. Never dwell or rub. Climbing milling preferred. Keep feed above 0.08mm/tooth.",
    material: "stainless_304",
    operation: "milling",
    tags: ["stainless", "304", "work_hardening", "chip_load", "climb_milling"],
    parameters: { feed_per_tooth_mm: 0.12, cutting_speed_m_min: 120 },
    constraints: [
      { parameter: "feed_per_tooth_mm", min: 0.08, reason: "Below 0.08mm causes work hardening" },
    ],
    confidence: 0.9,
    source: "manufacturing_handbook",
  },
  {
    type: "failure_mode",
    title: "Inconel 718: crater wear at high speeds",
    description: "Cutting speeds above 40 m/min with carbide cause rapid crater wear on Ti-Al-N coated inserts. Use ceramic or CBN above 200 m/min.",
    material: "inconel_718",
    operation: "turning",
    tags: ["inconel", "crater_wear", "speed", "ceramic", "cbn"],
    parameters: { cutting_speed_m_min: 35 },
    constraints: [
      { parameter: "cutting_speed_m_min", max: 40, reason: "Rapid crater wear above 40 m/min with carbide" },
    ],
    confidence: 0.85,
    source: "tool_manufacturer_data",
  },
  {
    type: "parameter_recipe",
    title: "Steel 1045 general milling — balanced parameters",
    description: "General purpose face milling recipe for AISI 1045 steel using coated carbide inserts. Balanced for productivity and tool life.",
    material: "steel_1045",
    operation: "milling",
    tags: ["steel", "1045", "face_milling", "balanced", "carbide"],
    parameters: { cutting_speed_m_min: 200, feed_per_tooth_mm: 0.15, depth_of_cut_mm: 2.0, width_of_cut_mm: 40 },
    constraints: [
      { parameter: "cutting_speed_m_min", min: 150, max: 280, reason: "Optimal range for coated carbide" },
      { parameter: "depth_of_cut_mm", max: 5.0, reason: "Force limit for standard tooling" },
    ],
    confidence: 0.9,
    source: "manufacturing_handbook",
  },
  {
    type: "tip",
    title: "Cast iron: dry machining preferred",
    description: "Cast iron machines best without coolant. Chips are brittle and short. Coolant can cause thermal shock on ceramic inserts. Use air blast for chip evacuation.",
    material: "cast_iron",
    operation: "milling",
    tags: ["cast_iron", "dry_machining", "coolant", "ceramic", "chip_evacuation"],
    parameters: {},
    constraints: [],
    confidence: 0.8,
    source: "shop_experience",
  },
  {
    type: "best_practice",
    title: "Surface finish: reduce feed for Ra < 0.8",
    description: "To achieve Ra < 0.8µm, use nose radius >= 0.8mm and calculate feed from Ra = fz²/(32×r)×1000. For Ra=0.8: fz = sqrt(0.8×32×0.8/1000) = 0.143mm max.",
    material: undefined,
    operation: "finishing",
    tags: ["surface_finish", "Ra", "nose_radius", "feed", "formula"],
    parameters: {},
    constraints: [
      { parameter: "feed_per_tooth_mm", max: 0.15, reason: "Required for Ra < 0.8µm with r=0.8mm" },
    ],
    confidence: 0.95,
    source: "machining_theory",
  },
  {
    type: "lesson_learned",
    title: "Tool presetter calibration: weekly check required",
    description: "Tool presetter accuracy drifts ~2µm per week. Weekly calibration against certified gauge blocks prevents systematic dimensional errors.",
    material: undefined,
    operation: undefined,
    tags: ["presetter", "calibration", "accuracy", "dimensional", "weekly"],
    parameters: {},
    constraints: [],
    confidence: 0.8,
    source: "shop_experience",
  },
  {
    type: "parameter_recipe",
    title: "Aluminum 6061 high-speed machining",
    description: "HSM recipe for Al6061 using polished carbide. High speed + light cuts for excellent surface finish and productivity.",
    material: "aluminum_6061",
    operation: "hsm",
    tags: ["aluminum", "6061", "hsm", "high_speed", "polished_carbide"],
    parameters: { cutting_speed_m_min: 500, feed_per_tooth_mm: 0.08, depth_of_cut_mm: 0.5, width_of_cut_mm: 10 },
    constraints: [
      { parameter: "cutting_speed_m_min", min: 400, max: 800, reason: "HSM range for aluminum" },
      { parameter: "depth_of_cut_mm", max: 1.0, reason: "Light cuts for HSM strategy" },
    ],
    confidence: 0.85,
    source: "application_engineering",
  },
  {
    type: "failure_mode",
    title: "Chatter at 70-80% lobe boundary",
    description: "Chatter often occurs when depth of cut reaches 70-80% of stability lobe limit. Keep a 20-30% safety margin from calculated stability limit.",
    material: undefined,
    operation: "milling",
    tags: ["chatter", "stability", "lobe", "vibration", "safety_margin"],
    parameters: {},
    constraints: [],
    confidence: 0.85,
    source: "machining_dynamics",
  },
];

// Initialize seed knowledge
function ensureSeeded(): void {
  if (knowledgeStore.size > 0) return;
  for (const seed of SEED_KNOWLEDGE) {
    const id = `PK${String(nextId++).padStart(4, "0")}`;
    knowledgeStore.set(id, {
      ...seed,
      id,
      created_at: "2026-01-01T00:00:00Z",
      usage_count: 0,
    });
  }
}

// ── Helper Functions ───────────────────────────────────────────────────────

function searchEntries(
  material?: string,
  operation?: string,
  keywords?: string[],
  type?: string,
  limit?: number,
): KnowledgeEntry[] {
  ensureSeeded();
  let results = [...knowledgeStore.values()];

  if (material) {
    results = results.filter(e => !e.material || e.material === material);
  }

  if (operation) {
    results = results.filter(e => !e.operation || e.operation === operation ||
      e.tags.some(t => t.includes(operation)));
  }

  if (type) {
    results = results.filter(e => e.type === type);
  }

  if (keywords && keywords.length > 0) {
    results = results.filter(e => {
      const text = `${e.title} ${e.description} ${e.tags.join(" ")}`.toLowerCase();
      return keywords.some(kw => text.includes(kw.toLowerCase()));
    });
  }

  // Sort by confidence × relevance
  results.sort((a, b) => {
    const aScore = a.confidence * (a.material === material ? 1.5 : 1) * (a.usage_count + 1);
    const bScore = b.confidence * (b.material === material ? 1.5 : 1) * (b.usage_count + 1);
    return bScore - aScore;
  });

  return results.slice(0, limit ?? 10);
}

function validateAgainstKnowledge(
  material: string,
  params: Record<string, number>,
): { violations: { entry_id: string; title: string; parameter: string; value: number; constraint: string; severity: "error" | "warning" }[]; recommendations: string[] } {
  ensureSeeded();
  const violations: { entry_id: string; title: string; parameter: string; value: number; constraint: string; severity: "error" | "warning" }[] = [];
  const recommendations: string[] = [];

  const relevant = searchEntries(material, undefined, undefined, undefined, 20);

  for (const entry of relevant) {
    if (!entry.constraints) continue;
    for (const c of entry.constraints) {
      const value = params[c.parameter];
      if (value === undefined) continue;

      if (c.min !== undefined && value < c.min) {
        violations.push({
          entry_id: entry.id,
          title: entry.title,
          parameter: c.parameter,
          value,
          constraint: `Minimum ${c.min} — ${c.reason}`,
          severity: entry.type === "failure_mode" ? "error" : "warning",
        });
      }

      if (c.max !== undefined && value > c.max) {
        violations.push({
          entry_id: entry.id,
          title: entry.title,
          parameter: c.parameter,
          value,
          constraint: `Maximum ${c.max} — ${c.reason}`,
          severity: entry.type === "failure_mode" ? "error" : "warning",
        });
      }
    }

    // Add recommendations from relevant entries
    if (entry.type === "best_practice" || entry.type === "tip") {
      entry.usage_count++;
      recommendations.push(`[${entry.id}] ${entry.title}: ${entry.description.slice(0, 100)}...`);
    }
  }

  return { violations, recommendations: recommendations.slice(0, 5) };
}

// ── Action Handlers ────────────────────────────────────────────────────────

function pkCapture(params: Record<string, unknown>): unknown {
  ensureSeeded();

  const entry: KnowledgeEntry = {
    id: `PK${String(nextId++).padStart(4, "0")}`,
    type: (params.type as KnowledgeEntry["type"]) ?? "lesson_learned",
    title: String(params.title ?? "Untitled knowledge entry"),
    description: String(params.description ?? ""),
    material: params.material ? String(params.material) : undefined,
    operation: params.operation ? String(params.operation) : undefined,
    tags: (params.tags as string[]) ?? [],
    parameters: (params.parameters as Record<string, number>) ?? {},
    constraints: (params.constraints as KnowledgeEntry["constraints"]) ?? [],
    confidence: Number(params.confidence ?? 0.7),
    source: String(params.source ?? "user_input"),
    created_at: new Date().toISOString(),
    usage_count: 0,
  };

  knowledgeStore.set(entry.id, entry);

  return {
    id: entry.id,
    status: "captured",
    type: entry.type,
    title: entry.title,
    material: entry.material,
    operation: entry.operation,
    tags: entry.tags,
    total_entries: knowledgeStore.size,
  };
}

function pkRetrieve(params: Record<string, unknown>): unknown {
  ensureSeeded();

  const id = params.id ? String(params.id) : undefined;
  const tag = params.tag ? String(params.tag) : undefined;

  if (id) {
    const entry = knowledgeStore.get(id);
    if (!entry) return { error: `Entry ${id} not found`, total_entries: knowledgeStore.size };
    entry.usage_count++;
    return { entry, total_entries: knowledgeStore.size };
  }

  if (tag) {
    const results = [...knowledgeStore.values()].filter(e =>
      e.tags.some(t => t.includes(tag.toLowerCase()))
    );
    for (const r of results) r.usage_count++;
    return {
      tag,
      results: results.slice(0, 10),
      total_matches: results.length,
      total_entries: knowledgeStore.size,
    };
  }

  // Return all entries summary
  const entries = [...knowledgeStore.values()];
  return {
    total_entries: entries.length,
    by_type: {
      lesson_learned: entries.filter(e => e.type === "lesson_learned").length,
      best_practice: entries.filter(e => e.type === "best_practice").length,
      parameter_recipe: entries.filter(e => e.type === "parameter_recipe").length,
      failure_mode: entries.filter(e => e.type === "failure_mode").length,
      tip: entries.filter(e => e.type === "tip").length,
    },
    by_material: Object.fromEntries(
      [...new Set(entries.map(e => e.material).filter(Boolean))].map(m => [
        m, entries.filter(e => e.material === m).length,
      ])
    ),
    recent: entries.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5).map(e => ({
      id: e.id, title: e.title, type: e.type,
    })),
  };
}

function pkSearch(params: Record<string, unknown>): unknown {
  ensureSeeded();

  const material = params.material ? String(params.material) : undefined;
  const operation = params.operation ? String(params.operation) : undefined;
  const keywords = params.keywords ? (params.keywords as string[]) : params.query ? String(params.query).split(/\s+/) : undefined;
  const type = params.type ? String(params.type) : undefined;
  const limit = Number(params.limit ?? 10);

  const results = searchEntries(material, operation, keywords, type, limit);
  for (const r of results) r.usage_count++;

  return {
    query: { material, operation, keywords, type },
    total_matches: results.length,
    results: results.map(e => ({
      id: e.id,
      type: e.type,
      title: e.title,
      description: e.description.slice(0, 200),
      material: e.material,
      operation: e.operation,
      confidence: e.confidence,
      tags: e.tags,
      has_parameters: Object.keys(e.parameters ?? {}).length > 0,
      has_constraints: (e.constraints ?? []).length > 0,
    })),
  };
}

function pkValidate(params: Record<string, unknown>): unknown {
  ensureSeeded();

  const material = String(params.material ?? "steel_1045");
  const processParams: Record<string, number> = {};

  // Extract numeric parameters
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "number" && k !== "limit") processParams[k] = v;
  }

  const { violations, recommendations } = validateAgainstKnowledge(material, processParams);

  return {
    material,
    parameters_checked: Object.keys(processParams).length,
    total_violations: violations.length,
    errors: violations.filter(v => v.severity === "error").length,
    warnings: violations.filter(v => v.severity === "warning").length,
    violations,
    recommendations,
    knowledge_base_size: knowledgeStore.size,
    verdict: violations.filter(v => v.severity === "error").length > 0
      ? "FAIL — knowledge base violations detected"
      : violations.length > 0
        ? "CAUTION — warnings from knowledge base"
        : "PASS — parameters consistent with knowledge base",
  };
}

// ── Entry Point ────────────────────────────────────────────────────────────

export function executeProcessKnowledgeAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "pk_capture":  return pkCapture(params);
    case "pk_retrieve": return pkRetrieve(params);
    case "pk_search":   return pkSearch(params);
    case "pk_validate": return pkValidate(params);
    default:
      throw new Error(`ProcessKnowledgeEngine: unknown action "${action}"`);
  }
}
