/**
 * DocumentControlEngine.test.ts — HOTEL/U-DOCUMENT-CONTROL (iter13)
 *
 * ISO 9001:2015 §7.5 controlled-document register tests.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { documentControlEngine } from "../engines/DocumentControlEngine.js";

const SOP = {
  doc_number: "SOP-001",
  title: "Material Receiving Inspection",
  doc_type: "standard_operating_procedure",
  author_id: "EMP-MV",
};

describe("DocumentControlEngine", () => {
  beforeEach(() => documentControlEngine.reset());

  describe("registerDocument", () => {
    it("creates a doc in 'draft' status with rev A", () => {
      const d = documentControlEngine.registerDocument(SOP);
      expect(d.id).toMatch(/^DOC-\d{6}$/);
      expect(d.status).toBe("draft");
      expect(d.revision).toBe("A");
      expect(d.author_id).toBe("EMP-MV");
    });

    it("supports custom starting revision", () => {
      const d = documentControlEngine.registerDocument({ ...SOP, revision: "B2" });
      expect(d.revision).toBe("B2");
    });

    it("computes retention_until when retention_years provided", () => {
      const d = documentControlEngine.registerDocument({ ...SOP, retention_years: 7 });
      expect(d.retention_until).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("normalizes doc_type to lowercase", () => {
      const d = documentControlEngine.registerDocument({ ...SOP, doc_type: "Quality_Manual" });
      expect(d.doc_type).toBe("quality_manual");
    });

    it("R12 throws on missing required fields", () => {
      expect(() => documentControlEngine.registerDocument({ ...SOP, doc_number: "" })).toThrow(
        /doc_number \+ title \+ author_id required/,
      );
    });

    it("R12 throws on unknown doc_type", () => {
      expect(() => documentControlEngine.registerDocument({ ...SOP, doc_type: "garbage" })).toThrow(
        /unknown doc_type/,
      );
    });

    it("R12 throws on non-positive retention_years", () => {
      expect(() => documentControlEngine.registerDocument({ ...SOP, retention_years: 0 })).toThrow(
        /retention_years must be positive/,
      );
    });
  });

  describe("transition — ISO 9001 §7.5.3(e) lifecycle", () => {
    it("full happy path: draft → in_review → approved → published", () => {
      const d0 = documentControlEngine.registerDocument(SOP);
      const d1 = documentControlEngine.transition({
        document_id: d0.id,
        to_status: "in_review",
        actor_employee_id: "REVIEWER",
      });
      expect(d1.status).toBe("in_review");
      expect(d1.reviewer_id).toBe("REVIEWER");
      const d2 = documentControlEngine.transition({
        document_id: d1.id,
        to_status: "approved",
        actor_employee_id: "APPROVER",
      });
      expect(d2.status).toBe("approved");
      expect(d2.approver_id).toBe("APPROVER");
      expect(d2.approved_at).not.toBeNull();
      const d3 = documentControlEngine.transition({
        document_id: d2.id,
        to_status: "published",
        actor_employee_id: "APPROVER",
      });
      expect(d3.status).toBe("published");
      expect(d3.published_at).not.toBeNull();
    });

    it("forbidden transition draft → approved (must go through in_review)", () => {
      const d = documentControlEngine.registerDocument(SOP);
      expect(() =>
        documentControlEngine.transition({
          document_id: d.id,
          to_status: "approved",
          actor_employee_id: "X",
        }),
      ).toThrow(/forbidden draft → approved/);
    });

    it("forbidden transition published → draft (one-way after publish)", () => {
      const d0 = documentControlEngine.registerDocument(SOP);
      const d1 = documentControlEngine.transition({ document_id: d0.id, to_status: "in_review", actor_employee_id: "R" });
      const d2 = documentControlEngine.transition({ document_id: d1.id, to_status: "approved", actor_employee_id: "A" });
      const d3 = documentControlEngine.transition({ document_id: d2.id, to_status: "published", actor_employee_id: "A" });
      expect(() =>
        documentControlEngine.transition({ document_id: d3.id, to_status: "draft", actor_employee_id: "A" }),
      ).toThrow(/forbidden published → draft/);
    });

    it("R12 throws on missing actor", () => {
      const d = documentControlEngine.registerDocument(SOP);
      expect(() =>
        documentControlEngine.transition({ document_id: d.id, to_status: "in_review", actor_employee_id: "" }),
      ).toThrow(/actor_employee_id required/);
    });

    it("R12 throws on unknown document_id", () => {
      expect(() =>
        documentControlEngine.transition({ document_id: "NOPE", to_status: "in_review", actor_employee_id: "X" }),
      ).toThrow(/unknown document_id/);
    });
  });

  describe("reviseDocument — version chain", () => {
    it("creates revision B in draft from published rev A; supersedes prior", () => {
      const d0 = documentControlEngine.registerDocument(SOP);
      const d1 = documentControlEngine.transition({ document_id: d0.id, to_status: "in_review", actor_employee_id: "R" });
      const d2 = documentControlEngine.transition({ document_id: d1.id, to_status: "approved", actor_employee_id: "A" });
      const published = documentControlEngine.transition({ document_id: d2.id, to_status: "published", actor_employee_id: "A" });
      const revB = documentControlEngine.reviseDocument({ prior_document_id: published.id, author_id: "EMP-MV" });
      expect(revB.revision).toBe("B");
      expect(revB.status).toBe("draft");
      expect(revB.prior_revision_id).toBe(published.id);
      // Prior was auto-superseded
      const priorAfter = documentControlEngine.getDocument(published.id);
      expect(priorAfter?.status).toBe("superseded");
    });

    it("advances revision letter Z → ZA (rolls over)", () => {
      const d = documentControlEngine.registerDocument({ ...SOP, revision: "Z" });
      const d1 = documentControlEngine.transition({ document_id: d.id, to_status: "in_review", actor_employee_id: "R" });
      const d2 = documentControlEngine.transition({ document_id: d1.id, to_status: "approved", actor_employee_id: "A" });
      const newRev = documentControlEngine.reviseDocument({ prior_document_id: d2.id, author_id: "X" });
      expect(newRev.revision).toBe("ZA");
    });

    it("R12 throws when prior is not published/approved", () => {
      const d = documentControlEngine.registerDocument(SOP);
      expect(() =>
        documentControlEngine.reviseDocument({ prior_document_id: d.id, author_id: "X" }),
      ).toThrow(/prior must be 'published' or 'approved'/);
    });
  });

  describe("Controlled-copy distribution §7.5.3(c)", () => {
    it("issues a copy with auto-incremented copy_number", () => {
      const d0 = documentControlEngine.registerDocument(SOP);
      const d1 = documentControlEngine.transition({ document_id: d0.id, to_status: "in_review", actor_employee_id: "R" });
      const d2 = documentControlEngine.transition({ document_id: d1.id, to_status: "approved", actor_employee_id: "A" });
      const pub = documentControlEngine.transition({ document_id: d2.id, to_status: "published", actor_employee_id: "A" });
      const c1 = documentControlEngine.issueControlledCopy({
        document_id: pub.id,
        holder_employee_id: "EMP-A",
        location: "Shop Floor Bay 1",
      });
      const c2 = documentControlEngine.issueControlledCopy({
        document_id: pub.id,
        holder_employee_id: "EMP-B",
        location: "QC Lab",
      });
      expect(c1.copy_number).toBe(1);
      expect(c2.copy_number).toBe(2);
    });

    it("R12 throws when issuing a copy of non-published document", () => {
      const d = documentControlEngine.registerDocument(SOP);
      expect(() =>
        documentControlEngine.issueControlledCopy({
          document_id: d.id,
          holder_employee_id: "EMP-A",
          location: "Bay 1",
        }),
      ).toThrow(/must be 'published'/);
    });

    it("acknowledgeReceipt sets acknowledged_at", () => {
      const d0 = documentControlEngine.registerDocument(SOP);
      const d1 = documentControlEngine.transition({ document_id: d0.id, to_status: "in_review", actor_employee_id: "R" });
      const d2 = documentControlEngine.transition({ document_id: d1.id, to_status: "approved", actor_employee_id: "A" });
      const pub = documentControlEngine.transition({ document_id: d2.id, to_status: "published", actor_employee_id: "A" });
      const c1 = documentControlEngine.issueControlledCopy({
        document_id: pub.id,
        holder_employee_id: "EMP-A",
        location: "Bay 1",
      });
      const acked = documentControlEngine.acknowledgeReceipt({ copy_id: c1.id });
      expect(acked.acknowledged_at).not.toBeNull();
    });

    it("R12 throws on unknown copy_id", () => {
      expect(() => documentControlEngine.acknowledgeReceipt({ copy_id: "NOPE" })).toThrow(/unknown copy_id/);
    });
  });

  describe("Query surfaces", () => {
    it("listDocuments filters by doc_type", () => {
      documentControlEngine.registerDocument(SOP);
      documentControlEngine.registerDocument({ ...SOP, doc_number: "QM-001", doc_type: "quality_manual" });
      const sops = documentControlEngine.listDocuments({ doc_type: "standard_operating_procedure" });
      expect(sops).toHaveLength(1);
    });

    it("getActiveRevision returns the published rev only", () => {
      const d0 = documentControlEngine.registerDocument(SOP);
      const d1 = documentControlEngine.transition({ document_id: d0.id, to_status: "in_review", actor_employee_id: "R" });
      const d2 = documentControlEngine.transition({ document_id: d1.id, to_status: "approved", actor_employee_id: "A" });
      const pub = documentControlEngine.transition({ document_id: d2.id, to_status: "published", actor_employee_id: "A" });
      const active = documentControlEngine.getActiveRevision(SOP.doc_number);
      expect(active?.id).toBe(pub.id);
    });

    it("getActiveRevision returns null when no published rev", () => {
      documentControlEngine.registerDocument(SOP);
      expect(documentControlEngine.getActiveRevision(SOP.doc_number)).toBeNull();
    });

    it("getRevisionChain returns all revs chronologically", () => {
      const d0 = documentControlEngine.registerDocument(SOP);
      const d1 = documentControlEngine.transition({ document_id: d0.id, to_status: "in_review", actor_employee_id: "R" });
      const d2 = documentControlEngine.transition({ document_id: d1.id, to_status: "approved", actor_employee_id: "A" });
      const pub = documentControlEngine.transition({ document_id: d2.id, to_status: "published", actor_employee_id: "A" });
      documentControlEngine.reviseDocument({ prior_document_id: pub.id, author_id: "EMP-MV" });
      const chain = documentControlEngine.getRevisionChain(SOP.doc_number);
      expect(chain).toHaveLength(2);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("returned doc is frozen", () => {
      const d = documentControlEngine.registerDocument(SOP);
      expect(Object.isFrozen(d)).toBe(true);
    });

    it("PII-free — only employee_id strings", () => {
      const d = documentControlEngine.registerDocument(SOP);
      const keys = Object.keys(d);
      expect(keys).not.toContain("author_name");
      expect(keys).not.toContain("ssn");
    });
  });
});
