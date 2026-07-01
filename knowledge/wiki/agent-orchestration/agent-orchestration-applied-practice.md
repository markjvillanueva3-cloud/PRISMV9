---
title: Agent-Orchestration Applied Practice — distributed-coordination gotchas, failure modes, and the technique decisions theory does not teach
galaxy: agent-orchestration
owner_slot: zebra
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice-meta (2026-06-10)"
verification_method: Each practitioner gotcha was WebFetch-confirmed against a reputable free/legal CS reference before it was written (Wikipedia CS articles on split-brain, leases, the thundering-herd problem, race conditions/lost-update, idempotence, failure detectors, reliable delivery/retransmission, and exponential backoff; cross-referenced with the already-confirmed Raft mechanisms in agent-orchestration-foundations.md). The exactly-once-delivery page 404'd and was replaced by the idempotence + reliable-delivery pages per the retry-once-then-drop rule. PRISM-galaxy mappings are interpretive (see Owner-gate). No benchmark numbers are asserted as PRISM-tuned.
tags: [agent-orchestration, distributed-coordination, split-brain, lease-vs-lock, thundering-herd, lost-update, read-modify-write, at-least-once, exactly-once, idempotence, failure-detector, heartbeat, exponential-backoff, jitter, fencing, quorum, practitioner-knowledge, tribal-knowledge]
---

# Agent-Orchestration Applied Practice

The **practitioner-knowledge** layer for the agent-orchestration galaxy — the hard-won coordination gotchas, failure modes, and technique decisions that the theory in `agent-orchestration-foundations.md` does not teach. Foundations tells you *what consensus/leader-election/scheduling are*; this entry tells you *what actually goes wrong* when a fleet of agents coordinates over shared state, and how an expert engineer designs around it.

Read the foundations first — this entry deliberately does not re-explain Raft, FLP, CAP, 2PC, MapReduce, or scheduling theory. It cites them where a gotcha is the practical edge of one of those results.

**Honesty note (R12):** every gotcha below was WebFetch-confirmed against a free CS reference before it was written (see `## Sources`). The "PRISM hits this when…" line on each is an interpretive mapping of the design lesson onto this galaxy's slot/claim/heartbeat machinery, not a measured equivalence — see `## Owner-gate`.

---

## 1. Mutual exclusion under failure — the lock vs lease decision

### Gotcha 1.1 — A plain lock held by a dead process freezes the resource forever

A traditional lock requires the holder to **explicitly release** it. If the holder crashes, deadlocks, or is partitioned away mid-hold, the lock is never released and the protected resource becomes "permanently unavailable" (Wikipedia, *Lease (computer science)*).

**Why:** the lock protocol has no notion of time — it only knows "held" vs "released," and a dead holder transitions to neither.

**Expert's avoidance:** use a **lease** instead — "a contract that gives its holder specified rights to some resource for a limited period," which is "valid for a limited period, after which it automatically expires, making the resource available for reallocation by a new client" (*Lease*). The lease converts "holder must release" (fragile to crashes) into "ownership decays unless renewed" (crash-safe by construction).

**PRISM hits this when:** a slot claims a `MILESTONE::U-ID` and then the chat dies. A pure lock would orphan that unit forever; PRISM's claim store is lease-shaped — claims **heartbeat** and a stale claim (>5min no heartbeat, per the roadmap claim mechanism) is reclaimable. The fleet-reaper's "confirm-after-N-ticks" is the lease-expiry made explicit.

### Gotcha 1.2 — Lease expiry still needs the old holder to STOP acting

The subtle failure with leases: expiry on the granter's side does not magically stop the holder. The reference flags that lease expiration "requires some means of notifying the lease holder of the expiration and preventing that agent from continuing to rely on the resource" (*Lease*) — otherwise a slow holder whose lease expired keeps writing as if it still owns the resource.

**Why:** the granter reassigned the resource based on a clock; the old holder may not have observed the same clock and believes it is still valid (this is the same root as split-brain, §2).

**Expert's avoidance:** **fencing** — the new holder gets a token/epoch that invalidates the old one's writes, so a late write from the expired holder is rejected at the resource, not merely discouraged.

**PRISM hits this when:** a reclaimed unit is re-assigned to a new slot while the original (slow, not actually dead) slot is still mid-edit. Without a fencing epoch on the write, both produce output. PRISM leans on **single-writer ownership** of canonical artifacts plus the file-claim guard as the practical fence.

---

## 2. Split-brain — the two-leaders failure that corrupts data

### Gotcha 2.1 — When the network partitions, BOTH sides can elect themselves primary

Split-brain is "a state indicating data or availability inconsistencies originating from the maintenance of two separate data sets with overlap in scope" — it arises when nodes "fail to communicate and synchronize" yet each keeps operating (Wikipedia, *Split-brain (computing)*). Two would-be primaries each accept writes; the two data sets then conflict or corrupt on rejoin.

