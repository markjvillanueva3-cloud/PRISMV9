# Dormant-Data Galaxy MEMORY — VICTOR slot cross-session learnings

> Append-only. Pointer-style. ≤200 lines · ≤140 chars/entry. Older entries archive to MEMORY-ARCHIVE.md.

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="dormant data" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:dormant-data]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/dormant-data_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Archiving Protocol**: The use of specific archiving patterns like U-COLD-ARCHIVE-PATTERN-3 indicates a standardized approach to handling cold data storage.
- **Dormant Data Handling**: Identified dormant units should be prioritized based on their potential ROI and addressed in that order, as per [reference/reference_psn_bridge_audit_2026_05_22].
- **Data Discovery and Documentation**: During the DISCOVER phase, it is a standing rule to document findings continuously rather than at the end. This ensures comprehensive coverage of domain assets and gaps.
- **CAD/CAM File Search Protocol**: For any CAD/CAM file search, H:\\PRISM\\JM DIE FIRST should be the primary location due to its role as the canonical shop archive. This is a standing rule cited in [feedback/feedback_jm_folder_top_of_cad_cam_search].
- **Archiving and Cold Storage**: Multiple references indicate a pattern of archiving scripts and data into cold storage for later use. For example, [reference/reference_post_ship_infra-devtools-u-cold-archive-pattern-3] mentions archiving 19 patterned cold scripts.
- **Dormant Data Audit**: There is a recurring theme of auditing dormant data to identify high ROI capabilities that are sitting unused. This includes audits like the PSN bridge audit in [reference/reference_psn_bridge_audit_2026_05_22] and the Sierra audit in [reference/reference_extracted_modules_dormancy_audit_2026_05_27].
- **Documentation and Memory Writing**: During discovery phases, there is a strong emphasis on writing durable domain memories as you go. This is highlighted in [feedback/feedback_domain_discovery_memories].

## Indexed memories
- **Domain corpus (live counts):** 2 curated memory file(s) · 4 wiki entr(y/ies) · 1 tribal tip(s) matching this galaxy's keyword heuristic.
- **Recall (UP):** `prism_memory:semantic_search query="dormant-data" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/reference/reference_dormant_engine_roadmap_2026_05_22.md` · `knowledge/memories/reference/reference_mcp_bootgrace_dormant_wiring_2026_06_04.md`
- **Sample wiki:** `knowledge/wiki/architecture/dormant-data-galaxy.md` · `knowledge/wiki/architecture/dormant-engine-activation-roadmap.md` · `knowledge/wiki/architecture/tests/un/unused-asset-surfacer-engine.md` · `knowledge/wiki/architecture/specs/spec-dormant-engine-activation-roadmap-2026-05-22.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/learnings/token-context-forge-audit-ms0-u-dormant-features-enum.md`

## Cross-galaxy bridges
- [[../wiring/MEMORY.md]] — every "engine no consumer" routes to romeo; romeo's session log closes the loop
- [[../discovery/MEMORY.md]] — tango's orphan inventory is the OTHER source of unwired-asset findings; deduplicate
- [[../knowledge-conversion/MEMORY.md]] — 3-lane router learnings inform victor's routing decisions
- [[../ai-training/MEMORY.md]] — india's RAG/LoRA corpus needs are downstream of victor's data findings

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **Follow-ups for HookTelemetryEngine**: There are three open follow-ups related to the HookTelemetryEngine persistence mechanism mentioned in [reference/reference_pillar_telemetry_recovery_ms0].
- **GNN Reference-Pool and Per-unit Observations**: The GNN reference-pool feed and per-unit Obsidian memories remain incomplete as part of the U-RAG-4 PARTIAL project, noted in [reference/reference_u_rag_4_synergy_wiring_2026_05_22].
- **Synergy Units for Dormant Modules**: Six ranked synergy units were proposed during the Sierra audit but have not yet been addressed, as per [reference/reference_extracted_modules_dormancy_audit_2026_05_27].

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Standing patterns (load-bearing across all excavation sessions)

