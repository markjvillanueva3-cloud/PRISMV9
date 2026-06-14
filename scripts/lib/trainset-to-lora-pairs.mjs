// scripts/lib/trainset-to-lora-pairs.mjs
//
// U-XRAY-BLUEPRINT-LORA-STAGE — pure adapter: closed-loop OCR trainset rows → the
// BlueprintLoRABridgeEngine's LoRATrainingPair[] contract (the xray→india LoRA seam).
//
// This is the ONLY genuinely-new code in the staging unit: the bridge CONSUMES LoRATrainingPair[]
// (anonymize → per-provider serialize → staging-gated export) but does NOT produce them from an
// ensemble-distilled trainset. This maps the shape; the bridge owns everything downstream (R8 — do
// NOT reimplement the bridge's anonymize/serialize/export).
//
// LoRATrainingPair (verified against BlueprintLoRABridgeEngine.ts:34-43):
//   { pairId, customer, partNumber, pdfPath, extractionType, groundTruthValue: string, context }
//
// THREE load-bearing mapping rules (verified against the bridge):
//   1. ONLY trainable (gold/silver) labels become pairs. bronze/reject/no_corroboration/uncalibrated
//      were already gated out by the training loop; this is the second guard (defense in depth).
//   2. groundTruthValue MUST be a string — the bridge field is typed string; a raw number mis-serializes.
//   3. The bridge's emitted prompt is only "Print: <pdfPath> Context: <context>" — extractionType does
//      NOT reach the prompt. So `type=` (and every other dropped signal) MUST be folded into `context`,
//      or the model cannot disambiguate which of a part's N dims it is predicting.
//
// HONEST CAVEAT this adapter does NOT hide (surfaced by the runner): pdfPath is an image PATH STRING,
// not pixels. The bridge is a text/path bridge; a true VISION LoRA needs the rasterized image fed to a
// VLM. This bundle proves the xray→india wiring + carries the labels/provenance; it is NOT vision-ready
// training data on its own (india must add the VLM image path → pixels load).
//
// PURE: no fs, no engine import. Unit-tested with reference values.

/**
 * Map one trainset row → LoRATrainingPair[] (one per TRAINABLE label).
 * @param {{part?:string, image?:string, source?:string, labels?:Array}} row
 * @param {number} [rowIdx]  disambiguates pairId when the same part appears in multiple rows
 * @returns {Array<{pairId,customer,partNumber,pdfPath,extractionType,groundTruthValue,context}>}
 */
export function trainsetRowToPairs(row, rowIdx = 0) {
  if (!row || typeof row !== "object" || !Array.isArray(row.labels)) return [];
  const part = row.part != null && String(row.part) ? String(row.part) : "unknown-part";
  const image = row.image != null ? String(row.image) : "";
  const src = row.source != null ? String(row.source) : "ensemble-distillation";
  const pairs = [];
  let i = 0;
  for (const l of row.labels) {
    if (!l || typeof l !== "object" || l.trainable !== true) continue; // ONLY trainable labels
    const v = Number(l.value_mm);
    if (!Number.isFinite(v)) continue;                                  // no usable value → skip
    const type = l.type != null && String(l.type) ? String(l.type) : "dimension";
    pairs.push({
      pairId: `${part}#${rowIdx}:${type}:${i}`,
      customer: "na",                 // bridge overwrites → ANON-CUSTOMER (no real customer in trainset)
      partNumber: part,               // bridge overwrites → ANON-PN
      pdfPath: image,                 // PATH not pixels — see header caveat
      extractionType: type,
      groundTruthValue: String(v),    // MUST be string (rule 2); String(Number(..)) normalizes ".50"→"0.5"
      context: `type=${type} value_mm=${v} n_models=${l.n_models ?? "?"} `
        + `agreement_fraction=${l.agreement_fraction ?? "?"} corroboration=${l.corroboration ?? "?"} `
        + `expected_accuracy=${l.expected_accuracy ?? "?"} tier=${l.tier ?? "?"} src=${src}`,
    });
    i++;
  }
  return pairs;
}

/**
 * Map all trainset rows → a flat LoRATrainingPair[] (trainable labels only), with unique pairIds.
 * @param {Array} rows  parsed trainset.jsonl rows
 * @returns {Array}
 */
export function trainsetToLoRAPairs(rows) {
  const out = [];
  (Array.isArray(rows) ? rows : []).forEach((r, idx) => {
    for (const p of trainsetRowToPairs(r, idx)) out.push(p);
  });
  return out;
}
