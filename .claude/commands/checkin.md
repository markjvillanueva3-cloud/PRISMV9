---
name: checkin
description: Slot-claim + drift + commit-hygiene + position via the psk `checkin` composite syscall. Args after /checkin are the primary work order — slot-claim is a minimal silent preamble before acting on them.
trigger:
  autoSuggest:
    keywords: ["checkin", "check in", "claim a slot", "fleet slot", "which chat am i", "login to the fleet", "start a development pipeline", "begin a unit", "begin loop", "start loop"]
triggers:
  - event: UserPromptSubmit
    matcher:
      type: keyword
      value: "checkin|/checkin|claim slot|fleet checkin|fleet check-in"
    score: 0.85
    action: suggest
allowed-tools: Bash, Read
maxTurns: 10
composes_with:
  - "/checkin-alpha"
  - "/checkin-golf"
  - "/handoff"
  - "/pick-unit"
  - "/precompact"
  - "/startup"
  - "/system-viz"
consumes:
  - "prism_context:chat_post"
---
# /checkin — fleet slot-claim + drift + commit-hygiene via psk

`psk checkin --subcommand composite` runs reclaim → claim → drift →
commit-hygiene → handoff in one in-process call (drift + hygiene + handoff
parallel after claim). Replaces the legacy 769-line runbook.

**PRIORITY 0 — args ARE the work order:** if `$ARGUMENTS` is non-empty (unit
id, `/loop`, `/goal`, `pick a unit`, filepath), they are the **primary
deliverable** per [[feedback_checkin_args_are_primary_work_order]]. After the
§Report, enter the autonomous loop in [[checkin-loop-fullstack]]. Empty args:
stop after §Report.

**Loop decision (DEVTOOL-AUTOINVOKE-MS0/U8):** at each iteration boundary, do NOT eyeball "continue vs stop" — call the sound decision core via `[[loop-decision]]`: `node .claude/helpers/loop-state.mjs next --session <sid>` returns `planningAction.action` ∈ continue|rerank|replan|stop (thresholds: RERANK at 3-window mean<0.4, REPLAN at 2 fails, MAX_REPLANS 3, budget/roll-cap stop). Tick each iter with the real numeric eval: `loop-state.mjs tick --eval-score <0..1>` (from `run-verification-channel.mjs` exit) so the loop improves (each-pass-feeds-next).

**Executor routing (token economy):** while working the order, resolve each step's lane via the `/smart` executor contract (`resolveExecutor` in `.claude/hooks/lib/ollama-cost-router.mjs`) — route mechanical text/code ops (explain · summarize · docstring · classify · lint · diff-summary · error-triage) to local Ollama (`node scripts/ask-ollama.mjs <mode> <file>`, $0); reserve Claude for judgment + safety (R5); isolate COMPLEX multi-file units in worktree subagents. Fail loud + keep the step on Claude if `:11434` is down.

## Run

```bash
node H:/prism/.claude/kernel/psk.mjs checkin --pretty --subcommand composite \
  --branch "$(git -C H:/prism rev-parse --abbrev-ref HEAD 2>/dev/null)" --activity checkin
```

Bare `/checkin` does a normal slot claim. To force-take a specific slot from a
stale owner, use a NATO wrapper (`/checkin-alpha` … `/checkin-mike`) — those
add `--preferSlot <nato> --force true --confirmRecent true`. A degraded
sub-step still returns exit 0 — inspect `degraded` + `errors[]`.

## §Report (only expand sections with a finding)

**Identity** slot · branch · sessionId · `alreadyOwned` · **Drift**
(if `composite.drift.drift.length > 0`) · **Hygiene** uncommitted/staged/ahead-behind
(if non-clean) · **Errors** any `composite.errors[]` (always when present).

**Resume** — `composite.handoff` carries this slot's last handoff, read by the
durable `slot:` frontmatter field so it survives a full terminal restart (fresh
session-id). If `composite.handoff.ok`, extract the `## RESUME` section from
`composite.handoff.content` and surface it verbatim — that is the prior
session's exit-state; pick up from there. `composite.handoff.error ==
"no_slot_handoff"` = first use of this slot, no prior work (stay silent). Any
other `composite.handoff.error` = the handoff helper failed; note it in one line.

**Resume — sidecar (SLOT-RECOVERY-MS0/U-SR07)** — the per-slot session-history
sidecar at `state/shared/slot-sessions/<nato>.jsonl` is the auto-recorded
session-level history (append-only, schemaVersion 1.0.0) that complements the
hand-curated handoff above. When `composite.handoff.error == "no_slot_handoff"`
OR the handoff is missing a `## RESUME` block, fall back to the sidecar:

```bash
# Last session event for this slot (one-shot CLI fallback while psk.mjs
# doesn't yet expose --include-sidecar):
node -e "import('H:/prism/.claude/helpers/slot-session-sidecar.mjs').then(m=>{const ev=m.readAll(process.argv[1]);if(!ev.length){process.stdout.write('no_sidecar_history');return}const last=ev[ev.length-1];console.log(JSON.stringify({type:last.type,session_id:last.session_id,age_hours:((Date.now()-Date.parse(last.timestamp))/3600000).toFixed(1),clean_exit:last.type==='session-end',last_directive:last.directive||null,iter:last.iter||null,target:last.target||null},null,2))})" <slot>
```

Surface fields: `prior session_id` · `ageHours` · `cleanExit` (true if last event
was `session-end`; false if last event is heartbeat older than the crash-
inferred threshold per U-SR01's 7-condition matrix) · `last directive` ·
`last loop iter/target`. If `cleanExit === false` AND age < 24h, prefer
sidecar resume over handoff — handoff may be pre-crash; sidecar reflects
crash-inferred invariant. See [[reference_slot_session_history_engine_2026_05_25]].

Hooks already injected awareness · master-index · memory-relevance · tribal ·
build-state · close-out-suggest · skill-auto-trigger · ollama prewarm · loop/pick/goal
prereq. Trust the injection. `/checkin-<nato>` wrappers add `--preferSlot/--force/--confirmRecent`.

## Manual fallback (if psk is unavailable)

```bash
node H:/prism/.claude/helpers/chat-slots.mjs reclaim && node H:/prism/.claude/helpers/chat-slots.mjs claim --activity checkin
```

— Hand-tuned 2026-05-19, COMMAND-KERNEL-MS0/U-CK09 (thin psk client; was 769 lines).
