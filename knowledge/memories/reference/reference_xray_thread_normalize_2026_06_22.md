---
name: reference_xray_thread_normalize_2026_06_22
description: Thread-callout normalizer added to the OCR extraction path (backlog P2.8) -- de-garbles + resolves a canonical thread spec; xray commit 4c0828c118
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.278Z
aliases: reference_xray_thread_normalize_2026_06_22
---


**U-XRAY-THREAD-NORMALIZE (slot:xray, 2026-06-22, commit `4c0828c118`).** Backlog [[blueprint-reading-improvement-backlog-2026-06-19]] item P2.8 (symbol/vocabulary normalizers). Surface-finish was already done (`02b56c847f`); **thread** was the gap.

**What** — pure `normalizeThreadCallout(raw)` in `scripts/lib/ollama-vision-extract-lib.mjs` (sibling of `normalizeSurfaceFinish`), wired ADDITIVELY into `extractDimension` as a gated `thread:` field (a plain linear dim stays null; the gate `maybeThread` fires only on a thread-ish type or a thread signature in raw_text). Returns canonical `{system, series, major_dia_in, tpi, pitch_mm, class, resolved, assumed}`. Handles:
- **Unified inch**: fraction (`1/4-20`), decimal (`.250-20`), screw (`#10-32` -> .190 via ASME B1.1 table), and `#`-less screw (`10-24 UNC` = #10, disambiguated from an inch major by **tpi>=16 = screw, tpi<16 = inch** so `1-8 UNC` stays 1in).
- **Metric**: `M6x1.0` (explicit pitch) / bare `M6` (ISO-261 coarse-pitch fill, flagged `assumed`).
- **NPT**: `major_dia_in: null` (nominal pipe size is NOT the thread major -- honest).

**Two scrutiny-caught defects fixed before commit (reusable lessons):**
1. **P1 (arm B): a tool-steel grade fabricated a thread.** `M2 STEEL` / `M2 TOOL STEEL` / `M42 HSS` matched the metric `M<n>` pattern and resolved as a metric thread M2x0.4 -- but M2/A2/D2/M42 are AISI tool steels, and **JM Die is a die shop swimming in them**. Violated the function's own "never fabricate (R12)" contract. Fix: a material/grade keyword guard (`STEEL|HSS|CARBIDE|AISI|HARDNESS|HARDEN|RC|HRC|TOOL|MATERIAL|MATL`) rejects the string entirely. **Lesson: a short alpha-prefix pattern (`M<n>`) collides with material grade designations -- guard a "thread" parser against material vocabulary, especially in a tool-and-die shop.**
2. **P2: `#`-less screw vs inch major + implausible inch major.** `10-24 UNC` is a #10 screw (.190), not a 10-INCH thread; fixed by the tpi>=16 disambiguation. `14-20` is a range/part-number, not a 14in thread; fixed by a `<=4in` inch-major sanity cap.

**Why additive/safe:** no existing `extractDimension` field changed; no production consumer reads `dim.thread` yet (the enrichment is delivered IN the OCR product, consumed by future quote/cam tapping). 88/88 tests (ASME B1.1 screw majors, ISO 261 coarse pitch -- real reference values).

**TS clone shipped (R15 build-it-everywhere, commit `20661dda93`):** the `.mjs` normalizer served only the script OCR path; the PRODUCTION MCP path (`cad_live_blueprint_ocr` via `BlueprintVisionOCREngine`) is what the app uses. Added `mcp-server/src/utils/threadCalloutNormalize.ts` (a documented cross-boundary CLONE with ALL the proven fixes; pure-ASCII source via `String.fromCharCode` like `surfaceFinishNormalize.ts`) + `resolveThread` gate, wired additively into `BlueprintVisionOCREngine.convertDimensions` as a `thread:` field (next to `surface_finish_ra`) + an optional `thread?` on the `ExtractedDimension` interface (13 importers unaffected). 8/8 vitest (reference values pinned IDENTICAL to the `.mjs` 88-test side so the clones can't silently diverge), tsc --noEmit clean (12GB heap — the default heap OOMs on this repo, per the build-for-Blackwell doctrine). This mirrors the surface-finish dual-home pattern (`02b56c847f`) and gives the thread normalizer its production consumer.

Pairs with the surface-finish normalizer `normalizeSurfaceFinish` (same file, same pattern). Sibling unit: [[reference_xray_mill_program_gt_2026_06_22]] (mill-GT, same session).
