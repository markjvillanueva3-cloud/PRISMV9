/**
 * Lathe Wizard combinatorial validation sweep (driver).
 *
 * Drives the REAL `LatheSpeedFeedCalculatorFacadeEngine.calculate` across the full
 * logical input space -- every JM Die lathe machine x every supported material x every
 * lathe tool type x every operation x every strategy x every coolant x a physics grid
 * over diameter and depth of cut -- and checks each result against the property-based
 * invariant library (scripts/lib/lathe-wizard-invariants.ts). Any combination that
 * violates a physical/math/structural invariant is a real defect, logged with the exact
 * reproducing input.
 *
 * Because the categorical space alone is ~1e6 and the continuous grid pushes the total
 * into the billions/trillions, the driver is RESUMABLE and reports covered-vs-total
 * honestly (R12 -- never claim "all" when a subset ran):
 *   --sample N     deterministic strided sample of N combos across the whole space
 *   --limit N      process at most N combos starting at --offset (resumable cursor)
 *   --offset N     start index (persisted cursor for --all continuation)
 *   --all          process the entire space (may be enormous -- use with a cron cursor)
 *   --json         print the dashboard JSON to stdout instead of the human summary
 *
 * Dashboard: state/shared/dashboards/lathe-wizard-combinatorial.json
 *
 * Run: npx tsx mcp-server/scripts/lathe-wizard-combinatorial-sweep.ts --sample 200000
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  LatheSpeedFeedCalculatorFacadeEngine,
  type LatheSpeedFeedInput,
} from "../src/engines/LatheSpeedFeedCalculatorFacadeEngine.js";
import { shopConfigurationEngine } from "../src/engines/ShopConfigurationEngine.js";
import {
  checkResultInvariants,
  type InvariantViolation,
} from "./lib/lathe-wizard-invariants.js";
import {
  runAccuracyOracle,
  type AccuracyResult,
} from "./lib/lathe-wizard-accuracy.js";
import type { OracleViolation } from "./lib/turning-sweep-oracle.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../..");
const DASHBOARD_PATH = resolve(
  REPO_ROOT,
  "state/shared/dashboards/lathe-wizard-combinatorial.json",
);

// ---- Categorical dimensions ------------------------------------------------

const TOOL_TYPES: Array<LatheSpeedFeedInput["tool"]["type"]> = [
  "turning_insert",
  "boring_bar",
  "grooving",
  "threading",
  "parting",
  "drilling",
  "facing",
];

const OPERATIONS: Array<LatheSpeedFeedInput["operation"]["type"]> = [
  "roughing",
  "semi_finishing",
  "finishing",
  "threading",
  "grooving",
  "parting",
  "drilling",
  "boring",
];

const STRATEGIES: Array<NonNullable<LatheSpeedFeedInput["strategy"]>> = [
  "conservative",
  "balanced",
  "aggressive",
  "maximum_mrr",
];

const COOLANTS: Array<
  NonNullable<LatheSpeedFeedInput["operation"]["coolant"]>
> = ["flood", "mist", "dry", "high_pressure", "cryogenic"];

// ---- Continuous grid (physics-meaningful points + boundaries) --------------

const DIAMETERS_MM = [6, 12, 25, 50, 100, 200]; // small bar -> big bore
const DEPTHS_MM = [0.25, 0.5, 1.0, 2.0, 4.0]; // finish -> heavy rough

// ---- Machines: the real JM Die lathe fleet (Okuma OSP) ---------------------

interface SweepMachine {
  id: string;
  max_rpm?: number;
  max_power_kw?: number;
  has_live_tooling?: boolean;
  has_sub_spindle?: boolean;
}

function loadLatheMachines(): SweepMachine[] {
  const all = shopConfigurationEngine.getMachines();
  const lathes = all.filter((m) => m.type === "Lathe");
  return lathes.map((m) => ({
    id: m.id,
    max_rpm: m.max_rpm,
    max_power_kw: m.max_power_kw,
    has_live_tooling: m.has_live_tooling,
    has_sub_spindle: m.has_sub_spindle,
  }));
}

// ---- Enumeration -----------------------------------------------------------

interface Dims {
  materials: string[];
  machines: SweepMachine[];
}

function dimensionSizes(d: Dims): number[] {
  return [
    d.materials.length,
    d.machines.length,
    TOOL_TYPES.length,
    OPERATIONS.length,
    STRATEGIES.length,
    COOLANTS.length,
    DIAMETERS_MM.length,
    DEPTHS_MM.length,
  ];
}

function totalCombos(d: Dims): number {
  return dimensionSizes(d).reduce((a, b) => a * b, 1);
}

/**
 * Decode a flat index into one concrete input (mixed-radix over the dimensions).
 * Deterministic: index i always maps to the same combo, enabling resumable cursors
 * and strided sampling.
 */
