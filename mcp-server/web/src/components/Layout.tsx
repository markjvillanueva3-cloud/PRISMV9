import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  MOBILE_NAV_ITEMS,
  NAV_SECTIONS,
  findCurrentLabel,
  flattenWorkspaceCommands,
  isNavGroup,
  type ClearanceLevel,
  type NavEntry,
  type WorkspaceCommand,
} from './shell/shellCatalog';
import { useAuth, meetsMinClearance } from '../contexts/AuthContext';
import { ErrorState } from './ErrorState';
import { ShellCommerceControls } from './shell/ShellCommerceControls';
import NotificationBell from './NotificationBell';
import { SurfaceStatusNotice } from './operating-system/SurfaceStatusNotice';
import { useOperatingSystem } from '../features/operating-system/OperatingSystemProvider';
import type {
  SearchResult,
  ShellBootstrap,
  ShellSavedView,
} from '../features/operating-system/contracts';
import {
  SHELL_SAVED_VIEWS_EVENT,
  SHELL_SAVED_VIEWS_KEY,
  readShellSavedViews,
} from '../features/operating-system/shellSavedViewsState';

type RecentWorkspace = {
  to: string;
  label: string;
};

type ShellRecordSummary = SearchResult;

const NAV_STATE_KEY = 'prism_nav_state_v1';
const RECENT_WORKSPACES_KEY = 'prism_recent_workspaces_v1';
const PINNED_WORKSPACES_KEY = 'prism_pinned_workspaces_v1';
const RECENT_RECORDS_KEY = 'prism_recent_records_v1';
const PINNED_RECORDS_KEY = 'prism_pinned_records_v1';

const FEATURED_COMMAND_ROUTE_ORDER = [
  '/dashboard',
  '/calculator',
  '/employee',
  '/shop-clock',
  '/jobs',
  '/quality',
  '/quote-builder',
  '/scheduling',
  '/employees',
  '/timecards',
  '/payroll',
  '/learning',
] as const;

function navItemClasses(active: boolean) {
  return active
    ? 'border-cyan-300/24 bg-cyan-300/10 text-cyan-100 shadow-[0_8px_24px_rgba(34,211,238,0.10)]'
    : 'border-transparent bg-transparent text-slate-300 hover:border-white/8 hover:bg-white/[0.045] hover:text-white';
}

function loadPersistedNavState() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(NAV_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as {
      openGroups?: Record<string, boolean>;
      collapsedSections?: Record<string, boolean>;
      desktopSidebarCollapsed?: boolean;
    };
  } catch {
    return null;
  }
}

