/**
 * HtmlCompanionGuardHook.test.ts
 *
 * Exercises .claude/hooks/html-companion-guard.mjs (HTML-PRIMARY-MS0 U-HPS05 + U-HPS06):
 *   - clean twin staged             → no advisory ({continue:true} only)
 *   - drifted twin (hash mismatch)  → warn advisory naming the file + "DRIFT"/"stale"
 *   - .md staged, .html twin missing → warn advisory + "MISSING"
 *   - a11y violation (<img> no alt)  → warn advisory + the canonical checkA11y message
 *   - non-git command               → no-op
 *   - no spec/research files staged  → no-op
 *   - PRISM_HTML_GUARD=0            → no-op even with a drifted twin
 *   - PRISM_HTML_GUARD_BLOCK=1      → decision:block on drift
 *   - empty / malformed stdin       → exit 0 silent
 *   + extractSourceHash (the hook's own drift helper) + checkA11y wiring (re-exported from
 *     scripts/check-spec-html-a11y.mjs — the canonical checker the HTML lane committed; its
 *     exhaustive cases live in that module's own suite, here we just confirm the wiring +
 *     that this file's "clean" fixture stays clean under it).
 *
 * Spawns the hook as a child process against throwaway git repos (no live deps,
 * no mocks). Mirrors the pattern in CommitDraftSuggestHook.test.ts.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync, execSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — plain ESM hook module, no type declarations
import { checkA11y, extractSourceHash } from "../../../.claude/hooks/html-companion-guard.mjs";

const HOOK = "H:/prism/.claude/hooks/html-companion-guard.mjs";
const ZERO_HASH = "0".repeat(64);

function sha256(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/** Build a minimal HTML twin embedding `srcHash` that passes the canonical checkA11y. */
function cleanHtml(srcHash: string, title = "Demo Spec"): string {
  return [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head><meta name="prism-source-hash" content="${srcHash}"><title>${title}</title></head>`,
    `<body>`,
    `<a class="skip-link" href="#content">Skip to content</a>`,
    `<main role="main" id="content">`,
    `<h1 id="top" class="page-title">${title}</h1>`,
    `<h2 id="section-one">Section One</h2>`,
    `<p>Body text. <img src="diagram.png" alt="A diagram"></p>`,
    `</main>`,
    `</body></html>`,
  ].join("\n");
}

let workdir = "";

function git(args: string, cwd = workdir): string {
  return execSync(`git ${args}`, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), "prism-htmlguard-"));
  git("init -q");
  git('config user.email "test@test"');
  git('config user.name "test"');
  git("commit --allow-empty -q -m init");
  mkdirSync(join(workdir, "state/shared/specs"), { recursive: true });
  mkdirSync(join(workdir, "state/shared/research"), { recursive: true });
});

afterEach(() => {
  if (workdir && existsSync(workdir)) {
    try { rmSync(workdir, { recursive: true, force: true }); } catch { /* best effort */ }
  }
});

/** Run the hook with a Bash/`git commit`-shaped payload (cwd = the temp repo). */
function runHook(command = `git commit -m "[X]/U-1: t"`, env: Record<string, string> = {}, rawStdin?: string) {
  const payload = rawStdin !== undefined ? rawStdin : JSON.stringify({
    tool_name: "Bash",
    tool_input: { command },
    cwd: workdir,
    session_id: "test-htmlguard",
  });
  const r = spawnSync(process.execPath, [HOOK], {
    input: payload,
    encoding: "utf8",
    timeout: 12_000,
    cwd: workdir,
    env: { ...process.env, ...env },
  });
  let parsed: any = null;
  try { parsed = JSON.parse((r.stdout || "").trim()); } catch { /* leave null */ }
  return { ...r, parsed, advisory: parsed?.hookSpecificOutput?.additionalContext ?? "" };
}

function stageSpec(stem: string, mdBody: string, htmlBody: string | null): void {
  const mdRel = `state/shared/specs/${stem}.md`;
  writeFileSync(join(workdir, mdRel), mdBody);
  git(`add ${mdRel}`);
  if (htmlBody !== null) {
    const htmlRel = `state/shared/specs/${stem}.html`;
    writeFileSync(join(workdir, htmlRel), htmlBody);
    git(`add ${htmlRel}`);
  }
}

describe("html-companion-guard hook — HTML-PRIMARY-MS0 U-HPS05/U-HPS06", () => {
  it("clean twin staged → exit 0, {continue:true}, no advisory", () => {
    const md = "# Demo Spec\n\nContent.\n";
    stageSpec("clean", md, cleanHtml(sha256(md)));
    const r = runHook();
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });

  it("drifted twin (embedded hash ≠ sha256(md)) → warn advisory naming the file", () => {
    const md = "# Demo Spec\n\nThe markdown changed since the HTML was rendered.\n";
    stageSpec("drifted", md, cleanHtml(ZERO_HASH)); // deliberately wrong hash
    const r = runHook();
    expect(r.status).toBe(0);
    expect(r.parsed.continue).toBe(true);
    expect(r.parsed.hookSpecificOutput.hookEventName).toBe("PreToolUse");
    expect(r.advisory).toContain("DRIFT");
    expect(r.advisory).toContain("state/shared/specs/drifted.html");
    expect(r.advisory).toMatch(/stale — embedded 0{12}… ≠ source [0-9a-f]{12}…/);
    expect(r.advisory).toContain("emit-all-spec-html.ts --force");
    expect(r.advisory).toContain("warn-only");
  });

  it(".md staged but its .html twin is missing → warn advisory + MISSING", () => {
    stageSpec("orphan-md", "# No twin yet\n", null);
    const r = runHook();
    expect(r.status).toBe(0);
    expect(r.parsed.continue).toBe(true);
    expect(r.advisory).toContain("HTML twin MISSING");
    expect(r.advisory).toContain("state/shared/specs/orphan-md.html");
  });

  it("a11y violation (<img> without alt) → warn advisory with the canonical checkA11y message, still proceeds", () => {
    const md = "# Demo\n\n![](x.png)\n";
    const html = cleanHtml(sha256(md)).replace('<img src="diagram.png" alt="A diagram">', '<img src="x.png">');
    stageSpec("bad-a11y", md, html);
    const r = runHook();
    expect(r.status).toBe(0);
    expect(r.parsed.continue).toBe(true);
    expect(r.advisory).toContain("A11Y");
    expect(r.advisory).toContain("1 <img> element(s) without a non-empty alt attribute");
    expect(r.advisory).toContain("state/shared/specs/bad-a11y.html");
    expect(r.advisory).toContain("check-spec-html-a11y.mjs");
  });

  it("non-git command → no-op ({continue:true}) even with a drifted twin staged", () => {
    stageSpec("drifted2", "# Demo\n", cleanHtml(ZERO_HASH));
    const r = runHook(`ls -la`);
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });

  it("git command but no spec/research files staged → no-op", () => {
    writeFileSync(join(workdir, "demo.txt"), "hello");
    git("add demo.txt");
    const r = runHook();
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });

  it("PRISM_HTML_GUARD=0 → no-op even with a drifted twin staged", () => {
    stageSpec("drifted3", "# Demo\n", cleanHtml(ZERO_HASH));
    const r = runHook(`git commit -m "[X]/U-1: t"`, { PRISM_HTML_GUARD: "0" });
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });

  it("PRISM_HTML_GUARD_BLOCK=1 + drift → decision:block with the fix hint", () => {
    stageSpec("drifted4", "# Demo\n", cleanHtml(ZERO_HASH));
    const r = runHook(`git commit -m "[X]/U-1: t"`, { PRISM_HTML_GUARD_BLOCK: "1" });
    expect(r.status).toBe(0);
    expect(r.parsed.decision).toBe("block");
    expect(r.parsed.reason).toContain("BLOCKED");
    expect(r.parsed.reason).toContain("state/shared/specs/drifted4.html");
    expect(r.parsed.reason).toContain("emit-all-spec-html.ts --force");
  });

  it("research/ twins are also covered", () => {
    const mdRel = "state/shared/research/note.md";
    writeFileSync(join(workdir, mdRel), "# Research note\n");
    git(`add ${mdRel}`);
    writeFileSync(join(workdir, "state/shared/research/note.html"), cleanHtml("a".repeat(64)));
    git("add state/shared/research/note.html");
    const r = runHook();
    expect(r.status).toBe(0);
    expect(r.parsed.continue).toBe(true);
    expect(r.advisory).toContain("state/shared/research/note.html");
    expect(r.advisory).toContain("DRIFT");
  });

  it("a clean .md whose committed .html is up to date → no-op (no false positive)", () => {
    // .md staged alone; .html exists on disk (not staged) and matches → no advisory.
    const md = "# Stable\n\nUnchanged body.\n";
    const mdRel = "state/shared/specs/stable.md";
    writeFileSync(join(workdir, mdRel), md);
    writeFileSync(join(workdir, "state/shared/specs/stable.html"), cleanHtml(sha256(md)));
    git(`add ${mdRel}`); // only the .md is staged
    const r = runHook();
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });

  it("empty stdin → exit 0 silent", () => {
    const r = runHook("", {}, "");
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });

  it("malformed JSON stdin → exit 0 silent", () => {
    const r = runHook("", {}, "garbage{{not json");
    expect(r.status).toBe(0);
    expect(r.parsed).toEqual({ continue: true });
  });
});

describe("html-companion-guard — helpers", () => {
  it("extractSourceHash: reads content from name=prism-source-hash, any attr order, lowercased", () => {
    const h = "A1B2".repeat(16); // 64 hex chars, mixed case
    expect(extractSourceHash(`<meta name="prism-source-hash" content="${h}">`)).toBe(h.toLowerCase());
    expect(extractSourceHash(`<meta content='${h}' name='prism-source-hash'>`)).toBe(h.toLowerCase());
  });

  it("extractSourceHash: returns null when the meta is absent or not a 64-hex value", () => {
    expect(extractSourceHash("<html>no meta here</html>")).toBeNull();
    expect(extractSourceHash(`<meta name="prism-source-hash" content="not-a-hash">`)).toBeNull();
    expect(extractSourceHash(`<meta name="other" content="${"a".repeat(64)}">`)).toBeNull();
  });

  it("checkA11y wiring: the hook re-exports the canonical checker, and this file's clean fixture passes it", () => {
    expect(typeof checkA11y).toBe("function");
    expect(checkA11y(cleanHtml("f".repeat(64)))).toEqual([]);
  });

  it("checkA11y wiring: a structurally-broken page yields the expected canonical violations", () => {
    const bad = "<html><head><title>  </title></head><body><h1>H</h1><p><img src='x.png'></p></body></html>";
    const v: string[] = checkA11y(bad);
    expect(v).toContain("<html> is missing a non-empty lang attribute");
    expect(v).toContain("<title> is missing or empty");
    expect(v).toContain("1 <img> element(s) without a non-empty alt attribute");
    expect(v).toContain("1 heading(s) without an id");
    expect(v.length).toBeGreaterThanOrEqual(4);
  });
});
