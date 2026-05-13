#!/usr/bin/env node
// tier: T4
/**
 * skill-lint-stop.mjs — U-SKU03 (SKILLS-UTILIZATION-MS0) Stop hook.
 *
 * ADVISORY ONLY — never blocks. If this session edited any skill file
 * (`**​/SKILL.md` or `.claude/commands/*.md` or `~/.claude/commands/*.md`),
 * run the static linter (`scripts/skill-lint.mjs --project-only`) and surface a
 * one-line count of flagged skills via `additionalContext`. @eng_khairallah1
 * Phase-2: "vague language is banned; keep the file under 500 lines" — this is
 * the cheap reminder at session end so quality regressions don't compound.
 *
 * Hook contract: reads the Stop-hook JSON on stdin, always prints
 * `{"continue": true, ...}` — a linter failure must not strand the session.
 *
 * PENDING-WIRE (U-SKU03 step-3): not yet registered in `.claude/settings.json`.
 * Wire it as a Stop hook once this branch (`work/skills-utilization-ms0`) merges
 * into `cad-fusion-live-ms0`, by adding to the `Stop` array:
 *   { "type": "command",
 *     "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/skill-lint-stop.mjs",
 *     "timeout": 12000 }
 * Deferred this session to avoid (a) the worktree↔main-tree hook-path mismatch
 * (settings.json hardcodes `H:/prism/.claude/hooks/...`, which doesn't resolve
 * to a worktree copy) and (b) clobbering the in-flight `.claude/settings.json`
 * WIP in the main tree (HOOKS-AUTOMATION-V2 lane). Set `PRISM_SKILL_LINT_STOP=0`
 * to disable once wired.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const REPO_ROOT = path.resolve(import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname), "..", "..");
const SCRIPT = path.join(REPO_ROOT, "scripts", "skill-lint.mjs");

function readStdin() {
  try { return fs.readFileSync(0, "utf8"); } catch { return ""; }
}

/** Did this session touch a skill file? Heuristic: the transcript mentions a Write/Edit on a skill path,
 *  OR `git status` shows a modified/added skill file. Either signal is enough — false positives just
 *  mean the linter runs once unnecessarily (cheap; advisory). */
function sessionTouchedASkill(input) {
  const SKILL_PATH_RE = /(?:[\\/]SKILL\.md\b|[\\/]\.claude[\\/]commands[\\/][^"'\\/]+\.md\b|[\\/]commands[\\/][^"'\\/]+\.md\b)/i;
  // 1) transcript scan
  try {
    const tp = input?.transcript_path;
    if (tp && fs.existsSync(tp)) {
      const txt = fs.readFileSync(tp, "utf8");
      if (/"name"\s*:\s*"(?:Write|Edit|MultiEdit|NotebookEdit)"/.test(txt) && SKILL_PATH_RE.test(txt)) return true;
    }
  } catch { /* ignore */ }
  // 2) git status scan (covers edits this hook can't see in the transcript)
  try {
    const st = execFileSync("git", ["-C", REPO_ROOT, "status", "--porcelain"], { encoding: "utf8", timeout: 4000 });
    for (const line of st.split(/\r?\n/)) {
      const p = line.slice(3).trim();
      if (p && SKILL_PATH_RE.test("/" + p)) return true;
    }
  } catch { /* ignore */ }
  return false;
}

function main() {
  let input = {};
  try { input = JSON.parse(readStdin() || "{}"); } catch { input = {}; }

  if (process.env.PRISM_SKILL_LINT_STOP === "0") { console.log(JSON.stringify({ continue: true })); return; }
  if (!fs.existsSync(SCRIPT)) { console.log(JSON.stringify({ continue: true })); return; }
  if (!sessionTouchedASkill(input)) { console.log(JSON.stringify({ continue: true })); return; }

  let summary = null;
  try {
    // --project-only keeps this fast (the chat is most likely to have edited a project skill);
    // a full --all sweep is what /skill-lint and the U-SKU04 weekly cadence do.
    const out = execFileSync(process.execPath, [SCRIPT, "--project-only", "--json", "--no-write", "--quiet"], { encoding: "utf8", timeout: 9000 });
    summary = JSON.parse(out);
  } catch (e) {
    // linter crashed / timed out — say so, but don't block
    console.log(JSON.stringify({ continue: true, additionalContext: `skill-lint (advisory): could not run — ${e instanceof Error ? e.message : String(e)}` }));
    return;
  }

  if (!summary || typeof summary.flagged !== "number" || summary.flagged === 0) {
    console.log(JSON.stringify({ continue: true, additionalContext: `skill-lint (advisory): ${summary?.scanned ?? "?"} project skill(s) — none flagged. ✓` }));
    return;
  }
  const byRule = Object.entries(summary.byRule || {}).sort().map(([r, n]) => `${r}=${n}`).join(" ");
  console.log(JSON.stringify({
    continue: true,
    additionalContext:
      `skill-lint (advisory): ${summary.flagged} of ${summary.scanned} project skill(s) flagged` +
      (byRule ? ` (${byRule})` : "") +
      ` — run \`node scripts/skill-lint.mjs --all\` for the full report, or \`/skill-lint\`. ` +
      `Worst: ${summary.flaggedSkillNames.slice(0, 5).join(", ")}${summary.flaggedSkillNames.length > 5 ? ", …" : ""}`,
  }));
}

main();
