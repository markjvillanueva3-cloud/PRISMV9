import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { useHaptics } from '../../hooks/useHaptics';

/*
 * WorkspacePrimitives -- the de-facto shared primitive set (106 pages import it).
 * FLEET-IOS-REDESIGN U2 (2026-06-09, slot:hotel): adopted the U1 token foundation
 * (rounded-ios-*, shadow-ios-*, --tap-min, --accent-rgb) + closed the concrete
 * "vibe-coded" gaps the redesign readers found: ActionButton ghost-tone no-op,
 * missing focus-visible rings, sub-44pt tap targets, no card hover, native <select>
 * arrow, raw <pre>{JSON} dumps (-> ResultCard), inlined lifecycle steppers
 * (-> Stepper). ALL existing prop signatures are preserved additively -- every
 * change is backward compatible for the 106 consumers. Press feel comes from the
 * global `.prism-dark button:active` rule in index.css (one press mechanism, R7).
 */

export function WorkspaceHero({
  eyebrow,
  title,
  description,
  metrics,
  aside,
}: {
  eyebrow: string;
  // 2026-05-27 iter22: ShopFloorClockPage passes title=<span>...</span>; broaden
  // to ReactNode so component callers can compose inline (the renderer at L24
  // already wraps in <h1> — JSX children inherit that styling cleanly).
  title: ReactNode;
  description: string;
  metrics?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-ios-xl border border-cyan-300/10 bg-[linear-gradient(135deg,rgba(7,14,22,0.98)_0%,rgba(5,10,16,0.98)_42%,rgba(18,32,48,0.96)_100%)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.34)]">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
        <div className="space-y-5">
          <span className="inline-flex rounded-full border border-cyan-300/16 bg-cyan-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100">
            {eyebrow}
          </span>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-[-0.02em] text-slate-50 sm:text-5xl">{title}</h1>
            <p className="max-w-3xl text-base leading-7 text-slate-300">{description}</p>
          </div>
          {metrics ? <div className="grid gap-3 sm:grid-cols-3">{metrics}</div> : null}
        </div>
        {aside ? (
          <div className="rounded-ios-lg border border-white/10 bg-black/20 p-5">
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
  emphasis = 'normal',
}: {
  label: string;
  value: string;
  // 2026-05-27 iter11: optional — 6 call sites across SalesPipelinePage + CommissionTrackerPage
  // pass {label,value,accent?} without hint. Render uses {hint} which gracefully renders ''/undefined.
  hint?: string;
  accent?: string;
  // 2026-06-09 (FLEET-IOS-REDESIGN U2): optional visual-hierarchy variant. 'high'
  // enlarges the value + brightens the label so a primary KPI stands out from
  // secondary tiles in a grid. Default 'normal' renders exactly as before.
  emphasis?: 'normal' | 'high';
}) {
  const high = emphasis === 'high';
  return (
    <div className="group relative overflow-hidden rounded-ios-lg border border-white/8 bg-white/[0.03] px-4 py-4 shadow-ios-1 transition hover:border-white/15 hover:bg-white/[0.05]">
      <div className={`pointer-events-none absolute inset-x-0 top-0 ${high ? 'h-20' : 'h-16'} bg-gradient-to-br ${accent ?? 'from-cyan-400/22 via-cyan-300/10 to-transparent'}`} />
      <div className="relative">
        <div className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${high ? 'text-slate-300' : 'text-slate-500'}`}>{label}</div>
        <div className={`mt-3 font-semibold text-slate-50 ${high ? 'text-3xl' : 'text-2xl'}`}>{value}</div>
        <div className="mt-2 text-sm text-slate-400">{hint}</div>
      </div>
    </div>
  );
}

export function PanelCard({
  title,
  subtitle,
  children,
  glow: _glow,
  collapsible: _collapsible,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  // 2026-05-26 (slot golf, tsc-fix): callers in MachineDataAuditPage pass a `glow` accent
  // (e.g. "cyan"/"emerald"/"violet"/"amber"). Accepted but not yet rendered — destructured
  // to suppress the prop-rejection error. A future styling pass can map glow to the gradient.
  glow?: string;
  // 2026-05-27 iter5: ppg/PhysicsDetailsPanel passes collapsible on 3 cards.
  // Accepted-but-ignored — future U-WEB-PANELCARD-COLLAPSE wires expand/collapse.
  collapsible?: boolean;
}) {
  return (
    <section className="rounded-ios-xl border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-ios-2 transition hover:border-white/15">
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
  className,
}: {
  label: string;
  children: ReactNode;
  // 2026-05-27 iter25: PrintDropPage L302 passes className for layout (ml-auto w-32).
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ''}`.trim()}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full min-h-11 rounded-ios-md border border-white/10 bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-accent/40 focus:ring-2 focus:ring-accent/35 focus:ring-offset-1 focus:ring-offset-slate-950 ${props.className ?? ''}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  // `.ios-select` (index.css) supplies appearance-none + the soft chevron + its
  // own padding-right; we set only pl/py here so no `px-*` utility overrides it.
  return (
    <select
      {...props}
      className={`ios-select w-full min-h-11 rounded-ios-md border border-white/10 bg-slate-950/80 pl-3.5 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/35 focus:ring-offset-1 focus:ring-offset-slate-950 ${props.className ?? ''}`}
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
      // a11y: a toggle/segmented tab must expose its pressed state (DESIGN.md floor).
      aria-pressed={active}
      className={`inline-flex min-h-11 items-center rounded-ios-sm border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
        active
          ? 'border-accent/30 bg-accent/[0.14] text-slate-50 shadow-ios-1'
          : 'border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/16 hover:bg-white/[0.06]'
      }`}
    >
      {children}
    </button>
  );
}

export function StatusPill({
  label,
  status,
  tone = 'slate',
  variant: _variant,
  size: _size,
  children,
}: {
  label?: string;
  // 2026-05-26 (slot golf, tsc-fix): MachineDataAuditPage:280 passes `status` (e.g. a
  // string from the audit record). Accept it as a label alias — falls back to label,
  // then to the status string itself.
  status?: string;
  // 2026-05-27 iter11: + 'cyan' for 4 ppg + page sites that pass cyan to StatusPill.
  tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'cyan';
  // 2026-05-27 iter5: ppg/PhysicsDetailsPanel passes variant+size. Accepted-but-ignored
  // (future U-WEB-STATUSPILL-V2 wires variant→tone-with-warning-color and size→padding).
  // Also accept `children` since ppg/AIIntelligencePanel renders <StatusPill>{text}</StatusPill>.
  variant?: string;
  size?: string;
  children?: ReactNode;
}) {
  const displayLabel = label ?? status ?? (typeof children === 'string' ? children : '');
  const palette: Record<string, string> = {
    slate: 'bg-slate-300/16 text-slate-100',
    emerald: 'bg-emerald-300/16 text-emerald-100',
    amber: 'bg-amber-300/16 text-amber-100',
    rose: 'bg-rose-300/16 text-rose-100',
    sky: 'bg-sky-300/16 text-sky-100',
    violet: 'bg-violet-300/16 text-violet-100',
    cyan: 'bg-cyan-300/16 text-cyan-100',
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${palette[tone] ?? palette.slate}`}>
      {displayLabel}
    </span>
  );
}

// FLEET-IOS-REDESIGN U2: tone -> the three iOS fill styles (solid/outline/ghost).
const TONE_STYLES: Record<
  string,
  { solid: string; ring: string; accentText: string; accentBorder: string; soft: string }
> = {
  // FLEET-IOS-REDESIGN U3c: the DEFAULT 'cyan' tone is now ACCENT-DRIVEN -- its
  // bg/ring/text/border resolve to --accent-rgb (+ the AA-compliant --accent-fg
  // on the solid fill), so the ThemeCustomizer accent dial actually repaints
  // every primary CTA fleet-wide and the iOS bridge turns them systemBlue. The
  // semantic tones below (emerald=success, rose=danger, amber=warn, ...) stay
  // fixed -- only the primary accent follows the user / iOS-mode choice. In
  // studio mode --accent-rgb defaults to cyan, so the button looks as before.
  cyan: { solid: 'bg-accent text-accent-fg hover:bg-accent/90', ring: 'focus-visible:ring-accent/70', accentText: 'text-accent', accentBorder: 'border-accent/40', soft: 'hover:bg-accent/10' },
  emerald: { solid: 'bg-emerald-300 text-slate-950 hover:bg-emerald-200', ring: 'focus-visible:ring-emerald-300/70', accentText: 'text-emerald-100', accentBorder: 'border-emerald-300/40', soft: 'hover:bg-emerald-300/10' },
  amber: { solid: 'bg-amber-300 text-slate-950 hover:bg-amber-200', ring: 'focus-visible:ring-amber-300/70', accentText: 'text-amber-100', accentBorder: 'border-amber-300/40', soft: 'hover:bg-amber-300/10' },
  rose: { solid: 'bg-rose-300 text-slate-950 hover:bg-rose-200', ring: 'focus-visible:ring-rose-300/70', accentText: 'text-rose-100', accentBorder: 'border-rose-300/40', soft: 'hover:bg-rose-300/10' },
  violet: { solid: 'bg-violet-300 text-slate-950 hover:bg-violet-200', ring: 'focus-visible:ring-violet-300/70', accentText: 'text-violet-100', accentBorder: 'border-violet-300/40', soft: 'hover:bg-violet-300/10' },
  slate: { solid: 'bg-slate-300 text-slate-950 hover:bg-slate-200', ring: 'focus-visible:ring-slate-300/70', accentText: 'text-slate-100', accentBorder: 'border-slate-300/40', soft: 'hover:bg-slate-300/10' },
  sky: { solid: 'bg-sky-300 text-slate-950 hover:bg-sky-200', ring: 'focus-visible:ring-sky-300/70', accentText: 'text-sky-100', accentBorder: 'border-sky-300/40', soft: 'hover:bg-sky-300/10' },
};

const SIZE_STYLES: Record<string, string> = {
  sm: 'min-h-11 px-3.5 text-xs',
  md: 'min-h-11 px-5 text-sm',
  lg: 'min-h-[3.25rem] px-6 text-base',
};

export function ActionButton({
  children,
  onClick,
  disabled,
  tone = 'cyan',
  className,
  variant,
  size = 'md',
  loading = false,
}: {
  children: ReactNode;
  onClick?: (() => void) | (() => Promise<void>);
  disabled?: boolean;
  // 2026-05-27 iter11: + 'slate' + 'sky' for 3 page sites that pass them.
  // 2026-05-27 iter19: + 'ghost' for MachineRatesPage L495 (secondary CTA pattern).
  tone?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate' | 'sky' | 'ghost';
  className?: string;
  // 2026-06-09 (FLEET-IOS-REDESIGN U2): variant + size + loading are now RENDERED
  // (previously accepted-but-ignored, see the old golf tsc-fix note). variant:
  // 'solid'(default) | 'outline' | 'ghost'. size: 'sm' | 'md'(default) | 'lg' --
  // every size is >= 44pt tap height (--tap-min, iOS HIG). loading -> disabled +
  // aria-busy. tone='ghost' stays a backward-compatible alias for variant='ghost'.
  variant?: 'solid' | 'outline' | 'ghost' | string;
  size?: 'sm' | 'md' | 'lg' | string;
  loading?: boolean;
}) {
  const { impact } = useHaptics();
  const isGhostTone = tone === 'ghost';
  const effVariant = isGhostTone ? 'ghost' : variant ?? 'solid';
  const t = TONE_STYLES[isGhostTone ? 'slate' : tone] ?? TONE_STYLES.cyan;
  const sz = SIZE_STYLES[size] ?? SIZE_STYLES.md;
  const fill =
    effVariant === 'outline'
      ? `bg-transparent border ${t.accentBorder} ${t.accentText} ${t.soft}`
      : effVariant === 'ghost'
        ? `bg-transparent border border-transparent ${t.accentText} ${t.soft}`
        : `${t.solid} shadow-ios-1`;
  const isDisabled = disabled || loading;

  // FLEET-IOS-REDESIGN U3b: a light Taptic tick on every press. No-op on web
  // until the Capacitor shell ships (navigator.vibrate covers Android web); see
  // useHaptics. Fire ONLY when a real handler exists -- a button with no onClick
  // does nothing, so it must not buzz. The haptic precedes the handler so the
  // tactile response is synchronous with the tap even when onClick is async.
  const handleClick = onClick
    ? () => {
        impact('light');
        void onClick();
      }
    : undefined;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-ios-md font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${t.ring} ${sz} ${fill} disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ''}`}
    >
      {children}
    </button>
  );
}

