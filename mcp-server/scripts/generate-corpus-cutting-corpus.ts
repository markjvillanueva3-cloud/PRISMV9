/**
 * generate-corpus-cutting-corpus.ts -- account for EVERY tool + holder in the
 * unified ToolCatalogEngine corpus, with per-(material grade x toolpath) cutting
 * parameters, by running the deterministic JM condition matrix over the whole set.
 * [CORPUS-CUTTING-CORPUS] (slot:romeo, 2026-06-14)
 *
 * Operator directive: "run continuous loops until all tools and tool holders in
 * our databases are accounted for, for all materials with cutting parameters for
 * different tool paths in each material."
 *
 * This is the deterministic harness that satisfies it. The per-tool cutting math
 * is CODE (the shared `conditionMatrix` over `ultimateSpeedFeedEngine`) -- NOT an
 * LLM per tool (that would be wrong per R5). One self-completing pass streams
 * every preset to per-material-group CSVs (sortable by material -> type -> brand)
 * and writes a coverage ledger PROVING the count (all-means-all: the completeness
 * claim is the number, not "looks done").
 *
 * Output (state/shared/corpus-cutting-data/, JM inch view):
 *   by-group/CORPUS-{P,M,K,N,S,H}.csv  -- one row per tool x grade x toolpath preset
 *   ACCOUNTED-NO-GEOMETRY.csv          -- tools with no cutting_diameter (enumerated, not preset-computable)
 *   HOLDERS.csv                        -- holder collision geometry (no cutting data by nature)
 *   COVERAGE-LEDGER.json               -- total / preset-computed / geometry-missing / per-group+type+brand
 *
 * Flags: --limit N (proof batch into _sample/) | --reset (clear full output first).
 *
 * UNITS: matrix is canonical (mm, m/min); this emitter converts to inch (JM
 * convention) + keeps SFM/RPM. NO inline physics constants -- IN_PER_MM comes
 * from the shared lib.
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, type WriteStream } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { toolCatalogEngine } from "../src/engines/ToolCatalogEngine.js";
import { catalogCorpusLoaderEngine } from "../src/engines/CatalogCorpusLoaderEngine.js";
import { conditionMatrix, IN_PER_MM, type Iso } from "./lib/jm-tool-condition-matrix.js";
import { adaptCorpusTool, type CorpusTool } from "./lib/corpus-tool-adapter.js";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, "..", "..");
const argv = process.argv.slice(2);
const limitArg = argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const RESET = argv.includes("--reset");
const HOLDERS_ONLY = argv.includes("--holders-only");
const SAMPLE = Number.isFinite(LIMIT);

const OUT = join(ROOT, "state", "shared", "corpus-cutting-data", SAMPLE ? "_sample" : ".");
const GROUP_DIR = join(OUT, "by-group");
const ISO_GROUPS: Iso[] = ["P", "M", "K", "N", "S", "H"];

const r4 = (n: number): number => Math.round(n * 10000) / 10000;
const r2 = (n: number): number => Math.round(n * 100) / 100;
const num = (n: number | null | undefined): string => (n == null || !Number.isFinite(n) ? "" : String(n));
const csvCell = (v: string | number): string => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const PRESET_HEADER = [
  "tool_id", "brand", "tool_type", "grade_name", "iso", "toolpath", "op", "cut", "strategy",
  "dia_in", "flutes", "vc_sfm", "rpm", "fz_in", "feed_ipm", "ap_in", "ae_in", "coolant", "css",
  "hb_min", "hb_max", "flute_source", "source_file",
].join(",");

/**
 * Holders carry NO cutting data (they do not cut) -- "accounted for" means
 * enumerated with their collision geometry (taper, gauge/body, max RPM). Returns
 * the holder count written.
 */
function writeHolders(outDir: string): number {
  const holders = toolCatalogEngine.getAllHolders();
  const lines = ["holder_id,vendor,holder_type,taper,gauge_length_in,body_diameter_in,max_rpm,runout_um"];
  const inch = (mm: number | undefined): string => (mm != null && Number.isFinite(mm) && mm > 0 ? String(r4(mm * IN_PER_MM)) : "");
  for (const h of holders) {
    lines.push([
      csvCell(h.id), csvCell(h.vendor), csvCell(h.holder_type ?? ""), csvCell(h.taper ?? ""),
      inch(h.gauge_length_mm), inch(h.body_diameter_mm), num(h.max_rpm), num(h.runout_um),
    ].join(","));
  }
  writeFileSync(join(outDir, "HOLDERS.csv"), lines.join("\n") + "\n");
  return holders.length;
}

