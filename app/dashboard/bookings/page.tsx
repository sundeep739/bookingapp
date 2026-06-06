import TopBar from "@/components/layout/TopBar";
import BookingsTable from "@/components/dashboard/BookingsTable";

export default function BookingsPage() {
  return (
    <div className="flex flex-col h-full">
      <TopBar title="Bookings" subtitle="All your scheduled and past appointments" />
      <div className="flex-1 p-4 md:p-8">
        <BookingsTable />
      </div>
    </div>
  );
}
