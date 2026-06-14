---
title: Post-Processor Resource Atlas — one easy-access index fusing the local on-disk trove with curated YouTube + reputable online for CNC G-code / post-processing
galaxy: post-processor
owner_slot: echo
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas (2026-06-10)"
verification_method: "LOCAL trove: each subdir pointer below was confirmed present on disk 2026-06-10 (ls -d on H:/PRISM/resources/* and H:/PRISM/JM DIE/* — every path resolved) and is reproduced verbatim from the pre-verified operator list; counts are NOT re-derived (pathway = root + subdir + its own index per CRITICAL-RESOURCE-ROOTS.json). ONLINE + YOUTUBE: every URL was individually WebFetched and/or WebSearched this pass and listed ONLY if it resolved (HTTP 200, on-topic, official/reputable). Sources that 404'd, returned 403 (WAF), or could not be confirmed were DROPPED — see ## Maintenance for the dropped set. YouTube channel/playlist pages render as truncated SPA shells but a non-404 + correct title metadata = live; that liveness rule matches the sibling source-atlas. No physics/numeric cutting constant is promoted — link-only (R12 honesty; cutting numbers stay owner-gated to echo + constants.ts)."
tags: [post-processor, g-code, rs-274, iso-6983, resource-atlas, local-trove, youtube, cimco, fusion-post, haas, heidenhain, fanuc, linuxcnc, winmax, macro-programs, controllers, easy-access-index]
---

# Post-Processor Resource Atlas

A single **easy-access index** for the **post-processor** galaxy (CNC G-code / RS-274 / ISO 6983
controller post-processing — CAM toolpath → machine-specific NC code). It **fuses the local on-disk
trove** (the verified resource roots) with **curated YouTube + reputable online** so a chat in this
galaxy jumps straight to the post processor, controller doc, macro program, or training video it needs
without re-searching.

**How this differs from the sibling layers** — this atlas is the *jump table*: where the actual files,
videos, and live homepages are. The theory/method spine is [[post-processor-foundations]]; the
free-courses/open-textbook living directory is [[post-processor-source-atlas]]; the in-the-field
gotchas are [[post-processor-applied-practice]]; the deeper customization patterns are
[[post-processor-advanced-techniques]]. The master local file-system map across all galaxies is
[[primary-domain-resource-map]].

**R12 safety note:** this atlas is a **link directory only**. It promotes **no** numeric speed/feed/cutting
constant — the catalog or source is linked, and any cutting number stays owner-gated to **echo** and
`mcp-server/src/physics/constants.ts`. See `## Owner-gate (NOT promoted)`.

---

## Local trove (on-disk — verified 2026-06-10)

> Pathway convention: **root + subdir + its own index** (per
> `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json`). Counts in parentheses are
> the operator-supplied pre-verified figures — **do not re-count or fabricate**; open the subdir for the
> live list. Start at the root index:
> **`H:/PRISM/resources/RESOURCES-INDEX.md`** (the resources-root master index).

### Post processors (CAM → controller G-code emitters)
- `H:/PRISM/resources/FUSION POSTS/` — Autodesk Fusion / HSM `.cps` post-processor files.
- `H:/PRISM/resources/FUSION BASIC POSTS/` (180) — baseline Fusion `.cps` posts.
- `H:/PRISM/resources/POSTS AND MACHINES/` (3056) — the large multi-vendor post + machine-definition trove
  (the primary corpus of controller/machine posts).
- `H:/PRISM/JM DIE/POST PROCESSORS/` (538) — JM Die shop's working post library.
- `H:/PRISM/JM DIE/PRISM MODIFIED POST PROCESSORS/` (18) — PRISM-tuned posts derived from the JM set.

### Controllers (dialect / control references)
- `H:/PRISM/JM DIE/CONTROLLERS/` (9) — controller reference set for the JM machine fleet.

### Macro / NC programs (controller-side macros + reference programs)
- `H:/PRISM/resources/MACRO PROGRAMS/` (7) — resources-root macro program set.
- `H:/PRISM/JM DIE/MACRO PROGRAMS/` — JM Die macro program set.

