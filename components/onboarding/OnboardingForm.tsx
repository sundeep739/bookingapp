"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Check, Loader2, AlertCircle } from "lucide-react";

export default function OnboardingForm({ userName }: { userName: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState(
    userName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || ""
  );
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFinish = async () => {
    if (!username.trim()) { setError("Username is required"); return; }
    if (!/^[a-z0-9_-]+$/.test(username)) { setError("Only lowercase letters, numbers, hyphens and underscores"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), timezone }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#f4f6fb" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e53e6d" }}>
            <CalendarCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">BookEasy</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`w-2.5 h-2.5 rounded-full transition-all ${s <= step ? "" : "bg-gray-200"} ${s < step ? "bg-green-400" : ""}`}
                style={s === step ? { backgroundColor: "#e53e6d" } : {}}
              />
            ))}
          </div>

          {step === 1 && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Welcome to BookEasy! 🎉</h1>
              <p className="text-gray-500 text-center text-sm mb-8">
                Let's set up your booking page. Choose a username — this is your public URL.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Username</label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-pink-500/20 focus-within:border-pink-400">
                  <span className="px-4 py-3 bg-gray-50 text-gray-400 text-sm border-r border-gray-200 whitespace-nowrap">
                    bookeasy.app/
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "")); setError(""); }}
                    placeholder="yourname"
                    maxLength={30}
                    className="flex-1 px-4 py-3 text-sm focus:outline-none"
                    autoFocus
                  />
                </div>
                {error && (
                  <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {error}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-400">Only lowercase letters, numbers, hyphens and underscores.</p>
              </div>

              <button
                onClick={() => { if (!username.trim()) { setError("Please enter a username"); return; } setStep(2); }}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#e53e6d" }}
              >
                Continue →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Your Timezone</h1>
              <p className="text-gray-500 text-center text-sm mb-8">
                We detected your timezone. Confirm or change it.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400"
                >
                  <option value="Pacific/Midway">Pacific/Midway (UTC-11)</option>
                  <option value="Pacific/Honolulu">Pacific/Honolulu (UTC-10)</option>
                  <option value="America/Anchorage">America/Anchorage (UTC-9)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (UTC-8)</option>
                  <option value="America/Denver">America/Denver (UTC-7)</option>
                  <option value="America/Chicago">America/Chicago (UTC-6)</option>
                  <option value="America/New_York">America/New_York (UTC-5)</option>
                  <option value="America/Sao_Paulo">America/Sao_Paulo (UTC-3)</option>
                  <option value="Atlantic/Azores">Atlantic/Azores (UTC-1)</option>
                  <option value="Europe/London">Europe/London (UTC+0)</option>
                  <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                  <option value="Europe/Helsinki">Europe/Helsinki (UTC+2)</option>
                  <option value="Europe/Moscow">Europe/Moscow (UTC+3)</option>
                  <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (UTC+5:30)</option>
                  <option value="Asia/Dhaka">Asia/Dhaka (UTC+6)</option>
                  <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
                  <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                  <option value="Australia/Sydney">Australia/Sydney (UTC+10)</option>
                  <option value="Pacific/Auckland">Pacific/Auckland (UTC+12)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-70"
                  style={{ backgroundColor: "#e53e6d" }}
                >
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Setting up...</> : <><Check size={16} /> Let's go!</>}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          You can change your username anytime in Settings.
        </p>
      </div>
    </div>
  );
}
