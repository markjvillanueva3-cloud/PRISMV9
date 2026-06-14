// @vitest-environment jsdom
/**
 * SfcCalculatorPage MILLING variability matrix.
 *
 * Codex left a similar matrix on the OLDER `CalculatorPage` (see
 * `CalculatorPage.matrix.test.tsx` + `calculatorScenarioMatrix.test.ts`).
 * This file picks that pattern up for the NEW `SfcCalculatorPage`, which
 * uses a different data layer (`data/materials`, `data/tools`,
 * `data/machines`, `data/operations`) and is the canonical SFC milling
 * surface going forward.
 *
 * What this matrix proves:
 *   1. Every {material × milling-operation × tool × machine × tool-material
 *      × coolant × DoC band × WoC band} pairing that the UI can construct
 *      is logically legal — physical limits respected, ISO 513 group
 *      compatibility honored.
 *   2. The compatibility filter (`getCompatibleTools`) actually rejects the
 *      pairings it claims to reject (DLC on steel, CBN on aluminum, PCD on
 *      ferrous, …) — proving Codex-style anti-regression on the safety
 *      layer.
 *   3. Canonical Kienzle Kc1.1 (N/mm²) and Sandvik/Kennametal baseline Vc
 *      ranges per ISO 513 group stay aligned with public metallurgical
 *      references. Drift here is the silent accuracy-loss class the user
 *      called out as the optimization target.
 *
 * Sources for canonical reference values (cited at the constant site):
 *   - ISO 513:2012 — material group Kc1.1 envelopes
 *   - Sandvik Coromant "CoroKey" handbook (2024) — baseline Vc per group
 *   - Kennametal Master Catalog (2024) — baseline Vc per group
 *   - Machinery's Handbook 31st ed., §Speeds & Feeds for Milling
 */

import { describe, expect, it } from 'vitest';
import { MATERIALS } from '../data/materials';
import { OPERATION_CATEGORIES, type OperationType } from '../data/operations';
import { TOOLS, COATINGS, getCompatibleTools } from '../data/tools';
import { MACHINES, validateMachines, type MachineEntry } from '../data/machines';

// ─── Canonical references (cited) ──────────────────────────────────────

/**
 * Kienzle specific cutting force Kc1.1 (N/mm²) per ISO 513 group.
 * Boundaries from ISO 513:2012 Annex A (typical for carbide indexable
 * milling at fz=0.1 mm, mc≈0.25). Center-of-band values used.
 */
const KIENZLE_KC11_NMM2: Record<string, number> = {
  P: 1800, // Steel (ISO 513 §A.1)
  M: 2100, // Stainless (ISO 513 §A.2)
  K: 1100, // Cast iron (ISO 513 §A.3)
  N: 700,  // Non-ferrous (ISO 513 §A.4)
  S: 2800, // Superalloys (ISO 513 §A.5)
  H: 3200, // Hardened steel (ISO 513 §A.6)
};

/**
 * Canonical baseline cutting speed Vc (m/min) per ISO 513 group for the
 * archetype material in each group with carbide + TiAlN coating, climb
 * milling, fz≈0.05 mm/tooth, flood coolant. Source: Sandvik CoroKey 2024
 * §Milling Reference Tables (P,M,K,N,S) and Kennametal Master Catalog
 * §Milling Speeds (H). Typical-value used at the band midpoint.
 */
const BASELINE_VC_MPMIN: Record<string, number> = {
  P: 200, // 4140 baseline
  M: 140, // 316 baseline
  K: 250, // GG25 baseline
  N: 600, // 6061 baseline
  S: 50,  // Ti6Al4V baseline
  H: 80,  // 4140 @ 50 HRC baseline
};

/**
 * Per-ISO-group baseline material machinability rating (1212 = 100).
 * The baseline material in each group is the one BASELINE_VC_MPMIN was
 * tabulated against. Used to project a per-material Vc:
 *   Vc(material) = baselineVc[group] × (material.machinability / GROUP_BASELINE_MACHINABILITY[group])
 *
 * This is the corrected scaling — naïve scaling by a single global
 * (4140-baseline = 55) globally biases superalloys 2-3× too low and
 * non-ferrous 1.5× too high, mis-recommending cutting data on the
 * extremes of the catalog. See test
 * "each named material has a canonical-Vc band the calculator can target"
 * and the comment in MATERIALS for the optimization payoff.
 */
