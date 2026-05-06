/**
 * PeerRepoSignatureEngine — classify files from sibling H:/prism-* worktree
 * checkouts into asset signatures (engines, dispatchers, hooks, skills,
 * scripts) and diff against the canonical repo to surface peer-only assets
 * worth merging.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P16-U01.
 *
 * Why this exists
 * ---------------
 * 41+ sibling prism-* repos on H: each carry their own milestone work that
 * may or may not have backflowed into canonical. P16-U01 is the read-only
 * audit step: enumerate every sibling, classify their assets, diff against
 * canonical to find engines/hooks/skills the canonical PRISM is missing.
 * Output feeds P16-U02 (merge candidate review) and P16-U03 (merges).
 *
 * Pure functions; no fs I/O. The driver script
 * (scripts/peer-repo-signature-map.mjs) does the disk walks and feeds in
 * relative path lists.
 *
 * Machining-specific filter:
 *   The milestone explicitly asks to "Filter out machining-specific
 *   assets" — those live under domain-specific engines (mill / lathe /
 *   wedm / hypermill / mastercam / etc.) and are not "infrastructure"
 *   candidates. The filter is conservative — it errs on the side of
 *   excluding when a name looks domain-specific.
 *
 * @module engines/PeerRepoSignatureEngine
 */

const MACHINING_NAME_FRAGMENTS = [
  "mill", "lathe", "wedm", "hypermill", "mastercam", "fusion", "esprit",
  "solidcam", "powermill", "siemens", "nx", "catia", "inventor", "okuma",
  "fanuc", "haas", "hurco", "mitsubishi", "heidenhain", "sodick", "agie",
  "cnc", "gcode", "g-code", "macro", "kienzle", "taylor", "spindle",
  "tool-life", "toollife", "cutting-force", "edm", "grind", "weld",
  "swiss", "sinker", "dental", "blisk", "impeller", "rcsa", "frf",
  "post-processor", "postprocessor", "ppg-",
];

const MAX_REL_PATH_LEN = 500;

export type AssetKind = "engine" | "dispatcher" | "hook" | "skill" | "script" | "other";

export interface RepoSignature {
  /** Original repo root path (preserved verbatim, separator-normalized). */
  repo_root: string;
  engines: string[];        // basename without extension
  dispatchers: string[];
  hooks: string[];
  skills: string[];
  scripts: string[];
  /** Files filtered out as machining-specific — kept separate for inspection. */
  filtered_machining: string[];
}

export interface UniqueAssets {
  engines: string[];
  dispatchers: string[];
  hooks: string[];
  skills: string[];
  scripts: string[];
}

export interface PerRepoUniques {
  repo_root: string;
  unique_to_peer: UniqueAssets;
  unique_to_canonical: UniqueAssets;
  /** Sum across all kinds — useful for ranking peer repos by audit interest. */
  peer_only_count: number;
}

export interface AuditSummary {
  totalPeers: number;
  totalUniqueEnginesAcrossPeers: number;
  totalUniqueHooksAcrossPeers: number;
  totalUniqueSkillsAcrossPeers: number;
  /** Rank — peers ordered by peer_only_count desc. */
  peerRanking: Array<{ repo_root: string; peer_only_count: number }>;
}

export class PeerRepoSignatureEngine {
  /**
   * Classify a forward-slash repo-relative path into one of the asset kinds.
   * Returns "other" for paths that don't match a recognized asset family.
   */
  classifyFile(relPath: string): AssetKind {
    if (typeof relPath !== "string" || relPath.length === 0) return "other";
    const norm = relPath.replace(/\\/g, "/").toLowerCase();
    if (/(?:^|\/)mcp-server\/src\/engines\/[^/]+\.ts$/.test(norm)) return "engine";
    if (/(?:^|\/)mcp-server\/src\/tools\/dispatchers\/[^/]+\.ts$/.test(norm)) return "dispatcher";
    if (/(?:^|\/)\.claude\/hooks\/[^/]+\.(?:mjs|js|ts)$/.test(norm)) return "hook";
    if (/(?:^|\/)\.claude\/commands\/[^/]+\.md$/.test(norm)) return "skill";
    if (/(?:^|\/)(?:mcp-server\/)?scripts\/[^/]+\.(?:mjs|js|ts|sh|ps1|py)$/.test(norm)) return "script";
    return "other";
  }

  /**
   * Predicate: does this filename basename smell domain-specific (machining)?
   * Conservative — errs toward excluding when a name fragment matches the
   * machining vocabulary list (above). Use this to decide whether an asset
   * is infrastructure or applied.
   */
  isMachiningSpecific(filename: string): boolean {
    if (typeof filename !== "string" || filename.length === 0) return false;
    const lower = filename.toLowerCase();
    for (const frag of MACHINING_NAME_FRAGMENTS) {
      if (lower.includes(frag)) return true;
    }
    return false;
  }

  /**
   * Extract a stable basename (without extension) from a forward-slash path.
   * Used as the canonical asset name for diff'ing across repos.
   */
  basenameNoExt(relPath: string): string {
    if (typeof relPath !== "string" || relPath.length === 0) return "";
    const last = relPath.replace(/\\/g, "/").split("/").pop() ?? "";
    return last.replace(/\.[^.]+$/, "");
  }

