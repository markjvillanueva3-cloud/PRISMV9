#!/usr/bin/env node
/**
 * build-quoting-lora-dataset.mjs — emit the quoting-domain LoRA instruction-tuning dataset
 * (slot:charlie). Charlie's side of the NN/GNN/LoRA synergy: charlie PRODUCES the training
 * dataset; india TRAINS the adapter (operator-canonical slot domains). Mirrors mike's
 * wedm-lora-smoke-out/{train,val,test}.jsonl pattern (format {id,instruction,input,output,metadata}).
 *
 * Source: the iter56 baseline corpus (state/shared/quoting/baseline-records-corpus-with-synth.json,
 * 47,905 (customer,part_id) records). Each record → ONE instruction-tuning example whose `output`
 * is an HONEST cost derivation from the record's own fields (no fabricated price): labor =
 * (cycle_s/3600)·rate, + material spend = total cost; the realized `actual_revenue_usd` is the label;
 * margin is derived; the `revenue_source` (docustrata-synth vs real) is stamped so india can weight
 * synth-heavy examples (R12 data-ceiling — see quoting-training-corpus-manifest.json).
 *
 * Deterministic (index-based split — reproducible datasets, no RNG). Pure-core + injected reader.
 *
 * CLI:  node scripts/build-quoting-lora-dataset.mjs [--limit N] [--full] [--root H:/prism] [--out <dir>]
 * Default: smoke set (--limit 40). --full streams the whole corpus (india's training run).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_ROOT = process.env.PRISM_ROOT || "H:/prism";
const SECONDS_PER_HOUR = 3600;
const SMOKE_LIMIT = 40;

/** Round to cents. Pure. */
function usd(n) { return Math.round((Number(n) || 0) * 100) / 100; }

/** Map ONE baseline record → an instruction-tuning example. Pure + defensive (gotcha #6). */
export function recordToExample(rec, idx) {
  const r = rec && typeof rec === "object" ? rec : {};
  const customer = typeof r.customer === "string" && r.customer ? r.customer : "UNSPECIFIED";
  const partId = typeof r.part_id === "string" && r.part_id ? r.part_id : `part-${idx}`;
  const machineClass = r.machine_class || "unspecified";
  const material = r.material_iso || "unspecified";
  const cycleS = Number.isFinite(r.estimated_time_in_cut_s) ? r.estimated_time_in_cut_s : 0;
  const rate = Number.isFinite(r.machine_rate_usd_per_hr) ? r.machine_rate_usd_per_hr : 0;
  const materialSpend = Number.isFinite(r.estimated_material_spend_usd) ? r.estimated_material_spend_usd : 0;
  const revenue = Number.isFinite(r.actual_revenue_usd) ? r.actual_revenue_usd : null;
  const source = r.revenue_source || "unknown";

  const laborCost = usd((cycleS / SECONDS_PER_HOUR) * rate);
  const totalCost = usd(laborCost + materialSpend);
  const margin = revenue && revenue > 0 ? Math.round(((revenue - totalCost) / revenue) * 1000) / 10 : null;

  const instruction = `Estimate the quote for part ${partId} (customer ${customer}). Show the cost derivation and resulting margin.`;
  const input = `machine_class: ${machineClass} · material: ${material} · est_cycle_s: ${cycleS} · machine_rate_usd_per_hr: ${rate} · material_spend_usd: ${materialSpend}`;
  const output =
    `Cost derivation (never inline shop rates — these come from jm-die-profile.ts at runtime):\n` +
    `- Labor = (cycle_s / 3600) × machine_rate = (${cycleS}/3600) × $${rate} = $${laborCost}\n` +
    `- Total cost = labor + material spend = $${laborCost} + $${materialSpend} = $${totalCost}\n` +
    (revenue != null
      ? `- Observed revenue (label): $${usd(revenue)} (source: ${source}) → margin = (rev − cost)/rev = ${margin}%`
      : `- No realized revenue label for this record (source: ${source}).`) +
    (source.includes("synth")
      ? `\n[R12 data-ceiling: this label is SYNTH (DocuStrata is inbound-only); weight accordingly — real outbound revenue awaits U-QP-ACCOUNTING-WIRE.]`
      : "");

  return {
    id: `${partId}::${customer}`.slice(0, 120).replace(/\s+/g, "_"),
    instruction,
    input,
    output,
    metadata: { customer, machine_class: machineClass, material_iso: material, revenue_source: source, total_cost_usd: totalCost, margin_pct: margin, domain: "quoting", slot: "charlie" },
  };
}

