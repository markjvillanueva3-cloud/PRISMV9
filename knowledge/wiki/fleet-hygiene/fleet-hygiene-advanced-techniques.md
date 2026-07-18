---
title: Fleet-Hygiene Advanced Techniques — atomic cgroup reaping, freeze-then-kill, pidfd race-free signaling, subreaper ownership, PSI pressure-gated reaping, OOM victim-biasing, phi-accrual adaptive detection, supervision-tree restart strategy
galaxy: fleet-hygiene
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-advanced-techniques (2026-06-10)"
verification_method: "State-of-the-art OS/distributed-systems techniques WebFetch-confirmed against free/primary sources — the Linux kernel cgroup-v2 admin guide (kernel.org), the kernel PSI doc (docs.kernel.org), Linux man pages PR_SET_CHILD_SUBREAPER(2const)/pidfd_open(2)/pidfd_send_signal(2)/proc_pid_oom_score_adj(5) (man7.org), the Erlang/OTP supervision-principles doc (erlang.org), and the Akka phi-accrual failure-detector doc (doc.akka.io) which supplies the continuous-suspicion technique the applied-practice entry had to drop when Wikipedia 404'd. Each technique quotes its cited source. PRISM-galaxy application lines are this-repo mapping, not external claims. ALL reaper timing/threshold/pressure numbers remain owner-gated for golf."
tags: [fleet-hygiene, golf, advanced-techniques, cgroup-v2, cgroup-kill, freezer, pidfd, subreaper, child-subreaper, psi, pressure-stall, oom-score-adj, phi-accrual, accrual-failure-detector, supervision-tree, restart-intensity, atomic-reaping, race-free-signal, state-of-the-art]
---

# Fleet-Hygiene Advanced Techniques

