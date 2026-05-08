---
type: voice-spec
schemaVersion: 1.0.0
owner: user
generated_at: 2026-05-08
ban_words:
  - "leverage"
  - "utilize"
  - "delve"
  - "delve into"
  - "navigate"
  - "unlock"
  - "robust"
  - "seamless"
  - "elevate"
  - "transformative"
  - "in conclusion"
  - "it is worth noting"
  - "worth noting"
  - "tapestry"
  - "myriad"
  - "plethora"
  - "synergy"
ban_punctuation:
  - ";"
require_specific_number: true
max_sentence_length_chars: 200
min_screenshot_line: true
require_closer_first: true
milestone: OBSIDIAN-CONTENT-MS2/U-VOICE-SPEC
---

# Voice Spec

This file is the source of truth for `ContentWriterEngine`. Every rule below is
machine-checked against drafts. Edit the frontmatter to tune.

## Hard rules (machine-enforced)

These are the rules ContentWriterEngine validates on every draft. Failures
produce a violation list; the human decides whether to fix.

### Ban list

Words and phrases that mark "generic AI writing." If any of these appear in
a draft, ContentWriterEngine flags them. Add domain-specific items as you
notice them in your own drafts.

Current list lives in the frontmatter `ban_words` array.

### Punctuation

- **Hard stops, not semicolons.** Period over semicolon. Always.
- Em-dash is allowed; it tightens, not bloats.

### Specificity

- Every piece must contain at least one specific number, named example, or
  cited source.
- "Real numbers always beat vague claims." 443,000 not "strong performance."

### Sentence length

- Cap at 200 characters per sentence.
- One idea per paragraph.
- If a paragraph could be cut without the reader noticing, cut it.

### Structure

- The closer is written first. Pull yourself toward it.
- One line in every piece must be the line the reader will screenshot.

## Soft rules (human judgement)

These are guidance the engine cannot enforce; they live here so the writer
remembers the contract.

- Conversational and direct, but not flat — sentences should have rhythm.
- "Hooks before nuance" — open with the sharpest version of the claim,
  qualify in the body.
- Numbers in the first line of hooks where authentic; not as a gimmick.
- Never write "as an AI" in any voice. The system writes as the human.

## Voice fingerprint examples

Strong examples to pattern-match against (paste your own best lines here):

- "Most second brains capture and retrieve. This one learns."
- "443,000 impressions and 11,678 bookmarks tells you more about what your
  audience values than 500,000 impressions and 400 bookmarks."

Weak examples (avoid this register):

- "It is worth noting that engagement metrics provide valuable insights."
- "Leveraging the power of AI to elevate your workflow."

## How to update this file

When the engine flags a false positive consistently, OR when your voice
genuinely shifts, update the frontmatter. The engine reads the frontmatter
on every invocation; no rebuild needed.

`_lastVoiceCalibration:` field can be added to the frontmatter to track when
the rules were last tuned against real drafts.
