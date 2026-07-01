#!/usr/bin/env node
/**
 * romeo-wiring-triage.mjs -- the romeo (wiring-specialist) autonomous-loop harness.
 *
 * Turns the raw UNWIRED-ENGINE-AUDIT into a ROI-ranked, romeo-actionable wiring queue:
 *   1. read the freshest UNWIRED-ENGINE-AUDIT-*.json (54 unwired engines as of 2026-06-14),
 *   2. resolve each engine's NATURAL dispatcher home (the audit leaves many "UNKNOWN"),
 *   3. flag likely-WIRE-EXEMPT internal-layer engines (Adapter/Bridge/Client/Test/Shim/
 *      Bootstrap/Criterion/Refiner suffixes -- consumed by another engine, NOT a dispatcher
 *      action; romeo's soul REFUSES wiring an engine that throws-on-every-call or is a pure
 *      internal layer), and CROSS-DOMAIN engines whose owner slot should decide,
 *   4. ROI-rank: a clean wiring candidate = substantive `*Engine` + a single clear dispatcher
 *      home + not-exempt + not-cross-domain. Those float to the top of the queue,
 *   5. emit `state/shared/ROMEO-WIRING-QUEUE.md` -- the pick-list `/checkin-romeo /loop` consumes.
 *
 * Deterministic core (R5: classification by keyword is a pure transform, not a model). The
 * `--ollama` flag adds a one-line natural-language wiring hint per top candidate via the local
 * model (the judgment-call layer), keeping token-heavy work off the Claude context.
 *
 * Usage:
 *   node scripts/romeo-wiring-triage.mjs            # emit the ranked queue (deterministic)
 *   node scripts/romeo-wiring-triage.mjs --ollama   # + Ollama wiring hint per top-10 candidate
 *   node scripts/romeo-wiring-triage.mjs --json      # machine-readable
 *
 * MAIN-vs-slot hazard ([[feedback_romeo_check_main_not_slot_for_dormancy]]): the audit MUST be
 * generated from the MAIN tree (H:/prism on cad-fusion-live-ms0), NOT the slot worktree
 * (H:/prism-slot-romeo, ~3000 commits behind) -- a stale slot makes already-wired engines look
 * unwired. This script reads the audit + engine sources relative to its OWN location, so run it
 * from H:/prism/scripts (MAIN). Refresh the audit first: `node scripts/audit-unwired-engines.mjs`.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const __dir = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dir, "..");
const SHARED = resolve(REPO, "state", "shared");
const ENGINES_DIR = resolve(REPO, "mcp-server", "src", "engines");
const DISPATCHERS_DIR = resolve(REPO, "mcp-server", "src", "tools", "dispatchers");
const OUT_MD = resolve(SHARED, "ROMEO-WIRING-QUEUE.md");

/** A clean romeo wire needs a ZERO-ARG exported singleton (the dispatcher imports the singleton
 *  and calls a method). An engine whose only constructor takes required args is dependency-injected
 *  -- NOT a clean singleton wire; romeo's soul refuses "wiring-an-engine-that-throws-on-every-call",
 *  and a DI engine throws/misbehaves when a dispatcher news it with no deps. Returns
 *  {singleton, ctorArgs} read straight from the engine source. */
/** Extract the balanced (...) parameter list following the FIRST `constructor(`.
 *  Uses paren-depth matching (NOT `[^)]*`) so a `)` inside a param TYPE -- e.g.
 *  `cb: () => void` -- or a multi-line object param does not truncate the capture.
 *  Returns the raw inner string, or null if no constructor / unbalanced. */
export function extractCtorParamList(src) {
  const ci = src.search(/\bconstructor\s*\(/);
  if (ci < 0) return null;
  const open = src.indexOf("(", ci);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === "(") depth++;
    else if (ch === ")") { depth--; if (depth === 0) return src.slice(open + 1, i); }
  }
  return null; // unbalanced -- treat as no readable signature
}

