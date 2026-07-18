#!/usr/bin/env node
/**
 * zulu-build-queue.mjs -- pure build-queue reader/selector for the ZULU autonomous
 * build-loop orchestrator (slot:zulu, 2026-06-15, U-ZULU-BUILDLOOP INCR 1).
 *
 * WHY: the operator wants "autonomous continuous building". The build-loop driver
 * (INCR 2) needs to know WHAT to build next. This is the verifiable pure core (R13):
 * given the capability spec (C-units) + the bravo brief (which units already shipped)
 * it computes the ranked PENDING queue + the next unit -- no I/O side effects, fully
 * testable. The driver layers cron / Ollama-ranking / gated build-spawn on top.
 *
 * SAFETY: pure functions only. Governance-class units are surfaced as BLOCKED
 * (operator-gated), never auto-queued for an unsupervised build.
 *
 * ASCII-only source. No child_process / shell / network -- pure text transforms.
 * (Markdown sources may contain an em-dash; matched via the EMDASH constant, built
 *  from a char-code so this source file stays pure ASCII.)
 */

const EMDASH = String.fromCharCode(0x2014); // em-dash, for matching markdown spec/brief

/** Effort ordering: S(mall) before M(edium) before L(arge); unknown last. Pure. */
export function effortRank(effort) {
  const e = String(effort || "").trim().toUpperCase();
  const order = { S: 0, M: 1, L: 2 };
  return e in order ? order[e] : 3;
}

