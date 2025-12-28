import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface RequestBody {
  memberId: string;
  action: "generate" | "reset";
}

function generatePassword(length = 10): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let result = "";
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RequestBody;

    if (!body.memberId || !body.action) {
      return new Response(
        JSON.stringify({ error: "memberId e action são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Buscar dados do sócio
    const { data: member, error: memberError } = await adminClient
      .from("members")
      .select("id, member_number")
      .eq("id", body.memberId)
      .maybeSingle();

    if (memberError) throw memberError;
    if (!member) {
      return new Response(
        JSON.stringify({ error: "Sócio não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const loginEmail = `${member.member_number}@clube.local`;
    const password = generatePassword();

    // Procurar se já existe utilizador para este email
    const { data: usersList, error: listError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });

    if (listError) throw listError;

    const existing = usersList.users.find((u) => u.email === loginEmail);

    if (!existing) {
      // Criar novo utilizador
      const { error: createError } = await adminClient.auth.admin.createUser({
        email: loginEmail,
        password,
        email_confirm: true,
        user_metadata: {
          member_id: member.id,
          type: "member",
        },
      });

      if (createError) throw createError;
    } else {
      // Atualizar senha do utilizador existente
      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        existing.id,
        {
          password,
        },
      );

      if (updateError) throw updateError;
    }

    return new Response(
      JSON.stringify({
        password,
        loginEmail,
        memberNumber: member.member_number,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Erro na função member-access:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
