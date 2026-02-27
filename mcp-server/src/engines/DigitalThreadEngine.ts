/**
 * DigitalThreadEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Manages the digital thread — the complete data lineage from design
 * through manufacturing to inspection for each part. Tracks traceability,
 * data provenance, and change propagation across the product lifecycle.
 *
 * Actions: thread_trace, thread_link, thread_audit
 */

// ============================================================================
// TYPES
// ============================================================================

export type ThreadStage = "design" | "cam" | "setup" | "machining" | "inspection" | "assembly" | "service";

export interface ThreadNode {
  id: string;
  stage: ThreadStage;
  artifact_type: string;          // e.g., "CAD model", "G-code", "CMM report"
  artifact_ref: string;           // file path or ID
  created_at: string;             // ISO timestamp
  created_by: string;
  version: string;
  checksum?: string;
  parent_ids: string[];           // upstream dependencies
}

export interface ThreadLink {
  from_id: string;
  to_id: string;
  relationship: "derived_from" | "inspected_by" | "modified_by" | "supersedes" | "input_to";
  timestamp: string;
}

export interface DigitalThreadInput {
  part_number: string;
  nodes: ThreadNode[];
  links: ThreadLink[];
}

export interface DigitalThreadResult {
  is_complete: boolean;
  coverage_pct: number;               // stages covered
  missing_stages: ThreadStage[];
  broken_links: { from: string; to: string; issue: string }[];
  change_propagation_risk: string[];
  traceability_score: number;          // 0-100
  recommendations: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class DigitalThreadEngine {
  trace(input: DigitalThreadInput): DigitalThreadResult {
    const allStages: ThreadStage[] = ["design", "cam", "setup", "machining", "inspection"];
    const coveredStages = new Set(input.nodes.map(n => n.stage));
    const missing = allStages.filter(s => !coveredStages.has(s));

    // Check link integrity
    const nodeIds = new Set(input.nodes.map(n => n.id));
    const brokenLinks = input.links
      .filter(l => !nodeIds.has(l.from_id) || !nodeIds.has(l.to_id))
      .map(l => ({
        from: l.from_id,
        to: l.to_id,
        issue: !nodeIds.has(l.from_id) ? `Source node ${l.from_id} not found` : `Target node ${l.to_id} not found`,
      }));

    // Change propagation: find nodes with no downstream links (potential gaps)
    const hasDownstream = new Set(input.links.map(l => l.from_id));
    const leafNodes = input.nodes.filter(n => !hasDownstream.has(n.id) && n.stage !== "inspection" && n.stage !== "service");
    const propRisks = leafNodes.map(n => `Node ${n.id} (${n.stage}/${n.artifact_type}) has no downstream link — changes may not propagate`);

    // Traceability score
    const coveragePct = (coveredStages.size / allStages.length) * 100;
    const linkIntegrity = input.links.length > 0 ? (1 - brokenLinks.length / input.links.length) * 100 : 0;
    const score = Math.round((coveragePct * 0.5 + linkIntegrity * 0.3 + (propRisks.length === 0 ? 20 : 0)));

    const recs: string[] = [];
    if (missing.length > 0) recs.push(`Missing stages: ${missing.join(", ")} — add artifacts to complete digital thread`);
    if (brokenLinks.length > 0) recs.push(`${brokenLinks.length} broken links — repair data connections`);
    if (propRisks.length > 0) recs.push("Unlinked leaf nodes — design changes may not reach downstream stages");
    if (recs.length === 0) recs.push("Digital thread complete and traceable");

    return {
      is_complete: missing.length === 0 && brokenLinks.length === 0,
      coverage_pct: Math.round(coveragePct),
      missing_stages: missing,
      broken_links: brokenLinks,
      change_propagation_risk: propRisks,
      traceability_score: score,
      recommendations: recs,
    };
  }

  link(nodeA: string, nodeB: string, relationship: ThreadLink["relationship"]): ThreadLink {
    return {
      from_id: nodeA,
      to_id: nodeB,
      relationship,
      timestamp: new Date().toISOString(),
    };
  }
}

export const digitalThreadEngine = new DigitalThreadEngine();