// FLEET-IOS-REDESIGN U2: render an unknown value as a string for ResultCard.
function formatResultValue(v: unknown): string {
  if (v === null || v === undefined) return '--';
  if (typeof v === 'object') return JSON.stringify(v, null, 2);
  return String(v);
}

/*
 * ResultCard -- replaces the raw `<pre>{JSON.stringify(x, null, 2)}</pre>` result
 * dumps the redesign readers flagged as the worst "vibe-coded" tell. For a plain
 * object it renders an iOS-style key/value list; for arrays/primitives it falls
 * back to a formatted monospace block. Numerics stay monospace (data alignment).
 */
export function ResultCard({
  title,
  data,
  className,
}: {
  title?: string;
  data: unknown;
  className?: string;
}) {
  const entries =
    data && typeof data === 'object' && !Array.isArray(data)
      ? Object.entries(data as Record<string, unknown>)
      : null;

  return (
    <section className={`rounded-ios-lg border border-white/10 bg-slate-950/60 p-4 shadow-ios-1 ${className ?? ''}`}>
      {title ? (
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</div>
      ) : null}
      {entries ? (
        entries.length === 0 ? (
          <div className="text-sm text-slate-500">No data.</div>
        ) : (
          <dl className="grid gap-px overflow-hidden rounded-ios-sm">
            {entries.map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-4 bg-white/[0.02] px-3 py-2">
                <dt className="text-sm text-slate-400">{k}</dt>
                <dd className="break-all text-right font-mono text-sm text-slate-100">{formatResultValue(v)}</dd>
              </div>
            ))}
          </dl>
        )
      ) : (
        <pre className="overflow-auto rounded-ios-sm bg-white/[0.02] p-3 font-mono text-xs leading-relaxed text-slate-200">{formatResultValue(data)}</pre>
      )}
    </section>
  );
}

/*
 * Stepper -- a shared lifecycle/progress stepper (PayrollPage and others inline
 * their own). `current` is the 0-based index of the active step; earlier steps
 * render done (emerald + check), later steps render todo (dim).
 */
export function Stepper({
  steps,
  current,
  className,
}: {
  steps: string[];
  current: number;
  className?: string;
}) {
  return (
    <ol className={`flex items-center gap-2 ${className ?? ''}`} aria-label="progress">
      {steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'todo';
        return (
          <li
            key={label}
            className="flex flex-1 items-center gap-2"
            aria-current={state === 'active' ? 'step' : undefined}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                state === 'done'
                  ? 'bg-emerald-300 text-slate-950'
                  : state === 'active'
                    ? 'bg-accent text-accent-fg shadow-ios-accent'
                    : 'border border-white/15 bg-white/[0.03] text-slate-400'
              }`}
            >
              {state === 'done' ? (
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span className={`text-xs font-medium ${state === 'todo' ? 'text-slate-500' : 'text-slate-200'}`}>{label}</span>
            {i < steps.length - 1 ? (
              <span className={`h-px flex-1 ${i < current ? 'bg-emerald-300/40' : 'bg-white/10'}`} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
