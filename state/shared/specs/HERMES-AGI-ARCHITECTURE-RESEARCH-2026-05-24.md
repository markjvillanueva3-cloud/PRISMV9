# HERMES-AGI-ARCHITECTURE — deep research (2026-05-24)

**Author:** claude-ea80ce2f slot bravo
**Sources:**
- Voxyz_ai (2026-05-23) "12 Layers Every AI User Should Understand in 2026" — https://x.com/Voxyz_ai/status/2058222816474919343
- kirillk_web3 (2026-05-21) "Kimi Agent Swarm: 300-Agent Parallel System" — https://x.com/kirillk_web3/status/2057497197638242362
- User directive 2026-05-24: *"add gap fills to task queue, do further research on what else we can improve for PSN"*
**Status:** advisory; every unit operator-reviewable + operator-gated. SAFETY-CRITICAL units (control plane / multi-tenant / kill-switch) get full 3-of-3 scrutiny + dedicated policy tests.
**Companion envelope:** `mcp-server/data/milestones/HERMES-AGI-ARCHITECTURE-MS0.json` (12 units, U-HAGI01..12)

---

## 0. Family of sister milestones

| MS | Focus | Units | Status |
|----|-------|-------|--------|
| HMEMV-MS0 | Memory layer | 11 | Queued |
| HCAP-MS0 | Capability expansion (incl. Excel I/O) | 16 | Queued |
| HMPI-MS0 | MCP + plugin integration | 14 | Queued |
| **HAGI-MS0 (this)** | **AGI architecture (Voxyz 12-layer + Kimi swarm)** | **12** | Queued |
| TOTAL closed | Hermes-frontier + AGI-architecture audit | **53** | + 1 enforcement hook shipped (slot-commit-worktree-enforce) |

---

## 1. Voxyz 12-Layer framework — PSN coverage map

The Voxyz article enumerates 12 layers every production AI agent system must have. PSN coverage:

| # | Layer | PSN status | Closes |
|---|-------|-----------|--------|
| 1 | Work surface | ⚠ Partial (CLI/Obsidian today; PrismApp web pending) | U-HAGI06 |
| 2 | Agent contract (SOUL.md) | ✅ EXCEEDS — per-slot souls + evolution + compiler | — |
| 3 | Model | ✅ aiSystemRouterEngine | — |
| 4 | Runtime / state | ⚠ /loop + handoffs informal | U-HCAP04 + U-HCAP06 (sister MS) |
| 5 | Tool & agent interop (MCP + A2A) | ✅ MCP yes (HMPI-MS0 expands); A2A no | U-HAGI07 |
| 6 | Execution surface | ✅ dispatchers + Playwright + Chrome DevTools + Computer Use | — |
| 7 | Memory (6 sub-layers) | ✅ EXCEEDS — 5-namespace + HMEMV-MS0 | — |
| 8 | Knowledge / retrieval (citations) | ⚠ Hits returned, citations not propagated | U-HAGI08 |
| 9 | Durable workflow | ❌ GAP | U-HAGI01 |
| 10 | Evals (offline + online + policy + edge) | ⚠ U-HCAP05 covers most; policy missing | U-HAGI09 |
| 11 | Observability / artifacts | ✅ traces + audit + cost ledger | — |
| 12 | Control plane / governance | ⚠ Scattered, not unified | U-HAGI02 + U-HAGI10 + U-HAGI11 |

7 new HAGI units close the Voxyz-framework gaps (1, 5 A2A, 8, 9, 10 policy, 12 unified + 12 tenant + 12 kill-switch).

---

## 2. Kimi 300-Agent Swarm pattern — PSN coverage map

The Kirill article documents Moonshot's K2.6 Agent Swarm (300 sub-agents / 4,000 coordinated steps per task / centralized coordinator / web interface) versus Claude Agent Teams (4-6 agents peer-to-peer for coding).

