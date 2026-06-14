---
title: Hermes-Zulu Applied Practice — fleet-orchestration practitioner gotchas, failure modes, and technique decisions
galaxy: hermes-zulu
owner_slot: zebra
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice-meta (2026-06-10)"
verification_method: Each practitioner gotcha is grounded in a free/legal CS-engineering source that was WebFetch-confirmed during creation (Wikipedia CS reference pages for thundering-herd / lease / orphan-process / zombie-process / TOCTOU / application-checkpointing, the AWS Builders' Library timeouts-retries-backoff article, Microsoft Azure Architecture Center Scheduler-Agent-Supervisor pattern, and Martin Kleppmann's "How to do distributed locking" engineering reference). This is the PRACTITIONER layer — the hard-won gotchas, failure modes, and technique decisions that pure theory does not teach — and is DISTINCT from hermes-zulu-foundations.md (theory): the lease/actor/pub-sub/work-stealing/gossip CONCEPTS are NOT re-derived here; this entry covers what goes wrong when you actually run a fleet of long-lived agents over shared files, and how an expert avoids it. SHARED distributed-systems theory (consensus/Raft/CAP) is owned by knowledge/wiki/agent-orchestration. Each gotcha maps to how the PRISM hermes-zulu galaxy (the 26-slot NATO chat fleet) hits it. PRISM-internal mappings are design analogies, not measured equivalences (see Owner-gate). No machining/physics safety thresholds appear here by design.
tags: [hermes-zulu, agent-fleet, applied-practice, tribal-knowledge, gotchas, failure-modes, slot-lease, fencing-token, thundering-herd, backoff-jitter, orphan-process, zombie-reaping, toctou, file-claim-race, checkpointing, handoff-continuity, scheduler-agent-supervisor]
---

# Hermes-Zulu Applied Practice

The **practitioner-knowledge layer** for the hermes-zulu galaxy — PRISM's master orchestrator for the 26-slot NATO chat fleet (25 work + 1 hygiene). Where `hermes-zulu-foundations.md` cites the *theory* (lease, actor model, message-passing, pub-sub, work-stealing, gossip/failure-detection) and `agent-orchestration-foundations.md` owns the *shared* consensus/Raft/CAP theory, this entry is the opposite axis: the **CS-engineering gotchas, failure modes, and technique decisions** that only show up once a real fleet of long-lived agents is running over shared files. Each note is the gotcha + WHY it bites + the expert's avoidance, with a one-line map to how this galaxy hits it.

**Honesty note (R12):** every claim below was WebFetch-confirmed against a free/legal source listed in `## Sources`. The PRISM-internal mappings ("the slot claim is a lease," "the reaper is a supervisor") are design analogies for guidance, attributed in the `## Owner-gate`, not measured equivalences. This galaxy coordinates agents and sets **no** machining/physics safety thresholds.

---

## 1. The dead holder — why a slot claim must be a lease, and why even a lease is not enough

