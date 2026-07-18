# Forge Audit — Token-Savings + Context-Extension PSN Coverage
## 2026-05-26 · slot:alpha (`claude-625e0262`) · /goal /loop 5m

> **Operator directive (verbatim):** "/system-viz full forge audit of everything we've built | look for dormant,
> inefficient, underutilized or never wired in token saving and context retention/extension nodes | track all
> articles I've sent in for upgrades to this entire system to assess if we built everything that would be beneficial
> | synergize all features to PSN + /system-viz"

This is the **third token-savings audit** PRISM has run (priors: juliett 2026-05-16 AUDIT-TOKEN-CONTEXT-MEMORY,
lima 2026-05-17 AUDIT-TOKEN-SAVINGS, juliett 2026-05-17 JULIETT-TOKEN-OPTIMIZATION). This audit:

1. Re-measures the prior baselines against live telemetry (10 days later).
2. Cross-references operator-sent articles (DataChaz X, Anthropic costs doc, TDS agentic-AI) against build state.
3. Inventories dormant/inefficient/underutilized/unwired nodes per the operator's 4 verdict axes.
4. Names the synergy gaps to PSN + /system-viz.

Verification doctrine per Boris #1 — every finding declares a re-runnable channel.

---

## Phase 0 — Live baselines (snapshot 2026-05-26T14:10Z)

| Surface | Current | Target | Δ vs 5/17 | Verdict |
|---|---|---|---|---|
| **MEMORY.md (C: auto-load)** | **24,421B** / 24,576B ceiling | <22,000B | improved 24,603→24,421 (-182B) | 🔴 P0 still critical (99.4% ceiling) |
| **CLAUDE.md (project)** | **73,987B** / 610 lines | <100KB / <400 lines | improved 115,521→73,987 (-41,534B, -36%) | 🟡 P1 (partial closure, still 3.7× Anthropic 200-line guide) |
| **Ollama offload rate** | **5%** (per token-zone inject) | ≥30% | regressed 9.6%→~5% (Ollama 100% skip — daemon dead) | 🔴 P0 worsened |
| **PSN savings aggregate** | 1,012 hits / 5,673 miss / **467k tokens saved** | n/a (passive) | new metric | 🟡 working but skewed (rtk = 99% of savings) |
| **mcp-route-suggest take-rate** | **5 / 2,160 = 0.2%** | ≥30% | new metric (post-TSP ship) | 🔴 P0 (TSP shipped 19 iters; nudges go unactioned) |
| **prompt-rewriter-ollama skip-rate** | **100%** (50/50, top reason `timeout`) | <20% | regressed from 9.6% offload | 🔴 P0 (Ollama `/api/chat` dead) |
| **read-auto-limit hit-rate** | 24 / 1,175 = 2.0% | ≥10% | new | 🟡 P1 |
| **rtk-adoption-measure hit-rate** | 0 / 2,469 = 0% | ≥5% | new | 🔴 dead ledger (or pattern unmatched) |
| **pre-tool-savings-multi hit-rate** | 0 hits / 114 nudges | ≥5% | new | 🔴 nudges fire, no measurable take |
| **rtk-savings-ledger hit-rate** | 934 / 806 miss = **53.7% hit / 467k saved** | n/a (already healthy) | working | 🟢 WORKING — single biggest live savings surface |
| **injection-dedup-cache** | 54 hits / 0 miss = **100%** | n/a | working | 🟢 WORKING |

**Headline:** Ollama is **dead** (`/api/chat` timeouts, 100% skip, daemon stuck). The biggest projected token-saving
surface (5/17 lima audit said "LARGEST single token-saving surface PRISM ships") is delivering zero. RTK is
the only live high-volume savings surface (467k saved over 4965 ledger entries). MCP-route-suggest fires
2,160× per session but only converts 5 → 0.2% take-rate — the operator's prior TOKEN-SAVINGS-PIVOT-MS0 (alpha, 5/22)
shipped the suggestion infrastructure but the suggestions themselves are unactionable noise (per the iter4 R12 finding
in TSP rollup).

