/**
 * audit-dispatcher-ghost-actions.mjs
 * [BACKEND-INTEGRITY]/U-GHOST-ACTION-AUDIT (slot:romeo, operator goal 2026-06-18: backend -> unblock frontend).
 *
 * A ghost action = a name in a dispatcher's action enum / `*_ACTIONS` array that has NO handler
 * (no switch `case`, no handler-table key, no `NAME.includes()` array-membership route). The frontend
 * (mcp-server/web/lib/api.ts -> HTTP bridge :3100) validates a call against the enum then forwards it;
 * a ghost action passes validation then 500s at dispatch -> a broken API surface the frontend hits.
 * The romeo soul explicitly refuses "tolerating-ghost-actions-in-zod-enum"; this is the proactive
 * fleet-wide sweep companion to the reactive `stop_on_unwired_assets` Stop gate.
 *
 * REUSES the battle-tested pure detector `findUnhandledActions(rawBody)` from
 * `.claude/hooks/stop_on_unwired_assets.mjs` (handles switch/table/array-membership dispatch +
 * comment-stripping + URL-scheme guard; regression-hardened 2026-06-11). No logic fork.
 *
 * SCOPE HONESTY (R12): findUnhandledActions parses the `const NAME_ACTIONS = [...] as const` pattern.
 * Dispatchers that declare actions ONLY via an inline `z.enum([...])` with no named `*_ACTIONS` array
 * are reported under `noActionArray` (audit-blind, NOT proven-clean) -- they need the enum-pattern
 * extension or manual review. A dispatcher with a named array + 0 ghosts is proven-clean.
 *
 * Run: node scripts/audit-dispatcher-ghost-actions.mjs [--json]
 * Out: state/shared/DISPATCHER-GHOST-ACTION-AUDIT.json
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { findUnhandledActions } from "../.claude/hooks/stop_on_unwired_assets.mjs";

const DISP_DIR = "H:/prism/mcp-server/src/tools/dispatchers";
const JSON_ONLY = process.argv.includes("--json");

if (!existsSync(DISP_DIR)) { console.error(`FATAL: no dispatcher dir ${DISP_DIR}`); process.exit(1); }

const files = readdirSync(DISP_DIR)
  .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".d.ts"));

// >= this unhandled-fraction => the static detector is blind to the dispatcher's routing (delegation /
// handler-table / nested switch), NOT "that many broken actions". Verified false-positive sources
// 2026-06-18: machiningKnowledgeBaseDispatcher (handler-table) + intelligenceDispatcher (2-level engine
// delegation) both read ~100%/high unhandled while fully working.
const ROUTING_BLIND_PCT = 50;

const flagged = [];        // { dispatcher, flaggedActions, totalActions, pctUnhandled, classification }
const noActionArray = [];  // no `*_ACTIONS` array (z.enum-only or other) -> not statically analyzable
let provenClean = 0, scanned = 0;

for (const f of files) {
  const path = join(DISP_DIR, f);
  let src;
  try { src = readFileSync(path, "utf8"); } catch { continue; }
  scanned++;
  const arrMatches = [...src.matchAll(/const\s+\w*ACTIONS\w*\s*=\s*\[([\s\S]*?)\]\s*as\s+const/g)];
  const hasActionArray = arrMatches.length > 0;
  let totalActions = 0;
  for (const a of arrMatches) totalActions += [...a[1].matchAll(/"[a-z][a-z0-9_]*"/g)].length;
  let unhandled = [];
  try { unhandled = findUnhandledActions(src) || []; }
  catch (e) { flagged.push({ dispatcher: f, flaggedActions: [], error: `detector threw: ${e.message}` }); continue; }
  if (!hasActionArray) { noActionArray.push(f); continue; }
  if (unhandled.length) {
    const pct = totalActions ? Math.round((unhandled.length / totalActions) * 100) : 100;
    // CLASSIFY HONESTLY (R12): the static detector recognizes switch-case / handler-table-key /
    // `.includes()` array dispatch. A dispatcher using 2-level engine delegation, a Record handler
    // table, or NESTED switches routes actions in ways this single-file regex CANNOT see -> a high
    // unhandled-fraction means "detector blind to this routing", NOT "N broken actions". A real
    // dispatcher does not ship most of its API broken. So:
    //   pct >= ROUTING_BLIND_PCT  -> routing-pattern not statically visible (NOT ghosts)
    //   pct <  ROUTING_BLIND_PCT  -> CANDIDATE (a few actions the detector missed; could be a real
    //                                ghost OR a localized pattern-miss) -> needs RUNTIME probe to confirm.
    // NOTHING here is a CONFIRMED ghost: static analysis cannot prove a 500 without dispatching.
    const cls = pct >= ROUTING_BLIND_PCT ? "routing-not-statically-visible" : "candidate-needs-runtime-probe";
    flagged.push({ dispatcher: f, flaggedActions: unhandled, totalActions, pctUnhandled: pct, classification: cls });
  } else provenClean++;
}

const candidates = flagged.filter((g) => g.classification === "candidate-needs-runtime-probe");
const routingBlind = flagged.filter((g) => g.classification === "routing-not-statically-visible");
const result = {
  generatedAt: null,
  dispatcherDir: DISP_DIR,
  method: "STATIC single-file detection via findUnhandledActions (switch-case / handler-table-key / .includes array dispatch). CANNOT see 2-level engine delegation, Record handler tables, or nested switches -> high unhandled-fraction = detector-blind, NOT broken actions. NOTHING here is a confirmed ghost; CANDIDATES need a runtime dispatch probe (MCP/prism_safe) to confirm.",
  stats: {
    scanned,
    provenClean,                              // named-array, inline pattern, 0 unhandled -> statically clean
    candidatesNeedRuntimeProbe: candidates.length,
    routingNotStaticallyVisible: routingBlind.length,
    noActionArray: noActionArray.length,      // z.enum-only / other -> not statically analyzable
    confirmedGhosts: 0,                        // static analysis cannot confirm a ghost; runtime only
  },
  candidates,        // low-fraction: a few actions the detector missed -> probe to confirm real vs pattern-miss
  routingBlind,      // high-fraction: routing not statically visible (delegation/table/nested)
  noActionArray,
};

const OUT = "H:/prism/state/shared/DISPATCHER-GHOST-ACTION-AUDIT.json";
writeFileSync(OUT, JSON.stringify(result, null, 2));

if (!JSON_ONLY) {
  console.log(`# Dispatcher ghost-action audit (STATIC triage -- no confirmed ghosts; runtime probe needed)`);
  console.log(`scanned ${scanned} - ${provenClean} proven-clean (inline pattern) - ${candidates.length} candidate(needs-runtime-probe) - ${routingBlind.length} routing-not-statically-visible - ${noActionArray.length} no-action-array`);
  if (candidates.length) {
    console.log(`\n## CANDIDATES (low unhandled-fraction; detector found no handler -> CONFIRM via runtime dispatch, may be a localized pattern-miss):`);
    for (const g of candidates) console.log(`- ${g.dispatcher} (${g.flaggedActions.length}/${g.totalActions}, ${g.pctUnhandled}%): ${g.flaggedActions.join(", ")}`);
  }
  if (routingBlind.length) {
    console.log(`\n## ROUTING NOT STATICALLY VISIBLE (high fraction = delegation/handler-table/nested switch; NOT broken -- excluded from ghost claims):`);
    for (const g of routingBlind) console.log(`- ${g.dispatcher} (${g.flaggedActions.length}/${g.totalActions}, ${g.pctUnhandled}%)`);
  }
  console.log(`\nReliable verification = runtime dispatch probe (needs MCP bridge / prism_safe, down this session). Full: ${OUT}`);
}
