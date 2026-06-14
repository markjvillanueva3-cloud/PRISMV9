// cimco-jm-machine-map.mjs — map the JM Die fleet to CIMCO Machine-Simulation machines.
//
// Goal (operator, 2026-06-02): "utilize the machine models we have in the system to
// simulate within CIMCO. If there are native simulation machines in CIMCO, add them."
// To prove out a JM post in CIMCO sim you must run it against the RIGHT kinematics —
// a wrong machine def gives false confidence (tribal tip #9). This resolves, for each
// of the JM fleet machines, the best CIMCO `.mcfg` sim machine + a status tier:
//   - native-cimco-match : a vendor `.mcfg` of the same make+model class ships with CIMCO (Haas mills).
//   - generic-template   : no vendor `.mcfg`, but a Cimco generic kinematic template fits → usable now,
//                          flagged needs-authoring for an exact vendor def (PRISM has the kinematics).
//   - needs-authoring    : no acceptable CIMCO match → author a `.mcfg` from PRISM's machine model.
//   - not-applicable     : CIMCO Machine-Sim models mill/lathe kinematics only; sinker/wire EDM stay
//                          on PRISM's discharge-physics sim (tribal tip #10).
//
// SAFETY: every resolved mapping carries `mustVerifyKinematics: true` — a candidate is NOT an
// approved sim machine until travels/axis-config are checked vs the real machine. Units-first:
// JM convention is INCH; a metric `.mcfg` match is flagged (25.4x scale-error guard).
//
// Reads: mcp-server/src/data/jm-die-profile.ts (canonical JM inventory — regex-extracted, not
//        duplicated) + state/shared/cimco/machine-index.json (SPINE-1 machine corpus).
// Writes: state/shared/cimco/jm-fleet-sim-map.json. Pure + deterministic. No deps.
// Tests: scripts/cimco-jm-machine-map.test.mjs. Wiki: [[cimco-verification-simulation-integration]].

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const JM_PROFILE = resolve(REPO, "mcp-server/src/data/jm-die-profile.ts");
const CIMCO_INDEX = resolve(REPO, "state/shared/cimco/machine-index.json");
const OUT = resolve(REPO, "state/shared/cimco/jm-fleet-sim-map.json");

// Scoring weights (0..1 contributions) + tier thresholds — named so intent is explicit.
const W = {
  vendor: 0.55, // same make (Haas==Haas) — dominant signal
  modelPerTok: 0.18, // per overlapping model token
  modelMax: 0.3, // cap on model-token contribution
  axisMatch: 0.1, // 5-axis-ness agrees (vendor matches, where orientation is unknown)
  axisMismatch: 0.15, // PENALTY when axis class disagrees (real fidelity problem)
  millTurn: 0.2, // both mill-turn — strong enough that a Multus prefers a Mill-Turn template over a 4-axis lathe
  genericBase: 0.15, // Cimco generic template baseline before orientation/axis grading
  orientMatch: 0.15, // generic template orientation (Vertical/Horizontal/Lathe) matches the JM machine
  orientMismatch: 0.12, // PENALTY: a vertical mill must NOT map to a horizontal sim (wrong kinematics)
  axisCountMatch: 0.15, // generic template axis count (3/4/5) matches
  axisCountMismatch: 0.1, // PENALTY: a 3-axis machine must NOT map to a 5-axis sim
};
const TIER = { nativeMin: 0.6, genericMin: 0.3 };

/** Map a JM machine_id prefix → process type (per jm-die-profile.ts convention). */
export function jmMachineType(machineId) {
  const p = String(machineId || "").toUpperCase();
  if (p.startsWith("LTH")) return "lathe";
  if (p.startsWith("WEDM")) return "wire_edm";
  if (p.startsWith("EDM")) return "sinker_edm";
  if (p.startsWith("VMC") || p.startsWith("HMC") || p.startsWith("VTC")) return "mill";
  return "unknown";
}

