/**
 * hyperMILL Deep Extraction Pipeline
 *
 * Comprehensive extraction from ALL hyperMILL documentation:
 * - Machining cycle definitions and parameters
 * - Operation workflows and procedures
 * - Feature machining strategies
 * - Troubleshooting guides
 * - Automation Center configuration
 * - hyperCAD-S integration
 *
 * Focus: Extract MAXIMUM value from hyperMILL before other sources.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync } from "fs";
import { join, basename } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

// ============================================================================
// TYPES
// ============================================================================

interface HyperMillCycle {
  name: string;
  category: string;
  description: string;
  parameters: CycleParameter[];
  workflow_steps: string[];
  tips: string[];
  warnings: string[];
  related_cycles: string[];
  source_page: number;
  confidence: number;
}

interface CycleParameter {
  name: string;
  type: "numeric" | "boolean" | "enum" | "text";
  description: string;
  default_value?: string;
  unit?: string;
  range?: { min?: number; max?: number };
  enum_values?: string[];
}

interface HyperMillFeature {
  name: string;
  category: string;
  description: string;
  supported_operations: string[];
  geometry_requirements: string[];
  best_practices: string[];
  source_page: number;
}

interface HyperMillProcedure {
  title: string;
  category: string;
  steps: string[];
  prerequisites: string[];
  tips: string[];
  warnings: string[];
  related_procedures: string[];
  source_file: string;
  source_page: number;
  confidence: number;
}

interface HyperMillTroubleshooting {
  symptom: string;
  cause: string;
  solution: string;
  category: string;
  source_page: number;
}

interface AutomationCenterConfig {
  feature: string;
  description: string;
  setup_steps: string[];
  parameters: Record<string, string>;
  source_file: string;
}

interface HyperMillExtraction {
  source_pdf: string;
  file_size_mb: number;
  extracted_at: string;
  page_count: number;
  text_length: number;
  cycles: HyperMillCycle[];
  features: HyperMillFeature[];
  procedures: HyperMillProcedure[];
  troubleshooting: HyperMillTroubleshooting[];
  automation_configs: AutomationCenterConfig[];
  raw_tips: string[];
  raw_warnings: string[];
  chapter_structure: string[];
  warnings: string[];
}

// ============================================================================
// hyperMILL-SPECIFIC PATTERNS
// ============================================================================

// Cycle categories in hyperMILL
const CYCLE_CATEGORIES = [
  "2D Milling", "3D Milling", "5-Axis Milling", "HSC Milling",
  "Drilling", "Thread Milling", "Turning", "Mill-Turn",
  "Probing", "Engraving", "Electrode", "Impeller/Blisk"
];

// Known cycle names from hyperMILL
const KNOWN_CYCLES = [
  "Face Milling", "Contour Milling", "Pocket Milling", "Slot Milling",
  "3D Roughing", "3D Finishing", "Rest Roughing", "Pencil",
  "Z-Level", "Equidistant", "Horizontal", "Lace",
  "Swarf Cutting", "5-Axis Contouring", "5-Axis Repositioning",
  "Shape Offset", "ISO Machining", "Profile Finishing",
  "Helical Drilling", "Thread Milling", "Bore Milling",
  "Point-to-Point", "Deep Hole Drilling", "Back Boring",
  "Probe Surface", "Probe Edge", "Probe Hole",
  "Tube Finishing", "Blade Finishing", "Flow Line"
];

// Parameter patterns
const PARAM_PATTERNS = {
  depth: /(?:depth|z[-_]?step|step[-_]?over)\s*[:=]?\s*([\d.]+)\s*(mm|inch)?/gi,
  stepover: /(?:step[-_]?over|radial[-_]?step|ae)\s*[:=]?\s*([\d.]+)\s*(%|mm)?/gi,
  tolerance: /(?:tolerance|precision)\s*[:=]?\s*([\d.]+)\s*(mm|µm)?/gi,
  overlap: /(?:overlap)\s*[:=]?\s*([\d.]+)\s*(%)?/gi,
  approach: /(?:approach|lead[-_]?in)\s*[:=]?\s*(\w+)/gi,
  retract: /(?:retract|lead[-_]?out)\s*[:=]?\s*(\w+)/gi,
};

// ============================================================================
// EXTRACTION FUNCTIONS
// ============================================================================

function extractCycles(text: string, sourceFile: string): HyperMillCycle[] {
  const cycles: HyperMillCycle[] = [];
  const lines = text.split("\n");

  // Pattern for cycle headers
  const cycleHeaderPattern = /^(?:\d+\.?\d*\s+)?([A-Z][a-zA-Z\s\-]+(?:Milling|Drilling|Finishing|Roughing|Cutting|Machining|Probing))/;

  let currentCycle: Partial<HyperMillCycle> | null = null;
  let cycleStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] || "").trim();

    // Check for known cycle names
    for (const cycleName of KNOWN_CYCLES) {
      if (line.toLowerCase().includes(cycleName.toLowerCase()) &&
          (line.startsWith(cycleName) || line.match(/^\d+\.?\s/))) {

        // Save previous cycle
        if (currentCycle && currentCycle.name && currentCycle.workflow_steps?.length) {
          cycles.push(finalizeCycle(currentCycle, cycleStartLine));
        }

        // Start new cycle
        currentCycle = {
          name: cycleName,
          category: categorizeCycle(cycleName),
          description: "",
          parameters: [],
          workflow_steps: [],
          tips: [],
          warnings: [],
          related_cycles: [],
          confidence: 0.8,
        };
        cycleStartLine = i;
        break;
      }
    }

    if (!currentCycle) continue;

    // Extract description (first paragraph after title)
    if (!currentCycle.description && line.length > 30 && !line.match(/^\d/)) {
      currentCycle.description = line.slice(0, 500);
    }

    // Extract parameters
    for (const [paramName, pattern] of Object.entries(PARAM_PATTERNS)) {
      pattern.lastIndex = 0;
      const match = line.match(pattern);
      if (match) {
        currentCycle.parameters = currentCycle.parameters || [];
        currentCycle.parameters.push({
          name: paramName,
          type: "numeric",
          description: line.slice(0, 200),
          default_value: match[1],
          unit: match[2] || undefined,
        });
      }
    }

    // Extract numbered steps
    const stepMatch = line.match(/^(\d+)[.)]\s+(.+)/);
    if (stepMatch) {
      currentCycle.workflow_steps = currentCycle.workflow_steps || [];
      currentCycle.workflow_steps.push((stepMatch[2] || "").trim());
    }

    // Extract tips
    if (line.toLowerCase().startsWith("tip:") || line.toLowerCase().startsWith("note:")) {
      currentCycle.tips = currentCycle.tips || [];
      currentCycle.tips.push(line.replace(/^(?:tip|note):\s*/i, ""));
    }

    // Extract warnings
    if (line.toLowerCase().includes("warning") || line.toLowerCase().includes("caution")) {
      currentCycle.warnings = currentCycle.warnings || [];
      currentCycle.warnings.push(line);
    }
  }

  // Save last cycle
  if (currentCycle && currentCycle.name) {
    cycles.push(finalizeCycle(currentCycle, cycleStartLine));
  }

  return cycles;
}

