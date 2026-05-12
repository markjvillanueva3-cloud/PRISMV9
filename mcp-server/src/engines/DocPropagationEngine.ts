/**
 * DocPropagationEngine — Classify writes → affected docs → regen actions
 *
 * Phase 0.15 U-DOC1 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Given a file
 * that was just written/edited, enumerate the documentation surfaces that
 * might be out of date and the regeneration action each needs. Used by
 * `hook_post_write_doc_cascade` to enqueue refresh jobs into
 * DOC_REFRESH_QUEUE.jsonl, and by `/doc-sync` for dry-run surveys.
 *
 * No I/O here. Classification is rule-based on path segments so the engine
 * stays deterministic and testable. Rules are ordered; the first matching
 * rule contributes its doc targets. Multiple rules can match a single write.
 *
 * @module engines/DocPropagationEngine
 * @milestone PP-0.15-U-DOC1
 */

export type SurfaceKind =
  | "root-claude-md"
  | "mcp-claude-md"
  | "user-memory"
  | "commands-manifest"
  | "self-awareness-directive"
  | "command-awareness-directive"
  | "mcp-directive"
  | "master-index"
  | "master-index-compact"
  | "action-tracker"
  | "code-system-index"
  | "engine-digest"
  | "dispatcher-digest"
  | "directory-digest"
  | "hook-definitions"
  | "dsl-compact"
  | "capability-manifest"
  | "session-brief";

export type RegenAction = "patch-managed-block" | "full-regen" | "touch-counts";

export interface DocTarget {
  surface: SurfaceKind;
  action: RegenAction;
  reason: string;
}

export interface ClassificationRule {
  id: string;
  match: (filePath: string) => boolean;
  targets: readonly Omit<DocTarget, "reason">[];
  reason: string;
}

export interface ClassificationResult {
  filePath: string;
  matchedRules: string[];
  targets: DocTarget[];
}

function hasSegment(path: string, segment: string): boolean {
  const norm = "/" + path.toLowerCase().replace(/\\/g, "/").replace(/^\/+/, "");
  return norm.includes(`/${segment.toLowerCase()}/`);
}

function endsWith(path: string, suffix: string): boolean {
  return path.toLowerCase().endsWith(suffix.toLowerCase());
}

