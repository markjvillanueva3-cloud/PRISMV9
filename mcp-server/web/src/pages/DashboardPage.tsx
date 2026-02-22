import { SafetyBadge } from '../components/SafetyBadge';

export function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Manufacturing Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardCard title="Safety Score" value={<SafetyBadge score={0.88} />} />
        <DashboardCard title="Active Jobs" value="0" />
        <DashboardCard title="Alarms" value="0" />
      </div>
      <div className="mt-8 text-gray-500 text-sm">
        Dashboard data sources will connect to PRISM bridge REST endpoints.
      </div>
    </div>
  );
}

function DashboardCard({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
