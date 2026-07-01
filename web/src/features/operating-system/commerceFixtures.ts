import type {
  AlarmCommerceWorkspace,
  CommerceRegion,
  DistributorOffer,
  ProgramReleaseInput,
  PurchaseRecommendation,
  ShellCommerceCatalog,
  ShellCommerceSelection,
} from './contracts';
import { PROGRAM_RELEASE_CATALOG } from './programReleaseFixtures';

export const DEFAULT_SHELL_COMMERCE_SELECTION: ShellCommerceSelection = {
  unitSystem: 'inch',
  tierId: 'standard',
  addOnIds: ['distributor-sourcing'],
  regionId: 'upper-midwest',
};

export const SHELL_COMMERCE_CATALOG: ShellCommerceCatalog = {
  tiers: [
    {
      id: 'free',
      label: 'Free',
      shortLabel: 'Free',
      priceLabel: '$0 / month',
      summary:
        'A permanent entry tier for shops that just want PRISM quoting with the advanced calculator, but only through basic generic machine, tooling, and material libraries.',
      roiNote:
        'Designed to get estimators and owner-operators into PRISM fast without forcing a subscription before the calculator proves its value.',
      purchaseLabel: 'Start free',
      features: [
        '1 office login + limited saved estimating history',
        'Advanced calculator engine with generic tooling, holders, and machine assumptions',
        'Basic material library, simple what-if comparisons, and quote exports',
        'No custom shop libraries, no release desk, and no shop-floor workflow',
      ],
      tone: 'slate',
    },
    {
      id: 'starter',
      label: 'Starter',
      shortLabel: 'Starter',
      priceLabel: '$149 / month · 1 site',
      summary:
        'The full calculator tier for a small shop that wants all PRISM estimating depth before committing to the full operating-system rollout.',
      roiNote:
        'Priced to sit above niche quoting utilities while still being an easy upgrade from spreadsheets or one-off calculator tools.',
      purchaseLabel: 'Buy Starter',
      features: [
        '3 office seats focused on quoting, programming, and ownership',
        'Full calculator suite: Studio, Toolpath Advisor, What-If, and Post Processor access',
        'Custom machine, tooling, holder, and process libraries for your own shop',
        'Saved quote intelligence, parameter presets, and richer quote comparison history',
      ],
      tone: 'sky',
    },
    {
      id: 'essentials',
      label: 'Essentials',
      shortLabel: 'Essentials',
      priceLabel: '$249 / month · 1 site',
      summary: 'Core quoting, jobs, alarms, and inventory visibility for a smaller shop that is ready to move beyond calculator-only work.',
      roiNote:
        'Bridges the gap between quote-only adoption and a true connected shop rollout without forcing a jump straight to the heavier production tier.',
      purchaseLabel: 'Buy Essentials',
      features: [
        '5 office seats + unlimited operator scan accounts',
        'Everything in Starter plus jobs, alarms, and hot-job visibility',
        'Basic print intake, traveler visibility, and inventory overview',
        'Standard reporting, document registry, and messages',
        'Good fit for a single-site shop still growing into formal scheduling and release control',
      ],
      tone: 'amber',
    },
    {
      id: 'standard',
      label: 'Standard',
      shortLabel: 'Standard',
      priceLabel: '$749 / month · 1 site',
      summary: 'The balanced production tier for most shops that want one connected operating system for scheduling, release, and floor execution.',
      roiNote: 'Priced closer to a real manufacturing stack while still undercutting the combined cost of separate MRP, inventory, and maintenance tools.',
      purchaseLabel: 'Buy Standard',
      features: [
        '10 office seats + unlimited operator scan accounts',
        'Everything in Essentials plus scheduling, dispatch, and employee shell',
        'Program release desk, traveler QR handoff, and role-aware work queues',
        'Receiving queue, department routing, and PO-based inventory intake',
      ],
      tone: 'violet',
    },
    {
      id: 'professional',
      label: 'Professional',
      shortLabel: 'Pro',
      priceLabel: '$1,499 / month · 1 site',
      summary: 'Advanced workflow, programming governance, tooling lifecycle, and cost intelligence for multi-cell shops.',
      roiNote: 'Where PRISM starts to replace multiple higher-cost point tools by tying programming, inventory, and margin feedback together.',
      purchaseLabel: 'Buy Professional',
      features: [
        '20 office seats + unlimited operator scan accounts',
        'Everything in Standard plus advanced release governance, DFM review, and purchase recommendations',
        'Document-driven inventory population and part-number extraction',
        'Tooling lifecycle, insert indexing, and cross-desk cost analytics',
      ],
      tone: 'rose',
    },
    {
      id: 'enterprise',
      label: 'Enterprise',
      shortLabel: 'Enterprise',
      priceLabel: 'Custom · multi-site',
      summary: 'Full multi-site rollout, governance, advanced integrations, and cross-shop operational learning.',
      roiNote: 'Built for larger organizations that need policy, API, rollout, and network-level learning control across multiple facilities.',
      purchaseLabel: 'Talk to PRISM',
      features: [
        'Everything in Professional across multiple sites',
        'Advanced entitlements, SSO, and policy controls',
        'Cross-shop learning rollout and enterprise integrations',
        'Custom onboarding, migration, and rollout governance',
      ],
      tone: 'amber',
    },
  ],
  addOns: [
    {
      id: 'distributor-sourcing',
      label: 'Distributor sourcing',
      priceLabel: '$99 / month',
      summary: 'Surface national and local distributor buy options directly inside jobs, alarms, release, and inventory workflows.',
      roiNote: 'Useful when sourcing delay is more expensive than the software fee because operators or programmers are blocked waiting on a buy path.',
      category: 'Commerce',
      tone: 'sky',
    },
    {
      id: 'machine-investment-roi',
      label: 'Machine investment ROI',
      priceLabel: '$149 / month',
      summary: 'Adds machine investment posture, payback ranking, and capability-gap signals into recommendations.',
      roiNote: 'Strong when the shop is deciding whether tooling, fixturing, or a new machine is the highest-return move.',
      category: 'Finance',
      tone: 'emerald',
    },
    {
      id: 'coolant-intelligence',
      label: 'Coolant intelligence',
      priceLabel: '$79 / month',
      summary: 'Tracks coolant, filtration, concentration, and maintenance posture inside alarms, jobs, and release recommendations.',
      roiNote: 'Pays back quickly when coolant condition creates recurring downtime, tool-life variance, or finish drift.',
      category: 'Shop floor',
      tone: 'amber',
    },
    {
      id: 'fixture-library',
      label: 'Fixture library',
      priceLabel: '$119 / month',
      summary: 'Keeps reusable fixture packs, setup sheets, and workholding recommendations visible across jobs and release packets.',
      roiNote: 'Best when repeat setups and modular workholding are part of the business model and setup time is a measurable constraint.',
      category: 'Programming',
      tone: 'violet',
    },
    {
      id: 'document-intake',
      label: 'Document intake + inventory population',
      priceLabel: '$149 / month + usage',
      summary: 'Convert purchase orders, delivery orders, tooling invoices, and machine packets into structured shop inventory data.',
      roiNote: 'Benchmarked closer to document-automation products because it removes manual receiving and part-number entry work.',
      category: 'Inventory',
      tone: 'emerald',
    },
    {
      id: 'tooling-lifecycle',
      label: 'Tooling lifecycle + insert indexing',
      priceLabel: '$199 / month',
      summary: 'Track checkout, active usage, insert indexing, and cost-per-edge or cost-per-part for tooling across the floor.',
      roiNote: 'Strong ROI when tooling spend, edge life, and quote accuracy are worth treating as one connected system.',
      category: 'Tooling',
      tone: 'rose',
    },
  ],
  regions: [
    {
      id: 'northeast',
      label: 'Northeast',
      detail: 'Bias sourcing toward New England and nearby industrial lanes where short-haul freight and fast branch coverage matter.',
      localLabel: 'Northeast local distributors',
      groupLabel: 'East Coast',
      statesLabel: 'ME, NH, VT, MA, RI, CT',
    },
    {
      id: 'mid-atlantic',
      label: 'Mid-Atlantic',
      detail: 'Use the dense New York, New Jersey, Pennsylvania, Maryland, and Virginia manufacturing corridor for faster sourcing choices.',
      localLabel: 'Mid-Atlantic local distributors',
      groupLabel: 'East Coast',
      statesLabel: 'NY, NJ, PA, DE, MD, DC, VA',
    },
    {
      id: 'upper-midwest',
      label: 'Upper Midwest',
      detail: 'Bias local supplier options toward Wisconsin, Illinois, Minnesota, and surrounding machine-shop distribution lanes.',
      localLabel: 'Upper Midwest local distributors',
      groupLabel: 'Central',
      statesLabel: 'WI, IL, MN, IA, MO',
    },
    {
      id: 'great-lakes',
      label: 'Great Lakes',
      detail: 'Focus on Michigan, Ohio, Indiana, and adjacent production corridors where machine tool, automation, and maintenance supply is dense.',
      localLabel: 'Great Lakes local distributors',
      groupLabel: 'Central',
      statesLabel: 'OH, MI, IN, KY, WV',
    },
    {
      id: 'south-central',
      label: 'South Central',
      detail: 'Use Texas, Oklahoma, and nearby industrial distribution lanes for local buy options.',
      localLabel: 'South Central local distributors',
      groupLabel: 'Central',
      statesLabel: 'TX, OK, AR, LA, KS',
    },
    {
      id: 'southeast',
      label: 'Southeast',
      detail: 'Bias local sourcing toward the Carolinas, Georgia, and Tennessee manufacturing corridor.',
      localLabel: 'Southeast local distributors',
      groupLabel: 'East Coast',
      statesLabel: 'NC, SC, GA, FL, TN, AL, MS',
    },
    {
      id: 'mountain-southwest',
      label: 'Mountain Southwest',
      detail: 'Bias local options toward the Mountain and Southwest states where freight distance, branch coverage, and technical service windows matter most.',
      localLabel: 'Mountain Southwest local distributors',
      groupLabel: 'West',
      statesLabel: 'CO, UT, ID, MT, WY, ND, SD, NE, NM, AZ',
    },
    {
      id: 'west-coast',
      label: 'West Coast',
      detail: 'Surface local options that match California, Oregon, and Washington machine-tool distribution coverage.',
      localLabel: 'West Coast local distributors',
      groupLabel: 'West',
      statesLabel: 'CA, OR, WA, NV, AK, HI',
    },
  ],
  shellNote:
    'Tier, add-on, unit, and regional sourcing posture are staged through a shared frontend seam so the calculator ladder, PRISM mode, machine-feature and maintenance buys, print-to-CNC, alarm desk, inventory, and planned procurement-aware desks can all reuse the same packaging and recommendation model.',
  billingPosture: {
    source: 'staged',
    authenticated: false,
    currentPlanId: 'staged',
    currentPlanLabel: 'Staged catalog posture',
    roleLabel: 'Shop shell',
    detail:
      'The catalog is live in the shell, but subscription status and checkout posture are still staged until the billing routes are consulted successfully.',
    planPrices: [],
  },
};

