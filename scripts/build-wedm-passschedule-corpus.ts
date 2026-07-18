/**
 * build-wedm-passschedule-corpus.ts — WEDM Regimen #3 (multi-pass / H-offset
 * cascade) training corpus, ORACLE-AUGMENTED.
 *
 * Per WEDM-TRAINING-REGIMENS-2026-05-31.md §3.2: the tech-table getters are a
 * DETERMINISTIC GENERATOR. Enumerate the (material, thickness, taper, tol) grid,
 * emit the EXACT shop-calibrated cascade from selectECodeFamily / getECodeForPass
 * / getShopFeedForPass / getShopOffsetForPass. Because the labels are
 * code-checkable (monotonic / taper-zero / oracle-match via the cascade harness),
 * the synthetic pairs DOUBLE as the eval set — no human labeling, no drift.
 *
 * 5 pair kinds: family-select · full-pass-schedule · per-pass-QA ·
 * invariant/anti-pattern (valid + deliberately-broken, harness-labeled) · H175-trim.
 * Every generated full schedule is self-validated with checkCascade (a generator
 * bug => fail-loud, nothing written).
 *
 *   cd mcp-server && npx tsx ../scripts/build-wedm-passschedule-corpus.ts
 *
 * Pure transform of canonical sources (no inlined discharge constants — all values
 * FROM the tech tables). No ${...} template literals (scripts/ security hook).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  JM_DIE_ECODE_FAMILIES,
  selectECodeFamily,
  getECodeForPass,
  getShopFeedForPass,
  getShopOffsetForPass,
  H175_MASTER_OFFSET,
} from "../mcp-server/src/data/jm-die-wedm-tech-tables.js";
import { generateJobCascade } from "../mcp-server/src/data/wedm-job-cascade.js";
import { generateCompoundJobCascade } from "../mcp-server/src/data/wedm-compound-cascade.js";
import { checkCascade, checkMonotonicCascade } from "./lib/wedm-cascade-correctness.mjs";

const OUT_DIR = path.resolve(process.cwd(), "data/training/wedm-passschedule");
const SEED = 42;

type Pair = {
  instruction: string;
  input: string;
  output: string;
  meta: { id: string; category: string; kind: string; confidence: number; source: string };
};

const INSTR_SELECT = "You are a JM Die wire-EDM (Mitsubishi FA-10S) expert. Select the E-code family for the job and say why.";
const INSTR_SCHED = "You are a JM Die wire-EDM expert. Emit the full multi-pass E-code / H-offset cascade for the cut. H-offsets MUST strictly decrease rough->skim (4-axis taper => all H=0).";
const INSTR_PASS = "Give the JM Die FA-10S shop-calibrated settings for one pass of a wire-EDM cut.";
const INSTR_INVAR = "You are a wire-EDM QA reviewer. Judge whether the pass schedule is VALID; if not, name the violation and give the corrected schedule.";
const INSTR_TRIM = "Explain the JM Die FA-10S H175 master-trim convention for the pass schedule below.";
const INSTR_JOB = "You are a JM Die wire-EDM (FA-10S) expert. For the job below, emit the THICKNESS-ADJUSTED multi-pass cascade (E-code, feed, H-offset per pass) and state any physics caveats. Feeds slow for thicker stock.";
const INSTR_COMPOUND = "You are a JM Die wire-EDM expert cutting a COMPOUND (bi-material) part — steel body with brazed carbide. Emit the per-zone cutting plan; carbide/braze zones have no FA E-family (flag needs_operator_ecode) and never get the steel recipe.";

/** Build the {pass_number,e_code,offset_inches,feed_ipm} oracle expectation for a family. */
function expectedFor(fam: typeof JM_DIE_ECODE_FAMILIES[number]) {
  return fam.passes.map((p) => ({
    pass_number: p.pass_number,
    e_code: getECodeForPass(fam, p.pass_number),
    offset_inches: getShopOffsetForPass(fam, p.pass_number),
    feed_ipm: getShopFeedForPass(fam, p.pass_number),
  }));
}

