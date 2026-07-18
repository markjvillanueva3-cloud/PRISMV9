import fs from 'node:fs';
const src = JSON.parse(fs.readFileSync('H:/prism/state/shared/dashboards/ke-pass2-resume-slice-5.json', 'utf8'));

const data = {};

function prodReady(num) {
  return {
    addArchWiki: ['knowledge/wiki/architecture/milestones/milestone-ghost-ms-lathe-prod-ready-ms0.md', 'knowledge/wiki/architecture/engines/lathe/lathe.md'],
    addSeWiki: ['handoff-discipline', 'claude-md-as-pointer-index'],
    systemImpact: 'LATHE-PROD-READY-MS0 placeholder unit ' + num + '; milestone consolidates lathe production-readiness work (post-processor hardening, Okuma B250 master-post, prism_turning safety gates). Specifics deferred to envelope; close-out via scripts/close-out-milestone.mjs once concrete deliverables ship.',
    csDepth: ['Placeholder is a tracking node; no own code/test surface; cost is metadata-only until envelope hydrates.', 'Risk: untriaged generic units inflate roadmap-index counts and dilute /pick-unit signal; flag for close-out-audit.'],
  };
}

function msCoord(n) {
  return {
    addArchWiki: ['knowledge/wiki/architecture/milestones/milestone-ghost-ms-lathe-ms' + n + '.md', 'knowledge/wiki/architecture/dispatcher-turning.md'],
    addSeWiki: ['claude-md-as-pointer-index', 'handoff-discipline'],
    systemImpact: 'Coordinator-placeholder envelope for LATHE-MS' + n + '; aggregates child units across the lathe pipeline (collision avoidance / dialect reconciliation / workholding / end-to-end / controllers / physics / production validation). Real work lives in child U-LTH units that prism_turning + lathe_lora consume.',
    csDepth: ['Roll-up node; no code on its own; status derives from union of child unit shipped flags.', 'Idempotency: MILESTONE_PROGRESS.json should compute coordinator percent-complete deterministically from atomic child closures.'],
  };
}

function unresolvedFallback() {
  return { addArchWiki: [], addSeWiki: ['schema-read-discipline'], systemImpact: 'Unit lacks a milestone-envelope title; treat as documentation or close-out candidate.', csDepth: [] };
}

for (const [id, u] of Object.entries(src)) {
  const rs = (u.relatedSubsystems || []).length;
  const aw = (u.pass1?.archWiki || []).length;
  if (/LATHE-PROD-READY-MS0::U-LPR/.test(id)) {
    const n = id.match(/U-LPR(?:RE)?(\d+)/)?.[1] || '?';
    data[id] = prodReady(n);
  } else if (/LATHE-MS\d+(?:\.5)?::U-LATH01/.test(id)) {
    data[id] = msCoord(id.match(/LATHE-MS([\d.]+)/)?.[1] || '?');
  } else if (rs === 0 && aw === 0) {
    data[id] = unresolvedFallback();
  } else {
    data[id] = null;
  }
}

fs.writeFileSync('H:/prism/state/shared/dashboards/ke-pass2-resume-agent-5.json', JSON.stringify(data, null, 1));
console.log('phase1 written', Object.keys(data).length);