| Kimi capability | PSN status | Closes |
|-----------------|-----------|--------|
| 300 sub-agents per task | ❌ GAP (PSN: 26-slot fleet max) | U-HAGI03 coordinator-fan-out |
| Auto-decompose `do N things` → N parallel subtasks | ❌ GAP | U-HAGI04 |
| Centralized coordinator with synthesis | ⚠ Octopus is mesh; Council is sequential | U-HAGI03 |
| Web interface for parallel-output-heavy tasks | ❌ GAP | U-HAGI06 (overlaps Voxyz L1) |
| Batch deliverable production at scale | ❌ GAP (QuoteToShip is single-customer) | U-HAGI05 |

5 fresh gaps to PSN — covered by U-HAGI03/04/05/06 (and U-HAGI06 also closes Voxyz L1).

---

## 3. The 12 HAGI units (P0/P1/P2)

| Unit | Title | Priority | LOC |
|------|-------|---------|-----|
| U-HAGI01 | Durable workflow layer (Temporal/Inngest-class) | P0 | ~500 |
| U-HAGI02 | Unified control plane (identity/permissions/budget/audit) | P0 | ~420 |
| U-HAGI03 | Coordinator-fan-out swarm (Kimi pattern) | P0 | ~550 |
| U-HAGI04 | Auto-decomposition primitives | P1 | ~370 |
| U-HAGI05 | Batch deliverable production | P1 | ~370 |
| U-HAGI06 | PrismApp web work-surface scaffolding | P1 | ~600 |
| U-HAGI07 | A2A protocol layer | P1 | ~450 |
| U-HAGI08 | Source chain / provenance tracking | P1 | ~370 |
| U-HAGI09 | Policy test suite (jailbreak + edge) | P2 | ~330 |
| U-HAGI10 | Tenant boundary enforcement | P2 | ~450 |
| U-HAGI11 | Unified kill switch + budget caps | P2 | ~350 |
| U-HAGI12 | 12-layer self-audit reporter | P2 | ~420 |
| **Total** | | | **~5180 LOC** |

Dependency chain:
```
U-HAGI03 → U-HAGI04, U-HAGI05
U-HAGI02 → U-HAGI10, U-HAGI11
```

Build order: 01 → 02 → 03 → 04 → 05 → 08 → 07 → 06 → 09 → 10 → 11 → 12.

---

## 4. Further PSN research — 4 follow-up milestones for future promotion

The user asked for "further research on what else we can improve for PSN". Beyond HAGI-MS0, four follow-up milestones (NOT queued yet — outlined here for operator review) cover:

### 4.1 HQUAL-MS0 — Quality / verification (~14 units, est.)

PSN's introspection surfaces have known drift:
- Hook fire-rate audit: 516 zero-fire hooks (136 wired-silent + 380 unwired-on-disk) per CLAUDE.md Recent-regressions
- Envelope drift: 190 envelopes claimed vs derived mismatches per session inject
- Wiki link audit: 4.2% broken `[[backlink]]` tokens (4,136 of 97,673)
- HTML companion guard fires warn-only; could be HARD gate
- PRISM-AI engine memo coverage: 42.9% (4 of 7 engines)
- NN-GNN tier-5 DORMANT (AUROC 0.096 vs 0.78 gate)

Units would cover: hook fire-rate sweep + reaper, envelope-drift-fix automation, wiki link auto-repair, HTML companion HARD-block, memo-coverage backfill, GNN retrain ratchet.

### 4.2 HPROD-MS0 — Production hardening (~12 units, est.)

Currently PSN is dev-shop-grade. PrismApp commercial deploy needs:
- Backup + DR for `state/shared/` and `.swarm/memory.db`
- Schema migration coverage audit (200+ JSON schemas)
- Performance regression detection (no CI perf bench today)
- Real-time health check + alerting (paired with U-HMPI06 Slack + U-HMPI07 Twilio)
- Secrets rotation policy
- Rate limiting (per-customer in PrismApp)
- Crash recovery test suite
- Cold-start time SLO

### 4.3 HCUST-MS0 — Customer / multi-tenant (~10 units, est.)

