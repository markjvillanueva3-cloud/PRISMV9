// scripts/lib/catalog-extraction-router.mjs
//
// CANONICAL extraction router + full math/science schema for vendor catalog data.
//
// Operator directive (2026-05-31, slot juliett): "make sure we're using extracter
// scripts and batch books that we built for data extraction when applicable. and
// remember that we need ALL math and science data from the catalogs so we can fine
// tune or generate custom calculations for each type of tooling that compounds with
// all other applications from different domains and parts of the equations for
// generating algorithms and speed feed parameters and calculations."
//
// This module is the GOVERNANCE layer over PRISM's (rich but fragmented) extraction
// toolset. It does NOT re-implement extraction — it ROUTES a catalog source to the
// right EXISTING extractor, and defines the FULL math/science target schema that the
// extracted data must populate (superset of the narrow ManufacturerSpeedFeed {vc,fz,dc}
// the SFC manifest currently targets), so the data compounds across every consuming
// domain + equation.
//
// Consumed by: build-vendor-catalog-db.mjs (emits EXTRACTION-ROUTING.json), and any
// extraction-orchestration script that needs to pick an extractor or validate coverage.

// BLACKWELL-DB-GEN-MS0 (slot:romeo, 2026-06-03): the vision-OCR extractor's GPU
// gating is no longer a baked-in 16GB "overnight only" assumption — it reads the
// LIVE host GPU via the catalog-gpu-profile (single source of truth). Patch-sibling
// add: existing exports unchanged; buildRoutingRegistry now carries the host profile.
import { detectGpuTier, describeProfile } from "./catalog-gpu-profile.mjs";

// ── 1. EXTRACTOR REGISTRY (verified on-disk 2026-05-31; "use what we built") ────────
// Each entry: the existing script, its language, what math/science it CAPTURES, its
// fidelity, and WHEN it applies. Never reinvent these — route to them.
export const EXTRACTORS = [
  {
    id: "camelot-tables",
    script: "scripts/camelot-extract.py",
    lang: "python",
    captures: ["cutting_params_tables", "vc", "fz", "fn", "ap", "ae", "iso_groups", "diameter_bins"],
    fidelity: "high-structured",
    when: "catalog has CLEAN ruled/stream tables of speeds & feeds (digital-born PDF). Called via scripts/extract-vendor-pdf.mjs.",
    output: "JSON envelope (raw_tables + parsed rows)",
  },
  {
    id: "per-vendor-pymupdf",
    script: "scripts/extract-<vendor>.py (e.g. extract-accupro.py, extract-ampc.py)",
    lang: "python",
    captures: ["tool_geometry", "diameter", "shank_dia", "flute_length", "OAL", "flutes", "order_no", "price", "units(inch|mm)"],
    fidelity: "high-tuned",
    when: "a KNOWN vendor whose table layout has a hand-tuned pymupdf parser. Highest accuracy per-vendor; clone the pattern for a new vendor.",
    output: "src/data/<vendor>-tools-extracted.json",
  },
  {
    id: "ollama-vision-ocr",
    script: "scripts/batch-ollama-vision-extract.mjs",
    lang: "node+ollama(qwen3-vl:8b-instruct — VL model per catalog-gpu-profile)",
    captures: ["any_visual_table", "scanned_charts", "diagrams", "cutting_params", "geometry"],
    fidelity: "high-but-GPU",
    when: "SCANNED / image-only PDFs or flipbook/complex layouts camelot fails on. Resumable (SHA checkpoint). GPU concurrency + whether it must wait for an idle overnight window is host-aware — see catalog-gpu-profile.detectGpuTier() (Blackwell 96GB → concurrent ×3; 16GB → serial overnight). The fallback when structured parsers fail.",
    output: "per-PDF JSONL (vision-OCR rows, SHA-keyed)",
  },
  {
    id: "batch-pdf-pdftotext",
    script: "scripts/batch-pdf-extract.mjs",
    lang: "node+pdftotext",
    captures: ["title", "section_anchors", "heuristic_tips"],
    fidelity: "low-stub (confidence 0.3, needs_curation)",
    when: "fast first-pass triage of a large backlog to know WHAT a PDF is. NOT for final math/science — promote via a structured extractor.",
    output: "state/shared/extracted-pdfs/batch-<n>.jsonl",
  },
  {
    id: "lima-pypdf-page",
    script: "scripts/extract-jm-die-corpus-page-by-page.py",
    lang: "python(pypdf)",
    captures: ["page_prose", "tribal_tips", "formulas_in_text", "notability_score", "domain_tag"],
    fidelity: "high-prose",
    when: "narrative/reference math & science in PROSE (formulas, rules-of-thumb, application notes) — not tabular. Canonical page-by-page extractor (76x deeper than pdf-parse).",
    output: "mcp-server/data/tribal/jm-die-corpus-pages.jsonl",
  },
  {
    id: "python-batch-harness",
    script: "scripts/batch/{batch_processor,extraction_batch,material_batch}.py",
    lang: "python",
    captures: ["batch_orchestration", "material_science_data", "extraction_reports"],
    fidelity: "orchestration",
    when: "the 'batch books' — running an extractor over >100 files; material_batch.py specializes in material-science datasets. report_generator.py summarizes a run.",
    output: "batch run artifacts + reports",
  },
  {
    id: "cutting-data-enricher",
    script: "scripts/enrich-catalog-cutting-data.mjs",
    lang: "node",
    captures: ["cutting_data_from_existing_sources", "iso_aggregate_vc_fz", "ap_ae_from_proven"],
    fidelity: "cross-reference (no PDF)",
    when: "AFTER extraction: cross-reference a tool skeleton against already-ingested speed-feed .ts data to fill cutting_data where a confident match exists (loud-flags unmatched). NOT a PDF extractor.",
    output: "mcp-server/data/catalog-extractions-enriched/<vendor>-enriched.json",
  },
];

