#!/usr/bin/env node
/**
 * audit-hook-bash-overhead — count hook invocations per event + identify which
 * ones route through the bash wrapper (fork-storm contributor) vs the native
 * .cmd shim (no bash fork).
 *
 * The Stop-hook error storm in H:/last.md (xmalloc / cygheap-read-copy-failed /
 * Win32 error 1455 / bash "bad interpreter: Resource temporarily unavailable")
 * is structural: 13 chats × N hooks/event × bash-fork-per-invocation hits the
 * Windows commit limit. portable-node already collapses spawn failures to
 * exit 0 ("non-blocking status code: 0") so the errors are NOISE, not
 * functional breaks — but the noise pollutes hook signal-to-noise.
 *
 * portable-node.cmd EXISTS as a Windows-native alternative (cmd.exe → node.exe,
 * no bash fork). Migrating settings.json hook commands from
 *   "H:/.claude/bin/portable-node" ...
 * to
 *   "H:/.claude/bin/portable-node.cmd" ...
 * would eliminate the bash fork layer entirely. This script quantifies the
 * migration target: how many hook entries use which invocation path, per
 * event type.
 *
 * Usage:
 *   node scripts/audit-hook-bash-overhead.mjs            # human summary
 *   node scripts/audit-hook-bash-overhead.mjs --json     # machine-readable
 *   node scripts/audit-hook-bash-overhead.mjs --ledger   # append JSONL row
 *
 * Exit codes:
 *   0 — bash-routed share <20% (good)
 *   1 — bash-routed share ≥20% (migration recommended)
 *   2 — measurement error (settings.json unreadable)
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER_FILE = join(REPO_ROOT, "state", "shared", "hook-bash-overhead-history.jsonl");
const BASH_ROUTE_THRESHOLD_PCT = 20;
const BASH_INVOKE_RE = /\bportable-node(?!\.cmd)\b/;
const CMD_INVOKE_RE = /\bportable-node\.cmd\b/;

const SETTINGS_PATHS = [
  join(homedir(), ".claude", "settings.json"),
  "H:\\.claude\\settings.json",
  join(REPO_ROOT, ".claude", "settings.json"),
];

const argv = process.argv.slice(2);
const jsonOut = argv.includes("--json");
const writeLedger = argv.includes("--ledger");

function readSettingsFile() {
  for (const p of SETTINGS_PATHS) {
    if (existsSync(p)) {
      try {
        const raw = readFileSync(p, "utf8");
        return { path: p, content: JSON.parse(raw) };
      } catch (e) {
        return { path: p, error: String(e?.message || e) };
      }
    }
  }
  return null;
}

function walkHookEntries(settings) {
  // settings.hooks is { eventName: [ { matcher, hooks: [ { type, command, timeout } ] } ] }
  const out = [];
  const hooksRoot = settings?.hooks;
  if (!hooksRoot || typeof hooksRoot !== "object") return out;
  for (const [eventName, groups] of Object.entries(hooksRoot)) {
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      const matcher = group?.matcher || "";
      const entries = Array.isArray(group?.hooks) ? group.hooks : [];
      for (const e of entries) {
        const cmd = String(e?.command || "");
        out.push({
          event: eventName,
          matcher,
          command: cmd,
          timeout: e?.timeout ?? null,
          isBashRoute: BASH_INVOKE_RE.test(cmd) && !CMD_INVOKE_RE.test(cmd),
          isCmdRoute: CMD_INVOKE_RE.test(cmd),
        });
      }
    }
  }
  return out;
}

function summarize(entries) {
  const total = entries.length;
  const byEvent = {};
  let bashCount = 0;
  let cmdCount = 0;
  let neitherCount = 0;
  for (const e of entries) {
    const bucket = byEvent[e.event] || { total: 0, bash: 0, cmd: 0, neither: 0 };
    bucket.total += 1;
    if (e.isBashRoute) { bucket.bash += 1; bashCount += 1; }
    else if (e.isCmdRoute) { bucket.cmd += 1; cmdCount += 1; }
    else { bucket.neither += 1; neitherCount += 1; }
    byEvent[e.event] = bucket;
  }
  const bashPct = total > 0 ? (bashCount / total) * 100 : 0;
  return { total, byEvent, bashCount, cmdCount, neitherCount, bashPct };
}

function topBashRoutedHooks(entries, limit = 10) {
  return entries
    .filter(e => e.isBashRoute)
    .slice(0, limit)
    .map(e => ({
      event: e.event,
      matcher: e.matcher,
      hookFile: e.command.replace(/^.*[\\\/](?:\.claude[\\\/]hooks[\\\/])?/, "").replace(/^.*\s/, ""),
    }));
}

function main() {
  const settings = readSettingsFile();
  if (!settings) {
    const err = { ok: false, error: "settings_not_found", searched: SETTINGS_PATHS };
    console.log(jsonOut ? JSON.stringify(err) : `ERR: no settings.json found in ${SETTINGS_PATHS.length} locations`);
    process.exit(2);
  }
  if (settings.error) {
    const err = { ok: false, error: "settings_parse_failed", path: settings.path, message: settings.error };
    console.log(jsonOut ? JSON.stringify(err) : `ERR: settings.json parse failed at ${settings.path}: ${settings.error}`);
    process.exit(2);
  }
  const entries = walkHookEntries(settings.content);
  const summary = summarize(entries);
  const topBash = topBashRoutedHooks(entries, 15);

  const report = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    source: settings.path,
    totalHooks: summary.total,
    byEvent: summary.byEvent,
    bashRoutedCount: summary.bashCount,
    cmdRoutedCount: summary.cmdCount,
    otherCount: summary.neitherCount,
    bashRoutedPct: Number(summary.bashPct.toFixed(2)),
    threshold: BASH_ROUTE_THRESHOLD_PCT,
    overThreshold: summary.bashPct >= BASH_ROUTE_THRESHOLD_PCT,
    topBashRoutedHooks: topBash,
    advisoryOnly: true,
    note: "Bash-routed hooks contribute to Cygwin fork-storm under fleet load. Migrate to portable-node.cmd to eliminate the bash fork layer.",
  };

  if (writeLedger) {
    try {
      mkdirSync(dirname(LEDGER_FILE), { recursive: true });
      const row = {
        ts: report.generatedAt,
        total: report.totalHooks,
        bash: report.bashRoutedCount,
        cmd: report.cmdRoutedCount,
        other: report.otherCount,
        bashPct: report.bashRoutedPct,
      };
      const tmp = LEDGER_FILE + `.tmp-${process.pid}-${Date.now()}`;
      const existing = existsSync(LEDGER_FILE) ? readFileSync(LEDGER_FILE, "utf8") : "";
      writeFileSync(tmp, existing + JSON.stringify(row) + "\n", "utf8");
      renameSync(tmp, LEDGER_FILE);
    } catch (e) {
      report.ledgerError = String(e?.message || e);
    }
  }

  if (jsonOut) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`audit-hook-bash-overhead — ${summary.total} hook entries across ${Object.keys(summary.byEvent).length} event types`);
    console.log(`  source: ${settings.path}`);
    console.log(`  bash-routed:  ${summary.bashCount} (${summary.bashPct.toFixed(1)}%)`);
    console.log(`  cmd-routed:   ${summary.cmdCount}`);
    console.log(`  other/inline: ${summary.neitherCount}`);
    console.log(`  threshold:    ${BASH_ROUTE_THRESHOLD_PCT}%  → ${report.overThreshold ? "⚠ OVER (migrate to .cmd)" : "✓ under"}`);
    console.log("");
    console.log("  per event:");
    for (const [ev, c] of Object.entries(summary.byEvent)) {
      console.log(`    ${ev.padEnd(20)} total=${String(c.total).padStart(3)} bash=${String(c.bash).padStart(3)} cmd=${String(c.cmd).padStart(3)} other=${String(c.neither).padStart(3)}`);
    }
    if (topBash.length > 0) {
      console.log("");
      console.log(`  top ${Math.min(topBash.length, 15)} bash-routed hooks (migration targets):`);
      for (const h of topBash) {
        console.log(`    [${h.event}/${h.matcher || "*"}] ${h.hookFile.slice(0, 90)}`);
      }
    }
  }

  process.exit(summary.bashPct >= BASH_ROUTE_THRESHOLD_PCT ? 1 : 0);
}

main();
