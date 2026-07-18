import { useState, useEffect } from "react";
import { useKnowledgeSearch, useTribalSearch } from "../../hooks/useLearning";
import type { LearningDomain, KnowledgeEntry, TribalEntry } from "../../types/learning";

const DOMAIN_OPTIONS: { value: LearningDomain | ""; label: string }[] = [
  { value: "", label: "All Domains" },
  { value: "cad", label: "CAD" },
  { value: "cam", label: "CAM" },
  { value: "shop_practice", label: "Shop Practice" },
  { value: "machine_operation", label: "Machine Operation" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "All Sources" },
  { value: "documentation", label: "Documentation" },
  { value: "standards", label: "Standards" },
  { value: "best_practices", label: "Best Practices" },
  { value: "tribal", label: "Tribal Knowledge" },
] as const;

const DOMAIN_BADGE_COLORS: Record<string, string> = {
  cad: "bg-blue-100 text-blue-700",
  cam: "bg-green-100 text-green-700",
  shop_practice: "bg-amber-100 text-amber-700",
  machine_operation: "bg-purple-100 text-purple-700",
};

function KnowledgeCard({ entry, onSelect }: { entry: KnowledgeEntry; onSelect: (e: KnowledgeEntry) => void }) {
  return (
    <button onClick={() => onSelect(entry)} className="text-left w-full p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all bg-white">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DOMAIN_BADGE_COLORS[entry.domain] ?? "bg-slate-100 text-slate-600"}`}>
          {entry.domain.replace("_", " ")}
        </span>
        <span className="text-xs text-slate-400">{entry.source}</span>
        <span className="text-xs text-slate-400 ml-auto">{entry.relevance_score}% match</span>
      </div>
      <h3 className="font-medium text-slate-800 text-sm">{entry.title}</h3>
      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{entry.excerpt}</p>
      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {entry.tags.slice(0, 4).map((t) => (
            <span key={t} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{t}</span>
          ))}
        </div>
      )}
    </button>
  );
}

function TribalCard({ entry }: { entry: TribalEntry }) {
  return (
    <div className="p-4 rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Tribal</span>
        {entry.verified && <span className="text-xs text-green-600">Verified</span>}
        <span className="text-xs text-slate-400 ml-auto">{entry.upvotes} upvotes</span>
      </div>
      <h3 className="font-medium text-slate-800 text-sm">{entry.title}</h3>
      <p className="text-xs text-slate-500 mt-1">{entry.content}</p>
      {entry.source_operator && <div className="text-xs text-slate-400 mt-2">From: {entry.source_operator}</div>}
    </div>
  );
}

function DetailModal({ entry, onClose }: { entry: KnowledgeEntry; onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="knowledge-modal-title">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DOMAIN_BADGE_COLORS[entry.domain] ?? "bg-slate-100 text-slate-600"}`}>
              {entry.domain.replace("_", " ")}
            </span>
            <h2 id="knowledge-modal-title" className="text-xl font-bold text-slate-900 mt-2">{entry.title}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">{entry.content}</div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
          <span>Source: {entry.source}</span>
          {entry.updated_at && <span>&middot; Updated: {new Date(entry.updated_at).toLocaleDateString()}</span>}
        </div>
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {entry.tags.map((t) => <span key={t} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{t}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function KnowledgeSearch() {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState<LearningDomain | "">("");
  const [source, setSource] = useState("");
  const [tab, setTab] = useState<"knowledge" | "tribal">("knowledge");
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);

  const knowledge = useKnowledgeSearch();
  const tribal = useTribalSearch();

  const handleSearch = () => {
    if (!query.trim()) return;
    if (tab === "knowledge") {
      knowledge.execute({
        query,
        domain: domain || undefined,
        source: (source as "documentation" | "standards" | "best_practices" | "tribal") || undefined,
        limit: 20,
      });
    } else {
      tribal.execute({ query, limit: 20 });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Knowledge Search</h1>
      <p className="text-slate-500 text-sm mb-6">Search manufacturing knowledge base and tribal wisdom</p>

      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search for machining techniques, materials, best practices..."
          className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
        <button
          onClick={handleSearch}
          disabled={!query.trim() || knowledge.loading || tribal.loading}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {knowledge.loading || tribal.loading ? "..." : "Search"}
        </button>
      </div>

      {/* Filters + Tab toggle */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setTab("knowledge")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${tab === "knowledge" ? "bg-white shadow text-slate-800 font-medium" : "text-slate-500"}`}
          >
            Knowledge Base
          </button>
          <button
            onClick={() => setTab("tribal")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${tab === "tribal" ? "bg-white shadow text-slate-800 font-medium" : "text-slate-500"}`}
          >
            Tribal Knowledge
          </button>
        </div>
        {tab === "knowledge" && (
          <>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value as LearningDomain | "")}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
            >
              {DOMAIN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
            >
              {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </>
        )}
        {knowledge.data && tab === "knowledge" && (
          <span className="text-xs text-slate-400 ml-auto">{knowledge.data.total} results</span>
        )}
        {tribal.data && tab === "tribal" && (
          <span className="text-xs text-slate-400 ml-auto">{tribal.data.total} results</span>
        )}
      </div>

      {/* Results */}
      {tab === "knowledge" && knowledge.data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {knowledge.data.results.map((entry: KnowledgeEntry) => (
            <KnowledgeCard key={entry.id} entry={entry} onSelect={setSelectedEntry} />
          ))}
          {knowledge.data.results.length === 0 && (
            <div className="col-span-2 text-center py-12 text-slate-400">No results found. Try different search terms.</div>
          )}
        </div>
      )}

      {tab === "tribal" && tribal.data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tribal.data.results.map((entry: TribalEntry) => (
            <TribalCard key={entry.id} entry={entry} />
          ))}
          {tribal.data.results.length === 0 && (
            <div className="col-span-2 text-center py-12 text-slate-400">No tribal knowledge found.</div>
          )}
        </div>
      )}

      {!knowledge.data && !tribal.data && !knowledge.loading && !tribal.loading && (
        <div className="text-center py-16 text-slate-400">
          <div className="text-4xl mb-3">🔍</div>
          <div>Enter a search query to explore manufacturing knowledge</div>
        </div>
      )}

      {(knowledge.error || tribal.error) && (
        <div className="mt-4 text-sm text-red-500 bg-red-50 p-3 rounded-lg">{knowledge.error || tribal.error}</div>
      )}

      {selectedEntry && <DetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />}
    </div>
  );
}
