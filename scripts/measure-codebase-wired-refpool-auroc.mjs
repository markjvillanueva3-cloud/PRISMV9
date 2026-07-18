#!/usr/bin/env node
/**
 * measure-codebase-wired-refpool-auroc.mjs -- NON-DESTRUCTIVE deploy-gate measurement for the
 * U-GNN-CODEBASE-WIRED-APPLY lever (slot:india 2026-06-18). Answers ONE question with real
 * metrics, never an assumption: does adding the ~3206 codebase-wired reference ghosts (engine
 * imported by exactly one dispatcher -> confidence 1.0 label) to the GNN tier-5 direct-embed
 * pool improve the DEPLOYED posture (selective-deploy coverage + classes spanned at tau=0.7),
 * without dropping the global AUROC below the 0.78 gate?
 *
 * The shared 542MB system-graph.json and the deployed ghost-node-embeddings.jsonl are NEVER
 * written -- the apply decision (wired-engines-to-refpool --apply + wire stage 1c) is GATED on
 * this measurement. india refuses to mutate the deployed classifier on an unmeasured guess.
 *
 * Method (mirrors measure-binary-auroc.mjs):
 *   1. Build the codebase-wired ghosts (extractWiredEngines + buildGhostFromWiredEngine) -- the
 *      SAME functions wired-engines-to-refpool.mjs --apply would use (no divergence).
 *   2. Embed ONLY those new ghosts to a TEMP file (build-node-embeddings --graph <temp-ghosts>
 *      --ghosts-only --out <temp>), source-enriched exactly as the deployed embeddings are.
 *   3. Merge the deployed 355 ghost embeddings (verbatim) + the new rows -> temp-merged.jsonl.
 *   4. runAssessment direct-embed BASELINE: the real graph + the deployed 355 embeddings.
 *   5. runAssessment direct-embed ENRICHED: the real graph + the new ghosts injected + merged.
 *   6. Report AUROC / selective verdict / coverage / classes-spanned for both + the verdict.
 *
 * R12 HONESTY -- the holdout composition CHANGES between conditions. buildHoldout draws its test
 * set from ALL label-unique kind:ghost.unwired-engine refs with confidence >= refMinConf, so the
 * enriched run's holdout is larger and codebase-wired-dominated. This is the SAME task (engine
 * embedding -> dispatcher) with a mild easy-bias (codebase-wired engines have a clean single home),
 * NOT a different metric -- but it is reported explicitly so the AUROC delta is read correctly.
 * The decision-relevant signal is the SELECTIVE deploy posture at the production gate (classes
 * spanned + coverage), which directly targets the deployed tier's "spans 2/13 classes" limitation.
 *
 * Run: node --max-old-space-size=8192 scripts/measure-codebase-wired-refpool-auroc.mjs [--controlled] [--skip-embed] [--keep-temp]
 *   --controlled   ALSO run the FIXED-holdout comparison (same base test items, refs = base + new) via
 *                  the assessHoldout holdoutGraph seam -- the FAITHFUL "do the refs help the SAME
 *                  predictions?" measure, decoupled from the variable-holdout confound of the enriched run.
 *   --cap-per-class=N  inject only the first N codebase-wired refs PER dispatcher (balanced subset) --
 *                  tests whether a SPARSER pool broadens coverage WITHOUT the density-driven calibration
 *                  collapse the all-3206 pool caused. Pairs with --controlled + --skip-embed (the cache
 *                  always holds all 3206, so any cap value reuses it). Sweep e.g. =3 / =5 / =10.
 *   --skip-embed   reuse a previously generated temp embeddings file (state/shared/nn-graph/.cwref-newemb.jsonl).
 *                  CAVEAT: the cache is keyed by PATH, not by a hash of the dispatcher-import map -- if the
 *                  codebase wiring changed since the cache was written, the reused embeddings are STALE. Omit
 *                  --skip-embed (re-embed, ~90s) whenever the engine->dispatcher map may have changed.
 *   --keep-temp    do not delete the temp dir on exit (for inspection)
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { runAssessment } from "./lib/nn-graph-eval.mjs";
import { readGraphStreaming } from "./lib/graph-io.mjs";
import { buildEngineDispatcherMap } from "./lib/wired-engine-mapper.mjs";
import { extractWiredEngines, buildGhostFromWiredEngine } from "./wired-engines-to-refpool.mjs";
import { loadLabeledVectors, classSeparability } from "./analyze-ghost-embed-separability.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GRAPH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
const REAL_EMBED = path.join(ROOT, "state", "shared", "nn-graph", "ghost-node-embeddings.jsonl");
const DISPATCHERS_DIR = path.join(ROOT, "mcp-server", "src", "tools", "dispatchers");
const BUILD_EMB = path.join(ROOT, "scripts", "build-node-embeddings.mjs");
// A stable side-cache for the new ghost embeddings so --skip-embed can re-run the eval cheaply.
const NEWEMB_CACHE = path.join(ROOT, "state", "shared", "nn-graph", ".cwref-newemb.jsonl");

/**
 * Merge a deployed ghost-embeddings JSONL (kept verbatim) with newly-generated rows into one
 * file body. Keeps exactly ONE __meta header (the base's), drops the new file's __meta, and
 * dedups by `id` (base wins -- a deployed embedding is never overwritten by a fresh re-embed).
 * Pure + exported for a hermetic test. Returns { body, baseCount, newCount, merged }.
 */
