"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { useState } from "react";

const weeklyData = [
  { name: "Mon", bookings: 4, revenue: 320 },
  { name: "Tue", bookings: 7, revenue: 560 },
  { name: "Wed", bookings: 5, revenue: 400 },
  { name: "Thu", bookings: 9, revenue: 720 },
  { name: "Fri", bookings: 6, revenue: 480 },
  { name: "Sat", bookings: 3, revenue: 240 },
  { name: "Sun", bookings: 2, revenue: 160 },
];

const monthlyData = [
  { name: "Jan", bookings: 45, revenue: 3600 },
  { name: "Feb", bookings: 52, revenue: 4160 },
  { name: "Mar", bookings: 61, revenue: 4880 },
  { name: "Apr", bookings: 48, revenue: 3840 },
  { name: "May", bookings: 70, revenue: 5600 },
  { name: "Jun", bookings: 65, revenue: 5200 },
];

export default function BookingChart() {
  const [view, setView] = useState<"week" | "month">("week");
  const data = view === "week" ? weeklyData : monthlyData;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-gray-900">Booking Overview</h2>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["week", "month"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${
                view === v
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {v === "week" ? "This Week" : "This Month"}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barSize={28}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9ca3af" }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9ca3af" }} />
          <Tooltip
            contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
            cursor={{ fill: "#f9fafb" }}
          />
          <Bar dataKey="bookings" fill="#e53e6d" radius={[6, 6, 0, 0]} name="Bookings" />
          <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Revenue ($)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
