/**
 * DbBackedSelect -- a reusable SFC select wired to a live reference-catalog endpoint.
 * =================================================================================
 * Loads its options from one of the 6 SFC reference-catalog endpoints (via
 * `SFC_CATALOG_FETCHERS` in `../api/sfcReferenceCatalogs`) and renders a native
 * `<select>` with honest loading / live / curated state. Replaces the hardcoded
 * `<select>` option lists in SpeedFeedPage / SfcCalculatorPage so every SFC input
 * is DB-driven.
 *
 * Design rules (web/CLAUDE.md): >=44pt tap target (`h-11`, `md:h-9` desktop), no
 * inline hex/px (Tailwind utilities only), associated `<label>`, visible focus ring,
 * `aria-busy` while loading. The backend never returns a silent-empty list (it
 * fail-soft degrades to a curated set), so this surfaces `source` to the user
 * rather than hiding a degraded state.
 */
import { useEffect, useState } from 'react';
import {
  SFC_CATALOG_FETCHERS,
  type SfcCatalogKey,
  type CatalogOptionBase,
} from '../api/sfcReferenceCatalogs';

export interface DbBackedSelectProps {
  /** Which reference catalog backs this select. */
  catalog: SfcCatalogKey;
  /** Currently-selected option's `value` field (controlled): its id, or its label when `valueField='label'`. */
  value: string;
  /** Called with the selected option's `value` field: its id, or its label when `valueField='label'`. */
  onChange: (value: string) => void;
  /**
   * Optional: called with the FULL selected catalog option (or undefined for the
   * empty placeholder) IN ADDITION to `onChange(value)`. Lets a host page cascade
   * extra fields off a DB pick (e.g. a stock pick fills material + iso_group +
   * hardness, a holder pick fills holder_gauge_length) without orphaning the input.
   * The runtime object carries every catalog-specific field (not just the base
   * three), so a consumer casts to the concrete catalog option type.
   */
  onSelectOption?: (option: CatalogOptionBase | undefined) => void;
  /** Visible, associated label text. */
  label: string;
  /** Optional explicit id (defaults to `dbselect-<catalog>`). */
  id?: string;
  /** Placeholder shown as the first, empty option. */
  placeholder?: string;
  /** Extra classes for the outer wrapper. */
  className?: string;
  disabled?: boolean;
  /** Show the live/curated source badge (default true). */
  showSourceBadge?: boolean;
  /**
   * Which option field becomes the `<option value>` + controlled value.
   * Default "id" (the stable slug). Use "label" when the consuming page's
   * existing value contract is the display string (e.g. SpeedFeedPage sends
   * `tool_coating: "TiAlN"`, the catalog label) so wiring the DB list in does
   * NOT change what value the backend receives -- only the option set grows.
   */
  valueField?: 'id' | 'label';
  /** Override the label className (to match a host page's label idiom). */
  labelClassName?: string;
  /** Override the select className (to match a host page's input idiom). */
  selectClassName?: string;
}

/**
 * A select whose options come from a live reference-catalog endpoint, with honest
 * loading / database / curated state. Pure presentation + a fetch-on-mount effect;
 * unit-testable by mocking the fetcher registry (no live server needed).
 */
export function DbBackedSelect({
  catalog,
  value,
  onChange,
  onSelectOption,
  label,
  id,
  placeholder = 'Select...',
  className,
  disabled = false,
  showSourceBadge = true,
  valueField = 'id',
  labelClassName,
  selectClassName,
}: DbBackedSelectProps) {
  const [options, setOptions] = useState<CatalogOptionBase[]>([]);
  const [source, setSource] = useState<'database' | 'curated' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    // Clear prior catalog's options/source so a catalog-prop change shows a clean
    // loading state instead of flashing the previous catalog's rows + badge.
    setOptions([]);
    setSource(null);
    SFC_CATALOG_FETCHERS[catalog]()
      .then((res) => {
        if (cancelled) return;
        // Every catalog response extends CatalogResponseBase, so `options` (each
        // element extends CatalogOptionBase) and `source` are read directly.
        setOptions(Array.isArray(res.options) ? res.options : []);
        setSource(res.source ?? null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load options');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [catalog]);

  const selectId = id ?? `dbselect-${catalog}`;
  const isDisabled = disabled || loading || error !== null;
  // A loaded-but-empty catalog (no loading, no error, source resolved) is a distinct
  // state from "not yet selected" -- surface it so the user can tell them apart.
  const loadedEmpty = !loading && error === null && source !== null && options.length === 0;
  // Don't drive the controlled value until options exist, else React warns
  // "value not in option list" during the load window for a pre-set selection.
  const selectValue = loading || error !== null ? '' : value;

  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={selectId} className={labelClassName ?? 'text-sm font-medium text-slate-200'}>
          {label}
        </label>
        {showSourceBadge && source === 'curated' && (
          <span
            className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-300"
            title="Showing a curated fallback list -- the live database was unavailable."
          >
            curated
          </span>
        )}
        {showSourceBadge && source === 'database' && (
          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-300">
            live
          </span>
        )}
      </div>
      <select
        id={selectId}
        value={selectValue}
        disabled={isDisabled}
        aria-busy={loading}
        aria-invalid={error !== null}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next);
          if (onSelectOption) {
            onSelectOption(options.find((o) => (valueField === 'label' ? o.label : o.id) === next));
          }
        }}
        className={
          selectClassName ??
          'h-11 w-full rounded-md border border-slate-600 bg-slate-800 px-3 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/50 disabled:opacity-60 md:h-9'
        }
      >
        <option value="">
          {loading ? 'Loading...' : error ? 'Unavailable' : loadedEmpty ? 'No options available' : placeholder}
        </option>
        {options.map((o) => (
          <option key={o.id} value={valueField === 'label' ? o.label : o.id} title={o.detail}>
            {o.label}
          </option>
        ))}
      </select>
      {error !== null && (
        <p className="mt-1 text-xs text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default DbBackedSelect;