---

## Phase 1 — Operator-sent articles inventory

Three article-class inputs are tracked in `knowledge/wiki/architecture/specs/`:

| Article | Date sent | Spec file | What was requested |
|---|---|---|---|
| **DataChaz X.com post 2055929...** (paywalled, 7+ visible hacks) | 2026-05-17 | `JULIETT-TOKEN-OPTIMIZATION-AUDIT-2026-05-17.md` | rewrite-don't-follow-up, cut-history-with-new-chats, merge-prompts, project-cache, default-user-memory, deactivate-search, route-easy-to-cheaper-models, +#8-10 truncated |
| **Anthropic costs doc** (`code.claude.com/docs/en/costs`) | 2026-05-17 | same spec | CLAUDE.md ≤200 lines, agent-teams ~7×, Sonnet for teammates, MCP deferred-by-default, skills on-demand |
| **TDS agentic-AI** (`Towards Data Science`) | 2026-05-17 | same spec | prompt-cache 90%, semantic-cache 68.8%, tool-search 55-134k drop, context-compaction 30-70%, subagent ~11% |
| **Anthropic prompt-caching docs** | 2026-05-16 | `AUDIT-TOKEN-CONTEXT-MEMORY-2026-05-16.md` | strict tools→system→messages prefix hierarchy, 4 cache_control breakpoints |
| **Claude Code subagent cost case study** (aicosts.ai 887k tok/min) | 2026-05-16 | same spec | reviewers default to parent model = Opus pricing explosion |
| **Anthropic Agent Skills progressive disclosure** | 2026-05-16 | same spec | stage-1 metadata always, stage-2 SKILL.md body on-trigger only |

**Note:** The 4th spec slug found via Glob (`spec-audit-token-savings-2026-05-17.md`) is the auto-generated wiki
stub for the lima audit; the real content lives at `state/shared/specs/AUDIT-TOKEN-SAVINGS-2026-05-17.md`.

---

## Phase 2 — Article → built mapping (gap table)