function finalizeCycle(cycle: Partial<HyperMillCycle>, startLine: number): HyperMillCycle {
  return {
    name: cycle.name || "Unknown",
    category: cycle.category || "General",
    description: cycle.description || "",
    parameters: cycle.parameters || [],
    workflow_steps: cycle.workflow_steps || [],
    tips: cycle.tips || [],
    warnings: cycle.warnings || [],
    related_cycles: cycle.related_cycles || [],
    source_page: Math.floor(startLine / 50) + 1,
    confidence: cycle.workflow_steps?.length ? 0.85 : 0.6,
  };
}

function categorizeCycle(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("5-axis") || n.includes("5 axis") || n.includes("swarf")) return "5-Axis Milling";
  if (n.includes("drill") || n.includes("bore")) return "Drilling";
  if (n.includes("thread")) return "Thread Milling";
  if (n.includes("probe")) return "Probing";
  if (n.includes("rough")) return "Roughing";
  if (n.includes("finish") || n.includes("pencil") || n.includes("z-level")) return "3D Finishing";
  if (n.includes("pocket") || n.includes("contour") || n.includes("face")) return "2D Milling";
  if (n.includes("turn")) return "Turning";
  return "3D Milling";
}

function extractFeatures(text: string): HyperMillFeature[] {
  const features: HyperMillFeature[] = [];
  const lines = text.split("\n");

  // Feature patterns
  const featurePatterns = [
    /(?:feature|geometry)\s+(?:type|recognition)[:\s]+([^\n]+)/gi,
    /(?:automatic|intelligent)\s+([a-z\s]+(?:detection|recognition|selection))/gi,
    /(?:supported|available)\s+(?:features|geometries)[:\s]+([^\n]+)/gi,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || "";

    for (const pattern of featurePatterns) {
      pattern.lastIndex = 0;
      const match = line.match(pattern);
      if (match) {
        features.push({
          name: (match[1] || "").trim().slice(0, 100),
          category: "Auto-detected",
          description: lines.slice(i, i + 3).filter(Boolean).join(" ").slice(0, 300),
          supported_operations: [],
          geometry_requirements: [],
          best_practices: [],
          source_page: Math.floor(i / 50) + 1,
        });
      }
    }
  }

  return features.slice(0, 100);
}

