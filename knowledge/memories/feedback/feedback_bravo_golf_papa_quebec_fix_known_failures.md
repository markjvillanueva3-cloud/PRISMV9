---
name: feedback-bravo-golf-papa-quebec-fix-known-failures
description: "Standing rule (2026-05-26, operator directive) — known failures, conflicts, and issues encountered during work must be FIXED in-session, not just recorded. Bravo, golf, papa, and quebec are the named fix-responsible slots. Recording a known infra failure as a regression note and moving on is forbidden when the chat belongs to one of these 4 slots."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.415Z
aliases: feedback_bravo_golf_papa_quebec_fix_known_failures
---


# Rule — bravo/golf/papa/quebec must fix known failures, not just record them

**Operator directive (2026-05-26):** *"if there are known failures, conflicts and issues, don't leave them. bravo, golf, papa and quebec are responsible for fixing."*

## What this overrides

Previously, when a chat hit a pre-existing infra failure outside the unit it was building (e.g. merge-augmentations OOM, system-viz regen broken, MCP daemon stuck), the standard pattern was: **record the regression in a memory + the spec, move on, let the responsible slot pick it up later.**

This rule changes that for **bravo, golf, papa, and quebec**:
- These 4 slots are the **fix-responsible cohort** for cross-cutting failures.
- Encountering a known failure mid-task = **investigate + fix in-session**, not just record.
- Recording-and-moving-on is the failure mode — the regression list grows, nobody actually picks them up, the fleet gets slower.

## Why these 4

- **bravo** — original mill specialist; in practice handles cross-cutting infra (Hermes-Zulu-PSN line, this session's DREAM-RECEIPT-MS0)
- **golf** — hygiene + [[reference_fleet_reaper|fleet-reaper]] (already canonical hygiene owner per [[feedback_golf_owns_reaper]])
- **papa** — slot allocated to engine-wiki embedder + JM-Die library consolidation work
- **quebec** — UI/UX improvement + dev-loop hygiene per recent commits (U-Q-PRISM-PRIMITIVES, U-Q-PRISM-RESOURCE-CARD)

The OTHER 22 slots (alpha, charlie, delta, echo, foxtrot, hotel, india, juliett, kilo, lima, mike, november, oscar, romeo, sierra, tango, uniform, victor, whiskey, xray, yankee, zulu, zulu) are domain-specialists or general work — they can flag and defer.

## Practical protocol when one of the 4 hits a known failure

1. **Investigate the root cause** — read the script that's failing, understand the failure mode (V8 OOM, lock contention, schema drift, etc.).
2. **Try the obvious fix first** — bigger heap, lock removal, env-var override, etc.
3. **If obvious fix fails, ship a workaround** — pure-fn refactor, streaming I/O, batch-size limit, fallback path. Even if not the perfect fix, ship SOMETHING that unblocks the next user.
4. **Commit the fix as its own atomic unit** with `[FIX]` or `[REGRESSION-FIX]` prefix in addition to the unit ID. Reference the regression's source memory in the commit body.
5. **Only THEN move on** to the originally-scoped unit.

## What still counts as "record + move on" (the exceptions)

- Failure is in a slot's own peer-claimed work (don't fix peer-claimed code).
- Failure is in safety-critical engine code (physics, S(x), Kienzle) — defer to physics-reviewer agent.
- Failure requires interactive operator decisions (e.g. data loss recovery choice).
- Failure is in 3rd-party dependency (npm package, OS process) — record + flag for operator.

In all 4 exceptions, file a **specific** issue note that the *next* fix-responsible chat will pick up — vague "this is broken" doesn't count.

## Concrete example — what triggered this rule

**This session (slot:bravo 00569f88):** while shipping U-DR09 (system-viz roost generator), I ran merge-augmentations.mjs to fold my augmentation into the live graph. It V8-OOM'd at default heap. I tried `NODE_OPTIONS=--max-old-space-size=8192` — still OOM'd. I recorded the failure as a "known regression per [[reference_u_regen_viz_merge_faillod_2026_05_17]]" and committed without surfacing the ghost roost into the live graph.

**That was the wrong call** under this rule. As bravo, I should have:
- Investigated whether the 8GB heap setting was actually honored (NODE_OPTIONS through rtk wrapper)
- Looked at merge-augmentations.mjs read pattern (is it loading the 542 MB JSON whole-file? Could it stream?)
- Shipped a workaround (pure-fn batch processing, smaller graph slices, etc.)
- THEN noted what couldn't be fixed in this session

## See also

- [[feedback_always_close_out]] — finish EVERY task before reporting done (this rule strengthens the "in-session" half)
- [[feedback_always_capture_lessons]] — capture rules; this rule says capture AND fix
- [[reference_u_regen_viz_merge_faillod_2026_05_17]] — the original merge-augmentations regression that should have been fixed by now (1 week old)
- [[feedback_golf_owns_reaper]] — golf is the hygiene canonical; this rule extends fix-responsibility to bravo/papa/quebec too
