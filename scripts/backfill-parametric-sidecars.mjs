#!/usr/bin/env node
/**
 * backfill-parametric-sidecars.mjs -- add the EQUATION-BASED parametric sidecar (model.parametric.py +
 * params.json) to already-staged deterministic CAD gens that predate the live-loop wiring (U-CAD-PARAMETRIC-
 * WIRE, a208d53781). The generation loop now stages the parametric form for every NEW deterministic part,
 * but the ~207 dirs staged before that commit lack it -- so the LoRA dataset (U-CAD-LORA-PARAMETRIC) emits 0
 * parametric training pairs from them. This backfill materializes the sidecars once so the parametric
 * training lane fills immediately instead of waiting for the night cron to slowly re-accumulate them.
 *
 * Pure reuse of the tested emitters + template renderer -- NO cadquery execution (emit + validate + write
 * only). Idempotent: skips dirs that already have model.parametric.py. Only deterministic shapes WITH a
 * template are backfilled (the LLM parts route through Ollama, no template). Fail-soft per dir.
 *
 *   node scripts/backfill-parametric-sidecars.mjs           # report only (dry run)
 *   node scripts/backfill-parametric-sidecars.mjs --write   # write the sidecars
 */
import fs from "node:fs";
import path from "node:path";
import { emitPrimitiveCode } from "./lib/cad-primitive-emit.mjs";
import { emitFeatureCode } from "./lib/cad-feature-emit.mjs";
import { hasTemplate, paramsFromDims, renderParametricScript, templateSpec } from "./lib/cad-parametric-templates.mjs";
import { codeInvalidReason, requestIsMetric } from "./cad-text-to-cadquery.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const GEN_DIR = path.resolve(ROOT, "state", "shared", "cad-text-gen");

/** Backfill one staged dir. Returns "written" | "exists" | "no-request" | "not-deterministic" | "invalid" | "error". */
export function backfillDir(dir, { write = false, deps = {} } = {}) {
  const readText = deps.readText || ((p) => fs.readFileSync(p, "utf8"));
  const existsSync = deps.existsSync || fs.existsSync;
  const writeFileSync = deps.writeFileSync || fs.writeFileSync;
  const reqPath = path.join(dir, "request.json");
  const paramPath = path.join(dir, "model.parametric.py");
  if (!existsSync(reqPath)) return "no-request";
  if (existsSync(paramPath)) return "exists";
  let request;
  try { request = JSON.parse(readText(reqPath)).request; } catch { return "no-request"; }
  if (typeof request !== "string" || !request.trim()) return "no-request";
  const e = emitPrimitiveCode(request) || emitFeatureCode(request);
  if (!e || !hasTemplate(e.shape)) return "not-deterministic";
  try {
    const params = paramsFromDims(e.shape, e.dimsMm);
    const pcode = renderParametricScript(e.shape, params);
    if (!pcode || codeInvalidReason(pcode, { requestIsMetric: requestIsMetric(request) })) return "invalid";
    if (write) {
      writeFileSync(paramPath, pcode, "utf8");
      writeFileSync(path.join(dir, "params.json"), JSON.stringify(templateSpec(e.shape, params), null, 2), "utf8");
    }
    return "written";
  } catch { return "error"; }
}

function main() {
  const write = process.argv.includes("--write");
  if (!fs.existsSync(GEN_DIR)) { console.error(`[backfill] no gen dir: ${GEN_DIR}`); process.exit(1); }
  const tally = { written: 0, exists: 0, "no-request": 0, "not-deterministic": 0, invalid: 0, error: 0 };
  for (const d of fs.readdirSync(GEN_DIR)) {
    const dir = path.join(GEN_DIR, d);
    let st; try { st = fs.statSync(dir); } catch { continue; }
    if (!st.isDirectory()) continue;
    tally[backfillDir(dir, { write })]++;
  }
  const verb = write ? "wrote" : "would write";
  console.log(`[backfill] ${verb} ${tally.written} parametric sidecars | already had: ${tally.exists} | not-deterministic(LLM): ${tally["not-deterministic"]} | invalid: ${tally.invalid} | error: ${tally.error} | no-request: ${tally["no-request"]}`);
  if (!write && tally.written) console.log("[backfill] dry run -- pass --write to materialize the sidecars, then re-run scripts/build-cadgen-lora-dataset.mjs --write");
}

if (process.argv[1] && path.resolve(process.argv[1]).replace(/\\/g, "/").endsWith("backfill-parametric-sidecars.mjs")) main();
