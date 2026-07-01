/**
 * cad-validation-50-driver.mjs -- U-VALIDATION-50-LIVE-RUN (slot:delta, CAD-COMPLETION T2)
 *
 * Thin, importable driver for the CAD draw/regen validation harness
 * (CADDrawAnyPartValidationHarnessEngine). It loads the JM-Die validation
 * corpus, runs the harness against the selected orchestrator, and emits a
 * machine-readable JSON verdict + optional markdown.
 *
 * WHY this exists (gate-integrity, R12): the T2 gate detector
 * (scripts/cad-completion-reconcile.mjs:136, artifactExists) flips T2
 * PENDING->SHIPPED on mere FILE EXISTENCE of a
 * state/shared/specs/cad-validation-50-*.json (content never read). So a naive
 * runner that writes that filename from a 12-case STUB run would FALSELY mark
 * T2 SHIPPED. This driver refuses to do that: it writes the gate-probed
 * filename ONLY when the run is genuinely gate-worthy (orchestrator==='live'
 * AND isFull (>= target cases) AND passedGate); otherwise it writes a
 * NON-probed baseline filename that does NOT flip the gate. decideArtifact()
 * is the pure heart of that honesty and is unit-tested.
 *
 * Orchestrator modes: 'live' (real hyperCAD-S seat -- the only mode that yields
 * a REAL number; headless yields MOCK), 'mock' (live bridge mock-codegen path --
 * wiring proof, MOCK accuracy), 'stub' (legacy deterministic profile, NEVER
 * gate-worthy). See U-VALIDATION-50-LIVE-RUN-BUILD-SPEC.md.
 *
 * Pure exports (unit-tested, no I/O): parseArgs, clampGate, decideArtifact,
 * buildResultJson, summarizeDomains. The I/O wrapper runValidation50()
 * tsx-imports the harness+corpus (Node-24 .ts dynamic-import safe under tsx).
 *
 * Refs: CADDrawAnyPartValidationHarnessEngine (validate/ValidationReport),
 *       cad-validation-corpus.ts (JM_DIE_VALIDATION_CORPUS), cad-completion-reconcile.mjs (gate).
 */

import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

// -- Constants (gate policy -- not physics; safe to define here) --------------
export const VALIDATION_TARGET_CASES = 50; // the "validation-50" target; corpus < this => isFull:false
export const MILESTONE = "CAD-DRAW-MAX-MS1";
export const UNIT = "U-VALIDATION-50-LIVE-RUN";
export const DEFAULT_GATE = 0.70; // mirrors CADDrawAnyPartValidationHarnessEngine.DEFAULT_ACCURACY_GATE
export const SPECS_DIR = "state/shared/specs"; // gate-probed dir
export const BASELINE_DIR = "state/shared"; // non-probed dir (does NOT flip the gate)
const VALID_ORCHESTRATORS = new Set(["live", "mock", "stub"]);
const VALID_DOMAINS = new Set(["mill", "lathe", "wedm", "all"]);

/** Clamp an accuracy gate to [0,1]; non-finite/absent -> default. (Mirrors engine clampAccuracyGate.) */
export function clampGate(g, def = DEFAULT_GATE) {
  if (g === null || g === undefined) return def;
  const n = Number(g);
  if (!Number.isFinite(n)) return def;
  return Math.max(0, Math.min(1, n));
}

/** Parse CLI argv into a normalized opts object. Pure. */
export function parseArgs(argv = []) {
  const get = (name, def) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && i + 1 < argv.length && !String(argv[i + 1]).startsWith("--") ? argv[i + 1] : def;
  };
  const has = (name) => argv.includes(`--${name}`);
  const orchestratorRaw = String(get("orchestrator", "live"));
  const domainRaw = String(get("domain", "all"));
  const targetRaw = get("target", undefined);
  return {
    orchestrator: VALID_ORCHESTRATORS.has(orchestratorRaw) ? orchestratorRaw : "live",
    domain: VALID_DOMAINS.has(domainRaw) ? domainRaw : "all",
    gate: clampGate(get("gate", undefined)),
    out: get("out", undefined),       // explicit output path (cannot game the gate -- see runValidation50)
    stdout: has("json"),              // echo JSON to stdout, write nothing
    target: Number.isFinite(Number(targetRaw)) ? Math.max(1, Math.floor(Number(targetRaw))) : VALIDATION_TARGET_CASES,
  };
}

