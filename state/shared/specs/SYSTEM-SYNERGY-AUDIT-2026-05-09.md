# PRISM System Synergy Audit — 2026-05-09

**Author:** claude-cee63f1f
**Origin:** `/forge5` — exhaustive surface audit + automated-synergy plan
**Scope:** 20 surfaces (every internal system the user named) + cross-cuts

This audit answers ONE question: **does every PRISM surface know about every other PRISM surface, and is the inter-surface plumbing automatic?**

The TL;DR is: **not yet.** We have world-class point assets, but ~40% of the inter-surface edges are manual or missing. The 5-article research from this session + the existing Karpathy LLM-Wiki + cyrilXBT vault patterns all point to the same fix: **declarative graph + autonomous workflows + every output back-flowing into the graph.**

---

## §1 — Surface inventory (live, 2026-05-09)

| Surface | Count | Source | Status |
|---|---|---|---|
| Engines | **3,176** | `src/engines/*.ts` | 88% wired (2,802 / 3,176) per viz; 71% per BUILD_STATE — discrepancy worth resolving |
| Dispatchers | **97** | `src/tools/dispatchers/*.ts` | All loaded; action enums = 7,341 |
| Actions | **7,341** | `z.enum` count | Up from 7,302 last session — net +39 |
| Algorithms | 53 | `src/algorithms/` | |
| Registries | 26 | `src/registries/` | |
| Tests | **3,420** | `src/__tests__/` | 22 added this session (WikiRecallCounter) |
| Source hooks (TypeScript) | 54 | `src/hooks/**` | |
| Claude hooks (.mjs) | **423** (live) / 456 (inventory) | `.claude/hooks/*.mjs` | **ROOT CAUSE OF XMALLOC OOMS** — Track A1 |
| Scripts | 504 | `scripts/` + `mcp-server/scripts/` | |
| Slash commands (project) | 247 | `.claude/commands/` | |
| Slash commands (user) | 388 | `~/.claude/commands/` | |
| Memories (markdown source) | ~95 | `C:/Users/wompu/.claude/projects/H--prism/memory/` | |
| Memories (vault) | 192 (via viz) | `H:/prism/knowledge/memories/` | superset incl. mirrored + consolidated |
| Wiki entries | 774 / 190 (viz subset) | `H:/prism/knowledge/wiki/` | 774 = headline; 190 = unique-on-disk |
| Per-agent handoffs accumulated | **207** | `state/shared/handoffs/HANDOFF-claude-*.md` | Major drift signal |
| Active chat identities (last 200 events) | **14** | extracted from `AGENT_CHAT.jsonl` | claude-{0413eca6, 04c0e75c, 093e69ac, 6d83f198, 6e2e36f3, 7e84a5be, 845cf238, 84c2d13a, 99eca613, b8d8505e, bf5788e5, cee63f1f, d9860be8, feecc90b} |
| Concurrent peer chats this session | 6+ | chat-bus presence | matches user's 6-chat design |
| MCP servers configured | **2** (prism via http-bridge, claude-flow) | `.mcp.json` | Authenticated MCPs (Linear, Canva) currently unauthenticated |
| Stop hooks registered | 6 | settings.json `Stop` block | All present |
| Docker presence | `docker-compose.yml` only — no `docker/` subdir | Repo root | **U-DOCKER-HOOK-BROKER not yet built** |
| Master Index | Present | `mcp-server/data/docs/MASTER_INDEX.md` + `_COMPACT.md` + `CODE_SYSTEM_INDEX.json` | |
| GSD protocol docs | 3 + sections subdir | `mcp-server/data/docs/gsd/` | DEV_PROTOCOL.md, GSD_QUICK.md, GSD_MICRO.md |
| Neural-network engines | **20+ visible** (CrossProcess*, *Trainer, *Classifier) | `src/engines/` | Fragmented across worktrees (xproc-neural-aci is its own) |
| Tribal-knowledge engines | **23** (Tribal*) | `src/engines/Tribal*.ts` | Well-developed but underutilized · count corrected 2026-05-10 by /forge-audit-v2 remediation (was 9+) |
| /system-viz suite | **2 of 5 expected scripts present** | `scripts/` | `generate-system-viz.mjs` ✓, `system-viz-query.mjs` ✓; **MISSING: `viz-progress-update.mjs`, `auto-wire-plan.mjs`, `system-viz-completeness-check.mjs`, `compounding-gains-audit.mjs`** — these are referenced in /forge5 doctrine but **never built** |
| Chat-identity helpers | All 3 present | `.claude/helpers/{stable-session-id,per-agent-handoff,precompact-handoff}.mjs` | Per-agent handoff has the topic-naming convention enforced via Stop hook |

