/**
 * PRISM MCP Server - Post Processor Registry
 * Complete access to G-code post processors for CNC controller families.
 *
 * Post processors translate generic toolpath data into controller-specific
 * NC code (Fanuc, Siemens, Haas, Mazak, Okuma, etc.).
 *
 * ⚠️ SAFETY CRITICAL: Incorrect post processing can cause machine crashes.
 * All post processors require validation before production use.
 *
 * @version 1.0.0
 * @date 2026-02-23
 * @dimension P-MS1-T5 — New Registry Creation
 */

import * as path from "path";
import { BaseRegistry } from "./base.js";
import { PATHS } from "../constants.js";
import { log } from "../utils/Logger.js";
import { fileExists, readJsonFile } from "../utils/files.js";

// ============================================================================
// POST PROCESSOR TYPES
// ============================================================================

export type ControllerFamily =
  | "fanuc" | "siemens" | "haas" | "mazak" | "okuma"
  | "mitsubishi" | "heidenhain" | "fagor" | "hurco" | "doosan"
  | "brother" | "makino" | "dmg_mori" | "generic";

export type PostType =
  | "mill_3axis" | "mill_4axis" | "mill_5axis"
  | "lathe_2axis" | "lathe_caxis" | "lathe_yaxis" | "multitask"
  | "wire_edm" | "sinker_edm" | "laser" | "waterjet";

export type PostCapability =
  | "rigid_tapping" | "high_speed_machining" | "probing"
  | "tool_measurement" | "canned_cycles" | "subprograms"
  | "macro_b" | "parametric" | "conversational"
  | "multi_spindle" | "multi_turret" | "live_tooling"
  | "coolant_through" | "chip_conveyor" | "work_coordinates";

export interface PostProcessor {
  // Identification
  post_id: string;
  name: string;
  controller_family: ControllerFamily;
  controller_model?: string;     // e.g., "Fanuc 31i-B", "Siemens 840D sl"

  // Type & capability
  post_type: PostType;
  capabilities: PostCapability[];

  // G-code dialect
  dialect: {
    program_start: string;       // e.g., "%\nO0001\n"
    program_end: string;         // e.g., "M30\n%"
    line_numbers: boolean;
    line_number_increment: number;
    block_delete: string;        // e.g., "/"
    optional_stop: string;       // e.g., "M01"
    comment_style: "parentheses" | "semicolon" | "both";
    decimal_format: string;      // e.g., "3.4" (3 integer, 4 decimal)
    arc_format: "IJK" | "R" | "both";
    coord_system: "G54-G59" | "G54.1_P" | "both";
  };

  // Safety
  safety_class: "CRITICAL";     // All post processors are safety-critical
  safety_checks: string[];

  // Source & status
  source_file?: string;          // Extracted JS file
  implementation_status: "COMPLETE" | "PARTIAL" | "STUB";
  wired_to_engine?: string;      // MCP engine that uses this

  // Documentation
  description: string;
  machine_examples?: string[];   // e.g., ["Haas VF-2", "Haas UMC-750"]
  notes?: string[];

  // Metadata
  version?: string;
  last_updated?: string;
}

// ============================================================================
// BUILT-IN POST PROCESSORS
// ============================================================================

