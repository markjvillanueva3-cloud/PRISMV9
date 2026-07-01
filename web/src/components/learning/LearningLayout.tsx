/**
 * L8-P1-MS2 P0-U11: Learning Layout & Sub-Navigation
 * Section nav with sidebar under /learning/* routes.
 */
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/learning', label: 'Dashboard', end: true },
  { path: '/learning/assessment', label: 'Assessment', end: false },
  { path: '/learning/path', label: 'Learning Path', end: false },
  { path: '/learning/progress', label: 'Progress', end: false },
  { path: '/learning/knowledge', label: 'Knowledge', end: false },
  { path: '/learning/material-wizard', label: 'Materials', end: false },
  { path: '/learning/tool-wizard', label: 'Tools', end: false },
  { path: '/learning/machine-wizard', label: 'Machines', end: false },
  { path: '/learning/twin', label: 'Digital Twin', end: false },
  { path: '/learning/academy', label: 'Academy', end: false },
];

export function LearningLayout() {
  const location = useLocation();

  // Breadcrumb: find current nav item
  const current = NAV_ITEMS.find(item =>
    item.end ? location.pathname === item.path : location.pathname.startsWith(item.path)
  );

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar Nav */}
      <nav className="md:w-48 flex-shrink-0">
        <div className="md:sticky md:top-4 space-y-1">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `block px-3 py-2 text-sm rounded-lg transition-colors ${
                  isActive
                    ? 'bg-prism-50 text-prism-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Breadcrumb */}
        <div className="text-xs text-gray-400 mb-4">
          <span>Learning</span>
          {current && current.label !== 'Dashboard' && (
            <>
              <span className="mx-1">/</span>
              <span className="text-gray-600">{current.label}</span>
            </>
          )}
        </div>

        <Outlet />
      </div>
    </div>
  );
}
