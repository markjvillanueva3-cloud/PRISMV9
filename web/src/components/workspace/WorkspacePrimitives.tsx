import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

export function WorkspaceHero({
  eyebrow,
  title,
  description,
  metrics,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  metrics?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-cyan-300/10 bg-[linear-gradient(135deg,rgba(7,14,22,0.98)_0%,rgba(5,10,16,0.98)_42%,rgba(18,32,48,0.96)_100%)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.34)]">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
        <div className="space-y-5">
          <span className="inline-flex rounded-full border border-cyan-300/16 bg-cyan-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100">
            {eyebrow}
          </span>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">{title}</h1>
            <p className="max-w-3xl text-base leading-7 text-slate-300">{description}</p>
          </div>
          {metrics ? <div className="grid gap-3 sm:grid-cols-3">{metrics}</div> : null}
        </div>
        {aside ? (
          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            {aside}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function SummaryTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br ${accent ?? 'from-cyan-400/22 via-cyan-300/10 to-transparent'}`} />
      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
        <div className="mt-3 text-2xl font-semibold text-slate-50">{value}</div>
        <div className="mt-2 text-sm text-slate-400">{hint}</div>
      </div>
    </div>
  );
}

export function PanelCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
      <div className="mb-5">
        <div className="text-xl font-semibold text-slate-50">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-slate-400">{subtitle}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32 ${props.className ?? ''}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/32 ${props.className ?? ''}`}
    />
  );
}

export function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'border-cyan-300/20 bg-cyan-300/[0.12] text-cyan-50'
          : 'border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/16 hover:bg-white/[0.06]'
      }`}
    >
      {children}
    </button>
  );
}

export function StatusPill({
  label,
  tone = 'slate',
}: {
  label: string;
  tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';
}) {
  const palette: Record<string, string> = {
    slate: 'bg-slate-300/16 text-slate-100',
    emerald: 'bg-emerald-300/16 text-emerald-100',
    amber: 'bg-amber-300/16 text-amber-100',
    rose: 'bg-rose-300/16 text-rose-100',
    sky: 'bg-sky-300/16 text-sky-100',
    violet: 'bg-violet-300/16 text-violet-100',
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${palette[tone] ?? palette.slate}`}>
      {label}
    </span>
  );
}

export function ActionButton({
  children,
  onClick,
  disabled,
  tone = 'cyan',
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'cyan' | 'emerald' | 'amber' | 'rose';
  className?: string;
}) {
  const palette: Record<string, string> = {
    cyan: 'bg-cyan-300 text-slate-950 hover:bg-cyan-200',
    emerald: 'bg-emerald-300 text-slate-950 hover:bg-emerald-200',
    amber: 'bg-amber-300 text-slate-950 hover:bg-amber-200',
    rose: 'bg-rose-300 text-slate-950 hover:bg-rose-200',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 ${palette[tone] ?? palette.cyan} ${className ?? ''}`}
    >
      {children}
    </button>
  );
}