const BUILT_IN_POST_PROCESSORS: PostProcessor[] = [
  {
    post_id: "PP-FANUC-3AX-001",
    name: "Fanuc 3-Axis Mill",
    controller_family: "fanuc",
    controller_model: "Fanuc 0i-MF / 31i-B",
    post_type: "mill_3axis",
    capabilities: ["rigid_tapping", "canned_cycles", "subprograms", "macro_b", "work_coordinates", "probing"],
    dialect: {
      program_start: "%\nO0001 (PROGRAM NAME)\n",
      program_end: "M30\n%",
      line_numbers: true,
      line_number_increment: 10,
      block_delete: "/",
      optional_stop: "M01",
      comment_style: "parentheses",
      decimal_format: "3.4",
      arc_format: "IJK",
      coord_system: "G54-G59",
    },
    safety_class: "CRITICAL",
    safety_checks: ["Verify G28 home position", "Check spindle speed limits", "Validate tool length compensation"],
    source_file: "POST_PROCESSOR_ENGINE_V2.js",
    implementation_status: "COMPLETE",
    description: "Standard Fanuc 3-axis mill post. Covers most Fanuc-based VMCs (Haas, Doosan, Brother, Makino).",
    machine_examples: ["Haas VF-2", "Doosan DNM-500", "Brother S700X1"],
  },
  {
    post_id: "PP-FANUC-5AX-001",
    name: "Fanuc 5-Axis Mill",
    controller_family: "fanuc",
    controller_model: "Fanuc 31i-B5 / 30i-B",
    post_type: "mill_5axis",
    capabilities: ["rigid_tapping", "canned_cycles", "subprograms", "macro_b", "high_speed_machining", "work_coordinates", "probing", "tool_measurement"],
    dialect: {
      program_start: "%\nO0001 (5-AXIS PROGRAM)\nG10 L2 P1 X0. Y0. Z0.\n",
      program_end: "G28 G91 Z0.\nG28 X0. Y0.\nM30\n%",
      line_numbers: true,
      line_number_increment: 10,
      block_delete: "/",
      optional_stop: "M01",
      comment_style: "parentheses",
      decimal_format: "3.4",
      arc_format: "IJK",
      coord_system: "both",
    },
    safety_class: "CRITICAL",
    safety_checks: ["Check RTCP/TCP mode", "Verify pivot point offsets", "Validate A/B/C axis limits", "Check tool vector orientation"],
    source_file: "POST_PROCESSOR_100_PERCENT.js",
    implementation_status: "COMPLETE",
    description: "5-axis simultaneous Fanuc post with RTCP/TCP support. For 5-axis VMCs and HMCs.",
    machine_examples: ["Haas UMC-750", "Makino D500", "DMG MORI CMX 50 U"],
  },
  {
    post_id: "PP-SIEMENS-840D-001",
    name: "Siemens 840D sl Mill",
    controller_family: "siemens",
    controller_model: "Sinumerik 840D sl",
    post_type: "mill_5axis",
    capabilities: ["high_speed_machining", "canned_cycles", "subprograms", "parametric", "probing", "tool_measurement", "work_coordinates"],
    dialect: {
      program_start: "; PROGRAM: MAIN.MPF\nPROG_START:\n",
      program_end: "M30\n",
      line_numbers: false,
      line_number_increment: 0,
      block_delete: "/",
      optional_stop: "M01",
      comment_style: "semicolon",
      decimal_format: "3.4",
      arc_format: "IJK",
      coord_system: "G54-G59",
    },
    safety_class: "CRITICAL",
    safety_checks: ["Verify TRAORI activation", "Check cycle 800 swivel data", "Validate tool management data"],
    source_file: "PRISM_INTERNAL_POST_ENGINE.js",
    implementation_status: "COMPLETE",
    description: "Siemens 840D sl post with ShopMill compatibility. TRAORI for 5-axis.",
    machine_examples: ["DMG MORI DMU 50", "Hermle C 42 U", "Grob G350"],
  },
  {
    post_id: "PP-HAAS-MILL-001",
    name: "Haas Mill (NGC)",
    controller_family: "haas",
    controller_model: "Haas NGC / Classic",
    post_type: "mill_3axis",
    capabilities: ["rigid_tapping", "canned_cycles", "subprograms", "macro_b", "probing", "high_speed_machining", "work_coordinates", "coolant_through"],
    dialect: {
      program_start: "%\nO00001 (HAAS PROGRAM)\n(T__ H__ D__)\nG00 G17 G40 G49 G80 G90\n",
      program_end: "G00 G28 G91 Z0.\nG28 X0. Y0.\nM30\n%",
      line_numbers: false,
      line_number_increment: 0,
      block_delete: "/",
      optional_stop: "M01",
      comment_style: "parentheses",
      decimal_format: "3.4",
      arc_format: "R",
      coord_system: "G54-G59",
    },
    safety_class: "CRITICAL",
    safety_checks: ["Verify Setting 32 (coolant override)", "Check G187 smoothness setting", "Validate macro variables"],
    source_file: "POST_PROCESSOR_100_PERCENT.js",
    implementation_status: "COMPLETE",
    description: "Haas-specific post with NGC macros and probing support. Most common VMC in North America.",
    machine_examples: ["Haas VF-2", "Haas VF-4", "Haas DM-2", "Haas ST-10"],
  },
  {
    post_id: "PP-MAZAK-INTEGREX-001",
    name: "Mazak Integrex / Mazatrol",
    controller_family: "mazak",
    controller_model: "Mazatrol SmoothX / SmoothAi",
    post_type: "multitask",
    capabilities: ["multi_spindle", "multi_turret", "live_tooling", "rigid_tapping", "canned_cycles", "subprograms", "probing", "high_speed_machining"],
    dialect: {
      program_start: "O0001\nG28 U0. V0. W0.\n",
      program_end: "G28 U0. V0. W0.\nM30\n",
      line_numbers: true,
      line_number_increment: 10,
      block_delete: "/",
      optional_stop: "M01",
      comment_style: "parentheses",
      decimal_format: "3.4",
      arc_format: "IJK",
      coord_system: "both",
    },
    safety_class: "CRITICAL",
    safety_checks: ["Verify spindle sync for C-axis", "Check turret position before index", "Validate sub-spindle handoff"],
    source_file: "PRISM_POST_PROCESSOR_DATABASE_V2.js",
    implementation_status: "PARTIAL",
    description: "Mazak multitasking post for Integrex series. Supports dual spindle, Y-axis, B-axis.",
    machine_examples: ["Mazak Integrex i-200", "Mazak Quick Turn 250MY"],
  },
  {
    post_id: "PP-OKUMA-OSP-001",
    name: "Okuma OSP Mill",
    controller_family: "okuma",
    controller_model: "OSP-P300M / OSP-P500",
    post_type: "mill_3axis",
    capabilities: ["rigid_tapping", "canned_cycles", "subprograms", "macro_b", "probing", "high_speed_machining", "work_coordinates"],
    dialect: {
      program_start: "O0001\nG15 H1\n",
      program_end: "G15 H0\nM02\n",
      line_numbers: true,
      line_number_increment: 1,
      block_delete: "/",
      optional_stop: "M01",
      comment_style: "parentheses",
      decimal_format: "3.4",
      arc_format: "IJK",
      coord_system: "G54-G59",
    },
    safety_class: "CRITICAL",
    safety_checks: ["Verify G15 coordinate system", "Check OSP-specific M-codes", "Validate tool management"],
    source_file: "PRISM_POST_PROCESSOR_DATABASE_V2.js",
    implementation_status: "PARTIAL",
    description: "Okuma OSP post. Different M-code conventions from Fanuc-based controllers.",
    machine_examples: ["Okuma Genos M560-V", "Okuma MU-5000V"],
  },
  {
    post_id: "PP-HEIDENHAIN-TNC-001",
    name: "Heidenhain TNC Mill",
    controller_family: "heidenhain",
    controller_model: "TNC 640 / TNC7",
    post_type: "mill_5axis",
    capabilities: ["high_speed_machining", "probing", "canned_cycles", "parametric", "conversational", "tool_measurement"],
    dialect: {
      program_start: "BEGIN PGM MAIN MM\n",
      program_end: "END PGM MAIN MM\n",
      line_numbers: true,
      line_number_increment: 1,
      block_delete: "/",
      optional_stop: "M01",
      comment_style: "semicolon",
      decimal_format: "3.4",
      arc_format: "IJK",
      coord_system: "G54-G59",
    },
    safety_class: "CRITICAL",
    safety_checks: ["Verify M128/TCPM mode", "Check plane spatial definition", "Validate Q-parameters"],
    source_file: "PRISM_POST_PROCESSOR_DATABASE_V2.js",
    implementation_status: "PARTIAL",
    description: "Heidenhain TNC conversational/ISO post. Uses unique dialog-based programming alongside ISO.",
    machine_examples: ["Hermle C 22 U", "DMG MORI DMU 50 eco"],
  },
  {
    post_id: "PP-GENERIC-LATHE-001",
    name: "Generic 2-Axis Lathe",
    controller_family: "generic",
    post_type: "lathe_2axis",
    capabilities: ["rigid_tapping", "canned_cycles", "subprograms"],
    dialect: {
      program_start: "%\nO0001 (LATHE PROGRAM)\nG18 G20 G40 G80\n",
      program_end: "G28 U0. W0.\nM30\n%",
      line_numbers: true,
      line_number_increment: 10,
      block_delete: "/",
      optional_stop: "M01",
      comment_style: "parentheses",
      decimal_format: "3.4",
      arc_format: "R",
      coord_system: "G54-G59",
    },
    safety_class: "CRITICAL",
    safety_checks: ["Verify G18 plane selection (ZX)", "Check chuck pressure", "Validate tailstock position"],
    source_file: "PRISM_GUARANTEED_POST_PROCESSOR.js",
    implementation_status: "COMPLETE",
    description: "Generic 2-axis lathe post. Works with most Fanuc-based turning centers.",
    machine_examples: ["Haas ST-10", "Doosan Lynx 2100", "Mazak QT-250"],
  },
];

