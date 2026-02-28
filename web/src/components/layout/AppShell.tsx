import { NavLink, Outlet, useLocation } from "react-router-dom";
import ErrorBoundary from "../ErrorBoundary";

const navItems = [
  { to: "/sfc", label: "SFC Calculator", icon: CalculatorIcon },
];

export default function AppShell() {
  const location = useLocation();
  const pageTitle = navItems.find((n) => location.pathname.startsWith(n.to))?.label ?? "PRISM";

  return (
    <div className="flex h-screen overflow-hidden bg-surface dark:bg-surface-dark">
      {/* Sidebar */}
      <aside className="hidden w-56 flex-shrink-0 flex-col bg-sidebar text-white md:flex">
        <div className="flex h-14 items-center gap-2 px-4 font-bold tracking-wide">
          <span className="text-primary-400 text-xl">P</span>
          <span className="text-sm">PRISM v9</span>
        </div>
        <nav className="mt-2 flex-1 space-y-1 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
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
        </nav>
        <div className="border-t border-slate-700 px-4 py-3 text-xs text-slate-400">
          Manufacturing Intelligence
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center border-b border-slate-200 bg-white px-6 dark:border-slate-700 dark:bg-slate-900">
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {pageTitle}
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

function CalculatorIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}
