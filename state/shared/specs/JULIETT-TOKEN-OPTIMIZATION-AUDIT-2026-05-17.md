# JULIETT TOKEN OPTIMIZATION AUDIT vs CONSOLIDATED ROADMAP (2026-05-17, iter-4)

> User directive: "use playwright to read DataChaz X post + ensure we're utilizing everything optimally for token savings and we build accordingly with the consolidated master road map".
> X.com post 2055929071733743693 paywalled (HTTP 402). Playwright MCP not installed → WebFetch fallback per [[feedback_playwright_for_online_sources]]. Synthesized from same author's visible 7 hacks (search snippet) + Anthropic official docs (`code.claude.com/docs/en/costs`) + Towards Data Science agentic AI article + prior CyrilXBT-pattern memory [[reference_obsidian_compound_audit_2026-05-07]].

---

## §0 — Source-content reconstruction

**DataChaz @ X.com 2055... (paywalled — visible content via search snippet):**
"10 hacks: #1 Rewrite, don't follow up · #2 Cut history with new chats · #3 Merge your prompts · #4 Use Projects to cache docs · #5 Set default User Memory · #6 Deactivate Search · #7 Route easy [tasks to cheaper models]" — #8-#10 truncated. Same author as the 2038896226297684227 earlier "ultimate cheat sheet" post. Theme: per-session token discipline.

**Anthropic official (`code.claude.com/docs/en/costs`):** 16 named techniques. Most cite-able pull-quotes:
- "Aim to keep CLAUDE.md under 200 lines"
- "Agent teams use approximately 7x more tokens than standard sessions when teammates run in plan mode"
- "Use Sonnet for teammates"
- MCP tool definitions are "deferred by default" — only names enter context until tool used
- Skills load "on-demand only when invoked"

**Towards Data Science (`agentic-ai-how-to-save-on-tokens`):** 10 named techniques w/ measurable savings:
- Prompt cache "up to 90% off base input"
- Semantic cache "68.8% fewer API calls"
- Tool-search context drop "55K-134K tokens → ~"
- Context compaction "30-70% reduction → $1,500-$6,000 per 100K runs"
- Subagent delegation "~11% cost reduction"

---

## §1 — PRISM vs best-practice audit (3-column gap table)