/** Split a parameter string on TOP-LEVEL commas only, tracking depth across
 *  () [] {} (NOT <> -- `>` is overloaded by `=>` / comparisons; ignoring angle
 *  brackets at worst OVER-counts a generic-with-internal-comma param, which is
 *  the FAIL-SAFE direction here: more required args => NEEDS-REVIEW, never a
 *  false WIREABLE). Object params use `;` between fields so they never split. */
export function splitTopLevelCommas(s) {
  const out = []; let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
    if (ch === "," && depth === 0) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

/** A ctor param is OPTIONAL iff its NAME (before the first top-level `:`) ends
 *  with `?`, OR it carries a top-level `=` default. A `?`/`=` INSIDE the type
 *  annotation (e.g. an optional FIELD `clock?: T` of an object param, or `=>`)
 *  must NOT count -- that was the bug that mis-read NXOpen's required `opts`
 *  object (whose fields include `clock?`) as optional => ctorArgs 0 => WIREABLE. */
export function isOptionalCtorParam(param) {
  let depth = 0, nameEnd = -1;
  for (let i = 0; i < param.length; i++) {
    const ch = param[i];
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
    else if (depth === 0 && ch === ":") { nameEnd = i; break; }
  }
  const name = (nameEnd >= 0 ? param.slice(0, nameEnd) : param).trim();
  if (name.endsWith("?")) return true;
  // top-level `=` default (skip `=>`, `==`, `>=`, `<=`, `!=`; `=` is overloaded)
  let d = 0;
  for (let i = 0; i < param.length; i++) {
    const ch = param[i];
    if (ch === "(" || ch === "[" || ch === "{") d++;
    else if (ch === ")" || ch === "]" || ch === "}") d--;
    else if (d === 0 && ch === "=") {
      const next = param[i + 1], prev = param[i - 1];
      if (next !== "=" && next !== ">" && prev !== "=" && prev !== "!" && prev !== "<" && prev !== ">") return true;
    }
  }
  return false;
}

/** Count REQUIRED constructor args (no trailing-`?` name, no top-level default). */
export function countRequiredCtorArgs(src) {
  const list = extractCtorParamList(src);
  if (list == null || !list.trim()) return 0;
  return splitTopLevelCommas(list).filter((p) => !isOptionalCtorParam(p)).length;
}

export function engineConstructability(engineName) {
  const path = resolve(ENGINES_DIR, engineName + ".ts");
  let src = null;
  // Bounded retry: under fleet FS contention (many concurrent slots) readFileSync can transiently
  // throw EMFILE/EBUSY. Retry a few times with a short sync backoff. A genuine ENOENT (missing
  // file) is NOT retried -- it is a real "no source" signal. The CALLER fails CLOSED on
  // notReadable (never promotes an unverifiable engine to WIREABLE -- the fail-OPEN bug fixed
  // 2026-06-14, scrutiny arm-A P1).
  for (let attempt = 0; attempt < READ_RETRIES; attempt++) {
    try { src = readFileSync(path, "utf8"); break; }
    catch (e) {
      if (e && e.code === "ENOENT") return { found: false, notReadable: false, singleton: false, ctorArgs: null };
      if (attempt < READ_RETRIES - 1) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, READ_RETRY_MS);
    }
  }
  if (src == null) return { found: false, notReadable: true, singleton: false, ctorArgs: null };
  // exported singleton: `export const fooEngine = new FooEngine(...)`
  const singleton = new RegExp(`export\\s+const\\s+\\w+\\s*[:=][^\\n]*new\\s+${engineName}\\b`).test(src)
    || new RegExp(`export\\s+const\\s+\\w+\\s*=\\s*new\\s+${engineName}\\b`).test(src);
  // constructor signature -> count REQUIRED args via balanced extraction + top-level
  // comma split + name-level optionality. The old `match(/constructor\(([^)]*)\)/)` +
  // `split(",")` + `/[?=]/` filter mis-read an object/multi-line ctor: object fields
  // are `;`-separated (never split) and an optional FIELD's `?` (e.g. `clock?`) made
  // the whole REQUIRED `opts` param look optional => ctorArgs 0 => false WIREABLE
  // (NXOpenAssemblyDrawingEngine, a DI engine, was wrongly ranked WIREABLE).
  const ctorArgs = countRequiredCtorArgs(src);
  return { found: true, notReadable: false, singleton, ctorArgs };
}

