# TASK-FRESHNESS-GATE-MS0 — Doctrine R13 + Hard PreToolUse Gate

## Context

User: *"make a clause that you check the date of when tasks where generated so you compare to whats new to see if we need to make adjustments to build"*.

Operator clarification (AskUserQuestion): **Doctrine + hard PreToolUse gate**, covering all 4 task surfaces (atomic-roadmap + envelopes, audit-generated specs, derived inventories, handoff RESUMEs).

### The problem this addresses

Across the fleet a task's "ground truth" is its generation timestamp. PRISM already enforces this for two narrow surfaces — `goal-complete-gate` (CLOSE-OUT-CANDIDATES.json ≤2h) and the scrutiny session ledger (5-min once-cleared-stays-cleared) — but the rule is partial:

- A roadmap unit picked from a `pending` envelope generated 3 days ago may already be shipped (silent close-out debt) or rescoped (peer audit changed scope).
- A unit pulled from `MISC-TASKS-INVENTORY.json` (extracted 2026-05-16) is 24h+ old and the fleet has shipped ~85 commits since — many of those tasks are now invalid.
- A handoff RESUME directive read post-`/compact` is — per the existing lima regression note in CLAUDE.md — a "working hypothesis, not ground truth." Lima lost ~5 turns last session by following one.
- `ROADMAP-CONSOLIDATED.json` was generated 2026-05-17T21:00; any unit picked from it without checking activity-since-then risks colliding with a peer's just-landed work.

A unified rule + a gate at the moment of claim makes the check deterministic instead of disciplinary.

### Intended outcome

1. **Doctrine clause R13** added to CLAUDE.md (via patch-sibling — bravo holds the lock for OBSIDIAN-BRAIN-FIX-MS0).
2. **A PreToolUse gate** wired into `bash-bundle.mjs` that intercepts `slot-task-claim.mjs claim --unit <X>`. If the unit's source is stale relative to fleet activity, the claim is blocked with a structured freshness report. The chat re-evaluates (peer chat-bus, BUILD_STATE, MILESTONE_PROGRESS) and re-runs with `--ack-stale` (or `PRISM_TASK_FRESHNESS_BYPASS=1` one-shot).
3. **Knobs to dial back if it misfires** without an emergency commit.
4. **Reflection on all 4 doc surfaces** (CLAUDE.md, MEMORY.md, wiki, Obsidian memory) per the standing 4-surface rule.

## Approach

### Doctrine (R13) — single clause, slots into existing R5–R12 block

> **R13 — Reconcile task age before building.** A task generated/surfaced/scheduled before recent fleet activity may already be shipped, rescoped, or invalidated. Before committing to build a unit, check (a) the timestamp of the task source (envelope `generatedAt` / audit-spec filename date / inventory `generatedAt` / handoff frontmatter `generatedAt`), (b) commits + envelope flips + peer ships since then, (c) reconcile. Significant activity since generation → re-check spec, dedup, peer claims before code. → PRISM: enforced by `.claude/hooks/task-freshness-gate.mjs` at `slot-task-claim.mjs claim`; `PRISM_TASK_FRESHNESS_BYPASS=1` for one-shot override (logged).

### Helper — `.claude/helpers/task-freshness.mjs` (PURE, injectable)

Exports (all sync, all dependency-injectable for hermetic testing per RGS-TOOL-AUTOINVOKE-MS1 lesson: pure-core + injected readers MUST ship one real-data E2E test):

```js
classifyTaskSource(unitId, opts={readEnvelope, readAuditSpec, statFile})
  → { kind: "envelope"|"audit-spec"|"inventory"|"handoff"|"unknown",
      milestonePath, auditSpecPath?, generatedAtField, fallbackChain }

readGenerationTimestamp(taskRef, readers={readJson, statFile, gitLog})
  → ISO string or null
  // Cascade: in-file generatedAt → filename date suffix → git log first-touch → file mtime → null

countActivitySince(sinceIso, readers={gitLog, readChatBus})
  → { commitsCount, envelopeFlips, peerShips: [{slot, unit, ts}], summary }

decideFreshness({ genDate, activity, thresholds: {staleHrs, peerCommitsTrigger} })
  → { stale, reason, blockMessage, threshold }
  // Stale IFF: ageHrs > staleHrs OR (ageHrs > 1 AND commitsCount >= peerCommitsTrigger)

ackPath(chatId, unitId, stampDir)
  → absolute path with ::→__ sanitization

acknowledgmentValid(chatId, unitId, stampDir, ttlMs, now=Date.now)
  → boolean

writeAcknowledgment(chatId, unitId, stampDir, freshnessReport, ttlMs)
  → ack path (atomic tmp+rename)
```

