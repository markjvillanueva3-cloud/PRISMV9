---
name: reference-obsidian-vault-ops-2026-06-06
description: "Obsidian vault build-out session (slot:sierra 2026-06-06): vault verdict OPERATIONAL-WITH-GAPS, fixed alias-link bug, shipped U-VAULT02 memory→wiki promotion (55 live) + U-VAULT06 rot sentinel. Recon over-reported gaps — verify before building."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.666Z
aliases: reference_obsidian_vault_ops_2026_06_06
---



# Obsidian vault ops — slot:sierra, 2026-06-06

Operator goal: *"make sure obsidian vault is built and operational like all the x articles ive fed you."* A 5-agent ultracode recon (`wf_7cd4f96e`) returned the verdict + punch list; I worked it down.

## Verdict: OPERATIONAL-WITH-GAPS
The vault IS built and live — 11,751 memory notes, ~38K wiki files, 770-entry `wiki/index.md`, C:→H: feed hooks (`stop-obsidian-memory-feed.mjs` + `memory-mirror-to-vault.mjs`) firing every Stop. The missing piece was the **compounding spine** (memory→wiki promotion), now shipped.

## Shipped (6 commits, branch cad-fusion-live-ms0)
- **U-VAULT-ALIAS-LINK-FIX** — `WikiLintEngine.WIKILINK_RE` (`/\[\[([^\]|]+?)\]\]/g`) demanded `]]` right after the target, so `[[target|alias]]` matched NOTHING — every aliased backlink silently dropped, inflating orphan counts + corrupting wikilink PageRank. Fixed to consume an optional `|alias`. +2 tests (30/30). Silent-data-loss class.
- **U-VAULT02** — `scripts/promote-memory-to-wiki.mjs` (+test 23/23). Promotes memories with ≥3 inbound refs AND ≥7d age into wiki (Matuschak evergreen). Cloned `promote-tribal-to-wiki.mjs`. Live: 11,750 scanned → **55 promoted** (feedback_conflict_fork_rule=150 refs). APPLIED — 55 entries committed.
- **U-VAULT06** — `scripts/vault-rot-sentinel.mjs` (+test 12/12). Read-only auditor for old+orphaned notes; NEVER deletes. Detection proven: 90d=0, 30d=86, 14d=453.

## Two findings worth keeping
1. **Recon over-reports "MISSING".** The Explore-agent synthesis was wrong twice: claimed `memory-mirror-to-vault.mjs` "only routes 6 prefixes" (it routes 12 + Ollama fallback — already correct), and said 192 broken links (actual 5264; 70 safe-aliasable). ALWAYS verify the specific file before building — `duplicationGuardEngine` + a quick read caught both. `find-moc-gaps.mjs` already exists (U-VAULT05 is partial, not missing).
2. **mtime is a dead staleness signal for memory.** The C:→H: mirror rewrites memory files constantly, so every note's fs-mtime looks fresh → the rot sentinel must resolve age from authored date (frontmatter `written_at`/`date`/filename `YYYY_MM_DD`), mtime only as fallback. [[feedback_never_delete_only_disable]] kept the sentinel report-only.

## Still open (handed off)
- **U-VAULT05** Domain MOC generator (genuinely missing; `find-moc-gaps.mjs` is only the gap-finder).
- **#4** master-index frontmatter-alias reads (`master-index-search-lib.mjs`) — verify-first.
- **U-VAULT02/06 cron cadence** — make promotion + rot scan run on a schedule (elevated scheduled-task install; operator-gated).
- **Operator-decision applies**: 70 safe alias rewrites (`fix-broken-wikilinks` guard is operator-gated), `--backlink` memory→wiki pointers, `stop-wiki-from-nodes-autopopulate.mjs` wiring, U-VAULT03 CLAUDE.md back-flow.

Related: [[reference_u_vault01_knowledge_vault_schema]] · [[feedback_reflect_all_changes_post_update]] · [[feedback_always_update_wiki_on_bug_finding]]
