#!/usr/bin/env node
/**
 * database-registry.mjs -- the CANONICAL registry of PRISM's persistent databases.
 *
 * Operator goal (2026-06-14, slot:papa): "ensure ALL databases are connected to the
 * Obsidian vault. Machines, tools, materials, tooling, vendors, potential customers,
 * jm die data, fixtures." This registry is the single source of truth that the
 * `databases-to-vault.mjs` bridge iterates to emit one DATA-CONTENTS-INVENTORY vault
 * note per database (so the brain can semantic-search every store: where it lives, how
 * many records, its schema, how to query it). It is the structured form of the
 * CLAUDE.md doctrine [[feedback_never_assume_data_file_contents]] ("maintain a
 * DATA-CONTENTS INVENTORY -- counts + schema + a real sample").
 *
 * Counts are RESOLVED at run time from each store's manifest/file (never hard-coded --
 * counts rot). The resolver is pure + fail-soft: a missing store yields count:null + a
 * reason, never a throw (R12 -- a not-yet-built store is reported as a GAP, not faked).
 *
 * Extend by adding a DATABASES entry (id unique). Re-run the bridge to refresh the vault.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * The 8 operator-named databases. Each maps to its canonical on-disk source(s) + a
 * runtime count resolver + a query hint. `primarySource` drives the headline count.
 */
