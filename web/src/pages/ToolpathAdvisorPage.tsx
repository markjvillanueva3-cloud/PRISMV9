import { useMemo, useState } from 'react';
import { SafetyBadge } from '../components/SafetyBadge';
import { sfQuick } from '../api/speedfeed';

interface Strategy {
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  bestFor: string;
  mrr_rating: number;
  finish_rating: number;
  tool_life_rating: number;
  safety_score: number;
  preferredMaterials: Array<'aluminum' | 'steel' | 'stainless' | 'superalloy'>;
  axisSupport: Array<'3-axis' | '3+2' | '5-axis' | 'lathe'>;
  defaultRankBias: number;
}

type FeatureType = 'pocket' | 'slot' | 'contour' | 'facing' | 'drilling' | 'threading';
type MaterialProfile = 'aluminum' | 'steel' | 'stainless' | 'superalloy';
type AxisProfile = '3-axis' | '3+2' | '5-axis' | 'lathe';
type PriorityMode = 'throughput' | 'balance' | 'surface_finish' | 'tool_life';

const FEATURE_TYPES: Array<{ value: FeatureType; label: string; summary: string }> = [
  { value: 'pocket', label: 'Pocketing', summary: 'Bulk stock removal in cavities and floor regions.' },
  { value: 'slot', label: 'Slotting', summary: 'Narrow channel work with chip evacuation risk.' },
  { value: 'contour', label: 'Contouring', summary: 'Walls, profiles, and finish-critical side geometry.' },
  { value: 'facing', label: 'Facing', summary: 'Top-surface cleanup, datum creation, and stock leveling.' },
  { value: 'drilling', label: 'Drilling', summary: 'Holemaking strategy with evacuation and depth discipline.' },
  { value: 'threading', label: 'Threading', summary: 'Internal or external thread generation and finish control.' },
];

const MATERIAL_OPTIONS: Array<{ value: MaterialProfile; label: string; note: string }> = [
  { value: 'aluminum', label: 'Aluminum alloys', note: 'High chip volume, low cutting force, fast roughing windows.' },
  { value: 'steel', label: 'Carbon / alloy steel', note: 'Balanced heat, chip load, and rigidity needs.' },
  { value: 'stainless', label: 'Stainless steel', note: 'Heat and work-hardening demand controlled engagement.' },
  { value: 'superalloy', label: 'Titanium / nickel alloy', note: 'Thermal sensitivity and tool life dominate the plan.' },
];

const AXIS_OPTIONS: Array<{ value: AxisProfile; label: string; note: string }> = [
  { value: '3-axis', label: '3-axis mill', note: 'Flat workholding and standard indexed rough/finish workflows.' },
  { value: '3+2', label: '3+2 indexed', note: 'Tilted access with repositioning between toolpath groups.' },
  { value: '5-axis', label: 'Simultaneous 5-axis', note: 'Lean on collision-safe, low-force, high-access strategies.' },
  { value: 'lathe', label: 'Turning / lathe', note: 'Prioritize stable engagement and thread form control.' },
];

const PRIORITY_OPTIONS: Array<{ value: PriorityMode; label: string; description: string }> = [
  { value: 'throughput', label: 'Throughput', description: 'Bias toward MRR and dispatch speed.' },
  { value: 'balance', label: 'Balanced', description: 'Keep finish, risk, and productivity in a stable middle ground.' },
  { value: 'surface_finish', label: 'Surface finish', description: 'Push finish quality and process control first.' },
  { value: 'tool_life', label: 'Tool life', description: 'Prefer lower force and longer cutter survival.' },
];

