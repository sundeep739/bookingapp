"use client";
import Link from "next/link";
import { useState } from "react";
import {
  CalendarCheck, Clock, Bell, Users, BarChart2, Globe,
  CheckCircle, ArrowRight, Menu, X, Star, Zap,
  Building2, Scissors, Stethoscope, Briefcase, Mail,
} from "lucide-react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Use cases", href: "#use-cases" },
  { label: "Pricing", href: "#pricing" },
];

const FEATURES = [
  {
    icon: CalendarCheck,
    color: "#4F46E5",
    title: "Smart Booking Pages",
    desc: "Your personal booking link. Clients pick a time that works — no back-and-forth.",
  },
  {
    icon: Bell,
    color: "#f59e0b",
    title: "SMS & Email Reminders",
    desc: "Automatic reminders 24h and 1h before every appointment. No-shows cut by 40%.",
  },
  {
    icon: Users,
    color: "#3b82f6",
    title: "Teams & Organizations",
    desc: "One page for your whole clinic or shop. Clients choose their preferred staff member.",
  },
  {
    icon: Globe,
    color: "#10b981",
    title: "Google Calendar Sync",
    desc: "Every booking auto-creates a Google Calendar event. Never double-book again.",
  },
  {
    icon: BarChart2,
    color: "#8b5cf6",
    title: "Real-time Analytics",
    desc: "See your busiest days, peak times, and booking trends at a glance.",
  },
  {
    icon: Clock,
    color: "#ec4899",
    title: "Waiting Lists",
    desc: "Fully booked? Clients join the waitlist and get instant notification when a slot opens.",
  },
];

const STEPS = [
  { n: "01", title: "Create your account", desc: "Sign up with Google in seconds. No credit card needed." },
  { n: "02", title: "Set your availability", desc: "Tell us when you work. Block off lunch, holidays, anything." },
  { n: "03", title: "Share your booking link", desc: "Send /yourname to clients. They pick a time, you get notified." },
  { n: "04", title: "Relax", desc: "Reminders go out automatically. Google Calendar stays in sync." },
];

const USE_CASES = [
  {
    icon: Stethoscope,
    color: "#3b82f6",
    bg: "#eff6ff",
    title: "Clinics & Hospitals",
    desc: "Patients book appointments with specific doctors. Departments organised by specialty. No more phone queues.",
    features: ["Multiple doctors", "Departments", "Patient notes", "SMS reminders"],
  },
  {
    icon: Scissors,
    color: "#4F46E5",
    bg: "#EEF2FF",
    title: "Barber Shops & Salons",
    desc: "Clients pick their favourite stylist and service. See all staff availability on one page.",
    features: ["Staff profiles", "Service catalog", "Walk-in waitlist", "No-show protection"],
  },
  {
    icon: Briefcase,
    color: "#8b5cf6",
    bg: "#f5f3ff",
    title: "Consultants & Coaches",
    desc: "Share a single link with all your clients. Automated reminders so you never get stood up.",
    features: ["Custom meeting types", "Google Meet links", "Analytics", "Team scheduling"],
  },
  {
    icon: Building2,
    color: "#10b981",
    bg: "#ecfdf5",
    title: "Any Service Business",
    desc: "Tutors, personal trainers, accountants, photographers — if clients book time with you, BookEasy fits.",
    features: ["Unlimited bookings", "Mobile friendly", "Email confirmations", "Cancel & reschedule"],
  },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Perfect to get started",
    color: "#6b7280",
    features: ["1 user", "Unlimited bookings", "Email confirmations", "Google Calendar sync", "Booking page"],
    cta: "Get Started Free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "per month",
    desc: "For busy professionals",
    color: "#4F46E5",
    features: ["1 user", "Everything in Free", "SMS reminders", "Analytics dashboard", "Waiting list", "Custom availability"],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Team",
    price: "$49",
    period: "per month",
    desc: "For clinics & shops",
    color: "#3b82f6",
    features: ["Up to 10 staff", "Everything in Pro", "Team booking page", "Departments", "Admin dashboard", "Staff analytics"],
    cta: "Try Team Free",
    highlight: false,
  },
  {
    name: "Business",
    price: "$149",
    period: "per month",
    desc: "For large organisations",
    color: "#8b5cf6",
    features: ["Unlimited staff", "Everything in Team", "White-label domain", "Priority support", "API access", "Custom integrations"],
    cta: "Contact Sales",
    highlight: false,
  },
];

