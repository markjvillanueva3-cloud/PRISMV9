#!/usr/bin/env node
// scripts/lib/path-derive.mjs — WORKING-PATH-CAPTURE-MS0 / U-WPC-DERIVE-ALLDOMAINS (alpha, 2026-05-31).
//
// "Wire it to ALL DOMAINS" without touching any domain's engine: every slot's tool-actions are ALREADY
// recorded fleet-wide in india's OutcomeFeedbackBus (`state/shared/outcome-bus.jsonl`) by
// `.claude/hooks/outcome-bus-auto-tap.mjs` (it taps every Edit/Write/Bash with {slot, domain, tool,
// success, hint, ts, session_id}). That stream IS every domain's plotted path. This deriver HARVESTS
// proven working-paths from it — segmenting each session's trajectory by COMMIT boundaries (a
// `git commit` of a `[SCOPE]/U-ID` unit = a completed goal), so the action sequence leading to each
// commit becomes a captured WorkingPath. Result: delta(CAD), kilo(CAM), and every other domain get
// working-path capture for free, from the shared bus — no cross-domain wiring required.
//
// REUSE (R8): consumes the bus `outcome-bus-auto-tap` produces; captures via path-ledger's
// `captureWorkingPath` (passing derived steps). PURE-core deriver + a thin `apply`; fail-soft.
//
// Advisory: a derived path is a HYPOTHESIS (the inter-commit action sequence); it is captured with the
// commit subject as the goal so a human/india can later validate it replayed correctly (mustHumanVerify
// semantics — like the other advisory ledgers).

import { captureWorkingPath } from "./path-ledger.mjs";

// A commit row marks a goal boundary: a successful Bash `git commit`. The commit subject (in the hint,
// truncated to ~200 chars by the auto-tap) carries the `[SCOPE]/U-ID` we use as goalType.
export function isCommitRow(row) {
  return !!(row && row.tool === "Bash" && row.success === true && /git\s+commit/i.test(String(row.hint || "")));
}

const BOILERPLATE_SCOPES = new Set(["MAIN", "BOOTSTRAP-SLOT-ENFORCE", "OBSIDIAN-BRAIN"]);

