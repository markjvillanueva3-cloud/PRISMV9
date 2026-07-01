---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/user_industry.md
source_filename: user_industry.md
content_hash: f5b853967c3676291676f54d5650d5b9fdb76a5499e2fb017a06364af627d5c6
mirror_ts: 2026-05-05T13:00:09.552Z
mirror_engine: ObsidianMemorySyncEngine
---

User works in the **fastener industry** making **cold heading dies** from tool steels.

Key manufacturing details:
- **Cold heading die casings**: Various sizes, tool steel (D2, M2, S7, A2, H13 typical)
- **Counter bores on one or both sides**: Carbide inserts sit inside the counterbore
- **Slight undercuts**: Required at counterbore bottoms so carbide sits flush (critical tolerance)
- **Whistle notches**: Cut at angles — typically requires specialized tooling. Their broken machine has this capability; plan for it in PRISM regardless.
- **Flat slots**: Can be done on live tooling lathes
- **Live tooling lathes**: They have machines with C-axis + live tools for whistle notches and flats
- **Industries served**: Fastener (primary), aerospace, defense, medical, heavy machinery, mining, automotive

**How to apply:** When building lathe programs, cold heading dies are a PRIMARY use case. The counterbore + undercut + whistle notch combination is the bread-and-butter part. Optimize for tool steel machinability (ISO H group), precision bore concentricity, and undercut geometry for carbide press-fit.
