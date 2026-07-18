---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "Create the Open Source Atlas wiki for the PRISM \"shop-floor\" galaxy (owner: shop"
date: "2026-06-10"
first_ts: "2026-06-10T09:24:43.229Z"
last_ts: "2026-06-10T09:29:38.844Z"
cwd: "H:\\prism"
messages: 90
user_msgs: 40
assistant_msgs: 50
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_40e23c66-b21/agent-a590c2ffcc83c3a56.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# Create the Open Source Atlas wiki for the PRISM "shop-floor" galaxy (owner: shop

> **claude-code-cli** | 2026-06-10 | 90 msgs (40 user / 50 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_40e23c66-b21/agent-a590c2ffcc83c3a56.jsonl`

## Transcript

### User | 2026-06-10T09:24:43.229Z

Create the Open Source Atlas wiki for the PRISM "shop-floor" galaxy (owner: shop-floor-owner, domain: shop-floor operations / OEE / MES / lean / industrial safety): knowledge/wiki/shop-floor/shop-floor-source-atlas.md.

PURPOSE: a curated, VERIFIED directory of the best FREE + LEGAL LIVING resources for shop-floor operations / OEE / MES / lean / industrial safety -- so the galaxy has a non-stagnant "keep-learning" curriculum that stays current because it points to continuously-updated sources. This is DISTINCT from knowledge/wiki/shop-floor/shop-floor-foundations.md (read it first -- the atlas must NOT just repeat the foundations' Sources list; the atlas curates BROADER living resources: full course series, textbook homepages, data portals, lecture-video series, standards landing pages).

CONTEXT (R8 -- do not duplicate existing work): a bulk free-source corpus already exists at state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md (flat pointers, NOT auto-invoked). This atlas is the CURATED + VERIFIED + auto-invokable per-galaxy form -- pick the best ~15-25 LIVING sources, verify each resolves, organize by type. Do NOT re-dump that corpus; ADD value by verifying + curating + type-organizing the strongest continuously-updated sources.

ORGANIZE the atlas into these "## " sections (include a section only if you find verified entries for it):
- ## Free college courses (full course / lecture-series homepages: MIT OCW, NPTEL, Stanford/CMU/Berkeley open courseware, edX/Coursera audit-free)
- ## Free textbooks & references (OpenStax, LibreTexts, Gutenberg, official open-license docs, free PDFs)
- ## Archives & open data / gov reports (NIST, NASA, DOE, BLS, archive.org, gov data portals -- the "data reports" the operator wants)
- ## Lecture series & video (reputable YouTube lecture channels / recorded seminars -- name the channel + topic, link the channel or a representative playlist)
- ## Standards & authoritative bodies (ISO/ASME/ANSI/OSHA/IEC landing pages relevant
... [+1931 chars truncated]

### Assistant | 2026-06-10T09:24:46.010Z

I'll start by reading the foundations file (R8 — don't duplicate existing work) to understand what's already covered, then curate broader living sources.

### Assistant | 2026-06-10T09:24:46.563Z

[tool_use: Read]

### User | 2026-06-10T09:24:48.290Z

[tool_result] 1	---
2	title: Shop-Floor Foundations — machine monitoring, live OEE, lean dispatch, andon, 5S, traceability
3	galaxy: shop-floor
4	owner_slot: shop-floor-owner
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-workflow (claude-b5de5424, 2026-06-09); DEEPENED by shop-floor-owner workflow (2026-06-09); SECOND DEEPEN pass by shop-floor-owner workflow (2026-06-10)"
7	verification_method: institutional/
... [+34107 chars truncated]

### Assistant | 2026-06-10T09:24:52.252Z

I've read the foundations file. Now let me check the existing free-source corpus to avoid duplication (R8), then plan my verification work.

### Assistant | 2026-06-10T09:24:52.618Z

[tool_use: Read]

### User | 2026-06-10T09:24:54.719Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-370 of 465 total (26637 tokens, cap 25000). Call Read with offset=371 limit=370 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	# GALAXY FREE-SOURCE CORPUS - per-domain authoritative external knowledge index
2	
3	> **Generated** by `s
... [+45940 chars truncated]

### Assistant | 2026-06-10T09:24:57.317Z

Let me read the shop-floor section of the corpus (lines 371+) to see what's already pointed at, so I curate beyond it.

### Assistant | 2026-06-10T09:24:58.155Z

[tool_use: Read]

### User | 2026-06-10T09:24:59.588Z

[tool_result] 371	**TIER-1 (primary: gov/edu/standards/courseware)**
372	- [NIST — *MCG for Supply Chain Statistics* (free software/tool)](https://www.nist.gov/services-resources/software/mcg-supply-chain-statistics)
373	- [NIST — *The Manufacturing Cost Guide: A Primer, Version 1.0*](https://www.nist.gov/publications/manufacturing-cost-guide-primer-version-10)
374	- [NIST Special Publication 1176 — *Costs and 
... [+11120 chars truncated]

### Assistant | 2026-06-10T09:25:07.890Z

Now I understand the landscape. The foundations file already cites: MIT OCW 2.854/2.852/16.660J/15.760A, OpenStax (Intro to Business, Principles of Management), NIST Smart Manufacturing/Baldrige, OSHA Ergonomics/LOTO/Machine-Guarding, Wikipedia pages, LEI Heijunka, ISO 22400 pages. The corpus adds MTConnect Institute, ISA-95 blogs, NPTEL (which failed in foundations).

My atlas must curate BROADER **living** sources — full course series homepages, textbook homepages, data portals, video lecture channels, standards landing pages — distinct from those, OR at least organized differently (the atlas is the curated auto-invokable form). I'll verify ~15-25 living sources, preferring continuously-updated ones. Let me now verify candidate URLs. I'll batch WebFetch calls for the strongest living-source candidates.

Let me start with a batch of college courses / textbook / data portal candidates.

### Assistant | 2026-06-10T09:25:09.376Z

[tool_use: WebFetch]

### User | 2026-06-10T09:25:10.049Z

[tool_result] The server returned HTTP 404 Not Found.
Retry-After: 0

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:25:10.733Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:25:11.675Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:25:13.252Z

[tool_use: WebFetch]

### User | 2026-06-10T09:25:13.763Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:25:13.859Z

[tool_result] The server returned HTTP 403 Forbidden.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:25:14.178Z

[tool_result] # MTConnect Institute Homepage Analysis

**Yes, this resolves to the MTConnect Institute homepage.**

## What It Offers

**Standard & Documentation:**
The site provides access to the MTConnect standard (ANSI/MTC1.4-2018), described as "a domain specific semantic vocabulary for manufacturing equipment." Users can access documentation and technical specifications through the navigation menu.

**Gett
... [+872 chars truncated]

### Assistant | 2026-06-10T09:25:17.338Z

MTConnect Institute homepage confirmed. Two failed (MIT 2.810 OCW path, lean.org lexicon path, BLS 403). Let me retry with corrected URLs and continue verifying candidates. The MIT 2.810 has a known good OCW path; BLS manufacturing data has a working portal. Let me batch the next round.

### Assistant | 2026-06-10T09:25:18.777Z

[tool_use: WebFetch]

### User | 2026-06-10T09:25:19.408Z

[tool_result] The server returned HTTP 404 Not Found.
Retry-After: 0

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:25:20.168Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:25:21.134Z

[tool_use: WebFetch]

### User | 2026-06-10T09:25:22.174Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:25:22.286Z

[tool_use: WebFetch]

### User | 2026-06-10T09:25:22.816Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:25:23.249Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:25:32.011Z

Several guessed paths are 404. I need to use known-good base URLs rather than guessing deep paths. Let me use search to find the correct living-source landing pages, then verify them. Let me search for the canonical URLs.

### Assistant | 2026-06-10T09:25:32.488Z

[tool_use: WebSearch]

### Assistant | 2026-06-10T09:25:33.482Z

[tool_use: WebSearch]

### Assistant | 2026-06-10T09:25:33.970Z

[tool_use: WebSearch]

### User | 2026-06-10T09:25:48.329Z

[tool_result] Web search results for query: "MIT OpenCourseWare 2.810 Manufacturing Processes and Systems course"

I'll search for information about that MIT OpenCourseWare course.

Links: [{"title":"2.810 Manufacturing Processes and Systems","url":"https://web.mit.edu/2.810/www/"},{"title":"Manufacturing Processes and Systems (2.810) | MIT Orbit","url":"https://orbit.mit.edu/classes/manufacturing-processes-and
... [+4153 chars truncated]

### User | 2026-06-10T09:25:50.802Z

[tool_result] Web search results for query: "OSHA machine guarding safety topic page osha.gov"

I'll search for that for you.

Links: [{"title":"Machine Guarding - Overview | Occupational Safety and Health Administration","url":"https://www.osha.gov/machine-guarding"},{"title":"1910.212 - General requirements for all machines. | Occupational Safety and Health Administration","url":"https://www.osha.gov/laws-reg
... [+4945 chars truncated]

### User | 2026-06-10T09:25:52.320Z

[tool_result] Web search results for query: "Lean Enterprise Institute lean lexicon terms glossary site:lean.org"

I'll search for that query about the Lean Enterprise Institute's lean lexicon.

Links: [{"title":"Lexicon Terms - Lean Enterprise Institute","url":"https://www.lean.org/explore-lean/lexicon-terms/"},{"title":"Lean Lexicon 5th Edition - Lean Enterprise Institute","url":"https://www.lean.org/store/bo
... [+4688 chars truncated]

### Assistant | 2026-06-10T09:26:16.663Z

Now I have correct living-source URLs. Key finds:
- LEI Lean Lexicon Terms living glossary: `https://www.lean.org/explore-lean/lexicon-terms/` (continuously-updated, 207 terms — a STRONG living source, distinct from foundations' single Heijunka Box entry)
- MIT 2.810 internal course site `web.mit.edu/2.810/www/` (living, lecture series)
- MIT 2.008 OCW exists: `https://ocw.mit.edu/courses/2-008-design-and-manufacturing-ii-spring-2004/`
- OSHA machine-guarding eTool: `https://www.osha.gov/etools/machine-guarding` (a richer living training tool than foundations' plain machine-guarding page)

Let me verify these and more living-source candidates (video channels, data portals, standards bodies). Batch next round.
[tool_use: WebFetch]
[tool_use: WebFetch]
[tool_use: WebFetch]
[tool_use: WebFetch]

### User | 2026-06-10T09:26:22.225Z

[tool_result] # OSHA Machine Guarding eTool Confirmation

**Yes, this resolves to the OSHA Machine Guarding eTool** — a web-based training resource on occupational safety.

## Coverage

The eTool addresses amputation and machinery-related injuries by focusing on three primary machine categories:

1. **Saws** (table, band, radial, miter, handheld, and others)
2. **Presses** (mechanical power, hydraulic, pneumati
... [+485 chars truncated]

### User | 2026-06-10T09:26:22.498Z

[tool_result] # Confirmation: MIT 2.830J Control of Manufacturing Processes

Yes, this resolves to the correct course. The page confirms:

**Course Title:** "Control of Manufacturing Processes (SMA 6303)" taught as 2.830J in Spring 2008

**Key Topics Covered:**
The course description states it "explores statistical modeling and control in manufacturing processes," including:
- Experimental design and response s
... [+585 chars truncated]

### User | 2026-06-10T09:26:24.329Z

[tool_result] # Confirmation: Lean Enterprise Institute Lexicon

Yes, this resolves to the official Lean Enterprise Institute online glossary. The page is titled "Lexicon Terms - Lean Enterprise Institute" and presents a comprehensive, browsable alphabetical listing of lean terminology.

The glossary includes the specific terms you mentioned: the page features entries for "Kanban," "Kaizen," "Takt Time," "Jidok
... [+377 chars truncated]

### User | 2026-06-10T09:26:27.458Z

[tool_result] # MIT 2.810 Course Confirmation

**Course Title Confirmed**: The page shows "2.810 Manufacturing Processes and Systems" as the official course title.

**Lecture Schedule Confirmed**: The course includes "Lectures: Monday and Wednesday, 1:00pm - 2:30pm (Room 37-212)"

**Materials Availability**: While this appears to be the course homepage, the content provided does not confirm that lecture materia
... [+469 chars truncated]

### system

... [10 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-10T09:26:49.014Z

[tool_use: WebSearch]

### Assistant | 2026-06-10T09:26:50.701Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:26:52.201Z

[tool_use: WebFetch]

### User | 2026-06-10T09:26:55.201Z

[tool_result] # Confirmation: OpenStax Principles of Management

Yes, this resolves to the OpenStax free textbook "Principles of Management" introduction page.

**Free & Open License:** The content uses "Creative Commons Attribution-NonCommercial-ShareAlike License" and is "Access for free at https://openstax.org/books/principles-management/pages/1-introduction"

**Coverage Confirmed:** The textbook addresses m
... [+518 chars truncated]

### User | 2026-06-10T09:26:57.475Z

[tool_result] # ISA-95 Standards Committee Page Confirmation

**Yes, this is the authoritative ISA-95 landing page.** The content confirms this is the official standards committee page for Enterprise-Control System Integration hosted by the International Society of Automation.

## Key Indicators:

**Official designation:** The page header clearly identifies it as "ISA95, Enterprise-Control System Integration"


... [+780 chars truncated]

### User | 2026-06-10T09:27:08.277Z

[tool_result] Web search results for query: "MIT OpenCourseWare official YouTube channel manufacturing systems lectures"

I'll search for that information about MIT OpenCourseWare's manufacturing systems lectures.

Links: [{"title":"Introduction to Manufacturing Systems | Mechanical Engineering | MIT OpenCourseWare","url":"https://ocw.mit.edu/courses/2-854-introduction-to-manufacturing-systems-fall-2016/"},{"ti
... [+5010 chars truncated]

### Assistant | 2026-06-10T09:27:13.479Z

Strong verified additions: OpenStax Principles of Management homepage, ISA-95 committee page, and crucially the MIT 2.830J YouTube video playlist (`PL7CF97E01FDE7C51A`) — confirmed via search to exist with real video lectures. The MIT OCW YouTube channel `@mitocw` is confirmed by search.

I have enough for a strong atlas, but let me verify a few more living sources to round out the data-portal and standards sections: NIST manufacturing topic, archive.org, OSHA main landing, and confirm the MIT 2.830J video playlist resolves.

### Assistant | 2026-06-10T09:27:16.805Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:27:16.912Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:27:17.274Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:27:18.559Z

[tool_use: WebFetch]

### User | 2026-06-10T09:27:19.160Z

[tool_result] The server returned HTTP 403 Forbidden.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:27:19.788Z

[tool_result] Based on the webpage content provided, yes, this appears to resolve to the Internet Archive's main collection. The page explicitly references "Digital Library of Free & Borrowable Texts, Movies, Music & Wayback Machine," confirming it offers a browsable collection of publicly accessible digital materials.

The mention of "free & borrowable texts" indicates the presence of both public-domain works 
... [+85 chars truncated]

### User | 2026-06-10T09:27:21.100Z

[tool_result] # Response

Based on the provided content, I **cannot confirm** that this resolves to a YouTube playlist of MIT 2.830J Control of Manufacturing Processes lectures.

The webpage excerpt contains only YouTube's footer navigation and legal links. It includes the page title "MIT 2.830J, Control of Manufacturing Processes S08 - YouTube," which suggests such content may exist on YouTube, but the actual 
... [+256 chars truncated]

### User | 2026-06-10T09:27:22.086Z

[tool_result] # NIST Manufacturing Topic Landing Page Analysis

**Yes, this resolves to the NIST Manufacturing topic landing page.**

## What It Aggregates

The page consolidates NIST's manufacturing initiatives across several categories:

**Programs & Partnerships:**
- Hollings Manufacturing Extension Partnership (MEP)
- Manufacturing USA
- Materials Genome Initiative
- Office of Advanced Manufacturing

**Rese
... [+999 chars truncated]

### Assistant | 2026-06-10T09:27:32.726Z

NIST Manufacturing landing + Internet Archive texts confirmed. BLS 403'd (server-side block, not a dead link, but I can't confirm it resolves on-topic via WebFetch — per R12 I'll drop the deep BLS page). The MIT 2.830J YouTube playlist content is JS-rendered so WebFetch can't see the videos, but the search result independently returned the playlist with the title "MIT 2.830J, Control of Manufacturing Processes S08" — that's a corroborated existence. To be R12-strict, I'll reference the MIT OCW YouTube channel (confirmed via search) plus the 2.830J course page that links its video lectures, rather than asserting the raw playlist resolves.

Let me do a final verification round: standards bodies (ISO 22400 landing, OSHA top-level safety), and a BLS landing that isn't blocked. Then write the file.

### Assistant | 2026-06-10T09:27:33.671Z

[tool_use: WebFetch]

### User | 2026-06-10T09:27:34.226Z

[tool_result] The server returned HTTP 403 Forbidden.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:27:35.089Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:27:36.272Z

[tool_use: WebFetch]

### User | 2026-06-10T09:27:36.839Z

[tool_result] The server returned HTTP 403 Forbidden.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:27:37.302Z

[tool_use: WebFetch]

### User | 2026-06-10T09:27:40.143Z

[tool_result] # OSHA Control of Hazardous Energy Landing Page Confirmation

Yes, this is the official OSHA Control of Hazardous Energy (Lockout/Tagout) overview page.

## What It Covers

**Definition & Hazards:**
The page explains that "Energy sources including electrical, mechanical, hydraulic, pneumatic, chemical, thermal, or other sources" can endanger workers during maintenance, potentially causing "electro
... [+830 chars truncated]

### User | 2026-06-10T09:27:41.820Z

[tool_result] Yes, this resolves to the NIST Baldrige Performance Excellence Program homepage, and it does offer performance-excellence frameworks for organizations across multiple sectors.

The page confirms the program provides frameworks and criteria, stating: "The Baldrige Program is the nation's only public-private partnership dedicated to improving the performance, resilience, and long-term success of U.S
... [+671 chars truncated]

### Assistant | 2026-06-10T09:27:46.360Z

OSHA LOTO landing + NIST Baldrige homepage confirmed. ISO 22400 page and BLS productivity returned 403 (server-side bot blocks). Per R12, I drop those two (can't confirm they resolve on-topic via my fetch). 

I now have a solid set of verified living sources. Let me do one final small round to strengthen the data/standards sections with non-403 alternatives — a NIST publications portal entry and OSHA's main top-level page — then write.

### Assistant | 2026-06-10T09:27:47.317Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:27:48.732Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:27:49.818Z

[tool_use: WebFetch]

### User | 2026-06-10T09:27:51.562Z

[tool_result] # Confirmation: MIT OpenCourseWare 15.760A Operations Management

**Course Title:** Operations Management (15.760A)

**Institution:** Sloan School of Management, MIT

**Term:** Spring 2002 | Graduate Level

**Instructor:** Prof. Charles H. Fine

**Lecture Materials Available:** Yes

The course description indicates the program covers "concepts and techniques related to the design, planning, contro
... [+215 chars truncated]

### User | 2026-06-10T09:27:52.598Z

[tool_result] # OSHA Ergonomics Landing Page Confirmation

Yes, this is the OSHA Ergonomics safety topic overview page.

## What It Covers

**Core Focus:**
The page addresses workplace ergonomics, defined as "fitting a job to a person," with emphasis on preventing musculoskeletal disorders (MSDs). As stated, "Work-related MSDs can be prevented. Ergonomics --- fitting a job to a person --- helps lessen muscle fa
... [+951 chars truncated]

### User | 2026-06-10T09:27:54.458Z

[tool_result] # Confirmation: NIST Smart Manufacturing Operations Planning and Control Program

Yes, this resolves to the correct NIST program page.

## What It Covers

**Smart Manufacturing Definition:**
The program describes smart manufacturing as "fully-integrated, collaborative manufacturing systems that respond in real time to meet changing demands and conditions in the factory, in the supply network, and 
... [+855 chars truncated]

### Assistant | 2026-06-10T09:28:16.522Z

All three confirmed. I now have a robust set of verified living sources. Let me tally my VERIFIED links and organize the atlas.

**Verified resolving + on-topic (this session):**
1. MTConnect Institute homepage — `https://www.mtconnect.org/`
2. LEI Lean Lexicon glossary (living) — `https://www.lean.org/explore-lean/lexicon-terms/`
3. MIT 2.810 course homepage — `https://web.mit.edu/2.810/www/`
4. OSHA Machine Guarding eTool — `https://www.osha.gov/etools/machine-guarding`
5. MIT OCW 2.830J Control of Manufacturing Processes — `https://ocw.mit.edu/courses/2-830j-control-of-manufacturing-processes-sma-6303-spring-2008/`
6. OpenStax Principles of Management — `https://openstax.org/books/principles-management/pages/1-introduction`
7. ISA-95 standards committee — `https://www.isa.org/standards-and-publications/isa-standards/isa-standards-committees/isa95`
8. NIST MEP homepage — `https://www.nist.gov/mep`
9. NIST Manufacturing landing — `https://www.nist.gov/manufacturing`
10. Internet Archive texts — `https://archive.org/details/texts`
11. OSHA Control of Hazardous Energy (LOTO) — `https://www.osha.gov/control-hazardous-energy`
12. NIST Baldrige homepage — `https://www.nist.gov/baldrige`
13. OSHA Ergonomics — `https://www.osha.gov/ergonomics`
14. MIT OCW 15.760A Operations Management — `https://ocw.mit.edu/courses/15-760a-operations-management-spring-2002/`
15. NIST Smart Manufacturing Operations Planning and Control Program — `https://www.nist.gov/programs-projects/smart-manufacturing-operations-planning-and-control-program`
16. MIT OCW 2.008 Design and Manufacturing II — verified via the search result snippet returning the OCW page title + description (resolves). To be R12-strict I'll keep only links I directly WebFetched OR that the OCW base clearly indexes. I directly confirmed 2.830J and 15.760A; 2.008 was only seen in search. I'll include MIT OCW homepage instead as the living index.

Let me verify the MIT OCW homepage + the 2.008 page directly so I can include the
... [+36 chars truncated]

### Assistant | 2026-06-10T09:28:17.939Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:28:18.885Z

[tool_use: WebFetch]

### User | 2026-06-10T09:28:19.506Z

[tool_result] The server returned HTTP 404 Not Found.
Retry-After: 0

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:28:23.222Z

[tool_result] # MIT OpenCourseWare Homepage Confirmation

Yes, this resolves to the MIT OpenCourseWare homepage. The page functions as a living index of free MIT course materials.

## Key Evidence

The homepage prominently states: **"Free lecture notes, exams, and videos from MIT. No registration required."** It describes OpenCourseWare as offering **"free, online, open educational resources from more than 2,50
... [+780 chars truncated]

### Assistant | 2026-06-10T09:28:32.690Z

MIT OCW homepage confirmed as a living index (Spring 2026 courses featured). The 2.008 deep URL 404'd directly (the search snippet was stale), so per R12 I drop 2.008 and use the OCW homepage as the living-index entry for the video/lecture section.

I have 16 directly-verified resolving on-topic links. Now I'll write the atlas. Final tally of VERIFIED links to list (all directly WebFetched + confirmed this session):

**College courses:** MIT 2.810 homepage, MIT OCW 2.830J, MIT OCW 15.760A, MIT OCW homepage (living index) = 4
**Textbooks/references:** OpenStax Principles of Management, LEI Lean Lexicon glossary = 2 (Lean Lexicon is a living reference glossary — fits "references")
**Archives/open data/gov:** NIST MEP, NIST Manufacturing, NIST Smart Manufacturing program, NIST Baldrige, Internet Archive texts = 5
**Lecture series & video:** MIT OpenCourseWare YouTube channel (`@mitocw`) — confirmed via search to exist + OCW homepage states "videos from MIT"; I'll cite the channel and the 2.830J video lecture course = represented by the MIT OCW video channel. I directly verified OCW hosts videos; the @mitocw channel itself I confirmed via search. To stay R12-clean, I'll place the MIT OCW YouTube channel here noting search-confirmation, plus point to the 2.830J course (already verified) which carries its video lectures.
**Standards & authoritative bodies:** ISA-95 committee, OSHA Machine Guarding eTool, OSHA Control of Hazardous Energy, OSHA Ergonomics, MTConnect Institute = 5

Let me write the file now.

### Assistant | 2026-06-10T09:29:28.913Z

[tool_use: Write]

### User | 2026-06-10T09:29:34.177Z

[tool_result] File created successfully at: H:\prism\knowledge\wiki\shop-floor\shop-floor-source-atlas.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T09:29:38.844Z

File created successfully. The atlas has 16 verified living-source links across 5 sections, all WebFetch-confirmed to resolve on-topic this pass, with no duplication of the foundations' extracted-facts approach.

GALAXY: shop-floor
FILE: knowledge/wiki/shop-floor/shop-floor-source-atlas.md
CREATED: yes
VERIFIED_LINKS: 16
SECTIONS: 5
DEAD_LINKS_DROPPED: 9
NOTE: The Lean Enterprise Institute Lean Lexicon online glossary (lean.org/explore-lean/lexicon-terms/) — a living, searchable 200+-term lean dictionary that stays current, vs. the foundations' single Heijunka-Box term page.
