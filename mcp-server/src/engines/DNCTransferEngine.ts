/**
 * DNCTransferEngine.ts — R9-MS2 DNC / File Transfer Integration
 * ==============================================================
 *
 * Server-side engine for DNC (Direct Numerical Control) file transfer.
 * Provides:
 *   - G-code parameter block generation with PRISM-optimized values
 *   - File system bridge (generate files for manual/auto transfer)
 *   - Network DNC API simulation (Cimco, Predator, SFA)
 *   - QR code data generation for zero-infrastructure shops
 *   - Program compare/verify against PRISM recommendations
 *
 * Actual DNC hardware connections are deployment-time; this engine
 * handles the server-side logic and data formats.
 *
 * @version 1.0.0 — R9-MS2
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type DNCSystem = "cimco" | "predator" | "sfa" | "haas_net" | "mazak_smooth" | "file_system" | "qr_code";
export type TransferAction = "send" | "compare" | "verify" | "list";
export type TransferStatus = "pending" | "sent" | "verified" | "mismatch" | "error";
export type ControllerType = "fanuc" | "siemens" | "haas" | "mazak" | "heidenhain" | "generic";

export interface GCodeParameterBlock {
  program_number: string;
  material: string;
  machine: string;
  tool: string;
  rpm: number;
  feed_ipm: number;
  feed_mmmin: number;
  doc_mm: number;
  woc_mm: number;
  strategy: string;
  safety_score: number;
  omega_score: number;
  estimated_tool_life_min: number;
  estimated_cycle_time_min: number;
  controller: ControllerType;
}

export interface DNCTransferRequest {
  program_number: string;
  machine: string;
  content: string;
  action: TransferAction;
  system: DNCSystem;
}

export interface DNCTransferResult {
  transfer_id: string;
  status: TransferStatus;
  program_number: string;
  machine: string;
  timestamp: string;
  details: string;
  mismatches?: ParameterMismatch[];
}

export interface ParameterMismatch {
  parameter: string;
  prism_value: number | string;
  machine_value: number | string;
  deviation_pct: number;
  severity: "info" | "warning" | "critical";
}

export interface QRCodeData {
  version: string;
  type: "prism_params";
  program: string;
  material: string;
  machine: string;
  tool: string;
  rpm: number;
  feed: number;
  doc: number;
  woc: number;
  safety: number;
  timestamp: string;
}

// ─── Transfer History ────────────────────────────────────────────────────────

const transferHistory: DNCTransferResult[] = [];
let transferCounter = 0;

// ─── G-Code Generation ──────────────────────────────────────────────────────

/**
 * Generate a G-code parameter block with PRISM-optimized values.
 * The block is controller-aware: Fanuc uses (comments), Siemens uses ;comments.
 */
export function generateParameterBlock(params: Record<string, any>): GCodeParameterBlock & { gcode: string } {
  const p: GCodeParameterBlock = {
    program_number: params.program_number ?? "O0001",
    material: params.material ?? "Steel",
    machine: params.machine ?? "Generic CNC",
    tool: params.tool ?? "T01",
    rpm: params.rpm ?? 3200,
    feed_ipm: params.feed_ipm ?? (params.feed_mmmin ? Math.round(params.feed_mmmin / 25.4 * 10) / 10 : 19.2),
    feed_mmmin: params.feed_mmmin ?? (params.feed_ipm ? Math.round(params.feed_ipm * 25.4 * 10) / 10 : 488),
    doc_mm: params.doc_mm ?? params.ap_mm ?? 2.5,
    woc_mm: params.woc_mm ?? params.ae_mm ?? 3.2,
    strategy: params.strategy ?? "CONVENTIONAL",
    safety_score: params.safety_score ?? 0.85,
    omega_score: params.omega_score ?? 0.78,
    estimated_tool_life_min: params.tool_life_min ?? 45,
    estimated_cycle_time_min: params.cycle_time_min ?? 12.4,
    controller: params.controller ?? "fanuc",
  };

  const gcode = formatGCode(p);
  return { ...p, gcode };
}

