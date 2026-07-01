#!/usr/bin/env node
/**
 * emit-tool-library.mjs — tool tables that MATCH the Tier-1 base-post sample programs, so the
 * Hurco WinMax sim (and a Fusion re-post) render the correct tools instead of erroring/defaulting.
 *
 * Single source of truth (below) → two outputs:
 *   1. prism-base-tools.tools   — Fusion CAM tool library (schema v2, inches) → import in Fusion.
 *   2. PRISM-Base-Tool-Setup.md — human sheet to key into WinMax's Tool Setup page for the sim.
 *
 * Tool geometry mirrors emit-rich-sample-nc.mjs / emit-base-sample-nc.mjs exactly (same DC / flute
 * length / flute count / RPM / tool number) — if those emitters change, update this in lockstep.
 *
 * Usage: node scripts/emit-tool-library.mjs [outDir]
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { TOOLS, PROGRAMS } from "./lib/prism-base-job.mjs";

// which sample program(s) call a given tool number (derived from the shared job — no drift)
function usedIn(num) {
  const hits = [];
  for (const [key, p] of Object.entries(PROGRAMS)) if (p.toolNums.includes(num)) hits.push(key.toUpperCase());
  return hits.length ? hits.join(" · ") : "(spare)";
}

// ── 1. Fusion .tools library (schema v2 — matches local PRISM-PRISMGeneric-*.tools) ──
function fusionTool(t) {
  const geometry = t.type === "drill"
    ? { DC: t.dia, LCF: t.lcf, OAL: t.oal, NOF: t.flutes, SIG: t.sig, RE: 0 }
    : { DC: t.dia, SFDM: t.dia, LCF: t.lcf, OAL: t.oal, NOF: t.flutes, RE: 0, HA: 30 };
  return {
    BMC: "carbide", HAND: "R", type: t.type, unit: "inches",
    geometry,
    "post-process": { number: t.num, "diameter-offset": t.num, "length-offset": t.num, live: true, "spindle-speed": t.rpm, comment: "" },
    "start-values": { presets: [
      { name: "Steel (P)", n: t.rpm, tool_coolant: "flood" },
      { name: "Aluminum (N)", n: Math.min(t.rpm * 2, 10000), tool_coolant: "flood" },
    ] },
    description: "PRISM Base: " + t.desc, vendor: "PRISM", "product-id": t.pid,
    comment: "Matches PRISM Tier-1 base-post sample. Used in: " + usedIn(t.num),
  };
}
const lib = { version: 2, data: TOOLS.map(fusionTool) };

// ── 2. WinMax tool-setup sheet ──
const n2 = (v) => v.toFixed(v % 1 === 0 ? 0 : 4).replace(/\.?0+$/, "") || "0";
function winmaxSheet() {
  const rows = TOOLS.map((t) =>
    `| T${t.num} | ${t.type} | ${n2(t.dia)}" | ${n2(t.lcf)}" | ${n2(t.oal)}" | ${t.flutes} | H${t.num} | ${t.rpm} | ${t.sig ? t.sig + " deg pt" : "—"} | ${usedIn(t.num)} |`
  ).join("\n");
  return `# PRISM Base Post — WinMax Tool Setup (matches the sample programs)

Key these into the WinMax **Tool Setup** page so the simulation renders the correct tools and
the tool calls (T1..T5 / H1..H5) resolve. Lengths are nominal; set the **length offset (H)** to
your actual touched-off length — the offset NUMBER must equal the tool number (the post emits \`G43 H<n>\`).

WCS: **G54**, part zero at the **top-front-left corner** of a **4 x 3 x 1 in** plate (the sample geometry).

| Tool | Type | Dia | Flute Len | OAL | Flutes | Len Offset | RPM | Point | Used in |
|------|------|-----|-----------|-----|--------|-----------|-----|-------|---------|
${rows}

## Per-program tool map
- **SAMPLE-PRISM-Base-Hurco-RICH.nc** → T1 face mill (2"), T2 1/2" EM, T3 3/8" EM, T4 1/4" drill.
- **SAMPLE-PRISM-Base-Hurco.nc** (basic) → T1 = the 1/2" 4FL EM, T2 = the 1/4" 3FL EM (tool 5 here).

## Notes
- The post programs are **inch / G20**. Set WinMax units to inch before loading.
- Spindle RPM in the table is what the program commands (\`S<rpm> M03\`); the WinMax sim doesn't
  need it for geometry but match it so the run looks right.
- Feeds are computed by PRISM in the program (the \`F\` values) — no tool-table feed needed for the sim.
- Drill T4 runs a **G83 peck** (\`G98 G83 ... Q0.15\`); set the 1/4" tool as a drill so the sim cycles it.
`;
}

const outDir = process.argv[2] || "C:/Users/wompu/OneDrive/Desktop";
const libPath = path.join(outDir, "prism-base-tools.tools");
const sheetPath = path.join(outDir, "PRISM-Base-Tool-Setup.md");
writeFileSync(libPath, JSON.stringify(lib, null, 2) + "\n");
writeFileSync(sheetPath, winmaxSheet());
console.log("Fusion tool library -> " + libPath + " (" + lib.data.length + " tools)");
console.log("WinMax setup sheet  -> " + sheetPath);
// emit the library path for the deploy step
console.log("LIBJSON_VALID=" + (JSON.parse(JSON.stringify(lib)).data.length === TOOLS.length));
