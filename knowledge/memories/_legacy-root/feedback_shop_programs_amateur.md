---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/feedback_shop_programs_amateur.md
source_filename: feedback_shop_programs_amateur.md
content_hash: 83eff69f7595a19aafa2b930a8792e8651593af0e21b7a9ae2853f769d121bbc
mirror_ts: 2026-05-05T13:00:09.471Z
mirror_engine: ObsidianMemorySyncEngine
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
