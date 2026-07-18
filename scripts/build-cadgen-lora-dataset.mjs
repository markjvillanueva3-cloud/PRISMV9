// build-cadgen-lora-dataset.mjs -- turn the closed-loop GEN outcomes into a LoRA training feed
// (U-CADGEN-LORA-EMITTER, slot:delta 2026-07-03).
//
// THE CLOSED-LOOP GAP THIS CLOSES: cad-text-to-cadquery.mjs generates a CadQuery script for a
// text request, runs it (cadquery 2.8.0 now installed -> the run branch is live), and records the
// verified pass/fail/error verdict into mcp-server/data/state/cad-failure-ledger.jsonl (via
// CADTrialErrorLearningEngine). CADTrialErrorLearningEngine reads that ledger back into the NEXT
// prompt (learned-risk injection) -- so the loop already SELF-CORRECTS. But NOTHING turned those
// verified GEN outcomes into LoRA training pairs, so the model never SELF-LEARNS from its own
// successful generations. build-cad-decipher-lora.mjs feeds the *decipher* corpus, NOT gen. This
// module is the missing GEN->LoRA hop (R15 each-pass-feeds-next).
//
// DESIGN (grounded on the REAL data, not the plan's one-liner):
//   * The ledger row is LEAN -- {testId, originalPath:"text://<slug>", status, partType, generator,
//     error, timestamp}. It carries the authoritative pass/fail VERDICT but NO code. The working
//     CadQuery code lives in the staged gen dir state/shared/cad-text-gen/<slug>-<timestamp>/model.py
//     (alongside request.json = the CLEAN request text, model.step = the built solid, status.json).
//   * So we JOIN: the ledger's verified `pass` verdict (the QUALITY GATE -- it already encodes
//     classifyGenerationOutcome, incl. the curved-part self-check abstention) x the staged dir's
//     model.py (the CODE). One request-> working-code Alpaca pair per unique passing request.
//   * `fail`/`error` rows are SKIPPED (counted, loud). The ledger has the failing request + the
//     error, but NO verified corrected code -- and the delta soul forbids training a guess. A
//     future unit can emit a separate diagnostic dataset from (request+error); we do NOT fabricate
//     a fix here.
//   * Every emitted `output` is a model.py that ACTUALLY ran to a STEP (a model.step is on disk)
//     AND passes the pipeline's own codeInvalidReason() validator (reused, R8). This is a
//     TRAINING-SET POISON GUARD, not just a syntax check: a "pass" ledger verdict only means the
//     code RAN (analysisExit 0), so a part carrying the known 25.4x-undersize units bug (a dimension
//     DIVIDED by IN) still "passes" while being dimensionally wrong. codeInvalidReason rejects that
//     exact divide-by-IN pattern, so those defect parts are kept OUT of the training set -- live
//     validation 2026-07-03: 40 of 184 pass rows excluded, ALL for the divide-by-IN undersize bug.
//     Training on them would teach the LoRA to reproduce the very bug the pipeline just learned to
//     avoid. (The check does NOT reject legitimately-metric parts -- 0 "no inch conversion" rejects
//     in the live corpus.)
//
// Output: state/shared/lora/cadgen-outcome-dataset.jsonl, SAME Alpaca {instruction,output,...} schema
// as cad-decipher-mfg-dataset, registered as a kind:'lora-training-jsonl' source in
// build-fleet-training-corpus-inventory.mjs so assemble-fleet-lora-corpus.mjs folds it into the fleet
// corpus automatically (it unions every PRESENT lora-training-jsonl source).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { codeInvalidReason } from "./cad-text-to-cadquery.mjs";
import { curvedDimCheck } from "./lib/cad-curved-dim-check.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Ledger path resolution mirrors CADTrialErrorLearningEngine.resolveDefaultLedgerPath (module-anchored,
// NOT cwd-relative -- the two must point at the SAME file or the quality gate reads a different ledger
// than the engine writes). Env override matches the engine's PRISM_CAD_FAILURE_LEDGER knob.
const LEDGER_PATH =
  process.env.PRISM_CAD_FAILURE_LEDGER ||
  path.resolve(ROOT, "mcp-server", "data", "state", "cad-failure-ledger.jsonl");
const GEN_DIR = path.resolve(ROOT, "state", "shared", "cad-text-gen");
const OUT_PATH = path.resolve(ROOT, "state", "shared", "lora", "cadgen-outcome-dataset.jsonl");

