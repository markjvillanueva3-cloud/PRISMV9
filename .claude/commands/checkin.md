---
name: checkin
description: One-stop development pipeline entry. Claim a slot in the 10-chat PRISM fleet (alpha..india work + juliett hygiene; golf is also hygiene back-compat) — bind handoff to slot, reap crashed slots, drift/commit-hygiene check, then EMIT THE FULL DEV PIPELINE for whatever task the operator hands over in the args. Pipeline auto-injects prism-awareness + system-viz + Obsidian-PRISM-OS + tribal knowledge + AI/neural/deep-reasoning routing + CLAUDE.md rules. Files created get registered to /system-viz galaxy. End-of-session precompact/compact/handoff rules are appended automatically so a typed `/checkin <task>` is the only thing the operator needs.
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
│ local_compute: <one-line from §6g — Ollama+Docker+Qdrant+Postgres+Prometheus>
│ fleet topics:   <slot=topic, slot=topic, … — one line summary of who's working on what>
│ fleet loops:    <slot iter/target (age), … — only slots currently in /loop>
│ pickup cands:   <K> stale-but-actionable handoff(s)  [✓ none  |  → top: <file> "<RESUME excerpt>"]
│ your slice:  <only if --roadmap given> <N> <roadmap> units in your lane — #1: <ms/unit — title>
│ verdict:     ✅ CLEAR — go  |  ⚠ <one-line: what to resolve first>
└────────────────────────────────────────────────────────
```
If the verdict is ⚠, list the 1-3 concrete next actions (the fix commands above) and stop — don't start work until they're resolved.

## Notes
- Slots are NATO-phonetic (10 total, expanded 2026-05-15 per [[feedback_fleet_design_10_chats]]): **alpha · bravo · charlie · delta · echo · foxtrot · hotel · india · juliett** are **work** slots (default auto-claim picks the first free one), and **golf** is the dedicated **hygiene** slot (claimed only with `--golf`, write-allowlist bound via `golf-slot-write-allowlist.mjs`). An 11th chat returns `fleet_full` — force-take an inactive slot instead of spawning a nameless one. Terminal-window pinning ([[reference_session_continuity_stack_2026_05_15]]) makes 10 PowerShell windows resolve to 10 deterministic slots — same window → same slot across /compact and /clear.
- The slot binding lives for the chat's lifetime or until its heartbeat goes >10min stale (then it's auto-reclaimed). `/checkin`, `/handoff`, `/compact` refresh the heartbeat manually — but as of 2026-05-14, the **`heartbeat-keepalive.mjs` UserPromptSubmit hook** (T3, knob `PRISM_HEARTBEAT_KEEPALIVE_DISABLE=1`) refreshes it automatically on every prompt when the heartbeat is older than 60 s. The 2026-05-14 "alpha disappeared after 17 min of user think-time" bug is what motivated the hook; with it active, slots stay alive across user idle gaps as long as the chat is responsive at all. The hook is silent on success — operators only see it surface in fleet-status when an idle chat's heartbeat refresh-ages stays <60s instead of climbing toward the 10min reclaim threshold.
- Companion commands: `/who` (just your identity), `node scripts/fleet-status.mjs` (the boxed fleet dashboard, `--watch` to live-tail), `/six-chat-bootstrap` (the ONE-time master setup that assigns 6 phases to 6 slots — different thing, run once not per-chat), `/six-chat-commit-consensus` (the commit gate for the 6-chat protocol), `/handoff` (session-end), `/precompact` (before /compact).
- `/checkin` always claims/refreshes the slot + runs the drift gate. When `/checkin` is invoked WITH task descriptions in the args (e.g. `/checkin /loop  read H:\last.md and complete all units`), it ADDITIONALLY emits the full dev pipeline below. Without args it stops at the §Report and lets you decide what to do.

---

# THE DEV PIPELINE — emitted when /checkin has a task argument

When `$ARGUMENTS` contains a task/unit/loop/goal directive (heuristic: contains any of `/loop`, `/goal`, `/pick-unit`, `/pick-dev`, `unit`, `task`, `complete`, `ship`, `build`, `wire`, or a verbatim filepath), Claude proceeds through the steps below INSTEAD OF stopping at the §Report. The §Report still runs first — drift/dirty-tree blocks still apply.

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
- **Context extension** — per-chat `state/shared/handoffs/HANDOFF-<slot>-<topic>.md` (10 chats), `MEMORY.md` index (<200 lines), `ENGINE_DIGEST.md` + `DISPATCHER_DIGEST.md` for zero-IO discovery, load-on-demand skills, keyword-gated UserPromptSubmit injections. The /precompact → /compact → SessionStart:compact → auto-resume chain (Step 14) closes the long-running loop.

**REMINDER (slot-claim is mandatory, NOT optional):** Steps 1-7 above MUST run even when /checkin has a task arg. The pipeline (Steps 8-14) is ADDITIVE — never replaces slot-claim. If §Report verdict is ⚠ STOP, do NOT enter the pipeline; resolve the verdict first.

## Step 12 — Run /loop until tasks complete (= /goal)

When the args contain `/loop` or a list of units/tasks:

1. **Pre-loop checkpoint** — write loop state:
   ```bash
   STABLE="claude-<8hex>"
   node H:/prism/.claude/helpers/loop-state.mjs start --session "$STABLE" --task "<one-line task>" --target <iter-count>
   ```
2. **Per-iteration** (do NOT call `ScheduleWakeup` between iterations per [[feedback_no_schedule_wakeup_in_loop]]):
   - Pick the next unit/task (`/pick-unit` for next roadmap unit, or pop the next item from your TaskCreate list)
   - Apply Karpathy R10: state done/verified/left BEFORE writing code
   - Run the per-file scrutiny gate if multi-file ([[feedback_parallel_scrutiny_per_file]])
   - Tick the loop: `node H:/prism/.claude/helpers/loop-state.mjs tick --session "$STABLE" --status ok --note "<one line>"`
   - Karpathy R12: surface uncertainty — never silently skip failing tests
3. **Goal-complete gate** — `/goal` Stop hook blocks unless `state/shared/CLOSE-OUT-CANDIDATES.json` is fresh (<2h) and all candidate `unit_id`s are committed OR in `CLOSE-OUT-DEFERRED.md`. Run `/close-out-audit` to refresh.
4. **End-of-loop** — `node H:/prism/.claude/helpers/loop-state.mjs end --session "$STABLE" --reason done`

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
6. **Precompact (BEFORE token limit)** — invoke the `precompact` skill via the Skill tool. Writes per-chat handoff. The precompact-pending guard hook blocks Stop until /compact runs.
7. **Compact** — operator types `/compact`. PreCompact hook fires; auto-resume hook (`session-start-auto-resume.mjs`, matcher:"compact") will inject the RESUME directive on the next prompt — no need for the operator to say "continue".
8. **Terminal-pin auto-claim** — on the next prompt, `session-start-terminal-pin.mjs` re-binds the slot to this PowerShell window. The new chat sees the same slot — never drift.
9. **Stop-time viz reminder** — `stop-system-viz-reminder.mjs` nudges a /system-viz refresh if H: drive files changed.
10. **Handoff** — invoke `/handoff` skill at session end to lock the RESUME for the next chat.

## High-ROI features the user may have missed (check before declaring pipeline complete)

User asked: *"check to see if I left high roi features out of this pipeline"*. The following are auto-available but easy to forget:

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

**Use them as a checklist — invoke ANY that match the current task before declaring the pipeline complete.**
