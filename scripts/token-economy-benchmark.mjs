/**
 * token-economy-benchmark.mjs — INTEL-OLLAMA-OBSIDIAN-MS0/P7-U01.
 *
 * Synthetic 10-prompt session benchmark that measures the injection
 * token cost of every UserPromptSubmit hook in `.claude/settings.json`.
 * Categorises each hook (wiki / awareness / memory / directives /
 * coordination / router / other) and produces a per-category breakdown
 * suitable for TOKEN-ECONOMY-REPORT.md.
 *
 * Why: the milestone exit_condition wants ≥50% (target 80%) total
 * token savings vs. the pre-wiring baseline. Without a deterministic
 * measurement harness we can't tell whether the P3/P4 routers are
 * paying for themselves. This script IS that harness — re-run it
 * before/after any phase that adds or removes injectors and the diff
 * tells the story.
 *
 * Pure functions (exported for tests):
 *   - SYNTHETIC_PROMPTS           — the 10 reproducible prompts
 *   - HOOK_CATEGORY_RULES         — name-pattern → category map
 *   - approxTokenCount(s)         → chars/4 token estimate
 *   - categoriseHook(name)        → category label
 *   - parseHookEntries(settings)  → flat [{name, command}, ...]
 *   - aggregateMeasurements(rows) → { perCategory, perHook, summary }
 *   - renderMarkdown(agg, meta)   → string
 *
 * I/O layer (not exported) actually spawns each hook against each
 * prompt and writes TOKEN-ECONOMY-REPORT.md.
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P7-U01
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// SYNTHETIC PROMPT SET (reproducibility — never mutate; append only)
// ---------------------------------------------------------------------------

export const SYNTHETIC_PROMPTS = Object.freeze([
  "what's the canonical formula for cutting force in turning?",
  "add a new dispatcher action for tool wear prediction",
  "lets continue",
  "review my changes to the kienzle constants",
  "search for all engines that handle thermal expansion",
  "wire a new hook into the Stop event chain",
  "show me a quote-to-ship workflow for an Alcoa job",
  "build me an MCP action that exposes ToolLifeAdaptiveEngine.predict",
  "explain the difference between catastrophic and gradual tool wear",
  "ship the failing test in src/__tests__/StopGateChain.test.ts",
]);

// ---------------------------------------------------------------------------
// HOOK CATEGORISATION (regex-driven; matches hook basename)
// ---------------------------------------------------------------------------

export const HOOK_CATEGORY_RULES = Object.freeze([
  // Order matters — first match wins. Keep more-specific patterns
  // earlier so e.g. "cross-session-work-aware" → coordination, not
  // memory (which would match the `session` substring).
  { pattern: /wiki/i,                      category: "wiki" },
  { pattern: /awareness/i,                 category: "awareness" },
  { pattern: /coord|cross[-_ ]session|chat[-_ ]bus/i, category: "coordination" },
  { pattern: /memory|handoff|session/i,    category: "memory" },
  { pattern: /directive|claudemd/i,        category: "directives" },
  { pattern: /router|route|inject/i,       category: "router" },
  { pattern: /reminder|checkin|janitor/i,  category: "housekeeping" },
]);

export function categoriseHook(name) {
  if (typeof name !== "string" || name.length === 0) return "other";
  for (const rule of HOOK_CATEGORY_RULES) {
    if (rule.pattern.test(name)) return rule.category;
  }
  return "other";
}

/**
 * Approximate token count. Real tokenisers vary by model (BPE/tiktoken),
 * but for relative-measurement purposes the chars/4 heuristic is within
 * ~10% of GPT-4's tokeniser for English text and is deterministic and
 * dependency-free. The benchmark is comparative, not absolute, so this
 * is sufficient.
 */
export function approxTokenCount(s) {
  if (typeof s !== "string" || s.length === 0) return 0;
  // Trim trailing whitespace and round up — most tokenisers emit at
  // least one token per non-empty input.
  const trimmed = s.replace(/\s+$/g, "");
  if (trimmed.length === 0) return 0;
  return Math.ceil(trimmed.length / 4);
}

