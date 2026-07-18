#!/usr/bin/env node
/**
 * lathe-step-profile-probe.mjs -- slot:whiskey [KIENZLE G1 closed-loop keystone]
 * ==========================================================================
 * Thin occt-import-js adapter: a real JM .STEP/.STP -> surface mesh -> turning
 * rotational profile (via the tested pure scripts/lib/step-mesh-rotational-profile.mjs).
 * This is the STEP-side geometry leg of the lathe closed loop (the OCR/PDF leg
 * already exists in U-W2C); together they let a generated turning program be
 * scored against REAL JM part geometry (2,307 STEP files) -> flips
 * full_geometry_loop_closed for the STEP path.
 *
 * UNITS-FIRST safety rail: we resolve the STEP CONVERSION_BASED_UNIT (inch 25.4 /
 * mm) and report it -- a units mismatch is a 25.4x scale error. We NEVER assume.
 *
 * Usage: node scripts/lathe-step-profile-probe.mjs "H:/PRISM/JM DIE/.../part.step" [--json]
 */
import { readFileSync } from "node:fs";
import { selectBestBodyProfile } from "./lib/step-mesh-rotational-profile.mjs";

// occt-import-js lives in mcp-server/node_modules (WASM module + sibling .wasm).
const OCCT_JS = "file:///H:/prism/mcp-server/node_modules/occt-import-js/dist/occt-import-js.js";

/** Resolve STEP length unit from its header (units-first). Returns "inch"|"mm"|"unknown". */
export function resolveStepUnit(stepText) {
  if (typeof stepText !== "string") return "unknown";
  if (/SI_UNIT\s*\(\s*\.MILLI\.\s*,\s*\.METRE\.\s*\)/i.test(stepText)) return "mm";
  if (/SI_UNIT\s*\(\s*\$?\s*,?\s*\.METRE\.\s*\)/i.test(stepText)) return "m";
  // CONVERSION_BASED_UNIT with 0.0254 (m per inch) => inch; 0.001 => mm
  if (/CONVERSION_BASED_UNIT[\s\S]{0,200}?0\.0254/i.test(stepText)) return "inch";
  if (/CONVERSION_BASED_UNIT[\s\S]{0,200}?0\.001\b/i.test(stepText)) return "mm";
  if (/\bINCH\b/i.test(stepText)) return "inch";
  return "unknown";
}

/** Concatenate every mesh's vertex positions from an occt ReadStepFile result -> flat [x,y,z,...]. */
export function occtMeshVertices(occtResult) {
  const out = [];
  for (const m of (occtResult && occtResult.meshes) || []) {
    const arr = m && m.attributes && m.attributes.position && m.attributes.position.array;
    if (arr) for (let i = 0; i < arr.length; i++) out.push(arr[i]);
  }
  return out;
}

/** Per-mesh (per-body) position arrays -- one entry per occt mesh, for body segmentation. */
export function occtMeshArrays(occtResult) {
  return ((occtResult && occtResult.meshes) || [])
    .map((m) => m && m.attributes && m.attributes.position && m.attributes.position.array)
    .filter(Boolean);
}

export async function stepFileToProfile(stepPath) {
  const raw = readFileSync(stepPath);
  const units = resolveStepUnit(raw.toString("latin1"));
  const occtFactory = (await import(OCCT_JS)).default;
  const occt = await occtFactory();
  const result = occt.ReadStepFile(new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength), null);
  if (!result || !result.meshes || !result.meshes.length) {
    throw new Error(`occt-import-js returned no meshes from ${stepPath} (likely a near-empty / no-solid STEP, or a non-tessellatable representation -- not all STEPs carry a meshable B-rep)`);
  }
  // Body segmentation: a JM OP-setup STEP often bundles part + stock/fixture -> pick the
  // largest CLEAN body of revolution (the part); falls back to combined (suspect) if none.
  const profile = selectBestBodyProfile(occtMeshArrays(result), { units });
  return { units, mesh_count: result.meshes.length, ...profile };
}

// CLI
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (isMain) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const path = args.find((a) => !a.startsWith("--"));
  if (!path) { console.error("usage: lathe-step-profile-probe.mjs <step-file> [--json]"); process.exit(2); }
  stepFileToProfile(path).then((p) => {
    const { od_profile, id_profile, ...summary } = p;
    if (json) console.log(JSON.stringify(p, null, 2));
    else {
      console.log(JSON.stringify(summary, null, 2));
      const odPts = od_profile.filter((q) => q.r != null).length;
      const idPts = id_profile.filter((q) => q.r != null).length;
      console.log(`od_profile points: ${odPts} | id_profile (bore) points: ${idPts}`);
    }
  }).catch((e) => { console.error("ERROR:", e.message || e); process.exit(1); });
}
