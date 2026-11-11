// testflight-signup: records Apple TestFlight waitlist signups from xenonrift.com/#play.
//
//   POST { email, platforms: ("iphone" | "ipad" | "apple_tv" | "mac")[], company?: "" }
//     -> 200 { ok: true, platforms }
//     -> 400 { error } when email or device list is invalid
//     -> 429 { error } when IP rate limit is exceeded
//
// Primary storage is Postgres (`private.testflight_signups` via service_role RPC `record_testflight_signup`).
// When `RESEND_API_KEY` is configured, the function also syncs the address into Resend Contacts (with optional
// `RESEND_SEGMENT_ID`) and, if `RESEND_FROM_EMAIL` is set and this is the email's first signup, sends a single
// confirmation email. Resend failures are logged and never fail a committed database signup.

const env = (name: string) => Deno.env.get(name);

export const VALID_PLATFORMS = ["iphone", "ipad", "apple_tv", "mac"] as const;
export type Platform = (typeof VALID_PLATFORMS)[number];

const PLATFORM_LABELS: Record<Platform, string> = {
  iphone: "iPhone",
  ipad: "iPad",
  apple_tv: "Apple TV",
  mac: "Mac",
};

const ALLOWED_ORIGINS = [
  /^https:\/\/xenonrift\.com$/,
  /^https:\/\/www\.xenonrift\.com$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
];

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  if (!ALLOWED_ORIGINS.some((pattern) => pattern.test(origin))) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function json(request: Request, status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(request) },
  });
}

function keyHeaders(key: string): Record<string, string> {
  const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  if (!key.startsWith("sb_")) headers.Authorization = `Bearer ${key}`;
  return headers;
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254) return null;
  if (/[<>\s\x00-\x1f\x7f]/.test(email)) return null;
  if (!/^[^@]+@[^@]+\.[^@]{2,}$/.test(email)) return null;
  return email;
}

export function normalizePlatforms(value: unknown): Platform[] {
  if (!Array.isArray(value)) return [];
  const chosen = new Set<string>();
  for (const item of value) {
    if (typeof item === "string") chosen.add(item.trim().toLowerCase());
  }
  return VALID_PLATFORMS.filter((platform) => chosen.has(platform));
}

export function formatPlatformList(platforms: Platform[]): string {
  const labels = platforms.map((p) => PLATFORM_LABELS[p]);
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] ?? ch
  ));
}

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

export async function sha256Hex(text: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))));
}

function clientIp(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "0.0.0.0";
}

async function rpc(name: string, args: Record<string, unknown>): Promise<Response> {
  return await fetch(`${env("SUPABASE_URL")}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: keyHeaders(env("SUPABASE_SERVICE_ROLE_KEY")!),
    body: JSON.stringify(args),
  });
}

async function syncResendContact(apiKey: string, email: string, segmentId?: string): Promise<string | null> {
  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  const payload: Record<string, unknown> = { email, unsubscribed: false };
  if (segmentId) payload.segments = [{ id: segmentId }];

  const createReply = await fetch("https://api.resend.com/contacts", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000),
  });

  if (createReply.ok) {
    const data = await createReply.json().catch(() => ({})) as { id?: string };
    return data.id ?? null;
  }

  // Contact already exists in Resend: ensure they are marked subscribed and attached to any configured segment.
  if (createReply.status === 409 || createReply.status === 422) {
    const updateReply = await fetch(`https://api.resend.com/contacts/${encodeURIComponent(email)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ unsubscribed: false }),
      signal: AbortSignal.timeout(5000),
    });
    if (segmentId) {
      await fetch(
        `https://api.resend.com/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(segmentId)}`,
        { method: "POST", headers, signal: AbortSignal.timeout(5000) },
      ).catch(() => {});
    }
    if (updateReply.ok) {
      const data = await updateReply.json().catch(() => ({})) as { id?: string };
      return data.id ?? null;
    }
  } else {
    console.error(`testflight-signup resend contact: ${createReply.status} ${await createReply.text()}`);
  }
  return null;
}

