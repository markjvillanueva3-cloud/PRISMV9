/**
 * MastercamSurfaceIntegrityBridge — surface finish + integrity prediction
 *
 * Predicts surface finish (Ra/Rz) + integrity flags (white layer risk,
 * residual stress sign) for a Mastercam toolpath given cutter, feed,
 * stepover, material. Used by the safety + scenario layers to flag
 * operations that won't meet drawing surface-finish callouts.
 *
 * Sister engine: HyperMillSurfaceIntegrityBridge (same shape, hyperMILL).
 *
 * Sources:
 *   - Trent + Wright, "Metal Cutting" 4th ed
 *   - Childs et al, "Metal Machining: Theory and Applications"
 *   - Ulutan & Ozel (2011) — surface integrity in Inconel/Ti machining
 *
 * @module engines/MastercamSurfaceIntegrityBridge
 * @milestone CAM-EXHAUST-MS0 U-CAM-MC-SI-01
 */

import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const SurfaceFinishOpKindSchema = z.enum([
  "ball_finish",
  "flat_finish",
  "bull_nose_finish",
  "side_milling",
  "face_milling",
  "turning_od_finish",
]);
export type SurfaceFinishOpKind = z.infer<typeof SurfaceFinishOpKindSchema>;

export const SurfaceIntegrityRequestSchema = z.object({
  op_kind: SurfaceFinishOpKindSchema,
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  tool_diameter_mm: z.number().positive(),
  corner_radius_mm: z.number().nonnegative().optional(),
  stepover_mm: z.number().positive(),
  feed_per_tooth_mm: z.number().positive(),
  flutes: z.number().int().positive(),
  rpm: z.number().int().positive(),
  using_coolant: z.boolean(),
});
export type SurfaceIntegrityRequest = z.infer<typeof SurfaceIntegrityRequestSchema>;

export const SurfaceIntegrityFindingSchema = z.object({
  predicted_ra_um: z.number().nonnegative(),
  predicted_rz_um: z.number().nonnegative(),
  white_layer_risk: z.enum(["none", "low", "medium", "high"]),
  residual_stress_sign: z.enum(["compressive", "neutral", "tensile"]),
  notes: z.array(z.string().min(1)),
});
export type SurfaceIntegrityFinding = z.infer<typeof SurfaceIntegrityFindingSchema>;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Theoretical scallop height for a ball end mill:
 *   h = R - sqrt(R² - (a_e/2)²)   where R = tool radius, a_e = stepover
 * Then Ra ≈ h / 4 (simplified — full Ra would need the cusp geometry integral).
 */
function scallopHeightMm(toolRadiusMm: number, stepoverMm: number): number {
  const inner = toolRadiusMm * toolRadiusMm - (stepoverMm / 2) * (stepoverMm / 2);
  if (inner <= 0) return toolRadiusMm; // stepover ≥ 2R = full cut
  return toolRadiusMm - Math.sqrt(inner);
}

/**
 * Ra estimate for flat-end-mill side milling (driven by feed per tooth):
 *   Ra ≈ fz² / (32 × R)  where R = corner radius (or tool radius for sharp).
 * Returns Ra in micrometers.
 */
function flatRaUm(feedPerToothMm: number, cornerRadiusMm: number, toolRadiusMm: number): number {
  const r = Math.max(cornerRadiusMm, 0.05); // sharp corners get a small effective radius
  void toolRadiusMm; // referenced for future cusp model
  return ((feedPerToothMm * feedPerToothMm) / (32 * r)) * 1000;
}

function whiteLayerRiskFor(iso: SurfaceIntegrityRequest["iso_group"], rpm: number, coolant: boolean): "none" | "low" | "medium" | "high" {
  // Superalloys + hardened steel produce white layer at high RPM without coolant.
  if (iso === "S" || iso === "H") {
    if (rpm > 6000 && !coolant) return "high";
    if (rpm > 3000 && !coolant) return "medium";
    if (rpm > 6000) return "medium";
    if (rpm > 3000) return "low";
    return "low";
  }
  // Steel + stainless can develop thin white layer at very high RPM dry.
  if ((iso === "P" || iso === "M") && rpm > 8000 && !coolant) return "low";
  return "none";
}

