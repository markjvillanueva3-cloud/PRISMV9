#!/usr/bin/env node
// scripts/build-advisory-feature-catalog.mjs
//
// ROUTING-GRAPH-COMPLETENESS / U-ADVISORY-CATALOG (slot:alpha 2026-06-17). Operator
// directive: "find all automated and advisory features we have and plan accordingly
// for all of them."
//
// THE GAP (R8, verified by recon): PRISM's routing graph (feature-routing-graph.mjs
// TASK_CLASS_POLICY) hand-references only ~2-3 hooks per task class -- it is BLIND to
// ~95% of the 800+ on-disk hooks (the automated + advisory feature surface). The
// hook ENUMERATION is already canonical in state/shared/HOOK_REGISTRY.json (built by
// build-hook-registry.mjs / HOOK-SYNERGY-MS0). That registry carries id/file/wired/
// events/tier/description -- but NOT the three dimensions the routing graph + the
// task-graph template need:
//   1. behavioralKind -- block-gate vs advisory-inject vs mutator vs passive
//      (the registry's `type` is the settings.json field, always "command" -- NOT
//      behavior). This is what tells you whether a feature will BLOCK you or merely
//      ADVISE you while you work a task.
//   2. taskClass      -- which of the 12 routing classes the hook serves (so the
//      template can auto-fill "the automated/advisory features active for THIS task").
//   3. knob           -- the PRISM_*_DISABLE env knob (so a plan can name how to mute it).
//
// So this is a DERIVED ROUTING VIEW over HOOK_REGISTRY.json (consumes it, never re-
// enumerates -- R8/R7), enriching each wired hook and emitting the per-task-class
// projection the task-graph template (U-TASK-GRAPH-TEMPLATE) reads. DETERMINISTIC
// (R5: code reads the registry + hook bodies + classifies by emit-pattern; no model).
//
// Run:   node H:/prism/scripts/build-advisory-feature-catalog.mjs
// Query: node H:/prism/scripts/build-advisory-feature-catalog.mjs --query <class>
// Check: node H:/prism/scripts/build-advisory-feature-catalog.mjs --check  (CI: exit 1 if stale/missing)

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const REGISTRY = path.join(PRISM, "state/shared/HOOK_REGISTRY.json");
const OUT = path.join(PRISM, "state/shared/advisory-feature-catalog.json");
const SCHEMA_VERSION = 1;
const BODY_CAP = 262144; // 256K: hooks are small (<60K); cap guards a pathological file.

// ---- pure, testable core ---------------------------------------------------

/**
 * Pure: strip JS comments (block then line) so a block/inject emit-pattern MENTIONED
 * in a comment is not mistaken for the hook actually DOING it. The line-comment strip
 * is URL-aware (only removes `//` preceded by line-start or whitespace) so `http://`
 * and `path//x` survive -- per the stop_on_unwired_assets 2026-06-11 comment-strip
 * lesson (a non-URL-aware strip flips to the dangerous false-NEGATIVE direction).
 * Caught by scrutiny: 10/134 "gates" had their ONLY block signal in a comment
 * (incl. hooks NAMED *-advisory), inflating the gate count + mislabeling advisors.
 */
export function stripComments(body) {
  // char-scanner (NOT a regex): a regex `/\*...\*\//` is STRING-BLIND -- a glob/path
  // literal like "patches/*.md" contains `/*`, and the lazy match then mispairs it
  // with a later `*/` and swallows real code in between (scrutiny P1: it ate
  // html-companion-guard.mjs's real `decision:"block"` -> that wired hard gate went
  // invisible, the SAME failure class this strip was meant to fix). Tracking string/
  // template state means `/*` inside a string is never treated as a comment -- this
  // mirrors how the JS lexer itself disambiguates.
  const s = String(body || "");
  let out = "";
  let state = "code"; // code | line | block | sq | dq | tpl
  for (let i = 0; i < s.length; i++) {
    const c = s[i], c2 = s[i + 1];
    if (state === "code") {
      if (c === "/" && c2 === "/") { state = "line"; i++; continue; }
      if (c === "/" && c2 === "*") { state = "block"; out += " "; i++; continue; }
      if (c === "'") { state = "sq"; out += c; continue; }
      if (c === '"') { state = "dq"; out += c; continue; }
      if (c === "`") { state = "tpl"; out += c; continue; }
      out += c; continue;
    }
    if (state === "line") { if (c === "\n") { state = "code"; out += c; } continue; }
    if (state === "block") { if (c === "*" && c2 === "/") { state = "code"; i++; } continue; }
    // string/template states: preserve chars, honor escape, exit on matching quote.
    if (c === "\\") { out += c + (c2 ?? ""); i++; continue; }
    const q = state === "sq" ? "'" : state === "dq" ? '"' : "`";
    if (c === q) { state = "code"; out += c; continue; }
    out += c;
  }
  return out;
}

