/**
 * validate-pipeline-registry.test.mjs — COMMAND-KERNEL-MS0 / U-CK12
 *
 * Hermetic test suite for the pipeline-registry validator. Uses node's
 * built-in test runner (no vitest dep — matches the convention of
 * scripts/__tests__/*.test.mjs).
 *
 * Coverage matrix (B1 — test filename mirrors the unit name):
 *  - YAML parser: scalars, block lists, block mappings, flow arrays,
 *    quoted strings, comments-stripped, CRLF tolerance.
 *  - Schema validator subset: type/enum/required/pattern/minLength/
 *    maxLength/format:date/oneOf/items/minItems/uniqueItems/
 *    additionalProperties:false.
 *  - Advisory warnings (THE P1 MITIGATION SURFACE):
 *      * missing-steps-field emits when none of composed_of/composes/
 *        stages present (the load-bearing one — keeps the U-CK12 P1
 *        mitigation honest at the validator layer).
 *      * tier-budget-mismatch on entry-router/coding/product-autopilot
 *        ceiling overruns.
 *      * deprecated-without-replacement when status=deprecated lacks a
 *        replacement slug.
 *  - File discovery: excludes _underscore + .dot prefixes; sorted.
 *  - Real-data E2E: validates the 3 shipped seed entries (loop.md,
 *    goal-complete.md, knowledge-injection.md) against the live schema.
 *    This is the "fail-on-revert" oracle per the RGS-TOOL-MS1 lesson —
 *    a "pure core + injected readers" design MUST ship one real-data
 *    E2E test.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync, symlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseYaml,
  extractFrontmatter,
  validate,
  computeAdvisoryWarnings,
  buildReport,
  listPipelineFiles,
  parseArgs,
  DEFAULT_PIPELINES_DIR,
  DEFAULT_SCHEMA_PATH,
  STEPS_FIELDS,
} from "../validate-pipeline-registry.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..", "..");

function mkTmp() {
  const d = mkdtempSync(join(tmpdir(), "prism-pipeline-validate-"));
  return {
    dir: d,
    write: (name, text) => writeFileSync(join(d, name), text, "utf-8"),
    cleanup: () => { try { rmSync(d, { recursive: true, force: true }); } catch { /* swallow */ } },
  };
}

function fm(body, content = "# Body\n") {
  return `---\n${body}\n---\n\n${content}`;
}

// ---------- parseYaml --------------------------------------------------------

describe("parseYaml — scalars + flow + block", () => {
  it("parses a simple key:value mapping", () => {
    assert.deepEqual(parseYaml("a: 1\nb: hello\nc: true"), { a: 1, b: "hello", c: true });
  });
  it("parses flow arrays", () => {
    assert.deepEqual(parseYaml("xs: [1, 2, 3]"), { xs: [1, 2, 3] });
  });
  it("parses block lists of scalars", () => {
    assert.deepEqual(parseYaml("xs:\n  - a\n  - b\n  - c"), { xs: ["a", "b", "c"] });
  });
  it("strips inline comment-only lines", () => {
    assert.deepEqual(parseYaml("a: 1\n# this is a comment\nb: 2"), { a: 1, b: 2 });
  });
  it("preserves single-quoted string scalars", () => {
    assert.deepEqual(parseYaml("name: 'hello world'"), { name: "hello world" });
  });
  it("handles CRLF line endings", () => {
    assert.deepEqual(parseYaml("a: 1\r\nb: 2\r\n"), { a: 1, b: 2 });
  });
});

// ---------- extractFrontmatter ----------------------------------------------

describe("extractFrontmatter — fence delimiters", () => {
  it("extracts a well-formed frontmatter block", () => {
    const got = extractFrontmatter(fm("title: T\nslug: t"));
    assert.deepEqual(got, { title: "T", slug: "t" });
  });
  it("returns null when the file does not open with ---", () => {
    assert.equal(extractFrontmatter("no fence here\n"), null);
  });
  it("returns null on an unclosed fence", () => {
    assert.equal(extractFrontmatter("---\nname: x\nno-close"), null);
  });
  it("returns null on an empty input", () => {
    assert.equal(extractFrontmatter(""), null);
  });
});

// ---------- validate (Draft-2020-12 subset) ---------------------------------

