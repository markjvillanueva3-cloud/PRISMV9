# CAD-CAM-RESOURCES-INDEX/U-PDF-DOMAIN-WIRE — [MAIN] [CAD-CAM-RESOURCES-INDEX]/U-PDF-DOMAIN-WIRE (slot:kilo iter3): build + query + wiki for 1008-PDF resources/ index.

**Commit:** `67178f76d6e2` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T10:54:22-05:00
**Tags:** cad-cam-resources-index, u-pdf-domain-wire, auto-distilled

## Subject
[MAIN] [CAD-CAM-RESOURCES-INDEX]/U-PDF-DOMAIN-WIRE (slot:kilo iter3): build + query + wiki for 1008-PDF resources/ index.

## Body
```
[MAIN] [CAD-CAM-RESOURCES-INDEX]/U-PDF-DOMAIN-WIRE (slot:kilo iter3): build + query + wiki for 1008-PDF resources/ index.

Operator directive (2026-05-26): "ensure we link pdfs for the cad cam software in the resources folder to the cad and cam node domains for easy access".

Ships 6 artifacts:
- scripts/build-cad-cam-resources-pdf-index.mjs — pure-fn classifier (37 top-level dir mappings + filename heuristics) + idempotent writer. SKIP_DIRS excludes node_modules/site-packages/Lib/bin/mpl-data noise.
- scripts/build-cad-cam-resources-pdf-index.test.mjs — 8 tests covering CAM dirs, CAD dirs, software-label preservation, training/machine/catalog routing, filename heuristics, fallback behavior, separator handling.
- scripts/query-cad-cam-resources.mjs — CLI wrapper. --domain {cad,cam,training,mfg,catalog,machine}, --software, --json, --stats. filterEntries() exported for engine consumption.
- scripts/query-cad-cam-resources.test.mjs — 6 tests covering no-opts, domain filter, software filter, AND combination, empty input, unmatched filters.
- mcp-server/data/state/cad-cam-resources-pdf-index.json — schemaVersion 1.0.0 manifest. 1008 PDFs: cad:14 cam:111 training:835 catalog:38 machine:9 mfg:1.
- knowledge/wiki/architecture/cad-cam-resources-pdf-index.md — architecture entry documenting all 4 surfaces + regen path + cross-refs.

14/14 tests PASS via node --test. Domain enum (cad|cam|mfg|training|machine|catalog) matches tribal-by-domain-inject.mjs's slot-domain mapping per wiki-domain-bias.mjs — future inject hook can drop in without translation.

Closes the gap noted in the system-viz graph: L10 ghost roosts already existed per-PDF (CAD · pdf-resources-* / CAM · pdf-resources-*) but no centralized JSON manifest. Now both surfaces co-exist; consumers prefer the manifest for bulk queries.

Sister finding (not addressed in this commit, surfaced for lima): course-19-hypermill-nx-solidcam-entry.ts has only 2 tribal mentions and 0 wiki [[...]] links vs course-18-cad-cam-entry-level which references reference_cad_software_pipeline_recommendation + multiple tribal hooks. Lima's PRISM-ACADEMY-FEATURES-MS0 should backfill course-19+20 wiki citations.

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Files touched (21)
- .../architecture/cad-cam-resources-pdf-index.md    |   86 +
- .../data/state/cad-cam-resources-pdf-index.json    | 7087 ++++++++++++++++++++
- .../EmployeeMachineDomainAcademyEngine.test.ts     |  390 ++
- .../__tests__/EmployeeTaskHandoffEngine.test.ts    |  530 ++
- .../src/__tests__/KaizenLeanSigmaEngine.test.ts    |  441 ++
- .../engines/EmployeeMachineDomainAcademyEngine.ts  | 1179 ++++
- .../src/engines/EmployeeTaskHandoffEngine.ts       |  675 ++
- mcp-server/src/engines/KaizenLeanSigmaEngine.ts    |  711 ++
- .../src/tools/dispatchers/businessDispatcher.ts    |  215 +
- scripts/build-cad-cam-resources-pdf-index.mjs      |  169 +
_(+11 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 67178f76d6e2`
- Milestone envelope: `mcp-server/data/milestones/CAD-CAM-RESOURCES-INDEX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._