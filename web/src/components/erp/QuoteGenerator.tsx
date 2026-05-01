import { useState, useMemo } from "react";
import {
  useErpQuoteGenerate,
  useErpQuoteBreakdown,
  useErpQuoteCompare,
} from "../../hooks/useErp";
import type {
  ErpQuoteGenerateResult,
  ErpQuoteBreakdownResult,
  ErpQuoteCompareResult,
} from "../../types/erp";
import Spinner from "../ui/Spinner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WizardStep = "details" | "review" | "compare";

interface PartDetails {
  material: string;
  feature: string;
  quantity: string;
  tolerance: string;
  surface_finish: string;
  dimensions: Record<string, string>;
}

const EMPTY_DETAILS: PartDetails = {
  material: "",
  feature: "",
  quantity: "1",
  tolerance: "",
  surface_finish: "",
  dimensions: {},
};

const COMMON_DIMENSIONS = ["length", "width", "height", "diameter", "depth"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuoteGenerator() {
  const [step, setStep] = useState<WizardStep>("details");
  const [details, setDetails] = useState<PartDetails>(EMPTY_DETAILS);
  const [dimKeys, setDimKeys] = useState<string[]>(["length", "width", "height"]);

  const quoteGen = useErpQuoteGenerate();
  const breakdown = useErpQuoteBreakdown();
  const compare = useErpQuoteCompare();

  // ---- helpers ----

  const parseDimensions = () => {
    const dims: Record<string, number> = {};
    for (const k of dimKeys) {
      const v = details.dimensions[k];
      if (v && !isNaN(Number(v))) dims[k] = Number(v);
    }
    return Object.keys(dims).length ? dims : undefined;
  };

  const canGenerate = details.material.trim() !== "" && details.feature.trim() !== "";

  // ---- actions ----

  const handleGenerate = async () => {
    const dims = parseDimensions();
    const qty = Number(details.quantity) || 1;

    try {
      const [quoteResult] = await Promise.all([
        quoteGen.execute({
          material: details.material,
          feature: details.feature,
          dimensions: dims,
          quantity: qty,
          tolerance: details.tolerance || undefined,
          surface_finish: details.surface_finish || undefined,
        }),
        breakdown.execute({
          material: details.material,
          feature: details.feature,
          dimensions: dims,
          quantity: qty,
        }),
      ]);

      if (quoteResult) setStep("review");
    } catch {
      // Hook errors are surfaced via quoteGen.error / breakdown.error
    }
  };

  const handleCompare = async () => {
    await compare.execute({
      material: details.material,
      feature: details.feature,
      dimensions: parseDimensions(),
    });
    setStep("compare");
  };

  const handleReset = () => {
    setDetails(EMPTY_DETAILS);
    setDimKeys(["length", "width", "height"]);
    setStep("details");
    quoteGen.reset();
    breakdown.reset();
    compare.reset();
  };

  // ---- field updater ----

  const setField = <K extends keyof PartDetails>(key: K, val: PartDetails[K]) =>
    setDetails((d) => ({ ...d, [key]: val }));

  const setDim = (key: string, val: string) =>
    setDetails((d) => ({
      ...d,
      dimensions: { ...d.dimensions, [key]: val },
    }));

  // ---- render ----

  const loading = quoteGen.loading || breakdown.loading || compare.loading;
  const error = quoteGen.error || breakdown.error || compare.error;

  return (
    <div className="flex flex-col gap-4">
      {/* Wizard step indicator */}
      <StepIndicator current={step} onNavigate={setStep} hasQuote={!!quoteGen.data} />

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Step 1: Part details form */}
      {step === "details" && (
        <DetailsForm
          details={details}
          dimKeys={dimKeys}
          setField={setField}
          setDim={setDim}
          onAddDim={(k) => { if (!dimKeys.includes(k)) setDimKeys([...dimKeys, k]); }}
          onRemoveDim={(k) => setDimKeys(dimKeys.filter((d) => d !== k))}
          onGenerate={handleGenerate}
          canGenerate={canGenerate}
          loading={loading}
        />
      )}

      {/* Step 2: Quote review + cost breakdown */}
      {step === "review" && quoteGen.data && (
        <ReviewStep
          quote={quoteGen.data}
          breakdown={breakdown.data}
          breakdownLoading={breakdown.loading}
          onCompare={handleCompare}
          onBack={() => setStep("details")}
          onReset={handleReset}
          loading={compare.loading}
        />
      )}

      {/* Step 3: Strategy comparison */}
      {step === "compare" && compare.data && (
        <CompareStep
          data={compare.data}
          onBack={() => setStep("review")}
          onReset={handleReset}
        />
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <Spinner size="sm" />
          <span className="ml-2 text-xs text-slate-500">Processing...</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

function StepIndicator({
  current,
  onNavigate,
  hasQuote,
}: {
  current: WizardStep;
  onNavigate: (s: WizardStep) => void;
  hasQuote: boolean;
}) {
  const steps: { id: WizardStep; label: string; enabled: boolean }[] = [
    { id: "details", label: "Part Details", enabled: true },
    { id: "review", label: "Quote Review", enabled: hasQuote },
    { id: "compare", label: "Compare", enabled: hasQuote },
  ];

  return (
    <div className="flex items-center gap-1" role="navigation" aria-label="Quote wizard steps">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-1">
          {i > 0 && <span className="text-slate-300 dark:text-slate-600">&rsaquo;</span>}
          <button
            type="button"
            disabled={!s.enabled}
            onClick={() => s.enabled && onNavigate(s.id)}
            className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
              current === s.id
                ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                : s.enabled
                  ? "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  : "cursor-not-allowed text-slate-300 dark:text-slate-600"
            }`}
            aria-current={current === s.id ? "step" : undefined}
          >
            {s.label}
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Details Form
// ---------------------------------------------------------------------------

function DetailsForm({
  details,
  dimKeys,
  setField,
  setDim,
  onAddDim,
  onRemoveDim,
  onGenerate,
  canGenerate,
  loading,
}: {
  details: PartDetails;
  dimKeys: string[];
  setField: <K extends keyof PartDetails>(key: K, val: PartDetails[K]) => void;
  setDim: (key: string, val: string) => void;
  onAddDim: (key: string) => void;
  onRemoveDim: (key: string) => void;
  onGenerate: () => void;
  canGenerate: boolean;
  loading: boolean;
}) {
  const [newDim, setNewDim] = useState("");

  const availableDims = COMMON_DIMENSIONS.filter((d) => !dimKeys.includes(d));

  return (
    <div className="flex flex-col gap-3">
      {/* Material & Feature */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Material <span className="text-red-400">*</span>
          </span>
          <input
            type="text"
            value={details.material}
            onChange={(e) => setField("material", e.target.value)}
            placeholder="e.g. 6061-T6 Aluminum"
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs
              shadow-sm placeholder:text-slate-400 focus:border-primary-500
              focus:outline-none focus:ring-1 focus:ring-primary-500
              dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Feature <span className="text-red-400">*</span>
          </span>
          <input
            type="text"
            value={details.feature}
            onChange={(e) => setField("feature", e.target.value)}
            placeholder="e.g. pocket, bore, channel"
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs
              shadow-sm placeholder:text-slate-400 focus:border-primary-500
              focus:outline-none focus:ring-1 focus:ring-primary-500
              dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
      </div>

      {/* Quantity, Tolerance, Surface finish */}
      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Quantity</span>
          <input
            type="number"
            min={1}
            value={details.quantity}
            onChange={(e) => setField("quantity", e.target.value)}
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs
              shadow-sm focus:border-primary-500 focus:outline-none
              focus:ring-1 focus:ring-primary-500
              dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Tolerance</span>
          <input
            type="text"
            value={details.tolerance}
            onChange={(e) => setField("tolerance", e.target.value)}
            placeholder="e.g. ±0.05mm"
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs
              shadow-sm placeholder:text-slate-400 focus:border-primary-500
              focus:outline-none focus:ring-1 focus:ring-primary-500
              dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Surface Finish</span>
          <input
            type="text"
            value={details.surface_finish}
            onChange={(e) => setField("surface_finish", e.target.value)}
            placeholder="e.g. Ra 0.8"
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs
              shadow-sm placeholder:text-slate-400 focus:border-primary-500
              focus:outline-none focus:ring-1 focus:ring-primary-500
              dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
      </div>

      {/* Dimensions */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Dimensions (mm)
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {dimKeys.map((k) => (
            <div key={k} className="flex items-end gap-1">
              <label className="flex flex-1 flex-col gap-0.5">
                <span className="text-[10px] capitalize text-slate-500">{k}</span>
                <input
                  type="number"
                  value={details.dimensions[k] ?? ""}
                  onChange={(e) => setDim(k, e.target.value)}
                  className="rounded border border-slate-300 px-1.5 py-1
                    text-[11px] focus:border-primary-500 focus:outline-none
                    focus:ring-1 focus:ring-primary-500
                    dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </label>
              <button
                type="button"
                onClick={() => onRemoveDim(k)}
                className="mb-0.5 text-[10px] text-slate-400 hover:text-red-500"
                aria-label={`Remove ${k}`}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
        {/* Add dimension */}
        <div className="flex items-center gap-1.5">
          {availableDims.length > 0 ? (
            <select
              value={newDim}
              onChange={(e) => setNewDim(e.target.value)}
              className="rounded border border-slate-300 px-1.5 py-1 text-[11px]
                dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="">Add dimension...</option>
              {availableDims.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={newDim}
              onChange={(e) => setNewDim(e.target.value)}
              placeholder="Custom dimension"
              className="rounded border border-slate-300 px-1.5 py-1 text-[11px]
                dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          )}
          <button
            type="button"
            disabled={!newDim}
            onClick={() => { onAddDim(newDim); setNewDim(""); }}
            className="rounded bg-slate-200 px-2 py-1 text-[10px] font-medium
              text-slate-600 hover:bg-slate-300 disabled:opacity-40
              dark:bg-slate-700 dark:text-slate-300"
          >
            + Add
          </button>
        </div>
      </fieldset>

      {/* Generate button */}
      <button
        type="button"
        disabled={!canGenerate || loading}
        onClick={onGenerate}
        className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium
          text-white shadow-sm transition-colors hover:bg-primary-700
          disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Generating Quote..." : "Generate Quote"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review Step — Quote summary + Cost breakdown tree
// ---------------------------------------------------------------------------

function ReviewStep({
  quote,
  breakdown,
  breakdownLoading,
  onCompare,
  onBack,
  onReset,
  loading,
}: {
  quote: ErpQuoteGenerateResult;
  breakdown: ErpQuoteBreakdownResult | null;
  breakdownLoading: boolean;
  onCompare: () => void;
  onBack: () => void;
  onReset: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Quote summary card */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Quote {quote.quote_id}
          </h3>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Ready
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
          <Stat label="Total Cost" value={`$${quote.total_cost.toFixed(2)}`} highlight />
          <Stat label="Unit Cost" value={`$${quote.unit_cost.toFixed(2)}`} />
          <Stat label="Quantity" value={String(quote.quantity)} />
          <Stat label="Lead Time" value={`${quote.lead_time_days}d`} />
          <Stat label="Material" value={`$${quote.material_cost.toFixed(2)}`} />
          <Stat label="Labor" value={`$${quote.labor_cost.toFixed(2)}`} />
          <Stat label="Overhead" value={`$${quote.overhead_cost.toFixed(2)}`} />
          <Stat label="Margin" value={`${quote.margin_pct.toFixed(1)}%`} />
        </div>

        {/* Line items */}
        {quote.line_items.length > 0 && (
          <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700">
            <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Operations
            </h4>
            <div className="space-y-1">
              {quote.line_items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded bg-slate-50 px-2.5 py-1.5 text-xs dark:bg-slate-900/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {item.operation}
                    </span>
                    <span className="text-[10px] text-slate-400">{item.machine}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span>{item.cycle_time_min}min cycle</span>
                    <span>{item.setup_time_min}min setup</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      ${item.cost.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {quote.warnings.length > 0 && (
          <div className="mt-3 space-y-1">
            {quote.warnings.map((w, i) => (
              <p key={i} className="text-[10px] text-amber-600 dark:text-amber-400">
                {w}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Cost breakdown tree */}
      {breakdownLoading ? (
        <div className="flex items-center gap-2 py-2">
          <Spinner size="sm" />
          <span className="text-xs text-slate-500">Loading breakdown...</span>
        </div>
      ) : breakdown ? (
        <CostBreakdownTree data={breakdown} />
      ) : null}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs
            text-slate-600 hover:bg-slate-50 dark:border-slate-600
            dark:text-slate-400 dark:hover:bg-slate-800"
        >
          Back
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onCompare}
          className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium
            text-white hover:bg-primary-700 disabled:opacity-40"
        >
          {loading ? "Comparing..." : "Compare Strategies"}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="ml-auto text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          New Quote
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cost Breakdown Tree
// ---------------------------------------------------------------------------

function CostBreakdownTree({ data }: { data: ErpQuoteBreakdownResult }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (cat: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });

  // Determine the largest category for bar width scaling
  const maxPct = useMemo(
    () => Math.max(...data.categories.map((c) => c.pct), 1),
    [data.categories],
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          Cost Breakdown
        </h4>
        <span className="text-xs text-slate-500">
          Total: ${data.total.toFixed(2)} {data.currency}
        </span>
      </div>

      <div className="space-y-1.5">
        {data.categories.map((cat) => (
          <div key={cat.category}>
            <button
              type="button"
              onClick={() => toggle(cat.category)}
              className="flex w-full items-center gap-2 rounded px-1 py-1 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <span className="w-3 text-[10px] text-slate-400">
                {expanded.has(cat.category) ? "▼" : "▸"}
              </span>
              <span className="flex-1 text-left font-medium text-slate-700 dark:text-slate-300">
                {cat.category}
              </span>
              <div className="flex w-24 items-center gap-1">
                <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-primary-500"
                    style={{ width: `${(cat.pct / maxPct) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-[10px] text-slate-500">
                  {cat.pct.toFixed(0)}%
                </span>
              </div>
              <span className="w-16 text-right text-slate-600 dark:text-slate-400">
                ${cat.amount.toFixed(2)}
              </span>
            </button>

            {expanded.has(cat.category) && cat.details.length > 0 && (
              <div className="ml-5 space-y-0.5 pb-1 pl-2 border-l border-slate-200 dark:border-slate-700">
                {cat.details.map((d, i) => (
                  <p key={i} className="text-[10px] text-slate-500 dark:text-slate-400">
                    {d}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compare Step
// ---------------------------------------------------------------------------

function CompareStep({
  data,
  onBack,
  onReset,
}: {
  data: ErpQuoteCompareResult;
  onBack: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
          Strategy Comparison
        </h3>

        {/* Comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-2 py-1.5 text-left font-medium text-slate-500">Strategy</th>
                <th className="px-2 py-1.5 text-right font-medium text-slate-500">Cost</th>
                <th className="px-2 py-1.5 text-right font-medium text-slate-500">Cycle Time</th>
                <th className="px-2 py-1.5 text-right font-medium text-slate-500">Lead Time</th>
                <th className="px-2 py-1.5 text-right font-medium text-slate-500">Quality</th>
              </tr>
            </thead>
            <tbody>
              {data.comparisons.map((entry) => (
                <tr
                  key={entry.strategy}
                  className={`border-b border-slate-100 dark:border-slate-700/50 ${
                    entry.strategy === data.recommended
                      ? "bg-green-50 dark:bg-green-900/10"
                      : ""
                  }`}
                >
                  <td className="px-2 py-1.5 font-medium text-slate-700 dark:text-slate-300">
                    {entry.strategy}
                    {entry.strategy === data.recommended && (
                      <span className="ml-1.5 text-[10px] text-green-600 dark:text-green-400">
                        Recommended
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-600 dark:text-slate-400">
                    ${entry.total_cost.toFixed(2)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-600 dark:text-slate-400">
                    {entry.cycle_time_min.toFixed(1)} min
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-600 dark:text-slate-400">
                    {entry.lead_time_days}d
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <QualityBadge score={entry.quality_score} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recommendation */}
        {data.reason && (
          <div className="mt-3 rounded-md bg-green-50 px-3 py-2 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <span className="font-medium">Recommendation:</span> {data.reason}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs
            text-slate-600 hover:bg-slate-50 dark:border-slate-600
            dark:text-slate-400 dark:hover:bg-slate-800"
        >
          Back to Quote
        </button>
        <button
          type="button"
          onClick={onReset}
          className="ml-auto text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          New Quote
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] text-slate-500">{label}</dt>
      <dd
        className={`font-medium ${
          highlight
            ? "text-sm text-primary-700 dark:text-primary-400"
            : "text-slate-700 dark:text-slate-300"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function QualityBadge({ score }: { score: number }) {
  const color =
    score >= 90
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : score >= 70
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

  return (
    <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${color}`}>
      {score.toFixed(0)}
    </span>
  );
}