**Why:** a partition is indistinguishable, from one side, from "the other side died." Each side, applying "the other is gone → I should take over," reaches the wrong conclusion simultaneously.

**Expert's avoidance:** **quorum** — "the sub-partition with a majority of the votes remains available, while the remaining sub-partitions should fall down to an auto-fencing mode" (*Split-brain*). A minority side must refuse to act. This is the same majority-commit rule Raft uses (foundations §4): a partitioned old leader cannot reach a majority, so it cannot commit.

**PRISM hits this when:** two chats both believe they own the same slot/resource after a `/compact` or terminal-pin drift. The leader-election Uniqueness property (foundations §5) is the *spec*; split-brain is what its *violation* looks like in production — which is why claims are lockfile-guarded atomic RMW that refuse on schema mismatch rather than optimistically taking over.

### Gotcha 2.2 — A 2-node cluster cannot self-resolve split-brain

The starkest practitioner fact: in two-node clusters without a quorum witness, "if heartbeat fails, cluster members cannot determine which should be active," giving "at least a 50% probability that a 2-node HA cluster will totally fail until human intervention is provided, to prevent multiple members becoming active independently and either directly conflicting or corrupting data" (*Split-brain*).

**Why:** with only two votes, neither side can ever hold a strict majority of a 2-member set when the link is down — there is no tie-breaker.

**Expert's avoidance:** add an **odd third voter** (a witness/arbiter), or make one side authoritative by external rule, never "both decide locally."

**PRISM hits this when:** two hosts each run their own golf/role. The galaxy's answer is per-host lock files + a single canonical shared-state owner, not two peers negotiating who is primary — the "one machine hosts the full fleet" coexistence model is the third-voter substitute.

---

## 3. Heartbeats and failure detection — evicting a worker that was actually alive

### Gotcha 3.1 — Timeout-based detection wrongly suspects a slow-but-live worker (false positive)

A timeout/heartbeat failure detector "can make mistakes — they may wrongly suspect live processes that are simply slow or experiencing network delays," an **accuracy** violation (Wikipedia, *Failure detector*). The reference formalizes the tension: **completeness** ("every faulty process is eventually permanently suspected") pulls toward shorter timeouts, while **accuracy** ("no process is suspected before it crashes") pulls toward longer ones — you cannot maximize both, and "perfect failure detection remains impossible in asynchronous distributed systems."

**Why:** the only evidence is "no heartbeat in T." But silence is ambiguous — it means crashed *or* slow *or* the heartbeat was dropped. A short T catches crashes fast but evicts live-slow workers; a long T avoids false evictions but leaves dead claims held longer.

**Expert's avoidance:** treat suspicion as a **hypothesis, not a verdict** — confirm over multiple intervals before acting, and make eviction *reversible* (the evicted worker can re-acquire if it was alive). Tune T to the workload's real tail latency, not the median.

**PRISM hits this when:** the fleet-reaper considers reaping a long-running slot. Reaping a live-but-busy chat (e.g., a slot deep in a 20-minute GPU bake) is the exact accuracy-violation cost. This is why the reaper uses **confirm-after-N-ticks** (2x300s default) and ancestry confirmation rather than a single missed heartbeat — and why the foundations' note that the reaper window is a *default, not a tuned value* (foundations Owner-gate) matters: the right T is workload-measured.

### Gotcha 3.2 — A heartbeat timeout that is too tight causes spurious leader churn

The Raft mechanism (confirmed in foundations §4) is that followers expect heartbeats within a window (~150-300ms in the reference) and start an election on silence. If that window is shorter than real round-trip variance, a momentarily slow leader is deposed and re-elected repeatedly — useful work stalls during each election.

**Why:** same accuracy/completeness tension as 3.1, now applied to leadership: an over-eager follower interprets transient delay as leader death.

**Expert's avoidance:** size the heartbeat window above the observed network/scheduling jitter, and use **randomized** election timeouts so that when an election *is* warranted, candidates don't all fire at once (foundations §4).

**PRISM hits this when:** a slot-ownership heartbeat is checked on too tight a cadence and a busy slot looks dead. The lesson is the same: heartbeat thresholds (`staleThresholdMs` / `crashedThresholdMs` in the slot-liveness query) must exceed real GC/compact/IO pauses, or the fleet thrashes ownership.

---

## 4. Concurrency on shared state — the lost-update race the gate exists to stop

### Gotcha 4.1 — Read-modify-write without atomicity silently loses an update

The canonical race: two workers each **read** a shared value, **modify** it, and **write** it back; one update is silently lost. The reference's worked example shows two increments of a counter producing 1 instead of 2 because "the increment operations are not mutually exclusive" — both read 0 before either writes (Wikipedia, *Race condition*).

