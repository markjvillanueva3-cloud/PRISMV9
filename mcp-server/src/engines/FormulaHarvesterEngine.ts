/**
 * FormulaHarvesterEngine — RES-MS1: Extract formulas from JS knowledge files
 *
 * Parses the 3 JS formula files in resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS/
 * and converts structured formula objects into FormulaRegistry entries.
 *
 * Source files:
 *   - PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js (3,223 lines, ~88 formulas)
 *   - PRISM_ADVANCED_CROSS_DOMAIN_v1.js (755 lines, ~30 formulas)
 *   - PRISM_UNIVERSITY_COURSE_REFERENCE_v1.js (2,604 lines, ~9 algorithms)
 *
 * @module engines/FormulaHarvesterEngine
 */

import { log } from "../utils/Logger.js";
import type { Formula, FormulaParameter } from "../registries/FormulaRegistry.js";

// ============================================================================
// TYPES
// ============================================================================

export interface HarvestedFormula {
  formulaId: string;
  name: string;
  domain: string;
  category: string;
  equation: string;
  description: string;
  prismApplication: string;
  sourceFile: string;
  sourcePath: string[];
  hasImplementation: boolean;
  parameterNames: string[];
  insight?: string;
  constants?: Record<string, number>;
}

export interface HarvestResult {
  totalFormulas: number;
  byFile: Record<string, number>;
  byDomain: Record<string, number>;
  formulas: HarvestedFormula[];
  registryEntries: Formula[];
  timestamp: string;
}

// ============================================================================
// FORMULA SOURCE FILES
// ============================================================================

const FORMULA_ROOT = "H:/prism/resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS";

const SOURCE_FILES = [
  {
    filename: "PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js",
    objectName: "PRISM_CROSS_DISCIPLINARY",
    expectedFormulas: 88,
  },
  {
    filename: "PRISM_ADVANCED_CROSS_DOMAIN_v1.js",
    objectName: "PRISM_ADVANCED_CROSS_DOMAIN",
    expectedFormulas: 30,
  },
  {
    filename: "PRISM_UNIVERSITY_COURSE_REFERENCE_v1.js",
    objectName: "PRISM_COURSE_REFERENCE",
    expectedFormulas: 9,
  },
];

// ============================================================================
// PARSING — Extract formula blocks from JS source
// ============================================================================

/**
 * Extract formula entries from a JS file using regex pattern matching.
 * Finds objects with `description`, `formula` or `implementation`, and `prismApplication`.
 */
