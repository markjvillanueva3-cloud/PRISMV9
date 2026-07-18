---
title: Agent-Orchestration Foundations — multi-agent systems, distributed coordination, consensus, scheduling, fault handling
galaxy: agent-orchestration
owner_slot: zebra
status: VERIFIED-PARTIAL
verified_by: "papa-meta-create-workflow (2026-06-10)"
verification_method: CS/distributed-systems facts WebFetch-confirmed against primary + reputable-free sources (MIT 6.824 open courseware schedule, the MapReduce OSDI'04 research paper, the Raft consensus site raft.github.io, and Wikipedia CS reference pages for Raft / two-phase-commit / multi-agent-systems / consensus+FLP / CAP / scheduling / leader-election). Each "## " section is grounded in a cited WebFetched source and mapped to how the PRISM agent-orchestration galaxy applies the theory. Established-literature attributions (Dijkstra, Lamport, Fischer-Lynch-Paterson, Brewer) are asserted with citation to the confirming source.
tags: [agent-orchestration, multi-agent-systems, distributed-coordination, consensus, raft, paxos, mapreduce, orchestrator-worker, two-phase-commit, scheduling, leader-election, fault-tolerance, CAP, FLP, MIT-6824, courseware]
---

# Agent-Orchestration Foundations

The domain-knowledge spine for the **agent-orchestration** galaxy: how PRISM should decompose work across the 26-slot NATO fleet, coordinate concurrent agents over shared state, reach agreement when it matters, schedule tasks to workers, and survive agent/host failure without corrupting data. This galaxy's job is the *orchestrator* role over the other galaxies plus model-routing; the theory below is the classic distributed-systems and multi-agent-systems literature that the orchestration patterns are instances of.

**Honesty note (R12):** every section is grounded in a source that was actually WebFetch-confirmed during creation (listed in `## Sources`). Established theoretical results (FLP impossibility, CAP, the consensus properties) are attributed to their authors via the confirming reference pages, not re-derived here. Anything that would set a *safety threshold* for real machining is out of scope for this galaxy and is left to the physics/safety galaxies — see `## Owner-gate`.

## 1. Multi-agent systems — why a fleet beats a monolith (and what that costs)

**CONFIRMED** against Wikipedia "Multi-agent system" (https://en.wikipedia.org/wiki/Multi-agent_system):
- A multi-agent system (MAS) is "a computational system composed of multiple interacting intelligent agents" that can "solve problems that are difficult or impossible for an individual agent or a monolithic system to solve."
- Agents are characterized by **autonomy** ("at least partial independence"), **local views** ("no agent has a full global view, or the system is too complex for an agent to exploit such knowledge"), and **decentralization** ("no agent is designated as controlling").
- Coordination mechanisms include cooperation through agreed languages, **decision protocols encompassing voting and consensus-building algorithms**, and negotiation (challenge-response-contract schemes).

**Application to PRISM agent-orchestration:** the 25-work + 1-hygiene slot fleet *is* a MAS — each slot has a local view (its worktree, its handoff, its galaxy soul) and no slot holds the global view. That is exactly why the galaxy invests in shared-state surfaces (chat bus, workboard, slot-task claims) and consensus-style gates (the 3-of-3 scrutiny consensus): "local views + decentralization" is the strength *and* the failure mode the orchestration layer must manage.

## 2. The orchestrator-worker pattern, grounded in MapReduce

**CONFIRMED** against the MapReduce paper, Dean & Ghemawat, OSDI 2004 (https://static.googleusercontent.com/media/research.google.com/en//archive/mapreduce-osdi04.pdf):
- The **Map** function processes input key-value pairs and emits intermediate key-value pairs; the **Reduce** function "accepts an intermediate key and a set of values for that key" and "merges together these values to form a possibly smaller set of values."
- A single **master** assigns map tasks to available workers, then queues reduce tasks; workers report completion status back to the master.
- Fault tolerance is by **re-execution**: the master reassigns incomplete tasks to other workers, and "completed map tasks are re-executed on a failure because their output is stored on the local disk(s) of the failed machine and is therefore inaccessible."

**Application:** this is the canonical orchestrator-worker (master-worker) topology PRISM uses when one chat fans work out to subagents — decompose into independent tasks, assign to workers, collect results, and on a dead worker **re-issue the task rather than block**. The re-execution rule is the theoretical justification for PRISM's fleet-reaper + task-reclaim design: an orphaned/stale claim is re-assignable because the unit's output is not yet durably committed.

## 3. Consensus, and why it is provably hard (FLP)

**CONFIRMED** against Wikipedia "Consensus (computer science)" (https://en.wikipedia.org/wiki/Consensus_(computer_science)):
- A consensus protocol must satisfy three properties: **Termination** ("eventually, every correct process decides some value"), **Integrity** ("if all the correct processes proposed the same value v, then any correct process must decide v"), and **Agreement** ("every correct process must agree on the same value").
- The **FLP impossibility result** (Fischer, Lynch, Paterson, 1985): "in a fully asynchronous message-passing distributed system, in which at least one process may have a crash failure ... a deterministic algorithm for achieving consensus is impossible."
- FLP does *not* mean consensus is unreachable — "merely that under the model's assumptions, no algorithm can always reach consensus in bounded time"; randomized and partially-synchronous algorithms circumvent it.

**Application:** when PRISM agents must agree (e.g., the scrutiny consensus, or whether a unit is "done"), the orchestration layer cannot assume a deterministic always-terminating vote — it adds timeouts, escape hatches (the 3-attempt auto-pass on the scrutiny gate), and single-writer ownership precisely because FLP says "agree in bounded time" is not free. Termination/Integrity/Agreement are the right checklist for any new fleet voting mechanism.

## 4. Raft — practical leader-based consensus the fleet can actually run

**CONFIRMED** against raft.github.io (https://raft.github.io/) and Wikipedia "Raft (algorithm)" (https://en.wikipedia.org/wiki/Raft_(algorithm)):
- Raft is "a consensus algorithm that is designed to be easy to understand ... equivalent to Paxos in fault-tolerance and performance." Each server has a state machine and a log, and the algorithm agrees on the commands in the servers' logs.
- **Three roles:** *Leader* (accepts client requests, appends to its log, replicates via AppendEntries, applies committed entries), *Follower* (receives entries, expects heartbeats within a timeout window of ~150-300ms), *Candidate* (a temporary role during an election).
- **Leader election** runs in discrete **terms**; a candidate increments the term and requests votes, "a server will vote only once per term, on a first-come-first-served basis," and **randomized election timeouts** prevent split votes.
- **Commit rule:** "Once the leader receives confirmation from half or more of its followers that the entry has been replicated, the leader applies the entry to its local state machine, and the request is considered committed." A 5-server cluster tolerates 2 failures.

**Application:** Raft is the reference design whenever PRISM needs a *single coordinator over replicated state* that survives coordinator death — the leader/term/heartbeat/majority-commit shape maps onto "one slot owns a resource, heartbeats its claim, and a quorum/timeout reassigns it on silence." The randomized-timeout trick is directly why slot-claim and lock backoffs are jittered: deterministic timeouts cause split-claim livelock.

## 5. Leader election — designating the one coordinator

**CONFIRMED** against Wikipedia "Leader election" (https://en.wikipedia.org/wiki/Leader_election):
- Leader election is "the process of designating a single process as the organizer of some task distributed among several computers (nodes)."
- It is needed because, before/after coordinator failure, nodes are "either unaware which node will serve as the 'leader' ... or unable to communicate with the current coordinator."
- Symmetry is broken by comparable identities — "if each node has unique and comparable identities ... the node with the highest identity is the leader."
- A valid algorithm needs **Termination**, **Uniqueness** (exactly one leader), and **Agreement** (all others recognize it).

**Application:** the galaxy's "one owner per resource" rules (golf owns the fleet-reaper; one slot owns the canonical graph writer; per-unit slot-task claims) are leader-election outcomes. The Uniqueness + Agreement properties are the spec a claim system must meet: two slots must never both believe they own the same `MILESTONE::U-ID`, which is why the claim store is a lockfile-guarded atomic RMW that refuses on schema mismatch.

## 6. Atomic commitment across agents — two-phase commit and its blocking flaw

**CONFIRMED** against Wikipedia "Two-phase commit protocol" (https://en.wikipedia.org/wiki/Two-phase_commit_protocol):
- 2PC "coordinates all the processes that participate in a distributed atomic transaction on whether to commit or abort."
- **Phase 1 (voting/prepare):** "the coordinator sends a query to commit message to all participants and waits until it has received a reply from all participants."
- **Phase 2 (commit):** if all agree, "the coordinator sends a commit message to all the participants"; otherwise it "sends a rollback message to all the participants."
- **Critical disadvantage — blocking:** "If the coordinator fails permanently, some participants will never resolve their transactions" — a participant that voted yes "will block until a commit or rollback is received."

**Application:** any multi-agent change that must be all-or-nothing across surfaces (e.g., wire-an-engine-to-every-dispatcher-in-one-commit, the R15 "no orphans" rule) is a 2PC-shaped problem. The blocking flaw is the warning: PRISM prefers a *single committing writer* + idempotent re-apply over a multi-coordinator prepare/commit dance, because a dead coordinator mid-transaction is exactly the orphan/half-wired state the comprehensive-build gates exist to prevent.

## 7. The CAP tradeoff — what you give up under partition

**CONFIRMED** against Wikipedia "CAP theorem" (https://en.wikipedia.org/wiki/CAP_theorem):
- Brewer's theorem: a distributed data store can guarantee at most two of **Consistency** ("every read receives the most recent write or an error"), **Availability** ("every request received by a non-failing node ... must result in a response"), and **Partition tolerance** (operating despite dropped/delayed messages).
- During a partition the system "has to choose between consistency or availability" — either "cancel the operation and thus decrease the availability but ensure consistency" or "proceed ... but risk inconsistency."
- Brewer (2012) clarified the "two of three" framing is misleading: the sacrifice only applies *when partitions actually occur*; otherwise all three hold.

**Application:** PRISM's shared state is multi-writer across slots/hosts, so "partition" is real (a slot goes dark mid-edit). The galaxy's bias is **consistency over availability** for canonical artifacts — the file-claim guard *blocks* an edit to a peer-claimed file (sacrifices availability) rather than risk a clobber (the tribal-index fail-OPEN clobber is the textbook cost of choosing availability there). Read-only advisory surfaces, by contrast, lean available.

## 8. Scheduling — assigning tasks to workers with stated goals

**CONFIRMED** against Wikipedia "Scheduling (computing)" (https://en.wikipedia.org/wiki/Scheduling_(computing)):
- "Scheduling is the action of assigning resources to perform tasks." Goals (often conflicting): **throughput** ("total amount of work completed per time unit"), **latency/response time**, **wait time**, and **fairness**.
- Disciplines: **FIFO/first-come-first-served** (simple, but the convoy effect makes short jobs wait behind long ones), **round-robin** ("a fixed time unit per process ... cycles through them"; prevents starvation), **priority scheduling** (high-priority interrupts low; low-priority starvation possible), and **work-conserving** schedulers that "always try to keep the scheduled resources busy."

**Application:** the orchestration galaxy schedules roadmap units onto slots and model-calls onto local/cloud backends. The named goals are the right vocabulary for that router: prefer a **priority** discipline (the "devtools/backend first" P0 rule) but guard against starvation of low-priority work, and keep the fleet **work-conserving** (idle slot + ready unit = assign). The convoy effect is why a long unit shouldn't block a queue of short ones on a single slot — fan out instead.

## 9. The canonical open-courseware reading list (MIT 6.824)

**CONFIRMED** against the MIT 6.824 Distributed Systems schedule (https://pdos.csail.mit.edu/6.824/schedule.html):
- The course sequences the exact foundations above as primary readings: **MapReduce (2004)** (Lec 1), **GFS (2003)** (Lec 3), **Paxos** (Lec 4), **Raft (extended) (2014)** across two lectures (Lec 6-7), **Consistency and Linearizability** (Lec 8), **ZooKeeper (2010)** (Lec 9), **Distributed Transactions** (Lec 11), **Spanner (2012)** (Lec 12), and **Chain Replication (2004)** (Lec 13).

**Application:** this is the de-facto syllabus for anyone deepening the galaxy. The progression (data-parallel master-worker → replication → consensus → consistency → transactions) mirrors the order PRISM's orchestration concerns appear: first fan-out work, then keep replicas of shared state consistent, then agree, then commit atomically. Use it as the canonical further-reading spine; every paper named here is free on the course page.

## Owner-gate (NOT promoted)

The following were deliberately **left out** of the confirmed body and must be checked by the galaxy owner (zebra) before any promotion — they are *not* WebFetch-confirmed claims:

- **PRISM-internal mappings are interpretive, not measured.** Each "Application" paragraph maps classic theory onto PRISM's slot/claim/gate design from the orchestrator's understanding of the codebase; the *theory* is cited, but the assertion that a given PRISM hook "is a Raft/2PC/leader-election instance" is an analogy for design guidance, not a verified equivalence. Owner should confirm against the actual implementation (`chat-slots.mjs`, `slot-task-claim.mjs`, the scrutiny ledger) before citing it as fact.
- **Specific numeric design parameters** (e.g., Raft's ~150-300ms heartbeat window, the 2×300s reaper confirm window, slot-claim backoff jitter) are sourced to the reference pages or to PRISM docs — they are *defaults in those systems*, not PRISM-tuned values; do not treat them as recommended PRISM settings without measurement.
- **No machining/physics safety thresholds appear here by design.** This galaxy coordinates agents; it sets no feed/speed/voltage/clamp limits. Any such number belongs to the speed-feed / safety / quality galaxies and must come from `src/physics/constants.ts`, never from an orchestration doc. SAFETY_THRESHOLDS were intentionally not introduced (n/a for this domain).
- **Paxos, linearizability, ZooKeeper, Spanner, chain replication** are named (from the 6.824 schedule) but not yet given their own confirmed sections — flagged as the next deepening pass, not asserted in detail here.

## Sources (distinct URLs WebFetch-confirmed during creation, 2026-06-10)

> Each URL below was fetched and its content confirmed before any claim citing it was written. Free college-course / research-paper sources are prioritized per the creation directive.

- **MIT 6.824 Distributed Systems — course schedule + paper list** (free open courseware) — https://pdos.csail.mit.edu/6.824/schedule.html
- **MapReduce: Simplified Data Processing on Large Clusters — Dean & Ghemawat, OSDI 2004** (free research paper PDF) — https://static.googleusercontent.com/media/research.google.com/en//archive/mapreduce-osdi04.pdf
- **The Raft Consensus Algorithm — official site** (free project site, Ongaro & Ousterhout) — https://raft.github.io/
- **Raft (algorithm)** (CS reference) — https://en.wikipedia.org/wiki/Raft_(algorithm)
- **Multi-agent system** (CS reference) — https://en.wikipedia.org/wiki/Multi-agent_system
- **Consensus (computer science) — incl. FLP impossibility** (CS reference) — https://en.wikipedia.org/wiki/Consensus_(computer_science)
- **Two-phase commit protocol** (CS reference) — https://en.wikipedia.org/wiki/Two-phase_commit_protocol
- **CAP theorem (Brewer's theorem)** (CS reference) — https://en.wikipedia.org/wiki/CAP_theorem
- **Scheduling (computing)** (CS reference) — https://en.wikipedia.org/wiki/Scheduling_(computing)
- **Leader election** (CS reference) — https://en.wikipedia.org/wiki/Leader_election
