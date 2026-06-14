---
name: reference_post_knowledge_enrich_2026_06_01
description: post-training-harness --from-knowledge leg — per-op tribal+playbook+controller knowledge traveler + playbook sequencing conformance (condition-3 wiki+tribal arm)
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.272Z
aliases: reference_post_knowledge_enrich_2026_06_01
---


# Post-training knowledge-enrichment leg (`--from-knowledge`) — slot:echo, 2026-06-01

`scripts/post-training-harness.mjs` gained a `--from-knowledge` leg (sibling of `--from-sfc`) that closes condition-3's "utilize **wiki and tribal** knowledge per operation + program-general" arm (SFC arm was already proven; wiki/tribal was NOT STARTED).

**What it does:** per op, composes the live MCP action `prism_shop_practice:tribal_enrich` (returns `{tribal_tips, playbook_rules, controller_tips, knowledge_sources}` — PRISM's compiled shop-floor tips + machining PLAYBOOK [the "wiki"/best-practice knowledge] + controller knowledge). For each (post×job) it (a) writes an operator-facing **knowledge traveler** `<post>-<job>.knowledge.md` beside the generated NC, and (b) mechanically checks the playbook SEQUENCING rules the per-line dialect-linter cannot see: **SEQ-001 face-first** (face op must be index 0 in a multi-op job) and **SEQ-003 rough-before-finish** (every roughing op precedes every finishing op).

**Honesty discipline (R12):** non-mechanically-checkable tips are CITED as advisory (with provenance/confidence), never claimed "verified". Sequencing is a job/CAM-ordering property → a violation is reported in `card.knowledge`, **kept OUT of the post emission verdict** (`card.perfect` stays = lint+structural; the post faithfully emits given order). `tribal_enrich`'s `controller` enum lacks **hurco** → falls back to generic `fanuc` shop knowledge with an explicit note; emission dialect is unchanged.

**Pattern:** mirrors `sfcEnrich` exactly — injectable `fetchImpl`, pure-core (testable), fail-loud on blocked/errored/empty enrich. Pure exports: `processTypeForPost`, `controllerForKnowledge`, `enrichMachine`, `classifyOp`, `checkPlaybookConformance`, `summarizeEnrich`, `aggregateSources`, `buildKnowledgePack`, `renderKnowledgeTraveler`; live leg `knowledgeEnrich`.

**PROVEN LIVE (2026-06-01)** on all 3 PERFECT posts: `okuma-genos-osp` (mill), `okuma-b250-lathe` (lathe — `[face,od_rough,od_finish]` fires BOTH SEQ rules), `hurco-v11-standalone` (mill — exercises the hurco→fanuc fallback). +35 tests → 68/68. Commit `U-PT-KNOWLEDGE-ENRICH`. Companion: the condition-2 Haas-full-post gap is now build-ready at `state/shared/post-training/MASTER-POST-HAAS-BUILD-SPEC.md`. See [[reference_echo_winmax_bridge]], [[reference_winmax_course_framework_2026_05_31]].