/**
 * Pure: classify a hook's BEHAVIORAL kind from its source body. Precedence
 * (most-consequential first, because a hook can both block AND inject -- the block
 * is what matters to a chat):
 *   block-gate      -> emits a hard decision (decision:block / permissionDecision:deny /
 *                      continue:false / process.exit(2)). The automated GATES.
 *   advisory-inject -> surfaces context (additionalContext / systemMessage) without
 *                      blocking. The ADVISORY features.
 *   mutator         -> writes/append state but neither blocks nor injects (telemetry
 *                      with side effects, ledger appends, sidecar writers).
 *   passive         -> none of the above (pure read / no-op / logging to stderr only).
 * Returns one of those four strings.
 */
export function classifyBehavioralKind(body) {
  const s = stripComments(body);   // a commented emit-pattern is not the behavior
  // block-gate signals -- a real hard stop/deny path. Object KEYS may be quoted
  // ("decision":) or bare (decision:) -- live hooks overwhelmingly use the bare JS
  // literal form (83 files vs 5 quoted), so the key-quotes are OPTIONAL or the
  // detector under-counts gates ~7x (the bug R9 caught: a chat would think only ~18
  // features can hard-stop it when ~100+ can). `continue:false` is the Stop-event
  // hard-block return shape (verified: all live occurrences are genuine Stop blocks).
  const blockRe = /["']?decision["']?\s*:\s*["']block["']|["']?permissionDecision["']?\s*:\s*["']deny["']|["']?continue["']?\s*:\s*false|process\.exit\(\s*2\s*\)/;
  if (blockRe.test(s)) return "block-gate";
  // advisory-inject signals -- surfaces context, never blocks.
  if (/additionalContext|["']systemMessage["']/.test(s)) return "advisory-inject";
  // mutator -- side-effecting write without inject/block.
  if (/\b(writeFileSync|appendFileSync|fs\.write|fs\.appendFile|renameSync)\b/.test(s)) return "mutator";
  return "passive";
}

/**
 * Pure: extract the first env disable/bypass knob a hook honors, so a plan can name
 * how to mute the feature. Matches PRISM_<NAME>_<DISABLE|OFF|BYPASS|ENABLE>. Returns
 * the knob name or null. (ENABLE included: some features are opt-IN, e.g.
 * PRISM_OBSIDIAN_LIVE -- naming it tells a plan how to TURN IT ON.)
 */
export function extractKnob(body) {
  // longer forms FIRST in the alternation so PRISM_X_DISABLED is captured whole, not
  // truncated to ..._DISABLE (scrutiny P2: 9 hooks use the -ED forms). ENABLE/ENABLED
  // included: opt-IN features (e.g. PRISM_OBSIDIAN_LIVE_ENABLE) -- naming the knob tells
  // a plan how to TURN IT ON, not just off.
  const m = String(body || "").match(/PRISM_[A-Z0-9_]+_(?:DISABLED|DISABLE|ENABLED|ENABLE|BYPASS|OFF)\b/);
  return m ? m[0] : null;
}

/**
 * Pure: the distinct set of events a registry hook fires on (from its events[] array).
 * Empty array -> [] (orphaned/unwired). Deduped + sorted for stable output.
 */
export function hookEvents(regHook) {
  const evs = Array.isArray(regHook && regHook.events) ? regHook.events : [];
  const set = new Set();
  for (const e of evs) { if (e && e.event) set.add(String(e.event)); }
  return Array.from(set).sort();
}

/**
 * Pure: enrich one HOOK_REGISTRY record with the routing dimensions. `body` is the
 * hook source (or "" if unreadable -> kind degrades to passive, knob null). `classify`
 * is feature-routing-graph.classifyRoutingClass (injected for testability).
 */
export function enrichHook(regHook, body, classify, curatedClasses = null) {
  const id = String(regHook && regHook.id || "");
  const desc = String(regHook && regHook.description || "");
  const kind = classifyBehavioralKind(body);
  const knob = extractKnob(body);
  const events = hookEvents(regHook);
  // CURATED attribution wins (R8): if a hook is explicitly named in
  // TASK_CLASS_POLICY[cls].hooks it is AUTHORITATIVELY those class(es) (conf 1.0) -- the
  // hand-curated mapping beats the noisy name-classifier (which scores most hook ids
  // conf 0 -> universal). A hook curated into MULTIPLE classes (e.g. scrutinize-before-
  // stop in build+review+session) genuinely serves EACH, so it is attributed to ALL of
  // them (curatedClasses); the prior single-bucket first-wins hid it from the others
  // (review showed gate 0 though it owns the scrutiny gate). Otherwise classify on id+desc.
  const cc = Array.isArray(curatedClasses) ? curatedClasses.filter(Boolean) : [];
  let taskClass, classConf, curated = false;
  if (cc.length) {
    taskClass = cc[0]; classConf = 1; curated = true;   // primary = first; ALL in curatedClasses
  } else {
    const r = classify(`${id.replace(/-/g, " ")} ${desc}`);
    taskClass = r.taskClass; classConf = Number((r.confidence || 0).toFixed(2));
  }
  return {
    id,
    wired: !!(regHook && regHook.wired),
    tier: (regHook && regHook.tier) || null,
    events,
    behavioralKind: kind,
    taskClass,
    classConf,
    curated,
    curatedClasses: cc,
    knob,
    description: desc.replace(/\s+/g, " ").trim().slice(0, 160),
  };
}

/**
 * Pure: reverse-map TASK_CLASS_POLICY into { hookId -> [classes] } -- ALL classes that
 * list the hook in their `hooks` array (policy order, deduped). Leading "/" stripped. A
 * hook curated into multiple classes genuinely serves EACH, so it is attributed to all
 * of them (multi-bucket); the catalog places it in every one of those class buckets
 * (conservation counts the DISTINCT hook once). Returns {} if policy is malformed.
 */
export function curatedClassMap(taskClassPolicy) {
  const map = {};
  if (!taskClassPolicy || typeof taskClassPolicy !== "object") return map;
  for (const cls of Object.keys(taskClassPolicy)) {
    const hooks = (taskClassPolicy[cls] && taskClassPolicy[cls].hooks) || [];
    for (const h of hooks) {
      const id = String(h).replace(/^\//, "").trim();
      if (!id) continue;
      (map[id] ||= []);
      if (!map[id].includes(cls)) map[id].push(cls);   // every class that lists it
    }
  }
  return map;
}

/**
 * Pure: fold enriched records into the catalog aggregation. Invariants:
 *   - sum(byKind) === records.length (no record lost from the global tally).
 *   - NO actionable feature is dropped from the projection (scrutiny P1 fix): every
 *     wired block-gate/advisory-inject lands in EXACTLY ONE of byTaskClass (when the
 *     name/desc classifier scores it to a specific class, conf>0) or universalFeatures
 *     (conf==0 -> fires regardless of detected class: the always-on gates like
 *     duplication-hard-block + the every-prompt advisors like master-index-inject).
 *     The earlier conf>0-only filter silently hid 71% of the surface incl. 61 hard
 *     gates -- a template consuming it would be blind to the fleet's hardest stops.
 *   - mutator/passive + orphans (unwired) are counted in byKind but are NOT routing
 *     surface, so they are excluded from BOTH projection buckets.
 *   - MULTI-BUCKET (U-CURATED-MULTIBUCKET): a hook curated into N classes appears in
 *     each of those N byTaskClass buckets (it genuinely serves each). Conservation is
 *     DISTINCT-based: classSpecificCount = count of DISTINCT hooks in >=1 class bucket
 *     (a multi-class hook counted ONCE), so classSpecificCount + universalCount ===
 *     actionableWired holds even though sum(byTaskClass lengths) may exceed it.
 */
export function aggregateCatalog(records) {
  const byKind = {};
  const byEventWired = {};
  const byTaskClass = {};
  const universalFeatures = [];
  const classSpecificIds = new Set();   // DISTINCT hooks in >=1 class bucket (multi-class counted once)
  let wired = 0, withKnob = 0, actionableWired = 0;
  const feat = (r) => ({ id: r.id, kind: r.behavioralKind, events: r.events, knob: r.knob, tier: r.tier });
  for (const r of records) {
    byKind[r.behavioralKind] = (byKind[r.behavioralKind] || 0) + 1;
    if (r.wired) {
      wired++;
      for (const ev of r.events) byEventWired[ev] = (byEventWired[ev] || 0) + 1;
    }
    if (r.knob) withKnob++;
    const actionable = r.wired && (r.behavioralKind === "block-gate" || r.behavioralKind === "advisory-inject");
    if (!actionable) continue;
    actionableWired++;
    const curatedClasses = Array.isArray(r.curatedClasses) ? r.curatedClasses : [];
    if (curatedClasses.length) {
      for (const cls of curatedClasses) (byTaskClass[cls] ||= []).push(feat(r));   // every class it serves
      classSpecificIds.add(r.id);                                                  // distinct: once
    } else if (r.classConf > 0) {
      (byTaskClass[r.taskClass] ||= []).push(feat(r));
      classSpecificIds.add(r.id);
    } else {
      universalFeatures.push(feat(r));   // fires regardless of class (no class-keyword match)
    }
  }
  // stable order: block-gate before advisory-inject, then by id
  const kindRank = { "block-gate": 0, "advisory-inject": 1 };
  const sortFeats = (arr) => arr.sort((a, b) => (kindRank[a.kind] - kindRank[b.kind]) || a.id.localeCompare(b.id));
  for (const cls of Object.keys(byTaskClass)) sortFeats(byTaskClass[cls]);
  sortFeats(universalFeatures);
  return {
    totalRecords: records.length,
    wired,
    actionableWired,
    automated: byKind["block-gate"] || 0,     // the GATES
    advisory: byKind["advisory-inject"] || 0,  // the ADVISORS
    withKnob,
    byKind,
    byEventWired,
    classSpecificCount: classSpecificIds.size,   // DISTINCT hooks in class buckets (multi-class counted once)
    classPlacements: Object.values(byTaskClass).reduce((s, a) => s + a.length, 0),  // total placements (>= distinct)
    universalCount: universalFeatures.length,
    byTaskClass,
    universalFeatures,
  };
}

// ---- generator -------------------------------------------------------------

function loadRegistry() {
  let j;
  try { j = JSON.parse(fs.readFileSync(REGISTRY, "utf8")); }
  catch (e) { throw new Error(`cannot read HOOK_REGISTRY.json (run build-hook-registry.mjs first): ${e.message}`); }
  const hooks = Array.isArray(j.hooks) ? j.hooks : [];
  if (!hooks.length) throw new Error("HOOK_REGISTRY.json has no hooks[] -- regenerate it");
  return { registry: j, hooks };
}

function readBody(relFile) {
  if (!relFile) return "";
  const abs = path.isAbsolute(relFile) ? relFile : path.join(PRISM, relFile);
  try {
    const fd = fs.openSync(abs, "r");
    const buf = Buffer.alloc(BODY_CAP);
    const n = fs.readSync(fd, buf, 0, BODY_CAP, 0);
    fs.closeSync(fd);
    return buf.subarray(0, n).toString("utf8");
  } catch { return ""; }
}

async function buildCatalog() {
  const m = await import(pathToFileURL(path.join(PRISM, "scripts/lib/feature-routing-graph.mjs")).href);
  const { classifyRoutingClass, taskClasses, TASK_CLASS_POLICY } = m;
  const { registry, hooks } = loadRegistry();
  const curated = curatedClassMap(TASK_CLASS_POLICY);   // authoritative hook->class (R8)

  const records = [];
  let unreadable = 0, curatedHits = 0;
  for (const h of hooks) {
    const body = readBody(h.file);
    if (!body) unreadable++;
    const cc = curated[String(h.id || "")] || null;
    if (cc) curatedHits++;
    records.push(enrichHook(h, body, classifyRoutingClass, cc));
  }
  const agg = aggregateCatalog(records);

  // coverage: a class with no CLASS-SPECIFIC feature is NOT a hole -- the
  // universalFeatures bucket (always-on gates/advisors) applies to every class. So
  // classesWithoutSpecific is informational only (R12: don't cry "hole" when universal
  // covers it). actionableWired is conserved: classSpecific + universal === actionableWired.
  const allClasses = taskClasses();
  const classesWithFeatures = Object.keys(agg.byTaskClass);
  const classesWithoutSpecific = allClasses.filter((c) => !classesWithFeatures.includes(c));

  return {
    schemaVersion: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    note: "Routing view over HOOK_REGISTRY.json (U-ADVISORY-CATALOG). Enriches each hook with behavioralKind (block-gate=automated gate / advisory-inject=advisor / mutator / passive), taskClass, and disable knob. Projection has TWO buckets the task-graph template reads: byTaskClass (class-specific) + universalFeatures (conf==0 -> always-on gates/advisors that fire regardless of detected class, e.g. duplication-hard-block + master-index-inject). MULTI-BUCKET (U-CURATED-MULTIBUCKET): a hook hand-curated into N task-classes (e.g. scrutinize-before-stop in build+review+session) appears in EACH of those N byTaskClass buckets because it genuinely serves each; conservation is DISTINCT-based (classSpecificCount counts each such hook ONCE), so classSpecificCount + universalCount === actionableWired holds even though classPlacements (sum of byTaskClass lengths) >= classSpecificCount. None dropped. NOTE: `wired` reflects HOOK_REGISTRY (settings.json) registration, NOT live env-bypass state -- a wired gate may be muted by its knob (e.g. stop_on_unwired_assets under PRISM_ALLOW_UNWIRED), so a gate is block-CAPABLE, not a guaranteed stop. Consumes (never re-enumerates) the canonical registry.",
    registryGeneratedAt: registry.generatedAt || null,
    totalRecords: agg.totalRecords,
    unreadable,
    curatedHits,
    wired: agg.wired,
    actionableWired: agg.actionableWired,
    automated: agg.automated,
    advisory: agg.advisory,
    withKnob: agg.withKnob,
    byKind: agg.byKind,
    byEventWired: agg.byEventWired,
    classSpecificCount: agg.classSpecificCount,
    classPlacements: agg.classPlacements,   // >= classSpecificCount when curated hooks serve multiple classes
    universalCount: agg.universalCount,
    classesWithoutSpecific,
    byTaskClass: agg.byTaskClass,
    universalFeatures: agg.universalFeatures,
    features: records,
  };
}

async function main() {
  const out = await buildCatalog();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const tmp = `${OUT}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(out, null, 2));
  fs.renameSync(tmp, OUT);
  const cov = Object.entries(out.byTaskClass).sort((a, b) => b[1].length - a[1].length)
    .map(([c, arr]) => `${c}:${arr.length}`).join("  ");
  console.log(`advisory-feature-catalog: ${out.totalRecords} hooks | wired ${out.wired} | automated(gate) ${out.automated} | advisory(inject) ${out.advisory} | knobbed ${out.withKnob}${out.unreadable ? ` | unreadable ${out.unreadable}` : ""}`);
  console.log(`actionable ${out.actionableWired} = class-specific ${out.classSpecificCount} + universal ${out.universalCount} (none dropped)`);
  console.log(`per-class (class-specific)  ${cov}`);
  if (out.classesWithoutSpecific.length) console.log(`note: classes with no CLASS-SPECIFIC feature (universal bucket still applies): ${out.classesWithoutSpecific.join(", ")}`);
  console.log(`-> ${OUT}`);
}

// ---- query / check modes ---------------------------------------------------

function query(arg) {
  let cat;
  try { cat = JSON.parse(fs.readFileSync(OUT, "utf8")); }
  catch { console.error(`no catalog at ${OUT} -- run the generator first`); process.exit(1); }
  const cls = String(arg || "").replace(/^\//, "").trim();
  const universal = cat.universalFeatures || [];
  const fmt = (f) => `  [${f.kind === "block-gate" ? "GATE " : "ADVIS"}] ${f.id}  (${f.events.join(",")})${f.knob ? `  mute:${f.knob}` : ""}`;
  if (cls === "universal") {   // explicit query of the always-on bucket
    console.log(`# universal features (${universal.length}) -- fire regardless of task class`);
    for (const f of universal) console.log(fmt(f));
    return;
  }
  const feats = (cat.byTaskClass || {})[cls];
  if (!feats) { console.error(`no task class "${cls}" in the catalog (classes: ${Object.keys(cat.byTaskClass || {}).join(", ")}, or "universal")`); process.exit(1); }
  console.log(`# task class: ${cls}  (${feats.length} class-specific + ${universal.length} universal automated/advisory features)`);
  console.log(`## class-specific:`);
  for (const f of feats) console.log(fmt(f));
  console.log(`## universal (always-on, apply to every task):`);
  for (const f of universal) console.log(fmt(f));
}

async function check() {
  let onDisk;
  try { onDisk = JSON.parse(fs.readFileSync(OUT, "utf8")); }
  catch { console.error("catalog missing/unreadable"); process.exit(1); }
  const fresh = await buildCatalog();
  // compare BOTH load-bearing projection buckets + total (ignore timestamps)
  const a = JSON.stringify([onDisk.byTaskClass, onDisk.universalFeatures]);
  const b = JSON.stringify([fresh.byTaskClass, fresh.universalFeatures]);
  if (a !== b || onDisk.totalRecords !== fresh.totalRecords) {
    console.error("catalog STALE -- regenerate (byTaskClass/universalFeatures or totalRecords drift)"); process.exit(1);
  }
  console.log("catalog fresh"); process.exit(0);
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("build-advisory-feature-catalog.mjs");
if (isMain) {
  const qi = process.argv.indexOf("--query");
  if (qi >= 0) query(process.argv[qi + 1]);
  else if (process.argv.includes("--check")) check();
  else main().catch((e) => { console.error("build-advisory-feature-catalog failed:", e?.message || e); process.exit(1); });
}
