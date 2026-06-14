---
name: bash-vs-powershell-on-windows
category: software-engineering
domain: backend-dev
tags: [windows, bash, powershell, shell, msys, host-os, prism-development, ai-development]
last_updated: 2026-05-18
---

# Bash vs PowerShell on Windows — picking + the interop gotchas

PRISM's primary host is Windows 11 + PowerShell 7+ (pwsh), but the Bash tool routes through MSYS/Git-Bash. Every chat ends up running both. The two shells have **incompatible redirect syntax**, **different ambient utilities**, **different path quoting**, and **different fork semantics**. Picking the wrong one is how a "simple check command" times out for 50s or returns ambiguous-redirect garbage. This wiki names the picking rule, the syntax mismatches that recur, the lived gotchas from PRISM sessions, and the PRISM-specific patterns that work in both.

## The picking rule — one sentence

**Reach for Bash for git/grep/sed/awk/coreutils-style work; reach for PowerShell for Windows-specific facts (processes, scheduled tasks, services, registry, CIM, Stop-Process, ACLs).**

When in doubt, ask: *"is the answer I want a unix-style text-stream pipe (Bash) or a Windows OS object (PowerShell)?"* If the answer is "neither, just a simple file op," prefer the dedicated tool (Read/Write/Edit/Grep/Glob) over either shell.

## The redirect syntax mismatch — `$null` vs `/dev/null`

The single most common failure mode this session and across PRISM history:

```bash
# BASH — this WORKS
ls foo 2>/dev/null
ls foo > /dev/null
node script.mjs 2>&1 | grep ERROR
```

```powershell
# POWERSHELL — bash syntax FAILS here
ls foo 2>/dev/null       # ❌ ambiguous redirect / treats /dev/null as a filename
node script.mjs 2>&1     # ❌ may or may not work depending on host
```

```powershell
# POWERSHELL — correct
ls foo 2>$null
node script.mjs 2>&1     # ✓ works since PS 7
```

```bash
# BASH — POWERSHELL syntax FAILS here
ls foo 2>$null           # ❌ "$null: ambiguous redirect" (lived this session)
```

The PRISM CLAUDE.md tool description for the PowerShell tool calls this out explicitly: *"`2>/dev/null` → `2>$null`"*. The Bash tool is silent on the inverse but the failure is loud.

**Mnemonic:** `$null` is a *PowerShell variable*, `/dev/null` is a *unix special file*. Use the form whose universe matches the shell.

## Path quoting and slashes

Both shells accept forward-slash paths on Windows in most contexts — `H:/prism/file.md` works in both. But:

```bash
# Bash — backslash IS escape; use forward slashes for paths
cd H:/prism/mcp-server                  # ✓
cd H:\prism\mcp-server                  # ❌ backslashes interpreted as escapes
```

```powershell
# PowerShell — both work, but forward slashes preferred for cross-shell scripts
cd H:\prism\mcp-server                  # ✓
cd H:/prism/mcp-server                  # ✓
& "H:\path with spaces\app.exe" arg     # ✓ — call operator for spaces
```

Always quote paths with spaces in both. Both shells respect double-quoting; only PowerShell needs the `&` call-operator for executing a quoted path.

## Ambient utility availability

The Bash tool on Windows brings MSYS/Git-Bash utilities. PowerShell does not.

| Utility | Bash | PowerShell |
|---|---|---|
| `grep`, `sed`, `awk` | ✓ | ❌ (use `Select-String` / `-replace` / `ForEach-Object`) |
| `stat -c "%s %Y"` | ✓ | ❌ (use `Get-Item` + `.Length` / `.LastWriteTime`) |
| `head`, `tail` | ✓ | ❌ (use `Select-Object -First N` / `-Last N`) |
| `find` | ✓ (POSIX find) | ❌ (use `Get-ChildItem -Recurse`) |
| `which` | ✓ | ❌ (use `(Get-Command name).Source` or `where.exe`) |
| `touch` | ✓ | ❌ (use `New-Item -ItemType File`) |
| `git`, `node`, `npm` | ✓ | ✓ |
| `Get-Process`, `Get-CimInstance`, `Get-ScheduledTask` | ❌ | ✓ |
| `Stop-Process`, `Set-Service`, `icacls` | ❌ | ✓ |

