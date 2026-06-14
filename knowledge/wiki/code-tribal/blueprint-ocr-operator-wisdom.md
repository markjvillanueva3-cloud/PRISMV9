---
title: Blueprint OCR / Print-Reading — Operator Wisdom
type: code-tribal
domain: blueprint
status: tribal
last_verified: 2026-05-23
generated_by: papa /loop iter7, U-PSN-TRIBAL-DOCU-OCR
tags: [tribal, blueprint, ocr, print-reading, docustrata, operator-wisdom]
related:
  - knowledge/wiki/architecture/engines/cad/blueprintextractionragengine.md
  - knowledge/wiki/architecture/engines/cad/blueprintcorpusharvestengine.md
  - knowledge/wiki/architecture/engines/ai/blueprintlorabridgeengine.md
  - knowledge/wiki/architecture/engines/cad/jmdiearchivebackannotationengine.md
  - knowledge/wiki/architecture/engines/print/pdfblueprintpatternrescueengine.md
---

# Blueprint OCR — operator wisdom (PSN leg #5: tribal)

Encodes the shop-floor priors that make blueprint extraction USEFUL vs. hallucination. Sourced from `[[reference_psn_docu_ocr_wiring_2026_05_23]]` MS1 close + MS-DOCU-INGEST operational experience. These are the rules a human operator applies before trusting an extraction.

## Tip 1 — Multi-page PDF is the norm, not the exception (PDFBlueprintPatternRescueEngine + Docustrata)

96% of Docustrata PDFs are multi-page; a single PDF can hold 5-10 distinct prints buried on pages 2+. Phase-3c's page-1-only scan missed 24,186 docs / 120K pages.

**Operator rule:** never trust a page-1-only extraction for a print whose source PDF has >1 page. Use the tiered classifier (image-heuristic → Tesseract title-block → vision LLM) over ALL pages. The shipped `phase8-tiered-blueprint-classifier.py` is the right tool — call it first, then route the drawing-likely pages to the RAG extractor.

**Code path:** `BlueprintCorpusHarvestEngine` enumerates; `BlueprintExtractionRAGEngine` extracts per-page after classifier filtering. `PDFBlueprintPatternRescueEngine` rescues 4 pattern groups (fractional dims, limit-pair dims, ISO 1302 N-grade Ra, standalone µin) that sister extractors miss on page-1-only.

## Tip 2 — Historical S/F + dim values are DATA, not GROUND TRUTH (GroundTruthRegistryEngine stratification)

Amateur programs encode mistakes alongside successes. A macro variable value that "worked once" in 2018 may be 30% off the optimal for the same part today.

**Operator rule:** stratify ground truth by confidence tier — `confirmed` (ERP-shipped + measured + accepted) > `produced` (made, not yet inspected) > `quoted` (estimate only) > `inferred` (macro var default). Conformal calibration uses the stratification. Replay buffer down-weights lower tiers.

**Code path:** `GroundTruthRegistryEngine.registerBlueprintExtraction()` requires `confidenceTier` per record. `joinDocustrataToPartLibrary()` auto-tiers using ERP join state.

## Tip 3 — RAG without sources is hallucination (BlueprintExtractionRAGEngine HARD RULE)

A vision-only blueprint extraction with no retrieved corpus / tribal / similar-print context cannot be distinguished from hallucination. The MS1 spec's U7 hard-rule rejects sourceless extractions with `confidenceFloor === 'normal'`.

**Operator rule:** if `extraction.sources.length === 0`, the extraction MUST carry `confidenceFloor !== 'normal'` (one of `low_no_prior | low_contradiction | low_no_vision`). Operator reviews these before any downstream consumer (quote, post-processor, master-post) accepts the value.

**Code path:** `BlueprintExtractionRAGEngine.extract()` Zod refine: `sources.length > 0 OR confidenceFloor !== 'normal'`. The dispatch action `blueprint_rag_extract` (`prism_cad`, `prism_quality`, `prism_ai` via iter6 wiring) preserves this contract.

## Tip 4 — Customer convention varies; pre-classify before parsing (BlueprintExtractionRAGEngine.matchFamily)

ALCOA aerospace prints use European decimal-comma in some callouts. ITW prints stack tolerances differently than Continental Midland. JM-Die-internal prints use shop-house GD&T abbreviations that don't appear in published standards.

**Operator rule:** call `getJMDieCustomerPath(customer)` first to load the customer prior, then `matchFamily()` to load the part-family template's expected feature schema. Customer + family priors flow into the RAG prompt as context, NOT post-hoc filters.

**Code path:** `BlueprintExtractionRAGEngine.extract()` step 1 = pre-classify + customer prior; step 5 = compose prompt WITH that context. Skipping step 1 = generic prompt = 15-25% worse extraction quality on customer-specific notation per the MS1 cross-validation harness.

## Tip 5 — Anonymize before any external fine-tune (BlueprintLoRABridgeEngine HARD RULE)

The LoRA export bundle goes to an external provider (Gemini, OpenAI, Modal). Customer names + part numbers + program content are proprietary IP — they must NEVER leave the local filesystem unscrubbed.

**Operator rule:** the export engine's anonymization is always-on. Operator confirms scrub via `_LORA_EXPORT_OPERATOR_APPROVED` marker file before any bundle writes outside `mcp-server/data/training/lora/staging/`. Test assertion: `expect(bundleContents).not.toMatch(/ALCOA|ITW|CONTINENTAL|OPTIMAS|SFS|HOLO-KROME/)`.

**Code path:** `BlueprintLoRABridgeEngine.prepareTrainingSet()` always anonymizes (not opt-in). `exportBundle()` refuses writes outside staging without the operator marker. Both `prism_cad` (original) and `prism_ai` (via iter6 wiring) preserve the contract.

## Related code-tribal

- [[blueprint-dim-diameter]] · [[blueprint-dim-gdt-positional]] · [[blueprint-dim-gdt-profile]] · [[blueprint-dim-gdt-runout]] — per-dim-type tribal wisdom
- [[print-reading-long-tail-small-families]] — long-tail customer convention notes