export const DATABASES = [
  {
    id: "machines",
    displayName: "Machine Database",
    category: "manufacturing-asset",
    galaxies: ["mill", "lathe", "wedm", "shop-floor"],
    description:
      "Machine tools: travels, spindle, power, controller, kinematics. Reference-DB machine stores + the live JM Die fleet (21 machines) + the machine-def ontology.",
    primarySource: "mcp-server/data/prism-reference-db",
    count: { type: "manifest-category", manifest: "mcp-server/data/prism-reference-db/MANIFEST.json", category: "machines", field: "records" },
    sources: [
      { path: "mcp-server/data/prism-reference-db", role: "primary (monolith-extracted machine stores)" },
      { path: "mcp-server/data/state/ontology/machine-def-ontology.json", role: "machine-definition ontology" },
      { path: "mcp-server/src/data/jm-die-profile.ts", role: "live JM Die fleet (21 machines, canonical)" },
      { path: "mcp-server/src/engines/ShopConfigurationEngine.ts", role: "21-machine shop config engine" },
    ],
    schemaHint: "machine spec records: id, builder, model, travels (x/y/z), spindle (rpm/power/taper), controller, kinematics",
    queryHint: "node scripts/db-toolbelt.mjs --status ; prism_dev reference-db query ; ShopConfigurationEngine.getMachines()",
  },
  {
    id: "tools",
    displayName: "Cutting-Tool Database",
    category: "manufacturing-asset",
    galaxies: ["mill", "lathe", "cam", "speed-feed"],
    description:
      "Cutting tools: end mills, drills, taps, inserts geometry + cutting data + wear limits. Reference-DB tool stores; hyperMILL tool_database.json defines the UI/parameter schema (39 params, inputs to KIENZLE_FORCE + TAYLOR_TOOL_LIFE).",
    primarySource: "mcp-server/data/prism-reference-db",
    count: { type: "manifest-category", manifest: "mcp-server/data/prism-reference-db/MANIFEST.json", category: "tools", field: "records" },
    sources: [
      { path: "mcp-server/data/prism-reference-db", role: "primary (monolith-extracted tool stores)" },
      { path: "mcp-server/data/cam-functions/hypermill/tool_database.json", role: "hyperMILL tool UI/parameter schema (39 params)" },
      { path: "mcp-server/data/training/hypermill-tool-db-extracted.json", role: "extracted hyperMILL tool records" },
    ],
    schemaHint: "tool records: type, diameter, flutes, geometry, coating, material, cutting_data (vc/fz per ISO group), wear limits",
    queryHint: "node scripts/db-toolbelt.mjs --status ; prism_dev reference-db query category=tools",
  },
  {
    id: "materials",
    displayName: "Material Database",
    category: "manufacturing-asset",
    galaxies: ["speed-feed", "mill", "lathe", "wedm"],
    description:
      "Workpiece materials: ISO groups (P/M/K/N/S/H), Kienzle kc1.1 + mc, hardness, machinability, thermal. Reference-DB material stores; canonical kc constants live in src/physics/constants.ts (never duplicated).",
    primarySource: "mcp-server/data/prism-reference-db",
    count: { type: "manifest-category", manifest: "mcp-server/data/prism-reference-db/MANIFEST.json", category: "materials", field: "records" },
    sources: [
      { path: "mcp-server/data/prism-reference-db", role: "primary (monolith-extracted material stores)" },
      { path: "mcp-server/src/physics/constants.ts", role: "canonical kc1.1 / mc / Taylor constants (CANONICAL_MATERIAL_DB)" },
    ],
    schemaHint: "material records: name, iso_group, kc1_1_mpa, mc, hardness_hb, machinability_pct, thermal_conductivity",
    queryHint: "node scripts/db-toolbelt.mjs --status ; prism_calc material lookup ; prism_dev reference-db query category=materials",
  },
  {
    id: "tooling",
    displayName: "Tooling Database (holders + inserts)",
    category: "manufacturing-asset",
    galaxies: ["mill", "lathe", "cam"],
    description:
      "Tool holders + inserts: holder tapers/geometry/runout (collision + deflection inputs) and indexable insert grades/geometry. Reference-DB holders + inserts categories; vendor-catalog-db carries tool-holder / tooling-consumable vendors.",
    primarySource: "mcp-server/data/prism-reference-db",
    count: { type: "manifest-category-sum", manifest: "mcp-server/data/prism-reference-db/MANIFEST.json", categories: ["holders", "inserts"], field: "records" },
    sources: [
      { path: "mcp-server/data/prism-reference-db", role: "primary (holders + inserts categories)" },
      { path: "mcp-server/data/vendor-catalog-db", role: "tool-holder + tooling-consumable vendors" },
    ],
    schemaHint: "holder records: taper, gauge length, runout, balance; insert records: ISO designation, grade, coating, geometry, chipbreaker",
    queryHint: "node scripts/db-toolbelt.mjs --status ; prism_dev reference-db query category=holders|inserts",
  },
  {
    id: "vendors",
    displayName: "Vendor / Supplier Database",
    category: "business",
    galaxies: ["business", "quoting", "speed-feed"],
    description:
      "Supplier directory: machine builders, tooling consumables, fixturing, outside processes, materials, freight. Includes catalogs, SFC-maker pointers, and JM Die procurement spend cross-ref.",
    primarySource: "mcp-server/data/vendor-catalog-db",
    count: { type: "manifest-path", manifest: "mcp-server/data/vendor-catalog-db/manifest.json", path: "counts.vendors" },
    sources: [
      { path: "mcp-server/data/vendor-catalog-db", role: "primary (482 vendors, 114 catalogs, 169 SFC makers, 49 JM tool vendors)" },
    ],
    schemaHint: "vendor records: vendor_id, name, vendor_type, categories, website, reach, regions, pricing_access, has_api, jm spend",
    queryHint: "node scripts/db-toolbelt.mjs --run vendor-catalog-db ; vendor-catalog-db/tables/vendors.jsonl",
    existingVaultNote: "reference_vendor_catalog_db_2026_05_31.md",
  },
  {
    id: "potential-customers",
    displayName: "Potential-Customer / Prospect Database",
    category: "business",
    galaxies: ["business", "quoting"],
    description:
      "Prospect / lead / target-customer pipeline (sales prospecting). DISTINCT from existing JM Die customers (those live in jm-die-data). This is a GAP: no dedicated prospect/lead/CRM store exists on disk yet.",
    primarySource: null,
    count: { type: "gap", reason: "no dedicated prospect/lead/CRM store found (Glob mcp-server/data/**/*{prospect,lead,potential,crm}* -> 0). Existing CUSTOMERS (not prospects) are in jm-die-profile.ts (117) + the jm-die-database corpus." },
    sources: [
      { path: "mcp-server/src/data/jm-die-profile.ts", role: "existing customers (117) -- NOT prospects; the prospect store is unbuilt" },
    ],
    schemaHint: "PLANNED prospect records: company, contact, industry, fit_score, est_annual_volume, source, stage (BANT). Recommended home: hotel/business galaxy CRM.",
    queryHint: "GAP -- build a prospect store (recommend: hotel business galaxy) then add a real count source here.",
    gap: true,
  },
  {
    id: "jm-die-data",
    displayName: "JM Die Company Data (DocuStrata corpus)",
    category: "shop-corpus",
    galaxies: ["business", "mill", "lathe", "wedm", "cad", "cam"],
    description:
      "The full JM Die document + program corpus: sales orders, prints, NC programs, CAM projects, packing slips, quotes -- the real shop's 12-year operational record. 111,745 indexed documents, 38,251 indexed files, 76,205 blueprint->program joins.",
    primarySource: "mcp-server/data/jm-die-database",
    count: { type: "manifest-path", manifest: "mcp-server/data/jm-die-database/manifest.json", path: "corpus.indexed_documents" },
    sources: [
      { path: "mcp-server/data/jm-die-database", role: "primary (documents.jsonl 111745 rows, files.jsonl 38251 rows)" },
      { path: "mcp-server/src/data/jm-die-profile.ts", role: "canonical 117 customers / 21 machines / 24545 programs" },
    ],
    schemaHint: "document records: doc_id, role (SALES_ORDER/PRINT/NOTE/...), customer, machine, kind, doc_date, text-layer signals; file records: path, customer, machine, kind, ext",
    queryHint: "node scripts/jm-shop-knowledge-to-vault.mjs --json ; jm-die-database/tables/{documents,files}.jsonl ; prismSelfAwarenessEngine.getJMDieCustomerPath()",
    existingVaultNote: "reference_jm_shop_function_profile.md",
  },
  {
    id: "fixtures",
    displayName: "Fixture / Workholding Database",
    category: "manufacturing-asset",
    galaxies: ["mill", "lathe", "wedm", "cam"],
    description:
      "Workholding + fixtures: vises, chucks, clamps, soft jaws, fixture plates -- clamping force, safety factor, stock-fixture geometry. Reference-DB workholding category + hyperMILL stock_fixture.json.",
    primarySource: "mcp-server/data/prism-reference-db",
    count: { type: "manifest-category", manifest: "mcp-server/data/prism-reference-db/MANIFEST.json", category: "workholding", field: "records" },
    sources: [
      { path: "mcp-server/data/prism-reference-db", role: "primary (workholding category)" },
      { path: "mcp-server/data/cam-functions/hypermill/stock_fixture.json", role: "hyperMILL stock + fixture geometry schema" },
    ],
    schemaHint: "workholding records: type, clamping_force_N, jaw/chuck spec, safety_factor, stock geometry, collision envelope",
    queryHint: "node scripts/db-toolbelt.mjs --status ; prism_safety workholding check ; prism_dev reference-db query category=workholding",
  },
];