**Why:** the read and the write are separate steps; a second writer can interleave between them, so the second write is computed from a now-stale read and clobbers the first.

**Expert's avoidance:** make the RMW **atomic** — "using mutual exclusion can prevent race conditions in distributed software systems," via "critical sections that must be mutually exclusive" (*Race condition*). In a multi-writer file/store, that means a lockfile-guarded read-modify-write (load → mutate → atomic-rename), never a naive read-then-write.

**PRISM hits this when:** multiple slots append to a shared JSON store (slot-task claims, the recall-counter, the tribal index). PRISM's standing pattern — lockfile-guarded atomic RMW + `schemaVersion` refuse-on-mismatch — is precisely the mutual-exclusion critical section this gotcha demands. The recall-counter RMW serialization and the tribal-index clobber-guard regressions in the project's `## Recent regressions` are real instances of this exact failure surfacing and being fixed.

### Gotcha 4.2 — Choosing consistency over availability on shared writes is the correct default here

This is the applied edge of CAP (foundations §7) and split-brain (§2): when a write to a canonical artifact races a peer or a partition, the practitioner default for *shared mutable truth* is to **block/refuse** (sacrifice availability) rather than proceed and risk a clobber. The split-brain reference's pessimistic approach explicitly "sacrifice[s] availability in exchange for consistency" via quorum (*Split-brain*).

**Why:** a refused write is recoverable (retry later); a clobbered canonical file may be unrecoverable, especially if the prior large version was gitignored.

**Expert's avoidance:** a hard PreToolUse-style guard that *refuses* an edit to a peer-claimed/locked resource, and a write-path guard that refuses a destructive shrink unless explicitly overridden.

**PRISM hits this when:** the file-claim guard blocks an edit to a peer-claimed file, and the tribal-index write guard refuses a >50% shrink without an explicit flag — both are "consistency over availability" choices for canonical state.

---

## 5. Delivery, retries, and the storms they cause

### Gotcha 5.1 — Timeout-based retransmission means at-least-once, which means duplicates

A sender that "resend[s] data if no acknowledgment arrives within a set timeframe" creates a fundamental issue: "the receiver may get duplicate copies if the original message actually arrived but the ACK was delayed or lost" (Wikipedia, *Reliability (computer networking)*; the IEEE 802.11 example: "The sending station will resend a frame if the sending station does not receive an ACK frame within a predetermined period of time"). Timeout-driven retry is inherently **at-least-once**, not exactly-once.

**Why:** the sender cannot distinguish "message lost" from "ACK lost." To guarantee delivery it must retry on silence, and retrying a message that *did* arrive produces a duplicate.

**Expert's avoidance:** since true exactly-once delivery is not free over an unreliable channel, make the *effect* exactly-once via **idempotency**: an idempotent operation "can be applied multiple times without changing the result beyond the initial application," so "an operation can be repeated or retried as often as necessary without causing unintended effects" (Wikipedia, *Idempotence*). Pair with sequence numbers / dedup keys so a redelivered message is recognized and discarded.

**PRISM hits this when:** a task is re-issued to a new worker after a (possibly false-positive, §3) failure detection — the MapReduce re-execution rule (foundations §2) is at-least-once by design. If the unit's effect isn't idempotent (e.g., a non-idempotent append or a duplicated commit), re-issue corrupts. The galaxy's defense is idempotent re-apply + single committing writer, so a duplicated task assignment yields one durable result.

### Gotcha 5.2 — Synchronized retries cause a thundering herd / retry storm

When many clients are "simultaneously awakened, typically in response to a specific event or the availability of a resource" but "only one process is able to respond," the rest "fail and go back to sleep," wasting CPU and degrading performance — the **thundering herd problem** (Wikipedia). A retry storm is the same shape: a transient failure makes every client retry at the same instant, re-contending and re-failing in lockstep.

**Why:** all clients share the same trigger (the event, or a fixed retry delay), so they wake/retry in phase and collide.

**Expert's avoidance:** (a) **wake only one** where the platform allows ("the Linux kernel serializes responses so only one thread or process is woken up"); and (b) **randomized backoff** — "introduce randomness into retry intervals to break the synchronization across the clients, thereby avoiding collisions" (*Thundering herd problem*).

**PRISM hits this when:** the whole fleet reacts to one shared event — e.g., every slot retrying a contended git lock, or 20+ chats hitting the same MCP daemon / API on SessionStart. The mitigations are exactly the documented fleet patterns: API rate-stagger across chats, phase-offset scheduled tasks (the reaper/memory-monitor/task-health each carry a different `+Ns` phase), and a single-wake owner for contended resources.

