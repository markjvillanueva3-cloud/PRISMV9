#!/usr/bin/env node
// generate-launch-readiness-features.mjs
// /system-viz roost generator — ghost.launch_readiness L7
// Compounding artifact (forge-v5+ tax) for PRISM-LAUNCH-READINESS-MS0 audit.
//
// Reads:
//   - state/shared/specs/LAUNCH-READINESS-2026-05-24.json (audit source)
//   - mcp-server/data/roadmaps/PRISM-LAUNCH-READINESS-MS0.json (envelope source)
//
// Emits to stdout (or --out <path>):
//   - JSON array of viz feature nodes for ghost.launch_readiness roost
//   - Per-domain readiness sub-nodes (mill/lathe/wedm/cam/post-proc)
//   - Per-unit nodes (32 P0-P5 units from envelope)
//   - Per-blocker nodes (top 10 revenue blockers)
//
// Register in:
//   1. scripts/regen-viz.mjs FAST[] (so /system-viz picks it up on regen)
//   2. scripts/merge-augmentations.mjs splice block (so augmentations merge correctly)
//
// Pattern: matches scripts/generate-bridge-synergy-features.mjs +
//          scripts/generate-priority-queue-features.mjs +
//          scripts/generate-misc-tasks-features.mjs

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const AUDIT_JSON = path.join(REPO_ROOT, 'state', 'shared', 'specs', 'LAUNCH-READINESS-2026-05-24.json');
const ENVELOPE_JSON = path.join(REPO_ROOT, 'mcp-server', 'data', 'roadmaps', 'PRISM-LAUNCH-READINESS-MS0.json');

const COLOR = {
  P0: '#ff3838',
  P1: '#ff9038',
  P2: '#ffd038',
  ready_high: '#38c8ff',
  ready_mid: '#a8b8ff',
  ready_low: '#c8a8ff',
  blocker: '#ff5050',
  domain_lathe: '#38ff80',
  domain_mill: '#ffb038',
  domain_wedm: '#ff5050',
  domain_cam: '#38b8ff',
  domain_post: '#c038ff',
};

function readJsonOrFail(p, name) {
  if (!fs.existsSync(p)) {
    process.stderr.write(`[launch-readiness-features] missing ${name}: ${p}\n`);
    return null;
  }
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) {
    process.stderr.write(`[launch-readiness-features] parse-err ${name}: ${e.message}\n`);
    return null;
  }
}

function domainColor(d) {
  const k = d?.toLowerCase() || '';
  if (k.includes('lathe')) return COLOR.domain_lathe;
  if (k.includes('mill')) return COLOR.domain_mill;
  if (k.includes('wedm') || k.includes('wire')) return COLOR.domain_wedm;
  if (k.includes('cam')) return COLOR.domain_cam;
  if (k.includes('post')) return COLOR.domain_post;
  return COLOR.ready_mid;
}

function readinessColor(net) {
  if (net >= 60) return COLOR.ready_high;
  if (net >= 30) return COLOR.ready_mid;
  return COLOR.ready_low;
}

