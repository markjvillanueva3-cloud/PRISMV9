---
type: "chat-session"
source: "claude-code-cli"
session_id: "3fad7eef-2c64-4003-8de1-69a4e3e93afc"
title: "fix my claude code cli please. getting this error everytime i try to start a ter"
date: "2026-05-15"
first_ts: "2026-05-15T01:18:19.582Z"
last_ts: "2026-05-15T01:21:42.539Z"
cwd: "H:\\"
messages: 19
user_msgs: 7
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--/3fad7eef-2c64-4003-8de1-69a4e3e93afc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:38:37"
---

# fix my claude code cli please. getting this error everytime i try to start a ter

> **claude-code-cli** | 2026-05-15 | 19 msgs (7 user / 12 assistant) | cwd: H:\
> Raw: `H:/.claude/projects/H--/3fad7eef-2c64-4003-8de1-69a4e3e93afc.jsonl`

## Transcript

### User | 2026-05-15T01:18:19.825Z

fix my claude code cli please. getting this error everytime i try to start a terminal

& : The term 'C:\Users\wompu\AppData\Roaming\npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling
of the name, or if a path was included, verify that the path is correct and try again.
At C:\Users\wompu\AppData\Roaming\npm\claude.ps1:14 char:5
+   & "$basedir/node_modules/@anthropic-ai/claude-code/bin/claude.exe"  ...
+     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (C:\Users\wompu\.../bin/claude.exe:String) [], CommandNotFoundException
    + FullyQualifiedErrorId : CommandNotFoundException

fix my claude code cli please. getting this error everytime i try to start a terminal & : The term 'C:\Users\wompu\AppData\Roaming\npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling
of the name, or if a path was included, verify that the path is correct and try again.
At C:\Users\wompu\AppData\Roaming\npm\claude.ps1:14 char:5
+   & "$basedir/node_modules/@anthropic-ai/claude-code/bin/claude.exe"  ...
+     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (C:\Users\wompu\.../bin/claude.exe:String) [], CommandNotFoundException
    + FullyQualifiedErrorId : CommandNotFoundException

### Assistant | 2026-05-15T01:18:40.518Z

I'll diagnose the broken installation first, then fix it. Let me investigate the actual state of things.

### Assistant | 2026-05-15T01:18:45.089Z

[tool_use: PowerShell]

### User | 2026-05-15T01:18:46.380Z

[tool_result] === npm global dir ===

Name                                  Length
----                                  ------
node_modules                                
ccusage                               411   
ccusage.cmd                           336   
ccusage.ps1                           849   
claude                                308   
claude-code-intelligence              451   
claude
... [+3622 chars truncated]

### Assistant | 2026-05-15T01:18:50.407Z

[tool_use: PowerShell]

### User | 2026-05-15T01:18:51.764Z

[tool_result] === node/npm ===
v24.13.0
11.6.2
npm prefix:
C:\Users\wompu\AppData\Roaming\npm
=== where claude ===

Name       Source                                       
----       ------                                       
claude.ps1 C:\Users\wompu\AppData\Roaming\npm\claude.ps1
claude.cmd C:\Users\wompu\AppData\Roaming\npm\claude.cmd
claude     C:\Users\wompu\AppData\Roaming\npm\claude    
cla
... [+2270 chars truncated]

### Assistant | 2026-05-15T01:19:36.285Z

Found the root cause. Let me gather a few more details before fixing.

**Root cause:** Claude Code's auto-updater renamed the running binary `claude.exe` → `claude.exe.old.1778804333109` (on 5/13 4:43 PM), but the download of the replacement `claude.exe` never completed. So the npm shims (`claude.ps1/.cmd`) now point to a file that doesn't exist.

### Assistant | 2026-05-15T01:19:45.704Z

[tool_use: PowerShell]

### User | 2026-05-15T01:19:47.017Z

[tool_result] === package.json version ===


name    : @anthropic-ai/claude-code
version : 2.1.140
bin     : @{claude=bin/claude.exe}




