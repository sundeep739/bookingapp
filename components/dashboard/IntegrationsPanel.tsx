"use client";
import { useEffect, useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";

type Status = {
  googleCalendar: boolean;
  googleMeet: boolean;
  smsConfigured: boolean;
  stripeConfigured: boolean;
};

export default function IntegrationsPanel() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch("/api/integrations/status").then((r) => r.json()).then(setStatus).catch(() => {});
  }, []);

  if (!status) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-pink-500" /></div>;
  }

  const live = [
    {
      name: "Google Calendar", logo: "🗓️", color: "#4285F4", category: "Calendar",
      description: "Two-way sync: bookings are added to your calendar and busy times block new bookings.",
      connected: status.googleCalendar,
      connect: () => signIn("google", { callbackUrl: "/dashboard/integrations" }),
    },
    {
      name: "Google Meet", logo: "📹", color: "#00AC47", category: "Video",
      description: "Every new booking automatically gets a Google Meet video link.",
      connected: status.googleMeet,
      connect: () => signIn("google", { callbackUrl: "/dashboard/integrations" }),
    },
    {
      name: "Stripe Payments", logo: "💳", color: "#635BFF", category: "Payments",
      description: "Charge clients or take deposits for paid event types.",
      connected: status.stripeConfigured,
      manageHref: "/dashboard/settings",
    },
    {
      name: "SMS Reminders", logo: "📱", color: "#22c55e", category: "Notifications",
      description: "Automatic text reminders 24h and 1h before each booking (Pro and up).",
      connected: status.smsConfigured,
    },
  ];

  const comingSoon = [
    { name: "Zoom", logo: "🔵", color: "#2D8CFF", category: "Video" },
    { name: "Outlook / Microsoft 365", logo: "📅", color: "#0078D4", category: "Calendar" },
    { name: "WhatsApp", logo: "🟢", color: "#25D366", category: "Notifications" },
    { name: "Zapier", logo: "⚡", color: "#FF4A00", category: "Automation" },
    { name: "Slack", logo: "💬", color: "#4A154B", category: "Notifications" },
    { name: "HubSpot", logo: "🧡", color: "#FF7A59", category: "CRM" },
  ];

  const connectedCount = live.filter((i) => i.connected).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <p className="text-sm text-gray-500">Active integrations</p>
        <p className="text-2xl font-bold text-gray-900">{connectedCount} / {live.length}</p>
      </div>

      {/* Live integrations */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Available now</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {live.map((i) => (
            <div key={i.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: i.color + "15" }}>{i.logo}</div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{i.name}</h3>
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{i.category}</span>
                  </div>
                </div>
                {i.connected && <CheckCircle size={18} className="text-green-500 flex-shrink-0 mt-1" />}
              </div>
              <p className="text-sm text-gray-500 mb-5 leading-relaxed">{i.description}</p>
              {i.connected ? (
                i.manageHref ? (
                  <Link href={i.manageHref} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50">
                    Manage
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-green-50 text-green-700">
                    <CheckCircle size={14} /> Connected
                  </span>
                )
              ) : i.connect ? (
                <button onClick={i.connect} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "#e53e6d" }}>
                  Connect
                </button>
              ) : i.manageHref ? (
                <Link href={i.manageHref} className="px-4 py-2 rounded-xl text-sm font-semibold text-white inline-block" style={{ backgroundColor: "#e53e6d" }}>
                  Set up
                </Link>
              ) : (
                <span className="text-xs text-gray-400">Not configured</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Coming soon */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Coming soon</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {comingSoon.map((i) => (
            <div key={i.name} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 opacity-70">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: i.color + "15" }}>{i.logo}</div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{i.name}</p>
                <span className="text-xs text-gray-400">{i.category}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
