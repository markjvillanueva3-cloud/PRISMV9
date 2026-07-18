import { type FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ErrorState, LoadingState } from '../components/LoadingState';
import { SurfaceStatusNotice } from '../components/operating-system/SurfaceStatusNotice';
import { useOperatingSystem } from '../features/operating-system/OperatingSystemProvider';
import type { EmailLoginOption, EmployeeShellProfileSummary } from '../features/operating-system/contracts';
import {
  clearShellSession,
  getShellSessionDestination,
  loadShellSession,
  persistAdminShellSession,
  persistEmailShellSession,
  persistEmployeeShellSession,
  type ShellSession,
} from '../features/operating-system/shellSession';

function ProfileCard({
  profile,
  onOpen,
}: {
  profile: EmployeeShellProfileSummary;
  onOpen: (profileId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(profile.id)}
      className="w-full rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] px-5 py-5 text-left shadow-[0_24px_80px_rgba(0,0,0,0.24)] transition hover:border-cyan-300/24 hover:bg-cyan-300/[0.08]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold text-slate-50">{profile.displayName}</div>
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/72">
            {profile.role} · {profile.department}
          </div>
        </div>
        <span className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
          Employee shell
        </span>
      </div>
      <div className="mt-4 text-sm leading-6 text-slate-300">{profile.tagline}</div>
      <div className="mt-5 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-100">
        Enter {profile.displayName} shell
      </div>
    </button>
  );
}

function EmailIdentityCard({
  option,
  onOpen,
}: {
  option: EmailLoginOption;
  onOpen: (option: EmailLoginOption) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(option)}
      className="w-full rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition hover:border-cyan-300/24 hover:bg-cyan-300/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-50">{option.displayName}</div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/72">
            {option.role} · {option.department}
          </div>
        </div>
        <span className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
          {option.unreadCount} unread
        </span>
      </div>
      <div className="mt-3 text-sm leading-6 text-slate-300">{option.email}</div>
      <div className="mt-2 text-sm leading-6 text-slate-400">{option.tagline}</div>
    </button>
  );
}

