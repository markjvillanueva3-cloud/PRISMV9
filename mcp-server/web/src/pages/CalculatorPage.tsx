import { useState } from 'react';
import { LoadingState, ErrorState } from '../components/LoadingState';
import { SafetyBadge } from '../components/SafetyBadge';
import { calculateSpeedFeed, ApiError } from '../api/client';

interface CalcResult {
  speed_rpm: number;
  feed_mmrev: number;
  safety_score: number;
}

export function CalculatorPage() {
  const [material, setMaterial] = useState('');
  const [operation, setOperation] = useState('milling');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CalcResult | null>(null);

  async function handleCalculate() {
    if (!material.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await calculateSpeedFeed({ material, operation });
      const r = resp.result as Record<string, unknown>;
      setResult({
        speed_rpm: r.speed_rpm as number,
        feed_mmrev: r.feed_mmrev as number,
        safety_score: resp.safety.score,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Speed & Feed Calculator</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="material">
            Material
          </label>
          <input
            id="material"
            type="text"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            placeholder="e.g., AISI 4140, 6061-T6"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500 focus:border-prism-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="operation">
            Operation
          </label>
          <select
            id="operation"
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500 focus:border-prism-500"
          >
            <option value="milling">Milling</option>
            <option value="turning">Turning</option>
            <option value="drilling">Drilling</option>
            <option value="threading">Threading</option>
          </select>
        </div>
        <button
          onClick={handleCalculate}
          disabled={loading || !material.trim()}
          className="bg-prism-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-prism-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Calculate
        </button>
      </div>

      <div className="mt-6">
        {loading && <LoadingState label="Calculating parameters..." />}
        {error && <ErrorState message={error} onRetry={handleCalculate} />}
        {result && !loading && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Results</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Speed</dt>
                <dd className="text-xl font-semibold">{result.speed_rpm} RPM</dd>
              </div>
              <div>
                <dt className="text-gray-500">Feed</dt>
                <dd className="text-xl font-semibold">{result.feed_mmrev} mm/rev</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-gray-500 mb-1">Safety Score</dt>
                <dd><SafetyBadge score={result.safety_score} /></dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
