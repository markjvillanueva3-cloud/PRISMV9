/**
 * SurfaceFinishDatabaseEngine — ISO 1302 N-grade surface finish reference
 *
 * N-grade to Ra/Rz conversion, callout parsing, unit conversion,
 * application guide, and recommended process lookup.
 *
 * Source: PRISM v8.89 monolith PRISM_SURFACE_FINISH_DATABASE.js
 */

export interface RaEntry {
  grade: string;
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

export interface CalloutResult {
  raw: string;
  parameter: string | null;
  value: number | null;
  unit: string | null;
  grade: string | null;
  process: string | null;
  ra_equivalent_um?: number;
}

const RA_VALUES: Record<string, { ra_um: number; ra_uin: number; process: string }> = {
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

const APPLICATION_GUIDE: Record<string, { ra_um: number; ra_uin: number; grade: string }> = {
  bearing:         { ra_um: 0.2,  ra_uin: 8,   grade: "N4" },
  seal:            { ra_um: 0.4,  ra_uin: 16,  grade: "N5" },
  slideways:       { ra_um: 0.8,  ra_uin: 32,  grade: "N6" },
  generalMachined: { ra_um: 1.6,  ra_uin: 63,  grade: "N7" },
  roughMachined:   { ra_um: 3.2,  ra_uin: 125, grade: "N8" },
  castSurface:     { ra_um: 12.5, ra_uin: 500, grade: "N10" },
};

const RZ_TO_RA_FACTOR = 4;

export class SurfaceFinishDatabaseEngine {
  /** Get all N-grade entries */
  getAllGrades(): RaEntry[] {
    return Object.entries(RA_VALUES).map(([grade, data]) => ({ grade, ...data }));
  }

  /** Get specific N-grade */
  getGrade(grade: string): RaEntry | null {
    const normalized = grade.toUpperCase().startsWith('N') ? grade.toUpperCase() : `N${grade}`;
    const data = RA_VALUES[normalized];
    return data ? { grade: normalized, ...data } : null;
  }

  /** Find closest N-grade from Ra value */
  findGrade(value: number, unit: 'um' | 'uin' = 'um'): RaEntry {
    const targetUm = unit === 'uin' ? value * 0.0254 : value;
    let closest: RaEntry | null = null;
    let minDiff = Infinity;
    for (const [grade, data] of Object.entries(RA_VALUES)) {
      const diff = Math.abs(data.ra_um - targetUm);
      if (diff < minDiff) {
        minDiff = diff;
        closest = { grade, ...data };
      }
    }
    return closest!;
  }

  /** Convert between units */
  convert(value: number, from: string, to: string): number {
    const conversions: Record<string, (v: number) => number> = {
      'um_uin': (v) => v / 0.0254,
      'uin_um': (v) => v * 0.0254,
      'Ra_Rz': (v) => v * RZ_TO_RA_FACTOR,
      'Rz_Ra': (v) => v / RZ_TO_RA_FACTOR,
    };
    const key = `${from}_${to}`;
    return conversions[key]?.(value) ?? value;
  }

  /** Parse a surface finish callout string */
  parseCallout(callout: string): CalloutResult {
    const result: CalloutResult = { raw: callout, parameter: null, value: null, unit: null, grade: null, process: null };

    // Ra value: Ra 1.6 or Ra1.6
    const raMatch = callout.match(/Ra\s*([0-9]+\.?[0-9]*)\s*(μm|um|µin|uin)?/i);
    if (raMatch) {
      result.parameter = "Ra";
      result.value = parseFloat(raMatch[1]);
      result.unit = raMatch[2] || "μm";
      const isUin = result.unit.toLowerCase().includes('in');
      const entry = this.findGrade(result.value, isUin ? 'uin' : 'um');
      result.grade = entry.grade;
      result.process = entry.process;
      return result;
    }

    // Rz value
    const rzMatch = callout.match(/Rz\s*([0-9]+\.?[0-9]*)\s*(μm|um)?/i);
    if (rzMatch) {
      result.parameter = "Rz";
      result.value = parseFloat(rzMatch[1]);
      result.unit = rzMatch[2] || "μm";
      result.ra_equivalent_um = result.value / RZ_TO_RA_FACTOR;
      const entry = this.findGrade(result.ra_equivalent_um, 'um');
      result.grade = entry.grade;
      result.process = entry.process;
      return result;
    }

    // N-grade: N6, N7, etc.
    const nMatch = callout.match(/N([0-9]+)/);
    if (nMatch) {
      const grade = `N${nMatch[1]}`;
      const data = RA_VALUES[grade];
      if (data) {
        result.parameter = "Ra";
        result.grade = grade;
        result.value = data.ra_um;
        result.unit = "μm";
        result.process = data.process;
      }
      return result;
    }

    // Micro-inch value: 32 µin or 32 uin
    const uinMatch = callout.match(/([0-9]+)\s*(µin|uin|μin)/i);
    if (uinMatch) {
      result.parameter = "Ra";
      result.value = parseInt(uinMatch[1]);
      result.unit = "μin";
      result.ra_equivalent_um = result.value * 0.0254;
      const entry = this.findGrade(result.value, 'uin');
      result.grade = entry.grade;
      result.process = entry.process;
      return result;
    }

    return result;
  }

  /** Get application guide */
  getApplicationGuide(): ApplicationGuide[] {
    return Object.entries(APPLICATION_GUIDE).map(([application, data]) => ({ application, ...data }));
  }

  /** Get recommended process for target Ra */
  getRecommendedProcess(targetRa_um: number): { grade: string; achievableRa: number; process: string } | null {
    const entries = Object.entries(RA_VALUES).sort((a, b) => a[1].ra_um - b[1].ra_um);
    for (const [grade, data] of entries) {
      if (data.ra_um >= targetRa_um) {
        return { grade, achievableRa: data.ra_um, process: data.process };
      }
    }
    return null;
  }

  /** Stats */
  stats(): { grades: number; applications: number; rz_to_ra_factor: number } {
    return {
      grades: Object.keys(RA_VALUES).length,
      applications: Object.keys(APPLICATION_GUIDE).length,
      rz_to_ra_factor: RZ_TO_RA_FACTOR,
    };
  }
}

export const surfaceFinishDatabaseEngine = new SurfaceFinishDatabaseEngine();
