---
name: checkin
description: One-stop development pipeline entry. Claim a slot in the 13-chat PRISM fleet (alpha..foxtrot + hotel..mike work slots + golf hygiene) — bind handoff to slot, reap crashed slots, drift/commit-hygiene check, then EMIT THE FULL DEV PIPELINE for whatever task the operator hands over in the args. Pipeline auto-injects prism-awareness + system-viz + Obsidian-PRISM-OS + tribal knowledge + AI/neural/deep-reasoning routing + CLAUDE.md rules. Files created get registered to /system-viz galaxy. End-of-session precompact/compact/handoff rules are appended automatically so a typed `/checkin <task>` is the only thing the operator needs. With a loop keyword (`/loop`, `autopilot`, `continuous`, `until complete`) it engages a keyword-gated autonomous continuous-work loop — the /autopilot-full + /yolo-mode doctrine rolled into the slot system — that picks units, builds, scrutinizes, commits and re-engages itself across every /compact boundary.
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
---

# /checkin — Fleet Check-In + Drift / Conflict / Commit Guard

Run this in any chat that's one of the ~13 concurrent PRISM chats (12 work slots + 1 hygiene slot). It (a) claims this chat a stable human-readable slot name, (b) makes the per-chat handoff save under that slot, (c) cleans up crashed-slot / stale-claim debris, (d) surfaces anything that would cause a silent overwrite, a roadmap-drift surprise, or a commit collision, and (e) — if you pass `--roadmap` — narrows this chat's work surface to one of the two roadmaps. Auto-fixes the safe stuff; surfaces (with the fix command) the stuff that needs your call.

**Re-run it after every `/compact`** (the slot heartbeat needs refreshing; a compact can also leave a stale index.lock).

## Args: $ARGUMENTS
- *(empty)* — standard check-in; this chat works the full atomized roadmap as a **work slot** (claims the first free work slot — `alpha..foxtrot` or `hotel..mike`).
- `--topic <slug>` — override the auto-derived topic. By default `/checkin` extracts the topic from the most recent commit's `[SCOPE-MS#]` tag — but with 6 chats committing every few minutes that scope can be ANY peer's scope, not yours (this is the 2026-05-14 "I got bound to command-kernel-ms0 but my actual work was git-tree" bug). Pass `--topic git-tree-work` to bind explicitly. Slug should be kebab-case (`worktree-consolidate`, `sfc-calibrate`, etc.); the `<slot>-<topic>` handoff filename is built from this. Auto-derive stays as the fallback when omitted.
- `--force --confirmRecent --preferSlot <name>` — force-take a slot held by another chat that ALSO claimed it within the last 30 s (the recency-guard window). The default `--force` alone is refused with `slot_recently_claimed` to protect against double-claim races during fleet startup; adding `--confirmRecent` is the operator's explicit "yes, I really mean it" override. Use only when you've verified the other chat is genuinely dead or the operator told you to take their slot.
- `--golf` — this chat is the **hygiene slot** (golf). Claim is restricted to the dedicated golf slot — never alpha..foxtrot. Golf is bound by the write-allowlist hook (`golf-slot-write-allowlist.mjs`, U-CLEANUP-A5) and may only touch the exact paths in `FALLBACK_ALLOW`: `state/shared/dashboards/**`, the named ledger JSONLs (`bug-attribution-ledger`, `peer-audit-ticks`, `wiki-inject-misses`, `golf-envelope-mutations`, `system-viz-headline-history`, `DR_DRILL_LEDGER`), the named report dashboards (`HOOK_HEALTH_DIGEST.md`, `WIRING-CANDIDATES-DASHBOARD.md`, `WIKI_LINT_REPORT.md`, `DISPATCHER_CAPACITY.md`, `MEMORY_GARDEN_REPORT.md`, `SKILL_UTILIZATION_REPORT.md`, `HOOK_UTILIZATION_REPORT.md`, `CLAUDE_MD_DRIFT_REPORT.md`, `GSD_FRESHNESS_REPORT.md`, `AWARENESS_HEALTH_DASHBOARD.md`, `SYSTEM_VIZ_LIVEDIFF.md`, `JSONL_CONSUMER_AUDIT.md`), `state/shared/AGENT_CHAT.jsonl`, the golf-owned configs (`golf-*.json`, `.envelope-drift-last.json`, `.watchdog-last-poll.iso`, `.peer-audit-cache.json`, `.cron-locks/*.lock`), `state/shared/system-viz/staging/**`, and `mcp-server/data/state/**.log`. Anything outside that list — including any source code, dispatcher, hook, skill, or test — gets blocked at PreToolUse. Use this for a chat dedicated to fleet hygiene (orphan reaper telemetry, drift-report regeneration, ledger triage, stale-slot reaping, CLOSE-OUT-DEFERRED triage, etc.). Mutually exclusive with `--roadmap`. The hook's block message names the canonical list — always trust the hook's emitted message over this prose when they drift.
- `--roadmap devtools` — this chat is on the **backend-development roadmap** (`BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP`; `track:"devtools"` units) — **the prioritized roadmap, do these first**. Always claims a work slot (`alpha..foxtrot`).
- `--roadmap revenue` — this chat is on the **revenue roadmap** (`REVENUE-ROADMAP-v7.6` §R1–§R10; `track:"revenue"` units) — runs *after* / *behind* the devtools roadmap (`roadmap_priority` 1 vs 0); a revenue chat mostly does low-priority revenue background work until the devtools P0 (the dev tooling) has landed. Always claims a work slot (`alpha..foxtrot`).
- When `--roadmap <name>` is given, Step 7's report adds a **"your slice"** line — your lane's ordered run-list, scoped to that roadmap (feed it to `/run-continuous`). Compute it from `state/shared/atomic-roadmap.json` (`roadmap[]` = every unit · `laneAssignments[]` = which units go to chat 1..6 · slot→chat is **alpha=1 · bravo=2 · charlie=3 · delta=4 · echo=5 · foxtrot=6**; **golf is slot 7 = hygiene, no roadmap-lane assignment**). `--roadmap devtools` → your lane minus revenue, i.e. units with `roadmap_priority === 0` (the BACKEND-DEVTOOLS-RGS6 P0 dev-tooling tracks — `HOOKS-AUTOMATION-V2`, `SKILLS-UTILIZATION`, `AUTO-LEARNING-LOOP`, `COST-CASCADE`, `TOOL-INVENTORY`, `GRAPH-AS-LLM-CONTEXT`, … — sort to the top by tier). `--roadmap revenue` → your lane filtered to `track === "revenue"`. **There is no literal `track == "devtools"` value** — `track` holds the *milestone* track name; devtools-vs-revenue is the `roadmap_priority` field (0 vs 1). The per-chat `state/shared/atomic-roadmap-chat-<N>.md` file is the same list pre-rendered as a table. When `--roadmap` is omitted, the chat sees the full ~3,663-unit roadmap.
- `/loop` · `autopilot` · `continuous` · `/run-continuous` · "until complete" · "until done" · "keep going" · "as long as possible" — any of these in the args **engages the autonomous continuous-work loop** (Step 12): the chat keeps picking pending units, building them (with the mandatory per-file scrutiny gate), committing, and ticking `loop-state.mjs` until it runs out of units, hits a hard blocker, or `/compact` fires — then it auto-resumes itself after the compact. This is the `/autopilot-full` + `/yolo-mode` doctrine rolled into the slot system. Keyword-gated: a bare `/checkin`, or a single bounded `/checkin <task>` with no loop keyword, does NOT loop.
- `--no-loop` — suppress autonomous-loop engagement even when a loop keyword is present. If a loop is already `running` for this chat, `--no-loop` ENDS it (`loop-state end --reason operator-halt`). The operator off-switch for a runaway or unwanted loop.

## PRIORITY 0 — the args ARE the work order (read this before any Step)

If the user's prompt after the `/checkin*` head contains anything beyond
recognized flags (`--topic`, `--roadmap`, `--preferSlot`, `--slot`, `--chatId`,
`--force`, `--confirmRecent`, `--golf`, `--no-loop`, `--no-claim-filter`),
**that free text is the PRIMARY deliverable of this turn** — not the check-in
ceremony. The user typed `/checkin-<slot> <request>` to get `<request>` done;
the slot-bind is plumbing. (The deterministic belt that re-surfaces this — the
`checkin-args-surface.mjs` UserPromptSubmit hook from SLASH-CMD-FIDELITY-MS0/U-SCF01
— injects a `★ USER WORK ORDER` block at the top of every `/checkin*` prompt.
That block IS the work order; treat its absence as "no work order" and treat
its presence as authoritative even if the runbook below seems to want a bare
check-in.)

Therefore:
1. Run Steps 1–6 as **minimal silent preamble** — claim the slot, bind the
   handoff, do the drift/hygiene checks. **Run their bash commands** (those
   emit JSON/state needed by later steps); just **do not print prose
   commentary about them** — the compressed §Report (Step 7) is the only
   operator-visible artifact of the ceremony.
2. Print the **compressed §Report** (Step 7) — 3 lines unless something is
   actionable. The work order is line 2 of even the compressed form.
