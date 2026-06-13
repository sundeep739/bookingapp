/*
 * BookEasy embed widget.
 *
 * Inline:
 *   <div data-bookeasy-inline data-url="https://bookeasy.app/yourname"></div>
 *   <script src="https://bookeasy.app/embed.js" async></script>
 *
 * Popup (opens in an overlay when the element is clicked):
 *   <button data-bookeasy-popup data-url="https://bookeasy.app/yourname">Book a time</button>
 *   <script src="https://bookeasy.app/embed.js" async></script>
 *
 * Optional attributes: data-height (inline, default 720).
 */
(function () {
  function withEmbedFlag(url) {
    try {
      var u = new URL(url, window.location.href);
      u.searchParams.set("embed", "1");
      return u.toString();
    } catch (e) {
      return url + (url.indexOf("?") === -1 ? "?" : "&") + "embed=1";
    }
  }

  function originOf(url) {
    try { return new URL(url, window.location.href).origin; } catch (e) { return null; }
  }

  function makeIframe(url) {
    var iframe = document.createElement("iframe");
    iframe.src = withEmbedFlag(url);
    iframe.style.width = "100%";
    iframe.style.border = "0";
    iframe.style.background = "transparent";
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("allow", "payment");
    iframe.setAttribute("title", "Booking");
    return iframe;
  }

  // ── Inline embeds ─────────────────────────────────────────────────────────
  var inlineFrames = []; // { iframe, origin }
  function renderInline(el) {
    var url = el.getAttribute("data-url");
    if (!url || el.getAttribute("data-bookeasy-ready")) return;
    el.setAttribute("data-bookeasy-ready", "1");
    var iframe = makeIframe(url);
    iframe.style.height = (el.getAttribute("data-height") || "720") + "px";
    iframe.style.transition = "height 0.2s ease";
    el.appendChild(iframe);
    inlineFrames.push({ iframe: iframe, origin: originOf(url) });
  }

  // ── Popup embeds ──────────────────────────────────────────────────────────
  function openPopup(url) {
    var overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;background:rgba(15,12,40,.55);" +
      "display:flex;align-items:center;justify-content:center;padding:16px;";

    var frameWrap = document.createElement("div");
    frameWrap.style.cssText =
      "position:relative;width:100%;max-width:760px;height:90vh;background:#f4f6fb;" +
      "border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3);";

    var close = document.createElement("button");
    close.setAttribute("aria-label", "Close");
    close.innerHTML = "&times;";
    close.style.cssText =
      "position:absolute;top:10px;right:12px;z-index:2;width:32px;height:32px;border:0;" +
      "border-radius:8px;background:rgba(255,255,255,.9);font-size:20px;line-height:1;" +
      "cursor:pointer;color:#374151;";

    var iframe = makeIframe(url);
    iframe.style.height = "100%";

    function remove() {
      document.removeEventListener("keydown", onKey);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
    function onKey(e) { if (e.key === "Escape") remove(); }

    close.addEventListener("click", remove);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) remove(); });
    document.addEventListener("keydown", onKey);

    frameWrap.appendChild(close);
    frameWrap.appendChild(iframe);
    overlay.appendChild(frameWrap);
    document.body.appendChild(overlay);
  }

  function wirePopup(el) {
    if (el.getAttribute("data-bookeasy-ready")) return;
    el.setAttribute("data-bookeasy-ready", "1");
    el.addEventListener("click", function (e) {
      e.preventDefault();
      var url = el.getAttribute("data-url");
      if (url) openPopup(url);
    });
  }

  function scan() {
    var inlines = document.querySelectorAll("[data-bookeasy-inline]");
    for (var i = 0; i < inlines.length; i++) renderInline(inlines[i]);
    var popups = document.querySelectorAll("[data-bookeasy-popup]");
    for (var j = 0; j < popups.length; j++) wirePopup(popups[j]);
  }

  // Auto-resize inline iframes from height messages posted by the booking page.
  window.addEventListener("message", function (e) {
    if (!e.data || e.data.type !== "bookeasy:height") return;
    for (var i = 0; i < inlineFrames.length; i++) {
      var f = inlineFrames[i];
      if (f.iframe.contentWindow === e.source && (!f.origin || f.origin === e.origin)) {
        f.iframe.style.height = Math.max(360, e.data.height) + "px";
      }
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan);
  } else {
    scan();
  }
  // Re-scan for elements added after load (SPAs).
  if (window.MutationObserver) {
    new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
