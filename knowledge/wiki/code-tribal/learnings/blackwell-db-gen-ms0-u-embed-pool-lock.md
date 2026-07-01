# BLACKWELL-DB-GEN-MS0/U-EMBED-POOL-LOCK — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-DB-GEN-MS0]/U-EMBED-POOL-LOCK + H-DRIVE-DB-CENSUS (slot:juliett): GPU embed-pool + cited-tips array-shape fix + multi-writer lock; H: DB catalog

**Commit:** `a4648b64bad9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T10:22:26-05:00
**Tags:** blackwell-db-gen-ms0, u-embed-pool-lock, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-DB-GEN-MS0]/U-EMBED-POOL-LOCK + H-DRIVE-DB-CENSUS (slot:juliett): GPU embed-pool + cited-tips array-shape fix + multi-writer lock; H: DB catalog

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-DB-GEN-MS0]/U-EMBED-POOL-LOCK + H-DRIVE-DB-CENSUS (slot:juliett): GPU embed-pool + cited-tips array-shape fix + multi-writer lock; H: DB catalog

EMBED-CORE (GPU DB-gen efficiency on the RTX PRO 6000 Blackwell):
- Wire embed-engines + embed-cited-tips to the shared bounded-concurrency embed-pool
  (PRISM_EMBED_CONCURRENCY) so per-file Ollama embeds saturate the 96GB GPU
  (nomic-embed-text 137M is ~94%% idle one-at-a-time; wiki embedder measured ~15x @ conc16).
  Default conc=1 = byte-identical serial. Chunked-checkpoint preserves the engines
  3-consecutive-infra-failure circuit breaker (pure testable foldEngineResults).
- FIX cited-tips R12 shape bug: it wrote OBJECT-keyed entries to the ARRAY index, so
  JSON.stringify silently DROPPED every tip (verified 0 tip: entries in the 507MB index
  despite the script having run). Now pushes CANONICAL array entries tribal-rerank reads
  (id/source/domain/title/text/hash/embedding), maps catalog->VALID_DOMAINS (milling->mill,
  post->general), drops 2 phantom catalogs (wedm/lathe files don't exist). PROVEN: 0->10
  tips land, idempotent (hash skip), canonical shape, conc=8 on GPU.
- Wire the canonical cross-process tribal-index-lock into BOTH embedders (the lock header
  names them as unguarded RMW writers): slow embed OUTSIDE the lock, re-read-fresh+splice+
  atomic-write INSIDE; batch preserved + exit-4 on peer contention; staleMs=600s sized to
  the measured ~250s 507MB write (default 30s would stale-steal mid-write -> lost update).
- Tests 53/53 (+13 new: 7 cited-tips array-shape/splice/loadIndex-refusal, 6 foldEngineResults).
- Per-file scrutiny: 2 reviewers x 2 rounds; all P0/P1 resolved (tmp-name, dim-probe, lock, staleMs).

H-DRIVE DB CENSUS (operator goal: categorize + path every H: database for fleet search):
- 11-agent census Workflow -> state/shared/db-census/: unified H-DRIVE-DB-CATALOG.md
  (index-of-indexes, LINKS existing surfaces not duplicates) + DB-GAP-LIST.md + 10 scout
  inventories (real find/du/wc enumeration).
- R12: gap diagnoses are advisory; A2 (the listed #1 P0 'broken DB_MANIFEST pointer') VERIFIED
  FALSE - all 34 PATHS.md already reference the correct data/databases/DB_MANIFEST.json.
  Caveat + correction prepended so no slot blind-executes a fabricated action.
```

## Files touched (20)
- .../wiki/lessons/vlm-ensemble-ocr-and-leading-dot-parse-fix.md   |  17 +-
- scripts/embed-cited-tips-into-tribal-index.mjs                   | 310 ++++++++++++++++++------
- scripts/embed-cited-tips-into-tribal-index.test.mjs              | 104 ++++++++
- scripts/embed-engines-into-tribal-index.mjs                      | 365 +++++++++++++++++++++++++++++
- scripts/embed-engines-into-tribal-index.test.mjs                 | 180 ++++++++++++++
- scripts/lib/ollama-vision-extract-lib.mjs                        |  59 ++++-
- scripts/lib/ollama-vision-extract-lib.test.mjs                   |  31 ++-
- state/shared/db-census/DB-GAP-LIST.md                            |  78 ++++++
- state/shared/db-census/H-DRIVE-DB-CATALOG.md                     | 192 +++++++++++++++
- state/shared/db-census/business-erp-quoting-inventory.md         |  63 +++++
_(+10 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a4648b64bad9`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-DB-GEN-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._