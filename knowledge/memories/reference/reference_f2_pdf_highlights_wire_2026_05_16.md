---
name: reference-f2-pdf-highlights-wire-2026-05-16
description: F2 close-out U-HIGHLIGHTS-ONLY — PDFHighlightExtractorEngine wired into prism_dev as pdf_highlights_extract action; spec rename (PDFKnowledgeIngestEngine → PDFHighlightExtractorEngine) per Karpathy R8 read-before-write
aliases: reference_f2_pdf_highlights_wire_2026_05_16
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.572Z
---


# F2 — PDF /Highlight Wire (close-out 2026-05-16)

**Milestone:** OBSIDIAN-INTELLIGENCE-MS3
**Unit:** F2 (U-HIGHLIGHTS-ONLY)
**Shipped by:** claude-c0f06dee slot charlie
**Commits:** `edd766644` F2-WIRE · pending F2-CLOSEOUT

## What shipped

The `/pdf-learn --highlights-only` flag extracts ONLY Adobe `/Highlight` subtype annotations from a PDF. Wired into `prism_dev` as the `pdf_highlights_extract` action.

## The Karpathy R8 spec rename

The F2 envelope named the deliverable `PDFKnowledgeIngestEngine.ts` (does not exist). The work shipped under the better-fitting name `PDFHighlightExtractorEngine.ts` whose only purpose is the highlights-only path. The engine header carries `@milestone OBSIDIAN-INTELLIGENCE-MS3/F2` for traceability. Documented in the envelope `ship_record.closeout_pattern` field — flipping status without acknowledging the rename would have been a partial close-out.

## Artifacts

- `mcp-server/src/engines/PDFHighlightExtractorEngine.ts` — engine (pre-shipped previously)
- `mcp-server/src/__tests__/PDFHighlightExtractorEngine.test.ts` — 22 unit cases (pre-shipped)
- `mcp-server/src/schemas/devActionSchemas.ts` — `pdf_highlights_extract` action schema (edd766644)
- `mcp-server/src/tools/dispatchers/devDispatcher.ts` — ACTIONS enum + case handler (edd766644)
- `mcp-server/src/__tests__/devDispatcher.pdf-highlights-wire.test.ts` — 13/13 round-trip via captured handler (edd766644)
- `.claude/commands/pdf-learn.md` — `--highlights-only` flag (pre-shipped)
- `knowledge/wiki/architecture/f2-pdf-highlights-wire.md` — full architecture write-up

## Exit conditions

- ✓ engine adds `extractHighlightsOnly()` method (renamed engine per R8)
- ✓ Filter: PDF annotation subtype `/Highlight` only (22 + 13 tests verify)
- ✓ 3 fixture PDFs with mixed highlight + body (mixed-subtype-filter test)
- DEFERRED: ≥90% ingest-noise reduction on benchmark PDFs (no benchmark corpus in repo; engine emits `bytesScanned` + count, benchmark to pair with F1 voice-memo PDFs when those land)

## Scrutiny

Per-file 2-arm × 2 files: PASS/PASS (wiring + test). End-of-task 3-of-3 against F2-CLOSEOUT commit: pending.

## Deferred P1

Test failure-surfacing regex `/not found|error/i` tightening attempt was blocked by `TEST LEGITIMACY GATE` hook (misclassified as weak-presence-only assertion). The paired `r.highlightsFound undefined` assertion still covers the silent-fail vector. Re-attempt: assert on `r.error` field structurally instead of regex on serialized blob.

## Lessons

1. **Karpathy R8 (read before write):** when the spec names a file that doesn't exist but a better-named engine satisfies the same contract, flip the envelope + document the rename in `ship_record.closeout_pattern`. Do NOT retroactively rename the shipped engine to match a worse spec.
2. **The TEST LEGITIMACY GATE hook is pattern-based, not semantic:** `expect(blob).toMatch(/not found|error/i)` passes; tightening to `/not found/i` doesn't. To express "the response contains an error, not a silent success" without tripping the gate, assert on `r.error` field structurally.
3. **`stop_on_unwired_assets` would have caught this:** the engine + unit tests + skill flag were pre-shipped without dispatcher wiring. F2-WIRE was the missing seam — engines with no dispatcher reference are NEEDS_WIRING orphans (BUILD_STATE counts them).

## Charlie lane status post-close-out

OBSIDIAN-INTELLIGENCE-MS3 now 11/24 (10→11). Charlie's remaining options in MS3:
- **B1-B4** (Daily-Context / Connection-Finder / Queue-Processor / Weekly-Synthesis) — built on non-HEAD branches by peers, files absent on `cad-fusion-live-ms0`, NOT integrated; closing out would be false-close-out
- **B5** peer-active (claude-a2b1b5ca in `prism-hotel-c2` fork)
- **B6** blocked on E2; **D5** blocked on E3
- **E1-E4** hotel's lane (E1 already built by hotel per memory but not on HEAD)
- **C2** hotel-forked
- **F1** has Whisper operator-dependency

Charlie lane is fully blocked post-F2-CLOSEOUT — recommend `/compact` then re-scan or pivot to a different milestone.

## See also

- Wiki: [[f2-pdf-highlights-wire]]
- Memory companion: [[reference_obsidian_compound_audit_2026-05-07]]
- Sister: [[reference_scrutiny_verdict_persist_2026_05_16]]
