#!/usr/bin/env npx tsx
/**
 * lathe-closed-loop-trainer.ts — slot:whiskey (Lathe Wizard)
 * ==========================================================================
 * The CLOSED-LOOP SELF-LEARNING step for print→lathe-program accuracy.
 *
 * Rung B (lathe-print-to-program-roundtrip-accuracy.ts) showed PRISM plans the
 * right OPERATIONS (op-coverage 100%) but its textbook P-group speeds/feeds run
 * ~2-4x more aggressive than JM master programmers' real Okuma output. This tool
 * LEARNS the JM shop profile from real programs and proves it generalizes.
 *
 * HOW (honest ML discipline — NO test-data leakage, per the ML-expert rule
 * "train/val/test split — NEVER leak test data"):
 *   1. Sample the corpus, split TRAIN / held-out TEST (deterministic, seeded).
 *   2. LEARN on TRAIN only: per op-category, a SFM multiplier and an IPR
 *      multiplier = median(master) / median(PRISM-baseline-regen). This is the
 *      "JM shop profile" — how far PRISM's physics sits from how THIS shop runs.
 *      (Physically principled granularity: G96 holds SFM constant per op; feed is
 *      per op. So per-op-category is the right calibration axis, not arbitrary.)
 *   3. APPLY the learned profile to the regenerated params on the HELD-OUT TEST
 *      programs (which never touched the learning step).
 *   4. MEASURE test accuracy BASELINE (no profile) vs CALIBRATED (with profile).
 *      The LIFT on held-out data is the honest self-learning gain. Train-vs-test
 *      gap is reported as the overfit check.
 *   5. PERSIST the learned profile (versioned) so the system "remembers" it and
 *      the next iteration refines it (more data / finer buckets) → number climbs.
 *
 * This is genuine closed-loop learning: measure → learn from real-world results →
 * apply → re-measure on unseen data. It does NOT teach-to-the-test, so a rising
 * held-out number means PRISM is genuinely getting better at JM-realistic output,
 * not memorizing the corpus. We do NOT assert 100% — we report the real lift and
 * keep iterating (R12).
 *
 * Usage:
 *   npx tsx scripts/lathe-closed-loop-trainer.ts                       # 60 programs, 30% test
 *   npx tsx scripts/lathe-closed-loop-trainer.ts --sample 120 --test-frac 0.3 --band 0.35
 *
 * Output: state/shared/dashboards/lathe-shop-profile-calibration.json
 *         state/shared/dashboards/lathe-closed-loop-accuracy.md
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  REPO, CORPUS, getTurningEngine,
  walkMin, mulberry32, stratifiedSample,
  parseGroundTruth, deriveInput, regenParams, scoreParam, median,
  type OpCat, type GroundTruth, type RegenParams,
} from "./lib/lathe-roundtrip-core.js";

const OUT_DIR = join(REPO, "state", "shared", "dashboards");
const OP_CATS: OpCat[] = ["rough", "finish", "drill", "thread", "groove", "part_off"];
const MIN_TRAIN_SAMPLES = 3; // need ≥3 train programs for a cat before trusting its multiplier
const MIN_MULT = 0.1, MAX_MULT = 10; // sane clamp on a learned median-ratio multiplier

interface Args { sample: number; testFrac: number; band: number; seed: number; }
function parseArgs(argv: string[]): Args {
  const a: Args = { sample: 60, testFrac: 0.3, band: 0.35, seed: 1337 };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--sample") a.sample = parseInt(argv[++i], 10) || a.sample;
    else if (t.startsWith("--sample=")) a.sample = parseInt(t.slice(9), 10) || a.sample;
    else if (t === "--test-frac") a.testFrac = parseFloat(argv[++i]) || a.testFrac;
    else if (t.startsWith("--test-frac=")) a.testFrac = parseFloat(t.slice(12)) || a.testFrac;
    else if (t === "--band") a.band = parseFloat(argv[++i]) || a.band;
    else if (t.startsWith("--band=")) a.band = parseFloat(t.slice(7)) || a.band;
    else if (t === "--seed") a.seed = parseInt(argv[++i], 10) || a.seed;
  }
  return a;
}

/** A regenerated program plus its master ground truth — the unit we learn/score on. */
interface Sample { file: string; gt: GroundTruth; rp: RegenParams; }

