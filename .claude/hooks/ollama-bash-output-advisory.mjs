#!/usr/bin/env node
// tier: T3
/**
 * ollama-bash-output-advisory.mjs -- PostToolUse:Bash -- surface the Bash-output
 * offload surface (the one high-volume surface with ZERO Ollama routing today).
 *
 * WHY (GPU-OFFLOAD-MAXIMIZE / OLLAMA-USAGE-UP, 2026-06-30, slot:charlie):
 * A read-only audit of the offload substrate found the local-LLM offload rate stuck
 * at ~25.8% because Read / Grep / UserPromptSubmit are all wired to Ollama routers,
 * but Bash command OUTPUT (build logs, `tsc`/`vitest` runs, `git diff`, piped
 * `grep`/`cat` dumps) -- the single largest token surface in a build/debug session --
 * has NO automatic Ollama routing at all, so its traffic never even lands in the
 * offload dashboard. This hook closes the MEASUREMENT + AWARENESS gap first.
 *
 * WHAT IT DOES (honest, R12): PostToolUse fires AFTER the command ran, so it cannot
 * re-route the command. Instead, when a Bash command produced a LARGE, GIST-ONLY
 * output (a class the deterministic condensers -- git/vitest/npm/tsc -- do not fully
 * collapse), it emits a suggest-only advisory to pipe the NEXT analogous read through
 * a local model (`node scripts/ask-ollama.mjs summarize -` / `error-triage`), and
 * bumps `byHook["ollama-bash-output-advisory"]` in the SAME
 * mcp-server/data/state/ollama-offload-stats.json the dashboard reads -- so the Bash
 * surface becomes visible. Suggest-only, exactly as ollama-route-pretooluse shipped
 * before its auto-mode was proven. Fails OPEN + never breaks the tool call (telemetry
 * write is best-effort). Not a duplicate: ollama-auto-router sees only prompt TEXT
 * (UserPromptSubmit), never tool output; ask-ollama's `| summarize -` is 100% manual.
 *
 * @hook PostToolUse:Bash (run via posttool-bash-read-bundle.mjs SUB_HOOKS)
 * @env  PRISM_OLLAMA_BASH_ADVISORY_DISABLE=1  -> skip entirely (advisory off)
 * @env  PRISM_OLLAMA_BASH_ADVISORY_MIN_BYTES  -> min output bytes to consider (default 4000)
 * @env  PRISM_OLLAMA_BASH_ADVISORY_VERBOSE=1  -> include the matched reason in the note
 */
import fs from "node:fs";
import path from "node:path";

const DEFAULT_STATS_REL = path.join("mcp-server", "data", "state", "ollama-offload-stats.json");
const HOOK_NAME = "ollama-bash-output-advisory";
// Default gist threshold: below this the raw output is cheap enough to keep verbatim.
const DEFAULT_MIN_BYTES = 4000;
// Hard ceiling on how much stdin we parse -- a 50MB build log must not OOM the hook.
const MAX_SCAN_BYTES = 512 * 1024;

/** Walk up to find the project root (the dir holding .claude/settings.json). */
function findProjectRoot(start = process.cwd()) {
  let cur = start;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(cur, ".claude", "settings.json"))) return cur;
    const p = path.dirname(cur);
    if (p === cur) break;
    cur = p;
  }
  return start;
}

/**
 * Classify a completed Bash command's (command, output) as a gist-only bulk dump
 * worth routing to a local model NEXT time, vs something Claude needs verbatim.
 *
 * gist-only (advise offload): build logs, test runs, dependency trees, git diff/log
 * bodies, long grep/find/ls dumps, docker/kubectl output -- Claude reads these for the
 * SHAPE (pass/fail, which files, roughly how many), rarely byte-exact.
 *
 * keep-verbatim (never advise): anything the caller likely needs exact -- a single
 * value read (cat of a small config), a computed number, a path, JSON a downstream
 * step parses. Small outputs are kept regardless (not worth a local round-trip).
 *
 * @returns {{gist:boolean, kind:string, reason:string}}
 */
