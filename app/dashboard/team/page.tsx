import TopBar from "@/components/layout/TopBar";
import TeamPanel from "@/components/dashboard/TeamPanel";

export default function TeamPage() {
  return (
    <div className="flex flex-col h-full">
      <TopBar title="Teams" subtitle="Manage your organizations, staff and departments" />
      <div className="flex-1 p-4 md:p-8">
        <TeamPanel />
      </div>
    </div>
  );
}
