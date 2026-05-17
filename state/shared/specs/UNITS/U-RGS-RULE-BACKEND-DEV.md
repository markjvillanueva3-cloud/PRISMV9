---
unit_id: U-RGS-RULE-BACKEND-DEV
milestone: JULIETT-12CHAT-ALLOCATION-MS0
owner_slot: lima
wave: W0
cost: S
status: pending
peer_claims_check_at: 2026-05-17T00:00:00Z
tool_plan_ref: pending-rgs-build
depends_on: []
unblocks: [U-RGS-NEXT-INTEGRATE, all-backend-dev-units-via-RGS]
roi_score: 9.0
generated_at: 2026-05-17
generator_version: hand-written-v1
---

# U-RGS-RULE-BACKEND-DEV

## Goal
Add a backend-dev domain rule to `scripts/lib/rgs-pipeline-rules.mjs` so backend-dev tasks (dispatcher actions / schemas / hooks / lockfile / telemetry / wiring gates / settings.json edits / envelope close-outs / chat-slots / loop-state / handoffs) stop falling to the 0.30-confidence `/scrutinize` generic fallback. **Acceptance:** `node scripts/rgs-tool-planner.mjs --unit <backend-dev-test-id> --force --json` returns plan with `confidence ≥ 0.75` and `skill: "/wire-unwired"` (or new `/backend-dev` parent).

## Activate (do-not-build)
- `scripts/lib/rgs-pipeline-rules.mjs` already has 14 RULES + GENERIC_FALLBACK pattern (lima shipped 5 of those rules in U-DOMAIN-RULES 2026-05-16 commit `e11def3f9`). Add the new rule following identical structure.
- `scripts/rgs-tool-planner.mjs` already consumes the rule table via `matchPipelines()` — no consumer change needed.
- U-DOMAIN-RULES polysemy-guard pattern (Wire-EDM exclusion, /lathe guard) is the template for the new rule.
- `prism_dev:roadmap_tool_plan_build` dispatcher action already exists.

## Build (net-new)
ONE rule object appended to the RULES array:
```js
{
  test: (s) => /\b(dispatcher action|schema|frontmatter|hook|lockfile|telemetry|wiring gate|settings\.json|envelope|claim|broadcast|chat-slots|loop-state|handoff)\b/i.test(s)
            && !/\b(mill|lathe|wedm|cam|cad|edm|grind|weld|electrode)\b/i.test(s),
  skill: "/wire-unwired",
  why: "backend devtools — settings/schema/dispatcher/hook/lockfile/telemetry surface",
  confidence: 0.75,
  domain: "backend-dev",
},
```

## Files-touched
- `H:/prism/scripts/lib/rgs-pipeline-rules.mjs` (Edit; append rule object before GENERIC_FALLBACK)
- `H:/prism/scripts/lib/rgs-pipeline-rules.test.mjs` (Edit; add 5 test cases — positive matches, negative matches, polysemy guards)

## Pre-flight
1. `node H:/prism/.claude/helpers/slot-task-claim.mjs claim --slot lima --chatId <id> --unitId JULIETT-12CHAT-ALLOCATION-MS0::U-RGS-RULE-BACKEND-DEV`
2. `Read scripts/lib/rgs-pipeline-rules.mjs` (verify 14 rules + GENERIC_FALLBACK still there)
3. `prism_dev:master_index_query { q: "backend-dev rule" }` (confirm nothing already-built)
4. Chat-bus claim file: `prism_context:chat_post { kind:"claim", path:"H:/prism/scripts/lib/rgs-pipeline-rules.mjs", ttlMin:30 }`

## Test plan
- Positive: `"add new dispatcher action for chat-slots"` → matches; `"wire settings.json hook for envelope close-out"` → matches
- Negative: `"add mill dispatcher action"` → does NOT match (polysemy guard catches mill)
- Negative: `"cam strategy hook for chat-slots"` → does NOT match (cam excluded even though chat-slots present)
- Edge: empty string → no match (falls to GENERIC_FALLBACK as before)
- Real-data E2E (per RGS-TOOL-AUTOINVOKE-MS1 lesson): run `rgs-tool-planner --unit JULIETT-12CHAT-ALLOCATION-MS0::U-RGS-RULE-BACKEND-DEV --force --json` and assert `domain === "backend-dev"`.

## Wiring
NONE — rule table is read at planner runtime; no settings.json change. RGS dispatcher actions already exist.

## Test-shipped-criteria
- `npx vitest run scripts/lib/rgs-pipeline-rules.test.mjs` passes (5 new tests added → all green)
- `node scripts/rgs-tool-planner.mjs --unit <test-id> --force --json | jq '.plan.confidence'` ≥ 0.75 for backend-dev units
- `state/shared/roadmap-tool-plans.json` shows ≥1 `domain: "backend-dev"` entry after fresh run

## Rollback
- `git revert <sha>` removes the rule cleanly (rule is additive, never alters existing 14 rules)
- Knob fallback: rule has no env-knob; rule-level disable requires comment-out + re-commit (acceptable for rule additions per U-DOMAIN-RULES doctrine)

## References
- [[reference_u_domain_rules_2026_05_16]] — 5 mill/lathe/wedm/cam/cad rules + structural Wire-EDM exclusion
- [[reference_rgs_tool_autoinvoke_ms1_2026_05_16]] — RGS-TOOL-AUTOINVOKE-MS1 fix wave; real-data E2E test discipline
- Wiki: `knowledge/wiki/architecture/rgs-tool-autoinvoke-ms1.md`
- V1 allocation §0 W0 row + §4 tool plan
