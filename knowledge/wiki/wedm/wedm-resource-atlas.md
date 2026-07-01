---
title: WEDM Resource Atlas — one-jump index to every local trove + curated YouTube + reputable online source for wire/sinker EDM
galaxy: wedm
owner_slot: mike
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas (2026-06-10)"
verification_method: "LOCAL pointers reproduced verbatim from the pre-verified on-disk trove (Glob/ls-confirmed 2026-06-10: JM DIE/WIRE EDM, resources/POSTS AND MACHINES, resources/GENERIC MACHINE MODELS, resources/RESOURCES-INDEX.md, Docustrata/manifest.json + Docustrata/.index all confirmed present — pathway = root + subdir + index per CRITICAL-RESOURCE-ROOTS.json). YOUTUBE: every channel/playlist below was resolved to its canonical channel-ID / playlist-ID URL and WebFetch-confirmed to RESOLVE (page title + org returned, not the HTTP-404 that bare @handle URLs returned) plus a web-search org+EDM-relevance cross-check; dead @handle forms were DROPPED. ONLINE: every manufacturer EDM hub below was WebFetched and confirmed live + on-topic (a GFMS deep /edm.html path 404'd and was dropped in favour of the resolving homepage). NO numeric cutting constant promoted — every entry is a LINK to a catalogue/source; numbers stay owner-gated to mike + constants.ts."
tags: [wedm, edm, wire-edm, sinker-edm, resource-atlas, local-trove, jm-die, posts-and-machines, generic-machine-models, docustrata, youtube, makino, mitsubishi, mc-machinery, sodick, gf-machining-solutions, united-machining, titans-of-cnc, easy-access-index, primary-domain]
---

# WEDM Resource Atlas

The **one-jump easy-access index** for the **wedm** galaxy — wire / sinker electrical-discharge machining. A chat working in this galaxy jumps straight from here to the resource it needs: the **local on-disk trove**, **curated YouTube**, and **reputable online** sources, fused into a single map. This is the *resource locator*; the theory, free courses, and gotchas live in the sibling layers cross-linked below.

**SAFETY-CRITICAL GALAXY.** This atlas is a **link directory only**. It promotes **NO numeric cutting constant** (no spark-gap / offset / kerf / feed / power / pulse-on-off / MRR / Ra values). Every entry points at a *catalogue or source*; the numbers stay **owner-gated to mike** and are sourced ONLY from `mcp-server/src/physics/constants.ts` (and the JM Die FA-S extracted tables) — never from a video or a vendor page. See **## Owner-gate (NOT promoted)** below.

---

## Local trove (CAD / CAM / posts / programs / catalogues)

The pre-verified on-disk corpus. Pathway = **root + subdir + index** (per `CRITICAL-RESOURCE-ROOTS.json` — the 3 critical roots are `H:/PRISM/resources`, `H:/PRISM/JM DIE`, `H:/PRISM/Docustrata`). Start at the root index, then drill to the subdir.

| What | Path | Notes |
|------|------|-------|
| **Root resource index** (start here) | `H:/PRISM/resources/RESOURCES-INDEX.md` | The master index for the `resources` root — read first to orient before drilling. |
| **JM Die WIRE EDM archive** (programs + customer history) | `H:/PRISM/JM DIE/WIRE EDM/` | The 99-customer wire-EDM archive (≈4,058 files; the on-disk subdir count varies as the archive grows). Real shop programs (`.mcx-8` etc.) + per-customer folders (ACME, AGRATI, AIR INDUSTRIES, …). The canonical "how JM actually cuts it" corpus for this domain. |
| **Posts & machine models** | `H:/PRISM/resources/POSTS AND MACHINES/` | Post-processor packages + machine STEP/STP models (Haas VF-2, Hurco VMX, Okuma Genos, Roku-Roku HC-658, Multus B250II, 5-axis post package). Post + kinematics reference for program emission. |
| **Generic machine kinematic models** | `H:/PRISM/resources/GENERIC MACHINE MODELS/` | Generic 3/4/5-axis STEP kinematic templates (table-vs-head axis configs) — the fallback machine geometry when a specific model is absent. |
| **Drawings / OCR corpus** (never re-OCR) | `H:/PRISM/Docustrata/manifest.json` + `H:/PRISM/Docustrata/.index/` | JM business + drawing scans. **Search `manifest.json` + `.index/` — do NOT re-OCR.** Quotes, sales orders, scans, packing slips, customer drawings live here. |

