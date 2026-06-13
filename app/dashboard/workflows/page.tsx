import TopBar from "@/components/layout/TopBar";
import WorkflowsPanel from "@/components/dashboard/WorkflowsPanel";

export default function WorkflowsPage() {
  return (
    <div className="flex flex-col h-full">
      <TopBar title="Workflows" subtitle="Automated reminders & follow-ups" />
      <div className="flex-1 p-4 md:p-8">
        <WorkflowsPanel />
      </div>
    </div>
  );
}
