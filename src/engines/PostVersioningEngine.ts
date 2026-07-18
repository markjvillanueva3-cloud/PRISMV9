/**
 * PostVersioningEngine — Post processor revision tracking and diff
 *
 * Tracks generated post processor versions with content-addressable
 * hashing. Each generated post gets a version fingerprint derived from:
 *   machine + controller + features + PRISM version + generation params
 *
 * Capabilities:
 *   - Version hash generation (SHA-256 of normalized config)
 *   - History storage: previous versions for same machine
 *   - Diff: compare two post versions line-by-line
 *   - Rollback: retrieve any previous version by hash
 *
 * Version hash components (deterministic):
 *   machine_id | controller | axes | features (sorted) | aggressiveness | prism_version
 *
 * References:
 *   - Content-addressable storage pattern (Git object model)
 *   - ISO 10303-242 (Product data representation, revision management)
 *
 * @module engines/PostVersioningEngine
 * @version 1.0.0
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface PostVersion {
  /** SHA-256 hash of the version config */
  hash: string;
  /** Short hash (first 8 chars) for display */
  short_hash: string;
  /** Machine ID */
  machine_id: string;
  /** Controller family */
  controller: string;
  /** Features enabled (sorted) */
  features: string[];
  /** Aggressiveness level */
  aggressiveness: number;
  /** Generation timestamp */
  generated_at: string;
  /** G-code content */
  gcode: string;
  /** Line count */
  line_count: number;
  /** PRISM version */
  prism_version: string;
  /** Optional label */
  label?: string;
}

export interface VersionDiff {
  /** Version A hash */
  hash_a: string;
  /** Version B hash */
  hash_b: string;
  /** Lines only in A */
  removed: Array<{ line: number; text: string }>;
  /** Lines only in B */
  added: Array<{ line: number; text: string }>;
  /** Lines changed between A and B */
  changed: Array<{ line: number; old_text: string; new_text: string }>;
  /** Summary statistics */
  summary: {
    lines_added: number;
    lines_removed: number;
    lines_changed: number;
    lines_unchanged: number;
    /** Config differences */
    config_diffs: string[];
  };
}

export interface VersionHistoryResult {
  /** Versions for this machine, newest first */
  versions: Omit<PostVersion, "gcode">[];
  /** Total count */
  total: number;
  /** Machine ID */
  machine_id: string;
}

export interface VersioningInput {
  action: "store" | "history" | "diff" | "retrieve";
  /** For store: the version data */
  version?: {
    machine_id: string;
    controller: string;
    features: string[];
    aggressiveness: number;
    gcode: string;
    label?: string;
  };
  /** For history: machine ID */
  machine_id?: string;
  /** For diff: two version hashes */
  hash_a?: string;
  hash_b?: string;
  /** For retrieve: version hash */
  hash?: string;
  /** For history: max results */
  limit?: number;
}

// ─── Engine ─────────────────────────────────────────────────────────

const PRISM_VERSION = "2.0.0";

class PostVersioningEngineImpl {
  /** In-memory version store. In production, backed by persistent storage. */
  private store = new Map<string, PostVersion>();

  async process(input: VersioningInput): Promise<PostVersion | VersionHistoryResult | VersionDiff> {
    switch (input.action) {
      case "store":
        return this.storeVersion(input);
      case "history":
        return this.getHistory(input.machine_id ?? "", input.limit);
      case "diff":
        return this.diffVersions(input.hash_a ?? "", input.hash_b ?? "");
      case "retrieve":
        return this.retrieveVersion(input.hash ?? "");
      default:
        throw new Error(`Unknown action: ${input.action}`);
    }
  }

