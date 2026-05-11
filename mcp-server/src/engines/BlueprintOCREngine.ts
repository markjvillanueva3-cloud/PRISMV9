/**
 * BlueprintOCREngine — Engineering Print & Blueprint Reading
 *
 * Extracts manufacturing-relevant data from engineering drawings/prints:
 * - Dimension callouts (linear, angular, radial, diameter)
 * - GD&T (Geometric Dimensioning & Tolerancing) symbols and frames
 * - Title block metadata (part number, revision, material, finish)
 * - Notes and annotations (process notes, material callouts, hardness)
 * - Bill of Materials references
 *
 * Uses structured regex parsing on OCR'd text or PDF-extracted text.
 * Does NOT perform OCR itself — expects pre-extracted text from
 * pdf_ingestion.py or ui_ocr.py pipelines.
 *
 * Actions: blueprint_extract_dimensions, blueprint_extract_gdt,
 *          blueprint_parse_title_block, blueprint_extract_notes,
 *          blueprint_analyze, blueprint_ingest_phase8
 */

import * as fs from "node:fs";
import * as readline from "node:readline";

// ============================================================================
// TYPES
// ============================================================================

export type DimensionType =
  | "linear" | "diameter" | "radius" | "angular"
  | "chamfer" | "depth" | "thread" | "counterbore" | "countersink";

export type GDTSymbol =
  | "flatness" | "straightness" | "circularity" | "cylindricity"
  | "profile_line" | "profile_surface"
  | "perpendicularity" | "angularity" | "parallelism"
  | "position" | "concentricity" | "symmetry"
  | "circular_runout" | "total_runout";

export type ToleranceType =
  | "bilateral" | "unilateral_plus" | "unilateral_minus"
  | "limit" | "fit_class" | "basic" | "reference";

export interface ExtractedDimension {
  id: string;
  type: DimensionType;
  nominal: number;
  unit: "mm" | "in";
  tolerance?: {
    type: ToleranceType;
    upper: number;
    lower: number;
  };
  fit_class?: string;
  surface_finish_ra?: number;
  location_hint?: string;
  raw_text: string;
  confidence: number;
}

export interface ExtractedGDT {
  id: string;
  symbol: GDTSymbol;
  tolerance_value: number;
  tolerance_unit: "mm" | "in";
  material_condition?: "MMC" | "LMC" | "RFS";
  datum_references: string[];
  applied_to?: string;
  raw_text: string;
  confidence: number;
}

export interface TitleBlockData {
  part_number?: string;
  revision?: string;
  drawing_number?: string;
  title?: string;
  material?: string;
  finish?: string;
  scale?: string;
  sheet?: string;
  drawn_by?: string;
  checked_by?: string;
  approved_by?: string;
  date?: string;
  units?: "mm" | "in" | "mixed";
  general_tolerance?: string;
  third_angle?: boolean;
  weight?: string;
  treatment?: string;
  confidence: number;
}

export interface ExtractedNote {
  id: string;
  category: "process" | "material" | "finish" | "tolerance" | "inspection"
           | "safety" | "assembly" | "general";
  text: string;
  is_critical: boolean;
  referenced_features?: string[];
  confidence: number;
}

export interface BlueprintAnalysis {
  dimensions: ExtractedDimension[];
  gdt_frames: ExtractedGDT[];
  title_block: TitleBlockData;
  notes: ExtractedNote[];
  summary: {
    total_dimensions: number;
    total_gdt: number;
    total_notes: number;
    tightest_tolerance_mm: number;
    critical_features: string[];
    material: string;
    has_gdt: boolean;
  };
}

// ============================================================================
// DIMENSION EXTRACTION
// ============================================================================

