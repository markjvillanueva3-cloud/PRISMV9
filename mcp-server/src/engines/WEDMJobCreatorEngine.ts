/**
 * WEDMJobCreatorEngine — Program → Job Packet bridge
 *
 * WEDM-ERP-MS0 U-WEDM-ERP02
 *
 * Creates a JobTrackingPacket from a WEDMProgramResult so a generated
 * program can enter the shop's standard job lifecycle. Includes:
 *   - WEDM-specific department flow (Intake → CAD Review → CAM → Setup/Threading
 *     → Rough Cut → Skim passes → QC → Ship), one operation per pass
 *   - NC program text attachment
 *   - Optional quote reference (so actuals can later be reconciled)
 *   - QR sticker payload encoding job/material/thickness/machine
 *
 * Does NOT own job state — JobLifecycleEngine transitions statuses.
 * Does NOT compute costs — WEDMQuoteBridgeEngine + WEDMJobCostEngine handle that.
 */

import type { WEDMProgramResult, PassSummary } from "./WEDMPrintToProgramEngine.js";
import type { JobTrackingPacket, PacketDepartment, PacketOperation } from "./OperatingSystemJobPacketEngine.js";
import type { Quote } from "./QuoteEngine.js";

// ============================================================================
// WEDM-SPECIFIC DEPARTMENT FLOW
// ============================================================================

interface WEDMDepartmentSpec {
  id: string;
  label: string;
  owner: string;
  note: string;
}

const WEDM_DEPARTMENTS: WEDMDepartmentSpec[] = [
  { id: "intake", label: "Intake", owner: "Planning",
    note: "Register WEDM job, verify stock & material cert, print QR sticker." },
  { id: "cad", label: "CAD/DXF Review", owner: "Engineering",
    note: "Confirm DXF profile, start holes, tolerances; check for interior pockets." },
  { id: "cam", label: "CAM/Program", owner: "Programming",
    note: "Validate generated program, verify offsets and E-codes, simulate." },
  { id: "setup", label: "Setup/Threading", owner: "Production",
    note: "Fixture, datum, wire threading, first start-hole verification." },
  { id: "rough", label: "Rough Cut", owner: "Production",
    note: "First pass with largest offset. Monitor for wire breaks." },
  { id: "skim1", label: "Skim 1", owner: "Production",
    note: "Second pass — mid offset, energy reduced per Toenshoff cascade." },
  { id: "skim2", label: "Skim 2", owner: "Production",
    note: "Third pass — fine offset." },
  { id: "skim3", label: "Skim 3", owner: "Production",
    note: "Final skim — tightest offset for target Ra." },
  { id: "qc", label: "QC", owner: "Quality",
    note: "Final dimensional inspection, Ra surface finish verification." },
  { id: "ship", label: "Ship", owner: "Shipping",
    note: "Packout and customer release." },
];

// ============================================================================
// INPUTS
// ============================================================================

export interface JobOptions {
  customer?: string;
  part_number?: string;
  part_name?: string;
  quantity?: number;
  due_date?: string;
  priority?: "standard" | "rush" | "emergency";
  machine_id?: string;
  operator?: string;
  notes?: string;
}

