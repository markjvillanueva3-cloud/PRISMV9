/**
 * TurningInspectionPlanEngine
 * =============================
 *
 * Generates a first-article + production inspection plan for a turned
 * part given its feature list and GD&T callouts.
 *
 * For each feature, the engine decides:
 *   - Measurement method (micrometer / bore gauge / CMM / optical / probe)
 *   - Frequency (100% / AQL sample / SPC subgroup / skip-lot)
 *   - Sample size based on lot size + tolerance class + criticality
 *   - Number of probe points for cylindricity / roundness (per ISO 12181)
 *
 * Outputs an inspection plan JSON with:
 *   - Plan header (part id, lot size, inspector, date)
 *   - Feature-level inspection records
 *   - Summary: total inspection time, equipment list, pass criteria
 *
 * Canonical references:
 *   - ISO 1101 (geometric tolerances)
 *   - ISO 12181 (roundness measurement)
 *   - ANSI/ASQ Z1.4 (AQL sampling tables)
 *   - AS9102 (first article inspection for aerospace)
 *
 * @module engines/TurningInspectionPlanEngine
 * @milestone LATHE-PRO-MS6
 */

export type FeatureKind =
  | "od"
  | "bore"
  | "face"
  | "thread"
  | "groove"
  | "chamfer"
  | "radius"
  | "taper";

export type ToleranceClass = "loose" | "standard" | "tight" | "precision" | "ultra_precision";

export type Criticality = "cosmetic" | "functional" | "critical" | "safety_critical";

export interface InspFeature {
  id: string;
  kind: FeatureKind;
  nominal_mm: number;
  tolerance_mm: number;
  ra_target_um?: number;
  /** Criticality escalates inspection frequency */
  criticality?: Criticality;
  /** Adds form requirements (roundness/cylindricity) */
  requires_form_tolerance?: boolean;
  form_tolerance_mm?: number;
}

export interface InspPlanInput {
  part_id: string;
  lot_size: number;
  features: InspFeature[];
  /** Customer / spec: "commercial" | "automotive" | "aerospace" | "medical" */
  regulatory_regime?: "commercial" | "automotive" | "aerospace" | "medical";
  /** Existing shop CMM available? */
  cmm_available?: boolean;
  /** On-machine probe available? */
  probe_available?: boolean;
}

export type InspMethod =
  | "micrometer"
  | "bore_gauge"
  | "id_mic"
  | "thread_gauge"
  | "cmm"
  | "on_machine_probe"
  | "height_gauge"
  | "optical_comparator"
  | "surface_roughness_tester";

export type InspFrequency =
  | "every_part"
  | "first_last_5"
  | "aql_normal"
  | "aql_tight"
  | "spc_subgroup"
  | "first_article_only";

export interface InspFeatureRecord {
  feature_id: string;
  kind: FeatureKind;
  method: InspMethod;
  frequency: InspFrequency;
  sample_size: number;
  probe_points?: number;
  expected_seconds_per_part: number;
  acceptance_criteria: string;
  equipment_required: string[];
}

export interface InspPlanResult {
  part_id: string;
  lot_size: number;
  regulatory_regime: string;
  feature_records: InspFeatureRecord[];
  total_inspection_time_sec: number;
  total_inspection_time_per_lot_sec: number;
  equipment_list: string[];
  first_article_required: boolean;
  notes: string[];
}

function toleranceClass(tol_mm: number): ToleranceClass {
  if (tol_mm < 0.005) return "ultra_precision";
  if (tol_mm < 0.01) return "precision";
  if (tol_mm < 0.025) return "tight";
  if (tol_mm < 0.1) return "standard";
  return "loose";
}

function aqlSampleSize(lot: number, level: "normal" | "tight"): number {
  // Simplified ANSI/ASQ Z1.4 general-inspection Level II (AQL 0.65).
  // Approximation; real tables are stepwise.
  if (lot <= 15) return Math.min(lot, 3);
  if (lot <= 50) return level === "tight" ? 13 : 8;
  if (lot <= 150) return level === "tight" ? 20 : 13;
  if (lot <= 500) return level === "tight" ? 32 : 20;
  if (lot <= 1200) return level === "tight" ? 50 : 32;
  if (lot <= 3200) return level === "tight" ? 80 : 50;
  return level === "tight" ? 125 : 80;
}

function needsCmmFor(feature: InspFeature): boolean {
  const cls = toleranceClass(feature.tolerance_mm);
  return cls === "ultra_precision" || cls === "precision" || !!feature.requires_form_tolerance;
}

function methodFor(feature: InspFeature, cmm: boolean, probe: boolean): { method: InspMethod; probePoints?: number } {
  const cls = toleranceClass(feature.tolerance_mm);
  const needsCmm = needsCmmFor(feature);
  switch (feature.kind) {
    case "od":
      if (needsCmm && cmm) return { method: "cmm", probePoints: feature.requires_form_tolerance ? 12 : 4 };
      if (probe && cls !== "loose") return { method: "on_machine_probe", probePoints: 4 };
      return { method: "micrometer" };
    case "bore":
      if (needsCmm && cmm) return { method: "cmm", probePoints: feature.requires_form_tolerance ? 12 : 6 };
      if (probe && cls !== "loose") return { method: "on_machine_probe", probePoints: 4 };
      if (feature.nominal_mm < 10) return { method: "bore_gauge" };
      return { method: "id_mic" };
    case "face":
      if (needsCmm && cmm) return { method: "cmm", probePoints: 4 };
      return { method: "height_gauge" };
    case "thread":
      return { method: "thread_gauge" };
    case "groove":
    case "chamfer":
    case "radius":
      return { method: "optical_comparator" };
    case "taper":
      if (cmm) return { method: "cmm", probePoints: 6 };
      return { method: "micrometer" };
    default:
      return { method: "micrometer" };
  }
}

