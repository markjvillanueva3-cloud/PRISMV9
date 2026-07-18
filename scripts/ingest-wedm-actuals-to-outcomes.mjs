#!/usr/bin/env node
/**
 * ingest-wedm-actuals-to-outcomes.mjs -- backfill WEDM real job actuals into the closed-loop
 * outcome bus (FLEET-CLOSEDLOOP-MS0/U-CL-WEDM, slot:zulu 2026-06-19).
 *
 * SOURCE: mcp-server/data/state/WEDM_OUTCOME_LEDGER.jsonl -- 687 REAL predict->actual job records
 * (WEDMJobOutcomeEngine), each with {material, thicknessMm, wireDiameterMm, wireMaterial, controller,
 * predicted:{raUm,cycleTimeMin,wireBreaks}, actual:{raUm,cycleTimeMin,wireBreaks}, recipe:{...}}.
 * This ledger was a disconnected island -- it never reached state/outcomes/wedm.jsonl, so the
 * EXISTING build-outcomes-lora-dataset.mjs (which reads state/outcomes/*.jsonl) yielded 0 wedm pairs.
 *
 * This emits each record as a schema-valid OutcomeEvent via scripts/lib/outcome-actual-emit.mjs:
 *   recommended = recipe (the run parameters -> the training OUTPUT a wire-wizard should learn)
 *   actual      = measured {ra_um, cycle_time_min, wire_breaks} (what happened -> residual/quality)
 *   delta       = {predicted} (the model's prior prediction)
 *   lineage_id  = jobId (the natural recommendation->outcome pairing key)
 * The instruction is built from determining inputs (material + a descriptive operation carrying
 * thickness/wire) so the converter does NOT skip it. The fleet corpus assembler then folds the
 * resulting outcomes-dataset.jsonl in automatically (advisory 0.5 weight -- engine-run recipes,
 * not hand-verified doctrine). IDEMPOTENT: re-running skips jobIds already on the shard.
 *
 * Usage:
 *   node scripts/ingest-wedm-actuals-to-outcomes.mjs          # dry-run: counts only
 *   node scripts/ingest-wedm-actuals-to-outcomes.mjs --out    # append to state/outcomes/wedm.jsonl
 *   node scripts/ingest-wedm-actuals-to-outcomes.mjs --json   # machine-readable summary
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import { emitOutcomeActual, buildOutcomeEvent, OUTCOMES_DIR } from "./lib/outcome-actual-emit.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LEDGER = path.join(ROOT, "mcp-server", "data", "state", "WEDM_OUTCOME_LEDGER.jsonl");

/** Round a number to <=4 significant decimals, pass through non-numbers. Keeps lines compact. */
function num(v) {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v * 1e4) / 1e4 : v;
}

/**
 * Map a WEDM ledger entry -> buildOutcomeEvent opts, or null if the entry is not a learnable
 * job record (header / missing material / empty recipe). PURE -- hermetically testable.
 */
export function wedmEntryToEmitOpts(entry) {
  if (!entry || entry.type !== "entry") return null;
  const material = typeof entry.material === "string" ? entry.material.trim() : "";
  const recipe = entry.recipe && typeof entry.recipe === "object" ? entry.recipe : null;
  if (!material || !recipe || Object.keys(recipe).length === 0) return null;

  const t = entry.thicknessMm != null ? `t=${num(entry.thicknessMm)}mm ` : "";
  const w = entry.wireDiameterMm != null ? `wire=${num(entry.wireDiameterMm)}mm ` : "";
  const wm = typeof entry.wireMaterial === "string" && entry.wireMaterial ? `${entry.wireMaterial} ` : "";
  const operation = `wire-edm ${t}${w}${wm}`.trim();

  const context = { material, operation, action: "recommend_recipe" };
  if (typeof entry.controller === "string" && entry.controller.trim()) context.machine_id = entry.controller.trim();

  const recommended = {};
  for (const [k, v] of Object.entries(recipe)) recommended[k] = num(v);

  const actual = {};
  if (entry.actual && typeof entry.actual === "object") {
    if (entry.actual.raUm != null) actual.ra_um = num(entry.actual.raUm);
    if (entry.actual.cycleTimeMin != null) actual.cycle_time_min = num(entry.actual.cycleTimeMin);
    if (entry.actual.wireBreaks != null) actual.wire_breaks = num(entry.actual.wireBreaks);
  }

  const opts = {
    domain: "wedm",
    kind: "surface_finish_ra",
    source: "import",
    context,
    recommended,
    lineage_id: typeof entry.jobId === "string" && entry.jobId ? entry.jobId : undefined,
  };
  if (Object.keys(actual).length) {
    opts.actual = actual;
    // Confidence from outcome quality: a clean run (no wire breaks) is a stronger recipe signal.
    opts.confidence = typeof entry.actual.wireBreaks === "number" && entry.actual.wireBreaks > 0 ? 0.5 : 0.9;
    opts.delta = entry.predicted && typeof entry.predicted === "object" ? { predicted: entry.predicted } : undefined;
  }
  if (typeof entry.finishedAt === "string" && entry.finishedAt) opts.timestamp = entry.finishedAt;
  return opts;
}

