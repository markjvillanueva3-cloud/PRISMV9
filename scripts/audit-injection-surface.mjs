#!/usr/bin/env node
// scripts/audit-injection-surface.mjs
//
// TOKEN-EFFICIENCY-INJECT/U-INJECTION-SURFACE-CENSUS (2026-06-10, slot:bravo).
//
// The safe, proven-foundation core of backlog #6 from
// reference_injection_surface_token_audit_2026_06_10: a DATA-DRIVEN census of
// the recurring auto-injection surface (the "we auto-inject a bunch of context"
// the operator pointed at), with a NEW actionable signal -- KNOB COVERAGE.
//
// Read-only -- it never runs a hook, so it has no side effects:
//   1. Parse settings.json -> enumerate every SessionStart + UserPromptSubmit
//      hook command (the surface that fires every session / every prompt).
//   2. Resolve each hook file + read its source -> detect a disable/gate knob
//      (a PRISM_* env var named DISABLE/INJECT/SILENCE/OFF/SKIP).
//   3. Enrich with fire-rate from the EXISTING hook-fire ledger (reusing
//      hook-fire-rank.mjs's exported parseLedger + aggregateFires -- no fork).
//   4. Emit a ranked report + the KNOB-COVERAGE gap: recurring injectors with
//      NO disable knob are the worst case (fire constantly, can't be silenced).
//
// BYTES DIMENSION (TOKEN-EFFICIENCY-INJECT/U-INJECTION-BYTES-RANK, 2026-06-10):
// the `bytes x fires/hr` weight is now wired in as the data-driven cut list the
// operator's instinct asked for. Real per-injector bytes come from REUSING the
// proven U-MWO08 probe (measure-userpromptsubmit-budget.mjs#probeHook) -- it runs
// each hook with a probe stdin and measures the emitted additionalContext bytes.
// Probing runs hooks (side-effect + slow), so it is OPT-IN behind --bytes; the
// default stays the read-only census. The weight needs BOTH dimensions, so
// fire-rate remains default-on (use --no-fire-rate for a fast knob-only pass).
//
// IMPORTANT -- probed bytes are a LOWER BOUND: most injectors are keyword/state
// gated and emit nothing on a synthetic probe, so the measured size reflects only
// what one probe prompt triggers. Use --probe "<text>" to drive a realistic
// prompt; the cut list is labeled "measured lower-bound" so it is never read as
// the true per-prompt cost.
//
// Usage:
//   node scripts/audit-injection-surface.mjs                 # text report (read-only)
//   node scripts/audit-injection-surface.mjs --json
//   node scripts/audit-injection-surface.mjs --bytes         # + probe real bytes -> bytes x fires rank
//   node scripts/audit-injection-surface.mjs --event Stop    # audit another event
//   node scripts/audit-injection-surface.mjs --settings PATH # override settings.json
//   node scripts/audit-injection-surface.mjs --no-fire-rate  # skip ledger join (fast, knob-only)
//
// Exit: 0 ok, 2 input failure.

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseLedger, aggregateFires } from "./hook-fire-rank.mjs";
import { probeHook, PROBE_PROMPT_DEFAULT } from "./measure-userpromptsubmit-budget.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const DEFAULT_SETTINGS = process.env.PRISM_INJECTION_AUDIT_SETTINGS || "H:/.claude/settings.json";
const DEFAULT_LEDGER = resolve(REPO_ROOT, "mcp-server/data/state/hook-fire-counts.jsonl");
const RECURRING_EVENTS = ["SessionStart", "UserPromptSubmit"]; // fire every session / every prompt

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests)
// ---------------------------------------------------------------------------

