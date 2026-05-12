---
name: H:/ drive full utilization audit (10-agent synthesis, 2026-05-07)
description: Brutal-honest audit across 10 agent roles surfacing massive capability OVERPRODUCTION + exposure UNDERPRODUCTION. Overall 41.5/100. Drives the OBSIDIAN-COMPOUND-MS1 extension (S4-S6, 7 new units).
type: reference
originSessionId: cee63f1f-130d-4ed3-baf2-1d8812d9acb2
---
10 parallel agent roles audited the entire H:/ drive (not just PRISM/) for utilization. Average **41.5/100**. The unifying meta-finding: **PRISM is well-built but mostly dark — overproduction of capability, underproduction of exposure/triggering/use.** This is exactly the failure mode cyrilXBT named ("a very organized way to forget things") at the capability layer.

## Per-agent scores

| # | Agent | Score | Headline |
|---|---|---|---|
| 1 | Drive Cartographer | 58 | H:/Tools/nim 3.8GB Llama cache orphaned; H:/data + uploads + cad-engine empty |
| 2 | Worktree Auditor | 72 | 5 lanes 600-850 commits ahead of main (cam-exhaust 850, ppgh05 809, cam-spcfai 759) |
| 3 | Tools/Binaries Scout | 72 | Ollama 122 touchpoints; vllm dir empty; typescript-language-server dark |
| 4 | Resources/JM Die Auditor | 42 | JM Die 12% dark (ok); H:/Resources/ 163,958 files at 0% coverage |
| 5 | Knowledge Vault Coverage | 34 | 4,245 tribal tips written, <5% queried; mistakes/ empty; wiki "722 entries" is index-only |
| 6 | Hook Utilization Census | 48 | 396 hooks on disk, 183 wired = 277 ORPHANED (69%); 4 bare continue:true stubs |
| 7 | Dispatcher Action Coverage | 18 | 4,626 of 7,042 actions (81%) zero test AND zero skill; calcDispatcher 1,288/6.9% tested |
| 8 | State File Auditor | 28 | 79% of 1,369 state files lack schemaVersion; 71d-stale RGS+S1 test scaffolds |
| 9 | Skill & Script Utilization | 18 | Only 11/506 skills (2.2%) ever invoked; /forge=33, all others <10 |
| 10 | External Knowledge Scout | 25 | H:/-root audit PDFs unprocessed; STEP CAD ingestion path missing |

## The numbers in raw form

By count (impressive): 3,156 engines · 96 dispatchers · 7,042 actions · 506 skills · 396 hooks · 1,369 state files · 4,245 tribal tips.

By active use (sobering):
- 11 skills ever invoked
- 19% of actions tested
- 31% of hooks wired
- 22% of state files schema-versioned
- <5% of tribal tips queried
- 0% of H:/Resources/ ingested
- 0% of H:/-root PDFs processed

## Top 7 cross-cutting gaps (worth acting on)

1. **Action dead-code wave** — 4,626 untested+unskilled actions. calcDispatcher: 1,288 actions, 6.9% tested.
2. **Skill invocation desert** — /continue-roadmap suggested 273×, invoked 0×. 495 skills lack `trigger:` metadata.
3. **Resources/training trove dark** — 163,958 files at 0% coverage despite ingestion engines existing.
4. **Hook orphan storm** — 277 hooks on disk not wired in settings.json (69%).
5. **State schema rot** — 1,085 of 1,369 state files lack schemaVersion.
6. **Worktree merge backlog** — 5 lanes with 600-850 commits ahead.
7. **External H: blind spots** — H:/Tools/nim (3.8GB Llama, 0 refs); H:/-root audit PDFs unprocessed.

## How this maps to OBSIDIAN-COMPOUND-MS1 (extended 2026-05-07)

7 new units added across S4-S6 to close the meta-finding:

**S4 — Quick wins (3 units):**
- U-HOOK-STUB-CLEANUP — remove 4 bare continue:true stubs from settings.json
- U-PDF-SCAN-EXTEND — register H:/ root + H:/PRISM/ in PDFProcessingPipelineEngine
- U-SCHEMA-VERSION-BACKFILL — backfill schemaVersion: 1.0.0 on 1,085 unversioned state JSONs

**S5 — Skill push + Resources ingestion (2 units):**
- U-SKILL-TRIGGER-META — add trigger:autoSuggest YAML to top 50 high-suggestion-zero-invoke skills
- U-RESOURCES-INGEST-CRON — weekly scan of H:/Resources/ → knowledge/memories/inbox/

**S6 — Strategic utilization (2 units):**
- U-MEMORIES-MISTAKES-WIRE — auto-postmortem on uncommitted-restart-after-failure
- U-TRIBAL-CONSOLIDATE — weekly cron promoting high-confidence tribal tips to memories/reference/

## Findings DELIBERATELY out of scope for MS1

These are valid but get their own milestones rather than bloating MS1:
- Action dead-code prune (calcDispatcher 1,288 actions) → future ACTION-PRUNE-MS0
- Hook orphan triage (277 hooks WIRE/DELETE/KEEP decisions) → future HOOK-CONSOLIDATE-MS0
- Worktree merge sweep (cam-exhaust + ppgh05 + cam-spcfai) → existing WORKTREE-CONSOLIDATE-MS0
- H:/Tools/nim integration (3.8GB Llama cache) → future LOCAL-LLM-NIM-MS0

## How to apply

- When auditing PRISM, separate **count metrics** from **utilization metrics** — they tell different stories.
- The cyrilXBT principle ("a vault that never talks back") generalizes: any subsystem you build but never read back from is dark capability.
- Push beats pull at every layer: add auto-invoke triggers, scheduled ingestion, contradiction detection, postmortem auto-creation.
- See [[reference_cyrilxbt_obsidian_article_delta_2026-05-07]] for the original framing.
- See [[reference_obsidian_compound_audit_2026-05-07]] for the original 7-unit scope (now extended to 13).

## Cited

- 10-agent parallel scrutiny output, 2026-05-07
- `H:/prism/mcp-server/data/milestones/OBSIDIAN-COMPOUND-MS1.json` (extended envelope, 6 sessions / 13 units)
- [[reference_obsidian_compound_audit_2026-05-07]]
- [[reference_cyrilxbt_obsidian_article_delta_2026-05-07]]
