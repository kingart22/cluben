import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Anchor } from "lucide-react";
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

  const initials = member.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
      badgeClass: "bg-destructive/10 text-destructive border border-destructive/40",
    },
  };

  const currentStatus = statusConfig[member.membership_status];

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-ocean shadow-ocean sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gradient-sunset flex items-center justify-center shadow-glow">
                <Anchor className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary-foreground">
                  CLUBE NÁUTICO 1º DE AGOSTO
                </h1>
                <Badge variant="secondary" className="text-xs">
                  Cartão Digital do Sócio
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex flex-col gap-6 items-center">
        {/* Cartão digital baseado no layout oficial */}
        <Card className="relative w-full max-w-md h-[250px] bg-card rounded-[14px] overflow-hidden shadow-ocean">
          {/* Curva lateral com faixas amarela e azul */}
          <div className="pointer-events-none absolute -right-16 top-0 h-full w-40 -skew-x-12 bg-gradient-to-b from-warning via-warning to-primary" />

          {/* Cabeçalho vermelho */}
          <div className="relative z-10 bg-destructive text-destructive-foreground text-center py-3 text-sm font-bold tracking-wide">
            CLUBE NÁUTICO 1º DE AGOSTO
          </div>

          {/* Corpo */}
          <div className="relative z-10 h-[150px]">
            {/* Foto do sócio */}
            <div className="absolute left-6 top-6 w-[95px] h-[95px] rounded-full border-[4px] border-muted bg-background overflow-hidden flex items-center justify-center">
              <Avatar className="w-full h-full">
                {member.avatar_url && (
                  <AvatarImage src={member.avatar_url} alt={member.full_name} />
                )}
                <AvatarFallback className="text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Logo do clube (placeholder com iniciais) */}
            <div className="absolute right-6 top-7 w-[90px] h-[90px] rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm tracking-wide">
                CN
              </span>
            </div>
          </div>

          {/* Rodapé com número e nome do sócio */}
          <div className="relative z-10 px-5 py-2">
            <span className="block text-sm font-bold text-foreground">
              SÓCIO Nº {member.member_number}
            </span>
            <span className="block text-lg font-bold text-destructive mt-1 truncate">
              {member.full_name}
            </span>

            <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold bg-background/80 border border-border text-muted-foreground">
              <span className="mr-1">Status:</span>
              <span className={currentStatus.badgeClass}>{currentStatus.label}</span>
            </div>
          </div>
        </Card>

        {/* Formulário de edição controlada (apenas nome e foto) */}
        <Card className="max-w-xl w-full shadow-ocean">
          <CardContent className="pt-6 space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Nome completo</p>
              <Input
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder="Atualizar nome do sócio"
              />
              {nameError && (
                <p className="mt-1 text-xs text-destructive">{nameError}</p>
              )}
              <Button
                className="mt-3"
                size="sm"
                onClick={handleSaveName}
                disabled={savingName}
              >
                {savingName ? "Salvando..." : "Salvar nome"}
              </Button>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium mb-1">Foto do sócio</p>
              <Input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={avatarUploading}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Apenas o sócio pode alterar a foto e o nome exibidos. O número de
                sócio, código de acesso e layout do cartão são gerados e
                controlados pelo sistema/administrador.
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center max-w-xl">
          Em uma próxima etapa podemos conectar este cartão a um QR Code real e
          adicionar um fluxo de aprovação onde o administrador revisa alterações
          de nome antes de irem ao cartão oficial.
        </p>
      </main>
    </div>
  );
};

export default MemberProfile;
