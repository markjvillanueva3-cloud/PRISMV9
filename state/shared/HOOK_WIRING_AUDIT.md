# Hook Wiring Audit — 🟡 WARN

Generated: `2026-05-16T01:47:20.280Z`

## Summary

| Metric | Value |
|---|---|
| Hooks on disk | **551** |
| Wired (settings ∪ bundle) | **199** |
| Wired via settings.json | 114 |
| Wired via bundle child-refs | 120 |
| Orphan hooks (on disk, no ref) | **364** (66.1%) |
| Dangling refs (wired, no file) | **14** |
| C:↔H: settings byte-equal | ✓ (C: 31121B, H: 31121B) |

## 🟡 Dangling references (14)

These hook paths are referenced in settings.json but the file does NOT exist on disk.
Cause: settings entry left over from a renamed/deleted hook, OR a typo in the wiring.

- `advise.mjs`
- `block.mjs`
- `build-cache-manager.mjs`
- `build-tracker.mjs`
- `context-economy-v2.mjs`
- `context-pressure-tracker.mjs`
- `continue-false.mjs`
- `crash.mjs`
- `ok.mjs`
- `posttooluse-compressor.mjs`
- `read-optimizer.mjs`
- `rtk-reminder.mjs`
- `test-run-gate.mjs`
- `timeout.mjs`

## 🟡 Orphan hooks (top 20 of 364)

These hook files exist on disk but are NOT referenced by settings.json OR any bundle.
They are dead code unless invoked manually. Verify:
  1. Was the hook deliberately authored as a library/helper? Move to `helpers/`.
  2. Was the hook supposed to be wired? Add a settings.json entry.
  3. Was the hook deleted but the file remained? Remove the .mjs file.

- `action-triple-sync.mjs`
- `agent-registry-load.mjs`
- `agent-spawn-guard-hook.mjs`
- `agent-util-log.mjs`
- `agent-watchdog.mjs`
- `aggressive-killer-stop.mjs`
- `agi-safety-envelope-guard.mjs`
- `ai-auto-command-router.mjs`
- `ai-duplication-guard.mjs`
- `ai-feature-recommend.mjs`
- `ai-session-sync.mjs`
- `ai-system-activate.mjs`
- `allow-superseding.mjs`
- `anti-regression-auto-sweep.mjs`
- `appdata-junction-guard.mjs`
- `archived-skill-suggest.mjs`
- `async-pattern-checker.mjs`
- `auto-bug-hunt-after-build.mjs`
- `auto-fork-executor.mjs`
- `auto-learn-budget-guard.mjs`

_…and 344 more in `HOOK_WIRING_AUDIT.json`._

---

`scripts/harness-wiring-audit.mjs --json --md` regenerates this report.
Stop hook `stop-wiring-audit-suggest.mjs` surfaces critical/warn findings at session end.
Knob: `PRISM_WIRING_AUDIT_SUGGEST_DISABLE=1`.
