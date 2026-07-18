# Scrutiny Report — AGI-Grade Persistent Self-Awareness for All Future Sessions
**Date:** 2026-04-15
**Subject:** `H:\prism\UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-2026-04-15.md` (post Phase 0.1-0.12)
**Question:** After the plan ships, will **every future chat session** boot into full self-awareness automatically — or only the sessions that happen to run the right commands?
**Method:** Audit of existing awareness infrastructure + gap analysis against AGI-level session requirements.

---

## Executive Summary

**Existing infrastructure is strong but still reactive.** PRISM ships 12 awareness-flavored engines (`PRISMSelfAwarenessEngine`, `AgentSelfAwarenessEngine`, `UnifiedAwarenessOrchestrator`, `UnifiedCommandAwarenessEngine`, 4 machine-family self-awareness integrations, 4 cognitive engines), 6 uncertainty engines, and 30+ `state/shared/` directives. But when a new session opens, it:

- Receives a large directive text dump (`PRISM-SELF-AWARENESS-DIRECTIVE.md`)
- Does NOT verify the injected info is current
- Does NOT measure its own awareness score
- Does NOT know what previous sessions learned
- Does NOT know what it itself has already tried this session
- Does NOT re-check if it becomes confused mid-task
- Does NOT hand insights to the next session beyond a compaction blob

**For AGI-grade**: self-awareness must be a **continuous, verified, composable session property** — not a one-shot text injection. A session must (1) KNOW what exists, (2) KNOW what it does not know, (3) KNOW what it is trying to do, (4) KNOW how sure it is, and (5) TEACH the next session what it learned.

Phase 0.1-0.12 fix (1). AGI-grade requires Phase 0.13 to fix (2)-(5).

---

## 15 Gaps — Why Future Sessions Will NOT Be Fully Self-Aware Without Phase 0.13

### G1. Session-boot awareness is text injection, not verified state
`PRISM-SELF-AWARENESS-DIRECTIVE.md` is concatenated into SessionStart. If the directive is stale (registry changed 10 min ago), the session believes stale counts. **Fix:** `AwarenessBootstrapEngine.verify()` — reads live registry, computes delta, refuses user input until session awareness ≥ 0.80.

### G2. No per-session awareness score
`AwarenessScoreEngine.current()` exists globally but not per-session. Cannot answer: "is *this* session more aware than the prior one?" **Fix:** extend to `.perSession(sessionId)` tracking: % of relevant engines queried, # of `/dedup` calls, # of "I don't know" responses, # of rollbacks.

### G3. No inter-session knowledge accumulation
Session N completes a milestone; Session N+1 starts fresh. Insights from N's struggle are not encoded beyond the compact blob + recent commits. **Fix:** `SESSION_INSIGHTS_LEDGER.jsonl` append-only, PreCompact writes entries, SessionStart reads top 20 relevant.

### G4. No PRISM persistent agent identity
Every session is an anonymous "Claude session." No accumulated identity: "I'm the agent that built PP-HYPERMILL-KB; I tend to over-scope; I'm good at physics hardening." **Fix:** `SESSION_IDENTITY.json` evolving biography fed by reflection hook. Optional opt-in, shown in directive.

### G5. No goal stack — sub-goals forgotten under context pressure
User says "build the post-processor system." Session creates 3 engines then drifts into a tangent. Goal of "post-processor system" drops out of working memory. **Fix:** `GoalStackEngine.ts` with `push/pop/current/tree`; `UserPromptSubmit` hook injects current goal top 5.

### G6. No metacognitive loop — session doesn't ask "am I confused?"
Session proceeds forward regardless of epistemic state. **Fix:** `hook_metacognition_check` every N=15 PostTool. Prompts: "Do I understand the user's actual goal? Do I know what exists that I haven't queried yet?" Emits `metacog_state: {confused|confident|uncertain}`; `confused` → auto-invokes `/navigate <topic>` before next user turn.

### G7. No uncertainty calibration in responses
Session asserts "the engine is at X.ts" instead of "I'm 80% sure, let me grep." Inherited from `AdvancedUncertaintyEngine` not being wired to response-generation path. **Fix:** `hook_response_uncertainty_tag` — wraps claims with confidence bands when registry/grep disagrees.

