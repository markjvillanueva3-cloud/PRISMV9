---
name: ripgrep-install-windows-2026-05-18
description: ripgrep (rg) is absent from Windows PATH on this host — rtk falls back to direct exec and prints fallback noise on every rg-style command. Installation options + verification path. Operator-gated (won't auto-install).
aliases: [ripgrep-install-windows, Ripgrep Install Windows, ripgrep-install-windows-2026-05-18]
metadata:
  type: reference
---

2026-05-18, slot kilo (claude-e8bb7bd7). User directive: *"continue finding high roi rtk upgrades and html utilization in place of md files"*.

## What's missing

`command -v rg` returns nothing on this Windows host. `rtk` wraps grep-style commands and resolves the underlying binary via PATH; when `rg` is absent it emits:

```
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
```

Per `rtk grep`/`rtk find` invocation, that's a few extra tokens of advisory plus the warning. Cumulatively it's noise across a session, but functionally rtk's fallback (direct exec of grep or whatever Windows path-name resolution finds) still works.

## Why this matters for rtk ROI

PRISM's session-token economy depends on `rtk grep` being the cheap fallback for "I need to search but Grep tool can't reach this file class". Without ripgrep, the rtk wrapper silently downgrades to `grep` (POSIX layer's grep, much slower + less efficient on large repos). The fleet-wide loss isn't catastrophic — the PRISM `Grep` tool covers most use cases — but installing ripgrep makes the rtk fallback genuinely fast.

## Install options (Windows, operator-gated)

Pick ONE — all reversible:

```powershell
# Option A — winget (preferred, native Windows package manager)
winget install BurntSushi.ripgrep.MSVC

# Option B — Cargo (if Rust toolchain present)
cargo install ripgrep

# Option C — Pre-built binary from GitHub releases
# Download from https://github.com/BurntSushi/ripgrep/releases/latest
# (look for *x86_64-pc-windows-msvc.zip*), extract `rg.exe` to H:/Tools/
# and ensure H:/Tools is on PATH.

# Option D — Chocolatey
choco install ripgrep
```

## Verify after install

```bash
command -v rg && rg --version | head -1
# Expected: /c/Program Files/.../rg + "ripgrep N.N.N"
```

After install, rtk's `rg`-resolution path goes quiet (no fallback warning) and `rtk grep` actually exercises ripgrep's parallel walker instead of the POSIX grep fallback.

## Why I didn't install it myself

Software installation is a non-reversible-in-session system change. The operator decides whether to add a new binary to PATH. The hook + rtk wrappers already work without it (just noisier than they need to be).

## Companion changes shipped this session (slot kilo)

- `scripts/md-to-html.mjs` — now injects `<meta prism-source-hash>` so `html-companion-guard.mjs` can drift-check any md→html pair, not just specs/research.
- `.claude/hooks/html-companion-guard.mjs` — SPEC_FILE_RE extended via new `isCompanionTarget()` helper to cover `state/shared/dashboards/patches/**` + root `CLAUDE.md`/`MEMORY.md` and their `.html` siblings.
- `.claude/hooks/rtk-prefix-reminder.mjs` — `buildReminder()` now redirects `cat` → Read tool and `ls` → Glob tool per CLAUDE.md "Tool selection" rule, instead of suggesting `rtk cat`/`rtk ls` (which contradicts the rule).
- `.claude/hooks/__tests__/rtk-prefix-reminder.test.mjs` — 4 new test cases for the cat/ls/git/DoS branches. 15/15 PASS.

## Related

- [[reference_rtk_hook_dead_windows_fix_2026_05_18]] — the earlier rtk dead-hook removal that surfaced the `rg not found` noise
- [[rtk-setup]] — operator skill, references Windows caveats
- [[feedback_never_delete_only_disable]] — the disable-don't-delete rule that makes "install if you want, ignore if you don't" the right shape here
