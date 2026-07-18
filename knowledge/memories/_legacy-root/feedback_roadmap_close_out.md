---
name: feedback_roadmap_close_out
description: Standing rule (2026-05-12, user) — every completed milestone/unit MUST be closed out in ALL roadmap surfaces, not just the envelope; enforced by hook + orchestrator + skill
source: prism-memory
synced: 2026-05-18T01:02:09.046Z
aliases: feedback_roadmap_close_out
---


**The rule (user, 2026-05-12):** "if we complete a task we need to close it out in the road map so it gets updated, make this a memory and whatever other enforcement system we have to make sure this always happens"

Origin: the [[OCTOPUS-NEURAL-MS0]] merge landed on `cad-fusion-live-ms0` with the *envelope* marked `completed` (5/5 units), but BUILD_STATE still reported `OCTOPUS-NEURAL-MS0: claims not_started, real completed_real` because four downstream surfaces were never updated. The "envelope done" felt like done; it wasn't. Extends [[feedback_always_close_out]] (the don't-defer rule) with the **specific surface list** that close-out must touch.

## The four downstream surfaces that drift if you stop at the envelope

1. **`mcp-server/data/roadmap-index.json`** — top-level milestone catalog (740 entries). Each entry has `status`, `completed_units`, `total_units`, and (when complete) `completed_at` + `_legacyStatus`. **This is the file every audit/dashboard reads first.** If the envelope says `completed` but this says `not_started`, every drift report flags it — *and that's how the drift surfaced for OCN*.
2. **`state/shared/MILESTONE_PROGRESS.{md,json}`** — auto-regen via `node scripts/build-milestone-progress.mjs`. Until this regens, `MILESTONE_PROGRESS.shipped[]` doesn't include the new units → audit chats keep flagging them as gaps.
3. **`state/shared/BUILD_STATE.{md,json}`** — auto-regen via `node scripts/build-state-snapshot.mjs`. Until this regens, "envelope drift" entries persist + SessionStart injection keeps reporting them.
4. **Chat-bus broadcast** — `node H:/prism/.claude/helpers/agent-coordination.mjs post --agent Claude "<milestone-id> merged ..."` — so peer chats see the completion without re-reading the JSON.

## The one-command close-out

```bash
node H:/prism/scripts/close-out-milestone.mjs --milestone <MS-ID>
```

Orchestrates all four surfaces above + verifies envelope.status==completed first. Idempotent (re-runs are no-ops). `--self-test` for sanity, `--json` for CI, `--no-write` for preview. Wraps the existing `reconcile-milestones.mjs` + `build-milestone-progress.mjs` + `build-state-snapshot.mjs` (which were all unwired dead code before — that's the gap that let OCN drift).

## Enforcement (hard gate)

`.claude/hooks/enforce-roadmap-closeout.mjs` Stop hook compares `mcp-server/data/roadmap-index.json` against the on-disk envelopes. If any envelope says `completed` but the index says `not_started` (the exact OCN class), the hook blocks Stop with the one-command fix. Escape hatch: `PRISM_CLOSEOUT_GATE_BYPASS=1` (logs the bypass). Wired in `H:/prism/.claude/settings.json` Stop array.

User-invokable: `/close-out <MS-ID>` (or no arg → close-out the milestone the most-recent `[<SCOPE>]/U-*:` commit references).

## Why the prior infrastructure didn't catch this

Three roadmap hooks already existed (`stop_on_roadmap_drift.mjs`, `roadmap-completion-logger.mjs`, `roadmap-reconcile.mjs`) but **NONE were wired in settings.json**. They were dead code, written but never registered with the harness. The new hook is registered on creation; the dead three stay where they are (per `feedback_never_delete_only_disable`) and can be wired later if their semantics turn out useful.


## Related
[[skills/data|/data]] • [[skills/roadmap-index|/roadmap-index]] • [[skills/dashboard|/dashboard]] • [[skills/shared|/shared]] • [[skills/build-milestone-progress|/build-milestone-progress]] • [[skills/build-state-snapshot|/build-state-snapshot]] • [[skills/prism|/prism]] • [[skills/helpers|/helpers]] • [[skills/agent-coordination|/agent-coordination]] • [[skills/scripts|/scripts]]