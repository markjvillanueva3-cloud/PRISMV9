/**
 * fix-helical-source-geometry.mjs
 * [JM-FUSION-TOOLS]/U-HELICAL-GEOM-FIX (slot:romeo, 2026-06-18). Fabrication-free source hygiene
 * for the 2485 Helical end mills in unknown-vendor-tools.json, per CAM-REMEDIATION-PLAN.md.
 *
 * Fixes ONLY physical-invariant / scale defects -- NEVER invents a catalog dimension (R12):
 *   - overall_length_mm null/<=0 (16 tools): fill = round1(flute_length + max(shank, STICKOUT_FLOOR));
 *     guarantees OAL > flute (physical). Flag `oal_estimated:true` -- this is a SAFETY FLOOR, not a
 *     catalog value; the true OAL needs a Helical/Docustrata lookup (listed in the sidecar).
 *   - shank_diameter_mm > 100mm (1 tool: ECI-5 .25-1.C.06VF3 = 25374.6mm = 999in x 25.4 scale error):
 *     set shank = cutting_diameter_mm (straight-shank end-mill norm). Flag `shank_estimated:true`.
 *   - flute_length_mm > overall_length_mm AFTER the OAL fill (EBAI-B3 = 1270mm/50in parse garbage):
 *     can't know true LOC -> flag `geometry_suspect:true` + `needs_catalog_loc:true`. The CAM generators
 *     EXCLUDE suspect tools from the shipped collision libs (never ship flute>OAL).
 *
 * The fill makes all 3 CAM generators read ONE real OAL -> kills the cross-CAM (D5) divergence once they
 * are regenerated from this fixed source. Atomic write (temp + rename); re-runnable (idempotent: a tool
 * already flagged estimated is not re-touched). Emits HELICAL-GEOMETRY-ESTIMATED.json (every tool changed).
 *
 * Run: node mcp-server/scripts/fix-helical-source-geometry.mjs [--dry]
 */
import { readFileSync, writeFileSync, renameSync } from "node:fs";

const SRC = "H:/prism/state/shared/jm-fusion-tools/unknown-vendor-tools.json";
const SIDECAR = "H:/prism/state/shared/jm-fusion-tools/HELICAL-GEOMETRY-ESTIMATED.json";
const HELICAL = "Helical Solutions";
const STICKOUT_FLOOR_MM = 12.7; // >=0.5in of shank grip above the flutes (physical floor, not a catalog OAL)
const SHANK_GROSS_MM = 100;
const DRY = process.argv.includes("--dry");
const r1 = (n) => Math.round(n * 10) / 10;

const raw = readFileSync(SRC, "utf8");
const d = JSON.parse(raw);
const tools = Array.isArray(d) ? d : d.tools;
if (!Array.isArray(tools)) { console.error("FATAL: unexpected shape (no tools array)"); process.exit(1); }

const touched = [];
let oalFilled = 0, shankFixed = 0, suspectMarked = 0;

for (const t of tools) {
  if (t.brand !== HELICAL) continue;
  const dia = t.cutting_diameter_mm, flute = t.flute_length_mm;
  const before = { designation: t.designation, oal: t.overall_length_mm, shank: t.shank_diameter_mm, flute };
  const changes = [];

  // 1) gross shank scale error -> straight-shank fallback (= cutting diameter)
  if (typeof t.shank_diameter_mm === "number" && t.shank_diameter_mm > SHANK_GROSS_MM) {
    if (typeof dia === "number" && dia > 0) {
      t.shank_diameter_mm = dia;
      t.shank_estimated = true;
      shankFixed++; changes.push(`shank ${before.shank}->${dia} (=dia, est)`);
    }
  }

  // 2) null/<=0 OAL -> physical floor so OAL > flute
  if ((t.overall_length_mm == null || t.overall_length_mm <= 0) && typeof flute === "number" && flute > 0) {
    const shankForFloor = typeof t.shank_diameter_mm === "number" && t.shank_diameter_mm > 0 ? t.shank_diameter_mm : 0;
    const oal = r1(flute + Math.max(shankForFloor, STICKOUT_FLOOR_MM));
    t.overall_length_mm = oal;
    t.oal_estimated = true;
    oalFilled++; changes.push(`oal null->${oal} (=flute+floor, est)`);
  }

  // 3) flute > OAL after fill -> can't know true LOC; mark suspect (generators exclude from shipped libs)
  if (typeof t.flute_length_mm === "number" && typeof t.overall_length_mm === "number" &&
      t.overall_length_mm > 0 && t.flute_length_mm > t.overall_length_mm && !t.geometry_suspect) {
    t.geometry_suspect = true;
    t.needs_catalog_loc = true;
    suspectMarked++; changes.push(`flute ${t.flute_length_mm} > oal ${t.overall_length_mm} -> geometry_suspect (needs catalog LOC)`);
  }

  if (changes.length) touched.push({ designation: t.designation, changes, before });
}

const summary = { generatedAt: null, total_helical: tools.filter((t) => t.brand === HELICAL).length, oalFilled, shankFixed, suspectMarked, touchedCount: touched.length, touched };

if (DRY) {
  console.log(`DRY: oalFilled=${oalFilled} shankFixed=${shankFixed} suspectMarked=${suspectMarked} (touched ${touched.length})`);
  for (const t of touched.slice(0, 20)) console.log(` - ${t.designation}: ${t.changes.join("; ")}`);
} else {
  const tmp = SRC + ".tmp";
  writeFileSync(tmp, JSON.stringify(d, null, 2));
  renameSync(tmp, SRC);
  writeFileSync(SIDECAR, JSON.stringify(summary, null, 2));
  console.log(`WROTE source. oalFilled=${oalFilled} shankFixed=${shankFixed} suspectMarked=${suspectMarked}`);
  console.log(`Sidecar (every change): ${SIDECAR}`);
}
