/**
 * PRISM MCP Server - Machine Registry
 * Complete access to 824 machines × 4 data layers
 * Implements BASIC → CORE → ENHANCED → LEVEL5 hierarchy
 */

import * as fs from "fs/promises";
import * as path from "path";
import { BaseRegistry } from "./base.js";
import { PATHS, DATA_LAYERS, MACHINE_TYPES, CONTROLLER_FAMILIES } from "../constants.js";
import { log } from "../utils/Logger.js";
import { readJsonFile, fileExists, listDirectory } from "../utils/files.js";

// ============================================================================
// MACHINE TYPES
// ============================================================================

export interface SpindleSpecs {
  max_rpm: number;
  min_rpm: number;
  power_continuous: number;     // kW
  power_30min: number;          // kW
  power_peak?: number;          // kW
  torque_max: number;           // Nm
  torque_continuous: number;    // Nm
  bearing_type: string;
  spindle_nose: string;         // e.g., "BT40", "CAT50", "HSK-A63"
  coolant_through: boolean;
  coolant_pressure?: number;    // bar
  orientation_capability?: string[];  // ["horizontal", "vertical"]
}

export interface AxisSpecs {
  name: string;                 // X, Y, Z, A, B, C
  travel: number;               // mm
  rapid_rate: number;           // mm/min
  max_feed_rate: number;        // mm/min
  acceleration: number;         // m/s²
  resolution: number;           // µm
  repeatability: number;        // µm
  accuracy: number;             // µm
  ball_screw_diameter?: number; // mm
  linear_scale?: boolean;
}

export interface ToolChangerSpecs {
  type: "side_mount" | "arm" | "umbrella" | "chain" | "disc" | "turret" | "none";
  capacity: number;
  max_tool_diameter: number;    // mm
  max_tool_length: number;      // mm
  max_tool_weight: number;      // kg
  change_time: number;          // seconds (chip-to-chip)
  adjacent_empty?: boolean;     // For large tools
}

export interface TableSpecs {
  type: string;                 // fixed, rotary, tilting, trunnion
  length: number;               // mm
  width: number;                // mm
  t_slots?: number;
  t_slot_width?: number;        // mm
  max_load: number;             // kg
  rotation_range?: { min: number; max: number };  // degrees
}

export interface ControllerSpecs {
  manufacturer: string;         // FANUC, SIEMENS, HEIDENHAIN, etc.
  model: string;                // e.g., "0i-MF", "840D sl", "TNC 640"
  cnc_type: string;             // e.g., "FANUC 0i-MF", "SINUMERIK 840D"
  max_block_rate: number;       // blocks/second
  look_ahead: number;           // blocks
  memory_capacity: string;      // e.g., "4GB"
  ethernet: boolean;
  usb: boolean;
  dxf_import?: boolean;
  conversational?: boolean;
}

export interface MachineEnvelope {
  x_travel: number;
  y_travel: number;
  z_travel: number;
  spindle_to_table_min: number;
  spindle_to_table_max: number;
  spindle_nose_to_column?: number;
}

export interface Machine {
  id: string;
  manufacturer: string;
  model: string;
  name: string;                 // Full display name
  type: string;                 // VMC, HMC, lathe, mill-turn, etc.
  
  // Specifications
  envelope: MachineEnvelope;
  spindle: SpindleSpecs;
  axes: AxisSpecs[];
  tool_changer: ToolChangerSpecs;
  table: TableSpecs;
  controller: ControllerSpecs;
  
  // Physical
  weight: number;               // kg
  footprint: { length: number; width: number; height: number };  // mm
  power_requirement: number;    // kVA
  air_requirement?: number;     // L/min
  coolant_capacity?: number;    // L
  
  // Capabilities
  simultaneous_axes: number;    // 3, 4, or 5
  high_speed_machining: boolean;
  rigid_tapping: boolean;
  probing_ready: boolean;
  automation_ready: boolean;
  
  // Metadata
  layer: string;
  year_introduced?: number;
  price_range?: { min: number; max: number };  // USD
  typical_applications?: string[];
  
  // LEVEL5 CAD data (if available)
  cad_file?: string;
  collision_model?: string;
  kinematic_chain?: object;
}

// ============================================================================
// MACHINE REGISTRY CLASS
// ============================================================================

export class MachineRegistry extends BaseRegistry<Machine> {
  private indexByManufacturer: Map<string, Set<string>> = new Map();
  private indexByType: Map<string, Set<string>> = new Map();
  private indexByController: Map<string, Set<string>> = new Map();
  
