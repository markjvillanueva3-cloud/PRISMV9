---
title: Fleet-Hygiene Applied Practice — process-reaping gotchas (PID-reuse race, zombie-cannot-be-killed, SIGTERM grace, kill-the-group, double-fork, thundering-herd)
galaxy: fleet-hygiene
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice-meta (2026-06-10)"
verification_method: "Practitioner CS/OS claims WebFetch-confirmed against free/primary sources — Linux man pages (kill(2), signal.7, wait(2), fork(2), daemon.7, credentials.7 via man7.org/man.archlinux.org), systemd.kill(5) (man.archlinux.org mirror), Wikipedia (Zombie process, Thundering herd problem, Process identifier), and the AWS Builders' Library jitter article. Each gotcha quotes its cited source. PRISM-galaxy mapping lines are this-repo relevance, not external claims. The phi-accrual adaptive-detector note was DROPPED (its Wikipedia/man pages 404'd on two attempts — not promoted, per R12). All reaper timing/threshold numbers are owner-gated."
tags: [fleet-hygiene, golf, applied-practice, tribal-knowledge, process-reaping, pid-reuse-race, zombie, orphan, sigterm, sigkill, double-fork, thundering-herd, jitter, process-group, cgroup, heartbeat-false-positive, man-pages, systemd]
---

# Fleet-Hygiene Applied Practice

The **practitioner-knowledge** layer for the **fleet-hygiene** galaxy (owner: **golf**) — the hard-won OS/process-lifecycle gotchas that the theory in [[fleet-hygiene-foundations]] does not teach you to *survive*. Foundations covers the model (PID/fork/wait, zombie-vs-orphan semantics, the process-state machine, heartbeat/failure-detector theory, leader-election/split-brain). This entry is the orthogonal half: **what actually goes wrong when you ship a reaper**, why it goes wrong, and the technique an expert uses to avoid it. Every CS claim below is WebFetch-confirmed against the cited free/primary source; the per-gotcha *PRISM hit* line maps it onto this galaxy's reaper/heartbeat/watchdog surface. All reaper timing constants and pressure thresholds are deliberately **owner-gated** (see the Owner-gate section) — this entry asserts *technique*, never a PRISM number.

> Read [[fleet-hygiene-foundations]] first. This page does NOT re-derive the parent/child/PID/wait model — it assumes it and goes straight to the failure modes.

---

## Theme 1 — The PID is not a durable identity (reuse races)

### Gotcha 1.1 — A stored PID can point at a *different*, recycled process by the time you act on it
**The trap:** you record a child's PID, later read it back, confirm "PID 4123 is alive," and send it a kill — but 4123 was reaped long ago and the kernel handed that number to an unrelated process. You just killed the wrong thing. **Why:** PIDs are allocated sequentially and wrap around at a maximum (`pid_max`, "historically 65,535 on Linux ... up to 4,194,303 on 64-bit") and "allocation restarts ... and again increases" once the limit is reached ([Wikipedia, Process identifier](https://en.wikipedia.org/wiki/Process_identifier)) — so a number is only unique *while the process lives and until it is reaped*. The authoritative statement of the fix is in the daemon PID-file rule: a PID record "must be implemented in race-free fashion so that the PID file is only updated when it is verified at the same time that the PID previously stored ... **no longer exists or belongs to a foreign process**" ([Linux daemon(7)](https://man.archlinux.org/man/daemon.7.en)). **Expert avoidance:** never trust a bare PID across time — re-validate identity at the moment of action (start-time/creation-timestamp, full argv, or ancestry), and treat "PID alive" as necessary-not-sufficient.
**PRISM hit:** exactly why the fleet reaper's attribution unit is the **`claude.exe` process tree (via ancestry), NOT the ephemeral `chat-slots.pid`** — the recorded PID goes stale the instant a child re-spawns, so ancestry (the stable OS relation) is the identity, and a PID alone never authorizes a reap.

