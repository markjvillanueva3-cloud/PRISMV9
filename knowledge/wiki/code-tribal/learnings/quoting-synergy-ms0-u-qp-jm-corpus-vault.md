# QUOTING-SYNERGY-MS0/U-QP-JM-CORPUS-VAULT — [MAIN-FORCE] [QUOTING-SYNERGY-MS0]/U-QP-JM-CORPUS-VAULT (slot:charlie): JM documents -> Obsidian per-customer settled-price recall corpus (RAG for quoting)

**Commit:** `a35fb0b22c17` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T00:53:48-05:00
**Tags:** quoting-synergy-ms0, u-qp-jm-corpus-vault, auto-distilled

## Subject
[MAIN-FORCE] [QUOTING-SYNERGY-MS0]/U-QP-JM-CORPUS-VAULT (slot:charlie): JM documents -> Obsidian per-customer settled-price recall corpus (RAG for quoting)

## Body
```
[MAIN-FORCE] [QUOTING-SYNERGY-MS0]/U-QP-JM-CORPUS-VAULT (slot:charlie): JM documents -> Obsidian per-customer settled-price recall corpus (RAG for quoting)

Research + build for the operator's 'use obsidian with the jm documents' directive. The JM corpus
lived in flat JSONL silos, not the vault. This emits per-customer recall notes from the $355M
Orders-Closed actuals so the quoting AI can semantically recall a customer's real settled-price
history (ADVISORY -- apply margin floor + calibration, never a bare quote).

- scripts/lib/jm-corpus-vault-lib.mjs (pure core, 11 tests) + scripts/jm-corpus-to-vault.mjs (CLI)
- 394 customer notes -> knowledge/jm-corpus/customers/ + INDEX.md + recall pointer memo
- DATA-QUALITY GATES (R12, all tracked): confidence>=0.6, high-outlier>$2M reject, sub-dollar<$1
  reject, form-label/boilerplate reject (exact + word-boundary regex), out-of-window date null,
  idempotent prune. Gated ~$255M of extraction poison (130M 'BIRMINGHAM', ADDRESS $1.06M fake,
  $0.002 prices, year-4611 dates) out of the raw $281M -> $26.0M plausible recall, 1250 parts.
- CONSERVATIVE customer handling (no fuzzy merge -- soul refuse); only non-customer rejection.
- per-file scrutiny: code-analyzer PASS; reviewer FAILED on 4 recall-poison defects (read the real
  notes) -> all fixed -> re-reviewed PASS. Research: knowledge/wiki/architecture/obsidian-with-jm-documents.md
```

## Files touched (401)
- knowledge/jm-corpus/INDEX.md                                                 |  50 ++++++++++++++++++++++++++++
- knowledge/jm-corpus/customers/accurate-threaded-13ck.md                      |  29 ++++++++++++++++
- knowledge/jm-corpus/customers/adaatf-19mk.md                                 |  29 ++++++++++++++++
- knowledge/jm-corpus/customers/adient-19mr.md                                 |  32 ++++++++++++++++++
- knowledge/jm-corpus/customers/agrah-park-forest-9j6b.md                      |  30 +++++++++++++++++
- knowledge/jm-corpus/customers/agrahpark-forest-1248.md                       |  30 +++++++++++++++++
- knowledge/jm-corpus/customers/agrati-medina-4meb.md                          |  41 +++++++++++++++++++++++
- knowledge/jm-corpus/customers/agrati-p-mpgn.md                               |  33 ++++++++++++++++++
- knowledge/jm-corpus/customers/agrati-par-9hhb.md                             |  30 +++++++++++++++++
- knowledge/jm-corpus/customers/agrati-park-fores-bemw.md                      |  29 ++++++++++++++++
_(+391 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a35fb0b22c17`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._