import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY     = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL       = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SVC_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ADMIN_ID           = "84c11086-6041-4118-8f4c-138a0664966f";
const FROM               = "9rawZid9ra <no-reply@mail.9rawzid9ra.space>";
const SITE_URL           = "https://9rawzid9ra.space";

interface EmailTemplate { subject: string; html: string }

function buildTemplate(type: string, content: string): EmailTemplate | null {
  const sender = content?.split(" : ")?.[0]?.trim() || "Quelqu'un";
  const templates: Record<string, EmailTemplate> = {
    new_message: {
      subject: `💬 Nouveau message de ${sender}`,
      html: `<b>${sender}</b> vous a envoyé un message sur 9rawZid9ra. Connectez-vous pour répondre.`,
    },
    follow: {
      subject: `👤 ${sender} vous suit maintenant`,
      html: `<b>${sender}</b> a commencé à vous suivre sur 9rawZid9ra.`,
    },
    reply: {
      subject: `💬 ${sender} a répondu à votre post`,
      html: `<b>${sender}</b> a répondu à votre post Senpai.`,
    },
    helpful: {
      subject: `⭐ ${sender} a trouvé votre post utile`,
      html: `<b>${sender}</b> a marqué votre post comme utile.`,
    },
  };
  return templates[type] ?? null;
}

function emailHtml(body: string): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0A0F1E;font-family:sans-serif">
  <div style="max-width:520px;margin:40px auto;background:#070C18;border:1px solid #1C2A45;border-radius:14px;overflow:hidden">
    <div style="padding:24px 28px;border-bottom:1px solid #1C2A45">
      <span style="font-size:1.15rem;font-weight:800;color:#fff">9raw</span><span style="font-size:1.15rem;font-weight:800;color:#4F8EF7">Zid</span><span style="font-size:1.15rem;font-weight:800;color:#fff">9ra</span>
    </div>
    <div style="padding:28px">
      <p style="color:#94A3B8;font-size:0.95rem;line-height:1.7;margin:0 0 24px">${body}</p>
      <a href="${SITE_URL}" style="display:inline-block;background:linear-gradient(135deg,#4F8EF7,#2DD4BF);color:#fff;padding:11px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:0.9rem">
        Ouvrir 9rawZid9ra →
      </a>
    </div>
    <div style="padding:18px 28px;border-top:1px solid #1C2A45;font-size:0.72rem;color:#4A5568">
      Tu reçois cet email parce que tu es inscrit sur
      <a href="${SITE_URL}" style="color:#4A5568">9rawzid9ra.space</a>.
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: { record?: Record<string, unknown>; type?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Database webhook sends { type: "INSERT", record: {...} }
  const record = payload.record;
  if (!record || payload.type !== "INSERT") {
    return new Response("Not an INSERT event", { status: 200 });
  }

  // Skip admin notifications
  if (record.user_id === ADMIN_ID) {
    return new Response("Skipping admin", { status: 200 });
  }

  const template = buildTemplate(record.type as string, record.content as string ?? "");
  if (!template) {
    return new Response(`No email template for type: ${record.type}`, { status: 200 });
  }

  // Look up user email via service role
  const supabase = createClient(SUPABASE_URL, SUPABASE_SVC_KEY, {
    auth: { persistSession: false },
  });
  const { data: { user }, error } = await supabase.auth.admin.getUserById(record.user_id as string);
  if (error || !user?.email) {
    console.error("getUserById error:", error);
    return new Response("User email not found", { status: 200 });
  }

  // Send via Resend
  const emailResp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [user.email],
      subject: template.subject,
      html: emailHtml(template.html),
    }),
  });

  if (!emailResp.ok) {
    const err = await emailResp.text();
    console.error("Resend error:", err);
    return new Response(`Resend error: ${err}`, { status: 500 });
  }

  return new Response("Email sent", { status: 200 });
});
