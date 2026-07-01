# Session-Continuity Stack — PSN + /system-viz Upgrade Research

**Date:** 2026-05-25
**Scope:** Upgrade vectors for the PreCompact → Compaction → Handoff → Startup pipeline now that PSN (11-leg taxonomy) and /system-viz (10-layer + 28 augmentation overlays) exist as substrates.
**Status:** Research deliverable. Not a build plan.
**Companions:** [[SYSTEM-VIZ-GALAXY-RESEARCH-2026-05-25]], [[OBSIDIAN-BRAIN-EFFICIENCY-RESEARCH-2026-05-25]].

---

## Honest baseline

The four session-lifecycle phases (PreCompact → Compaction → Handoff → Startup) are wired and working. Existing pipeline (this session verified):

| Phase | Hooks/skills wired | Working today |
|---|---|---|
| **PreCompact** | 8 hooks (handoff write, slot release, pending guard, quality alert, octopus probe, file-read cache, claude-brief snapshot, stress-harness) | Yes — auto-fires on `/compact` |
| **Compaction** | Built-in Claude Code; no Ruflo control over the compaction itself | Yes |
| **Handoff** | `per-agent-handoff.mjs` + `--source live-chat` strict gate; per-chat HANDOFF-<id>-<topic>.md | Yes |
| **Startup** | ~30+ SessionStart hooks; matchers for `compact` / `clear` / `startup` re-fire `session-start-auto-resume.mjs` | Yes — handoff loads correctly |

The pipeline isn't broken. The opportunity is to make it PSN-aware and /system-viz-aware so each phase produces and consumes richer state.

## Hard prereqs (block most upgrades)

Most of the high-leverage upgrades require substrates to actually be healthy:

| Prereq | Today | Blocks |
|---|---|---|
| `regen-viz` heap fix | OOM-crashing | Every system-viz-aware upgrade (A1-A3, B3, C1-C3, D1-D6, E1-E4, F1-F3) |
| Ollama `/api/chat` daemon | Dead all session | Semantic-edge upgrades, embedding-driven retrieval |
| `INFRA/U-CLAUDE-GRAPH-INDEX` (compact JSONL+HTML) | Proposed, not built | Any hook that needs to load graph state into context |
| `OBSIDIAN-BRAIN-EFFICIENCY-MS0` A1 (JSONL pointer index) | Proposed, not built | Hooks that batch-query the memory vault |

---

## 25 upgrade vectors across 6 groups

### Group A — PreCompact upgrades (4)
- **A1: PSN-leg state snapshot in handoff.** Every leg's current health/freshness baked into RESUME → next chat knows which legs are degraded.
- **A2: System-viz focus-set freeze.** Record which nodes were "in focus" this session (edited, mentioned, claimed) → next chat sees them pre-highlighted in L2 local-graph.
- **A3: Edge/bridge churn delta.** What graph edges changed this session → next chat sees them.
- **A4: Outstanding-claim snapshot.** Which file-claims this chat held → release properly + advertise to peers if applicable.

### Group B — Compaction-aware upgrades (3)
- **B1: Compaction-triggered system-viz refresh.** If `/compact` fires and graph is >2 days stale → queue regen via doc-drift bus (needs CLAUDE-GRAPH-INDEX queue first).
- **B2: Compaction summary → memory.** Auto-create `reference_session_<date>.md` capturing what shipped this session (feeds Obsidian-brain).
- **B3: Pre-compaction PSN-leg coverage report.** Which legs did this session touch? Inject into compaction summary so post-compact chat has the context.

### Group C — Handoff upgrades (5)
- **C1: PSN-leg pointer in handoff.** Primary legs touched listed so next chat boots leg-priority-aware.
- **C2: System-viz subgraph snapshot in handoff.** Small JSON of N-hop subgraph around focus nodes for next chat's L2 view.
- **C3: Bridge-utilization markers.** If session activated cross-domain bridges (16 deep-integration bridges in PRISM), mark in handoff.
- **C4: Memory-write log in handoff.** What memos did this session create/update — Obsidian-brain orientation hint.
- **C5: Outstanding-prereq propagation.** If session created units that block other units, surface to next chat's handoff.

### Group D — Startup upgrades (6)
- **D1: Expanded PSN-leg state inject.** `psn-leg-state-inject.mjs` exists; today only injects *concerning* legs. Expand: full per-leg status when relevant.
- **D2: System-viz local-graph inject.** When chat starts with a topic, inject the local subgraph around topic-related nodes.
- **D3: Recent graph deltas inject.** What changed in system-viz since this chat's last session (recency-relevant only).
- **D4: Next-units inject pulled from priority-queue.** The `priority_queue` roost surfacing exists; tie to SessionStart.
- **D5: Master-index per-task pre-search at SessionStart.** Already partially done in subagent-start-context.mjs; expand to live chat.
- **D6: Bridge-affordance inject.** If session topic crosses domains, surface relevant bridges proactively.

