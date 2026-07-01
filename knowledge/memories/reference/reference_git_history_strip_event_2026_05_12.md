---
name: reference_git_history_strip_event_2026_05_12
description: 2026-05-12 history rewrite event — pushed INFRA-CLOSEOUT-MS0 + 169 peer commits to origin/cad-fusion-live-ms0 after stripping 1+ GB of oversized blobs from history
aliases: reference_git_history_strip_event_2026_05_12
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.588Z
---


# 2026-05-12 — git history strip + force-push

## Trigger

`git push origin cad-fusion-live-ms0` was rejected by GitHub:

```
remote: error: File state/shared/system-viz/l11-leaves-augmentation.json is 55.91 MB
remote: error: File state/shared/system-viz/system-graph.json is 113.21 MB; exceeds 100 MB limit
remote: error: File state/shared/system-viz/system-graph.json is 107.82 MB
remote: error: File state/shared/system-viz/system-graph.json is 113.26 MB
```

Branch was 170 commits ahead of origin. Push reject blocked the entire peer-chat fleet from publishing.

## SHA timeline

| Stage | HEAD SHA | Notes |
|-------|---------|-------|
| pre-strip | 7ef63fb1b | close-out commit, before .gitignore add |
| pre-strip | 3c139a6fe | .gitignore add commit (still in old-history SHAs) |
| pre-strip | 46c8805c3 | peer [[reference_dev_velocity_autotrigger|DEV-VELOCITY-AUTOTRIGGER]]-MS0/U-A2-A3 (last before rewrite) |
| post-strip (post-filter-repo HEAD) | aca0a66ff | new SHA for the same [[reference_dev_velocity_autotrigger|DEV-VELOCITY-AUTOTRIGGER]]-MS0 commit |
| post-strip (close-out commits remapped) | aacbe8001 | orchestrator + hook + 9 closeouts |
| post-strip (close-out commits remapped) | d8739a843 | .gitignore add |
| post-push HEAD (with peer commits piled on) | 04d41edf7 | what landed at origin/cad-fusion-live-ms0 |

## What was stripped

| Path | Blob size in history | Reason |
|------|---------------------|--------|
| `models/ggml-large-v3.bin` | 3.1 GB | Whisper model weight — don't check models into git |
| `models/ggml-base.bin` | 148 MB | Whisper base model |
| `state/shared/system-viz/system-graph.json` | 8 versions, 23-182 MB each | Auto-regen on every SessionStart |
| `state/shared/system-viz/obsidian-augmentation.json` | 134 MB peak | Auto-regen |
| `state/shared/system-viz/l11-leaves-augmentation.json` | 58 MB | Auto-regen |
| `state/shared/system-viz/audit-overlay.json` | 33 MB | Auto-regen |
| `state/shared/system-viz/graph.cypher` | 22 MB × 2 versions | Auto-regen |
| `state/shared/system-viz/h-drive-*` | 130-195 MB on disk | Auto-regen |
| `state/logs/audit.jsonl` | 31-39 MB × 8 rotation snapshots | Rotating log |
| `mcp-server/.serena/cache/typescript/document_symbols.pkl` | 41-45 MB × 3 versions | LSP cache |
| `PRISM_v8_89_002_TRUE_100_PERCENT.html` | 48 MB | Static HTML report |
| `PRISMv1.html` | 11 MB | Static HTML report |
| `_BUILD/PRISM_v8_89_002_TRUE_100_PERCENT.zip` | 13 MB | Build output |
| `archives/mcp-server.zip` | 11 MB | Archive snapshot |
| `c/tmp/`, `mcp-server/tmp/`, `mcp-server/dev/null` | 12-33 MB each | Build artifacts in weird paths |
| `registries/_archive/COMPLETE_HIERARCHY_v15.json` | 23 MB | Legacy archive snapshot |

Total reachable-blob delta: estimated 600 MB – 1 GB saved from on-wire push size. Local `.git/` still 42 GB until orphaned-pack cleanup (deferred milestone).

## Recovery infrastructure created

- **Backup of pre-rewrite `.git/`:** `H:/prism-backups/dotgit-pre-rewrite-20260512-211700/` (42.49 GB) — keep for ≥1 week as rollback safety net
- **Corrupt-object quarantine:** `H:/prism-backups/corrupt-quarantine-20260512-223020/` — holds `16ec2826...` (one orphaned loose blob) and `fast_import_crash_29044` (transient)
- **Updated `.gitignore`:** PRISM root — excludes all stripped paths going forward, prevents re-introduction
- **Recipe doc:** [[reference_git_history_strip_recipe]] — step-by-step for future events

## Failure cascade observed

The journey was not clean. Documented in [[reference_git_history_strip_recipe]] §Failure modes.

1. `git bundle create --all` for backup → OOM, killed
2. `Start-Job` for background robocopy → died with parent PS, didn't run
3. Filter-repo via Bash → OOM after 265 commits
4. Filter-repo via PowerShell without `git.exe` on PATH → silent no-op
5. gc post-rewrite → `bad tree object 997cfb4a` (from transient crash dump) + corrupt loose object `16ec2826` (orphaned)
6. `--force-with-lease` before fetch → `(stale info)` rejection
7. Real push → ✅ succeeded 19 seconds

## Peers affected

Peer commits that were on top of mine at rewrite time, all carried through to new history:
- `1d1c70202` [[reference_dev_velocity_autotrigger|DEV-VELOCITY-AUTOTRIGGER]]-MS0/U-B2-PEER-FILE-ISOLATION
- `a6e9f043c` [[reference_dev_velocity_autotrigger|DEV-VELOCITY-AUTOTRIGGER]]-MS0/U-B1-DISPATCHER-COVERAGE
- `1e3534a68` HOOK-SYNERGY-MS0/CLOSE-STATE H3 SHA backfill
- `cca61671f` TRAINING-LEARNING-MS0/U-TL-ENVELOPE (peer CHARLIE)
- + many more during the rewrite/push window (final HEAD `04d41edf7` includes them all)

Chat-bus warning posted at `chat-1778643215093` for peer chats to `git fetch origin cad-fusion-live-ms0 && git reset --hard origin/cad-fusion-live-ms0`.

## Rule (do this again if needed)

See [[reference_git_history_strip_recipe]] for the recipe. Origin commit landed: 2026-05-13T03:32:13Z.