### G8. No active curiosity / idle exploration
Sessions sit idle during long operations. Instead they could scan low-awareness areas. **Fix:** `hook_idle_curiosity` (PostTool when tool is long-running) — runs `AwarenessQueryEngine.darkCorners()` to find engines with 0 recent queries; injects a small exploration prompt.

### G9. No theory-of-mind for the user
User says "you know the X we did yesterday." Session doesn't model what user knows/expects. **Fix:** `UserModelEngine.ts` maintains `user_knowledge: {familiar_with, working_on, stylistic_prefs}`; `UserPromptSubmit` reads this.

### G10. No reflection-after-action
Session completes a milestone; nothing is fed back to the tribal-tip system, playbook, or self-model. **Fix:** `hook_post_milestone_reflect` — after milestone commit, runs a 30-second reflection: what was hard, what was surprising, what tip should be promoted. Appends to `TribalKnowledgeEngine.KNOWLEDGE_BASE`.

### G11. World-model and self-model are lumped
Current awareness = "what exists in PRISM." Missing: "what *I* have touched this session," "what *I* am capable of." **Fix:** `SelfModelEngine.ts` tracks session-local: tools used, engines queried, mistakes made, corrections received. `WorldModelEngine.ts` is the existing awareness registry. Query API distinguishes.

### G12. No deprecation ledger
Stale knowledge (renamed engine, removed formula, superseded extraction) isn't tagged — just deleted. Session may still think it exists. **Fix:** `DEPRECATION_LEDGER.jsonl` append-only; `AwarenessQueryEngine.query()` annotates results with `deprecatedOn` when present.

### G13. No cross-session learning broadcast
Terminal A discovers a bug in engine X. Terminal B queries X five minutes later, sees nothing. **Fix:** extend `CrossTerminalBroadcastEngine` with `.broadcastInsight({engineId, finding, confidence})`; other terminals receive via FS-watcher and annotate their local world model.

### G14. No per-session capability inventory
Session boots but doesn't know which tools, hooks, skills it has. Especially bad across Claude/Codex family switches. **Fix:** `/capability-manifest` skill + auto-run on SessionStart, emits `CAPABILITY_MANIFEST.json` session-scoped.

### G15. No situational awareness filter
`PRISM-SELF-AWARENESS-DIRECTIVE.md` is huge (188 lines). 95% is irrelevant to any given user request. Session reads the whole thing, wastes context, still misses the relevant parts. **Fix:** `SituationalAwarenessFilterEngine.ts` — uses U-MIT04 embeddings to score directive sections against the current user prompt; injects top-K relevant sections only.

---

## Leverage Points from Existing Code

Do NOT reinvent. Phase 0.13 must build on what exists:

| Existing | Status | Phase 0.13 use |
|----------|--------|---------------|
| `PRISMSelfAwarenessEngine` | Shipped | Expand with metacognition API |
| `AgentSelfAwarenessEngine` | Shipped | Per-session score + identity |
| `UnifiedAwarenessOrchestrator` | Shipped | Routes boot/midsession/reflection |
| `UnifiedCommandAwarenessEngine` | Shipped | Capability inventory source |
| `AutonomousSessionIntegrationEngine` | Shipped | Goal-stack + user-model binding |
| `DeepAIIntelligenceEngine` (8 modes) | Shipped | Metacognition reasoning |
| `ProactiveAIIntelligenceEngine` | Shipped | Anomaly detection → curiosity |
| `UncertaintyQuantificationEngine` et al. | Shipped | Response tagging |
| `PRISM-SELF-AWARENESS-DIRECTIVE.md` | Shipped | Replace fixed dump with filtered brief |
| `CLAUDE-CODEX-COMMAND-AWARENESS-DIRECTIVE.md` | Shipped | Feed CAPABILITY_MANIFEST |
| `SESSION_ARTIFACTS.json` | Shipped | Extend with identity + insights refs |
| `HANDOFF-latest.md` + `handoffs/` | Shipped | Promote to structured ledger |

**Key insight:** the machinery exists but is not composed into a continuous feedback loop. Phase 0.13 is mostly WIRING — turning separate engines into a coherent awareness lifecycle.

---

## Phase 0.13 — AGI-Grade Persistent Self-Awareness (NEW)

