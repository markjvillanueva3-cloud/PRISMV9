/**
 * MCAT-MS0 U-MCAT06: Spindle + Coolant Data Backfill
 *
 * Backfills missing spindle and coolant data using manufacturer-specific
 * defaults and physics-based inference.
 *
 * Run: npx tsx devtools/analysis/spindle-coolant-backfill.ts [--apply]
 *
 * Spindle inference rules:
 * - Power from torque: P = T * n_base / 9549
 * - Torque from power: T = P * 9549 / n_base
 * - Base RPM typically 20-30% of max RPM for constant torque
 *
 * Coolant defaults by machine type:
 * - VMC/HMC: flood standard, TSC optional
 * - 5-axis: TSC 70bar typical
 * - Swiss: high-pressure coolant standard
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONSTANTS
// ============================================================================

const POWER_CONSTANT = 9549; // P(kW) = T(Nm) * n(RPM) / 9549

// ============================================================================
// SPINDLE DEFAULTS BY MANUFACTURER/TYPE
// ============================================================================

interface SpindleDefault {
  max_rpm?: number;
  power_kw?: number;
  torque_nm?: number;
  base_rpm?: number;
  taper?: string;
  coolant_through?: boolean;
  coolant_pressure_bar?: number;
}

interface MachineTypeDefaults {
  spindle: SpindleDefault;
  coolant: {
    flood: boolean;
    mist: boolean;
    through_spindle: boolean;
    pressure_bar: number;
  };
}

const TYPE_DEFAULTS: Record<string, MachineTypeDefaults> = {
  "VMC": {
    spindle: { max_rpm: 10000, power_kw: 15, taper: "CAT40", coolant_through: false },
    coolant: { flood: true, mist: false, through_spindle: false, pressure_bar: 0 },
  },
  "vertical_machining_center": {
    spindle: { max_rpm: 10000, power_kw: 15, taper: "CAT40", coolant_through: false },
    coolant: { flood: true, mist: false, through_spindle: false, pressure_bar: 0 },
  },
  "HMC": {
    spindle: { max_rpm: 12000, power_kw: 22, taper: "CAT40", coolant_through: true, coolant_pressure_bar: 20 },
    coolant: { flood: true, mist: false, through_spindle: true, pressure_bar: 20 },
  },
  "horizontal_machining_center": {
    spindle: { max_rpm: 12000, power_kw: 22, taper: "CAT40", coolant_through: true, coolant_pressure_bar: 20 },
    coolant: { flood: true, mist: false, through_spindle: true, pressure_bar: 20 },
  },
  "5AXIS": {
    spindle: { max_rpm: 18000, power_kw: 25, taper: "HSK-A63", coolant_through: true, coolant_pressure_bar: 70 },
    coolant: { flood: true, mist: false, through_spindle: true, pressure_bar: 70 },
  },
  "5_axis": {
    spindle: { max_rpm: 18000, power_kw: 25, taper: "HSK-A63", coolant_through: true, coolant_pressure_bar: 70 },
    coolant: { flood: true, mist: false, through_spindle: true, pressure_bar: 70 },
  },
  "LATHE": {
    spindle: { max_rpm: 4500, power_kw: 18, taper: "A2-6", coolant_through: false },
    coolant: { flood: true, mist: false, through_spindle: false, pressure_bar: 0 },
  },
  "turning_center": {
    spindle: { max_rpm: 4500, power_kw: 18, taper: "A2-6", coolant_through: false },
    coolant: { flood: true, mist: false, through_spindle: false, pressure_bar: 0 },
  },
  "MILL_TURN": {
    spindle: { max_rpm: 12000, power_kw: 22, taper: "HSK-T63", coolant_through: true, coolant_pressure_bar: 70 },
    coolant: { flood: true, mist: false, through_spindle: true, pressure_bar: 70 },
  },
  "SWISS": {
    spindle: { max_rpm: 10000, power_kw: 5, coolant_through: true, coolant_pressure_bar: 100 },
    coolant: { flood: true, mist: false, through_spindle: true, pressure_bar: 100 },
  },
  "swiss_type": {
    spindle: { max_rpm: 10000, power_kw: 5, coolant_through: true, coolant_pressure_bar: 100 },
    coolant: { flood: true, mist: false, through_spindle: true, pressure_bar: 100 },
  },
  "GRINDER": {
    spindle: { max_rpm: 3000, power_kw: 10, coolant_through: false },
    coolant: { flood: true, mist: false, through_spindle: false, pressure_bar: 0 },
  },
  "EDM_WIRE": {
    spindle: { max_rpm: 0, power_kw: 0, coolant_through: false },
    coolant: { flood: true, mist: false, through_spindle: false, pressure_bar: 0 },
  },
  "EDM_SINKER": {
    spindle: { max_rpm: 0, power_kw: 0, coolant_through: false },
    coolant: { flood: true, mist: false, through_spindle: false, pressure_bar: 0 },
  },
  "double_column_machining_center": {
    spindle: { max_rpm: 8000, power_kw: 30, taper: "BT50", coolant_through: true, coolant_pressure_bar: 20 },
    coolant: { flood: true, mist: false, through_spindle: true, pressure_bar: 20 },
  },
  "bridge_type": {
    spindle: { max_rpm: 8000, power_kw: 30, taper: "BT50", coolant_through: true, coolant_pressure_bar: 20 },
    coolant: { flood: true, mist: false, through_spindle: true, pressure_bar: 20 },
  },
};

// Manufacturer-specific spindle overrides
const MANUFACTURER_SPINDLE_DEFAULTS: Record<string, SpindleDefault> = {
  "Haas": { taper: "CAT40", coolant_through: false },
  "Okuma": { taper: "CAT40", coolant_through: true, coolant_pressure_bar: 20 },
  "DMG MORI": { taper: "HSK-A63", coolant_through: true, coolant_pressure_bar: 70 },
  "Mazak": { taper: "CAT40", coolant_through: true, coolant_pressure_bar: 20 },
  "Makino": { taper: "HSK-A63", coolant_through: true, coolant_pressure_bar: 70 },
  "Hurco": { taper: "CAT40", coolant_through: false },
  "Brother": { taper: "BT30", coolant_through: false },
  "Fanuc": { taper: "BT30", coolant_through: false },
  "Roku-Roku": { taper: "HSK-E40", coolant_through: false },
  "Hermle": { taper: "HSK-A63", coolant_through: true, coolant_pressure_bar: 40 },
  "Chiron": { taper: "HSK-A63", coolant_through: true, coolant_pressure_bar: 40 },
};

// ============================================================================
// INFERENCE FUNCTIONS
// ============================================================================

/**
 * Infer base RPM from max RPM (typically 20-30% of max for constant torque region)
 */