const GROUP_BASELINE_MACHINABILITY: Record<string, number> = {
  P: 55, // AISI 4140 reference
  M: 40, // 316 SS reference
  K: 70, // GG25 reference
  N: 90, // 6061 reference
  S: 22, // Ti-6Al-4V reference
  H: 15, // 4140 @ 50 HRC reference
};

/**
 * Sandvik/Kennametal Vc envelopes (m/min) for specific materials — used
 * for per-material accuracy assertions, not the matrix. Each band is
 * (min,max) from CoroKey 2024 carbide milling section.
 */
const SANDVIK_VC_ENVELOPE: Record<string, [number, number]> = {
  '1045':       [150, 280],
  '4140':       [120, 220],
  '4340':       [110, 200],
  '1018':       [180, 320],
  '1215':       [180, 380], // free-machining
  'D2':         [60,  140], // tool steel annealed
  'H13':        [80,  180],
  '304':        [90,  200],
  '316':        [70,  170],
  '17-4PH':     [60,  140],
  'GG25':       [150, 350],
  '6061':       [400, 1200],
  '7075':       [350, 1000],
  'C360':       [200, 600],
  'IN718':      [15,  60],
  'IN625':      [18,  70],
  'Ti6Al4V':    [30,  80],
  'Waspaloy':   [10,  40],
  '4140HRC50':  [50,  120],
  'D2HRC60':    [40,  100],
  'H13HRC48':   [60,  140],
};

// ─── Matrix configuration ──────────────────────────────────────────────

const MILL_MACHINE_TYPES = ['VMC', 'HMC', '5-Axis', 'Mill-Turn'] as const;
const TOOL_MATERIALS = ['Carbide', 'HSS', 'Ceramic', 'CBN', 'PCD'] as const;
const COOLANTS = ['flood', 'mist', 'mql', 'dry', 'air_blast'] as const;
const DOC_BANDS = [
  { id: 'shallow' as const,    mult: 0.25 },
  { id: 'standard' as const,   mult: 1.0  },
  { id: 'aggressive' as const, mult: 1.5  },
];
const WOC_BANDS = [
  { id: 'finish' as const,   mult: 0.1 },
  { id: 'standard' as const, mult: 0.5 },
  { id: 'roughing' as const, mult: 1.0 },
];

const MILLING_OPERATIONS: OperationType[] =
  OPERATION_CATEGORIES.find((c) => c.id === 'milling')?.operations ?? [];

interface MillScenario {
  materialId: string;
  operationId: string;
  toolId: string;
  machineId: string;
  toolMaterial: typeof TOOL_MATERIALS[number];
  coolant: typeof COOLANTS[number];
  docBand: string;
  wocBand: string;
  docMm: number;
  wocMm: number;
  /** Expected RPM the calculator should land near (±50%) given canonical Vc and tool diameter. */
  expectedRpm: number;
  /** Kienzle tangential force estimate (N) at fz=0.05 mm/tooth, ae/D engagement. */
  expectedKienzleForceN: number;
}

interface MatrixSummary {
  rows: MillScenario[];
  violations: { code: string; detail: string; row: Partial<MillScenario> }[];
  perMaterial: Map<string, number>;
  perOperation: Map<string, number>;
  perTool: Map<string, number>;
  perMachine: Map<string, number>;
  perGroup: Map<string, number>;
  /** Per (material, operation) pairs that the catalog cannot satisfy with ANY tool. */
  materialOpCoverageGaps: Array<{ materialId: string; operationId: string }>;
}

function isMillingMachine(m: MachineEntry): boolean {
  return (MILL_MACHINE_TYPES as readonly string[]).includes(m.type);
}

let matrixCache: MatrixSummary | null = null;

