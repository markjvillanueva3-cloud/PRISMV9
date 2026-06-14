---
name: reference-course-forge-stubs-emitter-2026-05-17
description: "Lane C operator-action layer for KNOWLEDGE-CONVERSION-MS0 — hand-curated P1-P10 proposals + bulk emitter (--emit forge-stubs) + 13-case CLI tests. Closes the \"69 FORGE-QUEUE items but no actionable list\" gap."
aliases: reference_course_forge_stubs_emitter_2026_05_17
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.072Z
---


**COURSE-FORGE-STUBS emitter** — shipped 2026-05-17 by slot india (claude-41db1b82).
Three commits: `dea7274d23` (P1-P10 hand-curated) + `5d5c363f0e` (bulk emitter + bundle) + `6ae5399608` (13/13 CLI tests).

**What it ships:**
- `state/shared/specs/COURSE-FORGE-PROPOSALS.md` — P1-P10 stubs with proposed_path, dispatcher_action, dedup_preflight, physics_gate, consolidation/reject guidance, anti-pattern list.
- `scripts/course-data-router.mjs --emit forge-stubs --min-relevance N` — bulk emitter writing `COURSE-FORGE-STUBS.md` (62 stubs at floor 0.6). Kind-aware paths, REJECT auto-flag for first-party CAM bridges, name-similarity dedup-preflight against live `algorithms/`+`engines/` inventory.
- `scripts/course-data-router.cli.test.mjs` — 13 hermetic node:test CLI cases.

**Hard gates (unchanged):** duplicationGuardEngine.mustCheckBeforeCreating() THROW on dup; physics-reviewer PASS for formulas; constants only in `src/physics/constants.ts`; tier-1 CAM bridges (mastercam/hypermill/esprit/fusion360/inventor/solidworks) auto-REJECTED.

**Schema-read-first lesson:** first-pass fixture used OUTPUT decisions[] shape; correct input is INPUT candidateAssets[] shape (schemaVersion, nodeId, candidateAssets[], prismDomains[], mfgRelevance). 9/13 failed → spawnSync stderr capture revealed R12 throw → fixture rewrite → 13/13 PASS. Same class as 2026-05-16 META-tool calculation bugs — assume nothing about schema, read the file first.

**Wiki:** [[course-forge-stubs-emitter]] · **CLAUDE.md:** §[[reference_knowledge_conversion_ms0_2026_05_17|KNOWLEDGE-CONVERSION-MS0]] (paragraph 2). Sister of [[reference_knowledge_conversion_ms0_2026_05_17]] (parent milestone).