function residualStressSignFor(iso: SurfaceIntegrityRequest["iso_group"], rpm: number): "compressive" | "neutral" | "tensile" {
  // Conservative shop heuristic:
  //   slow-feed finishing (high RPM, light cut) → compressive (good for fatigue)
  //   high-temperature regime (S/H at high RPM, dry) → tensile (bad)
  if ((iso === "S" || iso === "H") && rpm > 6000) return "tensile";
  if (rpm > 4000) return "compressive";
  return "neutral";
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class MastercamSurfaceIntegrityBridge {
  static predict(request: SurfaceIntegrityRequest): SurfaceIntegrityFinding {
    const r = SurfaceIntegrityRequestSchema.parse(request);
    const toolRadiusMm = r.tool_diameter_mm / 2;
    const cornerRadius = r.corner_radius_mm ?? 0;

    let ra_um = 0;
    let rz_um = 0;
    const notes: string[] = [];

    switch (r.op_kind) {
      case "ball_finish":
      case "bull_nose_finish": {
        const cuspR = r.op_kind === "ball_finish" ? toolRadiusMm : Math.max(cornerRadius, 0.5);
        const h_mm = scallopHeightMm(cuspR, r.stepover_mm);
        rz_um = h_mm * 1000;
        ra_um = rz_um / 4;                                       // Ra ≈ Rz/4 simplified
        notes.push(`scallop height ${h_mm.toFixed(4)} mm from stepover ${r.stepover_mm} mm on ${cuspR} mm radius`);
        break;
      }
      case "flat_finish":
      case "side_milling":
      case "face_milling":
      case "turning_od_finish": {
        ra_um = flatRaUm(r.feed_per_tooth_mm, cornerRadius, toolRadiusMm);
        rz_um = ra_um * 4;                                       // Rz ≈ 4 × Ra simplified
        notes.push(`Ra estimate from fz²/(32·R) — driven by feed per tooth ${r.feed_per_tooth_mm} mm and corner radius ${Math.max(cornerRadius, 0.05)} mm`);
        break;
      }
    }

    const white_layer_risk = whiteLayerRiskFor(r.iso_group, r.rpm, r.using_coolant);
    const residual_stress_sign = residualStressSignFor(r.iso_group, r.rpm);

    if (white_layer_risk === "high") {
      notes.push(`HIGH white-layer risk: ${r.iso_group}-group at ${r.rpm} rpm without coolant — switch to flood coolant or lower RPM`);
    } else if (white_layer_risk === "medium") {
      notes.push(`Medium white-layer risk for ${r.iso_group}-group at ${r.rpm} rpm`);
    }

    if (residual_stress_sign === "tensile") {
      notes.push("Tensile residual stress predicted — finishing should compress (lower RPM + flood coolant) for fatigue parts");
    }

    return SurfaceIntegrityFindingSchema.parse({
      predicted_ra_um: Math.round(ra_um * 1000) / 1000,
      predicted_rz_um: Math.round(rz_um * 1000) / 1000,
      white_layer_risk,
      residual_stress_sign,
      notes,
    });
  }

  /** Validate the predicted Ra against a target spec; returns ok + reasons. */
  static validateAgainstSpec(args: { request: SurfaceIntegrityRequest; target_ra_um: number }): { ok: boolean; reasons: string[]; finding: SurfaceIntegrityFinding } {
    const finding = MastercamSurfaceIntegrityBridge.predict(args.request);
    const reasons: string[] = [];
    if (finding.predicted_ra_um > args.target_ra_um) {
      reasons.push(`Predicted Ra ${finding.predicted_ra_um} µm > target ${args.target_ra_um} µm — tighten stepover or reduce fz`);
    }
    if (finding.white_layer_risk === "high") {
      reasons.push("White-layer risk HIGH — operation should be reworked");
    }
    return { ok: reasons.length === 0, reasons, finding };
  }

  static auditEngine(): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    // Sanity: scallop height should be 0 when stepover is 0.
    const h0 = scallopHeightMm(5, 0);
    if (h0 !== 0) errors.push(`scallop height for stepover=0 should be 0, got ${h0}`);
    // Sanity: full-cut stepover (≥ 2R) should equal R (full immersion).
    const hFull = scallopHeightMm(5, 10);
    if (Math.abs(hFull - 5) > 1e-9) errors.push(`scallop height for stepover=2R should equal R, got ${hFull}`);
    return { ok: errors.length === 0, errors };
  }
}

export const mastercamSurfaceIntegrityBridge = MastercamSurfaceIntegrityBridge;