/** A dispatcher target is real only if its file exists. prism_<x> -> <x>Dispatcher.ts (+ aliases). */
const DISPATCHER_FILE_CACHE = new Map();
export function dispatcherExists(disp) {
  if (!disp || /UNKNOWN/i.test(disp)) return false;
  if (DISPATCHER_FILE_CACHE.has(disp)) return DISPATCHER_FILE_CACHE.get(disp);
  const stem = disp.replace(/^prism_/, "").toLowerCase();
  let files;
  try { files = readdirSync(DISPATCHERS_DIR); } catch { files = []; }
  // Exact stem match: `<stem>dispatcher.ts` (camelCase lowercased), not a loose startsWith that
  // could false-match a longer dispatcher name (arm-A P2). e.g. prism_cad -> caddispatcher.ts.
  const hit = files.some((f) => f.toLowerCase() === `${stem}dispatcher.ts`);
  DISPATCHER_FILE_CACHE.set(disp, hit);
  return hit;
}

// Detect an engine a dispatcher ALREADY routes to -- an audit FALSE-NEGATIVE. The
// audit (audit-unwired-engines.mjs, tango's) lists an engine UNWIRED when it cannot
// see the wiring; an engine wired via a `*Dispatch` WRAPPER-EXPORT -- e.g.
// aiReasoningDispatcher routes xproc_autofire_* -> import(".../XProcNeuralAutoFireEngine.js")
// .xProcNeuralAutoFireDispatch -- slips past it, so it pollutes romeo's queue as a phantom
// candidate (double-wire risk). We match the engine's SOURCE import (`<Engine>.js`) in a
// COMMENT-STRIPPED dispatcher corpus, so a `// Skipped: FooEngine` note (reactiveChainBootstrap)
// is NEVER counted as wired.
/** Strip block then line comments (preserving `://` so URLs are not mangled) so a
 *  commented-out import / "skipped" note never counts as a live wire. Exported for
 *  direct unit-testing of the strip itself. */
export function stripDispatcherComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}
let _dispCorpus = null;
function dispatcherCorpus() {
  if (_dispCorpus != null) return _dispCorpus;
  let files;
  try { files = readdirSync(DISPATCHERS_DIR).filter((f) => f.endsWith(".ts")); } catch { files = []; }
  const parts = [];
  for (const f of files) {
    let src;
    try { src = readFileSync(resolve(DISPATCHERS_DIR, f), "utf8"); } catch { continue; }
    parts.push(stripDispatcherComments(src));
  }
  _dispCorpus = parts.join("\n");
  return _dispCorpus;
}
export function alreadyDispatcherWired(engineName, corpus = dispatcherCorpus()) {
  // BOUNDARY-ANCHORED: require a path-separator/quote immediately before the name so a
  // strict SUFFIX cannot false-positive -- e.g. "FooEngine" must NOT match inside a wired
  // "SuperFooEngine.js" (a false-positive would silently HIDE a real romeo wire, the
  // dangerous direction; scrutiny arm-C P1). Engines are imported as `import(".../<Engine>.js")`,
  // so the char before the name is always `/` or a quote. `corpus` is injectable for testing.
  const esc = engineName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`[/"'\`]${esc}\\.js\\b`).test(corpus);
}

// Tunables (named per anti-magic-number convention).
const OLLAMA_TOP_N = 10;       // enrich only the top-N WIREABLE candidates with an Ollama hint
const OLLAMA_TIMEOUT_MS = 60000;
const SUBSTANTIVE_MIN_KB = 5;  // below this an engine is likely a thin stub
const SUBSTANTIVE_MAX_KB = 60; // above this the wiring surface is large
const HINT_MAX_LEN = 160;
const READ_RETRIES = 4;        // engine-source read attempts under FS contention
const READ_RETRY_MS = 50;      // sync backoff between read retries

const useOllama = process.argv.includes("--ollama");
const asJson = process.argv.includes("--json");

