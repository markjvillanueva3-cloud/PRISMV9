import type { PartSummaryRecord } from '../api/parts';
import type { HolderPackageOption } from '../api/calculatorData';
import type {
  MachineCatalogItem,
  MaterialCatalogItem,
  ToolCatalogItem,
} from '../data/calculatorWorkspace';
import {
  nationwideOffers,
  regionFromSelection,
  regionalDistributorOffers,
} from '../features/operating-system/commerceFixtures';
import type {
  AlarmCommerceWorkspace,
  DistributorOffer,
  PurchaseRecommendation,
  ShellCommerceSelection,
} from '../features/operating-system/contracts';

export interface CalculatorSectionCommerceHighlight {
  id: string;
  label: string;
  value: string;
  detail: string;
}

export interface CalculatorSectionCommerceRecord {
  id: string;
  label: string;
  detail: string;
  badge?: string;
  priceLabel?: string;
  note?: string;
}

export interface CalculatorSectionCommerceView {
  id: string;
  title: string;
  eyebrow: string;
  summary: string;
  sourceLabel: string;
  recommendations: PurchaseRecommendation[];
  highlights: CalculatorSectionCommerceHighlight[];
  relatedRecords?: CalculatorSectionCommerceRecord[];
  notes?: string[];
}

function dedupeOffers(offers: DistributorOffer[]) {
  const seen = new Set<string>();
  return offers.filter((offer) => {
    const key = `${offer.name}::${offer.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function specialistOffer(name: string, priceLabel: string, href: string, note: string): DistributorOffer {
  return {
    id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-specialist`,
    name,
    scope: 'manufacturer',
    locationLabel: 'Specialist vendor',
    priceLabel,
    etaLabel: 'Application specialist quote',
    note,
    href,
  };
}

function cleanLabel(value: string | undefined | null, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function summarizeMachine(machine?: MachineCatalogItem) {
  if (!machine) return 'the active machine package';
  return `${machine.manufacturer} ${machine.model}`;
}

function blendDistributors(
  selection: ShellCommerceSelection,
  priceLabel: string,
  detailKey: string,
  specialistOffers: DistributorOffer[],
) {
  return dedupeOffers([
    ...regionalDistributorOffers(selection),
    ...nationwideOffers(priceLabel, detailKey),
    ...specialistOffers,
  ]);
}

function materialRange(material: MaterialCatalogItem | undefined, tier: 'top-selling' | 'best-capability' | 'top-performing') {
  const group = material?.group ?? 'steel';
  const base =
    group === 'tool_steel' || group === 'stainless'
      ? [380, 1850]
      : group === 'titanium' || group === 'superalloy' || group === 'nontraditional'
        ? [620, 3400]
        : group === 'aluminum' || group === 'nonferrous'
          ? [180, 980]
          : [220, 1150];

  if (tier === 'best-capability') {
    return `$${(base[0] * 1.45).toFixed(0)} - $${(base[1] * 1.55).toFixed(0)}`;
  }
  if (tier === 'top-performing') {
    return `$${(base[0] * 1.2).toFixed(0)} - $${(base[1] * 1.3).toFixed(0)}`;
  }
  return `$${base[0].toFixed(0)} - $${base[1].toFixed(0)}`;
}

function materialSpecialists(material?: MaterialCatalogItem) {
  const group = material?.group ?? 'steel';
  if (group === 'titanium' || group === 'superalloy' || group === 'nontraditional') {
    return [
      specialistOffer('TW Metals', '$650 - $3,800', 'https://www.twmetals.com', 'Strong for aerospace alloys, titanium, nickel alloys, and cert-driven buys.'),
      specialistOffer('Continental Steel', '$720 - $4,100', 'https://www.continentalsteel.com', 'Useful when exotics, hard-to-find sizes, or certs matter more than commodity price.'),
    ];
  }
  if (group === 'tool_steel') {
    return [
      specialistOffer('Precision Marshall', '$420 - $2,200', 'https://www.precisionmarshall.com', 'Good fit for pre-hard, ground, and tool-room-ready stock.'),
      specialistOffer('Diehl Tool Steel', '$480 - $2,450', 'https://www.diehlsteel.com', 'Useful for mold and tool steel with tighter condition control.'),
    ];
  }
  if (group === 'aluminum' || group === 'nonferrous') {
    return [
      specialistOffer('Howard Precision', '$240 - $1,280', 'https://www.howardprecision.com', 'Strong for precision aluminum plate and cut-to-size blanks.'),
      specialistOffer('OnlineMetals', '$220 - $1,120', 'https://www.onlinemetals.com', 'Fast for odd sizes, prototypes, and quick-turn nonferrous buys.'),
    ];
  }
  return [
    specialistOffer('Alro Steel', '$260 - $1,450', 'https://www.alro.com', 'Broad stock depth for everyday steel, stainless, and production replenishment.'),
    specialistOffer('Ryerson', '$300 - $1,680', 'https://www.ryerson.com', 'Good for production stock lanes and cert-backed mill material.'),
  ];
}

function holderBrandLink(brandLabel: string) {
  const normalized = brandLabel.toLowerCase();
  if (normalized.includes('rego')) return 'https://www.rego-fix.com';
  if (normalized.includes('haimer')) return 'https://www.haimer-usa.com';
  if (normalized.includes('big')) return 'https://bigdaishowa.com';
  if (normalized.includes('sandvik')) return 'https://www.sandvik.coromant.com';
  if (normalized.includes('schunk')) return 'https://schunk.com';
  return 'https://www.mscdirect.com';
}

function holderSpecialists(holder?: HolderPackageOption) {
  const label = cleanLabel(holder?.brandLabel, holder?.brandId ?? 'Holder specialist');
  return [
    holder?.brandLabel
      ? specialistOffer(label, '$620 - $2,980', holderBrandLink(holder.brandLabel), `Direct-fit holder packages for ${label} users who want the exact family already selected in the calculator.`)
      : null,
    specialistOffer('HAIMER', '$780 - $3,200', 'https://www.haimer-usa.com', 'Strong when balance, shrink-fit, or high-accuracy finishing posture matters.'),
    specialistOffer('BIG DAISHOWA', '$740 - $3,450', 'https://bigdaishowa.com', 'Strong for Big Plus, anti-vibration, and production holder packages.'),
  ].filter((offer): offer is DistributorOffer => Boolean(offer));
}

function toolingVendorLink(vendor: string) {
  const normalized = vendor.toLowerCase();
  if (normalized.includes('sandvik')) return 'https://www.sandvik.coromant.com';
  if (normalized.includes('kennametal')) return 'https://www.kennametal.com';
  if (normalized.includes('seco')) return 'https://www.secotools.com';
  if (normalized.includes('walter')) return 'https://www.walter-tools.com';
  if (normalized.includes('iscar')) return 'https://www.iscar.com';
  if (normalized.includes('harvey')) return 'https://www.harveyperformance.com';
  if (normalized.includes('yg')) return 'https://www.yg1usa.com';
  return 'https://www.mscdirect.com';
}

function toolingSpecialists(tool?: ToolCatalogItem) {
  const vendor = cleanLabel(tool?.vendor, '');
  const offers = [
    vendor
      ? specialistOffer(vendor, '$180 - $2,980', toolingVendorLink(vendor), `Direct source for the ${vendor} cutter family already selected in the calculator.`)
      : null,
    specialistOffer('Sandvik Coromant', '$210 - $3,250', 'https://www.sandvik.coromant.com', 'Strong for broad ISO coverage, inserts, and advanced milling or turning families.'),
    specialistOffer('Seco Tools', '$190 - $2,950', 'https://www.secotools.com', 'Good fit for capability-driven inserts, cutters, and application support.'),
    specialistOffer('Walter Tools', '$220 - $3,180', 'https://www.walter-tools.com', 'Strong for finish-sensitive work and engineered tooling packages.'),
  ];
  return offers.filter((offer): offer is DistributorOffer => Boolean(offer));
}

function fixtureSpecialists() {
  return [
    specialistOffer('Jergens', '$780 - $5,900', 'https://www.jergensinc.com', 'Good for modular plates, zero-point systems, and repeatable setup packages.'),
    specialistOffer('5th Axis', '$980 - $6,800', 'https://5thaxis.com', 'Strong for self-centering vises, compact workholding, and 5-axis access.'),
    specialistOffer('Chick', '$820 - $5,200', 'https://www.chickworkholding.com', 'Strong for multi-part vises and fixture-plate productivity work.'),
    specialistOffer('LANG Technik', '$1,050 - $6,900', 'https://www.lang-technik.com', 'Useful for zero-point, stamping, and repeatable quick-change workholding.'),
  ];
}

function coolantSpecialists() {
  return [
    specialistOffer('Blaser Swisslube', '$320 - $1,280', 'https://www.blaser.com', 'Strong for process-stable coolant programs and application support.'),
    specialistOffer('QualiChem', '$280 - $1,050', 'https://www.qualichem.com', 'Useful for ferrous roughing, difficult materials, and sump-side support.'),
    specialistOffer('Master Fluid Solutions', '$260 - $1,040', 'https://www.masterfluids.com', 'Good for broad shop coverage with support around concentration and cleanliness.'),
    specialistOffer('Houghton', '$300 - $1,220', 'https://www.houghtonintl.com', 'Strong for production shops that treat coolant as a controlled process variable.'),
  ];
}

function machineOemOffers(machine?: MachineCatalogItem) {
  const manufacturer = cleanLabel(machine?.manufacturer, 'OEM');
  const normalized = manufacturer.toLowerCase();
  const href =
    normalized.includes('okuma') ? 'https://www.okuma.com' :
    normalized.includes('haas') ? 'https://www.haascnc.com' :
    normalized.includes('mazak') ? 'https://www.mazak.com' :
    normalized.includes('makino') ? 'https://www.makino.com' :
    normalized.includes('brother') ? 'https://www.brother-usa.com' :
    normalized.includes('doosan') ? 'https://www.dnsolutions.com' :
    normalized.includes('citizen') ? 'https://www.citizenmachinery.com' :
    normalized.includes('nakamura') ? 'https://www.nakamura-tome.com' :
    'https://www.grainger.com';

  return [
    specialistOffer(`${manufacturer} OEM`, '$180 - $6,500', href, `Best for exact ${manufacturer} replacement parts, service kits, and machine-specific upgrades.`),
    specialistOffer('Fastenal', '$60 - $1,250', 'https://www.fastenal.com', 'Useful for machine support hardware, pneumatics, electrical accessories, and fast service items.'),
  ];
}

export function buildMaterialCommerceView(input: {
  selection: ShellCommerceSelection;
  machine?: MachineCatalogItem;
  material?: MaterialCatalogItem;
  stockShape: string;
  stockSource: string;
}): CalculatorSectionCommerceView {
  const region = regionFromSelection(input.selection);
  const material = input.material;
  const materialName = cleanLabel(material?.name, 'Selected material');
  const machineLabel = summarizeMachine(input.machine);

  return {
    id: 'material-buy-options',
    title: `${materialName} buy options`,
    eyebrow: 'Material sourcing',
    summary: `Compare fast-availability, capability-first, and performance-first buy paths for ${materialName} on ${machineLabel}. Vendor links are biased to ${region.label} while still showing national and specialist sources.`,
    sourceLabel: `${region.label} buying lane`,
    highlights: [
      {
        id: 'material-family',
        label: 'Material family',
        value: cleanLabel(material?.subcategoryLabel, cleanLabel(material?.groupLabel, 'General stock')),
        detail: cleanLabel(material?.conditionLabel, cleanLabel(material?.hardness, 'Condition pending')),
      },
      {
        id: 'stock-posture',
        label: 'Stock posture',
        value: `${input.stockSource} · ${input.stockShape}`,
        detail: 'The buy path stays aware of whether you are replenishing crib stock or buying job-specific blanks.',
      },
      {
        id: 'machine-fit',
        label: 'Machine context',
        value: machineLabel,
        detail: 'Suggestions stay attached to the machine and cut posture already selected on the calculator.',
      },
    ],
    relatedRecords: material
      ? [
          {
            id: `${material.id}-condition`,
            label: material.name,
            detail: cleanLabel(material.note, 'Material note pending'),
            badge: material.hardness,
            note: `${cleanLabel(material.groupLabel, 'Material group')} · ${cleanLabel(material.subcategoryLabel, 'Subcategory pending')}`,
          },
        ]
      : [],
    notes: [
      'Top selling favors fast local or national availability.',
      'Best capability biases cert-backed and specialty supply for harder or more sensitive materials.',
      'Top performing favors cleaner blanks, pre-hard, or cut-to-size stock when that improves profitability on repeat work.',
    ],
    recommendations: [
      {
        id: 'material-top-selling',
        category: 'Top selling',
        title: `${materialName} regional stock lane`,
        detail: `Fastest general-purpose restock path for ${materialName}, biased toward broad availability and quick replenishment for ${machineLabel}.`,
        roiStrength: 'Availability-first ROI',
        estimatedPrice: materialRange(material, 'top-selling'),
        payback: 'Usually pays back by preventing one stock-delay or remnant mismatch',
        whyNow: `Best when the job is bottlenecked by stock availability more than specialty certs or premium blank prep. Current posture: ${input.stockSource}.`,
        distributors: blendDistributors(input.selection, materialRange(material, 'top-selling'), 'material-top-selling', materialSpecialists(material)),
      },
      {
        id: 'material-best-capability',
        category: 'Best capability',
        title: `Certified ${materialName} specialty path`,
        detail: `Best-fit path when the selected hardness, condition, or material family needs stronger cert control, better traceability, or tighter condition matching.`,
        roiStrength: 'Capability-first ROI',
        estimatedPrice: materialRange(material, 'best-capability'),
        payback: 'Recovered when specialty stock prevents scrap, tool abuse, or a failed first setup',
        whyNow: `Use this when ${materialName} behaves differently enough that commodity stock would undercut finish, tool life, or risk posture.`,
        distributors: blendDistributors(input.selection, materialRange(material, 'best-capability'), 'material-best-capability', materialSpecialists(material)),
      },
      {
        id: 'material-top-performing',
        category: 'Top performing',
        title: `${materialName} production-ready blank package`,
        detail: `Biases the buy path toward cut-to-size, cleaner, or better-conditioned stock that shortens setup and improves throughput on repeat work.`,
        roiStrength: 'Throughput-first ROI',
        estimatedPrice: materialRange(material, 'top-performing'),
        payback: 'Often recovered inside a few repeat jobs through shorter prep and cleaner first-pass results',
        whyNow: `Best when the same material family shows up often enough that better blanks are more profitable than cheaper stock.`,
        distributors: blendDistributors(input.selection, materialRange(material, 'top-performing'), 'material-top-performing', materialSpecialists(material)),
      },
    ],
  };
}

export function buildHolderCommerceView(input: {
  selection: ShellCommerceSelection;
  machine?: MachineCatalogItem;
  holderPackage?: HolderPackageOption | null;
  holderSelectionLabel: string;
  toolpathLabel?: string;
}): CalculatorSectionCommerceView {
  const region = regionFromSelection(input.selection);
  const holderLabel = cleanLabel(input.holderPackage?.label, 'Selected holder package');
  const interfaceLabel = cleanLabel(
    input.holderPackage?.spindleInterface ?? input.holderPackage?.toolInterface,
    cleanLabel(input.machine?.toolingLayout?.interface, 'Machine standard interface'),
  );

  return {
    id: 'holder-buy-options',
    title: `${holderLabel} buy options`,
    eyebrow: 'Tool holder sourcing',
    summary: `Compare fast replacement, capability-first, and performance-first holder paths for ${holderLabel}. All options are constrained to the current machine-side interface and ${region.label} sourcing lane.`,
    sourceLabel: `${region.label} holder sourcing`,
    highlights: [
      {
        id: 'holder-interface',
        label: 'Interface',
        value: interfaceLabel,
        detail: 'The buy path stays attached to the active spindle, turret, or live-tool package.',
      },
      {
        id: 'holder-machine',
        label: 'Machine package',
        value: summarizeMachine(input.machine),
        detail: 'Unsupported holder interfaces are intentionally kept out of the ranked buy path.',
      },
      {
        id: 'holder-toolpath',
        label: input.holderSelectionLabel,
        value: holderLabel,
        detail: cleanLabel(input.toolpathLabel, 'General-purpose setup posture'),
      },
    ],
    notes: [
      'Top selling is the safest fast replacement path.',
      'Best capability favors tighter runout, balance, or specialty clamping.',
      'Top performing favors holder packages that support more aggressive production posture on this machine.',
    ],
    recommendations: [
      {
        id: 'holder-top-selling',
        category: 'Top selling',
        title: `${interfaceLabel} everyday replacement holder`,
        detail: `Fast replacement path when you need a compatible holder that matches the active machine package without changing the rest of the setup.`,
        roiStrength: 'Availability-first ROI',
        estimatedPrice: '$320 - $1,480',
        payback: 'Recovered by avoiding one delayed setup or one unplanned holder scramble',
        whyNow: 'Best when the current setup already works and the main risk is holder availability, not capability ceiling.',
        distributors: blendDistributors(input.selection, '$320 - $1,480', 'holder-top-selling', holderSpecialists(input.holderPackage ?? undefined)),
      },
      {
        id: 'holder-best-capability',
        category: 'Best capability',
        title: `${interfaceLabel} high-accuracy holder path`,
        detail: `Stronger fit when finish, balance, reach, or rigidity matter more than lowest price and the active machine can use the extra capability.`,
        roiStrength: 'Capability-first ROI',
        estimatedPrice: '$680 - $2,950',
        payback: 'Recovered when improved runout, balance, or stability lowers scrap and finish rework',
        whyNow: `Use this when the selected toolpath or machine package is being held back by a general-purpose holder.`,
        distributors: blendDistributors(input.selection, '$680 - $2,950', 'holder-best-capability', holderSpecialists(input.holderPackage ?? undefined)),
      },
      {
        id: 'holder-top-performing',
        category: 'Top performing',
        title: `${interfaceLabel} production holder package`,
        detail: `Best when the same holder family shows up repeatedly and a stronger production package will let the machine run cleaner or harder.`,
        roiStrength: 'Throughput-first ROI',
        estimatedPrice: '$920 - $3,850',
        payback: 'Often recovered inside a few repeat production runs through cleaner cycle-time and tool-life behavior',
        whyNow: `Best when ${cleanLabel(input.toolpathLabel, 'the current setup')} is repeat work, not a one-off prove-out.`,
        distributors: blendDistributors(input.selection, '$920 - $3,850', 'holder-top-performing', holderSpecialists(input.holderPackage ?? undefined)),
      },
    ],
  };
}

export function buildToolingCommerceView(input: {
  selection: ShellCommerceSelection;
  machine?: MachineCatalogItem;
  material?: MaterialCatalogItem;
  tool?: ToolCatalogItem;
  toolpathLabel?: string;
  selectedInsertLabel?: string;
  toolConstructionLabel: string;
}): CalculatorSectionCommerceView {
  const region = regionFromSelection(input.selection);
  const toolLabel = cleanLabel(input.tool?.label, 'Selected tool');
  const toolFamily = cleanLabel(input.tool?.family, 'Tool family');
  const insertLabel = cleanLabel(input.selectedInsertLabel, input.tool?.insertType ?? 'Solid body');

  return {
    id: 'tooling-buy-options',
    title: `${toolLabel} buy options`,
    eyebrow: 'Tooling sourcing',
    summary: `Compare fast restock, capability-first, and production-performance tooling paths for ${toolLabel}. Recommendations stay tied to ${cleanLabel(input.toolpathLabel, 'the active toolpath')} on ${summarizeMachine(input.machine)}.`,
    sourceLabel: `${region.label} tooling lane`,
    highlights: [
      {
        id: 'tool-family',
        label: 'Tool family',
        value: toolFamily,
        detail: input.toolConstructionLabel,
      },
      {
        id: 'insert-family',
        label: 'Insert / edge package',
        value: insertLabel,
        detail: cleanLabel(input.material?.name, 'Material pending'),
      },
      {
        id: 'toolpath-context',
        label: 'Operation context',
        value: cleanLabel(input.toolpathLabel, 'General-purpose toolpath'),
        detail: 'The buy path stays aware of the toolpath family instead of surfacing unrelated cutters.',
      },
    ],
    notes: [
      'Top selling biases broad stock and easy restock.',
      'Best capability favors cutters or inserts that expand what the current machine/toolpath can do.',
      'Top performing biases cycle-time, tool life, and repeat-part profitability.',
    ],
    recommendations: [
      {
        id: 'tooling-top-selling',
        category: 'Top selling',
        title: `${toolFamily} fast-restock path`,
        detail: `Fastest broad-availability path for the selected cutter family so you can replace or add capacity without redesigning the setup.`,
        roiStrength: 'Availability-first ROI',
        estimatedPrice: '$140 - $1,320',
        payback: 'Recovered by preventing one tooling delay or edge-out stop',
        whyNow: 'Best when the current tool family is already the right one and the main risk is stock-out, not capability gap.',
        distributors: blendDistributors(input.selection, '$140 - $1,320', 'tooling-top-selling', toolingSpecialists(input.tool)),
      },
      {
        id: 'tooling-best-capability',
        category: 'Best capability',
        title: `${toolFamily} capability-upgrade package`,
        detail: `Best when ${cleanLabel(input.toolpathLabel, 'this operation')} is being limited by edge prep, geometry, insert quality, or a cutter family that is too generic for ${cleanLabel(input.material?.name, 'the active material')}.`,
        roiStrength: 'Capability-first ROI',
        estimatedPrice: '$260 - $2,650',
        payback: 'Recovered when the upgraded cutter path prevents slow feeds, finish misses, or excessive wear',
        whyNow: 'Use this when the calculator is signaling that a better cutter or insert would unlock cleaner numbers on the current machine.',
        distributors: blendDistributors(input.selection, '$260 - $2,650', 'tooling-best-capability', toolingSpecialists(input.tool)),
      },
      {
        id: 'tooling-top-performing',
        category: 'Top performing',
        title: `${toolFamily} production-performance package`,
        detail: `Best when the same job family repeats enough that a stronger cutter and insert package will pay back through tool life, cycle time, or finish consistency.`,
        roiStrength: 'Throughput-first ROI',
        estimatedPrice: '$420 - $3,450',
        payback: 'Often recovered inside a few repeat runs through better cost-per-edge and cycle-time reduction',
        whyNow: 'Use this when the selected machine, material, and toolpath point to a known production tool family instead of a generic starter cutter.',
        distributors: blendDistributors(input.selection, '$420 - $3,450', 'tooling-top-performing', toolingSpecialists(input.tool)),
      },
    ],
  };
}

export function buildFixtureCommerceView(input: {
  selection: ShellCommerceSelection;
  machine?: MachineCatalogItem;
  workholdingLabel: string;
  presetLabel?: string;
  stabilityLabel: string;
}): CalculatorSectionCommerceView {
  const region = regionFromSelection(input.selection);
  const presetLabel = cleanLabel(input.presetLabel, input.workholdingLabel);

  return {
    id: 'fixture-buy-options',
    title: `${presetLabel} buy options`,
    eyebrow: 'Workholding + fixture sourcing',
    summary: `Compare fast-availability, capability-first, and production-performance workholding paths for ${presetLabel}. Recommendations stay tied to ${summarizeMachine(input.machine)} and the current stability posture.`,
    sourceLabel: `${region.label} fixture lane`,
    highlights: [
      {
        id: 'fixture-family',
        label: 'Fixture family',
        value: input.workholdingLabel,
        detail: 'The buy path follows the active workholding family, not generic accessories.',
      },
      {
        id: 'fixture-preset',
        label: 'Saved preset',
        value: presetLabel,
        detail: input.stabilityLabel,
      },
      {
        id: 'fixture-machine',
        label: 'Machine context',
        value: summarizeMachine(input.machine),
        detail: 'Repeatability suggestions stay aware of the current machine package.',
      },
    ],
    notes: [
      'Top selling is the easiest way to replace or extend an existing setup family.',
      'Best capability favors modular, zero-point, or better-access workholding.',
      'Top performing favors repeatability and setup-time reduction on recurring work.',
    ],
    recommendations: [
      {
        id: 'fixture-top-selling',
        category: 'Top selling',
        title: `${input.workholdingLabel} replacement path`,
        detail: `Fastest way to buy more of the current workholding family without changing the setup logic already selected in the calculator.`,
        roiStrength: 'Availability-first ROI',
        estimatedPrice: '$420 - $2,950',
        payback: 'Recovered by avoiding one fixture delay or reuse bottleneck',
        whyNow: 'Best when the active workholding family is already correct and the shop just needs capacity or spares.',
        distributors: blendDistributors(input.selection, '$420 - $2,950', 'fixture-top-selling', fixtureSpecialists()),
      },
      {
        id: 'fixture-best-capability',
        category: 'Best capability',
        title: `${input.workholdingLabel} capability-upgrade path`,
        detail: `Best when the job would benefit from better access, better repeatability, or a more modular workholding platform than the current baseline.`,
        roiStrength: 'Capability-first ROI',
        estimatedPrice: '$980 - $5,900',
        payback: 'Recovered when modularity or access prevents re-setup, probing drift, or feature compromises',
        whyNow: `Use this when ${presetLabel} is good enough for now but the workholding is clearly capping what the machine can do.`,
        distributors: blendDistributors(input.selection, '$980 - $5,900', 'fixture-best-capability', fixtureSpecialists()),
      },
      {
        id: 'fixture-top-performing',
        category: 'Top performing',
        title: `${input.workholdingLabel} production repeatability package`,
        detail: `Best when recurring parts justify a stronger fixture system because setup time and repeatability are the real profitability levers.`,
        roiStrength: 'Throughput-first ROI',
        estimatedPrice: '$1,450 - $8,200',
        payback: 'Often recovered over repeated setups through lower setup time and better reuse',
        whyNow: 'Use this when better workholding is a more profitable upgrade than simply buying more tooling.',
        distributors: blendDistributors(input.selection, '$1,450 - $8,200', 'fixture-top-performing', fixtureSpecialists()),
      },
    ],
  };
}

export function buildCoolantCommerceView(input: {
  selection: ShellCommerceSelection;
  machine?: MachineCatalogItem;
  coolantLabel: string;
  recommendedCoolantLabel: string;
  rationale: string;
  material?: MaterialCatalogItem;
  toolpathLabel?: string;
  toolLabel?: string;
}): CalculatorSectionCommerceView {
  const region = regionFromSelection(input.selection);

  return {
    id: 'coolant-buy-options',
    title: `${input.coolantLabel} coolant buy options`,
    eyebrow: 'Coolant + process support sourcing',
    summary: `Compare fast-restock, capability-first, and process-performance coolant paths for ${cleanLabel(input.material?.name, 'the current material')} on ${summarizeMachine(input.machine)}. The buy path stays attached to ${cleanLabel(input.toolpathLabel, 'the active operation')} and the selected tooling posture.`,
    sourceLabel: `${region.label} coolant lane`,
    highlights: [
      {
        id: 'coolant-active',
        label: 'Active coolant',
        value: input.coolantLabel,
        detail: input.rationale,
      },
      {
        id: 'coolant-recommended',
        label: 'Recommended posture',
        value: input.recommendedCoolantLabel,
        detail: cleanLabel(input.toolLabel, 'Tool pending'),
      },
      {
        id: 'coolant-machine',
        label: 'Machine context',
        value: summarizeMachine(input.machine),
        detail: 'Recommendations stay aware of machine-side coolant capability and the current operation.',
      },
    ],
    notes: [
      'Top selling favors fast replenishment and broad availability.',
      'Best capability favors application support, cleanliness, and process-specific chemistry.',
      'Top performing favors finish, tool life, and stable production behavior when coolant is a real process variable.',
    ],
    recommendations: [
      {
        id: 'coolant-top-selling',
        category: 'Top selling',
        title: `${input.coolantLabel} replenishment pack`,
        detail: 'Fastest restock path when the coolant choice is already correct and the shop mainly needs immediate availability.',
        roiStrength: 'Availability-first ROI',
        estimatedPrice: '$180 - $780',
        payback: 'Recovered by preventing one sump-related stop or concentration scramble',
        whyNow: 'Best when the coolant strategy is sound but the shop needs quick replenishment, filters, or support consumables.',
        distributors: blendDistributors(input.selection, '$180 - $780', 'coolant-top-selling', coolantSpecialists()),
      },
      {
        id: 'coolant-best-capability',
        category: 'Best capability',
        title: `${input.recommendedCoolantLabel} capability package`,
        detail: `Best when the current cut would benefit from a better chemistry, cleaner fluid management, or stronger application support than a generic coolant posture can provide.`,
        roiStrength: 'Capability-first ROI',
        estimatedPrice: '$320 - $1,280',
        payback: 'Recovered when better coolant behavior protects finish, evacuation, or tool life on this operation',
        whyNow: `Use this when PRISM is recommending ${input.recommendedCoolantLabel} and you want the supporting package to match.`,
        distributors: blendDistributors(input.selection, '$320 - $1,280', 'coolant-best-capability', coolantSpecialists()),
      },
      {
        id: 'coolant-top-performing',
        category: 'Top performing',
        title: `${input.recommendedCoolantLabel} process-control package`,
        detail: `Best when the operation repeats often enough that coolant health, filtration, and process support materially affect profitability.`,
        roiStrength: 'Throughput-first ROI',
        estimatedPrice: '$480 - $1,950',
        payback: 'Often recovered through more stable tool life, finish, and reduced machine intervention',
        whyNow: 'Use this when coolant is not just a consumable, but a controlled part of process capability.',
        distributors: blendDistributors(input.selection, '$480 - $1,950', 'coolant-top-performing', coolantSpecialists()),
      },
    ],
  };
}

export function buildMachinePartsCommerceView(input: {
  selection: ShellCommerceSelection;
  machine?: MachineCatalogItem;
  controllerLabel?: string;
  spindleLabel?: string;
  parts: PartSummaryRecord[];
}): CalculatorSectionCommerceView {
  const region = regionFromSelection(input.selection);
  const machineLabel = summarizeMachine(input.machine);
  const relatedRecords = input.parts.slice(0, 6).map((part) => ({
    id: part.id,
    label: cleanLabel(part.name, part.part_number),
    detail: cleanLabel(part.description, cleanLabel(part.material_name, 'Internal part record')),
    badge: cleanLabel(part.current_revision, cleanLabel(part.status, 'Part record')),
    note: cleanLabel(part.part_number, 'Part number pending'),
  }));

  return {
    id: 'machine-parts-options',
    title: `${machineLabel} service parts`,
    eyebrow: 'Machine service + replacement buying',
    summary: `Use the selected machine package to compare fast-service, OEM-capability, and uptime-first buy paths. Internal part records are surfaced when the parts database has matches for ${machineLabel}.`,
    sourceLabel: `${region.label} service lane`,
    highlights: [
      {
        id: 'machine-model',
        label: 'Machine package',
        value: machineLabel,
        detail: cleanLabel(input.controllerLabel, 'Controller pending'),
      },
      {
        id: 'machine-spindle',
        label: 'Spindle package',
        value: cleanLabel(input.spindleLabel, 'Spindle pending'),
        detail: 'Service recommendations stay tied to the active machine hardware package.',
      },
      {
        id: 'machine-parts-db',
        label: 'Parts database',
        value: input.parts.length ? `${input.parts.length} related records` : 'No direct internal matches',
        detail: 'The button uses the parts database first, then falls back to generic service recommendations.',
      },
    ],
    relatedRecords,
    notes: [
      'Top selling favors quick service items and common support components.',
      'Best capability favors OEM-direct and machine-specific parts.',
      'Top performing favors uptime kits that reduce repeat downtime and support production continuity.',
    ],
    recommendations: [
      {
        id: 'machine-parts-top-selling',
        category: 'Top selling',
        title: `${machineLabel} fast-service kit`,
        detail: 'Fast path for common electrical, coolant, air, and support items that cause frequent downtime when they are missing.',
        roiStrength: 'Availability-first ROI',
        estimatedPrice: '$180 - $1,240',
        payback: 'Recovered by preventing one service delay or lost shift handoff',
        whyNow: 'Best when the machine is healthy but the shop needs the common recovery items on hand.',
        distributors: blendDistributors(input.selection, '$180 - $1,240', 'machine-parts-top-selling', machineOemOffers(input.machine)),
      },
      {
        id: 'machine-parts-best-capability',
        category: 'Best capability',
        title: `${machineLabel} OEM capability path`,
        detail: 'Best when the repair or upgrade needs exact machine-fit parts, OEM support, or control-specific service items.',
        roiStrength: 'Capability-first ROI',
        estimatedPrice: '$620 - $4,900',
        payback: 'Recovered when exact-fit parts prevent repeated service calls or misfit replacements',
        whyNow: 'Use this when generic substitutes would be risky for the active machine package.',
        distributors: blendDistributors(input.selection, '$620 - $4,900', 'machine-parts-best-capability', machineOemOffers(input.machine)),
      },
      {
        id: 'machine-parts-top-performing',
        category: 'Top performing',
        title: `${machineLabel} uptime kit`,
        detail: 'Best when the machine is central to repeat work and downtime prevention is worth buying as a planned package instead of ad hoc replacement.',
        roiStrength: 'Uptime-first ROI',
        estimatedPrice: '$980 - $6,500',
        payback: 'Often recovered through avoided downtime on just a few production interruptions',
        whyNow: 'Use this when the machine is a throughput bottleneck and uptime has stronger leverage than lowest purchase price.',
        distributors: blendDistributors(input.selection, '$980 - $6,500', 'machine-parts-top-performing', machineOemOffers(input.machine)),
      },
    ],
  };
}

export function buildMachineAlarmCommerceView(input: {
  selection: ShellCommerceSelection;
  machine?: MachineCatalogItem;
  workspace: AlarmCommerceWorkspace;
}): CalculatorSectionCommerceView {
  const region = regionFromSelection(input.selection);

  return {
    id: 'machine-alarm-options',
    title: `${summarizeMachine(input.machine)} alarm support`,
    eyebrow: 'Alarm recovery + support buying',
    summary: input.workspace.summary,
    sourceLabel: `${region.label} alarm recovery lane`,
    highlights: [
      {
        id: 'alarm-machine',
        label: 'Machine package',
        value: summarizeMachine(input.machine),
        detail: 'Alarm recovery stays attached to the machine package already selected on the calculator.',
      },
      {
        id: 'alarm-repair-tracks',
        label: 'Repair tracks',
        value: `${input.workspace.repairTracks.length} recovery tracks`,
        detail: 'Tracks come from the alarm-commerce workspace rather than generic calculator copy.',
      },
      {
        id: 'alarm-related-parts',
        label: 'Related parts',
        value: `${input.workspace.relatedParts.length} support items`,
        detail: 'The alarm button exposes related parts and buy-path recommendations in one place.',
      },
    ],
    relatedRecords: input.workspace.relatedParts.map((part) => ({
      id: part.id,
      label: part.label,
      detail: part.usageNote,
      badge: part.category,
      priceLabel: part.priceLabel,
      note: part.stockNote,
    })),
    notes: input.workspace.repairTracks.map((track) => `${track.title}: ${track.detail}`),
    recommendations: input.workspace.recommendations.map((recommendation) => ({
      ...recommendation,
      distributors: dedupeOffers(recommendation.distributors),
    })),
  };
}
