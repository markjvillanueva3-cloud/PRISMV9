import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import SfcCalculatorPage from "./pages/SfcCalculatorPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/sfc" element={<SfcCalculatorPage />} />
        <Route path="*" element={<Navigate to="/sfc" replace />} />
      </Route>
    </Routes>
  );
}
