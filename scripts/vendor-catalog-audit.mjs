#!/usr/bin/env node
/**
 * vendor-catalog-audit.mjs — Vendor catalog inventory drift + extraction-queue audit
 *
 * Goal (RES-CATALOG-AUDIT-MS0/U-AUDIT-V1, slot:juliett, 2026-05-23):
 *   Catalog the gap between what's UPLOADED to resources/MANUFACTURER_CATALOGS/
 *   and what's TRACKED in mcp-server/data/tool-catalog-inventory.json — surface
 *   drift, queue extractions, score vendor coverage against the existing
 *   archives/skills-generated/prism-vendor-* corpus and the holder/fixture DBs.
 *
 * Outputs (all advisory, never mutates source-of-truth files):
 *   state/shared/specs/VENDOR-CATALOG-AUDIT-2026-05-23.{json,md}
 *
 * Wired surfaces:
 *   - System-viz: ghost.vendor_catalog_audit roost (via downstream
 *     scripts/generate-vendor-catalog-audit-features.mjs — see U-AUDIT-V2 follow-on)
 *   - Memory: companion reference_vendor_catalog_audit_2026_05_23.md
 *
 * Run: node H:/prism/scripts/vendor-catalog-audit.mjs
 *      node H:/prism/scripts/vendor-catalog-audit.mjs --json   (machine-readable)
 *
 * @module scripts/vendor-catalog-audit
 */

import { readdir, readFile, stat, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, basename, extname } from "node:path";

const REPO = "H:/prism";
const UPLOADED_DIR = join(REPO, "resources/MANUFACTURER_CATALOGS/uploaded");
const INVENTORY_JSON = join(REPO, "mcp-server/data/tool-catalog-inventory.json");
const VENDOR_SKILLS_DIR = join(REPO, "archives/skills-generated");
const HOLDER_DB = join(REPO, "mcp-server/data/fusion-programs/fusion-tool-holders.json");
const FIXTURE_DBS = [
  join(REPO, "mcp-server/data/cam-functions/hypermill/stock_fixture.json"),
  join(REPO, "mcp-server/data/fixtures/cad-automation/solidworks/assembly.fixture.json"),
  join(REPO, "mcp-server/data/fixtures/cad-automation/solidworks/cam.fixture.json"),
  join(REPO, "mcp-server/data/fixtures/cad-automation/solidworks/drawing.fixture.json"),
  join(REPO, "mcp-server/data/fixtures/cad-automation/solidworks/simple_part.fixture.json"),
];
const TOOL_REGISTRY = join(REPO, "mcp-server/src/registries/ToolRegistry.ts");
const OUT_DIR = join(REPO, "state/shared/specs");
const OUT_JSON = join(OUT_DIR, "VENDOR-CATALOG-AUDIT-2026-05-23.json");
const OUT_MD = join(OUT_DIR, "VENDOR-CATALOG-AUDIT-2026-05-23.md");

