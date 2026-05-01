import type {
  ProgramReleaseCatalog,
  ProgramReleaseChecklistItem,
  ProgramReleaseDfmFinding,
  ProgramReleaseGdtFocus,
  ProgramReleaseInput,
  ProgramReleaseOperationRecord,
  ProgramReleaseQuoteLine,
  ProgramReleaseSetupSheetSection,
  ProgramReleaseSourceComparison,
  ProgramReleaseWorkspace,
  SummaryMetricRecord,
} from './contracts';

export const PROGRAM_RELEASE_CATALOG: ProgramReleaseCatalog = {
  partClasses: [
    {
      id: 'prismatic-bracket',
      label: 'Prismatic bracket',
      detail: '2.5D or 3-axis part with datum faces, pockets, and drilled features.',
      geometryClass: 'Prismatic',
    },
    {
      id: 'hydraulic-manifold',
      label: 'Hydraulic manifold',
      detail: 'Multi-face milling package with cross-drills, seals, and fixture rotation risk.',
      geometryClass: 'Multi-face',
    },
    {
      id: 'turned-shaft',
      label: 'Turned shaft',
      detail: 'Turn-mill profile with grooves, threads, and finish diameter control.',
      geometryClass: 'Rotational',
    },
    {
      id: 'fixture-plate',
      label: 'Fixture plate',
      detail: 'Repeatable tooling plate or tombstone face needing hole-pattern and location control.',
      geometryClass: 'Plate / fixture',
    },
    {
      id: 'assembly-pack',
      label: 'Assembly pack',
      detail: 'Multiple mating parts that need compare-ready CAD and stronger collision review.',
      geometryClass: 'Assembly',
    },
  ],
  machines: [
    {
      id: 'vf2-3x',
      label: 'Haas VF-2SS',
      controller: 'Haas NGC',
      kinematics: '3-axis vertical mill',
      spindle: 'Inline 12k',
      maxRpm: 12000,
      strength: 'Balanced for aluminum and steel families',
      collisionEnvelope: 'Table + spindle nose + holder projection',
      machineRatePerHour: 105,
    },
    {
      id: 'umc-5x',
      label: 'Haas UMC-750',
      controller: 'Haas NGC',
      kinematics: '5-axis trunnion',
      spindle: 'Inline 15k',
      maxRpm: 15000,
      strength: 'High-access trunnion posture with moderate torque reserve',
      collisionEnvelope: 'Trunnion sweep + platter limits + spindle body',
      machineRatePerHour: 185,
    },
    {
      id: 'st20-turn',
      label: 'Haas ST-20Y',
      controller: 'Haas NGC',
      kinematics: 'Lathe with Y-axis and live tooling',
      spindle: 'Twin-spindle live tooling',
      maxRpm: 4000,
      strength: 'Rigid turning posture with moderate live-tool reach',
      collisionEnvelope: 'Chuck jaws + turret reach + sub-spindle handoff',
      machineRatePerHour: 145,
    },
    {
      id: 'integrex-millturn',
      label: 'Mazak Integrex',
      controller: 'Mazatrol Smooth',
      kinematics: 'Mill-turn',
      spindle: 'Dual-spindle mill-turn head',
      maxRpm: 12000,
      strength: 'High-complexity single-chuck completion posture',
      collisionEnvelope: 'B-axis head + chuck + lower turret keep-out',
      machineRatePerHour: 225,
    },
  ],
  toolholders: [
    {
      id: 'shrinkfit-short',
      label: 'Shrink-fit short gage',
      style: 'HSK shrink-fit',
      gageLength: '65 mm gage line',
      rigidity: 'High',
      note: 'Best when keeping reach minimal and holder sweep tight.',
    },
    {
      id: 'hydraulic-reach',
      label: 'Hydraulic reach package',
      style: 'CAT40 hydraulic chuck',
      gageLength: '110 mm projection',
      rigidity: 'Medium',
      note: 'Useful when wall access matters more than brute rigidity.',
    },
    {
      id: 'capto-turn',
      label: 'Capto C6 turn/mill holder',
      style: 'Capto modular',
      gageLength: 'Modular turn/mill stack',
      rigidity: 'High',
      note: 'Supports live tooling, turning inserts, and modular boring.',
    },
  ],
  toolingPackages: [
    {
      id: 'alu-velocity',
      label: 'High-velocity aluminum package',
      coverage: 'Roughing + finishing + drilling',
      note: 'Optimized for aggressive stepovers, polished flutes, and high spindle use.',
      packageCost: 210,
    },
    {
      id: 'steel-balanced',
      label: 'Balanced steel package',
      coverage: 'General steel rough/finish + holemaking',
      note: 'Good baseline when process mix matters more than peak MRR.',
      packageCost: 295,
    },
    {
      id: 'titanium-safe',
      label: 'Titanium-safe package',
      coverage: 'Deflection-aware roughing + high-reliability finishing',
      note: 'Biases tool engagement and wear posture toward reliability.',
      packageCost: 455,
    },
  ],
  fixtures: [
    {
      id: 'modular-plate',
      label: 'Modular datum plate',
      setupCount: 1,
      datumPlan: 'G54 primary face with hard-stop repeatability',
      note: 'Best for plates, brackets, and first-article setup visibility.',
      burdenCost: 95,
    },
    {
      id: 'trunnion-self-center',
      label: 'Self-centering 5-axis vise',
      setupCount: 2,
      datumPlan: 'G54/G55 split with centerline flip posture',
      note: 'Good for multi-face access and shorter holder projection.',
      burdenCost: 165,
    },
    {
      id: 'softjaw-collet',
      label: 'Soft-jaw / collet turn setup',
      setupCount: 2,
      datumPlan: 'Main spindle face + sub-spindle handoff checkpoint',
      note: 'Keeps chucking and transfer risk explicit in the setup sheet.',
      burdenCost: 135,
    },
  ],
  stockProfiles: [
    {
      id: '6061-plate',
      label: '6061 plate remnant',
      material: '6061-T6',
      size: '8.0 x 5.0 x 1.25 in',
      source: 'Remnant rack',
      marketPrice: 42,
      logisticsCost: 8,
      volatility: 'Low',
    },
    {
      id: '174-round',
      label: '17-4 round bar',
      material: '17-4PH H1150',
      size: '2.50 in x 18 in',
      source: 'Fresh buy',
      marketPrice: 126,
      logisticsCost: 18,
      volatility: 'Medium',
    },
    {
      id: 'ti-billet',
      label: 'Ti billet',
      material: 'Ti-6Al-4V',
      size: '6.0 x 4.0 x 2.5 in',
      source: 'Directed buy',
      marketPrice: 315,
      logisticsCost: 46,
      volatility: 'High',
    },
  ],
  cadSources: [
    {
      id: 'fusion-master',
      label: 'Fusion 360 master',
      status: 'preferred',
      simulationReadiness: 'Controller/post and machine simulation ready',
      note: 'Best option when Fusion can own setup generation, compare passes, and post validation.',
      securityNote: 'Use managed export and revision ids once backend storage lands.',
    },
    {
      id: 'neutral-compare',
      label: 'Neutral CAD compare',
      status: 'compare',
      simulationReadiness: 'Good for geometry compare and translation checks',
      note: 'STEP / Parasolid / IGES compare path for cross-system intake.',
      securityNote: 'Keep original file plus translated derivative together once file storage is live.',
    },
    {
      id: 'prism-native',
      label: 'PRISM native design brief',
      status: 'fallback',
      simulationReadiness: 'Needs compare pass before full release confidence',
      note: 'Use when the user wants to start design intent inside PRISM before handing off to CAD/CAM.',
      securityNote: 'Should later persist design brief + generated geometry lineage under one part revision id.',
    },
  ],
};

