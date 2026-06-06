import TopBar from "@/components/layout/TopBar";
import EventTypesList from "@/components/dashboard/EventTypesList";

export default function EventTypesPage() {
  return (
    <div className="flex flex-col h-full">
      <TopBar title="Event Types" subtitle="Manage the types of meetings people can book with you" />
      <div className="flex-1 p-4 md:p-8">
        <EventTypesList />
      </div>
    </div>
  );
}
