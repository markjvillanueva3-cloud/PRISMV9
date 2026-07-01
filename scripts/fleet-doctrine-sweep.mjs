#!/usr/bin/env node
/**
 * fleet-doctrine-sweep.mjs — bulk update of fleet-size doctrine across the
 * codebase after the 13 → 26 SLOT-RECLAIM expansion (commit ed5c49044b,
 * 2026-05-19). User directive: "update any and all mention of 13 in the fleet,
 * we have a full 26 now".
 *
 * Replaces literal phrases that describe the fleet topology — counts, NATO
 * range descriptions, scaling assertions. Does NOT touch milestone NAMES
 * (e.g. JULIETT-12CHAT-ALLOCATION-MS0 is canonical history) or commit
 * subjects in git log.
 *
 * Modes:
 *   node scripts/fleet-doctrine-sweep.mjs            # dry-run (prints diff per file)
 *   node scripts/fleet-doctrine-sweep.mjs --apply    # write changes
 *   node scripts/fleet-doctrine-sweep.mjs --json     # machine-readable summary
 *
 * Exit: 0 ok · 1 nothing to change · 2 read/write error.
 */
import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = "H:/prism";

/**
 * Target files — scoped to the source-of-truth code + doctrine files.
 * Skips milestone JSON (history), commit logs, .pre-junction backups, .tmp scratch.
 */
const TARGETS = [
  // Code + hook comments (fleet topology references, not hardcoded SLOT_NAMES
  // arrays — those already updated in slot-bind-enforce + process-slot-map).
  ".claude/helpers/chat-slots.mjs",
  ".claude/helpers/meta-task-suppressor.mjs",
  ".claude/helpers/per-agent-handoff.mjs",
  ".claude/helpers/priority-queue.mjs",
  ".claude/helpers/terminal-window-id.mjs",
  ".claude/helpers/install-handoff-prune-task.ps1",
  ".claude/helpers/install-fleet-memory-monitor-task.ps1",
  ".claude/hooks/awareness-snapshot-inject.mjs",
  ".claude/hooks/command-telemetry-record.mjs",
  ".claude/hooks/fleet-reaper-stop.mjs",
  ".claude/hooks/git-add-lane-guard.mjs",
  ".claude/hooks/golf-slot-write-allowlist.mjs",
  ".claude/hooks/golf-slot-reaper-guardian.mjs",
  ".claude/hooks/session-start-auto-resume.mjs",
  ".claude/hooks/session-start-terminal-pin.mjs",
  ".claude/hooks/slot-worktree-cwd-advisory.mjs",
  ".claude/hooks/stop-obsidian-memory-feed.mjs",
  // Wiki — doctrinal entries describing fleet topology (skip milestone-named
  // entries like juliett-12chat-allocation-ms0.md which preserve history).
  "knowledge/wiki/software-engineering/fleet-coordination-discipline.md",
  "knowledge/wiki/software-engineering/git-shared-index-hazards.md",
  "knowledge/wiki/software-engineering/slot-worktree-playbook.md",
  "knowledge/wiki/software-engineering/commit-message-conventions.md",
  "knowledge/wiki/code-tribal/chat-bus-coordination-patterns.md",
  "knowledge/wiki/code-tribal/observability-patterns.md",
  "knowledge/wiki/code-tribal/multi-chat-coordination.md",
  "knowledge/wiki/code-tribal/schema-migration-patterns.md",
  "knowledge/wiki/code-tribal/concurrency-and-locking-patterns.md",
  "knowledge/wiki/lessons/slot-worktree-enforcement-not-actually-active.md",
  "knowledge/wiki/lessons/bug-findings-wiki-gate.md",
  "knowledge/wiki/architecture/wiki-propagation-watchdog-stop.md",
  "knowledge/wiki/architecture/unit-knowledge-pack.md",
  "knowledge/wiki/os/processes/golf-hygiene-slot.md",
  "knowledge/wiki/os/processes/slot-lifecycle.md",
  "knowledge/wiki/os/sessions/stable-session-id.md",
  "knowledge/wiki/os/commands/checkin.md",
  "knowledge/wiki/os/syscalls/checkin.md",
  "docker/ollama-gpu/README.md",
];

/**
 * Literal-phrase replacements. Each rule is `[old, new, ?contextGuard]`.
 * `contextGuard` is an optional regex — if provided, the substitution only
 * fires if the *full line* matches it (prevents over-zealous replaces).
 *
 * Ordering matters — more-specific rules first so a longer phrase doesn't
 * get half-replaced by a shorter one.
 */
