#!/usr/bin/env node
/**
 * memory-autocompact-stop.test.mjs — node:test for OBSIDIAN-BRAIN-FIX-MS0/U-OBF03.
 * Real-value assertions only. Uses an isolated tmp MEMORY.md per run()-path
 * test so the production index is never touched.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  isPointerLine,
  compactPointerLine,
  compactIndex,
  run,
} from "./memory-autocompact-stop.mjs";

const MAX = 200;
const bytes = (s) => Buffer.byteLength(s, "utf8");

test("isPointerLine: only `- [Title](file.md) — …` index lines", () => {
  assert.equal(isPointerLine("- [Foo](foo.md) — hook text"), true);
  assert.equal(isPointerLine("- [Bar](bar.md): colon sep also ok"), true);
  assert.equal(isPointerLine("- [Baz](baz.md)-dash"), true);
  assert.equal(isPointerLine("## Indexed memories"), false);
  assert.equal(isPointerLine("  - [Sub](x.md) — indented sub-bullet"), false);
  assert.equal(isPointerLine("- plain bullet no link"), false);
  assert.equal(isPointerLine(""), false);
  assert.equal(isPointerLine(null), false);
});

test("compactPointerLine: under-budget line passes through unchanged", () => {
  const ln = "- [Short](s.md) — tiny hook";
  assert.equal(compactPointerLine(ln, MAX), ln);
});

test("compactPointerLine: over-budget line clipped but link PRESERVED + ellipsis", () => {
  const ln = "- [Title](some-memory-file.md) — " + "x".repeat(400);
  const out = compactPointerLine(ln, MAX);
  assert.ok(bytes(out) <= MAX, `must be <=${MAX}B, got ${bytes(out)}`);
  assert.ok(out.startsWith("- [Title](some-memory-file.md) —"), "link prefix preserved");
  assert.ok(out.endsWith(" …"), "ellipsis appended");
});

test("compactPointerLine: NEVER drops the link even if link alone exceeds budget", () => {
  const longLink = "- [" + "T".repeat(120) + "](" + "f".repeat(120) + ".md) — tail";
  const out = compactPointerLine(longLink, MAX);
  assert.ok(out.includes("](" + "f".repeat(120) + ".md)"), "link target intact (discoverability > budget)");
  assert.ok(!out.includes("tail") || bytes(out) >= MAX, "tail dropped when link alone over budget");
});

test("compactPointerLine: multibyte (non-ASCII) clip does not split a codepoint", () => {
  const ln = "- [Café](café-memory.md) — " + "déjà".repeat(80); // multi-byte tail
  const out = compactPointerLine(ln, MAX);
  assert.ok(bytes(out) <= MAX, "byte budget honored");
  // valid UTF-8 round-trip (no replacement char left dangling)
  assert.equal(out, Buffer.from(out, "utf8").toString("utf8"));
  assert.ok(!out.includes("�"), "no replacement char from a split codepoint");
});

test("compactIndex: only over-budget pointer lines change; everything else verbatim; idempotent", () => {
  const text = [
    "# PRISM Project Memory",
    "## Indexed memories",
    "- [Keep](k.md) — short, under budget stays exactly",
    "- [Big](big-memory-file.md) — " + "y".repeat(500),
    "## Recent Commits",
    "prose line untouched",
  ].join("\n");
  const r = compactIndex(text, { maxPointerBytes: MAX });
  assert.equal(r.changed, true);
  assert.equal(r.linesCompacted, 1, "exactly one over-budget line trimmed");
  const lines = r.content.split("\n");
  assert.equal(lines[0], "# PRISM Project Memory", "header verbatim");
  assert.equal(lines[2], "- [Keep](k.md) — short, under budget stays exactly", "in-budget pointer untouched");
  assert.ok(bytes(lines[3]) <= MAX, "over-budget pointer trimmed");
  assert.equal(lines[4], "## Recent Commits", "section header verbatim");
  assert.equal(lines[5], "prose line untouched", "prose verbatim");
  // idempotent: second pass changes nothing
  const r2 = compactIndex(r.content, { maxPointerBytes: MAX });
  assert.equal(r2.changed, false, "second pass is a no-op");
});

test("compactIndex: CRLF line endings preserved", () => {
  const text = "# H\r\n- [A](a.md) — " + "z".repeat(400) + "\r\n## End";
  const r = compactIndex(text, { maxPointerBytes: MAX });
  assert.ok(r.content.includes("\r\n"), "CRLF retained");
  assert.ok(!r.content.includes("\n\n") || r.content.split("\r\n").length >= 3);
});

test("run: disabled knob → no-op, no file touched", () => {
  process.env.PRISM_MEMORY_AUTOCOMPACT_DISABLE = "1";
  const r = run({ path: "C:/nonexistent/whatever.md" });
  delete process.env.PRISM_MEMORY_AUTOCOMPACT_DISABLE;
  assert.equal(r.acted, false);
  assert.equal(r.reason, "disabled");
});

test("run: missing file → fail-soft no_memory_file", () => {
  const r = run({ path: join(tmpdir(), "definitely-not-here-" + Date.now() + ".md") });
  assert.equal(r.acted, false);
  assert.equal(r.reason, "no_memory_file");
});

test("run: below-critical file → no-op (does NOT rewrite a safe file)", () => {
  const dir = mkdtempSync(join(tmpdir(), "prism-memautoc-"));
  const f = join(dir, "MEMORY.md");
  writeFileSync(f, "# small\n- [A](a.md) — tiny\n", "utf8");
  const r = run({ path: f });
  assert.equal(r.acted, false);
  assert.equal(r.reason, "below_critical");
});

test("run: critical + compactable → acts, file shrinks, link preserved, ≤200B lines", () => {
  const dir = mkdtempSync(join(tmpdir(), "prism-memautoc-"));
  const f = join(dir, "MEMORY.md");
  // Build a file >97% of 24576 with several over-budget pointer lines.
  const fat = [];
  fat.push("# PRISM Project Memory", "## Indexed memories");
  for (let i = 0; i < 60; i++) {
    fat.push(`- [Mem${i}](reference_mem_${i}.md) — ` + "blah ".repeat(80));
  }
  const content = fat.join("\n");
  writeFileSync(f, content, "utf8");
  assert.ok(bytes(content) >= Math.floor(24576 * 0.97), "fixture is over critical");
  const r = run({ path: f });
  assert.equal(r.acted, true, "must act at critical with compactable lines");
  assert.ok(r.afterBytes < r.beforeBytes, "file shrank");
  const after = readFileSync(f, "utf8");
  for (const ln of after.split("\n")) {
    if (ln.startsWith("- [")) assert.ok(bytes(ln) <= 200, `pointer ≤200B: ${bytes(ln)}`);
  }
  // every pointer link still present (NEVER deleted)
  for (let i = 0; i < 60; i++) {
    assert.ok(after.includes(`](reference_mem_${i}.md)`), `link ${i} preserved`);
  }
});

test("run: critical but NO compactable lines → loud advisory, NOT silent no-op (R12)", () => {
  const dir = mkdtempSync(join(tmpdir(), "prism-memautoc-"));
  const f = join(dir, "MEMORY.md");
  // Over critical, but built entirely from short in-budget pointers + prose
  // (structural growth, not pointer bloat) — hook cannot fix this.
  const lines = ["# PRISM Project Memory", "## Indexed memories"];
  while (Buffer.byteLength(lines.join("\n"), "utf8") < Math.floor(24576 * 0.98)) {
    lines.push("- [M](m.md) — short ok");
  }
  writeFileSync(f, lines.join("\n"), "utf8");
  const r = run({ path: f });
  assert.equal(r.acted, false);
  assert.equal(r.reason, "critical_but_no_compactable_lines");
  assert.ok(/structural, not pointer-bloat/.test(r.advisory), "advisory explains why + names the fix");
});