/** Regex-extract the canonical JM_DIE_MACHINE_INVENTORY rows from jm-die-profile.ts (single source of truth). */
export function parseJmInventory(tsText) {
  const out = [];
  const re = /machine_id:\s*"([^"]+)"\s*,\s*machine_name:\s*"([^"]+)"\s*,\s*controller_family:\s*"([^"]+)"\s*,\s*controller_model:\s*"([^"]+)"/g;
  for (const m of String(tsText).matchAll(re)) {
    out.push({ machine_id: m[1], machine_name: m[2], controller_family: m[3], controller_model: m[4] });
  }
  return out;
}

const STOPWORDS = new Set(["the", "ii", "i", "big", "bore", "sub", "axis", "mill", "lathe", "turn"]);

/** Significant lowercase tokens from a machine name/displayName for matching. */
export function tokens(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

/** First vendor token (make). */
export function vendorOf(name) {
  const t = tokens(name);
  return t[0] || "";
}

/** Infer mill/lathe class from a CIMCO displayName (vendor .mcfg have orientation "unknown"). */
function cimcoClass(disp, orientation) {
  const d = String(disp || "").toLowerCase();
  if (orientation === "Lathe" || /lathe|turn/.test(d)) return "lathe";
  if (orientation === "Horizontal" || orientation === "Vertical" || /mill|portal|vmc|hmc|umc|dmu|dmc|vf|dnm|nhp/.test(d))
    return "mill";
  return "mill"; // vendor defs in this corpus are overwhelmingly mills
}

/** Axis/kinematic hints from a name. */
export function axisHints(name) {
  const d = String(name || "").toLowerCase();
  // Trunnion tokens appear as `TR<digit>` (TR210) OR `<digit>TR` (VF-2TR) — BOTH directions are
  // 5-axis. The original `tr\d` only caught the first, so "VF-2TR" (a 5-axis trunnion) was
  // mis-scored as 3-axis and wrongly won the native slot for the plain 3-axis VF-2 (P0, workflow-caught).
  // `hrt` (Haas Rotary Table) is a 4-axis single-rotary, NOT a 5-axis trunnion — intentionally excluded.
  return {
    fiveAxis: /5\s*ax|5axis|5 axis|trunnion|\bumc|dmu|\btr\d|\dtr\b|table head|head head/.test(d),
    millTurn: /multus|mill-turn|millturn|mill turn|integrex/.test(d),
  };
}

/** JM machine orientation for sim-kinematics matching: Vertical (VMC) / Horizontal (HMC) / Lathe. */
function jmOrientation(jm) {
  const t = jmMachineType(jm.machine_id);
  if (t === "lathe") return "Lathe";
  return String(jm.machine_id || "").toUpperCase().startsWith("HMC") ? "Horizontal" : "Vertical";
}

/** Approximate JM kinematic axis count for template matching (the 3-vs-5 distinction is what matters). */
function jmAxisCount(jm) {
  const name = `${jm.machine_name} ${jm.controller_model}`.toLowerCase();
  const t = jmMachineType(jm.machine_id);
  if (/5\s*ax|5axis|5 axis/.test(name)) return 5;
  if (/multus|mill-turn|integrex/.test(name)) return 4; // B-axis mill-turn ≈ 4+ axis template
  if (t === "lathe") return /-m\b|genos l\d+\w*-m|live|\bcy\b|\bc-?axis/.test(name) ? 4 : 3; // live-tool C(+Y) vs plain C
  return 3; // default mill = 3-axis
}

/** Parse "N Axis" from a CIMCO template displayName (null if none, e.g. "CIMCO Lathe Default"). */
function cimcoAxisCount(disp) {
  const m = String(disp || "").match(/(\d)\s*axis/i);
  return m ? Number(m[1]) : null;
}

/**
 * Score a CIMCO machine as a sim candidate for a JM machine (0..1).
 * Vendor match dominates; model-token overlap + kinematic-class compatibility refine.
 */
export function scoreMatch(jm, cimco) {
  const jmType = jmMachineType(jm.machine_id);
  const cClass = cimcoClass(cimco.displayName, cimco.orientation);
  // hard type gate: a mill JM machine must map to a mill sim, lathe→lathe.
  if ((jmType === "mill" && cClass !== "mill") || (jmType === "lathe" && cClass !== "lathe"))
    return { score: 0, basis: "type-mismatch" };

  const jVendor = vendorOf(jm.machine_name);
  const cVendor = vendorOf(cimco.displayName);
  const isGeneric = cVendor === "cimco";
  let score = 0;
  const basis = [];

  if (!isGeneric && jVendor && jVendor === cVendor) {
    score += W.vendor;
    basis.push(`vendor:${cVendor}`);
  }

  // model-token overlap (exclude the vendor token itself)
  const jt = new Set(tokens(jm.machine_name).filter((t) => t !== jVendor));
  const ct = tokens(cimco.displayName).filter((t) => t !== cVendor);
  let overlap = 0;
  for (const t of ct) if (jt.has(t)) overlap++;
  if (overlap > 0) {
    score += Math.min(W.modelMax, overlap * W.modelPerTok);
    basis.push(`model:${overlap}tok`);
  }

  const ja = axisHints(`${jm.machine_name} ${jm.controller_model}`);
  const ca = axisHints(cimco.displayName);
  if (isGeneric) {
    // Generic Cimco templates carry a reliable orientation + an "N Axis" label — grade by
    // KINEMATIC FIT so the RIGHT template wins (a vertical 3-axis mill must not map to a
    // horizontal 4-axis sim). This is the safety-load-bearing path: wrong kinematics = false sim.
    let g = W.genericBase;
    const jOrient = jmOrientation(jm);
    if (cimco.orientation === jOrient) g += W.orientMatch;
    else g -= W.orientMismatch;
    const jc = jmAxisCount(jm);
    const cc = cimcoAxisCount(cimco.displayName);
    if (jc != null && cc != null) g += jc === cc ? W.axisCountMatch : -W.axisCountMismatch;
    if (axisHints(jm.machine_name).millTurn && ca.millTurn) g += W.millTurn;
    score = Math.max(score, g);
    basis.push(`generic:${jOrient}${cc != null ? `/${cc}ax` : ""}`);
  } else {
    // Vendor match: orientation is unknown for vendor .mcfg, so use the coarse 5-axis hint only.
    if (ja.fiveAxis === ca.fiveAxis) score += W.axisMatch;
    else score -= W.axisMismatch;
    if (ja.millTurn && ca.millTurn) score += W.millTurn;
  }

  return { score: Math.max(0, Math.min(1, score)), basis: basis.join("+") || "orientation" };
}

/** Build the JM→CIMCO sim map. */
export function buildJmSimMap(jmInventory, cimcoMachines) {
  const machines = [];
  for (const jm of jmInventory) {
    const type = jmMachineType(jm.machine_id);
    if (type === "sinker_edm" || type === "wire_edm") {
      machines.push({
        ...jm,
        type,
        cimcoMatch: null,
        status: "not-applicable",
        note: "CIMCO Machine-Simulation models mill/lathe kinematics only — EDM stays on PRISM discharge-physics sim (tribal tip #10).",
        mustVerifyKinematics: false,
      });
      continue;
    }
    const ranked = cimcoMachines
      .map((c) => ({ c, ...scoreMatch(jm, c) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
    const best = ranked[0] || null;
    const vendorMatched = best && /vendor:/.test(best.basis);
    let status;
    if (best && vendorMatched && best.score >= TIER.nativeMin) status = "native-cimco-match";
    else if (best && best.score >= TIER.genericMin) status = "generic-template";
    else status = "needs-authoring";

    const unitsNote =
      best && best.c.unit && best.c.unit !== "unknown" && best.c.unit !== "inch"
        ? `UNITS WARNING: candidate .mcfg is ${best.c.unit}; JM convention is INCH — resolve before sim (25.4x scale-error guard).`
        : best
        ? "verify units (JM=inch); candidate units: " + (best.c.unit || "unresolved")
        : null;

    machines.push({
      ...jm,
      type,
      cimcoMatch: best
        ? {
            file: best.c.file,
            displayName: best.c.displayName,
            score: Number(best.score.toFixed(3)),
            basis: best.basis,
            unit: best.c.unit ?? null,
            unitsResolved: best.c.unitsResolved ?? false,
          }
        : null,
      alternates: ranked.slice(1, 4).map((r) => ({ file: r.c.file, displayName: r.c.displayName, score: Number(r.score.toFixed(3)) })),
      status,
      note:
        status === "native-cimco-match"
          ? "CIMCO ships a same-vendor .mcfg of this class — usable as the sim machine (verify travels/axis vs the real machine)."
          : status === "generic-template"
          ? "No vendor .mcfg; a Cimco generic kinematic template fits. Author an exact vendor .mcfg from PRISM's machine model for full fidelity."
          : "No acceptable CIMCO match — author a .mcfg from PRISM's machine-kinematics model before sim.",
      unitsNote,
      mustVerifyKinematics: true,
    });
  }

  const byStatus = machines.reduce((a, m) => ((a[m.status] = (a[m.status] || 0) + 1), a), {});
  return {
    schemaVersion: "1.0.0",
    generatedFrom: { jmProfile: "mcp-server/src/data/jm-die-profile.ts", cimcoIndex: "state/shared/cimco/machine-index.json" },
    jmMachineCount: machines.length,
    byStatus,
    safety:
      "Every resolved mapping is a CANDIDATE (mustVerifyKinematics). A CIMCO-sim CLEAN result is conformance-clean, NOT controller-verified, and is only valid if the .mcfg kinematics match the real machine. JM convention = INCH.",
    machines,
  };
}

/** Build + (optionally) write the map. */
export function run({ write = false } = {}) {
  if (!existsSync(JM_PROFILE)) throw new Error(`JM profile not found: ${JM_PROFILE}`);
  if (!existsSync(CIMCO_INDEX))
    throw new Error(`CIMCO machine-index not found (run scripts/cimco-machine-index.mjs): ${CIMCO_INDEX}`);
  const jm = parseJmInventory(readFileSync(JM_PROFILE, "utf8"));
  const idx = JSON.parse(readFileSync(CIMCO_INDEX, "utf8"));
  const map = buildJmSimMap(jm, idx.machines || []);
  if (write) writeFileSync(OUT, JSON.stringify(map, null, 2));
  return map;
}

const _argv1 = process.argv[1] || "";
if (_argv1.endsWith("cimco-jm-machine-map.mjs")) {
  const map = run({ write: !process.argv.includes("--dry-run") });
  process.stdout.write(
    `JM->CIMCO sim map: ${map.jmMachineCount} machines — ${JSON.stringify(map.byStatus)}\n` +
      (process.argv.includes("--dry-run") ? "(dry-run, not written)\n" : `written: ${OUT}\n`),
  );
}
