#!/usr/bin/env node
/**
 * MILL-MASTER cert publisher (v12 — HONEST edition).
 *
 * Reads the live scrutinizer output (MILL-MASTER.scrutiny-log.json) and the live
 * envelope (MILL-MASTER.json) and emits a cert that matches what the tools
 * actually found. No hardcoded score narrative, no fabricated Δ values, no
 * stale inventory counts.
 *
 * Prior to v12 this file baked in a "pass 1 → 0.910 → auto-fix Δ=170 → 1.000"
 * story regardless of input. That narrative has been removed.
 */
import fs from "node:fs";

const ENV_FILE = "H:/prism/mcp-server/data/milestones/MILL-MASTER.json";
const LOG_FILE = "H:/prism/mcp-server/data/milestones/MILL-MASTER.scrutiny-log.json";
const INV_FILE = "H:/prism/PRISM-INVENTORY-LATEST.md";
const NOW = new Date().toISOString();

if (!fs.existsSync(ENV_FILE)) {
  console.error(`✗ Envelope not found: ${ENV_FILE}. Run build-mill-master.mjs first.`);
  process.exit(1);
}
if (!fs.existsSync(LOG_FILE)) {
  console.error(`✗ Scrutiny log not found: ${LOG_FILE}. Run scrutinize-mill-master.mjs first.`);
  process.exit(1);
}

const env = JSON.parse(fs.readFileSync(ENV_FILE, "utf8"));
const log = JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
const CERT_FILE = `H:/prism/mcp-server/data/milestones/MILL-MASTER-RELEASE-CERT-v${env.version}.md`;

// Live inventory read — no hardcoded engine/dispatcher counts
let invEngines = "unknown", invDispatchers = "unknown";
if (fs.existsSync(INV_FILE)) {
  const inv = fs.readFileSync(INV_FILE, "utf8");
  const eng = inv.match(/(\d[\d,]*)\s+engines/i);
  const dsp = inv.match(/(\d[\d,]*)\s+dispatchers/i);
  if (eng) invEngines = eng[1];
  if (dsp) invDispatchers = dsp[1];
}

// Derive honest pass summary from log
const passes = log.passes || [];
const finalPass = passes[passes.length - 1] || {};
const finalScore = Number(log.final_score ?? finalPass.score ?? 0);
const threshold = Number(env.scrutiny_config?.improvement_threshold ?? 0.92);
const exceeds = (finalScore - threshold).toFixed(3);
const criticals = log.summary?.final_critical ?? finalPass.summary?.critical ?? 0;
const majors = log.summary?.final_major ?? finalPass.summary?.major ?? 0;
const minors = log.summary?.final_minor ?? finalPass.summary?.minor ?? 0;
const totalChecks = log.summary?.total_checks ?? finalPass.total_checks ?? 0;
const convergedOn = (() => {
  for (let i = 0; i < passes.length; i++) {
    if (passes[i].converged) return i + 1;
  }
  return null;
})();
const verdict = (finalScore >= threshold && criticals === 0)
  ? `✅ PASS — score ${finalScore.toFixed(3)} ≥ threshold ${threshold}`
  : `⚠️ REVIEW — score ${finalScore.toFixed(3)} (threshold ${threshold}), ${criticals} CRITICAL`;

// Pass-by-pass table lifted from real data
const passRows = passes.map((p) => {
  const s = (p.summary?.total ?? p.gaps_found_summary?.total) ?? "—";
  const sc = typeof p.score === "number" ? p.score.toFixed(3) : "—";
  const dlt = p.delta != null ? `Δ=${p.delta}` : "";
  const flag = p.converged ? "CONVERGED" : "";
  return `| ${p.pass_number} | ${sc} | ${p.summary?.critical ?? 0}C / ${p.summary?.major ?? 0}M / ${p.summary?.minor ?? 0}m | ${s} | ${dlt} ${flag}`.trim();
}).join("\n");

const phaseTable = env.phases
  .map((p) => `| **${p.id}** | ${p.units.length} | ${p.sessions} | ${p.primary_model} | ${p.title.replace(/\|/g, "\\|")} |`)
  .join("\n");

const leverageTable = (env.existing_leverage || [])
  .map((l) => `| ${l.asset} | ${l.type} | ${l.count ?? "—"} | ${(l.usage || "").replace(/\|/g, "\\|")} |`)
  .join("\n");

const unresolvedRows = (log.unresolved_gaps || [])
  .map((g) => `| ${g.category} | ${g.count} | ${g.severity} | ${g.note || ""} |`)
  .join("\n") || "| — | — | — | No unresolved gaps |";

