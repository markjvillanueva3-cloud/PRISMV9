/**
 * CADAutomationMockLayer — extension-indexed fixture bank for CAD bridges.
 *
 * The six CAD automation bridges (SolidWorks/Inventor/FreeCAD/Mastercam/
 * Fusion360/hyperMILL) each expose the same open/getGeometry/getToolpaths/
 * getOperationTree/exportSTEP/close surface, but in mock mode (PRISM_CAD_MOCK=1)
 * every bridge ships its own local fixture table. When the CADAutomationRouter
 * (U-CAUT10) serves arbitrary file types in CI it needs a single, canonical
 * source of truth it can index by extension — that's this engine.
 *
 * What it provides
 *   - geometryFor(ext)      — canonical entity-count envelope per extension
 *   - operationTreeFor(ext) — canonical op count + cycle-code palette per ext
 *   - toolpathsFor(ext)     — flattened op list (equivalent to tree flatten)
 *   - fingerprint(ext)      — stable SHA-ish fingerprint for regression tests
 *   - listSupported()       — enumerate every extension the mock layer covers
 *
 * Design rules
 *   - PURE: no I/O, no date, no randomness — same inputs → identical outputs.
 *   - STABLE: counts are frozen constants; adding new entities requires
 *     updating the fingerprint map in tandem (the U-CAUT12 smoke enforces this).
 *   - FORMAT-AGNOSTIC: the envelope shape matches the common union type the
 *     router returns, so tests can assert against it uniformly.
 *
 * @engine CADAutomationMockLayer
 * @shortcode E1306
 * @milestone CAD-AUTOMATION-MS0/U-CAUT09
 */

// ── Supported extensions ──────────────────────────────────────────────────────

export type SupportedCADExt =
  | ".sldprt"
  | ".sldasm"
  | ".ipt"
  | ".iam"
  | ".FCStd"
  | ".FCStd1"
  | ".mcam"
  | ".mcx"
  | ".mcx-8"
  | ".f3d"
  | ".f3z"
  | ".hmc";

// ── Generic envelope shapes (format-agnostic superset) ────────────────────────

export interface CADMockGeometryEnvelope {
  ext: SupportedCADExt;
  /** High-level bucket counts — not format-specific; the router returns this shape. */
  curves: number;
  surfaces: number;
  solids: number;
  points: number;
  totalEntities: number;
}

export interface CADMockOperationEnvelope {
  ext: SupportedCADExt;
  /** Number of distinct jobs / setups in the project. */
  jobCount: number;
  /** Total operation count across all jobs. */
  totalOperations: number;
  /** Distinct cycle-code palette reported by the bridge. */
  cyclePalette: ReadonlyArray<string>;
}

export interface CADMockToolpathOp {
  index: number;
  cycleCode: string;
  toolDiameter_mm: number;
  spindleRpm: number;
  feedRate_mmpm: number;
}

// ── Canonical fixture table ───────────────────────────────────────────────────
//
// Each entry's numbers match the mock data hardcoded inside the corresponding
// AutomationBridge so that a round-trip through the router yields consistent
// counts regardless of which bridge actually answered.

interface FixtureSpec {
  geom: Omit<CADMockGeometryEnvelope, "ext">;
  op: Omit<CADMockOperationEnvelope, "ext">;
}

