---
title: MIT Curriculum Open Source Atlas — the living directory of free/legal open-courseware sources to keep learning from
galaxy: mit-curriculum
owner_slot: lima
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas-meta (2026-06-10)"
verification_method: each listed source WebFetch-confirmed live, free, and legally open on 2026-06-10 against its own page (or, where a JS-rendered homepage returned thin content, against its Wikipedia provenance page). Candidates that returned 403/404 or could not be confirmed after one retry were DROPPED, not guessed. No paywalled or pirate sources. This is the keep-learning directory only; it deliberately does NOT re-derive corpus/catalog/licensing facts (see foundations) or practitioner gotchas (see applied-practice).
tags: [mit-curriculum, opencourseware, ocw, ocw-scholar, oer, open-educational-resources, open-textbooks, openstax, open-textbook-library, merlot, creative-commons, oe-global, living-source, keep-learning, free-courseware]
---

# MIT Curriculum Open Source Atlas

The **living-source directory** for the **mit-curriculum** galaxy (owner: lima): a curated, kept-fresh list of WHERE to keep learning this galaxy's domain — **open courseware as a source corpus** — from reputable **free and legally-open** sources, so the knowledge never goes stagnant. This galaxy IS the MIT-OCW course corpus that feeds the academy galaxy, so the sources below are the *upstream wells* the corpus draws from: free college courseware, open textbooks, OER directories, the licensing infrastructure, and the open-education community that publishes new material.

> **Distinct from its siblings — do NOT duplicate them.**
> - **[`mit-curriculum-foundations.md`](mit-curriculum-foundations.md)** = the synthesized theory: what OCW is, its catalog/department numbering, the GIRs scaffold, and CC BY-NC-SA as the ingestion gate. Read it for *what the corpus is and the license that governs it*.
> - **`mit-curriculum-applied-practice.md`** (sibling, may not yet exist) = practitioner gotchas of harvesting/ingesting courseware.
> - **THIS entry** = the "keep-learning directory": the actual reachable URLs to revisit, organized by source type, each tagged with what it teaches and which part of this galaxy it feeds.

**Honesty note (R12):** every source in §§1-5 was WebFetch-reached on 2026-06-10 and confirmed free + legally open. Sources that could not be confirmed (bot-blocked 403, dead 404, or off-domain) are listed under **## Dropped candidates** with the reason — they are NOT presented as live. A short verified list beats a long fabricated one.

---

## 1. Free college courses / open courseware (the primary wells)

| Source | URL | What it teaches | Feeds (this galaxy) |
|--------|-----|-----------------|---------------------|
| **MIT OpenCourseWare (home)** | https://ocw.mit.edu/ | 2,500+ free MIT undergrad + grad courses; lecture notes, exams, videos; browse by topic / department / level; no registration. | **THE primary source.** The living catalog the whole galaxy harvests — re-browse the "New Courses" carousel + topic collections to catch newly-published manufacturing/Course-2/Course-3 material. |
| **OCW Scholar (self-study collection)** | https://ocw.mit.edu/collections/ocw-scholar/ | Complete, self-paced introductions to essential math/science/engineering/economics subjects, designed for independent learners (classroom instruction + custom online content + multimedia). | The "sequenceable into a lesson out-of-the-box" subset — these are the OCW courses that already carry the full self-study scaffold the academy galaxy wants, so they are the highest-priority harvest. |
| **Open Education Global (OEGlobal)** | https://www.oeglobal.org/ | Nonprofit member network of 970+ open-education institutions worldwide; events (Open Education Week), CCCOER, awards, OEG Connect community. Successor to the OpenCourseWare Consortium. | The "what else is out there" discovery layer — points beyond MIT to other institutions' open courseware so the corpus is not single-source-locked. Watch for new member institutions publishing courseware. |

---

## 2. Free textbooks (open, peer-reviewed)

