---
title: MIT Curriculum Foundations — the MIT OpenCourseWare source corpus, catalog structure, and Creative Commons licensing
galaxy: mit-curriculum
owner_slot: lima
status: VERIFIED-PARTIAL
verified_by: "papa-meta-create-workflow (2026-06-10)"
verification_method: institutional + licensing facts WebFetch-confirmed against primary sources (ocw.mit.edu about + terms-of-use, catalog.mit.edu subjects + GIRs, creativecommons.org license deeds, a live OCW course page with full metadata) and reputable encyclopedic sources (Wikipedia MIT-OCW / OpenCourseWare / OER). Pedagogy + instructional-design THEORY is intentionally NOT re-derived here — it is pointed to the academy galaxy's foundations entry.
tags: [mit-curriculum, opencourseware, ocw, creative-commons, cc-by-nc-sa, open-educational-resources, oer, course-catalog, curriculum-mapping, course-to-knowledge-extraction, source-corpus, gov-data, free-courseware]
---

# MIT Curriculum Foundations

The domain-knowledge spine for the **mit-curriculum** galaxy (owner: lima): how PRISM treats **MIT OpenCourseWare (OCW) as a source corpus** — the catalog's structure, the department/subject numbering it exposes, the curriculum scaffolding it encodes, and the **legal Creative Commons terms** under which any of it may be ingested. This entry is the *source-corpus catalog* half of the academy stack; the *pedagogy/instructional-design theory* half lives in the academy galaxy.

> **Pointer (do NOT re-derive here).** For competency frameworks, skill-progression models, Bloom's taxonomy, ADDIE/instructional-design, andragogy, deliberate practice, and assessment theory, read **[`knowledge/wiki/academy/academy-pedagogy-foundations.md`](../academy/academy-pedagogy-foundations.md)** (galaxy: academy, owner: lima). THIS entry stays on the MIT-OCW corpus itself — *what the source is, how it is shaped, and the license that governs ingestion* — not how to teach from it.

**Honesty note (R12):** institutional + licensing facts below are WebFetch-CONFIRMED against the cited primary source. Where a number is from a reputable encyclopedic source (Wikipedia) rather than the OCW page itself, it is marked as such. Claims still requiring lima's domain check are under **## Owner-gate**, not asserted here.

## 1. What MIT OpenCourseWare is (the source, defined)

