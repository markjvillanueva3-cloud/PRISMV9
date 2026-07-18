/**
 * backfill-wiki-os-commands-entities.test.mjs
 *
 * U-CK11 Phase 2 — coverage for the wiki-entity backfill script. Uses
 * node:test (no vitest dep), runs via:
 *   node --test scripts/backfill-wiki-os-commands-entities.test.mjs
 *
 * Tests target the 6 pure exports + a tmpdir-fixture integration pass
 * over planBackfill/applyBackfill (real filesystem, real round-trip).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  slugFromFilename,
  parseFrontmatter,
  synthDescription,
  renderStub,
  planBackfill,
  applyBackfill,
} from "./backfill-wiki-os-commands-entities.mjs";

// ── slugFromFilename ──────────────────────────────────────────────────────
test("slugFromFilename strips .md and lowercases", () => {
  assert.equal(slugFromFilename("FORGE-TRIPLE.md"), "forge-triple");
  assert.equal(slugFromFilename("rgs.md"), "rgs");
  assert.equal(slugFromFilename("checkin-mike.md"), "checkin-mike");
});

test("slugFromFilename handles paths", () => {
  assert.equal(slugFromFilename("/abs/path/to/scrutinize.md"), "scrutinize");
});

test("slugFromFilename leaves non-.md as-is (minus dirname)", () => {
  assert.equal(slugFromFilename("/dir/oddfile.txt"), "oddfile.txt");
});

// ── parseFrontmatter ──────────────────────────────────────────────────────
test("parseFrontmatter returns hasFrontmatter:false when no leading ---", () => {
  const r = parseFrontmatter("# Just a heading\n\nbody only");
  assert.equal(r.hasFrontmatter, false);
  assert.deepEqual(r.fields, {});
  assert.equal(r.body, "# Just a heading\n\nbody only");
});

test("parseFrontmatter extracts simple key:value pairs", () => {
  const text = "---\nname: foo\ndescription: A test command\n---\n# /foo\nbody text\n";
  const r = parseFrontmatter(text);
  assert.equal(r.hasFrontmatter, true);
  assert.equal(r.fields.name, "foo");
  assert.equal(r.fields.description, "A test command");
  assert.equal(r.body, "# /foo\nbody text\n");
});

test("parseFrontmatter tolerates CRLF line endings", () => {
  const text = "---\r\nname: bar\r\n---\r\nbody\r\n";
  const r = parseFrontmatter(text);
  assert.equal(r.hasFrontmatter, true);
  assert.equal(r.fields.name, "bar");
});

test("parseFrontmatter returns hasFrontmatter:false when --- never closes", () => {
  const text = "---\nname: foo\nno closing marker";
  const r = parseFrontmatter(text);
  assert.equal(r.hasFrontmatter, false);
  // No close → body stays as the original text (defensive fallback)
  assert.equal(r.body, text);
});

test("parseFrontmatter ignores malformed lines inside frontmatter", () => {
  const text = "---\nname: foo\njust-a-bare-line\ndescription: ok\n---\nbody";
  const r = parseFrontmatter(text);
  assert.equal(r.hasFrontmatter, true);
  assert.equal(r.fields.name, "foo");
  assert.equal(r.fields.description, "ok");
  assert.equal(r.fields["just-a-bare-line"], undefined);
});

// ── synthDescription ──────────────────────────────────────────────────────
test("synthDescription picks first non-empty non-heading line", () => {
  const body = "\n# heading\n\nActual description line.\n\nmore body";
  assert.equal(synthDescription("test", body), "Actual description line.");
});

test("synthDescription skips code fences", () => {
  const body = "# h\n```bash\nsome code\n```\nReal text here.";
  assert.equal(synthDescription("test", body), "Real text here.");
});

test("synthDescription falls back to slug-based stub when body is empty", () => {
  assert.match(synthDescription("rgs5", "\n# only headings\n\n# more headings\n"), /^Slash command \/rgs5/);
});

test("synthDescription strips leading markdown emphasis", () => {
  assert.equal(synthDescription("test", "**Bold start** of description."), "Bold start** of description.");
});

test("synthDescription truncates at 240 chars", () => {
  const longLine = "x".repeat(300);
  const out = synthDescription("test", longLine);
  assert.equal(out.length, 240);
});

// ── renderStub ────────────────────────────────────────────────────────────
test("renderStub produces valid YAML frontmatter + body", () => {
  const out = renderStub("foo", "foo.md", "A description", "2026-05-22T12:00:00.000Z");
  assert.match(out, /^---\nkind: command\nslug: foo\nstatus: stub/);
  assert.match(out, /generated_at: 2026-05-22T12:00:00.000Z/);
  assert.match(out, /source: \.claude\/commands\/foo\.md/);
  assert.match(out, /^# \/foo$/m);
  assert.match(out, /A description/);
});

test("renderStub flattens newlines + escapes quotes for YAML safety", () => {
  const out = renderStub("bar", "bar.md", `multi\nline "quoted"`, "2026-05-22T12:00:00.000Z");
  // Verify: description sits on one frontmatter line (no raw newlines that
  // would break YAML parsing) AND embedded quotes are JSON-escaped. The
  // implementation chose to flatten \n → space (safer than \\n in YAML across
  // parsers) and JSON.stringify-wrap, so the saved string is one cleanly
  // quoted line with `\"` for embedded quotes.
  const fmMatch = out.match(/^description: (.*)$/m);
  assert.ok(fmMatch, "description: line is present");
  assert.ok(!fmMatch[1].includes("\n"), "no raw newline in the frontmatter value");
  assert.match(fmMatch[1], /\\"quoted\\"/, "embedded quotes are escaped");
  // Newline was flattened to a space, not preserved
  assert.match(fmMatch[1], /multi line/);
});

test("renderStub uses a safe fallback when description is empty", () => {
  const out = renderStub("baz", "baz.md", "", "2026-05-22T12:00:00.000Z");
  assert.match(out, /description: "Slash command \/baz\."/);
});

// ── planBackfill (real filesystem) ────────────────────────────────────────
test("planBackfill returns create for new + skip-exists for present", () => {
  const dir = mkdtempSync(join(tmpdir(), "bwocb-plan-"));
  const cmdDir = join(dir, "commands");
  const wikiDir = join(dir, "wiki");
  mkdirSync(cmdDir);
  mkdirSync(wikiDir);
  writeFileSync(join(cmdDir, "new-cmd.md"), "---\ndescription: hello\n---\n# /new-cmd\nbody");
  writeFileSync(join(cmdDir, "old-cmd.md"), "# /old-cmd\nbody");
  writeFileSync(join(wikiDir, "old-cmd.md"), "existing");
  try {
    const plan = planBackfill({ commandsDir: cmdDir, wikiDir });
    const map = Object.fromEntries(plan.map((p) => [p.slug, p.action]));
    assert.equal(map["new-cmd"], "create");
    assert.equal(map["old-cmd"], "skip-exists");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("planBackfill throws on missing commands dir", () => {
  assert.throws(
    () => planBackfill({ commandsDir: "/nonexistent-source-dir-xyz", wikiDir: "/tmp" }),
    /commands dir missing/,
  );
});

test("planBackfill carries the source's `description:` frontmatter into the plan entry", () => {
  const dir = mkdtempSync(join(tmpdir(), "bwocb-desc-"));
  const cmdDir = join(dir, "commands");
  const wikiDir = join(dir, "wiki");
  mkdirSync(cmdDir);
  mkdirSync(wikiDir);
  writeFileSync(join(cmdDir, "explicit.md"), "---\ndescription: from-fm\n---\n# /explicit\nbody");
  writeFileSync(join(cmdDir, "synth.md"), "# /synth\nSynthesized first line.\n");
  try {
    const plan = planBackfill({ commandsDir: cmdDir, wikiDir });
    const ex = plan.find((p) => p.slug === "explicit");
    const sy = plan.find((p) => p.slug === "synth");
    assert.equal(ex.description, "from-fm");
    assert.equal(sy.description, "Synthesized first line.");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── applyBackfill (real filesystem, idempotent) ────────────────────────────
test("applyBackfill creates stubs + reports counts", () => {
  const dir = mkdtempSync(join(tmpdir(), "bwocb-apply-"));
  const cmdDir = join(dir, "commands");
  const wikiDir = join(dir, "wiki");
  mkdirSync(cmdDir);
  // intentionally no wikiDir → applyBackfill must create it
  writeFileSync(join(cmdDir, "a.md"), "---\ndescription: A\n---\n# /a");
  writeFileSync(join(cmdDir, "b.md"), "# /b\nB synth.");
  writeFileSync(join(cmdDir, "c.md"), "# /c\nC synth.");
  try {
    const plan = planBackfill({ commandsDir: cmdDir, wikiDir });
    const res = applyBackfill(plan, { wikiDir });
    assert.equal(res.created, 3);
    assert.equal(res.skipped, 0);
    assert.equal(res.failed, 0);
    // Files exist
    assert.ok(existsSync(join(wikiDir, "a.md")));
    assert.ok(existsSync(join(wikiDir, "b.md")));
    assert.ok(existsSync(join(wikiDir, "c.md")));
    // Re-run is idempotent
    const plan2 = planBackfill({ commandsDir: cmdDir, wikiDir });
    const res2 = applyBackfill(plan2, { wikiDir });
    assert.equal(res2.created, 0);
    assert.equal(res2.skipped, 3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("applyBackfill stub content includes frontmatter + slug heading", () => {
  const dir = mkdtempSync(join(tmpdir(), "bwocb-content-"));
  const cmdDir = join(dir, "commands");
  const wikiDir = join(dir, "wiki");
  mkdirSync(cmdDir);
  mkdirSync(wikiDir);
  writeFileSync(join(cmdDir, "rgs5.md"), "---\ndescription: RGS v5 brainstorm pipeline\n---\n# /rgs5\nbody");
  try {
    const plan = planBackfill({ commandsDir: cmdDir, wikiDir });
    applyBackfill(plan, { wikiDir });
    const out = readFileSync(join(wikiDir, "rgs5.md"), "utf8");
    assert.match(out, /^---\nkind: command\nslug: rgs5/);
    assert.match(out, /description: "RGS v5 brainstorm pipeline"/);
    assert.match(out, /^# \/rgs5$/m);
    assert.match(out, /U-CK11 Phase 2 backfill stub/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