function fallbackCatalogSelection<T extends { id: string }>(items: T[], id: string) {
  return items.find((item) => item.id === id) ?? items[0];
}

function buildOperationPlan(input: ProgramReleaseInput): ProgramReleaseOperationRecord[] {
  const operationFamilies: Record<string, Array<{ title: string; strategy: string; machineMode: string }>> = {
    'prismatic-bracket': [
      { title: 'Datum face / stock prep', strategy: 'Face + rest roughing', machineMode: '3-axis prep' },
      { title: 'Pocket roughing', strategy: 'Adaptive roughing', machineMode: '3-axis roughing' },
      { title: 'Wall / hole finish', strategy: 'Contour + drilling finish', machineMode: '3-axis finish' },
    ],
    'hydraulic-manifold': [
      { title: 'Face + locating bores', strategy: 'Facing + drill cycle package', machineMode: 'Multi-face prep' },
      { title: 'Cross-drill manifold network', strategy: 'Indexed drilling / interpolation', machineMode: '3+2 drilling' },
      { title: 'Seal surface finish', strategy: 'Finish contour + spotface', machineMode: 'Seal finish' },
    ],
    'turned-shaft': [
      { title: 'OD rough + shoulder prep', strategy: 'OD roughing', machineMode: 'Turning rough' },
      { title: 'Groove / drill / live-tool features', strategy: 'Live-tool secondary ops', machineMode: 'Turn-mill' },
      { title: 'Finish diameters + thread', strategy: 'Finish turn + thread cycle', machineMode: 'Turning finish' },
    ],
    'fixture-plate': [
      { title: 'Plate prep', strategy: 'Face + hole prep', machineMode: 'Plate prep' },
      { title: 'Hole grid + locating features', strategy: 'Drill / bore / interpolate', machineMode: 'Holemaking' },
      { title: 'Relief and edge finish', strategy: 'Contour finish', machineMode: 'Finish pass' },
    ],
    'assembly-pack': [
      { title: 'Primary component roughing', strategy: 'Adaptive + rest roughing', machineMode: 'Primary op' },
      { title: 'Secondary mating features', strategy: 'Indexed finish + drilling', machineMode: 'Secondary op' },
      { title: 'Assembly compare validation', strategy: 'Simulation compare + clearance review', machineMode: 'Assembly review' },
    ],
  };

  const base = operationFamilies[input.partClassId] ?? operationFamilies['prismatic-bracket'];
  return base.map((operation, index) => {
    const highSpeedMachine = input.machineId === 'umc-5x' || input.machineId === 'vf2-3x';
    const titaniumBias = input.toolingPackageId === 'titanium-safe';
    const turningBias = input.machineId === 'st20-turn' || input.machineId === 'integrex-millturn';
    const cycleBase = turningBias ? 18 : highSpeedMachine ? 14 : 16;
    const cycleMinutes = cycleBase + index * 4 + (titaniumBias ? 5 : 0);
    const spindleRpm = turningBias ? 3200 + index * 450 : highSpeedMachine ? 9800 - index * 650 : 6200 - index * 450;

    return {
      id: `${input.partClassId}-op-${index + 1}`,
      code: `OP ${String((index + 1) * 10).padStart(2, '0')}`,
      title: operation.title,
      strategy: operation.strategy,
      machineMode: operation.machineMode,
      holder: input.toolholderId,
      tooling: input.toolingPackageId,
      spindleRpm,
      feedRate: turningBias ? `${0.008 + index * 0.001} in/rev` : `${180 + index * 32} ipm`,
      doc: turningBias ? `${0.08 + index * 0.02} in DOC` : `${0.25 - index * 0.03} in axial`,
      stepOver: turningBias ? 'N/A turn profile' : `${35 - index * 4}% tool dia`,
      cycleMinutes,
      rapidPosture: highSpeedMachine ? 'Tool-change and clearance moves compressed' : 'Conservative clearance retracts kept',
      collisionPosture: input.cadSourceId === 'fusion-master' ? 'Full holder/table sweep expected in verify pass' : 'Manual compare required before release',
      verificationPosture: input.cadSourceId === 'prism-native' ? 'Compare against neutral/Fusion export first' : 'Backplot + collision pass before post signoff',
    };
  });
}

