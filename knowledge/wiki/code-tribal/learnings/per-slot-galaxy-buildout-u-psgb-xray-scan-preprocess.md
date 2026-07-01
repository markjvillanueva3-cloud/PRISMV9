# PER-SLOT-GALAXY-BUILDOUT/U-PSGB-XRAY-SCAN-PREPROCESS — [MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-SCAN-PREPROCESS (slot:xray): grayscale + Otsu binarize + denoise + conservative deskew (pre-test blocker #2)

**Commit:** `43203e2b7140` · **By:** markjvillanueva3-cloud · **At:** 2026-05-30T12:31:55-05:00
**Tags:** per-slot-galaxy-buildout, u-psgb-xray-scan-preprocess, auto-distilled

## Subject
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-SCAN-PREPROCESS (slot:xray): grayscale + Otsu binarize + denoise + conservative deskew (pre-test blocker #2)

## Body
```
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-SCAN-PREPROCESS (slot:xray): grayscale + Otsu binarize + denoise + conservative deskew (pre-test blocker #2)

Roadmap blocker #2. The 12,824 needs-OCR files are SCANS (skew + low-contrast +
JPEG ringing); a raw RGB render makes a low VLM confidence unattributable (model
ceiling vs scan artifact). Three render tiers, all opt-in:

pdf-to-png.py:
 - --grayscale : single-channel render via fitz.csGRAY (pure PyMuPDF, no deps) —
   removes color-channel noise from the VLM's fixed-resize ViT encoder.
 - --preprocess : grayscale base + opencv (cv2.medianBlur denoise + Otsu binarize).
   R12 DEGRADE: if cv2/numpy import fails, the file is LEFT as grayscale and a loud
   "degraded-grayscale (...)" status is printed — NEVER a silent skip. Verified by
   forcing ImportError: returns degraded + grayscale file byte-unchanged.
 - --deskew : (with --preprocess) CONSERVATIVE small-angle deskew — estimates skew
   from dark-pixel minAreaRect, corrects ONLY |angle|<=10deg (a large angle on an
   engineering drawing is dominant part geometry, not page skew — rotating to it
   would WORSEN the image). Verified it SKIPS a 0deg drawing (no spurious rotation).
   opencv-python-headless 4.13.0 + numpy 2.4.6 installed.

run-ollama-vision-extract.mjs: +--grayscale/--preprocess/--deskew threaded through
a new PURE exported buildRenderArgs() (6 unit tests: rgb base, grayscale, preprocess,
preprocess+deskew, preprocess-wins-over-grayscale-no-dup, deskew-dropped-without-preprocess).

Structural verification on a real print: rgb=3ch/256vals (back-compat), grayscale=1ch,
preprocess=1ch/2vals BINARY, deskew=BINARY+skipped(0deg). 14/14 node:tests + py_compile.

SCOPE HONESTY (R12): the preprocessing PRODUCES structurally-correct images (proven);
whether it LIFTS extraction accuracy is GPU-gated/unmeasured (same fleet-GPU-contention
block as the rest of the pipeline). Deskew is conservative-by-design; full deskew
efficacy needs a visual pass against skewed-scan ground truth (deferred to GPU window).
```

## Files touched (4)
- scripts/lib/pdf-to-png.py                  | 73 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++---
- scripts/run-ollama-vision-extract.mjs      | 28 ++++++++++++++++++++++++----
- scripts/run-ollama-vision-extract.test.mjs | 27 ++++++++++++++++++++++++++-
- 3 files changed, 120 insertions(+), 8 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 43203e2b7140`
- Milestone envelope: `mcp-server/data/milestones/PER-SLOT-GALAXY-BUILDOUT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._