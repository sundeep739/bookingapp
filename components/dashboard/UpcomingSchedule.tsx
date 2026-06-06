"use client";
import { useEffect, useState } from "react";
import { Clock, Video, Loader2 } from "lucide-react";
import Link from "next/link";

export default function UpcomingSchedule() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => setMeetings(d.todayBookings ?? []))
      .finally(() => setLoading(false));
  }, []);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-gray-900">Today's Schedule</h2>
        <span className="text-xs text-pink-600 font-medium bg-pink-50 px-2.5 py-1 rounded-full">
          {loading ? "..." : `${meetings.length} meetings`}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-pink-400" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Clock size={32} className="text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">No meetings scheduled for today</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: item.eventType?.color ?? "#3b82f6" }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.inviteeName}</p>
                <p className="text-xs text-gray-500">{item.eventType?.title}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock size={12} />{formatTime(item.startTime)}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                  <Video size={11} />Google Meet
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Link href="/dashboard/bookings">
        <button className="mt-4 w-full py-2.5 text-sm font-medium text-pink-600 bg-pink-50 rounded-xl hover:bg-pink-100 transition-colors">
          View Full Schedule →
        </button>
      </Link>
    </div>
  );
}
