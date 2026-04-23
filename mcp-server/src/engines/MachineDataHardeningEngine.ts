/**
 * MachineDataHardeningEngine — SQ3-0-MACH
 *
 * Audits, enriches, and validates the 910-machine database.
 * Orchestrates existing data sources:
 *   - MachineProfileEngine (DEFAULT_MACHINES + user profiles)
 *   - MACHINE_TORQUE_CURVES (1,058 machines)
 *   - machine-enrichment-inferred.ts (gap-filling functions)
 *   - machine-enrichment-catalog.ts (232 POST DB profiles)
 *
 * Actions: audit, harden (gap-fill), validate (physics checks), ingestModels, summary
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { MACHINE_TORQUE_CURVES, type MachineTorqueCurve } from "../data/machine-torque-curves.js";
import {
  inferTorqueCurve,
  inferTableLoad,
  inferAccuracy,
  inferCollisionZones,
  inferWeight,
  type MachineEnrichment,
} from "../data/machine-enrichment-inferred.js";

// ── Types ──

export type MachineType = "vmc" | "hmc" | "lathe" | "mill_turn" | "5axis" | "router" | "grinder" | "swiss" | "edm_wire" | "edm_sinker";

export interface HardenField {
  field: string;
  status: "present" | "missing" | "suspect";
  value?: unknown;
  source?: string;
  note?: string;
}

export interface MachineAuditEntry {
  machine_id: string;
  manufacturer: string;
  model: string;
  type: string;
  completeness_pct: number;
  fields: HardenField[];
  missing_count: number;
  suspect_count: number;
}

export interface AuditReport {
  timestamp: string;
  total_machines: number;
  avg_completeness_pct: number;
  machines_above_90: number;
  machines_below_50: number;
  field_coverage: Record<string, { present: number; missing: number; suspect: number; pct: number }>;
  worst_machines: MachineAuditEntry[];
  best_machines: MachineAuditEntry[];
  entries: MachineAuditEntry[];
  warnings: string[];
}

export interface HardenResult {
  timestamp: string;
  dry_run: boolean;
  total_machines: number;
  gaps_found: number;
  gaps_filled: number;
  fills: Array<{
    machine_id: string;
    field: string;
    old_value: unknown;
    new_value: unknown;
    source: string;
  }>;
  warnings: string[];
}

export interface ValidationIssue {
  machine_id: string;
  field: string;
  severity: "error" | "warning" | "info";
  message: string;
  expected?: unknown;
  actual?: unknown;
}

export interface ValidationReport {
  timestamp: string;
  total_machines: number;
  machines_checked: number;
  issues: ValidationIssue[];
  error_count: number;
  warning_count: number;
  pass_rate_pct: number;
}

export interface ModelIngestResult {
  timestamp: string;
  scan_path: string;
  files_found: number;
  files_mapped: number;
  files_unmapped: number;
  mappings: Array<{ file: string; machine_id: string | null; confidence: number }>;
}

// ── Required fields for completeness audit ──

const REQUIRED_FIELDS = [
  "spindle.max_rpm",
  "spindle.rated_power_kw",
  "spindle.max_torque_nm",
  "spindle.base_rpm",
  "spindle.taper",
  "axes.x_mm",
  "axes.y_mm",
  "axes.z_mm",
  "rapid_rate_mmmin",
  "max_feed_mmmin",
  "tool_changer_capacity",
  "max_tool_diameter_mm",
  "max_tool_length_mm",
  "max_part_weight_kg",
  "coolant.through_spindle",
  "coolant.flood",
  "controller",
] as const;

// ── Manufacturer model ID normalization ──

function normalizeId(manufacturer: string, model: string): string {
  return `${manufacturer}_${model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

// ── Nested field access ──

function getField(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

// ── Persistence ──

const STATE_PATH = path.resolve("H:/prism/state/shared/MACHINE_HARDENING.json");

// ── Engine ──

class MachineDataHardeningEngine {
  /**
   * Load all machine profiles from the MachineProfileEngine.
   * Lazy-loaded to avoid circular imports.
   */
  private async _loadProfiles(): Promise<Record<string, Record<string, unknown>>> {
    const { machineProfileEngine } = await import("./MachineProfileEngine.js");
    const list = machineProfileEngine.list();
    const result: Record<string, Record<string, unknown>> = {};
    for (const m of list) {
      result[m.id] = m as unknown as Record<string, unknown>;
    }
    return result;
  }

  /**
   * Audit all machines for field completeness.
   * Returns per-machine and aggregate completeness scores.
   */
  async audit(machineId?: string): Promise<AuditReport> {
    const profiles = await this._loadProfiles();
    const ids = machineId ? [machineId] : Object.keys(profiles);

    const entries: MachineAuditEntry[] = [];
    const fieldCoverage: Record<string, { present: number; missing: number; suspect: number }> = {};

    for (const field of REQUIRED_FIELDS) {
      fieldCoverage[field] = { present: 0, missing: 0, suspect: 0 };
    }

    for (const id of ids) {
      const profile = profiles[id];
      if (!profile) continue;

      const fields: HardenField[] = [];
      let present = 0;
      let missing = 0;
      let suspect = 0;

      for (const field of REQUIRED_FIELDS) {
        const value = getField(profile, field);
        const isMissing = value === undefined || value === null || value === 0;
        const isSuspect = this._isSuspect(field, value, profile);

        if (isMissing) {
          fields.push({ field, status: "missing" });
          missing++;
          fieldCoverage[field].missing++;
        } else if (isSuspect) {
          fields.push({ field, status: "suspect", value, note: this._suspectReason(field, value, profile) });
          suspect++;
          fieldCoverage[field].suspect++;
        } else {
          fields.push({ field, status: "present", value });
          present++;
          fieldCoverage[field].present++;
        }
      }

      entries.push({
        machine_id: id,
        manufacturer: (profile.manufacturer as string) || "unknown",
        model: (profile.model as string) || "unknown",
        type: (profile.type as string) || "unknown",
        completeness_pct: Math.round((present / REQUIRED_FIELDS.length) * 100),
        fields,
        missing_count: missing,
        suspect_count: suspect,
      });
    }

    const avgCompleteness = entries.length > 0
      ? Math.round(entries.reduce((sum, e) => sum + e.completeness_pct, 0) / entries.length)
      : 0;

    const sorted = [...entries].sort((a, b) => a.completeness_pct - b.completeness_pct);
    const fieldCoveragePct: AuditReport["field_coverage"] = {};
    for (const [field, counts] of Object.entries(fieldCoverage)) {
      const total = counts.present + counts.missing + counts.suspect;
      fieldCoveragePct[field] = {
        ...counts,
        pct: total > 0 ? Math.round((counts.present / total) * 100) : 0,
      };
    }

    const warnings: string[] = [];
    if (avgCompleteness < 70) warnings.push(`Low avg completeness (${avgCompleteness}%) — run harden() to fill gaps`);
    const belowFifty = entries.filter((e) => e.completeness_pct < 50).length;
    if (belowFifty > 0) warnings.push(`${belowFifty} machine(s) below 50% completeness — critical data gaps`);
    for (const [field, stats] of Object.entries(fieldCoveragePct)) {
      if (stats.pct < 50) warnings.push(`Field '${field}' only ${stats.pct}% populated`);
    }

    return {
      timestamp: new Date().toISOString(),
      total_machines: entries.length,
      avg_completeness_pct: avgCompleteness,
      machines_above_90: entries.filter((e) => e.completeness_pct >= 90).length,
      machines_below_50: belowFifty,
      field_coverage: fieldCoveragePct,
      worst_machines: sorted.slice(0, 10),
      best_machines: sorted.slice(-5).reverse(),
      entries,
      warnings,
    };
  }

  /**
   * Harden: fill gaps using inference functions and catalog cross-references.
   * dry_run=true (default) just reports what would be filled.
   */
  async harden(machineId?: string, dryRun = true): Promise<HardenResult> {
    const profiles = await this._loadProfiles();
    const ids = machineId ? [machineId] : Object.keys(profiles);

    const fills: HardenResult["fills"] = [];

    for (const id of ids) {
      const profile = profiles[id];
      if (!profile) continue;

      const spindle = profile.spindle as Record<string, unknown> | undefined;
      const axes = profile.axes as Record<string, unknown> | undefined;
      const type = (profile.type as string) || "vmc";
      const manufacturer = (profile.manufacturer as string) || "";
      const taper = spindle?.taper as string | undefined;

      // Fill torque curve from MACHINE_TORQUE_CURVES if spindle data is missing
      const curveId = this._findTorqueCurveId(id, manufacturer, (profile.model as string) || "");
      const curve = curveId ? MACHINE_TORQUE_CURVES[curveId] : undefined;

      if (spindle) {
        // Fill max_rpm from torque curve
        if (!spindle.max_rpm && curve) {
          fills.push({ machine_id: id, field: "spindle.max_rpm", old_value: undefined, new_value: curve.max_rpm, source: `torque_curve:${curve.source}` });
          if (!dryRun) spindle.max_rpm = curve.max_rpm;
        }

        // Fill rated_power_kw from torque curve
        if (!spindle.rated_power_kw && curve) {
          fills.push({ machine_id: id, field: "spindle.rated_power_kw", old_value: undefined, new_value: curve.rated_power_kW, source: `torque_curve:${curve.source}` });
          if (!dryRun) spindle.rated_power_kw = curve.rated_power_kW;
        }

        // Fill max_torque_nm from torque curve
        if (!spindle.max_torque_nm && curve) {
          fills.push({ machine_id: id, field: "spindle.max_torque_nm", old_value: undefined, new_value: curve.peak_torque_Nm, source: `torque_curve:${curve.source}` });
          if (!dryRun) spindle.max_torque_nm = curve.peak_torque_Nm;
        }

        // Fill base_rpm from torque curve
        if (!spindle.base_rpm && curve) {
          fills.push({ machine_id: id, field: "spindle.base_rpm", old_value: undefined, new_value: curve.base_speed_rpm, source: `torque_curve:${curve.source}` });
          if (!dryRun) spindle.base_rpm = curve.base_speed_rpm;
        }

        // Infer torque curve if no curve match and we have power + rpm
        if (!curve && spindle.rated_power_kw && spindle.max_rpm) {
          const inferred = inferTorqueCurve(
            spindle.rated_power_kw as number,
            spindle.max_rpm as number,
            taper,
          );
          if (!spindle.max_torque_nm) {
            fills.push({ machine_id: id, field: "spindle.max_torque_nm", old_value: undefined, new_value: inferred.max_torque_Nm, source: "inferred:P=Tω" });
            if (!dryRun) spindle.max_torque_nm = inferred.max_torque_Nm;
          }
          if (!spindle.base_rpm) {
            fills.push({ machine_id: id, field: "spindle.base_rpm", old_value: undefined, new_value: inferred.base_rpm, source: "inferred:taper_ratio" });
            if (!dryRun) spindle.base_rpm = inferred.base_rpm;
          }
        }
      }

      // Fill max_part_weight_kg from table inference
      if (!profile.max_part_weight_kg) {
        const tableLength = axes?.x_mm as number | undefined;
        const tableWidth = axes?.y_mm as number | undefined;
        const inferred = inferTableLoad(type, tableLength, tableWidth, taper);
        if (inferred > 0) {
          fills.push({ machine_id: id, field: "max_part_weight_kg", old_value: undefined, new_value: inferred, source: "inferred:table_scaling" });
          if (!dryRun) profile.max_part_weight_kg = inferred;
        }
      }

      // Fill max_tool_diameter_mm and max_tool_length_mm from type defaults
      if (!profile.max_tool_diameter_mm) {
        const defaultDia = this._defaultToolDiameter(type, taper);
        if (defaultDia) {
          fills.push({ machine_id: id, field: "max_tool_diameter_mm", old_value: undefined, new_value: defaultDia, source: "default:taper_class" });
          if (!dryRun) profile.max_tool_diameter_mm = defaultDia;
        }
      }
      if (!profile.max_tool_length_mm) {
        const defaultLen = this._defaultToolLength(type, taper);
        if (defaultLen) {
          fills.push({ machine_id: id, field: "max_tool_length_mm", old_value: undefined, new_value: defaultLen, source: "default:taper_class" });
          if (!dryRun) profile.max_tool_length_mm = defaultLen;
        }
      }

      // Fill tool_changer_capacity from type defaults
      if (!profile.tool_changer_capacity) {
        const defaultCap = this._defaultToolChangerCapacity(type);
        if (defaultCap) {
          fills.push({ machine_id: id, field: "tool_changer_capacity", old_value: undefined, new_value: defaultCap, source: "default:machine_type" });
          if (!dryRun) profile.tool_changer_capacity = defaultCap;
        }
      }
    }

    const warnings: string[] = [];
    if (fills.length === 0) warnings.push("No gaps found — database is fully populated for checked machines");
    const inferredCount = fills.filter((f) => f.source.startsWith("inferred:")).length;
    if (inferredCount > 0) warnings.push(`${inferredCount} field(s) filled via physics inference — verify against manufacturer specs`);
    const defaultCount = fills.filter((f) => f.source.startsWith("default:")).length;
    if (defaultCount > 0) warnings.push(`${defaultCount} field(s) filled from class defaults — lower confidence than catalog data`);
    if (dryRun && fills.length > 0) warnings.push(`Dry run: ${fills.length} gap(s) identified but NOT applied — re-run with dryRun=false to apply`);

    const result: HardenResult = {
      timestamp: new Date().toISOString(),
      dry_run: dryRun,
      total_machines: ids.length,
      gaps_found: fills.length,
      gaps_filled: dryRun ? 0 : fills.length,
      fills,
      warnings,
    };

    // Persist result
    try {
      await fs.writeFile(STATE_PATH, JSON.stringify(result, null, 2));
    } catch { /* ignore persistence failures */ }

    return result;
  }

  /**
   * Validate machine data for physics consistency.
   * Checks: torque/power/RPM relationship, positive values, sane ranges.
   */
  async validate(machineId?: string): Promise<ValidationReport> {
    const profiles = await this._loadProfiles();
    const ids = machineId ? [machineId] : Object.keys(profiles);
    const issues: ValidationIssue[] = [];

    for (const id of ids) {
      const profile = profiles[id];
      if (!profile) continue;

      const spindle = profile.spindle as Record<string, unknown> | undefined;
      const axes = profile.axes as Record<string, unknown> | undefined;

      // ── Spindle P = T × ω consistency ──
      if (spindle?.rated_power_kw && spindle?.max_torque_nm && spindle?.base_rpm) {
        const P = spindle.rated_power_kw as number;
        const T = spindle.max_torque_nm as number;
        const rpm = spindle.base_rpm as number;
        const expectedP = (T * rpm * Math.PI) / 30000; // P = T × (2π × RPM / 60) / 1000
        const deviation = Math.abs(expectedP - P) / P;
        if (deviation > 0.20) {
          issues.push({
            machine_id: id,
            field: "spindle",
            severity: "error",
            message: `Power/torque/RPM inconsistency: P=${P}kW but T×ω gives ${expectedP.toFixed(1)}kW (${(deviation * 100).toFixed(0)}% off)`,
            expected: P,
            actual: expectedP,
          });
        } else if (deviation > 0.10) {
          issues.push({
            machine_id: id,
            field: "spindle",
            severity: "warning",
            message: `Power/torque/RPM marginal: P=${P}kW, T×ω=${expectedP.toFixed(1)}kW (${(deviation * 100).toFixed(0)}% off)`,
            expected: P,
            actual: expectedP,
          });
        }
      }

      // ── Max RPM sanity ──
      if (spindle?.max_rpm) {
        const maxRpm = spindle.max_rpm as number;
        const type = (profile.type as string) || "";
        if (maxRpm > 60000) {
          issues.push({ machine_id: id, field: "spindle.max_rpm", severity: "error", message: `Max RPM ${maxRpm} exceeds 60,000 — likely data error`, actual: maxRpm });
        } else if (type === "lathe" && maxRpm > 10000) {
          issues.push({ machine_id: id, field: "spindle.max_rpm", severity: "warning", message: `Lathe with ${maxRpm} RPM — verify (most lathes <6000)`, actual: maxRpm });
        }
      }

      // ── Axis travel positivity ──
      for (const axis of ["x_mm", "y_mm", "z_mm"]) {
        const val = axes?.[axis] as number | undefined;
        if (val !== undefined && val <= 0) {
          issues.push({ machine_id: id, field: `axes.${axis}`, severity: "error", message: `${axis} travel is ${val}mm — must be positive`, actual: val });
        }
      }

      // ── Rapid rate sanity ──
      if (profile.rapid_rate_mmmin) {
        const rapid = profile.rapid_rate_mmmin as number;
        if (rapid > 100000) {
          issues.push({ machine_id: id, field: "rapid_rate_mmmin", severity: "warning", message: `Rapid rate ${rapid} mm/min (${(rapid / 1000).toFixed(0)} m/min) — very high, verify`, actual: rapid });
        }
        if (rapid <= 0) {
          issues.push({ machine_id: id, field: "rapid_rate_mmmin", severity: "error", message: `Rapid rate is ${rapid} — must be positive`, actual: rapid });
        }
      }

      // ── Tool changer capacity sanity ──
      if (profile.tool_changer_capacity) {
        const cap = profile.tool_changer_capacity as number;
        if (cap > 500) {
          issues.push({ machine_id: id, field: "tool_changer_capacity", severity: "warning", message: `Tool changer capacity ${cap} — verify (most <120)`, actual: cap });
        }
      }

      // ── Torque curve consistency ──
      const curveId = this._findTorqueCurveId(id, (profile.manufacturer as string) || "", (profile.model as string) || "");
      const curve = curveId ? MACHINE_TORQUE_CURVES[curveId] : undefined;
      if (curve && spindle?.rated_power_kw) {
        const profileP = spindle.rated_power_kw as number;
        const curveP = curve.rated_power_kW;
        const pDev = Math.abs(curveP - profileP) / profileP;
        if (pDev > 0.25) {
          issues.push({
            machine_id: id,
            field: "spindle.rated_power_kw",
            severity: "warning",
            message: `Profile power ${profileP}kW vs torque curve ${curveP}kW (${(pDev * 100).toFixed(0)}% mismatch)`,
            expected: profileP,
            actual: curveP,
          });
        }
      }
    }

    const errorCount = issues.filter((i) => i.severity === "error").length;
    const warningCount = issues.filter((i) => i.severity === "warning").length;
    const machinesChecked = ids.filter((id) => profiles[id]).length;
    const machinesWithIssues = new Set(issues.map((i) => i.machine_id)).size;

    return {
      timestamp: new Date().toISOString(),
      total_machines: machinesChecked,
      machines_checked: machinesChecked,
      issues,
      error_count: errorCount,
      warning_count: warningCount,
      pass_rate_pct: machinesChecked > 0 ? Math.round(((machinesChecked - machinesWithIssues) / machinesChecked) * 100) : 100,
    };
  }

  /**
   * Scan a directory for STEP/STP/IGES machine model files and map to machine IDs.
   */
  async ingestModels(scanPath?: string): Promise<ModelIngestResult> {
    const dir = scanPath || "H:/prism/BOX";
    const extensions = new Set([".step", ".stp", ".iges", ".igs"]);
    const mappings: ModelIngestResult["mappings"] = [];

    try {
      const entries = await this._walkForModels(dir, extensions, 5);
      const profiles = await this._loadProfiles();
      const profileIds = Object.keys(profiles);
      const profileModels = Object.values(profiles).map((p) => ({
        id: p.id as string,
        manufacturer: ((p.manufacturer as string) || "").toLowerCase(),
        model: ((p.model as string) || "").toLowerCase(),
      }));

      for (const file of entries) {
        const basename = path.basename(file, path.extname(file)).toLowerCase();
        // Try direct match
        let match: { id: string; confidence: number } | null = null;

        // Exact ID match
        if (profileIds.includes(basename)) {
          match = { id: basename, confidence: 0.95 };
        }

        // Fuzzy manufacturer+model match
        if (!match) {
          for (const pm of profileModels) {
            if (basename.includes(pm.manufacturer) && basename.includes(pm.model.replace(/[^a-z0-9]/g, ""))) {
              match = { id: pm.id, confidence: 0.80 };
              break;
            }
          }
        }

        // Partial model match
        if (!match) {
          for (const pm of profileModels) {
            const modelClean = pm.model.replace(/[^a-z0-9]/g, "");
            if (modelClean.length >= 3 && basename.includes(modelClean)) {
              match = { id: pm.id, confidence: 0.60 };
              break;
            }
          }
        }

        mappings.push({
          file,
          machine_id: match?.id || null,
          confidence: match?.confidence || 0,
        });
      }

      return {
        timestamp: new Date().toISOString(),
        scan_path: dir,
        files_found: entries.length,
        files_mapped: mappings.filter((m) => m.machine_id).length,
        files_unmapped: mappings.filter((m) => !m.machine_id).length,
        mappings,
      };
    } catch {
      return {
        timestamp: new Date().toISOString(),
        scan_path: dir,
        files_found: 0,
        files_mapped: 0,
        files_unmapped: 0,
        mappings: [],
      };
    }
  }

  /**
   * Generate markdown summary of an audit report.
   */
  summary(report: AuditReport): string {
    const lines: string[] = [
      "# Machine Data Hardening Report",
      "",
      `**Generated:** ${report.timestamp}`,
      `**Machines:** ${report.total_machines}`,
      `**Avg Completeness:** ${report.avg_completeness_pct}%`,
      `**Above 90%:** ${report.machines_above_90} | **Below 50%:** ${report.machines_below_50}`,
      "",
      "## Field Coverage",
      "| Field | Present | Missing | Suspect | Coverage |",
      "|-------|---------|---------|---------|----------|",
    ];

    for (const [field, stats] of Object.entries(report.field_coverage)) {
      lines.push(`| ${field} | ${stats.present} | ${stats.missing} | ${stats.suspect} | ${stats.pct}% |`);
    }

    if (report.worst_machines.length > 0) {
      lines.push("", "## Worst Machines (Lowest Completeness)");
      lines.push("| Machine | Manufacturer | Model | Completeness | Missing |");
      lines.push("|---------|-------------|-------|-------------|---------|");
      for (const m of report.worst_machines) {
        lines.push(`| ${m.machine_id} | ${m.manufacturer} | ${m.model} | ${m.completeness_pct}% | ${m.missing_count} |`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Read persisted hardening result.
   */
  async read(): Promise<HardenResult | null> {
    try {
      const data = await fs.readFile(STATE_PATH, "utf-8");
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  // ── Private helpers ──

  private _findTorqueCurveId(profileId: string, manufacturer: string, model: string): string | undefined {
    // Direct ID match
    if (MACHINE_TORQUE_CURVES[profileId]) return profileId;

    // Normalized match
    const normalized = normalizeId(manufacturer, model);
    if (MACHINE_TORQUE_CURVES[normalized]) return normalized;

    // Fuzzy match on brand+model
    const mfr = manufacturer.toLowerCase();
    const mdl = model.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const key of Object.keys(MACHINE_TORQUE_CURVES)) {
      const curve = MACHINE_TORQUE_CURVES[key];
      if (curve.brand.toLowerCase() === mfr && curve.model.toLowerCase().replace(/[^a-z0-9]/g, "") === mdl) {
        return key;
      }
    }

    return undefined;
  }

  private _isSuspect(field: string, value: unknown, profile: Record<string, unknown>): boolean {
    if (value === undefined || value === null) return false;

    if (field === "spindle.max_rpm" && typeof value === "number") {
      return value > 60000 || value < 100;
    }
    if (field === "spindle.rated_power_kw" && typeof value === "number") {
      return value > 200 || value < 0.5;
    }
    if (field === "spindle.max_torque_nm" && typeof value === "number") {
      return value > 5000 || value < 1;
    }
    if (field === "rapid_rate_mmmin" && typeof value === "number") {
      return value > 100000 || value < 100;
    }
    if (field === "tool_changer_capacity" && typeof value === "number") {
      return value > 500 || value < 1;
    }
    if (field === "max_part_weight_kg" && typeof value === "number") {
      return value > 50000 || value < 1;
    }

    return false;
  }

  private _suspectReason(field: string, value: unknown, _profile: Record<string, unknown>): string {
    if (typeof value !== "number") return "non-numeric";
    if (field === "spindle.max_rpm" && value > 60000) return "exceeds 60,000 RPM";
    if (field === "spindle.max_rpm" && value < 100) return "below 100 RPM";
    if (field === "spindle.rated_power_kw" && value > 200) return "exceeds 200 kW";
    if (field === "rapid_rate_mmmin" && value > 100000) return "exceeds 100 m/min";
    return "out of expected range";
  }

  private _defaultToolDiameter(type: string, taper?: string): number | undefined {
    // Max tool diameter depends on taper and machine type
    const taperDiameters: Record<string, number> = {
      "BT30": 60, "CAT30": 60, "HSK-E32": 50, "HSK-E40": 63,
      "BT40": 89, "CAT40": 89, "HSK-A63": 80, "HSK-F63": 80,
      "BT50": 127, "CAT50": 127, "HSK-A100": 125, "HSK-A80": 100,
    };
    if (taper && taperDiameters[taper]) return taperDiameters[taper];
    if (type === "lathe") return 50; // boring bar diameter
    return undefined;
  }

  private _defaultToolLength(type: string, taper?: string): number | undefined {
    const taperLengths: Record<string, number> = {
      "BT30": 150, "CAT30": 150, "HSK-E32": 120, "HSK-E40": 150,
      "BT40": 254, "CAT40": 254, "HSK-A63": 300, "HSK-F63": 300,
      "BT50": 400, "CAT50": 400, "HSK-A100": 450, "HSK-A80": 350,
    };
    if (taper && taperLengths[taper]) return taperLengths[taper];
    if (type === "lathe") return 200;
    return undefined;
  }

  private _defaultToolChangerCapacity(type: string): number | undefined {
    const defaults: Record<string, number> = {
      vmc: 20, hmc: 40, "5axis": 30, mill_turn: 24, router: 12,
      grinder: 0, swiss: 0, lathe: 12, edm_wire: 0, edm_sinker: 0,
    };
    return defaults[type];
  }

  private async _walkForModels(dir: string, extensions: Set<string>, maxDepth: number, depth = 0): Promise<string[]> {
    if (depth > maxDepth) return [];
    const results: string[] = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
          results.push(...(await this._walkForModels(fullPath, extensions, maxDepth, depth + 1)));
        } else if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) {
          results.push(fullPath);
        }
      }
    } catch { /* ignore inaccessible directories */ }
    return results;
  }
}

export const machineDataHardeningEngine = new MachineDataHardeningEngine();
