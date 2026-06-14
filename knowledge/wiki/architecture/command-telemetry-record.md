---
title: command-telemetry-record (U-CK26 producer)
type: architecture
created: 2026-05-19
updated: 2026-05-19
by: claude-f09b33aa/foxtrot
tags: [hooks, telemetry, command-kernel, psk, ghost-orphan-fix, post-tool-use]
related: [[reference_u_ck26_producer_2026_05_19]] [[slot-bind-enforce]] [[hook-synergy-ms0]]
---

# command-telemetry-record — psk syscall_record producer hook

**Status:** SHIPPED 2026-05-19 (commit `202b2ae892`, slot foxtrot)
**Closes:** COMMAND-KERNEL-MS0/U-CK26 — the ghost-orphan class for `psk syscall_record`.
**File:** `.claude/hooks/command-telemetry-record.mjs` (250 lines)
**Test:** `mcp-server/src/__tests__/command-telemetry-record.test.mjs` (22 cases, all PASS).

## The ghost-orphan class this fixed

`.claude/kernel/psk.mjs` `syscall_record` (line 949) was BUILT + CORRECT — atomic
appendFileSync to `state/shared/pipeline-telemetry.jsonl`, DoS-clamped string
fields, fallback-on-fail. But it had **ZERO producer wired**: a grep across
`.claude/hooks/`, `.claude/commands/`, `scripts/` for `psk.*record` or
`syscall.*record` returned nothing (excluding the kernel itself).

Net: `pipeline-telemetry.jsonl` had 25 lines, **100% test data** (`event:"test"`,
`command:"smoke"|"psk.test.ts"`). The entire CK27/28/29 P4 chain (adaptive-
thresholds → auto skill-tier loop → outcome → memory) was starved by this. The
*consumer* existed; the producer didn't.

This hook IS the producer.

## Design

| Decision | Choice | Why |
|---|---|---|
| Event surface | PostToolUse matcher on `Skill` tool | Every Skill tool call IS a command invocation — the precise deterministic signal. UserPromptSubmit prompt-parsing for `/x` MISSES model-invoked skills AND double-counts. |
| Latency | `spawn(node, [psk.mjs, record, ...], {detached:true, stdio:"ignore", windowsHide:true}).unref()` — fire-and-forget | Hook is on the fleet hot path: ≤13 concurrent chats × N skill invocations. 5ms × 13 × N compounds. Hook returns `{continue:true,suppressOutput:true}` in <5ms regardless of writer outcome. **NEVER use spawnSync** (regression-guarded). |
| Writer | Canonical `psk.mjs record` CLI | R8 — do not re-implement the writer; reuse the DoS-clamp + fallback logic the kernel already has. Producing direct `appendFile` to the jsonl would fork the contract. |
| Argv form | `--key=value` for every string-valued flag | A skill name starting with `--` (e.g. `--telemetry-file`) would collide with psk's argv parser (it treats `--<key> <val>` as a flag). The `=` form is lexically unambiguous — psk parser splits at first `=`. Caught by per-file scrutiny arm B. |
| Field mapping | `event="command_invoked"`; `command` from `tool_input.skill` (then `name`/`command` fallback); `outcome` from `tool_response.is_error===true`/`error:"..."` (else `ok`/`unknown`); `latency_ms` passthrough from `tool_input.latency_ms` or `tool_response.latency_ms` (else null) | Pure decision in exported `decideRecord()` so adversarial inputs (NaN/Infinity/non-string) are unit-tested. |
| chatId | `claude-<sessionId.slice(0,8)>` — **NO toLowerCase** | Mirrors `slot-bind-enforce`, `chat-state-isolator`, `precompact-handoff`. Case-fold would re-create the cross-chat-id divergence bug. Fail-on-revert regression test guards this. |
| Test seam | `PRISM_CMD_TELEMETRY_PSK=<path>` overrides psk path | Mirrors slot-bind-enforce pattern. Hermetic test points this at a fake `psk.mjs` so the LIVE `pipeline-telemetry.jsonl` is never touched. |
| Kill switch | `PRISM_CMD_TELEMETRY_DISABLE=1` | Inert no-op (no spawn). |

## Wiring

