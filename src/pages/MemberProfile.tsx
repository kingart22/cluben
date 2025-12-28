import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Anchor, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { QRCodeCanvas } from "qrcode.react";

interface Member {
  id: string;
  full_name: string;
  email: string | null;
  member_number: string;
  membership_status: "active" | "overdue" | "inactive";
  qr_code: string;
}

const MemberProfile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

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

      // Tenta encontrar um membro existente pelo email
      const { data: existing, error: fetchError } = await supabase
        .from("members")
        .select("id, full_name, email, member_number, membership_status, qr_code")
        .eq("email", user.email)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (existing) return existing as Member;

      // Gera próximo número de sócio sequencial
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
        .select("id, full_name, email, member_number, membership_status, qr_code")
        .single();

      if (insertError) throw insertError;
      return created as Member;
    },
  });

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
      {/* Header */}
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

      {/* Main Content: Cartão Digital */}
      <main className="container mx-auto px-4 py-8 flex flex-col gap-6 items-center">
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
              {/* Foto do sócio */}
              <Avatar className="w-20 h-20 border-2 border-primary shadow-glow">
                <AvatarFallback className="text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Sócio Nº {member.member_number}
                </p>
                <h2 className="text-xl font-bold truncate">
                  {member.full_name}
                </h2>
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
                  Cartão digital oficial para acesso ao Clube Náutico 1º de
                  Agosto. Apresente este QR Code na portaria para validação em
                  tempo real.
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

        <p className="text-xs text-muted-foreground text-center max-w-xl">
          O número de sócio e o QR Code são gerados automaticamente pelo
          sistema. O sócio poderá solicitar atualização de nome e foto, mas não
          poderá alterar a numeração ou o layout oficial do cartão.
        </p>
      </main>
    </div>
  );
};

export default MemberProfile;

