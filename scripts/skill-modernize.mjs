/**
 * skill-modernize.mjs — INTEL-OLLAMA-OBSIDIAN-MS0/P11-U01
 *
 * Add YAML policy frontmatter to skill .md files that lack it. Idempotent:
 * files with existing frontmatter (parsed correctly) are left alone unless
 * --force is passed.
 *
 * Why: Claude Code's auto-invoke layer reads `policy.tier` and
 * `policy.triggers` from file-level YAML frontmatter (between leading `---`
 * fences) — NOT from prose `policy:` blocks inside the body. Many older
 * skills only have prose blocks; this tool migrates them.
 *
 * Pure functions exported for tests:
 *   - parseExistingFrontmatter(content) → { hasFrontmatter, parsed?, body }
 *   - deriveTriggers(skillName, body)   → string[] (keyword/event triggers)
 *   - deriveTier(skillName, body)       → 1|2|3
 *   - renderFrontmatter(policy)         → string (YAML between --- fences)
 *   - modernizeSkill(content, name)     → { changed, content, reason }
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

// Tier policy:
//   1 — high-frequency, trigger on bare keywords + UserPromptSubmit
//   2 — moderate-frequency, trigger on explicit keyword phrases
//   3 — niche / opt-in, only triggered by explicit /command invocation
const TIER_HEURISTICS = {
  // tier-1 keywords surfaced often in normal conversation
  tier1: ["audit", "review", "memory", "search", "validate", "learn", "context", "optimize", "remember", "recall"],
  // tier-2 keywords that signal a specific specialised flow
  tier2: ["scrutinize", "dedup", "handoff", "forge", "harden", "ingest", "modernize", "consolidate"],
  // anything not matched → tier-3
};

const STANDARD_FRONTMATTER_RE = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/;

// ---------------------------------------------------------------------------
// PURE LOGIC
// ---------------------------------------------------------------------------

/**
 * Parse an existing YAML frontmatter block if present. Returns the raw YAML
 * + the body, or { hasFrontmatter: false, body: content } if the file
 * doesn't open with a `---` fence.
 *
 * We don't parse YAML deeply — just detect presence and extract for
 * comparison. The renderFrontmatter step always produces a canonical block.
 */
export function parseExistingFrontmatter(content) {
  if (typeof content !== "string" || content.length === 0) {
    return { hasFrontmatter: false, body: content || "" };
  }
  const m = content.match(STANDARD_FRONTMATTER_RE);
  if (!m) return { hasFrontmatter: false, body: content };
  return {
    hasFrontmatter: true,
    yamlRaw: m[1],
    body: content.slice(m[0].length),
  };
}

/**
 * Derive trigger keywords for the auto-invoke layer.
 * Strategy:
 *   1. Always include the skill name (without the leading slash) as the
 *      most reliable explicit trigger.
 *   2. Look for a "## Trigger policy" or "## Args" section in the body and
 *      extract any quoted strings as candidate keyword triggers.
 *   3. De-dup, lowercase, trim.
 */
