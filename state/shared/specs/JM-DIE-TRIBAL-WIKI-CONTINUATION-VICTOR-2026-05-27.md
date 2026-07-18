# JM DIE/TRIBAL+WIKI ingest — continuation directive (U-VICTOR-D)

> **Status:** 8 of 93 PDFs extracted (delta 2026-05-26). 85 remaining. This file is the resume directive for the next slot to pick up the unit `U-JM-DIE-TRIBAL-WIKI-INGEST-COMPLETE`.

## Why this isn't an inline-build deliverable for victor

Per Karpathy R12 (fail-loud) — extracting 85 PDFs (1.0+ GB) consumes hours of script-time, not chat-iters. It is **operator-time** work that a next-session chat or a scheduled batch picks up. Victor's 12-unit MS0 ships the *plumbing* (per-domain audit, per-domain inject, audit cron, promotion cron, consolidate cron, prune, file-watcher, gap-closing seeds, alarm-mine) — the JM DIE corpus is what flows *through* that plumbing.

## Tier order (per delta's [[reference_jm_die_tribal_wiki_extraction_starter_2026_05_26]])

| Tier   | Size range  | Count | Strategy |
|--------|-------------|------:|----------|
| medium | 1.5MB–10MB  | ~45   | `pdf-parse-extract.mjs --pages 60` |
| heavy  | 10MB–25MB   | ~25   | `--pages 100`, ~5 min per book |
| massive| 100MB+      | 2     | chapter-by-chapter splits — David Planchard SolidWorks 2021 (115MB) + InventorCAM 2024 2.5D (48MB). pdf-parse loads the entire PDF into memory; whole-book extract OOMs. |

Or per [[feedback_use_lima_pypdf_page_extractor]] (preferred since 2026-05-26): `extract-jm-die-corpus-page-by-page.py` is the canonical extractor, 76× deeper than pdf-parse.

## Concrete next-session commands

```bash
# 1. Catalog current state (delta's index — 3935 PDFs including these 85)
node H:/prism/scripts/catalog-jm-die-tribal-wiki-corpus.mjs

# 2. Lima pypdf canonical path (per feedback_use_lima_pypdf_page_extractor)
python H:/prism/scripts/extract-jm-die-corpus-page-by-page.py --tier medium --max 10

# 3. Promote candidates above conf 0.9 (or wait for U-VICTOR-C1 cron at 03:17)
node H:/prism/scripts/promote-tribal-to-wiki.mjs --apply --threshold 0.9

# 4. Re-embed into tribal-embed-index (or wait for the daily regen)
node H:/prism/scripts/embed-tribal-jsonl-into-index.mjs

# 5. Re-run per-domain audit (or wait for U-VICTOR-A3 cron at 00:08)
node H:/prism/scripts/wiki-tribal-cross-ref-audit.mjs
node H:/prism/scripts/audit-tribal-coverage-by-domain.mjs
```

## What lands when the 85 books finish

Predicted impact on per-domain coverage (filename-classifier guesses from `build-cad-cam-resources-pdf-index.mjs`):
- **cad** +24 books × ~50 tips each ≈ +1,200 tribal candidates
- **cam** +35 books × ~40 tips each ≈ +1,400 tribal candidates
- **training/general** +21 books → cross-domain
- **mill / lathe / wedm** subset get strong reinforcement

Auto-promote at conf 0.9 typically promotes 5–10% of candidates. Expected wiki delta: +200 to +400 wiki entries across cad/cam/mill/lathe over 1 week of nightly promotion.

## Why this matters for the closed loop

The U-VICTOR plumbing is silent (97% coverage maintenance) until new content lands. The JM DIE 85-book backlog is the **biggest single content drop** in the queue. Closing it is what proves the closed loop self-improves over time — not just maintains the existing 97%, but grows the corpus.

## References

- [[reference_jm_die_tribal_wiki_extraction_starter_2026_05_26]] — delta's 8-of-93 starter run
- [[reference_existing_tribal_wiki_pipeline_2026_05_27]] — 9-stage pipeline tour
- [[feedback_use_lima_pypdf_page_extractor]] — canonical extractor doctrine
- `state/shared/specs/CLOSED-LOOP-TRIBAL-WIKI-PLAN-VICTOR-2026-05-27.md` — the 12-unit plan this completes
