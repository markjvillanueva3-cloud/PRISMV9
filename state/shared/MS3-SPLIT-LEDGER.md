# OBSIDIAN-INTELLIGENCE-MS3 — Hotel ↔ Charlie Split Ledger

**Established:** 2026-05-15T20:27Z by claude-a2b1b5ca (slot hotel) per user directive *"hotel and charlie need to coordinate together — spread all remaining tasks out evenly between you two."*

**Coordination surface:** this file is the source of truth. The chat-bus broadcast (`AGENT_CHAT.md` entry `chat-1778876815693`) is the announcement; this file is the durable record.

**Charlie binding:** at proposal time slot `charlie` was idle. Most-active MS3 peer was `claude-c0f06dee` (already shipped 2/3 of G1, currently holds the test-file claim) — they have first refusal on slot `charlie`. If they decline, the next chat with bandwidth claims `charlie` and inherits this list.

---

## Roll-up (24 unit envelope — counts as of 2026-05-15 20:32Z)

**Revision 2** — git log shows A2 (`229d53524`) and F2 (`55babef36`) already shipped before this split was proposed. Adjusting both queues to drop them.

| Phase | Total | Shipped/InFlight | Hotel remaining | Charlie remaining |
|-------|------:|-----------------:|----------------:|------------------:|
| A     | 2     | A1 partial · A2 SHIPPED | A1 burn-in | 0 |
| B     | 6     | 0                | 1 (B6) | 5 (B1-B5) |
| C     | 3     | 0                | 3 (C1-C3) | 0 |
| D     | 5     | 0                | 1 (D5) | 4 (D1-D4) |
| E     | 4     | 0                | 2 (E1, E4) | 2 (E2, E3) |
| F     | 2     | F2 SHIPPED       | 1 (F1) | 0 |
| G     | 3     | 1 (G1 2/3 done)  | 2 (G2, G3) | 1 (G1 test in flight) |
| **Σ** | **24**| **A1, A2, F2, G1-2/3** | **10 + A1-burnin** | **11** |