function buildQuoteLines(workspace: {
  runtimeMinutes: number;
  setupMinutes: number;
  machineRate: number;
  fixtureCost: number;
  toolingCost: number;
  materialCost: number;
  logisticsCost: number;
  volatility: string;
}): ProgramReleaseQuoteLine[] {
  const machineCost = (workspace.runtimeMinutes / 60) * workspace.machineRate;
  const setupCost = (workspace.setupMinutes / 60) * workspace.machineRate + workspace.fixtureCost;
  const materialAndLogistics = workspace.materialCost + workspace.logisticsCost;
  const toolingReserve = workspace.toolingCost;
  const overhead = (machineCost + setupCost + materialAndLogistics + toolingReserve) * 0.22;
  const total = machineCost + setupCost + materialAndLogistics + toolingReserve + overhead;

  return [
    {
      id: 'machine-runtime',
      label: 'Machine runtime',
      value: `$${machineCost.toFixed(0)}`,
      detail: `${workspace.runtimeMinutes.toFixed(0)} min of planned cut time at the selected machine rate.`,
      tone: 'sky',
    },
    {
      id: 'setup-burden',
      label: 'Setup + fixture burden',
      value: `$${setupCost.toFixed(0)}`,
      detail: `${workspace.setupMinutes.toFixed(0)} min of setup plus fixture burden and prove-out posture.`,
      tone: 'amber',
    },
    {
      id: 'material-logistics',
      label: 'Material + logistics',
      value: `$${materialAndLogistics.toFixed(0)}`,
      detail: `${workspace.volatility} market posture with logistics included in the baseline.`,
      tone: workspace.volatility === 'High' ? 'rose' : 'emerald',
    },
    {
      id: 'tooling-reserve',
      label: 'Tooling reserve',
      value: `$${toolingReserve.toFixed(0)}`,
      detail: 'Consumables, holder wear posture, and replacement reserve before live calibration exists.',
      tone: 'violet',
    },
    {
      id: 'overhead-total',
      label: 'Loaded quote posture',
      value: `$${total.toFixed(0)}`,
      detail: 'Includes machine time, setup, materials, tooling reserve, and baseline business overhead.',
      tone: 'emerald',
    },
  ];
}

