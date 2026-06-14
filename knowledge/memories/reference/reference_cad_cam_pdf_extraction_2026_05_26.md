---
name: reference-cad-cam-pdf-extraction-2026-05-26
description: "2026-05-26 kilo /checkin-kilo expanded scope — shipped multi-source PDF manifest (4008 PDFs across H:/prism/resources + H:/PRISM/JM DIE), full text+HTML extraction pipeline (143 CAD+CAM nodes / 15.8M chars / 10,867 pages), 4 tribal pointer-tip seeds, wiki entry. Attribution absorbed into oscar peer commit 32a707ec22 per shared-tree anti-pattern."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.037Z
aliases: reference_cad_cam_pdf_extraction_2026_05_26
---


# CAD/CAM PDF extraction layer — 2026-05-26 (slot:kilo, attribution absorbed)

## Trigger

Operator (kilo session 91364a5d) expanded the initial PDF-domain-wire task:
> "there are pdfs in the resources folder and jm die folder for several cad cam software generate nodes for ALL text and content (convert to html if it would be helpful) convert to nodes to wire into cad and cam and generate wikis and tribal knowledge if we haven't done so already"

## Shipped (landed in repo via commit 32a707ec22)

| Artifact | Purpose |
|---|---|
| `scripts/build-cad-cam-resources-pdf-index.mjs` v1.1.0 | Multi-source walker (resources/ + JM DIE/) → 4008-PDF manifest |
| `mcp-server/data/state/cad-cam-resources-pdf-index.json` | 4008 entries: blueprint:2975, training:835, cam:129, catalog:38, machine:16, cad:14, mfg:1 |
| `scripts/extract-cad-cam-pdf-content.mjs` (NEW) | pdf-parse v2 `PDFParse({data}).getText()` per-PDF text extractor with HTML view. Idempotent sha8(source/relPath) keying. |
| `scripts/extract-cad-cam-pdf-content.test.mjs` (NEW) | 6 tests — sha8 determinism, textToHtml XSS-safe escaping |
| `state/shared/cad-cam-pdf-nodes/cad/<sha8>.{json,html}` | 14 SOLIDWORKS nodes — 1.57M chars / 1060 pages |
| `state/shared/cad-cam-pdf-nodes/cam/<sha8>.{json,html}` | 129 nodes (113 HYPERMILL + 19 MasterCam) — 14.26M chars / 9807 pages |
| `state/shared/cad-cam-pdf-nodes/blueprint/<sha8>.{json,html}` | 2 sample JM DIE blueprint nodes (full 2975 deferred) |
| `state/shared/cad-cam-pdf-nodes/_progress.json` | Last-run attempted/extracted/skipped/failed counts |
| `scripts/generate-cad-cam-pdf-tribal-seeds.mjs` (NEW) | Aggregates extracted nodes by software → pointer-tribal-tip per software |
| `scripts/generate-cad-cam-pdf-tribal-seeds.test.mjs` (NEW) | 7 tests — aggregateBySoftware + buildTip pure-fn coverage |
| `state/shared/cad-cam-pdf-tribal-seeds.json` | 4 pointer-tips (hypermill, mastercam, solidworks, sample) |
| `knowledge/wiki/architecture/cad-cam-resources-pdf-index.md` | Wiki entry — extraction status + queue + cross-refs |

**27/27 tests PASS** across 4 test files.

## Attribution absorption (regression)

`git add` staged ~305 files / 377K insertions. Lock-sweeper hook then cleared `.git/index.lock`. By the time my `git commit` ran, the staged changes had been swept into oscar's `[OSCAR-SFC-9AXIS-MS0]/U-OSC9-09` commit `32a707ec22`. Files DID land — the deliverable is in the repo — but the commit subject is oscar's, not kilo's.

Same anti-pattern as documented in [[feedback_commit_to_slot_worktree]] ("shared-tree commits get absorbed into peer commits — 3 absorbed in a single golf session 2026-05-24"). The slot-worktree migration (per `H:/prism-slot-kilo` + slot/kilo branch) is the canonical fix, but slot-bridge hooks were disabled per commit `5828080636` (5/26 directive). Currently EVERY kilo chat working in `H:/prism` shared tree is exposed to this absorption risk.

## What landed under oscar's attribution

- 143 CAD+CAM PDF nodes (text + HTML)
- 2 sample blueprint nodes
- 4 tribal pointer-tips
- 4 new scripts + 27 tests
- Wiki entry update

This memory file restores kilo's authorship-of-record despite the commit-log absorption.

## Deferred

- **Full blueprint extraction** (2975 JM DIE customer engineering drawings, ~75 min). Re-run `node scripts/extract-cad-cam-pdf-content.mjs --domain blueprint`. Idempotent.
- **Semantic AI tip promotion** (currently pointer-only). Once Ollama `/api/chat` recovers (offline per fleet banner this session), a follow-up generator can promote pointer-tips → semantic-summary-tips via `/pdf-learn`.
- **Lima course-19 wiki backfill** (sister finding from this session): `course-19-hypermill-nx-solidcam-entry.ts` has 2 tribal mentions but 0 wiki `[[...]]` links vs course-18 which has both. Surfaced to lima's PRISM-ACADEMY-FEATURES-MS0 lane via the U-PDF-DOMAIN-WIRE commit body. Not kilo's lane per soul (`defer-cam-to-echo`).

## Cross-refs

- [[reference_kilo_reorient_2026_05_26]] — sibling kilo session memo (queue-exhausted finding)
- [[feedback_commit_to_slot_worktree]] — the absorption doctrine this commit triggered
- [[feedback_psn_definition]] — 11-leg PSN; tribal is leg #5, wiki is leg #3, both wired here
- `H:/prism/knowledge/wiki/architecture/cad-cam-resources-pdf-index.md` — the canonical wiki entry