| Article ask | Built? | Where | Live effectiveness |
|---|---|---|---|
| Rewrite-don't-follow-up (CyrilXBT #1) | ✅ partial | `CLEAR-NOT-COMPACT` doctrine + handoff RESUME re-injection | Working (terminal-pin + auto-resume) |
| Cut history with new chats (#2) | ✅ | `/clear` + terminal-pin (slot survives /compact) | Working |
| Merge your prompts (#3) | ✅ | Karpathy R10 (checkpoint after every step) | Codified |
| Use Projects to cache docs (#4) | ✅ | CLAUDE.md (project) + skills (project-namespace) | Working |
| Default User Memory (#5) | ✅ | `H:/.claude/CLAUDE.md` | Working |
| Deactivate Search (#6) | ✅ N/A | PRISM doesn't expose web search in default loop | N/A |
| Route easy tasks to cheaper models (#7) | ⚠️ half-built | `model-router` skill + `ollama-task-offloader` | **5% offload — Ollama daemon dead** |
| Prompt caching (Anthropic) | ✅ automatic | Anthropic auto-caches | Working — `cache_read=16.95M` this session |
| **Semantic cache for repeated prompts** (TDS 68.8% claim) | ❌ NOT BUILT | proposed U-SEMANTIC-CACHE in juliett 5/17 §3 | **GAP — never shipped** |
| **Context-compaction targeted** (`/compact Focus on X`) | ❌ NOT BUILT | precompact-handoff.mjs is auto-write only | **GAP — operator-targeted compact not codified** |
| **CLAUDE.md ≤200 lines** | ⚠️ partial | 610 lines (was 700+) | **3.05× over ceiling** still |
| **Cap agent teams ≤10/iter** | ❌ NOT BUILT | proposed U-AGENT-TEAM-COST-CAP in juliett 5/17 §3 | **GAP — observed 25-agent rate-limit crash 5/17** |
| **Use Sonnet for reviewers** | ❌ NOT BUILT | reviewers still default to parent (Opus) | **GAP — per Phase 0 + juliett F4** |
| **Lazy-loading SKILL.md body** | ❌ NOT BUILT | all 440 skills loaded at SessionStart per F3 | **GAP — proposed PRISM_SKILL_LAZY_BODY=1** |
| **Cache-breakpoint hygiene** (per-turn injectors invalidate message cache) | ❌ NOT BUILT | 8 UserPromptSubmit injectors still per-turn | **GAP — was F1 in 5/16 audit; still re-emits static doctrine** |
| **MCP tools deferred-by-default** | ❓ unclear | 7,715 actions × 97 dispatchers; deferred-load posture unverified | **AUDIT GAP — needs probe** |
| **RTK filter wired** | ✅ shipped via TSP | rtk-savings-ledger 53.7% hit / 467k saved | Working — biggest live surface |
| **Hook preprocessing of verbose output** | ⚠️ partial | 513/523 hooks zero-fire (98.1%) | Hooks exist but most never fire |

**Net score:** ~6 article-asks fully built · 4 partial · **6 critical gaps NOT BUILT** · 1 audit-unknown.

---

## Phase 3 — Per-verdict node inventory (live)

### 3a. DORMANT (built but receives ~0 calls)

| Node / hook | Evidence | Root cause |
|---|---|---|
| `prompt-rewriter-ollama.mjs` | 50/50 skipped (100%), top reason `timeout` | Ollama `/api/chat` daemon dead |
| `rtk-adoption-measure` ledger | 0/2,469 hit-rate (0%) | Probably ledger format change broke pattern-match, or RTK CLI returns no signal here |
| `ollama-task-offloader` for `/`-prefix prompts | line 166 hard-skip | Slash-prompts (every /checkin /loop /forge) bypass router |
| `fleet-reaper-coordinator` offload routing | 440 fires, 0 offloaded, 440 suggested, 0 tokens saved | Suggestions never convert (per 5/17 lima audit F3) |
| `ollama-engine-api-extractor` | 2 fires lifetime | Narrowly-triggered hook, near-dead |
| 513 of 523 hooks (98.1% in 17-day window) | per lima 5/17 audit F-hook-zerofire | Wired-but-unmatched; pattern-coverage drift |

### 3b. INEFFICIENT (fires but wrong cost/value ratio)

| Node | Evidence |
|---|---|
| `error-pattern-promote` | 2,412 / 2,417 fires = **99.83% no-op** (only 4 drafted memories) — pure hook overhead |
| `mcp-route-suggest` | 2,160 fires, 5 take-ups = 0.2% take-rate — nudges go unactioned (post-TSP ship, this is unchanged) |
| 8 UserPromptSubmit static-doctrine injectors | per 5/16 juliett F1 — re-emit identical static content every turn, churning the message-level prompt cache 24×/turn |

### 3c. UNDERUTILIZED (built, partial uptake)

| Node | Current | Target |
|---|---|---|
| `mcp-route-suggest` | 0.2% take | ≥30% (Anthropic Tool-Search-style adoption) |
| `read-auto-limit` | 2.0% hit | ≥10% |
| Ollama offload categories | 3 (summary, cache-hit, explanation) | ≥8 (per 5/17 F2 R5 list) |
| TOKEN-SAVINGS-PIVOT-MS0 system-viz roost (`ghost.token_savings_pivot`) | 15 nodes, 1 take | Used by 0 follow-up consumers |
| `/system-viz` master-index pre-search | injects on every UserPromptSubmit | Take-rate not measured — possibly 0% (no take-up hook) |
| 440 skills via `skill-auto-trigger.mjs` | only 16% have auto-trigger frontmatter | full auto-trigger coverage |

### 3d. NEVER-WIRED (on disk, no dispatcher reference)

| Class | Count | Source |
|---|---|---|
| Unwired engines | **593** | `state/shared/AWARENESS-SNAPSHOT.md` |
| Orphan hooks on disk | **391** | Substrate health check |
| Hooks zero-fire 17d window | **513 of 523** (98.1%) | lima 5/17 audit |
| Wiki↔Memory broken links | **4,136 of 97,673** (4.2%) | Auto-injected per SessionStart |
| AI-memo coverage | 42.9% (4 of 7 PRISM-AI engines lack memos) | Auto-injected per SessionStart |
| **Semantic-cache engine** | 0 | Never built (juliett 5/17 §3 #2) |
| **Targeted-compact directive doctrine** | 0 | Never built |
| **Agent-team-cost-cap helper** | 0 | Never built (juliett 5/17 §3 #3) |
| **Lazy-body skill loader** | 0 | Never built (juliett 5/16 F3) |
| **Cache-breakpoint sweeper** | 0 | Never built (juliett 5/16 F1) |

---

## Phase 4 — Synergy targets (PSN + system-viz)

### PSN legs touched

| Leg | This audit lands in |
|---|---|
| Obsidian brain (#1) | `feedback_slot_bridge_hooks_disabled` (this session) + `reference_forge_audit_token_context_2026_05_26` (next, auto-fed on Stop) |
| Wiki (#3) | `knowledge/wiki/architecture/slot-bridge-hooks-disabled-2026-05-26.md` (this session) + an audit-rollup wiki entry |
| Memories (#4) | This spec is the durable artifact |
| System Viz (#6) | New ghost roost `ghost.forge_audit_token_context_2026_05_26` proposed in Phase 5 |
| Engines (#7) | 5 NOT-BUILT engines proposed as new units (semantic-cache, agent-cost-cap, cache-breakpoint-sweeper, lazy-skill-loader, targeted-compact-router) |
| NN/GNN (#10) | Untouched here — separate U-NN-PREDICTOR-EMBED-WIRE in flight |
| PRISM AI (#11) | Memo coverage gap (42.9%) is a separate axis |

### system-viz wiring

A generator (`scripts/generate-forge-audit-token-context-features.mjs`, proposed in Phase 5) will emit:

- 1 roost node: `ghost.forge_audit_token_context_2026_05_26`
- N child nodes (one per finding, color-coded by verdict: red=P0, amber=P1, green=working)
- Edges from each finding → the affected engine/hook/dashboard

Registration sites: `scripts/regen-viz.mjs` FAST[] + `scripts/merge-augmentations.mjs` splice (per the
TOKEN-SAVINGS-PIVOT-MS0 precedent in `generate-token-savings-pivot-features.mjs`).

---

## Phase 5 — Punch list (ranked by leverage)

| # | Unit | Verdict | Effort | Source-of-claim |
|---|---|---|---|---|
| 1 | **U-OLLAMA-DAEMON-REVIVE** — restart `/api/chat`, free GPU contention from NIM endpoints | P0 | S | live `/api/chat` 100% skip + lima 5/17 F3 + nim-gpu-capacity-ceiling memory |
| 2 | **U-MEMORY-MD-AUTO-PRUNE** — wire memory-size-watch from advisory → enforced auto-prune on Stop when ≥90% ceiling | P0 | S | 24,421/24,576B = 99.4% ceiling, regression line 5/16 |
| 3 | **U-CACHE-BREAKPOINT-SWEEPER** — move static portions of 8 UserPromptSubmit injectors to SessionStart | P0 | M | juliett 5/16 F1, never shipped |
| 4 | **U-AGENT-TEAM-COST-CAP** — enforce ≤10 Agent spawns/iter + default `model:"sonnet"` for reviewers | P0 | S | aicosts.ai 887k case-study + juliett 5/17 §3 #3 + juliett 5/16 F4 |
| 5 | **U-MCP-ROUTE-TAKE-RATE-FIX** — TSP shipped suggestions but 0.2% take; investigate root cause (suggestions structurally unactionable per TSP iter4 R12 finding) | P0 | M | live mcp-route-suggest-stats.json + TSP rollup §iter4 |
| 6 | **U-SEMANTIC-CACHE-FOR-PROMPTS** — embedding-cache repeated prompts (TDS 68.8% claim) | P1 | M | juliett 5/17 §3 #2 |
| 7 | **U-LAZY-SKILL-BODY** — gate stage-2 SKILL.md inclusion behind keyword-match in skill-auto-trigger | P1 | M | juliett 5/16 F3 + Anthropic Agent Skills progressive-disclosure |
| 8 | **U-CLAUDE-MD-EXTRACT-TO-SKILLS** — extract milestone sections to `.claude/commands/milestones/<ms>.md`; target ≤200 lines | P1 | M | juliett 5/17 §3 #1 + Anthropic costs doc |
| 9 | **U-TARGETED-COMPACT-DOCTRINE** — codify `/compact Focus on <X>` per Anthropic best-practice | P1 | S | juliett 5/17 §1 |
| 10 | **U-HOOK-ZERO-FIRE-PRUNE** — disable or rewire 513 zero-fire hooks (98.1% of wired hooks) | P1 | M | lima 5/17 + repeated audits |
| 11 | **U-PRE-TOOL-SAVINGS-CONVERT** — pre-tool-savings-multi fires 114 nudges with 0 hits; either deprecate or fix conversion | P2 | S | psn-savings-aggregate.json |
| 12 | **U-RTK-ADOPTION-LEDGER-REPAIR** — 0/2,469 hit means pattern broke; either fix or retire | P2 | S | psn-savings-aggregate.json |

---

## Phase 7 — Skills + Hooks inventory (added per operator follow-up 2026-05-26)

Operator follow-up: "look into skills and hooks as well since we built those for token savings too".
This phase inventories every skill and hook with a token-savings or context-extension purpose,
verdicts each per the same dormant/inefficient/underutilized/working axes.

### 7a. Skills for token-savings + context

| Skill | Purpose | Verdict | Live signal |
|---|---|---|---|
| `/rtk-setup` | Install RTK hook globally | 🟡 Underutilized | rtk-savings shows 53.7% hit but archive shows 65% "no hook installed" passthrough per lima 5/17 F1 — `rtk init -g` not run |
| `/context-budget` | Inspect per-session token zone | 🟢 Working | Token-zone inject fires every prompt; ~5% offload visible |
| `/token-budget` | Same family — per-team budget | ⚠️ Unknown live usage | Skill exists; no take-rate telemetry |
| `/token-dashboard` | Render per-day token spend | ⚠️ Unknown live usage | Skill exists; no take-rate telemetry |
| `/token-ledger` | Append to per-session ledger | ⚠️ Unknown live usage | Skill exists |
| `/route-suggest-stats` | Read mcp-route-suggest-stats sidecar | 🟢 Working | Shipped in TOKEN-SAVINGS-PIVOT-MS0; reads the 0.2%-take-rate sidecar |
| `/dont-reinvent` | Search PRISM engines/actions before writing new | 🟢 Working as designed | Triggered as needed per CLAUDE.md duplication-guard |
| `/dedup` | Same family — duplicate check | 🟢 Working | Cited extensively in CLAUDE.md doctrine |
| `/ref-first` | Search references before deriving | ⚠️ Unknown live usage | Skill exists |
| `/code-index` | Resolve E####/D##/A## shortcodes | ⚠️ Underutilized | DSL designed to save tokens but no operator-facing shortcuts in skill list |
| `/smart` `/smart-route` | AI-powered intelligent task routing | ⚠️ Unknown live usage | Skills exist; no router-take telemetry surfaced |
| `/model-router` | Pick optimal model per task | ⚠️ Half-built | Recommendation given but no auto-cascade per juliett 5/17 §1 |
| `/ollama-architecture-plan` `/ollama-bridge` `/ollama-route-check` | Ollama offload guidance | 🔴 Dependent on dead Ollama daemon | Live offload 5%; cannot route while `/api/chat` times out |
| `/memory-prune` | Trim MEMORY.md to ceiling | 🟡 Manual-trigger only | Memory size 99.4% ceiling — needs auto-fire per punch list #2 (U-MEMORY-MD-AUTO-PRUNE) |
| `/digest` `/digest-all` | Pre-compute compressed indexes | 🟢 Working | ENGINE_DIGEST + DISPATCHER_DIGEST + DIRECTORY_DIGEST referenced everywhere |
| `/slim` | Compress verbose output | ⚠️ Unknown live usage | Skill exists |
| `/precompact` | Auto-write handoff before /compact | 🟢 Working | This session ran across no compact-state loss |
| `/handoff` | Write per-chat handoff | 🟢 Working | Used every session |
| `/checkpoint` | Multi-step checkpoint per Karpathy R10 | 🟢 Working | Doctrinal anchor |
| `/skill-recall-tune` | Tune skill auto-trigger frontmatter | 🔴 Underutilized | 84% of 440 skills LACK auto-trigger frontmatter (lima 5/17 V2.1 P1-10) |
| `/skill-trigger-coverage` | Audit auto-trigger coverage | 🔴 Underutilized | Same gap; skill exists but coverage stuck at 16% |
| `/skill-lint` `/skill-test` `/skill-modernize` | Skill hygiene family | ⚠️ Unknown live usage | Skills exist; no batch-run telemetry |
| `/context-audit` `/context-integrity` | Audit context-build correctness | ⚠️ Unknown live usage | Skills exist; no live take-rate |

**Skills-axis findings:**
- **F-SKILL-1 (P1):** 84% of 440 skills lack auto-trigger frontmatter (per juliett 5/17 V2.1 P1-10). Stage-2 progressive disclosure can't activate without triggers. Already covered by punch-list #7 (U-LAZY-SKILL-BODY) but the wider trigger-coverage gap needs its own unit.
  → **NEW unit: U-SKILL-TRIGGER-COVERAGE-PUSH** — drive auto-trigger frontmatter coverage 16% → 80% across all 440 skills.
- **F-SKILL-2 (P2):** 7+ skills have no take-rate telemetry (token-budget, token-dashboard, model-router, smart, ref-first, slim, context-audit, etc.). Can't audit underutilization without measurement.
  → **NEW unit: U-SKILL-TAKE-RATE-LEDGER** — add fire-count + take-rate telemetry to the 7+ skills above (mirrors mcp-route-suggest pattern).

### 7b. Hooks for token-savings + context

Tier-by-tier classification of hooks PRISM ships for this purpose. Total: ~30+ hooks identified;
counts cross-checked against settings.json wiring.

| Hook (.mjs) | Event | Purpose | Verdict | Live signal |
|---|---|---|---|---|
| `mcp-route-suggest` | PreToolUse | Nudge to MCP action for token-save | 🔴 Inefficient | 0.2% take (5/2,160) |
| `mcp-route-takeup` | PostToolUse | Credit take-up | ⚠️ unknown | Paired with suggest |
| `rtk-archive-record` | PostToolUse | Record RTK fire to ledger | 🟢 Working | 467k saved |
| `rtk-savings-stop-rollup` | Stop | Daily rollup | 🟢 Working | rtk-savings-daily.json fresh |
| `rtk-adoption-measure` | PostToolUse | Adoption tracking | 🔴 Dead | 0 / 2,469 (pattern broke?) |
| `ollama-task-offloader` | UserPromptSubmit | Decide local vs Claude | 🔴 Inefficient | 5% offload (Ollama dead) |
| `ollama-auto-router` | UserPromptSubmit | Route prompt to Ollama | 🔴 Dead | 100% skip per dead daemon |
| `prompt-rewriter-ollama` | UserPromptSubmit | Rewrite prompts for cost | 🔴 Dead | 50/50 timeouts |
| `ollama-pipeline-injector` | UserPromptSubmit | Inject Ollama route on keyword | 🟡 dormant | depends on dead Ollama |
| `ollama-prewarm-on-pipeline` | UserPromptSubmit | Detached warm-up | 🟡 dormant | depends on dead Ollama |
| `read-auto-limit` | PreToolUse:Read | Suggest offset/limit for large reads | 🟡 Underutilized | 2% hit (24/1,175) |
| `pre-tool-savings-multi` | PreToolUse | Multi-axis savings nudge | 🔴 Inefficient | 0 hits / 114 nudges |
| `injection-dedup-cache` | UserPromptSubmit | Skip re-injecting unchanged blocks | 🟢 Working | 100% hit (54/0) |
| `prompt-context-inject` | UserPromptSubmit | Static doctrine inject | 🔴 Inefficient | 600B/turn churn per juliett 5/16 F1 |
| `master-index-precheck-inject` | UserPromptSubmit | Top-5 graph hits | ⚠️ unknown | No take-rate hook on this surface |
| `wiki-precheck-inject` | UserPromptSubmit | Top-3 wiki entries | ⚠️ unknown | No take-rate hook |
| `memory-relevance` | UserPromptSubmit + Edit/Write | Recall memos | 🟢 Working | recall-counter fires |
| `tribal-by-domain-inject` | UserPromptSubmit | Slot-domain tribal hits | ⚠️ unknown | No take-rate hook |
| `chat-bus-inject` | UserPromptSubmit | Peer activity | 🟢 Working | This session: 8 peer activity blocks |
| `psn-leg-state-inject` | UserPromptSubmit | 11-leg health | 🟢 Working | Surfacing NN/GNN ungraded |
| `slot-context-bundle-inject` | UserPromptSubmit | Per-slot soul + loop state | 🟢 Working | Visible every prompt |
| `error-pattern-promote` | PostToolUse | Capture error patterns | 🔴 Inefficient | 99.83% no-op (2,412/2,417) |
| `precompact-handoff` | PreCompact | Auto-write handoff | 🟢 Working | Confirmed via session continuity |
| `precompact-auto-trigger` | UserPromptSubmit | Compact-boundary fix | 🟢 Working | 1.43M false-positive class closed 5/15 |
| `session-start-auto-resume` | SessionStart matcher=compact | RESUME injection post-compact | 🟢 Working | Confirmed |
| `session-start-terminal-pin` | SessionStart all events | Slot↔window binding | 🟢 Working | Confirmed |
| `c-to-h-mirror` | PostToolUse Edit/Write | Replicate settings/hooks C:→H: | 🟢 Working | Mirrored my settings.json edits this session |
| `comprehensive-build-enforce` | PreToolUse | Block stub engines | 🟢 Working | Doctrine-enforced |
| `duplication-hard-block` | PreToolUse | Block duplicate creation | 🟢 Working | Surfacing this session |
| `inventory-check-guard` | UserPromptSubmit | Inject current counts | 🟢 Working | Visible at SessionStart |
| `ai-feature-recommend` | UserPromptSubmit | Recommend engines | ⚠️ unknown | No take-rate hook |
| `master-index-search-gate` | UserPromptSubmit | Fuzzy search existing assets | ⚠️ unknown | No take-rate hook |

**Hooks-axis findings:**
- **F-HOOK-1 (P0, already in punch-list #3 as cache-breakpoint-sweeper):** 8+ UserPromptSubmit injectors fire every turn with mostly-static content → message-cache churn 24×/turn.
- **F-HOOK-2 (P0):** 513/523 hooks zero-fire (98.1%) in 17-day window. Already punch-list #10 (U-HOOK-ZERO-FIRE-PRUNE).
- **F-HOOK-3 (P1 NEW):** 6+ inject hooks (master-index-precheck-inject, wiki-precheck-inject, tribal-by-domain-inject, ai-feature-recommend, master-index-search-gate, prompt-context-inject) have NO take-rate hook paired. Can't measure if injections convert into useful action.
  → **NEW unit: U-INJECT-TAKE-RATE-PAIRING** — add PostToolUse take-rate hooks for the 6 inject hooks above (model on mcp-route-takeup precedent).
- **F-HOOK-4 (P1 NEW):** Ollama-family hooks (auto-router, task-offloader, prompt-rewriter, pipeline-injector, prewarm) all blocked by dead daemon. Cluster fix would multiply leverage.
  → **NEW unit: U-OLLAMA-FAMILY-HEALTHCHECK-WRAPPER** — single PreSessionStart probe with graceful-degrade for all 5 Ollama hooks. Routes them to noop instead of hanging when daemon dead.

### 7c. Expanded punch-list adds (4 new units → 16 total)

| # | Unit | Verdict | Effort | Source |
|---|---|---|---|---|
| 13 | **U-SKILL-TRIGGER-COVERAGE-PUSH** | P1 | M | F-SKILL-1; lima 5/17 V2.1 P1-10 |
| 14 | **U-SKILL-TAKE-RATE-LEDGER** | P2 | M | F-SKILL-2 |
| 15 | **U-INJECT-TAKE-RATE-PAIRING** | P1 | M | F-HOOK-3 |
| 16 | **U-OLLAMA-FAMILY-HEALTHCHECK-WRAPPER** | P1 | S | F-HOOK-4 |

Punch-list total: 5 P0 + 7 P1 + 4 P2 = **16 items.**

---

## Phase 6 — Closed since prior audits (acknowledgement)

Not all 5/16-17 findings remain open. Verified-closed:

- **CLAUDE.md 115KB → 73KB** (-36%) per `reference_claude_md_compress_2026_05_20` (golf 5/20)
- **TOKEN-SAVINGS-PIVOT-MS0** shipped 19 iters (alpha 5/22) with full system-viz roost; the take-rate gap is a Phase 5 follow-up
- **RTK filter** is now the single biggest live savings surface (467k saved over 4965 ledger lines)
- **terminal-pin + auto-resume + precompact handoff** all working (this session ran across no compact-induced state loss)

---

## Acceptance criteria for closing this audit

1. ✅ Spec written (this file)
2. ⏳ Wiki sibling entry under `knowledge/wiki/architecture/` (next iter)
3. ⏳ Memory entry `reference_forge_audit_token_context_2026_05_26` (next iter)
4. ⏳ system-viz augmentation generator (Phase 5 follow-up; not blocking close)
5. ⏳ Punch-list items registered as candidate units in roadmap (follow-up)

---

## Verification one-liners

```bash
# Re-measure all 11 Phase-0 surfaces:
node scripts/token-savings-rank.mjs --json
node scripts/ollama-offload-dashboard.mjs --json
node scripts/system-synergy-map.mjs --json
node scripts/audit-hook-stack-cost.mjs --json
node scripts/audit-token-savings-coverage.mjs

# Verify a specific finding:
curl -m 5 -s http://localhost:11434/api/chat -d '{"model":"qwen2.5-coder:7b","messages":[{"role":"user","content":"hi"}]}'  # Ollama liveness
node -e "console.log(require('fs').statSync('C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md').size+' / 24576')"  # MEMORY.md size
node -e "const d=require('H:/prism/state/shared/dashboards/psn-savings-aggregate.json'); console.log(d.totals);"  # PSN aggregate
```
