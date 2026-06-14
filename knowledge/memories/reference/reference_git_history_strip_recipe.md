---
name: reference_git_history_strip_recipe
description: Recipe (2026-05-12) for stripping oversized blobs from PRISM git history when GitHub push rejects on 100MB-blob limit; survived the OCTOPUS-NEURAL aftermath
aliases: reference_git_history_strip_recipe
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.129Z
---


# Stripping oversized blobs from PRISM git history

**When to use:** GitHub rejects a push with `remote: error: File X is YYY MB; this exceeds GitHub's file size limit of 100.00 MB` or `Large files detected. You may want to try Git Large File Storage`.

**Origin:** 2026-05-12, when `cad-fusion-live-ms0` was 170 commits ahead of origin and the push rejected on (a) 3.2 GB Whisper model weights in `models/*.bin` baked into history months earlier, (b) auto-regen `state/shared/system-viz/system-graph.json` peaking at 182 MB across 8 historical commits, and (c) rotating `state/logs/audit.jsonl` snapshots over 39 MB. Total `.git/` was 42.49 GB before strip.

## The full recipe (tested end-to-end)

### 0. Pre-flight

```bash
# Locate every blob in git history > 5 MB
cd H:/prism
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectsize) %(rest)' | \
  awk '$1=="blob" && $2 > 5000000 {print $2"\t"$3}' | \
  sort -rn | head -50
```

Group results by directory. Anything that looks like:
- auto-regen output (system-viz graphs, MILESTONE_PROGRESS regens, BUILD_STATE regens)
- model weights (`*.bin`, `*.pth`, `*.gguf`, `*.safetensors`)
- LSP/tooling cache (`mcp-server/.serena/`)
- rotating logs (`*.jsonl` snapshots)
- build artifacts (`_BUILD/`, `c/tmp/`, `mcp-server/tmp/`, `mcp-server/dev/null`)
- HTML reports rebuilt on demand

→ candidate for stripping.

### 1. Backup `.git/` before any destructive op

```powershell
# 42 GB took ~25 min via robocopy
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = "H:\prism-backups\dotgit-pre-rewrite-$ts"
New-Item -ItemType Directory -Path $backup -Force | Out-Null
Start-Process -FilePath "robocopy.exe" `
  -ArgumentList @("H:\prism\.git", $backup, "/MIR", "/MT:8", "/R:1", "/W:1", "/NP", "/NFL", "/NJH", "/NJS") `
  -WindowStyle Hidden -PassThru
```

**Do NOT use `git bundle create --all`** — MinGW bash on Windows OOMs on packs over 100 MB (`fatal: Out of memory, malloc failed (tried to allocate 134105886 bytes)`). Robocopy doesn't have this limit because it streams files.

### 2. Install git-filter-repo

```bash
H:/Tools/python/python.exe -m pip install --quiet git-filter-repo
# Installs to: H:/Tools/python/Scripts/git-filter-repo.exe
```

### 3. Build paths-to-strip file

```
# H:/prism-backups/filter-repo-paths.txt
models/
state/shared/system-viz/
state/logs/audit.jsonl
mcp-server/.serena/
c/tmp/
mcp-server/tmp/
mcp-server/dev/null
mcp-server/c/tmp/
_BUILD/
archives/mcp-server.zip
archives/mcp-server-data.zip
PRISM_v8_89_002_TRUE_100_PERCENT.html
PRISMv1.html
registries/_archive/COMPLETE_HIERARCHY_v15.json
```

### 4. Commit `.gitignore` additions FIRST

filter-repo refuses on a dirty working tree. Stage and commit `.gitignore` updates excluding the same paths BEFORE running filter-repo — that commit will also be carried through the rewrite.

```
# .gitignore additions
models/
*.bin
state/shared/system-viz/
mcp-server/.serena/
mcp-server/dev/null
mcp-server/tmp/
c/tmp/
_BUILD/
PRISM_v8_89_002_TRUE_100_PERCENT.html
PRISMv1.html
registries/_archive/COMPLETE_HIERARCHY_v15.json
```

### 5. Run filter-repo via PowerShell (NOT bash)

**Bash will OOM on this scale.** MinGW per-process heap limit. Must go through PowerShell with explicit `git.exe` path:

