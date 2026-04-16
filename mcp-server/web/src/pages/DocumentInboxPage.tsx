/**
 * DocumentInboxPage — DocuRead: Document intake, classification, and part matching
 *
 * Provides:
 *   - Upload zone (drag-and-drop or click) for prints, POs, invoices, certs
 *   - Inbox list with status, type, and part number filters
 *   - Document detail panel with extracted data and matched parts
 *   - Dashboard stats (total, matched, unmatched, by type)
 */
import { useState, useCallback, useRef } from 'react';
import {
  inboxIngest,
  inboxList,
  inboxStats,
  type InboxItem,
  type InboxStats,
  type IngestResult,
} from '../api/inbox';

// ────────────────────────────────────────────────────────────────────────────
// Type badge colors
// ────────────────────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  blueprint: 'bg-blue-100 text-blue-800',
  purchase_order: 'bg-green-100 text-green-800',
  invoice: 'bg-yellow-100 text-yellow-800',
  packing_slip: 'bg-purple-100 text-purple-800',
  material_cert: 'bg-orange-100 text-orange-800',
  quote_request: 'bg-pink-100 text-pink-800',
  setup_sheet: 'bg-indigo-100 text-indigo-800',
  inspection: 'bg-teal-100 text-teal-800',
  program: 'bg-gray-100 text-gray-800',
  photo: 'bg-cyan-100 text-cyan-800',
  correspondence: 'bg-lime-100 text-lime-800',
  unknown: 'bg-gray-100 text-gray-500',
};

const STATUS_COLORS: Record<string, string> = {
  received: 'bg-gray-200 text-gray-700',
  classifying: 'bg-blue-200 text-blue-700',
  classified: 'bg-blue-100 text-blue-700',
  extracting: 'bg-amber-200 text-amber-700',
  extracted: 'bg-amber-100 text-amber-700',
  matched: 'bg-green-100 text-green-700',
  unmatched: 'bg-red-100 text-red-700',
  linked: 'bg-green-200 text-green-800',
  error: 'bg-red-200 text-red-800',
  archived: 'bg-gray-100 text-gray-500',
};