const TESTIMONIALS = [
  {
    name: "Dr. Sarah Patel",
    role: "GP, City Medical Centre",
    avatar: "S",
    color: "#3b82f6",
    text: "Our receptionists used to spend 3 hours a day booking appointments by phone. Now patients book themselves and we get instant notifications. Absolutely transformed our practice.",
  },
  {
    name: "Marcus Johnson",
    role: "Owner, Cuts & Style Barbershop",
    avatar: "M",
    color: "#4F46E5",
    text: "Went from a paper diary to a full digital booking system in one afternoon. No-shows dropped to almost zero since we started sending SMS reminders.",
  },
  {
    name: "Emma Clarke",
    role: "Business Coach",
    avatar: "E",
    color: "#10b981",
    text: "I send one link. My clients book their sessions. I get a Google Calendar event. That's it. Couldn't be simpler.",
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#4F46E5" }}>
              <CalendarCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">BookEasy</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{l.label}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-2">Sign in</Link>
            <Link href="/login"
              className="text-sm font-semibold text-white px-4 py-2 rounded-xl transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#4F46E5" }}>
              Get Started Free
            </Link>
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} onClick={() => setMobileMenuOpen(false)}
                className="block text-sm text-gray-600 hover:text-gray-900 py-2">{l.label}</a>
            ))}
            <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
              <Link href="/login" className="text-sm text-gray-600 font-medium py-2">Sign in</Link>
              <Link href="/login"
                className="text-sm font-semibold text-white px-4 py-2.5 rounded-xl text-center"
                style={{ backgroundColor: "#4F46E5" }}>
                Get Started Free
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)" }}>
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #4F46E5, transparent)", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent)", transform: "translate(-30%, 30%)" }} />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 border border-white/20 text-white/80">
            <Zap size={12} className="text-yellow-400" />
            The smart booking platform for every business
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
            Online bookings for<br />
            <span style={{ color: "#4F46E5" }}>clinics, shops & pros</span>
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            Let clients book appointments 24/7. Works for solo professionals, barber shops, medical clinics, and any team-based business. Setup takes 5 minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link href="/login"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-white font-semibold text-base hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#4F46E5" }}>
              Start for free <ArrowRight size={18} />
            </Link>
            <a href="#how-it-works"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm border border-white/20 text-white/80 hover:bg-white/10 transition-colors">
              See how it works
            </a>
          </div>

          <p className="text-white/40 text-xs mt-5">No credit card required · Free forever plan · Setup in 5 minutes</p>

          {/* Fake dashboard preview */}
          <div className="mt-16 max-w-3xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-1 backdrop-blur">
            <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
              <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-100 border-b border-gray-200">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <div className="flex-1 mx-4 bg-white rounded px-3 py-1 text-xs text-gray-400">bookingapp.com/dr-sarah</div>
              </div>
              <div className="p-6 grid grid-cols-3 gap-4 text-left">
                <div className="col-span-3 sm:col-span-1">
                  <div className="w-14 h-14 rounded-2xl mb-3 flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: "#3b82f6" }}>S</div>
                  <p className="font-bold text-gray-900">Dr. Sarah Patel</p>
                  <p className="text-xs text-gray-400 mt-0.5">General Practitioner</p>
                  <div className="mt-3 space-y-2">
                    {["General Checkup · 30 min", "Follow-up · 15 min", "Consultation · 45 min"].map((s) => (
                      <div key={s} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 text-xs text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />{s}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-span-3 sm:col-span-2 grid grid-cols-7 gap-1">
                  {["M","T","W","T","F","S","S"].map((d, i) => (
                    <div key={i} className="text-center text-xs font-semibold text-gray-400 pb-1">{d}</div>
                  ))}
                  {Array.from({ length: 35 }, (_, i) => {
                    const day = i - 1;
                    const hasSlots = [2,3,5,8,9,12,15,16,19,22,23].includes(day);
                    const selected = day === 8;
                    return (
                      <div key={i} className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium ${
                        day < 1 ? "" :
                        selected ? "text-white" :
                        hasSlots ? "bg-blue-50 text-blue-600 cursor-pointer hover:bg-blue-100" :
                        "text-gray-200"
                      }`} style={selected ? { backgroundColor: "#3b82f6" } : {}}>
                        {day >= 1 ? day : ""}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social proof bar ─────────────────────────────────────────── */}
      <div className="border-y border-gray-100 bg-gray-50 py-5">
        <div className="max-w-4xl mx-auto px-4 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
          {[
            { value: "50,000+", label: "businesses" },
            { value: "2M+", label: "bookings made" },
            { value: "40%", label: "fewer no-shows" },
            { value: "5 min", label: "average setup time" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="py-20 md:py-28 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Everything you need to run bookings</h2>
          <p className="text-gray-500 max-w-xl mx-auto">From solo professionals to 50-person clinics — BookEasy scales with your business.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: f.color + "20" }}>
                <f.icon size={22} style={{ color: f.color }} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1.5">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 md:py-28" style={{ backgroundColor: "#F5F3FF" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Up and running in minutes</h2>
            <p className="text-gray-500">No technical skills needed. If you can use Gmail, you can use BookEasy.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-gray-200 z-0" style={{ width: "calc(100% - 24px)", left: "calc(50% + 24px)" }} />
                )}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 relative z-10 h-full">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold mb-4" style={{ backgroundColor: "#4F46E5" }}>
                    {s.n}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1.5">{s.title}</h3>
                  <p className="text-sm text-gray-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ────────────────────────────────────────────────── */}
      <section id="use-cases" className="py-20 md:py-28 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Built for your business</h2>
          <p className="text-gray-500">One platform, every type of appointment-based business.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {USE_CASES.map((u) => (
            <div key={u.title} className="rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: u.bg }}>
                  <u.icon size={24} style={{ color: u.color }} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{u.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{u.desc}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {u.features.map((feat) => (
                  <span key={feat} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: u.bg, color: u.color }}>
                    <CheckCircle size={11} />{feat}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section className="py-20 md:py-28" style={{ backgroundColor: "#F5F3FF" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <div className="flex justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => <Star key={i} size={20} className="text-yellow-400 fill-yellow-400" />)}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Loved by businesses everywhere</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0" style={{ backgroundColor: t.color }}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 md:py-28 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-500">Start free. Upgrade when you're ready. No hidden fees.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map((plan) => (
            <div key={plan.name}
              className={`rounded-2xl p-6 border-2 relative flex flex-col ${plan.highlight ? "shadow-xl" : "border-gray-100 bg-white"}`}
              style={plan.highlight ? { borderColor: plan.color, backgroundColor: "#fff" } : {}}>
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap" style={{ backgroundColor: plan.color }}>
                  Most Popular
                </div>
              )}
              <div className="mb-5">
                <p className="font-bold text-gray-900 text-lg">{plan.name}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-sm text-gray-400">/{plan.period}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{plan.desc}</p>
              </div>
              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle size={15} className="flex-shrink-0 mt-0.5" style={{ color: plan.color }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/login"
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-opacity hover:opacity-90 block"
                style={plan.highlight
                  ? { backgroundColor: plan.color, color: "white" }
                  : { backgroundColor: "#f4f6fb", color: "#374151" }}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-400 mt-8">All plans include a 14-day free trial of Pro features. No credit card required.</p>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28" style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-5">
            Ready to stop losing bookings?
          </h2>
          <p className="text-white/60 mb-8 text-lg">
            Join thousands of businesses who save hours every week with BookEasy.
          </p>
          <Link href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-semibold text-base hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#4F46E5" }}>
            Create your free account <ArrowRight size={18} />
          </Link>
          <p className="text-white/30 text-sm mt-4">Free forever · No credit card · 5-minute setup</p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#4F46E5" }}>
              <CalendarCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">BookEasy</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <a href="mailto:support@bookeasy.app" className="hover:text-white transition-colors">Contact</a>
          </div>
          <p className="text-sm">© 2026 BookEasy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
