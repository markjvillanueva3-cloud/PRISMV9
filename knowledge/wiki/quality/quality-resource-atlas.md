---
title: Quality Galaxy Resource Atlas (one-stop easy-access hub — local trove + video/seminar + free online)
galaxy: quality
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas (2026-06-10)"
verification_method: "LOCAL stores reproduced verbatim from pre-known pointers and confirmed present on disk (quality MEMORY.md at mcp-server/src/engines/quality/MEMORY.md; JM DIE/ root). Every YouTube/seminar/online URL below was fetched live (WebFetch) on 2026-06-10 and listed ONLY if it resolved to confirmable on-topic content. Sources that returned 403/404, redirected to a bot-block, or rendered only a truncated JS shell with no confirmable on-topic content (ASQ quality-resources 403; ASQ/Quality-Digest/Mitutoyo YouTube channel pages truncated to a JS shell; Hexagon MI 403) were DROPPED, not listed — a verifiable directory page is preferred over an unconfirmable channel URL. NO numeric Cpk/sigma/control-limit/OEE threshold is promoted here; only methods/sources are linked, thresholds stay owner-gated to golf + constants.ts."
tags: [quality, spc, metrology, process-capability, six-sigma, resource-atlas, easy-access-hub, local-trove, youtube, seminars, webinars, nist, nptel, quality-digest, data-reports, free-legal, owner-gated]
---

# Quality Galaxy Resource Atlas

A single **easy-access index** for the quality / SPC / metrology / process-capability domain: jump straight to the LOCAL store/corpus you need, the curated VIDEO + seminar/webinar half, and the reputable FREE-online + data-report half — without re-searching each session. This atlas is non-stagnant by design: every external entry points at a continuously-updated homepage / course series / standards authority / event calendar so the galaxy's pointers do not freeze on the day they were written.

**Scope (R8 — no duplication):** this FUSES the local half with the online/video half and a cross-link hub. It is DISTINCT from its siblings: read [[quality-source-atlas]] for the free-college-course/textbook *curriculum*, [[quality-foundations]] for the WebFetch-confirmed *theory/numeric claims*, [[quality-applied-practice]] for *shop-floor gotchas*, and [[quality-advanced-techniques]] for *world-leader strategy*. The resource-atlas adds what those don't: the LOCAL trove pointers + the video/seminar/data-report half + this one-stop cross-link hub.

---

## Local stores + corpora (PRISM-internal — pathway = store + its index)

These are the in-repo stores a quality chat reaches for first. Pathway = the store/corpus + its own index/owner; numerics inside are owner-gated to golf (see Owner-gate below).

| Store / corpus | Path / surface | What it holds | Index / owner |
|----------------|----------------|---------------|---------------|
| **prism_business quality actions** | `prism_business` dispatcher — quality actions (Cpk / SPC chart / capability / quality-gate) | The runtime quality-numerics surface: process-capability + SPC-chart actions. Cpk/sigma/control-limit constants are **gated to golf + `mcp-server/src/physics/constants.ts`** — the dispatcher computes against owner-gated values, it does not promote them into docs. | `DISPATCHER_DIGEST.md`; numerics owner = golf |
| **Quality galaxy MEMORY.md** | `mcp-server/src/engines/quality/MEMORY.md` | The galaxy brain: quality-gate ecosystem, first-article-inspection ↔ SPC cadence, capability/DOE/regression references, consumer map (mill/lathe Cpk gates), sample wiki + memory pointers. | The galaxy's own master-brain card (golf owns) |
| **JM DIE/ inspection records** | `JM DIE/` (shop archive root) | Real test-shop inspection records / first-article + in-process measurement history — the ground-truth corpus for validating any quality method against live JM Die parts. | `jm-die-profile.ts` (counts live there — do not hardcode); search the archive index, never re-OCR |

> Pathway rule: a store is reached as **root + its own index**, never re-counted or re-derived here. For counts, read the live source (`jm-die-profile.ts`, `DISPATCHER_DIGEST.md`, `PRISM-INVENTORY-LATEST.md`).

