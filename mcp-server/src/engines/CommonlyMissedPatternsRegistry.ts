/**
 * CommonlyMissedPatternsRegistry — U-FORE-03 (PSAU-FORESIGHT)
 * ============================================================
 *
 * Catalog of the 15 most-often-forgotten patterns in PRISM engine work.
 * Each pattern has a detector (applied to an "input artifact" — source
 * text + metadata), a severity (1-5), and a concrete fix string.
 *
 * Used by GapPredictorEngine to scan proposed/in-progress work.
 */

export type Severity = 1 | 2 | 3 | 4 | 5;

export interface GapArtifact {
  /** Path of the file being scanned (may be virtual for planned work). */
  filePath: string;
  /** Raw file content (can be empty for pure-metadata checks). */
  content: string;
  /** Optional sibling paths — used for cross-file checks (has test?). */
  siblings?: string[];
  /** Optional content of repo's master dispatcher file for wire-checks. */
  dispatcherText?: string;
}

export interface GapPattern {
  id: string;
  title: string;
  severity: Severity;
  /** Concrete remediation copy-paste for the developer. */
  fix: string;
  /**
   * Returns true when the gap is present. Detectors must be pure and
   * return in O(file size) — they are called in hot paths.
   */
  detect: (a: GapArtifact) => boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────

const hasEngineFilename = (p: string) =>
  /(?:^|[\\/])[^\\/]+Engine\.ts$/i.test(p.replace(/\\/g, "/"));
const hasSchemaFilename = (p: string) =>
  /(?:^|[\\/])[^\\/]+Schemas?\.ts$/i.test(p.replace(/\\/g, "/"));
const testSiblingExists = (p: string, siblings?: string[]): boolean => {
  if (!siblings || siblings.length === 0) return false;
  const base = p.split(/[\\/]/).pop()!.replace(/\.ts$/, "");
  return siblings.some((s) => new RegExp(`${base}\\.(test|spec)\\.ts$`).test(s));
};

// ─── Registry ───────────────────────────────────────────────────────

export const PATTERNS: GapPattern[] = [
  {
    id: "missing_test_file",
    title: "Engine has no matching *.test.ts file",
    severity: 4,
    fix: "Create src/__tests__/<EngineName>.test.ts with ≥10 real-assertion cases",
    detect: (a) => hasEngineFilename(a.filePath) && !testSiblingExists(a.filePath, a.siblings),
  },
  {
    id: "inline_physics_constant",
    title: "Inline Kienzle/Taylor/material constant",
    severity: 5,
    fix: "Import from mcp-server/src/physics/constants.ts — never inline kc1.1, Taylor C/n, material values",
    detect: (a) =>
      hasEngineFilename(a.filePath) &&
      /\bkc1_1\b\s*[:=]\s*\d|\bkc_1_1\b\s*[:=]\s*\d|taylor_c\s*[:=]\s*\d/i.test(a.content),
  },
  {
    id: "silent_catch",
    title: "Empty catch block (silently swallowed error)",
    severity: 4,
    fix: "Log the error, rethrow, or return a typed failure result — never silently swallow",
    detect: (a) => /\bcatch\s*\([^)]*\)\s*\{\s*\}/.test(a.content),
  },
  {
    id: "todo_fixme_hack",
    title: "TODO / FIXME / HACK comment left in code",
    severity: 2,
    fix: "Complete the work, extract to a tracked issue, or explain with WHY comment",
    detect: (a) => /(^|\W)(TODO|FIXME|HACK)\b/.test(a.content),
  },
  {
    id: "not_implemented_throw",
    title: 'throw new Error("not implemented") stub',
    severity: 5,
    fix: "Implement the method OR mark unreachable with // UNREACHABLE: <reason> + throw",
    detect: (a) => /throw\s+new\s+Error\(\s*["'`]not\s+implemented/i.test(a.content),
  },
  {
    id: "missing_dispatcher_wiring",
    title: "New engine not referenced by any dispatcher",
    severity: 4,
    fix: "Add lazy import + case handler in src/tools/dispatchers/<domain>Dispatcher.ts",
    detect: (a) => {
      if (!hasEngineFilename(a.filePath)) return false;
      if (!a.dispatcherText) return false;
      const base = a.filePath.split(/[\\/]/).pop()!.replace(/\.ts$/, "");
      return !a.dispatcherText.includes(base);
    },
  },
  {
    id: "any_spread",
    title: "`any` type used in public method signature",
    severity: 3,
    fix: "Replace `: any` with a concrete interface or `unknown` + narrowing",
    detect: (a) => /\bexport\s+(function|class|interface)[\s\S]{0,300}?:\s*any\b/.test(a.content),
  },
  {
    id: "ts_ignore_unexplained",
    title: "@ts-ignore without explanation comment",
    severity: 3,
    fix: "Add // @ts-expect-error <reason> or fix the underlying type",
    detect: (a) => /@ts-ignore[^\S\r\n]*(?=[\r\n]|$)/.test(a.content),
  },
  {
    id: "missing_schema_version",
    title: "State JSON / schema file without schemaVersion",
    severity: 3,
    fix: "Add `schemaVersion: N` field and a migration path in src/migrations/",
    detect: (a) =>
      hasSchemaFilename(a.filePath) &&
      !/schemaVersion/.test(a.content) &&
      /export\s+const\s+ACTION/.test(a.content) === false,
  },
  {
    id: "no_rollback_docs",
    title: "Destructive dispatcher action with no rollback note",
    severity: 3,
    fix: "Add /** @rollback ... */ doc tag OR an inverse action (e.g., create→delete)",
    detect: (a) =>
      /src[\\/]tools[\\/]dispatchers/.test(a.filePath.replace(/\\/g, "/")) &&
      /(delete|drop|truncate|reset|force)/i.test(a.content) &&
      !/@rollback|rollback:/i.test(a.content),
  },
  {
    id: "circular_import_risk",
    title: "Relative import reaches back up and around",
    severity: 2,
    fix: "Refactor shared types into a neutral module to break the cycle",
    detect: (a) => /from\s+["']\.\.\/\.\.\/engines\/[^"']+["']/.test(a.content),
  },
  {
    id: "double_assertion",
    title: "Double type assertion `as X as Y`",
    severity: 3,
    fix: "Fix the underlying types; double-asserts silently erase compiler checks",
    detect: (a) => /\bas\s+\w+\s+as\s+\w+/.test(a.content),
  },
  {
    id: "toBeDefined_only",
    title: "Test uses only toBeDefined() with no real assertion",
    severity: 5,
    fix: "Add actual value / shape / behavior assertions — placeholder tests are rejected",
    detect: (a) =>
      /\.test\.ts$/.test(a.filePath) &&
      /toBeDefined\s*\(\)/.test(a.content) &&
      !/toBe\s*\(|toEqual\s*\(|toMatch\s*\(|toThrow\s*\(/.test(a.content),
  },
  {
    id: "only_left_in_tests",
    title: ".only() left in committed test",
    severity: 5,
    fix: "Remove .only() — it skips every other test in the file on CI",
    detect: (a) =>
      /\.test\.ts$/.test(a.filePath) && /\b(it|describe|test)\.only\b/.test(a.content),
  },
  {
    id: "await_in_for_loop",
    title: "await in forEach — the await is not honored",
    severity: 4,
    fix: "Use `for (const x of arr)` + await, or `await Promise.all(arr.map(...))`",
    detect: (a) => /\.forEach\s*\(\s*async\b/.test(a.content),
  },
];

/** O(1) lookup by id, for engines to reference a specific pattern. */
export const PATTERNS_BY_ID: Record<string, GapPattern> = Object.fromEntries(
  PATTERNS.map((p) => [p.id, p])
);
