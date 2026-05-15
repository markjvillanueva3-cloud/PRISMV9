#!/usr/bin/env node
/**
 * add-ollama-skill-policy-frontmatter.mjs — INTEL-OLLAMA-OBSIDIAN-MS0/P11-U06
 *
 * Adds two missing fields to the policy: block of all 9 `ollama-*` skills:
 *
 *   policy:
 *     tier: <existing>
 *     triggers: <existing + enriched English phrases>
 *     token_cost_estimate: <int tokens, <500 per fire>     ← NEW
 *     cost_model: "ollama-local"                            ← NEW
 *     description: "<one-liner>"                            ← NEW
 *
 * Why each new field:
 *   - token_cost_estimate: P11-U06 exit #3 — "Token cost noted in frontmatter
 *     (each skill <500 tok per fire)". Documents the SKILL-FIRE cost (the
 *     metadata-injection overhead Claude pays per UserPromptSubmit auto-trigger),
 *     NOT the underlying Ollama call (which costs 0 Claude tokens by design).
 *   - cost_model: lets a future cost-routing engine distinguish "skill offloads
 *     to local Ollama" from "skill consumes Claude tokens" without inferring
 *     from the name.
 *   - description: consumed by skill-auto-trigger.mjs's ranking — a richer
 *     descriptor lifts auto-invoke confidence on paraphrased prompts (P11-U06
 *     exit #2 — "typing 'summarize this' surfaces /ollama-summarize").
 *
 * Idempotent: re-running this script is a no-op if all 3 fields + enriched
 * triggers are already present. Uses YAML-aware in-place rewriting that
 * preserves existing tier + the original first-token trigger (the skill name).
 *
 * Skill source-of-truth scope: USER scope at
 * `<USERPROFILE>/.claude/commands/ollama-*.md` — that's where the 9 skills
 * actually live (verified by glob 2026-05-15). Project scope only carries
 * `ollama-architecture-plan.md` (different skill, untouched).
 *
 * Usage:
 *   node scripts/add-ollama-skill-policy-frontmatter.mjs           # apply
 *   node scripts/add-ollama-skill-policy-frontmatter.mjs --dry-run # show diff
 *   node scripts/add-ollama-skill-policy-frontmatter.mjs --json    # JSON report
 *
 * Exit codes:
 *   0 = success (or no-op when already up to date)
 *   1 = at least one skill failed to update (mid-flight error)
 *   2 = pre-flight failure (commands dir missing, etc.)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const JSON_ONLY = args.has("--json");

// Per-skill enrichment plan. Each entry's `triggers` is APPENDED to the
// existing list (de-duped); never replaces. Token costs are conservative
// upper bounds for the skill-fire (metadata injection); the actual Ollama
// call costs zero Claude tokens.
const PLAN = {
  "ollama-summarize.md": {
    description: "Local Ollama content summarization — zero Claude tokens for digest/tl;dr",
    token_cost_estimate: 90,
    extra_triggers: ["summarize", "summarize this", "tl;dr", "short version", "condense", "give me the gist"],
  },
  "ollama-classify.md": {
    description: "Local Ollama task/file/error classification — zero Claude tokens",
    token_cost_estimate: 80,
    extra_triggers: ["classify", "categorize", "what kind of", "what type of file", "classify this error"],
  },
  "ollama-explain.md": {
    description: "Local Ollama code explanation — walk me through this function",
    token_cost_estimate: 110,
    extra_triggers: ["explain", "explain this", "explain this code", "what does this do", "walk me through"],
  },
  "ollama-docstring.md": {
    description: "Local Ollama JSDoc/docstring generation for functions and classes",
    token_cost_estimate: 100,
    extra_triggers: ["add docstring", "add jsdoc", "document this function", "write docstring", "generate jsdoc"],
  },
  "ollama-extract.md": {
    description: "Local Ollama field/value extraction from unstructured text",
    token_cost_estimate: 90,
    extra_triggers: ["extract", "pull out", "get me the", "extract from", "find the fields"],
  },
  "ollama-test-stub.md": {
    description: "Local Ollama test scaffold generation — vitest/jest boilerplate",
    token_cost_estimate: 110,
    extra_triggers: ["test stub", "scaffold test", "test boilerplate", "create test for"],
  },
  "ollama-error-triage.md": {
    description: "Local Ollama error message triage — explain stack traces and exception classes",
    token_cost_estimate: 120,
    extra_triggers: ["triage error", "debug error", "diagnose error", "what does this error mean", "explain stack trace"],
  },
  "ollama-diff-summary.md": {
    description: "Local Ollama git diff summarization — explain changes in plain English",
    token_cost_estimate: 100,
    extra_triggers: ["diff summary", "summarize diff", "what changed", "explain this diff", "summarize commit"],
  },
  "ollama-boilerplate.md": {
    description: "Local Ollama scaffold/skeleton generation — engines, tests, schemas, hooks, skills",
    token_cost_estimate: 130,
    extra_triggers: ["boilerplate", "scaffold", "generate skeleton", "create stub", "starter template"],
  },
};

const COMMANDS_DIR = join(homedir(), ".claude", "commands");

/**
 * Parse a markdown file with YAML frontmatter and return:
 *   { hasFrontmatter, frontmatterRaw, bodyRaw }
 *
 * Frontmatter is the block between two `---` lines at the top of the file.
 * If absent, hasFrontmatter is false and frontmatterRaw is null.
 */