export function mergeEmbeddingBodies(baseText, newText) {
  const out = [];
  const seen = new Set();
  let meta = null;
  let baseCount = 0;
  let newCount = 0;
  const take = (text, isBase) => {
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (t.length === 0) continue;
      if (t.startsWith('{"__meta')) { if (isBase && meta === null) meta = t; continue; }
      let id = null;
      try { id = JSON.parse(t).id; } catch { continue; }
      if (typeof id !== "string" || seen.has(id)) continue;
      seen.add(id);
      out.push(t);
      if (isBase) baseCount++; else newCount++;
    }
  };
  take(baseText, true);
  take(newText, false);
  const lines = meta ? [meta, ...out] : out;
  return { body: lines.join("\n") + "\n", baseCount, newCount, merged: out.length };
}

/**
 * Balanced per-class cap: keep at most `n` ghosts per proposed_wiring (dispatcher) class, in input
 * order (the input is engine-name sorted, so deterministic). Tests whether a SPARSER, balanced
 * reference pool broadens coverage WITHOUT the density-driven calibration collapse the all-3206
 * pool caused. n <= 0 / non-integer -> no cap (returns a copy of every ghost). Pure + exported.
 */
export function capPerClass(ghosts, n) {
  if (!Number.isInteger(n) || n <= 0) return (ghosts || []).slice();
  const seen = new Map();
  const out = [];
  for (const g of ghosts || []) {
    const cls = g && g.node ? g.node.proposed_wiring : undefined;
    const c = seen.get(cls) || 0;
    if (c < n) { out.push(g); seen.set(cls, c + 1); }
  }
  return out;
}

/**
 * Build a Map<dispatcher, factor> for the U-GNN-SEP-VOTE-WEIGHT lever from a LABELED embedding
 * corpus (the 3206 codebase-wired cache). Per-class separability MARGIN (intra - inter cosine) ->
 * factor = max(0, 1 + k*margin): a well-separated class (high margin) is boosted; an entangled
 * class (near-0 margin) stays ~1; a NEGATIVE-margin class is damped (<1). Separability is a per-
 * CLASS property, so a global factor map from the richest labeled sample is principled + applies to
 * any reference pool. Classes with < MIN_CLASS members are absent (-> voteDispatcher keeps factor 1).
 * Pure + exported for tests.
 */
export function buildSeparabilityFactorMap(embText, engineToDisp, k, minClass = 5) {
  const vecByEngine = loadLabeledVectors(embText);
  const byClass = new Map();
  for (const [engine, vec] of vecByEngine) {
    const d = engineToDisp instanceof Map ? engineToDisp.get(engine) : undefined;
    if (!d) continue;
    if (!byClass.has(d)) byClass.set(d, []);
    byClass.get(d).push(vec);
  }
  const { perClass } = classSeparability(byClass, minClass);
  const out = new Map();
  for (const p of perClass) out.set(p.class, Math.max(0, 1 + k * p.margin));
  return out;
}

