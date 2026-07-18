/**
 * v11-wear-memory-magazine.mjs — cross-program tool-life ledger.
 *
 * Today: operators track tool wear in Excel (or not at all → premature
 * breakage). This pure-fn library is the persistence-shaped substrate the
 * v11 magazine integrity gate (iter24) and the operator-side replacement
 * advisor consume. Carries each tool's cumulative cut-minutes + job-count
 * across programs, sessions, and shop-PC restarts.
 *
 * ROI: tier-A novel invention, $9K/mo at JM Die typical mix —
 * (a) prevents 2-4 premature broken-endmill events/mo ($1.5K each in
 *     scrap + downtime + emergency reorder), and
 * (b) flags sister-tool rotation BEFORE the primary actually fails, so
 *     production never stops cold mid-cycle.
 *
 * Pure functions only. State is plain JSON (caller persists where it
 * wants — disk, DB, MES, ERP).
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-NOVEL-WEAR-MEMORY-MAGAZINE
 * @slot echo · @iter 28 · @date 2026-05-27
 */

export const WEAR_STATE_SCHEMA_VERSION = 1;
export const DEFAULT_REPLACE_THRESHOLD = 0.85;
export const DEFAULT_LIFE_EXPECT_MIN = 60;

/** Pure: build an empty magazine wear state from a tool registry. */
export function createMagazineState(args) {
  const a = args || {};
  const tools = Array.isArray(a.tools) ? a.tools : [];
  const out = {};
  for (const t of tools) {
    if (!t || t.toolNumber == null) continue;
    const tn = Number(t.toolNumber);
    if (!Number.isFinite(tn) || tn <= 0) continue;
    const key = "T" + Math.floor(tn);
    out[key] = {
      toolNumber: Math.floor(tn),
      pocket: Number.isFinite(Number(t.pocket)) ? Math.floor(Number(t.pocket)) : null,
      totalUsageMin: Number.isFinite(Number(t.totalUsageMin)) ? Number(t.totalUsageMin) : 0,
      jobCount: Number.isFinite(Number(t.jobCount)) ? Math.floor(Number(t.jobCount)) : 0,
      lifeExpectMin: Number.isFinite(Number(t.lifeExpectMin)) && Number(t.lifeExpectMin) > 0
        ? Number(t.lifeExpectMin)
        : DEFAULT_LIFE_EXPECT_MIN,
      sister_pocket: t.sister_pocket != null && Number.isFinite(Number(t.sister_pocket))
        ? Math.floor(Number(t.sister_pocket))
        : null,
      lastUsedAtIso: typeof t.lastUsedAtIso === "string" ? t.lastUsedAtIso : null,
    };
  }
  return { schemaVersion: WEAR_STATE_SCHEMA_VERSION, tools: out };
}

/** Pure: record a cut event for one tool (immutable — returns new state). */
export function recordCutEvent(state, event) {
  if (!state || !state.tools || !event) return state;
  const tn = Number(event.toolNumber);
  if (!Number.isFinite(tn) || tn <= 0) return state;
  const cut = Number(event.cutMinutes);
  if (!Number.isFinite(cut) || cut < 0) return state;
  const key = "T" + Math.floor(tn);
  const prev = state.tools[key];
  if (!prev) return state;
  const next = {
    ...prev,
    totalUsageMin: prev.totalUsageMin + cut,
    jobCount: prev.jobCount + 1,
    lastUsedAtIso: typeof event.timestampIso === "string"
      ? event.timestampIso
      : prev.lastUsedAtIso,
  };
  return { ...state, tools: { ...state.tools, [key]: next } };
}

/** Pure: 0..1+ life fraction (>1 means overdue). */
export function lifeFraction(toolEntry) {
  if (!toolEntry) return null;
  const used = Number(toolEntry.totalUsageMin);
  const expect = Number(toolEntry.lifeExpectMin);
  if (!Number.isFinite(used) || !Number.isFinite(expect) || expect <= 0) return null;
  return used / expect;
}

