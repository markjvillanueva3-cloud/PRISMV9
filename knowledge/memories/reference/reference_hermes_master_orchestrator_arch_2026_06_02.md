---
name: reference_hermes_master_orchestrator_arch_2026_06_02
description: "Hermes app = slot-less ZULU master orchestrator; teacher machinery already built, slot-brief channel is the one new keystone (now shipped)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.605Z
aliases: reference_hermes_master_orchestrator_arch_2026_06_02
---


**Hermes-as-master-orchestrator architecture (2026-06-02, slot:bravo).** Full spec: `state/shared/specs/HERMES-MASTER-ORCHESTRATOR-ARCHITECTURE-2026-06-02.md`.

**Decision:** the Nous Hermes desktop app is the runtime embodiment of the **ZULU orchestrator role** (`CHAT-SLOT-DOMAINS.md` = "Hermes agent chat fleet orchestrator") — the conductor ABOVE the 25 domain worker-slots, NOT a 26th/27th worker. Do **NOT** add `zebra` to `SLOT_NAMES` (would force a schemaVersion bump + rebuild every slot file + 3×27 wrapper regen, and pollute every `SLOT_NAMES.length` worker-iteration). Hermes has no chat-slots.json row / heartbeat / slot-claim; it reads/writes PRISM state via MCP + drives workers through the bus + slot-briefs. `main-tree-write-block` fail-opens for a no-slot chat, so Hermes behaves like golf (integrator), never raw-editing main-tree source.

**4 roles, mechanism, status:** MASTER-BRAIN (reads CHAT-SLOT-DOMAINS + 34 `[galaxy:]` back-pointers — maps BUILT) · TEACHER (already 6+ wired inject hooks: tribal-by-domain / wiki-precheck / master-index / memory-relevance / slot-context-bundle / slot-soul / slot-domain-awareness — Hermes authors INTO the sources they read, does NOT reinvent injection) · ORCHESTRATOR (ZuluFleetGovernor authority gate + ZuluTaskAuction + MultiModelConsensus octopus + HermesParallelFanoutPlanner — engines BUILT) · LEARNER (octopus-outcomes + error-ledger→memory + NN-graph tier-5 + SCRUTINY arm-B fails → distill lessons DOWN into galaxy MEMORY.md — machinery BUILT).

**The genuinely-NEW artifact = the targeted brief channel** (everything else is reuse). Shipped this session — see [[reference_slot_brief_channel_2026_06_02]].

**Phases:** P0 Hermes↔PRISM MCP (DONE — `mcp_servers.prism` in `C:/Users/wompu/AppData/Local/hermes/config.yaml`, needs `pip install --upgrade mcp` + restart) · P1 slot-brief-inject channel (DONE) · P1.5 slot_brief WRITE dispatcher (DONE) · P2 Hermes SOUL=ZULU persona (pending) · P3 knowledge/hermes-outputs/ lane (pending) · P4 system-viz ghost.hermes_app roost (pending) · P5 verify zulu_authority_check on branch (pending).

**Safety (HARD):** the master orchestrates but gets NO gate exemption — every worker still runs its own 3-of-3 + S(x)/Omega + comprehensive-build gates. `zulu_authority_check` decides whether the orchestrator may ISSUE a directive, never whether a worker may SKIP a gate. Scope Hermes' MCP toolset read+coordination-write; never grant a path to edit settings.json hook arrays or the scrutiny ledger. Prior: [[reference_hermes_app_incorporation_plan_2026_06_02]] · [[reference_cyrilxbt_obsidian_hermes_apply_assessment_2026_06_02]].