const cert = `# MILL-MASTER — Release Certificate

**Envelope:** \`${env.id}\` v${env.version}
**Created:** ${env.created_at}
**Published:** ${NOW}
**Verdict:** ${verdict}

> This cert is generated from live scrutinizer output. Every number below comes from \`MILL-MASTER.json\` + \`MILL-MASTER.scrutiny-log.json\`. No narrative is hardcoded in the publisher.

---

## Scrutiny Result (live)

| Pass | Score | Severity breakdown | Gaps | Notes |
|-----:|:-----:|:-------------------|-----:|:------|
${passRows}

**Final score:** ${finalScore.toFixed(3)} (threshold ${threshold}, exceeds by ${exceeds})
**Total checks:** ${totalChecks.toLocaleString()} per pass
**Convergence:** ${convergedOn ? `first converged on pass ${convergedOn}` : "no pass reported converged"}
**Unresolved by category:**

| Category | Count | Severity | Note |
|----------|------:|----------|------|
${unresolvedRows}

---

## Envelope Summary

- **ID:** \`${env.id}\`
- **Version:** ${env.version}
- **Title:** ${env.title}
- **Phases:** ${env.phases.length}
- **Total units:** ${env.total_units}
- **Total sessions:** ${env.total_sessions}
- **Omega target:** ${env.phases[0]?.gate?.omega_floor ?? 1.0}
- **Supersedes:** ${(env.supersedes || []).join(", ")} (${(env.supersedes || []).length} milestones)

**PRISM live inventory at publish time:** ${invEngines} engines · ${invDispatchers} dispatchers (from PRISM-INVENTORY-LATEST.md)

---

## Phase Table

| Phase | Units | Sessions | Model | Title |
|-------|------:|----------|-------|-------|
${phaseTable}

---

## Cohesion Chain (wired in P1)

\`\`\`
Web UI / MCP client
      ↓
MillStudioContext (P0)
      ↓
millDispatcher.ts (P1-U01, 40+ actions)
      ↓
MillMasterOrchestratorFacadeEngine  ◄── PRISMSelfAwarenessEngine
      ↓                                    ↕
      ├─→ MillingAGIMasterEngine      MillAISelfAwarenessIntegrationEngine
      ├─→ MillingAGIOrchestrationEngine
      ├─→ MillingUnifiedScienceOrchestrationEngine
      └─→ MillingEndToEndOrchestrationEngine
              ↕
      CAMAGIMasterOrchestratorEngine ──→ camDispatcher (P1-U06)
              ↓
    ┌───────────┬───────────┬──────────────┬────────────┬──────────┐
Mastercam    hyperMILL   Inventor HSM   SolidCAM    Fusion 360
\`\`\`

---

## Existing Leverage

| Asset | Type | Count | Usage |
|-------|------|------:|-------|
${leverageTable}

---

## Release Artifacts

- \`mcp-server/data/milestones/MILL-MASTER.json\` — envelope (v${env.version})
- \`mcp-server/data/milestones/MILL-MASTER.scrutiny-log.json\` — live scrutiny log
- \`mcp-server/data/milestones/MILL-MASTER-RELEASE-CERT-v${env.version}.md\` — this file
- \`mcp-server/data/roadmap-index.json\` — updated (supersessions + MILL-MASTER entry)
- \`.claude/helpers/build-mill-master.mjs\` — re-runnable builder
- \`.claude/helpers/validate-mill-master.mjs\` — structural validator
- \`.claude/helpers/scrutinize-mill-master.mjs\` — 12-category scrutinizer (F4-widened allowlist)
- \`.claude/helpers/publish-mill-master-cert.mjs\` — this cert generator (F1 — reads live scrutiny log)

## Next Actions

- \`/pick-task MILL-MASTER-P0-U01-STUDIO-CTX\` — wizard parity
- \`/pick-task MILL-MASTER-P1-U01-MILL-DISP\` — cohesion core (unblocks everything)
- \`/ralph-loop\` — execute full envelope with quality gate

---

_Signed off: Claude (opus-4.7) · Cert generated from live envelope + scrutiny log · Threshold ${threshold}_
`;

fs.writeFileSync(CERT_FILE, cert, "utf8");
console.log(`✓ Release cert written: ${CERT_FILE}`);
console.log("");
console.log("Summary:");
console.log(`  Phases: ${env.phases.length}`);
console.log(`  Units:  ${env.total_units}`);
console.log(`  Score:  ${finalScore.toFixed(3)} (threshold ${threshold}, exceeds by ${exceeds})`);
console.log(`  Gaps:   ${criticals}C / ${majors}M / ${minors}m`);
console.log(`  Verdict: ${finalScore >= threshold && criticals === 0 ? "PASS" : "REVIEW"}`);
