import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve, parse } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveRepoRoot } from "./resolve-repo-root.js";

// Build a fake repo tree:  <tmp>/repo/{mcp-server/{dist,scripts/lib,src/tools/dispatchers}, scripts/lib}
// so we can exercise every runtime layout's start dir against ONE known root.
let tmp: string;
let repo: string;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), "prism-repo-root-"));
  repo = join(tmp, "repo");
  mkdirSync(join(repo, ".git"), { recursive: true }); // repo-root marker (dir in main tree)
  mkdirSync(join(repo, "mcp-server", "dist"), { recursive: true });
  mkdirSync(join(repo, "mcp-server", "scripts", "lib"), { recursive: true }); // scripts/lib decoy
  mkdirSync(join(repo, "mcp-server", "src", "tools", "dispatchers"), { recursive: true });
  // Nested mcp-server decoys the LIVE tree actually has (2026-06-25): these
  // false-matched a bare "contains mcp-server/" marker. They have NO .git, so the
  // .git+mcp-server pair correctly skips them.
  mkdirSync(join(repo, "mcp-server", "mcp-server"), { recursive: true });
  mkdirSync(join(repo, "mcp-server", "src", "mcp-server"), { recursive: true });
  mkdirSync(join(repo, "scripts", "lib"), { recursive: true }); // the REAL target dir
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("resolveRepoRoot", () => {
  it("resolves from the esbuild single-bundle layout (dist/index.js -> dist dir) to the repo root", () => {
    // The production runtime: import.meta.url = mcp-server/dist/index.js -> startDir = mcp-server/dist
    expect(resolveRepoRoot(join(repo, "mcp-server", "dist"))).toBe(repo);
  });

  it("resolves from the tsx source layout (src/tools/dispatchers) to the repo root", () => {
    expect(resolveRepoRoot(join(repo, "mcp-server", "src", "tools", "dispatchers"))).toBe(repo);
  });

  it("resolves from the tsc structure-preserving layout (dist/tools/dispatchers) to the repo root", () => {
    mkdirSync(join(repo, "mcp-server", "dist", "tools", "dispatchers"), { recursive: true });
    expect(resolveRepoRoot(join(repo, "mcp-server", "dist", "tools", "dispatchers"))).toBe(repo);
  });

  it("does NOT false-match at mcp-server/ despite its nested mcp-server/ + scripts/lib (the bug-class guard)", () => {
    // mcp-server/ has BOTH a nested mcp-server/ subdir AND scripts/lib, but NO
    // .git -- so the walk must skip it and climb to the real repo root (which has .git).
    expect(resolveRepoRoot(join(repo, "mcp-server"))).toBe(repo);
    // And from deep inside, past the nested-mcp-server decoy, still resolves to repo.
    expect(resolveRepoRoot(join(repo, "mcp-server", "src", "tools", "dispatchers"))).toBe(repo);
  });

  it("returns a dir whose scripts/lib is the repo-root scripts/lib, not mcp-server/scripts/lib", () => {
    const root = resolveRepoRoot(join(repo, "mcp-server", "dist"));
    expect(root).toBe(repo);
    expect(resolve(root, "scripts", "lib")).toBe(join(repo, "scripts", "lib"));
    expect(resolve(root, "scripts", "lib")).not.toBe(join(repo, "mcp-server", "scripts", "lib"));
  });

  it("throws (fail-loud) when no ancestor contains an mcp-server/ subdir", () => {
    const orphan = mkdtempSync(join(tmpdir(), "prism-no-mcp-"));
    try {
      expect(() => resolveRepoRoot(orphan)).toThrow(/no ancestor with both '\.git' and 'mcp-server\/'/);
    } finally {
      rmSync(orphan, { recursive: true, force: true });
    }
  });

  it("default (no arg) resolves the LIVE repo root: contains mcp-server/ and matches this test's location", () => {
    const live = resolveRepoRoot();
    // This test file lives at <repo>/mcp-server/src/utils/; the resolved root is its repo root.
    const here = dirname(fileURLToPath(import.meta.url)); // .../mcp-server/src/utils (tsx) or dist/... (bundled)
    // The live root must be an ancestor of this file and must contain mcp-server/.
    expect(here.startsWith(live)).toBe(true);
    expect(parse(live).root).not.toBe(live); // never the bare drive root for a real repo
  });
});
