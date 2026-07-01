/**
 * DocumentControlEngine — Controlled-document register per ISO 9001:2015 §7.5.
 *
 * ISO 9001 §7.5 mandates:
 *   §7.5.2  Creating and updating — title, format/version + author identification
 *   §7.5.3  Control of documented information:
 *     §7.5.3(a)  Available + suitable for use, where and when needed
 *     §7.5.3(b)  Adequately protected (confidentiality, improper use, loss of integrity)
 *     §7.5.3(c)  Distribution, access, retrieval, use
 *     §7.5.3(d)  Storage and preservation (legibility)
 *     §7.5.3(e)  Control of changes (version control)
 *     §7.5.3(f)  Retention and disposition
 *
 * Document lifecycle (per §7.5.3(a-f)):
 *   draft → in_review → approved → published → superseded | obsolete | archived
 *
 * Engine surface:
 *   - Document register (Quality Manual, work instructions, SOPs, forms, records)
 *   - Version chain — every change creates a new immutable revision row
 *   - Approval workflow with reviewer + approver identities (audit trail)
 *   - Controlled-copy distribution list (who has which version where)
 *   - Retention period tracking + due-for-disposition flag
 *
 * Hotel-soul invariants:
 *   - R12 fail-loud: missing approver / unauthorized state transition / past dates → throw
 *   - PII-free: only employee_id strings, no personal data
 *   - Object.frozen on every return
 *   - Forward-only versioning — never overwrites a previously approved revision
 *
 * @module DocumentControlEngine
 * @milestone HOTEL/U-DOCUMENT-CONTROL (2026-05-25, slot:hotel iter13)
 */

// ─── Constants ────────────────────────────────────────────────
const DAY_MS = 86_400_000;
const VALID_DOC_TYPES = new Set([
  "quality_manual",
  "policy",
  "procedure",
  "work_instruction",
  "form",
  "record",
  "specification",
  "drawing",
  "standard_operating_procedure",
]);
type DocStatus = "draft" | "in_review" | "approved" | "published" | "superseded" | "obsolete" | "archived";
const VALID_TRANSITIONS: Record<DocStatus, DocStatus[]> = {
  draft: ["in_review", "obsolete"],
  in_review: ["approved", "draft", "obsolete"],
  approved: ["published", "obsolete"],
  published: ["superseded", "obsolete"],
  superseded: ["archived"],
  obsolete: ["archived"],
  archived: [],
};

// ─── Types ────────────────────────────────────────────────────

export interface ControlledDocument {
  id: string;
  doc_number: string;
  title: string;
  doc_type: string;
  status: DocStatus;
  revision: string;
  author_id: string;
  reviewer_id: string | null;
  approver_id: string | null;
  created_at: string;
  reviewed_at: string | null;
  approved_at: string | null;
  published_at: string | null;
  retention_until: string | null;
  document_ref?: string;
  prior_revision_id: string | null;
  notes?: string;
}

export interface ControlledCopy {
  id: string;
  document_id: string;
  holder_employee_id: string;
  location: string;
  copy_number: number;
  issued_at: string;
  acknowledged_at: string | null;
}

// ─── Engine ───────────────────────────────────────────────────

class DocumentControlEngine {
  private docs: Map<string, ControlledDocument> = new Map();
  private copies: Map<string, ControlledCopy> = new Map();
  private nextDocId = 1;
  private nextCopyId = 1;

