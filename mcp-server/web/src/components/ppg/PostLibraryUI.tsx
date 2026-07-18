/**
 * PostLibraryUI — Searchable post processor catalog component (PP-MS6/U-PP29)
 *
 * Grid of post cards with manufacturer, controller badges, capability tags.
 * Filter sidebar for manufacturer, machine type, controller family.
 * Click card to view detail and "Generate for my machine" CTA.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PanelCard,
  StatusPill,
  ActionButton,
  Input,
} from '../workspace/WorkspacePrimitives';

// ── Types ──────────────────────────────────────────────────────────

interface PostEntry {
  id: string;
  name: string;
  description: string;
  source: 'cps' | 'prism_native' | 'community';
  vendor: string;
  controller: string;
  controller_variant?: string;
  machine_types: string[];
  axes: number;
  capabilities: string[];
  version?: string;
  score?: { total: number };
  /** PPG-VAR-MS0 U07: Machine profile for pipeline pre-configuration */
  machine_profile?: {
    max_rpm: number;
    max_power_kW: number;
    rapid_x: number; rapid_y: number; rapid_z: number;
    volume_x: number; volume_y: number; volume_z: number;
    coolant_types: string[];
    recommended_features: string[];
  };
}

interface Facets {
  vendors: Record<string, number>;
  controllers: Record<string, number>;
  machine_types: Record<string, number>;
  sources: Record<string, number>;
}

interface PostLibraryUIProps {
  onSelectPost?: (post: PostEntry) => void;
  onGenerateForMachine?: (post: PostEntry) => void;
}

// ── Built-in catalog (fallback when API unavailable) ───────────────

