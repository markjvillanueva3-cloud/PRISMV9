/**
 * intakeProcessorSingleton — module-scope wiring of IntakeArtifactProcessorEngine
 * + autonomous pipeline that chains EmailPrintIntakeEngine → IntakeArtifactProcessor → routing.
 *
 * Production PDF text extractor is a NotWiredPdfTextExtractor (fail-LOUD per R12)
 * until operator wires a real library (pdf-parse / pdfjs-dist) via setPdfExtractor().
 * Sinks default to in-memory; production wires to ToolCribEngine / ShopInventory /
 * CadPartLibrary via setSinks().
 */

import {
  IntakeArtifactProcessorEngine,
  InMemoryToolingSink,
  InMemoryInventorySink,
  InMemoryPartSink,
  InMemoryReviewQueue,
  type PdfTextExtractor,
  type ToolingSink,
  type InventorySink,
  type PartSink,
  type ReviewQueueSink,
} from "./IntakeArtifactProcessorEngine.js";

class NotWiredPdfTextExtractor implements PdfTextExtractor {
  async extract(_bytes: Uint8Array): Promise<string> {
    const err = new Error(
      "pdf_text_extractor_not_wired — production PDF library (pdf-parse / pdfjs-dist) " +
        "not configured. Wire via intakeProcessorSingleton.setPdfExtractor() at server boot."
    );
    (err as Error & { code?: string }).code = "EXTRACTOR_NOT_WIRED";
    throw err;
  }
}

let _processor: IntakeArtifactProcessorEngine | null = null;
let _pdfExtractor: PdfTextExtractor = new NotWiredPdfTextExtractor();
let _toolingSink: ToolingSink = new InMemoryToolingSink();
let _inventorySink: InventorySink = new InMemoryInventorySink();
let _partSink: PartSink = new InMemoryPartSink();
let _reviewQueue: ReviewQueueSink = new InMemoryReviewQueue();

export function setPdfExtractor(x: PdfTextExtractor): void {
  _pdfExtractor = x;
  _processor = null;
}
export function setSinks(opts: {
  tooling?: ToolingSink;
  inventory?: InventorySink;
  part?: PartSink;
  review?: ReviewQueueSink;
}): void {
  if (opts.tooling) _toolingSink = opts.tooling;
  if (opts.inventory) _inventorySink = opts.inventory;
  if (opts.part) _partSink = opts.part;
  if (opts.review) _reviewQueue = opts.review;
  _processor = null;
}
export function getIntakeProcessor(): IntakeArtifactProcessorEngine {
  if (_processor) return _processor;
  _processor = new IntakeArtifactProcessorEngine(
    _pdfExtractor,
    _toolingSink,
    _inventorySink,
    _partSink,
    _reviewQueue
  );
  return _processor;
}
export function getSinksForDiagnostics(): {
  tooling: ToolingSink;
  inventory: InventorySink;
  part: PartSink;
  review: ReviewQueueSink;
} {
  return { tooling: _toolingSink, inventory: _inventorySink, part: _partSink, review: _reviewQueue };
}
export function _resetForTests(): void {
  _processor = null;
  _pdfExtractor = new NotWiredPdfTextExtractor();
  _toolingSink = new InMemoryToolingSink();
  _inventorySink = new InMemoryInventorySink();
  _partSink = new InMemoryPartSink();
  _reviewQueue = new InMemoryReviewQueue();
}
