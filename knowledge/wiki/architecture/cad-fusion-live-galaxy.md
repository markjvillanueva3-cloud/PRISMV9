---
title: CAD-Fusion-Live Galaxy — Architecture Map
type: architecture
domain: cad-fusion-live
slot: golf
maintainer: golf
seeded_by: alpha
created: 2026-06-01
tags: [cad-fusion-live, fusion360, live-session, mill-turn, galaxy]
---

# CAD-Fusion-Live Galaxy — Architecture Map

The cad-fusion-live galaxy is the long-running CAD/Fusion live-session pattern — the bridge to a live Autodesk Fusion 360 seat for interactive CAD generation. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified engine list lives here, NOT hand-copied): `mcp-server/src/engines/cad-fusion-live/MEMORY.md` · doctrine: `mcp-server/src/engines/cad-fusion-live/CLAUDE.md`

## Role

Per the brain: `Fusion360MillTurnBridgeEngine` (Fusion 360 mill-turn machine + spindle handoff, `SpindleConfigSchema`), `AutodeskFusionMCPProxyEngine` (JSON-RPC 2.0 client for Autodesk's official MCP), `FusionProjectCrawlerEngine` (recursive Fusion cloud-project crawler). NEVER inline a physics/material constant. Sibling of the cad galaxy (delta) — this is the live-seat session pattern, cad is the geometry intelligence.

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/cad-fusion-live/{CLAUDE,MEMORY}.md`
- [[galaxy-context-federation]] — cad-fusion-live is a federation spoke; rolls up to the master brain
- [[cad-galaxy]] — sibling geometry galaxy · [[feedback_psn_definition]]

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the cad-fusion-live galaxy card + master-index back-pointer. Domain owner refines._
