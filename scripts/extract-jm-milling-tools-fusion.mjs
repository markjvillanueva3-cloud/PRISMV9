#!/usr/bin/env node
/**
 * extract-jm-milling-tools-fusion.mjs — JM-FUSION-TOOLS-MS0
 *
 * Walks mcp-server/src/data/*-tools-extracted.json + *-tools.json
 * (the already-extracted brand catalogs JM Die uses in practice —
 * Accupro / AMPC / Camfix / Emuge / Flash / Guhring / Helical / Mitsubishi /
 * OSG / SECO / Sandvik / Walter / YG-1 / etc.), filters for MILLING tool
 * types (excludes drill/tap/bore/ream/etc.), and emits a Fusion 360
 * importable tool library.
 *
 * Output:
 *   state/shared/jm-fusion-tools/jm-milling-tools.json       (intermediate manifest)
 *   state/shared/jm-fusion-tools/jm-milling-tools.tools      (Fusion 360 format)
 *   state/shared/jm-fusion-tools/jm-milling-tools.md         (operator-readable index)
 *
 * Fusion 360 .tools is a JSON array — Fusion loads it via Manage → Tool Library
 * → Import. Each tool needs: BMC ID, description, geometry (DC/NOF/OAL/LF/SFDM),
 * vendor, unit, type. See https://help.autodesk.com/view/fusion360/ENU/?guid=GUID-...
 *
 * @milestone JM-FUSION-TOOLS-MS0
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_ROOT = process.cwd().replace(/\\/g, "/");
const DATA_DIR = resolve(PROJECT_ROOT, "mcp-server", "src", "data");
const OUT_DIR = resolve(PROJECT_ROOT, "state", "shared", "jm-fusion-tools");

// Milling tool types — exclude turning/drilling/threading/etc.
// Aligned with Fusion 360 type enum + PRISM's data-catalog type column.
const MILLING_TYPES = new Set([
  "endmill", "end_mill", "end-mill", "flat end mill", "flat_end_mill",
  "ballmill", "ball_mill", "ball-mill", "ball end mill", "ball_end_mill",
  "facemill", "face_mill", "face-mill", "face mill",
  "chamfermill", "chamfer_mill", "chamfer-mill", "chamfer mill",
  "bullnose", "bull nose", "bull_nose", "bullnose end mill",
  "slotting", "slotmill", "slot mill", "slot_mill",
  "tslot", "t-slot", "t_slot",
  "thread mill", "threadmill", "thread_mill",
  "form mill", "form_mill",
  "lollipop", "lollipop mill",
  "tapered", "taper mill", "taper_mill",
  "corner radius", "corner_radius",
  "highfeed", "high feed", "high-feed", "high_feed",
  "roughing", "rougher", "rougher mill",
]);

function safeStat(p) { try { return statSync(p); } catch { return null; } }

function isMillingType(t) {
  if (!t) return false;
  const norm = String(t).toLowerCase().trim();
  if (MILLING_TYPES.has(norm)) return true;
  // permissive fallback: any type containing 'mill' but not 'drill'/'tap'/etc.
  if (/mill/.test(norm) && !/drill|tap|bore|ream|countersink|spotting/.test(norm)) {
    return true;
  }
  return false;
}

function listToolFiles() {
  if (!safeStat(DATA_DIR)) return [];
  return readdirSync(DATA_DIR)
    .filter(f => /-tools-extracted\.json$/.test(f) || /^[^.]*-tools\.json$/.test(f))
    .map(f => resolve(DATA_DIR, f));
}

function readToolJson(path) {
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch { return []; }
}

// MS1 — holder selection rule: face mill → BT40 face-mill holder, large
// shank (≥20mm) → BT40 endmill, small/medium → ER32, micro (≤3mm) → ER20.
// Same per-type fields Fusion expects.
function pickHolder(type, sfd) {
  if (/face mill/.test(type)) {
    return { description: "BT40 Face Mill Holder", "product-id": "BT40-FACE-HOLDER", vendor: "Default" };
  }
  if (sfd >= 20) {
    return { description: "BT40 End Mill Holder", "product-id": "BT40-ENDMILL", vendor: "Default" };
  }
  if (sfd <= 3) {
    return { description: "ER20 Collet", "product-id": "ER20-COLLET", vendor: "Default" };
  }
  return { description: "ER32 Collet", "product-id": "ER32-COLLET", vendor: "Default" };
}

// MS1 — start-values presets per ISO group. Conservative SFM × chipload
// table (industry baseline for HSS carbide on a 10HP+ machine). Operator
// can override; these populate the Fusion speed/feed dialog out of the box.
// Format mirrors Fusion's preset schema:
//   { guid, description, tool-coolant, material, "feed-per-revolution"?, ... }
function pickStartValues(type, dia) {
  if (!dia || dia <= 0) return { presets: [] };
  // Approximate IPT (mm per tooth) by tool diameter range — small tools take
  // smaller chiploads. SFM constant per material; convert to RPM via dia.
  const baseChiploadMm = dia < 3 ? 0.01 : dia < 6 ? 0.025 : dia < 10 ? 0.05 : 0.08;
  const presets = [
    {
      guid: `material-N-${dia}`,
      description: `Aluminum 6061 (ISO N) — ${dia}mm`,
      material: "aluminum",
      "tool-coolant": "flood",
      "n": Math.round(1000 * 500 / (Math.PI * dia)),         // 500 SFM → RPM
      "f_n": baseChiploadMm,                                  // mm/tooth
    },
    {
      guid: `material-P-${dia}`,
      description: `Steel 4140 (ISO P) — ${dia}mm`,
      material: "steel",
      "tool-coolant": "flood",
      "n": Math.round(1000 * 350 / (Math.PI * dia)),         // 350 SFM → RPM (steel)
      "f_n": baseChiploadMm * 0.6,                            // steel chipload ~60% of Al
    },
    {
      guid: `material-M-${dia}`,
      description: `Stainless 304 (ISO M) — ${dia}mm`,
      material: "stainless steel",
      "tool-coolant": "flood",
      "n": Math.round(1000 * 200 / (Math.PI * dia)),         // 200 SFM → RPM (304)
      "f_n": baseChiploadMm * 0.5,                            // SS chipload ~50% of Al
    },
  ];
  // Only emit presets that fit on a typical 10K-RPM JM Die mill
  return { presets: presets.filter(p => p.n > 0 && p.n <= 12000) };
}

function toFusionTool(t, idx) {
  // Map PRISM canonical tool record → Fusion 360 .tools schema.
  // Defensive — every field falls back to a sane default if missing.
  const dia = t.cutting_diameter_mm ?? t.diameter_mm ?? t.dc ?? 0;
  const flutes = t.flutes ?? t.nof ?? t.number_of_flutes ?? 4;
  const oal = t.overall_length_mm ?? t.oal ?? Math.max(dia * 4, 40);
  const lf = t.flute_length_mm ?? t.lf ?? Math.max(dia * 2, 10);
  const sfd = t.shank_diameter_mm ?? t.sfdm ?? dia;
  const cr = t.corner_radius_mm ?? t.cr ?? 0;
  const vendor = t.manufacturer ?? t.vendor ?? "JM-DIE";
  const desc = t.description ?? t.designation ?? `${vendor} ${dia}mm ${flutes}FL`;
  const type = normalizeType(t.type);
  return {
    BMC: idx + 1,
    description: desc,
    "product-id": t.designation ?? `JM-MILL-${idx + 1}`,
    type,
    unit: "millimeters",
    vendor,
    "post-process": {
      "comment": desc,
      "diameter-offset": idx + 1,
      "length-offset": idx + 1,
      "live": true,
      "manual-tool-change": false,
      "number": idx + 1,
      "tool-coolant": "flood",
    },
    geometry: {
      DC: dia,
      DCN: dia,
      NOF: flutes,
      OAL: oal,
      LF: lf,
      SFDM: sfd,
      ...(cr > 0 ? { RE: cr } : {}),
      "shoulder-length": lf,
      "thread-profile-angle": 0,
      "tip-diameter": dia,
      "tip-length": 0,
      "shaft-diameter": sfd,
    },
    holder: pickHolder(type, sfd),         // MS1 — type-aware holder
    "start-values": pickStartValues(type, dia),  // MS1 — per-ISO presets
  };
}

function normalizeType(t) {
  if (!t) return "flat end mill";
  const norm = String(t).toLowerCase();
  if (/ball/.test(norm)) return "ball end mill";
  if (/face/.test(norm)) return "face mill";
  if (/chamfer/.test(norm)) return "chamfer mill";
  if (/bull|corner.?radius/.test(norm)) return "bull nose end mill";
  if (/thread/.test(norm)) return "thread mill";
  if (/slot/.test(norm)) return "slot mill";
  if (/form/.test(norm)) return "form mill";
  if (/taper/.test(norm)) return "tapered mill";
  return "flat end mill";
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const files = listToolFiles();
  console.log(`Scanning ${files.length} brand catalog files...`);

  const byBrand = {};
  let millingAll = [];
  let totalScanned = 0;
  for (const f of files) {
    const tools = readToolJson(f);
    totalScanned += tools.length;
    const millingHere = tools.filter(t => isMillingType(t.type));
    for (const t of millingHere) {
      const v = t.manufacturer ?? t.vendor ?? "unknown";
      byBrand[v] = (byBrand[v] ?? 0) + 1;
    }
    millingAll = millingAll.concat(millingHere);
  }

  // MS1 — split out unknown-vendor tools so they don't pollute the main
  // Fusion library. They're still saved for forensics + future backfill.
  const milling = millingAll.filter(t => {
    const v = t.manufacturer ?? t.vendor;
    return typeof v === "string" && v.length > 0 && v.toLowerCase() !== "unknown";
  });
  const unknownVendorTools = millingAll.filter(t => {
    const v = t.manufacturer ?? t.vendor;
    return !v || v.toLowerCase() === "unknown";
  });
  if (unknownVendorTools.length > 0) {
    writeFileSync(
      resolve(OUT_DIR, "unknown-vendor-tools.json"),
      JSON.stringify({
        count: unknownVendorTools.length,
        note: "Tools whose source catalog did not name a manufacturer. Excluded from the main Fusion library. Re-run after backfilling provenance in mcp-server/src/data/*-tools.json.",
        tools: unknownVendorTools,
      }, null, 2),
    );
    console.log(`Quarantined ${unknownVendorTools.length} unknown-vendor tools to unknown-vendor-tools.json`);
  }

  console.log(`Total tools scanned: ${totalScanned}`);
  console.log(`Milling tools extracted: ${milling.length}`);
  console.log(`By brand:`);
  for (const [b, n] of Object.entries(byBrand).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${b}: ${n}`);
  }

  const manifest = {
    schemaVersion: "1.0.0",
    generated_at: new Date().toISOString(),
    generated_by: "scripts/extract-jm-milling-tools-fusion.mjs",
    sourceFiles: files.length,
    totalToolsScanned: totalScanned,
    millingToolsExtracted: milling.length,
    byBrand,
    tools: milling,
  };
  writeFileSync(resolve(OUT_DIR, "jm-milling-tools.json"), JSON.stringify(manifest, null, 2));

  const fusionTools = milling.map(toFusionTool);
  // Fusion .tools format: top-level data array of tool objects.
  const fusionLibrary = { data: fusionTools, version: 1 };
  writeFileSync(resolve(OUT_DIR, "jm-milling-tools.tools"), JSON.stringify(fusionLibrary, null, 2));

  // Operator-readable index
  let md = `# JM Milling Tools — Fusion 360 Library\n\n`;
  md += `Generated: ${new Date().toISOString()}\n`;
  md += `Source: \`scripts/extract-jm-milling-tools-fusion.mjs\`\n\n`;
  md += `## Summary\n\n`;
  md += `- Brand catalogs scanned: **${files.length}**\n`;
  md += `- Total tools scanned: **${totalScanned}**\n`;
  md += `- Milling tools extracted: **${milling.length}**\n\n`;
  md += `## By brand\n\n`;
  md += `| Brand | Milling tool count |\n|---|---:|\n`;
  for (const [b, n] of Object.entries(byBrand).sort((a, b) => b[1] - a[1])) {
    md += `| ${b} | ${n} |\n`;
  }
  md += `\n## How to import into Fusion 360\n\n`;
  md += `1. Open Fusion 360 → Manage tab → Tool Library\n`;
  md += `2. Local → Right-click → Import → select \`jm-milling-tools.tools\`\n`;
  md += `3. Tools appear under the imported library — drag into Cloud or a Project library as needed.\n\n`;
  md += `## Provenance\n\n`;
  md += `Source catalogs: all \`mcp-server/src/data/*-tools-extracted.json\` + \`*-tools.json\` filtered to milling types (endmill / ballmill / facemill / chamfermill / bullnose / slotmill / threadmill / formmill / tapered). Excludes drilling / tapping / boring / reaming / countersinking.\n`;
  writeFileSync(resolve(OUT_DIR, "jm-milling-tools.md"), md);

  console.log(`✓ Wrote ${resolve(OUT_DIR, "jm-milling-tools.json")}`);
  console.log(`✓ Wrote ${resolve(OUT_DIR, "jm-milling-tools.tools")}`);
  console.log(`✓ Wrote ${resolve(OUT_DIR, "jm-milling-tools.md")}`);
}

main();
