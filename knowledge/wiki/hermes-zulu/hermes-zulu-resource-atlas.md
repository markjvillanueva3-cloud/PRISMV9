---
title: Hermes-Zulu Resource Atlas — the where-to-REACH index for multi-agent fleet orchestration & tail-latency
galaxy: hermes-zulu
owner_slot: zebra
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas-meta (2026-06-10)"
verification_method: "LOCAL section: every engine-dir + helper + store path was glob/stat-confirmed on H:/prism on 2026-06-10 before listing; the named orchestrator engines (Hermes*/Zulu*/Moonshot*) were each existence-checked (MoonshotInvocationEngine.ts was found ABSENT and dropped — the real file is MoonshotClientEngine.ts). ONLINE section: every URL was opened with WebFetch on 2026-06-10 and confirmed real, free/legal, and matching its description — the fetch returned the resource's own title/abstract/pattern-catalog before any citing line was written. Seeded candidates that resolved + matched were kept; none required dropping (the 'research.google Tail at Scale' candidate resolved at its canonical /pubs/the-tail-at-scale/ path). No paywalled, no LibGen/SciHub. This is the where-to-REACH index (canonical repo/paper/standard + local code), NOT the where-to-LEARN curriculum — that is hermes-zulu-source-atlas.md (also owner zebra)."
tags: [hermes-zulu, resource-atlas, where-to-reach, multi-agent, agent-fleet, orchestration, tail-latency, distributed-systems, reactive-manifesto, azure-patterns, leader-election, scheduler-agent-supervisor, cascading-failures, sre, free-resources, canonical-sources, zebra]
---

# Hermes-Zulu Resource Atlas

The **where-to-REACH index** for the **hermes-zulu** galaxy — PRISM's meta/infra master orchestrator over the 26-slot NATO chat fleet (25 work + 1 hygiene), with a focus on multi-agent fleet orchestration and tail-latency control. This atlas is the single hub that jumps a chat STRAIGHT to the authoritative source: the galaxy's own local code/stores + the canonical free online repo / paper / standard.

**Distinct from its siblings (read first, do not duplicate):**
- `hermes-zulu-source-atlas.md` (owner zebra) is the *where-to-LEARN curriculum* — the kept-fresh directory of FREE courses, textbooks, framework docs, and foundational papers to keep studying the domain. THIS file is the where-to-**REACH** index: the canonical repo/paper/standard you cite, plus the local PRISM code you edit — not a course list.
- `hermes-zulu-foundations.md` (owner zebra) is the *synthesized theory* (leases, actor model, message passing, pub/sub, work-stealing, gossip/failure-detection). Do NOT restate theory here.
- Shared distributed-systems theory (consensus/FLP, Raft internals, CAP) is owned by `knowledge/wiki/agent-orchestration/`. This atlas points at upstream resources as *reach entries* (here is the authoritative source, here is the local code it parallels), not theory re-derivation.

**Honesty note (R12):** every LOCAL path below was glob/stat-confirmed on H:/prism (2026-06-10); every ONLINE URL was WebFetch-confirmed on 2026-06-10. The "what it serves in PRISM" labels are the orchestrator's routing guidance, not a measured equivalence. This galaxy coordinates agents and sets **NO** machining/physics safety threshold — all numbers stay owner-gated (see Owner-gate section).

---

## 1. Local code + stores (PRISM's own trove — glob/stat-verified)

### Galaxy home (the engine dir — doc surfaces)
The `hermes-zulu/` engine directory holds the galaxy's doctrine/brain docs; the runnable orchestrator engines live one level up in `mcp-server/src/engines/` (this is a meta/infra galaxy — engines are named `Hermes*`/`Zulu*`/`Moonshot*`, not nested under the galaxy dir).

- `mcp-server/src/engines/hermes-zulu/` — galaxy home directory (CLAUDE.md operational scope · MEMORY.md per-domain brain · PATHS.md H:-wide path atlas · TOOLBELT.md tool-call cheatsheet)