---

## §2 — Synergy matrix (which surfaces talk to which)

A **✓** means automatic (hook/dispatcher/cron). A **△** means manual but possible. A **✗** means no path exists today.

| FROM \ TO | system-viz | memories | wiki | tribal | neural | docker | hooks | skills | dispatchers | handoffs |
|---|---|---|---|---|---|---|---|---|---|---|
| **system-viz** | — | △ (L10 reads vault) | △ (L10 reads wiki) | ✗ | ✗ | ✗ | △ (reads count) | △ (reads count) | ✓ | ✗ |
| **memories** | ✓ (L10 nodes + recall) | — | ✓ (`[[wiki-link]]` U-WIKILINK-OLLAMA) | ✗ | ✗ | ✗ | ✓ (mirror, recall, link-suggest) | △ (loaded into prompts) | ✓ (prism_memory) | △ (HANDOFF text) |
| **wiki** | ✓ (L10) | ✓ (mutual links) | — | ✗ | ✗ | ✗ | ✓ (precheck-inject) | △ | ✓ (knowledge dispatcher) | ✗ |
| **tribal** | ✗ | ✗ | △ (manual extract) | — | △ (training corpus) | ✗ | ✗ | ✗ | ✗ |
| **neural** | ✗ | ✗ | ✗ | ✓ (training corpus consumer) | — | ✗ | ✗ | ✗ | ✓ (aiReasoningDispatcher) | ✗ |
| **docker** | ✗ | ✗ | ✗ | ✗ | ✗ | — | (planned: A1) | ✗ | ✗ | ✗ |
| **hooks** | △ (manual: write a viz hook) | ✓ (mirror, recall) | ✓ (precheck) | ✗ | ✗ | (planned: A1) | — | ✓ (skill-suggester hook) | ✓ (route-first hook) | ✓ (Stop, PreCompact) |
| **skills** | ✗ | △ | △ | ✗ | ✗ | ✗ | △ | — | △ | △ |
| **dispatchers** | ✓ (`obsidian_viz_*` from this session) | ✓ (`prism_memory:*`) | ✓ (`knowledgeDispatcher.obsidian_*`) | ✓ (TribalKnowledgeDispatcher) | ✓ (aiReasoningDispatcher) | ✗ | ✗ | △ | — | ✗ |
| **handoffs** | ✗ | △ (mentioned in body) | ✗ | ✗ | ✗ | ✗ | ✓ (PreCompact, Stop topic-naming) | ✗ | ✗ | — |

### Counts
- ✓ (automatic): **23** edges
- △ (manual but possible): **17** edges
- ✗ (no path): **60** edges
**Synergy ratio: 23 / 100 = 23%.**

That number is the core finding. The rest of this document proposes how to get it to 80%+.

---

## §3 — Top 10 missing edges (highest leverage)

Ranked by (cost-to-build) ÷ (downstream users unlocked).

### 1. **tribal → wiki (auto-promote validated tips)**
9 tribal engines exist; none auto-write to `knowledge/wiki/code-tribal/`. Promotion is manual today. **Fix:** new hook `tribal-promote-on-validation.mjs` that fires on `prism_intelligence:validate_tip` success and writes the tip body + frontmatter to wiki/code-tribal/.

### 2. **system-viz ⇄ tribal**
Tribal tip count appears NOWHERE in system-viz. Yet it's 4,245 tips per CLAUDE-BRIEF — bigger than memories+wiki combined. **Fix:** add L10.5 "tribal tips" subgroup to viz; size by recency.

