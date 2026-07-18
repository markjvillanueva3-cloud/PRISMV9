---
name: feedback_meta_learning_trigger_intentional_retirement_2026_06_01
description: "DO NOT re-enable meta-learning-trigger.mjs (or error-recovery-memory.mjs) — they were INTENTIONALLY retired 2026-05-10 (TIER3d) and moved to /learn-batch agent dispatch. The 'DISABLED Layer-4 hook' framing in the dunik 4-layer audit / AI-SYSTEMS sweep completeness-critic is WRONG; re-enabling regresses a token optimization."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.434Z
aliases: feedback_meta_learning_trigger_intentional_retirement_2026_06_01
---


**Finding (slot india, 2026-06-01, AI-SYSTEMS-SWEEP Unit 3 investigation):** the sweep completeness-critic (relaying the dunik 4-layer audit) flagged `meta-learning-trigger.mjs` as a "DISABLED Layer-4 consolidator since 2026-05-10 — re-enable it (high urgency)." **That framing is wrong.** Investigation (`H:/prism/.claude/settings.json:1102`) shows the hook was **intentionally retired**, not broken:

```
TIER3d 2026-05-10: meta-learning-trigger moved to /learn-batch agent dispatch.
Source file preserved at H:/prism/.claude/hooks/meta-learning-trigger.mjs. To revert: restore command to the original path.
```

The same TIER3d pass retired `error-recovery-memory.mjs` (settings.json:1106) the same way. These were PostToolUse hooks that fired on EVERY Bash/Write/Edit tool call; TIER3d moved their work to **batched `/learn-batch` agent dispatch** to remove per-call overhead (a token/latency optimization). The hook source is preserved + the settings entry is a documented no-op stub with a revert path — this is the canonical `never-delete-only-disable` pattern, done correctly.

**Why:** re-enabling the PostToolUse hook would (1) **duplicate** the meta-learning trigger (the `/learn-batch` agent now owns it) and (2) reintroduce the exact per-tool-call overhead TIER3d removed → a regression, not an improvement.

**How to apply:**
- DO NOT re-wire `meta-learning-trigger.mjs` / `error-recovery-memory.mjs` into settings.json PostToolUse. They are retired-by-design.
- The REAL Layer-4 question (is meta-learning actually running?) is whether **`/learn-batch` is scheduled + executing** + whether NightlyLearner/KIP are wired — that is the verification to do, NOT re-enabling the retired hook. Re-scope any "Layer-4 broken loop" fix to the /learn-batch + cron path (golf/cron territory), not the hook.
- General lesson (R8): before re-enabling ANY disabled hook/feature, READ the disable comment / git context. A 3-week-old disable usually has a reason; a settings.json no-op stub with a "moved to X / to revert: Y" comment is an INTENTIONAL retirement, not a bug. Audits that flag "X is disabled" without the why can be cry-wolf. Sibling: [[feedback_never_delete_only_disable]], [[feedback_verify_actual_contract_not_proxy]].

Corrects: AI-SYSTEMS-IMPROVEMENT-SWEEP-2026-05-31.md completeness-gap #2 (memory-consolidation / Layer-4). Sweep units shipped this session: [[reference_wikilink_graphrank_arm_2026_06_01]] (Unit 1), [[reference_reasoning_outcome_loop_cl5_2026_06_01]] (Unit 2).
