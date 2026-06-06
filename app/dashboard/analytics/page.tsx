import TopBar from "@/components/layout/TopBar";
import AnalyticsDashboard from "@/components/dashboard/AnalyticsDashboard";

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col h-full">
      <TopBar title="Analytics" subtitle="Track your booking performance and revenue" />
      <div className="flex-1 p-4 md:p-8">
        <AnalyticsDashboard />
      </div>
    </div>
  );
}
