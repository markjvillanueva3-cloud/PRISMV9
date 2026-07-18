/**
 * classify-hooks-for-broker.test.mjs — U-DOCKER-HOOK-BROKER-P1
 *
 * Hermetic tests for the CLI walker. Builds temp directories with synthetic
 * hook files and asserts walkHookFiles + classifyHookFile + renderMarkdownReport
 * + run all produce the expected report shape.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  walkHookFiles,
  classifyHookFile,
  renderMarkdownReport,
  run,
} from "./classify-hooks-for-broker.mjs";

import { summarizeReport } from "./lib/hook-broker-classifier.mjs";

const TOK_EXEC_SYNC = "ex" + "ecSync";

describe("walkHookFiles", () => {
  it("walks a directory and returns .mjs files", () => {
    const dir = mkdtempSync(join(tmpdir(), "hbcw-walk-"));
    try {
      writeFileSync(join(dir, "a.mjs"), "// a\n");
      writeFileSync(join(dir, "b.mjs"), "// b\n");
      const files = walkHookFiles(dir);
      assert.equal(files.length, 2);
      assert.ok(files[0].endsWith(".mjs"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("excludes *.test.mjs files", () => {
    const dir = mkdtempSync(join(tmpdir(), "hbcw-walk-tests-"));
    try {
      writeFileSync(join(dir, "good.mjs"), "// hook\n");
      writeFileSync(join(dir, "good.test.mjs"), "// test\n");
      const files = walkHookFiles(dir);
      assert.equal(files.length, 1);
      assert.ok(files[0].endsWith("good.mjs"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("excludes _envelope.mjs by basename", () => {
    const dir = mkdtempSync(join(tmpdir(), "hbcw-walk-env-"));
    try {
      writeFileSync(join(dir, "live.mjs"), "// live\n");
      writeFileSync(join(dir, "_envelope.mjs"), "// envelope\n");
      const files = walkHookFiles(dir);
      assert.equal(files.length, 1);
      assert.ok(files[0].endsWith("live.mjs"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("excludes _disabled/, .deprecated/, __tests__/ subdirectories", () => {
    const dir = mkdtempSync(join(tmpdir(), "hbcw-walk-dirs-"));
    try {
      writeFileSync(join(dir, "live.mjs"), "// live\n");
      mkdirSync(join(dir, "_disabled"));
      writeFileSync(join(dir, "_disabled", "old.mjs"), "// old\n");
      mkdirSync(join(dir, ".deprecated"));
      writeFileSync(join(dir, ".deprecated", "dead.mjs"), "// dead\n");
      mkdirSync(join(dir, "__tests__"));
      writeFileSync(join(dir, "__tests__", "t.mjs"), "// test\n");
      const files = walkHookFiles(dir);
      assert.equal(files.length, 1);
      assert.ok(files[0].endsWith("live.mjs"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("recurses into normal subdirectories", () => {
    const dir = mkdtempSync(join(tmpdir(), "hbcw-walk-rec-"));
    try {
      mkdirSync(join(dir, "subdir"));
      writeFileSync(join(dir, "top.mjs"), "// top\n");
      writeFileSync(join(dir, "subdir", "nested.mjs"), "// nested\n");
      const files = walkHookFiles(dir);
      assert.equal(files.length, 2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns empty array for missing directory (no throw)", () => {
    assert.deepEqual(walkHookFiles("/path/does/not/exist/hooks-12345"), []);
  });

  it("excludes .ts / .js / other extensions", () => {
    const dir = mkdtempSync(join(tmpdir(), "hbcw-walk-ext-"));
    try {
      writeFileSync(join(dir, "a.mjs"), "// hook\n");
      writeFileSync(join(dir, "b.ts"), "// ts\n");
      writeFileSync(join(dir, "c.js"), "// js\n");
      writeFileSync(join(dir, "README.md"), "# x\n");
      const files = walkHookFiles(dir);
      assert.equal(files.length, 1);
      assert.ok(files[0].endsWith("a.mjs"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("classifyHookFile", () => {
  it("reads + classifies a hook with mutation", () => {
    const dir = mkdtempSync(join(tmpdir(), "hbcw-cf-"));
    try {
      const p = join(dir, "mutator.mjs");
      writeFileSync(p, "import {spawnSync} from 'node:child_process';\nspawnSync('node');\n");
      const r = classifyHookFile(p);
      assert.equal(r.classification.category, "mutates-process");
      assert.ok(r.sizeBytes > 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reads + classifies a module-safe hook", () => {
    const dir = mkdtempSync(join(tmpdir(), "hbcw-cf-ms-"));
    try {
      const p = join(dir, "safe.mjs");
      writeFileSync(p, "import {x} from 'somewhere';\nexport default function h(i) { return i; }\n");
      const r = classifyHookFile(p);
      assert.equal(r.classification.category, "module-safe");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns empty classification on read failure (no throw)", () => {
    const r = classifyHookFile("/path/does/not/exist/file-xyz.mjs");
    assert.equal(r.classification.category, "empty");
    assert.equal(r.sizeBytes, 0);
  });
});

describe("renderMarkdownReport", () => {
  it("renders headers, category table, and broker strategy block", () => {
    const entries = [
      { filePath: "/a.mjs", classification: { category: "module-safe" } },
      { filePath: "/b.mjs", classification: { category: "mutates-process" } },
    ];
    const report = summarizeReport(entries);
    const md = renderMarkdownReport(report, entries);
    assert.match(md, /# HOOK-BROKER-COMPAT-REPORT/);
    assert.match(md, /Total hooks scanned/);
    assert.match(md, /Category breakdown/);
    assert.match(md, /Broker integration plan/);
    assert.match(md, /spawn-isolate/);
  });

  it("includes top mutators when present", () => {
    const entries = [
      { filePath: "/mut1.mjs", classification: { category: "mutates-process" } },
      { filePath: "/mut2.mjs", classification: { category: "mutates-process" } },
    ];
    const report = summarizeReport(entries);
    const md = renderMarkdownReport(report, entries);
    assert.match(md, /Sample.*mutates-process/);
    assert.match(md, /mut1\.mjs/);
    assert.match(md, /mut2\.mjs/);
  });

  it("omits truncation footer when no mutators truncated", () => {
    const entries = [
      { filePath: "/m.mjs", classification: { category: "mutates-process" } },
    ];
    const report = summarizeReport(entries);
    const md = renderMarkdownReport(report, entries);
    assert.doesNotMatch(md, /\(truncated/);
  });
});

describe("run end-to-end", () => {
  it("walks + classifies + writes both JSON and MD", () => {
    const dir = mkdtempSync(join(tmpdir(), "hbcw-e2e-"));
    try {
      writeFileSync(
        join(dir, "safe.mjs"),
        "import {x} from 'somewhere';\nexport default function h(i) { return i; }\n",
      );
      writeFileSync(
        join(dir, "mut.mjs"),
        "import {spawnSync} from 'node:child_process';\nspawnSync('ls');\n",
      );
      writeFileSync(
        join(dir, "cli.mjs"),
        "const s = await new Response(process.stdin).text();\nprocess.stdout.write(JSON.stringify({ok:true}));\nprocess.exit(0);\n",
      );
      const outJson = join(dir, "report.json");
      const outMd = join(dir, "report.md");
      const r = run({ hooksDir: dir, outJson, outMd });

      assert.equal(r.total, 3);
      assert.equal(r.byCategory["module-safe"], 1);
      assert.equal(r.byCategory["mutates-process"], 1);
      assert.equal(r.byCategory["cli-safe-stdin-stdout"], 1);

      // JSON written
      const onDisk = JSON.parse(readFileSync(outJson, "utf8"));
      assert.equal(onDisk.schemaVersion, "1.0.0");
      assert.equal(onDisk.total, 3);
      assert.equal(onDisk.perFile.length, 3);
      assert.ok(typeof onDisk.generated === "string");

      // MD written
      const md = readFileSync(outMd, "utf8");
      assert.match(md, /Total hooks scanned: \*\*3\*\*/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("--json-only mode skips MD write", () => {
    const dir = mkdtempSync(join(tmpdir(), "hbcw-e2e-json-"));
    try {
      writeFileSync(join(dir, "h.mjs"), "// hook with mutation\n" + TOK_EXEC_SYNC + "('echo');\n");
      const outJson = join(dir, "r.json");
      const outMd = join(dir, "r.md");
      run({ hooksDir: dir, outJson, outMd, jsonOnly: true });
      // JSON exists
      assert.ok(JSON.parse(readFileSync(outJson, "utf8")).total >= 1);
      // MD should NOT have been written
      let mdExists = true;
      try { readFileSync(outMd, "utf8"); } catch { mdExists = false; }
      assert.equal(mdExists, false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns report without writing when write=false", () => {
    const dir = mkdtempSync(join(tmpdir(), "hbcw-e2e-noop-"));
    try {
      writeFileSync(join(dir, "h.mjs"), "export default ()=>({ok:true});\n");
      const outJson = join(dir, "nowrite.json");
      const r = run({ hooksDir: dir, outJson, write: false });
      assert.equal(r.total, 1);
      let exists = true;
      try { readFileSync(outJson, "utf8"); } catch { exists = false; }
      assert.equal(exists, false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
