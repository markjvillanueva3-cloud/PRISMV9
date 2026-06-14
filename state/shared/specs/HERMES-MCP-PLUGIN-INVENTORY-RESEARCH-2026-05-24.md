# HERMES-MCP-PLUGIN-INVENTORY — deep research (2026-05-24)

**Author:** claude-ea80ce2f slot bravo
**Source:** User directive 2026-05-24: *"find more high leverage tools to improve zebra hermes capabilities and efficiency. do deep research on other functionalities of obsidian, qdrant, and most importantly hermes agents, look for othe mcp servers and plugins that would improve our systems | plan for synergizing with PSN and Prism App"*. This is the SUPPLY-SIDE survey — what's in the broader MCP + plugin ecosystem that PRISM does not yet integrate with.
**Status:** advisory only; every integration is operator-reviewable + operator-gated promote. Credentials staged TEST-MODE; prod gated.
**Companion envelope:** `mcp-server/data/milestones/HERMES-MCP-PLUGIN-INVENTORY-MS0.json` (14 units, U-HMPI01..14).

---

## 0. Goal restated + sister milestones

| MS | Focus | Units |
|----|-------|-------|
| HMEMV-MS0 | Memory layer (Mnemosyne tiered + yantrikdb explain + temporal recall + GBrain dream + Mem0 router + Hindsight reflect + FlowState warmup + Obsidian Bases + Qdrant migration + MemoryProvider compliance + Dataview) | 11 |
| HCAP-MS0 | Capability expansion (trace replay + schema output + cost telemetry + self-correct + eval harness + plan tracker + Excel I/O + Obsidian plugin + Qdrant Discovery/SPLADE + Council debate + slot-soul compile + Excel add-in + federated tribal + agentskills.io) | 16 |
| **HMPI-MS0 (this MS)** | **External integrations — MCP servers + Claude Code plugins PRISM does not yet wire** | **14** |

Combined: **41 units + 1 enforcement hook** (slot-commit-worktree-enforce, shipped this session). Together they close the full Hermes-frontier audit.

---

## 1. PRISM's CURRENT MCP + plugin surface (audit)

### 1.1 Already wired MCP servers (from Skill tool list)

- `claude-flow` — massive in-process registry (200+ tools across agent / memory / hooks / hive / coordination)
- `chrome-devtools-mcp` — browser automation + a11y + LCP debugging
- `playwright` — alternate browser driver
- `figma` — design import (OAuth-gated)
- `greptile` — code search (OAuth-gated)
- `linear` — issue tracker (OAuth-gated)
- `supabase` — auth + db (OAuth-gated)

### 1.2 Already installed plugins (skills)

- `superpowers` — brainstorming, writing-plans, executing-plans, TDD, code-reviewer, systematic-debugging, requesting-code-review, subagent-driven-development, finishing-a-development-branch, dispatching-parallel-agents, writing-skills, using-superpowers, using-git-worktrees, verification-before-completion, receiving-code-review
- `pr-review-toolkit` — code-reviewer, code-simplifier, comment-analyzer, pr-test-analyzer, silent-failure-hunter, type-design-analyzer
- `hookify` — configure, hookify, list, writing-rules, conversation-analyzer
- `feature-dev` — code-architect, code-explorer, code-reviewer, feature-dev
- `claude-md-management` — revise-claude-md, claude-md-improver
- `code-review` (built-in), `security-review` (built-in), `verify` (built-in), `run` (built-in)
- `commit-commands` — clean_gone, commit-push-pr, commit
- `agent-sdk-dev` — new-sdk-app, agent-sdk-verifier-py, agent-sdk-verifier-ts
- `frontend-design`, `skill-creator`, `claude-code-setup`, `update-config`, `loop`, `claude-api`
- `qodo-skills` — qodo-pr-resolver, qodo-get-rules
- `ralph-loop` — continuous loop
- `obsidian` — defuddle, obsidian-cli, obsidian-bases, json-canvas, obsidian-markdown
- `cowork-connectors` — Fusion 360, hyperMILL, OPC-UA, MQTT, MTConnect, Grafana

