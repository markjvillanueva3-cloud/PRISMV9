---
name: safety-tier-discipline
category: software-engineering
domain: backend-dev
tags: [safety, omega, shop-floor, prototype, tier, prism-development, ai-development]
last_updated: 2026-05-18
---

# Safety-Tier Discipline — when each PRISM safety tier applies

PRISM operates in three safety tiers. The wrong tier silently disables a load-bearing rail. **Default to `shop_floor` (Ω≥0.95, S(x)≥0.98) unless the command explicitly says otherwise.** The slash-command-execution-rules system prompt repeats this on every prompt — that's the canonical default.

## The three tiers

| Tier | Omega threshold | S(x) threshold | Use |
|------|-----------------|----------------|-----|
| shop_floor | ≥ 0.95 | ≥ 0.98 | Production NC code, parameters that drive a real spindle, anything an operator will execute |
| prototype | ≥ 0.80 | ≥ 0.85 | First-article runs, R&D milling, low-stakes single-part trial |
| research | ≥ 0.50 | ≥ 0.70 | Pure simulation, no physical machine, exploratory |

Thresholds live in `state/shared/omega-thresholds.json` — never hardcode in engines or hooks.

## The Omega equation

Ω(x) = 0.25 R + 0.20 C + 0.15 P + 0.30 S + 0.10 L

Where R = repeatability (process variation), C = cost (relative to alternatives), P = productivity (cycle time), S = safety score (the hard gate), L = lifetime (tool / fixture).

S has the highest weight by design. PRISM `prism_omega:auto_score` auto-derives R/C/P/L from cog.metrics and S from material via computeSafetyScore; explicit overrides supported.

## The S(x) hard gate

Omega can be ≥ 0.95 but if S(x) < 0.70 the output is BLOCKED regardless. This is `prism_omega.compute()` returning a BLOCKED status with reason S_LOW.

`safety-physics` agent enforces this — invoke BEFORE editing any CRITICAL-classified file (Kienzle coefficients, Taylor constants, tolerance logic, force/thermal calcs, safety validators). Returns PASS/FAIL with S(x) score. HARD BLOCK: will not approve if S(x) < 0.70.

## When to pick tier `prototype`

- Operator explicitly says "test run", "trial", "first article"
- The command name signals exploration (`/what-if`, `/simulate-change`)
- The output is NOT going to a spindle today

Even in prototype, S(x) ≥ 0.85 must hold. The relaxation is on R/C/P/L, not on safety.

## When to pick tier `research`

Almost never in production-facing PRISM. Reserve for:
- Algorithm benchmarking against synthetic data
- Comparing model outputs (no actual machining)
- Educational / training scenarios

Research tier MUST be flagged in output (banner, frontmatter). Operators should know they're looking at research-tier output.

## The "tier downgrade" anti-pattern

Tempting but wrong: "let me run this at research tier to get past the S(x) gate". The S(x) gate exists because S=0.70 is a real safety floor — below that, a spindle WILL crash. Downgrading to research tier silences the alert without fixing the unsafe parameter.

Correct fix: find the unsafe parameter, widen the tolerance, OR refuse to ship.

## Tier in dispatcher actions

Each dispatcher action's Zod schema can include `safety_tier?: z.enum([...])`. Default to shop_floor if omitted. The engine reads the tier and selects the appropriate threshold from omega-thresholds.json.

Example: `prism_calc:cutting_force_calc` returns the force AND a `safety_tier_passed: boolean` field. If false at shop_floor tier, the output's status is BLOCKED.

## Audit trail

Every tier change is logged. `goal-gate-bypasses.jsonl` records explicit bypasses; `omega-tier-decisions.jsonl` records every tier selection per action. Operators can audit "why did this output ship at prototype tier?"

## Related

- [[fail-loud-r12-patterns]] — S(x) BLOCKED is the fail-loud surface
- [[regression-prevention-doctrine]] — every safety-regression entry pairs with a tier-pinned test
- CLAUDE.md SAFETY RAILS (ALWAYS ENFORCED)
- CLAUDE.md EXPERT ROLE — deep-thinking mandate applies hardest to S(x)
- `prism_omega` dispatcher actions
- `state/shared/omega-thresholds.json` — canonical thresholds
