---
name: feedback-validate-by-running-not-just-syntax
description: "`node --check` (syntax only) + an inline snippet that REPLICATES logic is NOT validation of a script. A runtime ReferenceError on a branch (undefined var on the success path) passes both yet crashes live. RUN the actual script on a real bounded input before claiming 'validated' (R12)."
type: feedback
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.449Z
aliases: feedback_validate_by_running_not_just_syntax
---


# Validate by RUNNING the script, not by syntax-check + snippet

After editing `scripts/cad-ollama-archetype-label.mjs` (A1, removed a `const OLLAMA_MODEL`), I claimed it "validated" on the basis of `node --check` PASS + an inline node snippet that re-implemented the model-selection logic. Both passed. But the actual script still had `source: "ollama:" + OLLAMA_MODEL` on the Ollama-**success** branch (line 138) referencing the now-removed const -> a runtime **ReferenceError** that crashes every successful classify. The ultracode roadmap workflow's adversarial lens caught it; I had shipped it (commit c6748e2a11) and fixed it next (U-A1B, 2efed07642).

**Why:** `node --check` validates SYNTAX, not name resolution — an undefined variable is a *runtime* error, not a parse error, so `--check` is blind to it. A snippet that copies the logic into a fresh file tests the LOGIC, not the actual edited file (it won't carry the stray reference). Only executing the real script exercises the real code paths.

**How to apply:**
1. After editing any script, **run it on a real, bounded input** (add a `--limit N` / `--dry-run` flag if a full run is expensive — that flag is reusable infra, not throwaway).
2. Exercise the BRANCH you changed — a happy-path run that never hits the error branch proves nothing about that branch (here, the Ollama-success path only runs when the LLM succeeds; under GPU contention it fell to the fallback branch and masked the bug even when run).
3. Never write "validated" from `--check` + a snippet alone. State exactly what was exercised (R12): "syntax + selection-logic checked; success-path NOT exercised (LLM aborted under contention)" beats a bare "validated".
4. Pair with the per-file scrutiny / 3-of-3 gate — an adversarial reviewer reading the actual file (not the snippet) catches the residual reference.

See [[feedback_workflow_concurrency_and_local_routing_2026_06_08]] (adversarial-lens value) · the A1/U-A1B commits.
