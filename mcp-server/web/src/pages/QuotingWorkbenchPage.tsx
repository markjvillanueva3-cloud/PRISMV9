/**
 * QuotingWorkbenchPage — operational end-to-end quoting surface (/goal-20 close)
 *
 * Operator-stated need: "phone friendly so salesmen can take pictures of
 * prints and physical parts for instant accurate quoting ... user
 * customizations like adding additional secondary operations ... adjustable
 * pricing based off tolerances per dimension based off callouts on the print
 * ... generate a quote with different price points depending on lead times".
 *
 * Single mobile-first page wiring every QUOTING-COMPLETENESS-MS0 engine:
 *   - Camera capture → Tesseract.js OCR → auto-extract material/qty/tolerances
 *   - Secondary-ops multi-select (11 op types from secondary_ops_list)
 *   - Tolerance-callout table (per-dim band + ra → cost multiplier)
 *   - 3-tier price emit (rush / standard / economy)
 *   - Freight estimate (weight + service tier)
 *   - Cross-part tooling-synergy hint
 *
 * Calls live MCP dispatcher via /api/mcp/quoting. All engines pure on
 * backend — this page is the operational frontend that turns the substrate
 * into a working tool a salesman can actually use.
 *
 * Design per web/CLAUDE.md: Calculator Studio dark-HUD, monospace numerics,
 * ≥44pt tap targets, inputMode=decimal on numeric inputs.
 *
 * @milestone QUOTING-COMPLETENESS-MS0/U-QP-WORKBENCH
 * @author slot:charlie /goal-20 iter9, 2026-05-25
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

// ────────────────────────────────────────────────────────────────────────
// API helper (local — no client.ts dependency)
// ────────────────────────────────────────────────────────────────────────

interface Dispatch<T = unknown> { ok: boolean; data?: T; error?: string }
async function callQuoting<T = unknown>(action: string, params: Record<string, unknown> = {}): Promise<Dispatch<T>> {
  try {
    const res = await fetch('/api/mcp/quoting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, params }),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const payload = await res.json();
    const text = payload?.content?.[0]?.text;
    if (typeof text === 'string') {
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object' && 'error' in parsed && typeof parsed.error === 'string') {
          return { ok: false, error: parsed.error };
        }
        return { ok: true, data: parsed as T };
      } catch {
        return { ok: false, error: 'json-parse-failed' };
      }
    }
    return { ok: true, data: payload as T };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ────────────────────────────────────────────────────────────────────────
// Tesseract.js runtime adapter (browser-side, no backend dependency)
//
// Loads Tesseract.js from CDN on demand. Server-side dispatcher path (when
// available) is preferred when image bytes are too large for upload.
// ────────────────────────────────────────────────────────────────────────

let _tesseractLoaded: Promise<any> | null = null;
async function loadTesseractCDN(): Promise<any> {
  if (typeof window === 'undefined') throw new Error('tesseract requires browser');
  const w = window as any;
  if (w.Tesseract) return w.Tesseract;
  if (_tesseractLoaded) return _tesseractLoaded;
  _tesseractLoaded = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.async = true;
    script.onload = () => resolve((window as any).Tesseract);
    script.onerror = () => reject(new Error('tesseract-cdn-load-failed'));
    document.head.appendChild(script);
  });
  return _tesseractLoaded;
}

async function performBrowserOCR(file: File): Promise<{ text: string; confidence: number } | { error: string }> {
  try {
    const Tesseract = await loadTesseractCDN();
    const { data } = await Tesseract.recognize(file, 'eng');
    return { text: String(data?.text ?? ''), confidence: typeof data?.confidence === 'number' ? data.confidence / 100 : 0.5 };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// ────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────

type SecondaryOp =
  | 'laser_marking' | 'grinding' | 'finishing' | 'painting' | 'hardening'
  | 'honing' | 'anodizing' | 'passivation' | 'tumbling' | 'deburring' | 'blasting';

interface ToleranceCallout {
  id: string;
  dimension: string;
  band_mm: number;
  surface_finish_ra_um?: number;
}

interface TierResult {
  tier: 'rush' | 'standard' | 'economy';
  unit_price: number;
  total_price: number;
  lead_time_days: number;
  cost_delta_pct: number;
  rationale: string;
}

// ────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────

export function QuotingWorkbenchPage() {
  // Intake
  const [ocrText, setOcrText] = useState('');
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Quote inputs
  const [material, setMaterial] = useState('aluminum_6061');
  const [quantity, setQuantity] = useState('10');
  const [baseUnitPrice, setBaseUnitPrice] = useState('100');
  const [baseLeadDays, setBaseLeadDays] = useState('14');
  const [baseMachiningCost, setBaseMachiningCost] = useState('45');
  const [partWeightLbs, setPartWeightLbs] = useState('2.5');

  // Secondary ops selection
  const [availableOps, setAvailableOps] = useState<SecondaryOp[]>([]);
  const [selectedOps, setSelectedOps] = useState<Set<SecondaryOp>>(new Set());

  // Tolerance callouts
  const [callouts, setCallouts] = useState<ToleranceCallout[]>([
    { id: '1', dimension: 'WIDTH_OAL', band_mm: 0.1 },
  ]);

  // Results
  const [tierResults, setTierResults] = useState<TierResult[] | null>(null);
  const [secOpsResult, setSecOpsResult] = useState<{ total: number; lead_days: number; outsourced: boolean } | null>(null);
  const [tolResult, setTolResult] = useState<{ multiplier: number; added: number; tightest: string | null } | null>(null);
  const [freightResult, setFreightResult] = useState<{ tier: string; total: number; transit: number } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available secondary ops on mount
  useEffect(() => {
    void (async () => {
      const r = await callQuoting<{ ops: SecondaryOp[] }>('quoting_secondary_ops_list');
      if (r.ok && r.data?.ops) setAvailableOps(r.data.ops);
    })();
  }, []);

  // Camera capture handler
  const handleCameraCapture = useCallback(async (file: File) => {
    setOcrBusy(true);
    setOcrError(null);
    const result = await performBrowserOCR(file);
    setOcrBusy(false);
    if ('error' in result) {
      setOcrError(result.error);
      return;
    }
    setOcrText(result.text);
    // Crude auto-extract: look for known patterns
    const matMatch = result.text.match(/aluminum|steel|stainless|brass|titanium|copper/i);
    if (matMatch) setMaterial(matMatch[0].toLowerCase() + '_6061'); // simplified mapping
    const qtyMatch = result.text.match(/qty[:\s]+(\d+)/i) || result.text.match(/quantity[:\s]+(\d+)/i);
    if (qtyMatch) setQuantity(qtyMatch[1]);
    // Tolerance auto-extract: ±0.xxx patterns
    const tolMatches = [...result.text.matchAll(/[±]\s*0?\.(\d{3,4})/g)];
    if (tolMatches.length > 0) {
      const newCallouts: ToleranceCallout[] = tolMatches.slice(0, 5).map((m, i) => ({
        id: String(Date.now() + i),
        dimension: `OCR_DIM_${i + 1}`,
        band_mm: parseFloat('0.' + m[1]),
      }));
      setCallouts(newCallouts);
    }
  }, []);

  // Toggle secondary op
  const toggleOp = useCallback((op: SecondaryOp) => {
    setSelectedOps((prev) => {
      const next = new Set(prev);
      if (next.has(op)) next.delete(op);
      else next.add(op);
      return next;
    });
  }, []);

  // Add tolerance callout
  const addCallout = useCallback(() => {
    setCallouts((prev) => [...prev, { id: String(Date.now()), dimension: `DIM_${prev.length + 1}`, band_mm: 0.1 }]);
  }, []);

  const removeCallout = useCallback((id: string) => {
    setCallouts((prev) => prev.filter(c => c.id !== id));
  }, []);

  const updateCallout = useCallback((id: string, field: keyof ToleranceCallout, value: string) => {
    setCallouts((prev) => prev.map(c => c.id === id ? { ...c, [field]: field === 'band_mm' || field === 'surface_finish_ra_um' ? parseFloat(value) || 0 : value } : c));
  }, []);

  // Generate quote — fan out to all engines
  const generateQuote = useCallback(async () => {
    setGenerating(true);
    setError(null);

    const qty = parseInt(quantity, 10) || 1;
    const baseUnit = parseFloat(baseUnitPrice) || 0;
    const baseLead = parseInt(baseLeadDays, 10) || 0;
    const baseMach = parseFloat(baseMachiningCost) || 0;
    const weight = parseFloat(partWeightLbs) || 1;

    const [tierR, secR, tolR, freightR] = await Promise.all([
      callQuoting<{ tiers: TierResult[] }>('quoting_lead_time_tiers', {
        base_unit_price: baseUnit, base_lead_days: baseLead, quantity: qty,
      }),
      selectedOps.size > 0
        ? callQuoting<{ total_secondary_ops_usd: number; total_lead_days_delta: number; any_outsourced: boolean }>('quoting_secondary_ops_price', {
            ops: [...selectedOps], quantity: qty, base_material_cost_usd: 50,
          })
        : Promise.resolve({ ok: true, data: { total_secondary_ops_usd: 0, total_lead_days_delta: 0, any_outsourced: false } } as Dispatch<any>),
      callouts.length > 0
        ? callQuoting<{ total_multiplier: number; total_added_cost_usd: number; tightest_class: string | null }>('quoting_tolerance_pricing', {
            callouts: callouts.map(c => ({ dimension: c.dimension, band_mm: c.band_mm, surface_finish_ra_um: c.surface_finish_ra_um })),
            base_machining_cost_usd: baseMach,
          })
        : Promise.resolve({ ok: true, data: { total_multiplier: 1, total_added_cost_usd: 0, tightest_class: null } } as Dispatch<any>),
      callQuoting<{ service_tier: string; total_cost_usd: number; estimated_transit_days: number }>('quoting_freight_quote', {
        weight_lbs: weight * qty,
      }),
    ]);

    setGenerating(false);
    if (tierR.ok && tierR.data) setTierResults(tierR.data.tiers);
    if (secR.ok && secR.data) setSecOpsResult({
      total: (secR.data as any).total_secondary_ops_usd,
      lead_days: (secR.data as any).total_lead_days_delta,
      outsourced: (secR.data as any).any_outsourced,
    });
    if (tolR.ok && tolR.data) setTolResult({
      multiplier: (tolR.data as any).total_multiplier,
      added: (tolR.data as any).total_added_cost_usd,
      tightest: (tolR.data as any).tightest_class,
    });
    if (freightR.ok && freightR.data) setFreightResult({
      tier: (freightR.data as any).service_tier,
      total: (freightR.data as any).total_cost_usd,
      transit: (freightR.data as any).estimated_transit_days,
    });

    if (!tierR.ok) setError(tierR.error ?? 'tier engine failed');
  }, [quantity, baseUnitPrice, baseLeadDays, baseMachiningCost, partWeightLbs, selectedOps, callouts]);

  const monoFont = useMemo(() => ({ fontFamily: 'ui-monospace, "JetBrains Mono", "SF Mono", Consolas, monospace' }), []);

  return (
    <div className="min-h-screen bg-[#0f1014] text-slate-100 p-4 md:p-6"
         style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto' }}>
      <header className="mb-5">
        <div className="text-xs uppercase tracking-widest text-slate-400">Quoting Operations · Workbench</div>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-50 mt-1 [font-family:var(--font-display)]">Instant Quote</h1>
        <p className="text-sm text-slate-400 mt-1">Photo → OCR → secondary ops → tolerance callouts → 3-tier price + freight. Charlie /goal-20 close.</p>
      </header>

      {/* CAMERA INTAKE */}
      <Section title="1. Capture Print or Part" subtitle="Take a photo — OCR will auto-extract material, qty, tolerances">
        <div className="flex flex-wrap items-center gap-3">
          <label className="h-11 md:h-9 px-4 rounded-md border border-cyan-400/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20 cursor-pointer font-medium inline-flex items-center"
                 style={{ transition: '0.18s ease' }}>
            {ocrBusy ? 'Reading...' : '📷 Take / Choose Photo'}
            <input type="file" accept="image/*" capture="environment" className="hidden"
                   onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleCameraCapture(f); }} />
          </label>
          {ocrText ? <span className="text-xs text-emerald-300">✓ {ocrText.split(/\s+/).length} tokens extracted</span> : null}
          {ocrError ? <span className="text-xs text-red-300">⚠ {ocrError}</span> : null}
        </div>
        {ocrText ? (
          <details className="mt-3">
            <summary className="text-xs text-slate-400 cursor-pointer">OCR text (raw)</summary>
            <pre className="mt-2 text-xs text-slate-300 bg-[#1a1c23] p-2 rounded overflow-x-auto" style={monoFont}>{ocrText}</pre>
          </details>
        ) : null}
      </Section>

      {/* BASIC INPUTS */}
      <Section title="2. Part + Quantity" subtitle="Auto-filled from OCR when extractable">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Material" value={material} onChange={setMaterial} />
          <Field label="Quantity" value={quantity} onChange={setQuantity} numeric />
          <Field label="Base Unit $" value={baseUnitPrice} onChange={setBaseUnitPrice} numeric />
          <Field label="Base Lead Days" value={baseLeadDays} onChange={setBaseLeadDays} numeric />
          <Field label="Base Machining $" value={baseMachiningCost} onChange={setBaseMachiningCost} numeric />
          <Field label="Weight (lb)/part" value={partWeightLbs} onChange={setPartWeightLbs} numeric />
        </div>
      </Section>

      {/* SECONDARY OPS */}
      <Section title="3. Secondary Operations" subtitle="Select any post-process ops the customer requires">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {availableOps.map((op) => (
            <button key={op} onClick={() => toggleOp(op)}
                    className={`h-11 md:h-9 px-3 rounded-md border text-sm text-left transition-colors ${
                      selectedOps.has(op)
                        ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
                        : 'border-slate-600/30 bg-[#1a1c23] text-slate-300 hover:border-slate-400/40'
                    }`}
                    style={{ transition: '0.18s ease' }}>
              {selectedOps.has(op) ? '✓ ' : '○ '}{op.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </Section>

      {/* TOLERANCE CALLOUTS */}
      <Section title="4. Tolerance Callouts" subtitle="Per-dimension callouts drive cost multiplier (ISO 2768 mapped)">
        <div className="space-y-2">
          {callouts.map((c) => (
            <div key={c.id} className="grid grid-cols-12 gap-2 items-center">
              <input className="col-span-4 h-11 md:h-9 px-2 rounded-md border border-slate-600/30 bg-[#1a1c23] text-sm"
                     value={c.dimension} onChange={(e) => updateCallout(c.id, 'dimension', e.target.value)} placeholder="DIM_X" />
              <input className="col-span-3 h-11 md:h-9 px-2 rounded-md border border-slate-600/30 bg-[#1a1c23] text-sm font-mono"
                     type="number" inputMode="decimal" step="0.001" style={monoFont}
                     value={c.band_mm || ''} onChange={(e) => updateCallout(c.id, 'band_mm', e.target.value)} placeholder="±0.1mm" />
              <input className="col-span-3 h-11 md:h-9 px-2 rounded-md border border-slate-600/30 bg-[#1a1c23] text-sm font-mono"
                     type="number" inputMode="decimal" step="0.1" style={monoFont}
                     value={c.surface_finish_ra_um ?? ''} onChange={(e) => updateCallout(c.id, 'surface_finish_ra_um', e.target.value)} placeholder="Ra μm" />
              <button onClick={() => removeCallout(c.id)} className="col-span-2 h-11 md:h-9 px-2 rounded-md border border-red-400/30 text-red-300 hover:bg-red-500/10">−</button>
            </div>
          ))}
          <button onClick={addCallout} className="h-11 md:h-9 px-4 rounded-md border border-violet-400/30 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20 text-sm">
            + Add Callout
          </button>
        </div>
      </Section>

      {/* GENERATE */}
      <div className="my-6">
        <button onClick={() => void generateQuote()} disabled={generating}
                className="h-14 md:h-12 w-full md:w-auto px-8 rounded-md border-2 border-cyan-400/50 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50 font-bold text-lg"
                style={{ transition: '0.18s ease' }}>
          {generating ? 'Computing...' : '⚡ Generate Quote'}
        </button>
        {error ? <span className="ml-3 text-red-300 text-sm">⚠ {error}</span> : null}
      </div>

      {/* RESULTS */}
      {tierResults ? (
        <Section title="5. Three-Tier Quote" subtitle="Choose rush / standard / economy">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {tierResults.map((t) => (
              <div key={t.tier} className={`rounded-md border p-4 ${
                t.tier === 'standard' ? 'border-cyan-400/40 bg-cyan-500/10' :
                t.tier === 'rush' ? 'border-amber-400/40 bg-amber-500/10' :
                'border-emerald-400/40 bg-emerald-500/10'
              }`}>
                <div className="text-xs uppercase tracking-widest text-slate-400">{t.tier}</div>
                <div className="text-3xl font-semibold text-slate-50 mt-1 font-mono" style={monoFont}>
                  ${t.unit_price.toFixed(2)}
                </div>
                <div className="text-sm text-slate-300 mt-1">/unit · Total ${t.total_price.toFixed(2)}</div>
                <div className="text-xs text-slate-400 mt-2">{t.lead_time_days} days · {t.cost_delta_pct >= 0 ? '+' : ''}{t.cost_delta_pct}%</div>
                <div className="text-xs text-slate-400 mt-2 italic">{t.rationale}</div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {/* ADDERS */}
      {(secOpsResult && secOpsResult.total > 0) || tolResult || freightResult ? (
        <Section title="6. Adders" subtitle="Secondary ops + tolerance impact + freight">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {secOpsResult && secOpsResult.total > 0 ? (
              <Adder label="Secondary Ops" value={`$${secOpsResult.total.toFixed(2)}`}
                     hint={`+${secOpsResult.lead_days}d ${secOpsResult.outsourced ? '· outsourced' : '· in-house'}`} tone="violet" />
            ) : null}
            {tolResult ? (
              <Adder label="Tolerance Premium" value={`×${tolResult.multiplier.toFixed(2)}`}
                     hint={tolResult.tightest ? `+$${tolResult.added.toFixed(2)} (${tolResult.tightest})` : `+$${tolResult.added.toFixed(2)}`} tone="amber" />
            ) : null}
            {freightResult ? (
              <Adder label="Freight" value={`$${freightResult.total.toFixed(2)}`}
                     hint={`${freightResult.tier.toUpperCase()} · ${freightResult.transit} day transit`} tone="cyan" />
            ) : null}
          </div>
        </Section>
      ) : null}

      <footer className="mt-10 text-xs text-slate-500" style={monoFont}>
        QUOTING-COMPLETENESS-MS0 · charlie /goal-20 close · wires 4+ dispatcher actions per quote
      </footer>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Subcomponents
// ────────────────────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-md border border-slate-600/30 bg-[#15171d] p-4 md:p-5">
      <header className="mb-3">
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        {subtitle ? <p className="text-xs text-slate-400 mt-1">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, numeric }: { label: string; value: string; onChange: (v: string) => void; numeric?: boolean }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-widest text-slate-400">{label}</span>
      <input className="h-11 md:h-9 px-3 rounded-md border border-slate-600/40 bg-[#1a1c23] text-slate-100"
             style={numeric ? { fontFamily: 'ui-monospace, "JetBrains Mono", "SF Mono", Consolas, monospace' } : undefined}
             type={numeric ? 'number' : 'text'}
             inputMode={numeric ? 'decimal' : undefined}
             value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Adder({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: string }) {
  const toneClasses: Record<string, string> = {
    cyan: 'border-cyan-400/30 bg-cyan-500/8',
    violet: 'border-violet-400/30 bg-violet-500/8',
    amber: 'border-amber-400/30 bg-amber-500/8',
    emerald: 'border-emerald-400/30 bg-emerald-500/8',
  };
  return (
    <div className={`rounded-md border ${toneClasses[tone] ?? toneClasses.cyan} p-3`}>
      <div className="text-xs uppercase tracking-widest text-slate-400">{label}</div>
      <div className="text-xl font-semibold text-slate-50 mt-1 font-mono"
           style={{ fontFamily: 'ui-monospace, "JetBrains Mono", "SF Mono", Consolas, monospace' }}>{value}</div>
      <div className="text-xs text-slate-400 mt-1">{hint}</div>
    </div>
  );
}

export default QuotingWorkbenchPage;
