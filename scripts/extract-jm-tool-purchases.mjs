#!/usr/bin/env node
/**
 * extract-jm-tool-purchases.mjs — VENDOR-NETWORK-MS0/U-VDN-JM-TOOLS
 *
 * "Factor in all the tools JM has bought" (operator, 2026-05-29). The vendor A/P
 * (Report_from_J.M._Tool__Die_LLC.pdf, 2014-2026, 20,736 line-items) was already
 * ingested at the VENDOR level (jm-vendor-cost-index.json) but the per-TOOL
 * line-item descriptions were discarded. This extracts them: the actual cutting
 * tools JM buys (type, vendor, qty, $), so the SFC extraction + quoting prioritize
 * the tools JM really uses.
 *
 * REUSES the A/P parser (R8 — never re-implement): parseLedger + classifySpend
 * from ingest-jm-vendor-ap.mjs. Reads the cached raw text (--raw) or re-extracts.
 *
 * Output: state/shared/quoting/jm-tool-purchases.{json,md}
 *   - byType: cutting-tool TYPE breakdown (endmill/drill/tap/insert/...) count+spend
 *   - byVendor: which vendors JM buys TOOLS from, count+spend (the SFC priority signal)
 *   - topToolsBySpend / topVendorsBySpend
 *   - jm_tool_vendors: normalized vendor ids (for cross-ref with vendor-directory)
 *
 * Pure exports (unit-tested): classifyToolType, normalizeToolVendorId,
 * aggregateToolPurchases, renderToolProfileMd, TOOL_TYPE_RULES.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseLedger, classifySpend } from "./ingest-jm-vendor-ap.mjs";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism-slot-charlie";
const RAW_CACHE = join(PRISM_ROOT, "state/shared/quoting/.cache/jm-ap-raw.txt");
const OUT_DIR = join(PRISM_ROOT, "state/shared/quoting");
const TOP_N = 50;

/** Cutting-tool TYPE taxonomy. Ordered most-specific-first; first match wins.
 *  Description text is upper/mixed case from the A/P; tested case-insensitive. */
export const TOOL_TYPE_RULES = [
  ["thread-mill", /thread\s?mill/i],
  ["tap", /\btap(s|ping)?\b/i],
  ["end-mill", /end\s?-?mill|\bem\b|ball\s?nose|bull\s?nose|corner\s?rad|\brougher\b/i],
  ["drill", /\bdrill|jobber|\bspot\b|center\s?drill|\breamer?\b.*drill/i],
  ["reamer", /\bream(er|ers|ing)?\b/i],
  ["insert", /\binsert|cnmg|dnmg|ccmt|tnmg|vbmt|apkt|ccgt|wnmg|tpg|spg|tcmt|dcmt/i],
  ["countersink", /countersink|counter\s?bore|c'?sink|c'?bore|chamfer/i],
  ["burr", /\bburr/i],
  ["boring-bar", /boring\s?(bar|head)?|\bbore\b/i],
  ["saw-slitting", /\bsaw\b|slitting|slot\s?mill/i],
  ["grinding-wheel", /grind(ing)?\s?wheel|abrasive|\bwheel\b|cbn\s?wheel|diamond\s?wheel/i],
  ["tool-bit", /tool\s?bits?|\bhss\b.*bit|lathe\s?bit|brazed/i],
  ["broach", /\bbroach/i],
  // Carbide BLANK / die-making stock (JM is a die shop): centerless-ground carbide rod, MCxx grades,
  // triple-dimension stock (D x W x L), diamond lapping compound. This is raw die MATERIAL, NOT a
  // catalog cutting tool — it carries no speeds/feeds. Placed AFTER the cutting-tool rules so a real
  // "CARBIDE END MILL" still classifies as end-mill. R12: keeps the profile honest about JM's spend.
  // Note \bcarbide\b is last: the cutting-tool rules above already claimed carbide END MILLS / DRILLS /
  // INSERTS etc., so any "carbide" reaching here (in a die shop's A/P) is blank/preform stock.
  ["carbide-blank", /centerless\s?ground|diamond\s?compound|carbide\s?(blank|rod|preform|stock|round)|\bmc\d{2}\b|\d(?:\.\d+)?\s?x\s?\.?\d+\s?x\s?\d|\bcarbide\b/i],
  ["misc-tooling", /./], // catch-all (already filtered to tooling-consumable upstream)
];