  constructor() {
    super(
      "MachineRegistry",
      path.join(PATHS.STATE_DIR, "machine_registry_cache.json"),
      "1.0.0"
    );
  }

  /**
   * Load machines from all layers
   */
  async load(): Promise<void> {
    if (this.loaded) return;
    
    log.info("Loading MachineRegistry...");
    
    // Load in order: BASIC → CORE → ENHANCED → LEVEL5
    await this.loadLayer("BASIC", PATHS.MACHINES_BASIC);
    await this.loadLayer("CORE", PATHS.MACHINES_CORE);
    await this.loadLayer("ENHANCED", PATHS.MACHINES_ENHANCED);
    await this.loadLayer("LEVEL5", PATHS.MACHINES_LEVEL5);
    
    // Load from converted JSON data directory (C:\PRISM\data\machines)
    await this.loadLayer("ENHANCED", "C:\\PRISM\\data\\machines\\ENHANCED\\json");
    
    this.buildIndexes();
    
    // W5: Only mark loaded if we actually got data, or if no data files exist
    if (this.entries.size > 0) {
      this.loaded = true;
      log.info(`MachineRegistry loaded: ${this.entries.size} machines`);
    } else {
      log.warn(`MachineRegistry: 0 machines loaded — will retry on next call`);
    }
  }

  /**
   * Load a single layer
   */
  private async loadLayer(layer: string, basePath: string): Promise<void> {
    try {
      if (!await fileExists(basePath)) {
        log.debug(`Machine layer path does not exist: ${basePath}`);
        return;
      }
      
      const files = await listDirectory(basePath);
      const jsonFiles = files.filter(f => f.name.endsWith(".json"));
      
      for (const file of jsonFiles) {
        try {
          const filePath = file.path;
          const data = await readJsonFile<any>(filePath);
          
          // R1-MS2: Handle multiple formats:
          // - Direct array: [machine, machine, ...]
          // - Wrapper with .machines: { metadata: {...}, machines: [...] }
          // - Single object: { id, manufacturer, ... }
          let machines: any[];
          if (Array.isArray(data)) {
            machines = data;
          } else if (data.machines && Array.isArray(data.machines)) {
            machines = data.machines;
          } else {
            machines = [data];
          }
          
          for (let i = 0; i < machines.length; i++) {
            const machine = machines[i];
            // W5/R1-MS2: Generate ID from manufacturer+model if no valid id
            // Treat "unknown", empty string, or missing as invalid
            const rawId = machine.id || machine.machine_id;
            const hasValidId = rawId && rawId !== "unknown" && rawId.trim() !== "";
            const id = hasValidId ? rawId :
              (machine.manufacturer && machine.model 
                ? `${machine.manufacturer}-${machine.model}`.replace(/[\s\/]+/g, '_').toUpperCase()
                : machine.name 
                  ? machine.name.replace(/[\s\/]+/g, '_').toUpperCase()
                  : `${layer}-${path.basename(file.name, '.json')}-${i}`);
            machine.id = id;
            machine.layer = layer;
            this.set(id, machine, layer);
          }
        } catch (err) {
          log.warn(`Failed to load machine file ${file}: ${err}`);
        }
      }
      
      log.debug(`Loaded machines from ${layer} layer`);
    } catch (err) {
      log.warn(`Failed to load machine layer ${layer}: ${err}`);
    }
  }

  /**
   * Build search indexes
   */
  private buildIndexes(): void {
    this.indexByManufacturer.clear();
    this.indexByType.clear();
    this.indexByController.clear();
    
    for (const [id, entry] of this.entries) {
      const machine = entry.data;
      
      // Index by manufacturer
      if (machine.manufacturer && typeof machine.manufacturer === 'string') {
        const mfr = machine.manufacturer.toLowerCase();
        if (!this.indexByManufacturer.has(mfr)) {
          this.indexByManufacturer.set(mfr, new Set());
        }
        this.indexByManufacturer.get(mfr)?.add(id);
      }
      
      // Index by type
      if (machine.type && typeof machine.type === 'string') {
        const type = machine.type.toLowerCase();
        if (!this.indexByType.has(type)) {
          this.indexByType.set(type, new Set());
        }
        this.indexByType.get(type)?.add(id);
      }
      
      // Index by controller
      if (machine.controller?.manufacturer && typeof machine.controller.manufacturer === 'string') {
        const ctrl = machine.controller.manufacturer.toLowerCase();
        if (!this.indexByController.has(ctrl)) {
          this.indexByController.set(ctrl, new Set());
        }
        this.indexByController.get(ctrl)?.add(id);
      }
    }
  }

