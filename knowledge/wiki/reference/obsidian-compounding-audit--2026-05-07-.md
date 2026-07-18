---
title: "Obsidian compounding audit (2026-05-07)"
name: obsidian-compounding-audit--2026-05-07-
kind: reference
status: promoted
category: reference
domain: knowledge-vault
promoted_from: knowledge/memories/reference/reference_obsidian_compound_audit_2026-05-07.md
promoted_at: 2026-06-06T04:55:55.302Z
source_refs: 6
---

# Obsidian compounding audit (2026-05-07)

External anchor: [[CyrilXBT]] (@cyrilXBT) X post titled *"How to Build an Obsidian Knowledge Vault That Gets Smarter Every Day Without You Doing Anything"* (status 2052235121416188114, captured via Twitterbot UA on 2026-05-07; full body JS-gated, only OG metadata fetched). The 6 implicit pillars from the title: passive-ingest + auto-categorize + auto-cross-ref + auto-summarize + auto-recall + compounding + no-touch maintenance.

## PRISM Obsidian footprint (inventory at audit time)

**Engines that touch the vault:**
- [[ObsidianVaultSyncEngine]] — bidirectional sync, SHA-256 checksums, conflict strategies
- [[ObsidianMemoryRagEngine]] — keyword-gated RAG (called from `memory-rag-inject.mjs` UserPromptSubmit hook). Source lives in `H:/prism-iooms0/` worktree, not main.
- [[ObsidianPluginBridgeEngine]] — Obsidian-side plugins register and query PRISM MCP actions in real-time (rate-limited, capability-scoped)
- [[ConsensusObsidianPersistenceEngine]] — consensus results → vault
- [[WikiIndexMaintainerEngine]] — maintains `wiki/index.md`
- [[WikiLintEngine]] — lints wiki entries
- [[WikiLogAppenderEngine]] — appends to `wiki/log.md`
- [[IterativeRetrievalEngine]] — iterative RAG retrieval

**Hooks that touch the vault:**
- `memory-mirror-to-vault.mjs` — PostToolUse, mirrors C: memory writes to H: vault, tries embed via `prism_memory:remember`
- `memory-rag-inject.mjs` — UserPromptSubmit, keyword-gated vault scan, injects matching entries above prompt
- `wiki-precheck-inject.mjs` — UserPromptSubmit, injects top-3 wiki entries on keyword match
- `auto-consensus-userprompt.mjs` / `auto-consensus-critical-edit.mjs` — consensus flows
- `error-pattern-promote.mjs` — error patterns → wiki
- `worktree-commit-route.mjs` — references knowledge paths in routing logic

**Dispatcher:** [[knowledgeDispatcher]] — `obsidian_sync_pull/push/status/config`, `obsidian_plugin_register/query/subscribe/unsubscribe/status`, `tribal_export_single/bulk/config/status` (13 obsidian-namespace actions total, plus 50+ learn-namespace actions for ingest pipelines).

## 6-system × Obsidian integration matrix (audit verdicts)

| Subsystem | Reads vault? | Writes to vault? | Status | Compounds? |
|---|---|---|---|---|
| Neural net (CrossProcess, NeuralCAD, WikiRAGFeature, PhysicsFeatureExtractor) | Via Qdrant only | Via Qdrant only | **GAP** | No |
| Context retention (handoffs, claude-brief, awareness-rebrief) | Brief generator pulls inventory + git, NOT wiki/ or memories/ | Handoffs land in `state/shared/`, NOT vault | **GAP** | Partial |
| Memory (ObsidianMemoryRagEngine, mirror, sync) | ✓ Direct vault scan, keyword-gated | ✓ PostToolUse mirror, atomic categorization | **STRONG** | Yes |
| Skill usage (~440 skills, ollama-skill-suggester) | Static filename hash, no vault semantic search | Skill telemetry NOT written to vault | **GAP** | No |
| AI routing (aiSystemRouterEngine, FullSystemAICoordinator) | Cached capability matrix, NOT wiki/index.md | Routing decisions NOT logged to vault | **GAP** | No |
| PRISM awareness (CLAUDE-BRIEF generator, drift-monitor) | Inventory + git log, NOT wiki/log.md | Brief overwrites itself, no `summaries/` snapshot | **PARTIAL** | No |

