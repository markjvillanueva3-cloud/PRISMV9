// md-to-html tests — node:test (zero external deps, runs without vitest).
// Covers renderMarkdownBody + mdToHtml from html-report-render.mjs.
//
// Run:  node --test H:/prism/scripts/lib/md-to-html.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, unlinkSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { renderMarkdownBody, mdToHtml } from "./html-report-render.mjs";

// CLI under test: scripts/md-to-html.mjs (sibling of scripts/lib/). Derived from
// import.meta.url so the E2E works from the main tree OR any slot worktree.
const MD2HTML_CLI = join(dirname(fileURLToPath(import.meta.url)), "..", "md-to-html.mjs");

const TMP = mkdtempSync(join(tmpdir(), "md-to-html-test-"));

test("renderMarkdownBody: empty input → empty string", () => {
  assert.equal(renderMarkdownBody(""), "");
  assert.equal(renderMarkdownBody(null), "");
  assert.equal(renderMarkdownBody(undefined), "");
});

test("renderMarkdownBody: H1/H2/H3 headings render with prism- classes", () => {
  const md = "# Title\n## Section\n### Sub";
  const html = renderMarkdownBody(md);
  assert.match(html, /<h1 class="prism-h1">Title<\/h1>/);
  assert.match(html, /<h2 class="prism-h2">Section<\/h2>/);
  assert.match(html, /<h3 class="prism-h3">Sub<\/h3>/);
});

test("renderMarkdownBody: fenced code block escapes HTML", () => {
  const md = "```js\nconst x = '<script>alert(1)</script>';\n```";
  const html = renderMarkdownBody(md);
  assert.match(html, /<pre class="prism-codeblock" data-lang="js"><code>/);
  // Raw <script> must be escaped — no actual script tag in output
  assert.ok(!html.includes("<script>"), "raw <script> escaped: " + html);
  assert.match(html, /&lt;script&gt;/);
});

test("renderMarkdownBody: unterminated code fence still renders content (loud)", () => {
  const md = "```\nuncloed code body";
  const html = renderMarkdownBody(md);
  assert.match(html, /prism-unclosed/);
  assert.match(html, /uncloed code body/);
});

test("renderMarkdownBody: inline link rendered with prism-link class", () => {
  const html = renderMarkdownBody("See [the docs](https://example.com/x) here.");
  assert.match(html, /<a href="https:\/\/example\.com\/x" class="prism-link">the docs<\/a>/);
});

test("renderMarkdownBody: javascript: URI link rendered as prism-bad-link (XSS guard)", () => {
  const html = renderMarkdownBody("[bad](javascript:alert(1))");
  assert.match(html, /class="prism-bad-link">bad</);
  assert.ok(!html.includes("javascript:alert"));
});

test("renderMarkdownBody: pipe table renders as <table>", () => {
  const md = "| a | b |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |";
  const html = renderMarkdownBody(md);
  assert.match(html, /<table class="prism-md-table">/);
  assert.match(html, /<th>a<\/th>/);
  assert.match(html, /<th>b<\/th>/);
  assert.match(html, /<td>1<\/td>/);
  assert.match(html, /<td>4<\/td>/);
});

test("renderMarkdownBody: malformed table (no separator) falls back to prose", () => {
  const md = "| a | b |\n| 1 | 2 |";
  const html = renderMarkdownBody(md);
  assert.ok(!html.includes("<table"), "no table when separator absent: " + html);
  // Falls through as paragraph
  assert.match(html, /<p>/);
});

test("renderMarkdownBody: unordered + ordered lists render correctly", () => {
  const ul = renderMarkdownBody("- one\n- two\n- three");
  assert.match(ul, /<ul class="prism-md-list">/);
  assert.match(ul, /<li>one<\/li>/);
  assert.match(ul, /<li>three<\/li>/);

  const ol = renderMarkdownBody("1. first\n2. second");
  assert.match(ol, /<ol class="prism-md-list">/);
  assert.match(ol, /<li>first<\/li>/);
});

test("renderMarkdownBody: blockquote + horizontal rule + inline code", () => {
  const md = "> a quote line\n\n---\n\nuse `npm run build` here";
  const html = renderMarkdownBody(md);
  assert.match(html, /<blockquote class="prism-quote">a quote line<\/blockquote>/);
  assert.match(html, /<hr class="prism-hr">/);
  assert.match(html, /<code class="prism-inline-code">npm run build<\/code>/);
});

test("renderMarkdownBody: bold + italic", () => {
  const html = renderMarkdownBody("**bold** and *italic* mixed");
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<em>italic<\/em>/);
});

test("mdToHtml: returns empty string for missing file (silent-fail contract)", () => {
  const html = mdToHtml(join(TMP, "does-not-exist.md"));
  assert.equal(html, "");
});