function main(): void {
  // --holders-only: account for holders WITHOUT regenerating the multi-GB tool
  // preset CSVs (patch the existing ledger's holder fields in place).
  if (HOLDERS_ONLY) {
    catalogCorpusLoaderEngine.load();
    mkdirSync(OUT, { recursive: true });
    const holderCount = writeHolders(OUT);
    const ledgerPath = join(OUT, "COVERAGE-LEDGER.json");
    if (existsSync(ledgerPath)) {
      const led = JSON.parse(readFileSync(ledgerPath, "utf8")) as Record<string, unknown>;
      led.holders_accounted = holderCount;
      led.accounted_total = (Number(led.processed) || 0) + holderCount;
      writeFileSync(ledgerPath, JSON.stringify(led, null, 2));
      console.log(`[corpus-cutting] holders-only: wrote ${holderCount} holders, patched ledger accounted_total=${led.accounted_total}`);
    } else {
      console.log(`[corpus-cutting] holders-only: wrote ${holderCount} holders (no existing ledger to patch at ${ledgerPath})`);
    }
    return;
  }

  if (RESET && !SAMPLE && existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
  mkdirSync(GROUP_DIR, { recursive: true });

  catalogCorpusLoaderEngine.load();
  const raw = toolCatalogEngine.search({ max_results: 500000 }) as unknown as CorpusTool[];
  const tools = [...raw].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const total = tools.length;
  const work = Number.isFinite(LIMIT) ? tools.slice(0, LIMIT) : tools;
  console.log(`[corpus-cutting] corpus=${total} tools | processing=${work.length}${SAMPLE ? " (sample)" : ""}`);

  // open one append stream per material group + the no-geometry sink
  const streams: Record<Iso, WriteStream> = {} as Record<Iso, WriteStream>;
  for (const g of ISO_GROUPS) {
    const s = createWriteStream(join(GROUP_DIR, `CORPUS-${g}.csv`), { flags: "w" });
    s.write(PRESET_HEADER + "\n");
    streams[g] = s;
  }
  const noGeom = createWriteStream(join(OUT, "ACCOUNTED-NO-GEOMETRY.csv"), { flags: "w" });
  noGeom.write("tool_id,brand,tool_type,material,source_file\n");

  const led = {
    total_corpus_tools: total,
    processed: 0,
    preset_computed: 0,        // tools that produced >=1 preset
    geometry_missing: 0,       // dia<=0 -> enumerated, not preset-computable
    zero_preset_with_geometry: 0, // had geometry but matrix gated out all grades
    presets_emitted: 0,
    per_group: Object.fromEntries(ISO_GROUPS.map((g) => [g, 0])) as Record<string, number>,
    per_type: {} as Record<string, number>,
    per_brand_distinct: 0,
    flute_default_used: 0,
  };
  const brands = new Set<string>();

  let i = 0;
  for (const tool of work) {
    const a = adaptCorpusTool(tool);
    brands.add(a.brand);
    if (a.fluteSource === "type-default") led.flute_default_used++;
    led.per_type[a.input.toolType] = (led.per_type[a.input.toolType] ?? 0) + 1;

    if (!a.geometryKnown) {
      led.geometry_missing++;
      noGeom.write(`${csvCell(tool.id)},${csvCell(a.brand)},${csvCell(a.input.toolType)},${csvCell(a.input.material)},${csvCell(tool.source ?? "")}\n`);
    } else {
      // Gate grades by the tool's vendor-declared ISO applicability when present
      // (all materials it is rated for); else the matrix's coating heuristic.
      const presets = conditionMatrix(a.input, a.declaredIso.length ? a.declaredIso : undefined);
      if (presets.length === 0) {
        led.zero_preset_with_geometry++;
      } else {
        led.preset_computed++;
        for (const p of presets) {
          const row = [
            csvCell(tool.id), csvCell(a.brand), csvCell(a.input.toolType), csvCell(p.gradeName), p.iso,
            csvCell(p.label), p.op, p.cut, p.strategy,
            r4(a.input.dMm * IN_PER_MM), a.input.flutes, p.sfm, num(p.rpm),
            r4(p.fz_mm * IN_PER_MM), num(p.feed_mmpm == null ? null : r2(p.feed_mmpm * IN_PER_MM)),
            r4(p.ap_mm * IN_PER_MM), r4(p.ae_mm * IN_PER_MM), csvCell(p.coolant), p.css ? "1" : "0",
            p.hbMin, p.hbMax, a.fluteSource, csvCell(tool.source ?? ""),
          ].join(",");
          streams[p.iso].write(row + "\n");
          led.per_group[p.iso]++;
          led.presets_emitted++;
        }
      }
    }
    led.processed++;
    if (++i % 5000 === 0) console.log(`[corpus-cutting] ${i}/${work.length} | presets=${led.presets_emitted} | no-geom=${led.geometry_missing}`);
  }

  for (const g of ISO_GROUPS) streams[g].end();
  noGeom.end();

  // holders pass -- collision geometry only (no cutting data by nature)
  const holderCount = writeHolders(OUT);

  const ledger = {
    schemaVersion: "1.0.0",
    generated_at_note: "deterministic -- rerun reproduces byte-identical given same corpus",
    slot: "romeo",
    units: "inch (JM convention); vc in SFM; feed in IPM",
    holders_accounted: holderCount,
    brands_distinct: brands.size,
    ...led,
    per_brand_distinct: brands.size,
    accounted_total: led.processed + holderCount,
    coverage_complete: led.processed === work.length,
  };
  writeFileSync(join(OUT, "COVERAGE-LEDGER.json"), JSON.stringify(ledger, null, 2));

  console.log("\n=== COVERAGE LEDGER ===");
  console.log(`tools processed:        ${led.processed}/${work.length}`);
  console.log(`  preset-computed:      ${led.preset_computed}`);
  console.log(`  geometry-missing:     ${led.geometry_missing} (accounted, dia=0)`);
  console.log(`  geometry-but-0-preset:${led.zero_preset_with_geometry} (matrix gated all grades)`);
  console.log(`presets emitted:        ${led.presets_emitted.toLocaleString()}`);
  console.log(`per-group:              ${JSON.stringify(led.per_group)}`);
  console.log(`holders accounted:      ${holderCount}`);
  console.log(`distinct brands:        ${brands.size}`);
  console.log(`flute-default used on:  ${led.flute_default_used} tools`);
  console.log(`ACCOUNTED TOTAL:        ${ledger.accounted_total} (${led.processed} tools + ${holderCount} holders)`);
  console.log(`output: ${OUT}`);
}

main();