/** Compact one runAssessment result to the decision-relevant fields. */
function summarize(tag, r) {
  if (!r || r.deferred || r.skipped) {
    console.log(`  ${tag}: DEFERRED/SKIPPED -- ${r && (r.reason || r.skipReason)}`);
    return null;
  }
  const m = r.metrics || {};
  const sel = r.selective && r.selective.deployGrade;
  console.log(`  ${tag}: AUROC ${m.auroc} | macroF1 ${m.macroF1} | Brier ${m.brier} | holdoutN=${r.holdoutN}`);
  if (sel) {
    const op = sel.operatingPoint || {};
    const cov = op.coverage != null ? (op.coverage * 100).toFixed(1) + "%" : "?";
    console.log(`         selective @tau=${sel.productionGate}: ${sel.verdict} -- coverage ${cov}, Brier ${op.brier}, macroF1 ${op.macroF1}, classes ${op.classesEmitted}/${op.totalClasses}, ${sel.robustAboveGate ? "robust" : "fragile"}`);
  }
  return {
    auroc: m.auroc,
    verdict: sel && sel.verdict,
    coverage: sel && sel.operatingPoint && sel.operatingPoint.coverage,
    classesEmitted: sel && sel.operatingPoint && sel.operatingPoint.classesEmitted,
    totalClasses: sel && sel.operatingPoint && sel.operatingPoint.totalClasses,
    brierAtGate: sel && sel.operatingPoint && sel.operatingPoint.brier,
    robust: sel && sel.robustAboveGate,
  };
}

