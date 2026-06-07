"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Copy, Check, ExternalLink, Plus } from "lucide-react";
import Link from "next/link";

export default function DashboardHeader() {
  const { data: session } = useSession();
  const [username, setUsername] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile").then((r) => r.json()).then((d) => setUsername(d.username ?? null));
  }, []);

  const firstName = (session?.user?.name ?? "there").split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const bookingUrl = username ? `${origin}/${username}` : "";

  const copy = () => {
    if (!bookingUrl) return;
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="px-4 md:px-8 pt-6 pb-2">
      <div className="rounded-2xl p-6 md:p-7 relative overflow-hidden" style={{ background: "linear-gradient(135deg,#1a1f36 0%,#2d3561 100%)" }}>
        {/* decorative blob */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle,#e53e6d,transparent)", transform: "translate(30%,-40%)" }} />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-center gap-4 pl-10 lg:pl-0">
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="" width={52} height={52} className="rounded-2xl ring-2 ring-white/20 flex-shrink-0 w-[52px] h-[52px] object-cover" />
            ) : (
              <div className="w-[52px] h-[52px] rounded-2xl bg-pink-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {firstName[0]}
              </div>
            )}
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">{greeting}, {firstName} 👋</h1>
              <p className="text-white/50 text-sm mt-0.5">{dateStr}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {username && (
              <button onClick={copy}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur">
                {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy booking link</>}
              </button>
            )}
            {username && (
              <a href={bookingUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur">
                <ExternalLink size={15} /> View page
              </a>
            )}
            <Link href="/dashboard/event-types"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#e53e6d" }}>
              <Plus size={15} /> New event type
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
