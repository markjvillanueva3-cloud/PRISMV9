import type { LessonLabBrief, LessonMediaCard } from '../../data/academy';

interface LessonStudioProps {
  mediaCards: LessonMediaCard[];
  labBrief: LessonLabBrief;
}

export function LessonStudio({ mediaCards, labBrief }: LessonStudioProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Curated media set</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Study board</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              These are the outside references that should deepen the lesson instead of leaving it as abstract theory.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {mediaCards.length} media cards
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {mediaCards.map(card => (
            <article key={`${card.kind}-${card.title}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{card.kind}</div>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{card.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{card.caption}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-200">Machine-room lab</div>
        <h2 className="mt-2 text-2xl font-semibold">{labBrief.title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">{labBrief.objective}</p>

        <div className="mt-5 space-y-3">
          {labBrief.steps.map((step, index) => (
            <div key={step} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">Step {index + 1}</div>
              <div className="mt-2 text-sm leading-6 text-slate-100">{step}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">Deliverable</div>
          <div className="mt-2 text-sm leading-6 text-emerald-50">{labBrief.deliverable}</div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <FocusBlock label="Machine focus" values={labBrief.machine_focus} />
          <FocusBlock label="CAM / controls" values={labBrief.cam_focus} emptyLabel="General process thinking" />
        </div>
      </section>
    </div>
  );
}

function FocusBlock({
  label,
  values,
  emptyLabel,
}: {
  label: string;
  values: string[];
  emptyLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">{label}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.length > 0 ? values.map(value => (
          <span key={value} className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-slate-100">
            {value}
          </span>
        )) : (
          <span className="text-sm text-slate-400">{emptyLabel || 'No specific focus listed'}</span>
        )}
      </div>
    </div>
  );
}
