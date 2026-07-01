---
name: tribal-ctrl-117
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "nakamura-tome", "fanuc-variant", "NT-Manual-Guide", "multitasking", "G112"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-117.md
promoted_at: 2026-06-09T22:31:16.160Z
---

# Nakamura-Tome NT Manual Guide i for multitasking programming

Nakamura-Tome machines use Fanuc controllers with the NT Manual Guide i — an upgrade from standard Fanuc Manual Guide i tailored for Nakamura multitasking machines. Programs display by spindle, waiting process, or part-transfer process, simplifying multi-axis/multi-turret programming. Detailed 3D guide drawings with coordinate axes and directional marks ensure precise milling operations. G112 enables Polar Coordinate Function, making the C-axis act as a virtual Y-axis for milling flats, hexes, and keyways without physical Y-axis hardware. The 3D Smart Pro AI (latest addition) enhances programming intelligence. When programming live tooling on Fanuc 16-TT or 31i-B controllers, always verify the C-axis zero position and indexing resolution. NT Manual Guide i manages turning, milling, grooving, drilling, and tapping with process rearrangement capability — useful for optimizing cycle times after initial programming.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-114|Star swiss lathe Fanuc variant with NC Assist and B-axis]]
- [[controller-knowledge-tips-ctrl-116|Tsugami opposed gang tool swiss lathe with Fanuc 32i-B]]
- [[controller-knowledge-tips-ctrl-118|YCM machining centers with Fanuc — OEM integration notes]]
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
