# Auto-Ingested Tips Quarantine

**Created:** 2026-05-17 by OBSOLESCENCE-CLEANUP-MS0/U-OBS-A4 · slot mike

## What's here
326 `auto-ingested-tips-auto-NNNN.md` files moved from `knowledge/tribal/` (parent dir).

## Why
These files were auto-extracted by `auto-ingested-tips.ts` (per their frontmatter `_source` field) with low quality control:
- Titles often truncated ("a new", "Warning", placeholder text)
- Bodies cut mid-sentence
- Tagged `auto-ingested` but no quality gate before publication
- Surfaced as noise in `tribal-by-domain-inject`, `wiki-precheck-inject`, `wiki-recall-on-read`, and `memory-rag-inject` because they live alongside curated tribal tips in the same directory

## Quarantine effect
By moving them to a subdirectory, the noise hooks that scan `knowledge/tribal/*.md` (flat glob) no longer pick them up. If a hook scans recursively, the README + dir name signal "quarantine" to any downstream consumer.

## What to do next (out-of-scope of this session — follow-up unit)
1. Identify the upstream ingestor (`mcp-server/src/engines/TribalKnowledgeEngine.ts`, `extractionIngestionHook.ts`, `extractionMaintenanceHook.ts`) and gate it behind a quality threshold before it re-publishes new `auto-ingested-tips-auto-NNNN.md` files into the parent dir
2. Either re-curate the 326 files individually OR delete the quarantine after a 30-day grace period
3. Once gated upstream, the inject-layer filter shipped in AUTO-INVOCATION-MS0/U-AIM02 (`tribal-by-domain-inject.mjs::isAutoIngestedNoise`) can be removed

## Reversibility
To restore (e.g., if a downstream consumer breaks): `cd knowledge/tribal && mv auto-ingested-quarantine/auto-ingested-tips-*.md .`