### 1.3 Gap

PRISM's surface is heavily DEV-tool oriented. The **business + customer + production** surfaces are missing: GitHub MCP for first-class repo ops, Postgres MCP for prod data query, Stripe for billing, Twilio for shop-floor alerts, SendGrid for quote email, Slack for chat-bus bridge, Sequential Thinking for structured CoT, Anthropic Memory MCP for PSN benchmarking, Smithery.ai marketplace, Sentry for APM, Notion for customer-facing docs, Computer Use for legacy-GUI fallback.

---

## 2. MCP servers — Tier-1 (P0, ship first)

### 2.1 GitHub MCP server (U-HMPI01)

- **Source:** Anthropic official MCP
- **Why now:** PRISM uses `gh` CLI today, but every dispatcher that wants to know "did this commit land?" or "what PRs are open against this repo?" has to spawn `gh` and parse JSON. MCP server gives first-class typed actions (list_issues, get_pr, create_review_comment, search_repos).
- **Risk:** auth via PAT or OAuth; PII risk if a customer's private repo gets surfaced. Mitigation: per-customer allowlist of org/repo prefixes.
- **Synergy:** wires into close-out-audit, milestone progress, scrutiny replay, PR review pipelines.
- **Fallback:** existing gh CLI stays as R12 path.

### 2.2 Postgres MCP server (U-HMPI02)

- **Source:** Anthropic official MCP
- **Why now:** PRISM has `mcp-server/src/db/` PostgreSQL schema. Claude has no current way to query it live — every "what's customer X's job history?" requires a custom dispatcher. MCP gives (list_tables, describe_table, query) instantly.
- **Risk:** the BIGGEST PII surface. JM Die has 100+ customers; a wrong query reveals everything. Mitigation: read-only role + column-level allowlist + audit log on every query + per-prompt operator opt-in.
- **Synergy:** every customer-facing dispatcher (QuoteEstimator, ActualCost, JobLifecycle, CapacityPlanning) becomes more responsive.

### 2.3 Sequential Thinking MCP (U-HMPI03)

- **Source:** Anthropic official MCP
- **Why now:** Three HCAP units (self-correct, plan tracker, council debate) need structured CoT. Sequential Thinking gives `think`, `revise`, `branch`, `summarize` as explicit tools — better than free-form natural-language CoT.
- **Risk:** none significant; doesn't touch external state.
- **Synergy:** unlocks U-HCAP04/06/12 with a stronger reasoning substrate. Also: U-HMEMV04 dream-cycle gets structured contradiction-detection.

---

## 3. MCP servers — Tier-2 (P1, ship next)

### 3.1 Anthropic Memory MCP (U-HMPI04)

The reference single-namespace key-value memory. Wire BESIDE PSN (not as a replacement) so U-HCAP05 eval-harness can benchmark recall@K + cost-per-correct vs the 5-namespace PSN. Produces hard numbers for the "PRISM exceeds Hermes memory" claim. This is the EVIDENCE LAYER for marketing PSN.

### 3.2 Stripe MCP (U-HMPI05)

- **Why now:** PrismApp commercial launch needs subscription + per-customer usage billing. Pairs with U-HCAP03 cost-telemetry — Stripe's `create_invoice` consumes the cost-ledger.
- **Risk:** real money. Mitigation: TEST-MODE wiring first; prod creds gated behind explicit operator approval + a separate `prism_stripe_prod` dispatcher namespace.

### 3.3 Slack MCP (U-HMPI06)

- **Why now:** PRISM chat-bus today is JSONL on disk. Operators don't watch the JSONL — they live in Slack. Slack MCP gives `chat_postMessage` so fleet alerts/handoffs/critical-blocks land in a real channel.
- **Risk:** noise (every chat-bus event hitting Slack would be spam). Mitigation: per-event allowlist (critical-block + scrutiny-fail + Stop-hook-deny only) + spam throttle (max N/hour per channel).

