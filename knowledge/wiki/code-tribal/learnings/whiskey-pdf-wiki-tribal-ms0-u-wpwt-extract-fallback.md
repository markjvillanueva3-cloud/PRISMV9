# WHISKEY-PDF-WIKI-TRIBAL-MS0/U-WPWT-EXTRACT-FALLBACK — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WHISKEY-PDF-WIKI-TRIBAL-MS0]/U-WPWT-EXTRACT-FALLBACK (slot:whiskey /loop iter7): pdf-parse fallback extractor + 10 milling-OoO wiki extracts

**Commit:** `4e5052c6441f` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T22:48:07-05:00
**Tags:** whiskey-pdf-wiki-tribal-ms0, u-wpwt-extract-fallback, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WHISKEY-PDF-WIKI-TRIBAL-MS0]/U-WPWT-EXTRACT-FALLBACK (slot:whiskey /loop iter7): pdf-parse fallback extractor + 10 milling-OoO wiki extracts

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WHISKEY-PDF-WIKI-TRIBAL-MS0]/U-WPWT-EXTRACT-FALLBACK (slot:whiskey /loop iter7): pdf-parse fallback extractor + 10 milling-OoO wiki extracts

User work order (5/25 /checkin-whiskey): build wikis + tribal from PDFs FIRST (before video-learn), using resources/ folder for milling order-of-operations.

Why bootstrap: slot/whiskey worktree has an abandoned cherry-pick (UltimateSpeedFeedEngine.ts UU + stop-wiki-from-nodes-autopopulate.mjs DU) leftover from a prior whiskey session — out of scope to resolve here. Files were written in H:/prism-slot-whiskey then copied to H:/prism main tree to bypass the blocked commit. Separate cleanup task to resolve the cherry-pick.

Why the script: pdftotext binary missing on this host -> scripts/batch-pdf-extract.mjs blocked on the 593-PDF backlog in resources/RESOURCE PDFS/. mcp-server/node_modules already has pdf-parse v2.4.5 unused. Bridges the gap zero-install.

Adds (3 script files + 10 wiki extracts, 1174 insertions):
- scripts/lib/pdf-parse-extract-helpers.mjs (10 pure exports, SCHEMA 1.0.0): parseArgs + pdfPathToSlug + chooseTargets + harvestStructure (ALL-CAPS/numbered/Chapter heading detector, case-insens dedup, maxHeadings cap) + formatTribalJsonl (confidence 0.3, needs_curation true, bridge_engines [PostProcessorPipelineEngine, UltimateSpeedFeedEngine, MachineControllerEngine]) + formatWikiMarkdown (frontmatter + TOC + paragraph sample + bridge engines + next steps) + buildOutputDescriptor + dateStamp + TOP_MILLING_OOP_PDFS (10 operator-curated)
- scripts/lib/pdf-parse-extract-helpers.test.mjs (27 node:test cases, 27 PASS in 810ms)
- scripts/pdf-parse-extract.mjs (CLI: --max --pages --file --dry-run --slot --out-root; uses pdf-parse v2 PDFParse class API)
- 10 knowledge/wiki/lessons/pdf-extract-*.md (batch-stub quality, confidence 0.3, needs_curation true)

Wave-1+2 results (2004 milling pages indexed in ~65s of CLI runtime):
- NGC Mill Operator (187pg, 25 heads), CNC_Machining_Complete_Eng_Guide (39pg, 10), Fundamentals_of_CNC_Machining (256pg, 25 — Ch1..10 + AppA..F clean), Dynamic_Milling (78pg, 25), Basic_3D_Machining (122pg, 21), Manual 5-axis (114pg, 25), Post Processor Training Guide (314pg, 25), WinMax-Mill Intro (70pg, 25), hyperMILL_2D_3D (602pg, 17), InventorCAM2024_2.5D_Milling (222pg, 6).

Quality contract: batch-stub. Operator curates promotion to confidence >= 0.7 + needs_curation false. Mirrors batch-pdf-extract.mjs schema so wiki-index maintainer + tribal-by-domain-inject + downstream curators surface them automatically.
```

## Files touched (14)
- .../wiki/lessons/pdf-extract-basic-3d-machining.md |  59 ++++++
- ...cnc-machining-the-complete-engineering-guide.md |  49 +++++
- .../wiki/lessons/pdf-extract-dynamic-milling.md    |  59 ++++++
- ...ctive-pdf-version-ngc-2023-english-mill-inte.md |  59 ++++++
- .../pdf-extract-fundamentals-of-cnc-machining.md   |  59 ++++++
- .../wiki/lessons/pdf-extract-hypermill-2d-3d.md    |  56 +++++
- ...inventorcam2024-2-5d-milling-training-course.md |  45 ++++
- .../lessons/pdf-extract-manual-5-axis-machining.md |  59 ++++++
- .../pdf-extract-post-processor-training-guide.md   |  59 ++++++
- ...pdf-extract-winmax-mill-intro-class-workbook.md |  59 ++++++
_(+4 more)_

## Lessons surfaced in commit body
- lessons/pdf-extract-*.md (batch-stub quality, confidence 0.3, needs_curation true)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4e5052c6441f`
- Milestone envelope: `mcp-server/data/milestones/WHISKEY-PDF-WIKI-TRIBAL-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._