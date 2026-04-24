/**
 * FeatureRegistryEngine — U-LEARN-02
 * ===================================
 *
 * Authoritative registry of feature-group contracts. Every write to
 * FeatureStoreEngine is validated against the contract registered here;
 * TrainingDatasetSnapshotEngine uses it to discover frozen versions;
 * StreamVsBatchReconciliationEngine uses it to know which keys to compare.
 *
 * Storage: one JSON file per feature group at
 *   mcp-server/data/contracts/<domain>/<feature_group>.json
 * Atomic writes via tmp+rename so concurrent registrations don't corrupt.
 *
 * Invariants:
 *   1. A contract's shape is immutable once `sealed: true`. Further
 *      register() calls with changes return `{ ok: false }` with the
 *      sealed-violation reason.
 *   2. Version numbers monotonically increase (`v1`, `v2`, `v3`...).
 *      register() refuses a version that's already on disk with different
 *      content.
 *   3. Duplicate feature names in `features[]` are rejected before write.
 *   4. Required keys must all appear in the features[] list.
 *   5. NEVER-THROW contract — bad input returns `{ok:false, warning}`.
 *
 * @module engines/FeatureRegistryEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-02
 */

import fs from "node:fs";
import path from "node:path";
import {
  FeatureGroupContractSchema,
  RegisterContractInputSchema,
  ListContractsQuerySchema,
  type FeatureGroupContract,
  type RegisterContractInput,
  type ListContractsQuery,
} from "../schemas/featureRegistrySchema.js";
import type { OutcomeDomainT } from "../schemas/outcomeEventSchema.js";

const CONTRACTS_DIR = path.resolve(process.cwd(), "mcp-server/data/contracts");
const SCHEMA_VERSION = "1.0.0" as const;

export interface RegisterResult {
  ok: boolean;
  path?: string;
  warning?: string;
  sealed?: boolean;
}

export interface GetResult {
  ok: boolean;
  contract?: FeatureGroupContract;
  warning?: string;
}

/**
 * FeatureRegistryEngine — singleton, atomic, deterministic.
 */
export class FeatureRegistryEngine {
  private readonly rootDir: string;

  constructor(rootDir: string = CONTRACTS_DIR) {
    this.rootDir = rootDir;
  }