/**
 * THE honesty gate (pure, unit-tested). Decide whether a run is gate-worthy and
 * therefore allowed to write the gate-PROBED filename that flips T2. A run is
 * gate-worthy IFF it used the REAL live seat AND ran the full target corpus AND
 * passed the accuracy gate. Anything else (stub/mock orchestrator, < target
 * cases, below gate) writes a NON-probed baseline name the reconciler ignores.
 *
 * @returns {{gateEligible:boolean, dir:string, fileName:string, reason:string}}
 */
export function decideArtifact({ report, orchestrator, corpusSize, target = VALIDATION_TARGET_CASES, nowIso }) {
  const ts = (nowIso || (report && report.ranAtIso) || "").replace(/[:.]/g, "-") || "unknown";
  const isFull = Number(corpusSize) >= Number(target);
  const passedGate = !!(report && report.passedGate);
  const isLive = orchestrator === "live";
  const gateEligible = isLive && isFull && passedGate;
  if (gateEligible) {
    return {
      gateEligible: true,
      dir: SPECS_DIR,
      fileName: `cad-validation-50-${ts}.json`,
      reason: `gate-worthy: live seat + full corpus (${corpusSize}>=${target}) + passedGate`,
    };
  }
  const why = [];
  if (!isLive) why.push(`orchestrator='${orchestrator}' (not live)`);
  if (!isFull) why.push(`corpus ${corpusSize}<${target} (not full)`);
  if (!passedGate) why.push("below gate / 0 cases");
  return {
    gateEligible: false,
    dir: BASELINE_DIR,
    fileName: `${MILESTONE}-BASELINE-${ts}.json`,
    reason: `NOT gate-worthy (does not flip T2): ${why.join("; ")}`,
  };
}

/**
 * Does a path target the reconciler's gate-PROBED artifact (would flip T2)? Pure.
 * Mirrors the cad-completion-reconcile.mjs:46 probe fragments. Used to stop `--out`
 * from being a gaming bypass: a non-gate-worthy run may never land at such a name.
 */
export function isGateProbedPath(p) {
  const base = String(p || "").replace(/\\/g, "/").split("/").pop().toLowerCase();
  return base.endsWith(".json") && (base.includes("cad-validation-50") || base.includes("cad-train-test-result"));
}

/** Infer the domain from a case id prefix (the corpus tags ids MILL-/LATHE-/WEDM-). Pure. */
export function inferDomain(id) {
  const s = String(id || "").toUpperCase();
  if (s.startsWith("MILL")) return "mill";
  if (s.startsWith("LATHE")) return "lathe";
  if (s.startsWith("WEDM") || s.startsWith("WIRE")) return "wedm";
  return "unknown";
}

/** Per-domain pass/total rollup from per-case verdicts (each verdict may carry a `domain`). Pure. */
export function summarizeDomains(verdicts = []) {
  const acc = {};
  for (const v of verdicts) {
    const d = v && typeof v.domain === "string" ? v.domain : "unknown";
    acc[d] = acc[d] || { passed: 0, total: 0 };
    acc[d].total += 1;
    if (v && v.verdict === "pass") acc[d].passed += 1;
  }
  for (const d of Object.keys(acc)) acc[d].accuracy = acc[d].total === 0 ? 0 : acc[d].passed / acc[d].total;
  return acc;
}

/**
 * Shape the honest result JSON from a ValidationReport + run metadata. Pure.
 * Field names mirror ValidationReport (aggregateReport) -- none invented.
 * `gameableGate:false` + the `corpus.isFull` flag are the structural anti-gaming stamps.
 */
