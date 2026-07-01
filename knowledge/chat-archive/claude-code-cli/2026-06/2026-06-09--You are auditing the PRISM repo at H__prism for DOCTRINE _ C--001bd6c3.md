---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "You are auditing the PRISM repo at H:/prism for DOCTRINE & COORDINATION CONFLICT"
date: "2026-06-09"
first_ts: "2026-06-09T14:06:25.386Z"
last_ts: "2026-06-09T14:11:21.849Z"
cwd: "H:\\prism"
messages: 66
user_msgs: 29
assistant_msgs: 37
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_c70baf06-104/agent-aebf99bd33e2c09ca.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# You are auditing the PRISM repo at H:/prism for DOCTRINE & COORDINATION CONFLICT

> **claude-code-cli** | 2026-06-09 | 66 msgs (29 user / 37 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_c70baf06-104/agent-aebf99bd33e2c09ca.jsonl`

## Transcript

### User | 2026-06-09T14:06:25.386Z

You are auditing the PRISM repo at H:/prism for DOCTRINE & COORDINATION CONFLICTS (read-only; do NOT edit).
Investigate concretely:
- Read H:/prism/CLAUDE.md and C:/Users/wompu/.claude/CLAUDE.md headers — find contradictory rules, duplicated-but-divergent guidance, stale counts/claims, rules that fight each other (e.g. lane discipline vs comprehensive-build vs golf write-allowlist).
- Read state/shared/CHAT-SLOT-DOMAINS.md vs the slot souls in state/shared/slot-souls/ — find galaxy↔slot mapping conflicts (e.g. a slot soul whose role/domain disagrees with CHAT-SLOT-DOMAINS, or two slots claiming overlapping domains).
- git -C H:/prism log --oneline -40 — find competing/contradictory recent commits across slots on the same surfaces.
- Read state/shared/AGENT_CHAT.md (tail) — find unresolved coordination conflicts or contradictory claims between slots.
Report each finding as: TITLE · evidence (file:line or commit) · why it's a conflict · severity guess (P0/P1/P2). Be concrete and cite. Skip anything you cannot ground in a real file/line.

### Assistant | 2026-06-09T14:06:42.724Z

I'll audit the PRISM repo for doctrine and coordination conflicts. Let me start by gathering the key files in parallel.

### Assistant | 2026-06-09T14:06:43.626Z

[tool_use: Read]

### Assistant | 2026-06-09T14:06:44.595Z

[tool_use: Bash]

### Assistant | 2026-06-09T14:06:45.061Z

[tool_use: Bash]

### Assistant | 2026-06-09T14:06:45.629Z

[tool_use: Bash]

### User | 2026-06-09T14:06:52.858Z

[tool_result] 1	# Chat-slot domain designations
2	
3	> **Canonical source.** Operator-locked 2026-05-27, mirrored from `H:/CHAT-SLOT-DOMAINS.md`.
4	> **Awareness mechanism:** `.claude/hooks/slot-domain-awareness-inject.mjs` (UserPromptSubmit) reads this file and injects a compact slot-domain table into every chat's prompt context — every slot knows every other slot's territory.
5	> **Refresh:** edit `H:/CHAT-SL
... [+4945 chars truncated]

### User | 2026-06-09T14:07:03.226Z

[tool_result] f23c58b42d [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CHEAP-NODE-ACCESS-MS0]/U-VBL-MAP-REFLECT (slot:sierra): vault-access map — reverse edge now auto-refreshed + MCP-invokable
90d7093497 [MAIN] [GALAXY-CONTEXT-FILL]/U-GALAXY-SHOPFLOOR-TRIBAL (slot:bravo): 3 grounded shop-floor tribal tips — 34/34 galaxies at full
7fc028fc1e [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-4 (slot:echo): 
... [+10936 chars truncated]

### User | 2026-06-09T14:07:11.119Z

[tool_result] # Agent Chat

- [13:20:04] DESKTOP--56108: claiming H:/PRISM/mcp-server/src/tools/dispatchers/sessionDocNodesAction.ts
- [13:20:05] DESKTOP--50816: claiming H:/PRISM/state/shared/slot-souls/golf.md
- [13:20:10] DESKTOP--43596: claiming H:/PRISM/state/shared/slot-souls/oscar.md
- [13:20:23] DESKTOP--66196: claiming H:/PRISM/state/shared/slot-souls/papa.md
- [13:20:53] DESKTOP--45444: claiming H:/PR
... [+9128 chars truncated]

### User | 2026-06-09T14:07:13.338Z

[tool_result] total 888
drwxr-xr-x 1 wompu 197611    0 Jun  9 08:31 ./
drwxr-xr-x 1 wompu 197611    0 Jun  9 09:07 ../
-rw-r--r-- 1 wompu 197611 5078 May 29 23:13 README.md
-rw-r--r-- 1 wompu 197611 4660 May 27 21:25 alpha.html
-rw-r--r-- 1 wompu 197611 3408 May 28 00:45 alpha.md
-rw-r--r-- 1 wompu 197611 4036 May 27 21:25 bravo.html
-rw-r--r-- 1 wompu 197611 3377 Jun  3 22:00 bravo.md
-rw-r--r-- 1 wompu 197611
... [+2584 chars truncated]

### Assistant | 2026-06-09T14:07:26.851Z

There's significant slot-domain confusion already visible in AGENT_CHAT (multiple DESKTOP hosts claiming the same files). Let me dig into the slot souls and the CLAUDE.md headers in parallel.

### Assistant | 2026-06-09T14:07:27.150Z

[tool_use: Read]

### Assistant | 2026-06-09T14:07:27.699Z

[tool_use: Read]

### Assistant | 2026-06-09T14:07:28.187Z

[tool_use: Read]

### Assistant | 2026-06-09T14:07:28.597Z

[tool_use: Read]

### Assistant | 2026-06-09T14:07:29.561Z

[tool_use: Read]

### Assistant | 2026-06-09T14:07:30.045Z

[tool_use: Read]

### Assistant | 2026-06-09T14:07:30.050Z

[tool_use: Read]

### User | 2026-06-09T14:07:40.479Z

[tool_result] 1	---
2	slot: golf
3	role: fleet-hygiene-specialist
4	voice: direct
5	tone: balanced
6	escalation_path: confirm-orphan-via-ancestry-before-reap; never-reap-reaper-siblings; defer-kill-switch-to-operator
7	preferred_subagent_type: code-analyzer
8	domain_filter: fleet|reaper|orphan|zombie|hygiene|chat-slot|gpu|ollama|watchdog|cron|memory-monitor
9	hermes_role: specialist-fleet-hygiene
10	refuse_list
... [+1818 chars truncated]

### User | 2026-06-09T14:07:40.485Z

[tool_result] 1	---
2	slot: oscar
3	role: sfc-speed-feed-specialist
4	voice: physics-first
5	tone: rigorous
6	escalation_path: validate-kc-taylor-constants-before-edit; defer-chip-thinning-and-sld-to-physics-reviewer; verify-vendor-parity-before-publishing-recommendation
7	refuse_list:
8	  - inline-physics-constants
9	  - stub-engine-creation
10	  - softening-safety-thresholds
11	  - skipping-vendor-parity-vali
... [+3754 chars truncated]

### User | 2026-06-09T14:07:40.518Z

[tool_result] 1	---
2	slot: papa
3	role: backend-helper-specialist
4	voice: build-precise
5	tone: direct
6	escalation_path: surface-tsc-errors-loud; never-weaken-types-to-pass-build; defer-physics-edits-to-domain-slot
7	refuse_list:
8	  - shipping-with-tsc-errors
9	  - weakening-type-safety-to-pass-build
10	  - stub-engine-creation
11	  - skipping-affected-tests-after-an-edit
12	  - inlining-physics-constants
1
... [+3232 chars truncated]

### User | 2026-06-09T14:07:40.522Z

[tool_result] 1	---
2	slot: romeo
3	role: wiring-specialist
4	voice: wiring-rigorous
5	tone: direct
6	escalation_path: standard
7	preferred_subagent_type: wiring-review-agent
8	domain_filter: wiring
9	hermes_role: work
10	refuses:
11	  - wiring-without-round-trip-test
12	  - inlined-placeholder-in-dispatcher-case
13	  - wiring-an-engine-that-throws-on-every-call
14	  - cross-domain-wiring-without-justification

... [+1235 chars truncated]

### User | 2026-06-09T14:07:40.583Z

[tool_result] 1	---
2	slot: quebec
3	role: frontend-app-specialist
4	voice: ux-rigorous
5	tone: direct
6	escalation_path: "consume-dispatcher-not-reimplement; route-state-through-api-layer; never-inline-physics-in-UI"
7	preferred_subagent_type: reviewer
8	domain_filter: frontend|react|nextjs|web|phone|ui|ux|tanstack|zustand|tailwind|recharts
9	hermes_role: work
10	refuses:
11	  - reimplementing-backend-logic-in
... [+2201 chars truncated]

### User | 2026-06-09T14:07:40.644Z

[tool_result] 1	---
2	slot: uniform
3	role: bug-hunting-specialist
4	voice: bug-hunter
5	tone: direct
6	escalation_path: standard
7	preferred_subagent_type: code-analyzer
8	domain_filter: bug-hunting
9	hermes_role: work
10	refuses:
11	  - reporting-no-bugs-found-as-success
12	  - closing-bug-hunt-without-regression-test
13	  - fixing-symptom-without-finding-class
14	  - silencing-noisy-hook-instead-of-investiga
... [+1252 chars truncated]

### User | 2026-06-09T14:07:40.647Z

[tool_result] 1	---
2	slot: victor
3	role: dormant-data-specialist
4	voice: excavation-rigorous
5	tone: direct
6	escalation_path: standard
7	preferred_subagent_type: code-analyzer
8	domain_filter: dormant-data
9	hermes_role: work
10	refuses:
11	  - re-extracting-already-extracted-vendor-source
12	  - skipping-a-directory-on-intuition
13	  - classifying-without-consumer-check
14	  - routing-engine-finding-withou
... [+1285 chars truncated]

### Assistant | 2026-06-09T14:07:57.909Z

I found a major conflict already: golf.md soul directly contradicts CLAUDE.md golf-slot doctrine. Let me verify the golf write-allowlist hook status and read the CLAUDE.md headers more carefully, plus check a few more souls and the slot-domain awareness details.

### Assistant | 2026-06-09T14:08:03.371Z

[tool_use: Bash]

### Assistant | 2026-06-09T14:08:03.377Z

[tool_use: Read]

### Assistant | 2026-06-09T14:08:03.379Z

[tool_use: Read]

### Assistant | 2026-06-09T14:08:03.380Z

[tool_use: Read]

### Assistant | 2026-06-09T14:08:03.382Z

[tool_use: Read]

### User | 2026-06-09T14:08:07.422Z

[tool_result] 1	---
2	slot: bravo
3	role: hermes-zulu-builder
4	voice: orchestration-first
5	tone: rigorous
6	escalation_path: stub-hunt-before-ship; defer-fleet-control-safety-to-readiness-audit-ordering
7	refuse_list:
8	  - stub-engine-creation
9	  - weak-test-assertions
10	  - softening-safety-thresholds
11	  - unsafe-fleet-control-before-governance
12	preferred_subagent_type: reviewer
13	domain_filter: herm
... [+3095 chars truncated]

### User | 2026-06-09T14:08:07.452Z

[tool_result] 1	---
2	slot: charlie
3	role: quoting-specialist
4	voice: margin-rigorous
5	tone: precise
6	escalation_path: route-cycle-time-and-physics-before-cost; canonical-rate-constants-only; defer-work-order-to-hotel
7	preferred_subagent_type: code-analyzer
8	domain_filter: quote|quoting|pricing|margin|cost|estimat|bid|freight|import|docustrata|bootstrap-distribution
9	hermes_role: specialist-quoting
10	re
... [+4019 chars truncated]

### User | 2026-06-09T14:08:07.495Z

[tool_result] 1	---
2	slot: foxtrot
3	role: tribal-knowledge-specialist
4	voice: shop-floor-direct
5	tone: pragmatic
6	escalation_path: validate-tip-confidence-before-promote; defer-physics-to-bravo
7	refuse_list:
8	  - promoting-low-confidence-tribal-to-doctrine
9	  - dropping-source-attribution-on-ingest
10	  - softening-tribal-conflict-by-averaging
11	preferred_subagent_type: reviewer
12	domain_filter: triba
... [+1771 chars truncated]

### User | 2026-06-09T14:08:07.535Z

[tool_result] 1	---
2	slot: kilo
3	role: print-to-program-specialist
4	voice: pipeline-aware
5	tone: methodical
6	escalation_path: validate-blueprint-extraction-before-cam; defer-cam-to-echo
7	refuse_list:
8	  - emitting-program-without-pmi-validation
9	  - dropping-tolerance-stack-on-translate
10	  - silent-fallback-on-ambiguous-callouts
11	preferred_subagent_type: code-analyzer
12	domain_filter: print-to-prog
... [+1749 chars truncated]

### User | 2026-06-09T14:08:10.981Z

[tool_result] ---SETTINGS LOCATIONS---
-rw-r--r-- 1 wompu 197611 47122 Jun  8 15:47 .claude/settings.json

### Assistant | 2026-06-09T14:08:20.447Z

Major conflicts confirmed: **foxtrot** and **kilo** souls flatly contradict CHAT-SLOT-DOMAINS.md. The CHAT-SLOT-DOMAINS table says FOXTROT = Milling Wizard and KILO = CAM, but their soul files say foxtrot = tribal-knowledge and kilo = print-to-program (both citing the *older* JULIETT-12CHAT allocation). Let me verify the golf allowlist hook wiring and check the slot-domain awareness hook to confirm which source is live.

### Assistant | 2026-06-09T14:08:21.208Z

[tool_use: Bash]

### Assistant | 2026-06-09T14:08:23.102Z

[tool_use: Bash]

### Assistant | 2026-06-09T14:08:23.829Z

[tool_use: Read]

### Assistant | 2026-06-09T14:08:23.832Z

[tool_use: Read]

### User | 2026-06-09T14:08:26.768Z

[tool_result] 1	---
2	slot: whiskey
3	role: lathe-specialist
4	voice: physics-first
5	tone: rigorous
6	escalation_path: validate-kc-taylor-constants-before-edit; defer-spindle-torque-to-physics-reviewer; verify-chuck-jaw-force-before-program-emit
7	refuse_list:
8	  - inline-physics-constants
9	  - stub-engine-creation
10	  - softening-safety-thresholds
11	  - skipping-spindle-torque-gate
12	  - skipping-chuck-j
... [+4751 chars truncated]

### User | 2026-06-09T14:08:26.783Z

[tool_result] 1	---
2	slot: mike
3	role: misc-cleanup-specialist
4	voice: opportunistic
5	tone: balanced
6	escalation_path: defer-to-domain-slot-when-in-scope
7	preferred_subagent_type: code-analyzer
8	domain_filter: misc|cleanup|hygiene|inventory|orphan-rescue|misc-tasks|docustrata
9	hermes_role: specialist-misc
10	---
11	
12	# Mike — misc cleanup specialist (canonical misc slot per JULIETT-12CHAT)
13	
14	Mike
... [+1287 chars truncated]

### User | 2026-06-09T14:08:31.659Z

[tool_result] (Bash completed with no output)

### User | 2026-06-09T14:08:32.510Z

[tool_result] .claude/hooks/claude-md-golf-only-guard.mjs
.claude/hooks/golf-slot-write-allowlist.mjs
.claude/hooks/HOOK_DIGEST.md
.claude/hooks/intake-quarantine-guard.mjs
---WIRED IN SETTINGS?---
0

### Assistant | 2026-06-09T14:08:42.540Z

Now I have a clear, severe pattern. The **mike** soul is the smoking gun: it says "mike=misc cleanup" and even instructs to route wire-EDM work "to **charlie**" — but CHAT-SLOT-DOMAINS.md says MIKE = Wire Wizard and CHARLIE = Quoting. The souls are frozen at the *old* JULIETT-12CHAT allocation while the domains table reflects a *newer* operator reassignment. Let me confirm which the live awareness hook reads, and check the CLAUDE.md golf section vs golf soul conflict more precisely.

### Assistant | 2026-06-09T14:08:43.858Z

[tool_use: Bash]

### Assistant | 2026-06-09T14:08:45.339Z

[tool_use: Bash]

### Assistant | 2026-06-09T14:08:46.408Z

[tool_use: Bash]

### User | 2026-06-09T14:08:48.979Z

[tool_result] 6: * Reads `state/shared/CHAT-SLOT-DOMAINS.md` (operator-canonical slot-domain
20: * advisory; the canonical doc is `state/shared/CHAT-SLOT-DOMAINS.md`.
23:import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
43:    if (existsSync(join(r, "state/shared/CHAT-SLOT-DOMAINS.md"))) return r;
49: * Parse the markdown table from CHAT-SLOT-DOMAINS.md. Returns
81:    const data = J
... [+492 chars truncated]

### User | 2026-06-09T14:08:51.052Z

[tool_result] .claude/hooks/slot-soul-inject.mjs*
---reads---
4:// Reads state/shared/slot-souls/<slot>.md for the current slot, injects the
20:const SOULS_DIR = path.join(PRISM_ROOT, "state/shared/slot-souls");

### User | 2026-06-09T14:08:51.878Z

[tool_result] 25:| `state/shared/RECENT-SHIPMENTS-<date>.md` | **Inbox** of milestones shipped recently that do NOT yet have a CLAUDE.md summary section. Sister pattern to `## Recent regressions`. A golf-slot chat batches them into full sections on a weekly drain cadence. Current file: `state/shared/RECENT-SHIPMENTS-2026-05-18-19.md`. |
37:- 2026-06-09 | **[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-TASK-HEALTH]/U-F
... [+4224 chars truncated]

### Assistant | 2026-06-09T14:09:00.401Z

Now I have the mechanism confirmed: two LIVE hooks inject **contradictory** doctrine into every chat — `slot-domain-awareness-inject` reads CHAT-SLOT-DOMAINS.md (mike=Wire, kilo=CAM, foxtrot=Mill), while `slot-soul-inject` reads the soul files (mike=misc, kilo=P2P, foxtrot=tribal). Let me confirm the golf write-allowlist contradiction's exact CLAUDE.md lines and check the commit-attribution conflict (commits all say slot:X but on shared tree with [MAIN]).

### Assistant | 2026-06-09T14:09:04.474Z

[tool_use: Bash]

### Assistant | 2026-06-09T14:09:04.963Z

[tool_use: Bash]

### User | 2026-06-09T14:09:10.814Z

[tool_result] /h/prism/CLAUDE.md:313:PRISM's dedicated hygiene chat slot — `golf` is position 7 of the 26-slot NATO sequence (`alpha..zulu` per `SLOT_NAMES` in `.claude/helpers/chat-slots.mjs`). Reserved for **fleet hygiene** — not feature work. Operators claim it with `/checkin --golf`; it sits alongside the 25 work slots (`alpha..foxtrot, hotel..zulu`) without competing for them. The "7th hygiene chat" histor
... [+1651 chars truncated]

### User | 2026-06-09T14:09:11.669Z

[tool_result] 3:// tribal-by-domain-inject.mjs — UserPromptSubmit
138:      JSON.stringify({ ts: new Date().toISOString(), hook: "tribal-by-domain-inject", decision, ...extra }) + "\n",
---DOMAINS in tribal inject---
9:// domain (mill/lathe/wedm/cad/cam). This hook does the SAME for tribal
70:// "mill turning" → mill (mill listed first); "swiss cad" → swiss-class lathe
71:// machine, but `swiss` is parked under
... [+1382 chars truncated]

### Assistant | 2026-06-09T14:09:20.886Z

This is the decisive piece. The `tribal-by-domain-inject.mjs` SLOT_DOMAIN map (line 121) agrees with CHAT-SLOT-DOMAINS.md: `foxtrot: "mill", whiskey: "lathe", mike: "wedm", kilo: "cam"`. So TWO of the three live injection hooks (slot-domain-awareness + tribal-by-domain) treat foxtrot=mill, mike=wedm, kilo=cam — but the THIRD hook (slot-soul-inject) injects foxtrot=tribal, mike=misc, kilo=p2p. The souls are the stale outlier.

Let me look at a couple more confirmation points: the AGENT_CHAT papa↔bravo coordination message (does bravo's soul claim overlap with foxtrot), and check whether the souls for sierra/tango/india/delta/echo/hotel/lima/juliett agree with the domains table.

### Assistant | 2026-06-09T14:09:22.637Z

[tool_use: Bash]

### User | 2026-06-09T14:09:32.427Z

[tool_result] === delta ===
---
slot: delta
role: cad-specialist
# Delta — CAD specialist (canonical CAD slot per JULIETT-12CHAT)
=== echo ===
---
slot: echo
role: post-processor-specialist
# Echo — post-processor specialist (operator-canonical 2026-05-28)
=== hotel ===
---
slot: hotel
role: erp-hr-specialist
# Hotel — ERP+HR specialist (canonical ERP slot per JULIETT-12CHAT)
=== india ===
---
slot: india
role:
... [+1070 chars truncated]

### Assistant | 2026-06-09T14:09:56.807Z

Now I have a critical NEW conflict: **india** soul says `post-processor-specialist` / "canonical PP slot", but CHAT-SLOT-DOMAINS.md says INDIA = "Full system training — AI systems, NN, GNN, LoRA, RAG, deep learning". And MEMORY.md confirms india=ai-training galaxy. India's recent commits (`U-GNN-EDGE-PREDICT-CLI`, `U-GNN-EDGE-PREDICT-CANDIDATES`) are AI/GNN work — directly matching the domains table, NOT the soul. So india's soul is also stale (frozen at JULIETT-12CHAT where india=PP). Let me verify echo vs india PP overlap and the domains table for echo.

The domains table says ECHO = Post processors. The echo soul correctly says post-processor-specialist. But india soul ALSO says post-processor-specialist — so echo and india souls BOTH claim post-processor, a direct overlap. Let me do a final cross-check on the tribal-by-domain map for india/delta and confirm november/yankee status vs domains table.

### Assistant | 2026-06-09T14:09:57.599Z

[tool_use: Bash]

### Assistant | 2026-06-09T14:09:58.644Z

[tool_use: Bash]

### User | 2026-06-09T14:10:14.115Z

[tool_result] // map to "general" (a broad-corpus hit beats a wrong-domain one). Unmapped slots
// fall through to the token heuristic (inferTribalDomain). U-TRIBAL-SLOT-DOMAIN-WIRE.
export const SLOT_TRIBAL_DOMAIN = {
  foxtrot: "mill", whiskey: "lathe", mike: "wedm", delta: "cad", kilo: "cam",
  oscar: "mill",        // speed-feed = cutting physics (nearest valid)
  echo: "cam",          // post-processor rid
... [+469 chars truncated]

### User | 2026-06-09T14:10:15.992Z

[tool_result] 796f02db45 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-GNN-EDGE-PREDICT-CLI (slot:india): path-A consumer — predict-missing-edges.mjs composes core+candidates into a ranked missing-knowledge-edge report (state/shared/system-viz/predicted-missing-edges.json). 17/17 node:test incl run() integration; live-validated (543 nodes, 1687 candidates, 8 plausible predictions 0.72-0.73). 3-of-3 PASS;
... [+700 chars truncated]

### Assistant | 2026-06-09T14:11:21.849Z

I have everything grounded. The `SLOT_TRIBAL_DOMAIN` map (line 124) confirms `india: "backend-dev", // ai-training` — agreeing with the domains table (india=AI training) and CONTRADICTING india's own soul (post-processor-specialist). India's actual commits are GNN/AI work, confirming the soul is the stale outlier. I have enough concrete, grounded findings. Here is the audit.

---

# PRISM Doctrine & Coordination Conflict Audit

## P0 — Slot souls contradict the operator-canonical domain table (4 slots), and BOTH are injected live every prompt

**The mechanism that makes this load-bearing:** three UserPromptSubmit hooks inject slot doctrine into every chat. They disagree on source-of-truth:
- `slot-domain-awareness-inject.mjs:43,130` reads `state/shared/CHAT-SLOT-DOMAINS.md`
- `tribal-by-domain-inject.mjs:121` hard-codes `SLOT_TRIBAL_DOMAIN`
- `slot-soul-inject.mjs:20` reads `state/shared/slot-souls/<slot>.md`

The first two agree with each other; the souls are frozen at the *older* `JULIETT-12CHAT-ALLOCATION-MS0` mapping. A chat receives **both** definitions and cannot tell which governs.

| Slot | CHAT-SLOT-DOMAINS.md:14-31 (canonical) | slot-souls/<slot>.md (stale) | tribal map agrees with |
|---|---|---|---|
| **MIKE** | "Wire Wizard" (line 23) | `role: misc-cleanup-specialist`, "mike=misc" (mike.md:3,12) | domains table (`mike:"wedm"`, tribal:124) |
| **KILO** | "CAM" (line 21) | `role: print-to-program-specialist` (kilo.md:3,16) | domains table (`kilo:"cam"`, tribal:121) |
| **FOXTROT** | "Milling Wizard" (line 16) | `role: tribal-knowledge-specialist` (foxtrot.md:3,16) | domains table (`foxtrot:"mill"`, tribal:121) |
| **INDIA** | "Full system training — AI/NN/GNN/LoRA/RAG" (line 19) | `role: post-processor-specialist`, "canonical PP slot" (india.md:3,~16) | domains table (`india:"backend-dev" // ai-training`, tribal:124) |

**Why it's a conflict, not stale doc:** `mike.md:25,31` actively instructs "a 'misc' cleanup task that turns out to be **wire-EDM goes to
... [+6417 chars truncated]
