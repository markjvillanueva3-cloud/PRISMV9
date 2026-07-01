---
title: Lathe / Turning Resource Atlas (local trove + curated YouTube + reputable online — one easy-access index)
galaxy: lathe
owner_slot: whiskey
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas (2026-06-10)"
verification_method: "LOCAL trove: every subdir pointer below was pre-verified on disk 2026-06-10 (CRITICAL-RESOURCE-ROOTS.json roots; pathway = root + subdir + the root's own index, never a re-count or re-OCR). YOUTUBE/ONLINE: every channel/site listed was live-fetched on 2026-06-10 and confirmed to resolve (HTTP 200 with the channel/site name present); anything that 404'd or could not be confirmed on-topic was DROPPED after one retry (e.g. Mazak @MazakCorp 404 -> corrected to @MazakOfficial; Okuma YouTube @OkumaAmerica/@OkumaCorp could not be confirmed -> dropped). Listing a source verifies the LINK is live + on-topic only; it does NOT promote any numeric/physics claim on that source — cutting constants stay owner-gated in mcp-server/src/physics/constants.ts."
tags: [lathe, turning, resource-atlas, local-trove, youtube, online, okuma, multus, mill-turn, easy-access-index, verified-partial]
---

# Lathe / Turning Resource Atlas

The single **easy-access index** for the lathe galaxy: jump straight from here to the local on-disk trove, the curated YouTube channels, and the reputable online references — fused into one map so a chat in this galaxy never has to re-discover where the resources live.

**What this is vs. the siblings:** this atlas is the *navigation hub* (where everything is). For the theory read [[lathe-foundations]]; for free living courses/textbooks/standards read [[lathe-source-atlas]]; for shop-floor gotchas read [[lathe-applied-practice]]; for world-leader strategy read [[lathe-advanced-techniques]]. The master local map across all galaxies is [[primary-domain-resource-map]].

**Honesty boundary (R12):** a local pointer being listed means the directory was verified present on disk 2026-06-10; an online/YouTube link being listed means it resolved live + on-topic on 2026-06-10. Neither verifies any *number* — derived cutting values (RPM, SFM/Vc, IPR, DOC, Taylor C/n, kc1.1) stay owner-gated to whiskey + `mcp-server/src/physics/constants.ts`, never sourced from a video or a webpage.

---

## Local trove (CAD / CAM / posts / programs / catalogs)

Pre-verified on disk 2026-06-10. Pathway = **root + subdir + the root's own index** (per `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json`). The parenthesized number is the verified file count for that subdir at census time — do NOT re-count; read the root index for deep enumeration.

### JM DIE root — `H:/PRISM/JM DIE/` (the shop's own turning archive)
- **`JM DIE/CNC LATHE/`** (134485) — the primary in-house CNC lathe program + setup archive. The deepest single local turning trove on the box.
- **`JM DIE/OKUMA/`** (6276) — Okuma-controller turning programs + reference material (OSP control).
- **`JM DIE/OKUMA MULTUS PROGRAMS/`** — Okuma MULTUS multi-tasking (mill-turn) programs as run on the shop floor.
- **`JM DIE/CNC OKUMA MULTUS/`** (18) — curated Okuma MULTUS mill-turn job set.
- **`JM DIE/LATHE/`** — general lathe job/setup folder (manual + CNC turning work).

### resources root — `H:/PRISM/resources/` (platform reference + sample-program corpus)
- **`resources/MULTUS PROGRAMS/`** (82) — Okuma MULTUS multi-tasking sample programs (reference + training).
- **`resources/OKUMA MULTUS PDFS/`** — Okuma MULTUS reference PDFs (control/operation/programming docs for the multi-tasking platform).

### Root indexes (start here, never re-OCR / never re-count)
- **`H:/PRISM/resources/RESOURCES-INDEX.md`** — the resources-root master index; the canonical entry point for everything under `resources/` (CAM seats, posts, machine-sim models, catalogs, macros, MIT courses).
- **Docustrata drawings** — `H:/PRISM/Docustrata/manifest.json` + `H:/PRISM/Docustrata/.index/` — search the manifest + `.index/` for any turning drawing; **never re-OCR Docustrata** (operator directive, CRITICAL-RESOURCE-ROOTS.json).

> Tooling/insert + workholding catalogs (the cutting-data *source* corpus) live under `resources/MANUFACTURER_CATALOGS/` and `resources/TOOL_HOLDER_CAD_FILES/` — link the catalog, never inline the number (see Owner-gate below).

---

## Curated YouTube (link-verified 2026-06-10)

Free, official-manufacturer + reputable-educator channels carrying turning / lathe + mill-turn content. Each resolved HTTP 200 with its channel name present on 2026-06-10.

- **Mazak Official** — https://www.youtube.com/@MazakOfficial — Yamazaki Mazak (machine-tool builder) official channel; turning + Multi-Tasking (mill-turn) machine demos, Integrex/QuickTurn content, applications. *(Listed after correcting the dead `@MazakCorp` handle, which 404'd.)*
- **Haas Automation, Inc.** — https://www.youtube.com/@haasautomation — official Haas channel; ST-series lathe operation, control how-tos, and turning tips/tutorials (broad free educational library).
- **Sandvik Coromant** — https://www.youtube.com/@SandvikCoromant — official cutting-tool maker channel; turning method, parting/grooving, threading, and insert-application technique videos (qualitative method — numbers stay owner-gated).
- **TITANS of CNC MACHINING** — https://www.youtube.com/@TITANSofCNC — large free educator channel; turning + mill-turn project builds and machining academy content.
- **NYC CNC (Saunders Machine Works)** — https://www.youtube.com/@nyccnc — reputable educator channel; lathe operation, workholding, and shop-practice tutorials.

