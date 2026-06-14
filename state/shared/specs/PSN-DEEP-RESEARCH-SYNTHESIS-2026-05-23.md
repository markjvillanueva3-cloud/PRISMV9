# PSN Deep-Research Synthesis Index (2026-05-23)

**Author:** claude-c478f3f9 slot:sierra · **Unit:** PSN-ENHANCE-MS0::U-PSN-DEEP-RESEARCH-SYNTHESIS-2026-05-23
**Status:** advisory · mustHumanVerify · zero runtime code
**Doctrine:** /dedup — this document is a *pointer index* over 7 sibling PSN/Hermes research specs shipped earlier today + names what they collectively do NOT cover. Do NOT re-read the priors before reading §0.

---

## 0. Why this is an index, not a dossier

The 2026-05-23 /goal asked for deep research on PSN + obsidian + claude code + hermes + octopus + docker + ollama + tools that could improve PSN + missing PSN domains.

By the time sierra's loop got to this scope, **7 sibling specs (≈137 KB total) had already shipped** covering the same axes from different angles. Writing an 8th full dossier would be reinvention.

This index does three things instead:

1. **Names the existing coverage** so the operator + next slot doesn't re-read 137 KB to find what's covered.
2. **Names the four axes the seven specs collectively do NOT cover** (external AI-coding-agent landscape integration, cross-MCP interop, federated-memory PSN-leg candidates, new PSN domain proposals).
3. **Emits a dependency-ordered roll-up queue** of the ~75 units scoped across all 7 priors, ranked by compounding-leverage for a single next slot to pick from.

---

## 1. Prior specs (the 7 deliverables this index points at)

| Spec | Author | Size | Scope | Units scoped |
|---|---|---|---|---|
| [HERMES-PSN-RAG-SYNERGY-RESEARCH-2026-05-23.md](HERMES-PSN-RAG-SYNERGY-RESEARCH-2026-05-23.md) | bravo (claude-ea80ce2f) | 26 KB | 7×11 Hermes-stage × PSN-leg matrix; horizontal Hermes×PSN×RAG wiring | **7 U-HRP units** (U-HRP01..07). P0 wave U-HRP01+02+03 shipped commit `a8c86fe6d8`. |
| [HERMES-OCTOPUS-COORDINATION-RESEARCH-2026-05-23.md](HERMES-OCTOPUS-COORDINATION-RESEARCH-2026-05-23.md) | bravo | 17 KB | Hermes coordinates the 5-voice octopus consensus | **4 U-HOC units** (U-HOC01..04) |
| [HERMES-MEMORY-VAULT-RESEARCH-2026-05-23.md](HERMES-MEMORY-VAULT-RESEARCH-2026-05-23.md) | bravo | 17 KB | Simback's Hermes Memory Guidebook gap analysis vs PRISM | **11 U-HMEMV units** (U-HMEMV01..11) — tiered consolidation, explainable retrieval, temporal recall, dream cycle, memory-router intercept, reflect-on-own-memory, predictive warmup |
| [HIGH-ROI-AI-PSN-SCOPE-2026-05-23.md](HIGH-ROI-AI-PSN-SCOPE-2026-05-23.md) | golf (claude-9fbbe420) | 18 KB | RAG + NN/GNN + ML + DL exhaustive enumeration across PSN | **50+ units**: 16 RAG (A1..A16) + 18 NN/GNN (B1..B18) + 11+ ML (C1..C11+) + DL track |
| [PSN-HIGH-ROI-SURFACE-AUDIT-2026-05-23.md](PSN-HIGH-ROI-SURFACE-AUDIT-2026-05-23.md) | charlie (claude-451f7328) | 17 KB | Leg-by-leg MCP/CLI/API surface inventory + external systems shortlist | Per-leg gap catalog (no formal U-IDs yet) |
| [PSN-INCORPORATION-RESEARCH-R2-2026-05-23.md](PSN-INCORPORATION-RESEARCH-R2-2026-05-23.md) | charlie | 17 KB | 50+ systems across 13 categories (reasoning patterns, tool-use, agents, RAG, eval, observability) | Per-system shortlist (no formal U-IDs yet) |
| [PSN-INCORPORATION-RESEARCH-R3-LEARNING-REASONING-2026-05-23.md](PSN-INCORPORATION-RESEARCH-R3-LEARNING-REASONING-2026-05-23.md) | charlie | 16 KB | Learning + reasoning deep-dive: DPO/KTO/IPO/SimPO/GRPO/STaR/Quiet-STaR/rStar-Math/SPIN/REST-EM/Self-Reward + LoRA family (QLoRA/DoRA/LongLoRA/Spectrum/MoLE) | ~30 systems shortlisted |