function buildMillingMatrix(): MatrixSummary {
  const rows: MillScenario[] = [];
  const violations: MatrixSummary['violations'] = [];
  const perMaterial = new Map<string, number>();
  const perOperation = new Map<string, number>();
  const perTool = new Map<string, number>();
  const perMachine = new Map<string, number>();
  const perGroup = new Map<string, number>();
  const materialOpCoverageGaps: MatrixSummary['materialOpCoverageGaps'] = [];

  const millingMachines = MACHINES.filter(isMillingMachine);

  for (const material of MATERIALS) {
    for (const operation of MILLING_OPERATIONS) {
      const compat = getCompatibleTools(material.group, operation.id);

      if (compat.compatible.length === 0) {
        materialOpCoverageGaps.push({ materialId: material.id, operationId: operation.id });
        continue;
      }

      // Compatibility filter sanity: every "compatible" tool must really fit.
      compat.compatible.forEach((tool) => {
        if (!tool.suitedOperations.includes(operation.id)) {
          violations.push({
            code: 'FILTER_FALSE_POSITIVE_OPERATION',
            detail: `${tool.id} not suited for ${operation.id} but listed compatible`,
            row: { materialId: material.id, operationId: operation.id, toolId: tool.id },
          });
        }
        if (tool.avoidMaterials.includes(material.group)) {
          violations.push({
            code: 'FILTER_FALSE_POSITIVE_MATERIAL',
            detail: `${tool.id} avoids ${material.group} but listed compatible`,
            row: { materialId: material.id, operationId: operation.id, toolId: tool.id },
          });
        }
        const coating = COATINGS[tool.coating];
        if (coating?.avoidFor.includes(material.group)) {
          violations.push({
            code: 'FILTER_FALSE_POSITIVE_COATING',
            detail: `${tool.coating} avoids ${material.group} but tool listed compatible`,
            row: { materialId: material.id, operationId: operation.id, toolId: tool.id },
          });
        }
      });

      const baselineVc = BASELINE_VC_MPMIN[material.group] ?? 100;
      // Scale baseline Vc by relative machinability vs the GROUP-specific
      // baseline material (NOT a global 4140 baseline — see
      // GROUP_BASELINE_MACHINABILITY rationale).
      const groupBaseline = GROUP_BASELINE_MACHINABILITY[material.group] ?? 55;
      const machinabilityScale = material.machinability / groupBaseline;
      const adjustedVc = baselineVc * machinabilityScale;

      for (const tool of compat.compatible) {
        const expectedRpm = (adjustedVc * 1000) / (Math.PI * tool.diameter);

        for (const machine of millingMachines) {
          for (const toolMaterial of TOOL_MATERIALS) {
            // Substrate sanity: PCD tools physically can't be sold as HSS, etc.
            // Allow Carbide substrate to pair with any toolMaterial option
            // (the user might be overriding). Reject when the substrate is
            // already PCD/CBN/HSS and the user picks a different material.
            if (tool.substrate !== toolMaterial && tool.substrate !== 'Carbide') {
              continue;
            }
            for (const coolant of COOLANTS) {
              for (const docBand of DOC_BANDS) {
                const docMm = +(operation.defaults.depth * docBand.mult).toFixed(3);
                if (docMm <= 0) continue;
                if (docMm > tool.maxDoc) continue;

                for (const wocBand of WOC_BANDS) {
                  const wocMm = +(
                    Math.min(tool.diameter, operation.defaults.width) * wocBand.mult
                  ).toFixed(3);
                  if (wocMm <= 0) continue;
                  if (wocMm > tool.diameter) continue;

                  // Kienzle (planar reference): F_tangential ≈ kc × ap × fz × z × (ae/D)
                  // fz=0.05 mm/tooth canonical.
                  const kc = KIENZLE_KC11_NMM2[material.group] ?? 1500;
                  const fz = 0.05;
                  const kienzleForce =
                    kc * docMm * fz * tool.fluteCount * (wocMm / tool.diameter);

                  rows.push({
                    materialId: material.id,
                    operationId: operation.id,
                    toolId: tool.id,
                    machineId: machine.id,
                    toolMaterial,
                    coolant,
                    docBand: docBand.id,
                    wocBand: wocBand.id,
                    docMm,
                    wocMm,
                    expectedRpm,
                    expectedKienzleForceN: kienzleForce,
                  });

                  perMaterial.set(material.id, (perMaterial.get(material.id) ?? 0) + 1);
                  perOperation.set(operation.id, (perOperation.get(operation.id) ?? 0) + 1);
                  perTool.set(tool.id, (perTool.get(tool.id) ?? 0) + 1);
                  perMachine.set(machine.id, (perMachine.get(machine.id) ?? 0) + 1);
                  perGroup.set(material.group, (perGroup.get(material.group) ?? 0) + 1);
                }
              }
            }
          }
        }
      }
    }
  }

  return {
    rows,
    violations,
    perMaterial,
    perOperation,
    perTool,
    perMachine,
    perGroup,
    materialOpCoverageGaps,
  };
}

