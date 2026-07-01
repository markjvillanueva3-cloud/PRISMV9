/**
 * DFMFeedbackEngine — CK-MS11/U03
 * Design for Manufacturability feedback on feature input.
 * Flags: thin walls, deep pockets, tight tolerances, tool access,
 * draft angles, and material-specific concerns.
 */

export interface DFMIssue {
  severity: "critical" | "warning" | "info";
  category: string;
  feature_id?: string;
  message: string;
  recommendation: string;
  physics_basis?: string;
}

export interface DFMResult {
  issues: DFMIssue[];
  score: number; // 0-100 (100 = no issues)
  critical_count: number;
  warning_count: number;
  info_count: number;
  manufacturability: "excellent" | "good" | "marginal" | "difficult";
}

export class DFMFeedbackEngine {
  analyze(
    features: Array<{
      id?: string;
      type: string;
      dimensions?: {
        length_mm?: number; width_mm?: number;
        depth_mm?: number; diameter_mm?: number;
      };
      tolerance_mm?: number;
      surface_finish_Ra?: number;
      wall_thickness_mm?: number;
      corner_radius_mm?: number;
    }>,
    material_iso_group?: string,
    machine_axes?: number,
  ): DFMResult {
    const issues: DFMIssue[] = [];
    const iso = material_iso_group || "P";

    for (const f of features) {
      const d = f.dimensions || {};
      const fid = f.id || f.type;

      // ── Wall thickness ────────────────────────────────
      if (f.wall_thickness_mm !== undefined) {
        if (f.wall_thickness_mm < 0.5) {
          issues.push({
            severity: "critical", category: "thin_wall",
            feature_id: fid,
            message: `Wall ${f.wall_thickness_mm}mm is below minimum (0.5mm)`,
            recommendation: "Increase wall to ≥1mm or use EDM",
            physics_basis: "δ=FL³/3EI — deflection increases cubically with wall reduction",
          });
        } else if (f.wall_thickness_mm < 2) {
          issues.push({
            severity: "warning", category: "thin_wall",
            feature_id: fid,
            message: `Wall ${f.wall_thickness_mm}mm is thin — high deflection risk`,
            recommendation: "Use reduced DOC, climb milling, support on both sides",
          });
        }
      }

      // ── Depth-to-width ratio ──────────────────────────
      if (d.depth_mm && d.width_mm) {
        const ratio = d.depth_mm / d.width_mm;
        if (ratio > 6) {
          issues.push({
            severity: "critical", category: "deep_pocket",
            feature_id: fid,
            message: `Depth/width ratio ${ratio.toFixed(1)}:1 exceeds 6:1 limit`,
            recommendation: "Widen pocket or reduce depth; consider EDM for narrow deep slots",
            physics_basis: "Tool L/D >5 causes >0.02mm deflection at typical forces",
          });
        } else if (ratio > 4) {
          issues.push({
            severity: "warning", category: "deep_pocket",
            feature_id: fid,
            message: `Depth/width ratio ${ratio.toFixed(1)}:1 — extended tool needed`,
            recommendation: "Use anti-vibration tool, reduce feed 50%",
          });
        }
      }

      // ── Tight tolerances ──────────────────────────────
      if (f.tolerance_mm !== undefined) {
        if (f.tolerance_mm < 0.005) {
          issues.push({
            severity: "critical", category: "tight_tolerance",
            feature_id: fid,
            message: `±${f.tolerance_mm}mm tolerance requires grinding or EDM`,
            recommendation: "Relax to ±0.01mm for milling, or plan secondary op",
          });
        } else if (f.tolerance_mm < 0.01) {
          issues.push({
            severity: "warning", category: "tight_tolerance",
            feature_id: fid,
            message: `±${f.tolerance_mm}mm — achievable but needs thermal stability`,
            recommendation: "Machine after 2hr warmup, probe between passes",
          });
        }
      }

      // ── Surface finish ────────────────────────────────
      if (f.surface_finish_Ra !== undefined) {
        if (f.surface_finish_Ra < 0.2) {
          issues.push({
            severity: "critical", category: "surface_finish",
            feature_id: fid,
            message: `Ra ${f.surface_finish_Ra}μm requires grinding or polishing`,
            recommendation: "Add grinding or lapping as secondary operation",
          });
        } else if (f.surface_finish_Ra < 0.4) {
          issues.push({
            severity: "warning", category: "surface_finish",
            feature_id: fid,
            message: `Ra ${f.surface_finish_Ra}μm — achievable with CBN/diamond`,
            recommendation: "Use CBN insert at high speed, air blast, <50% tool life",
          });
        }
      }

      // ── Corner radius ─────────────────────────────────
      if (f.corner_radius_mm !== undefined && f.corner_radius_mm < 0.5) {
        issues.push({
          severity: "warning", category: "sharp_corner",
          feature_id: fid,
          message: `Corner radius ${f.corner_radius_mm}mm — needs small tool or EDM`,
          recommendation: "Increase to ≥1mm or plan EDM for sharp internal corners",
        });
      }

      // ── Small holes ───────────────────────────────────
      if (/hole|drill/.test(f.type) && d.diameter_mm && d.depth_mm) {
        const ldRatio = d.depth_mm / d.diameter_mm;
        if (d.diameter_mm < 1) {
          issues.push({
            severity: "critical", category: "micro_feature",
            feature_id: fid,
            message: `Ø${d.diameter_mm}mm hole — micro-drilling required`,
            recommendation: "Use high-speed micro-drill spindle (>20,000 RPM)",
          });
        }
        if (ldRatio > 10) {
          issues.push({
            severity: "critical", category: "deep_hole",
            feature_id: fid,
            message: `Hole L/D ${ldRatio.toFixed(0)}:1 exceeds standard drilling (10:1)`,
            recommendation: "Use gun drill or peck with through-spindle coolant",
          });
        }
      }

      // ── Material-specific ─────────────────────────────
      if (iso === "S" && d.depth_mm && d.depth_mm > 30) {
        issues.push({
          severity: "warning", category: "material_concern",
          feature_id: fid,
          message: "Deep feature in superalloy — high tool wear risk",
          recommendation: "Plan for 3-5× more tool changes than steel",
        });
      }
      if (iso === "H" && f.wall_thickness_mm && f.wall_thickness_mm < 5) {
        issues.push({
          severity: "warning", category: "material_concern",
          feature_id: fid,
          message: "Thin wall in hardened steel — cracking risk",
          recommendation: "Use CBN with air blast, no thermal shock from coolant",
        });
      }
    }

    // ── Score ────────────────────────────────────────────
    const crit = issues.filter(i => i.severity === "critical").length;
    const warn = issues.filter(i => i.severity === "warning").length;
    const info = issues.filter(i => i.severity === "info").length;
    const score = Math.max(0, 100 - crit * 20 - warn * 5 - info * 1);

    const mfg = score >= 80 ? "excellent"
      : score >= 60 ? "good"
        : score >= 40 ? "marginal" : "difficult";

    return {
      issues, score,
      critical_count: crit, warning_count: warn, info_count: info,
      manufacturability: mfg,
    };
  }
}

export const dfmFeedbackEngine = new DFMFeedbackEngine();
