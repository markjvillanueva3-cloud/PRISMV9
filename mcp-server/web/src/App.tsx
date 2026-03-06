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
import { ViewerPage } from './pages/ViewerPage';
import { ShopFloorClockPage } from './pages/ShopFloorClockPage';
import { TimecardPage } from './pages/TimecardPage';
import { PayrollPage } from './pages/PayrollPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { JobProfitabilityPage } from './pages/JobProfitabilityPage';
import { ToolingCostPage } from './pages/ToolingCostPage';
import { LearningProvider } from './contexts/LearningContext';
import { LearningLayout } from './components/learning/LearningLayout';
import { LearningDashboard } from './pages/LearningDashboard';
import { Assessment } from './components/learning/Assessment';
import { LearningPath } from './components/learning/LearningPath';
import { ProgressTracker } from './components/learning/ProgressTracker';
import { KnowledgeSearch } from './components/learning/KnowledgeSearch';
import { MaterialWizard } from './components/learning/MaterialWizard';
import { ToolWizard } from './components/learning/ToolWizard';
import { MachineWizard } from './components/learning/MachineWizard';
import { DigitalTwin } from './components/learning/DigitalTwin';

export function App() {
  return (
    <LearningProvider>
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
          <Route path="viewer" element={<ViewerPage />} />
          <Route path="shop-clock" element={<ShopFloorClockPage />} />
          <Route path="timecards" element={<TimecardPage />} />
          <Route path="payroll" element={<PayrollPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="profitability" element={<JobProfitabilityPage />} />
          <Route path="tooling-cost" element={<ToolingCostPage />} />
          <Route path="learning" element={<LearningLayout />}>
            <Route index element={<LearningDashboard />} />
            <Route path="assessment" element={<Assessment />} />
            <Route path="path" element={<LearningPath />} />
            <Route path="progress" element={<ProgressTracker />} />
            <Route path="knowledge" element={<KnowledgeSearch />} />
            <Route path="material-wizard" element={<MaterialWizard />} />
            <Route path="tool-wizard" element={<ToolWizard />} />
            <Route path="machine-wizard" element={<MachineWizard />} />
            <Route path="twin" element={<DigitalTwin />} />
          </Route>
        </Route>
      </Routes>
    </LearningProvider>
  );
}
