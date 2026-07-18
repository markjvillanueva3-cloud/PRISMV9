/**
 * cad-validation-corpus.ts — CAD-DRAW-MAX-MS1/U-VALIDATION-50-CORPUS
 *
 * Curated starter corpus of 12 JM-Die-derived validation cases spanning
 * mill / lathe / wire-EDM. Each case is a {@link ValidationTestCase} that
 * the CADDrawAnyPartValidationHarnessEngine can run end-to-end against
 * the orchestrator.
 *
 * Scope (v1, this unit):
 *   - 12 hand-crafted cases (4 mill + 4 lathe + 4 wire-EDM)
 *   - Realistic JM Die patterns: OD pins, hard turns, threaded shafts,
 *     punches, dies, pockets, holes, fillets, GD&T-tagged features
 *   - All cases use the orchestrator's DrawAnyPartInput shape directly
 *
 * Expansion to 50 cases is DATA WORK (named follow-up U-VALIDATION-50-EXPAND).
 * The engineering deliverable is this corpus module: a typed, immutable,
 * importable array that ships in the bundle and is callable from any
 * harness consumer (CLI, dispatcher, test).
 *
 * Refs: CADDrawAnyPartValidationHarnessEngine, CADDrawAnyPartOrchestratorEngine.
 */

import type { ValidationTestCase } from "../engines/CADDrawAnyPartValidationHarnessEngine.js";

// ── Mill cases (4) ───────────────────────────────────────────────────────────

const MILL_CASES: ReadonlyArray<ValidationTestCase> = [
  {
    id: "MILL-001",
    description: "JM Die ITW alignment pocket — 1.000 x 0.500 x 0.250 deep, R0.062 corners, +0.0005/-0.000",
    input: {
      intent: "mill a 1.000 by 0.500 pocket 0.250 deep with R0.062 corner fillets, +0.0005/-0.000 tolerance, 32 Ra finish",
      // ToleranceCallout models tolerances only (tolerance_mm); surface/material annotations stay in
      // intent/description. Bands converted INCH->mm (xray units-first): 0.0005 in -> 0.0127 mm.
      callouts: [
        { tolerance_mm: 0.0127 }, // +0.0005/-0.000 on width 1.000 (0.0005 in band)
        { tolerance_mm: 0.0127 }, // +0.0005/-0.000 on length 0.500 (0.0005 in band)
      ],
    },
    expectedOpLogMin: 2,
  },
  {
    id: "MILL-002",
    description: "JM Die Alcoa hold-down — 4-hole 0.281 thru pattern on 1.250 x 1.250 bolt circle",
    input: {
      intent: "drill 4 thru holes 0.281 dia at 4 corners of a 1.250 bolt circle",
    },
    expectedOpLogMin: 4,
  },
  {
    id: "MILL-003",
    description: "JM Die Optimas slot — 0.187 wide x 0.625 long thru, sharp corners",
    input: {
      intent: "mill a 0.187 wide by 0.625 long thru slot with sharp corners, 63 Ra interior",
    },
    expectedOpLogMin: 2,
  },
  {
    id: "MILL-004",
    description: "JM Die Holo-Krome plate — 3D contour with 0.030 fillet, ±0.001 tolerance",
    input: {
      intent: "contour 3D surface with R0.030 fillet on all edges, ±0.001 tolerance, 32 Ra finish",
      callouts: [
        { tolerance_mm: 0.0508 }, // +/-0.001 on all surfaces (0.002 in band -> mm); surface "32 Ra finish" folded into intent
      ],
    },
    expectedOpLogMin: 3,
  },
];

// ── Lathe cases (4) ──────────────────────────────────────────────────────────

const LATHE_CASES: ReadonlyArray<ValidationTestCase> = [
  {
    id: "LATHE-001",
    description: "JM Die SFS OD pin — 0.500 OD x 1.250 long, ±0.0005, 16 Ra",
    input: {
      intent: "turn OD pin 0.500 diameter by 1.250 long, ±0.0005 tolerance, 16 Ra finish",
      callouts: [
        { tolerance_mm: 0.0254 }, // +/-0.0005 OD (0.001 in band -> mm)
      ], // surface "16 Ra" stays in intent
    },
    expectedOpLogMin: 2,
  },
  {
    id: "LATHE-002",
    description: "JM Die Fastenal threaded shaft — 3/8-16 UNC class 2A, 1.500 long",
    input: {
      intent: "turn shaft to 0.375 OD then cut 3/8-16 UNC class 2A external thread 1.500 long",
    },
    expectedOpLogMin: 3,
  },
  {
    id: "LATHE-003",
    description: "JM Die hard turn D2 punch — 0.625 OD x 2.000 long, 58-62 HRC, ±0.0003",
    input: {
      intent: "hard turn D2 tool steel punch 0.625 OD by 2.000 long at 58-62 HRC, ±0.0003",
      callouts: [
        { tolerance_mm: 0.01524 }, // +/-0.0003 OD (0.0006 in band -> mm)
      ], // material "D2 tool steel HRC 58-62" stays in intent
    },
    expectedOpLogMin: 2,
  },
  {
    id: "LATHE-004",
    description: "JM Die grooved bushing — 0.750 OD with 0.062 wide x 0.030 deep groove at 0.500 from face",
    input: {
      intent: "turn 0.750 OD bushing with 0.062 wide by 0.030 deep groove 0.500 from face",
    },
    expectedOpLogMin: 3,
  },
];