// Manufacturer-name extraction patterns (filename → canonical manufacturer slug)
const MFR_PATTERNS = [
  [/global[-_ ]?cnc/i, "global_cnc"],
  [/rapidkut/i, "rapidkut"],
  [/orange[-_ ]?vise/i, "orange_vise"],
  [/ampc/i, "ampc"],
  [/accupro/i, "accupro"],
  [/big[-_ ]?daishowa/i, "big_daishowa"],
  [/camfix/i, "camfix"],
  [/flash[-_ ]?solid/i, "flash_solid"],
  // GC_2023-2024_*.pdf is Tungaloy's "Cutting Tool Catalog" (verified 2026-05-23
  // by reading page 1 of GC_2023-2024_US_Tooling.pdf: "Tungaloy's Insights",
  // tungaloy.com/us). DO NOT add a /^GC_2023-2024_/i → sandvik rule — the
  // inventory has these correctly labeled as tungaloy. See
  // [[reference_vendor_catalog_misclassification_2026_05_23]] CORRECTION.
  [/^gc_2023-2024_/i, "tungaloy"],
  [/sandvik/i, "sandvik"],
  // Iscar "Master Catalog Vol 1/2" series (no "iscar" in filename)
  [/^master\s+catalog\s+201[5-9].*\bvol/i, "iscar"],
  // Tungaloy 2018.1 product-line catalogs (Turning/Milling/Threading 2018.1.pdf)
  [/^(turning|milling|threading)\s+2018\.1/i, "tungaloy"],
  // BIG DAISHOWA / GENERIC tooling-systems naming
  [/^tooling\s+systems/i, "big_daishowa"],
  [/ma[-_ ]?ford/i, "ma_ford"],
  [/iscar.*master.*catalog.*vol\.?.*1/i, "iscar"],
  [/iscar.*master.*catalog.*vol\.?.*2/i, "iscar"],
  [/iscar/i, "iscar"],
  [/metalmorphosis/i, "metalmorphosis"],
  [/tungaloy/i, "tungaloy"],
  [/korloy/i, "korloy"],
  [/mitsubishi/i, "mitsubishi"],
  [/ingersoll/i, "ingersoll"],
  [/^osg/i, "osg"],
  [/guhring/i, "guhring"],
  [/sgs/i, "sgs"],
  [/emuge/i, "emuge"],
  [/allied[-_ ]?machine/i, "allied_machine"],
  [/^yg[-_ ]?1/i, "yg1"],
  [/zenit/i, "zenit"],
  [/imco/i, "imco"],
  [/haimer/i, "haimer"],
  [/rego[-_ ]?fix/i, "rego_fix"],
  [/kennametal/i, "kennametal"],
  [/walter/i, "walter"],
  [/fraisa/i, "fraisa"],
  [/hanita/i, "hanita"],
  [/horn/i, "horn"],
  [/ceratizit/i, "ceratizit"],
  [/carmex/i, "carmex"],
  [/dormer/i, "dormer"],
];

function classifyManufacturer(filename) {
  for (const [pattern, mfr] of MFR_PATTERNS) {
    if (pattern.test(filename)) return mfr;
  }
  return "unknown";
}

function classifyType(filename) {
  const types = [];
  const lower = filename.toLowerCase();
  if (/turning|turn/.test(lower)) types.push("turning");
  if (/milling|mill/.test(lower)) types.push("milling");
  if (/drilling|drill/.test(lower)) types.push("drilling");
  if (/threading|thread|tap/.test(lower)) types.push("threading");
  if (/grooving|groove|parting/.test(lower)) types.push("grooving");
  if (/holder|tooling/.test(lower)) types.push("tooling_systems");
  if (/vise|fixture|workhold/.test(lower)) types.push("workholding");
  if (/rotating/.test(lower)) types.push("rotating");
  if (/solid|carbide/.test(lower)) types.push("solid_carbide");
  if (types.length === 0) types.push("multi_type");
  return types;
}