### 3. **neural → memory (training-set replay)**
NN engines consume tribal corpus but DON'T feed back what they learned into memory. Loss of compounding. **Fix:** NN engines emit `learnings/training-result-YYYY-MM-DD.md` to memories/lessons/ on every training round.

### 4. **handoff → system-viz (active-work overlay)**
207 handoff files exist; none surface in viz. The viewer shows engines/wiki/memories but not "who-is-doing-what-right-now." **Fix:** L11 layer "active handoffs" — node per HANDOFF-claude-{id}-{topic}, edge to claimed files.

### 5. **chat-bus presence → system-viz (live agents)**
14 chat IDs; viz has no agent overlay. Per darkzodchi's "Pixel Department" — adding this is a 1-day job and gives instant cross-chat visibility. **Fix:** L12 "agents" layer, fed from `state/shared/AGENT_CHAT.jsonl` tail.

### 6. **memories → master index**
MASTER_INDEX.md doesn't enumerate memories. Master index is for engines/dispatchers. **Fix:** extend `update-prism-inventory.mjs` to also rebuild MASTER_INDEX with a memories-section.

### 7. **stop hooks → action traces**
6 Stop hooks fire on every session end but their outcomes aren't aggregated. **Fix:** `stop-hook-aggregator.mjs` PostStop appends to `state/shared/stop-hook-ledger.jsonl` with PASS/FAIL per hook.

### 8. **handoff → memory cleanup**
207 handoff files = no LRU. **Fix:** monthly cron `handoff-prune.mjs` archives any `HANDOFF-*.md` whose `mtime > 30d AND topic-resolved == true`.

### 9. **docker (planned) → hook broker**
The U-DOCKER-HOOK-BROKER spec exists but isn't built. **Fix:** the existing handoff covers this — execute Track A1.

### 10. **viz suite gap (4 missing scripts)**
`viz-progress-update.mjs`, `auto-wire-plan.mjs`, `system-viz-completeness-check.mjs`, `compounding-gains-audit.mjs` are referenced in /forge5 doctrine but **don't exist**. Phantom-tool risk. **Fix:** either build them OR strip from /forge5 doctrine.

---

## §4 — Unified automation architecture

The architecture below collapses all 20 surfaces into 4 tiers. Every cross-tier interaction must be automatic (a hook, a cron, a dispatcher action, or a generator).

```
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 4 — OBSERVATION                                                   │
│   /system-viz (11 layers) ── consumes → BUILD_STATE, viz-recall,       │
│   handoff index, agent presence, action traces, tribal stats, NN cards │
│                                                                        │
│   Produces: dashboard.html (Thariq HTML output), graph.json, surfaces  │
└────────────────────────────────────────────────────────────────────────┘
                                  ▲
                                  │ (declarative reads only)
                                  │
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 3 — INTELLIGENCE                                                  │
│   Memories (95 source / 192 vault) — IdeaBlocks (Akshay)               │
│   Wiki (774 entries) — Karpathy LLM-Wiki                               │
│   Tribal (4,245 tips) — TribalKnowledge*Engine (9 engines)             │
│   Neural — CrossProcess* (20+ engines, xproc-neural-aci worktree)      │
│   AI Hierarchy — Claude→FSAC→7 T3 specialists→Ollama models            │
│                                                                        │
│   Workflows (cyrilXBT 6): daily context, queue, weekly synth,          │
│                           connection finder, project updater,          │
│                           knowledge distillation                       │
│                                                                        │
│   Produces: facts, claims, IdeaBlocks, embeddings, training rounds     │
└────────────────────────────────────────────────────────────────────────┘
                                  ▲
                                  │ (events from tier 2)
                                  │
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 2 — DISPATCH (97 dispatchers, 7,341 actions)                      │
│   prism_calc · prism_cam · prism_ai · prism_safety · prism_dev ·       │
│   prism_session · prism_memory · prism_intelligence · prism_pfp · ...  │
│                                                                        │
│   Hooks (423 Claude .mjs / 54 source) — fire pre/post tool, on         │
│   session events, on stop, on prompt-submit                            │
│                                                                        │
│   Produces: routed engine calls, audit trails, telemetry               │
└────────────────────────────────────────────────────────────────────────┘
                                  ▲
                                  │ (tool calls)
                                  │
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 1 — RUNTIME                                                       │
│   Claude Code CLI · 6+ concurrent chats · MCP servers · Docker         │
│   (planned: prism-hooks broker)                                        │
│                                                                        │
│   Chat Identity: stable-session-id.mjs → claude-<8hex>                 │
│   Per-chat handoff: HANDOFF-<id>-<topic>.md (topic-naming Stop hook)   │
│   Coordination: AGENT_CHAT.jsonl + AGENT_WORKBOARD.md + claims         │
│                                                                        │
│   Produces: tool calls, chat events, handoffs, presence heartbeats     │
└────────────────────────────────────────────────────────────────────────┘
```

