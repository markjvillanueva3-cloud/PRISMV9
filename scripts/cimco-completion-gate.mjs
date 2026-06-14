#!/usr/bin/env node
/**
 * CIMCO sim "real, complete run" gate — U-CIMCO-SIM-5.
 *
 * Spec §E2/§E4: a sim report verdict counts toward clearance ONLY if the run was
 * real AND complete. This PURE module is the decision layer that decides that —
 * fail-CLOSED — from observed signals (never elapsed time):
 *
 *   1. assessSimCompletion  — OBSERVED terminal-complete: ≥2 independent
 *      corroborating end signals (progress 100% / Run re-enabled / distance
 *      covered==total / terminal-complete modal). A timer is NEVER a signal; a
 *      single signal is NOT enough (a UIA glitch or mid-run pause looks like one).
 *   2. assessReportQuiescence — the report is stable: two consecutive reads equal
 *      (a report still being written is not done).
 *   3. assessLineCoverage — the sim executed the WHOLE program: simulated block
 *      count reaches the source NC total (a sim that stopped early on a collision
 *      covered fewer blocks → it did NOT finish → must not read as complete).
 *   4. classifyModal — the §E4 error-dialog watcher: an error/unknown modal during
 *      a run blocks (only an affirmatively-benign modal is non-blocking).
 *   5. assessRunCompleteness — combines 1–4 into the §E2+§E4 gate.
 *
 * The LIVE acquisition of these signals (UIA/MSAA progress reads, the C#
 * `--op watch-modal` poller) is operator-gated and pairs with U-CIMCO-SIM-6's
 * live report read; this module judges signals it is GIVEN. A run-completeness
 * verdict is a PRECONDITION input to the final clearance (R7 single-source —
 * does not replace assessLiveRunClearance).
 */

/** Count the source NC program's structure (generic NC lexing, not a G/M table). */
export function countNcProgram(ncText) {
  const raw = String(ncText ?? "");
  const lines = raw.split(/\r?\n/);
  let nonEmptyLines = 0;
  let blocks = 0;
  let lastLineNumber = null;
  for (const rawLine of lines) {
    if (rawLine.trim() === "") continue;
    nonEmptyLines++;
    // Strip comments: ( ... ) spans and anything after a ';' (EOL comment).
    const code = rawLine.replace(/\([^)]*\)/g, " ").replace(/;.*/g, " ").trim();
    if (code === "" || code === "%") continue; // comment-only / program marker — not a block
    // A block has at least one address word (letter + number), e.g. G1 X2.5 N100.
    if (/[A-Za-z][-+]?\d/.test(code)) {
      blocks++;
      const nMatch = code.match(/\bN(\d+)/i);
      if (nMatch) {
        const n = Number(nMatch[1]);
        if (lastLineNumber == null || n > lastLineNumber) lastLineNumber = n;
      }
    }
  }
  return { lines: nonEmptyLines, blocks, lastLineNumber };
}

/**
 * OBSERVED terminal-complete (spec §E2 "not a timer"). ≥2 independent end signals
 * required; a single signal is fail-CLOSED (insufficient). No elapsed-time input.
 * @param {object} snapshot - {progressPct?, runReEnabled?, distanceCovered?,
 *   distanceTotal?, terminalModalPresent?}
 */
export function assessSimCompletion(snapshot) {
  const s = snapshot && typeof snapshot === "object" ? snapshot : {};
  const signals = [];
  if (Number.isFinite(s.progressPct) && s.progressPct >= 100) signals.push("progress-100");
  if (s.runReEnabled === true) signals.push("run-control-re-enabled");
  if (Number.isFinite(s.distanceTotal) && s.distanceTotal > 0 &&
      Number.isFinite(s.distanceCovered) && s.distanceCovered >= s.distanceTotal) {
    signals.push("distance-covered==total");
  }
  if (s.terminalModalPresent === true) signals.push("terminal-complete-modal");
  const complete = signals.length >= 2; // corroboration floor — never a single signal, never a timer
  return {
    complete,
    signals,
    signalCount: signals.length,
    basis: complete
      ? `observed terminal-complete via ${signals.length} corroborating signals: ${signals.join(", ")}`
      : `NOT complete — ${signals.length} signal(s) (${signals.join(", ") || "none"}); ≥2 required (a single signal can be a UIA glitch or a mid-run pause; a timer is never accepted)`,
  };
}

/**
 * The report is quiescent iff two consecutive reads are byte-equal once canonical-
 * ized (a report still being populated changes between reads). A null/absent read
 * is NOT quiescent (can't confirm stability) — fail-CLOSED.
 */
