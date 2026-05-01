---
name: User Industry & Manufacturing Context
description: User works in fastener industry, makes cold heading dies from tool steel on CNC lathes with live tooling
type: user
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