The PRISM CLAUDE.md PowerShell-tool description has a long "Unix commands that DO NOT exist in PowerShell" list — read it before using PS for unix-style work.

## Fork semantics — backgrounding

Bash supports `&` and `&&`/`||` natively. PowerShell 7+ supports `&&`/`||` (chain operators) but `&` means **background-job** (still creates a Job object, doesn't detach).

```bash
# Bash background
long_command &              # ✓ detached
cmd1 && cmd2 || cmd3        # ✓ chain
```

```powershell
# PowerShell
long_command &              # ✓ PS 7+ starts as Job — NOT a detached process
cmd1 && cmd2 || cmd3        # ✓ chain (PS 7+)
Start-Job { long_command }  # ✓ explicit job
Start-Process -NoNewWindow -RedirectStandardOutput log.txt powershell.exe -ArgumentList "-File", "script.ps1"  # detach
```

For PRISM's `run_in_background: true` Bash tool — that's a separate mechanism, not the shell `&`. See [[parallel-tool-call-discipline]] for the three concurrency primitives.

## The interactive-flag trap

**Neither shell, via the PRISM Bash/PowerShell tools, supports interactive prompts.** Tools that demand a TTY (e.g. `git rebase -i`, `git add -i`, `gh auth login` interactive flow, `Read-Host`, `Get-Credential`, editor invocations) will hang. The CLAUDE.md tool descriptions list these explicitly.

Mitigations:
- For git: never use `-i` flags from the tool. If you need an interactive rebase, the user must do it.
- For `gh auth login`: tell the user to run it themselves with `! gh auth login` so it lands in their terminal.
- For confirmation prompts: pass `-Confirm:$false` (PowerShell), `-y` / `--yes` / `--force` (CLI tools), or pre-stamp the input.

## Capturing exit codes

```bash
# Bash
cmd
echo "exit=$?"
```

```powershell
# PowerShell
cmd
"exit=$LASTEXITCODE"        # for native exes
"ps_success=$?"              # for PS cmdlets (true/false, not exit code)
```

A common confusion: `$?` in PowerShell is a boolean for cmdlet success, NOT the native exe exit code. Use `$LASTEXITCODE` for native programs.

## Multi-line strings — the here-string trap

```bash
# Bash heredoc — straightforward
git commit -m "$(cat <<EOF
Subject line

Body paragraph.
EOF
)"
```

```powershell
# PowerShell here-string — single-quoted to avoid variable expansion
git commit -m @'
Subject line

Body with $literal dollars and `backticks` preserved.
'@
```

**Critical:** the closing `'@` MUST be at column 0 (no leading whitespace). Indenting it is a parse error. Use single-quoted `@'...'@` unless you NEED `$variable` expansion (then `@"..."@`).

## When to use which — PRISM-specific tasks

| Task | Shell | Reason |
|---|---|---|
| `git add`, `commit`, `log` | Bash | RTK prefix routing + bash heredoc for multi-line `-m` |
| `npm run build` / `vitest` | Bash | RTK works in bash; standard dev surface |
| Search source files | Grep tool (not shell) | Faster + integrates with permission UI |
| List directory | Glob tool / `ls` | Glob preferred; `ls` works in both |
| Check process list | PowerShell | `Get-Process` returns real OS objects |
| Kill a process | PowerShell | `Stop-Process` |
| Check scheduled tasks | PowerShell | `Get-ScheduledTask` |
| File mtime | Bash `stat -c %Y` | unix-style + cross-script portable |
| File size | Bash `stat -c %s` OR PowerShell `(Get-Item).Length` | either |
| Install scheduled task | PowerShell installer script | Native cmdlets |
| Read/Edit file content | Read / Edit tool (not shell) | Tracker integration |

For PRISM, **default to Bash unless you need a Windows-OS object** — most dev work is bash-shaped, and the RTK token-optimizer is bash-routed.

## RTK prefix — bash-only

`rtk` (Rust Token Killer) wraps ~100 bash commands for 60-90% token savings. It is bash-only. PowerShell doesn't see it. CLAUDE.md is explicit: **always prefix bash with `rtk`** — `rtk git status`, `rtk npm run build`, `rtk vitest run`. The PRISM hook stack auto-rewrites bare commands to RTK form in many cases.

PowerShell commands don't get RTK. Plan accordingly.

## Lived gotchas — PRISM sessions

1. **`ls foo 2>$null` in Bash → "$null: ambiguous redirect"** (lived this session, twice). Use `2>/dev/null` in Bash.
2. **`Set-Content`/`Out-File` adds a BOM on PS 5.1** — PRISM convention is UTF-8 without BOM. PS 7+ default is BOMless; PS 5.1 you must specify `-Encoding UTF8` (BOMless on PS 7, BOM on 5.1) or `-Encoding utf8NoBOM` (PS 7+ only).
3. **`wmic` is deprecated** — replace with `Get-CimInstance`. PRISM `terminal-window-id.mjs` hit this 2026-05-15 (the resolver flake fix).
4. **`git log --all -- <uncommitted-path>` hangs forever** — 285-second hang lived this session. Use `git log -1 -- <path>` (no `--all`) for "is this file committed?" questions.
5. **Bash backtick paths fail with backslash escapes** — paste paths as forward-slash form.
6. **PowerShell cmd-line lengths are roomy; bash on Windows is tighter** — long argument lists may need batching in bash.
7. **Single-quoted bash `'` vs PowerShell `'` — both forbid interpolation, but PS allows `''` to embed a single quote; bash uses backslash escape outside the string.**
8. **`> /dev/null 2>&1` for "suppress everything"** in bash; the PS equivalent is `*> $null` (suppress all streams).

## Anti-patterns

- **`ls foo 2>$null` in Bash** — fails with ambiguous-redirect. Use `/dev/null`.
- **`Set-Content` without `-Encoding`** on PS 5.1 → BOM contamination of UTF-8 files.
- **`wmic` calls** — deprecated; switch to `Get-CimInstance`.
- **Bash `find` against deep PRISM tree** — slower than Glob tool; prefer `Glob("*.md", path: "<narrow>")`.
- **`Read-Host`, `Get-Credential`, `Out-GridView`** in any tool-routed PS — hang.
- **`git ... -i` flags** in either shell — interactive editor invocation will hang.
- **Long PS one-liners with `;` chaining** when you mean conditional — `;` runs all even on failure; use `&&` for conditional.
- **Mixing single-quote here-string with `$var` expectation** — `@'...$var...'@` literally yields `$var`; need `@"..."@` for expansion.

## Checklist — every shell command

- [ ] Is this a coreutils/git task or a Windows-OS-objects task? Pick accordingly.
- [ ] Is the redirect syntax right for the shell? (`2>/dev/null` in bash, `2>$null` in PS)
- [ ] Forward-slash paths (or properly quoted)?
- [ ] If bash → RTK prefix?
- [ ] If multi-line `-m` → bash heredoc OR PowerShell single-quoted here-string with `'@` at column 0?
- [ ] Capturing exit: `$?` in bash, `$LASTEXITCODE` in PS for native exes?
- [ ] No interactive flag (`-i`, prompts)?

## Related

- [[parallel-tool-call-discipline]] — three concurrency primitives (the shells are layered under)
- [[git-shared-index-hazards]] — shell-specific git anti-patterns
- CLAUDE.md TOKEN ECONOMY (RTK section) — bash-specific token routing
- CLAUDE.md PowerShell tool description — full unix-equivalent table for PS
- CLAUDE.md Bash tool description — git+gh notes, background/Monitor primitives