export function buildResultJson(report, { orchestrator, corpusSize, target = VALIDATION_TARGET_CASES, corpusVersion = null, gateEligible } = {}) {
  const cases = (report && Array.isArray(report.cases)) ? report.cases : [];
  const errored = cases.filter((c) => c && c.stopReason === "exception").length;
  // Map verdicts first (resolving domain from the case's own field or its id prefix) so the
  // perDomain rollup is meaningful even when the harness verdict carries no domain tag.
  const mappedVerdicts = cases.map((c) => ({
    id: c.id, domain: c.domain ?? inferDomain(c.id), verdict: c.verdict, exported: c.exported,
    iterations: c.iterations, stopReason: c.stopReason, reason: c.reason, error: c.error ?? null,
  }));
  return {
    schemaVersion: 1,
    milestone: MILESTONE,
    unit: UNIT,
    ranAtIso: (report && report.ranAtIso) || null,
    orchestrator,
    corpus: {
      id: "jm-die",
      size: Number(corpusSize) || 0,
      target,
      isFull: (Number(corpusSize) || 0) >= target,
      version: corpusVersion,
    },
    gate: report ? report.gate : null,
    accuracy: report ? report.accuracy : 0,
    passedGate: !!(report && report.passedGate),
    gateEligible: !!gateEligible, // true only if this artifact legitimately flips T2
    gameableGate: false,          // structural marker: this driver never games the existence-only detector
    totals: {
      total: report ? report.totalCount : 0,
      passed: report ? report.passedCount : 0,
      failed: report ? report.failedCount : 0,
      errored,
    },
    perDomain: summarizeDomains(mappedVerdicts),
    verdicts: mappedVerdicts,
    provenance: {
      driver: "scripts/lib/cad-validation-50-driver.mjs",
      harness: "cadDrawAnyPartValidationHarnessEngine",
      note: "headless live=MOCK unless the hyperCAD-S seat is up; stub/mock never gate-eligible",
    },
  };
}

/**
 * I/O wrapper: load corpus + harness (via .ts imports -- caller must run under tsx/Node with TS support),
 * run validate(), decide the honest artifact, write it. Fail-loud. Returns the result object.
 * orchestrator 'stub' injects a deterministic all-export stub (legacy reproducible profile).
 * `deps` is an injection seam for hermetic tests.
 */
export async function runValidation50(opts = {}, deps = {}) {
  const { orchestrator = "live", domain = "all", gate = DEFAULT_GATE, target = VALIDATION_TARGET_CASES, repoRoot = process.cwd() } = opts;
  const loadCorpus = deps.loadCorpus || (async () => {
    const m = await import("../../mcp-server/src/data/cad-validation-corpus.ts");
    const all = m.JM_DIE_VALIDATION_CORPUS || [];
    const byDomain = typeof m.corpusByDomain === "function" && domain !== "all" ? m.corpusByDomain(domain) : all;
    return { cases: byDomain, version: m.JM_DIE_CORPUS_VERSION ?? null };
  });
  const loadHarness = deps.loadHarness || (async () => {
    const m = await import("../../mcp-server/src/engines/CADDrawAnyPartValidationHarnessEngine.ts");
    return m.cadDrawAnyPartValidationHarnessEngine;
  });
  const resolveOrchestrator = deps.resolveOrchestrator || (async (mode) => {
    if (mode === "stub") {
      return { drawAnyPart: async () => ({ exportedSuccessfully: true, stopReason: "exported", iterations: 1, opLog: ["stub"] }) };
    }
    const m = await import("../../mcp-server/src/engines/CADDrawAnyPartOrchestratorEngine.ts");
    return m.cadDrawAnyPartOrchestratorEngine;
  });

  const { cases, version } = await loadCorpus();
  if (!Array.isArray(cases)) throw new TypeError("runValidation50: corpus did not return an array of cases");
  const harness = await loadHarness();
  const orch = await resolveOrchestrator(orchestrator);
  const report = await harness.validate(cases, { gate: clampGate(gate), orchestrator: orch });

  const decision = decideArtifact({ report, orchestrator, corpusSize: cases.length, target });
  const json = buildResultJson(report, { orchestrator, corpusSize: cases.length, target, corpusVersion: version, gateEligible: decision.gateEligible });

  if (!opts.stdout) {
    let relDir, file;
    let override = null;
    if (opts.out) {
      // Resolve the requested target against repoRoot (collapses .. and absolute paths).
      const repoAbs = path.resolve(repoRoot);
      const target = path.resolve(repoAbs, opts.out);
      const inside = target === repoAbs || target.startsWith(repoAbs + path.sep);
      // Two guards, unified: (1) ANTI-GAMING -- a non-gate-worthy run may NOT write a gate-probed
      // filename (would flip the existence-only T2 detector); (2) CONTAINMENT -- --out may not escape
      // repoRoot (path-traversal footgun). Either -> redirect to the honest in-repo baseline.
      if (!inside) {
        override = `--out '${opts.out}' escaped repoRoot`;
      } else if (!decision.gateEligible && isGateProbedPath(opts.out)) {
        override = `--out '${opts.out}' would game the gate (non-gate-worthy run -> gate-probed name)`;
      }
      if (override) {
        relDir = decision.dir;
        file = decision.fileName;
      } else {
        relDir = path.relative(repoAbs, path.dirname(target)) || ".";
        file = path.basename(target);
      }
    } else {
      relDir = decision.dir;
      file = decision.fileName;
    }
    const absDir = path.join(repoRoot, relDir);
    fs.mkdirSync(absDir, { recursive: true });
    fs.writeFileSync(path.join(absDir, file), JSON.stringify(json, null, 2) + "\n");
    json.__writtenTo = path.join(relDir, file).replace(/\\/g, "/");
    json.__decision = decision.reason;
    if (override) json.__outOverridden = `${override} -> redirected to ${json.__writtenTo}`;
  }
  return json;
}