/** Collect master gt + PRISM baseline regen for a list of .MIN files. */
function buildSamples(files: string[], engine: { runPipeline: (i: ReturnType<typeof deriveInput>) => Parameters<typeof regenParams>[0] }): { samples: Sample[]; skipped: number; fail: number } {
  const samples: Sample[] = [];
  let skipped = 0, fail = 0;
  for (const fp of files) {
    let text: string;
    try { text = readFileSync(fp, "latin1"); } catch { fail++; continue; }
    const fileName = fp.split(/[\\/]/).pop()!;
    const gt = parseGroundTruth(text, fileName);
    if (gt.cats.size === 0 && Object.keys(gt.sfmByCat).length === 0) { skipped++; continue; }
    let result;
    try { result = engine.runPipeline(deriveInput(gt, fileName.replace(/\.min$/i, ""))); }
    catch { fail++; continue; }
    samples.push({ file: fileName, gt, rp: regenParams(result) });
  }
  return { samples, skipped, fail };
}

interface Calibration { sfm: Partial<Record<OpCat, number>>; ipr: Partial<Record<OpCat, number>>; provenance: Record<string, { sfm_n: number; ipr_n: number }>; }

/** LEARN per-op-category SFM/IPR multipliers from TRAIN only (no test leakage). */
function learnCalibration(train: Sample[]): Calibration {
  const cal: Calibration = { sfm: {}, ipr: {}, provenance: {} };
  for (const cat of OP_CATS) {
    // collect per-program medians so each program contributes once (not per-line)
    const masterSfm: number[] = [], regenSfm: number[] = [], masterIpr: number[] = [], regenIpr: number[] = [];
    for (const s of train) {
      const mS = median(s.gt.sfmByCat[cat] ?? []); const rS = median(s.rp.sfmByCat[cat] ?? []);
      if (mS != null && rS != null && rS > 0) { masterSfm.push(mS); regenSfm.push(rS); }
      const mI = median(s.gt.iprByCat[cat] ?? []); const rI = median(s.rp.iprByCat[cat] ?? []);
      if (mI != null && rI != null && rI > 0) { masterIpr.push(mI); regenIpr.push(rI); }
    }
    cal.provenance[cat] = { sfm_n: masterSfm.length, ipr_n: masterIpr.length };
    // multiplier = median(master) / median(baseline-regen); clamp to sane bounds.
    if (masterSfm.length >= MIN_TRAIN_SAMPLES) {
      const m = median(masterSfm)! / median(regenSfm)!;
      cal.sfm[cat] = Math.min(MAX_MULT, Math.max(MIN_MULT, m));
    }
    if (masterIpr.length >= MIN_TRAIN_SAMPLES) {
      const m = median(masterIpr)! / median(regenIpr)!;
      cal.ipr[cat] = Math.min(MAX_MULT, Math.max(MIN_MULT, m));
    }
  }
  return cal;
}

/** Apply the learned profile to a regen param set (scale each sample by its cat multiplier). */
function applyCalibration(rp: RegenParams, cal: Calibration): RegenParams {
  // Defensive copy of cats (never mutated today, but keeps applyCalibration pure if a future edit touches it).
  const out: RegenParams = { cats: new Set(rp.cats), ok: rp.ok, toolCount: rp.toolCount, sfmByCat: {}, iprByCat: {} };
  for (const [cat, arr] of Object.entries(rp.sfmByCat)) {
    const k = cal.sfm[cat as OpCat] ?? 1;
    out.sfmByCat[cat] = arr.map((v) => v * k);
  }
  for (const [cat, arr] of Object.entries(rp.iprByCat)) {
    const k = cal.ipr[cat as OpCat] ?? 1;
    out.iprByCat[cat] = arr.map((v) => v * k);
  }
  return out;
}

