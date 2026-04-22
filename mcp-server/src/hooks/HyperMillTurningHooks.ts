/**
 * HyperMillTurningHooks — Safety and Validation Hooks for hyperMILL Turning/Mill-Turn
 *
 * HM-REV-MS7 (U-HMR39) — Forge-Triple Hook:
 *   hypermill-css-limit  (BLOCKING): validates G96 CSS against machine max RPM
 *   hypermill-millturn-caxis-sync  (WARNING): checks C-axis sync for cross-hole/slot ops
 *
 * CSS Limit Physics:
 *   Required RPM = (1000 * Vc) / (pi * D_min)
 *   Source: ISO 6983, Sandvik Coromant Turning Handbook (2024)
 *   If required RPM > machine max_rpm: G96 CSS would exceed spindle limit at D_min.
 *   Block and instruct user to switch to G97 + Smax clamp at small diameter.
 *
 * C-Axis Sync:
 *   Cross-hole, cross-slot, and off-center features require C-axis position lock.
 *   Missing C_angle causes undetermined angular position on live tool ops.
 *
 * @module hooks/HyperMillTurningHooks
 * @version 1.0.0 — HM-REV-MS7
 */

import {
  type HookDefinition,
  type HookContext,
  type HookResult,
  hookSuccess,
  hookBlock,
  hookWarning,
} from "../engines/HookExecutor.js";

// ============================================================================
// HOOK: hypermill-css-limit (BLOCKING)
// ============================================================================

/**
 * hypermill-css-limit — Blocks when G96 CSS would require RPM > machine max at D_min.
 *
 * Constant Surface Speed (G96) requires the spindle to accelerate as diameter decreases:
 *   RPM = (1000 * Vc_m_per_min) / (pi * D_mm)
 *
 * At small diameters (near parting, bore through, small shoulders), this RPM can exceed
 * the machine's maximum spindle speed, causing a machine fault or a sudden speed clamping
 * that interrupts CSS and destroys dimensional accuracy.
 *
 * The hook reads from ctx.target.data:
 *   - vc_m_per_min   {number}  Surface speed [m/min]
 *   - d_min_mm       {number}  Minimum machining diameter [mm]
 *   - machine_max_rpm {number} Machine max spindle RPM (from MachineRegistry or direct)
 *   - css_mode       {string}  "G96" or "G97" (only fires for G96)
 *
 * Reference: ISO 6983-1:2009 (CNC programming), Sandvik Coromant Turning Guide (2024)
 */
const hypermillCssLimit: HookDefinition = {
  id: "hypermill-css-limit",
  name: "hyperMILL CSS Limit Guard",
  description:
    "BLOCKS when G96 Constant Surface Speed would require RPM > machine max at minimum diameter. " +
    "RPM = (1000 * Vc) / (pi * D_min). Prevents spindle overspeed on parting, bores, and small shoulders.",
  phase: "pre-toolpath",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["hypermill", "turning", "millturn", "css", "spindle", "blocking", "critical", "HM-REV-MS7"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;

    const cssMode: string = d.css_mode ?? d.cssMode ?? "G96";

    // Only apply to G96 CSS operations
    if (cssMode !== "G96") {
      return hookSuccess(
        hypermillCssLimit,
        `CSS mode is ${cssMode} — not G96, no RPM limit check needed`,
        { score: 1.0 },
      );
    }

    const vc = d.vc_m_per_min ?? d.vcRecommended_m_min ?? d.vc;
    const dMin = d.d_min_mm ?? d.dMinMm ?? d.min_diameter_mm;
    const machineMaxRpm = d.machine_max_rpm ?? d.machineMaxRpm ?? d.maxSpindleRpm;

    // Can't check without all three values
    if (vc == null || dMin == null || machineMaxRpm == null) {
      return hookSuccess(
        hypermillCssLimit,
        "CSS limit check skipped — vc_m_per_min, d_min_mm, or machine_max_rpm not provided",
        { score: 0.8 },
      );
    }

    if (dMin <= 0) {
      return hookBlock(
        hypermillCssLimit,
        `BLOCKED: d_min_mm=${dMin} <= 0 — G96 CSS is undefined at zero diameter. Switch to G97.`,
        {
          score: 0,
          issues: [
            "D_min must be > 0 for G96 CSS to be physically defined",
            "Use G97 (constant RPM) with Smax clamp for parting or bore-through operations",
          ],
        },
      );
    }

    // RPM = (1000 * Vc) / (pi * D_min)
    // Reference: ISO 6983, Sandvik Coromant Turning Handbook (2024)
    const requiredRpm = (1000 * vc) / (Math.PI * dMin);

    if (requiredRpm > machineMaxRpm) {
      return hookBlock(
        hypermillCssLimit,
        `BLOCKED: G96 CSS requires ${Math.round(requiredRpm)} RPM at D=${dMin}mm, but machine max is ${machineMaxRpm} RPM`,
        {
          score: 0,
          issues: [
            `Required RPM = (1000 × ${vc} m/min) / (π × ${dMin}mm) = ${Math.round(requiredRpm)} RPM`,
            `Machine max spindle RPM = ${machineMaxRpm} RPM`,
            `Overspeed by ${Math.round(requiredRpm - machineMaxRpm)} RPM (${((requiredRpm / machineMaxRpm - 1) * 100).toFixed(1)}% over limit)`,
            "Fix: Switch to G97 (constant RPM) at Smax clamp before reaching D_min",
            "Fix: Alternatively, reduce Vc until required RPM at D_min <= machine max",
            `Safe Vc at D_min=${dMin}mm: Vc_max = (pi × ${dMin} × ${machineMaxRpm}) / 1000 = ${((Math.PI * dMin * machineMaxRpm) / 1000).toFixed(1)} m/min`,
          ],
        },
      );
    }

    // Warn if approaching limit (within 15%)
    const headroom = (machineMaxRpm - requiredRpm) / machineMaxRpm;
    if (headroom < 0.15) {
      return hookWarning(
        hypermillCssLimit,
        `CSS RPM at D_min is ${Math.round(requiredRpm)} RPM — within 15% of machine max ${machineMaxRpm} RPM. Consider G97 transition.`,
        {
          score: 0.7,
          issues: [
            `RPM headroom = ${(headroom * 100).toFixed(1)}% (threshold: 15%)`,
            "Recommend programming G97 transition (Smax clamp) before D_min is reached",
          ],
        },
      );
    }

    return hookSuccess(
      hypermillCssLimit,
      `CSS safe: ${Math.round(requiredRpm)} RPM at D=${dMin}mm < machine max ${machineMaxRpm} RPM (${(headroom * 100).toFixed(1)}% headroom)`,
      { score: 1.0 },
    );
  },
};

