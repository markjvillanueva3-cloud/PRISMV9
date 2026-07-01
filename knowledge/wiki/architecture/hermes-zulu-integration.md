---
name: hermes-zulu-integration
description: HERMES-MS0 — zulu designated as PRISM's orchestrator-Hermes; slot souls + observation lib + observation Stop hook + statusline MP bar redesigned to slot task-queue countdown
type: architecture
status: in-progress
mapped_units: U-HERMES02, U-HERMES03 (stage-1)
date: 2026-05-20
---

# HERMES-MS0 — Zulu as the designated Hermes orchestrator

## Origin

2026-05-17 juliett research ([[hermes-evolving-skills-gap-2026-05-17]]) audited PRISM's gap vs the Hermes Agent pattern (NousResearch, ~150K GH stars, #1 OpenRouter token usage). PRISM exceeds Hermes on 7 of 9 layers (brain, skillset, tool gateway, MCP, multi-agent topology, session store, deployment surface) but had two real gaps:

- 🟡 **personality** — no per-slot `soul.md` capturing voice / refuse-list / escalation path
- 🔴 **closed learning loop** — manual `/forge-triple` only; no harness-writes-skills-from-observation pipeline (the Hermes compounding-capability lever)

User directive 2026-05-20: *"make zulu the desginated hermes agent. do deep research on how to synergize hermes with the prism system. … incorporate them into the zulu work"*. Zulu was the natural fit — `ZULU-ORCHESTRATOR-MS0` had already shipped the 4-layer Hermes "company topology" (company brain → orchestrator → specialists → optional task bus) mapped to PRISM via:

- L1 **company brain** → `CLAUDE-BRIEF` + `PRISM-BUILD-VISION` + `PRISM-BUILD-CONTEXT`
- L2 **orchestrator-Hermes** → zulu (CHO01 decideClearOrCompact + U-ZULU05 backend-dev priority filter + U-CHO04 SendKeys actuator)
- L3 **specialist agents** → 25 NATO work slots + 1 hygiene (golf)
- L4 **optional task bus** → `slot-task-queues.json` + chat-bus + AGENT_CHAT.jsonl

This entry covers HERMES-MS0 — the first wave addressing the two gaps.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  UserPromptSubmit chain (C:/Users/wompu/.claude/settings.json)      │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
       ┌───────────────────────────────┐
       │  slot-bind-enforce.mjs         │ ← already shipped (2026-05-18)
       │  (binds chatId → slot)         │
       └────────────┬──────────────────┘
                    │
                    ▼
       ┌───────────────────────────────┐
       │  slot-soul-inject.mjs (T2)     │ ← U-HERMES02 — this MS
       │  reads slot-souls/<slot>.md   │
       │  injects voice + refuse-list  │
       └───────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Stop chain                                                          │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
       ┌───────────────────────────────┐
       │  stop-auto-wire.mjs            │ ← already shipped
       └────────────┬──────────────────┘
                    │
                    ▼
       ┌───────────────────────────────────────┐
       │  skill-candidate-observe.mjs (T3)     │ ← U-HERMES03 stage-1 — this MS
       │  extracts tool calls from transcript  │
       │  detectOutcome via git HEAD age       │
       │  classifyWindow (pure lib)            │
       │  appends 1 line to                    │
       │    state/shared/skill-candidates.jsonl│
       └───────────────────────────────────────┘
                       │
                       │ ledger feeds (deferred):
                       ▼
       U-HERMES04 cluster → U-HERMES05 emit → U-HERMES06 review → U-HERMES07 ship

┌─────────────────────────────────────────────────────────────────────┐
│  Terminal statusline (.claude/statusline.mjs, gitignored)            │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
       ┌───────────────────────────────────────┐
       │  MP bar = slot task-queue countdown   │ ← user directive — this MS
       │  src: slot-task-queues.json[slot]     │
       │  budget = maxSeen (cache-persistent)  │
       │  📋 ████░ 12/20 −3  (last-10-min net) │
       │  fallback: offload → telemetry → none │
       └───────────────────────────────────────┘
