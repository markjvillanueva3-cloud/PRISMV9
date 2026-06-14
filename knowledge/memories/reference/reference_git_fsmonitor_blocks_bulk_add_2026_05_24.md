---
name: git-fsmonitor-blocks-bulk-add-2026-05-24
description: git add of 1000+ files in H:/PRISM hangs indefinitely (<1s CPU, lock untouched 10+ min) when fsmonitor is active. Bypass with `git -c core.fsmonitor=false add <dir>` or kill the hung process + retry. Discovered iter18b shipping 1401 AUTOGEN-SPEC files.
aliases: reference_git_fsmonitor_blocks_bulk_add_2026_05_24
type: reference
slot: india
source: prism-memory
synced: 2026-06-09T14:54:09.128Z
---


# git-add hangs on 1000+ files when fsmonitor enabled — 2026-05-24

## Symptom

`git add state/shared/college-course-specs/` (1008 files) hangs for 10+ minutes:
- Process alive, but `<1s CPU` total
- `H:/PRISM/.git/index.lock` exists but mtime unchanged 10+ min
- `Get-Process` shows alive; `Stop-Process` works
- Lock file becomes "Device or resource busy" via `rm -f` (Windows file handle)
- Killing the process releases the lock cleanly

## Cause

`fsmonitor--daemon` is integral to PRISM's H: drive setup (CLAUDE.md §[[reference_session_continuity_stack_2026_05_15|SESSION CONTINUITY STACK]] references it). When `git add` runs over 1000+ untracked files, it queries fsmonitor per-file. fsmonitor stalls on shared-tree contention with peer chats, blocking the add indefinitely.

The peer git operations DO eventually release the lock between calls — the issue is the bulk-add itself, not the cross-chat contention. Single-file or small-batch adds work normally.

## Bypass (proven in iter18b commit `6422115748`)

```bash
# Skip fsmonitor for the duration of this command only
command git -c core.fsmonitor=false add state/shared/college-course-specs/
```

Result: 1401 files staged in <10s instead of timing out at 10+ min.

For per-batch staging when even fsmonitor-bypass is too big:
```bash
for prefix in a b c d e f g h i j k l m n o p q r s t u v w x y z; do
  command git -c core.fsmonitor=false add "state/shared/college-course-specs/AUTOGEN-SPEC-jm-die-cnc_lathe_${prefix}*"
done
```

## Recovery from a stuck git-add

```powershell
# Find the stuck PID
Get-CimInstance Win32_Process -Filter "Name = 'git.exe'" | Select-Object ProcessId, CommandLine
# Kill it (safe if it's YOUR session's add — never kill peer adds without authorization)
Stop-Process -Id <PID> -Force
# Clear the lock
Remove-Item H:/PRISM/.git/index.lock -Force
```

If `Remove-Item` fails with "being used by another process" → wait 10-30s for Windows to release the handle, then retry. Or trigger via Bash: `command rm -f H:/PRISM/.git/index.lock` (sometimes works when PS doesn't).

## Apply

- For any bulk `git add` on H:/PRISM with 100+ files → use `git -c core.fsmonitor=false add`
- The Git auto-config hook for PRISM should add this as a default for large adds (follow-up: amend `.git/config` or settings.json to set this fleet-wide)
- If a chat reports "git add hung" with the symptom pattern above, immediately attempt the fsmonitor bypass

Related: [[reference_college_course_autogen_specs_2026_05_24]] · [[feedback_commit_prefix_main_on_shared_tree]] · [[feedback_conflict_fork_rule]]