// ── 2. FULL MATH/SCIENCE TARGET SCHEMA ("ALL math and science data") ────────────────
// The superset the SFC narrow {vc,fz,dc} must grow into. Every field below is a real
// lever in a downstream calculation; `equations` names which equation/part it feeds and
// `domains` names which slots compound it — so extraction captures it ONCE, cross-domain.
// Physics constants (kc1.1/mc, Taylor C/n) are CANONICAL in src/physics/constants.ts —
// extraction records the catalog's VALUE + provenance; it never inlines a constant.
export const MATH_SCIENCE_SCHEMA = {
  identity: ["vendor", "series", "tool_type", "catalog_no", "source_pdf", "source_page", "confidence"],
  cutting_params: {
    note: "per ISO group (P|M|K|N|S|H) × operation × cut-type (rough|finish), 3-tuple [conservative,balanced,aggressive] where the catalog gives ranges",
    fields: ["vc_min_mpm", "vc_max_mpm", "fz_min_mm", "fz_max_mm", "fn_mm_rev", "ap_min_mm", "ap_max_mm", "ae_pct"],
    equations: ["MRR = ap·ae·vf", "spindle_power = Fc·vc/60000", "rpm = vc·1000/(π·Dc)"],
    domains: ["speed-feed", "mill", "lathe", "wedm", "cam"],
  },
  tool_material: {
    fields: ["substrate(carbide|HSS|cermet|ceramic|CBN|PCD)", "grade", "wear_coefficients(a,b,c)"],
    equations: ["Taylor V·T^n = C", "flank_wear VB = a·√t·V^b·f^c·(HB/200)"],
    domains: ["speed-feed", "mill", "lathe"],
  },
  coating: {
    fields: ["coating(uncoated|TiN|TiCN|TiAlN|AlTiN|AlCrN|CVD_*|diamond|CBN)", "vc_or_life_multiplier"],
    equations: ["effective Taylor C ×= coating_factor (up to 3× diamond/CBN)"],
    domains: ["speed-feed", "mill", "lathe", "cam"],
  },
  geometry: {
    fields: ["diameter_mm", "flutes", "helix_deg", "corner_radius_mm", "shank_dia_mm", "flute_length_mm", "OAL_mm", "reach_mm", "lead_angle_deg"],
    equations: ["chip_thinning(ae/Dc)", "deflection ∝ L³/D⁴", "engagement_arc"],
    domains: ["mill", "cam", "post-processor", "lathe"],
  },
  material_physics: {
    note: "the catalog's stated workpiece-material data; cross-check vs CANONICAL_KIENZLE/CANONICAL_TAYLOR/CANONICAL_MATERIAL_DB in src/physics/constants.ts — never inline.",
    fields: ["material_name", "iso_group", "hardness_hb_band", "hardness_hrc_band", "machinability_factor", "kc1_1_catalog", "mc_catalog", "taylor_C_catalog", "taylor_n_catalog"],
    equations: ["Kienzle Fc = kc1.1·b·h^(1-mc)", "specific_cutting_force"],
    domains: ["speed-feed", "mill", "lathe", "wedm", "quoting"],
  },
  conditions: {
    fields: ["coolant(dry|mist|MQL|flood|through_tool|cryogenic)", "coolant_multiplier", "hardness_band_factor", "hsm_trochoidal_override", "blind_vs_through_feed_adj"],
    equations: ["coolant derating (0.70 dry → 1.25 cryo)", "hardness Vc factor"],
    domains: ["speed-feed", "mill", "lathe"],
  },
  limits: {
    fields: ["max_rpm", "max_ap_mm", "max_ae_pct", "min_chip_load", "spindle_power_required_kw"],
    equations: ["spindle-power-headroom gate (installed HP − 20%)", "S(x) safety"],
    domains: ["speed-feed", "mill", "lathe", "compliance-safety"],
  },
};