/** Render the harness-parseable schedule text for a family (taper => H=0 lines). */
function scheduleText(fam: typeof JM_DIE_ECODE_FAMILIES[number]): string {
  const taper = fam.axes === 4;
  const lines = fam.passes.map((p) => {
    const feed = getShopFeedForPass(fam, p.pass_number);
    const feedStr = feed == null ? "operator-set feed" : feed + " ipm";
    const off = taper ? 0 : getShopOffsetForPass(fam, p.pass_number);
    return "Pass " + p.pass_number + " (" + p.type + "): " + getECodeForPass(fam, p.pass_number) +
      ", " + feedStr + ", " + p.h_register + " offset " + off + " in";
  });
  return "Family " + fam.id + " (" + fam.num_passes + "-pass):\n" + lines.join("\n");
}

// ── Kind 1: family-select grid (incl. boundary cases) ──
function familySelectPairs(): Pair[] {
  const materials = ["D2", "M2", "A2", "S7", "H13", "O1", "316", "6061", "Inconel", "carbide"];
  const thicknesses = [25, 50, 51, 80, 100, 150];
  const tapers = [0, 1, 2];
  const out: Pair[] = [];
  const seen = new Set<string>();
  for (const material of materials) {
    for (const thickness_mm of thicknesses) {
      for (const taper_angle_deg of tapers) {
        const params = { material, thickness_mm, taper_angle_deg };
        const key = JSON.stringify(params);
        if (seen.has(key)) continue;
        seen.add(key);
        const fam = selectECodeFamily(params);
        const ans = fam
          ? "Use family " + fam.id + " — " + fam.description + " (" + fam.num_passes + " passes, " + fam.axes + "-axis)."
          : "No shop-calibrated JM Die family matches (" + material + " not in the FA-10S tables) — fall back to generic E-codes and dial in at the machine.";
        out.push({
          instruction: INSTR_SELECT,
          input: material + ", " + thickness_mm + " mm thick" + (taper_angle_deg ? ", " + taper_angle_deg + " deg taper" : ", straight cut") + ".",
          output: ans,
          meta: { id: "select:" + key, category: "programming", kind: "tech_select", confidence: 0.9, source: "jm-die-wedm-tech-tables:selectECodeFamily" },
        });
      }
    }
  }
  return out;
}

// ── Kind 2: full-pass-schedule (densest grounded) ──
function fullSchedulePairs(): Pair[] {
  return JM_DIE_ECODE_FAMILIES.map((fam) => ({
    instruction: INSTR_SCHED,
    input: fam.description + ". Materials: " + fam.materials.join(", ") + ". " + fam.axes + "-axis, " + fam.num_passes + " passes.",
    output: scheduleText(fam) + (fam.axes === 4 ? "\nUV taper: all H-registers = 0 (post handles taper in UV coords)." : "\nThe H-offset cascade strictly decreases — never re-increase (AP003: wire re-cuts/leaves stock)."),
    meta: { id: "sched:" + fam.id, category: "programming", kind: "tech_table", confidence: 0.95, source: "jm-die-wedm-tech-tables" },
  }));
}

// ── Kind 3: per-pass QA ──
function perPassPairs(): Pair[] {
  const out: Pair[] = [];
  for (const fam of JM_DIE_ECODE_FAMILIES) {
    for (const p of fam.passes) {
      const feed = getShopFeedForPass(fam, p.pass_number);
      const feedStr = feed == null ? "operator-set at the machine" : feed + " ipm";
      const off = fam.axes === 4 ? 0 : getShopOffsetForPass(fam, p.pass_number);
      out.push({
        instruction: INSTR_PASS,
        input: "Family " + fam.description + ". Pass " + p.pass_number + " of " + fam.num_passes + " (" + p.type + ").",
        output: "Pass " + p.pass_number + " (" + p.type + "): E-code " + getECodeForPass(fam, p.pass_number) + ", feed " + feedStr + ", " + p.h_register + " offset " + off + " in." +
          (p.type === "rough" ? " Rough pass — heaviest offset; adaptive control M90 on." : " Skim pass — M91 (AC off); reduce flush pressure vs rough; recast shrinks per skim so finer offset."),
        meta: { id: "pass:" + fam.id + ":p" + p.pass_number, category: "programming", kind: "tech_pass", confidence: 0.95, source: "jm-die-wedm-tech-tables" },
      });
    }
  }
  return out;
}

