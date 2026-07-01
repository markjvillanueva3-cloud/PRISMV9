---
name: reference_hermes_zulu_ms0_2026_05_20
description: "HERMES-MS0 first units — zulu designated as Hermes orchestrator + MP bar redesigned for slot task-queue countdown + 3 starter soul.md per-slot personality files + slot-soul-inject hook (T2) + skill-candidate-observe Stop hook (T3) + pure observation lib (24/24 tests) — all live this session, addressing the 2026-05-17 juliett gap research"
aliases: reference_hermes_zulu_ms0_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.607Z
---


# HERMES-MS0 first units shipped 2026-05-20 (slot november/foxtrot via claude-5852a0b9)

The 2026-05-17 juliett research at `state/shared/specs/HERMES-EVOLVING-SKILLS-RESEARCH-2026-05-17.md` identified two PRISM gaps vs the Hermes Agent pattern (NousResearch, 150K GitHub stars, on-disk article `hermes-shann-article.md`): 🟡 no per-slot personality file (soul.md), 🔴 no closed learning loop (harness-writes-skills from observation). User directive 2026-05-20: *"make zulu the desginated hermes agent. do deep research on how to synergize hermes with the prism system. … incorporate them into the zulu work"* — this session closes the personality gap + lands the FIRST stage (observation) of the closed-learning-loop chain.

## What shipped

| Artifact | Path | Purpose |
|---|---|---|
| `zulu.md` soul | `state/shared/slot-souls/zulu.md` | Orchestrator-Hermes voice + refuse-list (routes, never builds) |
| `golf.md` soul | `state/shared/slot-souls/golf.md` | Maintenance-specialist (cleans, never feature-builds) |
| `bravo.md` soul | `state/shared/slot-souls/bravo.md` | Mill-physics specialist (validates kc/Taylor before edit) |
| `README.md` doctrine | `state/shared/slot-souls/README.md` | soul.md schema + how injection works |
| `slot-soul-inject.mjs` | `.claude/hooks/slot-soul-inject.mjs` (T2) | UserPromptSubmit; reads `slot-souls/<slot>.md`, injects voice+behavior as `additionalContext` after `slot-bind-enforce`. Knob `PRISM_SLOT_SOUL_INJECT_DISABLE=1`. 2KB cap with head-truncate fallback. |
| `skill-candidate-detect.mjs` | `scripts/lib/skill-candidate-detect.mjs` | Pure lib — `classifyWindow / buildSignature / classifyKind / formatCandidateEntry`. 24/24 `node:test` cases. |
| `skill-candidate-observe.mjs` | `.claude/hooks/skill-candidate-observe.mjs` (T3) | Stop hook — extracts recent tool calls from transcript tail, checks git for recent-commit signal, appends one JSONL line to `state/shared/skill-candidates.jsonl`. 60s throttle. Knob `PRISM_SKILL_CANDIDATE_OBSERVE_DISABLE=1`. |
| statusline.mjs MP bar redesign | `.claude/statusline.mjs` (gitignored, local-only) | MP bar now PRIMARY-sources from `state/shared/slot-task-queues.json[slot].length`. Cache `state/shared/.statusline-queue-cache.json` tracks `maxSeen` per slot so the bar drains as tasks complete. `📋 ████░ 12/20 −3` shows count + 10-min net delta. Falls back to offload-rate → telemetry → no-data per the original chain. |

## Hook wiring (C:\Users\wompu\.claude\settings.json; c-to-h-mirror replicates to H:)

- UserPromptSubmit chain: `slot-soul-inject.mjs` inserted at position right after `slot-bind-enforce.mjs` (slot must be authoritative before reading the soul file).
- Stop chain: `skill-candidate-observe.mjs` inserted right after `stop-auto-wire.mjs`.

## Scope honesty (R12)

This is **the first wave of HERMES-MS0**, not the full MS:
- ✅ U-HERMES02 (per-slot soul.md) — landed for 3 of 26 slots; the other 23 inherit generic domain-specialist behavior. Adding more is operator-named, additive.
- ✅ U-HERMES03 first stage (observation tagger) — observes only. Does NOT cluster, emit, review, or ship.
- ✅ **U-HERMES04..07 shipped in same session as HERMES-MS1** — `scripts/lib/skill-loop-pipeline.mjs` (12 exports, 30/30 tests) + `scripts/skill-loop-run.mjs` CLI orchestrator. Default dry-run, `--apply` writes drafts. Gate is deterministic: AUTO-PASS (high-leverage ≥2×min AND ≥2 slots), AUTO-FAIL (low-leverage/dedup-id/conflict-substring), NEEDS-REVIEW (everything else — emits reviewer prompt for operator-dispatched subagent). Synthetic 5-entry smoke verified end-to-end AUTO-PASS path through to would-ship. Stub specs land in `state/shared/specs/SKILL-CANDIDATE-<id>.md` (idempotent skip if exists). Draft skills land in `.claude/commands/<id>.md` (no-overwrite guard). Audit ledger: `state/shared/skill-loop-verdicts.jsonl`.
- ⏳ U-HERMES01 (adoption-pattern matrix) — research/decision unit, 80% drafted in the 2026-05-17 spec.
- ⏸ U-HERMES08 (20+ messaging surfaces) — deferred post-revenue per [[feedback_ai_training_first_before_revenue]].

## Why this shape

Hermes pattern: *"do not try to write your own skills on day one. run real work, let the agent watch, and let the harness write the skills."* — the OBSERVATION lib + Stop hook are the "let the agent watch" piece. Until U-HERMES04..07 ship, the ledger accumulates eligible windows but nothing auto-emits. That's correct — the user explicitly wants the closed loop, but the observation half is independently useful (telemetry on "what counts as a successful workflow" before the cluster step has any opinion on it).

## Companion: MP bar as slot task-queue countdown

User directive 2026-05-20: *"make the mp bar on the terminal ui represent the task queue for the chat slot, have it be a countdown of tasks left in their overall queue with live counts when things are added and completed."*

Implementation: `mpFromSlotTaskQueue(slot)` reads `state/shared/slot-task-queues.json[slot]`, returns `{used: arr.length, budget: maxSeen, kind: 'queue'}`. `maxSeen` is per-slot persistent (cache file), so the bar starts full on first sighting and drains as items ship. `netDelta` over a 10-min window renders as `−3` or `+2` next to the label. Tag emoji `📋` distinguishes from `⚡` (offload fallback). Statusline file is gitignored so the change is local-only with zero shared-tree blast radius.

## Open close-out items (not blockers)

- ZULU-ORCHESTRATOR-MS0 U-ZULU03+04+07 commit: 5 files on disk untracked, structurally blocked by shared-tree lane-guard false-unstaging (documented class). Slot-worktree migration on a future zulu-slot session will close it.
- U-ZULU08 (account-cycling) — separate concern from Hermes role, design spec was drafted but write was blocked at previous-session context limit. Independent milestone `ZULU-ACCOUNT-CYCLE-MS0` recommended.

## See also

- [[hermes-evolving-skills-gap-2026-05-17]] — the original juliett research
- `state/shared/specs/HERMES-EVOLVING-SKILLS-RESEARCH-2026-05-17.md` — full spec
- [[reference_zulu_orchestrator_ms0]] — predecessor milestone (MS0 backbone)
- [[feedback_ai_training_first_before_revenue]] — sequencing rule for U-HERMES08 deferral
- `hermes-shann-article.md` (94KB on-disk scrape) — primary source