const STRATEGY_MAP: Record<FeatureType, Strategy[]> = {
  pocket: [
    {
      name: 'Trochoidal Milling',
      description: 'Circular engagement with stable chip load for deep pockets and harder materials.',
      pros: ['Excellent tool life', 'Low radial force', 'Stable chip thickness'],
      cons: ['Longer cycle time', 'Needs HSM-capable control', 'Harder to hand-edit'],
      bestFor: 'Deep cavities, thin walls, hardened material roughing',
      mrr_rating: 3,
      finish_rating: 4,
      tool_life_rating: 5,
      safety_score: 0.92,
      preferredMaterials: ['steel', 'stainless', 'superalloy'],
      axisSupport: ['3-axis', '3+2', '5-axis'],
      defaultRankBias: 0.15,
    },
    {
      name: 'Adaptive Clearing',
      description: 'Variable stepover roughing that holds engagement steady while maximizing removal.',
      pros: ['High MRR', 'Reduced vibration', 'Good for larger pockets'],
      cons: ['Needs modern CAM', 'Not a finishing strategy', 'Surface can look inconsistent'],
      bestFor: 'Aluminum and steel roughing with flexible stock allowance',
      mrr_rating: 5,
      finish_rating: 2,
      tool_life_rating: 4,
      safety_score: 0.88,
      preferredMaterials: ['aluminum', 'steel', 'stainless'],
      axisSupport: ['3-axis', '3+2', '5-axis'],
      defaultRankBias: 0.22,
    },
    {
      name: 'Contour-Parallel',
      description: 'Traditional zig-zag or spiral pocket clearing with predictable motion.',
      pros: ['Simple programming', 'Predictable cycle time', 'Easy for legacy posts'],
      cons: ['Corner overload', 'Less stable chip load', 'More wear at direction changes'],
      bestFor: 'Shallow cavities and straightforward geometries',
      mrr_rating: 4,
      finish_rating: 3,
      tool_life_rating: 3,
      safety_score: 0.85,
      preferredMaterials: ['aluminum', 'steel'],
      axisSupport: ['3-axis', '3+2'],
      defaultRankBias: 0.05,
    },
  ],
  slot: [
    {
      name: 'Plunge Roughing',
      description: 'Axial plunging sequence that limits side load before finishing the slot walls.',
      pros: ['Low radial force', 'Good on long tools', 'Stable in deep slots'],
      cons: ['Needs a finish pass', 'Chip evacuation matters', 'Not the fastest'],
      bestFor: 'Deep, narrow slots and low-rigidity setups',
      mrr_rating: 3,
      finish_rating: 2,
      tool_life_rating: 4,
      safety_score: 0.9,
      preferredMaterials: ['steel', 'stainless', 'superalloy'],
      axisSupport: ['3-axis', '3+2'],
      defaultRankBias: 0.14,
    },
    {
      name: 'Helical Interpolation',
      description: 'Helical slot entry followed by side engagement for balanced force and evacuation.',
      pros: ['Smooth entry', 'Moderate cycle time', 'Good for aerospace alloys'],
      cons: ['Needs interpolation support', 'Not for extremely narrow slots'],
      bestFor: 'Medium-width slots with controlled entry conditions',
      mrr_rating: 4,
      finish_rating: 3,
      tool_life_rating: 4,
      safety_score: 0.87,
      preferredMaterials: ['aluminum', 'steel', 'stainless'],
      axisSupport: ['3-axis', '3+2', '5-axis'],
      defaultRankBias: 0.2,
    },
    {
      name: 'Side Milling',
      description: 'Direct side-milling pass focused on speed in wide-slot conditions.',
      pros: ['Fast cycle time', 'Simple to program', 'Works well on wide slots'],
      cons: ['High radial force', 'More deflection risk', 'Worse on hard alloys'],
      bestFor: 'Wide slots in soft materials with rigid workholding',
      mrr_rating: 5,
      finish_rating: 3,
      tool_life_rating: 2,
      safety_score: 0.78,
      preferredMaterials: ['aluminum', 'steel'],
      axisSupport: ['3-axis', '3+2'],
      defaultRankBias: 0.08,
    },
  ],
  contour: [
    {
      name: 'Climb Milling',
      description: 'Standard CNC contouring direction with cleaner finish and lower heat input.',
      pros: ['Better finish', 'Lower forces', 'Less rubbing at exit'],
      cons: ['Needs a rigid machine', 'Backlash-sensitive on older hardware'],
      bestFor: 'General contour finishing on modern CNC mills',
      mrr_rating: 3,
      finish_rating: 5,
      tool_life_rating: 4,
      safety_score: 0.91,
      preferredMaterials: ['aluminum', 'steel', 'stainless'],
      axisSupport: ['3-axis', '3+2', '5-axis'],
      defaultRankBias: 0.16,
    },
    {
      name: 'Conventional Milling',
      description: 'More forgiving contour direction for interrupted cuts or older machines.',
      pros: ['Forgiving on less rigid machines', 'Safer on cast skin', 'Predictable entry'],
      cons: ['Higher heat', 'More rubbing', 'Inferior finish on good machines'],
      bestFor: 'Castings, interrupted edges, and legacy equipment',
      mrr_rating: 3,
      finish_rating: 3,
      tool_life_rating: 3,
      safety_score: 0.84,
      preferredMaterials: ['steel', 'stainless'],
      axisSupport: ['3-axis', 'lathe'],
      defaultRankBias: 0.04,
    },
    {
      name: 'High-Speed Contouring',
      description: 'Shallow high-speed passes built for finish quality and low force.',
      pros: ['Excellent finish', 'Very low cutting load', 'Great for thin walls'],
      cons: ['Many passes', 'Needs HSM spindle behavior', 'Not ideal for roughing'],
      bestFor: 'Mold, die, and finish-critical contour work',
      mrr_rating: 2,
      finish_rating: 5,
      tool_life_rating: 5,
      safety_score: 0.94,
      preferredMaterials: ['steel', 'stainless', 'superalloy'],
      axisSupport: ['3-axis', '3+2', '5-axis'],
      defaultRankBias: 0.18,
    },
  ],
  facing: [
    {
      name: 'Face Mill',
      description: 'Large-diameter facing strategy for aggressive stock cleanup and flatness.',
      pros: ['Fastest cycle time', 'Excellent flatness', 'Insert wear shared across edges'],
      cons: ['Needs spindle power', 'Large force footprint', 'Expensive tool package'],
      bestFor: 'Production facing and large, flat stock surfaces',
      mrr_rating: 5,
      finish_rating: 4,
      tool_life_rating: 4,
      safety_score: 0.86,
      preferredMaterials: ['aluminum', 'steel', 'stainless'],
      axisSupport: ['3-axis', '3+2'],
      defaultRankBias: 0.22,
    },
    {
      name: 'Shell Mill',
      description: 'Overlapping shell-mill passes for moderate stock size and power limits.',
      pros: ['Moderate power requirement', 'Flexible coverage', 'Good all-around finish'],
      cons: ['Overlap planning matters', 'Step marks possible', 'Longer than a full face mill'],
      bestFor: 'Medium-size parts and mixed-hardness stock',
      mrr_rating: 4,
      finish_rating: 3,
      tool_life_rating: 3,
      safety_score: 0.85,
      preferredMaterials: ['steel', 'stainless'],
      axisSupport: ['3-axis', '3+2'],
      defaultRankBias: 0.12,
    },
    {
      name: 'End Mill Facing',
      description: 'Small-area facing when access or stock size rules out a larger face tool.',
      pros: ['Fits tight areas', 'Uses common tooling', 'Good for datum touchups'],
      cons: ['Slow on large areas', 'Lower MRR', 'More cutter wear'],
      bestFor: 'Small pads, step faces, and local cleanup',
      mrr_rating: 2,
      finish_rating: 4,
      tool_life_rating: 3,
      safety_score: 0.88,
      preferredMaterials: ['aluminum', 'steel', 'stainless', 'superalloy'],
      axisSupport: ['3-axis', '3+2', '5-axis'],
      defaultRankBias: 0.08,
    },
  ],
  drilling: [
    {
      name: 'Peck Drilling',
      description: 'Controlled peck cycles that prioritize evacuation and low thermal risk.',
      pros: ['Reliable chip evacuation', 'Safer in deep holes', 'Reduces packing risk'],
      cons: ['Longer cycle time', 'Re-entry wear', 'Can leave retraction marks'],
      bestFor: 'Deep holes and materials with evacuation difficulty',
      mrr_rating: 3,
      finish_rating: 3,
      tool_life_rating: 4,
      safety_score: 0.9,
      preferredMaterials: ['steel', 'stainless', 'superalloy'],
      axisSupport: ['3-axis', '3+2', '5-axis'],
      defaultRankBias: 0.14,
    },
    {
      name: 'Through-Coolant Drilling',
      description: 'Continuous drilling with through-spindle coolant for top productivity.',
      pros: ['Fastest cycle time', 'Excellent chip evacuation', 'Best production option'],
      cons: ['Needs TSC hardware', 'Higher tooling cost', 'Pressure matters'],
      bestFor: 'Production drilling and higher-volume hole packages',
      mrr_rating: 5,
      finish_rating: 4,
      tool_life_rating: 5,
      safety_score: 0.92,
      preferredMaterials: ['aluminum', 'steel', 'stainless'],
      axisSupport: ['3-axis', '3+2', '5-axis'],
      defaultRankBias: 0.24,
    },
    {
      name: 'Spot Drill + Twist Drill',
      description: 'Traditional sequence built for position control and broad compatibility.',
      pros: ['Accurate start location', 'Low tooling cost', 'Works on almost anything'],
      cons: ['Two operations', 'Slower overall', 'More cycle overhead'],
      bestFor: 'Manual or mixed-capability environments',
      mrr_rating: 3,
      finish_rating: 3,
      tool_life_rating: 3,
      safety_score: 0.86,
      preferredMaterials: ['aluminum', 'steel', 'stainless', 'superalloy'],
      axisSupport: ['3-axis', '3+2', '5-axis', 'lathe'],
      defaultRankBias: 0.06,
    },
  ],
  threading: [
    {
      name: 'Thread Milling',
      description: 'Helical thread generation with one cutter covering multiple thread sizes.',
      pros: ['One tool for many sizes', 'Low breakage risk', 'Excellent finish'],
      cons: ['Slower than tapping', 'Needs interpolation', 'More setup thought'],
      bestFor: 'Large threads, blind holes, and harder materials',
      mrr_rating: 3,
      finish_rating: 5,
      tool_life_rating: 4,
      safety_score: 0.93,
      preferredMaterials: ['aluminum', 'steel', 'stainless', 'superalloy'],
      axisSupport: ['3-axis', '3+2', '5-axis'],
      defaultRankBias: 0.2,
    },
    {
      name: 'Rigid Tapping',
      description: 'Synchronized spindle tapping for the fastest standard thread cycle time.',
      pros: ['Fastest production path', 'Simple programming', 'Great on standard thread families'],
      cons: ['Tap breakage risk', 'Dedicated size tooling', 'Chip evacuation matters'],
      bestFor: 'High-volume standard tapping when risk is manageable',
      mrr_rating: 5,
      finish_rating: 3,
      tool_life_rating: 3,
      safety_score: 0.82,
      preferredMaterials: ['aluminum', 'steel'],
      axisSupport: ['3-axis', '3+2', 'lathe'],
      defaultRankBias: 0.12,
    },
    {
      name: 'Single-Point Threading',
      description: 'Multi-pass single-point threading for full control over thread form and fit.',
      pros: ['Maximum control', 'Works on special forms', 'Ideal for larger diameters'],
      cons: ['Many passes', 'Needs turning process discipline', 'Slow for small threads'],
      bestFor: 'Custom threads, lathe work, and larger OD/ID thread forms',
      mrr_rating: 2,
      finish_rating: 4,
      tool_life_rating: 4,
      safety_score: 0.89,
      preferredMaterials: ['steel', 'stainless', 'superalloy'],
      axisSupport: ['lathe'],
      defaultRankBias: 0.18,
    },
  ],
};

