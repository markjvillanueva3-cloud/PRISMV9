---
name: Shop programs are amateur-made
description: Box drive wire/lathe/mill programs were made by amateurs — don't calibrate engine to match their suboptimal parameters
type: feedback
---

Shop programs (Box drive, migrating to H: drive) were made by complete amateurs:
- Wire EDM: ~100% amateur
- Lathe: ~95% amateur
- Mill: ~50% amateur

**Why:** User explicitly stated this. The ITW SHAKEPROOF F0.12 ipm (3.05 mm/min) for D2 25mm is likely WAY too slow — engine predicts 7.09 mm/min which aligns with published benchmarks (5.6-8.0 mm/min for D2 25mm). The shop is running at ~43% of optimal speed.

**How to apply:**
- Do NOT calibrate engine constants down to match amateur shop speeds
- Published benchmark data (Makino, Modern Machine Shop, Practical Machinist) is the PRIMARY calibration reference
- Use shop programs for FORMAT/STRUCTURE validation only (M-codes, E-code groups, program flow)
- When comparing engine output to shop programs, flag where SHOP is suboptimal, not where engine is "wrong"
- The deviation report should show "your shop program could be X% faster" not "our engine is X% off"
- This makes the tool MORE valuable — it helps amateurs improve their programs
