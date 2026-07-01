/**
 * cad-regen-test.test.mjs — CAD-COMPLETE-MS0/U-CADC22
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CADRegenTestHarness,
  cadRegenTestHarness,
  walkCadFiles,
  aggregateBatchReport,
  clampLimit,
  clampGate,
  DEFAULT_EXTENSIONS,
  DEFAULT_GATE,
  MAX_REASONABLE_LIMIT,
} from "../cad-regen-test.mjs";

function mockFs(structure) {
  return {
    readdir: (p) => {
      const node = structure[p];
      if (node?.type === "dir") return node.entries;
      throw new Error(`ENOTDIR: ${p}`);
    },
    stat: (p) => {
      const node = structure[p];
      if (!node) throw new Error(`ENOENT: ${p}`);
      return {
        isDirectory: () => node.type === "dir",
        isFile: () => node.type === "file",
        size: node.type === "file" ? node.size : 0,
      };
    },
  };
}

function fileReport(passed, ext = ".step") {
  return { path: `/x${Math.random()}${ext}`, ext, size: 100, passed, reason: passed ? "ok" : "fail", durationMs: 1 };
}

describe("constants", () => {
  it("DEFAULT_GATE is 0.7", () => assert.equal(DEFAULT_GATE, 0.7));
  it("DEFAULT_EXTENSIONS includes major CAD formats", () => {
    assert.ok(DEFAULT_EXTENSIONS.includes(".step"));
    assert.ok(DEFAULT_EXTENSIONS.includes(".ipt"));
    assert.ok(DEFAULT_EXTENSIONS.includes(".sldprt"));
  });
});

describe("clampLimit", () => {
  it("undefined → Infinity default", () => assert.equal(clampLimit(undefined), Infinity));
  it("valid integer passthrough", () => assert.equal(clampLimit(50), 50));
  it("negative → 0", () => assert.equal(clampLimit(-5), 0));
  it("non-finite → default", () => assert.equal(clampLimit(NaN, 100), 100));
  it("above MAX → MAX", () => assert.equal(clampLimit(MAX_REASONABLE_LIMIT + 1000), MAX_REASONABLE_LIMIT));
});

describe("clampGate", () => {
  it("default 0.7", () => assert.equal(clampGate(undefined), 0.7));
  it("valid", () => assert.equal(clampGate(0.85), 0.85));
  it("clamps below 0", () => assert.equal(clampGate(-1), 0));
  it("clamps above 1", () => assert.equal(clampGate(2), 1));
});

describe("walkCadFiles", () => {
  it("returns matching extensions only", () => {
    const fs = mockFs({
      "/root": { type: "dir", entries: ["a.step", "b.txt", "c.ipt"] },
      "/root/a.step": { type: "file", size: 1000 },
      "/root/b.txt": { type: "file", size: 100 },
      "/root/c.ipt": { type: "file", size: 2000 },
    });
    const out = walkCadFiles("/root", [".step", ".ipt"], 100, fs);
    assert.equal(out.length, 2);
    assert.deepEqual(out.map(f => f.ext).sort(), [".ipt", ".step"]);
  });

  it("recurses into subdirectories", () => {
    const fs = mockFs({
      "/r": { type: "dir", entries: ["sub"] },
      "/r/sub": { type: "dir", entries: ["x.step"] },
      "/r/sub/x.step": { type: "file", size: 500 },
    });
    const out = walkCadFiles("/r", [".step"], 100, fs);
    assert.equal(out.length, 1);
  });

  it("respects limit cap", () => {
    const root = { type: "dir", entries: [] };
    const struct = { "/r": root };
    for (let i = 0; i < 10; i++) {
      const name = `f${i}.step`;
      root.entries.push(name);
      struct[`/r/${name}`] = { type: "file", size: 100 };
    }
    const fs = mockFs(struct);
    const out = walkCadFiles("/r", [".step"], 3, fs);
    assert.equal(out.length, 3);
  });

  it("unreadable directory returns empty", () => {
    const fs = mockFs({});
    const out = walkCadFiles("/nonexistent", [".step"], 100, fs);
    assert.deepEqual(out, []);
  });

  it("non-file non-dir entries skipped defensively", () => {
    const fs = mockFs({ "/r": { type: "dir", entries: ["weird"] } });
    const out = walkCadFiles("/r", [".step"], 100, fs);
    assert.deepEqual(out, []);
  });
});

describe("aggregateBatchReport", () => {
  it("empty → 0 pass rate, gate fail", () => {
    const r = aggregateBatchReport("/r", 0, [], 0.7, "2026-05-23T00:00:00Z");
    assert.equal(r.passRate, 0);
    assert.equal(r.passedGate, false);
  });

  it("all pass → 1.0 + gate pass", () => {
    const r = aggregateBatchReport("/r", 3, [fileReport(true), fileReport(true), fileReport(true)], 0.5, "2026-05-23T00:00:00Z");
    assert.equal(r.passRate, 1);
    assert.equal(r.passedGate, true);
  });

  it("partial: 2 of 4 pass, gate 0.5 → boundary PASS", () => {
    const r = aggregateBatchReport("/r", 4, [fileReport(true), fileReport(false), fileReport(true), fileReport(false)], 0.5, "2026-05-23T00:00:00Z");
    assert.equal(r.passRate, 0.5);
    assert.equal(r.passedGate, true);
  });

  it("below gate → FAIL", () => {
    const r = aggregateBatchReport("/r", 4, [fileReport(true), fileReport(false), fileReport(false), fileReport(false)], 0.5, "2026-05-23T00:00:00Z");
    assert.equal(r.passRate, 0.25);
    assert.equal(r.passedGate, false);
  });

  it("schemaVersion pinned to 1", () => {
    const r = aggregateBatchReport("/r", 0, [], 0.7, "2026-05-23T00:00:00Z");
    assert.equal(r.schemaVersion, 1);
  });
});

describe("CADRegenTestHarness.runBatch", () => {
  it("rejects empty root", async () => {
    await assert.rejects(() => new CADRegenTestHarness().runBatch({ root: "" }), /root must be non-empty/);
  });

  it("returns empty report when no files match", async () => {
    const eng = new CADRegenTestHarness();
    const fs = mockFs({});
    const r = await eng.runBatch({
      root: "/nonexistent",
      fsLike: fs,
      regenCheck: { check: () => ({ passed: true, reason: "stub", durationMs: 0 }) },
      now: () => new Date("2026-05-23T12:00:00.000Z"),
    });
    assert.equal(r.totalChecked, 0);
    assert.equal(r.passedGate, false);
    assert.equal(r.ranAtIso, "2026-05-23T12:00:00.000Z");
  });

  it("runs injected regenCheck against matched files", async () => {
    const fs = mockFs({
      "/r": { type: "dir", entries: ["a.step", "b.step"] },
      "/r/a.step": { type: "file", size: 100 },
      "/r/b.step": { type: "file", size: 200 },
    });
    let calls = 0;
    const eng = new CADRegenTestHarness();
    const r = await eng.runBatch({
      root: "/r",
      fsLike: fs,
      regenCheck: { check: (p) => { calls++; return { passed: p.endsWith("a.step"), reason: "stub", durationMs: 0 }; } },
    });
    assert.equal(calls, 2);
    assert.equal(r.totalChecked, 2);
    assert.equal(r.passedCount, 1);
    assert.equal(r.failedCount, 1);
    assert.equal(r.passRate, 0.5);
  });

  it("catches regenCheck throws as fail verdict (R12 fail-loud)", async () => {
    const fs = mockFs({
      "/r": { type: "dir", entries: ["a.step"] },
      "/r/a.step": { type: "file", size: 100 },
    });
    const r = await new CADRegenTestHarness().runBatch({
      root: "/r",
      fsLike: fs,
      regenCheck: { check: () => { throw new Error("boom"); } },
    });
    assert.equal(r.totalChecked, 1);
    assert.equal(r.failedCount, 1);
    assert.match(r.files[0].reason, /regenCheck threw: boom/);
  });

  it("handles async regenCheck (Promise return)", async () => {
    const fs = mockFs({
      "/r": { type: "dir", entries: ["a.step"] },
      "/r/a.step": { type: "file", size: 100 },
    });
    const r = await new CADRegenTestHarness().runBatch({
      root: "/r",
      fsLike: fs,
      regenCheck: { check: async () => ({ passed: true, reason: "async-ok", durationMs: 1 }) },
    });
    assert.equal(r.passedCount, 1);
  });

  it("renderSummary includes pass rate + verdict", () => {
    const eng = new CADRegenTestHarness();
    const r = aggregateBatchReport("/r", 4, [fileReport(true), fileReport(true), fileReport(true), fileReport(false)], 0.7, "2026-05-23T00:00:00Z");
    const s = eng.renderSummary(r);
    assert.match(s, /pass=3/);
    assert.match(s, /fail=1/);
    assert.match(s, /rate=75\.0%/);
    assert.match(s, /verdict=PASS/);
  });

  it("singleton is the engine class", () => {
    assert.ok(cadRegenTestHarness instanceof CADRegenTestHarness);
  });
});
