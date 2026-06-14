/**
 * Shop Practice Dispatcher — CC-MS6 Integration
 *
 * MCP tool bridging the Python CC-MS6 Machining Practice Knowledge Base
 * (practice_aggregate, trouble_tree, material_tips) to PRISM dispatchers.
 *
 * Actions:
 *   Practice KB:
 *     - practice_ingest:    Ingest SHOP extraction results into practice DB
 *     - practice_search:    Search practices by query/category/material
 *     - practice_get:       Get a practice by ID
 *     - practice_list:      List practices with category breakdown
 *     - practice_audit:     Run safety audit on all practices
 *     - practice_recommend: Recommend practices for operation/material/machine
 *   Trouble Trees:
 *     - tree_build:         Build a troubleshooting decision tree
 *     - tree_navigate:      Walk a tree following child indices
 *     - tree_search:        Search trouble trees by symptom
 *   Material Tips:
 *     - tips_add:           Add a material tip with source provenance
 *     - tips_get:           Get ranked tips for a material
 *     - tips_conflicts:     Detect contradictory tips for a material
 *   Machining Playbook:
 *     - playbook_advise:    Get applicable rules for a machining scenario
 *     - playbook_sequence:  Get operation sequencing advice for features
 *     - playbook_setup:     Get setup strategy advice
 *     - playbook_antipatterns: Look up anti-patterns for conditions
 *     - playbook_lookup:    Get all rules by category
 *     - playbook_add_rule:  Add a new rule (from video learning)
 *   Tribal Knowledge (3,700+ tips from experienced machinists):
 *     - tribal_search:      Search tips by keyword, material, operation, category
 *     - tribal_add:         Capture a new tribal knowledge tip (persists immediately)
 *     - tribal_get:         Get a specific tip by ID
 *     - tribal_list:        List tips with pagination and optional category filter
 *     - tribal_categories:  List all categories with counts and coverage gaps
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { validateActionParams, dispatcherError } from "../../utils/dispatcherMiddleware.js";
import { ACTION_SHOP_PRACTICE_SCHEMAS } from "../../schemas/shopPracticeActionSchemas.js";
import { hookExecutor, type HookContext } from "../../engines/HookExecutor.js";
import {
  machiningPlaybookEngine,
  type ConflictParameter,
  type DirectiveDirection,
  type PlaybookConflict,
  type RuleCategory,
} from "../../engines/MachiningPlaybookEngine.js";

// Compile-time exhaustiveness — if a new ConflictParameter variant is added to
// MachiningPlaybookEngine.ts, the Record requires a key for it here, forcing
// CONFLICT_PARAMETER_VALUES to stay in sync (Reviewer B P1-3, iter9 close-out).
const CONFLICT_PARAMETER_EXHAUSTIVE: Record<ConflictParameter, true> = {
  feedrate: true,
  spindle_speed: true,
  depth_of_cut: true,
  width_of_cut: true,
  coolant: true,
};
const CONFLICT_PARAMETER_VALUES: ReadonlySet<ConflictParameter> = new Set<ConflictParameter>(
  Object.keys(CONFLICT_PARAMETER_EXHAUSTIVE) as ConflictParameter[],
);

const DIRECTIVE_DIRECTION_EXHAUSTIVE: Record<DirectiveDirection, true> = {
  increase: true,
  decrease: true,
};
const DIRECTIVE_DIRECTION_VALUES: ReadonlySet<DirectiveDirection> = new Set<DirectiveDirection>(
  Object.keys(DIRECTIVE_DIRECTION_EXHAUSTIVE) as DirectiveDirection[],
);

// Input-length caps protect against operator-supplied payload blowup
// (Reviewer B P1-1, iter9 close-out). Rule ids in the corpus are short
// (e.g., "SEQ-001"); sharedContext is a free-form description.
const RULE_ID_MAX_LEN = 256;
const SHARED_CONTEXT_MAX_LEN = 4096;

function asConflictParameter(v: unknown): ConflictParameter | null {
  return typeof v === "string" && CONFLICT_PARAMETER_VALUES.has(v as ConflictParameter)
    ? (v as ConflictParameter)
    : null;
}

function asDirectiveDirection(v: unknown, fallback: DirectiveDirection): DirectiveDirection {
  return typeof v === "string" && DIRECTIVE_DIRECTION_VALUES.has(v as DirectiveDirection)
    ? (v as DirectiveDirection)
    : fallback;
}

function asBoundedString(v: unknown, maxLen: number): string | null {
  if (typeof v !== "string") return null;
  if (v.length === 0 || v.length > maxLen) return null;
  return v;
}
import { PATHS } from "../../constants.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as path from "node:path";

const execFileAsync = promisify(execFile);
// __filename and import.meta.dirname are CommonJS globals

const ACTIONS = [
  "practice_ingest",
  "practice_search",
  "practice_get",
  "practice_list",
  "practice_audit",
  "practice_recommend",
  "tree_build",
  "tree_navigate",
  "tree_search",
  "tips_add",
  "tips_get",
  "tips_conflicts",
  "playbook_advise",
  "playbook_sequence",
  "playbook_setup",
  "playbook_antipatterns",
  "playbook_lookup",
  "playbook_add_rule",
  "tribal_search",
  "tribal_add",
  "tribal_get",
  "tribal_list",
  "tribal_categories",
  "tribal_enrich",
  "tribal_enrich_check",
  "tribal_enrich_tips_only",
  "tribal_enrich_playbook_only",
  "tribal_enrich_controller_only",
  "playbook_rules_query",
  "playbook_rules_search",
  "playbook_rules_safety",
  "playbook_rules_stats",
  "lathe_lora_tribal_augment",
  "lathe_lora_tribal_find_tips",
  "lathe_lora_tribal_aug_stats",
  "lathe_lora_tribal_extract",
  "lathe_lora_tribal_extract_batch",
  "lathe_lora_tribal_extractor_stats",
  "tribal_apply",
  "tribal_apply_stats",
  "playbook_explain",
  "playbook_coverage",
  "playbook_quantitative",
  "playbook_audit",
  "playbook_conflicts",
  "playbook_conflicts_ranked",
  "playbook_suggest_resolutions",
  "playbook_suggest_resolution",
  "playbook_related_graph",
  "playbook_validate_corpus",
  // Mill-studio AI-reachable training index (MILL-PDF-CORPUS-MS0, 2026-05-26)
  "mill_training_for_operation",
  "mill_training_search",
  "mill_training_summary",
] as const;

// Python & cad-engine paths — uses centralized PATHS.PYTHON
const PYTHON_PATH = PATHS.PYTHON;
const CAD_ENGINE_DIR = path.resolve(
  process.env.PRISM_CAD_ENGINE_DIR || path.join(import.meta.dirname, "../../../../cad-engine")
);

// ---------------------------------------------------------------------------
// Python execution helper
// ---------------------------------------------------------------------------

async function runPython(script: string, timeoutMs = 30000): Promise<any> {
  const wrappedScript = `
import sys, json, os
sys.path.insert(0, ${JSON.stringify(CAD_ENGINE_DIR)})
os.chdir(${JSON.stringify(CAD_ENGINE_DIR)})
${script}
`;
  const { stdout, stderr } = await execFileAsync(
    PYTHON_PATH,
    ["-c", wrappedScript],
    { timeout: timeoutMs, maxBuffer: 5 * 1024 * 1024 }
  );

  if (stderr && !stdout.trim()) {
    throw new Error(stderr.substring(0, 500));
  }

  return JSON.parse(stdout.trim());
}

// ---------------------------------------------------------------------------
// Practice KB actions
// ---------------------------------------------------------------------------

async function handlePracticeIngest(params: Record<string, any>): Promise<any> {
  const practices = params.practices;
  if (!practices || !Array.isArray(practices)) {
    return { error: "practices (array) is required" };
  }

  const videoId = params.video_id || "unknown";
  const channel = params.channel || "";
  const subscribers = params.channel_subscribers || 0;
  const views = params.views || 0;
  const likes = params.likes || 0;
  const confidence = params.confidence || 0.5;

  return runPython(`
from src.practice_aggregate import PracticeAggregator, PracticeSource

agg = PracticeAggregator()
agg.load()

source = PracticeSource(
    video_id=${JSON.stringify(videoId)},
    channel=${JSON.stringify(channel)},
    channel_subscribers=${subscribers},
    views=${views},
    likes=${likes},
    confidence=${confidence},
)

practices = ${JSON.stringify(practices)}
added = []
for p in practices:
    category_map = {
        "setup_procedure": "setup_workholding",
        "workholding_technique": "setup_workholding",
        "cutting_practice": "cutting_practices",
        "tool_management": "tool_management",
        "troubleshooting": "troubleshooting",
        "material_handling": "material_tips",
        "machine_operation": "machine_tips",
        "safety_procedure": "setup_workholding",
        "quality_control": "tool_management",
        "maintenance": "machine_tips",
        "optimization_tip": "cutting_practices",
        "measurement_technique": "setup_workholding",
    }
    ptype = p.get("practice_type", "other")
    category = category_map.get(ptype, "machine_tips")

    rec = agg.add_practice(
        title=p.get("title", "Untitled"),
        category=category,
        practice_type=ptype,
        description=p.get("description", ""),
        steps=p.get("steps", []),
        warnings=p.get("warnings", []),
        tips=p.get("tips", []),
        applicable_materials=p.get("applicable_materials", []),
        applicable_machines=p.get("applicable_machines", []),
        source=source,
        tags=p.get("tags", []),
    )
    added.append({"practice_id": rec.practice_id, "title": rec.title, "category": rec.category})

# Run safety audit on new practices
findings = agg.safety_audit()
criticals = [{"practice_id": f.practice_id, "message": f.message} for f in findings if f.severity == "critical"]
if criticals:
    agg.remove_unsafe(findings)

agg.save()

print(json.dumps({
    "ingested": len(added),
    "practices": added,
    "safety_criticals_removed": len(criticals),
    "critical_details": criticals,
    "total_practices": len(agg.get_all()),
    "category_counts": agg.category_counts(),
}))
`);
}

async function handlePracticeSearch(params: Record<string, any>): Promise<any> {
  const query = params.query || "";
  const category = params.category || "";
  const material = params.material || "";

  if (!query && !category && !material) {
    return { error: "At least one of query, category, or material is required" };
  }

  return runPython(`
from src.practice_aggregate import PracticeAggregator

agg = PracticeAggregator()
agg.load()

results = []
query = ${JSON.stringify(query)}
category = ${JSON.stringify(category)}
material = ${JSON.stringify(material)}

if query:
    results = agg.search(query)
elif category:
    results = agg.get_by_category(category)
else:
    results = agg.get_all()

if material:
    results = [r for r in results if material in r.applicable_materials or not r.applicable_materials]

output = []
for r in results[:20]:
    output.append({
        "practice_id": r.practice_id,
        "title": r.title,
        "category": r.category,
        "practice_type": r.practice_type,
        "description": r.description[:200],
        "consensus_confidence": r.consensus_confidence,
        "source_count": r.source_count,
        "warnings": r.warnings,
        "safety_reviewed": r.safety_reviewed,
    })

print(json.dumps({"count": len(output), "practices": output}))
`);
}

async function handlePracticeGet(params: Record<string, any>): Promise<any> {
  const practiceId = params.practice_id;
  if (!practiceId) {
    return { error: "practice_id is required" };
  }

  return runPython(`
from src.practice_aggregate import PracticeAggregator

agg = PracticeAggregator()
agg.load()

rec = agg.get(${JSON.stringify(practiceId)})
if rec is None:
    print(json.dumps({"error": "Practice not found: ${practiceId}"}))
else:
    print(json.dumps(rec.to_dict()))
`);
}

async function handlePracticeList(_params: Record<string, any>): Promise<any> {
  return runPython(`
from src.practice_aggregate import PracticeAggregator

agg = PracticeAggregator()
agg.load()

counts = agg.category_counts()
confidence = agg.aggregate_confidence()
total = len(agg.get_all())
reviewed = sum(1 for p in agg.get_all() if p.safety_reviewed)

print(json.dumps({
    "total_practices": total,
    "safety_reviewed": reviewed,
    "category_counts": counts,
    "category_confidence": confidence,
}))
`);
}

async function handlePracticeAudit(_params: Record<string, any>): Promise<any> {
  return runPython(`
from src.practice_aggregate import PracticeAggregator

agg = PracticeAggregator()
agg.load()

findings = agg.safety_audit()
result = {
    "total_findings": len(findings),
    "critical": [],
    "warning": [],
    "info": [],
}

for f in findings:
    entry = {"practice_id": f.practice_id, "message": f.message, "rule": f.rule}
    if f.severity == "critical":
        result["critical"].append(entry)
    elif f.severity == "warning":
        result["warning"].append(entry)
    else:
        result["info"].append(entry)

result["summary"] = {
    "criticals": len(result["critical"]),
    "warnings": len(result["warning"]),
    "info": len(result["info"]),
    "safe": len(result["critical"]) == 0,
}

print(json.dumps(result))
`);
}

async function handlePracticeRecommend(params: Record<string, any>): Promise<any> {
  const operation = params.operation || "";
  const material = params.material || "";
  const machine = params.machine || "";

  if (!operation && !material) {
    return { error: "At least operation or material is required" };
  }

  return runPython(`
from src.practice_aggregate import PracticeAggregator

agg = PracticeAggregator()
agg.load()

operation = ${JSON.stringify(operation)}
material = ${JSON.stringify(material)}
machine = ${JSON.stringify(machine)}

all_practices = agg.get_all()
scored = []

for p in all_practices:
    score = 0.0
    reasons = []

    # Match by operation/practice_type
    if operation and operation.lower() in p.practice_type.lower():
        score += 0.4
        reasons.append(f"practice_type matches '{operation}'")

    # Match by material
    if material:
        if material.lower() in [m.lower() for m in p.applicable_materials]:
            score += 0.3
            reasons.append(f"material '{material}' applicable")
        # Also check description/steps
        searchable = f"{p.description} {' '.join(p.steps)}".lower()
        if material.lower() in searchable:
            score += 0.1
            reasons.append(f"material mentioned in content")

    # Match by machine
    if machine:
        if machine.lower() in [m.lower() for m in p.applicable_machines]:
            score += 0.2
            reasons.append(f"machine '{machine}' applicable")

    # Boost by consensus confidence
    score *= (0.5 + 0.5 * p.consensus_confidence)

    if score > 0:
        scored.append({
            "practice_id": p.practice_id,
            "title": p.title,
            "category": p.category,
            "description": p.description[:200],
            "relevance_score": round(score, 3),
            "reasons": reasons,
            "consensus_confidence": round(p.consensus_confidence, 3),
            "source_count": p.source_count,
            "warnings": p.warnings,
        })

scored.sort(key=lambda x: -x["relevance_score"])

print(json.dumps({"query": {"operation": operation, "material": material, "machine": machine}, "count": len(scored[:10]), "recommendations": scored[:10]}))
`);
}

// ---------------------------------------------------------------------------
// Trouble Tree actions
// ---------------------------------------------------------------------------

async function handleTreeBuild(params: Record<string, any>): Promise<any> {
  const treeId = params.tree_id;
  const title = params.title;
  const symptom = params.symptom;
  const causes = params.causes;

  if (!treeId || !title || !symptom || !causes) {
    return { error: "tree_id, title, symptom, and causes are required" };
  }

  return runPython(`
from src.trouble_tree import TroubleTreeGenerator

gen = TroubleTreeGenerator()
gen.load_all()

tree = gen.build_tree(
    tree_id=${JSON.stringify(treeId)},
    title=${JSON.stringify(title)},
    symptom=${JSON.stringify(symptom)},
    causes=${JSON.stringify(causes)},
    material_context=${JSON.stringify(params.material_context || [])},
    machine_context=${JSON.stringify(params.machine_context || [])},
    tags=${JSON.stringify(params.tags || [])},
)

gen.save_tree(tree)

print(json.dumps({
    "tree_id": tree.tree_id,
    "title": tree.title,
    "symptom": tree.symptom,
    "cause_count": tree.cause_count(),
    "solution_count": tree.solution_count(),
    "depth": tree.root.depth(),
    "message": "Troubleshooting tree built and saved",
}))
`);
}

async function handleTreeNavigate(params: Record<string, any>): Promise<any> {
  const treeId = params.tree_id;
  if (!treeId) {
    return { error: "tree_id is required" };
  }

  const navPath = params.path || [];

  return runPython(`
from src.trouble_tree import TroubleTreeGenerator

gen = TroubleTreeGenerator()
gen.load_all()

node = gen.navigate(${JSON.stringify(treeId)}, ${JSON.stringify(navPath)})
if node is None:
    print(json.dumps({"error": "Node not found at path ${JSON.stringify(navPath)} in tree ${treeId}"}))
else:
    children = [{"index": i, "node_type": c.node_type, "text": c.text, "confidence": c.confidence, "has_children": len(c.children) > 0} for i, c in enumerate(node.children)]
    print(json.dumps({
        "node_id": node.node_id,
        "node_type": node.node_type,
        "text": node.text,
        "confidence": node.confidence,
        "children": children,
        "is_leaf": len(node.children) == 0,
        "path": ${JSON.stringify(navPath)},
    }))
`);
}

async function handleTreeSearch(params: Record<string, any>): Promise<any> {
  const query = params.query;
  if (!query) {
    return { error: "query is required" };
  }

  return runPython(`
from src.trouble_tree import TroubleTreeGenerator

gen = TroubleTreeGenerator()
gen.load_all()

results = gen.search(${JSON.stringify(query)})
trees = []
for t in results:
    trees.append({
        "tree_id": t.tree_id,
        "title": t.title,
        "symptom": t.symptom,
        "cause_count": t.cause_count(),
        "solution_count": t.solution_count(),
        "material_context": t.material_context,
        "tags": t.tags,
    })

all_trees = gen.list_trees()
print(json.dumps({"query": ${JSON.stringify(query)}, "matches": len(trees), "trees": trees, "total_trees": len(all_trees)}))
`);
}

// ---------------------------------------------------------------------------
// Material Tips actions
// ---------------------------------------------------------------------------

async function handleTipsAdd(params: Record<string, any>): Promise<any> {
  const material = params.material;
  const tipText = params.tip_text;
  const category = params.category || "general";

  if (!material || !tipText) {
    return { error: "material and tip_text are required" };
  }

  const detail = params.detail || "";
  const alloySpecific = params.alloy_specific || "";
  const crossRef = params.cross_ref_materials || [];
  const tags = params.tags || [];

  // Source provenance
  const videoId = params.video_id || "manual";
  const channel = params.channel || "";
  const confidence = params.confidence || 0.5;

  return runPython(`
from src.material_tips import MaterialTipsConsolidator, TipSource

cons = MaterialTipsConsolidator()
cons.load_all()

source = TipSource(
    video_id=${JSON.stringify(videoId)},
    channel=${JSON.stringify(channel)},
    confidence=${confidence},
) if ${JSON.stringify(videoId)} != "manual" else None

tip = cons.add_tip(
    material=${JSON.stringify(material)},
    category=${JSON.stringify(category)},
    tip_text=${JSON.stringify(tipText)},
    detail=${JSON.stringify(detail)},
    source=source,
    alloy_specific=${JSON.stringify(alloySpecific)},
    cross_ref_materials=${JSON.stringify(crossRef)},
    tags=${JSON.stringify(tags)},
)

cons.save_all()

print(json.dumps({
    "tip_id": tip.tip_id,
    "material": tip.material,
    "category": tip.category,
    "tip_text": tip.tip_text,
    "consensus_weight": round(tip.consensus_weight, 4),
    "source_count": tip.source_count,
    "message": "Tip added and saved",
}))
`);
}

async function handleTipsGet(params: Record<string, any>): Promise<any> {
  const material = params.material;
  if (!material) {
    return { error: "material is required" };
  }

  const category = params.category || "";

  return runPython(`
from src.material_tips import MaterialTipsConsolidator

cons = MaterialTipsConsolidator()
cons.load_all()

material = ${JSON.stringify(material)}
category = ${JSON.stringify(category)}

if category:
    tips = cons.get_tips_by_category(material, category)
else:
    tips = cons.get_tips(material)

output = []
for t in tips:
    output.append({
        "tip_id": t.tip_id,
        "category": t.category,
        "tip_text": t.tip_text,
        "detail": t.detail,
        "consensus_weight": round(t.consensus_weight, 4),
        "source_count": t.source_count,
        "alloy_specific": t.alloy_specific,
        "cross_ref_materials": t.cross_ref_materials,
        "conflicts": t.conflicts,
    })

all_materials = cons.get_all_materials()
print(json.dumps({"material": material, "count": len(output), "tips": output, "all_materials": all_materials}))
`);
}

async function handleTipsConflicts(params: Record<string, any>): Promise<any> {
  const material = params.material;
  if (!material) {
    return { error: "material is required" };
  }

  return runPython(`
from src.material_tips import MaterialTipsConsolidator

cons = MaterialTipsConsolidator()
cons.load_all()

conflicts = cons.resolve_conflicts(${JSON.stringify(material)})

conflict_details = []
for tip_a_id, tip_b_id in conflicts:
    tips = cons.get_tips(${JSON.stringify(material)})
    tip_a = next((t for t in tips if t.tip_id == tip_a_id), None)
    tip_b = next((t for t in tips if t.tip_id == tip_b_id), None)
    if tip_a and tip_b:
        conflict_details.append({
            "tip_a": {"id": tip_a.tip_id, "text": tip_a.tip_text, "weight": tip_a.consensus_weight},
            "tip_b": {"id": tip_b.tip_id, "text": tip_b.tip_text, "weight": tip_b.consensus_weight},
            "resolution": "Keep higher-weight tip" if tip_a.consensus_weight != tip_b.consensus_weight else "Manual review needed",
        })

cons.save_all()

print(json.dumps({"material": ${JSON.stringify(material)}, "conflict_count": len(conflicts), "conflicts": conflict_details}))
`);
}

// ---------------------------------------------------------------------------
// Machining Playbook actions (TypeScript — no Python needed)
// ---------------------------------------------------------------------------

async function handlePlaybookAdvise(params: Record<string, any>): Promise<any> {
  const result = machiningPlaybookEngine.advise({
    material_iso: params.material_iso,
    features: params.features,
    tolerance_mm: params.tolerance_mm,
    wall_thickness_mm: params.wall_thickness_mm,
    surface_finish_Ra: params.surface_finish_Ra,
    batch_size: params.batch_size,
    machine_axes: params.machine_axes,
    categories: params.categories as RuleCategory[],
    severity_min: params.severity_min,
  });
  return { count: result.rules.length, summary: result.summary, critical_warnings: result.critical_warnings, rules: result.rules };
}

async function handlePlaybookSequence(params: Record<string, any>): Promise<any> {
  if (!params.features || !Array.isArray(params.features)) {
    return { error: "features (array of strings) is required" };
  }
  return machiningPlaybookEngine.sequenceAdvice(params.features, params.material_iso);
}

async function handlePlaybookSetup(params: Record<string, any>): Promise<any> {
  if (!params.features || !Array.isArray(params.features)) {
    return { error: "features (array of strings) is required" };
  }
  return machiningPlaybookEngine.setupAdvice(params.features, params.material_iso, params.tolerance_mm);
}

async function handlePlaybookAntipatterns(params: Record<string, any>): Promise<any> {
  const rules = machiningPlaybookEngine.antiPatterns({
    material_iso: params.material_iso,
    features: params.features,
    wall_thickness_mm: params.wall_thickness_mm,
  });
  return { count: rules.length, anti_patterns: rules };
}

async function handlePlaybookLookup(params: Record<string, any>): Promise<any> {
  if (!params.category) {
    return { error: "category is required", available_categories: ["sequencing", "setup_strategy", "tool_selection", "toolpath_strategy", "anti_pattern", "material_tip", "thin_wall", "hole_making", "finishing", "roughing", "5axis", "workholding", "thermal", "chip_control", "tool_life", "datum", "deburring", "safety"] };
  }
  const rules = machiningPlaybookEngine.byCategory(params.category as RuleCategory);
  return { category: params.category, count: rules.length, rules };
}

async function handlePlaybookAddRule(params: Record<string, any>): Promise<any> {
  try {
    machiningPlaybookEngine.addRule({
      id: params.id,
      category: params.category as RuleCategory,
      severity: params.severity,
      title: params.title,
      rule: params.rule,
      reasoning: params.reasoning,
      conditions: params.conditions || [{ type: "always" }],
      exceptions: params.exceptions || [],
      source: params.source,
      examples: params.examples,
      related_rules: params.related_rules,
    });
    const stats = machiningPlaybookEngine.stats();
    return { success: true, rule_id: params.id, total_rules: stats.total, stats };
  } catch (err: any) {
    return { error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Tribal Knowledge actions (TypeScript — TribalKnowledgeEngine)
// ---------------------------------------------------------------------------

/**
 * Search tribal knowledge tips by keyword, material, operation, or category.
 * Lazy-imports the engine to avoid circular deps and reduce cold-start.
 */
