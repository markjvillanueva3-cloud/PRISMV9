---
name: reference-hermes-mcp-plugin-inventory-ms0-2026-05-24
description: HERMES-MCP-PLUGIN-INVENTORY-MS0 envelope (14 units) + 380-line research spec shipped 2026-05-24 slot bravo via peer commit 76a2931c4f (charlie PSN-INCORPORATION subject; 4th H8 misattribution this bravo session). Third sister to HMEMV-MS0 + HCAP-MS0. Combined 41 units + 1 enforcement hook close Hermes-frontier audit.
aliases: reference_hermes_mcp_plugin_inventory_ms0_2026_05_24
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.140Z
---


# HERMES-MCP-PLUGIN-INVENTORY-MS0 — MCP servers + Claude Code plugins audit (2026-05-24, slot bravo)

Closes the extended /goal directive: *"look for other mcp servers and plugins that would improve our systems"* — added 2026-05-24 to the prior 'find more high-leverage tools + deep research on Obsidian/Qdrant/Hermes + PSN/PrismApp synergy' goal.

## Sister milestone family (full Hermes-frontier audit)

| MS | Focus | Units | Commit |
|----|-------|-------|--------|
| HMEMV-MS0 | Memory layer | 11 | 340385c95d |
| HCAP-MS0 | Capability expansion | 16 | 3cca69b796 |
| **HMPI-MS0 (this)** | **MCP + plugin integration** | **14** | **76a2931c4f** |
| (enforcement) | [[reference_slot_commit_worktree_enforce_2026_05_24|slot-commit-worktree-enforce]] hook | 1 | 3beefdc3f8 |
| **TOTAL** | **Full Hermes-frontier capability/memory/integration audit** | **41 + 1** | — |

All 4 commits peer-absorbed under various peer slot subjects ([[reference_h8_misattribution_2026_05_20|H8 misattribution]] recurrence — slot-commit-enforce hook now wired to prevent further occurrences).

## The 14 units by tier

**P0 (foundational MCP):**
- U-HMPI01 GitHub MCP — typed repo ops beyond gh CLI
- U-HMPI02 Postgres MCP — LLM-direct prod data query (PII-allowlisted, read-only role)
- U-HMPI03 Sequential Thinking MCP — structured CoT for HCAP04 self-correct + HCAP06 plan tracker + HCAP12 council debate

**P1 (commercial readiness):**
- U-HMPI04 Anthropic Memory MCP — benchmark baseline beside PSN (eval-harness comparison)
- U-HMPI05 Stripe MCP — PrismApp billing (consumes HCAP03 cost-ledger; TEST-MODE first, prod gated)
- U-HMPI06 Slack MCP — bridge PRISM chat-bus → operator's real Slack workspace
- U-HMPI07 Twilio MCP — shop-floor SMS (machine alarm / job ready / quality fail; per-shop allowlist + USD/day cap)
- U-HMPI08 Smithery.ai — community MCP marketplace; operator-gated install

**P2 (extensions):**
- U-HMPI09 SendGrid MCP — quote-pack email auto-send
- U-HMPI10 Sentry MCP — PrismApp APM (PII-scrubbed)
- U-HMPI11 Notion MCP — customer-facing doc export from wiki
- U-HMPI12 superpowers plugin — 15-skill adoption matrix vs PRISM doctrine
- U-HMPI13 hookify plugin — interactive hook authoring vs /forge-hooks
- U-HMPI14 Computer Use — legacy GUI fallback (Master Post, CIMCO, older CAM products)

## What's currently wired (audit baseline)

MCP servers active: claude-flow, chrome-devtools-mcp, playwright, figma, greptile, linear, supabase.

Claude Code plugins installed: superpowers (15 skills), pr-review-toolkit, hookify, feature-dev, claude-md-management, commit-commands, agent-sdk-dev, frontend-design, skill-creator, claude-code-setup, update-config, loop, claude-api, qodo-skills, ralph-loop, obsidian, cowork-connectors.

**Gap:** PRISM's surface is heavily DEV-tool oriented. The BUSINESS + CUSTOMER + PRODUCTION surfaces are missing — GitHub MCP / Postgres MCP / Stripe / Twilio / SendGrid / Slack / Sentry / Notion + Sequential Thinking / Anthropic Memory + Smithery + Computer Use. This MS closes that gap.

## superpowers plugin adoption matrix (U-HMPI12 highlight)

15 skills audited; KEEP {systematic-debugging, dispatching-parallel-agents, subagent-driven-development, writing-skills, finishing-a-development-branch} as net-additive. Mark {brainstorming, writing-plans, executing-plans, TDD, code-reviewer, verification-before-completion, using-git-worktrees} as OVERLAPPED-prefer-PRISM-doctrine (Karpathy R1-R12 + 3-of-3 scrutiny + /loop + SLOT-WORKTREE-MS0 already cover).

## Safety + advisory posture

- Credentials staged TEST-MODE first; prod gated behind explicit operator approval
- PII allowlists per integration (Postgres column allowlist, Slack channel allowlist, Twilio phone allowlist, Stripe customer scope)
- Cost caps (Twilio per-day-per-shop, Stripe always logged, Sentry sample-rate bounded)
- Audit log on every external call → feeds U-HCAP03 cost-ledger
- R12 fail-soft (GitHub → gh CLI, Postgres → direct query, Sequential Thinking → free-form CoT)
- No-public-H: doctrine respected
- `mustHumanVerify:true` on envelope

## PrismApp commercial readiness path

P0+P1 units (U-HMPI01-08) directly enable PrismApp commercial launch:
- GitHub + Postgres = backend live data integration
- Sequential Thinking = stronger reasoning substrate
- Anthropic Memory benchmark = marketing evidence for PSN superiority
- Stripe = customer billing layer
- Slack + Twilio = operator + shop-floor comms
- Smithery = extension ecosystem

## Files

- Envelope: `mcp-server/data/milestones/HERMES-MCP-PLUGIN-INVENTORY-MS0.json`
- Spec: `state/shared/specs/HERMES-MCP-PLUGIN-INVENTORY-RESEARCH-2026-05-24.md` (380 lines, 13 sections)
- This memory: `reference_hermes_mcp_plugin_inventory_ms0_2026_05_24.md`

## [[reference_h8_misattribution_2026_05_20|H8 misattribution]] scoreboard (this single bravo session)

1. `def45306e9` — early session, peer charlie subject
2. `340385c95d` — HMEMV envelope, peer charlie subject
3. `3cca69b796` — HCAP envelope, peer golf RAG-RERANK-LLM subject
4. **`76a2931c4f` — HMPI envelope, peer charlie PSN-INCORPORATION subject (THIS)**

[[reference_slot_commit_worktree_enforce_2026_05_24|Slot-commit-worktree-enforce]] hook shipped at `3beefdc3f8` will prevent occurrences 5+ — once chats migrate to slot worktrees, the index.lock race vanishes.

## Cross-refs

- Envelope: `mcp-server/data/milestones/HERMES-MCP-PLUGIN-INVENTORY-MS0.json`
- Spec: `state/shared/specs/HERMES-MCP-PLUGIN-INVENTORY-RESEARCH-2026-05-24.md`
- Sister MS: [[reference_hermes_memory_vault_ms0_2026_05_23]] · [[reference_hermes_capability_expansion_ms0_2026_05_24]]
- Enforcement: [[reference_slot_commit_worktree_enforce_2026_05_24]]
- H8 doctrine: [[reference_h8_misattribution_2026_05_20]]
- Doctrine: [[feedback_psn_definition]] · [[feedback_no_public_h_drive]] · [[feedback_never_delete_only_disable]]
