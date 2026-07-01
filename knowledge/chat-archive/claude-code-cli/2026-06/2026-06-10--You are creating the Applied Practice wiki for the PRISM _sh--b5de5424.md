---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the Applied Practice wiki for the PRISM \"shop-floor\" galaxy (ow"
date: "2026-06-10"
first_ts: "2026-06-10T10:02:58.538Z"
last_ts: "2026-06-10T10:08:25.360Z"
cwd: "H:\\prism"
messages: 69
user_msgs: 28
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_d3625924-1f2/agent-a6922d6348b68e4da.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the Applied Practice wiki for the PRISM "shop-floor" galaxy (ow

> **claude-code-cli** | 2026-06-10 | 69 msgs (28 user / 41 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_d3625924-1f2/agent-a6922d6348b68e4da.jsonl`

## Transcript

### User | 2026-06-10T10:02:58.538Z

You are creating the Applied Practice wiki for the PRISM "shop-floor" galaxy (owner: shop-floor-owner): knowledge/wiki/shop-floor/shop-floor-applied-practice.md.

PURPOSE: the PRACTITIONER-KNOWLEDGE layer -- the hard-won "tribal knowledge" a world-class shop-floor expert has that pure theory does not teach: common FAILURE MODES, GOTCHAS, and TECHNIQUE DECISIONS. This is DISTINCT from shop-floor-foundations.md (theory) and shop-floor-source-atlas.md (link directory). Read both first so you do not repeat them -- this entry is "what goes wrong and how an expert avoids it."

FOCUS for shop-floor: shop-floor practitioner + safety technique: setup-reduction (SMED) practice, 5S, lockout-tagout discipline, tool-presetting + offset management, first-article verification, machine warm-up/thermal-growth, swarf/coolant management, changeover. Free: Lean Enterprise Institute lexicon, OSHA practical, NIST MEP. R12: qualitative; NO numeric safety thresholds.
R12 SAFETY-CRITICAL: this is a cutting / safety / capability galaxy. Promote ONLY qualitative technique, failure-mode descriptions, decision-logic, and the DIRECTION of a trade-off ("higher stickout -> more deflection -> lighter engagement"). You may NOT write a numeric cutting value (RPM, SFM/Vc, IPR/IPT/feed, depth-of-cut, chip-load), a numeric Cpk/control-limit/AQL, or a numeric safety threshold. If a source states one, describe the QUALITATIVE relationship and gate the number ("the vendor publishes a specific value -- owner-gated, see constants.ts"). Keep all numbers owner-gated.

ABSOLUTE RULES (R12 honesty -- a small honest set of cited gotchas beats a large fabricated one):
1. You may ONLY state a practitioner claim you CONFIRM by WebFetch on a reputable free/legal source (vendor technical guide, university course/lab manual, NIST/OSHA, reputable practitioner site like CNCCookbook / Harvey In The Loupe / GcodeTutor / Machining Doctor, NPTEL, open textbook). Never fabricate. If a fetch fails, retry once then drop the cla
... [+1140 chars truncated]

### Assistant | 2026-06-10T10:03:02.029Z

I'll create the Applied Practice wiki for the shop-floor galaxy. Let me first read the two existing entries so I don't repeat them, then verify practitioner claims via WebFetch.

### Assistant | 2026-06-10T10:03:02.722Z

[tool_use: Bash]

### User | 2026-06-10T10:03:08.143Z

[tool_result] total 56
drwxr-xr-x 1 wompu 197611     0 Jun 10 04:29 ./
drwxr-xr-x 1 wompu 197611     0 Jun 10 05:00 ../
drwxr-xr-x 1 wompu 197611     0 Jun  9 22:16 _staging/
-rw-r--r-- 1 wompu 197611 33837 Jun 10 02:44 shop-floor-foundations.md
-rw-r--r-- 1 wompu 197611 12080 Jun 10 04:29 shop-floor-source-atlas.md

### Assistant | 2026-06-10T10:03:20.056Z

Let me read both existing files to avoid repetition.

### Assistant | 2026-06-10T10:03:20.693Z

[tool_use: Read]

### Assistant | 2026-06-10T10:03:20.985Z

[tool_use: Read]

### User | 2026-06-10T10:03:22.714Z

[tool_result] 1	---
2	title: Shop-Floor Foundations — machine monitoring, live OEE, lean dispatch, andon, 5S, traceability
3	galaxy: shop-floor
4	owner_slot: shop-floor-owner
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-workflow (claude-b5de5424, 2026-06-09); DEEPENED by shop-floor-owner workflow (2026-06-09); SECOND DEEPEN pass by shop-floor-owner workflow (2026-06-10)"
7	verification_method: institutional/
... [+34107 chars truncated]

### User | 2026-06-10T10:03:22.994Z

[tool_result] 1	---
2	title: Shop-Floor Open Source Atlas — living free + legal sources for shop-floor operations / OEE / MES / lean / industrial safety
3	galaxy: shop-floor
4	owner_slot: shop-floor-owner
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-source-atlas (2026-06-10)"
7	verification_method: "Every URL below was fetched with WebFetch this pass and confirmed to RESOLVE to the relevant on-topic content 
... [+11755 chars truncated]

### Assistant | 2026-06-10T10:03:29.309Z

Both files read. The foundations file covers theory (MTConnect, OEE formula, lean leveling, andon/jidoka, 5S, smart manufacturing, ISA-95, MES, TQM/Six Sigma, ergonomics, MIT curriculum, Baldrige, TPM, LOTO/machine-guarding). The atlas is a link directory. 

This Applied Practice entry must be DISTINCT: practitioner "what goes wrong and how an expert avoids it" — failure modes, gotchas, technique decisions. My focus areas: setup-reduction (SMED), 5S practice (not theory), lockout-tagout discipline, tool-presetting/offset management, first-article verification, machine warm-up/thermal growth, swarf/coolant management, changeover.

Let me now WebFetch reputable free sources to confirm practitioner claims. I'll batch parallel fetches.

### Assistant | 2026-06-10T10:03:32.586Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:03:34.985Z

[tool_use: WebFetch]

### User | 2026-06-10T10:03:39.082Z

[tool_result] # SMED: Practitioner Gotchas and Core Techniques

## Internal vs. External Setup Activities

The fundamental distinction: "Internal activities are those that can only be performed when the process is stopped, while external activities can be done while the last batch is being produced."

**The core insight:** Converting internal to external setup generates the biggest gains. External activities (l
... [+1146 chars truncated]

### User | 2026-06-10T10:03:41.228Z

[tool_result] # Lockout/Tagout Discipline Gotchas

Based on the OSHA overview provided, here are critical practitioner-level gaps:

## Authorization to Remove Locks
The document doesn't explicitly specify who is authorized to remove locks. It addresses that "authorized" workers must be trained to perform lockout, but doesn't clarify removal authority or the chain of custody problem when someone other than the i
... [+1327 chars truncated]

### Assistant | 2026-06-10T10:03:45.513Z

Good. SMED fetch confirmed strong practitioner content. The OSHA LOTO page only confirmed the restart prohibition and stored-energy hazard for my purposes; some claims (own-lock, try-out) it noted aren't explicit on that page. Let me fetch additional sources for tool presetting/offsets, first-article, thermal growth/warm-up, swarf/coolant, and a stronger LOTO source. I'll batch these.

### Assistant | 2026-06-10T10:03:48.815Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:03:51.490Z

[tool_use: WebFetch]

### User | 2026-06-10T10:03:52.137Z

[tool_result] I cannot extract the requested information about CNC tool length offsets and presetting techniques from the provided web page content.

The content shown is limited to CNC Cookbook's homepage, which includes only navigation links and section headings for topics like "CAD/CAM Software," "CNC Routers," "Speeds and Feeds," and "G-Wizard." While these sections suggest relevant resources exist on the s
... [+433 chars truncated]

### Assistant | 2026-06-10T10:03:53.712Z

[tool_use: WebFetch]

### User | 2026-06-10T10:03:55.455Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T10:03:57.985Z

[tool_result] # First Article Inspection: Practitioner Gotchas

## Purpose & Core Function

An FAI verifies that "a new or modified production process produces conforming parts that meet the manufacturing specification" before full-scale manufacturing begins. It's essentially a quality gate—catching problems early rather than discovering defects across an entire batch.

## When FAI is Required

The Wikipedia ar
... [+1133 chars truncated]

### Assistant | 2026-06-10T10:04:02.017Z

FAI confirmed strongly. CNCCookbook homepage didn't render the article, and the Machining Doctor thermal-growth URL 404'd. Let me retry these with better targets: a working CNCCookbook G54/offset article, a Machining Doctor thermal page, plus add swarf/coolant and a stronger LOTO source (a vendor/practitioner page on the own-lock + try-out rule). Batch retries.

### Assistant | 2026-06-10T10:04:04.887Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:04:07.184Z

[tool_use: WebFetch]

### User | 2026-06-10T10:04:09.726Z

[tool_result] I cannot extract the requested information about CNC work/fixture offsets (G54), tool offsets, crash risks, presetting techniques, or verification methods from the provided web page content.

The page you shared is a homepage for CNC Cookbook containing navigation links and general site descriptions. It mentions topics like "Speeds and Feeds," "G-Wizard," and "CNC Routers," but does not include ac
... [+426 chars truncated]

### User | 2026-06-10T10:04:09.544Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T10:04:10.426Z

[tool_use: WebFetch]

### User | 2026-06-10T10:04:12.359Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T10:04:19.641Z

Several URLs are guessed and 404'ing. Let me search for the correct live URLs for the topics I still need: tool offsets/presetting, thermal growth/warm-up, chip control, and a strong LOTO own-lock/try-out source.

### Assistant | 2026-06-10T10:04:20.579Z

[tool_use: WebSearch]

### Assistant | 2026-06-10T10:04:21.520Z

[tool_use: WebSearch]

### Assistant | 2026-06-10T10:04:21.749Z

[tool_use: WebSearch]

### User | 2026-06-10T10:04:51.334Z

[tool_result] Web search results for query: "machining doctor chip control chip breaker long stringy chips evacuation glossary"

I'll search for information about chip control and chip breakers in machining.

Links: [{"title":"Machining Chip Management Guide: Strategies to Optimize Chip Evacuation and Protect Part Surfaces","url":"https://www.chinamilling.com/Machining-Chip-Management-Guide-Strategies-To-Optimi
... [+8244 chars truncated]

### User | 2026-06-10T10:04:56.412Z

[tool_result] Web search results for query: "gcodetutor tool length offset G43 crash wrong offset CNC mill tutorial"

I'll search for information about that topic for you.

Links: [{"title":"G43 G-Code: Tool Length Compensation Explained - Machinist Guides","url":"https://www.machinistguides.com/g43-code/"},{"title":"Mastering G43 CNC Code: Tool Length Offset and More - Essengold","url":"https://essengoldparts.
... [+5184 chars truncated]

### User | 2026-06-10T10:04:58.379Z

[tool_result] Web search results for query: "machining doctor thermal growth spindle warm up CNC tolerance drift glossary"

I'll search for information on thermal growth in CNC spindles and how it affects tolerance drift.

Links: [{"title":"Why CNC Parts Go Out of Tolerance During Machining - Causes and Fixes - MDCplus","url":"https://mdcplus.fi/blog/cnc-parts-out-of-tolerance-machining/"},{"title":"Thermal Exp
... [+6171 chars truncated]

### Assistant | 2026-06-10T10:05:03.062Z

I now have strong, citable practitioner content. The thermal-growth content was returned by WebSearch summarizing multiple sources but I need to confirm at least one by actual WebFetch (rules require WebFetch confirmation). Let me directly fetch the strongest live URLs: the cnccode.com tool-length-compensation guide (G43 crash gotchas), the Production Machining chip-control article (Gardner Business Media — reputable trade publication), and a thermal page I can confirm. Plus the Sandvik Coromant parting/grooving chip page (vendor technical guide).

### Assistant | 2026-06-10T10:05:06.416Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:05:09.193Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:05:12.498Z

[tool_use: WebFetch]

### User | 2026-06-10T10:05:13.328Z

[tool_result] The server returned HTTP 403 Forbidden.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T10:05:14.856Z

[tool_result] # CNC Tool Length Offset Gotchas: G43/H Code Pitfalls

Based on the cnccode.com article, here are critical practitioner mistakes with tool length compensation:

## Common Errors

**Wrong H Number Selection**
The article identifies this as a primary risk: "Match H# to tool length correctly" to avoid incorrect depth cuts. Calling H3 when H1 was intended means the machine applies the wrong tool's sto
... [+1117 chars truncated]

### User | 2026-06-10T10:05:16.518Z

[tool_result] # Chip Control Practitioner Gotchas

## Heat Management
The chip is actually your **desired** heat path. For steels at optimum cutting speed, approximately "75 percent of the heat leaving with the chip, 10 percent in the material and 15 percent" to the tool. This means poor chip evacuation forces excess heat into your cutting edge, degrading tool life.

## Continuous Chip Problems
Long, stringy ch
... [+1217 chars truncated]

### Assistant | 2026-06-10T10:05:20.784Z

Tool-offset and chip-control are now WebFetch-confirmed. The thermal page 403'd. Let me get one WebFetch-confirmed thermal source plus a strong LOTO own-lock/try-out source and a swarf-management/coolant source, and an SMED 5S source for the changeover/external-prep tie-in. Batch.

### Assistant | 2026-06-10T10:05:24.071Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:05:26.902Z

[tool_use: WebFetch]

### User | 2026-06-10T10:05:27.747Z

[tool_result] REDIRECT DETECTED: The URL redirects to a different host.

Original URL: https://www.graphicproducts.com/articles/lockout-tagout/
Redirect URL: https://www.duralabel.com/articles/lockout-tagout/
Status: 301 Moved Permanently

To complete your request, I need to fetch content from the redirected URL. Please use WebFetch again with these parameters:
- url: "https://www.duralabel.com/articles/lockout
... [+511 chars truncated]

### Assistant | 2026-06-10T10:05:29.303Z

[tool_use: WebFetch]

### User | 2026-06-10T10:05:34.454Z

[tool_result] # Thermal Growth Gotchas in CNC Production

## The Problem: Why Parts Drift Out of Tolerance

**Machine and spindle heat creep:** "A 15 kW spindle running at 12,000 rpm can release 800 W as heat even under light load." Spindle bearings, motor windings, and cutting friction all warm the machine structure. A vertical machining center's column grows 10–12 microns in Z-axis for every 10°C rise—enough 
... [+1550 chars truncated]

### User | 2026-06-10T10:05:35.150Z

[tool_result] # Swarf Management: Practitioner Hazards and Concerns

## Sharp and Hazardous Handling
Chips present serious injury risks. The Wikipedia article notes: "Chips can be extremely sharp and they can cause serious injuries if not handled correctly." Fragments frequently become projectiles, potentially traveling "several yards" when ejected from cutting tools with considerable force.

## Flammability an
... [+989 chars truncated]

### Assistant | 2026-06-10T10:05:53.383Z

Thermal growth and swarf are now WebFetch-confirmed. Let me fetch the redirected LOTO source to confirm the own-lock/try-out discipline. I'll also fetch a 5S/changeover practitioner source to round out setup/fixturing and changeover gotchas.

### Assistant | 2026-06-10T10:05:55.304Z

[tool_use: WebFetch]

### User | 2026-06-10T10:05:56.501Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T10:05:57.785Z

[tool_use: WebFetch]

### User | 2026-06-10T10:06:00.049Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T10:06:02.864Z

Both 404'd. Per the rules (retry once then drop), let me retry with alternate URLs: a working LOTO source confirming own-lock/try-out, and the Lean Lexicon 5S term page (correct slug).

### Assistant | 2026-06-10T10:06:05.705Z

[tool_use: WebFetch]

### User | 2026-06-10T10:06:06.323Z

[tool_result] REDIRECT DETECTED: The URL redirects to a different host.

Original URL: https://www.graphicproducts.com/articles/lockout-tagout-steps/
Redirect URL: https://www.duralabel.com/articles/lockout-tagout-steps/
Status: 301 Moved Permanently

To complete your request, I need to fetch content from the redirected URL. Please use WebFetch again with these parameters:
- url: "https://www.duralabel.com/arti
... [+527 chars truncated]

### Assistant | 2026-06-10T10:06:07.505Z

[tool_use: WebFetch]

### User | 2026-06-10T10:06:10.136Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T10:06:16.603Z

Let me follow the LOTO redirect (this is the same-pass follow, not a new retry of a dropped claim). The 5S Lean Lexicon slug is wrong; the foundations file already covers 5S theory anyway, so I'll source the 5S *practice* gotcha from the LOTO-adjacent content or drop it — I have plenty without it. Let me fetch the redirected LOTO steps page.

### Assistant | 2026-06-10T10:06:17.178Z

[tool_use: WebFetch]

### User | 2026-06-10T10:06:18.116Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T10:06:21.868Z

The DuraLabel/Graphic Products LOTO pages are 404'ing. I have the OSHA-confirmed restart-prohibition and stored-energy facts already (from my first fetch). Let me get one clean WebFetch confirmation of the own-lock + try-out discipline from a reputable source. I'll try Wikipedia's Lockout-tagout article, which is authoritative and reliably renders.

### Assistant | 2026-06-10T10:06:24.320Z

[tool_use: WebFetch]

### User | 2026-06-10T10:06:30.576Z

[tool_result] # Lockout-Tagout Discipline: Key Facts & Hazards

## Core Practices

**Individual Locks:**
"Each worker applies their own padlock to the clamp" in group scenarios, ensuring "the locked-out machinery cannot be activated until all workers have removed their padlocks."

**Lock Removal Authority:**
"A person's lock and tag must only be removed by the individual who installed the lock and tag" unless f
... [+987 chars truncated]

### Assistant | 2026-06-10T10:06:38.204Z

All my LOTO discipline claims are now WebFetch-confirmed (Wikipedia + OSHA). I have strong, verified content across all themes. Let me tally my confirmed sources:

1. **SMED** — Wikipedia Single-Minute Exchange of Die (internal/external, convert, stages)
2. **LOTO** — OSHA Control of Hazardous Energy (restart prohibition, stored energy) + Wikipedia Lockout-tagout (own-lock, lock-tag-try, removal authority)
3. **Tool length offsets** — cnccode.com G43/G44/G49 guide (wrong H, H0, no-comp, measurement error, presetting)
4. **First article** — Wikipedia First article inspection (purpose, triggers, what experts verify, scrap risk)
5. **Thermal growth** — anebonmetal.com thermal management (warm-up to equilibrium, first-vs-later drift, in-process probing)
6. **Chip/swarf control** — Production Machining "Fundamentals of Chip Control" (heat path, stringy-chip problems, chipbreaker) + Wikipedia Swarf (sharp/fire/handling hazards)

That's 6 distinct sources covering 8 focus areas with 12+ cited gotchas. Now I'll write the file.

### Assistant | 2026-06-10T10:08:16.301Z

[tool_use: Write]

### User | 2026-06-10T10:08:18.891Z

[tool_result] File created successfully at: H:/prism/knowledge/wiki/shop-floor/shop-floor-applied-practice.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T10:08:25.360Z

The file was created successfully. The Write was not blocked by any file-claim hook. The entry is distinct from both siblings (theory spine and link directory).

GALAXY: shop-floor
FILE: knowledge/wiki/shop-floor/shop-floor-applied-practice.md
CREATED: yes
CITED_GOTCHAS: 13
SOURCES: 8
NUMERICS_LEFT_GATED: yes
NOTE: Tool-length offset wrong/zero (H0 or G43-forgotten) drives the spindle NOSE not the tool tip to programmed Z -- a setup-data crash caught on the bench by tool#=H# convention + offset verification, never in the cut.
