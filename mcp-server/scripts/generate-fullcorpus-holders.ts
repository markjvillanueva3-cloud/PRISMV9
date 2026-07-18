/**
 * generate-fullcorpus-holders.ts
 * [FULLCORPUS-CAM]/U-FULLCORPUS-HOLDERS (slot:romeo)
 *
 * Operator directive 2026-06-15 (ALL MEANS ALL): export EVERY tool holder in the unified
 * corpus (1,164 holders via toolCatalogEngine.getAllHolders()) as a universal holder
 * catalog (CSV + JSON) that each CAD/CAM (Fusion/hyperMILL/Mastercam) can import as a
 * holder library. Complements the per-tool embedded holders in the 3 tool-DB exports.
 *
 * Small output (~1,164 rows) -> COMMITTED (not gitignored). Asserts holders.length is the
 * full union (>= 1,000) and fails loud otherwise.
 *
 * Run: cd mcp-server && npx tsx scripts/generate-fullcorpus-holders.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { toolCatalogEngine } from "../src/engines/ToolCatalogEngine.js";
import { catalogCorpusLoaderEngine } from "../src/engines/CatalogCorpusLoaderEngine.js";

const OUT_DIR = "H:/prism/state/shared/fullcorpus-cam-libraries/holders";
const COLS = ["vendor", "id", "holder_type", "taper", "gauge_length_mm", "body_diameter_mm", "max_rpm", "runout_um"] as const;

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function main(): void {
  catalogCorpusLoaderEngine.load();

  const holders = toolCatalogEngine.getAllHolders();
  const total = holders.length;
  console.log(`[fullcorpus-holders] holders enumerated: ${total}`);
  if (total < 1_000) {
    console.error(`[fullcorpus-holders] FATAL: only ${total} holders -- expected the full ~1,164 union. Aborting.`);
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  // CSV (universal holder library)
  const rows = holders.map((h) => COLS.map((c) => csvCell((h as Record<string, unknown>)[c])).join(","));
  writeFileSync(join(OUT_DIR, "HOLDERS-FULLCORPUS.csv"), [COLS.join(","), ...rows].join("\n"), "utf-8");

  // JSON (full records)
  writeFileSync(join(OUT_DIR, "HOLDERS-FULLCORPUS.json"), JSON.stringify(holders, null, 2), "utf-8");

  // breakdowns
  const byVendor: Record<string, number> = {};
  const byTaper: Record<string, number> = {};
  const byType: Record<string, number> = {};
  for (const h of holders) {
    byVendor[h.vendor ?? "?"] = (byVendor[h.vendor ?? "?"] ?? 0) + 1;
    byTaper[h.taper ?? "?"] = (byTaper[h.taper ?? "?"] ?? 0) + 1;
    byType[h.holder_type ?? "?"] = (byType[h.holder_type ?? "?"] ?? 0) + 1;
  }

  const ledger = {
    schemaVersion: "1.0.0",
    generator: "generate-fullcorpus-holders.ts",
    milestone: "FULLCORPUS-CAM/U-FULLCORPUS-HOLDERS",
    slot: "romeo",
    target: "universal holder catalog (CSV + JSON) for all CAD/CAM",
    holders_total: total,
    all_means_all_ok: total >= 1_000,
    columns: [...COLS],
    by_vendor: byVendor,
    by_taper: byTaper,
    by_type: byType,
    note:
      "getAllHolders() is the union of every branded + bare-interface holder array (HAIMER/GUHRING/BIG DAISHOWA + the standard taper/HSK set). Per-tool holders are also embedded in each tool-DB export; this is the standalone full holder library.",
  };
  writeFileSync(join(OUT_DIR, "HOLDERS-FULLCORPUS-LEDGER.json"), JSON.stringify(ledger, null, 2), "utf-8");

  console.log(
    `[fullcorpus-holders] OK: ${total} holders -> CSV + JSON. vendors=${Object.keys(byVendor).length} tapers=${Object.keys(byTaper).length} types=${Object.keys(byType).length} -> ${OUT_DIR}`,
  );
}

main();
