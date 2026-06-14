---
name: reference_juliett_tribal_corpus_pattern_2026_05_29
description: PRISM tribal-store layout — per-domain corpus JSONL vs the machining tips store (no slot field)
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.177Z
aliases: reference_juliett_tribal_corpus_pattern_2026_05_29
---


**PRISM tribal-store layout (mapped 2026-05-29, slot:juliett).**

- **Machining tips:** `state/tribal_captured_tips.json` — ~486 tips, machining categories (materials/tooling/setup/cam/post/physics). Schema has `title,body,category,tags,material_groups,operation_types,confidence,source,id,created_at,usage_count` — **NO `slot` field.** Do NOT cram non-machining slot tips here.
- **Per-domain corpora:** `state/shared/<domain>-tribal-corpus.jsonl` — the right home for a slot's domain tips. Confirmed: `cad-tribal-corpus.jsonl` (21.7 KB), `cam-tribal-corpus.jsonl` (580 KB). Schema per record: `{ts, schemaVersion, domain, slug, id, kind, source, source_type, tip, consume{...}, audience, spawned_by, must_human_verify, advisory}`.
- **Vector index:** `state/shared/tribal-embed-index.json` (~382 MB) is the L1 index `tribal-by-domain-inject.mjs` reads (env: `INDEX_PATH`). The per-domain corpora feed re-embedding into it.
- **Capture path:** `prism_knowledge:tribal_capture {slot, tip, context, citation}` when MCP is UP. When MCP is DOWN, append a record directly to the per-domain corpus JSONL with the schema above.

Juliett's corpus: `state/shared/database-expansion-tribal-corpus.jsonl`. The `tribal-by-domain-inject` hook surfaces tips by slot→domain mapping on every UserPromptSubmit.