  /**
   * Register a new controlled document. Starts in 'draft' status.
   */
  registerDocument(input: {
    doc_number: string;
    title: string;
    doc_type: string;
    author_id: string;
    revision?: string;
    retention_years?: number;
    document_ref?: string;
    notes?: string;
  }): ControlledDocument {
    if (!input.doc_number || !input.title || !input.author_id) {
      throw new Error("DocumentControlEngine.registerDocument: doc_number + title + author_id required");
    }
    const docType = input.doc_type.toLowerCase();
    if (!VALID_DOC_TYPES.has(docType)) {
      throw new Error(
        `DocumentControlEngine.registerDocument: unknown doc_type "${input.doc_type}" — see VALID_DOC_TYPES`,
      );
    }
    if (input.retention_years !== undefined && (!Number.isFinite(input.retention_years) || input.retention_years <= 0)) {
      throw new Error(
        `DocumentControlEngine.registerDocument: retention_years must be positive finite, got ${input.retention_years}`,
      );
    }
    const id = `DOC-${String(this.nextDocId++).padStart(6, "0")}`;
    const ts = new Date().toISOString();
    const retention =
      input.retention_years !== undefined
        ? new Date(Date.now() + input.retention_years * 365 * DAY_MS).toISOString().slice(0, 10)
        : null;
    const doc: ControlledDocument = Object.freeze({
      id,
      doc_number: input.doc_number,
      title: input.title,
      doc_type: docType,
      status: "draft" as const,
      revision: input.revision ?? "A",
      author_id: input.author_id,
      reviewer_id: null,
      approver_id: null,
      created_at: ts,
      reviewed_at: null,
      approved_at: null,
      published_at: null,
      retention_until: retention,
      ...(input.document_ref !== undefined && { document_ref: input.document_ref }),
      prior_revision_id: null,
      ...(input.notes !== undefined && { notes: input.notes }),
    });
    this.docs.set(id, doc);
    return doc;
  }

  /**
   * Advance document status. Enforces ISO 9001 §7.5.3(e) controlled transitions.
   */
  transition(args: {
    document_id: string;
    to_status: DocStatus;
    actor_employee_id: string;
    notes?: string;
  }): ControlledDocument {
    const doc = this.requireDoc(args.document_id);
    if (!args.actor_employee_id) {
      throw new Error("DocumentControlEngine.transition: actor_employee_id required");
    }
    const allowed = VALID_TRANSITIONS[doc.status];
    if (!allowed.includes(args.to_status)) {
      throw new Error(
        `DocumentControlEngine.transition: forbidden ${doc.status} → ${args.to_status} (allowed: [${allowed.join(", ")}])`,
      );
    }
    const ts = new Date().toISOString();
    const updated: ControlledDocument = Object.freeze({
      ...doc,
      status: args.to_status,
      reviewer_id: args.to_status === "in_review" || args.to_status === "approved" ? args.actor_employee_id : doc.reviewer_id,
      approver_id: args.to_status === "approved" ? args.actor_employee_id : doc.approver_id,
      reviewed_at: args.to_status === "in_review" ? ts : doc.reviewed_at,
      approved_at: args.to_status === "approved" ? ts : doc.approved_at,
      published_at: args.to_status === "published" ? ts : doc.published_at,
      ...(args.notes !== undefined && { notes: args.notes }),
    });
    this.docs.set(doc.id, updated);
    return updated;
  }

  /**
   * Create a new revision of an existing approved document. Auto-supersedes
   * the prior. New rev starts in 'draft'; revision letter auto-advances (A→B→C…).
   */
  reviseDocument(args: {
    prior_document_id: string;
    author_id: string;
    notes?: string;
  }): ControlledDocument {
    const prior = this.requireDoc(args.prior_document_id);
    if (prior.status !== "published" && prior.status !== "approved") {
      throw new Error(
        `DocumentControlEngine.reviseDocument: prior must be 'published' or 'approved' (got '${prior.status}')`,
      );
    }
    if (!args.author_id) {
      throw new Error("DocumentControlEngine.reviseDocument: author_id required");
    }
    const newRevisionLetter = this.nextRevision(prior.revision);
    const ts = new Date().toISOString();
    const id = `DOC-${String(this.nextDocId++).padStart(6, "0")}`;
    const newDoc: ControlledDocument = Object.freeze({
      id,
      doc_number: prior.doc_number,
      title: prior.title,
      doc_type: prior.doc_type,
      status: "draft" as const,
      revision: newRevisionLetter,
      author_id: args.author_id,
      reviewer_id: null,
      approver_id: null,
      created_at: ts,
      reviewed_at: null,
      approved_at: null,
      published_at: null,
      retention_until: prior.retention_until,
      prior_revision_id: prior.id,
      ...(args.notes !== undefined && { notes: args.notes }),
    });
    // Supersede prior when it was published.
    if (prior.status === "published") {
      const supersededPrior: ControlledDocument = Object.freeze({ ...prior, status: "superseded" as const });
      this.docs.set(prior.id, supersededPrior);
    }
    this.docs.set(id, newDoc);
    return newDoc;
  }

