import { useState, useEffect, useRef } from "react";
import { fetchToolSearch, type ToolSearchOption } from "../../api/sfcReferenceCatalogs";

interface Props {
  label: string;
  /** Called when a catalog tool is picked -- the consumer cascades its geometry. */
  onSelect: (option: ToolSearchOption) => void;
  labelClassName?: string;
  inputClassName?: string;
  debounceMs?: number;
}

/** Minimum query length before a search fires (avoids 86K-wide single-char scans). */
const MIN_QUERY_LEN = 2;
const DEFAULT_DEBOUNCE_MS = 250;
const RESULT_LIMIT = 25;

/**
 * Query-driven typeahead over the ~86K tool corpus (POST /tool/search). The tool
 * fields on the SFC page (diameter / flutes / coating / helix / flute length)
 * cascade from the picked catalog tool. A monotonic request id discards stale
 * responses so a slow earlier query can never overwrite a newer one (the search
 * equivalent of an AbortController for setState ordering).
 */
export default function ToolSearchSelect({
  label,
  onSelect,
  labelClassName,
  inputClassName,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: Props) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ToolSearchOption[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LEN) {
      setOptions([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const myReq = ++reqIdRef.current;
    // `alive` distinguishes unmount from supersession: the reqId guard alone would let an
    // in-flight fetch setState after unmount (the timer is cleared, but a fired fetch still
    // resolves). Gating on `alive` makes every setState skip on an unmounted component.
    let alive = true;
    const fresh = () => alive && reqIdRef.current === myReq;
    setLoading(true);
    const handle = setTimeout(() => {
      fetchToolSearch(q, RESULT_LIMIT)
        .then((res) => {
          if (!fresh()) return; // unmounted, or a newer query superseded this one
          setOptions(res.options);
          setTotal(res.total);
        })
        .catch(() => {
          if (fresh()) {
            setOptions([]);
            setTotal(0);
          }
        })
        .finally(() => {
          if (fresh()) setLoading(false);
        });
    }, debounceMs);
    return () => {
      alive = false;
      clearTimeout(handle);
    };
  }, [query, debounceMs]);

  const pick = (opt: ToolSearchOption) => {
    onSelect(opt);
    setQuery(opt.label);
    setOpen(false);
  };

  return (
    <div className="relative">
      {label && <label className={labelClassName}>{label}</label>}
      <input
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className={inputClassName}
        placeholder="Search tool catalog (name, diameter, brand)..."
        data-field="tool_search"
        autoComplete="off"
        inputMode="search"
      />
      {open && (loading || options.length > 0) && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {loading && <div className="px-2 py-1.5 text-xs text-slate-400">Searching catalog...</div>}
          {!loading &&
            options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                data-tool-option={opt.id}
                onClick={() => pick(opt)}
                className="block w-full px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <div className="truncate font-medium text-slate-800 dark:text-slate-100">{opt.label}</div>
                <div className="truncate text-xs text-slate-500">{opt.detail}</div>
              </button>
            ))}
          {!loading && total > options.length && (
            <div className="px-2 py-1 text-[11px] text-slate-400">
              {total.toLocaleString()} matches -- refine the search to narrow
            </div>
          )}
        </div>
      )}
    </div>
  );
}