// ── Kind 4: invariant / anti-pattern (valid + deliberately broken, harness-labeled) ──
function invariantPairs(): Pair[] {
  const out: Pair[] = [];
  for (const fam of JM_DIE_ECODE_FAMILIES) {
    const good = scheduleText(fam);
    out.push({
      instruction: INSTR_INVAR,
      input: good,
      output: "VALID. " + (fam.axes === 4 ? "Taper schedule: all H-offsets = 0 (correct)." : "H-offset cascade strictly decreases rough->skim (correct).") + " All E-codes/feeds match the FA-10S shop table.",
      meta: { id: "invar-ok:" + fam.id, category: "quality", kind: "invariant", confidence: 0.98, source: "jm-die-wedm-tech-tables+cascade-harness" },
    });
    // Deliberately break: 2-axis -> raise a mid offset (AP003); taper -> non-zero H.
    if (fam.axes !== 4 && fam.passes.length >= 3) {
      const broken = good.replace(
        "offset " + getShopOffsetForPass(fam, fam.passes[2].pass_number) + " in",
        "offset " + getShopOffsetForPass(fam, fam.passes[0].pass_number) + " in",
      );
      const viol = checkMonotonicCascade(checkCascade(broken).passes);
      out.push({
        instruction: INSTR_INVAR,
        input: broken,
        output: "INVALID — anti-pattern AP003: the H-offset cascade does NOT strictly decrease (pass " + (viol[0] ? viol[0].pass : 3) + " offset >= the previous pass), so the wire re-cuts / leaves stock. Corrected schedule:\n" + good,
        meta: { id: "invar-ap003:" + fam.id, category: "quality", kind: "invariant", confidence: 0.98, source: "jm-die-wedm-tech-tables+cascade-harness" },
      });
    }
  }
  return out;
}

// ── Kind 5: H175 master-trim ──
function h175Pairs(): Pair[] {
  return JM_DIE_ECODE_FAMILIES.filter((f) => f.uses_h175_master).map((fam) => ({
    instruction: INSTR_TRIM,
    input: scheduleText(fam),
    output: "H175 is the master-trim register (H175_MASTER_OFFSET = " + H175_MASTER_OFFSET + " in, operator-set at the machine). The per-pass H1.." + fam.num_passes + " offsets are applied ON TOP of H175; with H175 = 0 the table offsets are used verbatim. A non-zero H175 shifts the whole cascade uniformly for stock/wear compensation without disturbing the strictly-decreasing relationship.",
    meta: { id: "h175:" + fam.id, category: "programming", kind: "tech_trim", confidence: 0.92, source: "jm-die-wedm-tech-tables:H175_MASTER_OFFSET" },
  }));
}

