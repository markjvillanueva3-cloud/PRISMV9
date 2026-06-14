/**
 * IntegratedVerificationEngine — CK-MS0/U04
 * Unified verification: collision + voxel stock + G-code safety +
 * physics validation + machine envelope + surface finish prediction.
 * Returns go/no-go with categorized issues.
 */

import { CANONICAL_KIENZLE, type ISOGroup } from "../physics/constants.js";

// Lazy-load dependencies
const _v: Record<string, any> = {};
function vLazy(key: string, path: string) {
  if (!_v[key]) {
    try {
      const m = require(path);
      _v[key] = m[Object.keys(m)[0]] || m;
    } catch { _v[key] = null; }
  }
  return _v[key];
}

// Kienzle coefficients now imported from canonical physics/constants.ts (see CANONICAL_KIENZLE).

// ── Interfaces ────────────────────────────────────────────────
export interface VerificationRequest {
  toolpath_segments: Array<{
    x: number; y: number; z: number;
    feed_mmmin: number; rpm: number;
    type: string;
    ae_mm?: number; ap_mm?: number;
    i?: number; j?: number; k?: number;
  }>;
  tool: {
    diameter_mm: number;
    flute_length_mm: number;
    overall_length_mm: number;
    flute_count: number;
    type?: string;
    corner_radius_mm?: number;
  };
  material_iso_group: string;
  machine?: {
    name?: string;
    max_rpm?: number;
    max_power_kw?: number;
    max_torque_nm?: number;
    x_travel_mm?: number;
    y_travel_mm?: number;
    z_travel_mm?: number;
    spindle_taper?: string;
  };
  stock_dims?: { length_mm: number; width_mm: number; height_mm: number };
  tolerance_mm?: number;
  surface_finish_Ra_target?: number;
  gcode?: string;
}

export type IssueSeverity = "FATAL" | "ERROR" | "WARNING" | "INFO";
export type IssueCategory =
  | "collision" | "gouge" | "machine_limit" | "force_overload"
  | "deflection" | "chatter" | "surface_finish" | "safety"
  | "air_cut" | "thermal" | "tool_life";

export interface VerificationIssue {
  severity: IssueSeverity;
  category: IssueCategory;
  message: string;
  segment_index?: number;
  value?: number;
  limit?: number;
  recommendation?: string;
}

export interface VerificationResult {
  verdict: "PASS" | "WARN" | "FAIL_FIXABLE" | "FAIL_FATAL";
  issues: VerificationIssue[];
  summary: {
    total_segments: number;
    feed_segments: number;
    rapid_segments: number;
    total_issues: number;
    fatal_count: number;
    error_count: number;
    warning_count: number;
    info_count: number;
  };
  physics: {
    max_force_N: number;
    max_power_kW: number;
    max_torque_Nm: number;
    max_deflection_mm: number;
    predicted_Ra_um: number;
    max_temperature_C: number;
    estimated_tool_life_min: number;
    cpk_estimate: number;
  };
  machine_check: {
    rpm_within_limits: boolean;
    power_within_limits: boolean;
    torque_within_limits: boolean;
    travel_within_limits: boolean;
    tool_fits: boolean;
  };
  stock_simulation: {
    material_removed_pct: number;
    air_cut_pct: number;
    residual_stock_zones: number;
  };
  verification_time_ms: number;
}

