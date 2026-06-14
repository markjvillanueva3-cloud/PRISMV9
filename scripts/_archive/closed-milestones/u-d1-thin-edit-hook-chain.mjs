#!/usr/bin/env node
/**
 * u-d1-thin-edit-hook-chain.mjs — PRISM-STAB-MS0/U-D1 (2026-05-10).
 *
 * Retires redundant / pure-observability PreToolUse:Edit and PostToolUse:Edit
 * hooks that are causing the bash xmalloc OOMs. Same script pattern as U-C4:
 *   --apply --confirm to commit, --rollback to restore from .u-d1.bak.
 *
 * Inventory (from scripts/audit-edit-hooks.mjs at the time U-D1 was authored):
 *   - 35 PreToolUse hooks fire on Edit/Write/MultiEdit
 *   - 33 PostToolUse hooks fire on Edit/Write/MultiEdit
 *   = 68 node-process forks per Edit. Parallel Edit batches multiply this and
 *     the bash subshell allocator runs out of pageable memory.
 *
 * CONSERVATIVE tier — only hooks that are clearly redundant with C2 bundle,
 * with chat-bus / SessionStart injection, or pure observability with no
 * load-bearing behavior. Each entry below names WHY the hook is safe to drop.
 */
import fs from "node:fs";

const SETTINGS_C = "C:/Users/wompu/.claude/settings.json";
const SETTINGS_BAK = "C:/Users/wompu/.claude/settings.json.u-d1.bak";
const SETTINGS_H = "H:/.claude/settings.json";

// PreToolUse:Edit retirements (conservative)
const PRETOOL_CANDIDATES = [
  ["pretool-causal-trace.mjs",       "pure observability — causal trace logged but never read by humans on edit cadence"],
  ["pretool-world-simulator.mjs",    "pure observability — world simulation timing data; not load-bearing"],
  ["pretool-change-radius.mjs",      "pure observability — change-radius metric; not load-bearing"],
  ["coding-pattern-hint.mjs",        "pure suggestion — can be Skill-invoked when needed; no enforcement"],
  ["async-pattern-checker.mjs",      "redundant — TS strict + tsc --noEmit catch the same patterns. THIS is the hook that OOM'd."],
  ["multi-session-awareness.mjs",    "redundant — chat-bus inject on UserPromptSubmit already surfaces multi-session signals"],
  ["cross-session-awareness.mjs",    "redundant — duplicate of multi-session-awareness on the same UserPromptSubmit injection path"],
];

// PostToolUse:Edit retirements (conservative)
const POSTTOOL_CANDIDATES = [
  ["posttool-curiosity-tick.mjs",       "pure observability — curiosity-queue housekeeping; runs fine on cadence schedule"],
  ["posttool-emergence-scan.mjs",       "pure observability — emergence anomaly counter; SessionStart already logs"],
  ["posttool-mcp-backend-audit.mjs",    "50000ms timeout per Edit; redundant with auto-lint-post-edit + build-cache-manager + build-tracker"],
  ["compaction-survival-auto.mjs",      "redundant — precompact-auto-trigger handles the same survival path"],
  ["decision-capture.mjs",              "pure observability — decision log; not load-bearing on edit cadence"],
  ["write-success-compressor.mjs",      "pure observability — success/failure ratio metric"],
  ["path-frequency-tracker.mjs",        "pure observability — file-access frequency; SessionStart digest covers this"],
  ["tool-pattern-learner.mjs",          "pure observability — pattern learner runs fine on cadence schedule, not per-tool"],
  ["error-pattern-memory.mjs",          "redundant — error-learn match already runs in PreToolUse warning path"],
  ["wiki-link-suggest.mjs",             "pure suggestion — can be Skill-invoked when needed; no enforcement"],
  ["session-reorient-capture.mjs",      "pure observability — reorient signal; SessionStart handles cold reorient"],
  ["checkpoint-auto-trigger.mjs",       "too-generic — checkpoints belong on milestone closure, not every Edit"],
];

const ALL_CANDIDATES = [
  ...PRETOOL_CANDIDATES.map(([n, w]) => ["PreToolUse", n, w]),
  ...POSTTOOL_CANDIDATES.map(([n, w]) => ["PostToolUse", n, w]),
];

// Hooks intentionally KEPT (documented reasons; this script does NOT touch them):
//   PreToolUse load-bearing:
//     ban-facade-patterns / asset-deletion-block / duplication-hard-block / dedup-auto-invoke
//     code-completeness-gate / test-legitimacy / anti-pattern-detector / import-verifier
//     type-safety-checker / test-coverage-enforcer / api-contract-enforcer
//     consistent-return-checker / settings-json-addonly-guard / build-create-detector
//     edit-old-string-verify / file-ownership-tracker / work-claim / agent-boundary-guard
//     master-index-search-gate / magic-number-detector / mcp-route-suggest / ai-reasoning-inject
//     ai-system-router-inject / memory-relevance-inject / tribal-inject-on-edit
//     auto-consensus-critical-edit / figma-ui-consistency / precompact-auto-trigger
//   PostToolUse load-bearing:
//     c-to-h-mirror (settings sync) / auto-lint-post-edit / build-cache-manager / build-tracker
//     dispatcher-import-validator / jm-die-provenance-guard / ingestion-cache-root-guard
//     physics-canonical-constants-guard / mcp-posttool-tracker / write-import-check
//     write-tracker / inventory-on-write / recall-counter-track / memory-mirror-to-vault
//     tribal-autowire / edit-multiedit-suggest / token-economy-hook / directive-summary-refresh
//     ollama-terminal-watcher / edit-batch-detector / precompact-auto-trigger