const DEFAULT_RULES: readonly ClassificationRule[] = Object.freeze([
  {
    id: "engine-write",
    match: (p) => hasSegment(p, "engines") && endsWith(p, "Engine.ts"),
    reason: "engine added or modified",
    targets: [
      { surface: "engine-digest", action: "full-regen" },
      { surface: "master-index", action: "patch-managed-block" },
      { surface: "master-index-compact", action: "patch-managed-block" },
      { surface: "root-claude-md", action: "touch-counts" },
      { surface: "mcp-claude-md", action: "touch-counts" },
      { surface: "self-awareness-directive", action: "touch-counts" },
      { surface: "session-brief", action: "touch-counts" },
    ],
  },
  {
    id: "dispatcher-write",
    match: (p) => hasSegment(p, "dispatchers") && endsWith(p, "Dispatcher.ts"),
    reason: "dispatcher or action set changed",
    targets: [
      { surface: "dispatcher-digest", action: "full-regen" },
      { surface: "action-tracker", action: "full-regen" },
      { surface: "master-index", action: "patch-managed-block" },
      { surface: "master-index-compact", action: "patch-managed-block" },
      { surface: "mcp-claude-md", action: "touch-counts" },
      { surface: "mcp-directive", action: "touch-counts" },
    ],
  },
  {
    id: "skill-write",
    match: (p) => p.toLowerCase().replace(/\\/g, "/").includes("/.claude/commands/") && endsWith(p, ".md"),
    reason: "slash-command skill added or modified",
    targets: [
      { surface: "commands-manifest", action: "full-regen" },
      { surface: "command-awareness-directive", action: "patch-managed-block" },
      { surface: "capability-manifest", action: "patch-managed-block" },
    ],
  },
  {
    id: "hook-write",
    match: (p) =>
      (p.toLowerCase().replace(/\\/g, "/").includes("/.claude/hooks/") ||
        hasSegment(p, "hooks")) &&
      (endsWith(p, ".ts") || endsWith(p, ".mjs") || endsWith(p, ".py")),
    reason: "hook added or modified",
    targets: [
      { surface: "hook-definitions", action: "full-regen" },
      { surface: "capability-manifest", action: "patch-managed-block" },
    ],
  },
  {
    id: "formula-or-algo",
    match: (p) => hasSegment(p, "algorithms") || hasSegment(p, "physics"),
    reason: "formula or algorithm changed",
    targets: [
      { surface: "self-awareness-directive", action: "touch-counts" },
      { surface: "master-index", action: "patch-managed-block" },
    ],
  },
  {
    id: "schema-write",
    match: (p) => hasSegment(p, "schemas") && endsWith(p, ".ts"),
    reason: "schema file changed",
    targets: [
      { surface: "action-tracker", action: "full-regen" },
      { surface: "dispatcher-digest", action: "patch-managed-block" },
    ],
  },
  {
    id: "registry-write",
    match: (p) => hasSegment(p, "registries") && endsWith(p, ".ts"),
    reason: "registry content changed",
    targets: [
      { surface: "master-index", action: "patch-managed-block" },
      { surface: "self-awareness-directive", action: "touch-counts" },
    ],
  },
  {
    id: "dsl-map",
    match: (p) => {
      const n = p.toLowerCase().replace(/\\/g, "/");
      return n.endsWith("code_system_index.md") || n.endsWith("code-system-index.md");
    },
    reason: "DSL shortcode table changed",
    targets: [
      { surface: "code-system-index", action: "full-regen" },
      { surface: "dsl-compact", action: "full-regen" },
    ],
  },
  {
    id: "structural",
    match: (p) => hasSegment(p, "src") && (endsWith(p, ".ts") || endsWith(p, ".tsx")),
    reason: "source tree structure may have changed",
    targets: [{ surface: "directory-digest", action: "full-regen" }],
  },
]);

export class DocPropagationEngine {
  private readonly rules: readonly ClassificationRule[];

  constructor(rules: readonly ClassificationRule[] = DEFAULT_RULES) {
    this.rules = rules;
  }

  classify(filePath: string): ClassificationResult {
    if (!filePath || filePath.trim() === "") {
      throw new Error("filePath must be non-empty");
    }

    const matched: string[] = [];
    const seen = new Set<string>();
    const targets: DocTarget[] = [];

    for (const rule of this.rules) {
      if (!rule.match(filePath)) continue;
      matched.push(rule.id);
      for (const t of rule.targets) {
        const key = `${t.surface}:${t.action}`;
        if (seen.has(key)) continue;
        seen.add(key);
        targets.push({ ...t, reason: rule.reason });
      }
    }

    return { filePath, matchedRules: matched, targets };
  }

  /** Classify many paths; dedupe targets across all matched rules. */
  classifyBatch(paths: readonly string[]): ClassificationResult[] {
    return paths.map((p) => this.classify(p));
  }

  /**
   * Given a batch of classifications, return a deduped union of targets.
   * Helpful for hooks that want the total set of doc regens to enqueue.
   */
  mergeTargets(results: readonly ClassificationResult[]): DocTarget[] {
    const seen = new Map<string, DocTarget>();
    for (const r of results) {
      for (const t of r.targets) {
        const key = `${t.surface}:${t.action}`;
        if (!seen.has(key)) seen.set(key, t);
      }
    }
    return [...seen.values()];
  }

  getRules(): readonly ClassificationRule[] {
    return this.rules;
  }
}

export const docPropagationEngine = new DocPropagationEngine();