// ── Kind 6: thickness-adjusted job cascade (WIRES generateJobCascade — closes the
//    P0-1 zero-consumer finding: feeds now VARY with thickness, with fail-loud caveats) ──
function jobCascadePairs(): Pair[] {
  const materials = ["D2", "A2", "S7", "M2", "H13"];
  const thicknesses = [10, 25, 40, 60, 80];
  const tapers = [0, 2];
  const hardnesses = [0, 62]; // 0 = unspecified (oracle stands); 62 HRC = hardened-die de-rate (P0-2)
  const out: Pair[] = [];
  const seen = new Set<string>();
  for (const material of materials) {
    for (const thickness_mm of thicknesses) {
      for (const taper_angle_deg of tapers) {
       for (const hrc of hardnesses) {
        const c = generateJobCascade({ material, thickness_mm, taper_angle_deg, hardness_hrc: hrc || undefined });
        if (!c) continue;
        // cascade is material-independent within a family (material->family is Kind 1's job);
        // dedupe on (family,thickness,taper,hardness) — the inputs that determine the output.
        const key = c.family_id + ":" + thickness_mm + ":" + taper_angle_deg + ":h" + hrc;
        if (seen.has(key)) continue;
        seen.add(key);
        const passLines = c.passes.map((p) =>
          "Pass " + p.pass_number + " (" + p.type + "): " + p.e_code +
          ", feed " + (p.feed_ipm == null ? "operator-set" : p.feed_ipm + " ipm") +
          ", " + p.h_register + " offset " + p.offset_inches + " in").join("\n");
        const caveatStr = c.caveats.length ? "\nCAVEATS: " + c.caveats.join(" | ") : "";
        out.push({
          instruction: INSTR_JOB,
          input: material + ", " + thickness_mm + " mm thick" + (hrc ? ", " + hrc + " HRC" : "") + (taper_angle_deg ? ", " + taper_angle_deg + " deg taper" : ", straight cut") + ".",
          output: "Family " + c.family_id + " (" + c.num_passes + "-pass; thickness factor " + c.thickness_factor + ", hardness factor " + c.hardness_factor + (c.thickness_extrapolated || c.hardness_extrapolated ? ", EXTRAPOLATED" : "") + "):\n" + passLines + caveatStr,
          meta: { id: "job:" + key, category: "programming", kind: "job_cascade", confidence: 0.9, source: "wedm-job-cascade:generateJobCascade" },
        });
       }
      }
    }
  }
  return out;
}

// ── Kind 7: compound / bi-material cascade (WIRES generateCompoundJobCascade —
//    closes the P0-3 'EDMBiMaterialCompensationEngine has ZERO linkage' finding;
//    carbide/braze zones fail-loud as needs_operator_ecode, never a steel recipe) ──
function compoundCascadePairs(): Pair[] {
  // A small set of real bi-material profiles (steel body + brazed carbide insert).
  const profiles = [
    {
      label: "D2 body, brazed WC insert (5-zone)", thickness_mm: 25,
      zones: [
        { zone_id: "z1", material: "D2", zone_type: "primary_steel" as const, start_mm: 0, end_mm: 10, hardness_hrc: 58 },
        { zone_id: "z2", material: "silver-braze", zone_type: "braze_joint" as const, start_mm: 10, end_mm: 11 },
        { zone_id: "z3", material: "tungsten-carbide", zone_type: "carbide_insert" as const, start_mm: 11, end_mm: 20 },
        { zone_id: "z4", material: "silver-braze", zone_type: "braze_joint" as const, start_mm: 20, end_mm: 21 },
        { zone_id: "z5", material: "D2", zone_type: "secondary_steel" as const, start_mm: 21, end_mm: 31 },
      ],
    },
    {
      label: "A2 body, single WC insert (3-zone)", thickness_mm: 40,
      zones: [
        { zone_id: "z1", material: "A2", zone_type: "primary_steel" as const, start_mm: 0, end_mm: 15, hardness_hrc: 60 },
        { zone_id: "z2", material: "tungsten-carbide", zone_type: "carbide_insert" as const, start_mm: 15, end_mm: 25 },
        { zone_id: "z3", material: "A2", zone_type: "secondary_steel" as const, start_mm: 25, end_mm: 40 },
      ],
    },
  ];
  const out: Pair[] = [];
  for (const p of profiles) {
    const c = generateCompoundJobCascade({ zones: p.zones, thickness_mm: p.thickness_mm });
    if (!c) continue;
    const zoneLines = c.zones.map((z) =>
      "Zone " + z.zone_id + " (" + z.zone_type + ", " + z.material + "): " +
      (z.e_family_id ? "FA family " + z.e_family_id : "NO FA E-family — operator dials in E-codes") +
      "; spark t_on " + z.params.t_on_us + " us, " + z.params.peak_current_A + " A, feed " + z.params.feed_rate_mm_min + " mm/min" +
      (z.needs_operator_ecode ? " [needs_operator_ecode]" : "")).join("\n");
    const warnStr = c.warnings.length ? "\nWARNINGS: " + c.warnings.join(" | ") : "";
    out.push({
      instruction: INSTR_COMPOUND,
      input: p.label + ", " + p.thickness_mm + " mm thick. Emit the per-zone wire-EDM cutting plan.",
      output: "Compound profile (" + c.zone_count + " zones; carbide=" + c.has_carbide + ", braze=" + c.has_braze + "; overall wire-break risk " + c.overall_wire_break_risk + "):\n" + zoneLines + warnStr + "\nCAVEATS: " + c.caveats.join(" | "),
      meta: { id: "compound:" + p.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase(), category: "programming", kind: "compound_cascade", confidence: 0.85, source: "wedm-compound-cascade:generateCompoundJobCascade" },
    });
  }
  return out;
}

