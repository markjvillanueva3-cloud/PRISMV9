/**
 * PRISM Engine Contract — IEngine Interface
 *
 * Every PRISM engine should implement this interface to provide a standard
 * contract for execution, validation, and capability discovery.
 *
 * This is opt-in for existing engines. New engines created after ARCH-MS4
 * will be enforced by the engine-contract-enforcer hook.
 *
 * @see BaseEngine for a default implementation with logging and Zod validation
 * @see registries/base.ts (BaseRegistry) for the analogous pattern in registries
 */

import type { ZodSchema } from "zod";

/** Result of an engine execution with metadata */
export interface EngineResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  /** Execution duration in milliseconds */
  durationMs?: number;
  /** Source engine that produced this result */
  source: string;
}

/** Describes what an engine can do */
export interface EngineCapability {
  /** Human-readable name of this capability */
  name: string;
  /** Brief description */
  description: string;
  /** Dispatcher actions that invoke this capability */
  actions?: string[];
}

/** Engine metadata for discovery and routing */
export interface EngineInfo {
  /** Unique engine name (PascalCase, e.g., "KienzleForceModelEngine") */
  name: string;
  /** Semantic version */
  version: string;
  /** Domain category (e.g., "physics", "cam", "business", "quality") */
  domain: string;
  /** Brief description of what this engine does */
  description: string;
}

/**
 * Core engine contract. All PRISM engines should implement this interface.
 *
 * Design principles:
 * - Engines are pure calculation — no direct I/O, no module-level mutable state
 * - All inputs validated before execution
 * - Results wrapped in EngineResult with source attribution
 * - Capabilities discoverable for routing and documentation
 */
export interface IEngine {
  /** Engine metadata */
  readonly info: EngineInfo;

  /**
   * Execute the engine's primary computation.
   * @param input - Validated input parameters
   * @returns EngineResult wrapping the output or error
   */
  execute(input: unknown): Promise<EngineResult> | EngineResult;

  /**
   * Validate input before execution.
   * Returns null/undefined if valid, or an error message string if invalid.
   * Implementations may use Zod schemas internally.
   */
  validate(input: unknown): string | null | undefined;

  /**
   * List the capabilities this engine provides.
   * Used for routing, documentation, and /arch-health reporting.
   */
  getCapabilities(): EngineCapability[];

  /**
   * Optional: Return the Zod schema for input validation.
   * Enables automatic schema-driven validation in BaseEngine.
   */
  getInputSchema?(): ZodSchema;

  /**
   * Optional: Health check — verify the engine can operate
   * (e.g., required registries loaded, constants available).
   */
  healthCheck?(): Promise<{ healthy: boolean; message?: string }>;
}