**Plus** the OBSIDIAN-INTELLIGENCE-MS3 (PSN-ENHANCE-MS0) 7/7 ship this session ([reference-psn-enhance-ms0-closeout-2026-05-23](../../knowledge/memories/reference/reference_psn_enhance_ms0_closeout_2026_05_23.md)) closing the 6 cyrilXBT 2026-05-22 Obsidian-linking patterns + the BRIDGE-DEEP::U-BRIDGE-SFC-ESPRIT live-push composition.

**Coverage net:** of the user's named scope (obsidian, claude code, hermes, octopus, docker, ollama, tools, domains), the 7 priors hit obsidian (R1+memory-vault+OBSIDIAN-INTELLIGENCE-MS3), hermes (3 dedicated specs), octopus (HOC spec), ollama (HIGH-ROI-AI-PSN + R2 §10), and 75+ tools/systems across R1+R2+R3. **Three remain genuinely uncovered.**

---

## 2. The four axes the seven priors do NOT cover

### 2A — External AI coding-agent landscape integration (2026 reality)

The seven priors mention MCP and per-tool integration in passing, but none surveys the **competitive landscape of AI coding agents PRISM should interop with**. As of 2026-05:

| Agent | Position | PSN integration opportunity |
|---|---|---|
| **Cline** (58k★, Plan/Act architecture) | Open-source VS Code extension; Plan-then-Act splits planning from execution | PRISM's `/plan-build` skill + per-file scrutiny gate is the same pattern; expose PRISM-OS state to Cline's Plan phase via MCP |
| **Continue.dev** | Most-customizable IDE assistant (JetBrains + VS Code); AI PR checks via CI; plugin marketplace | PRISM's MCP dispatchers are already Continue.dev-consumable; missing piece is a published `prism-mcp-config` blob in the marketplace |
| **Aider** (41k★) | Terminal-native, git-aware; auto-commits with conventional commits | PRISM's `[SCOPE]/U-ID:` commit format + slot-task-claim is structurally Aider-shaped; Aider could drive PRISM units if given the slot-claim CLI |
| **Cursor** | Closed-source IDE; credit-pricing model under scrutiny | Marginal PSN value (closed source, no MCP host) |
| **Roo Code** | Shutting down 2026-05-15 | Skip (deprecated) |
| **Claude Code** (this) | Anthropic CLI; leads SWE-bench Verified at 80.8%; writes ~4% of all public GitHub commits (~135K/day) | THE host — every other agent above is a potential downstream MCP client |
| **Goose / Gemini CLI / Codex / OpenHands / Devin** | CLI-tier (Goose/Gemini/Codex) + cloud-tier (Jules/OpenHands/Devin) | All MCP-capable; PSN value = publish PRISM as an MCP server with a discoverable manifest |

**Implication for PSN:** the **MCP cross-tool layer is a missing PSN leg** in its own right. PRISM produces best-of-breed manufacturing intelligence; the AI coding agents above are best-of-breed code assistants. If PRISM's MCP surface is the *bridge*, every PRISM capability becomes available to every above agent — and every above agent becomes a potential operator interface into PRISM.

**Proposed unit:** `U-PSN-MCP-MANIFEST` — publish a discoverable manifest at `mcp-server/MANIFEST.json` listing all ~150 PRISM MCP actions with use-cases keyed for each AI-coding-agent client; updates the `mcp-server/README.md` install snippet for each agent.

