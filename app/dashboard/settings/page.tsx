import TopBar from "@/components/layout/TopBar";
import SettingsPanel from "@/components/dashboard/SettingsPanel";

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <TopBar title="Settings" subtitle="Manage your account and preferences" />
      <div className="flex-1 p-4 md:p-8">
        <SettingsPanel />
      </div>
    </div>
  );
}
