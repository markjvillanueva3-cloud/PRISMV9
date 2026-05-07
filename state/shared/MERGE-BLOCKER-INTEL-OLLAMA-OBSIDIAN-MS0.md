# Merge Blocker — work/intel-ollama-obsidian-ms0 → main

Generated: 2026-05-07T13:22:00Z
Last attempt: HEAD = `97e592068`

## Status

**Cannot fast-merge.** 102 ahead, 337 behind origin/main. Three-way merge produces 11 conflicts.

## Conflicts (all structural, will recur on retry)

### Junctioned slash-command .md files (10)

These live in `~/.claude/commands/` which is a symbolic link to `H:/.claude/commands/`.
Both branches track the same physical file via git but with diverged snapshots.
Every merge will conflict here until one branch is rebased onto the other.

- `.claude/commands/lathe-studio.md`
- `.claude/commands/local-ask.md`
- `.claude/commands/memory-search.md`
- `.claude/commands/model-status.md`
- `.claude/commands/outcome.md`
- `.claude/commands/pre-review.md`
- `.claude/commands/sync-memory.md`
- `.claude/commands/train-lora.md`
- `.claude/commands/wedm-batch.md`
- `.claude/commands/wedm-program.md`

### Add/add conflict (1)

- `mcp-server/scripts/hooks/cam-phase5-impl-gate.mjs` — both branches added a file at this path independently.

## Auto-resolved (not blockers)

- `.claude/settings.json` — auto-merged cleanly
- `mcp-server/src/engines/index.ts` — auto-merged cleanly

## Why we are not fighting this now

- Junctioned-tree conflicts are a structural artifact, not real edit conflicts. Resolving them on this branch picks "ours" over peer-shipped main — the resolution propagates to disk via the symlink, potentially clobbering peer chats' active edits.
- The user's priority order is (1) merge, (3) triage, (2) local-llm pivot. Triage is committed at `97e592068`. Local-llm is the next user-facing deliverable.
- A sibling chat with awareness of the .md files' intended canonical content is better positioned to do this merge.

## Resolution path for future session

1. Confirm no peer chat is actively claiming any of the 11 conflicting files (chat bus check).
2. Rebase onto origin/main: `git rebase origin/main` — fewer conflicts than merge because diffs are applied one commit at a time.
3. For each .md conflict: read both versions, pick the union of features (these are slash-command docs, not code).
4. For the add/add hook conflict: compare both files, pick whichever is more recent / more complete.
5. Run `rtk vitest run` after rebase to confirm no test regressions.
6. Push: `git push --force-with-lease origin work/intel-ollama-obsidian-ms0`.
7. Open PR (or fast-forward main).

## Triage data the merge would auto-resolve

Per `INTEL-OLLAMA-OBSIDIAN-MS0-DRIFT-TRIAGE.md`:
- 13 cross-branch-only deliverable-gaps land on this branch from main after merge.
- 3 mixed gaps partially resolve.
- 10 orphaned-only gaps remain (true deliverable gaps — Phase 14/15/16 stretch units never built on any branch). Decision pending: scope-invalidate or build.