export function classifyBashOutput(command, outputBytes, outputText) {
  const cmd = String(command || "").trim().toLowerCase();
  if (!cmd) return { gist: false, kind: "", reason: "no command" };

  // Commands whose output is a bulk gist-only dump. Anchored to the invoked verb so a
  // path merely CONTAINING "test" (e.g. `cat src/__tests__/foo.ts`) does not match.
  const GIST_VERB =
    /(^|[|&;]\s*)(rtk\s+)?(npm\s+run\s+build|npm\s+run\s+test|tsc|vitest|jest|playwright|pytest|cargo\s+(build|test|check|clippy)|go\s+test|next\s+build|eslint|prettier|docker\s+(build|logs)|kubectl\s+(logs|describe)|git\s+(diff|log|show|blame))\b/;
  // Long enumerations: grep/find/ls/tree/du dumps + git status of a big tree.
  const ENUM_VERB = /(^|[|&;]\s*)(rtk\s+)?(grep|rg|find|ls\b|tree|du\b|git\s+status)\b/;

  // Output SHAPE signals -- corroborate the verb so a `grep` that returned 2 lines is
  // kept (cheap) but a `grep` that returned 400 lines is advised.
  const lineCount = outputText ? (outputText.match(/\n/g) || []).length + 1 : 0;

  if (GIST_VERB.test(cmd)) {
    return { gist: true, kind: "build_test_log", reason: `build/test/diff output (${outputBytes}B)` };
  }
  if (ENUM_VERB.test(cmd) && lineCount >= 40) {
    return { gist: true, kind: "enumeration", reason: `long enumeration (${lineCount} lines, ${outputBytes}B)` };
  }
  // A generic large multi-line dump from any command (heuristic tail): >= threshold
  // bytes AND many lines AND not obviously a single value / JSON blob a step parses.
  if (outputBytes >= DEFAULT_MIN_BYTES * 3 && lineCount >= 60) {
    const looksStructured = /^\s*[[{]/.test(outputText || ""); // JSON/array -> likely parsed downstream
    if (!looksStructured) {
      return { gist: true, kind: "bulk_output", reason: `large multi-line output (${lineCount} lines, ${outputBytes}B)` };
    }
  }
  return { gist: false, kind: "other", reason: "not a gist-only bulk dump" };
}

/**
 * Best-effort RMW of the shared offload stats so the dashboard finally SEES the Bash
 * surface. Atomic via PID-temp + rename; a stats-write failure must NEVER break the
 * tool call (PostToolUse is post-hoc -- the command already ran). Mirrors the exact
 * byHook schema written by ollama-route-pretooluse.mjs so both feed one dashboard.
 */
export function updateOffloadStats({ decision, sizeKB }, statsPath) {
  try {
    const f = statsPath || path.join(findProjectRoot(), DEFAULT_STATS_REL);
    let stats;
    try {
      stats = JSON.parse(fs.readFileSync(f, "utf8"));
    } catch {
      return; // file absent/corrupt -- skip rather than create a parallel state
    }
    if (!stats.byHook || typeof stats.byHook !== "object") stats.byHook = {};
    if (!stats.byHook[HOOK_NAME]) {
      stats.byHook[HOOK_NAME] = { fired: 0, offloaded: 0, kept: 0, suggested: 0, tokensSaved: 0 };
    }
    const h = stats.byHook[HOOK_NAME];
    h.fired += 1;
    if (decision === "suggest") {
      h.suggested += 1;
      // Potential-savings estimate only (advisory -- the offload happens next turn if
      // Claude acts). 1KB ~= 250 tokens for log/text (conservative, matches the Read hook).
      h.tokensSaved += Math.max(0, Math.round((sizeKB || 0) * 250));
    } else {
      h.kept += 1;
    }
    stats.lastUpdated = new Date().toISOString();
    const tmp = `${f}.tmp.${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(stats, null, 2));
    fs.renameSync(tmp, f);
  } catch {
    /* stats-write failure must never surface -- PostToolUse cannot un-run the command */
  }
}

/** Build the suggest-only advisory note (or null when nothing to advise). */
export function buildAdvisory(command, outputBytes, outputText, { verbose = false } = {}) {
  const minBytes = (() => {
    const raw = process.env.PRISM_OLLAMA_BASH_ADVISORY_MIN_BYTES;
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_MIN_BYTES;
  })();
  if (!outputBytes || outputBytes < minBytes) {
    return { decision: "kept", note: null, sizeKB: outputBytes / 1024 };
  }
  const cls = classifyBashOutput(command, outputBytes, outputText);
  if (!cls.gist) return { decision: "kept", note: null, sizeKB: outputBytes / 1024 };

  const sizeKB = Math.round(outputBytes / 1024);
  const triage = cls.kind === "build_test_log" ? "error-triage" : "summarize";
  const reasonSuffix = verbose ? ` _(matched: ${cls.reason})_` : "";
  const note =
    `## \u{1F4B0} Ollama offload opportunity (Bash output ~${sizeKB}KB, gist-only)\n\n` +
    `That command produced a large **${cls.kind}** dump. When you need the SHAPE (pass/fail, ` +
    `which files, error class) rather than every byte, route it through the free local model ` +
    `instead of reading it raw:\n\n` +
    "```bash\n" +
    `<the command> 2>&1 | node scripts/ask-ollama.mjs ${triage} -\n` +
    "```\n\n" +
    `Runs on qwen2.5-coder:32b (~$0, offline) and returns just the summary. ` +
    `Reserve Claude for the reasoning, not the log-scroll.${reasonSuffix}\n\n` +
    `_Suggest-only. Disable: \`PRISM_OLLAMA_BASH_ADVISORY_DISABLE=1\`._`;
  return { decision: "suggest", note, sizeKB, kind: cls.kind };
}

/** Extract (command, output text) from a PostToolUse:Bash payload, defensively. */
export function extractBashIO(payload) {
  const ti = payload?.tool_input || payload?.toolInput || {};
  const tr = payload?.tool_response ?? payload?.toolResponse ?? payload?.tool_result ?? "";
  const command = ti.command || ti.cmd || "";
  let output = "";
  if (typeof tr === "string") output = tr;
  else if (tr && typeof tr === "object") {
    output = tr.stdout || tr.output || tr.content || tr.text || "";
    if (tr.stderr) output += (output ? "\n" : "") + tr.stderr;
    if (typeof output !== "string") output = "";
  }
  if (output.length > MAX_SCAN_BYTES) output = output.slice(0, MAX_SCAN_BYTES);
  return { command, output };
}

async function readStdin() {
  return new Promise((resolve) => {
    let d = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (d += c));
    process.stdin.on("end", () => resolve(d));
    process.stdin.on("error", () => resolve(""));
  });
}

function emit(obj) {
  try { process.stdout.write(JSON.stringify(obj)); } catch { /* */ }
}

async function main() {
  if (process.env.PRISM_OLLAMA_BASH_ADVISORY_DISABLE === "1") { emit({ continue: true }); return; }
  const raw = await readStdin();
  if (!raw || !raw.trim()) { emit({ continue: true }); return; }
  let payload;
  try { payload = JSON.parse(raw); } catch { emit({ continue: true }); return; }
  if (payload?.tool_name && payload.tool_name !== "Bash") { emit({ continue: true }); return; }

  const { command, output } = extractBashIO(payload);
  const bytes = Buffer.byteLength(output || "", "utf8");
  const verbose = process.env.PRISM_OLLAMA_BASH_ADVISORY_VERBOSE === "1";
  const { decision, note, sizeKB } = buildAdvisory(command, bytes, output, { verbose });

  updateOffloadStats({ decision, sizeKB });

  if (decision === "suggest" && note) {
    emit({ continue: true, hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: note } });
  } else {
    emit({ continue: true });
  }
}

// Only run when invoked as a hook (not when imported by the test).
if (process.argv[1] && process.argv[1].endsWith("ollama-bash-output-advisory.mjs")) {
  main().catch(() => { try { process.stdout.write(JSON.stringify({ continue: true })); } catch { /* */ } });
}
