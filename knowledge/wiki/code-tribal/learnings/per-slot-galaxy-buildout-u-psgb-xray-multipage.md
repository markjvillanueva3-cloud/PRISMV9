# PER-SLOT-GALAXY-BUILDOUT/U-PSGB-XRAY-MULTIPAGE — [MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-MULTIPAGE (slot:xray): fix multi-page blindness — render+extract EVERY page (pre-test blocker #1)

**Commit:** `6f18162089cd` · **By:** markjvillanueva3-cloud · **At:** 2026-05-30T11:59:17-05:00
**Tags:** per-slot-galaxy-buildout, u-psgb-xray-multipage, auto-distilled

## Subject
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-MULTIPAGE (slot:xray): fix multi-page blindness — render+extract EVERY page (pre-test blocker #1)

## Body
```
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-MULTIPAGE (slot:xray): fix multi-page blindness — render+extract EVERY page (pre-test blocker #1)

Roadmap blocker #1. run-ollama-vision-extract.mjs rendered page 0 ONLY; 97% of
the corpus is multi-page (avg 4.1, max 31+) so ~76% of all drawing pages were
SILENTLY dropped (R12 + doctrine "split multi-print before OCR, one object/print").

pdf-to-png.py: +--count mode (print page count, exit 0; png_out_path now optional);
docstring corrected ("render ONE page", multi-page via the runner loop).

run-ollama-vision-extract.mjs:
 - getPageCount() via pdf-to-png.py --count.
 - selectPages(pageCount, {page,maxPages}) PURE + EXPORTED — ALL pages by default
   (the fix), --page N forces single (back-compat), --max-pages M caps.
 - extractPage() renders+OCRs+parses one page, never throws (per-page error capture).
 - main() loops selected pages SEQUENTIALLY (intentional — GPU is single-stream;
   parallel would thrash VRAM), emits one outcome_record event PER successful page
   (page_index + page_count tagged), output shape now {page_count, pages_processed,
   pages_ok, pages:[...]}. exit 0 if >=1 page ok, 4 if all failed.
 - FIXED LATENT BUG: the runner had NO entry-point guard — main() ran on import.
   Added isMainModule (fileURLToPath===resolve(argv[1])) so selectPages is importable.

NEW scripts/run-ollama-vision-extract.test.mjs: 8 selectPages cases (default all-pages
+ --page single + out-of-range + maxPages cap + page-overrides-cap + zero/invalid
count + fractional floor + unlimited). Render layer verified live on a real 102-page
PDF: --count=102, per-page render pages 0/1/50 OK, page 200 -> loud exit 2.

Per-page VLM call is the SAME GPU-contended path documented in 8e30251534 (live
batch needs an idle-fleet/exclusive-GPU window); the page-loop machinery is fully
verified at the render+selection layer.
```

## Files touched (4)
- scripts/lib/pdf-to-png.py                  |  88 +++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/run-ollama-vision-extract.mjs      | 247 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++---------------------------------------------------
- scripts/run-ollama-vision-extract.test.mjs |  49 +++++++++++++++++++++++++++
- 3 files changed, 292 insertions(+), 92 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6f18162089cd`
- Milestone envelope: `mcp-server/data/milestones/PER-SLOT-GALAXY-BUILDOUT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._