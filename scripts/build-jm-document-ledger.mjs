#!/usr/bin/env node
// build-jm-document-ledger.mjs
// JM-DOC-POPULATION-MS0 — accountability backbone: deterministic per-document ledger
// over the REAL 554,999-file JM-Die corpus. Every line lands in exactly ONE disposition.
// Zero silent drops. Fail-loud reconciliation invariant.
//
// Source of truth spec: PRISM JM-DIE DOCUMENT ROUTING + DISPOSITION SPEC (routing agent, 2026-06-02).
// Routing keys on the (source, bucket) PAIR — bucket alone mis-routes 60%+ of the corpus
// because the DocuStrata sources carry their own richer bucket vocabularies.
//
// CLAUDE.md discipline applied:
//  - R12 fail-loud: invariant violation throws + exit 1; unknown tuples are VISIBLE, never dropped.
//  - financial-discipline soul (§4): financial doc classes are indexed-only/metadata with
//    financial_guard:true and asserted NEVER `consumed`. No discrete ERP records synthesized.
//  - Stream-read (readline over createReadStream) — NEVER readFileSync on the 113 MB file.

import fs from "node:fs";
import readline from "node:readline";
import path from "node:path";

const INVENTORY_PATH = "H:/prism/state/shared/databases/jm-file-inventory.jsonl";
const SUMMARY_PATH = "H:/prism/state/shared/databases/jm-corpus-summary.json";
const LEDGER_OUT_PATH = "H:/prism/state/shared/databases/jm-document-ledger-summary.json";

const SCHEMA_VERSION = "1.0.0";
const ROUTING_TABLE_VERSION = "2026-06-02.spec-v1"; // (source,bucket)-keyed routing spec

// ---------------------------------------------------------------------------
// DISPOSITION VOCAB (exactly 5 routed dispositions + 1 explicit parse-error bucket)
//   consumed · indexed-only · viewer-only · metadata · unrouted-misc
//   malformed-line  (parse failures — counted as orphan, never silently dropped)
// ---------------------------------------------------------------------------
const DISPOSITIONS = ["consumed", "indexed-only", "viewer-only", "metadata", "unrouted-misc", "malformed-line"];

// Financial doc classes (§4) — MUST be indexed-only/metadata + financial_guard:true, NEVER consumed.
const FINANCIAL_ORGANIZED = new Set(["sales_orders", "closed_orders", "invoices", "tax_financial", "accounting"]);
const FINANCIAL_MANIFEST = new Set(["invoice", "customer_po", "acknowledgment"]);
// Quote classes — charlie-owned, link-only.
const QUOTE_BUCKETS = new Set(["quote", "quotes"]);

// docustrata_organized doc-archive buckets routed indexed-only (non-financial, non-quote, non-unclassified)
const ORGANIZED_DOC_INDEX = new Set([
  "prints", "scans", "notes", "packing_slips", "laser_sheets", "shipping", "imported",
]);

// R-CONSUMED key set
const CONSUMED_KEYS = new Set([
  "part_library|program",
  "part_library|cad",
  "part_library|setup",
  "jm_die_category|program",
  "jm_die_category|cad",
  "jm_die_category|setup",
]);

/**
 * Classify a single record into exactly one disposition + a human target_feature + engine.
 * Apply rules in order; first match wins. (R-rules from spec §2.)
 *
 * Returns { disposition, target_feature, engine, financial_guard, quote_owner }.
 */
