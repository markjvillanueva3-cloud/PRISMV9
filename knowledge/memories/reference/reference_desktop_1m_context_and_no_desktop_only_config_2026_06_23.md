---
name: reference_desktop_1m_context_and_no_desktop_only_config_2026_06_23
description: "Claude Code 1M context = the model id carrying the [1m] suffix (DOCUMENTED, code.claude.com/docs/en/model-config.md). There is NO Desktop-only settings mechanism — the Desktop \"Code\" tab shares ~/.claude/settings.json + project .claude/settings.json with the CLI (verified: AppData/Roaming/.claude does NOT exist; AppData/Roaming/Claude has only Electron UI config, no settings.json). autoCompactWindow is NOT in the official settings docs (likely the source of an observed \"800K cap\" if set). 200K-after-compaction revert is undocumented."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.552Z
aliases: reference_desktop_1m_context_and_no_desktop_only_config_2026_06_23
---


# Claude Code 1M context + NO Desktop-only config (2026-06-23, slot:alpha)

Operator: "after compaction it switched back to 200K instead of 1M; fix JUST the Desktop app (not CLI) so it hits full 1M, not the 800K cap."

## Verified facts
- **1M context = model id carrying the `[1m]` suffix** — DOCUMENTED at https://code.claude.com/docs/en/model-config.md ("use the `[1m]` suffix with model aliases or full model names: `/model opus[1m]` or `/model claude-opus-4-8[1m]`"). API Opus 4.8/4.7 + Fable 5 run 1M; Max/Team/Enterprise auto-upgrade. There is NO `ANTHROPIC_BETAS` knob in model-config.md — the mechanism is the model-alias suffix.
- **NO Desktop-only settings mechanism exists.** `C:/Users/wompu/AppData/Roaming/.claude` does NOT exist; `AppData/Roaming/Claude/` holds only the Electron UI `config.json` (theme/window/oauth) + `claude-code/<version>/` bundles — NO `settings.json` (`find ... -iname settings*.json` = 0 hits under Roaming/Claude AND Local/Claude). The Desktop "Code" tab reads the SAME `C:/Users/wompu/.claude/settings.json` + project `.claude/settings.json` as the CLI. So a settings change can NEVER be Desktop-only. The only per-surface lever is the runtime `/model opus[1m]` command typed inside the Desktop app. (Corroborates + sharpens [[reference_claude_desktop_cli_parity_2026_06_22]].)
- **`autoCompactWindow` is NOT in the official settings schema** (code.claude.com/docs/en/settings.md). Two independent doc-lookup agents agreed. But the user's observed "800K cap" exactly matched a live `autoCompactWindow:800000` in the PROJECT settings → likely a real-but-undocumented compaction-trigger threshold (compact at N tokens), capping usable context below the 1M window.
- **200K-after-compaction revert is UNDOCUMENTED** — no doc explains whether the 1M extension survives a compaction boundary. Likely a Claude Code limitation/bug, not a settings gap (user's config already enabled 1M).

## Fix applied (operator chose the SHARED route — full 1M helps the CLI too)
- Global `~/.claude/settings.json` (mirrors to H:/.claude): `"model": "opus"` → `"model": "opus[1m]"` — makes the [1m] suffix INTRINSIC to the model selection instead of relying on the `opus` alias + `ANTHROPIC_DEFAULT_OPUS_MODEL` env indirection (the indirection is the suspected thing dropping [1m] post-compaction).
- Project `H:/prism/.claude/settings.json`: removed `autoCompactWindow:800000` (the 800K cap) + leftover `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE:95`.
- All 3 layers valid JSON; autoCompactWindow + PCT_OVERRIDE undefined everywhere; CLAUDE_CODE_DISABLE_1M_CONTEXT="0".

## Requires operator verification (NOT proven from here — R12)
RESTART the Desktop app (settings load at session start) → context bar should show /1M and STAY 1M after a compaction. If it STILL drops to 200K post-compaction with `opus[1m]` pinned, that is a genuine Claude Code bug to report to Anthropic; workaround = re-run `/model opus[1m]` in the Desktop app after each compaction.

## Caveats
- Change is shared (Desktop + CLI) — a true Desktop-only settings change is impossible (no separate Desktop config).
- settings.json can be reverted by fleet automation — [[feedback_settings_wiring_drift_2026_05_16]]. If 1M breaks again, re-check `"model": "opus[1m]"` + absence of autoCompactWindow.
- Project `H:/prism/.claude/settings.json` now has an uncommitted repo change.