### Group E — Dashboard utilization (the direct ask) (4)
- **E1: Live /system-viz side panel during session.** Open as side-window, refreshes on PostToolUse events; chat sees graph state live.
- **E2: Compact-target highlighting.** Pre-compact, /system-viz highlights "what I shipped this session" (diff visualization).
- **E3: Handoff-deep-link in RESUME.** Handoff RESUME contains a `/system-viz?focus=<node>` deep-link that opens the panel to the relevant subgraph.
- **E4: PSN-leg health gauges + gates.** Dashboard shows current PSN leg health as gauges; can gate compaction (don't /compact if a leg is mid-write).

### Group F — Cross-phase integration (3)
- **F1: Session-state-graph node per chat.** Each chat becomes a node in /system-viz; state (active/idle/compacting/done) shows on the dashboard.
- **F2: Fleet-view dashboard mode.** All 26 chats visible as nodes — slots, topics, branches shown. Coordination at a glance.
- **F3: Cross-chat awareness.** Chat A sees chat B's recent commits as edges on /system-viz; avoid duplicate work.

---

## Variability axis

- **Inputs:** PreCompact event, /compact, /clear, SessionStart-compact, SessionStart-startup, normal SessionStart, normal Stop
- **States:** system-viz fresh/stale, Ollama up/down, MCP up/down, slot-binding correct/drifted, claim-set active/empty
- **Failure modes:** subgraph too big for context budget, graph stale, peer chat contention on handoff, missing CURRENT_POSITION, dead PSN leg #10 (NN/GNN)
- **Adversarial:** prompt-injection in handoff RESUME, malicious system-viz node injection, graph snapshot exceeds context budget

---

## Dependency matrix (which upgrades need what)

| Upgrade group | Needs `regen-viz` fix | Needs `CLAUDE-GRAPH-INDEX` | Needs `OBSIDIAN-BRAIN-EFFICIENCY` A1 | Needs Ollama health |
|---|---|---|---|---|
| A (PreCompact) | ⚠ (A1-A3) | for compact reads | — | — |
| B (Compaction) | ⚠ (B3) | ⚠ (B1) | ⚠ (B2) | — |
| C (Handoff) | ⚠ (C1-C3) | for compact reads | ⚠ (C4) | — |
| D (Startup) | ⚠ (D1-D3, D6) | ⚠ (D2-D3) | — | ⚠ (D2 semantic) |
| E (Dashboard) | ⚠ (all) | — | — | — |
| F (Cross-phase) | ⚠ (all) | for chat-as-node | — | — |

**Reading:** essentially nothing ships cleanly until regen-viz OOM is fixed. The CLAUDE-GRAPH-INDEX is the secondary critical-path artifact.

---

## Sequenced priority (compounding leverage)

| Order | Item | Why now | Effort |
|---|---|---|---|
| 1 | Fix `regen-viz` OOM (heap or streaming) | Unblocks 90% of the upgrades below | 1-4 hr |
| 2 | Build `CLAUDE-GRAPH-INDEX` (~1.5MB JSONL + HTML) | Hooks can read graph state cheaply | 4-6 hr |
| 3 | D5 master-index pre-search at SessionStart (live chat) | No external deps; immediate context-injection quality win | 1 hr |
| 4 | A1 + A4 PreCompact PSN/claim snapshot | RESUME contains substrate state | 2 hr |
| 5 | B2 compaction summary → memory (Obsidian-brain feed) | Auto-builds session reference memo every /compact | 1 hr |
| 6 | D1 expanded PSN-leg state inject (full not just concerning) | Existing hook surface; expand keyword gate | 1 hr |
| 7 | C1 PSN-leg pointer in handoff | Sits naturally in existing handoff schema | 1 hr |
| 8 | E1 live /system-viz side panel | Substantial UI work but high "wow" factor | 8-12 hr |
| 9 | C2 + D2 subgraph snapshot in handoff | Needs graph-index from #2 first | 4 hr |
| 10 | F1 chat-as-graph-node + F2 fleet view | Coordination win at fleet scale | 4-6 hr |
| 11 | Remaining items (A2, A3, B1, B3, C3-C5, D3-D6, E2-E4, F3) | Polish + completeness | varies |

**Tier-1 (orders 3-7) = 6 hours of work, no external deps beyond what's already shipping.**

---

## Specific answer on dashboard utilization

The user's direct ask: can `/system-viz` be utilized beneficially? Yes — **3 distinct utilizations**:

1. **PRE-compact (E2):** before compaction, highlight the diff — "you touched these 12 nodes this session" — visualized in /system-viz. Operator-facing visualization of session output, no LLM cost.
2. **HANDOFF (E3):** RESUME directive includes a deep-link URL. Next chat (or operator) clicks → /system-viz opens at the relevant subgraph immediately. Zero re-orientation.
3. **DURING session (E1):** side panel always shows the live local-graph around current focus node. Highest-value but most expensive to build (E1 is 8-12 hours).

The cheapest dashboard win is **E3 (handoff deep-link)** — single-line append to RESUME, no UI changes. The most operator-visible is **E2 (pre-compact diff)** — visualization of "what shipped this session" before the conversation gets summarized away.

---

## Honest call

This is a real, valuable upgrade direction — but **none of it ships cleanly until regen-viz OOM is fixed**. Right now, all the system-viz-aware upgrades would render stale data, defeating the purpose. Order matters:

1. Fix `regen-viz` first (separate `[BUG-FIX]` unit, scope known)
2. Build `CLAUDE-GRAPH-INDEX` (proposed in this session, ~6 hr unit)
3. THEN tier-1 of this milestone (~6 hr)
4. THEN the dashboard utilizations (E group)
5. THEN the cross-phase integrations (F group)

Recommend opening this as `SESSION-CONTINUITY-PSN-UPGRADE-MS0` with the dependency chain made explicit in the envelope.

---

## Out of scope

- Replacing Claude Code's built-in `/compact` summarization — that's Anthropic's runtime, not ours
- Cross-fleet (multi-machine) handoff — multi-host coexistence is a separate doctrine
- Replacing the strict `--source live-chat` gate on per-agent-handoff (security/integrity floor)
