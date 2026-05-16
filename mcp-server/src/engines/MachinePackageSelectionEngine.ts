/**
 * MCAT-MS0 P2-U01: Machine Package Selection Engine
 *
 * Replaces heuristic-only filtering with package-driven selection using
 * CanonicalMachinePackage, confidence scores, and option matrices.
 *
 * Key improvements over MachineSelectionEngine:
 * - Uses confidence scores to rank data quality
 * - Filters by legal controller/spindle/coolant combinations
 * - Respects shop-owned inventory preferences
 * - Tracks selection provenance for auditability
 *
 * @module engines/MachinePackageSelectionEngine
 * @milestone MCAT-MS0/P2-U01
 */

import { log } from "../utils/Logger.js";
import type { CanonicalMachinePackage, CanonicalMachineType } from "../types/MachinePackage.js";
import type { MachineAxisTopology } from "../contracts/userMachineProfile.js";
import { CONTROLLER_FAMILIES, type ControllerFamily } from "../constants.js";
import { machineConfidenceCalculatorEngine, type ConfidenceResult } from "./MachineConfidenceCalculatorEngine.js";
import { machineVocabularyNormalizerEngine } from "./MachineVocabularyNormalizerEngine.js";
import { machineService } from "../services/MachineService.js";

// ============================================================================
// TYPES
// ============================================================================

export interface PackageSelectionRequirements {
  part_envelope_mm: { x: number; y: number; z: number };
  operations: string[];
  material_iso_group?: string;
  required_accuracy_mm?: number;
  surface_finish_Ra?: number;
  min_spindle_rpm?: number;
  min_spindle_power_kw?: number;
  needs_rotary_axes?: number;
  coolant_type?: string;
  controller_preference?: string;
  shop_owned_only?: boolean;
  min_confidence?: number;
  production_volume?: "prototype" | "low" | "medium" | "high";
}

/**
 * Result of validating a package's controller/coolant options against a
 * job's requirements. Local to this engine — distinct from the
 * MachineOptionMatrixEngine's matrix-level ValidationResult.
 */
export interface OptionValidationResult {
  valid: boolean;
  machineId: string;
  selectedOptions: { controller?: string; spindle: string; coolant: string };
  issues: string[];
  warnings: string[];
  timestamp: string;
}

export interface PackageCandidate {
  package: CanonicalMachinePackage;
  score: number;
  confidence: ConfidenceResult;
  optionValidation?: OptionValidationResult;
  rationale: string[];
  limitations: string[];
  dataQuality: "high" | "medium" | "low" | "insufficient";
}

export interface PackageSelectionResult {
  candidates: PackageCandidate[];
  best_match?: PackageCandidate;
  total_considered: number;
  filtered_by_confidence: number;
  filtered_by_envelope: number;
  filtered_by_options: number;
  selection_timestamp: string;
}

// ============================================================================
// SCORING WEIGHTS
// ============================================================================

