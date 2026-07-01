# Forge Brainstorm — Cross-PC Seamless Operation + Master CLAUDE.md Unification

**Generated:** 2026-04-21 · Session: work PC (Mark Villanueva) · Shared via junction → both PCs

## Context

User wants to "just plug in and continue working" on either PC. This brainstorm captures the audit of H: drive assets, identifies remaining cross-PC gaps after today's junction work, and proposes phased execution for master CLAUDE.md unification + full MCP-server utilization.

## What got fixed today (baseline — DONE)

| Fix | Status | Notes |
|---|---|---|
| Portable Python on H: | ✓ installed | `H:\Tools\WPy64-3.13.12.0\python\` (stable junction `H:\Tools\python\`) |
| Shell wrappers for python | ✓ created | `H:\.claude\bin\{python,python3,py}.{cmd,sh}` — PATH-independent absolute forward to H: |
| `~/.claude` per-subfolder junctions | ✓ installed | 9 dirs: commands, agents, hooks, skills, rules, plans, plugins, helpers, bin. Real folder on C: backed up as `*.pre-junction-20260421-*`. |
| MCP config dynamic resolver | ✓ wired | Template at `H:\.claude-shared\.mcp.template.json` with `{{NODE_EXE}}` — resolver hook fills in per PC via `where node`. |
| SessionStart guards (enforcement) | ✓ wired | 4 new guards in `H:\PRISM\.claude\settings.json`: appdata-junction, portable-python, dotclaude-junctions (block), mcp-config-resolve (non-block). |
| Claude Desktop AppData junction | ⏳ PENDING | Requires quitting Claude Desktop (7 `claude.exe` running). Setup script refuses safely until Desktop closed. One command to run: `node H:\PRISM\.claude\helpers\appdata-junction-setup.mjs` |

## H: drive asset inventory (audit)

### Top-level worktrees / projects
```
H:\PRISM                     — main repo (git worktree: work/cad-complete-ms0)
H:\PRISM-MCP-SERVER          — ⚠ separate MCP copy, likely stale/duplicate
H:\prism-agi-infra-a         — git worktrees
H:\prism-ai-aware              for parallel unit development
H:\prism-ai-roadmap-handoff    across roadmap streams
H:\prism-lathe-master          (15+ worktrees total — gap: are they all in sync?)
H:\prism-mcat-p1u03
H:\prism-mill-master
H:\prism-mill-p06
H:\prism-phase-e
H:\prism-pp-agi-u06
H:\prism-pp-master
H:\prism-universal-skills
H:\prism-ussh, H:\prism-ussh-p2, H:\prism-ussh-sci
```

### Shared config & tools (cross-PC safe now)
```
H:\.claude\                  — shared Claude Code config (via ~/.claude junctions)
  ├── agents/     ← shared
  ├── bin/        ← portable tool wrappers (python.cmd etc)
  ├── commands/   ← 325 user slash commands
  ├── helpers/    ← shared
  ├── hooks/      ← shared
  ├── plans/      ← shared (this file lives here)
  ├── plugins/    ← shared
  ├── rules/      ← shared
  └── skills/     ← shared
H:\.claude-shared\           — cross-PC templates
  └── .mcp.template.json     ← {{NODE_EXE}} substitution
H:\Tools\                    — portable binaries
  ├── WPy64-3.13.12.0/       — WinPython install
  └── python/                — stable junction → WPy64