/** Deterministic stratified-by-kind split (seeded LCG). */
function split(pairs: Pair[], seed: number) {
  let s = seed >>> 0;
  const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff);
  const byKind: Record<string, Pair[]> = {};
  for (const p of pairs) (byKind[p.meta.kind] ??= []).push(p);
  const train: Pair[] = [], val: Pair[] = [], test: Pair[] = [];
  for (const arr of Object.values(byKind)) {
    const sh = arr.map((p) => ({ p, r: rng() })).sort((a, b) => a.r - b.r).map((x) => x.p);
    for (let i = 0; i < sh.length; i++) {
      const r = i / Math.max(1, sh.length);
      if (r < 0.8) train.push(sh[i]); else if (r < 0.9) val.push(sh[i]); else test.push(sh[i]);
    }
  }
  return { train, val, test };
}

function main(): void {
  const all = [...familySelectPairs(), ...fullSchedulePairs(), ...perPassPairs(), ...invariantPairs(), ...h175Pairs(), ...jobCascadePairs(), ...compoundCascadePairs()];
  if (all.length === 0) { console.error("[wedm-passsched] FATAL: 0 pairs."); process.exit(2); }

  // SELF-VALIDATION: every generated full schedule must pass its own harness
  // against the oracle (a generator bug => fail-loud, nothing written).
  let validated = 0;
  for (const fam of JM_DIE_ECODE_FAMILIES) {
    const r = checkCascade(scheduleText(fam), { taper: fam.axes === 4, expected: expectedFor(fam) });
    if (!r.valid) {
      console.error("[wedm-passsched] FATAL: generated cascade for " + fam.id + " failed self-check: " + JSON.stringify(r.violations));
      process.exit(3);
    }
    validated += 1;
  }

  const { train, val, test } = split(all, SEED);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const write = (name: string, rows: Pair[]) => fs.writeFileSync(path.join(OUT_DIR, name), rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""), "utf8");
  write("wedm_passschedule_train.jsonl", train);
  write("wedm_passschedule_val.jsonl", val);
  write("wedm_passschedule_test.jsonl", test);

  const byKind: Record<string, number> = {};
  for (const p of all) byKind[p.meta.kind] = (byKind[p.meta.kind] ?? 0) + 1;
  console.log("=== WEDM PASS-SCHEDULE CORPUS (Regimen #3) ===");
  console.log(JSON.stringify({ total: all.length, by_kind: byKind, families_self_validated: validated, split: { train: train.length, val: val.length, test: test.length }, out_dir: OUT_DIR }, null, 2));
  console.log("[wedm-passsched] OK — " + all.length + " oracle-augmented pairs; " + validated + " family cascades self-validated against the harness.");
}

main();
