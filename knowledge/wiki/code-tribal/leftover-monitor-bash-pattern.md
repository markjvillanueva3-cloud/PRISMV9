---
title: The leftover-monitor-bash pattern — why the pre-MS1 reaper missed it
type: code-tribal
status: shipped
shipped: 2026-05-14
tags: [fleet-reaper, orphan-process, bash, classifier]
milestone: FLEET-REAPER-MS1
---

# The leftover-monitor-bash pattern

## The observation

The Bash tool's persistent Monitor (and the `Monitor` harness tool) run a shell
loop of the structural form:

```bash
while true; do node some-sweep.mjs --once; sleep 300; done
tail -f run.log | grep --line-buffered ERROR
inotifywait -m /watched/dir
```

When the chat that spawned one of these closes, the loop frequently keeps
running for **hours** — observed: a `fleet-reaper-sweep.mjs` Monitor loop alive
2.5 h after its chat ended.

## Why FLEET-REAPER-MS0 missed it

MS0's reap classes are `unowned` (ancestry → a genuinely **dead** PID) and
`owned-by-crashed` (ancestry → a crashed slot whose recorded harness PID is
itself dead). But these leftover loops have a parent PID that is a **still-alive
`claude.exe`** — the harness of the dead chat lingered, just *unpinned* (not in
any `chat-slots.json` slot). MS0's classifier sees a live ancestor →
`owned-by-alive` → never a candidate. The dead-ancestor rule structurally cannot
see this orphan: the ancestor isn't dead, it's *unowned and alive*.

## The fix (FLEET-REAPER-MS1, U-PHASE2-BASH-CLASSIFIER)

A new `leftover-bash-task` class. The discriminator is **"unpinned `claude.exe`
in the ancestry"**: a real chat's `claude.exe` is in `slotPidMap`; an orphan
chat's lingering `claude.exe` is alive but in no slot. Combined with: shell name
(`bash`/`sh`), a *structural* cmdline match (not a substring — the AND-of-simple-
regexes form rejects `echo "while true"`), age ≥ 15 min, and a cleanly-resolved
slots file.

## The lesson

"Orphan" is not the same as "dead-ancestor." A process can be a genuine orphan
while its parent is alive — if the parent is *itself* orphaned (a harness with no
chat). When a reaper's rule is "dead ancestor = orphan," enumerate the cases
where the ancestor is alive but *also* meaningless. The pin/no-pin distinction is
what makes "the chat that spawned this is gone" provable without a dead PID.

Related: [[fleet-reaper]] · [[soft-relief-age-floor]]
