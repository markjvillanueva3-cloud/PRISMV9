import type { HolderPackageOption } from '../api/calculatorData';
import type {
  MachineCatalogItem,
  MachineControllerCapabilityOption,
  MachineMode,
  MaterialCatalogItem,
  SelectionOption,
  ToolCatalogItem,
} from '../data/calculatorWorkspace';
import type {
  CalculatorSavedMachineProfile,
  DistributorOffer,
  InventoryOperationsWorkspace,
  PurchaseRecommendation,
  ShellCommerceSelection,
} from '../features/operating-system/contracts';
import type { ToolRoiAnalysisResult, ToolRoiRecommendation } from '../api/speedfeed';
import {
  manufacturerOffer,
  nationwideOffers,
  regionFromSelection,
  regionalDistributorOffers,
} from '../features/operating-system/commerceFixtures';
import { buildCoolantStrategyRecommendation } from './calculatorCoolantStrategy';

type PrismModeTone = 'good' | 'watch' | 'neutral';
type PrismPurchaseTierId = 'budget' | 'standard' | 'premium';

export interface CalculatorPrismModeInput {
  machineMode: MachineMode;
  machine?: MachineCatalogItem;
  material?: MaterialCatalogItem;
  tool?: ToolCatalogItem;
  toolpath?: {
    id: string;
    label: string;
    path: string;
    operationId: string;
  };
  toolpathTypeId?: string;
  programmingLabel?: string;
  finishTarget: string;
  stockShape: string;
  stockSource: string;
  currentSetupSource: string;
  currentCoolantId: string;
  availableCoolantOptions: SelectionOption[];
  toolDiameterMm?: number;
  docMm?: number;
  wocMm?: number;
  compatibleHolderPackages: HolderPackageOption[];
  currentHolderStyleId: string;
  currentHolderPackageId: string;
  recommendedFeatureIds: string[];
  currentFeatureIds: string[];
  controllerCapabilityOptions: MachineControllerCapabilityOption[];
  currentControllerCapabilityIds: string[];
  defaultMachineProfile?: CalculatorSavedMachineProfile | null;
  inventoryWorkspace?: InventoryOperationsWorkspace | null;
  result?: {
    ra?: number;
    toolLife?: number;
    powerKw?: number;
    mrr?: number;
    confidence?: number;
  } | null;
  selection?: ShellCommerceSelection;
  purchasingHrefBase: string;
}

export interface CalculatorPrismRecommendedSetup {
  setupSource: string;
  coolantId: string;
  holderStyleId: string;
  holderPackageId: string;
  enabledFeatureIds: string[];
  enabledControllerCapabilityIds: string[];
}

export interface CalculatorPrismModeSignal {
  id: string;
  title: string;
  detail: string;
  tone: PrismModeTone;
}

export interface CalculatorPrismModePlan {
  summary: string;
  detail: string;
  confidenceScore: number;
  confidenceLabel: string;
  inventoryCoverageScore: number;
  inventoryCoverageLabel: string;
  machineProfileLabel: string;
  dominantRecommendation: string;
  evidence: string[];
  signals: CalculatorPrismModeSignal[];
  recommendedSetup: CalculatorPrismRecommendedSetup;
  setupDeltaCount: number;
  hasSetupDelta: boolean;
  purchaseRecommendations: PurchaseRecommendation[];
}

interface InventorySignals {
  directToolingMatch: boolean;
  directHolderMatch: boolean;
  activeMachineMatch: boolean;
  coolantSupportMatch: boolean;
  coverageScore: number;
  label: string;
  evidence: string[];
}

interface CurrentSetupSnapshot {
  setupSource: string;
  coolantId: string;
  holderStyleId: string;
  holderPackageId: string;
  enabledFeatureIds: string[];
  enabledControllerCapabilityIds: string[];
}

interface RankedPurchaseRecommendation extends PurchaseRecommendation {
  rankingScore: number;
}

export interface CalculatorPrismLivePurchaseRecommendations {
  recommendations: PurchaseRecommendation[];
  sourceLabel: string;
  note: string;
  warnings: string[];
}

interface PrismPurchaseTier {
  id: PrismPurchaseTierId;
  label: string;
  priceLabel: string;
  priceMidUsd: number;
  cycleGainPct: number;
  toolLifeGainPct: number;
}

const MACHINE_RATE_PER_HOUR: Record<MachineMode, number> = {
  mill: 110,
  lathe: 95,
  edm: 78,
  wire_edm: 85,
  laser: 68,
  waterjet: 64,
};

/** Per-manufacturer wire EDM rates — used when a specific machine is selected. */
const WEDM_MANUFACTURER_RATES: Record<string, number> = {
  Makino: 95,
  Sodick: 85,
  FANUC: 75,
  AgieCharmilles: 90,
  Mitsubishi: 80,
};

/** Get machine rate, preferring per-manufacturer data for wire EDM. */
function getMachineRate(mode: MachineMode, machineManufacturer?: string): number {
  if (mode === 'wire_edm' && machineManufacturer) {
    return WEDM_MANUFACTURER_RATES[machineManufacturer] ?? MACHINE_RATE_PER_HOUR.wire_edm;
  }
  return MACHINE_RATE_PER_HOUR[mode];
}

const PURCHASE_TIERS: PrismPurchaseTier[] = [
  {
    id: 'budget',
    label: 'Budget path',
    priceLabel: '$420 - $980',
    priceMidUsd: 700,
    cycleGainPct: 0.08,
    toolLifeGainPct: 0.1,
  },
  {
    id: 'standard',
    label: 'Standard path',
    priceLabel: '$1,150 - $2,650',
    priceMidUsd: 1900,
    cycleGainPct: 0.17,
    toolLifeGainPct: 0.22,
  },
  {
    id: 'premium',
    label: 'Premium path',
    priceLabel: '$2,950 - $6,400',
    priceMidUsd: 4500,
    cycleGainPct: 0.27,
    toolLifeGainPct: 0.36,
  },
];

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function includesAnyToken(haystack: string, values: string[]) {
  if (!haystack) return false;
  return values.some((value) => {
    const normalized = normalizeText(value);
    return normalized.length > 0 && haystack.includes(normalized);
  });
}