## Pillar-by-pillar grading vs cyrilXBT framing

- **Passive ingest** ✓ — `/pdf-learn`, `/video-learn`, memory-mirror, learn_ingest_*
- **Auto-categorize** △ — Filename-prefix routing only; lessons/+decisions/ subdirs never auto-populate (closed by U-MIRROR-CATEGORIES); no semantic categorizer
- **Auto-cross-ref** ✗ — Memories don't auto-insert `[[wiki-links]]`; mirror is dumb-copy
- **Auto-summarize** △ — Ollama on demand only; no scheduled `summaries/` digest
- **Auto-recall** ✓✓ — memory-rag-inject + wiki-precheck-inject + ObsidianPluginBridge
- **Compounding** △ — wiki/log.md exists, no recall-frequency promotion
- **No-touch maintenance** ✓ — WikiLintEngine; ollama-obsidian-rag is suggest-only (gap noted in [[reference_token_savings_baseline]])

## OBSIDIAN-COMPOUND-MS0 — 7 units that close the gaps

| ID | Title | Files | Risk |
|---|---|---|---|
| U-MIRROR-CATEGORIES | Add lesson_/decision_ prefixes to memory-mirror routing | `.claude/hooks/memory-mirror-to-vault.mjs` | Low |
| U-BRIEF-WIKI | Wiki-aware CLAUDE-BRIEF generator (read `wiki/log.md` tail + `memories/` activity) | `mcp-server/scripts/generate-claude-brief.mjs` | Low |
| U-WIKILINK-OLLAMA | Ollama post-write pass: suggest `[[wiki-links]]` for new memories | new `.claude/hooks/wiki-link-suggest.mjs` | Med |
| U-RECALL-COUNTER | Per-entry recall counter; promote hot entries; new engine in main (not iooms0) | new `WikiRecallCounterEngine.ts` + state | Med |
| U-RAG-EXECUTE | Convert `ollama-obsidian-rag` from suggest-only to actual offload routing | `.claude/hooks/ollama-obsidian-rag.mjs` | Med |
| U-SKILL-TELEMETRY | Weekly skill-usage digest → `summaries/skills-YYYY-WW.md` | new hook | Low |
| U-ROUTING-LEDGER | AI routing decisions append to `summaries/routing-decisions.jsonl` | `AISystemRouterEngine.ts` | Low |

## Constraint observed

- ObsidianMemoryRagEngine source lives in `H:/prism-iooms0/`, claimed by claude-a09ce89e. U-RECALL-COUNTER must therefore implement as a **separate engine in main `H:/prism/`**, not as a method on the iooms0 engine. The counter writes a sidecar state file that the iooms0 RAG engine can consume later when upstreamed.

## How to apply

- When adding new memory subsystems: route by category prefix and ensure all 11 vault subdirs (architecture, code-tribal, concepts, consensus, decisions, entities, lessons, patterns, summaries, trajectories, ux-design) have a path-to-fill.
- When designing new auto-injection hooks: keyword-gate (don't auto-inject every prompt) and use `[[wiki-links]]` so the link graph compounds.
- When building new engines that produce telemetry: append to `summaries/<topic>-YYYY-WW.md` so the vault sees usage patterns over time.
- See [[feedback_obsidian_low_token_2nd_brain_protocol]] for the 7-rule operating playbook.

## Sources / cross-refs

- [[reference_karpathy_llm_wiki_external_validation]] — Karpathy LLM-Wiki pattern, validates index-over-embeddings at PRISM's scale
- [[reference_obsidian_vault_subdirs]] — earlier surfacing of the lessons/+decisions/ gap, now closed by U-MIRROR-CATEGORIES
- [[reference_token_savings_baseline]] — ollama-obsidian-rag suggest-only observation, addressed by U-RAG-EXECUTE
- [[feedback_use_wiki_links_in_memories]] — wiki-link discipline, addressed by U-WIKILINK-OLLAMA

## Source

Promoted from memory [[reference_obsidian_compound_audit_2026-05-07]] (referenced 6x across the vault). The memory remains the editable source of truth.
