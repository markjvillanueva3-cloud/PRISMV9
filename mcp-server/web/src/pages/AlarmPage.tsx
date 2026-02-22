import { useState } from 'react';
import { LoadingState, ErrorState } from '../components/LoadingState';
import { decodeAlarm, ApiError } from '../api/client';

interface AlarmResult {
  code: string;
  description: string;
  severity: string;
  causes: string[];
  remediation: string[];
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  error: 'bg-orange-100 text-orange-800 border-orange-300',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  info: 'bg-blue-100 text-blue-800 border-blue-300',
};

export function AlarmPage() {
  const [code, setCode] = useState('');
  const [controller, setController] = useState('fanuc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AlarmResult | null>(null);

  async function handleDecode() {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await decodeAlarm({ code, controller });
      const r = resp.result as Record<string, unknown>;
      setResult({
        code: r.code as string,
        description: r.description as string || 'Unknown alarm',
        severity: r.severity as string || 'warning',
        causes: (r.causes as string[]) || [],
        remediation: (r.remediation as string[]) || [],
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Alarm Decoder</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="alarm-code">
            Alarm Code
          </label>
          <input
            id="alarm-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g., 1020"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500 focus:border-prism-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="controller">
            Controller
          </label>
          <select
            id="controller"
            value={controller}
            onChange={(e) => setController(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-prism-500 focus:border-prism-500"
          >
            <option value="fanuc">Fanuc</option>
            <option value="haas">Haas</option>
            <option value="siemens">Siemens</option>
            <option value="mazak">Mazak</option>
            <option value="okuma">Okuma</option>
            <option value="heidenhain">Heidenhain</option>
          </select>
        </div>
        <button
          onClick={handleDecode}
          disabled={loading || !code.trim()}
          className="bg-prism-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-prism-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Decode Alarm
        </button>
      </div>

      <div className="mt-6">
        {loading && <LoadingState label="Decoding alarm..." />}
        {error && <ErrorState message={error} onRetry={handleDecode} />}
        {result && !loading && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Alarm {result.code}</h2>
              <span
                className={`px-2 py-0.5 rounded border text-xs font-medium ${
                  SEVERITY_STYLES[result.severity] || SEVERITY_STYLES.info
                }`}
              >
                {result.severity.toUpperCase()}
              </span>
            </div>
            <p className="text-gray-700">{result.description}</p>

            {result.causes.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Possible Causes</h3>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  {result.causes.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}

            {result.remediation.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Resolution Steps</h3>
                <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
                  {result.remediation.map((r, i) => <li key={i}>{r}</li>)}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
