---
name: reference_conhost_orphan_window_storm_2026_06_22
description: "Console/terminal windows popping up over apps = orphaned conhost.exe from the harness's per-turn hook spawns; fixed by a hidden persistent janitor (slot:golf, 2026-06-22)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.529Z
aliases: reference_conhost_orphan_window_storm_2026_06_22
---


Operator-reported (2026-06-22, slot:golf): "terminal windows keep popping up over other apps."

**Root cause:** the Claude Code harness launches ~284 hooks/turn via the *extensionless*
`H:/.claude/bin/portable-node` shim (which is a `#!/bin/bash` script, sibling to
`portable-node.cmd`). Across the 7+ active fleet chats every hook invocation spawns a
`conhost.exe` console window that **orphans** when its short-lived parent (the hook node
process) exits — orphaned conhosts do NOT auto-close, so leftover windows pile up over the
user's apps. Live capture: **206 conhost + 95 node in 40s** (~5 windows/sec). Empirical
spawn test showed the bare extensionless shim leaks conhosts even with `windowsHide:true`
(consistent with Git-Bash-spawned consoles that `windowsHide` can't suppress).

**Key fact:** window CREATION is in the *harness* hook-spawn path — NOT patchable from PRISM
code (the individual hooks' own internal `detached:true` spawns are already
`windowsHide:true`-correct; per-file counts confirmed windowsHide >= detached everywhere).
Mass-rewriting the 284 settings.json hook commands is high-risk fleet infra and the spawn
test was too noisy to justify it. So the strategy is **close orphans as fast as they appear**,
not prevent them.

**Fix (commit 31f1350f51, `[MAIN-FORCE] [FLEET-HYGIENE]/U-CONHOST-JANITOR`):**
- `.claude/helpers/conhost-orphan-janitor.ps1` — single persistent process, native
  `Get-CimInstance` enumeration (NO per-tick child spawns, which would create more windows),
  closes ONLY dead-parent `conhost.exe` older than `MinAgeSec` (live-parent windows = real
  terminals/MCP, never touched). Global-mutex singleton. Kill switch
  `PRISM_CONHOST_JANITOR_DISABLE=1` (also honors `PRISM_FLEET_REAPER_DISABLE`).
- `.claude/helpers/install-conhost-janitor.ps1` — registers a hidden, no-time-limit,
  AtLogon scheduled task **"PRISM Conhost Janitor"** (current-user, no UAC needed).
- Live result: conhost **124 -> 36 in 6s**, holds at the real-window floor; new orphans
  closed within ~2-3s. Task State=Ready.

**Safety proof:** dead-parent conhosts are 100% safe to kill — 600+ closed this session with
zero impact to the active session, peers, or MCP (only windows with a *live* parent are real).

Sibling fleet-hygiene assets: [[reference_fleet_reaper_ms2_2026_05_18]] · [[feedback_golf_ancestry_orphan_reaping]].
**UPDATE 2026-06-24 (slot:golf) — the "repoint to a non-bash shim" preventive fix is DISPROVEN; do NOT re-chase it.**
Tested live: the Claude Code harness spawns git-bash for EVERY hook regardless of the command launcher —
`claude.exe -> "C:\Program Files\Git\bin\bash.exe" -c -l "<command>"` -> portable-node (confirmed via the live
bash.exe command lines). So repointing hook commands to `portable-node.cmd` does NOT remove the outer git-bash
console (git-bash CAN run the .cmd — `bash -c '"...portable-node.cmd" -e "process.exit(2)"'` returns 2 cleanly —
but the harness-spawned bash is still the window source). The launcher swap was abandoned before touching the 477
hook commands (286 in C: settings + 191 in project settings).
Per the official Claude Code docs (verified via claude-code-guide, setup.md + settings.md): there is NO supported
setting/env var to (a) switch hook execution off git-bash to cmd/powershell (only uninstalling Git for Windows does
that, which would break PRISM's bash hook shim), (b) suppress the hook-shell console window, or (c) change the bash
spawn flags / drop `-l`. `CLAUDE_CODE_GIT_BASH_PATH` sets only the bash BINARY path. The real fix is an Anthropic
feature request (windowsHide on hook-shell spawns). Until then the janitor (close dead-parent conhosts) is the only
mitigation; live hook flashes (live parent) are not preventable from PRISM code.
Bonus: while investigating, fixed a latent bug in `H:\.claude\bin\portable-node.cmd` — its `exit /b %ERRORLEVEL%`
sat INSIDE an `if exist (...)` block, so `%ERRORLEVEL%` expanded at PARSE time (stale 0), meaning any hook ever run
through that .cmd would silently fail to block (exit 2 lost). Rewritten so the node call + `set RC` + `exit /b` are
at top level; verified 0->0/1->1/2->2/>2->0 + heap cap. The .cmd is the documented git-bash-absent fallback, so the
fix matters even though hooks don't currently use it.
