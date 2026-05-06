/**
 * unit-conversions.ts — Canonical unit-conversion constants for PRISM.
 *
 * NIST SP 811: 1 inch = 25.4 mm by definition (exact, not measured).
 * Every CAD/CAM/physics caller imports from THIS file — never inline these
 * numbers in scripts, engines, or tests. The critical-file guard blocks edits
 * to physics/constants.ts (Kienzle/Taylor are safety-critical), so unit
 * conversions live in this separate module so they can be added/audited
 * without disturbing the safety-critical surface.
 *
 * @module physics/unit-conversions
 */

/** 1 inch = 25.4 mm (exact, NIST SP 811). */
export const INCH_TO_MM = 25.4;

/** 1 mm = 1/25.4 inch (derived from exact inch definition). */
export const MM_TO_INCH = 1 / 25.4;

/** 1 in³ = 25.4³ mm³ = 16387.064 mm³ (exact). */
export const INCH3_TO_MM3 = 16387.064;

/** 1 mm³ = 1/16387.064 in³ (derived). */
export const MM3_TO_INCH3 = 1 / 16387.064;

/** Fusion 360 native length unit is centimetres; this constant converts mm→cm. */
export const MM_TO_CM = 0.1;

/** cm → mm. */
export const CM_TO_MM = 10;

/** Degrees → radians (Fusion 360 native angle unit is radians). */
export const DEG_TO_RAD = Math.PI / 180;

/** Radians → degrees. */
export const RAD_TO_DEG = 180 / Math.PI;
