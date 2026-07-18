---
title: Discovery Galaxy — Architecture Map
type: architecture
domain: discovery
slot: tango
maintainer: tango
seeded_by: alpha
created: 2026-06-01
tags: [discovery, anti-duplication, master-index, orphan-audit, galaxy, tango]
---

# Discovery Galaxy — Architecture Map

The discovery galaxy (owned by **slot:tango**) handles algorithm / engine / pipeline discovery + anti-duplication, master-index search-first discipline, and coverage / orphan audits. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified engine list lives here, NOT hand-copied): `mcp-server/src/engines/discovery/MEMORY.md` · doctrine: `mcp-server/src/engines/discovery/CLAUDE.md`

## Role

Search-first before Grep/Glob/Agent: hit the master index (110K-node graph + wiki + memory). `DuplicationGuardEngine.mustCheckBeforeCreating()` **THROWS** on duplicate engine/algorithm/hook creation. MCP-down fallback for discovery: `node scripts/system-viz-query.mjs find <term>`. Coverage + orphan audits feed the system-viz ghost roosts.

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/discovery/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md`
- [[galaxy-context-federation]] — discovery is a federation spoke; rolls up to the master brain
- [[feedback_psn_definition]] — tango is the discovery brain on the PSN engine axis

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the tango galaxy card + master-index back-pointer. Domain owner (tango) refines._
