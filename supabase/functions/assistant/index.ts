// 9rawZid9ra — AI academic assistant (Supabase Edge Function, Deno)
//
// POST /functions/v1/assistant   { message: string, conversation_id?: string }
//   → { conversation_id, message: { id, role, content, cards, context }, quota }
//
// The model never touches the database directly: it calls the tools below, which run the
// platform's own RPCs with the STUDENT's JWT (so RLS and quotas apply). Every document,
// module or professor it mentions comes from a tool result and is returned as a "card"
// the UI renders with the real links.
//
// Secrets (supabase secrets set …):
//   ANTHROPIC_API_KEY   required
//   ANTHROPIC_MODEL     required — a current Claude model id (see docs.claude.com → Models)
//   SUPABASE_URL / SUPABASE_ANON_KEY are provided automatically.

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const MAX_TOOL_ROUNDS = 6;
const HISTORY_MESSAGES = 10;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// ---------------------------------------------------------------------------
// Tools exposed to the model
// ---------------------------------------------------------------------------
const TOOLS = [
  {
    name: "understand_request",
    description:
      "Analyse a student's request and map it onto the platform structure (école → faculté → filière → semestre → module), plus document types, year and professor. Call this FIRST for any request about finding documents. Returns ids to pass to search_resources.",
    input_schema: {
      type: "object",
      properties: { text: { type: "string", description: "The student's request, verbatim." } },
      required: ["text"],
    },
  },
  {
    name: "search_resources",
    description:
      "Search documents and modules. Use the ids returned by understand_request. Results are already ranked (verified first, then most useful, most recent, trusted contributors). doc_types values: examen, corrige_examen, cc, td, corrige_td, tp, corrige_tp, cours, quiz, projet_final.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Remaining free-text words (module name…). Empty if ids already pin it down." },
        university_id: { type: "integer" },
        faculty_id: { type: "integer" },
        filiere_id: { type: "integer" },
        semester: { type: "string", description: "S1…S14" },
        module_id: { type: "integer" },
        professor_id: { type: "integer" },
        doc_types: { type: "array", items: { type: "string" } },
        year: { type: "string", description: "4-digit year, e.g. 2024 (matches 2023/2024 and 2024/2025)" },
        verified_only: { type: "boolean" },
      },
    },
  },
  {
    name: "get_module_overview",
    description: "Everything available for one module, grouped by document type, plus the missing types, its professors and open requests.",
    input_schema: { type: "object", properties: { module_id: { type: "integer" } }, required: ["module_id"] },
  },
  {
    name: "get_related_modules",
    description: "Modules related to a module: same filière and neighbouring semesters, the same subject in other schools, and modules downloaded by the same students.",
    input_schema: { type: "object", properties: { module_id: { type: "integer" } }, required: ["module_id"] },
  },
  {
    name: "get_missing_resources",
    description: "Modules of a filière (optionally one semester) with the document types nobody has shared yet and the open requests. Use it to help students discover gaps and contribute.",
    input_schema: {
      type: "object",
      properties: { filiere_id: { type: "integer" }, semester: { type: "string" } },
      required: ["filiere_id"],
    },
  },
  {
    name: "recommend_for_me",
    description: "Documents recommended for this student (their filière, semester and followed modules) that they have not downloaded yet.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "search_professors",
    description: "Find a professor's standard profile by name.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" }, university_id: { type: "integer" } },
      required: ["query"],
    },
  },
  {
    name: "propose_document_request",
    description:
      "When a document does not exist, propose that the student asks the community for it. This does NOT create anything: the interface shows a button the student can press.",
    input_schema: {
      type: "object",
      properties: {
        module_id: { type: "integer" },
        doc_type: { type: "string" },
        academic_year: { type: "string" },
      },
      required: ["module_id", "doc_type"],
    },
  },
];

type Card = Record<string, unknown> & { type: string; id: number | string };

