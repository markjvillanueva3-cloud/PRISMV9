---
title: Fleet-Hygiene Open Source Atlas — the keep-learning directory for OS process-lifecycle + distributed-systems hygiene (free/legal sources)
galaxy: fleet-hygiene
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas-meta (2026-06-10)"
verification_method: "Every listed source WebFetch-confirmed live + free during this create pass (2026-06-10). OSTEP homepage (ostep.org -> pages.cs.wisc.edu/~remzi/OSTEP/, quoted 'free in PDF form'), MIT 6.5840/6.824 homepage + schedule (pdos.csail.mit.edu, notes+papers confirmed), the Linux man-pages index + signal(7) (man7.org), Brendan Gregg's book/site (brendangregg.com/sysperfbook.html), and the POSIX Open Group Base Specs Issue 7 frameset + wait() function page (pubs.opengroup.org) were all fetched and confirmed. DROPPED: brendangregg.com/systemsperformance.html (HTTP 404 -> replaced by the live /sysperfbook.html). The MIT 6.824 lecture-video YouTube playlist/channel resolved its page TITLE under WebFetch but the video list is JS-rendered (not visible to a fetch); existence is corroborated by WebSearch (Class Central index + dedicated @6.824 channel) and flagged inline as JS-rendered, not silently asserted. This atlas points at LEARNING SURFACES (course/book/doc/standard roots) and deliberately does NOT re-cite the specific fact-pages already quoted in [[fleet-hygiene-foundations]] / [[fleet-hygiene-applied-practice]]."
tags: [fleet-hygiene, golf, source-atlas, keep-learning, living-curriculum, free-textbook, free-college-course, OSTEP, MIT-6824, MIT-6840, distributed-systems, linux-man-pages, posix, brendan-gregg, systems-performance, official-docs, standards, process-lifecycle, reaping, heartbeat, failure-detector]
---

# Fleet-Hygiene Open Source Atlas

The **living-source curriculum** for the **fleet-hygiene** galaxy (owner: **golf**) — a curated directory of WHERE TO KEEP LEARNING this galaxy's domain (OS process-lifecycle + distributed-systems hygiene: reaping orphans/zombies, heartbeats, failure detection, single-owner/leader election, restart-storm avoidance) from reputable **free/legal** sources, so the knowledge never goes stale.

