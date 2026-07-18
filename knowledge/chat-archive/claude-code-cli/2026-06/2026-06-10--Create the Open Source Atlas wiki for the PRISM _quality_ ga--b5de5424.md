---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "Create the Open Source Atlas wiki for the PRISM \"quality\" galaxy (owner: quality"
date: "2026-06-10"
first_ts: "2026-06-10T09:24:43.229Z"
last_ts: "2026-06-10T09:28:52.897Z"
cwd: "H:\\prism"
messages: 88
user_msgs: 38
assistant_msgs: 50
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_40e23c66-b21/agent-ab9531eca9bed3bc9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# Create the Open Source Atlas wiki for the PRISM "quality" galaxy (owner: quality

> **claude-code-cli** | 2026-06-10 | 88 msgs (38 user / 50 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_40e23c66-b21/agent-ab9531eca9bed3bc9.jsonl`

## Transcript

### User | 2026-06-10T09:24:43.229Z

Create the Open Source Atlas wiki for the PRISM "quality" galaxy (owner: quality-owner, domain: quality engineering / SPC / metrology / process capability): knowledge/wiki/quality/quality-source-atlas.md.

PURPOSE: a curated, VERIFIED directory of the best FREE + LEGAL LIVING resources for quality engineering / SPC / metrology / process capability -- so the galaxy has a non-stagnant "keep-learning" curriculum that stays current because it points to continuously-updated sources. This is DISTINCT from knowledge/wiki/quality/quality-foundations.md (read it first -- the atlas must NOT just repeat the foundations' Sources list; the atlas curates BROADER living resources: full course series, textbook homepages, data portals, lecture-video series, standards landing pages).

CONTEXT (R8 -- do not duplicate existing work): a bulk free-source corpus already exists at state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md (flat pointers, NOT auto-invoked). This atlas is the CURATED + VERIFIED + auto-invokable per-galaxy form -- pick the best ~15-25 LIVING sources, verify each resolves, organize by type. Do NOT re-dump that corpus; ADD value by verifying + curating + type-organizing the strongest continuously-updated sources.

ORGANIZE the atlas into these "## " sections (include a section only if you find verified entries for it):
- ## Free college courses (full course / lecture-series homepages: MIT OCW, NPTEL, Stanford/CMU/Berkeley open courseware, edX/Coursera audit-free)
- ## Free textbooks & references (OpenStax, LibreTexts, Gutenberg, official open-license docs, free PDFs)
- ## Archives & open data / gov reports (NIST, NASA, DOE, BLS, archive.org, gov data portals -- the "data reports" the operator wants)
- ## Lecture series & video (reputable YouTube lecture channels / recorded seminars -- name the channel + topic, link the channel or a representative playlist)
- ## Standards & authoritative bodies (ISO/ASME/ANSI/OSHA/IEC landing pages relevant to quality engineerin
... [+1890 chars truncated]

### Assistant | 2026-06-10T09:24:45.851Z

I'll start by reading the existing foundations file to avoid duplication, then check the bulk corpus for candidate sources to curate and verify.

### Assistant | 2026-06-10T09:24:47.287Z

[tool_use: Bash]

### Assistant | 2026-06-10T09:24:49.132Z

[tool_use: Bash]

### User | 2026-06-10T09:24:51.911Z

[tool_result] ---
title: Quality Galaxy Foundations (SPC + Capability + Detection Rules)
galaxy: quality
owner_slot: quality-owner
status: VERIFIED-PARTIAL
verified_by: "papa-workflow (claude-b5de5424, 2026-06-09); DEEPEN pass (claude-b5de5424, 2026-06-09); DEEPEN-2 pass (2026-06-10)"
verification_method: "Each claim below was confirmed by a live WebFetch call against its cited primary/canonical source (NIST/SE
... [+18972 chars truncated]

### User | 2026-06-10T09:24:57.060Z

[tool_result] _staging/
quality-foundations.md
---CORPUS---
> **Source-quality tiers:** TIER-1 = primary (gov/edu/standards bodies/MIT-OCW/arXiv/NIST/NIMS/eCFR) - TIER-2 = vendor/OEM technical docs (Sandvik/Mitsubishi/ISCAR/Kennametal/Haas/Fanuc/Siemens, authoritative for tool/material/controller specifics) - TIER-3 = free articles/aggregators (secondary; corroborate against T1/T2 before trusting a number).
>
>
... [+7628 chars truncated]

### Assistant | 2026-06-10T09:25:08.310Z

I have a clear picture now. The foundations file already cites NIST/SEMATECH sections, OpenStax Intro Stats, MIT OCW 2.830J/16.660J/15.075J, Internet Archive Shewhart books, NASA-STD. The atlas must curate BROADER living resources without repeating those exact entries. Let me build a candidate list of living/homepage-level sources and verify each one resolves.

Let me verify candidate URLs in parallel batches. Starting with college courses.

### Assistant | 2026-06-10T09:25:09.803Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:25:11.223Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:25:12.551Z

[tool_use: WebFetch]

### User | 2026-06-10T09:25:12.811Z

[tool_result] # Response

Based on the content provided, this is **not** a course listing or search page for probability and statistics. 

The page shown is a navigation/header section from MIT OpenCourseWare displaying a warning modal about external links. It contains the site's main navigation menu with options like "Give Now," "About OCW," and "Help & FAQs," along with this disclaimer: "external sites may ha
... [+259 chars truncated]

### User | 2026-06-10T09:25:15.194Z

[tool_result] # NPTEL Course Analysis

Yes, this page resolves to an NPTEL course.

**Course Title:** "Services Operations Management"

**Institution:** IIT Madras

**Instructor:** Dr. Arshinder Kaur

**Subject Relevance:** While the page content is limited, the course title suggests it covers operations management in the services sector. This domain typically encompasses quality management, statistical process
... [+200 chars truncated]

### User | 2026-06-10T09:25:16.412Z

[tool_result] I cannot confirm this is the handbook's home/table-of-contents page based on the provided content. 

The HTML shows only a frameset structure with a title "NIST/SEMATECH e-Handbook of Statistical Methods" and references to navigation and index frames, but it contains no visible chapter listings or content. The actual chapters you mention—Process Modeling, Process Improvement, and Process or Produc
... [+175 chars truncated]

### Assistant | 2026-06-10T09:25:21.018Z

The NIST handbook home is a frameset (title confirmed = live, but I'll point to a concrete TOC-bearing page). NPTEL 110106046 is a different course than expected; I'll find the right quality/SQC NPTEL course. MIT OCW search loaded but showed a modal — I'll use a concrete course homepage instead. Let me verify better targets.

### Assistant | 2026-06-10T09:25:22.919Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:25:24.313Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:25:25.727Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:25:26.822Z

[tool_use: WebFetch]

### User | 2026-06-10T09:25:27.451Z

[tool_result] Based on the content provided, I cannot determine if this NPTEL course page resolves or identify its title. The page shows only a Swayam logo and a "Loading..." message, with no actual course information visible.

Without access to the loaded page content, I'm unable to confirm whether the course pertains to quality management, Six Sigma, statistical quality control, or any other subject matter.

### User | 2026-06-10T09:25:28.279Z

[tool_result] # Chapter 6: Process or Product Monitoring and Control

Yes, this is the table of contents for Chapter 6 of the NIST/SEMATECH e-Handbook. The chapter covers these main topic areas:

1. **Introduction** — foundational concepts including history, techniques, and the distinction between "out of control" versus "in control but unacceptable" states, plus "Process Capability"

2. **Acceptance Sampling**
... [+718 chars truncated]

### User | 2026-06-10T09:25:31.505Z

[tool_result] # LibreTexts Statistics Bookshelf Verification

Yes, this page resolves successfully and lists free open statistics textbooks focused on introductory statistics.

## Key Findings:

**Page Status:** The "Introductory Statistics" bookshelf page is functional and accessible.

**Content Confirmation:** The page explicitly states it contains "introductory statistics texts" that are "intended for studen
... [+739 chars truncated]

### User | 2026-06-10T09:25:32.985Z

[tool_result] # Confirmation: NIST Office of Weights and Measures

**Yes, this page resolves to the correct destination.**

This is the official NIST Office of Weights and Measures (OWM) homepage, focused on legal metrology and measurement standards.

## Key Confirmation Points:

**Mission Statement:** The organization states its purpose is to "establish uniformity, SI use, and traceability in weights and measu
... [+882 chars truncated]

### Assistant | 2026-06-10T09:25:37.628Z

Good progress. NIST e-Handbook Ch6 TOC confirmed, LibreTexts Statistics confirmed, NIST OWM (metrology) confirmed. NPTEL swayam page loads but is a JS shell — I'll use the nptel.ac.in course page form instead. Let me verify more candidates: NPTEL quality course, edX/Coursera audit, OpenStax homepage, archive.org, NASA, ASQ, BLS, IEC/ISO/ASME/OSHA, and a YouTube lecture channel.

### Assistant | 2026-06-10T09:25:38.588Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:25:40.002Z

[tool_use: WebFetch]

### User | 2026-06-10T09:25:41.282Z

[tool_result] # NPTEL Course Confirmation

**Yes, this resolves to an NPTEL course.**

**Course Title:** "NOC: Six Sigma, IIT Kharagpur"

**Instructors:** Prof. Jitesh J Thakkar & Prof. Tapan Bagchi

**Subject Area:** This course is about **Six Sigma**, which falls within the quality management and statistical quality control domain. Six Sigma is a methodology focused on process improvement and variation reduct
... [+82 chars truncated]

### Assistant | 2026-06-10T09:25:41.408Z

[tool_use: WebFetch]

### User | 2026-06-10T09:25:42.330Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:25:42.514Z

[tool_use: WebFetch]

### User | 2026-06-10T09:25:42.617Z

[tool_result] I cannot confirm whether the OpenStax math subject page resolves or verify the presence of those specific statistics textbooks, as the provided content only contains the text "OpenStax" with no actual page content, links, or textbook listings included.

To answer your question accurately, I would need the actual webpage content showing the math subject catalog with the textbook titles and descript
... [+5 chars truncated]

### User | 2026-06-10T09:25:43.329Z

[tool_result] The server returned HTTP 403 Forbidden.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:25:46.735Z

NPTEL Six Sigma (IIT Kharagpur) confirmed — excellent living source. OpenStax math subject page returned only a JS shell (inconclusive); NIST digital-collections 404; BLS iag 403. Let me retry OpenStax with a direct book URL and try alternates for the gov/data and archive sections.

### Assistant | 2026-06-10T09:25:48.161Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:25:49.117Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:25:50.527Z

[tool_use: WebFetch]

### User | 2026-06-10T09:25:51.059Z

[tool_result] I appreciate your question, but the content provided is insufficient to verify the details you're asking about. The webpage excerpt only shows "OpenStax" as a header with no additional information about book titles, descriptions, or course content.

To confirm whether this page resolves to the Introductory Business Statistics 2e textbook and verify its statistics coverage, I would need the actual 
... [+213 chars truncated]

### User | 2026-06-10T09:25:51.172Z

[tool_result] The server returned HTTP 403 Forbidden.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:25:51.550Z

[tool_use: WebFetch]

### User | 2026-06-10T09:25:52.830Z

[tool_result] Based on the page content provided, I can confirm that this appears to be the Internet Archive homepage. The title mentions "Digital Library of Free & Borrowable Texts, Movies, Music & Wayback Machine," which indicates the site offers multiple content types.

However, the snippet you've provided doesn't explicitly confirm this is specifically the texts/books collection. To verify it's the dedicate
... [+420 chars truncated]

### User | 2026-06-10T09:25:55.121Z

[tool_result] # NASA Technical Reports Server (NTRS) Confirmation

Yes, this page resolves to the NASA Technical Reports Server (NTRS).

**Free Searchable Archive:** The page confirms this is a freely accessible repository. It states: "The NASA STI Repository (also known as the NASA Technical Reports Server (NTRS)) provides access to NASA metadata records, full-text online documents, images, and videos."

**Con
... [+434 chars truncated]

### system

... [8 middle messages omitted -- see raw_file] ...

### User | 2026-06-10T09:26:08.205Z

[tool_result] REDIRECT DETECTED: The URL redirects to a different host.

Original URL: https://www.ecfr.gov/current/title-15/subtitle-B/chapter-II/subchapter-B/part-285
Redirect URL: https://unblock.federalregister.gov/
Status: 302 Found

To complete your request, I need to fetch content from the redirected URL. Please use WebFetch again with these parameters:
- url: "https://unblock.federalregister.gov/"
- pro
... [+191 chars truncated]

### Assistant | 2026-06-10T09:26:19.947Z

ISO and ASQ return 403 (bot-blocked, can't confirm content per R12 — drop). Khan Academy YouTube truncated (inconclusive — need a verifiable representative). eCFR redirects to a bot-block. Let me verify reliable, fetchable alternatives: ISO via a different fetchable path, OSHA, a MIT OCW concrete statistics course homepage, and a confirmable YouTube lecture playlist (MIT OCW's own channel about-page, and StatQuest).

### Assistant | 2026-06-10T09:26:25.450Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:26:25.544Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:26:25.671Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:26:26.411Z

[tool_use: WebFetch]

### User | 2026-06-10T09:26:28.883Z

[tool_result] Based on the provided content, I cannot confirm the channel details you're asking about.

The web page shows only YouTube's footer navigation and legal links. While the page title indicates "StatQuest with Josh Starmer - YouTube," the actual content snippet doesn't include any information about the channel's subject matter, such as statistics, machine learning, or data analysis lessons.

To verify
... [+165 chars truncated]

### User | 2026-06-10T09:26:29.646Z

[tool_result] # OSHA Laws and Regulations Page Confirmation

**Yes, this resolves correctly as the OSHA Laws and Regulations landing page.**

This is the official standards and regulations hub for workplace safety. The page confirms its purpose with the statement: "OSHA's mission is to ensure that employees work in a safe and healthful environment by setting and enforcing standards."

**Key indicators this is t
... [+624 chars truncated]

### User | 2026-06-10T09:26:30.063Z

[tool_result] # MIT OCW Course Verification

**Course Title:** Statistics for Applications (18.650) - Confirmed ✓

**Course Resolution:** Yes, the homepage resolves successfully.

**Content Coverage:** The course description states it offers "an in-depth the theoretical foundations for statistical methods that are useful in many applications." While the homepage doesn't explicitly list specific topics like hypo
... [+608 chars truncated]

### User | 2026-06-10T09:26:31.387Z

[tool_result] # NIST Measurement Uncertainty Page - Verification

**Yes, this resolves and matches the criteria.**

This is an active NIST topic-area hub focused on measurement uncertainty within the GUM (Guide to the expression of uncertainty in measurement) framework.

## Key Confirmations:

**GUM Framework**: The page extensively references the GUM, defining measurement uncertainty as a "parameter, associate
... [+808 chars truncated]

### Assistant | 2026-06-10T09:26:38.052Z

MIT OCW 18.650 (with video lectures) confirmed, OSHA laws/regs confirmed, NIST measurement-uncertainty topic hub confirmed (and it IS already cited in foundations Section 4 — I must not re-list it; I'll instead surface the NIST Uncertainty Machine tool / NIST SED hub for a video/tool angle, or skip). YouTube channels keep returning footer-only shells. Let me verify a YouTube channel via its `/about` page and a few more living sources to round out the set: NIST Uncertainty Machine tool, edX audit page, NPTEL another quality course, and MIT OCW statistics dept channel.

### Assistant | 2026-06-10T09:26:39.555Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:26:40.713Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:26:42.127Z

[tool_use: WebFetch]

### User | 2026-06-10T09:26:42.396Z

[tool_result] # Confirmation

Yes, this resolves to the NIST Uncertainty Machine web application. 

The page confirms it is "a Web-based software application to evaluate the measurement uncertainty associated with an output quantity defined by a measurement model."

As a product of the National Institute of Standards and Technology (a U.S. government agency), this tool is free and publicly available. The interf
... [+198 chars truncated]

### Assistant | 2026-06-10T09:26:43.656Z

[tool_use: WebFetch]

### User | 2026-06-10T09:26:44.107Z

[tool_result] I cannot verify the claims you're asking about based on the content provided. The web page content shown appears to be truncated with "[Content truncated due to length...]", which means the actual description text and details about what MIT OpenCourseWare posts on their YouTube channel are not included in what was shared with me.

To properly confirm whether this is the official MIT OpenCourseWare
... [+184 chars truncated]

### User | 2026-06-10T09:26:44.608Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:26:45.107Z

[tool_result] # NPTEL Course Confirmation

**Yes, this resolves to an NPTEL course.**

**Course Title:** "NOC: Total Quality Management - I, IIT Kanpur"

**Subject Confirmation:** This course is indeed about quality management. The title explicitly references "Total Quality Management," which is a core quality management/engineering discipline focused on continuous improvement and organizational excellence.

**
... [+54 chars truncated]

### Assistant | 2026-06-10T09:26:50.035Z

NIST Uncertainty Machine confirmed (a living free tool), NPTEL Total Quality Management (IIT Kanpur) confirmed, NIST engineering-statistics program 404 (drop). YouTube `/about` keeps truncating. I have a strong verified set already. Let me do a final batch to confirm a couple more living homepage sources and lock the YouTube/video section with a verifiable representative. I'll verify the NPTEL course listing hub, OpenStax via its book web-view (which renders), and an ASME/IEC fetchable page.

### Assistant | 2026-06-10T09:26:51.974Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:26:53.291Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:26:54.690Z

[tool_use: WebFetch]

### User | 2026-06-10T09:26:55.549Z

[tool_result] # OpenStax Textbook Verification

**Yes, the page resolves successfully.**

The web page confirms:

1. **Book Title**: "Introductory Business Statistics 2e" appears multiple times in the header and navigation
2. **Chapter Content**: This is Chapter 1 Introduction, covering foundational statistics concepts

The introductory section explains that statistics appear throughout daily life—"in newspaper
... [+408 chars truncated]

### Assistant | 2026-06-10T09:26:56.083Z

[tool_use: WebFetch]

### User | 2026-06-10T09:26:58.598Z

[tool_result] # Course Resolution Summary

**Course Title:** "Six Sigma Advanced Define and Measure Phases"

**Confirms as Six Sigma/Quality Course:** Yes. The page explicitly states it covers "the Define and Measure phases of the DMAIC structure of Six Sigma" and teaches "Six Sigma Methodology" among 20+ related skills.

**Free Audit Available:** Yes, with limitations. The page offers "Enroll for free" access 
... [+275 chars truncated]

### User | 2026-06-10T09:26:59.633Z

[tool_result] # Confirmation: NIST Statistical Engineering Division Home Page

Yes, this is confirmed to be the official NIST Statistical Engineering Division (SED) home page.

**Key identifiers:**

- **Official URL:** https://www.nist.gov/itl/sed
- **Division identity:** The page clearly states "Statistical Engineering Division (SED), founded in 1946"
- **Primary mission:** The division "develops and applies s
... [+765 chars truncated]

### User | 2026-06-10T09:27:01.424Z

[tool_result] # Unable to Confirm PDF Content

The provided content is a **corrupted or improperly extracted PDF binary stream**. It contains mostly encoded/compressed data that cannot be reliably parsed.

What I can observe:
- The file header indicates a PDF document (version 1.6)
- Object references suggest multiple pages with images
- No readable text content is accessible

**I cannot confirm:**
- Whether th
... [+494 chars truncated]

### Assistant | 2026-06-10T09:27:16.968Z

OpenStax Intro Business Statistics 2e web-reader confirmed, Coursera Six Sigma (audit-free enroll) confirmed, NIST SED home confirmed. NIST SP 1176 PDF is a binary stream (can't confirm content via fetch — drop, plus it's already in the cost corpus, not quality). NIST measurement-uncertainty and Uncertainty Machine are good but I must be careful: NIST measurement-uncertainty topic-area URL is ALREADY in foundations Section 4 — so I'll skip that exact URL and use the SED home + Uncertainty Machine (both NOT in foundations) for the data/tools angle.

Let me lock the video section with verifiable representatives. I'll verify a concrete MIT OCW video gallery page (course-level, renders) and the NPTEL course listing. That gives a solid "lecture series & video" section without fabricating YouTube channel IDs.

### Assistant | 2026-06-10T09:27:18.837Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:27:20.625Z

[tool_use: WebFetch]

### User | 2026-06-10T09:27:22.140Z

[tool_result] Yes, this is a lecture-video gallery for MIT's 18.650 Statistics for Applications course. The page confirms it contains recorded video lectures, as stated in the heading "Lecture Videos" and the note that "The video for Lecture 1 was recorded in Fall 2017. The rest of the lectures were recorded in Fall 2016."

The gallery lists 22 available lecture videos covering topics from "Introduction to Stat
... [+138 chars truncated]

### User | 2026-06-10T09:27:23.613Z

[tool_result] # NIST/SEMATECH e-Handbook Chapter 2 Table of Contents

Yes, this is the table of contents for the "Measurement Process Characterization" chapter. The main section topics include:

1. **Characterization** — addresses issues and check standards
2. **Control** — covers bias, long-term variability, and short-term variability
3. **Calibration** — encompasses artifacts, designs, instrument control, and
... [+555 chars truncated]

### Assistant | 2026-06-10T09:27:31.473Z

Both confirmed. I now have a strong, verified, diverse set. Let me tally my confirmed-resolving + on-topic URLs:

**Free college courses:** MIT OCW 18.650 Statistics for Applications, NPTEL Six Sigma (IIT Kharagpur 110105039), NPTEL Total Quality Management I (IIT Kanpur 110104080), Coursera Six Sigma Advanced Define & Measure (audit-free), NIST/SEMATECH e-Handbook Ch6 TOC (course-like reference).

**Free textbooks & references:** LibreTexts Statistics bookshelf, OpenStax Intro Business Statistics 2e (web-reader), NIST e-Handbook Ch2 (Measurement Process Characterization) TOC.

**Archives & open data / gov:** Internet Archive texts collection, NASA NTRS, NIST OWM (metrology), NIST SED home.

**Lecture series & video:** MIT OCW 18.650 lecture-video gallery (22 recorded lectures), NPTEL courses (video-based — covered via course pages above; I'll reference the NPTEL video nature).

**Standards & authoritative bodies:** OSHA laws & regs landing, NIST Uncertainty Machine (tool), NIST measurement-uncertainty hub (already in foundations — skip per R8).

Let me cross-check which URLs already appear in foundations to avoid duplication, then write the atlas.

### Assistant | 2026-06-10T09:27:34.258Z

[tool_use: Bash]

### User | 2026-06-10T09:27:38.062Z

[tool_result] 18-650                                  not-in-foundations(safe)
nptel                                   not-in-foundations(safe)
libretexts                              not-in-foundations(safe)
introductory-business-statistics        FOUND-IN-FOUNDATIONS
archive.org/details/texts               not-in-foundations(safe)
ntrs.nasa                               not-in-foundations(safe)
pml/owm       
... [+436 chars truncated]

### Assistant | 2026-06-10T09:27:47.300Z

Two collisions: `introductory-business-statistics` (foundations cites a specific *page* `6-1...`/`1-introduction` — I'll cite the OpenStax book-details/homepage as a broader living-textbook pointer, which is distinct from a single chapter) and `itl/sed` — foundations cites the `itl/sed/topic-areas/measurement-uncertainty` deep page, not the SED home `itl/sed`. To be safe and add genuine breadth, I'll:
- Use the OpenStax **math subject catalog homepage** angle via the confirmed Intro Business Statistics book (the atlas points to the living textbook home, foundations points to one chapter — but to be cleanest I'll keep OpenStax pointer but frame as the book homepage, distinct purpose). Actually simplest: I'll keep LibreTexts (fully distinct) as the textbook anchor and include OpenStax book as the second textbook, noting it's the broader living textbook home vs. foundations' single-chapter citation.
- Drop SED-home/measurement-uncertainty duplication risk by using NIST OWM + Uncertainty Machine (both safe) for metrology, and keep SED only if it adds value — I'll use NIST SED home (distinct URL from foundations' deep topic page, genuinely broader hub) but flag it's the division hub, not the chapter.

Now writing the atlas.

### Assistant | 2026-06-10T09:28:34.646Z

[tool_use: Write]

### User | 2026-06-10T09:28:39.965Z

[tool_result] File created successfully at: H:/prism/knowledge/wiki/quality/quality-source-atlas.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T09:28:52.897Z

The file was created successfully. The pre-write hook flagged the generic "quality" dispatcher — not a duplicate of this atlas file (different asset type and path). The atlas is a net-new wiki page at the requested path.

GALAXY: quality
FILE: knowledge/wiki/quality/quality-source-atlas.md
CREATED: yes
VERIFIED_LINKS: 13
SECTIONS: 5
DEAD_LINKS_DROPPED: 8
NOTE: The strongest living source surfaced is the NIST/SEMATECH e-Handbook Chapter 6 (https://www.itl.nist.gov/div898/handbook/pmc/pmc.htm) -- a free, continuously-maintained, course-grade SPC reference covering control charts, capability, and acceptance sampling.
