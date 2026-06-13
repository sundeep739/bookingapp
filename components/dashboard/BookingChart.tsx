"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Point = { name: string; bookings: number; revenue: number };

export default function BookingChart() {
  const [view, setView] = useState<"week" | "month">("week");
  const [chart, setChart] = useState<{ week: Point[]; month: Point[] } | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/stats").then((r) => r.json()).then((d) => setChart(d.chart ?? null));
  }, []);

  const data = chart ? chart[view] : [];
  const hasRevenue = data.some((d) => d.revenue > 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-gray-900">Booking Overview</h2>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["week", "month"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {v === "week" ? "This Week" : "6 Months"}
            </button>
          ))}
        </div>
      </div>

      {!chart ? (
        <div className="flex items-center justify-center" style={{ height: 220 }}>
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barSize={hasRevenue ? 16 : 28}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9ca3af" }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9ca3af" }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
              cursor={{ fill: "#f9fafb" }}
            />
            <Bar dataKey="bookings" fill="#4F46E5" radius={[6, 6, 0, 0]} name="Bookings" />
            {hasRevenue && <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Revenue ($)" />}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
