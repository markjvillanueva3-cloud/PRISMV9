---
title: Token-Optimization Galaxy — Architecture Map
type: architecture
domain: token-optimization
slot: alpha
maintainer: alpha
seeded_by: alpha
created: 2026-06-01
tags: [token-optimization, efficiency, obsidian-brain, context, cache, galaxy, alpha]
---

# Token-Optimization Galaxy — Architecture Map

The token-optimization galaxy (owned by **slot:alpha**) owns token economy + efficiency hunting + the Obsidian cross-session brain + the per-chat galaxy-buildout infrastructure. It is the first compliant exemplar of `state/shared/specs/MASTER-BRAIN-TEMPLATE.md` (the template owner eats its own dogfood). Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified engine list lives here, NOT hand-copied): `mcp-server/src/engines/token-optimization/MEMORY.md` · doctrine: `mcp-server/src/engines/token-optimization/CLAUDE.md`

## Role

Token economy gated on `TokenAwarenessEngine` zone (GREEN/YELLOW/RED): at YELLOW prefer `rtk <cmd>` + batched tool calls + Ollama offload; at RED stop new exploratory work + write handoff. Owns the Obsidian-brain memory feed (auto-fed every Stop by `stop-obsidian-memory-feed.mjs`), the tribal-by-domain injection infra, and the GALAXY-CONTEXT-FEDERATION layer (cards/salience/rollup/knows-map/recall/dedup → token savings).

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/token-optimization/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md`
- [[galaxy-context-federation]] — token-optimization OWNS the federation layer (alpha)
- [[feedback_psn_definition]] — alpha is the Obsidian-brain (PSN leg #1) owner

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the alpha galaxy card + master-index back-pointer. (alpha owns this galaxy.)_
