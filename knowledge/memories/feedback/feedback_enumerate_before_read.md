---
name: feedback-enumerate-before-read
description: "When operator names a folder/scope, Glob the full tree and report counts BEFORE any Read. Never narrow scope without asking."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.424Z
aliases: feedback_enumerate_before_read
---


When the operator names a folder, scope, or resource set ("the PDFs in resources/", "everything under JM DIE/", "all the catalogs"), **enumerate the full tree first** with Glob, **report the total count back**, and only then start reading. Do not narrow scope on your own to a sample that "looks sufficient."

**Why:** 2026-05-26 — operator had to manually compile dozens of PDFs from `H:/PRISM/resources/` into a sub-folder and hand back a link, because I had read a narrow subset and reported back as if I'd covered the whole folder. The recovery cost (manual compilation) was the operator forcing the enumeration step I skipped. This is the silent-narrowing class of failure — looks like a complete answer, is actually a sample. /system-viz does NOT cover arbitrary resource folders (it indexes codebase + PSN legs only), so don't assume search hooks caught what I missed.

**How to apply:**
1. Operator names a folder/scope → first tool call is `Glob <folder>/**/*.<ext>` (or `**/*` if mixed types).
2. Report the total file count back in plain language before any Read.
3. Treat the operator's folder spec as **authoritative scope** — never narrow without asking ("found 47 PDFs, want me to process all or filter to subset X?").
4. For PDF corpora specifically: prefer `/pdf-learn` / `/learn-corpus` over ad-hoc Read — they crawl, dedupe, and feed the extraction pipeline. Single Read is the wrong shape for a corpus.
5. One-line correction the operator can use to force-fix me mid-task: "Enumerate first — Glob the whole folder, report the count, then proceed."

Related: [[feedback_verify_actual_contract_not_proxy]] (verify the real contract not a proxy), [[feedback_system_viz_first_audit]] (system-viz is for codebase, not resource folders).
