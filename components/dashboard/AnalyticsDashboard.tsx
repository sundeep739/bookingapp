"use client";
import { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Loader2 } from "lucide-react";

const PIE_COLORS = ["#e53e6d", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#14b8a6"];

export default function AnalyticsDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics").then((r) => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-pink-500" /></div>;
  }

  const kpis = [
    { label: "Total Bookings",     value: String(data?.kpis?.total ?? 0),              change: "Last 6 months", positive: true },
    { label: "Total Revenue",      value: `$${(data?.kpis?.revenue ?? 0).toFixed(0)}`, change: "Last 6 months", positive: true },
    { label: "Cancellation Rate",  value: `${data?.kpis?.cancellationRate ?? "0.0"}%`, change: "Last 6 months", positive: true },
    { label: "No-Show Rate",       value: `${data?.kpis?.noShowRate ?? "0.0"}%`,       change: "Last 6 months", positive: true },
  ];

  const breakdown = data?.eventTypeBreakdown ?? [];
  const trend     = data?.trendData ?? [];
  const popular   = data?.popularTimes ?? [];

  const isEmpty = (data?.kpis?.total ?? 0) === 0;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100">
            <p className="text-xs md:text-sm text-gray-500 font-medium">{k.label}</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1">{k.value}</p>
            <p className="text-xs font-semibold mt-1 text-gray-400">{k.change}</p>
          </div>
        ))}
      </div>

      {isEmpty ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <p className="text-4xl mb-4">📊</p>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No data yet</h3>
          <p className="text-gray-500 text-sm">Analytics will appear here once you start receiving bookings.</p>
        </div>
      ) : (
        <>
          {/* Trend chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Bookings & Revenue Trend</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="colorB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#e53e6d" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#e53e6d" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9ca3af" }} yAxisId="left" />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9ca3af" }} yAxisId="right" orientation="right" />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                <Legend />
                <Area yAxisId="left"  type="monotone" dataKey="bookings" stroke="#e53e6d" strokeWidth={2.5} fill="url(#colorB)" name="Bookings" />
                <Area yAxisId="right" type="monotone" dataKey="revenue"  stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorR)"  name="Revenue ($)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
            {/* Pie */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-5">Event Type Breakdown</h2>
              {breakdown.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
              ) : (
                <div className="flex items-center gap-4 md:gap-6 flex-wrap">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie data={breakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                        {breakdown.map((_: any, i: number) => (
                          <Cell key={i} fill={breakdown[i]?.color ?? PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 flex-1 min-w-0">
                    {breakdown.map((item: any, i: number) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color ?? PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-sm text-gray-600 truncate">{item.name}</span>
                        <span className="text-sm font-semibold text-gray-900 ml-auto flex-shrink-0">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Popular times */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-5">Popular Booking Times</h2>
              {popular.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={popular} barSize={7}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                    <Bar dataKey="Mon" fill="#e53e6d" radius={[3,3,0,0]} />
                    <Bar dataKey="Wed" fill="#3b82f6" radius={[3,3,0,0]} />
                    <Bar dataKey="Fri" fill="#10b981" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