async function handleTribalSearch(params: Record<string, any>): Promise<any> {
  const { tribalKnowledgeEngine } = await import("../../engines/TribalKnowledgeEngine.js");
  const tips = tribalKnowledgeEngine.search({
    query: params.query,
    category: params.category,
    material_iso_group: params.material_iso_group,
    operation_type: params.operation_type,
    min_confidence: params.min_confidence,
    limit: params.limit,
  });
  return {
    count: tips.length,
    tips: tips.map(t => ({
      id: t.id,
      title: t.title,
      body: t.body,
      category: t.category,
      tags: t.tags,
      material_groups: t.material_groups,
      operation_types: t.operation_types,
      confidence: t.confidence,
      source: t.source,
      usage_count: t.usage_count,
    })),
  };
}

/**
 * Capture a new tribal knowledge tip. Persists immediately.
 */
async function handleTribalAdd(params: Record<string, any>): Promise<any> {
  const { tribalKnowledgeEngine } = await import("../../engines/TribalKnowledgeEngine.js");

  if (!params.title || !params.body || !params.category || !params.source) {
    return { error: "title, body, category, and source are required" };
  }

  const tip = tribalKnowledgeEngine.capture({
    title: params.title,
    body: params.body,
    category: params.category,
    tags: params.tags || [],
    source: params.source,
    confidence: params.confidence ?? 70,
    material_groups: params.material_groups,
    operation_types: params.operation_types,
  });

  // capture() returns KnowledgeTip | null — null on a persistence/validation
  // failure inside the engine. Surface that loudly rather than dereferencing null.
  if (!tip) {
    return { error: "Failed to capture tribal tip — capture() returned null (engine rejected the tip or persistence failed)" };
  }

  return {
    success: true,
    tip: {
      id: tip.id,
      title: tip.title,
      category: tip.category,
      created_at: tip.created_at,
    },
    message: `Tip '${tip.title}' captured with ID ${tip.id}`,
  };
}