/** Newest UNWIRED-ENGINE-AUDIT-*.json by filename date suffix. */
function findAudit() {
  const cands = readdirSync(SHARED).filter((f) => /^UNWIRED-ENGINE-AUDIT-.*\.json$/.test(f)).sort();
  if (!cands.length) throw new Error("no UNWIRED-ENGINE-AUDIT-*.json in state/shared -- run scripts/audit-unwired-engines.mjs first");
  return resolve(SHARED, cands[cands.length - 1]);
}

// Suffixes that signal an INTERNAL-LAYER engine (consumed by another engine, not a dispatcher
// action). Romeo refuses wiring these -- they are WIRE-EXEMPT until the owner exposes them.
// Match the internal-layer token whether it is the final suffix (Foo Adapter) OR wrapped as an
// engine (Foo AdapterEngine) -- both are consumed by another engine, not a dispatcher action.
const EXEMPT_SUFFIX = /(Adapter|Bridge|Client|TestSuite|Test|Shim|Bootstrap|Criterion|Refiner|StateMachine)(Engine)?$/;
const EXEMPT_LOWER = /(bootstrap|shim|reactivechain|cyclescheduling)/i;

// Domain keyword -> natural dispatcher. Ordered: first match wins (CAM rule before MILL because
// "HYPERMILL" contains "MILL"; turning specifics before generic).
const DOMAIN_RULES = [
  { re: /hypermill|hypercad|mastercam|catia|^cam|toolpath/i, disp: "prism_cam", owner: "kilo" },
  { re: /wedm|edm/i, disp: "prism_cam", owner: "mike" },
  { re: /turret|swiss|barremnant|lathe|turning/i, disp: "prism_turning", owner: "whiskey" },
  { re: /counterfactualmill|millprint|millprogram|^mill/i, disp: "prism_mill", owner: "foxtrot" },
  { re: /creo|catia|nx|onshape|rhino|blueprint|electrode|^cad|designtofloor/i, disp: "prism_cad", owner: "delta" },
  { re: /erp|acquisition|wetrun|business/i, disp: "prism_business", owner: "hotel" },
  { re: /mit|course|academy|transferlearning/i, disp: "prism_academy", owner: "lima" },
  { re: /speedfeed|sfc|psndecision/i, disp: "prism_calc", owner: "oscar" },
  { re: /measure|quality/i, disp: "prism_quality", owner: "golf" },
  { re: /subprogram|post|cps/i, disp: "prism_pp", owner: "echo" },
  { re: /embedding|semantic|assetindex|slotsession/i, disp: "prism_session", owner: "sierra" },
  { re: /playwright|automation/i, disp: "prism_dev", owner: "papa" },
];

// Cross-domain: engines whose OWNER slot must decide whether/how to expose (often AI-internal).
// Romeo's soul: "cross-domain-wiring-without-justification" is a refuse. Flag, don't auto-wire.
const CROSS_DOMAIN = /hermes|grok|deepseek|xproc|neural|tpe|moea|bayesian|cohort|hzpdash|attractor|lora|hyperparameter/i;