function extractProcedures(text: string, sourceFile: string): HyperMillProcedure[] {
  const procedures: HyperMillProcedure[] = [];
  const lines = text.split("\n");

  let currentProcedure: Partial<HyperMillProcedure> | null = null;
  let procedureStartLine = 0;
  let lastStepNum = 0;

  // Common procedure headers
  const procedureHeaders = [
    /how\s+to\s+([^\n]+)/i,
    /(?:procedure|workflow)[:\s]+([^\n]+)/i,
    /(?:steps?\s+)?to\s+(?:create|define|set|configure)\s+([^\n]+)/i,
    /creating\s+(?:a|an|the)\s+([^\n]+)/i,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] || "").trim();

    // Check for procedure start
    for (const pattern of procedureHeaders) {
      const match = line.match(pattern);
      if (match) {
        // Save previous procedure
        if (currentProcedure && currentProcedure.steps?.length && currentProcedure.steps.length >= 2) {
          procedures.push(finalizeProcedure(currentProcedure, procedureStartLine, sourceFile));
        }

        currentProcedure = {
          title: (match[1] || "").trim().slice(0, 100),
          category: categorizeProcedure(match[1] || ""),
          steps: [],
          prerequisites: [],
          tips: [],
          warnings: [],
          related_procedures: [],
          confidence: 0.7,
        };
        procedureStartLine = i;
        lastStepNum = 0;
        break;
      }
    }

    if (!currentProcedure) {
      // Also check for numbered step sequences starting with "1."
      if (line.match(/^1[.)]\s+/)) {
        currentProcedure = {
          title: findProcedureTitle(lines, i),
          category: "General",
          steps: [],
          prerequisites: [],
          tips: [],
          warnings: [],
          related_procedures: [],
          confidence: 0.6,
        };
        procedureStartLine = i;
        lastStepNum = 0;
      }
    }

    if (!currentProcedure) continue;

    // Extract numbered steps
    const stepMatch = line.match(/^(\d+)[.)]\s+(.+)/);
    if (stepMatch) {
      const stepNum = parseInt(stepMatch[1] || "0");
      const stepText = (stepMatch[2] || "").trim();

      if (stepNum === lastStepNum + 1 || stepNum === 1) {
        currentProcedure.steps = currentProcedure.steps || [];
        currentProcedure.steps.push(stepText);
        lastStepNum = stepNum;
      }
    }

    // Extract prerequisites
    if (line.toLowerCase().includes("prerequisite") || line.toLowerCase().includes("before you begin")) {
      currentProcedure.prerequisites = currentProcedure.prerequisites || [];
      currentProcedure.prerequisites.push(line);
    }

    // Extract tips
    if (line.toLowerCase().startsWith("tip:") || line.toLowerCase().startsWith("hint:")) {
      currentProcedure.tips = currentProcedure.tips || [];
      currentProcedure.tips.push(line.replace(/^(?:tip|hint):\s*/i, ""));
    }

    // Extract warnings
    if (line.toLowerCase().startsWith("warning:") || line.toLowerCase().startsWith("caution:")) {
      currentProcedure.warnings = currentProcedure.warnings || [];
      currentProcedure.warnings.push(line.replace(/^(?:warning|caution):\s*/i, ""));
    }
  }

  // Save last procedure
  if (currentProcedure && currentProcedure.steps?.length && currentProcedure.steps.length >= 2) {
    procedures.push(finalizeProcedure(currentProcedure, procedureStartLine, sourceFile));
  }

  return procedures;
}

