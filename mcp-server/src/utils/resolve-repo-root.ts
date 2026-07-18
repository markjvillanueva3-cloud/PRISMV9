import { existsSync } from "node:fs";
import { dirname, resolve, parse } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Resolve the PRISM repo root in a DEPTH-INDEPENDENT way, correct across every
 * runtime layout the dispatchers actually run under:
 *   - tsx from source:            .../mcp-server/src/tools/dispatchers/X.ts
 *   - tsc structure-preserving:   .../mcp-server/dist/tools/dispatchers/X.js
 *   - esbuild code-split bundle:  .../mcp-server/dist/index.js   (the PRODUCTION runtime)
 *
 * WHY this exists (U-DISPATCHER-REPO-ROOT-FIX, 2026-06-25, slot:india): dispatcher
 * actions that load `scripts/*.mjs` did `resolve(dirname(import.meta.url), "..","..","..")`
 * assuming the `.../tools/dispatchers/` depth. But `package.json` `start` runs the
 * esbuild code-split bundle `dist/index.js` (esbuild.config.mjs default = splitting),
 * where bundled code has `import.meta.url = .../mcp-server/dist/index.js` (one level
 * under mcp-server, not three). The fixed 3-level climb therefore over-shot to the
 * DRIVE ROOT (`H:\scripts\lib\...`), so EVERY such site failed with MODULE_NOT_FOUND
 * in production: `blueprint_loop_drain` surfaced it; the recordOutcome / RAG tribal
 * loader sites failed SILENTLY behind try/catch fallbacks. Found live via the :3100
 * MCP bridge. See memory reference_dispatcher_bundle_path_resolution_bug_2026_06_25.
 *
 * MARKER: the repo root is the nearest ancestor that contains BOTH a `.git`
 * entry (dir in the main tree, file in a slot worktree -- existsSync covers both)
 * AND an `mcp-server/` subdirectory. Neither alone is sufficient: `mcp-server/`
 * has its own `scripts/lib/` (so "contains scripts/lib" false-matches there), and
 * -- verified on the live tree 2026-06-25 -- BOTH `mcp-server/mcp-server/` and
 * `mcp-server/src/mcp-server/` exist (so "contains mcp-server/" alone false-matches
 * mid-tree). `.git` is absent from `mcp-server/` and every descendant, so the
 * `.git` + `mcp-server/` pair is unique to the repo root (main tree or worktree).
 *
 * @param startDir absolute dir to start the upward walk from. Defaults to this
 *   module's own directory (correct for all callers since they bundle into the
 *   same `dist/index.js`, and under tsx all live under the same repo). Pass an
 *   explicit dir in tests to exercise fake layouts.
 * @returns absolute repo-root path.
 * @throws if no ancestor (inclusive of the filesystem root) contains both `.git` and `mcp-server/`,
 *   i.e. fail-loud (R12) -- never silently return a wrong root.
 */
export function resolveRepoRoot(startDir: string = dirname(fileURLToPath(import.meta.url))): string {
  const isRepoRoot = (dir: string): boolean =>
    existsSync(resolve(dir, ".git")) && existsSync(resolve(dir, "mcp-server"));
  const { root } = parse(startDir);
  let dir = startDir;
  while (dir !== root) {
    if (isRepoRoot(dir)) return dir;
    dir = dirname(dir);
  }
  // The filesystem root itself is the last candidate.
  if (isRepoRoot(root)) return root;
  throw new Error(
    `resolveRepoRoot: no ancestor with both '.git' and 'mcp-server/' found from start=${startDir}`,
  );
}
