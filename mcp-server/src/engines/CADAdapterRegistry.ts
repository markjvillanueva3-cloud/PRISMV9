/**
 * CADAdapterRegistry — U-CUIX-P0-19 / CAD-UIX-MS0
 *
 * Central registry mapping `CADSystemId` → ICADCodeGenerator adapter singleton.
 * The `cadAutomationDispatcher` uses this to route build_script / execute_script /
 * validate_script / list_capabilities / list_systems actions to the correct
 * adapter without the dispatcher importing every adapter directly (lazy
 * import pattern per dispatcher conventions).
 *
 * Currently registers 4 of 14 CAD_SYSTEMS adapters:
 *   - freecad   → FreeCADCodeGeneratorEngine
 *   - fusion360 → Fusion360CADGeneratorAdapter
 *   - inventor  → InventorCADGeneratorAdapter
 *   - mastercam → MastercamCADGeneratorAdapter
 *
 * Future rounds add hypercad_s (U-CUIX-P0-17), solidworks (U-CUIX-P0-18),
 * plus 8 more (cadquery/catia_v5/creo/nx/onshape/rhino/inventor_hsm) per the
 * CAD_UIX-MS0 envelope.
 *
 * @module engines/CADAdapterRegistry
 */

import type {
  CADSystemId,
  ICADCodeGenerator,
  CADCapabilityMatrix,
} from "../interfaces/ICADCodeGenerator.js";

/**
 * Registered CAD adapter singletons keyed by CADSystemId.
 * Each value is an ICADCodeGenerator-shaped object that can buildScript,
 * executeScript, and validateOutput.
 */
interface AdapterEntry {
  cadSystem: CADSystemId;
  /** Lazy getter — avoids eagerly importing every CAD engine at module load. */
  get(): Promise<ICADCodeGenerator>;
  /** Short human-readable description of what this adapter covers. */
  description: string;
  /** True if this adapter can run in Node test environment without live CAD. */
  canBuildScriptInTest: boolean;
  /** True if executeScript requires a live CAD process (subprocess/COM/REST). */
  requiresLiveHost: boolean;
}

// Lazy-loading to stay consistent with dispatcher lazy-import pattern and
// avoid dragging ~2000 LOC per adapter into any test that touches this registry.
const REGISTRY: ReadonlyMap<CADSystemId, AdapterEntry> = new Map<
  CADSystemId,
  AdapterEntry
>([
  [
    "freecad",
    {
      cadSystem: "freecad",
      async get() {
        const mod = await import("./FreeCADCodeGeneratorEngine.js");
        return mod.freeCADCodeGeneratorEngine;
      },
      description: "FreeCAD 0.19–1.0+ Python recipe generator (OSS, no license)",
      canBuildScriptInTest: true,
      requiresLiveHost: true,
    },
  ],
  [
    "fusion360",
    {
      cadSystem: "fusion360",
      async get() {
        const mod = await import("./Fusion360CodeGeneratorEngine.js");
        return mod.fusion360CADGeneratorAdapter;
      },
      description: "Fusion 360 adsk.core + adsk.fusion Python emission (cm + rad native)",
      canBuildScriptInTest: true,
      requiresLiveHost: true,
    },
  ],
  [
    "inventor",
    {
      cadSystem: "inventor",
      async get() {
        const mod = await import("./InventorCAMCodeGeneratorEngine.js");
        return mod.inventorCADGeneratorAdapter;
      },
      description: "Inventor iLogic VB.NET emission (mm string format, COM-gated)",
      canBuildScriptInTest: true,
      requiresLiveHost: true,
    },
  ],
  [
    "mastercam",
    {
      cadSystem: "mastercam",
      async get() {
        const mod = await import("./MastercamCodeGeneratorEngine.js");
        return mod.mastercamCodeGeneratorEngine;
      },
      description: "Mastercam NetHook3 C# emission (mm + deg native, license-gated)",
      canBuildScriptInTest: true,
      requiresLiveHost: true,
    },
  ],
]);

/** Complete set of CAD_SYSTEMS declared in ICADCodeGenerator.ts. */
const ALL_CAD_SYSTEMS: ReadonlySet<CADSystemId> = new Set<CADSystemId>([
  "freecad",
  "fusion360",
  "cadquery",
  "inventor",
  "inventor_hsm",
  "solidworks",
  "mastercam",
  "hypermill",
  "hypercad_s",
  "catia_v5",
  "creo",
  "nx",
  "onshape",
  "rhino",
]);