function main() {
  const argv = process.argv.slice(2);
  const skipEmbed = argv.includes("--skip-embed");
  const keepTemp = argv.includes("--keep-temp");
  // --controlled: also run the FIXED-holdout comparison (same base test items, refs = base + new).
  // This isolates the refs' true effect on the same predictions from the variable-holdout confound.
  const controlled = argv.includes("--controlled");
  // --cap-per-class=N: inject only the first N codebase-wired refs per dispatcher (balanced subset),
  // testing whether a SPARSER pool avoids the density-driven calibration collapse the all-3206 caused.
  const capArg = argv.find((a) => a.startsWith("--cap-per-class="));
  const capN = capArg ? Math.max(0, parseInt(capArg.split("=")[1], 10) || 0) : 0;
  // --sep-weight=K: U-GNN-SEP-VOTE-WEIGHT lever -- re-weight the vote by per-class separability
  // (factor = 1 + K*margin). Focused baseline-vs-sep-weighted comparison on the DEPLOYED refs (no
  // ref-pool injection); short-circuits the codebase-wired conditions. Sweep K e.g. =5 / =10 / =20.
  const swArg = argv.find((a) => a.startsWith("--sep-weight="));
  const sepWeightK = swArg ? (parseFloat(swArg.split("=")[1]) || 0) : 0;
  // --refs-only: SELF-CONTAINED single-scheme coverage gate -- graph = the new refs ONLY,
  // classified against the SAME cache (no deployed-base merge, no 550MB graph load). The clean
  // test of an embedding SCHEME (e.g. SHARP): holdout + ref pool share ONE scheme, free of the
  // cross-scheme confound that mixing sharp refs into the non-sharp deployed base creates. Run
  // on the baseline cache vs the sharp cache (via --skip-embed) for a faithful sharp-vs-nonsharp
  // coverage delta. Intended with capN=0 (full 3206 set). Measures the codebase-WIRED set (a
  // proxy for deployed unwired-seed coverage, not the exact deployed-355 number).
  const refsOnly = argv.includes("--refs-only");

  // 1. Build the codebase-wired ghosts via the canonical apply-path functions.
  console.log("measure-codebase-wired-refpool: building codebase-wired ghosts...");
  const map = buildEngineDispatcherMap(DISPATCHERS_DIR);
  const { wirings, conflicts } = extractWiredEngines(map);
  const ghosts = wirings.map(buildGhostFromWiredEngine);
  console.log(`  ${ghosts.length} codebase-wired ghosts (confidence 1.0), ${conflicts.length} multi-dispatcher EXCLUDED`);
  if (ghosts.length === 0) { console.error("  no codebase-wired ghosts -- nothing to measure"); return 1; }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cwref-"));
  let mergedPath;
  try {
    // 2. Embed ONLY the new ghosts to a temp file (unless reusing the side-cache).
    let newEmbText;
    if (skipEmbed && fs.existsSync(NEWEMB_CACHE)) {
      newEmbText = fs.readFileSync(NEWEMB_CACHE, "utf8");
      console.log(`  --skip-embed: reusing ${path.relative(ROOT, NEWEMB_CACHE)} (${newEmbText.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('{"__meta')).length} rows)`);
    } else {
      const tmpGraph = path.join(tmpDir, "ghosts.json");
      const tmpNew = path.join(tmpDir, "newemb.jsonl");
      fs.writeFileSync(tmpGraph, JSON.stringify({ nodes: ghosts.map((g) => g.node), edges: [] }));
      console.log(`  embedding ${ghosts.length} new ghosts via build-node-embeddings --ghosts-only (nomic, local)...`);
      // Pass the heap flag EXPLICITLY -- a fresh spawn does not inherit the parent's
      // --max-old-space-size, and build-node-embeddings' own self-reexec did not fire here
      // (OOM'd at the default ~382MB heap). The child loads the resume/dedup structures.
      const childHeapMb = parseInt(process.env.PRISM_CWREF_EMBED_HEAP_MB || "8192", 10) || 8192;
      const r = spawnSync(process.execPath, [`--max-old-space-size=${childHeapMb}`, BUILD_EMB, "--graph", tmpGraph, "--ghosts-only", "--out", tmpNew], {
        stdio: "inherit", cwd: ROOT,
      });
      if (r.status !== 0 || !fs.existsSync(tmpNew)) { console.error(`  build-node-embeddings failed (status ${r.status})`); return 1; }
      newEmbText = fs.readFileSync(tmpNew, "utf8");
      // Persist to the side-cache so a re-run can --skip-embed.
      try { fs.writeFileSync(NEWEMB_CACHE, newEmbText); } catch { /* best-effort */ }
    }

    // Balanced-subset cap (--cap-per-class): pick N refs per dispatcher; the embedded set always
    // covers ALL 3206 (so --skip-embed reuse + any cap value share one cache), the cap is a pure
    // post-embed subset FILTER on both the injected ghosts and the merged embeddings.
    const useGhosts = capPerClass(ghosts, capN);
    if (capN > 0) console.log(`  --cap-per-class=${capN}: using ${useGhosts.length} of ${ghosts.length} refs (balanced per dispatcher)`);
    const useIds = new Set(useGhosts.map((g) => g.node.id));
    const newEmbForMerge = capN > 0
      ? newEmbText.split(/\r?\n/).filter((line) => {
          const t = line.trim();
          if (t.length === 0 || t.startsWith('{"__meta')) return true;
          try { return useIds.has(JSON.parse(t).id); } catch { return false; }
        }).join("\n")
      : newEmbText;

    // --refs-only: SELF-CONTAINED single-scheme coverage gate. graph = the refs ONLY, classify
    // against the SAME cache (NEWEMB_CACHE). No base merge, no 550MB load -- holdout AND ref pool
    // share ONE embedding scheme (the clean SHARP-vs-baseline test, free of cross-scheme mixing).
    if (refsOnly) {
      const refGraph = { nodes: useGhosts.map((g) => g.node), edges: [] };
      console.log(`\nREFS-ONLY (self-contained: ${useGhosts.length} refs, holdout + pool both from this single-scheme set):`);
      const ro = summarize("refs-only", runAssessment({ graph: refGraph, directEmbed: true, directEmbedPath: NEWEMB_CACHE }));
      if (!ro) { console.log("  INCONCLUSIVE: the arm produced no metrics (holdout too small?)."); return 1; }
      const gateAuroc = Number.isFinite(ro.auroc) && ro.auroc >= 0.78;
      const gateBrier = Number.isFinite(ro.brierAtGate) && ro.brierAtGate <= 0.15;
      const gateBroad = Number.isFinite(ro.classesEmitted) && ro.classesEmitted > 2;
      const deployable = ro.verdict === "deploy-ready-selective";
      console.log(`\nVERDICT (refs-only single-scheme coverage gate -- AUROC>=0.78 AND classes-emitted>2 AND Brier@gate<=0.15 AND deploy-ready):`);
      console.log(`  AUROC ${ro.auroc} (${gateAuroc ? "PASS" : "FAIL"}) | classes-emitted ${ro.classesEmitted}/${ro.totalClasses} (${gateBroad ? "PASS >2" : "FAIL <=2"}) | Brier@gate ${ro.brierAtGate} (${gateBrier ? "PASS" : "FAIL"}) | selective "${ro.verdict}"`);
      console.log(`  GATE: ${gateAuroc && gateBroad && gateBrier && deployable ? "HELD -- broad-coverage deployable operating point at this scheme" : "NOT HELD"}`);
      return 0;
    }

    // 3. Merge deployed 355 + new rows -> temp-merged (deployed embeddings kept verbatim).
    const baseText = fs.readFileSync(REAL_EMBED, "utf8");
    const merged = mergeEmbeddingBodies(baseText, newEmbForMerge);
    mergedPath = path.join(tmpDir, "merged.jsonl");
    fs.writeFileSync(mergedPath, merged.body);
    console.log(`  merged embeddings: ${merged.baseCount} deployed + ${merged.newCount} new = ${merged.merged} total`);

    // 4-5. Load graph once; baseline on the pristine graph, then INJECT for enriched/controlled.
    console.log("  loading graph (streaming, ~550MB)...");
    const graph = readGraphStreaming(GRAPH);
    console.log(`  graph: ${graph.nodes.length} nodes`);
    // Snapshot the PRE-injection node array so --controlled can hold out from the SAME base
    // population (shallow array copy -- node objects are shared, only the list is frozen).
    const baseNodesSnapshot = graph.nodes.slice();

    console.log("\nBASELINE (deployed 355-ref pool, real direct-embed path):");
    const base = summarize("baseline", runAssessment({ graph, directEmbed: true, directEmbedPath: REAL_EMBED }));

    // U-GNN-SEP-VOTE-WEIGHT lever: re-weight the SAME deployed-ref vote by per-class separability
    // (no ref-pool injection). Tests whether vote-tuning alone broadens emitted coverage.
    if (sepWeightK > 0) {
      const engineToDisp = new Map(wirings.map((w) => [w.engine, w.dispatcher]));
      const factorMap = buildSeparabilityFactorMap(newEmbText, engineToDisp, sepWeightK);
      const fvals = [...factorMap.values()];
      const fr = fvals.length ? `${Math.min(...fvals).toFixed(2)}..${Math.max(...fvals).toFixed(2)}` : "none";
      console.log(`\nSEP-WEIGHTED (deployed 355 refs, vote re-weighted by per-class separability, k=${sepWeightK}; ${factorMap.size} classes, factor ${fr}):`);
      const sw = summarize("sep-weighted", runAssessment({ graph, directEmbed: true, directEmbedPath: REAL_EMBED, separabilityWeights: factorMap }));
      console.log("\nVERDICT (U-GNN-SEP-VOTE-WEIGHT -- SAME deployed refs, vote re-weighted):");
      if (!base || !sw) { console.log("  INCONCLUSIVE: an arm produced no metrics."); return 1; }
      const dA = sw.auroc - base.auroc;
      console.log(`  AUROC ${base.auroc} -> ${sw.auroc} (${dA >= 0 ? "+" : ""}${dA.toFixed(4)}); selective "${base.verdict}" -> "${sw.verdict}"; coverage ${base.coverage} -> ${sw.coverage}; classes-emitted ${base.classesEmitted}/${base.totalClasses} -> ${sw.classesEmitted}/${sw.totalClasses}`);
      const broadens = Number.isFinite(sw.classesEmitted) && Number.isFinite(base.classesEmitted) && sw.classesEmitted > base.classesEmitted;
      const gateHeld = sw.verdict === "deploy-ready-selective" && Number.isFinite(sw.auroc) && sw.auroc >= 0.78;
      console.log(`  LEVER: ${
        broadens && gateHeld ? "WORKS -- broadens emitted classes WHILE holding the gate (candidate for the deployed default)"
          : gateHeld ? "gate held but NO coverage broadening -- vote-tuning alone is insufficient; features are the binding constraint (consistent with the separability diagnostic)"
          : "gate LOST -- this k over-weights the vote; lower k or reject"}`);
      return 0;
    }

    // Inject the new ghost NODES (direct-embed is pure cosine k-NN over embeddings -- no edges/model
    // needed, so edges are intentionally omitted). partitionGhosts/buildHoldout pick them up by kind.
    const existingIds = new Set(graph.nodes.map((n) => n && n.id));
    let injected = 0;
    for (const g of useGhosts) { if (!existingIds.has(g.node.id)) { graph.nodes.push(g.node); injected++; } }

    console.log(`\nENRICHED (deployed + ${injected} refs, VARIABLE holdout -- the LIVE-EVAL consequence post-apply):`);
    const enr = summarize("enriched", runAssessment({ graph, directEmbed: true, directEmbedPath: mergedPath }));

    // CONTROLLED: hold out the SAME base population but classify against the augmented pool -- the
    // FAITHFUL "do the extra refs help the SAME predictions?" measure, free of the variable-holdout
    // confound (the all-3206 enriched run re-samples the labeled refs into its own holdout).
    let ctrl = null;
    if (controlled) {
      console.log(`\nCONTROLLED (FIXED base holdout, refs = base + ${injected} -- the faithful inference effect):`);
      ctrl = summarize("controlled", runAssessment({ graph, holdoutGraph: { ...graph, nodes: baseNodesSnapshot }, directEmbed: true, directEmbedPath: mergedPath }));
    }

    // 6. Verdict.
    console.log("\nVERDICT (R12):");
    if (!base || !enr || (controlled && !ctrl)) {
      // An arm DEFERRED/SKIPPED -> NOT a measured result. Fail loud + non-zero so an automation
      // wrapper never misreads exit 0 as "measured, apply-safe".
      console.log("  APPLY-RECOMMENDED: NO (measurement DEFERRED -- an arm produced no metrics; nothing measured, do NOT apply)");
      return 1;
    }
    const pct = (x) => (x != null ? (x * 100).toFixed(1) + "%" : "?");
    const dEnr = enr.auroc - base.auroc;
    const liveBreaks = enr.verdict !== "deploy-ready-selective" || !(Number.isFinite(enr.auroc) && enr.auroc >= 0.78);
    console.log(`  [enriched / variable-holdout -- LIVE-EVAL CONSEQUENCE]`);
    console.log(`    AUROC ${base.auroc} -> ${enr.auroc} (${dEnr >= 0 ? "+" : ""}${dEnr.toFixed(4)}); selective "${base.verdict}" -> "${enr.verdict}"; coverage ${pct(base.coverage)} -> ${pct(enr.coverage)}; classes ${base.classesEmitted}/${base.totalClasses} -> ${enr.classesEmitted}/${enr.totalClasses}`);
    console.log(`    -> applying mutates the live graph; the live eval would report "${enr.verdict}" ${liveBreaks ? "(BREAKS PSN leg #10 -- the live eval re-samples the refs into its holdout)" : "(gate holds)"}`);
    if (ctrl) {
      const dCtrl = ctrl.auroc - base.auroc;
      const refsHelp = Number.isFinite(ctrl.auroc) && Number.isFinite(base.auroc) && ctrl.auroc >= base.auroc && ctrl.verdict === "deploy-ready-selective";
      console.log(`  [controlled / fixed-holdout -- FAITHFUL INFERENCE EFFECT]`);
      console.log(`    AUROC ${base.auroc} -> ${ctrl.auroc} (${dCtrl >= 0 ? "+" : ""}${dCtrl.toFixed(4)}); selective "${base.verdict}" -> "${ctrl.verdict}"; coverage ${pct(base.coverage)} -> ${pct(ctrl.coverage)}; classes ${ctrl.classesEmitted}/${ctrl.totalClasses}`);
      console.log(`    -> on the SAME held-out predictions, the extra refs ${refsHelp ? "HELP/HOLD (AUROC>=base AND gate held)" : "do NOT help (AUROC dropped or selective gate lost)"}`);
      console.log(`  CONCLUSION: ${
        refsHelp && liveBreaks
          ? "the refs HELP inference but the eval-as-wired MIS-MEASURES them (it holds out the labeled refs). Correct path = apply refs + EXCLUDE codebase-wired from buildHoldout sampling so the live verdict stays faithful. Do NOT apply until that eval-holdout fix ships (own unit)."
          : refsHelp && !liveBreaks
            ? "the refs help AND the live eval holds -> APPLY is justified (verify on a fresh live eval)."
            : "the refs do NOT help even on a FIXED holdout -> rejection CONFIRMED; do NOT apply."}`);
    } else {
      console.log(`  APPLY-RECOMMENDED: ${liveBreaks ? "NO" : "YES"} (re-run with --controlled for the faithful fixed-holdout inference effect before deciding).`);
    }
    return 0;
  } finally {
    if (!keepTemp) { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best-effort */ } }
    else console.log(`  (kept temp dir: ${tmpDir})`);
  }
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) process.exit(main());
