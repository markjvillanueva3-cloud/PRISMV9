---
title: CAM Resource Atlas
galaxy: cam
owner_slot: kilo
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas (2026-06-10)"
verification_method: "Local subdirs stat-confirmed on disk 2026-06-10 (root+subdir per CRITICAL-RESOURCE-ROOTS.json); every YouTube channel + online source WebFetch/WebSearch-confirmed to resolve, dead-handle guesses (@hyperMILL, @SolidCAM) dropped/corrected, 403-bot-blocked manufacturer product pages excluded per R12."
tags: [cam, resource-atlas, toolpath, post-processor, mastercam, hypermill, fusion, solidcam, cimco, youtube, primary-domain]
---

# CAM Resource Atlas

Single easy-access index for the **CAM galaxy** (toolpath strategy, toolpath generation, post-processing, CAD/CAM file handling, NC verification). A chat in this galaxy jumps straight from here to the resource it needs — fusing the **local on-disk trove**, **curated free YouTube**, and **reputable free online** sources.

> **R12 — pathway = root + subdir + index** per `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json`. The three critical roots are `H:/PRISM/resources`, `H:/PRISM/JM DIE`, `H:/PRISM/Docustrata`. Never re-OCR Docustrata — search its `manifest.json` + `.index/`.

---

## Local trove (CAD / CAM / posts / programs / catalogs)

All paths below were **stat-confirmed on disk 2026-06-10**. Counts in parentheses are the file counts given at verification time (snapshot — read the dir for live counts, do not trust a cached number).

### Root index (start here)
- **`H:/PRISM/resources/RESOURCES-INDEX.md`** — the master local resource index for every domain. Open this first when the subdir you want is not listed below.
- **[[primary-domain-resource-map]]** (`knowledge/wiki/architecture/primary-domain-resource-map.md`) — the master per-galaxy local map this atlas is the CAM leaf of.

### CAM software corpora (training + samples + posts)
| Subdir | Path | Notes |
|--------|------|-------|
| OPEN MIND (54,100) | `H:/PRISM/resources/OPEN MIND/` | hyperMILL E-Learning + training corpus (largest CAM trove) |
| MasterCam (29,280) | `H:/PRISM/resources/MasterCam/` | Mastercam X8+ training, samples, posts |
| HYPERMILL (18,846) | `H:/PRISM/resources/HYPERMILL/` | hyperMILL 31/33 program + post corpus |
| SOLIDWORKS (14,429) | `H:/PRISM/resources/SOLIDWORKS/` | SOLIDWORKS CAD models feeding CAM |
| HSMWorks 2027 (889) | `H:/PRISM/resources/HSMWorks 2027/` | HSMWorks (Inventor/SOLIDWORKS-embedded CAM) |
| FUSION360 (275) | `H:/PRISM/resources/FUSION360/` | Fusion CAM samples + setups |
| SOLIDCAM | `H:/PRISM/resources/SOLIDCAM/` | SolidCAM / iMachining corpus |

### NC verification / post tooling
| Subdir | Path | Notes |
|--------|------|-------|
| cimco-2026 (2,036) | `H:/PRISM/resources/cimco-2026/` | CIMCO Edit 2026 — NC editing, backplot, solid sim |
| cimco-2025 (1,410) | `H:/PRISM/resources/cimco-2025/` | CIMCO Edit 2025 (prior release) |

### JM Die live CAD/CAM programs (the test shop)
| Subdir | Path | Notes |
|--------|------|-------|
| FUSION CAD AND CAM FILES (9,746) | `H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/` | Live Fusion CAD+CAM job files (canonical CAM order flow source) |
| QUEUE (354) | `H:/PRISM/JM DIE/QUEUE/` | Active program queue |

### Drawings (never re-OCR)
- **`H:/PRISM/Docustrata/manifest.json`** + **`H:/PRISM/Docustrata/.index/`** — pre-OCR'd drawing corpus. Search the manifest + index; never re-run OCR.

---

## Curated YouTube (free — every channel WebFetch/WebSearch-confirmed to resolve)

