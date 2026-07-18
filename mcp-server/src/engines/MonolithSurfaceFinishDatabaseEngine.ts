// WIRE-EXEMPT: search() surface is reachable via intelligenceDispatcher:catalog_unified_match
// → CatalogUnifiedQueryEngine.query() (aggregator sub-query #9, MONOLITH-WIRE-V2, line ~294).
// NOT a direct-dispatch orphan — the system-viz ghost.unwired label is a FALSE POSITIVE
// (classifier follows only DIRECT dispatcher edges, missing indirect reachability through
// aggregator wrappers). The richer pure surfaces (parseCallout/findGrade/getRecommendedProcess)
// are intentionally unexposed — a deliberate consuming-galaxy opportunity (oscar SFC callout
// parsing / xray blueprint), NOT a romeo wiring gap. (slot:romeo, U-WIRE-EXEMPT-MONOLITH, 2026-06-04)
/**
 * MonolithSurfaceFinishDatabaseEngine — U-DB-MONOLITH-SURFACE-FINISH-LOADER
 *
 * TS-typed port of `PRISM_SURFACE_FINISH_DATABASE.js` from the v8.89
 * monolith extraction (`extracted_modules/databases/PRISM_SURFACE_FINISH_DATABASE.js`).
 *
 * Data + utility surface:
 *   - 5 surface-finish symbols (ISO drafting callouts: √, √○, √~, √M, √N)
 *   - 12 N-grade Ra values (N1..N12 per ISO 1302) with process recommendation
 *   - 6 application-keyed Ra guides (bearing, seal, slideways, ...)
 *   - Rz↔Ra conversion (factor 4)
 *   - parseCallout(text) — parse drawing callouts like "Ra 1.6", "Rz 6.3", "N7", "32 µin"
 *   - findGrade(value, unit) — closest N-grade for a measured Ra
 *   - getRecommendedProcess(targetRa_um) — closest achievable grade + process
 *
 * Data + small pure transforms ported (parse/find/get/convert) — they're
 * faithful to the monolith semantics. Larger physics calcs would belong
 * elsewhere, but this engine is the canonical surface-finish surface.
 *
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-SURFACE-FINISH-LOADER
 *   (slot juliett, 2026-05-26)
 * @source extracted_modules/databases/PRISM_SURFACE_FINISH_DATABASE.js v2.0
 */

// ── Schema ────────────────────────────────────────────────────────────────

export interface SurfaceFinishSymbol {
  id: string;
  symbol: string;
  meaning: string;
}

export interface NGradeSpec {
  grade: string; // N1..N12
  ra_um: number;
  ra_uin: number;
  process: string;
}

export interface ApplicationGuide {
  application: string;
  ra_um: number;
  ra_uin: number;
  grade: string;
}

export interface ParseResult {
  raw: string;
  parameter: "Ra" | "Rz" | null;
  value: number | null;
  unit: string | null;
  grade: string | null;
  process: string | null;
  direction: string | null;
  raEquivalent?: number;
  value_um?: number;
}

// ── Data tables (hand-ported from monolith v2.0) ──────────────────────────

const SYMBOLS: Record<string, Omit<SurfaceFinishSymbol, "id">> = {
  basicSymbol:       { symbol: "√",  meaning: "Machining required" },
  prohibitedSymbol:  { symbol: "√○", meaning: "Machining prohibited (as-cast, as-forged)" },
  anyProcess:        { symbol: "√~", meaning: "Any manufacturing process permitted" },
  materialRemoval:   { symbol: "√M", meaning: "Material removal required" },
  noRemoval:         { symbol: "√N", meaning: "No material removal" },
};

const N_GRADES: Record<string, Omit<NGradeSpec, "grade">> = {
  N1:  { ra_um: 0.025, ra_uin: 1,    process: "Superfinishing, lapping" },
  N2:  { ra_um: 0.05,  ra_uin: 2,    process: "Superfinishing, honing" },
  N3:  { ra_um: 0.1,   ra_uin: 4,    process: "Honing, polishing" },
  N4:  { ra_um: 0.2,   ra_uin: 8,    process: "Grinding, honing" },
  N5:  { ra_um: 0.4,   ra_uin: 16,   process: "Grinding" },
  N6:  { ra_um: 0.8,   ra_uin: 32,   process: "Finish turning, finish milling" },
  N7:  { ra_um: 1.6,   ra_uin: 63,   process: "Turning, milling" },
  N8:  { ra_um: 3.2,   ra_uin: 125,  process: "Milling, turning" },
  N9:  { ra_um: 6.3,   ra_uin: 250,  process: "Rough milling, shaping" },
  N10: { ra_um: 12.5,  ra_uin: 500,  process: "Rough machining, sawing" },
  N11: { ra_um: 25.0,  ra_uin: 1000, process: "Rough machining" },
  N12: { ra_um: 50.0,  ra_uin: 2000, process: "Sand casting, forging" },
};