function loadStoredCollection<T>(key: string) {
  if (typeof window === 'undefined') {
    return [] as T[];
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function normalizeWorkspaceRoute(to: string) {
  return to === '/' ? '/dashboard' : to;
}

function normalizeWorkspaceTarget(to: string) {
  try {
    const url = new URL(to, 'http://prism.local');
    url.pathname = normalizeWorkspaceRoute(url.pathname);
    return `${url.pathname}${url.search}`;
  } catch {
    return '/dashboard';
  }
}

function loadRecentWorkspaces() {
  return loadStoredCollection<RecentWorkspace>(RECENT_WORKSPACES_KEY).map((entry) => ({
    ...entry,
    to: normalizeWorkspaceTarget(entry.to),
  }));
}

function loadPinnedWorkspaces() {
  return loadStoredCollection<RecentWorkspace>(PINNED_WORKSPACES_KEY).map((entry) => ({
    ...entry,
    to: normalizeWorkspaceTarget(entry.to),
  }));
}

function loadRecentRecords() {
  return loadStoredCollection<ShellRecordSummary>(RECENT_RECORDS_KEY);
}

function loadPinnedRecords() {
  return loadStoredCollection<ShellRecordSummary>(PINNED_RECORDS_KEY);
}

function persistCollection<T>(key: string, value: T[]) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}

function formatRecordMeta(summary: ShellRecordSummary) {
  return `${summary.type} ${summary.id}`;
}

function buildPinnedRecordCollection(
  current: ShellRecordSummary[],
  summary: ShellRecordSummary,
) {
  if (current.some((entry) => entry.id === summary.id)) {
    return current.filter((entry) => entry.id !== summary.id);
  }

  return [summary, ...current.filter((entry) => entry.id !== summary.id)].slice(0, 8);
}

function buildRecentRecordCollection(
  current: ShellRecordSummary[],
  summary: ShellRecordSummary,
) {
  return [summary, ...current.filter((entry) => entry.id !== summary.id)].slice(0, 6);
}

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const services = useOperatingSystem();
  const auth = useAuth();
  const commandInputRef = useRef<HTMLInputElement>(null);
  const calculatorSidebarRestoreRef = useRef<boolean | null>(null);
  const wasCalculatorWorkspaceRef = useRef(false);
  const persistedState = useMemo(() => loadPersistedNavState(), []);
  const workspaceCommands = useMemo(
    () =>
      flattenWorkspaceCommands().filter(
        (command) => !command.minClearance || meetsMinClearance(auth.clearance_level, command.minClearance),
      ),
    [auth.clearance_level],
  );
  const [shellBootstrap, setShellBootstrap] = useState<ShellBootstrap | null>(null);
  const [shellBootstrapIssue, setShellBootstrapIssue] = useState<unknown | null>(null);
  const [shellBootstrapReloadToken, setShellBootstrapReloadToken] = useState(0);
  const [searchState, setSearchState] = useState<{
    status: 'idle' | 'loading' | 'ready' | 'error';
    results: SearchResult[];
  }>({ status: 'idle', results: [] });
  const activeRecord = useMemo(
    () => services.findRecordByFocus(location.pathname, location.search),
    [location.pathname, location.search, services],
  );
  const activeRecordSummary = useMemo(
    () => activeRecord,
    [activeRecord],
  );
  const [navQuery, setNavQuery] = useState('');
  const [commandQuery, setCommandQuery] = useState('');
  const [isCommandOpen, setCommandOpen] = useState(false);
  const deferredCommandQuery = useDeferredValue(commandQuery);
  const isCalculatorWorkspace =
    location.pathname === '/calculator' ||
    location.pathname === '/toolpath' ||
    location.pathname === '/what-if' ||
    location.pathname === '/ppg';
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => ({
    calculator: persistedState?.openGroups?.calculator ?? isCalculatorWorkspace,
  }));
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(
    () => persistedState?.collapsedSections ?? {},
  );
  const [isDesktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(
    () => persistedState?.desktopSidebarCollapsed ?? false,
  );
  const [recentWorkspaces, setRecentWorkspaces] = useState<RecentWorkspace[]>(() => loadRecentWorkspaces());
  const [pinnedWorkspaces, setPinnedWorkspaces] = useState<RecentWorkspace[]>(() => loadPinnedWorkspaces());
  const [recentRecords, setRecentRecords] = useState<ShellRecordSummary[]>(() => loadRecentRecords());
  const [pinnedRecords, setPinnedRecords] = useState<ShellRecordSummary[]>(() => loadPinnedRecords());
  const [savedViews, setSavedViews] = useState<ShellSavedView[]>([]);

  const currentLabel = useMemo(() => findCurrentLabel(location.pathname), [location.pathname]);
  const currentWorkspaceTarget = useMemo(
    () => normalizeWorkspaceTarget(`${location.pathname}${location.search}`),
    [location.pathname, location.search],
  );
  const isSearchActive = navQuery.trim().length > 0;
  const normalizedCommandQuery = deferredCommandQuery.trim().toLowerCase();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.prismRailCollapsed = isDesktopSidebarCollapsed ? 'true' : 'false';
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prism:rail-state', { detail: { collapsed: isDesktopSidebarCollapsed } }));
    }
  }, [isDesktopSidebarCollapsed]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleToggleRail = () => {
      setDesktopSidebarCollapsed((current) => !current);
    };
    const handleOpenSearch = () => {
      setCommandOpen(true);
    };

    window.addEventListener('prism:calculator-toggle-rail', handleToggleRail);
    window.addEventListener('prism:calculator-open-search', handleOpenSearch);

    return () => {
      window.removeEventListener('prism:calculator-toggle-rail', handleToggleRail);
      window.removeEventListener('prism:calculator-open-search', handleOpenSearch);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadShellBootstrap() {
      try {
        if (!cancelled) {
          setShellBootstrapIssue(null);
        }

        const nextBootstrap = await services.getShellBootstrap();
        if (cancelled) {
          return;
        }

        setShellBootstrap(nextBootstrap);
        setShellBootstrapIssue(null);
        setPinnedRecords((current) => {
          if (current.length > 0) {
            return current;
          }

          persistCollection(PINNED_RECORDS_KEY, nextBootstrap.pinnedEntities);
          return nextBootstrap.pinnedEntities;
        });
        setRecentRecords((current) => {
          if (current.length > 0) {
            return current;
          }

          persistCollection(RECENT_RECORDS_KEY, nextBootstrap.recentEntities);
          return nextBootstrap.recentEntities;
        });
      } catch (issue) {
        if (!cancelled) {
          setShellBootstrap(null);
          setShellBootstrapIssue(issue);
        }
      }
    }

    void loadShellBootstrap();

    return () => {
      cancelled = true;
    };
  }, [services, shellBootstrapReloadToken]);

  useEffect(() => {
    let cancelled = false;

    async function loadShellRecordState() {
      try {
        const shellRecordState = await services.getShellRecordState();
        if (cancelled) {
          return;
        }

        if (shellRecordState.pinnedRecords.length > 0) {
          persistCollection(PINNED_RECORDS_KEY, shellRecordState.pinnedRecords);
          setPinnedRecords(shellRecordState.pinnedRecords);
        }

        if (shellRecordState.recentRecords.length > 0) {
          persistCollection(RECENT_RECORDS_KEY, shellRecordState.recentRecords);
          setRecentRecords(shellRecordState.recentRecords);
        }
      } catch {
        // Keep local and bootstrap fallback state when shell-record routes are unavailable.
      }
    }

    void loadShellRecordState();

    return () => {
      cancelled = true;
    };
  }, [services]);

  useEffect(() => {
    let cancelled = false;

    async function loadSavedViews() {
      try {
        const nextSavedViews = await services.getShellSavedViews('workspace');
        if (!cancelled) {
          setSavedViews(nextSavedViews);
        }
      } catch {
        if (!cancelled) {
          setSavedViews([]);
        }
      }
    }

    void loadSavedViews();

    return () => {
      cancelled = true;
    };
  }, [services]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncSavedViewsFromProvider = () => {
      void services
        .getShellSavedViews('workspace')
        .then((nextSavedViews) => setSavedViews(nextSavedViews))
        .catch(() => {
          setSavedViews(readShellSavedViews('workspace'));
        });
    };

    const handleSavedViewsChange = (event: Event) => {
      const detail =
        event instanceof CustomEvent && Array.isArray(event.detail)
          ? (event.detail as ShellSavedView[])
          : null;

      if (detail) {
        setSavedViews(
          detail.filter((view) => view.entityType.toLowerCase() === 'workspace'),
        );
        return;
      }

      syncSavedViewsFromProvider();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== SHELL_SAVED_VIEWS_KEY) {
        return;
      }

      syncSavedViewsFromProvider();
    };

    window.addEventListener(SHELL_SAVED_VIEWS_EVENT, handleSavedViewsChange as EventListener);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(
        SHELL_SAVED_VIEWS_EVENT,
        handleSavedViewsChange as EventListener,
      );
      window.removeEventListener('storage', handleStorage);
    };
  }, [services]);

  useEffect(() => {
    if (isCalculatorWorkspace) {
      setOpenGroups((current) => ({ ...current, calculator: true }));
    }
  }, [isCalculatorWorkspace]);

  useEffect(() => {
    if (isCalculatorWorkspace && !wasCalculatorWorkspaceRef.current) {
      calculatorSidebarRestoreRef.current = isDesktopSidebarCollapsed;
      setDesktopSidebarCollapsed(true);
    } else if (!isCalculatorWorkspace && wasCalculatorWorkspaceRef.current) {
      if (calculatorSidebarRestoreRef.current !== null) {
        setDesktopSidebarCollapsed(calculatorSidebarRestoreRef.current);
        calculatorSidebarRestoreRef.current = null;
      }
    }

    wasCalculatorWorkspaceRef.current = isCalculatorWorkspace;
  }, [isCalculatorWorkspace, isDesktopSidebarCollapsed]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      NAV_STATE_KEY,
      JSON.stringify({
        openGroups,
        collapsedSections,
        desktopSidebarCollapsed: isDesktopSidebarCollapsed,
      }),
    );
  }, [collapsedSections, isDesktopSidebarCollapsed, openGroups]);

  useEffect(() => {
    setRecentWorkspaces((current) => {
      const next = [{ to: currentWorkspaceTarget, label: currentLabel }, ...current.filter((entry) => entry.to !== currentWorkspaceTarget)].slice(0, 5);
      persistCollection(RECENT_WORKSPACES_KEY, next);
      return next;
    });
  }, [currentLabel, currentWorkspaceTarget]);

  useEffect(() => {
    if (!activeRecordSummary) {
      return;
    }

    setRecentRecords((current) => {
      const next = [activeRecordSummary, ...current.filter((entry) => entry.id !== activeRecordSummary.id)].slice(0, 6);
      persistCollection(RECENT_RECORDS_KEY, next);
      return next;
    });
  }, [activeRecordSummary]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }

      if (event.key === 'Escape') {
        setCommandOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isCommandOpen) {
      setCommandQuery('');
      setSearchState({ status: 'idle', results: [] });
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      commandInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isCommandOpen]);

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      if (!normalizedCommandQuery) {
        setSearchState({ status: 'idle', results: [] });
        return;
      }

      setSearchState({ status: 'loading', results: [] });

      try {
        const results = await services.search(normalizedCommandQuery);
        if (!cancelled) {
          setSearchState({ status: 'ready', results });
        }
      } catch {
        if (!cancelled) {
          setSearchState({ status: 'error', results: [] });
        }
      }
    }

    void runSearch();

    return () => {
      cancelled = true;
    };
  }, [normalizedCommandQuery, services]);

  const pushRecentRecord = (summary: ShellRecordSummary) => {
    let nextRecords: ShellRecordSummary[] = [];

    setRecentRecords((current) => {
      nextRecords = buildRecentRecordCollection(current, summary);
      persistCollection(RECENT_RECORDS_KEY, nextRecords);
      return nextRecords;
    });

    void services
      .recordShellRecordAccess(summary, nextRecords)
      .then((records) => {
        persistCollection(RECENT_RECORDS_KEY, records);
        setRecentRecords(records);
      })
      .catch(() => {
        // Keep the optimistic local recent-record rail when backend sync is unavailable.
      });
  };

  const togglePinnedWorkspace = (workspace: RecentWorkspace) => {
    const normalizedWorkspace = {
      ...workspace,
      to: normalizeWorkspaceTarget(workspace.to),
    };

    setPinnedWorkspaces((current) => {
      const next = current.some((entry) => entry.to === normalizedWorkspace.to)
        ? current.filter((entry) => entry.to !== normalizedWorkspace.to)
        : [normalizedWorkspace, ...current.filter((entry) => entry.to !== normalizedWorkspace.to)].slice(0, 8);
      persistCollection(PINNED_WORKSPACES_KEY, next);
      return next;
    });
  };

  const matchingSavedView = useMemo(
    () => savedViews.find((view) => normalizeWorkspaceTarget(view.to) === currentWorkspaceTarget) ?? null,
    [currentWorkspaceTarget, savedViews],
  );

  const syncSavedViews = (action: Promise<ShellSavedView[]>) => {
    void action
      .then((views) => setSavedViews(views))
      .catch(() => {
        // Keep the last known saved-view rail when the provider route is unavailable.
      });
  };

  const saveCurrentWorkspaceView = () => {
    if (matchingSavedView) {
      syncSavedViews(
        services.updateShellSavedView({
          viewId: matchingSavedView.id,
          to: currentWorkspaceTarget,
        }),
      );
      return;
    }

    syncSavedViews(
      services.createShellSavedView({
        name: currentLabel,
        entityType: 'workspace',
        to: currentWorkspaceTarget,
      }),
    );
  };

  const deleteCurrentWorkspaceView = () => {
    if (!matchingSavedView) {
      return;
    }

    syncSavedViews(services.deleteShellSavedView(matchingSavedView.id, 'workspace'));
  };

  const togglePinnedRecord = (summary: ShellRecordSummary) => {
    let nextRecords: ShellRecordSummary[] = [];
    let shouldUnpin = false;

    setPinnedRecords((current) => {
      shouldUnpin = current.some((entry) => entry.id === summary.id);
      nextRecords = buildPinnedRecordCollection(current, summary);
      persistCollection(PINNED_RECORDS_KEY, nextRecords);
      return nextRecords;
    });

    const sync = shouldUnpin
      ? services.unpinShellRecord(summary, nextRecords)
      : services.pinShellRecord(summary, nextRecords);

    void sync
      .then((records) => {
        persistCollection(PINNED_RECORDS_KEY, records);
        setPinnedRecords(records);
      })
      .catch(() => {
        // Keep the optimistic local pinned rail when backend sync is unavailable.
      });
  };

  const openWorkspace = (workspace: RecentWorkspace) => {
    navigate(workspace.to);
    setCommandOpen(false);
  };

  const openSavedView = (view: ShellSavedView) => {
    navigate(view.to);
    setCommandOpen(false);
  };

  const openRecordSummary = (summary: ShellRecordSummary) => {
    pushRecentRecord(summary);
    navigate(summary.to);
    setCommandOpen(false);
  };

  const openRecord = (record: SearchResult) => {
    openRecordSummary(record);
  };

  const filteredSections = useMemo(() => {
    const query = navQuery.trim().toLowerCase();
    const userClearance = auth.clearance_level;

    // Helper: check if item passes clearance filter
    const passesClearance = (mc?: ClearanceLevel) =>
      !mc || meetsMinClearance(userClearance, mc);

    const sections = NAV_SECTIONS
      .filter((section) => passesClearance(section.minClearance))
      .map((section) => {
        const items = section.items
          .map((item) => {
            if (isNavGroup(item)) {
              if (!passesClearance(item.minClearance)) return null;
              const children = item.items.filter((child) => {
                if (!passesClearance(child.minClearance)) return false;
                if (!query) return true;
                const searchText = [item.label, child.label, ...(item.keywords ?? []), ...(child.keywords ?? [])]
                  .join(' ')
                  .toLowerCase();
                return searchText.includes(query);
              });

              if (!query) return { ...item, items: children };
              if (item.label.toLowerCase().includes(query) || children.length > 0) {
                return { ...item, items: children.length > 0 ? children : item.items.filter((c) => passesClearance(c.minClearance)) };
              }
              return null;
            }

            if (!passesClearance(item.minClearance)) return null;
            if (!query) return item;
            const searchText = [item.label, ...(item.keywords ?? [])].join(' ').toLowerCase();
            return searchText.includes(query) ? item : null;
          })
          .filter(Boolean) as NavEntry[];

        return { ...section, items };
      })
      .filter((section) => section.items.length > 0);

    return sections;
  }, [navQuery, auth.clearance_level]);

  const featuredWorkspaces = useMemo(
    () =>
      FEATURED_COMMAND_ROUTE_ORDER.map((route) => workspaceCommands.find((command) => command.to === route))
        .filter((command): command is WorkspaceCommand => Boolean(command))
        .slice(0, 8),
    [workspaceCommands],
  );
  const mobileNavItems = useMemo(
    () =>
      MOBILE_NAV_ITEMS.filter(
        (item) => !item.minClearance || meetsMinClearance(auth.clearance_level, item.minClearance),
      ),
    [auth.clearance_level],
  );

  const matchingWorkspaceCommands = useMemo(() => {
    if (!normalizedCommandQuery) {
      return [] as WorkspaceCommand[];
    }

    return workspaceCommands
      .filter((command) => command.searchText.includes(normalizedCommandQuery))
      .slice(0, 8);
  }, [normalizedCommandQuery, workspaceCommands]);

  const matchingRecords = searchState.results;

  const renderWorkspaceChip = (workspace: RecentWorkspace, compact = false) => (
    <button
      key={workspace.to}
      type="button"
      onClick={() => openWorkspace(workspace)}
      className={`rounded-full border px-3 py-1.5 text-left font-medium transition ${
        compact ? 'text-xs' : 'text-sm'
      } border-white/8 bg-white/[0.03] text-slate-200 hover:border-cyan-300/24 hover:bg-cyan-300/10 hover:text-cyan-100`}
    >
      {workspace.label}
    </button>
  );

  const renderSavedViewChip = (view: ShellSavedView, compact = false) => (
    <button
      key={view.id}
      type="button"
      onClick={() => openSavedView(view)}
      className={`rounded-full border px-3 py-1.5 text-left font-medium transition ${
        compact ? 'text-xs' : 'text-sm'
      } ${
        normalizeWorkspaceTarget(view.to) === currentWorkspaceTarget
          ? 'border-cyan-300/30 bg-cyan-300/12 text-cyan-100'
          : 'border-white/8 bg-white/[0.03] text-slate-200 hover:border-cyan-300/24 hover:bg-cyan-300/10 hover:text-cyan-100'
      }`}
    >
      {view.name}
    </button>
  );

  const renderRecordRailItem = (summary: ShellRecordSummary, allowUnpin: boolean) => {
    const isPinned = pinnedRecords.some((entry) => entry.id === summary.id);

    return (
      <div key={summary.id} className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => openRecordSummary(summary)}
          className="flex-1 rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-3 text-left transition hover:border-cyan-300/24 hover:bg-cyan-300/10"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/70">
                {formatRecordMeta(summary)}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-100">{summary.title}</div>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              {summary.status}
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">{summary.workspaceLabel}</div>
        </button>
        <button
          type="button"
          aria-label={`${isPinned ? 'Unpin' : 'Pin'} ${summary.title}`}
          onClick={() => togglePinnedRecord(summary)}
          className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
            isPinned || allowUnpin
              ? 'border-cyan-300/30 bg-cyan-300/12 text-cyan-100'
              : 'border-white/8 bg-white/[0.03] text-slate-400 hover:border-white/16 hover:text-slate-200'
          }`}
        >
          {allowUnpin ? 'Unpin' : 'Pin'}
        </button>
      </div>
    );
  };

  const renderCommandRecordRow = (record: SearchResult) => {
    const summary = record;
    const isPinned = pinnedRecords.some((entry) => entry.id === summary.id);

    return (
      <div key={record.id} className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => openRecord(record)}
          className="flex-1 rounded-[22px] border border-white/8 bg-white/[0.02] px-4 py-4 text-left transition hover:border-cyan-300/24 hover:bg-cyan-300/10"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/70">
                {record.type} {record.id}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-100">{record.title}</div>
              <div className="mt-2 text-sm text-slate-400">{record.detail}</div>
            </div>
            <div className="min-w-[120px] rounded-[18px] border border-white/10 bg-white/[0.04] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
              <div>{record.status}</div>
              <div className="mt-1 text-[10px] text-slate-500">{record.owner}</div>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-500">{record.workspaceLabel}</div>
        </button>
        <button
          type="button"
          aria-label={`${isPinned ? 'Unpin' : 'Pin'} ${record.title}`}
          onClick={() => togglePinnedRecord(summary)}
          className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
            isPinned
              ? 'border-cyan-300/30 bg-cyan-300/12 text-cyan-100'
              : 'border-white/8 bg-white/[0.03] text-slate-400 hover:border-white/16 hover:text-slate-200'
          }`}
        >
          {isPinned ? 'Unpin' : 'Pin'}
        </button>
      </div>
    );
  };

  const isCurrentWorkspacePinned = pinnedWorkspaces.some((entry) => entry.to === currentWorkspaceTarget);
  const isFocusedRecordPinned = activeRecordSummary
    ? pinnedRecords.some((entry) => entry.id === activeRecordSummary.id)
    : false;

  return (
    <div className="prism-dark min-h-screen bg-[#071017] text-slate-100 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden">
      {isCommandOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-[#020508]/82 px-4 py-6 backdrop-blur-sm md:py-10"
          onClick={() => setCommandOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Global search"
            className="max-h-[calc(100vh-3rem)] w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-[#050b10]/98 shadow-[0_32px_120px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-cyan-500/10 px-4 py-4 md:px-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">
                  Ctrl K
                </div>
                <input
                  ref={commandInputRef}
                  aria-label="Global search query"
                  type="text"
                  value={commandQuery}
                  onChange={(event) => setCommandQuery(event.target.value)}
                  placeholder="Search jobs, quotes, customers, parts, orders, lessons, or workspaces"
                  className="flex-1 border-0 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                />
                <button
                  type="button"
                  aria-label="Close global search"
                  onClick={() => setCommandOpen(false)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300 transition hover:border-white/20 hover:text-white"
                >
                  Close
                </button>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Cross-app shell search for desks, active records, and the next action lane you need.
              </div>
            </div>

            <div className="grid max-h-[calc(100vh-11rem)] gap-4 overflow-y-auto p-4 md:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] md:px-6 md:py-5">
              <div className="space-y-4">
                {normalizedCommandQuery ? (
                  <>
                    <section className="space-y-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Matching records</div>
                      {searchState.status === 'loading' ? (
                        <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
                          Searching records and desk entities...
                        </div>
                      ) : searchState.status === 'error' ? (
                        <div className="rounded-[22px] border border-amber-300/16 bg-amber-300/[0.06] px-4 py-4 text-sm text-amber-100">
                          Search is temporarily unavailable. The provider seam is ready for Claude&apos;s live payload once it lands.
                        </div>
                      ) : matchingRecords.length > 0 ? (
                        <div className="space-y-2">{matchingRecords.map(renderCommandRecordRow)}</div>
                      ) : (
                        <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
                          No record matches for <span className="font-semibold text-slate-200">"{deferredCommandQuery}"</span>.
                        </div>
                      )}
                    </section>

                    <section className="space-y-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Matching workspaces</div>
                      {matchingWorkspaceCommands.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {matchingWorkspaceCommands.map((command) => (
                            <button
                              key={command.to}
                              type="button"
                              onClick={() => openWorkspace({ to: command.to, label: command.label })}
                              className="rounded-[22px] border border-white/8 bg-white/[0.02] px-4 py-4 text-left transition hover:border-cyan-300/24 hover:bg-cyan-300/10"
                            >
                              <div className="text-sm font-semibold text-slate-100">{command.label}</div>
                              <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">{command.sectionTitle}</div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
                          No workspace matches for <span className="font-semibold text-slate-200">"{deferredCommandQuery}"</span>.
                        </div>
                      )}
                    </section>
                  </>
                ) : (
                  <>
                    {pinnedRecords.length > 0 ? (
                      <section className="space-y-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/72">Pinned records</div>
                        <div className="space-y-2">{pinnedRecords.map((summary) => renderRecordRailItem(summary, true))}</div>
                      </section>
                    ) : null}

                    {recentRecords.length > 0 ? (
                      <section className="space-y-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Recent records</div>
                        <div className="space-y-2">{recentRecords.map((summary) => renderRecordRailItem(summary, false))}</div>
                      </section>
                    ) : null}

                    <section className="space-y-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Featured desks</div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {featuredWorkspaces.map((command) => (
                          <button
                            key={command.to}
                            type="button"
                            onClick={() => openWorkspace({ to: command.to, label: command.label })}
                            className="rounded-[22px] border border-white/8 bg-white/[0.02] px-4 py-4 text-left transition hover:border-cyan-300/24 hover:bg-cyan-300/10"
                          >
                            <div className="text-sm font-semibold text-slate-100">{command.label}</div>
                            <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">{command.sectionTitle}</div>
                          </button>
                        ))}
                      </div>
                    </section>
                  </>
                )}
              </div>

              <div className="space-y-4">
                {activeRecordSummary ? (
                  <section className="rounded-[26px] border border-cyan-300/12 bg-cyan-300/[0.05] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/72">Focused record</div>
                    <div className="mt-3 text-sm font-semibold text-slate-100">{activeRecordSummary.title}</div>
                    <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-cyan-100/70">
                      {formatRecordMeta(activeRecordSummary)}
                    </div>
                    <div className="mt-3 text-sm text-slate-300">{activeRecord?.detail}</div>
                  </section>
                ) : null}

                {pinnedWorkspaces.length > 0 ? (
                  <section className="rounded-[26px] border border-white/8 bg-white/[0.02] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Pinned workspaces</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {pinnedWorkspaces.map((workspace) => renderWorkspaceChip(workspace, true))}
                    </div>
                  </section>
                ) : null}

                {recentWorkspaces.length > 0 ? (
                  <section className="rounded-[26px] border border-white/8 bg-white/[0.02] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Recent workspaces</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {recentWorkspaces.map((workspace) => renderWorkspaceChip(workspace, true))}
                    </div>
                  </section>
                ) : null}

                {savedViews.length > 0 ? (
                  <section className="rounded-[26px] border border-cyan-300/12 bg-cyan-300/[0.05] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/75">Saved views</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {savedViews.map((view) => renderSavedViewChip(view, true))}
                    </div>
                  </section>
                ) : null}

                <section className="rounded-[26px] border border-white/8 bg-white/[0.02] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Shell posture</div>
                  <div className="mt-3 space-y-3 text-sm text-slate-400">
                    <p>{shellBootstrap?.shellNote ?? 'Shell bootstrap is waiting on provider data.'}</p>
                    <p>Global search stays focused on records and desks while the left rail continues to filter only the workspace catalog.</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-[20px] border border-white/8 bg-black/15 px-3 py-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Inbox</div>
                        <div className="mt-2 text-lg font-semibold text-slate-50">{shellBootstrap?.deskCounts.inbox ?? '—'}</div>
                      </div>
                      <div className="rounded-[20px] border border-white/8 bg-black/15 px-3 py-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">At risk</div>
                        <div className="mt-2 text-lg font-semibold text-slate-50">{shellBootstrap?.deskCounts.atRisk ?? '—'}</div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <header className="border-b border-cyan-500/10 bg-[#050b10]/95 px-4 py-4 backdrop-blur lg:hidden">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xl font-bold tracking-tight text-slate-50">PRISM</div>
              <div className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Manufacturing Intelligence</div>
            </div>
            <div className="flex items-center gap-2">
              {auth.isAuthenticated && <NotificationBell />}
              {auth.isAuthenticated && auth.displayName && (
                <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold text-cyan-200">
                  {auth.displayName}
                </div>
              )}
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                {currentLabel}
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Open global search"
            onClick={() => setCommandOpen(true)}
            className="flex w-full items-center justify-between rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:border-cyan-300/24 hover:bg-cyan-300/10"
          >
            <span className="text-sm text-slate-200">Search desks, jobs, quotes, customers, and lessons</span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Open
            </span>
          </button>
          <nav className="flex gap-2 overflow-x-auto pb-1">
            {mobileNavItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/dashboard'}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition ${navItemClasses(isActive)}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-label={matchingSavedView ? 'Refresh saved view' : 'Save current view'}
                onClick={saveCurrentWorkspaceView}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-cyan-300/24 hover:text-cyan-100"
              >
                {matchingSavedView ? 'Refresh saved view' : 'Save current view'}
              </button>
              {matchingSavedView ? (
                <button
                  type="button"
                  aria-label="Delete saved view"
                  onClick={deleteCurrentWorkspaceView}
                  className="rounded-full border border-rose-300/18 bg-rose-300/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-100 transition hover:border-rose-300/28 hover:bg-rose-300/[0.12]"
                >
                  Delete saved view
                </button>
              ) : null}
            </div>
            {savedViews.length > 0 ? (
              <div className="rounded-[18px] border border-cyan-300/12 bg-cyan-300/[0.05] p-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/75">Saved views</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {savedViews.map((view) => renderSavedViewChip(view, true))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div data-testid="desktop-shell" className="lg:relative lg:flex lg:min-h-0 lg:flex-1 lg:overflow-hidden">
        <div
          data-testid="desktop-nav-shell"
          className={`relative hidden lg:block lg:min-h-0 lg:shrink-0 lg:overflow-visible lg:transition-[width] lg:duration-300 lg:ease-out ${
            isDesktopSidebarCollapsed ? 'lg:w-0' : 'lg:w-[288px]'
          }`}
        >
          <aside
            data-testid="desktop-nav"
            aria-hidden={isDesktopSidebarCollapsed}
            className={`absolute inset-y-0 left-0 hidden lg:flex lg:h-full lg:w-[288px] lg:flex-col lg:overflow-hidden lg:border-r lg:border-cyan-500/10 lg:bg-[#050b10] lg:transition-all lg:duration-300 lg:ease-out ${
              isDesktopSidebarCollapsed
                ? 'lg:-translate-x-full lg:invisible lg:opacity-0 lg:pointer-events-none'
                : 'lg:translate-x-0 lg:visible lg:opacity-100'
            }`}
          >
            <div className="border-b border-cyan-500/10 px-5 py-5">
              <div>
                <div className="text-xl font-bold tracking-tight text-slate-50">PRISM</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.28em] text-cyan-200/65">Manufacturing Intelligence</div>
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Current workspace</div>
                      <div className="mt-2 text-sm font-semibold text-slate-50">{currentLabel}</div>
                      {matchingSavedView ? (
                        <div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-cyan-100/72">
                          Saved view active
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        aria-label={`${isCurrentWorkspacePinned ? 'Unpin' : 'Pin'} current workspace`}
                        onClick={() => togglePinnedWorkspace({ to: currentWorkspaceTarget, label: currentLabel })}
                        className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
                          isCurrentWorkspacePinned
                            ? 'border-cyan-300/30 bg-cyan-300/12 text-cyan-100'
                            : 'border-white/8 bg-white/[0.03] text-slate-400 hover:border-white/16 hover:text-slate-200'
                        }`}
                      >
                        {isCurrentWorkspacePinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button
                        type="button"
                        aria-label={matchingSavedView ? 'Refresh saved view' : 'Save current view'}
                        onClick={saveCurrentWorkspaceView}
                        className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300 transition hover:border-cyan-300/24 hover:text-cyan-100"
                      >
                        {matchingSavedView ? 'Refresh' : 'Save view'}
                      </button>
                      {matchingSavedView ? (
                        <button
                          type="button"
                          aria-label="Delete saved view"
                          onClick={deleteCurrentWorkspaceView}
                          className="rounded-full border border-rose-300/16 bg-rose-300/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-100 transition hover:border-rose-300/28 hover:bg-rose-300/[0.1]"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                {activeRecordSummary ? (
                  <div className="rounded-[20px] border border-cyan-300/12 bg-cyan-300/[0.05] px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100/72">Focused record</div>
                        <div className="mt-2 text-sm font-semibold text-slate-50">{activeRecordSummary.title}</div>
                        <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-cyan-100/70">
                          {formatRecordMeta(activeRecordSummary)}
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label={`${isFocusedRecordPinned ? 'Unpin' : 'Pin'} focused record`}
                        onClick={() => togglePinnedRecord(activeRecordSummary)}
                        className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
                          isFocusedRecordPinned
                            ? 'border-cyan-300/30 bg-cyan-300/12 text-cyan-100'
                            : 'border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/16 hover:text-white'
                        }`}
                      >
                        {isFocusedRecordPinned ? 'Unpin' : 'Pin'}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Desk counts</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[18px] border border-white/8 bg-black/15 px-3 py-3">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Inbox</div>
                      <div className="mt-2 text-lg font-semibold text-slate-50">{shellBootstrap?.deskCounts.inbox ?? '—'}</div>
                    </div>
                    <div className="rounded-[18px] border border-white/8 bg-black/15 px-3 py-3">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Approvals</div>
                      <div className="mt-2 text-lg font-semibold text-slate-50">{shellBootstrap?.deskCounts.approvals ?? '—'}</div>
                    </div>
                    <div className="rounded-[18px] border border-white/8 bg-black/15 px-3 py-3">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">At risk</div>
                      <div className="mt-2 text-lg font-semibold text-slate-50">{shellBootstrap?.deskCounts.atRisk ?? '—'}</div>
                    </div>
                    <div className="rounded-[18px] border border-white/8 bg-black/15 px-3 py-3">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Live jobs</div>
                      <div className="mt-2 text-lg font-semibold text-slate-50">{shellBootstrap?.deskCounts.liveJobs ?? '—'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 [scrollbar-gutter:stable]">
              <div className="space-y-6">
                <div className="space-y-4">
                  <button
                    type="button"
                    aria-label="Open global search"
                    onClick={() => setCommandOpen(true)}
                    className="flex w-full items-center justify-between rounded-[22px] border border-cyan-300/12 bg-cyan-300/[0.05] px-4 py-3 text-left transition hover:border-cyan-300/24 hover:bg-cyan-300/10"
                  >
                    <span>
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/72">Global search</span>
                      <span className="mt-1 block text-sm text-slate-200">Search records, desks, queues, and next actions</span>
                    </span>
                    <span className="rounded-full border border-cyan-300/16 bg-cyan-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                      Ctrl K
                    </span>
                  </button>

                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-3">
                    <label htmlFor="workspace-filter" className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Filter workspace catalog
                    </label>
                    <input
                      id="workspace-filter"
                      type="text"
                      value={navQuery}
                      onChange={(event) => setNavQuery(event.target.value)}
                      placeholder="Filter the left rail"
                      className="mt-3 w-full rounded-[16px] border border-white/10 bg-[#071017] px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/24 focus:bg-white/[0.03]"
                    />
                  </div>

                  {recentWorkspaces.length > 0 ? (
                    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-3">
                      <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Recent workspaces</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {recentWorkspaces.map((item) => (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/dashboard'}
                            className={({ isActive }) =>
                              `rounded-full border px-3 py-1.5 text-xs font-medium transition ${navItemClasses(isActive)}`
                            }
                          >
                            {item.label}
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {pinnedWorkspaces.length > 0 ? (
                    <div className="rounded-[22px] border border-cyan-300/12 bg-cyan-300/[0.05] p-3">
                      <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/75">Pinned workspaces</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {pinnedWorkspaces.map((item) => (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/dashboard'}
                            className={({ isActive }) =>
                              `rounded-full border px-3 py-1.5 text-xs font-medium transition ${navItemClasses(isActive)}`
                            }
                          >
                            {item.label}
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {savedViews.length > 0 ? (
                    <div className="rounded-[22px] border border-cyan-300/12 bg-cyan-300/[0.05] p-3">
                      <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/75">Saved views</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {savedViews.map((view) => renderSavedViewChip(view, true))}
                      </div>
                    </div>
                  ) : null}

                {recentRecords.length > 0 ? (
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-3">
                    <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Recent records</div>
                    <div className="mt-3 space-y-2">{recentRecords.slice(0, 3).map((summary) => renderRecordRailItem(summary, false))}</div>
                  </div>
                ) : null}

                {pinnedRecords.length > 0 ? (
                  <div className="rounded-[22px] border border-cyan-300/12 bg-cyan-300/[0.05] p-3">
                    <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/72">Pinned records</div>
                    <div className="mt-3 space-y-2">{pinnedRecords.slice(0, 3).map((summary) => renderRecordRailItem(summary, true))}</div>
                  </div>
                ) : null}
              </div>

              {filteredSections.map((section) => {
                const isSectionCollapsed = isSearchActive ? false : Boolean(collapsedSections[section.key]);

                return (
                  <div key={section.title} className="space-y-2">
                    <button
                      type="button"
                      aria-label={`${isSectionCollapsed ? 'Expand' : 'Collapse'} ${section.title}`}
                      onClick={() =>
                        setCollapsedSections((current) => ({
                          ...current,
                          [section.key]: !current[section.key],
                        }))
                      }
                      className="flex w-full items-center justify-between rounded-[18px] px-3 py-2 text-left transition hover:bg-white/[0.03]"
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        {section.title}
                      </span>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
                          isSearchActive
                            ? 'border-cyan-300/14 bg-cyan-300/8 text-cyan-100/70'
                            : 'border-white/10 bg-white/[0.04] text-slate-300'
                        }`}
                      >
                        <span aria-hidden="true" className="text-sm leading-none">
                          {isSectionCollapsed ? '+' : '−'}
                        </span>
                        <span>{isSearchActive ? 'Pinned open' : isSectionCollapsed ? 'Expand' : 'Collapse'}</span>
                      </span>
                    </button>
                    {!isSectionCollapsed ? (
                      <div className="space-y-1">
                        {section.items.map((item) =>
                          isNavGroup(item) ? (
                            <div key={item.key} className="rounded-[22px] border border-white/8 bg-white/[0.02] px-2 py-2">
                              <button
                                type="button"
                                aria-expanded={openGroups[item.key] ? 'true' : 'false'}
                                onClick={() =>
                                  setOpenGroups((current) => ({
                                    ...current,
                                    [item.key]: !current[item.key],
                                  }))
                                }
                                className="flex w-full items-center justify-between rounded-[18px] px-3 py-2 text-left transition hover:bg-white/[0.04]"
                              >
                                <span className="text-sm font-semibold text-slate-100">{item.label}</span>
                                <span className="text-xs text-slate-400">{isSearchActive || openGroups[item.key] ? '−' : '+'}</span>
                              </button>
                              {isSearchActive || openGroups[item.key] ? (
                                <div className="mt-2 space-y-1 border-t border-white/6 pt-2">
                                  {item.items.map(({ to, label }) => {
                                    const isPinned = pinnedWorkspaces.some((entry) => entry.to === to);

                                    return (
                                      <div key={to} className="flex items-center gap-2">
                                        <NavLink
                                          to={to}
                                          end={to === '/dashboard'}
                                          className={({ isActive }) =>
                                            `block flex-1 rounded-[18px] border px-3 py-2 text-sm transition ${navItemClasses(isActive)}`
                                          }
                                        >
                                          {label}
                                        </NavLink>
                                        <button
                                          type="button"
                                          aria-label={`${isPinned ? 'Unpin' : 'Pin'} ${label}`}
                                          onClick={() => togglePinnedWorkspace({ to, label: `${item.label} / ${label}` })}
                                          className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
                                            isPinned
                                              ? 'border-cyan-300/30 bg-cyan-300/12 text-cyan-100'
                                              : 'border-white/8 bg-white/[0.03] text-slate-400 hover:border-white/16 hover:text-slate-200'
                                          }`}
                                        >
                                          {isPinned ? 'Unpin' : 'Pin'}
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            (() => {
                              const isPinned = pinnedWorkspaces.some((entry) => entry.to === item.to);

                              return (
                                <div key={item.to} className="flex items-center gap-2">
                                  <NavLink
                                    to={item.to}
                                    end={item.to === '/dashboard'}
                                    className={({ isActive }) =>
                                      `block flex-1 rounded-[20px] border px-4 py-3 text-sm font-medium transition ${navItemClasses(isActive)}`
                                    }
                                  >
                                    {item.label}
                                  </NavLink>
                                  <button
                                    type="button"
                                    aria-label={`${isPinned ? 'Unpin' : 'Pin'} ${item.label}`}
                                    onClick={() => togglePinnedWorkspace({ to: item.to, label: item.label })}
                                    className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
                                      isPinned
                                        ? 'border-cyan-300/30 bg-cyan-300/12 text-cyan-100'
                                        : 'border-white/8 bg-white/[0.03] text-slate-400 hover:border-white/16 hover:text-slate-200'
                                    }`}
                                  >
                                    {isPinned ? 'Unpin' : 'Pin'}
                                  </button>
                                </div>
                              );
                            })()
                          ),
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {filteredSections.length === 0 ? (
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-400">
                  No workspaces matched <span className="font-semibold text-slate-200">"{navQuery}"</span>. Try a quote, traveler, quality, or learning term.
                </div>
              ) : null}
            </div>
          </nav>

          <div className="border-t border-cyan-500/10 px-5 py-4 text-xs text-slate-500">
            PRISM v19.1 - Manufacturing intelligence platform
          </div>
        </aside>

          {!isDesktopSidebarCollapsed ? (
            <div className="pointer-events-none absolute inset-y-0 right-0 z-20 hidden lg:flex lg:items-center">
              <div className="pointer-events-auto translate-x-1/2">
                <button
                  type="button"
                  data-testid="sidebar-collapse-trigger"
                  aria-label="Collapse sidebar"
                  onClick={() => setDesktopSidebarCollapsed(true)}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/16 bg-white/90 text-2xl font-semibold leading-none text-black shadow-[0_14px_34px_rgba(0,0,0,0.34)] transition hover:scale-[1.04] hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/85"
                >
                  <span aria-hidden="true">{'<'}</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {isDesktopSidebarCollapsed && !isCalculatorWorkspace ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden lg:flex lg:w-20 lg:items-center">
            <div
              data-testid="sidebar-reopen-trigger"
              className="pointer-events-auto group relative flex h-40 w-14 items-center justify-center rounded-r-[26px] border border-white/18 bg-gradient-to-r from-white/34 via-white/14 to-transparent opacity-90 shadow-[0_18px_48px_rgba(0,0,0,0.32)] backdrop-blur-md transition-all duration-300 hover:w-16 hover:from-white/42 hover:opacity-100 focus-within:w-16 focus-within:from-white/42 focus-within:opacity-100"
            >
              <span aria-hidden="true" className="absolute inset-y-4 right-0 w-px bg-white/32" />
              <button
                type="button"
                aria-label="Open sidebar"
                onClick={() => setDesktopSidebarCollapsed(false)}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/94 text-2xl font-semibold leading-none text-black shadow-[0_14px_34px_rgba(0,0,0,0.32)] transition hover:scale-[1.04] hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/85"
              >
                <span aria-hidden="true">{'>'}</span>
              </button>
            </div>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden">
          <div className="hidden border-b border-white/8 bg-[#071017]/95 backdrop-blur lg:block">
            <div className="space-y-3.5 px-5 py-3.5">
              {isCalculatorWorkspace ? (
                <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Calculator workspace</div>
                    <div className="mt-1 text-sm font-semibold text-slate-100">{currentLabel}</div>
                    <div className="mt-2 max-w-3xl text-sm text-slate-400">
                      Focus mode keeps the calculator full-width, but the rail toggle and global search stay available so you can move without losing context.
                    </div>
                  </div>

                  <div className="flex items-stretch gap-2.5">
                    <button
                      type="button"
                      data-testid="desktop-header-rail-toggle"
                      aria-label={isDesktopSidebarCollapsed ? 'Show navigation rail' : 'Hide navigation rail'}
                      onClick={() => setDesktopSidebarCollapsed((current) => !current)}
                      className="flex w-[118px] shrink-0 items-center justify-center gap-2 rounded-[20px] border border-white/12 bg-white/[0.05] px-4 py-3.5 text-sm font-semibold text-slate-100 transition hover:border-white/22 hover:bg-white/[0.1]"
                    >
                      <span aria-hidden="true" className="rounded-full bg-white/94 px-2.5 py-1 text-base leading-none text-black shadow-[0_10px_26px_rgba(0,0,0,0.28)]">
                        {isDesktopSidebarCollapsed ? '>' : '<'}
                      </span>
                      <span>{isDesktopSidebarCollapsed ? 'Show rail' : 'Hide rail'}</span>
                    </button>

                    <button
                      type="button"
                      aria-label="Open global search"
                      onClick={() => setCommandOpen(true)}
                      className="flex flex-1 items-center justify-between rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3.5 text-left transition hover:border-cyan-300/24 hover:bg-cyan-300/10"
                    >
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Global search</div>
                        <div className="mt-2 text-sm text-slate-200">Search desks, jobs, quotes, customers, parts, and learning without leaving the calculator.</div>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                        Ctrl K
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                <div className="flex flex-wrap items-start justify-between gap-3.5">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Platform posture</div>
                    <div className="mt-1 text-sm text-slate-300">
                      Site-wide unit system, tier posture, and add-on sourcing stay visible here so purchase and ROI flows are reachable from any desk.
                    </div>
                  </div>
                  <ShellCommerceControls />
                </div>

                <SurfaceStatusNotice
                  title="Operating-system convergence"
                  surfaces={['shellBootstrap', 'search', 'emailLogin', 'messages', 'hotJobs', 'learning', 'commerce']}
                />

                {shellBootstrapIssue ? (
                  <div className="max-w-3xl">
                    <ErrorState
                      title="Shell bootstrap degraded"
                      error={shellBootstrapIssue}
                      message={
                        shellBootstrapIssue instanceof Error
                          ? shellBootstrapIssue.message
                          : 'Shell bootstrap routes are unavailable right now.'
                      }
                      hint="Recent and pinned rails are falling back to locally persisted state until the mounted shell routes recover."
                      actionLabel="Retry shell bootstrap"
                      onRetry={() => setShellBootstrapReloadToken((value) => value + 1)}
                    />
                  </div>
                ) : null}

                <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Active page</div>
                    <div className="mt-1 text-sm font-semibold text-slate-100">{currentLabel}</div>
                    {activeRecordSummary ? (
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                        <span>{formatRecordMeta(activeRecordSummary)}</span>
                        <span className="text-cyan-100/65">{activeRecordSummary.title}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-stretch gap-2.5">
                    <button
                      type="button"
                      data-testid="desktop-header-rail-toggle"
                      aria-label={isDesktopSidebarCollapsed ? 'Show navigation rail' : 'Hide navigation rail'}
                      onClick={() => setDesktopSidebarCollapsed((current) => !current)}
                      className="flex w-[118px] shrink-0 items-center justify-center gap-2 rounded-[20px] border border-white/12 bg-white/[0.05] px-4 py-3.5 text-sm font-semibold text-slate-100 transition hover:border-white/22 hover:bg-white/[0.1]"
                    >
                      <span aria-hidden="true" className="rounded-full bg-white/94 px-2.5 py-1 text-base leading-none text-black shadow-[0_10px_26px_rgba(0,0,0,0.28)]">
                        {isDesktopSidebarCollapsed ? '>' : '<'}
                      </span>
                      <span>{isDesktopSidebarCollapsed ? 'Show rail' : 'Hide rail'}</span>
                    </button>

                    <button
                      type="button"
                      aria-label="Open global search"
                      onClick={() => setCommandOpen(true)}
                      className="flex flex-1 items-center justify-between rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3.5 text-left transition hover:border-cyan-300/24 hover:bg-cyan-300/10"
                    >
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Global search</div>
                        <div className="mt-2 text-sm text-slate-200">Search workspaces plus provider-backed jobs, quotes, customers, POs, orders, parts, and lessons</div>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                        Ctrl K
                      </div>
                    </button>
                  </div>
                </div>
                </>
              )}
            </div>
          </div>

          <div
            data-testid="main-scroll-region"
            className={`${isCalculatorWorkspace ? 'p-0' : 'p-3 md:p-5 xl:p-6'} lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-y-contain`}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