// ── pure count resolver (fail-soft; never throws) ───────────────────────────
function readJsonSafe(absPath) {
  try { return JSON.parse(fs.readFileSync(absPath, "utf8")); } catch { return null; }
}

/** Dot-path getter: getPath(obj, "a.b.c"). */
function getPath(obj, dotted) {
  return dotted.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), obj);
}

/**
 * Resolve a database's record count from its on-disk source. Returns
 * { count: number|null, detail: string }. Pure aside from fs reads; fail-soft.
 * `rootOverride` lets tests point at a fixture tree.
 */
export function resolveCount(spec, rootOverride = REPO_ROOT) {
  if (!spec || typeof spec !== "object") return { count: null, detail: "no count spec" };
  const abs = (rel) => path.isAbsolute(rel) ? rel : path.join(rootOverride, rel);
  switch (spec.type) {
    case "gap":
      return { count: null, detail: `GAP: ${spec.reason || "not built"}` };
    case "manifest-category": {
      const m = readJsonSafe(abs(spec.manifest));
      if (!m) return { count: null, detail: `manifest unreadable: ${spec.manifest}` };
      const cat = getPath(m, `byCategory.${spec.category}`);
      if (!cat || typeof cat !== "object") return { count: null, detail: `category '${spec.category}' absent in manifest` };
      const n = cat[spec.field || "records"];
      return { count: typeof n === "number" ? n : null, detail: `byCategory.${spec.category}.${spec.field || "records"}` };
    }
    case "manifest-category-sum": {
      const m = readJsonSafe(abs(spec.manifest));
      if (!m) return { count: null, detail: `manifest unreadable: ${spec.manifest}` };
      let sum = 0; let any = false; const parts = [];
      for (const c of spec.categories || []) {
        const cat = getPath(m, `byCategory.${c}`);
        const n = cat && typeof cat === "object" ? cat[spec.field || "records"] : undefined;
        if (typeof n === "number") { sum += n; any = true; parts.push(`${c}=${n}`); }
      }
      return { count: any ? sum : null, detail: `sum(${parts.join(", ")})` };
    }
    case "manifest-path": {
      const m = readJsonSafe(abs(spec.manifest));
      if (!m) return { count: null, detail: `manifest unreadable: ${spec.manifest}` };
      const n = getPath(m, spec.path);
      return { count: typeof n === "number" ? n : null, detail: spec.path };
    }
    case "jsonl-lines": {
      try {
        const txt = fs.readFileSync(abs(spec.file), "utf8");
        const n = txt.split("\n").filter((l) => l.trim().length > 0).length;
        return { count: n, detail: `non-empty lines of ${spec.file}` };
      } catch { return { count: null, detail: `jsonl unreadable: ${spec.file}` }; }
    }
    case "json-array": {
      const j = readJsonSafe(abs(spec.file));
      const arr = spec.path ? getPath(j, spec.path) : j;
      return { count: Array.isArray(arr) ? arr.length : null, detail: `array length ${spec.path || "(root)"}` };
    }
    default:
      return { count: null, detail: `unknown count type '${spec.type}'` };
  }
}

/** Validate registry shape (used by tests + the bridge). Returns string[] of problems. */
export function validateRegistry(dbs = DATABASES) {
  const problems = [];
  const ids = new Set();
  for (const d of dbs) {
    if (!d.id) problems.push("entry missing id");
    if (ids.has(d.id)) problems.push(`duplicate id: ${d.id}`);
    ids.add(d.id);
    if (!d.displayName) problems.push(`${d.id}: missing displayName`);
    if (!d.count || typeof d.count !== "object") problems.push(`${d.id}: missing count spec`);
    if (!Array.isArray(d.sources) || d.sources.length === 0) problems.push(`${d.id}: missing sources`);
    if (!d.queryHint) problems.push(`${d.id}: missing queryHint`);
  }
  return problems;
}