/**
 * CONTENT idempotency key (PURE). Keyed on the learnable content (lineage_id + the recommended
 * recipe + measured actual + the determining inputs), NOT jobId alone -- the WEDM ledger reuses
 * jobIds across distinct-content records, so a jobId-only key would drop real signal. Works on
 * both an emit-opts object and a parsed stored event (both carry lineage_id/recommended/actual/context).
 */
export function contentKey(x) {
  const c = (x && x.context) || {};
  const basis = JSON.stringify([
    x && x.lineage_id != null ? String(x.lineage_id) : "",
    x && x.recommended != null ? x.recommended : null,
    x && x.actual != null ? x.actual : null,
    c.material || "",
    c.operation || "",
  ]);
  return crypto.createHash("sha256").update(basis).digest("hex").slice(0, 24);
}

/** content keys already present in the target shard (idempotency across re-runs). */
function existingContentKeys(shardPath, readFileImpl = fs.readFileSync) {
  const keys = new Set();
  let text = "";
  try { text = readFileImpl(shardPath, "utf8"); } catch { return keys; }
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try { keys.add(contentKey(JSON.parse(t))); } catch { /* skip */ }
  }
  return keys;
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--out");
  const asJson = args.includes("--json");

  let lines = [];
  try { lines = fs.readFileSync(LEDGER, "utf8").split("\n"); } catch (e) {
    process.stderr.write(`cannot read ledger ${LEDGER}: ${e?.message ?? e}\n`);
    process.exit(1);
  }

  const shard = path.join(OUTCOMES_DIR, "wedm.jsonl");
  const seen = existingContentKeys(shard); // content keys already on the shard (re-run idempotency)

  let entries = 0, learnable = 0, skippedExisting = 0, emitted = 0, failed = 0, invalid = 0;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    let entry;
    try { entry = JSON.parse(t); } catch { invalid++; continue; }
    if (entry.type === "entry") entries++;
    const opts = wedmEntryToEmitOpts(entry);
    if (!opts) continue;
    learnable++;
    const key = contentKey(opts);
    if (seen.has(key)) { skippedExisting++; continue; } // exact-content dup (re-run OR in-ledger dup)
    seen.add(key);
    if (!write) {
      // dry-run: still validate the event would build (fail-loud surfacing of any mapping bug).
      try { buildOutcomeEvent(opts); } catch { failed++; }
      continue;
    }
    const r = emitOutcomeActual(opts);
    if (r.ok) { emitted++; } else { failed++; seen.delete(key); }
  }

  const summary = { ledger: LEDGER, entries, learnable, skippedExisting, emitted: write ? emitted : 0, failed, invalid, wrote: write ? shard : null };
  if (asJson) {
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  } else {
    process.stdout.write(
      `WEDM ingest: ${entries} entries, ${learnable} learnable, ${skippedExisting} already-on-shard, ` +
      `${write ? `${emitted} emitted` : "(dry-run)"}, ${failed} failed, ${invalid} invalid-lines\n` +
      (write ? `Wrote -> ${shard}\n` : `(dry-run; pass --out to append to ${shard})\n`),
    );
  }
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();
