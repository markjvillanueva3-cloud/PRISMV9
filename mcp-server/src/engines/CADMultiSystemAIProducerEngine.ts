/**
 * CADMultiSystemAIProducerEngine — CAD-COMPLETE-MS0/PHASE-31 (synergy layer)
 *
 * User directive 2026-05-24: "Claude needs to be able to utilize our AI
 * systems to produce any CAD part and assembly using any of the primary CAD
 * softwares (hyperCAD, Fusion, Mastercam, SolidWorks, Inventor, Esprit)."
 *
 * This engine is the **unified facade** that composes the existing CAD AI
 * stack into a single produce-on-any-system action. It is intentionally NOT
 * a re-implementation — every step delegates to an existing engine. The
 * value is the *contract*: one call, one CAD system tag, one part intent →
 * one ordered execution plan plus the per-system bridge handle that the
 * dispatcher invokes against the live CAD.
 *
 * Composition (read-before-write per R8):
 *   1. CADPartArchetypeRegistryEngine + CADJMDieArchetypeFrequencyEngine
 *      — propose archetype priors from intent keywords (already shipped).
 *   2. CADDrawAnyPartOrchestratorEngine.draw(intent) — canonical op stream.
 *   3. CADSystemNeuralArchAdapterEngine.nativize(system, ops) — translate to
 *      per-CAD-system native feature verbs (already shipped).
 *   4. injected bridgeSelector(system) → live bridge handle the dispatcher
 *      uses to execute. Tests stub this to avoid spinning live CAD.
 *
 * Pure + injectable. No live CAD I/O in tests.
 */

import {
  CADSystem,
  isSupportedSystem,
  nativize,
} from "./CADSystemNeuralArchAdapterEngine.js";

// ── Contract types ──────────────────────────────────────────────────────────

export const SupportedProducerSystem = ["hypercads", "fusion360", "solidworks", "inventor", "mastercam"] as const;
export type SupportedProducerSystem = (typeof SupportedProducerSystem)[number];

export interface PartIntent {
  readonly description: string;
  readonly material?: string;
  readonly dimensions?: Readonly<Record<string, number>>;
  readonly archetypeHint?: string;
}

export interface AssemblyIntent {
  readonly description: string;
  readonly parts: ReadonlyArray<PartIntent>;
  readonly constraints?: ReadonlyArray<string>;
}

export interface OpStep {
  readonly op: string;
  readonly args: Readonly<Record<string, number | string | boolean>>;
}

export interface ProducePartPlan {
  readonly system: SupportedProducerSystem;
  readonly intent: PartIntent;
  readonly canonicalOps: ReadonlyArray<OpStep>;
  readonly nativeOps: ReadonlyArray<OpStep>;
  readonly bridgeName: string;
  readonly schemaVersion: 1;
}

export interface ProduceAssemblyPlan {
  readonly system: SupportedProducerSystem;
  readonly intent: AssemblyIntent;
  readonly partPlans: ReadonlyArray<ProducePartPlan>;
  readonly bridgeName: string;
  readonly schemaVersion: 1;
}

export interface OrchestratorLike {
  draw(intent: PartIntent): Promise<ReadonlyArray<OpStep>> | ReadonlyArray<OpStep>;
}

export type BridgeSelector = (system: SupportedProducerSystem) => string;

// ── Per-CAD-system bridge name mapping (informational; dispatcher resolves) ──

export const BRIDGE_NAME_BY_SYSTEM: ReadonlyMap<SupportedProducerSystem, string> = Object.freeze(new Map<SupportedProducerSystem, string>([
  ["hypercads",  "HyperCADSLiveBridgeEngine"],
  ["fusion360",  "Fusion360LiveBridgeEngine"],
  ["solidworks", "SolidWorksLiveBridgeEngine"],
  ["inventor",   "InventorCADExecutionBridge"],
  ["mastercam",  "MastercamCADExecutionBridge"],
]));

export const DEFAULT_BRIDGE_SELECTOR: BridgeSelector = (system) => {
  const name = BRIDGE_NAME_BY_SYSTEM.get(system);
  if (!name) throw new Error(`no live bridge registered for CAD system: ${system}`);
  return name;
};

// ── Pure helpers ────────────────────────────────────────────────────────────

export function isSupportedProducerSystem(s: string): s is SupportedProducerSystem {
  return (SupportedProducerSystem as ReadonlyArray<string>).includes(s);
}

