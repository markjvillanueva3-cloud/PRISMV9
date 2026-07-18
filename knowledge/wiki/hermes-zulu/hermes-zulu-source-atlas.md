---
title: Hermes-Zulu Open Source Atlas — the keep-learning directory for multi-agent fleet orchestration
galaxy: hermes-zulu
owner_slot: zebra
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas-meta (2026-06-10)"
verification_method: "Every listed source was opened with WebFetch during creation (2026-06-10) and confirmed real, free/legal, and reachable; the fetch tool returned the resource's own title/abstract/topic list before any line citing it was written. Course numbers, paper arXiv IDs, and doc hosts are taken from the fetched page, not from memory. No paywalled, no LibGen/SciHub. Candidate links that could not be confirmed were dropped, not guessed. This atlas is the keep-learning directory only — it does NOT re-derive theory (that is hermes-zulu-foundations.md, also owner zebra)."
tags: [hermes-zulu, source-atlas, keep-learning, multi-agent, agent-fleet, orchestration, distributed-systems, MIT-6824, MIT-6840, langgraph, autogen, crewai, react, reflexion, raft, leader-election, free-courseware, official-docs, arxiv]
---

# Hermes-Zulu Open Source Atlas

The **living-source curriculum** for the **hermes-zulu** galaxy — PRISM's master orchestrator over the 26-slot NATO chat fleet (25 work + 1 hygiene). This is the *keep-learning directory*: a curated, kept-fresh map of WHERE to keep studying this galaxy's domain from reputable FREE/LEGAL sources so the knowledge never goes stale.

**Scope guard (read first, do not duplicate):**
- `hermes-zulu-foundations.md` (owner zebra) is the *synthesized theory* — leases, actor model, message passing, pub/sub, work-stealing, gossip/failure-detection. Do NOT restate it here.
- `hermes-zulu-applied-practice.md` (planned; not yet on disk as of 2026-06-10) is the *practitioner gotchas* layer.
- Shared distributed-systems *theory* (consensus/FLP, Raft internals, CAP, MapReduce, scheduling) is owned by `knowledge/wiki/agent-orchestration/agent-orchestration-foundations.md`. This atlas may point at the same upstream courseware, but it does so as a *learning directory entry* (where to go, what it teaches, which part of THIS galaxy it feeds) — not as theory re-derivation.

**Honesty note (R12):** every entry below was WebFetch-confirmed on 2026-06-10. PRISM-internal "feeds" labels (which part of hermes-zulu a source serves) are the orchestrator's routing guidance, not a measured equivalence. This galaxy coordinates agents and sets NO machining/physics safety thresholds.

---

## 1. Free college courses (open courseware)

- **MIT 6.5840 / 6.824 — Distributed Systems** — https://pdos.csail.mit.edu/6.824/schedule.html
  Teaches the fault-tolerance and replication core a fleet runs on, with a hands-on lab spine: Lab 1 MapReduce, Lab 2 Key/Value server, Lab 3 Raft (A-D), Lab 4 KV-Raft, Lab 5 Sharded KV; lectures span GFS, Paxos, Raft, linearizability, ZooKeeper, Spanner, chain replication, Ray, and BFT.
  *Feeds:* the lease/reclaim and "single canonical writer over fleet state" mechanics — Lab 1's master-worker re-execution justifies lease-reclaim; Lab 5's sharding maps onto per-slot/per-galaxy partitioning. Use the lab ORDER as the further-reading sequence for this galaxy.

- **MIT 6.824 — Distributed Systems lecture videos (Spring 2020, YouTube)** — https://www.youtube.com/playlist?list=PLrw6a1wE39_tb2fErI4-WkMbsvGQk9_UB
  The publicly viewable lecture recordings that accompany the 6.824 schedule above (Robert Morris). The video complement to the text-only schedule page.
  *Feeds:* the same fleet-coordination spine, in lecture form for slots that learn better by watching the master-worker / Raft walkthroughs than by reading the schedule.

---

## 2. Free textbooks