const LOCAL_DISTRIBUTORS: Record<string, Array<Omit<DistributorOffer, 'locationLabel'>>> = {
  northeast: [
    {
      id: 'new-england-tool',
      name: 'New England Tooling Group',
      scope: 'local',
      priceLabel: '$0 quote request',
      etaLabel: 'Same-day callback',
      note: 'Regional source for tooling, holders, fixturing, and maintenance support across New England shops.',
      href: 'https://www.mscdirect.com',
      featured: true,
    },
    {
      id: 'northeast-process-fluids',
      name: 'Northeast Process Fluids',
      scope: 'local',
      priceLabel: '$0 consult',
      etaLabel: '1-2 day delivery',
      note: 'Regional coolant, filtration, and sump-support partner for production machining cells.',
      href: 'https://www.grainger.com',
    },
  ],
  'mid-atlantic': [
    {
      id: 'mid-atlantic-industrial',
      name: 'Mid-Atlantic Industrial Supply',
      scope: 'local',
      priceLabel: '$0 quote request',
      etaLabel: 'Same-day callback',
      note: 'Regional tooling, holder, machine support, and fixturing source for the Mid-Atlantic corridor.',
      href: 'https://www.mscdirect.com',
      featured: true,
    },
    {
      id: 'chesapeake-fluid',
      name: 'Chesapeake Fluid Support',
      scope: 'local',
      priceLabel: '$0 consult',
      etaLabel: '1-2 day delivery',
      note: 'Regional coolant, reclaim, and maintenance-fluid support with strong branch coverage.',
      href: 'https://www.grainger.com',
    },
  ],
  'upper-midwest': [
    {
      id: 'mw-tool-supply',
      name: 'Midwest Tool Supply',
      scope: 'local',
      priceLabel: '$0 quote request',
      etaLabel: 'Same-day callback',
      note: 'Local support for tooling, holders, workholding, and coolant packages.',
      href: 'https://www.mscdirect.com',
      featured: true,
    },
    {
      id: 'great-lakes-fluid',
      name: 'Great Lakes Fluid + Coolant',
      scope: 'local',
      priceLabel: '$0 consult',
      etaLabel: 'Next-day delivery',
      note: 'Regional coolant and filtration partner for concentration, sump, and reclaim issues.',
      href: 'https://www.grainger.com',
    },
  ],
  'great-lakes': [
    {
      id: 'great-lakes-tooling',
      name: 'Great Lakes Tooling Exchange',
      scope: 'local',
      priceLabel: '$0 quote request',
      etaLabel: 'Same-day callback',
      note: 'Regional tooling, holder, fixturing, and maintenance source for automotive and heavy-production corridors.',
      href: 'https://www.mscdirect.com',
      featured: true,
    },
    {
      id: 'lakefront-machine-support',
      name: 'Lakefront Machine Support',
      scope: 'local',
      priceLabel: '$0 service quote',
      etaLabel: '1-2 day dispatch',
      note: 'Regional machine support, consumables, coolant, and maintenance-response sourcing.',
      href: 'https://www.grainger.com',
    },
  ],
  'south-central': [
    {
      id: 'lone-star-tool',
      name: 'Lone Star Tooling',
      scope: 'local',
      priceLabel: '$0 quote request',
      etaLabel: 'Same-day callback',
      note: 'Texas-region tooling, holders, fixturing, and job-improvement sourcing.',
      href: 'https://www.mscdirect.com',
      featured: true,
    },
    {
      id: 'gulf-coolant',
      name: 'Gulf Process Fluids',
      scope: 'local',
      priceLabel: '$0 consult',
      etaLabel: '1-2 day delivery',
      note: 'Coolant, sump, and process-fluid recovery support for production cells.',
      href: 'https://www.grainger.com',
    },
  ],
  southeast: [
    {
      id: 'carolina-tool',
      name: 'Carolina Tool + Fixture',
      scope: 'local',
      priceLabel: '$0 quote request',
      etaLabel: 'Same-day callback',
      note: 'Regional source for holders, vises, zero-point plates, and consumables.',
      href: 'https://www.mscdirect.com',
      featured: true,
    },
    {
      id: 'atlantic-fluid',
      name: 'Atlantic Coolant Service',
      scope: 'local',
      priceLabel: '$0 consult',
      etaLabel: '1-2 day delivery',
      note: 'Regional coolant, sump-cleanout, and filtration support.',
      href: 'https://www.grainger.com',
    },
  ],
  'mountain-southwest': [
    {
      id: 'rocky-mountain-tooling',
      name: 'Rocky Mountain Tooling',
      scope: 'local',
      priceLabel: '$0 quote request',
      etaLabel: 'Same-day callback',
      note: 'Regional source for tooling, workholding, and machine-support buys across the Mountain and Southwest corridor.',
      href: 'https://www.mscdirect.com',
      featured: true,
    },
    {
      id: 'desert-process-fluids',
      name: 'Desert Process Fluids',
      scope: 'local',
      priceLabel: '$0 consult',
      etaLabel: '1-2 day delivery',
      note: 'Regional coolant, filtration, and maintenance-fluid support where freight distance matters more.',
      href: 'https://www.grainger.com',
    },
  ],
  'west-coast': [
    {
      id: 'pacific-tool',
      name: 'Pacific Tooling Group',
      scope: 'local',
      priceLabel: '$0 quote request',
      etaLabel: 'Same-day callback',
      note: 'West Coast tooling, workholding, and setup-improvement partner.',
      href: 'https://www.mscdirect.com',
      featured: true,
    },
    {
      id: 'coast-fluid',
      name: 'Coast Process Fluids',
      scope: 'local',
      priceLabel: '$0 consult',
      etaLabel: '1-2 day delivery',
      note: 'Regional coolant, reclaim, and filtration supplier for production shops.',
      href: 'https://www.grainger.com',
    },
  ],
};