  /**
   * Build a signature from one repo's flat list of relative paths.
   * Filters skip non-string / empty / oversize entries silently.
   */
  buildSignature(repoRoot: string, relPaths: readonly string[]): RepoSignature {
    const sig: RepoSignature = {
      repo_root: typeof repoRoot === "string" ? repoRoot.replace(/\\/g, "/") : "",
      engines: [],
      dispatchers: [],
      hooks: [],
      skills: [],
      scripts: [],
      filtered_machining: [],
    };
    if (!Array.isArray(relPaths)) return sig;
    const seen = new Set<string>();
    for (const raw of relPaths) {
      if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_REL_PATH_LEN) continue;
      const kind = this.classifyFile(raw);
      if (kind === "other") continue;
      const base = this.basenameNoExt(raw);
      if (base.length === 0) continue;
      const key = `${kind}:${base}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (this.isMachiningSpecific(base)) {
        sig.filtered_machining.push(`${kind}/${base}`);
        continue;
      }
      sig[(kind + "s") as "engines" | "dispatchers" | "hooks" | "skills" | "scripts"].push(base);
    }
    // Sort each list for stable output
    for (const k of ["engines", "dispatchers", "hooks", "skills", "scripts"] as const) {
      sig[k].sort();
    }
    sig.filtered_machining.sort();
    return sig;
  }

  /**
   * Symmetric diff between two signatures: which assets exist only in one.
   * Returns plain UniqueAssets-shaped object — empty arrays when nothing
   * unique exists.
   */
  diffSignatures(canonical: RepoSignature, peer: RepoSignature): {
    unique_to_peer: UniqueAssets;
    unique_to_canonical: UniqueAssets;
  } {
    const cmp = (a: readonly string[], b: readonly string[]) => {
      const setA = new Set(a);
      const setB = new Set(b);
      const onlyA: string[] = [];
      const onlyB: string[] = [];
      for (const x of a) if (!setB.has(x)) onlyA.push(x);
      for (const x of b) if (!setA.has(x)) onlyB.push(x);
      return { onlyA, onlyB };
    };
    const c = canonical ?? this.emptySignature("");
    const p = peer ?? this.emptySignature("");
    const eng = cmp(c.engines, p.engines);
    const dis = cmp(c.dispatchers, p.dispatchers);
    const hk  = cmp(c.hooks, p.hooks);
    const sk  = cmp(c.skills, p.skills);
    const sc  = cmp(c.scripts, p.scripts);
    return {
      unique_to_canonical: {
        engines: eng.onlyA, dispatchers: dis.onlyA, hooks: hk.onlyA,
        skills: sk.onlyA, scripts: sc.onlyA,
      },
      unique_to_peer: {
        engines: eng.onlyB, dispatchers: dis.onlyB, hooks: hk.onlyB,
        skills: sk.onlyB, scripts: sc.onlyB,
      },
    };
  }

  /**
   * Aggregate per-repo diffs into an audit summary. Peers are ranked by
   * peer_only_count descending so the audit-interest list surfaces top
   * candidates first.
   */
  summarize(perRepo: readonly PerRepoUniques[]): AuditSummary {
    const out: AuditSummary = {
      totalPeers: 0,
      totalUniqueEnginesAcrossPeers: 0,
      totalUniqueHooksAcrossPeers: 0,
      totalUniqueSkillsAcrossPeers: 0,
      peerRanking: [],
    };
    if (!Array.isArray(perRepo)) return out;
    const enginesUnion = new Set<string>();
    const hooksUnion = new Set<string>();
    const skillsUnion = new Set<string>();
    for (const r of perRepo) {
      if (!r || typeof r !== "object") continue;
      out.totalPeers++;
      out.peerRanking.push({
        repo_root: r.repo_root,
        peer_only_count: typeof r.peer_only_count === "number" && Number.isFinite(r.peer_only_count) ? r.peer_only_count : 0,
      });
      const u = r.unique_to_peer;
      if (u && typeof u === "object") {
        if (Array.isArray(u.engines)) for (const e of u.engines) enginesUnion.add(e);
        if (Array.isArray(u.hooks)) for (const h of u.hooks) hooksUnion.add(h);
        if (Array.isArray(u.skills)) for (const s of u.skills) skillsUnion.add(s);
      }
    }
    out.totalUniqueEnginesAcrossPeers = enginesUnion.size;
    out.totalUniqueHooksAcrossPeers = hooksUnion.size;
    out.totalUniqueSkillsAcrossPeers = skillsUnion.size;
    out.peerRanking.sort((a, b) => b.peer_only_count - a.peer_only_count || a.repo_root.localeCompare(b.repo_root));
    return out;
  }

  /**
   * Convenience: count total peer-only assets across all five kinds.
   * Used by the driver to populate `peer_only_count`.
   */
  countUniqueAssets(unique: UniqueAssets): number {
    if (!unique || typeof unique !== "object") return 0;
    let n = 0;
    for (const k of ["engines", "dispatchers", "hooks", "skills", "scripts"] as const) {
      const arr = unique[k];
      if (Array.isArray(arr)) n += arr.length;
    }
    return n;
  }

  /** Build an empty signature — used internally and by tests. */
  emptySignature(repoRoot: string): RepoSignature {
    return {
      repo_root: typeof repoRoot === "string" ? repoRoot : "",
      engines: [], dispatchers: [], hooks: [], skills: [], scripts: [],
      filtered_machining: [],
    };
  }
}

export const peerRepoSignatureEngine = new PeerRepoSignatureEngine();