---

## Curated YouTube + seminars (WebFetch-verified 2026-06-10)

The video/seminar half. Every entry below resolved live to confirmable on-topic content. Recorded-lecture galleries (NPTEL) and a live webinar/event calendar (NIST) are the durable, non-stagnant video surfaces; vendor/society YouTube *channel* pages could not be machine-confirmed (they serve a JS shell to the fetcher) so they were dropped rather than listed unverified — use the verified directory/homepage instead.

| Source | URL | Format | Confirmed |
|--------|-----|--------|-----------|
| **NPTEL — Metrology (IIT Madras, Dr. K. Sadashivappa)** | https://nptel.ac.in/courses/112106179 | Free recorded video lecture series | Resolved: NPTEL Metrology course, IIT Madras, free video lectures |
| **NPTEL — Mechanical Measurements and Metrology (IIT Madras, Venkateshan / Shunmugam)** | https://nptel.ac.in/courses/112106138 | Free recorded video lecture series | Resolved: measurement + metrology core, free video lectures |
| **NIST — Events (webinars / workshops / metrology training)** | https://www.nist.gov/news-events/events | Live + recorded webinars & seminars (calibration, OWM metrology training) | Resolved: official NIST Events; complimentary webinars/calibration training listed |
| **Quality Digest — Videos / Webinars** | https://www.qualitydigest.com/videos | Quality / metrology / SPC video + webinar archive | Resolved: Videos page with Videos/Webinars sections |

---

## Reputable free online + data reports (WebFetch-verified 2026-06-10)

The free-online + data-report half — standards-authority + government statistical references, FREE + LEGAL, that stay current on their own. (Method/source only; no numeric threshold promoted.)

| Source | URL | What it provides | Confirmed |
|--------|-----|------------------|-----------|
| **NIST/SEMATECH e-Handbook of Statistical Methods** | https://www.itl.nist.gov/div898/handbook/ | The canonical free statistical-methods handbook — SPC, capability, DOE, sampling, regression | Resolved: title confirmed; standard frameset entry to the full handbook |
| **NIST e-Handbook — Ch. 6: Process or Product Monitoring and Control** | https://www.itl.nist.gov/div898/handbook/pmc/pmc.htm | SPC: univariate + multivariate control charts, sampling-plan acceptance, time-series, case study | Resolved: chapter 6 confirmed |
| **NIST e-Handbook — Ch. 3: Production Process Characterization (PPC)** | https://www.itl.nist.gov/div898/handbook/ppc/ppc.htm | Capability evaluation + variance/stability analysis methodology with manufacturing case studies | Resolved: PPC chapter confirmed |
| **NIST — Dimensional Metrology Group** | https://www.nist.gov/pml/sensor-science/dimensional-metrology | SI length realization, calibration services, lowest-uncertainty dimensional measurement, ASME/ASTM/ISO standards leadership | Resolved: Dimensional Metrology Group page confirmed |
| **NIST Research Library — publications / Journal of Research** | https://www.nist.gov/nist-research-library | NIST publications + Journal of Research (free metrology / measurement-science reports + data) | Resolved: NIST Research Library hub confirmed |
| **Quality Digest** | https://www.qualitydigest.com/ | Living quality/metrology news + Metrology Hub + Statistical Methods + QMS/Standards features | Resolved: home page, Metrology Hub + Statistical Methods sections confirmed |

> **Dropped on verification (R12 honesty — not listed because not confirmable):** ASQ `quality-resources` (HTTP 403); ASQ / Quality Digest / Mitutoyo YouTube *channel* pages (truncated JS shell — channel identity not machine-confirmable); Hexagon Manufacturing Intelligence division page (HTTP 403); MIT OCW 2.008 / 2.810 candidate course URLs (HTTP 404 — superseded slugs; use [[quality-source-atlas]] for the verified MIT OCW course set). A Montgomery *Introduction to Statistical Quality Control* free-legal full-text was not found at a reputable host and is therefore NOT linked (the NIST e-Handbook is the free-legal SPC reference standing in its place).