/** The TYPES that are genuine CATALOG cutting tools (carry ManufacturerSpeedFeed data).
 *  Excludes carbide-blank (die material), grinding-wheel (abrasive), misc-tooling — none have S/F tables. */
export const CATALOG_TOOL_TYPES = new Set([
  "end-mill", "drill", "tap", "reamer", "insert", "thread-mill", "countersink", "boring-bar", "tool-bit", "saw-slitting", "broach",
]);

/** Classify a tool line-item description into a cutting-tool type. Pure. */
export function classifyToolType(description) {
  const d = String(description || "");
  if (!d.trim()) return "misc-tooling";
  for (const [type, re] of TOOL_TYPE_RULES) if (re.test(d)) return type;
  return "misc-tooling";
}

/** Normalize an A/P vendor name (UPPERCASE) → kebab id for cross-ref with the directory. Pure. */
export function normalizeToolVendorId(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * Aggregate tooling line-items into a JM tool-purchase profile. Pure.
 * Only records classified tooling-consumable are tools; credits subtracted from spend.
 */
export function aggregateToolPurchases(records) {
  const tools = (Array.isArray(records) ? records : []).filter(
    (r) => r && classifySpend(`${r.description || ""} ${r.vendor || ""}`) === "tooling-consumable"
  );
  const byType = {};
  const byVendor = {};
  const descSpend = new Map();
  let totalSpend = 0;
  let totalQty = 0;

  for (const r of tools) {
    const type = classifyToolType(r.description);
    const qty = Number.isFinite(r.qty) ? r.qty : 0;
    const unit = Number.isFinite(r.unit_cost) ? r.unit_cost : 0;
    const lineSpend = (r.is_credit ? -1 : 1) * Math.abs(unit) * (qty || 1);
    totalSpend += lineSpend;
    totalQty += r.is_credit ? 0 : qty;

    (byType[type] ??= { count: 0, spend: 0 });
    byType[type].count++;
    byType[type].spend += lineSpend;

    const vid = normalizeToolVendorId(r.vendor);
    (byVendor[vid] ??= { name: r.vendor || vid, count: 0, spend: 0, catalogSpend: 0, types: {} });
    byVendor[vid].count++;
    byVendor[vid].spend += lineSpend;
    if (CATALOG_TOOL_TYPES.has(type)) byVendor[vid].catalogSpend += lineSpend; // real catalog cutting tools only
    byVendor[vid].types[type] = (byVendor[vid].types[type] || 0) + 1;

    const key = String(r.description || "").replace(/\s+/g, " ").trim().toUpperCase().slice(0, 60);
    if (key) descSpend.set(key, (descSpend.get(key) || 0) + lineSpend);
  }

  for (const t of Object.values(byType)) t.spend = round2(t.spend);
  for (const v of Object.values(byVendor)) { v.spend = round2(v.spend); v.catalogSpend = round2(v.catalogSpend); }

  const topToolsBySpend = [...descSpend.entries()]
    .map(([description, spend]) => ({ description, spend: round2(spend) }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, TOP_N);
  const topVendorsBySpend = Object.entries(byVendor)
    .map(([id, v]) => ({ vendor_id: id, name: v.name, count: v.count, spend: v.spend, catalog_tool_spend: v.catalogSpend }))
    .sort((a, b) => b.spend - a.spend);

  return {
    schemaVersion: "1.0.0",
    source: "Report_from_J.M._Tool__Die_LLC.pdf (vendor A/P 2014-2026)",
    advisoryOnly: true,
    totalToolLineItems: tools.length,
    totalToolSpend: round2(totalSpend),
    totalQty,
    distinctTools: descSpend.size,
    distinctToolVendors: Object.keys(byVendor).length,
    byType,
    topToolsBySpend,
    topVendorsBySpend,
    // the SFC priority signal — vendors JM actually buys tools from, by spend
    jm_tool_vendors: topVendorsBySpend.map((v) => v.vendor_id),
  };
}

export function renderToolProfileMd(p, iso) {
  const L = [];
  L.push("# JM-TOOL-PURCHASES — the cutting tools J.M. Tool & Die actually buys (2014-2026)");
  L.push("");
  L.push(`> Generated ${iso} · source: \`${p.source}\` · owner: slot:charlie (quoting) · **advisory, must-human-verify**.`);
  L.push(`> Extracted from the per-tool A/P line-items (reuses \`ingest-jm-vendor-ap.mjs\` parser). Drives SFC extraction priority toward the tools JM uses.`);
  L.push("");
  L.push(`- **${p.totalToolLineItems.toLocaleString()}** tooling line-items · **${p.distinctTools.toLocaleString()}** distinct tools · **${p.distinctToolVendors}** tool vendors · **$${p.totalToolSpend.toLocaleString()}** total tool spend`);
  L.push("");
  L.push("## Tool spend by TYPE");
  L.push("| Type | Line-items | Spend |");
  L.push("|------|-----------:|------:|");
  for (const [t, v] of Object.entries(p.byType).sort((a, b) => b[1].spend - a[1].spend)) {
    L.push(`| ${t} | ${v.count} | $${v.spend.toLocaleString()} |`);
  }
  L.push("");
  L.push("## Top tool vendors (JM buys tools from these — SFC extraction priority order)");
  L.push("| # | Vendor | Tool buys | Spend |");
  L.push("|--:|--------|----------:|------:|");
  p.topVendorsBySpend.slice(0, 30).forEach((v, i) => {
    L.push(`| ${i + 1} | ${v.name} | ${v.count} | $${v.spend.toLocaleString()} |`);
  });
  L.push("");
  L.push("## Top tools by spend");
  L.push("| Tool (description) | Spend |");
  L.push("|--------------------|------:|");
  for (const t of p.topToolsBySpend.slice(0, 30)) L.push(`| ${t.description} | $${t.spend.toLocaleString()} |`);
  L.push("");
  return L.join("\n");
}

function nowIso() {
  return new Date().toISOString();
}

function main(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--raw") args.raw = argv[++i];
    else if (argv[i] === "--out-dir") args.outDir = argv[++i];
  }
  const rawPath = args.raw || RAW_CACHE;
  if (!existsSync(rawPath)) {
    console.error(`FAIL-LOUD: raw A/P text not found at ${rawPath}. Extract it first (pypdf) or pass --raw.`);
    return 3;
  }
  const { records } = parseLedger(readFileSync(rawPath, "utf8"));
  if (!records.length) {
    console.error("FAIL-LOUD: parseLedger returned 0 records — raw text malformed?");
    return 4;
  }
  const profile = aggregateToolPurchases(records);
  const outDir = args.outDir || OUT_DIR;
  mkdirSync(outDir, { recursive: true });
  const iso = nowIso();
  writeFileSync(join(outDir, "jm-tool-purchases.json"), JSON.stringify({ ...profile, generatedAt: iso }, null, 2));
  writeFileSync(join(outDir, "JM-TOOL-PURCHASES.md"), renderToolProfileMd(profile, iso));
  console.log(
    `[jm-tool-purchases] ${profile.totalToolLineItems} tool line-items · ${profile.distinctToolVendors} vendors · $${profile.totalToolSpend.toLocaleString()} · top vendor: ${profile.topVendorsBySpend[0]?.name}`
  );
  console.log(`  → ${join(outDir, "jm-tool-purchases.json")}`);
  console.log(`  → ${join(outDir, "JM-TOOL-PURCHASES.md")}`);
  return 0;
}

const invokedDirectly = (() => {
  try {
    return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();
if (invokedDirectly) process.exit(main(process.argv.slice(2)));