  /**
   * Get machine by ID
   */
  getMachine(id: string): Machine | undefined {
    return this.get(id);
  }

  /**
   * Get machine by ID or model name
   */
  getByIdOrModel(identifier: string): Machine | undefined {
    if (!identifier) return undefined;
    
    // Try direct ID lookup
    let machine = this.get(identifier);
    if (machine) return machine;
    
    // Try searching by model name
    const lower = identifier.toLowerCase();
    for (const entry of this.entries.values()) {
      const m = entry?.data;
      if (!m) continue;
      try {
        if (m.model && typeof m.model === 'string' && m.model.toLowerCase() === lower) return m;
        if (m.manufacturer && m.model && typeof m.manufacturer === 'string' && typeof m.model === 'string' &&
            `${m.manufacturer} ${m.model}`.toLowerCase() === lower) return m;
        if (m.name && typeof m.name === 'string' && m.name.toLowerCase() === lower) return m;
      } catch { continue; }
    }
    
    // Try partial match
    for (const entry of this.entries.values()) {
      const m = entry?.data;
      if (!m) continue;
      try {
        if (m.model && typeof m.model === 'string' && m.model.toLowerCase().includes(lower)) return m;
        if (m.name && typeof m.name === 'string' && m.name.toLowerCase().includes(lower)) return m;
      } catch { continue; }
    }
    
    return undefined;
  }

  /**
   * Get machine by manufacturer and model
   */
  getByModel(manufacturer: string, model: string): Machine | undefined {
    const mfrMachines = this.indexByManufacturer.get(manufacturer.toLowerCase());
    if (!mfrMachines) return undefined;
    
    for (const id of mfrMachines) {
      const machine = this.get(id);
      if (machine?.model.toLowerCase() === model.toLowerCase()) {
        return machine;
      }
    }
    return undefined;
  }

  /**
   * Search machines with filters
   */
  search(options: {
    query?: string;
    manufacturer?: string;
    type?: string;
    controller?: string;
    min_x_travel?: number;
    min_y_travel?: number;
    min_z_travel?: number;
    min_spindle_rpm?: number;
    min_spindle_power?: number;
    min_tool_capacity?: number;
    simultaneous_axes?: number;
    high_speed?: boolean;
    limit?: number;
    offset?: number;
  }): { machines: Machine[]; total: number } {
    let results: Machine[] = [];
    
    // Start with manufacturer filter
    if (options.manufacturer) {
      const ids = this.indexByManufacturer.get(options.manufacturer.toLowerCase());
      if (ids) {
        results = Array.from(ids).map(id => this.get(id)!).filter(Boolean);
      }
    } else if (options.type) {
      const ids = this.indexByType.get(options.type.toLowerCase());
      if (ids) {
        results = Array.from(ids).map(id => this.get(id)!).filter(Boolean);
      }
    } else if (options.controller) {
      const ids = this.indexByController.get(options.controller.toLowerCase());
      if (ids) {
        results = Array.from(ids).map(id => this.get(id)!).filter(Boolean);
      }
    } else {
      results = this.all();
    }
    
    // Apply additional filters — treat "*" or empty as "return all"
    if (options.query && options.query !== "*") {
      const query = options.query.toLowerCase();
      results = results.filter(m => {
        try {
          return String(m.name || "").toLowerCase().includes(query) ||
            String(m.model || "").toLowerCase().includes(query) ||
            String(m.manufacturer || "").toLowerCase().includes(query);
        } catch { return false; }
      });
    }
    
    if (options.min_x_travel !== undefined) {
      results = results.filter(m => m.envelope.x_travel >= options.min_x_travel!);
    }
    
    if (options.min_y_travel !== undefined) {
      results = results.filter(m => m.envelope.y_travel >= options.min_y_travel!);
    }
    
    if (options.min_z_travel !== undefined) {
      results = results.filter(m => m.envelope.z_travel >= options.min_z_travel!);
    }
    
    if (options.min_spindle_rpm !== undefined) {
      results = results.filter(m => m.spindle.max_rpm >= options.min_spindle_rpm!);
    }
    
    if (options.min_spindle_power !== undefined) {
      results = results.filter(m => m.spindle.power_continuous >= options.min_spindle_power!);
    }
    
    if (options.min_tool_capacity !== undefined) {
      results = results.filter(m => m.tool_changer.capacity >= options.min_tool_capacity!);
    }
    
    if (options.simultaneous_axes !== undefined) {
      results = results.filter(m => m.simultaneous_axes >= options.simultaneous_axes!);
    }
    
    if (options.high_speed) {
      results = results.filter(m => m.high_speed_machining);
    }
    
    const total = results.length;
    
    // Pagination
    const offset = options.offset || 0;
    const limit = options.limit || 20;
    const paged = results.slice(offset, offset + limit);
    
    return { machines: paged, total, hasMore: offset + paged.length < total };
  }

