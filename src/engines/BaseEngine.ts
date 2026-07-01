/**
 * PRISM BaseEngine — Abstract base class implementing IEngine
 *
 * Provides default implementations for validation (Zod-based), logging,
 * execution timing, and error wrapping. Subclasses override executeImpl()
 * for their specific computation.
 *
 * Pattern mirrors BaseRegistry from src/registries/base.ts:
 * - BaseRegistry: base for data access (get/set/search)
 * - BaseEngine:   base for computation (validate/execute/capabilities)
 *
 * Usage:
 * ```typescript
 * class MyEngine extends BaseEngine {
 *   constructor() {
 *     super({
 *       name: "MyEngine",
 *       version: "1.0.0",
 *       domain: "physics",
 *       description: "Computes something useful"
 *     });
 *   }
 *
 *   protected async executeImpl(input: MyInput): Promise<MyOutput> {
 *     // Pure computation here
 *     return result;
 *   }
 *
 *   getCapabilities(): EngineCapability[] {
 *     return [{ name: "compute", description: "Does the thing" }];
 *   }
 * }
 * ```
 */

import type { ZodSchema } from "zod";
import { log } from "../utils/Logger.js";
import type {
  IEngine,
  EngineResult,
  EngineCapability,
  EngineInfo,
} from "./IEngine.js";

export abstract class BaseEngine implements IEngine {
  readonly info: EngineInfo;

  constructor(info: EngineInfo) {
    this.info = info;
  }

  /**
   * Execute with automatic validation, timing, logging, and error wrapping.
   * Subclasses should NOT override this — override executeImpl() instead.
   */
  async execute(input: unknown): Promise<EngineResult> {
    const start = performance.now();

    // Validate input
    const validationError = this.validate(input);
    if (validationError) {
      return {
        success: false,
        error: `Validation failed: ${validationError}`,
        source: this.info.name,
        durationMs: performance.now() - start,
      };
    }

    try {
      const data = await this.executeImpl(input);
      const durationMs = performance.now() - start;

      log.debug(
        `${this.info.name}.execute completed in ${durationMs.toFixed(1)}ms`
      );

      return {
        success: true,
        data,
        source: this.info.name,
        durationMs,
      };
    } catch (err) {
      const durationMs = performance.now() - start;
      const message =
        err instanceof Error ? err.message : String(err);

      log.warn(`${this.info.name}.execute failed: ${message}`);

      return {
        success: false,
        error: message,
        source: this.info.name,
        durationMs,
      };
    }
  }

  /**
   * Validate input using the Zod schema if provided, otherwise pass-through.
   * Subclasses can override for custom validation logic.
   */
  validate(input: unknown): string | null {
    const schema = this.getInputSchema?.();
    if (!schema) return null;

    const result = schema.safeParse(input);
    if (result.success) return null;

    return result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
  }

  /**
   * Override in subclasses to provide a Zod schema for automatic validation.
   */
  getInputSchema?(): ZodSchema;

  /**
   * Override in subclasses to list engine capabilities.
   */
  abstract getCapabilities(): EngineCapability[];

  /**
   * Override in subclasses with the engine's core computation.
   * This is called after validation succeeds.
   */
  protected abstract executeImpl(input: unknown): Promise<unknown> | unknown;

  /**
   * Default health check — subclasses can override with registry/service checks.
   */
  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    return { healthy: true };
  }
}