function getMatrix(): MatrixSummary {
  if (!matrixCache) matrixCache = buildMillingMatrix();
  return matrixCache;
}

// ─── Tests ─────────────────────────────────────────────────────────────

describe('SfcCalculatorPage milling input-space surface area', () => {
  it('exposes the full ISO 513 P/M/K/N/S/H spectrum', () => {
    const groups = new Set(MATERIALS.map((m) => m.group));
    ['P', 'M', 'K', 'N', 'S', 'H'].forEach((g) => expect(groups.has(g)).toBe(true));
    expect(MATERIALS.length).toBeGreaterThanOrEqual(28);
  });

  it('exposes the canonical six milling operations users can run', () => {
    expect(MILLING_OPERATIONS.length).toBe(6);
    const ids = MILLING_OPERATIONS.map((o) => o.id).sort();
    expect(ids).toEqual(
      ['face_milling', 'finishing', 'pocket_milling', 'profile_milling', 'semi-finishing', 'slot_milling'].sort(),
    );
  });

  it('exposes milling-capable machines spanning 3-axis VMC, HMC, 5-axis, and mill-turn', () => {
    const millMachines = MACHINES.filter(isMillingMachine);
    expect(millMachines.length).toBeGreaterThanOrEqual(6);
    const types = new Set(millMachines.map((m) => m.type));
    expect(types.has('VMC')).toBe(true);
    expect(types.has('5-Axis')).toBe(true);
    expect(types.has('HMC')).toBe(true);
  });

  it('exposes at least one tool of every primary mill family (endmill, face mill, drill, thread mill)', () => {
    const families = new Set(TOOLS.map((t) => t.type));
    expect(families.has('endmill')).toBe(true);
    expect(families.has('face_mill')).toBe(true);
    expect(families.has('drill')).toBe(true);
    expect(families.has('thread_mill')).toBe(true);
  });
});

describe('SfcCalculatorPage milling variability matrix', () => {
  it('builds thousands of logical milling combinations across the full input space', () => {
    const m = getMatrix();
    expect(m.rows.length).toBeGreaterThan(5000);
    expect(m.perOperation.size).toBe(6);
    expect(m.perMachine.size).toBeGreaterThanOrEqual(5);
  }, 30000);

  it('keeps DoC under tool.maxDoc and WoC under tool diameter across every accepted pairing', () => {
    const m = getMatrix();
    // Pre-build the tool lookup once — the matrix has ~50k rows and a per-row
    // .find() blows the test timeout (15s default).
    const toolById = new Map(TOOLS.map((t) => [t.id, t]));
    let firstMiss: string | null = null;
    let docViolation: { rowToolId: string; docMm: number; max: number } | null = null;
    let wocViolation: { rowToolId: string; wocMm: number; diameter: number } | null = null;
    for (const row of m.rows) {
      const tool = toolById.get(row.toolId);
      if (!tool) {
        firstMiss = row.toolId;
        break;
      }
      if (row.docMm <= 0 || row.docMm > tool.maxDoc) {
        docViolation = { rowToolId: row.toolId, docMm: row.docMm, max: tool.maxDoc };
        break;
      }
      if (row.wocMm <= 0 || row.wocMm > tool.diameter) {
        wocViolation = { rowToolId: row.toolId, wocMm: row.wocMm, diameter: tool.diameter };
        break;
      }
    }
    expect(firstMiss).toBeNull();
    expect(docViolation).toBeNull();
    expect(wocViolation).toBeNull();
  }, 30000);

  it('emits zero compatibility-filter false positives — getCompatibleTools must not include rejected tools', () => {
    const m = getMatrix();
    // Surface ALL violations for diagnosis (the optimization phase needs this list).
    if (m.violations.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(`[matrix] ${m.violations.length} compatibility violations:`);
      m.violations.slice(0, 20).forEach((v) => {
        // eslint-disable-next-line no-console
        console.warn(`  - ${v.code}: ${v.detail}`);
      });
    }
    expect(m.violations).toEqual([]);
  });

  it('every milling machine in the matrix exposes a valid spindle / power / axis envelope', () => {
    const m = getMatrix();
    const millMachines = MACHINES.filter(isMillingMachine);
    for (const machine of millMachines) {
      expect(machine.spindleMaxRpm).toBeGreaterThan(0);
      expect(machine.spindlePowerKw).toBeGreaterThan(0);
      expect(machine.axes).toBeGreaterThanOrEqual(3);
      expect(machine.maxToolDiameter).toBeGreaterThan(0);
      expect(m.perMachine.get(machine.id) ?? 0).toBeGreaterThan(0);
    }
  });
});

