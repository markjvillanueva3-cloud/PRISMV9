---
name: feedback_always_capture_lessons
description: "When a mistake/error/bug/fix/regression/P0/P1/HOSTILE/footgun/false-positive event occurs, capture it as a structured memo before the session ends — the MISTAKE-LEARNING-LOOP auto-flags but cannot capture for you"
aliases: feedback_always_capture_lessons
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.398Z
---


# Always capture lessons — the MISTAKE-LEARNING-LOOP only flags, it doesn't capture

**Why:** Mark explicitly asked for an end-to-end "learn from mistakes" loop (2026-05-15 hotel slot, before /compact: *"update the skill, script hook, stop hook, claude.md, obsidian and memories and wiki to ensure we learn from mistakes, errors, bugs, fixes. flag those key words and other keywords so we learn from mistakes"*). The infrastructure exists (`scripts/scan-for-learning-keywords.mjs` + 2 hooks + `/learn-from-mistake` skill + wiki entry — [[learning-from-mistakes]]), but the AUTO-DETECTION layer is fundamentally a NUDGE. Capture itself remains a deliberate act — only the operator (or me) knows what's worth distilling vs noise.

The painful pattern that motivated this: in one session I (a) hit a `HOSTILE` greedy-slice bypass in `tryParseJson`, (b) saw a Read-tool false-positive on U+001F rendering, (c) hit a 6th shared-tree absorption hijacking my commit, (d) lost 30+ min to a global blob corruption — and ALL FOUR lessons would have evaporated with the session if I hadn't pulled them out by hand. The loop now flags hits like these in PostToolUse + Stop with concrete `additionalContext` nudges, but it CANNOT write the memo. That step is the irreducible-work part.

**How to apply:**

1. **Listen to the loop** — when `mistake-keyword-flag.mjs` PostToolUse injection or `stop-learning-capture-prompt.mjs` Stop advisory fires, do NOT ignore it. Score the hit:
   - `critical` (P0/HOSTILE/EXPLOITABLE/VULNERABLE/corrupted) → CAPTURE NOW, no skipping.
   - `warn` (FAIL/regression/hijack/footgun/false-positive/got-burned) → capture before session end.
   - `info` (fix/oops/error/in-hindsight) → capture if it surprised you OR re-emerges (3-strikes rule: 3 unrelated `info` hits on the same theme means there's a hidden `warn` lurking).

2. **Use `/learn-from-mistake`** — that's the canonical capture surface. The skill enforces the 4-field memo template (`Summary` / `Why:` / `How to apply:` / `Related:`) so the memo is *load-bearing* not noise.

3. **Don't batch capture** — write the memo IN the session you learned the lesson. Session-end batch capture (the "I'll do it later" path) is where lessons die. The Stop hook surfaces uncaptured punch lists exactly because deferring is the failure mode.

4. **Cross-link aggressively** — every new memo cites `[[other-memo-slug]]` for related patterns and at least one wiki entry or CLAUDE.md section. Orphan memos rot; linked memos compound.

5. **Update MEMORY.md index** — one line under `## Indexed memories`, kebab-case slug, < 200 chars, with a one-line hook. The index is auto-injected at SessionStart so future sessions surface the memo on relevant prompts.

6. **Update CLAUDE.md when doctrine shifts** — if the lesson rewrites a default behavior or names a new rule, add a pointer line in the relevant CLAUDE.md section. Detail stays in the memo; CLAUDE.md stays a ≤200-line pointer index per [[knowledge-vault-schema]].

7. **The keyword catalog is heuristic** — it has false positives (`fix` fires on every commit message containing "bug fix") and false negatives (catches `hostile` but not synonyms like `adversarial-input`). Tune via env knobs (`PRISM_MISTAKE_FLAG_MIN_SEVERITY=critical` to silence the chatty `warn` tier) rather than abandoning. Add keywords to the catalog when a real lesson slipped through.

8. **Don't capture noise** — DON'T memo: routine progress ("shipped E1"), code structure / paths / counts (`git log` + digests already cover those), trivial debug traces. DO memo: tool quirks, hostile-payload classes, footguns, regression-recovery patterns, retrospective insights, false-positives in your own detectors.

**Related:** [[learning-from-mistakes]] · [[feedback_read_tool_strips_control_chars]] · [[feedback_scrutiny_gate_finds_hostile_payload_class]] · [[feedback_conflict_fork_rule]] · [[reference_e1_ideablock_extractor_2026_05_15]] · CLAUDE.md §LEARN-FROM-MISTAKES PROTOCOL · CLAUDE.md §SCRUTINY GATE
