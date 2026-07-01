---
name: reference-skill-trigger-ledger-revive-2026-05-20
description: "2026-05-20 kilo /loop iter 3 — _skill-triggers.jsonl was 0 lines (skill-auto-trigger 100% blind fleet-wide) — regen restored 482 triggers across 122 skills + anti-regression test + /synergy-recall slash command"
aliases: reference_skill_trigger_ledger_revive_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.205Z
---


# SKILL-TRIGGER-LEDGER-REVIVE — kilo /loop iter 3 (2026-05-20)

**The bug:** `knowledge/wiki/architecture/_skill-triggers.jsonl` was 0 lines.
Last-write fingerprint at `.skill-triggers-fingerprint` was locked to the
SHA1 of empty content from 2026-05-19 12:09, so every subsequent
`scripts/extract-skill-triggers.mjs` invocation hit the fingerprint
short-circuit (extractor §319-322) and refused to rewrite. The
`skill-auto-trigger.mjs` UserPromptSubmit hook reads this ledger and
surfaces top-K=3 relevant skills per prompt — with 0 ledger rows, the
hook was 100% blind across the entire 26-chat fleet.

**Scope:** worse than [[HIGH-ROI-SKILL-ROUTING-AUDIT-2026-05-17]] F3
predicted (36/126 = 28.6%). Real state was **0/132 = 0.0%**. The audit
guessed the cause was extractor's SKILL_DIRS missing the user-tree —
it actually walks BOTH trees correctly (extract-skill-triggers.mjs §65-69);
the silent failure was the fingerprint locking an empty file in place.

**Fix (this iteration, commit pending at write time):**

1. Re-ran the extractor — produced 481 triggers from 121 skills across
   both project + user-globals trees. Fingerprint advanced; ledger
   atomic-written to 92.6KB.
2. Built `scripts/skill-trigger-ledger-health.test.mjs` — anti-regression
   gate with 7 assertions. The 7th is the critical one: if the
   `.skill-triggers-fingerprint` file exists AND the ledger is empty,
   fail loud. That is the exact 2026-05-20 silent state, which would
   have re-occurred forever unless something gates it. 7/7 PASS.
3. Built `/synergy-recall <query>` skill at
   `.claude/commands/synergy-recall.md` — thin wrapper around the
   already-existing 5-surface fan-out in `scripts/checkin-recall.mjs`
   (master-index + tribal + memory + wiki + skill, ≤3 hits/surface,
   optional Ollama distill). The fan-out engine was buried inside
   `/checkin` Steps 8-11 with no user-invokable surface; this slash
   command exposes it for ad-hoc "what does PRISM know about X" queries.
   No new recall logic — R8 (read before writing).
4. Re-ran extractor — 481 → 482 rows (new skill added). Retest 7/7 PASS.

## Why this matters

Per [[HIGH-ROI-SKILL-ROUTING-AUDIT-2026-05-17]]:
- ROI of fixing the ledger = "every prompt that could have triggered a
  skill but doesn't" = a re-derived Claude response that wastes tokens.
- Estimated 20-40 skill-relevant prompts/chat/day × fleet ≈ moderate
  token saving + significant correctness uplift (skill bodies encode
  hard-won patterns the model doesn't have to re-derive).

The fingerprint-vs-empty-file lock is the same R12 (fail-loud) class as
[[reference_wiki_leafidx_failloud_2026_05_18]]: a silent
clobber-into-empty regression that lives forever until something asserts
the artifact has content. The new test is the assertion.

## Rule for future skill-ledger work

Before trusting any extractor that uses content-hash fingerprint
short-circuiting:
- Verify the OUTPUT file is non-empty (R12) — not just the extractor's
  exit status. A run that reports "wrote 481 lines" while the ledger
  was already 0 lines silently leaves it at 0.
- Wire an anti-regression health-check that fails loud on the lock
  state (`fingerprint exists ∧ artifact empty`). Don't trust mtime.
- The pattern generalizes — same risk applies to any fingerprint-cached
  artifact: `state/shared/AWARENESS-SNAPSHOT.md`, `system-graph.json`,
  `tribal-embed-index.json`, etc. Audit candidate.

## Cross-references

- [[reference_u_wire_fluid_pumps_2026_05_20]] — kilo iter 1, the genuinely-built work
- [[reference_kilo_queue_false_positives_2026_05_20]] — kilo iter 2, queue verified empty of clean work
- [[HIGH-ROI-SKILL-ROUTING-AUDIT-2026-05-17]] — original F3 (underestimated severity by 28.6%)
- [[reference_wiki_leafidx_failloud_2026_05_18]] — same fail-loud class
- [[feedback_always_capture_lessons]] — mistake-loop doctrine
- `scripts/checkin-recall.mjs` — 5-surface fan-out engine (existing, unmodified)
- `scripts/extract-skill-triggers.mjs` — extractor (unmodified — was healthy, fingerprint was the bug)
- `scripts/skill-trigger-ledger-health.test.mjs` — NEW anti-regression gate
- `.claude/commands/synergy-recall.md` — NEW user-invokable surface
