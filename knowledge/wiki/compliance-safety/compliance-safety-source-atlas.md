---
title: Compliance-Safety Open Source Atlas — the living-source curriculum for safety-engineering + functional-safety (where to keep learning, free/legal only)
galaxy: compliance-safety
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas-meta (2026-06-10)"
verification_method: every source below was WebFetch-confirmed live and free/legal on 2026-06-10 (MIT PSAS home + materials pages, the STPA Handbook PDF served as a live 5.3MB download, MIT OpenCourseWare System Safety 16.63J by Leveson, OSHA 29 CFR 1910 standards index + OSHA Training home, NIST CSRC Special Publications listing, NASA OSMA System Safety handbooks + SATERN courses). Candidates that failed WebFetch were retried once then DROPPED, never guessed (see Dropped). This atlas is the keep-learning directory only — it lists WHERE to learn, it does NOT restate the synthesized theory in [[compliance-safety-foundations]] or the practitioner gotchas in [[compliance-safety-applied-practice]] (both read first to avoid repetition). METHOD-ONLY: no numeric safety threshold (S(x), Omega, Cpk gate, SIL band, exposure limit) is promoted — R12.
tags: [compliance-safety, source-atlas, living-curriculum, keep-learning, safety-engineering, functional-safety, STAMP, STPA, CAST, Leveson, IEC-61508, NIST-CSRC, NASA-system-safety, OSHA, ALARP, fail-safe, free-courses, free-textbooks, open-courseware, standards, gov-data]
---

# Compliance-Safety Open Source Atlas

The **living-source curriculum** for the **compliance-safety** galaxy (owner: golf): a curated, kept-fresh directory of WHERE to keep learning safety-engineering and functional-safety from reputable FREE/LEGAL sources, so this galaxy's knowledge never goes stagnant.

This entry is **distinct** from its two siblings and does not repeat them:
- [[compliance-safety-foundations]] = the synthesized *theory* (hazard-ID, hierarchy of controls, IEC 61508/SIL framing, FMEA/RPN, ALARP, defense-in-depth, audit-trail).
- [[compliance-safety-applied-practice]] = the practitioner *gotchas* (fail-open vs fail-closed, SPOF, audit-trail gaps, alarm fatigue, risk-matrix misuse).
- **This atlas** = the *keep-learning directory* — full free courses, full free handbooks/textbooks, lecture-video channels, official standards/docs homes, and data archives you return to as the domain evolves.

> SAFETY-CRITICAL SCOPE NOTE: this atlas points at sources and says what each *teaches*. It promotes **method only**. Where a source names a number (a SIL probability band, an exposure limit, an RPN action cutoff), that number stays owner-gated in `state/shared/omega-thresholds.json` / `mcp-server/src/physics/constants.ts` — name the source, gate the value, never copy it into the wiki (R12).

> HONESTY NOTE (R12): only sources WebFetch-confirmed live + free on 2026-06-10 are listed. Notably, the MIT Press open-access PDF page for Leveson's *Engineering a Safer World* and the IEC functional-safety overview page both returned HTTP 403 to WebFetch and were **dropped, not guessed** — the same book's authoring group (MIT PSAS) and the free IEC 61508 framing already cited in foundations cover the same ground through reachable links below.

---

## 1. Free college courses (full curricula, downloadable materials)

### MIT OpenCourseWare — System Safety (16.63J), Prof. Nancy Leveson
**CONFIRMED** — https://ocw.mit.edu/courses/16-63j-system-safety-spring-2016/
Leveson's own MIT graduate course, free: lecture notes, open textbooks, and written assignments. Covers hazard analysis, safety-driven design, and integrating safety into the systems-engineering process. This is the single best free *taught-course* anchor for the galaxy — it is the curriculum behind the STAMP/STPA method.
**Feeds:** the methodology spine of `S(x)` and the hierarchy-of-controls recommendation (foundations §1-§3); the systems-thinking framing that the applied-practice fail-closed / defense-in-depth gotchas rest on.

### NASA SATERN — free web-based system-safety courses (via NASA OSMA System Safety)
**CONFIRMED (host page)** — https://sma.nasa.gov/sma-disciplines/system-safety
The NASA Office of Safety & Mission Assurance system-safety page links 20+ free web-based courses (System Safety Fundamentals, Hazard Analysis for Practitioners, Fault Tree Analysis, Probabilistic Risk Assessment, Risk-Informed Decision Making) plus the handbooks listed in §2. Course delivery is via the SATERN platform; the discipline page is the free public entry point.
**Feeds:** FMEA/fault-tree and PRA technique depth behind the foundations §4 failure-analysis material; risk-informed authorize-then-monitor loop (foundations §6 / NIST RMF).

---

## 2. Free textbooks + handbooks (full-text, legal open downloads)