**CONFIRMED** against [ocw.mit.edu/about](https://ocw.mit.edu/about/):
- OCW is "a free and open collection of material from thousands of MIT courses, covering the entire MIT curriculum" — **2,500+ MIT courses** published, accessed by **500 million+ learners and educators**.
- Three stated principles: **knowledge as a public good** (free, no barriers), **no barriers to access** (no account, no start/end dates), and **shareable and remixable** (users may "freely modify, remix, and reuse" materials while citing the source).
- **MIT does NOT offer credit or certification through OCW** — "knowledge is your reward." This matters for PRISM: OCW is a *content corpus*, not an accredited credential pathway.

**CONFIRMED** historical scale against [Wikipedia: MIT OpenCourseWare](https://en.wikipedia.org/wiki/MIT_OpenCourseWare): announced **April 4, 2001**; public pilot **September 2002 with 32 courses**; 500th course by Sept 2003; 900 courses by Sept 2004; 2,400+ by May 2018. As of May 2018, *most* courses included homework and exams with solutions plus lecture notes; ~100 courses had complete video lectures (YouTube / Internet Archive).

**Galaxy use:** mit-curriculum ingests OCW as PRISM's primary free, legally-clean academic CS/engineering corpus — the raw material the academy galaxy then sequences into lessons.

## 2. The OpenCourseWare / OER movement (corpus provenance + why it is legally ingestible)

**CONFIRMED** against [Wikipedia: OpenCourseWare](https://en.wikipedia.org/wiki/OpenCourseWare): the OCW concept gained momentum in **October 2002** with two launches — MIT OpenCourseWare and Carnegie Mellon's Open Learning Initiative; OCW projects are "free and open digital publication[s]... available for use and adaptation under an open license."

**CONFIRMED** against [Wikipedia: Open Educational Resources](https://en.wikipedia.org/wiki/Open_educational_resources): OER are "teaching, learning and research materials... that reside in the public domain or have been released under an open license." David Wiley's **5 Rs of openness** — **Retain, Reuse, Revise, Remix, Redistribute** — define what an open license must permit; Creative Commons is the "critical infrastructure" that grants those rights. The term "OER" was adopted at **UNESCO's 2002 Forum on Open Courseware**.

**Galaxy use:** the 5 Rs are the legal test PRISM applies before ingesting ANY external course — Retain + Reuse + Redistribute are mandatory for a corpus; Revise + Remix decide whether PRISM may adapt (not just quote) the material.

## 3. Creative Commons licensing — the ingestion gate (CONFIRMED, load-bearing)

**This is the legal floor for the whole galaxy.** MIT OCW content is published under one specific license.

**CONFIRMED** against [ocw.mit.edu terms of use](https://ocw.mit.edu/pages/privacy-and-terms-of-use/) and the license deed [creativecommons.org/licenses/by-nc-sa/4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/):
- MIT OCW uses **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**.
- **BY (Attribution):** "You must give appropriate credit, provide a link to the license, and indicate if changes were made."
- **NC (NonCommercial):** "You may not use the material for commercial purposes" — defined as uses "primarily intended for or directed towards commercial advantage or monetary compensation."
- **SA (ShareAlike):** "If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original."

**CONFIRMED** license spectrum against [creativecommons.org/share-your-work/cclicenses](https://creativecommons.org/share-your-work/cclicenses/): the six CC licenses range most-to-least open — **CC BY → CC BY-SA → CC BY-NC → CC BY-NC-SA → CC BY-ND → CC BY-NC-ND**; the **BY (attribution) element is present in all six**. OCW sits at CC BY-NC-SA (the 4th, mid-restriction).

**Galaxy use (R12-critical):** because OCW is **NC**, PRISM-derived academy material built on OCW content (a) MUST attribute MIT + link the license + flag changes, (b) MUST NOT be sold or used for "commercial advantage," and (c) under **SA**, any remixed derivative MUST be released under CC BY-NC-SA 4.0. **The NC clause is a hard constraint on PRISM's quoting/commercial surfaces** — see Owner-gate.

## 4. Catalog structure — MIT's department/subject numbering (the corpus index)

OCW is "organized as courses" that mirror MIT's own catalog. The catalog encodes a stable **department-number → discipline** map that PRISM uses as the corpus's primary index.

**CONFIRMED** against the official MIT subject catalog [catalog.mit.edu/subjects](https://catalog.mit.edu/subjects/) — the engineering/science department numbers most relevant to PRISM's manufacturing domain:
- **Course 1** — Civil and Environmental Engineering
- **Course 2** — Mechanical Engineering *(manufacturing processes, machine design — PRISM's core)*
- **Course 3** — Materials Science and Engineering *(material behavior, metallurgy)*
- **Course 6** — Electrical Engineering and Computer Science
- **Course 8** — Physics
- **Course 10** — Chemical Engineering
- **Course 16** — Aeronautics and Astronautics
- **Course 18** — Mathematics
- **Course 22** — Nuclear Science and Engineering
- (also Course 4 Architecture, 5 Chemistry, 7 Biology, 9 Brain & Cognitive Sciences, 11 Urban Studies, 12 Earth/Atmospheric/Planetary, 14 Economics, 15 Management, 24 Linguistics & Philosophy)

A subject is `<dept>.<number>` (e.g. **2.854** = Mechanical Engineering, subject 854). PRISM keys ingested OCW material on this `Course N` axis so manufacturing-relevant departments (esp. **2, 3, 8, 18**) are the harvest priority.

**Galaxy use:** `Course 2` (Mechanical Engineering) and `Course 3` (Materials) are the curriculum-mapping anchors — the department index tells PRISM which OCW courses are domain-on-target before any extraction.

## 5. Curriculum scaffolding — MIT's General Institute Requirements (how the corpus is sequenced)

The catalog also encodes how subjects compose into a degree — the scaffold PRISM mirrors when curriculum-mapping.

**CONFIRMED** against [catalog.mit.edu General Institute Requirements](https://catalog.mit.edu/mit/undergraduate-education/general-institute-requirements/): MIT's GIRs require **17 subjects** total, including a **six-subject Science Core** — two Physics (8.01/8.02 family), one Chemistry (3.091/5.111/5.112), one Biology (7.012 family), and two Calculus (18.01 + 18.02) — plus an **eight-subject HASS requirement**, a four-subject **Communication requirement** (CI-H + CI-M), and a **laboratory requirement (12 units)**.

**Galaxy use:** the Science-Core dependency chain (Calculus 18.01 → 18.02 before any Course-2 manufacturing subject) is the *prerequisite graph* PRISM reuses — a machining lesson should not be sequenced before its math/physics prerequisites, exactly as MIT scaffolds 18.01/8.01 ahead of 2.xxx. Detailed competency-sequencing theory: see the academy foundations pointer above.

## 6. Course-to-knowledge extraction — a concrete corpus exemplar

The extraction target is a single OCW course's published artifact set. A confirmed example shows the metadata shape PRISM harvests.

**CONFIRMED** against the live course page [ocw.mit.edu/courses/2-854-...-fall-2016](https://ocw.mit.edu/courses/2-854-introduction-to-manufacturing-systems-fall-2016/):
- **Title:** Introduction to Manufacturing Systems · **Number:** 2.854 · **Dept:** Mechanical Engineering · **Level:** Graduate · **Instructor:** Dr. Stanley Gershwin · **Term:** Fall 2016.
- Published materials: **syllabus, calendar, readings, lecture notes, assignments** (lecture notes are the primary resource type).
- Topics: material flow/storage, information flow, capacities, event timing; probability, inventory/queuing models, optimization, linear + dynamic systems; factory planning + scheduling (bottleneck analysis, buffer sizing, batch-size).

**Galaxy use:** each OCW course extracts to a record of `{course_number, title, department, level, instructor, term, material_types[], topics[]}` — the per-course metadata + the lecture-notes body are what feed PRISM's academy lessons and the broader corpus-aggregation pipeline. The `department` + `level` fields (from §4) drive routing; `topics[]` drive relevance ranking against PRISM's manufacturing domains.

## Owner-gate (NOT promoted)

These need lima's domain check / an operator decision before any academy module or commercial surface relies on them:

- **[lima-gate] NC commercial-use boundary.** OCW is CC BY-NC-SA 4.0 (**NonCommercial**, CONFIRMED §3). Whether PRISM's use of OCW-derived material crosses the "commercial advantage / monetary compensation" line is a **legal call, not a code call** — if any PRISM academy output is sold, bundled into a paid product, or used to market a paid service, the NC clause is implicated. **Do NOT ship OCW-derived content into a commercial/paid surface without explicit operator + legal sign-off.** This entry asserts the license terms, not their application to PRISM's specific business model.
- **[lima-gate] ShareAlike contamination.** Under SA, any PRISM derivative that *remixes/transforms* OCW content must itself be released CC BY-NC-SA 4.0. Whether PRISM wants that obligation on a given derivative (vs. quoting-only with attribution, which avoids SA) is a per-artifact decision lima/operator must make.
- **[lima-gate] Exact live course count + per-department catalog totals.** "2,500+ courses" is CONFIRMED from the OCW about page (2026-06-10); the *exact* current count and the per-department harvest sizes drift over time — re-fetch before any module hardcodes a number.
- **[lima-gate] OCW bulk-data / API access path.** This entry confirms the human-facing catalog structure; the machine-readable ingestion path (OCW's published data dumps / course-metadata feeds) was not WebFetch-confirmed here and should be verified before building an automated harvester.

## Sources

Distinct URLs WebFetch-confirmed for this entry (2026-06-10):
1. https://ocw.mit.edu/about/ — OCW scale, mission, no-credit (free courseware)
2. https://ocw.mit.edu/pages/privacy-and-terms-of-use/ — CC BY-NC-SA 4.0 license terms (free courseware)
3. https://ocw.mit.edu/courses/2-854-introduction-to-manufacturing-systems-fall-2016/ — live course metadata exemplar (free courseware)
4. https://catalog.mit.edu/subjects/ — MIT department-number → discipline map (official MIT academic catalog)
5. https://catalog.mit.edu/mit/undergraduate-education/general-institute-requirements/ — MIT GIRs curriculum scaffold (official MIT academic catalog)
6. https://creativecommons.org/licenses/by-nc-sa/4.0/ — CC BY-NC-SA 4.0 deed (BY/NC/SA conditions)
7. https://creativecommons.org/share-your-work/cclicenses/ — the six CC license types, most-to-least open
8. https://en.wikipedia.org/wiki/MIT_OpenCourseWare — OCW founding dates + growth + OCW Scholar
9. https://en.wikipedia.org/wiki/OpenCourseWare — OCW/OER movement origins (Oct 2002 launches)
10. https://en.wikipedia.org/wiki/Open_educational_resources — OER definition + David Wiley's 5 Rs

**See also:** [`knowledge/wiki/academy/academy-pedagogy-foundations.md`](../academy/academy-pedagogy-foundations.md) for the pedagogy / instructional-design theory layer (competency frameworks, ADDIE, Bloom, deliberate practice) that consumes this corpus.