function extractFormulas(content: string, filename: string): HarvestedFormula[] {
  const formulas: HarvestedFormula[] = [];

  // Track section hierarchy for domain/category extraction
  const sectionStack: string[] = [];
  const lines = content.split("\n");
  let currentDomain = "general";
  let currentCategory = "general";

  // Extract section headers from comments
  for (const line of lines) {
    const sectionMatch = line.match(/SECTION\s+\d+:\s+(.+)/);
    if (sectionMatch) {
      currentDomain = sectionMatch[1].trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    }
  }

  // Extract formula blocks using regex for the common pattern:
  // propertyName: { description: "...", formula: "...", implementation: function(...) {...}, prismApplication: "..." }
  const formulaBlockRegex = /(\w+):\s*\{[^{}]*?description:\s*"([^"]+)"[^{}]*?(?:formula:\s*"([^"]*)")?[^{}]*?(?:prismApplication:\s*"([^"]*)")?/g;
  let match: RegExpExecArray | null;

  // More targeted approach: find all objects with prismApplication
  const prismAppRegex = /prismApplication:\s*"([^"]+)"/g;
  const prismApps: { index: number; app: string }[] = [];
  while ((match = prismAppRegex.exec(content)) !== null) {
    prismApps.push({ index: match.index, app: match[1] });
  }

  for (const pa of prismApps) {
    // Walk backwards from prismApplication to find the containing block
    const blockStart = findBlockStart(content, pa.index);
    const blockEnd = findBlockEnd(content, pa.index);
    if (blockStart === -1 || blockEnd === -1) continue;

    const block = content.substring(blockStart, blockEnd + 1);

    // Extract fields from the block
    const descMatch = block.match(/description:\s*"([^"]+)"/);
    const formulaMatch = block.match(/formula:\s*"([^"]+)"/);
    const nameMatch = findPropertyName(content, blockStart);
    const insightMatch = block.match(/insight:\s*"([^"]+)"/);
    const hasImpl = block.includes("implementation:") && block.includes("function");

    // Extract function parameter names
    const paramMatch = block.match(/implementation:\s*function\s*\(([^)]*)\)/);
    const paramNames = paramMatch
      ? paramMatch[1].split(",").map(p => p.trim().split("=")[0].trim()).filter(p => p)
      : [];

    // Extract constants
    const constants: Record<string, number> = {};
    const constRegex = /(\w+):\s*([0-9.e+-]+)/g;
    const constBlock = block.match(/constants:\s*\{([^}]+)\}/);
    if (constBlock) {
      let cm: RegExpExecArray | null;
      while ((cm = constRegex.exec(constBlock[1])) !== null) {
        constants[cm[1]] = parseFloat(cm[2]);
      }
    }

    // Extract section context
    const beforeBlock = content.substring(Math.max(0, blockStart - 2000), blockStart);
    const sectionHeaders = [...beforeBlock.matchAll(/SECTION\s+\d+:\s+(.+)/g)];
    const domain = sectionHeaders.length > 0
      ? sectionHeaders[sectionHeaders.length - 1][1].trim().toLowerCase().replace(/[^a-z0-9_ ]/g, "").replace(/\s+/g, "_")
      : "cross_domain";

    const subHeaders = [...beforeBlock.matchAll(/\/\/\s+([A-Z][A-Z ]+[A-Z])\s*[-—]/g)];
    const category = subHeaders.length > 0
      ? subHeaders[subHeaders.length - 1][1].trim().toLowerCase().replace(/\s+/g, "_")
      : "general";

    // Build path from nested property names
    const path = buildPath(content, blockStart);

    const name = nameMatch || "unknown";
    const desc = descMatch ? descMatch[1] : "";
    const formula = formulaMatch ? formulaMatch[1] : "";

    if (!desc && !formula) continue;

    const formulaId = `F-HARVEST-${filename.replace(/[^A-Z0-9]/gi, "").substring(0, 6)}-${String(formulas.length + 1).padStart(3, "0")}`;

    formulas.push({
      formulaId,
      name: camelToTitle(name),
      domain,
      category,
      equation: formula,
      description: desc,
      prismApplication: pa.app,
      sourceFile: filename,
      sourcePath: path,
      hasImplementation: hasImpl,
      parameterNames: paramNames,
      insight: insightMatch ? insightMatch[1] : undefined,
      constants: Object.keys(constants).length > 0 ? constants : undefined,
    });
  }

  return formulas;
}

/** Find the start of the containing object literal */
function findBlockStart(content: string, fromIndex: number): number {
  let braceDepth = 0;
  for (let i = fromIndex; i >= 0; i--) {
    if (content[i] === "}") braceDepth++;
    if (content[i] === "{") {
      if (braceDepth === 0) return i;
      braceDepth--;
    }
  }
  return -1;
}

/** Find the end of the containing object literal */
function findBlockEnd(content: string, fromIndex: number): number {
  let braceDepth = 0;
  // First find matching opening brace
  const start = findBlockStart(content, fromIndex);
  if (start === -1) return -1;

  for (let i = start; i < content.length; i++) {
    if (content[i] === "{") braceDepth++;
    if (content[i] === "}") {
      braceDepth--;
      if (braceDepth === 0) return i;
    }
  }
  return -1;
}