// ============================================================================
// SOURCE FILE CATALOG (maps extracted JS to post entries)
// ============================================================================

const SOURCE_FILE_CATALOG = [
  { file: "POST_PROCESSOR_100_PERCENT.js", lines: 1204, description: "Complete post processor with G-code validator, multi-controller support" },
  { file: "POST_PROCESSOR_ENGINE_V2.js", lines: 295, description: "V2 post engine with controller-specific NC generation" },
  { file: "PRISM_GCODE_BACKPLOT_ENGINE.js", lines: 862, description: "G-code visualization/backplot engine for toolpath verification" },
  { file: "PRISM_GCODE_PROGRAMMING_ENGINE.js", lines: 127, description: "RS-274D G-code programming reference and generator" },
  { file: "PRISM_GUARANTEED_POST_PROCESSOR.js", lines: 300, description: "Guaranteed-safe post processor with conservative defaults" },
  { file: "PRISM_INTERNAL_POST_ENGINE.js", lines: 923, description: "Internal post engine with Siemens/Heidenhain support" },
  { file: "PRISM_POST_INTEGRATION_MODULE.js", lines: 670, description: "Post processor integration module for CAM system bridging" },
  { file: "PRISM_POST_OPTIMIZER.js", lines: 115, description: "G-code optimization (redundant move removal, arc fitting)" },
  { file: "PRISM_POST_PROCESSOR_DATABASE_V2.js", lines: 2717, description: "Post processor database with 50+ controller configurations" },
  { file: "PRISM_POST_PROCESSOR_ENGINE.js", lines: 131, description: "Core post processor engine (base implementation)" },
  { file: "PRISM_POST_PROCESSOR_GENERATOR.js", lines: 329, description: "Post processor configuration generator from templates" },
  { file: "PRISM_RL_POST_PROCESSOR.js", lines: 165, description: "Reinforcement learning-based post optimization" },
];

