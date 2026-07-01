---
name: reference_echo_gcode_snippet_fill_injection_fix_2026_06_23
description: "Echo fixed GCodeSnippetEngine.fill() — regex-from-unescaped-key + String.replace($-substitution) -> literal split/join. Closes a metachar-key RegExp throw + a $&/$`/$$ value-injection into emitted G-code."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.559Z
aliases: reference_echo_gcode_snippet_fill_injection_fix_2026_06_23
---


**U-PP-GCODE-SNIPPET-FILL-INJECTION-SAFE** (slot:echo, 2026-06-23, commit `86a321a3c4` on `cad-fusion-live-ms0`).

**Bug:** `GCodeSnippetEngine.fill(id, params)` substituted `{key}` placeholders via
`code.replace(new RegExp(\`\\{${key}\\}\`, "g"), String(value))`. Two latent defects:
1. The regex was built from the UNESCAPED param **key** — a key containing a regex metacharacter
   (e.g. `"a(b"`) made `new RegExp` THROW (`SyntaxError: unbalanced group`).
2. `String(value)` was passed as the `String.replace` **replacement string**, so a value containing
   `$&` / `` $` `` / `$'` / `$$` / `$n` triggered JS replacement-pattern substitution — injecting an
   unexpected token (e.g. the matched placeholder itself) into emitted G-code.
   Both were latent (all authored keys are `[a-z_]+`, values numeric) but `fill` is reachable from
   `camDispatcher:post_gcode_snippet_fill` with arbitrary request params.

**Fix:** literal split/join → `code.split(\`{${key}}\`).join(String(value))`. Both the search token and
the replacement are literals — no RegExp constructed, no `$`-pattern semantics. Behavior-IDENTICAL for
every normal param (split/join replaces all occurrences like the old `/g`; the sequential per-key loop
and its cross-contamination property are unchanged); only the two adversarial classes change, both safer.

**Reusable lesson (string templating):** when you substitute placeholders whose KEY or VALUE is
caller-supplied, use **literal split/join** (or `replaceAll(literal, () => value)` with a function
replacement), NEVER `new RegExp(userKey)` + `String.replace(re, userValue)`. The key can break the regex
(throw / mis-match) and the value can trigger `$`-pattern substitution. This is the snippet-emit analogue
of SQL/shell injection: treat both sides as literals.

**Verification pattern (repeat):** blast-radius grep the SINGLETON name (`gCodeSnippetEngine.`) not
`.fill(` (the latter matched 250 Array.fill noise files); confirm the sole consumer (camDispatcher) is
forward-only + no test asserts the old behavior; +2 R9 proof tests that FAIL on the old code (a `$&`
value → literal `T$& M6`; a metachar key → no throw); 2-arm scrutiny on the ENGINE file. Both arms PASS,
15/15 green. Sibling fix: [[reference_echo_gcode_opt_arc_classifier_fix_2026_06_23]] (same session, arc
classifier). [[reference_echo_pp_missing_engine_tests_2026_06_23]]
