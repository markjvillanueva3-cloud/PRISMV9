/**
 * jm-sim-smoke.ts — prove QuoteToShipOrchestratorEngine runs standalone.
 * Run: npx tsx mcp-server/scripts/jm-sim-smoke.ts
 * De-risks the JM quote-to-ship simulation (R13) before building the harness.
 */
import { quoteToShipOrchestratorEngine } from "../src/engines/QuoteToShipOrchestratorEngine.js";

const input = {
  material_spec: "4140",
  quantity: 10,
  customer_id: "JM-SMOKE",
  drawing_pdf: "JM DIE/Prism JM Die/SMOKE/part-12345.pdf", // path ref only — analyzeBlueprint uses drawing_text (no re-OCR)
  drawing_text:
    "JM TOOL & DIE  PART NO 12345  MATERIAL: 4140 PREHARD STEEL  QTY: 10\n" +
    "OVERALL 2.000 X 1.000 X 0.500 IN\n" +
    "FEATURES: 4X .250 THRU HOLE; 1X .500 BORE +/-.001; 2X 1/4-20 TAPPED HOLE\n" +
    "TOLERANCE: ±0.005 UNLESS NOTED  SURFACE FINISH 63 RA  MATERIAL CERT REQUIRED",
  priority: "standard" as const,
  feature_candidates: [
    { type: "hole", dimensions: { diameter_mm: 6.35, depth_mm: 12.7 } },
    { type: "hole", dimensions: { diameter_mm: 6.35, depth_mm: 12.7 } },
    { type: "bore", dimensions: { diameter_mm: 12.7, depth_mm: 12.7 } },
    { type: "tapped_hole", dimensions: { diameter_mm: 6.35, depth_mm: 10 } },
  ],
};

const t0 = Date.now();
console.log("=== validateInput ===");
try {
  const v = quoteToShipOrchestratorEngine.validateInput(input as any);
  console.log(JSON.stringify(v).slice(0, 400));
} catch (e: any) {
  console.log("validateInput THREW:", e?.message);
}

console.log("\n=== runFullPipeline ===");
try {
  const res: any = await quoteToShipOrchestratorEngine.runFullPipeline(input as any);
  const fs = await import("node:fs");
  fs.writeFileSync("../state/shared/jm-sim/smoke-result.json", JSON.stringify(res, null, 2));
  const stages = Array.isArray(res?.stages) ? res.stages : [];
  console.log("status:", res?.status, "| pipeline_id:", res?.pipeline_id ?? res?.id, "| stages:", stages.length, "| ms:", Date.now() - t0);
  let pass = 0, fail = 0, skip = 0;
  for (const s of stages) {
    const st = s.status || s.result || "?";
    if (/pass|complete|ok|success/i.test(st)) pass++;
    else if (/skip/i.test(st)) skip++;
    else fail++;
  }
  console.log(`stage tally: PASS=${pass} SKIP=${skip} FAIL/OTHER=${fail}`);
  // introspect INTAKE blueprint_analysis shape (to design the FEATURE_RECOGNITION bridge)
  const intake = stages.find((s: any) => s.id === "INTAKE" || s.stage === "INTAKE");
  const ba = intake?.output?.blueprint_analysis;
  if (ba) console.log("\nINTAKE.blueprint_analysis keys:", Object.keys(ba).join(", "), "\n  sample:", JSON.stringify(ba).slice(0, 400));
  console.log("\nper-stage:");
  for (const s of stages) console.log(`  ${String(s.stage || s.id || "?").padEnd(22)} ${String(s.status || s.result || "?").padEnd(10)} ${s.error ? "ERR:" + String(s.error).slice(0, 80) : ""}`);
  // quote summary
  const q = res?.quote || res?.summary?.quote || stages.find((s: any) => /quote/i.test(s.stage))?.data;
  if (q) console.log("\nquote:", JSON.stringify(q).slice(0, 300));
} catch (e: any) {
  console.log("runFullPipeline THREW:", e?.message);
  console.log(String(e?.stack || "").split("\n").slice(0, 6).join("\n"));
}