export function classify(eng, suggested) {
  const name = eng;
  // AUDIT FALSE-NEGATIVE GUARD (first, before any other verdict): if a dispatcher
  // already routes to this engine's source, it is NOT unwired -- the audit missed it
  // (e.g. wired via a *Dispatch wrapper-export). Surface it as ALREADY-WIRED so romeo
  // never double-wires it AND tango can fix the upstream audit detection.
  if (alreadyDispatcherWired(name)) {
    return { disp: null, owner: "tango", verdict: "ALREADY-WIRED", reason: "a dispatcher already routes to this engine source (audit false-negative) -- not a romeo wire; flag tango to fix audit-unwired-engines.mjs detection" };
  }
  if (EXEMPT_SUFFIX.test(name) || EXEMPT_LOWER.test(name)) {
    return { disp: null, owner: null, verdict: "WIRE-EXEMPT", reason: "internal-layer suffix (adapter/bridge/client/test/shim) -- consumed by an engine, not a dispatcher action" };
  }
  if (CROSS_DOMAIN.test(name)) {
    const m = DOMAIN_RULES.find((r) => r.re.test(name));
    return { disp: m?.disp ?? null, owner: m?.owner ?? "india", verdict: "CROSS-DOMAIN", reason: "AI/owner-internal -- owner slot decides exposure (romeo refuses cross-domain wiring w/o justification)" };
  }
  // Prefer the audit's suggestion if it's concrete; else resolve by keyword.
  const m = DOMAIN_RULES.find((r) => r.re.test(name));
  const disp = (suggested && !/UNKNOWN/i.test(suggested)) ? suggested : (m?.disp ?? null);
  if (!disp) return { disp: null, owner: m?.owner ?? null, verdict: "NEEDS-REVIEW", reason: "no clear single dispatcher home -- manual review" };
  // The target dispatcher must actually EXIST -- else the owner slot must create it first (not a
  // romeo wire). e.g. prism_academy has no dispatcher file -> MITCourse* engines are blocked on lima.
  if (!dispatcherExists(disp)) {
    return { disp, owner: m?.owner ?? null, verdict: "NEEDS-REVIEW", reason: `target dispatcher ${disp} has no dispatcher file -- owner (${m?.owner ?? "?"}) must create it first` };
  }
  // The engine must be a ZERO-ARG exported singleton -- a DI engine (required ctor args) is not a
  // clean singleton wire (romeo refuses wiring-an-engine-that-throws-on-every-call).
  const c = engineConstructability(name);
  // FAIL CLOSED: if the engine source could not be read (transient FS contention after retries),
  // we cannot verify constructability -> NEEDS-REVIEW, NEVER WIREABLE. (Promoting an unverified
  // engine to WIREABLE was the fail-OPEN bug -- scrutiny arm-A P1, fixed 2026-06-14.)
  if (c.notReadable) {
    return { disp, owner: m?.owner ?? null, verdict: "NEEDS-REVIEW", reason: `could not read engine source to verify zero-arg singleton (transient FS read failure) -- re-run` };
  }
  if (c.found && !c.singleton && c.ctorArgs > 0) {
    return { disp, owner: m?.owner ?? null, verdict: "NEEDS-REVIEW", reason: `dependency-injected (${c.ctorArgs} required ctor args, no exported singleton) -- needs a factory/wrapper before wiring` };
  }
  return { disp, owner: m?.owner ?? null, verdict: "WIREABLE", reason: `substantive zero-arg singleton with a clear, existing ${disp} home`, singleton: c.singleton };
}

/** ROI score: higher = better romeo candidate. */
function roi(c, sizeKb) {
  if (c.verdict !== "WIREABLE") return 0;
  let s = 100;
  if (sizeKb > SUBSTANTIVE_MIN_KB && sizeKb < SUBSTANTIVE_MAX_KB) s += 20; // substantive, not monolithic
  if (sizeKb >= SUBSTANTIVE_MAX_KB) s -= 10;                                // large -> more wiring surface
  if (c.disp) s += 10;
  return s;
}

function ollamaHint(eng, disp) {
  try {
    const q = `One sentence: what dispatcher action name and what single computation would expose ${eng} via ${disp}? Reply with just "action_name: <verb> <noun>".`;
    const out = execFileSync(process.execPath, [resolve(REPO, "scripts", "ask-ollama.mjs"), "ask", q], {
      cwd: REPO, timeout: OLLAMA_TIMEOUT_MS, encoding: "utf8",
    });
    return out.trim().split("\n").filter(Boolean).slice(-1)[0]?.slice(0, HINT_MAX_LEN) ?? "";
  } catch { return ""; }
}

