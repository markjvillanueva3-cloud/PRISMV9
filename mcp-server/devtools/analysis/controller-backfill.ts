/**
 * MCAT-MS0 U-MCAT05: Controller Data Backfill
 *
 * Backfills missing controller data for top 15 manufacturers using
 * manufacturer-specific default controller mappings.
 *
 * Run: npx tsx devtools/analysis/controller-backfill.ts [--dry-run]
 *
 * Sources:
 * - Manufacturer spec sheets
 * - Machinery's Handbook controller compatibility tables
 * - JM Die production experience
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONTROLLER MAPPINGS BY MANUFACTURER
// ============================================================================

interface ControllerDefault {
  manufacturer: string;
  model: string;
  type?: string;
  features?: string[];
}

/**
 * Default controller mappings for top 15 machine manufacturers.
 * Based on typical OEM partnerships and common configurations.
 */
const CONTROLLER_DEFAULTS: Record<string, ControllerDefault[]> = {
  // Haas - proprietary NGC controller
  "Haas": [
    { manufacturer: "Haas", model: "NGC", type: "Haas", features: ["conversational", "rigid_tapping", "tool_probe"] },
  ],
  "HAAS": [
    { manufacturer: "Haas", model: "NGC", type: "Haas", features: ["conversational", "rigid_tapping", "tool_probe"] },
  ],

  // DMG MORI - Siemens or FANUC depending on region/model
  "DMG MORI": [
    { manufacturer: "Siemens", model: "840D sl", type: "Siemens", features: ["5_axis", "high_speed", "shopmill"] },
    { manufacturer: "FANUC", model: "31i-B5", type: "FANUC", features: ["5_axis", "high_speed"] },
  ],
  "DMG Mori": [
    { manufacturer: "Siemens", model: "840D sl", type: "Siemens", features: ["5_axis", "high_speed", "shopmill"] },
  ],

  // Okuma - proprietary OSP controller
  "Okuma": [
    { manufacturer: "Okuma", model: "OSP-P300", type: "OSP", features: ["collision_avoidance", "thermo_friendly", "machining_navi"] },
  ],
  "OKUMA": [
    { manufacturer: "Okuma", model: "OSP-P300", type: "OSP", features: ["collision_avoidance", "thermo_friendly", "machining_navi"] },
  ],

  // Mazak - proprietary MAZATROL
  "Mazak": [
    { manufacturer: "Mazak", model: "MAZATROL SmoothG", type: "MAZATROL", features: ["conversational", "smooth_corner", "intelligent_thermal"] },
  ],
  "MAZAK": [
    { manufacturer: "Mazak", model: "MAZATROL SmoothG", type: "MAZATROL", features: ["conversational", "smooth_corner"] },
  ],

  // Makino - FANUC or proprietary Pro
  "Makino": [
    { manufacturer: "FANUC", model: "31i-B5", type: "FANUC", features: ["high_speed", "5_axis"] },
    { manufacturer: "Makino", model: "Professional 6", type: "Makino Pro", features: ["sgi", "high_speed"] },
  ],

  // Hurco - proprietary WinMax
  "Hurco": [
    { manufacturer: "Hurco", model: "WinMax", type: "Hurco", features: ["conversational", "ultimotion", "solid_model_import"] },
  ],
  "HURCO": [
    { manufacturer: "Hurco", model: "WinMax", type: "Hurco", features: ["conversational", "ultimotion"] },
  ],

  // Brother - Brother CNC or FANUC
  "Brother": [
    { manufacturer: "Brother", model: "CNC-C00", type: "Brother", features: ["high_speed", "tapping"] },
  ],

  // Doosan/DN Solutions - FANUC
  "Doosan": [
    { manufacturer: "FANUC", model: "0i-TF Plus", type: "FANUC", features: ["turning", "rigid_tapping"] },
  ],
  "DN Solutions": [
    { manufacturer: "FANUC", model: "0i-MF Plus", type: "FANUC", features: ["milling", "rigid_tapping"] },
  ],

  // Hardinge - FANUC
  "Hardinge": [
    { manufacturer: "FANUC", model: "0i-TF", type: "FANUC", features: ["turning", "precision"] },
  ],

  // Mori Seiki (legacy, now DMG MORI) - FANUC or MSC
  "Mori Seiki": [
    { manufacturer: "FANUC", model: "31i-A5", type: "FANUC", features: ["5_axis"] },
    { manufacturer: "Mori Seiki", model: "MSC-501", type: "MSC", features: ["conversational"] },
  ],

  // Matsuura - FANUC
  "Matsuura": [
    { manufacturer: "FANUC", model: "31i-B5", type: "FANUC", features: ["5_axis", "high_speed"] },
  ],

  // Kitamura - FANUC
  "Kitamura": [
    { manufacturer: "FANUC", model: "31i-B5", type: "FANUC", features: ["5_axis", "high_speed"] },
    { manufacturer: "Kitamura", model: "Arumatik-Mi", type: "Kitamura", features: ["conversational"] },
  ],

  // Fadal - FANUC
  "Fadal": [
    { manufacturer: "FANUC", model: "0i-MF", type: "FANUC", features: ["milling"] },
  ],

  // Fanuc - FANUC Robodrill
  "Fanuc": [
    { manufacturer: "FANUC", model: "31i-B5", type: "FANUC", features: ["high_speed", "robodrill"] },
  ],
  "FANUC": [
    { manufacturer: "FANUC", model: "31i-B5", type: "FANUC", features: ["high_speed"] },
  ],

  // Roku-Roku - FANUC (high-speed graphite/EDM electrode)
  "Roku-Roku": [
    { manufacturer: "FANUC", model: "31i-B5", type: "FANUC", features: ["high_speed", "graphite"] },
  ],

  // Feeler - FANUC
  "Feeler": [
    { manufacturer: "FANUC", model: "0i-MF Plus", type: "FANUC", features: ["milling"] },
  ],

  // Chiron - Siemens
  "Chiron": [
    { manufacturer: "Siemens", model: "840D sl", type: "Siemens", features: ["high_speed", "5_axis"] },
  ],

  // Grob - Siemens
  "Grob": [
    { manufacturer: "Siemens", model: "840D sl", type: "Siemens", features: ["5_axis", "automation"] },
  ],

  // Hermle - Heidenhain
  "Hermle": [
    { manufacturer: "Heidenhain", model: "TNC 640", type: "Heidenhain", features: ["5_axis", "high_precision"] },
  ],

  // Mitsubishi - Mitsubishi M80/M800
  "Mitsubishi": [
    { manufacturer: "Mitsubishi", model: "M800", type: "Mitsubishi", features: ["high_speed", "ssc"] },
  ],
};

