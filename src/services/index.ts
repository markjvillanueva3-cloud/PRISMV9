/**
 * PRISM MCP Server - Services Index
 * Re-exports all service modules and interfaces.
 *
 * Service Layer (ARCH-MS0):
 * - MaterialService: Wraps MaterialRegistry (2,957+ materials)
 * - MachineService: Wraps MachineRegistry (910+ machines)
 * - ToolService: Wraps ToolRegistry (95,608+ tools)
 * - PhysicsConstantsService: Wraps src/physics/constants.ts (canonical Kienzle/Taylor/thermal)
 * - ConfigService: Shop rates, pricing policy, setup times
 *
 * Existing Services:
 * - UserMachineProfileService: User machine profile management
 * - FileUserMachineProfileRepository: File-backed profile storage
 * - TaskClaimService: Task claiming for roadmap execution
 * - RoadmapLoader: Roadmap milestone loading
 * - CalculatorToolCribWorkspaceService: Calculator workspace management
 */

// Service interfaces
export type {
  IMaterialService,
  MaterialSearchOptions,
  IMachineService,
  MachineSearchOptions,
  MachineRequirements,
  IToolService,
  ToolSearchOptions,
  IPhysicsConstantsService,
  PhysicsConstant,
  KienzleData,
  IConfigService,
  ShopConfig,
  PricingMarkup,
} from "./interfaces/index.js";

// Concrete service implementations + singletons
export { MaterialService, materialService } from "./MaterialService.js";
export { MachineService, machineService } from "./MachineService.js";
export { ToolService, toolService } from "./ToolService.js";
export { PhysicsConstantsService, physicsConstantsService } from "./PhysicsConstantsService.js";
export { ConfigService, configService } from "./ConfigService.js";

// Existing services
export {
  UserMachineProfileService,
  validateUserMachineProfileOverlay,
  buildUserMachineProfileReadModel,
  type UserMachineProfileRepository,
} from "./UserMachineProfileService.js";
export {
  FileUserMachineProfileRepository,
  fileUserMachineProfileRepository,
} from "./FileUserMachineProfileRepository.js";
export * as TaskClaimService from "./TaskClaimService.js";
export * as RoadmapLoader from "./RoadmapLoader.js";
export { CalculatorToolCribWorkspaceService } from "./CalculatorToolCribWorkspaceService.js";
