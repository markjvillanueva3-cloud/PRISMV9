---
name: cyril-vault-retrieval-architecture
description: "Cyril's vault-organization companion article (2026-05-23) — retrieval-first principle, 4 retrieval dimensions, 7-folder structure, YYYY-MM-DD naming, YAML properties, 3-category tag prefixes, MOCs, inbox-processing habit, quarterly vault review. PRISM coverage map. Source — x.com/cyrilXBT/status/2058373087330959829 (1.4K likes / 6.1K bookmarks — high how-to value)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.535Z
aliases: reference_cyril_vault_retrieval_architecture_2026_05_23
---


## Core principle

> "You do not organize a vault to put things away neatly. You organize a vault to get things back quickly."
> — Cyril, 2026-05-23

**Retrieval-first.** Every folder, tag, naming decision is evaluated against: does this make retrieval faster or slower? Most systems fail because they're optimized for capture-time, not retrieval-time.

## The 4 retrieval dimensions

When you need a note in the future, you'll know ≥1 of these:
1. **Type** — project / reference / daily / meeting / book / idea / task
2. **Time** — this week / month / specific event-date
3. **Topic** — subject / person / project / concept
4. **Status** — active / complete / archived / waiting / in-progress

A well-organized vault lets you filter by any combination of these in seconds.

## PRISM coverage map

| Cyril's element | PRISM equivalent | Status |
|-----------------|------------------|--------|
| 7-folder top-level (INBOX/NOTES/PROJECTS/AREAS/RESOURCES/ARCHIVE/SYSTEM) | `state/shared/` + `knowledge/wiki/` + `knowledge/memories/` + `mcp-server/` + `JM DIE/` + `scripts/` + `.claude/` | ✅ aligned |
| `YYYY-MM-DD-[TYPE]-[TOPIC].md` naming | `<type>_<slot>_<topic>_<date>.md` (memories), `[SCOPE-MS#]/U-ID` (commits) | ✅ functionally same |
| YAML frontmatter (type/status/date/tags) | Universal across souls + memories + wiki entries | ✅ |
| Tag prefixes (none / `status/` / `project/`) | `[[wikilinks]]` (topic) + commit prefix (project); NO per-tag status prefix | ⚠ gap — could adopt `status/` prefix on memory tags |
| Maps of Content when topic >20 notes | `knowledge/wiki/architecture/<topic>-*.md` indexes | ✅ |
| 5-min/day inbox processing habit | DocuRead inbox + `memory_import_claude` (no daily cron) | ⚠ gap — Cyril's evening 15-min cron |
| Quarterly vault review | `/forge-audit-v2` self-schedules `/loop 7d` (weekly cadence) | ✅ exceeds (weekly > quarterly) |
| Filesystem MCP natural-language search | `prism_session:master_index_query` + `prism_memory:semantic_search` + `prism_knowledge:search` | ✅ exceeds (3 layers) |

## Two gaps worth tracking

1. **No daily inbox-processing cron** — Cyril's pattern processes every evening. PRISM has the inbox infrastructure but no per-slot evening cron. The `/galaxy-buildout-<slot>` Step-5b already writes per-session learnings; a daily evening sweep would consolidate them into the canonical wiki + cross-link by domain. **Candidate skill:** `/inbox-process-<slot>` daily cron per galaxy.

2. **Missing `status/` tag prefix on memory tags** — PRISM tags memories via filename `feedback_*`/`reference_*`/`project_*` prefix and YAML `metadata.type` field, but doesn't track status (`active`/`complete`/`archived`/`reference`) in tag form. Could be added to MEMORY.md frontmatter without disruption.

## Companion to (not duplicate of)

- [[reference_cyrilxbt_obsidian_article_delta_2026-05-07]] — Cyril's earlier delta article (already in knowledge/memories)
- [[reference_karpathy_obsidian_4layer_framework_2026_05_28]] — Cyril's framework-level companion (May 27 article — the 4-layer Karpathy framework). **This vault-architecture article is the FILE-SYSTEM substrate; the May 27 article is the COGNITIVE-PROCESS layer on top.**

## One quote worth keeping

> "The vault does not become perfectly organized on the day you implement the system. It becomes progressively more organized every week you use the system. After six months the vault that used to be a source of frustration becomes a system you can trust."

Source: x.com/cyrilXBT/status/2058373087330959829 (article 2057568624345563136), 2026-05-23, 1,429 likes / 6,139 bookmarks (4.3× bookmark/like ratio = high how-to value).

Captured from `C:/Users/wompu/OneDrive/Pictures/last.md` (operator-provided text dump; article gated behind x.com login wall otherwise).

Related (today's framework family):
- [[reference_karpathy_obsidian_4layer_framework_2026_05_28]]
- [[reference_bibryam_large_codebase_8_patterns_2026_05_28]]
- [[reference_khairallah_5layer_context_engineering_2026_05_28]]
- [[reference_zodchii_self_correcting_claude_md_2026_05_28]]
