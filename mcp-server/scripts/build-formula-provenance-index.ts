#!/usr/bin/env node
/**
 * build-formula-provenance-index — index mapping formulas to their provenance
 *
 * Universal Phase 0.7. Creates FORMULA_PROVENANCE_INDEX.json which maps every
 * formula to its sources, references, domains, and consumers. Backs
 * AwarenessQueryEngine.formulaProvenance() and duplicate detection.
 *
 * Output: mcp-server/data/state/FORMULA_PROVENANCE_INDEX.json
 *
 * @module scripts/build-formula-provenance-index
 * @phase Universal 0.7 Reverse Index Layer
 */

import { promises as fs } from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const REGISTRIES_DIR = path.join(ROOT, "src", "registries");
const ENGINES_DIR = path.join(ROOT, "src", "engines");
const DATA_DIR = path.join(ROOT, "data");
const OUTPUT_PATH = path.join(ROOT, "data", "state", "FORMULA_PROVENANCE_INDEX.json");

// ============================================================================
// TYPES
// ============================================================================

export interface FormulaProvenance {
  name: string;
  formulaId: string;
  domain: string;
  category: string;
  equation: string;
  references: string[];
  source: string | null;
  consumers: string[];
  enginesUsing: string[];
  sha256: string;
}

export interface FormulaProvenanceIndex {
  schemaVersion: number;
  lastUpdated: string;
  formulaCount: number;
  formulas: Record<string, FormulaProvenance>;
  byDomain: Record<string, string[]>;
  byReference: Record<string, string[]>;
}

// ============================================================================
// PARSER FUNCTIONS
// ============================================================================

/**
 * Extract formulas from FormulaRegistry.ts
 */
async function extractFormulasFromRegistry(): Promise<FormulaProvenance[]> {
  const formulas: FormulaProvenance[] = [];
  const registryPath = path.join(REGISTRIES_DIR, "FormulaRegistry.ts");

  try {
    const content = await fs.readFile(registryPath, "utf-8");

    // Look for formula definitions in the FORMULA_SOURCE_FILE_CATALOG
    const catalogMatch = content.match(/FORMULA_SOURCE_FILE_CATALOG[^{]*\{([\s\S]*?)\n\};/);
    if (catalogMatch) {
      const catalogContent = catalogMatch[1];
      const entryPattern = /"([^"]+)":\s*\{([^}]+)\}/g;
      let m: RegExpExecArray | null;

      while ((m = entryPattern.exec(catalogContent))) {
        const formulaId = m[1];
        const props = m[2];

        const category = props.match(/category:\s*"([^"]+)"/)?.[1] || "";
        const desc = props.match(/description:\s*"([^"]+)"/)?.[1] || "";
        const formulasProvided = props.match(/formulas_provided:\s*\[([\s\S]*?)\]/)?.[1] || "";
        const consumers = props.match(/consumers:\s*\[([\s\S]*?)\]/)?.[1] || "";

        const formulaNames = formulasProvided.match(/"([^"]+)"/g)?.map((s) => s.replace(/"/g, "")) || [];
        const consumerList = consumers.match(/"([^"]+)"/g)?.map((s) => s.replace(/"/g, "")) || [];

        for (const name of formulaNames) {
          formulas.push({
            name,
            formulaId,
            domain: category.split("_")[0] || "physics",
            category,
            equation: "",
            references: [],
            source: `FormulaRegistry.ts:${formulaId}`,
            consumers: consumerList,
            enginesUsing: [],
            sha256: crypto.createHash("sha256").update(name + formulaId).digest("hex").slice(0, 16),
          });
        }
      }
    }

    // Also extract from CORE_FORMULAS if present
    const coreMatch = content.match(/CORE_FORMULAS[^=]*=\s*\[([\s\S]*?)\n\];/);
    if (coreMatch) {
      const coreContent = coreMatch[1];
      const formulaPattern = /formula_id:\s*"([^"]+)"/g;
      const namePattern = /name:\s*"([^"]+)"/g;
      const domainPattern = /domain:\s*"([^"]+)"/g;
      const categoryPattern = /category:\s*"([^"]+)"/g;
      const equationPattern = /equation_plain:\s*"([^"]+)"/g;
      const refPattern = /references:\s*\[([\s\S]*?)\]/g;

      let idMatch: RegExpExecArray | null;
      while ((idMatch = formulaPattern.exec(coreContent))) {
        const id = idMatch[1];
        const nameMatch = namePattern.exec(coreContent);
        const domainMatch = domainPattern.exec(coreContent);
        const catMatch = categoryPattern.exec(coreContent);
        const eqMatch = equationPattern.exec(coreContent);
        const refsMatch = refPattern.exec(coreContent);

        const refs = refsMatch
          ? (refsMatch[1].match(/"([^"]+)"/g)?.map((s) => s.replace(/"/g, "")) || [])
          : [];

        formulas.push({
          name: nameMatch?.[1] || id,
          formulaId: id,
          domain: domainMatch?.[1] || "physics",
          category: catMatch?.[1] || "",
          equation: eqMatch?.[1] || "",
          references: refs,
          source: "FormulaRegistry.ts:CORE_FORMULAS",
          consumers: [],
          enginesUsing: [],
          sha256: crypto.createHash("sha256").update(id).digest("hex").slice(0, 16),
        });
      }
    }
  } catch {
    // Registry not found
  }

  return formulas;
}

