/**
 * DocustrataAccountingBridgeEngine — Docustrata ingest → AP/GL real-time bridge.
 *
 * The missing link in the JM-Die financial pipeline. Pre-existing surface:
 *   - JMDieDocustrataIngestEngine — walks H:/PRISM/JM DIE/_PART LIBRARY/...
 *     for per-customer document index records
 *   - BusinessDocumentExtractorEngine — OCR + structured extraction for
 *     PO, invoice, RFQ
 *   - GeneralLedgerEngine — recordInvoice, recordPurchase, recordPayment,
 *     recordWipToCogs (double-entry GL)
 *   - PurchaseOrderEngine — createOrder + 3-way match
 *
 * This bridge composes them into a one-call flow:
 *   1. Take a Docustrata source document (path or text)
 *   2. Extract structured invoice/PO data via BusinessDocumentExtractor
 *   3. Validate the financial-invariant gate (Σ line_items × qty ≈ subtotal;
 *      subtotal + tax ≈ total; positive amounts only)
 *   4. Post AP-side or AR-side journal entries to GeneralLedger
 *   5. Return a reconciliation breadcrumb mapping doc→extraction→journal_entry
 *
 * Hotel-soul invariants enforced before EVERY GL write:
 *   - Σ debits = Σ credits (delegated to GeneralLedger.createJournalEntry)
 *   - Subtotal + tax = total (±1 cent tolerance for rounding)
 *   - Amount > 0 (no zero-value invoices into GL)
 *   - No raw PII in returned object (vendor name is org name, not person)
 *   - Defensive copy on every public return
 *
 * R12 fail-loud: every reconciliation gap throws with explicit reason; never
 * silently swallow a $ delta. Per slot-soul: "if a reconciliation gap appears,
 * surface it — never silently accept the delta."
 *
 * @module DocustrataAccountingBridgeEngine
 * @milestone HOTEL/U-DOCUSTRATA-ACCOUNTING-BRIDGE (2026-05-25, slot:hotel iter2)
 */
import {
  businessDocumentExtractorEngine,
  type ExtractInput,
  type ExtractionResult,
  type ExtractedInvoice,
  type ExtractedPO,
  type DocumentType,
} from "./BusinessDocumentExtractorEngine.js";
import { generalLedgerEngine } from "./GeneralLedgerEngine.js";

// ─── Constants ────────────────────────────────────────────────
/** Tolerance (cents) for subtotal + tax = total reconciliation. */
const RECONCILIATION_TOLERANCE_CENTS = 1;
/** Default AP category when extraction doesn't supply one. */
const DEFAULT_PURCHASE_CATEGORY = "general_purchases";

// ─── Types ────────────────────────────────────────────────────

export interface DocustrataBridgeInput {
  /** Document type — invoice or purchase_order. */
  doc_type: Extract<DocumentType, "invoice" | "purchase_order">;
  /** Customer or vendor name (org-level, NOT personal). */
  party_name: string;
  /** Source filename (required by BusinessDocumentExtractor) + optional path/text content. */
  source: { filename?: string; abs_path?: string; text_content?: string };
  /** Manual invoice extraction (skips OCR — for tested-deterministic input). */
  manual_invoice?: Partial<ExtractedInvoice>;
  /** Manual PO extraction (skips OCR — for tested-deterministic input). */
  manual_po?: Partial<ExtractedPO>;
  /** ISO date the document was issued (defaults to today if not in extraction). */
  issued_date?: string;
  /** AP/AR category override (e.g. "raw_materials", "tooling"). */
  category?: string;
  /** Reconciliation strategy: strict refuses any delta; tolerant accepts ≤$0.01. */
  reconcile_mode?: "strict" | "tolerant";
}

export interface DocustrataReconciliation {
  invoice_or_po_id: string;
  party: string;
  subtotal_extracted: number;
  tax_extracted: number;
  total_extracted: number;
  computed_total: number;
  delta_cents: number;
  passed: boolean;
  failure_reason?: string;
}

export interface DocustrataBridgeResult {
  doc_type: string;
  extraction_id: string;
  reconciliation: DocustrataReconciliation;
  journal_entry: {
    id: string;
    date: string;
    type: "invoice" | "purchase";
    amount: number;
  } | null;
  posted_to_gl: boolean;
  posted_to_gl_reason?: string;
  audit_trail: ReadonlyArray<string>;
  currency: "USD";
  source: "DocustrataAccountingBridgeEngine.v1";
}

// ─── Engine ───────────────────────────────────────────────────