// ============================================================================
// POST PROCESSOR REGISTRY CLASS
// ============================================================================

export class PostProcessorRegistry extends BaseRegistry<PostProcessor> {
  private indexByController: Map<ControllerFamily, string[]> = new Map();
  private indexByType: Map<PostType, string[]> = new Map();

  constructor() {
    super(
      "PostProcessorRegistry",
      path.join(PATHS.STATE_DIR, "post-processor-registry.json"),
      "1.0.0"
    );
  }

  /**
   * Load post processors from built-ins and files
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    log.info("Loading PostProcessorRegistry...");

    // Load built-in post processors
    for (const pp of BUILT_IN_POST_PROCESSORS) {
      this.entries.set(pp.post_id, {
        id: pp.post_id,
        data: pp,
        metadata: {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          version: 1,
          source: "built-in"
        }
      });
    }

    // Load from database file if exists
    await this.loadFromDatabaseFile();

    // Build indexes
    this.buildIndexes();

    this.loaded = true;
    log.info(`PostProcessorRegistry loaded: ${this.entries.size} post processors across ${this.indexByController.size} controller families`);
  }

  /**
   * Load additional post processors from the extracted database
   */
  private async loadFromDatabaseFile(): Promise<void> {
    const dbPaths = [
      path.join(PATHS.EXTRACTED_DIR, "engines", "post_processor", "PRISM_POST_PROCESSOR_DATABASE_V2.js"),
      path.join(PATHS.STATE_DIR, "post-processor-registry.json"),
    ];

    for (const dbPath of dbPaths) {
      try {
        if (!await fileExists(dbPath)) continue;

        if (dbPath.endsWith(".json")) {
          const data = await readJsonFile<any>(dbPath);
          const posts = data?.post_processors || data?.data || [];

          for (const pp of Array.isArray(posts) ? posts : []) {
            if (pp.post_id && !this.entries.has(pp.post_id)) {
              this.entries.set(pp.post_id, {
                id: pp.post_id,
                data: pp,
                metadata: {
                  created: new Date().toISOString(),
                  updated: new Date().toISOString(),
                  version: 1,
                  source: "database"
                }
              });
            }
          }
        }
      } catch (error) {
        log.warn(`PostProcessorRegistry: Failed to load from ${dbPath}`, error);
      }
    }
  }

