---
name: checkin
description: Check this chat into the 7-slot PRISM fleet (claim alpha/bravo/charlie/delta/echo/foxtrot work slots OR golf hygiene slot), bind the handoff filename to the slot, reap crashed slots + stale file-claims, and verify there's no envelope/code drift, no peer-owned files staged, no stale index.lock, no diverge-from-origin. Run once at the start of any chat that's part of the multi-chat fleet, and again right after a /compact. Cheap (~5s, mostly node helpers).
trigger:
  autoSuggest:
    keywords: ["checkin", "check in", "check into the system", "claim a slot", "fleet slot", "which chat am i", "login to the fleet"]
---

# /checkin — Fleet Check-In + Drift / Conflict / Commit Guard

Run this in any chat that's one of the ~7 concurrent PRISM chats (6 work slots + 1 hygiene slot). It (a) claims this chat a stable human-readable slot name, (b) makes the per-chat handoff save under that slot, (c) cleans up crashed-slot / stale-claim debris, (d) surfaces anything that would cause a silent overwrite, a roadmap-drift surprise, or a commit collision, and (e) — if you pass `--roadmap` — narrows this chat's work surface to one of the two roadmaps. Auto-fixes the safe stuff; surfaces (with the fix command) the stuff that needs your call.

**Re-run it after every `/compact`** (the slot heartbeat needs refreshing; a compact can also leave a stale index.lock).

