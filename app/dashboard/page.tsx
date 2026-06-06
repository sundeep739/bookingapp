import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardStats from "@/components/dashboard/DashboardStats";
import AppointmentPipeline from "@/components/dashboard/AppointmentPipeline";
import UpcomingSchedule from "@/components/dashboard/UpcomingSchedule";
import BookingChart from "@/components/dashboard/BookingChart";
import RecentBookings from "@/components/dashboard/RecentBookings";

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <DashboardHeader />
      <div className="flex-1 p-4 md:p-8 pt-4 space-y-4 md:space-y-6">
        <DashboardStats />
        <AppointmentPipeline />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2"><BookingChart /></div>
          <div><UpcomingSchedule /></div>
        </div>
        <RecentBookings />
      </div>
    </div>
  );
}