export function deriveTriggers(skillName, body) {
  const out = new Set();
  if (typeof skillName === "string" && skillName.length > 0) {
    out.add(skillName.replace(/^\/?/, "").toLowerCase());
  }
  if (typeof body === "string" && body.length > 0) {
    // Pull quoted strings from any "trigger" or "keyword" section
    const triggerSection = body.match(/##\s+Trigger[\s\S]*?(?=\n##\s|\n*$)/i);
    if (triggerSection) {
      const quotedRe = /["'`]([a-z][a-z0-9 -]{2,40}?)["'`]/gi;
      let m;
      while ((m = quotedRe.exec(triggerSection[0])) !== null) {
        out.add(m[1].toLowerCase().trim());
      }
    }
    // Also pull `## Usage` shape: lines like `/skill <something>` give us "skill"
    const usageMatches = body.match(/##\s+Usage[\s\S]*?\n```[\s\S]*?\n```/i);
    if (usageMatches) {
      const slashRe = /\/([a-z][a-z0-9-]{2,40})/g;
      let m;
      while ((m = slashRe.exec(usageMatches[0])) !== null) {
        out.add(m[1].toLowerCase());
      }
    }
  }
  return [...out].slice(0, 8); // cap at 8 to keep frontmatter readable
}

/**
 * Decide the tier for a given skill.
 */
export function deriveTier(skillName, body) {
  const name = (skillName || "").replace(/^\/?/, "").toLowerCase();
  for (const kw of TIER_HEURISTICS.tier1) {
    if (name.includes(kw)) return 1;
  }
  for (const kw of TIER_HEURISTICS.tier2) {
    if (name.includes(kw)) return 2;
  }
  // body-based override: if the body declares "tier:" explicitly use that
  if (typeof body === "string") {
    const m = body.match(/\btier\s*[:=]\s*([123])\b/i);
    if (m) return Number(m[1]);
  }
  return 3;
}

/**
 * Render a canonical YAML frontmatter block (between --- fences, with
 * trailing newline so the body that follows starts cleanly).
 */
export function renderFrontmatter(policy) {
  const tier = Number(policy?.tier);
  const triggers = Array.isArray(policy?.triggers) ? policy.triggers : [];
  const lines = ["---", "policy:", `  tier: ${[1, 2, 3].includes(tier) ? tier : 3}`];
  if (triggers.length > 0) {
    lines.push("  triggers:");
    for (const t of triggers) {
      const escaped = String(t).replace(/"/g, '\\"');
      lines.push(`    - "${escaped}"`);
    }
  } else {
    lines.push("  triggers: []");
  }
  lines.push("---", "");
  return lines.join("\n");
}

/**
 * Top-level: given a skill file's content + filename, return either the
 * unchanged content (already has frontmatter) or new content with YAML
 * frontmatter prepended.
 */
export function modernizeSkill(content, skillName, opts = {}) {
  const parsed = parseExistingFrontmatter(content);
  if (parsed.hasFrontmatter && !opts.force) {
    return { changed: false, content, reason: "already has frontmatter" };
  }
  const tier = deriveTier(skillName, parsed.body);
  const triggers = deriveTriggers(skillName, parsed.body);
  const fm = renderFrontmatter({ tier, triggers });
  const body = parsed.hasFrontmatter ? parsed.body : content;
  return {
    changed: true,
    content: fm + body,
    reason: `tier ${tier}, ${triggers.length} triggers`,
    derivedTier: tier,
    derivedTriggers: triggers,
  };
}

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

function listSkillFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((n) => n.endsWith(".md"))
    .map((n) => path.join(dir, n));
}

async function main() {
  const args = process.argv.slice(2);
  const wantWrite = args.includes("--write");
  const force = args.includes("--force");
  const dirArg = args.find((a) => a.startsWith("--dir="));
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const dir = dirArg ? dirArg.slice("--dir=".length) : path.join(repoRoot, ".claude", "commands");
  const files = listSkillFiles(dir);

  const report = [];
  for (const f of files) {
    const content = fs.readFileSync(f, "utf8");
    const name = path.basename(f, ".md");
    const r = modernizeSkill(content, name, { force });
    report.push({ file: f, name, ...r });
    if (wantWrite && r.changed) {
      fs.writeFileSync(f, r.content, "utf8");
    }
  }

  const changed = report.filter((r) => r.changed).length;
  process.stdout.write(`Skill modernize: ${files.length} files, ${changed} ${wantWrite ? "modernized" : "would-modernize"}\n`);
  for (const r of report) {
    process.stdout.write(`  ${r.changed ? "+" : "·"} ${r.name}: ${r.reason}\n`);
  }
}

const _isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (_isMain) {
  main().catch((e) => { console.error(e); process.exit(2); });
}