## Args: $ARGUMENTS
- *(empty)* — standard check-in; this chat works the full atomized roadmap as a **work slot** (claims the first free of `alpha..foxtrot`).
- `--topic <slug>` — override the auto-derived topic. By default `/checkin` extracts the topic from the most recent commit's `[SCOPE-MS#]` tag — but with 6 chats committing every few minutes that scope can be ANY peer's scope, not yours (this is the 2026-05-14 "I got bound to command-kernel-ms0 but my actual work was git-tree" bug). Pass `--topic git-tree-work` to bind explicitly. Slug should be kebab-case (`worktree-consolidate`, `sfc-calibrate`, etc.); the `<slot>-<topic>` handoff filename is built from this. Auto-derive stays as the fallback when omitted.
- `--force --confirmRecent --preferSlot <name>` — force-take a slot held by another chat that ALSO claimed it within the last 30 s (the recency-guard window). The default `--force` alone is refused with `slot_recently_claimed` to protect against double-claim races during fleet startup; adding `--confirmRecent` is the operator's explicit "yes, I really mean it" override. Use only when you've verified the other chat is genuinely dead or the operator told you to take their slot.
- `--golf` — this chat is the **hygiene slot** (golf). Claim is restricted to the dedicated golf slot — never alpha..foxtrot. Golf is bound by the write-allowlist hook (`golf-slot-write-allowlist.mjs`, U-CLEANUP-A5) and may only touch the exact paths in `FALLBACK_ALLOW`: `state/shared/dashboards/**`, the named ledger JSONLs (`bug-attribution-ledger`, `peer-audit-ticks`, `wiki-inject-misses`, `golf-envelope-mutations`, `system-viz-headline-history`, `DR_DRILL_LEDGER`), the named report dashboards (`HOOK_HEALTH_DIGEST.md`, `WIRING-CANDIDATES-DASHBOARD.md`, `WIKI_LINT_REPORT.md`, `DISPATCHER_CAPACITY.md`, `MEMORY_GARDEN_REPORT.md`, `SKILL_UTILIZATION_REPORT.md`, `HOOK_UTILIZATION_REPORT.md`, `CLAUDE_MD_DRIFT_REPORT.md`, `GSD_FRESHNESS_REPORT.md`, `AWARENESS_HEALTH_DASHBOARD.md`, `SYSTEM_VIZ_LIVEDIFF.md`, `JSONL_CONSUMER_AUDIT.md`), `state/shared/AGENT_CHAT.jsonl`, the golf-owned configs (`golf-*.json`, `.envelope-drift-last.json`, `.watchdog-last-poll.iso`, `.peer-audit-cache.json`, `.cron-locks/*.lock`), `state/shared/system-viz/staging/**`, and `mcp-server/data/state/**.log`. Anything outside that list — including any source code, dispatcher, hook, skill, or test — gets blocked at PreToolUse. Use this for a chat dedicated to fleet hygiene (orphan reaper telemetry, drift-report regeneration, ledger triage, stale-slot reaping, CLOSE-OUT-DEFERRED triage, etc.). Mutually exclusive with `--roadmap`. The hook's block message names the canonical list — always trust the hook's emitted message over this prose when they drift.
- `--roadmap devtools` — this chat is on the **backend-development roadmap** (`BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP`; `track:"devtools"` units) — **the prioritized roadmap, do these first**. Always claims a work slot (`alpha..foxtrot`).
- `--roadmap revenue` — this chat is on the **revenue roadmap** (`REVENUE-ROADMAP-v7.6` §R1–§R10; `track:"revenue"` units) — runs *after* / *behind* the devtools roadmap (`roadmap_priority` 1 vs 0); a revenue chat mostly does low-priority revenue background work until the devtools P0 (the dev tooling) has landed. Always claims a work slot (`alpha..foxtrot`).
- When `--roadmap <name>` is given, Step 7's report adds a **"your slice"** line — your lane's ordered run-list, scoped to that roadmap (feed it to `/run-continuous`). Compute it from `state/shared/atomic-roadmap.json` (`roadmap[]` = every unit · `laneAssignments[]` = which units go to chat 1..6 · slot→chat is **alpha=1 · bravo=2 · charlie=3 · delta=4 · echo=5 · foxtrot=6**; **golf is slot 7 = hygiene, no roadmap-lane assignment**). `--roadmap devtools` → your lane minus revenue, i.e. units with `roadmap_priority === 0` (the BACKEND-DEVTOOLS-RGS6 P0 dev-tooling tracks — `HOOKS-AUTOMATION-V2`, `SKILLS-UTILIZATION`, `AUTO-LEARNING-LOOP`, `COST-CASCADE`, `TOOL-INVENTORY`, `GRAPH-AS-LLM-CONTEXT`, … — sort to the top by tier). `--roadmap revenue` → your lane filtered to `track === "revenue"`. **There is no literal `track == "devtools"` value** — `track` holds the *milestone* track name; devtools-vs-revenue is the `roadmap_priority` field (0 vs 1). The per-chat `state/shared/atomic-roadmap-chat-<N>.md` file is the same list pre-rendered as a table. When `--roadmap` is omitted, the chat sees the full ~3,663-unit roadmap.

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
- If `ok:false, error:"fleet_full"` → all 7 slots are held by alive chats; run `node H:/prism/scripts/fleet-status.mjs` to see who, then ask the operator which dead chat's slot to force-take (`... claim --chatId "$STABLE" --preferSlot <name> --force true --confirmRecent true`). The 7 slots cover the design fleet — there is no `legacy-8hex` fallback any more; if you genuinely need an 8th concurrent chat, force-take an inactive slot rather than spawning a nameless chat. **Remember the slot name — call it `$SLOT` below.**

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
rm -f H:/prism/.git/index.lock 2>/dev/null                                    # clear a crashed-git-proc lock
git -C H:/prism status --short 2>&1 | head -20                                # dirty tree?
git -C H:/prism rev-list --left-right --count HEAD...@{u} 2>/dev/null          # "<ahead>  <behind>" vs origin (blank if offline / no upstream)
git -C H:/prism diff --cached --name-only 2>&1                                 # anything STAGED? (should be empty at checkin)
git -C H:/prism worktree list 2>&1 | head                                     # confirm you're in the right worktree for your scope
```
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

### 7. Report — print this boxed one-glance status
```
┌─ /checkin ─────────────────────────────────────────────
│ slot:        $SLOT  ($([ alreadyOwned ] && echo refreshed || echo newly claimed))
│ chat id:     $STABLE
│ branch:      $BRANCH        worktree: <path>
│ handoff:     HANDOFF-$SLOT-$TOPIC.md
│ topic src:   <"--topic arg" | "commit scope" | "branch fallback">
│ prev owner:  <only if previousOwner present>
│                $previousOwner.chatId ($previousOwner.reason, last seen $previousOwner.ageMs ms ago)
│                  topic=$previousOwner.topic  activity=$previousOwner.activity
│ fleet:       <N>/7 slots alive — <list: alpha=…, bravo=…, …, golf=…>
│ chat bus:    <K> peer file-claims · <M> unread msgs · <P> active peers
│ drift:       <D> milestone(s) drifted  [✓ none  |  ⚠ <ids> — /envelope-sync if yours]
│ tree:        <clean | dirty: N files>  ·  origin: <ahead A / behind B | offline>
│ staged:      <empty | ⚠ N files staged — git reset HEAD>
│ your slice:  <only if --roadmap given> <N> <roadmap> units in your lane — #1: <ms/unit — title>
│ verdict:     ✅ CLEAR — go  |  ⚠ <one-line: what to resolve first>
└────────────────────────────────────────────────────────
```
If the verdict is ⚠, list the 1-3 concrete next actions (the fix commands above) and stop — don't start work until they're resolved.

## Notes
- Slots are NATO-phonetic (7 total): **alpha · bravo · charlie · delta · echo · foxtrot** are **work** slots (default auto-claim picks the first free one), and **golf** is the dedicated **hygiene** slot (claimed only with `--golf`, write-allowlist bound via `golf-slot-write-allowlist.mjs`). An 8th chat returns `fleet_full` — force-take an inactive slot instead of spawning a nameless one.
- The slot binding lives for the chat's lifetime or until its heartbeat goes >10min stale (then it's auto-reclaimed). `/checkin`, `/handoff`, `/compact` refresh the heartbeat manually — but as of 2026-05-14, the **`heartbeat-keepalive.mjs` UserPromptSubmit hook** (T3, knob `PRISM_HEARTBEAT_KEEPALIVE_DISABLE=1`) refreshes it automatically on every prompt when the heartbeat is older than 60 s. The 2026-05-14 "alpha disappeared after 17 min of user think-time" bug is what motivated the hook; with it active, slots stay alive across user idle gaps as long as the chat is responsive at all. The hook is silent on success — operators only see it surface in fleet-status when an idle chat's heartbeat refresh-ages stays <60s instead of climbing toward the 10min reclaim threshold.
- Companion commands: `/who` (just your identity), `node scripts/fleet-status.mjs` (the boxed fleet dashboard, `--watch` to live-tail), `/six-chat-bootstrap` (the ONE-time master setup that assigns 6 phases to 6 slots — different thing, run once not per-chat), `/six-chat-commit-consensus` (the commit gate for the 6-chat protocol), `/handoff` (session-end), `/precompact` (before /compact).
- `/checkin` does NOT commit anything and does NOT start work — it's purely "establish identity + verify the lane is safe". Run it, read the verdict, then go.
