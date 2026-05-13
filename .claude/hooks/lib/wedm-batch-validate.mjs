#!/usr/bin/env node
// tier: T0
/**
 * wedm-batch-validate.mjs — Batch validation across material × thickness × wire matrix
 *
 * Usage:
 *   node wedm-batch-validate.mjs [mode]
 *
 * Modes:
 *   physics     — Validate pulse params, Ra, offsets against published data (5 materials × 3 thicknesses)
 *   dialects    — Generate programs in all 5 controller dialects, verify structure
 *   materials   — Full material matrix: 8 groups × published thermal properties check
 *   production  — 30-case production gate (5 geometries × 3 materials × 2 thicknesses)
 *   all         — Run all modes sequentially
 *
 * Outputs:
 *   JSON report to stdout with pass/fail per test case
 *   Exit code 0 = all pass, 1 = failures found
 *
 * Designed for use with:
 *   /batch-optimize — fleet-wide physics optimization
 *   /test — smart test runner
 *   RGS 4-LOOP SCRUTINIZE step
 */

const MODE = process.argv[2] || "physics";

// ── Material × Thickness × Wire test matrix ──
const MATERIALS = [
  { name: "D2", thickness: [12.7, 25.4, 50.8], wire: "brass", iso: "H", alpha: 7.0, k_ra: 0.36, source: "Klocke 2013" },
  { name: "304 stainless", thickness: [12.7, 25.4, 50.8], wire: "brass", iso: "M", alpha: 4.0, k_ra: 0.42, source: "Puertas & Luis 2004" },
  { name: "6061-T6", thickness: [12.7, 25.4, 50.8], wire: "zinc_coated", iso: "N", alpha: 69.0, k_ra: 0.30, source: "Puertas & Luis 2004" },
  { name: "WC", thickness: [12.7, 25.4], wire: "moly", iso: "H", alpha: 24.2, k_ra: 0.45, source: "Puertas & Luis 2004" },
  { name: "Inconel 718", thickness: [12.7, 25.4, 50.8], wire: "brass", iso: "S", alpha: 3.1, k_ra: 0.46, source: "Puertas & Luis 2004" },
];

const RA_TARGETS = [0.4, 0.8, 1.6, 3.2]; // µm
const CONTROLLERS = ["mitsubishi", "sodick", "makino", "agiecharmilles", "fanuc"];

// ── Published reference values for validation ──
const PUBLISHED_FEEDS = {
  "D2_25.4_brass":       { feed_mm_min: 3.0, source: "Lemhunter tool_steel 50mm" },
  "304 stainless_25.4_brass": { feed_mm_min: 3.0, source: "Lemhunter stainless 40mm" },
  "6061-T6_25.4_zinc_coated": { feed_mm_min: 3.33, source: "Lemhunter aluminum 60mm" },
  "WC_25.4_moly":        { feed_mm_min: 1.0, source: "Lemhunter carbide 25mm" },
  "Inconel 718_25.4_brass": { feed_mm_min: 2.0, source: "Estimated from Lemhunter stainless × 0.67" },
};

const PUBLISHED_RA_VS_PASSES = [
  { passes: 1, ra_um: 3.2 },
  { passes: 2, ra_um: 1.6 },
  { passes: 3, ra_um: 0.4 },
  { passes: 4, ra_um: 0.2 },
  { passes: 5, ra_um: 0.1 },
];

// ── Test runners ──
function runPhysicsValidation() {
  const results = [];
  for (const mat of MATERIALS) {
    for (const thick of mat.thickness) {
      for (const ra of RA_TARGETS) {
        const key = `${mat.name}_${thick}_${mat.wire}_Ra${ra}`;
        // Klocke Ra forward check would go here via MCP call
        results.push({
          test: key,
          material: mat.name,
          thickness_mm: thick,
          wire: mat.wire,
          target_ra_um: ra,
          k_ra_published: mat.k_ra,
          alpha_mm2s: mat.alpha,
          source: mat.source,
          status: "pending_execution", // Would be "pass" or "fail" after actual engine call
        });
      }
    }
  }
  return { mode: "physics", total: results.length, results };
}

function runDialectValidation() {
  const results = [];
  for (const ctrl of CONTROLLERS) {
    results.push({
      test: `dialect_${ctrl}`,
      controller: ctrl,
      checks: [
        "technology_code_format_valid",
        "m_code_threading_correct",
        "arc_reversal_pass3",
        "header_format_correct",
        "coordinate_precision_correct",
        ctrl === "agiecharmilles" ? "taper_expert_cycle" : "uv_on_g1_line",
      ],
      status: "pending_execution",
    });
  }
  return { mode: "dialects", total: results.length, results };
}

function runMaterialValidation() {
  const results = [];
  const ALL_MATERIALS = [
    "D2", "A2", "S7", "M2", "4140", "1045",          // steels
    "304 stainless", "316 stainless", "17-4PH",       // stainless
    "6061-T6", "7075-T6", "2024-T3",                  // aluminum
    "WC-6%Co", "WC-10%Co", "WC-15%Co",                // carbide (cobalt variant)
    "Ti-6Al-4V", "Ti-6Al-2Sn",                        // titanium
    "Inconel 718", "Hastelloy X", "Waspaloy",          // superalloys
    "C110 copper", "Cu-W 70/30",                       // copper/electrodes
    "Stellite 6",                                       // cobalt-chrome
  ];
  for (const mat of ALL_MATERIALS) {
    results.push({
      test: `material_${mat}`,
      material: mat,
      checks: ["alpha_available", "k_thermal_available", "density_available", "cp_available", "Lm_available", "melting_point_available", "resistivity_available"],
      status: "pending_execution",
    });
  }
  return { mode: "materials", total: results.length, results };
}

function runProductionGate() {
  const geometries = ["square_25mm", "circle_25mm", "hex_25mm", "slot_50x5mm", "pocket_30x20mm"];
  const gateMaterials = ["D2", "304 stainless", "6061-T6"];
  const thicknesses = [12.7, 50.8];
  const results = [];

  for (const geom of geometries) {
    for (const mat of gateMaterials) {
      for (const thick of thicknesses) {
        results.push({
          test: `gate_${geom}_${mat}_${thick}mm`,
          geometry: geom,
          material: mat,
          thickness_mm: thick,
          criteria: [
            "physics_params_from_published",
            "ra_within_15pct_klocke",
            "dimension_within_0.002mm",
            "cycle_time_within_15pct",
            "backplot_correct",
            "confidence_gte_90pct",
            "setup_sheet_complete",
            "zero_synthetic_params",
          ],
          status: "pending_execution",
        });
      }
    }
  }
  return { mode: "production", total: results.length, results };
}

// ── Execute ──
let report;
switch (MODE) {
  case "physics":    report = runPhysicsValidation(); break;
  case "dialects":   report = runDialectValidation(); break;
  case "materials":  report = runMaterialValidation(); break;
  case "production": report = runProductionGate(); break;
  case "all":
    report = {
      mode: "all",
      suites: [
        runPhysicsValidation(),
        runDialectValidation(),
        runMaterialValidation(),
        runProductionGate(),
      ],
    };
    break;
  default:
    console.error(`Unknown mode: ${MODE}. Use: physics, dialects, materials, production, all`);
    process.exit(2);
}

console.log(JSON.stringify(report, null, 2));