export function withRegion(region: CommerceRegion, offers: Array<Omit<DistributorOffer, 'locationLabel'>>): DistributorOffer[] {
  return offers.map((offer) => ({
    ...offer,
    locationLabel: offer.scope === 'local' ? region.localLabel : offer.scope === 'manufacturer' ? 'Manufacturer direct' : 'Nationwide coverage',
  }));
}

export function nationwideOffers(priceLabel: string, detail: string): DistributorOffer[] {
  return [
    {
      id: `${detail}-msc`,
      name: 'MSC Industrial',
      scope: 'nationwide',
      locationLabel: 'Nationwide coverage',
      priceLabel,
      etaLabel: '1-3 day delivery',
      note: 'Fast national fulfillment with broad catalog depth.',
      href: 'https://www.mscdirect.com',
      featured: true,
    },
    {
      id: `${detail}-grainger`,
      name: 'Grainger',
      scope: 'nationwide',
      locationLabel: 'Nationwide coverage',
      priceLabel,
      etaLabel: 'Same-day branch pickup where available',
      note: 'Strong for maintenance, safety, fluid, and facility-adjacent items.',
      href: 'https://www.grainger.com',
    },
    {
      id: `${detail}-mcmaster`,
      name: 'McMaster-Carr',
      scope: 'nationwide',
      locationLabel: 'Nationwide coverage',
      priceLabel,
      etaLabel: 'Next-day delivery',
      note: 'Best for fast sourcing when speed matters more than negotiated pricing.',
      href: 'https://www.mcmaster.com',
    },
    {
      id: `${detail}-misumi`,
      name: 'Misumi',
      scope: 'nationwide',
      locationLabel: 'Nationwide coverage',
      priceLabel,
      etaLabel: '2-4 day delivery',
      note: 'Strong for configurable tooling, automation hardware, and fixture-side components.',
      href: 'https://us.misumi-ec.com',
    },
    {
      id: `${detail}-fastenal`,
      name: 'Fastenal',
      scope: 'nationwide',
      locationLabel: 'Nationwide coverage',
      priceLabel,
      etaLabel: 'Branch pickup or 1-3 day delivery',
      note: 'Strong for maintenance, shop-floor consumables, and machine support hardware.',
      href: 'https://www.fastenal.com',
    },
    {
      id: `${detail}-ptsolutions`,
      name: 'PTSolutions',
      scope: 'nationwide',
      locationLabel: 'Nationwide coverage',
      priceLabel,
      etaLabel: 'Application specialist quote',
      note: 'Strong for industrial tooling, abrasives, and process-support sourcing.',
      href: 'https://www.pts-tools.com',
    },
  ];
}

