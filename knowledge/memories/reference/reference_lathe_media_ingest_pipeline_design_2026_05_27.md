---
name: reference-lathe-media-ingest-pipeline-design-2026-05-27
description: Design notes for U-LATHE-MEDIA-INGEST-PIPELINE — RSS + sitemap scraper for Modern Machine Shop + Cutting Tool Engineering + 17 other operator-named manufacturing magazines. Recurring auto-harvest into lathe wiki/tribal nodes.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:09.189Z
aliases: reference_lathe_media_ingest_pipeline_design_2026_05_27
---


# Manufacturing-magazine media ingest pipeline design

## Why this exists

Iter97-iter98 manually harvested two videos each from MMS + CTE. The operator's directive named "manufacturing magazines and other reputable online sources" as a corpus-target. A pull-based scraper that runs nightly would:
- Surface new MMS + CTE articles automatically
- Filter by lathe/turning relevance
- Pipe through lima's pypdf extractor for any PDF content
- Auto-emit wiki + tribal nodes
- Update master index when grade-tables appear

## Target sources (19 total per iter9 vendor-expansion file)

1. **Modern Machine Shop** (mmsonline.com) — RSS available
2. **Cutting Tool Engineering** (ctemag.com) — RSS available + podcast
3. **Production Machining** — sister to MMS
4. **Today's Machining World**
5. **American Machinist** (americanmachinist.com)
6. **Manufacturing Engineering** (sme.org/me)
7. **MoldMaking Technology**
8. **MetalWorking Insider**
9. **PMPA Bulletin** (Precision Machined Products Association)
10. **Smart Manufacturing**
11. **Industrial Machinery Digest**
12. **Manufacturing Today**
13. **Tooling-U SME** (e-learning, paywalled but RSS for new course titles)
14. **CNC Cookbook blog** (cnccookbook.com)
15. **Practical Machinist forum** (practicalmachinist.com — has RSS per-thread)
16. **Lathes.co.uk** — historical reference site
17. **Edge Precision** YouTube blog
18. **Saunders Machine Works** (NYC CNC) YouTube
19. **Edge of Engineering** YouTube

YouTube sources fold into existing `youtube-free-extract.mjs` pipeline (already in use). RSS/sitemap sources need new scraper.

## Pipeline architecture

```
nightly cron (cron-id TBD, every 24h at off-peak)
  ↓
Stage 1: FETCH
  ├── for each RSS source: GET feed.xml → parse <item> elements
  ├── filter by lathe/turning keywords (title + summary tokens)
  └── output: candidate_links.jsonl

Stage 2: DEDUP
  ├── cross-check candidate_links against state/shared/media-ingest-seen.jsonl
  └── output: new_links.jsonl

Stage 3: FETCH-CONTENT
  ├── HTML article → readability + page-to-markdown
  ├── PDF article → lima's pypdf page-by-page extractor
  ├── Embedded YouTube → youtube-free-extract.mjs (existing)
  └── output: ingested-records.jsonl

Stage 4: CLASSIFY
  ├── Run extract-lathe-pdfs-per-page.mjs classifyPage on each record
  ├── Run extract-lathe-videos-tribal.mjs topicsFromBody on text body
  ├── Tag with: iso_group hints, operation hints, vendor mentions, controller mentions
  └── output: classified-records.jsonl

Stage 5: EMIT
  ├── Wiki: knowledge/wiki/lessons/article-<source>-<id>.md per record
  ├── Tribal: append to mcp-server/data/ingestion_cache/lathe-media-ingest-<date>.jsonl
  ├── Vendor-graph (if grade-table detected): patch master index + bump schema
  └── Notify operator via chat-bus: "N new lathe-relevant articles ingested overnight"

Stage 6: STATE
  └── Update state/shared/media-ingest-seen.jsonl with new IDs
```

## Filter heuristics (lathe-relevance gate)