/** Deterministic index-based split (reproducible — NO rng). Pure. every 5th→val, every (1 mod 5 within remaining)→test. */
export function splitDataset(examples, opts = {}) {
  const arr = Array.isArray(examples) ? examples : [];
  const valEvery = Math.max(2, opts.valEvery || 5);  // ~20% val
  const testEvery = Math.max(2, opts.testEvery || 6); // ~ further slice → test
  const train = [], val = [], test = [];
  arr.forEach((e, i) => {
    if (i % valEvery === 0) val.push(e);
    else if (i % testEvery === 0) test.push(e);
    else train.push(e);
  });
  return { train, val, test };
}

function toJsonl(rows) { return rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""); }

/** Impure: read corpus, map, split, write. Defensive. */
export function build(opts = {}) {
  const root = (opts.root || DEFAULT_ROOT).replace(/\\/g, "/");
  const limit = opts.full ? Infinity : Number.isFinite(opts.limit) ? opts.limit : SMOKE_LIMIT;
  let records = opts.records;
  if (!records) {
    const corpusPath = opts.corpusPath || join(root, "state/shared/quoting/baseline-records-corpus-with-synth.json");
    let parsed;
    try { parsed = JSON.parse(readFileSync(corpusPath, "utf8")); } catch (e) { return { ok: false, reason: `corpus read failed: ${e && e.message}` }; }
    records = Array.isArray(parsed) ? parsed : (parsed.records || parsed.entries || []);
  }
  const sample = records.slice(0, limit);
  const examples = sample.map((r, i) => recordToExample(r, i));
  const splits = splitDataset(examples, opts);
  return { ok: true, counts: { source: records.length, used: sample.length, train: splits.train.length, val: splits.val.length, test: splits.test.length }, splits };
}

// ---- CLI ------------------------------------------------------------------

function main(argv) {
  const root = (argv.find((a) => a.startsWith("--root=")) || "").split("=")[1] || DEFAULT_ROOT;
  const limArg = (argv.find((a) => a.startsWith("--limit=")) || "").split("=")[1];
  const outArg = (argv.find((a) => a.startsWith("--out=")) || "").split("=")[1];
  const res = build({ root, full: argv.includes("--full"), limit: limArg ? parseInt(limArg, 10) : undefined });
  if (!res.ok) { process.stderr.write(`[quoting-lora] FAILED: ${res.reason}\n`); return 1; }
  if (argv.includes("--json")) { process.stdout.write(JSON.stringify(res.counts, null, 2) + "\n"); return 0; }
  const outDir = outArg || join(root, "mcp-server/data/quoting-lora-smoke-out");
  try {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "quoting_lora_train.jsonl"), toJsonl(res.splits.train), "utf8");
    writeFileSync(join(outDir, "quoting_lora_val.jsonl"), toJsonl(res.splits.val), "utf8");
    writeFileSync(join(outDir, "quoting_lora_test.jsonl"), toJsonl(res.splits.test), "utf8");
    process.stdout.write(`[quoting-lora] ${res.counts.used}/${res.counts.source} records → train ${res.counts.train} / val ${res.counts.val} / test ${res.counts.test} → ${outDir}\n`);
  } catch (e) { process.stderr.write(`[quoting-lora] write failed: ${e && e.message}\n`); return 1; }
  return 0;
}

const invokedDirectly = (() => {
  try { return Boolean(process.argv[1]) && process.argv[1].replace(/\\/g, "/").endsWith("build-quoting-lora-dataset.mjs"); } catch { return false; }
})();
if (invokedDirectly) process.exit(main(process.argv.slice(2)));