describe("validate — required / enum / pattern / format / oneOf", () => {
  it("reports missing required fields", () => {
    const errs = validate({}, { type: "object", required: ["a"] });
    assert.ok(errs.some((e) => e.includes('missing required field "a"')));
  });
  it("rejects an enum value outside the set", () => {
    const errs = validate("foo", { type: "string", enum: ["bar", "baz"] });
    assert.ok(errs.length === 1 && errs[0].includes("not in enum"));
  });
  it("rejects an enum-of-one mismatch (the P0 fix for kind discriminator)", () => {
    const errs = validate("not-pipeline", { enum: ["pipeline"] });
    assert.ok(errs.length === 1, `expected exactly one enum error, got ${JSON.stringify(errs)}`);
  });
  it("accepts an enum-of-one match", () => {
    assert.deepEqual(validate("pipeline", { enum: ["pipeline"] }), []);
  });
  it("checks regex patterns", () => {
    const ok = validate("loop", { type: "string", pattern: "^[a-z][a-z0-9-]*(:[a-z0-9-]+)?$" });
    const bad = validate("Loop", { type: "string", pattern: "^[a-z][a-z0-9-]*(:[a-z0-9-]+)?$" });
    assert.deepEqual(ok, []);
    assert.ok(bad.length === 1 && bad[0].includes("pattern mismatch"));
  });
  it("validates format:date", () => {
    assert.deepEqual(validate("2026-05-17", { type: "string", format: "date" }), []);
    const bad = validate("not-a-date", { type: "string", format: "date" });
    assert.ok(bad.length === 1 && bad[0].includes("invalid date format"));
  });
  it("enforces oneOf with exactly-one-match semantics", () => {
    const schema = { oneOf: [{ type: "string" }, { type: "object" }] };
    assert.deepEqual(validate("a", schema), []);
    assert.deepEqual(validate({}, schema), []);
    const errs = validate(42, schema);
    assert.ok(errs.length === 1 && errs[0].includes("matched 0/2"));
  });
  it("enforces additionalProperties:false", () => {
    const errs = validate({ a: 1, b: 2 }, { type: "object", properties: { a: { type: "number" } }, additionalProperties: false });
    assert.ok(errs.length === 1 && errs[0].includes('unexpected property "b"'));
  });
  it("enforces minItems + uniqueItems on arrays", () => {
    const minSchema = { type: "array", items: { type: "string" }, minItems: 1 };
    assert.deepEqual(validate(["a"], minSchema), []);
    const empty = validate([], minSchema);
    assert.ok(empty.length === 1 && empty[0].includes("< minItems"));
    const dups = validate(["a", "a"], { type: "array", items: { type: "string" }, uniqueItems: true });
    assert.ok(dups.length === 1 && dups[0].includes("duplicate item"));
  });
});

// ---------- computeAdvisoryWarnings (the P1 mitigation surface) -------------

describe("computeAdvisoryWarnings — missing-steps-field (P1 mitigation oracle)", () => {
  it("WARNS when ALL THREE of composed_of/composes/stages are absent", () => {
    const w = computeAdvisoryWarnings({ title: "T", slug: "t", kind: "pipeline", status: "shipped", date: "2026-05-17" });
    const codes = w.map((x) => x.code);
    assert.ok(codes.includes("missing-steps-field"), `expected missing-steps-field warning, got ${JSON.stringify(codes)}`);
  });
  it("does NOT warn when composed_of is present", () => {
    const w = computeAdvisoryWarnings({ composed_of: ["a", "b"] });
    assert.equal(w.filter((x) => x.code === "missing-steps-field").length, 0);
  });
  it("does NOT warn when only composes (the deprecated alias) is present", () => {
    const w = computeAdvisoryWarnings({ composes: ["x"] });
    assert.equal(w.filter((x) => x.code === "missing-steps-field").length, 0);
  });
  it("does NOT warn when only stages is present", () => {
    const w = computeAdvisoryWarnings({ stages: ["extract", "route"] });
    assert.equal(w.filter((x) => x.code === "missing-steps-field").length, 0);
  });
  it("DOES warn when steps fields are PRESENT but EMPTY arrays", () => {
    // An empty array does not satisfy the "has orchestration" intent.
    const w = computeAdvisoryWarnings({ composed_of: [], composes: [], stages: [] });
    assert.ok(w.some((x) => x.code === "missing-steps-field"));
  });
  it("guards against null / non-object input", () => {
    assert.deepEqual(computeAdvisoryWarnings(null), []);
    assert.deepEqual(computeAdvisoryWarnings(undefined), []);
    assert.deepEqual(computeAdvisoryWarnings([]), []);
    assert.deepEqual(computeAdvisoryWarnings("string"), []);
  });
  it("STEPS_FIELDS export matches the three checked fields (regression guard)", () => {
    assert.deepEqual([...STEPS_FIELDS].sort(), ["composed_of", "composes", "stages"]);
  });
});

