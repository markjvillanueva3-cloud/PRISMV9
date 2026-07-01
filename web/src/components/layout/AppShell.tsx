import { useState } from "react";
import type React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import ErrorBoundary from "../ErrorBoundary";
import OfflineBanner from "../OfflineBanner";
import ThemeToggle from "../ui/ThemeToggle";

interface NavItem {
  to: string;
  label: string;
  icon: () => React.ReactElement;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    heading: "Core",
    items: [
      { to: "/sfc", label: "SFC Calculator", icon: CalculatorIcon },
      { to: "/ppg", label: "Post Processor", icon: CodeBracketIcon },
      { to: "/cam", label: "CAM Strategy", icon: CubeIcon },
      { to: "/pipeline", label: "Print to Program", icon: BoltIcon },
    ],
  },
  {
    heading: "Production",
    items: [
      ...(import.meta.env.VITE_ENABLE_WEDM !== "false"
        ? [{ to: "/wire-edm", label: "Wire EDM Studio", icon: BoltIcon }]
        : []),
      { to: "/edm", label: "EDM Calculator", icon: CalculatorIcon },
    ],
  },
  {
    heading: "Shop",
    items: [
      { to: "/shop", label: "Shop Dashboard", icon: BuildingIcon },
      { to: "/jobs", label: "Jobs", icon: ClipboardIcon },
      { to: "/scheduling", label: "Scheduling", icon: CalendarIcon },
      { to: "/capacity", label: "Capacity Planning", icon: ChartBarIcon },
      { to: "/inventory", label: "Inventory", icon: DatabaseIcon },
      { to: "/batch", label: "Batch Planning", icon: CubeIcon },
    ],
  },
  {
    heading: "Quoting",
    items: [
      { to: "/quote-builder", label: "Quote Builder", icon: CurrencyIcon },
      { to: "/blueprint-quote", label: "Blueprint Quote", icon: DocumentIcon },
      { to: "/sheet-metal", label: "Sheet Metal", icon: CubeIcon },
      { to: "/additive", label: "Additive", icon: CubeIcon },
      { to: "/injection-mold", label: "Injection Mold", icon: CubeIcon },
      { to: "/quote-analytics", label: "Quote Analytics", icon: ChartBarIcon },
      { to: "/secondary-ops", label: "Secondary Ops", icon: CogIcon },
      { to: "/material-pricing", label: "Material Pricing", icon: CurrencyIcon },
      { to: "/stock-optimizer", label: "Stock Optimizer", icon: DatabaseIcon },
    ],
  },
  {
    heading: "Finance",
    items: [
      { to: "/invoices", label: "Invoices", icon: DocumentIcon },
      { to: "/purchase-orders", label: "Purchase Orders", icon: DocumentIcon },
      { to: "/general-ledger", label: "General Ledger", icon: DatabaseIcon },
      { to: "/financial-analysis", label: "Financial Analysis", icon: ChartBarIcon },
      { to: "/job-profitability", label: "Job Profitability", icon: CurrencyIcon },
      { to: "/tooling-cost", label: "Tooling Cost", icon: CurrencyIcon },
    ],
  },
  {
    heading: "HR & Payroll",
    items: [
      { to: "/employees", label: "Employees", icon: UserGroupIcon },
      { to: "/shop-clock", label: "Shop Clock", icon: ClockIcon },
      { to: "/timecards", label: "Timecards", icon: ClipboardIcon },
      { to: "/payroll", label: "Payroll", icon: CurrencyIcon },
      { to: "/hr-compliance", label: "HR Compliance", icon: ShieldIcon },
    ],
  },
  {
    heading: "ERP",
    items: [
      { to: "/erp", label: "ERP Dashboard", icon: BuildingIcon },
      { to: "/erp/quote", label: "Quoting", icon: CurrencyIcon },
      { to: "/erp/jobs", label: "Job Planner", icon: ClipboardIcon },
      { to: "/erp/schedule", label: "Schedule", icon: CalendarIcon },
      { to: "/erp/tracker", label: "Job Tracker", icon: ChartBarIcon },
      { to: "/erp/analytics", label: "Analytics", icon: ChartBarIcon },
      { to: "/erp/maintenance", label: "Maintenance", icon: CogIcon },
      { to: "/erp/inventory", label: "Inventory", icon: DatabaseIcon },
      { to: "/erp/reports", label: "Reports", icon: DocumentIcon },
    ],
  },
  {
    heading: "Analysis",
    items: [
      { to: "/job-planner", label: "Job Planner AI", icon: CubeIcon },
      { to: "/what-if", label: "What-If", icon: ChartBarIcon },
      { to: "/machine-rates", label: "Machine Rates", icon: CogIcon },
      { to: "/order-tracking", label: "Order Tracking", icon: ClipboardIcon },
      { to: "/customers", label: "Customers", icon: UserGroupIcon },
      { to: "/purchasing", label: "Purchasing", icon: DocumentIcon },
    ],
  },
  {
    heading: "Viewer",
    items: [
      { to: "/viewer", label: "3D Viewer", icon: CubeIcon },
    ],
  },
  {
    heading: "Data & Quality",
    items: [
      { to: "/data", label: "Data", icon: DatabaseIcon },
      { to: "/safety", label: "Safety", icon: ShieldIcon },
      { to: "/quality", label: "Quality", icon: CheckCircleIcon },
      { to: "/quality-management", label: "Quality Mgmt", icon: CheckCircleIcon },
      { to: "/reports", label: "Reports", icon: DocumentIcon },
      { to: "/exports", label: "Exports", icon: DocumentIcon },
    ],
  },
  {
    heading: "Billing",
    items: [
      { to: "/post-processors", label: "Post Processors", icon: CodeBracketIcon },
    ],
  },
  {
    heading: "Admin",
    items: [
      { to: "/cost", label: "Costing", icon: CurrencyIcon },
      { to: "/learning", label: "Learning", icon: AcademicCapIcon },
      { to: "/settings", label: "Settings", icon: CogIcon },
    ],
  },
];

