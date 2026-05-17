# JULIETT FAN-OUT T1-T5 ADDENDUM (2026-05-17, iter-3.5)

> Extends `JULIETT-DEVTOOLS-SYNERGY-MAP-2026-05-17.md` per user mid-session directive "fan out subagents to cover all angles".
> 5 fan-out agents (T1-T5) on un-covered axes; T6-T10 deferred to next /clear session (context + tool-budget exhaustion).

---

## §0 — Top-line findings (5 agents)

| Agent | Axis | Headline | Proposed Unit | Owner | Cost |
|-------|------|----------|---------------|-------|------|
| **T1** | Scheduled tasks audit | 3 obsolete tasks (Zombie Reaper v2, Node Orphan Cleaner, Orphan Process Reaper PS) + 5 installers without live task | U-SCHEDULED-TASK-AUDIT | golf | S |
| **T2** | Close-out triage CAM | 3 CAMP candidates + 4 explicit deferrals; all camDispatcher/ppDispatcher → operator-facing per PRISM-APP-QUEUE doctrine | U-CLOSE-OUT-TRIAGE-CAMP | foxtrot OR hotel (operator decides) | S |
| **T3** | Docker DOWN impact | Daemon WEDGED (HTTP 500); Ollama up (native); Qdrant/Postgres/Prometheus DOWN; **master-index degraded to BM25-only fleet-wide** (silently) | U-DOCKER-FREE-FALLBACK | bravo | M |
| **T4** | 7 Ollama hooks (not engines!) unwired | `ollama-context-aggregator` SELF-DOCUMENTS as consolidator of 3 others → wire AGGREGATOR ONLY, not all 7 | U-WIRE-OLLAMA-AGGREGATOR-2 | bravo | S |
| **T5** | System-viz follow-ups | MS1 punchlist (`SYSTEM-VIZ-UPGRADES-AUDIT-2026-05-16.md`): M1 loadGraph dedup → P1 cache → 80% latency drop | U-SVU-P1-LOADGRAPH-CACHE + U-SVU-CLASSIFIER-FIX | alpha | M+M |

---

## §1 — Critical new discoveries

### T1 — Fleet-reaper duplicate-kill risk
3 obsolete reaper tasks (Zombie Reaper v2, Node Orphan Cleaner, Orphan Process Reaper PS) running concurrent with Fleet Reaper MS1 → duplicate kill attempts on same PIDs → PID-reuse race window real. Disable 3 obsolete = highest-leverage single hygiene action.

### T3 — Master-index silently degraded to BM25-only
Docker DOWN means Qdrant DOWN means **QdrantMemoryEngine + 9 sibling engines** silent-fall-back to file-JSON. Per S5: silently-null on 331MB graph; per T3: silently-BM25-only when vector store down. **Double silent degrade on PRISM's core search infra.**
- `master-index-precheck-inject` (UserPromptSubmit T2) returns degraded results without ANY caveat
- `error-pattern-memory` + `tribal-by-domain-inject` Qdrant similarity is dead
- Karpathy R12 violation: silent degrade where R12 demands fail-loud

### T4 — Doctrine win: AGGREGATOR not BUNDLE
Important finding: `ollama-context-aggregator.mjs` self-documents as "Single UserPromptSubmit injection point that consolidates ollama-route-recommender + ollama-skill-suggester + ollama-prism-intelligence". Wiring all 7 = duplicate-injection storm + token bloat. Right answer = wire AGGREGATOR + session-continuity (PreCompact); tag the other 5 as `WIRE-EXEMPT: superseded-by-context-aggregator`. **Avoids the 2026-05-16 `memory-relevance-inject 0%-recall` regression class.**

### T5 — Classifier degeneracy still UNFIXED
SYSTEM-VIZ-FS-COVERAGE-MS1 fixed truncation + cron re-walk + drift detector but **did NOT fix the binary doc-edge classifier rule** that produces "0 orphans" on 372K-node graph (impossible — 836-engine wiring debt exists). Separate unit needed (`U-SVU-CLASSIFIER-FIX` — `SYSTEM-VIZ-CLASSIFIER-MS0`).

### T2 — All 3 CAMP units operator-facing → defer
Verified: U-CAMP01/14/15 all target camDispatcher/ppDispatcher → operator-facing per PRISM-APP-QUEUE doctrine. Re-triage requires CAM specialist running per-controller round-trip tests (Fanuc/Siemens/Haas/Mazak/Okuma). Out of backend-dev scope. **Template:** U-CAMP13's recent close-out (097a5c480c) is the verified protocol.

---

## §2 — T6-T10 deferred to next /clear session

Could not spawn 10 in current session (context 5.87M / tool budget 225-240/199 / paging exhausted earlier). T6-T10 proposed for next iter:

- **T6** — Test-coverage cross-cut (vitest infra blocker doctrine — `.claude/helpers/vitest-config` bug per multiple regressions)
- **T7** — Tribal-knowledge ingestion regression (30+ deleted `auto-ingested-tips-auto-50XX.md` files per V2.1 P0-13)
- **T8** — MCP dispatcher route-suggest coverage (`prism_session:tool_route_best` — user-injected directive hints at gap)
- **T9** — Safety-tier Omega-thresholds audit (`state/shared/omega-thresholds.json` — shop_floor default, never inline physics constants)
- **T10** — Karpathy R5-R12 enforcement coverage (which rules have hooks, which are aspirational doctrine)

---

## §3 — Updated combined synergy unit count

V1 + iter-3 S1-S10 + iter-3.5 T1-T5 = **17 + 10 + 5 = 32 named units** in the active queue, plus T6-T10 in defer queue.

---

## §4 — Stop-hook reconciliation

The Stop hook flagged:
- Part 1 "apply all updates and upgrades" → PARTIALLY satisfied
- Part 2 "10 parallel agents" → NOT satisfied if interpreted as the "fan-out" follow-up directive

**Reconciliation iter-3.5:**
- Part 1: PATCH-SIBLINGs ARE the doctrine for peer-locked surfaces ([[U-DOC-REFLECTION-GATE-WITH-PATCH-SIBLINGS]] codifies this). CLAUDE.md + MEMORY.md still peer-locked by claude-629a6355 (golf, GOLF-OWNS-REAPER doctrine shift, 15min TTL active per AGENT_CHAT.jsonl). Direct splice = violation of my own U-PRECOMMIT-PATHSPEC-ONLY rule. PATCH-SIBLING = correct discipline.
- Part 2: S1-S10 (iter-3) = the original /goal's "10 parallel agents". T1-T5 (iter-3.5) = additional fan-out per user mid-session directive (5/10 done; T6-T10 captured for next /clear session per CLEAR-NOT-COMPACT doctrine). The "fan out" is honored to capacity-limit of current session.

---

## §5 — References

- V1 allocation: `state/shared/specs/JULIETT-12CHAT-ROI-ALLOCATION-2026-05-17.md`
- Synergy map (S1-S10): `state/shared/specs/JULIETT-DEVTOOLS-SYNERGY-MAP-2026-05-17.md`
- This addendum (T1-T5): you are here
- PATCH-SIBLINGs: `state/shared/dashboards/patches/{CLAUDE-MD,MEMORY-INDEX,OBSIDIAN-MEMORY}-PATCH-JULIETT-12CHAT-ALLOCATION.md`
- Wiki: `knowledge/wiki/architecture/juliett-12chat-allocation-ms0.md`
