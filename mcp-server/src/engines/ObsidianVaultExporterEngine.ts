/**
 * ObsidianVaultExporterEngine — P3-U01
 *
 * Bidirectional Obsidian-vault ↔ wiki converter with path-traversal guard.
 *
 * Why: PRISM's wiki (`H:/prism/knowledge/wiki/`, 722 entries) needs to be
 * navigable in two render targets simultaneously:
 *
 *   - Obsidian — uses Wikilinks (`[[NodeName]]` / `[[NodeName|alias]]`) for
 *     graph navigation. Obsidian rejects link targets that traverse paths
 *     (`[[../../../etc/passwd]]` would let a malicious entry write outside
 *     the vault root if naively resolved).
 *   - GitHub — does NOT render wikilinks. We need a `plain_md_fallback`
 *     using standard markdown link syntax (`[NodeName](NodeName.md)`).
 *
 * The export must be lossless ROUND-TRIP: wikilink_md → plain_md → re-parse
 * → wikilink_md is byte-equal to the original. We achieve this by encoding
 * aliased links as `[alias](Target.md)` — re-parsing recovers `[[Target|alias]]`
 * iff the link text differs from the file stem. Plain links (`[[Foo]]`) round-
 * trip via `[Foo](Foo.md)`.
 *
 * Path-traversal guard: `resolveVaultPath` rejects any target containing
 * path-traversal (`..`), absolute roots (`/`, `\\`), drive letters (`C:`),
 * URI schemes (`http://`, `file://`), or characters outside the safe set.
 * Vault-relative resolution is enforced — every accepted target maps to
 * `<category>/<NodeName>.md` and never escapes vaultRoot.
 *
 * @module engines/ObsidianVaultExporterEngine
 * @version 1.0.0
 */

// ----------------------------------------------------------------------------
// Schema
// ----------------------------------------------------------------------------

const ENGINE_SCHEMA_VERSION = "1.0.0";

/**
 * Allowed wiki categories — corresponds to subdirectories of
 * `H:/prism/knowledge/wiki/`. Used by resolveVaultPath to scope the resolver
 * so a wikilink can never be steered into an unexpected directory.
 */
export const VAULT_CATEGORIES = [
  "concepts",
  "entities",
  "decisions",
  "patterns",
  "trajectories",
  "lessons",
  "code-tribal",
  "architecture",
  "software-engineering",
  "ux-design",
  "summaries",
] as const;

export type VaultCategory = typeof VAULT_CATEGORIES[number];

/**
 * Strict node-id pattern: alphanum, dash, underscore. NO dots, slashes,
 * backslashes, colons, or whitespace. This single regex covers all four
 * adversarial cases in the envelope exit conditions and is fast O(n).
 */
const SAFE_NODE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]*$/u;

/**
 * Wikilink token grammar:
 *   [[Target]]               — plain link
 *   [[Target|Display alias]] — aliased link (alias may include spaces)
 * Captures: g[1]=target, g[2]=alias-or-undefined.
 */
const WIKILINK_RE = /\[\[([^\[\]\|]+?)(?:\|([^\[\]]+?))?\]\]/gu;

/**
 * Plain-markdown link grammar restricted to vault-style links:
 *   [Display](Target.md)
 * Captures: g[1]=display, g[2]=target-stem.
 */
const PLAIN_VAULT_LINK_RE = /\[([^\[\]]+?)\]\(([A-Za-z0-9][A-Za-z0-9_-]*)\.md\)/gu;

// ----------------------------------------------------------------------------
// Public types — AtomicValue-style schema-versioned results.
// ----------------------------------------------------------------------------

export interface VaultExportResult {
  /** Source node id that was exported (what the caller passed in). */
  source_node: string;
  /** Obsidian Flavored Markdown — uses [[wikilinks]]. */
  wikilink_md: string;
  /** GitHub-renderable Markdown — uses [link](Name.md). */
  plain_md_fallback: string;
  /** Engine schema version for downstream consumers. */
  schemaVersion: string;
}

export type ResolveError =
  | "empty"
  | "invalid_chars"
  | "traversal"
  | "absolute_path"
  | "drive_letter"
  | "scheme"
  | "wrong_category";

export type ResolveResult =
  | {
      ok: true;
      vaultRelativePath: string;
      category: VaultCategory;
      nodeId: string;
      schemaVersion: string;
    }
  | {
      ok: false;
      error: string;
      reason: ResolveError;
      target: string;
      schemaVersion: string;
    };

export interface WikilinkToken {
  raw: string;
  target: string;
  alias?: string;
  index: number;
}

