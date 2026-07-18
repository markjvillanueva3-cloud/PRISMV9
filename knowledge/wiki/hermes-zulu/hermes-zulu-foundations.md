---
title: Hermes-Zulu Foundations — fleet orchestration, slot leases, message buses, work allocation, membership and failure detection
galaxy: hermes-zulu
owner_slot: zebra
status: VERIFIED-PARTIAL
verified_by: "papa-meta-create-workflow (2026-06-10)"
verification_method: CS/distributed-systems facts WebFetch-confirmed against primary + reputable-free sources (the MIT 6.5840/6.824 open-courseware schedule with its lab sequence, plus Wikipedia CS reference pages for lease / actor-model / work-stealing / gossip-protocol / message-passing / failure-detector / publish-subscribe). Each "## " section is grounded in a cited WebFetched source and mapped to how the PRISM hermes-zulu galaxy applies the theory to the 26-slot fleet. SHARED distributed-systems theory (consensus/FLP/Raft/2PC/CAP/MapReduce/scheduling) is NOT re-derived here — this entry POINTS to knowledge/wiki/agent-orchestration/agent-orchestration-foundations.md for it and keeps to the fleet/slot-lease/message-bus dimension that is distinct to hermes-zulu.
tags: [hermes-zulu, agent-fleet, slot-lease, lease, actor-model, message-passing, message-bus, publish-subscribe, work-stealing, work-allocation, gossip-protocol, failure-detector, heartbeat, membership, chat-fleet, MIT-6824, MIT-6840, courseware]
---

# Hermes-Zulu Foundations

The domain-knowledge spine for the **hermes-zulu** galaxy: the *master orchestrator* that runs PRISM's 26-slot NATO chat fleet (25 work + 1 hygiene). Where the sibling agent-orchestration galaxy owns the **shared coordination theory** (consensus, leader election, atomic commitment, CAP, scheduling — see the pointer below), hermes-zulu owns the **mechanics of a live agent fleet**: how a slot acquires and holds a *lease* on work, how chats pass *messages* without sharing memory, how idle slots *pull* work, and how the fleet detects a dead chat and reclaims its lease. This entry is grounded in the distributed-systems literature those mechanics are instances of.

**POINTER — shared theory lives next door.** For consensus/FLP, Raft, leader election, two-phase commit, CAP, MapReduce orchestrator-worker, and scheduling disciplines, read **`knowledge/wiki/agent-orchestration/agent-orchestration-foundations.md`** (VERIFIED-PARTIAL, same owner). Those are not re-derived here. This entry deliberately covers only the dimensions distinct to running a *fleet of long-lived agents over shared files*: leases, the actor/message-bus model, work-stealing pull allocation, and gossip/heartbeat membership.

**Honesty note (R12):** every section is grounded in a source that was actually WebFetch-confirmed during creation (listed in `## Sources`). PRISM-internal mappings ("this hook is a lease / an actor / a failure detector") are design analogies for guidance, attributed in the `## Owner-gate`, not measured equivalences. This galaxy coordinates agents and sets **no** machining/physics safety thresholds.

## 1. Leases — time-bound ownership that survives a dead holder