/**
 * Get a specific tribal knowledge tip by ID.
 */
async function handleTribalGet(params: Record<string, any>): Promise<any> {
  const { tribalKnowledgeEngine } = await import("../../engines/TribalKnowledgeEngine.js");

  if (!params.tip_id) {
    return { error: "tip_id is required" };
  }

  // Search all tips with no filter, then find by ID
  const allTips = tribalKnowledgeEngine.search({ limit: 100000 });
  const tip = allTips.find(t => t.id === params.tip_id);

  if (!tip) {
    return { error: `Tip not found: ${params.tip_id}` };
  }

  return {
    id: tip.id,
    title: tip.title,
    body: tip.body,
    category: tip.category,
    tags: tip.tags,
    material_groups: tip.material_groups,
    operation_types: tip.operation_types,
    confidence: tip.confidence,
    source: tip.source,
    created_at: tip.created_at,
    usage_count: tip.usage_count,
  };
}

/**
 * List tribal knowledge tips with optional category filter and pagination.
 */
async function handleTribalList(params: Record<string, any>): Promise<any> {
  const { tribalKnowledgeEngine } = await import("../../engines/TribalKnowledgeEngine.js");

  const offset = params.offset || 0;
  const limit = params.limit || 20;

  // Get all tips matching category (or all if no category)
  const allTips = tribalKnowledgeEngine.search({
    category: params.category,
    limit: 100000,
  });

  const page = allTips.slice(offset, offset + limit);
  const stats = tribalKnowledgeEngine.stats();

  return {
    total: allTips.length,
    offset,
    limit,
    count: page.length,
    has_more: offset + limit < allTips.length,
    tips: page.map(t => ({
      id: t.id,
      title: t.title,
      category: t.category,
      confidence: t.confidence,
      tags: t.tags,
      usage_count: t.usage_count,
    })),
    stats_summary: {
      total_tips: stats.total_tips,
      categories: Object.keys(stats.by_category).length,
      high_confidence: stats.by_confidence.high,
    },
  };
}

