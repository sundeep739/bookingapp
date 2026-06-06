import TopBar from "@/components/layout/TopBar";
import AvailabilitySchedule from "@/components/dashboard/AvailabilitySchedule";

export default function AvailabilityPage() {
  return (
    <div className="flex flex-col h-full">
      <TopBar title="Availability" subtitle="Set your weekly schedule and date overrides" />
      <div className="flex-1 p-4 md:p-8">
        <AvailabilitySchedule />
      </div>
    </div>
  );
}
