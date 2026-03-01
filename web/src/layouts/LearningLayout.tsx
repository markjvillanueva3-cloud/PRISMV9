import { NavLink, Outlet } from "react-router-dom";

const NAV_ITEMS: { to: string; label: string; icon: string; end?: boolean }[] = [
  { to: "/learning", label: "Dashboard", icon: "📊", end: true },
  { to: "/learning/assessment", label: "Assessment", icon: "📋" },
  { to: "/learning/path", label: "Learning Path", icon: "🗺️" },
  { to: "/learning/progress", label: "Progress", icon: "📈" },
  { to: "/learning/knowledge", label: "Knowledge", icon: "🔍" },
  { to: "/learning/material", label: "Material", icon: "🧱" },
  { to: "/learning/tool", label: "Tool", icon: "🔧" },
  { to: "/learning/machine", label: "Machine", icon: "🏭" },
  { to: "/learning/twin", label: "Digital Twin", icon: "📡" },
];

export default function LearningLayout() {
  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      {/* Sidebar nav */}
      <nav className="w-56 shrink-0 border-r border-slate-200 bg-slate-50 p-3 hidden md:block">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">
          Learning
        </div>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end ?? false}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                  }`
                }
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile nav */}
      <nav aria-label="Learning navigation (mobile)" className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40">
        <div className="flex overflow-x-auto px-2 py-1.5 gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end ?? false}
              className={({ isActive }) =>
                `flex flex-col items-center px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-slate-500"
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              <span className="mt-0.5">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Content area */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
