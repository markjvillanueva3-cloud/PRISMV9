---
name: reference-tango-tribal-capture-fallback-2026-05-29
description: how to capture tribal tips for slot tango when MCP (prism_knowledge:tribal_capture) is down
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.970Z
aliases: reference_tango_tribal_capture_fallback_2026_05_29
---


Canonical tribal capture is `prism_knowledge:tribal_capture {slot:'tango', tip, context, citation}` — it persists into `state/shared/tribal-embed-index.json` (the L1 vector index that `tribal-by-domain-inject` reads to surface top-3 tips per UserPromptSubmit). The discovery galaxy CLAUDE.md warns: NEVER write `knowledge/tribal/discovery-*.md` directly — those are auto-overwritten on regen.

**MCP-down fallback (used 2026-05-29):** append structured tips to `mcp-server/data/tribal/tango-discovery-tribal.jsonl` (a durable tribal SOURCE in the same dir as `youtube-toolpath-tribal.jsonl`), shape `{id, slot, domain, content, context, citation, confidence, createdAt}`. This survives regen and can be re-embedded into the index by the embed scripts (`scripts/embed-cited-tips-into-tribal-index.mjs` family) when MCP recovers.

**Re-ingest TODO when MCP is up:** replay the JSONL tips through `prism_knowledge:tribal_capture slot=tango` so they enter the canonical vector index and surface via the hook.
