import type { PlatformLearningSnapshot } from './contracts';

export const PLATFORM_LEARNING_SNAPSHOT: PlatformLearningSnapshot = {
  shopProfile: {
    shopLabel: 'Digital Storm Precision',
    specialization: 'Low-volume aerospace, medical, and tight-tolerance milling/turning',
    autonomyPosture: 'Shop-specific playbooks are adapting to actual routing, tooling, and labor behavior.',
    adaptationScore: '87% local fit',
    policyNote:
      'Private shop behavior stays tenant-scoped first; only approved pattern deltas and anonymized outcomes should graduate into the broader network-learning layer.',
    captures: [
      {
        id: 'capture-shop-jobs',
        label: 'Job execution loop',
        scope: 'shop',
        status: 'live',
        detail: 'Traveler scans, hot jobs, labor starts/stops, quantity actuals, and release posture train what this shop really prioritizes.',
        coverage: 'Jobs, scheduling, floor clock, employee shell',
      },
      {
        id: 'capture-shop-quote',
        label: 'Quote accuracy loop',
        scope: 'hybrid',
        status: 'warming',
        detail: 'Actual cycle time, tooling wear, setup burden, and expedite pressure should refine the next quote instead of dying inside one job.',
        coverage: 'Program release, quote builder, job profitability',
      },
      {
        id: 'capture-shop-knowledge',
        label: 'Knowledge capture loop',
        scope: 'shop',
        status: 'planned',
        detail: 'Document learning, tribal knowledge, and operator handoffs should continuously harden shop-specific recommendations.',
        coverage: 'Learning dashboard, document learning, employee shell',
      },
    ],
    improvements: [
      {
        id: 'improvement-shop-routing',
        title: 'Routing suggestions should adapt by department reality',
        source: 'shop',
        detail: 'As this shop changes machines, people, and setup families, PRISM should reprioritize sequences and dispatch rules to match actual flow.',
        impact: 'Better due-date confidence and less planner rework',
      },
      {
        id: 'improvement-shop-tooling',
        title: 'Tooling and holder recommendations should self-calibrate',
        source: 'hybrid',
        detail: 'Approved local outcomes should sharpen speeds/feeds, holder choice, and setup-sheet defaults for this exact machine mix.',
        impact: 'Faster setup and lower scrap risk',
      },
    ],
  },
  networkProfile: {
    participatingShops: '24 opt-in shops',
    promotedRecipes: '61 promoted playbooks',
    safeSharePolicy: 'Aggregate pattern deltas only, never raw customer-sensitive packets or private business records.',
    captureCoverage: 'Materials, cycle variance, tooling outcomes, DFM findings, planner heuristics',
    captures: [
      {
        id: 'capture-network-process',
        label: 'Cross-shop process intelligence',
        scope: 'network',
        status: 'warming',
        detail: 'Opt-in shops can feed anonymized process outcomes so PRISM learns what setup families, tooling packages, and scheduling responses work best across environments.',
        coverage: 'Quoting, process planning, scheduling, tool life',
      },
      {
        id: 'capture-network-dfm',
        label: 'Cross-shop DFM and release intelligence',
        scope: 'network',
        status: 'planned',
        detail: 'Recurring DFM traps, setup-sheet pitfalls, and simulation misses should become shared warnings once they are scrubbed and generalized.',
        coverage: 'Print to CNC, document learning, quote review',
      },
    ],
    improvements: [
      {
        id: 'improvement-network-market',
        title: 'Shared market and tooling signals should improve quoting',
        source: 'network',
        detail: 'Aggregated material volatility, tooling burden, and process success rates should sharpen business posture without exposing another shop’s private numbers.',
        impact: 'More resilient quoting and better investment visibility',
      },
      {
        id: 'improvement-network-skill',
        title: 'Learning content should evolve from real shop outcomes',
        source: 'hybrid',
        detail: 'When multiple shops solve the same setup or quality issue, the learning system should promote that pattern into coursework, hints, and operator guidance.',
        impact: 'Faster onboarding and stronger retention',
      },
    ],
  },
  rolloutActions: [
    'Keep every new workflow, engine, and data surface represented in the learning layer so SVI does not drift behind platform reality.',
    'Let each shop tune recommendations locally first, then promote only privacy-safe deltas into the network layer after validation.',
    'Surface learning posture on command-center, employee, planning, and release desks so adaptation is visible instead of hidden in one academy module.',
  ],
};
