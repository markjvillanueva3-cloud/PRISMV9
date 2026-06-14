---
name: reference-autocompact-autonomous-ms0-2026-05-15
description: "AUTOCOMPACT-AUTONOMOUS-MS0/U-AAM01 (commit 1f76f0355) — 4-gap fix that makes /compact → SessionStart:compact → first prompt fully autonomous. User pinned CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=95 (Gap 1). Gap 2: precompact-auto-trigger SOFT/HARD bumped 800K/900K→880K/940K (reclaims 6% of context). Gap 3: session-start-auto-resume now appends concrete /checkin --topic <slot>-<topic> NEXT ACTION block (auto-unstaged due to peer claim, edit live on disk). Gap 4: per-agent-handoff.mjs auto-resolves slot frontmatter from chat-slots.json lookup by chatId. Gap 5: session-start-terminal-pin.mjs warns on slot drift (reads handoff frontmatter vs current claim). Knobs: PRISM_AUTO_RESUME_NO_CHECKIN=1 / PRISM_TERMINAL_PIN_NO_MISMATCH_WARN=1."
aliases: reference_autocompact_autonomous_ms0_2026_05_15
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.024Z
---


# AUTOCOMPACT-AUTONOMOUS-MS0/U-AAM01 (2026-05-15)

**Commits:** `1f76f0355` (3 files) + Gap 3 followup deferred (peer-claim contention on `session-start-auto-resume.mjs`; edit is live on disk regardless).

## Originating user audit (verbatim user question)

> "did we change the claude cli settings so that we use up the entire 1m token limit and design the precompact session handoff the be the exact size just before internal claude cli auto compaction turns on? then autocompaction continuation auto injects /checkin and all relevant pipelines and tools to continue where we left off from previous compaction in same chat? you probably need a setting or a skill/hook in place for the session hand off to include what checkin slot to connect to"

The audit revealed 5 concrete gaps. User closed Gap 1 directly (env var). I shipped Gaps 2-5.

## Gaps and fixes

### Gap 1 — `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` (closed by operator)

User pinned `"CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "95"` at line 19 of `C:/Users/Mark Villanueva/.claude/settings.json` env block. CLI autocompact now fires at ~950K instead of default ~92%.

### Gap 2 — `precompact-auto-trigger.mjs` threshold defaults (shipped)

Before: SOFT=800K, HARD=900K. With CLI firing at 950K, that left 50K HARD→CLI buffer but wasted 60K of context (~6%) below the SOFT threshold.

After: SOFT=880K, HARD=940K. 10K HARD→CLI buffer for handoff write; ~70K SOFT→HARD window for the chat to plan and write the handoff before HARD blocks. Env overrides (`PRECOMPACT_SOFT_TOKENS`, `PRECOMPACT_HARD_TOKENS`) still respected.

### Gap 3 — `session-start-auto-resume.mjs` auto-invokes /checkin (shipped, commit deferred)

Before: hook injected ONLY the RESUME body text. Operator had to manually run `/checkin` post-compact to re-claim slot + refresh pipelines.

After: hook appends a `## ▶ NEXT ACTION\n\nInvoke /checkin --topic <slot>-<topic> to re-claim slot <slot> and refresh pipelines...` block when handoff frontmatter has slot+topic. Falls back to generic `/checkin` directive when missing. Disable: `PRISM_AUTO_RESUME_NO_CHECKIN=1`.

E2E verified: handoff write produces `slot: alpha` frontmatter → auto-resume reads it → emits `Invoke /checkin --topic alpha-aam01-e2e to re-claim slot alpha and refresh pipelines (master-index, build-state, awareness-snapshot, chat-bus)`.

**Commit status:** deferred. Peer claude-2081f435 claimed the file 9m before my commit attempt, doing the SAME conceptual fix (their "slot-binding-truth" 3-layer). They explicitly stated in chat-bus they'd skip Layer A (this file) because I held it. The auto-unstage hook doesn't know about chat-bus negotiation — claim TTL is 30m. Edit is functionally LIVE on disk regardless; runtime behavior is correct.

### Gap 4 — `per-agent-handoff.mjs` slot frontmatter (shipped)

Before: `slot:` field in handoff frontmatter was always empty for alpha..foxtrot chats. Only golf had it populated (U-CLEANUP-A4 filename-remapping behavior). Post-/compact recovery couldn't read prior slot from the handoff.

