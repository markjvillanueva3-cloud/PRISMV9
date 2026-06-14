---
name: engine-creation-playbook
category: code-tribal
domain: backend-dev
tags: [engine, dispatcher, wiring, test, playbook, prism-development, ai-development]
last_updated: 2026-05-18
---

# Engine Creation Playbook — concrete recipe for new PRISM engine

The end-to-end procedure for shipping a new engine that survives the duplication-guard, comprehensive-build-enforce, wire-to-all-consumers, per-file-scrutiny, and 3-of-3 Stop gates.

## Step 1 — R8 dedup-preflight (THROWS on duplicate)

Before writing any code:

duplicationGuardEngine.mustCheckBeforeCreating({assetType:"engine", proposedName:"MyEngine", keywords:[...], description:"..."})

Throws if a similar engine exists. Read the match. If it's truly orthogonal, document why; if not, extend the existing engine instead.

Also check ENGINE_DIGEST.md by-hand for 1-line descriptions of all 3274 engines.

## Step 2 — Engine file (pure-core)

mcp-server/src/engines/MyEngine.ts. Rules:
- No inline physics constants — import from src/physics/constants.ts
- No stub assertions in the engine's tests
- Pure-core API; dependency-injected readers; idempotent where applicable
- Export the named class plus a standalone instance for singleton callers

## Step 3 — Schema file

mcp-server/src/schemas/myEngineSchema.ts — Zod object for input validation.

## Step 4 — Dispatcher wiring (the 5-piece contract)

1. Engine file (Step 2)
2. Schema file (Step 3)
3. Add "my_action" to the dispatcher's z.enum ACTIONS
4. Add case "my_action": branch calling slimResponse(MyEngine.doX(p))
5. Test covering the action's contract AND a round-trip through mcpServer.invoke

Wire to ALL natural consumers in the SAME commit. New physics engine → prism_calc AND prism_safety. New memory engine → prism_memory AND specialized consumer.

## Step 5 — Tests

mcp-server/src/__tests__/MyEngine.test.ts:
- Pure-function tests for every exported method
- Hermetic-with-injected-deps tests for boundaries
- At least ONE real-data E2E test driving the dispatcher (the RGS-TOOL-MS0 lesson — pure-core + injected-readers MUST ship a real-data E2E)
- Subprocess oracle if main() carries logic (the U-SLOT-BIND-ENFORCE lesson)
- Regression-guard tests for load-bearing invariants

## Step 6 — Per-file scrutiny gate

Before writing the next file, dispatch 2 parallel reviewer agents in ONE message:
- Agent A: content-specialist (wiring-review-agent for dispatcher, test-review-agent for test, physics-review-agent for physics, code-analyzer for utility)
- Agent B: independent reviewer (weighted on what A misses: integration, R8 dedup, R12 fail-loud, inlined constants, schema drift)

Fix every P0+P1 before proceeding. P2/P3 in handoff deferral list.

## Step 7 — Wiki entry

knowledge/wiki/architecture/engines/myengine.md with frontmatter:
- name, category:engine, domain (mill/lathe/wedm/cad/cam/backend-dev/general)
- wired_in: list of dispatchers
- last_verified: today

## Step 8 — Commit + Stop scrutiny gate

Commit format: [SCOPE]/U-ID: title. Run scrutiny-3way.mjs against the session diff; dispatch 3 reviewer agents in parallel; mark all three PASS before Stop clears.

## Common failures

- Action enum drift: action added to dispatcher A but engine name implies dispatcher B. Document the canonical dispatcher in the engine docstring.
- WIRE-EXEMPT singleton missing tag: if engine is wrapped by a singleton, tag // WIRE-EXEMPT: <reason> naming the wrapper.
- Test that asserts assert.ok(result) instead of real values: hook-rejected. Use real reference values or algebraic invariants.
- Schema mismatch dispatcher case unpacks {a,b} but engine expects (a,b): TS catches IF explicit types; (params as any) does not.

## Related

- [[dispatcher-wiring-pattern]] — 5-piece contract detail
- [[per-file-scrutiny-gate]] — 2-reviewer + 3-of-3 protocol
- [[test-design-real-values]] — hermetic vs E2E + real-value assertions
- [[karpathy-12-rule-discipline]] — R8 dedup, R9 tests-verify-intent, R12 fail-loud
- CLAUDE.md ENGINE WIRING WIRE TO ALL SOURCES + MANDATORY SELF-AWARENESS