> **Domain studio + skills** that consume this trove (not duplicated here): `/wedm-studio`, `/wedm-program`, `/wedm-jm-die`, `/wedm-cost`, `/wedm-feasibility`, `/wire-edm-studio`. The local catalogue/tool data feeding cutting numbers is mike-owned `.ts` + `constants.ts`, never promoted to this wiki.

---

## Curated YouTube (free, official-manufacturer + reputable-educator)

Every channel/playlist below was WebFetch-resolved to its **canonical channel-ID / playlist-ID URL** and confirmed live (2026-06-10). Bare `@handle` forms 404'd via WebFetch and were dropped — the channel-ID URLs below are the verified-resolving form.

| Channel / playlist | URL (canonical) | Verified focus |
|--------------------|-----------------|----------------|
| **Makino Inc.** (official) | https://www.youtube.com/channel/UCZTJylmE_xhlc_HMKFlpYCw | World-leader EDM OEM — wire + RAM/sinker EDM, Hyper-i control demos, applications. |
| **Makino — Sinker EDM** (official playlist) | https://www.youtube.com/playlist?list=PLmrkaWGWrE7xmdmnppXyLfR1oHICbAztp | Dedicated sinker-EDM playlist (tooling/setup webinars — Erowa/System3R/Hirschmann tooling walk-throughs). |
| **MC Machinery Systems** (Mitsubishi EDM, official N.A. distributor) | https://www.youtube.com/channel/UCsPIS0gqQFjAM7-0KxwDeow | Mitsubishi Electric wire-cut + die-sink EDM (MV/EA series), M800 control, EDM automation cells. |
| **United Machining (USA)** — GF Machining Solutions | https://www.youtube.com/channel/UCCcNHU8WLEs2DnlRv6bcrUQ | GFMS (rebranding to United Machining): wire + die-sinking EDM, milling, laser texturing for mold/die + aerospace/medical. |
| **Sodick Wire EDM Instructor** (official) | https://www.youtube.com/channel/UCRNLMXWAQXSzut5c6lzW5XQ | Sodick wire-EDM training — IntelliQvic / SPW-control programming tutorials (operator-grade instruction). |
| **TITANS of CNC MACHINING** (reputable educator) | https://www.youtube.com/channel/UCc2lUKVOTXKlQR7Fm7h1JfQ | World's-largest free CNC education platform — broad machining (CAD/CAM, multi-axis, grinding, Swiss); **general CNC, not EDM-specific** — use for adjacent shop technique, not as a wire-EDM primary. |

---

## Reputable online (manufacturer EDM technology hubs)

WebFetch-confirmed live + on-topic (2026-06-10). Manufacturer EDM technology / product hubs — the authoritative, free, vendor-maintained reference for machine capability, process method, and tooling (NOT a source for cutting numbers — those stay owner-gated).

| Source | URL | Verified content |
|--------|-----|------------------|
| **MC Machinery — EDM technology** (Mitsubishi) | https://www.mcmachinery.com/technology/edm/ | Wire + sinker EDM landing — MV/EA/SV/SG model lines, M800 control, Maisart AI, automation (EROWA/OPS Ingersoll/6-axis robot). |
| **Makino — Electrical Discharge Machining** | https://www.makino.com/en-us/makino-edm | Makino EDM hub — wire + sinker, Hyper-i control, EDAC/EDAF/EDNC families. |
| **Sodick — Sinker EDM** | https://sodick.com/machines/sinker-edm/ | Sinker-EDM product/technology page — SVC circuit, Arc-less discharge, linear-motor positioning, AD/AG/ALG+/AP series. |
| **GF Machining Solutions / United Machining** | https://www.gfms.com/com/en.html | GFMS (now United Machining) — wire-cut + die-sinking EDM, milling, laser, SYSTEM 3R automation; mold/die + aerospace/medical applications. |

---

## Cross-links (sibling wiki layers)