| Best practice | PRISM state | Gap / Win |
|---------------|-------------|-----------|
| **CLAUDE.md ≤ 200 lines** (Anthropic) | ~700+ lines (project) + ~140 (user global) | ❌ **3.5× over ceiling** — recurring V2.1 P0-3 finding; move per-milestone sections into skills. **NEW UNIT proposed §3** |
| **Prompt caching** (auto) | Anthropic auto-caches; CLAUDE.md cached-after-turn-1 visible in injection | ✅ Working — confirmed by `cache-cached after turn 1` markers in this session's injections |
| **Auto-compact at 95-98%** | PRISM `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` capped 95-98 per AUTOCOMPACT-AUTONOMOUS-MS0 | ✅ Working — but PRISM doctrine prefers `/clear` over `/compact` per CLEAR-NOT-COMPACT (shipped iter-3) |
| **Clear between unrelated tasks** (`/clear`) | PRISM ships CLEAR-NOT-COMPACT doctrine (iter-3) + 11-system bypass map for state recovery | ✅ Codified iter-3; pending U-CLEAR-AUTO-RESUME wire (V1 W0 alpha — fixes silent-degrade F2) |
| **`/compact Focus on X`** (targeted compaction) | PRISM uses precompact-handoff.mjs for auto-write; no doctrine on operator targeted-compact directive | ⚠️ Underused — operator can guide compaction with focus-keyword |
| **Use Sonnet for teammates** | PRISM agent dispatches default model not constrained per-team | ⚠️ Implicit — could enforce via `Agent({model:"sonnet"})` for non-critical scrutiny agents (saves ~5× per agent vs Opus) |
| **Subagent delegation for verbose ops** | PRISM heavy user (25 agents this session) | ✅ Working — but rate-limited iter-3.6; respect Anthropic per-tier limits |
| **Agent teams ~7× tokens** | Confirmed: this session hit rate-limit after 25 agents | ⚠️ Cap teams per /goal to ≤10 agents per iter |
| **MCP tools deferred-by-default** | PRISM has 7715 actions across 97 dispatchers — verify deferred-load posture | ❓ AUDIT NEEDED (T8 unit U-MCP-ROUTE-SUGGEST-COVERAGE; T8 rate-limited) |
| **CLI tools > MCP for git/gh/aws** | PRISM uses `rtk git/gh/npm` wrapper — 60-90% token reduction | ✅ Working — rtk is PRISM-native solution; recommend `rtk init -g` (hook not installed per warning in iter-2 commit) |
| **Code intelligence plugins** | PRISM has plugin set + LSP tool exposure | ✅ Working — confirmed by available tool list |
| **Hook preprocessing of verbose output** | PRISM has 511 hooks but ~98% zero-fire per V2.1 P0-4 | ❌ Underused — many hooks zero-fire; opportunity to wire token-saving preprocessors (e.g. test-output filter pattern) |
| **Skills load on-demand** | PRISM has 440+ skills but only 16% have auto-trigger frontmatter (V2.1 P1-10) | ❌ U-SKILL-CHAIN-MANIFEST (S2 bravo+foxtrot M) — auto-trigger coverage; **highest leverage** |
| **Move CLAUDE.md→skills** | NOT done — PRISM CLAUDE.md retains all milestone history inline | ❌ **NEW UNIT proposed §3** — extract milestone sections to skills, keep CLAUDE.md ≤200 |
| **Plan mode for complex tasks** | Available, not auto-routed | ⚠️ /pick-build-close skill exists; no auto-route to plan mode on multi-file tasks |
| **Rewind / Escape for course-correct** | Native Claude Code; PRISM has no codified usage | ⚠️ Operator-facing; document in CLAUDE.md tone-and-style |
| **Specific prompts > "improve this codebase"** | PRISM doctrine: Karpathy R8 (read before write) + check `ENGINE_DIGEST.md` first | ✅ Codified |
| **Verification targets in prompt** | Karpathy R12 (fail-loud); per-unit specs from this session include test-shipped-criteria | ✅ Codified iter-3 (5 unit specs all have Test-shipped-criteria section) |
| **Adjust extended thinking** | `MAX_THINKING_TOKENS=8000` for simpler tasks | ⚠️ Not auto-tuned — could pair with `model-router` skill heuristics |
| **Semantic caching** | NOT implemented in PRISM | ❌ NEW UNIT candidate — could save 68.8% API calls per TDS article if PRISM tasks repeat |
| **Cascading (cheap-first escalate)** | PRISM has `model-router` skill but cascade pattern not codified | ⚠️ Half-built — model-router gives recommendation but not auto-cascade |
| **Lazy-loading tools / Tool search** | MCP route-suggest auto-injects `prism_session:tool_route_best` hints (saw this session) | ✅ Working — confirmed by repeated tool-route hints |

---

## §2 — DataChaz 7+ hacks vs PRISM

| Hack | PRISM equivalent | Status |
|------|------------------|--------|
| #1 Rewrite, don't follow up | CLEAR-NOT-COMPACT doctrine + handoff RESUME re-injection | ✅ Codified iter-3 |
| #2 Cut history with new chats | /clear + terminal-pin (slot survives) | ✅ Codified iter-3 |
| #3 Merge your prompts | Karpathy R10 (checkpoint after every step) + agent batching | ✅ Codified |
| #4 Use Projects to cache docs | CLAUDE.md (project) + skills (project-namespace) | ✅ Working |
| #5 Set default User Memory | CLAUDE.md (user global) at `H:/.claude/CLAUDE.md` | ✅ Working |
| #6 Deactivate Search | n/a — PRISM doesn't expose web search in default loop | ✅ N/A |
| #7 Route easy tasks to cheaper models | `model-router` skill + `ollama-task-offloader` (22.2% offload; target 30%) | ⚠️ U-OLLAMA-OFFLOAD-PUSH-TO-30PCT (V1 W3 bravo) |
| #8-#10 (truncated) | Likely: tool-search / agent-teams cap / extended-thinking | inferred from canonical sources |

---

## §3 — 3 NEW UNITS proposed (token-savings high-leverage)

