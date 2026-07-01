/**
 * PrintReadingEngine — Engineering Print Intelligence Pipeline
 *
 * Higher-level pipeline that orchestrates BlueprintOCREngine with
 * existing PRISM engines to provide end-to-end print reading:
 * - Blueprint analysis → feature recognition → tolerance validation
 * - Auto-populate setup sheets from print metadata
 * - Generate inspection plans from extracted GD&T
 * - DXF text-layer dimension extraction
 * - Revision tracking and change detection
 *
 * Actions: print_analyze, print_to_setup_sheet, print_to_inspection_plan,
 *          print_compare_revisions, print_dxf_dimensions
 */

import {
  blueprintOCREngine,
  BlueprintAnalysis,
  ExtractedDimension,
  ExtractedGDT,
  TitleBlockData,
} from "./BlueprintOCREngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface PrintAnalysisInput {
  text: string;
  source?: string;
  unit?: "mm" | "in";
}

export interface SetupSheetFromPrint {
  part_number: string;
  revision: string;
  material: string;
  finish: string;
  critical_dimensions: Array<{
    feature: string;
    nominal: number;
    tolerance_band: number;
    unit: string;
    inspection_method: string;
  }>;
  gdt_requirements: Array<{
    symbol: string;
    tolerance: number;
    datum_refs: string[];
    inspection_method: string;
  }>;
  process_notes: string[];
  safety_notes: string[];
  general_tolerance: string;
  units: string;
}

export interface InspectionPlanFromPrint {
  part_number: string;
  revision: string;
  features: Array<{
    id: string;
    description: string;
    nominal: number;
    upper_limit: number;
    lower_limit: number;
    unit: string;
    measurement_method: string;
    instrument: string;
    frequency: string;
    critical: boolean;
    gdt?: {
      type: string;
      value: number;
      datum_ref?: string;
    };
  }>;
  gdt_checks: Array<{
    id: string;
    symbol: string;
    tolerance: number;
    material_condition?: string;
    datum_references: string[];
    instrument: string;
    frequency: string;
  }>;
  total_features: number;
  critical_count: number;
  estimated_inspection_time_min: number;
}

export interface RevisionComparison {
  old_revision: string;
  new_revision: string;
  added_dimensions: ExtractedDimension[];
  removed_dimensions: ExtractedDimension[];
  changed_tolerances: Array<{
    dimension_id: string;
    old_tolerance: { upper: number; lower: number };
    new_tolerance: { upper: number; lower: number };
    tightened: boolean;
  }>;
  added_gdt: ExtractedGDT[];
  removed_gdt: ExtractedGDT[];
  material_changed: boolean;
  summary: string;
}

export interface DxfDimensionResult {
  dimensions: ExtractedDimension[];
  layers_found: string[];
  dimension_count: number;
  annotation_count: number;
}

// ============================================================================
// SETUP SHEET GENERATION FROM PRINT
// ============================================================================

function generateSetupSheet(analysis: BlueprintAnalysis): SetupSheetFromPrint {
  const tb = analysis.title_block;
  const unit = tb.units ?? "mm";

  const criticalDims = analysis.dimensions
    .filter(d => d.tolerance && (d.tolerance.upper - d.tolerance.lower) <= 0.05)
    .map(d => ({
      feature: `${d.type} ${d.nominal}${unit}`,
      nominal: d.nominal,
      tolerance_band: d.tolerance ? d.tolerance.upper - d.tolerance.lower : 0,
      unit,
      inspection_method: selectInspectionMethod(d),
    }));

  const gdtReqs = analysis.gdt_frames.map(g => ({
    symbol: g.symbol,
    tolerance: g.tolerance_value,
    datum_refs: g.datum_references,
    inspection_method: selectGDTInspectionMethod(g),
  }));

  const processNotes = analysis.notes
    .filter(n => n.category === "process" || n.category === "material")
    .map(n => n.text);

  const safetyNotes = analysis.notes
    .filter(n => n.is_critical || n.category === "safety")
    .map(n => n.text);

  return {
    part_number: tb.part_number ?? "UNKNOWN",
    revision: tb.revision ?? "-",
    material: tb.material ?? "Not specified",
    finish: tb.finish ?? "As machined",
    critical_dimensions: criticalDims,
    gdt_requirements: gdtReqs,
    process_notes: processNotes,
    safety_notes: safetyNotes,
    general_tolerance: tb.general_tolerance ?? "ISO 2768-m",
    units: unit,
  };
}

