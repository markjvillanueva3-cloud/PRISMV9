---
title: Tribal-Knowledge Applied Practice — the practitioner gotchas of capturing, storing, and surfacing know-how (externalization bottleneck, write-only memory, silos, expert departure, stale tips, recall gap)
galaxy: tribal-knowledge
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice-meta (2026-06-10)"
verification_method: knowledge-management + CS-information-retrieval practitioner gotchas WebFetch-confirmed against free/reference sources (SECI externalization, Polanyi tacit articulation via knowledge-transfer barriers, information/knowledge silo, after-action review practice, knowledge retention before departure, organizational memory storage-vs-retrieval + corporate amnesia, single-source-of-truth duplicate drift, precision/recall false-negative, software/documentation rot). Each gotcha is the failure mode + WHY + the expert avoidance, then mapped to how the tribal-knowledge galaxy hits it. Established theory/CS definitions asserted with citation; PRISM-internal benchmark numbers (clobber-recovery counts, recall hit-rates, embed sizes) remain owner-gated.
tags: [tribal-knowledge, applied-practice, knowledge-management, tacit-knowledge, externalization, SECI, knowledge-silo, after-action-review, knowledge-retention, expert-departure, organizational-memory, corporate-amnesia, single-source-of-truth, precision-recall, recall-gap, software-rot, documentation-decay, gotchas]
---

# Tribal-Knowledge Applied Practice

The **practitioner** layer for the **tribal-knowledge** galaxy: the hard-won gotchas, failure modes, and technique decisions that the [theory entry](tribal-knowledge-foundations.md) does not teach. Read foundations first — it covers *what the models say* (SECI, communities of practice, single/double-loop, DeLong retention). This entry is the opposite axis: **what actually goes wrong when you try to capture know-how, and how an expert avoids it.** The recurring PRISM lesson — visible in this repo's own `## Recent regressions` ledger — is that a knowledge system fails not for lack of *content* but at the **edges**: the moment tacit knowledge is articulated, the moment a tip is retrieved (or isn't), the moment a stored fact's context changes underneath it. Each gotcha below is mapped to where the tribal-knowledge galaxy itself is exposed.

> **Honesty note (R12):** every CS/management claim below was WebFetch-confirmed against a free/reference source while authoring (see `## Sources`). PRISM-internal numbers (clobber-loss counts, recall hit-rates, index byte-sizes) are NOT asserted here — they live in the live stores and are owner-gated to golf.

---

## 1. The capture edge — articulating tacit knowledge is the bottleneck, not the database

