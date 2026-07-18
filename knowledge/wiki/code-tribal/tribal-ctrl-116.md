---
name: tribal-ctrl-116
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "tsugami", "swiss-lathe", "fanuc-variant", "opposed-gang", "modular-tooling"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-116.md
promoted_at: 2026-06-09T22:31:16.160Z
---

# Tsugami opposed gang tool swiss lathe with Fanuc 32i-B

Tsugami swiss lathes use Fanuc controllers (32i-B on SS-series opposed gang, 0i-TF Plus on P-series split slide). The opposed gang tool configuration (SS20, SS26, SS32) allows simultaneous machining on main and sub spindles with deep cutting capability. Key programming consideration: on opposed-slide machines, each slide must be gauged to a given datum before entering tool offsets — use geometry offsets with drawing dimensions, not incremental offsets. The Modular Tool Zone allows easy swapping between rotary tools, indexed holders, and turning holders — document your tool zone configuration in the program header comments for setup reference. Tsugami's software enables rapid programming with minimal training, but for complex parts, use CAM with Tsugami-specific post processors. The B0-series (B0126, B0205, B0206, B0325, B0326) uses either Fanuc 0i-TD or 32i-B depending on axis count.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-114|Star swiss lathe Fanuc variant with NC Assist and B-axis]]
- [[controller-knowledge-tips-ctrl-106|Citizen LFV low-frequency vibration cutting G-code control]]
- [[controller-knowledge-tips-ctrl-107|Citizen detachable guide bushing and programming impact]]
- [[controller-knowledge-tips-ctrl-117|Nakamura-Tome NT Manual Guide i for multitasking programming]]
- [[controller-knowledge-tips-ctrl-118|YCM machining centers with Fanuc — OEM integration notes]]
