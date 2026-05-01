/**
 * InfoTip — Shared tooltip component for Wire EDM Studio
 * Extracted from 5 step components to eliminate duplication.
 *
 * WCAG 2.1 AA: 44px touch target, aria-label, aria-expanded, role="tooltip"
 */

import { useState } from "react";

export function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1">
      <button
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold hover:bg-blue-100 hover:text-blue-600 dark:bg-slate-600 dark:text-slate-400 min-w-[44px] min-h-[44px] -m-[14px] p-[14px]"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        aria-label={text}
        aria-expanded={show}
        type="button"
      >
        ?
      </button>
      {show && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs bg-slate-800 text-white rounded-lg shadow-lg whitespace-normal max-w-[240px] z-50 pointer-events-none"
        >
          {text}
        </span>
      )}
    </span>
  );
}