All five below were confirmed via WebSearch to the **official** channel (canonical handle/ID locked; guessed handles `@hyperMILL` and `@SolidCAM` 404'd and were corrected to the real channel URLs).

| Channel | URL | Domain coverage |
|---------|-----|-----------------|
| Autodesk Fusion | https://www.youtube.com/@adskFusion (ch UCiMwMz3RMbW5mbx0iDcRQ2g) | Fusion CAD/CAM/manufacture — 1000+ videos, beginner→multi-axis |
| Mastercam (official) | https://www.youtube.com/mastercam | Mastercam mill/lathe/multi-axis tips + user stories |
| OPEN MIND / hyperMILL | https://www.youtube.com/user/camopenmind | hyperMILL demos, additive, 5-axis (official OPEN MIND Technologies) |
| SolidCAM & iMachining | https://www.youtube.com/channel/UCYuTedXi8HTmsQIq4TpbZ6w | SolidCAM + iMachining adaptive-roughing technique |
| TITANS of CNC MACHINING | https://www.youtube.com/channel/UCc2lUKVOTXKlQR7Fm7h1JfQ | Free CAD/CAM + CNC training (Mastercam + Fusion programming, 190 countries) |

---

## Reputable online (free — every source WebFetch-confirmed HTTP 200)

Only sources that returned a clean, valid landing page are listed. Manufacturer product/marketing pages that 403-block automated fetch (Autodesk product page, Mastercam free-courses page, OPEN MIND webinar deep-links) are **excluded per R12** — the YouTube channels above carry the equivalent free video content from the same vendors.

| Source | URL | What it offers |
|--------|-----|----------------|
| TITANS of CNC: Academy | https://academy.titansofcnc.com/ | "World's largest free CAD/CAM and CNC training" — Mastercam + Fusion programming courses, 3D models, free account. |
| Autodesk Fusion Help portal | https://help.autodesk.com/view/fusion360/ENU/ | Official Fusion documentation incl. the **Manufacture (CAM)** section — strategies, posts, getting-started. |
| CIMCO Documentation | https://www.cimco.com/support/documentation/ | Official CIMCO Edit / DNC-Max / Machine Simulation docs — NC editing, backplot, solid sim, post guides (Fanuc/Heidenhain/Okuma/Siemens). |

---

## Cross-links (sibling wiki layers)

- **[[cam-foundations]]** — CAM theory (toolpath strategy, engagement, chip-thinning concepts).
- **[[cam-source-atlas]]** — free courses, books, and reference sources for CAM.
- **[[cam-applied-practice]]** — gotchas, failure modes, shop-floor lessons.
- **[[cam-advanced-techniques]]** — advanced/multi-axis + adaptive techniques.
- **[[primary-domain-resource-map]]** — the master local resource map (this atlas is its CAM leaf).

---

## Keep-fresh cadence

- **Local trove:** re-stat the subdirs whenever `RESOURCES-INDEX.md` changes or a new CAM software corpus lands; refresh counts from disk (never hand-edit a cached number).
- **YouTube:** re-confirm channel handles quarterly — vendors rename handles (this pass already caught `@hyperMILL` → `user/camopenmind` and `@SolidCAM` → channel-ID drift). Drop any channel that 404s, retry once first.
- **Online:** re-WebFetch the three confirmed links on the same quarterly pass; if a 403-blocked vendor page later returns clean HTTP 200, it may be promoted in.
- **Owner:** kilo (CAM galaxy) owns content corrections; papa owns the resource-atlas verification pass.

---

## Owner-gate (NOT promoted)

Per R12 + the CAM-galaxy cutting-domain rule: **no numeric cutting constant** (speeds, feeds, chip loads, kc/Kienzle values, engagement-angle limits, tool-life coefficients) is promoted into this atlas. The atlas links to the catalog/source only; the actual numbers stay **owner-gated to kilo** and to `mcp-server/src/physics/constants.ts` (the single canonical store). Any number a chat needs from the vendor corpora above must be resolved through the kilo-owned engines / `prism_calc` / `prism_safety`, not copied here.

---

## Sources

- Local subdirs: stat-confirmed on disk 2026-06-10 — `H:/PRISM/resources/{OPEN MIND, MasterCam, HYPERMILL, SOLIDWORKS, HSMWorks 2027, FUSION360, SOLIDCAM, cimco-2026, cimco-2025}`, `H:/PRISM/JM DIE/{FUSION CAD AND CAM FILES, QUEUE}`, `H:/PRISM/resources/RESOURCES-INDEX.md`, `H:/PRISM/Docustrata/{manifest.json,.index}`.
- [Autodesk Fusion YouTube (@adskFusion)](https://www.youtube.com/@adskFusion) — WebSearch-confirmed official, ch UCiMwMz3RMbW5mbx0iDcRQ2g.
- [Mastercam YouTube (official)](https://www.youtube.com/mastercam) — WebSearch-confirmed official corporate channel.
- [OPEN MIND Technologies / hyperMILL YouTube (camopenmind)](https://www.youtube.com/user/camopenmind) — WebSearch-confirmed official (corrected from 404 @hyperMILL guess).
- [SolidCAM & iMachining YouTube](https://www.youtube.com/channel/UCYuTedXi8HTmsQIq4TpbZ6w) — WebSearch-confirmed official channel ID.
- [TITANS of CNC MACHINING YouTube](https://www.youtube.com/channel/UCc2lUKVOTXKlQR7Fm7h1JfQ) — WebSearch-confirmed official.
- [TITANS of CNC: Academy](https://academy.titansofcnc.com/) — WebFetch HTTP 200, free CAD/CAM+CNC training.
- [Autodesk Fusion Help portal](https://help.autodesk.com/view/fusion360/ENU/) — WebFetch HTTP 200, includes Manufacture (CAM) docs.
- [CIMCO Documentation](https://www.cimco.com/support/documentation/) — WebFetch HTTP 200 (301 from /docs/), NC edit/backplot/sim docs.