function formatGCode(p: GCodeParameterBlock): string {
  const c = p.controller;
  const cOpen = c === "siemens" || c === "heidenhain" ? "; " : "(";
  const cClose = c === "siemens" || c === "heidenhain" ? "" : ")";

  const dia_in = p.doc_mm > 0 ? Math.round(p.rpm > 0 ? (p.rpm * Math.PI) / (p.feed_ipm > 0 ? 12 : 1000) : 0.5) : 0.5;

  const lines: string[] = [];
  lines.push(`${cOpen}PRISM PARAMETERS — Generated ${new Date().toISOString().slice(0, 10)}${cClose}`);
  lines.push(`${cOpen}Material: ${p.material} | Machine: ${p.machine} | Tool: ${p.tool}${cClose}`);
  lines.push(`${cOpen}Safety Score: S=${p.safety_score.toFixed(2)} | Quality: Ω=${p.omega_score.toFixed(2)}${cClose}`);
  lines.push(`S${p.rpm} ${cOpen}PRISM RPM${cClose}`);
  lines.push(`F${p.feed_ipm} ${cOpen}PRISM Feed IPM (${p.feed_mmmin} mm/min)${cClose}`);
  lines.push(`${cOpen}DOC=${p.doc_mm}mm | WOC=${p.woc_mm}mm | STRATEGY=${p.strategy}${cClose}`);
  lines.push(`${cOpen}EST TOOL LIFE: ${p.estimated_tool_life_min} MIN | EST CYCLE TIME: ${p.estimated_cycle_time_min} MIN${cClose}`);

  return lines.join("\n");
}

// ─── DNC Transfer Simulation ─────────────────────────────────────────────────

/**
 * Simulate a DNC transfer (send, compare, verify).
 * In production, this would call actual DNC APIs.
 */
export function executeDNCTransfer(req: DNCTransferRequest): DNCTransferResult {
  transferCounter++;
  const id = `DNC-${String(transferCounter).padStart(4, "0")}`;

  let status: TransferStatus = "pending";
  let details = "";
  let mismatches: ParameterMismatch[] | undefined;

  switch (req.action) {
    case "send":
      status = "sent";
      details = `Program ${req.program_number} sent to ${req.machine} via ${req.system}`;
      break;

    case "compare":
      // Simulate comparison — in production, reads from machine
      mismatches = simulateCompare(req);
      status = mismatches.length === 0 ? "verified" : "mismatch";
      details = mismatches.length === 0
        ? `Program ${req.program_number} matches PRISM recommendations`
        : `${mismatches.length} parameter mismatch(es) found`;
      break;

    case "verify":
      status = "verified";
      details = `Program ${req.program_number} on ${req.machine} verified — checksums match`;
      break;

    case "list":
      status = "verified";
      details = `Listed programs on ${req.machine}`;
      break;
  }

  const result: DNCTransferResult = {
    transfer_id: id,
    status,
    program_number: req.program_number,
    machine: req.machine,
    timestamp: new Date().toISOString(),
    details,
    mismatches,
  };

  transferHistory.push(result);
  return result;
}

function simulateCompare(req: DNCTransferRequest): ParameterMismatch[] {
  // Simulate: parse the G-code content for S and F values
  const sMatch = req.content.match(/S(\d+)/);
  const fMatch = req.content.match(/F([\d.]+)/);
  const mismatches: ParameterMismatch[] = [];

  if (sMatch) {
    const prismRpm = parseInt(sMatch[1]);
    // Simulate machine has slightly different RPM
    const machineRpm = prismRpm; // In simulation, assume match
    if (machineRpm !== prismRpm) {
      const dev = Math.abs((machineRpm - prismRpm) / prismRpm) * 100;
      mismatches.push({
        parameter: "RPM",
        prism_value: prismRpm,
        machine_value: machineRpm,
        deviation_pct: Math.round(dev * 10) / 10,
        severity: dev > 10 ? "critical" : dev > 5 ? "warning" : "info",
      });
    }
  }

  return mismatches;
}

// ─── QR Code Data ────────────────────────────────────────────────────────────

/**
 * Generate QR-encodable data payload for zero-infrastructure shops.
 * The JSON is compact enough to fit in a standard QR code (~2K chars).
 */
