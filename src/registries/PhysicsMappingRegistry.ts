/**
 * PhysicsMappingRegistry — Aggregated Physics Mapping Index
 *
 * Aggregates ALL physics parameter mappings from all 4 HyperMill mapping engines:
 *   1. HyperMillKienzleMappingEngine       (KIENZLE_MAPPINGS,            ~560)
 *   2. HyperMillSpeedFeedMappingEngine     (SPEEDFEED_MAPPINGS,          ~501)
 *   3. HyperMillDeflectionThermalMappingEngine (DEFLECTION_THERMAL_MAPPINGS, ~580+)
 *   4. HyperMillSurfaceQualityMappingEngine (SURFACE_QUALITY_MAPPINGS,   ~301)
 *
 * Provides:
 *   - Normalized union type `PhysicsMappingEntry` across all 4 sources
 *   - O(1) lookup by parameterId via Map index
 *   - Query methods: getByParameterId, getByDomain, getByEngine, getCoverageReport
 *   - Coverage report: { totalMappings, byDomain, byEngine, coveragePercent }
 *
 * Usage:
 *   import { physicsMappingRegistry, TOTAL_PHYSICS_MAPPINGS } from './PhysicsMappingRegistry.js';
 *   const entry = physicsMappingRegistry.getByParameterId('turning.od_turning.feed_per_rev');
 *   const report = physicsMappingRegistry.getCoverageReport();
 *
 * @domain PhysicsMapping-Registry
 * @milestone HM-KC-MS8/U-HKC43
 */

import {
  KIENZLE_MAPPINGS,
  type PhysicsMapping,
} from "../engines/hypermill/HyperMillKienzleMappingEngine.js";

import {
  SPEEDFEED_MAPPINGS,
  type SpeedFeedMapping,
} from "../engines/hypermill/HyperMillSpeedFeedMappingEngine.js";

import {
  DEFLECTION_THERMAL_MAPPINGS,
  type DeflectionThermalMapping,
} from "../engines/hypermill/HyperMillDeflectionThermalMappingEngine.js";

import {
  SURFACE_QUALITY_MAPPINGS,
  type SurfaceQualityMapping,
} from "../engines/hypermill/HyperMillSurfaceQualityMappingEngine.js";

import {
  NONCAM_MAPPINGS,
  type NonCAMMapping,
} from "../engines/hypermill/HyperMillNonCAMMappingEngine.js";

// ── Union type ─────────────────────────────────────────────────────────────────

/**
 * Source engine tag that identifies which mapping registry an entry originates from.
 */
export type MappingSource =
  | "kienzle"
  | "speedfeed"
  | "deflection_thermal"
  | "surface_quality"
  | "noncam";

/**
 * Normalized union type wrapping all 5 mapping entry types.
 * All entries are tagged with a `source` discriminator for type-narrowing.
 */
export type PhysicsMappingEntry =
  | (PhysicsMapping & { source: "kienzle" })
  | (SpeedFeedMapping & { source: "speedfeed" })
  | (DeflectionThermalMapping & { source: "deflection_thermal" })
  | (SurfaceQualityMapping & { source: "surface_quality" })
  | (NonCAMMapping & { source: "noncam" });

// ── Coverage report ────────────────────────────────────────────────────────────

/**
 * Coverage report returned by getCoverageReport().
 */
export interface PhysicsCoverageReport {
  /** Total number of physics mappings across all 4 engines */
  totalMappings: number;
  /** Mapping count per CAM parameter domain */
  byDomain: Record<string, number>;
  /** Mapping count per target physics engine */
  byEngine: Record<string, number>;
  /** Mapping count per source registry */
  bySource: Record<MappingSource, number>;
  /** Percentage of domains that have at least one mapping (0–100) */
  coveragePercent: number;
}

// ── Known domains for coverage calculation ─────────────────────────────────────

/**
 * Complete set of HyperMill CAM domains considered for coverage calculation.
 * Derived from the union of all 4 mapping engine domains.
 */
const KNOWN_DOMAINS = new Set([
  // Kienzle + SpeedFeed + DeflectionThermal shared domains
  "drilling", "twoD", "threeD", "fiveAxis", "turning", "probing",
  "grinding", "cuttingData",
  // DeflectionThermal additional domain names
  "3d_milling", "5axis_milling", "2d_milling", "linking",
  // NonCAM domains (HM-KC-MS8-S3)
  "cad", "fixture", "settings",
]);