### 3.4 Twilio MCP (U-HMPI07)

- **Why now:** Manufacturing shops live on PHONES, not Slack. SMS for "machine 5 spindle alarm" + "Job 47892 ready for inspection" + "Tolerance fail batch 12" wins shop-floor adoption. Twilio MCP for both send_sms + make_call.
- **Risk:** cost (SMS is per-message); allowlist phone numbers per shop; daily cost cap. Mitigation: per-shop sender allowlist + USD/day cap + cost-ledger integration.

### 3.5 Smithery.ai MCP marketplace (U-HMPI08)

Smithery.ai is the de-facto community MCP registry (2026-04+). Build `prism_mcp_marketplace` dispatcher that searches Smithery, surfaces top-K with description/auth-requirement/license, and gates installation behind operator approval. Symmetric to U-HCAP16 (agentskills.io recipes) — one for MCPs, one for skills.

---

## 4. MCP servers — Tier-3 (P2, defer)

- **U-HMPI09 SendGrid** — quote-pack auto-send (sister to U-HMPI07 Twilio for SMS).
- **U-HMPI10 Sentry** — APM beyond local error-pattern-promote. PrismApp-tier only; PII scrubber required.
- **U-HMPI11 Notion** — customer-facing doc export from wiki. Per-entry export gate.

---

## 5. Claude Code plugins — Tier-2 audit

### 5.1 superpowers (U-HMPI12)

Already installed. 15 skills shipped:
- `brainstorming` — pre-implementation exploration. **OVERLAPS** with `/forge` series. Pick one canonical path.
- `writing-plans` — multi-step plan authoring. **OVERLAPS** with milestone envelopes. Net-additive for ad-hoc tasks <1-day; defer to envelopes for >1-day.
- `executing-plans` — run plan steps. **OVERLAPS** with `/loop` autonomous mode. Pick `/loop` (already PRISM-integrated).
- `test-driven-development` — TDD discipline. **OVERLAPS** with PRISM "tests verify intent not behavior" rule. Pick PRISM rule (more strict).
- `code-reviewer` (and `requesting-code-review`, `receiving-code-review`) — **OVERLAPS** with 3-of-3 scrutiny gate. Pick scrutiny gate.
- `systematic-debugging` — net-additive; PRISM has no formal debugging skill.
- `dispatching-parallel-agents` — net-additive; clarifies multi-agent fan-out patterns.
- `using-git-worktrees` — net-additive but DEFER — SLOT-WORKTREE-MS0 already covers PRISM's worktree convention.
- `subagent-driven-development` — net-additive.
- `verification-before-completion` — **OVERLAPS** with Stop-gate scrutiny. Pick scrutiny gate.
- `writing-skills` — net-additive; companion to /skill-creator.
- `using-superpowers` — meta-skill, always active.
- `finishing-a-development-branch` — net-additive.

Adoption matrix: keep {systematic-debugging, dispatching-parallel-agents, subagent-driven-development, writing-skills, finishing-a-development-branch} as net-additive; mark the rest as OVERLAPPED-prefer-PRISM-doctrine.

### 5.2 hookify (U-HMPI13)

5 skills: configure, hookify, list, writing-rules, conversation-analyzer. PRISM has ~500 hooks; hookify's interactive authoring could replace hand-rolled new-hook scaffolds. Compare vs /forge-hooks skill. Decision: KEEP hookify for one-off ad-hoc hooks (operator-driven); use /forge-hooks for batch hook generation.

### 5.3 Other installed plugins — KEEP AS-IS

- `pr-review-toolkit` — solid; complements scrutiny gate
- `feature-dev` — solid; alternative to /forge-* skills
- `claude-md-management` — solid; CLAUDE.md curation
- `commit-commands` — solid; commit/push/PR helpers
- `agent-sdk-dev` — solid; Anthropic SDK app scaffolds
- `qodo-skills` — solid; PR resolver
- `frontend-design` / `skill-creator` / `update-config` / `loop` — solid
- `obsidian` plugin — solid; Bases + Canvas + Markdown helpers
- `code-review` / `security-review` / `verify` / `run` (built-in) — solid