export function buildConfirmationEmail(email: string, platforms: Platform[]): { subject: string; text: string; html: string } {
  const devices = formatPlatformList(platforms);
  const safeEmail = escapeHtml(email);
  const safeDevices = escapeHtml(devices);
  const tvNote = platforms.includes("apple_tv")
    ? " Apple TV gameplay requires a compatible controller to fly (the Siri Remote navigates menus)."
    : "";

  const subject = "You're on the Xenon Rift TestFlight list";
  const text = [
    "XENON RIFT // TESTFLIGHT WAITLIST",
    "",
    `We recorded ${email} for Xenon Rift TestFlight playtest waves (${devices}).`,
    "",
    `Invites go out in waves as testing slots open for your hardware; joining the list does not guarantee immediate access.${tvNote}`,
    "",
    "When a slot opens, your invite email will come directly from Apple TestFlight.",
    "",
    "Didn't request this or want off the list? Reply to this email or write support@codersbrew.com.",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:24px 12px;background:#070a10;color:#f1f5fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;margin:0 auto;background:#0d121c;border:1px solid rgba(170,193,220,0.22);">
    <tr>
      <td style="padding:28px 28px 24px;">
        <p style="margin:0 0 12px;color:#66f4ed;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">XENON RIFT · TESTFLIGHT WAITLIST</p>
        <h1 style="margin:0 0 16px;color:#f1f5fa;font-size:24px;line-height:32px;">You’re on the TestFlight list.</h1>
        <p style="margin:0 0 16px;color:#c2cddd;font-size:15px;line-height:24px;">We recorded <strong style="color:#f1f5fa;">${safeEmail}</strong> for upcoming Xenon Rift playtest waves on <strong style="color:#f1f5fa;">${safeDevices}</strong>.</p>
        <p style="margin:0 0 16px;color:#a2b0c4;font-size:14px;line-height:22px;">We send invites in waves as testing slots open; joining the list does not guarantee immediate access.${escapeHtml(tvNote)} When your slot opens, the invitation arrives directly from Apple TestFlight.</p>
        <p style="margin:20px 0 0;padding-top:16px;border-top:1px solid rgba(170,193,220,0.18);color:#a2b0c4;font-size:12px;line-height:19px;">If you didn’t sign up or want to leave the list, reply to this email or contact <a href="mailto:support@codersbrew.com" style="color:#66f4ed;">support@codersbrew.com</a>.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

async function sendResendConfirmation(
  apiKey: string,
  from: string,
  replyTo: string,
  email: string,
  platforms: Platform[],
): Promise<boolean> {
  const message = buildConfirmationEmail(email, platforms);
  const reply = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      reply_to: replyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!reply.ok) {
    console.error(`testflight-signup resend email: ${reply.status} ${await reply.text()}`);
    return false;
  }
  return true;
}

export async function handleSignup(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, 405, { error: "POST only" });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json(request, 400, { error: "Expected a JSON body." });
  }

  // Hidden honeypot field: pretend to succeed without writing or emailing.
  if (typeof body.company === "string" && body.company.trim().length > 0) {
    return json(request, 200, { ok: true, platforms: ["iphone"] });
  }

  const email = normalizeEmail(body.email);
  if (!email) return json(request, 400, { error: "Enter a valid email address." });

  const platforms = normalizePlatforms(body.platforms);
  if (platforms.length === 0) return json(request, 400, { error: "Choose at least one Apple device." });

  const ipHash = await sha256Hex(`testflight-v1:${clientIp(request)}`);
  const reply = await rpc("record_testflight_signup", {
    p_email: email,
    p_platforms: platforms,
    p_ip_hash: ipHash,
  });

  if (!reply.ok) {
    console.error(`testflight-signup rpc: ${reply.status} ${await reply.text()}`);
    return json(request, 500, { error: "The signup service is having trouble. Try again soon, or email support@codersbrew.com." });
  }

  const recorded = await reply.json() as { rate_limited?: boolean; send_confirmation?: boolean };
  if (recorded.rate_limited) {
    return json(request, 429, { error: "Too many signup requests from this connection. Wait a bit and try again." });
  }

  const resendKey = env("RESEND_API_KEY")?.trim();
  if (resendKey) {
    let contactId: string | null = null;
    let confirmationSent = false;
    try {
      contactId = await syncResendContact(resendKey, email, env("RESEND_SEGMENT_ID")?.trim() || undefined);
    } catch (error) {
      console.error(`testflight-signup resend contact failed: ${error}`);
    }
    const fromEmail = env("RESEND_FROM_EMAIL")?.trim();
    if (recorded.send_confirmation && fromEmail) {
      try {
        confirmationSent = await sendResendConfirmation(
          resendKey,
          fromEmail,
          env("RESEND_REPLY_TO")?.trim() || "support@codersbrew.com",
          email,
          platforms,
        );
      } catch (error) {
        console.error(`testflight-signup resend email failed: ${error}`);
      }
    }
    if (contactId || confirmationSent) {
      try {
        const markReply = await rpc("mark_testflight_signup_emailed", {
          p_email: email,
          p_resend_contact_id: contactId,
          p_confirmation_sent: confirmationSent,
        });
        if (!markReply.ok) {
          console.error(`testflight-signup mark emailed: ${markReply.status} ${await markReply.text()}`);
        }
      } catch (error) {
        console.error(`testflight-signup mark emailed failed: ${error}`);
      }
    }
  }

  return json(request, 200, { ok: true, platforms });
}

if (import.meta.main) {
  Deno.serve(handleSignup);
}