/**
 * List all knowledge categories with tip counts and coverage gaps.
 */
async function handleTribalCategories(_params: Record<string, any>): Promise<any> {
  const { tribalKnowledgeEngine, CORE_CATEGORIES } = await import("../../engines/TribalKnowledgeEngine.js");
  const stats = tribalKnowledgeEngine.stats();

  return {
    total_tips: stats.total_tips,
    categories: Object.entries(stats.by_category)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({
        name,
        count,
        is_core: (CORE_CATEGORIES as readonly string[]).includes(name),
      })),
    core_categories: [...CORE_CATEGORIES],
    coverage_gaps: stats.coverage_gaps,
    confidence_breakdown: stats.by_confidence,
    most_used: stats.most_used,
  };
}

// ---------------------------------------------------------------------------
// Tribal Enrichment Coordinator actions (TribalEnrichmentCoordinatorEngine)
// ---------------------------------------------------------------------------
// Unified coordinator: fetches tribal tips + playbook rules + controller tips
// in one call for any P2P process pipeline. The engine's EnrichmentInput is
// already snake_case, so params map straight through with no camel remap — we
// still build the object field-by-field to keep the dispatcher↔engine contract
// explicit (a renamed engine field surfaces as a tsc error, not a silent drop).

/** Build the engine's EnrichmentInput from validated dispatcher params. */
function buildEnrichmentInput(params: Record<string, any>) {
  return {
    process_type: params.process_type,
    material: params.material,
    controller: params.controller,
    thickness_mm: params.thickness_mm,
    tolerance_mm: params.tolerance_mm,
    surface_finish_Ra_um: params.surface_finish_Ra_um,
    is_thin_wall: params.is_thin_wall,
    hardness_hrc: params.hardness_hrc,
  };
}