const DIMENSION_PATTERNS: Array<{ type: string; pattern: RegExp; groups: string[] }> = [
  // Diameter: Ø12.5 ±0.01 or ∅25.4 +0.02/-0.01
  {
    type: "diameter",
    pattern: /[Øø∅]\s*(\d+\.?\d*)\s*(?:([±])\s*(\d+\.?\d*)|([+-]\s*\d+\.?\d*)\s*\/\s*([+-]\s*\d+\.?\d*))?/g,
    groups: ["nominal", "bilateral_sign", "bilateral_val", "upper", "lower"],
  },
  // Radius: R5.0, R 3.5
  {
    type: "radius",
    pattern: /\bR\s*(\d+\.?\d*)\s*(?:([±])\s*(\d+\.?\d*))?/g,
    groups: ["nominal", "bilateral_sign", "bilateral_val"],
  },
  // Thread: M8x1.25, M10-6H, 1/4-20 UNC
  {
    type: "thread",
    pattern: /\b(M\d+(?:\.\d+)?(?:\s*[xX×]\s*\d+\.?\d+)?(?:\s*-\s*\d[A-Z])?|\d+\/\d+-\d+\s*(?:UNC|UNF|UNEF)(?:\s*-\s*\d[A-Z])?)/g,
    groups: ["nominal_str"],
  },
  // Angular: 45° ±0.5° or 30.0 deg
  {
    type: "angular",
    pattern: /(\d+\.?\d*)\s*(?:°|deg(?:rees?)?)\s*(?:([±])\s*(\d+\.?\d*)\s*(?:°|deg)?)?/g,
    groups: ["nominal", "bilateral_sign", "bilateral_val"],
  },
  // Chamfer: C1.5, 0.5x45°, 1.0 X 45 DEG
  {
    type: "chamfer",
    pattern: /\bC\s*(\d+\.?\d*)|\b(\d+\.?\d*)\s*[xX×]\s*45\s*(?:°|deg)?/g,
    groups: ["nominal1", "nominal2"],
  },
  // Counterbore: ⌴12 x 5 deep
  {
    type: "counterbore",
    pattern: /[⌴]\s*(\d+\.?\d*)\s*(?:[xX×]\s*(\d+\.?\d*)\s*(?:deep|dp)?)?/g,
    groups: ["diameter", "depth"],
  },
  // Countersink: ∨90° Ø15 or CSK 82° x 12
  {
    type: "countersink",
    pattern: /(?:CSK|c['']?sink|∨)\s*(\d+\.?\d*)\s*(?:°|deg)?\s*(?:[xX×Øø∅]\s*(\d+\.?\d*))?/g,
    groups: ["angle", "diameter"],
  },
  // Linear with tolerance: 25.00 ±0.05 or 100.0 +0.02/-0.01
  {
    type: "linear",
    pattern: /\b(\d{1,4}\.?\d{0,4})\s*(?:([±])\s*(\d+\.?\d+)|([+-]\s*\d+\.?\d+)\s*\/\s*([+-]\s*\d+\.?\d+))/g,
    groups: ["nominal", "bilateral_sign", "bilateral_val", "upper", "lower"],
  },
  // Depth: ▽5.0, depth 10.0, .500 dp., 0.750 deep
  {
    type: "depth",
    pattern: /(?:▽|depth|dp\.?|deep)\s*(\d+\.?\d*)\s*(?:([±])\s*(\d+\.?\d*))?/gi,
    groups: ["nominal", "bilateral_sign", "bilateral_val"],
  },
  // Depth (number-first): .500 dp., 0.750 deep, 25.0mm deep
  {
    type: "depth",
    pattern: /(\d*\.?\d+)\s*(?:dp\.?|deep)\b/gi,
    groups: ["nominal"],
  },
  // Diameter text: 2.0 Dia., 1.5 DIA, 12.7mm dia
  {
    type: "diameter",
    pattern: /(\d+\.?\d*)\s*(?:Dia\.?|DIA\.?|dia\.?)\b/g,
    groups: ["nominal"],
  },
  // OD/ID stock dimensions: 2.0" OD, 50mm ID, 2.0 OD x 4.0 length
  {
    type: "diameter",
    pattern: /(\d+\.?\d*)\s*(?:"|in\.?)?\s*(?:OD|O\.D\.?|ID|I\.D\.?)\b/gi,
    groups: ["nominal"],
  },
  // Length/width from stock callout: x 4.0 length, x 100mm long
  {
    type: "linear",
    pattern: /[xX×]\s*(\d+\.?\d*)\s*(?:"|in\.?|mm)?\s*(?:length|long|wide|width)\b/gi,
    groups: ["nominal"],
  },
  // Groove/slot width: .250 wide, 3.0mm wide
  {
    type: "linear",
    pattern: /(\d*\.?\d+)\s*(?:"|in\.?|mm)?\s*wide\b/gi,
    groups: ["nominal"],
  },
  // Tool nose radius: .031 TNR, .0312 TNR
  {
    type: "radius",
    pattern: /(\d*\.?\d+)\s*TNR\b/gi,
    groups: ["nominal"],
  },
];

function extractDimensions(text: string, unit: "mm" | "in" = "mm"): ExtractedDimension[] {
  const dims: ExtractedDimension[] = [];
  let id = 0;

  for (const spec of DIMENSION_PATTERNS) {
    const regex = new RegExp(spec.pattern.source, spec.pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const raw = match[0];
      let nominal = 0;
      let tolerance: ExtractedDimension["tolerance"] | undefined;

      if (spec.type === "thread") {
        // Thread dimensions are string-based
        dims.push({
          id: `DIM-${++id}`,
          type: "thread",
          nominal: 0,
          unit,
          raw_text: raw.trim(),
          confidence: 0.85,
        });
        continue;
      }

      if (spec.type === "chamfer") {
        nominal = parseFloat(match[1] || match[2] || "0");
      } else if (spec.type === "counterbore") {
        nominal = parseFloat(match[1] || "0");
      } else if (spec.type === "countersink") {
        nominal = parseFloat(match[2] || match[1] || "0");
      } else {
        nominal = parseFloat(match[1] || "0");
      }

      if (nominal === 0 && spec.type !== "thread") continue;

      // Parse tolerances
      if (match[2] === "±" && match[3]) {
        const tol = parseFloat(match[3]);
        tolerance = { type: "bilateral", upper: tol, lower: -tol };
      } else if (match[4] && match[5]) {
        const upper = parseFloat(match[4].replace(/\s/g, ""));
        const lower = parseFloat(match[5].replace(/\s/g, ""));
        tolerance = {
          type: upper >= 0 && lower <= 0 ? "bilateral" : "unilateral_plus",
          upper,
          lower,
        };
      }

      dims.push({
        id: `DIM-${++id}`,
        type: spec.type as DimensionType,
        nominal,
        unit,
        tolerance,
        raw_text: raw.trim(),
        confidence: tolerance ? 0.9 : 0.75,
      });
    }
  }

  return dims;
}

// ============================================================================
// GD&T EXTRACTION
// ============================================================================

const GDT_SYMBOL_MAP: Record<string, GDTSymbol> = {
  "⏥": "flatness", "—": "straightness", "○": "circularity", "⌭": "cylindricity",
  "⌒": "profile_line", "⌓": "profile_surface",
  "⊥": "perpendicularity", "∠": "angularity", "∥": "parallelism", "//": "parallelism",
  "⌖": "position", "◎": "concentricity", "⌯": "symmetry",
  "↗": "circular_runout", "↗↗": "total_runout",
};

// Ordered list — longer/more specific matches first to avoid short-circuiting
const GDT_TEXT_ENTRIES: Array<[string, GDTSymbol]> = [
  ["total runout", "total_runout"],
  ["circular runout", "circular_runout"],
  ["true position", "position"],
  ["profile of a surface", "profile_surface"],
  ["profile of a line", "profile_line"],
  ["profile surface", "profile_surface"],
  ["profile line", "profile_line"],
  ["perpendicularity", "perpendicularity"],
  ["concentricity", "concentricity"],
  ["cylindricity", "cylindricity"],
  ["straightness", "straightness"],
  ["circularity", "circularity"],
  ["parallelism", "parallelism"],
  ["squareness", "perpendicularity"],
  ["angularity", "angularity"],
  ["roundness", "circularity"],
  ["flatness", "flatness"],
  ["position", "position"],
  ["symmetry", "symmetry"],
  ["runout", "circular_runout"],
  ["straight", "straightness"],
  ["parallel", "parallelism"],
  ["flat", "flatness"],
  ["conc", "concentricity"],
  ["perp", "perpendicularity"],
  ["sym", "symmetry"],
  ["tp", "position"],
];

function extractGDT(text: string, unit: "mm" | "in" = "mm"): ExtractedGDT[] {
  const frames: ExtractedGDT[] = [];
  let id = 0;

  // Pattern: GDT symbol/text + tolerance value + optional material condition + datum refs
  // e.g., "⊥ 0.05 M A B" or "POSITION 0.010 MMC DATUM A, B"
  // or "TRUE POSITION Ø0.25 (M) A|B|C"
  const gdtPattern = /(?:([⏥—○⌭⌒⌓⊥∠∥⌖◎⌯↗]↗?|\/\/)|(?:(?:TRUE\s+)?(?:TOTAL\s+RUNOUT|POSITION|FLATNESS|STRAIGHTNESS|CIRCULARITY|CYLINDRICITY|PERPENDICULARITY|ANGULARITY|PARALLELISM|CONCENTRICITY|SYMMETRY|CIRCULAR\s+RUNOUT|RUNOUT|PROFILE\s+(?:OF\s+A\s+)?(?:LINE|SURFACE))))\s*(?:[Øø∅])?\s*(\d+\.?\d*)\s*(?:\(?\s*(M(?:MC)?|L(?:MC)?|RFS|Ⓜ|Ⓛ)\s*\)?)?\s*(?:(?:DATUM\s+|DAT\s+)?([A-Z](?:\s*[,|/\-\s]\s*[A-Z]){0,2}))?/gi;

  let match: RegExpExecArray | null;
  while ((match = gdtPattern.exec(text)) !== null) {
    const symbolChar = match[1];
    const tolValue = parseFloat(match[2] || "0");
    const matCond = match[3]?.toUpperCase();
    const datumStr = match[4];

    if (tolValue === 0) continue;

    // Resolve symbol
    let symbol: GDTSymbol | undefined;
    if (symbolChar) {
      symbol = GDT_SYMBOL_MAP[symbolChar];
    }
    if (!symbol) {
      const fullMatch = match[0].toLowerCase();
      for (const [key, val] of GDT_TEXT_ENTRIES) {
        if (fullMatch.includes(key)) {
          symbol = val;
          break;
        }
      }
    }
    if (!symbol) continue;

    // Parse material condition
    let materialCondition: ExtractedGDT["material_condition"];
    if (matCond) {
      if (matCond.startsWith("M") || matCond === "Ⓜ") materialCondition = "MMC";
      else if (matCond.startsWith("L") || matCond === "Ⓛ") materialCondition = "LMC";
      else materialCondition = "RFS";
    }

    // Parse datum references (space, comma, pipe, slash separated)
    const datumRefs = datumStr
      ? datumStr.trim().split(/[\s,|/\-]+/).filter(d => /^[A-Z]$/.test(d))
      : [];

    frames.push({
      id: `GDT-${++id}`,
      symbol,
      tolerance_value: tolValue,
      tolerance_unit: unit,
      material_condition: materialCondition,
      datum_references: datumRefs,
      raw_text: match[0].trim(),
      confidence: datumRefs.length > 0 ? 0.85 : 0.7,
    });
  }

  return frames;
}

// ============================================================================
// TITLE BLOCK PARSING
// ============================================================================

function parseTitleBlock(text: string): TitleBlockData {
  const t = text;

  const extract = (patterns: RegExp[]): string | undefined => {
    for (const p of patterns) {
      const m = t.match(p);
      if (m?.[1]?.trim()) return m[1].trim();
    }
    return undefined;
  };

  const partNumber = extract([
    /(?:PART\s*(?:NO|NUMBER|#|NUM))\s*[:\-.]?\s*([A-Z0-9][\w\-./]+)/i,
    /(?:P\/N|PN)\s*[:\-.]?\s*([A-Z0-9][\w\-./]+)/i,
    // CNC program O-number: O00020, O0075, O12345
    /^[%\s]*\n?\s*(O\d{4,5})\b/m,
    /\b(O\d{4,5})\s*\(/m,
  ]);

  const revision = extract([
    /(?:REV(?:ISION)?|ECN)\s*[:\-.]?\s*([A-Z0-9][\w.\-]*)/i,
  ]);

  const drawingNumber = extract([
    /(?:DWG|DRAWING)\s*(?:NO|NUMBER|#)?\s*[:\-.]?\s*([A-Z0-9][\w\-./]+)/i,
  ]);

  const title = extract([
    /(?:TITLE|DESCRIPTION|DESC)\s*[:\-.]?\s*(.{3,60})/i,
  ]);

  const material = extract([
    /(?:MATERIAL|MAT(?:'L)?|MATL)\s*[:\-.]?\s*(.{3,40})/i,
    /(?:AISI|SAE|UNS|ASTM)\s+([A-Z0-9\s\-]+)/i,
  ]);

  const finish = extract([
    /(?:FINISH|SURFACE\s+FINISH|COATING)\s*[:\-.]?\s*(.{3,40})/i,
  ]);

  const scale = extract([
    /(?:SCALE)\s*[:\-.]?\s*([\d:]+(?:\s*\/\s*[\d:]+)?|\d+\s*=\s*\d+)/i,
  ]);

  const sheet = extract([
    /(?:SHEET|SH)\s*[:\-.]?\s*(\d+\s*(?:OF|\/)\s*\d+)/i,
  ]);

  const drawnBy = extract([
    /(?:DRAWN\s*(?:BY)?|DR)\s*[:\-.]?\s*([A-Z][A-Za-z.\s]{1,20})/i,
  ]);

  const checkedBy = extract([
    /(?:CHECKED?\s*(?:BY)?|CHK)\s*[:\-.]?\s*([A-Z][A-Za-z.\s]{1,20})/i,
  ]);

  const approvedBy = extract([
    /(?:APPRO?VE?D?\s*(?:BY)?|APPR?)\s*[:\-.]?\s*([A-Z][A-Za-z.\s]{1,20})/i,
  ]);

  const date = extract([
    /(?:DATE)\s*[:\-.]?\s*(\d{1,4}[\-/]\d{1,2}[\-/]\d{1,4})/i,
  ]);

  const weight = extract([
    /(?:WEIGHT|WT|MASS)\s*[:\-.]?\s*([\d.]+\s*(?:kg|lb|g|oz)?)/i,
  ]);

  const treatment = extract([
    /(?:HEAT\s*TREAT(?:MENT)?|HARDNESS)\s*[:\-.]?\s*(.{3,40})/i,
    /\bHT\b\s*[:\-.]?\s*(HRC\s*.{3,30})/i,
  ]);

  // Detect units
  let units: TitleBlockData["units"];
  if (/MILLIMETERS|MILLIMETRES|\bmm\b/i.test(t)) units = "mm";
  else if (/INCHES|\bin\b|\bINCH\b/i.test(t)) units = "in";

  // Third angle projection
  const thirdAngle = /THIRD\s*ANGLE|3RD\s*ANGLE/i.test(t) ? true :
                     /FIRST\s*ANGLE|1ST\s*ANGLE/i.test(t) ? false : undefined;

  // General tolerance
  const generalTol = extract([
    /(?:GENERAL\s*TOL(?:ERANCE)?|UNLESS\s*OTHERWISE\s*SPECIFIED|UOS)\s*[:\-.]?\s*(.{3,60})/i,
  ]);

  const fieldsFound = [partNumber, revision, drawingNumber, title, material].filter(Boolean).length;
  const confidence = Math.min(1, fieldsFound * 0.2);

  return {
    part_number: partNumber,
    revision,
    drawing_number: drawingNumber,
    title,
    material,
    finish,
    scale,
    sheet,
    drawn_by: drawnBy,
    checked_by: checkedBy,
    approved_by: approvedBy,
    date,
    units,
    general_tolerance: generalTol,
    third_angle: thirdAngle,
    weight,
    treatment,
    confidence,
  };
}

// ============================================================================
// NOTE EXTRACTION
// ============================================================================

const NOTE_CATEGORY_KEYWORDS: Record<ExtractedNote["category"], string[]> = {
  process: ["machine", "mill", "turn", "drill", "grind", "EDM", "bore", "ream", "tap",
            "heat treat", "anneal", "temper", "quench", "normalize", "stress relieve",
            "weld", "braze", "solder", "deburr", "break edges", "shot peen", "tumble"],
  material: ["material", "alloy", "steel", "aluminum", "titanium", "brass", "copper",
             "stainless", "inconel", "AISI", "SAE", "UNS", "ASTM", "AMS", "grade"],
  finish: ["finish", "coat", "plate", "anodize", "paint", "polish", "Ra", "Rz",
           "surface roughness", "passivate", "black oxide", "zinc", "nickel", "chrome",
           "hard coat", "Alodine", "conversion", "powder coat"],
  tolerance: ["tolerance", "unless otherwise", "UOS", "general tol", "angular tol",
              "fractional", "decimal", "interpret per", "ASME Y14", "ISO 2768"],
  inspection: ["inspect", "CMM", "gauge", "measure", "check", "first article", "FAI",
               "100% inspection", "sample", "SPC", "PPAP", "AS9102"],
  safety: ["safety", "caution", "warning", "danger", "critical", "flight", "load bearing",
           "pressure", "fatigue", "life limited"],
  assembly: ["assemble", "install", "mate", "press fit", "shrink fit", "loctite", "adhesive",
             "orientation", "align", "match", "stamp"],
  general: [],
};

function extractNotes(text: string): ExtractedNote[] {
  const notes: ExtractedNote[] = [];
  let id = 0;

  // Match numbered notes: "1. ...", "NOTE 1:", "NOTES:", bullet points
  const notePattern = /(?:(?:NOTES?\s*[:.]?\s*)?(?:\d+[.)]\s*|[-•]\s*))(.{10,200})/gi;
  let match: RegExpExecArray | null;
  while ((match = notePattern.exec(text)) !== null) {
    const noteText = match[1].trim();
    if (noteText.length < 10) continue;

    // Categorize
    let category: ExtractedNote["category"] = "general";
    const lower = noteText.toLowerCase();
    for (const [cat, keywords] of Object.entries(NOTE_CATEGORY_KEYWORDS)) {
      if (cat === "general") continue;
      if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
        category = cat as ExtractedNote["category"];
        break;
      }
    }

    const isCritical = /\b(critical|safety|warning|danger|flight|load.bearing|life.limited|pressure.vessel)\b/i.test(noteText);

    notes.push({
      id: `NOTE-${++id}`,
      category,
      text: noteText,
      is_critical: isCritical,
      confidence: 0.8,
    });
  }

  return notes;
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

function analyzeBlueprint(text: string, options?: { unit?: "mm" | "in" }): BlueprintAnalysis {
  const unit = options?.unit ?? (detectUnit(text));

  const dimensions = extractDimensions(text, unit);
  const gdt_frames = extractGDT(text, unit);
  const title_block = parseTitleBlock(text);
  const notesList = extractNotes(text);

  // Find tightest tolerance
  let tightestTol = Infinity;
  for (const dim of dimensions) {
    if (dim.tolerance) {
      const band = dim.tolerance.upper - dim.tolerance.lower;
      if (band > 0 && band < tightestTol) tightestTol = band;
    }
  }
  for (const gdt of gdt_frames) {
    if (gdt.tolerance_value > 0 && gdt.tolerance_value < tightestTol) {
      tightestTol = gdt.tolerance_value;
    }
  }

  // Identify critical features
  const criticalFeatures: string[] = [];
  for (const dim of dimensions) {
    if (dim.tolerance) {
      const band = dim.tolerance.upper - dim.tolerance.lower;
      if (band > 0 && band <= 0.025) {  // ≤25µm = critical
        criticalFeatures.push(`${dim.type} ${dim.nominal}${unit} (±${(band / 2).toFixed(4)})`);
      }
    }
  }
  for (const gdt of gdt_frames) {
    if (gdt.tolerance_value <= 0.025) {
      criticalFeatures.push(`${gdt.symbol} ${gdt.tolerance_value}${unit}`);
    }
  }

  return {
    dimensions,
    gdt_frames,
    title_block,
    notes: notesList,
    summary: {
      total_dimensions: dimensions.length,
      total_gdt: gdt_frames.length,
      total_notes: notesList.length,
      tightest_tolerance_mm: tightestTol === Infinity ? 0 :
        (unit === "in" ? tightestTol * 25.4 : tightestTol),
      critical_features: criticalFeatures,
      material: title_block.material ?? "unknown",
      has_gdt: gdt_frames.length > 0,
    },
  };
}

function detectUnit(text: string): "mm" | "in" {
  const mmScore = (text.match(/\bmm\b|millimeter|MILLIMETER/gi) ?? []).length;
  const inScore = (text.match(/\binch|INCHES|\bin\b(?=\s|$)/gi) ?? []).length;
  // Check for decimal patterns: metric tends to use whole numbers + 1-2 decimals
  // Imperial tends to use 4-place decimals
  const fourPlace = (text.match(/\d+\.\d{4}/g) ?? []).length;
  const twoPlace = (text.match(/\b\d+\.\d{1,2}\b/g) ?? []).length;

  if (mmScore > inScore) return "mm";
  if (inScore > mmScore) return "in";
  if (fourPlace > twoPlace * 2) return "in";
  return "mm";
}

// ============================================================================
// PHASE 8 JSONL INGESTION (Docustrata pipeline -> BlueprintOCREngine)
// ============================================================================
//
// Streams the Phase 8 tiered classifier output line-by-line, runs each page's
// OCR excerpt through analyzeBlueprint(), and aggregates by part number.
//
// Source schema (one JSON object per line):
//   doc_id, filename, disk_path, page_index,
//   tier1: { drawing_score, black_density, edge_density, width_px, height_px },
//   tier2: { is_drawing_likely?, strong_indicators?, keyword_hits?,
//            part_numbers?, ocr_chars?, ocr_excerpt?, part_numbers_clean? }
//
// Memory-bounded via createReadStream + readline (does NOT load file into RAM).
// Skips malformed lines (logs them, doesn't throw) so a truncated tail line
// never wastes a full corpus pass.

export interface Phase8Tier1 {
  drawing_score: number;
  black_density: number;
  edge_density: number;
  width_px: number;
  height_px: number;
}

export interface Phase8Tier2 {
  is_drawing_likely?: boolean;
  strong_indicators?: number;
  keyword_hits?: number;
  part_numbers?: string[];
  ocr_chars?: number;
  ocr_excerpt?: string;
  part_numbers_clean?: string[];
}

export interface Phase8Row {
  doc_id: string;
  filename: string;
  disk_path: string;
  page_index: number;
  tier1: Phase8Tier1;
  tier2?: Phase8Tier2;
}

export interface IngestedBlueprintRow {
  doc_id: string;
  filename: string;
  disk_path: string;
  page_index: number;
  drawing_score: number;
  part_numbers: string[];
  analysis: BlueprintAnalysis;
}

export interface IngestSummary {
  total_lines: number;
  parsed: number;
  malformed: number;
  analyzed: number;
  skipped_no_text: number;
  unique_part_numbers: number;
  total_dimensions: number;
  total_gdt: number;
  pages_with_critical_features: number;
}

export interface IngestOptions {
  /** Minimum tier1.drawing_score to run analyzeBlueprint (default 0.3 — matches Phase 8 tier2 gate). */
  minDrawingScore?: number;
  /** If set, write IngestedBlueprintRow JSONL to this path (one row per analyzed page). */
  outPath?: string;
  /** Optional progress callback fired every N lines (default every 1000). */
  onProgress?: (linesRead: number, parsed: number) => void;
  progressInterval?: number;
  /** Maximum bytes per line before treating as malformed (default 1 MiB — guards against unterminated JSON). */
  maxLineBytes?: number;
}

async function ingestPhase8JSONL(
  jsonlPath: string,
  options: IngestOptions = {},
): Promise<{ summary: IngestSummary; byPartNumber: Record<string, IngestedBlueprintRow[]> }> {
  const minScore = options.minDrawingScore ?? 0.3;
  const progressInterval = options.progressInterval ?? 1000;
  const maxLineBytes = options.maxLineBytes ?? 1024 * 1024;

  if (!fs.existsSync(jsonlPath)) {
    throw new Error(`Phase 8 JSONL not found: ${jsonlPath}`);
  }

  const summary: IngestSummary = {
    total_lines: 0,
    parsed: 0,
    malformed: 0,
    analyzed: 0,
    skipped_no_text: 0,
    unique_part_numbers: 0,
    total_dimensions: 0,
    total_gdt: 0,
    pages_with_critical_features: 0,
  };

  const byPartNumber: Record<string, IngestedBlueprintRow[]> = {};
  let outStream: fs.WriteStream | null = null;
  if (options.outPath) {
    outStream = fs.createWriteStream(options.outPath, { flags: "w", encoding: "utf-8" });
  }

  const stream = fs.createReadStream(jsonlPath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  try {
    for await (const rawLine of rl) {
      summary.total_lines++;
      const line = rawLine.trim();
      if (line.length === 0) continue;
      if (line.length > maxLineBytes) {
        summary.malformed++;
        continue;
      }

      let row: Phase8Row;
      try {
        row = JSON.parse(line) as Phase8Row;
      } catch {
        summary.malformed++;
        continue;
      }

      // Required-field guard — malformed if structurally wrong
      if (
        typeof row.doc_id !== "string" ||
        typeof row.page_index !== "number" ||
        !Number.isFinite(row.page_index) ||
        !row.tier1 ||
        typeof row.tier1.drawing_score !== "number" ||
        !Number.isFinite(row.tier1.drawing_score)
      ) {
        summary.malformed++;
        continue;
      }
      summary.parsed++;

      // Skip pages below the score threshold (they aren't drawings)
      if (row.tier1.drawing_score < minScore) {
        if (summary.parsed % progressInterval === 0) {
          options.onProgress?.(summary.total_lines, summary.parsed);
        }
        continue;
      }

      const ocrText = row.tier2?.ocr_excerpt ?? "";
      const partNumbers = row.tier2?.part_numbers_clean ?? [];

      if (ocrText.length === 0 && partNumbers.length === 0) {
        summary.skipped_no_text++;
        continue;
      }

      const analysis = analyzeBlueprint(ocrText);
      summary.analyzed++;
      summary.total_dimensions += analysis.summary.total_dimensions;
      summary.total_gdt += analysis.summary.total_gdt;
      if (analysis.summary.critical_features.length > 0) {
        summary.pages_with_critical_features++;
      }

      const ingested: IngestedBlueprintRow = {
        doc_id: row.doc_id,
        filename: row.filename,
        disk_path: row.disk_path,
        page_index: row.page_index,
        drawing_score: row.tier1.drawing_score,
        part_numbers: partNumbers,
        analysis,
      };

      // Index pages WITHOUT a part number under "__unknown__" so they aren't lost
      const keys = partNumbers.length > 0 ? partNumbers : ["__unknown__"];
      for (const key of keys) {
        if (!byPartNumber[key]) byPartNumber[key] = [];
        byPartNumber[key].push(ingested);
      }

      outStream?.write(JSON.stringify(ingested) + "\n");

      if (summary.parsed % progressInterval === 0) {
        options.onProgress?.(summary.total_lines, summary.parsed);
      }
    }
  } finally {
    rl.close();
    stream.close();
    if (outStream) {
      await new Promise<void>((resolve) => outStream!.end(resolve));
    }
  }

  // Exclude the synthetic "__unknown__" bucket from the unique-part-number count
  summary.unique_part_numbers = Object.keys(byPartNumber).filter(
    (k) => k !== "__unknown__",
  ).length;

  return { summary, byPartNumber };
}

// ============================================================================
// PHASE 15 INGEST — Deep-Rescan Drawing Page Aggregator
// ============================================================================
//
// Phase 15 (phase15-deep-rescan-parallel*.py) is the deep-OCR pass over the
// 24K multi-page Docustrata PDFs that Phase 3 page-1-only extraction missed.
// Output shape differs from Phase 8: Phase 15 emits pre-extracted fields
// (no raw OCR text), so this ingest aggregates rather than re-analyzes.
//
// Phase 15 row shape (one per PDF page, not per doc):
//   {
//     doc_id, filename, disk_path, page_index,
//     fields: { part_numbers[], drawing_number, revision, material,
//               customer, strong_indicators, is_drawing_likely, ocr_chars,
//               garbage_partnums[] }
//   }
// or error row: { doc_id, page_index, error: "..." }
//
// Output: byPartNumber index + per-customer aggregation + drawing-only summary.
// Used downstream by LathePrintIngestPipelineEngine + corpus seeders.

export interface Phase15RowFields {
  part_numbers: string[];
  garbage_partnums?: string[];
  drawing_number: string | null;
  revision: string | null;
  material: string | null;
  customer: string | null;
  strong_indicators: number;
  is_drawing_likely: boolean;
  ocr_chars: number;
}

export interface Phase15Row {
  doc_id: string;
  filename?: string;
  disk_path?: string;
  page_index: number;
  fields?: Phase15RowFields;
  error?: string;
}

export interface IngestedPhase15Page {
  doc_id: string;
  filename: string;
  disk_path: string;
  page_index: number;
  part_numbers: string[];
  drawing_number: string | null;
  revision: string | null;
  material: string | null;
  customer: string | null;
  strong_indicators: number;
  ocr_chars: number;
}

export interface IngestPhase15Summary {
  total_lines: number;
  parsed: number;
  malformed: number;
  error_rows: number;
  drawing_pages: number;
  pages_with_pns: number;
  pages_with_customer: number;
  pages_with_drawing_number: number;
  pages_with_revision: number;
  pages_with_material: number;
  unique_part_numbers: number;
  unique_customers: number;
  unique_docs: number;
}

export interface IngestPhase15Options {
  /**
   * If true, include only rows where fields.is_drawing_likely === true.
   * Default true (the whole point of Phase 15 is the drawing subset).
   */
  drawingOnly?: boolean;
  /**
   * Minimum strong_indicators count to admit a page. Default 0 (accept all
   * is_drawing_likely=true pages — the Python pre-gate already filters).
   * Raise to 2 for stricter title-block-confirmed admissions.
   */
  minStrongIndicators?: number;
  /** Optional progress callback fired every N parsed lines (default 1000). */
  onProgress?: (linesRead: number, parsed: number) => void;
  progressInterval?: number;
  /** If set, write IngestedPhase15Page JSONL to this path. */
  outPath?: string;
  /** Max bytes per JSONL line (default 1 MiB). */
  maxLineBytes?: number;
}

async function ingestPhase15JSONL(
  jsonlPath: string,
  options: IngestPhase15Options = {},
): Promise<{
  summary: IngestPhase15Summary;
  byPartNumber: Record<string, IngestedPhase15Page[]>;
  byCustomer: Record<string, IngestedPhase15Page[]>;
}> {
  const drawingOnly = options.drawingOnly ?? true;
  const minStrong = options.minStrongIndicators ?? 0;
  const progressInterval = options.progressInterval ?? 1000;
  const maxLineBytes = options.maxLineBytes ?? 1024 * 1024;

  if (!fs.existsSync(jsonlPath)) {
    throw new Error(`Phase 15 JSONL not found: ${jsonlPath}`);
  }

  const summary: IngestPhase15Summary = {
    total_lines: 0,
    parsed: 0,
    malformed: 0,
    error_rows: 0,
    drawing_pages: 0,
    pages_with_pns: 0,
    pages_with_customer: 0,
    pages_with_drawing_number: 0,
    pages_with_revision: 0,
    pages_with_material: 0,
    unique_part_numbers: 0,
    unique_customers: 0,
    unique_docs: 0,
  };

  const byPartNumber: Record<string, IngestedPhase15Page[]> = {};
  const byCustomer: Record<string, IngestedPhase15Page[]> = {};
  const docIds = new Set<string>();

  let outStream: fs.WriteStream | null = null;
  if (options.outPath) {
    outStream = fs.createWriteStream(options.outPath, { flags: "w", encoding: "utf-8" });
  }

  const stream = fs.createReadStream(jsonlPath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  try {
    for await (const rawLine of rl) {
      summary.total_lines++;
      const line = rawLine.trim();
      if (line.length === 0) continue;
      if (line.length > maxLineBytes) {
        summary.malformed++;
        continue;
      }

      let row: Phase15Row;
      try {
        row = JSON.parse(line) as Phase15Row;
      } catch {
        summary.malformed++;
        continue;
      }

      // Structural guard
      if (
        typeof row.doc_id !== "string" ||
        typeof row.page_index !== "number" ||
        !Number.isFinite(row.page_index)
      ) {
        summary.malformed++;
        continue;
      }
      summary.parsed++;

      // Error rows (worker logged render_failed_oom, FzError, etc.) count
      // toward telemetry but never feed the index.
      if (row.error || !row.fields) {
        summary.error_rows++;
        if (summary.parsed % progressInterval === 0) {
          options.onProgress?.(summary.total_lines, summary.parsed);
        }
        continue;
      }

      const f = row.fields;

      // Drawing-only gate
      if (drawingOnly && !f.is_drawing_likely) {
        if (summary.parsed % progressInterval === 0) {
          options.onProgress?.(summary.total_lines, summary.parsed);
        }
        continue;
      }
      if (f.strong_indicators < minStrong) {
        if (summary.parsed % progressInterval === 0) {
          options.onProgress?.(summary.total_lines, summary.parsed);
        }
        continue;
      }

      // Admit page
      summary.drawing_pages++;
      const partNumbers = Array.isArray(f.part_numbers) ? f.part_numbers : [];
      if (partNumbers.length > 0) summary.pages_with_pns++;
      if (f.customer) summary.pages_with_customer++;
      if (f.drawing_number) summary.pages_with_drawing_number++;
      if (f.revision) summary.pages_with_revision++;
      if (f.material) summary.pages_with_material++;
      docIds.add(row.doc_id);

      const ingested: IngestedPhase15Page = {
        doc_id: row.doc_id,
        filename: row.filename ?? "",
        disk_path: row.disk_path ?? "",
        page_index: row.page_index,
        part_numbers: partNumbers,
        drawing_number: f.drawing_number ?? null,
        revision: f.revision ?? null,
        material: f.material ?? null,
        customer: f.customer ?? null,
        strong_indicators: f.strong_indicators,
        ocr_chars: f.ocr_chars,
      };

      // Index pages without part numbers under "__unknown__" so they aren't lost
      const pnKeys = partNumbers.length > 0 ? partNumbers : ["__unknown__"];
      for (const key of pnKeys) {
        if (!byPartNumber[key]) byPartNumber[key] = [];
        byPartNumber[key].push(ingested);
      }
      if (f.customer) {
        if (!byCustomer[f.customer]) byCustomer[f.customer] = [];
        byCustomer[f.customer].push(ingested);
      }

      outStream?.write(JSON.stringify(ingested) + "\n");

      if (summary.parsed % progressInterval === 0) {
        options.onProgress?.(summary.total_lines, summary.parsed);
      }
    }
  } finally {
    rl.close();
    stream.close();
    if (outStream) {
      await new Promise<void>((resolve) => outStream!.end(resolve));
    }
  }

  summary.unique_part_numbers = Object.keys(byPartNumber).filter(
    (k) => k !== "__unknown__",
  ).length;
  summary.unique_customers = Object.keys(byCustomer).length;
  summary.unique_docs = docIds.size;

  return { summary, byPartNumber, byCustomer };
}

// ============================================================================
// SINGLETON + EXPORTS
// ============================================================================

export const blueprintOCREngine = {
  extractDimensions,
  extractGDT,
  parseTitleBlock,
  extractNotes,
  analyzeBlueprint,
  detectUnit,
  ingestPhase8JSONL,
  ingestPhase15JSONL,
};
