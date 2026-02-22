/**
 * R5-MS2: Toolpath Advisor Page
 *
 * Strategy recommendation interface. Select a feature type,
 * material, and machine axes to get top 3 toolpath strategies
 * with pros/cons comparison cards.
 *
 * Data source: /api/v1/job-plan (strategy_for_job via bridge)
 * Uses local strategy data for offline operation.
 */
import { useState } from 'react';
import { SafetyBadge } from '../components/SafetyBadge';

// ============================================================================
// STRATEGY DEFINITIONS (local — mirrors prism_toolpath registry)
// ============================================================================

interface Strategy {
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  bestFor: string;
  mrr_rating: number;      // 1-5
  finish_rating: number;   // 1-5
  tool_life_rating: number; // 1-5
  safety_score: number;     // 0-1
}

const FEATURE_TYPES = [
  'pocket', 'slot', 'contour', 'facing', 'drilling', 'threading',
] as const;

const STRATEGY_MAP: Record<string, Strategy[]> = {
  pocket: [
    {
      name: 'Trochoidal Milling',
      description: 'Circular tool paths with constant chip load. Ideal for deep pockets in hard materials.',
      pros: ['Excellent tool life', 'Low radial forces', 'Consistent chip thickness'],
      cons: ['Longer cycle time', 'Requires HSM capability', 'Complex programming'],
      bestFor: 'Hardened steel, deep pockets, thin walls',
      mrr_rating: 3, finish_rating: 4, tool_life_rating: 5, safety_score: 0.92,
    },
    {
      name: 'Adaptive Clearing',
      description: 'Variable stepover maintaining constant tool engagement. Fast material removal.',
      pros: ['High MRR', 'Good tool life', 'Reduced vibration'],
      cons: ['CAM software required', 'Not for finishing', 'Variable surface finish'],
      bestFor: 'Roughing, large pockets, aluminum',
      mrr_rating: 5, finish_rating: 2, tool_life_rating: 4, safety_score: 0.88,
    },
    {
      name: 'Contour-Parallel (Zigzag)',
      description: 'Traditional zigzag or spiral pocket clearing. Simple and predictable.',
      pros: ['Simple programming', 'Predictable cycle time', 'Good for shallow pockets'],
      cons: ['Full-width engagement at corners', 'Tool wear at corners', 'Variable chip load'],
      bestFor: 'Shallow pockets, soft materials, simple geometries',
      mrr_rating: 4, finish_rating: 3, tool_life_rating: 3, safety_score: 0.85,
    },
  ],
  slot: [
    {
      name: 'Plunge Roughing',
      description: 'Axial plunging to rough out slot before finishing. Minimizes radial forces.',
      pros: ['Low radial force', 'Good for deep slots', 'Works with long tools'],
      cons: ['Requires finishing pass', 'Chip evacuation critical', 'Slower than side milling'],
      bestFor: 'Deep narrow slots, long overhang situations',
      mrr_rating: 3, finish_rating: 2, tool_life_rating: 4, safety_score: 0.90,
    },
    {
      name: 'Helical Interpolation',
      description: 'Helical descent into slot then linear passes. Good balance of speed and safety.',
      pros: ['Smooth entry', 'Good chip evacuation', 'Moderate MRR'],
      cons: ['Requires circular interpolation', 'Not for very narrow slots'],
      bestFor: 'Medium-width slots, aerospace materials',
      mrr_rating: 4, finish_rating: 3, tool_life_rating: 4, safety_score: 0.87,
    },
    {
      name: 'Side Milling',
      description: 'Conventional side-milling approach. Fast but higher forces.',
      pros: ['Fast cycle time', 'Simple toolpath', 'Good for wide slots'],
      cons: ['High radial forces', 'Risk of tool deflection', 'Corner wear'],
      bestFor: 'Wide slots, soft materials, rigid setups',
      mrr_rating: 5, finish_rating: 3, tool_life_rating: 2, safety_score: 0.78,
    },
  ],
  contour: [
    {
      name: 'Climb Milling',
      description: 'Cutter rotation direction matches feed direction. Better finish and tool life.',
      pros: ['Better surface finish', 'Lower cutting forces', 'Less heat in workpiece'],
      cons: ['Requires rigid setup', 'Not for manual machines', 'Backlash-sensitive'],
      bestFor: 'CNC machines, finishing passes, most materials',
      mrr_rating: 3, finish_rating: 5, tool_life_rating: 4, safety_score: 0.91,
    },
    {
      name: 'Conventional Milling',
      description: 'Cutter rotation opposes feed. Traditional approach, forgiving on older machines.',
      pros: ['Works on less rigid machines', 'Gradual tooth engagement', 'Good for interrupted cuts'],
      cons: ['Higher heat generation', 'Rubbing on entry', 'Worse surface finish'],
      bestFor: 'Manual mills, interrupted cuts, castings',
      mrr_rating: 3, finish_rating: 3, tool_life_rating: 3, safety_score: 0.84,
    },
    {
      name: 'High-Speed Contouring',
      description: 'Light passes at high speed and feed. Excellent finish with minimal tool load.',
      pros: ['Excellent finish', 'Minimal cutting forces', 'Near-net-shape results'],
      cons: ['Many passes needed', 'Requires HSM spindle', 'Low per-pass MRR'],
      bestFor: 'Hardened steel finishing, mold making, thin walls',
      mrr_rating: 2, finish_rating: 5, tool_life_rating: 5, safety_score: 0.94,
    },
  ],
  facing: [
    {
      name: 'Face Mill (Large Diameter)',
      description: 'Large face mill covering full width in single pass. Maximum productivity.',
      pros: ['Fastest cycle time', 'Excellent flatness', 'Multiple inserts share wear'],
      cons: ['Requires high spindle power', 'Large forces', 'Expensive tooling'],
      bestFor: 'Large flat surfaces, production work, cast iron',
      mrr_rating: 5, finish_rating: 4, tool_life_rating: 4, safety_score: 0.86,
    },
    {
      name: 'Shell Mill (Overlap Passes)',
      description: 'Multiple overlapping passes with shell mill. Good for medium-size parts.',
      pros: ['Moderate power requirement', 'Good surface finish', 'Flexible'],
      cons: ['Step marks between passes', 'Longer cycle time', 'Requires overlap planning'],
      bestFor: 'Medium parts, materials with varying hardness',
      mrr_rating: 4, finish_rating: 3, tool_life_rating: 3, safety_score: 0.85,
    },
    {
      name: 'End Mill Facing',
      description: 'Using end mill for facing small areas. When face mill is too large.',
      pros: ['Accessible in tight spaces', 'Good for small areas', 'Uses existing tooling'],
      cons: ['Slow for large areas', 'More tool wear', 'Lower MRR'],
      bestFor: 'Small faces, datum surfaces, step faces',
      mrr_rating: 2, finish_rating: 4, tool_life_rating: 3, safety_score: 0.88,
    },
  ],
  drilling: [
    {
      name: 'Peck Drilling',
      description: 'Periodic retraction for chip breaking. Essential for deep holes.',
      pros: ['Reliable chip evacuation', 'Prevents chip packing', 'Reduces heat buildup'],
      cons: ['Longer cycle time', 'More tool wear from re-entry', 'Retraction marks'],
      bestFor: 'Deep holes (>3xD), gummy materials, through holes',
      mrr_rating: 3, finish_rating: 3, tool_life_rating: 4, safety_score: 0.90,
    },
    {
      name: 'Through-Coolant Drilling',
      description: 'Continuous drilling with through-spindle coolant. Fast and clean.',
      pros: ['No pecking needed', 'Fastest cycle time', 'Excellent chip evacuation'],
      cons: ['Requires TSC spindle', 'Expensive drills', 'Coolant pressure critical'],
      bestFor: 'Production drilling, steel, through holes',
      mrr_rating: 5, finish_rating: 4, tool_life_rating: 5, safety_score: 0.92,
    },
    {
      name: 'Spot-Drill + Twist Drill',
      description: 'Center drill followed by twist drill. Traditional reliable approach.',
      pros: ['Accurate hole position', 'Works with any machine', 'Low cost tooling'],
      cons: ['Two operations', 'Slower overall', 'Spot drill can walk'],
      bestFor: 'Precision holes, angled surfaces, manual work',
      mrr_rating: 3, finish_rating: 3, tool_life_rating: 3, safety_score: 0.86,
    },
  ],
  threading: [
    {
      name: 'Thread Milling',
      description: 'Helical interpolation with thread mill. One tool for multiple thread sizes.',
      pros: ['One tool many sizes', 'Better finish', 'No tap breakage risk'],
      cons: ['Requires helical interpolation', 'Slower than tapping', 'Complex programming'],
      bestFor: 'Large threads, hard materials, blind holes',
      mrr_rating: 3, finish_rating: 5, tool_life_rating: 4, safety_score: 0.93,
    },
    {
      name: 'Rigid Tapping',
      description: 'Synchronized spindle tapping. Fastest method for standard threads.',
      pros: ['Fastest cycle time', 'Simple programming', 'Low cost per hole'],
      cons: ['Tap breakage risk', 'Size-specific tooling', 'Chip evacuation concerns'],
      bestFor: 'Production tapping, standard threads, through holes',
      mrr_rating: 5, finish_rating: 3, tool_life_rating: 3, safety_score: 0.82,
    },
    {
      name: 'Single-Point Threading (Lathe)',
      description: 'Multiple passes with single-point tool. Full control over thread form.',
      pros: ['Full thread control', 'Any thread form possible', 'Good for large threads'],
      cons: ['Many passes needed', 'Requires lathe', 'Slow for small threads'],
      bestFor: 'Custom threads, large diameters, special forms',
      mrr_rating: 2, finish_rating: 4, tool_life_rating: 4, safety_score: 0.89,
    },
  ],
};