| Source | URL | What it teaches | Feeds (this galaxy) |
|--------|-----|-----------------|---------------------|
| **OpenStax** | https://openstax.org/ | Free, peer-reviewed, openly-licensed college textbooks across science, math, social science, and business (nonprofit at Rice University). Mostly **CC BY 4.0** (Calculus is CC BY-NC-SA). | Textbook-grade canonical references for the prerequisite math/physics chain (Calculus, Physics, Chemistry) that the foundations GIR scaffold says must precede any Course-2 manufacturing lesson. CC BY here is *more* permissive than OCW's NC license — note the per-title license. |
| **Open Textbook Library (Univ. of Minnesota)** | https://open.umn.edu/opentextbooks/ | 1,800+ openly-licensed, peer-reviewed college textbooks (Open Education Network); download, edit, distribute at no cost; primarily CC BY 4.0. | Breadth supplement to OpenStax — a second curated open-textbook well so a prerequisite subject without an OpenStax title still has a legally-clean text to anchor a lesson on. |
| **Project Gutenberg** | https://www.gutenberg.org/ | 75,000+ free **public-domain** eBooks; no fees, no registration; classic literature, historical + science texts. | The public-domain (zero-license-friction) tier — classic foundational engineering/math/mechanics texts whose copyright has expired. Unlike OCW (NC) and CC-licensed texts, public-domain material has no attribution/NC/SA constraints. |

---

## 3. OER directories (find-the-resource layer)

| Source | URL | What it teaches | Feeds (this galaxy) |
|--------|-----|-----------------|---------------------|
| **MERLOT** | https://www.merlot.org/merlot/ | 110,000+ curated, peer-reviewed online learning resources for higher education (simulations, tutorials, courses); free, international educator community (225,000+ members). | The "is there already an open resource for topic X" search layer — query MERLOT before commissioning new academy content, so the corpus reuses existing OER rather than re-creating it. |
| **Creative Commons — Open Education / OER** | https://creativecommons.org/about/program-areas/education-oer/ | CC's open-education program: how to FIND CC-licensed courses, textbooks, simulations, and recorded lectures; pointers into Openverse and other OER search surfaces. | The discovery + licensing-literacy hub. Because the foundations entry pins CC BY-NC-SA as the ingestion gate, this page is the canonical place to re-verify how to legally find and attribute CC material across the open-education ecosystem. |

---

## 4. Official docs & standards (the licensing infrastructure — keep-current)

The galaxy's load-bearing "standard" is the **license**, not a part standard. Re-verify the license terms here whenever an ingestion-policy question comes up.

| Source | URL | What it teaches | Feeds (this galaxy) |
|--------|-----|-----------------|---------------------|
| **MIT OCW Terms of Use / Privacy** | https://ocw.mit.edu/pages/privacy-and-terms-of-use/ | OCW's binding terms: content is **CC BY-NC-SA 4.0**; attribution + noncommercial + share-alike obligations. *(Confirmed in foundations; re-verify on any policy drift.)* | The hard legal floor for ingesting OCW content. Re-fetch before any new automated harvester or any output that touches a commercial surface. |
| **Creative Commons license deeds** | https://creativecommons.org/share-your-work/cclicenses/ | The six CC licenses ranked most-to-least open (CC BY -> BY-SA -> BY-NC -> BY-NC-SA -> BY-ND -> BY-NC-ND); what each element (BY/NC/SA/ND) permits. *(Confirmed in foundations.)* | The lookup table for classifying ANY source's license before ingestion — tells PRISM whether a given resource may be quoted, adapted, or only linked. |

> See foundations §3 for the full WebFetch-confirmed license analysis; this row is the *where-to-re-check* pointer, not a re-derivation.

---

## 5. Provenance / encyclopedic cross-check (sanity layer)

| Source | URL | What it teaches | Feeds (this galaxy) |
|--------|-----|-----------------|---------------------|
| **Wikipedia: OpenStax** | https://en.wikipedia.org/wiki/OpenStax | OpenStax provenance: Rice University nonprofit, CC BY licensing, $2.9B saved, peer-review + public errata process. | Independent confirmation of an open-textbook source's license + governance before the corpus relies on it (used here because the OpenStax homepage is JS-rendered and returned thin content to WebFetch). |

---

## Keep-fresh cadence

This atlas is a *living* directory — open-courseware catalogs grow continuously, so revisit on a cadence rather than treating any snapshot as final:

