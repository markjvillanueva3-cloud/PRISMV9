// goal-loss-function-detect.mjs -- pure, deterministic detector for whether a
// /goal is UNBOUNDED PROSE (no measurable acceptance criterion) vs already-bounded.
// The /goal pre-flight injects a STATIC "bound the loop" reminder on every /goal;
// a static always-on reminder becomes wallpaper (session be279b4f: fired ~15x, the
// unbounded-prose spiral happened anyway). This classifier lets the hook fire a
// TARGETED loss-function nudge ONLY when the goal carries no measurable check --
// the deterministic check (R5) that [[feedback_goal_needs_loss_function]] prescribes.
// Pure: no I/O, no throw. Conservative: fires only when NO check signal AND an
// open-ended improvement verb are present (false-negative > nagging a bounded goal).

// A measurable-check signal: explicit flag, runnable command/test, metric,
// comparison/threshold, concrete terminal state, or a count/ratio with a number.
// ANY hit => the goal carries a stop test => suppress the nudge.
const CHECK_SIGNALS = [
  /--(?:check|metric|gate|until|threshold)\b/i,                     // explicit loss-fn flags
  /\b(?:vitest|pytest|jest|playwright|tsc|npm run|noemit|evaluate|gauntlet|lint)\b/i, // runnable
  /\beval\s+(?:script|gate|harness|pass)/i,                         // "eval script/gate/harness"
  /\b(?:tests?|suite|build|ci)\s+(?:pass(?:es|ing)?|green|clean)\b/i, // "tests pass" / "build green"
  /\ball\s+green\b/i,
  /\b(?:exit|exits?)\s*(?:code\s*)?0\b/i,                            // exit code 0
  /\b0\s+(?:errors?|failures?|fail)\b/i,                             // 0 errors
  /\b(?:auroc|macro.?f1|\bf1\b|brier|cpk|trainingready|psi|omega)\b/i, // unambiguous metric NAMES (rare as prose nouns)
  /(?:>=|<=|==|≥|≤|>\s*\d|<\s*\d)/,                        // comparisons (incl. unicode >=/<=)
  /\b\d+(?:\.\d+)?\s*%/,                                             // a percentage target
  /\bthreshold\b/i,
  // NOTE: ambiguous metric/state WORDS (recall|precision|accuracy|coverage|loss|
  // exists|present|validated) are deliberately NOT bare signals -- in this machining
  // codebase they are everyday domain nouns ("precision machining", "loss-leader",
  // "improve recall of the search"), so a bare match false-suppresses genuinely
  // unbounded prose. They still count as a check WHEN paired with a number via the
  // comparison / % / ratio / count signals above (e.g. "recall >= 0.9", "90% coverage").
  /\b\d+\s*\/\s*\d+\b/,                                              // a ratio like 34/34
  /\b\d+\s*(?:rows?|files?|entries|tests?|engines?|nodes?|units?)\b/i, // count target
];

// Open-ended "improvement" verb / scope -- the pathology class. Required (with NO
// check signal) for the nudge to fire, so short concrete goals are never nagged.
const OPEN_ENDED = /\b(?:improve|enhance|optimi[sz]e|synergi[sz]e|better|polish|refine|harden|elevate|maximi[sz]e|world.?class|comprehensive|fully|across\s+all|every\s+(?:galaxy|galaxies|domain|slot|engine)|all\s+(?:galaxies|domains|slots|engines)|production.?ready|deep\s+(?:reasoning|learning|thinking))\b/i;

/**
 * Classify a /goal's text.
 * @param {string} goalText -- the goal description (typically the prompt slice after `/goal`).
 * @returns {{unbounded:boolean, hasCheckSignal:boolean, hasOpenEndedVerb:boolean, reason:string}}
 */
export function detectMissingLossFunction(goalText) {
  const text = typeof goalText === "string" ? goalText : String(goalText ?? "");
  const trimmed = text.trim();
  // Empty / bare-resume / sub-command -- nothing to classify; never fire.
  if (trimmed.length < 8 || /^(?:complete|status|check|done|resume|continue)\b/i.test(trimmed)) {
    return { unbounded: false, hasCheckSignal: false, hasOpenEndedVerb: false, reason: "no goal text to classify" };
  }
  const hasCheckSignal = CHECK_SIGNALS.some((rx) => rx.test(text));
  const hasOpenEndedVerb = OPEN_ENDED.test(text);
  const unbounded = !hasCheckSignal && hasOpenEndedVerb;
  const reason = hasCheckSignal
    ? "has measurable check signal -- bounded"
    : hasOpenEndedVerb
      ? "open-ended improvement verb + NO measurable check -- unbounded prose"
      : "no open-ended verb (concrete/short goal) -- not nagged";
  return { unbounded, hasCheckSignal, hasOpenEndedVerb, reason };
}

/**
 * Extract the goal-args slice from a raw prompt: text after the LAST `/goal` token
 * ("/loop [10] /goal" => "" => no fire; "/goal improve X" => " improve X").
 * @param {string} prompt
 * @returns {string}
 */
export function extractGoalText(prompt) {
  const p = typeof prompt === "string" ? prompt : String(prompt ?? "");
  const parts = p.split(/\/goal\b/i);
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

// Targeted nudge block (single source of truth shared by hook + tests). Rendered
// only when detectMissingLossFunction(...).unbounded === true. ASCII-only.
export const LOSS_FUNCTION_NUDGE = [
  `(!) LOSS-FUNCTION CHECK -- this /goal reads as UNBOUNDED PROSE with no measurable stop test.`,
  `   An unbounded goal can't terminate: the keeper re-judges prose forever while you invent "one more facet" (this session's pathology). [[feedback_goal_needs_loss_function]]`,
  `   -> Before the first build, restate it WITH a loss function -- a deterministic done/not-done signal:`,
  `     - a command exit: \`vitest run\` green / \`tsc --noEmit\` 0 errors / an eval script >= threshold`,
  `     - a metric gate: AUROC >= 0.78 / coverage >= X% / trainingReady == true / count == N / 34/34`,
  `     - a file/state: <artifact> exists & validated on LIVE data with numbers`,
  `   Deterministic check > LLM re-judging prose (R5). If genuinely unmeasurable, BOUND by iterations/budget and SAY so (R12).`,
].join("\n");