### 2B — Federated memory tools as a PSN leg

R1 of the incorporation research names Letta, Mem0, and Cipher in passing. The Hermes memory-vault spec names Mnemosyne / yantrikdb / GBrain / Hindsight / FlowState-QMD as "PRISM lags here" gaps. None proposes a unified federated-memory PSN leg.

Today PRISM's memory legs (Obsidian brain + Memories + Wiki + Tribal) are **per-namespace**, with no cross-tool memory protocol. The federated-memory ecosystem is converging on a protocol layer:

- **Letta** — agent-managed memory with explicit memory operations (insert/update/forget)
- **Mem0** — per-user persistent memory across LLM sessions, MCP-exposable
- **Cipher** — cross-tool shared memory (works between Claude / Cursor / Cline)
- **mem-x / langmem** — LangChain-side parallel

**Proposed unit:** `U-PSN-FED-MEM-LEG` — declare a 12th PSN leg "federated memory" pointing at this protocol layer, with a `prism_memory:fed_export` + `fed_import` action so the existing Obsidian brain can speak Cipher/Mem0/Letta dialects.

### 2C — New PSN domain candidates (the missing-domain ask)

The user explicitly asked: *"Add other missing important domains that should be considered in PSN"*. The four most defensible candidates (none currently a leg):

1. **Cost / budget telemetry** (currently scattered: `state/shared/.token-economy-stats.json`, `route-savings-stats.json`, `ollama-offload-stats.json`, per-session token-budget hooks). **Proposal:** unify under leg 12 "Cost Telemetry" with `prism_session:token_economy_*` as the canonical dispatcher.
2. **Provenance / audit ledger** (currently scattered: SCRUTINY_LEDGER, error-pattern-promote ledger, slot-task-claims, fleet-reaper logs, hook telemetry). **Proposal:** unify under leg 13 "Audit Provenance Ledger" with a canonical query surface (`prism_session:provenance_query`) so any decision can be traced to its evidence chain.
3. **Reasoning trace** (CoT/RICE/ToT outputs are emitted but not stored as a queryable PSN leg). The `prismCreativeReasoningEngine.explore()` modes already produce reasoning traces; today they vanish post-response. **Proposal:** leg 14 "Reasoning Trace Store" so `octopus` dissent + Hermes propose-then-dedup decisions get a durable why-trail.
4. **Plugin / skill marketplace** (~440 skills + ~3000 engines + 700 wiki entries are PRISM-internal; no protocol for sharing with the open agent ecosystem). **Proposal:** leg 15 "Plugin Marketplace" exposing `prism_dev:skill_export` + `engine_export` in a Continue.dev / Cline / Aider-consumable format.

**Synthesis:** PSN evolves from 11 legs → 15 legs over the next milestone. Each new leg has a 1:1 dispatcher mapping (no parallel-leg redundancy — the cost-telemetry leg, for example, owns `prism_session:token_economy_*`, deduplicating with the Memory leg).

### 2D — Dependency-ordered roll-up across all 7 priors

Across the 7 priors, there are **~75 distinct units scoped** (7 HRP + 4 HOC + 11 HMEMV + 50+ HIGH-ROI-AI-PSN + ~30 R3 + ~10 R2 system-pick units). **No prior spec orders them across-spec.** That's the missing roll-up.

**Top-10 compounding-leverage ranking** (subjective rubric: blast-radius × already-built-feature-activation × unblocks-N-downstream):

