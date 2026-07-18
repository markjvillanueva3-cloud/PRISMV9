# OLLAMA-OFFLOAD/U-OFFLOAD-RATE-HEADLINE-HONESTY — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-OFFLOAD]/U-OFFLOAD-RATE-HEADLINE-HONESTY (slot:sierra): stop the raw-rate mis-read at its canonical surface + fix a real drift bug

**Commit:** `88ec35bf6deb` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T12:42:04-05:00
**Tags:** ollama-offload, u-offload-rate-headline-honesty, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-OFFLOAD]/U-OFFLOAD-RATE-HEADLINE-HONESTY (slot:sierra): stop the raw-rate mis-read at its canonical surface + fix a real drift bug

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-OFFLOAD]/U-OFFLOAD-RATE-HEADLINE-HONESTY (slot:sierra): stop the raw-rate mis-read at its canonical surface + fix a real drift bug

The raw lifetime offload rate (10.7%) is recurrently mis-read as 'below the >=30% target' -> triggers a wasted hunt for a non-problem (it counts correctly-kept Claude-only work -- orchestration/judgment/safety, R5 -- in the denominator). This bit TWO sessions + a /goal Stop-hook on 2026-06-10 (see [[reference_ollama_offload_rate_healthy_2026_06_10]]). Fix: append an inline caveat to the dashboard's lifetime-rate line stating raw is NOT the health metric + pointing at the ADJUSTED rate (offloads / offloadABLE work) as the >=30% target. Canonical-surface fix = compounding (every future reader/transcript-scan gets the caveat).

BONUS (R12 fail-loud caught a REAL pre-existing drift): the drift-guard test flagged that the hook emits a keep-category 'coordination_directive' (check-in-to-slot / coordinate-with-X / sequencing -- R5 orchestration) that the dashboard's CORRECT_KEEP_CATEGORIES set was MISSING. So coordination keeps were wrongly counted as offloadable, DEFLATING the adjusted (health) rate. Added it -> adjusted rate now accurate + drift-guard green.

VALIDATED: 21/21 dashboard tests (was 20/21 -- the drift-guard correctly failed pre-fix; now green). Display + classification only, no behavior change to the offload decision path.
```

## Files touched (2)
- scripts/ollama-offload-dashboard.mjs | 15 +++++++++++++++
- 1 file changed, 15 insertions(+)

## Lessons surfaced in commit body
- wrongly counted as offloadable, DEFLATING the adjusted (health) rate. Added it -> adjusted rate now accurate + drift-guard green.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 88ec35bf6deb`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._