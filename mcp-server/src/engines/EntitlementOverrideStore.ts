/**
 * PRISM MCP Server -- EntitlementOverrideStore (U-COMM-05)
 *
 * Per-seat feature entitlement overrides: a shop admin grants/revokes a specific
 * feature for a specific user WITHIN the plan ceiling. Semantics (pricing spec
 * section 4): an override can only RESTRICT below the plan -- it never grants
 * above it. So:
 *   - override[feature] === false  -> DENY (admin restricted this user)
 *   - override absent OR === true   -> the plan ceiling decides (no-op deny-wise)
 * This is the "what a shop allows users to pay for / access" control.
 *
 * Mirrors SubscriptionStore: in-memory Map + lazy sync load + fail-loud on a
 * corrupt existing file (never reset-then-clobber).
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { safeWriteSync } from "../utils/atomicWrite.js";

/** Per-user override map: feature key -> granted (false = explicitly denied). */
export type OverrideMap = Record<string, boolean>;

interface StoreFile {
  schemaVersion: number;
  overrides: Record<string, OverrideMap>;
}

const SCHEMA_VERSION = 1;

function defaultPath(): string {
  return join(process.cwd(), "data", "state", "entitlement-overrides.json");
}

export class EntitlementOverrideStore {
  readonly engineName = "EntitlementOverrideStore";
  readonly version = "1.0.0";

  private readonly path: string;
  private map: Map<string, OverrideMap> | null = null;

  constructor(path?: string) {
    this.path = path ?? defaultPath();
  }

  private ensureLoaded(): Map<string, OverrideMap> {
    if (this.map) return this.map;
    const m = new Map<string, OverrideMap>();
    if (existsSync(this.path)) {
      let raw: string;
      try {
        raw = readFileSync(this.path, "utf-8");
      } catch (e) {
        throw new Error(`EntitlementOverrideStore: cannot read ${this.path}: ${(e as Error).message}`);
      }
      let parsed: StoreFile;
      try {
        parsed = JSON.parse(raw) as StoreFile;
      } catch (e) {
        throw new Error(`EntitlementOverrideStore: corrupt store at ${this.path} (refusing to reset-then-clobber): ${(e as Error).message}`);
      }
      if (parsed && parsed.overrides && typeof parsed.overrides === "object") {
        for (const [uid, ov] of Object.entries(parsed.overrides)) {
          if (ov && typeof ov === "object") m.set(uid, ov);
        }
      }
    }
    this.map = m;
    return m;
  }

  private persist(): void {
    const m = this.ensureLoaded();
    const file: StoreFile = { schemaVersion: SCHEMA_VERSION, overrides: Object.fromEntries(m) };
    safeWriteSync(this.path, JSON.stringify(file, null, 2));
  }

  /** All overrides for a user (empty object if none). */
  getOverrides(userId: string | undefined | null): OverrideMap {
    if (!userId) return {};
    return { ...(this.ensureLoaded().get(userId) ?? {}) };
  }

  /**
   * True if a feature is explicitly DENIED for a user (override === false).
   * The single predicate the entitlement check consults; absent/true -> not denied.
   */
  isDenied(userId: string | undefined | null, feature: string): boolean {
    if (!userId || !feature) return false;
    return this.ensureLoaded().get(userId)?.[feature] === false;
  }

  /** Set a per-seat override. granted=false denies; granted=true clears the denial. */
  setOverride(userId: string, feature: string, granted: boolean): OverrideMap {
    if (!userId) throw new Error("EntitlementOverrideStore.setOverride: userId required");
    if (!feature) throw new Error("EntitlementOverrideStore.setOverride: feature required");
    const m = this.ensureLoaded();
    const ov = { ...(m.get(userId) ?? {}) };
    ov[feature] = granted;
    m.set(userId, ov);
    this.persist();
    return ov;
  }

  /** Remove a single override (revert to plan-decides for that feature). */
  removeOverride(userId: string, feature: string): void {
    const m = this.ensureLoaded();
    const ov = m.get(userId);
    if (ov && feature in ov) {
      delete ov[feature];
      if (Object.keys(ov).length === 0) m.delete(userId);
      else m.set(userId, ov);
      this.persist();
    }
  }

  /** All overrides, keyed by userId (for the admin UI). */
  listAll(): Record<string, OverrideMap> {
    return Object.fromEntries(this.ensureLoaded());
  }

  /** Test/maintenance: force reload on next access. */
  invalidate(): void {
    this.map = null;
  }
}

export const entitlementOverrideStore = new EntitlementOverrideStore();
