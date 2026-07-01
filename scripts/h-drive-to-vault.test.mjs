/**
 * h-drive-to-vault.test.mjs -- taxonomy SSOT + indexer pure fns + a REAL walkDir
 * integration oracle (H-DRIVE-VAULT-SYNERGY/U-1, slot:papa).
 *
 * The hermetic cases pin classification + aggregation; the REAL case walks an
 * actual repo dir through walkDir -> indexDomain to prove the import + classify
 * wiring works end-to-end (hermetic fakes don't prove production wiring).
 *
 * @milestone H-DRIVE-VAULT-SYNERGY  @unit U-1  slot:papa
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  normPath, extOf, classifyTopLevel, classifyPath, resolveGalaxy,
  isKnowledgeFile, ALL_CATEGORIES, SKIP_SEGMENTS,
} from "./lib/h-drive-taxonomy.mjs";
import {
  indexDomain, shouldEmitNote, buildDomainNote, buildCoverageMap,
} from "./h-drive-to-vault.mjs";

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");

// -- normPath / extOf --------------------------------------------------------
test("normPath: backslashes -> forward, lower-case, no trailing slash", () => {
  assert.equal(normPath("H:\\Prism\\Scripts\\"), "h:/prism/scripts");
  assert.equal(normPath("a/b/"), "a/b");
  assert.equal(normPath(""), "");
  assert.equal(normPath(null), "");
});

test("extOf: lower-cased ext, none for dotfiles/extensionless", () => {
  assert.equal(extOf("foo/Bar.TS"), ".ts");
  assert.equal(extOf("a/b/c"), "");
  assert.equal(extOf(".gitignore"), ""); // leading dot is not an extension
  assert.equal(extOf("x.STEP"), ".step");
});

// -- classifyTopLevel --------------------------------------------------------
test("classifyTopLevel: canonical repo vs worktree clone (deduped)", () => {
  assert.equal(classifyTopLevel("prism").class, "canonical-repo");
  const wc = classifyTopLevel("prism-slot-papa");
  assert.equal(wc.class, "worktree-clone");
  assert.equal(wc.dedupeTo, "prism");
  assert.equal(classifyTopLevel("prism-cad-complete").class, "worktree-clone");
});

test("classifyTopLevel: junk is skipped", () => {
  for (const j of [".cache", ".hf-cache", ".venv", "found.001", "$RECYCLE.BIN", "BIOS", "DockerData", "CodexTmp", "%SystemDrive%"]) {
    assert.equal(classifyTopLevel(j).skip, true, `${j} must skip`);
  }
});

test("classifyTopLevel: knowledge-asset + infra-tool classes", () => {
  assert.equal(classifyTopLevel("OBSIDIAN").class, "knowledge-asset");
  assert.equal(classifyTopLevel("knowledge").class, "knowledge-asset");
  assert.equal(classifyTopLevel("Docustrata Test").class, "knowledge-asset");
  assert.equal(classifyTopLevel(".tools").class, "infra-tool");
  assert.equal(classifyTopLevel("hermes-install").class, "infra-tool");
});

// -- classifyPath (the real-path oracle) ------------------------------------
test("classifyPath: galaxy-engine resolves galaxy; engine tests are 'test'", () => {
  const e = classifyPath("H:/prism/mcp-server/src/engines/mill/MillEngine.ts");
  assert.equal(e.category, "galaxy-engine");
  assert.equal(e.galaxy, "mill");
  const t = classifyPath("H:/prism/mcp-server/src/engines/mill/__tests__/x.test.ts");
  assert.equal(t.category, "test", "engine tests classify as test, not galaxy-engine");
});

test("classifyPath: PRISM-native structural categories", () => {
  assert.equal(classifyPath("mcp-server/src/tools/dispatchers/devDispatcher.ts").category, "dispatcher");
  assert.equal(classifyPath("mcp-server/src/schemas/devActionSchemas.ts").category, "schema");
  assert.equal(classifyPath("mcp-server/src/physics/constants.ts").category, "physics");
  assert.equal(classifyPath(".claude/hooks/foo.mjs").category, "hook");
  assert.equal(classifyPath(".claude/commands/checkin.md").category, "skill");
  assert.equal(classifyPath("scripts/h-drive-to-vault.mjs").category, "script");
  assert.equal(classifyPath("mcp-server/web/app/page.tsx").category, "frontend");
  assert.equal(classifyPath("knowledge/wiki/architecture/x.md").category, "knowledge-wiki");
  assert.equal(classifyPath("knowledge/memories/reference/x.md").category, "knowledge-memory");
});

test("classifyPath: corpus vs manufacturing-asset (location beats ext)", () => {
  assert.equal(classifyPath("H:/prism/resources/CAD FILES/blisk.stp").category, "knowledge-corpus");
  assert.equal(classifyPath("H:/prism/JM DIE/part.step").category, "knowledge-corpus");
  // a CAD asset OUTSIDE a corpus dir is a manufacturing-asset by ext
  assert.equal(classifyPath("H:/prism/mcp-server/data/cad/electrode.step").category, "manufacturing-asset");
});

test("classifyPath: state-data, build-config, doc, other fallback", () => {
  assert.equal(classifyPath("mcp-server/data/state/x.json").category, "state-data");
  assert.equal(classifyPath("package.json").category, "build-config");
  assert.equal(classifyPath("vitest.config.ts").category, "build-config");
  assert.equal(classifyPath("README.md").category, "doc");
  assert.equal(classifyPath("misc/whatever.xyz").category, "other");
});

test("classifyPath: skip-set wins over everything", () => {
  assert.equal(classifyPath("mcp-server/node_modules/pkg/index.js").skip, true);
  assert.equal(classifyPath("H:/prism/.git/objects/ab/cd").skip, true);
  assert.equal(classifyPath(".venv/lib/site-packages/x.py").skip, true);
});

test("every emitted category is in ALL_CATEGORIES", () => {
  const seen = ["H:/prism/mcp-server/src/engines/mill/X.ts", "scripts/a.mjs", "README.md", "node_modules/x.js", "misc/y.bin"]
    .map((p) => classifyPath(p).category);
  for (const c of seen) assert.ok(ALL_CATEGORIES.includes(c), `${c} not declared`);
});

test("resolveGalaxy: boundary-safe (no 'cam' in 'camera')", () => {
  assert.equal(resolveGalaxy("h:/prism/mcp-server/src/engines/cam/x.ts"), "cam");
  assert.equal(resolveGalaxy("h:/x/camera/y.ts"), null);
  assert.equal(resolveGalaxy("h:/x/lathe-pro/y.ts"), "lathe");
});

test("isKnowledgeFile: docs/specs/CAD qualify, source code does not", () => {
  assert.equal(isKnowledgeFile("manual.pdf"), true);
  assert.equal(isKnowledgeFile("part.STEP"), true);
  assert.equal(isKnowledgeFile("Engine.ts"), false);
  assert.equal(isKnowledgeFile("data.json"), false);
});

// -- indexDomain (pure aggregation) -----------------------------------------
function fakeWalk(rels, truncated = false) {
  return {
    files: rels.map((r) => ({ abs: "h:/prism/" + r, rel: r, ext: path.extname(r).toLowerCase(), name: path.basename(r) })),
    stats: { truncated },
  };
}

test("indexDomain: aggregates counts, categories, galaxies, subdirs", () => {
  const rec = indexDomain("mcp-server", "repo-subdir", fakeWalk([
    "src/engines/mill/a.ts",
    "src/engines/lathe/b.ts",
    "data/state/x.json",
  ]));
  assert.equal(rec.fileCount, 3);
  assert.equal(rec.dominantCategory, "galaxy-engine");
  assert.deepEqual(rec.galaxies, ["lathe", "mill"]);
  const cats = Object.fromEntries(rec.categories.map((c) => [c.k, c.v]));
  assert.equal(cats["galaxy-engine"], 2);
  assert.equal(cats["state-data"], 1);
  const subs = rec.topSubdirs.map((s) => s.k);
  assert.ok(subs.includes("src") && subs.includes("data"));
});

test("indexDomain: truncated flag + empty domain are honest", () => {
  assert.equal(indexDomain("x", "repo-subdir", fakeWalk(["a/b.ts"], true)).truncated, true);
  const empty = indexDomain("empty", "infra-tool", fakeWalk([]));
  assert.equal(empty.fileCount, 0);
  assert.equal(empty.dominantCategory, "empty");
});

// -- shouldEmitNote ----------------------------------------------------------
test("shouldEmitNote: substantive yes; clones/junk/empty no", () => {
  assert.equal(shouldEmitNote({ class: "repo-subdir", fileCount: 5 }), true);
  assert.equal(shouldEmitNote({ class: "worktree-clone", fileCount: 99 }), false);
  assert.equal(shouldEmitNote({ class: "skip-junk", fileCount: 99 }), false);
  assert.equal(shouldEmitNote({ class: "repo-subdir", fileCount: 0 }), false);
});

// -- buildDomainNote / buildCoverageMap -------------------------------------
test("buildDomainNote: emits frontmatter + category breakdown + truncation honesty", () => {
  const rec = indexDomain("resources", "knowledge-asset", fakeWalk(["cad/x.stp", "cad/y.step"], true));
  const note = buildDomainNote(rec, "H:/ top-level", "2026-06-14T00:00:00.000Z");
  assert.match(note, /^---\nname: reference_hdrive_/);
  assert.match(note, /type: reference/);
  assert.match(note, /class: \*\*knowledge-asset\*\*/);
  assert.match(note, /walk capped/); // truncation surfaced (R12)
  assert.match(note, /## Category breakdown/);
});