// A staged gen dir is "<slug>-<epoch-ms>"; the trailing group is >= 10 digits (ms since epoch).
const TS_SUFFIX_RE = /-(\d{10,})$/;

/** Strip the "text://" scheme from a ledger originalPath -> the request slug, or null. */
export function slugFromOriginalPath(originalPath) {
  if (typeof originalPath !== "string") return null;
  const s = originalPath.startsWith("text://") ? originalPath.slice("text://".length) : originalPath;
  return s.trim() || null;
}

function readJsonl(p) {
  if (!fs.existsSync(p)) return { rows: [], corrupt: 0, missing: true };
  const raw = fs.readFileSync(p, "utf8").trim();
  const rows = [];
  let corrupt = 0; // R12 fail-loud: corrupt lines are COUNTED, never silently dropped
  for (const l of raw ? raw.split("\n") : []) {
    if (!l.trim()) continue;
    try { rows.push(JSON.parse(l)); } catch { corrupt++; }
  }
  return { rows, corrupt, missing: false };
}

/**
 * Index staged gen dirs by request-slug. For each slug keep the NEWEST timestamp that has BOTH a
 * model.py AND a model.step (built) -- regenerations of the same request accumulate a new dir
 * (cad-gen appends, never overwrites), and the newest built copy is the current best code
 * (mirrors the newestPerRequest dedup convention, U-DELTA-CAD-SWEEP-DEDUP).
 * Injected fs ops for testability.
 * @returns Map<slug, {dir, ts}>
 */
export function indexStagedDirs(genDir, { readdir = fs.readdirSync, existsSync = fs.existsSync } = {}) {
  const bySlug = new Map();
  let entries;
  try { entries = readdir(genDir, { withFileTypes: true }); } catch { return bySlug; }
  for (const ent of entries) {
    if (!ent.isDirectory || !ent.isDirectory()) continue;
    const name = ent.name;
    const m = name.match(TS_SUFFIX_RE);
    if (!m) continue;
    const slug = name.slice(0, m.index);
    const ts = Number(m[1]);
    const dir = path.join(genDir, name);
    // Only staged dirs that actually ran (model.py + model.step both present) are eligible.
    if (!existsSync(path.join(dir, "model.py")) || !existsSync(path.join(dir, "model.step"))) continue;
    const prev = bySlug.get(slug);
    if (!prev || ts > prev.ts) bySlug.set(slug, { dir, ts });
  }
  return bySlug;
}

/**
 * Find the staged entry for a ledger slug: exact match first, else the newest staged dir whose slug
 * STARTS WITH the ledger slug (ledger slugs are occasionally truncated relative to the dir name).
 * @returns {dir, ts}|null
 */
export function matchStaged(slug, stagedIndex) {
  if (!slug) return null;
  const exact = stagedIndex.get(slug);
  if (exact) return exact;
  let best = null;
  for (const [stagedSlug, v] of stagedIndex) {
    if (stagedSlug.startsWith(slug) && (!best || v.ts > best.ts)) best = v;
  }
  return best;
}

/**
 * LEDGER-RESCUE (U-CAD-LEDGER-RESCUE, slot:delta 2026-07-05): a historically-FAILING ledger row (status
 * fail/error) whose staged geometry NOW verifies accurate offline is a valid training pair. This happens two
 * ways: (1) the self-heal loop (cad-regen-stale-gens) regenerated the stale-failing gen to accurate geometry;
 * (2) a gen-time self-check false-failed it on a measurement bug since CORRECTED (e.g. the curved axial-length
 * fix), so the step was always fine. Either way the CODE on disk is verified-correct now. We do NOT mutate the
 * ledger — the fail row is the CADTrialErrorLearningEngine learned-risk signal (it reads the ledger back into
 * the next prompt); we only ADD the verified-correct code as a training pair. Curved-only + offline-verified: a
 * prismatic/py-threw fail (no isolable curved dim, `applicable:false`) is NEVER rescued (unverifiable => untrained).
 * The rescued code still passes codeInvalidReason (the poison guard) in pairFromPassRow, same as any pass row.
 * @returns boolean
 */