// ── 3. ROUTER — pick the existing extractor(s) for a catalog source ─────────────────
/**
 * Decide which EXISTING extractor to run for a catalog, in priority order.
 * Pure function over coarse source signals (so an orchestrator or operator routes
 * deterministically instead of reinventing). Returns ordered extractor ids + rationale.
 *
 * @param {{vendorKnown?:boolean, hasCleanTables?:boolean, isScanned?:boolean,
 *          proseHeavy?:boolean, triageOnly?:boolean, postExtractEnrich?:boolean,
 *          bulk?:boolean}} sig
 */
export function routeCatalog(sig = {}) {
  const steps = [];
  if (sig.triageOnly) {
    steps.push({ id: "batch-pdf-pdftotext", why: "fast triage — identify the PDF before committing a heavy extractor" });
    return steps;
  }
  if (sig.vendorKnown) {
    steps.push({ id: "per-vendor-pymupdf", why: "known vendor has a hand-tuned parser — highest accuracy" });
  } else if (sig.hasCleanTables) {
    steps.push({ id: "camelot-tables", why: "digital-born clean tables — structured extraction" });
  }
  if (sig.isScanned || (!sig.vendorKnown && !sig.hasCleanTables)) {
    steps.push({ id: "ollama-vision-ocr", why: "scanned/complex or no structured parser available — vision OCR fallback (GPU; model+concurrency+overnight-gate per catalog-gpu-profile)" });
  }
  if (sig.proseHeavy) {
    steps.push({ id: "lima-pypdf-page", why: "narrative formulas/application-notes — prose extractor" });
  }
  if (sig.bulk) {
    steps.push({ id: "python-batch-harness", why: ">100 files — orchestrate via the batch books" });
  }
  if (sig.postExtractEnrich) {
    steps.push({ id: "cutting-data-enricher", why: "after extraction — cross-reference existing speed-feed data to fill gaps + loud-flag unmatched" });
  }
  if (steps.length === 0) {
    steps.push({ id: "ollama-vision-ocr", why: "default fallback — no structured signal" });
  }
  return steps;
}

/** Validate an extracted record covers the math/science groups expected for its tooling. */
export function coverageGaps(record) {
  const groups = Object.keys(MATH_SCIENCE_SCHEMA).filter((g) => g !== "identity");
  const present = (g) => {
    const spec = MATH_SCIENCE_SCHEMA[g];
    const fields = Array.isArray(spec.fields) ? spec.fields : (spec.fields || []);
    return fields.some((f) => {
      const key = String(f).split("(")[0];
      return record && record[key] !== undefined && record[key] !== null;
    });
  };
  return groups.filter((g) => !present(g));
}

export function buildRoutingRegistry(generatedAt) {
  return {
    schemaVersion: "1.0.0",
    title: "Catalog math/science extraction routing + schema",
    owner: "juliett",
    generatedBy: "scripts/lib/catalog-extraction-router.mjs",
    generatedAt,
    directive: "Use the extractor scripts + batch books we built; capture ALL math/science so it compounds across domains + equations.",
    extractors: EXTRACTORS,
    gpuProfile: (() => {
      // Live host GPU decision for the ollama-vision-ocr extractor (BLACKWELL-DB-GEN-MS0).
      // Fail-soft: detectGpuTier never throws, so a probe-less host still gets a profile.
      const p = detectGpuTier();
      return { ...p, summary: describeProfile(p) };
    })(),
    mathScienceSchema: MATH_SCIENCE_SCHEMA,
    routingExamples: {
      "known vendor, digital tables": routeCatalog({ vendorKnown: true, hasCleanTables: true }),
      "unknown, scanned": routeCatalog({ isScanned: true }),
      "prose application-notes": routeCatalog({ proseHeavy: true }),
      "bulk >100 + enrich after": routeCatalog({ bulk: true, hasCleanTables: true, postExtractEnrich: true }),
    },
    consumers: ["speed-feed (oscar — calc engines)", "mill (foxtrot)", "lathe (whiskey)", "wedm (mike)", "cam (kilo)", "quoting (charlie)", "compliance-safety"],
    note: "Physics constants stay CANONICAL in mcp-server/src/physics/constants.ts — extraction records the catalog VALUE + provenance, never inlines a constant.",
  };
}
