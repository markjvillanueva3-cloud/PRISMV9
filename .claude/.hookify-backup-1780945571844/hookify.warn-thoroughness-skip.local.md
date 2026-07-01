---
name: warn-thoroughness-skip
enabled: true
event: bash
pattern: git commit.*(?:PDF-LEARN|forge-learn|forge-triple|tribal|batch|pdf-learn)
action: warn
---

**THOROUGHNESS LAW — Pre-Commit Verification Required**

Before committing this learning/extraction batch, answer ALL of these:

1. Did you READ every file in every ZIP (not just PDFs — check HTML, text, XML, JSON, CSV, code)?
2. For every "skip" or "low novelty" judgment, did you cite the SPECIFIC existing engine/tip that covers it?
3. Did you read the TOC + at least 3 representative sections of every document >100 pages?
4. Did you extract EVERYTHING useful, not just the most obvious content?
5. Is there any remaining content you dismissed too quickly?

If you cannot answer YES to all 5, STOP and go back to extract more content before committing.
Completeness > Speed. Missing useful content is a permanent loss.