export function ShellGatewayPage() {
  const services = useOperatingSystem();
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<ShellSession | null>(() => loadShellSession());
  const [profiles, setProfiles] = useState<EmployeeShellProfileSummary[]>([]);
  const [emailOptions, setEmailOptions] = useState<EmailLoginOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [emailIssue, setEmailIssue] = useState<string | null>(null);
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      setLoading(true);
      setError(null);
      try {
        const [profilesResult, emailOptionsResult] = await Promise.allSettled([
          services.getEmployeeShellProfiles(),
          services.getEmailLoginOptions(),
        ]);

        if (cancelled) {
          return;
        }

        const nextProfiles =
          profilesResult.status === 'fulfilled' ? profilesResult.value : [];
        const nextEmailOptions =
          emailOptionsResult.status === 'fulfilled' ? emailOptionsResult.value : [];

        if (nextProfiles.length === 0 && nextEmailOptions.length === 0) {
          throw new Error('Sign-in profiles could not be loaded.');
        }

        if (!cancelled) {
          setProfiles(nextProfiles);
          setEmailOptions(nextEmailOptions);
        }
      } catch (issue) {
        if (!cancelled) {
          setError(issue instanceof Error ? issue.message : 'Sign-in profiles could not be loaded.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProfiles();

    return () => {
      cancelled = true;
    };
  }, [services]);

  if (location.pathname === '/' && session) {
    return <Navigate replace to={getShellSessionDestination(session)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_28%),linear-gradient(180deg,#061019_0%,#03070c_100%)] px-5 py-6 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1320px]">
          <LoadingState label="Loading sign-in shells..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_28%),linear-gradient(180deg,#061019_0%,#03070c_100%)] px-5 py-6 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1320px]">
          <ErrorState
            message={error}
            onRetry={() => {
              setLoading(true);
              setError(null);
            }}
          />
        </div>
      </div>
    );
  }

  function openEmailIdentity(option: EmailLoginOption) {
    setEmailIssue(null);
    persistEmailShellSession(option);
    setSession(loadShellSession());
    navigate(option.destination, { replace: true });
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailIssue(null);
    setEmailSubmitting(true);

    try {
      const option = await services.resolveEmailLogin(emailInput);
      if (!option) {
        setEmailIssue('That email is not linked to a staged Kienzle workspace yet.');
        return;
      }

      openEmailIdentity(option);
    } catch (issue) {
      setEmailIssue(issue instanceof Error ? issue.message : 'Email sign-in could not be completed.');
    } finally {
      setEmailSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_28%),linear-gradient(180deg,#061019_0%,#03070c_100%)] px-5 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6">
        <section className="overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,rgba(11,18,28,0.98)_0%,rgba(4,9,15,0.98)_56%,rgba(8,30,43,0.95)_100%)] px-6 py-6 shadow-[0_36px_120px_rgba(0,0,0,0.34)] sm:px-7">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                Role-aware entry
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">Choose Your Workspace</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Shop-floor employees should reopen into their filtered shell by default, while planners and office users can still move into the
                broader operating workspace when that is actually required.
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-cyan-100/72">
                Email-linked sign-in now pulls from the live employee directory when it can, while mailbox replies and app messages still converge
                through the staged messages seam until the backend inbox routes fully land.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Workspace rules</div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                <p>Employee shells hide HR, payroll, finance, and unrelated admin surfaces.</p>
                <p>Remembered sign-in state only changes the frontend entry flow. Claude-owned backend claims still remain the final authority.</p>
                <p>Recognized email identities can now come from the live employee directory, while customer, supplier, and handoff threads still stay record-connected through the staged inbox seam.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  persistAdminShellSession();
                  setSession(loadShellSession());
                  navigate('/dashboard', { replace: true });
                }}
                className="mt-5 inline-flex w-full items-center justify-center rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/16 hover:bg-white/[0.08]"
              >
                Open full operations workspace
              </button>
              <div className="mt-3 text-xs leading-6 text-slate-500">
                Use this for owner, office, or cross-functional work that belongs in the broader shell.
              </div>
              <div className="mt-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Quick launch</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to="/employee"
                    className="inline-flex items-center justify-center rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-300/28 hover:bg-cyan-300/[0.16]"
                  >
                    Employee workspace
                  </Link>
                  <Link
                    to="/shop-clock"
                    className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-100 transition hover:border-white/16 hover:bg-white/[0.08]"
                  >
                    Shop clock kiosk
                  </Link>
                  <Link
                    to="/employees"
                    className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-100 transition hover:border-white/16 hover:bg-white/[0.08]"
                  >
                    People ops
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.94)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Email-linked sign-in</div>
            <h2 className="mt-3 text-2xl font-semibold text-slate-50">Route mailbox access directly into Kienzle messages</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Use a recognized shop email to jump into the role-aware shell and start from the same inbox where customer replies, supplier updates,
              and floor handoffs get threaded to jobs and orders.
            </p>
            <SurfaceStatusNotice title="Identity and inbox status" surfaces={['emailLogin', 'messages']} className="mt-5" />
            <form className="mt-5 space-y-4" onSubmit={handleEmailSubmit}>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Email</span>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(event) => {
                    setEmailInput(event.target.value);
                    if (emailIssue) {
                      setEmailIssue(null);
                    }
                  }}
                  placeholder="name@shop.com"
                  className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/24 focus:bg-cyan-300/[0.06]"
                />
              </label>
              {emailIssue ? (
                <div className="rounded-[18px] border border-amber-300/18 bg-amber-300/[0.08] px-4 py-3 text-sm leading-6 text-amber-100">
                  {emailIssue}
                </div>
              ) : null}
              <button
                type="submit"
                disabled={emailSubmitting || emailInput.trim().length === 0}
                className="inline-flex w-full items-center justify-center rounded-[20px] border border-cyan-300/18 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/26 hover:bg-cyan-300/[0.16] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {emailSubmitting ? 'Checking email workspace...' : 'Continue with email'}
              </button>
            </form>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.94)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Recognized mailboxes</div>
                <div className="mt-3 text-xl font-semibold text-slate-50">Jump straight into a directory-backed inbox context</div>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                Live directory + staged inbox
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {emailOptions.map((option) => (
                <EmailIdentityCard key={option.id} option={option} onOpen={openEmailIdentity} />
              ))}
            </div>
          </div>
        </section>

        {session ? (
          <section className="rounded-[28px] border border-cyan-300/14 bg-cyan-300/[0.05] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/72">Remembered shell</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">
                  {session.kind === 'employee' ? `Employee shell · ${session.profileId}` : 'Full operations workspace'}
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  Root launches will reopen into this shell until you choose another workspace here.
                </div>
                {session.email ? (
                  <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/72">
                    {session.identityLabel ? `${session.identityLabel} · ` : ''}
                    {session.email}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  to={getShellSessionDestination(session)}
                  className="inline-flex items-center justify-center rounded-[18px] border border-cyan-300/18 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/26 hover:bg-cyan-300/[0.16]"
                >
                  Continue current shell
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    clearShellSession();
                    setSession(null);
                  }}
                  className="inline-flex items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/16 hover:bg-white/[0.08]"
                >
                  Forget remembered shell
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-3">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onOpen={(profileId) => {
                persistEmployeeShellSession(profileId);
                setSession(loadShellSession());
                navigate(`/employee?profile=${encodeURIComponent(profileId)}`, { replace: true });
              }}
            />
          ))}
        </section>
      </div>
    </div>
  );
}