// ── Internal normalization helpers ────────────────────────────────────────────

/** Tag all Kienzle mappings with source discriminator */
function tagKienzle(entries: PhysicsMapping[]): PhysicsMappingEntry[] {
  return entries.map((e) => ({ ...e, source: "kienzle" as const }));
}

/** Tag all SpeedFeed mappings with source discriminator */
function tagSpeedFeed(entries: SpeedFeedMapping[]): PhysicsMappingEntry[] {
  return entries.map((e) => ({ ...e, source: "speedfeed" as const }));
}

/** Tag all DeflectionThermal mappings with source discriminator */
function tagDeflectionThermal(entries: DeflectionThermalMapping[]): PhysicsMappingEntry[] {
  return entries.map((e) => ({ ...e, source: "deflection_thermal" as const }));
}

/** Tag all SurfaceQuality mappings with source discriminator */
function tagSurfaceQuality(entries: SurfaceQualityMapping[]): PhysicsMappingEntry[] {
  return entries.map((e) => ({ ...e, source: "surface_quality" as const }));
}

/** Tag all NonCAM mappings with source discriminator */
function tagNonCAM(entries: NonCAMMapping[]): PhysicsMappingEntry[] {
  return entries.map((e) => ({ ...e, source: "noncam" as const }));
}

// ── Master mapping array ───────────────────────────────────────────────────────

/**
 * All physics mappings from all 4 engines, normalized and tagged.
 * Built once at module load — zero runtime overhead for repeated queries.
 */
const ALL_MAPPINGS: PhysicsMappingEntry[] = [
  ...tagKienzle(KIENZLE_MAPPINGS),
  ...tagSpeedFeed(SPEEDFEED_MAPPINGS),
  ...tagDeflectionThermal(DEFLECTION_THERMAL_MAPPINGS),
  ...tagSurfaceQuality(SURFACE_QUALITY_MAPPINGS),
  ...tagNonCAM(NONCAM_MAPPINGS),
];

/**
 * Total count of physics mappings across all 4 source registries.
 * Exported as a named constant for import by test files.
 */
export const TOTAL_PHYSICS_MAPPINGS: number = ALL_MAPPINGS.length;

// ── O(1) parameterId index ─────────────────────────────────────────────────────

/**
 * Map index keyed by parameterId for O(1) lookup.
 * Last-write wins when parameterId is duplicated across sources (surface quality
 * entries override when same ID appears in multiple engines).
 */
function buildIndex(entries: PhysicsMappingEntry[]): Map<string, PhysicsMappingEntry> {
  const index = new Map<string, PhysicsMappingEntry>();
  for (const entry of entries) {
    index.set(entry.parameterId, entry);
  }
  return index;
}

const PARAMETER_INDEX: Map<string, PhysicsMappingEntry> = buildIndex(ALL_MAPPINGS);

// ── Coverage report builder ────────────────────────────────────────────────────

function buildCoverageReport(): PhysicsCoverageReport {
  const byDomain: Record<string, number> = {};
  const byEngine: Record<string, number> = {};
  const bySource: Record<MappingSource, number> = {
    kienzle: 0,
    speedfeed: 0,
    deflection_thermal: 0,
    surface_quality: 0,
    noncam: 0,
  };

  for (const entry of ALL_MAPPINGS) {
    // Domain
    const domain = entry.parameterDomain;
    byDomain[domain] = (byDomain[domain] ?? 0) + 1;

    // Engine — normalize field name across union types
    let engine = "unknown";
    if (entry.source === "kienzle") {
      engine = (entry as PhysicsMapping & { source: "kienzle" }).engineRef;
    } else if (entry.source === "speedfeed") {
      engine = (entry as SpeedFeedMapping & { source: "speedfeed" }).targetEngine;
    } else if (entry.source === "deflection_thermal") {
      engine = (entry as DeflectionThermalMapping & { source: "deflection_thermal" }).targetEngine;
    } else if (entry.source === "surface_quality") {
      engine = (entry as SurfaceQualityMapping & { source: "surface_quality" }).targetEngine;
    } else if (entry.source === "noncam") {
      engine = (entry as NonCAMMapping & { source: "noncam" }).targetEngine;
    }
    byEngine[engine] = (byEngine[engine] ?? 0) + 1;

    // Source
    bySource[entry.source]++;
  }

  // Coverage = fraction of known domains that have at least one mapping
  const coveredDomains = Object.keys(byDomain).filter((d) => KNOWN_DOMAINS.has(d)).length;
  const coveragePercent = Math.round((coveredDomains / KNOWN_DOMAINS.size) * 100);

  return {
    totalMappings: ALL_MAPPINGS.length,
    byDomain,
    byEngine,
    bySource,
    coveragePercent,
  };
}