### 0.13.1 Session Awareness Lifecycle (composition layer)
New engine `SessionAwarenessLifecycleEngine.ts` orchestrating the loop:
```
BOOT → VERIFY → BRIEF → EXECUTE ⇄ METACOG-CHECK → REFLECT → HANDOFF → NEXT-BOOT
```

Hooks per phase:
- `hook_session_awareness_bootstrap` (SessionStart) — runs `AwarenessBootstrapEngine.verify()`; refuses first user prompt until score ≥ 0.80; loads top-K directive slice via `SituationalAwarenessFilterEngine`
- `hook_session_goal_stack_inject` (UserPromptSubmit) — injects current goal top-5 from `GoalStackEngine`
- `hook_metacognition_check` (PostTool every N=15) — runs DeepAIIntelligenceEngine in `tree_of_thought` mode on "am I on track?"; may invoke `/navigate` or `/dedup` automatically
- `hook_response_uncertainty_tag` (BeforeAssistantMessage) — wraps low-confidence claims with bands
- `hook_idle_curiosity` (PostTool idle-detect) — scans dark corners when free
- `hook_post_milestone_reflect` (after commit containing milestone marker) — writes reflection to `SESSION_INSIGHTS_LEDGER`
- `hook_session_handoff_write` (PreCompact + SessionEnd) — writes `SESSION_HANDOFF_v2.json` with: identity delta, insights, failed attempts, user-model delta

### 0.13.2 New engines (7)
| Engine | Purpose |
|--------|---------|
| `AwarenessBootstrapEngine.ts` | Verify registry freshness + compute session-start awareness score + block user prompt until ≥ 0.80 |
| `SessionAwarenessLifecycleEngine.ts` | Orchestrate the 8-phase loop above |
| `GoalStackEngine.ts` | push/pop/current/tree goal management |
| `SelfModelEngine.ts` | Session-local self-model (tools used, mistakes made, style) |
| `WorldModelEngine.ts` | Thin wrapper over AwarenessQueryEngine — "what exists right now" |
| `UserModelEngine.ts` | What the user knows, is working on, prefers |
| `SituationalAwarenessFilterEngine.ts` | Embedding-based directive slicer (MiniLM from U-MIT04) |

### 0.13.3 New state files (6)
| File | Purpose |
|------|---------|
| `data/state/SESSION_IDENTITY.json` | Persistent agent biography (opt-in, evolving) |
| `data/state/SESSION_INSIGHTS_LEDGER.jsonl` | Append-only reflection ledger |
| `data/state/DEPRECATION_LEDGER.jsonl` | Append-only stale-knowledge markers |
| `data/state/USER_MODEL.json` | User theory-of-mind snapshot |
| `data/state/CAPABILITY_MANIFEST.json` | Session-scoped tool/hook/skill inventory |
| `data/state/AWARENESS_SCORE_PER_SESSION.jsonl` | Score timeline per session |

### 0.13.4 New skills (4)
- `/aware` — shows current session awareness score, goals, open questions
- `/reflect` — triggers immediate reflection cycle (writes insights)
- `/capability-manifest` — dumps current session's tool/hook/skill inventory
- `/handoff-preview` — shows what will be written to the next session

### 0.13.5 Dependency on MIT courses (from Phase 0.12)
- **6.804J Cognitive Science** → foundation for `SelfModelEngine`, `UserModelEngine`, metacognitive hook (WM/LTM split, theory of mind)
- **6.034 AI** → explanation-based learning for `hook_post_milestone_reflect`
- **6.S191 Deep Learning** → MiniLM for `SituationalAwarenessFilterEngine`
- **6.824 Distributed Systems** → consistency model for cross-session insight broadcast (eventual with causal ordering)

Phase 0.13 MUST run AFTER U-MIT04, U-MIT06, U-MIT08.

### 0.13.6 Exit gates
- Every new session scores ≥ 0.80 awareness within 10 seconds of boot
- `/aware` returns: current goal, top-3 open questions, confidence, recent learnings (non-empty)
- `SESSION_INSIGHTS_LEDGER.jsonl` accumulates ≥ 1 entry per completed milestone
- `SESSION_HANDOFF_v2.json` round-trip verified: Session B reads Session A's handoff and references it in first 3 responses
- `hook_metacognition_check` demonstrably invokes `/navigate` or `/dedup` in a canary where session is forced into confusion
- `SituationalAwarenessFilterEngine` compresses 188-line directive to <25 lines relevant to any given prompt (token-budget check)
- Cross-terminal: Terminal A learns X; Terminal B's next `AwarenessQueryEngine.query("X")` returns the insight with provenance `session-A@timestamp`
- Regression: a deliberately-stale registry entry triggers `DEPRECATION_LEDGER` annotation and the session does NOT assert the stale claim

