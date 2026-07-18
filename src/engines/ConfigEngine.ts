/**
 * ConfigEngine — L2-P3-MS1 Infrastructure Layer
 *
 * Configuration management with hierarchical overrides, environment
 * variable integration, validation, and hot-reload support.
 *
 * Actions: config_get, config_set, config_list, config_validate,
 *          config_export, config_import
 */

// ============================================================================
// TYPES
// ============================================================================

export type ConfigSource = "default" | "file" | "env" | "runtime" | "tenant";

/** Config Entry configuration/data structure.
 */
export interface ConfigEntry {
  key: string;
  value: unknown;
  source: ConfigSource;
  type: "string" | "number" | "boolean" | "json";
  description?: string;
  required: boolean;
  secret: boolean;
  updated_at: string;
}

/** Config Validation configuration/data structure.
 */
export interface ConfigValidation {
  valid: boolean;
  errors: { key: string; message: string }[];
  warnings: { key: string; message: string }[];
  missing_required: string[];
}

// ============================================================================
// SOURCE PRIORITY (higher overrides lower)
// ============================================================================

const SOURCE_PRIORITY: Record<ConfigSource, number> = { default: 0, file: 1, env: 2, runtime: 3, tenant: 4 };

// ============================================================================
// ENGINE CLASS
// ============================================================================

/** Config Engine engine/manager.
 */
export class ConfigEngine {
  private entries = new Map<string, ConfigEntry[]>(); // key → entries from all sources

  /** Set.
   * @param key - key identifier
   * @param value - value to set
   * @param source - source
   * @param meta - meta
   * @returns void
   */
  set(key: string, value: unknown, source: ConfigSource = "runtime", meta?: { description?: string; required?: boolean; secret?: boolean }): void {
    const type = typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : typeof value === "object" ? "json" : "string";
    const entry: ConfigEntry = {
      key, value, source, type,
      description: meta?.description,
      required: meta?.required ?? false,
      secret: meta?.secret ?? false,
      updated_at: new Date().toISOString(),
    };

    const existing = this.entries.get(key) || [];
    const idx = existing.findIndex(e => e.source === source);
    if (idx >= 0) existing[idx] = entry;
    else existing.push(entry);
    this.entries.set(key, existing);
  }

  get<T = unknown>(key: string): T | undefined {
    const all = this.entries.get(key);
    if (!all || all.length === 0) return undefined;

    // Return highest priority source
    const sorted = [...all].sort((a, b) => SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source]);
    return sorted[0].value as T;
  }

  /** Gets with meta.
   * @param key - key identifier
   * @returns config entry | undefined
   */
  getWithMeta(key: string): ConfigEntry | undefined {
    const all = this.entries.get(key);
    if (!all || all.length === 0) return undefined;
    const sorted = [...all].sort((a, b) => SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source]);
    return sorted[0];
  }

  /** Gets all.
   * @returns config entry[]
   */
  getAll(): ConfigEntry[] {
    const result: ConfigEntry[] = [];
    /** For.
     * @param const - const
     * @returns void
     */
    for (const [key] of this.entries) {
      const entry = this.getWithMeta(key);
      /** If.
       * @param entry - entry
       * @returns void
       */
      if (entry) {
        result.push(entry.secret ? { ...entry, value: "***REDACTED***" } : entry);
      }
    }
    return result.sort((a, b) => a.key.localeCompare(b.key));
  }

  /** Gets by prefix.
   * @param prefix - prefix
   * @returns config entry[]
   */
  getByPrefix(prefix: string): ConfigEntry[] {
    return this.getAll().filter(e => e.key.startsWith(prefix));
  }

  /** Delete.
   * @param key - key identifier
   * @param source - source
   * @returns true if condition is met
   */
  delete(key: string, source?: ConfigSource): boolean {
    /** If.
     * @param source - source
     * @returns void
     */
    if (source) {
      const all = this.entries.get(key);
      if (!all) return false;
      const filtered = all.filter(e => e.source !== source);
      if (filtered.length === 0) this.entries.delete(key);
      else this.entries.set(key, filtered);
      return true;
    }
    return this.entries.delete(key);
  }

  /** Validate.
   * @returns config validation
   */
  validate(): ConfigValidation {
    const errors: { key: string; message: string }[] = [];
    const warnings: { key: string; message: string }[] = [];
    const missingRequired: string[] = [];

    /** For.
     * @param const - const
     * @param all] - all]
     * @returns void
     */
    for (const [key, all] of this.entries) {
      const effective = [...all].sort((a, b) => SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source])[0];

      if (effective.required && (effective.value === undefined || effective.value === null || effective.value === "")) {
        missingRequired.push(key);
        errors.push({ key, message: `Required config '${key}' is empty` });
      }

      /** If.
       * @param effective.type - effective.type
       * @returns void
       */
      if (effective.type === "number" && typeof effective.value !== "number") {
        warnings.push({ key, message: `Config '${key}' expected number but got ${typeof effective.value}` });
      }
    }

    return {
      valid: errors.length === 0,
      errors, warnings,
      missing_required: missingRequired,
    };
  }

  /** Exports config.
   * @param includeSecrets - include secrets
   * @returns record<string, unknown>
   */
  exportConfig(includeSecrets: boolean = false): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const entry of this.getAll()) {
      result[entry.key] = entry.secret && !includeSecrets ? "***REDACTED***" : entry.value;
    }
    return result;
  }

  /** Imports config.
   * @param data - input data
   * @param unknown> - unknown>
   * @param source - source
   * @returns computed numeric result
   */
  importConfig(data: Record<string, unknown>, source: ConfigSource = "file"): number {
    let count = 0;
    for (const [key, value] of Object.entries(data)) {
      this.set(key, value, source);
      count++;
    }
    return count;
  }

  /** Loads defaults.
   * @param defaults - defaults
   * @param { - {
   * @returns computed numeric result
   */
  loadDefaults(defaults: Record<string, { value: unknown; description?: string; required?: boolean; secret?: boolean }>): number {
    let count = 0;
    for (const [key, meta] of Object.entries(defaults)) {
      this.set(key, meta.value, "default", { description: meta.description, required: meta.required, secret: meta.secret });
      count++;
    }
    return count;
  }

  /** Clear.
   * @returns void { this.entries.clear(); }
   */
  clear(): void { this.entries.clear(); }
}

/** Config Engine constant.
 */
export const configEngine = new ConfigEngine();
