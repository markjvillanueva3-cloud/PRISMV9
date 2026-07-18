#!/usr/bin/env node
/**
 * extract-fusion-tooling-catalog.mjs
 * ===================================
 *
 * MIKE /goal session (2026-05-23) — Fusion 360 .hsmlib tooling-catalog extractor.
 * Pure read-only static XML parsing. Uses node:fs only.
 *
 * User /goal directive: "extract tooling catalog from fusion libraries to use
 * for the back bone of tooling data and speed and feed parameters".
 *
 * .hsmlib files are HSMWorks tool-library XML (UTF-16 LE). Each library has
 * many <tool> entries; each tool carries body geometry + holder + <presets>
 * (each preset is a key/value bag of tool_spindleSpeed, tool_feedCutting,
 * tool_feedPlunge, tool_feedEntry, tool_feedExit, tool_feedRamp, tool_coolant).
 *
 * The 7 lathe-keyed gap from JM-LATHE-POST-AUDIT-2026-05-23 has NO matching
 * .hsmlib today — the 8 existing libs are mill/EDM (HURCO, Haas VF-2/3,
 * Roku-Roku copper/graphite, Engraver, Tool Holders). This extractor lets a
 * follow-up unit (bravo, lathe domain) seed lathe libs by deriving speed/feed
 * patterns from the mill catalogs as a starting backbone.
 *
 * Usage:
 *   node scripts/extract-fusion-tooling-catalog.mjs                      # pretty print
 *   node scripts/extract-fusion-tooling-catalog.mjs --json               # JSON-only
 *   node scripts/extract-fusion-tooling-catalog.mjs --out FILE           # write file
 *   node scripts/extract-fusion-tooling-catalog.mjs --library HURCO      # single lib
 *
 * @unit U-MIKE-FUSION-TOOLING-CATALOG
 * @slot mike
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const FUSION_LIB_DIR = "H:/PRISM/JM DIE/JM DIE COMPANY/My Libraries";

/**
 * Read a .hsmlib file and decode UTF-16 LE -> UTF-8 text.
 * Strips BOM and the XML prolog encoding declaration mismatch.
 */
export function readHsmlibText(path) {
  const buf = readFileSync(path);
  const isUtf16Le = buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe;
  const text = isUtf16Le ? buf.toString("utf16le").replace(/^﻿/, "") : buf.toString("utf8");
  return text;
}

/**
 * Extract one attribute value from an opening tag. Pure regex, no DOM.
 */
export function attr(tagText, name) {
  const re = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`);
  const m = re.exec(tagText);
  return m ? m[1] : null;
}

/**
 * Pull all <preset>...</preset> blocks under a given tool XML chunk.
 */
export function extractPresets(toolXml) {
  const presets = [];
  const presetRe = /<preset\b([^>]*)>([\s\S]*?)<\/preset>/g;
  let m;
  while ((m = presetRe.exec(toolXml)) !== null) {
    const openTag = m[1] || "";
    const inner = m[2] || "";
    const params = {};
    const paramRe = /<parameter\s+key="([^"]+)"\s+value="([^"]*)"\s*\/>/g;
    let p;
    while ((p = paramRe.exec(inner)) !== null) {
      params[p[1]] = p[2];
    }
    presets.push({
      id: attr(openTag, "id"),
      name: attr(openTag, "name"),
      description: attr(openTag, "description"),
      parameters: params,
    });
  }
  return presets;
}

/**
 * Extract the text content of a self-contained element like <description>X</description>
 */
export function textElem(toolXml, name) {
  const re = new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`);
  const m = re.exec(toolXml);
  if (!m) return null;
  return m[1]
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'");
}

/**
 * Extract attributes of a self-closing element like <body diameter="0.75" .../>
 */
export function selfElem(toolXml, name) {
  const re = new RegExp(`<${name}\\b([^>]*?)\\/>`);
  const m = re.exec(toolXml);
  if (!m) return null;
  const tagText = m[1];
  const out = {};
  const attrRe = /(\w[\w-]*)="([^"]*)"/g;
  let a;
  while ((a = attrRe.exec(tagText)) !== null) {
    out[a[1]] = a[2];
  }
  return out;
}

