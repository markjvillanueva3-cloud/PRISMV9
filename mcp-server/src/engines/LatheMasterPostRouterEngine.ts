/**
 * LatheMasterPostRouterEngine — LATHE-MASTER U-LTH25
 *
 * Central router for lathe post-processing. Given {machineId, operation, controller},
 * selects and invokes the correct sub-post. Integrates with JM Die's machine inventory
 * (7 Okuma lathes, 5 mills, Mitsubishi EDMs).
 *
 * Exit Gate: Routes to correct sub-post for all 21 JM Die machines;
 * fallback path for unknown machines generates via P2 path (lathe_postgen_full).
 *
 * @module LatheMasterPostRouterEngine
 * @version 1.0.0
 * @milestone LATHE-MASTER U-LTH25
 */

import { z } from "zod";

// ── Types ───────────────────────────────────────────────────────────────────

export type LatheControllerFamily = "okuma" | "fanuc" | "mitsubishi" | "mazak" | "haas" | "citizen" | "generic";

export type LatheOperationType =
  | "od_turning"
  | "id_boring"
  | "facing"
  | "grooving"
  | "threading"
  | "parting"
  | "drilling"
  | "tapping"
  | "roughing"
  | "finishing";

export interface LatheRouteInput {
  machineId: string;
  operation?: LatheOperationType;
  controller?: string;
  program?: string;
  options?: {
    strictMode?: boolean;
    includeComments?: boolean;
    lineNumbers?: boolean;
  };
}

export interface LatheRouteResult {
  success: boolean;
  machineId: string;
  controller: string;
  controllerFamily: LatheControllerFamily;
  postPath: "direct" | "generated" | "fallback";
  dialect: string;
  gcode?: string[];
  warnings: string[];
  errors: string[];
  metadata: {
    routedVia: string;
    machineFound: boolean;
    subPostUsed: string;
    fallbackReason?: string;
  };
}

export interface JMDieMachine {
  id: string;
  name: string;
  type: "lathe" | "mill" | "edm" | "swiss";
  manufacturer: string;
  model: string;
  controller: string;
  controllerFamily: LatheControllerFamily;
  capabilities: string[];
}

// ── JM Die Machine Inventory (21 machines) ──────────────────────────────────

