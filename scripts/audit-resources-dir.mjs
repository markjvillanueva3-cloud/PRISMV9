#!/usr/bin/env node
/**
 * audit-resources-dir.mjs — P14-U01: inventory + classify Resources/
 * subdirectories, skipping machining-specific.
 *
 * Output: state/shared/specs/RESOURCES-DIR-AUDIT.{json,md}
 *
 * Pure enumeration — no file reads, no daemon contact.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const RESOURCES_DIR = "H:/prism/Resources";
const OUT_JSON = "H:/prism/state/shared/specs/RESOURCES-DIR-AUDIT.json";
const OUT_MD = "H:/prism/state/shared/specs/RESOURCES-DIR-AUDIT.md";

// Machining-specific tokens — these subdirs/families are skipped per P14-U01 spec.
const MACHINING_TOKENS = [
  "mastercam", "hypermill", "fusion360", "fusion-360", "inventor", "solidcam",
  "esprit", "powermill", "catia", "nx-cam", "nx_cam", "siemens-nx", "creo",
  "topsolid", "worknc", "edgecam", "alphacam", "gibbscam", "visi", "tebis",
  "okuma", "fanuc", "haas", "mazak", "doosan", "dmg-mori", "mitsubishi",
  "wedm", "edm", "lathe", "mill-", "turning", "grinding", "swiss",
  "controller", "g-code", "gcode", "post-processor", "post_processor",
  "speedfeed", "speed-feed", "speed_feed", "kienzle", "taylor",
  "machining", "cnc", "cam",
];

function isMachiningSpecific(name) {
  const lower = name.toLowerCase();
  return MACHINING_TOKENS.some(t => lower.includes(t));
}

const rootEntries = [];
try {
  for (const e of fs.readdirSync(RESOURCES_DIR, { withFileTypes: true })) {
    if (!e.isDirectory() && !e.isFile()) continue;
    let stat;
    try { stat = fs.statSync(path.join(RESOURCES_DIR, e.name)); } catch { continue; }
    rootEntries.push({
      name: e.name,
      type: e.isDirectory() ? "dir" : "file",
      bytes: stat.size,
      mtime: stat.mtime.toISOString(),
      machiningSpecific: isMachiningSpecific(e.name),
    });
  }
} catch (err) {
  rootEntries.push({ error: String(err) });
}

// Count files per top-level dir without recursing deep (depth=1 only — Resources/<dir>/<file>)
function shallowCount(d) {
  try {
    return fs.readdirSync(d, { withFileTypes: true }).length;
  } catch { return 0; }
}

for (const e of rootEntries) {
  if (e.type === "dir") {
    e.shallowChildCount = shallowCount(path.join(RESOURCES_DIR, e.name));
  }
}

const machiningCount = rootEntries.filter(e => e.machiningSpecific).length;
const nonMachining = rootEntries.filter(e => !e.machiningSpecific);

const out = {
  generated_at: new Date().toISOString(),
  unit: "P14-U01",
  milestone: "INTEL-OLLAMA-OBSIDIAN-MS0",
  advisory_only: true,
  scope: RESOURCES_DIR,
  totalRootEntries: rootEntries.length,
  machiningSpecificCount: machiningCount,
  nonMachiningCount: nonMachining.length,
  recommendation: "Non-machining entries (below) are candidates for INTEL ingest by P14-U02 PDF batch worker + P14-U03 auto-link.",
  nonMachiningEntries: nonMachining,
  allEntries: rootEntries,
};

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2) + "\n");

const md = [
  `# Resources/ Subdirectory Audit (P14-U01)`,
  ``,
  `**Generated:** ${out.generated_at}`,
  `**Scope:** \`${RESOURCES_DIR}\``,
  ``,
  `## Summary`,
  `- Total root entries: **${out.totalRootEntries}**`,
  `- Machining-specific (skipped): **${out.machiningSpecificCount}**`,
  `- Non-machining (candidates for INTEL ingest): **${out.nonMachiningCount}**`,
  ``,
  `## Non-machining entries (candidates for P14-U02/U03 pipeline)`,
  ...nonMachining.map(e => `- **${e.name}** (${e.type}, ${e.bytes ? (e.bytes / 1024).toFixed(1) + 'KB' : 'dir'}${e.shallowChildCount !== undefined ? `, ${e.shallowChildCount} children` : ''})`),
  ``,
  `## All root entries`,
  ...rootEntries.map(e => {
    const tag = e.machiningSpecific ? "🔧 MACHINING" : "📚 INTEL";
    return `- ${tag} **${e.name}** (${e.type}${e.shallowChildCount !== undefined ? `, ${e.shallowChildCount} children` : ''})`;
  }),
  ``,
  `---`,
  `Advisory-only — top-level enumeration, no deep recursion or file content read.`,
].join("\n");

fs.writeFileSync(OUT_MD, md);

console.log(JSON.stringify({ ok: true, total: rootEntries.length, machining: machiningCount, nonMachining: nonMachining.length, outJson: OUT_JSON, outMd: OUT_MD }, null, 2));