3. **Then immediately act on the work order.** Never end the turn having only
   run check-in when a request was attached. If the work order contains a loop
   keyword (`/loop`, `/goal`, `/run-continuous`, `autopilot`, `continuous`,
   "until complete/done", "keep going", "as long as possible"), enter the
   Step 12 autonomous loop on THAT task — zero questions, no unit cap,
   bookended with `loop-state.mjs` start/tick/end. **Exception**: if
   `--no-loop` is in the flag-strip, do NOT enter Step 12 — execute the work
   order ONCE without engaging the loop, and end any currently running loop
   per §Args (`--no-loop` calls `loop-state end --reason operator-halt`).
   `--no-loop` always wins over a loop keyword.
4. **Loop-keyword-only args** (e.g. just `/loop` — or any of the loop
   keywords listed in Step 3 — with no task description): the work order IS
   "engage the autonomous loop." Enter Step 12 against the chat's
   previously-bound topic / the atomic-roadmap pickup queue (the Step-12
   default pickup path) — do NOT block waiting for a task string. Same
   `--no-loop` exception as Step 3.
5. **The end-of-turn 3-of-3 scrutiny gate and per-file scrutiny gate still
   apply** to any code the work order causes you to emit. PRIORITY-0 governs
   WHAT to do in the turn, not whether you can stop without scrutiny.
6. **Known caveat — `--topic` validator is loose (until U-SCF04 lands).**
   The U-SCF01 hook's `--topic` validator currently accepts ANY non-flag
   token, so `/checkin-bravo --topic fix the parser bug` consumes "fix" as
   the topic slug and injects "the parser bug" as the work order — losing the
   first verb. Until U-SCF04 tightens the validator to kebab-case, the
   "verbatim work-order text" promise above is FALSE for `--topic <free-text>`
   immediately followed by more args. Workaround: type
   `--topic <kebab-slug>` LAST in the flag list, or omit `--topic` and let
   the auto-derive run.

This is enforced deterministically by the `checkin-args-surface.mjs`
UserPromptSubmit hook (SLASH-CMD-FIDELITY-MS0/U-SCF01) — which re-injects the
extracted work order on every `/checkin*` prompt so it survives `/compact` and
cannot be buried by this runbook. Doctrine: memory
`feedback_checkin_args_are_primary_work_order`. A bare `/checkin` with no
trailing request is unchanged (standard check-in).

## Steps — run all of these, then print the §Report

### 1. Identify this chat
```bash
# STABLE = "claude-" + the 8-hex shown in this session's SessionStart "Chat Isolation: `<8hex>`"
# line (= the leading 8 chars of the UUID in your tool-results path). The stable-session-id.mjs
# helper only resolves this when a *hook* pipes it the session JSON on stdin — a manual skill
# call returns "unresolved", so just read the id off the SessionStart context:
STABLE="claude-<8hex-from-Chat-Isolation-line>"         # e.g. claude-ac4ef13f
#   (or, if you have the full session UUID:
#    STABLE=$(echo '{"session_id":"<uuid>"}' | node H:/prism/.claude/helpers/stable-session-id.mjs) )
BRANCH=$(git -C H:/prism rev-parse --abbrev-ref HEAD 2>/dev/null)

# Topic resolution — PRIORITY ORDER:
#   1. Explicit --topic <slug> arg            (operator intent, always wins)
#   2. Most recent commit's [SCOPE-MS#] tag    (auto-derive, default)
#   3. CURRENT_POSITION.md milestone           (fallback when no commits)
#   4. Last segment of git branch              (last-resort)
#
# IMPORTANT — when 6 chats are committing concurrently, the most recent commit's
# scope is whichever peer landed last. If your real work scope differs from
# what `git log -1` shows, pass --topic <slug> explicitly (see §Args).
TOPIC="<value of --topic if passed, else empty>"
if [ -z "$TOPIC" ]; then
  TOPIC=$(git -C H:/prism log -1 --pretty=%s 2>/dev/null | grep -oiE '\[[A-Z0-9-]+\]' | head -1 | tr -d '[]' | tr 'A-Z' 'a-z')
fi
[ -z "$TOPIC" ] && TOPIC=$(echo "$BRANCH" | sed 's#.*/##')
```