### Gotcha 1a — a lock held by a crashed holder freezes the resource forever
**CONFIRMED** against Wikipedia "Lease (computer science)" (https://en.wikipedia.org/wiki/Lease_(computer_science)): "A traditional resource lock is granted until it is explicitly released by the locking client process" — so when "the client failed before releasing the resources," the resource is stuck. The lease fix is that it "is valid for a limited period, after which it automatically expires, making the resource available for reallocation by a new client."
**WHY it bites a fleet:** long-lived agent chats die mid-work — a crash, a `/compact`, an OOM-kill, a closed terminal. A plain lock on a work unit would mean that unit is owned by a corpse until a human notices.
**Expert avoidance:** make ownership *time-bound and self-expiring*, never explicit-release-only. Renew while you work; let expiry hand the resource back.
**PRISM map:** a slot's claim on a `MILESTONE::U-ID` is a **lease with heartbeat-renew + reap-on-stale**, NOT a lock — exactly so a dead chat does not freeze a unit.

### Gotcha 1b — even an expired lease can still corrupt the resource: the stale-writer / fencing problem
**CONFIRMED** against Kleppmann, "How to do distributed locking" (https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html): "if the GC pause lasts longer than the lease expiry period, and the client doesn't realise that it has expired, it may go ahead and make some unsafe change." The fix is a **fencing token** — "a number that increases ... every time a client acquires the lock" — so the storage rejects a stale write: "the storage server remembers that it has already processed a write with a higher token number (34), and so it rejects the request with token 33." Wikipedia's Lease page agrees the holder must be stopped: "There must be some means of notifying the lease holder of the expiration and preventing that agent from continuing to rely on the resource ... done by requiring all requests to be accompanied by an access token, which is invalidated if the associated lease has expired," and warns that "if a lease is revoked after the lease holder has started operating on the resource, revocation may leave the resource in a compromised state."
**WHY it bites:** the most dangerous chat is not a *dead* one — it is a *paused* one (mid-`/compact`, swapped out, blocked on a slow tool) that wakes after its lease was reaped and reassigned, then commits anyway. Two chats now believe they own the same unit; the late write clobbers the new owner's work.
**Expert avoidance:** do not trust "I held the lease once." Gate the *write*, not just the claim — a monotonically-increasing token (or an equivalent owner-generation check) that the storage layer validates, so a stale holder's commit is rejected at the destination.
**PRISM map:** this is the live hazard behind reclaiming a slot — the reaped chat is a zombie writer; the post-commit auto-release + the reaper's confirm-after-N-ticks gate are the partial fence, and a token/generation check on the claim store is the missing-strength upgrade (owner-gated).

---

## 2. Fleet restart — the thundering herd, and why jitter is not optional

### Gotcha 2a — wake everyone at once and only one wins; the rest waste resources and re-sleep
**CONFIRMED** against Wikipedia "Thundering herd problem" (https://en.wikipedia.org/wiki/Thundering_herd_problem): "A large number of processes or threads are simultaneously awakened ... However, only one process is able to respond to the event or access the new resource, causing most other processes to fail and go back to sleep," and this "unnecessary awakening consumes CPU and other system resources, potentially reducing overall performance."
**WHY it bites:** boot all 26 slots at once and they contend for the *same* shared state on the same tick — the claim store, the chat-bus file, the canonical graph — and 25 of 26 lose the race, retry, and lose again.
**Expert avoidance:** serialize the wakeup so only one proceeds at a time, or stagger the herd in time so they never all hit the resource on the same instant.
**PRISM map:** fleet launch / SessionStart across 26 NATO slots is a thundering herd onto the shared claim store + chat bus; the launcher's per-slot phase offsets exist to break the simultaneity.

### Gotcha 2b — retries that all back off to the same instant just rebuild the herd
**CONFIRMED** against the AWS Builders' Library, "Timeouts, retries, and backoff with jitter" (https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/): "when failures are caused by overload, retries that increase load can make matters significantly worse," and even with exponential backoff, "if all the failed calls back off to the same time, they cause contention or overload again when they are retried." The fix: "jitter adds some amount of randomness to the backoff to spread the retries around in time." Wikipedia's thundering-herd page concurs: "Randomness is added to the wait intervals between retries, so that clients are no longer synchronized."
**WHY it bites:** exponential backoff *alone* keeps clients correlated — they all failed at t0, all double their wait identically, and all retry at the same later instant, recreating the spike. This is the classic mistake of adding backoff but forgetting jitter.
**Expert avoidance:** add **randomness** (jitter) to every retry interval, not just exponential growth — decorrelate the clients in time.
**PRISM map:** when many slots collide on a contended write (graph regen, claim store, a peer-claimed file) the retry path must add per-slot jitter, not a fixed backoff, or the fleet re-synchronizes and re-collides.

---

## 3. Reaping the dead — reap the owning ancestor, never the bare PID

### Gotcha 3a — a zombie cannot be killed; you must act on its PARENT
**CONFIRMED** against Wikipedia "Zombie process" (https://en.wikipedia.org/wiki/Zombie_process): a zombie "is a process that has completed execution (via the exit system call) but still has an entry in the process table"; "the entry is still needed to allow the parent process to read its child's exit status: once the exit status is read via the wait system call, the defunct process' entry is removed from the process table and it is said to be 'reaped'." Critically: "Unlike normal processes, the kill command has no effect on a zombie process" — to clear it "the SIGCHLD signal can be sent to the parent ... If the parent process still refuses to reap the zombie ... the next step can be to remove the parent process." And "if a parent fails to call wait, the zombie will be left in the process table, causing a resource leak."
**WHY it bites:** a naive reaper that targets the leaf PID it found is a no-op against a zombie — the entry only clears when the *parent* reaps it. Worse, the entity actually leaking the resource (the held lease, the process-table slot) is the un-reaping parent, not the dead child.
**Expert avoidance:** reap at the **owning ancestor**, not the bare PID — signal/remove the parent that owns the lineage, because that is the entity holding the leaked state.
**PRISM map:** the fleet-reaper maps PID to slot via *ancestry* and reaps the owning `claude.exe` tree, not the ephemeral leaf PID — exactly the "act on the ancestor" discipline (the `chat-slots.pid` is ephemeral, so attribution is to the tree).

### Gotcha 3b — an orphan is silently reparented; the original parent link is gone
**CONFIRMED** against Wikipedia "Orphan process" (https://en.wikipedia.org/wiki/Orphan_process): "An orphan process is a computer process whose parent process has finished or terminated, though it remains running itself," and on Unix-like systems "any orphaned process will be immediately adopted by an implementation-defined system process: the kernel sets the parent to this process" — historically init, but "in modern ... Linux systems, an orphan process may be reparented to a 'subreaper' process instead of init."
**WHY it bites:** once a chat's parent terminal dies, the work process is reparented — so a reaper that keys on "find children of terminal X" will miss it, because the OS already moved the link. The orphan keeps running (and keeps holding its lease) under a new, generic parent.
**Expert avoidance:** do not assume the parent pointer is stable; identify orphans by their own identity/marker, not only by walking down from the expected parent, and confirm liveness independently before reaping.
**PRISM map:** a chat whose terminal was closed becomes an orphan reparented away from its launcher; the reaper's host-filter + ancestry-confirm + confirm-after-N-ticks gate is what re-finds it without false-reaping a live-but-reparented chat.

---

## 4. Cross-slot file-claim races — TOCTOU, and the atomic exclusive claim

### Gotcha 4a — checking a file then acting on it is a race the moment two slots run concurrently
**CONFIRMED** against Wikipedia "Time-of-check to time-of-use" (https://en.wikipedia.org/wiki/Time-of-check_to_time-of-use): TOCTOU "is a class of software bugs caused by a race condition involving the checking of the state of a part of a system ... and the use of the results of that check," because "it's possible for other programs that run concurrently with this program to execute in between steps 1 and 2" and "other programs can change the property or data." Mitigations: "File locking is a common technique for preventing race conditions for a single file" (with the caveat it is imperfect over networked filesystems), and "transactions in the file system or the OS kernel ... can be used to prevent TOCTOU races."
**WHY it bites:** "is this file claimed? no -> claim it" is two operations; between them a peer can claim it. With 26 slots over shared files, the window is constantly open, and the symptom is two chats editing the same file, the second silently clobbering the first.
**Expert avoidance:** never check-then-act in two steps. Make the claim **atomic** — a single exclusive operation (exclusive-create / lockfile / atomic compare-and-set) that fails if a peer already holds it — rather than a read followed by a write.
**PRISM map:** the slot-task-claim store uses a **lockfile-guarded atomic read-modify-write** for exactly this reason, and the file-claim guard blocks an edit to a peer-claimed file before the write — both close the TOCTOU window that a naive "exists? then write" would leave open.

### Gotcha 4b — concurrent claimants must each hold an exclusive, atomic, durable record
**CONFIRMED** against the Microsoft Azure Architecture Center "Scheduler Agent Supervisor pattern" (https://learn.microsoft.com/en-us/azure/architecture/patterns/scheduler-agent-supervisor): the worked example stamps each task with a `LockedBy` instance-id and a `CompleteBy` deadline, and when a scheduler instance picks a unit "it immediately populates the `LockedBy` field with its own instance ID, sets the `CompleteBy` field to an appropriate time ... The code is designed to be exclusive and atomic to ensure that two concurrent instances ... can't try to handle the same order simultaneously." The pattern also warns that with multiple recoverers "Supervisors must coordinate their work with each other carefully to ensure that they don't compete to recover the same failed steps."
**WHY it bites:** "exclusive and atomic" is a single design requirement, not two nice-to-haves — and the *recovery* path has the same race: two reapers/supervisors fighting to recover the same dead unit is just the TOCTOU bug moved into the cleanup layer.
**Expert avoidance:** stamp owner-id + complete-by atomically on claim; on the recovery side, coordinate the reapers (single-recoverer election or a global throttle) so they don't double-recover.
**PRISM map:** the claim store's `{owner, claimed-at, heartbeat}` record is the `LockedBy`+`CompleteBy` analogue; the reaper's global throttle (one reaper acting per window) is the "Supervisors must coordinate so they don't compete to recover the same step" discipline.

---

## 5. Handoff continuity — persist progress so a reaped chat resumes, not restarts

### Gotcha 5a — losing intermediate state forces a restart from scratch
**CONFIRMED** against Wikipedia "Application checkpointing" (https://en.wikipedia.org/wiki/Application_checkpointing): checkpointing "involves saving a snapshot of an application's state, so that it can restart from that point in case of failure," and it "helps tolerate failures that would otherwise force a long-running application to restart from the beginning"; on restart "it does not need to start from scratch. Rather, it will read the latest state ('the checkpoint') from the stable storage and execute from that point."
**WHY it bites:** a chat that dies mid-unit with no durable progress record loses everything it did this session — the next chat to pick up the lease starts cold, re-deriving context the dead chat already had. Across a 26-slot fleet doing multi-step units, that is enormous repeated work.
**Expert avoidance:** checkpoint the work-in-progress to stable storage *during* the task (not only at the end), keyed so a successor can read it and resume from the last good point.
**PRISM map:** the per-chat `HANDOFF-<slot>-<topic>.md` (auto-written by the precompact hook on `/compact`) is the checkpoint to stable storage; reading it at startup is "execute from the latest checkpoint" instead of from scratch.

### Gotcha 5b — the orchestrator must record per-step state durably and resume in-flight work after a restart
**CONFIRMED** against the Azure "Scheduler Agent Supervisor pattern" (https://learn.microsoft.com/en-us/azure/architecture/patterns/scheduler-agent-supervisor): "As each step is performed, the Scheduler records the state of the workflow, such as 'step not yet started,' 'step running,' or 'step completed,'" into "a durable data store, called the state store." And on crash recovery: "If the Scheduler is restarted after a failure, or the workflow ... terminates unexpectedly, the Scheduler should be able to determine the status of any inflight task that it was handling when it failed, and be prepared to resume this task from that point." The retry path "requires the tasks to be idempotent" because "the steps performed by an Agent could be run more than once."
**WHY it bites:** a handoff that records only "what I was doing" but not "where in the multi-step unit I am" cannot be resumed cleanly — the successor either redoes completed steps (must be idempotent or it double-applies) or skips incomplete ones. And a topic-drifted / topicless handoff is the precursor to the silent-overwrite class: the successor cannot even find the right state.
**Expert avoidance:** record *per-step* state (not-started / running / completed) durably; make resumable steps idempotent so a re-run after reclaim is safe; key the checkpoint unambiguously so the right successor reads the right state.
**PRISM map:** the handoff topic-suffix enforcement (`enforce-handoff-topic`) keeps each checkpoint unambiguously keyed so a reclaiming chat resumes the *right* in-flight unit; the foundations entry's MapReduce/Lab-1 master-worker re-execution is the same "a step may run more than once -> make it idempotent" lesson.

---

## Owner-gate (NOT promoted)

The following are deliberately **left for the galaxy owner (zebra)** to verify before any promotion — they are *not* WebFetch-confirmed equivalences:

- **PRISM-internal mappings are interpretive, not measured.** Each "PRISM map" line maps a cited CS-engineering gotcha onto a PRISM artifact (slot claim = lease, fleet-reaper = supervisor, handoff = checkpoint, claim store = LockedBy+CompleteBy, launcher offsets = thundering-herd mitigation). The *gotcha and its avoidance* are cited; the assertion that a specific PRISM artifact *is* that mechanism is a design analogy. Owner should confirm against the actual code (`chat-slots.mjs`, `slot-task-claim.mjs`, the fleet-reaper, `per-agent-handoff.mjs`, `precompact-handoff.mjs`, the chat-bus injectors) before citing any of it as fact.
- **The fencing-token upgrade is a recommendation, not an observed PRISM feature.** Gotcha 1b's "gate the write with a monotonically-increasing token / owner-generation" is the textbook strengthening; whether the PRISM claim store today validates a stale-writer token at the commit destination is owner-gated. Do not claim PRISM is fully fenced until verified — the confirmed PRISM partial is post-commit auto-release + confirm-after-N-ticks, which is weaker than destination-side token rejection.
- **All numeric parameters are owner-gated / benchmark-specific.** Heartbeat windows, the confirm-after-N-ticks reaper gate (2x300s default), lease-renew intervals, per-slot launch phase offsets, retry backoff/jitter bounds, and the supervisor run-frequency tradeoff ("often enough ... but not so often that it becomes an overhead," per the Azure pattern) are defaults in the cited systems or in PRISM docs — NOT measured/recommended PRISM-tuned values. Leave any such number for the owner to set from measurement. (NUMERICS LEFT GATED.)
- **Shared distributed-systems theory is owned elsewhere.** Consensus/FLP, Raft, leader election, two-phase commit, CAP, and scheduling disciplines are NOT in this entry by design — they live in `knowledge/wiki/agent-orchestration/agent-orchestration-foundations.md`. The lease/actor/pub-sub/work-stealing/gossip CONCEPTS are owned by the sibling `hermes-zulu-foundations.md`. Do not duplicate; extend the pointer instead.
- **No machining/physics safety thresholds appear here by design.** This galaxy coordinates agents; it sets no feed/speed/voltage/clamp limits. Any such number belongs to the speed-feed / safety / quality galaxies and must come from `src/physics/constants.ts`, never from an orchestration doc. SAFETY_THRESHOLDS were intentionally not introduced (n/a for this domain).

## Sources (distinct URLs WebFetch-confirmed during creation, 2026-06-10)

> Each URL below was fetched and its content confirmed before any claim citing it was written. Free college-course / official-docs / reputable-engineering-reference sources only. The shared consensus/Raft/CAP/MapReduce sources and the lease/actor/pub-sub/work-stealing/gossip *concept* sources are owned by the foundations / agent-orchestration entries and are intentionally not re-listed; the Lease page is reused here only for its *fencing/revocation* gotcha, which the foundations entry did not cover.

- **Thundering herd problem** (CS reference) — https://en.wikipedia.org/wiki/Thundering_herd_problem
- **Timeouts, retries, and backoff with jitter** (AWS Builders' Library, reputable engineering reference) — https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
- **Lease (computer science)** (CS reference — cited here for fencing/revocation, distinct from the foundations concept cite) — https://en.wikipedia.org/wiki/Lease_(computer_science)
- **How to do distributed locking** (Martin Kleppmann, reputable engineering reference — fencing token + process pause) — https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html
- **Zombie process** (CS reference) — https://en.wikipedia.org/wiki/Zombie_process
- **Orphan process** (CS reference) — https://en.wikipedia.org/wiki/Orphan_process
- **Time-of-check to time-of-use (TOCTOU)** (CS reference) — https://en.wikipedia.org/wiki/Time-of-check_to_time-of-use
- **Scheduler Agent Supervisor pattern** (Microsoft Azure Architecture Center, official docs) — https://learn.microsoft.com/en-us/azure/architecture/patterns/scheduler-agent-supervisor
- **Application checkpointing** (CS reference) — https://en.wikipedia.org/wiki/Application_checkpointing
