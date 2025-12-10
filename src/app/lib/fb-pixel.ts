// Client-side helpers to load Facebook Pixel and fire events
export function loadFacebookPixel(pixelId?: string) {
  if (typeof window === "undefined") return;
  if (!pixelId) return;
  const w: any = window as any;
  if (w.fbq) return; // already loaded

  !(function (f: any, b, e, v, n?, t?, s?) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(w, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

  try {
    w.fbq("init", pixelId);
    w.fbq("consent", "grant");
  } catch (e) {
    // ignore
  }
}

export function fbqTrack(eventName: string, params?: Record<string, any>) {
  if (typeof window === "undefined") return;
  const w: any = window as any;
  if (!w.fbq) return;
  try {
    w.fbq("track", eventName, params || {});
  } catch (e) {
    // ignore
  }
}

export function fbqConsentGrant() {
  if (typeof window === "undefined") return;
  const w: any = window as any;
  if (!w.fbq) return;
  try {
    w.fbq("consent", "grant");
  } catch (_) {
    // ignore
  }
}

export function fbqConsentRevoke() {
  if (typeof window === "undefined") return;
  const w: any = window as any;
  if (!w.fbq) return;
  try {
    w.fbq("consent", "revoke");
  } catch (_) {
    // ignore
  }
}

export default { loadFacebookPixel, fbqTrack, fbqConsentGrant, fbqConsentRevoke };
  