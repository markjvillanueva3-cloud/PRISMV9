/**
 * WEDM-ERP-MS0 / U-WEDM-ERP08 — WedmQuoteSection
 *
 * Mountable section for QuoteBuilderPage that lets a quoter drop WEDM
 * line items into a quote. Inputs are debounced at 300ms per the
 * U-WEDM-ERP08 exit criteria; the section calls /api/v1/wedm-erp/quote/estimate
 * and renders the cost breakdown with the Calculator Studio design language.
 *
 * Design language refs (web/CLAUDE.md):
 *   - Dark surface:  bg-[rgba(2,6,23,0.78)]
 *   - Border:        border-white/10
 *   - Accents:       prism-glow-cyan for cost totals, prism-glow-violet for headings
 *   - Progress bar:  prism-spectrum-fill
 *   - Status badge:  prism-chip
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LoadingState, ErrorState } from '../LoadingState';
import { wedmErpApi, type WedmEstimateInput, type WedmEstimateResponse } from '../../api/wedmErp';

export interface WedmQuoteLineItem {
  description: string;
  total: number;
  category: string;
  source: string;
  /** Unit price (derived: total / quantity) so the outer quote UI can display per-piece */
  unit_price: number;
}

export interface WedmQuoteSectionProps {
  /**
   * Optional callback fired when the user clicks "Add to Quote".
   * Receives the full line items array and the quote total so the parent
   * can append to its aggregate quote state.
   */
  onAddToQuote?: (lineItems: WedmQuoteLineItem[], totalUsd: number, meta: {
    material: string;
    perimeter_mm: number;
    thickness_mm: number;
    quantity: number;
    pass_count: number;
    wire_type: string;
  }) => void;
  /** Initial form values (for deep-links / templating) */
  defaultValues?: Partial<FormState>;
  /** Hide the "Add to Quote" CTA (useful for embedded preview) */
  hideAddButton?: boolean;
}

interface FormState {
  material: string;
  perimeter_mm: string;   // input kept as string to avoid NaN flashes
  thickness_mm: string;
  quantity: string;
  pass_count: string;
  pass_mode: 'auto' | 'manual';
  wire_type: 'brass' | 'coated' | 'molybdenum' | 'tungsten';
  wire_diameter_mm: string;
  target_ra_um: string;   // Ra-based auto pass-count (future hookup)
}

const MATERIALS: Array<{ value: string; label: string; hint?: string }> = [
  { value: 'D2',  label: 'D2 Tool Steel',     hint: 'Cold-work, 58-62 HRC' },
  { value: 'M2',  label: 'M2 HSS',             hint: 'Molybdenum high-speed' },
  { value: 'A2',  label: 'A2 Tool Steel',     hint: 'Air-hardening' },
  { value: 'S7',  label: 'S7 Shock-Resistant' },
  { value: 'H13', label: 'H13 Hot-Work' },
  { value: '4140', label: '4140 Prehard' },
  { value: 'carbide', label: 'Tungsten Carbide', hint: 'Slow cut, dedicated wire' },
  { value: '17-4PH', label: '17-4 PH Stainless' },
  { value: 'Ti-6Al-4V', label: 'Ti-6Al-4V',  hint: 'Aerospace titanium' },
];

const WIRE_TYPES: Array<{ value: FormState['wire_type']; label: string }> = [
  { value: 'brass',       label: 'Brass (standard)' },
  { value: 'coated',      label: 'Coated (zinc/diffusion)' },
  { value: 'molybdenum',  label: 'Molybdenum (carbide)' },
  { value: 'tungsten',    label: 'Tungsten (ultra-fine)' },
];

const DEFAULT_FORM: FormState = {
  material: 'D2',
  perimeter_mm: '120',
  thickness_mm: '25.4',
  quantity: '10',
  pass_count: '4',
  pass_mode: 'auto',
  wire_type: 'brass',
  wire_diameter_mm: '0.25',
  target_ra_um: '1.6',
};

const DEBOUNCE_MS = 300;