### Editor / DNC / NC-utility corpora (CIMCO + WinMax)
- `H:/PRISM/resources/cimco-2026/` (2036) — CIMCO 2026 corpus (editor / DNC / NC-program assets).
- `H:/PRISM/resources/cimco-2025/` (1410) — CIMCO 2025 corpus.
- `H:/PRISM/resources/winmax-docs/` — Hurco WinMax control documentation.

### Drawings / prints (search the index — never re-OCR)
- **Docustrata manifest + index** — `H:/PRISM/Docustrata/manifest.json` + `H:/PRISM/Docustrata/.index/`.
  Search the manifest + `.index/` for drawings that drive a post (part geometry → setup → NC); **never
  re-OCR Docustrata** (per CRITICAL-RESOURCE-ROOTS.json).

---

## Curated YouTube (WebFetch/WebSearch-verified 2026-06-10)

> Each channel/playlist below resolved live this pass (HTTP 200, correct title metadata) and is official
> or reputable + free. Dead/unverifiable handles were dropped (see `## Maintenance`).

- **CIMCO (official channel)** — https://www.youtube.com/channel/UC84pjsB7bS7sbQUTcAoeCrw — the CNC-editor /
  DNC / post-processor / NC-optimization software maker's own channel; directly relevant to CIMCO Edit
  backplot, reverse-post, and DNC workflows used across the `cimco-2025/2026` local corpora.
- **CIMCO Edit playlist — "CIMCO Edit : The best of CNC program editor"** —
  https://www.youtube.com/playlist?list=PL-3NR9j0w4zysrfMeoGELOaSJw7wbAPZD — focused walkthroughs of the
  CIMCO Edit editor (the editor-of-choice for hand-editing posted NC).
- **Autodesk Fusion playlist — "Fusion 360 & Post Processors"** —
  https://www.youtube.com/playlist?list=PL9tn9rGywKUUbvitfadQAc92tbMN3jaRM — official Autodesk series on
  posting CAM toolpaths to controller G-code from Fusion (pairs with the local `FUSION POSTS` /
  `FUSION BASIC POSTS` `.cps` trove).
- **Haas Automation (official channel)** — https://www.youtube.com/user/haasautomation — official Haas CNC
  channel; Tip-of-the-Day + control/operation videos for the Haas dialect emitted by many posts in
  `POSTS AND MACHINES`.
- **HEIDENHAIN — "HeidenhainTV" (official channel)** — https://www.youtube.com/heidenhaintv — official
  HEIDENHAIN channel covering TNC CNC controls (TNC7 / iTNC 530); the conversational/Klartext dialect a
  Heidenhain post targets.
- **FANUC America — CNC (@FANUCFA, official)** — https://www.youtube.com/@FANUCFA — FANUC's official CNC
  channel; the Fanuc control family is the most common ISO-6983 dialect a generic post emits.

---

## Reputable online (verified 2026-06-10)

- **Autodesk — CAM Post Processor Training Guide (PDF)** —
  https://cam.autodesk.com/posts/posts/guides/Post%20Processor%20Training%20Guide.pdf — the canonical
  Autodesk guide for writing/editing `.cps` posts: the JavaScript model, the `onOpen` / `onSection` /
  `onLinear` callback functions, etc. Resolves live (8.2 MB PDF). This is the single richest
  customization reference for the local `FUSION POSTS` corpus.
- **CIMCO — CIMCO Edit product page** — https://www.cimco.com/software/cimco-edit/ — official feature
  reference for the CNC editor / backplot / DNC / **reverse-post** system (read any machine-specific NC
  program back). Resolves live.
- **CIMCO — company / software hub** — https://www.cimco.com/ — the vendor's living software portal
  (Edit, DNC-Max, NC-optimization, post processors); the upstream of the `cimco-2025/2026` corpora.
  Resolves live.
- **LinuxCNC — G-code overview (official docs)** — https://linuxcnc.org/docs/html/gcode/overview.html —
  the authoritative open RS-274/NGC language reference (line/word structure, G/M/o-codes, modal groups,
  parameters, expressions). The open-source ground truth for what a post *emits*. (LinuxCNC has **no**
  official YouTube channel — its canonical material is documentation, so it is listed here, not above.)

---

## Cross-links (sibling wiki layers)