export function stagedCurvedAccurate(dir, { readText = (p) => fs.readFileSync(p, "utf8"), existsSync = fs.existsSync, curvedCheck = curvedDimCheck } = {}) {
  try {
    const reqPath = path.join(dir, "request.json");
    const stepPath = path.join(dir, "model.step");
    if (!existsSync(reqPath) || !existsSync(stepPath)) return false;
    const request = JSON.parse(readText(reqPath)).request;
    if (typeof request !== "string" || !request.trim()) return false;
    const r = curvedCheck(request, readText(stepPath));
    return !!(r && r.applicable && r.accurate);
  } catch { return false; }
}

const INSTRUCTION_PREFIX =
  "Write a CadQuery (Python) script that models this part. Use the JM inch convention " +
  "(IN = 25.4 mm; dimensions are inches unless stated metric) and export the solid to " +
  "os.environ['OUTPUT_STEP']. Part:";

// PARAMETRIC lane (U-CAD-LORA-PARAMETRIC): a distinct instruction that teaches the model to emit the
// EQUATION-BASED form -- named dimension VARIABLES at the top + geometric relationships as equations
// (radius = dia/2, inner = outer - 2*wall) -- so the fine-tuned model learns auto-template-generation, not
// just hard-locked scripts. Sourced from the model.parametric.py the loop now stages for deterministic parts.
const PARAMETRIC_INSTRUCTION_PREFIX =
  "Write a PARAMETRIC CadQuery (Python) script for this part: put every dimension in a named variable at the " +
  "top (mm), express derived dimensions as equations over them (e.g. radius = dia/2, inner = outer - 2*wall), " +
  "and export the solid to os.environ['OUTPUT_STEP']. Part:";

/**
 * Build one training pair from a verified-pass ledger row joined to its staged code.
 * @returns {pair}|{skip:'no-slug'|'no-staged-code'|'no-request'|'invalid-code:<reason>'}
 */
export function pairFromPassRow(row, stagedIndex, {
  readText = (p) => fs.readFileSync(p, "utf8"),
  existsSync = fs.existsSync,
  validateCode = codeInvalidReason,
  rescued = false, // LEDGER-RESCUE: a verified-accurate-now row whose ledger status is fail/error (provenance only)
} = {}) {
  const slug = slugFromOriginalPath(row && row.originalPath);
  if (!slug) return { skip: "no-slug" };
  const staged = matchStaged(slug, stagedIndex);
  if (!staged) return { skip: "no-staged-code" };
  const reqPath = path.join(staged.dir, "request.json");
  const pyPath = path.join(staged.dir, "model.py");
  if (!existsSync(reqPath) || !existsSync(pyPath)) return { skip: "no-staged-code" };
  // TRAINING-QUALITY GATE (arm-A P2 follow-up, 2026-07-05): skip a part whose self-heal was ATTEMPTED but came
  // out still-failing (status.healed.accurate === false). Its model.py is CLEAN now (so codeInvalidReason no
  // longer excludes it) yet its geometry is UNVERIFIED/wrong -- never train on it. Before the heal cleaned its
  // code it was poison-excluded; this preserves that exclusion instead of injecting unverified geometry.
  try {
    const st = JSON.parse(readText(path.join(staged.dir, "status.json")));
    if (st && st.healed && st.healed.accurate === false) return { skip: "heal-failed" };
  } catch { /* no/invalid status.json -> not a failed heal, proceed */ }
  let request = null, via = "ollama"; // pre-`via` gens are all LLM-authored -> default ollama (back-compat)
  try { const rj = JSON.parse(readText(reqPath)); request = rj.request; if (typeof rj.via === "string" && rj.via) via = rj.via; } catch { request = null; }
  if (typeof request !== "string" || !request.trim()) return { skip: "no-request" };
  let code = "";
  try { code = readText(pyPath); } catch { return { skip: "no-staged-code" }; }
  const invalid = validateCode(code);
  if (invalid) return { skip: `invalid-code:${invalid}` };
  const result = {
    pair: {
      instruction: `${INSTRUCTION_PREFIX} ${request.trim()}`,
      output: code.trimEnd() + "\n",
      partType: row.partType || slug,
      generator: row.generator || "cadquery-text",
      // PROVENANCE (U-CAD-LORA-VIA-TAG): "deterministic-primitive" pairs are template output the LLM is
      // NEVER called for at inference (the emitter handles those parts) -- a training run may down-weight or
      // exclude them (--llm-only) so the LLM trains on the COMPLEX parts that are actually its job.
      via,
      source: rescued ? "cadgen-outcome-heal-rescued" : "cadgen-outcome-pass",
    },
  };
  // PARAMETRIC pair (U-CAD-LORA-PARAMETRIC): if the loop staged the equation-based form for this part, add a
  // SECOND pair (distinct parametric instruction -> the parametric script) so the model learns to WRITE
  // variable+equation templates. Validated by the same (now parametric-aware) units gate. Additive: absence
  // of the sidecar leaves the row exactly as before (back-compat). Only deterministic parts have a sidecar.
  const paramPath = path.join(staged.dir, "model.parametric.py");
  if (existsSync(paramPath)) {
    try {
      const pcode = readText(paramPath);
      if (pcode && pcode.trim() && !validateCode(pcode)) {
        result.parametricPair = {
          instruction: `${PARAMETRIC_INSTRUCTION_PREFIX} ${request.trim()}`,
          output: pcode.trimEnd() + "\n",
          partType: row.partType || slug,
          generator: row.generator || "cadquery-text",
          via: `${via}-parametric`,
          source: rescued ? "cadgen-outcome-heal-rescued-parametric" : "cadgen-outcome-pass-parametric",
        };
      }
    } catch { /* the parametric pair is additive -- never fail a good main pair over a bad sidecar */ }
  }
  return result;
}