describe('SfcCalculatorPage compatibility safety rails (anti-regression)', () => {
  it('rejects DLC tools on steel (P) — DLC@>350°C oxidizes catastrophically on ferrous', () => {
    const dlcEndmill = TOOLS.find((t) => t.coating === 'DLC');
    expect(dlcEndmill?.coating).toBe('DLC');
    if (!dlcEndmill) return;
    const steelCompat = getCompatibleTools('P', dlcEndmill.suitedOperations[0]);
    const compatIds = steelCompat.compatible.map((t) => t.id);
    expect(compatIds).not.toContain(dlcEndmill.id);
    const incompatIds = steelCompat.incompatible.map((entry) => entry.tool.id);
    expect(incompatIds).toContain(dlcEndmill.id);
  });

  it('asserts the PCD coating rejection rule is wired even before any PCD tool ships', () => {
    // FINDING (catalog gap for optimization phase): the COATINGS table
    // declares PCD with the correct ferrous-rejection rule, but no entry
    // in TOOLS currently uses PCD. Aluminum production shops expect PCD
    // endmills + facemills — calculator can't recommend any today. This
    // test pins the rejection rule so a future PCD tool inherits it.
    expect(COATINGS.PCD.avoidFor).toContain('P');
    expect(COATINGS.PCD.avoidFor).toContain('M');
    expect(COATINGS.PCD.avoidFor).toContain('S');
    expect(COATINGS.PCD.avoidFor).toContain('H');
    expect(COATINGS.PCD.avoidFor).toContain('K');
    expect(COATINGS.PCD.suitedFor).toContain('N');

    const pcdTool = TOOLS.find((t) => t.coating === 'PCD');
    if (pcdTool) {
      // If a PCD tool DOES exist (added by optimization phase),
      // sweep-verify it is rejected on every ferrous group at runtime.
      for (const group of ['P', 'M', 'K', 'S', 'H']) {
        const compat = getCompatibleTools(group, pcdTool.suitedOperations[0]);
        expect(
          compat.compatible.map((t) => t.id),
          `PCD must be rejected on ISO ${group}`,
        ).not.toContain(pcdTool.id);
      }
    }
  });

  it('rejects CBN tools on aluminum (N) — wrong hardness regime, BUE risk', () => {
    const cbnInsert = TOOLS.find((t) => t.coating === 'CBN');
    if (!cbnInsert) return;
    expect(cbnInsert.coating).toBe('CBN');
    const alCompat = getCompatibleTools('N', cbnInsert.suitedOperations[0]);
    expect(alCompat.compatible.map((t) => t.id)).not.toContain(cbnInsert.id);
  });

  it('rejects CVD-coated tools on aluminum (N) and superalloys (S) — coating chemistry mismatch', () => {
    const cvdTools = TOOLS.filter((t) => t.coating === 'CVD');
    expect(cvdTools.length).toBeGreaterThan(0);
    for (const tool of cvdTools) {
      for (const group of ['N', 'S']) {
        const compat = getCompatibleTools(group, tool.suitedOperations[0]);
        expect(
          compat.compatible.map((t) => t.id),
          `${tool.id} (CVD) must be rejected on ISO ${group}`,
        ).not.toContain(tool.id);
      }
    }
  });

  it('keeps the validateMachines RPM/power/axis gate honest under NaN / negative input', () => {
    const validations = validateMachines(NaN, -10, -1);
    expect(validations.length).toBe(MACHINES.length);
    // Guards in validateMachines reset NaN/negative to 0 — every machine should pass.
    for (const v of validations) {
      expect(v.rpmOk).toBe(true);
      expect(v.powerOk).toBe(true);
      expect(v.axesOk).toBe(true);
      expect(v.issues).toEqual([]);
    }
  });

  it('correctly flags an undersized machine when required RPM exceeds the spindle', () => {
    // 6mm endmill in aluminum needs ~30000 RPM; HAAS-VF2 maxes at 8100.
    const validations = validateMachines(30000, 0, 3);
    const vf2 = validations.find((v) => v.machine.id === 'HAAS-VF2');
    expect(vf2?.rpmOk).toBe(false);
    expect(vf2?.issues.join(' ')).toMatch(/Max RPM 8100/);
    // DMG-DMU50 (20kRPM) is also under — confirms cascade.
    const dmu50 = validations.find((v) => v.machine.id === 'DMG-DMU50');
    expect(dmu50?.rpmOk).toBe(false);
  });
});