// Extract a goalType from a commit hint. Hardened (scrutiny P1, 2026-05-31): the auto-tap truncates
// the command to 200 chars, and real commits lead with a long `[MAIN] [BOOTSTRAP-SLOT-ENFORCE]
// [OBSIDIAN-BRAIN]/U-ID` prefix — so a naive `U-…` match clips the id (~20% of real rows) and a
// composite `git add …U-X && git commit …U-Y` would bind the WRONG (add-side) id. Both produce a
// false dedup/retrieval key. Fix: (1) anchor AFTER the `commit` keyword; (2) a COMPLETE U-ID is
// followed by a delimiter (`[SCOPE]/U-ID:` format), so require one; (3) a U-ID running to the very
// end of the (truncated) hint is CLIPPED → return "commit-truncated" so the caller skips it rather
// than persist a mangled key. Order: U-ID → non-boilerplate [SCOPE] → "commit".
export function goalTypeFromCommit(hint) {
  const s = String(hint || "");
  const ci = s.search(/git\s+commit/i);
  const tail = ci >= 0 ? s.slice(ci) : s; // ignore an add-side U-ID before the commit
  const complete = tail.match(/\b(U-[A-Z0-9][A-Z0-9-]*?)(?=[:\]\s"',)])/); // U-ID + trailing delimiter = not clipped
  if (complete) return complete[1];
  if (/\bU-[A-Z0-9][A-Z0-9-]*$/.test(tail)) return "commit-truncated"; // ran to end-of-hint → clipped
  const scopes = [...tail.matchAll(/\[([A-Z][A-Z0-9_-]{1,40})\]/g)].map((m) => m[1])
    .filter((x) => !BOILERPLATE_SCOPES.has(x));
  return scopes[0] || "commit";
}

/**
 * Derive candidate working-paths from a flat array of outcome-bus rows. Pure.
 * Groups by session_id, orders by ts, and on each commit row emits the accumulated action sequence
 * (since the prior commit) as a WorkingPath candidate keyed by (domain, goalType-from-commit).
 * @returns {Array<{domain,goalType,goal,steps,outcome,sourceSession}>}
 */
export function deriveWorkingPaths(rows, opts = {}) {
  const minSteps = Number.isFinite(opts.minSteps) ? opts.minSteps : 1;
  const valid = (Array.isArray(rows) ? rows : []).filter(
    (r) => r && typeof r === "object" && r.session_id && r.tool && r.ts,
  );
  // group by session
  const bySession = new Map();
  for (const r of valid) {
    if (!bySession.has(r.session_id)) bySession.set(r.session_id, []);
    bySession.get(r.session_id).push(r);
  }
  const out = [];
  for (const [sid, srows] of bySession) {
    srows.sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
    let acc = [];
    let seq = 0;
    for (const r of srows) {
      if (isCommitRow(r)) {
        if (acc.length >= minSteps) {
          // domain = most-common domain among the segment's steps (fall back to the commit's domain)
          const domain = mostCommon(acc.map((s) => s.domain).filter(Boolean)) || r.domain || "unknown";
          out.push({
            domain,
            goalType: goalTypeFromCommit(r.hint),
            goal: String(r.hint || "").replace(/^cmd:/, "").slice(0, 200),
            steps: acc.map((s, i) => ({ seq: i, action: `${s.tool}:${s.success ? "ok" : "fail"}`, argsDigest: shortHint(s.hint) })),
            outcome: { success: true },
            sourceSession: sid,
          });
        }
        acc = []; seq = 0;
      } else {
        acc.push({ tool: r.tool, success: r.success, hint: r.hint, domain: r.domain }); seq++;
      }
    }
    // trailing un-committed actions are NOT a completed goal → discarded (no commit boundary).
  }
  return out;
}

function mostCommon(arr) {
  if (!arr.length) return null;
  const c = new Map();
  for (const x of arr) c.set(x, (c.get(x) || 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function shortHint(hint) {
  const s = String(hint || "");
  // keep a stable short fingerprint (path tail or cmd head), no secrets
  if (s.startsWith("path:")) return "path:" + s.slice(5).split(/[\\/]/).pop().slice(0, 40);
  if (s.startsWith("cmd:")) return "cmd:" + s.slice(4).trim().split(/\s+/).slice(0, 3).join(" ").slice(0, 40);
  return s.slice(0, 40);
}

/**
 * Capture derived candidates into the path-ledger (via captureWorkingPath with injected steps).
 * Idempotent by path-ledger's own dedup (domain::goalType::stepsHash). Fail-soft per-candidate.
 * @returns {{captured:number, deduped:number, skipped:number, total:number}}
 */
export function applyDerived(candidates, opts = {}) {
  const roots = opts.roots;
  let captured = 0, deduped = 0, skipped = 0, truncated = 0;
  for (const c of (Array.isArray(candidates) ? candidates : [])) {
    // A clipped commit hint yields no reliable key — skip it (surfaced as `truncated`, not silent — R12)
    // rather than persisting a mangled goalType that pollutes the dedup/retrieval space.
    if (c.goalType === "commit-truncated") { truncated++; continue; }
    const pathId = `derive-${(c.sourceSession || "x").slice(0, 24)}-${c.goalType}`.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120);
    const r = captureWorkingPath(pathId, {
      domain: c.domain, goalType: c.goalType, goal: c.goal, outcome: c.outcome,
      score: 0.5, sessionId: c.sourceSession, // derived paths start at 0.5 (hypothesis); replay-success raises it
      provenance: "derived", // mark as a harvested hypothesis, NOT an explicitly-proven path
    }, { steps: c.steps, roots });
    if (r.captured && r.deduped) deduped++;
    else if (r.captured) captured++;
    else skipped++;
  }
  return { captured, deduped, skipped, truncated, total: (Array.isArray(candidates) ? candidates.length : 0) };
}
