#!/usr/bin/env node
/**
 * wedm-cross-process-identify.mjs — U-WEDM-CROSS-PROCESS-IDENTIFY
 *
 * iter-39 Phase-B catalog showed machine_hints = {wire:80, mill:7, lathe:2}
 * across the 97-pair corpus. iter-47 pst-catalog showed 4 non-WEDM .pst refs
 * (MPWFANUC.PST x2, MPM ROKU ROKU VMC.pst, OKUMA_LB3000MSY.psT, I FA-SERIES
 * 4X WIRE.PST mistakenly included earlier — that one IS wire). This unit
 * cross-checks the two layers to name specific cross-process manifests.
 *
 * The goal: identify which exact .mcx-* files in the WEDM training corpus
 * are actually mill/lathe/mill-turn projects misfiled (or co-located) under
 * JM Die/WIRE EDM/. That tags them for routing/tagging elsewhere (per iter-38
 * cross-slot finding pattern — bravo owns lathe corpus, etc).
 *
 * Output: state/shared/wedm-cross-process-manifests.json
 */
import { promises as fsp } from "node:fs";
import path from "node:path";

const ROOT = path.resolve("H:/prism");
const CORPUS_DIR = path.join(ROOT, "state", "shared", "wedm-training-corpus");
const PST_CATALOG = path.join(ROOT, "state", "shared", "wedm-mcx-wmd-catalog.json");
const OUT_PATH = path.join(ROOT, "state", "shared", "wedm-cross-process-manifests.json");

const NON_WEDM_POST_PATTERNS = [
  { name: "fanuc-mill", re: /MPWFANUC\.PST/i, target_slot: "bravo-or-india" },
  { name: "roku-roku-vmc", re: /ROKU\s+ROKU\s+VMC/i, target_slot: "alpha-mill" },
  { name: "okuma-lathe-millturn", re: /OKUMA_LB\d+/i, target_slot: "bravo-lathe" },
  { name: "mazak-lathe", re: /MAZAK.*LATHE|MAZATROL/i, target_slot: "bravo-lathe" },
  { name: "haas-mill", re: /HAAS\s+(?:VF|VM|VR)/i, target_slot: "alpha-mill" },
];

async function main() {
  const t0 = Date.now();
  const catalog = JSON.parse(await fsp.readFile(PST_CATALOG, "utf8"));

  // Identify pst-based cross-process manifests
  const crossViaPst = new Map(); // stem → {posts:[...], target_slot}
  for (const p of catalog.pst_distribution ?? []) {
    for (const pattern of NON_WEDM_POST_PATTERNS) {
      if (pattern.re.test(p.pst)) {
        for (const stem of p.manifests) {
          if (!crossViaPst.has(stem)) crossViaPst.set(stem, { posts: [], target_slots: new Set() });
          crossViaPst.get(stem).posts.push({ pst: p.pst, classification: pattern.name });
          crossViaPst.get(stem).target_slots.add(pattern.target_slot);
        }
      }
    }
  }

  // Cross-walk all manifests for mill/lathe/millturn machine_hints
  const crossViaMachineHints = new Map(); // stem → hints[]
  const files = await fsp.readdir(CORPUS_DIR);
  const manifestFiles = files.filter((f) => f.endsWith("-phase-a1.json"));

  for (const f of manifestFiles) {
    const stem = f.replace(/-phase-a1\.json$/, "");
    let m;
    try { m = JSON.parse(await fsp.readFile(path.join(CORPUS_DIR, f), "utf8")); }
    catch { continue; }
    const hints = m.reference_metadata?.machine_hints ?? [];
    const nonWireHints = hints.filter((h) => h === "mill" || h === "lathe" || h === "millturn" || h === "router");
    if (nonWireHints.length > 0) {
      crossViaMachineHints.set(stem, { hints, ref_path: m.reference_program_path });
    }
  }

  // Merge: a manifest can appear in either or both. The two layers are
  // INDEPENDENT signals — pst-cross + hints-cross overlap = highest confidence.
  const allCrossStems = new Set([...crossViaPst.keys(), ...crossViaMachineHints.keys()]);
  const merged = [];
  for (const stem of allCrossStems) {
    const pstInfo = crossViaPst.get(stem);
    const hintsInfo = crossViaMachineHints.get(stem);
    merged.push({
      stem,
      identified_via: [pstInfo && "pst", hintsInfo && "machine_hints"].filter(Boolean),
      pst_evidence: pstInfo ? pstInfo.posts : null,
      machine_hints: hintsInfo ? hintsInfo.hints : null,
      ref_path: hintsInfo?.ref_path,
      suggested_target_slot: pstInfo ? [...pstInfo.target_slots] : ["unknown"],
    });
  }
  merged.sort((a, b) => b.identified_via.length - a.identified_via.length || a.stem.localeCompare(b.stem));

  const out = {
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    purpose: "Cross-check pst non-WEDM refs (iter-47) vs machine_hints non-wire (iter-39) to name specific misfiled mill/lathe manifests in JM Die WIRE EDM training corpus",
    runtime_ms: Date.now() - t0,
    cross_via_pst_count: crossViaPst.size,
    cross_via_machine_hints_count: crossViaMachineHints.size,
    total_cross_process_manifests: merged.length,
    high_confidence_count: merged.filter((m) => m.identified_via.length === 2).length,
    cross_process_manifests: merged,
  };

  await fsp.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fsp.writeFile(OUT_PATH, JSON.stringify(out, null, 2) + "\n");

  console.error(
    `cross-process-identify: ${out.total_cross_process_manifests} manifests · ` +
      `pst-only=${crossViaPst.size - out.high_confidence_count} · ` +
      `hints-only=${crossViaMachineHints.size - out.high_confidence_count} · ` +
      `BOTH (high-confidence)=${out.high_confidence_count} · ` +
      `runtime=${out.runtime_ms}ms`,
  );
  for (const m of merged) {
    console.error(`  ${m.stem.padEnd(20)} via=${m.identified_via.join("+")} hints=${JSON.stringify(m.machine_hints||[])} -> ${m.suggested_target_slot.join(",")}`);
  }
  console.error(`wrote ${path.relative(ROOT, OUT_PATH).replace(/\\/g, "/")}`);
}

main().catch((e) => { console.error("FATAL:", e?.stack ?? e?.message ?? e); process.exit(1); });
