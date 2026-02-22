import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { CalculatorPage } from './pages/CalculatorPage';
import { AlarmPage } from './pages/AlarmPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="calculator" element={<CalculatorPage />} />
        <Route path="alarms" element={<AlarmPage />} />
      </Route>
    </Routes>
  );
}