  /**
   * Build lookup indexes for fast queries
   */
  private buildIndexes(): void {
    this.indexByController.clear();
    this.indexByType.clear();

    for (const [id, entry] of this.entries) {
      const pp = entry.data;

      // Index by controller family
      if (!this.indexByController.has(pp.controller_family)) {
        this.indexByController.set(pp.controller_family, []);
      }
      this.indexByController.get(pp.controller_family)!.push(id);

      // Index by post type
      if (!this.indexByType.has(pp.post_type)) {
        this.indexByType.set(pp.post_type, []);
      }
      this.indexByType.get(pp.post_type)!.push(id);
    }
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Get post processor by ID
   */
  async getPostProcessor(id: string): Promise<PostProcessor | undefined> {
    await this.ensureLoaded();
    return this.entries.get(id)?.data;
  }

  /**
   * Get all post processors for a controller family
   */
  async getByController(controller: ControllerFamily): Promise<PostProcessor[]> {
    await this.ensureLoaded();
    const ids = this.indexByController.get(controller) || [];
    return ids.map(id => this.entries.get(id)!.data);
  }

  /**
   * Get all post processors for a machine type
   */
  async getByType(postType: PostType): Promise<PostProcessor[]> {
    await this.ensureLoaded();
    const ids = this.indexByType.get(postType) || [];
    return ids.map(id => this.entries.get(id)!.data);
  }

  /**
   * Find the best post processor for a given machine
   */
  async findForMachine(machineName: string): Promise<PostProcessor | null> {
    await this.ensureLoaded();
    const query = machineName.toLowerCase();

    for (const entry of this.entries.values()) {
      const pp = entry.data;
      // Check machine examples
      if (pp.machine_examples?.some(ex => ex.toLowerCase().includes(query))) {
        return pp;
      }
      // Check controller model
      if (pp.controller_model?.toLowerCase().includes(query)) {
        return pp;
      }
    }

    return null;
  }

  /**
   * Get all post processors with a specific capability
   */
  async getByCapability(capability: PostCapability): Promise<PostProcessor[]> {
    await this.ensureLoaded();
    return Array.from(this.entries.values())
      .map(e => e.data)
      .filter(pp => pp.capabilities.includes(capability));
  }

  /**
   * List all available controller families
   */
  async listControllerFamilies(): Promise<{ family: ControllerFamily; count: number }[]> {
    await this.ensureLoaded();
    return Array.from(this.indexByController.entries()).map(([family, ids]) => ({
      family,
      count: ids.length,
    }));
  }

  /**
   * Get source file catalog (maps extracted JS files to registry)
   */
  getSourceCatalog(): typeof SOURCE_FILE_CATALOG {
    return SOURCE_FILE_CATALOG;
  }

  /**
   * Get registry statistics
   */
  async getStats(): Promise<{
    total: number;
    by_controller: Record<string, number>;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
    source_files: number;
  }> {
    await this.ensureLoaded();

    const by_controller: Record<string, number> = {};
    const by_type: Record<string, number> = {};
    const by_status: Record<string, number> = {};

    for (const entry of this.entries.values()) {
      const pp = entry.data;
      by_controller[pp.controller_family] = (by_controller[pp.controller_family] || 0) + 1;
      by_type[pp.post_type] = (by_type[pp.post_type] || 0) + 1;
      by_status[pp.implementation_status] = (by_status[pp.implementation_status] || 0) + 1;
    }

    return {
      total: this.entries.size,
      by_controller,
      by_type,
      by_status,
      source_files: SOURCE_FILE_CATALOG.length,
    };
  }

  /**
   * Handle MCP tool calls
   */
  async handleTool(name: string, args: any): Promise<any> {
    await this.ensureLoaded();

    switch (name) {
      case "post_get":
        return this.getPostProcessor(args.id || args.post_id);

      case "post_search": {
        const results = await this.search(args.query || args.q || "");
        return { results, total: results.length };
      }

      case "post_list":
        return {
          post_processors: Array.from(this.entries.values()).map(e => ({
            id: e.data.post_id,
            name: e.data.name,
            controller: e.data.controller_family,
            type: e.data.post_type,
            status: e.data.implementation_status,
          })),
          total: this.entries.size,
        };

      case "post_by_controller":
        return this.getByController(args.controller || args.family);

      case "post_find_machine":
        return this.findForMachine(args.machine || args.name);

      case "post_stats":
        return this.getStats();

      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  /**
   * Text search across post processors
   */
  async search(query: string): Promise<PostProcessor[]> {
    await this.ensureLoaded();

    if (!query) return Array.from(this.entries.values()).map(e => e.data);

    const q = query.toLowerCase();
    return Array.from(this.entries.values())
      .map(e => e.data)
      .filter(pp =>
        pp.name.toLowerCase().includes(q) ||
        pp.controller_family.includes(q) ||
        pp.description.toLowerCase().includes(q) ||
        pp.controller_model?.toLowerCase().includes(q) ||
        pp.machine_examples?.some(ex => ex.toLowerCase().includes(q))
      );
  }
}

// Singleton export
export const postProcessorRegistry = new PostProcessorRegistry();
