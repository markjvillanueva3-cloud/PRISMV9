/**
 * Wire hyperMILL Extraction to PRISM Knowledge Systems
 *
 * Converts extracted hyperMILL knowledge to:
 * - Tribal knowledge tips (procedures, warnings)
 * - Knowledge graph nodes and edges
 * - Searchable atoms for MCP queries
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

// ============================================================================
// TYPES
// ============================================================================

interface KnowledgeAtom {
  id: string;
  source: string;
  category: string;
  subcategory: string;
  title: string;
  body: string;
  tags: string[];
  confidence: number;
  created_at: string;
  metadata: Record<string, unknown>;
}

interface TribalKnowledgeTip {
  id: string;
  cam_system: string;
  category: string;
  title: string;
  body: string;
  source: string;
  applies_to: string[];
  confidence: number;
  created_at: string;
}

interface KnowledgeGraphNode {
  id: string;
  type: string;
  label: string;
  properties: Record<string, unknown>;
}

interface KnowledgeGraphEdge {
  source: string;
  target: string;
  relationship: string;
  weight: number;
}

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

function generateId(prefix: string, content: string): string {
  const hash = content.split("").reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return `${prefix}-${Math.abs(hash).toString(36)}`;
}

function convertCycleToAtom(cycle: any): KnowledgeAtom {
  const body = [
    cycle.description,
    cycle.workflow_steps?.length ? `Steps: ${cycle.workflow_steps.join("; ")}` : "",
    cycle.tips?.length ? `Tips: ${cycle.tips.join("; ")}` : "",
    cycle.warnings?.length ? `Warnings: ${cycle.warnings.join("; ")}` : "",
  ].filter(Boolean).join("\n\n");

  return {
    id: generateId("hm-cycle", cycle.name + body),
    source: "hyperMILL Documentation",
    category: "cam_cycle",
    subcategory: cycle.category || "General",
    title: cycle.name,
    body,
    tags: ["hypermill", "cycle", cycle.category?.toLowerCase() || "milling"],
    confidence: cycle.confidence || 0.8,
    created_at: new Date().toISOString(),
    metadata: {
      parameters: cycle.parameters,
      page: cycle.source_page,
    },
  };
}

function convertProcedureToAtom(procedure: any): KnowledgeAtom {
  const stepsText = procedure.steps?.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n") || "";
  const body = [
    stepsText,
    procedure.prerequisites?.length ? `Prerequisites: ${procedure.prerequisites.join("; ")}` : "",
    procedure.tips?.length ? `Tips: ${procedure.tips.join("; ")}` : "",
    procedure.warnings?.length ? `Warnings: ${procedure.warnings.join("; ")}` : "",
  ].filter(Boolean).join("\n\n");

  return {
    id: generateId("hm-proc", procedure.title + body),
    source: "hyperMILL Documentation",
    category: "procedure",
    subcategory: procedure.category || "General",
    title: procedure.title,
    body,
    tags: ["hypermill", "procedure", procedure.category?.toLowerCase() || "workflow"],
    confidence: procedure.confidence || 0.75,
    created_at: new Date().toISOString(),
    metadata: {
      step_count: procedure.steps?.length || 0,
      source_file: procedure.source_file,
      page: procedure.source_page,
    },
  };
}

function convertToTribalTip(item: any, type: "cycle" | "procedure" | "warning"): TribalKnowledgeTip {
  let title: string;
  let body: string;
  let category: string;

  if (type === "cycle") {
    title = `hyperMILL ${item.name}`;
    body = [
      item.description,
      item.workflow_steps?.length ? `Workflow: ${item.workflow_steps.slice(0, 5).join(" → ")}` : "",
      item.tips?.[0] || "",
    ].filter(Boolean).join(" | ");
    category = item.category || "Milling Cycles";
  } else if (type === "procedure") {
    title = item.title;
    body = item.steps?.slice(0, 3).join(" → ") || "";
    if (item.tips?.[0]) body += ` | Tip: ${item.tips[0]}`;
    category = item.category || "Procedures";
  } else {
    title = "Warning";
    body = item;
    category = "Safety";
  }

  return {
    id: generateId("hm-tip", title + body),
    cam_system: "hypermill",
    category,
    title,
    body: body.slice(0, 500),
    source: "hyperMILL Official Documentation",
    applies_to: ["hypermill", "open_mind"],
    confidence: item.confidence || 0.8,
    created_at: new Date().toISOString(),
  };
}

function buildKnowledgeGraph(extraction: any): { nodes: KnowledgeGraphNode[]; edges: KnowledgeGraphEdge[] } {
  const nodes: KnowledgeGraphNode[] = [];
  const edges: KnowledgeGraphEdge[] = [];

  // Add hyperMILL as root CAM system node
  nodes.push({
    id: "cam-hypermill",
    type: "cam_system",
    label: "hyperMILL",
    properties: {
      vendor: "OPEN MIND Technologies",
      version: "2024+",
      specialties: ["5-axis", "HSC", "mill-turn", "electrode"],
    },
  });

  // Add cycle category nodes
  const categories = new Set<string>();
  for (const source of extraction.by_source || []) {
    for (const cycle of source.cycles || []) {
      categories.add(cycle.category);
    }
  }

  for (const cat of categories) {
    const nodeId = `hm-cat-${cat.toLowerCase().replace(/\s+/g, "-")}`;
    nodes.push({
      id: nodeId,
      type: "cycle_category",
      label: cat,
      properties: { cam_system: "hypermill" },
    });
    edges.push({
      source: "cam-hypermill",
      target: nodeId,
      relationship: "has_category",
      weight: 1.0,
    });
  }

  // Add cycle nodes
  for (const source of extraction.by_source || []) {
    for (const cycle of source.cycles || []) {
      const nodeId = `hm-cycle-${cycle.name.toLowerCase().replace(/\s+/g, "-")}`;
      nodes.push({
        id: nodeId,
        type: "machining_cycle",
        label: cycle.name,
        properties: {
          category: cycle.category,
          description: cycle.description?.slice(0, 200),
          parameters: cycle.parameters?.map((p: any) => p.name),
        },
      });

      // Connect to category
      const catId = `hm-cat-${(cycle.category || "general").toLowerCase().replace(/\s+/g, "-")}`;
      edges.push({
        source: catId,
        target: nodeId,
        relationship: "contains_cycle",
        weight: 0.9,
      });
    }
  }

  // Add procedure nodes for important categories
  const importantCategories = ["Tool Setup", "Stock Setup", "Coordinate Setup", "Post Processing"];
  for (const source of extraction.by_source || []) {
    for (const proc of source.procedures || []) {
      if (importantCategories.includes(proc.category)) {
        const nodeId = generateId("hm-proc", proc.title);
        nodes.push({
          id: nodeId,
          type: "procedure",
          label: proc.title,
          properties: {
            category: proc.category,
            step_count: proc.steps?.length,
          },
        });
        edges.push({
          source: "cam-hypermill",
          target: nodeId,
          relationship: "has_procedure",
          weight: 0.8,
        });
      }
    }
  }

  return { nodes, edges };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║     Wiring hyperMILL Extraction to PRISM Knowledge Systems   ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  const EXTRACTION_DIR = "H:/prism/mcp-server/data/extracted-knowledge/hypermill";
  const OUTPUT_DIR = "H:/prism/mcp-server/data/extracted-knowledge/hypermill/wired";

  // Find latest extraction
  const files = readdirSync(EXTRACTION_DIR)
    .filter(f => f.startsWith("hypermill-deep-extraction-") && f.endsWith(".json"))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.error("No extraction files found. Run extract-hypermill-deep.ts first.");
    process.exit(1);
  }

  const latestFile = join(EXTRACTION_DIR, files[0]);
  console.log(`Loading: ${files[0]}`);

  const extraction = JSON.parse(readFileSync(latestFile, "utf-8"));

  // Convert to atoms
  const atoms: KnowledgeAtom[] = [];
  const tribalTips: TribalKnowledgeTip[] = [];

  console.log("\nConverting cycles...");
  for (const source of extraction.by_source || []) {
    for (const cycle of source.cycles || []) {
      atoms.push(convertCycleToAtom(cycle));
      tribalTips.push(convertToTribalTip(cycle, "cycle"));
    }
  }
  console.log(`  Cycles: ${atoms.length} atoms, ${tribalTips.length} tips`);

  console.log("Converting procedures...");
  const procCount = atoms.length;
  for (const source of extraction.by_source || []) {
    for (const proc of source.procedures || []) {
      atoms.push(convertProcedureToAtom(proc));
      tribalTips.push(convertToTribalTip(proc, "procedure"));
    }
  }
  console.log(`  Procedures: ${atoms.length - procCount} atoms`);

  console.log("Converting warnings to tips...");
  const warningCount = tribalTips.length;
  for (const source of extraction.by_source || []) {
    for (const warning of source.raw_warnings || []) {
      tribalTips.push(convertToTribalTip(warning, "warning"));
    }
  }
  console.log(`  Warnings: ${tribalTips.length - warningCount} tips`);

  // Build knowledge graph
  console.log("\nBuilding knowledge graph...");
  const { nodes, edges } = buildKnowledgeGraph(extraction);
  console.log(`  Nodes: ${nodes.length}, Edges: ${edges.length}`);

  // Save outputs
  const timestamp = Date.now();

  // Atoms
  const atomsPath = join(EXTRACTION_DIR, `hypermill-atoms-${timestamp}.json`);
  writeFileSync(atomsPath, JSON.stringify({
    source: "hyperMILL Documentation",
    created_at: new Date().toISOString(),
    count: atoms.length,
    atoms,
  }, null, 2));
  console.log(`\nSaved atoms: ${atomsPath}`);

  // Tribal tips
  const tipsPath = join(EXTRACTION_DIR, `hypermill-tribal-tips-${timestamp}.json`);
  writeFileSync(tipsPath, JSON.stringify({
    cam_system: "hypermill",
    created_at: new Date().toISOString(),
    count: tribalTips.length,
    tips: tribalTips,
  }, null, 2));
  console.log(`Saved tribal tips: ${tipsPath}`);

  // Knowledge graph
  const graphPath = join(EXTRACTION_DIR, `hypermill-knowledge-graph-${timestamp}.json`);
  writeFileSync(graphPath, JSON.stringify({
    source: "hyperMILL Documentation",
    created_at: new Date().toISOString(),
    node_count: nodes.length,
    edge_count: edges.length,
    nodes,
    edges,
  }, null, 2));
  console.log(`Saved knowledge graph: ${graphPath}`);

  // Summary
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                      WIRING SUMMARY                          ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`  Knowledge Atoms:    ${atoms.length}`);
  console.log(`  Tribal Tips:        ${tribalTips.length}`);
  console.log(`  Graph Nodes:        ${nodes.length}`);
  console.log(`  Graph Edges:        ${edges.length}`);
  console.log("");
  console.log("  Atoms by category:");
  const atomCats: Record<string, number> = {};
  for (const a of atoms) {
    atomCats[a.category] = (atomCats[a.category] || 0) + 1;
  }
  for (const [cat, count] of Object.entries(atomCats).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cat}: ${count}`);
  }
  console.log("");
  console.log("  Tips by category:");
  const tipCats: Record<string, number> = {};
  for (const t of tribalTips) {
    tipCats[t.category] = (tipCats[t.category] || 0) + 1;
  }
  for (const [cat, count] of Object.entries(tipCats).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`    ${cat}: ${count}`);
  }
}

main().catch(console.error);
