# Hermes App as PRISM Master Orchestrator — Architecture

**Date:** 2026-06-02 · **Author:** slot:bravo (claude-5e210e4e) · **Source:** repo-verified Workflow recon (4 agents; 2 completed fully, synthesis hit session limit — synthesized here from the 2 complete recon agents + session ground truth).
**Supersedes** the "external agent #8 / no slot" framing in `HERMES-APP-INCORPORATION-PLAN-2026-06-02.md` §1 with the operator's master-orchestrator directive.

## Decision: Hermes = the slot-LESS master that embodies the ZULU role
The Nous Hermes app is the runtime embodiment of the **ZULU orchestrator role** (`CHAT-SLOT-DOMAINS.md:31` = "Hermes agent chat fleet orchestrator") — the conductor ABOVE the 25 domain worker-slots, not a 26th/27th worker.
- **Do NOT add `zebra` to `SLOT_NAMES`** (`.claude/helpers/chat-slots.mjs` = exactly 26, alpha..zulu; zebra absent). Reasons: (1) the orchestrator row is already canonically ZULU; (2) a 27th name forces a `chat-slots.json` schemaVersion bump + rebuild of every slot file + 3×27 wrapper regen — pure churn; (3) every slot-aware loop reads `SLOT_NAMES.length` — a phantom slot pollutes worker-iteration (priority queue, fleet-reaper, fleet-status). `zebra` stays the conceptual alias for the ZULU role.
- Hermes has **no `chat-slots.json` row, no heartbeat, no slot-claim**. It reads/writes PRISM state via MCP + drives workers through the bus. Reconciles with the galaxy doctrine "zulu is never a 13th worker" — a worker consumes a galaxy + ships units; the orchestrator consumes cross-slot signals + emits work orders.
- **Slot-worktree hooks are a non-issue:** `main-tree-write-block.mjs` fail-opens when a chat has no slot binding; Hermes writes through MCP dispatchers / shared-state files (bus, specs, briefs, dashboards), behaving like golf (integrator), never raw-editing main-tree source.

## The 4 roles — mechanism + what's already built
| Role | Mechanism | Status |
|---|---|---|
| **MASTER-BRAIN (per-galaxy/slot awareness)** | Reads `state/shared/CHAT-SLOT-DOMAINS.md` (slot→domain) + the **34 `[galaxy:]` back-pointers** in master `MEMORY.md` (slot→galaxy→`engines/<galaxy>/MEMORY.md`) + `scripts/lib/slot-galaxy-map.mjs` — via filesystem-MCP (read) and `prism_session`/`prism_memory` (live). | maps BUILT; Hermes reads them |
| **TEACHER / INSTRUCTOR** | Per-prompt in-domain delivery is ALREADY 6 wired hooks (`tribal-by-domain-inject`, `wiki-precheck-inject`, `master-index-precheck-inject`, `memory-relevance-inject`, `slot-context-bundle-inject`, `slot-soul-inject`, `slot-domain-awareness-inject`). Hermes does NOT reinvent injection — it **authors into the SOURCES those hooks read** (tribal via `prism_knowledge:tribal_capture`, wiki entries, memory files) AND pushes **targeted cross-slot briefs** via the new `slot-brief-inject` channel (below). | hooks BUILT; **1 new channel** |
| **ORCHESTRATOR (dispatch work)** | Writes fleet directives to `AGENT_CHAT.jsonl` (slot-addressed: has `to`/`slot`) + cross-slot specs `ZULU-CROSS-SLOT-<topic>-<date>.md`; workers pick up via `/checkin-<slot>` + `/pick-unit`. Authority gate = `ZuluFleetGovernorEngine` predicate (`zulu_authority_check`). Reuses `ZuluTaskAuctionEngine`, `MultiModelConsensusEngine` (octopus), `HermesParallelFanoutPlannerEngine`. | engines BUILT |
| **LEARNER** | Consumes `octopus-outcomes/<domain>.jsonl` + error-ledger→memory auto-feed + NN-graph tier-5 + `SCRUTINY_LEDGER.json` arm-B FAILs; writes distilled lessons DOWN into galaxy `MEMORY.md` (the DOWN push path) → closes teacher↔learner loop. | machinery BUILT |

