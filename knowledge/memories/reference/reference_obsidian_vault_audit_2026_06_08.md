---
name: reference_obsidian_vault_audit_2026_06_08
description: "Sierra's verified Obsidian-vault audit (2026-06-08) — vault is OPERATIONAL-WITH-GAPS; cheap-read path LIVE; node-access map + the A/B/C gap ladder. Persistent context for sierra's system-viz domain."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.233Z
aliases: reference_obsidian_vault_audit_2026_06_08
---


**Verified audit** (slot:sierra, 2026-06-08, 6-agent ultracode workflow `wf_a6916cfe`). Operator goal: "make sure obsidian vault is built+operational like the X articles; map paths to each vault node for cheaper/free token usage." Persisted per operator directive *"whatever full context you gain needs to be persistent for your domain."*

## Doctrine (one line)
The vault is **a retrieval system, not a filing cabinet** (cyrilXBT + [[reference_humza_khalid_obsidian_article_2026_06_08]]): any note findable <30s via Type/Time/Topic/Status, navigated by MOCs, searchable in NL via MCP, **context compounds** (Knowledge→Connection→Synthesis→Intelligence) and eventually **writes back to itself**. PRISM token-economy translation = 7-rule [[feedback_obsidian_low_token_2nd_brain_protocol]]: cheapest read of any node ≈ 200-token card, NEVER a 186K-token full-graph read.

## Verdict: OPERATIONAL-WITH-GAPS
The vault is built, densely populated (39K+ wiki, 11,767 H: memories, 3,920 tribal, 34 galaxy-cards, 301,216 node-cards), and **the cheap-read path the operator asked for is fully LIVE and fresh today**. Every populated node type has a free ~200-token retrieval path. Gaps are all in the **self-maintenance / write-back** layer.

## LIVE (verified this session)
- **CHEAP-NODE-ACCESS-MS0** — `node scripts/system-viz-query.mjs node-card <id>` → ~136 tokens, seek-path (offset index 301,216 cards regenerated TODAY, mtime == live graph), 99.93% cut vs 644MB graph. Cards carry `wikiEntries`/`memoryEntries` (the node→Obsidian edge).
- **pre-bash-graph-inject** (U-SV-NODE-VAULT-PATHS) — emits `📂 vault paths` inline on exact graph hit, both settings, 27/27 tests.
- **node-card-prefetch-inject** — wired 1/1, injects card+doc-pointers zero-tool-call.
- master-index / wiki-precheck / tribal-by-domain / memory-index-precheck injectors all fire.

## GAPS (dependency-ordered A→B→C, R13)
- **A — silent failures (P0):**
  - `memory-rag-inject.mjs` **DEAD** — wired in ZERO settings (0/0/0) yet its header L36 *falsely* claims it's wired (R12 stale-claim). Free sibling `memory-index-precheck-inject` masks it. → U-VAULT-RAG-WIRE.
  - `obsidian-memory-sync.mjs:342` **crashes** on Windows `UNKNOWN -4094` (OneDrive/AV handle contention) — one locked file aborts the whole C:→H: pass (40 errs logged). → U-VAULT-SYNC-RESILIENT (per-file try/catch + retry).
- **B — works-but-manual (P1):** `promote-memory-to-wiki.mjs` + `vault-rot-sentinel.mjs` both run but unscheduled (no cron refs). `wiki/index.md` frontmatter stale (`last_verified 2026-05-08`/"770 entries" vs live). → U-VAULT-MAINT-CRON + U-VAULT-INDEX-META.
- **C — doctrine net-new (P2, operator-gated):** 4,136 broken `[[wikilinks]]` (nothing heals them) → U-VAULT-LINK-HEAL (first write-back unit); tribal→wiki coverage stuck 31.5%; re-inject dedupe; inbox/mistakes EMPTY (no daily-process writer); contradiction detector; `DailyFlashReportEngine.ts:149` email still `console.log("Would email…")` stub.

## Artifacts
- Full report + node-access map: [[obsidian-vault-node-access-map]] (wiki), `mcp-server/src/engines/system-viz/MEMORY.md`.
- Corruption flag: `H:/last.md` is corrupted with hook-error noise; canonical cyril article body intact at `C:/Users/wompu/OneDrive/Pictures/last.md`.
- Prior milestones: OBSIDIAN-VAULT-OPS (U-VAULT02..06), CHEAP-NODE-ACCESS-MS0 (U-SV-NODE-VAULT-PATHS).