  /**
   * Get machines by manufacturer
   */
  getByManufacturer(manufacturer: string): Machine[] {
    const ids = this.indexByManufacturer.get(manufacturer.toLowerCase());
    if (!ids) return [];
    return Array.from(ids).map(id => this.get(id)!).filter(Boolean);
  }

  /**
   * Get machines by type
   */
  getByType(type: string): Machine[] {
    const ids = this.indexByType.get(type.toLowerCase());
    if (!ids) return [];
    return Array.from(ids).map(id => this.get(id)!).filter(Boolean);
  }

  /**
   * Get machines by controller
   */
  getByController(controller: string): Machine[] {
    const ids = this.indexByController.get(controller.toLowerCase());
    if (!ids) return [];
    return Array.from(ids).map(id => this.get(id)!).filter(Boolean);
  }

  /**
   * Get capability matrix for a machine
   */
  getCapabilities(id: string): {
    machining_envelope: { x: number; y: number; z: number };
    spindle_capability: { rpm: number; power: number; torque: number };
    axis_count: number;
    simultaneous_axes: number;
    tool_capacity: number;
    features: string[];
  } | undefined {
    const machine = this.get(id);
    if (!machine) return undefined;
    
    const features: string[] = [];
    if (machine.high_speed_machining) features.push("high_speed_machining");
    if (machine.rigid_tapping) features.push("rigid_tapping");
    if (machine.probing_ready) features.push("probing_ready");
    if (machine.automation_ready) features.push("automation_ready");
    if (machine.spindle.coolant_through) features.push("coolant_through_spindle");
    
    return {
      machining_envelope: {
        x: machine.envelope.x_travel,
        y: machine.envelope.y_travel,
        z: machine.envelope.z_travel
      },
      spindle_capability: {
        rpm: machine.spindle.max_rpm,
        power: machine.spindle.power_continuous,
        torque: machine.spindle.torque_max
      },
      axis_count: machine.axes.length,
      simultaneous_axes: machine.simultaneous_axes,
      tool_capacity: machine.tool_changer.capacity,
      features
    };
  }

  /**
   * Find machines suitable for a job
   */
  findSuitableMachines(requirements: {
    min_envelope: { x?: number; y?: number; z?: number };
    min_spindle_rpm?: number;
    min_spindle_power?: number;
    simultaneous_axes?: number;
    controller_preference?: string[];
  }): Machine[] {
    return this.all().filter(m => {
      if (requirements.min_envelope.x && m.envelope.x_travel < requirements.min_envelope.x) return false;
      if (requirements.min_envelope.y && m.envelope.y_travel < requirements.min_envelope.y) return false;
      if (requirements.min_envelope.z && m.envelope.z_travel < requirements.min_envelope.z) return false;
      if (requirements.min_spindle_rpm && m.spindle.max_rpm < requirements.min_spindle_rpm) return false;
      if (requirements.min_spindle_power && m.spindle.power_continuous < requirements.min_spindle_power) return false;
      if (requirements.simultaneous_axes && m.simultaneous_axes < requirements.simultaneous_axes) return false;
      if (requirements.controller_preference?.length) {
        const ctrl = m.controller.manufacturer.toLowerCase();
        if (!requirements.controller_preference.some(p => ctrl.includes(p.toLowerCase()))) return false;
      }
      return true;
    });
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    byManufacturer: Record<string, number>;
    byType: Record<string, number>;
    byController: Record<string, number>;
    withLevel5: number;
  } {
    const stats = {
      total: this.entries.size,
      byManufacturer: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      byController: {} as Record<string, number>,
      withLevel5: 0
    };
    
    for (const [mfr, ids] of this.indexByManufacturer) {
      stats.byManufacturer[mfr] = ids.size;
    }
    
    for (const [type, ids] of this.indexByType) {
      stats.byType[type] = ids.size;
    }
    
    for (const [ctrl, ids] of this.indexByController) {
      stats.byController[ctrl] = ids.size;
    }
    
    for (const machine of this.all()) {
      if (machine.layer === "LEVEL5") stats.withLevel5++;
    }
    
    return stats;
  }
}

// Singleton instance
export const machineRegistry = new MachineRegistry();