function comboAt(d: Dims, index: number): LatheSpeedFeedInput {
  const sizes = dimensionSizes(d);
  const idx: number[] = [];
  let rem = index;
  for (let k = sizes.length - 1; k >= 0; k--) {
    idx[k] = rem % sizes[k];
    rem = Math.floor(rem / sizes[k]);
  }
  const [mi, mai, ti, oi, si, ci, di, dei] = idx;
  const machine = d.machines[mai];
  return {
    material: d.materials[mi],
    tool: { type: TOOL_TYPES[ti] },
    operation: {
      type: OPERATIONS[oi],
      depth_of_cut_mm: DEPTHS_MM[dei],
      coolant: COOLANTS[ci],
    },
    machine: {
      max_rpm: machine.max_rpm,
      max_power_kw: machine.max_power_kw,
      has_live_tooling: machine.has_live_tooling,
      has_sub_spindle: machine.has_sub_spindle,
    },
    workpiece: { diameter_mm: DIAMETERS_MM[di] },
    strategy: STRATEGIES[si],
  } as LatheSpeedFeedInput;
}

// ---- CLI parsing -----------------------------------------------------------

function argNum(flag: string): number | undefined {
  const i = process.argv.indexOf(flag);
  if (i < 0 || i + 1 >= process.argv.length) return undefined;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) ? n : undefined;
}
const asJson = process.argv.includes("--json");
const doAll = process.argv.includes("--all");
const sampleN = argNum("--sample");
const limitN = argNum("--limit");
const offsetN = argNum("--offset") ?? 0;

// ---- Sweep -----------------------------------------------------------------

interface ViolationRecord {
  code: string;
  severity: string;
  message: string;
  input: LatheSpeedFeedInput;
  evidence?: Record<string, number | string | boolean>;
}