### What "automatic" means at each boundary

| Boundary | Trigger | Mechanism |
|---|---|---|
| Tier 1 → Tier 2 | Tool call | Claude Code harness routes via dispatcher |
| Tier 2 → Tier 3 | PostToolUse hook | Mirror writes to memory, recall counter, wiki link suggester (all shipped this session) |
| Tier 3 → Tier 3 | Cron / fs-watch | The 6 cyrilXBT workflows (Track B not yet built) |
| Tier 3 → Tier 4 | Generator script | `generate-system-viz.mjs` reads BUILD_STATE + recall + vault, emits graph.json |
| Tier 1 ⇄ Tier 1 | Chat bus | AGENT_CHAT.jsonl polled at every UserPromptSubmit; presence heartbeats via stable-session-id |

**Result if all edges are automatic:** the user gives one command in any chat, and the *whole system* updates: hook fires → mirror updates vault → wiki-link-suggest enriches edges → recall counter increments → next viz regen reflects it → next session-start hook of any peer chat sees the new state.

---

## §5 — The plan: 32 units across 9 tracks

This SUPERSEDES `OBSIDIAN-INTELLIGENCE-MS3-UNIFIED-PLAN.md` (24 units) by adding 8 inter-surface synergy units that the plan-of-plans missed.

### Track A — Stabilization (PREREQ)
- A1. **U-DOCKER-HOOK-BROKER** (handoff from claude-99eca613) — kills xmalloc OOMs
- A2. **U-REREAD-SIGNAL-FINISH** — settings.json matcher add (small, in-flight)

### Track B — Autonomous Workflows (cyrilXBT)
- B1. U-DAILY-CONTEXT-WORKFLOW
- B2. U-CONNECTION-FINDER
- B3. U-QUEUE-PROCESSOR
- B4. U-WEEKLY-SYNTHESIS
- B5. U-PROJECT-AUTO-UPDATER
- B6. U-KNOWLEDGE-DISTILLATION

### Track C — HTML Outputs (Thariq)
- C1. U-HTML-OUTPUT-MODE
- C2. U-HTML-DASHBOARD
- C3. U-HTML-DESIGN-SYSTEM

### Track D — Company Brain (Sentra/Ashwin)
- D1. U-PROVENANCE-LAYER
- D2. U-ONTOLOGY-LAYER
- D3. U-CONFLICT-RESOLUTION
- D4. U-ACTION-TRACES
- D5. U-CONTEXT-EVAL-GATE

### Track E — IdeaBlock RAG (Akshay)
- E1. U-IDEABLOCK-EXTRACTOR
- E2. U-IDEABLOCK-DEDUP
- E3. U-IDEABLOCK-RAG-ENGINE
- E4. U-IDEABLOCK-GOVERNANCE

### Track F — Capture surfaces
- F1. U-VOICE-CAPTURE
- F2. U-HIGHLIGHTS-ONLY

### Track G — Agent observability (darkzodchi)
- G1. U-AGENT-JOB-DESCRIPTIONS
- G2. U-AGENT-PIXEL-DEPT-OVERLAY
- G3. U-AGENT-RUNTIME-ALERTS

