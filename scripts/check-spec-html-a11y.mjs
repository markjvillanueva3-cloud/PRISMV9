#!/usr/bin/env node
/**
 * check-spec-html-a11y.mjs — dependency-free static WAI-ARIA check for PRISM spec HTML companions.
 *
 * BACKEND-DEVTOOLS-RGS6 HTML-PRIMARY-MS0 / U-HPS05 (the *logic*; wiring this as a pre-commit
 * `.claude/hooks/html-a11y-guard.mjs` + `settings.json` registration is the hooks lane's call —
 * that hook can `import { checkA11y, runCli } from "../scripts/check-spec-html-a11y.mjs"` directly,
 * because this module no longer reads `process.argv` / calls `process.exit` at import time).
 * Catches the structural accessibility regressions a renderer can introduce — without needing
 * `@axe-core/cli` or a headless browser (which aren't installed). It does NOT compute rendered
 * colour contrast (that needs a browser); the bundled theme tokens are taken from GitHub's
 * WCAG-AA palette.
 *
 * Usage (CLI):
 *   node scripts/check-spec-html-a11y.mjs <html-file> [<html-file> ...] [--quiet]
 * Usage (library):
 *   import { checkA11y } from "./check-spec-html-a11y.mjs";  // (html: string) => string[]   ([] = clean)
 *   import { runCli }   from "./check-spec-html-a11y.mjs";   // (argv: string[]) => 0 | 1 | 2  (exit code; never exits the process)
 *
 * Exit codes: 0 = all files pass · 2 = at least one file has a violation (listed) · 1 = bad invocation.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Strip HTML tags + entities → plain text (for "does this element have an accessible name" checks). */
function textOf(html) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function attr(tagSource, name) {
  const m = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i").exec(tagSource) || new RegExp(`\\b${name}\\s*=\\s*'([^']*)'`, "i").exec(tagSource);
  return m ? m[1] : null;
}

/** Run all checks on one HTML string; return a list of violation messages (empty = clean). */
export function checkA11y(html) {
  const v = [];

  // 1. <html lang="…">
  const htmlTag = /<html\b[^>]*>/i.exec(html);
  if (!htmlTag) v.push("no <html> element");
  else {
    const lang = attr(htmlTag[0], "lang");
    if (!lang || !lang.trim()) v.push("<html> is missing a non-empty lang attribute");
  }

  // 2. non-empty <title>
  const title = /<title>([\s\S]*?)<\/title>/i.exec(html);
  if (!title || !title[1].trim()) v.push("<title> is missing or empty");

  // 3. skip link to #content
  if (!/<a\b[^>]*\bhref\s*=\s*["']#content["'][^>]*>/i.test(html) && !/<a\b[^>]*\bclass\s*=\s*["'][^"']*\bskip-link\b[^"']*["'][^>]*>/i.test(html)) {
    v.push("no skip-link (<a href=\"#content\"> / class=\"skip-link\">)");
  }

  // 4. <main role="main"> with id="content"
  const mainTag = /<main\b[^>]*>/i.exec(html);
  if (!mainTag) v.push("no <main> element");
  else {
    if ((attr(mainTag[0], "role") || "").toLowerCase() !== "main") v.push('<main> is missing role="main"');
    if ((attr(mainTag[0], "id") || "") !== "content") v.push('<main> is missing id="content" (skip-link target)');
  }

  // 5. <nav> regions are labelled (aria-label / aria-labelledby)
  const navMatches = html.match(/<nav\b[^>]*>/gi) || [];
  let unlabelledNav = 0;
  for (const n of navMatches) if (!attr(n, "aria-label") && !attr(n, "aria-labelledby")) unlabelledNav++;
  if (unlabelledNav > 0) v.push(`${unlabelledNav} <nav> region(s) without aria-label/aria-labelledby`);

  // 6. every <img> has a non-empty alt
  const imgMatches = html.match(/<img\b[^>]*>/gi) || [];
  let imgNoAlt = 0;
  for (const im of imgMatches) { const a = attr(im, "alt"); if (a === null || a.trim() === "") imgNoAlt++; }
  if (imgNoAlt > 0) v.push(`${imgNoAlt} <img> element(s) without a non-empty alt attribute`);

  // 7. every heading carries an id (anchor navigation)
  const headingTags = html.match(/<h[1-6]\b[^>]*>/gi) || [];
  let headNoId = 0;
  for (const h of headingTags) if (!attr(h, "id")) headNoId++;
  if (headNoId > 0) v.push(`${headNoId} heading(s) without an id`);

  // 8. heading levels never jump down by more than one (h1→h3 is a structure error)
  const levels = (html.match(/<h([1-6])\b/gi) || []).map((t) => parseInt(t.replace(/<h/i, ""), 10));
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) { v.push(`heading level jumps from h${levels[i - 1]} to h${levels[i]} (skips a level)`); break; }
  }

  // 9. every <button> has an accessible name (aria-label or text content)
  const buttonBlocks = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/gi) || [];
  let btnNoName = 0;
  for (const b of buttonBlocks) {
    const open = /<button\b[^>]*>/i.exec(b)[0];
    const inner = b.replace(/^<button\b[^>]*>/i, "").replace(/<\/button>$/i, "");
    if (!attr(open, "aria-label") && !attr(open, "title") && !textOf(inner)) btnNoName++;
  }
  if (btnNoName > 0) v.push(`${btnNoName} <button>(s) without an accessible name`);

  // 10. <input> controls have a label / aria-label / aria-labelledby / title
  const inputTags = html.match(/<input\b[^>]*>/gi) || [];
  let inputNoLabel = 0;
  for (const inp of inputTags) {
    const type = (attr(inp, "type") || "text").toLowerCase();
    if (type === "hidden" || type === "submit" || type === "button" || type === "reset") continue;
    const id = attr(inp, "id");
    const hasFor = id && new RegExp(`<label\\b[^>]*\\bfor\\s*=\\s*["']${id}["']`, "i").test(html);
    if (!attr(inp, "aria-label") && !attr(inp, "aria-labelledby") && !attr(inp, "title") && !hasFor) inputNoLabel++;
  }
  if (inputNoLabel > 0) v.push(`${inputNoLabel} <input> control(s) without a label/aria-label`);

  return v;
}

