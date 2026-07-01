---
name: tribal-ctrl-061
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "fanuc", "milling", "canned-cycles", "drilling", "tapping", "boring"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-061.md
promoted_at: 2026-06-09T22:31:16.145Z
---

# Fanuc milling-specific canned cycles (0i-MF / 31i-B5)

Fanuc milling canned cycles (G73-G89 range): G73 (high-speed peck drilling — chip-breaking with partial retract), G74 (LH tapping), G76 (fine boring — orient spindle, shift, retract), G80 (cancel canned cycle), G81 (spot drill/simple drill), G82 (counterbore — dwell at bottom), G83 (deep-hole peck drilling — full retract each peck), G84 (RH tapping), G85 (boring — feed retract), G86 (boring — spindle stop, rapid retract), G87 (back boring), G88 (boring — dwell, manual retract), G89 (boring — dwell, feed retract). All cycles use R-plane (rapid-to point) and Z-depth. G98/G99 control retract level: G98 returns to initial Z level (safe for obstacles), G99 returns to R-plane (faster for repeated holes). Always use G98 when there are clamps or fixtures between holes.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-060|Fanuc 0i-TF turning-specific canned cycles]]
- [[solidcam-cam-tips-sc-087|GPP Canned Cycle Configuration — Map SolidCAM Drilling to Controller Cycles]]
- [[surfcam-cam-tips-sc2-072|Canned Cycle Output for Drilling and Tapping]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-051|Fanuc look-ahead buffer sizes by controller model]]