function selectInspectionMethod(dim: ExtractedDimension): string {
  if (!dim.tolerance) return "visual";
  const band = dim.tolerance.upper - dim.tolerance.lower;
  if (band <= 0.005) return "CMM";
  if (band <= 0.025) return "bore gauge / micrometer";
  if (band <= 0.1) return "micrometer";
  if (dim.type === "diameter" || dim.type === "radius") return "caliper / micrometer";
  if (dim.type === "thread") return "thread gauge (go/no-go)";
  if (dim.type === "angular") return "protractor / CMM";
  return "caliper";
}

function selectGDTInspectionMethod(gdt: ExtractedGDT): string {
  if (gdt.tolerance_value <= 0.01) return "CMM";
  switch (gdt.symbol) {
    case "position": return "CMM";
    case "flatness": return gdt.tolerance_value <= 0.025 ? "CMM" : "surface plate + indicator";
    case "perpendicularity": return "CMM / square + indicator";
    case "parallelism": return "CMM / surface plate + indicator";
    case "circularity": return "CMM / roundness tester";
    case "cylindricity": return "CMM";
    case "concentricity": return "CMM / V-block + indicator";
    case "circular_runout": return "V-block + indicator";
    case "total_runout": return "V-block + indicator";
    case "profile_surface": return "CMM";
    case "profile_line": return "CMM / optical comparator";
    default: return "CMM";
  }
}

// ============================================================================
// INSPECTION PLAN GENERATION
// ============================================================================

function generateInspectionPlan(analysis: BlueprintAnalysis): InspectionPlanFromPrint {
  const tb = analysis.title_block;
  const unit = tb.units ?? "mm";
  const features: InspectionPlanFromPrint["features"] = [];
  const gdtChecks: InspectionPlanFromPrint["gdt_checks"] = [];
  let criticalCount = 0;

  for (const dim of analysis.dimensions) {
    if (!dim.tolerance) continue;
    const band = dim.tolerance.upper - dim.tolerance.lower;
    const critical = band <= 0.025;
    if (critical) criticalCount++;

    features.push({
      id: dim.id,
      description: `${dim.type} ${dim.nominal}${unit}`,
      nominal: dim.nominal,
      upper_limit: dim.nominal + dim.tolerance.upper,
      lower_limit: dim.nominal + dim.tolerance.lower,
      unit,
      measurement_method: selectInspectionMethod(dim),
      instrument: selectInstrument(dim),
      frequency: critical ? "100%" : "1st piece + 1/10",
      critical,
    });
  }

  for (const gdt of analysis.gdt_frames) {
    const critical = gdt.tolerance_value <= 0.025;
    if (critical) criticalCount++;

    gdtChecks.push({
      id: gdt.id,
      symbol: gdt.symbol,
      tolerance: gdt.tolerance_value,
      material_condition: gdt.material_condition,
      datum_references: gdt.datum_references,
      instrument: selectGDTInspectionMethod(gdt),
      frequency: critical ? "100%" : "1st piece + 1/10",
    });
  }

  // Estimate inspection time: ~2 min per feature, ~5 min per GDT check
  const estimatedTime = features.length * 2 + gdtChecks.length * 5;

  return {
    part_number: tb.part_number ?? "UNKNOWN",
    revision: tb.revision ?? "-",
    features,
    gdt_checks: gdtChecks,
    total_features: features.length + gdtChecks.length,
    critical_count: criticalCount,
    estimated_inspection_time_min: estimatedTime,
  };
}

function selectInstrument(dim: ExtractedDimension): string {
  if (!dim.tolerance) return "caliper";
  const band = dim.tolerance.upper - dim.tolerance.lower;
  if (band <= 0.005) return "CMM probe";
  if (dim.type === "diameter") {
    if (band <= 0.025) return "bore gauge";
    return "outside micrometer";
  }
  if (dim.type === "thread") return "go/no-go gauge";
  if (band <= 0.05) return "micrometer";
  return "caliper";
}

// ============================================================================
// REVISION COMPARISON
// ============================================================================