function Badge({ text, colorClass }: { text: string; colorClass: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${colorClass}`}>
      {text.replace(/_/g, ' ')}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Upload Zone
// ────────────────────────────────────────────────────────────────────────────
function UploadZone({
  onUpload,
  uploading,
}: {
  onUpload: (files: FileList) => void;
  uploading: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) onUpload(e.dataTransfer.files);
    },
    [onUpload],
  );

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff,.dxf,.dwg,.step,.stp,.iges,.igs,.nc,.tap,.mpf,.txt,.csv"
        className="hidden"
        onChange={(e) => e.target.files && onUpload(e.target.files)}
      />
      {uploading ? (
        <div className="text-blue-600">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full mb-2" />
          <p className="font-medium">Processing documents...</p>
        </div>
      ) : (
        <>
          <div className="text-4xl mb-2 text-gray-400">+</div>
          <p className="font-medium text-gray-700">Drop documents here or click to upload</p>
          <p className="text-sm text-gray-500 mt-1">
            Blueprints, POs, invoices, certs, programs — any shop document
          </p>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Stats Cards
// ────────────────────────────────────────────────────────────────────────────
function StatsRow({ stats }: { stats: InboxStats | null }) {
  if (!stats) return null;
  const cards = [
    { label: 'Total', value: stats.total_items, color: 'text-gray-900' },
    { label: 'Matched', value: stats.matched_count, color: 'text-green-600' },
    { label: 'Unmatched', value: stats.unmatched_count, color: 'text-red-600' },
    { label: 'Today', value: stats.today_count, color: 'text-blue-600' },
  ];
  return (
    <div className="grid grid-cols-4 gap-4 mb-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">{c.label}</div>
          <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Inbox Table
// ────────────────────────────────────────────────────────────────────────────
function InboxTable({
  items,
  selected,
  onSelect,
}: {
  items: InboxItem[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
          <tr>
            <th className="px-4 py-3 text-left">Document</th>
            <th className="px-4 py-3 text-left">Type</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Part #s</th>
            <th className="px-4 py-3 text-left">Received</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No documents yet. Upload to get started.</td></tr>
          )}
          {items.map((item) => (
            <tr
              key={item.id}
              className={`cursor-pointer hover:bg-gray-50 ${selected === item.id ? 'bg-blue-50' : ''}`}
              onClick={() => onSelect(item.id)}
            >
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900 truncate max-w-[200px]">{item.original_name}</div>
                <div className="text-xs text-gray-400">{item.id}</div>
              </td>
              <td className="px-4 py-3">
                <Badge text={item.document_type} colorClass={TYPE_COLORS[item.document_type] || TYPE_COLORS.unknown} />
              </td>
              <td className="px-4 py-3">
                <Badge text={item.status} colorClass={STATUS_COLORS[item.status] || STATUS_COLORS.received} />
              </td>
              <td className="px-4 py-3">
                {item.part_numbers.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {item.part_numbers.slice(0, 3).map((pn) => (
                      <span key={pn} className="bg-gray-100 text-gray-700 text-xs px-1.5 py-0.5 rounded">{pn}</span>
                    ))}
                    {item.part_numbers.length > 3 && (
                      <span className="text-xs text-gray-400">+{item.part_numbers.length - 3}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400 text-xs">none</span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">
                {new Date(item.received_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────��───────────
// Detail Panel
// ────────────────────────────────────────────────────────────────────────────
function DetailPanel({ item }: { item: InboxItem }) {
  const data = item.extracted_data as Record<string, unknown>;
  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div>
        <h3 className="font-bold text-lg text-gray-900 truncate">{item.original_name}</h3>
        <div className="flex gap-2 mt-1">
          <Badge text={item.document_type} colorClass={TYPE_COLORS[item.document_type] || TYPE_COLORS.unknown} />
          <Badge text={item.status} colorClass={STATUS_COLORS[item.status] || STATUS_COLORS.received} />
          <span className="text-xs text-gray-400">
            {(item.classification_confidence * 100).toFixed(0)}% confidence
          </span>
        </div>
      </div>

      {/* Part Numbers */}
      {item.part_numbers.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-600 mb-1">Part Numbers</h4>
          <div className="flex flex-wrap gap-1">
            {item.part_numbers.map((pn) => {
              const isMatched = item.linked_records.some((r) => r.label === pn);
              return (
                <span
                  key={pn}
                  className={`text-xs px-2 py-1 rounded ${isMatched ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                >
                  {pn} {isMatched ? '(matched)' : '(unmatched)'}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Extracted Fields */}
      <div>
        <h4 className="text-sm font-semibold text-gray-600 mb-1">Extracted Data</h4>
        <div className="space-y-1 text-sm">
          {data.title && <Field label="Title" value={String(data.title)} />}
          {data.reference_number && <Field label="Reference #" value={String(data.reference_number)} />}
          {data.revision && <Field label="Revision" value={String(data.revision)} />}
          {data.material && <Field label="Material" value={String(data.material)} />}
          {data.company_name && <Field label="Company" value={String(data.company_name)} />}
          {data.document_date && <Field label="Date" value={String(data.document_date)} />}
          {data.total_amount != null && <Field label="Amount" value={`$${Number(data.total_amount).toLocaleString()}`} />}
          {data.custom_fields && Object.entries(data.custom_fields as Record<string, string>).map(([k, v]) => (
            <Field key={k} label={k.replace(/_/g, ' ')} value={v} />
          ))}
        </div>
      </div>

      {/* Line Items */}
      {data.line_items && Array.isArray(data.line_items) && (data.line_items as Array<Record<string, unknown>>).length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-600 mb-1">Line Items</h4>
          <div className="text-xs space-y-1">
            {(data.line_items as Array<Record<string, unknown>>).map((li, i) => (
              <div key={i} className="flex justify-between bg-gray-50 px-2 py-1 rounded">
                <span>{li.part_number ? `${li.part_number} — ` : ''}{String(li.description)}</span>
                <span>x{String(li.quantity)} {li.total != null && `$${Number(li.total).toLocaleString()}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linked Records */}
      {item.linked_records.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-600 mb-1">Linked Records</h4>
          <div className="flex flex-wrap gap-1">
            {item.linked_records.map((r) => (
              <span key={r.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                {r.type}: {r.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {item.tags.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-600 mb-1">Tags</h4>
          <div className="flex flex-wrap gap-1">
            {item.tags.map((t) => (
              <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {item.notes.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-600 mb-1">Notes</h4>
          <div className="text-xs space-y-1 text-gray-500">
            {item.notes.map((n, i) => <div key={i}>{n}</div>)}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="text-xs text-gray-400 space-y-0.5 pt-2 border-t">
        <div>Received: {new Date(item.received_at).toLocaleString()}</div>
        {item.classified_at && <div>Classified: {new Date(item.classified_at).toLocaleString()}</div>}
        {item.extracted_at && <div>Extracted: {new Date(item.extracted_at).toLocaleString()}</div>}
        {item.matched_at && <div>Matched: {new Date(item.matched_at).toLocaleString()}</div>}
        {item.ingested_by && <div>Ingested by: {item.ingested_by}</div>}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <span className="text-gray-500 w-28 flex-shrink-0">{label}:</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────────────────────
export function DocumentInboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [stats, setStatsData] = useState<InboxStats | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState({ type: '', status: '', query: '' });
  const [lastUpload, setLastUpload] = useState<IngestResult[]>([]);

  // Load data on mount
  const loaded = useRef(false);
  if (!loaded.current) {
    loaded.current = true;
    inboxList().then((r) => setItems(r.items)).catch(() => {});
    inboxStats().then((s) => setStatsData(s)).catch(() => {});
  }

  const refresh = useCallback(async () => {
    try {
      const [listRes, statsRes] = await Promise.all([
        inboxList({ document_type: filter.type || undefined, status: filter.status || undefined, query: filter.query || undefined }),
        inboxStats(),
      ]);
      setItems(listRes.items);
      setStatsData(statsRes);
    } catch { /* API not available */ }
  }, [filter]);

  const handleUpload = useCallback(async (files: FileList) => {
    setUploading(true);
    const results: IngestResult[] = [];
    for (const file of Array.from(files)) {
      try {
        const base64 = await fileToBase64(file);
        const result = await inboxIngest({
          content_base64: base64,
          filename: file.name,
          mime_type: file.type || undefined,
        });
        results.push(result);
      } catch (err) {
        console.error(`Upload failed for ${file.name}:`, err);
      }
    }
    setLastUpload(results);
    setUploading(false);
    await refresh();
    // Auto-select the first uploaded item
    if (results.length > 0) {
      setSelectedId(results[0].inbox_item.id);
    }
  }, [refresh]);

  const selectedItem = items.find((i) => i.id === selectedId) || null;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Inbox</h1>
          <p className="text-sm text-gray-500">
            DocuRead: intake prints, POs, invoices, certs — auto-classify and match to part numbers
          </p>
        </div>
        <button
          onClick={refresh}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
        >
          Refresh
        </button>
      </div>

      <StatsRow stats={stats} />

      <UploadZone onUpload={handleUpload} uploading={uploading} />

      {/* Last Upload Summary */}
      {lastUpload.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
          <span className="font-medium text-green-800">
            Uploaded {lastUpload.length} document{lastUpload.length > 1 ? 's' : ''}:
          </span>{' '}
          {lastUpload.map((r) => (
            <span key={r.inbox_item.id} className="inline-flex items-center gap-1 mr-3">
              <Badge text={r.classification.type} colorClass={TYPE_COLORS[r.classification.type] || TYPE_COLORS.unknown} />
              <span className="text-green-700">{r.inbox_item.original_name}</span>
              {r.matching.matched && <span className="text-green-600 text-xs">(matched)</span>}
            </span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <select
          className="px-3 py-1.5 border rounded text-sm"
          value={filter.type}
          onChange={(e) => { setFilter((f) => ({ ...f, type: e.target.value })); }}
        >
          <option value="">All Types</option>
          {Object.keys(TYPE_COLORS).filter((t) => t !== 'unknown').map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select
          className="px-3 py-1.5 border rounded text-sm"
          value={filter.status}
          onChange={(e) => { setFilter((f) => ({ ...f, status: e.target.value })); }}
        >
          <option value="">All Statuses</option>
          {Object.keys(STATUS_COLORS).map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search by part number, name, or content..."
          className="flex-1 px-3 py-1.5 border rounded text-sm"
          value={filter.query}
          onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && refresh()}
        />
        <button
          onClick={refresh}
          className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Search
        </button>
      </div>

      {/* Content: Table + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <InboxTable items={items} selected={selectedId} onSelect={setSelectedId} />
        </div>
        <div>
          {selectedItem ? (
            <DetailPanel item={selectedItem} />
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
              Select a document to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Convert File to base64 string */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data URI prefix
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