function frequencyFor(
  feature: InspFeature,
  lot: number,
  regime: string
): { freq: InspFrequency; n: number } {
  const cls = toleranceClass(feature.tolerance_mm);
  const crit = feature.criticality ?? "functional";

  if (crit === "safety_critical" || regime === "aerospace" || regime === "medical") {
    if (cls === "ultra_precision" || cls === "precision") {
      return { freq: "every_part", n: lot };
    }
    return { freq: "aql_tight", n: aqlSampleSize(lot, "tight") };
  }
  if (crit === "critical") {
    if (lot <= 20) return { freq: "every_part", n: lot };
    return { freq: "spc_subgroup", n: 5 };
  }
  if (crit === "cosmetic") {
    return { freq: "first_article_only", n: 1 };
  }
  if (lot < 10) return { freq: "first_last_5", n: Math.min(lot, 5) };
  return { freq: "aql_normal", n: aqlSampleSize(lot, "normal") };
}

function timePerPart(method: InspMethod, probePts?: number): number {
  switch (method) {
    case "micrometer":
    case "id_mic":
    case "bore_gauge":
      return 12;
    case "thread_gauge":
      return 20;
    case "cmm":
      return 10 + (probePts ?? 4) * 4;
    case "on_machine_probe":
      return 6 + (probePts ?? 4) * 2;
    case "height_gauge":
      return 8;
    case "optical_comparator":
      return 30;
    case "surface_roughness_tester":
      return 45;
  }
}

function equipmentFor(method: InspMethod): string {
  switch (method) {
    case "micrometer":
      return "Outside micrometer (0.001mm resolution)";
    case "id_mic":
      return "Inside micrometer (0.001mm)";
    case "bore_gauge":
      return "Digital bore gauge";
    case "thread_gauge":
      return "Go/No-Go thread ring or plug gauge";
    case "cmm":
      return "CMM (Mitutoyo Crysta-Plus or equiv.)";
    case "on_machine_probe":
      return "Renishaw OMP40 / Marposs probe";
    case "height_gauge":
      return "Digital height gauge + surface plate";
    case "optical_comparator":
      return "Optical comparator (10×/25×)";
    case "surface_roughness_tester":
      return "Mitutoyo Surftest SJ-210";
  }
}

class TurningInspectionPlanEngineImpl {
  generate(input: InspPlanInput): InspPlanResult {
    const regime = input.regulatory_regime ?? "commercial";
    const cmm = input.cmm_available ?? true;
    const probe = input.probe_available ?? false;
    const records: InspFeatureRecord[] = [];
    const equipmentSet = new Set<string>();
    const notes: string[] = [];
    let cmmRequiredButUnavailable = false;

    for (const f of input.features) {
      // Track when CMM is required but not available, independent of fallback method picked.
      if (!cmm && needsCmmFor(f) && (f.kind === "od" || f.kind === "bore" || f.kind === "face" || f.kind === "taper")) {
        cmmRequiredButUnavailable = true;
      }
      const { method, probePoints } = methodFor(f, cmm, probe);
      const { freq, n } = frequencyFor(f, input.lot_size, regime);
      const t = timePerPart(method, probePoints);

      const raNote = f.ra_target_um
        ? `; Ra ≤ ${f.ra_target_um}μm (Surftest)`
        : "";
      const acceptance =
        `Feature ${f.id} ${f.nominal_mm} ±${f.tolerance_mm}mm${raNote}`;

      const equip: string[] = [equipmentFor(method)];
      if (f.ra_target_um) equip.push(equipmentFor("surface_roughness_tester"));
      equip.forEach((e) => equipmentSet.add(e));

      records.push({
        feature_id: f.id,
        kind: f.kind,
        method,
        frequency: freq,
        sample_size: n,
        probe_points: probePoints,
        expected_seconds_per_part: t + (f.ra_target_um ? timePerPart("surface_roughness_tester") : 0),
        acceptance_criteria: acceptance,
        equipment_required: equip,
      });
    }

    const totalPerPart = records.reduce((s, r) => s + r.expected_seconds_per_part, 0);
    // Lot time: sum(sample_size × time_per_part) per feature
    const totalLot = records.reduce(
      (s, r) => s + r.sample_size * r.expected_seconds_per_part,
      0
    );

    const firstArticleRequired =
      regime === "aerospace" || regime === "medical" || input.lot_size >= 50;

    if (firstArticleRequired) notes.push("AS9102 / PPAP first-article package required");
    if (regime === "aerospace") notes.push("All records retained 10 years per AS9100");
    if (cmmRequiredButUnavailable) {
      notes.push("CMM not available — outsource precision features to contract inspection lab");
    }

    return {
      part_id: input.part_id,
      lot_size: input.lot_size,
      regulatory_regime: regime,
      feature_records: records,
      total_inspection_time_sec: round1(totalPerPart),
      total_inspection_time_per_lot_sec: round1(totalLot),
      equipment_list: Array.from(equipmentSet),
      first_article_required: firstArticleRequired,
      notes,
    };
  }

  getStats(): { supported_kinds: FeatureKind[]; aql_sampling: string } {
    return {
      supported_kinds: ["od", "bore", "face", "thread", "groove", "chamfer", "radius", "taper"],
      aql_sampling: "ANSI/ASQ Z1.4 General Inspection Level II (AQL 0.65, approximate)",
    };
  }
}

function round1(n: number): number { return Math.round(n * 10) / 10; }

export const turningInspectionPlanEngine = new TurningInspectionPlanEngineImpl();
export type { TurningInspectionPlanEngineImpl };
