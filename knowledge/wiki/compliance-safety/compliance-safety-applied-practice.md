---
title: Compliance-Safety Applied Practice — fail-open vs fail-closed, single-point-of-failure, audit-trail gaps, alarm fatigue, ALARP/risk-matrix misuse, defense-in-depth collapse
galaxy: compliance-safety
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice-meta (2026-06-10)"
verification_method: each practitioner gotcha below is WebFetch-confirmed against a reputable free/legal source (Wikipedia engineering/security articles citing primary literature, NIST CSRC glossary terms backed by CNSSI 4009-2015 / NIST SP 800-37/53/171). Risk-matrix limitations are confirmed against the published Cox / Thomas-Bratvold-Bickel critiques as summarized by the source. NO numeric safety threshold (S(x), Omega, Cpk gate, SIL band, exposure limit, false-alarm rate cut) is promoted — methodology/failure-mode only; numbers stay owner-gated (see Owner-gate). Distinct from compliance-safety-foundations.md (theory), which was read first to avoid repetition.
tags: [compliance-safety, applied-practice, tribal-knowledge, fail-open, fail-closed, fail-safe, fail-secure, single-point-of-failure, redundancy, audit-trail, traceability, alarm-fatigue, ALARP, risk-matrix, defense-in-depth, NIST, OSHA, IEC-61508, gotchas, failure-modes]
---

# Compliance-Safety Applied Practice

