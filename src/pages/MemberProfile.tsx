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
import cardBackground from "@/assets/cartao-clube.png";

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

        {/* Cartão físico com layout fornecido */}
        <section className="w-full flex justify-center px-4">
          <div
            ref={cardRef}
            className="relative mx-auto w-full max-w-[720px] aspect-[1151/737] shadow-2xl rounded-md overflow-hidden bg-white"
            style={{ backgroundImage: `url(${cardBackground})`, backgroundSize: "cover", backgroundPosition: "center" }}
          >
            {/* Área para dados do sócio na parte branca à esquerda */}
            <div className="absolute left-0 top-[70px] bottom-0 w-[60%] flex flex-col gap-3 px-8 py-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20 border-2 border-background">
                  <AvatarImage src={member.avatar_url ?? undefined} alt={member.full_name} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    Sócio Nº {member.member_number}
                  </span>
                  <span className="text-lg font-semibold text-foreground leading-tight">
                    {member.full_name}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={statusConfig[member.membership_status].badgeClass}>
                      {statusConfig[member.membership_status].label}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="mt-auto flex items-end justify-between pr-4">
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <span>CLUBE NÁUTICO 1º DE AGOSTO</span>
                  <span>Cartão de sócio pessoal e intransferível.</span>
                </div>
                <div className="bg-background p-2 rounded-md shadow-md">
                  <QRCode value={member.qr_code} size={72} level="M" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default MemberProfile;
