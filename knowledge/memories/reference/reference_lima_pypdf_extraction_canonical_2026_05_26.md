---
name: lima-pypdf-extraction-canonical-2026-05-26
description: "Lima's pypdf page-by-page extractor empirically dominated whiskey's pdf-parse heading-anchor method by 76× on the same 80-PDF corpus; codified as canonical method via feedback_use_lima_pypdf_page_extractor"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.644Z
aliases: reference_lima_pypdf_extraction_canonical_2026_05_26
---


# Lima's pypdf extractor — empirically canonical (slot:delta 2026-05-26)

User directive: *"make a memory, wiki and rule for utilizing lima's extraction method so all chats going forward use it since it yielded better results"*.

## The empirical comparison

Two extraction approaches ran against the same 80-PDF / 1.1 GB JM DIE/TRIBAL + WIKI corpus on 2026-05-26:

| Method | Owner | When | Yield | Architecture |
|---|---|---|---|---|
| **`extract-jm-die-corpus-page-by-page.py`** | slot:lima | 2026-05-26 14:43 (commit `3eaef94ca7`) | **8,752 page-level tribal entries** / 11,160 pages / 73 PDFs success / 8 fail (5 encrypted + 1 zip + 2 malformed) | pypdf · page-by-page · notability-scored (0.0-1.0 floor 0.4) · ease-first curriculum ordering · domain-tagged (12 domains) |
| `pdf-parse-extract.mjs` | slot:whiskey (2026-05-25) used by slot:delta (2026-05-26) | 2026-05-26 19:08-19:53 | 115 jsonl rows + 102 wiki/lessons stubs from 80 PDFs | pdf-parse · heading-anchor only · 1 dominant tip per PDF · no scoring · no domain tagging |

**Lima's method yields 76× more page-level tribal entries** AND those entries are domain-tagged so `tribal-by-domain-inject` surfaces them on the right slot's prompts.

## Why lima's wins architecturally

1. **Page granularity** — every coherent page becomes a separately-addressable tribal entry. Whiskey's heading-anchor collapses an entire PDF into 1 tip.
2. **Notability scoring** — pages below floor 0.4 (TOC/cover/blank/all-caps-heading-dominated) are filtered. ~22% of all pages were correctly skipped.
3. **Domain tagging** — each entry carries one of 12 domains (mill/cnc-programming/tooling/five-axis/reference/lathe/cad/safety/wedm/software-cs/fundamentals/cam-training), enabling per-slot surfacing.
4. **Ease-first curriculum ordering** — beginner content extracts before reference manuals, matching the user's stated preference ("from the easiest input to complex work").
5. **Local + free** — pypdf is Python local, no API calls, no rate limits.

## Domain distribution of lima's 8,752 entries

```
mill:             2423
reference:        1347
cnc-programming:  1012
tooling:           786
unknown:          1268
five-axis:         169
(others — lathe / cad / safety / wedm / software-cs / fundamentals / cam-training): ~1747
```

## Artifacts (all committed on `slot/lima`, in `H:/prism-slot-lima/`)

| Path | Size | Contents |
|---|---|---|
| `scripts/extract-jm-die-corpus-page-by-page.py` | 11.1 KB | Python pypdf extractor (the script itself) |
| `scripts/catalog-jm-die-tribal-wiki-corpus.mjs` | — | Node catalog builder that produces the ROI-ranked queue |
| `mcp-server/data/tribal/jm-die-corpus-pages.jsonl` | **16.7 MB** | **8,752 page-level entries** (the corpus output) |
| `mcp-server/data/tribal/jm-die-corpus.jsonl` | 45.6 KB | 82 catalog entries (one per PDF in TRIBAL+WIKI) |
| `mcp-server/data/tribal/jm-fleet-machines.jsonl` | 63.9 KB | 154 per-machine academy course entries |
| `knowledge/wiki/code-tribal/jm-die-corpus/` | — | 83 stub wiki entries (one per PDF + `_index.md`) |
| `state/shared/jm-die-corpus-queue.json` | — | ROI-ranked processing queue |

## Lima's 4-commit lineage today (2026-05-26)

1. `5b471c0d02` (10:22) — Academy courses 44-47 (JM Fleet Lathes/Mills/EDM + Lean-Sigma-Kaizen): 18 wiki + 154 tribal + 27 tests
2. `6c25a28b25` (13:55) — Corpus catalog: 82 stub wiki + 82 catalog tribal + 83 graph nodes + 195 edges + ROI queue + 22 tests
3. `82a7fd3545` (14:08) — Python extractor + first-wave 110 entries / 5 PDFs
4. `3eaef94ca7` (14:43) — **FULL CORPUS DRAIN** — 8,752 page entries / 11,160 pages / 73 PDFs

## Doctrine implications

- New rule: **[[feedback_use_lima_pypdf_page_extractor]]** — codified across fleet
- New wiki: `knowledge/wiki/architecture/lima-pypdf-extraction-method.md` — canonical method documentation
- Updated rule path: for any "extract PDF to tribal" task, the dispatcher should pull lima's script first; pdf-parse-extract.mjs is deprecated for new corpus drains (still valid for ad-hoc heading-anchor on a single PDF if pypdf is unavailable).

## Lesson for delta (and any chat)

I (delta) ran the pdf-parse-extract approach for ~6 iters across two /loops before discovering lima had already shipped the better method 5 hours earlier. The `/system-viz-first audit` doctrine ([[feedback_system_viz_first_audit]]) is exactly the gate that should have caught this overlap. Future rule: BEFORE starting any "extract corpus to tribal" task, grep recent (24h) commits for `extract` + `jm-die` + the target corpus name. Specifically:

```bash
git log --since="24 hours ago" --all --oneline | grep -iE "extract|tribal|corpus|page-by-page"
```

If a peer has already shipped the deeper method, consume their output (`tribal-by-domain-inject` does this automatically once the .jsonl is in `mcp-server/data/tribal/`) instead of re-extracting.

## Related

- [[feedback_use_lima_pypdf_page_extractor]] — the standing rule
- [[reference_jm_die_tribal_wiki_100pct_complete_2026_05_26]] — delta's (now-superseded) extraction run
- [[reference_pdf_node_wiki_tribal_pipeline_run_2026_05_26]] — earlier pdf-parse pipeline run
- [[feedback_system_viz_first_audit]] — the rule that would have caught this overlap if applied
