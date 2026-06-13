import { prisma } from "@/lib/prisma";
import { CalendarCheck, Check } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const booking = id
    ? await prisma.booking.findUnique({
        where: { id },
        include: { eventType: { select: { title: true, duration: true } }, host: { select: { name: true, username: true } } },
      })
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#f4f6fb" }}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#4F46E5" }}>
            <CalendarCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900">BookEasy</span>
        </div>

        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
          <Check size={40} className="text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Payment received!</h1>
        <p className="text-gray-500 mt-2 text-sm">
          {booking
            ? <>Your booking for <strong>{booking.eventType.title}</strong>{booking.host.name ? <> with <strong>{booking.host.name}</strong></> : null} is confirmed.</>
            : "Your booking is confirmed."}
        </p>

        {booking && (
          <div className="mt-6 p-5 bg-gray-50 rounded-2xl text-left space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">When</span>
              <span className="font-semibold text-gray-900">
                {new Date(booking.startTime).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Duration</span>
              <span className="font-semibold text-gray-900">{booking.eventType.duration} min</span>
            </div>
            {booking.amountPaid != null && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Paid</span>
                <span className="font-semibold text-green-600">${booking.amountPaid.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-5">A confirmation email is on its way.</p>
        {booking?.host.username && (
          <Link href={`/${booking.host.username}`}
            className="inline-block mt-5 text-sm font-medium text-indigo-600 hover:underline">
            ← Back to booking page
          </Link>
        )}
      </div>
    </div>
  );
}
