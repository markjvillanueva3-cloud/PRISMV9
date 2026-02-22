import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { CalculatorPage } from './pages/CalculatorPage';
import { JobPlannerPage } from './pages/JobPlannerPage';
import { ToolpathAdvisorPage } from './pages/ToolpathAdvisorPage';
import { SafetyMonitorPage } from './pages/SafetyMonitorPage';
import { WhatIfPage } from './pages/WhatIfPage';
import { AlarmPage } from './pages/AlarmPage';
import { ReportsPage } from './pages/ReportsPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="calculator" element={<CalculatorPage />} />
        <Route path="job-planner" element={<JobPlannerPage />} />
        <Route path="toolpath" element={<ToolpathAdvisorPage />} />
        <Route path="safety" element={<SafetyMonitorPage />} />
        <Route path="what-if" element={<WhatIfPage />} />
        <Route path="alarms" element={<AlarmPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  );
}
