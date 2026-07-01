---
name: use-lima-pypdf-page-extractor
description: "All chats use lima's pypdf page-by-page extractor for PDF→tribal-knowledge ingestion — NOT pdf-parse-extract.mjs (heading-anchor only); lima's method yields ~76× more page-level entries with notability scoring + domain tagging"
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.448Z
aliases: feedback_use_lima_pypdf_page_extractor
---


# Use lima's pypdf page-by-page extractor (CANONICAL — all chats)

**Rule (user directive, 2026-05-26):** For all PDF→tribal-knowledge ingestion across the fleet, use lima's `scripts/extract-jm-die-corpus-page-by-page.py` (pypdf-based, page-by-page, notability-scored, domain-tagged). Do NOT use `scripts/pdf-parse-extract.mjs` (whiskey's older heading-anchor approach) for new corpus drains.

**Why:** Empirical comparison on the same JM DIE/TRIBAL + WIKI corpus (80 PDFs, 1.1 GB) on 2026-05-26:

| Method | Output | Approach |
|---|---|---|
| **Lima `extract-jm-die-corpus-page-by-page.py`** (pypdf) | **8,752 page-level tribal entries** from 73 PDFs / 11,160 pages | Page-by-page extraction + notability score (0.0-1.0, floor 0.4) + domain classification (mill / cnc-programming / tooling / five-axis / reference / lathe / cad / safety / wedm / software-cs / fundamentals / cam-training) + ease-first curriculum ordering |
| Whiskey `pdf-parse-extract.mjs` (pdf-parse) | 115 jsonl rows + 102 wiki/lessons stubs from 80 PDFs | Heading-anchor only (1 dominant tip per PDF), no notability scoring, no domain tagging |

Lima's method is **76× deeper** AND ships pages tagged with domain so `tribal-by-domain-inject` surfaces them on the right slot's prompts.

## How to apply

1. **Single PDF**: `python scripts/extract-jm-die-corpus-page-by-page.py --file <pdf-path>` (or whatever the script's CLI offers; check `--help`).
2. **Queue-driven**: the script reads `state/shared/jm-die-corpus-queue.json` (ROI-ranked, top entry is the largest-domain-priority PDF first). Re-rank if needed via `scripts/catalog-jm-die-tribal-wiki-corpus.mjs`.
3. **Output**: appends to `mcp-server/data/tribal/jm-die-corpus-pages.jsonl` (gitignored, regenerable — golf hygiene preserves on disk).
4. **Wiring**: page-level entries auto-surface via `tribal-by-domain-inject` once the domain matches the slot soul's `domain_filter`.

## Notability scoring details (preserved here for future operators)

```
baseline 0.3
+ length bonus: +0.1 if page text >500 chars, +0.1 if >2000 chars
+ params (RPM/SFM/IPM/IPT/mm/min regex hits) × 0.04, cap 0.2
+ formulas (var=expr regex) × 0.02, cap 0.15
+ safety (warning/caution/never/always regex) × 0.02, cap 0.10
- 0.15 if all-caps-heading-dominated (TOC penalty)
floor: skip pages below 0.4 (currently filters ~22% as low-value TOC/cover/blank)
```

## Ease-first curriculum order

```
ease = intro_boost (30 for intro/basics/fundamental/easy/guide/tutorial keywords in filename)
     + domain_boost (10 for fundamentals domain)
     - size_penalty (min(50, size_mb) * 0.4)
```

Beginner content extracts first; reference manuals last. The fleet processes the corpus as a curriculum, not a flat batch.

## Why this rule (anti-rework)

Without this rule, the next chat asked to extract PDFs will reach for the most-visible script (`pdf-parse-extract.mjs` is wired into more existing infrastructure) and duplicate ~1% of the work for ~76× the token cost. Lima already shipped the full TRIBAL+WIKI drain on 2026-05-26 14:43; future chats should consume the 8,752-entry `jm-die-corpus-pages.jsonl` via `tribal-by-domain-inject`, not re-extract.

## Where lima's artifacts live

- **`H:/prism-slot-lima/scripts/extract-jm-die-corpus-page-by-page.py`** (11.1 KB) — the canonical extractor (committed by lima 2026-05-26 14:08 in commit `82a7fd3545`)
- **`H:/prism-slot-lima/mcp-server/data/tribal/jm-die-corpus-pages.jsonl`** (16.7 MB) — 8,752 page-level tribal entries
- **`H:/prism-slot-lima/mcp-server/data/tribal/jm-die-corpus.jsonl`** (45.6 KB) — 82 catalog entries (one per PDF in TRIBAL+WIKI)
- **`H:/prism-slot-lima/mcp-server/data/tribal/jm-fleet-machines.jsonl`** (63.9 KB) — 154 academy course entries
- **`H:/prism-slot-lima/knowledge/wiki/code-tribal/jm-die-corpus/`** — 83 stub wiki entries

Lima's lineage: commit `5b471c0d02` (academy courses 44-47) → `6c25a28b25` (catalog) → `82a7fd3545` (extractor + first wave) → `3eaef94ca7` (full corpus drain).

## Future-proofing

If `extract-jm-die-corpus-page-by-page.py` lives only in slot/lima and not in the shared tree, the next operator must merge slot/lima → cad-fusion-live-ms0, OR re-create it from the script's content (referenced in [[reference_jm_die_lima_page_extraction_2026_05_26]]). Surfacing this rule in MEMORY.md keeps the canonical method discoverable across all 26 slots.

## Related

- [[reference_jm_die_tribal_wiki_100pct_complete_2026_05_26]] — the delta-side 80-book extraction that was superseded by lima's deeper extract
- [[feedback_system_viz_first_audit]] — query /system-viz BEFORE re-implementing — would have caught this overlap
- [[feedback_pick_unit_system_viz_guidance]] — pick-unit research-block step
- [[reference_pdf_node_wiki_tribal_pipeline_run_2026_05_26]] — the pdf-parse-extract pipeline that this rule deprecates for new corpus drains