- **Monthly (lima):** re-browse the **OCW home** "New Courses" carousel + topic collections (https://ocw.mit.edu/) for newly-published Course-2 (Mechanical) / Course-3 (Materials) / Course-18 (Math) material; add new high-value courses to the harvest queue.
- **Quarterly (lima):** re-check **OCW Scholar** for added self-study courses and scan **OEGlobal** for new member institutions publishing open courseware (single-source-lock guard).
- **On any ingestion-policy question (R12-critical):** re-fetch the **OCW Terms of Use** + **CC license deeds** before relying on a remembered license term — licenses and OCW policy can drift.
- **Per new source (R12 gate):** before adding ANY source to this atlas, WebFetch it, confirm it is free + legally open, and tag its exact license. If a fetch 403s/404s, retry once then DROP it — do not guess a URL or course number. Record drops in the section below so future passes do not waste a fetch re-confirming a known-blocked source.
- **Bot-block note:** some OER sites (e.g. OER Commons) actively 403 automated fetchers. A 403 here means "unconfirmable by this tool," NOT "dead" — a human browser may reach it. Such sources stay in *Dropped candidates* until reachable by the verification method, rather than being listed as live.

## Dropped candidates (not confirmed live — do NOT cite as sources)

Verified-unreachable or off-domain on 2026-06-10; listed so future passes know the reason:

- **OER Commons** (`oercommons.org`) — HTTP **403 Forbidden** on two attempts (bot block). A real, reputable free OER library, but **not WebFetch-confirmable**, so dropped per R12. Re-evaluate from a browser or an authenticated fetch path.
- **MIT OCW YouTube channel** (`youtube.com/c/mitocw`) — content **truncated/un-renderable** by WebFetch (YouTube is JS-heavy); could not confirm it is the official channel from the fetched body. Dropped rather than asserted. (The OCW lecture-video corpus is real; reach it via the confirmed OCW home, which surfaces course videos.)
- **Internet Archive "MIT_OpenCourseWare" collection** (`archive.org/details/MIT_OpenCourseWare`) — HTTP **404 Not Found**. The exact collection slug did not resolve; dropped rather than guess a corrected slug.
- **OER Project** (`oerproject.com`) — confirmed live + free, but it is a **history curriculum** (Big History / World History / Climate), **off-domain** for this galaxy's engineering/CS/manufacturing focus. Omitted to keep the atlas on-target, not because it is illegitimate.

## Sources

Distinct URLs WebFetch-confirmed live + free + legally open for this entry (2026-06-10):
1. https://ocw.mit.edu/ — MIT OpenCourseWare home; 2,500+ free courses, browse by topic/dept/level, no registration
2. https://ocw.mit.edu/collections/ocw-scholar/ — OCW Scholar self-study course collection (free)
3. https://www.oeglobal.org/ — Open Education Global; nonprofit open-education member network / discovery layer
4. https://openstax.org/ — OpenStax; free peer-reviewed openly-licensed (mostly CC BY 4.0) college textbooks
5. https://open.umn.edu/opentextbooks/ — Open Textbook Library (Univ. of Minnesota); 1,800+ free open textbooks
6. https://www.gutenberg.org/ — Project Gutenberg; 75,000+ free public-domain eBooks
7. https://www.merlot.org/merlot/ — MERLOT; 110,000+ curated free higher-ed OER
8. https://creativecommons.org/about/program-areas/education-oer/ — Creative Commons Open Education / OER program (find + license CC material)
9. https://creativecommons.org/share-your-work/cclicenses/ — the six CC licenses, most-to-least open (license lookup)
10. https://ocw.mit.edu/pages/privacy-and-terms-of-use/ — MIT OCW Terms of Use (CC BY-NC-SA 4.0 ingestion gate)
11. https://en.wikipedia.org/wiki/OpenStax — OpenStax provenance + license cross-check

**See also:** [`mit-curriculum-foundations.md`](mit-curriculum-foundations.md) for the synthesized corpus/catalog/licensing theory; [`knowledge/wiki/academy/academy-pedagogy-foundations.md`](../academy/academy-pedagogy-foundations.md) for the pedagogy layer that consumes this corpus.
