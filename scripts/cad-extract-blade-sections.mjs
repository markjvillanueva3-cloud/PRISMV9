#!/usr/bin/env node
/**
 * cad-extract-blade-sections.mjs -- CAD-CLOSED-LOOP-MS0/U-CAD-BLADE-SECTION-EXTRACT
 *
 * Extract the REAL blade cross-section profiles from an axisymmetric rotor STEP
 * (turbine blisk / impeller). This is the data-fit INPUT that closes the generic-NACA
 * surface-fidelity gap: instead of lofting a generic airfoil, a regeneration lofts THESE
 * real extracted sections, driving surface Hausdorff toward the real geometry.
 *
 * Method (pure, deterministic, no CAD kernel):
 *   1. Parse CARTESIAN_POINT coords from the STEP file (the B-rep control net is the
 *      surface sampling, the same source the comparator's Hausdorff uses).
 *   2. To cylindrical coords about the rotor axis (default Z): r=hypot(a,b), theta, axial.
 *   3. Isolate the BLADE radial band [rMin,rMax] (excludes bore + hub disk).
 *   4. FOLD all `bladeCount` blades onto ONE sector via theta mod (2*pi/bladeCount).
 *      An N-fold-symmetric rotor's blades overlay exactly, giving one representative blade.
 *   5. Bin the folded blade points by axial height into `nSections` cross-sections.
 *      Each section is the real profile a loft would pass through.
 *
 * Units: values are emitted in the STEP file's NATIVE units (mm for blisk/impeller).
 * The downstream loft + Hausdorff normalize; this extractor does not rescale.
 *
 * CLI:
 *   node scripts/cad-extract-blade-sections.mjs --file <step> --blades 48 \
 *        --axis z --rmin 365 --rmax 605 --sections 8 [--out <json>] [--json]
 *
 * Exit: 0 ok, 2 invalid args / no points / empty blade band (fail-loud, never silent-empty).
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const AXIS_INDEX = { x: 0, y: 1, z: 2 };

function parseArgs(argv) {
  const a = { blades: 48, axis: "z", rmin: 0, rmax: Infinity, sections: 8, json: false };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--file") a.file = argv[++i];
    else if (k === "--blades") a.blades = parseInt(argv[++i], 10);
    else if (k === "--axis") a.axis = String(argv[++i]).toLowerCase();
    else if (k === "--rmin") a.rmin = parseFloat(argv[++i]);
    else if (k === "--rmax") a.rmax = parseFloat(argv[++i]);
    else if (k === "--sections") a.sections = parseInt(argv[++i], 10);
    else if (k === "--out") a.out = argv[++i];
    else if (k === "--json") a.json = true;
  }
  return a;
}

/** Parse CARTESIAN_POINT triples from STEP text. Returns array of [x,y,z]. */
export function parseCartesianPoints(text) {
  const re = /CARTESIAN_POINT\s*\(\s*'[^']*'\s*,\s*\(\s*(-?[0-9.eE+]+)\s*,\s*(-?[0-9.eE+]+)\s*,\s*(-?[0-9.eE+]+)\s*\)/g;
  const pts = [];
  for (const m of text.matchAll(re)) pts.push([+m[1], +m[2], +m[3]]);
  return pts;
}

/**
 * Fold an axisymmetric rotor's blade-band points onto one sector and bin by axial height.
 * Pure function (testable). axisIdx: 0=x,1=y,2=z is the rotation axis.
 */
export function extractBladeSections(points, { blades, axisIdx, rmin, rmax, sections }) {
  if (!Array.isArray(points) || points.length === 0) throw new Error("no points");
  if (!(blades > 0) || !(sections > 0)) throw new Error("blades and sections must be > 0");
  const radialIdx = [0, 1, 2].filter((i) => i !== axisIdx); // the two non-axis components
  const sector = (2 * Math.PI) / blades;
  const band = [];
  let axMin = Infinity;
  let axMax = -Infinity;
  for (const p of points) {
    const u = p[radialIdx[0]];
    const v = p[radialIdx[1]];
    const ax = p[axisIdx];
    const r = Math.hypot(u, v);
    if (r < rmin || r > rmax) continue; // blade radial band only
    let theta = Math.atan2(v, u);
    if (theta < 0) theta += 2 * Math.PI;
    const thetaFold = theta % sector; // overlay all blades onto one sector
    band.push({ r, thetaFold, ax });
    if (ax < axMin) axMin = ax;
    if (ax > axMax) axMax = ax;
  }
  if (band.length === 0) throw new Error("empty blade band -- check rmin/rmax/axis");
  const span = axMax - axMin || 1;
  const buckets = Array.from({ length: sections }, () => []);
  for (const b of band) {
    let idx = Math.floor(((b.ax - axMin) / span) * sections);
    if (idx >= sections) idx = sections - 1; // axMax edge folds into the last bin
    if (idx < 0) idx = 0;
    buckets[idx].push(b);
  }
  const out = buckets.map((bk, i) => {
    const axLo = axMin + (i / sections) * span;
    const axHi = axMin + ((i + 1) / sections) * span;
    const rs = bk.map((p) => p.r);
    return {
      sectionIndex: i,
      axialLo: +axLo.toFixed(4),
      axialHi: +axHi.toFixed(4),
      pointCount: bk.length,
      rMin: bk.length ? +Math.min(...rs).toFixed(4) : null,
      rMax: bk.length ? +Math.max(...rs).toFixed(4) : null,
      profile: bk
        .slice(0, 400)
        .map((p) => [+p.r.toFixed(4), +p.thetaFold.toFixed(6), +p.ax.toFixed(4)]),
    };
  });
  return { axialMin: +axMin.toFixed(4), axialMax: +axMax.toFixed(4), bandPoints: band.length, sections: out };
}

function main() {
  const a = parseArgs(process.argv);
  if (!a.file || !existsSync(a.file)) {
    console.error("ERR: --file <step> required and must exist");
    process.exit(2);
  }
  const axisIdx = AXIS_INDEX[a.axis];
  if (axisIdx === undefined) {
    console.error("ERR: --axis must be x|y|z");
    process.exit(2);
  }
  const text = readFileSync(a.file, "utf8");
  const pts = parseCartesianPoints(text);
  let result;
  try {
    result = extractBladeSections(pts, {
      blades: a.blades,
      axisIdx,
      rmin: a.rmin,
      rmax: a.rmax,
      sections: a.sections,
    });
  } catch (e) {
    console.error("ERR:", e.message);
    process.exit(2);
  }
  result.file = a.file;
  result.totalPoints = pts.length;
  result.blades = a.blades;
  result.axis = a.axis;
  if (a.out) {
    writeFileSync(a.out, JSON.stringify(result, null, 1));
    console.error(`wrote ${a.out}`);
  }
  if (a.json) {
    console.log(JSON.stringify(result));
  } else {
    console.log(`file=${a.file}`);
    console.log(`total CARTESIAN_POINTs=${result.totalPoints}  blade-band points=${result.bandPoints}`);
    console.log(`axial(${a.axis}) range=[${result.axialMin}, ${result.axialMax}]  sections=${a.sections}`);
    for (const s of result.sections) {
      console.log(
        `  section ${s.sectionIndex}: ax[${s.axialLo},${s.axialHi}] pts=${s.pointCount} r=[${s.rMin},${s.rMax}]`,
      );
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