### Orchestrator engines (Hermes parallel-orchestration + Zulu fleet-governance — each existence-checked)
- `mcp-server/src/engines/HermesParallelFanoutPlannerEngine.ts` — plan parallel agent fan-out
- `mcp-server/src/engines/HermesFileScopePartitionerEngine.ts` — partition file scope so parallel agents don't collide
- `mcp-server/src/engines/HermesParallelBudgetEnvelopeEngine.ts` — per-fanout token/turn budget envelope
- `mcp-server/src/engines/HermesParallelVerdictAggregatorEngine.ts` — aggregate parallel reviewer verdicts
- `mcp-server/src/engines/HermesSelfCorrectionEngine.ts` — self-correction loop
- `mcp-server/src/engines/ZuluTaskAuctionEngine.ts` — auction NATO-slot work orders
- `mcp-server/src/engines/ZuluDashboardControlEngine.ts` — fleet dashboard control
- `mcp-server/src/engines/ZuluFleetGovernorEngine.ts` — pure-core authority gate (`checkAuthority(slot, task_text, operation)`); wired read-only as `prism_session:zulu_authority_check`
- `mcp-server/src/engines/MoonshotClientEngine.ts` — Opus heavy-reasoning invocation surface (zulu's main reasoning lever)

### Fleet runtime helper (the 26-slot claim/heartbeat CLI)
- `.claude/helpers/chat-slots.mjs` — 26-slot NATO claim / reclaim / heartbeat / liveness CLI (`SLOT_NAMES` = canonical alpha..zulu source-of-truth; query liveness via `node .claude/helpers/chat-slots.mjs <slot>-liveness`)

### Companion runtime helpers + live stores (verified in PATHS.md, glob-confirmed)
- `.claude/helpers/slot-task-claim.mjs` — per-slot UNIT lock (claim/release/heartbeat/list/check/sweep)
- `.claude/helpers/per-agent-handoff.mjs` + `.claude/helpers/precompact-handoff.mjs` — per-chat handoff write/read + PreCompact auto-handoff
- `state/shared/AGENT_CHAT.jsonl` — fleet message bus
- `state/shared/chat-slots.json` — live slot ↔ chat ↔ terminal binding
- `state/shared/slot-task-claims.json` — per-slot UNIT locks
- `state/shared/slot-souls/` — per-slot soul frontmatter (persona/refuse-list/domain-filter)
- `mcp-server/data/state/SCRUTINY_LEDGER.json` — 3-of-3 scrutiny ledger

---

## 2. Canonical repos + papers + standards (verified — free/legal)

> Every entry was WebFetch-opened on 2026-06-10 and matched its description. These are the *authoritative reach targets* — cite these, not a paraphrase.

### Tail-latency (the galaxy's named focus)
- **The Tail at Scale — Jeffrey Dean & Luiz André Barroso (Communications of the ACM, 56(2), 2013, pp. 74-80)** — https://research.google/pubs/the-tail-at-scale/
  The seminal tail-latency paper: why a service that fans out to many components is hostage to its slowest component, and the latency-tail-tolerance techniques (hedged/tied requests, micro-partitioning, selective replication, latency-induced probation) that keep responsiveness predictable as fan-out grows. Free PDF on the Google Research landing page.
  *Serves in PRISM:* the canonical authority for hermes-zulu's whole reason to exist — a fleet that fans a unit out to many slots is tail-bound; this is the paper to cite for fan-out planning, parallel-budget envelopes, and "why the slowest slot dominates."

### Reactive / message-driven architecture standard
- **The Reactive Manifesto, v2.0 (2014-09-16)** — https://www.reactivemanifesto.org/
  The four-principle declaration for reactive systems: Responsive (reliable upper-bound response times), Resilient (replication/containment/isolation/delegation), Elastic (scale resources to load), Message Driven (asynchronous message-passing boundaries). Freely copyable in its entirety.
  *Serves in PRISM:* the named-principle vocabulary for the async chat-bus fleet — the message-driven + resilient + elastic axes are exactly the fleet's `AGENT_CHAT.jsonl` actor model and per-host slot elasticity.

### Cloud / distributed design-pattern catalog
- **Cloud Design Patterns — Azure Architecture Center (Microsoft Learn)** — https://learn.microsoft.com/en-us/azure/architecture/patterns/
  A free, technology-agnostic catalog of distributed-system patterns with problem/trade-off/example for each: Leader Election, Bulkhead, Circuit Breaker, Competing Consumers, Throttling, Rate Limiting, Queue-Based Load Leveling, Priority Queue, Health Endpoint Monitoring, Saga, Compensating Transaction, Sharding, Choreography, and more — plus an explicit "AI agent orchestration patterns" cross-link.
  *Serves in PRISM:* the menu of reach-target patterns for fleet coordination — Leader Election → multi-host coordinator selection; Competing Consumers → slot-claim work routing; Bulkhead/Throttling → per-fanout isolation + budget; Sharding → per-slot/per-galaxy partitioning.

- **Scheduler Agent Supervisor pattern — Azure Architecture Center** — https://learn.microsoft.com/en-us/azure/architecture/patterns/scheduler-agent-supervisor
  The free pattern page for coordinating a multi-step distributed task as one operation: a Scheduler records each step's state + complete-by time in a durable state store, Agents wrap remote calls with retry, and a Supervisor periodically reclaims timed-out/failed steps (and de-conflicts via Leader Election when multiple Supervisors run). Idempotency + compensating-transaction guidance included.
  *Serves in PRISM:* the closest external blueprint for the lease/reclaim + claim-store + supervisor loop the fleet runs — the Scheduler/Agent/Supervisor triad maps directly onto `slot-task-claims.json` (state store), per-slot work execution (agents), and the stale-claim reclaim path (supervisor).

### Reliability engineering (cascading-failure + load-shedding canon)
- **Google SRE Book — Chapter 22, "Addressing Cascading Failures" (Mike Ulrich, CC BY-NC-ND 4.0)** — https://sre.google/sre-book/addressing-cascading-failures/
  The freely-readable chapter on positive-feedback failure loops: server overload, resource exhaustion, naive-retry amplification (and exponential-backoff/jitter remedies), graceful degradation, load shedding, deadline + cancellation propagation, cold-cache vulnerability, and emergency recovery.
  *Serves in PRISM:* the authority for fleet-wide overload safety — the reach target for why retries need backoff, why a fan-out needs deadline propagation, and how a coordinated fleet sheds load instead of melting down (the failure class the fleet-reaper + budget envelopes guard against).

---

## 3. Curated video (verified)

No standalone video resource is listed in THIS atlas: the highest-value lecture-form material for this galaxy (MIT 6.824 distributed-systems lecture playlist) is already WebFetch-verified and curated in the sibling **[[hermes-zulu-source-atlas]]** §1 as a *keep-learning* entry. To avoid a duplicate-with-drift, reach for it there. If a canonical talk for tail-latency or fleet orchestration is later WebFetch-confirmed, the owner (zebra) adds it here.

---

## Cross-links

- **[[hermes-zulu-foundations]]** — synthesized theory (leases, actor model, pub/sub, failure-detection)
- **[[hermes-zulu-source-atlas]]** — where-to-LEARN curriculum (free courses, textbooks, framework docs, papers) — the sibling of THIS file
- **[[hermes-zulu-applied-practice]]** — practitioner gotchas / applied-practice layer
- **[[hermes-zulu-advanced-techniques]]** — advanced fleet-orchestration techniques
- **[[prism-methodology-foundations]]** — PRISM-wide methodology baseline

---

## Keep-fresh cadence

- **Re-verify quarterly (next: 2026-09).** Open each ONLINE URL with WebFetch and confirm the title/abstract/pattern-catalog still matches. The arXiv-stable / paper-DOI rows (Tail at Scale, Reactive Manifesto) are low-churn; the Microsoft Learn pattern rows are the highest-churn (docs hosts move + pattern catalog refreshes) — if a `learn.microsoft.com` URL 301s, follow the redirect, confirm the destination, and update the row.
- **Re-stat LOCAL paths on every owner pass.** Engine renames happen (the source `MoonshotInvocationEngine.ts` was already gone — real file `MoonshotClientEngine.ts`); before relying on any engine path, `ls`/glob it against `H:/prism`, not the slot worktree.
- **Drop, don't guess.** If an online source goes paywalled, dead, or unconfirmable on re-check, REMOVE the row rather than substitute an unverified link. A shorter verified atlas beats a longer rotted one (R12).
- **Promotion gate:** the galaxy owner (zebra) may add a new ONLINE row only after a live WebFetch confirms free/legal access, and a new LOCAL row only after a glob/stat confirms the path exists on `H:/prism`.

## Owner-gate (NOT promoted)

Per R12 + this galaxy's safety posture, the following stay owner-gated to **zebra** and are NOT surfaced as numbers in this atlas — link the method/source, never copy the value:
- Any tail-latency / hedged-request / timeout / complete-by / backoff threshold or percentile target — the *method* lives in the Tail at Scale paper + SRE Ch.22 + the Scheduler Agent Supervisor pattern; the *operative numbers* live with the owner + `mcp-server/src/physics/constants.ts` and the live engine configs, not here.
- Stale-claim reclaim windows, heartbeat staleness/crashed thresholds, per-fanout token/turn budget caps, and fleet-reaper confirm-after-N-tick counts — these are runtime-tuned constants owned by the engine code (`chat-slots.mjs`, `slot-task-claim.mjs`, the Hermes budget/governor engines), not promotable wiki facts.
- This galaxy sets NO machining/physics safety threshold; any such number is owned by the relevant physics galaxy + `constants.ts`.

## Sources (distinct URLs WebFetch-confirmed 2026-06-10)

- https://research.google/pubs/the-tail-at-scale/
- https://www.reactivemanifesto.org/
- https://learn.microsoft.com/en-us/azure/architecture/patterns/
- https://learn.microsoft.com/en-us/azure/architecture/patterns/scheduler-agent-supervisor
- https://sre.google/sre-book/addressing-cascading-failures/
