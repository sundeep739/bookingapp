"use client";
import { useEffect, useState } from "react";
import { CheckCircle, Loader2, Copy, RefreshCw, ExternalLink, AlertCircle } from "lucide-react";
import Link from "next/link";

const CALENDAR_BANNERS: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true,  text: "Google Calendar connected — bookings will sync automatically." },
  denied:    { ok: false, text: "Calendar access wasn't granted. You can try connecting again." },
  conflict:  { ok: false, text: "That Google account is already linked to another BookEasy account." },
  error:     { ok: false, text: "Couldn't connect Google Calendar. Please try again." },
};

const connectGoogleCalendar = () => { window.location.href = "/api/integrations/google/connect"; };

type Status = {
  googleCalendar: boolean;
  googleMeet: boolean;
  smsConfigured: boolean;
  stripeConfigured: boolean;
};

export default function IntegrationsPanel() {
  const [status, setStatus]           = useState<Status | null>(null);
  const [feedUrl, setFeedUrl]         = useState<string | null>(null);
  const [webcalUrl, setWebcalUrl]     = useState<string | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [copied, setCopied]           = useState(false);
  const [rotating, setRotating]       = useState(false);
  const [banner, setBanner]           = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/integrations/status").then((r) => r.json()).then(setStatus).catch(() => {});
    loadFeedUrl();
    // Show the result of the Google Calendar connect flow, then clean the URL.
    const params = new URLSearchParams(window.location.search);
    const cal = params.get("calendar");
    if (cal && CALENDAR_BANNERS[cal]) {
      setBanner(CALENDAR_BANNERS[cal]);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const loadFeedUrl = async () => {
    setFeedLoading(true);
    try {
      const res = await fetch("/api/calendar/token");
      const data = await res.json();
      setFeedUrl(data.feedUrl ?? null);
      setWebcalUrl(data.webcal ?? null);
    } finally {
      setFeedLoading(false);
    }
  };

  const rotateFeed = async () => {
    if (!confirm("This will break any existing calendar subscriptions. Continue?")) return;
    setRotating(true);
    try {
      const res = await fetch("/api/calendar/token", { method: "POST" });
      const data = await res.json();
      setFeedUrl(data.feedUrl ?? null);
      setWebcalUrl(data.webcal ?? null);
    } finally {
      setRotating(false);
    }
  };

  const copyFeed = () => {
    if (feedUrl) {
      navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!status) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>;
  }

  const live = [
    {
      name: "Google Calendar", logo: "🗓️", color: "#4285F4", category: "Calendar",
      description: "Two-way sync: bookings are added to your Google Calendar and busy times block new slots automatically.",
      connected: status.googleCalendar,
      connect: connectGoogleCalendar,
    },
    {
      name: "Google Meet", logo: "📹", color: "#00AC47", category: "Video",
      description: "Every new booking automatically gets a Google Meet video link sent to both host and guest.",
      connected: status.googleMeet,
      connect: connectGoogleCalendar,
    },
    {
      name: "Stripe Payments", logo: "💳", color: "#635BFF", category: "Payments",
      description: "Charge clients or take deposits for paid event types. Money goes directly to your bank.",
      connected: status.stripeConfigured,
      manageHref: "/dashboard/settings",
    },
    {
      name: "SMS Reminders", logo: "📱", color: "#22c55e", category: "Notifications",
      description: "Automatic text reminders 24h and 1h before each booking (Pro plan and above).",
      connected: status.smsConfigured,
    },
  ];

  const comingSoon = [
    { name: "Zoom",                  logo: "🔵", color: "#2D8CFF", category: "Video" },
    { name: "Outlook / Office 365",  logo: "📅", color: "#0078D4", category: "Calendar" },
    { name: "WhatsApp",              logo: "🟢", color: "#25D366", category: "Notifications" },
    { name: "Zapier",                logo: "⚡", color: "#FF4A00", category: "Automation" },
    { name: "Slack",                 logo: "💬", color: "#4A154B", category: "Notifications" },
    { name: "HubSpot",               logo: "🧡", color: "#FF7A59", category: "CRM" },
  ];

  const connectedCount = live.filter((i) => i.connected).length;

  return (
    <div className="space-y-6">
      {banner && (
        <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm border ${banner.ok ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {banner.ok ? <CheckCircle size={16} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />}
          <span>{banner.text}</span>
          <button onClick={() => setBanner(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <p className="text-sm text-gray-500">Active integrations</p>
        <p className="text-2xl font-bold text-gray-900">{connectedCount} / {live.length}</p>
      </div>

      {/* ── Calendar subscription feed ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-blue-50">📆</div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Calendar Subscription Feed</h3>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">iOS · Outlook · Apple Calendar</span>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          Subscribe to this URL in <strong>any</strong> calendar app — iOS, macOS Calendar, Outlook, or Google Calendar.
          Your bookings appear automatically and stay in sync. No extra setup needed.
        </p>

        {/* Instructions chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { label: "iOS",     hint: "Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar" },
            { label: "Outlook", hint: "Add Calendar → From Internet → paste URL" },
            { label: "macOS",   hint: "File → New Calendar Subscription → paste URL" },
            { label: "Google",  hint: "Other calendars + → From URL → paste URL" },
          ].map((app) => (
            <div key={app.label} className="group relative">
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full cursor-default">
                {app.label}
              </span>
              <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-10 w-64 bg-gray-900 text-white text-xs rounded-lg p-2.5 leading-relaxed shadow-lg">
                {app.hint}
              </div>
            </div>
          ))}
        </div>

        {feedLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading feed URL…
          </div>
        ) : feedUrl ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={feedUrl}
                className="flex-1 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-600 truncate"
              />
              <button
                onClick={copyFeed}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 flex-shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            {webcalUrl && (
              <div className="flex items-center gap-2">
                <a
                  href={webcalUrl}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open in calendar app (webcal://)
                </a>
                <span className="text-xs text-gray-300">·</span>
                <button
                  onClick={rotateFeed}
                  disabled={rotating}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                >
                  <RefreshCw className={`w-3 h-3 ${rotating ? "animate-spin" : ""}`} />
                  Rotate token
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* ── Live integrations ─────────────────────────────────────────────── */}
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
                <button onClick={i.connect} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "#4F46E5" }}>
                  Connect
                </button>
              ) : i.manageHref ? (
                <Link href={i.manageHref} className="px-4 py-2 rounded-xl text-sm font-semibold text-white inline-block" style={{ backgroundColor: "#4F46E5" }}>
                  Set up
                </Link>
              ) : (
                <span className="text-xs text-gray-400">Requires platform configuration</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Coming soon ──────────────────────────────────────────────────── */}
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