PrismApp will host multiple customers. Beyond U-HAGI10 tenant-boundary:
- Customer authentication / authorization layer (Supabase MCP wired today; auth layer not built)
- Per-customer tribal corpus namespacing
- Per-customer wiki views (filtered by `customer_visible:true` frontmatter)
- Customer onboarding pipeline (JM-Die first; ACME Mfg-style follow-ups)
- Stripe webhook → PRISM state sync (paired with U-HMPI05)
- Per-customer dashboard + analytics
- Customer-data export / deletion (GDPR-class)
- Customer support runbook automation

### 4.4 HRATCH-MS0 — AI compounding ratchet (~12 units, est.)

PSN's compounding gains come from outcome feedback. Today this is partial:
- Real-time learning from operator corrections (every override should produce a learning signal)
- Failure-mode taxonomy (errors classified into a finite ontology, retrieval-augmented)
- Outcome attribution (when a quote ships, which engines contributed?)
- Confidence calibration ratchet (Brier-score reduction over time)
- Cross-domain transfer priors (mill→lathe→wire-EDM cross-pipeline)
- Per-slot domain expertise scoring (bravo=mill, charlie=wire, etc. — who's strongest?)
- AGI training corpus auto-curation (deduplicate + score-rank automatically)
- Counterfactual replay (would a different model/dispatcher have shipped a better outcome?)

**Combined follow-up scope:** ~48 units across 4 milestones; ~12K total LOC. Operator promotes them via separate `/goal [MS-ID]` commands when ready.

---

## 5. PSN + PrismApp synergy plan

### 5.1 Direct synergies (HAGI-MS0 ↔ existing sisters)

| HAGI unit | Synergy with sister units |
|-----------|---------------------------|
| U-HAGI01 durable workflow | Powers HMEMV-MS0 dream cycle + HCAP-MS0 eval harness + HMPI-MS0 Twilio long-poll |
| U-HAGI02 control plane | Consumes HCAP03 cost ledger + closes the slot-commit-enforce control-plane gap |
| U-HAGI03 swarm | Excels at HCAP-MS0 batch Excel ingest (HCAP07/08/09) + HMPI04 Anthropic Memory benchmark |
| U-HAGI04 auto-decomp | Feeds U-HAGI05 + the eval harness's per-suite decomposition |
| U-HAGI05 batch deliverable | Backbone for PrismApp commercial Quote pipeline |
| U-HAGI06 web work-surface | Frontend for HMPI05 Stripe / HMPI06 Slack / HMPI11 Notion |
| U-HAGI07 A2A | Pairs with HMPI MemoryProvider compliance (HMEMV10) |
| U-HAGI08 source chain | Citations for every HCAP02 schema-aware output |
| U-HAGI09 policy tests | Extension of HCAP05 eval harness |
| U-HAGI10 tenant boundary | Required by HMPI05 Stripe (per-customer) + HMPI02 Postgres (PII isolation) |
| U-HAGI11 kill switch | Sits ABOVE all 53 units as the operator's emergency primitive |
| U-HAGI12 self-audit | Continuously regenerates this very spec's matrix |

### 5.2 PrismApp commercial readiness

After HAGI-MS0 + the three sister milestones ship, PrismApp can launch with:
- L1 Work surface — PrismApp web UI (U-HAGI06) + Excel add-in (HCAP14) + SMS alerts (HMPI07)
- L2 Agent contract — slot souls (HERMES02) + evolution loop (HRP05) + compiler (HCAP13)
- L3 Model — multi-vendor router with cost telemetry (HCAP03)
- L4 Runtime — durable workflow (HAGI01) + self-correct (HCAP04) + plan tracker (HCAP06)
- L5 Interop — full MCP + A2A (HMPI + HAGI07)
- L6 Execution surface — dispatcher + Computer Use fallback (HMPI14)
- L7 Memory — 5-namespace vault + Mnemosyne tiering (HMEMV01)
- L8 Knowledge — master-index + Qdrant Discovery + source-chain citations (HAGI08)
- L9 Durable workflow — HAGI01
- L10 Evals — HCAP05 + HAGI09 policy tests
- L11 Observability — trace replay (HCAP01) + cost ledger (HCAP03) + provenance (HAGI08)
- L12 Control plane — unified (HAGI02) + tenant boundary (HAGI10) + kill switch (HAGI11)

All 12 layers covered. PSN at that point exceeds Hermes-frontier on every documented axis.

---

## 6. Safety + advisory posture

- All 12 HAGI units are SAFETY-CRITICAL or COMMERCIAL-CRITICAL — every unit gets full 3-of-3 scrutiny
- U-HAGI09 policy tests gate U-HAGI02 / U-HAGI10 / U-HAGI11 production rollout
- U-HAGI06 PrismApp scaffold is SHELL ONLY — feature pages are follow-up MS (HCUST-MS0)
- R12 fail-soft on durable workflow / coordinator / decomposer / A2A
- No-public-H: doctrine respected — federated/external interfaces opt-in only
- Multi-tenant default-deny; explicit override only
- `mustHumanVerify:true` on envelope

---

## 7. Sequencing summary

```
P0 ship first:    U-HAGI01 durable workflow
                  U-HAGI02 control plane
                  U-HAGI03 swarm

P1 compounds:     U-HAGI04 auto-decomp
                  U-HAGI05 batch deliverable
                  U-HAGI06 PrismApp scaffold
                  U-HAGI07 A2A
                  U-HAGI08 source chain

P2 extensions:    U-HAGI09 policy tests
                  U-HAGI10 tenant boundary
                  U-HAGI11 kill switch
                  U-HAGI12 self-audit reporter
```

After HAGI-MS0 ships, operator can promote any of the 4 follow-up milestones in sec 4 — they are pre-scoped + ready for envelope generation.

---

## 8. References

- Voxyz article: https://x.com/Voxyz_ai/status/2058222816474919343 (2026-05-23)
- Kirill article: https://x.com/kirillk_web3/status/2057497197638242362 (2026-05-21)
- Sister milestones: HMEMV-MS0, HCAP-MS0, HMPI-MS0
- Slot-commit enforcement: commit `3beefdc3f8` (shipped 2026-05-24)
- Doctrine: [[feedback_psn_definition]] · [[feedback_no_public_h_drive]] · [[reference_hermes_memory_vault_ms0_2026_05_23]] · [[reference_hermes_capability_expansion_ms0_2026_05_24]] · [[reference_hermes_mcp_plugin_inventory_ms0_2026_05_24]] · [[reference_slot_commit_worktree_enforce_2026_05_24]]
- Mentioned tools (Voxyz article):
  - OpenClaw (SOUL.md pattern)
  - OpenAI Agents SDK
  - Temporal / Inngest / Restate / Trigger.dev / Cloudflare Workflows (durable workflow)
  - Pinecone / Qdrant / Weaviate / pgvector / GBrain (retrieval)
  - LangSmith / Arize / Helicone / Logfire / Phoenix (observability)
  - Braintrust / LangSmith eval / OpenAI evals / Promptfoo (evals)
  - MCP (Linux Foundation Agentic AI; 10K+ public servers)
  - A2A (Linux Foundation; 150+ orgs)
- Mentioned tools (Kirill article):
  - Moonshot K2.6 Kimi Agent Swarm (300 agents, 4000 steps, web UI)
  - Claude Agent Teams (4-6 agents, peer-to-peer)
  - Claw Groups (multi-specialist chat rooms)

---

## 9. Advisory footer

12 HAGI units operator-reviewable + operator-gated. Combined with 11 + 16 + 14 sister units = **53 units + 1 enforcement hook** close the Hermes-frontier + AGI-architecture audit. The 4 follow-up MS outlined in sec 4 (HQUAL/HPROD/HCUST/HRATCH, ~48 more units total) are pre-scoped for operator promotion when ready. After all 5 milestones ship, PSN exceeds the published Hermes ecosystem on every Voxyz-documented axis and reaches PrismApp commercial-readiness.