function buildSetupSheetSections(input: {
  machineLabel: string;
  machineController: string;
  fixtureLabel: string;
  datumPlan: string;
  toolingLabel: string;
  holderLabel: string;
  stockLabel: string;
  cadLabel: string;
  partLabel: string;
}): ProgramReleaseSetupSheetSection[] {
  return [
    {
      id: 'machine-posture',
      title: 'Machine and setup posture',
      items: [
        `${input.machineLabel} on ${input.machineController}`,
        `Fixture: ${input.fixtureLabel}`,
        `Datum plan: ${input.datumPlan}`,
      ],
    },
    {
      id: 'tooling-stack',
      title: 'Tooling stack',
      items: [
        `Tooling package: ${input.toolingLabel}`,
        `Holder posture: ${input.holderLabel}`,
        `Stock package: ${input.stockLabel}`,
      ],
    },
    {
      id: 'digital-thread',
      title: 'Digital thread',
      items: [
        `Primary CAD source: ${input.cadLabel}`,
        `Part class: ${input.partLabel}`,
        'Traveler, setup sheet, and quote should bind to the same revision packet once backend storage is live.',
      ],
    },
  ];
}

function buildChecklistItems(input: {
  cadSourceId: string;
  partClassId: string;
  collisionEnvelope: string;
  fixtureLabel: string;
}): { collision: ProgramReleaseChecklistItem[]; simulation: ProgramReleaseChecklistItem[] } {
  const assemblyRisk = input.partClassId === 'assembly-pack';
  return {
    collision: [
      {
        id: 'holder-envelope',
        label: 'Holder / spindle envelope',
        status: input.cadSourceId === 'fusion-master' ? 'ready' : 'review',
        detail: `Validate holder, spindle, and table sweep against ${input.collisionEnvelope}.`,
      },
      {
        id: 'fixture-reach',
        label: 'Fixture reach and clamp keep-out',
        status: 'review',
        detail: `Confirm clamp and approach clearance around ${input.fixtureLabel}.`,
      },
      {
        id: 'full-assembly',
        label: 'Full machine-area collision pass',
        status: assemblyRisk ? 'blocked' : 'ready',
        detail: assemblyRisk
          ? 'Assembly-class work needs a compare-ready machine simulation packet before release.'
          : 'Machine-area broad check is staged for release review.',
      },
    ],
    simulation: [
      {
        id: 'stock-sim',
        label: 'Stock removal simulation',
        status: input.cadSourceId === 'prism-native' ? 'review' : 'ready',
        detail: input.cadSourceId === 'prism-native'
          ? 'PRISM-native design brief should be compared against a neutral or Fusion model before trust.'
          : 'Primary CAD source supports stock-model verification.',
      },
      {
        id: 'post-compare',
        label: 'Post / controller compare',
        status: input.cadSourceId === 'fusion-master' ? 'ready' : 'review',
        detail: 'Compare NC output, machine kinematics, and tool list against the final programmed package.',
      },
      {
        id: 'quote-correlation',
        label: 'Quote correlation snapshot',
        status: 'review',
        detail: 'Persist final runtime/setup/material assumptions back into quote calibration once backend sync lands.',
      },
    ],
  };
}