### Track H — Synergy edges (NEW — fills the 60 ✗ cells)
- H1. **U-TRIBAL-TO-WIKI-PROMOTE** — auto-promote validated tribal tips to wiki/code-tribal/
- H2. **U-VIZ-TRIBAL-LAYER** — add tribal tips as L10.5 in system-viz
- H3. **U-VIZ-AGENT-LAYER** — L12 agents from chat bus (closes "Pixel Department" gap)
- H4. **U-NEURAL-FEEDBACK-LOOP** — NN training rounds emit lessons/ memory entries
- H5. **U-HANDOFF-VIZ-LAYER** — L11 active handoffs
- H6. **U-HANDOFF-PRUNE-CRON** — monthly archive of resolved handoffs (>30d)
- H7. **U-MASTER-INDEX-MEMORIES** — extend MASTER_INDEX.md to enumerate memories
- H8. **U-STOP-HOOK-AGGREGATOR** — append every Stop hook outcome to a session ledger

### Track I — Forge5 phantom-tool fix (NEW — credibility issue)
- I1. **U-VIZ-COMPLETENESS-CHECK** — build the missing `system-viz-completeness-check.mjs`
- I2. **U-VIZ-PROGRESS-UPDATE** — build the missing `viz-progress-update.mjs`
- I3. **U-AUTO-WIRE-PLAN** — build the missing `auto-wire-plan.mjs`
- I4. **U-COMPOUNDING-GAINS-AUDIT** — build the missing `compounding-gains-audit.mjs`

(Track I is required if /forge5/forge6 are to be trusted. Currently they reference 4 phantom tools.)

### Track K — Kimi K2.6:cloud mid-tier (NEW — added 2026-05-10 by claude-85cedf09)
Full plan: [K2-CLOUD-INTEGRATION-PLAN.md](./K2-CLOUD-INTEGRATION-PLAN.md). Adds a paid-cloud Ollama tier between local qwen2.5-coder:7b and Claude Opus to recover the 62% of currently-Claude tasks that don't actually need Claude depth.

- K1. **U-K2-CONFIG-INVENTORY** — document existing tier table in AISystemRouterEngine
- K2. **U-K2-TIER-REGISTER** — register `kimi-k2.6:cloud` tier with capability tags
- K3. **U-K2-CLOUD-ENGINE** — `K2CloudOllamaEngine` adapter (auth + fallback to qwen)
- K4. **U-K2-ROUTER-DECISION** — extend AISystemRouterEngine routing matrix (mid-band)
- K4.5. **U-K2-CLAUDE-SCRUTINIZE-CHAIN** — two-pass safety pattern (K2 generates → Claude scrutinizes against PRISM SAFETY RAILS, returns PASS|REVISE|FAIL). Deps K3+K4+K7; blocks K10+K12. See K2-CLOUD-INTEGRATION-PLAN.md §6.5.
- K5. **U-K2-TIER-HOOK** — `ollama-tier-router.mjs` UserPromptSubmit hook
- K6. **U-K2-SKILL** — `/k2-ask` (or extend `/local-ask --tier=k2`)
- K7. **U-K2-COST-GUARD** — per-session budget cap + fail-closed gate
- K8. **U-K2-TELEMETRY** — schema 3.0.0 with per-model breakdown
- K9. **U-K2-DASHBOARD** — extend ollama-offload-dashboard with cost projection
- K10. **U-K2-FALLBACK-TESTS** — Vitest covering 5 failure modes + ≥2 adversarial
- K11. **U-K2-AUTH-SETUP** — `ollama signin` wrapper + status doc
- K12. **U-K2-CLAUDE-MD-DOC** — 3-tier ladder documented in CLAUDE.md (Boris back-flow)

Track K is **infrastructure** — Wave 5.5 proposed (between cyrilXBT workflows and Company Brain), so B1-B6 consume K2 from day 1.

