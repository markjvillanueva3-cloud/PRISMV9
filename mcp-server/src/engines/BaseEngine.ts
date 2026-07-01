// WIRE-EXEMPT: Abstract base class, not a standalone engine - tested via subclasses
/**
 * BaseEngine — Abstract base class for all PRISM engines.
 *
 * Provides common patterns for engine lifecycle, validation, and capability exposure.
 */

export interface EngineInfo {
  name: string;
  version: string;
  domain: string;
  description: string;
}

export interface EngineCapability {
  name: string;
  description: string;
  actions?: string[];
  /** Optional input contract description (free-text shape hint). */
  input?: string;
  /** Optional output contract description (free-text shape hint). */
  output?: string;
}

export abstract class BaseEngine {
  protected info: EngineInfo;

  constructor(info: EngineInfo) {
    this.info = info;
  }

  getInfo(): EngineInfo {
    return this.info;
  }

  abstract getCapabilities(): EngineCapability[];

  abstract validate(input: unknown): string | null;

  protected abstract executeImpl(input: unknown): Promise<unknown>;

  async execute(input: unknown): Promise<unknown> {
    const error = this.validate(input);
    if (error) {
      throw new Error(`Validation failed: ${error}`);
    }
    return this.executeImpl(input);
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    return { healthy: true };
  }
}