const BUILT_IN_POSTS: PostEntry[] = [
  { id: 'haas-ngc-3ax', name: 'Haas NGC 3-Axis', description: 'Standard Haas Next Generation Control for VMC', source: 'cps', vendor: 'Haas', controller: 'haas_ngc', machine_types: ['mill'], axes: 3, capabilities: ['probing', 'hsm', 'subprograms'], machine_profile: { max_rpm: 8100, max_power_kW: 22.4, rapid_x: 25400, rapid_y: 25400, rapid_z: 15240, volume_x: 762, volume_y: 406, volume_z: 508, coolant_types: ['flood', 'tsc'], recommended_features: ['probing_cycles', 'high_speed_smoothing', 'subprograms'] } },
  { id: 'fanuc-31i-mill', name: 'Fanuc 31i Mill', description: 'Fanuc 31i-B for VMC/HMC', source: 'cps', vendor: 'Fanuc', controller: 'fanuc_31i', machine_types: ['mill'], axes: 3, capabilities: ['probing', 'hsm', 'tcp', 'subprograms'], machine_profile: { max_rpm: 12000, max_power_kW: 15, rapid_x: 42000, rapid_y: 42000, rapid_z: 36000, volume_x: 560, volume_y: 410, volume_z: 460, coolant_types: ['flood', 'tsc'], recommended_features: ['probing_cycles', 'high_speed_smoothing', 'subprograms'] } },
  { id: 'siemens-840d-5ax', name: 'Siemens 840D 5-Axis', description: 'Sinumerik 840D sl with CYCLE800/TRAORI', source: 'cps', vendor: 'Siemens', controller: 'siemens_840d', machine_types: ['mill', '5axis'], axes: 5, capabilities: ['hsm', 'tcp', 'probing', 'subprograms'], machine_profile: { max_rpm: 14000, max_power_kW: 35, rapid_x: 42000, rapid_y: 42000, rapid_z: 42000, volume_x: 500, volume_y: 450, volume_z: 400, coolant_types: ['flood', 'tsc', 'mql'], recommended_features: ['probing_cycles', 'high_speed_smoothing', 'rtcp', 'subprograms'] } },
  { id: 'heidenhain-tnc640', name: 'Heidenhain TNC 640', description: 'TNC 640 conversational + ISO', source: 'cps', vendor: 'Heidenhain', controller: 'heidenhain_tnc640', machine_types: ['mill', '5axis'], axes: 5, capabilities: ['probing', 'tcp', 'hsm'], machine_profile: { max_rpm: 18000, max_power_kW: 28, rapid_x: 40000, rapid_y: 40000, rapid_z: 40000, volume_x: 600, volume_y: 500, volume_z: 500, coolant_types: ['flood', 'mql'], recommended_features: ['probing_cycles', 'high_speed_smoothing', 'rtcp'] } },
  { id: 'mazak-smooth', name: 'Mazak SmoothAi', description: 'Mazak SmoothAi for Integrex/Variaxis', source: 'cps', vendor: 'Mazak', controller: 'mazak_smooth_ai', machine_types: ['mill', 'mill_turn'], axes: 5, capabilities: ['hsm', 'probing', 'subprograms'], machine_profile: { max_rpm: 12000, max_power_kW: 22, rapid_x: 42000, rapid_y: 42000, rapid_z: 36000, volume_x: 630, volume_y: 510, volume_z: 510, coolant_types: ['flood', 'tsc'], recommended_features: ['probing_cycles', 'high_speed_smoothing', 'rtcp', 'subprograms'] } },
  { id: 'okuma-osp300', name: 'Okuma OSP-P300', description: 'OSP-P300 for GENOS/Multus', source: 'cps', vendor: 'Okuma', controller: 'okuma_osp_p300', machine_types: ['mill', 'lathe'], axes: 3, capabilities: ['probing', 'subprograms'] },
  { id: 'brother-speedio', name: 'Brother Speedio', description: 'Brother CNC-C00 for Speedio series', source: 'cps', vendor: 'Brother', controller: 'brother_speedio', machine_types: ['mill'], axes: 3, capabilities: ['hsm'] },
  { id: 'doosan-fanuc', name: 'Doosan Fanuc', description: 'Doosan DNM/DVF with Fanuc control', source: 'cps', vendor: 'Doosan', controller: 'doosan_fanuc', machine_types: ['mill'], axes: 3, capabilities: ['probing', 'hsm', 'subprograms'] },
  { id: 'citizen-cincom', name: 'Citizen Cincom Swiss', description: 'Citizen Cincom L/M series Swiss-type', source: 'cps', vendor: 'Citizen', controller: 'citizen_cincom', machine_types: ['swiss'], axes: 3, capabilities: ['subprograms'] },
  { id: 'star-fanuc', name: 'Star Swiss Fanuc', description: 'Star SR/SB series Swiss lathe', source: 'cps', vendor: 'Star', controller: 'star_fanuc', machine_types: ['swiss'], axes: 3, capabilities: ['subprograms'] },
  { id: 'hurco-max5', name: 'Hurco WinMax', description: 'Hurco MAX5 with UltiMotion', source: 'cps', vendor: 'Hurco', controller: 'hurco_max5', machine_types: ['mill'], axes: 3, capabilities: ['hsm'] },
  { id: 'dmg-celos-siemens', name: 'DMG MORI CELOS (Siemens)', description: 'DMG MORI CELOS with Sinumerik', source: 'cps', vendor: 'DMG MORI', controller: 'dmg_celos_siemens', machine_types: ['mill', '5axis'], axes: 5, capabilities: ['hsm', 'tcp', 'probing', 'subprograms'] },
  { id: 'prism-universal', name: 'Kienzle Universal', description: 'Kienzle-native physics-optimized post with per-block S/F variability. Upload your NC program to optimize.', source: 'prism_native', vendor: 'Kienzle', controller: 'generic_iso', machine_types: ['mill', 'lathe', 'mill_turn'], axes: 3, capabilities: ['probing', 'hsm', 'tcp', 'ssv', 'subprograms', 'per_block_sf', 'kienzle_force', 'tool_life'], version: '8.3', machine_profile: { max_rpm: 12000, max_power_kW: 22, rapid_x: 30000, rapid_y: 30000, rapid_z: 20000, volume_x: 600, volume_y: 400, volume_z: 400, coolant_types: ['flood', 'tsc'], recommended_features: ['probing_cycles', 'high_speed_smoothing', 'subprograms'] } },
  { id: 'prism-haas-ngc', name: 'Kienzle Haas NGC', description: 'Physics-optimized Haas NGC post — Kienzle force model, per-block S/F, G187 HSM, prove-out derating.', source: 'prism_native', vendor: 'Kienzle', controller: 'haas_ngc', machine_types: ['mill'], axes: 3, capabilities: ['probing', 'hsm', 'subprograms', 'per_block_sf', 'kienzle_force', 'tool_life', 'prove_out'], version: '8.3', machine_profile: { max_rpm: 8100, max_power_kW: 22.4, rapid_x: 25400, rapid_y: 25400, rapid_z: 15240, volume_x: 762, volume_y: 406, volume_z: 508, coolant_types: ['flood', 'tsc'], recommended_features: ['probing_cycles', 'high_speed_smoothing', 'subprograms'] } },
  { id: 'prism-haas-5ax', name: 'Kienzle Haas UMC 5-Axis', description: 'Physics-optimized Haas UMC post — RTCP (G234), per-block S/F, tilted workplane, chatter SLD.', source: 'prism_native', vendor: 'Kienzle', controller: 'haas_ngc', machine_types: ['mill', '5axis'], axes: 5, capabilities: ['probing', 'hsm', 'tcp', 'subprograms', 'per_block_sf', 'kienzle_force', 'tool_life', 'rtcp', 'chatter_sld'], version: '8.3', machine_profile: { max_rpm: 8100, max_power_kW: 22.4, rapid_x: 25400, rapid_y: 25400, rapid_z: 15240, volume_x: 508, volume_y: 406, volume_z: 394, coolant_types: ['flood', 'tsc'], recommended_features: ['probing_cycles', 'high_speed_smoothing', 'rtcp', 'subprograms'] } },
  { id: 'prism-fanuc-31i', name: 'Kienzle Fanuc 31i', description: 'Physics-optimized Fanuc 31i post — per-block S/F, macro variables, Kienzle force, Taylor tool life.', source: 'prism_native', vendor: 'Kienzle', controller: 'fanuc_31i', machine_types: ['mill'], axes: 3, capabilities: ['probing', 'hsm', 'tcp', 'subprograms', 'per_block_sf', 'kienzle_force', 'tool_life', 'macro_variables'], version: '8.3', machine_profile: { max_rpm: 12000, max_power_kW: 15, rapid_x: 42000, rapid_y: 42000, rapid_z: 36000, volume_x: 560, volume_y: 410, volume_z: 460, coolant_types: ['flood', 'tsc'], recommended_features: ['probing_cycles', 'high_speed_smoothing', 'subprograms', 'macro_variables'] } },
  { id: 'prism-siemens-840d', name: 'Kienzle Siemens 840D', description: 'Physics-optimized Sinumerik 840D post — CYCLE832 HSM, TRAORI, per-block S/F, chatter SLD, thermal wear.', source: 'prism_native', vendor: 'Kienzle', controller: 'siemens_840d', machine_types: ['mill', '5axis'], axes: 5, capabilities: ['hsm', 'tcp', 'probing', 'subprograms', 'per_block_sf', 'kienzle_force', 'tool_life', 'rtcp', 'chatter_sld', 'thermal_wear', 'ssv'], version: '8.3', machine_profile: { max_rpm: 14000, max_power_kW: 35, rapid_x: 42000, rapid_y: 42000, rapid_z: 42000, volume_x: 500, volume_y: 450, volume_z: 400, coolant_types: ['flood', 'tsc', 'mql'], recommended_features: ['probing_cycles', 'high_speed_smoothing', 'rtcp', 'subprograms', 'ssv'] } },
  { id: 'prism-heidenhain-tnc640', name: 'Kienzle Heidenhain TNC 640', description: 'Physics-optimized TNC 640 post — M128 TCPM, per-block S/F, cycle-rich output, surface finish prediction.', source: 'prism_native', vendor: 'Kienzle', controller: 'heidenhain_tnc640', machine_types: ['mill', '5axis'], axes: 5, capabilities: ['probing', 'tcp', 'hsm', 'per_block_sf', 'kienzle_force', 'tool_life', 'rtcp', 'surface_finish'], version: '8.3', machine_profile: { max_rpm: 18000, max_power_kW: 28, rapid_x: 40000, rapid_y: 40000, rapid_z: 40000, volume_x: 600, volume_y: 500, volume_z: 500, coolant_types: ['flood', 'mql'], recommended_features: ['probing_cycles', 'high_speed_smoothing', 'rtcp'] } },
  { id: 'prism-mazak-smooth', name: 'Kienzle Mazak SmoothAi', description: 'Physics-optimized Mazak SmoothAi post — per-block S/F, mill-turn sync, Kienzle force, SSV.', source: 'prism_native', vendor: 'Kienzle', controller: 'mazak_smooth_ai', machine_types: ['mill', 'mill_turn'], axes: 5, capabilities: ['hsm', 'probing', 'subprograms', 'per_block_sf', 'kienzle_force', 'tool_life', 'rtcp', 'ssv'], version: '8.3', machine_profile: { max_rpm: 12000, max_power_kW: 22, rapid_x: 42000, rapid_y: 42000, rapid_z: 36000, volume_x: 630, volume_y: 510, volume_z: 510, coolant_types: ['flood', 'tsc'], recommended_features: ['probing_cycles', 'high_speed_smoothing', 'rtcp', 'subprograms', 'ssv'] } },
  { id: 'prism-okuma-osp', name: 'Kienzle Okuma OSP-P300', description: 'Physics-optimized Okuma OSP post — G270/G180, per-block S/F, G96/G97 CSS, Kienzle force model.', source: 'prism_native', vendor: 'Kienzle', controller: 'okuma_osp_p300', machine_types: ['mill', 'lathe', 'mill_turn'], axes: 3, capabilities: ['probing', 'subprograms', 'per_block_sf', 'kienzle_force', 'tool_life', 'css_control'], version: '8.3', machine_profile: { max_rpm: 5000, max_power_kW: 30, rapid_x: 30000, rapid_y: 30000, rapid_z: 30000, volume_x: 660, volume_y: 400, volume_z: 610, coolant_types: ['flood', 'tsc'], recommended_features: ['probing_cycles', 'subprograms'] } },
  { id: 'prism-dmg-celos', name: 'Kienzle DMG MORI CELOS', description: 'Physics-optimized DMG MORI CELOS post — Sinumerik or Fanuc, per-block S/F, 5-axis RTCP, chatter SLD.', source: 'prism_native', vendor: 'Kienzle', controller: 'dmg_celos_siemens', machine_types: ['mill', '5axis'], axes: 5, capabilities: ['hsm', 'tcp', 'probing', 'subprograms', 'per_block_sf', 'kienzle_force', 'tool_life', 'rtcp', 'chatter_sld'], version: '8.3', machine_profile: { max_rpm: 20000, max_power_kW: 35, rapid_x: 42000, rapid_y: 42000, rapid_z: 42000, volume_x: 500, volume_y: 500, volume_z: 400, coolant_types: ['flood', 'tsc', 'mql'], recommended_features: ['probing_cycles', 'high_speed_smoothing', 'rtcp', 'subprograms'] } },
];