export interface ExportOptions {
  /** Optional inline content; if omitted, result content is just the node header. */
  content?: string;
  /**
   * Restrict resolution to a subset of categories. Defaults to all
   * VAULT_CATEGORIES. Useful for tests / scoped exports.
   */
  allowedCategories?: ReadonlyArray<VaultCategory>;
  /**
   * Pin the export to a specific category. If absent, the engine assumes
   * `concepts/` (matches the default for engine-class entries — 575/722
   * wiki entries are concepts per index.md).
   */
  category?: VaultCategory;
}

// ----------------------------------------------------------------------------
// Engine
// ----------------------------------------------------------------------------

/**
 * Bidirectional Obsidian-vault ↔ wiki converter.
 *
 * All public methods are static; engine carries no instance state. All return
 * shapes carry `schemaVersion` so cross-version callers can discriminate.
 */
export class ObsidianVaultExporterEngine {
  /**
   * Export a single wiki node to both wikilink and plain-md forms.
   *
   * @param nodeId - Wikilink target, e.g., "AISystemRouter"
   * @param opts - Optional content + category overrides
   * @returns VaultExportResult with both render forms
   * @throws Error if nodeId fails the path-traversal guard
   */
  static exportNode(nodeId: string, opts: ExportOptions = {}): VaultExportResult {
    const cat = opts.category ?? "concepts";
    const allowed = opts.allowedCategories ?? VAULT_CATEGORIES;
    const resolved = ObsidianVaultExporterEngine.resolveVaultPath(nodeId, {
      category: cat,
      allowedCategories: allowed,
    });
    if (!resolved.ok) {
      throw new Error(
        `ObsidianVaultExporterEngine.exportNode: cannot export node '${nodeId}': ${resolved.error}`,
      );
    }
    const inputContent = opts.content ?? `# ${nodeId}\n\n[[${nodeId}]]`;
    const wikilink = ObsidianVaultExporterEngine.toWikilinkMarkdown(inputContent);
    const plain = ObsidianVaultExporterEngine.toPlainMarkdown(wikilink);
    return {
      source_node: nodeId,
      wikilink_md: wikilink,
      plain_md_fallback: plain,
      schemaVersion: ENGINE_SCHEMA_VERSION,
    };
  }

  /**
   * Resolve a wikilink target to a vault-relative path. Rejects path
   * traversal, absolute paths, drive letters, URI schemes, and any chars
   * outside the safe alphanumeric set. Vault-relative resolution is enforced.
   *
   * @param target - The raw wikilink target string (e.g., "Foo" or "../etc")
   * @param opts - Resolver scope (category + allowed-list)
   * @returns ResolveResult — discriminated on ok=true|false
   */
  static resolveVaultPath(
    target: string,
    opts: { category?: VaultCategory; allowedCategories?: ReadonlyArray<VaultCategory> } = {},
  ): ResolveResult {
    const sv = ENGINE_SCHEMA_VERSION;
    const allowed = opts.allowedCategories ?? VAULT_CATEGORIES;
    const cat = opts.category ?? "concepts";
    if (typeof target !== "string" || target.length === 0) {
      return { ok: false, error: "target is empty", reason: "empty", target: String(target), schemaVersion: sv };
    }
    // 1. Reject URI schemes early — `http://`, `file://`, etc.
    if (/^[a-z][a-z0-9+.-]*:\/\//iu.test(target)) {
      return { ok: false, error: `target uses a URI scheme: ${target}`, reason: "scheme", target, schemaVersion: sv };
    }
    // 2. Reject Windows drive letters — `C:/foo`, `D:\\bar`
    if (/^[A-Za-z]:[\\/]/u.test(target)) {
      return {
        ok: false,
        error: `target starts with a drive letter: ${target}`,
        reason: "drive_letter",
        target,
        schemaVersion: sv,
      };
    }
    // 3. Reject absolute paths — POSIX `/x` or UNC `//x`, Windows `\\x`
    if (target.startsWith("/") || target.startsWith("\\")) {
      return {
        ok: false,
        error: `target is absolute: ${target}`,
        reason: "absolute_path",
        target,
        schemaVersion: sv,
      };
    }
    // 4. Reject anything containing path separators or `..` traversal segments.
    //    (We allow neither `/` nor `\` nor `..` — wiki node ids are flat.)
    if (target.includes("..") || target.includes("/") || target.includes("\\")) {
      return {
        ok: false,
        error: `target contains path-traversal or separator: ${target}`,
        reason: "traversal",
        target,
        schemaVersion: sv,
      };
    }
    // 5. Final character whitelist.
    if (!SAFE_NODE_ID_RE.test(target)) {
      return {
        ok: false,
        error: `target uses disallowed characters: ${target}`,
        reason: "invalid_chars",
        target,
        schemaVersion: sv,
      };
    }
    // 6. Category whitelist.
    if (!allowed.includes(cat)) {
      return {
        ok: false,
        error: `category '${cat}' not in allowed list`,
        reason: "wrong_category",
        target,
        schemaVersion: sv,
      };
    }
    return {
      ok: true,
      vaultRelativePath: `${cat}/${target}.md`,
      category: cat,
      nodeId: target,
      schemaVersion: sv,
    };
  }

