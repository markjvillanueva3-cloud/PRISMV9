/**
 * HyperMillMillTurnHooks — Mill-Turn + Medical Safety Hooks
 *
 * HM-REV-MS7: Two new hooks:
 *
 * hypermill-css-limit (BLOCKING):
 *   Fires pre-toolpath. Validates G96 Constant Surface Speed against machine
 *   max RPM at the minimum machining diameter. If RPM_required > machine_max,
 *   BLOCKS with actionable fix (add G50 cap or switch to G97).
 *   Formula: RPM = (1000 × Vc) / (π × D_min)   [ISO 6983-1]
 *
 * hypermill-biomedical-validation (BLOCKING for implant surfaces):
 *   Fires pre-toolpath. Validates cutting parameters for medical device materials
 *   (CoCr, PEEK, Ti Grade 5, zirconia). Checks:
 *     - Coolant: through-spindle only for implant-grade (no contamination risk)
 *     - Surface finish: Ra < 0.8 µm required for implant contact surfaces
 *     - Burr-free: finishing must use climb milling + sharp tools
 *     - FDA 21 CFR 820 / EU MDR Annex I essential requirements noted
 *
 * @module hooks/HyperMillMillTurnHooks
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
// STATUS-AWARE RESULT TYPE (adds .status for test compatibility)
// ============================================================================

type StatusHookResult = HookResult & { status: "success" | "blocked" | "warning" };

function withStatus(result: HookResult): StatusHookResult {
  const status: "success" | "blocked" | "warning" = result.blocked ? "blocked" : result.success ? "success" : "warning";
  return Object.assign(result, { status });
}

// ============================================================================
// MEDICAL DEVICE MATERIALS SET
// ============================================================================

/** Materials requiring biomedical cutting parameter validation. */
const IMPLANT_GRADE_MATERIALS = new Set([
  "cocr", "co-cr", "cobalt_chromium", "cobalt-chromium", "cocrmow",
  "peek", "polyetheretherketone",
  "titanium_gr5", "ti6al4v", "ti-6al-4v", "ti_grade5", "titanium_grade_5",
  "zirconia", "yttria_stabilized_zirconia", "ysz",
  "titanium_gr4", "ti_grade4",   // dental implants (cp titanium)
  "titanium_gr23", "ti6al4veli", // medical-grade ELI titanium
]);

function isMedicalMaterial(material: string): boolean {
  const m = material.toLowerCase().replace(/[\s_-]/g, "_");
  for (const key of IMPLANT_GRADE_MATERIALS) {
    if (m.includes(key.replace(/[-_]/g, "_"))) return true;
  }
  return false;
}

// ============================================================================
// HOOK: hypermill-css-limit (BLOCKING)
// ============================================================================

const hyperMillCSSLimitHook: HookDefinition = {
  id: "hypermill-css-limit",
  name: "hyperMILL CSS RPM Limit Gate",
  description:
    "BLOCKS when G96 Constant Surface Speed (CSS) would require spindle RPM > machine max at the minimum machining diameter. " +
    "Formula: RPM = (1000 × Vc) / (π × D_min). Machine max RPM sourced from context or defaults to 6000.",
  phase: "pre-toolpath",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["hypermill", "millturn", "turning", "css", "g96", "rpm", "blocking", "critical", "HM-REV-MS7"],
  handler: (ctx: HookContext): StatusHookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;

    // Only fires when G96 CSS mode is active
    const cssMode = d.cssMode ?? d.css_mode ?? d.speed_mode ?? "";
    if (!cssMode || (cssMode !== "G96" && cssMode !== "g96" && cssMode !== "css")) {
      return withStatus(hookSuccess(hyperMillCSSLimitHook, "CSS mode not active — skip RPM limit check"));
    }

    const vcDesired: number = d.vc_m_min ?? d.vcDesired_m_min ?? d.surface_speed ?? 0;
    const dMin: number = d.min_diameter_mm ?? d.minDiameter_mm ?? d.d_min_mm ?? 0;
    const machineMaxRpm: number = d.machine_max_rpm ?? d.machineMaxRpm ?? ctx.metadata?.machineMaxRpm ?? 6000;

    if (vcDesired <= 0 || dMin <= 0) {
      return withStatus(hookSuccess(hyperMillCSSLimitHook, "Insufficient CSS data for RPM check — pass"));
    }

    // RPM = (1000 × Vc) / (π × D_min)   Source: ISO 6983-1, Sandvik Coromant 2024
    const rpmRequired = (1000 * vcDesired) / (Math.PI * dMin);

    if (rpmRequired <= machineMaxRpm) {
      return withStatus(hookSuccess(
        hyperMillCSSLimitHook,
        `CSS safe: ${Math.round(rpmRequired)} RPM at D=${dMin}mm ≤ machine max ${machineMaxRpm} RPM`,
        { score: 1.0 },
      ));
    }

    // Blocked — compute capped alternative
    const vcAtCap = (Math.PI * dMin * machineMaxRpm) / 1000;
    return withStatus(hookBlock(
      hyperMillCSSLimitHook,
      `CSS RPM EXCEEDED: G96 at Vc=${vcDesired} m/min requires ${Math.round(rpmRequired)} RPM at D=${dMin}mm — machine max is ${machineMaxRpm} RPM`,
      {
        score: 0,
        issues: [
          `Required RPM: ${Math.round(rpmRequired)} RPM (machine max: ${machineMaxRpm} RPM, exceeded by ${Math.round(rpmRequired - machineMaxRpm)} RPM)`,
          `Formula: RPM = (1000 × ${vcDesired}) / (π × ${dMin}) = ${Math.round(rpmRequired)} RPM`,
          `Fix option 1: Add G50 S${machineMaxRpm} RPM cap before G96 block — Vc drops to ${vcAtCap.toFixed(1)} m/min at D=${dMin}mm`,
          `Fix option 2: Switch to G97 S${machineMaxRpm} at D < ${(vcAtCap * 2).toFixed(1)}mm`,
          "Fix option 3: Increase minimum diameter (redesign feature or rework entry path)",
        ],
      },
    ));
  },
};

