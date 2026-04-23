/**
 * PRISM Service Interfaces — Re-exports all service contracts.
 *
 * These interfaces define the mediation layer between engines and data.
 * Engines import from here instead of importing registries directly.
 */

export type { IMaterialService, MaterialSearchOptions } from "./IMaterialService.js";
export type { IMachineService, MachineSearchOptions, MachineRequirements } from "./IMachineService.js";
export type { IToolService, ToolSearchOptions } from "./IToolService.js";
export type {
  IPhysicsConstantsService,
  PhysicsConstant,
  KienzleData,
} from "./IPhysicsConstantsService.js";
export type {
  IConfigService,
  ShopConfig,
  PricingMarkup,
} from "./IConfigService.js";
