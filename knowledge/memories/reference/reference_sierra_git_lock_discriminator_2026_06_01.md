---
name: reference_sierra_git_lock_discriminator_2026_06_01
description: "The reliable stale-vs-live .git/index.lock discriminator: cpu=0 across ALL git.exe = dead holder (safe to remove); any CPU-active git = live commit (wait). Refines the 2026-05-30 regression lesson. Also: a hung-git pileup (13× cpu=0) can stale-lock the shared tree and block ALL fleet commits."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.937Z
aliases: reference_sierra_git_lock_discriminator_2026_06_01
---


**slot:sierra, 2026-06-01.** Across ~3 autonomous-loop fires my `[MAIN]` commits on the shared `H:/prism` tree kept losing the `.git/index.lock` race. The earlier heuristics (size 0 + frozen mtime + HEAD-advancing-past-it ⇒ stale) from [[reference_sierra_dead_edge_id_mismatch_2026_05_30]] are necessary but **incomplete** — a *non-empty* lock held minutes is the ambiguous case (slow-but-live peer vs crashed), exactly the case that caused my 2026-05-30 regression (I swept a CPU-active live peer's lock and disrupted its commit).

**THE RELIABLE DISCRIMINATOR (the piece my regression lacked):** check **CPU consumed by every `git.exe` process**, not just the lock's size/mtime.
```
Get-Process git | ForEach-Object { "PID $($_.Id) age=$(($now-$_.StartTime).TotalSeconds)s cpu=$($_.CPU)s" }
```
- **Every git at `cpu≈0s`** ⇒ NO live committer (a real commit burns CPU writing objects/index) ⇒ the lock's holder is dead/hung ⇒ **safe to `rm -f .git/index.lock`** (what `git-lock-sweeper` does). This is NOT the regression scenario.
- **Any git with rising CPU** ⇒ a live commit is in progress ⇒ **WAIT, never sweep** (the regression case).
- A 0-CPU git blocked on I/O *could* be a stalled-but-live commit, but 13 of them aged 6–11 min with HEAD frozen is a deadlocked pileup, not slow I/O — the combined signal (all-cpu=0 + frozen HEAD + multi-minute non-empty lock) is decisive.

**The fleet incident:** I found **13 `git.exe` processes all at cpu=0s** (ages 6–11 min) behind a stale 4.3MB `index.lock` (277s, frozen), HEAD frozen — a hung-git **pileup blocking ALL main-tree commits fleet-wide** (every slot's `[MAIN]` commit was failing). Removing the stale lock unblocked it; my commit + peers' resumed cleanly (no regression — confirms the cpu=0 read was correct). NOTE: git does NOT poll-wait on index.lock (it fails immediately on contention), so 13 alive gits ≠ lock-waiters — they're hung on something else (I/O/memory pressure) and are golf's **[[reference_fleet_reaper|fleet-reaper]]** reap target (process-killing is golf's lane, not sierra's — I cleared the lock only).

**Standing guidance:** (1) on the shared tree, prefer pathspec-limited `git commit -- <files>` + `git add -f` (system-viz dir is gitignored, files force-tracked). (2) Before removing ANY non-empty index.lock, run the cpu=0 check — it's the safe discriminator. (3) A recurring stale-lock + hung-git pileup is a [[feedback_golf_owns_reaper|fleet-hygiene]] signal for golf; flag it. Reinforces [[feedback_commit_to_slot_worktree]] (slot worktrees have separate indexes → no shared-tree contention) and [[reference_sierra_dead_edge_id_mismatch_2026_05_30]].