H:\Claude (cusersmarkvillanueva)\   — work-PC Desktop data (AppData target)
H:\Claude (CUserswompuAppData)\     — home-PC Desktop data (AppData target)
H:\LAUNCH\                   — 18 .bat/.ps1 launchers (Arrive/Leave sessions, etc)
```

### PRISM MCP-server capability inventory (from PRISM-INVENTORY-LATEST.md)
```
Engines            2,707          Dispatcher actions     6,560
Dispatchers           90          Formulas                 509
Registries            26          Registry entries      29,569
Algorithms            53          Toolpath strategies      698
Tests              2,608          Post processors           20
Source hooks          53          Materials              6,372
Claude hooks         234          Tools                 95,608
Scripts              361          Machines                 910
Slash cmds (local)   218          Tribal tips            4,493
Slash cmds (user)    325
```

## Identified cross-PC gaps (beyond today's fixes)

### HIGH — blocks "seamless plug in"

1. **`H:\PRISM-MCP-SERVER\` duplicate** — separate MCP copy, unclear if canonical. Likely rot. **Action:** identify which is live, delete or symlink the other.
2. **`H:\LAUNCH\*.bat` portability** — user mentioned launchers assume PC-specific Python/paths. **Action:** audit every .bat/.ps1, replace hardcoded paths with `H:\Tools\python\python.exe`, `H:\.claude\bin\*`, etc.
3. **15+ parallel `prism-*` worktrees** — each has its own `.claude/settings.json` with absolute paths. On PC swap, are they all healthy? **Action:** SessionStart guard that verifies active worktree's settings reference H: paths, not C:.
4. **Settings.local.json contains hardcoded PC-specific allowlists** — e.g. `"Bash(python \"/h/prism/.claude/hooks/lib/plan-to-rgs-sync.py\")"` is PC-agnostic because it references H:, but many entries aren't. **Action:** scrub.
5. **MCP server transport** — only `prism-mcp-server` is configured. Any other MCPs (codebase-memory, prism-safe, semgrep, claude_ai_*, plugin:linear, plugin:supabase) are listed as available but their config is somewhere else — likely in per-PC profile. **Action:** unify MCP config location on H:.
6. **Hook scripts calling `python` via PATH** — with junctioned `~/.claude/bin/` and PATH including it, this should work. But need to verify Claude Code's spawn env actually has `$HOME/.claude/bin` first. **Action:** add `H:\.claude\bin` to a known-good env source (user-level PATH, or an env: block in settings.json).

### MEDIUM — improves experience

7. **No master CLAUDE.md** — CLAUDE.md exists at `H:\PRISM\CLAUDE.md` (project), `C:\Users\*\.claude\CLAUDE.md` (global user), but no single canonical source loaded by every session on every PC. **Action:** create `H:\.claude\CLAUDE.md` (shared via junction, loaded by Claude Code as global user), consolidate rules, reference specialized per-project CLAUDE.md files.
8. **Cache/session-writes are PC-specific** (DESKTOP-N7MI1VB-* prefixes) — expected, not a bug. But "resume session" across PCs won't work because caches are local. Is that desired? User's intent unclear.
9. **`H:\.appdata\` and `H:\.auto-memory\`** — what are these? Audit.
10. **`H:\LAUNCH\1 - Arrive (Restore Sessions).bat`** — already has "arrive/leave" machinery. Extend to also verify junction integrity on arrive (run `portability-setup.mjs` idempotently).

### LOW — nice to have

11. **Container memories (user mentioned)** — probably refers to Docker/MCP memory containers. Locate and audit.
12. **GSD / protocols / auto-fire features** — all documented in PRISM CLAUDE.md already. Consolidate into master.
13. **Token savings systems** — RTK is installed, wired in global settings.json. But installation check on each PC isn't enforced.

## Proposed phases

### Phase A — **Close the loop on today's portability work** (fast, needed)
- [A1] User quits Claude Desktop, runs `appdata-junction-setup.mjs`. Claude Desktop data then lives on H: on both PCs.
- [A2] Audit + repair `H:\LAUNCH\*.bat` scripts to use only H: paths.
- [A3] Settings `env` block: prepend `H:\.claude\bin` to PATH so `python` resolves to portable.
- [A4] On home PC: user runs `portability-setup.mjs` once — identical junctions on `wompus`.
- [A5] Delete (or confirm delete-able) `H:\PRISM-MCP-SERVER\` duplicate after confirming it's not live.

### Phase B — **Master CLAUDE.md** (the big unification)
- [B1] Write `H:\.claude\CLAUDE.md` (global, shared) that:
  - Declares H: canonical locations (PRISM = H:\PRISM, tools = H:\Tools, config = H:\.claude)
  - References project CLAUDE.md files (H:\PRISM\CLAUDE.md stays authoritative for PRISM repo rules)
  - Documents the junction architecture (for future debug)
  - Lists boot-time guards and what to do if one trips
  - Cross-PC protocol: "when switching PC, check H: drive letter matches, run portability-setup.mjs with --dry-run"
- [B2] Audit and slim `H:\PRISM\CLAUDE.md` — remove duplication with master, keep PRISM-specific (physics constants, dispatcher list, SELF-AWARENESS directives).
- [B3] Deprecate `C:\Users\*\.claude\CLAUDE.md` on both PCs — replace with a one-line pointer: "See H:\.claude\CLAUDE.md (canonical)."

### Phase C — **Full MCP-server utilization**
- [C1] Survey all 6560 dispatcher actions; identify which are NOT wired into any slash command. Forge-triple gaps.
- [C2] Ensure every SessionStart injection (inventory, self-awareness, directives) references only H: paths.
- [C3] Wire a `/plug-in` slash command that runs portability-setup, self-awareness refresh, pressure check, and inventory refresh in one shot — the "I just sat down at this PC" macro.

### Phase D — **Parallel worktree sanity** (15+ `H:\prism-*`)
- [D1] Write a worktree audit tool: for each `H:\prism-*`, check its git state + whether `.claude/settings.json` references C: paths.
- [D2] Decide: keep all, archive stale ones (`mcat-p1u03`, `p06`, `p2` etc. look like phase-specific scratchpads), or consolidate under `H:\PRISM\` + git worktrees.

### Phase E — **Container + extended memory audit**
- [E1] Identify what the user means by "container memories" (Docker containers? MCP server agent memory? Both?).
- [E2] Locate, document, and ensure cross-PC shared persistence.

## Immediate next actions (in order)

1. **User runs on this PC**: Quit Claude Desktop → `node H:\PRISM\.claude\helpers\appdata-junction-setup.mjs`
2. **User runs on home PC, first time**: `node H:\PRISM\.claude\helpers\portability-setup.mjs` (does everything at once if Desktop closed)
3. **Confirm Phase B start**: proceed with master CLAUDE.md? (this is a doc-only phase, zero risk)
4. **Confirm Phase D start**: audit `H:\prism-*` worktrees for staleness/drift?

## Rollback summary (if anything goes wrong with today's work)

- **Per-subfolder junctions**: rename `C:\Users\*\.claude\<sub>.pre-junction-*` back to `<sub>`, delete junction with `cmd /c rmdir <sub>`. Backups are complete — no data loss risk.
- **Portable Python**: delete `H:\Tools\WPy64-*` and `H:\Tools\python` junction. Hooks fall back to system `python` on PATH (as before).
- **AppData junction** (when/if applied): rename `C:\Users\*\AppData\Roaming\Claude.pre-junction-backup-*` back.
- **Guards in settings.json**: remove the 4 new SessionStart hook entries in `H:\PRISM\.claude\settings.json` (or flip `continueOnError` to `true`).
