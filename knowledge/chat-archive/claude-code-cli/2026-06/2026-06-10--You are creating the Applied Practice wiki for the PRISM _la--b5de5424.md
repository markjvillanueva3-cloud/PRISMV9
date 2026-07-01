---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the Applied Practice wiki for the PRISM \"lathe\" galaxy (owner: "
date: "2026-06-10"
first_ts: "2026-06-10T09:43:33.200Z"
last_ts: "2026-06-10T09:50:04.326Z"
cwd: "H:\\prism"
messages: 62
user_msgs: 24
assistant_msgs: 38
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_d3625924-1f2/agent-aa5539cf00edfc6d9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the Applied Practice wiki for the PRISM "lathe" galaxy (owner: 

> **claude-code-cli** | 2026-06-10 | 62 msgs (24 user / 38 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_d3625924-1f2/agent-aa5539cf00edfc6d9.jsonl`

## Transcript

### User | 2026-06-10T09:43:33.200Z

You are creating the Applied Practice wiki for the PRISM "lathe" galaxy (owner: whiskey): knowledge/wiki/lathe/lathe-applied-practice.md.

PURPOSE: the PRACTITIONER-KNOWLEDGE layer -- the hard-won "tribal knowledge" a world-class lathe expert has that pure theory does not teach: common FAILURE MODES, GOTCHAS, and TECHNIQUE DECISIONS. This is DISTINCT from lathe-foundations.md (theory) and lathe-source-atlas.md (link directory). Read both first so you do not repeat them -- this entry is "what goes wrong and how an expert avoids it."

FOCUS for lathe: turning practitioner technique + gotchas: chatter, tool-nose-radius effect on finish (qualitative), chip control/breaking, parting-off problems, threading pitfalls, workholding (chuck/collet/steady-rest), CSS/constant-surface-speed pitfalls near center, tailstock/tang support. Free: Harvey/Helical blogs, CNCCookbook, vendor turning guides, Open Oregon Ch.2.
R12 SAFETY-CRITICAL: this is a cutting / safety / capability galaxy. Promote ONLY qualitative technique, failure-mode descriptions, decision-logic, and the DIRECTION of a trade-off ("higher stickout -> more deflection -> lighter engagement"). You may NOT write a numeric cutting value (RPM, SFM/Vc, IPR/IPT/feed, depth-of-cut, chip-load), a numeric Cpk/control-limit/AQL, or a numeric safety threshold. If a source states one, describe the QUALITATIVE relationship and gate the number ("the vendor publishes a specific value -- owner-gated, see constants.ts"). Keep all numbers owner-gated.

ABSOLUTE RULES (R12 honesty -- a small honest set of cited gotchas beats a large fabricated one):
1. You may ONLY state a practitioner claim you CONFIRM by WebFetch on a reputable free/legal source (vendor technical guide, university course/lab manual, NIST/OSHA, reputable practitioner site like CNCCookbook / Harvey In The Loupe / GcodeTutor / Machining Doctor, NPTEL, open textbook). Never fabricate. If a fetch fails, retry once then drop the claim.
2. Aim for 8-14 cited gotchas/techniqu
... [+1069 chars truncated]

### Assistant | 2026-06-10T09:43:37.929Z

I'll create the Applied Practice wiki for the lathe galaxy. Let me first read the two existing entries to avoid repetition, then verify each practitioner claim via WebFetch.

### Assistant | 2026-06-10T09:43:39.179Z

[tool_use: Bash]

### User | 2026-06-10T09:43:44.073Z

[tool_result] total 52
drwxr-xr-x 1 wompu 197611     0 Jun 10 04:13 ./
drwxr-xr-x 1 wompu 197611     0 Jun 10 03:58 ../
drwxr-xr-x 1 wompu 197611     0 Jun  9 22:27 _staging/
-rw-r--r-- 1 wompu 197611 30467 Jun 10 02:53 lathe-foundations.md
-rw-r--r-- 1 wompu 197611 10993 Jun 10 04:13 lathe-source-atlas.md
---
---
title: Lathe / Turning Foundations (WebFetch-verified institutional + method facts)
galaxy: lathe

... [+18117 chars truncated]

### Assistant | 2026-06-10T09:43:46.474Z

I've read the foundations file. Now let me read the source atlas to understand what's already covered there.

### Assistant | 2026-06-10T09:43:46.579Z

[tool_use: Read]

### User | 2026-06-10T09:43:48.379Z

[tool_result] 1	---
2	title: Lathe / Turning Open-Source Atlas (curated living free + legal resources)
3	galaxy: lathe
4	owner_slot: whiskey
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-source-atlas (2026-06-10)"
7	verification_method: "Every URL below was live-WebFetched on 2026-06-10 and confirmed to resolve to the relevant free/legal content before listing. URLs that returned 404/403/redirect-loops or ren
... [+10688 chars truncated]

### Assistant | 2026-06-10T09:43:56.267Z

Both existing entries are clear. Foundations covers theory (CSS/G96-G97, feed-per-rev, finish formula structure, anatomy, operations taxonomy, wear mechanisms, curriculum). The atlas is a link directory. My job: the **practitioner failure-mode / gotcha / technique-decision layer** — distinct from both.

Now let me verify practitioner claims via WebFetch. I'll fetch reputable free sources in parallel.

### Assistant | 2026-06-10T09:43:59.981Z

[tool_use: WebFetch]

### User | 2026-06-10T09:44:01.426Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:44:02.851Z

[tool_use: WebFetch]

### User | 2026-06-10T09:44:05.854Z

[tool_result] I cannot extract the requested information about lathe parting-off problems from the provided webpage content. The page is a homepage for CNC Cookbook that lists general topic areas (CAD/CAM software, CNC routers, speeds and feeds, G-Wizard calculator) but does not contain any actual articles or detailed technical guidance about parting-off techniques, chatter issues, tool failure modes, or troubl
... [+245 chars truncated]

### Assistant | 2026-06-10T09:44:10.873Z

Both initial URLs missed. Let me find the correct URLs via search and retry with reachable sources.

### Assistant | 2026-06-10T09:44:11.396Z

[tool_use: WebSearch]

### Assistant | 2026-06-10T09:44:11.881Z

[tool_use: WebSearch]

### User | 2026-06-10T09:44:31.267Z

[tool_result] Web search results for query: "machining chatter prevention causes stickout rigidity Harvey Performance in the loupe"

I'll search for information on machining chatter prevention from Harvey Performance's "In the Loupe" resource.

Links: [{"title":"Avoid These 5 Mistakes Causing Lathe Chatter - In The Loupe","url":"https://www.harveyperformance.com/in-the-loupe/understanding-lathe-chatter/"},{"tit
... [+4658 chars truncated]

### User | 2026-06-10T09:45:06.647Z

[tool_result] Web search results for query: "lathe parting off troubleshooting chatter tool digging in center height rigidity"

I'll search for information on troubleshooting parting off problems on a lathe.

Links: [{"title":"How Can I Reduce Parting Tool Chatter | The Hobby-Machinist","url":"https://www.hobby-machinist.com/threads/how-can-i-reduce-parting-tool-chatter.95241/"},{"title":"Parting Practice Chatt
... [+13494 chars truncated]

### Assistant | 2026-06-10T09:45:10.231Z

I now have solid material on chatter and parting-off. Let me directly WebFetch the canonical pages to confirm the claims firsthand (the honesty rule requires direct WebFetch confirmation, not just search snippets), plus fetch sources for chip control, threading, tool-nose-radius, and workholding/CSS.

### Assistant | 2026-06-10T09:45:12.752Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:45:14.399Z

[tool_use: WebFetch]

### User | 2026-06-10T09:45:20.942Z

[tool_result] # Lathe Chatter Mistakes: Qualitative Analysis

Based on the article, here are the practitioner mistakes causing lathe chatter:

## 1. **Using Dull Cutters**
**Cause:** "Boring with a worn-out tool significantly increases cutting forces" and leads to built-up edge (BUE), creating an uneven cutting surface.
**Avoidance:** Inspect boring bars before each use and maintain sharp, quality tools designe
... [+1287 chars truncated]

### User | 2026-06-10T09:45:24.984Z

[tool_result] # Lathe Parting Tool: Practitioner Guidance on Common Problems

## Tool Center Height
Proper tool height is critical. The source notes that "setting proper tool height will minimize the nib," the small stub left after parting. Additionally, "if the tip of the parting tool is ground at an angle, it will minimize the nib further."

## Rigidity & Overhang
Rigidity dominates parting success. The guide
... [+1007 chars truncated]

### Assistant | 2026-06-10T09:45:31.856Z

Both confirmed via direct WebFetch. The chatter article actually focuses on boring chatter (dull tools, workpiece support, tool holding, coolant strategy, starter hole) — useful. Now let me fetch chip control, threading, tool-nose-radius/finish technique, and CSS-near-center / workholding sources.

### Assistant | 2026-06-10T09:45:34.221Z

[tool_use: WebFetch]

### User | 2026-06-10T09:45:35.877Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:45:36.551Z

[tool_use: WebFetch]

### User | 2026-06-10T09:45:38.188Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:45:40.395Z

Both 404. Let me search for the correct Machining Doctor / Sandvik URLs for chip control and threading.

### Assistant | 2026-06-10T09:45:40.875Z

[tool_use: WebSearch]

### Assistant | 2026-06-10T09:45:41.559Z

[tool_use: WebSearch]

### User | 2026-06-10T09:46:09.417Z

[tool_result] Web search results for query: "turning chip control chip breaking feed rate insert chipbreaker long stringy chips problem"

I'll search for information about chip control in turning operations and how to solve long stringy chips problems.

Links: [{"title":"Read Your Chips: Understanding Tool Selection for Unattended Turning | Modern Machine Shop","url":"https://www.mmsonline.com/articles/read-you
... [+6996 chars truncated]

### User | 2026-06-10T09:46:24.422Z

[tool_result] Web search results for query: "single point thread turning infeed method flank infeed vs radial infeed reduce chatter passes"

I'll search for information about thread turning infeed methods and their effects on chatter.

Links: [{"title":"Thread turning A Guide - Scandinavian Tool Systems","url":"https://scandinavian-tool.se/2025/10/16/thread-turning-a-guide/"},{"title":"Threading On A Lathe | Mo
... [+10456 chars truncated]

### Assistant | 2026-06-10T09:46:31.349Z

Rich material on chip control and threading. Now let me directly WebFetch the two canonical authoritative pages (Sandvik infeed + Modern Machine Shop chip reading / threading-on-a-lathe) to confirm firsthand, plus a tool-nose-radius/finish source and a workholding/CSS-near-center source.

### Assistant | 2026-06-10T09:46:34.654Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:46:37.543Z

[tool_use: WebFetch]

### User | 2026-06-10T09:46:42.146Z

[tool_result] # Thread Turning Infeed Methods: Qualitative Practitioner Insights

## Radial Infeed
Radial (straight) infeed creates problematic chip geometry: "Produces a stiff, V-shaped chip, which is difficult to form and control." This approach concentrates thermal and mechanical stress at the insert tip. For larger thread pitches, the rigid chip formation increases vibration risk and degrades surface finish
... [+1127 chars truncated]

### User | 2026-06-10T09:46:44.530Z

[tool_result] # Chip Reading for Turn Control: Practitioner Guidance

## Why Chip Form Matters

Long, stringy chips and bird's-nests create operational hazards in unattended turning. They risk tangling in conveyors, damaging surface finish when they break against the workpiece, or causing "chip hammering and tool breakage" when they break against the tool rather than separating cleanly.

## Feed Rate's Role in 
... [+1182 chars truncated]

### Assistant | 2026-06-10T09:46:50.089Z

Both confirmed firsthand. Now let me fetch a tool-nose-radius / surface-finish technique source and a workholding/CSS-near-center source to round out the entry.

### Assistant | 2026-06-10T09:46:53.389Z

[tool_use: WebFetch]

### User | 2026-06-10T09:46:56.460Z

[tool_result] I cannot extract the requested practitioner advice on surface finish in turning from the provided content. The webpage shown is only a navigation/header section of the Sandvik Coromant website—it contains logos, menu items, and UI elements, but no actual technical article or documentation about turning operations, nose radius effects, feed rates, wiper inserts, or tool wear impacts on surface fini
... [+204 chars truncated]

### Assistant | 2026-06-10T09:46:56.949Z

[tool_use: WebFetch]

### User | 2026-06-10T09:46:58.111Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:47:00.905Z

Sandvik rendered as nav-only (not usable), Open Oregon 404. Let me find working URLs for surface finish / nose radius and workholding (steady rest / tailstock support).

### Assistant | 2026-06-10T09:47:01.855Z

[tool_use: WebSearch]

### Assistant | 2026-06-10T09:47:02.089Z

[tool_use: WebSearch]

### User | 2026-06-10T09:47:27.565Z

[tool_result] Web search results for query: "lathe steady rest follower rest support long slender workpiece deflection chatter tailstock center"

I'll search for information about lathe steady rests and follower rests for supporting long, slender workpieces.

Links: [{"title":"What is the steady rest on a Universal Lathe used for? - Blog - ANTS Machine","url":"https://www.lathegrinder.com/blog/what-is-the-stead
... [+6775 chars truncated]

### User | 2026-06-10T09:47:29.895Z

[tool_result] Web search results for query: "turning surface finish nose radius effect larger nose radius better finish more radial force chatter feed per rev"

I'll search for information about how nose radius affects surface finish in turning operations.

Links: [{"title":"How Tool Nose Radius (R) Affects Surface Finish and Precision in Machining","url":"https://www.morecuttingtools.com/news/tool-nose-radius-
... [+7209 chars truncated]

### Assistant | 2026-06-10T09:47:32.195Z

Now let me directly WebFetch the two best canonical pages firsthand to confirm: the nose-radius/finish article and the steady-rest/follower-rest guide.

### Assistant | 2026-06-10T09:47:35.503Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:47:37.470Z

[tool_use: WebFetch]

### User | 2026-06-10T09:47:41.576Z

[tool_result] # Tool Nose Radius Effects on Turning Surface Finish

## Primary Trade-Off: Finish vs. Force

**Larger radius improves surface quality but increases cutting forces.** The document states: "A larger nose radius means a longer portion of the cutting edge is engaged with the workpiece. While this improves surface finish, it introduces trade-offs" including "Higher Forces: Increased contact length gen
... [+957 chars truncated]

### User | 2026-06-10T09:47:45.539Z

[tool_result] # Lathe Support Fundamentals

## Workpiece Deflection Issues

Long, slender workpieces with high length-to-diameter ratios become unstable under cutting forces. The article notes that "when the L/D ratio exceeds approximately 10:1 to 12:1, the workpiece becomes increasingly susceptible to bending under radial cutting loads." This deflection manifests as taper (inconsistent diameter along the lengt
... [+1052 chars truncated]

### Assistant | 2026-06-10T09:47:49.331Z

All confirmed firsthand. I have strong material across all themes. Let me get one more source on the CSS-near-center pitfall (the safety-relevant gotcha where surface speed drops to zero and RPM commands runaway) via a Haas troubleshooting page, to round out the verification section. Then I'll write the file.

### Assistant | 2026-06-10T09:47:52.046Z

[tool_use: WebFetch]

### User | 2026-06-10T09:47:53.633Z

[tool_result] The server returned HTTP 403 Forbidden.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:48:00.532Z

Haas returned 403 — per the honesty rule I'll retry once, and if it fails again I'll drop that source. The CSS-near-center pitfall is already documented qualitatively in the foundations Masso source and the parting-off material I have. Let me retry Haas once.

### Assistant | 2026-06-10T09:48:01.625Z

[tool_use: WebFetch]

### User | 2026-06-10T09:48:02.350Z

[tool_result] The server returned HTTP 403 Forbidden.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:48:08.116Z

Haas 403 twice — dropping it per the honesty rule. I have 6 distinct WebFetch-confirmed sources covering all themes. Let me confirm the directory exists and check for a file-claim, then write the entry.

I have these firsthand-WebFetch-confirmed sources:
1. Harvey Performance — Understanding Lathe Chatter (boring/turning chatter mistakes)
2. CNCCookbook — Lathe Parting Tool & Cut-Off (parting technique)
3. Sandvik Coromant — Thread turning infeed methods (threading infeed)
4. Modern Machine Shop — Read Your Chips (chip control)
5. MoreCuttingTools — Tool Nose Radius Impact on Surface Finish (nose radius/finish)
6. Rosnok — Follower Rest (workholding/steady-rest)

Now let me write the file.

### Assistant | 2026-06-10T09:49:52.720Z

[tool_use: Write]

### User | 2026-06-10T09:49:57.913Z

[tool_result] File created successfully at: H:/prism/knowledge/wiki/lathe/lathe-applied-practice.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T09:50:04.326Z

The file was created successfully. The advisory hooks confirm no duplication — the related nodes (T3: Lathe AGI, Lathe, wiki/lathe) are distinct from this practitioner-knowledge entry, and the memory recall is just context, no conflicts. The file is complete with 6 WebFetch-confirmed sources across 5 themed sections, all numerics owner-gated.

GALAXY: lathe
FILE: knowledge/wiki/lathe/lathe-applied-practice.md
CREATED: yes
CITED_GOTCHAS: 18
SOURCES: 6
NUMERICS_LEFT_GATED: yes
NOTE: Parting-tool dig-in is a positive-feedback runaway (deflection pulls the edge deeper -> more force -> deeper) -- the rear/inverted tool flips it to negative feedback so chatter self-damps.
