#!/usr/bin/env node
// tier: T4
/**
 * compact-interval-warning.mjs — Stop
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P6-U02: enforces CLAUDE.md "Compact every 2-3
 * units (don't wait for context limit)" rule. On Stop, count how many
 * milestone-prefixed commits have landed since the last `/compact` event;
 * if ≥ 3, emit advisory output asking the user to run /compact before the
 * next session burns more context.
 *
 * "Last /compact" is detected via the precompact handoff file mtime
 * (per-agent-handoff.mjs writes one each time PreCompact fires).
 *
 * Stdin payload: Stop event JSON (transcript_path, session_id, ...).
 * Output:        {continue:true, hookSpecificOutput?: {additionalContext}}
 *
 * NEVER blocks Stop — advisory only.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const HANDOFF_DIR = "H:/prism/state/shared/handoffs";
const UNIT_THRESHOLD = 3;
const REPO_ROOT = "H:/prism";

async function readStdin() {
  try {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8").trim();
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function ok(extra) {
  const body = { continue: true };
  if (extra) {
    body.hookSpecificOutput = {
      hookEventName: "Stop",
      additionalContext: extra,
    };
  }
  process.stdout.write(JSON.stringify(body) + "\n");
  process.exit(0);
}

/**
 * Find the most recent handoff file mtime (epoch ms). The Stop hook ran
 * after every /compact, so the latest handoff is a reliable proxy for
 * "last compact moment". Returns 0 if no handoffs exist.
 */
export function lastCompactMs(dir = HANDOFF_DIR) {
  if (!existsSync(dir)) return 0;
  let best = 0;
  for (const name of readdirSync(dir)) {
    if (!name.toLowerCase().startsWith("handoff-")) continue;
    try {
      const st = statSync(join(dir, name));
      if (st.mtimeMs > best) best = st.mtimeMs;
    } catch { /* skip */ }
  }
  return best;
}

/**
 * Count commits made since `sinceMs` whose subject matches the canonical
 * milestone-prefixed pattern (anything with `SCOPE/U-ID: title`). Falls
 * back to a generous heuristic if `git log --since` cannot be invoked.
 */
export function unitCommitsSince(sinceMs, opts = {}) {
  const cwd = opts.cwd ?? REPO_ROOT;
  if (!sinceMs || sinceMs <= 0) {
    // No baseline → look at the last hour of commits as a soft default.
    sinceMs = Date.now() - 60 * 60 * 1000;
  }
  const isoSince = new Date(sinceMs).toISOString();
  let log;
  try {
    log = execSync(`git -C "${cwd}" log --since="${isoSince}" --format=%s`, {
      encoding: "utf8",
      timeout: 3000,
    });
  } catch {
    return 0;
  }
  const subjects = log.split(/\r?\n/).filter(Boolean);
  // Same canonical regex as commit-format-validator (kept inline so this
  // hook has zero cross-file deps).
  const RE = /^(?:\[(?:MAIN|MERGE|REVERT|FIXUP|HOTFIX)\]\s+)?[A-Z][A-Z0-9_-]+\/[A-Z0-9_.-]+:\s+\S/;
  return subjects.filter((s) => RE.test(s)).length;
}

async function main() {
  const payload = await readStdin();
  if (!payload) return ok();

  // Don't double-fire on stop_hook_active — let the parent invocation own the warning.
  if (payload.stop_hook_active === true) return ok();

  const since = lastCompactMs();
  const units = unitCommitsSince(since);
  if (units < UNIT_THRESHOLD) return ok();

  const ageMin = since > 0 ? Math.round((Date.now() - since) / 60000) : null;
  const ageStr = ageMin === null ? "(no compact recorded yet)" : `${ageMin} min ago`;
  const ctx =
    `compact-interval-warning: ${units} milestone-prefixed commits since last /compact ${ageStr}.\n` +
    `CLAUDE.md says: compact every 2–3 units (don't wait for context limit).\n` +
    `Run /compact before the next non-trivial task to keep cache warm.`;
  ok(ctx);
}

const isMain = process.argv[1] && process.argv[1].endsWith("compact-interval-warning.mjs");
if (isMain) main().catch(() => ok());
