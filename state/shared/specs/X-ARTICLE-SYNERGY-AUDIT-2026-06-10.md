# X-Article Doctrine Synergy Audit — 2026-06-10 (slot:golf)

> Goal (operator /goal): compile all X-articles sent across sessions, assess whether each is
> optimally applied, and verify the full system is synergized — no conflicts, gaps, dormant
> builds, or unwired enforcement. Method: ultracode Workflow — 5 doctrine-cluster audit agents
> + 1 synthesis (6 agents, 1.1M subagent tokens), findings re-verified by golf at the synthesis
> layer (R12). Advisory; `mustHumanVerify` on the wiring actions (high blast radius).

## Verdict
**MOSTLY synergized.** The doctrine is comprehensively *documented* and the highest-value
patterns (CAG cold-cache, Bibryam Domain-Galaxy) are genuinely wired + test-passing. The real
gap is **enforcement depth**: several named build-discipline gates exist on disk but have 0
*direct* settings.json refs. NOT all are functionally dormant (some doctrine reaches the agent
via differently-named injectors) — the verified-dormant items are the two Stop hard-blocks.

## Doctrine application matrix
| X-source | Status | Strongest evidence |
|---|---|---|
| @Mnilax R5–R15 | PARTIAL | R8/R10/R14 wired (`stop-close-own-bg-tasks.mjs` @ C:settings.json:713); R12/R13 advisory-only; R15 enforcer dormant |
| @0x_rody honesty + Karpathy | MIXED (audit over-claimed) | `fact-checker.md` exists (manual-invoke). Karpathy IS injected live via "★ Operating Rules" — NOT the `karpathy-discipline-inject` filename the audit checked. Honesty block is global-CLAUDE-only, absent from checked-in `H:/prism/CLAUDE.md` |
| shann/Huryn/Buzovskyi/Martin/Opik (agent-loop) | PARTIAL | Opik self-repair wired (`regression-lock-audit.mjs`, 8971770e3); /loop eval-gate is self-reported string, not verified |
| @akshay_pachaar CAG cold-cache | APPLIED ✓ | `cag-cold-cache-anchor.mjs` SessionStart @ settings.json:344 + `cag-router-inject` @ :1257; 21/21 tests pass |
| Bibryam Domain-Galaxy | APPLIED (P1) ✓ | 34/34 galaxy `CLAUDE.md` sentinels exist; P2/P3/P4 dormant |

## VERIFIED dormant (golf re-ran the grep — 0 direct refs in BOTH settings.json)
- `stop_on_unwired_assets.mjs` — R15 orphan hard-block · **owner golf** · CLAUDE.md:63 cites it as ACTIVE (false-confidence)
- `stop_on_failing_tests.mjs` — R9 test backstop · **owner golf**
- `prompt-rules-inject` / `karpathy-discipline-inject` / `enforce-plan-before-build` / `enforce-auto-compact` — 0 direct refs, BUT some doctrine reaches the agent via other emitters → "0 refs" ≠ "dormant"; needs a bundle-grep before concluding (R12 caveat — NOT yet done)

## CONFLICTS (R7 — false-confidence, not logic forks)
- `CLAUDE.md:63` asserts `stop_on_unwired_assets` is the active "no-orphans" hard-block — it does not fire (doc-vs-state contradiction).
- `CLAUDE.md` §DOMAIN-GALAXY claims "5 of 5 sentinels" — actually 34/34 (stale by 29).
- No genuine pattern-vs-pattern conflict found.

## DEEPER FINDING (2026-06-10, golf — beyond the original audit)
Wiring `stop_on_unwired_assets` is **theater unless a deliberate env flag is also lifted.** `PRISM_ALLOW_UNWIRED=1` is set in BOTH settings.json `env` blocks (line 45) — the hook's line-360 first-line escape hatch. It is part of the **2026-05-24 YOLO-bypass cluster** (siblings: `PRISM_GOAL_GATE_AUDIT_BYPASS`, `PRISM_GOLF_WRITE_ALLOWLIST_BYPASS`, `PRISM_MAINTREE_WRITE_BLOCK_DISABLE`) and the hook has a **known false-positive history** ([[reference_stop_unwired_assets_false_positive_2026_05_23]]). So R15-enforce (wire the orphan-block) **directly conflicts with the operator's standing YOLO-autonomy posture** (R7) — only the operator resolves which wins.
- Hook is now PROVEN to enforce when the flag is off: `.claude/hooks/__tests__/stop_on_unwired_assets.wiring.test.mjs` 4/4 (orphan→BLOCK, clean→approve, flag-on→approve). Ready to arm.

## Prioritized punch-list
1. **[OPERATOR DECISION — R7 conflict]** To genuinely apply R15's orphan-block: (a) remove `PRISM_ALLOW_UNWIRED=1` from both settings.json env blocks AND (b) add `stop_on_unwired_assets.mjs` to the Stop block (after `stop-close-own-bg-tasks` @ C:settings.json:715). This re-enables enforcement fleet-wide + re-exposes the known false-positive bug → operator go/no-go. The hook is transcript-scoped (only NEW engines this session), so it will NOT wedge on the 89 pre-existing orphans. `stop_on_failing_tests` stays gated on a real fresh full-suite green baseline (current `VITEST_REPORT.json` is a 42-day 33-test stub).
2. **[india + golf]** Convert /loop eval-gate from self-reported `--status` string to a real per-iter test/scrutiny gate (`loop-state.mjs` cmdTick). Stops the "slop machine."
3. **[alpha]** Confirm whether the Karpathy/honesty pre-coding doctrine reaches the agent (it does — "★ Operating Rules"); if so, the audit's "dormant" verdict is moot — just reconcile the filename. Add honesty block to checked-in `H:/prism/CLAUDE.md`.
4. **[golf — safe, doc-only]** Correct `CLAUDE.md:63` (R15 enforcer is advisory until #1) and the "5/5"→"34/34" sentinel count. Removes false-confidence.
5. **[alpha/sierra]** Emit `pathGlob` frontmatter on galaxy-scoped skills to activate Bibryam P3 (extractor parses it; 0 consumers today).

## R12 caveats (what is NOT proven)
- "0 direct settings refs" is verified; "fires via a bundle wrapper" is NOT checked for items 3–6 of the dormant list. Karpathy is demonstrably live, so do a bundle-grep before calling the inject hooks dead.
- Items 1–4 wiring actions are `mustHumanVerify` — high blast radius, operator go/no-go.