function findProcedureTitle(lines: string[], stepIndex: number): string {
  // Look backwards for a title
  for (let j = stepIndex - 1; j >= Math.max(0, stepIndex - 10); j--) {
    const prevLine = lines[j]?.trim() || "";
    if (prevLine.length > 5 && prevLine.length < 100 &&
        !prevLine.match(/^\d/) && !prevLine.match(/^[-•*]/)) {
      return prevLine;
    }
  }
  return "Unnamed Procedure";
}

function categorizeProcedure(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("tool") || t.includes("cutter")) return "Tool Setup";
  if (t.includes("stock") || t.includes("workpiece") || t.includes("blank")) return "Stock Setup";
  if (t.includes("origin") || t.includes("coordinate") || t.includes("zero")) return "Coordinate Setup";
  if (t.includes("post") || t.includes("nc") || t.includes("output")) return "Post Processing";
  if (t.includes("simul") || t.includes("verify")) return "Simulation";
  if (t.includes("2d") || t.includes("contour") || t.includes("pocket")) return "2D Operations";
  if (t.includes("3d") || t.includes("surface")) return "3D Operations";
  if (t.includes("5-axis") || t.includes("5 axis") || t.includes("multi")) return "5-Axis Operations";
  if (t.includes("drill") || t.includes("hole")) return "Drilling";
  if (t.includes("turn")) return "Turning";
  return "General";
}

function finalizeProcedure(proc: Partial<HyperMillProcedure>, startLine: number, sourceFile: string): HyperMillProcedure {
  return {
    title: proc.title || "Unnamed",
    category: proc.category || "General",
    steps: proc.steps || [],
    prerequisites: proc.prerequisites || [],
    tips: proc.tips || [],
    warnings: proc.warnings || [],
    related_procedures: proc.related_procedures || [],
    source_file: sourceFile,
    source_page: Math.floor(startLine / 50) + 1,
    confidence: (proc.steps?.length || 0) >= 3 ? 0.85 : 0.65,
  };
}

function extractTroubleshooting(text: string): HyperMillTroubleshooting[] {
  const issues: HyperMillTroubleshooting[] = [];
  const lines = text.split("\n");

  // Troubleshooting patterns
  const problemPatterns = [
    /(?:problem|issue|error)[:\s]+([^\n]+)/gi,
    /(?:if|when)\s+(?:you\s+)?(?:see|get|encounter)\s+([^\n]+)/gi,
    /(?:symptom)[:\s]+([^\n]+)/gi,
  ];

  const solutionPatterns = [
    /(?:solution|fix|resolve)[:\s]+([^\n]+)/gi,
    /(?:try|check|verify)[:\s]+([^\n]+)/gi,
    /(?:to\s+fix)[:\s]+([^\n]+)/gi,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || "";

    for (const pattern of problemPatterns) {
      pattern.lastIndex = 0;
      const match = line.match(pattern);
      if (match) {
        // Look for solution in next few lines
        let solution = "";
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          for (const solPattern of solutionPatterns) {
            solPattern.lastIndex = 0;
            const solMatch = (lines[j] || "").match(solPattern);
            if (solMatch) {
              solution = (solMatch[1] || "").trim();
              break;
            }
          }
          if (solution) break;
        }

        if (solution) {
          issues.push({
            symptom: (match[1] || "").trim().slice(0, 200),
            cause: "",
            solution: solution.slice(0, 300),
            category: categorizeTroubleshooting(match[1] || ""),
            source_page: Math.floor(i / 50) + 1,
          });
        }
      }
    }
  }

  return issues.slice(0, 100);
}

