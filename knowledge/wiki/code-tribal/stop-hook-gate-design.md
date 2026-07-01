---
name: stop-hook-gate-design
category: code-tribal
domain: backend-dev
tags: [stop-hook, gate, scrutiny, goal, blocking, hook-design, prism-development, ai-development]
last_invoked: 2026-05-18
last_updated: 2026-05-18
---

# Stop-Hook Gate Design — blocking session end safely

PRISM Stop hooks are the only universal choke point that fires regardless of how a session ends (user-accepted, auto-stop, error). When a gate must block until a condition holds, Stop is where it lives. Six design rails make a Stop gate safe.

## The Stop event contract

Stop hooks receive JSON stdin with the session context. Output:
- continue: true → allow stop
- decision: block + reason → block; the chat keeps going until either condition clears OR a configured retry-cap fires

The decision: block surface is what makes /goal conditions and the 3-of-3 scrutiny gate work.

## Rail 1 — Idempotent block decision

A Stop hook may fire multiple times in a session if the chat keeps trying to stop. Each fire must reach the SAME block decision given the same state. Don't randomize, don't depend on time-of-day, don't read mutable in-process state.

The 3-of-3 ledger pattern: check a persistent file (SCRUTINY_LEDGER.json) → same check → same answer. Reproducible.

## Rail 2 — Bounded retry escape hatch

A hook that never clears is a hook that breaks the session. Two escape patterns:

- N-attempt auto-pass: after 3 block attempts, emit a warning and continue. The 3-of-3 scrutiny gate uses this.
- Env bypass: PRISM_<NAME>_BYPASS=1 forces continue with a logged entry. The /goal gate uses this.

Both should be visible in the block reason text so the operator knows the escape exists.

## Rail 3 — MINIMAL_ALLOWLIST for critical hooks

Some hooks (scrutinize-before-stop, /goal gate) must NOT be disable-able by PRISM_HOOK_PROFILE. Put them in the MINIMAL_ALLOWLIST in the hook-profile resolver. Operator can still env-bypass per-hook but can't blanket-disable all hooks and silently bypass the gate.

## Rail 4 — Read transcript / state, not memory

A Stop hook fires after the chat's tool-use round. The most recent context is in the transcript file at the session_id path. Read the last N KB and scan for the marker (/goal invocation, ledger key, etc.). Don't trust in-process state; it may not survive harness restart.

## Rail 5 — Fast happy path

The vast majority of Stops should approve in <50 ms. If the gate's condition is rare (only fires on specific milestone-close or specific command), short-circuit early:

1. Quick check: does this session even need to be gated?
2. If no: return {continue:true} immediately
3. If yes: do the full state read + decision

The /goal gate first checks "was /goal invoked this session?" by scanning the last 256 KB of transcript. If no, immediate approve.

## Rail 6 — Honest block reason

The block reason text is what the operator sees. It MUST:
- Name the gate (so operator knows which hook is blocking)
- State the condition (what must hold for clear)
- Provide the unblock action (what command to run)
- Document the bypass (env var or auto-pass count)

Example: "scrutiny-gate: 3-of-3 PASS not yet recorded. Run: node .claude/scripts/scrutiny-3way.mjs --session-id <X>. Auto-pass after 3 block attempts. Bypass: PRISM_SCRUTINY_BYPASS=1."

Without this, the operator gets a mysterious block and no path forward.

## The /goal gate — the LLM-judged condition pattern

The /goal Stop hook is unique: its condition is the literal user-typed text ("exhaust X", "ship Y by Friday"), not a programmatic check. Decision is by an LLM judging "does the chat's progress satisfy this condition?"

Two implications:
1. The chat MUST demonstrate progress in observable artifacts (commits, files, state mutations). Saying "I am done" without evidence will not clear the gate.
2. The judge LLM reads the chat transcript + recent commits. If progress is buried in agent-only context (subagent results not surfaced), the judge cannot see it.

Implication for prompts: surface deliverables in main-chat text, not only in Agent results.

## The 3-of-3 scrutiny pattern

For multi-file builds, the scrutinize-before-stop hook requires 3 independent reviewer agents to mark PASS in a ledger. Each reviews the session diff with a different weighting (holistic / test-integrity / silent-breakage). The gate blocks until all 3 marks are present.

Why 3, not 1: a single reviewer misses 30-50% of P0s on complex diffs. Three independent reviewers converge on the same P0s and surface complementary P1s.

## When NOT to write a Stop hook

- Block on every Stop unconditionally: that is a deadlock waiting to happen
- Block on a condition you cannot articulate: the operator cannot unblock you
- Block to enforce style: that is a PostToolUse hook's job (no async wait)

Stop hooks are heavy-duty. Reserve them for safety, correctness, coordination gates that genuinely require session-end synchronization.

## Related

- [[per-file-scrutiny-gate]] — the 3-of-3 pattern in detail
- [[hook-lifecycle-anatomy]] — Stop's role among 6 events
- [[fail-loud-r12-patterns]] — block reason is fail-loud applied to the gate
- CLAUDE.md SCRUTINY GATE (UNIVERSAL — every chat, every Stop)
- CLAUDE.md GOAL-COMPLETE GATE — /goal requires fresh close-out audit (2026-05-13)