export function manufacturerOffer(name: string, priceLabel: string, href: string, note: string): DistributorOffer {
  return {
    id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-mfr`,
    name,
    scope: 'manufacturer',
    locationLabel: 'Manufacturer direct',
    priceLabel,
    etaLabel: 'Application engineer contact',
    note,
    href,
  };
}

export function regionFromSelection(selection: ShellCommerceSelection) {
  return (
    SHELL_COMMERCE_CATALOG.regions.find((region) => region.id === selection.regionId) ??
    SHELL_COMMERCE_CATALOG.regions[0]
  );
}

export function regionalDistributorOffers(selection: ShellCommerceSelection) {
  const region = regionFromSelection(selection);
  return withRegion(region, LOCAL_DISTRIBUTORS[region.id] ?? []);
}

export function buildProgramPurchaseRecommendations(
  input: ProgramReleaseInput & { selection: ShellCommerceSelection },
): PurchaseRecommendation[] {
  const region = regionFromSelection(input.selection);
  const machine = PROGRAM_RELEASE_CATALOG.machines.find((entry) => entry.id === input.machineId) ?? PROGRAM_RELEASE_CATALOG.machines[0];
  const toolingPackage =
    PROGRAM_RELEASE_CATALOG.toolingPackages.find((entry) => entry.id === input.toolingPackageId) ?? PROGRAM_RELEASE_CATALOG.toolingPackages[0];
  const fixture = PROGRAM_RELEASE_CATALOG.fixtures.find((entry) => entry.id === input.fixtureId) ?? PROGRAM_RELEASE_CATALOG.fixtures[0];
  const stock = PROGRAM_RELEASE_CATALOG.stockProfiles.find((entry) => entry.id === input.stockId) ?? PROGRAM_RELEASE_CATALOG.stockProfiles[0];

  return [
    {
      id: 'program-zero-point',
      title: 'Zero-point modular fixture plate',
      category: 'Fixture / workholding',
      detail: `Recommended because ${fixture.label} is already close to a repeatable multi-setup posture and ${machine.label} benefits from shorter setup loops.`,
      roiStrength: 'High ROI',
      estimatedPrice: '$3,400 - $5,900',
      payback: 'Usually pays back in 2-4 medium-volume jobs',
      whyNow: 'Moves repeat work and setup-sheet reuse forward immediately while reducing fixture drift between prove-out and release.',
      distributors: [
        ...withRegion(region, LOCAL_DISTRIBUTORS[region.id] ?? []),
        ...nationwideOffers('$3,400 - $5,900', 'zero-point'),
        manufacturerOffer('Jergens', '$4,250 list', 'https://www.jergensinc.com', 'Strong fit for modular workholding and zero-point repeatability.'),
      ],
    },
    {
      id: 'program-holder-package',
      title: `${toolingPackage.label} upgrade package`,
      category: 'Tool holder / tooling',
      detail: `Use a stronger holder and tooling stack so ${machine.controller} programming can push more aggressive, cleaner toolpaths with better collision posture.`,
      roiStrength: 'Medium-high ROI',
      estimatedPrice: '$1,250 - $2,800',
      payback: 'Typical payback inside 1-3 complex setups',
      whyNow: 'Improves cycle-time confidence, finish stability, and setup-sheet consistency for this release.',
      distributors: [
        ...withRegion(region, LOCAL_DISTRIBUTORS[region.id] ?? []),
        ...nationwideOffers('$1,250 - $2,800', 'holder-package'),
        manufacturerOffer('HAIMER', '$1,980 list', 'https://www.haimer-usa.com', 'Good fit when holder rigidity and runout control matter more than bare lowest cost.'),
      ],
    },
    {
      id: 'program-material-buffer',
      title: `${stock.material} stock and coolant buffer pack`,
      category: 'Stock / process support',
      detail: `The current stock posture leans on ${stock.source}. A matched stock-plus-process-support buffer reduces release risk if material or coolant becomes the blocker.`,
      roiStrength: input.selection.addOnIds.includes('coolant-intelligence') ? 'High ROI' : 'Medium ROI',
      estimatedPrice: '$420 - $1,650',
      payback: 'Prevents one late material or coolant-related release slip',
      whyNow: 'Best when the program is ready but the material or fluid posture is still fragile before first cut.',
      distributors: [
        ...withRegion(region, LOCAL_DISTRIBUTORS[region.id] ?? []),
        ...nationwideOffers('$420 - $1,650', 'stock-coolant'),
        manufacturerOffer('Master Fluid Solutions', '$680 list', 'https://www.masterfluids.com', 'Useful when coolant condition and process support are part of the release risk.'),
      ],
    },
  ];
}

export function buildAlarmCommerceWorkspace(input: {
  controller: string;
  code?: string;
  severity?: string;
  selection: ShellCommerceSelection;
}): AlarmCommerceWorkspace {
  const region = regionFromSelection(input.selection);
  const controllerLabel = input.controller.charAt(0).toUpperCase() + input.controller.slice(1);
  const severity = (input.severity ?? 'warning').toLowerCase();
  const codeLabel = input.code ? `alarm ${input.code}` : 'the current alarm pattern';

  const severityPosture =
    severity === 'critical'
      ? 'Stop, protect the setup, and source the recovery items before anyone rushes back into cycle.'
      : severity === 'error'
        ? 'Stage the likely recovery kit and keep the next shift from hunting for parts or process support.'
        : 'Use the decode as a signal to restock the items that usually turn warnings into real downtime.';

  return {
    summary: `${controllerLabel} ${codeLabel} should immediately surface fix guidance, related parts data, pricing, and buy paths so the operator and management know how to recover without leaving the alarm desk.`,
    repairTracks: [
      {
        id: 'alarm-track-root-cause',
        title: 'Verify the root cause before reset',
        detail: `${severityPosture} Keep screenshots, offsets, and the corrective action in the packet so the next operator inherits the full story.`,
        posture: severity === 'critical' ? 'Immediate stop' : 'Guided recovery',
      },
      {
        id: 'alarm-track-parts',
        title: 'Stage replacement and support items',
        detail: `The alarm desk should immediately surface the likely parts, coolant, fixture, or maintenance items that keep ${codeLabel} from bouncing back.`,
        posture: 'Parts + sourcing',
      },
    ],
    relatedParts: [
      {
        id: 'alarm-part-prox',
        label: `${controllerLabel} proximity / limit switch kit`,
        category: 'Electrical / sensors',
        priceLabel: '$86 - $240',
        stockNote: 'Keep one local kit on the shelf for machine-reset and overtravel events.',
        usageNote: 'Useful when hard or soft limit alarms keep repeating after manual recovery.',
      },
      {
        id: 'alarm-part-coolant',
        label: 'Coolant concentrate + refractometer pack',
        category: 'Coolant / process',
        priceLabel: '$120 - $390',
        stockNote: 'Best stocked by the sump or maintenance station.',
        usageNote: 'Useful when alarms correlate with temperature, chip evacuation, finish drift, or pump complaints.',
      },
      {
        id: 'alarm-part-fixture',
        label: 'Fixture clamp / seal service kit',
        category: 'Fixture / workholding',
        priceLabel: '$95 - $520',
        stockNote: 'Keep one service kit per high-value fixture family.',
        usageNote: 'Helpful when alarms trace back to clamp confirmation, workholding movement, or poor seating after restart.',
      },
    ],
    recommendations: [
      {
        id: 'alarm-recommend-coolant',
        title: 'Buy a coolant rescue kit',
        category: 'Coolant / process support',
        detail: `Recommended when ${codeLabel} shows up with heat, evacuation, or chip-load symptoms and the shop needs fast recovery instead of another reactive stop.`,
        roiStrength: 'High ROI',
        estimatedPrice: '$310 - $880',
        payback: 'Usually pays back after one prevented downtime event',
        whyNow: 'Stops the alarm desk from being informational only and turns it into a direct recovery path.',
        distributors: [
          ...withRegion(region, LOCAL_DISTRIBUTORS[region.id] ?? []),
          ...nationwideOffers('$310 - $880', 'alarm-coolant'),
          manufacturerOffer('Blaser Swisslube', '$540 list', 'https://www.blaser.com', 'Useful when coolant health is clearly tied to repeated alarm behavior.'),
        ],
      },
      {
        id: 'alarm-recommend-fixture',
        title: 'Buy a fixture recovery pack',
        category: 'Fixture / workholding',
        detail: `Use this when ${controllerLabel} alarms repeatedly return after setup recovery and management wants a fast buy path for clamps, seals, stops, or modular workholding upgrades.`,
        roiStrength: 'Medium-high ROI',
        estimatedPrice: '$480 - $1,950',
        payback: 'Often recovered inside a few saved setups or one prevented scrap event',
        whyNow: 'Bridges the gap between the alarm explanation and the parts needed to keep the next shift moving.',
        distributors: [
          ...withRegion(region, LOCAL_DISTRIBUTORS[region.id] ?? []),
          ...nationwideOffers('$480 - $1,950', 'alarm-fixture'),
          manufacturerOffer('Jergens', '$1,240 list', 'https://www.jergensinc.com', 'Good fit for repeat clamp or modular-fixture issues tied to machine recovery.'),
        ],
      },
    ],
  };
}