/**
 * Parse one <tool>...</tool> block into a structured record.
 */
export function parseToolXml(openAttrs, toolXml) {
  const body = selfElem(toolXml, "body") || {};
  const holder = selfElem(toolXml, "holder") || {};
  const coolant = selfElem(toolXml, "coolant") || {};
  const material = selfElem(toolXml, "material") || {};
  const nc = selfElem(toolXml, "nc") || {};
  const presets = extractPresets(toolXml);

  const diameter_in = body.diameter ? Number(body.diameter) : null;
  const num_flutes = body["number-of-flutes"] ? Number(body["number-of-flutes"]) : null;
  const corner_radius_in = body["corner-radius"] ? Number(body["corner-radius"]) : null;

  return {
    guid: attr(openAttrs, "guid"),
    type: attr(openAttrs, "type"),
    unit: attr(openAttrs, "unit"),
    version: attr(openAttrs, "version"),
    description: textElem(toolXml, "description"),
    comment: textElem(toolXml, "comment"),
    manufacturer: textElem(toolXml, "manufacturer"),
    product_id: textElem(toolXml, "product-id"),
    geometry: {
      diameter_in,
      num_flutes,
      corner_radius_in,
      flute_length_in: body["flute-length"] ? Number(body["flute-length"]) : null,
      overall_length_in: body["overall-length"] ? Number(body["overall-length"]) : null,
      shaft_diameter_in: body["shaft-diameter"] ? Number(body["shaft-diameter"]) : null,
      shoulder_length_in: body["shoulder-length"] ? Number(body["shoulder-length"]) : null,
      body_length_in: body["body-length"] ? Number(body["body-length"]) : null,
      thread_pitch: body["thread-pitch"] ? Number(body["thread-pitch"]) : null,
      thread_profile_angle: body["thread-profile-angle"] ? Number(body["thread-profile-angle"]) : null,
      material: material.name || null,
      coolant_support: body["coolant-support"] || null,
    },
    holder: {
      description: holder.description || null,
      comment: holder.comment || null,
      product_id: holder["product-id"] || null,
    },
    coolant_mode: coolant.mode || null,
    nc: {
      number: nc.number ? Number(nc.number) : null,
      diameter_offset: nc["diameter-offset"] ? Number(nc["diameter-offset"]) : null,
      length_offset: nc["length-offset"] ? Number(nc["length-offset"]) : null,
      turret: nc.turret ? Number(nc.turret) : null,
      live_tool: nc["live-tool"] || null,
      break_control: nc["break-control"] || null,
      manual_tool_change: nc["manual-tool-change"] || null,
    },
    presets,
  };
}

/**
 * Walk a .hsmlib text and pull every <tool>...</tool>.
 */
export function extractTools(text) {
  const tools = [];
  // Require whitespace after "tool" so we do NOT match <tool-library>.
  const toolRe = /<tool\s+([^>]*)>([\s\S]*?)<\/tool>/g;
  let m;
  while ((m = toolRe.exec(text)) !== null) {
    tools.push(parseToolXml(m[1], m[2]));
  }
  return tools;
}

/**
 * Parse one whole .hsmlib file end-to-end.
 */
export function parseHsmlib(path) {
  const text = readHsmlibText(path);
  const libOpen = /<tool-library\b([^>]*)>/.exec(text);
  const libAttrs = libOpen ? libOpen[1] : "";
  const tools = extractTools(text);
  return {
    library_file: basename(path),
    library_path: path,
    library_guid: attr(libAttrs, "guid"),
    library_version: attr(libAttrs, "version"),
    tool_count: tools.length,
    tools,
  };
}

/**
 * Enumerate all .hsmlib in the Fusion dir.
 */
export function listHsmlibFiles(dir = FUSION_LIB_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".hsmlib"))
    .map((f) => join(dir, f));
}