function inferBaseRpm(maxRpm: number): number {
  return Math.round(maxRpm * 0.25);
}

/**
 * Infer torque from power and base RPM: T = P * 9549 / n
 */
function inferTorque(powerKw: number, baseRpm: number): number {
  if (baseRpm <= 0) return 0;
  return Math.round((powerKw * POWER_CONSTANT) / baseRpm);
}

/**
 * Infer power from torque and base RPM: P = T * n / 9549
 */
function inferPower(torqueNm: number, baseRpm: number): number {
  return Math.round((torqueNm * baseRpm) / POWER_CONSTANT * 10) / 10;
}

// ============================================================================
// BACKFILL LOGIC
// ============================================================================

interface BackfillResult {
  timestamp: string;
  source_file: string;
  total_machines: number;
  spindle_backfilled: number;
  coolant_backfilled: number;
  skipped: number;
  changes: Array<{
    machine_id: string;
    spindle_changes: string[];
    coolant_changes: string[];
  }>;
  errors: string[];
}

function backfillSpindleCoolant(dryRun: boolean = true): BackfillResult {
  const corpusPath = path.resolve(__dirname, '../../../data/machines/ENHANCED/json/ALL_MACHINES_ENRICHED.json');

  if (!fs.existsSync(corpusPath)) {
    console.error(`Corpus file not found: ${corpusPath}`);
    process.exit(1);
  }

  const data: any[] = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));

  const result: BackfillResult = {
    timestamp: new Date().toISOString(),
    source_file: corpusPath,
    total_machines: data.length,
    spindle_backfilled: 0,
    coolant_backfilled: 0,
    skipped: 0,
    changes: [],
    errors: [],
  };

  for (const machine of data) {
    if (!machine.id) {
      result.errors.push(`Machine missing id`);
      continue;
    }

    const spindleChanges: string[] = [];
    const coolantChanges: string[] = [];

    // Get type defaults
    const machineType = machine.canonical_type ?? machine.type ?? machine.subtype ?? 'VMC';
    const typeDefaults = TYPE_DEFAULTS[machineType] ?? TYPE_DEFAULTS['VMC'];

    // Get manufacturer-specific overrides
    const mfr = typeof machine.manufacturer === 'string' ? machine.manufacturer : '';
    const mfrDefaults = MANUFACTURER_SPINDLE_DEFAULTS[mfr] ?? {};

    // Ensure spindle object exists
    if (!machine.spindle) {
      machine.spindle = {};
    }

    const spindle = machine.spindle;

    // Backfill spindle max_rpm
    if (!spindle.max_rpm || spindle.max_rpm <= 0) {
      const defaultRpm = typeDefaults.spindle.max_rpm ?? 10000;
      spindle.max_rpm = defaultRpm;
      spindleChanges.push(`max_rpm: 0 → ${defaultRpm}`);
    }

    // Backfill spindle power
    if (!spindle.power_kw && !spindle.power_continuous && !spindle.power_continuous_kw) {
      const defaultPower = typeDefaults.spindle.power_kw ?? 15;
      spindle.power_kw = defaultPower;
      spindle.power_continuous_kw = defaultPower;
      spindleChanges.push(`power_kw: null → ${defaultPower}`);
    }

    // Ensure power_continuous_kw is set
    if (!spindle.power_continuous_kw) {
      spindle.power_continuous_kw = spindle.power_kw ?? spindle.power_continuous ?? spindle.power ?? 15;
    }

    // Infer base_rpm if missing
    if (!spindle.base_rpm || spindle.base_rpm <= 0) {
      spindle.base_rpm = inferBaseRpm(spindle.max_rpm);
      spindleChanges.push(`base_rpm: inferred → ${spindle.base_rpm}`);
    }

    // Infer torque if missing
    if (!spindle.max_torque_nm && !spindle.torque_nm && !spindle.torque_max) {
      const inferredTorque = inferTorque(spindle.power_continuous_kw, spindle.base_rpm);
      spindle.max_torque_nm = inferredTorque;
      spindle.torque_nm = inferredTorque;
      spindleChanges.push(`torque_nm: inferred → ${inferredTorque}`);
    }

    // Backfill taper
    if (!spindle.taper && !spindle.spindle_nose) {
      const defaultTaper = mfrDefaults.taper ?? typeDefaults.spindle.taper ?? 'CAT40';
      spindle.taper = defaultTaper;
      spindleChanges.push(`taper: null → ${defaultTaper}`);
    }

    // Backfill coolant_through
    if (spindle.coolant_through === undefined) {
      const hasTsc = mfrDefaults.coolant_through ?? typeDefaults.spindle.coolant_through ?? false;
      spindle.coolant_through = hasTsc;
      coolantChanges.push(`coolant_through: undefined → ${hasTsc}`);
    }

    // Backfill coolant_pressure
    if (spindle.coolant_through && (!spindle.coolant_pressure || spindle.coolant_pressure <= 0)) {
      const defaultPressure = mfrDefaults.coolant_pressure_bar ?? typeDefaults.coolant.pressure_bar ?? 20;
      spindle.coolant_pressure = defaultPressure;
      coolantChanges.push(`coolant_pressure: 0 → ${defaultPressure} bar`);
    }

    // Mark as backfilled if changes made
    if (spindleChanges.length > 0) {
      spindle._backfilled = true;
      spindle._backfill_source = 'MCAT-MS0/U-MCAT06';
      spindle._backfill_date = result.timestamp;
      result.spindle_backfilled++;
    }

    if (coolantChanges.length > 0) {
      result.coolant_backfilled++;
    }

    if (spindleChanges.length === 0 && coolantChanges.length === 0) {
      result.skipped++;
    } else {
      result.changes.push({
        machine_id: machine.id,
        spindle_changes: spindleChanges,
        coolant_changes: coolantChanges,
      });
    }
  }

  // Write results
  if (!dryRun && (result.spindle_backfilled > 0 || result.coolant_backfilled > 0)) {
    fs.writeFileSync(corpusPath, JSON.stringify(data, null, 2));
    console.log(`✓ Wrote updates to ${corpusPath}`);
  }

  // Write changelog
  const changelogPath = path.resolve(__dirname, 'spindle-coolant-backfill-changelog.json');
  fs.writeFileSync(changelogPath, JSON.stringify(result, null, 2));
  console.log(`✓ Changelog written to ${changelogPath}`);

  return result;
}

