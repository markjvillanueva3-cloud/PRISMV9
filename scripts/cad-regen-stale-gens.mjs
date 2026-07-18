#!/usr/bin/env node
/**
 * cad-regen-stale-gens.mjs -- self-heal the staged CAD-gen corpus (slot:delta, U-CAD-REGEN-STALE-GENS).
 *
 * THE GAP THIS CLOSES: the overnight generation loop (scripts/cad-gen-overnight-loop.mjs) is resumable via a
 * per-spec processed-cursor -- "re-gen=0 on resume". So once a spec is staged it is marked done and NEVER
 * regenerated. Staged parts produced by an OLDER emitter therefore stay frozen in the corpus forever. Two
 * such stale-artifact classes were live-diagnosed 2026-07-05 (slot:delta):
 *   (1) metric cylinders with a radius 25.4x too SMALL -- the pre-deterministic-routing LLM "25.4x undersize
 *       units bug" (cad-text-to-cadquery.mjs:686-688); the CURRENT deterministic-primitive path emits them
 *       EXACTLY (a fresh "38.1 mm diameter cylinder" now reads radius 19.05 mm, curvedDim accurate).
 *   (2) discs whose staged bbox mis-reads the axial length (old construction vertex-sampled the rim).
 * Both DEPRESS the measured curved-dim accuracy (69.1% headline) AND poison the LoRA training dataset, which
 * reads staged code/STEP. The corpus never self-heals -- until this step runs.
 *
 * WHAT IT DOES: for each staged gen the CURRENT deterministic emitter (emitPrimitiveCode || emitFeatureCode)
 * can reproduce, it regenerates IN PLACE when EITHER
 *   (dimensional) its model.step FAILS its own curvedDimCheck, OR
 *   (poison-code)  its model.step is dimensionally CORRECT but its staged model.py trips the units poison-guard
 *                  (codeInvalidReason) -- an LLM `OD = 25.02/IN; OD_MM = OD*IN` CANCELLED divide-then-multiply
 *                  that is dimensionally fine yet bug-adjacent, so `build-cadgen-lora-dataset` (rightly) EXCLUDES
 *                  it from the LoRA feed. Re-emitting the clean deterministic form lets the correct part re-enter
 *                  training WITHOUT the fragile idiom (live 2026-07-05: 26 curved parts were leaking this way).
 * It regenerates in place (overwrite model.py + re-execute cadquery -> model.step + refresh the parametric
 * sidecar + stamp a heal-provenance record on status.json + stamp request.json.via=deterministic-primitive so
 * the training lane labels the part correctly). It NEVER touches a gen the deterministic emitter cannot make
 * (an LLM part -- out of scope, reported not-deterministic) and NEVER creates a duplicate timestamped dir (the
 * reason it heals in place, not via main()). Fail-soft per dir; a fresh gen that STILL fails is surfaced as
 * `still-failing`, and a poison-heal that would make an ALREADY-ACCURATE part inaccurate is REVERTED and
 * surfaced as `regressed-restored` -- never silently counted as healed (R12).
 *
 * Scope = CURVED gens (curvedDimCheck applicable): the diagnosed defect class. Prismatic parts (83.7% dim
 * accuracy, un-diagnosed) are deliberately left untouched -- do not heal what has not been diagnosed (R12).
 *
 * Pure core (`classifyStaged`) + injectable IO (`healOneGen` deps) -> hermetically node:test-able with NO
 * cadquery. Mirrors the sibling scripts/backfill-parametric-sidecars.mjs.
 *
 *   node scripts/cad-regen-stale-gens.mjs                 # DRY RUN: report stale-failing candidates
 *   node scripts/cad-regen-stale-gens.mjs --write         # regenerate the candidates in place
 *   node scripts/cad-regen-stale-gens.mjs --write --limit 20   # cap this run (heavy: cadquery per heal)
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { emitPrimitiveCode } from "./lib/cad-primitive-emit.mjs";
import { emitFeatureCode } from "./lib/cad-feature-emit.mjs";
import { curvedDimCheck } from "./lib/cad-curved-dim-check.mjs";
import { codeInvalidReason } from "./cad-text-to-cadquery.mjs";
import { hasTemplate, paramsFromDims, renderParametricScript, templateSpec } from "./lib/cad-parametric-templates.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GEN_DIR = path.resolve(ROOT, "state", "shared", "cad-text-gen");
const PYTHON = process.env.PRISM_PYTHON || "H:/Tools/python/python.exe";

/**
 * PURE classifier: is a staged gen a stale-failing HEAL candidate? A candidate is a CURVED gen whose staged
 * STEP fails its own curvedDimCheck AND which the current deterministic emitter can reproduce. Returns
 * { candidate, reason, staged, shape?, code?, dimsMm? }. Injectable emitters -> no real emit needed in tests.
 */
