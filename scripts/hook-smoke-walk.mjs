#!/usr/bin/env node
/**
 * hook-smoke-walk.mjs — PRISM-STAB-MS0/U-D3 (2026-05-10).
 *
 * Walks every hook registered in C:/Users/wompu/.claude/settings.json,
 * invokes it with a minimal valid stdin payload, and reports:
 *   - exit code
 *   - wall-clock duration
 *   - stderr (first 200 chars)
 *   - stdout JSON validity
 *
 * Goal: identify hooks that are broken or slow ENOUGH to be the source
 * of a session's "boatload of hook errors" report.
 *
 * Usage:
 *   node scripts/hook-smoke-walk.mjs                 # walk every phase
 *   node scripts/hook-smoke-walk.mjs --phase=PreToolUse
 *   node scripts/hook-smoke-walk.mjs --hook=async-pattern-checker
 *   node scripts/hook-smoke-walk.mjs --json          # machine-readable
 */
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";

const SETTINGS = "C:/Users/wompu/.claude/settings.json";
const NODE = "H:/Tools/nodejs/node.exe";
const PER_HOOK_TIMEOUT_MS = 5000;

const args = process.argv.slice(2);
const filter = {
  phase: (args.find((a) => a.startsWith("--phase=")) || "").split("=")[1] || null,
  hook: (args.find((a) => a.startsWith("--hook=")) || "").split("=")[1] || null,
  json: args.includes("--json"),
};

function nameOf(cmd) {
  const m = cmd.match(/[/\\]hooks[/\\]([^/\\]+)\.mjs/) ||
            cmd.match(/[/\\]helpers[/\\]([^/\\]+)\.mjs/) ||
            cmd.match(/[/\\]scripts[/\\]([^/\\]+)\.mjs/);
  return m ? m[1] : cmd.slice(-60);
}

function pathOf(cmd) {
  // command is `"H:/.claude/bin/portable-node" /path/to/hook.mjs` — extract second arg
  const tokens = cmd.split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    if (t.endsWith(".mjs") || t.endsWith(".js") || t.endsWith(".cjs")) {
      return t.replace(/^["']|["']$/g, "");
    }
  }
  return null;
}

function smokeStdinFor(phase, hookName) {
  // Minimal but realistic payload per phase. Most hooks early-exit on
  // missing fields, but some require tool_name/tool_input to do anything.
  const base = {
    session_id: "smoke-test-claude-7b9d1810",
    transcript_path: "H:/dev/null",
    cwd: "H:/prism",
    hook_event_name: phase,
  };
  if (phase === "PreToolUse" || phase === "PostToolUse") {
    return JSON.stringify({
      ...base,
      tool_name: "Edit",
      tool_input: { file_path: "H:/prism/scripts/hook-smoke-walk.mjs", old_string: "x", new_string: "x" },
      tool_response: phase === "PostToolUse" ? { success: true } : undefined,
    });
  }
  if (phase === "UserPromptSubmit") {
    return JSON.stringify({ ...base, prompt: "smoke test", message: { content: "smoke test" } });
  }
  if (phase === "SessionStart" || phase === "SessionEnd" || phase === "Stop") {
    return JSON.stringify(base);
  }
  if (phase === "PreCompact") {
    return JSON.stringify({ ...base, trigger: "manual" });
  }
  return JSON.stringify(base);
}

function runHook(phase, cmd) {
  const hookPath = pathOf(cmd);
  if (!hookPath) return { skipped: true, reason: "could not extract path" };
  if (!fs.existsSync(hookPath)) return { error: "ENOENT", hookPath };
  const stdin = smokeStdinFor(phase, nameOf(cmd));
  const start = Date.now();
  let r;
  try {
    r = spawnSync(NODE, [hookPath], {
      input: stdin,
      timeout: PER_HOOK_TIMEOUT_MS,
      encoding: "utf-8",
      shell: false,
    });
  } catch (e) {
    return { error: e.message, hookPath };
  }
  const elapsedMs = Date.now() - start;
  const stderr = (r.stderr || "").trim();
  const stdout = (r.stdout || "").trim();
  let stdoutValid = null;
  if (stdout) {
    try { JSON.parse(stdout); stdoutValid = true; } catch { stdoutValid = false; }
  }
  return {
    exitCode: r.status,
    signal: r.signal || null,
    elapsedMs,
    stderr: stderr.slice(0, 200),
    stdoutBytes: stdout.length,
    stdoutValid,
    timedOut: r.signal === "SIGTERM" && elapsedMs >= PER_HOOK_TIMEOUT_MS - 100,
    hookPath,
  };
}

function classify(result) {
  if (result.skipped) return "SKIP";
  if (result.error) return "MISSING";
  if (result.timedOut) return "TIMEOUT";
  if (result.exitCode === 2) return "BLOCK";
  if (result.exitCode !== 0) return "ERROR";
  if (result.stderr && /Error:|TypeError|SyntaxError|Cannot find/.test(result.stderr)) return "STDERR_FAIL";
  if (result.stdoutBytes > 0 && result.stdoutValid === false) return "BAD_JSON";
  return "OK";
}

function main() {
  const j = JSON.parse(fs.readFileSync(SETTINGS, "utf-8"));
  const phases = Object.keys(j.hooks || {});
  const results = [];

  for (const phase of phases) {
    if (filter.phase && phase !== filter.phase) continue;
    const matchers = j.hooks[phase] || [];
    for (const m of matchers) {
      if (!Array.isArray(m.hooks)) continue;
      for (const h of m.hooks) {
        const cmd = h.command || "";
        const name = nameOf(cmd);
        if (filter.hook && !name.includes(filter.hook)) continue;
        const r = runHook(phase, cmd);
        const status = classify(r);
        results.push({ phase, matcher: m.matcher || "(any)", name, status, ...r });
      }
    }
  }

  if (filter.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  // human-readable
  const counts = {};
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
  console.log(`\nWalked ${results.length} hooks across ${phases.length} phase(s)\n`);
  console.log("Status summary:");
  for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(12)} ${v}`);
  }
  console.log("\nProblem hooks (non-OK):");
  for (const r of results) {
    if (r.status === "OK") continue;
    const ms = r.elapsedMs ? `${r.elapsedMs}ms` : "";
    const note = r.error || r.stderr || (r.timedOut ? "timeout" : "");
    console.log(`  [${r.status.padEnd(11)}] ${r.phase.padEnd(15)} ${r.name.padEnd(36)} ${ms.padEnd(7)} ${note.slice(0, 90)}`);
  }
  const slow = results.filter((r) => r.status === "OK" && r.elapsedMs >= 1000)
    .sort((a, b) => b.elapsedMs - a.elapsedMs).slice(0, 10);
  if (slow.length) {
    console.log("\nSlowest OK hooks (>=1s):");
    for (const r of slow) console.log(`  [${String(r.elapsedMs).padStart(5)}ms] ${r.phase.padEnd(15)} ${r.name}`);
  }
}

main();
