// scripts/lib/soul-evolution.mjs
//
// U-HRP05 — soul-evolution lib. Compares session correction signal to current
// slot soul's refuse_list; proposes new refuse-rules when corrections are
// semantically novel (rerank < 0.5 vs every existing rule).
//
// Pure-core: opts.rerank injected. Never mutates the slot soul on disk —
// emits candidates to a .draft.md companion the operator promotes.

export const DEFAULT_NOVEL_THRESHOLD = 0.5; // a correction is "novel" if max rerank score vs existing rules is < this
export const SOUL_RULE_MIN_CORRECTIONS = 1; // min observed corrections to propose a rule (low — souls are slot-scoped, not fleet-scoped)
export const SOUL_RULE_MAX_LEN = 96;

// Inputs:
//   currentRefuseList: string[] of existing refuse-rules (from slot soul frontmatter)
//   sessionCorrections: array of { text, source, at? } observed during the session
//   rerank: (query, candidates, topK) → [{candidate, score}]
//   opts.minNovelThreshold (default DEFAULT_NOVEL_THRESHOLD)
//
// Returns: { proposed: [{ rule, sourceCorrection, maxScoreVsExisting }], skipped: [{rule, reason}] }
export function proposeRefuseRuleCandidates({
  currentRefuseList,
  sessionCorrections,
  rerank,
  minNovelThreshold = DEFAULT_NOVEL_THRESHOLD,
}) {
  const proposed = [];
  const skipped = [];
  if (!Array.isArray(sessionCorrections) || sessionCorrections.length === 0) {
    return { proposed, skipped };
  }
  const refuseList = Array.isArray(currentRefuseList) ? currentRefuseList : [];
  for (const corr of sessionCorrections) {
    const text = typeof corr?.text === "string" ? corr.text.trim() : "";
    if (!text) { skipped.push({ rule: text, reason: "empty-correction" }); continue; }
    const ruleCandidate = deriveRuleSlug(text);
    if (!ruleCandidate) { skipped.push({ rule: text, reason: "could-not-derive-rule" }); continue; }
    if (refuseList.length === 0) {
      proposed.push({ rule: ruleCandidate, sourceCorrection: text, maxScoreVsExisting: 0 });
      continue;
    }
    let maxScore = 0;
    if (typeof rerank === "function") {
      try {
        const results = rerank(text, refuseList, 1);
        if (Array.isArray(results) && results[0]) {
          const s = Number(results[0].score);
          if (Number.isFinite(s)) maxScore = s;
        }
      } catch {
        // R12 fail-soft: if rerank breaks, treat as "no match" → propose anyway,
        // operator catches false-positives during promote review.
        maxScore = 0;
      }
    } else {
      // No rerank → fall back to substring containment heuristic.
      const lower = text.toLowerCase();
      for (const rule of refuseList) {
        const lowerRule = String(rule).toLowerCase();
        if (lower.includes(lowerRule) || lowerRule.includes(lower)) {
          maxScore = 1; break;
        }
      }
    }
    if (maxScore < minNovelThreshold) {
      proposed.push({ rule: ruleCandidate, sourceCorrection: text, maxScoreVsExisting: maxScore });
    } else {
      skipped.push({ rule: ruleCandidate, reason: `existing-rule-overlap=${maxScore.toFixed(2)}` });
    }
  }
  return { proposed, skipped };
}

// Derive a kebab-case rule slug from a correction text. Conservative — only
// accepts a-z/0-9/dash; truncates long inputs. Returns "" when nothing usable.
export function deriveRuleSlug(text) {
  if (typeof text !== "string") return "";
  const slug = text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, SOUL_RULE_MAX_LEN);
  if (slug.length < 4) return "";
  return slug;
}

// Render the draft markdown for the soul companion file.
// Caller writes to state/shared/slot-souls/<slot>.draft.md.
export function renderSoulDraftMarkdown(slotName, proposed, opts = {}) {
  const generated = opts.now || new Date().toISOString();
  const lines = [
    "---",
    `slot: ${slotName}`,
    "kind: soul-evolution-draft",
    `generated: ${generated}`,
    "schemaVersion: 1.0.0",
    "---",
    "",
    `# ${slotName} soul evolution — proposed refuse-rules (U-HRP05 — operator-gated)`,
    "",
    "These rules emerged from observed session corrections and are semantically distinct from the slot's existing refuse_list. Operator decides which to promote into the live soul.",
    "",
  ];
  if (proposed.length === 0) {
    lines.push("_(no novel rules proposed this session)_\n");
  } else {
    for (const p of proposed) {
      lines.push(`- \`${p.rule}\``);
      lines.push(`  - source: "${p.sourceCorrection.slice(0, 200)}"`);
      lines.push(`  - max-overlap-vs-existing: ${p.maxScoreVsExisting.toFixed(2)}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
