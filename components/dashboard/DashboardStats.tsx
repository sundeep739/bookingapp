"use client";
import { useEffect, useState } from "react";
import { CalendarCheck, Clock, DollarSign, AlertCircle } from "lucide-react";

export default function DashboardStats() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/dashboard/stats").then((r) => r.json()).then(setData);
  }, []);

  const stats = [
    { label: "Total Bookings",  value: data ? String(data.totalBookings) : "—",  change: "All time",           icon: CalendarCheck, color: "#3b82f6", bg: "#eff6ff" },
    { label: "This Week",       value: data ? String(data.thisWeek) : "—",        change: "New this week",      icon: Clock,         color: "#10b981", bg: "#ecfdf5" },
    { label: "Monthly Revenue", value: data ? `$${data.revenue.toFixed(0)}` : "—", change: "This month",       icon: DollarSign,    color: "#e53e6d", bg: "#fff1f5" },
    { label: "Pending Review",  value: data ? String(data.pending) : "—",         change: "Needs attention",    icon: AlertCircle,   color: "#f59e0b", bg: "#fffbeb" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: stat.bg }}>
              <Icon size={22} style={{ color: stat.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm font-medium text-gray-600">{stat.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{stat.change}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
