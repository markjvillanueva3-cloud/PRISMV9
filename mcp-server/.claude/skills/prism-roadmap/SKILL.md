# /roadmap — PRISM Roadmap Navigator

## Trigger
User asks about roadmap, "what's next", "current phase", "roadmap status", "MP-0", "side quest", or any planning question.

## Authoritative Source
`H:\PRISM\PRISM-UNIFIED-ROADMAP.md` (427 lines) — THIS IS THE ONLY CANONICAL ROADMAP.

All prior versions (v17–v23) are obsolete. v24 is consolidated into the unified roadmap.

## Main Path Sequence (strict ordering)
1. **MP-0**: Contract Surface Repair — route mismatch, billing.ts mount, proof-stack rules
2. **MP-1A**: Frontline Operating Convergence — shop floor, scheduling, inventory, jobs
3. **MP-1B**: Commercial/Business Convergence — messages, billing, hot jobs, customer portal
4. **MP-2**: Realtime Cross-Desk State — websockets, event fanout, dashboard sync
5. **MP-3**: Business Operating Completeness — accounting, legal, customer service
6. **MP-4**: Simulation Readiness Gate — end-to-end integration, load testing, wiring audit

## Side Quests (gated)
- **SQ-A**: Auto Generation + Wiring (after MP-1B)
- **SQ-B**: Learning Pipeline (after MP-1A)
- **SQ-C**: Database Hardening (after MP-2)
- **SQ-D**: Platform Hardening (after MP-3)
- **SQ-M1–M8**: Machine domain pipelines (after MP-4, all parallel)

## QA Track
QA-MS10 through QA-MS14 run parallel with MP-3 and side quests.

## Protocol
1. Read the unified roadmap for current status
2. Check each section's Status and Dependencies fields
3. Report: current phase, blockers, next gate criteria
4. Never execute from obsolete roadmap files
