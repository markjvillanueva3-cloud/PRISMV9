/**
 * Tests for dream-stage-memory-receipt.mjs — pure-fn + I/O wrapper coverage.
 *
 * U-DR08 (slot:bravo 2026-05-26). Real concrete-value assertions
 * (no toBeDefined stubs — per feedback_test_legitimacy gate).
 *
 * Uses node:test mock fs to stay hermetic — never touches real auto-memory dir.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  sha256,
  scanMemoryDir,
  diffSnapshots,
  artifactId,
  renderReport,
  buildBundleFiles,
  run,
} from "./dream-stage-memory-receipt.mjs";

describe("sha256", () => {
  it("computes deterministic hex digest", () => {
    const a = sha256(Buffer.from("hello"));
    const b = sha256(Buffer.from("hello"));
    assert.equal(a, b);
    assert.equal(a.length, 64);
    assert.match(a, /^[0-9a-f]+$/);
  });
  it("differs for different inputs", () => {
    assert.notEqual(sha256(Buffer.from("a")), sha256(Buffer.from("b")));
  });
});

describe("scanMemoryDir", () => {
  // Normalize separators so Windows path.join → posix lookup works
  const norm = (p) => String(p).replace(/[/\\]+/g, "/").replace(/\/$/, "");
  const makeMockFs = (files) => {
    const normFiles = {};
    for (const k of Object.keys(files)) normFiles[norm(k)] = files[k];
    return {
      readdirSync(dir) {
        const list = normFiles[norm(dir)];
        if (!list) throw new Error(`ENOENT ${dir}`);
        return Object.keys(list);
      },
      readFileSync(p) {
        const n = norm(p);
        const slash = n.lastIndexOf("/");
        const dir = n.slice(0, slash);
        const name = n.slice(slash + 1);
        const content = normFiles[dir]?.[name];
        if (content == null) throw new Error(`ENOENT ${p}`);
        return Buffer.from(content);
      },
    };
  };
  it("hashes only .md files", () => {
    const dir = "/mem";
    const fsImpl = makeMockFs({
      [dir]: { "a.md": "alpha", "b.md": "beta", "ignore.txt": "skip" },
    });
    const snap = scanMemoryDir(dir, fsImpl);
    assert.equal(Object.keys(snap).length, 2);
    assert.ok(snap["a.md"].sha);
    assert.equal(snap["a.md"].bytes, 5);
    assert.equal(snap["b.md"].bytes, 4);
    assert.equal(snap["ignore.txt"], undefined);
  });
  it("returns empty object on missing dir", () => {
    assert.deepEqual(scanMemoryDir("/no-such", makeMockFs({})), {});
  });
});

describe("diffSnapshots", () => {
  it("reports added/removed/changed and totals", () => {
    const a = { "x.md": { sha: "h1", bytes: 1 }, "y.md": { sha: "h2", bytes: 1 } };
    const b = { "y.md": { sha: "h2-new", bytes: 1 }, "z.md": { sha: "h3", bytes: 1 } };
    const d = diffSnapshots(a, b);
    assert.deepEqual(d.added, ["z.md"]);
    assert.deepEqual(d.removed, ["x.md"]);
    assert.deepEqual(d.changed, ["y.md"]);
    assert.equal(d.unchanged_count, 0);
    assert.equal(d.total_a, 2);
    assert.equal(d.total_b, 2);
  });
  it("identical snapshots → all-unchanged, no diff", () => {
    const snap = { "a.md": { sha: "h", bytes: 1 } };
    const d = diffSnapshots(snap, snap);
    assert.deepEqual(d.added, []);
    assert.deepEqual(d.removed, []);
    assert.deepEqual(d.changed, []);
    assert.equal(d.unchanged_count, 1);
  });
  it("empty inputs", () => {
    const d = diffSnapshots({}, {});
    assert.equal(d.added.length, 0);
    assert.equal(d.removed.length, 0);
    assert.equal(d.changed.length, 0);
    assert.equal(d.total_a, 0);
    assert.equal(d.total_b, 0);
  });
});

describe("artifactId", () => {
  it("matches mem-<iso>-<rand> pattern", () => {
    const id = artifactId(Date.UTC(2026, 4, 26, 12, 0, 0));
    assert.match(id, /^mem-2026-05-26T12-00-00-000Z-[0-9a-f]{6}$/);
  });
  it("produces distinct ids on repeated calls", () => {
    const id1 = artifactId(0);
    const id2 = artifactId(0);
    assert.notEqual(id1, id2); // randomness component differs
  });
});

describe("renderReport", () => {
  it("includes artifact id, schema, status, source-summary line", () => {
    const md = renderReport({
      artifact_id: "mem-abc",
      created_at: "2026-05-26T00:00:00Z",
      created_by: "test",
      source_summary: "memory-diff +1 -0 ~0",
      proposalCount: 1,
      sourceCount: 1,
    });
    assert.ok(md.includes("# Dream Artifact Bundle — mem-abc"));
    assert.ok(md.includes("**Status**: staged"));
    assert.ok(md.includes("**Schema**: 1.0.0"));
    assert.ok(md.includes("memory-diff +1 -0 ~0"));
    assert.ok(md.includes("## Proposals (1)"));
    assert.ok(md.includes("/dream-review mem-abc"));
  });
});

describe("buildBundleFiles", () => {
  const baseDiff = {
    added: ["new.md"],
    removed: ["gone.md"],
    changed: ["mod.md"],
    unchanged_count: 1,
    total_a: 3,
    total_b: 3,
  };
  const current = {
    "new.md": { sha: "h-new", bytes: 10 },
    "mod.md": { sha: "h-mod-new", bytes: 20 },
    "keep.md": { sha: "h-keep", bytes: 5 },
  };
  const baseline = {
    "gone.md": { sha: "h-gone", bytes: 8 },
    "mod.md": { sha: "h-mod-old", bytes: 18 },
    "keep.md": { sha: "h-keep", bytes: 5 },
  };
  it("emits 4 well-formed bundle files", () => {
    const files = buildBundleFiles({
      diff: baseDiff,
      current,
      baseline,
      artifact_id: "mem-test",
      created_at: "2026-05-26T00:00:00Z",
      created_by: "test",
      maxFiles: 100,
    });
    assert.equal(Object.keys(files).length, 4);
    // manifest is valid JSON with status=staged
    const manifest = JSON.parse(files["manifest.json"]);
    assert.equal(manifest.status, "staged");
    assert.equal(manifest.schemaVersion, "1.0.0");
    assert.equal(manifest.artifact_id, "mem-test");
    assert.equal(manifest.proposal_count, 3);
    assert.equal(manifest.source_count, 3);
    // proposals.jsonl has one line per change
    const proposals = files["proposals.jsonl"].trim().split("\n").map((l) => JSON.parse(l));
    assert.equal(proposals.length, 3);
    assert.ok(proposals.some((p) => p.mutation_type === "write" && p.proposal_id === "mem-add-new.md"));
    assert.ok(proposals.some((p) => p.mutation_type === "delete" && p.before_sha256 === "h-gone"));
    assert.ok(proposals.some((p) => p.mutation_type === "patch" && p.before_sha256 === "h-mod-old"));
    // sources.jsonl entries match current snapshot
    const sources = files["sources.jsonl"].trim().split("\n").map((l) => JSON.parse(l));
    assert.equal(sources.length, 3);
    assert.ok(sources.every((s) => s.source_type === "memory"));
    assert.ok(sources.every((s) => /^mem-/.test(s.source_id)));
    // every proposal has risk_class memory
    assert.ok(proposals.every((p) => p.risk_class === "memory"));
  });
  it("respects maxFiles cap", () => {
    const bigDiff = {
      added: Array.from({ length: 300 }, (_, i) => `a${i}.md`),
      removed: [],
      changed: [],
      unchanged_count: 0,
      total_a: 0,
      total_b: 300,
    };
    const bigCurrent = Object.fromEntries(bigDiff.added.map((id) => [id, { sha: "h", bytes: 1 }]));
    const files = buildBundleFiles({
      diff: bigDiff,
      current: bigCurrent,
      baseline: {},
      artifact_id: "mem-cap",
      created_at: "2026-05-26T00:00:00Z",
      created_by: "test",
      maxFiles: 50,
    });
    const proposals = files["proposals.jsonl"].trim().split("\n").map((l) => JSON.parse(l));
    assert.equal(proposals.length, 50);
    const manifest = JSON.parse(files["manifest.json"]);
    assert.equal(manifest.proposal_count, 50);
  });
});

describe("run (integration via mock fs)", () => {
  function makeMockFs() {
    // All keys normalized to posix-style internally so Windows path.join works.
    const norm = (p) => String(p).replace(/[/\\]+/g, "/").replace(/\/$/, "");
    const store = new Map();
    const dirs = new Set();
    return {
      _store: store,
      _dirs: dirs,
      _norm: norm,
      existsSync(p) {
        const n = norm(p);
        return store.has(n) || dirs.has(n);
      },
      readdirSync(dir) {
        const prefix = norm(dir) + "/";
        const out = new Set();
        for (const k of store.keys()) {
          if (k.startsWith(prefix)) out.add(k.slice(prefix.length).split("/")[0]);
        }
        return [...out];
      },
      readFileSync(p, enc) {
        const n = norm(p);
        if (!store.has(n)) throw new Error(`ENOENT ${p}`);
        const v = store.get(n);
        return enc === "utf8" ? v.toString("utf8") : v;
      },
      writeFileSync(p, content) {
        const n = norm(p);
        const buf = Buffer.isBuffer(content) ? content : Buffer.from(String(content));
        store.set(n, buf);
        const slash = n.lastIndexOf("/");
        if (slash > 0) dirs.add(n.slice(0, slash));
      },
      mkdirSync(dir) { dirs.add(norm(dir)); },
    };
  }

  it("first run with empty baseline writes a bundle for every memory file", () => {
    const fsImpl = makeMockFs();
    const memDir = "/mem";
    fsImpl._dirs.add(memDir);
    fsImpl.writeFileSync(path.join(memDir, "a.md"), "alpha");
    fsImpl.writeFileSync(path.join(memDir, "b.md"), "beta");
    const result = run({
      memoryDir: memDir,
      baselinePath: "/state/dream-stage-memory-baseline.json",
      artifactsRoot: "/state/dream-artifacts",
      now: () => Date.UTC(2026, 4, 26, 0, 0, 0),
      fsImpl,
    });
    assert.equal(result.ok, true);
    assert.equal(result.proposalCount, 2);
    assert.ok(result.artifact_id.startsWith("mem-"));
    // 4 files written under bundle dir (normalize separators for lookup)
    const bundleDirNorm = fsImpl._norm(result.bundleDir);
    const bundleFiles = [...fsImpl._store.keys()].filter((k) => k.startsWith(bundleDirNorm));
    assert.equal(bundleFiles.length, 4);
    // baseline persisted
    assert.ok(fsImpl._store.has("/state/dream-stage-memory-baseline.json"));
  });

  it("no-changes returns skipped + no bundle", () => {
    const fsImpl = makeMockFs();
    const memDir = "/mem";
    fsImpl._dirs.add(memDir);
    fsImpl.writeFileSync(path.join(memDir, "a.md"), "alpha");
    // Pre-write baseline matching current
    const baseline = { updated_at: "x", files: { "a.md": { sha: sha256(Buffer.from("alpha")), bytes: 5 } } };
    fsImpl.writeFileSync("/state/baseline.json", JSON.stringify(baseline));
    const result = run({
      memoryDir: memDir,
      baselinePath: "/state/baseline.json",
      artifactsRoot: "/state/dream-artifacts",
      now: () => 0,
      fsImpl,
    });
    assert.equal(result.ok, true);
    assert.equal(result.skipped, true);
    // No bundle dir created
    assert.equal([...fsImpl._store.keys()].filter((k) => k.startsWith("/state/dream-artifacts/")).length, 0);
  });

  it("memory-dir-missing returns ok:false with reason", () => {
    const fsImpl = makeMockFs();
    const result = run({ memoryDir: "/no-such", baselinePath: "/x", artifactsRoot: "/y", fsImpl });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "memory-dir-missing");
  });

  it("dryRun=true computes diff but writes nothing", () => {
    const fsImpl = makeMockFs();
    const memDir = "/mem";
    fsImpl._dirs.add(memDir);
    fsImpl.writeFileSync(path.join(memDir, "a.md"), "alpha");
    const result = run({
      memoryDir: memDir,
      baselinePath: "/state/baseline.json",
      artifactsRoot: "/state/dream-artifacts",
      now: () => 0,
      fsImpl,
      dryRun: true,
    });
    assert.equal(result.ok, true);
    assert.equal(result.dryRun, true);
    assert.ok(result.bundleBytes > 0);
    // No bundle written
    assert.equal([...fsImpl._store.keys()].filter((k) => k.startsWith("/state/dream-artifacts/")).length, 0);
    // Baseline NOT updated
    assert.equal(fsImpl._store.has("/state/baseline.json"), false);
  });
});
