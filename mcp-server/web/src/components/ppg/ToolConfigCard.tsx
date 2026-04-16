import { useCallback, useState } from 'react';
import { ppgToolSearch } from '../../api/client';
import {
  Field,
  Input,
  Select,
  StatusPill,
} from '../workspace/WorkspacePrimitives';

export interface ToolSelection {
  id: string;
  name: string;
  type: string;
  diameter_mm: number;
  flutes: number;
  material: string;
  coating: string;
  manufacturer: string;
  max_doc_mm?: number;
  max_rpm?: number;
}

export interface ToolConfigCardProps {
  diameter: string;
  flutes: string;
  toolType: string;
  toolMaterial: string;
  onDiameterChange: (v: string) => void;
  onFlutesChange: (v: string) => void;
  onToolTypeChange: (v: string) => void;
  onToolMaterialChange: (v: string) => void;
  selectedTool: ToolSelection | null;
  onSelectTool: (tool: ToolSelection) => void;
}

const TOOL_TYPES = [
  { value: 'flat_endmill', label: 'Flat endmill' },
  { value: 'ball_endmill', label: 'Ball endmill' },
  { value: 'bull_endmill', label: 'Bull nose endmill' },
  { value: 'drill', label: 'Drill' },
  { value: 'face_mill', label: 'Face mill' },
  { value: 'chamfer_mill', label: 'Chamfer mill' },
  { value: 'slot_drill', label: 'Slot drill' },
  { value: 'thread_mill', label: 'Thread mill' },
  { value: 'reamer', label: 'Reamer' },
  { value: 'tap', label: 'Tap' },
  { value: 'insert_mill', label: 'Indexable mill' },
];

const TOOL_MATERIALS = [
  { value: 'carbide', label: 'Solid carbide' },
  { value: 'hss', label: 'HSS' },
  { value: 'cobalt_hss', label: 'Cobalt HSS' },
  { value: 'ceramic', label: 'Ceramic' },
  { value: 'cbn', label: 'CBN' },
  { value: 'pcd', label: 'PCD' },
  { value: 'cermet', label: 'Cermet' },
];

function unwrapToolResults(response: unknown): ToolSelection[] {
  if (!response || typeof response !== 'object') return [];
  const r = response as Record<string, unknown>;
  const data = r.result ?? r.data ?? r;
  if (!data || typeof data !== 'object') return [];
  const d = data as Record<string, unknown>;
  const items = d.tools ?? d.results ?? d.items;
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      id: String(item.id ?? item.catalog_id ?? ''),
      name: String(item.name ?? item.description ?? ''),
      type: String(item.type ?? item.tool_type ?? 'flat_endmill'),
      diameter_mm: Number(item.diameter_mm ?? item.diameter ?? item.d ?? 0),
      flutes: Number(item.flutes ?? item.number_of_flutes ?? item.z ?? 0),
      material: String(item.material ?? item.substrate ?? 'carbide'),
      coating: String(item.coating ?? item.coat ?? 'none'),
      manufacturer: String(item.manufacturer ?? item.brand ?? item.mfr ?? ''),
      max_doc_mm: item.max_doc_mm != null ? Number(item.max_doc_mm) : undefined,
      max_rpm: item.max_rpm != null ? Number(item.max_rpm) : undefined,
    }))
    .filter((t) => t.id && t.name);
}

export function ToolConfigCard({
  diameter,
  flutes,
  toolType,
  toolMaterial,
  onDiameterChange,
  onFlutesChange,
  onToolTypeChange,
  onToolMaterialChange,
  selectedTool,
  onSelectTool,
}: ToolConfigCardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ToolSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await ppgToolSearch({ query: q, limit: 20 });
      setResults(unwrapToolResults(res));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchInput = useCallback(
    (value: string) => {
      setSearchQuery(value);
      const id = setTimeout(() => doSearch(value), 300);
      return () => clearTimeout(id);
    },
    [doSearch],
  );

  const handleSelect = useCallback(
    (tool: ToolSelection) => {
      onSelectTool(tool);
      if (tool.diameter_mm > 0) onDiameterChange(String(tool.diameter_mm));
      if (tool.flutes > 0) onFlutesChange(String(tool.flutes));
      if (tool.type) onToolTypeChange(tool.type);
      if (tool.material) onToolMaterialChange(tool.material);
    },
    [onSelectTool, onDiameterChange, onFlutesChange, onToolTypeChange, onToolMaterialChange],
  );

  return (
    <div className="space-y-4">
      {/* Tool search */}
      <Field label="Search tool catalog (75K+ tools)">
        <Input
          aria-label="Tool search"
          value={searchQuery}
          onChange={(e) => handleSearchInput(e.target.value)}
          placeholder="e.g. Sandvik CoroMill 390, Kennametal 12mm, Seco R217..."
        />
      </Field>

      {/* Selected tool card */}
      {selectedTool && (
        <div className="rounded-[16px] border border-cyan-400/15 bg-cyan-400/[0.06] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-cyan-300">{selectedTool.name}</span>
            <StatusPill label={selectedTool.manufacturer} tone="sky" />
            {selectedTool.coating !== 'none' && (
              <StatusPill label={selectedTool.coating} tone="amber" />
            )}
          </div>
          <div className="mt-1 text-xs text-cyan-400/70">
            {'\u00D8'}{selectedTool.diameter_mm}mm | {selectedTool.flutes}F | {selectedTool.material}
            {selectedTool.max_doc_mm ? ` | max DoC ${selectedTool.max_doc_mm}mm` : ''}
          </div>
        </div>
      )}

      {/* Search results */}
      {loading && <div className="text-sm text-slate-400">Searching tools...</div>}

      {results.length > 0 && (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-[16px] border border-white/6 bg-white/[0.01] p-2">
          {results.map((tool) => (
            <button
              key={tool.id}
              className={`w-full rounded-[12px] border px-3 py-2 text-left text-sm transition ${
                selectedTool?.id === tool.id
                  ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200'
                  : 'border-transparent bg-transparent text-slate-300 hover:bg-white/[0.04]'
              }`}
              onClick={() => handleSelect(tool)}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">{tool.name}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {tool.manufacturer}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {'\u00D8'}{tool.diameter_mm}mm | {tool.flutes}F | {tool.material}
                {tool.coating !== 'none' ? ` | ${tool.coating}` : ''}
              </div>
            </button>
          ))}
        </div>
      )}

      {searched && !loading && results.length === 0 && searchQuery.length >= 2 && (
        <div className="text-sm text-slate-500">
          No tools found for "{searchQuery}". Configure manually below.
        </div>
      )}

      {/* Manual config fields */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tool diameter (mm)">
          <Input
            aria-label="Tool diameter"
            value={diameter}
            onChange={(e) => onDiameterChange(e.target.value)}
            placeholder="e.g. 12.7"
          />
        </Field>
        <Field label="Number of flutes">
          <Input
            aria-label="Flutes"
            value={flutes}
            onChange={(e) => onFlutesChange(e.target.value)}
            placeholder="e.g. 4"
          />
        </Field>
        <Field label="Tool type">
          <Select
            aria-label="Tool type"
            value={toolType}
            onChange={(e) => onToolTypeChange(e.target.value)}
          >
            {TOOL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Substrate">
          <Select
            aria-label="Tool material"
            value={toolMaterial}
            onChange={(e) => onToolMaterialChange(e.target.value)}
          >
            {TOOL_MATERIALS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </Select>
        </Field>
      </div>
    </div>
  );
}