async function runTool(sb: SupabaseClient, name: string, input: Record<string, any>, cards: Card[], ctx: Record<string, unknown>) {
  const pushCard = (c: Card) => {
    if (cards.length < 12 && !cards.some((x) => x.type === c.type && x.id === c.id)) cards.push(c);
  };

  switch (name) {
    case "understand_request": {
      const { data, error } = await sb.rpc("resolve_academic_context", { p_text: String(input.text ?? "").slice(0, 500) });
      if (error) throw error;
      Object.assign(ctx, data ?? {});
      return data;
    }
    case "search_resources": {
      const { data, error } = await sb.rpc("search_catalog", {
        p_query: input.query ?? "",
        p_university_id: input.university_id ?? null,
        p_faculty_id: input.faculty_id ?? null,
        p_filiere_id: input.filiere_id ?? null,
        p_semester: input.semester ?? null,
        p_year: input.year ?? null,
        p_verified_only: !!input.verified_only,
        p_limit: 8,
        p_module_id: input.module_id ?? null,
        p_professor_id: input.professor_id ?? null,
        p_doc_types: Array.isArray(input.doc_types) && input.doc_types.length ? input.doc_types : null,
      });
      if (error) throw error;
      const docs = (data?.documents ?? []).slice(0, 6);
      const mods = (data?.modules ?? []).slice(0, 4);
      docs.forEach((d: any) => pushCard({ type: "document", ...d }));
      mods.forEach((m: any) => pushCard({ type: "module", ...m }));
      // compact version for the model
      return {
        fuzzy: data?.fuzzy,
        total_modules: data?.total_modules,
        documents: docs.map((d: any) => ({
          id: d.id, title: d.title, doc_type: d.doc_type, year: d.academic_year, status: d.display_status,
          quality: d.quality_score, helpful: d.helpful_count, module: d.module_name, module_id: d.module_id,
          semester: d.semester, school: d.university_name, professor: d.professor,
        })),
        modules: mods.map((m: any) => ({
          id: m.id, name: m.name, semester: m.semester, filiere: m.filiere_name, school: m.university_name,
          docs_count: m.docs_count, doc_types: m.doc_types,
        })),
      };
    }
    case "get_module_overview": {
      const { data, error } = await sb.rpc("get_module_overview", { p_module_id: input.module_id });
      if (error) throw error;
      if (data?.module) pushCard({ type: "module", ...data.module });
      Object.values(data?.by_type ?? {}).flat().slice(0, 4).forEach((d: any) =>
        pushCard({ type: "document", ...d, module_id: data.module.id, module_name: data.module.name, module_slug: data.module.slug }));
      return data;
    }
    case "get_related_modules": {
      const { data, error } = await sb.rpc("get_related_modules", { p_module_id: input.module_id, p_limit: 6 });
      if (error) throw error;
      (data ?? []).slice(0, 4).forEach((m: any) => pushCard({ type: "module", id: m.module_id, ...m }));
      return data;
    }
    case "get_missing_resources": {
      const { data, error } = await sb.rpc("get_missing_resources", {
        p_filiere_id: input.filiere_id, p_semester: input.semester ?? null, p_limit: 10,
      });
      if (error) throw error;
      return data;
    }
    case "recommend_for_me": {
      const { data, error } = await sb.rpc("recommend_for_me", { p_limit: 6 });
      if (error) throw error;
      (data ?? []).forEach((d: any) => pushCard({ type: "document", id: d.document_id, ...d }));
      return data;
    }
    case "search_professors": {
      const { data, error } = await sb.rpc("search_professors", {
        p_query: input.query, p_university_id: input.university_id ?? null, p_limit: 5,
      });
      if (error) throw error;
      (data ?? []).slice(0, 3).forEach((p: any) => pushCard({ type: "professor", ...p }));
      return data;
    }
    case "propose_document_request": {
      const { data: mod } = await sb.from("modules").select("id, name, slug, semester").eq("id", input.module_id).maybeSingle();
      if (!mod) return { error: "module not found" };
      pushCard({
        type: "request_proposal", id: `${mod.id}:${input.doc_type}:${input.academic_year ?? ""}`,
        module_id: mod.id, module_name: mod.name, module_slug: mod.slug, doc_type: input.doc_type,
        academic_year: input.academic_year ?? null,
      });
      return { proposed: true, module: mod.name };
    }
    default:
      return { error: `unknown tool ${name}` };
  }
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------
function systemPrompt(profile: any, knownContext: unknown) {
  const me = profile
    ? `Étudiant·e : ${profile.name ?? "?"} — école : ${profile.university?.name ?? "inconnue"} (id ${profile.university_id ?? "?"}), filière : ${profile.filiere?.name ?? "inconnue"} (id ${profile.filiere_id ?? "?"}), semestre : ${profile.current_semester ?? "inconnu"}.`
    : "Étudiant·e non identifié·e.";
  return `Tu es l'assistant académique de 9rawZid9ra, la plateforme marocaine où les étudiants trouvent et partagent examens, CC, TD, TP, cours et corrigés, rangés par école → faculté → filière → semestre → module.

${me}
Contexte déjà compris dans cette conversation : ${JSON.stringify(knownContext ?? {})}

Règles :
- Tu n'es pas un chatbot généraliste. Tu aides à trouver, choisir et utiliser les ressources de la plateforme, et à découvrir ce qui manque.
- Pour toute demande de documents : appelle d'abord understand_request, puis search_resources avec les ids obtenus (filière, module, semestre, types, année, professeur). Si l'école ou la filière de l'étudiant est connue et que la demande ne précise rien, utilise-les.
- N'invente JAMAIS un document, un lien, un professeur ou un chiffre : ne cite que ce que les outils renvoient. L'interface affiche les résultats sous forme de cartes cliquables ; cite-les par leur titre/type/année, sans URL.
- Explique brièvement pourquoi tu recommandes un document (vérifié, utile, récent, bon score qualité).
- Si rien n'existe : dis-le franchement, montre ce qui existe à côté (get_module_overview, get_related_modules), propose une demande à la communauté (propose_document_request) et invite à partager.
- Pour « comment réviser avec ces documents » : conseils concrets et courts (commencer par les examens récents sans regarder le corrigé, puis corriger, refaire les TD, etc.). Tu peux expliquer une notion de cours simplement, mais tu ne rédiges pas un devoir noté ou un examen en cours à la place de l'étudiant.
- Réponds dans la langue de l'étudiant (français par défaut ; darija en lettres latines si l'étudiant écrit en darija ; arabe ou anglais si besoin). Tutoiement. Court : 2 à 6 phrases ou une petite liste. Pas d'emoji.
- Si la demande est ambiguë (plusieurs modules possibles, école inconnue), pose UNE question précise en proposant les options trouvées.`;
}

// ---------------------------------------------------------------------------
// Anthropic call with tool loop
// ---------------------------------------------------------------------------
async function callClaude(system: string, messages: any[]) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 1024, system, tools: TOOLS, messages }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!ANTHROPIC_API_KEY || !ANTHROPIC_MODEL) return json({ error: "assistant not configured" }, 500);

  const authHeader = req.headers.get("Authorization") ?? "";
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: "login required" }, 401);

  let body: { message?: string; conversation_id?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  const text = String(body.message ?? "").replace(/<[^>]*>/g, "").trim().slice(0, 1000);
  if (!text) return json({ error: "empty message" }, 400);

  // quota (counts one message)
  const { data: quota, error: qErr } = await sb.rpc("assistant_consume");
  if (qErr) {
    if (String(qErr.message).includes("quota_exceeded")) {
      const { data: q } = await sb.rpc("assistant_quota");
      return json({ error: "quota_exceeded", quota: q }, 429);
    }
    return json({ error: qErr.message }, 403);
  }

  // conversation
  let conversationId = body.conversation_id ?? null;
  let knownContext: Record<string, unknown> = {};
  if (conversationId) {
    const { data: conv } = await sb.from("assistant_conversations").select("id, context").eq("id", conversationId).maybeSingle();
    if (!conv) return json({ error: "conversation not found" }, 404);
    knownContext = conv.context ?? {};
  } else {
    const { data: conv, error } = await sb.from("assistant_conversations")
      .insert({ user_id: user.id, title: text.slice(0, 60) }).select("id").single();
    if (error) return json({ error: error.message }, 500);
    conversationId = conv.id;
  }

  const { data: history } = await sb.from("assistant_messages")
    .select("role, content").eq("conversation_id", conversationId)
    .order("created_at", { ascending: false }).limit(HISTORY_MESSAGES);
  await sb.from("assistant_messages").insert({ conversation_id: conversationId, user_id: user.id, role: "user", content: text });

  const { data: profile } = await sb.from("user_profiles")
    .select("name, university_id, filiere_id, current_semester, university:universities(name), filiere:filieres(name)")
    .eq("id", user.id).maybeSingle();

  const past = (history ?? []).reverse().map((m) => ({ role: m.role, content: m.content }));
  while (past.length && past[0].role !== "user") past.shift();   // the API expects a user turn first
  const messages: any[] = [...past, { role: "user", content: text }];
  const cards: Card[] = [];
  const ctx: Record<string, unknown> = {};
  const trace: unknown[] = [];
  let tokensIn = 0, tokensOut = 0;
  let reply = "";

  try {
    const system = systemPrompt(profile, knownContext);
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const res = await callClaude(system, messages);
      tokensIn += res.usage?.input_tokens ?? 0;
      tokensOut += res.usage?.output_tokens ?? 0;
      const toolUses = (res.content ?? []).filter((b: any) => b.type === "tool_use");
      reply = (res.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();
      if (res.stop_reason !== "tool_use" || toolUses.length === 0) break;

      messages.push({ role: "assistant", content: res.content });
      const results = [];
      for (const tu of toolUses) {
        trace.push({ tool: tu.name, input: tu.input });
        let out: unknown;
        try { out = await runTool(sb, tu.name, tu.input ?? {}, cards, ctx); }
        catch (e) { out = { error: String((e as Error).message ?? e) }; }
        results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(out).slice(0, 12000) });
      }
      messages.push({ role: "user", content: results });
    }
  } catch (e) {
    console.error(e);
    return json({ error: "assistant_unavailable", conversation_id: conversationId }, 502);
  }
  if (!reply) reply = "Je n'ai pas réussi à répondre cette fois. Reformule ta demande ou précise le module.";

  const newContext = Object.keys(ctx).length ? { ...knownContext, ...ctx } : knownContext;
  const { data: saved } = await sb.from("assistant_messages").insert({
    conversation_id: conversationId, user_id: user.id, role: "assistant", content: reply,
    cards, context: Object.keys(ctx).length ? ctx : null, tool_trace: trace, tokens_in: tokensIn, tokens_out: tokensOut,
  }).select("id, role, content, cards, context, created_at").single();
  await sb.from("assistant_conversations").update({ context: newContext, updated_at: new Date().toISOString() }).eq("id", conversationId);

  return json({ conversation_id: conversationId, message: saved, quota });
});
