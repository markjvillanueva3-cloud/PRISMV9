---
title: Agent-Orchestration Resource Atlas
galaxy: agent-orchestration
owner_slot: zebra
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas-meta (2026-06-10)"
verification_method: "WebFetch resolve+content-match for every online URL; Glob/Grep/ls for every local path. Online sources confirmed against described resource on 2026-06-10; any that 404'd, redirected away, or mismatched were dropped. Local paths reproduced verbatim from the verified PRISM tree."
tags: [resource-atlas, agent-orchestration, distributed-consensus, raft, fencing-tokens, distributed-locking, where-to-reach]
---

# Agent-Orchestration Resource Atlas

The **where-to-REACH** index for the agent-orchestration meta/infra galaxy (owner: **zebra** — distributed consensus / Raft / fencing tokens / leader election / distributed locking).

This hub gets a chat **straight to the authoritative source** — the canonical tool repo, the seminal free paper, the standards/reference page — plus the galaxy's own local code and stores. It is **distinct from [[agent-orchestration-source-atlas]]**, which is the where-to-LEARN curriculum (course list). This atlas is the where-to-REACH index: the canonical repo/paper/standard + the local PRISM code, not a course list.

> R12 / owner-gate: every entry links a **method or source**. No numeric threshold, quorum size, timeout, or heartbeat constant is promoted here — those stay owner-gated to zebra + `mcp-server/src/physics/constants.ts`. See `## Owner-gate (NOT promoted)`.

---

## 1. Local code + stores (PRISM — verified paths)

The galaxy's own engine directory and the real coordination primitives a chat reaches for first.

| Resource | Path | Role |
|----------|------|------|
| Agent-orchestration engine directory | `mcp-server/src/engines/agent-orchestration/` | The galaxy's own engine home (carries its `CLAUDE.md`, `MEMORY.md`, `PATHS.md`, `TOOLBELT.md`, `AGENTIC-SYSTEMS-SOURCE-KNOWLEDGE.md`). |
| Per-slot task-claim CLI | `.claude/helpers/slot-task-claim.mjs` | Enforceable per-slot UNIT locks (`claim`/`release`/`heartbeat`/`list`/`check`/`sweep`) so two slots never race-build the same `MILESTONE::U-ID`. The galaxy's live mutual-exclusion mechanism. |
| Per-slot task-claim store | `state/shared/slot-task-claims.json` | The lockfile-guarded atomic-RMW backing store for the claim CLI (corrupt/schema-mismatch → readOnly refuse-write, never clobbers a peer). |
| Distributed lock engine | `mcp-server/src/engines/DistributedLockEngine.ts` | The PRISM cross-process lock primitive. `export class DistributedLockEngine` (line 63) with `async withLock<T>()` (line 192, automatic acquire/release). NOTE: PRISM doctrine + the multi-agent §Coordination block name this `DistributedLockManager.withLock(resource, fn)` — the actual class/file is `DistributedLockEngine`. Reach the file, not the doctrine name. |

> Reach the engine dir's own `PATHS.md` / `TOOLBELT.md` for the full per-galaxy file map; this table is the consensus/locking entry-points only.

---

## 2. Canonical repos + papers + standards (verified online)

Every URL below was WebFetch-confirmed to resolve **and** match the described resource on 2026-06-10. Free + legal only.

### Seminal paper — Raft consensus
- **"In Search of an Understandable Consensus Algorithm (Extended Version)"** — Diego Ongaro & John Ousterhout.
  - Hub + PDF: <https://raft.github.io/>
  - The official Raft resource hub: the seminal paper PDF, an implementation registry across many languages, talks/lecture videos, and the list of university courses that teach it. *This is the single authoritative starting point for the galaxy's core algorithm.*

### Reference implementation — production Raft
- **hashicorp/raft** — Go library implementing the Raft consensus protocol (replicated log + FSM for replicated state machines).
  - Repo: <https://github.com/hashicorp/raft>
  - MPL-2.0, actively maintained. The canonical battle-tested reference implementation to read when designing leader-election / log-replication code.

### Foundational reference — distributed locking + fencing tokens
- **"How to do distributed locking"** — Martin Kleppmann (2016-02-08).
  - Article: <https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html>
  - The canonical free treatment of **fencing tokens** as the safety mechanism for correctness-critical locks, and the well-known critique of Redlock (no fencing-token facility). The conceptual backbone for why `slot-task-claim.mjs` + `DistributedLockEngine` need monotonic guards, not just a held lock. *Highest-value source for the galaxy's locking/fencing focus.*