function isCandidateForPhase(phase, cmd) {
  const list = phase === "PreToolUse" ? PRETOOL_CANDIDATES : POSTTOOL_CANDIDATES;
  return list.some(([name]) => cmd.includes(`/${name}`) || cmd.includes(`\\${name}`));
}

function rationaleFor(phase, cmd) {
  const list = phase === "PreToolUse" ? PRETOOL_CANDIDATES : POSTTOOL_CANDIDATES;
  for (const [name, why] of list) {
    if (cmd.includes(`/${name}`) || cmd.includes(`\\${name}`)) return why;
  }
  return null;
}

function processSettings(settings) {
  const removed = [];
  for (const phase of ["PreToolUse", "PostToolUse"]) {
    const matchers = settings.hooks?.[phase];
    if (!Array.isArray(matchers)) continue;
    for (const matcher of matchers) {
      if (!Array.isArray(matcher.hooks)) continue;
      matcher.hooks = matcher.hooks.filter((h) => {
        const cmd = h.command || "";
        if (isCandidateForPhase(phase, cmd)) {
          removed.push({
            phase,
            matcher: matcher.matcher || "(any)",
            cmd,
            why: rationaleFor(phase, cmd),
          });
          return false;
        }
        return true;
      });
    }
  }
  return { removed };
}

function syncMirror() {
  try {
    fs.copyFileSync(SETTINGS_C, SETTINGS_H);
    return true;
  } catch (e) {
    process.stderr.write(`Mirror sync failed: ${e.message}\n`);
    return false;
  }
}

function main() {
  const apply = process.argv.includes("--apply");
  const confirm = process.argv.includes("--confirm");
  const rollback = process.argv.includes("--rollback");

  if (rollback) {
    if (!fs.existsSync(SETTINGS_BAK)) {
      console.error(`No backup at ${SETTINGS_BAK}`);
      process.exit(1);
    }
    fs.copyFileSync(SETTINGS_BAK, SETTINGS_C);
    syncMirror();
    console.log("Rolled back C: + H: from .u-d1.bak");
    return;
  }

  const original = fs.readFileSync(SETTINGS_C, "utf-8");
  const settings = JSON.parse(original);
  const { removed } = processSettings(settings);

  console.log(`Would remove ${removed.length} hooks (out of ${ALL_CANDIDATES.length} candidates):\n`);
  for (const phase of ["PreToolUse", "PostToolUse"]) {
    const phaseRemoved = removed.filter((r) => r.phase === phase);
    if (phaseRemoved.length === 0) continue;
    console.log(`${phase}:`);
    for (const r of phaseRemoved) {
      const m = r.cmd.match(/[/\\]hooks[/\\]([^/\\]+)\.mjs/) ||
                r.cmd.match(/[/\\]helpers[/\\]([^/\\]+)\.mjs/);
      const name = m ? m[1] : "(unknown)";
      console.log(`  - ${name.padEnd(36)} ${r.why}`);
    }
  }
  const missing = ALL_CANDIDATES.length - removed.length;
  if (missing > 0) {
    console.log(`\nNote: ${missing} candidate(s) not found in current settings (already removed or under different path).`);
  }

  if (!apply) {
    console.log("\nDry-run. To apply: --apply --confirm");
    return;
  }
  if (!confirm) {
    console.log("\nERROR: --apply requires --confirm to acknowledge the blast radius.");
    process.exit(1);
  }

  fs.copyFileSync(SETTINGS_C, SETTINGS_BAK);
  fs.writeFileSync(SETTINGS_C, JSON.stringify(settings, null, 2) + "\n");
  syncMirror();
  // Validate
  try {
    JSON.parse(fs.readFileSync(SETTINGS_C, "utf-8"));
    JSON.parse(fs.readFileSync(SETTINGS_H, "utf-8"));
  } catch (e) {
    console.error(`POST-WRITE VALIDATION FAILED: ${e.message}`);
    console.error("Rolling back automatically...");
    fs.copyFileSync(SETTINGS_BAK, SETTINGS_C);
    syncMirror();
    process.exit(1);
  }
  console.log(`\nApplied. Backup at ${SETTINGS_BAK}.`);
  console.log(`Mirror C: -> H: synced.`);
  console.log(`\nRollback: node scripts/u-d1-thin-edit-hook-chain.mjs --rollback`);
}

main();