async function main() {
  const wantJson = process.argv.includes("--json");

  // ── Step 1: Scan uploaded/ ──────────────────────────────────────────
  const uploadedEntries = existsSync(UPLOADED_DIR)
    ? await readdir(UPLOADED_DIR)
    : [];
  const pdfs = [];
  const zipParts = [];
  const otherFiles = [];
  for (const name of uploadedEntries) {
    const full = join(UPLOADED_DIR, name);
    let st;
    try { st = await stat(full); } catch { continue; }
    if (!st.isFile()) continue;
    if (/\.pdf$/i.test(name)) {
      pdfs.push({ name, size_mb: +(st.size / (1024 * 1024)).toFixed(1), mfr: classifyManufacturer(name), types: classifyType(name) });
    } else if (/\.zip\.[0-9]+$/i.test(name)) {
      zipParts.push({ name, size_mb: +(st.size / (1024 * 1024)).toFixed(1) });
    } else {
      otherFiles.push({ name, size_mb: +(st.size / (1024 * 1024)).toFixed(1), ext: extname(name) });
    }
  }

  // Sort zip parts by trailing number to surface gaps
  zipParts.sort((a, b) => {
    const na = parseInt(a.name.match(/zip\.(\d+)$/i)?.[1] ?? "0");
    const nb = parseInt(b.name.match(/zip\.(\d+)$/i)?.[1] ?? "0");
    return na - nb;
  });
  const zipPartNumbers = zipParts.map(p => parseInt(p.name.match(/zip\.(\d+)$/i)?.[1] ?? "0"));
  const zipPartGaps = [];
  if (zipPartNumbers.length > 0) {
    const min = Math.min(...zipPartNumbers);
    const max = Math.max(...zipPartNumbers);
    const present = new Set(zipPartNumbers);
    for (let i = min; i <= max; i++) {
      if (!present.has(i)) zipPartGaps.push(i);
    }
  }

  // ── Step 2: Load inventory ──────────────────────────────────────────
  let inventory = null;
  try {
    inventory = JSON.parse(await readFile(INVENTORY_JSON, "utf8"));
  } catch (err) {
    inventory = { error: `Failed to read ${INVENTORY_JSON}: ${err.message}` };
  }

  // ── Step 3: Drift detection — inventory vs files ────────────────────
  const inventoredFiles = new Set((inventory?.catalogs ?? []).map(c => c.file));
  const uploadedPdfFiles = new Set(pdfs.map(p => p.name));
  const inInventoryNotOnDisk = [...inventoredFiles].filter(f => !uploadedPdfFiles.has(f));
  const onDiskNotInInventory = [...uploadedPdfFiles].filter(f => !inventoredFiles.has(f));

  // Manufacturer-coverage drift: inventory's `by_manufacturer` vs reality
  const actualMfrCounts = {};
  for (const p of pdfs) {
    actualMfrCounts[p.mfr] = (actualMfrCounts[p.mfr] ?? 0) + 1;
  }
  const inventoryMfrCounts = inventory?.summary?.by_manufacturer ?? {};
  const mfrDrift = [];
  const allMfrs = new Set([...Object.keys(actualMfrCounts), ...Object.keys(inventoryMfrCounts)]);
  for (const mfr of allMfrs) {
    const actual = actualMfrCounts[mfr] ?? 0;
    const inv = inventoryMfrCounts[mfr] ?? 0;
    if (actual !== inv) {
      mfrDrift.push({ manufacturer: mfr, files_on_disk: actual, inventory_count: inv, delta: actual - inv });
    }
  }
  mfrDrift.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  // ── Step 4: Vendor-skill archives (prior extractions) ──────────────
  let vendorSkillDirs = [];
  try {
    const entries = await readdir(VENDOR_SKILLS_DIR, { withFileTypes: true });
    vendorSkillDirs = entries
      .filter(e => e.isDirectory() && /^prism-vendor-/.test(e.name))
      .map(e => e.name.replace(/^prism-vendor-/, ""));
  } catch {}

  // ── Step 5: Holder + fixture + tool-registry sizes ──────────────────
  async function lineCount(file) {
    try {
      const content = await readFile(file, "utf8");
      return content.split("\n").length;
    } catch {
      return null;
    }
  }
  async function jsonEntryCount(file, keyHint = "tools") {
    try {
      const data = JSON.parse(await readFile(file, "utf8"));
      if (Array.isArray(data)) return data.length;
      if (Array.isArray(data?.[keyHint])) return data[keyHint].length;
      // Walk top-level array-valued keys, return the largest
      const arrays = Object.entries(data).filter(([, v]) => Array.isArray(v));
      if (arrays.length === 0) return Object.keys(data).length;
      return Math.max(...arrays.map(([, v]) => v.length));
    } catch {
      return null;
    }
  }

  const holderDbLines = await lineCount(HOLDER_DB);
  const holderEntryCount = await jsonEntryCount(HOLDER_DB, "holders");
  const fixtureCounts = await Promise.all(
    FIXTURE_DBS.map(async f => ({
      file: f.replace(REPO + "/", ""),
      lines: await lineCount(f),
      entries: await jsonEntryCount(f, "fixtures"),
    }))
  );
  const toolRegistryLines = await lineCount(TOOL_REGISTRY);

  // ── Step 6: Extraction queue (priority-sorted) ──────────────────────
  // Priority: (a) sandvik catalogs missing from inventory, (b) large PDFs unindexed,
  // (c) zip-part reassembly + extraction
  const extractionQueue = [];
  for (const p of pdfs) {
    if (!inventoredFiles.has(p.name)) {
      extractionQueue.push({
        kind: "pdf",
        file: p.name,
        mfr: p.mfr,
        types: p.types,
        size_mb: p.size_mb,
        priority: p.mfr === "sandvik" ? "P0-drift" : p.size_mb > 100 ? "P1-large" : "P2-normal",
        action: "extract via /pdf-learn → write tool/holder/fixture entries to registry",
      });
    }
  }
  if (zipParts.length > 0) {
    const totalMb = zipParts.reduce((s, p) => s + p.size_mb, 0);
    extractionQueue.push({
      kind: "zip-reassembly",
      part_count: zipParts.length,
      part_gaps: zipPartGaps,
      total_size_mb: +totalMb.toFixed(1),
      first_part: zipParts[0]?.name,
      last_part: zipParts[zipParts.length - 1]?.name,
      priority: zipPartGaps.length > 0 ? "P1-needs-missing-parts" : "P2-ready-to-extract",
      action: zipPartGaps.length > 0
        ? `BLOCKED: re-upload missing zip parts ${zipPartGaps.join(", ")} before reassembly; then \`copy /b "MANUFACTURER CATALOGS.zip.*" combined.zip\` + unzip + sweep`
        : `\`copy /b "MANUFACTURER CATALOGS.zip.*" combined.zip\` + unzip + run this audit script + /pdf-learn each emergent PDF`,
    });
  }

  // ── Step 7: Sandvik drift focused finding ───────────────────────────
  const sandvikFiles = pdfs.filter(p => p.mfr === "sandvik");
  const sandvikInInventory = inventoryMfrCounts.sandvik ?? 0;
  const sandvikDriftFlag = sandvikFiles.length > 0 && sandvikInInventory === 0;

  // ── Step 8: Assemble audit ──────────────────────────────────────────
  const audit = {
    schemaVersion: "1.0.0",
    audit_id: "VENDOR-CATALOG-AUDIT-2026-05-23",
    generated_at: new Date().toISOString(),
    generated_by: "scripts/vendor-catalog-audit.mjs",
    advisoryOnly: true,
    mustHumanVerify: true,
    summary: {
      uploaded_pdfs: pdfs.length,
      uploaded_zip_parts: zipParts.length,
      uploaded_other: otherFiles.length,
      inventory_catalogs: inventory?.catalogs?.length ?? 0,
      inventory_path_field_value: inventory?.catalog_path,
      manufacturer_drift_rows: mfrDrift.length,
      pdfs_on_disk_not_in_inventory: onDiskNotInInventory.length,
      pdfs_in_inventory_not_on_disk: inInventoryNotOnDisk.length,
      vendor_skill_dirs: vendorSkillDirs.length,
      tool_registry_lines: toolRegistryLines,
      holder_db_lines: holderDbLines,
      holder_db_entries: holderEntryCount,
      extraction_queue_items: extractionQueue.length,
    },
    critical_findings: [
      ...(sandvikDriftFlag ? [{
        severity: "P0",
        finding: `Sandvik catalog drift — ${sandvikFiles.length} GC_2023-2024 PDFs on disk, inventory shows 0`,
        files: sandvikFiles.map(f => f.name),
        recommended_action: "Add sandvik entries to mcp-server/data/tool-catalog-inventory.json; extract via /pdf-learn; wire into ToolRegistry.ts insert-grade table (GRADE_SPEED_FACTORS already references Sandvik GC4325/GC4315/GC4335)",
      }] : []),
      ...(inventory?.catalog_path && !existsSync(inventory.catalog_path) ? [{
        severity: "P1",
        finding: `inventory.catalog_path '${inventory.catalog_path}' does not exist on disk — pointer drift`,
        recommended_action: `Update inventory.catalog_path to '${UPLOADED_DIR}' (where catalogs actually live now)`,
      }] : []),
      ...(zipPartGaps.length > 0 ? [{
        severity: "P1",
        finding: `${zipPartGaps.length} zip-part gaps in the split-archive sequence — reassembly will fail`,
        missing_parts: zipPartGaps,
        recommended_action: "Re-upload the missing part numbers from source before attempting \`copy /b\` concatenation",
      }] : []),
    ],
    drift: {
      manufacturer_coverage: mfrDrift,
      on_disk_not_in_inventory: onDiskNotInInventory,
      in_inventory_not_on_disk: inInventoryNotOnDisk,
    },
    sandvik_focus: {
      files_on_disk: sandvikFiles.length,
      inventory_count: sandvikInInventory,
      drift_flag: sandvikDriftFlag,
      files: sandvikFiles,
      grade_speed_factors_referenced_in_engine: ["GC4325", "GC4315", "GC4335"],
    },
    databases: {
      tool_registry: { file: "mcp-server/src/registries/ToolRegistry.ts", lines: toolRegistryLines },
      holder_db: { file: "mcp-server/data/fusion-programs/fusion-tool-holders.json", lines: holderDbLines, entries: holderEntryCount },
      fixture_dbs: fixtureCounts,
    },
    vendor_skill_archives: {
      count: vendorSkillDirs.length,
      vendors: vendorSkillDirs.sort(),
      note: "These are pre-existing vendor-specific skill packages in archives/skills-generated/ from earlier extraction passes. Cross-reference against inventory to identify vendors with skill but no inventory entry.",
    },
    extraction_queue: extractionQueue,
    psn_synergy_targets: [
      { leg: "PSN-OS (Obsidian brain)", action: "Cross-link extracted tool specs to Obsidian memories via /route-to-obsidian" },
      { leg: "PSN-Wiki", action: "Promote vendor catalog summaries to knowledge/wiki/code-tribal/ via tribal-to-wiki promoter" },
      { leg: "PSN-Tribal", action: "Mine vendor recommended-cutting-data into tribal tips" },
      { leg: "PSN-AI ladder", action: "Train SpeedFeedDeepLearningEngine.calibrationFactors on vendor-suggested ranges as priors" },
      { leg: "PSN-Engines", action: "Wire extracted GRADE_SPEED_FACTORS / coating multipliers into ExtendedTaylorModel + KienzleForceModel calibration overlays" },
    ],
    prism_app_synergy: [
      { surface: "system-viz", action: "Generate ghost.vendor_catalog_audit roost via scripts/generate-vendor-catalog-audit-features.mjs (U-AUDIT-V2 follow-on)" },
      { surface: "tool-catalog skill", action: "Surface this audit in /tool-catalog skill output as a 'drift report' section" },
      { surface: "PrismCreativeReasoningEngine", action: "Feed extraction queue as a reasoning-domain input for prioritization" },
    ],
  };

  // ── Step 9: Render MD ───────────────────────────────────────────────
  const md = renderMarkdown(audit);

  // ── Step 10: Write outputs ──────────────────────────────────────────
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_JSON, JSON.stringify(audit, null, 2));
  await writeFile(OUT_MD, md);

  if (wantJson) {
    process.stdout.write(JSON.stringify(audit, null, 2) + "\n");
  } else {
    process.stdout.write(`✓ VENDOR-CATALOG-AUDIT-2026-05-23\n`);
    process.stdout.write(`  Uploaded: ${pdfs.length} PDFs · ${zipParts.length} zip-parts · ${otherFiles.length} other\n`);
    process.stdout.write(`  Inventory: ${audit.summary.inventory_catalogs} catalogs · drift rows: ${mfrDrift.length}\n`);
    process.stdout.write(`  Critical findings: ${audit.critical_findings.length}\n`);
    process.stdout.write(`  Extraction queue: ${extractionQueue.length} items\n`);
    process.stdout.write(`  Vendor skill dirs: ${vendorSkillDirs.length}\n`);
    if (sandvikDriftFlag) {
      process.stdout.write(`  ⚠ SANDVIK DRIFT: ${sandvikFiles.length} files on disk, inventory shows 0\n`);
    }
    process.stdout.write(`  Wrote: ${OUT_JSON.replace(REPO + "/", "")}\n`);
    process.stdout.write(`  Wrote: ${OUT_MD.replace(REPO + "/", "")}\n`);
  }
}

