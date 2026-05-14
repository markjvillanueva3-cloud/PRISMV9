/**
 * L8-P1-MS2 P0-U06: Knowledge Search
 * Search page with text input, domain/source filter, result cards with detail modal.
 */
import { useState } from 'react';
import { useKnowledgeSearch, useTribalSearch } from '../../hooks/useLearning';
import { LoadingState } from '../LoadingState';
import type { KnowledgeResult, LearningDomain } from '../../types/learning';

const DOMAIN_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Domains' },
  { value: 'CAD', label: 'CAD Design' },
  { value: 'CAM', label: 'CAM Programming' },
  { value: 'ShopPractice', label: 'Shop Practice' },
  { value: 'MachineOperation', label: 'Machine Operation' },
];

const SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Sources' },
  { value: 'textbook', label: 'Textbooks' },
  { value: 'tribal', label: 'Tribal Knowledge' },
  { value: 'standard', label: 'Standards' },
  { value: 'manual', label: 'Manuals' },
];

const DOMAIN_COLORS: Record<LearningDomain, string> = {
  CAD: 'bg-blue-100 text-blue-700',
  CAM: 'bg-emerald-100 text-emerald-700',
  ShopPractice: 'bg-amber-100 text-amber-700',
  MachineOperation: 'bg-violet-100 text-violet-700',
};

export function KnowledgeSearch() {
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('');
  const [source, setSource] = useState('');
  const [detail, setDetail] = useState<KnowledgeResult | null>(null);
  const { results: kResults, loading: kLoading, search: searchKnowledge } = useKnowledgeSearch();
  const { results: tResults, loading: tLoading, search: searchTribal } = useTribalSearch();

  const loading = kLoading || tLoading;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    const params = {
      query: query.trim(),
      ...(domain && { domain }),
      ...(source && { source }),
      limit: 20,
    };
    searchKnowledge(params);
    searchTribal({ query: query.trim(), limit: 10 });
  }

  // Merge and deduplicate results
  const allResults = [...(kResults ?? []), ...(tResults ?? [])]
    .filter((r, i, arr) => arr.findIndex(x => x.id === r.id) === i)
    .sort((a, b) => b.relevance_score - a.relevance_score);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Knowledge Search</h1>
        <p className="text-sm text-gray-500 mt-1">Search manufacturing knowledge base and tribal knowledge</p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search for manufacturing topics..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-prism-500 focus:border-prism-500"
        />
        <select
          value={domain}
          onChange={e => setDomain(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-prism-500"
        >
          {DOMAIN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={source}
          onChange={e => setSource(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-prism-500"
        >
          {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button
          type="submit"
          disabled={!query.trim()}
          className="px-6 py-2 bg-prism-600 text-white rounded-lg font-medium hover:bg-prism-700 disabled:opacity-50 transition-colors"
        >
          Search
        </button>
      </form>

      {loading && <LoadingState label="Searching..." />}

      {!loading && allResults.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{allResults.length} results</p>
          {allResults.map(r => (
            <button
              key={r.id}
              onClick={() => setDetail(r)}
              className="w-full text-left bg-white rounded-lg border border-gray-200 p-4 hover:border-prism-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{r.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DOMAIN_COLORS[r.domain]}`}>
                      {r.domain}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{r.source}</span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{r.excerpt}</p>
                  {r.tags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {r.tags.slice(0, 5).map(tag => (
                        <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="ml-4 text-right">
                  <div className="text-sm font-medium text-prism-600">{Math.round(r.relevance_score * 100)}%</div>
                  <div className="text-xs text-gray-400">match</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{detail.title}</h2>
                <div className="flex gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DOMAIN_COLORS[detail.domain]}`}>
                    {detail.domain}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{detail.source}</span>
                </div>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{detail.content}</div>
          </div>
        </div>
      )}
    </div>
  );
}