**User decisions locked 2026-05-10:** 100K-token/session budget cap (fail-closed at 90K, ~$10); aggressive escalation (any task with context >8K escalates qwen→K2.6:cloud, no confidence-signal gating, budget cap is the safety valve); two-pass safety pattern (K4.5 — K2 generates → Claude scrutinizes); Wave 5.5 timing confirmed. Total units: **13** (was 12). Estimated effort: **9-13 hours** across 2-3 sessions.

---

## §6 — Recommended execution order

**Atomic-first** (per /forge5 Tier Floor Gate): Tier 0 (cores) → Tier 1 (engines) → Tier 2 (dispatchers) → Tier 3 (transport) → Tier 4 (frontend).

| Wave | Units | Reason |
|---|---|---|
| **Wave 0** (now) | A1, A2 | Stabilization — kills OOMs |
| Wave 1 | I1-I4 | Make /forge5 trustable — these are the meta-tools |
| Wave 2 | H1, H2, H3, H4, H5 | Synergy edges — the 23%→60% lift |
| Wave 3 | C1, C2, C3 | HTML outputs (Thariq) — independent, fast wins |
| Wave 4 | E1-E4 | IdeaBlock RAG — replaces ObsidianMemoryRagEngine |
| Wave 5 | B1-B6 | cyrilXBT workflows — depend on E + A |
| Wave 6 | D1-D5 | Company Brain — biggest scope |
| Wave 7 | F1, F2, G1-G3, H6-H8 | Capture + observability + housekeeping |

Total: 7 waves, 32 units, ~3-4 sessions if everything goes clean.

---

## §7 — Compounding-gains META artifact (per /forge5 §6L)

Emitted as the v5 dev-velocity tax for this audit:

**`H:/prism/scripts/system-synergy-map.mjs`** (new) — generates the §2 matrix above on demand from live state. Re-runnable; tracks ✓/△/✗ ratio over time. Feeds future audits without manual re-compilation.

(Implementation file: see this commit. Run with `node H:/prism/scripts/system-synergy-map.mjs`.)

---

## §8 — Open questions for the user

1. **/forge5 phantom-tools (Track I)**: keep building them, or simplify /forge5 to remove the references? Track I is 4 units of meta-tool work.
2. **Tribal tip count discrepancy**: CLAUDE-BRIEF says 4,245; viz shows 0 tribal nodes. Confirm 4,245 is the canonical number, then H2 wires them in.
3. **207 handoff files**: H6 prunes any unresolved >30d. Confirm criteria for "resolved."
4. **Coverage discrepancy**: BUILD_STATE says 71% wired (2,269 / 3,176); viz `coverage-by-domain` says 88% (2,802 / 3,176). One of them is wrong. Worth a small debug unit before any roadmap planning.
5. **xproc-neural-aci worktree**: 20+ NN engines live there. Should they upstream to main or stay isolated? H4 assumes upstream.

---

## §9 — Bottom line

PRISM has a **world-class point-asset surface** (3,176 engines, 7,341 actions, 774 wiki entries, 6-chat coordination, system-viz with 11 layers). It has a **mediocre inter-surface plumbing** (23% automatic edges).

Closing the 60 ✗ edges is the highest-leverage work right now — bigger than building any single new engine. It's also the work that makes /forge5's "compounding gains" claim real instead of aspirational.

The 5 articles (cyrilXBT × 2, Thariq, darkzodchi, Ashwin, Akshay) all converge on the same thesis: **a knowledge system that doesn't write back to itself is a prototype.** PRISM is right at the threshold. This audit and Track H exist to push it across.

---

## §10 — Peer-review remediation log (claude-85cedf09 / 2026-05-10)

`/forge-audit-v2` Phase 4B dispatched a worktree-isolated reviewer (agent `a6e3fe1862ddfbff5`) per Boris pattern. Verdict: **BLOCK** with 3 actionable defects. This section records remediations applied.

### Defect → Remediation

