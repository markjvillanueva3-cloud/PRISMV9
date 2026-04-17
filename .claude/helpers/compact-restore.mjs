import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { z } from "zod";

// CPP-MS4-U-CPP32: Zod schema at the SESSION_ARTIFACTS.json read boundary.
// Mirrors the canonical schema in mcp-server/src/schemas/hookStateSchemas.ts
// (SessionArtifactsSchema). Kept inline+minimal because this helper is a
// .mjs and doesn't transpile through the TypeScript build. Drift between
// the two is caught by the hookStateSchemas.test.ts suite plus the
// compact-restore integration test.
const SessionArtifactsZ = z
  .object({
    schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    event: z.enum(["seed", "post_compact", "session_end", "manual"]),
    timestamp: z.string(),
    recent_additions: z
      .object({
        new_engines: z.array(z.string()).optional(),
        new_hooks: z.array(z.string()).optional(),
        new_skills: z.array(z.string()).optional(),
        new_dispatchers: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

// CPP-MS3-U-CPP23: Per-terminal compaction survival reader.
// Writers produce `.compaction-survival-<instance>.md` files; this reader
// globs them from SURVIVAL_DIR and picks the freshest one for THIS session,
// falling back to the legacy single `.compaction-survival.md` for
// one-session backward compat.
const SURVIVAL_FILE = "H:\\prism\\.claude\\helpers\\.compaction-survival.md"; // legacy
const SURVIVAL_DIR = "H:\\prism\\.claude\\helpers";
const SURVIVAL_PER_INSTANCE_PREFIX = ".compaction-survival-";
const SURVIVAL_PER_INSTANCE_SUFFIX = ".md";
const HANDOFFS_DIR = "H:\\prism\\state\\shared\\handoffs";
const SESSION_IDS_FILE = path.join(HANDOFFS_DIR, ".current-session-ids.json");
const POSITION_FILE = "H:\\prism\\state\\CURRENT_POSITION.md";
const PRISM_ROOT = "H:\\prism";

// CPP-MS4-U-CPP33: Directive freshness gate. These 10 shared directives are
// referenced from CLAUDE.md and the self-awareness injection path; if any go
// stale (>7 days unmodified), we emit a visible warning in the boot block so
// the agent can choose to refresh them rather than silently loading outdated
// guidance. Threshold is conservative — most directives are revised weekly.
const DIRECTIVE_DIR = "H:\\prism\\state\\shared";
const TRACKED_DIRECTIVES = [
  "CLAUDE-CODEX-MCP-DIRECTIVE.md",
  "CLAUDE-CODEX-SVI-DIRECTIVE.md",
  "CLAUDE-CODEX-COMMAND-BRIDGE.md",
  "CLAUDE-CODEX-SEARCH-TOKEN-DIRECTIVE.md",
  "CLAUDE-CODEX-COORDINATION-DIRECTIVE.md",
  "CLAUDE-CODEX-ROADMAP-EXECUTION-DIRECTIVE.md",
  "CLAUDE-CODEX-SPAWNED-AGENT-DIRECTIVE.md",
  "CLAUDE-CODEX-TASK-QUEUE-DIRECTIVE.md",
  "CLAUDE-CODEX-COMMAND-AWARENESS-DIRECTIVE.md",
  "PRISM-SELF-AWARENESS-DIRECTIVE.md",
];
const DIRECTIVE_STALE_DAYS = 7;

// Known placeholder RESUME strings that need fallback generation
const PLACEHOLDER_RESUMES = [
  "compacting — read per-agent handoff on restore",
  "check git log and roadmap for next steps.",
  "true",
  "unknown",
  "",
];

function isPlaceholderResume(resume) {
  if (!resume || resume.trim().length < 15) return true;
  return PLACEHOLDER_RESUMES.includes(resume.toLowerCase().trim());
}

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: PRISM_ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  return result.status === 0 ? (result.stdout ?? "").trim() : "";
}

/**
 * Generate a meaningful fallback RESUME when the stored one is a placeholder.
 */
async function generateFallbackResume() {
  const parts = [];

  // Read CURRENT_POSITION.md for phase info
  try {
    const position = await fs.readFile(POSITION_FILE, "utf8");
    const phaseMatch = position.match(/\*\*Phase:\*\*\s*(.+)/);
    if (phaseMatch?.[1]) {
      parts.push(`Phase: ${phaseMatch[1].trim()}`);
    }
    // Find in-progress milestones
    const lines = position.split(/\r?\n/);
    const inProgress = [];
    for (const line of lines) {
      if (line.includes("in progress") || line.includes("in_progress")) {
        const idMatch = line.match(/\b([A-Z][\w-]+-MS\w+)/);
        if (idMatch) inProgress.push(idMatch[1]);
      }
    }
    if (inProgress.length > 0) {
      parts.push(`In-progress: ${inProgress.slice(0, 3).join(", ")}`);
    }
  } catch { /* position file unavailable */ }

  // Recent git commits
  const recentCommits = runGit(["log", "--oneline", "-3", "--since=8 hours ago"]);
  if (recentCommits) {
    parts.push(`Last work: ${recentCommits.split("\n")[0]}`);
  }

  if (parts.length === 0) {
    const anyCommit = runGit(["log", "--oneline", "-1"]);
    return `Read CURRENT_POSITION.md and roadmap for next task. Last commit: ${anyCommit || "unknown"}`;
  }

  return parts.join(". ") + ". Check roadmap for next unblocked task.";
}

async function findMyHandoff() {
  try {
    // Find the most recently modified handoff file — that's likely ours
    const files = await fs.readdir(HANDOFFS_DIR);
    const handoffs = [];
    for (const f of files) {
      if (!f.startsWith("HANDOFF-") || !f.endsWith(".md")) continue;
      const fp = path.join(HANDOFFS_DIR, f);
      const stat = await fs.stat(fp);
      handoffs.push({ file: f, path: fp, mtime: stat.mtimeMs });
    }
    if (handoffs.length === 0) return null;
    // Sort by most recent
    handoffs.sort((a, b) => b.mtime - a.mtime);
    const newest = handoffs[0];
    const ageMin = Math.round((Date.now() - newest.mtime) / 60000);
    if (ageMin < 30) {
      // Only return if fresh (within 30 min — likely our session)
      const content = await fs.readFile(newest.path, "utf8");

      // Check if RESUME is a placeholder and replace with smart fallback
      const resumeMatch = content.match(/## RESUME\n([\s\S]*?)(?=\n##|\n$)/);
      const resume = resumeMatch?.[1]?.trim() || "";

      if (isPlaceholderResume(resume)) {
        // Generate a meaningful fallback RESUME
        const fallback = await generateFallbackResume();
        const enhanced = content.replace(
          /## RESUME\n[\s\S]*?(?=\n##|\n$)/,
          `## RESUME\n${fallback}\n(auto-generated fallback — /precompact was not run before /compact)`
        );
        return enhanced;
      }

      return content;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * CPP-MS3-U-CPP23: Resolve compaction-survival content from the per-instance
 * directory, falling back to the legacy single file.
 *
 * Strategy:
 *   1. Glob `.compaction-survival-*.md` in SURVIVAL_DIR
 *   2. Pick the freshest file (most recently modified within last 30 min)
 *      — that's our session's pre-compact write
 *   3. If none are fresh, fall back to legacy `.compaction-survival.md`
 *   4. If file is older than ~30 min, treat as stale but still readable
 */
async function readCompactionSurvival() {
  try {
    const entries = await fs.readdir(SURVIVAL_DIR);
    const perInstance = [];
    for (const name of entries) {
      if (!name.startsWith(SURVIVAL_PER_INSTANCE_PREFIX)) continue;
      if (!name.endsWith(SURVIVAL_PER_INSTANCE_SUFFIX)) continue;
      const fp = path.join(SURVIVAL_DIR, name);
      try {
        const stat = await fs.stat(fp);
        perInstance.push({ file: name, path: fp, mtime: stat.mtimeMs });
      } catch {
        // Skip unreadable entries.
      }
    }
    if (perInstance.length > 0) {
      perInstance.sort((a, b) => b.mtime - a.mtime);
      const freshest = perInstance[0];
      const ageMin = Math.round((Date.now() - freshest.mtime) / 60000);
      const content = await fs.readFile(freshest.path, "utf8");
      const header = ageMin < 30
        ? `## Compaction Survival (per-instance: ${freshest.file}, ${ageMin}m ago)\n`
        : `## Compaction Survival (per-instance: ${freshest.file}, stale ${ageMin}m)\n`;
      return header + content;
    }
  } catch {
    // Directory unreadable — fall through to legacy.
  }
  try {
    return await fs.readFile(SURVIVAL_FILE, "utf8");
  } catch {
    return null;
  }
}

async function main() {
  const parts = [];

  // 1. Read compaction survival (per-instance preferred, legacy fallback)
  const survival = await readCompactionSurvival();
  if (survival !== null) {
    parts.push(survival);
  } else {
    parts.push("No compaction survival data.");
  }

  // 2. Read per-session handoff (with smart RESUME fallback)
  const handoff = await findMyHandoff();
  if (handoff) {
    parts.push("\n## Per-Session Handoff (your session):");
    parts.push(handoff);
  } else {
    // No fresh handoff found — generate a standalone RESUME
    const fallback = await generateFallbackResume();
    parts.push("\n## Per-Session Handoff (auto-generated — no fresh handoff found):");
    parts.push(`## RESUME\n${fallback}`);
  }

  // 3. Read SESSION_ARTIFACTS.json for Feature Cascade
  //    CPP-MS4-U-CPP32: Zod validation at this read boundary. Malformed JSON
  //    or schema violations surface a marker line in the output rather than
  //    being silently swallowed, so pipeline breakage is visible to the agent.
  try {
    const artifactsPath = "H:\\prism\\state\\shared\\SESSION_ARTIFACTS.json";
    const artifacts = await fs.readFile(artifactsPath, "utf8");
    let raw;
    try {
      raw = JSON.parse(artifacts);
    } catch (e) {
      parts.push(`\n## Feature Cascade: SESSION_ARTIFACTS.json malformed (${(e?.message || "parse error").slice(0, 80)})`);
      raw = null;
    }
    if (raw !== null) {
      const result = SessionArtifactsZ.safeParse(raw);
      if (!result.success) {
        const msg = result.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
          .join("; ");
        parts.push(`\n## Feature Cascade: SESSION_ARTIFACTS.json schema error (${msg})`);
      } else if (result.data.recent_additions) {
        const ra = result.data.recent_additions;
        const items = [];
        if (ra.new_engines?.length) items.push(`${ra.new_engines.length} new engines: ${ra.new_engines.join(", ")}`);
        if (ra.new_hooks?.length) items.push(`${ra.new_hooks.length} new hooks: ${ra.new_hooks.join(", ")}`);
        if (ra.new_skills?.length) items.push(`${ra.new_skills.length} new skills: ${ra.new_skills.join(", ")}`);
        if (items.length > 0) {
          parts.push("\n## Feature Cascade (from prior session):");
          parts.push(items.join("\n"));
        }
      }
    }
  } catch { /* file unreadable — silent is OK here; schema/parse errors are surfaced above */ }

  // 4. CPP-MS4-U-CPP33: Directive freshness gate. If any tracked shared
  //    directive hasn't been touched in >7 days, surface it as a warning so
  //    the agent can refresh before relying on stale coordination rules.
  //    Missing files are listed separately so the index and reality stay aligned.
  const freshness = await checkDirectiveFreshness({
    directives: TRACKED_DIRECTIVES,
    directiveDir: DIRECTIVE_DIR,
    staleDays: DIRECTIVE_STALE_DAYS,
    now: Date.now(),
  });
  const block = formatFreshnessBlock(freshness, TRACKED_DIRECTIVES.length, DIRECTIVE_STALE_DAYS);
  if (block !== null) parts.push(block);

  process.stdout.write(parts.join("\n"));
}

/**
 * CPP-MS4-U-CPP33: Classify tracked directives into fresh/stale/missing buckets.
 *
 * Pure-ish function (touches fs.stat but otherwise side-effect-free). Exported
 * so the freshness-gate logic is testable without spawning the CLI or
 * reading compaction-survival state.
 *
 * @param {{ directives: string[], directiveDir: string, staleDays: number, now: number }} opts
 * @returns {Promise<{ stale: Array<{ name: string, ageDays: number }>, missing: string[] }>}
 */
export async function checkDirectiveFreshness({ directives, directiveDir, staleDays, now }) {
  const staleMs = staleDays * 24 * 60 * 60 * 1000;
  const stale = [];
  const missing = [];
  for (const name of directives) {
    const fp = path.join(directiveDir, name);
    try {
      const st = await fs.stat(fp);
      const ageDays = Math.floor((now - st.mtimeMs) / (24 * 60 * 60 * 1000));
      if (now - st.mtimeMs > staleMs) {
        stale.push({ name, ageDays });
      }
    } catch {
      missing.push(name);
    }
  }
  return { stale, missing };
}

/**
 * CPP-MS4-U-CPP33: Render the freshness block for the boot injection.
 * Returns `null` when everything is fresh (no block emitted).
 */
export function formatFreshnessBlock(result, total, staleDays) {
  const { stale, missing } = result;
  if (stale.length === 0 && missing.length === 0) return null;
  const lines = [`\n## Directive Freshness Warning (>${staleDays}d stale)`];
  if (stale.length > 0) {
    const rendered = stale.map((s) => `${s.name} (${s.ageDays}d)`).join(", ");
    lines.push(`Stale (${stale.length}/${total}): ${rendered}`);
  }
  if (missing.length > 0) {
    lines.push(`Missing (${missing.length}): ${missing.join(", ")}`);
  }
  lines.push("Refresh before relying on these for coordination rules, or accept outdated guidance.");
  return lines.join("\n");
}

main().catch(() => {
  process.stdout.write("No compaction data");
});
