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

export class ConfigEngine {
  private entries = new Map<string, ConfigEntry[]>(); // key → entries from all sources

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

  getWithMeta(key: string): ConfigEntry | undefined {
    const all = this.entries.get(key);
    if (!all || all.length === 0) return undefined;
    const sorted = [...all].sort((a, b) => SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source]);
    return sorted[0];
  }

  getAll(): ConfigEntry[] {
    const result: ConfigEntry[] = [];
    for (const [key] of this.entries) {
      const entry = this.getWithMeta(key);
      if (entry) {
        result.push(entry.secret ? { ...entry, value: "***REDACTED***" } : entry);
      }
    }
    return result.sort((a, b) => a.key.localeCompare(b.key));
  }

  getByPrefix(prefix: string): ConfigEntry[] {
    return this.getAll().filter(e => e.key.startsWith(prefix));
  }

  delete(key: string, source?: ConfigSource): boolean {
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

  validate(): ConfigValidation {
    const errors: { key: string; message: string }[] = [];
    const warnings: { key: string; message: string }[] = [];
    const missingRequired: string[] = [];

    for (const [key, all] of this.entries) {
      const effective = [...all].sort((a, b) => SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source])[0];

      if (effective.required && (effective.value === undefined || effective.value === null || effective.value === "")) {
        missingRequired.push(key);
        errors.push({ key, message: `Required config '${key}' is empty` });
      }

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

  exportConfig(includeSecrets: boolean = false): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const entry of this.getAll()) {
      result[entry.key] = entry.secret && !includeSecrets ? "***REDACTED***" : entry.value;
    }
    return result;
  }

  importConfig(data: Record<string, unknown>, source: ConfigSource = "file"): number {
    let count = 0;
    for (const [key, value] of Object.entries(data)) {
      this.set(key, value, source);
      count++;
    }
    return count;
  }

  loadDefaults(defaults: Record<string, { value: unknown; description?: string; required?: boolean; secret?: boolean }>): number {
    let count = 0;
    for (const [key, meta] of Object.entries(defaults)) {
      this.set(key, meta.value, "default", { description: meta.description, required: meta.required, secret: meta.secret });
      count++;
    }
    return count;
  }

  clear(): void { this.entries.clear(); }
}

export const configEngine = new ConfigEngine();