export function splitFrontmatter(content) {
  const lines = content.split(/\r?\n/);
  if (lines[0] !== "---") return { hasFrontmatter: false, frontmatterRaw: null, bodyRaw: content };
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") { endIdx = i; break; }
  }
  if (endIdx === -1) return { hasFrontmatter: false, frontmatterRaw: null, bodyRaw: content };
  return {
    hasFrontmatter: true,
    frontmatterRaw: lines.slice(1, endIdx).join("\n"),
    bodyRaw: lines.slice(endIdx + 1).join("\n"),
  };
}

/**
 * Minimal YAML-aware merge tailored to the `policy:` block this script owns.
 *
 * Reads existing frontmatter, preserves keys it doesn't touch, adds:
 *   - description (overwrite — script owns the canonical phrasing)
 *   - token_cost_estimate (overwrite — script owns the canonical estimate)
 *   - cost_model: "ollama-local" (overwrite — invariant for all 9 skills)
 *   - triggers (UNION with existing, preserving original order first)
 *
 * Returns the new frontmatter as a string (no leading/trailing `---`).
 */
export function applyPolicyFields(frontmatterRaw, plan) {
  const lines = frontmatterRaw.split("\n");
  const out = [];
  let inPolicy = false;
  let inTriggers = false;
  let existingTriggers = [];
  let policyIndent = "  ";
  let triggerIndent = "    - ";
  let policyKeysSeen = new Set();
  let triggersWritten = false;

  // First pass: find the policy block + existing triggers.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^policy\s*:\s*$/.test(line)) { inPolicy = true; continue; }
    if (inPolicy) {
      // exit policy: when we hit a non-indented line that's not blank
      if (/^\S/.test(line) && line.trim() !== "") { inPolicy = false; continue; }
      if (/^\s+triggers\s*:\s*$/.test(line)) { inTriggers = true; continue; }
      if (inTriggers) {
        const m = line.match(/^(\s+-\s*)"?([^"]+?)"?\s*$/);
        if (m) {
          triggerIndent = m[1];
          existingTriggers.push(m[2]);
          continue;
        }
        // any other indented or non-indented line ends the trigger list
        inTriggers = false;
      }
    }
  }

  // Build the merged trigger list (UNION; preserve existing order).
  const trigSet = new Set(existingTriggers);
  for (const t of plan.extra_triggers) trigSet.add(t);
  const merged = [...trigSet];

  // Second pass: rewrite. We re-emit the policy: block whole; preserve
  // every other key verbatim.
  inPolicy = false;
  inTriggers = false;
  let policyEmitted = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^policy\s*:\s*$/.test(line) && !policyEmitted) {
      // Emit canonical policy block.
      out.push("policy:");
      // Preserve existing `tier:` value if present.
      let tierVal = null;
      for (let j = i + 1; j < lines.length; j++) {
        const ln = lines[j];
        if (/^\S/.test(ln) && ln.trim() !== "") break;
        const tm = ln.match(/^\s+tier\s*:\s*(\d+)\s*$/);
        if (tm) { tierVal = tm[1]; break; }
      }
      if (tierVal !== null) out.push(`  tier: ${tierVal}`);
      out.push(`  triggers:`);
      for (const t of merged) out.push(`    - "${t}"`);
      out.push(`  token_cost_estimate: ${plan.token_cost_estimate}`);
      out.push(`  cost_model: "ollama-local"`);
      out.push(`  description: "${plan.description.replace(/"/g, '\\"')}"`);
      policyEmitted = true;
      inPolicy = true;
      continue;
    }
    if (inPolicy) {
      // Skip lines that belong to the existing policy block; we've already
      // emitted the new one.
      if (/^\S/.test(line) && line.trim() !== "") { inPolicy = false; out.push(line); continue; }
      continue;
    }
    out.push(line);
  }

  // Edge case: file had no policy: block at all.
  if (!policyEmitted) {
    out.push("policy:");
    out.push("  tier: 2");
    out.push(`  triggers:`);
    for (const t of merged) out.push(`    - "${t}"`);
    out.push(`  token_cost_estimate: ${plan.token_cost_estimate}`);
    out.push(`  cost_model: "ollama-local"`);
    out.push(`  description: "${plan.description.replace(/"/g, '\\"')}"`);
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

/**
 * Check if a frontmatter block already has all required fields. Returns
 * true only when token_cost_estimate, cost_model, description AND every
 * extra_triggers entry are present. Used by the script to skip writes
 * (idempotent), and exported for tests.
 */
export function isAlreadyComplete(frontmatterRaw, plan) {
  const hasTokenCost = /token_cost_estimate\s*:\s*\d+/.test(frontmatterRaw);
  const hasCostModel = /cost_model\s*:\s*"?ollama-local"?/.test(frontmatterRaw);
  const hasDescription = /description\s*:\s*"/.test(frontmatterRaw);
  if (!hasTokenCost || !hasCostModel || !hasDescription) return false;
  for (const t of plan.extra_triggers) {
    if (!frontmatterRaw.includes(`"${t}"`)) return false;
  }
  return true;
}

function main() {
  if (!existsSync(COMMANDS_DIR)) {
    if (JSON_ONLY) process.stdout.write(JSON.stringify({ ok: false, error: "commands-dir-missing", dir: COMMANDS_DIR }) + "\n");
    else process.stdout.write(`ERROR: commands dir missing: ${COMMANDS_DIR}\n`);
    process.exit(2);
  }

  const results = [];
  let anyFailed = false;

  for (const [filename, plan] of Object.entries(PLAN)) {
    const path = join(COMMANDS_DIR, filename);
    if (!existsSync(path)) {
      results.push({ filename, ok: false, error: "missing", path });
      anyFailed = true;
      continue;
    }
    try {
      const content = readFileSync(path, "utf8");
      const { hasFrontmatter, frontmatterRaw, bodyRaw } = splitFrontmatter(content);
      if (!hasFrontmatter) {
        results.push({ filename, ok: false, error: "no-frontmatter", path });
        anyFailed = true;
        continue;
      }
      if (isAlreadyComplete(frontmatterRaw, plan)) {
        results.push({ filename, ok: true, action: "skipped", reason: "already-complete" });
        continue;
      }
      const newFm = applyPolicyFields(frontmatterRaw, plan);
      const newContent = `---\n${newFm}\n---\n${bodyRaw}`;
      if (DRY_RUN) {
        results.push({ filename, ok: true, action: "would-write", bytesBefore: content.length, bytesAfter: newContent.length });
      } else {
        writeFileSync(path, newContent);
        results.push({ filename, ok: true, action: "wrote", bytesBefore: content.length, bytesAfter: newContent.length });
      }
    } catch (err) {
      results.push({ filename, ok: false, error: String(err.message ?? err) });
      anyFailed = true;
    }
  }

  if (JSON_ONLY) {
    process.stdout.write(JSON.stringify({ ok: !anyFailed, dryRun: DRY_RUN, results }, null, 2) + "\n");
  } else {
    process.stdout.write(`\nadd-ollama-skill-policy-frontmatter (${DRY_RUN ? "DRY-RUN" : "APPLY"})\n`);
    process.stdout.write(`  commands dir: ${COMMANDS_DIR}\n\n`);
    for (const r of results) {
      const tag = r.ok ? "✓" : "✗";
      if (r.action === "skipped") process.stdout.write(`  ${tag} ${r.filename}  (${r.reason})\n`);
      else if (r.action === "wrote") process.stdout.write(`  ${tag} ${r.filename}  wrote (${r.bytesBefore} → ${r.bytesAfter} bytes)\n`);
      else if (r.action === "would-write") process.stdout.write(`  ${tag} ${r.filename}  would-write (${r.bytesBefore} → ${r.bytesAfter} bytes)\n`);
      else process.stdout.write(`  ${tag} ${r.filename}  FAILED: ${r.error}\n`);
    }
    process.stdout.write(`\n  total: ${results.length} skill(s), failed: ${results.filter((r) => !r.ok).length}\n\n`);
  }

  process.exit(anyFailed ? 1 : 0);
}

const isMain = import.meta.url.startsWith("file:") && process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (isMain) main();