Hotel ships 10 fresh units + finishes A1 burn-in (Docker-pending).
Charlie ships 11 fresh units (incl. finishing G1's test file).

---

## HOTEL queue — slot `hotel` (claude-a2b1b5ca)

Dependency-ordered (revision 2 — A2 already shipped at `229d53524`, dropped from queue):

1. **E1** — `U-IDEABLOCK-EXTRACTOR` (deps=[]) — *unblocks E2, E3, E4* — **STARTING NOW**
2. **C1** — `U-HTML-OUTPUT-MODE` (deps=[])
3. **C2** — `U-HTML-DASHBOARD` (deps=[C1])
4. **C3** — `U-HTML-DESIGN-SYSTEM` (deps=[])
5. **F1** — `U-VOICE-CAPTURE` (deps=[])
6. **G3** — `U-AGENT-RUNTIME-ALERTS` (deps=[])
7. **E4** — `U-IDEABLOCK-GOVERNANCE` (deps=[E1])
8. **D5** — `U-CONTEXT-EVAL-GATE` (deps=[D1, E3]) — *late, after charlie ships D1 + E3*
9. **B6** — `U-KNOWLEDGE-DISTILLATION` (deps=[E2]) — *late, after charlie ships E2*
10. **G2** — `U-AGENT-PIXEL-DEPT-OVERLAY` (deps=[D4]) — *late, after charlie ships D4*

Sticky leftover:
- **A1 burn-in finish** — `U-DOCKER-HOOK-BROKER` already partial-shipped at `b1443e2a8`; Docker engine down (ETIMEDOUT). Operator must recover Docker per `feedback_docker_wsl_recovery.md`, then `pwsh -File scripts/install-prism-hooks-container.ps1` validates A1's live exit-conditions.

---

## CHARLIE queue — slot `charlie` (claude-c0f06dee proposed)

Dependency-ordered (revision 2 — F2 already shipped at `55babef36`, dropped from queue. A2 done unblocks D1 + D4 immediately):

1. **G1 test** — `mcp-server/src/__tests__/AgentJobDescriptions.test.ts` *(in flight, claude-c0f06dee claimed the file 2026-05-15T20:25Z)*
2. **D1** — `U-PROVENANCE-LAYER` (deps=[A2]) — **READY NOW** (A2 already shipped)
3. **D2** — `U-ONTOLOGY-LAYER` (deps=[D1])
4. **D3** — `U-CONFLICT-RESOLUTION` (deps=[D1])
5. **D4** — `U-ACTION-TRACES` (deps=[A2, D1]) — *unblocks hotel G2*
6. **E2** — `U-IDEABLOCK-DEDUP` (deps=[E1]) — *waits hotel E1; unblocks hotel B6*
7. **E3** — `U-IDEABLOCK-RAG-ENGINE` (deps=[E2]) — *unblocks hotel D5*
8. **B1** — `U-DAILY-CONTEXT-WORKFLOW` (deps=[A1]) — *waits A1 burn-in (Docker recovery)*
9. **B2** — `U-CONNECTION-FINDER` (deps=[A1])
10. **B3** — `U-QUEUE-PROCESSOR` (deps=[A1])
11. **B4** — `U-WEEKLY-SYNTHESIS` (deps=[B1])
12. **B5** — `U-PROJECT-AUTO-UPDATER` (deps=[A1])

---

## Critical-path handoff order (so neither chat blocks the other)

```
hotel-A2 ──► charlie-D1 ──► charlie-D2, D3
            └──► charlie-D4 ──► hotel-G2

hotel-E1 ──► charlie-E2 ──► charlie-E3 ──► hotel-D5
            └──► hotel-E4
            └──► hotel-B6 (after charlie-E2)

hotel-C1 ──► hotel-C2 (internal hotel chain — no charlie blockage)
hotel-C3, F1, G3 — fully independent

charlie-F2 — fully independent
charlie-G1-test — in flight, no upstream dep
charlie-B1..B5 — soft-blocked on hotel-A1-burnin (Docker recovery operator-gated)
```

Suggested first-ship order:
- **Hotel ships first:** A2 + E1 in parallel (both deps=[]) → C-track in parallel → F1, G3, G2 (after D4), D5 (after D1+E3), E4, B6.
- **Charlie ships first:** G1 test (in flight) + F2 (no deps) → wait on A2, E1 → D1 → D2/D3/D4 → E2 → E3 → B-track once Docker recovers.

---

## Conflict rules

- **Each chat respects the other's claim list** — no edits / commits to files owned by the other phase.
- **Bus-level updates** — both chats post a chat-bus `claim` message before opening any file in their unit's `files_created` / `files_modified`.
- **Cross-phase docs** — wiki entries + memory notes for shipped units are written by the shipping chat. The other chat reads, never writes, those entries.
- **CLAUDE.md updates** — both chats may add to `## Recent regressions` if they hit a bug worth recording, but `## What shipped this milestone` entries go through the owner.
- **Close-out** — each chat closes out its own units (envelope status + MILESTONE_PROGRESS + BUILD_STATE regen + chat-bus done message).

---

## Renegotiation

If either chat finishes its half before the other:
- Post `[MS3-SPLIT-RENEGOTIATE] over-capacity, can take N more from peer queue` on chat-bus.
- The peer posts which of their remaining units they want to release (typically dependency-late tail).
- This ledger gets a `## Renegotiation 2026-05-15Thh:mmZ` section appended with the moved units.

If either chat goes silent for >60 min:
- The other chat may absorb the peer's queue per `[[feedback_conflict_fork_rule]]` — fork to own worktree first to avoid commit-collision.

---

## Status (live)

| Surface | Hotel | Charlie |
|---------|-------|---------|
| slot binding | `hotel` (terminal-pin tw-ps-27048) — alive | `charlie` — proposed, awaiting c0f06dee confirm |
| current unit | A2 (starting) | G1 test (in flight) |
| committed | `b1443e2a8` (A1 partial) | none yet on charlie scope |
| handoff | `HANDOFF-claude-a2b1b5ca-hotel-obsidian-int-m.md` | (will write `HANDOFF-charlie-<topic>.md` after slot claim) |

Last updated by: claude-a2b1b5ca (slot hotel) at 2026-05-15T20:27Z.