function bucketStats(arr) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return {
    n: sorted.length,
    min: sorted[0],
    median,
    max: sorted[sorted.length - 1],
  };
}

/**
 * Per-type histogram for one library.
 */
export function summarizeLibrary(lib) {
  const byType = {};
  for (const t of lib.tools) {
    const key = t.type || "unknown";
    byType[key] ||= {
      count: 0,
      diameters_in: [],
      preset_count: 0,
      spindle_rpm: [],
      feed_cutting: [],
      feed_plunge: [],
      coolant_modes: {},
    };
    const slot = byType[key];
    slot.count += 1;
    if (t.geometry.diameter_in != null) slot.diameters_in.push(t.geometry.diameter_in);
    if (t.coolant_mode) slot.coolant_modes[t.coolant_mode] = (slot.coolant_modes[t.coolant_mode] || 0) + 1;
    for (const p of t.presets) {
      slot.preset_count += 1;
      const rpm = Number(p.parameters.tool_spindleSpeed);
      const fc = Number(p.parameters.tool_feedCutting);
      const fp = Number(p.parameters.tool_feedPlunge);
      if (Number.isFinite(rpm) && rpm > 0) slot.spindle_rpm.push(rpm);
      if (Number.isFinite(fc) && fc > 0) slot.feed_cutting.push(fc);
      if (Number.isFinite(fp) && fp > 0) slot.feed_plunge.push(fp);
    }
  }
  const stats = {};
  for (const [k, v] of Object.entries(byType)) {
    stats[k] = {
      count: v.count,
      preset_count: v.preset_count,
      diameters_in: bucketStats(v.diameters_in),
      spindle_rpm: bucketStats(v.spindle_rpm),
      feed_cutting: bucketStats(v.feed_cutting),
      feed_plunge: bucketStats(v.feed_plunge),
      coolant_modes: v.coolant_modes,
    };
  }
  return stats;
}

/**
 * Build the full multi-library catalog.
 */
export function buildCatalog({ libraries, generatedAt = new Date().toISOString() }) {
  const totalTools = libraries.reduce((s, l) => s + l.tool_count, 0);
  const totalPresets = libraries.reduce(
    (s, l) => s + l.tools.reduce((ss, t) => ss + t.presets.length, 0),
    0,
  );
  const allTypes = new Set();
  for (const l of libraries) for (const t of l.tools) if (t.type) allTypes.add(t.type);

  const byTypeAcross = {};
  for (const l of libraries) {
    for (const t of l.tools) {
      const key = t.type || "unknown";
      byTypeAcross[key] ||= {
        count: 0,
        diameters_in: [],
        spindle_rpm: [],
        feed_cutting: [],
        feed_plunge: [],
        materials: {},
      };
      const slot = byTypeAcross[key];
      slot.count += 1;
      if (t.geometry.diameter_in != null) slot.diameters_in.push(t.geometry.diameter_in);
      if (t.geometry.material) slot.materials[t.geometry.material] = (slot.materials[t.geometry.material] || 0) + 1;
      for (const p of t.presets) {
        const rpm = Number(p.parameters.tool_spindleSpeed);
        const fc = Number(p.parameters.tool_feedCutting);
        const fp = Number(p.parameters.tool_feedPlunge);
        if (Number.isFinite(rpm) && rpm > 0) slot.spindle_rpm.push(rpm);
        if (Number.isFinite(fc) && fc > 0) slot.feed_cutting.push(fc);
        if (Number.isFinite(fp) && fp > 0) slot.feed_plunge.push(fp);
      }
    }
  }
  const typeBackbone = {};
  for (const [k, v] of Object.entries(byTypeAcross)) {
    typeBackbone[k] = {
      count: v.count,
      diameters_in: bucketStats(v.diameters_in),
      spindle_rpm: bucketStats(v.spindle_rpm),
      feed_cutting: bucketStats(v.feed_cutting),
      feed_plunge: bucketStats(v.feed_plunge),
      materials: v.materials,
    };
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt,
    advisoryOnly: true,
    must_human_verify: true,
    domain_handoff_to: "bravo (lathe-domain owner per JULIETT-12CHAT)",
    purpose: "Speed/feed backbone derived from existing mill/EDM Fusion .hsmlib libraries - seed for lathe-keyed library generation",
    summary: {
      library_count: libraries.length,
      total_tools: totalTools,
      total_presets: totalPresets,
      distinct_tool_types: allTypes.size,
    },
    libraries: libraries.map((l) => ({
      library_file: l.library_file,
      library_guid: l.library_guid,
      library_version: l.library_version,
      tool_count: l.tool_count,
      per_type_stats: summarizeLibrary(l),
    })),
    speed_feed_backbone_by_type: typeBackbone,
    raw_tools: libraries.flatMap((l) =>
      l.tools.map((t) => ({ ...t, source_library: l.library_file })),
    ),
    notes: [
      "Speed/feed values are sourced from existing mill/EDM Fusion libraries - NOT a lathe library (no lathe .hsmlib exists in JM Die today).",
      "Use the type-keyed backbone as a starting point for lathe library seeding (drill/face mill/end mill data, cross-walk to lathe equivalents).",
      "tool_spindleSpeed is rpm; tool_feedCutting/Plunge/Entry/Exit/Ramp are in/min or mm/min depending on tool unit attribute.",
      "Mike provides extraction infra; bravo (lathe-domain) maps the seed into Okuma-specific .hsmlib + OSP macro parameters.",
    ],
  };
}

