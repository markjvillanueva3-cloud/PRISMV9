# U-CK26 — psk record real command-invocation telemetry producer

**Status:** R8-enumerated, build-ready. NOT yet built (cut-off rule: enumerate
fully → stop at first write → next fresh-context iteration builds).
**Author of spec:** claude-2d30710b (slot hotel), 2026-05-18, COMMAND-KERNEL-MS0.
**Loop:** session cdc4a2c4, iter 5.

## R8 ground truth (verified this iteration — do NOT rebuild these)

- `.claude/kernel/psk.mjs` `syscall_record` (l949) **EXISTS, correct**: validates
  `{event,command}`, DoS-clamps strings (`RECORD_MAX_STR`/`RECORD_MAX_EXTRA`),
  atomic `appendFileSync` to `resolveTelemetryFile()` (default
  `state/shared/pipeline-telemetry.jsonl`), fallback-on-fail. **REUSE — do not
  re-implement the writer (R8).**
- `state/shared/pipeline-telemetry.jsonl` exists, 25 lines, **100% test data**
  (`event:"test"|"NESTED-value"`, `command:"smoke"|"psk.test.ts"`). ZERO real
  command-invocation events.
- **No producer exists**: `grep -rln "psk.*record|syscall.*record"`
  hooks/commands/scripts (excl. psk.mjs) → empty. This is the "ghost-wired
  orphan" class ([[reference_u_wire_energy_2026_05_17]]): consumer built,
  producer absent. The entire CK27/28/29 P4 chain is starved by this.

## The genuine gap = the producer

A hook that fires on **real command (slash-command / skill) invocation** and
records it via the canonical `psk record` path.

### Design (decided — build to this)

- **Event surface:** PostToolUse matcher on the `Skill` tool. Every Skill tool
  call IS a command invocation — the precise deterministic signal (do NOT
  parse UserPromptSubmit prompts for `/x`; that misses model-invoked skills and
  double-counts). Hook: `.claude/hooks/command-telemetry-record.mjs`.
- **Latency invariant (LOAD-BEARING — fleet-wide hot path, ≤13 concurrent
  chats):** the hook MUST NOT block or measurably slow the tool. Spawn the
  `psk record` writer **detached, fire-and-forget** (`spawn(..., {detached:true,
  stdio:'ignore'}).unref()`), never `spawnSync`. Hook returns
  `{continue:true,suppressOutput:true}` in <5ms regardless of writer outcome.
- **Reuse the canonical writer (R8):** invoke `node .claude/kernel/psk.mjs
  record --event command_invoked --command <skillName> --outcome <ok|error>
  [--latency_ms N]`. Do NOT re-append to the jsonl directly (would fork the
  DoS-clamp + fallback logic — divergence risk).
- **Field mapping:** `event="command_invoked"`; `command`=the Skill name from
  the PostToolUse payload (tool_input.skill or tool_name); `outcome` from
  tool_response success/error; `latency_ms` if the payload carries timing else
  null; `extra` = `{slot, chatId}` (slot from chat-slots find by stable id —
  best-effort, null on miss; NEVER block on it).
- **Knobs:** `PRISM_CMD_TELEMETRY_DISABLE=1` (off), `PRISM_CMD_TELEMETRY_PSK`
  (override psk path — TEST SEAM, mirror the slot-bind-enforce pattern so the
  integration test never writes the live jsonl).
- **Idempotency / volume:** one line per invocation is correct (the feedback
  loop wants raw events; CK27 aggregates). No dedup. But guard against a
  retry-storm: if the same (command,ts-second) already in flight, still fine —
  CK27 must be idempotent over duplicates anyway (note for CK27).

### Tests (`mcp-server/src/__tests__/command-telemetry-record.test.mjs`,
`node:test`, mirror slot-bind-enforce.test.mjs structure)

- Pure core `decideRecord({toolName,toolInput,toolResponse})` →
  `{shouldRecord, event, command, outcome, latency_ms}`: Skill tool ⇒ record;
  non-Skill tool ⇒ no-op; missing skill name ⇒ no-op (fail-safe, never a
  garbage event); outcome maps ok/error correctly.
- Adversarial: non-string toolName, null payload, oversize skill name,
  toolResponse without success field, NaN latency.
- `PRISM_CMD_TELEMETRY_DISABLE=1` ⇒ inert no-op (no spawn).
- **Subprocess integration oracle (REQUIRED — the recurring lesson: pure-core
  + injected-deps MUST ship a real wiring test):** spawn the hook with a
  PostToolUse Skill payload + `PRISM_CMD_TELEMETRY_PSK` pointed at a tmpdir
  fake; assert the fake was invoked with the exact
  `record --event command_invoked --command <name>` argv; assert the LIVE
  `pipeline-telemetry.jsonl` is untouched.
- Real-writer E2E: point `PRISM_CMD_TELEMETRY_PSK` at the REAL psk.mjs +
  `--telemetry-file` (or env) at a tmpdir jsonl; invoke hook; assert a real
  `{event:"command_invoked",command:...}` line lands (proves producer→canonical
  writer wiring end-to-end — closes the ghost-orphan class).

### Wiring

`C:\Users\wompu\.claude\settings.json` → `hooks.PostToolUse`, a matcher entry
for the `Skill` tool (check existing PostToolUse Skill matchers first — append
to an existing `Skill` matcher's hooks[] if one exists, else add one). Auto-
mirrors to H:. Verify with a live `/status`-class skill invocation → a real
`command_invoked` line appended.

### Per-file scrutiny

2 parallel reviewers per file (code-analyzer + reviewer) per CLAUDE.md
PER-FILE SCRUTINY GATE. Then 3-of-3 Stop gate. 4-surface doc reflection.
Close-out CK26 envelope (status→complete + ship_record) only AFTER the real
E2E proves a `command_invoked` event lands.

## Then (same loop, logical order)

- **CK27** — wire `pipeline-telemetry.jsonl` → `.claude/scripts/adaptive-thresholds.mjs`
  (consumer of the now-real events; must be idempotent over duplicate events).
- **CK28** — close command-utilization → auto skill-tier loop
  (`SkillTierRegistryEngine.classify_all` writes tiers back; snapshot for
  rollback per spec deliverable).
- **CK29** — outcome → memory/vault → `psk recommend` learns.
- **CK09** LAST (riskiest — thin-psk-client surgery on startup/checkin/
  precompact/pick-unit; smallest-diff; peer bravo released its claim unshipped).
- **CK11** blocked until CK08 232-stub sweep run (os/commands/ has 1 file).

## Why enumerated-not-built this iter (honest, R12)

Context heavy after U-SLOT-BIND-ENFORCE (full unit + 4 review agents + 4-surface
docs + investigation). CK26's producer is a fleet-wide hot-path perf decision
(≤13 concurrent chats, every skill invocation) that needs the full per-file
scrutiny done well, not rushed in a spiral (R6). Spec = the enumeration
deliverable per comprehensive-build-enforce cut-off rule; build is queued with
zero re-derivation, not skipped.