### STPA Handbook (Leveson + Thomas, MIT) — direct free PDF
**CONFIRMED** — https://psas.scripts.mit.edu/home/get_file.php?name=STPA_handbook.pdf
The definitive free guide to System-Theoretic Process Analysis (the hazard-analysis method built on STAMP). WebFetch pulled it as a live ~5.3MB PDF download. This is the operational how-to behind the systems-theoretic safety approach.
**Feeds:** the hazard-identification + control-structure analysis that precedes any `S(x)` gate (foundations §1); the "find the unsafe control action before it ships" discipline.

### NASA System Safety Handbooks — SP-2010-580 (Vol 1) + SP-2014-612 (Vol 2)
**CONFIRMED (host page)** — https://sma.nasa.gov/sma-disciplines/system-safety
Two freely-accessible volumes: "System Safety Framework and Concepts for Implementation" and "System Safety Concepts, Guidelines, and Implementation Examples," plus the Probabilistic Risk Assessment Procedures Guide (SP-2011-3421) and Risk Management Handbook (SP-2011-3422). A complete, rigorous, free safety-engineering reference set from a high-consequence-systems authority.
**Feeds:** the risk-informed safety framework and PRA methodology behind foundations §3-§6; the "objectives-driven, risk-informed" framing that maps onto PRISM's gate -> defer -> re-check loop.

### MIT PSAS materials — STPA Handbook, CAST Handbook, free publications
**CONFIRMED** — https://psas.scripts.mit.edu/home/materials/
The PSAS materials hub: the STPA Handbook and CAST Handbook ("made freely available to the community as the definitive guides"), plus many publications offered as free downloads and links to the MIT OCW lecture notes. CAST = Causal Analysis based on Systems Theory, the accident/incident-investigation counterpart of STPA.
**Feeds:** incident-investigation root-cause depth (foundations §1 step 4, "find root causes not the single trigger"); the systems-theoretic alternative to RPN-style ranking.

---

## 3. Lecture-video channels + tutorials (watch to keep current)

### MIT PSAS — Short Tutorial videos (STAMP / STPA / CAST)
**CONFIRMED** — https://psas.scripts.mit.edu/home/materials/?wpfb_cat=4
The PSAS "Short Tutorials" section hosts free tutorial videos giving a basic familiarity with STAMP, STPA, and CAST, "intended mainly for practitioners new to these methods." The right starting point before reading the full handbooks.
**Feeds:** fast onboarding to the systems-theoretic safety vocabulary used across both sibling entries.

### MIT PSAS home — STAMP Workshop presentation archive + papers/publications search
**CONFIRMED** — https://psas.scripts.mit.edu/home/
Nancy Leveson's group home page: a searchable archive of MIT STAMP Workshop presentations (annual conference talks applying STAMP/STPA/CAST to real systems), a papers/publications search, and links to handbooks/tutorials/courses. The workshop archive is the "what's new in the field this year" living feed — the freshest applied case studies.
**Feeds:** new applied case studies and method refinements that keep the galaxy's practice current (the keep-fresh engine for §1-§2 sources).

---

## 4. Official docs + standards (the authoritative homes)

### OSHA — 29 CFR 1910 General Industry standards index
**CONFIRMED (gov)** — https://www.osha.gov/laws-regs/regulations/standardnumber/1910
The official index to every general-industry safety standard, organized by subpart A-Z with direct links: machine guarding (Subpart O, 1910.211-219), lockout/tagout (1910.147), PPE (Subpart I), electrical (Subpart S), hazardous substances (Subpart Z). The primary-source home for the concrete manufacturing-floor controls.
**Feeds:** the OSHA machine-guarding + control-of-hazardous-energy controls in foundations §7 — go here for the *binding* standard text, not the overview.

### OSHA — Training home (free outreach training + publications)
**CONFIRMED (gov)** — https://www.osha.gov/training
Official OSHA training hub: Outreach Training (10-/30-hour), OSHA Training Institute Education Centers, Susan Harwood grant materials, plus publications and videos at no direct cost. The free continuing-education channel for floor-level compliance.
**Feeds:** operator-facing administrative-control training (foundations §2, the administrative layer of the hierarchy of controls).

### NIST CSRC — Special Publications listing (SP 800-series, free PDFs)
**CONFIRMED (gov)** — https://csrc.nist.gov/publications/sp
The free home of the NIST SP 800-series: SP 800-37 (Risk Management Framework), SP 800-53 (Security & Privacy Controls), SP 800-171, and 300+ more, all downloadable PDFs, filterable by status/series/control family. The authoritative source for the RMF lifecycle and the audit-log / defense-in-depth definitions the siblings cite.
**Feeds:** the NIST RMF Prepare->...->Monitor loop and audit-trail/defense-in-depth methodology (foundations §6; applied-practice §3); go here for the full control catalog, not the glossary stub.