function main() {
  const args = process.argv.slice(2);
  const jsonOnly = args.includes("--json");
  const outIdx = args.indexOf("--out");
  const outPath = outIdx >= 0 ? args[outIdx + 1] : null;
  const libIdx = args.indexOf("--library");
  const libFilter = libIdx >= 0 ? args[libIdx + 1] : null;

  let files = listHsmlibFiles();
  if (libFilter) {
    files = files.filter((f) => basename(f).toLowerCase().includes(libFilter.toLowerCase()));
  }
  if (!files.length) {
    console.error(`No .hsmlib files found${libFilter ? ` matching "${libFilter}"` : ""} in ${FUSION_LIB_DIR}`);
    process.exit(1);
  }

  const libraries = files.map((f) => parseHsmlib(f));
  const catalog = buildCatalog({ libraries });
  const json = JSON.stringify(catalog, null, 2);

  if (outPath) {
    writeFileSync(outPath, json);
    if (!jsonOnly) console.error(`Wrote ${outPath}`);
    return;
  }
  if (jsonOnly) {
    process.stdout.write(json);
    return;
  }

  console.log(`Fusion 360 Tooling Catalog - ${catalog.generatedAt}`);
  console.log(`Libraries: ${catalog.summary.library_count} | Tools: ${catalog.summary.total_tools} | Presets: ${catalog.summary.total_presets} | Types: ${catalog.summary.distinct_tool_types}`);
  console.log("\nPer-library tool counts:");
  for (const l of catalog.libraries) {
    console.log(`  - ${l.library_file}: ${l.tool_count} tools`);
  }
  console.log("\nSpeed/feed backbone by tool type (top 10):");
  const sorted = Object.entries(catalog.speed_feed_backbone_by_type)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10);
  for (const [type, stats] of sorted) {
    const dia = stats.diameters_in ? `${stats.diameters_in.min}-${stats.diameters_in.max}" (n=${stats.diameters_in.n})` : "-";
    const rpm = stats.spindle_rpm ? `${stats.spindle_rpm.min}-${stats.spindle_rpm.max} rpm (med ${stats.spindle_rpm.median})` : "-";
    const fc = stats.feed_cutting ? `${stats.feed_cutting.min}-${stats.feed_cutting.max} (med ${stats.feed_cutting.median})` : "-";
    console.log(`  - ${type} (${stats.count}): dia=${dia} | rpm=${rpm} | feedCut=${fc}`);
  }
}

const __thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && process.argv[1].replace(/\\/g, "/") === __thisFile.replace(/\\/g, "/")) {
  main();
}