Cascade envelope→audit-spec: if the unit ID is in a `*-AUDIT-MS*` or `FEATURE-GAP-*` envelope, ALSO check the matching audit-spec file's mtime (the envelope can be rewritten without the audit being re-run, so the older of the two governs).

### Hook — `.claude/hooks/task-freshness-gate.mjs`

PreToolUse, wired INTO `bash-bundle.mjs` `BASH_HOOKS` array between `commit-ownership-guard` and `worktree-commit-route` (the slot-discipline cluster). Single-line bundle edit only — no settings.json change.

Logic:
1. Read stdin JSON → command string.
2. Match command against `/slot-task-claim\.mjs\s+claim\s+/`. No match → exit 0, allow.
3. Parse `--unit <X>`, `--chatId <C>`, `--ack-stale` (passthrough token — does NOT need to be a real flag in `slot-task-claim.mjs`; the hook reads the token to know the chat acknowledged. The claim CLI treats it as an ignored extra arg), and detect re-claim heartbeat by checking the existing slot-task-claims.json entry — heartbeat refresh skips the freshness check.
4. If `--ack-stale` present OR env `PRISM_TASK_FRESHNESS_BYPASS=1` → emit JSONL audit line to `state/shared/task-freshness-gate-bypasses.jsonl` (mirroring `goal-gate-bypasses.jsonl` shape), allow.
5. Otherwise call helper: `classify → readTimestamp → countActivity → decide`.
6. If `!stale` → allow silently (no systemMessage on the green path; the hook is invisible until it matters).
7. If `stale`:
   - Check ack stamp at `state/shared/task-freshness-acks/<chatId>__<sanitized-unit>.json`. Valid + unexpired → silent allow.
   - Else → `{decision: "block", reason: <structured markdown report>, systemMessage: <re-check protocol>}`.
