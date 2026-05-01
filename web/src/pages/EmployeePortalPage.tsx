import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '../components/LoadingState';
import { SurfaceStatusNotice } from '../components/operating-system/SurfaceStatusNotice';
import { useOperatingSystem } from '../features/operating-system/OperatingSystemProvider';
import { toEmployeeShellPath } from '../features/operating-system/employeeShellRoutes';
import type {
  EmployeeAccessCard,
  EmployeeShellBootstrap,
  EmployeeShellProfileSummary,
  RecentEntity,
} from '../features/operating-system/contracts';

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-slate-50">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-400">{hint}</div>
    </div>
  );
}

function AccessCard({
  card,
}: {
  card: EmployeeAccessCard;
}) {
  const toneClasses =
    card.tone === 'emerald'
      ? 'from-emerald-400/18 via-emerald-300/8'
      : card.tone === 'sky'
        ? 'from-sky-400/18 via-sky-300/8'
        : card.tone === 'amber'
          ? 'from-amber-400/18 via-amber-300/8'
          : card.tone === 'violet'
            ? 'from-violet-400/18 via-violet-300/8'
            : 'from-slate-400/18 via-slate-300/8';

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br ${toneClasses} to-transparent`} />
      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{card.label}</div>
        <div className="mt-3 text-xl font-semibold text-slate-50">{card.value}</div>
        <div className="mt-2 text-sm leading-6 text-slate-300">{card.detail}</div>
      </div>
    </div>
  );
}

function ShiftPriorityCard({
  bootstrap,
  priority,
}: {
  bootstrap: EmployeeShellBootstrap;
  priority: EmployeeShellBootstrap['shiftPriorities'][number];
}) {
  const toneClasses =
    priority.tone === 'emerald'
      ? 'border-emerald-300/24 bg-emerald-300/[0.08] text-emerald-50'
      : priority.tone === 'sky'
        ? 'border-sky-300/24 bg-sky-300/[0.08] text-sky-50'
        : priority.tone === 'amber'
          ? 'border-amber-300/24 bg-amber-300/[0.08] text-amber-50'
          : priority.tone === 'rose'
            ? 'border-rose-300/24 bg-rose-300/[0.08] text-rose-50'
            : priority.tone === 'violet'
              ? 'border-violet-300/24 bg-violet-300/[0.08] text-violet-50'
              : 'border-white/10 bg-white/[0.04] text-slate-100';

  return (
    <Link
      to={toEmployeeShellPath(priority.to, bootstrap.profileId)}
      className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 transition hover:border-cyan-300/24 hover:bg-cyan-300/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{priority.label}</div>
          <div className="mt-2 text-lg font-semibold text-slate-50">{priority.title}</div>
        </div>
        {priority.badge ? (
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${toneClasses}`}>
            {priority.badge}
          </span>
        ) : null}
      </div>
      <div className="mt-3 text-sm leading-6 text-slate-300">{priority.detail}</div>
    </Link>
  );
}

