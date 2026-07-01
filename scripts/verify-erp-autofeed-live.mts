/**
 * verify-erp-autofeed-live.mts -- LIVE end-to-end proof that the print->ship
 * pipeline feeds the ERP-autofeed payload (the operator's "make sure the print
 * to ship pipeline is factored into the quoting system that auto feeds the app").
 *
 * Runs the REAL 34-stage QuoteToShipOrchestratorEngine + the REAL
 * ErpAutofeedProjectionEngine on a JM-representative part, then reports which
 * operator-named fields POPULATE vs ship null/empty (the dead-panel class).
 *
 * NOT a mock. NOT a test fixture. The real engines, real stages, real output.
 * Read-only: the autofeed projection never mutates ERP (commit is a separate verb).
 *
 * Run: node scripts/verify-erp-autofeed-live.mts   (self-reexecs under tsx)
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

// ---- tsx self-reexec guard (Node-24 .js->.ts dynamic-import trap) ----
const isUnderTsx = (): boolean =>
  process.env.PRISM_EAF_REEXEC === "1" ||
  (process.env.NODE_OPTIONS ?? "").includes("tsx") ||
  process.execArgv.some((a) => a.includes("tsx"));

const resolveTsxCli = (): string | null => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const cli = path.resolve(here, "../mcp-server/node_modules/tsx/dist/cli.mjs");
  return cli;
};

if (!isUnderTsx()) {
  const cli = resolveTsxCli();
  const r = spawnSync(process.execPath, [cli!, fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: "inherit",
    env: { ...process.env, PRISM_EAF_REEXEC: "1" },
  });
  process.exit(r.status ?? 1);
}

async function main(): Promise<void> {
  const { quoteToShipOrchestratorEngine } = await import(
    "../mcp-server/src/engines/QuoteToShipOrchestratorEngine.js"
  );
  const { erpAutofeedProjectionEngine } = await import(
    "../mcp-server/src/engines/ErpAutofeedProjectionEngine.js"
  );

  // A JM-representative part: a 4140 steel die-component with secondary ops,
  // tolerances, and a surface-finish requirement (drives QC + secondary + outsource).
  // INTAKE's text path requires drawing_pdf SET (path) alongside drawing_text
  // (the OCR-extracted text). feature_candidates feed FEATURE_RECOGNITION when
  // there is no STEP file. This is the realistic "OCR'd a print" production path.
  const input = {
    drawing_pdf: "JM-DEMO-001.pdf", // path marker -> selects the text/OCR intake path
    drawing_text:
      "PART NO: JM-DEMO-001 REV B. MATERIAL: 4140 PREHARD. QTY 25. " +
      "OAL 6.000 x 3.500 x 1.250 IN. (4) THRU HOLES .375 DIA. " +
      "1x BORE 1.0000 +.0005/-.0000 H7. FINISH 32 RA. " +
      "HEAT TREAT 50-52 HRC AFTER MACHINING. BLACK OXIDE. TOL .005 UNO.",
    feature_candidates: [
      { type: "hole", dimensions: { diameter_mm: 9.525, depth_mm: 31.75 }, position: { x: 10, y: 10, z: 0 } },
      { type: "hole", dimensions: { diameter_mm: 9.525, depth_mm: 31.75 }, position: { x: 140, y: 10, z: 0 } },
      { type: "bore", dimensions: { diameter_mm: 25.4, depth_mm: 31.75 }, position: { x: 75, y: 44, z: 0 } },
      { type: "pocket", dimensions: { width_mm: 50, length_mm: 80, depth_mm: 12 }, position: { x: 30, y: 20, z: 0 } },
    ],
    material_spec: "4140",
    quantity: 25,
    customer_id: "ALCOA",
    surface_finish_ra_um: 0.8,
    tolerances: [{ feature: "bore", value_mm: 0.013 }],
    industry_standard: "standard" as const,
    pre_approved: true,
  };

  console.log("=== Running 34-stage print->ship pipeline (LIVE) ===");
  const t0 = Date.now();
  const result = await quoteToShipOrchestratorEngine.runFullPipeline(input);
  console.log(
    `pipeline_id=${result.pipeline_id} status=${result.status} ` +
      `stages=${result.stages.length} elapsed=${Date.now() - t0}ms`,
  );

  // Per-stage pass/fail summary so we see what fed the autofeed.
  const byStatus: Record<string, number> = {};
  for (const s of result.stages) byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
  console.log("stage status counts:", JSON.stringify(byStatus));

  // Surface the FIRST failing stage's actual errors (the blocker to completion).
  const firstFail = result.stages.find((s) => s.status === "fail");
  if (firstFail) {
    console.log(`\n!!! FIRST FAILING STAGE: ${firstFail.id} (${firstFail.label})`);
    console.log(`    summary: ${firstFail.result_summary}`);
    console.log(`    errors:  ${JSON.stringify(firstFail.errors)}`);
    console.log(`    warnings:${JSON.stringify(firstFail.warnings)}`);
  }

  console.log("\n=== Projecting into ERP-autofeed payload (LIVE) ===");
  const payload = erpAutofeedProjectionEngine.project({
    result,
    job_id: "JOB-JM-DEMO-001",
    part_number: "JM-DEMO-001",
    revision: "B",
    customer: "ALCOA",
    material_iso_group: "P",
    material_name: "4140",
    batch_size: 25,
    cadcam_paid: false, // entitlement OFF -> CAD/CAM must withhold (fail-closed)
  });

  // ---- Field-population report (the operator's bullet list) ----
  const populated = (v: unknown): string => {
    if (v == null) return "NULL";
    if (typeof v === "object") {
      const keys = Object.keys(v as object);
      if (Array.isArray(v)) return v.length ? `[${v.length}]` : "EMPTY[]";
      return keys.length ? `{${keys.length} keys}` : "EMPTY{}";
    }
    return String(v);
  };

  const rows: Array<[string, string]> = [
    ["front_office.quote_id", populated(payload.front_office.quote_id)],
    ["front_office.quoted_price_usd", populated(payload.front_office.quoted_price_usd)],
    ["front_office.lead_time_days", populated(payload.front_office.lead_time_days)],
    ["cost_breakdown.total_cost_usd", populated(payload.cost_breakdown.total_cost_usd)],
    ["cost_breakdown.labor_usd", populated(payload.cost_breakdown.labor_usd)],
    ["cost_breakdown.material_usd", populated(payload.cost_breakdown.material_usd)],
    ["cost_breakdown.cycle_time_min", populated(payload.cost_breakdown.cycle_time_min)],
    ["tooling.selections", populated(payload.tooling.selections)],
    ["tooling.upgrade_roi (ROI on upgrades)", populated(payload.tooling.upgrade_roi)],
    ["material.stock (order-vs-on-hand)", populated(payload.material.stock)],
    ["material.market_pricing", populated(payload.material.market_pricing)],
    ["secondary_ops.secondary_ops", populated(payload.secondary_ops.secondary_ops)],
    ["secondary_ops.make_vs_buy (outsource)", populated(payload.secondary_ops.make_vs_buy)],
    ["quality.fai (QC sheet)", populated(payload.quality.fai)],
    ["cad_cam.entitled (paid gate)", populated(payload.cad_cam.entitled)],
    ["cad_cam.program_paths", populated(payload.cad_cam.program_paths)],
    ["cad_cam.setup_sheet", populated(payload.cad_cam.setup_sheet)],
    ["employee_portal.traveler", populated(payload.employee_portal.traveler)],
    ["employee_portal.checklist", populated(payload.employee_portal.checklist)],
    ["manager_notes.lean_watchouts", populated(payload.manager_notes.lean_watchouts)],
    ["manager_notes.manager_notes", populated(payload.manager_notes.manager_notes)],
  ];

  console.log("\n--- ERP-AUTOFEED FIELD POPULATION (operator's bullet list) ---");
  let filled = 0;
  for (const [k, v] of rows) {
    const flag = v === "NULL" || v.startsWith("EMPTY") ? "  ✗" : "  ✓";
    if (flag === "  ✓") filled++;
    console.log(`${flag} ${k.padEnd(42)} ${v}`);
  }
  console.log(`\n${filled}/${rows.length} operator-named fields populated.`);

  console.log(`\n--- gaps (R12 transparency) --- (${payload.gaps.length})`);
  for (const g of payload.gaps) console.log(`  ${g.stage} -> ${g.reason}`);

  // ---- Entitlement assertion: cadcam_paid:false MUST withhold ----
  if (payload.cad_cam.entitled !== false) {
    console.error("\nFAIL: cad_cam.entitled !== false despite cadcam_paid:false (entitlement leak)");
    process.exit(2);
  }
  if (payload.cad_cam.program_paths.length !== 0) {
    console.error("\nFAIL: program_paths leaked while unentitled");
    process.exit(2);
  }
  console.log("\nentitlement fail-closed: VERIFIED (cadcam_paid:false -> CAD/CAM withheld).");
}

main().catch((e) => {
  console.error("verify-erp-autofeed-live FAILED:", e);
  process.exit(1);
});