// ── Filter helpers ─────────────────────────────────────────────────

const MACHINE_TYPE_LABELS: Record<string, string> = {
  mill: 'Mill', lathe: 'Lathe', mill_turn: 'Mill-Turn', swiss: 'Swiss',
  wire_edm: 'Wire EDM', sinker_edm: 'Sinker EDM', laser: 'Laser',
  waterjet: 'Waterjet', '5axis': '5-Axis',
};

const SOURCE_TONES: Record<string, 'sky' | 'emerald' | 'violet'> = {
  cps: 'sky', prism_native: 'emerald', community: 'violet',
};

// ── Component ──────────────────────────────────────────────────────

export function PostLibraryUI({ onSelectPost, onGenerateForMachine }: PostLibraryUIProps) {
  const [catalogPosts, setCatalogPosts] = useState<PostEntry[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [selectedPost, setSelectedPost] = useState<PostEntry | null>(null);

  // Load catalog from API, merge with built-in Kienzle posts
  useEffect(() => {
    if (catalogLoaded) return;
    (async () => {
      try {
        const res = await fetch('/api/v1/ppg/programs/catalog');
        const json = await res.json();
        if (json.ok && json.data?.cps_posts) {
          const apiPosts: PostEntry[] = json.data.cps_posts.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: `${p.vendor} ${p.name} — ${p.machine_types?.join(', ')} — ${p.axes}-axis`,
            source: 'cps' as const,
            vendor: p.vendor,
            controller: p.controller,
            machine_types: p.machine_types ?? ['mill'],
            axes: p.axes ?? 3,
            capabilities: [],
          }));
          setCatalogPosts(apiPosts);
        }
      } catch { /* API unavailable — use built-in only */ }
      setCatalogLoaded(true);
    })();
  }, [catalogLoaded]);

  // Kienzle-enhanced posts always on top, then catalog, then remaining built-in
  const posts = useMemo(() => {
    const prismPosts = BUILT_IN_POSTS.filter(p => p.source === 'prism_native');
    const builtInCps = BUILT_IN_POSTS.filter(p => p.source !== 'prism_native');
    if (catalogPosts.length > 0) {
      // Merge: Kienzle posts first, then catalog (which supersedes built-in CPS), then any built-in not in catalog
      const catalogIds = new Set(catalogPosts.map(p => p.id));
      const remainingBuiltIn = builtInCps.filter(p => !catalogIds.has(p.id));
      return [...prismPosts, ...catalogPosts, ...remainingBuiltIn];
    }
    return BUILT_IN_POSTS;
  }, [catalogPosts]);

  const filteredPosts = posts.filter((p) => {
    if (query && !p.name.toLowerCase().includes(query.toLowerCase()) &&
        !p.vendor.toLowerCase().includes(query.toLowerCase()) &&
        !p.controller.toLowerCase().includes(query.toLowerCase())) return false;
    if (vendorFilter && p.vendor !== vendorFilter) return false;
    if (typeFilter && !p.machine_types.includes(typeFilter)) return false;
    if (sourceFilter && p.source !== sourceFilter) return false;
    return true;
  });

  const vendors = [...new Set(posts.map((p) => p.vendor))].sort();
  const machineTypes = [...new Set(posts.flatMap((p) => p.machine_types))].sort();
  const prismCount = posts.filter(p => p.source === 'prism_native').length;
  const cpsCount = posts.filter(p => p.source === 'cps').length;

  const handleCardClick = useCallback((post: PostEntry) => {
    setSelectedPost(post);
    onSelectPost?.(post);
  }, [onSelectPost]);

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <Input
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            placeholder="Search posts by name, vendor, or controller..."
          />
        </div>
        <select
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200"
        >
          <option value="">All Vendors</option>
          {vendors.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200"
        >
          <option value="">All Types</option>
          {machineTypes.map((t) => <option key={t} value={t}>{MACHINE_TYPE_LABELS[t] ?? t}</option>)}
        </select>
        <div className="flex gap-1.5">
          <button onClick={() => setSourceFilter('')} className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${!sourceFilter ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}>All ({posts.length})</button>
          <button onClick={() => setSourceFilter('prism_native')} className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${sourceFilter === 'prism_native' ? 'bg-emerald-500/20 text-emerald-200' : 'text-slate-500 hover:text-slate-300'}`}>Kienzle ({prismCount})</button>
          <button onClick={() => setSourceFilter('cps')} className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${sourceFilter === 'cps' ? 'bg-sky-500/20 text-sky-200' : 'text-slate-500 hover:text-slate-300'}`}>CPS ({cpsCount})</button>
        </div>
        <span className="text-xs text-slate-500">{filteredPosts.length} shown</span>
      </div>

      {/* Post Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPosts.map((post) => (
          <button
            key={post.id}
            onClick={() => handleCardClick(post)}
            className={`group rounded-2xl border p-4 text-left transition-all hover:border-sky-500/40 hover:bg-slate-800/60 ${
              selectedPost?.id === post.id ? 'border-sky-500/60 bg-slate-800/80' : 'border-white/10 bg-slate-900/60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-100">{post.name}</div>
                <div className="mt-0.5 text-xs text-slate-400">{post.vendor}</div>
              </div>
              <StatusPill label={post.source === 'prism_native' ? 'Kienzle' : 'CPS'} tone={SOURCE_TONES[post.source] ?? 'sky'} />
            </div>
            <div className="mt-2 text-xs text-slate-500 line-clamp-2">{post.description}</div>
            <div className="mt-2 flex flex-wrap gap-1">
              <StatusPill label={post.controller.replace(/_/g, ' ')} tone="sky" />
              <StatusPill label={`${post.axes}-axis`} tone="violet" />
              {post.machine_types.map((t) => (
                <StatusPill key={t} label={MACHINE_TYPE_LABELS[t] ?? t} tone="emerald" />
              ))}
            </div>
            {post.capabilities.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {post.capabilities.slice(0, 4).map((c) => (
                  <span key={c} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">{c}</span>
                ))}
                {post.capabilities.length > 4 && (
                  <span className="text-[10px] text-slate-500">+{post.capabilities.length - 4}</span>
                )}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Detail Card */}
      {selectedPost && (
        <PanelCard
          title={selectedPost.name}
          subtitle={`${selectedPost.vendor} — ${selectedPost.controller.replace(/_/g, ' ')} — ${selectedPost.axes}-axis`}
        >
          <div className="space-y-3">
            <div className="text-sm text-slate-300">{selectedPost.description}</div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Capabilities</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {selectedPost.capabilities.map((c) => (
                  <StatusPill key={c} label={c} tone="sky" />
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Machine Types</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {selectedPost.machine_types.map((t) => (
                  <StatusPill key={t} label={MACHINE_TYPE_LABELS[t] ?? t} tone="emerald" />
                ))}
              </div>
            </div>
            {selectedPost.version && (
              <div className="text-xs text-slate-500">Version: {selectedPost.version}</div>
            )}
            <ActionButton
              onClick={() => onGenerateForMachine?.(selectedPost)}
            >
              Generate for My Machine
            </ActionButton>
          </div>
        </PanelCard>
      )}
    </div>
  );
}
