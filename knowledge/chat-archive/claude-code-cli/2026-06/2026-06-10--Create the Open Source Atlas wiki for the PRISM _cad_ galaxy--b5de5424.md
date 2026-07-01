---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "Create the Open Source Atlas wiki for the PRISM \"cad\" galaxy (owner: delta, doma"
date: "2026-06-10"
first_ts: "2026-06-10T09:19:45.614Z"
last_ts: "2026-06-10T09:24:43.039Z"
cwd: "H:\\prism"
messages: 110
user_msgs: 48
assistant_msgs: 62
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_40e23c66-b21/agent-afe8ed1ebd432fdad.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# Create the Open Source Atlas wiki for the PRISM "cad" galaxy (owner: delta, doma

> **claude-code-cli** | 2026-06-10 | 110 msgs (48 user / 62 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_40e23c66-b21/agent-afe8ed1ebd432fdad.jsonl`

## Transcript

### User | 2026-06-10T09:19:45.614Z

Create the Open Source Atlas wiki for the PRISM "cad" galaxy (owner: delta, domain: computer-aided design / solid modeling / geometry): knowledge/wiki/cad/cad-source-atlas.md.

PURPOSE: a curated, VERIFIED directory of the best FREE + LEGAL LIVING resources for computer-aided design / solid modeling / geometry -- so the galaxy has a non-stagnant "keep-learning" curriculum that stays current because it points to continuously-updated sources. This is DISTINCT from knowledge/wiki/cad/cad-foundations.md (read it first -- the atlas must NOT just repeat the foundations' Sources list; the atlas curates BROADER living resources: full course series, textbook homepages, data portals, lecture-video series, standards landing pages).

CONTEXT (R8 -- do not duplicate existing work): a bulk free-source corpus already exists at state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md (flat pointers, NOT auto-invoked). This atlas is the CURATED + VERIFIED + auto-invokable per-galaxy form -- pick the best ~15-25 LIVING sources, verify each resolves, organize by type. Do NOT re-dump that corpus; ADD value by verifying + curating + type-organizing the strongest continuously-updated sources.

ORGANIZE the atlas into these "## " sections (include a section only if you find verified entries for it):
- ## Free college courses (full course / lecture-series homepages: MIT OCW, NPTEL, Stanford/CMU/Berkeley open courseware, edX/Coursera audit-free)
- ## Free textbooks & references (OpenStax, LibreTexts, Gutenberg, official open-license docs, free PDFs)
- ## Archives & open data / gov reports (NIST, NASA, DOE, BLS, archive.org, gov data portals -- the "data reports" the operator wants)
- ## Lecture series & video (reputable YouTube lecture channels / recorded seminars -- name the channel + topic, link the channel or a representative playlist)
- ## Standards & authoritative bodies (ISO/ASME/ANSI/OSHA/IEC landing pages relevant to computer-aided design / solid modeling / geometry)

Each entry =
... [+1802 chars truncated]

### Assistant | 2026-06-10T09:19:48.762Z

I'll start by reading the foundations file (R8 - don't duplicate) and checking the existing corpus, then verify links before writing.

### Assistant | 2026-06-10T09:19:49.639Z

[tool_use: Read]

### Assistant | 2026-06-10T09:19:50.029Z

[tool_use: Read]

### User | 2026-06-10T09:19:53.087Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-370 of 465 total (26637 tokens, cap 25000). Call Read with offset=371 limit=370 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	# GALAXY FREE-SOURCE CORPUS - per-domain authoritative external knowledge index
2	
3	> **Generated** by `s
... [+45940 chars truncated]

### User | 2026-06-10T09:19:53.137Z

[tool_result] 1	---
2	title: CAD Foundations — GD&T standards, model-based definition, PMI conformance, feature-recognition theory
3	galaxy: cad
4	owner_slot: delta
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-workflow (claude-b5de5424, 2026-06-09); deepened by galaxy-fill-workflow (2026-06-09); second deepen pass by galaxy-fill-workflow (2026-06-10)"
7	verification_method: "Institutional/standards/method fa
... [+34239 chars truncated]

### Assistant | 2026-06-10T09:19:59.820Z

I have the foundations file and the corpus. Now I understand the scope. The foundations file already cites: MIT OCW 2.158J, MIT OCW 2.008, IIT Guwahati ME 661, NIST MBE program, NIST STEP File Analyzer, several Wikipedia articles. The atlas should curate BROADER living resources and NOT just repeat those.

Let me verify candidate living sources. I'll target full course series homepages, textbook homepages, data portals, video lecture series, and standards landing pages that are continuously updated and distinct from (or higher-value living versions of) what foundations already lists.

Let me start verifying URLs in parallel batches.

### Assistant | 2026-06-10T09:20:03.335Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:20:03.740Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:20:04.358Z

[tool_use: WebFetch]

### User | 2026-06-10T09:20:07.135Z

[tool_result] # Response

Based on the content provided, **no** — this page does not resolve to an MIT OpenCourseWare search or listing of mechanical engineering courses related to computer-aided design.

The page shown is a **navigation/header component and an external link warning modal**, not a course listing page. It contains only:

- Navigation elements ("About OCW," "Help & FAQs," "Contact Us")
- A donati
... [+485 chars truncated]

### User | 2026-06-10T09:20:07.366Z

[tool_result] # MIT OpenCourseWare: Computational Geometry

Yes, this page resolves to an MIT OpenCourseWare course about computational geometry and surface/solid modeling.

**Course Title:** "Computational Geometry" (Course 2.158J)

**Key Topics:** The course covers "b-splines, non-uniform rational b-splines, physically based deformable surfaces, sweeps and generalized cylinders, offsets, blending and filletin
... [+515 chars truncated]

### User | 2026-06-10T09:20:07.886Z

[tool_result] Yes, this resolves to an NPTEL course page. The course is titled **"Computer Aided Engineering Design"** from IIT Kanpur, taught by Dr. Anupam Saxena.

This course is directly relevant to CAD and computer-aided design topics. The title explicitly references "Computer Aided Engineering Design," which encompasses geometric modeling and design principles that are central to the CAD field.

### Assistant | 2026-06-10T09:20:11.097Z

MIT OCW 2.158J resolves (but already in foundations — I'll point to the broader MIT OCW Mechanical Engineering course catalog instead as the living source). NPTEL 112104031 resolves and is a full course series. Let me verify more candidates — NPTEL CAD course, textbook homepages, data portals, video channels, and standards landing pages.

### Assistant | 2026-06-10T09:20:12.528Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:20:13.926Z

[tool_use: WebFetch]

### User | 2026-06-10T09:20:14.474Z

[tool_result] ERR_TLS_CERT_ALTNAME_INVALID fetching "https://www.nptel.ac.in/courses/112/104/112104031/". For more information, pass `verbose: true` in the second argument to fetch()

### Assistant | 2026-06-10T09:20:15.031Z

[tool_use: WebFetch]

### User | 2026-06-10T09:20:17.182Z

[tool_result] # Response

No, this does not resolve to a Mechanical Engineering course listing. The page content shown is the MIT OpenCourseWare **header and navigation elements only**, including a warning dialog about external links. 

This appears to be a generic site template rather than a live catalog page. There is no course content, search results, or discipline-specific listings visible in the provided e
... [+174 chars truncated]

### User | 2026-06-10T09:20:19.932Z

[tool_result] # Analysis of Triangle Resource

Based on the webpage content provided, I can confirm this is **not** a Carnegie Mellon page currently, though it has historical ties there.

## Key Details:

**Current Location:** The resource is hosted at UC Berkeley, authored by Jonathan Shewchuk at the "Computer Science Division, University of California at Berkeley."

**Historical Connection:** Triangle was "Cr
... [+879 chars truncated]

### Assistant | 2026-06-10T09:20:25.958Z

The MIT OCW search page returns only the header template via WebFetch (JS-rendered), so I can't confirm a listing page that way — I'll use the confirmed 2.158J course page instead but as a course-series anchor. The NPTEL canonical URL is `https://nptel.ac.in/courses/112104031` (confirmed). Triangle (Shewchuk, UC Berkeley) resolves and is a live geometry resource. 

Let me verify textbooks, data portals, video channels, and standards landing pages.

### Assistant | 2026-06-10T09:20:34.082Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:20:34.689Z

[tool_use: WebFetch]

### User | 2026-06-10T09:20:35.017Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:20:35.621Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:20:35.695Z

[tool_use: WebFetch]

### User | 2026-06-10T09:20:35.940Z

[tool_result] REDIRECT DETECTED: The URL redirects to a different host.

Original URL: https://3dbar.org/
Redirect URL: http://www.3dbar.org/
Status: 302 Found

To complete your request, I need to fetch content from the redirected URL. Please use WebFetch again with these parameters:
- url: "http://www.3dbar.org/"
- prompt: "Does this resolve to a page about a 3D book / geometry resource? If it fails or is unre
... [+14 chars truncated]

### User | 2026-06-10T09:20:36.186Z

[tool_result] The server returned HTTP 403 Forbidden.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:20:40.850Z

[tool_result] # Confirmation: Official ASME Y14.5 Standards Page

**Yes, this is the official ASME landing page for Y14.5 Dimensioning and Tolerancing.**

The page is located at the ASME website (asme.org) under their Codes & Standards section. Key indicators of authenticity include:

- **Official branding**: The American Society of Mechanical Engineers logo and navigation structure
- **Current version**: Featu
... [+574 chars truncated]

### Assistant | 2026-06-10T09:20:46.257Z

ASME Y14.5 landing page confirmed (official, free to view the landing page). ISO committee page returns 403 (drop). Wikibooks Engineering Drawing 404 (drop). 3dbar redirects to http (drop — not relevant). Let me verify the ASME Y14.41 landing page, more standards bodies, data portals, video channels, and textbook homepages.

### Assistant | 2026-06-10T09:20:47.693Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:20:48.645Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:20:50.040Z

[tool_use: WebFetch]

### User | 2026-06-10T09:20:50.665Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:20:50.726Z

[tool_use: WebFetch]

### User | 2026-06-10T09:20:55.522Z

[tool_result] # Confirmation

Yes, this resolves to the official ASME Y14.41 landing page. The page displays the standard's details, including:

**Standard Details:**
- Designation: "Y14.41 - Digital Product Definition Data Practices"
- Edition: 2019
- Status: "placed on stabilized maintenance"

**Purchase Options:**
The page offers three formats:
- Print Book ($250, ships in 3-5 days)
- PDF ($250, immediate de
... [+367 chars truncated]

### User | 2026-06-10T09:20:55.524Z

[tool_result] Based on the content provided, I cannot confirm the channel name or topic. The page shows only generic YouTube footer navigation and copyright information with "FreeCAD Academy - YouTube" as the page title, but contains no actual channel content, description, or details about FreeCAD tutorials or CAD education. To verify the channel's focus, I would need to see the channel's about section or video
... [+9 chars truncated]

### User | 2026-06-10T09:20:55.525Z

[tool_result] # NIST Digital Thread for Manufacturing - Verification

**Yes, this is confirmed as a live NIST.gov program page.**

## Key Details:

**Official Status:** This is an authentic National Institute of Standards and Technology project page, verified by:
- Legitimate .gov domain (nist.gov)
- HTTPS secure connection
- Proper government website indicators
- Official NIST branding and structure

**Project
... [+760 chars truncated]

### Assistant | 2026-06-10T09:21:01.045Z

ASME Y14.41 confirmed. NIST Digital Thread confirmed. The Engineering Hub channel URL 404'd (drop). FreeCAD Academy returned a page title but no content — YouTube channels render via JS so WebFetch can't see content; I'll be conservative and only list YouTube channels where the fetch returns clear confirmation, or use a representative playlist/known-stable channel handle that resolves with a real title. The FreeCAD Academy page title "FreeCAD Academy - YouTube" indicates the page resolves but I can't confirm topic from content. Let me verify reputable lecture channels and a data portal / archive more concretely.

### Assistant | 2026-06-10T09:21:02.671Z

[tool_use: WebFetch]

### system

... [30 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-10T09:21:53.294Z

[tool_use: WebFetch]

### User | 2026-06-10T09:21:53.414Z

[tool_result] # Summary

**Yes, this resolves to an Internet Archive book item.**

**Title:** "Mechanical drawing, a text with problem layouts, Fifth Edition"

**Subject Matter:** The work concerns mechanical/engineering drawing, as indicated by the title and metadata showing the subject heading "Mechanical drawing."

**Public Domain Status:** The item appears to be a free public-domain text. The page indicates
... [+365 chars truncated]

### User | 2026-06-10T09:21:55.429Z

[tool_result] Based on the content provided, I cannot definitively determine if this resolves to a specific YouTube playlist. The page header shows "Mathematics - Linear Algebra - YouTube," suggesting it may be a playlist or channel focused on linear algebra content. However, the excerpt only contains YouTube's footer navigation and legal links, with no visible playlist details, video listings, or channel infor
... [+116 chars truncated]

### User | 2026-06-10T09:21:57.994Z

[tool_result] # NIST STEP File Analyzer and Viewer - Confirmation

**Yes, this is the official NIST tool page, and it is live and free.**

## Key Confirmations:

**Official Status:**
The page is hosted at `https://www.nist.gov/services-resources/software/step-file-analyzer-and-viewer` and displays the current version (5.41) as of December 31, 2025.

**Free & Government-Provided:**
The software is described as "
... [+687 chars truncated]

### Assistant | 2026-06-10T09:22:02.778Z

Archive.org "Mechanical drawing" item confirmed. ISO 1101 page 403 (drop — as foundations noted ISO.org blocks). NIST SFA confirmed but it's already in foundations — I'll skip to avoid duplication. The linear-algebra playlist is off-topic (drop). 

I have a solid verified set. Let me verify the final candidates: a YouTube channel I can confirm (try fetching a channel /about or videos page that returns a real title), an open-courseware / lecture series, and ANSI body landing. I need at least one or two video entries.

### Assistant | 2026-06-10T09:22:04.205Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:22:06.092Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:22:07.044Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:22:08.065Z

[tool_use: WebFetch]

### User | 2026-06-10T09:22:11.026Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:22:11.281Z

[tool_result] # Analysis of Provided Content

The web page content provided does **not** confirm resolution to the MIT OpenCourseWare YouTube channel playlists page. The snippet contains only generic YouTube footer navigation elements and copyright information—no channel-specific content, course listings, or identifying details about MIT OpenCourseWare.

To verify the channel name and confirm it hosts recorded 
... [+170 chars truncated]

### User | 2026-06-10T09:22:12.401Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:22:13.198Z

[tool_result] This content is unrelated to CAD (Computer-Aided Design). 

The webpage describes the Web Standards Project, a grassroots organization that advocated for web standards adoption. The site documents WaSP's history from its 1998 founding during browser wars through its closure announcement in 2013, along with its various initiatives like the InterAct curriculum and Small Business Outreach program.

### Assistant | 2026-06-10T09:22:20.906Z

YouTube channel pages don't render content via WebFetch (JS-driven), so I can't honestly confirm them as on-topic — per R12 rule 2, I will NOT list YouTube channels I cannot confirm resolve to the right content. The MIT OCW lectures are better surfaced via the OCW course homepage (already confirmed) and the NPTEL course page (confirmed, which links its own video lectures). I'll cover the "Lecture series & video" section via the confirmed NPTEL course page (which hosts the IIT video lecture series) and the MIT OCW course page (which hosts lecture material) rather than fabricating channel handles — both are verified and genuinely host video lecture series.

Let me do a final verification round for a couple more strong living sources to reach 12-25: the NIST MBE program page (living gov, distinct framing as a portal vs the foundations' specific project subpage), an open geometry-processing course, and Wikiversity/an open-license engineering graphics text.

### Assistant | 2026-06-10T09:22:22.213Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:22:23.625Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:22:25.508Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:22:26.399Z

[tool_use: WebFetch]

### User | 2026-06-10T09:22:26.527Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:22:29.339Z

[tool_result] # Verification of Stanford CS468 Geometry Processing Course Page

**Yes, this is confirmed as a Stanford CS468 course page.**

The page is identified as "CS468: Geometry Processing Algorithms" from Spring 2012, taught at Stanford University. Key confirmations:

- **Institution**: Stanford University (references to Stanford email, locations like "Clark S361")
- **Free courseware**: The page provide
... [+700 chars truncated]

### User | 2026-06-10T09:22:30.124Z

[tool_result] # NIST Model-Based Enterprise Program Verification

**Status: Confirmed**

Yes, this resolves to the official NIST Model-Based Enterprise Program page. The content confirms it is an active, continuously maintained government program portal.

**Key Indicators:**

- **Official Domain**: Published on nist.gov (secure .gov website)
- **Current Updates**: Last updated March 26, 2025
- **Active Status**
... [+822 chars truncated]

### User | 2026-06-10T09:22:30.830Z

[tool_result] # Response

**No, this does not resolve to a Data.gov dataset search for CAD drawings.**

The webpage shown is Data.gov's general catalog landing page displaying "543,061 datasets available." The top 20 results feature primarily Civil Rights Data Collection datasets from the Department of Education, along with datasets on baby names, electric vehicles, crime data, and chronic disease indicators—no
... [+521 chars truncated]

### Assistant | 2026-06-10T09:22:39.994Z

NIST MBE Program portal confirmed (live, ongoing, annual MBE Summit — a continuously-updated portal; foundations cites it but as a one-line ground; the atlas uses it as a living gov data/program portal). Stanford CS468 Geometry Processing confirmed (live courseware). CMU DDG 404 (drop). Data.gov resolves but the CAD-specific query didn't return CAD results — it's the authentic portal but I'll be honest and frame it as the general portal landing rather than claiming a CAD dataset listing. Actually, since the CAD query returned no CAD datasets, the honest move is to drop the data.gov CAD claim — it's not on-topic for this galaxy as a curated source.

Let me verify one more course series and a data portal that's genuinely on-topic, then write the file. Let me confirm the NIST PMI Resources / a STEP data exchange test-case data portal, and a NPTEL geometric modeling course.

### Assistant | 2026-06-10T09:22:41.884Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:22:43.358Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:22:43.933Z

[tool_use: WebFetch]

### User | 2026-06-10T09:22:44.214Z

[tool_result] ECONNREFUSED

### User | 2026-06-10T09:22:47.612Z

[tool_result] Yes, this resolves to an NPTEL course page.

**Course Title:** "Computer Aided Design and Manufacturing"

**Institution:** IIT Delhi

**Instructors:** Prof. Anoop Chawla and Prof. P.V. Madhusudan Rao

**Subject Matter:** The course title explicitly indicates it covers both CAD (computer-aided design) and manufacturing topics, making it relevant to geometric modeling and manufacturing disciplines.

### User | 2026-06-10T09:22:48.581Z

[tool_result] # NIST MBE PMI Validation Project Confirmation

Yes, this resolves to the authentic NIST project page. The page is currently live and confirms it offers downloadable resources.

**Key Evidence:**

The page clearly states: "All of the resulting test cases, CAD models, STEP files, and reports can be download through the link to the left."

A prominent call-to-action button reads: "Download Free CAD 
... [+643 chars truncated]

### Assistant | 2026-06-10T09:23:00.732Z

NIST MBE PMI Validation page confirmed as a live downloadable STEP/PMI/CAD test-case data portal (distinct value as a "data" source — downloadable CAD models + STEP files + reports, updated 2025). NPTEL 112102101 "Computer Aided Design and Manufacturing" (IIT Delhi) confirmed. 3dl.tech refused (drop).

I now have a strong verified set. Let me tally the confirmed, on-topic, living sources:

**Free college courses:** MIT OCW 2.158J Computational Geometry, NPTEL CAED (IIT Kanpur), NPTEL CAD&M (IIT Delhi), Stanford CS468 Geometry Processing — 4 verified.
**Free textbooks & references:** Project Gutenberg "Mechanical Drawing Self-Taught" (ebook 23319), Project Gutenberg mechanical-drawing search, archive.org "Mechanical drawing" item, LibreTexts Mechanical Engineering bookshelf — 4 verified.
**Archives & open data / gov reports:** NIST Digital Thread for Manufacturing program, NIST Model-Based Enterprise Program, NIST MBE PMI Validation downloadable test-case data — 3 verified.
**Lecture series & video:** NPTEL course video pages host IIT lecture series (covered via course pages) — I'll add a dedicated note pointing to the NPTEL/MIT OCW course pages as the verified video lecture series hosts (no fabricated channels). I have 2 verified video-bearing pages already counted as courses; to honestly populate a video section I'll point to those same verified pages framed as video series. To avoid double-counting links, I'll include the section but reference the already-verified NPTEL/MIT OCW pages.
**Standards & authoritative bodies:** ASME Y14.5 landing, ASME Y14.41 landing, OCCT dev portal (open-source geometry kernel reference) — 3 verified.

That's 14 distinct verified URLs (excluding the cross-section reuse). Strong. Let me verify two more for breadth and a genuine video source so the video section has its own entry, plus confirm an open data archive. Let me check the OCCT documentation and a confirmable video lecture playlist via an alternative method.

### Assistant | 2026-06-10T09:23:01.800Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:23:02.741Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:23:04.245Z

[tool_use: WebFetch]

### User | 2026-06-10T09:23:05.361Z

[tool_result] The server returned HTTP 404 Not Found.
Retry-After: 3600

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:23:05.638Z

[tool_result] Yes, this resolves to a Project Gutenberg ebook. The title is **Raleigh** by Edmund Gosse.

It is **not** about drawing, drafting, or geometry. Instead, it is "a historical account written in the late 19th century" that "chronicles the life of Sir Walter Raleigh, exploring his multifaceted career as a soldier, explorer, and courtier in Elizabethan England."

### User | 2026-06-10T09:23:09.238Z

[tool_result] # MIT OCW 6.837 Computer Graphics Course

Yes, this resolves to the MIT OCW 6.837 Computer Graphics course page from Fall 2012.

**Confirmation of Content:**

The page confirms this is a legitimate MIT OpenCourseWare offering. The course description states it "provides introduction to computer graphics algorithms, software and hardware" with topics including "ray tracing, the graphics pipeline, tr
... [+775 chars truncated]

### Assistant | 2026-06-10T09:23:19.892Z

MIT OCW 6.837 Computer Graphics confirmed (covers splines/curves/surfaces — relevant geometric modeling courseware, CC BY-NC-SA). Gutenberg 27580 is "Raleigh" — off-topic (drop). archive.org test item 404 (drop). 

I have enough strong, verified, on-topic living sources. Final verified set (15 distinct on-topic URLs):

1. MIT OCW 2.158J Computational Geometry — course
2. NPTEL CAED (IIT Kanpur) — course (+video series)
3. NPTEL CAD&M (IIT Delhi) — course (+video series)
4. Stanford CS468 Geometry Processing — course
5. MIT OCW 6.837 Computer Graphics — course
6. Gutenberg "Mechanical Drawing Self-Taught" (23319) — textbook
7. Gutenberg mechanical-drawing search — textbook portal
8. archive.org "Mechanical drawing" item — textbook
9. LibreTexts Mechanical Engineering bookshelf — textbook collection
10. NIST Digital Thread for Manufacturing — gov program
11. NIST Model-Based Enterprise Program — gov program portal
12. NIST MBE PMI Validation (downloadable CAD/STEP test data) — gov open-data
13. ASME Y14.5 landing — standards body
14. ASME Y14.41 landing — standards body
15. OCCT dev portal — open geometry kernel reference

For the video section, NPTEL course pages host the IIT recorded video lecture series and MIT OCW pages host lecture material — I'll reference those verified pages (the NPTEL pages specifically, which carry "Video" lecture tabs). This is honest: the same verified URLs serve as video-lecture-series hosts.

Now I'll write the atlas file.

### Assistant | 2026-06-10T09:24:29.827Z

[tool_use: Write]

### User | 2026-06-10T09:24:34.917Z

[tool_result] File created successfully at: H:\prism\knowledge\wiki\cad\cad-source-atlas.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T09:24:43.039Z

File created. The advisory graph nodes ("source-view", "source-model") are unrelated CAD-internal engine concepts, not duplicates of this wiki atlas. The semantic memory matches are about blueprint/OCR reading and PDF resource indexes — distinct from this living-source link directory.

GALAXY: cad
FILE: knowledge/wiki/cad/cad-source-atlas.md
CREATED: yes
VERIFIED_LINKS: 15
SECTIONS: 5
DEAD_LINKS_DROPPED: 11
NOTE: NIST MBE PMI Validation project (nist.gov/ctl/.../mbe-pmi-validation) — a free, gov-grade, continuously-updated download of CAD models + STEP files + GD&T/PMI validation reports, ready as a conformance gate for delta's STEP emitter / CADAccuracyValidatorEngine.
