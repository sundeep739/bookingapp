"use client";
import { useState, useEffect } from "react";
import { Save, Copy, ExternalLink, Loader2, Check, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import ImageUpload from "@/components/shared/ImageUpload";

const tabs = ["Profile", "Booking Page", "Notifications", "Billing"];

export default function SettingsPanel() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("Profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    bio: "",
    timezone: "UTC",
    image: null as string | null,
    plan: "free",
    planStatus: null as string | null,
    planRenewsAt: null as string | null,
  });

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        setForm({
          name: data.name ?? "",
          email: data.email ?? "",
          username: data.username ?? "",
          bio: data.bio ?? "",
          timezone: data.timezone ?? "UTC",
          image: data.image ?? null,
          plan: data.plan ?? "free",
          planStatus: data.planStatus ?? null,
          planRenewsAt: data.planRenewsAt ?? null,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, username: form.username, bio: form.bio, timezone: form.timezone, image: form.image }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Save failed"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/${form.username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* Tab nav */}
      <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            style={activeTab === tab ? { backgroundColor: "#e53e6d" } : {}}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "Profile" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Profile Information</h2>

            {/* Avatar */}
            <div className="mb-6">
              <ImageUpload
                value={form.image ?? session?.user?.image ?? null}
                onChange={(img) => setForm((p) => ({ ...p, image: img }))}
                fallback={
                  <div className="w-full h-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white text-xl font-bold">
                    {form.name[0]?.toUpperCase() ?? "U"}
                  </div>
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Your name" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="text" value={form.email} disabled
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">/</span>
                  <input type="text" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))}
                    placeholder="yourname" className="w-full border border-gray-200 rounded-xl pl-7 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
                <textarea value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="Tell people about yourself..." rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400 resize-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Timezone</label>
                <select value={form.timezone} onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400">
                  <option value="America/Los_Angeles">America/Los_Angeles (UTC-8)</option>
                  <option value="America/Denver">America/Denver (UTC-7)</option>
                  <option value="America/Chicago">America/Chicago (UTC-6)</option>
                  <option value="America/New_York">America/New_York (UTC-5)</option>
                  <option value="Europe/London">Europe/London (UTC+0)</option>
                  <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                  <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (UTC+5:30)</option>
                  <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                  <option value="Australia/Sydney">Australia/Sydney (UTC+10)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-70 ${saved ? "bg-green-500" : ""}`}
              style={saved ? {} : { backgroundColor: "#e53e6d" }}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
              {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* Booking Page Tab */}
      {activeTab === "Booking Page" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900">Your Booking Page</h2>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-sm text-gray-700 font-mono flex-1 truncate">
              {typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/{form.username || "your-username"}
            </span>
            <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all flex-shrink-0" style={{ backgroundColor: "#e53e6d" }}>
              <Copy size={13} />{copied ? "Copied!" : "Copy"}
            </button>
            {form.username && (
              <a href={`/${form.username}`} target="_blank" className="p-1.5 rounded-lg border border-gray-200 hover:bg-white transition-colors flex-shrink-0">
                <ExternalLink size={14} className="text-gray-500" />
              </a>
            )}
          </div>
          <p className="text-sm text-gray-500">Share this link so people can book meetings with you.</p>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "Notifications" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-2">Email Notifications</h2>
          <p className="text-sm text-gray-400 mb-5">Email notifications will be available once email sending is configured.</p>
          <div className="space-y-4 opacity-50 pointer-events-none">
            {["New Booking", "Cancellation", "24h Reminder", "1h Reminder"].map((item) => (
              <div key={item} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <p className="text-sm font-medium text-gray-900">{item}</p>
                <div className="w-10 h-6 rounded-full bg-gray-200 relative">
                  <span className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === "Billing" && <BillingTab plan={form.plan} planStatus={form.planStatus} planRenewsAt={form.planRenewsAt} />}
    </div>
  );
}

const PLANS = [
  { key: "free", name: "Free", price: "$0", features: ["1 user", "Unlimited bookings", "Google Calendar sync", "Booking page"] },
  { key: "pro", name: "Pro", price: "$12", features: ["Everything in Free", "SMS reminders", "Analytics", "Waiting list"] },
  { key: "team", name: "Team", price: "$49", features: ["Up to 10 staff", "Team booking page", "Departments", "Admin dashboard"] },
  { key: "business", name: "Business", price: "$149", features: ["Unlimited staff", "White-label", "Priority support", "API access"] },
];

function BillingTab({ plan, planStatus, planRenewsAt }: { plan: string; planStatus: string | null; planRenewsAt: string | null }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const upgrade = async (planKey: string) => {
    setBusy(planKey); setError("");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError(data.error ?? "Could not start checkout");
    } finally { setBusy(null); }
  };

  const manage = async () => {
    setBusy("portal"); setError("");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError(data.error ?? "Could not open billing portal");
    } finally { setBusy(null); }
  };

  const currentIdx = PLANS.findIndex((p) => p.key === plan);

  return (
    <div className="space-y-5">
      {/* Current plan */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Current plan</p>
            <p className="text-2xl font-bold mt-1" style={{ color: "#e53e6d" }}>
              {PLANS.find((p) => p.key === plan)?.name ?? "Free"}
            </p>
            {planRenewsAt && plan !== "free" && (
              <p className="text-xs text-gray-500 mt-1">
                {planStatus === "canceled" ? "Ends" : "Renews"} {new Date(planRenewsAt).toLocaleDateString()}
              </p>
            )}
          </div>
          {plan !== "free" && (
            <button onClick={manage} disabled={!!busy}
              className="px-4 py-2 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60">
              {busy === "portal" ? "Opening…" : "Manage billing"}
            </button>
          )}
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLANS.map((p, idx) => {
          const isCurrent = p.key === plan;
          const isDowngrade = idx < currentIdx;
          return (
            <div key={p.key} className={`rounded-2xl border-2 p-5 ${isCurrent ? "" : "border-gray-100"}`}
              style={isCurrent ? { borderColor: "#e53e6d", backgroundColor: "#fff1f5" } : {}}>
              <div className="flex items-baseline justify-between">
                <p className="font-bold text-gray-900">{p.name}</p>
                <p className="text-lg font-bold text-gray-900">{p.price}<span className="text-xs text-gray-400 font-normal">/mo</span></p>
              </div>
              <ul className="mt-3 space-y-1.5 mb-4">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="text-green-500 mt-0.5">✓</span> {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <div className="text-center py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "#e53e6d" }}>
                  Current plan
                </div>
              ) : p.key === "free" ? (
                <div className="text-center py-2 rounded-xl text-sm text-gray-400 bg-gray-50">—</div>
              ) : (
                <button onClick={() => upgrade(p.key)} disabled={!!busy}
                  className="w-full py-2 rounded-xl text-sm font-semibold border-2 transition-colors disabled:opacity-60"
                  style={{ borderColor: "#e53e6d", color: "#e53e6d" }}>
                  {busy === p.key ? "Redirecting…" : isDowngrade ? "Switch" : "Upgrade"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <p className="text-xs text-gray-400">Secure payments by Stripe. Cancel anytime from “Manage billing”.</p>
    </div>
  );
}
