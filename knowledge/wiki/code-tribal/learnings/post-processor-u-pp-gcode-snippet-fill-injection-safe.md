# POST-PROCESSOR/U-PP-GCODE-SNIPPET-FILL-INJECTION-SAFE — [MAIN-FORCE] [POST-PROCESSOR]/U-PP-GCODE-SNIPPET-FILL-INJECTION-SAFE (slot:echo): make snippet fill() injection-safe (literal replace)

**Commit:** `86a321a3c47f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T18:35:03-05:00
**Tags:** post-processor, u-pp-gcode-snippet-fill-injection-safe, auto-distilled

## Subject
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-GCODE-SNIPPET-FILL-INJECTION-SAFE (slot:echo): make snippet fill() injection-safe (literal replace)

## Body
```
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-GCODE-SNIPPET-FILL-INJECTION-SAFE (slot:echo): make snippet fill() injection-safe (literal replace)

GCodeSnippetEngine.fill() built a regex from the UNESCAPED param key
(new RegExp(`\{${key}\}`)) and used String(value) as a String.replace replacement
string. Two latent defects: (1) a key containing a regex metacharacter (e.g. "a(b")
made new RegExp THROW; (2) a value containing $&/$`/$$ triggered JS replacement-pattern
substitution, injecting an unexpected token into emitted G-code.

Fix: literal split/join -> code.split(`{${key}}`).join(String(value)). Both search and
replacement are literals; no RegExp, no $-pattern semantics. Behavior-IDENTICAL for all
normal params (replaces all occurrences like the old /g; sequential cross-contamination
preserved) -- only the two adversarial classes change, both strictly safer.

Both 2-arm scrutiny PASS (reviewer + code-analyzer), 0 P0/P1: independently verified
byte-equivalence for happy/missing-param/coercion/extra-param/cross-contamination + probed
empty-value, substring-key brace-anchoring, }-in-key, global semantics; both bug classes
closed; +2 R9 proof tests that FAIL on the old code (a $& value -> literal "T$& M6"; a
metachar key -> no throw). 15/15 green. Blast radius: sole consumer camDispatcher
post_gcode_snippet_fill, forward-only; no test asserted the old $/throw behavior.

Files: mcp-server/src/engines/GCodeSnippetEngine.ts (+ its test)
```

## Files touched (4)
- mcp-server/src/__tests__/GCodeSnippetEngine.test.ts | 15 +++++++++++++++
- mcp-server/src/engines/GCodeSnippetEngine.ts        |  6 +++++-
- state/shared/specs/ECHO-OPEN-TASKS-LEDGER.md        | 11 +++++++----
- 3 files changed, 27 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 86a321a3c47f`
- Milestone envelope: `mcp-server/data/milestones/POST-PROCESSOR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._