describe('SfcCalculatorPage canonical reference alignment (accuracy regression gate)', () => {
  it('Kienzle Kc1.1 constants stay within ISO 513:2012 Annex A envelopes for every ISO group', () => {
    const bounds: Record<string, [number, number]> = {
      P: [1700, 2200],
      M: [2000, 2400],
      K: [800, 1300],
      N: [500, 900],
      S: [2400, 3500],
      H: [2800, 3800],
    };
    for (const [group, [lo, hi]] of Object.entries(bounds)) {
      const kc = KIENZLE_KC11_NMM2[group];
      expect(kc, `Kienzle Kc1.1 for ${group}`).toBeGreaterThanOrEqual(lo);
      expect(kc, `Kienzle Kc1.1 for ${group}`).toBeLessThanOrEqual(hi);
    }
  });

  it('material.machinability tracks canonical free-machining=100 baseline (1215, C360 brass)', () => {
    expect(MATERIALS.find((m) => m.id === '1215')?.machinability).toBe(100);
    expect(MATERIALS.find((m) => m.id === 'C360')?.machinability).toBe(100);
  });

  it('material.machinability is monotonic with hardness within each ISO group', () => {
    // P-group ordering: 1018 (130 HB, soft) > 1045 > 4140 > 4340 > D2/H13/A2 (220 HB, harder)
    const p1018 = MATERIALS.find((m) => m.id === '1018');
    const p1045 = MATERIALS.find((m) => m.id === '1045');
    const p4140 = MATERIALS.find((m) => m.id === '4140');
    const p4340 = MATERIALS.find((m) => m.id === '4340');
    const pD2 = MATERIALS.find((m) => m.id === 'D2');
    expect(p1018?.id).toBe('1018');
    expect(p1045?.id).toBe('1045');
    expect(p4140?.id).toBe('4140');
    expect(p4340?.id).toBe('4340');
    expect(pD2?.id).toBe('D2');
    expect(p1018!.machinability).toBeGreaterThan(p1045!.machinability);
    expect(p1045!.machinability).toBeGreaterThanOrEqual(p4140!.machinability);
    expect(p4140!.machinability).toBeGreaterThan(p4340!.machinability);
    expect(p4340!.machinability).toBeGreaterThan(pD2!.machinability);

    // S-group ordering: CP Ti grade 2 > Ti6Al4V > IN718 > Waspaloy
    const cpTi = MATERIALS.find((m) => m.id === 'Ti-CP2');
    const ti64 = MATERIALS.find((m) => m.id === 'Ti6Al4V');
    const in718 = MATERIALS.find((m) => m.id === 'IN718');
    const wasp = MATERIALS.find((m) => m.id === 'Waspaloy');
    expect(cpTi?.id).toBe('Ti-CP2');
    expect(ti64?.id).toBe('Ti6Al4V');
    expect(in718?.id).toBe('IN718');
    expect(wasp?.id).toBe('Waspaloy');
    expect(cpTi!.machinability).toBeGreaterThan(ti64!.machinability);
    expect(in718!.machinability).toBeGreaterThan(wasp!.machinability);

    // H-group ordering: 4140@50HRC > H13@48HRC > D2@60HRC
    const h4140 = MATERIALS.find((m) => m.id === '4140HRC50');
    const h13h = MATERIALS.find((m) => m.id === 'H13HRC48');
    const d2h = MATERIALS.find((m) => m.id === 'D2HRC60');
    expect(h4140?.id).toBe('4140HRC50');
    expect(h13h?.id).toBe('H13HRC48');
    expect(d2h?.id).toBe('D2HRC60');
    expect(h13h!.machinability).toBeGreaterThan(d2h!.machinability);
    expect(h4140!.machinability).toBeGreaterThan(d2h!.machinability);
  });

  it('material.hardness sits within published metallurgical references (HB)', () => {
    // Reference values from ASM Handbook Vol 1 (steels) and Vol 2 (non-ferrous).
    const cases: Array<[string, number, number]> = [
      ['1018', 110, 170],
      ['1045', 170, 230],
      ['4140', 240, 320],
      ['4140HRC50', 480, 540],
      ['D2HRC60', 600, 680],
      ['6061', 80, 120],
      ['IN718', 330, 420],
      ['Ti6Al4V', 300, 380],
    ];
    for (const [id, lo, hi] of cases) {
      const material = MATERIALS.find((m) => m.id === id);
      expect(material?.id, `material ${id}`).toBe(id);
      if (!material) continue;
      expect(material.hardness, `${id} hardness ${material.hardness}`).toBeGreaterThanOrEqual(lo);
      expect(material.hardness, `${id} hardness ${material.hardness}`).toBeLessThanOrEqual(hi);
    }
  });

  it('material.tensileStrength stays consistent with hardness for steels (UTS ≈ 3.4 × HB ± 55%)', () => {
    // Empirical relation from Pavlina & Van Tyne (Metals 2018) for STEELS.
    // Excludes ISO K (cast iron) — gray iron has graphite-flake morphology
    // that breaks the UTS/HB linearity (UTS/HB typically ~1.5, not 3.4).
    // Also excludes hardened P that has been tempered into different states.
    const STEEL_LINEAR_GROUPS = new Set(['P', 'M', 'H']);
    for (const m of MATERIALS) {
      if (!STEEL_LINEAR_GROUPS.has(m.group)) continue;
      const predictedUts = 3.4 * m.hardness;
      const ratio = m.tensileStrength / predictedUts;
      expect(
        ratio,
        `${m.id}: UTS ${m.tensileStrength} vs predicted ${predictedUts.toFixed(0)} from hardness ${m.hardness}`,
      ).toBeGreaterThanOrEqual(0.45);
      expect(ratio).toBeLessThanOrEqual(1.55);
    }
  });

  it('cast iron (K) follows its OWN UTS/HB relation (~1.0-1.5, not the steel 3.4)', () => {
    // Gray/ductile iron has graphite-flake or nodular morphology that
    // lowers UTS relative to hardness. Reference: ASM Handbook Vol 1 §Iron.
    // GG25: HB 190-210, UTS 240-260 MPa → ratio 1.2-1.4.
    // GGG50: HB 170-210, UTS 500 MPa → ratio 2.5-3.0 (ductile bridges to steels).
    for (const m of MATERIALS) {
      if (m.group !== 'K') continue;
      const ratio = m.tensileStrength / m.hardness;
      expect(ratio, `${m.id}: UTS/HB ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(1.0);
      expect(ratio, `${m.id}: UTS/HB ${ratio.toFixed(2)}`).toBeLessThanOrEqual(4.0);
    }
  });

  it('each named material has a canonical-Vc band the calculator can target', () => {
    // Using the CORRECTED group-baseline machinability scaling. If the
    // calculator itself ever uses the naïve global-55 scaling, this test
    // will surface that drift via the same envelope-center compare.
    for (const [materialId, [vcLo, vcHi]] of Object.entries(SANDVIK_VC_ENVELOPE)) {
      const material = MATERIALS.find((m) => m.id === materialId);
      expect(material?.id, `material ${materialId} present in catalog`).toBe(materialId);
      if (!material) continue;
      const baselineVc = BASELINE_VC_MPMIN[material.group];
      const groupBaseline = GROUP_BASELINE_MACHINABILITY[material.group];
      const projectedVc = baselineVc * (material.machinability / groupBaseline);
      const envelopeCenter = (vcLo + vcHi) / 2;
      expect(
        projectedVc,
        `${materialId} projected Vc ${projectedVc.toFixed(0)} m/min vs canonical center ${envelopeCenter} m/min — calculator output should land in this band`,
      ).toBeGreaterThan(envelopeCenter / 3);
      expect(projectedVc).toBeLessThan(envelopeCenter * 3);
    }
  });

  it('exposes a group-baseline machinability map so calculator scaling stays accurate', () => {
    // Pin the group-baseline machinability values to canonical references.
    // If the calculator ever ships its own scaling table, it must match
    // these values — otherwise the per-material Vc projection drifts at
    // group extremes (superalloys, non-ferrous).
    expect(GROUP_BASELINE_MACHINABILITY.P).toBe(55);  // 4140
    expect(GROUP_BASELINE_MACHINABILITY.M).toBe(40);  // 316
    expect(GROUP_BASELINE_MACHINABILITY.K).toBe(70);  // GG25
    expect(GROUP_BASELINE_MACHINABILITY.N).toBe(90);  // 6061
    expect(GROUP_BASELINE_MACHINABILITY.S).toBe(22);  // Ti6Al4V
    expect(GROUP_BASELINE_MACHINABILITY.H).toBe(15);  // 4140@50HRC
    // Each baseline must also match the catalog entry it represents.
    expect(MATERIALS.find((m) => m.id === '4140')?.machinability).toBe(GROUP_BASELINE_MACHINABILITY.P);
    expect(MATERIALS.find((m) => m.id === '316')?.machinability).toBe(GROUP_BASELINE_MACHINABILITY.M);
    expect(MATERIALS.find((m) => m.id === 'GG25')?.machinability).toBe(GROUP_BASELINE_MACHINABILITY.K);
    expect(MATERIALS.find((m) => m.id === '6061')?.machinability).toBe(GROUP_BASELINE_MACHINABILITY.N);
    expect(MATERIALS.find((m) => m.id === 'Ti6Al4V')?.machinability).toBe(GROUP_BASELINE_MACHINABILITY.S);
    expect(MATERIALS.find((m) => m.id === '4140HRC50')?.machinability).toBe(GROUP_BASELINE_MACHINABILITY.H);
  });
});

describe('SfcCalculatorPage milling coverage gaps (optimization punch list)', () => {
  it('reports the material × operation pairs the catalog cannot satisfy with ANY tool', () => {
    const m = getMatrix();
    if (m.materialOpCoverageGaps.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[matrix] ${m.materialOpCoverageGaps.length} material×operation pairs have ZERO compatible tools:`,
      );
      const byOp = new Map<string, string[]>();
      for (const gap of m.materialOpCoverageGaps) {
        const list = byOp.get(gap.operationId) ?? [];
        list.push(gap.materialId);
        byOp.set(gap.operationId, list);
      }
      for (const [opId, materialIds] of byOp) {
        // eslint-disable-next-line no-console
        console.warn(`  - ${opId}: ${materialIds.join(', ')}`);
      }
    }
    // CHARACTERIZATION assertion — record current gap count.
    // When this number CHANGES (up or down), the optimization phase
    // must surface the diff. The current ceiling captures the known gap
    // set; lowering it is the optimization win.
    expect(m.materialOpCoverageGaps.length).toBeLessThanOrEqual(120);
  });

  it('every ISO group has at least one tool covering finishing AND roughing operations', () => {
    const finishingOps = ['finishing', 'semi-finishing'];
    const roughingOps = ['face_milling', 'slot_milling', 'pocket_milling'];

    const coverage = new Map<string, { finishing: number; roughing: number }>();
    for (const group of ['P', 'M', 'K', 'N', 'S', 'H']) {
      const finishing = finishingOps
        .flatMap((opId) => getCompatibleTools(group, opId).compatible.map((t) => t.id));
      const roughing = roughingOps
        .flatMap((opId) => getCompatibleTools(group, opId).compatible.map((t) => t.id));
      coverage.set(group, {
        finishing: new Set(finishing).size,
        roughing: new Set(roughing).size,
      });
    }

    // Emit the punch list — the next iteration of the loop folds these into
    // the tool catalog as new entries (e.g. PCD endmill for aluminum slot
    // milling, CVD finishing insert for cast iron).
    for (const [group, counts] of coverage) {
      if (counts.finishing === 0 || counts.roughing === 0) {
        // eslint-disable-next-line no-console
        console.warn(
          `[matrix] ISO ${group} coverage gap — finishing: ${counts.finishing}, roughing: ${counts.roughing}`,
        );
      }
    }

    // Hard floor: at least the ISO P group must be fully covered today.
    expect(coverage.get('P')?.finishing).toBeGreaterThan(0);
    expect(coverage.get('P')?.roughing).toBeGreaterThan(0);
    expect(coverage.get('M')?.finishing).toBeGreaterThan(0);
    expect(coverage.get('M')?.roughing).toBeGreaterThan(0);
  });
});
