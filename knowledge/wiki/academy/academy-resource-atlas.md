---
title: Academy Resource Atlas — one-stop easy-access index of every academy/instructional-design resource (LOCAL trove + curated video/seminar + reputable free online)
galaxy: academy
owner_slot: lima
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas (2026-06-10)"
verification_method: "LOCAL store/corpus pointers reproduced VERBATIM from the operator-supplied pre-known trove (resources/MIT COURSES indexed count, lima pypdf 8,752-page extraction corpus, academy engine course-0a..60 / 63 ids) and confirmed-on-disk where path-checkable (resources/MIT COURSES exists; indexed counts NOT re-derived — owner-gated to lima). Every YouTube channel + reputable-free-online source below was WebFetch-confirmed to RESOLVE (channel-named title header returned for video; substantive page body for sites) on 2026-06-10. Sources returning HTTP 403/404/TLS-altname error were retried once with the canonical host then DROPPED if still unreachable (OER Commons dropped — HTTP 403 ×2). No numeric cutting constant / Cpk / OEE / mastery cut-score / safety threshold is promoted — those stay owner-gated to lima + constants.ts; only method/source links are surfaced."
tags: [academy, resource-atlas, easy-access-index, local-trove, mit-ocw, pypdf-corpus, course-forge, youtube-curated, open-educational-resources, oer, khan-academy, openstax, merlot, cwsei, bloom-taxonomy, mastery-learning, free-legal-only, lima]
---

# Academy Resource Atlas

The **one-stop easy-access index** for the **academy** galaxy: every reputable resource — the **LOCAL stores/corpora**, the **curated YouTube + free seminars/webinars + data reports**, and the **reputable free online** — linked in one place so a chat working in this galaxy jumps straight to what it needs instead of re-searching. Operator directive: *all reputable sources linked for EASY ACCESS — do not stay stagnant* (refresh on the cadence below).

This file FUSES the two halves of the resource picture:
- the **LOCAL trove** (the pre-known PRISM stores/corpora + course-forge ids), and
- the **online/video half** (open-courseware channels + reputable free OER + learning-science anchors).

It is **DISTINCT** from its siblings — read those for depth, this for *navigation*:
- [[academy-source-atlas]] — the free-college-course / textbook **curriculum** spine (what to learn, from MIT OCW / OpenStax / standards bodies). The resource-atlas POINTS at it, does not duplicate it.
- [[academy-pedagogy-foundations]] / [[academy-foundations]] — the theory layer (Bloom/Dreyfus, ADDIE, andragogy, deliberate practice).
- [[academy-applied-practice]] — the practitioner-gotcha layer (cognitive load, spacing, transfer failure, curse of knowledge).
- [[academy-advanced-techniques]] — the world-leader strategy layer (mastery learning, cognitive apprenticeship, formative-driven sequencing).

> **R12 / owner-gate:** this atlas LINKS the method and the source. It promotes **no** numeric constant — no mastery cut score, no spacing interval, no Cpk/OEE/competency threshold. Those live owner-gated with lima (and physical constants in `mcp-server/src/physics/constants.ts`). See `## Owner-gate (NOT promoted)`.

---

## 1. Local stores + corpora (the PRISM trove — pointers reproduced verbatim)

> Pathway = **store/corpus + its own index**. Do not re-OCR / re-extract / re-count; jump to the store and use its index. Counts below are the pre-known indexed figures — owner-gated to lima, NOT re-derived here.

| Local store / corpus | Pointer (path + index) | What it is | Use it for |
|---|---|---|---|
| **MIT COURSES local mirror** | `resources/MIT COURSES` (indexed: **1106**) — store + per-course folder/zip index (on-disk confirmed: directory present) | Locally-mirrored MIT OpenCourseWare course packages (lecture notes, problem sets, exams, syllabi) | Offline curriculum source; pair the local copy with the live [[academy-source-atlas]] MIT-OCW links for the freshest version |
| **pypdf page-by-page extraction corpus** | lima **pypdf 8,752-page extraction corpus** (the lima pypdf page-by-page extractor — canonical, 76× deeper than pdf-parse; see `feedback_use_lima_pypdf_page_extractor`) | Page-granular extracted text from the academy PDF trove | Search/retrieve a specific page's content; feed academy / NN corpora; never re-extract — read the existing per-page output |
| **Academy course-forge ids** | academy engine **course-0a..60 (63 ids)** | The forged course catalog (3-leg ship contract per course id) in the academy galaxy engine layer | Look up an existing course before forging a new one; trace a course's 3-leg completeness |