// ============================================================================
// MAIN
// ============================================================================

const args = process.argv.slice(2);
const dryRun = !args.includes('--apply');

console.log(`\n=== MCAT-MS0 U-MCAT06: Spindle + Coolant Data Backfill ===`);
console.log(`Mode: ${dryRun ? 'DRY RUN (use --apply to write changes)' : 'APPLYING CHANGES'}\n`);

const result = backfillSpindleCoolant(dryRun);

console.log(`\nSummary:`);
console.log(`  Total machines:      ${result.total_machines}`);
console.log(`  Spindle backfilled:  ${result.spindle_backfilled}`);
console.log(`  Coolant backfilled:  ${result.coolant_backfilled}`);
console.log(`  Skipped:             ${result.skipped}`);
console.log(`  Errors:              ${result.errors.length}`);

if (result.changes.length > 0) {
  console.log(`\nSample changes (first 5):`);
  for (const change of result.changes.slice(0, 5)) {
    console.log(`  ${change.machine_id}:`);
    if (change.spindle_changes.length > 0) {
      console.log(`    Spindle: ${change.spindle_changes.join(', ')}`);
    }
    if (change.coolant_changes.length > 0) {
      console.log(`    Coolant: ${change.coolant_changes.join(', ')}`);
    }
  }
}

if (dryRun && (result.spindle_backfilled > 0 || result.coolant_backfilled > 0)) {
  console.log(`\n⚠ DRY RUN — no changes written. Run with --apply to persist changes.`);
}
