---
name: reference-delta-cad-asset-generation-2026-05-29
description: "delta generated NEW high-ROI CAD-domain assets (operator: check all prior sessions + generate memories/CLAUDE.md-rules/GSD/wikis/tribal, then wire+synergize). From mining 56 prior-session handoff threads (cad-fusion-live, cad-full-cover, wire-unwired, command-kernel) + galaxy docs, generated 5 NEW assets all wired to galaxy+PSN: (1) CAD GSD protocol mcp-server/data/docs/gsd/CAD_GSD.md (8-state print->CAD goal-state-design); (2) wiki lesson knowledge/wiki/lessons/cad-step-failure-modes.md (+index/log); (3) delta tribal corpus state/shared/cad-tribal-delta.jsonl (6 structured entries); (4) galaxy CLAUDE.md lint-before-ship rule + cross-refs; (5) this memory."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.538Z
aliases: reference_delta_cad_asset_generation_2026_05_29
---


# delta CAD-domain asset generation (2026-05-29, session f27ecf49)

Operator directive: *"check all previous sessions from your chat slot + all domain documents and generate memories, CLAUDE.md rules, GSD protocols, wikis and tribal knowledge, then wire/test/validate/synergize to PSN + galaxy."* This was a GENERATION ask (not enumeration).

## Prior-session mining
Reviewed the consolidated delta handoff (`state/shared/handoffs/consolidated/delta.md`, 56 thread sections). Dominant prior topics: `cad-fusion-live` (8), `cad-full-cover` (2), `wire-unwired` (2), `command-kernel` (2), plus zulu-orchestrator / system-viz-brain / token-savings / psn-incorporate one-offs. The load-bearing CAD knowledge (toolchain, 5 failure-modes, JM conventions) was already in memory; the GAP was that it wasn't packaged as generative domain assets (no GSD, no standalone failure-modes lesson, no structured tribal corpus).

## 5 NEW assets generated + wired
1. **GSD protocol** — `mcp-server/data/docs/gsd/CAD_GSD.md`. Canonical print→CAD goal-state-design: 8 explicit states (INTAKE→ARCHETYPE-MATCH→PARAMETRIC-GEN→UNIT-SET→EMIT→LINT→VERIFY→HANDOFF) each with an exit gate + the tool/engine + 5 hard invariants. No CAD GSD existed (confirmed gap). Wired: referenced in galaxy CLAUDE.md §7 + Wiki cross-refs.
2. **Wiki lesson** — `knowledge/wiki/lessons/cad-step-failure-modes.md`. The 5 silent-failure traps as a standalone queryable lesson; registered in `wiki/index.md` + `log.md`.
3. **Tribal corpus** — `state/shared/cad-tribal-delta.jsonl` (6 structured entries: failure-modes + spark-gap + lint-before-ship, corpus-schema-compatible). NOTE (R12): `state/shared/*.jsonl` is **gitignored** (tribal corpora are runtime artifacts, like the main `cad-tribal-corpus.jsonl`), so this lives on-disk only — NOT git-committed/golf-merged. The DURABLE copies of this knowledge are the committed `[[cad-step-failure-modes]]` wiki lesson + galaxy CLAUDE.md §6; the jsonl is a consumable machine-readable mirror.
4. **CLAUDE.md rule** — galaxy §7 anti-pattern: "Ship a .step WITHOUT cad-step-lint" + the GSD VERIFY-gate pointer.
5. **Memory** — this file (auto-feeds Obsidian).

## Synergy / PSN wiring
- **Wiki leg:** lesson registered in index/log. **Memories/Obsidian:** this memory auto-feeds at Stop. **CLAUDE.md/GSD:** galaxy rule + GSD doc cross-link. **Tribal:** delta corpus referenced in galaxy CLAUDE.md + MEMORY. **Hooks:** the GSD/lesson/tribal all point at the already-LIVE `cad-step-lint-guard` + `delta-cad-awareness-inject`.
- All on slot/delta; golf merge → main lands them fleet-wide + triggers regen so the new wiki/GSD nodes enter the system-graph.

See galaxy `MEMORY.md` · [[reference_delta_per_feature_synergy_sweep_2026_05_29]] · [[reference_delta_cad_step_lint_2026_05_29]].