After: priority order — (1) explicit `--slot` flag wins (preserves golf behavior), (2) `chat-slots.json` lookup by `chatId` at write time (NEW, auto-populates for alpha..foxtrot), (3) empty (no binding known). Fail-soft on lookup errors.

E2E verified: `node per-agent-handoff.mjs write --terminal claude-6eac1b66 --topic alpha-test ...` produces frontmatter with `slot: alpha`.

### Gap 5 — `session-start-terminal-pin.mjs` slot-drift warning (shipped)

Before: if my chat's prior slot got taken by a peer during a crash/compact window, terminal-pin silently claimed a different slot. No warning.

After: NEW path reads the most recent `HANDOFF-<chatId>-*.md` for THIS chat, extracts `slot:` from frontmatter (uses Gap 4's populated field), and if current claim ≠ prior slot, emits loud `additionalContext` with:
- The exact `chat-slots.mjs claim --preferSlot <prior> --force --confirmRecent` command
- `fleet-status.mjs` reference to check who took it
- "Live with current slot" alternative (`/checkin --topic <new>`)

Disable: `PRISM_TERMINAL_PIN_NO_MISMATCH_WARN=1`.

## End-to-end autonomous flow (now)

1. Chat works normally; tokens climb past 880K (SOFT) → `precompact-auto-trigger` injects nudge
2. Tokens climb past 940K (HARD) → tool calls blocked unless `/precompact` ran (writes handoff)
3. `/precompact` skill writes handoff via `per-agent-handoff.mjs` — frontmatter now has `slot: alpha` (Gap 4)
4. Tokens approach 950K → CLI autocompact fires (Gap 1)
5. Post-compact chat spawns → `session-start-terminal-pin` re-binds slot via window-id
6. `session-start-auto-resume` (matcher:"compact") reads handoff → emits RESUME body + `## ▶ NEXT ACTION: /checkin --topic alpha-<topic>` (Gap 3)
7. If terminal-pin claim landed on different slot than handoff (peer took it) → loud drift warning (Gap 5)
8. Model reads NEXT ACTION → invokes `/checkin --topic alpha-<topic>` → slot re-claimed + pipelines refreshed (UserPromptSubmit hooks fire: master-index, build-state, awareness-snapshot, ollama-pipeline-injector, etc.)
9. Work resumes from RESUME directive

## Knobs

| Knob | Default | Effect |
|------|---------|--------|
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | `95` (operator-pinned) | CLI autocompact threshold |
| `PRECOMPACT_SOFT_TOKENS` | `880000` (was 800K) | Soft inject threshold |
| `PRECOMPACT_HARD_TOKENS` | `940000` (was 900K) | Hard block threshold |
| `PRISM_AUTO_RESUME_NO_CHECKIN` | unset | Set `=1` to skip auto-/checkin injection |
| `PRISM_AUTO_RESUME_MAX_AGE_MIN` | `720` (12h; was 240/4h until F5 2026-06-08) | Drop handoffs older than this |
| `PRISM_AUTO_RESUME_DISABLE` | unset | Disable auto-resume entirely |
| `PRISM_TERMINAL_PIN_NO_MISMATCH_WARN` | unset | Set `=1` to skip slot-drift warning |

## Files

- `H:/prism/.claude/helpers/per-agent-handoff.mjs` (Gap 4 — slot frontmatter resolver)
- `H:/prism/.claude/hooks/session-start-auto-resume.mjs` (Gap 3 — /checkin directive injection; edit live on disk, commit deferred)
- `H:/prism/.claude/hooks/session-start-terminal-pin.mjs` (Gap 5 — slot-drift warning)
- `H:/prism/.claude/hooks/precompact-auto-trigger.mjs` (Gap 2 — threshold defaults)
- `C:/Users/Mark Villanueva/.claude/settings.json` (Gap 1 — env var pinned by operator)

## Related

- [[reference_session_continuity_stack_2026_05_15]] — the 2026-05-15 foundation this milestone builds on
- [[reference_precompact_hook_autowrite_2026_05_15]] — `/compact` auto-precompact handoff writer
- [[reference_ollama_pipeline_ms0_2026_05_15]] — earlier ship same session
- [[feedback_conflict_fork_rule]] — applied to handle the peer-claim collision
- [[feedback_chat_bus_post_before_edits]] — coordination pattern that resolved the Gap 3 conflict