### Gotcha 1.2 — `signal 0` tells you a PID exists, not that it is *your* process
**The trap:** the idiomatic liveness probe is `kill(pid, 0)` — "If sig is 0, then no signal is sent, but existence and permission checks are still performed; this can be used to check for the existence of a process ID ... that the caller is permitted to signal" ([Linux kill(2)](https://man7.org/linux/man-pages/man2/kill.2.html)). It returns success for a recycled PID just as happily as for the original. **Why:** the check answers "does *a* process with this number exist and may I signal it" — it cannot answer "is it the same process I meant." **Expert avoidance:** pair the `signal 0` existence check with an identity re-validation (gotcha 1.1) before any kill; the existence check is a fast pre-filter, not the authorization.
**PRISM hit:** the liveness classifier (`chat-slots.mjs golf-liveness`) must not promote a bare existence hit to a reap decision — it gates on the confirm-after-N-ticks + ancestry path so a recycled PID can't be mistaken for a live slot (or vice-versa).

---

## Theme 2 — A dead process can still wreck you (zombies vs orphans)

### Gotcha 2.1 — You **cannot** kill a zombie; `SIGKILL` does nothing to it
**The trap:** you see a `<defunct>` / zombie entry chewing a process-table slot and reflexively `kill -9` it. Nothing happens. **Why:** a zombie is *already terminated* — "Unlike normal processes, the `kill` command has no effect on a zombie process" ([Wikipedia, Zombie process](https://en.wikipedia.org/wiki/Zombie_process)). It is just a kernel bookkeeping entry (PID, exit status, rusage) held "in order to allow the parent to later perform a wait" ([Linux wait(2)](https://man7.org/linux/man-pages/man2/wait.2.html)). The leak is real: "As long as a zombie is not removed ... via a wait, it will consume a slot in the kernel process table, and if this table fills, it will not be possible to create further processes" ([wait(2)](https://man7.org/linux/man-pages/man2/wait.2.html)). **Expert avoidance:** to clear a zombie you target its **parent** — make the parent `wait()`, or kill the parent so the orphaned zombie is reparented to init/a subreaper which "periodically executes the `wait` system call to reap any zombies" ([Zombie process](https://en.wikipedia.org/wiki/Zombie_process)).
**PRISM hit:** a watchdog that "kills the zombie PID" is a no-op that loops forever reporting the same leak. The fleet reaper must reap the **owning ancestor** (parent), not signal the defunct entry — the same parent-targets-child mechanism the foundations entry maps init/subreaper onto.

### Gotcha 2.2 — Zombie and orphan are different problems with different owners
**The trap:** treating "the slot died and left stuff behind" as one bug. They are two: "Zombie processes should not be confused with orphan processes, a process that is still executing, but whose parent has died" ([Wikipedia, Zombie process](https://en.wikipedia.org/wiki/Zombie_process)). A **zombie** is dead-but-unreaped (wastes a table slot, harmless to CPU); an **orphan** is *still running* with no live parent (burns CPU/RAM/GPU). **Why:** orphans get adopted — "If a parent process terminates, then its 'zombie' children ... are adopted by init(1) (or by the nearest 'subreaper' process)" ([wait(2)](https://man7.org/linux/man-pages/man2/wait.2.html)) — but only a reliable subreaper actually reaps them; a still-*running* orphan keeps consuming resources until something stops it. **Expert avoidance:** detect each separately — zombies by their defunct state (reap via parent), orphans by the dead-ancestor + still-alive condition (stop them). Confusing the two makes you `kill -9` zombies (no-op) while real orphans keep burning.
**PRISM hit:** the reaper's two distinct hazards — the **"16GB tmp-orphan leak"** / lingering-background-task (live orphans, R14 "close your tool calls") vs process-table/handle accumulation (zombie-class) — are exactly this split; golf hunts both, with the right remedy for each.

### Gotcha 2.3 — Reap non-blocking, or your reaper itself hangs
**The trap:** a reaper that calls a blocking `wait()` stalls on the first child that hasn't exited yet, and now your hygiene daemon is stuck. **Why:** `wait()` blocks by default; the non-blocking form is the `WNOHANG` flag — "**WNOHANG** return immediately if no child has exited" ([Linux wait(2)](https://man7.org/linux/man-pages/man2/wait.2.html)). **Expert avoidance:** a long-lived reaper polls with `WNOHANG` (or reaps on `SIGCHLD`) so it sweeps what's actually exited and never blocks on a child that's still working.
**PRISM hit:** the reaper runs as a periodic sweep (scheduled task + Stop hook), never a blocking wait — it must classify-and-move-on within its tick, not stall on one busy slot.

---

## Theme 3 — Killing politely (SIGTERM/SIGKILL grace) and killing the *whole* tree

### Gotcha 3.1 — `SIGKILL` skips cleanup; reach for `SIGTERM` first
**The trap:** `kill -9` everything because it "always works." It does work — and that's the danger: it gives the target zero chance to flush buffers, release locks, or remove its own tmp/lock files. **Why:** "The signals SIGKILL and SIGSTOP cannot be caught, blocked, or ignored" ([Linux signal(7)](https://man7.org/linux/man-pages/man7/signal.7.html)) — there is no handler to run, so no cleanup runs. SIGTERM is the catchable, polite request (default action "Term"). **Expert avoidance:** the canonical sequence is SIGTERM-then-SIGKILL with a grace window: processes "will first be terminated via SIGTERM," and only after a timeout is "the termination request ... repeated with the SIGKILL signal" ([systemd.kill(5)](https://man.archlinux.org/man/systemd.kill.5), `SendSIGKILL` defaults to `yes`, `FinalKillSignal` defaults to `SIGKILL`). Send TERM, wait the grace period, escalate to KILL only for the holdouts.
**PRISM hit:** a reaper that opens with KILL orphans the orphan's *own* tmp/lock children (re-creating the leak it's there to fix). Golf's reap path should TERM-then-KILL so a slot's cleanup (handoff flush, lock release, `.cron-locks/*.lock`) can run before the hard kill. (The grace-window *duration* is owner-gated.)

### Gotcha 3.2 — Kill the process **group / cgroup**, not the lone PID — or children survive the parent
**The trap:** you SIGKILL the slot's top PID and walk away; its node/python/MCP children re-parent to init and keep running. **Why:** signals can be addressed to a whole group — "If pid is less than -1, then sig is sent to every process in the process group whose ID is −pid" ([kill(2)](https://man7.org/linux/man-pages/man2/kill.2.html)), and "Various system calls ... may operate on all members of a process group, including kill(2), killpg(3)" ([Linux credentials(7)](https://man7.org/linux/man-pages/man7/credentials.7.html)). The modern, more robust answer is cgroup-scoped killing: with `KillMode` "set to control-group, all remaining processes in the control group of this unit will be killed" — and that is the **default** ([systemd.kill(5)](https://man.archlinux.org/man/systemd.kill.5)). **Expert avoidance:** target the group/cgroup so forked descendants die with the parent; never assume killing the root PID reaches the subtree.
**PRISM hit:** this is precisely why attribution is the **whole `claude.exe` tree** — a slot launches hook/python/MCP children, and reaping only the parent leaves live orphans. The reaper must sweep the subtree (ancestry-rooted), the same unit the foundations "fleet of trees" model names.

### Gotcha 3.3 — You can only signal a process you're allowed to signal
**The trap:** the reaper finds a stray PID, tries to kill it, gets EPERM, and either crashes or (worse) silently does nothing. **Why:** "For a process to have permission to send a signal, it must either be privileged (under Linux: have the CAP_KILL capability ...), or the real or effective user ID of the sending process must equal the real or saved set-user-ID of the target process" ([kill(2)](https://man7.org/linux/man-pages/man2/kill.2.html)). A PID you don't own is simply un-reapable from an unprivileged context. **Expert avoidance:** scope the reaper to processes it actually owns (same user / same host), surface the un-ownable ones to an operator instead of pretending to have handled them — fail loud, don't fail silent.
**PRISM hit:** the reaper's `--hunt` mode *surfaces* an operator orphan list rather than silently failing on un-ownable PIDs, and the MS2 cross-PC host filter is the ownership/fencing boundary that stops it even trying to reap a PID on a foreign host.

---

## Theme 4 — Detaching cleanly (daemonization gotchas)

### Gotcha 4.1 — A single fork leaves the daemon able to grab a controlling terminal — double-fork
**The trap:** you `fork()` once, `setsid()`, and call it a daemon — but a lone session leader can still acquire a controlling TTY on its next terminal open, which can later deliver SIGHUP and kill your "daemon" when that terminal closes. **Why:** the SysV daemon recipe forks **twice** on purpose: "Call fork(), to create a background process," then "In the child, call setsid() to detach from any terminal and create an independent session," then "In the child, call fork() again, to ensure that the daemon can never re-acquire a terminal again" ([Linux daemon(7)](https://man.archlinux.org/man/daemon.7.en)). The second fork makes the final process a non-session-leader, so it "cannot be a session leader and thus cannot accidentally acquire a controlling terminal." **Expert avoidance:** fork → setsid → fork again (then the grandchild is the daemon); or, better on a modern host, let the service manager handle detachment.
**PRISM hit:** golf's durable watchdogs run as **scheduled tasks** (the service-manager path) rather than hand-rolled double-fork detach — the same outcome (no controlling terminal, survives the launching shell) via the supervisor instead of the fork dance.

### Gotcha 4.2 — The PID-file / single-instance check must be race-free
**The trap:** "is my PID file's process alive? no → I'm the only instance, write my PID" — two daemons running that check concurrently both decide they're alone. **Why:** the daemon(7) rule is explicit that this "must be implemented in race-free fashion so that the PID file is only updated when it is verified at the same time that the PID previously stored in the PID file no longer exists or belongs to a foreign process" ([daemon(7)](https://man.archlinux.org/man/daemon.7.en)) — *verified at the same time* = atomically. **Expert avoidance:** use an atomic primitive (O_EXCL create, flock, or the service manager's own single-instance guarantee), not a check-then-write.
**PRISM hit:** golf's "single hygiene owner" (one reaper, no two reapers racing the same PID — the leader-election uniqueness property from foundations §5) depends on exactly this: per-host lock files acquired atomically, so a second golf can't conclude it's alone and double-reap.

---

## Theme 5 — Restart storms and false-positive death (heartbeat tuning)

### Gotcha 5.1 — Mass-restart causes a thundering herd
**The trap:** a supervisor restarts the whole fleet (or many slots reconnect) at once; they all hit the same shared resource in the same instant and re-collapse it. **Why:** "a large number of processes or threads are simultaneously awakened ... only one process is able to respond ... causing most other processes to fail and go back to sleep," which "consumes CPU and other system resources, potentially reducing overall performance" ([Wikipedia, Thundering herd problem](https://en.wikipedia.org/wiki/Thundering_herd_problem)). **Expert avoidance:** don't release all waiters at once — wake one (EPOLLEXCLUSIVE-style), and/or stagger restarts so the herd is desynchronized.
**PRISM hit:** the fleet's "20-chat API rate-stagger" and the reaper/watchdogs' **phase offsets** (the scheduled tasks fire at staggered offsets, not all on the same minute) are the desync that keeps a fleet restart from becoming a self-inflicted overload.

### Gotcha 5.2 — Synchronized backoff re-synchronizes the herd — add jitter
**The trap:** every node backs off by the same fixed interval after a failure, so they all retry together, fail together, back off together — a self-sustaining wave. **Why:** "If all the failed calls back off to the same time, they cause contention or overload again when they are retried" ([AWS Builders' Library, Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)). The fix is randomness: "Jitter adds some amount of randomness to the backoff to spread the retries around in time" (AWS); Wikipedia agrees — "jitter can be purposefully introduced in order to break the synchronization across the clients, thereby avoiding collisions" ([Thundering herd problem](https://en.wikipedia.org/wiki/Thundering_herd_problem)). **Expert avoidance:** randomize wait intervals (jittered exponential backoff) so retries/heartbeats/sweeps don't lock into a synchronized pattern.
**PRISM hit:** the scheduling guidance to "avoid the :00 and :30 minute marks" and pick off-minutes for recurring jobs is jitter at the cron layer — it keeps the fleet's periodic hygiene work (reaper sweep, memory monitor, task-health) from all landing on the same instant across the box (and across the planet).

### Gotcha 5.3 — Slow is not dead: a too-eager timeout false-suspects a live-but-busy slot
**The trap:** you infer death from one missed heartbeat and reap — but the slot was merely blocked on slow I/O or a GPU burn. **Why:** heartbeat failure detection infers death from *absence* — "If the endpoint does not receive a heartbeat for a time — usually a few heartbeat intervals — the machine that should have sent the heartbeat is assumed to have failed" ([Wikipedia, Heartbeat (computing)](https://en.wikipedia.org/wiki/Heartbeat_(computing))). Detection is inherently an **accuracy-vs-completeness** trade ([Wikipedia, Failure detector](https://en.wikipedia.org/wiki/Failure_detector)): a tighter timeout catches real deaths faster but raises false suspicions of the merely-slow; a looser one avoids false kills but lets true orphans linger. There is no timeout that is both perfectly fast and perfectly accurate in an asynchronous system. **Expert avoidance:** require *several* missed intervals (the man-page's "a few heartbeat intervals") and confirm-before-acting rather than kill-on-first-miss — bias toward accuracy when the action is irreversible (a kill).
**PRISM hit:** PRISM's **confirm-after-N-ticks** gate (and the `{stale, crashed}` two-window classifier — *stale* ≠ *crashed*) is this exact accuracy-over-speed choice: a momentarily-blocked slot is `stale`, not reaped, until it crosses the crashed window across multiple confirmations. (The N, the stale-ms, and the crashed-ms windows are owner-gated.)

---

## Owner-gate (NOT promoted)

The following stay **owner-gated** for golf to bind against PRISM's live config + measured behavior — this entry asserts the *technique*, never the number:
- **TERM→KILL grace window** (gotcha 3.1) — the wait between SIGTERM and the escalation SIGKILL is an operational tuning; verify against the reaper's kill path + `PRISM_FLEET_REAPER_*` knobs, do not hardcode from systemd's defaults.
- **Confirm-after-N-ticks + heartbeat windows** (gotcha 5.3) — the N, `staleThresholdMs`, and `crashedThresholdMs` are the concrete timeout values the accuracy/completeness theory generalizes; read them from `chat-slots.mjs` / `install-fleet-reaper-task.ps1`, never assert a number here.
- **Scheduled-task phase offsets + jitter minute** (gotchas 5.1/5.2) — the specific offsets and off-minute choices are config; bind to the live task registration, not to a generic rule.
- **Memory/pressure ceilings** — RSS / Tier-1 graduated-pressure thresholds are host-specific (Blackwell box); bind to `CANONICAL-HOST-FACTS` + live config.
- **NUMERICS LEFT GATED: yes** — no kill/reap/grace/heartbeat/pressure numeric threshold is promoted into this applied-practice entry; all are deferred to golf + live config so the doctrine can't drift into a wrong number.

## Sources (distinct URLs WebFetch-confirmed during this create pass, 2026-06-10)

> Each URL below was fetched and its quoted facts confirmed before inclusion. Free man-pages + primary docs + free engineering references + Wikipedia, prioritized in that order. The phi-accrual adaptive-detector note was investigated and DROPPED because its Wikipedia/man-page URLs 404'd on two attempts (not promoted, per R12).

1. Linux kill(2) man page — https://man7.org/linux/man-pages/man2/kill.2.html  *(primary authoritative doc)*
2. Linux signal(7) man page — https://man7.org/linux/man-pages/man7/signal.7.html  *(primary authoritative doc)*
3. Linux wait(2) man page — https://man7.org/linux/man-pages/man2/wait.2.html  *(primary authoritative doc)*
4. Linux fork(2) man page — https://man7.org/linux/man-pages/man2/fork.2.html  *(primary authoritative doc)*
5. Linux daemon(7) man page — https://man.archlinux.org/man/daemon.7.en  *(primary authoritative doc)*
6. Linux credentials(7) man page — https://man7.org/linux/man-pages/man7/credentials.7.html  *(primary authoritative doc)*
7. systemd.kill(5) man page — https://man.archlinux.org/man/systemd.kill.5  *(primary authoritative doc)*
8. Wikipedia — Zombie process — https://en.wikipedia.org/wiki/Zombie_process
9. Wikipedia — Thundering herd problem — https://en.wikipedia.org/wiki/Thundering_herd_problem
10. Wikipedia — Process identifier — https://en.wikipedia.org/wiki/Process_identifier
11. Wikipedia — Heartbeat (computing) — https://en.wikipedia.org/wiki/Heartbeat_(computing)
12. Wikipedia — Failure detector — https://en.wikipedia.org/wiki/Failure_detector
13. AWS Builders' Library — Timeouts, retries, and backoff with jitter — https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/  *(free engineering reference)*