```

## What ships in MS0

| Unit | Layer | Artifact | Status |
|---|---|---|---|
| U-HERMES02 | personality | 4 files in `state/shared/slot-souls/` (zulu, golf, bravo, README) + `slot-soul-inject.mjs` (T2 UserPromptSubmit) + settings wiring | ✅ shipped |
| U-HERMES03 stage-1 | learning loop — observe | `scripts/lib/skill-candidate-detect.mjs` (24/24 `node:test`) + `skill-candidate-observe.mjs` (T3 Stop) + settings wiring | ✅ shipped |
| MP bar redesign | UI | `.claude/statusline.mjs` Edit — `mpFromSlotTaskQueue` primary source + queue cache + `📋` tag + delta-flash | ✅ shipped |
| U-HERMES04 | learning loop — cluster | `clusterCandidates` in `scripts/lib/skill-loop-pipeline.mjs` — buckets eligible entries by signature, emits clusters ≥ CLUSTER_THRESHOLD (default 5), sorts newest-first | ✅ shipped MS1 |
| U-HERMES05 | learning loop — emit | `buildStubBody` renders SKILL-CANDIDATE-`<id>`.md; CLI writes to `state/shared/specs/` (idempotent skip if exists) | ✅ shipped MS1 |
| U-HERMES06 | learning loop — review | `gateCandidate` deterministic: AUTO-PASS for high-leverage multi-slot; AUTO-FAIL on dedup/conflict/low-leverage; NEEDS-REVIEW emits `buildReviewerPrompt` for operator-dispatched subagent | ✅ shipped MS1 |
| U-HERMES07 | learning loop — ship | `shipDraft` writes to `.claude/commands/<id>.md` on PASS verdict (pure decision; CLI orchestrator does the actual write with no-overwrite guard) | ✅ shipped MS1 |
| U-HERMES01 | research/decision | adoption-pattern matrix — 80% drafted in 2026-05-17 spec | pending (operator decision) |
| U-HERMES08 | messaging surfaces | 20+ Telegram/Discord/Slack/email/voice — defer post-revenue | ⏸ deferred |

## Safety invariants

1. **soul.md is advisory** — `slot-soul-inject` injects as `additionalContext`; the model may override on operator instruction. No PreToolUse block.
2. **Observation is APPEND-ONLY** — `skill-candidate-observe` writes one JSONL line per session, never mutates the skill library. The cluster / emit / review / ship steps are separate units.
3. **Throttle** — `skill-candidate-observe` 60s stamp throttle against fleet-wide Stop-storm (26 chats × 1 Stop each per session = expensive without throttle).
4. **Soul truncation cap** — 2 KB hard cap on injected soul body; longer souls get head-truncated so the prompt budget is bounded.
5. **R12 fail-loud, never hard-fail** — both hooks emit `{continue: true}` on any error (UserPromptSubmit must not block on a missing soul; Stop must not throw).

## Knobs

| Env | Effect |
|---|---|
| `PRISM_SLOT_SOUL_INJECT_DISABLE=1` | Disable the soul injector — slot personality drops to none. |
| `PRISM_SLOT_SOUL_INJECT_VERBOSE=1` | Append the soul file path to the injected context (debug). |
| `PRISM_SKILL_CANDIDATE_OBSERVE_DISABLE=1` | Skip observation entirely (Stop hook becomes a no-op). |

## See also

- [[hermes-evolving-skills-gap-2026-05-17]] — the gap research
- `state/shared/specs/HERMES-EVOLVING-SKILLS-RESEARCH-2026-05-17.md` — full spec
- [[zulu-orchestrator]] — predecessor milestone (MS0 backbone — CHO01/02/04 + U-ZULU01..07)
- [[feedback_ai_training_first_before_revenue]] — sequencing rule
- [[reference_hermes_zulu_ms0_2026_05_20]] — Obsidian memory for this MS
- `hermes-shann-article.md` (94KB on-disk scrape) — primary source

## Next iteration (HERMES-MS1)

The cluster→emit→review→ship chain (U-HERMES04..07) is the compounding-capability lever. Sequence:

1. U-HERMES04 builds the clusterer reading `skill-candidates.jsonl` (signature cosine-sim over normalized tool sequences).
2. U-HERMES05 fires when a cluster crosses N=5 occurrences with same `kind` + similar signature.
3. U-HERMES06 dispatches a reviewer subagent against the candidate — PASS iff dedup-check + leverage-check + dispatch-conflict-check all clear.
4. U-HERMES07 ships PASS candidates as draft skills under `.claude/commands/<id>.md`; FAIL → advisory journal entry.

Adoption-pattern matrix (U-HERMES01) closes the multi-surface messaging deferral debate cleanly when revenue work begins.