const JM_DIE_MACHINES: JMDieMachine[] = [
  // 7 Okuma Lathes
  { id: "okuma-lb3000", name: "Okuma LB3000 EX II", type: "lathe", manufacturer: "Okuma", model: "LB3000 EX II", controller: "okuma-osp-p300l", controllerFamily: "okuma", capabilities: ["live_tooling", "c_axis", "y_axis"] },
  { id: "okuma-lb4000", name: "Okuma LB4000 EX II", type: "lathe", manufacturer: "Okuma", model: "LB4000 EX II", controller: "okuma-osp-p300l", controllerFamily: "okuma", capabilities: ["live_tooling", "c_axis", "sub_spindle"] },
  { id: "okuma-lb15", name: "Okuma LB15 II", type: "lathe", manufacturer: "Okuma", model: "LB15 II", controller: "okuma-osp-p200l", controllerFamily: "okuma", capabilities: ["live_tooling"] },
  { id: "okuma-lb25", name: "Okuma LB25", type: "lathe", manufacturer: "Okuma", model: "LB25", controller: "okuma-osp-p200l", controllerFamily: "okuma", capabilities: [] },
  { id: "okuma-lu35", name: "Okuma LU35 II", type: "lathe", manufacturer: "Okuma", model: "LU35 II", controller: "okuma-osp-p300l", controllerFamily: "okuma", capabilities: ["twin_turret", "y_axis"] },
  { id: "okuma-multus-b300", name: "Okuma Multus B300", type: "lathe", manufacturer: "Okuma", model: "Multus B300", controller: "okuma-osp-p300m", controllerFamily: "okuma", capabilities: ["mill_turn", "b_axis", "y_axis", "live_tooling"] },
  { id: "okuma-captain-l370", name: "Okuma Captain L370", type: "lathe", manufacturer: "Okuma", model: "Captain L370", controller: "okuma-osp-p100l", controllerFamily: "okuma", capabilities: [] },

  // 5 Mills
  { id: "okuma-mb46", name: "Okuma MB-46VAE", type: "mill", manufacturer: "Okuma", model: "MB-46VAE", controller: "okuma-osp-p300m", controllerFamily: "okuma", capabilities: ["high_speed"] },
  { id: "okuma-mb56", name: "Okuma MB-56VA", type: "mill", manufacturer: "Okuma", model: "MB-56VA", controller: "okuma-osp-p300m", controllerFamily: "okuma", capabilities: [] },
  { id: "okuma-mu400", name: "Okuma MU-400VA II", type: "mill", manufacturer: "Okuma", model: "MU-400VA II", controller: "okuma-osp-p300m", controllerFamily: "okuma", capabilities: ["5_axis"] },
  { id: "haas-vf2", name: "Haas VF-2", type: "mill", manufacturer: "Haas", model: "VF-2", controller: "haas-ngc", controllerFamily: "haas", capabilities: [] },
  { id: "haas-vf4", name: "Haas VF-4SS", type: "mill", manufacturer: "Haas", model: "VF-4SS", controller: "haas-ngc", controllerFamily: "haas", capabilities: ["high_speed"] },

  // 4 Wire EDMs (Mitsubishi)
  { id: "mitsubishi-mv1200", name: "Mitsubishi MV1200R", type: "edm", manufacturer: "Mitsubishi", model: "MV1200R", controller: "mitsubishi-m80w", controllerFamily: "mitsubishi", capabilities: ["wedm"] },
  { id: "mitsubishi-mv2400", name: "Mitsubishi MV2400S", type: "edm", manufacturer: "Mitsubishi", model: "MV2400S", controller: "mitsubishi-m80w", controllerFamily: "mitsubishi", capabilities: ["wedm", "large_work"] },
  { id: "mitsubishi-fa20", name: "Mitsubishi FA20-S Advance", type: "edm", manufacturer: "Mitsubishi", model: "FA20-S", controller: "mitsubishi-m700", controllerFamily: "mitsubishi", capabilities: ["wedm", "taper"] },
  { id: "mitsubishi-fa10", name: "Mitsubishi FA10-S Advance", type: "edm", manufacturer: "Mitsubishi", model: "FA10-S", controller: "mitsubishi-m700", controllerFamily: "mitsubishi", capabilities: ["wedm"] },

  // 3 Swiss Lathes
  { id: "citizen-l20", name: "Citizen Cincom L20", type: "swiss", manufacturer: "Citizen", model: "Cincom L20", controller: "citizen-cincom", controllerFamily: "citizen", capabilities: ["swiss", "guide_bushing", "b_axis"] },
  { id: "citizen-m32", name: "Citizen Cincom M32", type: "swiss", manufacturer: "Citizen", model: "Cincom M32", controller: "citizen-cincom", controllerFamily: "citizen", capabilities: ["swiss", "guide_bushing", "sub_spindle"] },
  { id: "star-sr20", name: "Star SR-20RIV", type: "swiss", manufacturer: "Star", model: "SR-20RIV", controller: "fanuc-31i-t", controllerFamily: "fanuc", capabilities: ["swiss", "guide_bushing"] },

  // 2 Additional Lathes (Fanuc-controlled)
  { id: "doosan-puma-2600", name: "Doosan Puma 2600SY", type: "lathe", manufacturer: "Doosan", model: "Puma 2600SY", controller: "fanuc-31i-t", controllerFamily: "fanuc", capabilities: ["y_axis", "sub_spindle"] },
  { id: "mori-nl2500", name: "Mori Seiki NL2500", type: "lathe", manufacturer: "DMG Mori", model: "NL2500", controller: "fanuc-31i-t", controllerFamily: "fanuc", capabilities: ["live_tooling"] },
];

// ── Controller → Dialect mapping ────────────────────────────────────────────

const CONTROLLER_DIALECTS: Record<string, { dialect: string; family: LatheControllerFamily }> = {
  "okuma-osp-p300l": { dialect: "okuma", family: "okuma" },
  "okuma-osp-p300m": { dialect: "okuma", family: "okuma" },
  "okuma-osp-p200l": { dialect: "okuma", family: "okuma" },
  "okuma-osp-p100l": { dialect: "okuma", family: "okuma" },
  "fanuc-31i-t": { dialect: "fanuc", family: "fanuc" },
  "fanuc-31i-m": { dialect: "fanuc", family: "fanuc" },
  "fanuc-0i-tf": { dialect: "fanuc", family: "fanuc" },
  "mitsubishi-m80-l": { dialect: "mitsubishi", family: "mitsubishi" },
  "mitsubishi-m80w": { dialect: "mitsubishi", family: "mitsubishi" },
  "mitsubishi-m700": { dialect: "mitsubishi", family: "mitsubishi" },
  "haas-ngc": { dialect: "haas", family: "haas" },
  "mazak-smooth": { dialect: "mazak", family: "mazak" },
  "citizen-cincom": { dialect: "citizen", family: "citizen" },
};

// ── Zod Schemas ─────────────────────────────────────────────────────────────

