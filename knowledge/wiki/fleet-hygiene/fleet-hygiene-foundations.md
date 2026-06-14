---
title: Fleet-Hygiene Foundations — process lifecycle, reaping orphans/zombies, heartbeats, failure detectors, leader election, split-brain
galaxy: fleet-hygiene
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-meta-create-workflow (2026-06-10)"
verification_method: CS/OS/distributed-systems facts WebFetch-confirmed against primary/free sources — OSTEP free textbook Ch.5 (ostep.org PDF, read + quoted), the Linux wait(2) man page (man7.org), MIT 6.824 free course schedule (pdos.csail.mit.edu), and Wikipedia articles for process-state / failure-detector (Chandra-Toueg) / heartbeat / split-brain / leader-election. PRISM-galaxy engineering-relevance lines are this-repo mapping, not external claims.
tags: [fleet-hygiene, golf, process-lifecycle, orphan, zombie, reaping, heartbeat, failure-detector, chandra-toueg, leader-election, split-brain, quorum, OSTEP, MIT-6824, distributed-systems, free-textbook]
---

# Fleet-Hygiene Foundations

The domain-knowledge spine for the **fleet-hygiene** galaxy (owner: **golf**): the operating-system and distributed-systems theory that grounds PRISM's fleet reaper, chat-slot liveness, heartbeat watchdogs, and the single-owner (golf) hygiene role. The fleet reaper is, at bottom, a **failure detector + orphan/zombie reaper** for a "fleet" of up-to-26 concurrent `claude.exe` process trees — exactly the problem space that OS process-lifecycle theory and the distributed failure-detector literature formalize. Each section below maps one piece of established CS theory to how this galaxy uses it. **Facts are WebFetch-confirmed against the cited free/primary source** (marked CONFIRMED); the per-section *engineering relevance* line is a mapping onto this repo, not an external claim. Specific PRISM thresholds (reap-after-N-ticks, stale-ms windows, RSS ceilings) are deliberately **[owner-gate]** — see the Owner-gate section.

## 1. The process abstraction + the parent/child model (why a "fleet of trees" is the right unit)

**CONFIRMED** against OSTEP Ch.5 "Interlude: Process API" ([ostep.org PDF, v1.10, Arpaci-Dusseau](https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-api.pdf)):
- "Each process has a name; in most systems, that name is a number known as a **process ID (PID)**." The PID "is used to name the process if one wants to do something with the process, such as (for example) **stop it from running**."
- The fork system call "is used ... to create a new process." "The creator is called the **parent**; the newly created process is called the **child**." The child "is a nearly identical copy of the parent" — its own address space, registers, and PC, but the fork call returns the child's PID to the parent and `0` to the child.
- A UNIX **shell** "commonly uses fork, wait, and the exec family to launch user commands" — fork to create the child, the exec family to run the command, then wait for completion before re-prompting.

**Engineering relevance for fleet-hygiene:** PRISM's attribution unit is the **`claude.exe` process tree**, not the ephemeral `chat-slots.pid`, precisely because a slot launches child processes (node hooks, python, MCP) that share the parent/child lineage above — the reaper maps PID -> slot **via ancestry** because ancestry is the OS-given, stable relation, whereas a recorded PID goes stale the moment a child re-spawns. (Matches the fleet-memory-monitor doctrine: "attribution unit is the claude.exe tree, NOT chat-slots.pid — ephemeral.")

## 2. Reaping: zombie vs orphan, and why an unreaped child is a real resource leak