function renderMarkdown(audit) {
  const lines = [];
  lines.push(`# Vendor Catalog Audit — 2026-05-23`);
  lines.push(``);
  lines.push(`> Generated by \`scripts/vendor-catalog-audit.mjs\` · advisory only · human-verify before acting`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(``);
  for (const [k, v] of Object.entries(audit.summary)) {
    lines.push(`- **${k}**: ${typeof v === "object" ? JSON.stringify(v) : v}`);
  }
  lines.push(``);
  lines.push(`## Critical Findings (${audit.critical_findings.length})`);
  lines.push(``);
  for (const f of audit.critical_findings) {
    lines.push(`### [${f.severity}] ${f.finding}`);
    if (f.files) lines.push(`Files: ${f.files.map(x => `\`${x}\``).join(", ")}`);
    if (f.missing_parts) lines.push(`Missing parts: ${f.missing_parts.join(", ")}`);
    lines.push(`**Action:** ${f.recommended_action}`);
    lines.push(``);
  }
  lines.push(`## Manufacturer Coverage Drift`);
  lines.push(``);
  lines.push(`| Manufacturer | Files on disk | Inventory count | Delta |`);
  lines.push(`|---|---|---|---|`);
  for (const r of audit.drift.manufacturer_coverage) {
    lines.push(`| ${r.manufacturer} | ${r.files_on_disk} | ${r.inventory_count} | ${r.delta > 0 ? "+" : ""}${r.delta} |`);
  }
  lines.push(``);
  lines.push(`## Databases`);
  lines.push(``);
  lines.push(`- ToolRegistry.ts: **${audit.databases.tool_registry.lines}** lines`);
  lines.push(`- HolderDB: **${audit.databases.holder_db.lines}** lines · **${audit.databases.holder_db.entries}** entries`);
  lines.push(`- Fixture DBs:`);
  for (const f of audit.databases.fixture_dbs) {
    lines.push(`  - \`${f.file}\`: ${f.lines} lines · ${f.entries} entries`);
  }
  lines.push(``);
  lines.push(`## Vendor Skill Archives (${audit.vendor_skill_archives.count})`);
  lines.push(``);
  lines.push(audit.vendor_skill_archives.vendors.map(v => `\`${v}\``).join(", "));
  lines.push(``);
  lines.push(`## Extraction Queue (${audit.extraction_queue.length})`);
  lines.push(``);
  for (const item of audit.extraction_queue) {
    lines.push(`- **[${item.priority}]** ${item.kind === "pdf" ? `\`${item.file}\` (${item.mfr}, ${item.size_mb}MB)` : `${item.kind}: ${item.part_count} parts, ${item.total_size_mb}MB total, gaps=${item.part_gaps?.length ?? 0}`}`);
    lines.push(`  - ${item.action}`);
  }
  lines.push(``);
  lines.push(`## PSN Synergy Targets`);
  lines.push(``);
  for (const t of audit.psn_synergy_targets) {
    lines.push(`- **${t.leg}** — ${t.action}`);
  }
  lines.push(``);
  lines.push(`## PRISM App Synergy`);
  lines.push(``);
  for (const t of audit.prism_app_synergy) {
    lines.push(`- **${t.surface}** — ${t.action}`);
  }
  lines.push(``);
  return lines.join("\n");
}

main().catch(err => {
  console.error("vendor-catalog-audit failed:", err);
  process.exit(1);
});