// Flat list for page title lookup
const allNavItems = navGroups.flatMap((g) => g.items);

export default function AppShell() {
  const location = useLocation();
  const pageTitle =
    allNavItems.find((n) => location.pathname === n.to || location.pathname.startsWith(n.to + "/"))
      ?.label ?? "PRISM";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggleGroup(heading: string) {
    setCollapsed((prev) => ({ ...prev, [heading]: !prev[heading] }));
  }

  function renderNav(onItemClick?: () => void) {
    return (
      <nav className="mt-2 flex-1 overflow-y-auto px-2 space-y-3" aria-label="Main navigation">
        {navGroups.map((group) => {
          const isCollapsed = collapsed[group.heading];
          return (
            <div key={group.heading}>
              <button
                type="button"
                onClick={() => toggleGroup(group.heading)}
                className="flex w-full items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200"
              >
                {group.heading}
                <svg
                  className={`h-3 w-3 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {!isCollapsed && (
                <div className="mt-1 space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/erp"}
                      onClick={onItemClick}
                      className={({ isActive }) =>
                        `flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
                          isActive
                            ? "bg-primary-600 text-white"
                            : "text-slate-300 hover:bg-sidebar-hover hover:text-white"
                        }`
                      }
                    >
                      <item.icon />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface dark:bg-surface-dark">
      {/* Skip to content link for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50
          focus:rounded-md focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden w-56 flex-shrink-0 flex-col bg-sidebar text-white md:flex" role="navigation" aria-label="Main navigation">
        <div className="flex h-14 items-center gap-2 px-4 font-bold tracking-wide">
          <span className="text-primary-400 text-xl">P</span>
          <span className="text-sm">PRISM v9</span>
        </div>
        {renderNav()}
        <div className="border-t border-slate-700 px-3 py-3">
          <ThemeToggle />
        </div>
        <div className="border-t border-slate-700 px-4 py-3 text-xs text-slate-400">
          Manufacturing Intelligence
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-56 bg-sidebar text-white shadow-xl flex flex-col">
            <div className="flex h-14 items-center justify-between px-4">
              <div className="flex items-center gap-2 font-bold tracking-wide">
                <span className="text-primary-400 text-xl">P</span>
                <span className="text-sm">PRISM v9</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="text-slate-400 hover:text-white"
                aria-label="Close menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {renderNav(() => setMobileOpen(false))}
            <div className="border-t border-slate-700 px-3 py-3 mt-4">
              <ThemeToggle />
            </div>
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 md:px-6 dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 md:hidden dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Open navigation"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {pageTitle}
          </h1>
        </header>
        <main id="main-content" className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <OfflineBanner />
    </div>
  );
}

function CodeBracketIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  );
}

function AcademicCapIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
    </svg>
  );
}

function CalculatorIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}

function CubeIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function CurrencyIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function ChartBarIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function UserGroupIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}