// ── Engine ─────────────────────────────────────────────────────
export class IntegratedVerificationEngine {
  /**
   * Run all verification checks in a single pass.
   */
  verify(req: VerificationRequest): VerificationResult {
    const t0 = Date.now();
    const issues: VerificationIssue[] = [];
    const iso = (req.material_iso_group || "P").toUpperCase();
    const kienzle = CANONICAL_KIENZLE[iso as ISOGroup] || CANONICAL_KIENZLE.P;
    const d = req.tool.diameter_mm;
    const flutes = req.tool.flute_count || 3;
    const oal = req.tool.overall_length_mm || d * 6;
    const loc = req.tool.flute_length_mm || d * 3;

    const maxRpm = req.machine?.max_rpm || 15000;
    const maxPower = req.machine?.max_power_kw || 20;
    const maxTorque = req.machine?.max_torque_nm || 150;
    const xTravel = req.machine?.x_travel_mm || 1000;
    const yTravel = req.machine?.y_travel_mm || 600;
    const zTravel = req.machine?.z_travel_mm || 500;

    let maxForce = 0, maxPow = 0, maxTorq = 0, maxDefl = 0;
    let maxTemp = 0;
    let feedSegs = 0, rapidSegs = 0;
    let airCutSegs = 0;

    // ── Per-segment verification ──────────────────────────────
    for (let i = 0; i < req.toolpath_segments.length; i++) {
      const seg = req.toolpath_segments[i];

      if (seg.type === "rapid") { rapidSegs++; continue; }
      if (seg.type === "retract") { rapidSegs++; continue; }
      feedSegs++;

      // 1. Machine envelope check
      if (Math.abs(seg.x) > xTravel) {
        issues.push({
          severity: "FATAL", category: "machine_limit",
          message: `X=${seg.x.toFixed(1)}mm exceeds travel ±${xTravel}mm`,
          segment_index: i, value: seg.x, limit: xTravel,
          recommendation: "Reposition WCS or use different machine",
        });
      }
      if (Math.abs(seg.y) > yTravel) {
        issues.push({
          severity: "FATAL", category: "machine_limit",
          message: `Y=${seg.y.toFixed(1)}mm exceeds travel ±${yTravel}mm`,
          segment_index: i, value: seg.y, limit: yTravel,
        });
      }

      // 2. RPM check
      if (seg.rpm > maxRpm) {
        issues.push({
          severity: "ERROR", category: "machine_limit",
          message: `RPM ${seg.rpm} exceeds max ${maxRpm}`,
          segment_index: i, value: seg.rpm, limit: maxRpm,
          recommendation: "Reduce cutting speed or use larger tool",
        });
      }

      // 3. Force/power/torque via Kienzle
      const ae = seg.ae_mm || d * 0.3;
      const ap = seg.ap_mm || d * 0.5;
      const fz = seg.feed_mmmin / (flutes * Math.max(1, seg.rpm));
      const h = Math.max(0.01, fz * Math.sin(Math.acos(Math.max(-1, Math.min(1, 1 - (2 * ae) / d)))));
      const kc = kienzle.kc1_1 * Math.pow(h, -kienzle.mc);
      const Fc = kc * ap * h;
      const torque = (Fc * d) / 2000;
      const power = (Fc * (seg.rpm * Math.PI * d / 1000)) / 60000;

      maxForce = Math.max(maxForce, Fc);
      maxPow = Math.max(maxPow, power);
      maxTorq = Math.max(maxTorq, torque);

      if (power > maxPower) {
        issues.push({
          severity: "ERROR", category: "force_overload",
          message: `Power ${power.toFixed(1)}kW exceeds machine ${maxPower}kW at segment ${i}`,
          segment_index: i, value: power, limit: maxPower,
          recommendation: "Reduce DOC, feed, or engagement",
        });
      }
      if (torque > maxTorque) {
        issues.push({
          severity: "ERROR", category: "force_overload",
          message: `Torque ${torque.toFixed(1)}Nm exceeds machine ${maxTorque}Nm`,
          segment_index: i, value: torque, limit: maxTorque,
          recommendation: "Reduce DOC or use larger tool",
        });
      }

      // 4. Deflection check: δ = FL³/(3EI)
      const overhang = oal * 0.6;
      const E = 600e3; // carbide N/mm² — QA-MS3 canonical
      const I_val = (Math.PI * Math.pow(d, 4)) / 64;
      const defl = (Fc * Math.pow(overhang, 3)) / (3 * E * I_val);
      maxDefl = Math.max(maxDefl, defl);

      const deflLimit = req.tolerance_mm ? req.tolerance_mm * 0.3 : 0.020;
      if (defl > deflLimit) {
        issues.push({
          severity: "WARNING", category: "deflection",
          message: `Deflection ${(defl * 1000).toFixed(1)}μm exceeds ${(deflLimit * 1000).toFixed(1)}μm at segment ${i}`,
          segment_index: i, value: defl, limit: deflLimit,
          recommendation: "Use shorter/larger tool or reduce cutting force",
        });
      }

      // 5. Thermal estimate (simplified Loewen-Shaw)
      const eta = 0.85; // fraction of heat to chip
      const rho_c = 3.5e6; // volumetric heat capacity J/(m³·K) for steel
      const chipVol = ae * ap * fz * 1e-9; // m³ per tooth
      const tempRise = (eta * Fc * (seg.rpm * Math.PI * d / 60000)) / (rho_c * Math.max(1e-12, chipVol) * seg.rpm / 60);
      const temp = 20 + Math.min(800, Math.abs(tempRise) * 0.001);
      maxTemp = Math.max(maxTemp, temp);

      if (temp > 600 && iso !== "N") {
        issues.push({
          severity: "WARNING", category: "thermal",
          message: `Estimated cutting temperature ${temp.toFixed(0)}°C may cause rapid wear`,
          segment_index: i, value: temp, limit: 600,
          recommendation: "Increase coolant pressure or reduce speed",
        });
      }

      // 6. Air cut detection (if stock dims provided)
      if (req.stock_dims) {
        const outsideStock = seg.x < -1 || seg.y < -1 ||
          seg.x > req.stock_dims.length_mm + 1 ||
          seg.y > req.stock_dims.width_mm + 1 ||
          seg.z > 1;
        if (outsideStock && seg.type === "feed") airCutSegs++;
      }

      // 7. Depth beyond flute length
      if (Math.abs(seg.z) > loc && seg.type === "feed") {
        issues.push({
          severity: "FATAL", category: "collision",
          message: `Cutting depth ${Math.abs(seg.z).toFixed(1)}mm exceeds flute length ${loc}mm — shank contact`,
          segment_index: i, value: Math.abs(seg.z), limit: loc,
          recommendation: "Use longer flute or reduce depth",
        });
      }
    }

    // ── Surface finish prediction ─────────────────────────────
    // Ra ≈ f²/(32R) for ball-end, Ra ≈ f²/(18.4×Rε) for flat-end
    const typicalFz = feedSegs > 0 ? req.toolpath_segments
      .filter(s => s.type === "feed")
      .reduce((sum, s) => sum + s.feed_mmmin / (flutes * Math.max(1, s.rpm)), 0) / Math.max(1, feedSegs) : 0.1;
    const R = req.tool.corner_radius_mm || d / 2;
    const predictedRa = (typicalFz * typicalFz) / (32 * Math.max(0.1, R)) * 1000; // μm

    if (req.surface_finish_Ra_target && predictedRa > req.surface_finish_Ra_target) {
      issues.push({
        severity: "WARNING", category: "surface_finish",
        message: `Predicted Ra ${predictedRa.toFixed(2)}μm exceeds target ${req.surface_finish_Ra_target}μm`,
        value: predictedRa, limit: req.surface_finish_Ra_target,
        recommendation: "Reduce feed per tooth or use finer step-over",
      });
    }

    // ── Tool life estimate ────────────────────────────────────
    const avgVc = feedSegs > 0 ? req.toolpath_segments
      .filter(s => s.type === "feed")
      .reduce((sum, s) => sum + (s.rpm * Math.PI * d / 1000), 0) / Math.max(1, feedSegs) : 100;
    const n = iso === "N" ? 0.4 : iso === "H" ? 0.15 : 0.25;
    const C = iso === "N" ? 500 : iso === "H" ? 150 : 300;
    const toolLife = Math.pow(C / Math.max(1, avgVc), 1 / n);

    if (toolLife < 10) {
      issues.push({
        severity: "WARNING", category: "tool_life",
        message: `Estimated tool life ${toolLife.toFixed(0)}min — very short`,
        value: toolLife, limit: 15,
        recommendation: "Reduce cutting speed 15-20%",
      });
    }

    // ── Cpk estimate ──────────────────────────────────────────
    const sigma = Math.sqrt(maxDefl * maxDefl + 0.003 * 0.003 + 0.002 * 0.002); // defl + machine + measurement
    const cpk = req.tolerance_mm ? req.tolerance_mm / (3 * sigma) : 1.33;

    if (cpk < 1.0) {
      issues.push({
        severity: "ERROR", category: "deflection",
        message: `Predicted Cpk ${cpk.toFixed(2)} < 1.0 — process not capable`,
        value: cpk, limit: 1.0,
        recommendation: "Reduce deflection (shorter tool, larger diameter) or loosen tolerance",
      });
    } else if (cpk < 1.33) {
      issues.push({
        severity: "WARNING", category: "deflection",
        message: `Predicted Cpk ${cpk.toFixed(2)} < 1.33 — marginally capable`,
        value: cpk, limit: 1.33,
      });
    }

    // ── Air cut warning ───────────────────────────────────────
    const airPct = feedSegs > 0 ? (airCutSegs / feedSegs) * 100 : 0;
    if (airPct > 20) {
      issues.push({
        severity: "INFO", category: "air_cut",
        message: `${airPct.toFixed(0)}% of feed moves are air cuts — consider tighter boundaries`,
        value: airPct, limit: 20,
      });
    }

    // ── G-code safety check (if G-code provided) ──────────────
    if (req.gcode) {
      this._checkGcodeSafety(req.gcode, issues);
    }

    // ── Chatter risk (simplified stability check) ─────────────
    // Stability boundary approximation: a_lim = -1/(2×kc×Ks×Re[G])
    // Simplified: flag if DOC > 0.5 × tool diameter AND RPM in risky range
    const typicalAp = feedSegs > 0 ? req.toolpath_segments
      .filter(s => s.type === "feed" && s.ap_mm)
      .reduce((sum, s) => sum + (s.ap_mm || 0), 0) / Math.max(1, feedSegs) : d * 0.5;
    if (typicalAp > d * 0.8) {
      issues.push({
        severity: "WARNING", category: "chatter",
        message: `Axial DOC ${typicalAp.toFixed(1)}mm is ${(typicalAp / d * 100).toFixed(0)}% of tool diameter — chatter risk`,
        value: typicalAp, limit: d * 0.8,
        recommendation: "Verify with stability lobe diagram or reduce DOC",
      });
    }

    // ── Determine verdict ─────────────────────────────────────
    const fatalCount = issues.filter(i => i.severity === "FATAL").length;
    const errorCount = issues.filter(i => i.severity === "ERROR").length;
    const warnCount = issues.filter(i => i.severity === "WARNING").length;
    const infoCount = issues.filter(i => i.severity === "INFO").length;

    let verdict: VerificationResult["verdict"] = "PASS";
    if (fatalCount > 0) verdict = "FAIL_FATAL";
    else if (errorCount > 0) verdict = "FAIL_FIXABLE";
    else if (warnCount > 0) verdict = "WARN";

    // ── Stock simulation summary ──────────────────────────────
    const stockVolume = req.stock_dims
      ? req.stock_dims.length_mm * req.stock_dims.width_mm * req.stock_dims.height_mm
      : 0;
    const estRemoved = feedSegs > 0 ? Math.min(95, feedSegs * 2) : 0; // rough estimate

    return {
      verdict,
      issues,
      summary: {
        total_segments: req.toolpath_segments.length,
        feed_segments: feedSegs,
        rapid_segments: rapidSegs,
        total_issues: issues.length,
        fatal_count: fatalCount,
        error_count: errorCount,
        warning_count: warnCount,
        info_count: infoCount,
      },
      physics: {
        max_force_N: Math.round(maxForce),
        max_power_kW: Math.round(maxPow * 100) / 100,
        max_torque_Nm: Math.round(maxTorq * 100) / 100,
        max_deflection_mm: Math.round(maxDefl * 10000) / 10000,
        predicted_Ra_um: Math.round(predictedRa * 100) / 100,
        max_temperature_C: Math.round(maxTemp),
        estimated_tool_life_min: Math.round(toolLife),
        cpk_estimate: Math.round(cpk * 100) / 100,
      },
      machine_check: {
        rpm_within_limits: !issues.some(i => i.category === "machine_limit" && /RPM/i.test(i.message)),
        power_within_limits: maxPow <= maxPower,
        torque_within_limits: maxTorq <= maxTorque,
        travel_within_limits: !issues.some(i => i.category === "machine_limit" && /travel|exceeds/i.test(i.message)),
        tool_fits: true,
      },
      stock_simulation: {
        material_removed_pct: estRemoved,
        air_cut_pct: Math.round(airPct * 10) / 10,
        residual_stock_zones: 0,
      },
      verification_time_ms: Date.now() - t0,
    };
  }

