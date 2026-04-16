/**
 * hyperMILL Workflow & Order of Operations Extractor
 *
 * Extracts the SEQUENCE of operations for:
 * - CAD drawing (from simple to complex parts)
 * - CAM programming (2D, 3D, 5-axis workflows)
 * - Part setup (stock, origins, clamping)
 * - Post-processing workflow
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, basename } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

// ============================================================================
// TYPES
// ============================================================================

interface WorkflowStep {
  step_number: number;
  action: string;
  details?: string;
  tips?: string[];
  warnings?: string[];
}

interface Workflow {
  id: string;
  name: string;
  category: "cad" | "cam_2d" | "cam_3d" | "cam_5axis" | "setup" | "post";
  description: string;
  prerequisites: string[];
  steps: WorkflowStep[];
  result: string;
  source_file: string;
  source_page?: number;
  confidence: number;
}

interface OrderOfOperations {
  category: string;
  name: string;
  operations: string[];
  rationale?: string;
  source: string;
}

// ============================================================================
// WORKFLOW PATTERNS
// ============================================================================

// Canonical CAD workflow for complex parts
const CAD_WORKFLOW_PATTERNS = {
  die_design: [
    "Import customer model (STEP/IGES)",
    "Analyze part geometry (undercuts, draft angles)",
    "Define parting line/surface",
    "Create core and cavity separation",
    "Add draft angles to vertical faces",
    "Design electrode geometry (if EDM needed)",
    "Add spark gap offset to electrodes",
    "Create holder/blank geometry",
    "Add alignment features",
    "Export for CAM",
  ],
  mold_design: [
    "Import cavity model",
    "Analyze shrinkage requirements",
    "Scale geometry for material shrinkage",
    "Define parting surfaces",
    "Create core/cavity split",
    "Add cooling channel sketches",
    "Design ejector pin locations",
    "Add venting features",
    "Create mold base interface",
    "Generate assembly",
  ],
  fixture_design: [
    "Import workpiece model",
    "Analyze clamping surfaces",
    "Define work holding requirements",
    "Create base plate geometry",
    "Add clamp locations",
    "Design locating features",
    "Add clearance for tool access",
    "Verify no collision zones",
    "Create assembly with workpiece",
  ],
};

// Canonical CAM workflow sequences
const CAM_WORKFLOW_PATTERNS = {
  "2d_milling": [
    "Define stock/blank geometry",
    "Set machine and coordinate system",
    "Create work origin (NCS)",
    "Select tool(s) for operations",
    "Face milling (top surface)",
    "Contour roughing (outer profile)",
    "Contour finishing (outer profile)",
    "Pocket roughing (if pockets exist)",
    "Pocket finishing",
    "Drilling operations",
    "Chamfer/deburr operations",
    "Verify toolpath simulation",
    "Generate NC code",
  ],
  "3d_milling": [
    "Import model and define stock",
    "Analyze geometry (steep vs shallow)",
    "Create boundary curves for regions",
    "Select roughing strategy (3D roughing)",
    "Calculate and verify roughing",
    "Rest roughing (smaller tool)",
    "3D finishing - Z-level for steep",
    "3D finishing - scallop for shallow",
    "Pencil milling for corners",
    "Rest finishing if needed",
    "Chamfer/blend operations",
    "Full simulation verification",
    "Post-process",
  ],
  "5axis_milling": [
    "Import model and stock",
    "Define machine kinematics",
    "Analyze access requirements",
    "Plan indexing positions (3+2)",
    "Create work origins per index",
    "5-axis roughing (if needed)",
    "3+2 operations per orientation",
    "Swarf cutting for ruled surfaces",
    "5-axis contouring for freeform",
    "Flow milling for blends",
    "Collision checking per operation",
    "Optimize tool axis transitions",
    "Full machine simulation",
    "Post-process with rotary output",
  ],
  turning: [
    "Define raw stock (bar/blank)",
    "Set spindle and chuck",
    "Face operation",
    "OD roughing (longitudinal)",
    "OD finishing",
    "ID roughing (if hollow)",
    "ID finishing",
    "Grooving operations",
    "Threading (if required)",
    "Cutoff operation",
    "Verify clearances",
    "Post-process",
  ],
  mill_turn: [
    "Define stock and machine",
    "Plan spindle transfers",
    "Main spindle turning ops",
    "Live tooling milling ops",
    "Sub-spindle transfer",
    "Sub-spindle turning ops",
    "Back-work milling ops",
    "Verify synchronization",
    "Full simulation",
    "Post-process",
  ],
};

// ============================================================================
// EXTRACTION
// ============================================================================

function extractWorkflowsFromText(text: string, sourceFile: string): Workflow[] {
  const workflows: Workflow[] = [];
  const lines = text.split("\n");

  // Pattern for workflow headers
  const workflowHeaders = [
    /(?:workflow|procedure|process)[:\s]+([^\n]+)/gi,
    /how\s+to\s+(?:create|program|setup|define)\s+([^\n]+)/gi,
    /(?:steps?\s+for|guide\s+to)\s+([^\n]+)/gi,
    /^(\d+\.\d+\.?\d*)\s+([A-Z][a-zA-Z\s]+)/gm,
  ];

  let currentWorkflow: Partial<Workflow> | null = null;
  let currentSteps: WorkflowStep[] = [];
  let stepNum = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] || "").trim();

    // Check for workflow header
    for (const pattern of workflowHeaders) {
      pattern.lastIndex = 0;
      const match = line.match(pattern);
      if (match) {
        // Save previous workflow
        if (currentWorkflow && currentSteps.length >= 3) {
          currentWorkflow.steps = currentSteps;
          workflows.push(finalizeWorkflow(currentWorkflow, sourceFile, i));
        }

        currentWorkflow = {
          name: (match[2] || match[1] || "").trim().slice(0, 100),
          category: categorizeWorkflow(match[0]),
          description: "",
          prerequisites: [],
          steps: [],
          confidence: 0.7,
        };
        currentSteps = [];
        stepNum = 0;
        break;
      }
    }

    // Check for numbered steps
    const stepMatch = line.match(/^(\d+)[.)]\s+(.+)/);
    if (stepMatch && currentWorkflow) {
      const num = parseInt(stepMatch[1]);
      if (num === stepNum + 1 || num === 1) {
        currentSteps.push({
          step_number: num,
          action: (stepMatch[2] || "").trim(),
        });
        stepNum = num;
      }
    }

    // Check for "then" sequences
    if (currentWorkflow && (line.includes(" then ") || line.includes(" next "))) {
      const parts = line.split(/\s+then\s+|\s+next\s+/i);
      for (const part of parts) {
        if (part.length > 10 && part.length < 200) {
          currentSteps.push({
            step_number: ++stepNum,
            action: part.trim(),
          });
        }
      }
    }
  }

  // Save last workflow
  if (currentWorkflow && currentSteps.length >= 3) {
    currentWorkflow.steps = currentSteps;
    workflows.push(finalizeWorkflow(currentWorkflow, sourceFile, lines.length));
  }

  return workflows;
}

function categorizeWorkflow(text: string): "cad" | "cam_2d" | "cam_3d" | "cam_5axis" | "setup" | "post" {
  const t = text.toLowerCase();
  if (t.includes("5-axis") || t.includes("5 axis") || t.includes("multiaxis")) return "cam_5axis";
  if (t.includes("3d") || t.includes("surface") || t.includes("freeform")) return "cam_3d";
  if (t.includes("2d") || t.includes("contour") || t.includes("pocket") || t.includes("drill")) return "cam_2d";
  if (t.includes("cad") || t.includes("draw") || t.includes("sketch") || t.includes("model")) return "cad";
  if (t.includes("post") || t.includes("nc code") || t.includes("output")) return "post";
  if (t.includes("setup") || t.includes("origin") || t.includes("stock") || t.includes("clamp")) return "setup";
  return "cam_2d";
}

function finalizeWorkflow(wf: Partial<Workflow>, sourceFile: string, line: number): Workflow {
  return {
    id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: wf.name || "Unnamed Workflow",
    category: wf.category || "cam_2d",
    description: wf.description || "",
    prerequisites: wf.prerequisites || [],
    steps: wf.steps || [],
    result: "",
    source_file: sourceFile,
    source_page: Math.floor(line / 50) + 1,
    confidence: (wf.steps?.length || 0) >= 5 ? 0.85 : 0.65,
  };
}

async function extractFromPDF(pdfPath: string): Promise<{ workflows: Workflow[]; raw_text_length: number }> {
  const filename = basename(pdfPath);
  console.log(`  Processing: ${filename}`);

  try {
    const buffer = readFileSync(pdfPath);
    const sizeMB = buffer.length / 1024 / 1024;
    console.log(`    Size: ${sizeMB.toFixed(1)}MB`);

    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy?.();

    const text = typeof result === "string" ? result : (result?.text || "");
    console.log(`    Characters: ${text.length.toLocaleString()}`);

    const workflows = extractWorkflowsFromText(text, filename);
    console.log(`    Workflows: ${workflows.length}`);

    return { workflows, raw_text_length: text.length };
  } catch (err) {
    console.error(`    Error: ${err}`);
    return { workflows: [], raw_text_length: 0 };
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║    hyperMILL Workflow & Order of Operations Extractor        ║");
  console.log("║    CAD Drawing + CAM Programming Sequences                   ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  const OUTPUT_DIR = "H:/prism/mcp-server/data/extracted-knowledge/hypermill-workflows";
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Key training PDFs with workflows
  const TRAINING_PDFS = [
    "H:/prism/Resources/RESOURCE PDFS/Software documentation - hyperMILL_2D_3D.pdf",
    "H:/prism/Resources/RESOURCE PDFS/hyperMILL_2D_3D.pdf",
    "H:/prism/Resources/PDF/hyperMILL/hyperMILL_Manual-en.pdf",
  ].filter(existsSync);

  console.log(`Found ${TRAINING_PDFS.length} training PDFs\n`);

  const allWorkflows: Workflow[] = [];
  let totalChars = 0;

  for (const pdfPath of TRAINING_PDFS) {
    const { workflows, raw_text_length } = await extractFromPDF(pdfPath);
    allWorkflows.push(...workflows);
    totalChars += raw_text_length;
  }

  // Add canonical workflows from patterns
  console.log("\nAdding canonical CAD/CAM workflows...");

  // CAD workflows
  for (const [name, steps] of Object.entries(CAD_WORKFLOW_PATTERNS)) {
    allWorkflows.push({
      id: `canonical-cad-${name}`,
      name: name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      category: "cad",
      description: `Standard CAD workflow for ${name.replace(/_/g, " ")}`,
      prerequisites: ["CAD model or sketch", "hyperCAD-S or compatible CAD system"],
      steps: steps.map((s, i) => ({ step_number: i + 1, action: s })),
      result: "Complete CAD model ready for CAM",
      source_file: "PRISM Canonical Workflows",
      confidence: 0.95,
    });
  }

  // CAM workflows
  for (const [name, steps] of Object.entries(CAM_WORKFLOW_PATTERNS)) {
    allWorkflows.push({
      id: `canonical-cam-${name}`,
      name: name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      category: name.includes("5axis") ? "cam_5axis" : name.includes("3d") ? "cam_3d" : "cam_2d",
      description: `Standard CAM workflow for ${name.replace(/_/g, " ")} programming`,
      prerequisites: ["CAD model imported", "Stock defined", "Machine selected"],
      steps: steps.map((s, i) => ({ step_number: i + 1, action: s })),
      result: "Verified NC code ready for machine",
      source_file: "PRISM Canonical Workflows",
      confidence: 0.95,
    });
  }

  // Build order of operations summary
  const orderOfOps: OrderOfOperations[] = [
    {
      category: "CAD - Die Design",
      name: "Complex Die Part Creation",
      operations: CAD_WORKFLOW_PATTERNS.die_design,
      rationale: "Start with analysis, then separation, then details. Electrodes last because they depend on cavity geometry.",
      source: "Industry best practice + hyperCAD-S workflow",
    },
    {
      category: "CAM - 3D Milling",
      name: "Complex Freeform Part",
      operations: CAM_WORKFLOW_PATTERNS["3d_milling"],
      rationale: "Roughing removes bulk material first. Steep areas finish with Z-level (better surface), shallow with scallop. Pencil cleans corners last.",
      source: "hyperMILL recommended workflow",
    },
    {
      category: "CAM - 5-Axis",
      name: "Complex Multi-Sided Part",
      operations: CAM_WORKFLOW_PATTERNS["5axis_milling"],
      rationale: "Minimize rotary moves - do all ops per orientation before reorienting. 3+2 for stability, simultaneous only when needed.",
      source: "hyperMILL 5-axis best practice",
    },
    {
      category: "Setup",
      name: "Part Setup Sequence",
      operations: [
        "Import model geometry",
        "Verify model scale and units",
        "Define stock/blank (box, cylinder, or model)",
        "Set machine with correct kinematics",
        "Create primary work origin (NCS)",
        "Define additional setups if multi-sided",
        "Set material with correct cutting data",
        "Verify tool library available",
        "Create milling area boundaries",
      ],
      rationale: "Geometry first, then machine context, then material. Order matters because later steps depend on earlier.",
      source: "hyperMILL setup workflow",
    },
  ];

  // Save results
  const timestamp = Date.now();
  const outputPath = join(OUTPUT_DIR, `hypermill-workflows-${timestamp}.json`);

  const result = {
    extracted_at: new Date().toISOString(),
    source: "hyperMILL Training Documentation + Canonical Patterns",
    pdfs_processed: TRAINING_PDFS.length,
    total_characters: totalChars,

    workflows: {
      total: allWorkflows.length,
      by_category: {} as Record<string, number>,
      items: allWorkflows,
    },

    order_of_operations: orderOfOps,

    quick_reference: {
      cad_complex_part: CAD_WORKFLOW_PATTERNS.die_design,
      cam_2d_part: CAM_WORKFLOW_PATTERNS["2d_milling"],
      cam_3d_part: CAM_WORKFLOW_PATTERNS["3d_milling"],
      cam_5axis_part: CAM_WORKFLOW_PATTERNS["5axis_milling"],
    },
  };

  // Count by category
  for (const wf of allWorkflows) {
    result.workflows.by_category[wf.category] = (result.workflows.by_category[wf.category] || 0) + 1;
  }

  writeFileSync(outputPath, JSON.stringify(result, null, 2));

  // Summary
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                    EXTRACTION SUMMARY                        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`  PDFs Processed:         ${TRAINING_PDFS.length}`);
  console.log(`  Total Characters:       ${totalChars.toLocaleString()}`);
  console.log(`  Workflows Extracted:    ${allWorkflows.length}`);
  console.log(`  Order of Ops Guides:    ${orderOfOps.length}`);
  console.log("");
  console.log("  Workflows by category:");
  for (const [cat, count] of Object.entries(result.workflows.by_category).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cat}: ${count}`);
  }
  console.log("");
  console.log("  Quick Reference Sequences:");
  console.log(`    CAD Complex Part:  ${CAD_WORKFLOW_PATTERNS.die_design.length} steps`);
  console.log(`    CAM 2D Part:       ${CAM_WORKFLOW_PATTERNS["2d_milling"].length} steps`);
  console.log(`    CAM 3D Part:       ${CAM_WORKFLOW_PATTERNS["3d_milling"].length} steps`);
  console.log(`    CAM 5-Axis Part:   ${CAM_WORKFLOW_PATTERNS["5axis_milling"].length} steps`);
  console.log("");
  console.log(`  Output: ${outputPath}`);
}

main().catch(console.error);