- **Distributed Systems, 4th edition — Maarten van Steen & Andrew S. Tanenbaum (2023)** — https://www.distributed-systems.net/index.php/books/ds4/
  A free personalized digital PDF (plus free slides) of the standard graduate text. Covers general distributed-systems principles, coordination, replication, fault tolerance, and naming, with updated Python 3 examples.
  *Feeds:* the conceptual backbone behind the foundations entry's lease/actor/pub-sub/failure-detector sections — the reference text to deepen any one of them. Free for personal use; printed copy is a separate paid option (digital is the free path we cite).

---

## 3. Agent-framework official docs (free)

- **LangGraph — official docs** — https://docs.langchain.com/oss/python/langgraph/overview
  LangChain's "low-level orchestration framework and runtime for building, managing, and deploying long-running, stateful agents." Teaches persistence, failure recovery, human-in-the-loop, state/memory, and deployment.
  *Feeds:* the directly-analogous external model for hermes-zulu's own long-lived-agent + handoff + persist-across-compact design; the closest production framework to what the fleet does over shared files.

- **LangChain / LangGraph — multi-agent architectures** — https://docs.langchain.com/oss/python/langchain/multi-agent
  Catalogs the multi-agent patterns: subagents (coordinator routes to specialists), handoffs (dynamic control transfer), skills (on-demand specialized knowledge), router (input classifier), and custom LangGraph workflows — explicitly warning that not every task needs multi-agent.
  *Feeds:* the fleet's slot-routing and subagent-spawn decisions; the "router" and "handoff" patterns map onto `/pick-unit` claim routing and slot-to-slot work transfer.

- **Microsoft AutoGen — official docs** — https://microsoft.github.io/autogen/stable/
  Free Microsoft docs for a multi-agent framework: AgentChat (conversational multi-agent), Core (event-driven, scalable, distributed multi-agent runtime incl. a gRPC worker runtime), Studio (no-code prototyping), and Extensions.
  *Feeds:* the event-driven + distributed-runtime view of a fleet — the "Core" layer is the nearest external analogue to PRISM's async chat-bus actor model.

- **CrewAI — official docs** — https://docs.crewai.com/
  Free docs for orchestrating "crews" of agents: agents (tools/memory/structured outputs), tasks and processes (sequential vs hierarchical execution with human oversight), and flows (long-running orchestration + state management) with guardrails and observability.
  *Feeds:* the hierarchical-process and crew-as-fleet model; CrewAI's sequential/hierarchical task processes are a concrete template for ordering multi-slot work.

---

## 4. Foundational agent papers (arXiv, CC-BY, free)

- **ReAct: Synergizing Reasoning and Acting in Language Models — Yao et al.** — https://arxiv.org/abs/2210.03629
  The seminal reason-then-act loop: interleaved reasoning traces and task-specific actions, producing more interpretable, tool-using trajectories. CC BY 4.0.
  *Feeds:* the per-slot agent loop — every PRISM chat is a ReAct-style actor that reasons, calls a tool, observes, repeats; the canonical reference for why fleet agents interleave thought and action.

- **Reflexion: Language Agents with Verbal Reinforcement Learning — Shinn et al.** — https://arxiv.org/abs/2303.11366
  Agents verbally reflect on feedback and keep reflective text in an episodic memory buffer to improve across attempts (no weight updates). CC BY 4.0.
  *Feeds:* the fleet's checkpoint/handoff + error-pattern-to-memory loop — Reflexion is the academic shape of "learn from the last attempt via durable reflective notes," exactly what per-chat HANDOFF and the error ledger do.

- **AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation — Wu et al.** — https://arxiv.org/abs/2308.08155
  The framework paper behind the AutoGen docs: customizable conversable agents combining LLMs, human input, and tools across math/coding/QA/operations-research. CC BY 4.0.
  *Feeds:* the conversational multi-agent model for the chat fleet; the primary-source companion to the AutoGen official docs above.

- **Large Language Model based Multi-Agents: A Survey of Progress and Challenges — Guo et al.** — https://arxiv.org/abs/2402.01680
  A survey mapping how LLM agents are profiled, how they communicate, what environments they simulate, and how their capacities grow; maintained with an open GitHub of ongoing work.
  *Feeds:* the breadth map for the whole galaxy — the single best "what's the landscape" read before designing a new fleet-coordination mechanism.