// ============================================================================
// HOOK: hypermill-millturn-caxis-sync (WARNING)
// ============================================================================

/**
 * hypermill-millturn-caxis-sync — Warns when C-axis angle is missing for live tool ops.
 *
 * Cross-drilling, cross-slotting, and off-center milling on mill-turn machines
 * require the workpiece spindle to lock at a defined C-axis angle before the
 * live tool engages. Without C_angle, the angular position is undetermined
 * and the feature will be drilled at a random location on the OD.
 *
 * The hook reads from ctx.target.data:
 *   - geometry_type  {string}  e.g. "cross_hole", "cross_slot", "off_center_feature"
 *   - c_angle_deg    {number}  C-axis lock angle [degrees] — must be present and finite
 *   - live_tool_rpm  {number}  Live tool speed [RPM] — must be > 0
 */
const hypermillMillturnCaxisSync: HookDefinition = {
  id: "hypermill-millturn-caxis-sync",
  name: "hyperMILL Mill-Turn C-Axis Sync Check",
  description:
    "Warns when a cross-hole, cross-slot, or off-center feature is programmed without a C-axis lock angle. " +
    "Missing C_angle causes angular position error on live tool operations.",
  phase: "pre-toolpath",
  category: "quality",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["hypermill", "millturn", "caxis", "live-tool", "HM-REV-MS7"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const geomType: string = d.geometry_type ?? d.geometryType ?? "";

    const CAXIS_OPS = new Set(["cross_hole", "cross_slot", "off_center_feature"]);
    if (!CAXIS_OPS.has(geomType)) {
      return hookSuccess(hypermillMillturnCaxisSync, `Not a C-axis op (${geomType}) — skip`, { score: 1.0 });
    }

    const issues: string[] = [];

    const cAngle = d.c_angle_deg ?? d.cAngleDeg ?? d.c_angle;
    if (cAngle == null || !isFinite(Number(cAngle))) {
      issues.push(
        `c_angle_deg missing or non-finite for ${geomType} — C-axis position will be undetermined`,
      );
    }

    const liveToolRpm = d.live_tool_rpm ?? d.liveToolRpm ?? d.live_rpm;
    if (liveToolRpm == null || Number(liveToolRpm) <= 0) {
      issues.push(
        `live_tool_rpm must be > 0 for ${geomType} — live tool spindle speed not set`,
      );
    }

    // For multiple C positions, check that count and angles match
    const cPositions = d.c_positions ?? d.cPositions;
    if (Array.isArray(cPositions) && cPositions.length > 1) {
      const valid = cPositions.every((pos: any) => typeof pos === "number" && isFinite(pos));
      if (!valid) {
        issues.push("c_positions array contains invalid entries — all C positions must be finite numbers");
      }
    }

    if (issues.length > 0) {
      return hookWarning(
        hypermillMillturnCaxisSync,
        `C-axis sync incomplete for ${geomType} — ${issues.length} issue(s) found`,
        { score: 0.5, issues },
      );
    }

    return hookSuccess(
      hypermillMillturnCaxisSync,
      `C-axis sync OK: ${geomType} at C=${cAngle}deg, live_tool=${liveToolRpm} RPM`,
      { score: 1.0 },
    );
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

/** All hyperMILL turning/mill-turn hooks (HM-REV-MS7). */
export const hypermillTurningHooks: HookDefinition[] = [
  hypermillCssLimit,
  hypermillMillturnCaxisSync,
];

// Individual exports for testing
export { hypermillCssLimit, hypermillMillturnCaxisSync };