---

## 6. Computer Use bridge (U-HMPI14)

Anthropic Computer Use API (screenshot + click + type) reaches GUIs that have no MCP/CLI. Critical for legacy shop-floor apps:
- Master Post UI (proprietary G-code editor)
- CIMCO DNC manager
- Certain CAM products without MCP/API (e.g., older PowerMill versions)

Wire as **fallback path** AFTER MCP/CLI/Office.js exhausted (R12 chain). Per-app allowlist + recorded session traces (compounds with U-HCAP01 trace replay). Demo unit: Master Post automation for the JM-Die test shop.

Critical safety: every Computer Use session must:
1. Run inside a containerized session (no host-FS access)
2. Have a recorded trace replayable for audit
3. Hit only allowlisted apps
4. Be operator-approved per-session

---

## 7. PSN + PrismApp synergy plan

| Unit | PSN legs | PrismApp angle |
|------|----------|---------------|
| U-HMPI01 GitHub | L2 PRISM-OS, L7 Engines | Customer-bound PRs / issue triage |
| U-HMPI02 Postgres | L2 PRISM-OS | Live customer data queries (PII-gated) |
| U-HMPI03 Sequential Thinking | L11 PRISM-AI | Powers HCAP04/06/12 reasoning |
| U-HMPI04 Anthropic Memory | L4 Memory | Eval harness benchmark baseline |
| U-HMPI05 Stripe | L7 Engines | PrismApp billing layer (consumes U-HCAP03 ledger) |
| U-HMPI06 Slack | L2 PRISM-OS | Operator chat-bus bridge |
| U-HMPI07 Twilio | L2 PRISM-OS | Shop-floor SMS alerts |
| U-HMPI08 Smithery | L5 Tribal | Community MCP marketplace import |
| U-HMPI09 SendGrid | L2 PRISM-OS | Quote-pack auto-email |
| U-HMPI10 Sentry | L7 Engines | PrismApp APM |
| U-HMPI11 Notion | L1 Obsidian-brain | Customer-facing doc export |
| U-HMPI12 superpowers | L11 PRISM-AI | Dev-skill ecosystem audit |
| U-HMPI13 hookify | L5 Tribal | Hook authoring tooling |
| U-HMPI14 Computer Use | L2 PRISM-OS, L11 PRISM-AI | Legacy-GUI fallback |

### PrismApp commercial readiness path
The Tier-1 + Tier-2 units (U-HMPI01-08) directly enable PrismApp commercial launch:
- GitHub + Postgres = backend live data
- Sequential Thinking = better reasoning
- Anthropic Memory benchmark = marketing evidence
- Stripe = billing
- Slack + Twilio = customer comms
- Smithery = extension ecosystem

After these ship, PrismApp can go live with customer billing + alerting + live-data + ext registry.

---

## 8. Safety + advisory posture

- **Credentials staged TEST-MODE first** — Stripe/Twilio/SendGrid/Postgres prod creds gated behind explicit operator approval
- **PII allowlists** — Postgres column allowlist, Slack channel allowlist, Twilio phone allowlist, Stripe customer scope
- **Cost caps** — Twilio per-day-per-shop, Stripe charges always logged, Sentry sample rate bounded
- **Audit log on every external call** — feeds U-HCAP03 cost-ledger
- **No-public-H: doctrine** — every MCP-integrated dispatcher respects internal-only deployment
- **R12 fail-soft** — GitHub MCP falls back to gh CLI, Postgres MCP falls back to direct query, Sequential Thinking falls back to free-form CoT
- **Never delete only disable** — every existing path stays live as fallback

---

## 9. Sequencing + dependency chain

