"use client";
import { Bell } from "lucide-react";
import { useSession } from "next-auth/react";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export default function TopBar({ title, subtitle }: TopBarProps) {
  const { data: session } = useSession();

  return (
    <header className="bg-white border-b border-gray-100 px-4 md:px-8 py-4 flex items-center justify-between">
      {/* On mobile, shift title right to clear the hamburger button */}
      <div className="pl-10 lg:pl-0">
        <h1 className="text-lg md:text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-xs md:text-sm text-gray-500 mt-0.5 hidden sm:block">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <button className="relative p-2 rounded-xl hover:bg-gray-50 transition-colors">
          <Bell size={20} className="text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full" />
        </button>
        {session?.user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.user.image} alt="Profile" width={36} height={36} className="rounded-full w-9 h-9 object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {session?.user?.name?.[0] ?? "U"}
          </div>
        )}
      </div>
    </header>
  );
}