// ============================================================================
// BACKFILL LOGIC
// ============================================================================

interface BackfillResult {
  timestamp: string;
  source_file: string;
  total_machines: number;
  backfilled: number;
  skipped: number;
  changes: Array<{
    machine_id: string;
    manufacturer: string;
    before: { manufacturer?: string; model?: string };
    after: { manufacturer: string; model: string };
  }>;
  errors: string[];
}

function backfillControllers(dryRun: boolean = true): BackfillResult {
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
    backfilled: 0,
    skipped: 0,
    changes: [],
    errors: [],
  };

  for (const machine of data) {
    if (!machine.id || !machine.manufacturer) {
      result.errors.push(`Machine missing id or manufacturer: ${JSON.stringify(machine).slice(0, 100)}`);
      continue;
    }

    // Check if controller needs backfill
    const ctrl = machine.controller ?? {};
    const hasManufacturer = ctrl.manufacturer &&
                           typeof ctrl.manufacturer === 'string' &&
                           ctrl.manufacturer !== '' &&
                           ctrl.manufacturer !== 'unknown';
    const hasModel = ctrl.model &&
                    typeof ctrl.model === 'string' &&
                    ctrl.model !== '' &&
                    ctrl.model !== 'unknown';

    if (hasManufacturer && hasModel) {
      result.skipped++;
      continue;
    }

    // Find default controller for this manufacturer
    const mfr = typeof machine.manufacturer === 'string' ? machine.manufacturer : '';
    const defaults = CONTROLLER_DEFAULTS[mfr];

    if (!defaults || defaults.length === 0) {
      // No mapping available
      result.skipped++;
      continue;
    }

    // Use first default (most common)
    const defaultCtrl = defaults[0];

    const before = {
      manufacturer: ctrl.manufacturer,
      model: ctrl.model,
    };

    // Apply backfill
    if (!machine.controller) {
      machine.controller = {};
    }

    if (!hasManufacturer) {
      machine.controller.manufacturer = defaultCtrl.manufacturer;
    }
    if (!hasModel) {
      machine.controller.model = defaultCtrl.model;
    }
    if (defaultCtrl.type && !machine.controller.type) {
      machine.controller.type = defaultCtrl.type;
    }
    if (defaultCtrl.features && !machine.controller.features) {
      machine.controller.features = defaultCtrl.features;
    }

    // Mark as backfilled
    machine.controller._backfilled = true;
    machine.controller._backfill_source = 'MCAT-MS0/U-MCAT05';
    machine.controller._backfill_date = result.timestamp;

    result.changes.push({
      machine_id: machine.id,
      manufacturer: mfr,
      before,
      after: {
        manufacturer: machine.controller.manufacturer,
        model: machine.controller.model,
      },
    });

    result.backfilled++;
  }

  // Write results
  if (!dryRun && result.backfilled > 0) {
    fs.writeFileSync(corpusPath, JSON.stringify(data, null, 2));
    console.log(`✓ Wrote ${result.backfilled} updates to ${corpusPath}`);
  }

  // Write changelog
  const changelogPath = path.resolve(__dirname, 'controller-backfill-changelog.json');
  fs.writeFileSync(changelogPath, JSON.stringify(result, null, 2));
  console.log(`✓ Changelog written to ${changelogPath}`);

  return result;
}

// ============================================================================
// MAIN
// ============================================================================

const args = process.argv.slice(2);
const dryRun = !args.includes('--apply');

console.log(`\n=== MCAT-MS0 U-MCAT05: Controller Data Backfill ===`);
console.log(`Mode: ${dryRun ? 'DRY RUN (use --apply to write changes)' : 'APPLYING CHANGES'}\n`);

const result = backfillControllers(dryRun);

console.log(`\nSummary:`);
console.log(`  Total machines: ${result.total_machines}`);
console.log(`  Backfilled:     ${result.backfilled}`);
console.log(`  Skipped:        ${result.skipped}`);
console.log(`  Errors:         ${result.errors.length}`);

if (result.backfilled > 0) {
  console.log(`\nSample changes (first 5):`);
  for (const change of result.changes.slice(0, 5)) {
    console.log(`  ${change.machine_id}: ${change.before.manufacturer ?? 'null'}/${change.before.model ?? 'null'} → ${change.after.manufacturer}/${change.after.model}`);
  }
}

if (dryRun && result.backfilled > 0) {
  console.log(`\n⚠ DRY RUN — no changes written. Run with --apply to persist changes.`);
}