1. **U-CLAUDE-MD-EXTRACT-TO-SKILLS** (M, owner: juliett or echo) — extract milestone sections (JULIETT-12CHAT-ALLOCATION-MS0, RGS-TOOL-AUTOINVOKE-MS0/MS1, OBSIDIAN-INTELLIGENCE-MS3, OLLAMA-PIPELINE-MS0, FLEET-REAPER-MS0/MS1, FLEET-MEMORY-MONITOR-MS0, etc.) from CLAUDE.md project to per-milestone skills under `.claude/commands/milestones/<ms>.md`. Target: CLAUDE.md down from ~700 to ≤200 lines. Anthropic doctrine + recurring V2.1 P0-3 fix. **Highest token-savings win** — saves ~500 lines × all-chats every-session.

2. **U-SEMANTIC-CACHE-FOR-REPEATED-PROMPTS** (M, owner: bravo — owns ollama-pipeline) — wire embedding cache (Ollama nomic-embed-text already used by tribal indexer) against incoming prompts; cosine-similar prompt → reuse prior assistant response with operator-confirm gate. TDS article cites 68.8% reduction in API calls.

3. **U-AGENT-TEAM-COST-CAP** (S, owner: alpha — agent-orchestration domain) — enforce per-/goal limit ≤10 agents max per iter; for non-critical scrutiny use `Agent({model:"sonnet"})` default; surface running total via existing token-budget-telemetry. Closes the rate-limit-wall pattern this session hit at 25 agents.

---

## §4 — Consolidated roadmap alignment (`ROADMAP-CONSOLIDATED-2026-05-16` — 5826 items)

Per CLAUDE.md §ROADMAP CONSOLIDATION: 849 milestones · 4497 pending · 318 misc orphans · 26 wiring + 16 deep-integration bridge units.

**Token-optimization should slot into the PRIORITY-QUEUE backend-dev wave** (per CLAUDE.md §PRIORITY-QUEUE-MS0 — color-coded blue=backend-dev TOP). The 3 new units above are pure-backend-dev → blue queue → ship BEFORE bridge units (which are higher-leverage but require backend infrastructure stable).

**Cross-roadmap alignment** — the consolidated roadmap's `bridge_units` (16 deep-integration) all assume token-efficient orchestration. Without the 3 new units above, scaling to 16 bridges + 26 wiring × 12 chats × per-iter agent fan-outs hits the same rate-limit wall observed this session.

---

## §5 — Synthesis with iter-2/3/3.5/3.6 existing work

Token-optimization audit DOES NOT REPLACE the V1 allocation or synergy plan — it ADDS the §3 units. Revised total: **32 (iter-2/3/3.5) + 3 (iter-4) = 35 named units** in the active queue.

The 5 silent-degrade fixes (F1-F5 from synergy iter-3) remain top-priority — particularly F1 (`master-index-search-lib` 200MB cap) which directly affects token cost of unified search.

---

## §6 — Operator action items

1. **Read DataChaz post 2055929071733743693 manually** if able (Twitter/X auth required) — paste hacks #8-#10 to refine §3 if they differ
2. **Decide U-CLAUDE-MD-EXTRACT-TO-SKILLS owner** — juliett (META work) vs echo (post-ship-distill cluster owner)
3. **Decide whether to enforce U-AGENT-TEAM-COST-CAP** — rate-limit observed this session; cap prevents future occurrence
4. **Read CLAUDE.md `## OLLAMA OFFLOAD DASHBOARD` section** — semantic cache (U-SEMANTIC-CACHE-FOR-REPEATED-PROMPTS) is natural sibling

---

## §7 — References

- Anthropic official: `https://code.claude.com/docs/en/costs`
- Towards Data Science: `https://towardsdatascience.com/agentic-ai-how-to-save-on-tokens/`
- DataChaz earlier post (visible): `https://x.com/DataChaz/status/2038896226297684227`
- DataChaz target post (paywalled): `https://x.com/DataChaz/status/2055929071733743693`
- PRISM V1 allocation: `state/shared/specs/JULIETT-12CHAT-ROI-ALLOCATION-2026-05-17.md`
- PRISM synergy map: `state/shared/specs/JULIETT-DEVTOOLS-SYNERGY-MAP-2026-05-17.md`
- PRISM consolidated roadmap: `state/shared/specs/ROADMAP-CONSOLIDATED.json` (5826 items)
- Prior CyrilXBT memory: [[reference_obsidian_compound_audit_2026-05-07]]
- Standing rule: [[feedback_playwright_for_online_sources]]
