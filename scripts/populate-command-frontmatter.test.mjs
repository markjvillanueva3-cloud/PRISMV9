/**
 * populate-command-frontmatter.test.mjs (COMMAND-KERNEL-MS0 / U-CK15)
 *
 * Pure-core tests for the frontmatter populator. No corpus I/O —
 * just the inference + injection primitives. Fail-on-revert
 * regression oracles for the additive-only + schema-validity
 * invariants that scrutiny called out in sibling units.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  inferComposesWith,
  inferConsumes,
  parseFrontmatter,
  hasFrontmatterKey,
  emitYamlStringArray,
  mergeFrontmatterYaml,
  rebuildFile,
  transformFileText,
  parseArgs,
  detectLineEnding,
  stripBom,
} from "./populate-command-frontmatter.mjs";

/* ───────── inferComposesWith ───────── */

test("inferComposesWith: returns sorted unique slash-refs intersected with knownSlugs", () => {
  const body = "Use /handoff after /checkin. Then /checkin again. Also /unknown-skill.";
  const out = inferComposesWith(body, { knownSlugs: new Set(["checkin", "handoff"]) });
  assert.deepEqual(out, ["/checkin", "/handoff"]);
});

test("inferComposesWith: filters self-slug", () => {
  const body = "/checkin composes with /handoff and /checkin again.";
  const out = inferComposesWith(body, { knownSlugs: new Set(["checkin", "handoff"]), selfSlug: "checkin" });
  assert.deepEqual(out, ["/handoff"]);
});

test("inferComposesWith: drops slugs not in knownSlugs (filters typos / non-skills)", () => {
  const body = "/typo-skill is referenced but not installed; /handoff is real.";
  const out = inferComposesWith(body, { knownSlugs: new Set(["handoff"]) });
  assert.deepEqual(out, ["/handoff"]);
});

test("inferComposesWith: empty / non-string body → empty array", () => {
  assert.deepEqual(inferComposesWith("", { knownSlugs: new Set() }), []);
  assert.deepEqual(inferComposesWith(null, { knownSlugs: new Set() }), []);
  assert.deepEqual(inferComposesWith(undefined, { knownSlugs: new Set() }), []);
});

test("inferComposesWith: accepts an array for knownSlugs (back-compat)", () => {
  const body = "/handoff";
  const out = inferComposesWith(body, { knownSlugs: ["handoff"] });
  assert.deepEqual(out, ["/handoff"]);
});

test("inferComposesWith: does NOT match `/skill` inside a path-like token (foo/bar)", () => {
  const body = "Edit src/foo/bar.ts not /handoff.";
  const out = inferComposesWith(body, { knownSlugs: new Set(["handoff", "bar"]) });
  // `/bar` is excluded because the preceding char is `o` (lookbehind), `/handoff` is allowed.
  assert.deepEqual(out, ["/handoff"]);
});

test("inferComposesWith: validates schema slug shape (kebab-case only)", () => {
  // Underscore is NOT valid kebab — should never appear given SLUG_RE filter.
  const body = "/has_underscore /good-slug";
  const out = inferComposesWith(body, { knownSlugs: new Set(["has_underscore", "good-slug"]) });
  // SLUG_RE rejects has_underscore at the loadKnownSlugs gate too; but as a defense-in-depth, the
  // inferComposesWith re-check filters it.
  assert.deepEqual(out, ["/good-slug"]);
});

/* ───────── inferConsumes ───────── */

test("inferConsumes: extracts prism_X:action mentions", () => {
  const body = "Calls prism_session:tool_route_best and prism_ai:cot_reason.";
  const out = inferConsumes(body);
  assert.deepEqual(out, ["prism_ai:cot_reason", "prism_session:tool_route_best"]);
});

test("inferConsumes: dedupes repeats", () => {
  const body = "prism_x:a then prism_x:a again then prism_y:b.";
  const out = inferConsumes(body);
  assert.deepEqual(out, ["prism_x:a", "prism_y:b"]);
});

