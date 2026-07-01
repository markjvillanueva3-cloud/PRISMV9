// viz-dual-registration-audit.mjs -- deterministic auditor for the system-viz
// FAST[]+merge-splice "both-or-neither" invariant (sierra galaxy, CLAUDE.md s3/s5/s7 rails).
//
// THE INVARIANT (galaxy doctrine): every ghost-roost feature generator must be registered in
// BOTH regen-viz.mjs `FAST[]` (so it runs) AND have a merge-augmentations.mjs `loadOptional(...)`
// for the JSON it emits (so its nodes/edges fold into the merged graph). A generator missing
// EITHER side produces data that is silently dropped, or -- worse -- a FAST[] entry whose
// generator file does not exist crashes the WHOLE 3-minute regen with MODULE_NOT_FOUND (the
// slot-queue regression that broke regen for ~2 weeks, U-VIZ-SLOTQUEUE-ORPHAN).
//
// PURE static analysis: reads source files, never runs a generator, never touches the
// 370-575 MB merged graph. Verified naming convention --
//   generator: `const OUT = path.join(VIZ_DIR, "<name>.json"); writeFileSync(OUT, ...)`
//   merge:     `loadOptional("<name>.json")`
//
// R12 honesty: a generator whose output filename cannot be statically resolved (writes via a
// runtime variable / loop) goes in an `unverifiable` bucket -- NEVER asserted as a discard.

import fs from "node:fs";
import path from "node:path";

const VIZ_REL = "state/shared/system-viz";

