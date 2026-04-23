/**
 * IMachineService — Service contract for machine data access.
 * Wraps MachineRegistry so engines don't import registry singletons directly.
 */

import type { Machine } from "../../registries/MachineRegistry.js";

export interface MachineSearchOptions {
  query?: string;
  manufacturer?: string;
  type?: string;
  controller?: string;
  limit?: number;
}

export interface MachineRequirements {
  minSpindleSpeed?: number;
  minPower?: number;
  minTorque?: number;
  axisCount?: number;
  machineType?: string;
  travelX?: number;
  travelY?: number;
  travelZ?: number;
}

export interface IMachineService {
  /** Get machine by ID */
  getMachine(id: string): Machine | undefined;

  /** Find machine by ID or model name */
  getByIdOrModel(identifier: string): Machine | undefined;

  /** Search machines with filters */
  search(options: MachineSearchOptions): Machine[];

  /** Get machines by manufacturer */
  getByManufacturer(manufacturer: string): Machine[];

  /** Get machines by type (mill, lathe, etc.) */
  getByType(type: string): Machine[];

  /** Find machines meeting specific requirements */
  findSuitableMachines(requirements: MachineRequirements): Machine[];

  /** Get machine count */
  getCount(): number;
}
