---
name: reference_xray_blueprint_extraction_ledgers
description: Real blueprint extraction ledgers are date-suffixed — there is no single blueprint-extraction-log.jsonl
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.269Z
aliases: reference_xray_blueprint_extraction_ledgers
---


The seed referenced `state/shared/blueprint-extraction-log.jsonl` — **does not exist**. The real source-SHA dedup + accuracy ledgers (verified 2026-05-29):

- `state/shared/blueprint-accuracy-events.jsonl` — live accuracy event stream (the dedup source to check before re-extracting).
- `state/shared/blueprint-accuracy-state.json` — current accuracy state.
- `state/shared/blueprint-extraction-accuracy-2026-05-24.jsonl` (16MB) · `-deep-reason-2026-05-24.jsonl` (24.5MB) · `-coverage-proof` · `-matched-self-consistency` · `-100pct-proof` (+ `.md` twins) — date-suffixed run ledgers.
- `mcp-server/data/state/extraction-log.json` (54.6KB) — canonical cross-domain extraction registry.
- `mcp-server/data/state/PDF_RESOURCE_MANIFEST.json` · `cad-cam-resources-pdf-index.json` (1MB).

The big `.jsonl` ledgers (16-24MB) must NEVER be full-read — Grep for the SHA/PN. See galaxy TOOLBELT.md.