/**
 * Build all training pairs from the ledger's PASS rows joined to staged code.
 * One pair per unique request-slug (dedup keeps the first PASS row's newest staged code).
 * @returns {{pairs:Array, stats:object}}
 */
export function buildPairs(ledgerPath = LEDGER_PATH, genDir = GEN_DIR, deps = {}) {
  const llmOnly = !!deps.llmOnly; // exclude deterministic-primitive pairs (the LLM is never called for them)
  const { rows, corrupt, missing } = readJsonl(ledgerPath);
  const stagedIndex = indexStagedDirs(genDir, deps);
  const stats = {
    ledgerRows: rows.length, ledgerMissing: !!missing, corruptLedger: corrupt,
    stagedDirsIndexed: stagedIndex.size,
    pass: 0, fail: 0, error: 0, other: 0,
    emitted: 0,
    skippedNoSlug: 0, skippedNoStagedCode: 0, skippedNoRequest: 0, skippedInvalidCode: 0,
    skippedFail: 0, skippedError: 0, dedupCollapsed: 0,
    skippedDeterministic: 0, rescuedHealed: 0, skippedHealFailed: 0, byVia: {}, llmOnly,
  };
  const seenSlug = new Set();   // one pair per unique request-slug
  const seenPair = new Set();   // text-safe (instruction,output) dedup (a NUL key made a sibling git-binary)
  const pairs = [];
  for (const row of rows) {
    const status = row && row.status;
    let rescued = false; // LEDGER-RESCUE: this fail/error row's staged geometry verifies accurate NOW
    if (status === "pass") stats.pass++;
    else if (status === "fail") stats.fail++;
    else if (status === "error") stats.error++;
    else { stats.other++; continue; }

    const slug = slugFromOriginalPath(row.originalPath);
    if (slug && seenSlug.has(slug)) { stats.dedupCollapsed++; continue; }

    // A fail/error row is a candidate ONLY if its staged geometry NOW verifies curved-accurate offline (heal or a
    // corrected measurement). Decision is AFTER the slug-dedup so a slug already covered by a pass row is not
    // rescue-counted. Not rescuable -> skipped, exactly as before. The ledger is never mutated (R7/learned-risk).
    if (status === "fail" || status === "error") {
      const rstaged = slug ? matchStaged(slug, stagedIndex) : null;
      if (!(rstaged && stagedCurvedAccurate(rstaged.dir, deps))) {
        if (status === "fail") stats.skippedFail++; else stats.skippedError++;
        continue;
      }
      stats.rescuedHealed++;
      rescued = true;
    }

    const res = pairFromPassRow(row, stagedIndex, { ...deps, rescued });
    if (res.skip) {
      if (res.skip === "no-slug") stats.skippedNoSlug++;
      else if (res.skip === "no-staged-code") stats.skippedNoStagedCode++;
      else if (res.skip === "no-request") stats.skippedNoRequest++;
      else if (res.skip === "heal-failed") stats.skippedHealFailed++;
      else if (res.skip.startsWith("invalid-code")) stats.skippedInvalidCode++;
      continue;
    }
    // --llm-only excludes BOTH emitter-owned via labels (primitive AND feature) -- the LLM is never called for
    // either at inference, so neither belongs in an LLM-only training set. The `*-parametric` pairs are KEPT
    // (the parametric form IS what we want the LLM to learn to write). (arm-B ternary-via P2 2026-07-05.)
    if (llmOnly && (res.pair.via === "deterministic-primitive" || res.pair.via === "deterministic-feature")) { stats.skippedDeterministic++; continue; }
    const key = JSON.stringify([res.pair.instruction, res.pair.output]);
    if (seenPair.has(key)) { stats.dedupCollapsed++; continue; }
    seenPair.add(key);
    if (slug) seenSlug.add(slug);
    pairs.push(res.pair);
    stats.emitted++;
    stats.byVia[res.pair.via] = (stats.byVia[res.pair.via] || 0) + 1;
    // PARAMETRIC pair (additive, U-CAD-LORA-PARAMETRIC): teach the model the request->parametric mapping too.
    // Independently deduped; counted under byVia (`*-parametric`) + parametricEmitted. --llm-only keeps it
    // (the parametric form IS what we want the LLM to learn to write for these shapes).
    if (res.parametricPair) {
      const pkey = JSON.stringify([res.parametricPair.instruction, res.parametricPair.output]);
      if (!seenPair.has(pkey)) {
        seenPair.add(pkey);
        pairs.push(res.parametricPair);
        stats.emitted++;
        stats.parametricEmitted = (stats.parametricEmitted || 0) + 1;
        stats.byVia[res.parametricPair.via] = (stats.byVia[res.parametricPair.via] || 0) + 1;
      }
    }
  }
  stats.total = pairs.length;
  return { pairs, stats };
}

