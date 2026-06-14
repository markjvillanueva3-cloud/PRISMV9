# Business/ERP Galaxy MEMORY.md — per-domain memory cascade index (P1+P4 hybrid, 2026-05-27)

> **Per-domain memory cascade** per SCOPE-EXPANSION-OPERATOR-7-DIRECTIVES-2026-05-26.md §Q2. Auto-loads when Claude edits under `mcp-server/src/engines/business/`. Companion to `./CLAUDE.md` (hotel-targeted refinement queue).
>
> **Status: SCAFFOLDED (master-index back-pointer wired 2026-05-29; per-galaxy content migration deferred to U-GALAXY-MS1-C1).**

---

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="business" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:business]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/business_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Durable Domain Memories:** Writing durable domain memories during DISCOVER phases ensures comprehensive documentation of the domain's assets and architecture [feedback/feedback_domain_discovery_memories].
- **Business Engine Synergy:** Grouping 355 business engines into functional buckets to maximize operational efficiency and synergy [reference/reference_hotel_business_engine_buckets_2026_05_28].
- **System-Viz Utilization:** Using system-viz for auditing and ensuring all applicable nodes are wired, which aids in maintaining domain completeness [reference/reference_delta_per_feature_synergy_sweep_2026_05_29].
- **Domain Mapping and Asset Discovery:** Regularly mapping existing assets, architecture, transports, and identifying gaps during DISCOVER phases. This includes writing durable domain memories as you go [feedback/feedback_domain_discovery_memories].
- **Engine Grouping and Synergy:** Business engines are grouped into functional buckets to enhance synergy and efficiency. For example, 355 business engines were categorized into 8 buckets such as Accounting/Finance [reference/reference_hotel_business_engine_buckets_2026_05_28].
- **Formula Adjustments and Routing:** Node-indexed pointers for formulas are used to route specific actions, ensuring precise execution. Examples include `acct_multi_period_compare`, `payroll_create_period`, and `tool_cost_per_part` [node_formula_formula_adjusted_businessdispatcher_action_acct_multi_period_compare], [node_formula_formula_adjusted_businessdispatcher_action_payroll_create_period], [node_formula_formula_adjusted_businessdispatcher_action_tool_cost_per_part].