test("inferConsumes: empty / non-string → []", () => {
  assert.deepEqual(inferConsumes(""), []);
  assert.deepEqual(inferConsumes(undefined), []);
});

test("inferConsumes: ignores non-conforming tokens (e.g. PRISM_session:Action)", () => {
  const body = "PRISM_session:Action vs prism_dev:build_state_summary";
  const out = inferConsumes(body);
  assert.deepEqual(out, ["prism_dev:build_state_summary"]);
});

/* ───────── parseFrontmatter ───────── */

test("parseFrontmatter: extracts when present", () => {
  const txt = "---\nname: foo\ndescription: a tool that does foo\n---\nbody here\n";
  const r = parseFrontmatter(txt);
  assert.equal(r.hasFrontmatter, true);
  assert.match(r.frontmatter, /name: foo/);
  assert.equal(r.body, "body here\n");
});

test("parseFrontmatter: returns body unchanged when no frontmatter", () => {
  const txt = "no frontmatter here\nsecond line";
  const r = parseFrontmatter(txt);
  assert.equal(r.hasFrontmatter, false);
  assert.equal(r.frontmatter, "");
  assert.equal(r.body, txt);
});

test("parseFrontmatter: non-string input → empty result", () => {
  // Includes `eol: "lf"` (default) since CRLF-tolerance shipped — back-compat shape preserved.
  assert.deepEqual(parseFrontmatter(null), { frontmatter: "", body: "", hasFrontmatter: false, eol: "lf" });
});

/* ───────── hasFrontmatterKey ───────── */

test("hasFrontmatterKey: detects top-level key", () => {
  assert.equal(hasFrontmatterKey("name: foo\ndescription: bar", "name"), true);
  assert.equal(hasFrontmatterKey("name: foo", "description"), false);
});

test("hasFrontmatterKey: detects array-style key (no value on same line)", () => {
  const fm = "consumes:\n  - prism_ai:cot_reason\n";
  assert.equal(hasFrontmatterKey(fm, "consumes"), true);
});

test("hasFrontmatterKey: does NOT detect indented (nested) key", () => {
  const fm = "trigger:\n  autoSuggest:\n    keywords: [foo]\n";
  assert.equal(hasFrontmatterKey(fm, "keywords"), false);
});

/* ───────── emitYamlStringArray ───────── */

test("emitYamlStringArray: emits quoted entries", () => {
  const out = emitYamlStringArray("consumes", ["prism_ai:cot_reason", "prism_session:foo"]);
  assert.equal(out, 'consumes:\n  - "prism_ai:cot_reason"\n  - "prism_session:foo"\n');
});

test("emitYamlStringArray: empty values → empty string (don't emit bare key)", () => {
  assert.equal(emitYamlStringArray("consumes", []), "");
  assert.equal(emitYamlStringArray("consumes", null), "");
});