function buildDfmFindings(input: {
  partClassId: string;
  cadSourceId: string;
  machineId: string;
  stockVolatility: string;
}): ProgramReleaseDfmFinding[] {
  const findings: ProgramReleaseDfmFinding[] = [
    {
      id: 'dfm-datum-chain',
      title: 'Datum chain should be frozen before proving the setup sheet',
      severity: input.cadSourceId === 'fusion-master' ? 'watch' : 'critical',
      area: 'Datum strategy',
      detail:
        input.cadSourceId === 'fusion-master'
          ? 'Fusion is the current master, but the fixture datum chain still needs a clean release snapshot for the traveler and setup packet.'
          : 'The current CAD source is not yet the strongest authority for datum-driven release, so the compare packet needs a more explicit datum freeze.',
      action: 'Publish datum A/B/C ownership and first-op pickup notes into the release packet.',
      source: input.cadSourceId,
    },
    {
      id: 'dfm-stock-volatility',
      title: 'Stock and machining assumptions need quote-calibration visibility',
      severity: input.stockVolatility === 'High' ? 'critical' : 'watch',
      area: 'Commercial correlation',
      detail:
        input.stockVolatility === 'High'
          ? 'Material pricing is volatile enough that stock posture should be reviewed before final quote release.'
          : 'Stock posture is stable enough to quote, but setup and runtime assumptions still need actual-vs-estimate capture.',
      action: 'Carry stock snapshot, setup minutes, and cycle assumptions into quote revision linkage.',
      source: 'quote posture',
    },
  ];

  if (input.partClassId === 'hydraulic-manifold') {
    findings.push({
      id: 'dfm-cross-drill-breakout',
      title: 'Cross-drill breakout and plug strategy need review',
      severity: 'critical',
      area: 'Flow-path integrity',
      detail:
        'Cross-drills, plugs, and seal faces need a dedicated compare pass so the programmed order of operations does not trap later machining or leak paths.',
      action: 'Add a manifold review checkpoint with plug, deburr, and seal-face ownership before release.',
      source: 'feature extraction',
    });
  }

  if (input.partClassId === 'assembly-pack') {
    findings.push({
      id: 'dfm-assembly-keepout',
      title: 'Assembly mating stack needs full keep-out and collision review',
      severity: 'critical',
      area: 'Assembly stackup',
      detail:
        'Multiple mating parts increase the chance that machine or fixture clearance assumptions are valid for one component but wrong for the full assembly packet.',
      action: 'Require assembly compare and machine-area clearance review before release.',
      source: 'assembly compare',
    });
  }

  if (input.machineId === 'umc-5x' || input.machineId === 'integrex-millturn') {
    findings.push({
      id: 'dfm-kinematic-access',
      title: 'Machine kinematics should drive holder length and keep-out posture',
      severity: 'watch',
      area: 'Machine access',
      detail:
        'The selected machine can finish the packet in fewer setups, but only if holder projection and body sweep stay synchronized with the collision model.',
      action: 'Freeze holder stack and machine keep-out review in the release checklist.',
      source: 'machine selection',
    });
  }

  return findings;
}

