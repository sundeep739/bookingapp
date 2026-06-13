"use client";
import { useEffect, useState } from "react";
import { Code2, Copy, Check, ExternalLink, Loader2 } from "lucide-react";

export default function EmbedPanel() {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/user/profile").then((r) => r.json()).then((d) => setUsername(d.username ?? null)).finally(() => setLoading(false));
  }, []);

  const bookingUrl = username ? `${origin}/${username}` : "";

  const inlineSnippet =
`<!-- BookEasy inline embed -->
<div data-bookeasy-inline data-url="${bookingUrl}" data-height="720"></div>
<script src="${origin}/embed.js" async></script>`;

  const popupSnippet =
`<!-- BookEasy popup button -->
<button data-bookeasy-popup data-url="${bookingUrl}"
  style="background:#4F46E5;color:#fff;border:0;border-radius:10px;padding:12px 20px;font-weight:600;cursor:pointer">
  Book a time
</button>
<script src="${origin}/embed.js" async></script>`;

  const linkSnippet = bookingUrl;

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>;
  }

  if (!username) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <p className="text-sm text-gray-500">Set up your booking link first to get embed code.</p>
      </div>
    );
  }

  const Block = ({ id, title, desc, code }: { id: string; title: string; desc: string; code: string }) => (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
        </div>
        <button onClick={() => copy(id, code)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0">
          {copied === id ? <><Check size={13} className="text-green-500" /> Copied</> : <><Copy size={13} /> Copy</>}
        </button>
      </div>
      <pre className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-all">{code}</pre>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Code2 size={18} className="text-indigo-500" />
        <h2 className="text-base font-semibold text-gray-900">Embed on your website</h2>
      </div>
      <p className="text-sm text-gray-500 -mt-2">
        Add your booking page directly to your own site. Paste a snippet into your HTML — works on any platform
        (Webflow, WordPress, Squarespace, plain HTML).
      </p>

      <Block id="inline" title="Inline embed" desc="Shows the booking calendar directly on your page." code={inlineSnippet} />
      <Block id="popup" title="Popup button" desc="A button that opens booking in an overlay." code={popupSnippet} />
      <Block id="link" title="Direct link" desc="Share anywhere — email, bio, social." code={linkSnippet} />

      <a href={bookingUrl} target="_blank" rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700">
        <ExternalLink size={14} /> Preview your booking page
      </a>
    </div>
  );
}