describe("computeAdvisoryWarnings — tier-budget-mismatch", () => {
  it("warns when entry-router tier exceeds 500-token ceiling", () => {
    const w = computeAdvisoryWarnings({ token_budget: { tier: "entry-router", max_tokens: 800 } });
    assert.ok(w.some((x) => x.code === "tier-budget-mismatch"));
  });
  it("warns when coding tier exceeds 2000-token ceiling", () => {
    const w = computeAdvisoryWarnings({ token_budget: { tier: "coding", max_tokens: 5000 } });
    assert.ok(w.some((x) => x.code === "tier-budget-mismatch"));
  });
  it("does NOT warn when within the ceiling", () => {
    const w = computeAdvisoryWarnings({ token_budget: { tier: "coding", max_tokens: 1500 }, composed_of: ["x"] });
    assert.equal(w.filter((x) => x.code === "tier-budget-mismatch").length, 0);
  });
  it("does NOT warn for tier=custom (operator-defined ceiling)", () => {
    const w = computeAdvisoryWarnings({ token_budget: { tier: "custom", max_tokens: 999999 }, composed_of: ["x"] });
    assert.equal(w.filter((x) => x.code === "tier-budget-mismatch").length, 0);
  });
});

describe("computeAdvisoryWarnings — deprecated-without-replacement", () => {
  it("warns when status=deprecated and no replacement", () => {
    const w = computeAdvisoryWarnings({ status: "deprecated", composed_of: ["x"] });
    assert.ok(w.some((x) => x.code === "deprecated-without-replacement"));
  });
  it("does NOT warn when replacement is present", () => {
    const w = computeAdvisoryWarnings({ status: "deprecated", replacement: "new-pipeline", composed_of: ["x"] });
    assert.equal(w.filter((x) => x.code === "deprecated-without-replacement").length, 0);
  });
  it("does NOT warn when status is not deprecated", () => {
    const w = computeAdvisoryWarnings({ status: "shipped", composed_of: ["x"] });
    assert.equal(w.filter((x) => x.code === "deprecated-without-replacement").length, 0);
  });
});

// ---------- listPipelineFiles -----------------------------------------------

describe("listPipelineFiles — exclusion rules", () => {
  it("excludes underscore-prefixed files (_schema.md, _README.md)", () => {
    const t = mkTmp();
    try {
      t.write("loop.md", fm("title: T"));
      t.write("_schema.md", fm("title: S"));
      t.write("_README.md", fm("title: R"));
      const files = listPipelineFiles(t.dir).map((f) => f.split(/[\\/]/).pop());
      assert.deepEqual(files, ["loop.md"]);
    } finally { t.cleanup(); }
  });
  it("excludes dotfiles (.gitkeep)", () => {
    const t = mkTmp();
    try {
      t.write("loop.md", fm("title: T"));
      t.write(".gitkeep", "");
      const files = listPipelineFiles(t.dir).map((f) => f.split(/[\\/]/).pop());
      assert.deepEqual(files, ["loop.md"]);
    } finally { t.cleanup(); }
  });
  it("excludes non-.md files", () => {
    const t = mkTmp();
    try {
      t.write("loop.md", fm("title: T"));
      t.write("loop.txt", "noise");
      const files = listPipelineFiles(t.dir).map((f) => f.split(/[\\/]/).pop());
      assert.deepEqual(files, ["loop.md"]);
    } finally { t.cleanup(); }
  });
  it("returns sorted results (deterministic for diffing)", () => {
    const t = mkTmp();
    try {
      t.write("b.md", fm("title: B"));
      t.write("a.md", fm("title: A"));
      t.write("c.md", fm("title: C"));
      const files = listPipelineFiles(t.dir).map((f) => f.split(/[\\/]/).pop());
      assert.deepEqual(files, ["a.md", "b.md", "c.md"]);
    } finally { t.cleanup(); }
  });
  it("returns empty array for a non-existent dir (fail-soft)", () => {
    assert.deepEqual(listPipelineFiles("/nonexistent-dir-x-y-z-12345"), []);
  });
});

// ---------- buildReport (pure) ----------------------------------------------

