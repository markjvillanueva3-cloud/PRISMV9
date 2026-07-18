---
name: reference_xray_gdt_normalize_dormant_fcf_2026_06_22
description: GD&T symbol normalizer (.mjs+.ts dual-home) fixes silently-broken datum-deficiency on non-canonical VLM symbols across BOTH production OCR engines; lit up a declared-but-dormant fcf_valid/fcf_issues field. xray commits 865c312428, 377e99e57e, c1a0498791
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.274Z
aliases: reference_xray_gdt_normalize_dormant_fcf_2026_06_22
---


**GD&T symbol normalizer + FCF-validation wiring (slot:xray, 2026-06-22).** Backlog P2.8 symbol/vocabulary normalizers -- the GD&T piece. Commits: `865c312428` (.mjs), `377e99e57e` (.ts production clone), `c1a0498791` (2nd-engine FCF wire). Sibling of the thread / chamfer / surface-finish normalizers (all now dual-home `.mjs`+`.ts`).

**What** -- `normalizeGdtSymbol(raw)`: maps a VLM's GD&T geometric-characteristic symbol emission (canonical enum name, shop abbreviation "TP"/"POS"/"PERP", variant spelling "true position"/"roundness", or ASME unicode symbol) -> the canonical GDTSymbol name (one of 14), else null (R12 never fabricate). Built on `scripts/lib/ollama-vision-extract-lib.mjs` (script path) + a documented `.ts` clone `mcp-server/src/utils/gdtSymbolNormalize.ts` (production MCP path; pure-ASCII via String.fromCharCode for the unicode symbols; pinned-identical tests so the clones can't diverge -- a scrutiny arm programmatically diffed both maps: 52/52 alias keys, 13 unicode codepoints, 14 canonical, ZERO divergence).

**The bug class (transferable):**
1. **A VLM emits a controlled-vocabulary symbol as free text -- a verbatim consumer that checks the canonical enum silently fails.** `extractGdt`/`convertGDT` took `g.symbol` VERBATIM and checked it against `DATUM_REQUIRED_SYMBOLS` / `SYMBOL_TO_PARSER` (the canonical underscored names). A VLM "TP" / "true position" / unicode emission never matched -> a datum-less position/orientation/runout FCF was SILENTLY NOT flagged datum-deficient (a real structural FCF error the operator-confirm gate should catch). Normalize the controlled-vocabulary symbol to canonical BEFORE any enum lookup. → the analog of the thread/chamfer/surface-finish "garbled VLM text -> canonical spec" normalizers.
2. **A declared-but-dormant field is a wire smell -- grep for the populator.** `BlueprintOCREngine.ExtractedGDT` declared `fcf_valid?`/`fcf_issues?` WITH a docstring citing `gdtFcfValidate`, but `extractGDT` NEVER called `validateExtractedGdt` -> the fields were always undefined (datum-deficiency never flagged on that path). An optional field declared with a docstring naming its source, but no code populating it, means a dormant wire -- grep the populator before trusting the field.
3. **R15 build-it-everywhere = check EVERY consumer.** The SAME datum-deficiency gap existed in TWO dispatcher-wired production OCR engines via DIFFERENT mechanisms: `BlueprintVisionOCREngine.convertGDT` (verbatim VLM symbol -> needed the normalizer) and `BlueprintOCREngine.extractGDT` (regex already yields a canonical symbol, but never CALLED the validator -> dormant wire). One bug class, two engines, two fixes. A scrutiny arm surfaced the 2nd engine (do not assume one fix covers the class).

**Wired:** `BlueprintVisionOCREngine.convertGDT`: `symbol = normalizeGdtSymbol(g.symbol) || g.symbol || "position"` (raw preserved in raw_text via `g.raw_text || g.symbol || ""`). `BlueprintOCREngine.extractGDT`: now runs `validateExtractedGdt(frame)` + attaches the verdict. Byte-identical for already-canonical inputs; additive (no contract change for the 13 importers of each engine). tsc clean; .mjs 95 tests + .ts 9 + BlueprintOCREngine 31, all green. Both per-file scrutiny arms PASS on each unit.

Sibling memories (same session): [[reference_xray_tiling_clique_not_unionfind_2026_06_22]] · [[reference_xray_tiling_extract_e2e_bugs_2026_06_22]] · [[reference_xray_thread_normalize_2026_06_22]]. Backlog: [[blueprint-reading-improvement-backlog-2026-06-19]].