/** Pure: minutes of expected life remaining (0 if exhausted). */
export function projectRemainingMinutes(toolEntry) {
  if (!toolEntry) return null;
  const used = Number(toolEntry.totalUsageMin);
  const expect = Number(toolEntry.lifeExpectMin);
  if (!Number.isFinite(used) || !Number.isFinite(expect)) return null;
  const remaining = expect - used;
  return remaining > 0 ? remaining : 0;
}

/** Pure: list of T# at-or-above replacement threshold (sorted descending by lifeFraction). */
export function flagForReplacement(state, options) {
  if (!state || !state.tools) return [];
  const opts = options || {};
  const threshold = Number.isFinite(Number(opts.threshold))
    ? Number(opts.threshold)
    : DEFAULT_REPLACE_THRESHOLD;
  const flagged = [];
  for (const key of Object.keys(state.tools)) {
    const entry = state.tools[key];
    const lf = lifeFraction(entry);
    if (lf == null) continue;
    if (lf >= threshold) {
      flagged.push({
        toolNumber: entry.toolNumber,
        pocket: entry.pocket,
        lifeFraction: lf,
        remainingMin: projectRemainingMinutes(entry),
        sister_pocket: entry.sister_pocket,
        hasSister: entry.sister_pocket != null,
      });
    }
  }
  flagged.sort((a, b) => b.lifeFraction - a.lifeFraction);
  return flagged;
}

/** Pure: register a sister-tool pocket for primary T#. */
export function assignSisterRotation(state, primaryToolNumber, sisterPocket) {
  if (!state || !state.tools) return state;
  const tn = Number(primaryToolNumber);
  if (!Number.isFinite(tn) || tn <= 0) return state;
  const sp = Number(sisterPocket);
  if (!Number.isFinite(sp) || sp <= 0) return state;
  const key = "T" + Math.floor(tn);
  const prev = state.tools[key];
  if (!prev) return state;
  return {
    ...state,
    tools: { ...state.tools, [key]: { ...prev, sister_pocket: Math.floor(sp) } },
  };
}

/** Pure: aggregate summary across the magazine. */
export function summarize(state) {
  const base = {
    schemaVersion: state && state.schemaVersion ? state.schemaVersion : 0,
    activeTools: 0,
    totalUsageMin: 0,
    totalJobCount: 0,
    flaggedCount: 0,
    sisterAssignmentsCount: 0,
    avgLifeFraction: 0,
  };
  if (!state || !state.tools) return base;
  let sumLf = 0;
  let countedLf = 0;
  for (const key of Object.keys(state.tools)) {
    const e = state.tools[key];
    base.activeTools++;
    base.totalUsageMin += Number(e.totalUsageMin) || 0;
    base.totalJobCount += Number(e.jobCount) || 0;
    if (e.sister_pocket != null) base.sisterAssignmentsCount++;
    const lf = lifeFraction(e);
    if (lf != null) {
      sumLf += lf;
      countedLf++;
      if (lf >= DEFAULT_REPLACE_THRESHOLD) base.flaggedCount++;
    }
  }
  base.avgLifeFraction = countedLf > 0 ? sumLf / countedLf : 0;
  return base;
}

/** Pure: render an operator-readable .cps comment block summarizing flagged tools. */
export function renderReplacementAdvisory(state, options) {
  const flagged = flagForReplacement(state, options);
  const lines = ["(===== PRISM WEAR-MEMORY ADVISORY =====)"];
  if (flagged.length === 0) {
    lines.push("(  all tools below replacement threshold)");
  } else {
    lines.push(`(  ${flagged.length} tool(s) at or above replacement threshold)`);
    for (const f of flagged) {
      const sister = f.hasSister ? `sister=T@P${f.sister_pocket}` : "NO SISTER — register one";
      const lfPct = (f.lifeFraction * 100).toFixed(1);
      const rem = f.remainingMin.toFixed(1);
      lines.push(`(  T${f.toolNumber} P${f.pocket || "?"}: life=${lfPct}% remaining=${rem}min ${sister})`);
    }
  }
  lines.push("(=======================================)");
  return lines.join("\n");
}
