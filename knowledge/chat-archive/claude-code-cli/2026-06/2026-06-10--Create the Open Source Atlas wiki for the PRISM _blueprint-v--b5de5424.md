---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "Create the Open Source Atlas wiki for the PRISM \"blueprint-vision\" galaxy (owner"
date: "2026-06-10"
first_ts: "2026-06-10T09:19:45.614Z"
last_ts: "2026-06-10T09:23:12.053Z"
cwd: "H:\\prism"
messages: 82
user_msgs: 36
assistant_msgs: 46
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_40e23c66-b21/agent-a007a60e950582b3a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Create the Open Source Atlas wiki for the PRISM "blueprint-vision" galaxy (owner

> **claude-code-cli** | 2026-06-10 | 82 msgs (36 user / 46 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_40e23c66-b21/agent-a007a60e950582b3a.jsonl`

## Transcript

### User | 2026-06-10T09:19:45.614Z

Create the Open Source Atlas wiki for the PRISM "blueprint-vision" galaxy (owner: xray, domain: engineering drawings / GD&T / machine vision / metrology): knowledge/wiki/blueprint-vision/blueprint-vision-source-atlas.md.

PURPOSE: a curated, VERIFIED directory of the best FREE + LEGAL LIVING resources for engineering drawings / GD&T / machine vision / metrology -- so the galaxy has a non-stagnant "keep-learning" curriculum that stays current because it points to continuously-updated sources. This is DISTINCT from knowledge/wiki/blueprint-vision/blueprint-vision-foundations.md (read it first -- the atlas must NOT just repeat the foundations' Sources list; the atlas curates BROADER living resources: full course series, textbook homepages, data portals, lecture-video series, standards landing pages).

CONTEXT (R8 -- do not duplicate existing work): a bulk free-source corpus already exists at state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md (flat pointers, NOT auto-invoked). This atlas is the CURATED + VERIFIED + auto-invokable per-galaxy form -- pick the best ~15-25 LIVING sources, verify each resolves, organize by type. Do NOT re-dump that corpus; ADD value by verifying + curating + type-organizing the strongest continuously-updated sources.

ORGANIZE the atlas into these "## " sections (include a section only if you find verified entries for it):
- ## Free college courses (full course / lecture-series homepages: MIT OCW, NPTEL, Stanford/CMU/Berkeley open courseware, edX/Coursera audit-free)
- ## Free textbooks & references (OpenStax, LibreTexts, Gutenberg, official open-license docs, free PDFs)
- ## Archives & open data / gov reports (NIST, NASA, DOE, BLS, archive.org, gov data portals -- the "data reports" the operator wants)
- ## Lecture series & video (reputable YouTube lecture channels / recorded seminars -- name the channel + topic, link the channel or a representative playlist)
- ## Standards & authoritative bodies (ISO/ASME/ANSI/OSHA/IEC landing page
... [+1945 chars truncated]

### Assistant | 2026-06-10T09:19:48.860Z

I'll start by reading the foundations file (R8 - don't duplicate) and checking the existing corpus for context, then verify candidate links before writing.

### Assistant | 2026-06-10T09:19:49.784Z

[tool_use: Read]

### Assistant | 2026-06-10T09:19:50.360Z

[tool_use: Read]

### User | 2026-06-10T09:19:51.774Z

[tool_result] read-once-guard: 'H:\prism\knowledge\wiki\blueprint-vision\blueprint-vision-foundations.md' was already read 29m ago in this session and is unchanged (mtime 1781077686349). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable
... [+21 chars truncated]

### User | 2026-06-10T09:19:53.084Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-370 of 465 total (26637 tokens, cap 25000). Call Read with offset=371 limit=370 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	# GALAXY FREE-SOURCE CORPUS - per-domain authoritative external knowledge index
2	
3	> **Generated** by `s
... [+45940 chars truncated]

### Assistant | 2026-06-10T09:19:57.797Z

I have the foundations file in context (read earlier) and the corpus. The corpus already has 19 blueprint-vision sources (mostly TIER-3 article-aggregators + a few ISO/NIST). My atlas must curate BROADER LIVING resources distinct from both: full course series, textbook homepages, data portals, lecture video channels, standards landing pages. Let me verify candidate links across the section types.

I'll batch WebFetch verifications. Starting with college courses and textbooks/references.

### Assistant | 2026-06-10T09:19:59.684Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:20:01.097Z

[tool_use: WebFetch]

### User | 2026-06-10T09:20:01.976Z

[tool_result] The server returned HTTP 404 Not Found.
Retry-After: 0

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:20:02.501Z

[tool_use: WebFetch]

### User | 2026-06-10T09:20:03.083Z

[tool_result] ECONNREFUSED

### Assistant | 2026-06-10T09:20:03.593Z

[tool_use: WebFetch]

### User | 2026-06-10T09:20:03.624Z

[tool_result] # MIT OpenCourseWare Course Confirmation

Yes, this page resolves to an MIT OpenCourseWare course on design and manufacturing.

**Course Title:** "Design and Manufacturing I" (Course 2.007)

**Free Open Courseware Status:** Confirmed. The page is hosted on MIT OpenCourseWare and includes a Creative Commons License (CC BY-NC-SA 4.0), with the footer stating "© 2001–2026 Massachusetts Institute of T
... [+537 chars truncated]

### User | 2026-06-10T09:20:08.223Z

[tool_result] # Assessment

No, this page does not host the textbook as a free download. While it provides access to an electronic version, users must complete a registration process first.

The site states: "To download an electronic version of the book, please fill in your information on this page." This indicates the PDF requires registration, not that it's freely available without conditions.

Additionally,
... [+363 chars truncated]

### Assistant | 2026-06-10T09:20:11.912Z

2.007 confirmed. 2.008 is a 404, dropped. The CV site is dead. Szeliski's book homepage resolves and the PDF is free (registration-gated personal use but it's a legitimate free download homepage — I'll include the homepage since the book is freely downloadable). Let me verify more, including the correct Szeliski URL and other strong living sources.

### Assistant | 2026-06-10T09:20:16.583Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:20:16.796Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:20:16.855Z

[tool_use: WebFetch]

### User | 2026-06-10T09:20:17.774Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:20:17.959Z

[tool_use: WebFetch]

### User | 2026-06-10T09:20:20.272Z

[tool_result] # NPTEL Course Analysis

**Yes, this resolves to an NPTEL course.**

**Course Title:** "Engineering Drawing, IIT Guwahati"

**Instructor:** Prof. P.S. Robi

**Free Status:** NPTEL courses are freely accessible online, and nothing in the content suggests this course requires payment.

**Subject Matter:** The course is directly related to engineering drawing. The title explicitly states "Engineering
... [+343 chars truncated]

### User | 2026-06-10T09:20:21.805Z

[tool_result] # Verification: NIST Digital Thread for Manufacturing Page

**Status: ✓ Confirmed Live & On-Topic**

This is indeed an active NIST program page focused on model-based definition and digital product definition. The page confirms the program's relevance through its stated purpose:

> "deliver methods, protocols, and tools for developing, conformance testing, increasing user-awareness, and industrial
... [+790 chars truncated]

### User | 2026-06-10T09:20:24.348Z

[tool_result] # GD&T Basics Website Confirmation

Yes, this resolves to the **GD&T Basics website**, operated by Engineer Essentials LLC, a legitimate training resource for Geometric Dimensioning and Tolerancing.

## Live Reference Site Status

✓ **Confirmed as a live reference site** offering:

- **Free learning resources** including GD&T symbols chart, quizzes, calculators, and blog content
- **Paid training 
... [+581 chars truncated]

### Assistant | 2026-06-10T09:20:29.501Z

NPTEL Engineering Drawing confirmed. NIST Digital Thread confirmed (but already in foundations corpus — I'll note it's a course/program homepage so it's an archive entry; foundations corpus listed it too. To add value I'll prefer other NIST entries). The dimensional metrology NIST URL is 404, dropped. GD&T Basics homepage confirmed. Note GD&T Basics individual pages are in foundations — but the homepage as a continuously-updated reference site is a different, broader "living" entry, acceptable.

Let me verify more: lecture video channels, data portals, LibreTexts/OpenStax, standards landing pages, archive.org.

### Assistant | 2026-06-10T09:20:30.911Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:20:32.358Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:20:33.753Z

[tool_use: WebFetch]

### User | 2026-06-10T09:20:33.889Z

[tool_result] Based on the provided content, I cannot confirm this resolves to a YouTube channel about GD&T. The page only shows a generic YouTube footer with the title "GD&T Basics - Engineer Essentials - YouTube," but no actual channel information, description, or content details are present. The extracted text contains only navigation links and legal information, not channel verification data.

### Assistant | 2026-06-10T09:20:34.782Z

[tool_use: WebFetch]

### User | 2026-06-10T09:20:35.336Z

[tool_result] The server returned HTTP 403 Forbidden.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:20:36.967Z

[tool_result] The server returned HTTP 404 Not Found.
Retry-After: 3600

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:20:38.147Z

[tool_result] # LibreTexts Engineering - Mechanical Engineering Bookshelf

Yes, this resolves to the live LibreTexts Engineering Mechanical Engineering bookshelf with free open textbooks.

**Confirmation of Free Access:**
The page explicitly states: "Mechanical engineering combines engineering physics and mathematics principles with materials science to design, analyze, manufacture, and maintain mechanical syst
... [+916 chars truncated]

### Assistant | 2026-06-10T09:20:42.548Z

LibreTexts confirmed. The YouTube channel fetch returned only a generic footer (didn't confirm channel identity strongly) — I'll be cautious and verify YouTube channels via a more reliable handle URL. archive.org item 404 (it was a guess), dropped. ISO committee page 403 (blocked, can't confirm), dropped — I'll use the ISO standard browsing platform pages instead which the foundations already cover, so I need a DIFFERENT ISO living landing page. Let me verify standards landing pages and better YouTube/video sources.

### Assistant | 2026-06-10T09:20:44.438Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:20:45.842Z

[tool_use: WebFetch]

### User | 2026-06-10T09:20:46.868Z

[tool_result] Based on the content provided, I cannot confirm this resolves to a GD&T Basics channel or verify the existence of @GDandTBasics. The page content shown only displays generic YouTube footer links and copyright information—no channel-specific videos, handles, or GD&T engineering content are visible in the excerpt provided.

### Assistant | 2026-06-10T09:20:47.273Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:20:48.385Z

[tool_use: WebFetch]

### User | 2026-06-10T09:20:49.081Z

[tool_result] The server returned HTTP 403 Forbidden.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### system

... [2 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-10T09:21:01.114Z

NIST Dimensional Metrology Group page confirmed (great living source). ASME Y14.5 landing page confirmed. ISO standard 66777 is now 403 (intermittent — it was confirmed live in foundations corpus, but I can't re-confirm now so I'll be conservative and not rely on it; I'll use the ISO OBP free-read or skip). YouTube channel fetches keep returning only generic footers — WebFetch can't reliably render YouTube SPA content, so per R12 I will NOT list YouTube channels I cannot positively confirm. Let me instead verify reputable recorded-lecture sources that render as static pages (university video archives, MIT OCW video, NPTEL video which are hostable). Let me also verify a few more course/textbook/data sources to hit the target count.

### Assistant | 2026-06-10T09:21:02.949Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:21:03.890Z

[tool_use: WebFetch]

### User | 2026-06-10T09:21:03.955Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:21:05.349Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:21:06.245Z

[tool_use: WebFetch]

### User | 2026-06-10T09:21:07.098Z

[tool_result] # OpenStax Verification

Based on the provided content, I cannot confirm what this resolves to. The page shows only "OpenStax" as a heading with no additional details, links, or content describing subjects or textbooks.

To verify whether this is the OpenStax subjects page with free open textbooks, I would need:
- The actual URL
- Page content showing available subjects
- Confirmation of free/open
... [+103 chars truncated]

### User | 2026-06-10T09:21:10.206Z

[tool_result] Yes, this resolves to a Bureau of Labor Statistics data portal. Specifically, it's the **Employment and Wages Data Viewer**, part of the Quarterly Census of Employment and Wages (QCEW) program.

The page provides access to employment and wage data through various table formats, including geographic cross-sections, industry breakdowns by NAICS classification, establishment size classes, and multi-y
... [+245 chars truncated]

### User | 2026-06-10T09:21:11.192Z

[tool_result] # OSHA Machine Guarding Page Verification

**Yes, this resolves to an official OSHA machine guarding resource.**

## Confirmation Details

**Government Authority:** This is an authentic page from the U.S. Department of Labor's Occupational Safety and Health Administration (OSHA), confirmed by:
- Official .gov domain (osha.gov)
- Proper government branding and seals
- OSHA contact information (1-80
... [+700 chars truncated]

### Assistant | 2026-06-10T09:21:18.630Z

NPTEL archive URL 404 (dropped — the main course page works though). OpenStax /subjects returned a thin render — can't confirm, will verify the canonical homepage instead. BLS QCEW data portal confirmed. OSHA machine guarding confirmed. Note: machine guarding is somewhat tangential to the galaxy's core (engineering drawings/GD&T/machine vision/metrology); I'll include OSHA but pick a more on-topic OSHA/standards entry if available. Let me verify a few more to round out: a metrology data/standards source, a machine-vision course/textbook, OpenStax homepage, and a NIST e-handbook.

### Assistant | 2026-06-10T09:21:19.592Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:21:21.009Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:21:22.416Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:21:23.693Z

[tool_use: WebFetch]

### User | 2026-06-10T09:21:24.917Z

[tool_result] I cannot confirm the details you're asking about based solely on the content provided. The page content only shows "OpenStax" as a heading with no additional information about homepage status, textbook offerings, peer review processes, licensing terms, or live/free availability.

To verify whether this resolves to OpenStax's homepage and confirm the service details you mentioned, I would need to s
... [+91 chars truncated]

### User | 2026-06-10T09:21:26.609Z

[tool_result] Based on the HTML content provided, I can confirm:

**Yes, this resolves to the NIST/SEMATECH e-Handbook of Statistical Methods.** The page title explicitly states: `<TITLE>NIST/SEMATECH e-Handbook of Statistical Methods</TITLE>`

However, I cannot verify from this HTML fragment alone whether the site is currently live or confirm its specific content coverage regarding measurement, process, and me
... [+403 chars truncated]

### User | 2026-06-10T09:21:27.542Z

[tool_result] # OpenCV Official Documentation Confirmation

Yes, this is the **OpenCV 4.13.0 official tutorials documentation root**. The page is live and represents the free, open-source computer vision library.

**Evidence:**
- The header displays "OpenCV 4.13.0 Open Source Computer Vision"
- The page presents a comprehensive tutorial index covering core modules (core, imgproc, calib3d, dnn, etc.)
- It includ
... [+286 chars truncated]

### User | 2026-06-10T09:21:29.167Z

[tool_result] # PyImageSearch Start Here Verification

Yes, this is the live PyImageSearch "Start Here" page offering comprehensive free computer vision learning content.

## Confirmation of Live Status & Free Content

The page is currently accessible and provides extensive free tutorials across multiple domains:

**Computer Vision Fundamentals:**
"Install OpenCV + Python on Your System (Beginner)" through adva
... [+1078 chars truncated]

### Assistant | 2026-06-10T09:21:33.900Z

NIST e-Handbook confirmed (title resolves). PyImageSearch confirmed (free CV/OCR tutorials — directly relevant to machine vision). OpenCV docs confirmed (machine vision library). OpenStax keeps rendering thin — I'll verify via a specific OpenStax book page that renders fully instead. Let me verify a couple more strong entries: an OpenStax specific book, an MIT OCW computer vision course, ASME Y14.41 landing, and a Gutenberg/archive mechanical-drawing public-domain book.

### Assistant | 2026-06-10T09:21:35.312Z

[tool_use: WebFetch]

### User | 2026-06-10T09:21:36.121Z

[tool_result] The server returned HTTP 404 Not Found.
Retry-After: 0

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:21:36.727Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:21:38.152Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:21:39.109Z

[tool_use: WebFetch]

### User | 2026-06-10T09:21:40.284Z

[tool_result] Yes, this resolves to the ASME Y14.41 standard landing page.

**Standard Title Confirmed:** "Y14.41 - Digital Product Definition Data Practices"

The page explicitly displays this title and provides product details including the 2019 edition, multiple format options (Print Book at $250, and PDF versions), and a description stating: "This Standard establishes requirements and reference documents ap
... [+77 chars truncated]

### User | 2026-06-10T09:21:40.569Z

[tool_result] The server returned HTTP 403 Forbidden.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:21:41.151Z

[tool_result] # Analysis

**Does it resolve to a Project Gutenberg public-domain ebook?**
Yes. The page confirms this is a Project Gutenberg offering, stating "Public domain in the USA" with a release date of November 4, 2007.

**What is the title?**
"Mechanical Drawing Self-Taught" by Joshua Rose.

**Is it related to mechanical drawing or drafting?**
Absolutely. The work is explicitly focused on this subject, 
... [+216 chars truncated]

### Assistant | 2026-06-10T09:21:45.265Z

MIT 6.869 is 404 (dropped). ASME Y14.41 confirmed. Gutenberg "Mechanical Drawing Self-Taught" confirmed (excellent public-domain entry). ISO GPS overview 403 (ISO blocks bots intermittently — dropped to be honest). 

I have strong verified entries. Let me do a final batch to confirm a working MIT OCW computer vision course (different number), an OpenStax homepage alternative, and a data/archive source, plus a NASA technical reports entry.

### Assistant | 2026-06-10T09:21:46.735Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:21:48.100Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:21:49.512Z

[tool_use: WebFetch]

### User | 2026-06-10T09:21:50.630Z

[tool_result] # MIT OpenCourseWare Machine Vision Course

**Yes, this resolves to an MIT OpenCourseWare Machine Vision course.**

**Course Title:** "Machine Vision" (Course 6.801, Fall 2020)

**Free Open Courseware Status:** Confirmed. The page indicates this is MIT OpenCourseWare content, which operates under a Creative Commons License (CC BY-NC-SA 4.0) as stated in the footer. The course materials including l
... [+343 chars truncated]

### Assistant | 2026-06-10T09:21:51.036Z

[tool_use: WebFetch]

### User | 2026-06-10T09:21:52.609Z

[tool_result] I cannot confirm whether this resolves to an OpenStax free textbook details page based on the provided content. The webpage only shows "OpenStax" as a heading with no additional information about a specific book title, licensing details, or textbook content.

To verify OpenStax as a live free textbook provider, I would need a page that displays:
- A specific book title
- Licensing information (suc
... [+140 chars truncated]

### User | 2026-06-10T09:21:54.487Z

[tool_result] The server returned HTTP 404 Not Found.
Retry-After: 3600

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:21:56.103Z

[tool_result] # NASA Technical Reports Server (NTRS) Confirmation

**Yes, this resolves to the official NTRS search interface.** The page header clearly identifies itself as "NTRS - NASA Technical Reports Server" and functions as a searchable archive.

## Key Characteristics:

**Live & Free:** The interface displays an active search platform with filtering options, result sorting, and export capabilities—all st
... [+818 chars truncated]

### Assistant | 2026-06-10T09:22:12.915Z

MIT 6.801 Machine Vision confirmed (perfect for the machine-vision domain). NASA NTRS confirmed (live free report archive). OpenStax keeps returning a JS-only shell — WebFetch cannot render its SPA, so per R12 I will NOT list OpenStax (cannot positively confirm). archive.org item 404 (guessed ID, dropped) — but Gutenberg already covers the public-domain mechanical drawing book, so that's covered.

I now have a solid set of VERIFIED living sources. Let me tally what positively confirmed:

**Confirmed live + on-topic:**
1. MIT OCW 2.007 Design and Manufacturing I — course
2. NPTEL Engineering Drawing (IIT Guwahati) — course
3. MIT OCW 6.801 Machine Vision — course
4. Szeliski "Computer Vision: Algorithms and Applications" homepage — textbook (free download homepage)
5. LibreTexts Mechanical Engineering bookshelf — textbooks
6. Project Gutenberg "Mechanical Drawing Self-Taught" — public-domain textbook
7. OpenCV official tutorials docs — reference
8. NIST Digital Thread for Manufacturing — archive/program
9. NIST Dimensional Metrology Group (PML) — archive/metrology
10. NIST/SEMATECH e-Handbook of Statistical Methods — archive/reference (metrology stats)
11. NASA NTRS — archive/data
12. BLS QCEW data viewer — open data portal
13. ASME Y14.5 landing — standard
14. ASME Y14.41 landing — standard
15. OSHA machine guarding — authoritative body
16. GD&T Basics site — reference (free learning hub)
17. PyImageSearch start-here — reference/tutorials (machine vision/OCR)

17 verified. I dropped several (2.008 404, CV reading site dead, dimensional-metrology EL 404, archive.org items 404, ISO 403s, MIT 6.869 404, YouTube channels unconfirmable, OpenStax SPA unconfirmable).

For the "Lecture series & video" section — I couldn't positively confirm any YouTube channel (WebFetch can't render them), so per R12 I'll handle video via MIT OCW / NPTEL which DO host lecture video. MIT 6.801 and NPTEL Engineering Drawing both have video lectures and are already verified. I'll cite NPTEL's 
... [+834 chars truncated]

### Assistant | 2026-06-10T09:22:54.805Z

[tool_use: Write]

### User | 2026-06-10T09:23:01.170Z

[tool_result] File created successfully at: H:\prism\knowledge\wiki\blueprint-vision\blueprint-vision-source-atlas.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T09:23:12.053Z

The file was created. The graph advisory shows related nodes but none is a "source atlas" — `blueprint-vision-foundations` (the primer I deduped against) and extraction-coverage nodes are distinct assets, so no duplication concern.

The write succeeded with no file-claim block. Final tally:
- 17 verified live links across 4 populated sections (Free college courses: 3, Free textbooks & references: 8, Archives & open data: 4, Standards & authoritative bodies: 3).
- The "Lecture series & video" section was omitted: I could not positively confirm any YouTube channel (WebFetch returns only generic YouTube shells, so per R12 I refused to fabricate channel names); the verified MIT/NPTEL courses that DO carry lecture video stayed under "Free college courses" rather than being double-listed.
- Dead/unconfirmable URLs dropped: MIT 2.008 (404), CV reading site (ECONNREFUSED), NIST EL dimensional-metrology (404), NPTEL archive page (404), MIT 6.869 (404), two archive.org item guesses (404), ISO 1101 + ISO GPS + ISO/TC 213 (403), 2x YouTube channel (unconfirmable), 2x OpenStax (JS shell unconfirmable) = 12 dropped.

GALAXY: blueprint-vision
FILE: knowledge/wiki/blueprint-vision/blueprint-vision-source-atlas.md
CREATED: yes
VERIFIED_LINKS: 17
SECTIONS: 4
DEAD_LINKS_DROPPED: 12
NOTE: MIT OpenCourseWare 6.801 Machine Vision (Berthold Horn) is the single best living source surfaced -- a free, full machine-vision course directly on the galaxy's core machine-vision/OCR leg.
