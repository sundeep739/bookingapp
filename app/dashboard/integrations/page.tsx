import TopBar from "@/components/layout/TopBar";
import IntegrationsPanel from "@/components/dashboard/IntegrationsPanel";

export default function IntegrationsPage() {
  return (
    <div className="flex flex-col h-full">
      <TopBar title="Integrations" subtitle="Connect your tools and services" />
      <div className="flex-1 p-4 md:p-8">
        <IntegrationsPanel />
      </div>
    </div>
  );
}