// ── Wire-EDM cases (4) ───────────────────────────────────────────────────────

const WEDM_CASES: ReadonlyArray<ValidationTestCase> = [
  {
    id: "WEDM-001",
    description: "JM Die ITW progressive die — 4-cavity blank with 0.0002 wire offset, +0.0000/-0.0005",
    input: {
      intent: "wire-EDM 4-cavity progressive die blank with 0.0002 wire offset, +0.0000/-0.0005 tolerance, 16 Ra wire-cut finish",
      callouts: [
        { tolerance_mm: 0.0127 }, // +0.0000/-0.0005 on all features (0.0005 in band -> mm); surface "16 Ra wire-cut" folded into intent
      ],
    },
    expectedOpLogMin: 4,
  },
  {
    id: "WEDM-002",
    description: "JM Die Alcoa precision punch — 0.125 sq with 0.005 corner radius, A2 tool steel",
    input: {
      intent: "wire-EDM 0.125 square punch with 0.005 corner radius from A2 tool steel",
      callouts: [
        { tolerance_mm: 0.01016 }, // +/-0.0002 on edges (0.0004 in band -> mm)
      ], // material "A2 air-hardening tool steel" stays in intent
    },
    expectedOpLogMin: 2,
  },
  {
    id: "WEDM-003",
    description: "JM Die Holo-Krome perforator — 0.062 dia thru hole, length 1.500, sharp corners",
    input: {
      intent: "wire-EDM 0.062 diameter thru hole through 1.500 thick plate with sharp corners",
    },
    expectedOpLogMin: 2,
  },
  {
    id: "WEDM-004",
    description: "JM Die SFS multi-pass finish die — 3-pass (rough + skim + finish) on 0.500 deep contour",
    input: {
      intent: "wire-EDM 3-pass rough-skim-finish on 0.500 deep contour, 8 Ra final",
      callouts: [
        { tolerance_mm: 0.00508 }, // +/-0.0001 on finished contour (0.0002 in band -> mm)
      ], // surface "8 Ra finish pass" stays in intent
    },
    expectedOpLogMin: 5,
  },
];

// ── Combined corpus ──────────────────────────────────────────────────────────

/**
 * The curated 12-case starter corpus (4 mill + 4 lathe + 4 wire-EDM).
 * Frozen at module load so callers can't mutate the shared instance.
 * Expansion to 50 = data work (named follow-up U-VALIDATION-50-EXPAND).
 */
export const JM_DIE_VALIDATION_CORPUS: ReadonlyArray<ValidationTestCase> = Object.freeze([
  ...MILL_CASES,
  ...LATHE_CASES,
  ...WEDM_CASES,
]);

export const JM_DIE_CORPUS_VERSION = "1.0.0" as const;
export const JM_DIE_CORPUS_SCHEMA_VERSION = 1 as const;

export interface CorpusSummary {
  version: string;
  schemaVersion: number;
  totalCount: number;
  byDomain: { mill: number; lathe: number; wedm: number };
  byCaseId: ReadonlyArray<string>;
}

/**
 * Lightweight summary of the corpus shape — useful for the dispatcher,
 * /system-viz inventory, or operator quick-look. Pure.
 */
export function summarizeCorpus(): CorpusSummary {
  return {
    version: JM_DIE_CORPUS_VERSION,
    schemaVersion: JM_DIE_CORPUS_SCHEMA_VERSION,
    totalCount: JM_DIE_VALIDATION_CORPUS.length,
    byDomain: {
      mill: MILL_CASES.length,
      lathe: LATHE_CASES.length,
      wedm: WEDM_CASES.length,
    },
    byCaseId: JM_DIE_VALIDATION_CORPUS.map(c => c.id),
  };
}

/**
 * Domain filter — pure. Returns a frozen sub-corpus.
 * Accepts: "mill" | "lathe" | "wedm" | "all" (anything else → empty).
 */
export function corpusByDomain(domain: "mill" | "lathe" | "wedm" | "all"): ReadonlyArray<ValidationTestCase> {
  if (domain === "mill") return MILL_CASES;
  if (domain === "lathe") return LATHE_CASES;
  if (domain === "wedm") return WEDM_CASES;
  if (domain === "all") return JM_DIE_VALIDATION_CORPUS;
  return [];
}
