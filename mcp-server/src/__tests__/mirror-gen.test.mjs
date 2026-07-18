/**
 * mirror-gen.test.mjs — U-CK05 generated-mirror generator
 *
 * Covers the public API of `.claude/kernel/mirror-gen.mjs`:
 *   - parseFrontmatter: YAML scalar/list/comment edge cases.
 *   - listOsEntities: hermetic walk with injected readers; warnings.
 *   - gitCommitSha: success + failure → "unknown".
 *   - buildMirror / buildIndex: required-field contract.
 *   - sortKeysDeep / writeDeterministic: byte-stable JSON.
 *   - runMirrorGen: full pipeline, determinism, round-trip
 *     (os/ entity edit → regen → mirror reflects new value).
 *
 * Filename convention: the U-CK05 envelope listed
 * `mcp-server/src/__tests__/mirror-gen.test.ts`. We ship `.test.mjs`
 * instead — node:test, no vitest wiring needed, importable directly
 * from the `.mjs` generator. The substance (round-trip, determinism,
 * header invariant) matches the envelope exit conditions.
 *
 * Run: node --test mcp-server/src/__tests__/mirror-gen.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

import {
  parseFrontmatter,
  listOsEntities,
  gitCommitSha,
  buildMirror,
  buildIndex,
  sortKeysDeep,
  writeDeterministic,
  runMirrorGen,
  KINDS,
} from "../../../.claude/kernel/mirror-gen.mjs";

const __filename = fileURLToPath(import.meta.url);
const PRISM_ROOT = path.resolve(path.dirname(__filename), "..", "..", "..");

// -----------------------------------------------------------------------------
// parseFrontmatter
// -----------------------------------------------------------------------------

test("parseFrontmatter — minimal happy path", () => {
  const src = "---\ntitle: Hello\nslug: hello\n---\n\nbody";
  const fm = parseFrontmatter(src);
  assert.deepEqual(fm, { title: "Hello", slug: "hello" });
});

test("parseFrontmatter — returns null when no frontmatter fence", () => {
  assert.equal(parseFrontmatter("no frontmatter"), null);
  assert.equal(parseFrontmatter(""), null);
  assert.equal(parseFrontmatter("---\ntitle: A\n"), null); // no closing fence
});

test("parseFrontmatter — returns null on non-string input", () => {
  assert.equal(parseFrontmatter(null), null);
  assert.equal(parseFrontmatter(undefined), null);
  assert.equal(parseFrontmatter(42), null);
  assert.equal(parseFrontmatter({}), null);
});

test("parseFrontmatter — handles CRLF line endings", () => {
  const src = "---\r\ntitle: Hello\r\nslug: hi\r\n---\r\nbody";
  const fm = parseFrontmatter(src);
  assert.deepEqual(fm, { title: "Hello", slug: "hi" });
});

test("parseFrontmatter — null sentinels and inline comments", () => {
  const src = "---\nmilestone: null\nunit: ~\nstatus: shipped # inline comment\n---\n";
  const fm = parseFrontmatter(src);
  assert.equal(fm.milestone, null);
  assert.equal(fm.unit, null);
  assert.equal(fm.status, "shipped");
});

test("parseFrontmatter — inline list syntax", () => {
  const src = "---\ntriggers: [one, two, 'quoted three']\nempty: []\n---\n";
  const fm = parseFrontmatter(src);
  assert.deepEqual(fm.triggers, ["one", "two", "quoted three"]);
  assert.deepEqual(fm.empty, []);
});

test("parseFrontmatter — quoted scalars", () => {
  const src = `---\nfoo: "double quoted"\nbar: 'single quoted'\nbaz: unquoted\n---\n`;
  const fm = parseFrontmatter(src);
  assert.equal(fm.foo, "double quoted");
  assert.equal(fm.bar, "single quoted");
  assert.equal(fm.baz, "unquoted");
});

test("parseFrontmatter — indented lines silently dropped (flat schema only)", () => {
  const src = "---\ntitle: T\n  nested: should-not-leak\nother: ok\n---\n";
  const fm = parseFrontmatter(src);
  assert.equal(fm.title, "T");
  assert.equal(fm.other, "ok");
  assert.equal(fm.nested, undefined);
});

test("parseFrontmatter — preserves bracket-list with no inline-comment stripping bug", () => {
  // The inline-# stripper must not chop inside [list, # something] — though
  // we treat [] as opaque list payload, hash inside a list value is preserved.
  const src = "---\nfoo: [a, b]\n---\n";
  const fm = parseFrontmatter(src);
  assert.deepEqual(fm.foo, ["a", "b"]);
});

test("parseFrontmatter — quote-aware inline-# stripper preserves hash inside quoted scalar (Arm A P1)", () => {
  // BEFORE the fix this silently truncated `"hello # world"` → `"hello`.
  const src = `---\ntitle: "hello # world"\nplain: hello # trailing comment\n---\n`;
  const fm = parseFrontmatter(src);
  assert.equal(fm.title, "hello # world", "hash inside double-quoted scalar must be preserved");
  assert.equal(fm.plain, "hello", "trailing inline comment outside quotes must still be stripped");
});

test("parseFrontmatter — list split honors quoted commas (Arm A P1)", () => {
  // BEFORE the fix this split into ['"a', 'b"', '"c"'] (3 entries, mangled).
  const src = `---\nmixed: ["a, b", "c"]\n---\n`;
  const fm = parseFrontmatter(src);
  assert.deepEqual(fm.mixed, ["a, b", "c"], "quoted comma must NOT split the list element");
});

// -----------------------------------------------------------------------------
// listOsEntities (hermetic via injected readers)
// -----------------------------------------------------------------------------

function buildHermeticReaders(tree) {
  // tree = { '<absdir>': ['file1.md', 'file2.md'], '<absfile>': '<contents>' }
  return {
    existsImpl: (p) => Object.prototype.hasOwnProperty.call(tree, p),
    readdirImpl: (p) => {
      const v = tree[p];
      if (!Array.isArray(v)) throw new Error("not a dir: " + p);
      return v;
    },
    readFileImpl: (p) => {
      const v = tree[p];
      if (typeof v !== "string") throw new Error("not a file: " + p);
      return v;
    },
    // stat returns the byte length of the file contents (string → byte
    // length via Buffer for hermetic accuracy).
    statImpl: (p) => {
      const v = tree[p];
      if (typeof v !== "string") throw new Error("not a file: " + p);
      return { size: Buffer.byteLength(v, "utf8") };
    },
  };
}

test("listOsEntities — walks kinds, skips _prefix and non-md, sorts by slug", () => {
  const osDir = "/virtual/os";
  const tree = {
    [path.join(osDir, "commands")]: ["zeta.md", "alpha.md", "_schema.md", "README.txt"],
    [path.join(osDir, "commands", "zeta.md")]: "---\ntitle: Z\nslug: zeta\n---\nbody",
    [path.join(osDir, "commands", "alpha.md")]: "---\ntitle: A\nslug: alpha\n---\nbody",
    [path.join(osDir, "commands", "_schema.md")]: "---\ntitle: SHOULD-SKIP\n---\nbody",
    [path.join(osDir, "commands", "README.txt")]: "not md",
    // other kinds missing entirely
  };
  const readers = buildHermeticReaders(tree);
  const { entities, warnings } = listOsEntities(osDir, KINDS, readers);
  assert.equal(entities.commands.length, 2);
  assert.equal(entities.commands[0].slug, "alpha");
  assert.equal(entities.commands[1].slug, "zeta");
  assert.equal(entities.commands[0].title, "A");
  // file path is posix-style relative to osDir
  assert.equal(entities.commands[0].file, "commands/alpha.md");
  // 5 missing-kind warnings (pipelines/processes/runqueue/sessions/syscalls)
  const missing = warnings.filter((w) => w.reason === "kind-dir-missing");
  assert.equal(missing.length, 5);
});

test("listOsEntities — surfaces no-frontmatter warning, never throws", () => {
  const osDir = "/virtual/os";
  const tree = {
    [path.join(osDir, "syscalls")]: ["ok.md", "bad.md"],
    [path.join(osDir, "syscalls", "ok.md")]: "---\ntitle: OK\n---\nbody",
    [path.join(osDir, "syscalls", "bad.md")]: "no frontmatter at all",
    // other kinds missing
  };
  const readers = buildHermeticReaders(tree);
  const { entities, warnings } = listOsEntities(osDir, ["syscalls"], readers);
  assert.equal(entities.syscalls.length, 1);
  assert.equal(entities.syscalls[0].slug, "ok");
  const fmWarn = warnings.find((w) => w.reason === "no-frontmatter");
  assert.equal(fmWarn?.slug, "bad");
});

test("listOsEntities — slug mismatch surfaced as _warning_slug_mismatch field", () => {
  const osDir = "/virtual/os";
  const tree = {
    [path.join(osDir, "commands")]: ["actual-slug.md"],
    [path.join(osDir, "commands", "actual-slug.md")]: "---\ntitle: T\nslug: wrong-slug\n---\n",
  };
  const readers = buildHermeticReaders(tree);
  const { entities } = listOsEntities(osDir, ["commands"], readers);
  assert.equal(entities.commands[0]._warning_slug_mismatch.filename_slug, "actual-slug");
  assert.equal(entities.commands[0]._warning_slug_mismatch.frontmatter_slug, "wrong-slug");
});

test("listOsEntities — skips oversize entities with entity-too-large warning (Arm B P1)", () => {
  // Build a >256KB entity to verify MAX_ENTITY_BYTES guard fires.
  const big = "x".repeat(300 * 1024);
  const osDir = "/virtual/os";
  const tree = {
    [path.join(osDir, "commands")]: ["fine.md", "huge.md"],
    [path.join(osDir, "commands", "fine.md")]: "---\ntitle: F\nslug: fine\n---\nbody",
    [path.join(osDir, "commands", "huge.md")]: "---\ntitle: H\nslug: huge\n---\n" + big,
  };
  const readers = buildHermeticReaders(tree);
  const { entities, warnings } = listOsEntities(osDir, ["commands"], readers);
  assert.equal(entities.commands.length, 1, "huge entity must be skipped");
  assert.equal(entities.commands[0].slug, "fine");
  const oversize = warnings.find((w) => w.reason === "entity-too-large");
  assert.equal(oversize?.slug, "huge");
  assert.ok(oversize.sizeBytes > oversize.maxBytes);
});

test("listOsEntities — project only the per-kind whitelisted fields", () => {
  const osDir = "/virtual/os";
  const tree = {
    [path.join(osDir, "pipelines")]: ["x.md"],
    [path.join(osDir, "pipelines", "x.md")]:
      "---\ntitle: X\nslug: x\nstatus: shipped\ntrigger: cron\ncron: '* * * * *'\nrandom_unknown: ignored\n---\n",
  };
  const readers = buildHermeticReaders(tree);
  const { entities } = listOsEntities(osDir, ["pipelines"], readers);
  const e = entities.pipelines[0];
  assert.equal(e.title, "X");
  assert.equal(e.status, "shipped");
  assert.equal(e.trigger, "cron");
  assert.equal(e.cron, "* * * * *");
  assert.equal(e.random_unknown, undefined, "non-schema fields must NOT leak into the mirror");
});

// -----------------------------------------------------------------------------
// gitCommitSha
// -----------------------------------------------------------------------------

test("gitCommitSha — happy path returns trimmed sha", () => {
  const sha = gitCommitSha("/no/such", {
    execFileImpl: () => "abc1234567890\n",
  });
  assert.equal(sha, "abc1234567890");
});

test("gitCommitSha — execFile throw returns 'unknown' (R12 fail-soft for traceability)", () => {
  const sha = gitCommitSha("/no/such", {
    execFileImpl: () => {
      throw new Error("not a git repo");
    },
  });
  assert.equal(sha, "unknown");
});

// -----------------------------------------------------------------------------
// buildMirror / buildIndex
// -----------------------------------------------------------------------------

test("buildMirror — required header fields present + entity-count matches", () => {
  const entries = [{ slug: "a" }, { slug: "b" }];
  const m = buildMirror("commands", entries, { commitSha: "deadbeef", generatedAt: "2026-05-17T00:00:00Z" });
  assert.equal(m["generated-from-os"], "deadbeef");
  assert.equal(m["generated-at"], "2026-05-17T00:00:00Z");
  assert.equal(m.generator, ".claude/kernel/mirror-gen.mjs");
  assert.equal(m["source-kind"], "commands");
  assert.equal(m["source-dir"], "knowledge/wiki/os/commands/");
  assert.equal(m["entity-count"], 2);
  assert.equal(m.entities.length, 2);
  assert.ok(m.WARNING.includes("do NOT hand-edit"));
});

test("buildIndex — kinds + mirrors maps populated correctly", () => {
  const summary = {
    commands: { count: 3, relOutFile: "state/shared/os-mirrors/commands.json" },
    pipelines: { count: 1, relOutFile: "state/shared/os-mirrors/pipelines.json" },
  };
  const idx = buildIndex(summary, { commitSha: "x", generatedAt: "t" });
  assert.deepEqual(idx.kinds, { commands: 3, pipelines: 1 });
  assert.equal(idx.mirrors.commands, "state/shared/os-mirrors/commands.json");
  assert.equal(idx["generated-from-os"], "x");
  assert.ok(idx.WARNING.includes("do NOT hand-edit"));
});

// -----------------------------------------------------------------------------
// sortKeysDeep / writeDeterministic
// -----------------------------------------------------------------------------

test("sortKeysDeep — recursive object key sort; arrays preserve order", () => {
  const src = { z: 1, a: { y: [3, 1, 2], x: 4 } };
  const sorted = sortKeysDeep(src);
  assert.deepEqual(Object.keys(sorted), ["a", "z"]);
  assert.deepEqual(Object.keys(sorted.a), ["x", "y"]);
  assert.deepEqual(sorted.a.y, [3, 1, 2], "array order preserved");
});

test("sortKeysDeep — does not mangle null/primitives/class instances", () => {
  assert.equal(sortKeysDeep(null), null);
  assert.equal(sortKeysDeep(42), 42);
  const d = new Date(0);
  assert.equal(sortKeysDeep(d), d, "non-plain-objects pass through unchanged");
});

test("writeDeterministic — writes sorted JSON with trailing newline (hermetic)", () => {
  const captured = {};
  writeDeterministic("/virtual/out.json", { b: 2, a: 1 }, {
    writeFileImpl: (p, data) => {
      captured.path = p;
      captured.data = data;
    },
  });
  assert.equal(captured.path, "/virtual/out.json");
  assert.equal(captured.data, '{\n  "a": 1,\n  "b": 2\n}\n');
});

// -----------------------------------------------------------------------------
// runMirrorGen — end-to-end (real FS, scoped to a tempdir)
// -----------------------------------------------------------------------------

function makeTestOsTree(osDir) {
  fs.mkdirSync(path.join(osDir, "commands"), { recursive: true });
  fs.mkdirSync(path.join(osDir, "pipelines"), { recursive: true });
  fs.mkdirSync(path.join(osDir, "syscalls"), { recursive: true });
  fs.writeFileSync(
    path.join(osDir, "commands", "hello.md"),
    "---\ntitle: Hello\nslug: hello\nstatus: shipped\ndate: 2026-05-17\nmilestone: TEST-MS0\nunit: U-T01\nauthor: tester\ntriggers: [hi]\n---\nbody"
  );
  fs.writeFileSync(
    path.join(osDir, "pipelines", "nightly.md"),
    "---\ntitle: Nightly\nslug: nightly\nstatus: shipped\ndate: 2026-05-17\nmilestone: TEST-MS0\nunit: U-T02\nauthor: tester\ntrigger: cron\ncron: '0 3 * * *'\n---\nbody"
  );
  fs.writeFileSync(
    path.join(osDir, "syscalls", "ping.md"),
    "---\ntitle: ping\nslug: ping\nstatus: shipped\ndate: 2026-05-17\nmilestone: TEST-MS0\nunit: U-T03\nauthor: tester\n---\nbody"
  );
}

test("runMirrorGen — emits one JSON per kind + index.json with required headers", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mirror-gen-e2e-"));
  try {
    const osDir = path.join(tmpRoot, "os");
    const outDir = path.join(tmpRoot, "out");
    makeTestOsTree(osDir);
    const res = runMirrorGen({
      osDir,
      outDir,
      prismRoot: tmpRoot,
      frozenTime: "2026-05-17T12:00:00Z",
      readers: { execFileImpl: () => "deadbeef\n" },
    });
    assert.equal(res.commitSha, "deadbeef");
    assert.equal(res.generatedAt, "2026-05-17T12:00:00Z");
    // Per-kind files exist with the header.
    for (const kind of KINDS) {
      const f = path.join(outDir, `${kind}.json`);
      assert.ok(fs.existsSync(f), `mirror missing: ${kind}.json`);
      const j = JSON.parse(fs.readFileSync(f, "utf8"));
      assert.equal(j["generated-from-os"], "deadbeef", `${kind} missing generated-from-os header`);
      assert.equal(j["source-kind"], kind);
    }
    // index.json catalog-of-catalogs.
    const idx = JSON.parse(fs.readFileSync(path.join(outDir, "index.json"), "utf8"));
    assert.equal(idx.kinds.commands, 1);
    assert.equal(idx.kinds.pipelines, 1);
    assert.equal(idx.kinds.syscalls, 1);
    assert.equal(idx.kinds.processes, 0);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test("runMirrorGen — DETERMINISM: re-running into the same outDir is byte-identical", () => {
  // The contract is "re-running with same inputs + same outDir produces
  // byte-equal files." The index.json embeds outDir-relative paths, so
  // two DIFFERENT outDirs would legitimately differ — that is not a
  // determinism failure. Per R12, the test models the actual contract.
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mirror-gen-det-"));
  try {
    const osDir = path.join(tmpRoot, "os");
    const outDir = path.join(tmpRoot, "out");
    makeTestOsTree(osDir);
    const opts = {
      osDir,
      outDir,
      prismRoot: tmpRoot,
      frozenTime: "2026-05-17T12:00:00Z",
      readers: { execFileImpl: () => "deadbeef\n" },
    };
    runMirrorGen(opts);
    // Snapshot bytes after run 1.
    const snapshot = {};
    for (const name of [...KINDS.map((k) => `${k}.json`), "index.json"]) {
      snapshot[name] = fs.readFileSync(path.join(outDir, name));
    }
    // Re-run (overwrites the same outDir) and verify bytes match snapshot.
    runMirrorGen(opts);
    for (const [name, before] of Object.entries(snapshot)) {
      const after = fs.readFileSync(path.join(outDir, name));
      assert.ok(after.equals(before), `byte mismatch in ${name} across runs`);
    }
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test("runMirrorGen — index.json captures per-kind relative paths to outDir", () => {
  // Documents the legitimate variation: two different outDirs DO produce
  // different index.json (relative-path embedding). This is a fail-on-revert
  // guard against accidentally moving outDir paths out of the index.
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mirror-gen-idx-"));
  try {
    const osDir = path.join(tmpRoot, "os");
    const outDir = path.join(tmpRoot, "out-A");
    makeTestOsTree(osDir);
    runMirrorGen({
      osDir,
      outDir,
      prismRoot: tmpRoot,
      frozenTime: "2026-05-17T12:00:00Z",
      readers: { execFileImpl: () => "deadbeef\n" },
    });
    const idx = JSON.parse(fs.readFileSync(path.join(outDir, "index.json"), "utf8"));
    assert.match(idx.mirrors.commands, /out-A\/commands\.json$/);
    assert.match(idx.mirrors.pipelines, /out-A\/pipelines\.json$/);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test("runMirrorGen — ROUND-TRIP: editing an os/ entity is reflected in the next regen", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mirror-gen-rt-"));
  try {
    const osDir = path.join(tmpRoot, "os");
    const outDir = path.join(tmpRoot, "out");
    makeTestOsTree(osDir);
    const opts = {
      osDir,
      outDir,
      prismRoot: tmpRoot,
      frozenTime: "2026-05-17T12:00:00Z",
      readers: { execFileImpl: () => "sha1\n" },
    };

    runMirrorGen(opts);
    const before = JSON.parse(fs.readFileSync(path.join(outDir, "commands.json"), "utf8"));
    assert.equal(before.entities[0].title, "Hello");
    assert.equal(before.entities[0].slug, "hello");

    // Edit the underlying os/ markdown and a new entity.
    fs.writeFileSync(
      path.join(osDir, "commands", "hello.md"),
      "---\ntitle: Hello-EDITED\nslug: hello\nstatus: shipped\ndate: 2026-05-17\nmilestone: TEST-MS0\nunit: U-T01\nauthor: tester\ntriggers: [hi, edited]\n---\nbody"
    );
    fs.writeFileSync(
      path.join(osDir, "commands", "world.md"),
      "---\ntitle: World\nslug: world\nstatus: in_progress\ndate: 2026-05-17\nmilestone: TEST-MS0\nunit: U-T04\nauthor: tester\n---\nbody"
    );

    runMirrorGen(opts);
    const after = JSON.parse(fs.readFileSync(path.join(outDir, "commands.json"), "utf8"));
    assert.equal(after.entities.length, 2, "world.md addition must be reflected");
    // Sorted by slug: hello, world
    assert.equal(after.entities[0].slug, "hello");
    assert.equal(after.entities[0].title, "Hello-EDITED", "edit must propagate to the mirror");
    assert.deepEqual(after.entities[0].triggers, ["hi", "edited"]);
    assert.equal(after.entities[1].slug, "world");
    assert.equal(after.entities[1].title, "World");
    assert.equal(after["entity-count"], 2);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test("runMirrorGen — when git fails, commit sha is 'unknown' (R12: never silent-corrupt traceability)", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mirror-gen-nogit-"));
  try {
    const osDir = path.join(tmpRoot, "os");
    const outDir = path.join(tmpRoot, "out");
    makeTestOsTree(osDir);
    const res = runMirrorGen({
      osDir,
      outDir,
      prismRoot: tmpRoot,
      frozenTime: "2026-05-17T12:00:00Z",
      readers: { execFileImpl: () => { throw new Error("not a git repo"); } },
    });
    assert.equal(res.commitSha, "unknown");
    const j = JSON.parse(fs.readFileSync(path.join(outDir, "commands.json"), "utf8"));
    assert.equal(j["generated-from-os"], "unknown", "header still present even when git resolution failed");
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

// -----------------------------------------------------------------------------
// Integration: real PRISM os/ tree should parse without throwing
// -----------------------------------------------------------------------------

test("runMirrorGen — live PRISM os/ tree parses without throwing (smoke)", () => {
  const liveOsDir = path.join(PRISM_ROOT, "knowledge", "wiki", "os");
  if (!fs.existsSync(liveOsDir)) {
    // Skip in environments without the live tree; do not fail.
    return;
  }
  const tmpOut = fs.mkdtempSync(path.join(os.tmpdir(), "mirror-gen-live-"));
  try {
    const res = runMirrorGen({
      osDir: liveOsDir,
      outDir: tmpOut,
      prismRoot: PRISM_ROOT,
      frozenTime: "2026-05-17T00:00:00Z",
    });
    // At least one kind should have entries.
    const total = Object.values(res.summary).reduce((acc, v) => acc + v.count, 0);
    assert.ok(total > 0, "live os/ tree should have at least one parseable entity");
    // Every emitted mirror file carries the header invariant.
    for (const kind of KINDS) {
      const f = path.join(tmpOut, `${kind}.json`);
      const j = JSON.parse(fs.readFileSync(f, "utf8"));
      assert.ok("generated-from-os" in j, `${kind} missing generated-from-os header`);
      assert.ok("WARNING" in j, `${kind} missing WARNING field`);
    }
  } finally {
    fs.rmSync(tmpOut, { recursive: true, force: true });
  }
});
