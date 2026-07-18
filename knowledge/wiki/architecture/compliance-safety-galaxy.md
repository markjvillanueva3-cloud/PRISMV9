---
title: Compliance-Safety Galaxy — Architecture Map
type: architecture
domain: compliance-safety
slot: golf
maintainer: golf
seeded_by: alpha
created: 2026-06-01
tags: [compliance-safety, sx-gate, alarm, omega, galaxy]
---

# Compliance-Safety Galaxy — Architecture Map

The compliance-safety galaxy owns the S(x) safety gate + alarm decode + compliance checks for G-code output. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified engine list lives here, NOT hand-copied): `mcp-server/src/engines/compliance-safety/MEMORY.md` · doctrine: `mcp-server/src/engines/compliance-safety/CLAUDE.md`

## Role

`OmegaSafetyScoreEngine` — scalar S(x) ∈ [0,1] gate for G-code output (ENGINE_DIGEST §1911). **HARD STANDING RULE:** `softening-safety-thresholds` is in every cutting-slot soul's refuse-list — never weaken a safety threshold without explicit tier-downgrade authorization. Cross-refs: root CLAUDE.md §SAFETY · the `prism_safety:*` MCP cluster. Doctrine: galaxy 20 in `state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`.

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/compliance-safety/{CLAUDE,MEMORY}.md`
- [[galaxy-context-federation]] — compliance-safety is a federation spoke; rolls up to the master brain
- [[feedback_psn_definition]] — the compliance-safety brain on the PSN engine axis

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the compliance-safety galaxy card + master-index back-pointer. Domain owner refines._