> **Dropped (R12, could not confirm):** an Okuma machine-tool YouTube channel — `@OkumaAmerica` rendered ambiguous (footer-only) and `@OkumaCorp` returned 404 on 2026-06-10, so no Okuma YouTube link is asserted here. For Okuma turning reference, use the **local** `JM DIE/OKUMA*` + `resources/OKUMA MULTUS PDFS/` trove above, which is richer and on-disk.

---

## Reputable online (non-YouTube, link-verified 2026-06-10)

- **Machining Doctor** — https://www.machiningdoctor.com/ — free machining technical hub: speeds/feeds (SpeeDoctor), 700+ material machinability + cutting-condition data, threading/thread charts, G-code reference, and a machining glossary. Confirmed live + on-topic 2026-06-10. *(Reference + calculators are free; the published numbers are advisory — do NOT promote them; the owner-gated constants stay in `constants.ts`.)*

> **For the deeper free living curriculum (courses / textbooks / standards), do NOT duplicate it here** — it is link-verified and maintained in [[lathe-source-atlas]] (NPTEL "Manufacturing Processes II" full turning course, open textbooks, ISO/standards landing pages). This atlas points there rather than re-listing, to keep one source of truth per the WIKI_SCHEMA dedup rule.

> **WebFetch limitation note (R12 transparency):** Sandvik Coromant's `knowledge/` *article* pages and `okuma.com` render as JS-only navigation shells / return 403 to WebFetch (bot-block), so their on-page article *text* could not be link-confirmed here — the same behavior [[lathe-advanced-techniques]] documents. The Sandvik **YouTube** channel and Machining Doctor were confirmed and are listed; the Sandvik knowledge site is reachable in a browser but is intentionally NOT asserted as verified above.

---

## Cross-links (the lathe wiki layer)

- [[lathe-foundations]] — turning theory (read first; promotes verified facts/formula-structure).
- [[lathe-source-atlas]] — free + legal LIVING courses / textbooks / gov-data / standards (link-verified).
- [[lathe-applied-practice]] — shop-floor gotchas + failure modes.
- [[lathe-advanced-techniques]] — world-leader-depth strategy layer (CSS/G96, mill-turn, hard-turning, threading infeed — qualitative only).
- [[primary-domain-resource-map]] — the master cross-galaxy local resource map.

---

## Keep-fresh cadence

- **Quarterly (or on operator request):** re-WebFetch every YouTube + online link; drop any that 404 after one retry, and re-confirm corrected handles. Re-attempt the dropped Okuma YouTube channel — if a confirmable official Okuma turning channel resolves, add it.
- **On any `resources/` or `JM DIE/` re-census:** re-verify the local subdir pointers + counts against `RESOURCES-INDEX.md` (do not hand-edit counts — read the regenerated index).
- **Never:** re-OCR Docustrata, re-count the trove by hand, or copy a published cutting number out of a catalog/video into this file.

---

## Owner-gate (NOT promoted)

This atlas surfaces *where to find* turning resources; it deliberately promotes **zero** numeric cutting/physics constants. Specifically NOT promoted from any local catalog, YouTube video, or online site:
- spindle RPM, surface speed (SFM / Vc), feed (IPR / mm-rev), depth-of-cut
- Taylor tool-life C / n, Kienzle kc1.1 / mc, specific cutting force
- coolant pressure (psi), hardness, tolerance, or pass-count numbers

Any such value is **owner-gated to whiskey** and lives only in `mcp-server/src/physics/constants.ts` (canonical) — sourced from the manufacturer catalog under `resources/MANUFACTURER_CATALOGS/`, never transcribed from the web. Link the catalog; the number stays in `constants.ts`.

---

## Sources

**Local (verified on disk 2026-06-10):**
- `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` (roots + pathway rule)
- `H:/PRISM/resources/RESOURCES-INDEX.md` (resources-root master index)
- `H:/PRISM/JM DIE/{CNC LATHE, OKUMA, OKUMA MULTUS PROGRAMS, CNC OKUMA MULTUS, LATHE}/`
- `H:/PRISM/resources/{MULTUS PROGRAMS, OKUMA MULTUS PDFS}/`
- `H:/PRISM/Docustrata/manifest.json` + `.index/` (drawings; never re-OCR)

**Online / YouTube (live-WebFetched + confirmed resolving 2026-06-10):**
- https://www.youtube.com/@MazakOfficial
- https://www.youtube.com/@haasautomation
- https://www.youtube.com/@SandvikCoromant
- https://www.youtube.com/@TITANSofCNC
- https://www.youtube.com/@nyccnc
- https://www.machiningdoctor.com/

**Dropped after retry (R12, NOT listed as live):** `https://www.youtube.com/@MazakCorp` (404 — corrected to `@MazakOfficial`); `https://www.youtube.com/@OkumaAmerica` (unconfirmable) and `https://www.youtube.com/@OkumaCorp` (404) — no Okuma YouTube link asserted.
