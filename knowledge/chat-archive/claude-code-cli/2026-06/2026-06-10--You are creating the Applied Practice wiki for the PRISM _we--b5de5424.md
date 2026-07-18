---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the Applied Practice wiki for the PRISM \"wedm\" galaxy (owner: m"
date: "2026-06-10"
first_ts: "2026-06-10T09:43:33.200Z"
last_ts: "2026-06-10T09:47:21.394Z"
cwd: "H:\\prism"
messages: 48
user_msgs: 19
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_d3625924-1f2/agent-a4873cd7715e89d70.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the Applied Practice wiki for the PRISM "wedm" galaxy (owner: m

> **claude-code-cli** | 2026-06-10 | 48 msgs (19 user / 29 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_d3625924-1f2/agent-a4873cd7715e89d70.jsonl`

## Transcript

### User | 2026-06-10T09:43:33.200Z

You are creating the Applied Practice wiki for the PRISM "wedm" galaxy (owner: mike): knowledge/wiki/wedm/wedm-applied-practice.md.

PURPOSE: the PRACTITIONER-KNOWLEDGE layer -- the hard-won "tribal knowledge" a world-class wedm expert has that pure theory does not teach: common FAILURE MODES, GOTCHAS, and TECHNIQUE DECISIONS. This is DISTINCT from wedm-foundations.md (theory) and wedm-source-atlas.md (link directory). Read both first so you do not repeat them -- this entry is "what goes wrong and how an expert avoids it."

FOCUS for wedm: wire-EDM practitioner technique + gotchas: wire-breakage root causes, flushing/starvation problems, taper error, surface-finish vs cut-speed trade, skim/multi-pass strategy, thermal/recast/HAZ issues, threading/auto-thread fails, fixturing + thermal stability. Free: vendor EDM application guides, NPTEL practical, MDPI/PMC applied reviews.
R12 SAFETY-CRITICAL: this is a cutting / safety / capability galaxy. Promote ONLY qualitative technique, failure-mode descriptions, decision-logic, and the DIRECTION of a trade-off ("higher stickout -> more deflection -> lighter engagement"). You may NOT write a numeric cutting value (RPM, SFM/Vc, IPR/IPT/feed, depth-of-cut, chip-load), a numeric Cpk/control-limit/AQL, or a numeric safety threshold. If a source states one, describe the QUALITATIVE relationship and gate the number ("the vendor publishes a specific value -- owner-gated, see constants.ts"). Keep all numbers owner-gated.

ABSOLUTE RULES (R12 honesty -- a small honest set of cited gotchas beats a large fabricated one):
1. You may ONLY state a practitioner claim you CONFIRM by WebFetch on a reputable free/legal source (vendor technical guide, university course/lab manual, NIST/OSHA, reputable practitioner site like CNCCookbook / Harvey In The Loupe / GcodeTutor / Machining Doctor, NPTEL, open textbook). Never fabricate. If a fetch fails, retry once then drop the claim.
2. Aim for 8-14 cited gotchas/technique notes across 4-6 themed sec
... [+1033 chars truncated]

### Assistant | 2026-06-10T09:43:36.987Z

I'll create the Applied Practice wiki for the wedm galaxy. First, let me read the two sibling files to avoid repetition, then verify practitioner claims via WebFetch.

### Assistant | 2026-06-10T09:43:37.039Z

[tool_use: Glob]

### User | 2026-06-10T09:43:46.880Z

[tool_result] knowledge\wiki\wedm\wedm-foundations.md
knowledge\wiki\wedm\wedm-source-atlas.md

### Assistant | 2026-06-10T09:43:48.791Z

Both sibling files exist. Let me read them.

### Assistant | 2026-06-10T09:43:49.719Z

[tool_use: Read]

### Assistant | 2026-06-10T09:43:49.759Z

[tool_use: Read]

### User | 2026-06-10T09:43:52.357Z

[tool_result] 1	---
2	title: WEDM Foundations — spark-erosion mechanism, dielectric, wire, multi-pass skim, taper method
3	galaxy: wedm
4	owner_slot: mike
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-workflow (claude-b5de5424, 2026-06-09); deepened by papa-workflow (claude-b5de5424, 2026-06-09) — gov-report + peer-reviewed categories added; 2nd deepening pass by papa-workflow (2026-06-10) — flushing-taxonomy
... [+34501 chars truncated]

### User | 2026-06-10T09:43:52.397Z

[tool_result] 1	---
2	title: WEDM Open Source Atlas — curated living free + legal sources for wire/sinker EDM
3	galaxy: wedm
4	owner_slot: mike
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-source-atlas (2026-06-10)"
7	verification_method: "Every URL below was WebFetched and confirmed to RESOLVE to the relevant on-topic content before listing (live link + on-topic check, not a claim extraction). URLs that 404
... [+10101 chars truncated]

### Assistant | 2026-06-10T09:43:59.725Z

I have a clear picture of both sibling files. Foundations covers theory/mechanism; the atlas is a link directory. My applied-practice file must be DISTINCT: practitioner gotchas, failure modes, and technique decisions.

Now let me verify practitioner claims via WebFetch. I'll fetch reputable free EDM application guides and practical sources in parallel.

### Assistant | 2026-06-10T09:44:03.019Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:44:05.197Z

[tool_use: WebFetch]

### User | 2026-06-10T09:44:11.523Z

[tool_result] # Wire EDM Practitioner Gotchas and Technique Decisions

## Speed vs. Accuracy Trade-off
"You don't get speed with precision, and you can't achieve high accuracy without also achieving a fine surface finish."

The article explicitly states this fundamental incompatibility: accuracy and surface finish are linked, but speed conflicts with both.

## Skim Pass Strategy
A typical wire EDM process uses 
... [+1342 chars truncated]

### User | 2026-06-10T09:44:13.011Z

[tool_result] # Wire EDM Taper Cutting Gotchas & Expert Avoidance Techniques

## Gotcha 1: Angular Error from Differential Traverse Speeds
**The Problem:** "slower motion keeps the wire in any given place longer than faster traverse speeds would" — causing uneven erosion between top and bottom profiles.

**Why It Happens:** U/V axes travel slower machining the upper radius than X/Y axes do for the lower radius,
... [+1154 chars truncated]

### Assistant | 2026-06-10T09:44:15.780Z

Both fetched cleanly. Now let me fetch a few more reputable sources for wire breakage, flushing/threading, and surface integrity gotchas.

### Assistant | 2026-06-10T09:44:18.403Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:44:19.968Z

[tool_use: WebFetch]

### User | 2026-06-10T09:44:21.469Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:44:24.719Z

[tool_result] # Wire EDM Practitioner Gotchas and Limitations

## Wire Breakage
**Cause:** "wire breakage can still occur due to thermal stress, electrical overload, or improper tension"

## Material Conductivity Requirement
**Limitation:** "The material must be conductive for the process to work" and "Wire EDM is limited to metals that conduct electricity"

## Recast and Heat-Affected Layers
**Surface effect:*
... [+843 chars truncated]

### Assistant | 2026-06-10T09:44:30.594Z

Xometry fetched. Protolabs 404'd — let me retry once with a different reputable DFM source, plus a flushing/wire-breakage practical source.

### Assistant | 2026-06-10T09:44:31.688Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:44:31.906Z

[tool_use: WebFetch]

### User | 2026-06-10T09:44:33.007Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:44:34.353Z

[tool_result] Not relevant. This page is a material properties database homepage that catalogs engineering materials like metals, polymers, and ceramics. It contains no information about wire EDM (electrical discharge machining) flushing or wire breakage.

### Assistant | 2026-06-10T09:44:38.372Z

Both unhelpful. Let me try the Hubs knowledge base with the correct URL and a peer-reviewed open-access source on wire breakage / flushing starvation (which is rich in practitioner failure-mode content).

### Assistant | 2026-06-10T09:44:40.250Z

[tool_use: WebFetch]

### User | 2026-06-10T09:44:41.384Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:44:42.175Z

[tool_use: WebFetch]

### User | 2026-06-10T09:44:49.561Z

[tool_result] # EDM/Wire EDM Failure Mechanisms: Debris Accumulation

## Primary Failure Mechanism

**Short Circuits & Abnormal Discharges:**
The document explains that "The removed debris materials gather in the machining gap which eventually decreases the resistance in this gap." This accumulation directly "becomes the reason behind the occurrences of abnormal discharges in the short circuit."

**Impact on Pe
... [+1301 chars truncated]

### Assistant | 2026-06-10T09:44:53.366Z

The PMC6384716 source confirmed rich practitioner failure-mode content (debris → short circuit → wire wear → flushing avoidance). That source is already cited in foundations §11, but I'm extracting the *practitioner failure-mode framing* (distinct angle from the foundations theory). Let me get one more practitioner-oriented source for threading/start-hole and wire breakage to round out the set.

### Assistant | 2026-06-10T09:44:57.172Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:44:57.551Z

[tool_use: WebFetch]

### User | 2026-06-10T09:44:58.425Z

[tool_result] The server returned HTTP 403 Forbidden.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:45:04.124Z

[tool_result] # Flushing Failure Modes in PMEDM

## Why Poor Flushing Fails

The review explains that ineffective flushing creates critical problems:

- **Arcing and dimensional loss**: "the presence of debris in the inter-electrode gap reduces process efficiency and might initiate arcing which deteriorates dimensional accuracy"

- **Surface integrity compromise**: Debris accumulation prevents proper machining 
... [+735 chars truncated]

### Assistant | 2026-06-10T09:45:06.901Z

ThomasNet 403'd. PMC6909068 confirmed flushing failure modes. I have strong coverage now. Let me get one more for threading/start-hole and a thermal/fixturing source to round out "Setup & fixturing."

### Assistant | 2026-06-10T09:45:09.249Z

[tool_use: WebFetch]

### User | 2026-06-10T09:45:10.380Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:45:11.293Z

[tool_use: WebFetch]

### User | 2026-06-10T09:45:12.502Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:45:17.630Z

Both MMS deep-links 404'd. Let me try a reputable practitioner source for the residual-stress/distortion gotcha (a critical wedm setup failure mode) and a threading source.

### Assistant | 2026-06-10T09:45:21.277Z

[tool_use: WebFetch]

### User | 2026-06-10T09:45:22.620Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:45:22.969Z

[tool_use: WebFetch]

### User | 2026-06-10T09:45:29.655Z

[tool_result] # Wire EDM and EDM Practitioner Gotchas

**Wire Breakage:**
"To avoid the erosion of the wire causing it to break, the wire is wound between two spools so that the active part of the wire is constantly changing."

**Material Conductivity Requirement:**
"EDM typically works with materials that are electrically conductive, although methods have also been proposed for using EDM to machine insulating 
... [+1059 chars truncated]

### Assistant | 2026-06-10T09:45:35.290Z

Wikipedia confirmed several key practitioner gotchas (wire breakage spool-feed mitigation, pilot hole threading, recast layer + residual tensile stress, conductivity, deionizer control, slow MRR). Wikipedia EDM is a reputable, well-cited reference for qualitative process facts.

I now have ample confirmed material from distinct sources:
1. MMS — speed/finish/skim/temperature
2. MoldMaking Tech — taper
3. Xometry — limitations
4. PMC6384716 — debris/short-circuit failure mode
5. PMC6909068 — flushing methods/failure
6. Wikipedia EDM — wire breakage/pilot hole/recast/residual stress/conductivity/slow MRR

That's 6 distinct confirmed sources and well over 8 gotchas. Let me write the file.

### Assistant | 2026-06-10T09:47:07.097Z

[tool_use: Write]

### User | 2026-06-10T09:47:13.294Z

[tool_result] File created successfully at: H:\prism\knowledge\wiki\wedm\wedm-applied-practice.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T09:47:21.394Z

The file was created successfully. It does not duplicate the related nodes — `wiki/wedm` is the directory, and the others are a neural engine and post-ship reference, not an applied-practice gotcha entry. My file is the distinct practitioner-knowledge layer.

GALAXY: wedm
FILE: knowledge/wiki/wedm/wedm-applied-practice.md
CREATED: yes
CITED_GOTCHAS: 14
SOURCES: 6
NUMERICS_LEFT_GATED: yes
NOTE: Flushing starvation is a distinct failure axis from under-energy — debris drops gap resistance, causing short circuits/abnormal discharges that drive wire wear and lost dimensional accuracy, so rising retract/short-circuit behavior must be read as a flushing problem, not a settings problem.