**CONFIRMED** against the Linux `wait(2)` man page ([man7.org](https://man7.org/linux/man-pages/man2/wait.2.html)):
- The wait family of calls "are used to wait for state changes in a child of the calling process, and obtain information about the child whose state has changed."
- A **zombie**: "A child that terminates, but has not been waited for becomes a 'zombie'. The kernel maintains a minimal set of information about the zombie process (PID, termination status, resource usage information) in order to allow the parent to later perform a wait to obtain information about the child."
- The leak is concrete: "As long as a zombie is not removed from the system via a wait, it will **consume a slot in the kernel process table, and if this table fills, it will not be possible to create further processes**."
- **Orphan reparenting**: "If a parent process terminates, then its 'zombie' children (if any) are adopted by `init(1)` (or by the nearest 'subreaper' process ...); `init(1)` automatically performs a wait to remove the zombies."

Cross-confirmed by OSTEP: "The wait system call allows a parent to wait for its child to complete execution" — reaping is the act of collecting that exit status.

**Engineering relevance for fleet-hygiene:** this is the literal mechanism the fleet reaper substitutes for. When a slot's `claude.exe` dies, its long-running children (a backgrounded node task, a python OCR burn) become **orphans** — on a system without a reliable subreaper they keep consuming CPU/RAM/GPU. The reaper plays the `init`/subreaper role for the PRISM fleet: it detects the dead-ancestor condition and reaps the orphan. The man page also names the second failure mode the reaper guards: **process-table / handle exhaustion** when un-reaped entries accumulate — the same class as the "16GB tmp-orphan leak" and "lingering background task" hazards golf hunts (and the R14 "close your tool calls" rule).

## 3. The process-state lifecycle (the state machine behind slot liveness)

**CONFIRMED** against Wikipedia "Process state" ([en.wikipedia.org/wiki/Process_state](https://en.wikipedia.org/wiki/Process_state)):
- **New/created** — "When a process is first created, it occupies the 'created' or 'new' state" awaiting admission.
- **Ready** — "A 'ready' or 'waiting' process has been loaded into main memory and is awaiting execution on a CPU" (sits in the ready queue).
- **Running** — actively executing on a CPU core (kernel or user mode).
- **Blocked/waiting** — "A process transitions to a blocked state when it cannot carry on without an external change in state or event occurring" (e.g. waiting on I/O).
- **Terminated** — "A process may be terminated, either from the 'running' state by completing its execution or by explicitly being killed."
- **Zombie** — "The process remains in the process table as a zombie process until its parent process calls the `wait` system call to read its exit status."

**Engineering relevance for fleet-hygiene:** the chat-slot liveness classifier (`chat-slots.mjs golf-liveness` -> `{status, isAlive, ageMs, staleThresholdMs, crashedThresholdMs}`) is exactly a coarse process-state machine over slots: a slot is alive (running/ready), **stale** (blocked-equivalent — heartbeating but quiet past a window), or **crashed** (terminated). Modeling a slot with explicit states (not a boolean "up/down") is what lets the reaper apply a *graduated* response — confirm-before-reap rather than kill-on-first-miss — instead of treating a momentarily-blocked slot as dead.

## 4. Heartbeats + failure detectors: the reaper IS an unreliable failure detector

**CONFIRMED** — heartbeat, against Wikipedia "Heartbeat (computing)" ([en.wikipedia.org/wiki/Heartbeat_(computing)](https://en.wikipedia.org/wiki/Heartbeat_(computing))):
- "A **heartbeat** is a periodic signal generated by hardware or software to indicate normal operation"; "usually a heartbeat is sent between machines at a regular interval in the order of seconds."
- Failure is inferred from **absence**: "If the endpoint does not receive a heartbeat for a time — usually a few heartbeat intervals — the machine that should have sent the heartbeat is **assumed to have failed**."

**CONFIRMED** — failure-detector theory, against Wikipedia "Failure detector" (Chandra & Toueg framing) ([en.wikipedia.org/wiki/Failure_detector](https://en.wikipedia.org/wiki/Failure_detector)):
- A failure detector is a per-process module that maintains a list of **suspected** processes; crucially "an unreliable failure detector can still be reliable in detecting the errors made by the system."
- Classified by two properties:
  - **Completeness** — strong: "every faulty process is eventually permanently suspected by every non-faulty process"; weak: suspected "by some non-faulty process."
  - **Accuracy** — strong: "no process is suspected before it crashes"; weak: "some non-faulty process is never suspected."
- **"Unreliable"** means it can make mistakes — it may wrongly suspect a live process — and still be useful.

**Engineering relevance for fleet-hygiene:** the reaper is precisely an **unreliable, heartbeat-based failure detector**. It reuses the `chat-slots.json lastHeartbeat` field (R3-UU2: no separate heartbeat file) as the periodic signal and infers death from heartbeat *absence over a stale window* — the textbook timeout rule. The completeness/accuracy trade-off is the whole design tension: a too-eager detector kills a live-but-busy slot (an **accuracy** violation — a false suspicion, the exact failure a "confirm-after-N-ticks" gate exists to suppress); a too-lazy one lets orphans linger (a **completeness** weakness). PRISM's "confirm-after-2x300s before reap" is a deliberate accuracy-over-speed choice — and the Chandra-Toueg result that an *unreliable* detector is still useful is the theoretical license to ship a reaper that is occasionally wrong rather than demand a perfect (impossible, in an async system) one.

## 5. Single-owner / leader election + split-brain (why golf owns the reaper, and how it coexists across hosts)

**CONFIRMED** — leader election, against Wikipedia "Leader election" ([en.wikipedia.org/wiki/Leader_election](https://en.wikipedia.org/wiki/Leader_election)):
- "Leader election is the process of designating a single process as the organizer of some task distributed among several computers (nodes)."
- A valid election satisfies **Termination**, **Uniqueness** ("there is exactly one processor that considers itself as leader"), and **Agreement** ("all other processors know who the leader is").
- Symmetry is broken via comparable identities (e.g. designate the highest id).

**CONFIRMED** — split-brain, against Wikipedia "Split-brain (computing)" ([en.wikipedia.org/wiki/Split-brain_(computing)](https://en.wikipedia.org/wiki/Split-brain_(computing))):
- Split-brain is "data or availability inconsistencies originating from the maintenance of two separate data sets with overlap in scope," arising on a network partition when "private heartbeat connections fail" yet nodes stay up — each "believe[s] they are the only one running" and acts independently.
- Prevention: a **quorum/majority** strategy ("the sub-partition with a majority of the votes remain[s] available, while the remaining sub-partitions ... fall down to an auto-fencing mode"), often combined with heartbeat + a quorum witness; **fencing** isolates the losing side.

**Engineering relevance for fleet-hygiene:** golf as the **single hygiene owner** of the reaper is a leader-election outcome — exactly one slot runs the reaper so two reapers never race to kill the same PID (the uniqueness property). The cross-host design is a split-brain mitigation by **partitioning identity, not voting**: golf is "a *role*, not a host-pin" — lock files are **per-host**, so each machine runs its own golf with "no cross-host contention." That sidesteps the classic split-brain trap (two reapers each thinking they own the fleet after a partition) by giving each host a disjoint scope rather than forcing a quorum across an unreliable link — and the reaper's own host-filter (MS2 cross-PC filter) is the fencing boundary that stops it reaping a PID it doesn't own.

## 6. Free / legal source corpus (the fleet-hygiene external knowledge base)

- **OSTEP — "Operating Systems: Three Easy Pieces"** (Arpaci-Dusseau, Univ. Wisconsin) — **free full textbook**; the **Process API** chapter (Ch.5) and the process/scheduling/concurrency chapters are the canonical free grounding for the parent/child/PID/wait/signal model in sections 1-3. [src: [ostep.org Ch.5 PDF](https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-api.pdf)]
- **MIT 6.824 / 6.5840 "Distributed Systems"** — **free MIT course**; its fault-tolerance lectures are the structured free spine for sections 4-5. **CONFIRMED** lecture titles include "**Fault Tolerance: Raft (1)**" and "**Fault Tolerance: Raft (2)**" plus "**GFS**", with Paxos/Zookeeper/chain-replication on the schedule. [src: [MIT 6.824 schedule](https://pdos.csail.mit.edu/6.824/schedule.html)]
- **Linux `wait(2)` man page** — primary, authoritative reference for the zombie/reaping/reparenting semantics in section 2. [src: [man7.org wait(2)](https://man7.org/linux/man-pages/man2/wait.2.html)]
- Cross-institutional curriculum note: Raft (6.824's fault-tolerance backbone) is the modern, understandable consensus protocol underlying leader election + log replication — the bridge from section 5's leader-election *properties* to a deployable algorithm, should the galaxy ever formalize a quorum-based multi-host reaper.

## Owner-gate (NOT promoted)

The following remain **[owner-gate]** for golf to bind against PRISM's live config + measured behavior, NOT hardcoded from the theory above:
- **Reaper timing constants** — the "confirm-after-N-ticks" value (currently ~2x300s), the scheduled-task 5-min period + phase offsets, and the global Stop-hook throttle (~45s) are operational tunings; verify against `install-fleet-reaper-task.ps1` + `PRISM_FLEET_REAPER_*` knobs before any doc asserts a number.
- **Liveness thresholds** — `staleThresholdMs` / `crashedThresholdMs` returned by `chat-slots.mjs golf-liveness` are the concrete heartbeat-timeout windows the section-4 theory generalizes; the actual ms values live in `chat-slots.mjs`, read them there.
- **Memory/pressure ceilings** — the RSS / Tier-1 graduated-pressure ballast thresholds (fleet-memory-monitor, MCP watchdog ~3GB) are host-specific (Blackwell box, 136GB RAM) — bind to `CANONICAL-HOST-FACTS` + live config, never to a generic OS rule.
- **SAFETY THRESHOLDS LEFT GATED: yes** — no kill/reap/pressure numeric threshold is promoted into this foundations entry; all are deferred to golf + live config so the doctrine spine can't drift into a wrong number.

## Sources (distinct URLs WebFetch-confirmed during this create pass, 2026-06-10)

> Each URL below was fetched (or, for the OSTEP PDF, fetched-then-read as PDF) and its quoted facts confirmed before inclusion. Prioritized free-textbook + free-college-course + primary-doc categories.

1. OSTEP free textbook, Ch.5 Process API (PDF, read + quoted) — https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-api.pdf  *(free college textbook)*
2. MIT 6.824 / 6.5840 Distributed Systems — course schedule — https://pdos.csail.mit.edu/6.824/schedule.html  *(free college course)*
3. Linux wait(2) man page — https://man7.org/linux/man-pages/man2/wait.2.html  *(primary authoritative doc)*
4. Wikipedia — Process state — https://en.wikipedia.org/wiki/Process_state
5. Wikipedia — Failure detector (Chandra & Toueg framing) — https://en.wikipedia.org/wiki/Failure_detector
6. Wikipedia — Heartbeat (computing) — https://en.wikipedia.org/wiki/Heartbeat_(computing)
7. Wikipedia — Split-brain (computing) — https://en.wikipedia.org/wiki/Split-brain_(computing)
8. Wikipedia — Leader election — https://en.wikipedia.org/wiki/Leader_election