- **STRICT ORDER is the doctrine** — `extracted/` exhaustively first, then `extracted_modules/` exhaustively, then rest of codebase folder-by-folder. Intuition-skipping has historically missed dormant assets at scale; the strict order is the operator's guard.
- **CONSUMER CHECK is required for every classification** — `grep` the asset name + signature across `mcp-server/src/`, skills, dispatchers, hooks. "No consumer found" is itself a finding worth routing.
- **`mustNotReExtract` THROWS** — every routing must check `extraction-log.json` first. Re-extraction wastes Anthropic spend AND collides with prior wirings.
- **Ledger is append-only** — `state/shared/dormant-data-ledger.jsonl`. Never rewrite; never delete; status mutations land as new lines with `prior_sha` pointer.
- **Tribal tips route by SLOT AFFINITY** — `tribal-by-domain-inject` slot-mapping, NOT pure keyword. A wedm tip landing in foxtrot's memory is noise.

## Initial state (2026-05-28 baseline at galaxy birth)

**Vendor extraction-log roster** (per `mcp-server/data/state/extraction-log.json`):
- Mastercam 45 · hyperMILL 25 · Okuma 63 · Fanuc 35 · Haas 28 · Titans 42
- (Re-derivation of any of these = wasted spend + DuplicationGuardEngine throw)

**Excavation roots (depth-first order)**:
1. `H:/PRISM/extracted/` (sizes vary by subtree; first sweep should checkpoint every 50 files)
2. `H:/PRISM/extracted_modules/`
3. Rest of H:/PRISM codebase (alphabetical, no skipping)

**Known prior-sweep findings** (orient new sessions):
- See `state/shared/AWARENESS-SNAPSHOT.md` for top orphan engines (some of which will be dormant data extracts not yet routed).
- 593 unwired engines (per romeo's punch list) — overlap with victor findings probable but not guaranteed.
- 26,051 of 38,035 wiki files lack tribal embedding (per coverage banner) — that's a dormant-data class living in wiki, not just extracted/.

## Excavation sessions

> Append new entries here. Each session: `## YYYY-MM-DD — claude-<id> — <root> — <N> findings (<X> routed / <Y> deferred)`

(No sessions yet — victor galaxy just scaffolded. First session should start with `extracted/` Mastercam subtree to take advantage of the already-cataloged 45 entries.)

## Routing decisions taken

> Per finding: `<sha-or-id> | <classification> | <route> | <consumer-found> | <status>`

(Empty; victor sessions populate.)

## Cross-galaxy memory bridges

- [[../wiring/MEMORY.md]] — every "engine no consumer" routes to romeo; romeo's session log closes the loop
- [[../discovery/MEMORY.md]] — tango's orphan inventory is the OTHER source of unwired-asset findings; deduplicate
- [[../knowledge-conversion/MEMORY.md]] — 3-lane router learnings inform victor's routing decisions
- [[../ai-training/MEMORY.md]] — india's RAG/LoRA corpus needs are downstream of victor's data findings

— Established 2026-05-28 by slot:alpha. First entry will land when a victor session reports first batch of findings from `extracted/`.

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Domain anchors (papa 2026-06-09, GALAXY-ENRICH infra lane)
Dormant/orphan-data ledger. Primary corpus is the orphan-inventory + dormant-X audits (internal).
**Internal corpus (primary):** cross-cutting methodology `state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md` + this galaxy's engines `mcp-server/src/engines/dormant-data/` + the operator article-set themes (loops / harness / LoRA / CAG / RAG / obsidian-vault).
**External free-source corpus:** none applies -- this domain is PRISM-internal (codebase + wiki + operator article-set). The internal anchors above ARE the corpus. Regen: `scripts/integrate-infra-domain-anchors.mjs`.

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
