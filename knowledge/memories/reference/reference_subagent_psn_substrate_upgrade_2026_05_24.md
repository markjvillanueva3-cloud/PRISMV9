---
name: reference-subagent-psn-substrate-upgrade-2026-05-24
description: "Subagent context-bundle upgraded with 11-leg PSN map + inherited slot soul + NN/GNN tier + deep-reasoning engine handles + dream-layer pointer (2026-05-24, slot:alpha)"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.959Z
aliases: reference_subagent_psn_substrate_upgrade_2026_05_24
---


# Subagent PSN-substrate upgrade (2026-05-24, slot:alpha)

**Unit:** U-SUBAGENT-PSN-SUBSTRATE-UPGRADE
**File:** `scripts/agents/spawned-agent-context-lib.mjs` (+ mirror in `H:/prism-slot-alpha/scripts/agents/`)
**Hook:** `.claude/hooks/subagent-start-context.mjs` (unchanged — consumes the lib)

## What changed

Every spawned subagent (Agent-tool dispatch) now inherits 5 new awareness layers in its context bundle:

1. **11-leg PSN substrate map** — each leg's surface + query path per [[feedback_psn_definition]] (Obsidian-brain · PRISM-OS · Wiki · Memories · Tribal · System-viz · Engines · Algorithms · Formulas · NN/GNN · PRISM-AI).
2. **Parent's slot soul** — inherited via `findSlotForChatId(chatSlots, parentInstance)` + `extractSoulVoice(soulText)`. Spawned agent inherits the personality contract of the chat that spawned it (alpha→mill-physics-first, golf→hygiene, bravo→mill-workhorse, etc.).
3. **NN/GNN tier-5 status** — read from `state/shared/nn-graph/NN-EVAL.json` and summarized as DORMANT / RESEARCH / PROMOTED + AUROC + gate.
4. **Deep-reasoning + deep-learning engine handles** — `aiSystemRouterEngine.route`, `prismCreativeReasoningEngine.explore`, `CrossDisciplinaryDeepLearningEngine`, `prismSelfAwarenessEngine.*`.
5. **Dream-layer pointer** — `DreamTuningEngine` / U-PPGM210 (overnight Monte Carlo on tomorrow's queue — pointer only, not yet built).

## Why

Before this upgrade, spawned agents re-derived PSN-leg surfaces from scratch (or skipped them entirely), wasting tokens and producing inconsistent answers per subagent. Now every Agent() call inherits the same substrate the parent has — single source of truth + zero marginal cost per spawn beyond the existing context-bundle read.

## How to apply

- When you Agent() dispatch a coder/reviewer/explore subagent, expect the bundle to include `## 🧬 PSN substrate` + `## 🎭 Slot soul inherited` sections.
- If a subagent re-derives PSN leg surfaces, suspect (a) the lib failed to load (fail-soft fallback path in `subagent-start-context.mjs`), or (b) the parentInstance didn't resolve to a slot in `chat-slots.json` (soul section is conditional on slot resolution).
- The bundle is read-from-live state — system-graph mtime cache invalidates, so peer regenerations propagate to the next spawn automatically.

## Smoke verification (2026-05-24)

Bundle generated for parentInstance=claude-95e7030e (alpha), subagentType=coder, taskNote="audit token-savings coverage":
- LEN: 10808 bytes (under 32KB ceiling)
- PSN-section present ✓
- Soul-section present (resolved alpha→mill-specialist) ✓
- GraphSAGE NN tier present ✓
- Dream layer present ✓
- All 11 legs named ✓

## Sync surface

Same SubagentStart hook fires for ALL agent spawns regardless of subagent_type → upgrade is fleet-wide on next spawn. No settings.json change required. Mirror exists in alpha worktree.

## Knobs

Inherited from parent injection (`PRISM_MASTER_INDEX_INJECT`, `PRISM_TRIBAL_BOOST_DOMAIN`). No new env flags introduced.

## Related

- [[reference_subagent_per_task_presearch_2026_05_15]] — prior layer (master-index + tribal pre-search; still present + complementary)
- [[feedback_psn_definition]] — canonical 11-leg taxonomy
- [[reference_hermes_zulu_ms0_2026_05_20]] — slot-soul layer this upgrade plugs into
