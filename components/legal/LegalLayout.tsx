import Link from "next/link";
import { CalendarCheck } from "lucide-react";

export default function LegalLayout({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#4F46E5" }}>
              <CalendarCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">BookEasy</span>
          </Link>
          <Link href="/login" className="text-sm font-medium text-indigo-600 hover:underline">Sign in</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-400 mt-2 mb-8">Last updated: {updated}</p>
        <div className="prose-sm space-y-5 text-gray-600 leading-relaxed [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mt-8 [&_h2]:mb-2 [&_a]:text-indigo-600 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          {children}
        </div>
        <div className="mt-12 pt-6 border-t border-gray-100 flex gap-6 text-sm">
          <Link href="/terms" className="text-gray-500 hover:text-gray-900">Terms</Link>
          <Link href="/privacy" className="text-gray-500 hover:text-gray-900">Privacy</Link>
          <Link href="/" className="text-gray-500 hover:text-gray-900">Home</Link>
        </div>
      </main>
    </div>
  );
}
