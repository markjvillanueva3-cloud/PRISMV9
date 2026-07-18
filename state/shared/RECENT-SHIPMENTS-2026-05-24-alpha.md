# RECENT-SHIPMENTS — 2026-05-24 — slot:alpha

Inbox for golf to drain into CLAUDE.md section bodies.

## U-SUBAGENT-PSN-SUBSTRATE-UPGRADE (2026-05-24, slot:alpha)

**File:** `scripts/agents/spawned-agent-context-lib.mjs` + mirror in `H:/prism-slot-alpha/`

Every spawned subagent's context bundle (built by `spawned-agent-context-lib.mjs`, injected by `.claude/hooks/subagent-start-context.mjs`) now ALSO carries:

1. **11-leg PSN substrate map** — each leg's surface + query path per [[feedback_psn_definition]] (Obsidian-brain · PRISM-OS · Wiki · Memories · Tribal · System-viz · Engines · Algorithms · Formulas · NN/GNN · PRISM-AI).
2. **Parent's slot soul** — inherited via new helpers `findSlotForChatId(chatSlots, parentInstance)` + `extractSoulVoice(soulText)`. The spawned agent inherits the personality contract of the chat that spawned it (alpha→mill-physics-first, golf→hygiene, etc.).
3. **NN/GNN tier-5 status** — from `state/shared/nn-graph/NN-EVAL.json` (DORMANT / RESEARCH / PROMOTED + AUROC + gate).
4. **Deep-reasoning + deep-learning engine handles** — `aiSystemRouterEngine.route`, `prismCreativeReasoningEngine.explore`, `CrossDisciplinaryDeepLearningEngine`, `prismSelfAwarenessEngine.{recommendAIFeatures,searchTribalKnowledge,searchPlaybookRules}`.
5. **Dream-layer pointer** — `DreamTuningEngine` / U-PPGM210 (overnight Monte Carlo on tomorrow's queue — pointer only, not yet built).

**Bundle size:** ~10.8KB (was ~8KB). Under the 32KB context-bundle ceiling.

**Sync surface:** same SubagentStart hook fires for ALL agent spawns regardless of subagent_type → upgrade is fleet-wide on next spawn. No settings.json change required.

**Smoke verification (2026-05-24):**
- Bundle generated for parentInstance=claude-95e7030e (alpha), subagentType=coder → LEN=10808
- PSN-section present ✓
- Soul-section present (resolved alpha→mill-specialist) ✓
- GraphSAGE NN tier present ✓
- Dream layer present ✓
- All 11 legs named ✓

**Knobs:** inherited from parent injection (`PRISM_MASTER_INDEX_INJECT`, `PRISM_TRIBAL_BOOST_DOMAIN`). No new env flags introduced.

**Why this matters:** before this upgrade, spawned agents re-derived PSN-leg surfaces from scratch (or skipped them entirely), wasting tokens. Now every Agent() call inherits the same substrate the parent has — single point of truth + zero cost per spawn beyond the existing context-bundle read.

**Related:** [[reference_subagent_per_task_presearch_2026_05_15]] (the prior layer — master-index + tribal pre-search; still present + complementary).

## U-PTSM02-05 (2026-05-24, slot:alpha — landed earlier this session)

Shared-tree commit: `bc22625104`. Alpha-tree commit: `fdeca4c5a7`. 5-tool token-savings detectors covering grep (multiline) + read (large-path) + bash/git (commit-a/force-push) + write (large-byte) + websearch (PRISM-internal). 41/41 tests PASS. PSN-synergy LIVE via existing producer→consumer telemetry surface.