function classify(rec) {
  const source = rec.source ?? null;
  const bucket = rec.bucket ?? null;
  const key = `${source}|${bucket}`;

  // R-QUOTE-DEFER takes precedence over generic doc/financial routing for quote buckets,
  // so quoting (charlie-owned) is never accidentally consumed. (Spec §2 R-QUOTE-DEFER.)
  if (QUOTE_BUCKETS.has(bucket)) {
    // disposition per source: indexed-only for organized, metadata for manifest.
    if (source === "docustrata_manifest") {
      return {
        disposition: "metadata",
        target_feature: "Quoting (charlie-owned) — manifest link",
        engine: "DocuStrataMaterialPriorEngine (charlie) — manifest reference",
        financial_guard: false,
        quote_owner: "charlie",
      };
    }
    // organized (or any other source carrying a quote bucket)
    return {
      disposition: "indexed-only",
      target_feature: "Quoting (charlie-owned) — link only",
      engine: "DocuStrataMaterialPriorEngine (charlie) — reference",
      financial_guard: false,
      quote_owner: "charlie",
    };
  }

  // R-CONSUMED — ingestable structured assets (NC code, CAD geometry, setup sheets).
  if (CONSUMED_KEYS.has(key)) {
    let target_feature;
    let engine;
    if (bucket === "program") {
      target_feature = "Programs / NC library";
      engine =
        source === "jm_die_category"
          ? "LatheProgramLibraryEngine / CNCProgramAssemblerEngine + AdvancedPostProcessorEngine"
          : "LatheProgramLibraryEngine / CNCProgramAssemblerEngine / PPAGIProgramLibraryAuditorEngine";
    } else if (bucket === "cad") {
      target_feature = "Parts / items (geometry)";
      engine =
        source === "jm_die_category"
          ? "CadPartLibraryEngine -> CADArchiveJoinAugmenterEngine"
          : "CadPartLibraryEngine -> ArchiveToPartsCatalogIngesterEngine";
    } else {
      // setup
      target_feature = "Setup sheets";
      engine = "SetupSheetLibraryEngine";
    }
    return { disposition: "consumed", target_feature, engine, financial_guard: false, quote_owner: null };
  }

  // R-SCAN (viewer-only) — raster/PDF scans + prints from the part trees: archived for the
  // viewer; OCR is opt-in per-part, not bulk. Disposition stays viewer-only.
  if ((bucket === "scan" || bucket === "print") && (source === "part_library" || source === "jm_die_category")) {
    return {
      disposition: "viewer-only",
      target_feature: bucket === "print" ? "Prints / drawings (viewer; OCR opt-in)" : "Prints / Document archive (viewer; OCR opt-in)",
      engine: bucket === "print"
        ? "BlueprintOCREngine -> Drawing2DExtractionEngine (opt-in)"
        : "BlueprintOCREngine (opt-in) / DocumentControlEngine archive",
      financial_guard: false,
      quote_owner: null,
    };
  }

  // R-METADATA-PART — part_library/other: part.json or REV-folder structural file -> job metadata.
  if (key === "part_library|other") {
    const p = String(rec.path ?? "");
    const base = path.basename(p);
    // part.json (job record) OR a REV-folder structural file (".../R123/...").
    const isPartJson = /^part\.json$/i.test(base);
    const isRevStructure = /[\\/]R\d+[\\/]/i.test(p);
    if (isPartJson || isRevStructure) {
      return {
        disposition: "metadata",
        target_feature: "Jobs / job-structure record (part.json / REV folder)",
        engine: "JobTravelerEngine / JobLifecycleEngine",
        financial_guard: false,
        quote_owner: null,
      };
    }
    // else fall through to R-MISC below.
  }

  // R-MANIFEST — docustrata_manifest (except bucket=other): metadata pointer; NEVER re-OCR/re-index.
  if (source === "docustrata_manifest" && bucket !== "other") {
    const financial_guard = FINANCIAL_MANIFEST.has(bucket);
    let target_feature;
    if (financial_guard) {
      target_feature =
        bucket === "invoice" ? "AR reference (NO synthetic AR) — manifest link"
          : bucket === "customer_po" ? "Order reference (NO synthetic order) — manifest link"
            : "Order reference (acknowledgment) — manifest link";
    } else if (bucket === "packing_slip") {
      target_feature = "Shipment reference — manifest link";
    } else {
      // doc, or any other non-financial manifest bucket
      target_feature = "Document archive (manifest search pointer)";
    }
    return {
      disposition: "metadata",
      target_feature,
      engine: "DocuStrataMaterialPriorEngine manifest-search adapter (read manifest.json + .index/)",
      financial_guard,
      quote_owner: null,
    };
  }

  // R-FINANCIAL-INDEX — docustrata_organized financial classes -> indexed-only + financial_guard.
  if (source === "docustrata_organized" && FINANCIAL_ORGANIZED.has(bucket)) {
    return {
      disposition: "indexed-only",
      target_feature: "Financial document archive (link only, NO discrete ERP records)",
      engine: "DocumentControlEngine link-only",
      financial_guard: true,
      quote_owner: null,
    };
  }

  // R-DOC-INDEX — docustrata_organized doc-archive buckets -> indexed-only.
  if (source === "docustrata_organized" && ORGANIZED_DOC_INDEX.has(bucket)) {
    let engine = "DocumentControlEngine";
    if (bucket === "scans") engine = "DocumentInboxEngine -> DocumentControlEngine";
    else if (bucket === "imported") engine = "DocumentInboxEngine";
    else if (bucket === "prints") engine = "DrawingTemplateIndexEngine (index) / DocumentControlEngine";
    return {
      disposition: "indexed-only",
      target_feature: "Document / drawing archive",
      engine,
      financial_guard: false,
      quote_owner: null,
    };
  }

  // jm_die_category doc/scan/print buckets (not covered by R-CONSUMED above):
  //   doc  -> indexed-only (Document archive)
  //   scan/print already caught by R-SCAN; if not (shouldn't happen) falls to MISC.
  if (source === "jm_die_category" && bucket === "doc") {
    return {
      disposition: "indexed-only",
      target_feature: "Document archive",
      engine: "DocumentControlEngine",
      financial_guard: false,
      quote_owner: null,
    };
  }

  // part_library doc -> indexed-only (schema completeness; near-zero volume in this corpus)
  if (source === "part_library" && bucket === "doc") {
    return {
      disposition: "indexed-only",
      target_feature: "Document archive",
      engine: "DocumentControlEngine",
      financial_guard: false,
      quote_owner: null,
    };
  }

  // R-MISC (catch-all, MUST be last) — any unmatched (source,bucket), incl.
  //   (jm_die_category,other), (docustrata_organized,unclassified), (docustrata_manifest,other),
  //   non-structural (part_library,other), and any FUTURE/unknown tuple.
  return {
    disposition: "unrouted-misc",
    target_feature: "Unrouted (no route for source/bucket)",
    engine: "none",
    financial_guard: false,
    quote_owner: null,
    reason: `no_route_for(${source},${bucket})`,
  };
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function main() {
  // DocuStrata manifest doc count — accounted as its OWN class, NOT double-counted against
  // the file inventory (the manifest docs already appear in the inventory as docustrata_* rows;
  // this number is reported for context per the task brief).
  let docustrataDocs = 0;
  try {
    const summary = JSON.parse(fs.readFileSync(SUMMARY_PATH, "utf8"));
    docustrataDocs = summary?.stats?.docustrata_manifest_docs ?? 0;
  } catch (e) {
    console.error(`WARN: could not read summary for docustrata_docs: ${e.message}`);
  }

  // Accumulators
  const byBucket = Object.create(null);
  const bySource = Object.create(null);
  const byTargetFeature = Object.create(null);
  const byDisposition = Object.create(null);
  for (const d of DISPOSITIONS) byDisposition[d] = 0; // explicit zero-init — every disposition present
  const bySourceBucket = Object.create(null); // "source|bucket" -> {source,bucket,count,disposition,engine}
  const unroutedDetail = Object.create(null); // "source|bucket" -> {source,bucket,count,reason}

  const distinctCustomers = new Set();
  const distinctMaterials = new Set();
  const distinctMachineClasses = new Set();

  let customerNonNull = 0;
  let materialNonNull = 0;
  let machineClassNonNull = 0;
  let crmLinked = 0;
  let crmUnlinked = 0;
  let financialGuardedCount = 0;
  let consumedFinancialViolations = 0; // MUST stay 0 (§4 assertion)

  let totalLines = 0; // non-blank lines read
  let parseErrors = 0;

  const inc = (obj, k) => { obj[k] = (obj[k] ?? 0) + 1; };

  const rl = readline.createInterface({
    input: fs.createReadStream(INVENTORY_PATH, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const rawLine of rl) {
    const line = rawLine.trim();
    if (line.length === 0) continue; // blank line — not counted as a record (matches wc -l minus blanks)
    totalLines++;

    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      // Malformed line: explicit disposition, counted as orphan — NEVER silently dropped.
      parseErrors++;
      byDisposition["malformed-line"]++;
      const k = "PARSE_ERROR|PARSE_ERROR";
      if (!unroutedDetail[k]) unroutedDetail[k] = { source: "PARSE_ERROR", bucket: "PARSE_ERROR", count: 0, reason: "json_parse_failed" };
      unroutedDetail[k].count++;
      continue;
    }

    const source = rec.source ?? "null";
    const bucket = rec.bucket ?? "null";

    inc(bySource, source);
    inc(byBucket, bucket);

    const result = classify(rec);
    byDisposition[result.disposition]++;
    inc(byTargetFeature, result.target_feature);

    // per (source,bucket) breakdown
    const sbKey = `${source}|${bucket}`;
    if (!bySourceBucket[sbKey]) {
      bySourceBucket[sbKey] = {
        source,
        bucket,
        count: 0,
        disposition: result.disposition,
        engine: result.engine,
      };
    }
    bySourceBucket[sbKey].count++;

    if (result.disposition === "unrouted-misc") {
      if (!unroutedDetail[sbKey]) {
        unroutedDetail[sbKey] = { source, bucket, count: 0, reason: result.reason ?? `no_route_for(${source},${bucket})` };
      }
      unroutedDetail[sbKey].count++;
    }

    if (result.financial_guard) financialGuardedCount++;
    if (result.financial_guard && result.disposition === "consumed") consumedFinancialViolations++;

    // cross-cutting linkages (side-fields, do NOT change disposition or create a 2nd row)
    if (rec.customer != null && rec.customer !== "") {
      customerNonNull++;
      crmLinked++;
      distinctCustomers.add(rec.customer);
    } else {
      crmUnlinked++;
    }
    if (rec.material != null && rec.material !== "") {
      materialNonNull++;
      distinctMaterials.add(rec.material);
    }
    if (rec.machine_class != null && rec.machine_class !== "") {
      machineClassNonNull++;
      distinctMachineClasses.add(rec.machine_class);
    }
  }

  // -------------------------------------------------------------------------
  // RECONCILIATION INVARIANT (§3) — fail loud on violation.
  // -------------------------------------------------------------------------
  const totalInventoried = totalLines;
  // orphan = explicit unrouted-misc + malformed-line (both ARE accounted = counted)
  const totalOrphan = byDisposition["unrouted-misc"] + byDisposition["malformed-line"];
  // accounted = the four real-route dispositions
  const totalAccounted =
    byDisposition["consumed"] +
    byDisposition["indexed-only"] +
    byDisposition["viewer-only"] +
    byDisposition["metadata"];

  const sumAllDispositions = DISPOSITIONS.reduce((a, d) => a + byDisposition[d], 0);

  // Invariant 1: every row lands in exactly one disposition.
  const invDispositionSum = sumAllDispositions === totalInventoried;
  // Invariant 3: per-(source,bucket) tuples sum to total.
  const sumTuples = Object.values(bySourceBucket).reduce((a, r) => a + r.count, 0) + parseErrors;
  const invTupleSum = sumTuples === totalInventoried;
  // Task invariant: accounted + orphan === inventoried.
  const invAccountedOrphan = totalAccounted + totalOrphan === totalInventoried;
  // §4 financial assertion.
  const invNoConsumedFinancial = consumedFinancialViolations === 0;

  const invariantOk = invDispositionSum && invTupleSum && invAccountedOrphan && invNoConsumedFinancial;

  // -------------------------------------------------------------------------
  // BUILD LEDGER OUTPUT
  // -------------------------------------------------------------------------
  const sortedSourceBucket = Object.values(bySourceBucket).sort((a, b) => b.count - a.count);
  const sortedUnrouted = Object.values(unroutedDetail).sort((a, b) => b.count - a.count);

  const ledger = {
    schema_version: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    milestone: "JM-DOC-POPULATION-MS0",
    routing_table_version: ROUTING_TABLE_VERSION,
    total_inventoried: totalInventoried,
    total_accounted: totalAccounted,
    total_orphan: totalOrphan,
    by_bucket: byBucket,
    by_source: bySource,
    by_target_feature: byTargetFeature,
    by_disposition: byDisposition,
    by_source_bucket: sortedSourceBucket,
    docustrata_docs: docustrataDocs,
    distinct_customers: distinctCustomers.size,
    distinct_materials: distinctMaterials.size,
    distinct_machine_classes: distinctMachineClasses.size,
    machine_classes_seen: [...distinctMachineClasses].sort(),
    customer_nonnull_count: customerNonNull,
    material_nonnull_count: materialNonNull,
    machine_class_nonnull_count: machineClassNonNull,
    crm_linked_count: crmLinked,
    crm_unlinked_count: crmUnlinked,
    financial_guarded_count: financialGuardedCount,
    unrouted_detail: sortedUnrouted,
    parse_errors: parseErrors,
    invariant_ok: invariantOk,
    invariant_checks: {
      disposition_sum_eq_total: invDispositionSum,
      tuple_sum_eq_total: invTupleSum,
      accounted_plus_orphan_eq_total: invAccountedOrphan,
      no_consumed_financial: invNoConsumedFinancial,
    },
  };

  fs.writeFileSync(LEDGER_OUT_PATH, JSON.stringify(ledger, null, 2) + "\n", "utf8");

  // -------------------------------------------------------------------------
  // HUMAN COVERAGE REPORT (stdout)
  // -------------------------------------------------------------------------
  const pct = (n) => ((n / totalInventoried) * 100).toFixed(3);
  console.log("");
  console.log("================================================================");
  console.log(" JM-DOC-POPULATION-MS0 — DOCUMENT LEDGER COVERAGE REPORT");
  console.log("================================================================");
  console.log(` inventory file : ${INVENTORY_PATH}`);
  console.log(` ledger output  : ${LEDGER_OUT_PATH}`);
  console.log(` routing version: ${ROUTING_TABLE_VERSION}`);
  console.log(` total_inventoried (lines read, non-blank): ${totalInventoried}`);
  console.log("");
  console.log(" BY DISPOSITION:");
  for (const d of DISPOSITIONS) {
    const c = byDisposition[d];
    console.log(`   ${d.padEnd(16)} ${String(c).padStart(8)}  (${pct(c).padStart(7)}%)`);
  }
  console.log("");
  console.log(" BY SOURCE:");
  for (const [s, c] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${s.padEnd(22)} ${String(c).padStart(8)}  (${pct(c).padStart(7)}%)`);
  }
  console.log("");
  console.log(" BY BUCKET:");
  for (const [b, c] of Object.entries(byBucket).sort((a, b2) => b2[1] - a[1])) {
    console.log(`   ${b.padEnd(16)} ${String(c).padStart(8)}  (${pct(c).padStart(7)}%)`);
  }
  console.log("");
  console.log(" BY TARGET FEATURE:");
  for (const [t, c] of Object.entries(byTargetFeature).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${String(c).padStart(8)}  (${pct(c).padStart(7)}%)  ${t}`);
  }
  console.log("");
  console.log(" BY (SOURCE, BUCKET) -> DISPOSITION:");
  for (const r of sortedSourceBucket) {
    console.log(
      `   ${(`${r.source}/${r.bucket}`).padEnd(40)} ${String(r.count).padStart(8)}  -> ${r.disposition}`
    );
  }
  console.log("");
  console.log(" CROSS-CUTTING LINKAGES:");
  console.log(`   customer non-null (CRM-linkable) : ${customerNonNull}  (${pct(customerNonNull)}%) — distinct ${distinctCustomers.size}`);
  console.log(`   customer null (UNLINKED)         : ${crmUnlinked}  (${pct(crmUnlinked)}%)`);
  console.log(`   material non-null                : ${materialNonNull}  (${pct(materialNonNull)}%) — distinct ${distinctMaterials.size}`);
  console.log(`   machine_class non-null           : ${machineClassNonNull}  (${pct(machineClassNonNull)}%) — distinct ${distinctMachineClasses.size} [${[...distinctMachineClasses].sort().join(", ")}]`);
  console.log(`   financial_guarded (NO synth ERP) : ${financialGuardedCount}  (${pct(financialGuardedCount)}%)`);
  console.log(`   docustrata_manifest_docs (own class, not double-counted): ${docustrataDocs}`);
  console.log("");
  if (sortedUnrouted.length > 0) {
    console.log(" UNROUTED DETAIL (unrouted-misc + parse errors):");
    for (const u of sortedUnrouted) {
      console.log(`   ${(`${u.source}/${u.bucket}`).padEnd(40)} ${String(u.count).padStart(8)}  reason=${u.reason}`);
    }
    console.log("");
  }
  console.log(" INVARIANT CHECKS:");
  console.log(`   disposition_sum_eq_total       : ${invDispositionSum}  (${sumAllDispositions} == ${totalInventoried})`);
  console.log(`   tuple_sum_eq_total             : ${invTupleSum}  (${sumTuples} == ${totalInventoried})`);
  console.log(`   accounted_plus_orphan_eq_total : ${invAccountedOrphan}  (${totalAccounted} + ${totalOrphan} == ${totalInventoried})`);
  console.log(`   no_consumed_financial          : ${invNoConsumedFinancial}  (violations=${consumedFinancialViolations})`);
  console.log("");
  console.log(
    `RECONCILED: ${totalAccounted + totalOrphan} == ${totalInventoried} ` +
    `(${byDisposition["unrouted-misc"]} unrouted-misc, ${byDisposition["malformed-line"]} malformed)`
  );
  console.log("================================================================");

  if (!invariantOk) {
    throw new Error(
      `RECONCILIATION INVARIANT VIOLATED: ` +
      `dispositionSum=${invDispositionSum} tupleSum=${invTupleSum} ` +
      `accountedOrphan=${invAccountedOrphan} noConsumedFinancial=${invNoConsumedFinancial}`
    );
  }
}

main().catch((err) => {
  console.error("FATAL:", err.stack || err.message);
  process.exit(1);
});
