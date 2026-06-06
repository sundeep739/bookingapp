"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const STAGES = [
  { key: "PENDING",   label: "New Requests", color: "#3b82f6", bg: "#dbeafe" },
  { key: "CONFIRMED", label: "Confirmed",    color: "#10b981", bg: "#d1fae5" },
  { key: "COMPLETED", label: "Completed",    color: "#8b5cf6", bg: "#ede9fe" },
  { key: "CANCELLED", label: "Cancelled",    color: "#ef4444", bg: "#fee2e2" },
];

export default function AppointmentPipeline() {
  const [pipeline, setPipeline] = useState<Record<string, { count: number; items: string[] }> | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/stats").then((r) => r.json()).then((d) => setPipeline(d.pipeline ?? null));
  }, []);

  const total = pipeline ? Object.values(pipeline).reduce((s, x) => s + x.count, 0) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-gray-900">Appointment Pipeline</h2>
        <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">Total: {total}</span>
      </div>

      {!pipeline ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-pink-400" /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAGES.map((col) => {
            const data = pipeline[col.key] ?? { count: 0, items: [] };
            return (
              <div key={col.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{col.label}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: col.color, backgroundColor: col.bg }}>
                    {data.count}
                  </span>
                </div>
                <div className="space-y-2 min-h-[3rem]">
                  {data.items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-100 p-3 text-xs text-gray-300 text-center">None</div>
                  ) : data.items.map((name, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 border border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0" style={{ backgroundColor: col.color }}>
                          {name?.[0]?.toUpperCase()}
                        </div>
                        <span className="truncate font-medium">{name}</span>
                      </div>
                    </div>
                  ))}
                  {data.count > data.items.length && (
                    <p className="text-xs text-gray-400 pl-1">+{data.count - data.items.length} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
