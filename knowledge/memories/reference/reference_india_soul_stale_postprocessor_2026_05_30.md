---
name: reference_india_soul_stale_postprocessor_2026_05_30
description: "DRIFT — the injected india slot SOUL still reads role:post-processor-specialist, contradicting the canonical india=ai-training. Owner (bravo Hermes-build / zulu orchestrator) must reconcile."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.621Z
aliases: reference_india_soul_stale_postprocessor_2026_05_30
---


**Finding (2026-05-30, slot india /loop consolidation):** the injected india slot **soul** (Hermes personality layer, U-HERMES02) STILL reports:
- `role: post-processor-specialist`
- `hermes_role: specialist-post-processor`
- `domain_filter: post-processor|gcode|controller|dialect|fanuc|okuma|haas|...|master-post`
- refuses: emitting-gcode-without-controller-dialect-resolve / softening-master-post-validation / silent-dialect-cross-map

This **contradicts the canonical india domain = ai-training** (full-system AI/NN/GNN/LoRA/RAG/deep-learning), per `state/shared/CHAT-SLOT-DOMAINS.md` (operator-canonical) AND the galaxy `mcp-server/src/engines/ai-training/CLAUDE.md`, which explicitly documents the **R7 realignment**: *"the india slot-soul previously read role:post-processor-specialist citing JULIETT-12CHAT… superseded — post-processors belong to **echo**; india = ai-training. The soul was realigned in this buildout."*

So the galaxy CLAUDE.md CLAIMS the soul was realigned, but the live injected soul proves it was NOT (or the injecting hook reads a stale source). Doc-vs-reality drift (AI-T8 class). Functional impact: india's hermes layer applies a post-processor `domain_filter` + post-processor refuses, mis-routing an ai-training slot.

**Could not pinpoint the soul source file this session** — repo-wide ripgrep was timing out (orphaned procs from a vitest watch-mode hang, see [[feedback_rtk_vitest_run_watch_hang]]). The soul is a Hermes artifact = **bravo** (Hermes/Zebra build) / **zulu** (chat-fleet orchestrator) lane, so india should NOT edit it unilaterally.

**Action for owner (bravo/zulu):** locate the U-HERMES02 india soul definition (souls data feeding `*-soul-inject` / slot-context-bundle) and set india's `role`/`hermes_role`/`domain_filter`/`refuse_list` to ai-training (NN/GNN/LoRA/RAG/deep-learning/closed-loop), matching CHAT-SLOT-DOMAINS + the galaxy CLAUDE.md. echo is the post-processor slot. Flagged on AGENT_CHAT 2026-05-30.
