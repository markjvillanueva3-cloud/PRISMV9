/**
 * crossroad-auto-decide.mjs -- deterministic "decide vs escalate" guardrail for the
 * crossroad auto-decide doctrine (operator directive 2026-06-24, slot:papa).
 *
 * Operator intent: when ANY chat reaches a crossroad that would otherwise STOP to ask the
 * user, run a deep-reasoning assessment, DECIDE the most logical path, and keep moving --
 * escalating ONLY the decisions that are genuinely the operator's to make.
 *
 * This lib is the SAFETY-CRITICAL classifier (the "deep logic" half). It does NOT pick the
 * optimal path itself (that is the deep-REASONING half -- routed to the brainstorm-path-forward
 * Workflow / PRISMCreativeReasoningEngine / MultiPathReasoningEngine / prism_ai). It answers the
 * prior question: "is THIS fork mine to decide, or the operator's?" so a chat never auto-decides
 * something irreversible/financial/external/safety-relevant.
 *
 * The OPERATOR-ONLY set mirrors the harness Action Categories (prohibited + explicit-permission)
 * + PRISM safety rails: irreversible data ops, money, external-facing/publish, credentials/access,
 * safety/physics-to-a-real-machine, and goal/scope changes. EVERYTHING ELSE (reversible, internal,
 * "which of N valid implementations") is auto-decidable -> decide + proceed.
 *
 * Pure + dependency-free so a UserPromptSubmit/Stop hook can import it with zero cost.
 */

// Each rule: a labelled regex over a normalized (lowercased) crossroad/decision description.
// A match => operator-only (escalate, never auto-decide). Order is for the `reason` label only.
export const OPERATOR_ONLY_RULES = [
  { tier: "irreversible-data", re: /\b(delete|deleting|deletion|drop|dropping|truncate|truncating|wipe|wiping|erase|erasing|destroy|destroying|overwrite|overwriting|force[-\s]?push|reset\s+--hard|rm\s+-rf|purge|purging|hard[-\s]?delete|empty\s+(the\s+)?trash)\b/ },
  { tier: "financial", re: /\b(payment|purchase|buy|sell|refund|transfer\s+(funds|money)|invoice\s+(the\s+)?customer|charge\s+the|wire\s+(the\s+)?money|deposit|withdraw|pric(e|ing)\s+to\s+(the\s+)?customer|quote\s+to\s+(the\s+)?customer|spend|payout)\b/ },
  { tier: "external-facing", re: /\b(publish|post\s+(to|on)|send\s+(the\s+)?(email|message|dm|invite|reply)|deploy\w*\b[\s\w]{0,30}\bprod|release\s+to\s+(prod|customer|public)|merge\s+to\s+main|push\s+to\s+(origin|remote)|email\s+the|notify\s+the\s+customer|go\s+live)\b/ },
  { tier: "access-credentials", re: /\b(credential|password|api[-\s]?key|token|secret|permission|access\s+control|grant\s+access|oauth|sso|share\s+(the\s+)?(doc|file|repo)|sharing\s+settings)\b/ },
  { tier: "safety-machine", re: /\b(safety\s+(gate|threshold|score)|s\(x\)|omega\s+threshold|to\s+a\s+real\s+machine|ship\s+(the\s+)?g[-\s]?code|run\s+on\s+the\s+(machine|spindle)|override\s+(a\s+)?safety|relax\s+(a\s+)?(safety|tolerance)|disable\s+(a\s+)?safety)\b/ },
  { tier: "goal-scope", re: /\b(change\s+the\s+goal|abandon\s+the\s+goal|redefine\s+(the\s+)?scope|pivot\s+the\s+(project|architecture)|drop\s+the\s+(feature|requirement)|change\s+(the\s+)?requirement|rewrite\s+from\s+scratch|deprecat\w*\s+the\s+(product|galaxy))\b/ },
];

/**
 * Classify a single decision/fork as operator-only (escalate) or auto-decidable (decide+proceed).
 * @param {string} text  the decision / fork description (a question, an "A vs B", a path choice)
 * @returns {{tier: "auto"|<operator-only-tier>, operatorOnly: boolean, reason: string}}
 */
export function classifyDecision(text) {
  const s = String(text ?? "").toLowerCase();
  if (!s.trim()) return { tier: "auto", operatorOnly: false, reason: "empty -> nothing to escalate" };
  for (const rule of OPERATOR_ONLY_RULES) {
    if (rule.re.test(s)) {
      return { tier: rule.tier, operatorOnly: true, reason: `matches operator-only class '${rule.tier}'` };
    }
  }
  return { tier: "auto", operatorOnly: false, reason: "reversible/internal -> auto-decidable" };
}

/**
 * Detect whether a chat turn is AT a crossroad / about to ask the user a strategic either/or.
 * Used by the inject hook to fire the auto-decide directive. Conservative: only the strong
 * "which path / how to proceed / option A vs B / should I" signals, NOT trivial lookups.
 * @returns {{isCrossroad: boolean, signals: string[]}}
 */
export function detectCrossroad(text) {
  const s = String(text ?? "").toLowerCase();
  const SIGNALS = [
    { k: "either-or", re: /\b(option\s+a\b.*\boption\s+b|a\s+vs\.?\s+b|which\s+(path|approach|option|one)|either\b.*\bor\b)\b/ },
    { k: "how-proceed", re: /\b(how\s+(should\s+(we|i)|do\s+(we|i))\s+proceed|way\s+forward|proper\s+(path|way\s+forward)|which\s+direction)\b/ },
    { k: "ask-permission", re: /\b(should\s+i\b|do\s+you\s+want\s+me\s+to|would\s+you\s+(like|prefer)|shall\s+i|let\s+me\s+know\s+(if|which|whether)|which\s+would\s+you)\b/ },
    { k: "brainstorm", re: /\b(brainstorm|crossroad|decision\s+point|fork\s+in\s+the\s+(road|path))\b/ },
  ];
  const signals = SIGNALS.filter((g) => g.re.test(s)).map((g) => g.k);
  return { isCrossroad: signals.length > 0, signals };
}

/**
 * Partition a list of fork descriptions into the ones a chat may decide itself and the ones
 * it must escalate. The decide-now set proceeds via deep reasoning; the escalate set is the
 * ONLY thing surfaced to the operator.
 * @param {string[]} forks
 * @returns {{decideNow: Array<{fork,reason}>, escalate: Array<{fork,tier,reason}>}}
 */
export function partitionForks(forks) {
  const decideNow = [], escalate = [];
  for (const fork of Array.isArray(forks) ? forks : []) {
    const c = classifyDecision(fork);
    if (c.operatorOnly) escalate.push({ fork, tier: c.tier, reason: c.reason });
    else decideNow.push({ fork, reason: c.reason });
  }
  return { decideNow, escalate };
}