function parseNumber(v: string): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function classifyInputs(form: FormState): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const p = parseNumber(form.perimeter_mm);
  const t = parseNumber(form.thickness_mm);
  const q = parseNumber(form.quantity);
  const pc = parseNumber(form.pass_count);
  if (p === null || p <= 0) errors.push('Perimeter must be > 0 mm');
  if (t === null || t <= 0) errors.push('Thickness must be > 0 mm');
  if (q === null || q < 1 || !Number.isInteger(q)) errors.push('Quantity must be a positive integer');
  if (form.pass_mode === 'manual' && (pc === null || pc < 1 || pc > 6)) {
    errors.push('Pass count must be between 1 and 6');
  }
  return { valid: errors.length === 0, errors };
}

function inferPassCount(targetRa_um: number, thicknessMm: number): number {
  // Based on WEDM-CAL-MS4 benchmarks (Ra-class thresholds from Sandvik + Mitsubishi):
  //   Ra > 3.2µm  → 1 pass   Ra 2.0-3.2µm → 2
  //   Ra 1.2-2.0µm → 3      Ra 0.8-1.2µm → 4
  //   Ra 0.4-0.8µm → 5      Ra < 0.4µm   → 6
  let passes = 1;
  if (targetRa_um < 0.4) passes = 6;
  else if (targetRa_um < 0.8) passes = 5;
  else if (targetRa_um < 1.2) passes = 4;
  else if (targetRa_um < 2.0) passes = 3;
  else if (targetRa_um < 3.2) passes = 2;
  // Thick sections bump one pass to account for conicity + flushing
  if (thicknessMm > 50 && passes < 6) passes += 1;
  return passes;
}

