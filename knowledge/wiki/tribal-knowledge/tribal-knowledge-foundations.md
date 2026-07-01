---
title: Tribal-Knowledge Foundations — tacit-to-explicit conversion (SECI), lessons-learned / after-action systems, communities of practice, knowledge retention
galaxy: tribal-knowledge
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-meta-create-workflow (2026-06-10)"
verification_method: knowledge-management + organizational-learning facts WebFetch-confirmed against primary/reference sources (Nonaka SECI model, Polanyi tacit knowledge, Lave/Wenger communities of practice, US Army after-action review, Argyris/Schon organizational learning, NASA/ESA/JAXA lessons-learned definition, KM codification-vs-personalization, knowledge retention + transfer) plus a free MIT OpenCourseWare course (Sloan 15.668) and a US GAO succession-planning gov report (GAO-05-585). Established management-science theory (SECI, single/double-loop, legitimate peripheral participation) is asserted with citation; org-specific thresholds remain owner-gated.
tags: [tribal-knowledge, knowledge-management, tacit-knowledge, SECI, Nonaka, Polanyi, communities-of-practice, after-action-review, lessons-learned, organizational-learning, knowledge-retention, knowledge-transfer, single-loop, double-loop, GAO, MIT-OCW, gov-report]
---

# Tribal-Knowledge Foundations

The domain-knowledge spine for the **tribal-knowledge** galaxy: the management-science of *capturing the know-how that lives in people's heads* — the shop-floor wisdom, the "we always rough this material slower because it work-hardens" rules — and turning it into something the platform can store, search, inject, and reuse. Every PRISM tribal-tip store, the `tribal-by-domain-inject` surface, the per-domain tribal corpora, and the bug-finding -> wiki promotion pipeline are implementations of the theory below. **Established management/organizational-learning models are cited literature; institutional and gov-report facts are WebFetch-confirmed (marked CONFIRMED).** Claims still needing golf's domain check are marked **[owner-gate]**.

## 1. Tacit vs explicit knowledge (the core distinction the whole galaxy exists to bridge)

