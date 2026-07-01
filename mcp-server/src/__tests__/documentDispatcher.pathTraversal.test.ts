/**
 * documentDispatcher path-traversal guard — U-DOC-PATH-TRAVERSAL-GUARD (slot:charlie, 2026-06-28).
 *
 * Verifies `getDocPath(name)` confines every caller-supplied document name to the
 * docs directory. Before this guard, `name` arrived from `z.string()` with no path
 * constraint, so `write`/`append`/`read` could escape via `../../../` (or an absolute
 * path / NUL byte) and write/read anywhere the process could reach. Surfaced by the
 * U-INBOX-INTEGRATIONS-AUTH P2 follow-up; the doc store is anon-reachable.
 *
 * R9: these assert the SECURITY INTENT (escape is rejected, legit names resolve inside),
 * not just "a function returns something". The escape vectors are the real ones an
 * attacker sends; the negative control proves a legit name is NOT over-blocked.
 */
import { describe, it, expect } from "vitest";
import * as path from "path";
import { getDocPath } from "../tools/dispatchers/documentDispatcher.js";

// Mirrors the dispatcher's `path.join(import.meta.dirname, "../../data/docs")` from
// src/tools/dispatchers → src/data/docs. (NOT src/tools/data/docs — the dispatcher
// lives two dirs deep under src/tools, so "../../data/docs" lands at src/data/docs.)
const DOCS_DIR = path.resolve(import.meta.dirname, "../data/docs");

describe("documentDispatcher getDocPath — path-traversal containment", () => {
  // ---- Happy path: legitimate names resolve INSIDE DOCS_DIR ----
  it("resolves a plain filename inside DOCS_DIR", () => {
    const p = getDocPath("ROADMAP.md");
    expect(p).toBe(path.join(DOCS_DIR, "ROADMAP.md"));
    expect(p.startsWith(DOCS_DIR + path.sep)).toBe(true);
  });

  it("resolves a nested-but-contained subpath inside DOCS_DIR", () => {
    // a sub-directory under docs is legitimate and must NOT be over-blocked
    const p = getDocPath("sub/NOTES.md");
    expect(p).toBe(path.join(DOCS_DIR, "sub", "NOTES.md"));
    expect(path.relative(DOCS_DIR, p).startsWith("..")).toBe(false);
  });

  it("collapses an interior '..' that stays within DOCS_DIR (negative control -- NOT blocked)", () => {
    // docs/sub/../KEEP.md normalizes to docs/KEEP.md -- still contained, must pass.
    const p = getDocPath("sub/../KEEP.md");
    expect(p).toBe(path.join(DOCS_DIR, "KEEP.md"));
  });

  it("accepts a legit filename literally beginning with '..' (P2 fix -- not over-blocked)", () => {
    // "..foo.md" resolves to docs/..foo.md -- a contained file; a bare startsWith("..")
    // would have wrongly rejected it. The precise rel===".." || rel.startsWith(".."+sep)
    // check accepts it. (3-of-3 scrutiny P2.)
    const p = getDocPath("..foo.md");
    expect(p).toBe(path.join(DOCS_DIR, "..foo.md"));
    expect(path.relative(DOCS_DIR, p).startsWith(".." + path.sep)).toBe(false);
  });

  // ---- Failure modes: traversal escapes are REJECTED ----
  it("rejects a parent-directory escape (../)", () => {
    expect(() => getDocPath("../escape.md")).toThrow(/Path traversal blocked/);
  });

  it("rejects a deep multi-segment escape that targets a sibling sensitive file", () => {
    expect(() => getDocPath("../../../settings.json")).toThrow(/Path traversal blocked/);
  });

  it("rejects an escape that resolves to a real out-of-tree path", () => {
    // even when the traversal lands somewhere that exists, it must be blocked
    expect(() => getDocPath("../../../../../../etc/passwd")).toThrow(/Path traversal blocked/);
  });

  // ---- Adversarial inputs ----
  it("rejects an absolute path (drive-root / posix-root escape)", () => {
    const abs = process.platform === "win32" ? "C:/Windows/System32/x.txt" : "/etc/shadow";
    expect(() => getDocPath(abs)).toThrow(/Path traversal blocked/);
  });

  it("rejects a backslash-style traversal on the resolved path", () => {
    // on win32 path.resolve treats \ as a separator; the relative check still catches escape
    expect(() => getDocPath("..\\..\\secret.json")).toThrow(/Path traversal/);
  });

  it("rejects a NUL byte in the name (poison-null injection)", () => {
    expect(() => getDocPath("ok.md\0../../evil")).toThrow(/Invalid document name/);
  });

  it("rejects an empty name", () => {
    expect(() => getDocPath("")).toThrow(/Invalid document name/);
  });

  it("rejects a non-string name", () => {
    // @ts-expect-error — exercising the runtime guard against a non-string caller
    expect(() => getDocPath(undefined)).toThrow(/Invalid document name/);
  });

  // ---- Invariant: every accepted path is provably contained ----
  it("INVARIANT: any returned path is always inside DOCS_DIR", () => {
    for (const name of ["a.md", "x/y/z.json", "deep/../deep2/q.md"]) {
      const p = getDocPath(name);
      const rel = path.relative(DOCS_DIR, p);
      expect(rel.startsWith("..")).toBe(false);
      expect(path.isAbsolute(rel)).toBe(false);
    }
  });
});
