"use client";
import { useState } from "react";
import { CheckCircle, ExternalLink } from "lucide-react";

const integrations = [
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sync bookings and check availability against your Google Calendar.",
    category: "Calendar",
    connected: true,
    logo: "🗓️",
    color: "#4285F4",
  },
  {
    id: "google-meet",
    name: "Google Meet",
    description: "Auto-generate Google Meet links for every new booking.",
    category: "Video",
    connected: true,
    logo: "📹",
    color: "#00AC47",
  },
  {
    id: "zoom",
    name: "Zoom",
    description: "Create Zoom meetings automatically when someone books with you.",
    category: "Video",
    connected: false,
    logo: "🔵",
    color: "#2D8CFF",
  },
  {
    id: "outlook",
    name: "Outlook Calendar",
    description: "Connect your Microsoft Outlook calendar to prevent double-bookings.",
    category: "Calendar",
    connected: false,
    logo: "📅",
    color: "#0078D4",
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Accept payments for your paid event types via Stripe.",
    category: "Payments",
    connected: false,
    logo: "💳",
    color: "#635BFF",
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Connect BookEasy to 5,000+ apps with Zapier automations.",
    category: "Automation",
    connected: false,
    logo: "⚡",
    color: "#FF4A00",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Get Slack notifications when someone books, cancels, or reschedules.",
    category: "Notifications",
    connected: false,
    logo: "💬",
    color: "#4A154B",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync booking data to HubSpot CRM contacts and deals.",
    category: "CRM",
    connected: false,
    logo: "🧡",
    color: "#FF7A59",
  },
];

const categories = ["All", "Calendar", "Video", "Payments", "Automation", "Notifications", "CRM"];

export default function IntegrationsPanel() {
  const [connectedMap, setConnectedMap] = useState<Record<string, boolean>>(
    Object.fromEntries(integrations.map((i) => [i.id, i.connected]))
  );
  const [activeCategory, setActiveCategory] = useState("All");

  const toggle = (id: string) =>
    setConnectedMap((prev) => ({ ...prev, [id]: !prev[id] }));

  const filtered = integrations.filter(
    (i) => activeCategory === "All" || i.category === activeCategory
  );

  const connectedCount = Object.values(connectedMap).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Connected Integrations</p>
          <p className="text-2xl font-bold text-gray-900">{connectedCount} / {integrations.length}</p>
        </div>
        <div className="flex gap-2">
          {[...Array(integrations.length)].map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${i < connectedCount ? "" : "bg-gray-200"}`}
              style={i < connectedCount ? { backgroundColor: "#10b981" } : {}}
            />
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeCategory === c
                ? "text-white shadow-sm"
                : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
            }`}
            style={activeCategory === c ? { backgroundColor: "#e53e6d" } : {}}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((integration) => {
          const isConnected = connectedMap[integration.id];
          return (
            <div
              key={integration.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: integration.color + "15" }}
                  >
                    {integration.logo}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{integration.name}</h3>
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{integration.category}</span>
                  </div>
                </div>
                {isConnected && <CheckCircle size={18} className="text-green-500 flex-shrink-0 mt-1" />}
              </div>
              <p className="text-sm text-gray-500 mb-5 leading-relaxed">{integration.description}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggle(integration.id)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isConnected
                      ? "bg-red-50 text-red-600 hover:bg-red-100"
                      : "text-white hover:opacity-90"
                  }`}
                  style={!isConnected ? { backgroundColor: "#e53e6d" } : {}}
                >
                  {isConnected ? "Disconnect" : "Connect"}
                </button>
                <button className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                  <ExternalLink size={15} className="text-gray-400" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
