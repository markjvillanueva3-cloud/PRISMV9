# Blueprint-Reading + GD&T Tribal-Knowledge Injection Plan

> **Operator directive (2026-06-19, slot:xray):** *"plan for tribal knowledge injection — if we
> don't have enough data on blueprint reading, gather sources, run pdf-learn and video-learn to
> extract as much data on blueprint reading and GD&T."*
> **Motivation:** delta missed features/dimensions that were clearly visible on a print. Better
> print interpretation needs (a) a stronger VLM/parser (separate xray work) AND (b) deeper tribal
> knowledge of *how engineering drawings + GD&T are read*, injected at runtime.

---

## 1. Assessment — do we have enough? (enumerated, not guessed — R: all-means-all)

| Layer | Count / state | Verdict |
|---|---|---|
| code-tribal `.md` (total) | 7,632 | — |
| tribal files matching GD&T / datum / FCF / true-position / title-block / view-projection | **260** | moderate, many incidental |
| GD&T parser engines | `GDTCalloutParserEngine`, `PrismEnhancedGDTEngine`, `FCFSyntaxValidatorEngine`, `PrismSurfaceFinishEngine` | **built** |
| wiki blueprint/GD&T entries | blueprint-vision galaxy, extraction-confidence, open-source-vision-options, print-to-cnc capability, academy course-0c (blueprint-reading + GD&T) | present |
| **authoritative SOURCE corpus** (ASME Y14.5 interpretation, blueprint-reading textbooks, GD&T primers, instructional video) | **THIN** — no dedicated GD&T/Y14.5 source PDF found in `resources/` (1,256 PDFs scanned; only an incidental `2D_Drawing.pdf`) | **GAP** |

**Conclusion:** parsing *machinery* exists, but the *knowledge corpus* on reading drawings + interpreting
GD&T callouts (datum precedence, MMC/LMC bonus tolerance, composite FCFs, projected tolerance zones,
view projection, section/detail conventions, surface-finish lay symbols, weld symbols) is shallow.
The operator's conditional is **met → gather + ingest**.

---

## 2. Pipeline (reuse — R8, do NOT reinvent)

Existing, verified infrastructure:
- **`scripts/pdf-corpus-watcher-sweep.mjs`** — periodic sweep of `resources/` + `JM DIE/`; diffs
  `state/shared/.pdf-watcher-seen.json`; `--extract` invokes `pdf-parse-extract.mjs` (MAX_FIRE-capped).
  Its scheduled task `PRISM PDF Corpus Watcher` is currently **Disabled** (wiring gap).
- **`scripts/pdf-parse-extract.mjs`** — per-PDF text extraction (CPU; lima pypdf page-by-page is the
  canonical deep extractor — `feedback_use_lima_pypdf_page_extractor`).
- **`/pdf-learn`** + **`/video-learn`** skills → Ollama extraction ($0; qwen2.5-coder:32b extract,
  gpt-oss:20b structure) → **`/wiki-ingest`** → tribal embed index → **`tribal-by-domain-inject`** hook
  surfaces top-3 tribal hits by slot domain at runtime.

**GPU note:** the OCR corpus grinder currently saturates the Blackwell (99% / 75GB VRAM). PDF *text*
extraction is CPU; keep ingestion CPU/text-first and do NOT spin a large VRAM model that would evict
the resident OCR VLMs (the operator's #1 priority right now).

**CRITICAL finding (proof run 2026-06-19) — two distinct PDF lanes:**
- A **drawing** PDF (e.g. `resources/1- Basic Training Day 1/2D_Drawing.pdf`) is **image-based**:
  `pdf-parse-extract` returned `0 text chars / 0 headings`. Drawings carry NO extractable text ->
  they belong to the **OCR/VLM grinder lane** (`blueprint-ocr-training-loop`, now continuous), NOT
  the text lane. Do not route prints through pdf-learn expecting knowledge.
- A **textbook / manual / primer** PDF (GD&T references, blueprint-reading guides) IS text-based ->
  `pdf-parse-extract` / `/pdf-learn` extracts it fine -> tribal/wiki. **This is the lane the gather
  feeds.** So the gathered GD&T/blueprint *knowledge* sources must be text PDFs (or transcripts),
  not scanned image drawings.
- Routing rule for the watcher: if `heading_count == 0 && first_paragraph_chars == 0`, the PDF is a
  scan/drawing -> hand to the OCR lane, don't emit an empty tribal/wiki note.

---

## 3. Drop-zone + flow (this plan ships the zone; operator gathers)

1. **Drop-zone:** `resources/blueprint-gdt-corpus/` (created by this unit; already under a WATCH_DIR).
   Operator drops authoritative GD&T/blueprint PDFs + saved video transcripts here.
2. **Ingest:** `node scripts/pdf-corpus-watcher-sweep.mjs --extract` (cron, see §5) OR targeted
   `/pdf-learn <file>` per drop. Text → Ollama structure → wiki/tribal.
3. **Inject:** new tribal entries flow to the embed index → `tribal-by-domain-inject` surfaces them
   for the xray/delta/cad/quoting domains at prompt time.

## 4. Sources to gather (operator action — download-permission boundary)

> Per harness safety rules, **I do not auto-download external/copyrighted files**. The operator places
> these in `resources/blueprint-gdt-corpus/` (or greenlights a specific fetch). Recommended authoritative,
> largely-free/educational sources:

- **ASME Y14.5 GD&T** — overview/primer decks; university GD&T course PDFs (open courseware).
- **GD&T Basics** (gdandtbasics.com) free guides + their YouTube channel (video-learn transcripts).
- **NIST / DoD drawing-requirement** public docs; MIL-STD-100 drawing practices (public domain).
- **Blueprint-reading** community-college / trade-school open PDFs; Machinery's Handbook drawing
  chapters (if licensed copy on hand).
- **Video:** "GD&T", "blueprint reading for machinists", "datum reference frame", "true position"
  on YouTube → `/video-learn <url>` (transcript extraction, $0).
- **Internal (already on hand, ingest first):** `resources/1- Basic Training Day 1/2D_Drawing.pdf`,
  academy course-0c materials, MIT 2.008 design-and-manufacturing.

## 5. Continuous ingestion (mirrors operator "use crons / until complete")

- Enable `PRISM PDF Corpus Watcher` (`.claude/helpers/install-pdf-corpus-watcher-cron.ps1`) in
  `--extract` mode at a 30-min cadence once sources are staged (MAX_FIRE caps per-sweep so it drains
  the backlog gradually without a giant one-shot). Resumable via seen-state.
- Sister cadence to the OCR grinder's continuous backstop (`U-XRAY-CORPUS-CONTINUOUS`).

## 6. Done-criteria (loss function — bound the open loop)

- [ ] `resources/blueprint-gdt-corpus/` exists + README staged ✅ (this unit)
- [ ] ≥1 on-hand GD&T/blueprint source ingested end-to-end (proof) — count tribal/wiki rows produced
- [ ] watcher cron enabled in `--extract` (once operator stages sources)
- [ ] tribal GD&T match count rises from the 260 baseline (re-measure after ingest)
- [ ] new GD&T tribal entries verified to surface via `tribal-by-domain-inject` for xray/delta

## 7. Ownership / scope

- **Galaxy:** blueprint-vision (xray) produces; **consumers:** delta/cad (feature interp), kilo/cam,
  charlie/quote, india/training (LoRA corpus). General asset → serves all print-consuming galaxies.
- **Domain:** FLEET-WIDE (every galaxy that reads a print benefits) — clone tribal-domain tags to
  delta/cad + kilo/cam + india.