  /**
   * Parse all `[[wikilinks]]` (plain or aliased) out of a markdown string.
   * Returns tokens in source order. Targets that fail the path-traversal
   * guard are NOT silently dropped — they are returned with an empty alias
   * so callers can detect them; transformation routines in this engine reject
   * them via resolveVaultPath at apply time.
   */
  static parseWikilinks(md: string): WikilinkToken[] {
    if (typeof md !== "string" || md.length === 0) return [];
    const tokens: WikilinkToken[] = [];
    WIKILINK_RE.lastIndex = 0;
    let m: RegExpExecArray | null = WIKILINK_RE.exec(md);
    while (m !== null) {
      tokens.push({
        raw: m[0],
        target: m[1].trim(),
        alias: typeof m[2] === "string" ? m[2].trim() : undefined,
        index: m.index,
      });
      m = WIKILINK_RE.exec(md);
    }
    return tokens;
  }

  /**
   * Parse `[Display](Target.md)` style links from plain markdown so we can
   * reverse the conversion. Matches only flat `Target.md` (no path), making
   * round-trip stable.
   */
  static parsePlainVaultLinks(md: string): Array<{ raw: string; display: string; target: string; index: number }> {
    if (typeof md !== "string" || md.length === 0) return [];
    const tokens: Array<{ raw: string; display: string; target: string; index: number }> = [];
    PLAIN_VAULT_LINK_RE.lastIndex = 0;
    let m: RegExpExecArray | null = PLAIN_VAULT_LINK_RE.exec(md);
    while (m !== null) {
      tokens.push({
        raw: m[0],
        display: m[1].trim(),
        target: m[2].trim(),
        index: m.index,
      });
      m = PLAIN_VAULT_LINK_RE.exec(md);
    }
    return tokens;
  }

  /**
   * Identity transform: keep `[[wikilinks]]` as-is. Used when the caller
   * already handed us Obsidian-flavored markdown but we want to validate
   * targets along the way. Throws on any unsafe target.
   */
  static toWikilinkMarkdown(md: string): string {
    if (typeof md !== "string") return "";
    const tokens = ObsidianVaultExporterEngine.parseWikilinks(md);
    for (const t of tokens) {
      const r = ObsidianVaultExporterEngine.resolveVaultPath(t.target);
      if (!r.ok) {
        throw new Error(
          `ObsidianVaultExporterEngine.toWikilinkMarkdown: unsafe wikilink target '${t.target}': ${r.error}`,
        );
      }
    }
    return md;
  }

  /**
   * Convert wikilinks to plain markdown links.
   *   [[Target]]         → [Target](Target.md)
   *   [[Target|alias]]   → [alias](Target.md)
   * Throws on any unsafe target.
   */
  static toPlainMarkdown(md: string): string {
    if (typeof md !== "string") return "";
    return md.replace(WIKILINK_RE, (_match, rawTarget: string, rawAlias?: string) => {
      const target = rawTarget.trim();
      const alias = typeof rawAlias === "string" ? rawAlias.trim() : undefined;
      const r = ObsidianVaultExporterEngine.resolveVaultPath(target);
      if (!r.ok) {
        throw new Error(
          `ObsidianVaultExporterEngine.toPlainMarkdown: unsafe wikilink target '${target}': ${r.error}`,
        );
      }
      const display = alias && alias.length > 0 ? alias : target;
      return `[${display}](${target}.md)`;
    });
  }

  /**
   * Reverse `toPlainMarkdown`: convert `[Display](Target.md)` back to
   * `[[Target]]` or `[[Target|Display]]` based on whether display matches
   * the target stem.
   */
  static toWikilinkFromPlain(md: string): string {
    if (typeof md !== "string") return "";
    return md.replace(PLAIN_VAULT_LINK_RE, (match, rawDisplay: string, rawTarget: string) => {
      const display = rawDisplay.trim();
      const target = rawTarget.trim();
      const r = ObsidianVaultExporterEngine.resolveVaultPath(target);
      if (!r.ok) {
        // Leave unsafe links as-is — round-trip property only holds for safe targets.
        return match;
      }
      return display === target ? `[[${target}]]` : `[[${target}|${display}]]`;
    });
  }

  /**
   * Round-trip helper for tests and audits.
   *   roundTrip(md) === md  ⇔  md is wikilink-stable
   *   (i.e. only contains [[Target]] / [[Target|alias]] forms with safe targets)
   */
  static roundTrip(wikilinkMd: string): string {
    const plain = ObsidianVaultExporterEngine.toPlainMarkdown(wikilinkMd);
    return ObsidianVaultExporterEngine.toWikilinkFromPlain(plain);
  }
}