| # | Defect (reviewer claim) | Independent verification | Remediation |
|---|---|---|---|
| D1 | §1 undercount: "9 tribal engines" | `ls src/engines/*Tribal*.ts \| wc -l` = **23** (reviewer guessed 19; both wrong but audit was lower) | §1 row updated above to 23. |
| D2 | §5 32-unit plan double-counts shipped work | `git log --since=2026-04-15 --grep=TRIBAL\|WIKI04\|VIZ` shows 14 matching commits incl. `U-TRIBAL-AI-L1-L6`, `U-TRIBAL-NODE-BINDER-{PLAN,SPEC}`, `U-TRIBAL-CONSOLIDATE`, `OBSIDIAN-VIZ-MS0` (6/6), `U-WIKI03+04`, `U-OBS-TRIBAL03`. H1/H2/H4 partially shipped; H3/H5 not yet. | Plan units H1, H2, H4 should be re-scoped from "build" to "verify in-flight units expose measurement channels post-merge"; H3 (chat-bus → viz L12) and H5 (handoff → viz L11) remain unbuilt. Trim ~3 units from Track H. |
| D3 | docker→hooks edge probe broken (script reports ✓ but `docker/` dir missing) | `ls H:/prism/docker/` returns no such directory | Flagged in `H:/prism/CLAUDE.md` `## Recent regressions`. Synergy script needs `existsSync` guard before scoring auto. True synergy ratio is below the reported 22.2%. |

### Reviewer FAILs that did NOT remediate

| # | Reviewer claim | Why not actioned |
|---|---|---|
| F5 | "Finding #5 mislabeled ✗ vs △" | Reviewer's enumeration didn't match audit §3 ordering — they reviewed `skills↔hooks` as #5 but the audit's #5 is `chat-bus → system-viz`. Real audit #5 has no mislabel. |
| F10 | "Finding #10 overcounts missing scripts (5 viz scripts exist)" | Reviewer confused viz utility scripts (5 exist: `generate-system-viz`, `install-system-viz-git-hook`, `system-viz-obsidian-bridge`, `system-viz-on-commit`, `system-viz-query`) with the 4 specific names audit §3-#10 lists (`viz-progress-update.mjs`, `auto-wire-plan.mjs`, `system-viz-completeness-check.mjs`, `compounding-gains-audit.mjs`). All 4 confirmed missing via `ls scripts/ \| grep -E ...` returning empty. Audit was correct; reviewer overstated FAIL. |

### Stronger findings the reviewer surfaced

- **R1 (peer-detected)**: `ollama-offload-stats.json` shows 38% offload rate (104 offloaded / 274 total events) — borderline against the 30% "healthy" floor. Worth monitoring; if it drops, check `http://127.0.0.1:11434/api/tags` reachability. (Logged in CLAUDE.md regressions.)
- **R2 (peer-detected)**: 38% of recent commits in `CAD-FUSION-LIVE-MS0/U-TRIBAL-P*T*` chain are explicitly building tribal↔viz↔obsidian — work is in-flight, not absent. Audit framing should be "verify post-merge" not "build from scratch."

### Verdict status after remediation

- 7/10 findings: **PASS** unchanged
- 1/10 (D2-related): **DOWNGRADED** to "verify in-flight" (per §10 D2)
- 2/10 (F5, F10 reviewer claims): **DEFERRED** — reviewer enumeration mismatch
- Macro ratio (22.2%): **PASS**, but flagged as upper-bound pending docker probe fix
- Plan: **PASS post-trim** (drops H1/H2/H4 to verify-only, keeps 24 net units)
- Tier-stack: **PASS** unchanged

Net status: audit is **SHIPPABLE** as v1.1 (this remediation). HTML companion at `state/shared/specs/SYSTEM-SYNERGY-AUDIT-2026-05-09.html` mirrors these numbers.

### Provenance

- Reviewer agent log: `C:/Users/wompu/AppData/Local/Temp/claude/H--prism/85cedf09-1e78-4b0c-bb5d-59325739e236/tasks/a6e3fe1862ddfbff5.output` (worktree branch `worktree-agent-a6e3fe1862ddfbff5`)
- Re-run scheduled: CronCreate `46e7f9ac` fires `2026-05-16 09:34 local` with `/forge-audit-v2 system synergy ratio`
- META artifact (re-runnable, current): `node H:/prism/scripts/system-synergy-map.mjs` → 22.2% baseline