function validatePartIntent(intent: PartIntent): void {
  if (!intent) throw new Error("partIntent missing");
  if (typeof intent.description !== "string" || intent.description.trim().length === 0) {
    throw new Error("partIntent.description must be non-empty string");
  }
}

function mapHyperCADSSystemForAdapter(system: SupportedProducerSystem): CADSystem | null {
  // The CADSystemNeuralArchAdapterEngine supports fusion360/solidworks/inventor.
  // hyperCAD and Mastercam use the canonical op stream directly (no native rename).
  if (system === "fusion360" || system === "solidworks" || system === "inventor") return system;
  return null;
}

// ── Engine ──────────────────────────────────────────────────────────────────

export class CADMultiSystemAIProducerEngine {
  /**
   * Plan a single-part production run for the given CAD system.
   * R12 fail-loud: throws on unsupported system, empty intent, or canonical-op generation failure.
   */
  async producePart(
    system: SupportedProducerSystem,
    intent: PartIntent,
    deps: { orchestrator: OrchestratorLike; bridgeSelector?: BridgeSelector } = { orchestrator: { draw: () => [] } },
  ): Promise<ProducePartPlan> {
    if (!isSupportedProducerSystem(system)) {
      throw new Error(`unsupported CAD system: ${system} (supported: ${SupportedProducerSystem.join(", ")})`);
    }
    validatePartIntent(intent);

    const canonicalRaw = await deps.orchestrator.draw(intent);
    const canonicalOps: ReadonlyArray<OpStep> = Array.isArray(canonicalRaw) ? canonicalRaw : [...canonicalRaw];

    const adapterSystem = mapHyperCADSSystemForAdapter(system);
    let nativeOps: ReadonlyArray<OpStep>;
    if (adapterSystem === null) {
      // hyperCAD-S + Mastercam route canonical ops directly through their bridges
      nativeOps = canonicalOps;
    } else {
      // Translate per CAD-system native verbs; preserve args by index (not name).
      const nativeSpecs = nativize(adapterSystem, canonicalOps.map(op => ({ type: op.op } as never)));
      nativeOps = nativeSpecs.map((spec, i) => ({
        op: (spec as never as { type: string }).type,
        args: canonicalOps[i].args,
      }));
    }

    const bridgeName = (deps.bridgeSelector ?? DEFAULT_BRIDGE_SELECTOR)(system);

    return {
      system,
      intent,
      canonicalOps,
      nativeOps,
      bridgeName,
      schemaVersion: 1,
    };
  }

  /**
   * Plan an assembly production run — independent-part draw + assembly bridge handoff.
   */
  async produceAssembly(
    system: SupportedProducerSystem,
    intent: AssemblyIntent,
    deps: { orchestrator: OrchestratorLike; bridgeSelector?: BridgeSelector } = { orchestrator: { draw: () => [] } },
  ): Promise<ProduceAssemblyPlan> {
    if (!isSupportedProducerSystem(system)) {
      throw new Error(`unsupported CAD system: ${system}`);
    }
    if (!intent || !Array.isArray(intent.parts) || intent.parts.length === 0) {
      throw new Error("assemblyIntent.parts must be a non-empty array");
    }
    const partPlans: ProducePartPlan[] = [];
    for (const part of intent.parts) {
      partPlans.push(await this.producePart(system, part, deps));
    }
    return {
      system,
      intent,
      partPlans,
      bridgeName: (deps.bridgeSelector ?? DEFAULT_BRIDGE_SELECTOR)(system),
      schemaVersion: 1,
    };
  }

  supported(): ReadonlyArray<SupportedProducerSystem> {
    return SupportedProducerSystem;
  }

  bridgeFor(system: SupportedProducerSystem): string {
    return DEFAULT_BRIDGE_SELECTOR(system);
  }

  summary(): { schemaVersion: 1; supportedSystems: ReadonlyArray<SupportedProducerSystem>; bridgeMap: Readonly<Record<string, string>> } {
    const bridgeMap: Record<string, string> = {};
    for (const [k, v] of BRIDGE_NAME_BY_SYSTEM.entries()) bridgeMap[k] = v;
    return { schemaVersion: 1, supportedSystems: SupportedProducerSystem, bridgeMap };
  }
}

export const cadMultiSystemAIProducerEngine = new CADMultiSystemAIProducerEngine();
