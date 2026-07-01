---
name: reference_desktop_autocompact_noop_knobs_fix_2026_06_23
description: "Desktop Claude Code \"won't compact / hits limit\" root cause + fix — the 4 PRISM autocompact env/settings knobs are NO-OPs (Claude Code ignores them); real knobs are autoCompactEnabled (settings, default true) + DISABLE_AUTO_COMPACT (env). PRISM's precompact-auto-trigger only BLOCKS tool calls (can't compact on Desktop — no terminal for SendKeys), trapping the session near the limit. Fix = PRECOMPACT_DISABLE=1 + autoCompactEnabled:true."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.552Z
aliases: reference_desktop_autocompact_noop_knobs_fix_2026_06_23
---


# Desktop app "won't compact / hits the limit" — root cause + fix (2026-06-23, slot:alpha)

Operator (via /checkin-alpha): "fix whatever is causing my claude code desktop app to not compact properly." Symptom (operator-confirmed): runs to the context limit and errors/freezes/refuses to continue instead of auto-summarizing.

## Root cause (verified)
1. **4 PRISM "autocompact tuning" knobs are NO-OPs for native compaction** — verified against official docs (https://code.claude.com/docs/en/settings): `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`, `PRECOMPACT_SOFT_TOKENS`, `PRECOMPACT_HARD_TOKENS` (env) + `autoCompactWindow` (settings.json top-level). Claude Code IGNORES them. The native threshold is NOT configurable. They only feed PRISM's own `precompact-auto-trigger.mjs` hook.
2. **The REAL native knobs:** `autoCompactEnabled` (settings.json boolean, default `true`, shown in `/config` as "Auto-compact") and `DISABLE_AUTO_COMPACT` (env var to turn OFF). Neither was set in ANY of the user's 5 settings layers → native autocompact was at default-ON, NOT disabled.
3. **PRISM's `precompact-auto-trigger.mjs` (PreToolUse) `decision:block`s every tool call at PRECOMPACT_HARD_TOKENS (900K)**, telling the model to write a handoff and rely on "native autocompact at 95%." But **on the Desktop app PRISM cannot actually compact** — its only real `/compact` actuator is terminal SendKeys (needs a console HWND / "PRISM <slot>" WT tab the Desktop app lacks — see [[reference_self_compact_and_wt_actuation_dormant_2026_06_13]]). So near the limit the hook can ONLY block → traps the session ("freezes/refuses to continue") and shadows the only real compactor (native).

Desktop = same engine, same `~/.claude/settings.json` hooks as CLI ([[reference_claude_desktop_cli_parity_2026_06_22]]), so all this machinery runs there too.

## Fix (C:/Users/wompu/.claude/settings.json → auto-mirrors to H:)
- env: `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE:"88"` → `PRECOMPACT_DISABLE:"1"` (neutralizes the blocking hook; SOFT=HARD=Infinity → hook no-ops; line 118/124-125 of precompact-auto-trigger.mjs).
- top-level: `autoCompactWindow:800000` → `autoCompactEnabled:true` (pin native autocompact ON regardless of any /config UI drift).
- Left `PRECOMPACT_SOFT/HARD_TOKENS` in place (moot under PRECOMPACT_DISABLE; avoided unverified blast radius on other hook consumers).
- Aligned with operator's standing directive "keep working until autocompaction hits, don't push back to compact" ([[reference_compaction_false_trigger_fix_2026_06_11]]).

Verified: both files valid JSON; hook returns `{continue:true,suppressOutput:true}` under PRECOMPACT_DISABLE=1; DISABLE_AUTO_COMPACT confirmed unset.

## Requires empirical verification by operator (NOT proven from here — R12)
**Restart the Desktop app** (settings/env load at session start) → run a long session → confirm it auto-compacts near the limit instead of freezing. Also check `/config` → "Auto-compact" shows ON.

## Residual (cosmetic, inert — optional cleanup)
- Project `H:/prism/.claude/settings.json` still carries `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE:"95"` + `autoCompactWindow` (no-ops; only load when H:/prism is open).
- Caveat: settings.json can be reverted by fleet automation — see [[feedback_settings_wiring_drift_2026_05_16]].