`H:/.claude/settings.json` PostToolUse — new matcher block (also mirrored to
`C:\Users\Mark Villanueva\.claude\settings.json`; the `c-to-h-mirror` hook
auto-propagates C: → H: on future edits):

```json
{
  "matcher": "Skill",
  "hooks": [
    {
      "type": "command",
      "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/command-telemetry-record.mjs",
      "timeout": 2000
    }
  ]
}
```

Placed AFTER the `"Bash|Read"` posttool-bash-read-bundle block, BEFORE the
`"Edit|Write|MultiEdit|NotebookEdit"` cross-session-orchestrator block.

## Test design (22 cases, `node:test`)

Two REAL subprocess oracles ship per the recurring R8 lesson ([[reference_u_p0_u02_recovery_2026_05_18]] — pure-core + injected-deps MUST ship a subprocess integration test):

1. **Hermetic-fake E2E** — spawns the hook with `PRISM_CMD_TELEMETRY_PSK` pointed at a tmpdir fake `psk.mjs` that captures argv, asserts the EXACT `--key=value` argv, asserts the LIVE `pipeline-telemetry.jsonl` mtime+size UNCHANGED. (Test seam P1 hardening: `delete env.PRISM_TELEMETRY_PATH` before spawn so a CI-set override can't retarget the snapshot.)
2. **Real-writer E2E** — spawns the hook with the REAL `psk.mjs` and `PRISM_TELEMETRY_PATH` pointed at a tmpdir jsonl, parses the emitted `command_invoked` event, verifies `entry.event`, `entry.command`, `entry.outcome`, and `chatId` in `extra`. **This is the assertion that proves the ghost-orphan class is closed.**

Plus 3 fail-on-revert regression guards (regex-scan the hook source for
`spawnSync` absence, `stdio:"ignore"` + `detached:true` presence, no
`toLowerCase` in `deriveChatId`).

## Per-file scrutiny outcomes

4 reviewer agents (2 per file, parallel) — round 1:
- Hook arm A (code-analyzer): PASS, 0 P0/P1.
- Hook arm B (reviewer): PASS WITH 1 GENUINE P1 — argv collision class for skills named `--<flag>`. **Fixed in-session** (switched to `=` form; added `recordViaPsk: P1 GUARD` regression test).
- Test arm A (test-review-agent): PASS, all required oracles ship.
- Test arm B (reviewer): PASS WITH 1 GENUINE P1 — hermetic test inherited `PRISM_TELEMETRY_PATH` from parent env. **Fixed in-session** (`delete hermeticEnv.PRISM_TELEMETRY_PATH` before spawn).

Round-2 re-test: 22/22 PASS.

## Downstream — what this unblocks

- **CK27** — wire `pipeline-telemetry.jsonl` → `.claude/scripts/adaptive-thresholds.mjs` (consumer of the now-real events; must be idempotent over duplicate events since the producer emits one per invocation).
- **CK28** — closed command-utilization → auto skill-tier loop. `SkillTierRegistryEngine.classify_all` reads the jsonl, writes tiers back.
- **CK29** — outcome → memory/vault → `psk recommend` learns from real usage patterns.

## Lessons

- **R8 — read before you write:** the writer already existed and was correct. The fix was building the producer, not the writer. Source-grep BEFORE re-implementing.
- **Argv with array form is NOT shell-safe by default for parser collision:** a value starting with `--` will be misparsed by any positional `--key value` parser. Use `=` form unambiguously.
- **Test-seam env vars MUST be explicitly deleted, not just unset upstream:** parent process env leaks through `{ ...process.env, X: ... }` spreads. Add `delete env.PRISM_TELEMETRY_PATH` in hermetic spawns.
- **Pure-core + injected-deps designs MUST ship a real subprocess E2E test** ([[reference_u_p0_u02_recovery_2026_05_18]] lesson). Hermetic-fake testing alone leaves the wiring untested.

## See also

- [[psk-syscall-record]] — the canonical writer
- [[slot-bind-enforce]] — convention sibling (same template: pure-core + main() + subprocess oracle)
- [[hook-synergy-ms0]] — the umbrella milestone the latency invariant comes from
- [[u-ck26-producer-build-spec]] — the spec this implementation follows