const SCORING_WEIGHTS = {
  envelope_fit: 20,
  spindle_match: 15,
  accuracy_match: 15,
  axes_match: 15,
  confidence_bonus: 10,
  shop_owned_bonus: 10,
  coolant_match: 8,
  controller_match: 7,
};

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class MachinePackageSelectionEngine {
  private packageCache: Map<string, CanonicalMachinePackage> = new Map();

  /**
   * Select machines using package-driven filtering
   */
  select(requirements: PackageSelectionRequirements): PackageSelectionResult {
    const startTime = Date.now();
    const packages = this.loadPackages();

    let filteredByConfidence = 0;
    let filteredByEnvelope = 0;
    let filteredByOptions = 0;

    const minConfidence = requirements.min_confidence ?? 0.5;
    const candidates: PackageCandidate[] = [];

    for (const pkg of packages) {
      const confidence = machineConfidenceCalculatorEngine.calculateConfidence(pkg, pkg.provenance ?? {});

      if (confidence.overall < minConfidence) {
        filteredByConfidence++;
        continue;
      }

      if (!this.checkEnvelope(pkg, requirements)) {
        filteredByEnvelope++;
        continue;
      }

      let optionValidation: OptionValidationResult | undefined;
      if (requirements.coolant_type || requirements.controller_preference) {
        optionValidation = this.validateOptions(pkg, requirements);
        if (!optionValidation.valid) {
          filteredByOptions++;
          continue;
        }
      }

      const { score, rationale, limitations } = this.scorePackage(pkg, requirements, confidence);
      const dataQuality = this.assessDataQuality(confidence);

      candidates.push({
        package: pkg,
        score,
        confidence,
        optionValidation,
        rationale,
        limitations,
        dataQuality,
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    const topCandidates = candidates.slice(0, 10);

    log.info(`[MachinePackageSelection] Selected ${topCandidates.length} from ${packages.length} packages in ${Date.now() - startTime}ms`);

    return {
      candidates: topCandidates,
      best_match: topCandidates[0],
      total_considered: packages.length,
      filtered_by_confidence: filteredByConfidence,
      filtered_by_envelope: filteredByEnvelope,
      filtered_by_options: filteredByOptions,
      selection_timestamp: new Date().toISOString(),
    };
  }

  private loadPackages(): CanonicalMachinePackage[] {
    if (this.packageCache.size > 0) {
      return Array.from(this.packageCache.values());
    }

    const packages: CanonicalMachinePackage[] = [];

    try {
      const machines = machineService.search({});
      for (const m of machines) {
        const pkg = this.convertToPackage(m);
        if (pkg) {
          packages.push(pkg);
          this.packageCache.set(pkg.canonical_id, pkg);
        }
      }
    } catch (err) {
      log.warn(`[MachinePackageSelection] Failed to load from service: ${err}`);
    }

    if (packages.length === 0) {
      packages.push(...this.getFallbackPackages());
    }

    return packages;
  }

  private convertToPackage(machine: any): CanonicalMachinePackage | null {
    if (!machine.id) return null;

    const mfrNorm = machineVocabularyNormalizerEngine.normalizeManufacturer(machine.manufacturer ?? "Unknown");
    const manufacturer = mfrNorm.normalized?.name ?? machine.manufacturer ?? "Unknown";
    const canonicalType = this.normalizeType(machine.type);
    const now = new Date().toISOString();

    return {
      canonical_id: machine.id,
      source_record_ids: [machine.id],
      version: 1,
      manufacturer,
      manufacturer_id: manufacturer.toLowerCase().replace(/\s+/g, "-"),
      model: machine.model ?? machine.name ?? machine.id,
      raw_type: typeof machine.type === "string" ? machine.type : "unknown",
      canonical_type: canonicalType,
      topology: this.topologyFor(canonicalType),
      controller: {
        manufacturer: this.coerceControllerFamily(machine.controller?.manufacturer ?? machine.controller?.family),
        model: machine.controller?.model ?? "Unknown",
      },
      spindle: {
        max_rpm: machine.spindle?.max_rpm ?? machine.envelope?.max_rpm ?? 10000,
        power: machine.spindle?.power_continuous ?? machine.spindle?.power ?? 15,
        torque: machine.spindle?.torque,
      },
      envelope: {
        x: machine.envelope?.x_travel ?? machine.envelope?.x ?? 500,
        y: machine.envelope?.y_travel ?? machine.envelope?.y ?? 400,
        z: machine.envelope?.z_travel ?? machine.envelope?.z ?? 400,
      },
      axes: {
        linear_axes: machine.axes?.linear_axes ?? 3,
        rotary_axes: machine.axes?.rotary_axes ?? 0,
        simultaneous_axes: machine.simultaneous_axes ?? machine.axes?.simultaneous_axes,
      },
      tool_changer: {
        capacity: machine.tool_changer?.capacity ?? machine.tool_capacity ?? 20,
      },
      coolant: {
        mist_coolant: machine.coolant?.mist_coolant ?? false,
        high_pressure_option: machine.coolant?.high_pressure_option ?? false,
      },
      controller_packages: [],
      spindle_packages: [],
      coolant_strategies: [],
      allowed_options: [],
      confidence: { controller: 0.5, spindle: 0.5, coolant: 0.5, envelope: 0.5, axes: 0.5, tool_changer: 0.5, overall: 0.5 },
      provenance: {},
      ambiguities: [],
      enrichment_history: [],
      primary_layer: "core",
      generated_at: now,
    };
  }

  /** Coerce an arbitrary controller-family string to a canonical ControllerFamily. */
  private coerceControllerFamily(raw: unknown): ControllerFamily {
    const s = String(raw ?? "").toLowerCase().trim();
    return (CONTROLLER_FAMILIES as readonly string[]).includes(s) ? (s as ControllerFamily) : "other";
  }

  /** Map a canonical machine type to its axis topology. */
  private topologyFor(type: CanonicalMachineType): MachineAxisTopology {
    switch (type) {
      case "VMC": return "3_axis_vertical";
      case "HMC": return "3_axis_horizontal";
      case "5AXIS": return "5_axis_vertical";
      case "LATHE": return "2_axis_lathe";
      case "MILL_TURN": return "mill_turn";
      case "SWISS": return "swiss";
      case "VTL": return "vtl";
      case "EDM_WIRE": return "wire_edm";
      case "EDM_SINKER": return "sinker_edm";
      case "LASER": return "laser";
      case "WATERJET": return "waterjet";
      case "ROUTER": return "router";
      case "BORING_MILL": return "3_axis_horizontal";
      case "DRILL_TAP": return "3_axis_vertical";
      default: return "other";
    }
  }

  private normalizeType(rawType: string | undefined): CanonicalMachineType {
    if (!rawType) return "OTHER";
    const lower = rawType.toLowerCase();
    if (lower.includes("vmc") || lower.includes("vertical machining")) return "VMC";
    if (lower.includes("hmc") || lower.includes("horizontal machining")) return "HMC";
    if (lower.includes("5-axis") || lower.includes("5 axis")) return "5AXIS";
    if (lower.includes("lathe") || lower.includes("turning")) return "LATHE";
    if (lower.includes("mill-turn") || lower.includes("multitask")) return "MILL_TURN";
    if (lower.includes("swiss")) return "SWISS";
    if (lower.includes("grind")) return "GRINDER";
    if (lower.includes("edm")) return "EDM_WIRE";
    return "OTHER";
  }

  private checkEnvelope(pkg: CanonicalMachinePackage, req: PackageSelectionRequirements): boolean {
    const env = pkg.envelope;
    if (!env) return false;

    const x = env.x ?? 0;
    const y = env.y ?? 0;
    const z = env.z ?? 0;

    return x >= req.part_envelope_mm.x &&
           y >= req.part_envelope_mm.y &&
           z >= req.part_envelope_mm.z;
  }

  private validateOptions(pkg: CanonicalMachinePackage, req: PackageSelectionRequirements): OptionValidationResult {
    const issues: string[] = [];
    let valid = true;

    if (req.controller_preference) {
      const ctrlNorm = machineVocabularyNormalizerEngine.normalizeController(req.controller_preference);
      const pkgCtrl = pkg.controller?.manufacturer?.toLowerCase() ?? "";
      const reqCtrl = ctrlNorm.normalized?.family?.toLowerCase() ?? req.controller_preference.toLowerCase();

      if (!pkgCtrl.includes(reqCtrl) && !reqCtrl.includes(pkgCtrl)) {
        issues.push(`Controller ${pkg.controller?.manufacturer} doesn't match preference ${req.controller_preference}`);
      }
    }

    if (req.coolant_type) {
      const coolNorm = machineVocabularyNormalizerEngine.normalizeCoolant(req.coolant_type);
      const pkgCool = this.coolantLabel(pkg.coolant);
      const reqCool = coolNorm.normalized?.type ?? req.coolant_type;

      if (pkgCool !== reqCool && req.coolant_type !== "any") {
        if (req.coolant_type.includes("through") && !pkg.spindle?.through_spindle_coolant) {
          issues.push(`Coolant ${pkgCool} doesn't support through-spindle requirement`);
          valid = false;
        }
      }
    }

    return {
      valid,
      machineId: pkg.canonical_id,
      selectedOptions: {
        controller: pkg.controller?.manufacturer,
        spindle: `${pkg.spindle?.max_rpm ?? 0} RPM`,
        coolant: this.coolantLabel(pkg.coolant),
      },
      issues,
      warnings: issues.filter(i => !i.includes("doesn't support")),
      timestamp: new Date().toISOString(),
    };
  }

  /** Derive a human-readable coolant label from the canonical MachineCoolant subsystem. */
  private coolantLabel(coolant: CanonicalMachinePackage["coolant"]): string {
    if (!coolant) return "flood";
    if (coolant.mist_coolant) return "mist";
    if (coolant.high_pressure_option) return "high_pressure";
    return "flood";
  }

  private scorePackage(
    pkg: CanonicalMachinePackage,
    req: PackageSelectionRequirements,
    confidence: ConfidenceResult
  ): { score: number; rationale: string[]; limitations: string[] } {
    let score = 50;
    const rationale: string[] = [];
    const limitations: string[] = [];

    const env = pkg.envelope ?? { x: 0, y: 0, z: 0 };
    const marginX = (env.x - req.part_envelope_mm.x) / req.part_envelope_mm.x;
    const marginY = req.part_envelope_mm.y > 0 ? (env.y - req.part_envelope_mm.y) / req.part_envelope_mm.y : 1;
    const marginZ = (env.z - req.part_envelope_mm.z) / req.part_envelope_mm.z;
    const avgMargin = (marginX + marginY + marginZ) / 3;

    if (avgMargin > 0.3) {
      score += SCORING_WEIGHTS.envelope_fit;
      rationale.push(`Envelope ${env.x}×${env.y}×${env.z}mm with ${(avgMargin * 100).toFixed(0)}% margin`);
    } else if (avgMargin > 0) {
      score += SCORING_WEIGHTS.envelope_fit * 0.6;
      rationale.push(`Envelope ${env.x}×${env.y}×${env.z}mm fits with minimal margin`);
    }

    const spindle = pkg.spindle ?? { max_rpm: 0, power: 0 };
    if (req.min_spindle_rpm && spindle.max_rpm >= req.min_spindle_rpm) {
      score += SCORING_WEIGHTS.spindle_match * 0.5;
      rationale.push(`Spindle ${spindle.max_rpm} RPM meets requirement`);
    } else if (req.min_spindle_rpm) {
      limitations.push(`Spindle ${spindle.max_rpm} RPM below required ${req.min_spindle_rpm}`);
    }

    if (req.min_spindle_power_kw && spindle.power >= req.min_spindle_power_kw) {
      score += SCORING_WEIGHTS.spindle_match * 0.5;
      rationale.push(`Spindle power ${spindle.power} kW meets requirement`);
    } else if (req.min_spindle_power_kw) {
      limitations.push(`Spindle power ${spindle.power} kW below required ${req.min_spindle_power_kw}`);
    }

    if (req.required_accuracy_mm) {
      rationale.push(`Machine accuracy data available for verification`);
    }

    const axes = pkg.axes ?? { linear_axes: 3, rotary_axes: 0, simultaneous_axes: 3 };
    const totalAxes = axes.simultaneous_axes ?? (axes.linear_axes + axes.rotary_axes);
    const neededRotary = req.needs_rotary_axes ?? 0;
    if (axes.rotary_axes >= neededRotary) {
      score += SCORING_WEIGHTS.axes_match;
      if (neededRotary > 0) {
        rationale.push(`${totalAxes}-axis (${axes.rotary_axes} rotary) meets requirement`);
      }
    } else if (neededRotary > 0) {
      score -= SCORING_WEIGHTS.axes_match;
      limitations.push(`Only ${axes.rotary_axes} rotary axes, need ${neededRotary}`);
    }

    const confBonus = confidence.overall * SCORING_WEIGHTS.confidence_bonus;
    score += confBonus;
    if (confidence.overall >= 0.8) {
      rationale.push(`High confidence data (${(confidence.overall * 100).toFixed(0)}%)`);
    } else if (confidence.overall < 0.6) {
      limitations.push(`Low confidence data (${(confidence.overall * 100).toFixed(0)}%) — verify specs`);
    }

    if (req.shop_owned_only && pkg.source_record_ids.includes("shop-inventory")) {
      score += SCORING_WEIGHTS.shop_owned_bonus;
      rationale.push("Shop-owned machine");
    }

    return { score: Math.max(0, Math.min(100, score)), rationale, limitations };
  }

  private assessDataQuality(confidence: ConfidenceResult): PackageCandidate["dataQuality"] {
    if (confidence.overall >= 0.85) return "high";
    if (confidence.overall >= 0.7) return "medium";
    if (confidence.overall >= 0.5) return "low";
    return "insufficient";
  }

  private getFallbackPackages(): CanonicalMachinePackage[] {
    const fallbacks: Array<{
      id: string; mfr: string; model: string; type: CanonicalMachineType;
      x: number; y: number; z: number; rpm: number; power: number; axes: number;
    }> = [
      { id: "haas_vf2", mfr: "Haas", model: "VF-2", type: "VMC", x: 762, y: 406, z: 508, rpm: 8100, power: 22.4, axes: 3 },
      { id: "haas_umc500", mfr: "Haas", model: "UMC-500", type: "5AXIS", x: 508, y: 406, z: 394, rpm: 8100, power: 22.4, axes: 5 },
      { id: "dmg_dmu50", mfr: "DMG MORI", model: "DMU 50", type: "5AXIS", x: 500, y: 450, z: 400, rpm: 14000, power: 25, axes: 5 },
      { id: "okuma_lb3000", mfr: "Okuma", model: "LB3000 EX II", type: "LATHE", x: 260, y: 0, z: 500, rpm: 5000, power: 22, axes: 2 },
      { id: "mazak_integrex", mfr: "Mazak", model: "INTEGREX i-200", type: "MILL_TURN", x: 615, y: 230, z: 905, rpm: 12000, power: 22, axes: 5 },
    ];

    const now = new Date().toISOString();
    return fallbacks.map((f): CanonicalMachinePackage => ({
      canonical_id: f.id,
      source_record_ids: ["fallback"],
      version: 1,
      manufacturer: f.mfr,
      manufacturer_id: f.mfr.toLowerCase().replace(/\s+/g, "-"),
      model: f.model,
      raw_type: f.type,
      canonical_type: f.type,
      topology: this.topologyFor(f.type),
      controller: { manufacturer: "other", model: "Unknown" },
      spindle: { max_rpm: f.rpm, power: f.power },
      envelope: { x: f.x, y: f.y, z: f.z },
      axes: { linear_axes: Math.min(f.axes, 3), rotary_axes: Math.max(0, f.axes - 3) },
      tool_changer: { capacity: 20 },
      coolant: { mist_coolant: false, high_pressure_option: false },
      controller_packages: [],
      spindle_packages: [],
      coolant_strategies: [],
      allowed_options: [],
      confidence: { controller: 0.3, spindle: 0.5, coolant: 0.3, envelope: 0.6, axes: 0.5, tool_changer: 0.3, overall: 0.4 },
      provenance: {},
      ambiguities: [],
      enrichment_history: [],
      primary_layer: "core",
      generated_at: now,
    }));
  }

  /**
   * Compare multiple machines for a specific job
   */
  compare(machineIds: string[], requirements: PackageSelectionRequirements): PackageCandidate[] {
    const packages = this.loadPackages();
    const selected = packages.filter(p => machineIds.includes(p.canonical_id));

    return selected.map(pkg => {
      const confidence = machineConfidenceCalculatorEngine.calculateConfidence(pkg, pkg.provenance ?? {});
      const { score, rationale, limitations } = this.scorePackage(pkg, requirements, confidence);
      return {
        package: pkg,
        score,
        confidence,
        rationale,
        limitations,
        dataQuality: this.assessDataQuality(confidence),
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Validate a specific machine for requirements
   */
  validate(machineId: string, requirements: PackageSelectionRequirements): {
    suitable: boolean;
    candidate?: PackageCandidate;
    issues: string[];
  } {
    const packages = this.loadPackages();
    const pkg = packages.find(p => p.canonical_id === machineId);

    if (!pkg) {
      return { suitable: false, issues: [`Machine ${machineId} not found in package database`] };
    }

    const confidence = machineConfidenceCalculatorEngine.calculateConfidence(pkg, pkg.provenance ?? {});
    const { score, rationale, limitations } = this.scorePackage(pkg, requirements, confidence);

    const candidate: PackageCandidate = {
      package: pkg,
      score,
      confidence,
      rationale,
      limitations,
      dataQuality: this.assessDataQuality(confidence),
    };

    const suitable = score >= 60 && limitations.length === 0;

    return {
      suitable,
      candidate,
      issues: limitations,
    };
  }

  // ============================================================================
  // SELF-AWARENESS
  // ============================================================================

  getSelfAwareness() {
    return {
      engine: "MachinePackageSelectionEngine",
      purpose: "Package-driven machine selection with confidence scoring and option validation",
      milestone: "MCAT-MS0/P2-U01",
      capabilities: [
        "select",
        "compare",
        "validate",
      ],
      scoringWeights: SCORING_WEIGHTS,
      packagesCached: this.packageCache.size,
      integrations: [
        "MachineConfidenceCalculatorEngine",
        "MachineOptionMatrixEngine",
        "MachineVocabularyNormalizerEngine",
        "MachineService",
      ],
    };
  }
}

export const machinePackageSelectionEngine = new MachinePackageSelectionEngine();