test("buildCoverageMap: conserves totals; md lists every folder", () => {
  const scopes = [
    { label: "H:/ top-level", records: [indexDomain("OBSIDIAN", "knowledge-asset", fakeWalk(["notes/a.md", "notes/b.md"]))] },
    { label: "H:/prism subdirs", records: [indexDomain("scripts", "repo-subdir", fakeWalk(["x.mjs", "y.mjs", "z.mjs"]))] },
  ];
  const { md, json } = buildCoverageMap(scopes, "2026-06-14T00:00:00.000Z", { count: 12, names: ["prism-slot-papa"] });
  assert.equal(json.schemaVersion, "1.0.0");
  assert.equal(json.totalDomains, 2);
  assert.equal(json.totalFilesIndexed, 5);
  assert.equal(json.cloneAggregate.count, 12);
  assert.match(md, /H-DRIVE -> OBSIDIAN VAULT COVERAGE MAP/);
  assert.match(md, /OBSIDIAN/);
  assert.match(md, /scripts/);
  assert.match(md, /12 .*clones/);
});

// -- REAL integration oracle: walkDir -> indexDomain end-to-end --------------
test("REAL: walking scripts/lib through walkDir+indexDomain classifies as script", async () => {
  const { walkDir } = await import("./expand-system-viz-l12-files.mjs");
  const dir = path.join(REPO_ROOT, "scripts", "lib");
  const walked = walkDir(dir, { maxFiles: 5000 });
  const rec = indexDomain("lib", "repo-subdir", walked);
  assert.ok(rec.fileCount > 0, "scripts/lib must contain files");
  const cats = Object.fromEntries(rec.categories.map((c) => [c.k, c.v]));
  assert.ok((cats["script"] || 0) > 0, "scripts/lib/*.mjs must classify as script via full-path (f.abs)");
});

test("SKIP_SEGMENTS contains the load-bearing junk dirs", () => {
  for (const s of ["node_modules", ".git", ".cache", ".venv", "__pycache__", "dist"]) {
    assert.ok(SKIP_SEGMENTS.has(s), `${s} must be in SKIP_SEGMENTS`);
  }
});