test("mdToHtml: returns empty string for non-string input", () => {
  assert.equal(mdToHtml(null), "");
  assert.equal(mdToHtml(undefined), "");
  assert.equal(mdToHtml(42), "");
  assert.equal(mdToHtml(""), "");
});

test("mdToHtml: renders a real file with full HTML5 shell", () => {
  const p = join(TMP, "sample.md");
  writeFileSync(p, "# Hello World\n\nThis is a *test*.\n", "utf8");
  const html = mdToHtml(p);
  assert.ok(html.length > 1000, "HTML body too short: " + html.length);
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /<title>Hello World<\/title>/);
  assert.match(html, /<h1 class="prism-h1">Hello World<\/h1>/);
  assert.match(html, /<em>test<\/em>/);
  unlinkSync(p);
});

test("mdToHtml: includeToc option emits <nav class='prism-toc'>", () => {
  const p = join(TMP, "toc.md");
  writeFileSync(p, "# Top\n## A\n## B\n### Deep", "utf8");
  const html = mdToHtml(p, { includeToc: true });
  assert.match(html, /<nav class="prism-toc">/);
  assert.match(html, /Contents/);
  assert.match(html, /prism-toc-l1/);
  assert.match(html, /prism-toc-l2/);
  unlinkSync(p);
});

test("mdToHtml: title override applied", () => {
  const p = join(TMP, "title.md");
  writeFileSync(p, "# Auto-Title\n\nbody", "utf8");
  const html = mdToHtml(p, { title: "Custom Title" });
  assert.match(html, /<title>Custom Title<\/title>/);
  unlinkSync(p);
});

// ─── R9 gap-fill (2026-05-18 slot lima): kilo's idempotency + source-hash
// behavior had no regression oracle. These tests fail if the deterministic
// generatedAt / note-suppression contract or the CLI source-hash injection
// regresses — the drift-detection value proposition depends on them.

test("mdToHtml: explicit note:'' suppresses the wall-clock footer note (opt-in)", () => {
  const p = join(TMP, "note.md");
  writeFileSync(p, "# N\n\nbody", "utf8");
  const withDefault = mdToHtml(p);
  assert.match(withDefault, /generated by mdToHtml\(\) at /,
    "default note must embed the wall-clock generated-by line");
  const suppressed = mdToHtml(p, { note: "" });
  assert.ok(!suppressed.includes("generated by mdToHtml() at "),
    "note:'' must suppress the default footer note (the !== undefined check)");
  unlinkSync(p);
});

test("mdToHtml: deterministic generatedAt → byte-identical re-render of unchanged input", () => {
  const p = join(TMP, "determ.md");
  writeFileSync(p, "# Determinism\n\n- a\n- b\n", "utf8");
  const opts = { generatedAt: "2026-01-02T03:04:05.000Z", note: "" };
  const a = mdToHtml(p, opts);
  const b = mdToHtml(p, opts);
  assert.equal(a, b, "same input + fixed generatedAt + note:'' must be byte-identical");
  // generatedAt must actually flow into output — a different value must change it,
  // else the determinism is accidental (dead opt) rather than honored.
  const c = mdToHtml(p, { generatedAt: "2099-12-31T23:59:59.000Z", note: "" });
  assert.notEqual(a, c, "generatedAt must be embedded — differing value must change output");
  assert.ok(a.includes("2026-01-02T03:04:05.000Z"), "fixed generatedAt must appear in HTML");
  unlinkSync(p);
});

test("md-to-html.mjs CLI: idempotent output + <meta prism-source-hash> matches sha256(raw md bytes)", () => {
  // Real-producer E2E (not a hermetic fake): the source-hash is injected by the
  // CLI script, NOT the lib, so only a subprocess run proves the wiring.
  const p = join(TMP, "cli-e2e.md");
  const raw = "# CLI E2E\n\nUnicode ✓ café — hash is over RAW bytes.\n";
  writeFileSync(p, raw, "utf8");
  const out = p.replace(/\.md$/i, ".html");

  execFileSync(process.execPath, [MD2HTML_CLI, p], { stdio: "pipe" });
  const html1 = readFileSync(out, "utf8");
  // Re-run without touching the source → byte-identical (deterministic mtime+hash).
  execFileSync(process.execPath, [MD2HTML_CLI, p], { stdio: "pipe" });
  const html2 = readFileSync(out, "utf8");
  assert.equal(html1, html2, "two CLI runs on unchanged input must be byte-identical");

  const expectedHash = createHash("sha256").update(readFileSync(p)).digest("hex");
  const m = html1.match(/<meta\s+name="prism-source-hash"\s+content="([0-9a-f]{64})">/i);
  assert.ok(m, "CLI output must contain <meta prism-source-hash> (guard's drift reader depends on it)");
  assert.equal(m[1], expectedHash,
    "injected hash must equal sha256 of the SAME raw bytes the guard reads (drift-check correctness)");

  unlinkSync(p);
  unlinkSync(out);
});