describe("buildReport — structured report assembly", () => {
  const minimalSchema = JSON.parse(readFileSync(DEFAULT_SCHEMA_PATH, "utf-8"));
  it("counts valid + invalid + missing_frontmatter correctly", () => {
    const entries = [
      { file: "/x/good.md", content: fm("title: Good Pipeline\nslug: good\nkind: pipeline\nstatus: shipped\ndate: 2026-05-17\ncomposed_of: [a, b]") },
      { file: "/x/bad.md", content: fm("title: BadPipeline\nslug: BAD\nkind: notpipeline\nstatus: shipped\ndate: 2026-05-17") },
      { file: "/x/nofm.md", content: "no frontmatter\n" },
    ];
    const r = buildReport({ schema: minimalSchema, entries, root: "/x" });
    assert.equal(r.scanned, 3);
    assert.equal(r.valid, 1);
    assert.equal(r.invalid.length, 1);
    assert.equal(r.missing_frontmatter.length, 1);
    assert.equal(r.ok, false);
  });
  it("populates coverage counters per field", () => {
    const entries = [
      { file: "/x/a.md", content: fm("title: A\nslug: a\nkind: pipeline\nstatus: shipped\ndate: 2026-05-17\ncomposed_of: [x]") },
      { file: "/x/b.md", content: fm("title: B\nslug: b\nkind: pipeline\nstatus: shipped\ndate: 2026-05-17\nstages: [y]") },
    ];
    const r = buildReport({ schema: minimalSchema, entries, root: "/x" });
    assert.equal(r.coverage.title, 2);
    assert.equal(r.coverage.composed_of, 1);
    assert.equal(r.coverage.stages, 1);
  });
  it("emits warnings independently of validation errors", () => {
    const entries = [
      { file: "/x/nofeed.md", content: fm("title: NoSteps\nslug: nosteps\nkind: pipeline\nstatus: shipped\ndate: 2026-05-17") },
    ];
    const r = buildReport({ schema: minimalSchema, entries, root: "/x" });
    assert.equal(r.valid, 1, "schema-valid (no steps required)");
    assert.equal(r.warnings.length, 1, "but warns on missing-steps-field");
    assert.equal(r.warnings[0].code, "missing-steps-field");
    assert.equal(r.ok, true, "warnings don't flip ok=false by default");
  });
});

// ---------- parseArgs --------------------------------------------------------

describe("parseArgs", () => {
  it("returns defaults when no args", () => {
    const r = parseArgs([]);
    assert.equal(r.dir, DEFAULT_PIPELINES_DIR);
    assert.equal(r.schemaPath, DEFAULT_SCHEMA_PATH);
    assert.equal(r.args.size, 0);
  });
  it("honors --dir and --schema overrides", () => {
    const r = parseArgs(["--dir", "/x", "--schema", "/y"]);
    assert.equal(r.dir, "/x");
    assert.equal(r.schemaPath, "/y");
  });
  it("collects flag args into the set", () => {
    const r = parseArgs(["--human", "--strict", "--report-only"]);
    assert.ok(r.args.has("--human"));
    assert.ok(r.args.has("--strict"));
    assert.ok(r.args.has("--report-only"));
  });
});

// ---------- Real-data E2E (the fail-on-revert oracle) -----------------------

describe("real-data E2E — live pipelines dir + live schema", () => {
  it("validates the 3 shipped seed entries against the live schema (loop, goal-complete, knowledge-injection)", () => {
    const schemaPath = join(PRISM_ROOT, ".claude/schemas/pipeline-frontmatter.schema.json");
    const pipelinesDir = join(PRISM_ROOT, "knowledge/wiki/os/pipelines");
    if (!existsSync(schemaPath) || !existsSync(pipelinesDir)) {
      // Repo-location fallback — skip rather than fail when the test is run from a worktree
      // that doesn't carry the seed entries (shouldn't happen in CI; defensive).
      return;
    }
    const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
    const files = listPipelineFiles(pipelinesDir);
    const entries = files.map((f) => ({ file: f, content: readFileSync(f, "utf-8") }));
    const report = buildReport({ schema, entries, root: PRISM_ROOT });
    // Every seed entry MUST validate; this is the U-CK12 exit condition
    // "registry validates against the schema".
    assert.equal(report.invalid.length, 0, `seed entries failed schema: ${JSON.stringify(report.invalid)}`);
    assert.ok(report.scanned >= 3, `expected ≥3 seed entries, got ${report.scanned}`);
    // The 3 seed entries all carry a steps field, so 0 missing-steps warnings.
    const stepsWarnings = report.warnings.filter((w) => w.code === "missing-steps-field");
    assert.equal(stepsWarnings.length, 0, `seed entries should all have steps: ${JSON.stringify(stepsWarnings)}`);
  });
});