// ============================================================================
// HOOK: hypermill-biomedical-validation (BLOCKING for implant surfaces)
// ============================================================================

const hyperMillBiomedicalValidationHook: HookDefinition = {
  id: "hypermill-biomedical-validation",
  name: "hyperMILL Biomedical Cutting Parameter Validator",
  description:
    "Validates cutting parameters for medical device materials (CoCr, PEEK, Ti Grade 5, zirconia). " +
    "BLOCKS when: (1) coolant is not through-spindle for implant-grade materials, " +
    "(2) predicted Ra > 0.8 µm for implant contact surfaces, " +
    "(3) conventional milling used on CoCr (work hardening risk). " +
    "Compliance references: FDA 21 CFR 820 (Quality System Regulation), EU MDR Annex I Essential Requirements.",
  phase: "pre-toolpath",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["hypermill", "medical", "biomedical", "implant", "cocr", "peek", "titanium",
         "fda", "mdr", "compliance", "blocking", "critical", "HM-REV-MS7"],
  handler: (ctx: HookContext): StatusHookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;

    const material: string = d.material ?? d.materialName ?? d.material_name ?? "";
    if (!material || !isMedicalMaterial(material)) {
      return withStatus(hookSuccess(hyperMillBiomedicalValidationHook, `Non-medical material (${material || "unspecified"}) — skip biomedical validation`));
    }

    const issues: string[] = [];
    let blocked = false;
    const mat = material.toLowerCase();

    // ── 1. Coolant check ─────────────────────────────────────────────────────
    // Implant-grade materials require through-spindle coolant to avoid
    // contamination and particle embedment in the surface.
    // Reference: ISO 13485:2016 §7.5.1 (controlled production conditions)
    const coolantType: string = (d.coolantType ?? d.coolant_type ?? "").toLowerCase();
    const isImplantSurface: boolean = d.implant_surface ?? d.isImplantSurface ?? true;
    if (isImplantSurface && coolantType && !coolantType.includes("through_spindle") && !coolantType.includes("internal")) {
      issues.push(`COOLANT: Implant-grade ${material} requires through-spindle coolant — flood coolant risks particle contamination of implant surface`);
      issues.push("Reference: ISO 13485:2016 §7.5.1, FDA 21 CFR 820.70(a) — controlled production conditions");
      blocked = true;
    }

    // ── 2. Surface finish check ───────────────────────────────────────────────
    // Ra < 0.8 µm required for implant contact surfaces per FDA/ASTM F86.
    // Reference: FDA 21 CFR 820.70, ASTM F86 (surface preparation of implants)
    const predictedRa_um: number = d.predicted_ra_um ?? d.predictedRa ?? d.ra_um ?? 0;
    if (isImplantSurface && predictedRa_um > 0 && predictedRa_um > 0.8) {
      issues.push(`SURFACE FINISH: Predicted Ra = ${predictedRa_um.toFixed(2)} µm > 0.8 µm limit for implant contact surfaces`);
      issues.push("Reference: FDA 21 CFR 820, ASTM F86 — implant surface finish Ra < 0.8 µm");
      issues.push("Fix: Increase finishing passes, reduce feed/rev, or add honing/polishing step");
      blocked = true;
    }

    // ── 3. CoCr work hardening check ─────────────────────────────────────────
    // CoCr (ISO S group) work hardens rapidly. Conventional milling causes
    // rubbing on exit, dramatically accelerating hardening.
    // Reference: Davis "Handbook of Materials for Medical Devices" (ASM 2003)
    if (mat.includes("cocr") || mat.includes("cobalt")) {
      const cuttingMode: string = (d.cuttingMode ?? d.cutting_mode ?? "").toLowerCase();
      if (cuttingMode === "conventional") {
        issues.push("COCR WORK HARDENING: Conventional milling BLOCKED for CoCr — work hardening on re-entry causes insert fracture");
        issues.push("Reference: ASM Handbook Vol.16 (Machining), Davis 2003 — CoCr requires climb milling only");
        issues.push("Fix: Set cuttingMode = 'climb' and limit radial engagement to ≤ 30% of tool diameter");
        blocked = true;
      }
      // Speed check for CoCr: recommended 20-40 m/min
      const vc: number = d.vc_m_min ?? d.surface_speed ?? d.vcDesired_m_min ?? 0;
      if (vc > 0 && vc > 60) {
        issues.push(`COCR SPEED WARNING: Vc = ${vc} m/min exceeds recommended 20-40 m/min for CoCr (risk of built-up edge + rapid tool wear)`);
        issues.push("Reference: Sandvik Coromant Medical Machining Guide 2023 — CoCr Vc 20-40 m/min");
      }
    }

    // ── 4. PEEK thermal ceiling check ────────────────────────────────────────
    // PEEK crystallinity changes above 250°C. Heat from cutting must stay below.
    // Reference: Victrex PEEK machining guide (2022), ISO 10993-18 (chemical char.)
    if (mat.includes("peek")) {
      const estimatedTemp_C: number = d.estimated_temp_c ?? d.cuttingTemp ?? 0;
      if (estimatedTemp_C > 0 && estimatedTemp_C > 250) {
        issues.push(`PEEK THERMAL: Estimated cutting temperature ${estimatedTemp_C}°C > 250°C ceiling — PEEK crystallinity will change, affecting biocompatibility`);
        issues.push("Reference: Victrex PEEK Machining Guide 2022 — cutting temp < 250°C, use sharp tools + air blast or minimum quantity lubrication");
        issues.push("Fix: Reduce Vc or increase feed to reduce rubbing heat; use sharp HSS or uncoated carbide");
        blocked = true;
      }
    }

    // ── 5. Burr-free edge requirement ─────────────────────────────────────────
    // Medical implants must be burr-free — burrs create stress risers and
    // debris that can cause in-vivo failure.
    // Reference: EU MDR Annex I §10.4 (design and manufacture — surface properties)
    if (isImplantSurface) {
      const hasDeburStep: boolean = d.has_debur_step ?? d.hasDeburStep ?? d.deburring ?? false;
      const sharpToolConfirmed: boolean = d.sharp_tool ?? d.sharpTool ?? d.toolEdgePrep !== "heavy_hone";
      if (!hasDeburStep && !sharpToolConfirmed) {
        issues.push("BURR-FREE: No deburring step detected for implant surface — burrs create debris and stress risers");
        issues.push("Reference: EU MDR Annex I Essential Requirement §10.4 — surface must be free of sharp edges/burrs");
        // Warning level, not block
      }
    }

    if (blocked && issues.length > 0) {
      return withStatus(hookBlock(
        hyperMillBiomedicalValidationHook,
        `BIOMEDICAL VALIDATION FAILED for ${material}: ${issues.length} issue(s) detected`,
        { score: 0, issues },
      ));
    }

    if (issues.length > 0) {
      const result = withStatus(hookWarning(
        hyperMillBiomedicalValidationHook,
        `BIOMEDICAL WARNING for ${material}: review compliance items`,
        { score: 0.5 },
      ));
      // Attach issues directly so tests can access (r as any).issues
      (result as any).issues = issues;
      return result;
    }

    return withStatus(hookSuccess(
      hyperMillBiomedicalValidationHook,
      `Biomedical validation passed for ${material}`,
      { score: 1.0 },
    ));
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const hyperMillMillTurnHooks: HookDefinition[] = [
  hyperMillCSSLimitHook,
  hyperMillBiomedicalValidationHook,
];

export { hyperMillCSSLimitHook, hyperMillBiomedicalValidationHook };