/** Aggregate accuracy over a sample set, optionally applying a calibration. */
function measure(set: Sample[], band: number, cal: Calibration | null): { mean: number; op: number; sfm: number; ipr: number; n: number } {
  let opM = 0, opC = 0, sfmM = 0, sfmC = 0, iprM = 0, iprC = 0;
  const accs: number[] = [];
  for (const s of set) {
    const rp = cal ? applyCalibration(s.rp, cal) : s.rp;
    let oM = 0, oC = 0;
    for (const cat of s.gt.cats) { oC++; if (rp.cats.has(cat)) oM++; }
    const sfm = scoreParam(s.gt.sfmByCat, rp.sfmByCat, band);
    const ipr = scoreParam(s.gt.iprByCat, rp.iprByCat, band);
    opM += oM; opC += oC; sfmM += sfm.matched; sfmC += sfm.compared; iprM += ipr.matched; iprC += ipr.compared;
    const c = oC + sfm.compared + ipr.compared, m = oM + sfm.matched + ipr.matched;
    if (c > 0) accs.push(m / c);
  }
  const mean = accs.length ? accs.reduce((a, b) => a + b, 0) / accs.length : 0;
  return {
    mean: Math.round(mean * 1000) / 10,
    op: opC ? Math.round((opM / opC) * 1000) / 10 : 0,
    sfm: sfmC ? Math.round((sfmM / sfmC) * 1000) / 10 : 0,
    ipr: iprC ? Math.round((iprM / iprC) * 1000) / 10 : 0,
    n: accs.length,
  };
}