- [[post-processor-foundations]] — domain theory / method / standards spine (RS-274, ISO 6983).
- [[post-processor-source-atlas]] — free courses + open textbooks + living homepages directory.
- [[post-processor-applied-practice]] — field gotchas, dialect quirks, debugging patterns.
- [[post-processor-advanced-techniques]] — deeper post customization + callback patterns.
- [[primary-domain-resource-map]] — the master local file-system map across all galaxies.

---

## Keep-fresh cadence

- **Re-verify online + YouTube** every ~60 days, or whenever a chat hits a dead link: re-WebFetch each URL;
  drop any that 404 / 403 / redirect-loop and search the official site for the moved target (R12 — never
  leave a fabricated or stale URL listed).
- **Re-verify local subdirs** whenever a resource-root reorg lands: `ls -d` each path against this list;
  if a subdir moved, update the pointer (do **not** re-count — open it for the live figure).
- **Promotion path:** a newly discovered high-value post-processor source → add here (link-verified) → if
  it becomes a load-bearing method citation, promote the *fact* to [[post-processor-foundations]] (not the
  raw link).

---

## Owner-gate (NOT promoted)

This atlas deliberately promotes **no** numeric cutting/speed/feed/post-parameter constant. Vendor posts,
controller docs, CIMCO/Fusion corpora, and training videos may *contain* such numbers, but those values
remain **owner-gated to the `echo` slot** and `mcp-server/src/physics/constants.ts` — the canonical home
for any physics/material constant. Consumers link the catalog/source; they do not inline the number
(R12 + §SAFETY RAILS: never inline physics constants).

## Sources

LOCAL (on-disk, confirmed present 2026-06-10 via `ls -d`):
- `H:/PRISM/resources/RESOURCES-INDEX.md` (resources-root master index)
- `H:/PRISM/resources/{FUSION POSTS, FUSION BASIC POSTS, POSTS AND MACHINES, MACRO PROGRAMS, cimco-2026, cimco-2025, winmax-docs}/`
- `H:/PRISM/JM DIE/{POST PROCESSORS, PRISM MODIFIED POST PROCESSORS, CONTROLLERS, MACRO PROGRAMS}/`
- `H:/PRISM/Docustrata/manifest.json` + `H:/PRISM/Docustrata/.index/` (drawings — search, never re-OCR)
- Pathway convention: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json`

ONLINE + YOUTUBE (WebFetch / WebSearch-verified 2026-06-10, listed only if resolved):
- https://www.youtube.com/channel/UC84pjsB7bS7sbQUTcAoeCrw — CIMCO (official channel)
- https://www.youtube.com/playlist?list=PL-3NR9j0w4zysrfMeoGELOaSJw7wbAPZD — CIMCO Edit playlist
- https://www.youtube.com/playlist?list=PL9tn9rGywKUUbvitfadQAc92tbMN3jaRM — Autodesk "Fusion 360 & Post Processors"
- https://www.youtube.com/user/haasautomation — Haas Automation (official)
- https://www.youtube.com/heidenhaintv — HEIDENHAIN / HeidenhainTV (official)
- https://www.youtube.com/@FANUCFA — FANUC America CNC (official)
- https://cam.autodesk.com/posts/posts/guides/Post%20Processor%20Training%20Guide.pdf — Autodesk CAM Post Processor Training Guide (PDF)
- https://www.cimco.com/software/cimco-edit/ — CIMCO Edit product page
- https://www.cimco.com/ — CIMCO software hub
- https://linuxcnc.org/docs/html/gcode/overview.html — LinuxCNC G-code overview (official docs)

## Maintenance

Dropped this pass (R12 — failed to resolve / unverifiable, NOT listed above):
- `https://www.autodesk.com/products/fusion-360/blog/machining-fundamentals-introduction-to-post-processors/`
  — HTTP 403 (Autodesk WAF blocked WebFetch). Topic is covered by the verified CAM Post Processor Training
  Guide PDF instead.
- `https://www.haascnc.com/video.html` — HTTP 403 (WAF). The verified Haas YouTube channel covers the same
  video content.
- **LinuxCNC YouTube channel** — no official channel exists (community/third-party only per WebSearch);
  the official LinuxCNC G-code *docs* are listed under Reputable online instead.

Re-verify cadence: ~60 days or on first dead-link hit. When re-verifying YouTube, treat a non-404 page
with correct title metadata as live (YouTube SPA bodies truncate under WebFetch — same rule the sibling
source-atlas uses).
