import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Clock, Ship, XCircle } from "lucide-react";

interface MemberWithStatus {
  id: string;
  full_name: string;
  member_number: string;
  membership_status: "active" | "overdue" | "inactive";
}

interface EntryWithJoins {
  id: string;
  entry_time: string;
  exit_time: string | null;
  status: "inside" | "outside";
  vehicle?: {
    registration_number: string;
    vehicle_type: "jet_ski" | "boat";
  } | null;
}

const statusLabels: Record<MemberWithStatus["membership_status"], { label: string; tone: "success" | "warning" | "destructive" }> = {
  active: { label: "Ativo", tone: "success" },
  overdue: { label: "Em atraso", tone: "warning" },
  inactive: { label: "Bloqueado", tone: "destructive" },
};

const QrValidation = () => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [member, setMember] = useState<MemberWithStatus | null>(null);
  const [entries, setEntries] = useState<EntryWithJoins[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<"entry" | "exit" | null>(null);

  const qrCode = searchParams.get("code");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const loadData = async () => {
      if (!qrCode) {
        setError("Nenhum código QR informado na URL.");
        return;
      }

      setFetching(true);
      setError(null);

      try {
        const { data: memberData, error: memberError } = await supabase
          .from("members")
          .select("id, full_name, member_number, membership_status")
          .eq("qr_code", qrCode)
          .maybeSingle();

        if (memberError) throw memberError;
        if (!memberData) {
          setError("Nenhum sócio encontrado para este QR Code.");
          setMember(null);
          setEntries([]);
          return;
        }

        setMember(memberData as MemberWithStatus);

        const { data: entriesData, error: entriesError } = await supabase
          .from("entries")
          .select(
            `id, entry_time, exit_time, status,
             vehicle:vehicles(registration_number, vehicle_type)`
          )
          .eq("member_id", memberData.id)
          .order("entry_time", { ascending: false })
          .limit(5);

        if (entriesError) throw entriesError;
        setEntries((entriesData || []) as any);
      } catch (err) {
        console.error("Erro ao validar QR Code", err);
        setError("Ocorreu um erro ao validar o QR Code.");
      } finally {
        setFetching(false);
      }
    };

    if (!loading && user) {
      loadData();
    }
  }, [qrCode, user, loading]);

  const reloadEntries = async (memberId: string) => {
    const { data: entriesData, error: entriesError } = await supabase
      .from("entries")
      .select(
        `id, entry_time, exit_time, status,
         vehicle:vehicles(registration_number, vehicle_type)`
      )
      .eq("member_id", memberId)
      .order("entry_time", { ascending: false })
      .limit(5);

    if (!entriesError && entriesData) {
      setEntries((entriesData || []) as any);
    }
  };

  const handleRegisterEntry = async () => {
    if (!member || !user) return;
    setActionError(null);
    setActionLoading("entry");

    try {
      const { data: vehicles, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("id")
        .eq("member_id", member.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (vehiclesError) throw vehiclesError;
      const vehicle = vehicles?.[0];
      if (!vehicle) {
        setActionError("Nenhum veículo registado para este sócio.");
        return;
      }

      const { error: insertError } = await supabase.from("entries").insert({
        member_id: member.id,
        vehicle_id: vehicle.id,
        scanned_by: user.id,
        status: "inside",
      });

      if (insertError) throw insertError;

      await reloadEntries(member.id);
    } catch (err) {
      console.error("Erro ao registar entrada", err);
      setActionError("Ocorreu um erro ao registar a entrada.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegisterExit = async () => {
    if (!member || !user) return;
    setActionError(null);
    setActionLoading("exit");

    try {
      const { data: openEntries, error: openError } = await supabase
        .from("entries")
        .select("id")
        .eq("member_id", member.id)
        .eq("status", "inside")
        .order("entry_time", { ascending: false })
        .limit(1);

      if (openError) throw openError;
      const openEntry = openEntries?.[0];
      if (!openEntry) {
        setActionError("Nenhuma entrada aberta encontrada para este sócio.");
        return;
      }

      const { error: updateError } = await supabase
        .from("entries")
        .update({ status: "outside", exit_time: new Date().toISOString() })
        .eq("id", openEntry.id);

      if (updateError) throw updateError;

      await reloadEntries(member.id);
    } catch (err) {
      console.error("Erro ao registar saída", err);
      setActionError("Ocorreu um erro ao registar a saída.");
    } finally {
      setActionLoading(null);
    }
  };

  const renderStatusBadge = () => {
    if (!member) return null;
    const s = statusLabels[member.membership_status];
    const base = "text-xs px-2.5 py-0.5 rounded-full border";

    const toneClass =
      s.tone === "success"
        ? "bg-success/10 text-success border-success/40"
        : s.tone === "warning"
          ? "bg-warning/10 text-warning border-warning/40"
          : "bg-destructive/10 text-destructive border-destructive/40";

    return <span className={`${base} ${toneClass}`}>{s.label}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-ocean shadow-ocean">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-primary-foreground">
                Validação de QR Code
              </h1>
              <p className="text-xs text-primary-foreground/80">
                Segurança - consulta rápida do estado do sócio
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 grid gap-6 lg:grid-cols-[2fr,3fr]">
        <section>
          <Card className="shadow-ocean">
            <CardHeader>
              <CardTitle>Resultado da validação</CardTitle>
              <CardDescription>
                Código lido: {qrCode || "nenhum código na URL"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fetching && (
                <p className="text-sm text-muted-foreground">
                  Validando QR Code...
                </p>
              )}

              {error && !fetching && (
                <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                  <XCircle className="w-4 h-4 text-destructive mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {!error && member && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Sócio</p>
                        <p className="text-lg font-semibold">{member.full_name}</p>
                      </div>
                      {renderStatusBadge()}
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Número</p>
                        <p className="font-medium">{member.member_number}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>Últimas movimentações ao lado</span>
                      </div>
                    </div>
                  </div>

                  {/* Ações de registrar entrada/saída */}
                  <div className="space-y-2">
                    {actionError && (
                      <p className="text-xs text-destructive">{actionError}</p>
                    )}
                    <div className="flex gap-3">
                      <Button
                        size="sm"
                        className="flex-1"
                        variant="ocean"
                        disabled={!!actionLoading || fetching}
                        onClick={handleRegisterEntry}
                      >
                        {actionLoading === "entry" ? "Registando entrada..." : "Registar entrada"}
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        variant="sunset"
                        disabled={!!actionLoading || fetching}
                        onClick={handleRegisterExit}
                      >
                        {actionLoading === "exit" ? "Registando saída..." : "Registar saída"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <Card className="shadow-ocean">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Ship className="w-4 h-4 text-primary" />
                Últimas entradas/saídas
              </CardTitle>
              <CardDescription>
                Histórico recente do sócio (máx. 5 registros)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(!member || entries.length === 0) && !fetching && !error && (
                <p className="text-sm text-muted-foreground">
                  Nenhum movimento recente encontrado para este sócio.
                </p>
              )}

              {entries.length > 0 && (
                <div className="space-y-3">
                  {entries.map((entry) => {
                    const inside = entry.status === "inside";
                    return (
                      <div
                        key={entry.id}
                        className="flex items-start justify-between rounded-md border border-border/70 px-3 py-2 text-sm bg-card/60"
                      >
                        <div>
                          <p className="font-medium">
                            {inside ? "Entrada" : "Saída"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.entry_time).toLocaleString()}
                          </p>
                          {entry.vehicle && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Veículo: {entry.vehicle.registration_number}  b7 {" "}
                              {entry.vehicle.vehicle_type === "jet_ski"
                                ? "Jet Ski"
                                : "Embarcação"}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={inside ? "text-success border-success/60" : "text-warning border-warning/60"}
                        >
                          {inside ? "Dentro" : "Fora"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}

              {fetching && (
                <p className="text-sm text-muted-foreground">
                  Carregando histórico de entradas...
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default QrValidation;
