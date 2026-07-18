# OLLAMA-STRESS/U-ALPHA-OLLAMA-NUMCTX-CJK-FIX — [MAIN-FORCE] [OLLAMA-STRESS]/U-ALPHA-OLLAMA-NUMCTX-CJK-FIX (slot:alpha): size num_ctx by UTF-8 BYTES not chars/3 -- fixes a CJK/non-Latin truncation hole (scrutiny arm-B P1)

**Commit:** `4ec7e7c1e3e3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T20:59:20-05:00
**Tags:** ollama-stress, u-alpha-ollama-numctx-cjk-fix, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-STRESS]/U-ALPHA-OLLAMA-NUMCTX-CJK-FIX (slot:alpha): size num_ctx by UTF-8 BYTES not chars/3 -- fixes a CJK/non-Latin truncation hole (scrutiny arm-B P1)

## Body
```
[MAIN-FORCE] [OLLAMA-STRESS]/U-ALPHA-OLLAMA-NUMCTX-CJK-FIX (slot:alpha): size num_ctx by UTF-8 BYTES not chars/3 -- fixes a CJK/non-Latin truncation hole (scrutiny arm-B P1)

The U-ALPHA-OLLAMA-NUMCTX-WIRE estimate used chars/3, which OVERSHOOTS English/code
but UNDERSHOOTS CJK (1 char ~1-3 tokens) and accented Latin (the Polish/Spanish JM
shop floor) -- so a long CJK manual or non-Latin work-order summarize could reserve
num_ctx BELOW the real token count -> silent prompt TRUNCATION -> changed output,
defeating the 'provably output-safe' guarantee. Caught by per-file 2-arm scrutiny.

FIX: size by UTF-8 byte length. For byte-level BPE tokenizers (qwen/gpt-oss/deepseek)
every token covers >=1 byte, so real tokens <= utf8 bytes for ANY script -> num_ctx >=
bytes is provably >= real tokens -> the whole prompt always fits -> identical output,
no truncation, English/code/CJK/accented-Latin alike. Slightly larger reservation for
long English (bytes vs chars/4) but still << 131072 for short tasks (the concurrency/
VRAM win is preserved); large inputs clamp to 131072 (no worse than the old default).
+CJK regression test (3000x 中 = 9000 bytes -> reserves >=9000; old chars/3 reserved
~1000 -> would truncate) + a byte-coverage invariant across English/CJK/Polish. 56/56.

Validated earlier (live 'turning' offload through the adaptive ctx); this re-validation
hit transient Ollama cold-load flakiness under fleet load (not a defect in the change --
the byte-based formula is provably safe + test-pinned).
```

## Files touched (3)
- scripts/ask-ollama.mjs      | 21 ++++++++++++++-------
- scripts/ask-ollama.test.mjs | 24 ++++++++++++++----------
- 2 files changed, 28 insertions(+), 17 deletions(-)

## Lessons surfaced in commit body
- till << 131072 for short tasks (the concurrency/

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4ec7e7c1e3e3`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-STRESS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._