## THE GENUINELY-NEW PRISM ARTIFACT: targeted brief channel
Slots are Claude chats; Hermes (separate process) **cannot inject into their context** — it writes to a surface the slot's existing UserPromptSubmit hooks read on the slot's NEXT prompt.
- **Broadcast** (all chats): `prism_context:chat_post` → `chat-bus/messages/*.json` → `chat-bus-inject.mjs`. Already wired (verify `chat_post` is surfaced — `ChatBusEngine` is `// WIRE-EXEMPT`).
- **Targeted** (one slot — the missing channel): **`slot-brief-inject.mjs`** (NEW, ~70 LOC, mirrors `slot-soul-inject.mjs`) — reads `state/shared/slot-briefs/<slot>.md`, injects once, **atomically archives** to `slot-briefs/_delivered/<slot>-<ts>.md` (consume-once + audit). The orchestrator authors a brief FOR a slot (work order / wiki+tribal+memory pointer bundle / gap-correction); the slot receives it on next prompt. Knob `PRISM_SLOT_BRIEF_INJECT_DISABLE`.

## Phases (folds in the earlier P0-P4)
- **P0 — Hermes↔PRISM MCP** (highest leverage, unblocked): uncomment `mcp_servers:` in `C:/Users/wompu/AppData/Local/hermes/config.yaml` (~line 785) → `url: http://127.0.0.1:3100/mcp` (all 103 `prism_*` dispatchers become Hermes tools) + a filesystem-MCP `command: npx @modelcontextprotocol/server-filesystem H:/prism/knowledge` (read the brain/maps). `pip install --upgrade mcp`. Restart Hermes.
- **P1 — targeted brief channel**: `slot-brief-inject.mjs` + `state/shared/slot-briefs/` lane + wire into settings.json UserPromptSubmit (after slot-soul-inject).
- **P2 — Hermes SOUL.md = ZULU master persona**: embed the slot-domain table + 34-galaxy map + HARD safety-refuses ("I issue work orders + teach; never disable a safety gate, never weaken an assertion, never bypass 3-of-3 scrutiny, never auto-flip envelope status").
- **P3 — vault outputs lane** `knowledge/hermes-outputs/` (collision-free; outside every Stop-feed target).
- **P4 — system-viz `ghost.hermes_app` roost** (copy `generate-dream-artifacts-features.mjs`; dirs-only data source).
- **P5 — verify/close `zulu_authority_check` dispatcher action** (wired on cad-fusion-live-ms0 in `cb3f6a79d7`; recon read slot/bravo where it's absent — branch drift to reconcile).

## Build vs reuse
Net-new PRISM code = **`slot-brief-inject.mjs` + its test** (P1) + the **system-viz generator + test** (P4). Everything else is Hermes-side config/persona/cron + REUSE of the 6 inject hooks, the zulu/octopus engines, the 34-galaxy maps, the bus, and the learner machinery.

## Risks + mitigations
- **Safety bypass** (HARD): the master orchestrates but gets NO gate exemption — every worker still runs its own 3-of-3 + S(x)/Omega + comprehensive-build gates. `zulu_authority_check` decides whether the orchestrator may ISSUE a directive, never whether a worker may SKIP a gate. Encode refuses in Hermes SOUL.md. Scope Hermes' MCP toolset read-heavy + coordination-write; do NOT grant it a path to edit settings.json hook arrays or the scrutiny ledger.
- **Vault collision**: Hermes writes only under `knowledge/hermes-outputs/` (mirror-not-merge Stop-feed would clobber `memories/`).
- **Secrets**: `.env`(23KB)+`auth.json`+`config.yaml` — never commit `H:/hermes-install/`.
- **MCP down**: filesystem-MCP read path degrades gracefully; Hermes retries HTTP 5× backoff.
- **Single point of failure**: the master is advisory — workers run autonomously via `/checkin`; Hermes down ≠ fleet down.

Memory: [[reference_hermes_master_orchestrator_arch_2026_06_02]]. Prior: [[reference_hermes_app_incorporation_plan_2026_06_02]] · [[reference_cyrilxbt_obsidian_hermes_apply_assessment_2026_06_02]].