8. Failsafe (any throw, missing envelope, git timeout, unresolvable chatId): log to `state/shared/task-freshness-gate-errors.jsonl` and **allow** (R12 fail-loud but never block on the gate's own bug).

Block message shape (markdown):
```
[task-freshness-gate] Unit <MS::U-ID> source is STALE.
  Source kind: <kind> (path: <abs>)
  Generated: <ISO>  (<X> hours ago)
  Activity since: <N> commits, <M> envelope flips, <K> peer ships
    - <slot>@<ts> <U-ID>
    - ...
  Threshold: stale_hrs=24, peer_commits_trigger=5

Re-check protocol:
  1) git log --since="<genIso>" --oneline  (peer activity)
  2) /master-index <unit_keywords>  (might be already-shipped)
  3) node H:/prism/.claude/helpers/slot-task-claim.mjs list --slot <S>  (peer claims)
  4) Re-run with --ack-stale: node ... claim --unit ... --ack-stale
     or: PRISM_TASK_FRESHNESS_BYPASS=1 node ... claim ... (one-shot, audited)

Gate kill switch: PRISM_TASK_FRESHNESS_GATE_DISABLE=1
```

### Ack stamp schema

`state/shared/task-freshness-acks/<chatId>__<sanitized-unit>.json`:
```json
{
  "schemaVersion": 1,
  "chatId": "claude-93351de7",
  "unitId": "FEATURE-GAP-AUDIT-MS0::U-GAP-CAD-BREP",
  "checkedAt": "2026-05-17T23:45:00.000Z",
  "expiresAt": "2026-05-18T00:15:00.000Z",
  "freshness": {
    "kind": "envelope",
    "genIso": "2026-05-17T17:00:00.000Z",
    "ageHrs": 6.75,
    "commitsSince": 12,
    "peerShipsSince": ["alpha@22:32 U-GAP-MILL-FFT-CHATTER"]
  }
}
```

Default ack TTL: 30 min. Atomic tmp+rename write. Sweep stale stamps in a 4h sweep (cheap; only when hook fires).

### Knobs (all CLAUDE.md-documented)

| Knob | Default | Purpose |
|------|---------|---------|
| `PRISM_TASK_FRESHNESS_GATE_DISABLE` | unset | Full kill-switch (allow everything). |
| `PRISM_TASK_FRESHNESS_STALE_HRS` | `24` | Hours-since-gen threshold. |
| `PRISM_TASK_FRESHNESS_PEER_COMMITS_TRIGGER` | `5` | N peer commits since gen → stale even if <stale_hrs. |
| `PRISM_TASK_FRESHNESS_ACK_TTL_MIN` | `30` | Ack stamp lifetime. |
| `PRISM_TASK_FRESHNESS_BYPASS` | unset | One-shot bypass with JSONL audit log. |
| `PRISM_TASK_FRESHNESS_GIT_TIMEOUT_MS` | `8000` | git log subprocess budget. |
| `PRISM_TASK_FRESHNESS_VERBOSE` | unset | Emit telemetry on every fire to JSONL. |

NOT in MINIMAL_ALLOWLIST. The gate is bypassable by design — same posture as `goal-complete-gate`, not `scrutinize-before-stop`.

### Tests — `scripts/__tests__/task-freshness.test.mjs`

`node:test`, hermetic (vitest currently broken per CLAUDE.md). ~30 cases across helper + gate. Per the RGS-MS1 lesson: hermetic alone is insufficient — also include **1 real-data E2E** that drives `task-freshness.mjs` against the live `state/shared/specs/ROADMAP-CONSOLIDATED.json` + live `mcp-server/data/milestones/FEATURE-GAP-AUDIT-MS0.json` and asserts the staleness verdict matches the actual current state.

Test groups:
- `classifyTaskSource`: 6 cases (envelope, audit-spec, inventory, handoff, unknown, malformed unitId)
- `readGenerationTimestamp`: 7 cases (in-file > filename > git > mtime > null cascade)
- `countActivitySince`: 5 cases (zero, normal, git-timeout, chat-bus-truncated, future-date-edge)
- `decideFreshness`: 6 cases (fresh, stale-by-hours, stale-by-commits, both, threshold-boundary)
- ack flow: 4 cases (write+read roundtrip, expired stamp, sanitized path, atomic write)
- gate integration: 3 cases (allow on no-match, block on stale, allow on ack present)
- 1 fail-on-revert oracle for `::→__` sanitization (filesystem-safety)

### Files to create / edit

| File | Op | Approx size | Lock risk |
|------|-----|-----|----------|
| `H:/prism/.claude/helpers/task-freshness.mjs` | new | ~250 LOC | none |
| `H:/prism/.claude/hooks/task-freshness-gate.mjs` | new | ~150 LOC | none |
| `H:/prism/.claude/hooks/bundles/bash-bundle.mjs` | 1-line addition to BASH_HOOKS | +3 LOC | LOW — bundle is comparatively cold; coordinate via chat-bus before edit |
| `H:/prism/scripts/__tests__/task-freshness.test.mjs` | new | ~400 LOC | none |
| `H:/prism/state/shared/dashboards/patches/CLAUDE-MD-PATCH-r13-task-freshness.md` | new patch-sibling | ~40 LOC | none (dodges bravo's CLAUDE.md lock) |
| `H:/.claude/projects/H--PRISM/memory/feedback_task_freshness_pre_build.md` | new | ~30 LOC | none (my own memory dir) |
| `H:/.claude/projects/H--PRISM/memory/MEMORY.md` | 1 pointer line | +1 LOC | none |
| `H:/prism/knowledge/wiki/architecture/task-freshness-gate.md` | new | ~80 LOC | LOW (new file, no merge) |

### Existing patterns reused

- **env knob convention**: `PRISM_<DOMAIN>_<NOUN>_<VERB>` — copied from goal-complete-gate, close-out-audit, twid.
- **block shape**: `{decision: "block", reason: "...", systemMessage: "..."}` — same as `goal-complete-gate.mjs`.
- **bypass logging**: append JSONL to `state/shared/<gate-name>-bypasses.jsonl` with `{ts, pid, reason, transcript_path}` — copied from `goal-complete-gate.mjs:logBypass`.
- **atomic JSON write**: tmp+rename (used in `chat-slots.mjs`, `slot-task-claim.mjs`).
- **fail-open**: every internal error → log + allow (same as `git-add-lane-guard.mjs`, `commit-ownership-guard.mjs`).
- **bundle insertion**: BASH_HOOKS array entry, NOT settings.json — keeps wiring consolidated, reduces peer-merge collision risk.

### NOT covered by this MS0 (deliberate scope cuts)

- `slot-task-claim.mjs` CLI does NOT need a real `--ack-stale` flag. The gate parses the token from the command string only — slot-task-claim treats it as ignored extra arg. If a real flag is desired later, ship as MS1.
- No promotion of the hook to MINIMAL_ALLOWLIST. Gate is bypassable by design.
- No retroactive scan of existing claims for staleness — only intercepts new `claim` calls.
- No `/loop` integration. Operator invokes gate-bypass once at first iteration; subsequent loop iterations don't re-claim the same unit.

## Verification

```bash
# 1. Helper unit tests
node --test H:/prism/scripts/__tests__/task-freshness.test.mjs
# Expect: all 30 cases pass

# 2. Hook smoke (matched command, no ack → BLOCK)
echo '{"tool_name":"Bash","tool_input":{"command":"node H:/prism/.claude/helpers/slot-task-claim.mjs claim --slot foxtrot --unit FEATURE-GAP-AUDIT-MS0::U-GAP-CAD-BREP --chatId claude-93351de7"}}' \
  | "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/task-freshness-gate.mjs
# Expect: {"decision":"block","reason":"[task-freshness-gate] ..."}

# 3. Hook smoke (matched command, --ack-stale → ALLOW)
echo '{"tool_name":"Bash","tool_input":{"command":"... claim ... --ack-stale"}}' \
  | "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/task-freshness-gate.mjs
# Expect: {"decision":"approve"} exit 0

# 4. Hook smoke (kill switch)
PRISM_TASK_FRESHNESS_GATE_DISABLE=1 echo '...' \
  | "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/task-freshness-gate.mjs
# Expect: {"continue":true} silent allow

# 5. Bundle integration
echo '{"tool_name":"Bash","tool_input":{"command":"... claim ..."}}' \
  | "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/bundles/bash-bundle.mjs
# Expect: same block when stale, same allow otherwise

# 6. Real-data E2E (MS1 lesson — pure-core + injected-readers MUST have ≥1)
node --test H:/prism/scripts/__tests__/task-freshness.test.mjs --grep="real-data E2E"
# Expect: pass against live ROADMAP-CONSOLIDATED + envelope mtimes
```

Acceptance for ship:
- All 30+ unit tests pass.
- Real-data E2E asserts a specific stale verdict on at least one live envelope.
- Per-file 2-reviewer scrutiny gate PASSes for each of 8 files.
- End-of-task 3-of-3 (Codex + Claude A + Claude B) PASSes.
- Settings.json untouched — bundle is the wiring surface.
- All 4 doc surfaces reflected: CLAUDE.md patch-sibling + MEMORY.md pointer + memory feedback file + wiki entry.
- Commit subject: `[MAIN] [TASK-FRESHNESS-GATE-MS0]/U-TFG01: doctrine R13 + hard PreToolUse gate over 4 task surfaces`.

## Risks + mitigations

1. **bash-bundle.mjs edit collides with peer.** Bundle is comparatively cold but not untouched. Mitigation: post to chat-bus before editing; if collision, fork to sibling worktree per [[feedback_conflict_fork_rule]]. Single-line addition makes collision unlikely.
2. **First-day false positives during burn-in.** Default-ON is what the user asked for. Mitigation: `PRISM_TASK_FRESHNESS_BYPASS=1` is one keystroke; JSONL bypass log makes false-positive patterns visible.
3. **Cygwin fork-storm.** Hook fires on every Bash call (matched or not). Mitigation: cheap fast-path — exit early on command-no-match before any IO. Hook wired through `portable-node.cmd` (not bash wrapper) per kilo's 17:06 advisory.
4. **Envelope path resolution failure for malformed unit IDs.** Mitigation: fail-open — any throw → log + allow.
5. **Hook becomes load-bearing then breaks.** Mitigation: not in MINIMAL_ALLOWLIST; one env var disables it; one JSONL knob bypasses for a single call.

## Note on shell hook conventions

`H:\.claude\rules\hooks.md` describes a **shell-script (`.sh`) hook convention** (parse_hook_input, deny/hint/warn, jq output). PRISM's hooks are JavaScript modules (`.mjs`) following the **Node-based** convention copied above (block shape `{decision: "block", reason: "..."}`, emit-via-runtime, no jq). The two ecosystems coexist; the new gate is a Node `.mjs` hook and uses the Node conventions, NOT the shell ones.

## Plan-file location note

The harness suggested `C:\Users\wompu\.claude\plans\bubbly-launching-dolphin.md` as the plan location, but the H-drive enforcement hook blocks writes to `C:\Users\*\.claude\<authored>`. Redirected to `H:\.claude\plans\bubbly-launching-dolphin.md` per the hook's own redirect rule. Mirror to C: happens via c-to-h-mirror in the other direction; the H: path is canonical here.