/** Pre-computed coverage report — available at import, zero overhead */
const COVERAGE_REPORT: PhysicsCoverageReport = buildCoverageReport();

// ── Registry class ─────────────────────────────────────────────────────────────

/**
 * PhysicsMappingRegistry
 *
 * Aggregated index of all 4 hyperMILL physics mapping engines.
 * All methods are O(1) or O(k) where k = result set size.
 * No I/O, no side effects — pure query over pre-built in-memory structures.
 */
export class PhysicsMappingRegistry {
  /**
   * Look up a single physics mapping by its fully qualified parameterId.
   * O(1) — uses pre-built Map index.
   *
   * @param parameterId - e.g. "turning.od_turning.feed_per_rev"
   * @returns The matching PhysicsMappingEntry or undefined if not found
   */
  getByParameterId(parameterId: string): PhysicsMappingEntry | undefined {
    return PARAMETER_INDEX.get(parameterId);
  }

  /**
   * Returns all physics mappings for a given CAM parameter domain.
   *
   * @param domain - e.g. "turning", "threeD", "fiveAxis", "drilling", "3d_milling"
   * @returns Filtered array of PhysicsMappingEntry values for the domain
   */
  getByDomain(domain: string): PhysicsMappingEntry[] {
    return ALL_MAPPINGS.filter((e) => e.parameterDomain === domain);
  }

  /**
   * Returns all physics mappings targeting a specific physics engine.
   *
   * @param engineName - Engine name, e.g. "KienzleForceModelEngine",
   *                     "SpeedFeedOrchestratorEngine", "SurfaceFinishPredictorEngine"
   * @returns Filtered array of PhysicsMappingEntry values targeting that engine
   */
  getByEngine(engineName: string): PhysicsMappingEntry[] {
    return ALL_MAPPINGS.filter((entry) => {
      if (entry.source === "kienzle") {
        return (entry as PhysicsMapping & { source: "kienzle" }).engineRef === engineName;
      } else if (entry.source === "speedfeed") {
        return (entry as SpeedFeedMapping & { source: "speedfeed" }).targetEngine === engineName;
      } else if (entry.source === "deflection_thermal") {
        return (entry as DeflectionThermalMapping & { source: "deflection_thermal" }).targetEngine === engineName;
      } else if (entry.source === "surface_quality") {
        return (entry as SurfaceQualityMapping & { source: "surface_quality" }).targetEngine === engineName;
      }
      return false;
    });
  }

  /**
   * Returns all physics mappings from a specific source registry.
   *
   * @param source - "kienzle" | "speedfeed" | "deflection_thermal" | "surface_quality"
   * @returns Filtered array of PhysicsMappingEntry values from that source
   */
  getBySource(source: MappingSource): PhysicsMappingEntry[] {
    return ALL_MAPPINGS.filter((e) => e.source === source);
  }

  /**
   * Returns the pre-computed coverage report.
   *
   * @returns PhysicsCoverageReport with totalMappings, byDomain, byEngine, coveragePercent
   */
  getCoverageReport(): PhysicsCoverageReport {
    return COVERAGE_REPORT;
  }

  /**
   * Returns all distinct domain names present in the registry.
   *
   * @returns Array of unique domain name strings
   */
  getDomains(): string[] {
    return Object.keys(COVERAGE_REPORT.byDomain);
  }

  /**
   * Returns all distinct physics engine names referenced in the registry.
   *
   * @returns Array of unique engine name strings
   */
  getEngineNames(): string[] {
    return Object.keys(COVERAGE_REPORT.byEngine);
  }

  /**
   * Returns total count of mappings in the registry (all 4 sources combined).
   *
   * @returns Total number of PhysicsMappingEntry values
   */
  getTotalCount(): number {
    return ALL_MAPPINGS.length;
  }

  /**
   * Returns the count of unique parameterIds in the registry.
   * Some IDs may appear in multiple source engines (Map deduplicates them).
   *
   * @returns Number of unique parameterId strings
   */
  getUniqueParameterCount(): number {
    return PARAMETER_INDEX.size;
  }
}

/** Singleton registry instance — import this for all lookups */
export const physicsMappingRegistry = new PhysicsMappingRegistry();