const RULES = [
  // Forward-doctrine: fleet sizes
  ["up to 13 concurrent chats", "up to 26 concurrent chats"],
  ["up to 13 chats", "up to 26 chats"],
  ["up to 13-chat", "up to 26-chat"],
  ["the 13-chat fleet", "the 26-chat fleet"],
  ["13-chat fleet", "26-chat fleet"],
  ["≤13 concurrent chats", "≤26 concurrent chats"],
  ["13 concurrent chats", "26 concurrent chats"],
  ["13 concurrent PowerShell windows", "up to 26 concurrent PowerShell windows"],
  ["all 13 chats", "all 26 chats"],
  ["13 NATO slots", "26 NATO slots"],
  ["13 NATO slot worktrees", "26 NATO slot worktrees"],
  ["12 of 13 chats", "25 of 26 chats"],

  // Slot range descriptions (forward doctrine)
  // — alpha..mike → alpha..zulu when in fleet-topology context
  ["alpha..mike work slots + golf hygiene", "alpha..zulu (25 work + 1 hygiene golf)"],
  ["slot worktrees (H:/prism-slot-{alpha..mike}", "slot worktrees (H:/prism-slot-{alpha..zulu}"],
  ["(alpha..mike, golf)", "(alpha..zulu including hygiene slot golf)"],

  // Old 7-chat doctrine (mostly stamped out, catch-all)
  ["7 chats (alpha..foxtrot work + golf hygiene)", "26 chats (alpha..foxtrot, hotel..zulu work + golf hygiene)"],
  ["any of the 7 concurrent chats", "any of the up to 26 concurrent chats"],
  ["N=7 concurrent child processes", "N concurrent child processes (was 7 at design; fleet now scales to 26)"],

  // 8-work-slots stale
  ["8 work slots (alpha..foxtrot + hotel + india)", "25 work slots (alpha..foxtrot, hotel..zulu)"],
];

function applyRules(text) {
  let result = text;
  const hits = [];
  for (const [oldStr, newStr] of RULES) {
    let idx = 0;
    let count = 0;
    while ((idx = result.indexOf(oldStr, idx)) !== -1) {
      count++;
      idx += oldStr.length;
    }
    if (count > 0) {
      result = result.split(oldStr).join(newStr);
      hits.push({ from: oldStr.slice(0, 60), to: newStr.slice(0, 60), count });
    }
  }
  return { result, hits, changed: result !== text };
}

function atomicWrite(path, content) {
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, content, "utf8");
  renameSync(tmp, path);
}

function main() {
  const args = new Set(process.argv.slice(2));
  const apply = args.has("--apply");
  const asJson = args.has("--json");
  const summary = { totalFiles: TARGETS.length, scanned: 0, changed: 0, skipped: 0, missing: 0, files: [] };

  for (const rel of TARGETS) {
    const abs = join(REPO_ROOT, rel);
    if (!existsSync(abs)) { summary.missing++; summary.files.push({ file: rel, status: "missing" }); continue; }
    summary.scanned++;
    let text;
    try { text = readFileSync(abs, "utf8"); }
    catch (e) { summary.files.push({ file: rel, status: "read-error", error: e.message }); continue; }
    const r = applyRules(text);
    if (!r.changed) { summary.skipped++; summary.files.push({ file: rel, status: "no-change" }); continue; }
    summary.changed++;
    summary.files.push({ file: rel, status: apply ? "written" : "would-change", hits: r.hits });
    if (apply) atomicWrite(abs, r.result);
  }

  if (asJson) {
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  } else {
    process.stderr.write(
      `fleet-doctrine-sweep: ${apply ? "APPLY" : "DRY-RUN"}\n` +
      `  targets:  ${summary.totalFiles}\n` +
      `  scanned:  ${summary.scanned}\n` +
      `  changed:  ${summary.changed}\n` +
      `  skipped:  ${summary.skipped} (no fleet-doctrine matches)\n` +
      `  missing:  ${summary.missing}\n`,
    );
    for (const f of summary.files) {
      if (!f.hits) continue;
      process.stderr.write(`\n  ${f.status === "written" ? "✓" : "→"} ${f.file}\n`);
      for (const h of f.hits) process.stderr.write(`      ${h.count}× "${h.from}…" → "${h.to}…"\n`);
    }
    if (!apply) process.stderr.write("\n  (preview — re-run with --apply to write)\n");
  }
  return summary.changed > 0 ? 0 : 1;
}

process.exit(main());
