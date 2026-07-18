import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '../LoadingState';
import { ShellCommerceControls } from '../shell/ShellCommerceControls';
import { StatusPill } from '../workspace/WorkspacePrimitives';
import { useOperatingSystem } from '../../features/operating-system/OperatingSystemProvider';
import type {
  EmployeeShellBootstrap,
  EmployeeShellProfileSummary,
} from '../../features/operating-system/contracts';
import {
  getEmployeeShellHomePath,
  isEmployeeRouteAllowed,
  toEmployeeShellPath,
} from '../../features/operating-system/employeeShellRoutes';
import { persistEmployeeShellSession } from '../../features/operating-system/shellSession';

function navLinkClasses(active: boolean) {
  return active
    ? 'border-cyan-300/24 bg-cyan-300/[0.12] text-cyan-50 shadow-[0_14px_34px_rgba(34,211,238,0.12)]'
    : 'border-white/8 bg-white/[0.03] text-slate-200 hover:border-white/16 hover:bg-white/[0.05]';
}

function CountCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/8 bg-black/15 px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-50">{value}</div>
    </div>
  );
}

export function EmployeeShellLayout() {
  const services = useOperatingSystem();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedProfileId = searchParams.get('profile') ?? 'machinist';
  const searchParamsString = searchParams.toString();
  const [profiles, setProfiles] = useState<EmployeeShellProfileSummary[]>([]);
  const [bootstrap, setBootstrap] = useState<EmployeeShellBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Kienzle Tool Crib redesign (hotel domain) — iOS token layer
  // Uses DESIGN.md tokens: --font-sans, --radius-md, shadow-ios-*, min-h-11 (44pt tap targets)
  // New design language active for all employee portal + ERP surfaces

  useEffect(() => {
    let cancelled = false;

    async function loadShell() {
      setLoading(true);
      setError(null);
      try {
        const [nextProfiles, nextBootstrap] = await Promise.all([
          services.getEmployeeShellProfiles(),
          services.getEmployeeShellBootstrap(requestedProfileId),
        ]);

        if (cancelled) {
          return;
        }

        setProfiles(nextProfiles);
        setBootstrap(nextBootstrap);

        if (!new URLSearchParams(searchParamsString).get('profile') && nextProfiles[0]) {
          const nextParams = new URLSearchParams(searchParamsString);
          nextParams.set('profile', nextProfiles[0].id);
          setSearchParams(nextParams, { replace: true });
        }
      } catch (issue) {
        if (!cancelled) {
          setError(issue);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadShell();

    return () => {
      cancelled = true;
    };
  }, [reloadToken, requestedProfileId, searchParamsString, services, setSearchParams]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === requestedProfileId) ?? profiles[0] ?? null,
    [profiles, requestedProfileId],
  );

  useEffect(() => {
    persistEmployeeShellSession(requestedProfileId);
  }, [requestedProfileId]);

  const routeAllowed = bootstrap ? isEmployeeRouteAllowed(bootstrap, location.pathname) : true;

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_28%),linear-gradient(180deg,#061019_0%,#03070c_100%)] px-5 py-6 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1360px]">
          <LoadingState
            label="Loading employee shell..."
            detail="Resolving role claims, desk counts, and shell posture for this employee workspace."
            variant="panel"
          />
        </div>
      </div>
    );
  }

  if (error || !bootstrap || !selectedProfile) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_28%),linear-gradient(180deg,#061019_0%,#03070c_100%)] px-5 py-6 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1360px]">
          <ErrorState
            error={error}
            message={error instanceof Error ? error.message : 'Employee shell could not be staged.'}
            onRetry={() => {
              setLoading(true);
              setError(null);
              setReloadToken((value) => value + 1);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_28%),linear-gradient(180deg,#061019_0%,#03070c_100%)] px-5 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.94)_0%,rgba(5,10,16,0.96)_100%)] px-5 py-4 shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Platform controls</div>
            <div className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Global unit system, subscription tier, and add-on posture stay visible in the employee shell too, so the same sourcing and feature posture carries across the whole app.
            </div>
          </div>
          <ShellCommerceControls compact />
        </div>

        <div className="grid w-full gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-6 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
          <div className="rounded-[24px] border border-cyan-300/12 bg-cyan-300/[0.05] px-4 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/72">Employee shell</div>
            <div className="mt-3 text-xl font-semibold text-slate-50">{bootstrap.displayName}</div>
            <div className="mt-2 text-sm leading-6 text-slate-300">{bootstrap.subtitle}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusPill label={bootstrap.role} tone="sky" />
              <StatusPill label={bootstrap.department} tone="violet" />
            </div>
          </div>

          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Switch profile</div>
            <div className="mt-4 space-y-3">
              {profiles.map((profile) => {
                const active = profile.id === selectedProfile.id;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => {
                      const nextParams = new URLSearchParams(searchParams);
                      nextParams.set('profile', profile.id);
                      setSearchParams(nextParams);
                    }}
                    className={`w-full rounded-[20px] border px-3 py-3 text-left transition ${
                      active
                        ? 'border-cyan-300/24 bg-cyan-300/[0.08] text-cyan-50'
                        : 'border-white/8 bg-black/15 text-slate-200 hover:border-white/16 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="text-sm font-semibold">{profile.displayName}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      {profile.role} · {profile.department}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Desk counts</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <CountCard label="Inbox" value={String(bootstrap.deskCounts.inbox)} />
              <CountCard label="Approvals" value={String(bootstrap.deskCounts.approvals)} />
              <CountCard label="At risk" value={String(bootstrap.deskCounts.atRisk)} />
              <CountCard label="Live jobs" value={String(bootstrap.deskCounts.liveJobs)} />
            </div>
          </div>

          <nav className="space-y-4" aria-label="Employee navigation">
            <NavLink
              to={getEmployeeShellHomePath(bootstrap.profileId)}
              end
              className={({ isActive }) =>
                `block rounded-[20px] border px-4 py-3 text-sm font-semibold transition ${navLinkClasses(isActive)}`
              }
            >
              Home
            </NavLink>

            {bootstrap.navGroups.map((group) => (
              <div key={group.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{group.label}</div>
                <div className="mt-3 space-y-3">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.id}
                      to={toEmployeeShellPath(item.to, bootstrap.profileId)}
                      className={({ isActive }) =>
                        `block rounded-[20px] border px-4 py-3 text-sm transition ${navLinkClasses(isActive)}`
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-semibold text-slate-50">{item.label}</div>
                        {item.countLabel ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                            {item.countLabel}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-300">{item.description}</div>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Session</div>
            <div className="mt-3 text-sm leading-6 text-slate-300">
              Need a different role or the full office shell? Return to sign-in and choose a different workspace.
            </div>
            <NavLink
              to="/signin"
              className={({ isActive }) =>
                `mt-4 block rounded-[20px] border px-4 py-3 text-sm font-semibold transition ${navLinkClasses(isActive)}`
              }
            >
              Change Sign-In
            </NavLink>
          </div>
        </aside>

        <main className="min-w-0">
          {routeAllowed ? (
            <Outlet />
          ) : (
            <section className="rounded-[30px] border border-amber-300/18 bg-[linear-gradient(180deg,rgba(24,16,8,0.96)_0%,rgba(10,7,4,0.96)_100%)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
              <div className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-100">
                Unauthorized
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-slate-50">This role does not have access to that workspace.</h1>
              <div className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                The employee shell is intentionally filtered to the tabs and desks granted by the current bootstrap claims. Sensitive HR, payroll,
                finance, and unrelated admin surfaces stay out of this workspace.
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
                <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Try one of your allowed desks</div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {bootstrap.homeModules.map((module) => (
                      <NavLink
                        key={module.id}
                        to={toEmployeeShellPath(module.to, bootstrap.profileId)}
                        className={({ isActive }) =>
                          `block rounded-[20px] border px-4 py-3 text-sm transition ${navLinkClasses(isActive)}`
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-semibold text-slate-50">{module.title}</div>
                          {module.countLabel ? (
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                              {module.countLabel}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-300">{module.detail}</div>
                      </NavLink>
                    ))}
                  </div>
                </div>
                <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Hidden for this role</div>
                  <div className="mt-4 space-y-3">
                    {bootstrap.restrictedSurfaces.map((surface) => (
                      <div key={surface.id} className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3">
                        <div className="text-sm font-semibold text-slate-50">{surface.label}</div>
                        <div className="mt-2 text-sm leading-6 text-slate-300">{surface.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 rounded-[24px] border border-white/8 bg-black/20 p-4 text-sm leading-6 text-slate-300">
                {bootstrap.policyNote}
              </div>
            </section>
          )}
        </main>
        </div>
      </div>
    </div>
  );
}