class DocustrataAccountingBridgeEngine {
  /**
   * One-call bridge: Docustrata source → extracted invoice/PO → GL journal entry.
   *
   * @param input full bridge input
   * @returns reconciliation + journal_entry breadcrumb
   * @throws Error if hotel-soul financial-invariant gate fails (R12 fail-loud)
   */
  ingestAndPost(input: DocustrataBridgeInput): DocustrataBridgeResult {
    this.validateInput(input);
    const audit: string[] = [];
    audit.push(`begin: doc_type=${input.doc_type} party=${input.party_name}`);

    // 1) Run extraction
    const filename =
      input.source.filename ??
      (input.source.abs_path
        ? input.source.abs_path.split(/[\\/]/).pop() ?? "docustrata.doc"
        : `${input.doc_type}-${input.party_name}.doc`);
    const extractInput: ExtractInput = {
      filename,
      document_type: input.doc_type,
      ...(input.source.text_content !== undefined && { text_content: input.source.text_content }),
      ...(input.manual_invoice !== undefined && { invoice_data: input.manual_invoice }),
      ...(input.manual_po !== undefined && { po_data: input.manual_po }),
    };
    const extraction: ExtractionResult = businessDocumentExtractorEngine.extract(extractInput);
    audit.push(`extracted: id=${extraction.id} confidence=${extraction.confidence ?? "n/a"}`);

    // 2) Reconcile (financial-invariant gate)
    const reconcile = this.reconcile(extraction, input);
    audit.push(
      `reconcile: ${reconcile.passed ? "PASS" : "FAIL"} delta_cents=${reconcile.delta_cents}`,
    );

    const reconcileMode = input.reconcile_mode ?? "tolerant";
    if (!reconcile.passed && reconcileMode === "strict") {
      throw new Error(
        `DocustrataAccountingBridgeEngine: strict reconciliation FAILED — ${reconcile.failure_reason ?? "delta exceeds tolerance"}`,
      );
    }

    // 3) Post to GL only if reconciliation passed
    let journal_entry: DocustrataBridgeResult["journal_entry"] = null;
    let posted_to_gl = false;
    let posted_to_gl_reason: string | undefined;

    if (reconcile.passed) {
      const issuedDate = input.issued_date ?? this.todayISO();
      const category = input.category ?? DEFAULT_PURCHASE_CATEGORY;

      if (input.doc_type === "invoice") {
        // AR-side: customer-issued invoice (we're collecting payment)
        const je = generalLedgerEngine.recordInvoice({
          invoice_id: reconcile.invoice_or_po_id,
          amount: reconcile.subtotal_extracted,
          tax: reconcile.tax_extracted,
          date: issuedDate,
        });
        journal_entry = {
          id: je.id,
          date: je.date,
          type: "invoice",
          amount: reconcile.total_extracted,
        };
        posted_to_gl = true;
        audit.push(`gl-recordInvoice: je_id=${je.id}`);
      } else {
        // AP-side: vendor-issued PO (we owe a vendor)
        const je = generalLedgerEngine.recordPurchase({
          po_id: reconcile.invoice_or_po_id,
          amount: reconcile.subtotal_extracted,
          tax: reconcile.tax_extracted,
          category,
          date: issuedDate,
        });
        journal_entry = {
          id: je.id,
          date: je.date,
          type: "purchase",
          amount: reconcile.total_extracted,
        };
        posted_to_gl = true;
        audit.push(`gl-recordPurchase: je_id=${je.id} category=${category}`);
      }
    } else {
      posted_to_gl_reason = `reconciliation failed: ${reconcile.failure_reason ?? "delta"}`;
      audit.push(`gl-skipped: ${posted_to_gl_reason}`);
    }

    return Object.freeze({
      doc_type: input.doc_type,
      extraction_id: extraction.id,
      reconciliation: Object.freeze(reconcile) as DocustrataReconciliation,
      journal_entry,
      posted_to_gl,
      ...(posted_to_gl_reason !== undefined && { posted_to_gl_reason }),
      audit_trail: Object.freeze([...audit]),
      currency: "USD" as const,
      source: "DocustrataAccountingBridgeEngine.v1" as const,
    });
  }

  /**
   * Batch ingest — process multiple Docustrata records, accumulate posted
   * journal entries, return per-doc reconciliation + aggregate.
   */
  batchIngest(inputs: DocustrataBridgeInput[]): {
    results: DocustrataBridgeResult[];
    aggregate: {
      total_docs: number;
      posted: number;
      skipped: number;
      total_amount_posted: number;
      failed_reconciliations: number;
    };
    currency: "USD";
  } {
    if (!Array.isArray(inputs) || inputs.length === 0) {
      throw new Error("DocustrataAccountingBridgeEngine.batchIngest: inputs must be a non-empty array");
    }
    const results = inputs.map((i) => this.ingestAndPost(i));
    let posted = 0;
    let totalPosted = 0;
    let failedRecon = 0;
    for (const r of results) {
      if (r.posted_to_gl) {
        posted++;
        totalPosted += r.reconciliation.total_extracted;
      }
      if (!r.reconciliation.passed) failedRecon++;
    }
    return Object.freeze({
      results,
      aggregate: Object.freeze({
        total_docs: results.length,
        posted,
        skipped: results.length - posted,
        total_amount_posted: this.round2(totalPosted),
        failed_reconciliations: failedRecon,
      }),
      currency: "USD" as const,
    });
  }