function buildGdtFocuses(input: {
  partClassLabel: string;
  machineLabel: string;
  cadSourceId: string;
}): ProgramReleaseGdtFocus[] {
  return [
    {
      id: 'gdt-primary-datum',
      label: 'Primary datum ownership',
      status: input.cadSourceId === 'fusion-master' ? 'ready' : 'review',
      requirement: `Freeze the primary datum scheme for ${input.partClassLabel} before setup-sheet signoff.`,
      note:
        input.cadSourceId === 'fusion-master'
          ? 'Primary datum path is strong enough to move into setup release, but the traveler still needs the same language.'
          : 'Primary datum scheme should be compared against Fusion or neutral CAD before the machine packet is trusted.',
      owner: 'Programming / setup',
    },
    {
      id: 'gdt-seal-fit',
      label: 'Critical fit / sealing features',
      status: 'review',
      requirement: 'Identify every face, bore, thread, or interface that controls fit, sealing, or downstream assembly.',
      note: `Use ${input.machineLabel} setup strategy to prove which operation owns final size and surface posture.`,
      owner: 'Quality / programming',
    },
    {
      id: 'gdt-inspection-link',
      label: 'Inspection packet linkage',
      status: input.cadSourceId === 'prism-native' ? 'blocked' : 'ready',
      requirement: 'Tie setup sheet, feature control posture, and first-article checkpoints to the same release revision.',
      note:
        input.cadSourceId === 'prism-native'
          ? 'PRISM-native design briefs need compare geometry before inspection checkpoints can be trusted.'
          : 'Inspection checkpoints are ready to travel with the release packet once backend revision storage lands.',
      owner: 'Quality / release',
    },
  ];
}

function buildSourceComparisons(input: {
  cadSources: ProgramReleaseCatalog['cadSources'];
  selectedCadSourceId: string;
}): ProgramReleaseSourceComparison[] {
  return input.cadSources.map((source) => ({
    id: source.id,
    label: source.label,
    status: source.status,
    geometryTrust:
      source.id === 'fusion-master'
        ? 'Strongest for parametric geometry + setup generation'
        : source.id === 'neutral-compare'
          ? 'Best for translation and compare confidence'
          : 'Design intent only until compared against a CAD authority',
    setupGeneration:
      source.id === 'fusion-master'
        ? 'Can own setup generation and toolpath preparation'
        : source.id === 'neutral-compare'
          ? 'Use for compare only, not final setup authority'
          : 'Use for structured design brief and concept planning',
    simulationTrust:
      source.id === 'fusion-master'
        ? 'Highest confidence for simulation and post validation'
        : source.id === 'neutral-compare'
          ? 'Moderate confidence after geometry compare'
          : 'Low until a neutral or Fusion compare pass exists',
    releasePosture:
      source.id === input.selectedCadSourceId
        ? 'Currently selected for release posture'
        : source.status === 'preferred'
          ? 'Best alternate when release trust needs to rise'
          : 'Available as fallback or compare path',
    note: source.note,
    recommended: source.id === 'fusion-master' || (source.id === input.selectedCadSourceId && source.status !== 'fallback'),
  }));
}