// -- CLI entry (MUST run under tsx: corpus/harness imports are .ts) ------------
// e.g.  npx tsx scripts/lib/cad-validation-50-driver.mjs --orchestrator stub --json
// The guard is isMain-gated so importing this module (tests, other consumers) never triggers it.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // tsx self-reexec: the corpus/harness imports are .ts. Under plain `node` (Node-24 type-strip does
  // NOT rewrite a .js specifier to its .ts sibling in a dynamic import), re-launch once under tsx.
  // PRISM_VAL50_REEXEC breaks the loop. (Mirrors nn-graph-retrain-lifecycle.mjs / the 2026-06-22 charlie fix.)
  const underTsx = process.execArgv.some((a) => a.includes("tsx")) ||
    Object.keys(process.env).some((k) => k === "TSX" || k.startsWith("TSX_")) ||
    /[\\/](tsx|esbuild)[\\/]/.test(process.env._ ?? "");
  if (!underTsx && process.env.PRISM_VAL50_REEXEC !== "1") {
    const { spawnSync } = await import("node:child_process");
    const r = spawnSync("npx", ["tsx", process.argv[1], ...process.argv.slice(2)], {
      stdio: "inherit", env: { ...process.env, PRISM_VAL50_REEXEC: "1" }, shell: process.platform === "win32",
    });
    process.exit(typeof r.status === "number" ? r.status : 2);
  }
  const opts = parseArgs(process.argv.slice(2));
  runValidation50(opts)
    .then((j) => {
      if (opts.stdout) {
        process.stdout.write(JSON.stringify(j, null, 2) + "\n");
      } else {
        process.stdout.write(
          `[cad-validation-50] ${j.__decision}\n  wrote: ${j.__writtenTo}\n` +
          `  orchestrator=${j.orchestrator} accuracy=${j.accuracy} passedGate=${j.passedGate} ` +
          `gateEligible=${j.gateEligible} corpus=${j.corpus.size}/${j.corpus.target} isFull=${j.corpus.isFull}\n`,
        );
      }
      process.exit(j.passedGate ? 0 : 1);
    })
    .catch((e) => {
      process.stderr.write(`[cad-validation-50] FAILED: ${e && e.message ? e.message : String(e)}\n`);
      process.exit(2);
    });
}