// Extract the hook script path from a settings.json command string. Commands
// look like `"$CLAUDE_PROJECT_DIR/.claude/hooks/foo.mjs"` or `node ".../foo.mjs"`
// or a python `".../foo.py"`. Returns the first script-looking token, or null.
export function extractHookPath(command) {
  if (typeof command !== "string") return null;
  const m = command.match(/([^\s"'`]+\.(?:mjs|cjs|js|py|sh))\b/);
  return m ? m[1] : null;
}

// Reduce a hook path to a stable key = basename without extension.
export function hookKeyFromPath(p) {
  if (typeof p !== "string" || !p) return null;
  const base = p.split(/[\\/]/).pop() || p;
  return base.replace(/\.(?:mjs|cjs|js|py|sh)$/, "");
}

// Detect a disable/gate knob in a hook's source. Two signals (either suffices):
//  (a) the env NAME carries a gate verb (DISABLE/INJECT/SILENCE/SILENT/MUTE/
//      QUIET/SUPPRESS/SKIP/OFF/WARN), OR
//  (b) ANY `process.env.PRISM_*` compared to "0"/"1" -- the gating idiom --
//      regardless of name. This catches gates whose name lacks a verb, e.g.
//      `PRISM_STALE_STATE_WARN === "0"` or `PRISM_LOCAL_COMPUTE_AUTOSTART !== "0"`.
// (a)-only missed real knobs -> false positives in the knobless list; (b) closes
// that gap. A config var (PRISM_FOO_TIMEOUT_MS, PRISM_WIKI_ROOT) matches NEITHER.
// Uses String.match / matchAll -- no regex.exec loop.
export function detectKnobs(source) {
  if (typeof source !== "string" || !source) return { hasKnob: false, knobs: [] };
  const knobs = new Set();
  const nameVerb = /\bPRISM_[A-Z0-9_]*(?:DISABLE|INJECT|SILENCE|SILENT|MUTE|QUIET|SUPPRESS|SKIP|_OFF|WARN)[A-Z0-9_]*\b/g;
  for (const m of (source.match(nameVerb) || [])) knobs.add(m);
  const idiom = /process\.env\.(PRISM_[A-Z0-9_]+)\s*(?:===|!==|==|!=)\s*["'][01]["']/g;
  for (const m of source.matchAll(idiom)) knobs.add(m[1]);
  const arr = [...knobs].sort();
  return { hasKnob: arr.length > 0, knobs: arr };
}

// Detect whether a hook actually EMITS context (the SessionStart/UPS injection
// contract is `additionalContext` inside `hookSpecificOutput`). A guard / setup
// hook that never emits context is NOT a token-efficiency concern even if it is
// knobless -- so this separates the real token gap from infrastructure noise.
export function emitsContext(source) {
  if (typeof source !== "string" || !source) return false;
  return source.includes("additionalContext") || source.includes("hookSpecificOutput");
}

// Pure: the data-driven ranking weight = bytes emitted x fires/hour. This is the
// real "cut list" signal -- a big injector that fires rarely costs less than a
// small one that fires every prompt. Returns null when either dimension is
// missing (cannot rank without both), 0 when bytes is a known 0 (emits nothing).
export function computeWeight(contextBytes, firesPerHour) {
  if (!Number.isFinite(contextBytes) || !Number.isFinite(firesPerHour)) return null;
  if (contextBytes < 0 || firesPerHour < 0) return null;
  return contextBytes * firesPerHour;
}

// Enumerate injector commands for the given events from a settings object.
export function enumerateInjectors(settings, events = RECURRING_EVENTS) {
  const hooks = (settings && settings.hooks) || {};
  const out = [];
  for (const ev of events) {
    for (const matcher of (hooks[ev] || [])) {
      for (const h of (matcher.hooks || [])) {
        if (!h || typeof h.command !== "string") continue;
        const path = extractHookPath(h.command);
        out.push({ event: ev, command: h.command, path, key: hookKeyFromPath(path) });
      }
    }
  }
  return out;
}

// Build the audit. `readSource(path)` returns the hook source string or null
// (missing/unreadable). `fireRateByKey` maps hook-key -> fires/hour (optional).
// `bytesByKey` maps hook-key -> measured additionalContext bytes (optional; only
// present when probed via --bytes). When both bytes + fire-rate are known, each
// row gets a `weightPerHour = bytes x fires/hr` and `topByWeight` ranks them.
export function buildAudit(injectors, readSource, fireRateByKey = {}, bytesByKey = {}) {
  const rows = injectors.map((inj) => {
    let src = null;
    if (inj.path) { try { src = readSource(inj.path); } catch { src = null; } }
    const knob = detectKnobs(src);
    const sourceMissing = !!inj.path && src == null;
    const fr = inj.key != null ? fireRateByKey[inj.key] : undefined;
    const bytes = inj.key != null ? bytesByKey[inj.key] : undefined;
    const fireRatePerHour = Number.isFinite(fr) ? fr : null;
    const contextBytes = Number.isFinite(bytes) ? bytes : null;
    return {
      event: inj.event,
      key: inj.key,
      path: inj.path,
      hasKnob: knob.hasKnob,
      knobs: knob.knobs,
      emitsContext: emitsContext(src),
      sourceMissing,
      fireRatePerHour,
      contextBytes,
      weightPerHour: computeWeight(contextBytes, fireRatePerHour),
    };
  });
  // Sort: highest fire-rate first (null last), tiebreak by key.
  rows.sort((a, b) =>
    (Number(b.fireRatePerHour || 0) - Number(a.fireRatePerHour || 0)) ||
    String(a.key || "").localeCompare(String(b.key || "")));
  const readable = (r) => !!r.path && !r.sourceMissing;
  // The TRUE token-control gap: context-EMITTING injectors with no disable knob.
  // Knobless guards/setup hooks (no additionalContext) are NOT a token concern --
  // reported separately so the headline number is actionable, not inflated.
  const knobless = rows.filter((r) => readable(r) && !r.hasKnob && r.emitsContext);
  const knoblessGuards = rows.filter((r) => readable(r) && !r.hasKnob && !r.emitsContext);
  const withKnob = rows.filter((r) => r.hasKnob).length;
  const emittingTotal = rows.filter((r) => r.emitsContext).length;
  const unresolved = rows.filter((r) => !readable(r)).length;
  const bytesProbed = rows.some((r) => r.contextBytes != null);
  // The PRIMARY cut list: injectors ranked by raw emitted bytes (the dominant
  // signal -- "we auto-inject a bunch of context" is about size). Available for
  // every probed row, so it stays useful even when fire-rate data is sparse.
  const topByBytes = rows
    .filter((r) => Number.isFinite(r.contextBytes) && r.contextBytes > 0)
    .sort((a, b) => b.contextBytes - a.contextBytes)
    .slice(0, 15);
  // The REFINED cut list: bytes x fires/hr (a small injector that fires every
  // prompt can cost more than a big rare one). Only rows with BOTH dims appear --
  // empty until the fire-counter instruments the probed hooks.
  const topByWeight = rows
    .filter((r) => r.weightPerHour != null && r.weightPerHour > 0)
    .sort((a, b) => b.weightPerHour - a.weightPerHour)
    .slice(0, 15);
  const byEvent = {};
  for (const r of rows) {
    const e = (byEvent[r.event] ||= { total: 0, withKnob: 0, knobless: 0 });
    e.total++;
    if (r.hasKnob) e.withKnob++;
    else if (readable(r) && r.emitsContext) e.knobless++;
  }
  return {
    recurringTotal: rows.length,
    emittingTotal,
    withKnob,
    knoblessCount: knobless.length,
    knoblessGuardsCount: knoblessGuards.length,
    unresolved,
    knobCoveragePct: rows.length ? Math.round((withKnob / rows.length) * 1000) / 10 : 0,
    bytesProbed,
    byEvent,
    knobless,
    knoblessGuards,
    topByBytes,
    topByWeight,
    rows,
  };
}

// ---------------------------------------------------------------------------
// I/O + CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = { json: false, settings: DEFAULT_SETTINGS, ledger: DEFAULT_LEDGER, noFireRate: false, bytes: false, probe: PROBE_PROMPT_DEFAULT, events: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--no-fire-rate") out.noFireRate = true;
    else if (a === "--bytes") out.bytes = true;
    else if (a === "--probe") out.probe = argv[++i];
    else if (a === "--settings") out.settings = argv[++i];
    else if (a === "--ledger") out.ledger = argv[++i];
    else if (a === "--event") (out.events ||= []).push(argv[++i]);
    else if (a === "--help" || a === "-h") { printHelp(); process.exit(0); }
    else { console.error(`unknown flag: ${a}`); process.exit(2); }
  }
  return out;
}

function printHelp() {
  console.log(`audit-injection-surface.mjs -- recurring auto-injection surface census + knob coverage

Flags:
  --json            emit JSON
  --bytes           probe each injector for REAL emitted bytes -> bytes x fires/hr rank (RUNS each hook; slow)
  --probe TEXT      probe prompt to drive realistic emissions (default a representative prompt; bytes are a LOWER bound)
  --event NAME      audit a specific hook event (repeatable; default SessionStart + UserPromptSubmit)
  --settings PATH   override settings.json (default ${DEFAULT_SETTINGS})
  --ledger PATH     override hook-fire ledger
  --no-fire-rate    skip the fire-rate ledger join (fast, knob-only -- no weight)`);
}

// I/O: probe every injector once for its real emitted bytes. Reuses the proven
// U-MWO08 probeHook. Returns a key -> bytes map. Resolves each hook path against
// the repo root (same as readSourceFromRepo) so $CLAUDE_PROJECT_DIR commands run.
function probeBytesByKey(injectors, probePrompt = PROBE_PROMPT_DEFAULT) {
  const map = {};
  for (const inj of injectors) {
    if (!inj.path || inj.key == null || map[inj.key] != null) continue;
    const resolved = inj.path
      .replace(/\$CLAUDE_PROJECT_DIR/g, REPO_ROOT)
      .replace(/\$\{CLAUDE_PROJECT_DIR\}/g, REPO_ROOT);
    const target = existsSync(resolved) ? resolved : resolve(REPO_ROOT, resolved);
    if (!existsSync(target)) continue;
    const res = probeHook(target, probePrompt);
    if (res && res.ok) map[inj.key] = res.contextBytes;
  }
  return map;
}

function readSourceFromRepo(p) {
  // Resolve $CLAUDE_PROJECT_DIR -> repo root, then read. Returns null on miss.
  const resolved = p.replace(/\$CLAUDE_PROJECT_DIR/g, REPO_ROOT).replace(/\$\{CLAUDE_PROJECT_DIR\}/g, REPO_ROOT);
  const candidates = [resolved, resolve(REPO_ROOT, resolved)];
  for (const c of candidates) {
    try { if (existsSync(c)) return readFileSync(c, "utf8"); } catch { /* next */ }
  }
  return null;
}

function loadFireRateByKey(ledgerPath) {
  try {
    if (!existsSync(ledgerPath)) return {};
    const { events } = parseLedger(readFileSync(ledgerPath, "utf8"));
    const agg = aggregateFires(events, undefined);
    const map = {};
    for (const h of agg.perHook) {
      // ledger logs hook by basename (with or without ext) -> normalize to key
      const key = hookKeyFromPath(h.hook) || h.hook;
      map[key] = h.fire_rate_per_hour;
    }
    return map;
  } catch { return {}; }
}

function renderText(audit, events) {
  const lines = [];
  lines.push("--- Auto-Injection Surface Census (knob coverage) ---");
  lines.push(`Events: ${events.join(" + ")}`);
  lines.push(`Recurring injectors: ${audit.recurringTotal}  ·  context-emitting: ${audit.emittingTotal}  ·  with disable knob: ${audit.withKnob} (${audit.knobCoveragePct}%)  ·  KNOBLESS context-injectors: ${audit.knoblessCount}  ·  knobless guards (no context, OK): ${audit.knoblessGuardsCount}  ·  unresolved: ${audit.unresolved}`);
  for (const [ev, e] of Object.entries(audit.byEvent)) {
    lines.push(`  ${ev}: ${e.total} total, ${e.withKnob} gated, ${e.knobless} knobless-context-injectors`);
  }
  lines.push("");
  if (audit.knobless.length === 0) {
    lines.push("KNOBLESS context-injectors: none -- every context-emitting recurring injector has a disable knob.");
  } else {
    lines.push(`KNOBLESS context-injectors (${audit.knobless.length}) -- EMIT context every ${events.join("/")} with NO way to silence (the token-control gap, sorted by fires/hr):`);
    for (const r of audit.knobless) {
      const fr = r.fireRatePerHour != null ? `${r.fireRatePerHour.toFixed(1)}/hr` : "n/a";
      lines.push(`  [${r.event}] ${r.key}  (${fr})`);
    }
  }
  if (audit.bytesProbed) {
    lines.push("");
    if (audit.topByBytes.length === 0) {
      lines.push("CUT LIST (by bytes): no injector emitted bytes on this probe -- all are keyword/state gated. Try --probe \"<a realistic prompt>\".");
    } else {
      lines.push(`CUT LIST by emitted bytes -- top ${audit.topByBytes.length} (measured lower-bound on this probe; biggest auto-injected payload first):`);
      for (const r of audit.topByBytes) {
        const knobTag = r.hasKnob ? "gated" : "KNOBLESS";
        lines.push(`  [${r.event}] ${r.key}  ${r.contextBytes}B  (${knobTag})`);
      }
    }
    if (audit.topByWeight.length > 0) {
      lines.push("");
      lines.push(`REFINED by bytes x fires/hr -- top ${audit.topByWeight.length} (only hooks with fire-counter data):`);
      for (const r of audit.topByWeight) {
        const knobTag = r.hasKnob ? "gated" : "KNOBLESS";
        lines.push(`  [${r.event}] ${r.key}  ${r.contextBytes}B x ${r.fireRatePerHour.toFixed(1)}/hr = ${Math.round(r.weightPerHour)} B/hr  (${knobTag})`);
      }
    }
  } else {
    lines.push("");
    lines.push("(run with --bytes to probe real emitted bytes and rank the cut list -- by bytes, refined by bytes x fires/hr)");
  }
  return lines.join("\n");
}

function isMain() {
  return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) {
  const opts = parseArgs(process.argv.slice(2));
  const events = opts.events || RECURRING_EVENTS;
  let settings;
  try { settings = JSON.parse(readFileSync(opts.settings, "utf8")); }
  catch (err) { console.error(`settings read failed (${opts.settings}): ${err instanceof Error ? err.message : err}`); process.exit(2); }
  const injectors = enumerateInjectors(settings, events);
  const fireRateByKey = opts.noFireRate ? {} : loadFireRateByKey(opts.ledger);
  const bytesByKey = opts.bytes ? probeBytesByKey(injectors, opts.probe) : {};
  const audit = buildAudit(injectors, readSourceFromRepo, fireRateByKey, bytesByKey);
  if (opts.json) {
    process.stdout.write(JSON.stringify({ schemaVersion: 1, events, ...audit }, null, 2) + "\n");
  } else {
    process.stdout.write(renderText(audit, events) + "\n");
  }
  process.exit(0);
}