function buildMetrics(input: {
  machineLabel: string;
  cadLabel: string;
  runtimeMinutes: number;
  alerts: string[];
}): SummaryMetricRecord[] {
  return [
    {
      id: 'release-posture',
      label: 'Release posture',
      value: input.alerts.length > 1 ? 'Needs review' : 'Ready to stage',
      hint: `${input.machineLabel} + ${input.cadLabel}`,
      accent: 'from-cyan-400/22 via-cyan-300/10 to-transparent',
    },
    {
      id: 'cycle-window',
      label: 'Cycle window',
      value: `${input.runtimeMinutes.toFixed(0)} min`,
      hint: 'Combined planned cut time across the operation packet.',
      accent: 'from-sky-400/22 via-sky-300/10 to-transparent',
    },
    {
      id: 'program-intent',
      label: 'Program intent',
      value: input.alerts.length > 0 ? 'Guarded' : 'Aligned',
      hint: 'Collision and simulation posture from the selected digital source.',
      accent: 'from-emerald-400/22 via-emerald-300/10 to-transparent',
    },
  ];
}

export function buildProgramReleaseWorkspace(input: ProgramReleaseInput): ProgramReleaseWorkspace {
  const selectedPartClass = fallbackCatalogSelection(PROGRAM_RELEASE_CATALOG.partClasses, input.partClassId);
  const selectedMachine = fallbackCatalogSelection(PROGRAM_RELEASE_CATALOG.machines, input.machineId);
  const selectedToolholder = fallbackCatalogSelection(PROGRAM_RELEASE_CATALOG.toolholders, input.toolholderId);
  const selectedToolingPackage = fallbackCatalogSelection(PROGRAM_RELEASE_CATALOG.toolingPackages, input.toolingPackageId);
  const selectedFixture = fallbackCatalogSelection(PROGRAM_RELEASE_CATALOG.fixtures, input.fixtureId);
  const selectedStock = fallbackCatalogSelection(PROGRAM_RELEASE_CATALOG.stockProfiles, input.stockId);
  const selectedCadSource = fallbackCatalogSelection(PROGRAM_RELEASE_CATALOG.cadSources, input.cadSourceId);

  const operationPlan = buildOperationPlan({
    partClassId: selectedPartClass.id,
    machineId: selectedMachine.id,
    toolholderId: selectedToolholder.id,
    toolingPackageId: selectedToolingPackage.id,
    fixtureId: selectedFixture.id,
    stockId: selectedStock.id,
    cadSourceId: selectedCadSource.id,
  });

  const runtimeMinutes = operationPlan.reduce((sum, operation) => sum + operation.cycleMinutes, 0);
  const setupMinutes = selectedFixture.setupCount * 42 + (selectedCadSource.status === 'compare' ? 18 : 10);
  const alerts = [
    selectedCadSource.status === 'fallback'
      ? 'PRISM-native design brief should be compared against Fusion or neutral CAD before full release.'
      : null,
    selectedStock.volatility === 'High'
      ? 'Material pricing is volatile; refresh the stock snapshot before final quote release.'
      : null,
    selectedMachine.kinematics.includes('5-axis') || selectedMachine.kinematics.includes('Mill-turn')
      ? 'Machine kinematics require full holder/table/body collision review for every release.'
      : null,
  ].filter((item): item is string => Boolean(item));

  const checklists = buildChecklistItems({
    cadSourceId: selectedCadSource.id,
    partClassId: selectedPartClass.id,
    collisionEnvelope: selectedMachine.collisionEnvelope,
    fixtureLabel: selectedFixture.label,
  });
  const dfmFindings = buildDfmFindings({
    partClassId: selectedPartClass.id,
    cadSourceId: selectedCadSource.id,
    machineId: selectedMachine.id,
    stockVolatility: selectedStock.volatility,
  });
  const gdtFocuses = buildGdtFocuses({
    partClassLabel: selectedPartClass.label,
    machineLabel: selectedMachine.label,
    cadSourceId: selectedCadSource.id,
  });
  const sourceComparisons = buildSourceComparisons({
    cadSources: PROGRAM_RELEASE_CATALOG.cadSources,
    selectedCadSourceId: selectedCadSource.id,
  });

  const quoteLines = buildQuoteLines({
    runtimeMinutes,
    setupMinutes,
    machineRate: selectedMachine.machineRatePerHour,
    fixtureCost: selectedFixture.burdenCost,
    toolingCost: selectedToolingPackage.packageCost,
    materialCost: selectedStock.marketPrice,
    logisticsCost: selectedStock.logisticsCost,
    volatility: selectedStock.volatility,
  });

  const totalLoadedCost = quoteLines.length > 0 ? quoteLines[quoteLines.length - 1].value ?? '$0' : '$0';
  const setupSheet = buildSetupSheetSections({
    machineLabel: selectedMachine.label,
    machineController: selectedMachine.controller,
    fixtureLabel: selectedFixture.label,
    datumPlan: selectedFixture.datumPlan,
    toolingLabel: selectedToolingPackage.label,
    holderLabel: selectedToolholder.label,
    stockLabel: selectedStock.label,
    cadLabel: selectedCadSource.label,
    partLabel: selectedPartClass.label,
  });

  const programPreview = operationPlan
    .map(
      (operation, index) =>
        `${index + 1}. ${operation.code} ${operation.title} :: ${operation.strategy} :: ${operation.feedRate} @ ${operation.spindleRpm} rpm`,
    )
    .join('\n');

  return {
    metrics: buildMetrics({
      machineLabel: selectedMachine.label,
      cadLabel: selectedCadSource.label,
      runtimeMinutes,
      alerts,
    }),
    selectedPartClass,
    selectedMachine,
    selectedToolholder,
    selectedToolingPackage,
    selectedFixture,
    selectedStock,
    selectedCadSource,
    alerts,
    collisionChecks: checklists.collision,
    simulationChecks: checklists.simulation,
    dfmFindings,
    gdtFocuses,
    sourceComparisons,
    operationPlan,
    setupSheet,
    quoteLines,
    quotingSummary: `${selectedPartClass.label} on ${selectedMachine.label} loads to ${totalLoadedCost} before live quote calibration and revision control are wired.`,
    reviewSummary: `${dfmFindings.filter((finding) => finding.severity === 'critical').length} critical DFM risk(s), ${gdtFocuses.filter((focus) => focus.status !== 'ready').length} GD&T review item(s), ${sourceComparisons.filter((source) => source.recommended).length} trusted source path(s).`,
    integrationNotes: [
      'Universal intake should accept any file type while backend storage normalizes CAD, print, cert, and traveler attachments into one revision packet.',
      'Fusion 360 remains the preferred digital source when setup generation, post validation, or simulation fidelity matter most.',
      'Claude-owned backend should later supply file ids, geometry digests, DFM/GD&T findings, simulation result ids, and quote revision linkage to replace these fixture notes.',
    ],
    handoffActions: [
      'Attach the revision packet to the traveler and shop packet.',
      'Publish the setup sheet and machine/tool list to the selected workcenter.',
      'Snapshot the loaded quote posture for future actual-vs-estimate feedback.',
    ],
    programPreview,
  };
}