The **world-leader-depth** layer for the **fleet-hygiene** galaxy (owner: **golf**) — the state-of-the-art strategies an expert reaches for *beyond* the intro model and the common gotchas. [[fleet-hygiene-foundations]] gives the theory (PID/fork/wait, zombie-vs-orphan, the process-state machine, heartbeat/failure-detector theory, leader-election/split-brain). [[fleet-hygiene-applied-practice]] gives the survival gotchas (PID-reuse race, can't-kill-a-zombie, basic SIGTERM grace, basic kill-the-group, basic double-fork, thundering-herd, jitter, slow-is-not-dead). **This entry is the third, orthogonal half: the advanced *strategy* that separates a correct reaper from a world-class one** — atomic kernel-enforced subtree reaping, fork-race-proof freezing, identity-stable signaling, owning the reaper role without being init, pressure-gated and victim-biased reaping under memory crunch, adaptive continuous failure detection, and disciplined supervision-tree restart with crash-loop escalation.

Every technique below is WebFetch-confirmed against the cited free/primary source. For each: **the technique → WHEN an expert reaches for it → the trade-off *direction* → source inline → one line on how THIS galaxy applies it.** Per R12+SAFETY, only the qualitative method/direction is promoted — **every numeric threshold (grace-ms, stale/crashed windows, phi threshold, RSS/PSI ceilings, restart intensity N, oom_score_adj value) is deliberately [owner-gate]** for golf to bind against live config (see the Owner-gate section). This entry asserts the *shape* of the relationship, never the number.

> Read [[fleet-hygiene-foundations]] and [[fleet-hygiene-applied-practice]] first. This page does NOT re-derive the basic kill-the-group / double-fork / TERM-then-KILL gotchas — it assumes them and goes to the advanced layer of each.

---

## Theme 1 — Atomic, kernel-enforced subtree reaping (beyond "kill the group")

Applied-practice already says *target the group, not the lone PID*. The advanced move is to let the **kernel** atomically guarantee the whole subtree dies, with no userspace iterate-and-race window.

### Technique 1.1 — One-shot atomic subtree kill via `cgroup.kill`
**The technique:** instead of enumerating PIDs and signalling each (a window in which a forked child can escape the snapshot), write a single value to the cgroup's kill control file. Per the Linux kernel cgroup-v2 admin guide: *"Writing '1' to the file causes the cgroup and all descendant cgroups to be killed. This means that all processes located in the affected cgroup tree will be killed via SIGKILL."* ([kernel.org, cgroup-v2 admin guide](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html)).
**When an expert uses it:** when "kill this slot and everything it spawned" must be **complete and race-free** — no descendant survives because it forked a microsecond after you snapshotted the PID list.
**Trade-off direction:** it is SIGKILL-only (no grace, no catchable cleanup), so it is the *escalation* end of a graduated reap — more decisive and leak-proof, but it forfeits the target's own buffer-flush/lock-release. Reach for it *after* the polite SIGTERM grace window, not instead of it.
**PRISM application:** golf's "reap the whole `claude.exe` tree, not the parent PID" doctrine is exactly this membership unit — on a host with a cgroup boundary the atomic-kill file is the leak-proof terminal step of the reap, applied only after the TERM grace from applied-practice §3.1.

### Technique 1.2 — Freeze-then-act to defeat the fork-escape race
**The technique:** before killing or inspecting a busy subtree, *freeze* it so no member can fork a new escapee while you work. Per the cgroup-v2 guide: *"Writing '1' to the file causes freezing of the cgroup and all descendant cgroups. This means that all belonging processes will be stopped and will not run until the cgroup will be explicitly unfrozen,"* and crucially *"Processes in the frozen cgroup can be killed by a fatal signal"* ([kernel.org, cgroup-v2 admin guide](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html)). Freeze first → the membership set is now stable → then atomic-kill or inspect.
**When an expert uses it:** when the target is actively forking (a runaway build loop, a fork-bomb-adjacent burn) and a plain group-signal keeps "missing" newly spawned children.
**Trade-off direction:** freezing buys a consistent snapshot at the cost of a brief global stop of those tasks — pause-then-reap is more *correct* than signal-into-a-moving-target, but adds a stop/unfreeze step; use it only when fork-escape is actually happening, not on every routine reap.
**PRISM application:** for a slot whose orphaned child is itself spawning workers (the OCR-burn / build-loop class golf reaps), freeze-then-kill stops the moving target so the reap is single-pass instead of an endless "I keep finding more children" loop.

---

## Theme 2 — Identity-stable action: signal the *process*, not the *number*

Applied-practice establishes that a bare PID is not a durable identity (reuse race) and that `kill(pid,0)` only proves "*a* process exists." The advanced fix is a kernel handle that **cannot** be confused by recycling.

### Technique 2.1 — Race-free signaling with `pidfd_send_signal`
**The technique:** open a process file descriptor and signal *through it* rather than by number. The pidfd man page is explicit about the hazard it removes: with a plain PID *"the sender may accidentally send a signal to the wrong process if the originally intended target process has terminated and its PID has been recycled for another process"* — whereas *"a PID file descriptor is a stable reference to a specific process; if that process terminates, `pidfd_send_signal()` fails with the error `ESRCH`"* ([pidfd_send_signal(2)](https://man7.org/linux/man-pages/man2/pidfd_send_signal.2.html)). The handle even survives the gap to a zombie: *"Even if the child has already terminated by the time of the `pidfd_open()` call, its PID will not have been recycled and the returned file descriptor will refer to the resulting zombie process"* ([pidfd_open(2)](https://man7.org/linux/man-pages/man2/pidfd_open.2.html)).
**When an expert uses it:** any time there's a delay between *deciding* to kill and *issuing* the kill — exactly the reaper's situation, where confirm-after-N-ticks means the decision and the action are separated in time and the PID may have recycled in between.
**Trade-off direction:** a pidfd is strictly safer than a PID (it fails loud with ESRCH instead of hitting an innocent recycled process), at the cost of holding an FD and a more recent kernel — choose identity-stable handles over numeric PIDs wherever the platform allows; where it doesn't, fall back to the applied-practice re-validation (start-time + argv + ancestry).
**PRISM application:** the reaper's whole reason for keying on the **`claude.exe` tree via ancestry, not the ephemeral recorded PID** is this same race; a pidfd is the kernel-native form of "re-validate identity at the moment of action" — the decision-to-action gap that confirm-after-N-ticks deliberately opens is precisely where a recycled PID would bite.

---

## Theme 3 — Owning the reaper role without being PID 1

Foundations notes orphans get reparented to init/a subreaper. The advanced technique is to *become* that subreaper deliberately, so a userspace hygiene owner reaps descendants the way init would — without running as PID 1.

### Technique 3.1 — `PR_SET_CHILD_SUBREAPER`: be init for your own subtree
**The technique:** mark the hygiene/supervisor process as a child subreaper so orphaned descendants reparent *to it* instead of skipping to init. Per the man page: *"When a process becomes orphaned (i.e., its immediate parent terminates), then that process will be reparented to the nearest still living ancestor subreaper,"* and *"A subreaper fulfills the role of `init(1)` for its descendant processes"* — useful for *"session management frameworks where a hierarchical group of processes is managed by a subreaper process that needs to be informed when one of the processes ... terminates"* ([PR_SET_CHILD_SUBREAPER(2const)](https://man7.org/linux/man-pages/man2/PR_SET_CHILD_SUBREAPER.2const.html)).
**When an expert uses it:** when you want a *single, designated* owner to reliably collect every orphan in a tree (and get the SIGCHLD signal for it) rather than losing the orphan to a distant init that has no idea it should be watched.
**Trade-off direction:** designating a subreaper concentrates reaping responsibility (one clear owner, no lost orphans) at the cost that *that* process must itself stay alive and actually `wait()` — a subreaper that dies or never reaps is worse than init. Pair ownership with liveness.
**PRISM application:** golf as the **single hygiene owner** is the application-layer version of this exact pattern — exactly one designated reaper for the fleet's orphans (the leader-election uniqueness property from foundations §5). Where golf runs durable watchdogs as scheduled tasks, the service manager *is* the subreaper; the technique names why a single informed owner beats hoping a distant init notices.

---

## Theme 4 — Reaping under pressure: pressure-gated and victim-biased

Naive reapers fire on a fixed schedule regardless of system state. The advanced strategy ties reaping to *actual resource pressure* and, when something must die, chooses the *least-harmful* victim.

### Technique 4.1 — Pressure-gated action via PSI (act before the hard OOM)
**The technique:** instead of (or in addition to) a fixed tick, watch Pressure Stall Information and act on rising stall *before* the kernel is forced into an OOM kill. The kernel PSI doc: the *"some"* line is *"the share of time in which at least some tasks are stalled on a given resource,"* and the *"full"* line *"the share of time in which all non-idle tasks are stalled ... simultaneously"* — a *"thrashing"* state where *"actual CPU cycles are going to waste."* PSI exists so systems can be *"managed dynamically using techniques such as load shedding ... or strategically pausing or killing low priority or restartable batch jobs,"* letting you *"maximize hardware utilization without sacrificing workload health or risking major disruptions such as OOM kills"* ([docs.kernel.org, PSI](https://docs.kernel.org/accounting/psi.html)).
**When an expert uses it:** when raw free-RAM is a lagging signal — PSI *some* climbs while there is still nominally free memory, giving an early, graduated warning that the *fixed-schedule* reaper would miss until it's too late.
**Trade-off direction:** pressure-gating makes reaping *responsive* (it leans in early under real contention and stays quiet when the box is idle) rather than blindly periodic — at the cost of a tuned threshold and the risk of over-reacting to a transient spike. Bias toward acting on sustained pressure (a window), not a single instantaneous reading.
**PRISM application:** this is the principled basis for the fleet's **graduated-pressure / Tier-1 ballast** reaping and the "name WHICH chat to /compact under critical pressure" memory-monitor — PSI-style *sustained-stall* gating is what turns "reap on a timer" into "reap when the box is actually suffering." (The PSI/RSS thresholds and the pressure tiers are owner-gated.)

### Technique 4.2 — Bias the sacrifice: protect critical, volunteer the restartable (`oom_score_adj`)
**The technique:** when something *must* be killed to relieve memory, don't let the choice be arbitrary — pre-bias it. The kernel scores each task 0–1000 ("badness"), and *"The value of `oom_score_adj` is added to the badness score before it is used to determine which task to kill"* — a positive value makes a process *"more likely"* to be picked, a negative value protects it, and `-1000` means it *"will always report a badness score of 0"* (never killed) ([proc_pid_oom_score_adj(5)](https://man7.org/linux/man-pages/man5/proc_pid_oom_score_adj.5.html)).
**When an expert uses it:** to encode *policy* into the kernel's last-resort decision — protect the MCP server / the hygiene owner itself, and make the cheap-to-restart batch burns the first volunteers — so an OOM event sheds the *right* load instead of killing the one process whose death cascades.
**Trade-off direction:** biasing trades a tiny bit of "the kernel's own heuristic knows best" for *intentional survivability* — you decide what is load-bearing vs. disposable. Over-protecting too many processes defeats the purpose (there must be a designated victim), so protect narrowly and volunteer generously.
**PRISM application:** the "critical-memory ballast" + "Docker daemon NEVER auto-restart" + "restartable batch jobs" distinctions in golf's reaper are exactly a survivability ranking — `oom_score_adj` is the kernel-native way to make that ranking authoritative *before* a crunch, so the OOM killer sacrifices a re-runnable OCR burn, not the master brain. (The actual adjustment values are owner-gated.)

---

## Theme 5 — Adaptive detection and disciplined restart (the supervision spine)

Foundations frames the reaper as an *unreliable failure detector* with a fixed timeout. The advanced layer makes detection *adaptive* and the restart that follows *disciplined* — so the system neither false-kills the merely-slow nor restarts a doomed process forever.

### Technique 5.1 — Accrual (phi) failure detection: continuous suspicion, not a binary timeout
**The technique:** replace the fixed "N missed heartbeats = dead" boolean with a *continuous* suspicion value computed from the statistical history of heartbeat arrival times. Per the Akka phi-accrual doc: *"Rather than only answering 'yes' or 'no' to the question 'is the node down?' it returns a `phi` value representing the likelihood that the node is down"*; it *"decouples monitoring and interpretation ... keeping a history of failure statistics ... Phi is calculated from the mean and standard deviation of historical inter arrival times"* so it *adapts* to network conditions; and the application picks a threshold where *"A low `threshold` is prone to generate many false positives but ensures a quick detection ... a high `threshold` generates fewer mistakes but needs more time to detect actual crashes"* ([Akka failure detector](https://doc.akka.io/libraries/akka-core/current/typed/failure-detector.html)).
**When an expert uses it:** when heartbeat intervals are *variable* (a slot that's sometimes idle, sometimes in a long GPU burn) — a fixed timeout must be set for the worst case and is then too slow for the common case; an accrual detector *learns* the normal jitter and only suspects when the gap is statistically abnormal.
**Trade-off direction:** accrual converts the binary fast-vs-accurate tension (foundations §4 / applied-practice §5.3) into a *tunable continuous dial* — one threshold trades detection speed against false-positive rate explicitly, and the detector *adapts* its baseline instead of you guessing one constant. The cost is more state (a sliding window of arrival times) and the right distributional assumption.
**PRISM application:** this is the principled upgrade path for golf's `{stale, crashed}` two-window classifier and confirm-after-N-ticks — instead of two hard ms cutoffs, a phi-style suspicion that learns each slot's normal heartbeat cadence would suspect a *truly* abnormal gap faster while tolerating a slot's known long bursts. (This fills the adaptive-detector gap the applied-practice entry had to drop when its Wikipedia source 404'd; the phi threshold + window are owner-gated.)

### Technique 5.2 — Supervision-tree restart strategies: scope the blast radius of a restart
**The technique:** when a watched child dies, don't reflexively restart only it — choose a *strategy* matched to the dependency coupling. Erlang/OTP names three: *one_for_one* — *"If a child process terminates, only that process is restarted"*; *one_for_all* — *"If a child process terminates, all remaining child processes are terminated. Subsequently, all child processes, including the terminated one, are restarted"*; *rest_for_one* — *"the child processes after the terminated process in start order are terminated ... and the remaining child processes are restarted"* ([Erlang/OTP supervision principles](https://www.erlang.org/doc/system/sup_princ.html)).
**When an expert uses it:** when restarted children share state or ordering. If a crash leaves *peers* in an inconsistent state, restarting only the crashed one (`one_for_one`) leaves the others corrupt — `one_for_all` resets the whole interdependent set; `rest_for_one` resets the crashed one and everything started *after* it (its dependents).
**Trade-off direction:** the strategy trades *recovery completeness* against *disruption* — `one_for_one` is least disruptive but assumes independence; `one_for_all` is most thorough but restarts healthy siblings. Pick the *narrowest* strategy that still restores a consistent state; matching coupling beats both "restart everything" and "restart only the corpse."
**PRISM application:** golf coordinating fleet restarts is a supervision tree — a single dead slot is `one_for_one` (reap+restart it alone), but a shared-substrate failure (a corrupted lock or index that several slots depend on) is the `rest_for_one`/`one_for_all` case: restart the dependents too, because leaving them on the broken dependency just defers the next crash.

### Technique 5.3 — Restart intensity ceiling: stop the crash-loop, escalate instead
**The technique:** bound how often a child may be restarted, and when the bound is exceeded, *stop restarting and escalate* rather than spin forever. Per Erlang/OTP: *"If more than `MaxR` number of restarts occur in the last `MaxT` seconds, the supervisor terminates all the child processes and then itself,"* because *"The intention of the restart mechanism is to prevent a situation where a process repeatedly dies for the same reason, only to be restarted again."* The supervisor's own death lets *"its parent supervisor to intervene rather than perpetuating crash loops"* ([Erlang/OTP supervision principles](https://www.erlang.org/doc/system/sup_princ.html)).
**When an expert uses it:** always, on any auto-restart path — a process that dies *for the same reason* (bad config, missing dependency, poison input) will die again instantly; blind restart is a CPU/log/thundering-herd self-DOS, not recovery.
**Trade-off direction:** an intensity ceiling trades *availability-at-all-costs* for *loop-safety* — it deliberately gives up after too-many-too-fast and surfaces the failure upward, which is *more* available in the long run than a tight infinite restart loop that thrashes the whole box. Set the ceiling low enough to catch a tight loop, high enough to tolerate a genuine transient.
**PRISM application:** the fleet-reaper / watchdog restart paths need this ceiling so a slot that crash-loops on a corrupt lock isn't restarted forever — past the ceiling, escalate to an operator surface (the `--hunt` operator-orphan list from applied-practice §3.3) instead of perpetuating the loop. It also composes with the jitter/phase-offset desync (applied-practice §5.1/5.2) so restarts that *do* happen don't synchronize into a herd. (MaxR / MaxT are owner-gated.)

---

## Owner-gate (NOT promoted)

The following stay **[owner-gate]** for golf to bind against PRISM's live config + measured behavior — this entry asserts the *technique/direction*, never the number:
- **Graduated-reap grace + escalation timing** (Theme 1) — the SIGTERM grace window before the atomic `cgroup.kill`/freeze-then-kill escalation is operational; verify against the reaper kill path + `PRISM_FLEET_REAPER_*` knobs, never hardcode from kernel/systemd defaults.
- **Failure-detector windows / phi threshold** (5.1) — the `staleThresholdMs`, `crashedThresholdMs`, confirm-after-N-ticks, and any phi suspicion threshold + history-window size are the concrete tunings the accrual theory generalizes; read them from `chat-slots.mjs` / `install-fleet-reaper-task.ps1`, do not assert a number.
- **PSI / RSS pressure tiers** (4.1) — the PSI *some/full* trigger levels, the Tier-1 graduated-pressure ballast thresholds, and the MCP-watchdog RSS ceiling are host-specific (Blackwell box, 136GB RAM); bind to `CANONICAL-HOST-FACTS` + live config.
- **`oom_score_adj` values** (4.2) — the exact protect/volunteer adjustments per process class are policy; bind to the live reaper/launcher config, not to the man-page example values.
- **Restart intensity ceiling** (5.3) — the `MaxR`/`MaxT` (restarts-per-window) and phase-offset/jitter minutes are config; bind to the live task registration, never to Erlang's defaults.
- **NUMERICS LEFT GATED: yes** — no kill/grace/heartbeat/phi/PSI/RSS/oom/restart-intensity numeric threshold is promoted into this advanced-techniques entry; all are deferred to golf + live config so the doctrine spine can't drift into a wrong number.

## Sources (distinct URLs WebFetch-confirmed during this create pass, 2026-06-10)

> Each URL below was fetched and its quoted facts confirmed before inclusion. Free kernel docs + primary man pages + free official framework docs, prioritized in that order. The phi-accrual technique — which the applied-practice entry had to DROP when its Wikipedia source 404'd — is recovered here from Akka's free official failure-detector doc, which describes the same Hayashibara et al. accrual detector. The IEEE/CiteSeerX primary PDFs for phi-accrual were attempted and failed (certificate error / no abstract exposed) and are NOT cited.

1. Linux kernel — cgroup v2 admin guide (cgroup.kill, cgroup.freeze, memory.pressure) — https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html  *(primary free kernel doc)*
2. Linux kernel — PSI: Pressure Stall Information — https://docs.kernel.org/accounting/psi.html  *(primary free kernel doc)*
3. Linux PR_SET_CHILD_SUBREAPER(2const) man page — https://man7.org/linux/man-pages/man2/PR_SET_CHILD_SUBREAPER.2const.html  *(primary authoritative doc)*
4. Linux pidfd_open(2) man page — https://man7.org/linux/man-pages/man2/pidfd_open.2.html  *(primary authoritative doc)*
5. Linux pidfd_send_signal(2) man page — https://man7.org/linux/man-pages/man2/pidfd_send_signal.2.html  *(primary authoritative doc)*
6. Linux proc_pid_oom_score_adj(5) man page — https://man7.org/linux/man-pages/man5/proc_pid_oom_score_adj.5.html  *(primary authoritative doc)*
7. Erlang/OTP — Supervision Principles (restart strategies + max restart intensity) — https://www.erlang.org/doc/system/sup_princ.html  *(free official framework doc)*
8. Akka — Phi Accrual Failure Detector — https://doc.akka.io/libraries/akka-core/current/typed/failure-detector.html  *(free official framework doc)*