| Rank | Unit | Origin spec | Why it leads |
|---|---|---|---|
| 1 | **U-HRP02** Tribal-grounded propose | HERMES-PSN-RAG-SYNERGY | Already-shipped tribal corpus + skill catalog become drafting fuel; multiplies every Hermes proposal's quality |
| 2 | **U-PSN-MASTER-INDEX-ALIASES** | iter-3 follow-up flag | Aliases populated this session in 7 anchor memories are dead weight until the search lib consumes them — pure activation of a shipped feature (this iter ships it) |
| 3 | **U-HOC01** Octopus-input curator | HERMES-OCTOPUS | Octopus today sees 2/11 PSN legs; this opens all 11 to all 5 voices |
| 4 | **U-PSN-MCP-MANIFEST** | this spec §2A | Closes the discoverability gap blocking every external-agent integration |
| 5 | **A6 GPU-EMBEDDER-MIGRATION** | HIGH-ROI-AI-PSN | Joint corpus+query upgrade to nv-embedqa-e5-v5 1024d unblocks A1..A4 next-gen quality |
| 6 | **U-HMEMV01** Tiered consolidation | HERMES-MEMORY-VAULT | Auto-promote working→episodic→long-term; closes a Karpathy-R10 checkpoint gap |
| 7 | **A14 U-RAG-OBSIDIAN-INDEX** | HIGH-ROI-AI-PSN | Memories vault not yet RAG-indexed (only wiki); blocks A8-A10 from operating over the full doctrine surface |
| 8 | **U-HOC02** Octopus→Hermes learning signal | HERMES-OCTOPUS | Closes the learning loop on octopus consensus; without it every invocation is amnesiac |
| 9 | **B8 U-NN-RETRAIN-EXECUTE** | HIGH-ROI-AI-PSN | NN-GRAPH tier-5 is DORMANT (AUROC 0.096 vs 0.78 gate); retrain with bridge JSONL is the gate-passing path |
| 10 | **U-PSN-FED-MEM-LEG** | this spec §2B | New PSN leg + 2 dispatcher actions; opens 5 federated-memory ecosystems |

This is the **next-wave queue**. Per Karpathy R10, a single slot should pick ONE and run it to completion before picking the next.

---

## 3. The new PSN leg count = 15 (proposed)

Combining §2A + §2B + §2C: PSN evolves from the canonical 11 legs to a proposed 15:

```
Existing:   1 Obsidian · 2 PRISM-OS · 3 Wiki · 4 Memories · 5 Tribal ·
            6 SysViz · 7 Engines · 8 Algos · 9 Formulas · 10 NN/GNN · 11 PRISM-AI

Proposed:  12 Cost-Telemetry (token-economy + route-savings + ollama-offload + per-session budget)
           13 Audit-Provenance-Ledger (scrutiny + error-pattern + slot-claims + fleet-reaper + hook telemetry)
           14 Reasoning-Trace-Store (octopus dissent + Hermes propose + ToT/RICE/CoT)
           15 Plugin-Marketplace (skill export + engine export + MCP manifest for Cline/Continue/Aider/Gemini/Codex)
```

Each new leg has a canonical dispatcher entry point (no parallel ownership). Adoption gate: each leg ships its dispatcher action + an MOC instance under `knowledge/wiki/architecture/mocs/` (the same pattern PSN-ENHANCE-MS0/U-PSN-MOC-LAYER shipped this session).

---

## 4. What this synthesis explicitly does NOT do

Per R12 fail-loud:

- Does **NOT** re-derive any of the 7 priors' content. Read them at the file paths in §1.
- Does **NOT** ship code. The companion unit U-PSN-MASTER-INDEX-ALIASES (iter 9) ships the only code from this session's deep-research /goal.
- Does **NOT** auto-promote any of the §2 proposals to a milestone envelope. Operator must `mcp-server/data/milestones/PSN-EXPAND-12-15-MS0.json` before any sub-unit gets a roadmap slot.
- Does **NOT** assert the ranking in §2D is correct in absolute terms — it's a defensible default for a single picker, not a global optimum.

---

## 5. Closes

PSN-ENHANCE-MS0::U-PSN-DEEP-RESEARCH-SYNTHESIS-2026-05-23 — synthesis index over the 7 PSN/Hermes deep-research specs already shipped this date + 4 newly-named axes (external coding-agent landscape, cross-MCP interop, federated-memory leg candidate, new domain candidates 12-15) + a 10-unit dependency-ordered next-wave queue.

**Companion sister unit this iter:** U-PSN-MASTER-INDEX-ALIASES (wires the aliases:[] frontmatter shipped in iter-3 commit `f6b5f0dce8` into master-index-search-lib, activating a dead-weight feature).
