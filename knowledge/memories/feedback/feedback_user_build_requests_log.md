---
name: feedback-user-build-requests-log
description: Standing rule — capture every operator build/feature request into the persistent cross-session log at state/shared/USER-BUILD-REQUESTS-LOG.md
aliases: feedback_user_build_requests_log
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.448Z
---


Every chat MUST append to `H:/prism/state/shared/USER-BUILD-REQUESTS-LOG.md` whenever the operator (Mark) expresses a build or feature intent.

**Why:** Build requests were being lost between sessions — a chat weeks later had no record that the operator asked for X. The operator explicitly asked (2026-05-17) for "a log of my requests throughout all our sessions on what I want to build to improve both backend development and prism app features." The log is the durable capture point; it is upstream of `ROADMAP-CONSOLIDATED` (which is the work inventory, not the intent record).

**How to apply:**
- Trigger phrases: "can we build / add / make / improve…", "I want…", "let's…" applied to a *capability* (not a one-off fix).
- Append a dated row (`YYYY-MM-DD`, absolute) to the right table: **Backend-development** (dev-tooling, hooks, pipelines, token-economy) or **PRISM app-feature** (SFC, Master Post, CAD/CAM AI, CAM bridges, studios).
- Run the system-viz cross-reference: `node H:/prism/scripts/system-viz-query.mjs find "<keywords>"` → tag the row `existing-node` / `ghost-node` / `needs-creation`.
- Never delete rows. Mark shipped ones `✅ shipped <commit>`. Changed intent → new row, don't average (R7).
- It is NOT a hook — deliberately. The 2026-05-17 token-savings audit found ~500 dead hooks; adding another injection hook for this would be the wrong instinct. It is chat-discipline, enforced by this memory.

**Do NOT** retroactively invent past requests — the log starts 2026-05-17 and is honest about that. Only log what the operator actually states.

Related: [[reference_dev_pipeline_toolbox_2026_05_17]] · [[reference_audit_token_savings_2026_05_17]] · [[feedback_tribal_obsidian_viz_utilization_protocol]]. Log file: `state/shared/USER-BUILD-REQUESTS-LOG.md`.