function confidenceFromPackage(machine?: MachineCatalogItem) {
  switch (machine?.packageProvenance?.confidence) {
    case 'published':
      return 0.9;
    case 'merged':
      return 0.74;
    case 'inferred':
      return 0.58;
    case 'fallback':
      return 0.42;
    default:
      return 0.55;
  }
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function uniqueIds(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function idArrayEquals(left: string[], right: string[]) {
  const a = uniqueIds(left).sort();
  const b = uniqueIds(right).sort();
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function buildInventorySignals(
  input: Pick<
    CalculatorPrismModeInput,
    'inventoryWorkspace' | 'machine' | 'tool' | 'compatibleHolderPackages' | 'material' | 'currentCoolantId'
  >,
): InventorySignals {
  const workspace = input.inventoryWorkspace;
  const corpus = workspace
    ? [
        workspace.summary,
        workspace.shellNote,
        ...workspace.checkoutQueue.map((item) => `${item.label} ${item.category} ${item.note} ${item.toolId}`),
        ...workspace.usagePulses.map((item) => `${item.label} ${item.machine} ${item.nextAction}`),
        ...workspace.receivingQueue.map((item) => `${item.supplier} ${item.reference} ${item.note}`),
      ]
        .join(' ')
        .toLowerCase()
    : '';

  const toolTokens = input.tool
    ? uniqueIds([
        ...tokenize(input.tool.family),
        ...tokenize(input.tool.label),
        input.tool.id,
        input.tool.holder,
      ])
    : [];
  const holderTokens = uniqueIds(
    input.compatibleHolderPackages.flatMap((holder) => [
      holder.id,
      holder.label,
      holder.detail,
      holder.brandId,
      holder.brandLabel ?? '',
      holder.spindleInterface ?? '',
      holder.toolInterface ?? '',
    ]),
  );
  const machineTokens = input.machine
    ? uniqueIds([input.machine.manufacturer, input.machine.model, input.machine.machineTypeLabel, input.machine.family])
    : [];
  const coolantTokens =
    input.currentCoolantId === 'tsc'
      ? ['through spindle coolant', 'coolant', 'tsc']
      : input.currentCoolantId === 'through_air'
        ? ['through air', 'air blast', 'air']
        : [input.currentCoolantId];

  const directToolingMatch = includesAnyToken(corpus, toolTokens);
  const directHolderMatch = includesAnyToken(corpus, holderTokens);
  const activeMachineMatch = includesAnyToken(corpus, machineTokens);
  const coolantSupportMatch = includesAnyToken(corpus, coolantTokens);

  const coverageScore = Math.round(
    clamp01(
      (directToolingMatch ? 0.38 : 0)
      + (directHolderMatch ? 0.27 : 0)
      + (activeMachineMatch ? 0.2 : 0)
      + (coolantSupportMatch ? 0.1 : 0)
      + (workspace ? 0.08 : 0),
    ) * 100,
  );

  const evidence = [
    directToolingMatch ? `${input.tool?.label ?? 'Tooling'} already echoes through the live crib / usage posture.` : '',
    directHolderMatch ? 'A compatible holder or spindle-side package already shows up in inventory records.' : '',
    activeMachineMatch ? `${input.machine?.model ?? 'This machine'} already appears in live usage pulses.` : '',
    coolantSupportMatch ? 'Current coolant posture is backed by live receiving / checkout language.' : '',
  ].filter(Boolean);

  let label = 'No live crib signal';
  if (coverageScore >= 75) label = 'Strong live crib coverage';
  else if (coverageScore >= 45) label = 'Partial live crib coverage';
  else if (coverageScore > 0) label = 'Weak live crib coverage';

  return {
    directToolingMatch,
    directHolderMatch,
    activeMachineMatch,
    coolantSupportMatch,
    coverageScore,
    label,
    evidence,
  };
}

function chooseRecommendedCoolant(
  input: Pick<
    CalculatorPrismModeInput,
    | 'machineMode'
    | 'material'
    | 'tool'
    | 'toolpath'
    | 'finishTarget'
    | 'currentCoolantId'
    | 'availableCoolantOptions'
    | 'toolDiameterMm'
    | 'docMm'
    | 'wocMm'
  >,
) {
  return buildCoolantStrategyRecommendation(input).recommendedId;
}

function buildSelectionContextLabel(input: Pick<CalculatorPrismModeInput, 'material' | 'toolpath' | 'tool'>) {
  return [input.material?.name, input.toolpath?.label, input.tool?.label].filter(Boolean).join(' · ');
}

function buildMaterialContextLabel(material?: MaterialCatalogItem) {
  if (!material) return 'the active material';
  const qualifiers = [
    material.subcategoryLabel && material.subcategoryLabel !== material.groupLabel ? material.subcategoryLabel : '',
    material.conditionLabel,
    material.isoGroup ? `ISO ${material.isoGroup}` : '',
  ].filter(Boolean);
  return qualifiers.length ? `${material.name} (${qualifiers.join(' · ')})` : material.name;
}

function buildMaterialPosture(
  material: MaterialCatalogItem | undefined,
  currentCoolantId: string,
  recommendedCoolantLabel: string,
  coolantChanged: boolean,
) {
  if (!material) {
    return {
      tone: 'neutral' as const,
      detail: 'No material context is active yet, so Kienzle is leaning on machine, tooling, and crib posture.',
      evidence: [] as string[],
    };
  }

  const demandingFamily = ['tool_steel', 'superalloy', 'exotic_alloy'].includes(material.group);
  const mediumDemandFamily = ['stainless', 'titanium', 'cast'].includes(material.group);
  const tone: PrismModeTone = demandingFamily ? 'watch' : mediumDemandFamily ? 'neutral' : 'good';
  const taxonomyLabel = [
    material.groupLabel ?? material.group,
    material.subcategoryLabel && material.subcategoryLabel !== material.groupLabel ? material.subcategoryLabel : '',
    material.conditionLabel,
    material.isoGroup ? `ISO ${material.isoGroup}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const coolantNote = material.idealCoolant
    ? coolantChanged
      ? `Kienzle is shifting coolant from ${currentCoolantId} toward ${recommendedCoolantLabel} because ${material.name} leans toward ${material.idealCoolant}.`
      : `${material.name} already lines up with the current ${recommendedCoolantLabel} coolant posture.`
    : `${material.name} does not carry a strong coolant preference, so Kienzle is weighting machine and toolpath posture more heavily.`;

  return {
    tone,
    detail: `${taxonomyLabel}${material.hardness ? ` · ${material.hardness}` : ''}. ${coolantNote}`.trim(),
    evidence: [
      taxonomyLabel ? `${material.name} is classified as ${taxonomyLabel}.` : '',
      material.machinability ? `Machinability signal: ${material.machinability}.` : '',
      material.chipControl ? `Chip-control posture: ${material.chipControl}.` : '',
      material.idealCoolant ? `Preferred coolant posture: ${material.idealCoolant}.` : '',
    ].filter(Boolean),
  };
}

function chooseRecommendedHolderStyle(
  input: Pick<
    CalculatorPrismModeInput,
    'machineMode' | 'machine' | 'tool' | 'toolpath' | 'toolpathTypeId' | 'finishTarget' | 'stockShape' | 'compatibleHolderPackages'
  >,
) {
  const availableStyleIds = new Set(
    input.compatibleHolderPackages.flatMap((holder) => holder.holderStyleIds ?? [holder.holderStyleId ?? 'machine-standard']),
  );
  const signature = normalizeText(
    [
      input.tool?.family,
      input.tool?.label,
      input.tool?.geometryClass,
      input.toolpath?.label,
      input.toolpath?.path,
      input.toolpathTypeId,
      input.finishTarget,
      input.stockShape,
    ]
      .filter(Boolean)
      .join(' '),
  );

  if (input.machineMode === 'mill') {
    if (signature.includes('face') && availableStyleIds.has('machine-standard')) return 'machine-standard';
    if ((signature.includes('finish') || signature.includes('surface') || input.finishTarget === 'tight-finish') && availableStyleIds.has('shrink-fit')) {
      return 'shrink-fit';
    }
    if ((signature.includes('adaptive') || signature.includes('rough') || signature.includes('pocket')) && availableStyleIds.has('hydraulic')) {
      return 'hydraulic';
    }
    if (availableStyleIds.has('machine-standard')) return 'machine-standard';
    if (availableStyleIds.has('hydraulic')) return 'hydraulic';
    if (availableStyleIds.has('shrink-fit')) return 'shrink-fit';
  }

  if (input.machineMode === 'lathe') {
    const hasMillingHead = Boolean(input.machine?.toolingLayout?.hasMillingHead);
    const hasLiveTooling = Boolean(input.machine?.toolingLayout?.liveTooling);
    const turretCount = input.machine?.toolingLayout?.turretCount ?? 1;
    if (hasMillingHead && (signature.includes('mill') || signature.includes('drill')) && availableStyleIds.has('milling-head')) {
      return 'milling-head';
    }
    if (hasLiveTooling && (signature.includes('live') || signature.includes('mill') || signature.includes('drill')) && availableStyleIds.has('live-tooling')) {
      return 'live-tooling';
    }
    if (turretCount >= 2 && availableStyleIds.has('twin-turret')) {
      return 'twin-turret';
    }
    if (availableStyleIds.has('rigid-turning')) return 'rigid-turning';
    if (availableStyleIds.has('machine-standard')) return 'machine-standard';
  }

  if (input.machineMode === 'edm') {
    if (availableStyleIds.has('erowa')) return 'erowa';
    if (availableStyleIds.has('three-r')) return 'three-r';
  }

  if (input.machineMode === 'wire_edm') {
    if (input.finishTarget === 'tight-finish' && availableStyleIds.has('fine-wire')) return 'fine-wire';
    if (availableStyleIds.has('taper-package')) return 'taper-package';
  }

  if (input.machineMode === 'laser') {
    if (input.finishTarget === 'tight-finish' && availableStyleIds.has('quality-head')) return 'quality-head';
    if (availableStyleIds.has('high-flow-head')) return 'high-flow-head';
  }

  if (input.machineMode === 'waterjet') {
    if (input.finishTarget === 'tight-finish' && availableStyleIds.has('precision-nozzle')) return 'precision-nozzle';
    if (availableStyleIds.has('heavy-plate')) return 'heavy-plate';
  }

  return input.compatibleHolderPackages[0]?.holderStyleId ?? 'machine-standard';
}

function chooseRecommendedHolderPackage(
  input: Pick<CalculatorPrismModeInput, 'compatibleHolderPackages' | 'tool'> & {
    recommendedHolderStyleId: string;
    currentHolderPackageId: string;
  },
) {
  const scored = input.compatibleHolderPackages
    .map((holder) => {
      let score = 0;
      const holderStyleIds = holder.holderStyleIds ?? [holder.holderStyleId ?? 'machine-standard'];
      if (holderStyleIds.includes(input.recommendedHolderStyleId)) score += 6;
      if (holder.id === input.currentHolderPackageId) score += 1;
      if (input.tool?.id && holder.toolId === input.tool.id) score += 5;
      if (holder.source === 'database') score += 2;
      if (holder.coolantThrough) score += 1;
      return { holder, score };
    })
    .sort((left, right) => right.score - left.score);

  return scored[0]?.holder.id ?? input.currentHolderPackageId;
}

function chooseRecommendedControllerCapabilities(
  options: MachineControllerCapabilityOption[],
  currentIds: string[],
  profile: CalculatorSavedMachineProfile | null | undefined,
  finishTarget: string,
  toolpathTypeId: string | undefined,
) {
  const desired = new Set(currentIds);
  for (const option of options) {
    if (option.defaultEnabled) {
      desired.add(option.id);
    }
  }
  for (const capabilityId of profile?.enabledControllerFeatureIds ?? []) {
    if (options.some((option) => option.id === capabilityId)) {
      desired.add(capabilityId);
    }
  }

  const finishing = finishTarget === 'tight-finish' || toolpathTypeId === 'surface_finish';
  for (const option of options) {
    const signature = normalizeText(`${option.label} ${option.detail} ${option.checkTip}`);
    if (finishing && /high speed|smoothing|hpcc|machining navi|surface/i.test(signature)) {
      desired.add(option.id);
    }
    if (/cas|collision|safe|protection|avoidance/i.test(signature)) {
      desired.add(option.id);
    }
    if (finishTarget === 'prove-out' && /probe|probing/i.test(signature)) {
      desired.add(option.id);
    }
  }

  return uniqueIds([...desired]);
}

function buildCurrentSetupSnapshot(input: CalculatorPrismModeInput): CurrentSetupSnapshot {
  return {
    setupSource: input.currentSetupSource,
    coolantId: input.currentCoolantId,
    holderStyleId: input.currentHolderStyleId,
    holderPackageId: input.currentHolderPackageId,
    enabledFeatureIds: uniqueIds(input.currentFeatureIds),
    enabledControllerCapabilityIds: uniqueIds(input.currentControllerCapabilityIds),
  };
}

function estimateCycleMinutes(
  machineMode: MachineMode,
  toolpathTypeId: string | undefined,
  finishTarget: string,
  result: CalculatorPrismModeInput['result'],
) {
  const baselineByMode: Record<MachineMode, number> = {
    mill: 18,
    lathe: 11,
    edm: 26,
    wire_edm: 34,
    laser: 9,
    waterjet: 12,
  };
  let baseline = baselineByMode[machineMode];
  if (toolpathTypeId === 'roughing') baseline *= 1.25;
  if (toolpathTypeId === 'surface_finish' || finishTarget === 'tight-finish') baseline *= 1.15;
  if (result?.mrr && result.mrr > 0) {
    baseline *= clamp01(14 / Math.max(14, result.mrr)) + 0.55;
  }
  return Math.max(4, baseline);
}

function estimateAnnualPartVolume(machineMode: MachineMode, inventorySignals: InventorySignals) {
  const baselineByMode: Record<MachineMode, number> = {
    mill: 2200,
    lathe: 4200,
    edm: 700,
    wire_edm: 880,
    laser: 7600,
    waterjet: 5400,
  };
  const baseline = baselineByMode[machineMode];
  return Math.round(baseline * (inventorySignals.activeMachineMatch ? 1.18 : 0.92));
}

function buildPurchaseHref(baseHref: string, tierId: PrismPurchaseTierId, focus: string) {
  const delimiter = baseHref.includes('?') ? '&' : '?';
  return `${baseHref}${delimiter}prismTier=${encodeURIComponent(tierId)}&prismFocus=${encodeURIComponent(focus)}`;
}

function dedupeDistributorOffers(offers: DistributorOffer[]) {
  const seen = new Set<string>();
  return offers.filter((offer) => {
    const key = `${offer.name}::${offer.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function machineManufacturerHref(machine?: MachineCatalogItem) {
  const manufacturer = machine?.manufacturer?.toLowerCase() ?? '';
  if (manufacturer.includes('okuma')) return 'https://www.okuma.com';
  if (manufacturer.includes('haas')) return 'https://www.haascnc.com';
  if (manufacturer.includes('mazak')) return 'https://www.mazak.com';
  if (manufacturer.includes('makino')) return 'https://www.makino.com';
  if (manufacturer.includes('brother')) return 'https://www.brother-usa.com';
  if (manufacturer.includes('doosan') || manufacturer.includes('dn solutions')) return 'https://www.dnsolutions.com';
  if (manufacturer.includes('citizen')) return 'https://www.citizenmachinery.com';
  if (manufacturer.includes('nakamura')) return 'https://www.nakamura-tome.com';
  if (manufacturer.includes('dmg')) return 'https://us.dmgmori.com';
  return 'https://www.mscdirect.com';
}

function buildFallbackPrismDistributors(
  input: CalculatorPrismModeInput,
  tierId: PrismPurchaseTierId,
  focus: string,
  priceLabel: string,
): DistributorOffer[] {
  return [
    {
      id: `${tierId}-local`,
      name: 'Local distributor path',
      scope: 'local',
      locationLabel: input.machine?.manufacturer ? `${input.machine.manufacturer} regional support` : 'Regional sourcing',
      priceLabel,
      etaLabel: '2-5 business days',
      note: `Source the ${tierId} package with the active machine package attached so the order stays configuration-safe.`,
      href: buildPurchaseHref(input.purchasingHrefBase, tierId, focus),
      featured: tierId === 'standard',
    },
    {
      id: `${tierId}-nationwide`,
      name: 'Nationwide catalog path',
      scope: 'nationwide',
      locationLabel: 'National coverage',
      priceLabel,
      etaLabel: 'Next-week availability',
      note: 'Use this when broad availability matters more than staying inside one local distributor stack.',
      href: buildPurchaseHref(input.purchasingHrefBase, tierId, `${focus}-national`),
    },
    {
      id: `${tierId}-manufacturer`,
      name: 'OEM / premium source',
      scope: 'manufacturer',
      locationLabel: 'OEM-backed package',
      priceLabel,
      etaLabel: tierId === 'premium' ? 'Quoted to order' : '3-7 business days',
      note: 'Use this when direct application support and cutting-data depth matter more than the lowest upfront spend.',
      href: buildPurchaseHref(input.purchasingHrefBase, tierId, `${focus}-oem`),
    },
  ];
}

function buildRegionalPrismDistributors(
  input: CalculatorPrismModeInput,
  tierId: PrismPurchaseTierId,
  focus: string,
  priceLabel: string,
): DistributorOffer[] {
  if (!input.selection) {
    return buildFallbackPrismDistributors(input, tierId, focus, priceLabel);
  }

  const region = regionFromSelection(input.selection);
  const machineLabel = input.machine?.manufacturer ?? 'OEM';
  return dedupeDistributorOffers([
    ...regionalDistributorOffers(input.selection),
    ...nationwideOffers(priceLabel, `calculator-prism-${tierId}-${focus}`),
    manufacturerOffer(
      `${machineLabel} OEM`,
      tierId === 'premium' ? priceLabel : `${priceLabel} list-guided`,
      machineManufacturerHref(input.machine),
      `Direct ${machineLabel} application and support lane when configuration-safe buying, service coordination, or machine-specific options matter more than the lowest upfront spend in the ${region.label} corridor.`,
    ),
  ]);
}

function rankTier(
  tier: PrismPurchaseTier,
  material: MaterialCatalogItem | undefined,
  finishTarget: string,
  result: CalculatorPrismModeInput['result'],
  inventorySignals: InventorySignals,
  machine?: MachineCatalogItem,
) {
  const materialDemand =
    material?.group === 'tool_steel' || material?.group === 'superalloy'
      ? 1
      : material?.group === 'stainless'
        ? 0.65
        : 0.35;
  const finishDemand = finishTarget === 'tight-finish' ? 1 : finishTarget === 'general' ? 0.55 : 0.35;
  const cutConfidence = clamp01(result?.confidence ?? 0.55);
  const machineConfidence = confidenceFromPackage(machine);
  const shortToolLifePenalty = result?.toolLife != null && result.toolLife < 35 ? 1 : 0;

  if (tier.id === 'budget') {
    return 74 + inventorySignals.coverageScore * 0.12 - finishDemand * 14 - materialDemand * 10 + (1 - cutConfidence) * 8;
  }
  if (tier.id === 'premium') {
    return 60 + finishDemand * 18 + materialDemand * 12 + cutConfidence * 10 + machineConfidence * 8 + shortToolLifePenalty * 9;
  }
  return 82 + inventorySignals.coverageScore * 0.08 + machineConfidence * 10 + cutConfidence * 9 + materialDemand * 6;
}

function buildPurchaseRecommendations(
  input: CalculatorPrismModeInput,
  inventorySignals: InventorySignals,
  recommendedSetup: CalculatorPrismRecommendedSetup,
  confidenceScore: number,
) {
  const toolLabel = input.tool?.label ?? 'tooling stack';
  const materialContextLabel = buildMaterialContextLabel(input.material);
  const holderLabel =
    input.compatibleHolderPackages.find((holder) => holder.id === recommendedSetup.holderPackageId)?.label
    ?? 'machine-ready holder package';
  const focus =
    !inventorySignals.directHolderMatch && input.compatibleHolderPackages.length > 0
      ? 'holder-package'
      : !inventorySignals.directToolingMatch
        ? 'tooling-package'
        : !inventorySignals.coolantSupportMatch
          ? 'process-support'
          : 'performance-package';
  const machineRate = getMachineRate(input.machineMode, input.machine?.manufacturer);
  const cycleMinutes = estimateCycleMinutes(input.machineMode, input.toolpathTypeId, input.finishTarget, input.result);
  const annualParts = estimateAnnualPartVolume(input.machineMode, inventorySignals);
  const regionLabel = input.selection ? regionFromSelection(input.selection).label : 'regional';

  const rankedRecommendations: RankedPurchaseRecommendation[] = [...PURCHASE_TIERS]
    .map((tier) => {
      const rankingScore = rankTier(
        tier,
        input.material,
        input.finishTarget,
        input.result,
        inventorySignals,
        input.machine,
      );
      const savingsPerPart =
        ((cycleMinutes * machineRate) / 60) * tier.cycleGainPct
        + ((input.result?.toolLife ?? 40) / 40) * tier.toolLifeGainPct * 0.55;
      const annualSavings = Math.max(160, savingsPerPart * annualParts);
      const paybackMonths = Math.max(0.6, tier.priceMidUsd / Math.max(annualSavings / 12, 1));
      const paybackLabel =
        paybackMonths < 1
          ? 'Estimated payback inside the first month'
          : `Estimated payback in ${paybackMonths.toFixed(1)} months`;
      const roiStrength =
        paybackMonths <= 2
          ? 'High ROI'
          : paybackMonths <= 5
            ? 'Balanced ROI'
            : 'Strategic ROI';
      const confidenceLabel =
        confidenceScore >= 85
          ? 'strong cutting-data confidence'
          : confidenceScore >= 65
            ? 'balanced cutting-data confidence'
            : 'thin cutting-data confidence';
      const title =
        tier.id === 'budget'
          ? `Budget machine-ready path`
          : tier.id === 'standard'
            ? `Standard production-ready path`
            : `Premium performance path`;
      const distributors = buildRegionalPrismDistributors(input, tier.id, focus, tier.priceLabel);

      return {
        id: `calculator-prism-${tier.id}`,
        title,
        category: 'Calculator Kienzle mode',
        detail:
          focus === 'holder-package'
            ? `${tier.label} for ${input.machine?.model ?? 'the active machine'} centered on ${holderLabel}, ${toolLabel}, ${materialContextLabel}, and a ${recommendedSetup.setupSource.replace(/-/g, ' ')} setup posture.`
            : focus === 'tooling-package'
              ? `${tier.label} for ${toolLabel} on ${input.machine?.model ?? 'the active machine'}, biased around ${materialContextLabel}, the active ${input.toolpath?.label ?? 'toolpath'}, and ${recommendedSetup.coolantId} coolant posture.`
              : focus === 'process-support'
                ? `${tier.label} for ${input.machine?.model ?? 'the active machine'} that shores up coolant, probing, and machine-feature coverage so ${materialContextLabel} can run the current ${input.toolpath?.label ?? 'toolpath'} with less guesswork.`
                : `${tier.label} for ${input.machine?.model ?? 'the active machine'} that pushes cycle time and finish confidence harder for ${materialContextLabel} while keeping ${toolLabel} legal on the setup.`,
        roiStrength: `${roiStrength} · ${Math.round(annualSavings / 100) * 100} est. annual savings`,
        estimatedPrice: tier.priceLabel,
        payback: paybackLabel,
        whyNow: `Ranked with ${confidenceLabel}, ${inventorySignals.label.toLowerCase()}, the saved machine-profile posture, and the ${regionLabel} sourcing lane so Kienzle does not recommend unsupported combinations.`,
        distributors,
        rankingScore,
      };
    })
    .sort((left, right) => right.rankingScore - left.rankingScore);

  return rankedRecommendations.map(({ rankingScore: _rankingScore, ...recommendation }, index) => ({
    ...recommendation,
    category: `Calculator Kienzle mode · Rank #${index + 1}`,
  }));
}

function formatUsdValue(value: number) {
  if (!Number.isFinite(value)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

function formatCostPerPart(value: number) {
  if (!Number.isFinite(value)) return '$0.000/part';
  return `${formatUsdValue(value).replace(/\.00$/, '')}/part`;
}

function tierMetaFromId(tierId: PrismPurchaseTierId) {
  return PURCHASE_TIERS.find((tier) => tier.id === tierId) ?? PURCHASE_TIERS[1]!;
}

function buildLiveTierDistributors(
  input: CalculatorPrismModeInput,
  tierId: PrismPurchaseTierId,
  focus: string,
  priceLabel: string,
): DistributorOffer[] {
  return buildRegionalPrismDistributors(input, tierId, focus, priceLabel);
}

function buildToolRecommendationTitle(tierId: PrismPurchaseTierId) {
  if (tierId === 'budget') return 'Budget machine-ready path';
  if (tierId === 'premium') return 'Premium performance path';
  return 'Standard production-ready path';
}

function rankLiveTier(
  tierId: PrismPurchaseTierId,
  recommendation: ToolRoiRecommendation,
  input: CalculatorPrismModeInput,
  confidenceScore: number,
  bestCostPerPart: number,
) {
  const tier = tierMetaFromId(tierId);
  const baseTierScore = rankTier(
    tier,
    input.material,
    input.finishTarget,
    input.result,
    buildInventorySignals(input),
    input.machine,
  );
  const cpp = recommendation.cost_per_part.value;
  const costAdvantage = bestCostPerPart > 0 ? clamp01(bestCostPerPart / Math.max(cpp, bestCostPerPart)) : 1;
  const finishBias = input.finishTarget === 'tight-finish' && tierId === 'premium' ? 12 : 0;
  const confidenceBias = (confidenceScore / 100) * 8;
  return baseTierScore + costAdvantage * 22 + finishBias + confidenceBias;
}

export function buildPurchaseRecommendationsFromToolRoi(
  input: CalculatorPrismModeInput,
  roiResult: ToolRoiAnalysisResult,
  confidenceScore: number,
): CalculatorPrismLivePurchaseRecommendations {
  const toolLabel = input.tool?.label ?? 'tooling stack';
  const materialContextLabel = buildMaterialContextLabel(input.material);
  const holderLabel =
    input.compatibleHolderPackages.find((holder) => holder.id === input.currentHolderPackageId)?.label
    ?? 'machine-ready holder package';
  const focus =
    roiResult.crib_recommendation
      ? 'crib-upgrade'
      : input.currentHolderPackageId
        ? 'holder-package'
        : 'tooling-package';
  const currentCost = roiResult.total_cost_breakdown.current_total_per_part?.value ?? null;
  const bestCost = roiResult.total_cost_breakdown.best_total_per_part.value;
  const regionLabel = input.selection ? regionFromSelection(input.selection).label : 'regional';
  const tierRecommendations: Array<{ tierId: PrismPurchaseTierId; recommendation: ToolRoiRecommendation }> = [
    { tierId: 'budget', recommendation: roiResult.budget_recommendation },
    { tierId: 'standard', recommendation: roiResult.standard_recommendation },
    { tierId: 'premium', recommendation: roiResult.premium_recommendation },
  ];

  const rankedRecommendations: RankedPurchaseRecommendation[] = tierRecommendations
    .map(({ tierId, recommendation }) => {
      const estimatedPrice = `${formatUsdValue(recommendation.tool.price)} tool cost`;
      const perPartDelta = currentCost != null ? Math.max(0, currentCost - recommendation.cost_per_part.value) : 0;
      const annualSavings = perPartDelta > 0
        ? Math.max(perPartDelta * 5000, roiResult.total_cost_breakdown.annual_savings.value * 0.35)
        : roiResult.total_cost_breakdown.annual_savings.value * (recommendation.cost_per_part.value <= bestCost * 1.05 ? 1 : 0.45);
      const paybackMonths = annualSavings > 0
        ? Math.max(0.6, recommendation.tool.price / Math.max(annualSavings / 12, 1))
        : 12;
      const paybackLabel =
        paybackMonths < 1
          ? 'Estimated payback inside the first month'
          : `Estimated payback in ${paybackMonths.toFixed(1)} months`;
      const roiStrength =
        paybackMonths <= 2
          ? 'High ROI'
          : paybackMonths <= 5
            ? 'Balanced ROI'
            : 'Strategic ROI';
      const title = buildToolRecommendationTitle(tierId);
      const whyNowPrefix = roiResult.crib_recommendation
        ? `The live crib already has ${roiResult.crib_recommendation.tool.name}, so this ranking compares buy-now tiers against an on-hand baseline.`
        : 'No strong crib baseline is available, so Kienzle is ranking tiered buy paths directly from the ROI engine.';

      return {
        id: `calculator-prism-live-${tierId}`,
        title,
        category: 'Calculator Kienzle mode',
        detail:
          tierId === 'budget'
            ? `${title} built around ${recommendation.tool.name} for ${input.machine?.model ?? 'the active machine'} when spend discipline matters more than peak cycle time on ${materialContextLabel}.`
            : tierId === 'premium'
              ? `${title} built around ${recommendation.tool.name} when finish confidence, material difficulty, or cycle pressure justify the higher spend on ${materialContextLabel}.`
              : `${title} centered on ${recommendation.tool.name} as the balanced package for ${toolLabel}, ${holderLabel}, ${materialContextLabel}, and the active ${input.toolpath?.label ?? 'toolpath'}.`,
        roiStrength: `${roiStrength} - ${formatUsdValue(Math.round(annualSavings))} est. annual savings`,
        estimatedPrice,
        payback: paybackLabel,
        whyNow: `${whyNowPrefix} Forecast cost per part: ${formatCostPerPart(recommendation.cost_per_part.value)}. ${recommendation.rationale}`,
        distributors: buildLiveTierDistributors(input, tierId, focus, estimatedPrice),
        rankingScore: rankLiveTier(tierId, recommendation, input, confidenceScore, bestCost),
      };
    })
    .sort((left, right) => right.rankingScore - left.rankingScore);

  return {
    recommendations: rankedRecommendations.map(({ rankingScore: _rankingScore, ...recommendation }, index) => ({
      ...recommendation,
      category: `Calculator Kienzle mode - Rank #${index + 1}`,
    })),
    sourceLabel: roiResult.crib_recommendation
      ? `ROI engine live - ${regionLabel} crib and catalog`
      : `ROI engine live - ${regionLabel} catalog ranked`,
    note: currentCost != null
      ? `Live ROI engine compared the current tool against budget, standard, and premium paths for ${input.machine?.model ?? 'the active machine'} on ${materialContextLabel} while biasing buy lanes to ${regionLabel}. Best forecast: ${formatCostPerPart(bestCost)}.`
      : `Live ROI engine ranked budget, standard, and premium paths for ${input.machine?.model ?? 'the active machine'} using ${materialContextLabel}, the active toolpath, the machine package, and the ${regionLabel} sourcing lane.`,
    warnings: roiResult.warnings ?? [],
  };
}

export function buildCalculatorPrismModePlan(input: CalculatorPrismModeInput): CalculatorPrismModePlan {
  const inventorySignals = buildInventorySignals(input);
  const machineProfileLinked = Boolean(input.defaultMachineProfile?.canDriveCalculatorSelections);
  const coolantRecommendation = buildCoolantStrategyRecommendation({
    machineMode: input.machineMode,
    material: input.material,
    tool: input.tool,
    toolpath: input.toolpath,
    finishTarget: input.finishTarget,
    currentCoolantId: input.currentCoolantId,
    availableCoolantOptions: input.availableCoolantOptions,
    toolDiameterMm: input.toolDiameterMm,
    docMm: input.docMm,
    wocMm: input.wocMm,
  });
  const recommendedCoolantId = chooseRecommendedCoolant({
    machineMode: input.machineMode,
    material: input.material,
    tool: input.tool,
    toolpath: input.toolpath,
    finishTarget: input.finishTarget,
    currentCoolantId: input.currentCoolantId,
    availableCoolantOptions: input.availableCoolantOptions,
    toolDiameterMm: input.toolDiameterMm,
    docMm: input.docMm,
    wocMm: input.wocMm,
  });
  const recommendedHolderStyleId = chooseRecommendedHolderStyle({
    machineMode: input.machineMode,
    machine: input.machine,
    tool: input.tool,
    toolpath: input.toolpath,
    toolpathTypeId: input.toolpathTypeId,
    finishTarget: input.finishTarget,
    stockShape: input.stockShape,
    compatibleHolderPackages: input.compatibleHolderPackages,
  });
  const recommendedHolderPackageId = chooseRecommendedHolderPackage({
    compatibleHolderPackages: input.compatibleHolderPackages,
    tool: input.tool,
    recommendedHolderStyleId,
    currentHolderPackageId: input.currentHolderPackageId,
  });
  const recommendedSetupSource =
    inventorySignals.directToolingMatch && inventorySignals.directHolderMatch
      ? 'shop-crib'
      : machineProfileLinked || inventorySignals.coverageScore >= 45
        ? 'recommended'
        : 'new-package';
  const recommendedFeatureIds = uniqueIds([
    ...input.recommendedFeatureIds,
    ...(input.defaultMachineProfile?.enabledControllerFeatureIds ?? []).filter((featureId) =>
      input.recommendedFeatureIds.includes(featureId),
    ),
  ]);
  const recommendedControllerCapabilityIds = chooseRecommendedControllerCapabilities(
    input.controllerCapabilityOptions,
    input.currentControllerCapabilityIds,
    input.defaultMachineProfile,
    input.finishTarget,
    input.toolpathTypeId,
  );
  const recommendedSetup: CalculatorPrismRecommendedSetup = {
    setupSource: recommendedSetupSource,
    coolantId: recommendedCoolantId,
    holderStyleId: recommendedHolderStyleId,
    holderPackageId: recommendedHolderPackageId,
    enabledFeatureIds: recommendedFeatureIds,
    enabledControllerCapabilityIds: recommendedControllerCapabilityIds,
  };
  const currentSetup = buildCurrentSetupSnapshot(input);
  const setupDeltaCount = Number(currentSetup.setupSource !== recommendedSetup.setupSource)
    + Number(currentSetup.coolantId !== recommendedSetup.coolantId)
    + Number(currentSetup.holderStyleId !== recommendedSetup.holderStyleId)
    + Number(currentSetup.holderPackageId !== recommendedSetup.holderPackageId)
    + Number(!idArrayEquals(currentSetup.enabledFeatureIds, recommendedSetup.enabledFeatureIds))
    + Number(!idArrayEquals(currentSetup.enabledControllerCapabilityIds, recommendedSetup.enabledControllerCapabilityIds));
  const machineConfidence = confidenceFromPackage(input.machine);
  const resultConfidence = clamp01(input.result?.confidence ?? 0.55);
  const confidenceScore = Math.round(
    ((machineConfidence * 0.34) + (resultConfidence * 0.28) + (inventorySignals.coverageScore / 100) * 0.26 + (machineProfileLinked ? 0.12 : 0.04)) * 100,
  );
  const confidenceLabel =
    confidenceScore >= 82
      ? 'High confidence'
      : confidenceScore >= 62
        ? 'Balanced confidence'
        : 'Advisory confidence';
  const materialPosture = buildMaterialPosture(
    input.material,
    input.currentCoolantId,
    coolantRecommendation.recommendedLabel,
    recommendedSetup.coolantId !== input.currentCoolantId,
  );
  const machineProfileLabel = machineProfileLinked
    ? `${input.defaultMachineProfile?.displayName ?? 'Saved machine profile'} is linked`
    : 'No saved calculator machine default linked';
  const selectionContextLabel = buildSelectionContextLabel(input);
  const dominantRecommendation =
    recommendedSetupSource === 'shop-crib'
      ? `Run from the crib-first posture and keep the setup close to what the floor already owns${selectionContextLabel ? ` for ${selectionContextLabel}` : ''}.`
      : recommendedSetupSource === 'recommended'
        ? `Use the saved machine truth as the baseline, then let Kienzle tighten the active setup around it${selectionContextLabel ? ` for ${selectionContextLabel}` : ''}.`
        : `Treat this as a new-package job and let Kienzle rank the fastest legal way to fill the gaps${selectionContextLabel ? ` for ${selectionContextLabel}` : ''}.`;
  const evidence = uniqueIds([
    ...inventorySignals.evidence,
    ...materialPosture.evidence,
    machineProfileLinked
      ? `${input.defaultMachineProfile?.machineLabel ?? 'Saved machine profile'} can repopulate controller, spindle, and coolant posture.`
      : '',
    input.result?.ra != null
      ? `Live surface finish is tracking ${input.result.ra.toFixed(2)} µm Ra.`
      : 'No live cut result yet, so ranking leans more on machine and inventory posture.',
    input.toolpath?.label
      ? `${input.toolpath.label} stays inside the active machine package and drives the holder / coolant weighting.`
      : '',
    input.programmingLabel ? `${input.programmingLabel} remains the current CAM path for this recommendation pass.` : '',
  ]).filter(Boolean);
  const signals: CalculatorPrismModeSignal[] = [
    {
      id: 'inventory',
      title: 'Crib posture',
      detail: inventorySignals.label,
      tone: inventorySignals.coverageScore >= 60 ? 'good' : inventorySignals.coverageScore >= 35 ? 'watch' : 'neutral',
    },
    {
      id: 'machine-profile',
      title: 'Machine profile',
      detail: machineProfileLabel,
      tone: machineProfileLinked ? 'good' : 'watch',
    },
    {
      id: 'coolant',
      title: 'Coolant posture',
      detail: `${coolantRecommendation.recommendedLabel} recommended. ${coolantRecommendation.rationale}`,
      tone: recommendedSetup.coolantId === input.currentCoolantId ? 'good' : 'watch',
    },
    {
      id: 'material',
      title: 'Material posture',
      detail: materialPosture.detail,
      tone: materialPosture.tone,
    },
    {
      id: 'holder',
      title: 'Holder posture',
      detail: input.compatibleHolderPackages.find((holder) => holder.id === recommendedHolderPackageId)?.label
        ?? recommendedHolderStyleId,
      tone: recommendedHolderPackageId === input.currentHolderPackageId ? 'good' : 'watch',
    },
  ];
  const purchaseRecommendations = buildPurchaseRecommendations(
    input,
    inventorySignals,
    recommendedSetup,
    confidenceScore,
  );

  return {
    summary: `Kienzle mode sees ${inventorySignals.label.toLowerCase()} and ${confidenceLabel.toLowerCase()} for ${input.machine?.manufacturer ?? 'the active machine'} ${input.machine?.model ?? ''}${selectionContextLabel ? ` · ${selectionContextLabel}` : ''}`.trim(),
    detail: dominantRecommendation,
    confidenceScore,
    confidenceLabel,
    inventoryCoverageScore: inventorySignals.coverageScore,
    inventoryCoverageLabel: inventorySignals.label,
    machineProfileLabel,
    dominantRecommendation,
    evidence,
    signals,
    recommendedSetup,
    setupDeltaCount,
    hasSetupDelta: setupDeltaCount > 0,
    purchaseRecommendations,
  };
}