### 2. Reap crashed slots, then claim/refresh this chat's slot
```bash
node H:/prism/.claude/helpers/chat-slots.mjs reclaim                      # sweep slots with >10min-stale heartbeat

# Work-slot claim (default; picks the first free of alpha..foxtrot):
node H:/prism/.claude/helpers/chat-slots.mjs claim --chatId "$STABLE" --branch "$BRANCH" --topic "$TOPIC" --activity "checkin"

# Hygiene-slot claim (only when /checkin was invoked with --golf):
node H:/prism/.claude/helpers/chat-slots.mjs claim --chatId "$STABLE" --branch "$BRANCH" --topic "$TOPIC" --activity "checkin" --preferSlot golf
```
- The result JSON has `slot` (alpha|bravo|charlie|delta|echo|foxtrot|golf) and `alreadyOwned` (true if you'd claimed it before — heartbeat just got refreshed).
- **previousOwner field** — if your claim reclaimed a slot from another chat (crashed-reclaim, stale-reclaim, or force-takeover), the result also carries a `previousOwner` block: `{ chatId, host, pid, branch, topic, activity, claimedAt, lastHeartbeat, ageMs, reason }`. Surface this in §7 so the operator can see who got kicked out — silent overwrites are how slot-thrash hides in the fleet (the 2026-05-14 "alpha disappeared mid-session" bug was invisible until the user pointed it out).
- **Slot roles:** `alpha..foxtrot` are *work slots* (6) — feature commits go here. `golf` is the *hygiene slot* (1) — write-allowlist bound (see `--golf` arg above + `golf-slot-write-allowlist.mjs`).
- If `ok:false, error:"slot_recently_claimed"` → your `--preferSlot --force` targeted a slot that was claimed by another chat within the last 30 s (the recency-guard window). The `details.blockedBy` field names them. If they're genuinely dead or the operator told you to take their slot, re-run with `--force true --confirmRecent true`. Otherwise pick a different slot or wait for the window to expire.
- If `ok:false, error:"fleet_full"` → all 13 slots are held by alive chats; run `node H:/prism/scripts/fleet-status.mjs` to see who, then ask the operator which dead chat's slot to force-take (`... claim --chatId "$STABLE" --preferSlot <name> --force true --confirmRecent true`). The 13 slots cover the design fleet — there is no `legacy-8hex` fallback any more; if you genuinely need a 14th concurrent chat, force-take an inactive slot rather than spawning a nameless chat. **Remember the slot name — call it `$SLOT` below.**

### 2b. Loop-resume detection (autonomous-loop continuity)
Before anything else, check whether this chat is mid-loop — a `/compact` re-fires `/checkin --topic <slot>-<topic>` with NO loop keyword, so loop **continuation** comes from here, not the keyword gate.
```bash
node H:/prism/.claude/helpers/loop-state.mjs reap                        # ages running>4h → "stale", clears old ended loops
node H:/prism/.claude/helpers/loop-state.mjs read --session "$STABLE"    # then read THIS chat's loop
```
`reap` must run FIRST: `read` returns the raw state object, so a >4h-idle loop still reports `status:"running"` until `reap` rewrites it to `"stale"`. Interpret the `read` JSON:
- `{ok:false}` (no state file for this chat) → no loop; no resume.
- `status:"running"` → set `RESUMING=1`; capture `iter`/`target`/`task`. Step 12 re-engages and continues — do NOT call `loop-state start` again (`start` overwrites the file and resets `iter` to 0).
- `status:"stale"` (was running, >4h idle — `reap` just marked it) → do NOT auto-resume; surface it in §Report so the operator runs `/loop` to restart or `--no-loop` to clear.
- `status:"ended"`/`"abandoned"` → no resume. A fresh loop starts only if Step 12's keyword gate fires.
- `$ARGUMENTS` contains `--no-loop` AND a `running` loop exists → `node H:/prism/.claude/helpers/loop-state.mjs end --session "$STABLE" --reason operator-halt`; do NOT re-engage.

The loop-state file is keyed on `--session "$STABLE"` — constant across `/compact` (the SessionStart "Chat Isolation" 8-hex doesn't change), so the loop survives a compact **provided** the precompact handoff wrote a valid `<slot>-<topic>` + RESUME (else the auto-resume `/checkin` never fires and the loop sits orphaned until the 4h `reap`).

**Rule:** the keyword gate engages a *fresh* loop; an active `running` loop-state *resumes* regardless of args. The post-`/compact` auto-fire (`/checkin --topic <slot>-<topic>`) carries no args, so a resumed loop keeps going until it finishes or you explicitly type `/checkin --no-loop`.

### 2c. Worktree routing — slot-branch cutover (SLOT-WORKTREE-MS0)
The fleet commits per-slot: each work slot has a long-lived `slot/<name>` branch checked out at `H:/prism-slot-<name>`; **golf** is the integrator. This step migrates THIS chat onto its slot worktree so it commits to its own branch instead of the shared `cad-fusion-live-ms0`. Kill switch: `PRISM_SLOT_WORKTREE_CUTOVER_DISABLE=1`.

**Skip the cutover (no migration) when ANY of:**
- slot is `golf` — the integrator stays in the main tree `H:/prism` and lands the slot branches. For golf, §Report shows `node H:/prism/scripts/slot-integrator.mjs --status` and the reminder to run `--sync-down` then `--land`.
- the chat is already running inside `H:/prism-slot-<name>` (cwd is already the slot worktree).
- `H:/prism-slot-<name>` does not exist (`node H:/prism/scripts/slot-worktree-bootstrap.mjs --slots <name>` to create it).
- `PRISM_SLOT_WORKTREE_CUTOVER_DISABLE=1` is set.

**Otherwise migrate this chat:**
```bash
# 1. SAFETY — a chat with uncommitted CRITICAL SOURCE work in the main tree
#    must NOT migrate yet: once branch=slot/*, main-tree-write-block denies all
#    H:/prism Edit/Write. Commit/revert that source work first, then re-run.
#    Match SOURCE files only (.ts/.mjs/.tsx) — the shared tree is perpetually
#    dirty with auto-regenerated state JSON + digest .md churn; gating on those
#    would stall the cutover permanently (it would never fire).
rtk git -C H:/prism status --porcelain 2>&1 | grep -E '\.(ts|mjs|tsx)$' | head -5
# 2. If clean → bring the slot branch current with the target, then bind the slot:
node H:/prism/scripts/slot-integrator.mjs --slot "$SLOT" --sync-down 2>&1 | tail -2
node H:/prism/.claude/helpers/chat-slots.mjs heartbeat --chatId "$STABLE" --branch "slot/$SLOT"
```
Once `branch=slot/$SLOT` is bound, three default-on hooks arm for this chat — `main-tree-write-block` (no Edit/Write into `H:/prism`), `git-add-lane-guard` (no `git add` outside the slot worktree), `worktree-commit-route` (commits route to the slot worktree). **For the rest of this session: `cd H:/prism-slot-$SLOT` and do ALL work + commits there**, using `H:/prism-slot-$SLOT/...` absolute paths. Commit to `slot/$SLOT`; golf lands it into `cad-fusion-live-ms0` via `slot-integrator.mjs --land`. If the main tree was dirty (step 1 printed files) → do NOT bind; §Report flags it and you commit/revert in the main tree first, then re-run `/checkin`.

### 3. Bind the handoff to the slot
Make this chat's handoff save as `HANDOFF-<slot>-<topic>.md` so the fleet dashboard + resume picker show the slot name.

A 2026-05 guard (`handoff-writer-ban` in `per-agent-handoff.mjs`) **rejects any handoff write not tagged `--source live-chat`** — it stops hooks/subagents from clobbering real RESUME directives with generic stubs. `/checkin` *is* the live chat, so it may write — but you MUST (a) pass `--source live-chat`, and (b) **read the existing handoff first and preserve its RESUME line verbatim** — only write a fresh one-liner if no handoff exists yet for this chat:
```bash
node H:/prism/.claude/helpers/per-agent-handoff.mjs read --terminal "$STABLE" 2>/dev/null   # → grab its RESUME/next-action line if present
node H:/prism/.claude/helpers/per-agent-handoff.mjs write --source live-chat --terminal "$STABLE" --topic "$SLOT-$TOPIC" \
  --resume "<the existing RESUME line, or a fresh one-line next-action if there was none>" \
  --state "(checkin — slot $SLOT, branch $BRANCH)" \
  || echo "(handoff write skipped — it'll get its $SLOT- prefix on the next /handoff or /precompact)"
```
(If a handoff for this chat already exists under a different name, the `enforce-handoff-topic` Stop hook reconciles it. If the write is still rejected for any reason, don't fight it — the next `/handoff` or `/precompact` from the live chat applies the slot prefix; the slot↔chatId binding itself lives in `chat-slots.mjs` state regardless of the handoff filename, so `fleet-status.mjs` already shows your slot.)

### 4. Read the chat bus (stale-claim reaping is handled elsewhere)
```bash
# Note: agent-coordination.mjs has NO `reap` subcommand (only post|summary|init|poll, plus a
# bare call that dumps state). Stale *slots* were already swept by `chat-slots.mjs reclaim` in
# Step 2; stale file-claims/presences (>10min) surface in the chat-bus-inject block below and
# age out on their own — there's no manual reap to run here.
node H:/prism/.claude/helpers/agent-coordination.mjs 2>&1 | head -3              # who's active, last entry
```
Then look at the `chat-bus-inject` block the UserPromptSubmit hook already surfaced this turn:
- 🔒 **files claimed by OTHER chats** — note them; you must NOT edit or commit those.
- 📨 **unread CLAIMED messages** addressed to you — read them.
- **Active peers (last 10min)** — note their chat-ids + what they're on, so you stay out of their lane.
If the chat bus shows a peer working on a file/scope you were about to touch → pick a different unit, or post a `proposing` message and wait.

### 5. Drift check (roadmap envelopes vs git reality)
```bash
node H:/prism/scripts/build-milestone-progress.mjs >/dev/null 2>&1            # regen the shipped-vs-claimed delta
node H:/prism/scripts/audit-roadmap-drift.mjs 2>&1 | tail -10                 # milestones whose claimed status != git reality
```
- Any milestone listed as drifted = its envelope claims a status git disagrees with. If it's a milestone *you* own → fix it with `/envelope-sync` (proposes the status-flip patch). If it's someone else's → note it on the chat bus, don't touch it.
- Also glance at `state/shared/MILESTONE_PROGRESS.md` for the `shipped` arrays — subtract those from anything you're about to "build" (it may already exist).

### 6. Commit-hygiene check
```bash
rm -f H:/prism/.git/index.lock 2>/dev/null                                       # clear a crashed-git-proc lock
rtk git -C H:/prism status --short 2>&1 | head -20                               # dirty tree? (RTK compresses ~59%)
rtk git -C H:/prism rev-list --left-right --count HEAD...@{u} 2>/dev/null         # "<ahead>  <behind>" vs origin (blank if offline / no upstream)
rtk git -C H:/prism diff --cached --name-only 2>&1                                # anything STAGED? (should be empty at checkin)
rtk git -C H:/prism worktree list 2>&1 | head                                    # confirm you're in the right worktree for your scope
```

**RTK note**: bash output reduction 60-99% on git/gh/npm/tsc/docker — use `rtk` prefix in every /checkin pipeline iteration. Skip only if the output is <500 chars (then RTK is no-op). The hint hook fires on every bash call as a reminder.
Interpret:
- **dirty tree with uncommitted critical files** (engines, schemas, physics, settings, hooks) → don't start new work until those are committed or reverted; the `stop_on_uncommitted_critical` Stop hook will block you otherwise.
- **behind origin** → `git -C H:/prism pull --rebase` *if* it's clean to do so; if there are local commits + conflicts, fork to your own worktree per the conflict-fork rule (`git worktree add ../prism-<scope> -b work/<scope>`).
- **staged files at checkin** → `git -C H:/prism reset HEAD` (you shouldn't be carrying a staged set into a fresh session).
- **wrong worktree** — if your scope is `work/<X>` but you're sitting in the main tree (`H:/prism`) and the main tree is owned by another chat → `git worktree add ../prism-<X> -b work/<X>` and move there.

### 6b. (only if `--roadmap <name>` was given) Compute your run-slice
Map your slot to a chat number (`alpha=1 · bravo=2 · charlie=3 · delta=4 · echo=5 · foxtrot=6`; `golf` is the hygiene slot and has **no roadmap-lane assignment** — `--roadmap` is meaningless with `--golf` and the two are mutually exclusive at the args layer), then pull that lane's units from `atomic-roadmap.json` and scope to the roadmap (`devtools` → `roadmap_priority === 0`; `revenue` → `track === "revenue"`):
```bash
node -e '
const j=require("H:/prism/state/shared/atomic-roadmap.json");
const slot=process.argv[1], roadmap=process.argv[2];
const chatNo={alpha:1,bravo:2,charlie:3,delta:4,echo:5,foxtrot:6}[slot];
const idx={}; j.roadmap.forEach(u=>idx[u.milestone+"::"+u.unit_id]=u);
const lane=(j.laneAssignments.find(l=>l.chat===chatNo)||{units:[]}).units.map(k=>idx[k]).filter(Boolean);
const slice=roadmap==="revenue" ? lane.filter(u=>u.track==="revenue") : lane.filter(u=>u.roadmap_priority===0);
console.log(`${roadmap} slice: ${slice.length} units (of ${lane.length} in lane chat-${chatNo})`);
slice.slice(0,10).forEach((u,i)=>console.log(` ${i+1}. [t${u.tier}] ${u.milestone} / ${u.unit_id??"(no id)"} — ${(u.title||"").slice(0,70)}`));
' "$SLOT" "<devtools|revenue>"
```
(The same list pre-rendered as a table is `state/shared/atomic-roadmap-chat-<N>.md` — feed either to `/run-continuous`.)

### 6c. BUILD_STATE summary (NEW — 6-chat-safe atomic regen)
```bash
# Refresh + read 1-line summary
node H:/prism/scripts/build-state-snapshot.mjs >/dev/null 2>&1
node -e "const s=require('H:/prism/state/shared/BUILD_STATE.json'); const h=s.headline||{}; console.log('BUILD_STATE: '+(h.enginesWired||0)+' wired · '+(h.enginesUnwired||0)+' unwired · '+(h.envelopeDrift||0)+' envelope-drift · '+(h.frontendsPending||0)+' frontend-merge');" 2>&1 | head -3
```
Surface this in the Report below as the `build_state:` line — operator-facing
fleet snapshot.

### 6d. Obsidian recent learnings (top-3 — what just landed in the vault)
```bash
# 3 most recent memory entries (most recently mtimed in the memory dir):
ls -t "C:/Users/wompu/.claude/projects/h--prism/memory/"*.md 2>/dev/null | head -3 | while read f; do
  echo "  • $(basename "$f"): $(head -1 "$f" | sed 's/^# *//')"
done
```

### 6e. System-viz refresh ping (best-effort)
```bash
( curl -fsS -X POST http://localhost:8765/api/refresh -m 2 >/dev/null 2>&1 & ) || true
echo "system-viz ping sent (port 8765, fire-and-forget)"
```

### 6f. CLAUDE.md staleness check
```bash
# Either CLAUDE.md modified in last 24h?
node -e "['H:/prism/CLAUDE.md','C:/Users/wompu/.claude/CLAUDE.md'].forEach(p=>{try{const s=require('fs').statSync(p); const ageH=Math.floor((Date.now()-s.mtimeMs)/3600000); console.log(p+': age '+ageH+'h '+(ageH<24?'(FRESH — review for new rules)':''));}catch(e){console.log(p+': MISSING');}});" 2>&1
```
If FRESH: scan the SessionStart `claudeMd` block (already in your context) for
any `## SECTION` header you haven't seen before — surface it in the report as
`claude_md_changed: <yes|no>`.

**Also surface the 3 most recent regressions** so the operator sees known-broken paths BEFORE starting work (matches the dev-tool utilization-audit improvement #3, 2026-05-16):

```bash
# Last 3 entries from CLAUDE.md "## Recent regressions" section. Compact display.
node -e "
const fs = require('fs');
const md = fs.readFileSync('H:/prism/CLAUDE.md', 'utf8');
const start = md.indexOf('## Recent regressions');
if (start < 0) { console.log('  (no recent regressions section)'); process.exit(0); }
const block = md.slice(start);
const end = block.search(/\n## [A-Z]/);
const body = end > 0 ? block.slice(0, end) : block;
const entries = body.split(/\n- /).slice(1, 4);  // first 3 after the header
entries.forEach(e => {
  const first = e.split('\n')[0];
  const head = first.match(/^[\d-]+ \| \*\*([^*]+?)\*\*/)?.[1] || first.slice(0, 100);
  console.log('  • ' + head);
});
" 2>&1 | head -5
```

Use these as a "watch out" advisory in §Report (`regressions:` line, 1 entry per row). NOT a blocker — informational.

### 6g. Local-compute health (Ollama + Docker services)
Shipped 2026-05-15 (OLLAMA-PIPELINE-MS0). Probes Ollama daemon + Docker engine + Qdrant + Postgres + Prometheus. Single line output; underpins the §Report `local_compute:` line and gates the new pipeline hooks (`ollama-pipeline-injector`, `ollama-prewarm-on-pipeline`).
```bash
node H:/prism/scripts/ollama-docker-health.mjs           # one-line text
node H:/prism/scripts/ollama-docker-health.mjs --json    # machine-readable
node H:/prism/scripts/ollama-docker-health.mjs --require ollama,qdrant  # exit 1 if any required service is down
```
**What it tells you:**
- Ollama up + model count + how many are warm in VRAM. If `0 warm`, the first hook call will cold-start (~3s for qwen2.5-coder:7b, ~12s for qwen2.5-coder:32b).
- Docker engine responsive (`docker ps -q`).
- Qdrant (port 6333), Postgres (`postgres-prism` container), Prometheus (port 9090) status.

**If Ollama is down:** `node H:/prism/mcp-server/scripts/ollama-docker-launcher.mjs --services=ollama --skip-pull` (background spawn, idempotent). Surface as a §Report warning, not a block.

**If Docker engine is unresponsive (500 errors on `docker ps`):** advise `wsl --shutdown && wsl` then restart Docker Desktop. The launcher's status file at `state/shared/DOCKER_RUNTIME_STATE.json` will confirm last-known-good.

**⚠ SEMANTIC LAYER OFFLINE alert (NEW — obsidian-2nd-brain audit gap #3, 2026-05-16):** when the health probe reports Qdrant ✗, the 2nd-brain READ surfaces silently no-op:
- `error-block-prewarn.mjs` (recalls similar prior errors from Qdrant) → returns 0 hits
- `wiki-precheck-inject.mjs` cosine fallback (semantic vault search) → BM25-only, no paraphrase pull
- `xproc_episodic_recall` / `xproc_outcome_retrieve_similar` (cross-process episodic memory) → throws + caught silently
- All neural-recommend / cot_reason calls using Qdrant-cached embeddings → cache-miss every call

This means /checkin running with Qdrant down operates on **a degraded 2nd-brain** — BM25-only keyword recall, no semantic paraphrase, no episodic similarity. Surface in §Report as `semantic_layer:` line. Operator needs to know — silent degradation is exactly the "named-not-invoked" regression class the audit memo formalized. Fix is `cd H:/prism/mcp-server && node scripts/ollama-docker-launcher.mjs --services=qdrant --skip-pull` (background-spawn, idempotent).

### 6h. Fleet activity + handoff suggestions (NEW — SYSTEM-VIZ-BRAIN-MS0/U-P5-CHECKIN-FLEET-CONTEXT)
Surfaces what every other chat in the fleet is actually working on AND stale-but-actionable handoffs a fresh chat could pick up. Composes the existing `chat-slots.mjs`, `fleet-status.mjs`, `loop-state.mjs list`, and the per-agent handoff dir into ONE block — especially valuable when a fresh chat does /checkin and needs to decide between (a) continuing a peer's abandoned work, (b) offering to help a struggling peer, or (c) picking something new without stepping on anyone.

```bash
# (a) Per-slot topic + loop-iter + last commit (one row per slot, includes golf)
node H:/prism/scripts/fleet-status.mjs 2>&1 | head -30

# (b) Active /loop sessions across all slots (target/iter/recent-note)
node H:/prism/.claude/helpers/loop-state.mjs list 2>&1 | head -20

# (c) Stale handoffs (mtime >24h) whose owning chat-id has NO current claim —
#     candidates a fresh chat could pick up. Skips stubs/placeholder RESUMEs.
node -e "
const fs = require('fs'), path = require('path');
const dir = 'H:/prism/state/shared/handoffs';
let slots = {};
try { slots = JSON.parse(fs.readFileSync('H:/prism/state/shared/chat-slots.json','utf8')).slots || {}; } catch {}
const owners = new Set(Object.values(slots).filter(s => s && s.chatId).map(s => s.chatId));
const files = fs.readdirSync(dir).filter(f => /^HANDOFF-claude-[0-9a-f]{8}.*\.md\$/i.test(f));
const now = Date.now();
const stale = files
  .map(f => ({ f, mtime: fs.statSync(path.join(dir,f)).mtimeMs }))
  .filter(({f, mtime}) => {
    const ageH = (now - mtime) / 3600000;
    if (ageH < 24) return false;
    const m = f.match(/HANDOFF-(claude-[0-9a-f]{8})/i);
    return m && !owners.has(m[1]);
  })
  .sort((a,b) => b.mtime - a.mtime)
  .slice(0, 5);
for (const { f, mtime } of stale) {
  const ageH = Math.floor((now - mtime) / 3600000);
  const body = fs.readFileSync(path.join(dir,f),'utf8');
  const resume = (body.match(/## RESUME\n([\s\S]*?)(?=\n## |\$)/) || [,''])[1].trim().split('\n')[0].slice(0,100);
  if (resume && !/^\(?TODO|^placeholder|^stub/i.test(resume)) {
    console.log('  ' + f + ' (' + ageH + 'h old) → ' + resume);
  }
}
"
```

Surface results in §Report below as `fleet topics:` (active slots showing topic+iter), `fleet loops:` (slots in /loop with iter/target/age), and `pickup candidates:` (stale handoffs the operator could redirect this chat to). Use `--skip-fleet-context` to disable when running under high contention.

**Composition note:** this step is read-only on every existing surface — no new state file, no new lock, no peer-claim conflict. All failures degrade gracefully (missing input = empty section, never blocks /checkin).

### 6i. Tribal knowledge pull (NEW — utilization-audit improvement #2, 2026-05-16)

> **SUPERSEDED by §6k (2026-05-16).** §6k fires tribal recall via local compute + Ollama distill (zero Claude tokens) and feeds the same `tribal hits:` §Report line. §6i is kept as the **MCP-surface reference** — the `prism_knowledge:tribal_search` dispatcher path documented here is the fallback when you need a richer/scored query mid-pipeline than §6k's distilled top-3. For the standard check-in, §6k already covers this — do NOT double-invoke.

Reference (MCP path): pull the top-3 tribal tips relevant to the bound topic + any task keywords from `$ARGUMENTS`, surface in §Report so the operator sees experiential warnings BEFORE entering the dev pipeline.

```bash
# Build query from topic + args (skip if no signal)
QUERY="$TOPIC $ARGUMENTS"
# Trim to first 200 chars to keep MCP call cheap
QUERY=$(echo "$QUERY" | tr '\n' ' ' | sed 's/  */ /g' | head -c 200)
echo "tribal query: $QUERY"
```

Then invoke the MCP dispatcher action via the prism_session router (preferred over re-implementing search):
- Direct: `prism_knowledge:tribal_search` with `{ "query": "<QUERY>", "limit": 3, "minRelevance": 0.4 }`
- Fallback: `prism_session:tool_route_best` if the prism_knowledge dispatcher is unreachable
- Last-resort: `prism_knowledge:tribal_suggest` (semantic — uses Ollama embeddings)

The top-3 hits become §Report `tribal hits:` lines (one per row, abbreviated to ~80 chars). Skip if all relevance scores <0.4 (no signal). NEVER blocks /checkin — pure advisory.

**Composition note**: this step also adds value on a SLOT-LOCKED variant (e.g. `/checkin-alpha`) where the topic is forced to `alpha-work` — the query becomes whatever the operator passes as the task directive in `$ARGUMENTS`, which is the strongest signal we have for what tribal context is relevant.

### 6j. AI plan generation on non-trivial args (NEW — utilization-audit improvement #6, 2026-05-16)
Actually USE the `prism_ai:cot_reason` surface that Step 10 documents (today it's only NAMED, never INVOKED). When `$ARGUMENTS` carries a non-trivial task directive, fire CoT reasoning ONCE and inject the 3-step plan into §Report so the operator has a structured approach before entering the dev pipeline.

Heuristic: invoke when ALL of these are true:
- `$ARGUMENTS` length ≥ 50 chars (trivial 1-word args don't need a plan)
- At least one verb match in: ship, build, fix, wire, test, audit, refactor, optimize, extract, complete, replace, harden, distill, sync, restore
- No `--skip-plan` flag

```bash
# Heuristic gate (set HAS_TASK=1 if all conditions met)
HAS_TASK=$([ ${#ARGUMENTS} -ge 50 ] && echo "$ARGUMENTS" | grep -qiE '(ship|build|fix|wire|test|audit|refactor|optimize|extract|complete|replace|harden|distill|sync|restore)' && [ "$1" != "--skip-plan" ] && echo 1 || echo 0)
```

When `HAS_TASK=1`, invoke the MCP dispatcher action:
- Primary: `prism_ai:cot_reason` with `{ "problem": "<ARGUMENTS>", "max_steps": 3, "format": "compact" }`
- Fallback: `prism_intelligence:cognitive_mfg_reason` if prism_ai is unreachable
- Last-resort: `prism_session:tool_route_best` to let the router pick

The top-3 plan steps become §Report `plan:` lines (one numbered step per row, abbreviated to ~80 chars each). NEVER blocks /checkin — pure plan injection. If both primary AND fallback dispatchers fail (e.g. Ollama down), skip silently.

**Composition note**: this is the AI/neural surface complement to step 6i's tribal pull. Together they answer "what did we learn last time?" (6i) + "what's the plan this time?" (6j) BEFORE the dev pipeline starts. The two together are the difference between AI-as-documentation and AI-as-tool-execution.

**Token budget**: cot_reason typically returns 200-400 tokens for compact 3-step plans. The §Report adds ~6 lines. Net cost is small relative to a single dev-pipeline iter.

### 6k. Vault + master-index recall — AUTO-INVOKED via local compute (NEW — 2026-05-16 user directive)

User directive 2026-05-16: *"ensure the checkin slash command pipelines auto invoke every slash command and tool call"* + *"use obsidian and ollama to help with the token cost"*. Steps 8-11 below historically only **NAMED** the master-index / vault / skill surfaces in reference tables — they were never INVOKED ("named-not-invoked" regression class). This step actually fires them, but routes the cost through **local compute** so Claude never pays to search or summarize:

- **Recall** runs over local Obsidian/graph indexes (system-graph via `system-viz-query.mjs`, the wiki `index.md`, the 240 memory `.md` files, `.claude/commands/*.md`) — **zero Claude tokens**.
- **Distill** is offloaded to local **Ollama** (`qwen2.5-coder:7b` via curl — node `fetch` to :11434 fails on this box, the helper uses a curl subprocess per OLLAMA-PIPELINE-MS0). Claude only ever reads the ≤3 distilled bullets per source.

Single composition point — fire ALL of these every /checkin (always-fire per user; each degrades to a one-line skip if its index/Ollama is down, NEVER blocks):
```bash
Q="$TOPIC $ARGUMENTS"
for SRC in master-index memory wiki skill tribal; do
  echo "[$SRC]"
  node H:/prism/scripts/checkin-recall.mjs recall --source "$SRC" --query "$Q" --limit 3 --ollama-distill 2>&1
done
```
Map the output into §Report: `master-index:` / `vault recall:` (memory+wiki) / `skills matched:` / `tribal hits:` (this supersedes the Step 6i manual tribal call — same data, now Ollama-distilled). If Qdrant is ✗ (see §6g), this local path is the ONLY working recall — it does not depend on Qdrant.

### 6l. Deterministic High-ROI auto-match gate (NEW — converts the passive checklist to an enforced gate)

The "High-ROI features" table at the end of this skill was a passive *"invoke ANY that match"* suggestion — category-3 surfaces (`prism_safety:*`, `/forge-audit-v2`, `prism_omega:compute`, ATCS, …) that must NOT all fire unconditionally (token blowout + semantically wrong) but MUST fire when the task actually warrants them. This step makes the match **deterministic**: a programmatic scan of `$ARGUMENTS`+`$TOPIC` prints exactly which conditional surfaces are mandatory this run.
```bash
node H:/prism/scripts/checkin-recall.mjs roi-gate --args "$ARGUMENTS" --topic "$TOPIC" 2>&1
```
Every surface it prints as `MUST invoke:` is **mandatory before declaring the pipeline complete** — surface them in §Report as the `must-invoke:` line and actually invoke each during the dev pipeline (e.g. a cutting-physics task → `prism_safety:*` is non-optional). Empty output = no conditional surface triggered (the common case for a bare check-in).

### 7. Report — compressed by default

**Print this 3-line form (the common case — clean check-in, work order present).**
Substitute every `$SLOT` / `<…>` token with the actual value; render union
types (`<a|b|c>`) as one of the listed alternatives, not the literal placeholder:
```
/checkin: slot=<bound-slot> · <clean|N dirty> · drift=<n> · loop=<none|RESUMING i/t|will-engage> · <K peer-claims> · verified=<comma-list of silent-clean dimensions, names match verbose-box row prefixes: tree,staged,drift,chat-bus,slot-cutover,loop-state,local-compute> · verdict=<✅ CLEAR|⚠>
▶ WORK ORDER: <the work-order text from the ★ USER WORK ORDER injection (or args after flag-strip), verbatim — or "(none — standard check-in)">
→ <if work order: "acting on it now" (then DO it — Priority 0) | if ⚠: the 1-3 fix commands | if clean+no-args: "ready">
```

The `verified=` token closes the silent-omission ambiguity: it lists every
silent-clean dimension you actually checked. Operators see "verified=tree,staged,drift,chat-bus,slot-cutover,loop-state,local-compute"
and know nothing was skipped. A dimension MISSING from `verified=` was not
checked (either a tool failed or the chat truncated early); that's a soft
signal to re-run, not silent success.

**Expand a field to its own line ONLY when it is actionable** (non-nominal).
The actionable conditions are:
drift>0 · tree dirty with critical files · staged files present · `prev owner`
present · Qdrant/semantic_layer ✗ · loop `stale` · `pickup cands`>0 ·
slot-cutover blocked (main-tree dirty) · a `must-invoke:` surface triggered.
A nominal field (clean, drift=0, no peers, loop none) is omitted from
expansion but MUST appear in the `verified=` list above. Example expanded
line: `prev-owner: claude-abc123 (kicked 3s ago, reason=force-takeover, topic=git-tree)`.

**Print the full reference-box format below ONLY** when the operator passed
`--verbose`, set `PRISM_CHECKIN_VERBOSE=1`, or 3 or more of the actionable
conditions above fire. Otherwise the box is suppressed entirely — the
compressed 3-line form is the only output. The box is documentation for what
fields exist, not required output every run.

**Reference: verbose box format** (gated above — do NOT print this block
unless one of the three conditions fires; the model is the gate, not the
markdown renderer):
```
┌─ /checkin ─────────────────────────────────────────────
│ slot:        $SLOT  ($([ alreadyOwned ] && echo refreshed || echo newly claimed))
│ chat id:     $STABLE
│ branch:      $BRANCH        worktree: <path>
│ slot-cutover: <§2c — migrated → H:/prism-slot-<slot> (slot/<slot>) | golf — integrator, main tree | ⚠ main-tree dirty — commit then re-run /checkin | already in slot worktree | disabled>
│ handoff:     HANDOFF-$SLOT-$TOPIC.md
│ topic src:   <"--topic arg" | "commit scope" | "branch fallback">
│ prev owner:  <only if previousOwner present>
│                $previousOwner.chatId ($previousOwner.reason, last seen $previousOwner.ageMs ms ago)
│                  topic=$previousOwner.topic  activity=$previousOwner.activity
│ fleet:       <N>/13 slots alive — <list: alpha=…, bravo=…, …, golf=…, …, mike=…>
│ chat bus:    <K> peer file-claims · <M> unread msgs · <P> active peers
│ drift:       <D> milestone(s) drifted  [✓ none  |  ⚠ <ids> — /envelope-sync if yours]
│ tree:        <clean | dirty: N files>  ·  origin: <ahead A / behind B | offline>
│ staged:      <empty | ⚠ N files staged — git reset HEAD>
│ local_compute: <one-line from §6g — Ollama+Docker+Qdrant+Postgres+Prometheus>
│ semantic_layer: <only if Qdrant ✗> ⚠ OFFLINE — error-prewarn/wiki-cosine/episodic-recall all silent no-op
│ regressions:    <top-3 from CLAUDE.md "## Recent regressions" — bold-title only, "watch out" advisory>
│ master-index:   <§6k — top-3 system-graph hits for topic+args, Ollama-distilled>
│ vault recall:   <§6k — top-3 memory+wiki hits, Ollama-distilled (local, 0 Claude tokens)>
│ tribal hits:    <§6k — top-3 tribal hits, Ollama-distilled (supersedes the old §6i manual call)>
│ skills matched: <§6k — relevant /skills for topic+args>
│ must-invoke:    <§6l roi-gate — conditional surfaces MANDATORY this run [✓ none | • prism_safety:* | …]>
│ plan:           <only if HAS_TASK=1> <3-step CoT plan from prism_ai:cot_reason — 1 step per row, ~80 chars>
│ fleet topics:   <slot=topic, slot=topic, … — one line summary of who's working on what>
│ fleet loops:    <slot iter/target (age), … — only slots currently in /loop>
│ loop:        <none | RESUMING iter N/target — "<task>" | will-engage: "<task>" | ⚠ stale — /loop or --no-loop>
│ pickup cands:   <K> stale-but-actionable handoff(s)  [✓ none  |  → top: <file> "<RESUME excerpt>"]
│ your slice:  <only if --roadmap given> <N> <roadmap> units in your lane — #1: <ms/unit — title>
│ verdict:     ✅ CLEAR — go  |  ⚠ <one-line: what to resolve first>
└────────────────────────────────────────────────────────
```
If the verdict is ⚠, the compressed line 3 lists the 1-3 concrete next actions; don't start work until they're resolved. **If the verdict is ✅ AND the user's prompt after `/checkin*` carries a work order (i.e. the `★ USER WORK ORDER` block is present), immediately act on it per PRIORITY 0** — do not stop after printing the report.

## Notes
- Slots are NATO-phonetic (13 total, expanded 2026-05-16 to support `/checkin-<slot>` for the full NATO alphabet through Mike): **alpha · bravo · charlie · delta · echo · foxtrot · hotel · india · juliett · kilo · lima · mike** are **work** slots (default auto-claim picks the first free one), and **golf** is the historically-hygiene slot (claimed only with `--golf` for original allowlist semantics; usable as a work slot via `/checkin-golf` if the operator bypasses `golf-slot-write-allowlist.mjs` via `PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1` or disabling the hook). A 14th chat returns `fleet_full` — force-take an inactive slot instead of spawning a nameless one. Terminal-window pinning ([[reference_session_continuity_stack_2026_05_15]]) makes up to 13 PowerShell windows resolve to deterministic slots — same window → same slot across /compact and /clear. Operator shortcut: `/checkin-<slot>` claims a specific slot directly (force-takes the prior owner; topic auto-set to `<slot>-work`).
- The slot binding lives for the chat's lifetime or until its heartbeat goes >10min stale (then it's auto-reclaimed). `/checkin`, `/handoff`, `/compact` refresh the heartbeat manually — but as of 2026-05-14, the **`heartbeat-keepalive.mjs` UserPromptSubmit hook** (T3, knob `PRISM_HEARTBEAT_KEEPALIVE_DISABLE=1`) refreshes it automatically on every prompt when the heartbeat is older than 60 s. The 2026-05-14 "alpha disappeared after 17 min of user think-time" bug is what motivated the hook; with it active, slots stay alive across user idle gaps as long as the chat is responsive at all. The hook is silent on success — operators only see it surface in fleet-status when an idle chat's heartbeat refresh-ages stays <60s instead of climbing toward the 10min reclaim threshold.
- Companion commands: `/who` (just your identity), `node scripts/fleet-status.mjs` (the boxed fleet dashboard, `--watch` to live-tail), `/six-chat-bootstrap` (the ONE-time master setup that assigns 6 phases to 6 slots — different thing, run once not per-chat), `/six-chat-commit-consensus` (the commit gate for the 6-chat protocol), `/handoff` (session-end), `/precompact` (before /compact).
- `/checkin` always claims/refreshes the slot + runs the drift gate. When `/checkin` is invoked WITH task descriptions in the args (e.g. `/checkin /loop  read H:\last.md and complete all units`), it ADDITIONALLY emits the full dev pipeline below. Without args it stops at the §Report and lets you decide what to do.

---

# THE DEV PIPELINE — emitted when /checkin has a task argument

When `$ARGUMENTS` contains a task/unit/loop/goal directive (heuristic: contains any of `/loop`, `/goal`, `/pick-unit`, `/pick-dev`, `autopilot`, `continuous`, `/run-continuous`, `keep going`, `keep working`, `as long as possible`, `until complete`, `until done`, `unit`, `task`, `complete`, `ship`, `build`, `wire`, or a verbatim filepath), Claude proceeds through the steps below INSTEAD OF stopping at the §Report. The loop/continuous keywords additionally engage the **Step 12 autonomous loop**; the others run the pipeline once. The §Report still runs first — drift/dirty-tree blocks still apply.

> **⚙ AUTO-INVOKED, not named-only (2026-05-16).** The recall/index/AI surfaces tabled in Steps 8-11 are **already fired** by §6k (master-index + memory + wiki + skill + tribal recall, Ollama-distilled) and §6l (deterministic High-ROI gate) above — results are in §Report (`master-index:` / `vault recall:` / `tribal hits:` / `skills matched:` / `must-invoke:`). Steps 8-11 below are the **WHAT-reference** (the catalog of every surface + when to drill deeper / re-fire), NOT a passive menu. The recall+distill ran in **local compute** (Obsidian indexes + local Ollama) so reading them costs Claude ~15 lines, not a search+summarize pass. Per the user directive, nothing in this pipeline is "named-but-never-invoked" anymore — if you add a surface to a Step 8-11 table, also add it to `checkin-recall.mjs` or the §6l gate so it actually fires.

## Step 8 — Awareness inject (auto-loaded; verify it landed)

The harness UserPromptSubmit hooks already injected these on this turn — confirm by glancing at them:

| Surface | Where it shows up | When to drill |
|---|---|---|
| `claudeMd` block | top of the system reminders | for doctrine rules + recent regressions |
| `master-index pre-search` | top-5 hits matching prompt tokens | for code/wiki entry points |
| `wiki-precheck-inject` | top-3 wiki entries (BM25 + cosine) | when the prompt mentions an unfamiliar concept |
| `awareness-snapshot` | 15-line digest (built/unwired/drift counts) | first thing every turn |
| `BUILD_STATE` injection | engines wired/unwired, frontends pending | before touching ANY engine/dispatcher |
| `MILESTONE_PROGRESS` | shipped vs claimed per envelope | before claiming you'll build something already shipped |
| `pick/checkin prefresh` | staleness of milestone/build-state | check >30m staleness → regen first |
| `/loop awareness` | other active loops in the fleet | avoid stepping on a peer's loop |
| `CLAUDE-BRIEF.md` | full PRISM context (regenerated each SessionStart) | when you need the WHOLE picture |
| `recent regressions` | last 10 known-broken bugs to avoid | always glance at this |

**If any of the above is missing or stale (>30m), re-fire with**:
```bash
node H:/prism/scripts/build-milestone-progress.mjs
node H:/prism/scripts/build-state-snapshot.mjs
node H:/prism/mcp-server/scripts/generate-claude-brief.mjs
```

## Step 9 — /system-viz galaxy as visual master-index

The graph is the canonical visual map. Use it BEFORE Grep/Glob/Agent on any cross-cutting search.

| When | Use |
|---|---|
| "what code touches X" | `prism_session:master_index_query` action OR `/master-index <X>` skill |
| "is this engine wired" | `prism_session:master_index_node_status` action OR check BUILD_STATE injection |
| "what depends on this" | `node H:/prism/scripts/system-viz-query.mjs <node>` |
| "show me the graph" | `/system-viz` (opens browser at :8765, the live 3D map) |
| Add a file → galaxy update | The Stop hook `stop-system-viz-reminder.mjs` (T3, 2026-05-15) reminds at session end. Or fire-and-forget now: `curl -fsS -X POST http://localhost:8765/api/refresh -m 2 >/dev/null 2>&1 &` |
| Full pipeline regen (~8 min) | `node H:/prism/scripts/regen-wiki-from-viz.mjs` |

**Node-to-node wiring + pipeline discovery:**
- `prism_session:dispatcher_map_compact` — full dispatcher graph in <2KB
- `prism_session:action_search <pattern>` — find an action across ~7500 actions
- `prism_session:tool_route_best <task>` — let the router pick the best tool

## Step 10 — Obsidian-PRISM-OS routing (memories / skills / scripts / hooks via AI)

Treat the wiki + memory vault as the second brain. The cognitive layer routes through Ollama (local) and Qdrant (vectors) when available.

| Need | Surface |
|---|---|
| Memory recall on edited file | `memory-relevance` hook auto-injects matching `[[memo]]` entries (PRISM_MEMORY_RELEVANCE=1) |
| Skill auto-suggest | `skill-auto-trigger.mjs` UserPromptSubmit hook reads `_skill-triggers.jsonl` |
| Wiki recall on read | `wiki-recall-on-read.mjs` PostToolUse:Read auto-injects wiki summaries |
| Wiki semantic search | `/wiki-query <q>` (BM25 + nomic-embed cosine fallback) |
| Add to memory | Write `C:/Users/<user>/.claude/projects/H--PRISM/memory/<kind>_<slug>.md` — memory-mirror auto-syncs to vault |
| AI orchestration | `prism_ai:ai_route_mill_pipeline` / `prism_ai:cot_reason` / `prism_ai:scientific_reason` |
| Neural prediction | `prism_ai:neural_recommend` / `prism_ai:neural_route` / `prism_ai:cognitive_neural_synthesize` |
| Deep reasoning | `prism_intelligence:cognitive_mfg_reason` / `prism_ai:ai_mill_agi_reason` |
| Deep learning predict | `prism_ai:ai_milling_deep_reason` / `prism_ai:cad_neural_generate` |
| Tribal-knowledge tips | `prism_knowledge:tribal_search` / `tribal_suggest` / `cognitive_tribal_maximizer_query` |
| Ollama offload (local 7b) | Auto-routed for code summarize/explain/classify (`OllamaHookBridgeEngine`) |
| Qdrant vector recall | `xproc_episodic_recall` / `xproc_outcome_retrieve_similar` |

## Step 11 — CLAUDE.md rules + GSD + skills/scripts/hooks + RTK + context-extension

Always-active layers (verify on every loop iteration — they're cheap):

- **CLAUDE.md** at `H:/prism/CLAUDE.md` (project) + `~/.claude/CLAUDE.md` (global). Doctrine pointers + recent regressions. Auto-injected on every prompt.
- **GSD protocol** via `prism_gsd:core` (dispatcher) or read `mcp-server/data/docs/gsd/GSD_QUICK.md`. Session lifecycle, hook fan-out, command bridge.
- **Skills index** via `prism_skill_script:skill_search` + `/master-index <task>`. ~440 skills auto-injected per SessionStart.
- **Scripts** via `prism_skill_script:script_search`. Re-runnable helpers live in `H:/prism/scripts/` and `H:/prism/mcp-server/scripts/`.
- **Hooks** registry via `prism_hook:list` + `prism_hook:manifest`. PreToolUse / PostToolUse / Stop / SessionStart / UserPromptSubmit.
- **RTK token savings** — prefix bash with `rtk` for 60-99% output reduction on git/gh/npm/vitest/tsc/docker/grep/cat. `rtk vitest run` (99%), `rtk git status` (59%), `rtk gh pr checks` (79%). Skip only if output <500 chars. `/rtk-setup` if not installed.
- **Context extension** — per-chat `state/shared/handoffs/HANDOFF-<slot>-<topic>.md` (13 chats), `MEMORY.md` index (<200 lines), `ENGINE_DIGEST.md` + `DISPATCHER_DIGEST.md` for zero-IO discovery, load-on-demand skills, keyword-gated UserPromptSubmit injections. The /precompact → /compact → SessionStart:compact → auto-resume chain (Step 14) closes the long-running loop.

**REMINDER (slot-claim is mandatory, NOT optional):** Steps 1-7 above MUST run even when /checkin has a task arg. The pipeline (Steps 8-14) is ADDITIVE — never replaces slot-claim. If §Report verdict is ⚠ STOP, do NOT enter the pipeline; resolve the verdict first.

## Step 12 — Autonomous Loop (rolled-in /autopilot-full + /yolo-mode)

The continuous-work engine. This is the `/autopilot-full` + `/yolo-mode` doctrine rolled into the slot system — those two skills stay available standalone for their full forms; this is the slot-native loop.

**Engagement (keyword-gated).** Enter this loop when EITHER:
- `$ARGUMENTS` contains a loop keyword — `/loop`, `autopilot`, `continuous`, `/run-continuous`, "until complete/done", "keep going/working", "as long as possible"; OR
- Step 2b set `RESUMING=1` (an active `running` loop-state exists — continue it regardless of args).

A bare `/checkin`, or a single bounded `/checkin <task>` with no loop keyword, does NOT enter this loop. `--no-loop` suppresses it (and ends a running loop — see Step 2b).

Match the loop keywords as **explicit intent / whole words**, not substrings — `continuous` means "run continuously", not the `continuous` inside `continuous-integration` or `ContinuousImprovementEngine`; `until done` / `keep going` must read as a loop directive, not incidental phrasing. When genuinely ambiguous, treat the arg as a single bounded task (no loop) — the operator can always add `/loop` to force one.

**Autonomy doctrine (condensed /yolo-mode).** Inside the loop:
- **Zero questions** — don't ask "should I proceed?"; auto-select the highest-priority pending unit and go.
- **No implicit unit caps** — run until genuinely out of units, a hard blocker, or the operator halts. Context pressure does NOT end the loop — it *suspends* it across `/compact` (see Compaction survival below). Never self-impose "do N then check in" — that's a hidden question.
- **Auto-fix 3×** — on any build/test/hook error: diagnose → fix root cause → retry, max 3 attempts per error; after 3, log it, skip the unit, continue.
- **Write directly** — make the change, don't propose it. Stop to ask ONLY on genuine blocking ambiguity (two fundamentally different valid outcomes, intent un-inferable).

**Pre-loop** (skip entirely if `RESUMING=1` — Step 2b already found the live loop):
```bash
# target = count of pending units in your lane/slice (§6b), else 25
node H:/prism/.claude/helpers/loop-state.mjs start --session "$STABLE" --task "<one-line task>" --target <T>
node H:/prism/.claude/helpers/chat-slots.mjs pipeline-step --chatId "$STABLE" --pipelineStep autonomous-loop --pipelineIter 0 --pipelineTarget <T>
```

**Per-iteration** (do NOT call `ScheduleWakeup` between iterations per [[feedback_no_schedule_wakeup_in_loop]]):
1. **Pick** the next pending unit — the §6b lane slice if `--roadmap` was given, else `/pick-unit --slot $SLOT --chatId "$STABLE"` (highest-priority first: devtools `roadmap_priority===0` ahead of revenue). Passing `--chatId` engages the **PER-SLOT-CLAIM-MS0/U-PSC02 filter** — units another slot has actively claimed are excluded from the pool (peer-claim count shown in the header). Respect peer file-claims + lane discipline — skip anything a peer holds; never commit peer-claimed files.
1a. **Claim** the picked unit so no peer races you on it:
   ```bash
   node H:/prism/.claude/helpers/slot-task-claim.mjs claim \
     --slot $SLOT --chatId "$STABLE" --unit "<MILESTONE>::<U-ID>" --phase building --ttl-ms 5400000
   ```
   If the claim returns `{"ok":false,"conflict":{...}}` (exit 1) a peer grabbed it in the race window — go back to step 1 and pick the next unit. The claim auto-releases on commit (step 5 → U-PSC04 post-commit hook parses the `[SCOPE]/U-ID` subject). Knob `PRISM_SLOT_TASK_CLAIM_DISABLE=1` skips claim/heartbeat entirely (reverts to advisory-lane-only behavior).
2. **Karpathy R10** — state done / verified / left BEFORE writing code.
3. **Build** the unit. For any multi-file unit the **per-file scrutiny gate is mandatory** — 2 parallel reviewer agents after each file, fix every P0/P1 before the next file ([[feedback_parallel_scrutiny_per_file]]). Scrutiny is NOT optional in the autonomous loop — yolo speed never skips it.
4. **Auto-fix** failures up to 3× (see doctrine above).
5. **Commit** atomically — `[SCOPE-MS#]/U-ID: title`, one commit per logical unit. The post-commit hook (U-PSC04) auto-releases the slot-task claim for the committed `MILESTONE::U-ID`.
6. **Tick + heartbeat** — `node H:/prism/.claude/helpers/loop-state.mjs tick --session "$STABLE" --status ok|fail --note "<one line>"` then `node H:/prism/.claude/helpers/chat-slots.mjs pipeline-step --chatId "$STABLE" --pipelineStep autonomous-loop --pipelineIter <iter> --pipelineTarget <T>`. If the current unit is still in-flight across multiple iterations (long build), refresh its claim so the TTL doesn't lapse mid-work: `node H:/prism/.claude/helpers/slot-task-claim.mjs heartbeat --slot $SLOT --chatId "$STABLE" --unit "<MILESTONE>::<U-ID>"`.
7. **Karpathy R12** — surface uncertainty; never silently skip a failing test or an unverified edge case.

**Stop conditions** — end the loop (`node H:/prism/.claude/helpers/loop-state.mjs end --session "$STABLE" --reason <reason>`) when:
- No pending units remain in your lane → `--reason done`.
- A `tick` returns `status:"abandoned"` (runaway guard: `iter > 2×target`) → STOP, report what looped.
- A unit hard-blocks after 3 auto-fix attempts → log it, skip THAT unit, continue with the next (do NOT end the loop for one bad unit).
- Genuine blocking ambiguity → stop and ask the operator.
- Context pressure → see Compaction survival below.

**Goal-complete gate** — if the loop was entered via `/goal`, the `goal-complete-gate` Stop hook blocks unless `state/shared/CLOSE-OUT-CANDIDATES.json` is fresh (<2h) and every candidate `unit_id` is committed OR in `CLOSE-OUT-DEFERRED.md`. Run `/close-out-audit` to refresh.

**Compaction survival (the "work as long as possible" mechanism).** When `precompact-auto-trigger` fires (~880K tokens) or context is tight: finish the in-flight unit cleanly, then run the **Step 14 end-of-session pipeline** (per-file scrutiny → 3-of-3 gate → close-out → doc reflection → commit → precompact → `/compact`). **Leave loop-state `running`** — do NOT call `loop-state end`. After `/compact`, `session-start-auto-resume` re-fires `/checkin`; its Step 2b finds the `running` loop-state and re-engages this loop. The loop therefore spans `/compact` boundaries — **as long as** each precompact handoff writes a valid `<slot>-<topic>` + RESUME so the auto-resume `/checkin` actually fires. If a handoff write fails, the loop is not lost but pauses: its loop-state sits `running` and orphaned until either the next manual `/checkin` (Step 2b resumes it) or the 4h `reap` marks it `stale`.

**Runaway safety** — `loop-state` auto-abandons at `iter > 2×target`; `autonomous-loop-watchdog` (Stop, 15-min idle) and `autonomous-loop-defer` (PreToolUse tool-rate cap) already guard the fleet; `/checkin --no-loop` is the operator off-switch.

## Step 13 — Files created → /system-viz galaxy

Every Write/Edit/MultiEdit on `H:/prism/**` will trigger the Stop hook `stop-system-viz-reminder.mjs` to nudge a refresh. To pre-empt — fire the async refresh ANY time after a meaningful batch:

```bash
curl -fsS -X POST http://localhost:8765/api/refresh -m 2 >/dev/null 2>&1 &
```

The full pipeline (regenerates wiki + index + nomic embeddings) is `node H:/prism/scripts/regen-wiki-from-viz.mjs` — only run when you've added an engine/dispatcher/major hook and need the wiki entries fresh now.

## Step 14 — End-of-session pipeline (precompact / compact / handoff)

Use these IN ORDER as the session approaches token limit OR when work ships:

1. **Per-file scrutiny gate** ([[feedback_parallel_scrutiny_per_file]]) — every file in a multi-file build, 2 parallel reviewer agents.
2. **End-of-task 3-of-3 scrutiny gate** ([[feedback_scrutiny_3of3_readonly]]) — `node H:/prism/.claude/scripts/scrutiny-3way.mjs --session-id <id>` → dispatch 3 reviewer agents in parallel → mark each PASS.
3. **Roadmap close-out** ([[feedback_roadmap_close_out]]) — touch all 4 surfaces (envelope + roadmap-index + MILESTONE_PROGRESS + BUILD_STATE + chat-bus). Orchestrator: `node H:/prism/scripts/close-out-milestone.mjs --milestone <MS-ID>`.
4. **Doc reflection** ([[feedback_reflect_all_changes_post_update]]) — CLAUDE.md + MEMORY.md + wiki + Obsidian memory all updated for every change-set.
5. **Commit hygiene** — `[SCOPE-MS#]/U-<id>: title` format; never `--no-verify` unless explicitly authorized.
6. **Precompact (BEFORE token limit)** — invoke the `precompact` skill via the Skill tool. Writes per-chat handoff. The precompact-pending guard hook blocks Stop until /compact runs. **If an autonomous loop (Step 12) is mid-flight, leave its loop-state `running`** — do NOT `loop-state end` — so the post-`/compact` `/checkin` Step 2b finds and resumes it. Name the loop task in the precompact RESUME so the handoff stays human-readable.
7. **Compact** — operator types `/compact`. PreCompact hook fires; auto-resume hook (`session-start-auto-resume.mjs`, matcher:"compact") will inject the RESUME directive on the next prompt — no need for the operator to say "continue".
8. **Terminal-pin auto-claim** — on the next prompt, `session-start-terminal-pin.mjs` re-binds the slot to this PowerShell window. The new chat sees the same slot — never drift.
9. **Stop-time viz reminder** — `stop-system-viz-reminder.mjs` nudges a /system-viz refresh if H: drive files changed.
10. **Handoff** — invoke `/handoff` skill at session end to lock the RESUME for the next chat.

## High-ROI features — ENFORCED by the §6l deterministic gate (no longer a passive checklist)

User asked: *"check to see if I left high roi features out of this pipeline"* → then 2026-05-16: *"auto invoke every slash command and tool call"*. This table is the **catalog**; the §6l `roi-gate` (`checkin-recall.mjs roi-gate`) deterministically scans `$ARGUMENTS`+`$TOPIC` and prints which of these are **MANDATORY this run** (the `must-invoke:` §Report line). The table below is the human-readable map of each surface's trigger; the gate is the machine enforcement so a relevant surface can't be silently skipped:

| Feature | When to use | Action / Skill |
|---|---|---|
| ATCS (Autonomous Task Completion System) | Multi-session execution with quality gates | `prism_atcs:task_init` → `task_resume` |
| `/forge-audit-v2` (Boris doctrine) | Codebase quality audit, peer-reviewer required | `/forge-audit-v2` |
| `/close-out-audit` | Silent close-out debt detection | `/close-out-audit` (advisory only) |
| `/run-continuous` | Continuous unit execution from atomic-roadmap | `/run-continuous` |
| `/pick-build-close` | Pick → research → build → close-out macro | `/pick-build-close` |
| `/verify-loop` | Verification feedback loop (Boris #1) | `/verify-loop` |
| `/sparc` cognitive system | Structured Problem-Action-Result-Code framework | `/sparc` |
| `prism_sp:cognitive_*` | RL / Bayes / ILP / KV-cache / attention anchor | `prism_sp:cognitive_init` first |
| Tier-6 octopus-neural | Multi-provider neural consensus (Claude + Ollama + Codex) | wired via `octopus-provider-probe` hook |
| `prism_guard:agi_containment_evaluate` | Safety on AGI proposals | always before AGI-tier writes |
| `prism_omega:compute` / `auto_score` | Ω(x) quality score (0.25R+0.20C+0.15P+0.30S+0.10L) | HARD: S(x) ≥ 0.70 |
| `prism_safety:*` | 30 safety actions (collision/coolant/spindle/tool/workholding) | every cutting-physics change |
| `/awareness-snapshot` | 60-line system digest + drift report | first thing in a fresh session |
| `/orphan-inventory` | Built-but-unwired engines with dispatcher hints | when a wiring milestone is open |
| `/utilization-dashboard` | hubs/sinks/sources/ghosts node classification | when graph feels stale |
| `/deep-search` | search → reason → neural (in that order) | when master-index hit confidence < 0.5 |
| `prism_telemetry:get_dashboard` | Dispatcher latency + anomaly summary | when something feels slow |
| `prism_hook:hook_efficiency_roi` | Hook coverage/utilization/return-on-token | when hook costs feel high |
| `prism_memory:semantic_search` | Cross-session memory graph + Qdrant fallback | when "I solved this before" feeling hits |
| `prism_intake:webhook_ingest` | HMAC-verified external personal-knowledge intake | for X posts / RSS / manual capture |

**The §6l gate decides which are mandatory — every surface it emits as `MUST invoke:` must actually be invoked before declaring the pipeline complete (not optional, not "if I remember").**
