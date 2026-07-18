---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "Create the Open Source Atlas wiki for the PRISM \"post-processor\" galaxy (owner: "
date: "2026-06-10"
first_ts: "2026-06-10T09:15:06.889Z"
last_ts: "2026-06-10T09:18:43.890Z"
cwd: "H:\\prism"
messages: 91
user_msgs: 39
assistant_msgs: 52
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_40e23c66-b21/agent-ae43b69905eac51a2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# Create the Open Source Atlas wiki for the PRISM "post-processor" galaxy (owner: 

> **claude-code-cli** | 2026-06-10 | 91 msgs (39 user / 52 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_40e23c66-b21/agent-ae43b69905eac51a2.jsonl`

## Transcript

### User | 2026-06-10T09:15:06.889Z

Create the Open Source Atlas wiki for the PRISM "post-processor" galaxy (owner: echo, domain: CNC G-code / RS-274 / controller post-processing): knowledge/wiki/post-processor/post-processor-source-atlas.md.

PURPOSE: a curated, VERIFIED directory of the best FREE + LEGAL LIVING resources for CNC G-code / RS-274 / controller post-processing -- so the galaxy has a non-stagnant "keep-learning" curriculum that stays current because it points to continuously-updated sources. This is DISTINCT from knowledge/wiki/post-processor/post-processor-foundations.md (read it first -- the atlas must NOT just repeat the foundations' Sources list; the atlas curates BROADER living resources: full course series, textbook homepages, data portals, lecture-video series, standards landing pages).

CONTEXT (R8 -- do not duplicate existing work): a bulk free-source corpus already exists at state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md (flat pointers, NOT auto-invoked). This atlas is the CURATED + VERIFIED + auto-invokable per-galaxy form -- pick the best ~15-25 LIVING sources, verify each resolves, organize by type. Do NOT re-dump that corpus; ADD value by verifying + curating + type-organizing the strongest continuously-updated sources.

ORGANIZE the atlas into these "## " sections (include a section only if you find verified entries for it):
- ## Free college courses (full course / lecture-series homepages: MIT OCW, NPTEL, Stanford/CMU/Berkeley open courseware, edX/Coursera audit-free)
- ## Free textbooks & references (OpenStax, LibreTexts, Gutenberg, official open-license docs, free PDFs)
- ## Archives & open data / gov reports (NIST, NASA, DOE, BLS, archive.org, gov data portals -- the "data reports" the operator wants)
- ## Lecture series & video (reputable YouTube lecture channels / recorded seminars -- name the channel + topic, link the channel or a representative playlist)
- ## Standards & authoritative bodies (ISO/ASME/ANSI/OSHA/IEC landing pages relevant to CNC G-code /
... [+1895 chars truncated]

### Assistant | 2026-06-10T09:15:09.708Z

I'll start by reading the foundations file to avoid duplicating its sources, then check the bulk corpus for candidate living sources to curate.

### Assistant | 2026-06-10T09:15:10.278Z

[tool_use: Read]

### User | 2026-06-10T09:15:13.513Z

[tool_result] 1	---
2	title: Post-Processor Foundations — CNC G-code standards, work offsets, canned-cycle structure, Fanuc high-speed look-ahead
3	galaxy: post-processor
4	owner_slot: echo
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-workflow (claude-b5de5424, 2026-06-09); DEEPEN pass (claude, 2026-06-09); SECOND DEEPEN pass (claude, 2026-06-10)"
7	verification_method: institutional/standards-lineage + meth
... [+27665 chars truncated]

### Assistant | 2026-06-10T09:15:16.540Z

I have the foundations file. Now let me check the bulk corpus to find candidate living sources to curate, and note which URLs the foundations already used (so I don't just repeat them).

### Assistant | 2026-06-10T09:15:16.873Z

[tool_use: Read]

### User | 2026-06-10T09:15:19.138Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-370 of 465 total (26637 tokens, cap 25000). Call Read with offset=371 limit=370 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	# GALAXY FREE-SOURCE CORPUS - per-domain authoritative external knowledge index
2	
3	> **Generated** by `s
... [+45940 chars truncated]

### Assistant | 2026-06-10T09:15:27.974Z

I have enough context. The corpus's post-processor section is mostly vendor/aggregator pages already in the foundations. My task is to curate BROADER LIVING resources (full courses, textbook homepages, data portals, lecture-video series, standards landing pages) — distinct from the foundations' single-page Sources list.

Foundations already used (do NOT just repeat): Wikipedia G-code, LinuxCNC pages, NIST RS274NGC/STEP-NC pages, OpenStax circular-motion page, OSHA machine-guarding, ASME Y14.5 (via PMC), MTConnect-via-NIST.

For the atlas I'll curate LIVING homepages/portals (the broader form). Let me verify candidate living sources now. I'll batch the WebFetches.

### Assistant | 2026-06-10T09:15:29.811Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:15:30.872Z

[tool_use: WebFetch]

### User | 2026-06-10T09:15:30.949Z

[tool_result] The server returned HTTP 404 Not Found.
Retry-After: 0

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:15:34.734Z

[tool_result] Yes, this is the LinuxCNC documentation landing page. The page serves as the central hub for accessing documentation across multiple versions.

The page explicitly states "Current release: 2.9.8" and organizes documentation into three categories: the stable version (2.9), future prerelease versions (2.10), and older versions (2.0-2.8). Each version offers both HTML and PDF formats.

This is defini
... [+311 chars truncated]

### Assistant | 2026-06-10T09:15:38.160Z

LinuxCNC docs index confirmed. The MIT 2.008 specific URL 404'd. Let me try the MIT OCW search/find-courses landing for manufacturing, and verify NPTEL, NIST publications portal, and the ISO standards landing.

### Assistant | 2026-06-10T09:15:39.592Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:15:41.529Z

[tool_use: WebFetch]

### User | 2026-06-10T09:15:42.365Z

[tool_result] # Response

No, this page does not resolve to MIT OpenCourseWare's Mechanical Engineering course listing.

The content provided is a **warning modal/overlay** that appears when users attempt to leave the MIT OCW website for external links. It displays navigation elements and a disclaimer stating "external sites may have terms and conditions, including license rights, that differ from ours."

This 
... [+247 chars truncated]

### Assistant | 2026-06-10T09:15:42.472Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:15:44.206Z

[tool_use: WebFetch]

### User | 2026-06-10T09:15:44.531Z

[tool_result] # NPTEL Manufacturing Course Confirmation

**Yes, this is a live NPTEL course page** related to manufacturing technology.

**Course Title:** "Manufacturing Processes II, IIT Kharagpur"

**Verification Details:**
- The page displays the official NPTEL logo and navigation structure
- The course is offered by IIT Kharagpur with faculty instruction from Prof. A.B. Chattopadhyay, Prof. A.K. Chattopadhy
... [+355 chars truncated]

### User | 2026-06-10T09:15:44.835Z

[tool_result] The server returned HTTP 403 Forbidden.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:15:45.709Z

[tool_result] Yes, this is the live NIST publications landing and search page. The URL confirms it: "https://www.nist.gov/publications"

The page provides a comprehensive publications database where users can "Search Title, Abstract, Conference, Citation, Keyword or Author" and browse by topic areas. It explicitly states: "This publications database includes many of the most recent publications of the National 
... [+261 chars truncated]

### Assistant | 2026-06-10T09:15:49.362Z

Good progress. NPTEL Manufacturing Processes II confirmed, NIST publications portal confirmed. MIT OCW search and ISO committee page failed. Let me try alternates: a specific resolvable MIT OCW course homepage, NIST MTConnect/STEP programs, archive.org, and standards landing pages (ASME, ISO OBP for ISO 6983/14649).

### Assistant | 2026-06-10T09:15:50.816Z

[tool_use: WebFetch]

### User | 2026-06-10T09:15:51.396Z

[tool_result] The server returned HTTP 404 Not Found.
Retry-After: 0

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:15:51.723Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:15:53.610Z

[tool_use: WebFetch]

### User | 2026-06-10T09:15:54.159Z

[tool_result] The server returned HTTP 403 Forbidden.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:15:55.146Z

[tool_use: WebFetch]

### User | 2026-06-10T09:15:55.545Z

[tool_result] Based on the provided content, **yes, this appears to be the Internet Archive's main landing page**, which includes their texts collection among other services.

The page header references "Digital Library of Free & Borrowable Texts, Movies, Music & Wayback Machine," confirming the texts component is part of their offerings. However, the excerpt provided is only the page title/header and doesn't c
... [+411 chars truncated]

### User | 2026-06-10T09:15:56.039Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:16:00.967Z

ISO OBP blocks WebFetch (403) — drop ISO OBP links. MIT 2.810 specific URL 404'd. Archive.org confirmed (texts collection). Let me find a resolvable MIT OCW course homepage (try the find-courses topic page) and verify more living sources: ASME landing, NASA technical reports server, edX/Coursera, a YouTube lecture channel, and the MTConnect official org site.

### Assistant | 2026-06-10T09:16:02.415Z

[tool_use: WebFetch]

### User | 2026-06-10T09:16:03.075Z

[tool_result] The server returned HTTP 404 Not Found.
Retry-After: 0

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:16:03.817Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:16:04.815Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:16:05.982Z

[tool_use: WebFetch]

### User | 2026-06-10T09:16:07.110Z

[tool_result] # NTRS Confirmation

Yes, this is the live NASA Technical Reports Server (NTRS) landing page. The content confirms it provides "access to NASA metadata records, full-text online documents, images, and videos" including "conference papers, journal articles, meeting papers, patents, research reports."

The page explicitly states it's a free, publicly available resource where users can "begin searchi
... [+208 chars truncated]

### User | 2026-06-10T09:16:08.356Z

[tool_result] I cannot confirm the channel exists or provide its name based on the content provided. The webpage content shown is "[Content truncated due to length...]" — there's no actual information available to verify whether this is the official Haas Automation YouTube channel or to confirm any details about its content.

To verify the channel, I'd need to see actual page details such as the channel name, d
... [+19 chars truncated]

### User | 2026-06-10T09:16:08.911Z

[tool_result] # MTConnect Institute Official Homepage Confirmation

Yes, this is the official MTConnect Institute website. The content confirms this is the live organizational homepage through multiple indicators:

**Official Status Markers:**
- The site presents itself as "An Open Standard To Connect Manufacturing Devices"
- Features the official MTConnect logo and branding
- Displays the standardized specific
... [+786 chars truncated]

### Assistant | 2026-06-10T09:16:14.635Z

NTRS confirmed, MTConnect.org confirmed. YouTube channel pages return truncated content via WebFetch (can't confirm) — I'll verify YouTube channels via a more reliable representative URL or drop them if unconfirmable. MIT OCW course-specific slugs keep 404'ing; let me find the correct live MIT OCW manufacturing course slug via the find-by-topic page, plus verify gcodetutor (a living G-code course site), edX, and the ASME standards landing.

### system

... [11 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-10T09:16:32.710Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:16:34.275Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:16:35.862Z

[tool_use: WebFetch]

### User | 2026-06-10T09:16:35.934Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:16:38.031Z

[tool_result] # Analysis

**Yes, this appears to be the landing page for the NIST/SEMATECH e-Handbook.**

The page title confirms it: `"NIST/SEMATECH e-Handbook of Statistical Methods"`. This is a government resource (indicated by the DOC/NIST analytics tags) that provides free online guidance on statistical methods and quality practices.

**However, with an important caveat:** This is a **frameset-based HTML s
... [+449 chars truncated]

### User | 2026-06-10T09:16:38.378Z

[tool_result] Based on the content provided, this does not resolve to a YouTube playlist. The page shows only YouTube's footer navigation and legal links—there is no playlist content, title, or channel information visible. This appears to be a footer section rather than a functional playlist page.

### Assistant | 2026-06-10T09:16:43.424Z

NIST/SEMATECH e-Handbook confirmed (living gov/stats reference). YouTube playlist/channel pages don't render content via WebFetch reliably — per the rules I will NOT list YouTube entries I cannot confirm (no fabrication). MIT OCW redirects exceed limit on that slug. Let me get one solid MIT OCW course homepage by trying the manufacturing-processes course with a verified-resolvable slug, plus the MIT OCW main courses landing and NPTEL Mechanical discipline page.

### Assistant | 2026-06-10T09:16:44.823Z

[tool_use: WebFetch]

### User | 2026-06-10T09:16:45.516Z

[tool_result] The server returned HTTP 404 Not Found.
Retry-After: 0

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T09:16:45.764Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:16:47.236Z

[tool_use: WebFetch]

### User | 2026-06-10T09:16:48.609Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T09:16:50.915Z

[tool_result] # Confirmation: MIT OpenCourseWare Homepage

Yes, this resolves to the MIT OpenCourseWare homepage. The content confirms it is the live OCW site featuring:

**Key identifying elements:**
- MIT branding and logo present throughout
- Tagline: "Free lecture notes, exams, and videos from MIT. No registration required."
- Navigation menu with "About OCW," "Help & FAQs," and "Contact Us"
- Featured cour
... [+552 chars truncated]

### Assistant | 2026-06-10T09:16:58.422Z

MIT OCW homepage confirmed (free courses landing). For the "free college courses" section, I'll use the verified MIT OCW homepage (free-courses portal) + the verified NPTEL Manufacturing Processes II course + the verified edX manufacturing listing. Let me verify a couple more living sources to round out sections: LibreTexts Engineering landing, OpenStax homepage, eCFR (machine guarding 1910 Subpart O is a "gov data/standards" living source), and Project Gutenberg. Then I'll write the atlas.

### Assistant | 2026-06-10T09:16:59.565Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:17:00.976Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:17:02.404Z

[tool_use: WebFetch]

### User | 2026-06-10T09:17:03.171Z

[tool_result] REDIRECT DETECTED: The URL redirects to a different host.

Original URL: https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XVII/part-1910/subpart-O
Redirect URL: https://unblock.federalregister.gov/
Status: 302 Found

To complete your request, I need to fetch content from the redirected URL. Please use WebFetch again with these parameters:
- url: "https://unblock.federalregister.gov/"
- pro
... [+219 chars truncated]

### Assistant | 2026-06-10T09:17:03.256Z

[tool_use: WebFetch]

### User | 2026-06-10T09:17:03.640Z

[tool_result] I cannot confirm this is the OpenStax subjects page based on the provided content. The snippet only contains the text "OpenStax" with no additional details, navigation elements, or page structure that would verify it's the live catalog landing page for their freely-licensed textbooks.

To properly confirm, I would need to see actual page content such as subject categories, textbook listings, or di
... [+53 chars truncated]

### User | 2026-06-10T09:17:04.184Z

[tool_result] # Engineering LibreTexts Homepage Confirmation

**Yes, this is the live Engineering LibreTexts landing page.**

The content confirms this is the official Engineering Library homepage. The page explicitly identifies itself as a principal hub of the LibreTexts project, stating: "Welcome to the Engineering Library. This Living Library is a principal hub of the LibreTexts project."

Key indicators tha
... [+763 chars truncated]

### User | 2026-06-10T09:17:10.182Z

[tool_result] Yes, this is the Project Gutenberg homepage. The page confirms it's the official site with the statement: "Project Gutenberg is a library of over 75,000 free eBooks." It features their logo, navigation menu, newest releases, most popular titles, and information about how to access and contribute to their collection of public-domain works.

### Assistant | 2026-06-10T09:17:15.236Z

LibreTexts Engineering and Project Gutenberg confirmed. OpenStax /subjects returned truncated content (can't confirm) and eCFR redirected to an anti-bot host — I'll drop both of those specific URLs. OSHA machine-guarding standards page (already confirmed) covers the standards/regulation need. Let me verify the OpenStax homepage directly (instead of /subjects) and the official MTConnect was already confirmed. Also verify the data.gov manufacturing portal as a "gov data" entry and the NIST Engineering Laboratory landing.

### Assistant | 2026-06-10T09:17:16.183Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:17:18.071Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:17:18.810Z

[tool_use: WebFetch]

### User | 2026-06-10T09:17:19.748Z

[tool_result] # Cannot Confirm

Based on the provided content, I cannot verify this is the OpenStax homepage. The page shows only the text "OpenStax" with no additional content that would confirm it displays the actual site with information about free, openly-licensed textbooks or other identifying features of their live homepage.

To properly verify, I would need to see actual page elements such as the site's 
... [+93 chars truncated]

### User | 2026-06-10T09:17:23.004Z

[tool_result] # NIST Engineering Laboratory Homepage Confirmation

Yes, this is the live NIST Engineering Laboratory homepage. The page confirms its identity through multiple indicators:

**Official URL:** `https://www.nist.gov/el`

**Primary Description:** The page states that the Engineering Laboratory "promotes U.S. innovation and industrial competitiveness by advancing measurement science, standards, and te
... [+834 chars truncated]

### User | 2026-06-10T09:17:24.884Z

[tool_result] Yes, this is the live Data.gov dataset catalog/search page. The content shows the official U.S. government open data portal operated by the GSA's Technology Transformation Services.

Key indicators confirming this:

- **Portal identity**: The page displays "Catalog - Data.gov" and features the official ".gov" branding with security verification information
- **Dataset count**: It states "543,061 d
... [+638 chars truncated]

### Assistant | 2026-06-10T09:17:29.996Z

NIST Engineering Laboratory and data.gov catalog confirmed. OpenStax homepage keeps returning truncated content via WebFetch (its SPA shell), so I'll drop OpenStax — LibreTexts Engineering covers the open-textbook need and IS confirmed. 

I now have a strong verified set. Let me do a final batch to confirm a few more standards/reference living sources to round out the standards section and get one more solid textbook/reference: the ASME codes-and-standards landing, the eCFR home (without the redirecting deep path), and a NIST gov report I can cite as a living data source — plus the NPTEL mechanical engineering listing.

### Assistant | 2026-06-10T09:17:31.888Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:17:33.410Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T09:17:34.303Z

[tool_use: WebFetch]

### User | 2026-06-10T09:17:34.738Z

[tool_result] Yes, this resolves to the ASME Codes & Standards landing page. The content confirms it is the live standards page, as evidenced by the header stating "Setting the Standard for Over 125 Years" and the description that "ASME offers a continuously evolving portfolio of standards across a wide range of topics, including pressure technology, power plants, elevators, construction equipment, piping, nucl
... [+219 chars truncated]

### User | 2026-06-10T09:17:35.853Z

[tool_result] Based on the web page content provided, I cannot confirm this resolves to GovInfo's CFR collection. The page only shows "Govinfo" as a heading with no additional content, links, or identifying information about the Code of Federal Regulations collection. To verify it's the live CFR collection page, I would need to see actual page content, URLs, or navigation elements that specifically reference th
... [+15 chars truncated]

### User | 2026-06-10T09:17:39.702Z

[tool_result] # NPTEL Courses Catalog Verification

Yes, this is the live NPTEL courses catalog page. The content displays course listings across multiple disciplines including:

- **Aerospace Engineering** (numerous courses on aircraft design, propulsion, CFD)
- **Biotechnology** (genetics, cell biology, bioprocess engineering)
- **Chemical Engineering** (thermodynamics, process control, unit operations)
- **C
... [+515 chars truncated]

### Assistant | 2026-06-10T09:17:47.778Z

ASME Codes & Standards landing and NPTEL courses catalog confirmed. GovInfo CFR collection returned truncated content (drop it — OSHA standards page already covers the regulation need).

I now have a robust, fully-verified set. Let me tally the confirmed-live, on-topic links:

**Free college courses:** MIT OCW homepage, NPTEL Manufacturing Processes II course, NPTEL courses catalog, edX manufacturing listing, GcodeTutor (free CNC course site)
**Free textbooks & references:** LibreTexts Engineering, Project Gutenberg, NIST/SEMATECH e-Handbook
**Archives & open data / gov reports:** NIST publications portal, NIST Engineering Laboratory, NASA NTRS, Internet Archive texts, data.gov catalog
**Lecture series & video:** (YouTube channel/playlist pages did not render verifiably via WebFetch — dropping to avoid fabrication; NPTEL archive video pages 404'd. I will NOT include an unverified video entry.)
**Standards & authoritative bodies:** ASME Codes & Standards, OSHA machine-guarding standards page, MTConnect Institute, LinuxCNC documentation index

That's 16 verified entries across 4 sections. The "Lecture series & video" section has no verifiable entries, so I'll omit it per the instructions (include a section only if verified entries exist). Now writing the atlas.

### Assistant | 2026-06-10T09:18:35.908Z

[tool_use: Write]

### User | 2026-06-10T09:18:38.448Z

[tool_result] File created successfully at: H:\prism\knowledge\wiki\post-processor\post-processor-source-atlas.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T09:18:43.890Z

The atlas was created successfully. The file is distinct from the foundations file (curates living roots, not single-page facts) and does not duplicate the existing post-processor wiki nodes.

GALAXY: post-processor
FILE: knowledge/wiki/post-processor/post-processor-source-atlas.md
CREATED: yes
VERIFIED_LINKS: 16
SECTIONS: 4
DEAD_LINKS_DROPPED: 11
NOTE: GcodeTutor (https://gcodetutor.com/) — the single most on-topic continuously-updated living course site, teaching the exact G/M-code constructs a CNC post must emit.