```powershell
$env:Path = "C:\Program Files\Git\bin;C:\Program Files\Git\cmd;$env:Path"
Push-Location H:\prism

& "H:\Tools\python\python.exe" -m git_filter_repo `
  --invert-paths `
  --paths-from-file H:\prism-backups\filter-repo-paths.txt `
  --force

Pop-Location
```

Output during a real run looks like `Parsed 1 commits…Parsed 4567 commits` then `HEAD is now at <sha>` then `New history written in 24.46 seconds; now repacking/cleaning…`. If you see no output and exit 0, the run was a no-op (probably wrong invocation method).

### 6. Expected: gc may fail with `fatal: bad tree object` on transient crash dumps

filter-repo's final `git gc --prune=now` may bomb on stale `fast_import_crash_*` files or single corrupt loose objects. This is NOT actual damage — the refs ARE rewritten correctly. To verify:

```bash
# Should return EMPTY — the corrupt object is not reachable from any ref
git rev-list --objects --all | grep <corrupt-sha>
```

If empty, **the corruption is orphaned**. Quarantine (not delete) the corrupt object:

```powershell
$qdir = "H:\prism-backups\corrupt-quarantine-$(Get-Date -Format yyyyMMdd-HHmmss)"
New-Item -ItemType Directory -Path $qdir -Force | Out-Null
Move-Item H:\prism\.git\objects\<dir>\<rest> $qdir\
Move-Item H:\prism\.git\fast_import_crash_* $qdir\ -ErrorAction SilentlyContinue
```

### 7. gc may STILL OOM — that's fine

`git gc --prune=now --aggressive` on a 42 GB `.git/` will hit MinGW git's heap limit (`fatal: Out of memory, realloc failed`). The push doesn't need gc — GitHub only receives **reachable** objects. The orphaned-blob cleanup is a separate (deferrable) milestone:
- Strategy: `git clone --bare https://github.com/...` into a sibling dir → swap into place
- Or: install Git for Windows 64-bit if you only have 32-bit; the 32-bit binary is what's hitting the 2 GB heap ceiling

### 8. Re-add origin (filter-repo strips it)

```bash
git remote add origin https://github.com/markjvillanueva3-cloud/PRISMV9.git
git fetch origin cad-fusion-live-ms0   # required for --force-with-lease to have a baseline
```

Without the fetch, push fails with `[rejected] cad-fusion-live-ms0 -> cad-fusion-live-ms0 (stale info)`.

### 9. Force-push

```bash
git push --dry-run --force-with-lease origin cad-fusion-live-ms0   # verify
git push --force-with-lease origin cad-fusion-live-ms0             # commit
```

Real push took **19 seconds** for 4567 rewritten commits (smart-protocol pack-on-the-wire only sends reachable objects).

### 10. Post chat-bus warning

```bash
node H:/prism/.claude/helpers/agent-coordination.mjs post \
  --agent Claude \
  "[<MS-ID>] DONE: force-pushed rewritten <branch>. PEER CHATS: run 'git fetch origin <branch> && git reset --hard origin/<branch>' to sync."
```

## Failure modes observed (do NOT repeat)

1. **`git bundle create --all` for the backup** — OOMs on every Windows MinGW bash; use robocopy
2. **Running filter-repo via Bash** — MinGW heap OOMs after ~265 commits parsed
3. **`& git ... 2>&1` in PowerShell without `$env:Path` prefix** — PS can't find git.exe even though Bash can
4. **`--force-with-lease` before `git fetch`** — `(stale info)` rejection because lease has no baseline
5. **Not committing `.gitignore` before filter-repo** — dirty-tree rejection
6. **Re-running `git remote add origin` without first checking** — silent skip, then push fails with `'origin' does not appear to be a git repository`

## Companion memory

[[reference_git_history_strip_event_2026_05_12]] — the specific instance, with SHA hashes, peer commits affected, recovery decisions made.

## Anti-rules (don't violate)

- Never `git push --force` to origin without dry-run first
- Never delete the backup until peers have all reset (give it ≥1 week)
- Never strip a path without confirming it's truly auto-regen (check if any non-regen process writes to it)
- Per [[feedback_no_git_stash_shared_tree]], never `git stash` in the shared tree mid-rewrite
- Per [[feedback_never_delete_only_disable]], quarantine corrupt objects (move to backup) instead of `rm`
