"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem("be_cookie_consent")) setShow(true);
    } catch { /* ignore */ }
  }, []);

  const decide = (value: "accepted" | "essential") => {
    try { localStorage.setItem("be_cookie_consent", value); } catch { /* ignore */ }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:max-w-sm z-[60]">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5">
        <p className="text-sm text-gray-600 leading-relaxed">
          We use essential cookies to run BookEasy and keep you signed in. See our{" "}
          <Link href="/privacy" className="text-pink-600 hover:underline">Privacy Policy</Link>.
        </p>
        <div className="flex gap-2 mt-4">
          <button onClick={() => decide("essential")}
            className="flex-1 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
            Essential only
          </button>
          <button onClick={() => decide("accepted")}
            className="flex-1 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: "#e53e6d" }}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
