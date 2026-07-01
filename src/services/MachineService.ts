/**
 * MachineService — Concrete implementation of IMachineService.
 * Delegates to MachineRegistry singleton for all data access.
 */

import { machineRegistry, type Machine } from "../registries/MachineRegistry.js";
import type { IMachineService, MachineSearchOptions, MachineRequirements } from "./interfaces/IMachineService.js";

export class MachineService implements IMachineService {
  getMachine(id: string): Machine | undefined {
    return machineRegistry.getMachine(id);
  }

  getByIdOrModel(identifier: string): Machine | undefined {
    return machineRegistry.getByIdOrModel(identifier);
  }

  search(options: MachineSearchOptions): Machine[] {
    const result = machineRegistry.search({
      query: options.query,
      manufacturer: options.manufacturer,
      type: options.type,
      controller: options.controller,
      limit: options.limit,
    });
    return result.machines;
  }

  getByManufacturer(manufacturer: string): Machine[] {
    return machineRegistry.getByManufacturer(manufacturer);
  }

  getByType(type: string): Machine[] {
    return machineRegistry.getByType(type);
  }

  findSuitableMachines(requirements: MachineRequirements): Machine[] {
    return machineRegistry.findSuitableMachines({
      min_spindle_rpm: requirements.minSpindleSpeed,
      min_spindle_power: requirements.minPower,
      simultaneous_axes: requirements.axisCount,
      min_envelope: {
        x: requirements.travelX,
        y: requirements.travelY,
        z: requirements.travelZ,
      },
    });
  }

  getCount(): number {
    return machineRegistry.count();
  }
}

/** Singleton instance */
export const machineService = new MachineService();