const FIXTURES: Record<SupportedCADExt, FixtureSpec> = {
  ".sldprt": {
    geom: { curves: 0, surfaces: 12, solids: 3, points: 0, totalEntities: 15 },
    op: { jobCount: 0, totalOperations: 0, cyclePalette: [] },
  },
  ".sldasm": {
    geom: { curves: 0, surfaces: 36, solids: 9, points: 0, totalEntities: 45 },
    op: { jobCount: 0, totalOperations: 0, cyclePalette: [] },
  },
  ".ipt": {
    geom: { curves: 0, surfaces: 14, solids: 3, points: 0, totalEntities: 17 },
    op: { jobCount: 0, totalOperations: 0, cyclePalette: [] },
  },
  ".iam": {
    geom: { curves: 0, surfaces: 42, solids: 11, points: 0, totalEntities: 53 },
    op: { jobCount: 0, totalOperations: 0, cyclePalette: [] },
  },
  ".FCStd": {
    geom: { curves: 24, surfaces: 16, solids: 2, points: 4, totalEntities: 46 },
    op: {
      jobCount: 1,
      totalOperations: 18,
      cyclePalette: ["Pocket", "Profile", "Drilling", "Surface", "Adaptive"],
    },
  },
  ".FCStd1": {
    geom: { curves: 24, surfaces: 16, solids: 2, points: 4, totalEntities: 46 },
    op: {
      jobCount: 1,
      totalOperations: 18,
      cyclePalette: ["Pocket", "Profile", "Drilling", "Surface", "Adaptive"],
    },
  },
  ".mcam": {
    geom: { curves: 20, surfaces: 10, solids: 2, points: 0, totalEntities: 32 },
    op: {
      jobCount: 1,
      totalOperations: 24,
      cyclePalette: [
        "Dynamic2D",
        "Dynamic3D",
        "Contour",
        "Pocket",
        "Drill",
        "HighSpeed",
      ],
    },
  },
  ".mcx": {
    geom: { curves: 20, surfaces: 10, solids: 2, points: 0, totalEntities: 32 },
    op: {
      jobCount: 1,
      totalOperations: 24,
      cyclePalette: [
        "Dynamic2D",
        "Dynamic3D",
        "Contour",
        "Pocket",
        "Drill",
        "HighSpeed",
      ],
    },
  },
  ".mcx-8": {
    geom: { curves: 20, surfaces: 10, solids: 2, points: 0, totalEntities: 32 },
    op: {
      jobCount: 1,
      totalOperations: 24,
      cyclePalette: [
        "Dynamic2D",
        "Dynamic3D",
        "Contour",
        "Pocket",
        "Drill",
        "HighSpeed",
      ],
    },
  },
  ".f3d": {
    geom: { curves: 0, surfaces: 28, solids: 3, points: 0, totalEntities: 31 },
    op: {
      jobCount: 1,
      totalOperations: 22,
      cyclePalette: [
        "Adaptive2D",
        "Pocket2D",
        "Contour2D",
        "Drill",
        "Bore",
        "Face",
      ],
    },
  },
  ".f3z": {
    geom: { curves: 0, surfaces: 28, solids: 3, points: 0, totalEntities: 31 },
    op: {
      jobCount: 1,
      totalOperations: 22,
      cyclePalette: [
        "Adaptive2D",
        "Pocket2D",
        "Contour2D",
        "Drill",
        "Bore",
        "Face",
      ],
    },
  },
  ".hmc": {
    geom: { curves: 36, surfaces: 18, solids: 2, points: 0, totalEntities: 56 },
    op: {
      jobCount: 1,
      totalOperations: 32,
      cyclePalette: [
        "3DPocketRoughing",
        "3DZLevel",
        "3DSurface",
        "5AxisSwarf",
        "5AxisTilt",
        "MillingFinishing",
        "DrillCycle",
        "TappingCycle",
      ],
    },
  },
};

// ── Engine ────────────────────────────────────────────────────────────────────

export class CADAutomationMockLayer {
  listSupported(): SupportedCADExt[] {
    return Object.keys(FIXTURES) as SupportedCADExt[];
  }

  supports(ext: string): ext is SupportedCADExt {
    return Object.prototype.hasOwnProperty.call(FIXTURES, ext);
  }

  geometryFor(ext: SupportedCADExt): CADMockGeometryEnvelope {
    const f = this.requireFixture(ext);
    return { ext, ...f.geom };
  }

  operationTreeFor(ext: SupportedCADExt): CADMockOperationEnvelope {
    const f = this.requireFixture(ext);
    return { ext, ...f.op };
  }

  toolpathsFor(ext: SupportedCADExt): CADMockToolpathOp[] {
    const f = this.requireFixture(ext);
    const n = f.op.totalOperations;
    const palette = f.op.cyclePalette.length > 0 ? f.op.cyclePalette : ["NoOp"];
    const sizes = [6, 8, 10, 12, 16, 20];
    const ops: CADMockToolpathOp[] = [];
    for (let i = 0; i < n; i++) {
      ops.push({
        index: i,
        cycleCode: palette[i % palette.length],
        toolDiameter_mm: sizes[i % sizes.length],
        spindleRpm: 8000 + i * 150,
        feedRate_mmpm: 1200 + i * 80,
      });
    }
    return ops;
  }

  /**
   * Deterministic fingerprint for regression testing — any change to the fixture
   * table for a given extension is expected to change this string. The U-CAUT12
   * integration smoke pins the fingerprint map to catch silent drift.
   */
  fingerprint(ext: SupportedCADExt): string {
    const f = this.requireFixture(ext);
    const g = f.geom;
    const o = f.op;
    return [
      ext,
      g.curves,
      g.surfaces,
      g.solids,
      g.points,
      g.totalEntities,
      o.jobCount,
      o.totalOperations,
      o.cyclePalette.join("|"),
    ].join(":");
  }

  /**
   * Returns all fingerprints as a map — used by the U-CAUT12 smoke to assert
   * nothing drifted since the last committed build.
   */
  allFingerprints(): Record<SupportedCADExt, string> {
    const out = {} as Record<SupportedCADExt, string>;
    for (const ext of this.listSupported()) {
      out[ext] = this.fingerprint(ext);
    }
    return out;
  }

  // ── internals ───────────────────────────────────────────────────────────────

  private requireFixture(ext: SupportedCADExt): FixtureSpec {
    const f = FIXTURES[ext];
    if (!f) {
      throw new Error(`[CADAutomationMockLayer] Unsupported extension: ${ext}`);
    }
    return f;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const cadAutomationMockLayer = new CADAutomationMockLayer();