function categorizeTroubleshooting(symptom: string): string {
  const s = symptom.toLowerCase();
  if (s.includes("collision") || s.includes("gouge")) return "Collision";
  if (s.includes("post") || s.includes("nc code")) return "Post Processing";
  if (s.includes("tool") || s.includes("cutter")) return "Tooling";
  if (s.includes("surface") || s.includes("finish")) return "Surface Quality";
  if (s.includes("calculation") || s.includes("compute")) return "Calculation";
  if (s.includes("simulation")) return "Simulation";
  return "General";
}

function extractAutomationConfigs(text: string, sourceFile: string): AutomationCenterConfig[] {
  const configs: AutomationCenterConfig[] = [];
  const lines = text.split("\n");

  // Automation Center specific patterns
  const automationPatterns = [
    /automation\s+center/gi,
    /automatic\s+(?:feature|operation)\s+(?:creation|generation)/gi,
    /template\s+(?:management|configuration)/gi,
    /(?:macro|script)\s+(?:configuration|setup)/gi,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || "";

    for (const pattern of automationPatterns) {
      if (line.match(pattern)) {
        const featureName = line.slice(0, 100);
        const description = lines.slice(i + 1, i + 5).filter(Boolean).join(" ").slice(0, 300);

        configs.push({
          feature: featureName.trim(),
          description,
          setup_steps: [],
          parameters: {},
          source_file: sourceFile,
        });
        break;
      }
    }
  }

  return configs.slice(0, 50);
}

function extractRawTipsAndWarnings(text: string): { tips: string[]; warnings: string[] } {
  const tips: string[] = [];
  const warnings: string[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = (line || "").trim();

    // Tips
    if (trimmed.toLowerCase().startsWith("tip:") ||
        trimmed.toLowerCase().startsWith("note:") ||
        trimmed.toLowerCase().startsWith("hint:") ||
        trimmed.toLowerCase().startsWith("best practice:")) {
      const content = trimmed.replace(/^(?:tip|note|hint|best practice):\s*/i, "").trim();
      if (content.length > 20 && content.length < 500) {
        tips.push(content);
      }
    }

    // Warnings
    if (trimmed.toLowerCase().startsWith("warning:") ||
        trimmed.toLowerCase().startsWith("caution:") ||
        trimmed.toLowerCase().startsWith("important:") ||
        trimmed.toLowerCase().includes("do not ") ||
        trimmed.toLowerCase().includes("never ")) {
      const content = trimmed.replace(/^(?:warning|caution|important):\s*/i, "").trim();
      if (content.length > 20 && content.length < 500) {
        warnings.push(content);
      }
    }
  }

  return {
    tips: [...new Set(tips)].slice(0, 200),
    warnings: [...new Set(warnings)].slice(0, 100),
  };
}

function extractChapterStructure(text: string): string[] {
  const chapters: string[] = [];
  const lines = text.split("\n");

  const chapterPatterns = [
    /^chapter\s*\d+[:\s]+(.+)/i,
    /^\d+\.\s+([A-Z][A-Za-z\s\-]+)$/,
    /^(?:module|section)\s*\d+[:\s]+(.+)/i,
  ];

  for (const line of lines) {
    const trimmed = (line || "").trim();
    for (const pattern of chapterPatterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        chapters.push(match[1].trim());
        break;
      }
    }
  }

  return [...new Set(chapters)].slice(0, 100);
}

// ============================================================================
// PDF PROCESSING
// ============================================================================

