/**
 * RevisionControlEngine — R27-MS3
 *
 * Drawing and document revision tracking: revision history, effectivity date
 * management, supersedure chain tracking, and audit trail analysis.
 *
 * Actions:
 *   rev_track       — Track revision history for a document or drawing
 *   rev_effectivity — Manage effectivity dates and active revision windows
 *   rev_supersede   — Trace supersedure chains (what replaced what)
 *   rev_audit       — Audit trail analysis for compliance reporting
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RevisionRecord {
  doc_id: string;
  doc_type: "drawing" | "specification" | "procedure" | "work_instruction" | "test_plan" | "setup_sheet";
  title: string;
  part_number: string | null;
  revision: string;
  revision_number: number;
  status: "draft" | "pending_review" | "approved" | "released" | "superseded" | "obsolete";
  author: string;
  reviewer: string | null;
  approver: string | null;
  created_date: string;
  approved_date: string | null;
  effective_date: string | null;
  superseded_date: string | null;
  superseded_by: string | null;
  change_summary: string;
  ecn_reference: string | null;
  file_format: string;
  page_count: number;
}

interface AuditEntry {
  audit_id: string;
  doc_id: string;
  action: "created" | "reviewed" | "approved" | "released" | "superseded" | "obsoleted" | "modified" | "accessed" | "printed" | "distributed";
  user: string;
  timestamp: string;
  details: string;
  ip_address: string;
  department: string;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const REVISION_DATABASE: RevisionRecord[] = [
  // Drawing DWG-BRK-1001 — full revision history
  { doc_id: "DWG-BRK-1001-R1", doc_type: "drawing", title: "Bracket Assembly A — Detail Drawing", part_number: "BRK-1001", revision: "A", revision_number: 1, status: "superseded", author: "A. Johnson", reviewer: "M. Torres", approver: "J. Chen", created_date: "2023-03-15", approved_date: "2023-03-20", effective_date: "2023-04-01", superseded_date: "2023-09-15", superseded_by: "DWG-BRK-1001-R2", change_summary: "Initial release", ecn_reference: null, file_format: "PDF", page_count: 3 },
  { doc_id: "DWG-BRK-1001-R2", doc_type: "drawing", title: "Bracket Assembly A — Detail Drawing", part_number: "BRK-1001", revision: "B", revision_number: 2, status: "superseded", author: "A. Johnson", reviewer: "M. Torres", approver: "J. Chen", created_date: "2023-09-10", approved_date: "2023-09-15", effective_date: "2023-10-01", superseded_date: "2024-09-20", superseded_by: "DWG-BRK-1001-R3", change_summary: "Added fillet radius callouts, updated GD&T datums", ecn_reference: "ECN-2023-045", file_format: "PDF", page_count: 3 },
  { doc_id: "DWG-BRK-1001-R3", doc_type: "drawing", title: "Bracket Assembly A — Detail Drawing", part_number: "BRK-1001", revision: "C", revision_number: 3, status: "released", author: "A. Johnson", reviewer: "M. Torres", approver: "J. Chen", created_date: "2024-09-15", approved_date: "2024-09-20", effective_date: "2024-10-01", superseded_date: null, superseded_by: null, change_summary: "Material change AL-6061 to AL-7075 per ECN-2024-001", ecn_reference: "ECN-2024-001", file_format: "PDF", page_count: 4 },

  // Drawing DWG-SFT-2001 — full revision history
  { doc_id: "DWG-SFT-2001-R1", doc_type: "drawing", title: "Drive Shaft — Detail Drawing", part_number: "SFT-2001", revision: "A", revision_number: 1, status: "superseded", author: "M. Torres", reviewer: "J. Chen", approver: "R. Kim", created_date: "2022-06-01", approved_date: "2022-06-10", effective_date: "2022-07-01", superseded_date: "2022-11-15", superseded_by: "DWG-SFT-2001-R2", change_summary: "Initial release", ecn_reference: null, file_format: "PDF", page_count: 5 },
  { doc_id: "DWG-SFT-2001-R2", doc_type: "drawing", title: "Drive Shaft — Detail Drawing", part_number: "SFT-2001", revision: "B", revision_number: 2, status: "superseded", author: "M. Torres", reviewer: "J. Chen", approver: "R. Kim", created_date: "2022-11-10", approved_date: "2022-11-15", effective_date: "2022-12-01", superseded_date: "2023-05-20", superseded_by: "DWG-SFT-2001-R3", change_summary: "Updated keyway dimensions, added surface finish callout", ecn_reference: "ECN-2022-089", file_format: "PDF", page_count: 5 },
  { doc_id: "DWG-SFT-2001-R3", doc_type: "drawing", title: "Drive Shaft — Detail Drawing", part_number: "SFT-2001", revision: "C", revision_number: 3, status: "superseded", author: "M. Torres", reviewer: "J. Chen", approver: "R. Kim", created_date: "2023-05-15", approved_date: "2023-05-20", effective_date: "2023-06-01", superseded_date: "2023-11-10", superseded_by: "DWG-SFT-2001-R4", change_summary: "Added grinding operation for bearing journal", ecn_reference: "ECN-2023-023", file_format: "PDF", page_count: 6 },
  { doc_id: "DWG-SFT-2001-R4", doc_type: "drawing", title: "Drive Shaft — Detail Drawing", part_number: "SFT-2001", revision: "D", revision_number: 4, status: "superseded", author: "A. Johnson", reviewer: "M. Torres", approver: "R. Kim", created_date: "2023-11-05", approved_date: "2023-11-10", effective_date: "2023-12-01", superseded_date: "2024-10-05", superseded_by: "DWG-SFT-2001-R5", change_summary: "Tightened runout tolerance to 0.01mm TIR", ecn_reference: "ECN-2023-067", file_format: "PDF", page_count: 6 },
  { doc_id: "DWG-SFT-2001-R5", doc_type: "drawing", title: "Drive Shaft — Detail Drawing", part_number: "SFT-2001", revision: "E", revision_number: 5, status: "released", author: "A. Johnson", reviewer: "M. Torres", approver: "R. Kim", created_date: "2024-10-01", approved_date: "2024-10-05", effective_date: "2024-11-01", superseded_date: null, superseded_by: null, change_summary: "Bore ID tolerance tightened to ±0.025mm per ECN-2024-002", ecn_reference: "ECN-2024-002", file_format: "PDF", page_count: 7 },

  // Specifications
  { doc_id: "SPEC-MAT-AL-R1", doc_type: "specification", title: "Aluminum Alloy Material Specification", part_number: null, revision: "A", revision_number: 1, status: "superseded", author: "S. Patel", reviewer: "M. Torres", approver: "J. Chen", created_date: "2022-01-10", approved_date: "2022-01-15", effective_date: "2022-02-01", superseded_date: "2024-10-01", superseded_by: "SPEC-MAT-AL-R2", change_summary: "Initial release — covers 6061-T6 only", ecn_reference: null, file_format: "PDF", page_count: 8 },
  { doc_id: "SPEC-MAT-AL-R2", doc_type: "specification", title: "Aluminum Alloy Material Specification", part_number: null, revision: "B", revision_number: 2, status: "released", author: "S. Patel", reviewer: "M. Torres", approver: "J. Chen", created_date: "2024-09-25", approved_date: "2024-10-01", effective_date: "2024-10-15", superseded_date: null, superseded_by: null, change_summary: "Added 7075-T6 requirements per ECN-2024-001", ecn_reference: "ECN-2024-001", file_format: "PDF", page_count: 12 },

  // Work Instructions
  { doc_id: "WI-MILL-BRK-R1", doc_type: "work_instruction", title: "Milling Work Instruction — Bracket Assembly", part_number: "BRK-1001", revision: "A", revision_number: 1, status: "superseded", author: "R. Kim", reviewer: "B. Martinez", approver: "M. Torres", created_date: "2023-04-01", approved_date: "2023-04-05", effective_date: "2023-04-10", superseded_date: "2024-10-12", superseded_by: "WI-MILL-BRK-R2", change_summary: "Initial release — 6061-T6 parameters", ecn_reference: null, file_format: "PDF", page_count: 6 },
  { doc_id: "WI-MILL-BRK-R2", doc_type: "work_instruction", title: "Milling Work Instruction — Bracket Assembly", part_number: "BRK-1001", revision: "B", revision_number: 2, status: "released", author: "R. Kim", reviewer: "B. Martinez", approver: "M. Torres", created_date: "2024-10-08", approved_date: "2024-10-12", effective_date: "2024-10-15", superseded_date: null, superseded_by: null, change_summary: "Updated feeds/speeds for 7075-T6 material", ecn_reference: "ECN-2024-001", file_format: "PDF", page_count: 8 },

  // Setup Sheet
  { doc_id: "SETUP-HSG-MILL-R1", doc_type: "setup_sheet", title: "Setup Sheet — Housing Milling", part_number: "HSG-3001", revision: "A", revision_number: 1, status: "released", author: "B. Martinez", reviewer: "R. Kim", approver: "M. Torres", created_date: "2024-01-15", approved_date: "2024-01-20", effective_date: "2024-02-01", superseded_date: null, superseded_by: null, change_summary: "Initial release", ecn_reference: null, file_format: "PDF", page_count: 4 },

  // Test Plan
  { doc_id: "TP-IMP-8001-R1", doc_type: "test_plan", title: "Test Plan — Implant Pin Biocompatibility", part_number: "IMP-8001", revision: "A", revision_number: 1, status: "pending_review", author: "S. Patel", reviewer: "K. Zhao", approver: null, created_date: "2024-10-20", approved_date: null, effective_date: null, superseded_date: null, superseded_by: null, change_summary: "New test plan for ELI grade material per ECN-2024-008", ecn_reference: "ECN-2024-008", file_format: "DOCX", page_count: 15 },

  // Procedure — pending draft
  { doc_id: "PROC-ANODIZE-R1", doc_type: "procedure", title: "Hard Anodizing Process Procedure", part_number: null, revision: "A", revision_number: 1, status: "draft", author: "R. Kim", reviewer: null, approver: null, created_date: "2024-10-28", approved_date: null, effective_date: null, superseded_date: null, superseded_by: null, change_summary: "Draft — Type III hard anodize per ECN-2024-005", ecn_reference: "ECN-2024-005", file_format: "DOCX", page_count: 10 },
];

const AUDIT_TRAIL: AuditEntry[] = [
  { audit_id: "AUD-001", doc_id: "DWG-BRK-1001-R3", action: "created", user: "A. Johnson", timestamp: "2024-09-15T08:30:00Z", details: "Created new revision C from ECN-2024-001", ip_address: "192.168.1.101", department: "Engineering" },
  { audit_id: "AUD-002", doc_id: "DWG-BRK-1001-R3", action: "reviewed", user: "M. Torres", timestamp: "2024-09-17T14:15:00Z", details: "Technical review — approved with comments", ip_address: "192.168.1.102", department: "Engineering" },
  { audit_id: "AUD-003", doc_id: "DWG-BRK-1001-R3", action: "approved", user: "J. Chen", timestamp: "2024-09-20T09:00:00Z", details: "Final approval — ready for release", ip_address: "192.168.1.103", department: "Engineering" },
  { audit_id: "AUD-004", doc_id: "DWG-BRK-1001-R3", action: "released", user: "S. Patel", timestamp: "2024-09-20T10:30:00Z", details: "Released to production — effective 2024-10-01", ip_address: "192.168.1.104", department: "Quality" },
  { audit_id: "AUD-005", doc_id: "DWG-BRK-1001-R2", action: "superseded", user: "S. Patel", timestamp: "2024-09-20T10:31:00Z", details: "Superseded by DWG-BRK-1001-R3", ip_address: "192.168.1.104", department: "Quality" },
  { audit_id: "AUD-006", doc_id: "DWG-BRK-1001-R3", action: "distributed", user: "S. Patel", timestamp: "2024-09-20T11:00:00Z", details: "Distributed to Manufacturing, Quality, Procurement", ip_address: "192.168.1.104", department: "Quality" },
  { audit_id: "AUD-007", doc_id: "DWG-BRK-1001-R3", action: "printed", user: "R. Kim", timestamp: "2024-09-25T07:30:00Z", details: "Printed controlled copy #12 for shop floor", ip_address: "192.168.1.201", department: "Manufacturing" },
  { audit_id: "AUD-008", doc_id: "DWG-SFT-2001-R5", action: "created", user: "A. Johnson", timestamp: "2024-10-01T09:00:00Z", details: "Created revision E from ECN-2024-002", ip_address: "192.168.1.101", department: "Engineering" },
  { audit_id: "AUD-009", doc_id: "DWG-SFT-2001-R5", action: "reviewed", user: "M. Torres", timestamp: "2024-10-03T13:45:00Z", details: "Technical review — approved", ip_address: "192.168.1.102", department: "Engineering" },
  { audit_id: "AUD-010", doc_id: "DWG-SFT-2001-R5", action: "approved", user: "R. Kim", timestamp: "2024-10-05T08:30:00Z", details: "Manufacturing approval — grinding process qualified", ip_address: "192.168.1.105", department: "Manufacturing" },
  { audit_id: "AUD-011", doc_id: "DWG-SFT-2001-R5", action: "released", user: "S. Patel", timestamp: "2024-10-05T10:00:00Z", details: "Released — effective 2024-11-01", ip_address: "192.168.1.104", department: "Quality" },
  { audit_id: "AUD-012", doc_id: "SPEC-MAT-AL-R2", action: "released", user: "S. Patel", timestamp: "2024-10-01T09:30:00Z", details: "Released — added 7075-T6 requirements", ip_address: "192.168.1.104", department: "Quality" },
  { audit_id: "AUD-013", doc_id: "WI-MILL-BRK-R2", action: "approved", user: "M. Torres", timestamp: "2024-10-12T16:00:00Z", details: "Approved — 7075 parameters validated", ip_address: "192.168.1.102", department: "Engineering" },
  { audit_id: "AUD-014", doc_id: "DWG-BRK-1001-R3", action: "accessed", user: "B. Martinez", timestamp: "2024-10-15T06:45:00Z", details: "Viewed for CNC programming reference", ip_address: "192.168.1.201", department: "Manufacturing" },
  { audit_id: "AUD-015", doc_id: "TP-IMP-8001-R1", action: "created", user: "S. Patel", timestamp: "2024-10-20T10:00:00Z", details: "New test plan for ELI biocompatibility", ip_address: "192.168.1.104", department: "Quality" },
  { audit_id: "AUD-016", doc_id: "PROC-ANODIZE-R1", action: "created", user: "R. Kim", timestamp: "2024-10-28T08:00:00Z", details: "Draft hard anodize procedure", ip_address: "192.168.1.105", department: "Manufacturing" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRevisionHistory(partOrDocId: string): RevisionRecord[] {
  // Match by part number (get all revisions of all docs for that part)
  const byPart = REVISION_DATABASE.filter((r) => r.part_number === partOrDocId);
  if (byPart.length > 0) return byPart.sort((a, b) => a.revision_number - b.revision_number);

  // Match by doc_id prefix (strip revision suffix)
  const baseId = partOrDocId.replace(/-R\d+$/, "");
  const byDoc = REVISION_DATABASE.filter((r) => r.doc_id.startsWith(baseId));
  if (byDoc.length > 0) return byDoc.sort((a, b) => a.revision_number - b.revision_number);

  return [];
}

function getActiveRevisions(): RevisionRecord[] {
  return REVISION_DATABASE.filter((r) => r.status === "released");
}

function getSupersedureChain(docId: string): RevisionRecord[] {
  const chain: RevisionRecord[] = [];
  let current = REVISION_DATABASE.find((r) => r.doc_id === docId);
  while (current) {
    chain.unshift(current);
    if (current.superseded_by) {
      current = REVISION_DATABASE.find((r) => r.doc_id === current!.superseded_by);
    } else {
      break;
    }
  }
  // Also look backward
  let earliest = chain[0];
  while (earliest) {
    const predecessor = REVISION_DATABASE.find((r) => r.superseded_by === earliest!.doc_id);
    if (predecessor && !chain.includes(predecessor)) {
      chain.unshift(predecessor);
      earliest = predecessor;
    } else {
      break;
    }
  }
  return chain;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function revTrack(params: Record<string, unknown>): unknown {
  const query = (params.part_number as string) || (params.doc_id as string) || (params.partNumber as string) || (params.docId as string) || "";
  const status = (params.status as string) || "";

  let revisions: RevisionRecord[];
  if (query) {
    revisions = getRevisionHistory(query);
  } else if (status) {
    revisions = REVISION_DATABASE.filter((r) => r.status === status);
  } else {
    revisions = REVISION_DATABASE;
  }

  // Group by document base
  const groups: Record<string, RevisionRecord[]> = {};
  for (const r of revisions) {
    const base = r.doc_id.replace(/-R\d+$/, "");
    if (!groups[base]) groups[base] = [];
    groups[base].push(r);
  }

  const docSummaries = Object.entries(groups).map(([base, revs]) => {
    const latest = revs.reduce((a, b) => a.revision_number > b.revision_number ? a : b);
    const totalRevisions = revs.length;
    const daysSinceLastUpdate = Math.round((new Date("2024-11-01").getTime() - new Date(latest.created_date).getTime()) / 86400000);

    return {
      document_base: base,
      title: latest.title,
      part_number: latest.part_number,
      latest_revision: latest.revision,
      latest_status: latest.status,
      total_revisions: totalRevisions,
      days_since_update: daysSinceLastUpdate,
      ecn_reference: latest.ecn_reference,
      revisions: revs.map((r) => ({
        doc_id: r.doc_id,
        revision: r.revision,
        status: r.status,
        author: r.author,
        created_date: r.created_date,
        effective_date: r.effective_date,
        change_summary: r.change_summary,
      })),
    };
  });

  // Status distribution
  const statusDist: Record<string, number> = {};
  for (const r of revisions) {
    statusDist[r.status] = (statusDist[r.status] || 0) + 1;
  }

  return {
    action: "rev_track",
    query: query || "all",
    total_revisions: revisions.length,
    documents: docSummaries,
    summary: {
      unique_documents: Object.keys(groups).length,
      status_distribution: statusDist,
      pending_review: revisions.filter((r) => r.status === "pending_review").length,
      drafts: revisions.filter((r) => r.status === "draft").length,
      active_released: revisions.filter((r) => r.status === "released").length,
    },
  };
}

function revEffectivity(params: Record<string, unknown>): unknown {
  const asOfDate = (params.date as string) || "2024-11-01";
  const partNumber = (params.part_number as string) || (params.partNumber as string) || "";

  let released = getActiveRevisions();
  if (partNumber) {
    released = released.filter((r) => r.part_number === partNumber);
  }

  const effectivityAnalysis = released.map((r) => {
    const effectiveDate = r.effective_date ? new Date(r.effective_date) : null;
    const isEffective = effectiveDate ? effectiveDate <= new Date(asOfDate) : false;
    const daysEffective = effectiveDate ? Math.round((new Date(asOfDate).getTime() - effectiveDate.getTime()) / 86400000) : 0;

    // Check for upcoming supersedure
    const pendingReplacement = REVISION_DATABASE.find(
      (pr) => pr.part_number === r.part_number && pr.doc_type === r.doc_type && pr.status === "pending_review"
    );

    return {
      doc_id: r.doc_id,
      title: r.title,
      part_number: r.part_number,
      revision: r.revision,
      effective_date: r.effective_date,
      is_currently_effective: isEffective,
      days_effective: daysEffective,
      author: r.author,
      page_count: r.page_count,
      pending_replacement: pendingReplacement ? pendingReplacement.doc_id : null,
    };
  });

  // Date-window analysis: which docs become effective soon
  const upcomingEffective = REVISION_DATABASE.filter((r) => {
    if (!r.effective_date || r.status !== "released") return false;
    const eff = new Date(r.effective_date);
    const asOf = new Date(asOfDate);
    return eff > asOf && eff <= new Date(asOf.getTime() + 30 * 86400000);
  });

  return {
    action: "rev_effectivity",
    as_of_date: asOfDate,
    active_documents: effectivityAnalysis,
    summary: {
      total_effective: effectivityAnalysis.filter((e) => e.is_currently_effective).length,
      not_yet_effective: effectivityAnalysis.filter((e) => !e.is_currently_effective).length,
      avg_days_effective: Math.round(effectivityAnalysis.reduce((s, e) => s + e.days_effective, 0) / Math.max(effectivityAnalysis.length, 1)),
      pending_replacements: effectivityAnalysis.filter((e) => e.pending_replacement).length,
      upcoming_30days: upcomingEffective.length,
    },
  };
}

function revSupersede(params: Record<string, unknown>): unknown {
  const docId = (params.doc_id as string) || (params.docId as string) || "DWG-SFT-2001-R5";

  const chain = getSupersedureChain(docId);
  if (chain.length === 0) {
    return { action: "rev_supersede", error: `Document ${docId} not found`, available: [...new Set(REVISION_DATABASE.map((r) => r.doc_id))] };
  }

  const chainAnalysis = chain.map((r, idx) => ({
    position: idx + 1,
    doc_id: r.doc_id,
    revision: r.revision,
    status: r.status,
    author: r.author,
    created_date: r.created_date,
    effective_date: r.effective_date,
    superseded_date: r.superseded_date,
    superseded_by: r.superseded_by,
    change_summary: r.change_summary,
    ecn_reference: r.ecn_reference,
    is_current: r.status === "released",
  }));

  // Time analysis
  const revisionIntervals: number[] = [];
  for (let i = 1; i < chain.length; i++) {
    const prev = new Date(chain[i - 1].created_date);
    const curr = new Date(chain[i].created_date);
    revisionIntervals.push(Math.round((curr.getTime() - prev.getTime()) / 86400000));
  }

  const currentRev = chain.find((r) => r.status === "released");
  const totalLifespan = chain.length > 1
    ? Math.round((new Date(chain[chain.length - 1].created_date).getTime() - new Date(chain[0].created_date).getTime()) / 86400000)
    : 0;

  return {
    action: "rev_supersede",
    doc_id: docId,
    chain_length: chain.length,
    chain: chainAnalysis,
    analysis: {
      total_revisions: chain.length,
      current_revision: currentRev?.doc_id || "none active",
      total_lifespan_days: totalLifespan,
      avg_revision_interval_days: revisionIntervals.length > 0
        ? Math.round(revisionIntervals.reduce((a, b) => a + b, 0) / revisionIntervals.length)
        : 0,
      shortest_interval_days: revisionIntervals.length > 0 ? Math.min(...revisionIntervals) : 0,
      longest_interval_days: revisionIntervals.length > 0 ? Math.max(...revisionIntervals) : 0,
      ecn_driven_changes: chain.filter((r) => r.ecn_reference).length,
    },
  };
}

function revAudit(params: Record<string, unknown>): unknown {
  const docId = (params.doc_id as string) || (params.docId as string) || "";
  const user = (params.user as string) || "";
  const actionFilter = (params.action_type as string) || "";

  let entries = AUDIT_TRAIL;
  if (docId) entries = entries.filter((e) => e.doc_id === docId);
  if (user) entries = entries.filter((e) => e.user.toLowerCase().includes(user.toLowerCase()));
  if (actionFilter) entries = entries.filter((e) => e.action === actionFilter);

  // Activity by user
  const userActivity: Record<string, number> = {};
  for (const e of entries) {
    userActivity[e.user] = (userActivity[e.user] || 0) + 1;
  }

  // Activity by action type
  const actionDist: Record<string, number> = {};
  for (const e of entries) {
    actionDist[e.action] = (actionDist[e.action] || 0) + 1;
  }

  // Activity by department
  const deptDist: Record<string, number> = {};
  for (const e of entries) {
    deptDist[e.department] = (deptDist[e.department] || 0) + 1;
  }

  // Timeline (sorted)
  const timeline = [...entries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Compliance check: verify approval chain integrity
  const complianceIssues: string[] = [];
  const released = REVISION_DATABASE.filter((r) => r.status === "released");
  for (const doc of released) {
    const docAudit = AUDIT_TRAIL.filter((e) => e.doc_id === doc.doc_id);
    const hasReview = docAudit.some((e) => e.action === "reviewed");
    const hasApproval = docAudit.some((e) => e.action === "approved");
    const hasRelease = docAudit.some((e) => e.action === "released");
    if (!hasReview) complianceIssues.push(`${doc.doc_id}: Missing review record`);
    if (!hasApproval) complianceIssues.push(`${doc.doc_id}: Missing approval record`);
    if (!hasRelease) complianceIssues.push(`${doc.doc_id}: Missing release record`);
  }

  return {
    action: "rev_audit",
    filter: { doc_id: docId || "all", user: user || "all", action_type: actionFilter || "all" },
    total_entries: entries.length,
    audit_trail: timeline.map((e) => ({
      audit_id: e.audit_id,
      doc_id: e.doc_id,
      action: e.action,
      user: e.user,
      timestamp: e.timestamp,
      details: e.details,
      department: e.department,
    })),
    analytics: {
      user_activity: userActivity,
      action_distribution: actionDist,
      department_distribution: deptDist,
      most_active_user: Object.entries(userActivity).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A",
      most_common_action: Object.entries(actionDist).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A",
    },
    compliance: {
      issues_found: complianceIssues.length,
      issues: complianceIssues,
      status: complianceIssues.length === 0 ? "COMPLIANT" : "NEEDS_REVIEW",
    },
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export function executeRevisionControlAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "rev_track":
      return revTrack(params);
    case "rev_effectivity":
      return revEffectivity(params);
    case "rev_supersede":
      return revSupersede(params);
    case "rev_audit":
      return revAudit(params);
    default:
      return { error: `Unknown revision control action: ${action}` };
  }
}
