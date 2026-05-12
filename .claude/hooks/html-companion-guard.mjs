#!/usr/bin/env node
/**
 * html-companion-guard.mjs — per-commit guard for HTML spec/research companions.
 *
 * Fires on `git commit`. If the staged set touches any Markdown or HTML file
 * under state/shared/specs/** or state/shared/research/**, then for each such
 * "twin" (a `<stem>.md` ↔ `<stem>.html` pair) it checks, against the working
 * tree:
 *
 *   1. DRIFT (HC-5 / HTML-PRIMARY-MS0 U-HPS06): the .html embeds
 *      `<meta name="prism-source-hash" content="<sha256>">`. If that hash ≠
 *      sha256(<stem>.md), the .html is stale relative to its Markdown source.
 *      Also flags a staged .md whose .html twin is missing entirely, or a .html
 *      with no source-hash meta.
 *   2. A11Y (HTML-PRIMARY-MS0 U-HPS05): a fast WAI-ARIA subset — `<html lang>`,
 *      a non-empty `<title>`, a skip-link or `<main>` landmark, every `<img>`
 *      has an `alt` attribute, every heading carries an `id`. (The exhaustive
 *      check is `scripts/check-spec-html-a11y.mjs`; this is the cheap gate.)
 *
 * Default behaviour is WARN-ONLY (non-blocking) — it surfaces a directive with
 * the fix command and lets the commit through. Opt in to a HARD BLOCK with
 * PRISM_HTML_GUARD_BLOCK=1. Disable the guard entirely with PRISM_HTML_GUARD=0.
 *
 * Fails OPEN on any error, on a non-commit command, or when disabled. Import-safe
 * (only runs when invoked directly; exports its pure helpers for unit tests).
 *
 * Hook trigger: PreToolUse:Bash — registered in bundles/bash-bundle.mjs BASH_HOOKS.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

// repo-relative paths look like  state/shared/specs/foo.html  or  state\shared\research\bar.md
const SPEC_FILE_RE = /(?:^|[\\/])state[\\/]shared[\\/](?:specs|research)[\\/].*\.(?:md|html)$/i;

function git(args, cwd) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 10000 }).trim();
  } catch { return null; }
}

function sha256(buf) { return createHash("sha256").update(buf).digest("hex"); }

/** Pull the sha256 out of `<meta name="prism-source-hash" content="…">`, any attr order. */
function extractSourceHash(html) {
  const meta = html.match(/<meta\b[^>]*\bname\s*=\s*["']prism-source-hash["'][^>]*>/i);
  if (!meta) return null;
  const c = meta[0].match(/\bcontent\s*=\s*["']([a-fA-F0-9]{64})["']/);
  return c ? c[1].toLowerCase() : null;
}

/** Fast WAI-ARIA subset. Returns an array of human-readable violation strings (empty = clean). */
function a11yViolations(html) {
  const v = [];
  if (!/<html\b[^>]*\blang\s*=\s*["'][^"']+["']/i.test(html)) v.push("missing <html lang>");
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!t || !t[1].trim()) v.push("empty/missing <title>");
  const hasSkip = /href\s*=\s*["']#(?:content|main|top)["']/i.test(html);
  const hasMain = /<main\b/i.test(html) || /\brole\s*=\s*["']main["']/i.test(html);
  if (!hasSkip && !hasMain) v.push("no skip-link and no <main> landmark");
  let imgNoAlt = 0;
  for (const tag of html.match(/<img\b[^>]*>/gi) || []) if (!/\balt\s*=/i.test(tag)) imgNoAlt++;
  if (imgNoAlt) v.push(`${imgNoAlt} <img> without alt`);
  let hNoId = 0;
  for (const tag of html.match(/<h[1-6]\b[^>]*>/gi) || []) if (!/\bid\s*=\s*["'][^"']+["']/i.test(tag)) hNoId++;
  if (hNoId) v.push(`${hNoId} heading(s) without id`);
  return v;
}

/**
 * Check one stem (path without extension), resolved against repo top.
 * Returns { drift: string|null, a11y: string[] }. A stem with no `.md` source
 * is ignored (could be a hand-authored standalone .html).
 */
function checkTwin(top, stem) {
  const out = { drift: null, a11y: [] };
  const mdAbs = join(top, stem + ".md");
  const htmlAbs = join(top, stem + ".html");
  if (!existsSync(mdAbs)) return out; // no Markdown source — not this guard's business
  if (!existsSync(htmlAbs)) { out.drift = "HTML twin MISSING (Markdown changed without re-rendering)"; return out; }
  let html, mdHash;
  try { html = readFileSync(htmlAbs, "utf8"); mdHash = sha256(readFileSync(mdAbs)); } catch { return out; }
  const embedded = extractSourceHash(html);
  if (!embedded) out.drift = "no <meta prism-source-hash> in the HTML";
  else if (embedded !== mdHash) out.drift = `stale — embedded ${embedded.slice(0, 12)}… ≠ source ${mdHash.slice(0, 12)}…`;
  out.a11y = a11yViolations(html);
  return out;
}

function main() {
  if (process.env.PRISM_HTML_GUARD === "0") { process.stdout.write(JSON.stringify({ continue: true })); return; }

  let hookInput = {};
  try { hookInput = JSON.parse(readFileSync(0, "utf8")); } catch { /* direct/test invocation with no stdin */ }

  const toolName = hookInput.tool_name || "";
  const command = hookInput.tool_input?.command || "";
  if (toolName !== "Bash" || !/\bgit\s+commit\b/.test(command)) { process.stdout.write(JSON.stringify({ continue: true })); return; }

  // Claude Code passes the Bash command's cwd in the hook payload; fall back to
  // this process's cwd (≈ repo root, since the hook-runner inherits it). This is
  // what makes the guard work in worktrees and in tests without a hardcoded path.
  const cwd = (typeof hookInput.cwd === "string" && hookInput.cwd) ? hookInput.cwd : process.cwd();
  const staged = git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"], cwd);
  if (!staged) { process.stdout.write(JSON.stringify({ continue: true })); return; }

  const stems = new Set();
  for (const rel of staged.split("\n").map((s) => s.trim()).filter(Boolean)) {
    if (SPEC_FILE_RE.test(rel)) stems.add(rel.replace(/\.(?:md|html)$/i, ""));
  }
  if (stems.size === 0) { process.stdout.write(JSON.stringify({ continue: true })); return; }

  const top = git(["rev-parse", "--show-toplevel"], cwd) || cwd;
  const drifted = [], a11yBad = [];
  for (const stem of stems) {
    const { drift, a11y } = checkTwin(top, stem);
    if (drift) drifted.push(`${stem}.html — ${drift}`);
    if (a11y.length) a11yBad.push(`${stem}.html — ${a11y.join("; ")}`);
  }

  if (drifted.length === 0 && a11yBad.length === 0) { process.stdout.write(JSON.stringify({ continue: true })); return; }

  const lines = [`⚠ HTML companion guard — ${stems.size} spec/research twin(s) staged; ${drifted.length} drifted, ${a11yBad.length} with a11y issues:`];
  if (drifted.length) {
    lines.push("", "DRIFT (HTML out of sync with its Markdown):");
    for (const d of drifted.slice(0, 10)) lines.push(`  • ${d}`);
    if (drifted.length > 10) lines.push(`  … and ${drifted.length - 10} more`);
    lines.push("  fix: node --import tsx H:/prism/scripts/emit-all-spec-html.ts --force   (then re-stage the .html)");
  }
  if (a11yBad.length) {
    lines.push("", "A11Y (WAI-ARIA subset):");
    for (const a of a11yBad.slice(0, 10)) lines.push(`  • ${a}`);
    if (a11yBad.length > 10) lines.push(`  … and ${a11yBad.length - 10} more`);
    lines.push("  full check: node H:/prism/scripts/check-spec-html-a11y.mjs <html…>");
  }

  if (process.env.PRISM_HTML_GUARD_BLOCK === "1") {
    lines.push("", "Commit BLOCKED (PRISM_HTML_GUARD_BLOCK=1). Re-render / fix and re-stage, or unset the env var for warn-only.");
    process.stdout.write(JSON.stringify({ decision: "block", reason: lines.join("\n") }));
  } else {
    lines.push("", "Proceeding (warn-only). Set PRISM_HTML_GUARD_BLOCK=1 to make this a hard block; PRISM_HTML_GUARD=0 to disable.");
    process.stdout.write(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: lines.join("\n") } }));
  }
}

// Import-safe: only run when this file is the entrypoint (the hook-runner spawns
// it as `node html-companion-guard.mjs`). When a unit test imports the helpers,
// process.argv[1] is the test runner, so main() is skipped.
const invokedDirectly = (() => {
  try { return (process.argv[1] || "").replace(/\\/g, "/").endsWith("/html-companion-guard.mjs"); } catch { return true; }
})();
if (invokedDirectly) {
  try { main(); } catch { try { process.stdout.write(JSON.stringify({ continue: true })); } catch { /* nothing more we can do */ } }
}

export { a11yViolations, extractSourceHash, checkTwin };