// -- Run (guarded: executes only when invoked directly, NEVER on import. The test
//    imports classify/engineConstructability; an unguarded run would overwrite the
//    live ROMEO-WIRING-QUEUE.md at import time.) --
export function main() {
  const auditPath = findAudit();
  const audit = JSON.parse(readFileSync(auditPath, "utf8"));
  const engines = audit.unwiredEngines ?? [];

  const rows = engines.map((e) => {
    const c = classify(e.engine, e.suggestedDispatcher);
    return { engine: e.engine, sizeKb: e.size_kb ?? 0, ...c, roi: roi(c, e.size_kb ?? 0) };
  });

  const wireable = rows.filter((r) => r.verdict === "WIREABLE").sort((a, b) => b.roi - a.roi);
  const crossDomain = rows.filter((r) => r.verdict === "CROSS-DOMAIN");
  const exempt = rows.filter((r) => r.verdict === "WIRE-EXEMPT");
  const review = rows.filter((r) => r.verdict === "NEEDS-REVIEW");
  const alreadyWired = rows.filter((r) => r.verdict === "ALREADY-WIRED");

  if (useOllama) {
    for (const r of wireable.slice(0, OLLAMA_TOP_N)) r.hint = ollamaHint(r.engine, r.disp);
  }

  if (asJson) {
    console.log(JSON.stringify({ auditPath, total: rows.length, wireable, crossDomain, exempt, review, alreadyWired }, null, 2));
  } else {
    const ts = audit.generated ?? "(unknown)";
    let md = `# ROMEO WIRING QUEUE\n\n`;
    md += `> Generated by \`scripts/romeo-wiring-triage.mjs\` from \`${auditPath.split(/[\\/]/).pop()}\` (audit ${ts}).\n`;
    md += `> The ROI-ranked pick-list \`/checkin-romeo /loop\` consumes. ${rows.length} unwired engines:\n`;
    md += `> **${wireable.length} WIREABLE** (romeo) // ${crossDomain.length} cross-domain (owner decides) // ${exempt.length} likely WIRE-EXEMPT // ${review.length} needs-review // ${alreadyWired.length} already-wired (audit miss).\n\n`;
    md += `## WIREABLE -- romeo's queue (ROI-ranked, wire top-down)\n\n`;
    md += `| # | Engine | -> Dispatcher | sizeKB | ROI | Ollama hint |\n|---|--------|-------------|--------|-----|-------------|\n`;
    wireable.forEach((r, i) => {
      md += `| ${i + 1} | ${r.engine} | ${r.disp} | ${r.sizeKb} | ${r.roi} | ${r.hint ?? ""} |\n`;
    });
    md += `\n## CROSS-DOMAIN -- flag to owner slot (romeo refuses w/o justification)\n\n`;
    crossDomain.forEach((r) => { md += `- **${r.engine}** -> owner \`${r.owner}\`${r.disp ? ` (likely ${r.disp})` : ""} -- ${r.reason}\n`; });
    md += `\n## LIKELY WIRE-EXEMPT -- internal-layer (verify the consuming engine, then \`// WIRE-EXEMPT:\`)\n\n`;
    exempt.forEach((r) => { md += `- ${r.engine} -- ${r.reason}\n`; });
    if (review.length) {
      md += `\n## NEEDS-REVIEW -- blocked on a precondition (dispatcher missing, DI engine, or no clear home)\n\n`;
      review.forEach((r) => { md += `- **${r.engine}**${r.disp ? ` (-> ${r.disp})` : ""} -- ${r.reason}\n`; });
    }
    if (alreadyWired.length) {
      md += `\n## ALREADY-WIRED -- audit FALSE-NEGATIVE (a dispatcher already routes to these; flag tango to fix \`audit-unwired-engines.mjs\`)\n\n`;
      alreadyWired.forEach((r) => { md += `- **${r.engine}** -- ${r.reason}\n`; });
    }
    md += `\n_Re-run: \`node scripts/romeo-wiring-triage.mjs [--ollama]\`. Refresh audit first: \`node scripts/audit-unwired-engines.mjs\`._\n`;
    writeFileSync(OUT_MD, md);
    console.log(`romeo-wiring-triage: ${rows.length} engines -> ${wireable.length} WIREABLE / ${crossDomain.length} cross-domain / ${exempt.length} exempt / ${review.length} review / ${alreadyWired.length} already-wired (audit miss)`);
    console.log(`wrote ${OUT_MD}`);
    console.log(`\ntop-5 WIREABLE: ${wireable.slice(0, 5).map((r) => `${r.engine}->${r.disp}`).join(", ")}`);
  }
}

// Run only when this file is the entry point (not when imported by the test suite).
if (pathToFileURL(process.argv[1] ?? "").href === import.meta.url) main();
