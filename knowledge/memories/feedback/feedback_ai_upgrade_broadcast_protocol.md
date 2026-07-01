---
name: feedback_ai_upgrade_broadcast_protocol
description: "Every galaxy OWNS its AI training (no passing off to india) AND broadcasts every AI-system upgrade to the master brain + corresponding galaxies via scripts/ai-upgrade-broadcast.mjs, so the whole fleet compounds together"
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.396Z
aliases: feedback_ai_upgrade_broadcast_protocol
---


# Fleet AI-upgrade broadcast protocol (operator directive, 2026-05-30)

**Two standing fleet rules, both galaxies/slots:**

1. **Own your AI training — do NOT pass it off to india.** Each domain galaxy owns its self-improving AI end-to-end: the corpus, the eval, the bundle, and the GPU run (on whatever box has the stack/VRAM). india is the *template + master-loop* owner, not the place every domain's training gets dumped. Reinforces [[feedback_domains_own_ai_training_systems]]. The closed-loop contract (publish outcomes to india's PSN self-improving loop) still holds — that is *coordination*, not *delegation of the training itself*.

2. **Broadcast every AI-system upgrade to the master brain + corresponding galaxies.** When a galaxy ships an AI upgrade (corpus, eval, bridge, training run, new model/adapter, RAG/index, GNN), it MUST announce it so the whole fleet improves together — never a silent local win.

**Why:** silent per-galaxy AI gains don't compound. A wire knowledge-corpus pattern, a closed-loop bridge, or an "evaluator-corpus mismatch" finding is reusable by lathe/mill/cam/quality/academy — but only if they hear about it. Broadcasting turns N isolated galaxies into one fleet that learns once and propagates.

**How to apply — one command, every AI upgrade:**
```
node scripts/ai-upgrade-broadcast.mjs --slot <slot> --galaxy <galaxy> \
  --kind <corpus|bridge|training|eval|model|rag|gnn> \
  --upgrade "<what changed>" \
  --artifacts "<file,file>" \
  --affects "<neighbor-galaxies csv>" \
  --notes "<unit id + reusable insight>"
```
It writes two DURABLE surfaces peers read at /checkin: `state/shared/ai-upgrade-ledger.jsonl` (append-only fleet ledger) + `state/shared/AI-UPGRADES-MASTER.md` (master-brain human index). Tool: `scripts/ai-upgrade-broadcast.mjs` (pure `buildUpgradeRecord` + injectable I/O, 7 node:tests). Shipped by mike (wedm) 2026-05-30 as `U-FLEET-AI-BROADCAST`; first 3 entries = mike's india-loop bridge + 171-pair knowledge corpus + in-galaxy training runner.

**Checkin habit:** at /checkin, read the ledger filtered to upgrades whose `affects_galaxies` includes your galaxy — adopt what's reusable. Pairs with the master-brain CONN-4 back-pointer + the chat-bus.
