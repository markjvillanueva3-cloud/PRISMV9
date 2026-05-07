// WIRE-EXEMPT: tests in __tests__/engines/ragStackU-LEARN-04.test.ts
/**
 * ProvenanceEngine — U-LEARN-04
 * ==============================
 *
 * Tracks and validates provenance citations for AI recommendations.
 * Every recommendation from prism_ai/prism_calc/prism_intelligence
 * must carry ≥1 citation showing its source.
 *
 * Features:
 * - createProvenance(): Generate provenance record with audit hash
 * - addCitation(): Append citation to existing provenance
 * - validateProvenance(): Ensure provenance meets requirements
 * - summarize(): Human-readable provenance summary
 * - auditTrail(): Export for ITAR/AS9100 compliance
 *
 * @module engines/ProvenanceEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-04
 */

import { createHash } from "node:crypto";
import {
  type Citation,
  type Provenance,
  type CitationSourceType,
  CitationSchema,
  ProvenanceSchema,
} from "../schemas/citationSchema.js";

// ─── Types ──────────────────────────────────────────────────────────────

export interface CreateProvenanceInput {
  engine: string;
  citations?: Citation[];
  reasoning_trace?: string;
}

export interface AddCitationInput {
  source_type: CitationSourceType;
  source_id: string;
  corpus?: string;
  engine: string;
  excerpt?: string;
  confidence: number;
  retrieval_score?: number;
  metadata?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AuditRecord {
  recommendation_id: string;
  timestamp: string;
  engine: string;
  citation_count: number;
  primary_source: string | null;
  audit_hash: string;
  citations: Array<{
    source_type: CitationSourceType;
    source_id: string;
    confidence: number;
  }>;
}

// ─── Engine ─────────────────────────────────────────────────────────────

export class ProvenanceEngine {
  private static counter = 0;

  /**
   * Generate a unique recommendation ID.
   */
  private static generateId(): string {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 8);
    this.counter = (this.counter + 1) % 1000000;
    return `rec-${ts}-${rand}-${this.counter.toString(36).padStart(4, "0")}`;
  }

  /**
   * Compute SHA-256 audit hash of provenance record.
   */
  private static computeAuditHash(prov: Provenance): string {
    const data = JSON.stringify({
      recommendation_id: prov.recommendation_id,
      timestamp: prov.timestamp,
      engine: prov.engine,
      citations: prov.citations.map(c => ({
        source_type: c.source_type,
        source_id: c.source_id,
        confidence: c.confidence,
      })),
    });
    return createHash("sha256").update(data).digest("hex").slice(0, 16);
  }

  /**
   * Create a new provenance record.
   * @param input - Engine name and optional initial citations
   * @returns New provenance record with audit hash
   */
  static createProvenance(input: CreateProvenanceInput): Provenance {
    const now = new Date().toISOString();
    const citations = input.citations ?? [];

    // Determine primary citation (highest confidence)
    const primary = citations.length > 0
      ? citations.reduce((best, c) => c.confidence > best.confidence ? c : best)
      : null;

    const prov: Provenance = {
      recommendation_id: this.generateId(),
      timestamp: now,
      engine: input.engine,
      citations,
      primary_citation: primary,
      reasoning_trace: input.reasoning_trace ?? null,
      audit_hash: null,
    };

    prov.audit_hash = this.computeAuditHash(prov);
    return prov;
  }

  /**
   * Create a citation object.
   * @param input - Citation details
   * @returns Validated citation
   */
  static createCitation(input: AddCitationInput): Citation {
    const citation: Citation = {
      source_type: input.source_type,
      source_id: input.source_id,
      corpus: input.corpus ?? null,
      engine: input.engine,
      excerpt: input.excerpt?.slice(0, 200) ?? null,
      confidence: Math.max(0, Math.min(1, input.confidence)),
      retrieval_score: input.retrieval_score ?? null,
      metadata: input.metadata,
    };

    const validated = CitationSchema.safeParse(citation);
    if (!validated.success) {
      throw new Error(`Invalid citation: ${validated.error.message}`);
    }
    return validated.data;
  }

  /**
   * Add a citation to an existing provenance record.
   * @param provenance - Existing provenance
   * @param citation - Citation to add
   * @returns Updated provenance with recomputed hash
   */
  static addCitation(provenance: Provenance, citation: Citation): Provenance {
    const updated: Provenance = {
      ...provenance,
      citations: [...provenance.citations, citation],
    };

    // Update primary if new citation has higher confidence
    if (!updated.primary_citation || citation.confidence > updated.primary_citation.confidence) {
      updated.primary_citation = citation;
    }

    updated.audit_hash = this.computeAuditHash(updated);
    return updated;
  }