// High-confidence feature keywords a PLAIN-primitive emit never models. If the primitive emitter "wins" on a
// request that names one of these, it would re-draw the part PLAIN and silently DROP the feature -- and
// curvedDimCheck (diameter + length only) cannot see the drop. Refuse the heal instead (arm-C scrutiny
// 2026-07-05). Deliberately excludes hole/bore/washer/flange/disc/flat -- those ARE modeled by the primitive
// tube/disc emitters, so guarding them would falsely refuse legitimate heals.
const UNMODELED_FEATURE_KW = /\b(keyway|groove|slot|thread|tapped|knurl|chamfer|fillet|counterbore|c['`]?bore|spline|cross[- ]?hole|pocket)\b/i;

export function classifyStaged(request, stagedStepText, { emitPrimitive = emitPrimitiveCode, emitFeature = emitFeatureCode, curvedCheck = curvedDimCheck, currentCode = null, validateCode = codeInvalidReason } = {}) {
  const staged = curvedCheck(request, stagedStepText || "");
  if (!staged.applicable) return { candidate: false, reason: "not-curved-checkable", staged };
  const prim = emitPrimitive(request);
  const e = prim || emitFeature(request);
  if (!e || !e.code) return { candidate: false, reason: "not-deterministic", staged };
  // never heal by feature-drop: a primitive emit on a featured request would draw it plain (feature invisible
  // to curvedDimCheck). The feature emitter (emitFeature) DOES model features -> only guard the primitive path.
  if (prim && UNMODELED_FEATURE_KW.test(request)) return { candidate: false, reason: "featured-primitive-refused", staged };
  // Two heal triggers (see file header). dimFail: the staged geometry is dimensionally wrong. codePoison: the
  // geometry is CORRECT but the staged model.py trips the units poison-guard (a cancelled divide-then-multiply)
  // so it is excluded from the LoRA feed -- re-emit the clean deterministic form. `currentCode` defaults null,
  // so a caller that does not pass it keeps the pure dimensional-heal behavior (back-compat).
  const dimFail = !staged.accurate;
  const codePoison = !!(currentCode && validateCode && validateCode(currentCode));
  if (!dimFail && !codePoison) return { candidate: false, reason: "already-ok", staged };
  // never rewrite fragile-but-correct code with an emit that is ITSELF poison -- no gain, and it would risk the
  // regression guard reverting; leave the dimensionally-correct part alone (R12).
  if (!dimFail && codePoison && !!(validateCode && validateCode(e.code))) return { candidate: false, reason: "emit-also-poison", staged };
  // via matches the canonical emitter's ternary vocabulary (cad-text-to-cadquery.mjs: prim? primitive : feature)
  // so a healed feature part is not mislabeled as -primitive -- both are emitter-owned (LLM never called at run).
  const via = prim ? "deterministic-primitive" : "deterministic-feature";
  return { candidate: true, reason: dimFail ? "stale-failing-deterministic" : "poison-code-clean-emit", staged, shape: e.shape, code: e.code, dimsMm: e.dimsMm, wasAccurate: !!staged.accurate, via };
}

/** Preflight: can the portable Python import cadquery? Probed ONCE before a --write run so a python-down env
 *  fails LOUD (exit) instead of silently rewriting every candidate's model.py with no re-execution (arm-C). */
function cadqueryAvailable() {
  const r = spawnSync(PYTHON, ["-c", "import cadquery"], { encoding: "utf8", timeout: 30_000, windowsHide: true });
  return r.status === 0;
}

/** Default in-place cadquery execution: run model.py -> model.step (the executeStaged contract, cad-text-to-cadquery.mjs:650). */
function defaultExecCadquery(dir) {
  const stepPath = path.join(dir, "model.step");
  const r = spawnSync(PYTHON, [path.join(dir, "model.py")], {
    encoding: "utf8", timeout: 120_000, windowsHide: true, cwd: dir,
    env: { ...process.env, OUTPUT_STEP: stepPath },
  });
  if (r.status !== 0) return { ok: false, reason: `python exit ${r.status}: ${String(r.stderr || "").slice(-200)}` };
  if (!fs.existsSync(stepPath)) return { ok: false, reason: "ran but produced no model.step" };
  return { ok: true };
}

/**
 * Heal ONE staged gen dir. Returns { outcome, ... }. outcome:
 *   no-request | no-step | not-curved-checkable | already-ok | not-deterministic  (skipped)
 *   would-heal            (dry run: a real candidate that --write would regenerate)
 *   healed | still-failing | exec-failed | error                                   (--write)
 * `deps` injects { readText, existsSync, writeFileSync, execCadquery, emitPrimitive, emitFeature } for tests.
 */
export function healOneGen(dir, { write = false, deps = {} } = {}) {
  const readText = deps.readText || ((p) => fs.readFileSync(p, "utf8"));
  const existsSync = deps.existsSync || fs.existsSync;
  const writeFileSync = deps.writeFileSync || fs.writeFileSync;
  const rm = deps.rm || fs.rmSync;
  const execCadquery = deps.execCadquery || defaultExecCadquery;
  const curvedCheck = deps.curvedCheck || curvedDimCheck;
  const reqPath = path.join(dir, "request.json");
  const stepPath = path.join(dir, "model.step");
  const pyPath = path.join(dir, "model.py");
  if (!existsSync(reqPath)) return { outcome: "no-request" };
  if (!existsSync(stepPath)) return { outcome: "no-step" };
  let request;
  try { request = JSON.parse(readText(reqPath)).request; } catch { return { outcome: "no-request" }; }
  if (typeof request !== "string" || !request.trim()) return { outcome: "no-request" };

  const stagedStep = readText(stepPath);
  // Read the current model.py up front: it is BOTH the poison-code signal for classifyStaged AND the backup a
  // failed/regressed heal restores. (May be absent -> null; a null currentCode simply disables the poison path.)
  let priorCode = null;
  try { priorCode = readText(pyPath); } catch { priorCode = null; }
  const cls = classifyStaged(request, stagedStep, { emitPrimitive: deps.emitPrimitive, emitFeature: deps.emitFeature, curvedCheck, currentCode: priorCode, validateCode: deps.validateCode });
  if (!cls.candidate) return { outcome: cls.reason, stagedDeltaPct: cls.staged.deltaPct ?? null };
  if (!write) return { outcome: "would-heal", mode: cls.reason, stagedDeltaPct: cls.staged.deltaPct, shape: cls.shape, request };

  try {
    // 1. overwrite the (stale/fragile) model.py with the current deterministic emit
    writeFileSync(pyPath, cls.code, "utf8");
    // 2. refresh the equation-based parametric sidecar (additive; never break the heal over it)
    try {
      if (hasTemplate(cls.shape)) {
        const params = paramsFromDims(cls.shape, cls.dimsMm);
        const pcode = renderParametricScript(cls.shape, params);
        if (pcode) {
          writeFileSync(path.join(dir, "model.parametric.py"), pcode, "utf8");
          writeFileSync(path.join(dir, "params.json"), JSON.stringify(templateSpec(cls.shape, params), null, 2), "utf8");
        }
      }
    } catch { /* sidecar is additive */ }
    // 3. re-execute cadquery in place -> fresh model.step
    const ex = execCadquery(dir);
    if (!ex.ok) {
      // restore the prior model.py so a failed heal never leaves fresh code beside a stale STEP (code/step
      // divergence -- arm-A/C scrutiny 2026-07-05). The gen stays a consistent still-failing candidate. If there
      // was NO prior model.py (corrupt/partial stage -> priorCode null), REMOVE the freshly-written one instead,
      // so the dir is never left with fresh-code-beside-stale-step either (arm-A P2 2026-07-05).
      if (priorCode != null) { try { writeFileSync(pyPath, priorCode, "utf8"); } catch { /* best-effort */ } }
      else { try { rm(pyPath, { force: true }); } catch { /* best-effort */ } }
      return { outcome: "exec-failed", reason: ex.reason, beforeDeltaPct: cls.staged.deltaPct };
    }
    // 4. re-measure the fresh geometry
    const freshStep = readText(stepPath);
    const after = curvedCheck(request, freshStep);
    // 4b. REGRESSION GUARD: a poison-code heal starts from an ALREADY-ACCURATE part (wasAccurate). If the fresh
    // deterministic emit is NOT accurate on the MEASURED dims (curvedDimCheck verifies diameter + isolable axial
    // length), we would be trading a dimensionally-correct part for a clean-but-wrong one -- REVERT to the prior
    // code + step and surface it (R12). NOTE the trust boundary: curvedDimCheck cannot see a tube's bore/ID or a
    // feature the emitFeature path re-derives, so the poison-heal trusts the deterministic emitter's parse of
    // those (the emitter is the inference-time generator for these parts, so its parse IS the ground truth; a
    // parse defect there is a separate emitter bug, out of scope here). (A dimensional heal, wasAccurate=false,
    // keeps the fresh code -- the part was already wrong.)
    if (!after.accurate && cls.wasAccurate) {
      // revert to the prior correct code AND re-exec to restore its accurate step. If that re-exec fails, the
      // prior model.py no longer matches the (fresh, wrong) model.step -- surface that divergence distinctly
      // instead of falsely reporting a clean revert (arm-A P2 2026-07-05, R12).
      let revertOk = false;
      if (priorCode != null) { try { writeFileSync(pyPath, priorCode, "utf8"); revertOk = !!(execCadquery(dir) || {}).ok; } catch { revertOk = false; } }
      return { outcome: revertOk ? "regressed-restored" : "regress-restore-failed", mode: cls.reason, reason: revertOk ? "poison-heal made an accurate part inaccurate; reverted to the correct prior code" : "poison-heal regressed AND the revert re-exec failed -- model.py/model.step may diverge, inspect this dir", beforeDeltaPct: cls.staged.deltaPct, afterDeltaPct: after.deltaPct, shape: cls.shape, request };
    }
    // 5. stamp heal provenance on status.json (honest: mark healed + before/after + mode, never hide it)
    try {
      let status = {}; try { status = JSON.parse(readText(path.join(dir, "status.json"))); } catch { /* fresh */ }
      status.curvedDim = after;
      status.healed = { by: "cad-regen-stale-gens", mode: cls.reason, beforeDeltaPct: cls.staged.deltaPct, afterDeltaPct: after.deltaPct, accurate: !!after.accurate };
      writeFileSync(path.join(dir, "status.json"), JSON.stringify(status, null, 2), "utf8");
    } catch { /* provenance stamp is best-effort */ }
    // 6. stamp request.json.via so the training lane labels the now-deterministic part correctly: a healed part
    // is deterministic-emitter output, never LLM -- so --llm-only excludes it, matching inference reality (the
    // emitter, not the LLM, generates these at run time). Only on a verified-accurate heal.
    if (after.accurate) {
      try {
        const rj = JSON.parse(readText(reqPath));
        if (rj && typeof rj === "object") { rj.via = cls.via || "deterministic-primitive"; writeFileSync(reqPath, JSON.stringify(rj, null, 2), "utf8"); }
      } catch { /* via stamp is best-effort */ }
    }
    return { outcome: after.accurate ? "healed" : "still-failing", mode: cls.reason, beforeDeltaPct: cls.staged.deltaPct, afterDeltaPct: after.deltaPct, shape: cls.shape, request };
  } catch (e) {
    return { outcome: "error", reason: String(e && e.message ? e.message : e) };
  }
}

const OUTCOMES = ["no-request", "no-step", "not-curved-checkable", "already-ok", "not-deterministic", "featured-primitive-refused", "emit-also-poison", "would-heal", "healed", "still-failing", "regressed-restored", "regress-restore-failed", "exec-failed", "skipped-fresh", "error"];
const FRESH_MS = 15_000; // skip a gen whose STEP was written in the last 15s -- the concurrent gen loop may be mid-write

function main() {
  const write = process.argv.includes("--write");
  const limArg = process.argv.indexOf("--limit");
  const limit = limArg >= 0 ? Number(process.argv[limArg + 1]) : 0;
  if (!fs.existsSync(GEN_DIR)) { console.error(`[regen-stale] no gen dir: ${GEN_DIR}`); process.exit(1); }
  // Preflight (--write only): a python/cadquery-down env must fail LOUD, never silently rewrite model.py files
  // with no execution (arm-C scrutiny). Dry runs need no python (emit + measure only).
  if (write && !cadqueryAvailable()) { console.error(`[regen-stale] cadquery NOT importable via ${PYTHON} -- aborting --write (would rewrite model.py with no re-exec). Fix the python env and retry.`); process.exit(1); }
  const tally = Object.fromEntries(OUTCOMES.map((o) => [o, 0]));
  const healedRows = [], stillFailing = [], wouldHealRows = [];
  let dirs = fs.readdirSync(GEN_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  let processed = 0;
  const now = Date.now();
  for (const slug of dirs) {
    const dir = path.join(GEN_DIR, slug);
    // Concurrent-write guard: the append-only "PRISM CAD Gen Loop" may be writing a fresh gen right now; skip a
    // dir whose STEP was touched in the last FRESH_MS so the in-place heal never races a non-atomic write (arm-C).
    if (write) { try { const st = fs.statSync(path.join(dir, "model.step")); if (now - st.mtimeMs < FRESH_MS) { tally["skipped-fresh"]++; continue; } } catch { /* no step -> healOneGen returns no-step */ } }
    // In --write mode, only spend a cadquery execution on real candidates; cap by --limit on HEALS, not scans.
    const r = healOneGen(dir, { write });
    tally[r.outcome] = (tally[r.outcome] || 0) + 1;
    if (r.outcome === "healed") healedRows.push({ slug, before: r.beforeDeltaPct, after: r.afterDeltaPct, mode: r.mode });
    if (r.outcome === "would-heal") wouldHealRows.push({ mode: r.mode });
    if (r.outcome === "still-failing") stillFailing.push({ slug, before: r.beforeDeltaPct, after: r.afterDeltaPct });
    if (write && (r.outcome === "healed" || r.outcome === "still-failing" || r.outcome === "regressed-restored" || r.outcome === "regress-restore-failed" || r.outcome === "exec-failed")) {
      processed++;
      if (limit > 0 && processed >= limit) { console.error(`[regen-stale] --limit ${limit} reached; stopping (more candidates remain)`); break; }
    }
  }
  const verb = write ? "healed" : "would heal";
  // split the heal count by mode so the poison-code heals (dimensionally-correct parts freed from the LoRA
  // poison-guard) are visible next to the dimensional heals (wrong geometry corrected).
  // split by mode: healed rows in --write, would-heal candidates in dry mode (so the breakdown shows either way).
  const modeRows = write ? healedRows : wouldHealRows;
  const healedDim = modeRows.filter((h) => h.mode === "stale-failing-deterministic").length;
  const healedPoison = modeRows.filter((h) => h.mode === "poison-code-clean-emit").length;
  console.log(`[regen-stale] ${verb}=${write ? tally.healed : tally["would-heal"]} (dim=${healedDim} poison-code=${healedPoison})  still-failing=${tally["still-failing"]}  regressed-restored=${tally["regressed-restored"]}  regress-restore-failed=${tally["regress-restore-failed"]}  exec-failed=${tally["exec-failed"]}  already-ok=${tally["already-ok"]}  emit-also-poison=${tally["emit-also-poison"]}  not-deterministic=${tally["not-deterministic"]}  featured-refused=${tally["featured-primitive-refused"]}  skipped-fresh=${tally["skipped-fresh"]}  not-curved=${tally["not-curved-checkable"]}`);
  if (healedRows.length) { console.log(`  HEALED (first 12, mode | deltaPct before->after):`); for (const h of healedRows.slice(0, 12)) console.log(`    ${h.mode === "poison-code-clean-emit" ? "poison" : "dim"} | ${h.before}% -> ${h.after}%  ${h.slug.slice(0, 46)}`); }
  if (stillFailing.length) { console.log(`  STILL FAILING after regen (first 12) -- surface, do NOT hide (R12):`); for (const h of stillFailing.slice(0, 12)) console.log(`    ${h.before}% -> ${h.after}%  ${h.slug.slice(0, 46)}`); }
  if (tally["regressed-restored"]) console.log(`  REGRESSED-RESTORED=${tally["regressed-restored"]} -- a poison-heal would have made an accurate part inaccurate; reverted (R12)`);
  if (tally["regress-restore-failed"]) console.error(`  REGRESS-RESTORE-FAILED=${tally["regress-restore-failed"]} -- a regressed heal's revert re-exec FAILED; model.py/model.step may diverge -- INSPECT these dirs (R12)`);
  if (!write && tally["would-heal"]) console.log(`  dry run -- pass --write to regenerate in place, then re-run scripts/cad-generation-quality-report.mjs to prove the rise`);
}

if (process.argv[1] && path.resolve(process.argv[1]).replace(/\\/g, "/").endsWith("cad-regen-stale-gens.mjs")) main();