function build() {
  const audit = readJsonOrFail(AUDIT_JSON, 'audit JSON');
  const envelope = readJsonOrFail(ENVELOPE_JSON, 'envelope JSON');
  if (!audit || !envelope) {
    process.stderr.write('[launch-readiness-features] cannot proceed without both sources\n');
    return [];
  }

  const features = [];

  // Roost root — color reflects composite readiness pct
  const compositePct = audit.launchRevenueReadinessIndex?.compositeRevenueReadiness_pct ?? 0;
  features.push({
    id: 'ghost.launch_readiness',
    label: 'Launch Readiness',
    type: 'roost',
    layer: 7,
    color: readinessColor(compositePct),
    description: `PRISM revenue-launch scorecard. Composite: ${audit.launchRevenueReadinessIndex?.compositeRevenueReadiness_pct || '?'}%. Lathe-first path: ${audit.launchRevenueReadinessIndex?.compositeRevenueDistance_weeks || '?'} weeks.`,
    metadata: {
      auditDate: audit.auditDate,
      auditor: audit.auditor,
      composite_pct: audit.launchRevenueReadinessIndex?.compositeRevenueReadiness_pct,
      composite_distance_weeks: audit.launchRevenueReadinessIndex?.compositeRevenueDistance_weeks,
      milestone: envelope.milestoneId,
      total_units: envelope.totalUnits,
      weeks_est: envelope.weeksEst,
    },
  });

  // Per-domain readiness children
  const domains = audit.launchRevenueReadinessIndex?.perDomain || {};
  for (const [domain, data] of Object.entries(domains)) {
    features.push({
      id: `ghost.launch_readiness.domain.${domain}`,
      parent: 'ghost.launch_readiness',
      label: `${domain} (${data.netReadiness}% net)`,
      type: 'domain_readiness',
      layer: 7,
      color: domainColor(domain),
      description: `Depth ${data.depthScore} -Block ${data.blockerPenalty} -FE ${data.frontendPenalty} = Net ${data.netReadiness}%. Distance: ${data.revenueDistance_weeks}.`,
      metadata: {
        depth_score: data.depthScore,
        blocker_penalty: data.blockerPenalty,
        frontend_penalty: data.frontendPenalty,
        net_readiness: data.netReadiness,
        revenue_distance_weeks: data.revenueDistance_weeks,
      },
    });
  }

  // Per-blocker children (top 10)
  const blockers = audit.revenueBlockerRank || [];
  for (const b of blockers) {
    features.push({
      id: `ghost.launch_readiness.blocker.${b.rank}`,
      parent: 'ghost.launch_readiness',
      label: `[${b.severity}] #${b.rank}: ${b.blocker.slice(0, 50)}`,
      type: 'revenue_blocker',
      layer: 7,
      color: b.severity === 'P0' ? COLOR.P0 : (b.severity === 'P1' ? COLOR.P1 : COLOR.P2),
      description: b.evidence,
      metadata: {
        rank: b.rank,
        severity: b.severity,
        verification_channel: b.verificationChannel,
        fix: b.fix,
      },
    });
  }

  // Per-unit children (from envelope phases)
  const phases = envelope.phases || [];
  for (const phase of phases) {
    features.push({
      id: `ghost.launch_readiness.phase.${phase.phaseId}`,
      parent: 'ghost.launch_readiness',
      label: `${phase.phaseId} ${phase.name} (${phase.weeks})`,
      type: 'milestone_phase',
      layer: 7,
      color: phase.blockerSeverity === 'ALL_P0' ? COLOR.P0 : COLOR.ready_mid,
      description: `${(phase.units || []).length} units, weeks ${phase.weeks}`,
      metadata: {
        phase_id: phase.phaseId,
        unit_count: (phase.units || []).length,
        weeks: phase.weeks,
      },
    });

    for (const unit of (phase.units || [])) {
      features.push({
        id: `ghost.launch_readiness.unit.${unit.id}`,
        parent: `ghost.launch_readiness.phase.${phase.phaseId}`,
        label: `${unit.id}: ${unit.title.slice(0, 60)}`,
        type: 'milestone_unit',
        layer: 7,
        color: phase.blockerSeverity === 'ALL_P0' ? COLOR.P0 : (phase.phaseId === 'P1' ? COLOR.P1 : COLOR.P2),
        description: unit.title,
        metadata: {
          slot: unit.slot,
          status: unit.status,
          blocker: unit.blocker || null,
          deliverable: unit.deliverable,
          verification_channel: unit.verificationChannel,
          blocked_by: unit.blockedBy || [],
        },
      });
    }
  }

  // PSN-leg health (if available)
  const psn = audit.psnLegHealth || {};
  for (const [leg, status] of Object.entries(psn)) {
    const isRed = /DORMANT|FAILED|RED/i.test(status);
    const isYellow = /PARTIAL|YELLOW/i.test(status);
    features.push({
      id: `ghost.launch_readiness.psn.${leg}`,
      parent: 'ghost.launch_readiness',
      label: `PSN-${leg}: ${status.slice(0, 40)}`,
      type: 'psn_leg_health',
      layer: 7,
      color: isRed ? COLOR.P0 : (isYellow ? COLOR.P1 : COLOR.ready_high),
      description: status,
      metadata: { leg, status_text: status },
    });
  }

  return features;
}

function toAugmentation(features) {
  const newNodes = features.map(f => ({
    id: f.id,
    label: f.label,
    type: f.type,
    layer: f.layer,
    color: f.color,
    description: f.description,
    metadata: f.metadata || {},
  }));
  const newEdges = [];
  for (const f of features) {
    if (f.parent) {
      newEdges.push({ from: f.parent, to: f.id, type: 'launch_readiness_child' });
    }
  }
  return {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    newNodes,
    newEdges,
    stats: {
      total_features: features.length,
      domains: features.filter(f => f.type === 'domain_readiness').length,
      blockers: features.filter(f => f.type === 'revenue_blocker').length,
      phases: features.filter(f => f.type === 'milestone_phase').length,
      units: features.filter(f => f.type === 'milestone_unit').length,
      psn_legs: features.filter(f => f.type === 'psn_leg_health').length,
    },
  };
}

function main() {
  const argv = process.argv.slice(2);
  const outIdx = argv.indexOf('--out');
  const features = build();
  const aug = toAugmentation(features);

  // Default: write canonical augmentation file (sibling generators' convention)
  const defaultOut = path.join(REPO_ROOT, 'state', 'shared', 'system-viz', 'launch-readiness-augmentation.json');
  const outPath = outIdx >= 0 ? argv[outIdx + 1] : defaultOut;
  const json = JSON.stringify(aug, null, 2);
  fs.writeFileSync(outPath, json + '\n', 'utf8');
  process.stderr.write(`[launch-readiness-features] wrote ${features.length} features (${aug.newNodes.length} nodes / ${aug.newEdges.length} edges) to ${outPath}\n`);
}

// Windows-safe entry detection: compare normalized paths
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]).replace(/\\/g, '/') : '';
const thisFile = import.meta.dirname
  ? path.resolve(import.meta.dirname, 'generate-launch-readiness-features.mjs').replace(/\\/g, '/')
  : '';
if (invokedFile === thisFile || invokedFile.endsWith('generate-launch-readiness-features.mjs')) {
  main();
}

export { build };