/** Numeric id from a "C7" style id (for stable secondary sort). Pure. */
export function idNum(id) {
  const m = String(id || "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 9999;
}

/** Pull an S/M/L effort token from a candidate block. Pure. */
export function parseEffort(block) {
  const t = String(block || "");
  // Matches: "Est-effort:** S" | "Est-effort: M" | "(effort L)" | "(S --" | "(M)" | "(S <emdash>"
  const closeClass = new RegExp("\\(([SML])\\s*[-)" + EMDASH + "]");
  const m =
    t.match(/Est-?effort:?\**\s*([SML])\b/i) ||
    t.match(/\(effort\s+([SML])\b/i) ||
    t.match(closeClass);
  return m ? m[1].toUpperCase() : "";
}

/**
 * Parse capability-spec candidate headers "### C4 -- Delegation Contract Engine".
 * Returns [{ id, title, effort }]. effort pulled from a nearby effort token within
 * the candidate block. Pure over text (uses matchAll, no RegExp.exec loop).
 */
export function parseCapabilitySpec(specText) {
  const text = String(specText || "");
  const headRe = new RegExp("^###\\s+(C\\d+)\\b[ \\t]*[-" + EMDASH + "]*[ \\t]*(.*)$", "gm");
  const heads = [];
  for (const m of text.matchAll(headRe)) {
    heads.push({ id: m[1], title: (m[2] || "").trim(), start: m.index });
  }
  const out = [];
  for (let i = 0; i < heads.length; i++) {
    const end = i + 1 < heads.length ? heads[i + 1].start : text.length;
    const block = text.slice(heads[i].start, end);
    out.push({ id: heads[i].id, title: heads[i].title, effort: parseEffort(block) });
  }
  return out;
}

/**
 * Parse the bravo brief's "## SHIPPED" section for already-built unit ids
 * (C1/C2/C3...). Two guards prevent a not-yet-built unit from being miscounted:
 *  1. only the slice UNDER a "SHIPPED" heading is scanned (a candidate in the
 *     REMAINING queue never counts); and
 *  2. a unit id only counts when it sits at a BULLET-HEADER position
 *     (`- **C8 EngineName**` / `- C8: ...`), NOT in inline prose -- so a sentence
 *     like "over_claim is the C8 signal" or a summary "C5+C6+C7+C8 build-complete"
 *     in a shipped unit's description never falsely marks C8 as done.
 * Pure.
 */
export function parseShipped(briefText) {
  const text = String(briefText || "");
  const shipped = new Set();
  // Slice from the SHIPPED heading up to the next "## " heading (or end-of-text).
  const m = text.match(/##[^\n]*SHIPPED[\s\S]*?(?=\n##\s|$)/i);
  if (!m) return shipped;
  // Match C<n> only at a bullet-header start (after a "-"/"*" bullet + optional
  // "**" bold), never mid-line prose. The leading (?:^|\n) anchors to a line start.
  for (const idm of m[0].matchAll(/(?:^|\n)\s*[-*]\s+\*{0,2}C(\d+)\b/g)) shipped.add("C" + idm[1]);
  return shipped;
}

/**
 * Parse shipped unit ids from GIT COMMIT SUBJECTS -- the reality-grounded shipped
 * signal (operator 2026-06-16: "engineered crons running optimally"). The brief's
 * "## SHIPPED" prose DRIFTS or goes missing (live: the bravo brief was unreadable
 * while C1-C8 were genuinely shipped, so parseShipped saw 0 and the pointer falsely
 * showed the whole queue pending). Commit subjects do NOT drift -- a shipped zulu
 * capability unit lands as `U-ZBL-C<n>...`, `U-ZULU-CAP-C<n>[C<n>...]` (the combined
 * form, e.g. `U-ZULU-CAP-C1C2C3`, ships several at once), OR -- for the Hermes capability
 * arc C1-C5 -- under the `[HERMES-CAPABILITY-C<n>]/U-C<n>-<slug>` scope. All three are
 * recognized. Sibling lesson to the parseShipped prose-miscount regression: prove shipped
 * by REALITY, not prose. Pure over the passed `git log --oneline` text.
 */
export function parseShippedFromCommits(gitLogText) {
  const text = String(gitLogText || "");
  const shipped = new Set();
  for (const line of text.split("\n")) {
    // A REVERT commit UN-ships the unit -- `Revert "U-ZBL-C8 ..."` must NOT mark C8
    // shipped (else the loop skips re-building a genuinely-reverted unit). Anchored to
    // the `git log --oneline` shape (`<hash> Revert ...`) so the word "revert" appearing
    // mid-subject in prose (e.g. `U-ZBL-C9 add revert-safety`) is NOT dropped. Per-line
    // so one revert never suppresses a real ship on another line.
    if (/^\S+\s+revert\b/i.test(line)) continue;
    // U-ZBL-C<n>  OR  U-ZULU-CAP-C<n>(C<n>)*  -- case-insensitive; capture the C-run then
    // split it so a combined `C1C2C3` marks C1, C2 AND C3.
    for (const m of line.matchAll(/U-Z(?:BL|ULU-CAP)-((?:C\d+)+)/gi)) {
      for (const cm of m[1].matchAll(/C(\d+)/gi)) shipped.add("C" + cm[1]);
    }
    // The Hermes capability arc (C1-C5) ships under the `[HERMES-CAPABILITY-C<n>]/U-C<n>-<slug>`
    // subject format (NOT U-ZBL/U-ZULU-CAP), so detect that scope too -- otherwise the loop
    // never sees C1-C5 as shipped and perpetually re-drives an already-built queue (the exact
    // false-pending class this function exists to kill, just a different subject shape). Anchored
    // to the HERMES-CAPABILITY scope so an unrelated `U-C<n>` unit from another galaxy can never
    // false-mark a capability id. One C-unit per commit (no combined `C1C2` form here).
    for (const m of line.matchAll(/HERMES-CAPABILITY-C(\d+)\b/gi)) {
      shipped.add("C" + m[1]);
    }
  }
  return shipped;
}

/**
 * Compute the build queue from candidates + a shipped-id set.
 * - done: candidates whose id is in `shipped`.
 * - blocked: candidates marked governance/operator-gated (never auto-queued).
 * - pending: the rest, ranked effort(S<M<L<unknown) then numeric id.
 * Returns { done, pending, blocked, next }. Pure.
 */
export function computeQueue(candidates, shipped, opts = {}) {
  const shippedSet = shipped instanceof Set ? shipped : new Set(shipped || []);
  const gated = opts.gatedPattern || /governance|operator-gated|fleet-control/i;
  const list = Array.isArray(candidates) ? candidates.filter((c) => c && c.id) : [];
  const done = [];
  const blocked = [];
  const pending = [];
  for (const c of list) {
    if (shippedSet.has(c.id)) done.push(c);
    else if (gated.test(`${c.title} ${c.effort}`)) blocked.push(c);
    else pending.push(c);
  }
  pending.sort((a, b) => effortRank(a.effort) - effortRank(b.effort) || idNum(a.id) - idNum(b.id));
  return { done, pending, blocked, next: pending[0] || null };
}

/**
 * Convenience: parse spec + brief + compute the queue in one call. Pure.
 * Shipped ids are the UNION of the brief's "## SHIPPED" prose (parseShipped) and the
 * reality-grounded git-commit signal (parseShippedFromCommits over opts.gitLogText, when
 * provided) -- so a drifted/missing brief can no longer make the cron show a drained
 * queue as pending. opts.gitLogText is optional; omit it for the legacy brief-only path.
 */
export function buildQueueFromTexts(specText, briefText, opts = {}) {
  const shipped = parseShipped(briefText);
  if (opts.gitLogText) {
    for (const id of parseShippedFromCommits(opts.gitLogText)) shipped.add(id);
  }
  // Artifact-existence signal (U-ZBL-ARTIFACT-SHIPPED, 2026-06-25): a unit that
  // shipped under an ENGINE-NAME commit (e.g. C1 == ZuluWaveSchedulerEngine, never
  // a literal "C1" subject) is invisible to BOTH the brief prose AND the git-subject
  // signals -- so the pointer falsely showed it pending. opts.extraShipped lets the
  // IO caller pass a reality-grounded set computed from canonical artifact existence
  // on disk. Union, deduped; non-string members ignored.
  if (opts.extraShipped) {
    for (const id of opts.extraShipped) if (id) shipped.add(String(id));
  }
  return computeQueue(parseCapabilitySpec(specText), shipped, opts);
}
