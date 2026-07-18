# COMMAND-KERNEL-MS0/U-CK26-PRODUCER — [MAIN] [COMMAND-KERNEL-MS0]/U-CK26-PRODUCER (slot:foxtrot): psk record real command-invocation producer

**Commit:** `202b2ae892ab` · **By:** markjvillanueva3-cloud · **At:** 2026-05-19T10:45:38-05:00
**Tags:** command-kernel-ms0, u-ck26-producer, auto-distilled

## Subject
[MAIN] [COMMAND-KERNEL-MS0]/U-CK26-PRODUCER (slot:foxtrot): psk record real command-invocation producer

## Body
```
[MAIN] [COMMAND-KERNEL-MS0]/U-CK26-PRODUCER (slot:foxtrot): psk record real command-invocation producer

Closes the ghost-orphan class: psk.mjs syscall_record (canonical writer)
EXISTED + correct but had ZERO producer wired. state/shared/pipeline-
telemetry.jsonl was 100% test data, starving CK27/28/29 (adaptive-
thresholds, auto skill-tier loop, outcome -> memory).

This hook IS the producer. PostToolUse "Skill" matcher fires on every
slash-command / model-invoked skill -- the precise deterministic signal
(UserPromptSubmit prompt-parsing would miss model-invoked skills AND
double-count). Spawns the canonical psk CLI DETACHED / fire-and-forget so
the fleet hot path (13 concurrent chats x N skill invocations) never
blocks; hook returns {continue:true,suppressOutput:true} in <5ms.

Per-file scrutiny: 2-reviewer x 2 files = 4 agents in parallel; rd-1
yielded 2 P1s (1 per file), both fixed and verified:

  P1-hook (arm B): a skill literally named `--telemetry-file` would
  collide with psk's argv parser (it accepts `--key value` form). FIX:
  use `--key=value` form for every string-valued flag (lexically
  unambiguous; psk parseArgs splits at first `=`). New test
  "recordViaPsk: P1 GUARD" pins the invariant.

  P1-test (arm B): hermetic-fake E2E inherited PRISM_TELEMETRY_PATH from
  parent env -- could mask a regression where the hook writes the live
  jsonl directly. FIX: explicit `delete hermeticEnv.PRISM_TELEMETRY_PATH`
  before spawn; mtime/size oracle now anchored to the canonical path.

Tests: 22/22 PASS via `node --test`. Real-writer E2E exercises producer
-> canonical writer -> tmp jsonl end-to-end, parses the emitted
`command_invoked` event, confirms chatId in extra. 3 fail-on-revert
regression guards (spawnSync absence, stdio:'ignore'+detached:true, no
case-fold in deriveChatId).

Wiring: PostToolUse new "Skill" matcher (timeout 2000ms) added in BOTH
C:\Users\Mark Villanueva\.claude\settings.json AND H:/.claude/settings.json
(canonical C: edit + manual H: mirror; c-to-h-mirror hook also auto-
propagates C: -> H: on future edits). JSON-validated.

Spec reuse (R8): consumes existing psk.mjs syscall_record + parseArgs +
PRISM_TELEMETRY_PATH knob; produces no new dispatcher action (the hook
IS a producer for a consumer that already exists).

Per-spec: build queued for fresh-context iter per comprehensive-build-
enforce cut-off rule was honored -- THIS is that fresh-context iter.

Also includes:
- state/shared/specs/FOXTROT-TASKS-PENDING-2026-05-19.md -- compiled
  inventory of last night's foxtrot work (7 units shipped across 4
  milestones; 1 P0 backend-dev tribal unit queued: U-VOICE-CAPTURE).

Doc-reflection (wiki + CLAUDE.md Recent regressions + memory) deferred
to next iter to keep this commit focused; the hook + tests + wiring +
foxtrot compile are the load-bearing deliverables.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .claude/hooks/command-telemetry-record.mjs         | 253 ++++++++++++
- .../__tests__/command-telemetry-record.test.mjs    | 427 +++++++++++++++++++++
- .../specs/FOXTROT-TASKS-PENDING-2026-05-19.md      |  47 +++
- 3 files changed, 727 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 202b2ae892ab`
- Milestone envelope: `mcp-server/data/milestones/COMMAND-KERNEL-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._