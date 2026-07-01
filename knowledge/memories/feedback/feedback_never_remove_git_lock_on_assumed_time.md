---
name: feedback_never_remove_git_lock_on_assumed_time
description: "Never rm .git/index.lock by judging staleness from an ASSUMED current time — compare the lock mtime to local `date`, because session heartbeats are UTC and the fleet's git locks are usually live."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.436Z
aliases: feedback_never_remove_git_lock_on_assumed_time
---


On 2026-06-03 (slot:juliett, BLACKWELL-DB-GEN-MS0) I removed `H:/PRISM/.git/index.lock` believing it was 4.5 h stale. It was **22 seconds old** — held by a live peer git process (the fleet runs ~6 concurrent git.exe). I had read the lock mtime as `14:53` and assumed "now" was `19:20` — but `19:16Z` was the **UTC** SessionStart heartbeat; local time (`date`) was `14:55` (UTC-5). The lock was fresh.

**Why it matters:** removing a *live* `index.lock` can make the peer's in-flight `git commit`/index write fail ("Unable to write new index file") and, worst case, interleave two index writes. Here git's lock-then-rename protocol failed safe (repo verified intact: `git status` rc=0, HEAD a valid peer commit, `git fsck --connectivity-only` clean), but the peer's commit may have errored and needed a retry. It was avoidable.

**How to apply:**
- BEFORE touching `.git/index.lock`, run `date +%H:%M:%S` and compare to the lock's mtime with `ls -la --time-style=+%H:%M:%S .git/index.lock`. Do NOT derive "now" from the UTC heartbeat / `*Z` timestamps in the session banner.
- A lock < a few minutes old is presumed LIVE — leave it; retry your op, or wait. Only a lock that is genuinely tens-of-minutes+ stale AND whose mtime is not advancing is a removal candidate.
- Prefer the fleet's own remedy over manual `rm`: the git-lock-sweeper (commit `b0434f147`) exists for stale locks. Manual removal on a 26-slot shared tree is a last resort.
- If you do remove one and were wrong, immediately verify integrity (`git status`, `git rev-parse HEAD`, `git fsck --connectivity-only`) and surface it (R12) — don't bury it.

Related: [[feedback_verify_actual_contract]] (PS/codepage + proxy-vs-real checks), R12 fail-loud.