/**
 * Extract formulas from data JSON files
 */
async function extractFormulasFromData(): Promise<FormulaProvenance[]> {
  const formulas: FormulaProvenance[] = [];
  const formulaFiles = [
    "formulas/kienzle-formulas.json",
    "formulas/taylor-formulas.json",
    "formulas/physics-formulas.json",
    "tribal-tips/wedm-formulas.json",
    "hypermill-extracted/formulas.json",
  ];

  for (const file of formulaFiles) {
    const filePath = path.join(DATA_DIR, file);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(content);
      const formulaList = Array.isArray(data) ? data : data.formulas || [];

      for (const f of formulaList) {
        if (f.name || f.formula_id || f.id) {
          formulas.push({
            name: f.name || f.formula_id || f.id,
            formulaId: f.formula_id || f.id || f.name,
            domain: f.domain || path.basename(file, ".json"),
            category: f.category || "",
            equation: f.equation_plain || f.equation || f.formula || "",
            references: f.references || [],
            source: file,
            consumers: f.consumers || [],
            enginesUsing: [],
            sha256: crypto.createHash("sha256").update(JSON.stringify(f)).digest("hex").slice(0, 16),
          });
        }
      }
    } catch {
      // File not found
    }
  }

  return formulas;
}

/**
 * Find engines that reference formulas
 */
async function findEngineFormulaUsage(formulaNames: Set<string>): Promise<Record<string, string[]>> {
  const usage: Record<string, string[]> = {};

  try {
    const files = await fs.readdir(ENGINES_DIR);
    for (const file of files) {
      if (!file.endsWith(".ts")) continue;

      const filePath = path.join(ENGINES_DIR, file);
      try {
        const content = await fs.readFile(filePath, "utf-8");
        const contentLower = content.toLowerCase();

        for (const name of formulaNames) {
          const nameLower = name.toLowerCase();
          if (contentLower.includes(nameLower) || content.includes(name)) {
            if (!usage[name]) usage[name] = [];
            if (!usage[name].includes(file)) {
              usage[name].push(file);
            }
          }
        }
      } catch {
        // Skip unreadable
      }
    }
  } catch {
    // Engines dir not found
  }

  return usage;
}

/**
 * Build the complete formula provenance index
 */