**CONFIRMED** against Wikipedia "Lease (computer science)" (https://en.wikipedia.org/wiki/Lease_(computer_science)):
- "In computer science, a lease is a contract that gives its holder specified rights to some resource for a limited period."
- The expiration is the whole point: "a lease is valid for a limited period, after which it automatically expires, making the resource available for reallocation by a new client."
- It exists *because* locks fail on crashed clients — a plain lock leaves the resource stuck when "the client failed before releasing the resources." "Because it is time-limited, a lease is an alternative to a lock for resource serialization."
- The hard part is invalidation: on expiry "there must be some means of notifying the lease holder of the expiration and preventing that agent from continuing to rely on the resource."

**Application to hermes-zulu:** a slot's claim on a unit is a **lease, not a lock** — exactly so a dead chat does not freeze a `MILESTONE::U-ID` forever. The slot-task-claim store's heartbeat-renews-the-lease + reap-on-stale-claim (>N missed ticks) design is the textbook lease lifecycle, and the lease invalidation problem is the live hazard: a reclaimed lease must stop the original (now-zombie) chat from still committing, which is why the post-commit auto-release and the fleet-reaper's confirm-after-N-ticks gate exist. Renew the lease while you work; never assume holding it once means holding it forever.

## 2. The actor model — chats as actors, no shared memory

**CONFIRMED** against Wikipedia "Actor model" (https://en.wikipedia.org/wiki/Actor_model):
- The model treats "an actor as the basic building block of concurrent computation," under "the philosophy that everything is an actor."
- On receiving a message an actor may concurrently: "send a finite number of messages to other actors," "create a finite number of new actors," and "designate the behavior to be used for the next message it receives."
- Actors "can only affect each other indirectly through messaging (removing the need for lock-based synchronization)"; recipients are "identified by address, sometimes called 'mailing address.'"
- Crucially, "Actors may modify their own private state, but can only affect each other indirectly through messaging" — there is no shared memory between actors.

**Application:** each PRISM chat is an actor — it owns its private state (its worktree, its handoff, its galaxy soul), spawns sub-actors (subagents), designates its next behavior (the next unit it picks), and influences peers *only* through messages on the shared bus. The "no shared mutable memory between actors" rule is the principled reason fleet coordination is a message problem, not a shared-variable problem; where the fleet *does* share files, the file-claim guard re-imposes the actor discipline by forcing exclusive ownership before a write.

## 3. Message passing — synchronous vs asynchronous, and why buffers fill

**CONFIRMED** against Wikipedia "Message passing" (https://en.wikipedia.org/wiki/Message_passing):
- Message passing lets "software components exchange information without sharing memory, often using communication channels, buffers, or middleware to transport messages between senders and receivers."
- **Synchronous:** "The sending process waits until the receiving process accepts the message" — the sender blocks, like a function call.
- **Asynchronous:** "The sender continues execution after sending a message, and messages are typically stored in a queue or buffer until the receiving process retrieves them."
- The warning: "The buffer required in asynchronous communication can cause problems when it is full."

**Application:** the PRISM chat bus / workboard / handoff files are an **asynchronous** message channel — a slot posts and keeps working; a peer reads later. That decoupling is what lets 26 chats run without lock-stepping, but the "buffer full" failure is real for PRISM: unbounded append-only ledgers (the AGENT_CHAT log, a galaxy memory index) are exactly the queue that overflows, which is the class behind the tribal-index V8 512MiB string-cap and the fail-OPEN clobber. Treat every shared message log as a bounded buffer that needs drain/shard discipline, not an infinite mailbox.

## 4. Publish-subscribe — the message bus that decouples who-talks-to-whom

**CONFIRMED** against Wikipedia "Publish-subscribe pattern" (https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern):
- "Publishers, categorize messages into classes (or topics), and send them without needing to know which components will receive them"; "subscribers, express interest in one or more classes and only receive messages in those classes, without needing to know the identity of the publishers."
- The pattern "decouples the components that produce messages from those that consume them, and supports asynchronous, many-to-many communication."
- It typically runs through "a central intermediary such as a message broker or event bus" that "receives messages from publishers and forwards them to the appropriate subscribers."
- This indirection enables "temporal, spatial, and synchronization decoupling — publishers and subscribers need not operate simultaneously or know system topology details."

**Application:** the fleet's broadcast/chat-bus and the keyword-gated UserPromptSubmit injectors are pub/sub — a hook publishes "tribal hits for domain X" or "inventory counts" on a *topic*, and any slot whose prompt matches *subscribes* without the publisher knowing which chats are live. The space + time decoupling is exactly the property a 26-slot fleet needs (a chat that boots an hour later still receives the relevant context). The broker is the failure axis: a single shared bus file is a single point of contention, so PRISM favors per-topic / per-slot append targets over one global broker file to avoid the multi-writer hot spot.

## 5. Work stealing — idle slots pull work, instead of a master pushing it

**CONFIRMED** against Wikipedia "Work stealing" (https://en.wikipedia.org/wiki/Work_stealing):
- "Each processor in a computer system has a queue of work items"; when a processor goes idle it "looks at the queues of the other processors and 'steals' their work items."
- Each worker keeps a double-ended queue (deque): "New work goes to the bottom, while stealing occurs from the top"; an idle processor "picks another processor uniformly at random; if the other processor's deque is non-empty, it pops the top-most thread off the deque."
- It contrasts with **work sharing**, where "each work item is scheduled onto a processor when it is spawned," and it "reduces the amount of process migration between processors, because no such migration occurs when all processors have work to do."
- Efficiency: "as long as all processors remain busy, no scheduling overhead occurs."

**Application:** PRISM's roadmap pickup is a **pull / work-stealing** model, not a central push scheduler — an idle slot runs `/pick-unit` and *claims* the next available unit itself. That is precisely the work-stealing win: zero coordination cost while every slot is busy, and self-balancing the moment one goes idle. The random-victim + steal-from-the-other-end detail maps onto the slot-claim filter (a slot picks an unclaimed unit, peer-claimed units are filtered out), and the "no migration while everyone is busy" property is why the fleet does not need a central dispatcher to keep all 25 work slots loaded. (For the *priority/throughput/fairness* goals of which unit to prefer, see the agent-orchestration scheduling section — that is the shared-theory side.)

## 6. Gossip + failure detection — knowing which chats are alive

**CONFIRMED** against Wikipedia "Gossip protocol" (https://en.wikipedia.org/wiki/Gossip_protocol) and "Failure detector" (https://en.wikipedia.org/wiki/Failure_detector):
- A gossip (epidemic) protocol is "a procedure or process of computer peer-to-peer communication that is based on the way epidemics spread": "with a given frequency, each machine picks another machine at random and shares any rumors," so "the number of individuals who have heard the rumor roughly doubles" each round — it works without "reliable communication" and uses "some form of randomness in the peer selection."
- A failure detector "is a computer application or a subsystem that is responsible for the detection of node failures or crashes"; "each local component will examine a portion of all processes within the system" and maintains a list of suspected processes.
- Its two properties are **completeness** ("every faulty process is eventually permanently suspected by every non-faulty process") and **accuracy** ("no process is suspected before it crashes"); Chandra and Toueg's insight is that "an unreliable failure detector can still be reliable in detecting the errors made by the system," and "the failure detector does not prevent any crashes ... even if the crashed program has been suspected previously."

**Application:** the fleet's liveness is a heartbeat-driven **failure detector**: `chat-slots.json lastHeartbeat` + the golf-liveness classifier ({alive, stale, crashed}) is exactly "examine processes, suspect on missed signal." The completeness/accuracy tension is the live tuning knob — too tight a timeout flags a busy-but-alive chat (accuracy violation → false reap), too loose leaves a dead slot's lease held (completeness lag). PRISM's confirm-after-N-ticks reaper gate is the deliberate bias toward *accuracy* (don't reap a live chat) at the cost of detection latency. Gossip is the model for spreading that membership view cheaply across hosts: random-peer, redundant, tolerant of message loss — the right shape for a multi-host fleet where no single coordinator sees everyone.

## 7. The lab-grounded fleet reading list (MIT 6.5840 / 6.824)

**CONFIRMED** against the MIT 6.5840 (formerly 6.824) Distributed Systems schedule (https://pdos.csail.mit.edu/6.824/schedule.html):
- This is the MIT 6.5840 Distributed Systems schedule (Spring 2026). Its **lab sequence is the hands-on spine** for fleet work: **Lab 1: MapReduce**, **Lab 2: Key/Value server**, **Lab 3: Raft** (phased 3A-3D), **Lab 4: KV Raft** (phased), **Lab 5: Sharded KV** (phased).
- Fault-tolerance/replication readings include the two **"Fault Tolerance: Raft"** lectures (extended Raft paper, 2014), **Chain Replication (2004)**, **ZooKeeper (2010)**, **Spanner (2012)**, and **Practical BFT (1999)**.

**Application:** unlike a survey, 6.5840's *labs* force the exact bugs a fleet hits — Lab 1 (MapReduce) is the master-worker re-execution that justifies lease-reclaim; Lab 2/3 (KV + Raft) is replicated shared state with a leader, the deepening path for any "single canonical writer over replicated fleet state" PRISM builds; Lab 5 (Sharded KV) is the per-slot/per-galaxy partitioning model. Use the lab order as the further-reading spine for hermes-zulu specifically; it is free open courseware and is the practical complement to the agent-orchestration theory entry.

## Owner-gate (NOT promoted)

The following were deliberately **left out** of the confirmed body and must be checked by the galaxy owner (zebra) before any promotion — they are *not* WebFetch-confirmed claims:

- **PRISM-internal mappings are interpretive, not measured.** Each "Application" paragraph maps classic theory onto PRISM's slot/claim/bus/heartbeat design from the orchestrator's reading of the codebase. The *theory* is cited; the assertion that a given PRISM artifact "is a lease / an actor / a pub-sub bus / a failure detector / a work-stealing scheduler" is a design analogy, not a verified equivalence. Owner should confirm against the actual implementation (`chat-slots.mjs`, `slot-task-claim.mjs`, the chat-bus injectors, the fleet-reaper) before citing any of it as fact.
- **Specific numeric parameters are not PRISM-tuned values.** Gossip round-doubling, heartbeat windows, the "confirm-after-N-ticks" (2x300s default) reaper gate, and lease-renew intervals are defaults in the cited systems or in PRISM docs — do not treat them as recommended/measured PRISM settings without measurement.
- **The "weakest failure detector for consensus" result is intentionally NOT asserted.** The Failure-detector page referenced but did not detail the Chandra-Toueg "eventually weak detector is the weakest to solve consensus" landmark; only the completeness/accuracy definitions and the unreliable-detector insight are confirmed here. Left for the owner to source from the primary paper before promotion.
- **Shared distributed-systems theory is owned elsewhere.** Consensus/FLP, Raft internals, leader election, two-phase commit, CAP, and scheduling disciplines are NOT in this entry by design — they live in `knowledge/wiki/agent-orchestration/agent-orchestration-foundations.md`. Do not duplicate them here; extend the pointer instead.
- **No machining/physics safety thresholds appear here by design.** This galaxy coordinates agents; it sets no feed/speed/voltage/clamp limits. Any such number belongs to the speed-feed / safety / quality galaxies and must come from `src/physics/constants.ts`, never from an orchestration doc. SAFETY_THRESHOLDS were intentionally not introduced (n/a for this domain).

## Sources (distinct URLs WebFetch-confirmed during creation, 2026-06-10)

> Each URL below was fetched and its content confirmed before any claim citing it was written. Free college-course sources are prioritized per the creation directive; shared consensus/Raft/CAP/MapReduce sources are intentionally NOT relisted here — see the agent-orchestration foundations entry for those.

- **MIT 6.5840 / 6.824 Distributed Systems — course schedule + lab sequence** (free open courseware) — https://pdos.csail.mit.edu/6.824/schedule.html
- **Lease (computer science)** (CS reference) — https://en.wikipedia.org/wiki/Lease_(computer_science)
- **Actor model** (CS reference) — https://en.wikipedia.org/wiki/Actor_model
- **Message passing** (CS reference) — https://en.wikipedia.org/wiki/Message_passing
- **Publish-subscribe pattern** (CS reference) — https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern
- **Work stealing** (CS reference) — https://en.wikipedia.org/wiki/Work_stealing
- **Gossip protocol** (CS reference) — https://en.wikipedia.org/wiki/Gossip_protocol
- **Failure detector** (CS reference) — https://en.wikipedia.org/wiki/Failure_detector