function formatUsd(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

export function WedmQuoteSection({ onAddToQuote, defaultValues, hideAddButton }: WedmQuoteSectionProps) {
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM, ...defaultValues });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<WedmEstimateResponse['data'] | null>(null);

  // Effective pass count: auto from target Ra, manual from input
  const effectivePassCount = useMemo(() => {
    if (form.pass_mode === 'manual') return parseNumber(form.pass_count) ?? 3;
    const ra = parseNumber(form.target_ra_um) ?? 1.6;
    const t = parseNumber(form.thickness_mm) ?? 25.4;
    return inferPassCount(ra, t);
  }, [form.pass_mode, form.pass_count, form.target_ra_um, form.thickness_mm]);

  const validation = useMemo(() => classifyInputs(form), [form]);

  // 300ms debounced estimate — R5 mandatory
  const debounceRef = useRef<number | null>(null);
  const callEstimate = useCallback(async () => {
    if (!validation.valid) return;
    setIsLoading(true);
    setError(null);
    try {
      const input: WedmEstimateInput = {
        material: form.material,
        perimeter_mm: parseNumber(form.perimeter_mm)!,
        thickness_mm: parseNumber(form.thickness_mm)!,
        quantity: parseNumber(form.quantity)!,
        pass_count: effectivePassCount,
        wire_type: form.wire_type,
        wire_diameter_mm: parseNumber(form.wire_diameter_mm) ?? 0.25,
      };
      const r = await wedmErpApi.estimate(input);
      if (!r.ok || !r.data) {
        setError(r.error ?? 'Estimate call returned no data');
      } else {
        setResponse(r.data);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [form, effectivePassCount, validation.valid]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void callEstimate();
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [callEstimate]);

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleAddToQuote = useCallback(() => {
    if (!response || !onAddToQuote) return;
    const quantity = parseNumber(form.quantity) ?? 1;
    const lineItems: WedmQuoteLineItem[] = response.quote.line_items.map((li) => ({
      description: li.description,
      total: li.total,
      category: li.category,
      source: li.source,
      unit_price: quantity > 0 ? li.total / quantity : li.total,
    }));
    onAddToQuote(lineItems, response.quote.total, {
      material: form.material,
      perimeter_mm: parseNumber(form.perimeter_mm) ?? 0,
      thickness_mm: parseNumber(form.thickness_mm) ?? 0,
      quantity,
      pass_count: effectivePassCount,
      wire_type: form.wire_type,
    });
  }, [response, onAddToQuote, form, effectivePassCount]);

  const ci = response?.quote.confidence_interval;
  const confidenceBand = ci ? ci.high - ci.low : 0;
  const confidencePct = response?.quote.total_uncertainty_pct ?? 0;

  return (
    <section
      data-testid="wedm-quote-section"
      className="rounded-3xl border border-white/10 bg-[rgba(2,6,23,0.78)] p-6 text-slate-100 shadow-[0_0_40px_-20px_rgba(56,189,248,0.5)]"
    >
      {/* Heading */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight prism-glow-violet">
            Wire EDM Line Item
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Physics-costed estimate · {effectivePassCount}-pass plan · {form.material}
          </p>
        </div>
        <span className="prism-chip text-xs">WEDM · live</span>
      </div>

      {/* Input grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FieldSelect
          label="Material"
          value={form.material}
          onChange={(v) => update('material', v)}
          options={MATERIALS.map((m) => ({ value: m.value, label: m.label, description: m.hint }))}
          testId="wedm-material"
        />
        <FieldNumber
          label="Perimeter"
          suffix="mm"
          value={form.perimeter_mm}
          onChange={(v) => update('perimeter_mm', v)}
          min={0}
          step={0.1}
          testId="wedm-perimeter"
        />
        <FieldNumber
          label="Thickness"
          suffix="mm"
          value={form.thickness_mm}
          onChange={(v) => update('thickness_mm', v)}
          min={0}
          step={0.1}
          testId="wedm-thickness"
        />
        <FieldNumber
          label="Quantity"
          value={form.quantity}
          onChange={(v) => update('quantity', v)}
          min={1}
          step={1}
          integer
          testId="wedm-quantity"
        />
        <FieldSelect
          label="Wire type"
          value={form.wire_type}
          onChange={(v) => update('wire_type', v as FormState['wire_type'])}
          options={WIRE_TYPES.map((w) => ({ value: w.value, label: w.label }))}
          testId="wedm-wire-type"
        />
        <FieldNumber
          label="Wire Ø"
          suffix="mm"
          value={form.wire_diameter_mm}
          onChange={(v) => update('wire_diameter_mm', v)}
          min={0.05}
          max={0.5}
          step={0.05}
          testId="wedm-wire-diameter"
        />

        {/* Pass mode: auto (from Ra target) or manual */}
        <div className="sm:col-span-2 lg:col-span-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400">Pass strategy</span>
            <div className="flex gap-1 rounded-full border border-white/10 p-0.5">
              <ModeButton
                active={form.pass_mode === 'auto'}
                onClick={() => update('pass_mode', 'auto')}
                testId="wedm-pass-mode-auto"
              >
                Auto (Ra target)
              </ModeButton>
              <ModeButton
                active={form.pass_mode === 'manual'}
                onClick={() => update('pass_mode', 'manual')}
                testId="wedm-pass-mode-manual"
              >
                Manual
              </ModeButton>
            </div>
          </div>
          {form.pass_mode === 'auto' ? (
            <div className="flex items-end gap-4">
              <FieldNumber
                label="Target Ra"
                suffix="µm"
                value={form.target_ra_um}
                onChange={(v) => update('target_ra_um', v)}
                min={0.1}
                max={3.2}
                step={0.1}
                testId="wedm-target-ra"
              />
              <div className="mb-1 text-sm text-slate-300" data-testid="wedm-inferred-passes">
                → <span className="font-mono text-cyan-300">{effectivePassCount}</span> passes
              </div>
            </div>
          ) : (
            <FieldNumber
              label="Pass count"
              value={form.pass_count}
              onChange={(v) => update('pass_count', v)}
              min={1}
              max={6}
              step={1}
              integer
              testId="wedm-pass-count"
            />
          )}
        </div>
      </div>

      {/* Validation issues */}
      {!validation.valid && validation.errors.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-2xl border border-amber-400/30 bg-amber-950/30 p-3 text-xs text-amber-200" data-testid="wedm-validation-errors">
          {validation.errors.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}

      {/* Cost breakdown */}
      <div className="mt-6 border-t border-white/10 pt-5" data-testid="wedm-cost-panel">
        {isLoading && <LoadingState label="Computing physics-backed cost…" variant="inline" />}
        {!isLoading && error && <ErrorState message={error} onRetry={() => void callEstimate()} />}
        {!isLoading && !error && response && (
          <div className="space-y-4">
            {/* Total hero row */}
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400">Quote total</div>
                <div className="mt-1 font-mono text-3xl font-semibold text-cyan-300 prism-glow-cyan" data-testid="wedm-total">
                  {formatUsd(response.quote.total)}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Per-piece: <span className="font-mono text-slate-200" data-testid="wedm-unit-price">
                    {formatUsd(response.quote.total / Math.max(1, parseNumber(form.quantity) ?? 1))}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-slate-400">Confidence ±</div>
                <div className="mt-1 font-mono text-sm text-slate-200" data-testid="wedm-uncertainty">
                  {confidencePct.toFixed(1)}%
                </div>
                {ci && (
                  <div className="mt-0.5 font-mono text-xs text-slate-500">
                    {formatUsd(ci.low)} — {formatUsd(ci.high)}
                    {confidenceBand > 0 && <span className="ml-1">({(ci.confidence * 100).toFixed(0)}% CI)</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Line-item breakdown */}
            <ul className="space-y-1.5 rounded-2xl border border-white/5 bg-black/30 p-3" data-testid="wedm-line-items">
              {response.quote.line_items.map((li, idx) => (
                <li
                  key={`${li.category}-${idx}`}
                  className="flex items-center justify-between font-mono text-xs text-slate-300"
                  data-testid={`wedm-line-item-${li.category}`}
                >
                  <span className="truncate">{li.description}</span>
                  <span className="ml-4 shrink-0 text-slate-100">{formatUsd(li.total)}</span>
                </li>
              ))}
              {/* subtotal/overhead/margin/total */}
              <li className="mt-1.5 flex items-center justify-between border-t border-white/5 pt-1.5 font-mono text-xs text-slate-400">
                <span>Subtotal</span>
                <span>{formatUsd(response.quote.subtotal)}</span>
              </li>
              <li className="flex items-center justify-between font-mono text-xs text-slate-400">
                <span>Overhead</span>
                <span>{formatUsd(response.quote.overhead)}</span>
              </li>
              <li className="flex items-center justify-between font-mono text-xs text-slate-400">
                <span>Margin</span>
                <span>{formatUsd(response.quote.margin)}</span>
              </li>
            </ul>

            {/* Spectrum fill bar visualising uncertainty */}
            <div className="space-y-1" aria-label="Uncertainty band">
              <div className="flex justify-between text-[0.65rem] uppercase tracking-wider text-slate-500">
                <span>Cost confidence</span>
                <span>{(100 - confidencePct).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="prism-spectrum-fill h-full rounded-full"
                  style={{ width: `${Math.max(10, Math.min(100, 100 - confidencePct))}%` }}
                  data-testid="wedm-confidence-bar"
                />
              </div>
            </div>

            {/* Add to quote */}
            {!hideAddButton && onAddToQuote && (
              <button
                type="button"
                onClick={handleAddToQuote}
                disabled={!response}
                className="prism-glow-cyan w-full rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition-colors hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                data-testid="wedm-add-to-quote"
              >
                Add to Quote · {formatUsd(response.quote.total)}
              </button>
            )}
          </div>
        )}
        {!isLoading && !error && !response && validation.valid && (
          <div className="py-4 text-center text-xs text-slate-500">Waiting for estimate…</div>
        )}
      </div>
    </section>
  );
}

// ─── Field primitives ───────────────────────────────────────────────────────

function FieldNumber(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  testId?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">{props.label}</span>
      <div className="flex items-stretch rounded-xl border border-white/10 bg-black/30 focus-within:border-cyan-400/60 focus-within:ring-1 focus-within:ring-cyan-400/40">
        <input
          type="number"
          inputMode="decimal"
          value={props.value}
          min={props.min}
          max={props.max}
          step={props.integer ? 1 : props.step ?? 'any'}
          onChange={(e) => props.onChange(e.target.value)}
          className="w-full bg-transparent px-3 py-2 font-mono text-sm text-slate-100 outline-none"
          data-testid={props.testId}
        />
        {props.suffix && (
          <span className="flex items-center pr-3 font-mono text-xs text-slate-500">{props.suffix}</span>
        )}
      </div>
    </label>
  );
}

function FieldSelect(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string; description?: string }>;
  testId?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">{props.label}</span>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40"
        data-testid={props.testId}
      >
        {props.options.map((o) => (
          <option key={o.value} value={o.value} title={o.description}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ModeButton({
  active,
  onClick,
  children,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`rounded-full px-3 py-1 text-xs transition-colors ${
        active
          ? 'bg-cyan-500/20 text-cyan-100 prism-glow-cyan'
          : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  );
}