---

## 5. Data + archives (case studies + reference corpora)

### MIT STAMP Workshop presentation archive (applied case-study corpus)
**CONFIRMED** — https://psas.scripts.mit.edu/home/ (Workshop presentations + Papers/Publications search)
Beyond the tutorials, the PSAS site is itself a searchable *archive* of safety-analysis case studies and papers spanning aviation, medical, automotive, and process industries. Treat it as a free corpus of "how a systems-theoretic hazard analysis was actually done" rather than just a reading list.
**Feeds:** real worked hazard-analysis examples to calibrate PRISM's own compliance-safety recommendations against (the worked-example layer the two sibling entries reference but do not contain).

### NASA OSMA technical guidance set (PRA + risk-management reference corpus)
**CONFIRMED (gov)** — https://sma.nasa.gov/sma-disciplines/system-safety
The NASA system-safety page also fronts the Probabilistic Risk Assessment Procedures Guide and Risk Management Handbook plus policy documents (NPR 8715.3 System Safety, NPR 8000.4 Risk Management) — a free reference corpus for quantitative risk-analysis procedure.
**Feeds:** the quantitative-analysis backstop the foundations entry recommends for borderline risk-matrix items (applied-practice §5 G10: re-check borderline cells with quantitative analysis).

---

## Keep-fresh cadence

Safety standards and methods drift; this atlas must not. Suggested golf-owned refresh loop:

- **Per quarter:** WebFetch every URL in `## Sources` (HEAD-equivalent reachability). Any link that 403/404s twice -> mark it DROPPED in the front-matter `verification_method` and find the current home; never leave a dead link claiming to be live (R12).
- **Per quarter:** scan the MIT PSAS STAMP Workshop presentation archive for the latest year's talks; the freshest applied case studies land there first. Promote any genuinely new method (a STPA/CAST extension) into [[compliance-safety-applied-practice]], not here.
- **On any OSHA / NIST revision:** the gov indexes (OSHA 1910, NIST CSRC SP) are versioned upstream — re-confirm the standard numbers cited in foundations §7 / §6 still resolve before any safety module cites them.
- **Watch for the dropped sources:** if the MIT Press *Engineering a Safer World* open-access PDF or an IEC 61508 free-overview page becomes WebFetch-reachable, add it (Leveson's book is the canonical text; foundations already uses the free IEC 61508 framing in the interim).
- **Numbers stay gated:** if any source above is updated with a new SIL band, exposure limit, or RPN threshold, route the number through the owner-gate — update the *pointer*, never copy the *value* into this entry.

## Sources

All URLs below were WebFetch-confirmed live + free/legal on 2026-06-10. Distinct from [[compliance-safety-foundations]] and [[compliance-safety-applied-practice]] (both read first; their per-topic framing pages are not duplicated here).

1. MIT OpenCourseWare - System Safety 16.63J (Leveson; free lecture notes + open textbooks): https://ocw.mit.edu/courses/16-63j-system-safety-spring-2016/
2. MIT PSAS - home (Leveson's group; STAMP Workshop archive + papers + handbooks): https://psas.scripts.mit.edu/home/
3. MIT PSAS - materials (STPA Handbook, CAST Handbook, free publications): https://psas.scripts.mit.edu/home/materials/
4. MIT PSAS - STPA Handbook direct PDF (served live ~5.3MB): https://psas.scripts.mit.edu/home/get_file.php?name=STPA_handbook.pdf
5. MIT PSAS - Short Tutorial videos (STAMP / STPA / CAST): https://psas.scripts.mit.edu/home/materials/?wpfb_cat=4
6. NASA OSMA - System Safety (handbooks SP-2010-580 / SP-2014-612 + free SATERN courses + PRA/RM guides): https://sma.nasa.gov/sma-disciplines/system-safety *(gov)*
7. OSHA - 29 CFR 1910 General Industry standards index: https://www.osha.gov/laws-regs/regulations/standardnumber/1910 *(gov)*
8. OSHA - Training home (free outreach training + publications): https://www.osha.gov/training *(gov)*
9. NIST CSRC - Special Publications listing (SP 800-series free PDFs): https://csrc.nist.gov/publications/sp *(gov)*

### Dropped (WebFetch-unreachable on 2026-06-10 — retried once, not guessed)
- MIT Press - *Engineering a Safer World* open-access page (HTTP 403 to WebFetch on both attempted URLs). The book's authoring group (MIT PSAS, source 2/3) covers the same STAMP material through reachable links.
- IEC - functional-safety overview page https://www.iec.ch/functional-safety (HTTP 403). The free IEC 61508 framing already cited in [[compliance-safety-foundations]] §3 stands in until a reachable IEC overview is found.