/** Find the property name before a block start */
function findPropertyName(content: string, blockStart: number): string | null {
  const before = content.substring(Math.max(0, blockStart - 200), blockStart);
  const nameMatch = before.match(/(\w+)\s*:\s*\{?\s*$/);
  return nameMatch ? nameMatch[1] : null;
}

/** Build a path of nested property names */
function buildPath(content: string, position: number): string[] {
  const path: string[] = [];
  const before = content.substring(0, position);
  const nameMatches = [...before.matchAll(/(\w+)\s*:\s*\{/g)];
  // Take last 3 for context
  const recent = nameMatches.slice(-3);
  for (const m of recent) {
    if (m[1] && !["const", "var", "let", "function", "return"].includes(m[1])) {
      path.push(m[1]);
    }
  }
  return path;
}

/** Convert camelCase to Title Case */
function camelToTitle(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

// ============================================================================
// CONVERSION — HarvestedFormula to FormulaRegistry Formula
// ============================================================================

function toRegistryEntry(h: HarvestedFormula): Formula {
  const params: FormulaParameter[] = h.parameterNames.map((p, i) => ({
    name: p,
    symbol: p,
    unit: "-",
    description: `Parameter ${p}`,
    type: (i === h.parameterNames.length - 1 ? "output" : "input") as "input" | "output",
  }));

  return {
    formula_id: h.formulaId,
    name: h.name,
    domain: h.domain,
    category: h.category,
    equation: h.equation,
    equation_plain: h.equation,
    parameters: params,
    validation: {
      required_inputs: h.parameterNames.slice(0, -1),
    },
    description: h.description,
    consumers: [h.prismApplication.split(" - ")[0].trim()],
    source: `resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS/${h.sourceFile}`,
    version: "1.0.0-harvested",
    last_updated: new Date().toISOString().split("T")[0],
  };
}

// ============================================================================
// ENGINE
// ============================================================================

class FormulaHarvesterEngineImpl {

  /**
   * Harvest all formulas from the 3 JS knowledge files.
   * Reads files from disk, parses formula blocks, and converts to registry format.
   */
  static async harvest(): Promise<HarvestResult> {
    const { readFile } = await import("fs/promises");
    const allFormulas: HarvestedFormula[] = [];
    const byFile: Record<string, number> = {};
    const byDomain: Record<string, number> = {};

    for (const src of SOURCE_FILES) {
      const filePath = `${FORMULA_ROOT}/${src.filename}`;
      try {
        const content = await readFile(filePath, "utf-8");
        const formulas = extractFormulas(content, src.filename);
        allFormulas.push(...formulas);
        byFile[src.filename] = formulas.length;

        log.info(`FormulaHarvester: extracted ${formulas.length} formulas from ${src.filename}`);
      } catch (err) {
        log.error(`FormulaHarvester: failed to read ${src.filename}: ${err}`);
        byFile[src.filename] = 0;
      }
    }

    // Count by domain
    for (const f of allFormulas) {
      byDomain[f.domain] = (byDomain[f.domain] || 0) + 1;
    }

    const registryEntries = allFormulas.map(toRegistryEntry);

    return {
      totalFormulas: allFormulas.length,
      byFile,
      byDomain,
      formulas: allFormulas,
      registryEntries,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get a summary of what's available without full parsing.
   */
  static getSources(): {
    files: Array<{ filename: string; expectedFormulas: number }>;
    totalExpected: number;
    rootPath: string;
  } {
    return {
      files: SOURCE_FILES.map(f => ({
        filename: f.filename,
        expectedFormulas: f.expectedFormulas,
      })),
      totalExpected: SOURCE_FILES.reduce((sum, f) => sum + f.expectedFormulas, 0),
      rootPath: FORMULA_ROOT,
    };
  }

  /**
   * Harvest and return just the count + domain breakdown (lightweight check).
   */
  static async audit(): Promise<{
    totalHarvested: number;
    byFile: Record<string, number>;
    byDomain: Record<string, number>;
    withImplementation: number;
    withConstants: number;
    uniqueConsumers: string[];
  }> {
    const result = await FormulaHarvesterEngineImpl.harvest();
    return {
      totalHarvested: result.totalFormulas,
      byFile: result.byFile,
      byDomain: result.byDomain,
      withImplementation: result.formulas.filter(f => f.hasImplementation).length,
      withConstants: result.formulas.filter(f => f.constants && Object.keys(f.constants).length > 0).length,
      uniqueConsumers: [...new Set(result.formulas.map(f => f.prismApplication.split(" - ")[0].trim()))],
    };
  }
}

export { FormulaHarvesterEngineImpl as FormulaHarvesterEngine };
export const formulaHarvesterEngine = new (FormulaHarvesterEngineImpl as any)() as FormulaHarvesterEngineImpl;
