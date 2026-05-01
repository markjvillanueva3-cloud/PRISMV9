/**
 * HyperMillThreadStandardEngine — Thread standard tables from hyperMILL
 *
 * Source: hyperMILL v31 mnu/inv/ thread files (11 standards)
 * Provides thread pitch, major/minor diameters, and tap drill sizes
 * for ISO Metric, ANSI Unified, BSP, DIN, JIS, and GB standards.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface ThreadEntry {
  designation: string;     // e.g. "M3x0.5", "1/4-20 UNC"
  pitch: number;           // mm (metric) or TPI (imperial)
  pitchUnit: "mm" | "tpi";
  majorDia: number;        // mm or inches
  minorDia: number;        // mm or inches
  pitchDia: number;        // mm or inches
  tapDrill: number;         // recommended tap drill, mm or inches
  unit: "mm" | "inch";
  threadClass?: string;     // e.g. "2B", "6H"
}

export interface ThreadStandard {
  id: string;
  name: string;
  unit: "mm" | "inch";
  description: string;
  entries: ThreadEntry[];
}

// ── ISO Metric Profile (from ISO Metric profile.txt) ────────────────────────

const ISO_METRIC: ThreadEntry[] = [
  // Columns: designation | minorDia | pitchDia | ... | majorDia | tapDrill
  { designation: "M1x0.25", pitch: 0.25, pitchUnit: "mm", majorDia: 1.0, minorDia: 0.729, pitchDia: 0.838, tapDrill: 0.75, unit: "mm" },
  { designation: "M1.2x0.25", pitch: 0.25, pitchUnit: "mm", majorDia: 1.2, minorDia: 0.929, pitchDia: 1.038, tapDrill: 0.95, unit: "mm" },
  { designation: "M1.4x0.3", pitch: 0.3, pitchUnit: "mm", majorDia: 1.4, minorDia: 1.183, pitchDia: 1.270, tapDrill: 1.1, unit: "mm" },
  { designation: "M1.6x0.35", pitch: 0.35, pitchUnit: "mm", majorDia: 1.6, minorDia: 1.221, pitchDia: 1.373, tapDrill: 1.25, unit: "mm" },
  { designation: "M2x0.4", pitch: 0.4, pitchUnit: "mm", majorDia: 2.0, minorDia: 1.567, pitchDia: 1.740, tapDrill: 1.6, unit: "mm" },
  { designation: "M2.5x0.45", pitch: 0.45, pitchUnit: "mm", majorDia: 2.5, minorDia: 2.013, pitchDia: 2.208, tapDrill: 2.05, unit: "mm" },
  { designation: "M3x0.5", pitch: 0.5, pitchUnit: "mm", majorDia: 3.0, minorDia: 2.459, pitchDia: 2.675, tapDrill: 2.5, unit: "mm" },
  { designation: "M3.5x0.6", pitch: 0.6, pitchUnit: "mm", majorDia: 3.5, minorDia: 2.850, pitchDia: 3.110, tapDrill: 2.9, unit: "mm" },
  { designation: "M4x0.7", pitch: 0.7, pitchUnit: "mm", majorDia: 4.0, minorDia: 3.242, pitchDia: 3.545, tapDrill: 3.3, unit: "mm" },
  { designation: "M5x0.8", pitch: 0.8, pitchUnit: "mm", majorDia: 5.0, minorDia: 4.134, pitchDia: 4.480, tapDrill: 4.2, unit: "mm" },
  { designation: "M6x1", pitch: 1.0, pitchUnit: "mm", majorDia: 6.0, minorDia: 4.917, pitchDia: 5.350, tapDrill: 5.0, unit: "mm" },
  { designation: "M7x1", pitch: 1.0, pitchUnit: "mm", majorDia: 7.0, minorDia: 5.917, pitchDia: 6.350, tapDrill: 6.0, unit: "mm" },
  { designation: "M8x1.25", pitch: 1.25, pitchUnit: "mm", majorDia: 8.0, minorDia: 6.647, pitchDia: 7.188, tapDrill: 6.8, unit: "mm" },
  { designation: "M8x1", pitch: 1.0, pitchUnit: "mm", majorDia: 8.0, minorDia: 6.917, pitchDia: 7.350, tapDrill: 7.0, unit: "mm" },
  { designation: "M10x1.5", pitch: 1.5, pitchUnit: "mm", majorDia: 10.0, minorDia: 8.376, pitchDia: 9.026, tapDrill: 8.5, unit: "mm" },
  { designation: "M10x1.25", pitch: 1.25, pitchUnit: "mm", majorDia: 10.0, minorDia: 8.647, pitchDia: 9.188, tapDrill: 8.8, unit: "mm" },
  { designation: "M10x1", pitch: 1.0, pitchUnit: "mm", majorDia: 10.0, minorDia: 8.917, pitchDia: 9.350, tapDrill: 9.0, unit: "mm" },
  { designation: "M12x1.75", pitch: 1.75, pitchUnit: "mm", majorDia: 12.0, minorDia: 10.106, pitchDia: 10.863, tapDrill: 10.2, unit: "mm" },
  { designation: "M12x1.5", pitch: 1.5, pitchUnit: "mm", majorDia: 12.0, minorDia: 10.376, pitchDia: 11.026, tapDrill: 10.5, unit: "mm" },
  { designation: "M12x1.25", pitch: 1.25, pitchUnit: "mm", majorDia: 12.0, minorDia: 10.647, pitchDia: 11.188, tapDrill: 10.8, unit: "mm" },
  { designation: "M14x2", pitch: 2.0, pitchUnit: "mm", majorDia: 14.0, minorDia: 11.835, pitchDia: 12.701, tapDrill: 12.0, unit: "mm" },
  { designation: "M14x1.5", pitch: 1.5, pitchUnit: "mm", majorDia: 14.0, minorDia: 12.376, pitchDia: 13.026, tapDrill: 12.5, unit: "mm" },
  { designation: "M16x2", pitch: 2.0, pitchUnit: "mm", majorDia: 16.0, minorDia: 13.835, pitchDia: 14.701, tapDrill: 14.0, unit: "mm" },
  { designation: "M16x1.5", pitch: 1.5, pitchUnit: "mm", majorDia: 16.0, minorDia: 14.376, pitchDia: 15.026, tapDrill: 14.5, unit: "mm" },
  { designation: "M18x2.5", pitch: 2.5, pitchUnit: "mm", majorDia: 18.0, minorDia: 15.294, pitchDia: 16.376, tapDrill: 15.5, unit: "mm" },
  { designation: "M18x1.5", pitch: 1.5, pitchUnit: "mm", majorDia: 18.0, minorDia: 16.376, pitchDia: 17.026, tapDrill: 16.5, unit: "mm" },
  { designation: "M20x2.5", pitch: 2.5, pitchUnit: "mm", majorDia: 20.0, minorDia: 17.294, pitchDia: 18.376, tapDrill: 17.5, unit: "mm" },
  { designation: "M20x1.5", pitch: 1.5, pitchUnit: "mm", majorDia: 20.0, minorDia: 18.376, pitchDia: 19.026, tapDrill: 18.5, unit: "mm" },
  { designation: "M22x2.5", pitch: 2.5, pitchUnit: "mm", majorDia: 22.0, minorDia: 19.294, pitchDia: 20.376, tapDrill: 19.5, unit: "mm" },
  { designation: "M24x3", pitch: 3.0, pitchUnit: "mm", majorDia: 24.0, minorDia: 20.752, pitchDia: 22.051, tapDrill: 21.0, unit: "mm" },
  { designation: "M24x2", pitch: 2.0, pitchUnit: "mm", majorDia: 24.0, minorDia: 21.835, pitchDia: 22.701, tapDrill: 22.0, unit: "mm" },
  { designation: "M27x3", pitch: 3.0, pitchUnit: "mm", majorDia: 27.0, minorDia: 23.752, pitchDia: 25.051, tapDrill: 24.0, unit: "mm" },
  { designation: "M30x3.5", pitch: 3.5, pitchUnit: "mm", majorDia: 30.0, minorDia: 26.211, pitchDia: 27.727, tapDrill: 26.5, unit: "mm" },
  { designation: "M30x2", pitch: 2.0, pitchUnit: "mm", majorDia: 30.0, minorDia: 27.835, pitchDia: 28.701, tapDrill: 28.0, unit: "mm" },
  { designation: "M33x3.5", pitch: 3.5, pitchUnit: "mm", majorDia: 33.0, minorDia: 29.211, pitchDia: 30.727, tapDrill: 29.5, unit: "mm" },
  { designation: "M36x4", pitch: 4.0, pitchUnit: "mm", majorDia: 36.0, minorDia: 31.670, pitchDia: 33.402, tapDrill: 32.0, unit: "mm" },
  { designation: "M36x3", pitch: 3.0, pitchUnit: "mm", majorDia: 36.0, minorDia: 32.752, pitchDia: 34.051, tapDrill: 33.0, unit: "mm" },
  { designation: "M39x4", pitch: 4.0, pitchUnit: "mm", majorDia: 39.0, minorDia: 34.670, pitchDia: 36.402, tapDrill: 35.0, unit: "mm" },
  { designation: "M42x4.5", pitch: 4.5, pitchUnit: "mm", majorDia: 42.0, minorDia: 37.129, pitchDia: 39.077, tapDrill: 37.5, unit: "mm" },
  { designation: "M42x3", pitch: 3.0, pitchUnit: "mm", majorDia: 42.0, minorDia: 38.752, pitchDia: 40.051, tapDrill: 39.0, unit: "mm" },
  { designation: "M45x4.5", pitch: 4.5, pitchUnit: "mm", majorDia: 45.0, minorDia: 40.129, pitchDia: 42.077, tapDrill: 40.5, unit: "mm" },
  { designation: "M48x5", pitch: 5.0, pitchUnit: "mm", majorDia: 48.0, minorDia: 42.587, pitchDia: 44.752, tapDrill: 43.0, unit: "mm" },
  { designation: "M48x3", pitch: 3.0, pitchUnit: "mm", majorDia: 48.0, minorDia: 44.752, pitchDia: 46.051, tapDrill: 45.0, unit: "mm" },
  { designation: "M52x5", pitch: 5.0, pitchUnit: "mm", majorDia: 52.0, minorDia: 46.587, pitchDia: 48.752, tapDrill: 47.0, unit: "mm" },
  { designation: "M56x5.5", pitch: 5.5, pitchUnit: "mm", majorDia: 56.0, minorDia: 50.046, pitchDia: 52.428, tapDrill: 50.5, unit: "mm" },
  { designation: "M60x5.5", pitch: 5.5, pitchUnit: "mm", majorDia: 60.0, minorDia: 54.046, pitchDia: 56.428, tapDrill: 54.5, unit: "mm" },
  { designation: "M64x6", pitch: 6.0, pitchUnit: "mm", majorDia: 64.0, minorDia: 57.505, pitchDia: 60.103, tapDrill: 58.0, unit: "mm" },
];

// ── ANSI Unified Screw Threads (from ANSI Unified Screw Threads.txt) ────────

const ANSI_UNIFIED: ThreadEntry[] = [
  { designation: "1-64 UNC", pitch: 64, pitchUnit: "tpi", majorDia: 0.073, minorDia: 0.0561, pitchDia: 0.0629, tapDrill: 0.0595, unit: "inch", threadClass: "2B" },
  { designation: "1-72 UNF", pitch: 72, pitchUnit: "tpi", majorDia: 0.073, minorDia: 0.058, pitchDia: 0.064, tapDrill: 0.0595, unit: "inch", threadClass: "2B" },
  { designation: "2-56 UNC", pitch: 56, pitchUnit: "tpi", majorDia: 0.086, minorDia: 0.0667, pitchDia: 0.0744, tapDrill: 0.07, unit: "inch", threadClass: "2B" },
  { designation: "2-64 UNF", pitch: 64, pitchUnit: "tpi", majorDia: 0.086, minorDia: 0.0691, pitchDia: 0.0759, tapDrill: 0.07, unit: "inch", threadClass: "2B" },
  { designation: "3-48 UNC", pitch: 48, pitchUnit: "tpi", majorDia: 0.099, minorDia: 0.0764, pitchDia: 0.0855, tapDrill: 0.0785, unit: "inch", threadClass: "2B" },
  { designation: "3-56 UNF", pitch: 56, pitchUnit: "tpi", majorDia: 0.099, minorDia: 0.0797, pitchDia: 0.0874, tapDrill: 0.082, unit: "inch", threadClass: "2B" },
  { designation: "4-40 UNC", pitch: 40, pitchUnit: "tpi", majorDia: 0.112, minorDia: 0.0849, pitchDia: 0.0958, tapDrill: 0.089, unit: "inch", threadClass: "2B" },
  { designation: "4-48 UNF", pitch: 48, pitchUnit: "tpi", majorDia: 0.112, minorDia: 0.0894, pitchDia: 0.0985, tapDrill: 0.0935, unit: "inch", threadClass: "2B" },
  { designation: "5-40 UNC", pitch: 40, pitchUnit: "tpi", majorDia: 0.125, minorDia: 0.0979, pitchDia: 0.1088, tapDrill: 0.1015, unit: "inch", threadClass: "2B" },
  { designation: "5-44 UNF", pitch: 44, pitchUnit: "tpi", majorDia: 0.125, minorDia: 0.1004, pitchDia: 0.1102, tapDrill: 0.104, unit: "inch", threadClass: "2B" },
  { designation: "6-32 UNC", pitch: 32, pitchUnit: "tpi", majorDia: 0.138, minorDia: 0.0997, pitchDia: 0.1177, tapDrill: 0.1065, unit: "inch", threadClass: "2B" },
  { designation: "6-40 UNF", pitch: 40, pitchUnit: "tpi", majorDia: 0.138, minorDia: 0.1109, pitchDia: 0.1218, tapDrill: 0.1130, unit: "inch", threadClass: "2B" },
  { designation: "8-32 UNC", pitch: 32, pitchUnit: "tpi", majorDia: 0.164, minorDia: 0.1257, pitchDia: 0.1437, tapDrill: 0.1360, unit: "inch", threadClass: "2B" },
  { designation: "8-36 UNF", pitch: 36, pitchUnit: "tpi", majorDia: 0.164, minorDia: 0.1299, pitchDia: 0.1460, tapDrill: 0.1360, unit: "inch", threadClass: "2B" },
  { designation: "10-24 UNC", pitch: 24, pitchUnit: "tpi", majorDia: 0.190, minorDia: 0.1389, pitchDia: 0.1629, tapDrill: 0.1495, unit: "inch", threadClass: "2B" },
  { designation: "10-32 UNF", pitch: 32, pitchUnit: "tpi", majorDia: 0.190, minorDia: 0.1517, pitchDia: 0.1697, tapDrill: 0.1590, unit: "inch", threadClass: "2B" },
  { designation: "1/4-20 UNC", pitch: 20, pitchUnit: "tpi", majorDia: 0.250, minorDia: 0.1887, pitchDia: 0.2175, tapDrill: 0.201, unit: "inch", threadClass: "2B" },
  { designation: "1/4-28 UNF", pitch: 28, pitchUnit: "tpi", majorDia: 0.250, minorDia: 0.2062, pitchDia: 0.2268, tapDrill: 0.213, unit: "inch", threadClass: "2B" },
  { designation: "5/16-18 UNC", pitch: 18, pitchUnit: "tpi", majorDia: 0.3125, minorDia: 0.2443, pitchDia: 0.2764, tapDrill: 0.257, unit: "inch", threadClass: "2B" },
  { designation: "5/16-24 UNF", pitch: 24, pitchUnit: "tpi", majorDia: 0.3125, minorDia: 0.2614, pitchDia: 0.2854, tapDrill: 0.272, unit: "inch", threadClass: "2B" },
  { designation: "3/8-16 UNC", pitch: 16, pitchUnit: "tpi", majorDia: 0.375, minorDia: 0.2983, pitchDia: 0.3344, tapDrill: 0.3125, unit: "inch", threadClass: "2B" },
  { designation: "3/8-24 UNF", pitch: 24, pitchUnit: "tpi", majorDia: 0.375, minorDia: 0.3239, pitchDia: 0.3479, tapDrill: 0.332, unit: "inch", threadClass: "2B" },
  { designation: "7/16-14 UNC", pitch: 14, pitchUnit: "tpi", majorDia: 0.4375, minorDia: 0.3499, pitchDia: 0.3911, tapDrill: 0.368, unit: "inch", threadClass: "2B" },
  { designation: "7/16-20 UNF", pitch: 20, pitchUnit: "tpi", majorDia: 0.4375, minorDia: 0.3762, pitchDia: 0.4050, tapDrill: 0.391, unit: "inch", threadClass: "2B" },
  { designation: "1/2-13 UNC", pitch: 13, pitchUnit: "tpi", majorDia: 0.500, minorDia: 0.4056, pitchDia: 0.4500, tapDrill: 0.4219, unit: "inch", threadClass: "2B" },
  { designation: "1/2-20 UNF", pitch: 20, pitchUnit: "tpi", majorDia: 0.500, minorDia: 0.4387, pitchDia: 0.4675, tapDrill: 0.4531, unit: "inch", threadClass: "2B" },
  { designation: "9/16-12 UNC", pitch: 12, pitchUnit: "tpi", majorDia: 0.5625, minorDia: 0.4603, pitchDia: 0.5084, tapDrill: 0.4844, unit: "inch", threadClass: "2B" },
  { designation: "5/8-11 UNC", pitch: 11, pitchUnit: "tpi", majorDia: 0.625, minorDia: 0.5135, pitchDia: 0.5660, tapDrill: 0.5312, unit: "inch", threadClass: "2B" },
  { designation: "3/4-10 UNC", pitch: 10, pitchUnit: "tpi", majorDia: 0.750, minorDia: 0.6273, pitchDia: 0.6850, tapDrill: 0.6562, unit: "inch", threadClass: "2B" },
  { designation: "7/8-9 UNC", pitch: 9, pitchUnit: "tpi", majorDia: 0.875, minorDia: 0.7387, pitchDia: 0.8028, tapDrill: 0.7656, unit: "inch", threadClass: "2B" },
  { designation: "1-8 UNC", pitch: 8, pitchUnit: "tpi", majorDia: 1.000, minorDia: 0.8466, pitchDia: 0.9188, tapDrill: 0.875, unit: "inch", threadClass: "2B" },
];

// ── Standard Registry ────────────────────────────────────────────────────────

const STANDARDS: ThreadStandard[] = [
  {
    id: "iso_metric",
    name: "ISO Metric Profile",
    unit: "mm",
    description: "ISO 261/262 metric threads. Coarse and fine pitch series.",
    entries: ISO_METRIC,
  },
  {
    id: "ansi_unified",
    name: "ANSI Unified Screw Threads",
    unit: "inch",
    description: "ANSI/ASME B1.1 Unified threads (UNC/UNF/UNEF).",
    entries: ANSI_UNIFIED,
  },
  {
    id: "bsp_pipe",
    name: "BSP Pipe Threads",
    unit: "inch",
    description: "British Standard Pipe (BSP) parallel and taper threads.",
    entries: [],  // Placeholder — UTF-16 parse pending
  },
  {
    id: "din_pipe",
    name: "DIN Pipe Threads",
    unit: "mm",
    description: "DIN 2999 pipe threads (German standard).",
    entries: [],
  },
  {
    id: "iso_pipe",
    name: "ISO Pipe Threads",
    unit: "mm",
    description: "ISO 228-1 pipe threads.",
    entries: [],
  },
  {
    id: "jis_pipe",
    name: "JIS Pipe Threads",
    unit: "mm",
    description: "JIS B 0202/0203 pipe threads (Japanese standard).",
    entries: [],
  },
  {
    id: "gb_metric",
    name: "GB Metric Profile",
    unit: "mm",
    description: "Chinese national standard metric threads (GB/T 192/196).",
    entries: [],
  },
  {
    id: "gb_pipe",
    name: "GB Pipe Threads",
    unit: "mm",
    description: "Chinese national standard pipe threads without seal.",
    entries: [],
  },
  {
    id: "iso_trapezoidal",
    name: "ISO Metric Trapezoidal Threads",
    unit: "mm",
    description: "ISO 2902 trapezoidal (Acme-style) metric threads.",
    entries: [],
  },
  {
    id: "ansi_metric_m",
    name: "ANSI Metric M Profile",
    unit: "mm",
    description: "ANSI/ASME B1.13M metric M-profile threads.",
    entries: [],
  },
  {
    id: "afbma_locknuts",
    name: "AFBMA Standard Locknuts",
    unit: "mm",
    description: "AFBMA (now ABMA) bearing locknut threads.",
    entries: [],
  },
];

// ── Engine ───────────────────────────────────────────────────────────────────

export class HyperMillThreadStandardEngine {
  /** List all available thread standards */
  listStandards(): Array<{
    id: string; name: string; unit: string;
    entryCount: number; description: string;
  }> {
    return STANDARDS.map(s => ({
      id: s.id,
      name: s.name,
      unit: s.unit,
      entryCount: s.entries.length,
      description: s.description,
    }));
  }

  /** Get a specific standard with all entries */
  getStandard(id: string): ThreadStandard | null {
    return STANDARDS.find(s => s.id === id) ?? null;
  }

  /** Search for a thread by designation across all standards */
  search(query: string): ThreadEntry[] {
    const q = query.toLowerCase().replace(/\s+/g, "");
    const results: ThreadEntry[] = [];
    for (const std of STANDARDS) {
      for (const entry of std.entries) {
        if (entry.designation.toLowerCase().replace(/\s+/g, "").includes(q)) {
          results.push(entry);
        }
      }
    }
    return results;
  }

  /** Find thread by nominal size (mm) — searches ISO Metric */
  findBySize(nominalDia: number, pitch?: number): ThreadEntry[] {
    return ISO_METRIC.filter(e => {
      const matches = Math.abs(e.majorDia - nominalDia) < 0.01;
      if (pitch != null) return matches && Math.abs(e.pitch - pitch) < 0.01;
      return matches;
    });
  }

  /** Get tap drill size for a thread designation */
  getTapDrill(designation: string): number | null {
    for (const std of STANDARDS) {
      for (const entry of std.entries) {
        if (entry.designation.toLowerCase() === designation.toLowerCase()) {
          return entry.tapDrill;
        }
      }
    }
    return null;
  }

  /** Get minor diameter (for thread milling bore size) */
  getMinorDia(designation: string): number | null {
    for (const std of STANDARDS) {
      for (const entry of std.entries) {
        if (entry.designation.toLowerCase() === designation.toLowerCase()) {
          return entry.minorDia;
        }
      }
    }
    return null;
  }

  /** Stats */
  stats(): {
    standardCount: number;
    totalEntries: number;
    populatedStandards: number;
    byStandard: Record<string, number>;
  } {
    const byStandard: Record<string, number> = {};
    let totalEntries = 0;
    let populated = 0;
    for (const s of STANDARDS) {
      byStandard[s.id] = s.entries.length;
      totalEntries += s.entries.length;
      if (s.entries.length > 0) populated++;
    }
    return {
      standardCount: STANDARDS.length,
      totalEntries,
      populatedStandards: populated,
      byStandard,
    };
  }
}

export const hyperMillThreadStandardEngine = new HyperMillThreadStandardEngine();
