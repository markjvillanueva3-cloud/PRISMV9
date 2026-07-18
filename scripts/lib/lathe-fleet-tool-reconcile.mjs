#!/usr/bin/env node
/**
 * lathe-fleet-tool-reconcile.mjs — CLOSED-LOOP-MS0/U-CL8 (slot:whiskey)
 *
 * Closes the goal's 3rd component at FLEET scale: "utilize the jm order documents that charlie
 * and hotel have sorted through to determine what tools were USED based off what we've PURCHASED."
 *
 * Composes (R8 — no new core logic):
 *   - inferOpsFromGcodes  [U-CL4]  — G-code → turning-operation set per program (what the programs DO)
 *   - crossRefToolTypes   [U-CL3]  — op → tool-type demand vs the JM purchase corpus byType (what was BOUGHT)
 *
 * The reconciliation answers three questions across the lathe program corpus:
 *   - MATCHED            : tool types the programs demand AND that appear in the purchase corpus
 *   - NEEDED-unpurchased : programs imply these tool types but there is NO purchase record (procurement gap)
 *   - PURCHASED-unused   : bought, but no lathe op demands them (non-lathe tooling — mill/grind/secondary)
 *
 * Offline — no MCP, no engine, no dist build. Bounded walk (--limit) so it never re-walks the full
 * 24k-file archive in one shot.
 *
 * NOTE (R12 honesty): inferOpsFromGcodes covers G71/G70/G72/G73/G75/G76/G74 + bore — it does NOT
 * detect tapping (G84) or reaming, so `tap`/`reamer` demand from the lathe side is understated and
 * those types will tend to show as PURCHASED-unused (which is correct for single-point lathe work —
 * JM threads with G76 inserts, not taps — but flag it before reading the gap as a true surplus).
 *
 * @milestone CLOSED-LOOP-MS0/U-CL8
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inferOpsFromGcodes } from "../lathe-closed-loop-test.mjs";
import { crossRefToolTypes, OP_TO_TOOL_TYPES } from "./lathe-tool-inventory-crossref.mjs";

/** Sum the per-program op sets (inferOpsFromGcodes) over a list of program texts. */
export function aggregateOpsFromTexts(texts) {
  const ops = {};
  for (const t of texts || []) {
    const o = inferOpsFromGcodes(t);
    for (const [k, v] of Object.entries(o)) ops[k] = (ops[k] || 0) + v;
  }
  return ops;
}

/**
 * Reconcile the tool types the programs USE (demanded by their ops) against what was PURCHASED.
 * @param {{purchaseByType?:Record<string,{count?:number,spend?:number}>, opFrequencies?:Record<string,number>, opToToolTypes?:Record<string,string[]>}} args
 * @returns {{usedToolTypes:string[], purchasedToolTypes:string[], matched:string[], matchedSpend:Record<string,number>, neededUnpurchased:string[], purchasedUnused:string[], unusedPurchasedSpend:Record<string,number>, coverageRate:number|null, demandedTypes:Record<string,number>}}
 */
export function reconcileFleet({ purchaseByType = {}, opFrequencies = {}, opToToolTypes = OP_TO_TOOL_TYPES } = {}) {
  const xref = crossRefToolTypes({ purchaseByType, opFrequencies, opToToolTypes });
  const usedToolTypes = [...new Set([...xref.matched, ...xref.neededUnpurchased])].sort();
  const purchasedToolTypes = Object.keys(purchaseByType).sort();
  const unusedPurchasedSpend = {};
  for (const t of xref.purchasedUnused) {
    const rec = purchaseByType[t];
    if (rec && Number.isFinite(rec.spend)) unusedPurchasedSpend[t] = rec.spend;
  }
  return {
    usedToolTypes, purchasedToolTypes,
    matched: xref.matched, matchedSpend: xref.matchedSpend,
    neededUnpurchased: xref.neededUnpurchased,
    purchasedUnused: xref.purchasedUnused,
    unusedPurchasedSpend,
    coverageRate: xref.coverageRate,
    demandedTypes: xref.demandedTypes,
  };
}

// ───────────────────────── CLI ─────────────────────────
function walkBounded(root, limit, acc) {
  if (acc.length >= limit) return;
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (acc.length >= limit) return;
    const full = path.join(root, e.name);
    if (e.isDirectory()) walkBounded(full, limit, acc);
    else if (/\.(MIN|nc)$/i.test(e.name)) acc.push(full);
  }
}

function main(argv) {
  const args = argv.slice(2);
  const val = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
  const asJson = args.includes("--json");
  const purchasesPath = val("--purchases");
  const root = val("--root");
  const customers = val("--customers");
  const limit = parseInt(val("--limit", "2000"), 10);
  if (!purchasesPath || !root) {
    process.stderr.write('usage: --purchases <jm-tool-purchases.json> --root <CNC LATHE dir> [--customers "ITW,CSM,ACME"] [--limit N] [--json]\n');
    process.exit(2);
  }
  let data;
  try { data = JSON.parse(fs.readFileSync(purchasesPath, "utf8")); } catch { process.stderr.write(`cannot read ${purchasesPath}\n`); process.exit(2); }
  if (!data || !data.byType) { process.stderr.write(`no byType in ${purchasesPath}\n`); process.exit(2); }

  const roots = customers ? customers.split(",").map((c) => path.join(root, c.trim())) : [root];
  const files = [];
  for (const r of roots) { walkBounded(r, limit, files); if (files.length >= limit) break; }
  const texts = [];
  for (const f of files.slice(0, limit)) { try { texts.push(fs.readFileSync(f, "utf8")); } catch { /* skip unreadable */ } }

  const opFrequencies = aggregateOpsFromTexts(texts);
  const rec = reconcileFleet({ purchaseByType: data.byType, opFrequencies });
  if (asJson) {
    process.stdout.write(JSON.stringify({ source: purchasesPath, programsScanned: texts.length, totalSpend: data.totalToolSpend, opFrequencies, ...rec }, null, 2) + "\n");
    return;
  }
  process.stdout.write(`\n=== JM LATHE FLEET TOOL RECONCILIATION (used vs purchased) ===\n`);
  process.stdout.write(`programs scanned: ${texts.length} · purchase corpus: $${data.totalToolSpend} (${data.distinctTools} tools, ${data.distinctToolVendors} vendors)\n`);
  process.stdout.write(`op demand: ${JSON.stringify(opFrequencies)}\n`);
  process.stdout.write(`tool-type coverage (demanded types that were purchased): ${rec.coverageRate}\n`);
  process.stdout.write(`USED (programs demand) + PURCHASED: ${rec.matched.join(", ") || "(none)"}\n`);
  process.stdout.write(`  spend on those types: ${JSON.stringify(rec.matchedSpend)}\n`);
  process.stdout.write(`NEEDED but NOT purchased (procurement gap): ${rec.neededUnpurchased.join(", ") || "(none)"}\n`);
  process.stdout.write(`PURCHASED but UNUSED by lathe ops (non-lathe tooling): ${rec.purchasedUnused.join(", ") || "(none)"}\n`);
  process.stdout.write(`  spend on unused-by-lathe types: ${JSON.stringify(rec.unusedPurchasedSpend)}\n`);
}

const isMain = (() => { try { return process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]); } catch { return false; } })();
if (isMain) main(process.argv);
