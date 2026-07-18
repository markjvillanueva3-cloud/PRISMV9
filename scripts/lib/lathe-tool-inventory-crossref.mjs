// lathe-tool-inventory-crossref.mjs — CLOSED-LOOP-MS0/U-CL3 (slot:whiskey)
//
// "Determine what tools were USED based off what we've PURCHASED": cross-references the
// JM tool-purchase records (vendor-catalog-db/tables/jm-tool-purchases.json `byType`, the
// $4.91M A/P corpus charlie/hotel sorted) against the tool-TYPE demand implied by the
// turning OPERATIONS observed in JM lathe programs (op-frequencies from lathe-baseline-analyzer
// / lathe-program-assessor). JM programs reference tools by T-code (turret position), NOT
// vendor part-number, so the honest cross-ref granularity is tool TYPE, not line-item.
//
// Pure-functional core (`crossRefToolTypes`) + CLI. Offline — no MCP, no engine.
// The purchase data lives in the MAIN tree (vendor-catalog-db not yet synced into slot/whiskey);
// pass its path via --purchases, so this lib is path-agnostic + hermetically testable.
//
// @milestone CLOSED-LOOP-MS0/U-CL3

import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Map a turning OPERATION (as tagged by the strategy catalog / observed in programs) to the
 * tool TYPES it consumes (matching jm-tool-purchases.json `byType` keys). Turning is
 * insert-dominated (carbide-blank = raw insert stock, the dominant JM spend); boring needs a
 * boring-bar + insert; drilling needs a drill; tapping a tap; reaming a reamer.
 */
export const OP_TO_TOOL_TYPES = {
  od_rough: ["insert", "carbide-blank"],
  od_finish: ["insert", "carbide-blank"],
  finish: ["insert", "carbide-blank"],
  face: ["insert", "carbide-blank"],
  face_rough: ["insert", "carbide-blank"],
  contour: ["insert", "carbide-blank"],
  contour_rough: ["insert", "carbide-blank"],
  od_thread: ["insert"],
  thread_sp: ["insert"],
  thread_chase: ["insert"],
  groove_od: ["insert"],
  radial_groove: ["insert"],
  groove_face: ["insert"],
  groove_id: ["insert"],
  part_off: ["insert"],
  bore_rough: ["boring-bar", "insert"],
  bore_finish: ["boring-bar", "insert"],
  bore_contour: ["boring-bar", "insert"],
  drill_axial: ["drill"],
  center_drill: ["drill"],
  drill_peck: ["drill"],
  tap: ["tap"],
  ream: ["reamer"],
};

/**
 * Cross-reference observed program operation demand against purchased tool types.
 * @param {{purchaseByType?:Record<string,{count?:number,spend?:number}>, opFrequencies?:Record<string,number>, opToToolTypes?:Record<string,string[]>}} args
 * @returns {{demandedTypes:Record<string,number>, matched:string[], neededUnpurchased:string[], purchasedUnused:string[], coverageRate:number|null, matchedSpend:Record<string,number>}}
 */
export function crossRefToolTypes({ purchaseByType = {}, opFrequencies = {}, opToToolTypes = OP_TO_TOOL_TYPES } = {}) {
  const demandedTypes = new Map(); // tool type -> summed op weight
  for (const [op, freq] of Object.entries(opFrequencies)) {
    if (!Number.isFinite(freq) || freq <= 0) continue;
    for (const t of (opToToolTypes[op] || [])) {
      demandedTypes.set(t, (demandedTypes.get(t) || 0) + freq);
    }
  }
  const purchasedTypes = new Set(Object.keys(purchaseByType));
  const demanded = new Set(demandedTypes.keys());
  const matched = [...demanded].filter((t) => purchasedTypes.has(t)).sort();           // needed AND purchased
  const neededUnpurchased = [...demanded].filter((t) => !purchasedTypes.has(t)).sort(); // program needs it, no purchase record
  const purchasedUnused = [...purchasedTypes].filter((t) => !demanded.has(t)).sort();   // purchased, no observed op needs it
  return {
    demandedTypes: Object.fromEntries(demandedTypes),
    matched,
    neededUnpurchased,
    purchasedUnused,
    coverageRate: demanded.size ? +(matched.length / demanded.size).toFixed(3) : null,
    matchedSpend: Object.fromEntries(matched.map((t) => [t, purchaseByType[t]?.spend ?? 0])),
  };
}

/** Parse an --ops "od_thread:4,od_rough:2,face:1" CLI string into an op-frequency map. */
export function parseOpFreqArg(s) {
  const out = {};
  if (typeof s !== "string") return out;
  for (const tok of s.split(",")) {
    const [op, n] = tok.split(":");
    if (op && n != null) out[op.trim()] = Number(n);
  }
  return out;
}

// ───────────────────────── CLI ─────────────────────────
function readJsonSafe(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }

function main(argv) {
  const args = argv.slice(2);
  const val = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
  const asJson = args.includes("--json");
  const purchasesPath = val("--purchases");
  const opsArg = val("--ops", "");
  if (!purchasesPath) {
    process.stderr.write('usage: --purchases <jm-tool-purchases.json> --ops "od_thread:4,od_rough:2,face:1" [--json]\n');
    process.exit(2);
  }
  const data = readJsonSafe(purchasesPath);
  if (!data || !data.byType) { process.stderr.write(`no byType in ${purchasesPath}\n`); process.exit(2); }
  const opFrequencies = parseOpFreqArg(opsArg);
  const xref = crossRefToolTypes({ purchaseByType: data.byType, opFrequencies });
  if (asJson) { process.stdout.write(JSON.stringify({ source: purchasesPath, totalSpend: data.totalToolSpend, xref }, null, 2) + "\n"); return; }
  process.stdout.write(`\n=== JM LATHE TOOL INVENTORY CROSS-REF ===\n`);
  process.stdout.write(`purchase corpus: $${data.totalToolSpend} · ${data.distinctTools} distinct tools · ${data.distinctToolVendors} vendors\n`);
  process.stdout.write(`program op demand: ${JSON.stringify(opFrequencies)}\n`);
  process.stdout.write(`tool-type coverage (demanded types that were purchased): ${xref.coverageRate}\n`);
  process.stdout.write(`MATCHED (needed + purchased): ${xref.matched.join(", ") || "(none)"}\n`);
  process.stdout.write(`  spend on matched types: ${JSON.stringify(xref.matchedSpend)}\n`);
  process.stdout.write(`NEEDED-but-UNPURCHASED (program ops imply, no purchase record): ${xref.neededUnpurchased.join(", ") || "(none)"}\n`);
  process.stdout.write(`PURCHASED-but-UNUSED (purchased, no observed lathe op needs it): ${xref.purchasedUnused.join(", ") || "(none)"}\n`);
}

const isMain = (() => { try { return process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]); } catch { return false; } })();
if (isMain) main(process.argv);
