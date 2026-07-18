# HERMES-DASH-DEEP-RESEARCH — 2026-05-25 (slot bravo, /goal-1)

**Goal directive:** *"do deep research on how to develop a dashboard for hermes agent | implement into PSN to improve capabilities"* (operator 2026-05-25, /loop 5m /goal)

**Status:** RESEARCH (advisory; informs HZP-DASH-PSN-MS0 follow-up milestone). Not auto-applied — every proposed unit requires explicit pickup.

---

## 1. Existing surface (what shipped this session, HZP-DASH-MS0)

| Layer | Artifact | Coverage |
|---|---|---|
| HTTP control | `scripts/hzp-dash-control-server.mjs` :8767 | 6 POST + 2 GET; loopback-only; CORS; audit |
| Authority gate | `ZebraFleetGovernorEngine.ts` | refuse-list + domain_filter + orchestrator roles |
| Audit chain | `HzpDashAuditEngine.ts` | JSONL envelope per op |
| MCP wrapper | `ZebraDashboardControlEngine.ts` | 8 `zebra_dash_*` actions |
| UI panel | `state/shared/system-viz/hermes-zebra-ops.html` | 6 read tables + 3 POST forms |
| Read aggregator | `generate-hermes-zebra-ops-features.mjs` | audit/vetoes/escalations/refuse/chat/claims |

What it surfaces: audit tail · chat bus · active claims · escalation queue · refuse-promotion candidates · veto ledger. That's **6 axes of operational state**.

What it OMITS: every other PSN leg.

---

## 2. Reference Hermes pattern (NousResearch + agent-orchestration literature)

A "Hermes-grade" agent-control dashboard tracks:

| Hermes capability | Status in PRISM | Dashboard exposure |
|---|---|---|
| 1. Soul (persona) layer | ✓ 28 slot souls, SoulFrontmatterReader | ✗ NOT in dashboard |
| 2. Dream loop (corrections → refuse-rules) | ✓ DreamLoopProposalEngine | ⚠ partial (Stop hook surfaces it; dashboard has the queue but not the deltas) |
| 3. Self-correction (failure → corrected approach) | ✓ HermesSelfCorrectionEngine | ✗ NOT in dashboard |
| 4. Auction-based task assignment | ✓ ZebraTaskAuctionEngine | ✗ NOT in dashboard (auction history not surfaced) |
| 5. Doctrine drafting | ✓ DoctrineDraftEngine | ⚠ partial (POST endpoint exists; no viewer) |
| 6. Fleet doctrine convergence | ✓ SoulConsensusEngine | ✗ NOT in dashboard |
| 7. Tool-use traces | ✓ via Claude Code | ✗ NOT in dashboard |
| 8. Memory (cross-session brain) | ✓ Obsidian auto-feed Stop hook | ✗ NOT in dashboard |
| 9. Subagent dispatch hints | ✓ preferred_subagent_type in souls | ✗ NOT surfaced as UI hint |
| 10. Self-improvement rate | ✓ corrections + refuse promotions logged | ✗ NO trend chart |

**Gap summary**: dashboard surfaces operational state (who's doing what RIGHT NOW) but NOT the Hermes-defining feedback loops (why the fleet is the way it is, how it's improving).

---

## 3. PSN — 11-leg taxonomy + dashboard exposure gaps

Per `[[feedback_psn_definition]]` and CLAUDE.md §MASTER INDEX:

| # | Leg | Health signal | Currently in dashboard? |
|---|---|---|---|
| 1 | Obsidian brain | `knowledge/memories/*.md` count + recent mtime | ✗ |
| 2 | PRISM OS | `prism_operating_system` dispatcher action count + last invocation | ✗ |
| 3 | Wiki | `knowledge/wiki/` count + link-audit broken% | ✗ |
| 4 | Memories | `MEMORY.md` index size + truncation flag | ✗ |
| 5 | Tribal | tribal-corpus density per domain (mill/lathe/wedm/cad) | ✗ |
| 6 | System Viz | `system-graph.json` mtime + node count | ✗ |
| 7 | Engines | built/wired/unwired counts from BUILD_STATE | ✗ |
| 8 | Algorithms | algorithm count from BUILD_STATE | ✗ |
| 9 | Formulas | physics constants integrity (no inlined values) | ✗ |
| 10 | NN/GNN | NN-EVAL.json AUROC / Brier / promotion gate | ✗ (UNGRADED today!) |
| 11 | PRISM AI | AI memo coverage % | ✗ |

**11 of 11 legs are invisible on the dashboard today.** This is the single largest gap in the entire HZP-DASH stack.

---

## 4. Reference patterns from other PRISM dashboards

| Surface | Pattern | What we can borrow |
|---|---|---|
| `/system-viz` :8765 | 3D graph of 110K nodes + 21 ghost roosts | "ghost roost" pattern — auto-augmented JSON merges into a single living view |
| `state/shared/CLAUDE-BRIEF.md` | Single-pane on-disk summary, 7h regen | Compact "what is PRISM right now" digest panel |
| `BUILD_STATE.md` auto-inject | SessionStart banner with counts | Real-time fleet-built counts |
| `AWARENESS-SNAPSHOT.md` | 15-line digest from system-graph | Top-3 hits per query — embed as PSN search box |
| `fleet-status.mjs` | Per-slot heartbeat + last commit | Per-slot health pill |