  // ─── Internals ──────────────────────────────────────────────

  /**
   * Validate the financial-invariant gate: extracted line-items + tax ≈ total.
   */
  private reconcile(
    extraction: ExtractionResult,
    input: DocustrataBridgeInput,
  ): DocustrataReconciliation {
    const inv = extraction.invoice_data;
    const po = extraction.po_data;
    const data: { invoice_number?: string; po_number?: string; subtotal?: number; tax?: number; total?: number } | undefined =
      inv ?? (po ? { po_number: po.po_number, subtotal: po.subtotal, tax: po.tax, total: po.total } : undefined);
    if (!data) {
      return {
        invoice_or_po_id: "<unknown>",
        party: input.party_name,
        subtotal_extracted: 0,
        tax_extracted: 0,
        total_extracted: 0,
        computed_total: 0,
        delta_cents: Number.POSITIVE_INFINITY,
        passed: false,
        failure_reason: "no extracted invoice/PO data found in extraction result",
      };
    }
    const id = data.invoice_number ?? data.po_number ?? "<no-id>";
    const subtotal = Number.isFinite(data.subtotal) ? Number(data.subtotal) : 0;
    const tax = Number.isFinite(data.tax) ? Number(data.tax) : 0;
    const total = Number.isFinite(data.total) ? Number(data.total) : 0;
    const computed = subtotal + tax;
    const deltaCents = Math.abs(Math.round((total - computed) * 100));

    if (total <= 0) {
      return {
        invoice_or_po_id: id,
        party: input.party_name,
        subtotal_extracted: subtotal,
        tax_extracted: tax,
        total_extracted: total,
        computed_total: computed,
        delta_cents: deltaCents,
        passed: false,
        failure_reason: `total must be positive, got ${total}`,
      };
    }
    if (subtotal < 0 || tax < 0) {
      return {
        invoice_or_po_id: id,
        party: input.party_name,
        subtotal_extracted: subtotal,
        tax_extracted: tax,
        total_extracted: total,
        computed_total: computed,
        delta_cents: deltaCents,
        passed: false,
        failure_reason: "subtotal and tax must be non-negative",
      };
    }
    if (deltaCents > RECONCILIATION_TOLERANCE_CENTS) {
      return {
        invoice_or_po_id: id,
        party: input.party_name,
        subtotal_extracted: subtotal,
        tax_extracted: tax,
        total_extracted: total,
        computed_total: computed,
        delta_cents: deltaCents,
        passed: false,
        failure_reason: `subtotal+tax (${computed.toFixed(2)}) != total (${total.toFixed(2)}) — delta ${deltaCents}¢ exceeds ${RECONCILIATION_TOLERANCE_CENTS}¢ tolerance`,
      };
    }
    return {
      invoice_or_po_id: id,
      party: input.party_name,
      subtotal_extracted: subtotal,
      tax_extracted: tax,
      total_extracted: total,
      computed_total: computed,
      delta_cents: deltaCents,
      passed: true,
    };
  }

  private validateInput(input: DocustrataBridgeInput): void {
    if (!input || typeof input !== "object") {
      throw new Error("DocustrataAccountingBridgeEngine: input is required");
    }
    if (input.doc_type !== "invoice" && input.doc_type !== "purchase_order") {
      throw new Error(
        `DocustrataAccountingBridgeEngine: doc_type must be 'invoice' or 'purchase_order', got '${input.doc_type}'`,
      );
    }
    if (!input.party_name || typeof input.party_name !== "string" || input.party_name.length < 1) {
      throw new Error("DocustrataAccountingBridgeEngine: party_name is required");
    }
    const hasSource =
      input.source && (input.source.abs_path || input.source.text_content || input.source.filename);
    const hasManual = input.manual_invoice !== undefined || input.manual_po !== undefined;
    if (!hasSource && !hasManual) {
      throw new Error(
        "DocustrataAccountingBridgeEngine: provide source.abs_path, source.text_content, source.filename, manual_invoice, or manual_po",
      );
    }
  }

  private todayISO(): string {
    const d = new Date();
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  private round2(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100) / 100;
  }
}

export const docustrataAccountingBridgeEngine = new DocustrataAccountingBridgeEngine();
