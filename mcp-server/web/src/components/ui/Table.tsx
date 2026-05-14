import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes, HTMLAttributes } from "react";

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  children: ReactNode;
}

export function Table({ children, className = "", ...props }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className={`min-w-full divide-y divide-slate-200 dark:divide-slate-700 ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function Thead({ children, className = "", ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={`bg-slate-50 dark:bg-slate-800/50 ${className}`} {...props}>
      {children}
    </thead>
  );
}

export function Tbody({ children, className = "", ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-800 ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function Th({ children, className = "", ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "", ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-300 ${className}`} {...props}>
      {children}
    </td>
  );
}
