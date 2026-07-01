---
title: MIT-Curriculum Galaxy — Architecture Map
type: architecture
domain: mit-curriculum
slot: golf
maintainer: golf
seeded_by: alpha
created: 2026-06-01
tags: [mit-curriculum, mit-ocw, course-source, corpus, galaxy]
---

# MIT-Curriculum Galaxy — Architecture Map

The mit-curriculum galaxy is the MIT-OCW course source corpus — the upstream catalog the academy teaches from. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified engine list lives here, NOT hand-copied): `mcp-server/src/engines/mit-curriculum/MEMORY.md` · doctrine: `mcp-server/src/engines/mit-curriculum/CLAUDE.md`

## Role

Per the brain: `MitCourseIndexEngine` (indexes 200+ MIT OCW courses), `MITCourseRegistryEngine`, `MITCourseKnowledgeEngine`, `MITCourseDeepLearningEngine`, `MITCourseIntegrationEngine` (PP-AGI academic course integration). **academy** (slot:lima) is the CONSUMER — teaches courses/curriculum/lessons sourced here.

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/mit-curriculum/{CLAUDE,MEMORY}.md`
- [[galaxy-context-federation]] — mit-curriculum is a federation spoke; rolls up to the master brain
- [[academy-galaxy]] — the consumer · [[feedback_psn_definition]]

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the mit-curriculum galaxy card + master-index back-pointer. Domain owner refines._