/**
 * Full unified enrichment — tribal tips + playbook rules + controller tips +
 * a human-readable merged advisory + the knowledge-source provenance list.
 */
async function handleTribalEnrich(params: Record<string, any>): Promise<any> {
  const { tribalEnrichmentCoordinatorEngine } = await import("../../engines/TribalEnrichmentCoordinatorEngine.js");
  return tribalEnrichmentCoordinatorEngine.enrich(buildEnrichmentInput(params));
}

/**
 * Quick boolean check — does ANY knowledge (tribal/playbook/controller) exist
 * for this configuration? Wrapped in a typed object (never a raw primitive).
 */
async function handleTribalEnrichCheck(params: Record<string, any>): Promise<any> {
  const { tribalEnrichmentCoordinatorEngine } = await import("../../engines/TribalEnrichmentCoordinatorEngine.js");
  const hasKnowledge = await tribalEnrichmentCoordinatorEngine.hasKnowledge(buildEnrichmentInput(params));
  return { has_knowledge: hasKnowledge, process_type: params.process_type };
}

/** Just the tribal-knowledge tips for this configuration (no playbook/controller). */
async function handleTribalEnrichTipsOnly(params: Record<string, any>): Promise<any> {
  const { tribalEnrichmentCoordinatorEngine } = await import("../../engines/TribalEnrichmentCoordinatorEngine.js");
  const tips = await tribalEnrichmentCoordinatorEngine.getTribalOnly(buildEnrichmentInput(params));
  return { count: tips.length, tips };
}

/** Just the playbook rules for this configuration (no tribal/controller). */
async function handleTribalEnrichPlaybookOnly(params: Record<string, any>): Promise<any> {
  const { tribalEnrichmentCoordinatorEngine } = await import("../../engines/TribalEnrichmentCoordinatorEngine.js");
  const rules = await tribalEnrichmentCoordinatorEngine.getPlaybookOnly(buildEnrichmentInput(params));
  return { count: rules.length, rules };
}

/** Just the controller-specific programming tips for the given controller family. */
async function handleTribalEnrichControllerOnly(params: Record<string, any>): Promise<any> {
  const { tribalEnrichmentCoordinatorEngine } = await import("../../engines/TribalEnrichmentCoordinatorEngine.js");
  const tips = await tribalEnrichmentCoordinatorEngine.getControllerOnly(params.controller);
  return { count: tips.length, controller: params.controller, controller_tips: tips };
}

// ---------------------------------------------------------------------------
// PlaybookRulesEngine — U-BRIDGE-WIRE-TRIBAL (133KB domain-rule corpus)
// ---------------------------------------------------------------------------

/** Query the domain-classified machining rule corpus with optional filters. */
async function handlePlaybookRulesQuery(params: Record<string, any>): Promise<any> {
  const { playbookRulesEngine } = await import("../../engines/PlaybookRulesEngine.js");
  const rules = playbookRulesEngine.getRules({
    domain: params.domain,
    categories: params.categories,
    severity_min: params.severity_min,
  } as Parameters<typeof playbookRulesEngine.getRules>[0]);
  return { count: rules.length, rules };
}

/** Free-text keyword search across all machining playbook rules. */
async function handlePlaybookRulesSearch(params: Record<string, any>): Promise<any> {
  const { playbookRulesEngine } = await import("../../engines/PlaybookRulesEngine.js");
  const rules = playbookRulesEngine.searchRules(params.keyword);
  return { keyword: params.keyword, count: rules.length, rules };
}

/** Critical safety + anti-pattern rules — the highest-priority rule subset. */
async function handlePlaybookRulesSafety(_params: Record<string, any>): Promise<any> {
  const { playbookRulesEngine } = await import("../../engines/PlaybookRulesEngine.js");
  const rules = playbookRulesEngine.getSafetyRules();
  return { count: rules.length, safety_rules: rules };
}

/** Rule-corpus statistics + per-domain coverage report. */
async function handlePlaybookRulesStats(_params: Record<string, any>): Promise<any> {
  const { playbookRulesEngine } = await import("../../engines/PlaybookRulesEngine.js");
  return { stats: playbookRulesEngine.getStats(), coverage: playbookRulesEngine.getCoverage() };
}

// ---------------------------------------------------------------------------
// LatheLoRATribalAugmentationEngine — U-BRIDGE-WIRE-TRIBAL
// ---------------------------------------------------------------------------

/** Augment LatheLoRA output with JM-Die / Okuma tribal tips + anti-pattern warnings. */
async function handleLatheLoRATribalAugment(params: Record<string, any>): Promise<any> {
  const { latheLoRATribalAugmentationEngine } = await import("../../engines/LatheLoRATribalAugmentationEngine.js");
  return latheLoRATribalAugmentationEngine.augment(params.response, params.query);
}

/** Find tribal tips relevant to a response without rewriting it. */
async function handleLatheLoRATribalFindTips(params: Record<string, any>): Promise<any> {
  const { latheLoRATribalAugmentationEngine } = await import("../../engines/LatheLoRATribalAugmentationEngine.js");
  const matches = latheLoRATribalAugmentationEngine.findRelevantTips(params.response, params.query);
  return { count: matches.length, matches };
}

