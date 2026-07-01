---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the RESOURCE-ATLAS wiki for the PRISM \"fleet-hygiene\" meta/infr"
date: "2026-06-10"
first_ts: "2026-06-10T20:21:09.666Z"
last_ts: "2026-06-10T20:24:12.951Z"
cwd: "H:\\prism"
messages: 26
user_msgs: 10
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_533dad90-22c/agent-a93aba8e86a254ccb.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the RESOURCE-ATLAS wiki for the PRISM "fleet-hygiene" meta/infr

> **claude-code-cli** | 2026-06-10 | 26 msgs (10 user / 16 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_533dad90-22c/agent-a93aba8e86a254ccb.jsonl`

## Transcript

### User | 2026-06-10T20:21:09.666Z

You are creating the RESOURCE-ATLAS wiki for the PRISM "fleet-hygiene" meta/infra galaxy (owner: golf, focus: OS process mgmt / cgroups / race-free subtree reaping): knowledge/wiki/fleet-hygiene/fleet-hygiene-resource-atlas.md.

PURPOSE (operator directive -- EACH galaxy gets an easy-access resource index, do not stay stagnant): a single hub that links the LOCAL code/store trove + the CANONICAL free online resources (the official tool GitHub repo, the seminal free paper/book, the standards page) so a chat in this galaxy jumps STRAIGHT to the authoritative source. This is DISTINCT from [[fleet-hygiene-source-atlas]] (which is the where-to-LEARN curriculum): the resource-atlas is the where-to-REACH index -- the canonical repo/paper/standard + the local code, not a course list.

LOCAL TROVE (PRISM code/stores -- LINK verbatim, these are the galaxy's own engine dir + real stores):
mcp-server/src/engines/fleet-hygiene/; .claude/helpers/install-fleet-reaper-task.ps1; fleet-reaper scripts

ONLINE CANDIDATES (seeded by a local-LLM offload -- TREAT AS UNVERIFIED; WebFetch EACH before listing; DROP any that 404/redirect-away/don't match; some are hallucinated): systemd/systemd github; kernel.org cgroup-v2 admin-guide; OSTEP free book (pages.cs.wisc.edu/~remzi/OSTEP)
You MAY add other canonical free sources you can WebFetch-verify. FREE + LEGAL only (no paywalled/LibGen).

ABSOLUTE RULES (R12):
1. LOCAL section: reproduce the given engine-dir + store pointers verbatim (verified PRISM paths). ONLINE: ONLY list a URL you CONFIRM resolves via WebFetch AND matches the described resource; drop the rest. Never list an unverified/hallucinated URL.
2. Cross-link the sibling wiki layers: [[fleet-hygiene-foundations]], [[fleet-hygiene-source-atlas]], [[fleet-hygiene-applied-practice]], [[fleet-hygiene-advanced-techniques]], plus [[prism-methodology-foundations]].
3. R12 SAFETY: promote NO numeric threshold/constant -- link the method/source, numbers stay owner-gated to golf + constants.
... [+864 chars truncated]

### Assistant | 2026-06-10T20:21:20.337Z

I'll start by reading the local trove paths to verify them, then WebFetch each online candidate before listing it.

### Assistant | 2026-06-10T20:21:22.358Z

[tool_use: Bash]

### User | 2026-06-10T20:21:36.829Z

[tool_result] total 1324
drwxr-xr-x 1 wompu 197611     0 Jun  9 22:00 ./
drwxr-xr-x 1 wompu 197611     0 Jun 10 14:24 ../
-rw-r--r-- 1 wompu 197611  7910 Jun  9 22:38 CLAUDE.md
-rw-r--r-- 1 wompu 197611 18078 Jun  9 22:00 MEMORY.md
-rw-r--r-- 1 wompu 197611  6077 May 30 23:16 PATHS.md
-rw-r--r-- 1 wompu 197611  4838 Jun 10 13:02 TOOLBELT.md
---HELPERS---
-rw-r--r-- 1 wompu 197611 11448 Jun  1 20:31 .claude/help
... [+520 chars truncated]

### Assistant | 2026-06-10T20:21:42.908Z

The local trove paths are verified. The sibling wiki layers exist (foundations, source-atlas, applied-practice, advanced-techniques), and the resource-atlas does not yet exist. Let me look at the main reaper script and a sibling wiki file for conventions, then verify the online candidates.

### Assistant | 2026-06-10T20:21:44.208Z

[tool_use: Bash]

### User | 2026-06-10T20:21:52.739Z

[tool_result] apply-host-fleet-tuning.ps1
fleet-reaper-enum-cache.mjs
fleet-reaper-enum-cache.test.mjs
fleet-reaper-host-presets.mjs
fleet-reaper-host-presets.test.mjs
fleet-reaper.test.mjs
install-fleet-memory-monitor-task.ps1
install-fleet-reaper-task.ps1
install-zombie-reaper-task.ps1
loop-state-fleet-fallback.test.mjs
register-fleet-memory-task-unelevated.ps1
zombie-reaper-daemon.mjs*
---scripts dir---
asse
... [+3611 chars truncated]

### Assistant | 2026-06-10T20:21:56.323Z

I have a clear template. Now let me verify the online candidates via WebFetch. I'll do them in parallel.

### Assistant | 2026-06-10T20:21:57.743Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T20:22:02.433Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T20:22:02.436Z

[tool_use: WebFetch]

### User | 2026-06-10T20:22:18.587Z

[tool_result] # Confirmation: OSTEP Free Textbook Homepage

Yes, this is the official Operating Systems: Three Easy Pieces (OSTEP) homepage. 

**Free PDF Availability:**
The site confirms: "This book **is and will always be free** in PDF form." Version 1.10 is currently available.

**Core Topic Coverage:**
The textbook is organized around three fundamental concepts. The page states the book centers on "**virtua
... [+504 chars truncated]

### User | 2026-06-10T20:22:18.589Z

[tool_result] # Official systemd Repository Confirmation

Yes, this is the official systemd source code repository. The GitHub page clearly identifies it as `systemd/systemd` under the systemd organization.

## Project Description

According to the repository, systemd is described as "The systemd System and Service Manager." The page indicates it functions as a comprehensive system initialization and service ma
... [+902 chars truncated]

### User | 2026-06-10T20:22:18.669Z

[tool_result] # Official Linux Kernel cgroup v2 Documentation

Yes, this is the official Linux kernel documentation for Control Group v2. The page header identifies it as part of "The Linux Kernel" documentation (version 7.1.0-rc7) hosted at kernel.org.

## What It Documents

The document is the authoritative guide to cgroup v2, covering:

**Core Concepts:**
- Process hierarchy organization and resource distrib
... [+1082 chars truncated]

### Assistant | 2026-06-10T20:22:28.628Z

All three seeded candidates verified live and matching. Let me verify a couple of additional high-value canonical sources I can add: the Linux man-pages for `signal(7)` / `cgroups(7)` (man7.org) and the POSIX standard, to strengthen the "standards" section. But per the directive, the source-atlas already cites man7.org root, signal(7), POSIX. The resource-atlas should surface the canonical REPO/STANDARD pages distinctly. Let me verify the `cgroups(7)` man page (the API/userspace counterpart to the kernel admin guide) and the systemd `systemd.kill` / `systemd-cgls` doc root, which are reach-targets not in source-atlas.

### Assistant | 2026-06-10T20:22:30.027Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T20:22:31.020Z

[tool_use: WebFetch]

### User | 2026-06-10T20:22:37.278Z

[tool_result] # Confirmation of cgroups(7) Man Page Authenticity

Yes, this is the official Linux man-pages documentation for cgroups(7). The page clearly states it is "part of the _man-pages_ (Linux kernel and C library user-space interface documentation) project" from kernel.org.

## Documentation Coverage

The manual comprehensively documents:

**Control Groups Fundamentals:** The page defines cgroups as "a 
... [+942 chars truncated]

### User | 2026-06-10T20:22:43.964Z

[tool_result] # Official systemd Project Portal

Yes, this is the official systemd project homepage. The page identifies itself as "System and Service Manager" and describes systemd as "a suite of basic building blocks for a Linux system."

## What It Links To

**Manual Pages & Technical Documentation:**
- Links to the [systemd manual pages index](https://www.freedesktop.org/software/systemd/man/latest/) and di
... [+932 chars truncated]

### Assistant | 2026-06-10T20:22:48.913Z

All five candidates verified. I have 3 seeded + 2 additional canonical sources (cgroups(7) man page, systemd.io portal). Now let me check if there's a video resource worth verifying. The source-atlas already covers MIT 6.824 videos. For a resource-atlas (reach-index), I'll add one curated video only if I can verify. Let me check the systemd man-pages index as a standards/reach root and then write the file.

### Assistant | 2026-06-10T20:22:51.610Z

[tool_use: WebFetch]

### User | 2026-06-10T20:22:55.329Z

[tool_result] The server returned HTTP 403 Forbidden.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### Assistant | 2026-06-10T20:23:01.929Z

That one 403s under WebFetch (anti-bot, not a true 404 — but I will NOT list it since I cannot confirm it via WebFetch per R12). I have a strong verified set. Let me also confirm the OSTEP direct PDF chapter for Process API as a high-value direct-reach (the fork/wait API page) — actually the homepage is the canonical reach root and is verified. I'll keep the set clean: 5 verified online sources. No video will be listed (MIT 6.824 video is JS-rendered per source-atlas and already lives there; resource-atlas avoids re-citing it unverified).

Now I'll write the file.

### Assistant | 2026-06-10T20:24:00.584Z

[tool_use: Write]

### User | 2026-06-10T20:24:06.925Z

[tool_result] File created successfully at: H:\prism\knowledge\wiki\fleet-hygiene\fleet-hygiene-resource-atlas.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T20:24:12.951Z

File written successfully — no file-claim hook blocked the Write. The new resource-atlas is distinct from `fleet-hygiene-source-atlas` (where-to-reach vs where-to-learn), confirmed by the advisory.

GALAXY: fleet-hygiene
FILE: knowledge/wiki/fleet-hygiene/fleet-hygiene-resource-atlas.md
CREATED: yes
LOCAL_POINTERS_LINKED: 8
ONLINE_VERIFIED: 5
CANDIDATES_DROPPED: 1
NOTE: The canonical cgroup v2 kernel admin-guide (kernel.org) — the authoritative standard for grouping/controlling processes, the substrate under race-free subtree reaping.