async function main() {
  const a = parseArgs(process.argv);
  const t0 = Date.now();
  const engine = await getTurningEngine();

  const all: string[] = [];
  walkMin(CORPUS, all);
  const rng = mulberry32(a.seed);
  const sampled = stratifiedSample(all, Math.min(a.sample, all.length), rng);

  // Deterministic train/test split (shuffle the sampled list with the same rng, then slice).
  const shuffled = [...sampled];
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  const nTest = Math.max(1, Math.round(shuffled.length * a.testFrac));
  const testFiles = shuffled.slice(0, nTest);
  const trainFiles = shuffled.slice(nTest);

  const trainB = buildSamples(trainFiles, engine);
  const testB = buildSamples(testFiles, engine);

  const cal = learnCalibration(trainB.samples);

  const trainBaseline = measure(trainB.samples, a.band, null);
  const trainCalibrated = measure(trainB.samples, a.band, cal);
  const testBaseline = measure(testB.samples, a.band, null);
  const testCalibrated = measure(testB.samples, a.band, cal);

  const heldoutLift = Math.round((testCalibrated.mean - testBaseline.mean) * 10) / 10;
  const overfitGap = Math.round((trainCalibrated.mean - testCalibrated.mean) * 10) / 10;

  const profile = {
    schemaVersion: "1.0.0",
    generated_at: new Date(t0).toISOString(),
    kind: "JM-shop-profile-calibration (per-op-category SFM/IPR multipliers, learned on TRAIN split)",
    honest_note:
      "Multipliers = median(JM master) / median(PRISM baseline-regen) per op-category, learned on TRAIN ONLY. " +
      "Held-out TEST accuracy is the real generalization number; teaching-to-the-test is avoided by the split. " +
      "A positive held-out lift = PRISM genuinely getting closer to JM-realistic output. NOT a 100% claim (R12). " +
      "CAVEAT: both arms still regenerate from a FORCED 1018/ISO-P input (no material inference yet), so the learned " +
      "multiplier is a COMPOSITE of true JM shop-conservatism + the forced-material bias — it is a parameter-envelope " +
      "shop-profile transform on PRISM's output, NOT proof the engine natively emits these values. 'CALIBRATED 76%' " +
      "means 'PRISM + learned JM shop profile lands within ±band of the master on held-out JM programs', NOT 'PRISM is " +
      "76% correct'. Next rung (material inference) separates the two and is expected to lift the BASELINE itself.",
    config: { sample: a.sample, test_frac: a.testFrac, band_pct: Math.round(a.band * 100), seed: a.seed, min_train_samples: MIN_TRAIN_SAMPLES },
    split: { train_programs: trainB.samples.length, test_programs: testB.samples.length, train_skipped: trainB.skipped, test_skipped: testB.skipped },
    calibration: cal,
    results: {
      train_baseline: trainBaseline, train_calibrated: trainCalibrated,
      test_baseline: testBaseline, test_calibrated: testCalibrated,
      heldout_mean_lift_pct: heldoutLift,
      heldout_sfm_lift_pct: Math.round((testCalibrated.sfm - testBaseline.sfm) * 10) / 10,
      heldout_ipr_lift_pct: Math.round((testCalibrated.ipr - testBaseline.ipr) * 10) / 10,
      overfit_gap_pct: overfitGap,
      overfit_flag: overfitGap > 15 ? "WATCH — train >> test, profile may be over-fit; widen sample" : "ok",
    },
    runtime_ms: Date.now() - t0,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const jsonPath = join(OUT_DIR, "lathe-shop-profile-calibration.json");
  const mdPath = join(OUT_DIR, "lathe-closed-loop-accuracy.md");
  writeFileSync(jsonPath, JSON.stringify(profile, null, 2));
  writeFileSync(mdPath, renderMd(profile));
  // eslint-disable-next-line no-console -- CLI summary line
  console.log(JSON.stringify({
    ok: true,
    train_n: trainB.samples.length, test_n: testB.samples.length,
    test_baseline_mean_pct: testBaseline.mean, test_calibrated_mean_pct: testCalibrated.mean,
    heldout_lift_pct: heldoutLift, overfit_gap_pct: overfitGap,
    test_calibrated_sfm_pct: testCalibrated.sfm, test_calibrated_ipr_pct: testCalibrated.ipr,
    json: jsonPath, md: mdPath, runtime_ms: profile.runtime_ms,
  }, null, 2));
  process.exit(0);
}

function d(x: unknown): string { return x == null ? "—" : String(x); }
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- profile is a wide ad-hoc shape; md render is presentation-only
function renderMd(p: any): string {
  const r = p.results;
  let md = `# JM Die Lathe — CLOSED-LOOP self-learning accuracy (held-out)\n\n`;
  md += `_Generated ${p.generated_at} · ${p.split.train_programs} train / ${p.split.test_programs} held-out test · ±${p.config.band_pct}% band · ${p.runtime_ms} ms_\n\n`;
  md += `> ${p.honest_note}\n\n`;
  md += `> ⚠️ **"CALIBRATED 76%" ≠ "PRISM is 76% correct."** Both arms regenerate from a FORCED 1018/ISO-P input; the learned profile is a parameter-envelope shop-profile transform on PRISM's output that also absorbs the forced-material bias. It measures held-out agreement with JM masters, not native engine correctness.\n\n`;
  md += `## Held-out test accuracy — the honest generalization number\n\n`;
  md += `| metric | BASELINE (PRISM only) | CALIBRATED (+ JM shop profile) | lift |\n|----|----|----|----|\n`;
  md += `| mean | ${d(r.test_baseline.mean)}% | **${d(r.test_calibrated.mean)}%** | **${r.heldout_mean_lift_pct >= 0 ? "+" : ""}${d(r.heldout_mean_lift_pct)}** |\n`;
  md += `| op-coverage | ${d(r.test_baseline.op)}% | ${d(r.test_calibrated.op)}% | — |\n`;
  md += `| SFM in-band | ${d(r.test_baseline.sfm)}% | ${d(r.test_calibrated.sfm)}% | ${r.heldout_sfm_lift_pct >= 0 ? "+" : ""}${d(r.heldout_sfm_lift_pct)} |\n`;
  md += `| IPR in-band | ${d(r.test_baseline.ipr)}% | ${d(r.test_calibrated.ipr)}% | ${r.heldout_ipr_lift_pct >= 0 ? "+" : ""}${d(r.heldout_ipr_lift_pct)} |\n\n`;
  md += `Overfit check: train calibrated ${d(r.train_calibrated.mean)}% vs test calibrated ${d(r.test_calibrated.mean)}% → gap ${d(r.overfit_gap_pct)} (**${r.overfit_flag}**)\n\n`;
  md += `## Learned JM shop profile (per-op-category multipliers, TRAIN-only)\n\n`;
  md += `| op category | SFM × | IPR × | train n (sfm/ipr) |\n|----|----|----|----|\n`;
  for (const cat of Object.keys(p.calibration.provenance)) {
    const sfm = p.calibration.sfm[cat], ipr = p.calibration.ipr[cat], pv = p.calibration.provenance[cat];
    md += `| ${cat} | ${sfm == null ? "—" : (Math.round(sfm * 100) / 100)} | ${ipr == null ? "—" : (Math.round(ipr * 100) / 100)} | ${pv.sfm_n}/${pv.ipr_n} |\n`;
  }
  md += `\n_Learned profile JSON: \`state/shared/dashboards/lathe-shop-profile-calibration.json\`. Baseline (no learning): \`lathe-roundtrip-accuracy.md\`._\n`;
  return md;
}

main().catch((e) => { console.error("closed-loop trainer failed:", e); process.exit(1); });
