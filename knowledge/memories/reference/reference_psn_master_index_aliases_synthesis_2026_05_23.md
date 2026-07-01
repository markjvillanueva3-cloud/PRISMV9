---
name: reference-psn-master-index-aliases-synthesis-2026-05-23
description: 2026-05-23 sierra /loop iter 8-9 — wired iter-3 aliases:[] frontmatter into memory-index-search-lib (W_ALIAS=3.0) + shipped 7-spec synthesis index naming the 4 axes the priors didn't cover (external AI coding-agent landscape, federated-memory leg candidate, 4 new PSN domain candidates 12-15, 10-unit dependency-ordered next-wave queue).
type: reference
slot: sierra
source: prism-memory
synced: 2026-06-27T20:30:47.132Z
aliases: reference_psn_master_index_aliases_synthesis_2026_05_23
---


## What shipped (sierra /loop iters 8-9, one commit `ff644c1e9d`)

| iter | unit | what |
|---|---|---|
| 8 | `PSN-ENHANCE-MS0::U-PSN-DEEP-RESEARCH-SYNTHESIS-2026-05-23` | `state/shared/specs/PSN-DEEP-RESEARCH-SYNTHESIS-2026-05-23.{md,html}` — thin pointer index over 7 prior PSN/Hermes research deliverables (~137 KB of prior work, ~75 units scoped); names the 4 axes the priors do NOT cover + 10-unit next-wave queue. Advisory; zero runtime. |
| 9 | `PSN-ENHANCE-MS0::U-PSN-MASTER-INDEX-ALIASES-2026-05-23` | `scripts/lib/memory-index-search-lib.mjs` + `build-memory-index-sidecar.mjs` — parseAliases(fm) supports 3 frontmatter shapes (inline array / inline JSON / YAML block); buildMemoryRecord surfaces aliases[]; scoreMemoryRecord adds W_ALIAS=3.0 per token hit (mirrors W_NAME). Sidecar emits aliases[]; schema 1.0.0 unchanged (back-compat via lib defaults). 46 lib + 23 sidecar = 69 tests pass. |

## Why iter 8 was a synthesis, not another dossier

By the time sierra's loop got to the deep-research scope, **7 sibling specs had already shipped** today covering the same axes from different angles (HERMES-PSN-RAG-SYNERGY 26K + HERMES-OCTOPUS 17K + HERMES-MEMORY-VAULT 17K + [[reference_high_roi_ai_psn_scope_2026_05_23|HIGH-ROI-AI-PSN-SCOPE]] 18K + PSN-HIGH-ROI-SURFACE 17K + R2 17K + R3 16K). Writing an 8th full dossier was textbook reinvention. The synthesis index does three things instead: (1) names the existing coverage so the operator doesn't re-read 137 KB, (2) names the 4 axes the priors collectively don't cover, (3) emits a dependency-ordered roll-up of the ~75 units scoped across all 7 priors.

## The 4 axes the 7 priors didn't cover

1. **External AI coding-agent landscape integration** — Cline 58k★ (Plan/Act), Continue.dev (JetBrains+VS Code, plugin marketplace), Aider 41k★ (terminal git-native). All MCP-capable. PRISM's missing piece is a discoverable `mcp-server/MANIFEST.json` so every above agent can consume PRISM. Proposed: `U-PSN-MCP-MANIFEST`.
2. **Federated-memory tools as PSN leg candidate** — Letta / Mem0 / Cipher / langmem. Proposed: declare a 12th PSN leg "federated memory" with `prism_memory:fed_export`+`fed_import` actions.
3. **4 new PSN domain candidates** — leg 12 cost/budget telemetry · leg 13 audit-provenance ledger · leg 14 reasoning-trace store · leg 15 plugin-marketplace.
4. **Dependency-ordered roll-up** — 10-unit ranking across all 7 priors by compounding-leverage. Top: U-HRP02 → U-PSN-MASTER-INDEX-ALIASES (this iter) → U-HOC01 → U-PSN-MCP-MANIFEST → A6 GPU-EMBEDDER → U-HMEMV01 → A14 → U-HOC02 → B8 → U-PSN-FED-MEM-LEG.

## Live verification (iter 9)

Rebuilt sidecar against live vault (9266 records, 572 ms):
- `feedback_psk_kernel.md` surfaces `aliases=[PSK, PRISM Syscall Kernel, prism_session-psk, COMMAND-KERNEL-MS0, syscall-kernel]`
- Query `"PRISM Syscall Kernel"` → tokens `[syscall, kernel]` → hits `feedback_psk_kernel.md` at **score 16.0** vs sibling kernel memos at 7.5 / 6.5
- Alias promotion is now load-bearing on the hot path
- 6 of 9266 records carry aliases today (7 iter-3 anchors minus `feedback_golf_owns_reaper` which sources from C: — picks up next obsidian-feed cycle)

## Closes

- `PSN-ENHANCE-MS0::U-PSN-DEEP-RESEARCH-SYNTHESIS-2026-05-23` (iter 8)
- `PSN-ENHANCE-MS0::U-PSN-MASTER-INDEX-ALIASES-2026-05-23` (iter 9)
- Iter-3 R12 follow-up flag from [[reference-psn-enhance-ms0-closeout-2026-05-23]]: *"master-index-search-lib doesn't yet consume the new aliases: frontmatter"*

## R12 disclosures

- W_ALIAS=3.0 mirrors W_NAME — the alias-promoted hit score for a query that hits BOTH name AND alias is W_NAME + W_ALIAS = 6.0 per token (double-count is intentional; aliases ARE name synonyms by design)
- Sidecar schema version held at 1.0.0 — older sidecars without aliases still load via lib's defensive `Array.isArray(rec.aliases) ? ... : ""` default. Back-compat is structural, not a schema bump.
- Only 6 of 9266 memory records currently carry aliases (the 7 iter-3 anchors minus the C:-sourced [[feedback_golf_owns_reaper|golf-owns-reaper]]). The aliases feature has near-zero blast radius until more memories adopt the convention. The 7-anchor seed is the canonical starting set.