=== any leftover claude.exe* / temp downloads in bin ===

Name                            Length LastWriteTime       
----                            ------ -------------       
claude.exe.old.1778804333109 227456160 5/13/2026 4:43:40 PM



=== claude.cmd sh
... [+21230 chars truncated]

### Assistant | 2026-05-15T01:20:48.581Z

Now I have the full diagnosis. Here's what's wrong:

| Install | `bin/claude.exe` status |
|---|---|
| **npm global** (`%APPDATA%\npm`, what your PATH hits first) | ❌ renamed to `claude.exe.old.1778804333109` — auto-updater renamed the old binary on 5/13 but never landed the replacement |
| `H:\Tools\nodejs` (portable, currently running this session) | ✅ valid `claude.exe`, 5/14 |

The npm-global install is the one your terminal resolves, and its binary is missing. Disk space is fine (190 GB free), npm/node work. The cleanest fix is reinstalling the npm package — that re-runs its installer and drops a fresh `claude.exe` back in `bin/`.

### Assistant | 2026-05-15T01:20:49.905Z

[tool_use: PowerShell]

### User | 2026-05-15T01:20:53.485Z

[tool_result] changed 2 packages in 2s

### Assistant | 2026-05-15T01:21:01.075Z

`changed 2 packages in 2s` — fast, which means npm may have skipped re-running the binary download script (it thinks 2.1.140 is already installed). Let me verify whether the binary actually came back.

### Assistant | 2026-05-15T01:21:03.398Z

[tool_use: PowerShell]

### User | 2026-05-15T01:21:05.326Z

[tool_result] === bin/ contents now ===

Name          Length LastWriteTime       
----          ------ -------------       
claude.exe 228456096 5/14/2026 8:20:53 PM



claude.exe RESTORED

### Assistant | 2026-05-15T01:21:10.490Z

`claude.exe` is restored — 228 MB, freshly written, same size as your known-good portable copy. Now let me confirm it actually runs and the shims resolve correctly.

### Assistant | 2026-05-15T01:21:13.952Z

[tool_use: PowerShell]

### User | 2026-05-15T01:21:15.938Z

[tool_result] === direct exe ===
2.1.142 (Claude Code)

=== via .cmd shim ===
2.1.142 (Claude Code)

=== via PATH resolution (what your terminal does) ===
resolves to: C:\Users\wompu\AppData\Roaming\npm\claude.ps1
2.1.142 (Claude Code)

### Assistant | 2026-05-15T01:21:38.026Z

Fixed. ✅

`claude --version` now returns **2.1.142** through all three resolution paths — including `claude.ps1`, the exact shim that was throwing your error.

## What was wrong
Claude Code's auto-updater renamed the running binary `claude.exe` → `claude.exe.old.1778804333109` on 5/13, but the replacement download never landed (interrupted update). The npm shims kept pointing at `bin/claude.exe`, which no longer existed — so every `claude` invocation failed with `CommandNotFoundException`.

## What I did
`npm install -g @anthropic-ai/claude-code@latest` — re-ran the package's installer, which downloaded a fresh `claude.exe` (228 MB) into `bin/` and bumped you 2.1.140 → 2.1.142. Verified working via direct exe, `.cmd` shim, and PATH resolution.

## Two leftover notes

1. **Stale 227 MB file:** `claude.exe.old.1778804333109` is still sitting in that `bin/` folder — dead weight from the failed update. The updater *sometimes* cleans these up but didn't here. Want me to delete it? (Pure artifact, safe to remove now that the real binary is back.)

2. **"Every time I start a terminal":** your PowerShell `$PROFILE` doesn't call `claude`, so something else auto-launches it on terminal start (likely a Windows Terminal startup action or VS Code terminal profile). That's fine — whatever it is will now succeed since the command works again. If you *didn't* intend claude to auto-launch on every terminal, let me know and I'll hunt down where that's configured.

One heads-up: this was an interrupted auto-update. If it recurs, the same `npm install -g` reinstall fixes it — or I can look into pinning/disabling the auto-updater.
