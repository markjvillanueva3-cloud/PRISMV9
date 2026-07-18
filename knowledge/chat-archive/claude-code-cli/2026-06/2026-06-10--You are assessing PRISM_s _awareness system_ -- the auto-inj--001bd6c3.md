---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "You are assessing PRISM's \"awareness system\" -- the auto-injected context that f"
date: "2026-06-10"
first_ts: "2026-06-10T18:22:13.311Z"
last_ts: "2026-06-10T18:27:06.011Z"
cwd: "H:\\prism"
messages: 63
user_msgs: 26
assistant_msgs: 37
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_ca92f471-feb/agent-aa9a18b5c5a4b2e41.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# You are assessing PRISM's "awareness system" -- the auto-injected context that f

> **claude-code-cli** | 2026-06-10 | 63 msgs (26 user / 37 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_ca92f471-feb/agent-aa9a18b5c5a4b2e41.jsonl`

## Transcript

### User | 2026-06-10T18:22:13.311Z

You are assessing PRISM's "awareness system" -- the auto-injected context that fires on every prompt/session across 26 NATO chat slots. Repo root: H:/prism. The inject hooks live in H:/prism/.claude/hooks/*.mjs (UserPromptSubmit + SessionStart). A prior token audit is at C:/Users/wompu/.claude/projects/H--prism/memory/reference_injection_surface_token_audit_2026_06_10.md (READ IT FIRST -- it measured 59 UserPromptSubmit + 55 SessionStart hooks, and 4 shipped efficiency units). Ground EVERY claim in a real file you actually read (cite file or file:line). Do NOT spawn subagents. Be concise PLAIN TEXT with clear headers. Output exactly three sections: ## CURRENT STATE (what exists, cited), ## GAPS (what's missing/weak/generic), ## IMPROVEMENTS (concrete, each with: galaxy placement, consumer node(s) to wire, auto-invocation trigger + WHEN it fires, domain-only-vs-fleet-wide, and whether it is also token-NEGATIVE i.e. helps efficiency). Rank improvements by ROI.

YOUR LENS: DOMAIN-SPECIFICITY of the awareness surface. The operator wants per-galaxy awareness that is DOMAIN-SPECIFIC but still carries OVERALL PRISM app knowledge + development tools. Read the per-slot/domain awareness mechanism: .claude/hooks/slot-context-bundle-inject.mjs, the slot-soul inject, the chat-slot-domains inject, the *-awareness hooks (e.g. delta-cad-awareness, and grep for other "*-awareness*.mjs" / "*-domain*.mjs" in .claude/hooks/), master-index-precheck-inject.mjs, and the galaxy CLAUDE.md/MEMORY.md doctrine (mcp-server/src/engines/<galaxy>/). Assess: how domain-tuned is each galaxy's awareness TODAY vs generic fleet-wide boilerplate? Which injects are 26x-identical noise vs genuinely domain-relevant? How should awareness become domain-specific PER galaxy while still surfacing overall PRISM knowledge + the right dev tools for that domain?

### Assistant | 2026-06-10T18:22:20.421Z

I'll start by reading the prior token audit, then ground my assessment in the actual inject hooks and galaxy doctrine files.

### Assistant | 2026-06-10T18:22:21.254Z

[tool_use: Read]

### User | 2026-06-10T18:22:25.107Z

[tool_result] 1	---
2	name: reference_injection_surface_token_audit_2026_06_10
3	description: "Operator-directed token-efficiency audit of the auto-injected context surface (slot:bravo, 2026-06-10). LIVE-MEASURED surface = 59 UserPromptSubmit hooks + 55 SessionStart hooks fire every prompt/session across 26 slots. SHIPPED win: cag-router-inject no-signal suppression (the HYBRID conf-0%/no-sources route is the M
... [+13956 chars truncated]

### Assistant | 2026-06-10T18:22:29.389Z

I have the prior audit. Now let me read the core per-slot/domain awareness mechanism files. Let me start in parallel.

### Assistant | 2026-06-10T18:22:29.861Z

[tool_use: Read]

### Assistant | 2026-06-10T18:22:31.016Z

[tool_use: Bash]

### User | 2026-06-10T18:22:33.837Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// ZULU-OMNISCIENT-MS0/U-ZO-MS0-FLEET-PRECHECK — per-slot context-bundle precheck.
4	//
5	// UserPromptSubmit hook. For the slot bound to this chat, calls loadSlotContext
6	// from scripts/lib/zulu-context-bundle.mjs and injects a COMPACT summary of
7	// the slot's MS0 read-side state (soul refuse_list / loop running / token zone
8	// / bridge units available 
... [+14648 chars truncated]

### User | 2026-06-10T18:22:52.460Z

[tool_result] ai-command-awareness.mjs*
alpha-slot-reaper-guardian.mjs*
alpha-token-domain-awareness-inject.mjs*
alpha-token-domain-awareness-inject.mjs*
audit-awareness-inject.mjs*
awareness-bootstrap.mjs
awareness-snapshot-inject.mjs*
awareness-snapshot.mjs*
cag-soul-cache-block.mjs*
charlie-quoting-awareness-inject.mjs*
charlie-quoting-awareness-inject.test.mjs
chat-slot-heartbeat.mjs*
cog-bridge-awareness-r
... [+1684 chars truncated]

### Assistant | 2026-06-10T18:22:57.871Z

I notice there are several distinct slot/domain awareness hooks. Let me read the key per-domain awareness injectors and the slot-soul/domain mechanisms in parallel.

### Assistant | 2026-06-10T18:22:58.356Z

[tool_use: Read]

### Assistant | 2026-06-10T18:22:59.290Z

[tool_use: Read]

### Assistant | 2026-06-10T18:22:59.474Z

[tool_use: Read]

### User | 2026-06-10T18:23:02.865Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// HERMES-MS0 / U-HERMES02 — slot-soul-inject UserPromptSubmit hook.
4	// Reads state/shared/slot-souls/<slot>.md for the current slot, injects the
5	// frontmatter + voice/behavior sections as additionalContext on every prompt.
6	// Keeps each slot's "Hermes personality" consistent across /compact + reload.
7	//
8	// Safety: never throws (UserPromptSubmit mus
... [+4601 chars truncated]

### User | 2026-06-10T18:23:02.877Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * slot-domain-awareness-inject.mjs — UserPromptSubmit hook.
5	 *
6	 * Reads `state/shared/CHAT-SLOT-DOMAINS.md` (operator-canonical slot-domain
7	 * designations) + this chat's current slot binding from `state/shared/chat-slots.json`,
8	 * emits a compact slot-domain table as `additionalContext` so every chat in the
9	 * fleet knows what every other cha
... [+7349 chars truncated]

### User | 2026-06-10T18:23:04.367Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// delta-cad-awareness-inject.mjs — UserPromptSubmit
4	//
5	// DELTA-CAD-GALAXY-SYNERGY (operator ask 2026-05-28, session f27ecf49):
6	// "make a custom one tailored to your domain so you always have context on
7	//  your domain". The custom CAD-domain awareness surface for slot:delta.
8	//
9	// The generic awareness hooks do NOT deliver this for delta:
10	// 
... [+9056 chars truncated]

### Assistant | 2026-06-10T18:23:12.462Z

Now I see the pattern. Delta has a rich hard-coded domain awareness hook; other slots have generic ones. Let me read the other per-domain awareness hooks to compare coverage, and check which slots have them vs which don't. Let me read the remaining domain-specific injectors and the master-index precheck.

### Assistant | 2026-06-10T18:23:13.540Z

[tool_use: Read]

### Assistant | 2026-06-10T18:23:13.890Z

[tool_use: Read]

### Assistant | 2026-06-10T18:23:14.091Z

[tool_use: Read]

### User | 2026-06-10T18:23:18.386Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// foxtrot-mill-awareness-inject.mjs — UserPromptSubmit
4	//
5	// FOXTROT-MILL-GALAXY-SYNERGY (operator ask 2026-05-28/29): "make a custom one
6	// tailored to your domain so you always have context on your domain" + "generate
7	// skills, scripts and hooks for your domain". The custom mill-domain awareness
8	// surface for slot:foxtrot — the per-PROMPT siblin
... [+9367 chars truncated]

### User | 2026-06-10T18:23:20.546Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2 (injector — UserPromptSubmit, suggest-only, fail-soft)
3	// echo-post-domain-inject.mjs — custom post-processor domain-awareness surface (slot:echo galaxy)
4	// PER-SLOT-GALAXY-BUILDOUT / U-PSGB-ECHO (2026-05-28, slot:echo). KB ref added 2026-05-29 (U-ECHO-NCLINT/KB).
5	// Karpathy 5-step: CLASSIFY UserPromptSubmit injector; TECHNIQUE bounded-stdin + keyword reg
... [+3852 chars truncated]

### User | 2026-06-10T18:23:20.648Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2 — slot:india custom domain-awareness inject (U-PSGB-INDIA-AUDIT 2026-05-28).
3	//
4	// UserPromptSubmit hook. SLOT-GATED: a NO-OP for every slot except india
5	// (returns {continue:true} instantly for all others — zero blast radius).
6	// Surfaces LIVE ai-training domain state (NN-GRAPH deploy-gate verdict, checkpoint
7	// promotion state, retrain-lifecycle sta
... [+2598 chars truncated]

### Assistant | 2026-06-10T18:23:27.152Z

Now let me see which slots have custom domain hooks vs not, the alpha and charlie/xray injectors, the master-index precheck, and the canonical CHAT-SLOT-DOMAINS doc. Then check the settings.json wiring to confirm what actually fires.

### Assistant | 2026-06-10T18:23:27.683Z

[tool_use: Read]

### Assistant | 2026-06-10T18:23:28.540Z

[tool_use: Read]

### Assistant | 2026-06-10T18:23:28.545Z

[tool_use: Read]

### User | 2026-06-10T18:23:31.812Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * alpha-token-domain-awareness-inject.mjs — SessionStart hook (slot:alpha ONLY).
5	 *
6	 * Surfaces the custom token-optimization DOMAIN awareness surface
7	 * (`state/shared/TOKEN-OPTIMIZATION-AWARENESS.md`, generated by
8	 * `scripts/token-awareness-snapshot.mjs`) as `additionalContext` so the alpha chat
9	 * ALWAYS has its domain context anchored at 
... [+5406 chars truncated]

### User | 2026-06-10T18:23:33.094Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// xray-blueprint-domain-inject.mjs — UserPromptSubmit
4	//
5	// XRAY-BLUEPRINT-GALAXY-SYNERGY (operator ask 2026-05-29, /goal "compile all
6	// relevant wiki and tribal knowledge for your domain | wire all relevant files
7	// and data of your domain for quicker searches and easier utilization :
8	// wired, validated and auto invoked when needed"). The custom 
... [+8773 chars truncated]

### User | 2026-06-10T18:23:33.164Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * master-index-precheck-inject.mjs — UserPromptSubmit injector
5	 *
6	 * Cuts Grep/Glob/Agent token waste by surfacing the top-K master-index hits
7	 * BEFORE the model decides which search tool to fire. Reads system-graph.json
8	 * directly (mtime-cached on disk) + the wiki/memory entries pre-joined to
9	 * each node. Sister hook to wiki-precheck-injec
... [+16091 chars truncated]

### Assistant | 2026-06-10T18:23:38.971Z

Now I have a clear picture of the per-domain hooks. Let me confirm which of these are actually WIRED in settings.json (vs preserved-on-disk), check the SLOT_GALAXY_MAP and CHAT-SLOT-DOMAINS to see how many slots have custom hooks vs generic, and look at the charlie hook + the galaxy CLAUDE.md doctrine.

### Assistant | 2026-06-10T18:23:41.466Z

[tool_use: Bash]

### Assistant | 2026-06-10T18:23:42.304Z

[tool_use: Read]

### Assistant | 2026-06-10T18:23:42.767Z

[tool_use: Read]

### User | 2026-06-10T18:23:46.029Z

[tool_result] 1	// scripts/lib/slot-galaxy-map.mjs
2	// SINGLE SOURCE OF TRUTH for slot -> galaxy mapping (GALAXY-KIT-MS0, slot:bravo 2026-05-29).
3	//
4	// Was TRIPLICATED across:
5	//   .claude/hooks/slot-context-bundle-inject.mjs
6	//   scripts/generate-per-slot-skill-wrappers.mjs
7	//   scripts/generate-per-slot-galaxy-buildout-files.mjs
8	// with no shared import. The drift already caused two real bugs:
9	
... [+2436 chars truncated]

### User | 2026-06-10T18:23:46.060Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * charlie-quoting-awareness-inject.mjs — UserPromptSubmit hook (slot:charlie galaxy).
5	 *
6	 * Injects the quoting-domain awareness ## Headline (engine/hook/algorithm/frontend counts,
7	 * NN-bridge status, drift state, next unit) so EVERY charlie prompt auto-loads domain context
8	 * at the lowest token cost. Companion to scripts/generate-quoting-awar
... [+2332 chars truncated]

### User | 2026-06-10T18:23:51.981Z

[tool_result] === WIRED awareness/domain/soul hooks in C: settings.json (UserPromptSubmit + SessionStart) ===
      1 ai-command-awareness.mjs
      1 alpha-token-domain-awareness-inject.mjs
      1 awareness-snapshot-inject.mjs
      1 charlie-quoting-awareness-inject.mjs
      1 delta-cad-awareness-inject.mjs
      1 echo-post-domain-inject.mjs
      1 foxtrot-mill-awareness-inject.mjs
      1 lima-academy-aw
... [+593 chars truncated]

### Assistant | 2026-06-10T18:23:58.928Z

I now have the full picture. There are 8 custom domain-awareness hooks WIRED (alpha, charlie, delta, echo, foxtrot, lima, xray, india) covering 8 of 26 slots. Let me verify the galaxy CLAUDE.md/MEMORY.md doctrine coverage (how many galaxies have the per-domain artifacts) and confirm the generic-only slots, then I'm done gathering.

### Assistant | 2026-06-10T18:24:03.156Z

[tool_use: Bash]

### Assistant | 2026-06-10T18:24:05.778Z

[tool_use: Bash]

### User | 2026-06-10T18:24:14.632Z

[tool_result] === galaxies WITH CLAUDE.md (per-domain doctrine) ===
34
--- which ---
academy
agent-orchestration
ai-training
backend-helper
blueprint-vision
bug-hunting
business
cad-fusion-live
cad
cam
compliance-safety
corpus-aggregation
database-expansion
discovery
dormant-data
fleet-hygiene
frontend-app
hermes-zulu
knowledge-conversion
lathe
mill
mit-curriculum
pdf-corpus-mill
pdf-corpus
post-processor
quali
... [+279 chars truncated]

### User | 2026-06-10T18:24:22.384Z

[tool_result] Exit code 1
=== lima-academy awareness hook (confirm it's the 8th custom, SessionStart or UserPromptSubmit?) ===

### Assistant | 2026-06-10T18:24:27.344Z

The second command failed because cwd reset. Let me check the lima hook and slot-brief with absolute paths.

### Assistant | 2026-06-10T18:24:31.585Z

[tool_use: Bash]

### User | 2026-06-10T18:24:40.518Z

[tool_result] === lima hook head ===
head: cannot open '.claude/hooks/lima-academy-awareness-inject.mjs' for reading: No such file or directory
(end)

### Assistant | 2026-06-10T18:24:44.269Z

The Bash tool resets cwd. Let me use absolute paths.

### Assistant | 2026-06-10T18:24:45.217Z

[tool_use: Read]

### Assistant | 2026-06-10T18:24:46.528Z

[tool_use: Bash]

### User | 2026-06-10T18:24:47.706Z

[tool_result] File does not exist. Note: your current working directory is H:\prism.

### User | 2026-06-10T18:24:58.935Z

[tool_result] --- count ---
0

### Assistant | 2026-06-10T18:25:04.773Z

The lima hook doesn't exist on disk despite being wired — that's a finding worth noting, but it was in the grep so let me confirm its actual filename. Let me glob for it.

### Assistant | 2026-06-10T18:25:05.094Z

[tool_use: Glob]

### Assistant | 2026-06-10T18:25:05.522Z

[tool_use: Glob]

### User | 2026-06-10T18:25:22.143Z

[tool_result] .claude\hooks\cad-pipeline-knowledge-inject.mjs
.claude\hooks\charlie-quoting-knowledge-inject.test.mjs
.claude\hooks\charlie-quoting-knowledge-inject.mjs

### User | 2026-06-10T18:25:22.352Z

[tool_result] No files found

### Assistant | 2026-06-10T18:25:27.944Z

The lima-academy-awareness-inject.mjs is wired in settings.json but does NOT exist on disk — a dead-hook reference (fail-soft to no-op, but a wiring rot). And there are additional `*-knowledge-inject.mjs` hooks (cad-pipeline, charlie-quoting) beyond the awareness ones. I have enough grounded evidence. Let me do one final check on the generic slot-brief and the per-domain wiki-coverage hook to confirm what the 18 generic-only slots actually receive.

### Assistant | 2026-06-10T18:25:28.394Z

[tool_use: Read]

### Assistant | 2026-06-10T18:25:30.066Z

[tool_use: Bash]

### User | 2026-06-10T18:25:31.769Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// HERMES-MASTER-ORCHESTRATOR / slot-brief-inject — UserPromptSubmit hook.
4	//
5	// THE targeted orchestrator->slot channel. The Hermes app (slot-less ZULU master)
6	// runs as a separate process and CANNOT inject into a Claude slot's context. So it
7	// writes a work-order / pointer-bundle to state/shared/slot-briefs/<slot>.md, and
8	// THIS hook surfaces it
... [+1947 chars truncated]

### User | 2026-06-10T18:25:40.730Z

[tool_result] 1
--- context around it ---
1367:            "command": "\"H:/.claude/bin/portable-node\" H:/prism-slot-lima/.claude/hooks/lima-academy-awareness-inject.mjs",

### Assistant | 2026-06-10T18:26:56.769Z

Confirmed: the lima hook is wired pointing at `H:/prism-slot-lima/.claude/hooks/lima-academy-awareness-inject.mjs` — a slot-worktree path, not the shared tree, which is why it's absent from `H:/prism`. It only fires if that worktree exists; on a fresh checkout it's a dead reference (fail-soft no-op). That is a real domain-specificity gap for lima.

I have all the grounded evidence needed. Final assessment.

## CURRENT STATE (what exists, cited)

**Two-layer awareness surface fires on every prompt/session across 26 slots** (prior audit: 59 UserPromptSubmit + 55 SessionStart hooks; `reference_injection_surface_token_audit_2026_06_10.md:18-20`).

**Generic per-slot layer (fires for ALL 26 slots, identity-only):**
- `slot-context-bundle-inject.mjs` — the heaviest generic per-prompt injector (~1078 tokens before its U-OBS-SLOTBUNDLE-DEDUP session-dedup, `slot-context-bundle-inject.mjs:77-83`). Surfaces slot name, galaxy NAME via `SLOT_GALAXY_MAP`, existence-checked `PATHS.md/TOOLBELT.md/GSD.md` pointers, soul refuse-list, loop/token-zone/bridge-units. It points at the galaxy's files but carries NO domain content (`:92-130`).
- `slot-soul-inject.mjs` — injects `state/shared/slot-souls/<slot>.md` (personality/refuse-list), 2KB cap, 5-min dedup (`:23-24`, `:99-105`).
- `slot-domain-awareness-inject.mjs` — the full ~26-row CHAT-SLOT-DOMAINS table, **byte-identical for all 26 slots** except a `← YOU` marker (`:95-110`); dedup'd within a session (`:143-175`).
- `slot-brief-inject.mjs` — targeted consume-once orchestrator work-orders (`:3-14`).
- `master-index-precheck-inject.mjs` + `memory-index-precheck-inject.mjs` — query-driven top-K graph/memory hits, prompt-relevant (not slot-relevant); throttled (`master-index-precheck-inject.mjs:65-70,189`).
- `tribal-by-domain-inject.mjs` — domain-keyword-gated tribal hits, throttled.

**Custom domain-specific layer — only 8 of 26 slots have one, all WIRED in settings.json:**
- `delta-cad-awareness-inject.mjs` (CAD), `foxtrot-mill-awar
... [+10128 chars truncated]

### User | 2026-06-10T18:26:57.121Z

Stop hook feedback:
⚠️ Self-verify (subagent-stop-verifier): your summary says you created/wrote these files, but they don't exist on disk: scripts/regen-mill-awareness.mjs. Before you finish: actually create them now, or correct your summary so it doesn't claim them. (If you were mid-write, finish the write.)

### Assistant | 2026-06-10T18:27:06.011Z

The verifier flagged a false positive: I did not claim to have created `scripts/regen-mill-awareness.mjs`. I cited it as a path referenced inside foxtrot's hook header (`foxtrot-mill-awareness-inject.mjs:112`), and explicitly noted that the live-regen pattern was **designed but never built** — 0 galaxies have an AWARENESS.md. My improvements section proposed creating such scripts as future work, not as something I did.

To be unambiguous: this was a read-only assessment. I created/wrote NO files. Every file I named is either one I read (the hooks, slot-galaxy-map.mjs, the prior audit) or one I cited as referenced/proposed. `scripts/regen-mill-awareness.mjs` and `scripts/regen-galaxy-awareness.mjs` do NOT exist — the first is name-dropped in foxtrot's header comment (and is part of the "designed but never built" gap, GAP #5), the second is my proposed improvement #3. The per-galaxy `AWARENESS.md` files also do not exist (Glob confirmed count 0) — that is GAP #5, not a claim of creation.

No correction to the substance of the assessment is needed; the summary already stated these as gaps/proposals, not completed work.