/** Strip a trailing `// ...` line comment but keep the code before it. Whole-line comments -> "". */
function stripLineComment(line) {
  const t = line.trimStart();
  if (t.startsWith("//")) return "";
  const m = line.match(/^([^"']*"[^"]*"[^"']*?|[^"']*'[^']*'[^"']*?)\s*\/\/.*$/);
  return m ? m[1] : line;
}

/** Extract a bracketed array literal `const NAME = [ ... ];`, returning the inner body string.
 *  Bracket depth is counted only OUTSIDE string literals + line/block comments, so a `[`/`]`
 *  inside a `"FAST[]"` token or a `// [deprecated` comment can never mis-terminate the array
 *  (the comment-bracket class that broke the drift-guard's naive regex, 2026-06-22). */
function extractArrayBody(src, name) {
  const start = src.indexOf(`const ${name} = [`);
  if (start === -1) return null;
  const open = src.indexOf("[", start);
  let depth = 0;
  let inStr = null;          // active quote char (" ' `) or null
  let inLine = false;        // inside a // line comment
  let inBlock = false;       // inside a /* block comment */
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (inLine) { if (c === "\n") inLine = false; continue; }
    if (inBlock) { if (c === "*" && src[i + 1] === "/") { inBlock = false; i++; } continue; }
    if (inStr) {
      if (c === "\\") { i++; continue; }   // skip the escaped char
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") { inLine = true; i++; continue; }
    if (c === "/" && src[i + 1] === "*") { inBlock = true; i++; continue; }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return null;
}

/** Parse the `.mjs` filenames in a regen-viz array (FAST or HEAVY), skipping commented lines. */
export function parseGeneratorArray(src, name) {
  const body = extractArrayBody(src, name);
  if (body == null) return [];
  const out = [];
  for (const rawLine of body.split("\n")) {
    const line = stripLineComment(rawLine);
    const m = line.match(/["']([\w.-]+\.mjs)["']/);
    if (m) out.push(m[1]);
  }
  return out;
}

/** Set of JSON filenames merge-augmentations.mjs consumes via loadOptional(). */
export function parseLoadOptional(mergeSrc) {
  const set = new Set();
  for (const m of mergeSrc.matchAll(/loadOptional\(\s*["']([\w.-]+\.json)["']/g)) {
    set.add(m[1]);
  }
  return set;
}

/**
 * Statically resolve the VIZ_DIR `.json` filename(s) a generator writes.
 * Maps const-name -> json-literal for `const X = path.join(<dir>, "<f>.json")` / `const X = "<f>.json"`,
 * then resolves every `writeFileSync(<target>, ...)` whose target is such a const or a `.json` literal.
 * @returns {{outputs:Set<string>, resolvable:boolean, sawJsonWrite:boolean}}
 *   resolvable=false => a .json is written but the literal could not be pinned (advisory only).
 */
export function extractGeneratorOutputs(genSrc) {
  // const X = path.join(..., "dir/f.json")  |  const X = "f.json"
  // The `(?:[^"'`]*\/)?` prefix captures only the BASENAME when the literal carries a
  // path prefix with slashes (e.g. path.join(ROOT, "state/shared/system-viz/foo-augmentation.json")).
  // loadOptional() keys on the basename, so the basename is the load-match key. WITHOUT this,
  // a slash-path OUT_PATH (the common `export const OUT_PATH = path.join(ROOT, "state/.../x.json")`
  // form) failed to pin -> resolvable:false -> false "unverifiable" (e.g. the octopus-consensus +
  // GNN-predicted-edges cross-galaxy roosts, which ARE spliced). U-VIZ-XGAL-DUALREG-PATHRESOLVE.
  const constMap = new Map();
  const cre = /const\s+(\w+)\s*=\s*(?:path\.join\([^)]*?["'`](?:[^"'`]*\/)?([\w.-]+\.json)["'`]\s*\)|["'`](?:[^"'`]*\/)?([\w.-]+\.json)["'`])/g;
  for (const cm of genSrc.matchAll(cre)) constMap.set(cm[1], cm[2] || cm[3]);

  // consts that are READ (input augmentations from other generators) -- excluded from convention fallback
  const readConsts = new Set();
  for (const rm of genSrc.matchAll(/(?:readFileSync|readFile|loadJson\w*|loadOptional|loadAug\w*)\(\s*(\w+)/g)) {
    if (constMap.has(rm[1])) readConsts.add(rm[1]);
  }
  // ALSO treat a const used as a `... || CONST` fallback as an INPUT default (e.g.
  // `opts.edgesPath || EDGES_PATH`, `process.env.X || EDGES_PATH`) -- it is read, not written. Without
  // this the convention fallback below mis-credits a read-only INPUT const that ends in
  // `-augmentation.json` as a PRODUCED output -> a latent false-negative (would mask a real dangling
  // if the genuine producer were dropped). U-VIZ-XGAL-DUALREG-PATHRESOLVE.
  for (const c of constMap.keys()) {
    if (new RegExp(`\\|\\|\\s*${c}\\b`).test(genSrc)) readConsts.add(c);
  }

  // extract the FIRST argument of a call, paren-balanced (so a nested path.join(...) comma is not a
  // false boundary). idx points at the char after the writer's "(".
  const firstArg = (src, idx) => {
    let depth = 1, arg = "";
    for (let i = idx; i < src.length && depth > 0; i++) {
      const c = src[i];
      if (c === "(") depth++;
      else if (c === ")") { if (--depth === 0) break; }
      else if (c === "," && depth === 1) break;
      arg += c;
    }
    return arg;
  };

  const outputs = new Set();
  let unresolvedWrite = false;
  // recognize any writer (not just writeFileSync): atomicWriteText/Json, writeJson, writeGraph*, writeFile
  const writerRe = /(?:writeFileSync|writeFile|atomicWrite\w*|writeJson\w*|writeGraph\w*|writeText\w*)\(/g;
  for (const wm of genSrc.matchAll(writerRe)) {
    const arg = firstArg(genSrc, wm.index + wm[0].length);
    // basename capture tolerant of a slash path prefix (writeFileSync("state/.../x.json", ...)).
    const lit = arg.match(/["'`](?:[^"'`]*\/)?([\w.-]+\.json)["'`]/);
    if (lit) outputs.add(lit[1]);
    else {
      const t = arg.trim();
      if (constMap.has(t)) outputs.add(constMap.get(t));
      else if (/\.json/.test(arg) || /\b(?:OUT|dest|target|outPath)\b/i.test(arg)) unresolvedWrite = true;
    }
  }
  // convention fallback: a const named *-augmentation.json / *-features.json that is NOT read is an
  // output -- captures writers we don't enumerate (e.g. atomicWriteText(OUT) in cross-substrate-edges).
  for (const [c, file] of constMap) {
    if (/-(augmentation|features)\.json$/.test(file) && !readConsts.has(c)) outputs.add(file);
  }
  const resolvable = outputs.size > 0 || !unresolvedWrite;
  return { outputs, resolvable, sawJsonWrite: outputs.size > 0 || unresolvedWrite };
}

/** A viz GRAPH producer emits at least one conventional fold output (*-augmentation.json/*-features.json). */
function emitsConventionalOutput(outputs) {
  for (const o of outputs) if (/-(augmentation|features)\.json$/.test(o)) return true;
  return false;
}

/** True if a generator source plausibly emits a system-viz augmentation/features JSON. */
function isVizProducer(genSrc) {
  return /system-viz/.test(genSrc) && /writeFileSync/.test(genSrc) && /\.json/.test(genSrc);
}

/**
 * Full dual-registration audit against a repo root (pure static analysis).
 * @param {object} opts
 * @param {string} opts.root         repo root (contains scripts/, state/shared/system-viz/)
 * @param {string} [opts.regenViz]   path to regen-viz.mjs
 * @param {string} [opts.mergeAug]   path to merge-augmentations.mjs
 * @param {string} [opts.scriptsDir] generators dir (default <root>/scripts)
 * @param {string} [opts.vizDir]     viz artifacts dir (default <root>/state/shared/system-viz)
 * @returns {object} structured report
 */
export function auditDualRegistration(opts = {}) {
  const root = opts.root || process.cwd();
  const scriptsDir = opts.scriptsDir || path.join(root, "scripts");
  const regenVizPath = opts.regenViz || path.join(scriptsDir, "regen-viz.mjs");
  const mergeAugPath = opts.mergeAug || path.join(scriptsDir, "merge-augmentations.mjs");
  const vizDir = opts.vizDir || path.join(root, VIZ_REL);

  const regenSrc = fs.readFileSync(regenVizPath, "utf8");
  const mergeSrc = fs.readFileSync(mergeAugPath, "utf8");

  const fast = parseGeneratorArray(regenSrc, "FAST");
  const heavy = parseGeneratorArray(regenSrc, "HEAVY");
  const registered = new Set([...fast, ...heavy]);
  const loadOptionalSet = parseLoadOptional(mergeSrc);

  let onDiskJson = new Set();
  try {
    onDiskJson = new Set(fs.readdirSync(vizDir).filter((f) => /\.json$/.test(f)));
  } catch { /* vizDir absent (fixture) -- fine */ }

  const genFiles = fs
    .readdirSync(scriptsDir)
    .filter((f) => /^(generate|run|consolidate|validate)-.*\.mjs$/.test(f) && !/\.test\.mjs$/.test(f));

  const producers = new Map();
  for (const f of genFiles) {
    let src;
    try {
      src = fs.readFileSync(path.join(scriptsDir, f), "utf8");
    } catch {
      continue;
    }
    if (!isVizProducer(src)) continue;
    const { outputs, resolvable } = extractGeneratorOutputs(src);
    const conventional = emitsConventionalOutput(outputs);
    // a generator that writes only NON-fold json (dashboard / wiki / html sidecar) and is fully
    // resolved is out of scope for the FAST/splice invariant -- skip it (cuts orphan noise).
    if (!conventional && resolvable) continue;
    producers.set(f, { outputs, resolvable, conventional, registered: registered.has(f) });
  }

  const crashRisks = [];        // P0: registered entry whose generator file does not exist -> regen crash
  const silentDiscards = [];    // P1: registered producer emits JSON merge does NOT loadOptional -> dropped
  const orphanGenerators = [];  // P2: viz producer on disk, NOT registered -> never runs
  const danglingConsumers = []; // advisory: loadOptional(X) with no producer and X not on disk
  const unverifiable = [];      // R12: registered producer whose output filename cannot be resolved

  for (const entry of registered) {
    if (!fs.existsSync(path.join(scriptsDir, entry))) crashRisks.push(entry);
  }

  const producedJson = new Set();
  for (const [file, info] of producers) {
    const conv = [...info.outputs].filter((o) => /-(augmentation|features)\.json$/.test(o));
    for (const o of conv) producedJson.add(o);
    if (!info.registered) {
      if (info.conventional) orphanGenerators.push({ file, outputs: conv });
      continue;
    }
    if (!info.conventional || !info.resolvable) {
      unverifiable.push(file);
      continue;
    }
    const consumed = conv.some((o) => loadOptionalSet.has(o));
    if (!consumed) silentDiscards.push({ file, outputs: conv });
  }

  for (const name of loadOptionalSet) {
    if (!producedJson.has(name) && !onDiskJson.has(name)) danglingConsumers.push(name);
  }

  const summary = {
    fastCount: fast.length,
    heavyCount: heavy.length,
    loadOptionalCount: loadOptionalSet.size,
    vizProducerCount: producers.size,
    onDiskJsonCount: onDiskJson.size,
    crashRisks: crashRisks.length,
    silentDiscards: silentDiscards.length,
    orphanGenerators: orphanGenerators.length,
    danglingConsumers: danglingConsumers.length,
    unverifiable: unverifiable.length,
    clean: crashRisks.length === 0 && silentDiscards.length === 0 && orphanGenerators.length === 0,
  };

  return { summary, crashRisks, silentDiscards, orphanGenerators, danglingConsumers, unverifiable };
}
