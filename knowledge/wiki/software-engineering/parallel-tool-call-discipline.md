---
name: parallel-tool-call-discipline
category: software-engineering
domain: backend-dev
tags: [tool-use, concurrency, parallel-dispatch, token-efficiency, harness, ai-development]
last_updated: 2026-05-18
---

# Parallel Tool-Call Discipline

CLAUDE.md says it in one line: *"Independent tool calls can run in parallel in one response."* That sentence is the lever — and the most common waste in agent work is ignoring it. This wiki names the canonical patterns, the failure modes that defeat parallelism, and the three different concurrency primitives so you pick the right one.

## The harness contract

Multiple tool calls **in a single assistant message** run concurrently in the harness. The same calls split across sequential messages run one at a time. There is no extra cost to dispatching N calls together vs one — only round-trip latency saved. The waste is sequencing what the harness would have parallelized for free.

This is the single most underused lever in PRISM agent work.

## When parallel pays — patterns

- **Independent file reads:** reading 3 unrelated files for context → 3 Read calls in one message, not 3 messages.
- **Independent searches:** Glob for `*.test.ts` + Grep for a function name + Read of a known config — different intents, no data dependency → one message.
- **Multi-axis verification:** checking git status + checking cron list + checking handoff freshness → one message.
- **Fan-out subagent dispatch:** the per-file scrutiny gate's 2 reviewers and the 3-of-3 Stop gate's 3 reviewers are explicitly designed to be parallel — see [[subagent-orchestration-discipline]] + [[per-file-scrutiny-gate]].
- **Mixed tool types in one call:** Read + Grep + Glob + Bash all parallel in one message is fine — the harness doesn't care that they're different tools.

## When sequential is required

Anything where output A feeds input B. A few common shapes:

- **Discover-then-act:** `git log -1` to find a commit hash, *then* `git show <hash>`. The hash is unknown until the first call returns. Two messages.
- **Read-then-edit:** Read a file (the harness requires it for the edit tracker), *then* Edit. Two calls in the same message work in theory but the Edit cannot see the Read's result until the model writes again — separate turns.
- **Probe-then-decide:** check whether a file exists, *then* either create or update based on what's there. The decision is in the model, not the harness.
- **Build-test-cycle:** build, then run tests on the build artifact. The test cannot precede the build.

Sequential is not a failure mode — it is the correct shape for dependent work. The failure is *unnecessary* sequencing.

## The "draft, then dispatch all" mental model

When you have multiple things to check or do this turn, write them out mentally first: every call you would make, the inputs each needs, and which depend on which. Then dispatch every independent call in one message. The dependent calls go in subsequent turns once their preconditions land.

This is the same pattern as [[subagent-orchestration-discipline]]'s "one message, many agents" — applied at the tool-call layer instead of the agent layer.

## The broad-glob anti-pattern (lived experience 2026-05-18)

Parallelism amplifies — including the cost of bad calls. Four `Glob("knowledge/wiki/**/*.md")` calls in one message against a 28,000-file wiki tree all timed out at 20s simultaneously (this very session). Token cost still paid, no result.

**Mitigation:**
- Narrow the path: `Glob("*.md", path: "knowledge/wiki/software-engineering")` returns in <1s where `**` would scan everything.
- Prefer Grep with `type` or `glob` filters for content searches over broad Glob+Read pipelines.
- The `grep-index-first` PreToolUse hook warns on `**` from repo root — listen to it.

Parallelism multiplies whatever you dispatch. Dispatch good calls.

## The three concurrency primitives — pick the right one

PRISM agents have three ways to run work concurrently. They are not interchangeable.

| Primitive | What | When |
|---|---|---|
| **Parallel tool calls in one message** | N synchronous tools dispatched together; results return together | Independent quick reads/searches/edits that complete in seconds |
| **Bash with `run_in_background: true`** | One detached command; harness notifies when it exits | Long single command (build, test suite, regen script) — `until grep ... ` loops, completion polls |
| **Monitor tool** | Long-running command that emits an event stream; each stdout line is a notification | Per-event signals (tail -f log filtered to errors, polling CI for status flips) |
| **Agent tool** | Delegated work with its own context and tool budget; result returns when the agent completes | Bounded judgment-call work (review, exploration, multi-step build); use `run_in_background: true` for long agents |

The wrong choice burns context: a Monitor with `tail -f` for "tell me when the build finishes" never exits when the build does, so the watcher stays armed and the notification never arrives. The right tool is `Bash run_in_background` with an `until` loop. See the Monitor tool description's "Pick by how many notifications you need" section.

## Edge cases the harness handles for you

- **One call fails:** the others still return; you see N results, some with errors. Decide per-result.
- **Permission prompt:** any one denied call returns a denial; others proceed. Adjust the denied call; don't retry verbatim.
- **Hook intercept:** a PreToolUse hook can block one call independently of the others. Read the hook's emitted reason.
- **State change between calls in the same dispatch:** parallel calls do NOT see each other's filesystem writes within the same dispatch. A Read after a parallel Write in the same message reads the pre-write state. Sequence dependent calls.

## What this saves

Empirically: every two-sequential-calls-that-could-have-been-parallel costs one round-trip of model latency (model writes message A → tools run → tools return → model reads → model writes message B → tools run again). In a /loop iteration, those round-trips compound. In a 20-iteration session, a chat that batches saves 10-20s per dispatch vs one that serializes — minutes per session, hours across the fleet.

More importantly: the model writes less between calls (no "now I'll do the next one" filler), which means less context burn.

## Anti-patterns

- **One call per message** when multiple independent checks are pending → serializes for no reason.
- **Sequential Reads of N independent files** when you already know all N paths → batch them.
- **Re-reading after Edit/Write** to "verify" → the harness already tracks file state. Edit/Write would have errored if the change failed. Trust the tool result. (CLAUDE.md "Do NOT re-read a file you just edited to verify.")
- **Broad globs from repo root** dispatched in parallel → multiplies the timeout cost. Narrow each path first.
- **Polling in a sleep loop** instead of using `run_in_background` or Monitor → blocks the chat and wastes tokens on idle ticks.

## Checklist — every dispatch

- [ ] Are these calls truly independent (no data flows between them)?
- [ ] If yes — all in **one message**?
- [ ] If no — what is the minimal sequence (longest chain of dependencies)?
- [ ] Are any calls broad-search shaped (`**`, repo-root Grep with no filter)? Narrow first.
- [ ] Right primitive: parallel tools / Bash background / Monitor / Agent?
- [ ] If using Monitor: does the command actually emit events when the watched condition is true (not silent on failure)?

## Related

- [[subagent-orchestration-discipline]] — parallel dispatch applied at the agent layer
- [[per-file-scrutiny-gate]] — canonical 2-agent parallel review
- [[token-budget-management]] — parallelism saves round-trips, which saves context
- [[hook-authoring-discipline]] — PreToolUse hooks can block one call without affecting siblings
- CLAUDE.md "Parallel independent tool calls in one message" — the one-line doctrine pointer
- The Monitor tool description (in the system prompt) — the canonical "pick by how many notifications you need" guidance
