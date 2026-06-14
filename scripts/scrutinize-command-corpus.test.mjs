/**
 * Tests for scripts/scrutinize-command-corpus.mjs (U-CK11 per-category
 * scrutiny pass over the command corpus).
 *
 * Hermetic — exercises the pure-core helpers (parsing, categorisation,
 * finding emission, aggregation) against synthetic inputs. The CLI runner
 * is exercised end-to-end against a temp dir built per-test.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  extractFrontmatter,
  parseFlatYaml,
  inferCategory,
  scrutinizeFile,
  aggregate,
  walkMdFiles,
  run,
} from "./scrutinize-command-corpus.mjs";

describe("extractFrontmatter", () => {
  it("returns {fmText, body} for a well-formed file", () => {
    const c = "---\nname: foo\ndescription: a description that is long enough\n---\n# Body\n\nstuff\n";
    const r = extractFrontmatter(c);
    assert.equal(r.fmText, "name: foo\ndescription: a description that is long enough");
    assert.equal(r.body.trim(), "# Body\n\nstuff");
  });

  it("returns null when there is no opening `---` fence", () => {
    assert.equal(extractFrontmatter("# Plain markdown\n\nno frontmatter."), null);
  });

  it("returns null when the closing fence is missing", () => {
    assert.equal(extractFrontmatter("---\nname: foo\nno closing fence ever\n"), null);
  });

  it("handles CRLF line endings (Windows-saved files)", () => {
    const c = "---\r\nname: foo\r\ndescription: ok-enough-for-our-tests\r\n---\r\nbody\r\n";
    const r = extractFrontmatter(c);
    assert.ok(r);
    assert.match(r.fmText, /name: foo/);
  });
});

describe("parseFlatYaml", () => {
  it("extracts top-level scalar key:value pairs", () => {
    const m = parseFlatYaml("name: foo\ndescription: hello world\n");
    assert.equal(m.name, "foo");
    assert.equal(m.description, "hello world");
  });

  it("collapses continuation lines into the previous value", () => {
    const m = parseFlatYaml("description: line one\n  and line two\nname: foo\n");
    assert.equal(m.description, "line one and line two");
    assert.equal(m.name, "foo");
  });

  it("returns an empty object for empty input", () => {
    assert.deepEqual(parseFlatYaml(""), {});
  });
});

describe("inferCategory", () => {
  it("uses frontmatter `category` if present", () => {
    assert.equal(inferCategory("foo", { category: "hygiene" }), "hygiene");
  });

  it("falls back to namespace prefix `ns:cmd` → `ns`", () => {
    assert.equal(inferCategory("sparc:ask", {}), "sparc");
  });

  it("falls back to name-prefix `forge-audit` → `forge`", () => {
    assert.equal(inferCategory("forge-audit", {}), "forge");
  });

  it("returns the name when there is no separator", () => {
    assert.equal(inferCategory("checkin", {}), "checkin");
  });

  it("returns 'ungrouped' when name is missing", () => {
    assert.equal(inferCategory(null, {}), "ungrouped");
    assert.equal(inferCategory(undefined, {}), "ungrouped");
  });
});

describe("scrutinizeFile", () => {
  it("flags missing-frontmatter as P0 and emits no name/category collapses to ungrouped", () => {
    const r = scrutinizeFile("/x.md", "no fences here");
    assert.equal(r.hasFrontmatter, false);
    assert.equal(r.category, "ungrouped");
    assert.equal(r.findings.length, 1);
    assert.equal(r.findings[0].severity, "P0");
    assert.equal(r.findings[0].code, "missing-frontmatter");
  });

  it("flags missing-name + missing-description as two P0 findings", () => {
    const r = scrutinizeFile("/x.md", "---\nother: irrelevant\n---\nbody\n");
    const codes = r.findings.map((f) => f.code);
    assert.ok(codes.includes("missing-name"));
    assert.ok(codes.includes("missing-description"));
    const sev = r.findings
      .filter((f) => f.code === "missing-name" || f.code === "missing-description")
      .map((f) => f.severity);
    assert.deepEqual(sev, ["P0", "P0"]);
  });

  it("flags name-pattern violation as P1", () => {
    const r = scrutinizeFile("/x.md", "---\nname: BadCASE\ndescription: a sufficiently long description\n---\nbody\n");
    const p1 = r.findings.find((f) => f.code === "name-pattern");
    assert.ok(p1);
    assert.equal(p1.severity, "P1");
  });

  it("flags description-too-short (<16 chars) as P1", () => {
    const r = scrutinizeFile("/x.md", "---\nname: ok\ndescription: short\n---\nbody\n");
    const p1 = r.findings.find((f) => f.code === "description-too-short");
    assert.ok(p1);
    assert.equal(p1.severity, "P1");
  });

  it("flags TODO/FIXME markers in body as P2", () => {
    const body = "Some content with a TODO marker in it.";
    const r = scrutinizeFile(
      "/x.md",
      `---\nname: ok\ndescription: long enough description here\n---\n${body}\n`,
    );
    const p2 = r.findings.find((f) => f.code === "todo-marker");
    assert.ok(p2);
    assert.equal(p2.severity, "P2");
  });

  it("flags empty-body as P1", () => {
    const r = scrutinizeFile("/x.md", "---\nname: ok\ndescription: long enough description here\n---\n");
    const p1 = r.findings.find((f) => f.code === "empty-body");
    assert.ok(p1);
    assert.equal(p1.severity, "P1");
  });

  it("clean file with valid frontmatter + body emits NO findings", () => {
    const r = scrutinizeFile(
      "/checkin.md",
      "---\nname: checkin\ndescription: this is a long enough description to satisfy the minLength\n---\n# Checkin\n\nbody.\n",
    );
    assert.equal(r.findings.length, 0);
    assert.equal(r.name, "checkin");
    assert.equal(r.category, "checkin"); // no `-` or `:` in name
  });

  it("categorises by namespace prefix when name has `:`", () => {
    const r = scrutinizeFile(
      "/x.md",
      "---\nname: sparc:ask\ndescription: long enough description for schema validation\n---\nbody.\n",
    );
    assert.equal(r.category, "sparc");
  });
});

describe("aggregate", () => {
  it("produces correct totals + byCategory counts for a mixed set", () => {
    const files = ["/a.md", "/b.md", "/c.md", "/d.md"];
    const contents = new Map([
      ["/a.md", "---\nname: checkin-alpha\ndescription: ok description that is plenty long\n---\nbody.\n"],
      ["/b.md", "---\nname: checkin-bravo\ndescription: ok description that is plenty long\n---\nbody.\n"],
      ["/c.md", "---\nname: forge-audit\ndescription: ok description that is plenty long\n---\nbody.\n"],
      ["/d.md", "no frontmatter at all"], // P0 → counted under ungrouped
    ]);
    const res = aggregate(files, { read: (p) => contents.get(p) });
    assert.equal(res.totals.files, 4);
    assert.equal(res.totals.withFrontmatter, 3);
    assert.equal(res.totals.valid, 3);
    assert.equal(res.totals.withFindings, 1);
    assert.equal(res.totals.bySeverity.P0, 1); // the missing-frontmatter
    assert.equal(res.byCategory.checkin.count, 2);
    assert.equal(res.byCategory.checkin.valid, 2);
    assert.equal(res.byCategory.forge.count, 1);
    assert.equal(res.byCategory.ungrouped.count, 1);
    assert.equal(res.byCategory.ungrouped.withFindings, 1);
  });
});

describe("walkMdFiles + run end-to-end", () => {
  it("walks a temp dir and emits the expected report shape", () => {
    const dir = mkdtempSync(join(tmpdir(), "prism-cmd-scrut-"));
    try {
      mkdirSync(join(dir, "sub"), { recursive: true });
      writeFileSync(
        join(dir, "good.md"),
        "---\nname: good-cmd\ndescription: a clean command file for the test\n---\n# body\n",
      );
      writeFileSync(
        join(dir, "sub", "bad.md"),
        "no frontmatter — should be flagged as P0 missing-frontmatter",
      );

      const out = join(dir, "report.json");
      const report = run({ cmdsDir: dir, outPath: out });

      assert.equal(report.totals.files, 2);
      assert.equal(report.totals.valid, 1);
      assert.equal(report.totals.withFindings, 1);
      assert.equal(report.totals.bySeverity.P0, 1);

      // disk write
      const onDisk = JSON.parse(readFileSync(out, "utf8"));
      assert.equal(onDisk.schemaVersion, "1.0.0");
      assert.equal(onDisk.totals.files, 2);
      assert.equal(typeof onDisk.generated, "string");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("walkMdFiles ignores non-.md files and missing dirs gracefully", () => {
    const dir = mkdtempSync(join(tmpdir(), "prism-cmd-walk-"));
    try {
      writeFileSync(join(dir, "x.md"), "---\nname: x\ndescription: long enough\n---\nbody\n");
      writeFileSync(join(dir, "y.txt"), "skip me");
      const files = walkMdFiles(dir);
      assert.equal(files.length, 1);
      assert.ok(files[0].endsWith("x.md"));

      // missing dir → empty array, no throw
      assert.deepEqual(walkMdFiles(join(dir, "does-not-exist")), []);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