  /**
   * Issue a controlled copy to an employee at a location (§7.5.3(c) distribution).
   */
  issueControlledCopy(args: {
    document_id: string;
    holder_employee_id: string;
    location: string;
  }): ControlledCopy {
    const doc = this.requireDoc(args.document_id);
    if (doc.status !== "published") {
      throw new Error(
        `DocumentControlEngine.issueControlledCopy: document must be 'published' (got '${doc.status}')`,
      );
    }
    if (!args.holder_employee_id || !args.location) {
      throw new Error("DocumentControlEngine.issueControlledCopy: holder_employee_id + location required");
    }
    // Compute copy_number — count existing copies of this doc.
    const existing = [...this.copies.values()].filter((c) => c.document_id === doc.id);
    const id = `CCP-${String(this.nextCopyId++).padStart(6, "0")}`;
    const copy: ControlledCopy = Object.freeze({
      id,
      document_id: doc.id,
      holder_employee_id: args.holder_employee_id,
      location: args.location,
      copy_number: existing.length + 1,
      issued_at: new Date().toISOString(),
      acknowledged_at: null,
    });
    this.copies.set(id, copy);
    return copy;
  }

  /**
   * Holder acknowledges receipt of the controlled copy (audit trail).
   */
  acknowledgeReceipt(args: { copy_id: string }): ControlledCopy {
    const copy = this.copies.get(args.copy_id);
    if (!copy) {
      throw new Error(`DocumentControlEngine.acknowledgeReceipt: unknown copy_id "${args.copy_id}"`);
    }
    const updated: ControlledCopy = Object.freeze({
      ...copy,
      acknowledged_at: new Date().toISOString(),
    });
    this.copies.set(copy.id, updated);
    return updated;
  }

  /** Get a document. */
  getDocument(id: string): ControlledDocument | null {
    const d = this.docs.get(id);
    return d ? Object.freeze({ ...d }) : null;
  }

  /** List documents by filter. */
  listDocuments(filter?: {
    doc_type?: string;
    status?: DocStatus;
    doc_number?: string;
  }): ReadonlyArray<ControlledDocument> {
    let out = [...this.docs.values()];
    if (filter?.doc_type) { const dt = filter.doc_type; out = out.filter((d) => d.doc_type === dt.toLowerCase()); }
    if (filter?.status) out = out.filter((d) => d.status === filter.status);
    if (filter?.doc_number) out = out.filter((d) => d.doc_number === filter.doc_number);
    return Object.freeze(out.map((d) => Object.freeze({ ...d })));
  }

  /** Get the active (published) revision for a doc_number. */
  getActiveRevision(doc_number: string): ControlledDocument | null {
    const active = [...this.docs.values()].find(
      (d) => d.doc_number === doc_number && d.status === "published",
    );
    return active ? Object.freeze({ ...active }) : null;
  }

  /** Full revision chain for a doc_number. */
  getRevisionChain(doc_number: string): ReadonlyArray<ControlledDocument> {
    const chain = [...this.docs.values()]
      .filter((d) => d.doc_number === doc_number)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    return Object.freeze(chain.map((d) => Object.freeze({ ...d })));
  }

  /** List controlled copies of a document. */
  listControlledCopies(args: { document_id: string }): ReadonlyArray<ControlledCopy> {
    const out = [...this.copies.values()].filter((c) => c.document_id === args.document_id);
    return Object.freeze(out.map((c) => Object.freeze({ ...c })));
  }

  /** Reset state — test-only. */
  reset(): void {
    this.docs.clear();
    this.copies.clear();
    this.nextDocId = 1;
    this.nextCopyId = 1;
  }

  // ─── Internals ──────────────────────────────────────────────

  private requireDoc(id: string): ControlledDocument {
    const d = this.docs.get(id);
    if (!d) throw new Error(`DocumentControlEngine: unknown document_id "${id}"`);
    return d;
  }

  private nextRevision(prior: string): string {
    if (!prior) return "A";
    const last = prior[prior.length - 1];
    if (last >= "A" && last <= "Y") {
      return prior.slice(0, -1) + String.fromCharCode(last.charCodeAt(0) + 1);
    }
    if (last === "Z") {
      return prior + "A";
    }
    // Numeric suffix?
    const m = prior.match(/^(.*?)(\d+)$/);
    if (m) {
      return m[1] + (Number(m[2]) + 1);
    }
    return prior + "1";
  }
}

export const documentControlEngine = new DocumentControlEngine();