const APPLICATION_GUIDE: Record<string, Omit<ApplicationGuide, "application">> = {
  bearing:          { ra_um: 0.2,  ra_uin: 8,   grade: "N4" },
  seal:             { ra_um: 0.4,  ra_uin: 16,  grade: "N5" },
  slideways:        { ra_um: 0.8,  ra_uin: 32,  grade: "N6" },
  generalMachined:  { ra_um: 1.6,  ra_uin: 63,  grade: "N7" },
  roughMachined:    { ra_um: 3.2,  ra_uin: 125, grade: "N8" },
  castSurface:      { ra_um: 12.5, ra_uin: 500, grade: "N10" },
};

/** Rz ≈ 4 × Ra (monolith approximation factor). */
export const RZ_TO_RA_FACTOR = 4;
/** Inch / micrometer conversion: 1 μin = 0.0254 μm. */
const UM_PER_UIN = 0.0254;

// ── Engine ────────────────────────────────────────────────────────────────

export class MonolithSurfaceFinishDatabaseEngine {
  // ── Data accessors ──────────────────────────────────────────────────

  listSymbols(): SurfaceFinishSymbol[] {
    return Object.entries(SYMBOLS).map(([id, s]) => ({ id, ...s }));
  }

  getSymbol(id: string): SurfaceFinishSymbol | null {
    if (typeof id !== "string" || id.trim() === "") return null;
    const s = SYMBOLS[id];
    return s ? { id, ...s } : null;
  }

  listNGrades(): NGradeSpec[] {
    return Object.entries(N_GRADES).map(([grade, spec]) => ({ grade, ...spec }));
  }

  getNGrade(grade: string): NGradeSpec | null {
    if (typeof grade !== "string" || grade.trim() === "") return null;
    const spec = N_GRADES[grade];
    return spec ? { grade, ...spec } : null;
  }

  listApplications(): ApplicationGuide[] {
    return Object.entries(APPLICATION_GUIDE).map(([application, g]) => ({ application, ...g }));
  }

  getApplication(name: string): ApplicationGuide | null {
    if (typeof name !== "string" || name.trim() === "") return null;
    const g = APPLICATION_GUIDE[name];
    return g ? { application: name, ...g } : null;
  }

  // ── Pure transforms (monolith parity) ───────────────────────────────

  /** Parse drafting callout like "Ra 1.6", "Rz 6.3", "N7", "32 µin". */
  parseCallout(callout: string): ParseResult {
    const result: ParseResult = {
      raw: callout, parameter: null, value: null, unit: null,
      grade: null, process: null, direction: null,
    };
    if (typeof callout !== "string" || callout.trim() === "") return result;

    // Ra value
    const raMatch = callout.match(/Ra\s*([0-9]+\.?[0-9]*)\s*(μm|um|µin|uin)?/i);
    if (raMatch) {
      result.parameter = "Ra";
      result.value = parseFloat(raMatch[1]);
      result.unit = raMatch[2] || "μm";
      result.grade = this.findGrade(result.value, result.unit);
      return result;
    }

    // Rz value
    const rzMatch = callout.match(/Rz\s*([0-9]+\.?[0-9]*)\s*(μm|um)?/i);
    if (rzMatch) {
      result.parameter = "Rz";
      result.value = parseFloat(rzMatch[1]);
      result.unit = rzMatch[2] || "μm";
      result.raEquivalent = result.value / RZ_TO_RA_FACTOR;
      return result;
    }

    // N-grade
    const nMatch = callout.match(/N([0-9]+)/);
    if (nMatch) {
      const grade = `N${nMatch[1]}`;
      if (N_GRADES[grade]) {
        result.parameter = "Ra";
        result.grade = grade;
        result.value = N_GRADES[grade].ra_um;
        result.unit = "μm";
        result.process = N_GRADES[grade].process;
      }
      return result;
    }

    // Micro-inch value
    const uinMatch = callout.match(/([0-9]+)\s*(µin|uin|μin)/i);
    if (uinMatch) {
      result.parameter = "Ra";
      result.value = parseInt(uinMatch[1], 10);
      result.unit = "μin";
      result.value_um = result.value * UM_PER_UIN;
      result.grade = this.findGrade(result.value, "μin");
      return result;
    }
    return result;
  }