/** Tribal augmentation engine statistics (tip/rule counts by source/severity). */
async function handleLatheLoRATribalAugStats(_params: Record<string, any>): Promise<any> {
  const { latheLoRATribalAugmentationEngine } = await import("../../engines/LatheLoRATribalAugmentationEngine.js");
  return { stats: latheLoRATribalAugmentationEngine.getStats() };
}

// ---------------------------------------------------------------------------
// LatheLoRATribalExtractorEngine — U-BRIDGE-WIRE-TRIBAL
// ---------------------------------------------------------------------------

/** Extract one structured tribal tip from operator free-text. */
async function handleLatheLoRATribalExtract(params: Record<string, any>): Promise<any> {
  const { latheLoRATribalExtractorEngine } = await import("../../engines/LatheLoRATribalExtractorEngine.js");
  const tip = latheLoRATribalExtractorEngine.extractTip(params.text, {
    author: params.author,
    source: params.source,
  });
  return { extracted: tip !== null, tip };
}

/** Batch-extract tribal tips from multiple operator texts. */
async function handleLatheLoRATribalExtractBatch(params: Record<string, any>): Promise<any> {
  const { latheLoRATribalExtractorEngine } = await import("../../engines/LatheLoRATribalExtractorEngine.js");
  const tips = latheLoRATribalExtractorEngine.extractBatch(params.texts);
  return { input_count: params.texts.length, extracted_count: tips.length, tips };
}

/** Tribal extractor statistics + human-readable summary. */
async function handleLatheLoRATribalExtractorStats(_params: Record<string, any>): Promise<any> {
  const { latheLoRATribalExtractorEngine } = await import("../../engines/LatheLoRATribalExtractorEngine.js");
  return { stats: latheLoRATribalExtractorEngine.getStats(), summary: latheLoRATribalExtractorEngine.getSummary() };
}

// ---------------------------------------------------------------------------
// Tribal Knowledge Applicator actions (TypeScript — TribalKnowledgeApplicatorEngine)
// U-CAMAGI12 (CADCAM-DAGI-MS4) — Wisdom Synthesis: score strategy candidates
// against tribal constraints + MachiningPlaybook rules, rank, emit rationale.
// ---------------------------------------------------------------------------

/**
 * Score a set of strategy candidates against tribal constraints — supplied
 * explicitly and/or derived from a MachiningPlaybook rule category — rank them,
 * and emit a human-readable tribal rationale for the chosen strategy.
 */
async function handleTribalApply(params: Record<string, any>): Promise<any> {
  const { tribalKnowledgeApplicatorEngine } = await import(
    "../../engines/TribalKnowledgeApplicatorEngine.js"
  );

  const candidates = Array.isArray(params.candidates) ? params.candidates : [];
  if (candidates.length === 0) {
    return { error: "candidates is required and must be a non-empty array of strategy candidates" };
  }

  const explicit = Array.isArray(params.constraints) ? params.constraints : [];

  // Optional live composition — fold MachiningPlaybook rules for a category into
  // the constraint set (spec step: "Query MachiningPlaybookEngine for rules").
  let playbookConstraints: any[] = [];
  if (typeof params.playbook_category === "string" && params.playbook_category.length > 0) {
    try {
      const rawRules: any[] = machiningPlaybookEngine.byCategory(
        params.playbook_category as RuleCategory,
      );
      const ruleLikes = (Array.isArray(rawRules) ? rawRules : []).map((r: any) => ({
        id: r?.id,
        severity: r?.severity,
        category: r?.category,
        rule: r?.rule,
        description: r?.description,
        parameter: r?.parameter,
        min: r?.min,
        max: r?.max,
      }));
      playbookConstraints = tribalKnowledgeApplicatorEngine.fromPlaybookRules(ruleLikes);
    } catch {
      playbookConstraints = [];
    }
  }

  const result = tribalKnowledgeApplicatorEngine.apply({
    candidates,
    constraints: [...explicit, ...playbookConstraints],
    context: params.context,
  });

  return {
    success: true,
    chosen: result.chosen,
    ranked: result.ranked,
    naive_pick: result.naivePick,
    tribal_rationale: result.tribalRationale,
    improvement_pct: result.improvementPct,
    constraints_applied: explicit.length + playbookConstraints.length,
  };
}

/** Engine introspection — invocation telemetry + scoring configuration. */
async function handleTribalApplyStats(_params: Record<string, any>): Promise<any> {
  const { tribalKnowledgeApplicatorEngine } = await import(
    "../../engines/TribalKnowledgeApplicatorEngine.js"
  );
  return { success: true, stats: tribalKnowledgeApplicatorEngine.getStats() };
}

// ---------------------------------------------------------------------------
// Playbook capability extensions (MachiningPlaybookEngine, U-PB-EXPAND-CAPABILITIES)
// Surface deep single-rule explanation, per-job coverage analysis, and
// applicable-rules-with-quantitative-formulas filtering on top of the existing
// 296-rule store + advise() ranker.
// ---------------------------------------------------------------------------

/**
 * Deep single-rule explanation: the rule itself plus every related_rules
 * cross-reference resolved to its actual rule (cycle-guarded).
 */
async function handlePlaybookExplain(params: Record<string, any>): Promise<any> {
  if (typeof params.rule_id !== "string" || params.rule_id.length === 0) {
    return { error: "rule_id is required and must be a non-empty string" };
  }
  const explanation = machiningPlaybookEngine.explainRule(params.rule_id);
  if (!explanation) {
    return { error: `Rule '${params.rule_id}' not found in the playbook`, rule_id: params.rule_id };
  }
  return { success: true, explanation };
}

/**
 * Playbook coverage analysis for a job context: per-category / per-severity
 * counts, blind-spot categories with zero applicable rules, and the applicable
 * rule ID list in severity order.
 */
async function handlePlaybookCoverage(params: Record<string, any>): Promise<any> {
  const report = machiningPlaybookEngine.coverageReport(params as Parameters<typeof machiningPlaybookEngine.coverageReport>[0]);
  return { success: true, report };
}

/**
 * Applicable playbook rules carrying a quantitative threshold formula.
 * Filters the broader applicable set down to rules whose numeric guidance
 * is explicitly encoded.
 */
async function handlePlaybookQuantitative(params: Record<string, any>): Promise<any> {
  const guidance = machiningPlaybookEngine.quantitativeGuidance(params as Parameters<typeof machiningPlaybookEngine.quantitativeGuidance>[0]);
  return { success: true, guidance };
}

/**
 * Playbook-corpus integrity audit: scans every rule for cross-reference and
 * completeness defects (dangling / asymmetric / self related-rule links,
 * duplicate ids, empty reasoning, unreachable rules).
 */
async function handlePlaybookAudit(_params: Record<string, any>): Promise<any> {
  return { success: true, report: machiningPlaybookEngine.auditIntegrity() };
}

/**
 * Playbook-corpus semantic conflict scan: finds pairs of rules that give
 * contradictory parameter directives (e.g. one "increase feedrate", the other
 * "reduce feedrate") under overlapping machining conditions. Heuristic review
 * surface — see PlaybookConflictReport.method.
 */
