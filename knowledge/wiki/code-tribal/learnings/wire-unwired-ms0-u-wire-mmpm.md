# WIRE-UNWIRED-MS0/U-WIRE-MMPM — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-MMPM: wire MarksMultusPatternMinerEngine into prism_dev (2 read actions, engine-pair test already exists)

**Commit:** `962110b015a2` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T09:13:06-05:00
**Tags:** wire-unwired-ms0, u-wire-mmpm, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-MMPM: wire MarksMultusPatternMinerEngine into prism_dev (2 read actions, engine-pair test already exists)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-MMPM: wire MarksMultusPatternMinerEngine into prism_dev (2 read actions, engine-pair test already exists)

Wires 2 pure-read pattern-mining actions through prism_dev:
- mmpm_mine_text  -> mineText(content, source_name?) — regex parse
- mmpm_get_stats  -> getStats() — supported pattern kinds

Mines Mazak Multus (Mazatrol-flavored Fanuc) .MIN G-code text for
9 pattern kinds: macro_call/macro_definition/canned_cycle/tool_change/
spindle_mode/coolant_mode/subprogram_call/conditional/probe. Each
pattern carries a canonical signature + semantic hash for cross-program
dedup.

DEFERRED (path-traversal class):
- mineFile(filePath): reads LLM-supplied disk path via fs.readFileSync.
  LLM-callable would let any chat read arbitrary files — sensitive
  job programs in H:/PRISM/JM DIE/ or system files.
- mineDirectory(dirPath, options): same risk class but worse — walks
  a directory, reads every .MIN file inside.

DoS guards:
- content: 0-5MB (real .MIN programs often 100KB-2MB; 5MB headroom)
- source_name: 1-256 chars (optional, defaults to 'in-memory')

Engine regexes (read from source before writing test fixture, per
the read-source-first doctrine):
  SPINDLE_MODE_RE: \b(G96|G97|G50)\s+S\d+\b  ← constant-surface-speed
                                                MODE, NOT M03 on/off
  COOLANT_MODE_RE: \b(M7|M8|M9|M13|M53)\b    ← UNPADDED, NOT M08
  TOOL_CHANGE_RE: \bT\d{2,4}\b
  CANNED_CYCLE_RE: \b(G71|G72|...|G87)\b
  SUBPROGRAM_CALL_RE: \bM98\s+P\d+\b
First-pass test fixture used 'M03 S3000' + 'M08' which DID NOT match.
Fixed to use G96 + unpadded M8/M9 which DO match. Confirmed via
1 failure → engine source read → fixture rewrite → 18/18 PASS.
Lesson: read engine regex BEFORE writing test fixture (4th time this
session this 'read source first' doctrine caught an assumed-shape
bug — same class as PGH/PFH/RBE/FCC/SCA from earlier).

Test coverage: 18/18 vitest PASS (dispatcher only — engine-pair
already exists):
- Zod schema validation (4 — content required + 5MB cap + source_name
  256-cap + get_stats {} accept)
- mine_text behavior (8 — multi-pattern detection / empty content
  zero patterns / comment-only zero patterns / 3-label source_name
  variability / default 'in-memory' / has_macros derivation /
  has_probing bool / routing proof pattern_count parity / per-pattern
  shape with semantic_hash)
- get_stats (2 — 9-kinds count + dedup algo / routing proof parity)
- error envelope (3 — missing content / >5MB DoS / oversize
  source_name)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../dispatcher.marksMultusPatternMiner.test.ts     | 229 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  16 ++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  27 ++-
- 3 files changed, 271 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- Lesson: read engine regex BEFORE writing test fixture (4th time this

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 962110b015a2`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._