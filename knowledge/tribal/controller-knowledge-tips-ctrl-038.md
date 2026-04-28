---
id: "ctrl-038"
title: "Swiss lathe synchronization between spindles"
source: "controller:swiss_lathe_best_practices"
confidence: 88
category: "programming"
tags: ["swiss-lathe", "synchronization", "multi-spindle", "star", "tsugami", "citizen"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.182Z
---

# Swiss lathe synchronization between spindles

On multi-spindle swiss lathes (Citizen, Star, Tsugami): spindle sync uses M-code handshaking. Main spindle sends M200 (wait), sub-spindle responds with M200 (acknowledge). This ensures both streams are at the correct position before cutoff or part transfer. Critical: never skip sync codes or you'll crash the sub-spindle into the main. Star uses $1/$2 stream markers, Tsugami uses T-stream/M-stream.

**Category:** programming
**Confidence:** 88
**Source:** controller:swiss_lathe_best_practices

## Related
- [[esprit-cam-tips-esp-129|Swiss-Type Multi-Channel Synchronization with SyncChart]]
- [[controller-knowledge-tips-ctrl-037|Citizen Cincom Swiss lathe guide bushing programming]]
- [[controller-knowledge-tips-ctrl-106|Citizen LFV low-frequency vibration cutting G-code control]]
- [[controller-knowledge-tips-ctrl-107|Citizen detachable guide bushing and programming impact]]
- [[controller-knowledge-tips-ctrl-114|Star swiss lathe Fanuc variant with NC Assist and B-axis]]
