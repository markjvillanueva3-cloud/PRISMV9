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
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as path from "node:path";

const execFileAsync = promisify(execFile);

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
] as const;

// Python & cad-engine paths
const PYTHON_PATH = process.env.PRISM_PYTHON_PATH ||
  "C:/Users/Admin.DIGITALSTORM-PC/AppData/Local/Programs/Python/Python312/python.exe";
const CAD_ENGINE_DIR = path.resolve(
  process.env.PRISM_CAD_ENGINE_DIR || path.join(__dirname, "../../../../cad-engine")
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
    "Shop practice knowledge base: ingest/search/audit machining practices from video tutorials, build/navigate troubleshooting trees, manage per-material tips with conflict resolution. Use 'action' param.",
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
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx as any);
        if (preResult.blocked) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({
              blocked: true, blocker: preResult.blockedBy, reason: preResult.summary, action,
            }) }],
          };
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