  /**
   * Validate that a provenance record meets requirements.
   * @param provenance - Provenance to validate
   * @param requireCitations - Require at least 1 citation (default true)
   * @returns Validation result with errors and warnings
   */
  static validateProvenance(provenance: Provenance, requireCitations = true): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Schema validation
    const schemaCheck = ProvenanceSchema.safeParse(provenance);
    if (!schemaCheck.success) {
      errors.push(`Schema invalid: ${schemaCheck.error.message}`);
      return { valid: false, errors, warnings };
    }

    // Citation requirement
    if (requireCitations && provenance.citations.length === 0) {
      errors.push("No citations provided — recommendation source unknown");
    }

    // Check for unknown source types
    const unknownCitations = provenance.citations.filter(c => c.source_type === "unknown");
    if (unknownCitations.length > 0) {
      warnings.push(`${unknownCitations.length} citation(s) have unknown source type`);
    }

    // Check confidence levels
    const lowConfidence = provenance.citations.filter(c => c.confidence < 0.5);
    if (lowConfidence.length === provenance.citations.length && provenance.citations.length > 0) {
      warnings.push("All citations have low confidence (<0.5)");
    }

    // Verify audit hash
    const expectedHash = this.computeAuditHash(provenance);
    if (provenance.audit_hash && provenance.audit_hash !== expectedHash) {
      errors.push("Audit hash mismatch — provenance may have been tampered");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate human-readable provenance summary.
   * @param provenance - Provenance to summarize
   * @returns Summary string
   */
  static summarize(provenance: Provenance): string {
    const parts: string[] = [];

    parts.push(`Recommendation ${provenance.recommendation_id}`);
    parts.push(`Engine: ${provenance.engine}`);

    if (provenance.citations.length === 0) {
      parts.push("Sources: NONE (unprovenanced)");
    } else {
      parts.push(`Sources (${provenance.citations.length}):`);
      for (const c of provenance.citations.slice(0, 5)) {
        const conf = (c.confidence * 100).toFixed(0);
        parts.push(`  - [${c.source_type}] ${c.source_id} (${conf}% conf)`);
        if (c.excerpt) {
          parts.push(`    "${c.excerpt.slice(0, 80)}${c.excerpt.length > 80 ? "..." : ""}"`);
        }
      }
      if (provenance.citations.length > 5) {
        parts.push(`  ... and ${provenance.citations.length - 5} more`);
      }
    }

    if (provenance.reasoning_trace) {
      parts.push(`Reasoning: ${provenance.reasoning_trace}`);
    }

    return parts.join("\n");
  }

  /**
   * Export provenance for audit trail (ITAR/AS9100).
   * @param provenance - Provenance to export
   * @returns Audit record
   */
  static auditTrail(provenance: Provenance): AuditRecord {
    return {
      recommendation_id: provenance.recommendation_id,
      timestamp: provenance.timestamp,
      engine: provenance.engine,
      citation_count: provenance.citations.length,
      primary_source: provenance.primary_citation?.source_id ?? null,
      audit_hash: provenance.audit_hash ?? this.computeAuditHash(provenance),
      citations: provenance.citations.map(c => ({
        source_type: c.source_type,
        source_id: c.source_id,
        confidence: c.confidence,
      })),
    };
  }

  /**
   * Merge multiple provenance records (e.g., from parallel retrievals).
   * @param records - Provenance records to merge
   * @param engine - Engine name for merged record
   * @returns Merged provenance
   */
  static merge(records: Provenance[], engine: string): Provenance {
    const allCitations: Citation[] = [];
    const traces: string[] = [];

    for (const rec of records) {
      allCitations.push(...rec.citations);
      if (rec.reasoning_trace) {
        traces.push(`[${rec.engine}] ${rec.reasoning_trace}`);
      }
    }

    return this.createProvenance({
      engine,
      citations: allCitations,
      reasoning_trace: traces.length > 0 ? traces.join("; ") : undefined,
    });
  }

  /**
   * Engine self-awareness metadata.
   */
  static getSelfAwareness() {
    return {
      name: "ProvenanceEngine",
      version: "1.0.0",
      milestone: "U-LEARN-04",
      capabilities: [
        "createProvenance",
        "createCitation",
        "addCitation",
        "validateProvenance",
        "summarize",
        "auditTrail",
        "merge",
      ],
      description: "Tracks provenance citations for AI recommendations — enables ITAR/AS9100 audit trails",
    };
  }
}

export const provenanceEngine = ProvenanceEngine;
