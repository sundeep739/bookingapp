"use client";
import { useEffect, useState } from "react";
import { CalendarCheck, Check, Loader2, AlertCircle, X } from "lucide-react";

export default function CancelPage({ params }: { params: { token: string } }) {
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/cancel/${params.token}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setBooking(d); })
      .catch(() => setError("Failed to load booking"))
      .finally(() => setLoading(false));
  }, [params.token]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/cancel/${params.token}`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Failed to cancel"); return; }
      setCancelled(true);
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#f4f6fb" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e53e6d" }}>
            <CalendarCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">BookEasy</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Booking not found</h2>
              <p className="text-gray-500 text-sm">{error}</p>
            </div>
          ) : cancelled || booking?.status === "CANCELLED" ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <X className="w-7 h-7 text-gray-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Booking Cancelled</h2>
              <p className="text-gray-500 text-sm">Your booking has been cancelled successfully.</p>
              <a href={`/${booking?.hostUsername}`}
                className="inline-block mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#e53e6d" }}>
                Book Again
              </a>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Cancel Booking</h2>
              <p className="text-gray-500 text-sm mb-6">Are you sure you want to cancel this meeting?</p>

              <div className="bg-gray-50 rounded-2xl p-5 space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Event</span>
                  <span className="font-semibold text-gray-900">{booking.eventTitle}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Date</span>
                  <span className="font-semibold text-gray-900">{formatDate(booking.startTime)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Time</span>
                  <span className="font-semibold text-gray-900">{formatTime(booking.startTime)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Host</span>
                  <span className="font-semibold text-gray-900">{booking.hostName}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <a href={`/${booking.hostUsername}`}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-center">
                  Keep it
                </a>
                <button onClick={handleCancel} disabled={cancelling}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                  {cancelling ? <><Loader2 size={15} className="animate-spin" />Cancelling...</> : <>Cancel Booking</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