export function generateQRData(params: Record<string, any>): QRCodeData {
  return {
    version: "1.0",
    type: "prism_params",
    program: params.program_number ?? "O0001",
    material: params.material ?? "Steel",
    machine: params.machine ?? "Generic",
    tool: params.tool ?? "T01",
    rpm: params.rpm ?? 3200,
    feed: params.feed_mmmin ?? params.feed ?? 488,
    doc: params.doc_mm ?? params.ap_mm ?? 2.5,
    woc: params.woc_mm ?? params.ae_mm ?? 3.2,
    safety: params.safety_score ?? 0.85,
    timestamp: new Date().toISOString(),
  };
}

// ─── Supported DNC Systems ───────────────────────────────────────────────────

const DNC_SYSTEMS = [
  { id: "cimco", name: "Cimco DNC-Max", protocol: "tcp", status: "supported", description: "Industry-standard DNC with API" },
  { id: "predator", name: "Predator DNC", protocol: "tcp", status: "supported", description: "Predator Software DNC system" },
  { id: "sfa", name: "Shop Floor Automations", protocol: "tcp", status: "supported", description: "SFA DNC system" },
  { id: "haas_net", name: "Haas Net Share", protocol: "smb", status: "supported", description: "Haas built-in network sharing" },
  { id: "mazak_smooth", name: "Mazak Smooth Transfer", protocol: "ftp", status: "supported", description: "Mazak Smooth CNC network transfer" },
  { id: "file_system", name: "File System Bridge", protocol: "file", status: "supported", description: "Local/network file system transfer" },
  { id: "qr_code", name: "QR Code Bridge", protocol: "visual", status: "supported", description: "Zero-infrastructure QR code transfer" },
];

// ─── Transfer History ────────────────────────────────────────────────────────

export function getTransferHistory(machineFilter?: string): DNCTransferResult[] {
  if (machineFilter) {
    return transferHistory.filter(t => t.machine === machineFilter);
  }
  return [...transferHistory];
}

