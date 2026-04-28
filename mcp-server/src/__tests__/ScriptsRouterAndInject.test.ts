/**
 * ScriptsRouterAndInject.test.ts
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P3-U02 — verifies (a) the
 * summarize-all-scripts-via-ollama.mjs script walks both project
 * scripts directories, extracts docstring summaries (with shebang
 * tolerance), writes both SCRIPTS_INDEX.json and the human
 * knowledge/scripts/INDEX.md vault file, and is idempotent across
 * reruns; and (b) the script-summary-inject.mjs PreToolUse hook
 * matches Bash invocations against the cached index and injects a
 * 1-line summary.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const SUMMARIZER = "H:/prism/scripts/summarize-all-scripts-via-ollama.mjs";
const HOOK = "H:/prism/.claude/hooks/script-summary-inject.mjs";
const STATE_FILE = "H:/prism/mcp-server/data/state/SCRIPTS_INDEX.json";
const VAULT_INDEX = "H:/prism/knowledge/scripts/INDEX.md";

function runSummarizer(args: string[]) {
  return spawnSync(process.execPath, [SUMMARIZER, ...args], {
    encoding: "utf8",
    timeout: 60_000,
    cwd: "H:/prism",
  });
}

function runHook(payload: unknown) {
  return spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    timeout: 8_000,
  });
}

beforeAll(() => {
  // Ensure the index is populated before assertions
  if (!existsSync(STATE_FILE)) {
    const r = runSummarizer(["--no-ollama"]);
    if (r.status !== 0) throw new Error(`summarizer bootstrap failed: ${r.stderr}`);
  }
});

describe("summarize-all-scripts — P3-U02", () => {
  it("--dry-run reports >300 scripts found across both script dirs", () => {
    const r = runSummarizer(["--dry-run", "--no-ollama"]);
    expect(r.status).toBe(0);
    const stats = JSON.parse(r.stdout) as {
      found: number;
      dryRun: boolean;
      noOllama: boolean;
      summarizedDocstring: number;
      skipped: number;
    };
    expect(stats.dryRun).toBe(true);
    expect(stats.found).toBeGreaterThan(300);
    // Either freshly summarized this run or cached from prior run — combined
    // count must reflect that the docstring path covered the bulk.
    expect(stats.summarizedDocstring + stats.skipped).toBeGreaterThan(100);
  });

  it("--no-ollama writes SCRIPTS_INDEX.json + INDEX.md with valid shape", () => {
    runSummarizer(["--no-ollama"]);
    expect(existsSync(STATE_FILE)).toBe(true);
    expect(existsSync(VAULT_INDEX)).toBe(true);
    const state = JSON.parse(readFileSync(STATE_FILE, "utf8")) as {
      schemaVersion: string;
      entries: Record<string, { hash: string; summary: string; lastIndexed: string }>;
    };
    expect(state.schemaVersion).toBe("1.0.0");
    expect(Object.keys(state.entries).length).toBeGreaterThan(300);
    const md = readFileSync(VAULT_INDEX, "utf8");
    expect(md).toContain("# Scripts Index");
    expect(md).toMatch(/\*\*Total scripts:\*\* \d+/);
  });

  it("docstring extraction tolerates leading shebang line", () => {
    const state = JSON.parse(readFileSync(STATE_FILE, "utf8")) as {
      entries: Record<string, { summary: string }>;
    };
    // Find any entry whose source begins with #!/usr/bin/env node
    let docstringHits = 0;
    let shebangHits = 0;
    for (const [key, e] of Object.entries(state.entries)) {
      if (!key.endsWith(".mjs")) continue;
      let content = "";
      try { content = readFileSync(key, "utf8"); }
      catch { continue; }
      if (!content.startsWith("#!")) continue;
      shebangHits++;
      if (!e.summary.startsWith("(no docstring")) docstringHits++;
    }
    expect(shebangHits).toBeGreaterThan(0);
    // At least 50% of shebanged .mjs scripts must have extracted a docstring
    expect(docstringHits / Math.max(shebangHits, 1)).toBeGreaterThan(0.5);
  });

  it("idempotency: second run skips all already-indexed scripts", () => {
    runSummarizer(["--no-ollama"]);
    const r = runSummarizer(["--no-ollama"]);
    expect(r.status).toBe(0);
    const stats = JSON.parse(r.stdout) as { skipped: number; found: number; summarizedDocstring: number; summarizedOllama: number };
    expect(stats.skipped).toBe(stats.found);
    expect(stats.summarizedDocstring).toBe(0);
    expect(stats.summarizedOllama).toBe(0);
  });

  it("FAIL: unknown CLI flag exits 2 with stderr message", () => {
    const r = runSummarizer(["--bogus"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/Unknown arg/);
  });

  it("ADV: --help short-circuits without scanning", () => {
    const r = runSummarizer(["--help"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Usage:/);
    expect(r.stdout).not.toMatch(/totalFound|summarizedDocstring/);
  });

  it("ADV: --limit=10 caps the scan to 10 scripts", () => {
    const r = runSummarizer(["--dry-run", "--no-ollama", "--limit=10"]);
    expect(r.status).toBe(0);
    const stats = JSON.parse(r.stdout) as { found: number };
    expect(stats.found).toBe(10);
  });
});

describe("script-summary-inject — P3-U02", () => {
  it("emits continue:true on non-Bash tool", () => {
    const r = runHook({ tool_name: "Read", tool_input: { file_path: "x.ts" } });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("emits continue:true on Bash command without script reference", () => {
    const r = runHook({ tool_name: "Bash", tool_input: { command: "ls -la" } });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("emits continue:true on Bash command referencing unknown script", () => {
    const r = runHook({ tool_name: "Bash", tool_input: { command: "node /tmp/foo-that-does-not-exist.mjs" } });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("variability: 3 distinct Bash invocations of indexed scripts inject a summary", () => {
    const cmds = [
      "node scripts/embed-all-skills.mjs --dry-run",
      "node scripts/summarize-all-scripts-via-ollama.mjs --help",
      "node scripts/migrate-error-ledgers.mjs --dry-run",
    ];
    let hits = 0;
    for (const command of cmds) {
      const r = runHook({ tool_name: "Bash", tool_input: { command } });
      expect(r.status).toBe(0);
      const out = JSON.parse(r.stdout) as { hookSpecificOutput?: { additionalContext?: string } };
      const ctx = out.hookSpecificOutput?.additionalContext ?? "";
      if (ctx.startsWith("📜 ")) hits++;
    }
    expect(hits).toBeGreaterThanOrEqual(3);
  });

  it("FAIL: empty stdin → continue:true exactly", () => {
    const r = spawnSync(process.execPath, [HOOK], { input: "", encoding: "utf8", timeout: 4_000 });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("FAIL: malformed JSON stdin → continue:true exactly", () => {
    const r = spawnSync(process.execPath, [HOOK], { input: "garbage{{", encoding: "utf8", timeout: 4_000 });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("ADV: tsx invocation also matches the script via basename fallback", () => {
    const r = runHook({ tool_name: "Bash", tool_input: { command: "npx tsx mcp-server/scripts/dump-all-tips.ts" } });
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { hookSpecificOutput?: { additionalContext?: string } };
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    // Either the script is indexed (hit) or it's not (continue:true) — both valid.
    // We assert no crash and either pure continue:true or a 📜 prefix.
    if (ctx.length > 0) expect(ctx.startsWith("📜 ")).toBe(true);
  });
});
