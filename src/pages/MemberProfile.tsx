import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Anchor } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { QRCodeCanvas } from "qrcode.react";
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
  const queryClient = useQueryClient();

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [localName, setLocalName] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const {
    data: member,
    isLoading: memberLoading,
    error,
  } = useQuery<Member | null>({
    queryKey: ["memberProfile", user?.id],
    enabled: !!user && !loading,
    queryFn: async () => {
      if (!user?.email) return null;

      const { data: existing, error: fetchError } = await supabase
        .from("members")
        .select(
          "id, full_name, email, member_number, membership_status, qr_code, avatar_url",
        )
        .eq("email", user.email)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (existing) return existing as Member;

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
      const qrCodeValue = `MEM-${memberNumber}-${
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
      return created as Member;
    },
  });

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

      await queryClient.invalidateQueries({
        queryKey: ["memberProfile", user?.id],
      });
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

      await queryClient.invalidateQueries({
        queryKey: ["memberProfile", user?.id],
      });
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-destructive">
          Ocorreu um erro ao carregar o perfil do sócio.
        </p>
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
        {/* Cartão digital */}
        <Card className="shadow-ocean max-w-xl w-full rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary via-secondary to-accent px-6 py-4 flex items-center justify-between">
            <span className="text-sm font-semibold tracking-[0.18em] text-primary-foreground uppercase">
              CLUBE NÁUTICO 1º DE AGOSTO
            </span>
            <div className="w-10 h-10 rounded-full bg-background/10 border border-primary-foreground/30 flex items-center justify-center text-xs font-bold text-primary-foreground">
              CN
            </div>
          </div>

          <CardContent className="bg-card px-6 py-5 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20 border-2 border-primary shadow-glow">
                {member.avatar_url && (
                  <AvatarImage src={member.avatar_url} alt={member.full_name} />
                )}
                <AvatarFallback className="text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Sócio Nº {member.member_number}
                </p>
                <h2 className="text-xl font-bold truncate">{member.full_name}</h2>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {member.email}
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold ${currentStatus.badgeClass}`}
                  >
                    {currentStatus.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="text-[11px] text-muted-foreground leading-relaxed max-w-[60%]">
                <p>
                  Cartão digital oficial para acesso ao Clube Náutico 1º de Agosto.
                  Apresente este QR Code na portaria para validação em tempo real.
                </p>
              </div>

              <div className="shrink-0 bg-background p-2 rounded-xl border border-border shadow-inner">
                <QRCodeCanvas
                  value={member.qr_code}
                  size={104}
                  bgColor="transparent"
                  fgColor="#000000"
                  className="block"
                />
              </div>
            </div>
          </CardContent>
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
                sócio, QR Code e layout do cartão são gerados e controlados pelo
                sistema/administrador.
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center max-w-xl">
          Em uma próxima etapa podemos adicionar um fluxo de aprovação onde o
          administrador revisa e aprova alterações de nome antes de irem ao
          cartão oficial.
        </p>
      </main>
    </div>
  );
};

export default MemberProfile;