export function assessReportQuiescence(read1, read2) {
  if (read1 == null || read2 == null) {
    return { quiescent: false, reason: "a null/absent read cannot confirm quiescence (fail-CLOSED)" };
  }
  const canon = (r) => JSON.stringify(
    (Array.isArray(r) ? r : [r]).map((row) =>
      typeof row === "string" ? row.trim()
        : { line: row?.line ?? null, type: String(row?.type ?? "").trim(), description: String(row?.description ?? "").trim(), action: String(row?.action ?? "").trim() }
    )
  );
  const stable = canon(read1) === canon(read2);
  return { quiescent: stable, reason: stable ? "two consecutive reads are identical (report settled)" : "reads differ — report still settling, not done" };
}

/**
 * Simulated coverage must reach the source NC total — a sim that stopped early
 * (e.g. on a collision) executed fewer blocks and did NOT finish the program.
 * @param {{blocks?:number, maxLineReached?:number}} simulated
 * @param {{blocks:number, lastLineNumber?:number}} source - from countNcProgram
 */
export function assessLineCoverage(simulated, source) {
  const sim = simulated && typeof simulated === "object" ? simulated : {};
  const src = source && typeof source === "object" ? source : {};
  if (!Number.isFinite(sim.blocks) || !Number.isFinite(src.blocks) || src.blocks <= 0) {
    return { covered: false, reason: "missing/zero block counts — cannot confirm full coverage (fail-CLOSED)", simulated: sim.blocks ?? null, source: src.blocks ?? null };
  }
  const shortfall = src.blocks - sim.blocks;
  // The full program ran iff the sim reached at least the source block total.
  const covered = sim.blocks >= src.blocks;
  // A gross overcount (e.g. a runaway subprogram loop) is suspicious — flag, don't silently pass it as clean.
  const grossOver = sim.blocks > src.blocks * 2;
  return {
    covered: covered && !grossOver,
    simulated: sim.blocks,
    source: src.blocks,
    shortfall: shortfall > 0 ? shortfall : 0,
    reason: !covered
      ? `partial run — simulated ${sim.blocks} of ${src.blocks} source blocks (${shortfall} short); the sim did not finish the program`
      : grossOver
        ? `simulated ${sim.blocks} >> source ${src.blocks} blocks (>2×) — possible runaway loop; refusing to read as a clean complete run`
        : `full coverage — simulated ${sim.blocks} ≥ source ${src.blocks} blocks`,
  };
}

/** §E4 error-dialog watcher classification. Unknown is BLOCKING (not provably benign). */
export function classifyModal(modal) {
  if (modal == null) return { classification: "none", blocking: false }; // no modal present is fine
  const hay = `${String(modal.title ?? "")} ${String(modal.text ?? "")}`.toLowerCase();
  if (!hay.trim()) return { classification: "unknown", blocking: true, reason: "empty modal text — cannot prove benign (fail-CLOSED)" };
  if (/\berror\b|fail|collision|gouge|over-?travel|cannot|invalid|exception|abort|fault/.test(hay)) {
    return { classification: "error", blocking: true, reason: `error modal during run: "${(modal.title || modal.text || "").slice(0, 80)}"` };
  }
  if (/\bwarning\b|caution|notice/.test(hay)) {
    return { classification: "warning", blocking: false, reason: "advisory warning modal (non-blocking)" };
  }
  if (/simulation complete|completed|finished|information|^ok\b|done/.test(hay)) {
    return { classification: "benign", blocking: false, reason: "affirmatively-benign completion/info modal" };
  }
  return { classification: "unknown", blocking: true, reason: `unrecognized modal during run — not provably benign (fail-CLOSED): "${(modal.title || modal.text || "").slice(0, 80)}"` };
}

/**
 * The §E2+§E4 "real, complete run" gate. runComplete iff the sim observably
 * finished AND the report is quiescent AND coverage is full AND no blocking modal.
 * A precondition input to the final clearance (does NOT itself clear for live run).
 * @param {object} parts - {completion, quiescence, coverage, modal} verdicts from above
 */
export function assessRunCompleteness(parts = {}) {
  const completion = parts.completion ?? { complete: false, basis: "no completion assessment supplied" };
  const quiescence = parts.quiescence ?? { quiescent: false, reason: "no quiescence assessment supplied" };
  const coverage = parts.coverage ?? { covered: false, reason: "no coverage assessment supplied" };
  const modal = parts.modal ?? { classification: "none", blocking: false };
  const blockers = [];
  if (!completion.complete) blockers.push(`sim-not-observed-complete (${completion.basis})`);
  if (!quiescence.quiescent) blockers.push(`report-not-quiescent (${quiescence.reason})`);
  if (!coverage.covered) blockers.push(`coverage-incomplete (${coverage.reason})`);
  if (modal.blocking) blockers.push(`blocking-modal (${modal.reason ?? modal.classification})`);
  return {
    runComplete: blockers.length === 0,
    blockers,
    parts: { completion, quiescence, coverage, modal },
  };
}