- **Building Effective Agents — Anthropic Engineering (2024-12-19)** — https://www.anthropic.com/engineering/building-effective-agents
  Free engineering article naming five workflow patterns: prompt chaining, routing, parallelization (sectioning/voting), orchestrator-workers, and evaluator-optimizer, plus autonomous agents.
  *Feeds:* the orchestrator-worker and routing/parallelization patterns that are hermes-zulu's exact job — the most directly applicable practitioner reference for deciding when a fleet should fan out vs route vs evaluate-loop.

---

## 5. Coordination, consensus & leader-election references (free)

- **Raft — official site (paper + visualization + implementations)** — https://raft.github.io/
  "In Search of an Understandable Consensus Algorithm" (Ongaro & Ousterhout) plus a browser visualization and a curated implementation list; replicated-state-machine consensus with leader election and log replication. CC BY 3.0.
  *Feeds:* any "single leader / canonical writer over replicated fleet state" deepening path; the visualization is the fastest way to internalize leader election + reclaim-on-failure that the lease model relies on.

- **Leader election (distributed computing) — reference page** — https://en.wikipedia.org/wiki/Leader_election
  The problem definition (designate one organizer node, break symmetry) and classic algorithms: ring (Chang-Roberts O(n^2), Hirschberg-Sinclair O(n log n)), mesh/torus, hypercube, and universal techniques. CC BY-SA 4.0.
  *Feeds:* the membership/coordinator-selection axis — how a multi-host fleet could elect a single coordinator rather than relying only on gossip; the algorithm menu behind any future fleet leader.

- **The Chubby lock service for loosely-coupled distributed systems — Mike Burrows (OSDI 2006)** — https://research.google/pubs/the-chubby-lock-service-for-loosely-coupled-distributed-systems/
  Google Research landing page with a free PDF download. Coarse-grained advisory locking + small reliable storage as a distributed-file-system-like interface, prioritizing availability/reliability; the canonical "locks + master election as a service" design.
  *Feeds:* the lock/lease-as-a-service model and how real systems use a coordination service for master election — the production lineage of PRISM's slot-claim store and file-claim guard.

---

## Keep-fresh cadence

- **Re-verify quarterly (next: 2026-09).** Open each URL with WebFetch and confirm the title/abstract still matches. arXiv IDs and the Anthropic article are stable; docs hosts MOVE — LangGraph already relocated from `langchain-ai.github.io/langgraph` to `docs.langchain.com` (caught and corrected during this creation pass), so the framework-doc rows are the highest-churn entries. If a doc URL 301s, follow the redirect, confirm the destination, and update the row.
- **MIT 6.5840 schedule is term-versioned** (it read "Spring 2026" at verification) — the URL is stable but the lab/lecture list refreshes each term; re-read the schedule page when citing a specific lab number.
- **Drop, don't guess.** If a source goes paywalled, dead, or unconfirmable on re-check, remove the row rather than substitute an unverified link. A shorter verified atlas beats a longer rotted one (R12).
- **Promotion gate:** the galaxy owner (zebra) may add new rows only after a live WebFetch confirms free/legal access; new framework docs (e.g., a future agent SDK) belong in section 3, new papers in section 4.

## Sources (distinct URLs WebFetch-confirmed 2026-06-10)

- https://pdos.csail.mit.edu/6.824/schedule.html
- https://www.youtube.com/playlist?list=PLrw6a1wE39_tb2fErI4-WkMbsvGQk9_UB
- https://www.distributed-systems.net/index.php/books/ds4/
- https://docs.langchain.com/oss/python/langgraph/overview
- https://docs.langchain.com/oss/python/langchain/multi-agent
- https://microsoft.github.io/autogen/stable/
- https://docs.crewai.com/
- https://arxiv.org/abs/2210.03629
- https://arxiv.org/abs/2303.11366
- https://arxiv.org/abs/2308.08155
- https://arxiv.org/abs/2402.01680
- https://www.anthropic.com/engineering/building-effective-agents
- https://raft.github.io/
- https://en.wikipedia.org/wiki/Leader_election
- https://research.google/pubs/the-chubby-lock-service-for-loosely-coupled-distributed-systems/