/** Systems currently implemented (4 of 14 as of U-CUIX-P0-19). */
export const CAD_REGISTERED_SYSTEMS: ReadonlyArray<CADSystemId> = Array.from(
  REGISTRY.keys(),
).sort() as CADSystemId[];

/** Systems declared but not yet implemented — callers get a typed error. */
export const CAD_UNREGISTERED_SYSTEMS: ReadonlyArray<CADSystemId> = Array.from(
  ALL_CAD_SYSTEMS,
)
  .filter((s) => !REGISTRY.has(s))
  .sort() as CADSystemId[];

export class UnknownCADSystemError extends Error {
  readonly code = "UNKNOWN_CAD_SYSTEM";
  readonly requested: string;
  readonly registered: ReadonlyArray<CADSystemId>;
  constructor(requested: string) {
    super(
      `CAD system "${requested}" is not registered. Registered: ${CAD_REGISTERED_SYSTEMS.join(
        ", ",
      )}. Unregistered (scoped in CAD-UIX-MS0 but not yet implemented): ${CAD_UNREGISTERED_SYSTEMS.join(
        ", ",
      )}.`,
    );
    this.name = "UnknownCADSystemError";
    this.requested = requested;
    this.registered = CAD_REGISTERED_SYSTEMS;
  }
}

/**
 * Fetch a registered CAD adapter singleton.
 * @throws {UnknownCADSystemError} if `cadSystem` is not in `CAD_REGISTERED_SYSTEMS`.
 */
export async function getCADAdapter(
  cadSystem: CADSystemId | string,
): Promise<ICADCodeGenerator> {
  const entry = REGISTRY.get(cadSystem as CADSystemId);
  if (!entry) throw new UnknownCADSystemError(cadSystem);
  return entry.get();
}

/** Is this CAD system currently registered? */
export function isCADSystemRegistered(
  cadSystem: CADSystemId | string,
): boolean {
  return REGISTRY.has(cadSystem as CADSystemId);
}

/** Human-readable description for a registered CAD. */
export function getCADAdapterDescription(
  cadSystem: CADSystemId,
): string | undefined {
  return REGISTRY.get(cadSystem)?.description;
}

/** True when execute_script requires a live licensed CAD host. */
export function cadAdapterRequiresLiveHost(
  cadSystem: CADSystemId,
): boolean {
  return REGISTRY.get(cadSystem)?.requiresLiveHost ?? false;
}

/**
 * List every registered CAD with its capability matrix snapshot.
 * Forces loading all adapters (acceptable cost — caller explicitly asked
 * for the full capability list).
 */
export async function listAllCapabilities(): Promise<
  ReadonlyArray<{
    cadSystem: CADSystemId;
    description: string;
    capabilities: CADCapabilityMatrix;
    supportedOpsCount: number;
  }>
> {
  const out: Array<{
    cadSystem: CADSystemId;
    description: string;
    capabilities: CADCapabilityMatrix;
    supportedOpsCount: number;
  }> = [];
  for (const entry of REGISTRY.values()) {
    const adapter = await entry.get();
    const caps = adapter.getCapabilities();
    out.push({
      cadSystem: entry.cadSystem,
      description: entry.description,
      capabilities: caps,
      supportedOpsCount: caps.supportedOps.size,
    });
  }
  // Deterministic order for MCP clients.
  return out.sort((a, b) => a.cadSystem.localeCompare(b.cadSystem));
}

/**
 * Full registry inventory (including unregistered systems) for MCP clients
 * that want to see both coverage and gaps.
 */
export function listAllCADSystems(): {
  registered: ReadonlyArray<{ cadSystem: CADSystemId; description: string }>;
  unregistered: ReadonlyArray<CADSystemId>;
  totalDeclared: number;
  coverageRatio: number;
} {
  const registered: Array<{ cadSystem: CADSystemId; description: string }> = [];
  for (const e of REGISTRY.values()) {
    registered.push({ cadSystem: e.cadSystem, description: e.description });
  }
  registered.sort((a, b) => a.cadSystem.localeCompare(b.cadSystem));
  return {
    registered,
    unregistered: CAD_UNREGISTERED_SYSTEMS,
    totalDeclared: ALL_CAD_SYSTEMS.size,
    coverageRatio: registered.length / ALL_CAD_SYSTEMS.size,
  };
}