### Gotcha 5.3 — Deterministic backoff does not fix a storm; only jittered backoff does

The decisive detail: **exponential backoff** waits "a random number of slot times between 0 and 2^c - 1" after `c` collisions, and critically "a deterministic exponential backoff algorithm is unsuitable for this use case since each sender would back off for the same time period, leading them to retransmit simultaneously and cause another collision" (Wikipedia, *Exponential backoff*). The randomization (jitter) is what de-correlates retries; growing the interval alone does not.

**Why:** if every client increases its delay by the same rule with no randomness, they stay in phase — bigger waits, same simultaneous collisions.

**Expert's avoidance:** always add **jitter** to backoff and to election/claim timeouts. This is the same randomized-timeout trick Raft uses to prevent split votes (foundations §4) — the general principle is "de-correlate independent actors' timers."

**PRISM hits this when:** slot-claim and lock backoffs retry against a contended store. A fixed backoff would let two contending slots re-collide indefinitely (split-claim livelock); jittered backoff breaks the symmetry. Treat any "all actors use the same fixed delay" code as a latent storm.

---

## Owner-gate (NOT promoted)

The following are **deliberately not asserted as verified facts** and must be checked by the galaxy owner (zebra) before any promotion:

- **PRISM-galaxy mappings are interpretive, not measured.** Each "PRISM hits this when…" line maps a confirmed CS gotcha onto this galaxy's claim/heartbeat/reaper/guard design from the orchestrator's reading of the codebase. The *gotcha and its avoidance* are cited; the assertion that a specific PRISM hook *is* a lease/fence/idempotent-retry/jittered-backoff instance is design-guidance analogy, not a verified equivalence. Confirm against the actual implementation (`chat-slots.mjs`, `slot-task-claim.mjs`, the fleet-reaper helpers, the file-claim / tribal-index write guards) before citing as fact.
- **All timing numbers are upstream defaults or PRISM docs, not tuned values.** The ~150-300ms Raft heartbeat window, the 2x300s reaper confirm window, the >5min stale-claim threshold, and the >50% shrink-guard ratio are quoted from their sources / existing PRISM docs — they are NOT measured-optimal PRISM settings. Gotchas 3.1/3.2 say explicitly that the right timeout is *workload-measured*; do not treat any of these as a recommended setting without measurement (NUMERICS_LEFT_GATED).
- **No machining/physics safety thresholds appear here by design.** This galaxy coordinates agents; it sets no feed/speed/voltage/clamp limits. Any such number belongs to the speed-feed / safety / quality galaxies and must come from `src/physics/constants.ts`. SAFETY_THRESHOLDS were intentionally not introduced (n/a for this domain).
- **The exactly-once-delivery claim is sourced indirectly.** The dedicated `Exactly-once_delivery` page 404'd; the at-least-once/duplicate/idempotency framing in §5.1 is grounded in the *Reliability (computer networking)* and *Idempotence* pages instead. The stronger formal claim that exactly-once *delivery* is impossible (vs. exactly-once *effect* via idempotency) is left owner-gated — it was not directly confirmed.

## Sources (distinct URLs WebFetch-confirmed during creation, 2026-06-10)

> Each URL below was fetched and its content confirmed before any claim citing it was written. Free, legal CS references only. The Raft official PDF returned non-text binary and the exactly-once-delivery page 404'd; both were dropped per the retry-once-then-drop rule (Raft's mechanisms are already confirmed via the foundations entry's raft.github.io + Raft-Wikipedia fetches).

- **Split-brain (computing)** (CS reference — split-brain definition, quorum/fencing, 2-node failure) — https://en.wikipedia.org/wiki/Split-brain_(computing)
- **Lease (computer science)** (CS reference — lease vs lock, automatic expiry, notify-and-fence challenge) — https://en.wikipedia.org/wiki/Lease_(computer_science)
- **Thundering herd problem** (CS reference — herd definition, wake-one + jittered-backoff mitigation) — https://en.wikipedia.org/wiki/Thundering_herd_problem
- **Race condition** (CS reference — read-modify-write lost update, mutual exclusion fix) — https://en.wikipedia.org/wiki/Race_condition
- **Idempotence** (CS reference — idempotent operations make retries safe; effective exactly-once) — https://en.wikipedia.org/wiki/Idempotence
- **Failure detector** (CS reference — completeness vs accuracy, false suspicion of live processes) — https://en.wikipedia.org/wiki/Failure_detector
- **Reliability (computer networking)** (CS reference — ACK/retransmission, duplicate copies, at-least-once) — https://en.wikipedia.org/wiki/Reliability_(computer_networking)
- **Exponential backoff** (CS reference — randomized exponentially-growing retry; deterministic backoff fails) — https://en.wikipedia.org/wiki/Exponential_backoff