export function writeFeed(pairs, outPath = OUT_PATH) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const tmp = `${outPath}.tmp`;
  fs.writeFileSync(tmp, pairs.map((p) => JSON.stringify(p)).join("\n") + (pairs.length ? "\n" : ""));
  fs.renameSync(tmp, outPath); // atomic -- a truncating write would leave a torn file for a concurrent reader
  return outPath;
}

export const __test = { slugFromOriginalPath, indexStagedDirs, matchStaged, pairFromPassRow, stagedCurvedAccurate, buildPairs, INSTRUCTION_PREFIX, PARAMETRIC_INSTRUCTION_PREFIX };

// ---- CLI -------------------------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const { pairs, stats } = buildPairs(LEDGER_PATH, GEN_DIR, { llmOnly: args.includes("--llm-only") });
  if (args.includes("--write")) { writeFeed(pairs); stats.wrote = OUT_PATH; }
  if (args.includes("--json")) console.log(JSON.stringify(stats, null, 2));
  else {
    if (stats.ledgerMissing) console.log(`WARNING ledger missing at ${LEDGER_PATH} -- 0 pairs (run some GENs first)`);
    console.log(`cadgen-outcome LoRA feed: ${stats.total} request->working-code pairs (from ${stats.pass} verified-pass ledger rows, ${stats.stagedDirsIndexed} staged dirs)`);
    console.log(`  skipped: fail=${stats.skippedFail} error=${stats.skippedError} (no verified fix -- soul: never train a guess); rescued=${stats.rescuedHealed} (fail-row whose staged geometry verifies accurate NOW)`);
    console.log(`  unresolved pass rows: no-staged-code=${stats.skippedNoStagedCode} no-request=${stats.skippedNoRequest} invalid-code=${stats.skippedInvalidCode} heal-failed=${stats.skippedHealFailed} no-slug=${stats.skippedNoSlug}; dedup-collapsed=${stats.dedupCollapsed}`);
    console.log(`  provenance: byVia=${JSON.stringify(stats.byVia)}${stats.llmOnly ? ` (--llm-only: excluded ${stats.skippedDeterministic} deterministic-primitive pairs)` : ""}`);
    if (stats.corruptLedger) console.log(`  WARNING corrupt ledger lines skipped: ${stats.corruptLedger} -- inspect ${LEDGER_PATH}`);
    if (stats.wrote) console.log(`  wrote -> ${stats.wrote}`);
    else console.log(`  (dry -- pass --write to emit ${OUT_PATH})`);
  }
}