async function handlePlaybookConflicts(_params: Record<string, any>): Promise<any> {
  return { success: true, report: machiningPlaybookEngine.detectConflicts() };
}

/**
 * Severity + evidence-based prioritization of the playbook conflict scan:
 * each conflict gets a priorityScore in [0,1] and a coarse urgent/high/
 * medium/low bucket so an operator can triage. Composes on detectConflicts —
 * no re-scan.
 */
async function handlePlaybookConflictsRanked(_params: Record<string, any>): Promise<any> {
  return { success: true, report: machiningPlaybookEngine.rankConflicts() };
}

/**
 * Batch resolution proposal — closes the detect → rank → RESOLVE workflow.
 * For each conflict in the corpus, names the winning rule based on
 * evidence_level (primary) and severity (tiebreaker), or flags ambiguous
 * when both axes tie. Returns one ResolutionProposal per conflict plus a
 * byDecision bucket count operators use to dashboard evidence-tagging
 * coverage gaps.
 */
async function handlePlaybookSuggestResolutions(_params: Record<string, any>): Promise<any> {
  return { success: true, report: machiningPlaybookEngine.suggestResolutions() };
}

/**
 * Single-pair resolution proposal. Caller supplies a conflict (any shape
 * matching PlaybookConflict / RankedConflict — ruleIdA, ruleIdB, parameter
 * are the only fields read); returns the winner, confidence, decision axis,
 * and an honest rationale (R12 fail-loud surfaces stale-id input via the
 * `warning` field instead of masking it as "human judgment required").
 */
/**
 * Multi-hop BFS over PlaybookRule.related_rules — extends explainRule()
 * (1-hop) to arbitrary depth. Surfaces unresolved-ref ids (R12 fail-loud
 * on stale corpus refs) and cycle-edges (back-edges to already-visited
 * nodes) explicitly. Returns {success:false, error} on missing root rule.
 * maxDepth defaults to 2; bounded [0, 10] at the schema layer.
 */
async function handlePlaybookRelatedGraph(params: Record<string, any>): Promise<any> {
  const ruleId = asBoundedString(params?.ruleId, RULE_ID_MAX_LEN);
  if (!ruleId) {
    return {
      success: false,
      error: `playbook_related_graph requires ruleId (non-empty string ≤${RULE_ID_MAX_LEN} chars).`,
    };
  }
  // maxDepth is bounded [0, 10] at the schema; safe-coerce here as a defense-
  // in-depth + default to 2 (root → neighbor → neighbor-of-neighbor).
  const maxDepthRaw = params?.maxDepth;
  const maxDepth =
    typeof maxDepthRaw === "number" && Number.isFinite(maxDepthRaw) && maxDepthRaw >= 0
      ? Math.min(Math.floor(maxDepthRaw), 10)
      : 2;
  const report = machiningPlaybookEngine.relatedGraph(ruleId, maxDepth);
  if (report === null) {
    return {
      success: false,
      error: `playbook_related_graph: rule "${ruleId}" not found in corpus.`,
    };
  }
  return { success: true, report };
}

/**
 * Corpus-wide health audit. Pure read-only — no rule mutations. Surfaces
 * duplicateIds / orphans / unresolvedRefs / cycles / schemaIssues + a
 * normalized healthScore for at-a-glance triage. Operators should drill
 * into individual findings via playbook_related_graph(ruleId) before acting.
 *
 * No inputs. Always returns {success:true, report:CorpusValidationReport}
 * — an empty corpus returns totalRules:0 + empty arrays + healthScore:1.
 */
async function handlePlaybookValidateCorpus(_params: Record<string, any>): Promise<any> {
  const report = machiningPlaybookEngine.validateCorpus();
  return { success: true, report };
}

// ─────────────────────────────────────────────────────────────────────
// Mill-studio AI-reachable training index (MILL-PDF-CORPUS-MS0, 2026-05-26)
// Exposes the source-attributed milling tribal-tip corpus to AI agents
// (Claude, Ollama, training pipelines) via MCP. Three actions:
//   mill_training_for_operation  — operation-keyed retrieval for wizard
//   mill_training_search         — BM25-lite text search (RAG baseline)
//   mill_training_summary        — index introspection (counts by vendor,
//                                  confidence, kind, operation)
// All return `{success, ...}` per dispatcher convention. Empty/invalid
// inputs fail soft with empty results, not exceptions.
// ─────────────────────────────────────────────────────────────────────

async function handleMillTrainingForOperation(params: Record<string, any>): Promise<any> {
  const { nodesForOperation } = await import("../../data/tribal-tips/milling-training-index.js");
  const operation = typeof params?.operation === "string" ? params.operation : "";
  const nodes = nodesForOperation(operation);
  return {
    success: true,
    operation,
    count: nodes.length,
    nodes,
  };
}

async function handleMillTrainingSearch(params: Record<string, any>): Promise<any> {
  const { searchMillingTrainingNodes } = await import("../../data/tribal-tips/milling-training-index.js");
  const query = typeof params?.query === "string" ? params.query : "";
  const topK = Number.isFinite(params?.topK) ? Math.max(1, Math.min(50, Math.floor(params.topK))) : 5;
  const hits = searchMillingTrainingNodes(query, topK);
  return {
    success: true,
    query,
    topK,
    count: hits.length,
    hits,
  };
}

async function handleMillTrainingSummary(_params: Record<string, any>): Promise<any> {
  const { summarizeMillingTrainingIndex } = await import("../../data/tribal-tips/milling-training-index.js");
  const summary = summarizeMillingTrainingIndex();
  return { success: true, summary };
}

async function handlePlaybookSuggestResolution(params: Record<string, any>): Promise<any> {
  const c = params.conflict ?? params;
  const parameter = asConflictParameter(c?.parameter);
  const ruleIdA = asBoundedString(c?.ruleIdA, RULE_ID_MAX_LEN);
  const ruleIdB = asBoundedString(c?.ruleIdB, RULE_ID_MAX_LEN);
  if (!ruleIdA || !ruleIdB || !parameter) {
    return {
      success: false,
      error:
        `playbook_suggest_resolution requires conflict.{ruleIdA, ruleIdB, parameter}. ` +
        `ruleIdA/ruleIdB must be non-empty strings ≤${RULE_ID_MAX_LEN} chars. ` +
        `parameter must be one of: ${[...CONFLICT_PARAMETER_VALUES].join(", ")}.`,
    };
  }
  // sharedContext is operator-supplied free text — bound it. Empty/oversized
  // falls back to the synthetic placeholder rather than rejecting, since the
  // engine doesn't read this field from the synthetic struct (only the corpus
  // entries' contexts matter for the proposal — Reviewer B P1-1).
  const sharedContext = asBoundedString(c?.sharedContext, SHARED_CONTEXT_MAX_LEN)
    ?? "operator-supplied conflict";
  // Defaults for directionA/directionB are intentionally OPPOSING ("increase"
  // vs "decrease") so the synthesized PlaybookConflict represents a genuine
  // contradiction even when the caller omits them (matches the engine's
  // detectConflicts() output shape — Reviewer B P2-1).
  const directionA = asDirectiveDirection(c?.directionA, "increase");
  const directionB = asDirectiveDirection(c?.directionB, "decrease");
  // category defaults to "tactics" — the engine's proposeFromConflict() reads
  // only ruleIdA/ruleIdB/parameter from the struct (verified line 5111+); this
  // field is structurally required by PlaybookConflict but not load-bearing.
  // Routed through asBoundedString for path-consistency with ruleIdA/B + a
  // documented oversized-string rejection (Reviewer B P1-2). Caller-supplied
  // category names are NOT enum-validated against the engine's RuleCategory
  // union — the engine ignores the field, and rule lookup is id-keyed.
  // If the engine ever grows category-aware resolution logic, revisit by
  // adding a RuleCategory enum validator alongside asConflictParameter.
  const category = (asBoundedString(c?.category, RULE_ID_MAX_LEN) ?? "tactics") as RuleCategory;
  const synthetic: PlaybookConflict = {
    ruleIdA,
    ruleIdB,
    parameter,
    directionA,
    directionB,
    category,
    sharedContext,
  };
  return { success: true, proposal: machiningPlaybookEngine.suggestResolution(synthetic) };
}