### Course materials (free) — distributed systems
- **MIT 6.5840 (formerly 6.824) — Distributed Systems** (Spring 2026; older iterations linked back to 2000).
  - Course site: <https://pdos.csail.mit.edu/6.824/>
  - Lectures, readings, and programming labs (MapReduce, key-value services, **Raft consensus**, sharded systems) plus past exams — all freely accessible. Reach here for hands-on Raft lab framing and the canonical paper reading list. *(Listed as a reachable canonical reference site; the deeper learn-path curriculum belongs in [[agent-orchestration-source-atlas]].)*

> Candidates dropped: **0** — all four seeded URLs resolved and matched. (The MIT URL now serves the renumbered course 6.5840 at the same stable path; same course, same materials — kept.)

---

## 3. Curated video (verified)

No standalone video URL was independently WebFetch-verified for this atlas. The Raft hub (<https://raft.github.io/>) itself aggregates conference talks and lecture videos — reach video material through that verified hub rather than a separately-listed (unverified) link.

---

## 4. Cross-links — sibling wiki layers

- [[agent-orchestration-foundations]] — the why/what concepts (consensus, safety vs. liveness, partition tolerance).
- [[agent-orchestration-source-atlas]] — the where-to-LEARN curriculum (course/reading path; complements this where-to-REACH index).
- [[agent-orchestration-applied-practice]] — applying consensus/locking inside PRISM (slot claims, lock usage patterns).
- [[agent-orchestration-advanced-techniques]] — deeper consensus/coordination techniques.
- [[prism-methodology-foundations]] — the PRISM build/verify methodology this galaxy operates under.

---

## 5. Keep-fresh cadence

- **Trigger-based:** re-verify whenever a link here is reached and 404s/redirects, or when zebra adds a coordination primitive to `mcp-server/src/engines/agent-orchestration/` or a new lock/claim store.
- **Periodic:** re-WebFetch every online URL on the galaxy's next resource-atlas pass; drop any that no longer resolve or match. Course numbering (6.824 → 6.5840) drifts — re-confirm the MIT path resolves to the same Distributed Systems course.
- **Local-path drift:** re-Grep/Glob `DistributedLockEngine` + `slot-task-claim` if a refactor moves them; never let this atlas point at a stale path (R12).
- **Do NOT** promote any numeric constant into this file on refresh — link the source, leave the number owner-gated.

---

## Owner-gate (NOT promoted)
The following stay owned by **zebra** + `mcp-server/src/physics/constants.ts` and are deliberately **not** surfaced as numbers here — this atlas links the method/source, never the value:
- Quorum / majority sizes, election timeout ranges, heartbeat intervals, and any randomized-backoff bounds for Raft-style leader election.
- Lock TTLs, stale-claim reap thresholds (`>Nmin no heartbeat`), and fencing-token issuance/validation parameters for `DistributedLockEngine` / `slot-task-claim.mjs`.
- Retry counts, RMW backoff, and concurrency limits in the claim/lock stores.
Reach the source (paper/repo/article + the in-repo constants module) for the authoritative values; do not copy them into the wiki.

## Sources
- Local PRISM tree (verified via Glob/Grep/ls, 2026-06-10):
  - `mcp-server/src/engines/agent-orchestration/` (engine dir + its CLAUDE.md/MEMORY.md/PATHS.md/TOOLBELT.md/AGENTIC-SYSTEMS-SOURCE-KNOWLEDGE.md)
  - `.claude/helpers/slot-task-claim.mjs`
  - `state/shared/slot-task-claims.json`
  - `mcp-server/src/engines/DistributedLockEngine.ts` (`class DistributedLockEngine` L63, `withLock<T>()` L192)
- Online (WebFetch resolve + content-match, 2026-06-10):
  - <https://raft.github.io/> — Raft hub + Ongaro/Ousterhout paper PDF + implementation registry (confirmed)
  - <https://github.com/hashicorp/raft> — Go Raft reference implementation, MPL-2.0 (confirmed)
  - <https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html> — fencing-tokens + Redlock critique (confirmed)
  - <https://pdos.csail.mit.edu/6.824/> — MIT 6.5840/6.824 Distributed Systems course, free labs incl. Raft (confirmed)