/**
 * Flatten a settings.json `hooks.UserPromptSubmit` array into
 * [{ name, command }, ...] entries. The "name" is the hook script
 * basename (suitable for categorisation); "command" is the verbatim
 * exec string we'll spawn through the shell.
 */
export function parseHookEntries(settingsObj) {
  if (!settingsObj || typeof settingsObj !== "object") return [];
  const ups = settingsObj.hooks && settingsObj.hooks.UserPromptSubmit;
  if (!Array.isArray(ups)) return [];
  const out = [];
  for (const matcher of ups) {
    if (!matcher || typeof matcher !== "object") continue;
    const hooks = Array.isArray(matcher.hooks) ? matcher.hooks : [];
    for (const h of hooks) {
      if (!h || typeof h !== "object") continue;
      if (typeof h.command !== "string" || h.command.length === 0) continue;
      // Extract the script basename for categorisation. Strip args, then
      // take the last path segment.
      const firstToken = h.command.split(/\s+/).find((t) => /\.(mjs|js|ts|sh|py)$/.test(t)) ?? h.command;
      const name = path.basename(firstToken).replace(/['"]/g, "");
      out.push({ name, command: h.command });
    }
  }
  return out;
}

/**
 * Aggregate per-prompt × per-hook measurement rows into the report shape.
 *
 * Input row: { prompt, hookName, tokens, durationMs, ok }
 * Output:
 *   - summary: { promptCount, hookCount, totalTokens, meanTokensPerPrompt, errors }
 *   - perCategory: { [cat]: { tokens, share, hookCount, errors } }  (share = fraction of totalTokens)
 *   - perHook:     [{ name, category, tokens, errors, meanPerPrompt }]  (sorted desc by tokens)
 */
export function aggregateMeasurements(rows) {
  const safe = Array.isArray(rows) ? rows.filter((r) => r && typeof r === "object") : [];
  const promptSet = new Set();
  const hookMap = new Map(); // name -> { tokens, errors, samples }
  let totalTokens = 0;
  let errors = 0;
  for (const r of safe) {
    if (typeof r.prompt === "string") promptSet.add(r.prompt);
    if (typeof r.hookName !== "string") continue;
    if (!hookMap.has(r.hookName)) hookMap.set(r.hookName, { tokens: 0, errors: 0, samples: 0 });
    const slot = hookMap.get(r.hookName);
    if (r.ok === false) {
      slot.errors += 1;
      errors += 1;
      continue;
    }
    const tk = typeof r.tokens === "number" && Number.isFinite(r.tokens) ? r.tokens : 0;
    slot.tokens += tk;
    slot.samples += 1;
    totalTokens += tk;
  }
  const perCategory = {};
  const perHook = [];
  for (const [name, slot] of hookMap.entries()) {
    const cat = categoriseHook(name);
    if (!perCategory[cat]) perCategory[cat] = { tokens: 0, share: 0, hookCount: 0, errors: 0 };
    perCategory[cat].tokens += slot.tokens;
    perCategory[cat].hookCount += 1;
    perCategory[cat].errors += slot.errors;
    perHook.push({
      name,
      category: cat,
      tokens: slot.tokens,
      errors: slot.errors,
      meanPerPrompt: slot.samples > 0 ? Math.round(slot.tokens / slot.samples) : 0,
    });
  }
  for (const cat of Object.keys(perCategory)) {
    perCategory[cat].share = totalTokens > 0 ? perCategory[cat].tokens / totalTokens : 0;
  }
  perHook.sort((a, b) => b.tokens - a.tokens);
  const promptCount = promptSet.size;
  return {
    summary: {
      promptCount,
      hookCount: hookMap.size,
      totalTokens,
      meanTokensPerPrompt: promptCount > 0 ? Math.round(totalTokens / promptCount) : 0,
      errors,
    },
    perCategory,
    perHook,
  };
}

/**
 * Render the aggregation as Markdown for TOKEN-ECONOMY-REPORT.md.
 * Includes a "How to interpret" footer so future-you doesn't have to
 * reverse-engineer the methodology from the numbers alone.
 */
export function renderMarkdown(agg, meta) {
  if (!agg || typeof agg !== "object") return "# TOKEN-ECONOMY-REPORT\n\n_(no data)_\n";
  const m = meta || {};
  const lines = [];
  lines.push("# TOKEN-ECONOMY-REPORT — Intel-Ollama-Obsidian P7-U01");
  lines.push("");
  lines.push(`Generated: ${m.generatedAt ?? new Date().toISOString()}`);
  if (m.gitSha) lines.push(`Git SHA: \`${m.gitSha}\``);
  if (m.settingsPath) lines.push(`Settings source: \`${m.settingsPath}\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Synthetic prompts run:** ${agg.summary.promptCount}`);
  lines.push(`- **UserPromptSubmit hooks measured:** ${agg.summary.hookCount}`);
  lines.push(`- **Total injected tokens (all prompts × all hooks):** ${agg.summary.totalTokens.toLocaleString()}`);
  lines.push(`- **Mean injected tokens per prompt:** ${agg.summary.meanTokensPerPrompt.toLocaleString()}`);
  lines.push(`- **Hook errors observed:** ${agg.summary.errors}`);
  lines.push("");
  lines.push("## Per-Category Breakdown");
  lines.push("");
  lines.push("| Category | Tokens | Share | Hooks | Errors |");
  lines.push("|---|---:|---:|---:|---:|");
  const cats = Object.keys(agg.perCategory).sort((a, b) => agg.perCategory[b].tokens - agg.perCategory[a].tokens);
  for (const c of cats) {
    const row = agg.perCategory[c];
    lines.push(`| ${c} | ${row.tokens.toLocaleString()} | ${(row.share * 100).toFixed(1)}% | ${row.hookCount} | ${row.errors} |`);
  }
  lines.push("");
  lines.push("## Per-Hook Hot-Spots (top 15)");
  lines.push("");
  lines.push("| Hook | Category | Tokens | Mean/Prompt | Errors |");
  lines.push("|---|---|---:|---:|---:|");
  for (const h of agg.perHook.slice(0, 15)) {
    lines.push(`| \`${h.name}\` | ${h.category} | ${h.tokens.toLocaleString()} | ${h.meanPerPrompt.toLocaleString()} | ${h.errors} |`);
  }
  lines.push("");
  lines.push("## How to interpret");
  lines.push("");
  lines.push("- Token counts are the chars/4 approximation (within ~10% of GPT-4's BPE for English). The benchmark is comparative, not absolute.");
  lines.push("- Each row is the cost of running ONE UserPromptSubmit hook against ONE synthetic prompt — the per-prompt total is the sum across all hooks.");
  lines.push("- The synthetic prompt set is frozen (`SYNTHETIC_PROMPTS` in the script) so reruns are diff-able. Don't mutate it; append only.");
  lines.push("- Pre-wiring baseline = run this script with the offload-stats reset (P0-U03 reset point: 2026-05-01). Post-wiring measurement = run again after P3/P4 land.");
  lines.push("- Total savings target per the milestone exit_condition: ≥50% (floor) / 80% (target).");
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// I/O LAYER (script execution + file writes — not exported for tests)
// ---------------------------------------------------------------------------

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT_DEFAULT = path.resolve(HERE, "..");
const DEFAULT_SETTINGS = path.resolve(REPO_ROOT_DEFAULT, ".claude/settings.json");
const DEFAULT_OUT = path.resolve(REPO_ROOT_DEFAULT, "TOKEN-ECONOMY-REPORT.md");
const HOOK_TIMEOUT_MS = 10_000;

function runHookOnce(command, prompt) {
  return new Promise((resolve) => {
    const start = Date.now();
    let killed = false;
    let stdout = "";
    let stderr = "";
    const child = spawn(command, { shell: true });
    const timer = setTimeout(() => {
      killed = true;
      try { child.kill(); } catch {}
    }, HOOK_TIMEOUT_MS);
    child.stdout.on("data", (d) => { stdout += d.toString("utf8"); });
    child.stderr.on("data", (d) => { stderr += d.toString("utf8"); });
    child.on("error", () => {
      clearTimeout(timer);
      resolve({ ok: false, tokens: 0, durationMs: Date.now() - start, error: "spawn-failed" });
    });
    child.on("exit", () => {
      clearTimeout(timer);
      // Hooks emit either plain stdout text (added to context) or a
      // hookSpecificOutput.additionalContext JSON envelope. Try both.
      let injected = "";
      const m = stdout.match(/\{[\s\S]*"hookSpecificOutput"[\s\S]*\}/);
      if (m) {
        try {
          const env = JSON.parse(m[0]);
          if (env && env.hookSpecificOutput && typeof env.hookSpecificOutput.additionalContext === "string") {
            injected = env.hookSpecificOutput.additionalContext;
          } else {
            injected = stdout;
          }
        } catch {
          injected = stdout;
        }
      } else {
        injected = stdout;
      }
      resolve({
        ok: !killed,
        tokens: approxTokenCount(injected),
        durationMs: Date.now() - start,
        error: killed ? "timeout" : (stderr.length > 0 ? stderr.slice(0, 80) : undefined),
      });
    });
    try {
      child.stdin.write(JSON.stringify({ prompt, session_id: "p7u01-bench" }));
      child.stdin.end();
    } catch {}
  });
}

async function main() {
  const args = process.argv.slice(2);
  const wantJson = args.includes("--json");
  const settingsArg = args.find((a) => a.startsWith("--settings="));
  const outArg = args.find((a) => a.startsWith("--out="));
  const promptLimitArg = args.find((a) => a.startsWith("--prompts="));
  const settingsPath = settingsArg ? settingsArg.slice("--settings=".length) : DEFAULT_SETTINGS;
  const outPath = outArg ? outArg.slice("--out=".length) : DEFAULT_OUT;
  const promptLimit = promptLimitArg ? Number.parseInt(promptLimitArg.slice("--prompts=".length), 10) : SYNTHETIC_PROMPTS.length;

  const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  const entries = parseHookEntries(settings);
  const prompts = SYNTHETIC_PROMPTS.slice(0, Math.min(promptLimit, SYNTHETIC_PROMPTS.length));

  process.stderr.write(`bench: ${entries.length} hooks × ${prompts.length} prompts = ${entries.length * prompts.length} measurements\n`);
  const rows = [];
  for (const prompt of prompts) {
    for (const e of entries) {
      const m = await runHookOnce(e.command, prompt);
      rows.push({ prompt, hookName: e.name, tokens: m.tokens, durationMs: m.durationMs, ok: m.ok });
    }
  }
  const agg = aggregateMeasurements(rows);

  if (wantJson) {
    process.stdout.write(JSON.stringify({ agg, meta: { generatedAt: new Date().toISOString(), settingsPath } }, null, 2));
    return 0;
  }
  const md = renderMarkdown(agg, { generatedAt: new Date().toISOString(), settingsPath });
  fs.writeFileSync(outPath, md, "utf8");
  process.stdout.write(`wrote ${outPath} — ${agg.summary.totalTokens.toLocaleString()} total injected tokens across ${agg.summary.hookCount} hooks × ${agg.summary.promptCount} prompts (mean ${agg.summary.meanTokensPerPrompt.toLocaleString()}/prompt)\n`);
  return 0;
}

const _isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (_isMain) {
  main().catch((e) => { console.error(e); process.exit(2); });
}