---

## Cross-links (sibling wiki layers + domain hubs)

- [[quality-foundations]] — theory + WebFetch-confirmed methodology/numeric claims (read first for facts).
- [[quality-source-atlas]] — free college courses + textbook/curriculum living-source directory.
- [[quality-applied-practice]] — shop-floor gotchas + applied SPC/inspection practice.
- [[quality-advanced-techniques]] — world-leader quality strategy + advanced methods.
- [[primary-domain-resource-map]] — the fleet-wide per-domain resource map (this atlas is the quality node).
- [[prism-methodology-foundations]] — PRISM build/verify methodology these atlases follow.

---

## Keep-fresh cadence (non-stagnant directive)

- **Re-verify quarterly** (or on any dead-link report): re-WebFetch every external URL; drop on 404/403-after-retry; promote any newly-confirmable society/vendor channel (ASQ, Hexagon, Mitutoyo) once it resolves to confirmable content.
- **Living sources first:** NIST e-Handbook + NIST Events + NPTEL galleries self-update; prefer them over a static one-page link.
- **When a quality chat finds a new reputable FREE + LEGAL source**, add it here (verified) and back-link from the relevant sibling — the atlas compounds, it does not stay stagnant. FREE + LEGAL only (no LibGen / SciHub).
- **Append, don't fork:** new video/seminar half → "Curated YouTube + seminars"; new reference/data half → "Reputable free online + data reports"; new in-repo store → "Local stores + corpora".

---

## Owner-gate (NOT promoted)

Per R12 + the quality safety rule, this atlas links **methods and sources only**. The following stay **owner-gated to golf + `mcp-server/src/physics/constants.ts`** and are deliberately NOT reproduced here as numbers:

- Cpk / Ppk / process-capability acceptance thresholds.
- Sigma-level / control-limit (UCL/LCL) numeric values and out-of-control rule constants.
- OEE / yield / scrap-rate gate cutoffs and any safety threshold.

A quality chat reads the method/source from this atlas, then resolves the **number** from the owner-gated dispatcher (`prism_business` quality actions) / `constants.ts` — never by copying a figure out of an external page into PRISM docs.

---

## Sources

Verified live via WebFetch on 2026-06-10 (listed only if resolved to confirmable on-topic content):

- NIST/SEMATECH e-Handbook of Statistical Methods — https://www.itl.nist.gov/div898/handbook/
- NIST e-Handbook Ch.6 Process or Product Monitoring and Control (SPC) — https://www.itl.nist.gov/div898/handbook/pmc/pmc.htm
- NIST e-Handbook Ch.3 Production Process Characterization — https://www.itl.nist.gov/div898/handbook/ppc/ppc.htm
- NIST Dimensional Metrology Group — https://www.nist.gov/pml/sensor-science/dimensional-metrology
- NIST Events (webinars / metrology training) — https://www.nist.gov/news-events/events
- NIST Research Library — https://www.nist.gov/nist-research-library
- NPTEL Metrology (IIT Madras) — https://nptel.ac.in/courses/112106179
- NPTEL Mechanical Measurements and Metrology (IIT Madras) — https://nptel.ac.in/courses/112106138
- Quality Digest (home) — https://www.qualitydigest.com/
- Quality Digest Videos / Webinars — https://www.qualitydigest.com/videos

Local trove (verified present on disk 2026-06-10): `mcp-server/src/engines/quality/MEMORY.md` · `JM DIE/` · `prism_business` quality actions (`DISPATCHER_DIGEST.md`).

Dropped (not confirmable / blocked, R12): ASQ quality-resources (403), ASQ/Quality Digest/Mitutoyo YouTube channel pages (JS-shell truncation), Hexagon Manufacturing Intelligence (403), MIT OCW 2.008/2.810 candidate slugs (404).
