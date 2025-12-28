import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import QRCode from "react-qr-code";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Member {
  id: string;
  full_name: string;
  email: string | null;
  member_number: string;
  membership_status: "active" | "overdue" | "inactive";
  qr_code: string;
  avatar_url: string | null;
}

const nameSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: "Nome muito curto" })
    .max(100, { message: "Nome muito longo" }),
});

const MemberProfile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [localName, setLocalName] = useState("");
  const [member, setMember] = useState<Member | null>(null);
  const [memberLoading, setMemberLoading] = useState(true);
  const [memberError, setMemberError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const loadMember = async () => {
      if (!user?.email) {
        setMember(null);
        setMemberLoading(false);
        return;
      }

      setMemberLoading(true);
      setMemberError(null);

      try {
        const { data: existing, error: fetchError } = await supabase
          .from("members")
          .select(
            "id, full_name, email, member_number, membership_status, qr_code, avatar_url",
          )
          .eq("email", user.email)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (existing) {
          setMember(existing as Member);
          return;
        }

        const { data: lastList, error: lastError } = await supabase
          .from("members")
          .select("member_number")
          .order("created_at", { ascending: false })
          .limit(1);

        if (lastError) throw lastError;

        let nextNumber = 1;
        const last = lastList?.[0]?.member_number;
        if (last) {
          const parsed = parseInt(last, 10);
          if (!Number.isNaN(parsed) && parsed > 0) {
            nextNumber = parsed + 1;
          }
        }

        const memberNumber = String(nextNumber);
        const qrCodeValue = `MEM-${memberNumber}-$
          {
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? (crypto as any).randomUUID()
              : Math.random().toString(36).slice(2)
          }`;

        const displayName =
          (user.user_metadata?.full_name as string | undefined) ||
          user.email.split("@")[0] ||
          "Novo Sócio";

        const { data: created, error: insertError } = await supabase
          .from("members")
          .insert({
            full_name: displayName,
            email: user.email,
            member_number: memberNumber,
            membership_status: "active",
            monthly_fee_amount: 0,
            qr_code: qrCodeValue,
          })
          .select(
            "id, full_name, email, member_number, membership_status, qr_code, avatar_url",
          )
          .single();

        if (insertError) throw insertError;
        setMember(created as Member);
      } catch (err) {
        console.error("Erro ao carregar/criar membro", err);
        setMemberError("Erro ao carregar o perfil do sócio.");
      } finally {
        setMemberLoading(false);
      }
    };

    if (!loading && user) {
      loadMember();
    }
  }, [user, loading]);

  useEffect(() => {
    if (member) {
      setLocalName(member.full_name);
      setNameError(null);
    }
  }, [member]);

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !member) return;

    setAvatarUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${member.id}-${Date.now()}.${fileExt}`;
      const filePath = `${member.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("members")
        .update({ avatar_url: publicUrl })
        .eq("id", member.id);

      if (updateError) throw updateError;

      setMember({ ...member, avatar_url: publicUrl });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveName = async () => {
    if (!member) return;
    setNameError(null);

    const parsed = nameSchema.safeParse({ fullName: localName });
    if (!parsed.success) {
      setNameError(parsed.error.issues[0]?.message ?? "Nome inválido");
      return;
    }

    setSavingName(true);
    try {
      const { error: updateError } = await supabase
        .from("members")
        .update({ full_name: parsed.data.fullName })
        .eq("id", member.id);

      if (updateError) throw updateError;

      setMember({ ...member, full_name: parsed.data.fullName });
    } finally {
      setSavingName(false);
    }
  };

  const initials = member?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "";

  const statusConfig: Record<
    Member["membership_status"],
    { label: string; badgeClass: string }
  > = {
    active: {
      label: "Ativo",
      badgeClass: "bg-success/10 text-success border border-success/40",
    },
    overdue: {
      label: "Em Atraso",
      badgeClass: "bg-warning/10 text-warning border border-warning/40",
    },
    inactive: {
      label: "Bloqueado",
      badgeClass:
        "bg-destructive/10 text-destructive border border-destructive/40",
    },
  };

  const cardRef = useRef<HTMLDivElement | null>(null);

  const handlePrintCard = () => {
    if (!cardRef.current || !member) return;

    const printContents = cardRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=900,height=600");
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cartão de Sócio - ${member.full_name}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #e5e7eb;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .card-wrapper {
        width: 9cm;
        height: 6cm;
      }
    </style>
  </head>
  <body>
    <div class="card-wrapper">${printContents}</div>
    <script>
      window.onload = function () {
        window.print();
        window.close();
      };
    <\/script>
  </body>
</html>`);
    printWindow.document.close();
  };

  if (loading || memberLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando perfil de sócio...</p>
      </div>
    );
  }

  if (memberError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-destructive">{memberError}</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">
          Nenhum perfil de sócio encontrado para esta conta.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start py-10">
      <main className="w-full max-w-5xl px-4 flex flex-col gap-8 items-center">
        <div className="w-full flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-border text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Voltar para o painel"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-bold text-foreground">
            Perfil do Sócio
          </h1>
        </div>

        {/* Formulário de edição controlada (apenas nome e foto) */}
        {/* Botão para impressão / download em PDF */}
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={handlePrintCard}
        >
          Imprimir / Download PDF do cartão
        </Button>

        <section className="w-full flex justify-center px-4">
          <div
            ref={cardRef}
            className="relative overflow-hidden bg-white shadow-2xl rounded-lg mx-auto w-full max-w-[380px] aspect-[3/2] md:max-w-[480px]"
          >
            <div className="absolute inset-0 bg-[#C41E3A]" />
            <div className="absolute top-0 left-0 bottom-0 w-[45%] bg-white" />
            <div
              className="absolute top-0 right-0 bottom-0 w-[35%] bg-[#FDB913]"
              style={{ clipPath: "ellipse(80% 100% at 100% 50%)" }}
            />
            <div
              className="absolute top-0 right-0 bottom-0 w-[25%] bg-[#001a4d]"
              style={{ clipPath: "ellipse(90% 100% at 100% 50%)" }}
            />

            {/* Faixa superior com nome do clube */}
            <div className="absolute top-0 left-0 right-0 bg-[#C41E3A] h-20 flex items-center px-10 z-20 shadow-md">
              <h2 className="text-white text-4xl font-bold tracking-wide uppercase">
                CLUBE NÁUTICO 1º DE AGOSTO
              </h2>
            </div>

            {/* Escudo à direita */}
            <div className="absolute top-24 right-12 z-30">
              <div className="w-40 h-52 relative">
                <svg viewBox="0 0 200 260" className="w-full h-full drop-shadow-xl">
                  <defs>
                    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: "rgb(0, 26, 77)", stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: "rgb(0, 13, 38)", stopOpacity: 1 }} />
                    </linearGradient>
                  </defs>
                  <path
                    d="M100 10 L180 35 L180 120 Q180 180 100 240 Q20 180 20 120 L20 35 Z"
                    fill="url(#shieldGrad)"
                    stroke="#000d26"
                    strokeWidth="2"
                  />
                </svg>
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[75%] text-center">
                  <div className="bg-white py-1 px-1.5 rounded-sm shadow-sm">
                    <p className="text-[#001a4d] text-[7px] font-bold tracking-widest leading-tight uppercase">
                      CLUBE NÁUTICO
                      <br />
                      1º DE AGOSTO
                    </p>
                  </div>
                </div>
                <div className="absolute top-[22%] left-1/2 -translate-x-1/2 w-[50%] h-[35%] flex gap-0.5">
                  <div className="flex-1 bg-[#C41E3A]" />
                  <div className="flex-1 bg-black" />
                  <div className="flex-1 bg-[#C41E3A]" />
                  <div className="flex-1 bg-black" />
                  <div className="flex-1 bg-[#C41E3A]" />
                </div>
                <div className="absolute top-[48%] left-1/2 -translate-x-1/2">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 bg-[#FDB913] rounded-full shadow-md" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-12 h-12">
                        <path
                          d="M48 28 L48 65 L22 65 Z"
                          fill="#C41E3A"
                          stroke="#8B0000"
                          strokeWidth="1"
                        />
                        <line
                          x1="48"
                          y1="25"
                          x2="48"
                          y2="70"
                          stroke="#654321"
                          strokeWidth="2.5"
                        />
                        <path
                          d="M30 70 L66 70 L60 76 L36 76 Z"
                          fill="#654321"
                          stroke="#3d2817"
                          strokeWidth="1"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-[60%]">
                  <div className="bg-white py-0.5 px-1.5 rounded-sm text-center shadow-sm">
                    <p className="text-[#001a4d] text-[7px] font-bold tracking-wider uppercase">
                      ANGOLA
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Foto, dados do sócio e QR Code à esquerda */}
            <div className="absolute top-24 left-12 z-20 flex gap-10 items-start">
              <div>
                <div className="relative mb-6">
                  <div className="w-56 h-56 rounded-full border-[6px] border-gray-400 overflow-hidden bg-white shadow-lg">
                    <img
                      alt={member.full_name}
                      className="w-full h-full object-cover object-top"
                      src={
                        member.avatar_url ||
                        "https://public.readdy.ai/placeholder/user-avatar.png"
                      }
                    />
                  </div>
                </div>
                <div className="mt-8">
                  <div className="mb-3">
                    <p className="text-gray-800 text-xl font-semibold tracking-wide">
                      SÓCIO Nº {member.member_number}
                    </p>
                  </div>
                  <div className="leading-none">
                    <h3
                      className="text-[#C41E3A] text-[42px] font-black tracking-tight uppercase"
                      style={{ lineHeight: 0.95 }}
                    >
                      {member.full_name}
                    </h3>
                  </div>
                </div>
              </div>

              {/* QR Code usando o campo qr_code do membro */}
              <div className="flex flex-col items-center gap-2 bg-white/90 rounded-xl px-4 py-3 shadow-md">
                <QRCode value={member.qr_code} size={120} level="M" />
                <span className="text-[10px] font-medium tracking-widest text-[#001a4d] uppercase">
                  ACESSO RÁPIDO
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default MemberProfile;
