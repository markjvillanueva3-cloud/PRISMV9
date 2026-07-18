/**
 * PDFBlueprintDimensionExtractorEngine — Blueprint Dimension Extraction
 *
 * Extracts dimension callouts, GD&T symbols, surface finishes, thread
 * specifications, and part info from text-based PDF blueprint content.
 * Uses regex pattern matching for manufacturing drawing conventions.
 *
 * Actions: pdf_extract_dimensions
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ExtractedDimension {
  type: "linear" | "diameter" | "radius" | "angle" | "chamfer" | "depth";
  nominal: number;
  tolerance_plus: number;
  tolerance_minus: number;
  unit: "mm" | "inch";
  raw_text: string;
}

export interface GDTCallout {
  symbol: string;
  value: number;
  datums: string[];
  raw_text: string;
}

export interface SurfaceFinish {
  ra: number;
  unit: "um" | "uin";
  location?: string;
}

export interface ThreadCallout {
  spec: string;
  type: "metric" | "imperial" | "pipe";
  major_diameter?: number;
  pitch?: number;
  location?: string;
}

export interface PartInfo {
  part_number?: string;
  material?: string;
  revision?: string;
  title?: string;
  scale?: string;
  drawn_by?: string;
}

export interface DimensionExtractionResult {
  dimensions: ExtractedDimension[];
  gdt_callouts: GDTCallout[];
  surface_finishes: SurfaceFinish[];
  threads: ThreadCallout[];
  part_info: PartInfo;
}

export interface CompletenessResult {
  has_material: boolean;
  has_tolerances: boolean;
  has_surface_finish: boolean;
  has_threads: boolean;
  has_gdt: boolean;
  missing_likely: string[];
  completeness_score: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GDT_SYMBOLS: Record<string, string> = {
  "\u2300": "diameter",        // ⌀
  "\u23A1": "position",
  "\u25CE": "position",
  "\u2225": "parallelism",
  "\u27C2": "perpendicularity",
  "\u2312": "profile_line",
  "\u2313": "profile_surface",
  "\u25CB": "circularity",
  "\u232D": "cylindricity",
  "\u2197": "angularity",
  "\u21A5": "runout",
  "\u21C5": "total_runout",
  "\u25AD": "flatness",
  "\u2015": "straightness",
  "\u2316": "position",
  "\u2338": "concentricity",
  "\u232F": "symmetry",
};

// ============================================================================
// ENGINE
// ============================================================================

export class PDFBlueprintDimensionExtractorEngine {

  // --------------------------------------------------------------------------
  // extractDimensions — extract all dimension callouts from blueprint text
  // --------------------------------------------------------------------------
  extractDimensions(input: { text_content: string; drawing_units?: "mm" | "inch" }): DimensionExtractionResult {
    const { text_content, drawing_units } = input;
    const text = text_content || "";
    const defaultUnit = drawing_units || this._detectUnits(text);

    const dimensions = this._extractLinearDimensions(text, defaultUnit);
    const gdt_callouts = this._extractGDT(text);
    const surface_finishes = this._extractSurfaceFinishes(text);
    const threads = this._extractThreads(text);
    const part_info = this._extractPartInfo(text);

    return { dimensions, gdt_callouts, surface_finishes, threads, part_info };
  }

  // --------------------------------------------------------------------------
  // validateCompleteness — check if critical dimensions are present
  // --------------------------------------------------------------------------
  validateCompleteness(input: { text_content: string; drawing_units?: "mm" | "inch" }): CompletenessResult {
    const extracted = this.extractDimensions(input);

    const has_material = !!extracted.part_info.material;
    const has_tolerances = extracted.dimensions.some(d => d.tolerance_plus !== 0 || d.tolerance_minus !== 0);
    const has_surface_finish = extracted.surface_finishes.length > 0;
    const has_threads = extracted.threads.length > 0;
    const has_gdt = extracted.gdt_callouts.length > 0;

    const missing_likely: string[] = [];
    if (!has_material) missing_likely.push("material_specification");
    if (!has_tolerances) missing_likely.push("dimensional_tolerances");
    if (!has_surface_finish) missing_likely.push("surface_finish_requirements");
    if (extracted.dimensions.length === 0) missing_likely.push("linear_dimensions");
    if (!extracted.part_info.part_number) missing_likely.push("part_number");
    if (!extracted.part_info.revision) missing_likely.push("revision_level");
    if (!has_gdt && extracted.dimensions.length > 3) missing_likely.push("gdt_callouts");

    // Score: weight each category
    const weights = { material: 15, tolerances: 20, surface: 10, dims: 25, part_no: 10, rev: 5, gdt: 10, threads: 5 };
    let score = 0;
    if (has_material) score += weights.material;
    if (has_tolerances) score += weights.tolerances;
    if (has_surface_finish) score += weights.surface;
    if (extracted.dimensions.length > 0) score += weights.dims;
    if (extracted.part_info.part_number) score += weights.part_no;
    if (extracted.part_info.revision) score += weights.rev;
    if (has_gdt) score += weights.gdt;
    if (has_threads) score += weights.threads;

    return {
      has_material,
      has_tolerances,
      has_surface_finish,
      has_threads,
      has_gdt,
      missing_likely,
      completeness_score: Math.min(score, 100),
    };
  }

  // ==========================================================================
  // PRIVATE — Dimension Extraction
  // ==========================================================================

  private _detectUnits(text: string): "mm" | "inch" {
    const mmIndicators = /\bmm\b|millimeter|metric|ISO\s+\d/gi;
    const inchIndicators = /\binch|inches|ASME|ANSI|UNC|UNF|decimal\s+inch/gi;
    const mmCount = (text.match(mmIndicators) || []).length;
    const inchCount = (text.match(inchIndicators) || []).length;
    return inchCount > mmCount ? "inch" : "mm";
  }

  private _extractLinearDimensions(text: string, defaultUnit: "mm" | "inch"): ExtractedDimension[] {
    const dims: ExtractedDimension[] = [];

    // Pattern 1: value ±tolerance (e.g., "25.00 ±0.05", "25.00 +0.02/-0.01")
    const biTolRegex = /(\d+\.?\d*)\s*[±\+\-]\s*(\d+\.?\d*)\s*(?:mm|in)?/g;
    let m: RegExpExecArray | null;
    while ((m = biTolRegex.exec(text)) !== null) {
      const nominal = parseFloat(m[1]);
      const tol = parseFloat(m[2]);
      const raw = m[0];
      // Check if it's ± or +/- asymmetric
      if (raw.includes("±") || raw.includes("+-")) {
        dims.push({ type: "linear", nominal, tolerance_plus: tol, tolerance_minus: -tol, unit: defaultUnit, raw_text: raw });
      } else if (raw.includes("+")) {
        dims.push({ type: "linear", nominal, tolerance_plus: tol, tolerance_minus: 0, unit: defaultUnit, raw_text: raw });
      } else {
        dims.push({ type: "linear", nominal, tolerance_plus: 0, tolerance_minus: -tol, unit: defaultUnit, raw_text: raw });
      }
    }

    // Pattern 2: asymmetric tolerance "25.00 +0.02 -0.01"
    const asymTolRegex = /(\d+\.?\d*)\s*\+\s*(\d+\.?\d*)\s*[-\/]\s*(\d+\.?\d*)/g;
    while ((m = asymTolRegex.exec(text)) !== null) {
      const nominal = parseFloat(m[1]);
      // Check if already captured
      if (!dims.some(d => Math.abs(d.nominal - nominal) < 0.0001 && d.raw_text === m![0])) {
        dims.push({
          type: "linear", nominal,
          tolerance_plus: parseFloat(m[2]),
          tolerance_minus: -parseFloat(m[3]),
          unit: defaultUnit, raw_text: m[0],
        });
      }
    }

    // Pattern 3: Diameter "Ø12.00", "⌀12.00", "DIA 12.00", "∅12.00"
    const diaRegex = /[Ø⌀∅]\s*(\d+\.?\d*)(?:\s*[±]\s*(\d+\.?\d*))?/g;
    while ((m = diaRegex.exec(text)) !== null) {
      const nominal = parseFloat(m[1]);
      const tol = m[2] ? parseFloat(m[2]) : 0;
      dims.push({ type: "diameter", nominal, tolerance_plus: tol, tolerance_minus: -tol, unit: defaultUnit, raw_text: m[0] });
    }

    // Also "DIA" or "DIAM" prefix
    const diaTextRegex = /(?:DIA(?:M(?:ETER)?)?)\s*(\d+\.?\d*)(?:\s*[±]\s*(\d+\.?\d*))?/gi;
    while ((m = diaTextRegex.exec(text)) !== null) {
      const nominal = parseFloat(m[1]);
      const tol = m[2] ? parseFloat(m[2]) : 0;
      dims.push({ type: "diameter", nominal, tolerance_plus: tol, tolerance_minus: -tol, unit: defaultUnit, raw_text: m[0] });
    }

    // Pattern 4: Radius "R5.00", "RAD 5.00"
    const radRegex = /(?:^|\s)R\s*(\d+\.?\d*)(?:\s*[±]\s*(\d+\.?\d*))?/gm;
    while ((m = radRegex.exec(text)) !== null) {
      const nominal = parseFloat(m[1]);
      const tol = m[2] ? parseFloat(m[2]) : 0;
      dims.push({ type: "radius", nominal, tolerance_plus: tol, tolerance_minus: -tol, unit: defaultUnit, raw_text: m[0].trim() });
    }

    // Pattern 5: Angle "45°±0.5°", "45 DEG"
    const angleRegex = /(\d+\.?\d*)\s*°(?:\s*[±]\s*(\d+\.?\d*)\s*°?)?/g;
    while ((m = angleRegex.exec(text)) !== null) {
      const nominal = parseFloat(m[1]);
      const tol = m[2] ? parseFloat(m[2]) : 0;
      dims.push({ type: "angle", nominal, tolerance_plus: tol, tolerance_minus: -tol, unit: defaultUnit, raw_text: m[0] });
    }

    // Pattern 6: Chamfer "C0.5", "0.5x45°", "CHAMFER 0.5"
    const chamRegex = /(?:C\s*(\d+\.?\d*)|(\d+\.?\d*)\s*[xX×]\s*45\s*°|CHAMFER\s+(\d+\.?\d*))/gi;
    while ((m = chamRegex.exec(text)) !== null) {
      const nominal = parseFloat(m[1] || m[2] || m[3]);
      if (!isNaN(nominal)) {
        dims.push({ type: "chamfer", nominal, tolerance_plus: 0, tolerance_minus: 0, unit: defaultUnit, raw_text: m[0] });
      }
    }

    // Pattern 7: Depth "DEPTH 10.00", "↧10.00"
    const depthRegex = /(?:DEPTH|DP|↧)\s*(\d+\.?\d*)(?:\s*[±]\s*(\d+\.?\d*))?/gi;
    while ((m = depthRegex.exec(text)) !== null) {
      const nominal = parseFloat(m[1]);
      const tol = m[2] ? parseFloat(m[2]) : 0;
      dims.push({ type: "depth", nominal, tolerance_plus: tol, tolerance_minus: -tol, unit: defaultUnit, raw_text: m[0] });
    }

    return dims;
  }

  // ==========================================================================
  // PRIVATE — GD&T Extraction
  // ==========================================================================

  private _extractGDT(text: string): GDTCallout[] {
    const callouts: GDTCallout[] = [];

    // Pattern: symbol value |datum_A|datum_B|datum_C|
    // Also: POSITION 0.05 A B C, FLATNESS 0.02, etc.
    const gdtTextRegex = /\b(POSITION|FLATNESS|PARALLELISM|PERPENDICULARITY|CIRCULARITY|CYLINDRICITY|PROFILE|RUNOUT|TOTAL\s*RUNOUT|CONCENTRICITY|SYMMETRY|STRAIGHTNESS|ANGULARITY)\s+(?:[⌀Ø∅]\s*)?(\d+\.?\d*)\s*(?:\|([A-Z])\|(?:([A-Z])\|)?(?:([A-Z])\|)?)?/gi;

    let m: RegExpExecArray | null;
    while ((m = gdtTextRegex.exec(text)) !== null) {
      const datums: string[] = [];
      if (m[3]) datums.push(m[3]);
      if (m[4]) datums.push(m[4]);
      if (m[5]) datums.push(m[5]);
      callouts.push({
        symbol: m[1].toLowerCase().replace(/\s+/g, "_"),
        value: parseFloat(m[2]),
        datums,
        raw_text: m[0],
      });
    }

    // Unicode symbol pattern: ⌀ value |A|B|
    const unicodeGdtRegex = /([⌀∅⏥⊥◎⌓⟂⌖⊙▭])\s*(\d+\.?\d*)\s*(?:\|([A-Z])\|)?(?:\s*\|?([A-Z])\|?)?(?:\s*\|?([A-Z])\|?)?/g;
    while ((m = unicodeGdtRegex.exec(text)) !== null) {
      const sym = m[1];
      const datums: string[] = [];
      if (m[3]) datums.push(m[3]);
      if (m[4]) datums.push(m[4]);
      if (m[5]) datums.push(m[5]);

      const symbolName = GDT_SYMBOLS[sym] || "unknown";
      callouts.push({
        symbol: symbolName,
        value: parseFloat(m[2]),
        datums,
        raw_text: m[0],
      });
    }

    return callouts;
  }

  // ==========================================================================
  // PRIVATE — Surface Finish
  // ==========================================================================

  private _extractSurfaceFinishes(text: string): SurfaceFinish[] {
    const finishes: SurfaceFinish[] = [];

    // Pattern: "Ra 0.8", "Ra=1.6", "Ra 0.8 µm", "Ra 32 µin"
    const raRegex = /Ra\s*[=:]?\s*(\d+\.?\d*)\s*(µm|um|µin|uin|μm|μin)?/gi;
    let m: RegExpExecArray | null;
    while ((m = raRegex.exec(text)) !== null) {
      const ra = parseFloat(m[1]);
      const unitStr = (m[2] || "").toLowerCase();
      const unit: "um" | "uin" = unitStr.includes("in") ? "uin" : "um";
      finishes.push({ ra, unit });
    }

    // Pattern: Surface finish symbols with numeric values
    const sfRegex = /(?:surface\s*finish|finish)\s*[=:]?\s*(\d+\.?\d*)\s*(µm|um|µin|uin)?/gi;
    while ((m = sfRegex.exec(text)) !== null) {
      const ra = parseFloat(m[1]);
      const unitStr = (m[2] || "").toLowerCase();
      const unit: "um" | "uin" = unitStr.includes("in") ? "uin" : "um";
      finishes.push({ ra, unit });
    }

    // Pattern: Rz values
    const rzRegex = /Rz\s*[=:]?\s*(\d+\.?\d*)\s*(µm|um)?/gi;
    while ((m = rzRegex.exec(text)) !== null) {
      // Convert Rz to approximate Ra (Ra ≈ Rz/4)
      const rz = parseFloat(m[1]);
      finishes.push({ ra: rz / 4, unit: "um", location: `Rz=${rz}` });
    }

    return finishes;
  }

  // ==========================================================================
  // PRIVATE — Thread Extraction
  // ==========================================================================

  private _extractThreads(text: string): ThreadCallout[] {
    const threads: ThreadCallout[] = [];

    // Metric: "M8x1.25", "M10", "M6x1.0-6H"
    const metricRegex = /M(\d+\.?\d*)(?:\s*[xX×]\s*(\d+\.?\d*))?(?:\s*-\s*(\d[A-Z]\d?[A-Z]?))?/g;
    let m: RegExpExecArray | null;
    while ((m = metricRegex.exec(text)) !== null) {
      const major = parseFloat(m[1]);
      const pitch = m[2] ? parseFloat(m[2]) : undefined;
      threads.push({
        spec: m[0],
        type: "metric",
        major_diameter: major,
        pitch,
      });
    }

    // Imperial: "1/4-20 UNC", "3/8-16 UNF", "#10-32 UNF"
    const impRegex = /(?:(\d+)\/(\d+)|#(\d+))\s*-\s*(\d+)\s*(UNC|UNF|UNEF|UN)/gi;
    while ((m = impRegex.exec(text)) !== null) {
      let major: number | undefined;
      if (m[1] && m[2]) {
        major = parseFloat(m[1]) / parseFloat(m[2]) * 25.4; // convert to mm
      } else if (m[3]) {
        // Numbered sizes (#0 = 0.060", #1 = 0.073", etc.)
        major = (0.060 + parseInt(m[3]) * 0.013) * 25.4;
      }
      const tpi = parseInt(m[4]);
      threads.push({
        spec: m[0],
        type: "imperial",
        major_diameter: major,
        pitch: tpi > 0 ? 25.4 / tpi : undefined,
      });
    }

    // Pipe: "NPT 1/4", "BSPP 1/2", "G1/2"
    const pipeRegex = /(?:(NPT|NPTF|BSPT|BSPP|G)\s*(\d+\/?\d*)|(\d+\/?\d*)\s*(NPT|NPTF|BSPT|BSPP))/gi;
    while ((m = pipeRegex.exec(text)) !== null) {
      threads.push({
        spec: m[0],
        type: "pipe",
      });
    }

    return threads;
  }

  // ==========================================================================
  // PRIVATE — Part Info
  // ==========================================================================

  private _extractPartInfo(text: string): PartInfo {
    const info: PartInfo = {};

    // Part number: "P/N: 12345", "PART NO: ABC-123", "PN: X-Y-Z"
    const pnRegex = /(?:P\/?N|PART\s*(?:NO|NUMBER|#))\s*[.:=]?\s*([A-Z0-9][\w\-\.]*)/i;
    const pnMatch = text.match(pnRegex);
    if (pnMatch) info.part_number = pnMatch[1];

    // Material: "MATERIAL: 6061-T6", "MAT'L: SS 304", "MATERIAL SPEC: AISI 1045"
    const matRegex = /(?:MATERIAL|MAT'?L|MATL)\s*(?:SPEC)?\s*[.:=]?\s*([A-Z0-9][\w\s\-\.\/]*?)(?:\n|$|FINISH|HEAT|COAT|SCALE|DWG)/i;
    const matMatch = text.match(matRegex);
    if (matMatch) info.material = matMatch[1].trim();

    // Revision: "REV: A", "REVISION: 3", "REV A"
    const revRegex = /(?:REV(?:ISION)?)\s*[.:=]?\s*([A-Z0-9]+)/i;
    const revMatch = text.match(revRegex);
    if (revMatch) info.revision = revMatch[1];

    // Title: "TITLE: Widget Bracket"
    const titleRegex = /(?:TITLE|DESCRIPTION|DESC)\s*[.:=]?\s*(.+?)(?:\n|$)/i;
    const titleMatch = text.match(titleRegex);
    if (titleMatch) info.title = titleMatch[1].trim();

    // Scale: "SCALE: 1:1", "SCALE 2:1"
    const scaleRegex = /SCALE\s*[.:=]?\s*(\d+\s*:\s*\d+)/i;
    const scaleMatch = text.match(scaleRegex);
    if (scaleMatch) info.scale = scaleMatch[1];

    // Drawn by: "DRAWN BY: J.SMITH", "DRAWN: JS"
    const drawnRegex = /DRAWN\s*(?:BY)?\s*[.:=]?\s*([A-Z][\w\s.]+?)(?:\n|$|DATE|CHECK|APPRO)/i;
    const drawnMatch = text.match(drawnRegex);
    if (drawnMatch) info.drawn_by = drawnMatch[1].trim();

    return info;
  }
}

// Singleton export
export const pdfBlueprintDimensionExtractorEngine = new PDFBlueprintDimensionExtractorEngine();