// ---------------------------------------------------------------------------
// Action routing
// ---------------------------------------------------------------------------

const ACTION_HANDLERS: Record<string, (p: Record<string, any>) => Promise<any>> = {
  practice_ingest: handlePracticeIngest,
  practice_search: handlePracticeSearch,
  practice_get: handlePracticeGet,
  practice_list: handlePracticeList,
  practice_audit: handlePracticeAudit,
  practice_recommend: handlePracticeRecommend,
  tree_build: handleTreeBuild,
  tree_navigate: handleTreeNavigate,
  tree_search: handleTreeSearch,
  tips_add: handleTipsAdd,
  tips_get: handleTipsGet,
  tips_conflicts: handleTipsConflicts,
  playbook_advise: handlePlaybookAdvise,
  playbook_sequence: handlePlaybookSequence,
  playbook_setup: handlePlaybookSetup,
  playbook_antipatterns: handlePlaybookAntipatterns,
  playbook_lookup: handlePlaybookLookup,
  playbook_add_rule: handlePlaybookAddRule,
  tribal_search: handleTribalSearch,
  tribal_add: handleTribalAdd,
  tribal_get: handleTribalGet,
  tribal_list: handleTribalList,
  tribal_categories: handleTribalCategories,
  tribal_enrich: handleTribalEnrich,
  tribal_enrich_check: handleTribalEnrichCheck,
  tribal_enrich_tips_only: handleTribalEnrichTipsOnly,
  tribal_enrich_playbook_only: handleTribalEnrichPlaybookOnly,
  tribal_enrich_controller_only: handleTribalEnrichControllerOnly,
  playbook_rules_query: handlePlaybookRulesQuery,
  playbook_rules_search: handlePlaybookRulesSearch,
  playbook_rules_safety: handlePlaybookRulesSafety,
  playbook_rules_stats: handlePlaybookRulesStats,
  lathe_lora_tribal_augment: handleLatheLoRATribalAugment,
  lathe_lora_tribal_find_tips: handleLatheLoRATribalFindTips,
  lathe_lora_tribal_aug_stats: handleLatheLoRATribalAugStats,
  lathe_lora_tribal_extract: handleLatheLoRATribalExtract,
  lathe_lora_tribal_extract_batch: handleLatheLoRATribalExtractBatch,
  lathe_lora_tribal_extractor_stats: handleLatheLoRATribalExtractorStats,
  tribal_apply: handleTribalApply,
  tribal_apply_stats: handleTribalApplyStats,
  playbook_explain: handlePlaybookExplain,
  playbook_coverage: handlePlaybookCoverage,
  playbook_quantitative: handlePlaybookQuantitative,
  playbook_audit: handlePlaybookAudit,
  playbook_conflicts: handlePlaybookConflicts,
  playbook_conflicts_ranked: handlePlaybookConflictsRanked,
  playbook_suggest_resolutions: handlePlaybookSuggestResolutions,
  playbook_suggest_resolution: handlePlaybookSuggestResolution,
  playbook_related_graph: handlePlaybookRelatedGraph,
  playbook_validate_corpus: handlePlaybookValidateCorpus,
  // Mill-studio AI-reachable training index (MILL-PDF-CORPUS-MS0)
  mill_training_for_operation: handleMillTrainingForOperation,
  mill_training_search: handleMillTrainingSearch,
  mill_training_summary: handleMillTrainingSummary,
};

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/** Registers shop practice dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerShopPracticeDispatcher(server: any): void {
  server.tool(
    "prism_shop_practice",
    "Shop practice knowledge base: ingest/search/audit machining practices, build/navigate troubleshooting trees, manage per-material tips, query the machining playbook, and search/add/list 3,700+ tribal knowledge tips from experienced machinists. Use 'action' param.",
    {
      action: z.enum(ACTIONS),
      params: z.record(z.string(), z.any()).optional(),
    },
    async ({ action, params: rawParams = {} }: { action: string; params?: Record<string, any> }) => {
      log.info(`[prism_shop_practice] Action: ${action}`);

      const params: Record<string, any> = { ...rawParams };

      try {
        // Normalize params
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          Object.assign(params, normalizeParams(rawParams));
        } catch { /* normalizer not available */ }

        // Pre-hooks
        const hookCtx = {
          operation: action,
          target: { type: "knowledge" as const, id: action, data: params },
          metadata: { dispatcher: "shopPracticeDispatcher", action, params },
        };
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx as unknown as Partial<HookContext>);
        if (preResult.blocked) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({
              blocked: true, blocker: preResult.blockedBy, reason: preResult.summary, action,
            }) }],
          };
        }

        const validation = validateActionParams(action, params, ACTION_SHOP_PRACTICE_SCHEMAS);
        if (!validation.valid) {
          // dispatcherError signature is `(error, action, dispatcher)` — the
          // error message goes FIRST and the dispatcher name LAST (cross-
          // check: aiReasoningDispatcher.ts:683, adaptiveControlDispatcher.ts:316).
          // The pre-existing call here had BOTH halves of the bug — wrong field
          // (`validation.errors` doesn't exist on ValidationResult; it's
          // `validation.error?: z.ZodError`) AND wrong argument order
          // (the literal "prism_shop_practice" was landing in the user-facing
          // `error` field while the dynamic message landed in `dispatcher`).
          //
          // The Zod issue's `.message` alone is opaque ("Required", "Invalid
          // option: expected one of ...") — it omits the field path, which is
          // the single most useful piece of context for a client trying to
          // fix their request. Format as `<path>: <message>` so the user-
          // facing error names the failing field every time.
          const formatted = validation.error?.issues
            .map((e) => {
              const where = e.path.length ? e.path.join(".") + ": " : "";
              return `${where}${e.message}`;
            })
            .join("; ") ?? "Invalid parameters";
          return dispatcherError(formatted, action, "prism_shop_practice");
        }

        const handler = ACTION_HANDLERS[action];
        if (!handler) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({
              error: `Unknown action: ${action}`,
              available: ACTIONS,
            }) }],
          };
        }

        const result = await handler(params);

        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: any) {
        log.error(`[prism_shop_practice] ${action} failed:`, err);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({
            error: err.message || "Internal error",
            action,
          }) }],
        };
      }
    }
  );

  log.info(`[prism_shop_practice] Registered ${ACTIONS.length} actions`);
}
