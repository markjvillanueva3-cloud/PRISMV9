/**
 * CrossProcessPostBridge — unified G-code emission across mill, lathe, and
 * wire-EDM master post processors.
 *
 * Each process has its own canonical master post engine with its own
 * operation type and config shape:
 *   - mill (Hurco VMX24 / WinMax V11)   → HurcoV11MillMasterPostEngine
 *   - lathe (Okuma LB250II / OSP-P300L) → OkumaB250LatheMasterPostEngine
 *   - wedm (Mitsubishi MV1200R / M700V) → MitsubishiMV1200RWireEDMMasterPostEngine
 *
 * Caller hands a single normalized request — bridge routes to the right
 * engine by (process, machine), passes operations + config through opaquely,
 * and unifies the output shape behind a discriminated `process` tag the
 * caller switches on. Each engine's per-process extras (estimated_cycle_min
 * for mill, total_time for wedm, etc.) flow through under `extras`.
 *
 * Two pure static entry points:
 *   1. emit(req) — process-routed G-code emission
 *   2. listProcessSupport() — capability matrix per process+machine
 *
 * Pure dry-run: no live machine calls. Operator copies the emitted gcode[]
 * into their CAM/DNC system after physics_checks pass.
 *
 * @engine CrossProcessPostBridge
 * @milestone XPROC-POST-01
 * @see HurcoV11MillMasterPostEngine
 * @see OkumaB250LatheMasterPostEngine
 * @see MitsubishiMV1200RWireEDMMasterPostEngine
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export const POST_SUPPORTED_PROCESSES = ["mill", "lathe", "wedm"] as const;
export type PostProcessId = (typeof POST_SUPPORTED_PROCESSES)[number];

/**
 * Machine identifier registry. Keys are case-insensitive — caller may pass
 * "hurco_vmx24" or "HURCO_VMX24" interchangeably. Aliases map shop-floor
 * shorthand ("hurco") to the canonical machine id.
 */
const MACHINE_REGISTRY: Readonly<Record<string, { process: PostProcessId; engine: string }>> =
  Object.freeze({
    // Mill
    hurco_vmx24: { process: "mill", engine: "HurcoV11MillMasterPostEngine" },
    hurco_v11: { process: "mill", engine: "HurcoV11MillMasterPostEngine" },
    hurco: { process: "mill", engine: "HurcoV11MillMasterPostEngine" },
    // Lathe
    okuma_lb250: { process: "lathe", engine: "OkumaB250LatheMasterPostEngine" },
    okuma_b250: { process: "lathe", engine: "OkumaB250LatheMasterPostEngine" },
    okuma: { process: "lathe", engine: "OkumaB250LatheMasterPostEngine" },
    // Wire EDM
    mitsubishi_mv1200r: { process: "wedm", engine: "MitsubishiMV1200RWireEDMMasterPostEngine" },
    mitsubishi: { process: "wedm", engine: "MitsubishiMV1200RWireEDMMasterPostEngine" },
  });

// ============================================================================
// TYPES
// ============================================================================

export interface CrossProcessPostRequest {
  process: PostProcessId;
  machine: string;
  /** Process-specific operations array — passed through to the underlying engine.
   *  - mill: MillOperation[]
   *  - lathe: TurningOperation[]
   *  - wedm: WireEDMOperation[]
   */
  operations: ReadonlyArray<Record<string, unknown>>;
  /** Optional process-specific config override — passed through opaquely. */
  config?: Record<string, unknown>;
}

export interface CrossProcessPostResult {
  process: PostProcessId;
  machine: string;
  source_engine: string;
  /** Common: emitted G-code lines (operator pastes into DNC/CAM) */
  gcode: string[];
  /** Common: warnings surfaced by the engine (physics caps, missing config, etc.) */
  warnings: string[];
  /** Common: physics safety checks executed during emission */
  physics_checks: Array<{
    line: number;
    check: string;
    passed: boolean;
    value?: number;
    limit?: number;
  }>;
  /** Common: tribal tips applied by the engine for the target machine */
  tribal_tips_applied: string[];
  /** Per-process extras (estimated_cycle_min for mill, total_wire_consumed for wedm, etc.) */
  extras: Record<string, unknown>;
}

export interface PostMachineCapability {
  machine_id: string;
  process: PostProcessId;
  source_engine: string;
}