async function extractHyperMillPDF(filePath: string): Promise<HyperMillExtraction> {
  const filename = basename(filePath);
  const warnings: string[] = [];

  console.log(`\n  Processing: ${filename}`);

  try {
    const buffer = readFileSync(filePath);
    const sizeMB = buffer.length / 1024 / 1024;

    console.log(`    Size: ${sizeMB.toFixed(1)}MB`);

    if (sizeMB > 100) {
      warnings.push(`Very large file (${sizeMB.toFixed(0)}MB) — extraction may be incomplete`);
    }

    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy?.();

    const text = typeof result === "string" ? result : (result?.text || "");
    const pageCount = typeof result === "object" ? (result.total || 0) : 0;

    console.log(`    Pages: ${pageCount}, Characters: ${text.length.toLocaleString()}`);

    // Extract all knowledge types
    const cycles = extractCycles(text, filename);
    const features = extractFeatures(text);
    const procedures = extractProcedures(text, filename);
    const troubleshooting = extractTroubleshooting(text);
    const automationConfigs = extractAutomationConfigs(text, filename);
    const { tips, warnings: rawWarnings } = extractRawTipsAndWarnings(text);
    const chapters = extractChapterStructure(text);

    console.log(`    Cycles: ${cycles.length}, Features: ${features.length}, Procedures: ${procedures.length}`);
    console.log(`    Tips: ${tips.length}, Warnings: ${rawWarnings.length}, Troubleshooting: ${troubleshooting.length}`);

    return {
      source_pdf: filePath,
      file_size_mb: sizeMB,
      extracted_at: new Date().toISOString(),
      page_count: pageCount,
      text_length: text.length,
      cycles,
      features,
      procedures,
      troubleshooting,
      automation_configs: automationConfigs,
      raw_tips: tips,
      raw_warnings: rawWarnings,
      chapter_structure: chapters,
      warnings,
    };
  } catch (error) {
    warnings.push(`Extraction failed: ${error}`);
    console.error(`    ERROR: ${error}`);
    return {
      source_pdf: filePath,
      file_size_mb: 0,
      extracted_at: new Date().toISOString(),
      page_count: 0,
      text_length: 0,
      cycles: [],
      features: [],
      procedures: [],
      troubleshooting: [],
      automation_configs: [],
      raw_tips: [],
      raw_warnings: [],
      chapter_structure: [],
      warnings,
    };
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║         hyperMILL Deep Extraction Pipeline                   ║");
  console.log("║         Extracting maximum value from all hyperMILL docs     ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  const OUTPUT_DIR = "H:/prism/mcp-server/data/extracted-knowledge/hypermill";
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // All hyperMILL PDF locations
  const HYPERMILL_SOURCES = [
    "H:/prism/Resources/PDF/hyperMILL",
    "H:/prism/Resources/RESOURCE PDFS",
  ];

  // Find all hyperMILL PDFs
  const hypermillPDFs: string[] = [];

  for (const sourceDir of HYPERMILL_SOURCES) {
    if (!existsSync(sourceDir)) {
      console.log(`  Source not found: ${sourceDir}`);
      continue;
    }

    const files = readdirSync(sourceDir);
    for (const file of files) {
      const lower = file.toLowerCase();
      if (lower.endsWith(".pdf") && (lower.includes("hypermill") || lower.includes("hypercad"))) {
        const fullPath = join(sourceDir, file);
        const stats = statSync(fullPath);
        hypermillPDFs.push(fullPath);
        console.log(`  Found: ${file} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);
      }
    }
  }

  // Also check for Automation Center docs
  const automationCenterDir = "H:/prism/Resources/PDF/hyperMILL";
  if (existsSync(automationCenterDir)) {
    const acFiles = readdirSync(automationCenterDir);
    for (const file of acFiles) {
      if (file.toLowerCase().endsWith(".pdf") &&
          (file.toLowerCase().includes("automation") ||
           file.toLowerCase().includes("server") ||
           file.toLowerCase().includes("tool report"))) {
        const fullPath = join(automationCenterDir, file);
        if (!hypermillPDFs.includes(fullPath)) {
          hypermillPDFs.push(fullPath);
          console.log(`  Found (AC): ${file}`);
        }
      }
    }
  }

  console.log(`\n  Total hyperMILL PDFs: ${hypermillPDFs.length}`);

  // Sort by size (process smaller files first for quick wins)
  hypermillPDFs.sort((a, b) => {
    return statSync(a).size - statSync(b).size;
  });

  // Process all PDFs
  const results: HyperMillExtraction[] = [];
  let totalCycles = 0;
  let totalFeatures = 0;
  let totalProcedures = 0;
  let totalTips = 0;
  let totalWarnings = 0;
  let totalTroubleshooting = 0;

  for (const pdfPath of hypermillPDFs) {
    try {
      const result = await extractHyperMillPDF(pdfPath);
      results.push(result);
      totalCycles += result.cycles.length;
      totalFeatures += result.features.length;
      totalProcedures += result.procedures.length;
      totalTips += result.raw_tips.length;
      totalWarnings += result.raw_warnings.length;
      totalTroubleshooting += result.troubleshooting.length;
    } catch (err) {
      console.error(`  Failed to process ${basename(pdfPath)}: ${err}`);
    }
  }

  // Aggregate unique tips and warnings
  const allTips = new Set<string>();
  const allWarnings = new Set<string>();
  const allCycleNames = new Set<string>();
  const allProcedureCategories: Record<string, number> = {};

  for (const r of results) {
    r.raw_tips.forEach(t => allTips.add(t));
    r.raw_warnings.forEach(w => allWarnings.add(w));
    r.cycles.forEach(c => allCycleNames.add(c.name));
    r.procedures.forEach(p => {
      allProcedureCategories[p.category] = (allProcedureCategories[p.category] || 0) + 1;
    });
  }

  // Save detailed results
  const timestamp = Date.now();
  const outputPath = join(OUTPUT_DIR, `hypermill-deep-extraction-${timestamp}.json`);

  const summary = {
    extraction_id: `hypermill-deep-${timestamp}`,
    extracted_at: new Date().toISOString(),
    source: "hyperMILL Documentation Suite",
    version: "2024+",
    pdfs_processed: results.length,
    total_pages: results.reduce((sum, r) => sum + r.page_count, 0),
    total_characters: results.reduce((sum, r) => sum + r.text_length, 0),

    totals: {
      cycles: totalCycles,
      features: totalFeatures,
      procedures: totalProcedures,
      tips: allTips.size,
      warnings: allWarnings.size,
      troubleshooting: totalTroubleshooting,
    },

    cycle_names: [...allCycleNames].sort(),
    procedure_categories: allProcedureCategories,

    // Full results
    by_source: results,
  };

  writeFileSync(outputPath, JSON.stringify(summary, null, 2));

  // Save tips separately for easy loading
  const tipsPath = join(OUTPUT_DIR, `hypermill-tips-${timestamp}.json`);
  writeFileSync(tipsPath, JSON.stringify({
    source: "hyperMILL Documentation",
    extracted_at: new Date().toISOString(),
    count: allTips.size,
    tips: [...allTips],
    warnings: [...allWarnings],
  }, null, 2));

  // Summary output
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                    EXTRACTION SUMMARY                        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`  PDFs Processed:     ${results.length}`);
  console.log(`  Total Pages:        ${summary.total_pages.toLocaleString()}`);
  console.log(`  Total Characters:   ${summary.total_characters.toLocaleString()}`);
  console.log("");
  console.log(`  Cycles Extracted:       ${totalCycles}`);
  console.log(`  Features Extracted:     ${totalFeatures}`);
  console.log(`  Procedures Extracted:   ${totalProcedures}`);
  console.log(`  Tips Extracted:         ${allTips.size}`);
  console.log(`  Warnings Extracted:     ${allWarnings.size}`);
  console.log(`  Troubleshooting Items:  ${totalTroubleshooting}`);
  console.log("");
  console.log(`  Procedure Categories:`);
  for (const [cat, count] of Object.entries(allProcedureCategories).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`    ${cat}: ${count}`);
  }
  console.log("");
  console.log(`  Output: ${outputPath}`);
  console.log(`  Tips:   ${tipsPath}`);
}

main().catch(console.error);