function compareRevisions(
  oldText: string,
  newText: string,
  options?: { unit?: "mm" | "in" },
): RevisionComparison {
  const oldAnalysis = blueprintOCREngine.analyzeBlueprint(oldText, options);
  const newAnalysis = blueprintOCREngine.analyzeBlueprint(newText, options);

  const oldDimMap = new Map(oldAnalysis.dimensions.map(d => [`${d.type}_${d.nominal}`, d]));
  const newDimMap = new Map(newAnalysis.dimensions.map(d => [`${d.type}_${d.nominal}`, d]));

  const added = newAnalysis.dimensions.filter(d => !oldDimMap.has(`${d.type}_${d.nominal}`));
  const removed = oldAnalysis.dimensions.filter(d => !newDimMap.has(`${d.type}_${d.nominal}`));

  const changedTols: RevisionComparison["changed_tolerances"] = [];
  for (const [key, oldDim] of oldDimMap) {
    const newDim = newDimMap.get(key);
    if (newDim && oldDim.tolerance && newDim.tolerance) {
      if (oldDim.tolerance.upper !== newDim.tolerance.upper ||
          oldDim.tolerance.lower !== newDim.tolerance.lower) {
        const oldBand = oldDim.tolerance.upper - oldDim.tolerance.lower;
        const newBand = newDim.tolerance.upper - newDim.tolerance.lower;
        changedTols.push({
          dimension_id: newDim.id,
          old_tolerance: { upper: oldDim.tolerance.upper, lower: oldDim.tolerance.lower },
          new_tolerance: { upper: newDim.tolerance.upper, lower: newDim.tolerance.lower },
          tightened: newBand < oldBand,
        });
      }
    }
  }

  const oldGDTSet = new Set(oldAnalysis.gdt_frames.map(g => `${g.symbol}_${g.tolerance_value}`));
  const newGDTSet = new Set(newAnalysis.gdt_frames.map(g => `${g.symbol}_${g.tolerance_value}`));
  const addedGDT = newAnalysis.gdt_frames.filter(g => !oldGDTSet.has(`${g.symbol}_${g.tolerance_value}`));
  const removedGDT = oldAnalysis.gdt_frames.filter(g => !newGDTSet.has(`${g.symbol}_${g.tolerance_value}`));

  const matChanged = (oldAnalysis.title_block.material ?? "") !== (newAnalysis.title_block.material ?? "");

  const changes = added.length + removed.length + changedTols.length + addedGDT.length + removedGDT.length;
  const summary = changes === 0
    ? "No dimensional changes detected between revisions."
    : `${changes} change(s): ${added.length} added, ${removed.length} removed, ` +
      `${changedTols.length} tolerance changes, ${addedGDT.length} GD&T added, ${removedGDT.length} GD&T removed` +
      (matChanged ? ", material changed" : "");

  return {
    old_revision: oldAnalysis.title_block.revision ?? "?",
    new_revision: newAnalysis.title_block.revision ?? "?",
    added_dimensions: added,
    removed_dimensions: removed,
    changed_tolerances: changedTols,
    added_gdt: addedGDT,
    removed_gdt: removedGDT,
    material_changed: matChanged,
    summary,
  };
}

// ============================================================================
// DXF TEXT LAYER EXTRACTION
// ============================================================================

function extractDxfDimensions(dxfText: string, options?: { unit?: "mm" | "in" }): DxfDimensionResult {
  const unit = options?.unit ?? "mm";
  const layers = new Set<string>();
  let annotationCount = 0;

  // Parse DXF layer names
  const layerPattern = /^\s*8\n\s*(.+)/gm;
  let lm: RegExpExecArray | null;
  while ((lm = layerPattern.exec(dxfText)) !== null) {
    layers.add(lm[1].trim());
  }

  // Extract DIMENSION entities
  // DXF dimensions have group codes 10-14 (points), 42 (actual measurement)
  const dimValuePattern = /^\s*42\n\s*([\d.]+)/gm;
  const rawValues: number[] = [];
  let dm: RegExpExecArray | null;
  while ((dm = dimValuePattern.exec(dxfText)) !== null) {
    rawValues.push(parseFloat(dm[1]));
  }

  // Extract TEXT/MTEXT entities for annotations
  const textPattern = /^\s*1\n\s*(.+)/gm;
  const textValues: string[] = [];
  let tm: RegExpExecArray | null;
  while ((tm = textPattern.exec(dxfText)) !== null) {
    textValues.push(tm[1].trim());
    annotationCount++;
  }

  // Combine: use text extraction on all text content for rich dimension parsing
  const allText = textValues.join("\n");
  const dimensions = blueprintOCREngine.extractDimensions(allText, unit);

  // Add DXF-specific dimensions from group code 42
  let id = dimensions.length;
  for (const val of rawValues) {
    if (val > 0 && !dimensions.some(d => Math.abs(d.nominal - val) < 0.001)) {
      dimensions.push({
        id: `DXF-DIM-${++id}`,
        type: "linear",
        nominal: val,
        unit,
        raw_text: `DXF entity value: ${val}`,
        confidence: 0.95,
      });
    }
  }

  return {
    dimensions,
    layers_found: [...layers],
    dimension_count: dimensions.length,
    annotation_count: annotationCount,
  };
}

// ============================================================================
// SINGLETON + EXPORTS
// ============================================================================

export const printReadingEngine = {
  analyze: (input: PrintAnalysisInput) =>
    blueprintOCREngine.analyzeBlueprint(input.text, { unit: input.unit }),
  generateSetupSheet,
  generateInspectionPlan,
  compareRevisions,
  extractDxfDimensions,
};