function scoreStrategy(
  strategy: Strategy,
  material: MaterialProfile,
  axis: AxisProfile,
  priority: PriorityMode,
) {
  const priorityScore =
    priority === 'throughput'
      ? strategy.mrr_rating * 1.2 + strategy.tool_life_rating * 0.35
      : priority === 'surface_finish'
        ? strategy.finish_rating * 1.25 + strategy.tool_life_rating * 0.3
        : priority === 'tool_life'
          ? strategy.tool_life_rating * 1.3 + strategy.safety_score * 2.1
          : strategy.mrr_rating + strategy.finish_rating + strategy.tool_life_rating * 0.9;

  const materialBonus = strategy.preferredMaterials.includes(material) ? 1.2 : -0.75;
  const axisBonus = strategy.axisSupport.includes(axis) ? 1 : -1.6;
  const safetyBonus = strategy.safety_score * 2.4;

  return priorityScore + materialBonus + axisBonus + safetyBonus + strategy.defaultRankBias;
}

function ratingTone(value: number) {
  if (value >= 5) return 'bg-emerald-300';
  if (value >= 4) return 'bg-cyan-300';
  if (value >= 3) return 'bg-amber-300';
  return 'bg-rose-300';
}

function RatingBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <div className="flex gap-1">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className={`h-2.5 w-5 rounded-full ${index < value ? ratingTone(value) : 'bg-slate-800'}`}
          />
        ))}
      </div>
    </div>
  );
}