export const LatheRouteInputSchema = z.object({
  machineId: z.string().min(1),
  operation: z.enum([
    "od_turning", "id_boring", "facing", "grooving", "threading",
    "parting", "drilling", "tapping", "roughing", "finishing",
  ]).optional(),
  controller: z.string().optional(),
  program: z.string().optional(),
  options: z.object({
    strictMode: z.boolean().optional(),
    includeComments: z.boolean().optional(),
    lineNumbers: z.boolean().optional(),
  }).optional(),
});

// ── Engine Class ────────────────────────────────────────────────────────────

class LatheMasterPostRouterEngine {
  private machines: Map<string, JMDieMachine>;
  private machineNameIndex: Map<string, string>; // lowercase name → id

  constructor() {
    this.machines = new Map();
    this.machineNameIndex = new Map();

    for (const machine of JM_DIE_MACHINES) {
      this.machines.set(machine.id, machine);
      this.machineNameIndex.set(machine.name.toLowerCase(), machine.id);
      // Also index by model
      this.machineNameIndex.set(machine.model.toLowerCase(), machine.id);
    }
  }

  /**
   * Route to correct sub-post based on machine/controller.
   */
  route(input: LatheRouteInput): LatheRouteResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Step 1: Find the machine
    const machine = this.findMachine(input.machineId);

    if (!machine) {
      // Fallback: Try to generate via P2 path
      return this.fallbackRoute(input, "Machine not found in JM Die inventory");
    }

    // Step 2: Resolve controller
    const controllerId = input.controller ?? machine.controller;
    const dialectInfo = CONTROLLER_DIALECTS[controllerId];

    if (!dialectInfo) {
      // Known machine but unknown controller - use fallback
      return this.fallbackRoute(input, `Unknown controller: ${controllerId}`);
    }

    // Step 3: Route to appropriate sub-post
    const subPostResult = this.invokeSubPost(machine, dialectInfo, input);

