import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: ReactNode;
}

export default function Card({ title, children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 ${className}`}
      {...props}
    >
      {title && <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>}
      {children}
    </div>
  );
}
