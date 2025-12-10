import { warn } from "console";
import { loadFacebookPixel, fbqTrack } from "./fb-pixel";

const PIXEL_ID = typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_FB_PIXEL_ID as string) : undefined;

export function initTracking() {
  try {
    if (PIXEL_ID) loadFacebookPixel(PIXEL_ID);
  } catch (e) {
    // ignore
  }
}

export async function trackEventClientAndServer(eventName: string, payload: Record<string, any> = {}) {
  try {
    if (typeof window !== "undefined") {
      // fire client-side pixel (best-effort)
      fbqTrack(eventName, payload.custom_data || {});
    }

    // fire server-side CAPI via our API route (best-effort)
    try {
      const res = await fetch("/api/fb-capi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_source_url: typeof window !== "undefined" ? window.location.href : undefined,
          action_source: "website",
          user_data: payload.user_data || undefined,
          custom_data: payload.custom_data || undefined,
        }),
      });

      // read response body safely
      let serverBody: any = null;
      try {
        const ct = res.headers.get("content-type") || "";
        serverBody = ct.includes("application/json") ? await res.json() : { text: await res.text() };
      } catch (err) {
        serverBody = { error: String(err) };
      }

      // Dispatch a global event so UI can react to tracking results
      try {
        if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
          const detail = { eventName, ok: res.ok, status: res.status, body: serverBody };
          window.dispatchEvent(new CustomEvent("tracking:event", { detail }));
        }
      } catch (err) {
        // ignore
      }

      return { ok: res.ok, status: res.status, body: serverBody };
    } catch (e) {
      // ignore network errors but notify UI
      try {
        if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
          window.dispatchEvent(new CustomEvent("tracking:event", { detail: { eventName, ok: false, status: 0, body: { error: String(e) } } }));
        }
      } catch (_) {}
      // rethrow so callers may handle if needed
      return { ok: false, status: 0, body: { error: String(e) } };
    }
  } catch (e) {
    // swallow errors
          console.warn("tracking: failed to send event to server", e);

  }
}

export async function trackAddToCart(product: any, qty = 1) {
  const priceValue = Number(String(product.price).replace(/[^0-9.]/g, "")) || 0;
  const value = priceValue * qty;

  const payload = {
    custom_data: {
      content_ids: [String(product.id)],
      content_name: product.name,
      contents: [{ id: String(product.id), quantity: qty, item_price: priceValue }],
      value,
      currency: "AED",
    },
  };

  await trackEventClientAndServer("AddToCart", payload);
}

export async function trackPurchase(order: any) {
  const payload = {
    user_data: order.user_data || undefined,
    custom_data: {
      value: order.total,
      currency: order.currency || "AED",
      contents: order.items?.map((i: any) => ({ id: String(i.id), quantity: i.qty, item_price: Number(String(i.price).replace(/[^0-9.]/g, "")) })) || [],
    },
  };
  await trackEventClientAndServer("Purchase", payload);
}

export default { initTracking, trackAddToCart, trackPurchase };
