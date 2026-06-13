"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Calendar, Clock, Users, BarChart2,
  Settings, LogOut, CalendarCheck, Sliders, ChevronRight,
  ExternalLink, Menu, X,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard",    href: "/dashboard" },
  { icon: CalendarCheck,   label: "Event Types",  href: "/dashboard/event-types" },
  { icon: Calendar,        label: "Bookings",     href: "/dashboard/bookings" },
  { icon: Clock,           label: "Availability", href: "/dashboard/availability" },
  { icon: Users,           label: "Teams",        href: "/dashboard/team" },
  { icon: BarChart2,       label: "Analytics",    href: "/dashboard/analytics" },
  { icon: Sliders,         label: "Integrations", href: "/dashboard/integrations" },
  { icon: Settings,        label: "Settings",     href: "/dashboard/settings" },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/profile").then((r) => r.json()).then((d) => setUsername(d.username ?? null));
  }, []);

  return (
    <aside className="w-64 h-full flex flex-col" style={{ backgroundColor: "#1E1B4B" }}>
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#4F46E5" }}>
            <CalendarCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">BookEasy</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors lg:hidden">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? "text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              style={isActive ? { backgroundColor: "#4F46E5" } : {}}>
              <Icon size={18} className="flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight size={14} className="opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 pb-6">
        <div className="border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="Profile" width={36} height={36} className="rounded-full flex-shrink-0 w-9 h-9 object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {session?.user?.name?.[0] ?? "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{session?.user?.name ?? "User"}</p>
              <p className="text-gray-400 text-xs truncate">{session?.user?.email ?? ""}</p>
            </div>
          </div>
          {username && (
            <a href={`/${username}`} target="_blank" onClick={onClose}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-gray-500 hover:text-white hover:bg-white/5 transition-all mt-1">
              <ExternalLink size={14} />
              <span className="truncate">/{username}</span>
            </a>
          )}
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all mt-1">
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-40 lg:hidden bg-white rounded-xl shadow-md p-2.5 border border-gray-100"
      >
        <Menu size={20} className="text-gray-700" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:hidden ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </div>

      {/* Desktop sidebar (always visible) */}
      <div className="hidden lg:flex w-64 min-h-screen flex-shrink-0">
        <SidebarContent />
      </div>
    </>
  );
}
