---
name: reference_lima_mit_ocw_harvest_on_demand
description: The MIT-OCW corpus is harvest-on-demand, NOT pre-extracted. The brief's path H:/PRISM/extracted/mit-ocw/ doesn't exist; the real slot (data/extracted-knowledge/mit-courses/) is empty.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.198Z
aliases: reference_lima_mit_ocw_harvest_on_demand
---


Verified 2026-05-28. The galaxy-buildout brief seeds `H:/PRISM/extracted/mit-ocw/` as a corpus root — it does NOT exist (no `extracted/` top-level dir). The real MIT-courses slot `mcp-server/data/extracted-knowledge/mit-courses/` EXISTS but is EMPTY (0 files).

MIT-OCW content reaches PRISM Academy via dispatcher actions on-demand — `mit-courses-harvest`/`mit-courses-audit`/`mit-courses-sources` + the `mcfi_*`/`mcdl_*` loaders + `MitCourseIndexEngine` (indexes 200+ OCW courses) — NOT from a pre-extracted directory tree.

**How to apply:** Do NOT `Glob` a MIT-OCW corpus directory expecting files. To pull OCW content, invoke the harvest/loader actions. The only populated academy SOURCE corpus on disk is lima's pypdf JM-Die page corpus (`mcp-server/data/tribal/jm-die-corpus-pages.jsonl`, 8,752 pages). See [[reference_lima_pypdf_extraction_canonical_2026_05_26]], [[reference_lima_mcdl_mcfi_in_prism_dev]].
