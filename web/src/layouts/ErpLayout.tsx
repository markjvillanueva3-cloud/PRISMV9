import { useState } from "react";

// ---------------------------------------------------------------------------
// Navigation items
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "D", href: "/erp" },
  { id: "quote", label: "Quoting", icon: "$", href: "/erp/quote" },
  { id: "jobs", label: "Jobs", icon: "J", href: "/erp/jobs" },
  { id: "schedule", label: "Schedule", icon: "S", href: "/erp/schedule" },
  { id: "tracker", label: "Tracker", icon: "T", href: "/erp/tracker" },
  { id: "analytics", label: "Analytics", icon: "A", href: "/erp/analytics" },
  { id: "maintenance", label: "Maintenance", icon: "M", href: "/erp/maintenance" },
  { id: "inventory", label: "Inventory", icon: "I", href: "/erp/inventory" },
  { id: "reports", label: "Reports", icon: "R", href: "/erp/reports" },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ErpLayoutProps {
  activeSection?: string;
  children: React.ReactNode;
}

export default function ErpLayout({ activeSection, children }: ErpLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-0 flex-1">
      {/* Desktop sidebar */}
      <nav
        className="hidden w-48 shrink-0 border-r border-slate-200 bg-white
          dark:border-slate-700 dark:bg-slate-800 lg:block"
        aria-label="ERP navigation"
      >
        <div className="p-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            ERP
          </h2>
        </div>
        <SidebarNav active={activeSection} />
      </nav>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setSidebarOpen(false)}
          />
          <nav
            className="absolute left-0 top-0 h-full w-56 border-r border-slate-200
              bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
            aria-label="ERP navigation"
          >
            <div className="flex items-center justify-between p-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                ERP
              </h2>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close menu"
              >
                &times;
              </button>
            </div>
            <SidebarNav active={activeSection} onClick={() => setSidebarOpen(false)} />
          </nav>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Breadcrumb bar */}
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2
          dark:border-slate-700 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-slate-600 lg:hidden"
            aria-label="Open menu"
          >
            &#x2630;
          </button>
          <Breadcrumb section={activeSection} />
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar Nav
// ---------------------------------------------------------------------------

function SidebarNav({ active, onClick }: { active?: string; onClick?: () => void }) {
  return (
    <ul className="space-y-0.5 px-2 pb-4">
      {NAV_ITEMS.map((item) => (
        <li key={item.id}>
          <a
            href={item.href}
            onClick={onClick}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium
              transition-colors ${
              active === item.id
                ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50"
            }`}
            aria-current={active === item.id ? "page" : undefined}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded
              bg-slate-100 text-[10px] font-bold text-slate-500
              dark:bg-slate-700 dark:text-slate-400">
              {item.icon}
            </span>
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------------

function Breadcrumb({ section }: { section?: string }) {
  const item = NAV_ITEMS.find((n) => n.id === section);

  return (
    <nav className="flex items-center gap-1 text-xs text-slate-500" aria-label="Breadcrumb">
      <a href="/erp" className="hover:text-slate-700 dark:hover:text-slate-300">
        ERP
      </a>
      {item && item.id !== "dashboard" && (
        <>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {item.label}
          </span>
        </>
      )}
    </nav>
  );
}