test("emitYamlStringArray: escapes embedded quotes", () => {
  const out = emitYamlStringArray("composes_with", ['/has"quote']);
  assert.match(out, /\\"quote/);
});

/* ───────── mergeFrontmatterYaml ───────── */

test("mergeFrontmatterYaml: appends new key when absent", () => {
  const fm = "name: foo\ndescription: bar\n";
  const additions = { consumes: emitYamlStringArray("consumes", ["prism_ai:cot_reason"]) };
  const out = mergeFrontmatterYaml(fm, additions);
  assert.match(out, /name: foo/);
  assert.match(out, /consumes:\n  - "prism_ai:cot_reason"/);
});

test("mergeFrontmatterYaml: preserves existing key when noOverwrite=true (the invariant)", () => {
  const fm = 'name: foo\ndescription: bar\nconsumes:\n  - "existing"\n';
  const additions = { consumes: emitYamlStringArray("consumes", ["inferred"]) };
  const out = mergeFrontmatterYaml(fm, additions, { noOverwrite: true });
  assert.match(out, /- "existing"/);
  assert.equal(/- "inferred"/.test(out), false, "must NOT add inferred when key exists");
});

test("mergeFrontmatterYaml: skips empty additions blocks", () => {
  const fm = "name: foo\ndescription: bar\n";
  const out = mergeFrontmatterYaml(fm, { consumes: "", composes_with: null });
  assert.equal(out.replace(/\n$/, ""), fm.replace(/\n$/, ""));
});

/* ───────── transformFileText (end-to-end) ───────── */

test("transformFileText: wraps file with frontmatter when absent", () => {
  const txt = "Body only — no frontmatter.\n";
  const additions = { consumes: emitYamlStringArray("consumes", ["prism_ai:cot_reason"]) };
  const out = transformFileText(txt, additions);
  assert.match(out, /^---\nconsumes:\n  - "prism_ai:cot_reason"\n---\n/);
  assert.match(out, /Body only/);
});

test("transformFileText: extends existing frontmatter additively", () => {
  const txt = "---\nname: foo\ndescription: bar\n---\nbody\n";
  const additions = { composes_with: emitYamlStringArray("composes_with", ["/handoff"]) };
  const out = transformFileText(txt, additions);
  assert.match(out, /name: foo/);
  assert.match(out, /description: bar/);
  assert.match(out, /composes_with:\n  - "\/handoff"/);
  assert.match(out, /\nbody\n/);
});

test("transformFileText: no-op when nothing to add (existing values + noOverwrite)", () => {
  const txt = '---\nname: foo\ndescription: bar\nconsumes:\n  - "x"\n---\nbody\n';
  const additions = { consumes: emitYamlStringArray("consumes", ["inferred"]) };
  const out = transformFileText(txt, additions, { noOverwrite: true });
  assert.equal(out, txt, "byte-identical when nothing to add");
});

test("transformFileText: R12 throw on schema-invalid composes_with slug", () => {
  const txt = "---\nname: foo\ndescription: bar\n---\nbody\n";
  // Inject manually-crafted invalid YAML (simulates a bug upstream emitting a bad slug).
  const bad = { composes_with: 'composes_with:\n  - "not-slash-prefixed"\n' };
  assert.throws(() => transformFileText(txt, bad), /schema-invalid composes_with slug/);
});

test("transformFileText: preserves body byte-for-byte (no whitespace mangling)", () => {
  const txt = "---\nname: foo\ndescription: bar\n---\nLine1\n  indented\n\n\nblank-line-block\n";
  const additions = { consumes: emitYamlStringArray("consumes", ["prism_x:y"]) };
  const out = transformFileText(txt, additions);
  // Body section after the trailing `---\n` must match the original body verbatim.
  const body = out.split(/\n---\n/)[1];
  assert.equal(body, "Line1\n  indented\n\n\nblank-line-block\n");
});

/* ───────── rebuildFile ───────── */

test("rebuildFile: composes frontmatter + body deterministically", () => {
  const out = rebuildFile("name: foo", "body\n");
  assert.equal(out, "---\nname: foo\n---\nbody\n");
});

test("rebuildFile: handles body that already starts with a newline", () => {
  const out = rebuildFile("name: foo", "\nbody\n");
  // The leading newline is collapsed (don't emit `---\n\nbody`).
  assert.equal(out, "---\nname: foo\n---\nbody\n");
});

/* ───────── inferConsumes digit-tolerance regression oracle (Arm B P0 2026-05-19) ───────── */
/* Pre-fix DISPATCHER_ACTION_RE was /\bprism_[a-z_]+:[a-z_]+\b/g — silently dropped every real
   PRISM dispatcher containing digits (prism_5axis) and every action containing digits
   (foo_v2). The fix allows digits in BOTH segments. */

test("inferConsumes: matches prism_5axis:plan_5x (digit-tolerant — regression oracle)", () => {
  const body = "Uses prism_5axis:plan_5x to plan toolpaths.";
  const out = inferConsumes(body);
  assert.deepEqual(out, ["prism_5axis:plan_5x"]);
});

test("inferConsumes: matches actions with digits like _v2 / _2 (regression oracle)", () => {
  const body = "prism_session:tool_route_best_2 and prism_ai:reason_v3";
  const out = inferConsumes(body);
  assert.deepEqual(out, ["prism_ai:reason_v3", "prism_session:tool_route_best_2"]);
});

/* ───────── CRLF / BOM tolerance (Arm B P0 2026-05-19 — silent corruption oracle) ───────── */

test("detectLineEnding: detects CRLF vs LF", () => {
  assert.equal(detectLineEnding("a\r\nb\r\nc"), "crlf");
  assert.equal(detectLineEnding("a\nb\nc"), "lf");
  assert.equal(detectLineEnding(""), "lf");
});

test("stripBom: strips leading U+FEFF, leaves rest unchanged", () => {
  assert.equal(stripBom("﻿---\nfoo\n---\n"), "---\nfoo\n---\n");
  assert.equal(stripBom("plain"), "plain");
  assert.equal(stripBom(""), "");
});

test("parseFrontmatter: tolerates CRLF — returns parsed FM + body slice", () => {
  const txt = "---\r\nname: foo\r\ndescription: bar\r\n---\r\nbody line 1\r\nbody line 2\r\n";
  const r = parseFrontmatter(txt);
  assert.equal(r.hasFrontmatter, true);
  assert.equal(r.eol, "crlf");
  assert.match(r.frontmatter, /name: foo/);
  assert.match(r.frontmatter, /description: bar/);
  // body slice preserves CRLF endings.
  assert.equal(r.body, "body line 1\r\nbody line 2\r\n");
});

test("parseFrontmatter: tolerates UTF-8 BOM at file start", () => {
  const txt = "﻿---\nname: foo\ndescription: bar\n---\nbody\n";
  const r = parseFrontmatter(txt);
  assert.equal(r.hasFrontmatter, true);
  assert.match(r.frontmatter, /name: foo/);
  assert.equal(r.body, "body\n");
});

test("transformFileText: CRLF round-trip — body line endings survive byte-for-byte", () => {
  const txt = "---\r\nname: foo\r\ndescription: bar\r\n---\r\nbody1\r\nbody2\r\n";
  const additions = { consumes: emitYamlStringArray("consumes", ["prism_ai:x"]) };
  const out = transformFileText(txt, additions);
  // The body section after the trailing `---\r\n` must keep CRLF.
  assert.match(out, /\r\nbody1\r\nbody2\r\n$/);
  // Frontmatter block re-emitted with CRLF too (host-consistent).
  assert.match(out, /^---\r\nname: foo\r\ndescription: bar\r\nconsumes:\r\n  - "prism_ai:x"\r\n---\r\n/);
});

test("transformFileText: BOM file is parsed correctly (no double-wrap corruption)", () => {
  const txt = "﻿---\nname: foo\ndescription: bar\n---\nbody\n";
  const additions = { consumes: emitYamlStringArray("consumes", ["prism_ai:x"]) };
  const out = transformFileText(txt, additions);
  // Must NOT contain TWO `---` blocks (the pre-fix corruption mode).
  const fmCount = [...out.matchAll(/^---$/gm)].length;
  assert.equal(fmCount, 2, `expected exactly 2 fm delimiters, got ${fmCount}: ${out.slice(0,200)}`);
});

/* ───────── empty-FM + empty-additions degenerate-block oracle (Arm A P1 2026-05-19) ───────── */

test("transformFileText: empty additions on no-frontmatter file → byte-identical text", () => {
  const txt = "Just body — no frontmatter.\n";
  const out = transformFileText(txt, {});
  assert.equal(out, txt, "must NOT fabricate ---\\n\\n---\\n empty block");
});

/* ───────── emitYamlStringArray hardening (Arm A P0 2026-05-19) ───────── */

test("emitYamlStringArray: throws (R12) on values containing newline", () => {
  assert.throws(
    () => emitYamlStringArray("consumes", ["safe", "has\nnewline"]),
    /value contains newline/,
  );
});

test("emitYamlStringArray: escapes backslash BEFORE quote (round-trip via YAML parser semantics)", () => {
  const out = emitYamlStringArray("consumes", ["path\\with\\backslash"]);
  // \ → \\, no false escape into backspace.
  assert.match(out, /- "path\\\\with\\\\backslash"/);
});

/* ───────── validateAdditions widening (Arm A P0 2026-05-19) ───────── */

test("transformFileText: R12 throws on malformed consumes dispatcher (asymmetric validation fix)", () => {
  const txt = "---\nname: foo\ndescription: bar\n---\nbody\n";
  // Hand-crafted malformed prism-prefixed value (simulates a buggy upstream emit).
  const bad = { consumes: 'consumes:\n  - "prism_BAD:upper_case"\n' };
  assert.throws(() => transformFileText(txt, bad), /schema-invalid consumes dispatcher/);
});

test("transformFileText: accepts manual file-path consumes value (non-prism-prefixed, no throw)", () => {
  const txt = "---\nname: foo\ndescription: bar\n---\nbody\n";
  const ok = { consumes: 'consumes:\n  - "state/shared/foo.json"\n' };
  // Must not throw — only dispatcher-shaped (prism_*) consumes get validated.
  const out = transformFileText(txt, ok);
  assert.match(out, /state\/shared\/foo\.json/);
});

/* ───────── parseArgs --field allowlist (Arm B P1 2026-05-19) ───────── */

test("parseArgs: --field allows known fields", () => {
  const args = parseArgs(["--field", "composes_with,consumes"]);
  assert.equal(args.fields.has("composes_with"), true);
  assert.equal(args.fields.has("consumes"), true);
});

test("parseArgs: --field rejects unknown field (fail-loud R12)", () => {
  assert.throws(() => parseArgs(["--field", "produces"]), /unknown --field value/);
  assert.throws(() => parseArgs(["--field", "frobnicate"]), /unknown --field value/);
});

test("parseArgs: --report accepts empty string (suppresses report write)", () => {
  const args = parseArgs(["--report", ""]);
  assert.equal(args.reportPath, "");
});

/* ───────── CLI bootstrap regression-guard (fail-on-revert oracle) ───────── */
/* Pre-fix: `__invokedAsCli` checked `file://${argv[1]}` literal; when argv[1]
   was a relative path the guard never matched, main() never ran, and the tool
   exited silently. This test invokes the script via a child process with a
   RELATIVE path and asserts the JSON envelope is emitted to stdout. */

test("CLI: emits --json output for hermetic tmpdir corpus (relative-arg + hermetic regression oracle)", async () => {
  const { spawnSync } = await import("node:child_process");
  const { mkdtempSync, writeFileSync, readFileSync, rmSync } = await import("node:fs");
  const { dirname, join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { tmpdir } = await import("node:os");
  const here = dirname(fileURLToPath(import.meta.url));
  const corpus = mkdtempSync(join(tmpdir(), "u-ck15-"));
  try {
    // Two fixture files: one already-frontmattered, one without. Mentions a real-pattern slash-ref
    // and dispatcher action (digit-bearing — covers the regression-fixed regex).
    writeFileSync(join(corpus, "foo.md"),
      "---\nname: foo\ndescription: a foo skill\n---\nUses /handoff and prism_5axis:plan_5x.\n", "utf8");
    writeFileSync(join(corpus, "handoff.md"),
      "---\nname: handoff\ndescription: a handoff skill\n---\nSession handoff doc.\n", "utf8");

    const r = spawnSync(process.execPath,
      ["populate-command-frontmatter.mjs", "--dry-run", "--json", "--corpus", corpus, "--report", ""],
      { cwd: here, encoding: "utf8", timeout: 30000 });
    assert.equal(r.status, 0, `exit=${r.status} stderr=${r.stderr}`);
    assert.match(r.stdout, /"scanned":\s*2/);
    const parsed = JSON.parse(r.stdout);
    assert.equal(parsed.summary.scanned, 2);
    // composes_with: foo.md mentions /handoff which IS known (handoff.md exists in corpus) →
    // inferred=1. handoff.md self-refs nothing → inferred=0.
    assert.equal(parsed.summary.fields.composes_with.inferred, 1);
    // consumes: foo.md mentions prism_5axis:plan_5x → inferred=1.
    assert.equal(parsed.summary.fields.consumes.inferred, 1);
  } finally {
    rmSync(corpus, { recursive: true, force: true });
  }
});

test("CLI: --apply writes files; second run is byte-identical (idempotency oracle)", async () => {
  const { spawnSync } = await import("node:child_process");
  const { mkdtempSync, writeFileSync, readFileSync, rmSync } = await import("node:fs");
  const { dirname, join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { tmpdir } = await import("node:os");
  const here = dirname(fileURLToPath(import.meta.url));
  const corpus = mkdtempSync(join(tmpdir(), "u-ck15-apply-"));
  try {
    const fooPath = join(corpus, "foo.md");
    const handoffPath = join(corpus, "handoff.md");
    writeFileSync(fooPath,
      "---\nname: foo\ndescription: a foo skill\n---\nUses /handoff and prism_ai:reason.\n", "utf8");
    writeFileSync(handoffPath,
      "---\nname: handoff\ndescription: a handoff skill\n---\nSession handoff doc.\n", "utf8");

    // First apply.
    const r1 = spawnSync(process.execPath,
      ["populate-command-frontmatter.mjs", "--apply", "--json", "--corpus", corpus, "--report", ""],
      { cwd: here, encoding: "utf8", timeout: 30000 });
    assert.equal(r1.status, 0, `exit=${r1.status} stderr=${r1.stderr}`);
    const afterRun1 = readFileSync(fooPath, "utf8");
    assert.match(afterRun1, /composes_with:\n  - "\/handoff"/, "first --apply must inject composes_with");
    assert.match(afterRun1, /consumes:\n  - "prism_ai:reason"/, "first --apply must inject consumes");

    // Second apply on the same corpus — must be byte-identical (no duplicate keys, no churn).
    const r2 = spawnSync(process.execPath,
      ["populate-command-frontmatter.mjs", "--apply", "--json", "--corpus", corpus, "--report", ""],
      { cwd: here, encoding: "utf8", timeout: 30000 });
    assert.equal(r2.status, 0, `exit=${r2.status} stderr=${r2.stderr}`);
    const afterRun2 = readFileSync(fooPath, "utf8");
    assert.equal(afterRun2, afterRun1, "second --apply must be byte-identical (idempotency invariant)");
  } finally {
    rmSync(corpus, { recursive: true, force: true });
  }
});

test("CLI: --apply on a CRLF file preserves CRLF body (round-trip oracle)", async () => {
  const { spawnSync } = await import("node:child_process");
  const { mkdtempSync, writeFileSync, readFileSync, rmSync } = await import("node:fs");
  const { dirname, join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { tmpdir } = await import("node:os");
  const here = dirname(fileURLToPath(import.meta.url));
  const corpus = mkdtempSync(join(tmpdir(), "u-ck15-crlf-"));
  try {
    const p = join(corpus, "crlf-skill.md");
    writeFileSync(p,
      "---\r\nname: crlf-skill\r\ndescription: a crlf skill\r\n---\r\nBody calls prism_ai:reason\r\nLine 2\r\n", "utf8");
    const r = spawnSync(process.execPath,
      ["populate-command-frontmatter.mjs", "--apply", "--json", "--corpus", corpus, "--report", ""],
      { cwd: here, encoding: "utf8", timeout: 30000 });
    assert.equal(r.status, 0, `exit=${r.status} stderr=${r.stderr}`);
    const after = readFileSync(p, "utf8");
    // CRLF body endings preserved; no double-wrapped frontmatter.
    assert.match(after, /\r\nBody calls prism_ai:reason\r\nLine 2\r\n$/);
    const fmDelims = [...after.matchAll(/^---$/gm)].length;
    assert.equal(fmDelims, 2, "exactly 2 fm delimiters — no double-wrap corruption");
    assert.match(after, /consumes:\r\n  - "prism_ai:reason"/);
  } finally {
    rmSync(corpus, { recursive: true, force: true });
  }
});
