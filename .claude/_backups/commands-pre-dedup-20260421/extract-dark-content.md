# /extract-dark-content — Dark Content Discovery

Discover and extract knowledge from unindexed, undocumented, or hidden content sources.

## Usage
```
/extract-dark-content [path] [--depth deep|shallow]
```

## MCP Action
```
prism_knowledge:extract_dark_content
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (runs discovery pipeline)
- **Advisor**: Opus 4.6, `max_uses`: 2

## What it does
1. Scan directory for unprocessed files
2. Identify "dark" content (no extraction log entry)
3. Classify content type (program, doc, media, config)
4. Extract knowledge based on type
5. Cross-reference with existing knowledge base
6. Add to extraction log with provenance

## Dark Content Types
- **Programs**: NC files not in extraction log
- **Documents**: PDFs, manuals, notes not indexed
- **Media**: Training videos, photos not processed
- **Configs**: Machine configs, post configs, tool DBs
- **Legacy**: Old formats, archived files

## Discovery Depth
- **shallow**: Top-level directory only
- **deep**: Recursive scan all subdirectories

## Output
- Dark content inventory
- Extraction priority ranking
- New knowledge extracted
- Extraction log updates

## Related
- `/pdf-learn` — Process discovered PDFs
- `/video-learn` — Process discovered videos
- `/scout` — Broader content discovery
