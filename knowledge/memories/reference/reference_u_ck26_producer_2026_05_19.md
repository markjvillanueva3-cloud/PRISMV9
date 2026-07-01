---
name: reference-u-ck26-producer-2026-05-19
description: U-CK26-PRODUCER (slot foxtrot 2026-05-19 202b2ae892) — psk syscall_record producer hook closes the ghost-orphan class; PostToolUse Skill matcher spawns canonical psk CLI detached/fire-and-forget; 22/22 tests including hermetic-fake + real-writer E2E; 2 P1s caught and fixed by 4-agent parallel scrutiny (argv-collision via `--key=value` form + hermetic test env-leak via explicit delete).
metadata:
  type: reference
---

# U-CK26-PRODUCER — psk record real command-invocation telemetry

**Commit:** `202b2ae892` (slot foxtrot, claude-f09b33aa, 2026-05-19, branch cad-fusion-live-ms0)
**Files:** `.claude/hooks/command-telemetry-record.mjs` (250 lines) + `mcp-server/src/__tests__/command-telemetry-record.test.mjs` (22 cases) + `state/shared/specs/FOXTROT-TASKS-PENDING-2026-05-19.md` (compile) + settings.json wiring in BOTH `C:/Users/Mark Villanueva/.claude/settings.json` and `H:/.claude/settings.json`.

## What this closes

The "ghost-orphan" class for `psk syscall_record`. The canonical writer at `.claude/kernel/psk.mjs:949` existed + correct (atomic appendFileSync to `state/shared/pipeline-telemetry.jsonl`, DoS-clamped, fallback-on-fail) but had ZERO producer wired. The jsonl was 100% test data; the entire CK27/28/29 P4 chain (adaptive-thresholds → auto skill-tier loop → outcome → memory/vault → recommend) was starved.

## The producer

PostToolUse matcher on the `Skill` tool spawns `node psk.mjs record --event=command_invoked --command=<name> --outcome=<ok|error|unknown> [--latency_ms N] [--extra={...}]` DETACHED / fire-and-forget. Hook returns `{continue:true,suppressOutput:true}` in <5ms regardless of writer outcome.

## Design decisions worth remembering

1. **PostToolUse Skill matcher, NOT UserPromptSubmit prompt-parse.** Prompt-parsing would miss model-invoked skills + double-count.
2. **Fire-and-forget spawn**, never spawnSync. ≤13 concurrent chats × N skill invocations = the fleet hot path; blocking would compound.
3. **Reuse canonical writer (R8)** — `node psk.mjs record ...` not direct jsonl append. Forking the writer would fork the DoS-clamp + fallback.
4. **`--key=value` form for string-valued flags** — fixes argv-collision class. A skill named `--telemetry-file` would otherwise be misparsed by `psk parseArgs` as a new flag.
5. **chatId derivation: `claude-<sid.slice(0,8)>` with NO `toLowerCase`** — mirrors slot-bind-enforce / chat-state-isolator convention. Case-fold would re-create cross-chat-id divergence.
6. **Test seam env: `PRISM_CMD_TELEMETRY_PSK`** overrides psk path for hermetic tests. **Plus** explicit `delete env.PRISM_TELEMETRY_PATH` before spawn — parent process env leaks through `{...process.env, X}` spreads, would silently retarget the LIVE jsonl snapshot oracle.

## Two P1s caught by 4-agent parallel scrutiny

4 reviewer agents in parallel (2 per file: hook + test):

- **Hook arm B P1**: argv collision via skill name starting with `--`. **Fixed in-session**: `--key=value` form for all string flags + dedicated `recordViaPsk: P1 GUARD` regression test (`--command=--telemetry-file` must NOT contain a bare `--command` argv).
- **Test arm B P1**: hermetic test inherited `PRISM_TELEMETRY_PATH` from parent env. A CI-set override could retarget the LIVE jsonl snapshot. **Fixed in-session**: explicit `delete hermeticEnv.PRISM_TELEMETRY_PATH` before spawnSync; mtime/size oracle now anchored.

22/22 PASS post-fix.

## Two real subprocess E2E oracles ship

Per the recurring lesson [[reference_u_p0_u02_recovery_2026_05_18]] (a passing spec test ≠ working feature — pure-core + injected-deps MUST ship a real wiring test):

1. **Hermetic fake** — spawns hook with `PRISM_CMD_TELEMETRY_PSK` at a tmpdir fake; asserts EXACT argv captured + LIVE jsonl mtime+size UNCHANGED.
2. **Real-writer** — spawns hook with REAL psk.mjs + `PRISM_TELEMETRY_PATH` at tmpdir jsonl; parses emitted `command_invoked` event; asserts `entry.event`, `entry.command`, `entry.outcome`, `chatId` in extra. **THIS closes the ghost-orphan class** (proves producer → canonical writer → jsonl end-to-end).

## Three fail-on-revert regression guards

- `REGRESSION: hook does NOT use spawnSync (latency-killer guard)` — source-grep with comment-strip.
- `REGRESSION: hook stdio is 'ignore' (cannot leak child stdout)` + `detached:true` invariant.
- `REGRESSION: deriveChatId source contains NO toLowerCase` (case-fold revert guard).

## Wiring

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

Placed in PostToolUse after `"Bash|Read"` block, before `"Edit|Write|MultiEdit|NotebookEdit"`. JSON-validated. Mirrored from C: → H: per CLAUDE.md global convention (c-to-h-mirror hook).

## Lessons

- **R8 — source-grep before re-implementing**: the writer existed; the spec was for the producer. A `grep -rln "psk.*record"` outside the kernel would have shown the orphan class immediately.
- **Argv with array form is NOT collision-safe by default**: any positional `--key value` parser misparses a value starting with `--`. Use `=` form unambiguously.
- **Hermetic test env vars must be explicitly deleted**: `{...process.env, X}` lets every OTHER env var through. Spread + delete is the safe pattern.
- **4-agent parallel scrutiny finds compound P1s a single reviewer misses**: arm A (content-specialist) caught the wiring invariants; arm B (independent) caught the argv-collision + env-leak. Both are LOAD-BEARING.

## Downstream unblocks

- **CK27** — wire `pipeline-telemetry.jsonl` → `.claude/scripts/adaptive-thresholds.mjs`.
- **CK28** — closed command-utilization → auto skill-tier loop.
- **CK29** — outcome → memory/vault → `psk recommend` learns.

## See also

- [[reference_u_p0_u02_recovery_2026_05_18]] — "passing spec test ≠ working feature" lesson
- [[reference_slot_bind_enforce_2026_05_18]] — convention sibling (same pure-core + main() + subprocess oracle template)
- [[command-telemetry-record]] — wiki entry with full design + test rationale
- [[hook-synergy-ms0]] — milestone whose latency invariant this hook honors
