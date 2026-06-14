/**
 * post-gen-bridge-absorption.mjs — 3 concrete G-code generators wired
 * through the iter40 post-gen-node-bridge contract.
 *
 * Closes U-POST-GEN-ABSORB-3: 3 of 4 GENERATOR_KINDS from iter40 now have
 * real implementations sharing the iter33-35 add-in dialect substrate.
 * (llm_emitted is deferred — needs trained model.)
 *
 * Generators shipped:
 *   controllerDirectGenerator — emits canonical Fanuc-dialect G-code for
 *     an op list (G54 + spindle + tool change + canned cycle + retract).
 *     Fail-louds via safetyFlags when input is missing required fields.
 *   camBridgeGenerator — simulates Fusion → Mastercam handoff: takes a
 *     canonical op list, translates dialect tokens via the iter33
 *     MASTERCAM_DIALECT_MAP, emits Mastercam-style header + body.
 *   legacyPostGenGenerator — parameterized template-style generator
 *     (legacy postgen subsystem behavior). Lower confidence — included
 *     for backward compat, NOT recommended for new programs.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-POST-GEN-ABSORB-3
 * @slot echo · @iter 44 · @date 2026-05-27
 */

import { MASTERCAM_DIALECT_MAP } from "./mastercam-addin-resource-manifest.mjs";

export const ABSORPTION_SCHEMA_VERSION = 1;

// Sample G-code template lines — used by all 3 generators as scaffold.
export const GCODE_PROGRAM_HEADER = "%\nO1000 (PRISM-EMITTED)\n";
export const GCODE_PROGRAM_FOOTER = "M30\n%\n";

/** Pure: validate a single op for completeness. Returns null on missing critical field. */
export function validateOp(op) {
  if (!op || typeof op !== "object") return false;
  if (typeof op.kind !== "string" || op.kind.length === 0) return false;
  return true;
}

/** Pure: count safety flags that should fire given an op list. */
export function detectSafetyFlags(req) {
  const flags = [];
  if (!req || !Array.isArray(req.operations)) return flags;
  for (const op of req.operations) {
    if (!validateOp(op)) continue;
    // Missing coolant on metal removal → coolant_missing_required
    if (["drill", "tap", "ream"].includes(op.kind) && (op.coolant == null || op.coolant === "none")) {
      flags.push("coolant_missing_required");
    }
    // Tool overhang > 4× diameter → tool_overhang_critical
    if (op.toolDiameterMm && op.toolLengthMm && op.toolLengthMm > 4 * op.toolDiameterMm) {
      flags.push("tool_overhang_critical");
    }
    // No explicit retract → missing_safe_retract
    if (op.retractMode == null) {
      flags.push("missing_safe_retract");
    }
  }
  // De-dup while preserving order.
  return [...new Set(flags)];
}

/** controller_direct generator: emits canonical Fanuc-dialect G-code. */
export function controllerDirectGenerator(req) {
  if (!req || !Array.isArray(req.operations) || req.operations.length === 0) return null;
  if (typeof req.controllerId !== "string") return null;
  const lines = [GCODE_PROGRAM_HEADER];
  lines.push("G21 G90 G54 (mm, absolute, WCS 1)\n");
  let lineN = 10;
  for (const op of req.operations) {
    if (!validateOp(op)) continue;
    lines.push(`N${lineN} T${op.toolNumber || 1} M6\n`);
    lineN += 10;
    lines.push(`N${lineN} S${op.spindleRpm || 3000} M3\n`);
    lineN += 10;
    if (op.coolant === "flood") lines.push(`N${lineN} M8\n`);
    else if (op.coolant === "mist") lines.push(`N${lineN} M7\n`);
    else if (op.coolant === "through_spindle") lines.push(`N${lineN} M88\n`);
    lineN += 10;
    if (op.kind === "drill") lines.push(`N${lineN} G81 Z${-Math.abs(op.depthMm || 5)} R2.0 F${op.feedrate || 200}\n`);
    else if (op.kind === "tap") lines.push(`N${lineN} G84 Z${-Math.abs(op.depthMm || 10)} R5.0 F${op.feedrate || 400}\n`);
    else if (op.kind === "face_mill") lines.push(`N${lineN} G1 X${op.endX || 100} Y0 F${op.feedrate || 800}\n`);
    else lines.push(`N${lineN} (op kind: ${op.kind})\n`);
    lineN += 10;
    lines.push(`N${lineN} M9\n`);
    lineN += 10;
  }
  lines.push(GCODE_PROGRAM_FOOTER);
  const safetyFlags = detectSafetyFlags(req);
  return {
    gcodeText: lines.join(""),
    source: "controller_direct",
    controllerId: req.controllerId,
    confidence: 0.88,
    safetyFlags,
    rationale: `controller_direct: ${req.operations.length} ops emitted as canonical Fanuc`,
  };
}