### Gotcha 1.1 — "Externalization" is the step that silently drops most of the value
**WHY** ([SECI model, Wikipedia](https://en.wikipedia.org/wiki/SECI_model_of_knowledge_dimensions)): externalization is "the process of making tacit knowledge explicit, wherein knowledge is crystallized and is thus able to be shared by others, becoming the basis of new knowledge" — supported by "concepts, images, and written documents." The trap is that crystallization is **lossy**: the operator's "feel" for an impending tool chip becomes, at best, a sentence. The expensive part of tribal knowledge is precisely the part that does not survive the write.
**EXPERT AVOIDANCE:** treat the written tip as a *pointer to* the tacit source, not a replacement for it — capture WHO knew it and the CONTEXT it was learned in, so a reader can go re-acquire the tacit fraction by contact, not just read the lossy summary. Capture the *trigger* ("when X happens") not only the *conclusion*.
**PRISM hit:** a tribal tip stored as bare text (no domain context, no provenance, no triggering condition) is half-externalized — `tribal-embed-index` can retrieve the words but the reader can't reconstruct *when* the tip applies. Tips need a triggering-condition field, not just a body.

### Gotcha 1.2 — the articulation barrier: experts genuinely cannot state their best knowledge
**WHY** ([Knowledge transfer, Wikipedia](https://en.wikipedia.org/wiki/Knowledge_transfer)): the headline barrier to transfer is "the inability to recognize and articulate 'compiled' or highly intuitive competencies — tacit knowledge." It is not laziness; compiled skill is unavailable to introspection. Asking "write down everything you know" yields the *explicable* surface, never the compiled core.
**EXPERT AVOIDANCE:** harvest tacit knowledge from *events*, not interviews — capture the tip at the moment a real decision/failure exposes it (work-shadowing, paired work, narrative), when the expert is forced to articulate the previously-compiled rule. The galaxy's bug-finding -> wiki gate is exactly this: a regression *forces* the articulation that a "please document your knowledge" prompt never would.
**PRISM hit:** the richest tribal entries in this repo are the `## Recent regressions` rows — each was articulated *because a real failure made the implicit rule explicit*. A periodic "dump your knowledge" pass would not have produced them.

### Gotcha 1.3 — "Knowledge is power" hoarding and weak absorptive capacity quietly defeat capture
**WHY** ([Knowledge transfer, Wikipedia](https://en.wikipedia.org/wiki/Knowledge_transfer)): transfer is blocked by "organizational culture non-conducive to knowledge sharing (the 'Knowledge is power' culture)" and by the limited "capabilities of the receptor to interpret and absorb knowledge." A perfect tip is inert if the source won't share or the recipient can't absorb it.
**EXPERT AVOIDANCE:** make sharing the path of least resistance (capture inline at the work, no separate ritual) and meet the recipient's absorptive capacity — domain-tag and rank tips so the *right* reader sees a tip they can act on, not a firehose.
**PRISM hit:** `tribal-by-domain-inject` surfacing top-3 *by slot domain* is an absorptive-capacity move — a mill-slot chat gets mill tips it can use, not 30,000 undifferentiated entries it would ignore.

---

## 2. The storage edge — captured is not the same as retained, and copies drift

### Gotcha 2.1 — duplicated knowledge copies diverge and go stale (the SSOT failure)
**WHY** ([Single source of truth, Wikipedia](https://en.wikipedia.org/wiki/Single_source_of_truth)): when a fact lives in more than one place, "the master data is copied and the copies are updated; this needs a reconciliation mechanism when there are concurrent updates." Without a single canonical home you get "retrieval of outdated, and therefore incorrect, information" and "a duplicate value/copy somewhere being forgotten." Two copies of a tip edited independently become two *contradictory* tips.
**EXPERT AVOIDANCE:** every fact has exactly one canonical home; everything else is a generated pointer to it. When you must duplicate, generate the copy from the source so it can never drift.
**PRISM hit:** this repo's own regressions are SSOT failures — e.g. the runout life **double-count** (an engine fix met an obsolete *copy* of the same derate logic in a consumer) and repeated "fix stale comment / stale test / doc-drift" commits. A tribal tip duplicated into a galaxy MEMORY.md *and* the embed index *and* a CLAUDE.md pointer must be single-sourced, or one will rot while the others say otherwise.

### Gotcha 2.2 — a fail-open "start fresh" on a read error can destroy the corpus
**WHY** (general fail-loud discipline; corroborated by [Organizational memory, Wikipedia](https://en.wikipedia.org/wiki/Organizational_memory): "organizational memory can only be applied if it can be accessed" — but a write path that *replaces* an unreadable store with an empty one removes the very memory it was supposed to guard). A `catch -> return empty` on an existing populated corpus, followed by a write, is silent total destruction.
**EXPERT AVOIDANCE:** reads of an *existing* store must **fail loud**, never fall back to empty-then-write; guard writes against catastrophic shrink over a populated store.
**PRISM hit:** directly observed in this repo — a fail-OPEN read clobbered the tribal brain to a single-entry stub, and a shard-transition read-blindness dropped tens of thousands of entries (both in `## Recent regressions`). The fix in both cases was the same: fail loud on an existing-but-unreadable index + a clobber/shrink guard. This is the galaxy's most expensive recurring failure mode.

### Gotcha 2.3 — knowledge must be retained BEFORE the expert departs, not after
**WHY** ([Knowledge retention, Wikipedia](https://en.wikipedia.org/wiki/Knowledge_retention)): "knowledge retention is needed when expert knowledge workers leave the organization after a long career"; the methods named — "shadowing, mentoring" and documentation — only work *while the expert is still present*. Wait until the exit interview and the tacit fraction is already gone.
**EXPERT AVOIDANCE:** continuous capture-in-flight (knowledge mapping + capture at the moment of work) so departure is a non-event; never let a single node be the sole holder of a critical rule.
**PRISM hit:** an agent slot/chat is an "expert that departs" every session boundary and every `/compact`. The handoff + auto-memory + Obsidian feed exist precisely so a slot's session knowledge is retained *before* the context window closes — the agent-era analogue of capturing before the expert walks out.

---

## 3. The retrieval edge — write-only memory is the default failure of every KM system

### Gotcha 3.1 — organizational memory is useless if it can't be retrieved (storage != access)
**WHY** ([Organizational memory, Wikipedia](https://en.wikipedia.org/wiki/Organizational_memory)): "organizational memory can only be applied if it can be accessed." The classic KM failure is the write-only repository — lessons faithfully captured into a store nobody queries at decision time. Capture effort feels productive; the payoff (a tip *surfaced when it's needed*) is the part that quietly never happens.
**EXPERT AVOIDANCE:** measure the system on *retrieval at point-of-need*, not on entry count. A lesson that is not pushed in front of the decision it should change is functionally not retained.
**PRISM hit:** the entire `tribal-by-domain-inject` / `tribal-rerank` surface is an answer to write-only memory — it *pushes* tips into the prompt context instead of waiting to be queried. The corpus's true health metric is injection-at-need, not the 30k entry count.

### Gotcha 3.2 — indexed but never surfaced: the recall miss (false negative)
**WHY** ([Precision and recall, Wikipedia](https://en.wikipedia.org/wiki/Precision_and_recall)): recall is "the fraction of relevant instances that were retrieved." A relevant tip can be present in the collection yet **missed** — a false negative — and there is "an inverse relationship between precision and recall." Tighten the surface to avoid noise (precision) and you start dropping relevant tips (recall) with no error raised. The miss is invisible: nothing fails, the right tip simply never appears.
**EXPERT AVOIDANCE:** monitor recall explicitly (does the known-relevant tip surface for a known query?), and pick the precision/recall balance deliberately per use — a safety-relevant tip leans toward recall (surface it even at the cost of noise), like a smoke detector.
**PRISM hit:** a tip can be embedded in `tribal-embed-index` and still never reach a chat because the injection gate's similarity threshold scored it just under the cut — a pure recall miss, no error. Tuning the inject threshold *is* choosing a point on the precision/recall curve; the galaxy should verify recall against a known-tip/known-query set, not just trust the embed succeeded.

### Gotcha 3.3 — silos: a tip captured in one galaxy is invisible to the galaxy that needs it
**WHY** ([Information silo, Wikipedia](https://en.wikipedia.org/wiki/Information_silo)): a silo is "an insular management system in which one information system or subsystem is incapable of reciprocal operation with others"; the result is that information "has no effect outside" its system, so teams "unknowingly replicate efforts and valuable insights remain inaccessible to decision-makers," and silos "lead to poorer performance." Knowledge that exists but cannot cross a boundary is, for the boundary's far side, knowledge that does not exist.
**EXPERT AVOIDANCE:** cross-link domains deliberately (shared index, federation digest) so a relevant tip from a neighboring domain is reachable; flatten the retrieval path so "my galaxy's store" becomes "the fleet's store, scoped to my domain."
**PRISM hit:** 34 per-galaxy tribal corpora are 34 candidate silos. The master-index / galaxy-federation digest is the anti-silo layer — without it a lathe lesson that also applies to mill stays trapped. R8 ("read the immediate caller + shared utilities before writing") is the per-edit anti-silo rule.

---

## 4. The decay edge — knowledge that was true rots as its context shifts

### Gotcha 4.1 — stale tips: documentation decays even when nobody edits it
**WHY** ([Software rot, Wikipedia](https://en.wikipedia.org/wiki/Software_rot)): software/documentation degrades "over time, even when the code itself remains unchanged," because the surrounding environment shifts; and "without documentation... specific knowledge pertaining to parts of the program [can] be lost," with old docs becoming "misleading due to subtle differences." A tribal tip is a fact frozen at a moment; the world it described keeps moving, so a once-correct tip silently becomes wrong.
**EXPERT AVOIDANCE:** date-stamp every tip and check freshness *before relying on it* — a tip past a staleness horizon must be re-validated against current reality, not trusted because it's in the corpus. Tie tips to the artifact they describe so a change to the artifact flags the tip.
**PRISM hit:** PRISM already encodes this as R13 task-freshness (check gen-date vs fleet activity before building) and the directive that "any directive >7 days stale must be re-validated against current code." A tribal tip referencing a retired model tag or a renamed engine is the canonical stale-tip; the galaxy needs a freshness check on inject, not just on ingest.

### Gotcha 4.2 — "corporate amnesia": flexible turnover imposes Alzheimer's-like memory loss
**WHY** ([Organizational memory, Wikipedia](https://en.wikipedia.org/wiki/Organizational_memory)): "the actively encouraged flexible labor market has imposed an Alzheimer's-like corporate amnesia on organizations that creates an inability to benefit from hindsight." High turnover without retention means the organization keeps re-learning the same lesson — paying the failure cost repeatedly.
**EXPERT AVOIDANCE:** make the lesson outlive the individual — promote a recurring lesson from a one-off fix into a *doctrine* that changes future behavior (double-loop, per foundations §5), so the rule survives the person who learned it.
**PRISM hit:** the `feedback_*` memories are PRISM's hedge against amnesia — they are doctrine, not incident logs, so a lesson learned by one slot constrains every future slot. A regression that recurs across sessions is a sign a fix stayed single-loop (patched the symptom) instead of becoming a `feedback_*` doctrine.

### Gotcha 4.3 — reluctance to admit mistakes corrupts the record at the source
**WHY** ([Organizational memory, Wikipedia](https://en.wikipedia.org/wiki/Organizational_memory)): "individuals' reluctance to admit to mistakes and difficulties compounds the problem" of accurate organizational memory. If recording a lesson feels like assigning blame, the most valuable (failure-derived) lessons go uncaptured or get sanitized into uselessness.
**EXPERT AVOIDANCE:** run capture blame-free — per [After-action review, Wikipedia](https://en.wikipedia.org/wiki/After-action_review), "assigning blame or issuing reprimands is antithetical to the purpose of an AAR," and the review needs "a suitable safe private environment" and "the assumption of equality of everybody present." Write lessons as *mechanism + fix*, never as "who broke it." Run the review promptly after the event, while detail is fresh.
**PRISM hit:** this repo's `## Recent regressions` entries are deliberately written as **root cause + fix + verify**, not attribution — that is the no-blame AAR discipline applied to a code corpus, and it is *why* agents are willing to log their own failures into the permanent record.

---

## Owner-gate (NOT promoted)

The following stay **[owner-gate]** for golf to bind against PRISM's live tribal stores before any engine/skill/hook hardcodes a value — named gaps, not asserted facts:
- **Recall hit-rate + inject threshold (Gotcha 3.2).** The precision/recall *shape* is confirmed theory, but the actual `tribal-rerank` similarity cutoff, the known-tip/known-query recall test set, and the measured surface-at-need rate must come from the live inject pipeline — no number is asserted here.
- **Clobber/shrink-guard thresholds (Gotcha 2.2).** That fail-open reads destroyed the corpus is documented in this repo's regressions; the specific shrink-percentage guard and the byte-size shard-transition boundary are implementation values owned by the live `tribal-embed-index` / loader, not this entry.
- **Staleness horizon for tips (Gotcha 4.1).** The "re-validate stale tips before relying on them" rule is doctrine; the concrete per-domain staleness horizon (days) and the artifact-change -> tip-flag wiring must be set against the live corpus, not guessed here.
- **SECI-edge-to-surface exact wiring (Gotcha 1.1 / 3.1).** The mapping of externalization-loss and write-only-memory onto specific PRISM surfaces (`tribal-by-domain-inject`, the bug-finding -> wiki gate, the triggering-condition field proposal) is sound reasoning but is asserted by analogy — golf should confirm against each surface's code before treating it as architecture truth.
- **No safety thresholds in this entry.** This is a knowledge-management practitioner entry; it carries NO machining/physics safety values. Any safety-relevant tribal tip stays governed by `src/physics/constants.ts` + the `prism_safety` gates, never by this document.

## Sources (distinct URLs WebFetch-confirmed for this entry, 2026-06-10)

> Each URL was fetched + confirmed while authoring. Sources are free/reference only (Wikipedia management-science + CS-information-retrieval articles grounded in named theory and standard definitions). No paywalled/pirated sources. Foundations-entry sources are NOT re-listed; this entry's theory leans on the same SECI/transfer/retention/AAR base but cites the *practitioner-gotcha* passages, plus three CS-engineering sources (SSOT, precision/recall, software rot) not used by foundations.

- **SECI model of knowledge dimensions** (externalization = lossy crystallization of tacit knowledge) — https://en.wikipedia.org/wiki/SECI_model_of_knowledge_dimensions
- **Knowledge transfer** (articulation barrier; "knowledge is power" hoarding; recipient absorptive capacity; distance) — https://en.wikipedia.org/wiki/Knowledge_transfer
- **Single source of truth** (duplicated copies drift; "outdated, and therefore incorrect" retrieval) — https://en.wikipedia.org/wiki/Single_source_of_truth
- **Organizational memory** ("can only be applied if it can be accessed"; corporate amnesia; reluctance to admit mistakes) — https://en.wikipedia.org/wiki/Organizational_memory
- **Knowledge retention** (retain BEFORE departure; shadowing/mentoring while present) — https://en.wikipedia.org/wiki/Knowledge_retention
- **Precision and recall** (recall = fraction of relevant retrieved; false-negative miss; precision/recall tradeoff) — https://en.wikipedia.org/wiki/Precision_and_recall
- **Information silo** (insular system; knowledge "has no effect outside"; duplicated effort; poorer performance) — https://en.wikipedia.org/wiki/Information_silo
- **Software rot** (degradation as environment shifts; documentation decay; misleading stale docs) — https://en.wikipedia.org/wiki/Software_rot
- **After-action review** (no-blame; safe environment + equality; prompt timing) — https://en.wikipedia.org/wiki/After-action_review

> Not promoted (fetch returned no usable critique — left out per R12): the **Lessons learned** article (https://en.wikipedia.org/wiki/Lessons_learned) was fetched but contained no practitioner-failure-mode text (write-only/findability critiques absent), so its retrieval-gotcha role was covered instead by the confirmed Organizational-memory "can only be applied if it can be accessed" passage.