A record passes the filter if ≥1 of:
- Title contains: "lath", "turn", "G7[0-6]", "tool wear", "insert", "boring bar", "thread cycle", "CNC turning"
- Body has ≥5 of the 34 topic-phrase-table tokens from `extract-lathe-videos-tribal.mjs`
- Body mentions ≥1 of: ANSI insert code (regex `[CWDSTV][CN][MA][AGT]-?\d{3}`), ISO group letter, G/M-code (regex `G\d{2,3}|M\d{2,3}`)
- Image-alt or caption refers to a lathe / turning center

Records failing the filter go to `state/shared/media-ingest-rejected.jsonl` for operator-review (don't silently drop — may surface false negatives).

## Authentication + rate limiting

- All sources scraped use public RSS — no API keys needed
- Rate limit: 1 request / 5 seconds per source
- Respect robots.txt (`fetch-with-robots.mjs` helper to be written)
- User-Agent: `PRISM-research-bot/1.0 (https://github.com/markjvillanueva3-cloud/PRISM)`

## Storage

- Raw HTML/PDF cached in `state/shared/media-ingest/raw/<source>/<id>.{html,pdf}`
- Cache retention: 30 days (delete oldest if dir > 1GB)
- Tribal-knowledge JSONL: indefinite (small, append-only)
- Wiki entries: indefinite (operator-curated; promote to permanent via `/wiki-promote`)

## Implementation steps

1. Build `scripts/media-ingest/fetch-rss.mjs` (Stage 1) — handles one source's RSS feed
2. Build `scripts/media-ingest/dedup-store.mjs` (Stage 2) — append-only seen ledger
3. Build `scripts/media-ingest/fetch-content.mjs` (Stage 3) — HTML/PDF/YT switch
4. Build `scripts/media-ingest/classify.mjs` (Stage 4) — calls existing classifiers
5. Build `scripts/media-ingest/emit.mjs` (Stage 5) — wiki + tribal + (optional) master-index patch
6. Build `scripts/media-ingest/runner.mjs` — orchestrates 1→5 in pipeline
7. Register scheduled task: `PRISM Media Ingest` (daily at 03:00 local)
8. Hermetic tests with synthetic RSS feeds + 4 articles per source
9. Operator-confirmation gate before any master-index patch (avoid junk grades polluting)

## Estimated scope

- Pipeline scripts: ~800 LOC across 6 files
- Source-specific RSS adapters: ~50 LOC × 12 RSS sources = ~600 LOC
- YouTube re-use existing extractor: 0 LOC new
- Tests: ~500 LOC / 40 cases (per-stage hermetic + end-to-end)
- Total: ~1,900 LOC, ~10-12 hours

## Why P2

P0 path (the 6 units already designed) gets the wizard FUNCTIONAL on existing 432-video + 14-vendor corpus. Media ingest is corpus-GROWTH — the wizard works without it, but coverage compounds over time with it. Defer until P0 ships.

## Operator-facing UX

- Dashboard: `state/shared/dashboards/media-ingest-summary.html` shows last 7-day harvest counts per source
- Daily summary: chat-bus post "10 new lathe articles overnight: 4 MMS, 3 CTE, 2 cnccookbook, 1 Practical Machinist"
- Operator can disable per-source via env var (`PRISM_MEDIA_INGEST_DISABLE_<SOURCE>=1`)
- Operator can run on-demand: `node scripts/media-ingest/runner.mjs --source mms`

## Related

- [[reference_whiskey_lathe_corpus_state_2026_05_27_iter101]] — current corpus baseline
- [[reference_whiskey_lathe_next_session_p0_implementation_roadmap_2026_05_27]] — P0 path (precedes this)
- [[feedback_use_lima_pypdf_page_extractor]] — Stage 3 PDF parsing
- [[feedback_playwright_for_online_sources]] — Stage 3 HTML fallback when RSS lacks body
- `scripts/extract-lathe-pdfs-per-page.mjs` — Stage 4 classifier
- `scripts/extract-lathe-videos-tribal.mjs topicsFromBody` — Stage 4 classifier
- `scripts/youtube-free-extract.mjs` — Stage 3 YouTube source reuse
- `mcp-server/data/ingestion_cache/lathe-vendor-expansion-2026-05-26.json` — 19-source list lives here
