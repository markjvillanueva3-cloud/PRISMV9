# CLAUDE.md PATCH — Domain Self-Improving AI (fleet rule)

**Surface:** root `H:/prism/CLAUDE.md` (peer-locked / shared tree; whiskey on slot worktree cannot edit it → this patch-sibling is for golf to splice on integration merge, per the PATCH-SIBLING convention).
**Unit:** U-DOMAIN-AI-RULE · **Author:** slot:whiskey `claude-57dfea65` · **Date:** 2026-05-29

## Splice target
Add as a new top-level section near `## AI SYSTEM ROUTING` / `## NN-GRAPH-*` (doctrine pointer, ≤8 lines):

---
## DOMAIN SELF-IMPROVING AI — every domain owns its own (fleet rule, 2026-05-29)
**Operator directive:** every PRISM domain builds & OWNS its own self-improving AI training system, customized to its domain. India's `ai-training` galaxy (`mcp-server/src/engines/ai-training/`) is the MAIN full-system AI and the canonical TEMPLATE — domains CLONE the architecture (R8), they do NOT defer their domain-AI build to india. **Boundary (load-bearing):** the domain owns the engines + wiring + the gated retrain-lifecycle script; india owns the GPU training/inference compute (`graphsage-train-pipeline.mjs`, Ollama deploy). Domains produce the training *signal* (experience ledger, fused knowledge); india runs the trainer. Full 14-layer blueprint + per-domain build contract: [`knowledge/wiki/architecture/domain-self-improving-ai-template.md`]. Rule memory: [[feedback_domains_own_ai_training_systems]]. First instance: whiskey/lathe — `state/shared/specs/LATHE-SELFIMPROVE-AI-PLAN.md` (`LATHE-LORA-MS0`).
---

## Also reflect (golf merge checklist)
- [ ] root CLAUDE.md — splice the section above
- [x] memory: `feedback_domains_own_ai_training_systems.md` (written by whiskey, auto-feeds Obsidian)
- [x] wiki: `knowledge/wiki/architecture/domain-self-improving-ai-template.md` (written by whiskey)
- [x] MEMORY.md index pointer (written by whiskey)
- [ ] CHAT-SLOT-DOMAINS.md — optional: note each domain owns its domain-AI (india = template); golf/operator call