export interface WEDMJobPacket extends JobTrackingPacket {
  /** NC program text attached to packet */
  programText: string;
  /** Program metadata */
  programMeta: {
    controller: string;
    line_count: number;
    profiles_cut: number;
    passes_per_profile: number;
    estimated_time_min: number;
    predicted_ra_um: number;
    wire_consumption_m: number;
  };
  /** Setup sheet snapshot for operator reference */
  setupSheet: WEDMProgramResult["setup_sheet"];
  /** Linked quote reference (for actual-vs-estimated) */
  quoteRef?: {
    quote_number: string;
    unit_price: number;
    estimated_cost_usd: number;
  };
  /** WEDM-specific flag */
  jobType: "wedm";
}

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMJobCreatorEngine {
  /**
   * Build a WEDMJobPacket from a generated program. The packet has one
   * operation per pass (rough + skim_1..skim_N), one department per stage
   * in the WEDM flow, and carries NC text ready for machine download.
   */
  static createJob(
    program: WEDMProgramResult,
    options: JobOptions = {},
    quote?: Quote,
  ): WEDMJobPacket {
    if (!program) throw new Error("WEDMJobCreatorEngine.createJob: program is required");
    if (!program.success) {
      // Still build a packet but flag it — lets the job enter the system for triage.
      // Do not silently swallow the error.
    }

    const quantity = Math.max(1, Math.floor(options.quantity ?? 1));
    const jobId = `WEDM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const customer = options.customer ?? "Internal";
    const partNumber = options.part_number ?? program.setup_sheet?.part_number ?? "UNASSIGNED";
    const partName = options.part_name ?? program.setup_sheet?.part_name ?? partNumber;
    const material = program.setup_sheet?.material ?? "unknown";
    const thickness_mm = program.setup_sheet?.thickness_mm ?? 0;
    const machineId = options.machine_id ?? program.controller ?? "wedm-unassigned";

    // Operations: one per pass
    const operations: PacketOperation[] = [];
    const perPassMinutes =
      program.estimated_time_min && program.passes_per_profile
        ? program.estimated_time_min / Math.max(1, program.passes_per_profile)
        : 15;

    (program.pass_details ?? []).forEach((pass: PassSummary, idx: number) => {
      const isRough = pass.pass_type === "rough" || idx === 0;
      const deptId = isRough ? "rough" : `skim${Math.min(3, idx)}`;
      operations.push({
        id: `${jobId}-pass-${pass.pass_number ?? idx + 1}`,
        code: isRough ? "OP10-ROUGH" : `OP${10 + idx}-SKIM${idx}`,
        label: isRough ? "Rough cut" : `Skim pass ${idx}`,
        department: deptId,
        estimatedMinutes: Math.max(5, Math.round(perPassMinutes)),
        cycleSeconds: Math.max(30, Math.round(perPassMinutes * 60)),
        quantityTarget: quantity,
        note: `Offset ${pass.offset_mm?.toFixed(3) ?? "?"}mm, Ra ${pass.expected_ra_um?.toFixed(2) ?? "?"}µm`,
      });
    });

    // Prepend setup/threading operation
    operations.unshift({
      id: `${jobId}-setup`,
      code: "OP00-SETUP",
      label: "Setup & wire threading",
      department: "setup",
      estimatedMinutes: 30,
      cycleSeconds: 0,
      quantityTarget: quantity,
      note: `Thread ${program.setup_sheet?.wire_type ?? "brass"} ⌀${program.setup_sheet?.wire_diameter_mm ?? 0.25}mm at start holes.`,
    });

    // Append QC + Ship operations
    operations.push({
      id: `${jobId}-qc`,
      code: "OP90-QC",
      label: "QC Inspection",
      department: "qc",
      estimatedMinutes: Math.max(15, Math.round(quantity * 5)),
      cycleSeconds: 0,
      quantityTarget: quantity,
      note: `Verify dimensions, Ra ≤ ${program.predicted_ra_um?.toFixed(2) ?? "3.0"}µm`,
    });
    operations.push({
      id: `${jobId}-ship`,
      code: "OP99-SHIP",
      label: "Packout & ship",
      department: "ship",
      estimatedMinutes: 15,
      cycleSeconds: 0,
      quantityTarget: quantity,
      note: "Cert packet and release to customer.",
    });

    // Departments — all start pending
    const departments: PacketDepartment[] = WEDM_DEPARTMENTS.map((d) => ({
      id: d.id,
      label: d.label,
      owner: d.owner,
      status: "pending" as const,
      note: d.note,
    }));
    // Mark intake as current
    if (departments.length > 0) departments[0].status = "current";

    // QR sticker payload encoding essentials for shop-floor scanners
    const qrPayload = JSON.stringify({
      job: jobId,
      part: partNumber,
      material,
      thick: thickness_mm,
      machine: machineId,
      qty: quantity,
      t: "wedm",
    });

    const packetNotes: string[] = [
      `WEDM program: ${program.controller}, ${program.line_count} lines, ${program.profiles_cut} profiles × ${program.passes_per_profile} passes`,
      `Predicted time: ${(program.estimated_time_min ?? 0).toFixed(1)} min, wire: n/a, Ra: ${(program.predicted_ra_um ?? 0).toFixed(2)}µm`,
    ];
    if (program.warnings && program.warnings.length > 0) {
      packetNotes.push(`⚠ ${program.warnings.length} warnings — review before release.`);
    }
    if (options.notes) packetNotes.push(options.notes);

    const packet: WEDMJobPacket = {
      jobId,
      jobName: partName,
      customer,
      partNumber,
      quantity,
      dueDate: options.due_date ?? "",
      material,
      priority: options.priority ?? "standard",
      qrPayload,
      stickerLabel: `${jobId} · ${partNumber} · ${material} · ${thickness_mm}mm · ${machineId}`,
      departments,
      operations,
      packetNotes,

      programText: program.program_text ?? "",
      programMeta: {
        controller: program.controller ?? "",
        line_count: program.line_count ?? 0,
        profiles_cut: program.profiles_cut ?? 0,
        passes_per_profile: program.passes_per_profile ?? 0,
        estimated_time_min: program.estimated_time_min ?? 0,
        predicted_ra_um: program.predicted_ra_um ?? 0,
        wire_consumption_m: 0, // not emitted by generator (needs machine wire-feed rate); 0 = not computed
      },
      setupSheet: program.setup_sheet,
      quoteRef: quote
        ? {
            quote_number: quote.quote_number,
            unit_price: quote.unit_price,
            estimated_cost_usd: quote.total_price,
          }
        : undefined,
      jobType: "wedm",
    };

    return packet;
  }

  /** List department ids (useful for clients building UI filters) */
  static departments(): string[] {
    return WEDM_DEPARTMENTS.map((d) => d.id);
  }

  /** Count total estimated minutes across all operations in a packet */
  static totalEstimatedMinutes(packet: WEDMJobPacket): number {
    return packet.operations.reduce((s, op) => s + (op.estimatedMinutes ?? 0), 0);
  }
}

export const wedmJobCreatorEngine = WEDMJobCreatorEngine;