## Indexed memories
- **Domain corpus (live counts):** 12 curated memory file(s) · 256 wiki entr(y/ies) · 23 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 78 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="business" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/_legacy-root/project_wedm_erp_complete.md` · `knowledge/memories/reference/reference_charlie_underquote_assess_2026_06_02.md` · `knowledge/memories/reference/reference_delta_cad_accounting_denominator_2026_05_29.md` · `knowledge/memories/reference/reference_hotel_business_engine_buckets_2026_05_28.md` · `knowledge/memories/reference/reference_hotel_business_galaxy_2026_05_28.md`
- **Sample wiki:** `knowledge/wiki/ux-design/qb-parity-erp-ux-design-spec.md` · `knowledge/wiki/os/commands/erp-health.md` · `knowledge/wiki/os/commands/erp-sync.md` · `knowledge/wiki/os/commands/quote-to-ship.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/math-business-management-costing-finance.md` · `knowledge/wiki/code-tribal/learnings/bridge-deep-u-bridge-erp-sched.md` · `knowledge/wiki/code-tribal/learnings/business-cleanup-u-hotel-customer-knowledge-real-wire.md`

## Cross-galaxy bridges
- _(no edges recorded yet — add `business ↔ <other-galaxy>` lines as integrations land)_

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **Hotel Slot File Absorption:** Misattribution of hotel-slot files due to shared-tree lock contention remains an open issue. The commit `acee69cad3` absorbed 4 hotel-slot files, but further investigation is needed [reference/reference_iter10_hotel_absorption_2026_05_26].
- **Back-Office Data Location:** Clarification required on the location of back-office data for JM DIE. The assumption that back-office/ERP data lives in PRISM state JSONs needs verification [reference/reference_hotel_jm_die_back_office_geography].
- **SLOT-WORKTREE Activation:** Although SLOT-WORKTREE-MS0 was shipped, the fleet never migrated onto it. Further action is needed to address this issue and ensure proper migration [reference/reference_slot_worktree_activation_2026_05_16].

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Candidate business-domain memories (flat → to-migrate)

Business is the BROADEST domain (~10 sub-galaxies per ./CLAUDE.md §1) so candidate memories span many filename patterns: business, erp, payroll, pto, hr, employee, customer, vendor, po, ap, ar, billing, accounting, invoice.

- Hotel's prior session commits (per JULIETT-12CHAT-ALLOCATION) likely host the canonical hotel memories
- `reference/reference_jm_die_*` — partially business-relevant (customer-portfolio + per-customer terms)

## What goes WHERE under business/

```
knowledge/memories/business/
├── feedback/    # business rules: "payroll FLSA rounding", "PTO carryover caps", "customer credit-limit gates"
├── reference/   # ERP integration outcomes, payroll-run audits, customer-portfolio analyses
└── project/     # business milestone state (HR/ERP/CRM milestones)
```

## Per-sub-galaxy sub-cascade (proposed deferral)

Business spans 10+ sub-domains. Same defer-deep-tree principle as post-processor — ship galaxy-level first, then if hotel finds the depth helps:

```
knowledge/memories/business/
├── hr/         # payroll / PTO / benefits / performance
├── crm/        # customer mgmt / portal / portfolio
├── erp/        # integration / work-order / cost-feedback
├── accounting/ # billing / GL / AP-AR
├── vendor/     # vendor mgmt / PO
└── (top-level: feedback/reference/project as above)
```

## Hotel pickup tasks

`U-GALAXY-MS1-D2-HOTEL-BUSINESS-REFINE` in MS1 envelope explicitly calls out:
1. Refine `./CLAUDE.md` §5 + §6 across all 6 sub-galaxies
2. Verify 6 constants-paths exist (payroll-tax-tables, pto-policies, benefits-plans, customer-terms, vendor-profile, chart-of-accounts) or flag extraction-first
3. **P0 anomaly:** `BusinessSyncEngine.ts` is **320 bytes** — implement or formally archive per [[feedback_never_delete_only_disable]]

## Cross-refs

- Galactic center: [`./CLAUDE.md`](CLAUDE.md)
- Hotel pickup: `mcp-server/data/milestones/DOMAIN-GALAXY-DOCTRINE-MS1.json` → `U-GALAXY-MS1-D2-HOTEL-BUSINESS-REFINE`
- Migration: `U-GALAXY-MS1-C1-PER-GALAXY-MEMORY-MIGRATE`
- Cross-galaxy bridge: `EmployeeMachineDomainAcademyEngine` ↔ academy galaxy (see `../academy/CLAUDE.md`)
- Companion sibling indexes: `../academy/MEMORY.md`, `../post-processor/MEMORY.md`, `../quoting/MEMORY.md`
- Parent doctrine: [`state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md)

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Authoritative free-source corpus (papa 2026-06-09, GALAXY-ENRICH)
Pull-fresh-on-demand EXTERNAL knowledge for business (keeps this domain non-stagnant; complements internal CRITICAL-RESOURCE-ROOTS). Full per-galaxy index: `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` (24 sources: T1=4/T2=0/T3=20). Top primary:
- [U.S. Bureau of Labor Statistics — Employer Costs for Employee Compensation (2025 Q04):](https://www.bls.gov/news.release/ecec.nr0.htm)
- [NIST — Manufacturing economics (Applied Economics Office):](https://www.nist.gov/manufacturing-economics)
- [NIST — MEP Economic Impacts Boost Business and Jobs:](https://www.nist.gov/news-events/news/2025/03/mep-economic-impacts-boost-business-and-jobs)
Deep cited domain research (UNVERIFIED -- hotel verifies vs source before any live engine/doctrine use): `knowledge/wiki/business/_staging/deep-domain-research-2026-06-09.md`. R12: source pointers verifiable; physics/cost claims owner-gated. Regen: `scripts/build-galaxy-free-source-corpus.mjs`.
Promoted (VERIFIED-PARTIAL, papa-workflow 2026-06-09): `knowledge/wiki/business/business-foundations.md` -- 5 WebFetch-confirmed institutional/method facts (OEE=AxPxQ, predetermined-overhead-rate formula, markup-vs-margin formulas, TOC Five Focusing Steps, NIST MEP). Owner-gate split: all specific dollar figures + benchmark numbers + worked-example values (85% OEE, $30/DLH example, BLS labor rates, MEP $60B/$26.2B/77,409, target-margin formula) stay UNVERIFIED in `_staging/` for hotel; no cutting/safety constants in this galaxy.

<!-- AI-CAPABILITIES:BEGIN (auto: scripts/inject-galaxy-ai-capabilities.mjs) -->
## AI capabilities

The `business` galaxy is wired into PRISM's fleet AI substrate (PSN leg #10 NN/GNN + the Obsidian brain). It has no domain-prefixed AI engine of its own; it reasons via the live-validated generic reasoning bridge.

- **Deep-reasoning** -- reason over THIS galaxy's own context (CLAUDE + synthesis + posture) via the local-Ollama reasoning bridge:
  `node scripts/lib/galaxy-reasoning-bridge.mjs business "<question>"`
- **NN / GNN** -- the GraphSAGE tier-5 wiring-inference cascade classifies this galaxy's ghost nodes; typed cross-substrate edges (owned-by-slot, documented-by) connect it to the system-viz graph.
- **LoRA** -- this galaxy is fed into the vault->LoRA training dataset (`business_synthesis.md`).
- **RAG / CAG** -- the fleet's retrieval-augmented + cache-augmented recall (deep-learning retrieval, not keyword grep) covers this galaxy's wiki + tribal entries as they are authored.
- **Embeddings** -- the fleet's 384/768d neural embedding index covers this galaxy's notes as they are embedded, feeding semantic recall + the GNN node-feature bridge.

_Auto-maintained by `scripts/inject-galaxy-ai-capabilities.mjs` (AI-SYNERGY-AUDIT-MS0). Live posture: `state/shared/specs/AI-SYNERGY-AUDIT.md`; per-galaxy detail: this dir's `AWARENESS.md`._
<!-- AI-CAPABILITIES:END -->

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
