/**
 * CheckSpecHtmlA11y.test.ts — behavior tests for scripts/check-spec-html-a11y.mjs.
 *
 * BACKEND-DEVTOOLS-RGS6 HTML-PRIMARY-MS0 / U-HPS05. The script gained a run-as-main guard so
 * `checkA11y` (the pure HTML→violations function) and `runCli` (the CLI body, returns an exit code,
 * never calls process.exit) are importable without side effects — this file exercises both, plus
 * the CLI contract (exit codes 0 / 1 / 2) via a real child process so the future
 * `.claude/hooks/html-a11y-guard.mjs` can rely on it.
 *
 * The mere fact that this test file runs is itself the negative test of the run-as-main guard:
 * if importing the module still executed the CLI, it would have called process.exit() at import
 * time and these tests would never start.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
// scripts/ lives at the repo root (H:/prism/scripts), two levels above mcp-server/.
import { checkA11y, runCli } from "../../../scripts/check-spec-html-a11y.mjs";

const SCRIPT_PATH = fileURLToPath(new URL("../../../scripts/check-spec-html-a11y.mjs", import.meta.url));

/** A minimal HTML document that satisfies every check in checkA11y(). */
const CLEAN = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Clean Doc</title></head>
<body>
<a class="skip-link" href="#content">Skip to content</a>
<nav class="toc" aria-label="Table of contents"><ul><li><a href="#t">Title</a></li></ul></nav>
<main role="main" id="content">
<h1 id="t">Title</h1>
<p>Some body text.</p>
<h2 id="s">A Section</h2>
<p>More body text.</p>
<button type="button" aria-label="Toggle theme">◐</button>
<input type="search" aria-label="Search this page">
</main>
</body>
</html>
`;

/** Run the CLI as a child process; return { status, stdout, stderr }. status 0 on success. */
function runScript(args: string[]): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT_PATH, ...args], { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
    return { status: 0, stdout, stderr: "" };
  } catch (err: any) {
    return { status: typeof err.status === "number" ? err.status : -1, stdout: String(err.stdout ?? ""), stderr: String(err.stderr ?? "") };
  }
}

describe("check-spec-html-a11y — checkA11y(html)", () => {
  it("a fully-conformant document yields zero violations", () => {
    expect(checkA11y(CLEAN)).toEqual([]);
  });

  it("flags <html> without a non-empty lang attribute", () => {
    const v = checkA11y(CLEAN.replace('<html lang="en">', "<html>"));
    expect(v.some((m) => /lang/i.test(m))).toBe(true);
  });

  it("flags a missing or empty <title>", () => {
    expect(checkA11y(CLEAN.replace("<title>Clean Doc</title>", "<title></title>")).some((m) => /title/i.test(m))).toBe(true);
    expect(checkA11y(CLEAN.replace("<title>Clean Doc</title>", "")).some((m) => /title/i.test(m))).toBe(true);
  });

  it("flags a missing skip-link", () => {
    const v = checkA11y(CLEAN.replace('<a class="skip-link" href="#content">Skip to content</a>', ""));
    expect(v.some((m) => /skip-link/i.test(m))).toBe(true);
  });

  it("flags <main> missing role=\"main\" or id=\"content\"", () => {
    expect(checkA11y(CLEAN.replace('<main role="main" id="content">', '<main id="content">')).some((m) => /role="main"/i.test(m))).toBe(true);
    expect(checkA11y(CLEAN.replace('<main role="main" id="content">', '<main role="main">')).some((m) => /id="content"/i.test(m))).toBe(true);
  });

  it("flags an unlabelled <nav> region", () => {
    const v = checkA11y(CLEAN.replace('aria-label="Table of contents"', ""));
    expect(v.some((m) => /<nav>.*aria-label/i.test(m))).toBe(true);
  });

  it("flags an <img> without a non-empty alt attribute", () => {
    const v = checkA11y(CLEAN.replace("<p>Some body text.</p>", '<p><img src="diagram.png"></p>'));
    expect(v.some((m) => /<img>.*alt/i.test(m))).toBe(true);
    // ...but an <img alt=""> intentionally-decorative? No — empty alt also counts as a violation here:
    expect(checkA11y(CLEAN.replace("<p>Some body text.</p>", '<p><img src="x.png" alt=""></p>')).some((m) => /<img>.*alt/i.test(m))).toBe(true);
    expect(checkA11y(CLEAN.replace("<p>Some body text.</p>", '<p><img src="x.png" alt="A diagram"></p>'))).toEqual([]);
  });

  it("flags a heading without an id", () => {
    const v = checkA11y(CLEAN.replace('<h2 id="s">A Section</h2>', "<h2>A Section</h2>"));
    expect(v.some((m) => /heading.*without an id/i.test(m))).toBe(true);
  });

  it("flags a heading-level jump (h1 → h3 skips h2)", () => {
    const v = checkA11y(CLEAN.replace('<h2 id="s">A Section</h2>', '<h3 id="s">A Sub-section</h3>'));
    expect(v.some((m) => /h1 to h3.*skips/i.test(m))).toBe(true);
  });

  it("flags a <button> without an accessible name", () => {
    const v = checkA11y(CLEAN.replace('<button type="button" aria-label="Toggle theme">◐</button>', "<button type=\"button\"></button>"));
    expect(v.some((m) => /button.*accessible name/i.test(m))).toBe(true);
    // a button with visible text content is fine
    expect(checkA11y(CLEAN.replace('<button type="button" aria-label="Toggle theme">◐</button>', "<button type=\"button\">Click me</button>"))).toEqual([]);
  });

  it("flags an <input> control without a label / aria-label", () => {
    const v = checkA11y(CLEAN.replace('<input type="search" aria-label="Search this page">', '<input type="text">'));
    expect(v.some((m) => /input.*label/i.test(m))).toBe(true);
    // a <label for=...> association also satisfies it
    expect(checkA11y(CLEAN.replace('<input type="search" aria-label="Search this page">', '<label for="q">Query</label><input id="q" type="text">'))).toEqual([]);
    // hidden / submit / button inputs are exempt
    expect(checkA11y(CLEAN.replace('<input type="search" aria-label="Search this page">', '<input type="hidden" name="csrf"><input type="submit">'))).toEqual([]);
  });

  it("reports every distinct violation when several are present at once", () => {
    const broken = "<html><head></head><body><h1>No id</h1><h3>Skipped</h3><img src=x><button></button></body></html>";
    const v = checkA11y(broken);
    expect(v.length).toBeGreaterThanOrEqual(4);
    expect(v.some((m) => /lang/i.test(m))).toBe(true);
    expect(v.some((m) => /skip-link/i.test(m))).toBe(true);
    expect(v.some((m) => /<main>/i.test(m))).toBe(true);
  });
});

describe("check-spec-html-a11y — runCli(argv) returns an exit code, never exits the process", () => {
  let dir = "";
  let cleanFile = "";
  let badFile = "";

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-a11y-"));
    cleanFile = path.join(dir, "clean.html");
    badFile = path.join(dir, "bad.html");
    fs.writeFileSync(cleanFile, CLEAN, "utf8");
    fs.writeFileSync(badFile, "<html><head></head><body><h1>x</h1></body></html>", "utf8"); // missing lang/title/skip-link/main
  });

  afterAll(() => {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
  });

  it("returns 1 (bad invocation) when no files are given", () => {
    expect(runCli([])).toBe(1);
    expect(runCli(["--quiet"])).toBe(1);
  });

  it("returns 0 when every file passes", () => {
    expect(runCli([cleanFile, "--quiet"])).toBe(0);
  });

  it("returns 2 when at least one file has a violation", () => {
    expect(runCli([badFile, "--quiet"])).toBe(2);
    expect(runCli([cleanFile, badFile, "--quiet"])).toBe(2);
  });

  it("returns 2 when a file cannot be read (a read error counts as a failure)", () => {
    expect(runCli([path.join(dir, "does-not-exist.html"), "--quiet"])).toBe(2);
  });

  it("did not kill the test process — runCli/checkA11y imported cleanly (run-as-main guard works)", () => {
    expect(typeof checkA11y).toBe("function");
    expect(typeof runCli).toBe("function");
  });
});

describe("check-spec-html-a11y — CLI contract (child process, the future hook depends on these exit codes)", () => {
  let dir = "";
  let cleanFile = "";
  let badFile = "";

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-a11y-cli-"));
    cleanFile = path.join(dir, "clean.html");
    badFile = path.join(dir, "bad.html");
    fs.writeFileSync(cleanFile, CLEAN, "utf8");
    fs.writeFileSync(badFile, "<html><head></head><body><h1>x</h1></body></html>", "utf8");
  });

  afterAll(() => {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
  });

  it("exits 0 and prints nothing extra when invoked --quiet on a clean file", () => {
    const r = runScript([cleanFile, "--quiet"]);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe("");
  });

  it("exits 0 and prints an OK line per file without --quiet", () => {
    const r = runScript([cleanFile]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/^OK\s+/m);
    expect(r.stdout).toMatch(/all 1 file\(s\) pass/);
  });

  it("exits 2 and lists the violations on a non-conformant file", () => {
    const r = runScript([badFile]);
    expect(r.status).toBe(2);
    expect(r.stdout).toMatch(/^FAIL\s+/m);
    expect(r.stdout).toMatch(/a11y issue\(s\)/);
  });

  it("exits 1 (with a usage hint on stderr) when called with no file arguments", () => {
    const r = runScript([]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/Usage:/);
  });
});
