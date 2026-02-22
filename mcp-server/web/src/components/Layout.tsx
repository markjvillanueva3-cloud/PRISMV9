import { NavLink, Outlet } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard' },
  { to: '/calculator', label: 'Calculator' },
  { to: '/job-planner', label: 'Job Planner' },
  { to: '/toolpath', label: 'Toolpath' },
  { to: '/alarms', label: 'Alarms' },
] as const;

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-prism-800 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-tight">PRISM</span>
          <span className="text-prism-200 text-sm">Manufacturing Intelligence</span>
        </div>
        <nav className="flex gap-1">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-prism-600 text-white'
                    : 'text-prism-200 hover:bg-prism-700 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-gray-400 py-2">
        PRISM v19.1 &mdash; Manufacturing intelligence platform
      </footer>
    </div>
  );
}