  /** Closest N-grade for the given Ra value + unit. */
  findGrade(value: number, unit: string): string | null {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    if (typeof unit !== "string") return null;
    const targetUm = unit === "μin" || unit === "uin" ? value * UM_PER_UIN : value;
    let closest: string | null = null;
    let minDiff = Infinity;
    for (const [grade, data] of Object.entries(N_GRADES)) {
      const diff = Math.abs(data.ra_um - targetUm);
      if (diff < minDiff) {
        minDiff = diff;
        closest = grade;
      }
    }
    return closest;
  }

  /** Closest achievable N-grade for a target Ra in μm (monolith semantics: first ≥ target). */
  getRecommendedProcess(targetRa_um: number): { grade: string; achievableRa: number; process: string } | null {
    if (typeof targetRa_um !== "number" || !Number.isFinite(targetRa_um) || targetRa_um < 0) return null;
    for (const [grade, data] of Object.entries(N_GRADES)) {
      if (data.ra_um >= targetRa_um) {
        return { grade, achievableRa: data.ra_um, process: data.process };
      }
    }
    return null;
  }

  /** Unit conversion (μm↔μin, Ra↔Rz). Returns input unchanged on unknown pair. */
  convert(value: number, fromUnit: string, toUnit: string): number {
    if (typeof value !== "number" || !Number.isFinite(value)) return value;
    const key = `${fromUnit}_to_${toUnit}`;
    const conversions: Record<string, (v: number) => number> = {
      "μm_to_μin": (v) => v / UM_PER_UIN,
      "μin_to_μm": (v) => v * UM_PER_UIN,
      "Ra_to_Rz":  (v) => v * RZ_TO_RA_FACTOR,
      "Rz_to_Ra":  (v) => v / RZ_TO_RA_FACTOR,
    };
    return conversions[key] ? conversions[key](value) : value;
  }

  // ── Search (catalog bridge surface) ─────────────────────────────────

  /** Fuzzy search across symbols + N-grades + applications. */
  search(query: string, limit = 20): Array<
    | { _kind: "symbol"; record: SurfaceFinishSymbol }
    | { _kind: "n_grade"; record: NGradeSpec }
    | { _kind: "application"; record: ApplicationGuide }
  > {
    if (typeof query !== "string") return [];
    const q = query.trim().toLowerCase();
    if (q === "") return [];
    if (!Number.isInteger(limit) || limit <= 0) return [];

    const hits: Array<
      | { _kind: "symbol"; record: SurfaceFinishSymbol }
      | { _kind: "n_grade"; record: NGradeSpec }
      | { _kind: "application"; record: ApplicationGuide }
    > = [];

    for (const s of this.listSymbols()) {
      if (`${s.id} ${s.meaning}`.toLowerCase().includes(q)) {
        hits.push({ _kind: "symbol", record: s });
        if (hits.length >= limit) return hits;
      }
    }
    for (const n of this.listNGrades()) {
      if (`${n.grade} ${n.process}`.toLowerCase().includes(q)) {
        hits.push({ _kind: "n_grade", record: n });
        if (hits.length >= limit) return hits;
      }
    }
    for (const a of this.listApplications()) {
      if (`${a.application} ${a.grade}`.toLowerCase().includes(q)) {
        hits.push({ _kind: "application", record: a });
        if (hits.length >= limit) return hits;
      }
    }
    return hits;
  }

  stats(): { symbols: number; n_grades: number; applications: number; total: number } {
    const s = Object.keys(SYMBOLS).length;
    const g = Object.keys(N_GRADES).length;
    const a = Object.keys(APPLICATION_GUIDE).length;
    return { symbols: s, n_grades: g, applications: a, total: s + g + a };
  }
}

export const monolithSurfaceFinishDatabaseEngine = new MonolithSurfaceFinishDatabaseEngine();