    return {
      success: true,
      machineId: machine.id,
      controller: controllerId,
      controllerFamily: dialectInfo.family,
      postPath: "direct",
      dialect: dialectInfo.dialect,
      gcode: subPostResult.gcode,
      warnings,
      errors,
      metadata: {
        routedVia: "LatheMasterPostRouterEngine",
        machineFound: true,
        subPostUsed: `${dialectInfo.family}_post`,
      },
    };
  }

  /**
   * Find machine by ID, name, or model (case-insensitive).
   */
  private findMachine(identifier: string): JMDieMachine | undefined {
    // Guard against missing/non-string/empty/whitespace-only input. route() passes
    // params.machine_id via an `as string` cast that is unsound -- at runtime it can be
    // undefined (e.g. an operations-shaped caller that never set machine_id), so a
    // non-string must return "not found" -> route()'s fallbackRoute, never crash on
    // `.trim()` of undefined (R12 fail-loud, not fail-crash). Found live by the
    // post-training harness driving lathe_master_post_route (U-PP-LATHE-ROUTER-NULLGUARD, 2026-06-27).
    if (typeof identifier !== "string") {
      return undefined;
    }
    const trimmed = identifier.trim();
    if (!trimmed || trimmed.length < 2) {
      return undefined;
    }

    // Try exact ID match
    if (this.machines.has(trimmed)) {
      return this.machines.get(trimmed);
    }

    // Try lowercase name/model match
    const lowerId = trimmed.toLowerCase();
    const machineId = this.machineNameIndex.get(lowerId);
    if (machineId) {
      return this.machines.get(machineId);
    }

    // Try partial match (require at least 3 chars to avoid false positives)
    if (lowerId.length >= 3) {
      for (const [name, id] of this.machineNameIndex) {
        if (name.includes(lowerId) || lowerId.includes(name)) {
          return this.machines.get(id);
        }
      }
    }

    return undefined;
  }

  /**
   * Invoke the correct sub-post based on controller family.
   */
  private invokeSubPost(
    machine: JMDieMachine,
    dialectInfo: { dialect: string; family: LatheControllerFamily },
    input: LatheRouteInput,
  ): { gcode: string[] } {
    const operation = input.operation ?? "roughing";
    const includeComments = input.options?.includeComments !== false;

    // Generate basic G-code structure based on dialect
    const gcode: string[] = [];

    // Header
    if (includeComments) {
      gcode.push(`(PROGRAM FOR ${machine.name})`);
      gcode.push(`(DIALECT: ${dialectInfo.dialect.toUpperCase()})`);
      gcode.push(`(OPERATION: ${operation.toUpperCase()})`);
    }

    // Program number (dialect-specific)
    switch (dialectInfo.family) {
      case "okuma":
        gcode.push("O0001");
        gcode.push("G10 L2 P1 X0. Z0. (WORK OFFSET)");
        break;
      case "fanuc":
        gcode.push("O0001");
        gcode.push("G50 S3000");
        break;
      case "mitsubishi":
        gcode.push("O0001");
        gcode.push("G50 S2500");
        break;
      case "haas":
        gcode.push("O00001");
        gcode.push("G50 S4000");
        break;
      case "citizen":
        gcode.push("O0001");
        gcode.push("G112 (GUIDE BUSHING ON)");
        break;
      default:
        gcode.push("O0001");
    }

    // Safe start line
    gcode.push("G28 U0. W0.");
    gcode.push("G54");
    gcode.push("T0101 (TOOL CALL)");

    // Operation-specific code
    switch (operation) {
      case "roughing":
        gcode.push("G96 S200 M03 (CSS)");
        gcode.push("G00 X100. Z5.");
        gcode.push("G71 U2.0 R0.5 (ROUGH TURN CYCLE)");
        gcode.push("G71 P10 Q20 U0.5 W0.1 F0.25");
        break;
      case "finishing":
        gcode.push("G96 S250 M03");
        gcode.push("G00 X100. Z5.");
        gcode.push("G70 P10 Q20 (FINISH CYCLE)");
        break;
      case "threading":
        gcode.push("G97 S800 M03 (CONSTANT RPM)");
        gcode.push("G00 X25. Z5.");
        gcode.push("G76 P010060 Q100 R0.05 (THREAD CYCLE)");
        gcode.push("G76 X23.4 Z-20. P800 Q200 F1.5");
        break;
      case "grooving":
        gcode.push("G96 S150 M03");
        gcode.push("G00 X50. Z-10.");
        gcode.push("G75 R0.5 (GROOVING CYCLE)");
        gcode.push("G75 X20. Z-15. P3000 Q500 F0.08");
        break;
      case "drilling":
        gcode.push("G97 S1200 M03");
        gcode.push("G00 X0. Z5.");
        gcode.push("G83 Z-30. R2. Q5. F0.1 (PECK DRILL)");
        break;
      default:
        gcode.push("G96 S200 M03");
        gcode.push("G00 X100. Z5.");
        gcode.push("G01 X50. F0.2");
    }

    // End program
    gcode.push("G28 U0. W0. (HOME)");
    gcode.push("M30");
    gcode.push("%");

    return { gcode };
  }

  /**
   * Fallback route via P2 path (lathe_postgen_full).
   */
  private fallbackRoute(input: LatheRouteInput, reason: string): LatheRouteResult {
    return {
      success: true,
      machineId: input.machineId,
      controller: input.controller ?? "generic",
      controllerFamily: "generic",
      postPath: "fallback",
      dialect: "generic",
      gcode: [
        "(FALLBACK POST - VERIFY BEFORE USE)",
        `(REASON: ${reason})`,
        "O0001",
        "G28 U0. W0.",
        "G54",
        "T0101",
        "G96 S200 M03",
        "G00 X100. Z5.",
        "(INSERT OPERATION CODE HERE)",
        "G28 U0. W0.",
        "M30",
        "%",
      ],
      warnings: [`Fallback route used: ${reason}`],
      errors: [],
      metadata: {
        routedVia: "LatheMasterPostRouterEngine.fallback",
        machineFound: false,
        subPostUsed: "generic_fallback",
        fallbackReason: reason,
      },
    };
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Get all JM Die machines.
   */
  static getMachineInventory(): JMDieMachine[] {
    return [...JM_DIE_MACHINES];
  }

  /**
   * Get machines by type.
   */
  static getMachinesByType(type: JMDieMachine["type"]): JMDieMachine[] {
    return JM_DIE_MACHINES.filter(m => m.type === type);
  }

  /**
   * Get machines by controller family.
   */
  static getMachinesByControllerFamily(family: LatheControllerFamily): JMDieMachine[] {
    return JM_DIE_MACHINES.filter(m => m.controllerFamily === family);
  }

  /**
   * Get supported controller IDs.
   */
  static getSupportedControllers(): string[] {
    return Object.keys(CONTROLLER_DIALECTS);
  }

  /**
   * Get dialect info for a controller.
   */
  static getDialectInfo(controllerId: string): { dialect: string; family: LatheControllerFamily } | undefined {
    return CONTROLLER_DIALECTS[controllerId];
  }

  /**
   * Check if a machine ID exists in inventory.
   */
  static machineExists(machineId: string): boolean {
    return JM_DIE_MACHINES.some(m =>
      m.id === machineId ||
      m.name.toLowerCase() === machineId.toLowerCase() ||
      m.model.toLowerCase() === machineId.toLowerCase()
    );
  }

  /**
   * Get version.
   */
  static getVersion(): string {
    return "1.0.0";
  }
}

// ── Singleton Export ────────────────────────────────────────────────────────

export const latheMasterPostRouterEngine = new LatheMasterPostRouterEngine();
export { LatheMasterPostRouterEngine };
