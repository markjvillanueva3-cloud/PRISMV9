/**
 * L8-P1-MS2 P0-U08: Tool Selection Wizard
 * Wizard: operation+material -> tool recommendations -> specs -> selection.
 */
import { useState } from 'react';
import { useToolSelect } from '../../hooks/useLearning';
import { LoadingState } from '../LoadingState';
import { ErrorState } from '../ErrorState';
import type { ToolRecommendation } from '../../types/learning';

const OPERATIONS = [
  'Face Milling', 'Slot Milling', 'Profile Milling', 'Drilling', 'Boring',
  'Turning', 'Threading', 'Grooving', 'Reaming', 'Tapping',
];

type Step = 'input' | 'results';

export function ToolWizard() {
  const [step, setStep] = useState<Step>('input');
  const [operation, setOperation] = useState('');
  const [material, setMaterial] = useState('');
  const [diameter, setDiameter] = useState<number | ''>('');
  const [finishRequired, setFinishRequired] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { tools, loading, error, selectTool } = useToolSelect();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!operation || !material) return;
    const res = await selectTool({
      operation,
      material,
      requirements: {
        ...(diameter !== '' && { diameter_mm: diameter }),
        finish_required: finishRequired,
      },
      count: 10,
    });
    if (res) setStep('results');
  }

  if (error) return <ErrorState message={error} onRetry={() => setStep('input')} />;

  if (step === 'results' && tools) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tool Recommendations</h1>
            <p className="text-sm text-gray-500 mt-1">
              {operation} in {material} &middot; {tools.length} tools found
            </p>
          </div>
          <button
            onClick={() => setStep('input')}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Refine
          </button>
        </div>

        <div className="space-y-3">
          {tools.map((tool: ToolRecommendation) => (
            <div key={tool.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === tool.id ? null : tool.id)}
                className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{tool.name}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{tool.type}</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">{tool.manufacturer}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-prism-600">{Math.round(tool.match_score * 100)}%</div>
                    <div className="text-xs text-gray-400">match</div>
                  </div>
                </div>
              </button>

              {expanded === tool.id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <SpecItem label="Diameter" value={`${tool.specs.diameter_mm} mm`} />
                    <SpecItem label="Flutes" value={`${tool.specs.flutes}`} />
                    <SpecItem label="Helix Angle" value={`${tool.specs.helix_angle_deg}\u00b0`} />
                    <SpecItem label="Coating" value={tool.specs.coating} />
                    <SpecItem label="Max DOC" value={`${tool.specs.max_doc_mm} mm`} />
                    <SpecItem label="Max WOC" value={`${tool.specs.max_woc_mm} mm`} />
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm font-medium text-blue-800 mb-2">Recommended Parameters</div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-blue-600">Speed:</span>{' '}
                        <span className="font-medium text-blue-900">{tool.recommended_params.speed_rpm} RPM</span>
                      </div>
                      <div>
                        <span className="text-blue-600">Feed:</span>{' '}
                        <span className="font-medium text-blue-900">{tool.recommended_params.feed_mmrev} mm/rev</span>
                      </div>
                      <div>
                        <span className="text-blue-600">DOC:</span>{' '}
                        <span className="font-medium text-blue-900">{tool.recommended_params.doc_mm} mm</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Input form
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tool Selection Wizard</h1>
        <p className="text-sm text-gray-500 mt-1">Select operation and material to find the best cutting tools</p>
      </div>

      {loading && <LoadingState label="Finding tools..." />}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Operation *</label>
          <select
            value={operation}
            onChange={e => setOperation(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-prism-500"
          >
            <option value="">Select operation...</option>
            {OPERATIONS.map(op => <option key={op} value={op}>{op}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Material *</label>
          <input
            type="text"
            value={material}
            onChange={e => setMaterial(e.target.value)}
            required
            placeholder="e.g., 4140 Steel, 6061 Aluminum, Ti-6Al-4V"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-prism-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Diameter (mm, optional)</label>
            <input
              type="number"
              value={diameter}
              onChange={e => setDiameter(e.target.value ? +e.target.value : '')}
              min={0.1}
              step={0.1}
              placeholder="Any"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-prism-500"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={finishRequired}
                onChange={e => setFinishRequired(e.target.checked)}
                className="rounded border-gray-300 text-prism-600 focus:ring-prism-500"
              />
              <span className="text-sm text-gray-700">Finish cut required</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={!operation || !material}
          className="px-6 py-2.5 bg-prism-600 text-white rounded-lg font-medium hover:bg-prism-700 disabled:opacity-50 transition-colors"
        >
          Find Tools
        </button>
      </form>
    </div>
  );
}

function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}