// ============================================================================
// RATING BAR COMPONENT
// ============================================================================

function RatingBar({ value, max = 5, label }: { value: number; max?: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-16">{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: max }, (_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-sm ${i < value ? 'bg-prism-500' : 'bg-gray-200'}`}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// TOOLPATH ADVISOR PAGE
// ============================================================================

export function ToolpathAdvisorPage() {
  const [feature, setFeature] = useState<string>(FEATURE_TYPES[0]);
  const [strategies, setStrategies] = useState<Strategy[] | null>(null);

  function handleGetStrategies() {
    setStrategies(STRATEGY_MAP[feature] || []);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Toolpath Advisor</h1>
        <p className="text-sm text-gray-500 mt-1">
          Get strategy recommendations for your machining feature.
        </p>
      </div>

      {/* Feature selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="ta-feature" className="block text-sm font-medium text-gray-700 mb-1">
              Feature Type
            </label>
            <select
              id="ta-feature"
              value={feature}
              onChange={(e) => { setFeature(e.target.value); setStrategies(null); }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500"
            >
              {FEATURE_TYPES.map((f) => (
                <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleGetStrategies}
            className="bg-prism-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-prism-700 transition-colors"
          >
            Get Strategies
          </button>
        </div>
      </div>

      {/* Strategy cards */}
      {strategies && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {strategies.map((s, idx) => (
            <div
              key={s.name}
              className={`bg-white rounded-lg border shadow-sm p-5 flex flex-col ${
                idx === 0 ? 'border-prism-300 ring-1 ring-prism-200' : 'border-gray-200'
              }`}
            >
              {/* Rank badge */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  idx === 0 ? 'bg-prism-100 text-prism-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  #{idx + 1} {idx === 0 ? 'Recommended' : ''}
                </span>
                <SafetyBadge score={s.safety_score} />
              </div>

              <h3 className="text-base font-semibold text-gray-900 mb-1">{s.name}</h3>
              <p className="text-xs text-gray-500 mb-3">{s.description}</p>

              {/* Ratings */}
              <div className="space-y-1 mb-3">
                <RatingBar value={s.mrr_rating} label="MRR" />
                <RatingBar value={s.finish_rating} label="Finish" />
                <RatingBar value={s.tool_life_rating} label="Tool Life" />
              </div>

              {/* Pros */}
              <div className="mb-2">
                <h4 className="text-xs font-semibold text-green-700 mb-1">Advantages</h4>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  {s.pros.map((p) => (
                    <li key={p} className="flex items-start gap-1">
                      <span className="text-green-500 mt-0.5">+</span>{p}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cons */}
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-amber-700 mb-1">Trade-offs</h4>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  {s.cons.map((c) => (
                    <li key={c} className="flex items-start gap-1">
                      <span className="text-amber-500 mt-0.5">-</span>{c}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Best for */}
              <div className="mt-auto pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-500">Best for: </span>
                <span className="text-xs text-gray-700">{s.bestFor}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
