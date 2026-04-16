/**
 * hyperCAD-S & Python API Extractor
 *
 * Extracts:
 * - Python API functions from automation scripts (179 scripts)
 * - hyperCAD-S manual procedures and commands
 * - CAD drawing automation capabilities
 * - CAM automation workflows
 *
 * Purpose: Enable PRISM to use hyperCAD-S for CAD generation
 * instead of building custom CAD system.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from "fs";
import { join, basename, dirname, relative } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

// ============================================================================
// TYPES
// ============================================================================

interface PythonFunction {
  name: string;
  module: string;
  category: string;
  subcategory: string;
  description: string;
  parameters: string[];
  file_path: string;
  code_snippet: string;
  usage_example?: string;
}

interface HyperCADCommand {
  name: string;
  category: string;
  description: string;
  syntax?: string;
  parameters?: string[];
  source_page?: number;
}

interface AutomationWorkflow {
  name: string;
  description: string;
  steps: string[];
  scripts_used: string[];
  category: string;
}

interface ExtractionResult {
  extracted_at: string;
  python_api: {
    total_scripts: number;
    categories: Record<string, number>;
    functions: PythonFunction[];
  };
  hypercad_commands: HyperCADCommand[];
  automation_workflows: AutomationWorkflow[];
  summary: {
    cad_capabilities: string[];
    cam_capabilities: string[];
    automation_capabilities: string[];
  };
}

// ============================================================================
// PYTHON EXTRACTION
// ============================================================================

function extractPythonFunctions(baseDir: string): PythonFunction[] {
  const functions: PythonFunction[] = [];

  function walkDir(dir: string, category: string, subcategory: string) {
    if (!existsSync(dir)) return;

    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Determine category/subcategory
        const newSubcat = entry.name === "Python" ? subcategory : entry.name;
        walkDir(fullPath, category || newSubcat, newSubcat);
      } else if (entry.name.endsWith(".py")) {
        try {
          const content = readFileSync(fullPath, "utf-8");
          const extracted = extractFromPythonFile(content, fullPath, category, subcategory);
          functions.push(...extracted);
        } catch (err) {
          console.error(`  Error reading ${fullPath}: ${err}`);
        }
      }
    }
  }

  walkDir(baseDir, "", "");
  return functions;
}

function extractFromPythonFile(
  content: string,
  filePath: string,
  category: string,
  subcategory: string
): PythonFunction[] {
  const functions: PythonFunction[] = [];
  const lines = content.split("\n");
  const fileName = basename(filePath, ".py");

  // Extract module-level description from first docstring or comments
  let moduleDesc = "";
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = (lines[i] || "").trim();
    if (line.startsWith("#") && !line.startsWith("#!")) {
      moduleDesc += line.replace(/^#+\s*/, "") + " ";
    } else if (line.startsWith('"""') || line.startsWith("'''")) {
      const docEnd = content.indexOf(line.slice(0, 3), content.indexOf(line.slice(0, 3)) + 3);
      if (docEnd > 0) {
        moduleDesc = content.slice(content.indexOf(line.slice(0, 3)) + 3, docEnd).trim();
      }
      break;
    }
  }

  // Extract function definitions
  const funcPattern = /^def\s+(\w+)\s*\(([^)]*)\)/gm;
  let match;

  while ((match = funcPattern.exec(content)) !== null) {
    const funcName = match[1];
    const params = match[2].split(",").map(p => (p || "").trim()).filter(Boolean);

    // Find docstring after function def
    const afterFunc = content.slice(match.index + match[0].length);
    let funcDesc = "";
    const docMatch = afterFunc.match(/^\s*:\s*\n?\s*(["']{3})([\s\S]*?)\1/);
    if (docMatch) {
      funcDesc = (docMatch[2] || "").trim().slice(0, 300);
    }

    // Get code snippet (first 10 lines of function body)
    const funcStart = match.index;
    const funcLines = content.slice(funcStart).split("\n").slice(0, 15).join("\n");

    functions.push({
      name: funcName,
      module: fileName,
      category: category || "general",
      subcategory: subcategory || "misc",
      description: funcDesc || moduleDesc.slice(0, 200) || `${funcName} function`,
      parameters: params,
      file_path: filePath,
      code_snippet: funcLines.slice(0, 500),
    });
  }

  // If no functions found, treat the whole script as a command
  if (functions.length === 0 && content.trim().length > 10) {
    functions.push({
      name: fileName,
      module: fileName,
      category: category || "general",
      subcategory: subcategory || "script",
      description: moduleDesc.slice(0, 300) || `${fileName} automation script`,
      parameters: [],
      file_path: filePath,
      code_snippet: content.slice(0, 800),
    });
  }

  return functions;
}

// ============================================================================
// PDF EXTRACTION
// ============================================================================

async function extractHyperCADManual(pdfPath: string): Promise<HyperCADCommand[]> {
  const commands: HyperCADCommand[] = [];

  if (!existsSync(pdfPath)) {
    console.log("  hyperCAD-S manual not found");
    return commands;
  }

  console.log("  Extracting hyperCAD-S manual...");

  try {
    const buffer = readFileSync(pdfPath);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy?.();

    const text = typeof result === "string" ? result : (result?.text || "");
    const lines = text.split("\n");

    console.log(`    Characters: ${text.length.toLocaleString()}`);

    // Extract command patterns
    const commandPatterns = [
      /^(?:Command|Tool|Function)[:\s]+([A-Z][a-zA-Z\s]+)/i,
      /(?:create|draw|modify|edit|delete|copy|move)\s+([a-zA-Z\s]+)/gi,
      /(?:menu|toolbar)[:\s]+([A-Z][a-zA-Z\s>]+)/i,
    ];

    // Extract procedures
    for (let i = 0; i < lines.length; i++) {
      const line = (lines[i] || "").trim();

      // Look for command headers
      for (const pattern of commandPatterns) {
        pattern.lastIndex = 0;
        const match = line.match(pattern);
        if (match) {
          const cmdName = (match[1] || "").trim();
          if (cmdName.length > 3 && cmdName.length < 50) {
            // Get description from next lines
            const desc = (lines.slice(i + 1, i + 4) || [])
              .filter(Boolean)
              .join(" ")
              .slice(0, 200);

            commands.push({
              name: cmdName,
              category: categorizeCADCommand(cmdName),
              description: desc,
              source_page: Math.floor(i / 50) + 1,
            });
          }
        }
      }

      // Look for drawing commands specifically
      if (line.toLowerCase().includes("drawing") ||
          line.toLowerCase().includes("sketch") ||
          line.toLowerCase().includes("geometry")) {
        const nextLines = (lines.slice(i, i + 5) || []).filter(Boolean).join(" ");
        if (nextLines.length > 20) {
          commands.push({
            name: line.slice(0, 60),
            category: "drawing",
            description: nextLines.slice(0, 200),
            source_page: Math.floor(i / 50) + 1,
          });
        }
      }
    }

    console.log(`    Commands extracted: ${commands.length}`);
  } catch (err) {
    console.error(`  Error extracting PDF: ${err}`);
  }

  // Deduplicate
  const unique = commands.filter((c, i, arr) =>
    arr.findIndex(x => x.name.toLowerCase() === c.name.toLowerCase()) === i
  );

  return unique.slice(0, 200);
}

function categorizeCADCommand(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("line") || n.includes("circle") || n.includes("arc") || n.includes("point")) return "basic_geometry";
  if (n.includes("spline") || n.includes("curve") || n.includes("nurbs")) return "curves";
  if (n.includes("surface") || n.includes("face") || n.includes("patch")) return "surfaces";
  if (n.includes("solid") || n.includes("boolean") || n.includes("extrude")) return "solids";
  if (n.includes("dimension") || n.includes("measure") || n.includes("annotation")) return "dimensioning";
  if (n.includes("layer") || n.includes("color") || n.includes("attribute")) return "layers";
  if (n.includes("import") || n.includes("export") || n.includes("file")) return "file_io";
  if (n.includes("view") || n.includes("zoom") || n.includes("rotate")) return "view";
  return "general";
}

// ============================================================================
// WORKFLOW EXTRACTION
// ============================================================================

function extractAutomationWorkflows(pythonFunctions: PythonFunction[]): AutomationWorkflow[] {
  const workflows: AutomationWorkflow[] = [];

  // Group functions by category
  const byCategory: Record<string, PythonFunction[]> = {};
  for (const func of pythonFunctions) {
    const key = func.category;
    if (!byCategory[key]) byCategory[key] = [];
    byCategory[key].push(func);
  }

  // Create workflows based on common patterns
  const workflowPatterns: Record<string, { desc: string; steps: string[] }> = {
    "boolean": {
      desc: "Solid boolean operations for combining/subtracting solids",
      steps: ["Select target solid", "Select tool solid", "Execute boolean (union/difference/intersect)", "Verify result"],
    },
    "cam": {
      desc: "CAM automation for toolpath generation",
      steps: ["Load model", "Define stock", "Create operations", "Calculate toolpaths", "Generate NC code"],
    },
    "drafting": {
      desc: "2D drawing and drafting automation",
      steps: ["Set up drawing plane", "Create geometry", "Add dimensions", "Apply annotations"],
    },
    "curve": {
      desc: "Curve creation and manipulation",
      steps: ["Define control points", "Create curve", "Modify parameters", "Validate geometry"],
    },
    "electrode": {
      desc: "EDM electrode design automation",
      steps: ["Import cavity geometry", "Create electrode solid", "Add spark gap", "Generate holder"],
    },
    "shape": {
      desc: "Shape creation and modification",
      steps: ["Define base shape", "Apply transformations", "Create features", "Validate topology"],
    },
  };

  for (const [cat, funcs] of Object.entries(byCategory)) {
    const pattern = workflowPatterns[cat];
    if (pattern && funcs.length >= 2) {
      workflows.push({
        name: `${cat.charAt(0).toUpperCase() + cat.slice(1)} Automation`,
        description: pattern.desc,
        steps: pattern.steps,
        scripts_used: funcs.slice(0, 10).map(f => f.module),
        category: cat,
      });
    }
  }

  return workflows;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║    hyperCAD-S & Python API Extraction                        ║");
  console.log("║    CAD Drawing + Automation Capabilities for PRISM           ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  const OUTPUT_DIR = "H:/prism/mcp-server/data/extracted-knowledge/hypercad";
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Python API locations
  const PYTHON_API_DIRS = [
    "H:/prism/Resources/OPEN MIND/hyperMILL/33.0/addins project/hmAutoColor/Wizards/AutomationCenter/Python",
    "H:/prism/Resources/HYPERMILL/hyperMILL/33.0/addins project/hmAutoColor/Wizards/AutomationCenter/Python",
  ];

  // hyperCAD-S manual
  const HYPERCAD_MANUAL = "H:/prism/Resources/PDF/hyperCAD-S/hyperCAD-S_Manual-en.pdf";

  // Extract Python API
  console.log("Extracting Python API...");
  let allFunctions: PythonFunction[] = [];

  for (const apiDir of PYTHON_API_DIRS) {
    if (existsSync(apiDir)) {
      console.log(`  Scanning: ${apiDir}`);
      const funcs = extractPythonFunctions(apiDir);
      allFunctions.push(...funcs);
      console.log(`    Found: ${funcs.length} functions`);
    }
  }

  // Deduplicate
  const seenFuncs = new Set<string>();
  allFunctions = allFunctions.filter(f => {
    const key = `${f.module}:${f.name}`;
    if (seenFuncs.has(key)) return false;
    seenFuncs.add(key);
    return true;
  });

  // Categorize
  const categories: Record<string, number> = {};
  for (const f of allFunctions) {
    categories[f.category] = (categories[f.category] || 0) + 1;
  }

  console.log(`\n  Total unique functions: ${allFunctions.length}`);
  console.log("  By category:");
  for (const [cat, count] of Object.entries(categories).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cat}: ${count}`);
  }

  // Extract hyperCAD-S manual
  console.log("\nExtracting hyperCAD-S manual...");
  const hypercadCommands = await extractHyperCADManual(HYPERCAD_MANUAL);

  // Generate workflows
  console.log("\nGenerating automation workflows...");
  const workflows = extractAutomationWorkflows(allFunctions);
  console.log(`  Workflows: ${workflows.length}`);

  // Build summary
  const summary = {
    cad_capabilities: [
      "2D sketching (lines, arcs, circles, splines)",
      "3D modeling (extrude, revolve, sweep, loft)",
      "Surface modeling (NURBS, patches, trimming)",
      "Solid modeling (boolean operations)",
      "Assembly management",
      "Drawing/drafting automation",
      "Electrode design for EDM",
    ],
    cam_capabilities: [
      "Stock definition and calculation",
      "Clamp/fixture management",
      "Job list automation",
      "Operation copying/renumbering",
      "Toolpath associativity",
      "Feature-based machining",
    ],
    automation_capabilities: [
      "Python scripting via hmPythonRunner",
      "Automation Center integration",
      "Batch processing",
      "Custom wizards",
      "External system integration",
    ],
  };

  // Save results
  const timestamp = Date.now();
  const result: ExtractionResult = {
    extracted_at: new Date().toISOString(),
    python_api: {
      total_scripts: allFunctions.length,
      categories,
      functions: allFunctions,
    },
    hypercad_commands: hypercadCommands,
    automation_workflows: workflows,
    summary,
  };

  const outputPath = join(OUTPUT_DIR, `hypercad-python-api-${timestamp}.json`);
  writeFileSync(outputPath, JSON.stringify(result, null, 2));

  // Save compact API reference
  const apiRefPath = join(OUTPUT_DIR, `python-api-reference-${timestamp}.json`);
  const apiRef = {
    generated_at: new Date().toISOString(),
    description: "hyperMILL/hyperCAD-S Python API Reference for PRISM",
    categories: Object.keys(categories).sort(),
    functions_by_category: {} as Record<string, { name: string; module: string; params: string[]; desc: string }[]>,
  };

  for (const cat of Object.keys(categories).sort()) {
    apiRef.functions_by_category[cat] = allFunctions
      .filter(f => f.category === cat)
      .map(f => ({
        name: f.name,
        module: f.module,
        params: f.parameters,
        desc: f.description.slice(0, 100),
      }));
  }

  writeFileSync(apiRefPath, JSON.stringify(apiRef, null, 2));

  // Summary
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                    EXTRACTION SUMMARY                        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`  Python API Functions:    ${allFunctions.length}`);
  console.log(`  hyperCAD Commands:       ${hypercadCommands.length}`);
  console.log(`  Automation Workflows:    ${workflows.length}`);
  console.log("");
  console.log("  Key Categories:");
  for (const [cat, count] of Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log(`    ${cat}: ${count} functions`);
  }
  console.log("");
  console.log(`  Output: ${outputPath}`);
  console.log(`  API Ref: ${apiRefPath}`);
  console.log("");
  console.log("  CAD Capabilities for PRISM:");
  for (const cap of summary.cad_capabilities.slice(0, 5)) {
    console.log(`    - ${cap}`);
  }
}

main().catch(console.error);