function main(): void {
  const dims: Dims = {
    materials: LatheSpeedFeedCalculatorFacadeEngine.listSupportedMaterials(),
    machines: loadLatheMachines(),
  };
  const total = totalCombos(dims);

  // Decide which indices to visit -- as a lazy generator, NEVER a materialized array
  // (the full space is 1e7+ combos; building an index array up front OOMs the heap).
  let mode: string;
  let visit: () => Generator<number>;
  if (sampleN !== undefined && sampleN > 0) {
    // Deterministic strided sample spanning the whole space.
    const n = Math.min(sampleN, total);
    const stride = Math.max(1, Math.floor(total / n));
    let count = 0;
    for (let i = 0; i < total && count < n; i += stride) count++;
    mode = `sample(${count})`;
    visit = function* () {
      let emitted = 0;
      for (let i = 0; i < total && emitted < n; i += stride) {
        emitted++;
        yield i;
      }
    };
  } else if (doAll) {
    const end = limitN !== undefined ? Math.min(total, offsetN + limitN) : total;
    mode = `all[${offsetN}..${end})`;
    visit = function* () {
      for (let i = offsetN; i < end; i++) yield i;
    };
  } else {
    const lim = limitN ?? Math.min(total, 50000);
    const end = Math.min(total, offsetN + lim);
    mode = `range[${offsetN}..${end})`;
    visit = function* () {
      for (let i = offsetN; i < end; i++) yield i;
    };
  }

  const byCode: Record<string, number> = {};
  const bySeverity: Record<string, number> = { P0: 0, P1: 0, P2: 0 };
  const samples: ViolationRecord[] = [];
  const MAX_SAMPLES = 50;
  let processed = 0;
  let engineFailures = 0;

  // --- Accuracy oracle (numeric silent-wrong identity checks) -----------------
  // Separate from the property-based invariants above: the invariants prove "not obviously
  // broken", the oracle proves "numerically correct" by re-deriving rpm / power / force /
  // tool-life from the engine's own outputs. Tracked in its own block so the two verdicts
  // stay distinguishable, but BOTH feed the top-level verdict + exit code (fail loud).
  const byAccuracyKind: Record<string, number> = {};
  const accuracySamples: Array<{
    kind: string;
    expected?: number;
    actual?: number;
    relPct?: number;
    note?: string;
    input: LatheSpeedFeedInput;
  }> = [];
  const blockedIdentityKinds = new Set<string>();
  let accuracyChecked = 0; // # of success-path cells the oracle actually ran on
  let accuracyViolations = 0;

  for (const index of visit()) {
    const input = comboAt(dims, index);
    let violations: InvariantViolation[];
    let accuracy: AccuracyResult | null = null;
    try {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(input);
      violations = checkResultInvariants(input, result);
      // Accuracy oracle runs only on the SUCCESS path -- a declared failure
      // (success:false) has no numeric recommendation to cross-check.
      if (result.success) accuracy = runAccuracyOracle(input, result);
    } catch (err) {
      // A thrown calculate() is itself a defect for this input (should return
      // success:false, never throw) -- record it as a synthetic P0.
      engineFailures++;
      violations = [
        {
          code: "E-engine-throw",
          severity: "P0",
          message: `calculate() threw: ${(err as Error).message}`,
        },
      ];
    }
    processed++;
    for (const vio of violations) {
      byCode[vio.code] = (byCode[vio.code] ?? 0) + 1;
      bySeverity[vio.severity] = (bySeverity[vio.severity] ?? 0) + 1;
      if (samples.length < MAX_SAMPLES) {
        samples.push({
          code: vio.code,
          severity: vio.severity,
          message: vio.message,
          input,
          evidence: vio.evidence,
        });
      }
    }
    if (accuracy) {
      accuracyChecked++;
      // A blocked identity is a coverage gap (torque/MRR not emitted), not a defect --
      // record its kind once so the dashboard can name what was NOT verified (R12).
      for (const b of accuracy.blocked) blockedIdentityKinds.add(b.kind);
      for (const ov of accuracy.violations) {
        byAccuracyKind[ov.kind] = (byAccuracyKind[ov.kind] ?? 0) + 1;
        accuracyViolations++;
        if (accuracySamples.length < MAX_SAMPLES) {
          accuracySamples.push({
            kind: ov.kind,
            expected: ov.expected,
            actual: ov.actual,
            relPct: ov.relPct,
            note: ov.note,
            input,
          });
        }
      }
    }
  }

  const dashboard = {
    schemaVersion: "1.0.0",
    generatedBy: "lathe-wizard-combinatorial-sweep",
    engine: "LatheSpeedFeedCalculatorFacadeEngine.calculate",
    mode,
    space: {
      total_combinations: total,
      dimensions: {
        materials: dims.materials.length,
        lathe_machines: dims.machines.length,
        tool_types: TOOL_TYPES.length,
        operations: OPERATIONS.length,
        strategies: STRATEGIES.length,
        coolants: COOLANTS.length,
        diameters: DIAMETERS_MM.length,
        depths: DEPTHS_MM.length,
      },
    },
    coverage: {
      processed,
      total,
      fraction: total > 0 ? processed / total : 0,
      offset: offsetN,
      next_offset: doAll ? offsetN + processed : undefined,
    },
    violations: {
      total: Object.values(byCode).reduce((a, b) => a + b, 0),
      by_severity: bySeverity,
      by_code: byCode,
      engine_throws: engineFailures,
      samples,
    },
    accuracy: {
      instrument: "turning-sweep-oracle (turningPerCellOracle) via lathe-wizard-accuracy",
      identities: [
        "rpm = 1000*Vc/(pi*D) [clamp-aware, external-turning only]",
        "power = Fc*Vc/(60000*eta), eta=0.85",
        "force = kc1_1*ap*f^(1-mc)",
        "tool_life = (C/Vc)^(1/n)",
      ],
      checked: accuracyChecked,
      oracle_violations: accuracyViolations,
      by_kind: byAccuracyKind,
      // R12: torque (Fc*D/2000) + MRR (ap*f*Vc) are NOT VERIFIED because the facade emits
      // neither predicted_torque_Nm nor predicted_mrr_cm3_min -- surfaced, never hidden.
      blocked_identities: [...blockedIdentityKinds].sort(),
      samples: accuracySamples,
    },
    verdict:
      (bySeverity.P0 ?? 0) === 0 && accuracyViolations === 0
        ? "PASS (no P0 invariant + no accuracy-oracle violations in the processed set)"
        : `FAIL (${bySeverity.P0 ?? 0} P0 invariant, ${accuracyViolations} accuracy-oracle violations)`,
  };

  mkdirSync(dirname(DASHBOARD_PATH), { recursive: true });
  writeFileSync(DASHBOARD_PATH, JSON.stringify(dashboard, null, 2));

  if (asJson) {
    process.stdout.write(JSON.stringify(dashboard, null, 2) + "\n");
  } else {
    const pct = ((processed / total) * 100).toFixed(4);
    process.stdout.write(
      `Lathe Wizard combinatorial sweep [${mode}]\n` +
        `  space: ${total.toLocaleString()} total combinations ` +
        `(${dims.materials.length} materials x ${dims.machines.length} lathes x ` +
        `${TOOL_TYPES.length} tools x ${OPERATIONS.length} ops x ${STRATEGIES.length} strategies x ` +
        `${COOLANTS.length} coolants x ${DIAMETERS_MM.length} dia x ${DEPTHS_MM.length} depth)\n` +
        `  processed: ${processed.toLocaleString()} (${pct}% of total)\n` +
        `  violations: P0=${bySeverity.P0} P1=${bySeverity.P1} P2=${bySeverity.P2} ` +
        `engine_throws=${engineFailures}\n` +
        `  by_code: ${JSON.stringify(byCode)}\n` +
        `  accuracy: checked=${accuracyChecked.toLocaleString()} ` +
        `oracle_violations=${accuracyViolations} by_kind=${JSON.stringify(byAccuracyKind)} ` +
        `blocked=[${[...blockedIdentityKinds].sort().join(",")}]\n` +
        `  verdict: ${dashboard.verdict}\n` +
        `  dashboard: ${DASHBOARD_PATH}\n`,
    );
  }

  // Non-zero exit on any P0 invariant OR any accuracy-oracle divergence so a cron/CI
  // run fails loudly on either a structural break or a silent-wrong numeric identity.
  if ((bySeverity.P0 ?? 0) > 0 || accuracyViolations > 0) process.exitCode = 1;
}

// Run only when invoked directly (npx tsx ...), so importing this module for tests or the
// verification workflow does not trigger a full sweep.
const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();
