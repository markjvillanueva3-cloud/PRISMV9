---
name: reference-substrate-health-inject-2026-05-19
description: "SessionStart hook surfacing declared-vs-actual.mjs drift in every PRISM chat's context — advisory, cached, fail-soft. Shipped 2026-05-19 bravo commit 01ff65a734."
aliases: reference_substrate_health_inject_2026_05_19
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.959Z
---


# substrate-health-inject — SessionStart drift digest

Shipped 2026-05-19 (bravo, `SYNERGY-SUBSTRATE-MS0/U-SHI01`, commit `01ff65a734`).

## What

A SessionStart hook (`H:/PRISM/.claude/hooks/substrate-health-inject.mjs`) that runs the substrate-health drift report (`scripts/declared-vs-actual.mjs`) and injects a 3-line digest into every PRISM chat's SessionStart context bundle via `hookSpecificOutput.additionalContext`. Cached with 2h TTL at `state/shared/.cache/substrate-health-last.json`; cache-hit path is ~5-15ms.

## Why

Compounds with [[reference_declared_vs_actual_2026_05_19]]: the gate I shipped runs only inside `/forge7 §Phase 0.2`. This hook extends its reach to EVERY session so chats learn about MCP typos (today's `prism-mcp-server` → should-be `prism`), missing-from-enabled servers (`prism_safe`), scaffolded-empty env vars (`SUPABASE_PROJECT_URL`), and hook orphans on disk — without explicit invocation.

## How to apply

- Hook fires automatically on SessionStart (wired at user-global `C:/Users/wompu/.claude/settings.json` `hooks.SessionStart[0].hooks[23]`, after `awareness-snapshot-inject.mjs`).
- Disable: `PRISM_SUBSTRATE_HEALTH_INJECT=0`.
- Override TTL: `PRISM_SUBSTRATE_HEALTH_TTL_MS=N`.
- Force a fresh sweep on demand: `node H:/prism/scripts/declared-vs-actual.mjs --text`.
- The digest renders `⚠ N BLOCKING` ONLY when `summary.ok === true` is FALSE (strict comparison — a producer typo emitting `ok: "true"` falls through to the ⚠ branch, fail-loud R12).

## Per-file scrutiny — 4 P1s fixed pre-commit

Two reviewers (code-analyzer + independent) flagged:
1. Case-sensitive `invokedDirectly` on case-insensitive Windows → `path.relative()` fix.
2. `formatDigest({summary:{}})` rendered the literal string `"undefined"` → `Number.isFinite && >= 0` coerce + 4 regression-guard tests.
3. Hardcoded `PRISM_ROOT = "H:/PRISM"` → `process.env.PRISM_ROOT` override.
4. Unbounded `JSON.parse` on cache file → 1MB `MAX_CACHE_BYTES` cap (hostile-payload class, sister to [[reference_ollama_expand_ms0]] 80MB graph cap).

Lesson: the pure-core + injected-I/O pattern catches integration bugs, but `formatDigest({summary:{}})` only crashed *visually* (not via throw) — the first test merely asserted "doesn't crash" without inspecting the rendered string. R9 (tests verify intent) means an assertion like `assert.doesNotMatch(r, /undefined/)` IS the contract, not `assert.ok(typeof r === "string")`.

## Tests

27 hermetic cases at `H:/PRISM/.claude/hooks/substrate-health-inject.test.mjs` via `node --test`. Includes a REGRESSION GUARD pinning today's 2026-05-19 typo class (prism-mcp-server dormant + prism_safe missing) so the same bug never reaches another chat undetected.

## See also

- [[reference_declared_vs_actual_2026_05_19]] — the underlying drift report
- [[feedback_user_explicit_opt_outs]] — the operator opt-outs the audit must respect
- [[reference_ollama_expand_ms0]] — sister hostile-payload size cap (80MB)