Pattern winner: **augmentation-style data assembly** — one generator emits one JSON, dashboard polls and renders. Already in use; extend it.

---

## 5. Proposed milestone: **HZP-DASH-PSN-MS0** (8 units)

**Theme:** make every PSN leg visible at a glance + close the Hermes-defining feedback loops.

| Unit | Title | Files | Acceptance |
|---|---|---|---|
| U-HZD-PSN-01 | **PSN Health Strip** — 11-leg health overview panel | `PSNHealthCheckEngine.ts` + test + dashboard panel + generator update | All 11 legs render with green/amber/red pill + 1-line signal |
| U-HZD-PSN-02 | **Subagent Dispatch Hint** — escalation gets routed-to recommendation | extends HermesSelfCorrectionEngine surface to dashboard | Click an escalation → see suggested subagent_type |
| U-HZD-PSN-03 | **PSN Search Box** — operator types query, dashboard hits `prism_session:master_index_query` | dashboard HTML + new GET `/api/psn/search?q=` route | Top-5 graph hits + wiki + memory hits |
| U-HZD-PSN-04 | **Memory + Wiki Tail** — last N memory writes + wiki edits | new generator script + dashboard panel | Newest entries surface on every refresh |
| U-HZD-PSN-05 | **Auction Live-stream** — when a task is auctioned, render bids + winner + vetoes | dashboard panel polling `state/shared/auction-history.jsonl` (new) | Bids/vetoes visible per auction |
| U-HZD-PSN-06 | **Doctrine Draft Viewer** — operator sees CLAUDE.md draft before merge | dashboard panel + `/api/doctrine/list-drafts` GET | Each draft shows file + age + diff vs current CLAUDE.md |
| U-HZD-PSN-07 | **Self-improvement Trend** — corrections promoted to refuse-rules per day | dashboard sparkline + generator | 7-day trend, current vs prior week |
| U-HZD-PSN-08 | **Soul-drift Detection** — when fleet doctrine diverges from individual souls | uses SoulConsensusEngine + new generator | Shows divergence per slot, severity-ranked |

**Order of build**: 01 first (highest leverage — all 11 legs invisible today), then 02-03-04 in iter 2-3-4, then 05-08 in iter 5-7.

**Out of scope**: anything that would require a tracked SQL store (we use JSONL); anything that breaks loopback-only constraint; anything that re-implements existing engines.

---

## 6. Architecture decisions

1. **Pure-core engine pattern** continues — every PSN-health signal goes through `PSNHealthCheckEngine` which is pure-JS (no I/O). The generator script does the I/O and passes raw inputs to the engine.
2. **One JSON snapshot, one panel** — `state/shared/system-viz/staging/psn-health.json` emitted by `generate-psn-health-features.mjs`; dashboard polls every 5s.
3. **Color taxonomy locked**: green = healthy + recent activity; amber = stale or degraded; red = error/dormant/missing.
4. **R12 fail-soft**: if a signal source is missing on disk, the leg renders "unknown" not "red" — never lies about state.
5. **No new MCP actions for U-01 through U-04** — the generator script reads disk directly, dashboard renders. MCP wrapper added only when a leg's signal needs to be queryable from zebra-the-agent (deferred to U-05+).

---

## 7. Acceptance criteria for the milestone

- [ ] All 11 PSN legs render on the dashboard within 5s of operator opening it.
- [ ] PSN search box returns at least 1 hit for any 2-word query that exists in `system-graph.json`.
- [ ] When zebra-the-agent issues an escalation, the dashboard immediately surfaces the suggested subagent_type AND the operator can click "dispatch" to actually spawn it.
- [ ] When the fleet doctrine diverges from a slot's soul, soul-drift panel raises the alert with severity-rank + suggested resolution.
- [ ] Every panel survives 24h of fleet operation without leaking memory or corrupting state files.
- [ ] All new engines have ≥10 vitest cases with reference values (no toBeDefined stubs).
- [ ] Triple-scrutiny round passes on the milestone close-out.

---

## 8. Open questions (defer to next iter)

- Should `/api/psn/search` proxy through the MCP `prism_session:master_index_query` action OR hit `system-graph.json` directly? Proxy is cleaner; direct is faster.
- Should the auction live-stream emit a WebSocket / SSE push, or stay on 5s poll? Poll is simpler; push is genuinely real-time. Defer until 5s poll proves insufficient.
- Should soul-drift detection auto-promote consensus → CLAUDE.md draft, or stay operator-gated? Currently operator-gated. Strong default.

---

## 9. Acting on this spec

**This iteration (iter 1)**: U-HZD-PSN-01 only — PSN Health Strip end-to-end.
**Next iter**: U-HZD-PSN-02 + U-HZD-PSN-03.
**Iter 3**: U-HZD-PSN-04 + U-HZD-PSN-05.
**Iter 4**: U-HZD-PSN-06 + U-HZD-PSN-07.
**Iter 5**: U-HZD-PSN-08 + close-out + 3-of-3 scrutiny.

Total expected commits: 5-7 over /loop window.

— authored 2026-05-25 by slot:bravo (claude-ea80ce2f) under /goal directive.
