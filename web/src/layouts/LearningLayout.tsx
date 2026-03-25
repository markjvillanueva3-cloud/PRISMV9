import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardCheck,
  Route,
  TrendingUp,
  Search,
  Gem,
  Wrench,
  Cpu,
  Radio,
  type LucideIcon,
} from "lucide-react";

const NAV_ITEMS: { to: string; label: string; Icon: LucideIcon; end?: boolean }[] = [
  { to: "/learning", label: "Dashboard", Icon: LayoutDashboard, end: true },
  { to: "/learning/assessment", label: "Assessment", Icon: ClipboardCheck },
  { to: "/learning/path", label: "Learning Path", Icon: Route },
  { to: "/learning/progress", label: "Progress", Icon: TrendingUp },
  { to: "/learning/knowledge", label: "Knowledge", Icon: Search },
  { to: "/learning/material", label: "Material", Icon: Gem },
  { to: "/learning/tool", label: "Tool", Icon: Wrench },
  { to: "/learning/machine", label: "Machine", Icon: Cpu },
  { to: "/learning/twin", label: "Digital Twin", Icon: Radio },
];

export default function LearningLayout() {
  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      {/* Sidebar nav */}
      <nav className="w-56 shrink-0 border-r border-slate-700/60 bg-slate-900 p-3 hidden md:block">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">
          Training
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
                      ? "bg-blue-600/20 text-blue-400 font-medium"
                      : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                  }`
                }
              >
                <item.Icon size={18} className="shrink-0" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile nav */}
      <nav
        aria-label="Learning navigation (mobile)"
        className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700/60 z-40"
      >
        <div className="flex overflow-x-auto px-2 py-1.5 gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end ?? false}
              className={({ isActive }) =>
                `flex flex-col items-center px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-blue-600/20 text-blue-400 font-medium"
                    : "text-slate-400"
                }`
              }
            >
              <item.Icon size={18} />
              <span className="mt-0.5">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Content area */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 bg-[#0c1220]">
        <Outlet />
      </main>
    </div>
  );
}
