#!/usr/bin/env node
/**
 * generate-vendor-catalog-features.mjs — system-viz augmentation for the
 * RES-CATALOG-AUDIT-MS0 audit + summaries.
 *
 * Reads:
 *   state/shared/specs/VENDOR-CATALOG-AUDIT-2026-05-23.json
 *   state/shared/specs/VENDOR-CATALOG-SUMMARIES-2026-05-23.json
 *
 * Emits a feature pack matching the system-viz ghost-roost pattern used by
 * scripts/generate-bridge-synergy-features.mjs / scripts/generate-priority-queue-features.mjs:
 *
 *   {
 *     nodes: [
 *       { id: "ghost.vendor_catalog_audit", group: "L7", type: "ghost-roost", ... },
 *       { id: "vendor-catalog.<file-slug>", group: "L8", type: "vendor-catalog", ... },
 *       ...
 *     ],
 *     edges: [
 *       { source: "ghost.vendor_catalog_audit", target: "vendor-catalog.<slug>", relation: "audits" },
 *       ...
 *     ],
 *   }
 *
 * Splice point: scripts/merge-augmentations.mjs (the system-viz merger) reads
 * the standardized output path below. Adoption follows the BRIDGE-SYNERGY-MS0
 * pattern: register in regen-viz.mjs FAST[] + splice via merge-augmentations.mjs.
 * This file ships standalone — the registration is the U-AUDIT-V4 follow-on.
 *
 * Run: node H:/prism/scripts/generate-vendor-catalog-features.mjs
 *
 * @module scripts/generate-vendor-catalog-features
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const REPO = "H:/prism";
const AUDIT_JSON = join(REPO, "state/shared/specs/VENDOR-CATALOG-AUDIT-2026-05-23.json");
const SUMMARIES_JSON = join(REPO, "state/shared/specs/VENDOR-CATALOG-SUMMARIES-2026-05-23.json");
// VIZ_DIR root (NOT staging/) so merge-augmentations loadOptional finds it — wired into the
// merged graph U-VIZ-FAST-REGISTER-9 (sierra 2026-05-30). Orphaned before; no other consumer of the old staging path.
const OUT_DIR = join(REPO, "state/shared/system-viz");
const OUT_FILE = join(OUT_DIR, "vendor-catalog-features.json");

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

async function main() {
  if (!existsSync(AUDIT_JSON) || !existsSync(SUMMARIES_JSON)) {
    console.error("Missing input(s):", AUDIT_JSON, SUMMARIES_JSON);
    process.exit(1);
  }
  const audit = JSON.parse(await readFile(AUDIT_JSON, "utf8"));
  const summaries = JSON.parse(await readFile(SUMMARIES_JSON, "utf8"));

  const nodes = [];
  const edges = [];

  // ── Roost node ──────────────────────────────────────────────────────
  nodes.push({
    id: "ghost.vendor_catalog_audit",
    group: "L7",
    type: "ghost-roost",
    label: "Vendor Catalog Audit",
    title: `Vendor catalogs: ${audit.summary.uploaded_pdfs} PDFs + ${audit.summary.uploaded_zip_parts} zip-parts pending`,
    color: "#FFA500", // orange — audit/drift signal
    metadata: {
      uploaded_pdfs: audit.summary.uploaded_pdfs,
      uploaded_zip_parts: audit.summary.uploaded_zip_parts,
      inventory_catalogs: audit.summary.inventory_catalogs,
      manufacturer_drift_rows: audit.summary.manufacturer_drift_rows,
      vendor_skill_archives: audit.summary.vendor_skill_dirs,
      critical_findings: audit.critical_findings.length,
      audit_source: "state/shared/specs/VENDOR-CATALOG-AUDIT-2026-05-23.json",
      summaries_source: "state/shared/specs/VENDOR-CATALOG-SUMMARIES-2026-05-23.json",
    },
  });

  // ── Per-catalog leaf nodes ──────────────────────────────────────────
  for (const s of summaries.summaries) {
    const slug = slugify(s.file);
    const id = `vendor-catalog.${slug}`;
    nodes.push({
      id,
      group: "L8",
      type: "vendor-catalog",
      label: s.file.replace(/\.pdf$/i, "").slice(0, 40),
      title: `${s.publisher.vendor}${s.publisher.confidence ? " @" + s.publisher.confidence : ""} · ${s.size_mb}MB · ${s.product_categories.length} categories`,
      color: s.publisher.vendor === "unknown" ? "#666666" : "#4488CC",
      metadata: {
        file: s.file,
        size_mb: s.size_mb,
        publisher: s.publisher.vendor,
        publisher_confidence: s.publisher.confidence,
        publisher_evidence: s.publisher.evidence,
        product_categories: s.product_categories,
        grade_families: s.grade_families,
        coatings: s.coatings_mentioned,
        pages_extracted: s.pages_extracted,
      },
    });
    edges.push({
      source: "ghost.vendor_catalog_audit",
      target: id,
      relation: "audits",
      weight: 1.0,
    });
  }

  // ── Critical-finding leaf nodes ─────────────────────────────────────
  for (let i = 0; i < audit.critical_findings.length; i++) {
    const f = audit.critical_findings[i];
    const id = `vendor-catalog.finding-${i + 1}`;
    nodes.push({
      id,
      group: "L8",
      type: "vendor-catalog-finding",
      label: `${f.severity}: ${f.finding.slice(0, 50)}`,
      title: f.recommended_action,
      color: f.severity === "P0" ? "#CC0000" : f.severity === "P1" ? "#FF8800" : "#FFCC00",
      metadata: {
        severity: f.severity,
        finding: f.finding,
        action: f.recommended_action,
        details: { files: f.files, missing_parts: f.missing_parts },
      },
    });
    edges.push({
      source: "ghost.vendor_catalog_audit",
      target: id,
      relation: "surfaces",
      weight: 2.0,
    });
  }

  // ── PSN synergy edges (decorative — surface the synergy intent) ────
  for (const psn of audit.psn_synergy_targets) {
    const id = `vendor-catalog.psn-${slugify(psn.leg)}`;
    nodes.push({
      id,
      group: "L9",
      type: "vendor-catalog-psn-target",
      label: psn.leg,
      title: psn.action,
      color: "#88CC88",
      metadata: psn,
    });
    edges.push({
      source: "ghost.vendor_catalog_audit",
      target: id,
      relation: "synergizes-with",
      weight: 0.5,
    });
  }

  const out = {
    schemaVersion: "1.0.0",
    feature_pack: "vendor-catalog-features",
    generated_at: new Date().toISOString(),
    generated_by: "scripts/generate-vendor-catalog-features.mjs",
    source_specs: [AUDIT_JSON.replace(REPO + "/", ""), SUMMARIES_JSON.replace(REPO + "/", "")],
    nodes,
    edges,
    stats: {
      total_nodes: nodes.length,
      total_edges: edges.length,
      roost_nodes: nodes.filter(n => n.type === "ghost-roost").length,
      catalog_nodes: nodes.filter(n => n.type === "vendor-catalog").length,
      finding_nodes: nodes.filter(n => n.type === "vendor-catalog-finding").length,
      psn_target_nodes: nodes.filter(n => n.type === "vendor-catalog-psn-target").length,
    },
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(out, null, 2));
  console.log(`✓ Wrote ${OUT_FILE.replace(REPO + "/", "")}`);
  console.log(`  ${out.stats.total_nodes} nodes (${out.stats.catalog_nodes} catalogs + ${out.stats.finding_nodes} findings + ${out.stats.psn_target_nodes} PSN targets + 1 roost)`);
  console.log(`  ${out.stats.total_edges} edges`);
  console.log(`  Splice point: scripts/merge-augmentations.mjs (U-AUDIT-V4 follow-on registers in regen-viz.mjs FAST[])`);
}

main().catch(err => {
  console.error("generate-vendor-catalog-features failed:", err);
  process.exit(1);
});