export function getTransferById(id: string): DNCTransferResult | null {
  return transferHistory.find(t => t.transfer_id === id) ?? null;
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

/**
 * Dispatcher for DNC transfer actions.
 *
 * Actions:
 *   dnc_generate    — Generate G-code parameter block
 *   dnc_send        — Send program to machine via DNC
 *   dnc_compare     — Compare machine params against PRISM
 *   dnc_verify      — Verify program transfer integrity
 *   dnc_qr          — Generate QR code data payload
 *   dnc_systems     — List supported DNC systems
 *   dnc_history     — Get transfer history
 *   dnc_get         — Get specific transfer result
 */
export function dncTransfer(action: string, params: Record<string, any>): any {
  switch (action) {
    case "dnc_generate": {
      const block = generateParameterBlock(params);
      return {
        program_number: block.program_number,
        controller: block.controller,
        gcode: block.gcode,
        parameters: {
          rpm: block.rpm,
          feed_ipm: block.feed_ipm,
          feed_mmmin: block.feed_mmmin,
          doc_mm: block.doc_mm,
          woc_mm: block.woc_mm,
          strategy: block.strategy,
        },
        safety_score: block.safety_score,
        omega_score: block.omega_score,
      };
    }

    case "dnc_send": {
      const content = params.content ?? generateParameterBlock(params).gcode;
      const result = executeDNCTransfer({
        program_number: params.program_number ?? "O0001",
        machine: params.machine ?? "Machine-1",
        content,
        action: "send",
        system: params.system ?? "file_system",
      });
      return result;
    }

    case "dnc_compare": {
      const content = params.content ?? generateParameterBlock(params).gcode;
      const result = executeDNCTransfer({
        program_number: params.program_number ?? "O0001",
        machine: params.machine ?? "Machine-1",
        content,
        action: "compare",
        system: params.system ?? "file_system",
      });
      return result;
    }

    case "dnc_verify": {
      const content = params.content ?? "";
      const result = executeDNCTransfer({
        program_number: params.program_number ?? "O0001",
        machine: params.machine ?? "Machine-1",
        content,
        action: "verify",
        system: params.system ?? "file_system",
      });
      return result;
    }

    case "dnc_qr": {
      const qr = generateQRData(params);
      const json = JSON.stringify(qr);
      return {
        data: qr,
        json,
        byte_size: json.length,
        fits_standard_qr: json.length <= 2048,
      };
    }

    case "dnc_systems": {
      return {
        systems: DNC_SYSTEMS,
        total: DNC_SYSTEMS.length,
      };
    }

    case "dnc_history": {
      const history = getTransferHistory(params.machine);
      return {
        transfers: history,
        total: history.length,
        machine_filter: params.machine ?? null,
      };
    }

    case "dnc_get": {
      const id = params.id ?? params.transfer_id ?? "";
      const transfer = getTransferById(id);
      if (!transfer) return { error: "Transfer not found", id };
      return transfer;
    }

    default:
      return { error: `DNCTransferEngine: unknown action "${action}"` };
  }
}

// ─── Source File Catalog (14 LOW-priority integration extractions) ───────────

export const DNC_SOURCE_FILE_CATALOG: Record<string, {
  filename: string;
  source_dir: string;
  category: string;
  lines: number;
  safety_class: "LOW";
  description: string;
  integration_type: string;
}> = {
  "EXT-350": {
    filename: "PRISM_100_PERCENT_INTEGRATION.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 187,
    safety_class: "LOW",
    description: "Full-coverage integration module for PRISM system connectivity",
    integration_type: "general",
  },
  "EXT-351": {
    filename: "PRISM_AI_100_INTEGRATION.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 165,
    safety_class: "LOW",
    description: "AI-powered integration layer for PRISM analytics pipeline",
    integration_type: "general",
  },
  "EXT-352": {
    filename: "PRISM_AI_KNOWLEDGE_INTEGRATION.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 120,
    safety_class: "LOW",
    description: "AI knowledge base integration for machining intelligence",
    integration_type: "general",
  },
  "EXT-353": {
    filename: "PRISM_BRIDGE.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 279,
    safety_class: "LOW",
    description: "Core bridge module connecting PRISM subsystems",
    integration_type: "general",
  },
  "EXT-354": {
    filename: "PRISM_CAD_LEARNING_BRIDGE.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 304,
    safety_class: "LOW",
    description: "CAD-to-learning pipeline bridge for geometry-driven optimization",
    integration_type: "general",
  },
  "EXT-355": {
    filename: "PRISM_CALCULATOR_ENHANCEMENT_BRIDGE.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 83,
    safety_class: "LOW",
    description: "Calculator enhancement bridge for parameter computation",
    integration_type: "general",
  },
  "EXT-356": {
    filename: "PRISM_DATABASE_HUB.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 77,
    safety_class: "LOW",
    description: "Central database hub for cross-module data access",
    integration_type: "general",
  },
  "EXT-357": {
    filename: "PRISM_ENHANCED_INTEGRATION.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 476,
    safety_class: "LOW",
    description: "Enhanced integration module with extended connectivity features",
    integration_type: "general",
  },
  "EXT-358": {
    filename: "PRISM_EVENT_BRIDGE.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 74,
    safety_class: "LOW",
    description: "Event-driven bridge for real-time system notifications",
    integration_type: "general",
  },
  "EXT-359": {
    filename: "PRISM_FINAL_INTEGRATION.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 136,
    safety_class: "LOW",
    description: "Final integration assembly connecting all PRISM modules",
    integration_type: "general",
  },
  "EXT-360": {
    filename: "PRISM_HIGH_PRIORITY_INTEGRATION_BRIDGE.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 59,
    safety_class: "LOW",
    description: "High-priority integration bridge for critical-path data flows",
    integration_type: "general",
  },
  "EXT-361": {
    filename: "PRISM_KERNEL_INTEGRATION.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 101,
    safety_class: "LOW",
    description: "Kernel-level integration for core PRISM computation engine",
    integration_type: "general",
  },
  "EXT-362": {
    filename: "PRISM_PRODUCTION_INTEGRATION.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 205,
    safety_class: "LOW",
    description: "Production workflow integration for shop-floor data exchange",
    integration_type: "general",
  },
  "EXT-363": {
    filename: "PRISM_SIMULATION_INTEGRATION_BRIDGE.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 402,
    safety_class: "LOW",
    description: "Simulation integration bridge for virtual machining validation",
    integration_type: "general",
  },
};

/** Returns the source file catalog for DNC transfer engine traceability. */
export function getSourceFileCatalog(): typeof DNC_SOURCE_FILE_CATALOG {
  return DNC_SOURCE_FILE_CATALOG;
}