- [[wedm-foundations]] — process theory: spark-erosion mechanism, dielectric, wire, multi-pass skim, taper method (the domain spine).
- [[wedm-source-atlas]] — curated free + legal LIVING sources: open courseware (NPTEL/MIT OCW), open textbooks, gov data portals, standards bodies. (Holds the NPTEL Advanced-Machining lecture videos; this atlas adds the *manufacturer* channels it does not carry.)
- [[wedm-applied-practice]] — applied gotchas / cited discharge failure modes for real cutting.
- [[wedm-advanced-techniques]] — advanced WEDM technique layer.
- [[primary-domain-resource-map]] — the master local resource map (`knowledge/wiki/architecture/primary-domain-resource-map.md`) all galaxies share.

---

## Keep-fresh cadence

- **Monthly (or on a dead link):** WebFetch each YouTube channel-ID URL + each online hub; a 404/403/redirect → re-resolve via web search to the new canonical URL and update in place (drop only if no live replacement). Manufacturer rebrands move URLs — GFMS → United Machining is the live example; re-resolve, don't delete.
- **On JM archive growth:** the WIRE EDM subdir count drifts as programs are added — never hard-code it; re-Glob and update the "≈" note rather than a fixed number.
- **Never** promote a cutting number from any source listed here; if a video/page states a feed/power/offset, it stays in the owner-gate, routed to mike + `constants.ts`.
- **Source-of-truth for paths:** `CRITICAL-RESOURCE-ROOTS.json` + `RESOURCES-INDEX.md` — if a local path moves, fix it there first, then mirror here.

---

## Owner-gate (NOT promoted)

The following are deliberately **withheld** from this atlas and remain owner-gated to **mike** (sourced ONLY from `mcp-server/src/physics/constants.ts` + JM Die FA-S extracted tables):

- Any numeric **cutting constant** — spark-gap / wire-offset / kerf dimensions, feed/cut speed, power/amperage, pulse-on / pulse-off timing, flushing pressure, MRR magnitudes, recast-layer / white-layer thickness, surface-finish Ra values, E-code / technology-table parameter values.
- Any **machine-specific cutting recipe** read off a manufacturer page or video — those are vendor marketing/example figures, NOT validated PRISM physics; promoting them would violate the R12 single-source rule.
- The JM Die FA-S extracted parameter tables themselves (mike-owned `.ts`).

This file links the *catalogues and sources*; the numbers live behind the gate.

## Sources

Local trove (on-disk, verified present 2026-06-10):
- `H:/PRISM/resources/RESOURCES-INDEX.md`
- `H:/PRISM/JM DIE/WIRE EDM/`
- `H:/PRISM/resources/POSTS AND MACHINES/`
- `H:/PRISM/resources/GENERIC MACHINE MODELS/`
- `H:/PRISM/Docustrata/manifest.json` + `H:/PRISM/Docustrata/.index/`
- `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` (pathway convention)

YouTube (WebFetch-resolved canonical channel/playlist URLs, 2026-06-10):
- Makino Inc. — https://www.youtube.com/channel/UCZTJylmE_xhlc_HMKFlpYCw
- Makino Sinker EDM playlist — https://www.youtube.com/playlist?list=PLmrkaWGWrE7xmdmnppXyLfR1oHICbAztp
- MC Machinery Systems (Mitsubishi EDM) — https://www.youtube.com/channel/UCsPIS0gqQFjAM7-0KxwDeow
- United Machining USA (GF Machining Solutions) — https://www.youtube.com/channel/UCCcNHU8WLEs2DnlRv6bcrUQ
- Sodick Wire EDM Instructor — https://www.youtube.com/channel/UCRNLMXWAQXSzut5c6lzW5XQ
- TITANS of CNC MACHINING — https://www.youtube.com/channel/UCc2lUKVOTXKlQR7Fm7h1JfQ

Online (WebFetch-confirmed live + on-topic, 2026-06-10):
- MC Machinery EDM technology — https://www.mcmachinery.com/technology/edm/
- Makino EDM — https://www.makino.com/en-us/makino-edm
- Sodick Sinker EDM — https://sodick.com/machines/sinker-edm/
- GF Machining Solutions / United Machining — https://www.gfms.com/com/en.html