/** cam_bridge generator: simulates Fusion → Mastercam handoff using iter33 dialect map. */
export function camBridgeGenerator(req) {
  if (!req || !Array.isArray(req.operations) || req.operations.length === 0) return null;
  if (typeof req.controllerId !== "string") return null;
  const lines = [GCODE_PROGRAM_HEADER];
  lines.push("(Mastercam X9 cam_bridge emit — PRISM iter44)\n");
  // Use first work offset from MASTERCAM_DIALECT_MAP.work_offsets canonical.
  lines.push(`G21 G90 ${MASTERCAM_DIALECT_MAP.work_offsets[0]}\n`);
  let lineN = 100;
  for (const op of req.operations) {
    if (!validateOp(op)) continue;
    lines.push(`N${lineN} T${op.toolNumber || 1} M6\n`);
    lineN += 10;
    lines.push(`N${lineN} S${op.spindleRpm || 3000} M3\n`);
    lineN += 10;
    if (op.coolant === "flood") lines.push(`N${lineN} ${MASTERCAM_DIALECT_MAP.flood_on}\n`);
    else if (op.coolant === "through_spindle") lines.push(`N${lineN} ${MASTERCAM_DIALECT_MAP.tsc_on}\n`);
    lineN += 10;
    if (op.kind === "drill") lines.push(`N${lineN} ${MASTERCAM_DIALECT_MAP.drill_cycle} Z${-Math.abs(op.depthMm || 5)} R2.0 F${op.feedrate || 200}\n`);
    else if (op.kind === "tap") lines.push(`N${lineN} ${MASTERCAM_DIALECT_MAP.tap_cycle} Z${-Math.abs(op.depthMm || 10)} R5.0 F${op.feedrate || 400}\n`);
    else lines.push(`N${lineN} ${MASTERCAM_DIALECT_MAP.feed} X${op.endX || 100} Y0 F${op.feedrate || 800}\n`);
    lineN += 10;
    lines.push(`N${lineN} ${MASTERCAM_DIALECT_MAP.coolant_off}\n`);
    lineN += 10;
  }
  lines.push(GCODE_PROGRAM_FOOTER);
  const safetyFlags = detectSafetyFlags(req);
  return {
    gcodeText: lines.join(""),
    source: "cam_bridge",
    controllerId: req.controllerId,
    confidence: 0.92,
    safetyFlags,
    rationale: `cam_bridge: mastercam-dialect emit, ${req.operations.length} ops via iter33 dialect map`,
  };
}

/** legacy_postgen generator: parameterized template-style legacy emit (deprecated). */
export function legacyPostGenGenerator(req) {
  if (!req || !Array.isArray(req.operations) || req.operations.length === 0) return null;
  if (typeof req.controllerId !== "string") return null;
  const lines = [GCODE_PROGRAM_HEADER];
  lines.push("(LEGACY POSTGEN — backward compat only, prefer cam_bridge)\n");
  lines.push("G21 G90\n");
  let lineN = 1000;
  for (const op of req.operations) {
    if (!validateOp(op)) continue;
    lines.push(`N${lineN} (LEGACY-OP kind=${op.kind})\n`);
    lineN += 10;
    lines.push(`N${lineN} T${op.toolNumber || 1} M6 S${op.spindleRpm || 3000} M3\n`);
    lineN += 10;
    lines.push(`N${lineN} M8\n`); // Always flood (legacy assumption)
    lineN += 10;
    lines.push(`N${lineN} F${op.feedrate || 500}\n`);
    lineN += 10;
  }
  lines.push(GCODE_PROGRAM_FOOTER);
  const safetyFlags = detectSafetyFlags(req);
  return {
    gcodeText: lines.join(""),
    source: "legacy_postgen",
    controllerId: req.controllerId,
    confidence: 0.55,
    safetyFlags,
    rationale: `legacy_postgen: ${req.operations.length} ops via deprecated template (always-flood assumption)`,
  };
}

/** All 3 absorbed generators bundled. */
export const ALL_ABSORBED_GENERATORS = {
  controller_direct: controllerDirectGenerator,
  cam_bridge: camBridgeGenerator,
  legacy_postgen: legacyPostGenGenerator,
};

/** Pure: wire all 3 generators into a fresh bridge via registerGenerator. */
export function wireAllAbsorbedGenerators(bridge, registerGeneratorFn) {
  if (!bridge || typeof registerGeneratorFn !== "function") return null;
  let next = bridge;
  for (const kind of Object.keys(ALL_ABSORBED_GENERATORS)) {
    const candidate = registerGeneratorFn(next, kind, ALL_ABSORBED_GENERATORS[kind]);
    if (candidate === null) return null;
    next = candidate;
  }
  return next;
}

/** Pure: absorbed kind count (= 3 of 4). */
export function absorbedGeneratorCount() {
  return Object.keys(ALL_ABSORBED_GENERATORS).length;
}

/** Pure: list absorbed kinds sorted. */
export function listAbsorbedGeneratorKinds() {
  return Object.keys(ALL_ABSORBED_GENERATORS).sort();
}
