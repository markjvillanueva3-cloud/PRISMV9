/**
 * octopus-consensus-query.mjs -- pure query projection of the octopus
 * multi-model consensus audit log (slot:sierra, U-VIZ-OCTOPUS-QUERY 2026-06-22).
 *
 * The octopus (MultiModelConsensusEngine.ask) writes every fleet consensus
 * DECISION to mcp-server/data/state/consensus-decisions.jsonl. U-OCTOPUS-AUDIT-VIZ
 * (2026-06-21) surfaced those decisions as /system-viz roost NODES, but there was
 * no cheap QUERY path -- to ask "what has the octopus decided / which engines use
 * consensus / what is the agreement rate" a caller had to load the graph or call
 * the MCP dispatcher (aiReasoning:consensus_audit_query), which returns RAW records
 * with no aggregation and requires the MCP server up.
 *
 * This lib is the QUERY-SUMMARY projection (a flat answerable aggregate), distinct
 * from `generateAuditLog` in generate-octopus-consensus-features.mjs (the ROOST
 * projection -- viz-shaped nodes) and from ConsensusAuditLogEngine.read (raw rows).
 * All three consume the SAME single-sourced JSONL; only the projection differs
 * (R7: orthogonal views, not a conflict). Consumed by `system-viz-query.mjs octopus`
 * (cheap short-circuit + MCP-DOWN sibling -- reads the ~0.5MB JSONL, never the graph).
 *
 * Pure + deterministic: aggregateConsensus(records, opts) -> summary. No file IO,
 * no Date.now (ISO `ts` strings sort lexically = chronologically, matching the
 * roost generator's `String(b.ts) > String(a.ts)` recency rule).
 */

/** Pure: canonical caller name (matches the roost generator's "unknown" fallback). */
export function callerName(r) {
  return r && typeof r.callerEngine === "string" && r.callerEngine ? r.callerEngine : "unknown";
}

function isFiniteNum(x) {
  return typeof x === "number" && Number.isFinite(x);
}

/** Pure: human-safe final-decision text. */
export function decisionText(d) {
  return typeof d === "string" && d ? d : "(no-decision)";
}

/**
 * Pure: aggregate the consensus-decision records into an answerable summary.
 *
 * @param {Array<object>} records   parsed consensus-decisions JSONL rows
 * @param {{caller?: string}} opts   optional case-insensitive callerEngine filter
 * @returns {{
 *   total: number,
 *   callerFilter: string|null,
 *   callers: Array<{caller:string,count:number,avgAgreement:number|null,latest:{ts:string,finalDecision:string}|null}>,
 *   voices: string[],
 *   avgAgreement: number|null,
 *   latest: {ts:string,caller:string,finalDecision:string,agreement:number|null}|null
 * }}
 */
export function aggregateConsensus(records, opts = {}) {
  const all = (Array.isArray(records) ? records : []).filter((r) => r && typeof r === "object");
  const callerFilter =
    typeof opts.caller === "string" && opts.caller ? opts.caller.toLowerCase() : null;
  const recs = callerFilter
    ? all.filter((r) => callerName(r).toLowerCase() === callerFilter)
    : all;

  const byCaller = new Map();
  const allVoices = new Set();
  let agreeSum = 0;
  let agreeN = 0;
  let latest = null;
  for (const r of recs) {
    const caller = callerName(r);
    if (!byCaller.has(caller)) byCaller.set(caller, []);
    byCaller.get(caller).push(r);
    if (Array.isArray(r.voices)) for (const v of r.voices) if (typeof v === "string" && v) allVoices.add(v);
    if (isFiniteNum(r.agreement)) {
      agreeSum += r.agreement;
      agreeN++;
    }
    if (latest === null || String(r.ts) > String(latest.ts)) latest = r;
  }

  const callers = [...byCaller.entries()]
    .map(([caller, list]) => {
      let cSum = 0;
      let cN = 0;
      let cLatest = null;
      for (const r of list) {
        if (isFiniteNum(r.agreement)) {
          cSum += r.agreement;
          cN++;
        }
        if (cLatest === null || String(r.ts) > String(cLatest.ts)) cLatest = r;
      }
      return {
        caller,
        count: list.length,
        avgAgreement: cN > 0 ? cSum / cN : null,
        latest: cLatest ? { ts: cLatest.ts, finalDecision: decisionText(cLatest.finalDecision) } : null,
      };
    })
    // Most-active caller first; tie-break by name for deterministic ordering.
    .sort((a, b) => b.count - a.count || a.caller.localeCompare(b.caller));

  return {
    total: recs.length,
    callerFilter,
    callers,
    voices: [...allVoices].sort(),
    avgAgreement: agreeN > 0 ? agreeSum / agreeN : null,
    latest: latest
      ? {
          ts: latest.ts,
          caller: callerName(latest),
          finalDecision: decisionText(latest.finalDecision),
          agreement: isFiniteNum(latest.agreement) ? latest.agreement : null,
        }
      : null,
  };
}

/** Pure: render the aggregate as compact human-readable lines. */
export function formatConsensus(agg) {
  const lines = [];
  const avg = agg.avgAgreement !== null ? agg.avgAgreement.toFixed(2) : "n/a";
  const scope = agg.callerFilter ? ` (caller=${agg.callerFilter})` : "";
  lines.push(`octopus consensus${scope}: ${agg.total} decision(s) | ${agg.callers.length} caller(s) | avg agreement ${avg} | ${agg.voices.length} voice(s)`);
  if (agg.voices.length) lines.push(`  voices: ${agg.voices.join(", ")}`);
  for (const c of agg.callers) {
    const cAvg = c.avgAgreement !== null ? c.avgAgreement.toFixed(2) : "n/a";
    // First line only -- a multi-line finalDecision would otherwise bleed across
    // the one-line-per-caller format (matches the .split("\n")[0] idiom used
    // throughout system-viz-query.mjs). JSON output keeps the full text.
    const dec = c.latest ? String(c.latest.finalDecision).split("\n")[0] : "(none)";
    lines.push(`  - ${c.caller}: ${c.count} decision(s), avg agreement ${cAvg}, latest: ${dec}`);
  }
  if (agg.latest) {
    const lastDec = String(agg.latest.finalDecision).split("\n")[0];
    lines.push(`  latest overall: [${agg.latest.ts}] ${agg.latest.caller} -> ${lastDec} (agreement ${agg.latest.agreement ?? "n/a"})`);
  }
  return lines.join("\n");
}
