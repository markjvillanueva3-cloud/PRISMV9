#!/usr/bin/env node
// tier: T4
/**
 * blueprint-join-index-stale-check.mjs — SessionStart hook
 *
 * U-DOCU-04 / MS-DOCU-INGEST — auto-ingest part 1 (the cheap canary).
 *
 * The blueprint↔program join query layer (BlueprintProgramJoinEngine.getJoinIndex,
 * surfaced as prism_dev:program_for_print / prism_dev:print_for_program and the
 * prism_cam cam_* mirror) reads a pre-built v6 JSONL produced by
 * scripts/docustrata/phase16-blueprint-program-join-v6.py and rebuilt weekly by
 * the companion cron (scripts/system-health/33-blueprint-join-refresh.ps1).
 *
 * This hook stat()s that file ONCE at session start and injects a warning if the
 * join is missing or older than the staleness window — so an operator knows the
 * lookup actions are serving aged / no data BEFORE they rely on them.
 *
 * Ultra-light by design (CLAUDE.md reference_harness_hang_prevention): one
 * fs.statSync, no streaming, no file read, <50 ms. It is BOTH listed in
 * bundles/sessionstart-bundle.mjs SUB_HOOKS (its correct long-term home, for
 * when that bundle is re-wired into settings.json) AND registered as an
 * individual SessionStart entry — which is exactly the current real state of
 * the other ~19 "bundled" SessionStart injectors (the bundle's settings.json
 * wiring was reverted by a settings regen; until that's repaired the sub-hooks
 * fire via their individual entries). Fail-open at every step: a crash here
 * must never degrade or block session start.
 *
 * Kill knob:   PRISM_BLUEPRINT_JOIN_STALE_CHECK_DISABLE=1  (skip entirely)
 * Window knob: PRISM_BLUEPRINT_JOIN_STALE_DAYS=N           (default 10)
 */
import { existsSync, statSync } from "node:fs";

// KEEP-IN-SYNC: BlueprintProgramJoinEngine.ts DEFAULT_JOIN_REL
// ("Docustrata/.index/blueprint-program-join-full-v6.jsonl"). Hardcoded H:/prism
// path matches every other hook in this tree (the engine resolves it via
// findRepoRoot() instead, but a hook must stay zero-heavy-import). If the v6
// file is ever moved/renamed, update BOTH this literal and DEFAULT_JOIN_REL —
// a drift here fails silently (watches the wrong path, never warns).
const JOIN_PATH = "H:/prism/Docustrata/.index/blueprint-program-join-full-v6.jsonl";
// 10, not 7: the file is rebuilt on a 7-day cron cadence, so a 7-day threshold
// would self-trip in the final hours before every weekly rebuild. 10 absorbs a
// full cron jitter cycle (host asleep, scheduled-task phase offset) and only
// fires when the join is genuinely ~3 days past its expected refresh — i.e. the
// cron actually failed, which is the only thing worth a session-start warning.
const DEFAULT_STALE_DAYS = 10;

/** Emit a SessionStart additionalContext payload (or nothing) and exit 0. */
function emit(additionalContext) {
  if (additionalContext) {
    process.stdout.write(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext,
      },
    }));
  }
  process.exit(0);
}

try {
  if (process.env.PRISM_BLUEPRINT_JOIN_STALE_CHECK_DISABLE === "1") emit(null);

  if (!existsSync(JOIN_PATH)) {
    emit(
      `⚠ Blueprint↔program join index MISSING (${JOIN_PATH}). ` +
      `prism_dev:program_for_print / print_for_program and prism_cam:cam_program_for_print / ` +
      `cam_print_for_program will FAIL LOUD until it is rebuilt — run ` +
      `scripts/docustrata/phase16-blueprint-program-join-v6.py or the weekly blueprint-join-refresh cron.`,
    );
  }

  // Window knob — default 10 days; ignore a non-positive / non-numeric override.
  const overrideDays = parseInt(process.env.PRISM_BLUEPRINT_JOIN_STALE_DAYS ?? "", 10);
  const staleDays = Number.isFinite(overrideDays) && overrideDays > 0 ? overrideDays : DEFAULT_STALE_DAYS;

  const ageDays = (Date.now() - statSync(JOIN_PATH).mtimeMs) / (1000 * 60 * 60 * 24);
  // Number.isFinite guard: a NaN mtime (corrupt stat) would make `NaN > staleDays`
  // false → silent false-negative. Treat a non-finite age as "can't tell" and
  // warn, rather than silently passing a file we failed to date.
  if (!Number.isFinite(ageDays)) {
    emit(
      `⚠ Blueprint↔program join index timestamp could not be read (${JOIN_PATH}). ` +
      `Verify the file is intact — prism_dev / prism_cam print↔program lookups depend on it.`,
    );
  }
  if (ageDays > staleDays) {
    emit(
      `⚠ Blueprint↔program join index is ${ageDays.toFixed(1)} days stale ` +
      `(>${staleDays}d threshold). prism_dev / prism_cam print↔program lookups are serving aged ` +
      `data — re-run scripts/docustrata/phase16-blueprint-program-join-v6.py or wait for the ` +
      `weekly blueprint-join-refresh cron.`,
    );
  }

  emit(null); // fresh — stay silent, don't burn SessionStart context
} catch {
  emit(null); // fail open — never block session start
}
