import { NextResponse } from "next/server";
import crypto from "crypto";

type Body = {
  event_name: string;
  event_time?: number;
  event_source_url?: string;
  action_source?: string;
  user_data?: Record<string, any>;
  custom_data?: Record<string, any>;
};

function sha256(str: string) {
  return crypto
    .createHash("sha256")
    .update(String(str || "").trim().toLowerCase())
    .digest("hex");
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    body = {
      event_name: "CustomEvent",
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: "",
      action_source: "website",
      user_data: {},
      custom_data: {}
    };
  }

  const PIXEL_ID = process.env.FB_PIXEL_ID;
  const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
  const TEST_EVENT_CODE = process.env.FB_TEST_EVENT_CODE;

  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "Missing FB_PIXEL_ID or FB_ACCESS_TOKEN env vars" },
      { status: 400 }
    );
  }

  
  const userData: Record<string, any> | undefined = body.user_data
    ? Object.fromEntries(
        Object.entries(body.user_data)
          .map(([k, v]) => {
            const key = k.toLowerCase();
            if (!v) return null;
            if (key === "phone")
              return ["ph", sha256(String(v).replace(/\D/g, ""))];
            if (key === "first_name") return ["fn", sha256(String(v))];
            if (key === "last_name") return ["ln", sha256(String(v))];
            return [key, sha256(String(v))];
          })
          .filter((entry): entry is [string, string] => entry !== null) 
      )
    : undefined;

  const eventBody: any = {
    data: [
      {
        event_name: body.event_name || "CustomEvent",
        event_time: body.event_time || Math.floor(Date.now() / 1000),
        event_source_url: body.event_source_url,
        action_source: body.action_source || "website",
        user_data: userData,
        custom_data: body.custom_data
      }
    ]
  };

  if (TEST_EVENT_CODE) eventBody.test_event_code = TEST_EVENT_CODE;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v17.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventBody)
      }
    );

    const contentType = res.headers.get("content-type") || "";
    let json: any = null;
    if (contentType.includes("application/json")) {
      json = await res.json();
    } else {
      json = { text: await res.text() };
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: res.status,
          statusText: res.statusText,
          body: json
        },
        { status: res.status }
      );
    }

    return NextResponse.json({ ok: true, body: json }, { status: 200 });
  } catch (e: any) {
    
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}