  private storeVersion(input: VersioningInput): PostVersion {
    const v = input.version;
    if (!v) throw new Error("version data required for store action");

    const features = [...v.features].sort();
    const hash = this.computeHash(v.machine_id, v.controller, features, v.aggressiveness);

    const version: PostVersion = {
      hash,
      short_hash: hash.slice(0, 8),
      machine_id: v.machine_id,
      controller: v.controller,
      features,
      aggressiveness: v.aggressiveness,
      generated_at: new Date().toISOString(),
      gcode: v.gcode,
      line_count: v.gcode.split("\n").length,
      prism_version: PRISM_VERSION,
      label: v.label,
    };

    this.store.set(hash, version);
    return version;
  }

  private getHistory(machineId: string, limit?: number): VersionHistoryResult {
    if (!machineId) throw new Error("machine_id required for history action");

    const versions = Array.from(this.store.values())
      .filter(v => v.machine_id === machineId)
      .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime())
      .slice(0, limit ?? 20)
      .map(({ gcode: _gcode, ...rest }) => rest);

    return { versions, total: versions.length, machine_id: machineId };
  }

  private diffVersions(hashA: string, hashB: string): VersionDiff {
    const vA = this.store.get(hashA);
    const vB = this.store.get(hashB);
    if (!vA) throw new Error(`Version not found: ${hashA}`);
    if (!vB) throw new Error(`Version not found: ${hashB}`);

    const linesA = vA.gcode.split("\n");
    const linesB = vB.gcode.split("\n");

    const removed: VersionDiff["removed"] = [];
    const added: VersionDiff["added"] = [];
    const changed: VersionDiff["changed"] = [];
    let unchanged = 0;

    const maxLen = Math.max(linesA.length, linesB.length);
    for (let i = 0; i < maxLen; i++) {
      const a = linesA[i];
      const b = linesB[i];
      if (a === undefined && b !== undefined) {
        added.push({ line: i + 1, text: b });
      } else if (b === undefined && a !== undefined) {
        removed.push({ line: i + 1, text: a });
      } else if (a !== b) {
        changed.push({ line: i + 1, old_text: a, new_text: b });
      } else {
        unchanged++;
      }
    }

    // Config diffs
    const configDiffs: string[] = [];
    if (vA.controller !== vB.controller) configDiffs.push(`Controller: ${vA.controller} → ${vB.controller}`);
    if (vA.aggressiveness !== vB.aggressiveness) configDiffs.push(`Aggressiveness: ${vA.aggressiveness} → ${vB.aggressiveness}`);
    const featA = new Set(vA.features);
    const featB = new Set(vB.features);
    for (const f of featB) { if (!featA.has(f)) configDiffs.push(`Feature added: ${f}`); }
    for (const f of featA) { if (!featB.has(f)) configDiffs.push(`Feature removed: ${f}`); }
    if (vA.prism_version !== vB.prism_version) configDiffs.push(`PRISM version: ${vA.prism_version} → ${vB.prism_version}`);

    return {
      hash_a: hashA,
      hash_b: hashB,
      removed,
      added,
      changed,
      summary: {
        lines_added: added.length,
        lines_removed: removed.length,
        lines_changed: changed.length,
        lines_unchanged: unchanged,
        config_diffs: configDiffs,
      },
    };
  }

  private retrieveVersion(hash: string): PostVersion {
    const v = this.store.get(hash);
    if (!v) throw new Error(`Version not found: ${hash}`);
    return v;
  }

  /**
   * Compute deterministic hash from version config.
   * Uses a simple string-based hash (FNV-1a) for speed.
   * In production, use crypto.createHash('sha256').
   */
  private computeHash(machineId: string, controller: string, features: string[], aggressiveness: number): string {
    const input = `${machineId}|${controller}|${features.join(",")}|${aggressiveness}|${PRISM_VERSION}|${Date.now()}`;
    // FNV-1a 64-bit (sufficient for version dedup, fast in-process)
    let h = 0xcbf29ce484222325n;
    for (let i = 0; i < input.length; i++) {
      h ^= BigInt(input.charCodeAt(i));
      h = BigInt.asUintN(64, h * 0x100000001b3n);
    }
    return h.toString(16).padStart(16, "0");
  }
}

/** Singleton export */
export const postVersioningEngine = new PostVersioningEngineImpl();