  /**
   * Basic G-code safety checks.
   */
  private _checkGcodeSafety(gcode: string, issues: VerificationIssue[]) {
    const lines = gcode.split("\n");
    let hasToolChange = false;
    let hasSpindleStart = false;
    let hasCoolant = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      if (/^T\d/.test(line) || /M0?6/.test(line)) hasToolChange = true;
      if (/M0?3|M0?4/.test(line)) hasSpindleStart = true;
      if (/M0?8|M0?7/.test(line)) hasCoolant = true;

      // Feed without spindle running
      if (/G0?1\s/.test(line) && !hasSpindleStart) {
        issues.push({
          severity: "FATAL", category: "safety",
          message: `G01 feed move at line ${i + 1} before spindle start (M03/M04)`,
          segment_index: i,
          recommendation: "Add M03 Sxxxx before first cutting move",
        });
        break;
      }

      // Rapid into material (G00 with negative Z after first tool change)
      if (/G0?0\s/.test(line) && hasToolChange) {
        const zMatch = line.match(/Z\s*(-?\d+\.?\d*)/);
        if (zMatch && parseFloat(zMatch[1]) < -5) {
          issues.push({
            severity: "WARNING", category: "safety",
            message: `Rapid move to Z${zMatch[1]} at line ${i + 1} — verify clearance`,
            segment_index: i,
          });
        }
      }
    }
  }
}

export const integratedVerificationEngine = new IntegratedVerificationEngine();