function AttentionItemCard({
  bootstrap,
  item,
}: {
  bootstrap: EmployeeShellBootstrap;
  item: EmployeeShellBootstrap['attentionItems'][number];
}) {
  const toneClasses =
    item.tone === 'emerald'
      ? 'border-emerald-300/18 bg-emerald-300/[0.08] text-emerald-100'
      : item.tone === 'sky'
        ? 'border-sky-300/18 bg-sky-300/[0.08] text-sky-100'
        : item.tone === 'amber'
          ? 'border-amber-300/18 bg-amber-300/[0.08] text-amber-100'
          : item.tone === 'rose'
            ? 'border-rose-300/18 bg-rose-300/[0.08] text-rose-100'
            : item.tone === 'violet'
              ? 'border-violet-300/18 bg-violet-300/[0.08] text-violet-100'
              : 'border-white/10 bg-white/[0.04] text-slate-100';

  return (
    <Link
      to={toEmployeeShellPath(item.to, bootstrap.profileId)}
      className="block rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 transition hover:border-cyan-300/24 hover:bg-cyan-300/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${toneClasses}`}>
          Attention
        </span>
      </div>
      <div className="mt-3 text-base font-semibold text-slate-50">{item.title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-300">{item.detail}</div>
    </Link>
  );
}

function HandoffNoteCard({
  bootstrap,
  note,
}: {
  bootstrap: EmployeeShellBootstrap;
  note: EmployeeShellBootstrap['handoffNotes'][number];
}) {
  const content = (
    <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 transition hover:border-cyan-300/24 hover:bg-cyan-300/10">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold text-slate-50">{note.author}</div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{note.timestampLabel}</div>
      </div>
      <div className="mt-3 text-sm leading-6 text-slate-300">{note.detail}</div>
    </div>
  );

  if (!note.to) {
    return content;
  }

  return <Link to={toEmployeeShellPath(note.to, bootstrap.profileId)}>{content}</Link>;
}

function EntityChip({
  entity,
  profileId,
}: {
  entity: RecentEntity;
  profileId: string;
}) {
  return (
    <Link
      to={toEmployeeShellPath(entity.to, profileId)}
      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 transition hover:border-cyan-300/24 hover:bg-cyan-300/10 hover:text-cyan-100"
    >
      {entity.type} {entity.id}
    </Link>
  );
}

export function EmployeePortalPage() {
  const services = useOperatingSystem();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedProfileId = searchParams.get('profile') ?? 'machinist';
  const [profiles, setProfiles] = useState<EmployeeShellProfileSummary[]>([]);
  const [bootstrap, setBootstrap] = useState<EmployeeShellBootstrap | null>(null);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      setLoadingProfiles(true);
      setError(null);
      try {
        const nextProfiles = await services.getEmployeeShellProfiles();
        if (!cancelled) {
          setProfiles(nextProfiles);
          if (!searchParams.get('profile') && nextProfiles[0]) {
            setSearchParams({ profile: nextProfiles[0].id }, { replace: true });
          }
        }
      } catch (issue) {
        if (!cancelled) {
          setError(issue instanceof Error ? issue.message : 'Employee portal profiles could not be loaded.');
        }
      } finally {
        if (!cancelled) {
          setLoadingProfiles(false);
        }
      }
    }

    void loadProfiles();

    return () => {
      cancelled = true;
    };
  }, [searchParams, services, setSearchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadBootstrap() {
      setLoadingBootstrap(true);
      setError(null);
      try {
        const nextBootstrap = await services.getEmployeeShellBootstrap(requestedProfileId);
        if (!cancelled) {
          setBootstrap(nextBootstrap);
        }
      } catch (issue) {
        if (!cancelled) {
          setError(issue instanceof Error ? issue.message : 'Employee shell bootstrap could not be loaded.');
        }
      } finally {
        if (!cancelled) {
          setLoadingBootstrap(false);
        }
      }
    }

    void loadBootstrap();

    return () => {
      cancelled = true;
    };
  }, [requestedProfileId, services]);

  useEffect(() => {
    let active = true;
    const unsubscribe = services.subscribeHotJobs(() => {
      services
        .getEmployeeShellBootstrap(requestedProfileId)
        .then((nextBootstrap) => {
          if (active) {
            setBootstrap(nextBootstrap);
          }
        })
        .catch((issue) => {
          if (active) {
            setError(issue instanceof Error ? issue.message : 'Employee shell bootstrap could not be loaded.');
          }
        });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [requestedProfileId, services]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === requestedProfileId) ?? profiles[0] ?? null,
    [profiles, requestedProfileId],
  );

  if (loadingProfiles || loadingBootstrap) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_28%),linear-gradient(180deg,#061019_0%,#03070c_100%)] px-5 py-6 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1240px]">
          <LoadingState label="Loading employee shell..." />
        </div>
      </div>
    );
  }

  if (error || !bootstrap || !selectedProfile) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_28%),linear-gradient(180deg,#061019_0%,#03070c_100%)] px-5 py-6 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1240px]">
          <ErrorState
            message={error ?? 'Employee shell could not be staged.'}
            onRetry={() => {
              setLoadingProfiles(true);
              setLoadingBootstrap(true);
              setError(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_28%),linear-gradient(180deg,#061019_0%,#03070c_100%)] px-5 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6">
        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(11,18,28,0.98)_0%,rgba(4,9,15,0.98)_58%,rgba(9,31,43,0.95)_100%)] px-6 py-6 shadow-[0_36px_120px_rgba(0,0,0,0.34)] sm:px-7">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                Employee shell
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">{bootstrap.displayName}</h1>
              <div className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{bootstrap.subtitle}</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100">
                  {bootstrap.role}
                </span>
                <span className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">
                  {bootstrap.department}
                </span>
              </div>
            </div>

            <div className="space-y-3 rounded-[28px] border border-white/10 bg-black/20 p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Choose profile</div>
              {profiles.map((profile) => {
                const active = profile.id === selectedProfile.id;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setSearchParams({ profile: profile.id })}
                    className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                      active
                        ? 'border-cyan-300/24 bg-cyan-300/[0.08] text-cyan-50'
                        : 'border-white/8 bg-white/[0.03] text-slate-200 hover:border-white/16 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="text-sm font-semibold">{profile.displayName}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                      {profile.role} · {profile.department}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">{profile.tagline}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
              <div className="mb-5">
                <div className="text-xl font-semibold text-slate-50">Access posture</div>
                <div className="mt-1 text-sm text-slate-400">This role gets a focused workspace, not a cut-down admin shell.</div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {bootstrap.accessCards.map((card) => (
                  <AccessCard key={card.id} card={card} />
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
              <div className="mb-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xl font-semibold text-slate-50">Shift priorities</div>
                  {bootstrap.hotJobs.length > 0 ? (
                    <span className="rounded-full border border-rose-300/18 bg-rose-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-100">
                      {bootstrap.hotJobs.length} shop hot
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  Management-marked hot jobs jump to the front of this list before the role-specific priorities, so the entire shop sees the same urgency order.
                </div>
              </div>
              <SurfaceStatusNotice title="Priority status" surfaces={['employeeShell', 'hotJobs']} className="mb-5" />
              <div className="grid gap-4 xl:grid-cols-3">
                {bootstrap.shiftPriorities.map((priority) => (
                  <ShiftPriorityCard key={priority.id} bootstrap={bootstrap} priority={priority} />
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
              <div className="mb-5">
                <div className="text-xl font-semibold text-slate-50">Home modules</div>
                <div className="mt-1 text-sm text-slate-400">Only the desks and workflows relevant to this role are surfaced here.</div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {bootstrap.homeModules.map((module) => (
                  <Link
                    key={module.id}
                    to={toEmployeeShellPath(module.to, bootstrap.profileId)}
                    className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 transition hover:border-cyan-300/24 hover:bg-cyan-300/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-lg font-semibold text-slate-50">{module.title}</div>
                      {module.countLabel ? (
                        <span className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                          {module.countLabel}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 text-sm leading-6 text-slate-300">{module.detail}</div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
              <div className="mb-5">
                <div className="text-xl font-semibold text-slate-50">Role-filtered navigation</div>
                <div className="mt-1 text-sm text-slate-400">Tabs are filtered by the bootstrap claims instead of being manually hidden per page.</div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {bootstrap.navGroups.map((group) => (
                  <div key={group.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{group.label}</div>
                    <div className="mt-4 space-y-3">
                      {group.items.map((item) => (
                        <Link
                          key={item.id}
                          to={toEmployeeShellPath(item.to, bootstrap.profileId)}
                          className="block rounded-[20px] border border-white/8 bg-black/15 px-4 py-4 transition hover:border-cyan-300/24 hover:bg-cyan-300/10"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-sm font-semibold text-slate-50">{item.label}</div>
                            {item.countLabel ? (
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                                {item.countLabel}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-2 text-sm leading-6 text-slate-300">{item.description}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
              <div className="mb-5">
                <div className="text-xl font-semibold text-slate-50">Blockers and handoffs</div>
                <div className="mt-1 text-sm text-slate-400">This is the provider-backed shift context Claude can later replace with live alert and handoff payloads.</div>
              </div>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="space-y-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-100/80">Attention now</div>
                  {bootstrap.attentionItems.map((item) => (
                    <AttentionItemCard key={item.id} bootstrap={bootstrap} item={item} />
                  ))}
                </div>
                <div className="space-y-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Latest handoffs</div>
                  {bootstrap.handoffNotes.map((note) => (
                    <HandoffNoteCard key={note.id} bootstrap={bootstrap} note={note} />
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
              <div className="mb-5">
                <div className="text-xl font-semibold text-slate-50">Desk counts</div>
                <div className="mt-1 text-sm text-slate-400">Counts remain provider-backed so Claude can swap in live payloads later.</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryCard
                  label="Hot jobs"
                  value={String(bootstrap.hotJobs.length)}
                  hint={bootstrap.hotJobs.length > 0 ? 'Shop-wide escalations are being pushed to the top of employee priority lists.' : 'No shop-wide hot jobs are active right now.'}
                />
                <SummaryCard label="Inbox" value={String(bootstrap.deskCounts.inbox)} hint="Assigned items requiring the selected role." />
                <SummaryCard label="Approvals" value={String(bootstrap.deskCounts.approvals)} hint="Open checks this role is allowed to see." />
                <SummaryCard label="At risk" value={String(bootstrap.deskCounts.atRisk)} hint="Jobs or issues that need intervention soon." />
                <SummaryCard label="Live jobs" value={String(bootstrap.deskCounts.liveJobs)} hint="Current jobs visible in this employee shell." />
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
              <div className="mb-5">
                <div className="text-xl font-semibold text-slate-50">Pinned and recent entities</div>
                <div className="mt-1 text-sm text-slate-400">Employees get only relevant records surfaced back to them, not the full private shell.</div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/72">Pinned</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {bootstrap.pins.map((entity) => (
                      <EntityChip key={`pin-${entity.id}`} entity={entity} profileId={bootstrap.profileId} />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Recent</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {bootstrap.recents.map((entity) => (
                      <EntityChip key={`recent-${entity.id}`} entity={entity} profileId={bootstrap.profileId} />
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
              <div className="mb-5">
                <div className="text-xl font-semibold text-slate-50">Intentionally hidden</div>
                <div className="mt-1 text-sm text-slate-400">These areas stay out of this role’s workspace on purpose.</div>
              </div>
              <div className="space-y-3">
                {bootstrap.restrictedSurfaces.map((surface) => (
                  <div key={surface.id} className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4">
                    <div className="text-sm font-semibold text-slate-50">{surface.label}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">{surface.detail}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-dashed border-cyan-300/18 bg-cyan-300/[0.05] p-5 text-sm leading-7 text-slate-300 shadow-[0_30px_90px_rgba(0,0,0,0.18)]">
              {bootstrap.policyNote}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
