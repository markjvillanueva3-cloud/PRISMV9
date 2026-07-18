---
name: git-shared-index-hazards
category: software-engineering
domain: backend-dev
tags: [git, index-lock, multi-chat, commit-misattribution, stale-lock, recovery, ai-development]
last_updated: 2026-05-18
---

# Git Shared-Index Hazards — Diagnosis & Recovery

PRISM's 26-chat fleet, before slot-worktree migration, shares **one** `.git/index` on the `H:/prism` main tree. `.git/index.lock` serializes every index-writing operation (`commit`, `add`, `merge`, `reset`) across all those chats. Three hazards follow: lock contention, **stale** locks, and cross-chat commit misattribution.

[[slot-worktree-playbook]] is the *prevention* wiki — migrate to a slot worktree and these vanish. This is the *diagnosis + recovery* runbook for when you are still on the shared tree and already stuck.

## Stale lock vs live lock — the diagnosis

A `git commit` that cannot create `index.lock` **fast-fails** — it never blocks. So a persistent `index.lock` is one of two things, and they need opposite responses:

| Signal | **Live** (leave it) | **Stale** (remove it) |
|--------|---------------------|------------------------|
| mtime | fresh and *refreshing* on re-probe | frozen — re-probe 3× over ~9 s, age climbs 59→62→65 s, size unchanged |
| owner | a live `git commit`/`add`/`merge`/`reset` process exists | **no** index-writing git process alive |
| age vs processes | lock newer than its owner | lock **predates every live git process** |
| size | n/a | a 4.9 MB lock is a fully-written new index left un-renamed by a crashed commit — **size alone never means "live"** |

Critical: `git fsmonitor--daemon` processes do **not** hold `index.lock`. A process list showing only fsmonitor daemons = no owner = stale.

A `0`-byte lock that is ~1 s old is **healthy** — a commit just grabbed it and will rename+release within ~1 s. Do not touch that one.

```powershell
# Probe staleness: age must climb while size stays frozen, and no committer alive.
1..3 | % { (Get-Item .git\index.lock -Force).LastWriteTime; Start-Sleep 3 }
Get-CimInstance Win32_Process -Filter "Name='git.exe'" |
  ? { $_.CommandLine -match 'commit|\badd\b|merge|reset' }   # empty = no owner
```

## Recovery

`git-lock-sweeper.mjs` (PreToolUse hook on git Bash commands) auto-clears locks older than its 30 s threshold — so often, simply issuing the next git command clears a stale lock for free. Manual removal is the fallback, and **only after** the stale checklist above passes:

1. Remove `.git/index.lock`.
2. Re-check after ~3 s. If it reappears `0`-byte / ~1 s old → a waiting committer grabbed the freed lock — **healthy**, the repo is unblocked. If it reappears 4 MB+ and frozen again → a real owner exists; you misdiagnosed.

Removing a *confirmed-stale* lock helps the whole fleet — every peer wedged behind it proceeds at once.

## Cross-chat commit misattribution

A file staged in the shared index is visible to **every** chat. A peer running `git commit` with no pathspec (or `-a`) commits the whole staged index — **including your file** — under *their* commit banner.

- **Detect:** `git log -1 -- <yourfile>` shows a peer's SHA + unrelated subject.
- **Consequence:** content is correct on disk and in git; only the attribution is wrong.
- **Do NOT rewrite history** to fix the banner — the commit is downstream-visible. Record a `<sha> → <your-unit>` override note for later commit-subject audits.
- **Mitigate:** always `git commit -- <explicit pathspec>` (commits only those paths regardless of index state). The real fix is a slot worktree — a private index no peer can sweep.

## Anti-patterns that *create* stale locks

- **Killing a `git commit` mid-write.** `TaskStop` on a background commit-retry loop kills the child `git commit` while it is writing the new index into `index.lock` before the rename — leaving exactly the orphaned multi-MB lock above. Let retry loops run to natural completion.
- **`git log --all -- <uncommitted-path>`.** For a path with zero commits this walks all refs × full history — observed to hang 285 s. Use `git log -1 -- <path>` (HEAD branch, no `--all`) to ask "is this file committed yet?".

## The contended-commit retry pattern

```bash
# Literal -m "[MAIN] ..." — a shell variable hides the scope prefix from
# worktree-commit-route, which parses the raw command string (it would see "$MSG").
for i in $(seq 1 30); do
  OUT=$(git commit -m "[MAIN] [SCOPE]/U-ID: title" -- path/to/file 2>&1)
  echo "$OUT" | grep -qE "files? changed|nothing to commit" && break
  sleep 3
done
```

Run it to completion — never `TaskStop` it (see anti-patterns). `nothing to commit` is also a *success* exit: it means a peer already swept and committed your staged file (misattribution — verify with `git log -1 -- <file>`).

## Related

- [[slot-worktree-playbook]] — the prevention: a private per-slot index
- [[atomic-write-idempotency-patterns]] — the same single-writer discipline for state JSON
- [[handoff-discipline]] — recording a misattribution `sha → unit` note across sessions
- CLAUDE.md §"## Recent regressions" — `git-lock-sweeper` `TOP_LOCKS`, `commit-graph-chain.lock`, `maintenance.lock` history