The **practitioner-knowledge** layer for the **compliance-safety** galaxy (owner: golf): the hard-won safety-engineering gotchas, failure modes, and technique decisions that the theory in [[compliance-safety-foundations]] does not teach. Foundations answers *what the method is*; this entry answers *what goes wrong in practice and how an expert avoids it*. Every claim below is WebFetch-confirmed against a free/legal source and cited inline. Each gotcha ends with one line mapping it onto how THIS galaxy (PRISM's `S(x)` gate + alarm/compliance surfaces + audit-trail spine) hits it.

> SAFETY-CRITICAL SCOPE NOTE: this entry promotes **only the qualitative method / failure-mode**. No numeric safety threshold — `S(x)` pass cut, Omega target, Cpk floor, SIL probability band, occupational exposure limit, or false-alarm-rate cutoff — is copied from any source into the wiki. Where a number would belong, the method is stated and the value is routed to `## Owner-gate (NOT promoted)`.

## 1. The failure default — fail-OPEN vs fail-CLOSED (the recurring PRISM bug class)

### G1 — "Fail-safe" is meaningless until you name the safe state
**Gotcha.** A gate labeled "fail-safe" is undefined until you say what *safe* is for that system. Wikipedia's [Fail-safe](https://en.wikipedia.org/wiki/Fail-safe) article makes the dependence concrete with the same physical door: in a fire, a **fail-safe** design "would unlock doors to ensure quick escape," while a **fail-secure** design "would lock doors to prevent unauthorized access" — opposite behaviors, both correctly called the right default *for their own goal*. The expert's avoidance: never accept the label "fail-safe"; demand the *concrete failure state* and prove it matches the actual hazard (escape-from-fire wants open; protect-the-vault wants closed).
**WHY:** the word "safe" smuggles in an assumption about which outcome is worse. Get the goal wrong and the "fail-safe" mechanism actively causes the harm it was named to prevent.
**Galaxy hit:** for a manufacturing gate, the worse outcome is *running an unverified job*, so the safe state is DENY/STOP — the `S(x)` gate must fail-CLOSED. A gate that "passes on error" inverts the door analogy.

### G2 — A safety gate that fails OPEN is a non-gate
**Gotcha.** The NIST CSRC glossary defines [fail-safe](https://csrc.nist.gov/glossary/term/fail_safe) (CNSSI 4009-2015) as "a mode of termination of system functions that **prevents damage** to specified system resources and system entities when a failure occurs or is detected" — i.e. on a fault, the system *terminates the protected function*, it does not wave it through. A check whose error/exception path returns "allow" (`catch { return pass }`) provides exactly zero protection precisely when it is most needed — when something already went wrong. The expert's avoidance: the default branch and every exception handler in a safety check return DENY/abstain, and the "allow" verdict is only ever reached by an *affirmative, evidenced* success path.
**WHY:** errors cluster at the dangerous inputs (malformed program, missing units, novel material). A fail-open catch silently green-lights the exact cases the gate exists to stop, and the failure is invisible because the surface returns "pass."
**Galaxy hit:** this is the documented PRISM bug class — `fail-OPEN read CLOBBERED the tribal brain` and `fail-OPEN parity divergence in CIMCO` (see CLAUDE.md §Recent regressions). The compliance-safety rule: a `catch` on a safety-relevant path must fail loud + fail closed, never `return empty`/`return pass`.

### G3 — The dangerous default is also the *convenient* one
**Gotcha.** Fail-open is attractive because it preserves availability — the system keeps working when the safety component is down. The same [Fail-safe](https://en.wikipedia.org/wiki/Fail-safe) framing shows the trade is real (a motorized security gate stays *fail-secure/locked* on power loss for security, but is deliberately switched to *fail-safe/open* when it must let the fire department in — the operator consciously chooses which value to sacrifice). The expert's avoidance: make the availability-vs-safety choice **explicit and logged**, not an accident of where the `try/catch` happened to land. If a degraded "allow" is genuinely required, it is an operator-authorized, audited exception with a named owner — not the silent default.
**WHY:** "it kept working" feels like success and gets shipped; the suppressed safety check is discovered only after an incident.
**Galaxy hit:** PRISM already encodes this — `PRISM_ALLOW_UNWIRED=1` is a *logged, named* bypass of the orphan gate, not a silent code path. A degraded compliance-safety mode must follow the same pattern (explicit env knob + audit entry), never an unmarked fall-through.

## 2. Single point of failure + defense-in-depth collapse

### G4 — One check carrying the whole gate is a single point of failure
**Gotcha.** Wikipedia defines a [single point of failure](https://en.wikipedia.org/wiki/Single_point_of_failure) as "a part of a system that would stop the entire system from working if it were to fail," and notes a SPOF "produces a potential interruption ... substantially more disruptive than an error would be elsewhere"; "highly reliable systems should not rely on any such individual component." The expert's avoidance: identify "the critical components ... that would provoke a total systems failure in case of malfunction" and add redundancy so no single check is load-bearing.
**WHY:** a lone gate has no second opinion — its bug, its blind spot, or its bypass is the whole system's bug, blind spot, or bypass.
**Galaxy hit:** the foundations entry already lists PRISM's independent layers (hazard-ID, `S(x)`, the alarm surface, the hierarchy-of-controls recommendation, the audit trail). Applied rule: if all confidence sits in one engine's verdict, that engine *is* the SPOF — flag it.

### G5 — Defense-in-depth with non-independent layers is one layer wearing a costume
**Gotcha.** [Defense in depth (computing)](https://en.wikipedia.org/wiki/Defense_in_depth_(computing)) places "multiple layers of security controls" so that "in the event that one layer of defence fails, defense in depth aims to ensure ... security via a second-line of defence" — but the protection is real only when the layers are "several **independent** methods." If layer B fails for the *same* reason layer A failed (shared library, shared assumption, shared input parser, same author's same blind spot), B adds cost, not coverage — both fall to one root cause. The expert's avoidance: deliberately *heterogeneous* layers — different data source, different algorithm, different failure trigger — and a test that kills layer A to prove layer B still catches the hazard.
**WHY:** correlated failure is invisible on paper (the architecture diagram shows N boxes) and only shows up when a single common-mode fault takes down everything labeled "redundant."
**Galaxy hit:** a compliance-safety design that runs the "same" check twice (e.g. two consumers reading the same field with the same parser) is the `runout double-count` shape inverted — co-varying layers cancel to one. Independence must be proven, not assumed (R8: read the other consumer before trusting it as a second layer).

## 3. Audit-trail gaps break the traceability they exist to provide

### G6 — An audit log with gaps cannot reconstruct the sequence — and a gap is silent
**Gotcha.** NIST CSRC defines an [audit log](https://csrc.nist.gov/glossary/term/audit_log) (CNSSI 4009-2015; NIST SP 800-37/53/171) as "a **chronological record** of system activities ... records of system accesses and operations performed in a given period," whose value is "documentary evidence of specific events." The whole point — reconstruct *who/what/when* from initiation to completion ([Audit trail](https://en.wikipedia.org/wiki/Audit_trail), foundations §6) — collapses if any link is missing: you cannot prove a sequence you did not record, and the absence of a record looks identical to "nothing happened." The expert's avoidance: write the durable audit record **before** the action it attests to (write-ahead), so a crash mid-action leaves evidence, not a hole; and detect gaps actively (sequence numbers / monotonic cursors) rather than trusting that "no entry" means "no event."
**WHY:** audit gaps are not loud errors — they are missing rows. A gate decision with no log entry is unprovable after the fact, which defeats accountability exactly when an incident demands it.
**Galaxy hit:** PRISM learned this concretely — the OCR closed-loop wrote its cursor *after* the durable rows and the `outcome-bus EPERM` append leak dropped records; both are audit-gap failures. Compliance-safety rule: the gate's decision record is appended (O_APPEND / write-ahead) before the gate returns, never batched-and-lost on a reaper kill.

### G7 — A mutable / non-privileged audit log is evidence you cannot trust
**Gotcha.** Foundations §6 already cites that audit logs should run "privileged / tamper-resistant so they remain reliable." The practitioner corollary: if the same actor that performs the gated action can also rewrite the log of it, the log proves nothing — it records only what the actor chose to leave. The expert's avoidance: append-only storage, separate write authority from the audited subject, and a tamper-evident chain so a deletion or edit is itself detectable.
**WHY:** an attacker (or a buggy writer) that can clobber the record erases its own trail; "the log is clean" then means nothing.
**Galaxy hit:** the tribal-brain `clobber-guard` (refuse a >50% shrink over a populated store) is this principle applied to a knowledge store — a safety audit ledger needs the same shrink/overwrite guard so a fail-open writer cannot silently truncate the history that proves gate decisions.

## 4. Alarm fatigue — too many warnings means none are heard

### G8 — A flood of alarms trains the operator to ignore the real one
**Gotcha.** [Alarm fatigue](https://en.wikipedia.org/wiki/Alarm_fatigue) is workers becoming "desensitized to safety alerts" so they "ignore or fail to respond appropriately to such warnings" — caused by excessive alarms, "particularly false alarms," that "lose the urgency and attention-grabbing power which they are intended to have." The documented harm is severe: the FDA recorded hundreds of deaths from ignored monitor alarms (2005-2008). The expert's avoidance: cut non-actionable alarms aggressively — every alarm that fires must demand an action, or it is *training the operator to mute the next one* (including the true positive).
**WHY:** desensitization is a human response to a noisy channel; you cannot "policy" your way past it while the false-alarm rate stays high. More warnings is negative safety past the saturation point.
**Galaxy hit:** a compliance-safety surface that emits a P2/P3 advisory on every build is manufacturing its own alarm fatigue — the cry-wolf pattern PRISM already fixed (`re-base gate to file-mtime — dir-mtime was cry-wolf`). Rule: an alarm with no clear required action is a candidate for removal, not promotion.

### G9 — Operators "fix" alarm fatigue with dangerous workarounds
**Gotcha.** The same [Alarm fatigue](https://en.wikipedia.org/wiki/Alarm_fatigue) source documents the predictable human response: staff engage in "dangerous workarounds: turning down alarm volumes or adjusting device settings," which "lead to missed critical events." The Joint Commission's named mitigations are organizational — "establish guidelines to tailor alarm settings," "train clinical teams on safe alarm use," and "share information about alarm-related incidents." The expert's avoidance: design the alarm system so the *easy* path is the safe one (sensible defaults, per-context tailoring) — because if silencing is easier than acting, operators will silence, and the safety value goes to zero.
**WHY:** a control that depends on humans not taking the convenient shortcut will be defeated by humans taking the convenient shortcut; the workaround disables the real alarm along with the noise.
**Galaxy hit:** if a PRISM safety warning is bypassed via a blanket env flag or a habitual dismiss, that is the volume-knob workaround. The fix is reducing false positives at the source (so the alarm is worth keeping on), not louder alarms or harder-to-dismiss UI.

## 5. ALARP misapplication + risk-matrix misuse (the scoring surface lies if you trust the cell)

### G10 — Risk matrices have poor resolution and produce arbitrary rankings
**Gotcha.** The likelihood x consequence matrix (foundations §1) is a prioritization *aid*, not a measurement. [Risk matrix](https://en.wikipedia.org/wiki/Risk_matrix) summarizes Tony Cox's result that "risk matrices can correctly and unambiguously compare only a small fraction (e.g., less than 10%) of randomly selected pairs of hazards," can "assign identical ratings to quantitatively very different risks" (range compression), and can "mistakenly assign higher qualitative ratings to quantitatively smaller risks." Thomas/Bratvold/Bickel further show rankings "depend upon the design of the risk matrix itself" (bin sizes, scale direction) and that "different users may obtain opposite ratings of the same quantitative risks." The expert's avoidance: treat the matrix cell as a *coarse triage bucket*, never as a comparator — do not aggregate, subtract, or fine-rank two hazards by their cells, and re-check borderline items with quantitative analysis.
**WHY:** the categorical compression that makes a matrix readable also destroys the information needed to compare risks; confident decisions built on cell color are built on an artifact of the matrix design.
**Galaxy hit:** any PRISM scoring surface that maps risk to a discrete band inherits this — the *band shape* is fine for "mitigate now vs tolerable," but ordering jobs by score-within-band is the trap. The cut value that flips tolerable to unacceptable stays owner-gated; the lesson here is that the cell does not carry enough information to rank *within* it.

### G11 — ALARP is an asymmetric duty, not a cost/benefit average
**Gotcha.** Foundations §3 cites that ALARP forgoes further risk reduction only when its cost is in "**gross disproportion**" to the benefit — an *asymmetric* test that favors safety (from *Edwards v. National Coal Board*). The practitioner misuse is to read ALARP as ordinary cost-benefit ("the reduction costs more than it saves, so we stop") and quietly drop the gross-disproportion weighting. The expert's avoidance: in the tolerable/ALARP zone, keep driving risk down until the next reduction is *grossly* disproportionate — a marginal or break-even cost is **not** sufficient grounds to stop in the tolerable band.
**WHY:** dropping the asymmetry converts a safety duty into an accountant's indifference point, systematically under-investing in mitigation exactly where the law/standard demands the opposite.
**Galaxy hit:** "the gate passed, do we still harden?" — in the tolerable band PRISM keeps hardening (R13 comprehensive route is the engineering echo of ALARP's asymmetry). A compliance-safety recommendation that stops at "not worth it" without testing *gross* disproportion has misapplied ALARP. The zone-boundary values are owner-gated; the asymmetric *rule* is the lesson.

## Owner-gate (NOT promoted)

These are **threshold / numeric values** this entry deliberately does NOT promote — they stay owner-gated in `state/shared/omega-thresholds.json` and `mcp-server/src/physics/constants.ts`, settable only by the galaxy owner (golf) / safety owner, never copied from a source into the wiki:
- **`S(x)` pass/fail cut** and the **risk-matrix cell boundary** that flips tolerable → unacceptable (method in §1/§5; the cut is gated).
- **Omega targets** per milestone.
- **Cpk gate floors** (quality galaxy).
- **SIL numeric failure-rate / PFD bands** from IEC 61508 (SIL as a concept is in foundations §3; the bands are gated).
- **FMEA Severity/Occurrence/Detection scales and RPN action threshold** (foundations §4).
- **Alarm false-positive-rate cutoff** and any alarm-count saturation number — the *direction* (fewer non-actionable alarms is safer) is the lesson here; any specific rate cut is gated.
- **Occupational exposure limits** (PELs/TLVs).
- **ALARP gross-disproportion factor** and the tolerability-zone boundary values — the asymmetric *rule* is here; the multiplier and boundaries are gated.

If a future source quotes any such number, name the source and route the value through the owner-gate; do not promote it into this entry.

## Sources

All URLs below were WebFetch-confirmed during this entry's creation (2026-06-10). Distinct from [[compliance-safety-foundations]]; that entry's theory was read first and is not repeated.

1. Fail-safe (fail-open / fail-closed / fail-secure; context-dependent safe state): https://en.wikipedia.org/wiki/Fail-safe
2. NIST CSRC Glossary — Fail-Safe (CNSSI 4009-2015 — termination preventing damage on failure): https://csrc.nist.gov/glossary/term/fail_safe *(gov)*
3. Single point of failure (SPOF definition + redundancy mitigation): https://en.wikipedia.org/wiki/Single_point_of_failure
4. Defense in depth (computing) (independent layers / second-line of defence): https://en.wikipedia.org/wiki/Defense_in_depth_(computing)
5. NIST CSRC Glossary — Audit Log (chronological record; CNSSI 4009-2015, NIST SP 800-37/53/171): https://csrc.nist.gov/glossary/term/audit_log *(gov)*
6. Audit trail (traceability + accountability; tamper-resistance): https://en.wikipedia.org/wiki/Audit_trail
7. Alarm fatigue (desensitization, false alarms, dangerous workarounds, Joint Commission mitigations): https://en.wikipedia.org/wiki/Alarm_fatigue
8. Risk matrix (Cox poor-resolution / arbitrary-ranking limitations; Thomas-Bratvold-Bickel): https://en.wikipedia.org/wiki/Risk_matrix