Galaxy brain back-pointer: `mcp-server/src/engines/academy/MEMORY.md` (the academy per-domain brain — courses/curriculum/lessons/MIT-OCW/certification/instructor; custom `academy-awareness.mjs`). Start there for the live engine/dispatcher inventory; this atlas is the *resource* index, that is the *engine* index.

---

## 2. Curated YouTube + seminars (open-courseware + instructional-design reference)

> Each channel below was WebFetch-confirmed on 2026-06-10 to RESOLVE (the channel-named title header returned). FREE + LEGAL only. Use for: lecture-video sourcing, pedagogy/explainer-craft reference, and seminar-style instruction patterns.

| Channel | URL | Why it's here for academy |
|---|---|---|
| **MIT OpenCourseWare** | https://www.youtube.com/@mitocw | Full-length university lecture courses — the gold standard for "what a complete free course looks like"; pairs with the local `resources/MIT COURSES` mirror |
| **Khan Academy** | https://www.youtube.com/@khanacademy | Mastery-oriented, short-segment instruction across K-12 + early college; reference for chunking + mastery-learning sequencing (the *method*, not its cut score) |
| **freeCodeCamp.org** | https://www.youtube.com/@freecodecamp | Long-form, project-based technical course videos — reference for competency-by-doing course structure (explicitly confirmed) |
| **Veritasium** | https://www.youtube.com/@veritasium | Science-communication / misconception-first pedagogy reference — how to surface and correct a learner's prior model |
| **3Blue1Brown** | https://www.youtube.com/@3blue1brown | Visual-intuition-first explanation craft (explicitly confirmed) — reference for building intuition before formalism |

> Seminars / webinars: the **CWSEI** site (§3) hosts annual-workshop presentations + research posters (free) — use those as the seminar arm of this galaxy until a dedicated live-webinar series is curated. **Keep-fresh action:** add reputable live/recorded instructional-design webinars here as they are WebFetch-verified.

---

## 3. Reputable free online + data reports

> Each WebFetch-confirmed to resolve on 2026-06-10 with a substantive page body. FREE + LEGAL only (no LibGen/SciHub). Sources are official/standards/reputable-educator. **OER Commons was DROPPED** — HTTP 403 on both attempts (could not confirm resolution per R12).

### Open educational resource repositories
| Resource | URL | What it gives the academy galaxy |
|---|---|---|
| **MIT OpenCourseWare (live)** | https://ocw.mit.edu/ | 2,500+ MIT courses free, no registration — the live source the local `resources/MIT COURSES` mirror tracks; freshest curriculum |
| **OpenStax** | https://openstax.org/ | Free, peer-reviewed, openly-licensed textbooks (math/science/social-science) — reference + assignable reading without a paywall |
| **MERLOT** | https://www.merlot.org/merlot/index.htm | 110,000+ peer-reviewed learning resources across disciplines + free Content Builder — discover vetted teaching materials |

### Learning-science methods + data reports (the *why-it-works* anchors)
| Anchor | URL | Method it sources (link only — no numeric promoted) |
|---|---|---|
| **Carl Wieman Science Education Initiative (CWSEI)** | https://cwsei.ubc.ca/ | Evidence-driven, department-based STEM-education transformation; validated instruments incl. **COPUS** classroom-observation protocol, implementation handbooks, workshop/poster archive, curated learning-science literature |
| **Bloom's taxonomy** | https://en.wikipedia.org/wiki/Bloom%27s_taxonomy | The cognitive/affective/psychomotor objective-categorization framework underpinning [[academy-pedagogy-foundations]] — link to the construct, not a cut score |
| **Mastery learning** | https://en.wikipedia.org/wiki/Mastery_learning | The achieve-competence-before-advancing instructional construct underpinning [[academy-advanced-techniques]] — the *method*; the mastery threshold itself stays owner-gated |

> **Data reports:** CWSEI's workshop presentations + research posters serve as the academy galaxy's data-report arm today (free, reputable, evidence-driven). **Keep-fresh action:** when a reputable open instructional-design or learning-outcomes data report is verified, add it here.

---

## 4. Cross-links (the galaxy's wiki layer hub)

This atlas is the *navigation* node; depth lives in the siblings and the cross-galaxy maps:

- [[academy-foundations]] — theory spine (read first)
- [[academy-source-atlas]] — free courses / textbooks curriculum (the curriculum half; this atlas adds the local + video + data half)
- [[academy-applied-practice]] — practitioner gotchas
- [[academy-advanced-techniques]] — world-leader strategy
- [[academy-pedagogy-foundations]] — pedagogy/competency-framework foundations
- [[primary-domain-resource-map]] — the fleet-wide per-domain resource map (this atlas is academy's contribution)
- [[prism-methodology-foundations]] — the PRISM build/methodology spine

Local engine brain (not a wiki layer, but the live inventory): `mcp-server/src/engines/academy/MEMORY.md`.

---

## 5. Keep-fresh cadence (do not stay stagnant)

Operator directive is explicit: this index must **not stay stagnant**. Refresh protocol:

1. **Re-verify links** on each major academy-galaxy work session (or monthly, whichever first): WebFetch every YouTube + online URL; on HTTP 404/403/TLS error, retry once with the canonical host, then **DROP** the dead source and note it in `## Sources`.
2. **Add new reputable free sources** as they are discovered + WebFetch-verified — especially the still-thin arms: live instructional-design **webinars/seminars** and open **learning-outcomes data reports**.
3. **Re-attempt dropped sources** (currently OER Commons) on the next refresh — a 403 bot-block may clear.
4. **Never** add a paywalled/illegitimate mirror (no LibGen/SciHub); free + legal only.
5. **Never** promote a numeric constant into this atlas during refresh — link the method/source; the number stays with lima + `constants.ts`.
6. Bump `verified_by` + the date when the link set materially changes.

---

## Owner-gate (NOT promoted)

The following stay owner-gated to **lima** (and `mcp-server/src/physics/constants.ts` for physical constants) and are **deliberately NOT surfaced as values** in this atlas — only the method/source is linked above:

- Mastery-learning **cut scores** / competency thresholds (the "achieve X% before advancing" number).
- Spacing / retrieval-practice **interval values** and any spaced-repetition schedule constants.
- **Cpk / SPC** control limits and **OEE** targets used in any manufacturing-competency assessment.
- Any **safety threshold**, S(x) gate value, or alarm limit referenced by an academy course.
- Indexed **counts** of the local trove (the `1106`, `8,752`, `63` figures are reproduced verbatim from the pre-known operator trove, NOT re-derived; lima owns re-counting).

If a course or assessment needs one of these, resolve it through lima / the owning dispatcher / `constants.ts` — never inline it here.

---

## Sources

LOCAL trove (operator pre-known; reproduced verbatim, path-confirmed where checkable):
- `resources/MIT COURSES` — indexed 1106 (directory confirmed present on disk 2026-06-10; count NOT re-derived).
- lima pypdf 8,752-page extraction corpus (canonical lima pypdf page-by-page extractor; `feedback_use_lima_pypdf_page_extractor`).
- academy engine course-0a..60 (63 ids).

ONLINE — WebFetch-confirmed RESOLVING on 2026-06-10:
- MIT OpenCourseWare (live) — https://ocw.mit.edu/ — VERIFIED (2,500+ free courses, no registration).
- OpenStax — https://openstax.org/ — VERIFIED (free peer-reviewed textbooks).
- MERLOT — https://www.merlot.org/merlot/index.htm — VERIFIED (110,000+ peer-reviewed learning resources).
- CWSEI (UBC) — https://cwsei.ubc.ca/ — VERIFIED (COPUS instrument, handbooks, workshop/poster archive; `www.` host gave a TLS-altname error, canonical host resolved).
- Bloom's taxonomy — https://en.wikipedia.org/wiki/Bloom%27s_taxonomy — VERIFIED.
- Mastery learning — https://en.wikipedia.org/wiki/Mastery_learning — VERIFIED.

YOUTUBE — WebFetch-confirmed RESOLVING (channel-named title header returned) on 2026-06-10:
- MIT OpenCourseWare — https://www.youtube.com/@mitocw — VERIFIED (resolves).
- Khan Academy — https://www.youtube.com/@khanacademy — VERIFIED (resolves).
- freeCodeCamp.org — https://www.youtube.com/@freecodecamp — VERIFIED (explicitly confirmed by fetch).
- Veritasium — https://www.youtube.com/@veritasium — VERIFIED (resolves).
- 3Blue1Brown — https://www.youtube.com/@3blue1brown — VERIFIED (explicitly confirmed by fetch).

DROPPED (per R12 — could not confirm resolution after retry):
- OER Commons — https://www.oercommons.org/ and https://oercommons.org/ — HTTP 403 Forbidden on both attempts (bot-block). Re-attempt on next refresh.