```
P0 (ship first):  U-HMPI01 GitHub, U-HMPI02 Postgres, U-HMPI03 SequentialThinking
P1 (next):        U-HMPI04 AnthropicMemory, U-HMPI05 Stripe, U-HMPI06 Slack, U-HMPI07 Twilio, U-HMPI08 Smithery
P2 (extensions):  U-HMPI09 SendGrid, U-HMPI10 Sentry, U-HMPI11 Notion, U-HMPI12 superpowers, U-HMPI13 hookify, U-HMPI14 ComputerUse
```

No hard dependencies between units — every MCP/plugin integration is standalone. Build order recommendation: P0 first (foundational), then P1 in pairs (Stripe+Slack+Twilio cluster for customer comms; AnthropicMemory+Smithery cluster for ecosystem), then P2 extensions.

Total LOC: ~2.1K across 14 units (most are config + thin wrapper + per-integration safety).

---

## 10. Out of scope (defer to future MS)

- Docker MCP / Kubernetes MCP — PRISM's docker-launcher already wraps Docker; MCP layer is low-leverage
- AWS/S3 MCP — backup is operator-tier, defer
- QuickBooks MCP — ERP bridge, defer until JM-Die requests it
- Salesforce / HubSpot MCP — CRM, defer
- Zoom MCP — meetings, defer
- IFTTT / Zapier — too brittle for production
- pgvector / Pinecone / Weaviate / Chroma MCPs — Qdrant is sufficient (U-HMEMV09)
- Puppeteer / Selenium — Playwright is already wired
- mem0 MCP — wired as part of U-HMEMV05 (router intercept)
- Anthropic Computer Use beyond U-HMPI14 demo — full rollout deferred to a dedicated MS

---

## 11. Verification + scrutiny

Each unit ships with:
- Per-integration safety wrapper (auth, PII filter, cost cap, allowlist)
- ≥3-4 round-trip tests (happy, R12 fail-soft, allowlist-rejection)
- Stop-hook driver where the unit emits state changes
- Wiki entry under `knowledge/wiki/architecture/mcp-integrations/<unit-slug>.md`
- Memory file under `knowledge/memories/reference/reference_<unit-slug>_2026-MM-DD.md`
- Per-file scrutiny gate (2 parallel reviewers per file in multi-file commits)
- End-of-task 3-of-3 scrutiny gate

---

## 12. References

- Envelope: `mcp-server/data/milestones/HERMES-MCP-PLUGIN-INVENTORY-MS0.json`
- Sister MS: `HERMES-MEMORY-VAULT-MS0.json` + `HERMES-CAPABILITY-EXPANSION-MS0.json`
- Sibling specs:
  - `state/shared/specs/HERMES-MEMORY-VAULT-RESEARCH-2026-05-23.md`
  - `state/shared/specs/HERMES-CAPABILITY-EXPANSION-RESEARCH-2026-05-23.md`
- Slot-commit enforcement (shipped this session): commit `3beefdc3f8`
- Anthropic MCP catalog: https://github.com/modelcontextprotocol/servers
- Smithery.ai (community MCP registry)
- Anthropic superpowers plugin (already installed)
- Doctrine: [[feedback_psn_definition]] · [[feedback_no_public_h_drive]] · [[feedback_never_delete_only_disable]] · [[reference_hermes_memory_vault_ms0_2026_05_23]] · [[reference_hermes_capability_expansion_ms0_2026_05_24]] · [[reference_slot_commit_worktree_enforce_2026_05_24]]

---

## 13. Advisory footer

All 14 units operator-reviewable + operator-gated promote. Credentials TEST-MODE first; prod gated. PII allowlists + cost caps + per-app allowlists baked in. `mustHumanVerify:true`. No-public-H: doctrine respected.

Combined with HMEMV-MS0 (11 units) + HCAP-MS0 (16 units) + slot-commit-worktree-enforce hook (shipped 2026-05-24 at `3beefdc3f8`), this **41-unit + 1-hook** Hermes-frontier audit closes every capability + integration + memory + enforcement gap PRISM had vs the 2026-05 MCP/plugin ecosystem.
