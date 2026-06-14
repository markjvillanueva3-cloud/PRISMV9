---
name: mcp-tool-design
category: software-engineering
domain: backend-dev
tags: [mcp, dispatcher, action-enum, schema, slim-response, ai-development]
last_updated: 2026-05-18
---

# MCP Tool / Dispatcher Action Design

PRISM exposes 97 MCP dispatchers, each with 10-500 actions. Five design rails.

## Rail 1 — Action name = imperative verb_noun

Good: cutting_force_calc, material_recommend, chatter_predict.
Bad: force (generic), getMaterial (CRUD hides purpose), chatter_handler (vague).

Pattern: noun_verb for queries, verb_noun for actions. Consistent per dispatcher.

## Rail 2 — Single params object, Zod-validated

ActionSchema is z.object with action (z.enum ACTIONS) + optional params (z.record). Each case Zod-parses required fields, fails-loud on missing. Per-action validation is R12 load-bearing.

## Rail 3 — Output through slimResponse

Strips _trace, _debug, _metadata before MCP serialization. Test against slim surface, not internal engine.

The 2026-05-17 master-index-query R12 bug: hits empty array was elided (slim default); downstream assumed result.hits present. Fix: always include the key even empty. Callers shouldn't have to test both undefined and [].

## Rail 4 — Documented action enum in tool description

Action lists in descriptions are how Claude discovers actions. Update description in SAME commit as the case. DISPATCHER_DIGEST.md is the human index.

## Rail 5 — Wire to ALL natural consumers (2026-04-28 rule)

New engine → every dispatcher that would naturally consume it, same commit. See [[dispatcher-wiring-pattern]].

## Slim-response selection

Always strip: _trace, _debug, _internal, _audit, _metadata.
Conditional: rationale, calibration_history, intermediate_steps.
Always keep: result, error, warnings, uncertainty.

## Common failures

- Action overloading: "analyze" with mode-param branching 7 ways. Split into 7 explicit actions.
- Schema drift dispatcher vs engine: positional vs object args. TS catches only with explicit types.
- Missing default branch: silent fall-through. Always throw on unknown action.
- Silent empty-params: optional with required fields. Zod-parse to fail-loud.

## prism_dev kitchen-sink anti-pattern

prism_dev is catch-all. Push specialized actions to domain dispatchers as soon as a home exists. Otherwise discovery breaks.

## Tool description token budget

Tool descriptions cost tokens per call. 500-action enum = 5k-token preamble per request. PRISM trims action lists to top-20 + "and more"; full lists in DISPATCHER_DIGEST.md.

## R12 + MCP — surface errors structurally

Catch blocks return slimResponse({ok:false, error, phase:"validation|compute|io", recoverable: bool}). The 2026-05-18 retag-tribal-backend-dev --json write-failure was hardened this way (Reviewer B P1).

## Related

- [[dispatcher-wiring-pattern]] · [[karpathy-12-rule-discipline]] · [[fail-loud-r12-patterns]] · [[code-archaeology-patterns]]
- CLAUDE.md MCP DISPATCHERS section
- DISPATCHER_DIGEST.md