/**
 * The CLI body as a pure function: parse argv, check each file, print results, return the exit code.
 * Never calls process.exit — the caller (the run-as-main guard below, or a test) decides.
 */
export function runCli(argv) {
  const quiet = argv.includes("--quiet");
  const files = argv.filter((a) => !a.startsWith("--"));
  if (files.length === 0) {
    process.stderr.write("Usage: node scripts/check-spec-html-a11y.mjs <html-file> [...] [--quiet]\n");
    return 1;
  }
  let failed = 0;
  for (const file of files) {
    let html;
    try { html = fs.readFileSync(file, "utf8"); } catch (err) {
      process.stderr.write(`check-spec-html-a11y: cannot read ${file}: ${err?.message || err}\n`);
      failed++;
      continue;
    }
    const violations = checkA11y(html);
    const rel = path.relative(process.cwd(), file) || file;
    if (violations.length === 0) {
      if (!quiet) process.stdout.write(`OK   ${rel}\n`);
    } else {
      failed++;
      process.stdout.write(`FAIL ${rel} — ${violations.length} a11y issue(s):\n`);
      for (const m of violations) process.stdout.write(`       • ${m}\n`);
    }
  }
  if (failed > 0) {
    if (!quiet) process.stdout.write(`check-spec-html-a11y: ${failed}/${files.length} file(s) failed\n`);
    return 2;
  }
  if (!quiet) process.stdout.write(`check-spec-html-a11y: all ${files.length} file(s) pass\n`);
  return 0;
}

// Run the CLI only when this file is the process entry point — never on `import` (so a hook or a
// test can pull in checkA11y / runCli without the module's top level reading process.argv & exiting).
const invokedDirectly = (() => {
  try {
    if (!process.argv[1]) return false;
    let a = path.resolve(process.argv[1]);
    let b = fileURLToPath(import.meta.url);
    if (process.platform === "win32") { a = a.toLowerCase(); b = b.toLowerCase(); } // NTFS is case-insensitive
    return a === b;
  } catch { return false; }
})();
if (invokedDirectly) process.exit(runCli(process.argv.slice(2)));
