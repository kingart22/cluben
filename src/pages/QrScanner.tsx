import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Scanner } from "@yudiel/react-qr-scanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Camera, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast as sonnerToast } from "@/components/ui/sonner";

interface ScanResult {
  memberId: string;
  memberName: string;
  memberNumber: string;
  membershipStatus: "active" | "overdue" | "inactive";
  action: "entry" | "exit";
  timestamp: string;
}

interface OfflineScan {
  code: string;
  scannedBy: string;
  createdAt: string;
  userAgent: string;
}

const OFFLINE_QUEUE_KEY = "qr_offline_scans";

const loadOfflineQueue = (): OfflineScan[] => {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineScan[]) : [];
  } catch {
    return [];
  }
};

const saveOfflineQueue = (queue: OfflineScan[]) => {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

const QrScannerPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: role, isLoading: roleLoading } = useUserRole();

  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canScan = role === "security" || role === "admin";

  const processScan = useCallback(
    async (code: string, options?: { fromQueue?: boolean; scannedBy?: string; createdAt?: string; userAgent?: string }) => {
      if (!user && !options?.scannedBy) return;

      setProcessing(true);
      setError(null);

      const scannedBy = options?.scannedBy || user?.id!;
      const userAgent = options?.userAgent || navigator.userAgent;

      try {
        const { data: member, error: memberError } = await supabase
          .from("members")
          .select("id, full_name, member_number, membership_status")
          .eq("qr_code", code)
          .maybeSingle();

        if (memberError) throw memberError;

        if (!member) {
          setError("QR Code inválido ou desconhecido.");
          await supabase.from("notifications").insert({
            title: "QR Code inválido",
            message: "Um QR Code desconhecido foi lido pelo segurança.",
            type: "invalid_qr",
          });
          sonnerToast.error("QR Code inválido ou desconhecido.");
          return;
        }

        if (member.membership_status === "inactive") {
          setError("Cartão bloqueado. Acesso negado.");
          await supabase.from("notifications").insert({
            title: "Cartão bloqueado",
            message: `Tentativa de acesso com cartão bloqueado (${member.member_number} - ${member.full_name}).`,
            type: "blocked_card",
            member_id: member.id,
          });
          sonnerToast.error("Cartão bloqueado. Acesso negado.");
          return;
        }

        const { data: vehicles, error: vehiclesError } = await supabase
          .from("vehicles")
          .select("id")
          .eq("member_id", member.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (vehiclesError) throw vehiclesError;
        const vehicle = vehicles?.[0];

        if (!vehicle) {
          setError("Nenhum veículo registado para este sócio.");
          sonnerToast.error("Nenhum veículo registado para este sócio.");
          return;
        }

        const { data: lastEntries, error: lastError } = await supabase
          .from("entries")
          .select("id, status")
          .eq("member_id", member.id)
          .order("entry_time", { ascending: false })
          .limit(1);

        if (lastError) throw lastError;

        const last = lastEntries?.[0];

        let action: "entry" | "exit" = "entry";

        if (last && last.status === "inside") {
          action = "exit";
          const { error: updateError } = await supabase
            .from("entries")
            .update({ status: "outside", exit_time: new Date().toISOString(), notes: `device=${userAgent}` })
            .eq("id", last.id);

          if (updateError) throw updateError;

          await supabase.from("card_events").insert({
            code_scanned: code,
            member_id: member.id,
            actor_id: scannedBy,
            action_type: "exit_scan",
            details: { device: userAgent },
          });

          await supabase.from("notifications").insert({
            title: "Saída registada",
            message: `Saída registada para ${member.full_name} (${member.member_number}).`,
            type: "exit",
            member_id: member.id,
          });
        } else {
          action = "entry";
          const { error: insertError } = await supabase.from("entries").insert({
            member_id: member.id,
            vehicle_id: vehicle.id,
            scanned_by: scannedBy,
            status: "inside",
            notes: `device=${userAgent}`,
          });

          if (insertError) throw insertError;

          await supabase.from("card_events").insert({
            code_scanned: code,
            member_id: member.id,
            actor_id: scannedBy,
            action_type: "entry_scan",
            details: { device: userAgent },
          });

          await supabase.from("notifications").insert({
            title: "Entrada registada",
            message: `Entrada registada para ${member.full_name} (${member.member_number}).`,
            type: "entry",
            member_id: member.id,
          });
        }

        const timestamp = options?.createdAt || new Date().toISOString();

        setLastResult({
          memberId: member.id,
          memberName: member.full_name,
          memberNumber: member.member_number,
          membershipStatus: member.membership_status,
          action,
          timestamp,
        });

        setScanning(false);
        sonnerToast.success(action === "entry" ? "Entrada registada." : "Saída registada.");
      } catch (err: any) {
        console.error("Erro ao processar leitura de QR", err);
        if (!navigator.onLine && !options?.fromQueue) {
          const queue = loadOfflineQueue();
          queue.push({
            code,
            scannedBy,
            createdAt: options?.createdAt || new Date().toISOString(),
            userAgent,
          });
          saveOfflineQueue(queue);
          setError("Sem ligação. Leitura guardada para sincronizar quando voltar a estar online.");
          sonnerToast("Leitura guardada para sincronizar quando estiver online.");
        } else {
          setError("Ocorreu um erro ao registar a leitura.");
          sonnerToast.error("Ocorreu um erro ao registar a leitura.");
        }
      } finally {
        setProcessing(false);
      }
    },
    [user]
  );

  const flushOfflineQueue = useCallback(async () => {
    if (!navigator.onLine) return;

    const queue = loadOfflineQueue();
    if (!queue.length) return;

    for (const item of queue) {
      await processScan(item.code, {
        fromQueue: true,
        scannedBy: item.scannedBy,
        createdAt: item.createdAt,
        userAgent: item.userAgent,
      });
    }

    saveOfflineQueue([]);
    sonnerToast.success("Leituras offline sincronizadas.");
  }, [processScan]);

  useEffect(() => {
    if (!authLoading && !roleLoading && user && canScan) {
      flushOfflineQueue();
    }
  }, [authLoading, roleLoading, user, canScan, flushOfflineQueue]);

  useEffect(() => {
    const handleOnline = () => {
      flushOfflineQueue();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [flushOfflineQueue]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-ocean">
        <p className="text-primary-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (!canScan) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="gradient-ocean shadow-ocean">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-primary-foreground">Leitor de QR Code</h1>
              <p className="text-xs text-primary-foreground/80">
                Apenas o pessoal de segurança ou administradores podem usar este módulo.
              </p>
            </div>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <Card className="max-w-md w-full shadow-ocean">
            <CardHeader>
              <CardTitle>Acesso não autorizado</CardTitle>
              <CardDescription>
                A sua conta não tem permissão para utilizar o leitor de QR Code.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span>Contacte um administrador se acha que isto é um erro.</span>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
              <h1 className="text-lg font-semibold text-primary-foreground">Leitor de QR Code</h1>
              <p className="text-xs text-primary-foreground/80">
                Aponte para o cartão do sócio para registar entrada ou saída automaticamente.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 grid gap-6 lg:grid-cols-[3fr,2fr]">
        <section className="relative rounded-xl overflow-hidden bg-black/90 flex flex-col">
          <div className="flex-1 flex items-center justify-center relative">
            {scanning ? (
              <div className="w-full max-w-xl aspect-[3/4] relative">
                <Scanner
                  constraints={{ facingMode: "environment" }}
                  onScan={(detected) => {
                    const code = detected?.[0]?.rawValue;
                    if (!processing && code) {
                      processScan(String(code));
                    }
                  }}
                  onError={(err) => {
                    console.error("QR scanner error", err);
                  }}
                  styles={{
                    container: { width: "100%", height: "100%" },
                    video: { width: "100%", height: "100%", objectFit: "cover" },
                  }}
                />

                <div className="pointer-events-none absolute inset-10 border-2 border-accent rounded-2xl shadow-glow" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center px-4 py-12">
                <div className="w-20 h-20 rounded-full gradient-sunset flex items-center justify-center shadow-glow mb-4">
                  <Camera className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-lg font-semibold mb-2">Pronto para ler QR Code</h2>
                <p className="text-sm text-muted-foreground mb-4 max-w-md">
                  Clique em "Ler QR do Sócio" para abrir a câmara. A leitura é automática e o sistema decide se é entrada ou saída.
                </p>
                <Button
                  variant="ocean"
                  size="lg"
                  onClick={() => {
                    setError(null);
                    setLastResult(null);
                    setScanning(true);
                  }}
                  disabled={processing}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Ler QR do Sócio
                </Button>
              </div>
            )}
          </div>
          {scanning && (
            <div className="p-3 text-center text-xs text-muted-foreground bg-background/80">
              A câmara está ativa. Aponte para o QR Code do cartão do sócio.
            </div>
          )}
        </section>

        <section>
          <Card className="shadow-ocean mb-4">
            <CardHeader>
              <CardTitle>Resultado da última leitura</CardTitle>
              <CardDescription>
                Veja o estado da leitura mais recente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {processing && (
                <p className="text-sm text-muted-foreground">A processar leitura...</p>
              )}

              {error && !processing && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
                  <XCircle className="w-4 h-4 text-destructive mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {lastResult && !processing && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Sócio</p>
                      <p className="font-semibold text-sm">{lastResult.memberName}</p>
                      <p className="text-xs text-muted-foreground">
                        Nº {lastResult.memberNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant="outline"
                        className={
                          lastResult.action === "entry"
                            ? "border-success/50 text-success bg-success/10"
                            : "border-warning/50 text-warning bg-warning/10"
                        }
                      >
                        {lastResult.action === "entry" ? "Entrada" : "Saída"}
                      </Badge>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {new Date(lastResult.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                    <div>
                      <p>
                        Ação registada em tempo real. Todas as leituras ficam guardadas no histórico do sistema.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!lastResult && !error && !processing && (
                <p className="text-sm text-muted-foreground">
                  Ainda não foi feita nenhuma leitura nesta sessão.
                </p>
              )}
            </CardContent>
          </Card>

          {(!scanning || lastResult || error) && (
            <Card className="shadow-ocean">
              <CardHeader>
                <CardTitle>Controlo de Acesso</CardTitle>
                <CardDescription>
                  Regras principais do leitor de QR Code.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <p>• O sistema decide automaticamente se é ENTRADA ou SAÍDA.</p>
                <p>• Cartões bloqueados são recusados e geram alerta imediato para a administração.</p>
                <p>• Leituras offline são guardadas e sincronizadas assim que houver ligação.</p>
                <p>• Apenas utilizadores com perfil de segurança ou administrador podem usar este módulo.</p>
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
};

export default QrScannerPage;