export function ToolpathAdvisorPage() {
  const [feature, setFeature] = useState<FeatureType>('pocket');
  const [material, setMaterial] = useState<MaterialProfile>('steel');
  const [axis, setAxis] = useState<AxisProfile>('3-axis');
  const [priority, setPriority] = useState<PriorityMode>('balance');
  const [strategies, setStrategies] = useState<Array<Strategy & { score: number }> | null>(null);
  const [backendSf, setBackendSf] = useState<string | null>(null);

  const selectedFeature = useMemo(
    () => FEATURE_TYPES.find((option) => option.value === feature) ?? FEATURE_TYPES[0],
    [feature],
  );

  const selectedMaterial = useMemo(
    () => MATERIAL_OPTIONS.find((option) => option.value === material) ?? MATERIAL_OPTIONS[0],
    [material],
  );

  const selectedAxis = useMemo(
    () => AXIS_OPTIONS.find((option) => option.value === axis) ?? AXIS_OPTIONS[0],
    [axis],
  );

  const selectedPriority = useMemo(
    () => PRIORITY_OPTIONS.find((option) => option.value === priority) ?? PRIORITY_OPTIONS[0],
    [priority],
  );

  function handleGetStrategies() {
    const ranked = (STRATEGY_MAP[feature] || [])
      .map((strategy) => ({
        ...strategy,
        score: scoreStrategy(strategy, material, axis, priority),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);

    setStrategies(ranked);

    // Backend validation: get speed/feed recommendation for this material/operation combo
    const opMap: Record<FeatureType, string> = {
      pocket: 'pocket', slot: 'slot', contour: 'profile',
      facing: 'face', drilling: 'drill', threading: 'thread',
    };
    sfQuick({ material, operation: opMap[feature] ?? 'face', tool_diameter_mm: 12 })
      .then((res) => {
        const result = res?.result as Record<string, unknown> | undefined;
        if (result?.Vc_rec) {
          setBackendSf(`Recommended: Vc=${result.Vc_rec} m/min, fz=${result.fz_rec ?? '—'} mm/tooth`);
        }
      })
      .catch(() => setBackendSf(null));
  }

  const topStrategy = strategies?.[0] ?? null;

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <section className="overflow-hidden rounded-[32px] border border-sky-300/12 bg-[linear-gradient(130deg,rgba(8,15,23,0.98)_0%,rgba(5,10,16,0.98)_46%,rgba(7,24,34,0.96)_100%)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-sky-300/16 bg-sky-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-100">
              Toolpath intelligence
            </span>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
                Toolpath Advisor
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                Choose the feature, stock behavior, and machine posture you are actually running,
                then compare the strongest strategy fits before you commit to a CAM path.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Feature focus</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{selectedFeature.label}</div>
                <div className="mt-1 text-sm text-slate-400">{selectedFeature.summary}</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Material posture</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{selectedMaterial.label}</div>
                <div className="mt-1 text-sm text-slate-400">{selectedMaterial.note}</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Machine posture</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{selectedAxis.label}</div>
                <div className="mt-1 text-sm text-slate-400">{selectedAxis.note}</div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Current recommendation</div>
            {topStrategy ? (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xl font-semibold text-slate-50">{topStrategy.name}</div>
                    <div className="mt-1 text-sm text-slate-400">{topStrategy.bestFor}</div>
                  </div>
                  <SafetyBadge score={topStrategy.safety_score} />
                </div>
                <p className="text-sm leading-6 text-slate-300">{topStrategy.description}</p>
                <div className="space-y-2 rounded-[22px] border border-cyan-300/12 bg-cyan-300/[0.05] px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">Priority fit</div>
                  <div className="text-sm text-slate-300">
                    Tuned for <span className="font-semibold text-slate-100">{selectedPriority.label.toLowerCase()}</span> on a{' '}
                    <span className="font-semibold text-slate-100">{selectedAxis.label.toLowerCase()}</span> with{' '}
                    <span className="font-semibold text-slate-100">{selectedMaterial.label.toLowerCase()}</span>.
                  </div>
                  {backendSf && (
                    <div className="mt-2 text-xs text-cyan-200/70">{backendSf}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-[22px] border border-dashed border-white/12 bg-white/[0.02] px-4 py-5 text-sm leading-6 text-slate-400">
                Set the feature, material, machine posture, and priority, then run the advisor to surface the top three strategy fits.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(320px,0.7fr)_minmax(0,1.3fr)]">
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
          <div className="mb-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Strategy setup</div>
            <div className="mt-2 text-xl font-semibold text-slate-50">Compare candidate paths</div>
            <div className="mt-1 text-sm text-slate-400">
              Dial in the process context first so the ranking reflects the shop floor you actually have.
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="ta-feature" className="mb-1.5 block text-sm font-medium text-slate-300">
                Feature Type
              </label>
              <select
                id="ta-feature"
                value={feature}
                onChange={(event) => {
                  setFeature(event.target.value as FeatureType);
                  setStrategies(null);
                }}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/35 focus:ring-2 focus:ring-cyan-400/15"
              >
                {FEATURE_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ta-material" className="mb-1.5 block text-sm font-medium text-slate-300">
                Material Family
              </label>
              <select
                id="ta-material"
                value={material}
                onChange={(event) => {
                  setMaterial(event.target.value as MaterialProfile);
                  setStrategies(null);
                }}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/35 focus:ring-2 focus:ring-cyan-400/15"
              >
                {MATERIAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ta-axis" className="mb-1.5 block text-sm font-medium text-slate-300">
                Machine Axes
              </label>
              <select
                id="ta-axis"
                value={axis}
                onChange={(event) => {
                  setAxis(event.target.value as AxisProfile);
                  setStrategies(null);
                }}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/35 focus:ring-2 focus:ring-cyan-400/15"
              >
                {AXIS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ta-priority" className="mb-1.5 block text-sm font-medium text-slate-300">
                Planning Priority
              </label>
              <select
                id="ta-priority"
                value={priority}
                onChange={(event) => {
                  setPriority(event.target.value as PriorityMode);
                  setStrategies(null);
                }}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/35 focus:ring-2 focus:ring-cyan-400/15"
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-sm text-slate-400">{selectedPriority.description}</div>
            </div>
          </div>

          <button
            onClick={handleGetStrategies}
            className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
          >
            Get Strategies
          </button>
        </div>

        <div className="space-y-4">
          {strategies ? (
            strategies.map((strategy, index) => (
              <article
                key={strategy.name}
                className={`rounded-[28px] border p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] ${
                  index === 0
                    ? 'border-cyan-300/22 bg-[linear-gradient(180deg,rgba(8,18,28,0.98)_0%,rgba(4,10,16,0.98)_100%)]'
                    : 'border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)]'
                }`}
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                      #{index + 1} {index === 0 ? 'Recommended' : 'Alternative'}
                    </div>
                    <h3 className="text-2xl font-semibold text-slate-50">{strategy.name}</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{strategy.description}</p>
                  </div>
                  <SafetyBadge score={strategy.safety_score} />
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div className="space-y-3 rounded-[22px] border border-white/8 bg-black/15 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Ratings</div>
                    <RatingBar value={strategy.mrr_rating} label="MRR" />
                    <RatingBar value={strategy.finish_rating} label="Finish" />
                    <RatingBar value={strategy.tool_life_rating} label="Tool Life" />
                    <div className="pt-3 text-sm text-slate-300">
                      <span className="font-semibold text-slate-100">Best for:</span> {strategy.bestFor}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[22px] border border-emerald-300/12 bg-emerald-300/[0.05] px-4 py-4">
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100">Advantages</div>
                      <ul className="space-y-2 text-sm leading-6 text-slate-300">
                        {strategy.pros.map((pro) => (
                          <li key={pro} className="flex gap-2">
                            <span className="mt-1 text-emerald-300">+</span>
                            <span>{pro}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-[22px] border border-amber-300/12 bg-amber-300/[0.05] px-4 py-4">
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-100">Trade-offs</div>
                      <ul className="space-y-2 text-sm leading-6 text-slate-300">
                        {strategy.cons.map((con) => (
                          <li key={con} className="flex gap-2">
                            <span className="mt-1 text-amber-300">-</span>
                            <span>{con}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[28px] border border-dashed border-white/12 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] px-6 py-10 text-center">
              <div className="text-lg font-semibold text-slate-50">No strategies ranked yet</div>
              <div className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
                Use the setup lane to describe the feature and the machine posture, then run the advisor to compare the top three process paths.
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