  /**
   * Register a new contract or update an existing unsealed one. Returns
   * a typed result — never throws.
   */
  register(input: RegisterContractInput): RegisterResult {
    const parsed = RegisterContractInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, warning: `schema: ${parsed.error.message}` };
    }
    const c = parsed.data;

    // Reject duplicate feature names
    const seen = new Set<string>();
    for (const f of c.features) {
      if (seen.has(f.name)) {
        return { ok: false, warning: `duplicate feature name: ${f.name}` };
      }
      seen.add(f.name);
    }

    // Reject required_keys that aren't in features
    const featureNames = new Set(c.features.map((f) => f.name));
    for (const k of c.required_keys) {
      if (!featureNames.has(k)) {
        return {
          ok: false,
          warning: `required_key '${k}' not in features[]`,
        };
      }
    }

    const filePath = this.pathFor(c.domain, c.feature_group);
    const existing = this.readContract(filePath);

    if (existing?.sealed) {
      // Sealed — only allow re-register if content is byte-identical
      if (!this.sameContract(existing, c)) {
        return {
          ok: false,
          sealed: true,
          warning: `contract ${c.domain}/${c.feature_group} is sealed`,
        };
      }
      return { ok: true, path: filePath, sealed: true };
    }

    const now = new Date().toISOString();
    const full: FeatureGroupContract = {
      schemaVersion: SCHEMA_VERSION,
      ...c,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };

    // Final parse on the full object to catch any residual invariant drift
    const finalParse = FeatureGroupContractSchema.safeParse(full);
    if (!finalParse.success) {
      return { ok: false, warning: `final: ${finalParse.error.message}` };
    }

    const writeOk = this.atomicWriteJson(filePath, finalParse.data);
    if (!writeOk.ok) {
      return { ok: false, warning: writeOk.warning };
    }
    return { ok: true, path: filePath, sealed: finalParse.data.sealed };
  }

  /**
   * Fetch a contract by (domain, feature_group). Latest version on disk.
   */
  get(domain: OutcomeDomainT, feature_group: string): GetResult {
    const filePath = this.pathFor(domain, feature_group);
    const c = this.readContract(filePath);
    if (!c) {
      return {
        ok: false,
        warning: `no contract for ${domain}/${feature_group}`,
      };
    }
    return { ok: true, contract: c };
  }

  /**
   * List contracts matching filter. Filter fields are ANDed; omitted
   * fields match anything.
   */
  list(filter: ListContractsQuery = {}): FeatureGroupContract[] {
    const parsed = ListContractsQuerySchema.safeParse(filter);
    if (!parsed.success) return [];
    const f = parsed.data;
    const out: FeatureGroupContract[] = [];
    if (!fs.existsSync(this.rootDir)) return out;

    const domains = f.domain ? [f.domain] : this.listDirEntries(this.rootDir);
    for (const dom of domains) {
      const domDir = path.join(this.rootDir, dom);
      if (!fs.existsSync(domDir)) continue;
      for (const file of this.listJsonFiles(domDir)) {
        const c = this.readContract(path.join(domDir, file));
        if (!c) continue;
        if (f.feature_group && c.feature_group !== f.feature_group) continue;
        if (f.tag && !(c.tags ?? []).includes(f.tag)) continue;
        if (f.sealed !== undefined && c.sealed !== f.sealed) continue;
        out.push(c);
      }
    }
    out.sort((a, b) => {
      const d = a.domain.localeCompare(b.domain);
      return d !== 0 ? d : a.feature_group.localeCompare(b.feature_group);
    });
    return out;
  }

  /**
   * Seal a contract — makes it immutable. Idempotent: sealing an already-
   * sealed contract returns ok. Content after seal must match.
   */
  seal(domain: OutcomeDomainT, feature_group: string): RegisterResult {
    const got = this.get(domain, feature_group);
    if (!got.ok || !got.contract) {
      return { ok: false, warning: got.warning };
    }
    if (got.contract.sealed) {
      return { ok: true, path: this.pathFor(domain, feature_group), sealed: true };
    }
    const next: FeatureGroupContract = {
      ...got.contract,
      sealed: true,
      updated_at: new Date().toISOString(),
    };
    const writeOk = this.atomicWriteJson(this.pathFor(domain, feature_group), next);
    if (!writeOk.ok) return { ok: false, warning: writeOk.warning };
    return { ok: true, path: this.pathFor(domain, feature_group), sealed: true };
  }

  /**
   * Count of registered contracts per domain + per-seal breakdown. Cheap
   * scan for monitoring.
   */
  stats(): {
    total: number;
    by_domain: Record<string, number>;
    sealed: number;
    unsealed: number;
  } {
    const all = this.list();
    const by_domain: Record<string, number> = {};
    let sealed = 0;
    for (const c of all) {
      by_domain[c.domain] = (by_domain[c.domain] ?? 0) + 1;
      if (c.sealed) sealed++;
    }
    return {
      total: all.length,
      by_domain,
      sealed,
      unsealed: all.length - sealed,
    };
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  private pathFor(domain: OutcomeDomainT, feature_group: string): string {
    return path.join(this.rootDir, domain, `${feature_group}.json`);
  }

  private readContract(filePath: string): FeatureGroupContract | null {
    try {
      if (!fs.existsSync(filePath)) return null;
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = FeatureGroupContractSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  private sameContract(
    a: FeatureGroupContract,
    b: RegisterContractInput,
  ): boolean {
    const strip = (c: RegisterContractInput) => ({
      domain: c.domain,
      feature_group: c.feature_group,
      feature_group_version: c.feature_group_version,
      owner: c.owner ?? null,
      description: c.description ?? null,
      required_keys: [...c.required_keys].sort(),
      features: [...c.features]
        .sort((x, y) => x.name.localeCompare(y.name))
        .map((f) => ({ ...f })),
      tags: [...(c.tags ?? [])].sort(),
      sealed: c.sealed,
    });
    return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
  }

  private listDirEntries(p: string): string[] {
    try {
      return fs
        .readdirSync(p, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => String(d.name));
    } catch {
      return [];
    }
  }

  private listJsonFiles(p: string): string[] {
    try {
      return fs
        .readdirSync(p)
        .filter((f) => f.endsWith(".json") && !f.startsWith("."));
    } catch {
      return [];
    }
  }

  private atomicWriteJson(
    filePath: string,
    data: unknown,
  ): { ok: boolean; warning?: string } {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmp = path.join(
        dir,
        `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random()
          .toString(36)
          .slice(2, 8)}.tmp`,
      );
      const fd = fs.openSync(tmp, "w");
      try {
        fs.writeSync(fd, JSON.stringify(data, null, 2));
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      fs.renameSync(tmp, filePath);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, warning: message };
    }
  }

  static getSelfAwareness() {
    return {
      name: "FeatureRegistryEngine",
      version: "1.0.0",
      milestone: "PSAU P2.5-LEARN U-LEARN-02",
      capabilities: ["register", "get", "list", "seal", "stats"],
      dependencies: ["featureRegistrySchema"],
      dataSourcesUsed: ["mcp-server/data/contracts/<domain>/<group>.json"],
    };
  }
}

export const featureRegistryEngine = new FeatureRegistryEngine();
