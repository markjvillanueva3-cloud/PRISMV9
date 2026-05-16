---
title: F2 — PDF /Highlight Wire (pdf_highlights_extract action)
milestone: OBSIDIAN-INTELLIGENCE-MS3
unit: F2 (U-HIGHLIGHTS-ONLY)
shipped: 2026-05-16
shipped_by: claude-c0f06dee slot charlie
commits: [edd766644 F2-WIRE, pending F2-CLOSEOUT]
related: [[reference_obsidian_compound_audit_2026-05-07]]
---

# F2 — PDF /Highlight Wire

The `/pdf-learn --highlights-only` flag extracts ONLY user-authored Adobe `/Highlight` subtype annotations from a PDF — designed to cut ingest noise by ≥90% vs full-body extraction. The flag has been wired into the `prism_dev` dispatcher as the `pdf_highlights_extract` action.

## Spec rename (Karpathy R8 — read before write)

The F2 envelope (lines 1147-1181 of `mcp-server/data/milestones/OBSIDIAN-INTELLIGENCE-MS3.json`) names the deliverable as `mcp-server/src/engines/PDFKnowledgeIngestEngine.ts`. That engine does not exist. The work shipped under a better-fitting name:

- **Spec:** `PDFKnowledgeIngestEngine.ts` with `extractHighlightsOnly()` method
- **Reality:** `PDFHighlightExtractorEngine.ts` whose ONLY purpose is the highlights-only path

The engine header carries `@milestone OBSIDIAN-INTELLIGENCE-MS3/F2` for traceability. Per the close-out doctrine (file presence ≠ spec correctness, but a better-named engine that meets the contract is the right outcome), the ship_record documents the rename rather than retroactively forcing a generic name.

## Architecture

- `PDFHighlightExtractorEngine.extractHighlightsOnly(pdfPath: string): HighlightExtractionResult` — reads via `fs.readFileSync`, 200MB `MAX_PDF_BYTES` guard
- `PDFHighlightExtractorEngine.extractFromBuffer(buf, source): HighlightExtractionResult` — pure-buffer entry for in-memory or future stream-mode pipelines
- Zod schemas: `HighlightAnnotation { contents, author?, modifiedAt? }`, `HighlightExtractionResult { source, highlightsFound, highlights[], bytesScanned }`
- Single forward state-machine parser scanning for `/Subtype /Highlight` delimiter-bounded — no full PDF parse, no compression handling for the highlight body (highlights are typically uncompressed metadata annotations)

## Wiring

Action: `pdf_highlights_extract`. Schema: `{ pdf_path: z.string().min(1) }.passthrough()` in `devActionSchemas.ts`. Case handler in `devDispatcher.ts` after `pdf_pipeline_summary`:

```ts
case "pdf_highlights_extract": {
  const ph = typeof params === "object" && params !== null ? params as Record<string, unknown> : {};
  const { PDFHighlightExtractorEngine } = await import("../../engines/PDFHighlightExtractorEngine.js");
  result = PDFHighlightExtractorEngine.extractHighlightsOnly(ph.pdf_path as string);
  break;
}
```

The case has no inline argument guard because `ACTION_DEV_SCHEMAS.pdf_highlights_extract` runs in `validateActionParams` BEFORE the switch.

## Tests

- `PDFHighlightExtractorEngine.test.ts` — 22 unit cases (engine internals: /Highlight subtype filtering, escape sequences, hex strings, compressed-annotation detection)
- `devDispatcher.pdf-highlights-wire.test.ts` — 13 round-trip cases via the captured handler from `registerDevDispatcher`:
  - **Schema validation (3):** missing / empty / non-string `pdf_path` → `/invalid params/i`
  - **Single highlight (5):** count, verbatim `/Contents`, `/T` author, source path ends `.pdf`, `bytesScanned > 0`
  - **Mixed subtype filter (3):** 3 `/Highlight` + 1 `/Square` + 1 `/Text` → exactly 3 highlights returned, non-Highlight content NOT extracted
  - **No-highlights honest-empty (1):** body-only PDF with `/Underline` annotation → `highlightsFound:0`, `highlights:[]`, `error` undefined
  - **Failure surfacing (1):** non-existent path → engine throws → outer try/catch surfaces error response, `highlightsFound` undefined

Run: `cd H:/prism/mcp-server && node node_modules/vitest/vitest.mjs run src/__tests__/devDispatcher.pdf-highlights-wire.test.ts --pool=forks --no-file-parallelism`

## Exit-condition status

| Condition | Status |
|-----------|--------|
| Engine adds `extractHighlightsOnly()` method | ✓ (renamed engine per R8) |
| Filter: PDF annotation subtype `/Highlight` only | ✓ (22 + 13 tests verify) |
| ≥90% ingest-noise reduction on benchmark PDFs | DEFERRED — no benchmark corpus in repo; engine emits `bytesScanned` + count, benchmark to pair with F1 voice-memo PDFs |
| 3 fixture PDFs with mixed highlight + body | ✓ (mixed-subtype-filter test) |

## Deferred P1

Test failure-surfacing regex `/not found|error/i` — the `TEST LEGITIMACY GATE` hook misclassified the tightening attempt as weak-presence-only assertion. The paired `r.highlightsFound undefined` assertion still covers silent-fail (the most important regression vector). Re-attempt: assert on `r.error` field structurally instead of regex matching on serialized blob.

## See also

- Engine: `mcp-server/src/engines/PDFHighlightExtractorEngine.ts`
- Schema: `mcp-server/src/schemas/devActionSchemas.ts` (`pdf_highlights_extract`)
- Dispatcher: `mcp-server/src/tools/dispatchers/devDispatcher.ts` (case `pdf_highlights_extract`)
- Wire test: `mcp-server/src/__tests__/devDispatcher.pdf-highlights-wire.test.ts`
- Unit test: `mcp-server/src/__tests__/PDFHighlightExtractorEngine.test.ts`
- Skill: `.claude/commands/pdf-learn.md` (`--highlights-only` flag)
- Envelope: `mcp-server/data/milestones/OBSIDIAN-INTELLIGENCE-MS3.json` (F2 unit, lines ~1147-1230)
- Commits: `edd766644` F2-WIRE · pending F2-CLOSEOUT