This entry is **distinct** from its two siblings — read them first, this page does not repeat them:
- [[fleet-hygiene-foundations]] = the synthesized *theory* spine (the model: PID/fork/wait, zombie-vs-orphan, process-state machine, heartbeat/failure-detector theory, leader-election/split-brain).
- [[fleet-hygiene-applied-practice]] = the practitioner *gotchas* (PID-reuse race, can't-kill-a-zombie, SIGTERM-grace, kill-the-group, double-fork, thundering-herd/jitter).
- **This atlas** = the *keep-learning directory*: the durable **learning surfaces** (full free textbooks, free college courses, lecture-video channels, official doc roots, standards) you return to when you need to go deeper or check that a fact still holds — plus the cadence for keeping the directory fresh. It points at the **roots** (book homepage, course homepage, man-pages index, standards root), not the individual fact-pages the siblings already quoted, so the three entries compound rather than overlap.

Every source below was **WebFetch-confirmed live + free on 2026-06-10** (see frontmatter `verification_method`). A source that could not be confirmed was dropped, not guessed (R12).

---

## 1. Free college courses

- **MIT 6.5840 / 6.824 "Distributed Systems"** (MIT PDOS) — https://pdos.csail.mit.edu/6.824/
  *Teaches:* fault tolerance, replication, consistency, consensus (Paxos/Raft), via case studies (MapReduce, GFS, ZooKeeper, Spanner, Chain Replication/CRAQ) + four Go labs that build a Raft-backed KV store.
  *Feeds this galaxy:* the failure-detector / heartbeat / leader-election / split-brain backbone behind the fleet reaper and golf's single-owner hygiene role — the structured, deployable-algorithm half of [[fleet-hygiene-foundations]] §4-5. Confirmed free: course homepage + the **schedule** (lecture notes as `lNN.txt` + research-paper PDFs + per-lecture FAQ/questions) at https://pdos.csail.mit.edu/6.824/schedule.html.

- **OSTEP as a self-study OS course** (UW-Madison, Arpaci-Dusseau) — https://pages.cs.wisc.edu/~remzi/OSTEP/
  *Teaches:* the full undergraduate operating-systems curriculum; the book doubles as a free course with homeworks and discussion (the "Virtualization / Concurrency / Persistence" arc).
  *Feeds this galaxy:* the process-API grounding (fork/exec/wait, PID, the parent/child tree) under every reaping decision. (Listed as a textbook below too — it serves both roles.)

## 2. Free textbooks

- **OSTEP — "Operating Systems: Three Easy Pieces"** (Arpaci-Dusseau, UW-Madison) — https://pages.cs.wisc.edu/~remzi/OSTEP/  *(redirect target of ostep.org)*
  *Confirmed free:* the homepage states **"This book is and will always be free in PDF form."** Per-chapter PDFs, no paywall.
  *Teaches / feeds this galaxy:* **Ch.4 Processes**, **Ch.5 Process API**, **Ch.6 Direct Execution** are the canonical free grounding for the PID/fork/wait/parent-child model the reaper depends on; **Ch.7-10 (CPU scheduling)** and **Ch.26-33 (concurrency, locks, condition variables, semaphores, concurrency bugs)** ground the watchdog/heartbeat-tuning and lock-discipline side (atomic single-instance guards, race-free PID files). The exact Process-API fact-page is quoted in [[fleet-hygiene-foundations]]; this atlas points at the **book index** so future deepening (scheduling, concurrency) has a home.

- **Brendan Gregg — "Systems Performance"** book page + free companion site — https://www.brendangregg.com/sysperfbook.html
  *Confirmed free:* the book itself is a purchase, but the surrounding **brendangregg.com** site is a large free corpus — blog/articles, the **USE Method** (Utilization/Saturation/Errors) methodology, observability-tool docs (perf, eBPF/bpftrace, DTrace), flame-graph/heat-map visualizations, and recorded talks — all freely readable.
  *Feeds this galaxy:* the *measurement* discipline golf's pressure/RSS monitors need — how to actually observe a leaking/orphaned/saturated process tree (the USE method is the textbook way to find the "16GB tmp-orphan leak" class of hazard) rather than guess. The owner-gated RSS/pressure thresholds in the sibling entries are tunings; this site is where you learn to *measure* them. (Note: the older `/systemsperformance.html` path 404s — use `/sysperfbook.html`.)

## 3. Lecture-video channels & playlists

- **MIT 6.824 Distributed Systems (Spring 2020) — full lecture videos** (Robert Morris)
  Channel: https://www.youtube.com/@6.824  ·  Playlist: https://www.youtube.com/playlist?list=PLrw6a1wE39_tb2fErI4-WkMbsvGQk9_UB
  *Teaches:* the same 6.824 syllabus as section 1, but as ~20 recorded lectures (Introduction, RPC & Threads, GFS, **Fault Tolerance: Raft (1) & (2)**, ZooKeeper, replication/consistency, Spanner, etc.).
  *Feeds this galaxy:* the video complement to the MIT-hosted text notes/papers — watch the fault-tolerance + Raft lectures to internalize *why* a confirm-before-reap (accuracy-over-speed) failure detector is the right call, and how single-leadership/quorum maps onto golf-owns-the-reaper.
  *Verification honesty:* the dedicated **@6.824 channel page title resolved** under WebFetch and existence is corroborated by WebSearch (indexed on Class Central; the course is widely noted as fully open). The video *list itself* is JS-rendered, so a plain fetch sees only the channel chrome — the link is real and free, but a browser (not WebFetch) is needed to enumerate the videos.

## 4. Official docs & standards

- **The Linux man-pages project** (curated by Michael Kerrisk) — https://man7.org/linux/man-pages/
  *Confirmed free:* free HTML renderings of the Linux man-pages, browsable by section.
  *Teaches / feeds this galaxy:* the **authoritative, primary** reference for every reaping/signalling primitive — section 2 system calls `wait(2)`/`kill(2)`/`fork(2)` (zombie/reaping/reparenting + group-kill + permission semantics) and section 7 overviews `signal(7)` (which signals can't be caught — confirmed: "SIGKILL and SIGSTOP cannot be caught, blocked, or ignored")/`credentials(7)`/`daemon(7)`. This is the canonical place to *re-check* a man-page fact when the OS updates; the sibling entries cite specific pages, this atlas points at the **index** so you always land on the current revision.

- **POSIX / The Single UNIX Specification — Open Group Base Specifications, Issue 7** — https://pubs.opengroup.org/onlinepubs/9699919799/
  *Confirmed free:* freely readable online (IEEE Std 1003.1-2017, 2018 edition); the **System Interfaces** volume documents the portable contract for the same functions — e.g. the free `wait()`/`waitpid()` page at https://pubs.opengroup.org/onlinepubs/9699919799/functions/wait.html ("wait, waitpid - wait for a child process to stop or terminate").
  *Feeds this galaxy:* the **portable standard** behind the Linux man pages — when a fact must hold across platforms (the fleet may grow beyond one OS), POSIX is the cross-platform source of truth for process control + signal semantics, distinct from the Linux-specific man7.org details.

## 5. Keep-fresh cadence

The point of an atlas is that it stays *current*. Suggested golf-owned cadence:

- **Per use (cheap, always):** when an entry in [[fleet-hygiene-foundations]] or [[fleet-hygiene-applied-practice]] is touched, re-open the matching **root** here (man-pages index, OSTEP book index, POSIX root) rather than trusting a cached quote — man pages and standards get revised.
- **Quarterly (link-rot sweep):** WebFetch each URL in `## Sources` below; any that 404 or move gets fixed-or-dropped (R12 — a dead link is removed, never guessed). This is exactly how `/systemsperformance.html` -> `/sysperfbook.html` was caught this pass.
- **On a new OS/standards release:** when a Linux man-pages release or a new POSIX issue ships, re-confirm the section-2/section-7 pages the siblings cite still say what they say; promote any changed semantics into the relevant sibling, not into this atlas (this page is the *directory*, the siblings are the *content*).
- **On course refresh:** MIT re-runs 6.5840 yearly — check the homepage for a newer schedule/notes/labs set; the Spring-2020 video playlist is the stable video anchor even as the text course advances.
- **Routing reminder:** long reads here (OSTEP chapters, full lectures) are Ollama/offload-friendly summarization candidates — reserve Claude for the synthesis that lands in the sibling entries.

## Sources (distinct URLs WebFetch-confirmed live + free during this create pass, 2026-06-10)

> Each URL below was fetched and confirmed live + free before inclusion. The one dead candidate (brendangregg.com/systemsperformance.html, HTTP 404) was DROPPED and replaced by its live equivalent. The MIT 6.824 video channel/playlist is included with an inline JS-rendered caveat (title resolved + WebSearch-corroborated), not asserted as fetch-enumerated.

1. OSTEP free textbook + self-study OS course homepage (ostep.org redirect target) — https://pages.cs.wisc.edu/~remzi/OSTEP/  *(free college textbook + course)*
2. MIT 6.5840 / 6.824 Distributed Systems — course homepage — https://pdos.csail.mit.edu/6.824/  *(free college course)*
3. MIT 6.824 — course schedule (notes + paper PDFs) — https://pdos.csail.mit.edu/6.824/schedule.html  *(free college course)*
4. MIT 6.824 Distributed Systems — YouTube channel — https://www.youtube.com/@6.824  *(free lecture videos; list is JS-rendered)*
5. MIT 6.824 Distributed Systems (Spring 2020) — YouTube playlist — https://www.youtube.com/playlist?list=PLrw6a1wE39_tb2fErI4-WkMbsvGQk9_UB  *(free lecture videos; list is JS-rendered)*
6. Linux man-pages project — index — https://man7.org/linux/man-pages/  *(primary authoritative doc root)*
7. Linux signal(7) man page — https://man7.org/linux/man-pages/man7/signal.7.html  *(primary authoritative doc)*
8. Brendan Gregg — Systems Performance book + free site (USE method, eBPF/perf tools, talks) — https://www.brendangregg.com/sysperfbook.html  *(free engineering reference site)*
9. POSIX / Open Group Base Specifications Issue 7 — root — https://pubs.opengroup.org/onlinepubs/9699919799/  *(free standard)*
10. POSIX wait()/waitpid() function page — https://pubs.opengroup.org/onlinepubs/9699919799/functions/wait.html  *(free standard)*