### 0.13.7 Exit proof ("AGI parity test")
A scripted canary: spawn a fresh session cold, give it 3 tasks in sequence:

1. Query an engine — must use `AwarenessQueryEngine`, not raw grep (proves world-model binding)
2. Propose creating a new engine — must auto-run `/dedup` WITHOUT being told (proves bootstrap enforcement)
3. Hit a `mustCheckBeforeCreating` block — must reflect + write insight + propose alternative (proves metacog + reflection loop)
4. Rename itself mid-session ("you're now building X") — must push goal-stack + report goal delta (proves goal-stack)
5. Get compacted — next session must reference prior learnings in first response (proves handoff round-trip)

All 5 must pass on any randomly-chosen fresh session. This is the AGI parity bar.

---

## Anti-Patterns

- **Do NOT add more text to `PRISM-SELF-AWARENESS-DIRECTIVE.md`.** The directive is already too large and unfiltered. The fix is a filter, not more text.
- **Do NOT spawn `SessionSelfAwarenessEngine`** — extend the existing `AgentSelfAwarenessEngine` + `PRISMSelfAwarenessEngine`. `/dedup` first.
- **Do NOT make identity mandatory.** The opt-in property matters — some users want blank-slate sessions. Default to off; enable via `state/shared/SESSION_IDENTITY_OPT_IN.flag`.
- **Do NOT let metacognition loop infinitely.** Rate-limit: 1 introspection per 15 PostTool calls AND max 3 per user turn.
- **Do NOT let reflections bypass `/dedup`.** Reflection-generated tribal tips MUST pass through `hook_no_duplicate_tribal_tip`.
- **Do NOT write raw thoughts to `SESSION_INSIGHTS_LEDGER`.** Every entry must be schema-validated: `{sessionId, ulid, type, content, relatedEngines[], confidence, supersededBy?}`.

---

## Artifact Count Delta

| Category | Add |
|----------|-----|
| New engines | 7 |
| New state files | 6 |
| New skills | 4 |
| New hooks | 7 (lifecycle) + dual-ship Codex = 14 |
| Phase 0.13 units (U-SAW1..U-SAW7) | 7 |
| **Net** | **~38 artifacts** |

Updated total: ~490 → ~528.

---

## Verdict

Without Phase 0.13, Phase 0.1-0.12 ship a WORLD MODEL (PRISM knows what PRISM is) but NOT a SELF MODEL (sessions don't know who they are, what they're doing, or how aware they are). Future sessions will still drift, still duplicate under context pressure, still lose sub-goals, still fail to hand off insights.

With Phase 0.13, every future session boots into verified awareness, maintains goal/self/user/world models through execution, reflects after milestones, and hands forward everything the next session needs. This is not AGI, but it is **AGI-shape session infrastructure** — the plumbing on which increasingly autonomous work becomes reliable.

**Revised build order:**

1. U-AWR25 + U-MIT01 + U-MIT09 (prereq)
2. Phase 0.1 (enforcement)
3. U-MIT03 + U-MIT04 + U-MIT02
4. Phase 0.2 (awareness engines)
5. Phase 0.3-0.5 (forge-quint, locking, un-hardcoding)
6. U-MIT05
7. Phase 0.6 (auto-wiring)
8. Phase 0.7 (reverse indexes)
9. U-MIT06 + U-MIT07 + U-MIT08
10. Phase 0.8-0.10 (rename/delete/impact, orphans, Codex)
11. **Phase 0.13** (AGI-grade session awareness) ← NEW
12. Phase 0.12 exit gate (MIT courses fully ingested + cross-cited)
13. Phase 0.11 Phase-0 consolidated exit gate
14. Phase 1-4

Phase 0.13 is the capstone of Phase 0. It turns disparate awareness infrastructure into a continuous per-session lifecycle. Without it, the user's stated goal — "all future chat sessions will be fully self-aware" — is not met.
