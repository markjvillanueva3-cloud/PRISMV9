import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWebSocket, type WSMessage } from '../hooks/useWebSocket';
import {
  dfmAnalyze,
  dfmCostImpact,
  dfmQuick,
  dfmRules,
  dfmToleranceCheck,
  quoteHistory,
  quoteInstant,
  quoteLeadTime,
  quoteQtyBreaks,
  quoteShareToken,
  quoteEstimate,
  quoteCompareMaterials,
  quotingGenerate,
  ApiError,
} from '../api/client';
import { LoadingState, ErrorState } from '../components/LoadingState';
import type {
  DfmAnalyzeResult,
  DfmCostImpactResult,
  DfmResult,
    DfmRule,
    DfmToleranceCheckResult,
    DfmWarning,
    InstantQuoteHistory,
    InstantQuoteLeadTimeOption,
  InstantQuoteQuantityBreak,
  InstantQuoteResult,
  InstantQuoteShareToken,
  MaterialComparison,
  QuoteEstimate,
} from '../api/types';
import { useOperatingSystem } from '../features/operating-system/OperatingSystemProvider';
import type { InventoryOperationsWorkspace, ProgramReleaseCatalog, ProgramReleaseInput, ProgramReleaseWorkspace } from '../features/operating-system/contracts';
import { buildCapturePath } from '../utils/captureRoute';
import { buildShopFloorPath } from '../utils/shopFloorRoute';
import { buildWorkflowPath, formatWorkflowSourceLabel, parseWorkflowRouteContext } from '../utils/workflowRouteContext';

type Tab = 'estimate' | 'compare' | 'generate';
type Complexity = 'simple' | 'medium' | 'complex';
type FinishProfile = 'as-machined' | 'production-finish' | 'premium-finish';
type InspectionLevel = 'standard' | 'fai' | 'cmm';
type CertificationLevel = 'none' | 'material-trace' | 'regulated-pack';
type DeliveryMode = 'economy' | 'standard' | 'expedite';
type CustomerIntent = 'prototype' | 'bridge' | 'production';

interface QuoteFormState {
  material: string;
  operation: string;
  quantity: string;
  part_length_mm: string;
  part_width_mm: string;
  part_height_mm: string;
  complexity: Complexity;
  tolerance_mm: string;
  finishProfile: FinishProfile;
  inspectionLevel: InspectionLevel;
  certificationLevel: CertificationLevel;
  deliveryMode: DeliveryMode;
  customerIntent: CustomerIntent;
}

interface CustomerQuoteOption {
  id: string;
  label: string;
  badge: string;
  summary: string;
  material: string;
  finishLabel: string;
  inspectionLabel: string;
  certificationLabel: string;
  deliveryLabel: string;
  unitPrice: number;
  total: number;
  leadDays: number;
  confidence: number;
  notes: string[];
  toneClass: string;
}

interface RequirementInsight {
  id: string;
  title: string;
  detail: string;
  toneClass: string;
}

interface HandoffReadinessItem {
  id: string;
  label: string;
  state: string;
  detail: string;
  toneClass: string;
}

interface CalibrationTarget {
  id: string;
  label: string;
  value: string;
  detail: string;
  toneClass: string;
  href: string;
  linkLabel: string;
}

interface DfmWorkspaceState {
  quick: DfmResult | null;
  analysis: DfmAnalyzeResult | null;
  tolerance: DfmToleranceCheckResult | null;
  costImpact: DfmCostImpactResult | null;
  rules: DfmRule[];
}

interface QuoteGenerateWorkspace {
  instant: InstantQuoteResult | null;
  qtyBreaks: InstantQuoteQuantityBreak[];
  leadTimeOptions: InstantQuoteLeadTimeOption[];
  history: InstantQuoteHistory | null;
  shareToken: InstantQuoteShareToken | null;
}

function SummaryTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br ${accent ?? 'from-cyan-400/22 via-cyan-300/8 to-transparent'}`} />
      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
        <div className="mt-3 text-2xl font-semibold text-slate-50">{value}</div>
        <div className="mt-2 text-sm text-slate-400">{hint}</div>
      </div>
    </div>
  );
}

function PanelCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
      <div className="mb-5">
        <div className="text-xl font-semibold text-slate-50">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-slate-400">{subtitle}</div> : null}
      </div>
      {children}
    </section>
  );
}

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  estimate: {
    label: 'Shop Best Price',
    detail: 'Physics-backed unit price, cycle time, and margin posture for the in-house quote.',
  },
  compare: {
    label: 'Compare Materials',
    detail: 'See how the route changes when the part moves across material families and pricing envelopes.',
  },
  generate: {
    label: 'Pricing Packet',
    detail: 'Build an internal pricing packet and network-ready handoff without manual cleanup.',
  },
};

const FINISH_OPTIONS: Array<{ value: FinishProfile; label: string; detail: string }> = [
  { value: 'as-machined', label: 'As-machined', detail: 'Keep the quote centered on the baseline machining surface.' },
  { value: 'production-finish', label: 'Production finish', detail: 'Bias toward a stronger finish package in the internal pricing model.' },
  { value: 'premium-finish', label: 'Premium finish', detail: 'Treat cosmetic quality and extra cleanup as first-class cost drivers.' },
];

const INSPECTION_OPTIONS: Array<{ value: InspectionLevel; label: string; detail: string }> = [
  { value: 'standard', label: 'Standard inspection', detail: 'Normal receiving and operator validation.' },
  { value: 'fai', label: 'FAI package', detail: 'First article and launch paperwork for a cleaner internal release handoff.' },
  { value: 'cmm', label: 'CMM-critical', detail: 'Premium inspection posture for tolerance-sensitive or regulated work.' },
];

const CERTIFICATION_OPTIONS: Array<{ value: CertificationLevel; label: string; detail: string }> = [
  { value: 'none', label: 'No special certs', detail: 'Standard pricing packet and normal release paperwork.' },
  { value: 'material-trace', label: 'Material traceability', detail: 'Include traceability and cert packet handling in the pricing packet.' },
  { value: 'regulated-pack', label: 'Regulated packet', detail: 'Bias toward regulated, auditable documentation posture.' },
];

const DELIVERY_OPTIONS: Array<{ value: DeliveryMode; label: string; detail: string }> = [
  { value: 'economy', label: 'Economy', detail: 'Favor lower pricing pressure over shortest promise date.' },
  { value: 'standard', label: 'PRISM standard', detail: 'The default quote posture PRISM would normally recommend.' },
  { value: 'expedite', label: 'Expedite', detail: 'Compress lead time and accept the premium that comes with it.' },
];

const CUSTOMER_INTENT_OPTIONS: Array<{ value: CustomerIntent; label: string; detail: string }> = [
  { value: 'prototype', label: 'Prototype', detail: 'Protect setup time and engineering touch points for low-volume work.' },
  { value: 'bridge', label: 'Bridge / pilot', detail: 'Keep launch flexibility while still watching margin and schedule closely.' },
  { value: 'production', label: 'Production', detail: 'Assume repeatability, price breaks, and durable pricing posture matter most.' },
];

const FINISH_LABELS: Record<FinishProfile, string> = {
  'as-machined': 'As-machined',
  'production-finish': 'Production finish',
  'premium-finish': 'Premium finish',
};

const INSPECTION_LABELS: Record<InspectionLevel, string> = {
  standard: 'Standard inspection',
  fai: 'FAI package',
  cmm: 'CMM-critical',
};

const CERTIFICATION_LABELS: Record<CertificationLevel, string> = {
  none: 'No special certs',
  'material-trace': 'Material traceability',
  'regulated-pack': 'Regulated packet',
};

const DELIVERY_LABELS: Record<DeliveryMode, string> = {
  economy: 'Economy delivery',
  standard: 'PRISM standard',
  expedite: 'Expedite delivery',
};

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

function buildToleranceStack(form: QuoteFormState) {
  const tolerance = parseFloat(form.tolerance_mm) || 0.05;
  return [tolerance, tolerance * 0.6, tolerance * 0.35].map((value) => Number(value.toFixed(4)));
}

function buildDfmIssueDrivers(form: QuoteFormState) {
  return [
    form.complexity === 'complex' ? 'complex-geometry' : null,
    (parseFloat(form.tolerance_mm) || 0.05) <= 0.01 ? 'tight-tolerance' : null,
    form.finishProfile !== 'as-machined' ? 'finish-control' : null,
    form.inspectionLevel !== 'standard' ? 'inspection-burden' : null,
    form.certificationLevel !== 'none' ? 'certification-pack' : null,
    form.deliveryMode === 'expedite' ? 'expedite-window' : null,
  ].filter((value): value is string => Boolean(value));
}

function mapInspectionLevel(level: InspectionLevel) {
  if (level === 'cmm') {
    return 'full_cmm';
  }
  if (level === 'fai') {
    return 'detailed';
  }
  return 'standard';
}

function buildInstantQuotePayload(
  form: QuoteFormState,
  recordLabel: string,
  releaseWorkspace: ProgramReleaseWorkspace | null,
) {
  return {
    part_name: recordLabel || 'PRISM internal quote',
    material: form.material,
    quantity: parseInt(form.quantity, 10) || 1,
    bounding_box_mm: {
      x: parseFloat(form.part_length_mm) || 1,
      y: parseFloat(form.part_width_mm) || 1,
      z: parseFloat(form.part_height_mm) || 1,
    },
    machine_type: releaseWorkspace?.selectedMachine.kinematics || undefined,
    features: buildDfmIssueDrivers(form).map((driver) => ({
      type: driver,
      count: 1,
      tolerance_mm: parseFloat(form.tolerance_mm) || 0.05,
      requires_5axis: releaseWorkspace?.selectedMachine.kinematics.toLowerCase().includes('5-axis') || false,
    })),
    inspection_level: mapInspectionLevel(form.inspectionLevel),
    first_article_required: form.inspectionLevel !== 'standard',
    certifications:
      form.certificationLevel === 'none'
        ? []
        : form.certificationLevel === 'regulated-pack'
          ? ['regulated-pack']
          : ['material-trace'],
    rush: form.deliveryMode === 'expedite',
    rush_tier: form.deliveryMode === 'expedite' ? '3day' : 'standard',
    repeat_order: form.customerIntent === 'production',
  };
}

function dfmToneClass(severity: string) {
  if (severity === 'critical') {
    return 'border-rose-300/18 bg-rose-300/[0.08] text-rose-50';
  }
  if (severity === 'warning') {
    return 'border-amber-300/18 bg-amber-300/[0.08] text-amber-50';
  }
  return 'border-cyan-300/18 bg-cyan-300/[0.08] text-cyan-50';
}

function pickCatalogId<T extends { id: string }>(items: T[], ...predicates: Array<(item: T) => boolean>) {
  for (const predicate of predicates) {
    const match = items.find(predicate);
    if (match) {
      return match.id;
    }
  }
  return items[0]?.id ?? '';
}

function buildProgramReleaseInput(catalog: ProgramReleaseCatalog, form: QuoteFormState): ProgramReleaseInput {
  const material = form.material.toLowerCase();
  const operation = form.operation.toLowerCase();
  const quantity = parseInt(form.quantity, 10) || 1;
  const turning = /turn|lathe/.test(operation);
  const fiveAxis = /5-axis|simultaneous/.test(operation);
  const complex = form.complexity === 'complex';
  const titanium = /ti|titanium/.test(material);
  const aluminum = /6061|7075|aluminum|aluminium/.test(material);
  const hydraulic = /manifold|cross-drill|port/.test(operation) || (!turning && complex && form.customerIntent !== 'prototype');

  const partClassId = pickCatalogId(
    catalog.partClasses,
    (item) => turning && item.id === 'turned-shaft',
    (item) => hydraulic && item.id === 'hydraulic-manifold',
    (item) => fiveAxis && item.id === 'assembly-pack',
    (item) => item.id === 'prismatic-bracket',
  );
  const machineId = pickCatalogId(
    catalog.machines,
    (item) => turning && complex && item.id === 'integrex-millturn',
    (item) => turning && item.id === 'st20-turn',
    (item) => fiveAxis && item.id === 'umc-5x',
    (item) => complex && form.customerIntent !== 'prototype' && item.id === 'umc-5x',
    (item) => item.id === 'vf2-3x',
  );
  const toolholderId = pickCatalogId(
    catalog.toolholders,
    (item) => turning && item.id === 'capto-turn',
    (item) => complex && !turning && item.id === 'hydraulic-reach',
    (item) => item.id === 'shrinkfit-short',
  );
  const toolingPackageId = pickCatalogId(
    catalog.toolingPackages,
    (item) => titanium && item.id === 'titanium-safe',
    (item) => aluminum && item.id === 'alu-velocity',
    (item) => item.id === 'steel-balanced',
  );
  const fixtureId = pickCatalogId(
    catalog.fixtures,
    (item) => turning && item.id === 'softjaw-collet',
    (item) => (fiveAxis || hydraulic || complex) && item.id === 'trunnion-self-center',
    (item) => item.id === 'modular-plate',
  );
  const stockId = pickCatalogId(
    catalog.stockProfiles,
    (item) => titanium && item.id === 'ti-billet',
    (item) => aluminum && item.id === '6061-plate',
    (item) => item.id === '174-round',
  );
  const cadSourceId = pickCatalogId(
    catalog.cadSources,
    (item) => (complex || form.customerIntent !== 'prototype' || quantity >= 50) && item.id === 'fusion-master',
    (item) => item.id === 'neutral-compare',
    (item) => item.id === 'prism-native',
  );

  return {
    packetId: ['pkt', partClassId, machineId, toolholderId, toolingPackageId, fixtureId, stockId, cadSourceId].join('__'),
    partClassId,
    machineId,
    toolholderId,
    toolingPackageId,
    fixtureId,
    stockId,
    cadSourceId,
  };
}

function buildOutsourceAdvisory(form: QuoteFormState, estimate: QuoteEstimate, workspace: ProgramReleaseWorkspace) {
  const criticalFindings = workspace.dfmFindings.filter((finding) => finding.severity === 'critical').length;
  const blockedChecks = [...workspace.collisionChecks, ...workspace.simulationChecks].filter((check) => check.status === 'blocked').length;
  const quantity = parseInt(form.quantity, 10) || 1;

  if (
    criticalFindings > 0 ||
    blockedChecks > 0 ||
    workspace.selectedStock.volatility === 'High' ||
    (form.deliveryMode === 'expedite' && form.complexity === 'complex')
  ) {
    return {
      label: 'Run outsource compare',
      detail:
        'Current risk posture is high enough that the quote should stay in-house first but still trigger a formal outsource compare before leadership commits capacity.',
      toneClass: 'border-rose-300/18 bg-rose-300/[0.08] text-rose-50',
    };
  }

  if (quantity >= 250 || form.customerIntent === 'production' || workspace.selectedMachine.machineRatePerHour >= 185 || estimate.confidence < 0.82) {
    return {
      label: 'Hybrid compare',
      detail:
        'The part still looks viable in-house, but volume, machine burden, or confidence posture means PRISM should compare supplier economics before final release.',
      toneClass: 'border-amber-300/18 bg-amber-300/[0.08] text-amber-50',
    };
  }

  return {
    label: 'Keep in-house lead',
    detail:
      'Current route, tooling, and release posture look strong enough that the shop-best price should remain the primary recommendation while outsource stays as a background benchmark.',
    toneClass: 'border-emerald-300/18 bg-emerald-300/[0.08] text-emerald-50',
  };
}

function estimateLeadDays(form: QuoteFormState) {
  const quantity = parseInt(form.quantity, 10) || 1;
  const tolerance = parseFloat(form.tolerance_mm) || 0.05;
  const complexityDays: Record<Complexity, number> = {
    simple: 4,
    medium: 6,
    complex: 9,
  };

  let days = complexityDays[form.complexity];
  if (quantity >= 25) days += 1;
  if (quantity >= 100) days += 2;
  if (quantity >= 500) days += 3;
  if (tolerance <= 0.025) days += 1;
  if (tolerance <= 0.01) days += 2;
  if (form.customerIntent === 'prototype') days += 1;
  if (form.customerIntent === 'production') days = Math.max(3, days - 1);
  return Math.max(days, 2);
}

function optionMultiplier({
  finishProfile,
  inspectionLevel,
  certificationLevel,
  deliveryMode,
}: {
  finishProfile: FinishProfile;
  inspectionLevel: InspectionLevel;
  certificationLevel: CertificationLevel;
  deliveryMode: DeliveryMode;
}) {
  const finish = {
    'as-machined': 0,
    'production-finish': 0.05,
    'premium-finish': 0.12,
  }[finishProfile];
  const inspection = {
    standard: 0,
    fai: 0.05,
    cmm: 0.11,
  }[inspectionLevel];
  const certification = {
    none: 0,
    'material-trace': 0.03,
    'regulated-pack': 0.08,
  }[certificationLevel];
  const delivery = {
    economy: -0.04,
    standard: 0,
    expedite: 0.14,
  }[deliveryMode];

  return finish + inspection + certification + delivery;
}

function optionLeadDelta(deliveryMode: DeliveryMode, inspectionLevel: InspectionLevel, certificationLevel: CertificationLevel) {
  const deliveryDelta = {
    economy: 3,
    standard: 0,
    expedite: -2,
  }[deliveryMode];
  const inspectionDelta = inspectionLevel === 'cmm' ? 1 : inspectionLevel === 'fai' ? 0.5 : 0;
  const certificationDelta = certificationLevel === 'regulated-pack' ? 1 : certificationLevel === 'material-trace' ? 0.5 : 0;
  return deliveryDelta + inspectionDelta + certificationDelta;
}

function buildQuoteOption({
  id,
  badge,
  label,
  summary,
  toneClass,
  estimate,
  comparison,
  form,
  finishProfile,
  inspectionLevel,
  certificationLevel,
  deliveryMode,
  notes,
}: {
  id: string;
  badge: string;
  label: string;
  summary: string;
  toneClass: string;
  estimate: QuoteEstimate;
  comparison?: MaterialComparison | null;
  form: QuoteFormState;
  finishProfile: FinishProfile;
  inspectionLevel: InspectionLevel;
  certificationLevel: CertificationLevel;
  deliveryMode: DeliveryMode;
  notes: string[];
}): CustomerQuoteOption {
  const quantity = parseInt(form.quantity, 10) || 1;
  const baseTotal = comparison?.total ?? estimate.total;
  const total = baseTotal * (1 + optionMultiplier({ finishProfile, inspectionLevel, certificationLevel, deliveryMode }));
  const baseConfidence = comparison ? Math.max(0.58, estimate.confidence - 0.04) : estimate.confidence;
  const confidenceShift = deliveryMode === 'expedite' ? -0.05 : deliveryMode === 'economy' ? 0.01 : 0;
  const qualityShift = inspectionLevel === 'cmm' ? 0.04 : inspectionLevel === 'fai' ? 0.02 : 0;
  const confidence = Math.min(0.99, Math.max(0.4, baseConfidence + confidenceShift + qualityShift));
  const leadDays = Math.max(2, Math.round(estimateLeadDays(form) + optionLeadDelta(deliveryMode, inspectionLevel, certificationLevel)));

  return {
    id,
    badge,
    label,
    summary,
    material: comparison?.material ?? form.material,
    finishLabel: FINISH_LABELS[finishProfile],
    inspectionLabel: INSPECTION_LABELS[inspectionLevel],
    certificationLabel: CERTIFICATION_LABELS[certificationLevel],
    deliveryLabel: DELIVERY_LABELS[deliveryMode],
    unitPrice: total / quantity,
    total,
    leadDays,
    confidence,
    notes,
    toneClass,
  };
}

function buildCustomerQuoteOptions(estimate: QuoteEstimate, comparisons: MaterialComparison[], form: QuoteFormState) {
  const alternativeComparisons = comparisons.filter((comparison) => comparison.material !== form.material);
  const lowestCostAlternative = [...alternativeComparisons].sort((left, right) => left.total - right.total)[0] ?? null;
  const bestToolLifeAlternative = [...alternativeComparisons].sort(
    (left, right) => right.tool_life_factor - left.tool_life_factor,
  )[0] ?? null;

  const recommended = buildQuoteOption({
    id: 'prism-recommended',
    badge: 'Primary recommendation',
    label: 'PRISM shop best price',
    summary:
      'This is the number the shop should lead with internally because it reflects the best current balance of manufacturability, confidence, margin protection, and schedule reality.',
    toneClass: 'border-emerald-300/26 bg-emerald-300/[0.09] text-emerald-50',
    estimate,
    form,
    finishProfile: form.finishProfile,
    inspectionLevel: form.inspectionLevel,
    certificationLevel: form.certificationLevel,
    deliveryMode: form.deliveryMode,
    notes: [
      `Current route uses ${form.material} and ${form.operation} as the primary process posture.`,
      `${Math.round(estimate.confidence * 100)}% engine confidence keeps this as the safest internal pricing anchor right now.`,
      'Future network pricing should branch from this number, not silently replace it.',
    ],
  });

  const economy = buildQuoteOption({
    id: 'margin-floor',
    badge: 'Margin floor',
    label: 'Margin-protect floor',
    summary:
      'Use this when leadership wants the lowest acceptable shop price that still protects contribution margin and avoids undercutting the operation.',
    toneClass: 'border-sky-300/22 bg-sky-300/[0.08] text-sky-50',
    estimate,
    comparison: lowestCostAlternative,
    form,
    finishProfile: 'as-machined',
    inspectionLevel: 'standard',
    certificationLevel: 'none',
    deliveryMode: 'economy',
    notes: [
      lowestCostAlternative
        ? `${lowestCostAlternative.material} is currently the cheapest alternate material in the comparison lane.`
        : 'Uses the current material but backs off premium quality and delivery posture.',
      'Best for setting the internal floor before sales or leadership trims price further.',
    ],
  });

  const fastTrack = buildQuoteOption({
    id: 'axhera-network-target',
    badge: 'Future network target',
    label: 'Axhera network target',
    summary:
      'This is the future external-network price posture to compare against the shop-best quote once Axhera connectivity is live.',
    toneClass: 'border-amber-300/24 bg-amber-300/[0.08] text-amber-50',
    estimate,
    comparison: lowestCostAlternative,
    form,
    finishProfile: 'production-finish',
    inspectionLevel: 'standard',
    certificationLevel: 'none',
    deliveryMode: 'economy',
    notes: [
      'Keep this separate from the shop-best quote so channel pressure never hides the true in-house recommendation.',
      'Use it to compare what the market-facing number could be once the Axhera integration is active.',
    ],
  });

  const qualityFirst = buildQuoteOption({
    id: 'quality-safeguard',
    badge: 'Higher assurance',
    label: 'Quality safeguard',
    summary:
      'For regulated, finish-critical, or launch-sensitive work where inspection, documentation, and cleaner process control should outrank the lowest internal number.',
    toneClass: 'border-violet-300/24 bg-violet-300/[0.08] text-violet-50',
    estimate,
    comparison: bestToolLifeAlternative,
    form,
    finishProfile: 'premium-finish',
    inspectionLevel: 'cmm',
    certificationLevel: 'regulated-pack',
    deliveryMode: 'standard',
    notes: [
      bestToolLifeAlternative
        ? `${bestToolLifeAlternative.material} currently offers the strongest tool-life posture in the material compare lane.`
        : 'Uses the current material but adds premium quality and traceability posture.',
      'This is the safest alternative when process assurance should outrank the lowest external number.',
    ],
  });

  return {
    recommended,
    alternatives: [economy, fastTrack, qualityFirst],
  };
}

function buildRequirementInsights(form: QuoteFormState): RequirementInsight[] {
  const insights: RequirementInsight[] = [];
  const tolerance = parseFloat(form.tolerance_mm) || 0.05;
  const quantity = parseInt(form.quantity, 10) || 1;

  if (tolerance <= 0.01) {
    insights.push({
      id: 'tight-tolerance',
      title: 'Tight tolerance review',
      detail: 'Quote should carry explicit process-risk review because this tolerance range will drive inspection time, setup discipline, and possible cycle extension.',
      toneClass: 'border-amber-300/18 bg-amber-300/[0.08] text-amber-50',
    });
  }

  if (form.inspectionLevel !== 'standard' || form.certificationLevel !== 'none') {
    insights.push({
      id: 'quality-docs',
      title: 'Quality packet required',
      detail: 'Pricing should assume controlled documentation, sign-off, and release handling so the shop does not win the job and lose margin on paperwork.',
      toneClass: 'border-violet-300/18 bg-violet-300/[0.08] text-violet-50',
    });
  }

  if (form.deliveryMode === 'expedite') {
    insights.push({
      id: 'capacity-risk',
      title: 'Capacity compression risk',
      detail: 'Expedited delivery should be treated as a real capacity decision, not a free promise-date toggle. Protect queue health and setup efficiency.',
      toneClass: 'border-rose-300/18 bg-rose-300/[0.08] text-rose-50',
    });
  }

  if (form.complexity === 'complex' || quantity <= 10 || form.customerIntent === 'prototype') {
    insights.push({
      id: 'engineering-touch',
      title: 'Engineering touch expected',
      detail: 'Prototype or complex work should carry setup-sheet, prove-out, and process-review effort so quoting and programming stay aligned.',
      toneClass: 'border-cyan-300/18 bg-cyan-300/[0.08] text-cyan-50',
    });
  }

  if (form.finishProfile === 'premium-finish') {
    insights.push({
      id: 'finish-guard',
      title: 'Finish guardrail',
      detail: 'Premium finish posture needs explicit allowance for secondary cleanup, handling risk, and visual quality protection.',
      toneClass: 'border-emerald-300/18 bg-emerald-300/[0.08] text-emerald-50',
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'stable-baseline',
      title: 'Stable baseline packet',
      detail: 'Current quote posture looks clean enough for a normal internal release packet without adding special risk multipliers.',
      toneClass: 'border-emerald-300/18 bg-emerald-300/[0.08] text-emerald-50',
    });
  }

  return insights;
}

function buildHandoffReadiness(form: QuoteFormState): HandoffReadinessItem[] {
  const quantity = parseInt(form.quantity, 10) || 1;
  const tolerance = parseFloat(form.tolerance_mm) || 0.05;

  return [
    {
      id: 'stock-tooling',
      label: 'Raw stock + tooling',
      state: quantity >= 100 ? 'Needs buy-plan' : 'Ready to stage',
      detail:
        quantity >= 100
          ? 'Higher-volume quote should flow into stock, insert, and tooling checks before release.'
          : 'Current quantity can move through normal raw-stock and tool availability review.',
      toneClass: quantity >= 100 ? 'text-amber-100' : 'text-emerald-100',
    },
    {
      id: 'quality-packet',
      label: 'QC packet',
      state: form.inspectionLevel === 'standard' && form.certificationLevel === 'none' ? 'Standard packet' : 'Enhanced packet',
      detail:
        form.inspectionLevel === 'standard' && form.certificationLevel === 'none'
          ? 'Standard traveler and receiving validation should be enough for release.'
          : 'Quote should hand off inspection level, cert requirements, and packet expectations directly into production.',
      toneClass:
        form.inspectionLevel === 'standard' && form.certificationLevel === 'none' ? 'text-emerald-100' : 'text-violet-100',
    },
    {
      id: 'setup-proveout',
      label: 'Setup + prove-out',
      state: form.complexity === 'complex' || form.customerIntent === 'prototype' ? 'Engineering review' : 'Normal setup',
      detail:
        form.complexity === 'complex' || form.customerIntent === 'prototype'
          ? 'Programming, prove-out, and setup-sheet depth should be baked into the handoff.'
          : 'Normal traveler and setup packet should carry the release cleanly.',
      toneClass:
        form.complexity === 'complex' || form.customerIntent === 'prototype' ? 'text-cyan-100' : 'text-emerald-100',
    },
    {
      id: 'schedule-posture',
      label: 'Schedule posture',
      state: form.deliveryMode === 'expedite' || tolerance <= 0.01 ? 'Manager sign-off' : 'Planner release',
      detail:
        form.deliveryMode === 'expedite' || tolerance <= 0.01
          ? 'Schedule pressure or tight tolerance should surface for explicit planner or management review.'
          : 'Current promise posture is safe for normal planner release.',
      toneClass:
        form.deliveryMode === 'expedite' || tolerance <= 0.01 ? 'text-amber-100' : 'text-emerald-100',
    },
  ];
}

export function QuoteBuilderPage() {
  const location = useLocation();
  const operatingSystem = useOperatingSystem();
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeContext = useMemo(() => parseWorkflowRouteContext(location.search), [location.search]);
  const [tab, setTab] = useState<Tab>('estimate');
  const [estimate, setEstimate] = useState<QuoteEstimate | null>(null);
  const [comparisons, setComparisons] = useState<MaterialComparison[]>([]);
  const [dfmResult, setDfmResult] = useState<DfmResult | null>(null);
  const [dfmWorkspace, setDfmWorkspace] = useState<DfmWorkspaceState | null>(null);
  const [dfmError, setDfmError] = useState<string | null>(null);
  const [dfmNotice, setDfmNotice] = useState<string | null>(null);
  const [dfmLoading, setDfmLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteDoc, setQuoteDoc] = useState<unknown>(null);
  const [quoteGenerateWorkspace, setQuoteGenerateWorkspace] = useState<QuoteGenerateWorkspace | null>(null);
  const [quoteGenerateNotice, setQuoteGenerateNotice] = useState<string | null>(null);
  const [releaseCatalog, setReleaseCatalog] = useState<ProgramReleaseCatalog | null>(null);
  const [releaseWorkspace, setReleaseWorkspace] = useState<ProgramReleaseWorkspace | null>(null);
  const [inventoryWorkspace, setInventoryWorkspace] = useState<InventoryOperationsWorkspace | null>(null);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [quoteProgress, setQuoteProgress] = useState<string | null>(null);

  // RT: WebSocket for quote updates — live progress on long-running generation
  const onWsMessage = useCallback((msg: WSMessage) => {
    if (msg.type === 'quote:update' && typeof msg.payload.stage === 'string') {
      setQuoteProgress(msg.payload.stage);
    }
    if (msg.type === 'job:complete' || msg.type === 'notification') {
      setQuoteProgress(null);
    }
  }, []);
  const { isConnected: wsConnected } = useWebSocket({
    rooms: ['quote:all', 'system:all'],
    onMessage: onWsMessage,
    autoConnect: true,
  });
  const initialCustomerIntent =
    routeParams.get('customerIntent') === 'prototype' ||
    routeParams.get('customerIntent') === 'bridge' ||
    routeParams.get('customerIntent') === 'production'
      ? (routeParams.get('customerIntent') as CustomerIntent)
      : 'bridge';
  const [form, setForm] = useState<QuoteFormState>({
    material: '6061-T6',
    operation: 'milling',
    quantity: '100',
    part_length_mm: '100',
    part_width_mm: '50',
    part_height_mm: '25',
    complexity: 'medium',
    tolerance_mm: '0.05',
    finishProfile: 'production-finish',
    inspectionLevel: 'fai',
    certificationLevel: 'material-trace',
    deliveryMode: 'standard',
    customerIntent: initialCustomerIntent,
  });

  useEffect(() => {
    let active = true;

    operatingSystem
      .getProgramReleaseCatalog()
      .then((catalog) => {
        if (active) {
          setReleaseCatalog(catalog);
        }
      })
      .catch(() => {
        if (active) {
          setReleaseCatalog(null);
        }
      });

    return () => {
      active = false;
    };
  }, [operatingSystem]);

  useEffect(() => {
    let active = true;

    operatingSystem
      .getInventoryOperationsWorkspace()
      .then((workspace) => {
        if (active) {
          setInventoryWorkspace(workspace);
        }
      })
      .catch(() => {
        if (active) {
          setInventoryWorkspace(null);
        }
      });

    return () => {
      active = false;
    };
  }, [operatingSystem]);

  const activeTab = TAB_CONFIG[tab];
  const upstreamSource = routeContext.origin.source || null;
  const upstreamRecordType = routeContext.origin.recordType || null;
  const upstreamRecordId = routeContext.origin.recordId || null;
  const upstreamCustomer = routeContext.origin.customer || null;
  const upstreamNote = routeContext.origin.note || null;
  const upstreamSourceLabel = useMemo(() => formatWorkflowSourceLabel(upstreamSource), [upstreamSource]);
  const upstreamRecordLabel = useMemo(() => {
    if (!upstreamRecordType && !upstreamRecordId) {
      return '';
    }
    if (upstreamRecordType && upstreamRecordId) {
      return `${upstreamRecordType} ${upstreamRecordId}`;
    }
    return upstreamRecordType ?? upstreamRecordId ?? '';
  }, [upstreamRecordId, upstreamRecordType]);
  const upstreamContextNote = useMemo(() => {
    const recordPrefix = upstreamCustomer
      ? `${upstreamCustomer}`
      : upstreamRecordLabel
        ? `${upstreamRecordLabel}`
        : 'this upstream record';

    return upstreamNote
      ? upstreamNote
      : `Carry ${recordPrefix} context through pricing, release, and downstream evidence capture.`;
  }, [upstreamCustomer, upstreamNote, upstreamRecordLabel]);
  const footprint = useMemo(() => {
    const length = parseFloat(form.part_length_mm) || 0;
    const width = parseFloat(form.part_width_mm) || 0;
    const height = parseFloat(form.part_height_mm) || 0;
    return `${length.toFixed(0)} × ${width.toFixed(0)} × ${height.toFixed(0)} mm`;
  }, [form.part_height_mm, form.part_length_mm, form.part_width_mm]);
  const quoteOptions = useMemo(
    () => (estimate ? buildCustomerQuoteOptions(estimate, comparisons, form) : null),
    [comparisons, estimate, form],
  );
  const requirementInsights = useMemo(() => buildRequirementInsights(form), [form]);
  const handoffReadiness = useMemo(() => buildHandoffReadiness(form), [form]);
  const releaseInput = useMemo(
    () => (releaseCatalog ? buildProgramReleaseInput(releaseCatalog, form) : null),
    [form, releaseCatalog],
  );
  const releaseFocusId = useMemo(() => {
    const existing = routeContext.focus.quoteId || routeContext.focus.id;
    if (existing) {
      return existing;
    }

    return `${form.material}-${form.operation}-${form.customerIntent}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }, [form.customerIntent, form.material, form.operation, routeContext.focus.id, routeContext.focus.quoteId]);
  const effectiveOrigin = useMemo(
    () =>
      routeContext.origin.source
        ? routeContext.origin
        : {
            source: 'quote-builder',
            recordType: 'Quote',
            recordId: releaseFocusId,
            customer: upstreamCustomer ?? '',
            note: 'Carry the shop-best quote posture into release, simulation, and downstream calibration.',
            threadId: routeContext.origin.threadId,
          },
    [releaseFocusId, routeContext.origin, upstreamCustomer],
  );
  const inventoryFocus = useMemo(
    () => ({
      type: 'quote',
      id: releaseFocusId,
      quoteId: releaseFocusId,
      packetId: releaseInput?.packetId ?? routeContext.focus.packetId,
    }),
    [releaseFocusId, releaseInput?.packetId, routeContext.focus.packetId],
  );
  const buildInventoryHref = (
    tab: 'documents' | 'checkout' | 'toolopt',
    options: { toolId?: string } = {},
  ) =>
    buildWorkflowPath('/inventory', location.search, {
      origin: effectiveOrigin,
      focus: inventoryFocus,
      extras: {
        tab,
        source: 'quote-builder',
        toolId: options.toolId,
      },
    });
  const releaseHref = useMemo(
    () =>
      releaseInput
        ? buildWorkflowPath('/print-to-cnc', location.search, {
            origin: effectiveOrigin,
            focus: {
              type: 'quote',
              id: releaseFocusId,
              quoteId: releaseFocusId,
              packetId: releaseInput.packetId,
            },
            extras: {
              packetId: releaseInput.packetId,
              partClassId: releaseWorkspace?.selectedPartClass.id ?? releaseInput.partClassId,
              machineId: releaseWorkspace?.selectedMachine.id ?? releaseInput.machineId,
              machineFamilyId: releaseWorkspace?.selectedMachine.familyId,
              machineManufacturer:
                releaseWorkspace?.selectedMachine.manufacturerId
                ?? releaseWorkspace?.selectedMachine.manufacturer?.toLowerCase(),
              toolholderId: releaseWorkspace?.selectedToolholder.id ?? releaseInput.toolholderId,
              toolingPackageId: releaseWorkspace?.selectedToolingPackage.id ?? releaseInput.toolingPackageId,
              fixtureId: releaseWorkspace?.selectedFixture.id ?? releaseInput.fixtureId,
              stockId: releaseWorkspace?.selectedStock.id ?? releaseInput.stockId,
              cadSourceId: releaseWorkspace?.selectedCadSource.id ?? releaseInput.cadSourceId,
            },
          })
        : '/print-to-cnc',
    [effectiveOrigin, location.search, releaseFocusId, releaseInput, releaseWorkspace],
  );
  const axheraScenario = useMemo(
    () => quoteOptions?.alternatives.find((option) => option.id === 'axhera-network-target') ?? null,
    [quoteOptions],
  );
  const axheraDelta = useMemo(() => {
    if (!quoteOptions || !axheraScenario || quoteOptions.recommended.total <= 0) {
      return null;
    }

    const delta = axheraScenario.total - quoteOptions.recommended.total;
    const deltaPct = (delta / quoteOptions.recommended.total) * 100;
    return {
      amount: delta,
      pct: deltaPct,
    };
  }, [axheraScenario, quoteOptions]);
  const outsourceAdvisory = useMemo(
    () => (estimate && releaseWorkspace ? buildOutsourceAdvisory(form, estimate, releaseWorkspace) : null),
    [estimate, form, releaseWorkspace],
  );
  const calibrationCaptureHref = useMemo(
    () =>
      buildCapturePath(location.pathname, location.search, {
        source: 'quote-builder',
        target: form.inspectionLevel === 'standard' ? 'job' : 'quality',
        job: `${form.material} ${form.operation}`,
        department: 'Quoting',
        note: `${upstreamCustomer ? `${upstreamCustomer}: ` : ''}Capture print, setup, and manufacturability evidence that should stay tied to the quote before release.`,
      }),
    [form.inspectionLevel, form.material, form.operation, location.pathname, location.search, upstreamCustomer],
  );
  const calibrationShopFloorHref = useMemo(
    () =>
      buildShopFloorPath(location.pathname, location.search, {
        source: 'quote-builder',
        department: 'Job setup',
        operation: releaseWorkspace?.operationPlan[0]?.title ?? form.operation,
        machine: releaseWorkspace?.selectedMachine.label ?? '',
        note: `${upstreamCustomer ? `${upstreamCustomer}: ` : ''}Seed setup, prove-out, and actual-vs-standard capture from the quote recommendation once this work releases to the floor.`,
      }),
    [form.operation, location.pathname, location.search, releaseWorkspace, upstreamCustomer],
  );
  const calibrationPurchasingHref = useMemo(
    () =>
      buildWorkflowPath('/purchasing', location.search, {
        origin: effectiveOrigin,
        focus: inventoryFocus,
        extras: {
          source: 'quote-builder',
          tab: 'recommend',
          material: form.material,
          query: releaseWorkspace?.selectedStock.material ?? '',
        },
      }),
    [effectiveOrigin, form.material, inventoryFocus, location.search, releaseWorkspace?.selectedStock.material],
  );
  const calibrationQualityHref = useMemo(
    () =>
      buildWorkflowPath('/quality', location.search, {
        origin: effectiveOrigin,
        focus: inventoryFocus,
        extras: {
          source: 'quote-builder',
          tab: form.certificationLevel === 'none' ? (form.inspectionLevel === 'standard' ? 'trace' : 'fai') : 'matcert',
        },
      }),
    [effectiveOrigin, form.certificationLevel, form.inspectionLevel, inventoryFocus, location.search],
  );
  const calibrationTargets = useMemo<CalibrationTarget[]>(() => {
    if (!estimate || !releaseWorkspace) {
      return [];
    }

    const plannedCutMinutes = releaseWorkspace.operationPlan.reduce((sum, operation) => sum + operation.cycleMinutes, 0);
    const documentCount = inventoryWorkspace?.documentTemplates.length ?? 0;
    const routeCount = inventoryWorkspace?.departmentRoutes.length ?? 0;
    const usagePulseCount = inventoryWorkspace?.usagePulses.length ?? 0;
    const releaseGateCount = releaseWorkspace.collisionChecks.length + releaseWorkspace.simulationChecks.length;

    return [
      {
        id: 'receiving-baseline',
        label: 'Receiving + requirements baseline',
        value: documentCount > 0 ? `${documentCount} intake templates` : 'Inventory intake ready',
        detail:
          documentCount > 0
            ? `Start with purchase orders, delivery records, and part-number extraction so material certs, supplier references, and department ownership are clean before the traveler opens. ${routeCount} department routes are already staged for the receiving handoff.`
            : 'Use inventory intake to anchor supplier documents, cert posture, and department ownership before the quote becomes a traveler.',
        toneClass: 'border-cyan-300/18 bg-cyan-300/[0.08] text-cyan-50',
          href: buildInventoryHref('documents'),
          linkLabel: 'Open inventory intake',
        },
        {
        id: 'tooling-economics',
        label: 'Tooling cost attribution',
        value: usagePulseCount > 0 ? `${usagePulseCount} tooling pulses live` : releaseWorkspace.selectedToolingPackage.label,
        detail: `Track ${releaseWorkspace.selectedToolingPackage.label} with ${releaseWorkspace.selectedToolholder.label} through checkout, insert indexing, and regrind review so cost-per-part and tool-life drift can recalibrate this quote later.`,
        toneClass: 'border-amber-300/18 bg-amber-300/[0.08] text-amber-50',
          href: buildInventoryHref('toolopt', { toolId: releaseWorkspace.selectedToolingPackage.id }),
          linkLabel: 'Open tool economics',
        },
      {
        id: 'sourcing-posture',
        label: 'Supplier + stock posture',
        value: releaseWorkspace.selectedStock.label,
        detail: `Carry ${form.material} sourcing posture into Purchasing so supplier lead, market pricing, and stock volatility stay tied to the same quote and packet assumptions before release.`,
        toneClass: 'border-sky-300/18 bg-sky-300/[0.08] text-sky-50',
        href: calibrationPurchasingHref,
        linkLabel: 'Open sourcing posture',
      },
      {
        id: 'shop-floor-actuals',
        label: 'Cycle + labor validation',
        value: `${releaseWorkspace.operationPlan.length} ops · ${plannedCutMinutes.toFixed(0)} min plan`,
        detail: 'Shop Floor Clock should capture setup, run-cycle, support work, extras, and actual-vs-standard time so margin, staffing, and quote confidence improve from the first run instead of waiting for hindsight.',
        toneClass: 'border-emerald-300/18 bg-emerald-300/[0.08] text-emerald-50',
        href: calibrationShopFloorHref,
        linkLabel: 'Open shop-floor actuals',
      },
      {
        id: 'quality-posture',
        label: 'Quality + cert posture',
        value: `${INSPECTION_LABELS[form.inspectionLevel]} · ${CERTIFICATION_LABELS[form.certificationLevel]}`,
        detail: 'Send inspection, FAI, and certification posture into Quality Management before release so traceability, cert risk, and containment expectations stay attached to the same quote context.',
        toneClass: 'border-fuchsia-300/18 bg-fuchsia-300/[0.08] text-fuchsia-50',
        href: calibrationQualityHref,
        linkLabel: 'Open quality handoff',
      },
      {
        id: 'evidence-loop',
        label: 'Evidence + release feedback',
        value: `${releaseGateCount} release gates`,
        detail: `Capture print, setup, and ${INSPECTION_LABELS[form.inspectionLevel].toLowerCase()} evidence beside the matched release packet so prove-out notes, DFM findings, and simulation posture can explain later quote adjustments clearly.`,
        toneClass: 'border-violet-300/18 bg-violet-300/[0.08] text-violet-50',
        href: calibrationCaptureHref,
        linkLabel: 'Open Capture Ops',
      },
    ];
  }, [
    calibrationCaptureHref,
    calibrationPurchasingHref,
    calibrationQualityHref,
    calibrationShopFloorHref,
    estimate,
    form.certificationLevel,
    form.inspectionLevel,
    form.material,
    inventoryWorkspace,
    releaseWorkspace,
  ]);

  useEffect(() => {
    if (!estimate || !releaseInput) {
      setReleaseWorkspace(null);
      setReleaseLoading(false);
      setReleaseError(null);
      return;
    }

    let active = true;
    setReleaseLoading(true);
    setReleaseError(null);

    operatingSystem
      .buildProgramReleaseWorkspace(releaseInput)
      .then((workspace) => {
        if (active) {
          setReleaseWorkspace(workspace);
        }
      })
      .catch((issue) => {
        if (active) {
          setReleaseWorkspace(null);
          setReleaseError(issue instanceof Error ? issue.message : 'Matched release workspace unavailable right now.');
        }
      })
      .finally(() => {
        if (active) {
          setReleaseLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [estimate, operatingSystem, releaseInput]);

  function updateField<K extends keyof QuoteFormState>(key: K, value: QuoteFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleEstimate() {
    setLoading(true);
    setError(null);
    setDfmLoading(true);
    setDfmError(null);
    setDfmNotice(null);
    try {
      const basePayload = {
        material: form.material,
        operation: form.operation,
        quantity: parseInt(form.quantity, 10) || 1,
        part_length_mm: parseFloat(form.part_length_mm) || 100,
        part_width_mm: parseFloat(form.part_width_mm) || 50,
        part_height_mm: parseFloat(form.part_height_mm) || 25,
        complexity: form.complexity,
        tolerance_mm: parseFloat(form.tolerance_mm) || 0.05,
        finish_profile: form.finishProfile,
        inspection_level: form.inspectionLevel,
        certification_level: form.certificationLevel,
        delivery_mode: form.deliveryMode,
        customer_intent: form.customerIntent,
      };
      const dfmIssueDrivers = buildDfmIssueDrivers(form);
      const [estimateResponse, compareResponse, dfmQuickResponse, dfmAnalyzeResponse, dfmToleranceResponse, dfmCostImpactResponse, dfmRulesResponse] =
        await Promise.allSettled([
        quoteEstimate({
          ...basePayload,
        }),
        quoteCompareMaterials({
          ...form,
          quantity: parseInt(form.quantity, 10) || 1,
          materials: ['6061-T6', '7075-T6', '304 Stainless', '4140 Steel', 'Ti-6Al-4V'],
        }),
        dfmQuick({
          ...basePayload,
          process: form.operation,
        }),
        dfmAnalyze({
          ...basePayload,
          process: form.operation,
        }),
        dfmToleranceCheck({
          stack: buildToleranceStack(form),
          tolerance_mm: parseFloat(form.tolerance_mm) || 0.05,
          material: form.material,
          process: form.operation,
        }),
        dfmCostImpact({
          issues: dfmIssueDrivers.length > 0 ? dfmIssueDrivers : ['baseline-review'],
          material: form.material,
          quantity: parseInt(form.quantity, 10) || 1,
          process: form.operation,
        }),
        dfmRules(),
      ]);

      if (estimateResponse.status === 'rejected') {
        throw estimateResponse.reason;
      }

      setEstimate(estimateResponse.value.result as unknown as QuoteEstimate);
      if (compareResponse.status === 'fulfilled') {
        setComparisons(
          ((compareResponse.value.result as unknown as { comparisons?: MaterialComparison[] })?.comparisons ??
            (compareResponse.value.result as unknown as MaterialComparison[])) ??
            [],
        );
      }

      if (dfmQuickResponse.status === 'fulfilled') {
        setDfmResult((dfmQuickResponse.value.result as unknown as DfmResult) ?? null);
        setDfmError(null);
      } else {
        setDfmResult(null);
        setDfmWorkspace(null);
        setDfmError(
          dfmQuickResponse.reason instanceof ApiError ? dfmQuickResponse.reason.message : 'Mounted DFM route unavailable right now.',
        );
      }

      if (dfmQuickResponse.status === 'fulfilled') {
        const partialFailures: string[] = [];
        const analysis =
          dfmAnalyzeResponse.status === 'fulfilled'
            ? ((dfmAnalyzeResponse.value.result as unknown as DfmAnalyzeResult) ?? null)
            : (partialFailures.push('full analysis'), null);
        const tolerance =
          dfmToleranceResponse.status === 'fulfilled'
            ? ((dfmToleranceResponse.value.result as unknown as DfmToleranceCheckResult) ?? null)
            : (partialFailures.push('tolerance check'), null);
        const costImpact =
          dfmCostImpactResponse.status === 'fulfilled'
            ? ((dfmCostImpactResponse.value.result as unknown as DfmCostImpactResult) ?? null)
            : (partialFailures.push('cost impact'), null);
        const rules =
          dfmRulesResponse.status === 'fulfilled'
            ? ((dfmRulesResponse.value.result as unknown as DfmRule[]) ?? [])
            : (partialFailures.push('rule pack'), []);

        setDfmWorkspace({
          quick: (dfmQuickResponse.value.result as unknown as DfmResult) ?? null,
          analysis,
          tolerance,
          costImpact,
          rules,
        });
        setDfmNotice(
          partialFailures.length > 0
            ? `Mounted DFM detail surfaces are partially unavailable right now: ${partialFailures.join(', ')}. Showing the surfaces that did return.`
            : null,
        );
      }
      setTab('estimate');
    } catch (issue) {
      setDfmResult(null);
      setDfmWorkspace(null);
      setDfmNotice(null);
      setError(issue instanceof ApiError ? issue.message : 'Failed to generate estimate');
    } finally {
      setDfmLoading(false);
      setLoading(false);
    }
  }

  async function handleCompare() {
    setLoading(true);
    setError(null);
    try {
      const response = await quoteCompareMaterials({
        ...form,
        quantity: parseInt(form.quantity, 10) || 1,
        materials: ['6061-T6', '7075-T6', '304 Stainless', '4140 Steel', 'Ti-6Al-4V'],
      });
      setComparisons(
        (response.result as unknown as { comparisons?: MaterialComparison[] })?.comparisons ??
          (response.result as unknown as MaterialComparison[]) ??
          [],
      );
      setTab('compare');
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to compare materials');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setQuoteGenerateNotice(null);
    try {
      const recordLabel = upstreamRecordLabel || upstreamCustomer || 'PRISM internal quote';
      const packetRequest = quotingGenerate({
        material: form.material,
        operation: form.operation,
        quantity: parseInt(form.quantity, 10) || 1,
        complexity: form.complexity,
        tolerance_mm: parseFloat(form.tolerance_mm) || 0.05,
        finish_profile: form.finishProfile,
        inspection_level: form.inspectionLevel,
        certification_level: form.certificationLevel,
        delivery_mode: form.deliveryMode,
        customer_intent: form.customerIntent,
      });
      const instantRequest = quoteInstant(buildInstantQuotePayload(form, recordLabel, releaseWorkspace));

      const [packetResponse, instantResponse] = await Promise.allSettled([packetRequest, instantRequest]);
      const notices: string[] = [];

      if (packetResponse.status === 'fulfilled') {
        setQuoteDoc(packetResponse.value.result);
      } else {
        setQuoteDoc(null);
        notices.push('pricing packet');
      }

      if (instantResponse.status === 'fulfilled') {
        const instant = instantResponse.value.data;
        const downstreamSettled = await Promise.allSettled([
          quoteQtyBreaks({
            unit_price_at_qty: instant.unit_price,
            quantity: instant.quantity,
            machine_type: releaseWorkspace?.selectedMachine.kinematics,
            complexity: form.complexity,
            setup_cost: estimate?.setup_cost,
          }),
          quoteLeadTime({
            base_lead_days: estimateLeadDays(form),
            unit_price: instant.unit_price,
            quantity: instant.quantity,
          }),
          quoteHistory(instant.quote_id),
          quoteShareToken(instant.quote_id, 14),
        ]);

        const qtyBreaks =
          downstreamSettled[0]?.status === 'fulfilled' ? downstreamSettled[0].value.data ?? [] : [];
        const leadTimeOptions =
          downstreamSettled[1]?.status === 'fulfilled' ? downstreamSettled[1].value.data ?? [] : [];
          const history =
            downstreamSettled[2]?.status === 'fulfilled' ? downstreamSettled[2].value.data ?? null : null;
        const shareToken =
          downstreamSettled[3]?.status === 'fulfilled' ? downstreamSettled[3].value.data ?? null : null;

        const partialFailures = [
          downstreamSettled[0]?.status === 'rejected' ? 'qty breaks' : null,
          downstreamSettled[1]?.status === 'rejected' ? 'lead-time options' : null,
          downstreamSettled[2]?.status === 'rejected' ? 'quote history' : null,
          downstreamSettled[3]?.status === 'rejected' ? 'share token' : null,
        ].filter((value): value is string => Boolean(value));

        if (partialFailures.length > 0) {
          notices.push(`instant quote follow-up surfaces (${partialFailures.join(', ')})`);
        }

        setQuoteGenerateWorkspace({
          instant,
          qtyBreaks: qtyBreaks.length > 0 ? qtyBreaks : instant.quantity_breaks ?? [],
          leadTimeOptions: leadTimeOptions.length > 0 ? leadTimeOptions : instant.lead_time_options ?? [],
          history,
          shareToken,
        });
      } else {
        setQuoteGenerateWorkspace(null);
        notices.push('mounted instant quote');
      }

      if (packetResponse.status === 'rejected' && instantResponse.status === 'rejected') {
        throw packetResponse.reason ?? instantResponse.reason;
      }

      setQuoteGenerateNotice(
        notices.length > 0
          ? `Some mounted pricing surfaces are still unavailable in this pass: ${notices.join(', ')}. Showing the surfaces that did return.`
          : null,
      );
      setTab('generate');
    } catch (issue) {
      setQuoteDoc(null);
      setQuoteGenerateWorkspace(null);
      setQuoteGenerateNotice(null);
      setError(issue instanceof ApiError ? issue.message : 'Failed to generate pricing packet');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <section className="overflow-hidden rounded-[30px] border border-cyan-300/12 bg-[linear-gradient(135deg,rgba(8,15,23,0.98)_0%,rgba(5,10,16,0.98)_48%,rgba(7,27,38,0.95)_100%)] p-5 shadow-[0_36px_108px_rgba(0,0,0,0.35)]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.72fr)_minmax(300px,0.78fr)]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-full border border-cyan-300/16 bg-cyan-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100">
                Internal pricing desk
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                <span className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.6)]' : 'bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.4)]'}`} />
                {quoteProgress ?? (wsConnected ? 'Live pricing' : 'Reconnecting')}
              </span>
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">Quote Builder</h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                Build the shop-best price first, compare margin-safe or network-ready alternatives, and keep every pricing decision tied to the real manufacturing posture.
              </p>
            </div>
            {upstreamSource ? (
              <div className="rounded-[22px] border border-cyan-300/18 bg-cyan-300/[0.08] px-4 py-4 text-sm text-cyan-50">
                <div className="font-semibold">
                  {upstreamSourceLabel} opened Quote Builder with context
                  {upstreamRecordLabel ? ` for ${upstreamRecordLabel}` : ''}
                  {upstreamCustomer ? ` (${upstreamCustomer})` : ''}.
                </div>
                <div className="mt-2 leading-6 text-cyan-100">{upstreamContextNote}</div>
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryTile
                label="Active lane"
                value={activeTab.label}
                hint={activeTab.detail}
                accent="from-cyan-400/22 via-cyan-300/8 to-transparent"
              />
              <SummaryTile
                label="Part envelope"
                value={footprint}
                hint={`${form.material} · ${form.operation} · qty ${form.quantity}`}
                accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
              />
              <SummaryTile
                label="Output state"
                value={estimate || comparisons.length > 0 || quoteDoc ? 'Prepared' : 'Standby'}
                hint="Shop-best price, Axhera target, and pricing-packet outputs stay in one workspace."
                accent="from-amber-300/22 via-amber-200/8 to-transparent"
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Workflow lanes</div>
            <div className="mt-4 grid gap-3">
              {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string; detail: string }]>).map(([key, config]) => {
                const active = key === tab;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`rounded-[22px] border px-4 py-4 text-left transition ${
                      active
                        ? 'border-cyan-300/24 bg-cyan-300/[0.08] text-cyan-50'
                        : 'border-white/8 bg-white/[0.03] text-slate-200 hover:border-white/14'
                    }`}
                  >
                    <div className="text-sm font-semibold">{config.label}</div>
                    <div className="mt-2 text-xs leading-5 text-slate-300">{config.detail}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {loading ? <LoadingState label="Calculating quote posture..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.14fr)_minmax(340px,0.86fr)]">
        <div className="space-y-5">
          <PanelCard
            title="Pricing inputs"
            subtitle="Keep the pricing basis visible so leadership, quoting, and manufacturing review the same assumptions."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Material</span>
                <input
                  type="text"
                  value={form.material}
                  onChange={(event) => updateField('material', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Operation</span>
                <input
                  type="text"
                  value={form.operation}
                  onChange={(event) => updateField('operation', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Quantity</span>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={(event) => updateField('quantity', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Complexity</span>
                <select
                  value={form.complexity}
                  onChange={(event) => updateField('complexity', event.target.value as Complexity)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                >
                  <option value="simple">Simple</option>
                  <option value="medium">Medium</option>
                  <option value="complex">Complex</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Length (mm)</span>
                <input
                  type="number"
                  value={form.part_length_mm}
                  onChange={(event) => updateField('part_length_mm', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Width (mm)</span>
                <input
                  type="number"
                  value={form.part_width_mm}
                  onChange={(event) => updateField('part_width_mm', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Height (mm)</span>
                <input
                  type="number"
                  value={form.part_height_mm}
                  onChange={(event) => updateField('part_height_mm', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tolerance (mm)</span>
                <input
                  type="number"
                  value={form.tolerance_mm}
                  onChange={(event) => updateField('tolerance_mm', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Finish</span>
                <select
                  value={form.finishProfile}
                  onChange={(event) => updateField('finishProfile', event.target.value as FinishProfile)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                >
                  {FINISH_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Inspection</span>
                <select
                  value={form.inspectionLevel}
                  onChange={(event) => updateField('inspectionLevel', event.target.value as InspectionLevel)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                >
                  {INSPECTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Certification</span>
                <select
                  value={form.certificationLevel}
                  onChange={(event) => updateField('certificationLevel', event.target.value as CertificationLevel)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                >
                  {CERTIFICATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Delivery</span>
                <select
                  value={form.deliveryMode}
                  onChange={(event) => updateField('deliveryMode', event.target.value as DeliveryMode)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                >
                  {DELIVERY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Order posture</span>
                <select
                  value={form.customerIntent}
                  onChange={(event) => updateField('customerIntent', event.target.value as CustomerIntent)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32"
                >
                  {CUSTOMER_INTENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleEstimate}
                className="rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
              >
                Generate PRISM Price Strategy
              </button>
              <button
                type="button"
                onClick={handleCompare}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/18 hover:bg-white/[0.05]"
              >
                Compare Materials
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-200/24 hover:bg-cyan-300/[0.12]"
              >
                Generate Pricing Packet
              </button>
            </div>
          </PanelCard>

          {tab === 'estimate' && estimate && quoteOptions ? (
            <>
              <PanelCard
                title="PRISM shop best price"
                subtitle="Lead with the PRISM-calculated in-house quote first, then compare controlled pricing scenarios around it."
              >
                <div className={`rounded-[26px] border px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)] ${quoteOptions.recommended.toneClass}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-80">
                        {quoteOptions.recommended.badge}
                      </div>
                      <div className="mt-3 text-2xl font-semibold">{quoteOptions.recommended.label}</div>
                      <div className="mt-3 text-sm leading-6 opacity-90">{quoteOptions.recommended.summary}</div>
                    </div>
                    <div className="rounded-full border border-white/16 bg-black/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-50">
                      {quoteOptions.recommended.deliveryLabel}
                    </div>
                  </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryTile
                    label="Unit price"
                      value={formatCurrency(quoteOptions.recommended.unitPrice)}
                      hint="Primary in-house unit price for the recommended strategy."
                      accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
                    />
                    <SummaryTile
                      label="Total"
                      value={formatCurrency(quoteOptions.recommended.total)}
                      hint="Recommended internal total for this package."
                      accent="from-cyan-400/22 via-cyan-300/8 to-transparent"
                    />
                    <SummaryTile
                      label="Lead time"
                      value={`${quoteOptions.recommended.leadDays} days`}
                      hint="Promise posture after quality and delivery settings."
                      accent="from-amber-300/22 via-amber-200/8 to-transparent"
                    />
                    <SummaryTile
                      label="Confidence"
                      value={`${Math.round(quoteOptions.recommended.confidence * 100)}%`}
                      hint="PRISM trust score for this internal pricing posture."
                      accent="from-violet-400/22 via-violet-300/8 to-transparent"
                    />
                  </div>

                  {axheraDelta ? (
                    <div className="mt-5 rounded-[20px] border border-white/12 bg-black/15 px-4 py-4 text-sm text-slate-100">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Axhera delta</div>
                      <div className="mt-2 text-lg font-semibold">
                        {axheraDelta.amount >= 0 ? '+' : '-'}
                        {formatCurrency(Math.abs(axheraDelta.amount))}
                        <span className="ml-2 text-sm font-medium text-slate-300">
                          ({axheraDelta.pct >= 0 ? '+' : ''}
                          {axheraDelta.pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-300">
                        This keeps the future Axhera network target visible against the in-house recommended number before any outside-channel pricing is published.
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      `Material · ${quoteOptions.recommended.material}`,
                      `Finish · ${quoteOptions.recommended.finishLabel}`,
                      `Inspection · ${quoteOptions.recommended.inspectionLabel}`,
                      `Certs · ${quoteOptions.recommended.certificationLabel}`,
                    ].map((entry) => (
                      <div key={entry} className="rounded-[18px] border border-white/12 bg-black/15 px-4 py-3 text-sm text-slate-50">
                        {entry}
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-3">
                    {quoteOptions.recommended.notes.map((note) => (
                      <div key={note} className="rounded-[18px] border border-white/10 bg-black/15 px-4 py-3 text-sm leading-6 text-slate-100">
                        {note}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-sm font-semibold text-slate-50">Pricing scenario set</div>
                  <div className="mt-3 grid gap-4 xl:grid-cols-3">
                    {quoteOptions.alternatives.map((option) => (
                      <div key={option.id} className={`rounded-[24px] border px-4 py-4 ${option.toneClass}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">{option.badge}</div>
                            <div className="mt-2 text-lg font-semibold">{option.label}</div>
                          </div>
                          <div className="rounded-full border border-white/16 bg-black/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-50">
                            {option.deliveryLabel}
                          </div>
                        </div>
                        <div className="mt-3 text-sm leading-6 opacity-90">{option.summary}</div>
                        <div className="mt-4 grid gap-2 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="opacity-75">Unit</span>
                            <span className="font-mono font-semibold">{formatCurrency(option.unitPrice)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="opacity-75">Total</span>
                            <span className="font-mono font-semibold">{formatCurrency(option.total)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="opacity-75">Lead</span>
                            <span className="font-semibold">{option.leadDays} days</span>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2 text-sm leading-6">
                          {option.notes.map((note) => (
                            <div key={note} className="rounded-[16px] border border-white/12 bg-black/15 px-3 py-2 text-slate-50">
                              {note}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </PanelCard>

              <PanelCard title="Cost breakdown" subtitle="Keep the cost stack readable so scenario planning never hides the manufacturing story underneath.">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryTile label="Cycle time" value={`${estimate.cycle_time_min.toFixed(1)} min`} hint="Estimated run time per part from the current manufacturing posture." />
                  <SummaryTile label="Material cost" value={formatCurrency(estimate.material_cost)} hint="Base stock cost before quality and delivery options." />
                  <SummaryTile label="Machining cost" value={formatCurrency(estimate.machining_cost)} hint="Core spindle / process cost driving the quote." />
                  <SummaryTile label="Margin stack" value={formatCurrency(estimate.margin)} hint="Margin currently carried in the recommended shop price." />
                </div>

                {estimate.pricing?.below_margin_floor ? (
                  <div
                    role="alert"
                    className="mt-5 rounded-[22px] border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100"
                  >
                    <span className="font-semibold text-amber-200">Margin floor alert.</span>{' '}
                    This quote&apos;s margin
                    {typeof estimate.pricing.margin_pct === 'number' ? ` (${estimate.pricing.margin_pct.toFixed(1)}%)` : ''}{' '}
                    is below the {estimate.pricing.margin_floor_pct ?? 20}% floor -- discount stacking has eroded
                    contribution margin. Review before sending this quote.
                  </div>
                ) : null}

                <div className="mt-5 rounded-[22px] border border-white/8 bg-black/15 p-4">
                  <div className="text-sm font-semibold text-slate-50">Base cost ladder</div>
                  <div className="mt-4 space-y-2">
                    {[
                      { label: 'Material', value: estimate.material_cost },
                      { label: 'Machining', value: estimate.machining_cost },
                      { label: 'Setup', value: estimate.setup_cost },
                      { label: 'Tooling', value: estimate.tooling_cost },
                      { label: 'Overhead', value: estimate.overhead },
                      { label: 'Margin', value: estimate.margin },
                    ].map((row) => (
                      <div key={row.label} className="grid grid-cols-[110px_minmax(0,1fr)_80px] items-center gap-3 text-sm">
                        <span className="text-slate-300">{row.label}</span>
                        <div className="h-2 rounded-full bg-white/10">
                          <div
                            className="h-2 rounded-full bg-cyan-300"
                            style={{ width: `${estimate.total > 0 ? Math.min((row.value / estimate.total) * 100, 100) : 0}%` }}
                          />
                        </div>
                        <span className="text-right font-mono text-slate-100">{formatCurrency(row.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {estimate.price_breaks?.length ? (
                  <div className="mt-5 grid gap-3 md:grid-cols-5">
                    {estimate.price_breaks.map((priceBreak) => (
                      <div key={priceBreak.quantity} className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4 text-center">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{priceBreak.quantity} pcs</div>
                        <div className="mt-2 text-lg font-semibold text-slate-50">{formatCurrency(priceBreak.unit_price)}</div>
                        <div className="mt-2 text-sm text-emerald-300">-{priceBreak.savings_pct.toFixed(1)}%</div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </PanelCard>

              <PanelCard
                title="Machining decision pipeline"
                subtitle="Carry the quote forward into a matched release packet so pricing, process planning, and release risk stay in one explainable chain."
              >
                {releaseLoading ? (
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-6 text-sm text-slate-300">
                    Building a matched machine, tooling, and release packet from the current quote posture...
                  </div>
                ) : releaseError ? (
                  <div className="rounded-[22px] border border-rose-300/18 bg-rose-300/[0.08] px-4 py-6 text-sm text-rose-50">
                    {releaseError}
                  </div>
                ) : releaseWorkspace && outsourceAdvisory ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <SummaryTile
                        label="Release machine"
                        value={releaseWorkspace.selectedMachine.label}
                        hint={`${releaseWorkspace.selectedMachine.kinematics} · ${releaseWorkspace.selectedMachine.controller}`}
                        accent="from-cyan-400/22 via-cyan-300/8 to-transparent"
                      />
                      <SummaryTile
                        label="Tool stack"
                        value={releaseWorkspace.selectedToolingPackage.label}
                        hint={releaseWorkspace.selectedToolholder.label}
                        accent="from-violet-400/22 via-violet-300/8 to-transparent"
                      />
                      <SummaryTile
                        label="Operation route"
                        value={`${releaseWorkspace.operationPlan.length} ops`}
                        hint={`${releaseWorkspace.operationPlan.reduce((sum, operation) => sum + operation.cycleMinutes, 0).toFixed(0)} min planned cut time`}
                        accent="from-amber-300/22 via-amber-200/8 to-transparent"
                      />
                      <SummaryTile
                        label="Outsource posture"
                        value={outsourceAdvisory.label}
                        hint="Preliminary until live supplier and make-vs-buy payloads land."
                        accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
                      />
                    </div>

                    <div className="mt-5 grid gap-3 xl:grid-cols-2">
                      <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Capability fit</div>
                        <div className="mt-3 text-sm font-semibold text-slate-100">
                          {releaseWorkspace.selectedPartClass.label} on {releaseWorkspace.selectedMachine.label}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-300">{releaseWorkspace.selectedMachine.strength}</div>
                        <div className="mt-3 text-sm leading-6 text-slate-400">
                          Stock posture: {releaseWorkspace.selectedStock.label} · {releaseWorkspace.selectedStock.material}
                        </div>
                      </div>

                      <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Route recommendation</div>
                        <div className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                          {releaseWorkspace.operationPlan.slice(0, 3).map((operation) => (
                            <div key={operation.id} className="rounded-[18px] border border-white/8 bg-black/15 px-3 py-2">
                              <span className="font-semibold text-slate-100">{operation.code}</span> {operation.title} · {operation.strategy}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Release and simulation posture</div>
                        <div className="mt-3 text-sm leading-6 text-slate-300">{releaseWorkspace.reviewSummary}</div>
                        {releaseWorkspace.alerts.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {releaseWorkspace.alerts.map((alert) => (
                              <div key={alert} className="rounded-[18px] border border-amber-300/16 bg-amber-300/[0.08] px-3 py-2 text-sm text-amber-100">
                                {alert}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className={`rounded-[22px] border px-4 py-4 ${outsourceAdvisory.toneClass}`}>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">Preliminary outsource posture</div>
                        <div className="mt-3 text-sm font-semibold">{outsourceAdvisory.label}</div>
                        <div className="mt-2 text-sm leading-6 opacity-90">{outsourceAdvisory.detail}</div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        to={releaseHref}
                        className="inline-flex items-center justify-center rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                      >
                        Open matched Print to CNC packet
                      </Link>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                        Backend contract note: live supplier compare, quote-revision linkage, and actual-vs-estimate feedback should replace this provisional decision posture as Claude lands those payloads.
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-6 text-sm text-slate-300">
                    Generate the shop-best price first to stage the matched machining decision packet.
                  </div>
                )}
              </PanelCard>

              <PanelCard
                title="Calibration feedback loop"
                subtitle="Tell the team exactly which downstream desks need to turn this quote into ground truth once the part moves from estimate to execution."
              >
                {calibrationTargets.length > 0 ? (
                  <>
                    <div className="grid gap-3 xl:grid-cols-2">
                      {calibrationTargets.map((target) => (
                        <div key={target.id} className={`rounded-[22px] border px-4 py-4 ${target.toneClass}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-sm font-semibold">{target.label}</div>
                            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">
                              {target.value}
                            </div>
                          </div>
                          <div className="mt-3 text-sm leading-6 opacity-90">{target.detail}</div>
                          <div className="mt-4">
                            <Link
                              to={target.href}
                              className="inline-flex items-center justify-center rounded-2xl border border-white/14 bg-black/15 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/24 hover:bg-black/25"
                            >
                              {target.linkLabel}
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-[22px] border border-cyan-300/18 bg-cyan-300/[0.08] px-4 py-4 text-sm leading-6 text-cyan-50">
                      Backend contract note: quote revisions should eventually link directly to receiving docs, tooling checkout, actual cycle/labor records, and inspection evidence so this calibration lane becomes live business truth instead of guided frontend posture.
                    </div>
                  </>
                ) : (
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-6 text-sm text-slate-300">
                    Generate the shop-best price first to stage the calibration loop across inventory, floor actuals, and release evidence.
                  </div>
                )}
              </PanelCard>

              <PanelCard title="Production handoff posture" subtitle="Carry the quote forward the same way ProShop-style systems push approved estimates into production-ready work.">
                <div className="grid gap-3 xl:grid-cols-2">
                  {handoffReadiness.map((item) => (
                    <div key={item.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-50">{item.label}</div>
                        <div className={`rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${item.toneClass}`}>
                          {item.state}
                        </div>
                      </div>
                      <div className="mt-3 text-sm leading-6 text-slate-300">{item.detail}</div>
                    </div>
                  ))}
                </div>
              </PanelCard>
            </>
          ) : null}

          {tab === 'compare' && comparisons.length > 0 ? (
            <PanelCard title="Material comparison" subtitle="Use this desk to explain why the preferred material won the pricing review.">
              <div className="grid gap-3">
                {comparisons.map((comparison) => (
                  <div key={comparison.material} className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 md:grid-cols-[minmax(0,1fr)_repeat(4,minmax(0,0.6fr))]">
                    <div>
                      <div className="text-sm font-semibold text-slate-50">{comparison.material}</div>
                      <div className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">Quote posture</div>
                    </div>
                    <div className="text-sm text-slate-300">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Unit price</div>
                      <div className="mt-2 font-mono text-slate-100">${comparison.unit_price.toFixed(2)}</div>
                    </div>
                    <div className="text-sm text-slate-300">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Total</div>
                      <div className="mt-2 font-mono text-slate-100">${comparison.total.toFixed(2)}</div>
                    </div>
                    <div className="text-sm text-slate-300">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Cycle time</div>
                      <div className="mt-2 font-mono text-slate-100">{comparison.cycle_time_min.toFixed(1)} min</div>
                    </div>
                    <div className="text-sm text-slate-300">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Tool life</div>
                      <div className="mt-2 font-mono text-slate-100">{comparison.tool_life_factor.toFixed(2)}x</div>
                    </div>
                  </div>
                ))}
              </div>
            </PanelCard>
          ) : null}

          {tab === 'generate' && (quoteDoc || quoteGenerateWorkspace) ? (
            <PanelCard title="Generated pricing packet" subtitle="Internal pricing output stays readable here before it leaves the app or feeds a future network handoff.">
              {quoteGenerateNotice ? (
                <div className="mb-4 rounded-[20px] border border-amber-300/18 bg-amber-300/[0.08] px-4 py-4 text-sm leading-6 text-amber-50">
                  {quoteGenerateNotice}
                </div>
              ) : null}

              {quoteGenerateWorkspace?.instant ? (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <SummaryTile
                        label="Instant quote"
                        value={quoteGenerateWorkspace.instant.quote_id}
                        hint="Mounted /api/v1/quotes/instant business quote id."
                        accent="from-cyan-400/22 via-cyan-300/8 to-transparent"
                      />
                      <SummaryTile
                        label="Unit price"
                        value={formatCurrency(quoteGenerateWorkspace.instant.unit_price)}
                        hint="Mounted business quote price per part."
                        accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
                      />
                      <SummaryTile
                        label="Total"
                        value={formatCurrency(quoteGenerateWorkspace.instant.total_price)}
                        hint="Business quote total from the mounted instant lane."
                        accent="from-amber-300/22 via-amber-200/8 to-transparent"
                      />
                      <SummaryTile
                        label="Confidence"
                        value={`${Math.round(quoteGenerateWorkspace.instant.confidence)}%`}
                        hint="CI-backed trust posture from the instant quote engine."
                        accent="from-violet-400/22 via-violet-300/8 to-transparent"
                      />
                    </div>

                    <div className="grid gap-3 xl:grid-cols-2">
                      <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Instant quote posture</div>
                        <div className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                          <div>CI95 band: {formatCurrency(quoteGenerateWorkspace.instant.ci95_low ?? quoteGenerateWorkspace.instant.unit_price)} to {formatCurrency(quoteGenerateWorkspace.instant.ci95_high ?? quoteGenerateWorkspace.instant.unit_price)}</div>
                          <div>Recommended process: {quoteGenerateWorkspace.instant.recommended_process ?? form.operation}</div>
                          <div>Recommended machine: {quoteGenerateWorkspace.instant.recommended_machine ?? releaseWorkspace?.selectedMachine.label ?? 'Mounted route did not nominate one yet'}</div>
                          <div>Cycle time: {quoteGenerateWorkspace.instant.cycle_time_min ? `${quoteGenerateWorkspace.instant.cycle_time_min.toFixed(1)} min` : 'Not returned by mounted route'}</div>
                        </div>
                      </div>

                      <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Portal and revision readiness</div>
                        <div className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
                          <div>
                            <span className="font-semibold text-slate-100">Share token:</span>{' '}
                            {quoteGenerateWorkspace.shareToken?.token ?? 'Mounted share surface did not return in this pass.'}
                          </div>
                            <div>
                              <span className="font-semibold text-slate-100">History entries:</span>{' '}
                              {quoteGenerateWorkspace.history
                                ? `${quoteGenerateWorkspace.history.revisions?.length ?? 0} revision(s) · ${quoteGenerateWorkspace.history.status_history?.length ?? 0} status change(s)`
                                : 'Mounted history surface did not return revisions yet.'}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-100">Current status:</span>{' '}
                              {quoteGenerateWorkspace.history?.current_status ?? 'Unavailable'}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-100">Latest revision:</span>{' '}
                              {quoteGenerateWorkspace.history?.current_revision ?? 'Unavailable'}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-100">Recent status trail:</span>{' '}
                              {quoteGenerateWorkspace.history?.status_history?.length
                                ? quoteGenerateWorkspace.history.status_history
                                  .slice(0, 3)
                                  .map((entry) => `${entry.from_status} → ${entry.to_status}`)
                                  .join(' · ')
                                : 'No mounted status transitions yet.'}
                            </div>
                          </div>
                      </div>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-2">
                      <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Mounted qty breaks</div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {quoteGenerateWorkspace.qtyBreaks.length > 0 ? (
                            quoteGenerateWorkspace.qtyBreaks.map((item) => (
                              <div key={`${item.quantity}-${item.unit_price}`} className="rounded-[18px] border border-white/8 bg-black/15 px-3 py-3">
                                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{item.quantity} pcs</div>
                                <div className="mt-2 text-lg font-semibold text-slate-50">{formatCurrency(item.unit_price)}</div>
                                <div className="mt-2 text-sm text-slate-300">
                                  {typeof item.savings_pct === 'number' ? `${item.savings_pct.toFixed(1)}% savings` : 'Mounted qty-break surface'}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-[18px] border border-white/8 bg-black/15 px-3 py-3 text-sm leading-6 text-slate-300">
                              Mounted qty-break route did not return in this pass.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Lead-time options</div>
                        <div className="mt-3 grid gap-3">
                          {quoteGenerateWorkspace.leadTimeOptions.length > 0 ? (
                            quoteGenerateWorkspace.leadTimeOptions.map((option) => (
                              <div key={`${option.tier ?? option.mode}-${option.days}`} className="rounded-[18px] border border-white/8 bg-black/15 px-3 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-100">
                                    {option.tier ?? option.mode ?? 'Lead tier'}
                                  </div>
                                  <div className="text-sm text-slate-300">{option.days} days</div>
                                </div>
                                {typeof option.unit_price === 'number' ? (
                                  <div className="mt-2 text-sm leading-6 text-slate-300">
                                    Unit price: {formatCurrency(option.unit_price)}
                                  </div>
                                ) : null}
                              </div>
                            ))
                          ) : (
                            <div className="rounded-[18px] border border-white/8 bg-black/15 px-3 py-3 text-sm leading-6 text-slate-300">
                              Mounted lead-time route did not return in this pass.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Instant quote warnings and DFM</div>
                      <div className="mt-3 grid gap-3">
                        {quoteGenerateWorkspace.instant.warnings?.length ? (
                          quoteGenerateWorkspace.instant.warnings.map((warning) => (
                            <div key={warning} className="rounded-[18px] border border-amber-300/18 bg-amber-300/[0.08] px-3 py-3 text-sm leading-6 text-amber-50">
                              {warning}
                            </div>
                          ))
                        ) : quoteGenerateWorkspace.instant.dfm?.issues?.length ? (
                          quoteGenerateWorkspace.instant.dfm.issues.map((issue, index) => (
                            <div key={`${issue.message}-${index}`} className={`rounded-[18px] border px-3 py-3 text-sm leading-6 ${dfmToneClass(issue.severity)}`}>
                              <div className="font-semibold">{issue.message}</div>
                              <div className="mt-2 opacity-90">{issue.recommendation}</div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-[18px] border border-emerald-300/18 bg-emerald-300/[0.08] px-3 py-3 text-sm leading-6 text-emerald-50">
                            Mounted instant quote returned without additional warnings for this pricing packet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {quoteDoc ? (
                    <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Packet payload</div>
                      <pre className="mt-3 max-h-[560px] overflow-auto rounded-[18px] border border-white/8 bg-black/25 p-4 text-xs leading-6 text-slate-200">
                        {JSON.stringify(quoteDoc, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                </div>
              ) : (
                <pre className="max-h-[560px] overflow-auto rounded-[22px] border border-white/8 bg-black/20 p-4 text-xs leading-6 text-slate-200">
                  {JSON.stringify(quoteDoc, null, 2)}
                </pre>
              )}
            </PanelCard>
          ) : null}
        </div>

        <div className="space-y-5">
          <PanelCard title="Internal pricing controls" subtitle="Leadership can tune the quote posture here, but the PRISM shop-best strategy remains the default anchor.">
            <div className="grid gap-3">
              <SummaryTile label="Material" value={form.material} hint="Selected stock family for pricing and machining posture." accent="from-sky-400/22 via-sky-300/8 to-transparent" />
              <SummaryTile label="Operation" value={form.operation} hint="Dominant manufacturing process for this quote." accent="from-violet-400/22 via-violet-300/8 to-transparent" />
              <SummaryTile label="Finish" value={FINISH_LABELS[form.finishProfile]} hint="Selected finish posture for the recommended price strategy." accent="from-amber-300/22 via-amber-200/8 to-transparent" />
              <SummaryTile label="Inspection" value={INSPECTION_LABELS[form.inspectionLevel]} hint="Selected validation posture for the pricing packet." accent="from-emerald-400/22 via-emerald-300/8 to-transparent" />
              <SummaryTile label="Delivery" value={DELIVERY_LABELS[form.deliveryMode]} hint="Current promise posture for the recommendation." accent="from-cyan-400/22 via-cyan-300/8 to-transparent" />
            </div>
          </PanelCard>

          <PanelCard
            title="Mounted DFM route"
            subtitle="Use the mounted `/api/v1/dfm/quick`, `/api/v1/dfm/analyze`, `/api/v1/dfm/tolerance-check`, `/api/v1/dfm/cost-impact`, and `/api/v1/dfm/rules` surfaces instead of page-local heuristics alone."
          >
            {dfmLoading ? (
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-6 text-sm text-slate-300">
                Running mounted DFM analysis, tolerance, cost, and rule checks for the current quote posture...
              </div>
            ) : dfmError ? (
              <div className="rounded-[20px] border border-amber-300/18 bg-amber-300/[0.08] px-4 py-4 text-sm leading-6 text-amber-100">
                {dfmError}
              </div>
            ) : dfmResult ? (
              <div className="space-y-3">
                {dfmNotice ? (
                  <div className="rounded-[20px] border border-sky-300/18 bg-sky-300/[0.08] px-4 py-4 text-sm leading-6 text-sky-100">
                    {dfmNotice}
                  </div>
                ) : null}
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <SummaryTile
                    label="Quick score"
                    value={`${dfmResult.score.toFixed(0)}`}
                    hint={dfmResult.pass ? 'Mounted quick route currently passes this quote posture.' : 'Mounted quick route is flagging manufacturability risk.'}
                    accent={dfmResult.pass ? 'from-emerald-400/22 via-emerald-300/8 to-transparent' : 'from-amber-300/22 via-amber-200/8 to-transparent'}
                  />
                  <SummaryTile
                    label="Full analysis"
                    value={dfmWorkspace?.analysis ? `${dfmWorkspace.analysis.score.toFixed(0)}` : 'Pending'}
                    hint={
                      dfmWorkspace?.analysis
                        ? dfmWorkspace.analysis.pass
                          ? 'Mounted full-route analysis still clears the quote posture.'
                          : 'Mounted full-route analysis wants a deeper process review.'
                        : 'Mounted full-route analysis did not return in this pass.'
                    }
                    accent={
                      dfmWorkspace?.analysis
                        ? dfmWorkspace.analysis.pass
                          ? 'from-cyan-400/22 via-cyan-300/8 to-transparent'
                          : 'from-rose-300/22 via-rose-200/8 to-transparent'
                        : 'from-slate-400/18 via-slate-300/6 to-transparent'
                    }
                  />
                  <SummaryTile
                    label="Tolerance stack"
                    value={dfmWorkspace?.tolerance ? `${dfmWorkspace.tolerance.stack_result_mm.toFixed(3)} mm` : 'Pending'}
                    hint={
                      dfmWorkspace?.tolerance
                        ? `${dfmWorkspace.tolerance.stack_method.toUpperCase()} stack is ${dfmWorkspace.tolerance.pass ? 'within' : 'outside'} the current tolerance posture.`
                        : 'Mounted tolerance surface did not return in this pass.'
                    }
                    accent={
                      dfmWorkspace?.tolerance
                        ? dfmWorkspace.tolerance.pass
                          ? 'from-emerald-400/22 via-emerald-300/8 to-transparent'
                          : 'from-amber-300/22 via-amber-200/8 to-transparent'
                        : 'from-slate-400/18 via-slate-300/6 to-transparent'
                    }
                  />
                  <SummaryTile
                    label="Cost delta"
                    value={dfmWorkspace?.costImpact ? formatCurrency(dfmWorkspace.costImpact.total_cost_impact_usd) : 'Pending'}
                    hint={
                      dfmWorkspace?.costImpact
                        ? 'Mounted cost-impact drivers carried directly into quote review.'
                        : 'Mounted cost-impact surface did not return in this pass.'
                    }
                    accent={dfmWorkspace?.costImpact ? 'from-violet-400/22 via-violet-300/8 to-transparent' : 'from-slate-400/18 via-slate-300/6 to-transparent'}
                  />
                  <SummaryTile
                    label="Rule pack"
                    value={`${dfmWorkspace?.rules.length ?? 0}`}
                    hint="Mounted manufacturability rules that back the current quote posture."
                    accent="from-violet-400/22 via-violet-300/8 to-transparent"
                  />
                </div>

                <div className="grid gap-3 xl:grid-cols-2">
                  <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Quick-route findings</div>
                    <div className="mt-3 grid gap-3">
                      {dfmResult.warnings.length > 0 ? (
                        dfmResult.warnings.map((warning, index) => (
                          <div key={`quick-${warning.severity}-${index}`} className={`rounded-[20px] border px-4 py-4 ${dfmToneClass(warning.severity)}`}>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">{warning.severity}</div>
                            <div className="mt-2 text-sm font-semibold">{warning.message}</div>
                            <div className="mt-2 text-sm leading-6 opacity-90">{warning.recommendation}</div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[20px] border border-emerald-300/18 bg-emerald-300/[0.08] px-4 py-4 text-sm leading-6 text-emerald-50">
                          Mounted DFM quick analysis did not surface any warnings for the current quote posture.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Full-route findings</div>
                    <div className="mt-3 grid gap-3">
                      {dfmWorkspace?.analysis?.warnings && dfmWorkspace.analysis.warnings.length > 0 ? (
                        dfmWorkspace.analysis.warnings.map((warning: DfmWarning, index) => (
                          <div key={`analysis-${warning.severity}-${index}`} className={`rounded-[20px] border px-4 py-4 ${dfmToneClass(warning.severity)}`}>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">{warning.severity}</div>
                            <div className="mt-2 text-sm font-semibold">{warning.message}</div>
                            <div className="mt-2 text-sm leading-6 opacity-90">{warning.recommendation}</div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[20px] border border-cyan-300/18 bg-cyan-300/[0.08] px-4 py-4 text-sm leading-6 text-cyan-50">
                          {dfmWorkspace?.analysis
                            ? 'Mounted full DFM analysis did not add any new warnings beyond the quick-route review.'
                            : 'Mounted full DFM analysis is not available in this pass yet.'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                  <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Tolerance + cost posture</div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-[18px] border border-white/8 bg-black/15 px-3 py-3 text-sm text-slate-300">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Tolerance route</div>
                        {dfmWorkspace?.tolerance ? (
                          <>
                            <div className="mt-2 font-semibold text-slate-100">
                              {dfmWorkspace.tolerance.pass ? 'Within posture' : 'Needs review'}
                            </div>
                            <div className="mt-2 leading-6">
                              {dfmWorkspace.tolerance.stack_method.toUpperCase()} stack result: {dfmWorkspace.tolerance.stack_result_mm.toFixed(3)} mm
                            </div>
                          </>
                        ) : (
                          <div className="mt-2 leading-6">Mounted tolerance route did not return in this pass.</div>
                        )}
                      </div>

                      <div className="rounded-[18px] border border-white/8 bg-black/15 px-3 py-3 text-sm text-slate-300">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Cost-impact route</div>
                        {dfmWorkspace?.costImpact ? (
                          <>
                            <div className="mt-2 font-semibold text-slate-100">
                              {formatCurrency(dfmWorkspace.costImpact.total_cost_impact_usd)} projected delta
                            </div>
                            <div className="mt-2 leading-6">
                              {dfmWorkspace.costImpact.impacts.length > 0
                                ? dfmWorkspace.costImpact.impacts.map((impact) => `${impact.driver}: ${formatCurrency(impact.amount_usd)}`).join(' · ')
                                : 'Mounted cost route returned no explicit cost drivers.'}
                            </div>
                          </>
                        ) : (
                          <div className="mt-2 leading-6">Mounted cost-impact route did not return in this pass.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Active rule pack</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {dfmWorkspace?.rules.length ? (
                        dfmWorkspace.rules.map((rule) => (
                          <div
                            key={rule.id}
                            className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${dfmToneClass(rule.severity)}`}
                          >
                            {rule.id}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[18px] border border-white/8 bg-black/15 px-3 py-3 text-sm text-slate-300">
                          Mounted rule pack did not return in this pass.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-6 text-sm text-slate-300">
                Generate the shop-best price first to run the mounted DFM route suite.
              </div>
            )}
          </PanelCard>

          <PanelCard title="Requirements review" subtitle="Surface important RFQ and routing details the way Paperless Parts-style quoting flows keep fine print from slipping through.">
            <div className="grid gap-3">
              {requirementInsights.map((insight) => (
                <div key={insight.id} className={`rounded-[20px] border px-4 py-4 ${insight.toneClass}`}>
                  <div className="text-sm font-semibold">{insight.title}</div>
                  <div className="mt-2 text-sm leading-6 opacity-90">{insight.detail}</div>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard title="Pricing strategy" subtitle="This desk should protect the shop price first, then stage any future external-network target deliberately.">
            <div className="space-y-3 text-sm leading-6 text-slate-300">
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                1. Lead with one PRISM shop-best price that reflects the full system, not a loose menu of equal-weight choices.
              </div>
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                2. Keep the future Axhera network target separate so outside-channel pricing never overwrites the true in-house recommendation.
              </div>
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                3. Keep material, delivery, finish, inspection, and certification explicit so the generated pricing packet is operationally clear.
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