### Polanyi — the origin of "tacit knowledge"
**CONFIRMED** ([Tacit knowledge, Wikipedia](https://en.wikipedia.org/wiki/Tacit_knowledge)):
- Tacit (implicit) knowledge "comprises skills, ideas, and experiences that individuals possess but cannot easily articulate or codify." It contrasts with explicit knowledge — "information that can be written down, formalized, and readily transferred."
- Philosopher **Michael Polanyi** introduced "tacit knowing" in his 1958 *Personal Knowledge* and famously stated: **"we can know more than we can tell"** (*The Tacit Dimension*, 1966).
- Why it resists transfer: it "cannot be separated from the knower," is "personal and contextual," and "can only be acquired through practical experience in the relevant context." Effective transfer "generally requires extensive personal contact, regular interaction, and trust."
- Canonical examples: riding a bicycle, playing piano, facial recognition — competence the practitioner cannot fully explain.

**Design implication for tribal-knowledge:** a shop operator's "feel" for when a tool is about to chip is tacit — it cannot be fully written down. The galaxy's job is not to pretend tacit knowledge is losslessly codifiable; it is to (a) capture the *articulable* fraction as explicit tribal tips, and (b) preserve the *channel* (mentoring, side-by-side OJT) for the rest. A tribal-tip store that only holds explicit text is half a solution.

## 2. The SECI model — the canonical tacit<->explicit conversion engine

### Nonaka's four knowledge-conversion modes
**CONFIRMED** ([SECI model of knowledge dimensions, Wikipedia](https://en.wikipedia.org/wiki/SECI_model_of_knowledge_dimensions)). SECI = **Socialization, Externalization, Combination, Internalization**:
- **Socialization (tacit -> tacit):** "a process of sharing knowledge, including observation, imitation, and practice through apprenticeship." Transfers through direct interaction and physical proximity (mentorship, brainstorming).
- **Externalization (tacit -> explicit):** "the process of making tacit knowledge explicit, wherein knowledge is crystallized and is thus able to be shared by others" — via concepts, images, written documents.
- **Combination (explicit -> explicit):** "organizing and integrating knowledge, whereby different types of explicit knowledge are merged." Databases/networks combine and disseminate new explicit knowledge.
- **Internalization (explicit -> tacit):** "the receiving and application of knowledge by an individual, enclosed by learning-by-doing." Explicit knowledge becomes embodied skill through reflection and pattern recognition.
- **Ba:** "a shared context or shared space in which knowledge is shared, created, and utilized," unifying physical, virtual, and mental spaces.

**Design implication for tribal-knowledge:** the four SECI modes map directly onto the galaxy's pipeline. **Externalization** is the act of writing a tribal tip from an operator's head; **Combination** is what `tribal-embed-index` + the wiki do (merging many explicit tips into a searchable corpus); **Internalization** is `tribal-by-domain-inject` putting the right tip in front of a chat so it becomes operative know-how; **Socialization** is the human OJT that the platform can *prompt for* but never fully replace. "Ba" is the system-viz graph + slot context — the shared space where the tip is created and used.

## 3. Lessons-learned + after-action systems (how to harvest knowledge from events)

### Lessons learned — what counts as a valid lesson
**CONFIRMED** ([Lessons learned, Wikipedia](https://en.wikipedia.org/wiki/Lessons_learned)):
- Lessons learned are "experiences distilled from past activities that should be actively taken into account in future actions and behaviors."
- The NASA/ESA/JAXA formal definition (quoted on the page): **"A lesson learned is knowledge or understanding gained by experience. The experience may be positive, as in a successful test or mission, or negative, as in a mishap or failure."**
- A valid lesson must be **"significant in that it has a real or assumed impact on operations; valid in that is factually and technically correct; and applicable in that it identifies a specific design, process, or decision..."**
- The US Army Center for Army Lessons Learned "identifies, collects, analyzes, disseminates, and archives lessons and best practices" — the core identify -> collect -> analyze -> disseminate -> archive lifecycle.

### After-action review (AAR) — the structured debrief
**CONFIRMED** ([After-action review, Wikipedia](https://en.wikipedia.org/wiki/After-action_review)):
- An AAR is "a technique for improving process and execution by analyzing the intended outcome and actual outcome of an action" and identifying practices to sustain or improve.
- "Originally developed by the U.S. Army," now used across militaries and business; it "begins with a clear comparison of intended versus actual results achieved" and follows a standard structure of "four apparently simple questions."
- Critically: **"assigning blame or issuing reprimands is antithetical to the purpose of an AAR"** — and participants "take forward" lessons rather than producing recommendations for others.

**Design implication for tribal-knowledge:** PRISM's "bug-finding -> wiki gate" + the `## Recent regressions` ledger in CLAUDE.md are an AAR/lessons-learned system in disguise — intended-vs-actual (the regression), root cause (the "why"), and a stored, disseminated lesson. The "no blame" rule is why the regression entries are written as *mechanism + fix*, not "X chat broke it." The validity criteria (significant / valid / applicable) are exactly the filter a tribal-tip ingest should apply before a tip earns corpus space.

## 4. Communities of practice (how tacit knowledge actually propagates through a group)

### Lave & Wenger — domain, community, practice
**CONFIRMED** ([Community of practice, Wikipedia](https://en.wikipedia.org/wiki/Community_of_practice)):
- A community of practice is "a group of people who share a concern or a passion for something they do and learn how to do it better as they interact regularly."
- Three structural elements: **Domain** (a shared knowledge area that gives meaning and guides learning), **Community** (the social fabric of interaction and sharing), **Practice** (the specific focus around which core knowledge is developed and maintained).
- **Legitimate peripheral participation / situated learning:** newcomers "begin by observing and performing simple tasks in basic roles while learning community norms" (e.g. an apprentice electrician observes before doing), gradually taking on complex tasks and developing a shared identity.

**Design implication for tribal-knowledge:** the 34-galaxy slot fleet *is* a community-of-practice federation — each galaxy is a Domain, the chat-bus + AGENT_CHAT is the Community fabric, and the per-galaxy MEMORY.md + tribal corpus is the Practice artifact. "Legitimate peripheral participation" is the model for how a new slot/chat ramps: it reads the galaxy brain (peripheral), then contributes tips/fixes (fuller participation). Tribal knowledge propagates fastest where the community structure is healthy, not where the database is largest.

## 5. Organizational learning + the learning organization (the system-level frame)

### Argyris & Schon — single-loop vs double-loop learning
**CONFIRMED** ([Organizational learning, Wikipedia](https://en.wikipedia.org/wiki/Organizational_learning)):
- Organizational learning is "the process of creating, retaining, and transferring knowledge within an organization."
- **Single-loop learning** "occurs when an organization detects a mistake, corrects it, and carries on with its present policies and objectives." **Double-loop learning** "occurs when an organization detects a mistake and changes its policies and objectives before it can take corrective actions" (Argyris & Schon).
- A **learning organization** "actively work[s] to optimize learning" via knowledge management systems for creation, transfer, and retention.
- **Organizational memory** is "a documented repository of an organization's milestone events and learning"; **knowledge retention** concerns "the behavior of knowledge that has been embedded within the organization, characterized by the organizational memory."

**Design implication for tribal-knowledge:** a tribal tip that just patches a symptom is single-loop; a tip that promotes a *doctrine* change (e.g. "audit every consumer when you move logic into an engine") is double-loop — and PRISM's `feedback_*` memories are the double-loop layer (they change how the fleet decides, not just what it did). The galaxy IS PRISM's organizational memory; its health metric is whether learning survives staff/slot turnover (next section).

## 6. Knowledge management, retention & transfer (capturing expertise before it walks out the door)

### KM strategy — codification vs personalization
**CONFIRMED** ([Knowledge management, Wikipedia](https://en.wikipedia.org/wiki/Knowledge_management)):
- KM is "a range of processes focused on organizational awareness, learning, collaboration, and innovation... using and sharing knowledge to support an organization's goals."
- Two contrasting strategies: **Codification** — a "document-centered strategy, where knowledge is mainly codified as 'people-to-document' method" (explicit knowledge in databases); **Personalization** — "encourages individuals to share their knowledge directly" (tacit transfer through networking, tech as facilitator).
- Retention matters most when "expert knowledge workers leave the organization after a long career"; "retaining knowledge prevents losing intellectual capital."

### Knowledge retention — DeLong's four strategy categories
**CONFIRMED** ([Knowledge retention, Wikipedia](https://en.wikipedia.org/wiki/Knowledge_retention)):
- Knowledge retention "helps convert tacit form of knowledge into an explicit form... aims to reduce the knowledge loss in the organization."
- Per DeLong (2004), retention strategies fall into four categories: **(1) human resources, processes and practices; (2) knowledge transfer practices; (3) knowledge recovery practices; (4) information technologies used to capture, store and share knowledge.**
- Specific methods named: documentation/transfer before departure ("sharing documents, shadowing, mentoring"), knowledge mapping, mentoring/job shadowing, master-apprentice arrangements, and "defining core knowledge for each role."

### Knowledge transfer — why tacit transfer is hard
**CONFIRMED** ([Knowledge transfer, Wikipedia](https://en.wikipedia.org/wiki/Knowledge_transfer)):
- Knowledge transfer is "the transfer of facts or practical skills from one entity to another," requiring "intention from both sides."
- The core difficulty: "The inability to recognize and articulate 'compiled' or highly intuitive competencies — tacit knowledge," compounded by a "Knowledge is power" mentality, distance, and the recipient's absorptive capacity.
- Supporting mechanisms: **mentorship, community of practice, work shadowing, paired work, guided experience, simulation, narrative transfer** — and "direct, personal contact between the source and recipient."

### Gov + free-course grounding (knowledge loss is a real, expensive, documented risk)
- **CONFIRMED — gov report** ([GAO-05-585, "Human Capital: Selected Agencies Have Opportunities to Enhance Existing Succession Planning and Management Efforts"](https://www.gao.gov/products/gao-05-585)): the US GAO found that "**Leading organizations go beyond a succession planning approach that focuses on replacing individuals and engage in broad, integrated succession planning and management efforts that focus on strengthening current and future organizational capacity.**" Structured succession planning is GAO's recommended hedge against institutional-knowledge gaps when experienced staff retire — the federal-scale validation that knowledge retention is a measured operational risk, not a soft nicety.
- **CONFIRMED — free university courseware** ([MIT OpenCourseWare 15.668 "People and Organizations", Sloan School](https://ocw.mit.edu/courses/15-668-people-and-organizations-fall-2010/pages/lecture-notes/)): a free/open (CC-licensed, "no enrollment or registration") MIT OCW course whose stated aim is "to explore how to put the scientific, technical and organizational knowledge learned at MIT to work in addressing the major challenges facing management and organizations today" — i.e. the explicit->tacit (Internalization) leg of SECI applied to real org problems. The free structured corpus PRISM can cite when grounding its organizational-learning surfaces.

**Design implication for tribal-knowledge:** PRISM is overwhelmingly a **codification**-strategy KM system (people -> documents -> embeddings -> injection). The theory above is a warning: codification alone loses the tacit fraction. The galaxy should pair every codified tip with a *personalization* pointer (who/what mentored it, which OJT context) and treat knowledge retention as a turnover-survival metric — the tribal corpus is healthy only if a brand-new slot can become productive from it, which is exactly DeLong category (4) + the GAO succession-planning frame.

## Owner-gate (NOT promoted)

The following remain **[owner-gate]** for golf to bind against PRISM's actual tribal stores before any engine/skill/hook hardcodes them — left here as named gaps, not asserted facts:
- **Tip-validity thresholds.** The "significant / valid / applicable" lesson-validity criteria (section 3) are the right *filter shape*, but the concrete acceptance thresholds for a tribal tip earning corpus space (min citation, domain-tag confidence, dedup distance) must come from the live `tribal-embed-index` + ingest rules, not from this entry.
- **SECI-to-pipeline exact wiring.** The mapping of the four SECI modes onto specific PRISM surfaces (section 2 design note) is a sound analogy but is asserted by reasoning, not verified against each surface's code — golf should confirm `tribal-by-domain-inject`, `tribal-rerank`, and the wiki promotion path actually implement Externalization/Combination/Internalization as described before this is treated as architecture truth.
- **Retention-as-turnover metric.** The claim that "a new slot can become productive from the corpus" is the right health metric (section 6) is doctrine, not a measured number — no live turnover-survival score exists yet; do not cite one until golf produces it.
- **No safety thresholds in this entry.** This is a knowledge-management foundations entry; it intentionally carries NO machining/physics safety values (feeds/speeds/S(x) limits). Any safety-relevant tribal tip stays governed by the physics-constants + `prism_safety` gates, never by this document.

## Sources (distinct URLs WebFetch-confirmed for this entry, 2026-06-10)

> Each URL below was fetched + confirmed while authoring this entry. Categories deliberately span reference (Wikipedia management-science articles grounded in named primary theorists), one **gov report** (US GAO), and one **free university courseware** page (MIT OCW). No paywalled/pirated sources.

- **SECI model of knowledge dimensions** (Nonaka; tacit<->explicit conversion) — https://en.wikipedia.org/wiki/SECI_model_of_knowledge_dimensions
- **Tacit knowledge** (Polanyi, "we can know more than we can tell") — https://en.wikipedia.org/wiki/Tacit_knowledge
- **Community of practice** (Lave & Wenger; domain/community/practice; legitimate peripheral participation) — https://en.wikipedia.org/wiki/Community_of_practice
- **After-action review** (US Army origin; intended-vs-actual; no-blame) — https://en.wikipedia.org/wiki/After-action_review
- **Lessons learned** (NASA/ESA/JAXA definition; CALL identify->archive lifecycle) — https://en.wikipedia.org/wiki/Lessons_learned
- **Organizational learning** (Argyris & Schon single/double-loop; organizational memory) — https://en.wikipedia.org/wiki/Organizational_learning
- **Knowledge management** (codification vs personalization; expertise capture) — https://en.wikipedia.org/wiki/Knowledge_management
- **Knowledge retention** (DeLong's four retention-strategy categories) — https://en.wikipedia.org/wiki/Knowledge_retention
- **Knowledge transfer** (tacit-transfer difficulty; mentorship/CoP/narrative mechanisms) — https://en.wikipedia.org/wiki/Knowledge_transfer
- **GAO-05-585** (gov report — succession planning + institutional-knowledge loss) — https://www.gao.gov/products/gao-05-585
- **MIT OpenCourseWare 15.668 "People and Organizations"** (free university courseware) — https://ocw.mit.edu/courses/15-668-people-and-organizations-fall-2010/pages/lecture-notes/

> Not promoted (fetch failed or wrong content — left out per R12): NASA LLIS landing page https://llis.nasa.gov/ (returned only the bare word "Llis", no usable text); GAO-22-105187 (turned out to be the CyberCorps scholarship report, not KM); Open University OpenLearn "Managing knowledge and the learning organisation" content-section-0 (HTTP 404); MIT OCW 15.322 Organizational Leadership and Change spring-2003 page (HTTP 404).
