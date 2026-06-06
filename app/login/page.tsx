export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CalendarCheck } from "lucide-react";
import LoginButton from "@/components/auth/LoginButton";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f4f6fb" }}>
      {/* Left Panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white"
        style={{ backgroundColor: "#1a1f36" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e53e6d" }}>
            <CalendarCheck className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold">BookEasy</span>
        </div>

        <div className="space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            Smart scheduling for{" "}
            <span style={{ color: "#e53e6d" }}>modern professionals</span>
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Say goodbye to back-and-forth emails. Let your clients book time with you in seconds.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { label: "50K+", desc: "Active users" },
              { label: "2M+", desc: "Bookings made" },
              { label: "98%", desc: "Satisfaction rate" },
              { label: "150+", desc: "Countries" },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 rounded-2xl p-4">
                <p className="text-2xl font-bold text-white">{s.label}</p>
                <p className="text-sm text-gray-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-gray-500 text-sm">
          © 2026 BookEasy. All rights reserved.
        </p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e53e6d" }}>
              <CalendarCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">BookEasy</span>
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
              <p className="text-gray-500 mt-2">Sign in to manage your bookings</p>
            </div>

            <LoginButton />

            <div className="mt-6 p-4 rounded-2xl text-xs text-gray-500 text-center" style={{ backgroundColor: "#f8f9ff" }}>
              By signing in, you agree to our{" "}
              <a href="#" className="text-pink-600 hover:underline">Terms of Service</a>{" "}
              and{" "}
              <a href="#" className="text-pink-600 hover:underline">Privacy Policy</a>.
              <br />
              We&apos;ll request access to your Google Calendar to manage bookings.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