export async function buildFormulaProvenanceIndex(opts: { verbose?: boolean } = {}): Promise<FormulaProvenanceIndex> {
  const allFormulas: FormulaProvenance[] = [];

  // Collect from registry
  const registryFormulas = await extractFormulasFromRegistry();
  allFormulas.push(...registryFormulas);
  if (opts.verbose) {
    console.log(`[build-formula-provenance-index] Found ${registryFormulas.length} formulas in registry`);
  }

  // Collect from data files
  const dataFormulas = await extractFormulasFromData();
  allFormulas.push(...dataFormulas);
  if (opts.verbose) {
    console.log(`[build-formula-provenance-index] Found ${dataFormulas.length} formulas in data files`);
  }

  // Dedupe by formulaId
  const formulaMap: Record<string, FormulaProvenance> = {};
  for (const f of allFormulas) {
    const key = f.formulaId || f.name;
    if (!formulaMap[key]) {
      formulaMap[key] = f;
    } else {
      // Merge
      formulaMap[key].references = [...new Set([...formulaMap[key].references, ...f.references])];
      formulaMap[key].consumers = [...new Set([...formulaMap[key].consumers, ...f.consumers])];
      if (!formulaMap[key].equation && f.equation) {
        formulaMap[key].equation = f.equation;
      }
    }
  }

  // Find engine usage
  const formulaNames = new Set(Object.keys(formulaMap));
  const engineUsage = await findEngineFormulaUsage(formulaNames);

  for (const [name, engines] of Object.entries(engineUsage)) {
    if (formulaMap[name]) {
      formulaMap[name].enginesUsing = engines;
    }
  }

  // Build reverse indexes
  const byDomain: Record<string, string[]> = {};
  const byReference: Record<string, string[]> = {};

  for (const [key, formula] of Object.entries(formulaMap)) {
    // By domain
    if (!byDomain[formula.domain]) byDomain[formula.domain] = [];
    byDomain[formula.domain].push(key);

    // By reference
    for (const ref of formula.references) {
      const refKey = ref.slice(0, 50); // Truncate long refs
      if (!byReference[refKey]) byReference[refKey] = [];
      if (!byReference[refKey].includes(key)) {
        byReference[refKey].push(key);
      }
    }
  }

  const index: FormulaProvenanceIndex = {
    schemaVersion: 1,
    lastUpdated: new Date().toISOString(),
    formulaCount: Object.keys(formulaMap).length,
    formulas: formulaMap,
    byDomain,
    byReference,
  };

  if (opts.verbose) {
    console.log(`  Done. ${index.formulaCount} formulas indexed, ${Object.keys(byDomain).length} domains, ${Object.keys(byReference).length} refs.`);
  }

  return index;
}

/**
 * Write index to disk
 */
export async function writeFormulaProvenanceIndex(index: FormulaProvenanceIndex): Promise<void> {
  const dir = path.dirname(OUTPUT_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(index, null, 2));
}

/**
 * Read index from disk
 */
export async function readFormulaProvenanceIndex(): Promise<FormulaProvenanceIndex | null> {
  try {
    const content = await fs.readFile(OUTPUT_PATH, "utf-8");
    return JSON.parse(content) as FormulaProvenanceIndex;
  } catch {
    return null;
  }
}

// ============================================================================
// CLI
// ============================================================================

async function main(): Promise<void> {
  const verbose = process.argv.includes("--verbose");
  const json = process.argv.includes("--json");

  console.log("[build-formula-provenance-index] Scanning...");
  const start = Date.now();
  const index = await buildFormulaProvenanceIndex({ verbose });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (json) {
    console.log(JSON.stringify(index, null, 2));
    return;
  }

  await writeFormulaProvenanceIndex(index);
  console.log(`[build-formula-provenance-index] Wrote ${OUTPUT_PATH} (${elapsed}s)`);

  const withRefs = Object.values(index.formulas).filter((f) => f.references.length > 0).length;
  const withEngines = Object.values(index.formulas).filter((f) => f.enginesUsing.length > 0).length;

  console.log(`build-formula-provenance-index — ${index.formulaCount} formulas indexed`);
  console.log(`  with references: ${withRefs}`);
  console.log(`  with engine usage: ${withEngines}`);
  console.log(`  domains: ${Object.keys(index.byDomain).length}`);
}

// Only run main when invoked directly
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]).toLowerCase() : "";
const thisPath = fileURLToPath(import.meta.url).toLowerCase();
if (invokedPath === thisPath) {
  main().catch((err) => {
    console.error("build-formula-provenance-index failed:", err);
    process.exit(2);
  });
}
