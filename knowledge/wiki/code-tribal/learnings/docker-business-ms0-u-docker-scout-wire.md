# DOCKER-BUSINESS-MS0/U-DOCKER-SCOUT-WIRE — [MAIN-FORCE] [DOCKER-BUSINESS-MS0]/U-DOCKER-SCOUT-WIRE (slot:alpha): wire Docker Scout (Business feature, ready-on-enroll)

**Commit:** `04c2a2ec9902` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T18:47:53-05:00
**Tags:** docker-business-ms0, u-docker-scout-wire, auto-distilled

## Subject
[MAIN-FORCE] [DOCKER-BUSINESS-MS0]/U-DOCKER-SCOUT-WIRE (slot:alpha): wire Docker Scout (Business feature, ready-on-enroll)

## Body
```
[MAIN-FORCE] [DOCKER-BUSINESS-MS0]/U-DOCKER-SCOUT-WIRE (slot:alpha): wire Docker Scout (Business feature, ready-on-enroll)

Operator: 'utilize the Docker Business subscription further'. Docker Scout (SBOM/CVE/policy, included
in Business) is installed but UN-enrolled (config empty, not logged in). scripts/docker-scout.mjs is a
READ-ONLY wrapper (hard allowlist: config/cves/quickview/recommendations/policy -- can NEVER shell
enroll/config-organization/push) that activates the moment the operator runs 'docker login' +
'docker scout config organization <org>' -- inert+fail-loud until then (same pattern as the OpenRouter
cloud tier). Mirrors the existing read-only docker-mcp.mjs.

Modes: config (enrollment status) · images (live PRISM stack) · quickview/cves/recommendations <image>
· scan-all (-> dated JSONL ledger state/shared/scout-reports/) · policy. execFile argv-array (no shell
injection); --/-prefixed positionals rejected before becoming flags (no arg injection).

18 tests. LIVE-validated: config -> 'enrolled: NO' + exact enroll commands; images -> the real 5
running containers (ollama/prometheus/qdrant/grafana/postgres). Scout-feature modes correctly gated
(fail loud, never invoke scout, when un-enrolled). 1-arm scrutiny PASS; 2 P2s closed (runScout carries
stderr+code on non-zero exit so a real failure isn't masked as 'CVEs found'; scan-all report date-stamped
for an accreting ledger). Cross-domain (Docker=juliett) but operator-directed, new files only.
```

## Files touched (3)
- scripts/docker-scout.mjs      | 316 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/docker-scout.test.mjs | 162 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 478 insertions(+)

## Lessons surfaced in commit body
- tilize the Docker Business subscription further'. Docker Scout (SBOM/CVE/policy, included
- til then (same pattern as the OpenRouter

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 04c2a2ec9902`
- Milestone envelope: `mcp-server/data/milestones/DOCKER-BUSINESS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._