export interface PostCapabilityMatrix {
  processes: readonly PostProcessId[];
  machines: PostMachineCapability[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class CrossProcessPostBridge {
  /**
   * Emit G-code for the given process + machine + operations + config.
   *
   * Throws on:
   *   - unsupported `process` id
   *   - unknown `machine` id (not in MACHINE_REGISTRY, case-insensitive)
   *   - process/machine mismatch (process is "mill" but machine is "okuma_b250")
   *   - operations is missing or non-array
   *   - operations is empty (every supported engine requires ≥1 operation)
   *
   * @param req — normalized cross-process request
   * @returns CrossProcessPostResult tagged with `process` for downstream switch
   */
  static async emit(req: CrossProcessPostRequest): Promise<CrossProcessPostResult> {
    if (!req.process || !(POST_SUPPORTED_PROCESSES as readonly string[]).includes(req.process)) {
      throw new Error(
        `CrossProcessPostBridge.emit: unsupported process "${String(req.process)}" (supported: ${POST_SUPPORTED_PROCESSES.join(", ")})`,
      );
    }
    if (!req.machine || typeof req.machine !== "string") {
      throw new Error("CrossProcessPostBridge.emit: machine required (non-empty string)");
    }
    const machineKey = req.machine.toLowerCase().trim();
    const machineEntry = MACHINE_REGISTRY[machineKey];
    if (!machineEntry) {
      throw new Error(
        `CrossProcessPostBridge.emit: unknown machine "${req.machine}" (supported: ${Object.keys(MACHINE_REGISTRY).join(", ")})`,
      );
    }
    if (machineEntry.process !== req.process) {
      throw new Error(
        `CrossProcessPostBridge.emit: machine "${req.machine}" is a ${machineEntry.process} machine but process="${req.process}" was requested`,
      );
    }
    if (!Array.isArray(req.operations)) {
      throw new Error("CrossProcessPostBridge.emit: operations must be an array");
    }
    if (req.operations.length === 0) {
      throw new Error("CrossProcessPostBridge.emit: operations array must not be empty");
    }

    const config = req.config ?? {};

    if (req.process === "mill") {
      const { HurcoV11MillMasterPostEngine } = await import(
        "./HurcoV11MillMasterPostEngine.js"
      );
      const engine = new HurcoV11MillMasterPostEngine();
      const out = engine.generateProgram(
        req.operations as Parameters<typeof engine.generateProgram>[0],
        config as Parameters<typeof engine.generateProgram>[1],
      );
      return {
        process: "mill",
        machine: req.machine,
        source_engine: machineEntry.engine,
        gcode: out.gcode,
        warnings: out.warnings,
        physics_checks: out.physics_checks,
        tribal_tips_applied: out.tribal_tips_applied,
        extras: {
          program_number: out.program_number,
          total_lines: out.total_lines,
          estimated_cycle_min: out.estimated_cycle_min,
          tools_used: out.tools_used,
        },
      };
    }

    if (req.process === "lathe") {
      const { OkumaB250LatheMasterPostEngine } = await import(
        "./OkumaB250LatheMasterPostEngine.js"
      );
      const engine = new OkumaB250LatheMasterPostEngine();
      const out = engine.generateProgram(
        req.operations as Parameters<typeof engine.generateProgram>[0],
        config as Parameters<typeof engine.generateProgram>[1],
      );
      return {
        process: "lathe",
        machine: req.machine,
        source_engine: machineEntry.engine,
        gcode: out.gcode,
        warnings: out.warnings,
        physics_checks: out.physics_checks,
        tribal_tips_applied: out.tribal_tips_applied,
        extras: extractLatheExtras(out as unknown as Record<string, unknown>),
      };
    }

    // wedm
    const { MitsubishiMV1200RWireEDMMasterPostEngine } = await import(
      "./MitsubishiMV1200RWireEDMMasterPostEngine.js"
    );
    const wedmEngine = new MitsubishiMV1200RWireEDMMasterPostEngine();
    const out = wedmEngine.generateProgram(
      req.operations as Parameters<typeof wedmEngine.generateProgram>[0],
      config as Parameters<typeof wedmEngine.generateProgram>[1],
    );
    return {
      process: "wedm",
      machine: req.machine,
      source_engine: machineEntry.engine,
      gcode: out.gcode,
      warnings: out.warnings,
      physics_checks: out.physics_checks,
      tribal_tips_applied: out.tribal_tips_applied,
      extras: extractWEDMExtras(out as unknown as Record<string, unknown>),
    };
  }

  /**
   * Capability matrix — what processes + machines are supported, mapped
   * to the engine that handles each.
   */
  static listProcessSupport(): PostCapabilityMatrix {
    return {
      processes: POST_SUPPORTED_PROCESSES,
      machines: Object.entries(MACHINE_REGISTRY).map(([machineId, entry]) => ({
        machine_id: machineId,
        process: entry.process,
        source_engine: entry.engine,
      })),
    };
  }
}

// ============================================================================
// HELPERS (module-private)
// ============================================================================

/**
 * Pull lathe-specific extras from the OkumaLathePostOutput. Engine output
 * shape is per-engine private; we surface the documented public fields and
 * fall back to undefined silently for fields the engine version may not yet
 * emit.
 */
function extractLatheExtras(out: Record<string, unknown>): Record<string, unknown> {
  return {
    program_number: out.program_number,
    total_lines: out.total_lines,
    estimated_cycle_min: out.estimated_cycle_min,
    tools_used: out.tools_used,
  };
}

/**
 * Pull WEDM-specific extras from the WireEDMPostOutput.
 */
function extractWEDMExtras(out: Record<string, unknown>): Record<string, unknown> {
  return {
    program_number: out.program_number,
    total_lines: out.total_lines,
    total_wire_consumed_m: out.total_wire_consumed_m,
    rough_time_min: out.rough_time_min,
    total_time_min: out.total_time_min,
    skim_powers: out.skim_powers,
  };
}
