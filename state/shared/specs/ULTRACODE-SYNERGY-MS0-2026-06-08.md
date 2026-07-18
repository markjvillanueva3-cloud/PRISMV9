# ULTRACODE-SYNERGY-MS0 — ultracode sources × PRISM build

**Slot:** golf · **Session:** claude-d0133a03 · **Date:** 2026-06-08
**Method:** read 3 ultracode sources via Playwright → `/forge7` → dynamic Workflow (fan-out analyze + adversarial verify + synthesize, 15 agents) → build golf-owned units, spec cross-slot units.
**Verification:** every gap was adversarially re-verified (a 2nd agent that never saw the analyst's reasoning, prompted to REFUTE the gap). 2 of 11 proposed gaps were refuted as already-covered.

---

## Sources (read live, login-walled via `document.body.innerText`)

| # | Source | Thesis |
|---|--------|--------|
| 1 | [@_avichawla 2049037299334472015](https://x.com/_avichawla/status/2049037299334472015) | RL evolution RLHF→GRPO/RLVR→**RULER**: LLM-as-judge ranks N trajectories *relatively* against the **system prompt as reward spec**. Anthropic Constitutional AI + OpenAI Universal Verifiers + Karpathy "system prompt learning" converge here. |
| 2 | [@0x_rody 2063295395434831922](https://x.com/0x_rody/status/2063295395434831922) | **4-layer honesty setup**: (1) CLAUDE.md honesty rules + "I don't know" license, (2) verify-before-write, (3) PostToolUse type/test hooks, (4) **fact-checker subagent**. |
| 3 | [@0xCodez 2062127385923776831](https://x.com/0xCodez/status/2062127385923776831) | **Dynamic Workflows / `ultracode`**: Claude writes its own JS harness. 6 patterns (classify-act, fan-out-synthesize, adversarial-verify, generate-filter, **tournament**, loop-until-done) + **quarantine** for untrusted input. Solves 3 single-context failure modes: agentic-laziness, self-preferential-bias, goal-drift. |

---

## Verdict: 17 of 28 patterns ALREADY HAVE · 9 confirmed gaps · 2 refuted

PRISM is **ahead** of these sources on orchestration + RL infrastructure. The gaps cluster in two seams PRISM never closed:
1. **RL training spine** — has reward-shapers + experience ledger, but no group-relative-across-N advantage normalizer (GRPO) nor LLM-judge relative-reward mode (RULER).
2. **Conversational anti-fabrication** — R12 is fail-loud on *build outcomes*, but no read-every-turn honesty doctrine, no self-claim fact-checker, no untrusted-content quarantine.

### Already HAVE (no action — verifier-confirmed)
- `agent()`/`parallel()`/`pipeline()` + all 6 workflow patterns (the `Workflow` tool itself).
- 3 failure-mode guards: agentic-laziness (`always-build-guard`, `comprehensive-build-enforce`, ~30 `stop_on_*`); goal-drift (`goal-complete-gate` + 8 `*drift*` hooks + `enforce-context-retention`); self-preferential-bias (`scrutiny-3way` independent arms + per-file 2-arm gate).
- LLM-as-judge / relative-ranking: 14+ `Consensus*` engines incl. `MultiModelConsensusEngine.ask()`, `ConsensusFactCheckerEngine`, `ConsensusQuorumEngine`; reward-shapers `CrossProcessRewardShaperEngine`/`WEDMRewardShapingEngine`/`LatheLoRARewardShapingEngine`.
- Layer-3 hooks: `enforce-eslint-after-edit`, `stop_on_failing_tests`, `stop_on_build_error`. `/goal`+`/loop` pairing + token budgets.

### Refuted (verifier found existing prior-art — NOT built)
- **plan-mode-for->1-file** → covered by `enforce-plan-before-build.py`.
- **c-to-h-mirror coverage for `.claude/workflows/`** → already covered (exclude-by-denylist; the C: absence is the documented one-way direction).

---

## Build plan (dependency-ordered, R13) — ALL 8 ORDERS SHIPPED (golf, 2026-06-08)
> UPDATE 2026-06-08: orders 3/4/5 (originally spec'd for india/sierra) were built by golf this
> session since the operator directed continued builds. Commits: GRPO `037e3ac930`+`3fa529432f`,
> RULER `46553bb74a`, fact-checker `.claude/agents/fact-checker.md` (gitignored, on-disk). The
> Order-8 quarantine SINK-WIRING (3 intake engines set the marker) remains the deferred [SCOPED]
> follow-on. The original `📋 SPEC` rows below are kept for the detailed build specs.

| order | unit | effort | owner | status |
|---|---|---|---|---|
| 1 | HONESTY RULES block in CLAUDE.md (I-don't-know license + verify-symbol + // UNVERIFIED) | XS | golf | ✅ SHIPPED |
| 2 | verify-before-write sentence (same block) | XS | golf | ✅ SHIPPED |
| 6 | `tournament-rank.mjs` workflow template (Pattern 9) | XS | golf | ✅ SHIPPED |
| 8 | `intake-quarantine-guard.mjs` PreToolUse (Pattern 13) | M | golf+compliance | ✅ SHIPPED+WIRED |
| 7 | `/save-workflow` skill (workflow→Skill bridge, Pattern 14) | S | golf | ✅ SHIPPED |
| 3 | `GroupRelativeRewardNormalizerEngine` (GRPO) | S | **india** | 📋 SPEC (below) |
| 4 | `rankTrajectories` RULER mode on MultiModelConsensusEngine | S | **india** | 📋 SPEC (below) |
| 5 | `fact-checker.md` conversational-claim agent | S | **sierra** | 📋 SPEC (below) |

### Golf deliverables (this session)
- `C:/Users/wompu/.claude/CLAUDE.md` §HONESTY RULES (lines ~40-46, first-50 per source-2 placement rule) — mirrored to H:, byte-identical.
- `.claude/workflows/tournament-rank.mjs` + `.test.mjs` — **6/6** tests (caught a real bracket-champion≠most-wins bug in single-elimination; fixed).
- `.claude/hooks/intake-quarantine-guard.mjs` + `.test.mjs` — **17/17** unit + **4** live PreToolUse integration; WIRED at PreToolUse[16] (both C:+H:, 28 blocks).
- `.claude/commands/save-workflow.md` — wraps `/forge-skills`.

---

## Cross-slot specs (ready to build — clone-don't-fork; R8 = peer territory, not edited blind)

### Order 3 — `GroupRelativeRewardNormalizerEngine` (owner: india / ai-training galaxy) [S]
The GRPO baseline-subtraction nothing in PRISM implements. Verifier confirmed `PolicyExperienceLedgerEngine.normalized_z_score` is categorically different (per-objective across its own distribution, NOT N-trajectories-of-one-prompt against shared group mean/std).
- **Build:** ~80-line PURE fn. Input: N scalar rewards (sourced from EXISTING `CrossProcess`/`WEDM`/`Lathe` shapers + `PolicyExperienceLedgerEngine.reward_total` — do NOT rebuild shaping). Output: within-group z-scored advantages + **rank-normalized fallback for degenerate std≈0**.
- **Wire:** dispatcher action `prism_ai:group_normalize_reward`. Add optional `group_advantage` field to `PolicyExperienceLedgerEngine` (no schema break of the existing per-objective z-score → GRPO-ready ledger).
- **Verify (Phase 0.7):** 16-sample group → mean≈0 (±1e-9), std≈1, order-preservation vs raw, constant-group edge (std=0 → all-zero advantages, NO NaN). Round-trip E2E through `prism_ai:group_normalize_reward` (not the singleton). `npx vitest run`.
- **PSN:** strengthens leg #10 (NN/GNN) + the self-improving-AI substrate — gives the GraphSAGE tier-5 retrain a critic-free advantage signal.

### Order 4 — `rankTrajectories` RULER mode on `MultiModelConsensusEngine` (owner: india) [S]
A missing MODE, not a new engine (DuplicationGuard would flag overlap). Consumes order-3 output.
- **Build:** `rankTrajectories(trajectories[], systemPrompt)` reusing `.ask()` + cloning `SFCMultiHypothesisRankerEngine`'s decomposed-reward+Brier-confidence pattern → normalized relative 0-1 reward per trajectory. **DEFAULT the judge rubric to the active system prompt when no explicit spec is passed** (folds in the RULER system-prompt-as-reward XS sub-gap + wiki note `[[ruler-system-prompt-as-reward]]`).
- **Wire:** dispatcher action on `prism_ai` (aiReasoningDispatcher).
- **Verify (Phase 0.7):** 3-failure-mode test (degenerate-identical-trajectories → equal rewards, no NaN; single-trajectory → 1.0/no-op; judge-disagreement → spread>0). **R12 GATE:** real-data validation that the reward vector MOVES a downstream policy (feed `CrossProcessPolicyGradientEngine` + order-3 normalizer; assert the advantage tensor changes the gradient step) — not "looks ranked."
- **PSN:** strengthens leg #11 (PRISM AI routing) — lets the consensus surface score non-verifiable domains (RAG/support/summarization), feeding `aiSystemRouterEngine` relative-reward it lacks.

### Order 5 — `.claude/agents/fact-checker.md` conversational-claim verifier (owner: sierra / agent-orchestration) [S]
Distinct from `verifier.md` (tests/wiring only) and `ConsensusFactCheckerEngine` (external consensus-model answers, 2 token classes). Scope: Claude's OWN conversational assertions before commits/summaries.
- **Build:** agent file (model sonnet, tools Read/Grep/Glob/Bash). Extract every load-bearing claim from THE CONVERSATION → verify independently → `VERIFIED(file:line)` / `WRONG(truth)` / `UNVERIFIABLE(why)`; reject trust-me. **REUSE `ConsensusFactCheckerEngine`'s allowlist (ENGINE_DIGEST + dispatcher enum) for identifier-class claims** so the two layers compound not fork. Add ONE pointer line in the CLAUDE.md HONESTY RULES block (order 1).
- **Wire:** advisory invocation before commits + user-facing summaries (mention in `/forge-go` / commit flow).
- **Verify (Phase 0.7):** seed a conversation with 1 true claim (real engine + file:line), 1 false (invented `prism_*:action`), 1 unverifiable → assert VERIFIED/WRONG/UNVERIFIABLE respectively; confirm it imports the allowlist (grep the agent prompt), not a re-tokenized list.
- **PSN:** strengthens leg #1 (Obsidian brain) — guards hallucinated engine names before they enshrine into cross-session memory (the `[[asset-hallucination-class]]` failure mode).

### Order 8 — [SCOPED] residual (scrutiny-surfaced, accepted)
The quarantine guard is **single-agent defense-in-depth**, not complete egress coverage:
- **Denylist egress is porous by nature** — the `bashDanger` set now catches the common exfil forms (curl/wget/nc, `node -e`/`python -c`/interpreter one-liners with socket/fetch APIs, `cp`/`mv` of cred dotfiles incl. `id_rsa`/`.aws`/`.ssh`/`.npmrc`, `$*_KEY`/`$*_SECRET` env exfil, `iex`/`Invoke-Expression`, `ssh < file`, base64|pipe). A novel interpreter or an in-sandbox-write-then-ship-by-a-trusted-process still slips. The COMPLETE fix is the reader/actor dual-agent privilege split (deferred follow-on) — denylist tightening is the [SCOPED] increment.
- **Session-id keying is the trust anchor** — the gate fires only if the intake processor writes `state/shared/quarantine/<session>.json` under the SAME id the PreToolUse event carries as `session_id`. The sink-wiring unit below must use the live PreToolUse session id (round-trip E2E, not just the `decide()` unit test) or the marker is invisible and untrusted sessions silently pass.

### Order 8 follow-on (deferred [SCOPED]) — quarantine sink-wiring (owner: golf + compliance-safety)
The `intake-quarantine-guard.mjs` hook ships THIS session. Remaining: have the 3 intake sinks SET the marker `state/shared/quarantine/<session>.json {source, ts, scanned:false}` on ingest:
- `IntakeArtifactProcessorEngine`, `emailIntakeSingleton`, `IntakeWebhookEngine`.
- And wire `aidefence_scan`/`has_pii`/`is_safe` (claude-flow HARVEST) at the S(x) gate to flip `scanned:true, scanVerdict.safe`.
- The full reader/actor dual-agent privilege split is a further [SCOPED] follow-on.

---

## PSN synergy summary
- **legs #10/#11** (NN/GNN + PRISM AI): GRPO normalizer + RULER reward mode → critic-free advantage signal for the tier-5 retrain + non-verifiable-domain scoring.
- **legs #2/#3** (PRISM OS doctrine + Wiki): HONESTY RULES read-every-turn + `[[ruler-system-prompt-as-reward]]` → anti-fabrication slice R12 left open across all 26 slots.
- **leg #1** (Obsidian brain): fact-checker guards self-claims before memory enshrinement.
- **leg #6** (System Viz / workflow substrate): tournament template + save-workflow bridge → ultracode patterns become compounding fleet assets, not per-task one-offs.
- **leg #2** (PRISM OS / S(x) safety): quarantine guard installs the missing trust-boundary on untrusted INPUT (orthogonal to the review gates that govern OUTPUT) — closes the self-documented ZERO-PII-gate-on-intake gap.
