import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import cardBackground from "@/assets/cartao-clube-oficial.png";
import clubeLogo from "@/assets/clube-logo.png";
import html2canvas from "html2canvas";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Member {
  id: string;
  full_name: string;
  email: string | null;
  member_number: string;
  membership_status: "active" | "overdue" | "inactive";
  qr_code: string;
  avatar_url: string | null;
}

interface EntryHistoryItem {
  id: string;
  entry_time: string;
  exit_time: string | null;
  status: "inside" | "outside";
  notes: string | null;
}

interface PaymentItem {
  id: string;
  payment_date: string;
  amount: number;
  payment_status: "pending" | "completed" | "cancelled";
  payment_method: string | null;
  payment_type: string;
  notes: string | null;
}

interface VehicleItem {
  id: string;
  member_id: string;
  vehicle_type: "jet_ski" | "boat";
  registration_number: string;
  brand: string | null;
  model: string | null;
  color: string | null;
}

const nameSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: "Nome muito curto" })
    .max(100, { message: "Nome muito longo" }),
});

const vehicleSchema = z.object({
  vehicleType: z.enum(["jet_ski", "boat"], {
    required_error: "Selecione o tipo de veículo",
  }),
  registrationNumber: z
    .string()
    .trim()
    .min(3, { message: "Matrícula muito curta" })
    .max(50, { message: "Matrícula muito longa" }),
  brand: z
    .string()
    .trim()
    .max(80, { message: "Marca muito longa" })
    .optional()
    .or(z.literal("")),
  model: z
    .string()
    .trim()
    .max(80, { message: "Modelo muito longo" })
    .optional()
    .or(z.literal("")),
  color: z
    .string()
    .trim()
    .max(50, { message: "Cor muito longa" })
    .optional()
    .or(z.literal("")),
});

const MemberProfile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const memberIdFromUrl = searchParams.get("memberId");

  const { data: userRole } = useUserRole();
  const { toast } = useToast();

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [localName, setLocalName] = useState("");
  const [member, setMember] = useState<Member | null>(null);
  const [memberLoading, setMemberLoading] = useState(true);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [entries, setEntries] = useState<EntryHistoryItem[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [accessPassword, setAccessPassword] = useState<string | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  const [vehicleFormId, setVehicleFormId] = useState<string | null>(null);
  const [vehicleType, setVehicleType] = useState<"jet_ski" | "boat" | "">("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [vehicleFormError, setVehicleFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const loadMember = async () => {
      // Se vier um memberId na URL, priorizar esse modo de visualização (admin vendo um sócio específico)
      if (memberIdFromUrl) {
        setMemberLoading(true);
        setMemberError(null);

        try {
          const { data, error } = await supabase
            .from("members")
            .select(
              "id, full_name, email, member_number, membership_status, qr_code, avatar_url",
            )
            .eq("id", memberIdFromUrl)
            .maybeSingle();

          if (error) throw error;
          if (!data) {
            setMember(null);
            setMemberError("Sócio não encontrado.");
            return;
          }

          setMember(data as Member);
          return;
        } catch (err) {
          console.error("Erro ao carregar sócio por ID", err);
          setMemberError("Erro ao carregar o perfil do sócio.");
        } finally {
          setMemberLoading(false);
        }

        return;
      }

      // Comportamento padrão: perfil do sócio logado, baseado no e-mail
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
  }, [user, loading, memberIdFromUrl]);

  useEffect(() => {
    const loadEntries = async () => {
      if (!member) return;

      setEntriesLoading(true);
      setEntriesError(null);

      try {
        const { data, error } = await supabase
          .from("entries")
          .select("id, entry_time, exit_time, status, notes")
          .eq("member_id", member.id)
          .order("entry_time", { ascending: false })
          .limit(20);

        if (error) throw error;
        setEntries((data as EntryHistoryItem[]) || []);
      } catch (err) {
        console.error("Erro ao carregar histórico de entradas", err);
        setEntriesError("Erro ao carregar histórico de entradas e saídas.");
      } finally {
        setEntriesLoading(false);
      }
    };

    loadEntries();
  }, [member]);

  useEffect(() => {
    const loadPayments = async () => {
      if (!member) return;

      setPaymentsLoading(true);
      setPaymentsError(null);

      try {
        const { data, error } = await supabase
          .from("payments")
          .select(
            "id, payment_date, amount, payment_status, payment_method, payment_type, notes",
          )
          .eq("member_id", member.id)
          .order("payment_date", { ascending: false })
          .limit(10);

        if (error) throw error;
        setPayments((data as PaymentItem[]) || []);
      } catch (err) {
        console.error("Erro ao carregar pagamentos", err);
        setPaymentsError("Erro ao carregar o resumo financeiro do sócio.");
      } finally {
        setPaymentsLoading(false);
      }
    };

    loadPayments();
  }, [member]);

  useEffect(() => {
    const loadVehicles = async () => {
      if (!member) return;

      setVehiclesLoading(true);
      setVehiclesError(null);

      try {
        const { data, error } = await supabase
          .from("vehicles")
          .select(
            "id, member_id, vehicle_type, registration_number, brand, model, color",
          )
          .eq("member_id", member.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setVehicles((data as VehicleItem[]) || []);
      } catch (err) {
        console.error("Erro ao carregar veículos do sócio", err);
        setVehiclesError("Erro ao carregar os veículos deste sócio.");
      } finally {
        setVehiclesLoading(false);
      }
    };

    loadVehicles();
  }, [member]);

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

  const handleDownloadJpg = async () => {
    if (!cardRef.current || !member) return;

    const canvas = await html2canvas(cardRef.current, {
      useCORS: true,
      scale: 4,
      backgroundColor: null,
    });

    const dataUrl = canvas.toDataURL("image/jpeg", 1.0);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `cartao-socio-${member.member_number}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMemberAccess = async () => {
    if (!member) return;

    setAccessLoading(true);
    setAccessError(null);
    setAccessPassword(null);

    try {
      const { data, error } = await supabase.functions.invoke("member-access", {
        body: { memberId: member.id, action: "generate" },
      });

      if (error) throw error;
      if (!data || !(data as any).password) {
        throw new Error("Resposta inválida da função de acesso");
      }

      setAccessPassword((data as any).password as string);
      setAccessModalOpen(true);
    } catch (err: any) {
      console.error("Erro ao gerar acesso do sócio", err);
      setAccessError(err?.message || "Erro ao gerar acesso do sócio.");
      setAccessModalOpen(true);
    } finally {
      setAccessLoading(false);
    }
  };

  const resetVehicleForm = () => {
    setVehicleFormId(null);
    setVehicleType("");
    setRegistrationNumber("");
    setBrand("");
    setModel("");
    setColor("");
    setVehicleFormError(null);
  };

  const handleSubmitVehicle = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!member) return;

    setVehicleFormError(null);

    const parsed = vehicleSchema.safeParse({
      vehicleType,
      registrationNumber,
      brand,
      model,
      color,
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Dados do veículo inválidos";
      setVehicleFormError(firstError);
      toast({
        title: "Erro ao guardar veículo",
        description: firstError,
        variant: "destructive",
      });
      return;
    }

    const payload = {
      member_id: member.id,
      vehicle_type: parsed.data.vehicleType,
      registration_number: parsed.data.registrationNumber.trim().toUpperCase(),
      brand: parsed.data.brand?.trim() || null,
      model: parsed.data.model?.trim() || null,
      color: parsed.data.color?.trim() || null,
    } as const;

    try {
      if (vehicleFormId) {
        const { error } = await supabase
          .from("vehicles")
          .update(payload)
          .eq("id", vehicleFormId);

        if (error) throw error;
        toast({
          title: "Veículo atualizado",
          description: "Os dados do veículo foram atualizados com sucesso.",
        });
      } else {
        const { error } = await supabase.from("vehicles").insert(payload);
        if (error) throw error;
        toast({
          title: "Veículo registado",
          description: "Veículo adicionado com sucesso para este sócio.",
        });
      }

      const { data: refreshed, error: refreshError } = await supabase
        .from("vehicles")
        .select(
          "id, member_id, vehicle_type, registration_number, brand, model, color",
        )
        .eq("member_id", member.id)
        .order("created_at", { ascending: false });

      if (refreshError) throw refreshError;
      setVehicles((refreshed as VehicleItem[]) || []);
      resetVehicleForm();
    } catch (err: any) {
      console.error("Erro ao guardar veículo", err);
      const message =
        err?.message || "Não foi possível guardar o veículo. Verifique as permissões.";
      setVehicleFormError(message);
      toast({
        title: "Erro ao guardar veículo",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleEditVehicle = (vehicle: VehicleItem) => {
    setVehicleFormId(vehicle.id);
    setVehicleType(vehicle.vehicle_type);
    setRegistrationNumber(vehicle.registration_number);
    setBrand(vehicle.brand ?? "");
    setModel(vehicle.model ?? "");
    setColor(vehicle.color ?? "");
    setVehicleFormError(null);
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

        {/* Formulário de edição de perfil (nome e foto) */}
        <section className="w-full grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start">
          <Card className="shadow-sm">
            <CardContent className="pt-6 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20 border-2 border-border">
                  <AvatarImage
                    src={member.avatar_url ?? undefined}
                    alt={member.full_name}
                  />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground">
                    Foto do sócio
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={avatarUploading}
                    className="text-xs cursor-pointer"
                  />
                  {avatarUploading && (
                    <span className="text-xs text-muted-foreground">
                      Enviando foto...
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <label className="text-sm font-medium text-foreground">
                  Nome completo
                </label>
                <Input
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  placeholder="Nome do sócio"
                  disabled={savingName}
                />
                {nameError && (
                  <span className="text-xs text-destructive">{nameError}</span>
                )}
              </div>

              <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                <span>
                  E-mail de acesso: <span className="font-medium">{member.email}</span>
                </span>
                <span>Nº do sócio: {member.member_number}</span>
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  type="button"
                  onClick={handleSaveName}
                  disabled={savingName || localName.trim().length === 0}
                >
                  {savingName ? "Salvando..." : "Salvar alterações"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={handlePrintCard}
              >
                Imprimir / PDF do cartão
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={handleDownloadJpg}
              >
                Baixar cartão em JPG
              </Button>
            </div>

            {/* Cartão físico com layout fornecido */}
            <section className="w-full flex justify-center px-0">
              <div
                ref={cardRef}
                className="relative mx-auto w-full max-w-[960px] aspect-[16/9] shadow-2xl rounded-md overflow-hidden bg-white"
                style={{
                  backgroundImage: `url(${cardBackground})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {/* Elementos dinâmicos seguindo exatamente o template do cartão */}
                <div className="absolute inset-0">
                  {/* Container interno com margem de segurança de 24px para todos os elementos */}
                  <div className="absolute inset-6" style={{ inset: "24px" }}>
                    <div className="relative w-full h-full">
                      {/* Círculo secundário (elemento visual de apoio) por baixo da foto */}
                      <div
                        className="absolute rounded-full bg-background/40 border border-background/60 z-0"
                        style={{
                          left: "10%",
                          top: "18%",
                          height: "24%", // ~519px em 2160px
                          aspectRatio: "1 / 1",
                        }}
                      />

                      {/* Foto do sócio em formato circular perfeito (1063 x 1063 px em 3840 x 2160) */}
                      <div
                        className="absolute rounded-full overflow-hidden bg-background/90 z-10"
                        style={{
                          left: "5.6%",
                          top: "21%",
                          height: "49.2%", // 1063 / 2160 ≈ 49.2% da altura do cartão
                          aspectRatio: "1 / 1",
                        }}
                      >
                        <Avatar className="w-full h-full border-none rounded-full">
                          <AvatarImage
                            src={member.avatar_url ?? undefined}
                            alt={member.full_name}
                          />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                      </div>

                      {/* Número e nome do sócio na base esquerda, dentro da área segura */}
                      <div
                        className="absolute flex flex-col gap-1 max-w-[60%] z-20"
                        style={{ left: "5.6%", bottom: "12%" }}
                      >
                        <span className="text-[0.7rem] md:text-xs font-bold tracking-wide text-foreground uppercase">
                          SÓCIO Nº {member.member_number}
                        </span>
                        <span className="text-xl md:text-2xl font-extrabold text-primary uppercase leading-tight break-words">
                          {member.full_name}
                        </span>
                      </div>

                      {/* QR Code posicionado com coordenadas absolutas relativas ao cartão (870px, 380px em 3840x2160) */}
                      <div
                        className="absolute flex items-center justify-center z-20"
                        style={{
                          left: "22.66%", // 870 / 3840 ≈ 22.66%
                          top: "17.59%", // 380 / 2160 ≈ 17.59%
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <div
                          className="bg-background rounded-2xl shadow-lg flex items-center justify-center"
                          style={{ width: "40px", height: "40px" }} // 160px / 4 (escala html2canvas)
                        >
                          <div className="w-full h-full flex items-center justify-center">
                            <QRCode
                              value={member.qr_code}
                              size={512}
                              level="M"
                              style={{ width: "100%", height: "100%" }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>

        {/* Acesso ao sistema do sócio */}
        <section className="w-full">
          <Card className="mt-4">
            <CardContent className="pt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-foreground">
                  Acesso ao sistema
                </h2>
                <p className="text-xs text-muted-foreground max-w-md">
                  Gere ou atualize o acesso deste sócio ao sistema usando o número
                  de sócio e uma senha.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ocean"
                  size="sm"
                  type="button"
                  disabled={accessLoading}
                  onClick={handleMemberAccess}
                >
                  {accessLoading ? "Gerando acesso..." : "Gerar acesso"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  disabled={accessLoading}
                  onClick={handleMemberAccess}
                >
                  Resetar senha
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Resumo financeiro do sócio */}
        <section className="w-full">
          <Card className="mt-2">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Resumo financeiro
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Últimos pagamentos registrados para este sócio.
                  </p>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-1 text-sm">
                  <span className="text-muted-foreground">
                    Total em aberto:
                    <span className="ml-1 font-semibold text-destructive">
                      {payments
                        .filter((p) => p.payment_status === "pending")
                        .reduce((sum, p) => sum + (p.amount || 0), 0)
                        .toLocaleString("pt-PT", {
                          style: "currency",
                          currency: "AOA",
                        })}
                    </span>
                  </span>
                  {payments.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Último pagamento em {" "}
                      {new Date(payments[0].payment_date).toLocaleDateString()}
                    </span>
                  )}
                  {paymentsLoading && (
                    <span className="text-xs text-muted-foreground">
                      Carregando...
                    </span>
                  )}
                </div>
              </div>

              {paymentsError && (
                <p className="text-sm text-destructive mb-3">{paymentsError}</p>
              )}

              {payments.length === 0 && !paymentsLoading ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum pagamento registrado para este sócio.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-xs text-muted-foreground">
                        <th className="py-2 pr-3 text-left font-medium">Data</th>
                        <th className="py-2 px-3 text-left font-medium">Tipo</th>
                        <th className="py-2 px-3 text-left font-medium">Método</th>
                        <th className="py-2 px-3 text-left font-medium">Valor</th>
                        <th className="py-2 px-3 text-left font-medium">Status</th>
                        <th className="py-2 pl-3 text-left font-medium">Comprovativo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr
                          key={payment.id}
                          className="border-b border-border/40 last:border-0"
                        >
                          <td className="py-2 pr-3 align-top">
                            {new Date(payment.payment_date).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 align-top">
                            <span className="text-muted-foreground">
                              {payment.payment_type}
                            </span>
                          </td>
                          <td className="py-2 px-3 align-top">
                            <span className="text-muted-foreground">
                              {payment.payment_method || "—"}
                            </span>
                          </td>
                          <td className="py-2 px-3 align-top font-medium">
                            {payment.amount.toLocaleString("pt-PT", {
                              style: "currency",
                              currency: "AOA",
                            })}
                          </td>
                          <td className="py-2 px-3 align-top">
                            <Badge
                              variant="outline"
                              className={
                                payment.payment_status === "completed"
                                  ? "border-success/60 text-success"
                                  : payment.payment_status === "pending"
                                    ? "border-warning/60 text-warning"
                                    : "border-muted-foreground/40 text-muted-foreground"
                              }
                            >
                              {payment.payment_status === "completed"
                                ? "Pago"
                                : payment.payment_status === "pending"
                                  ? "Pendente"
                                  : "Cancelado"}
                            </Badge>
                          </td>
                          <td className="py-2 pl-3 align-top">
                            {payment.payment_status === "completed" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setReceiptModalOpen(true);
                                }}
                              >
                                Ver comprovativo
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Modal de comprovativo de pagamento */}
        <Dialog
          open={receiptModalOpen && !!selectedPayment}
          onOpenChange={(open) => {
            if (!open) {
              setReceiptModalOpen(false);
              setSelectedPayment(null);
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader className="pb-2">
              <DialogTitle>Recibo de pagamento</DialogTitle>
              <DialogDescription>
                Comprovativo oficial de pagamento emitido pelo clube.
              </DialogDescription>
            </DialogHeader>

            {selectedPayment && (
              <div className="mt-2 rounded-md border border-border bg-background/60 text-sm shadow-sm">
                {/* Cabeçalho com logótipo e dados do clube */}
                <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={clubeLogo}
                      alt="Logótipo do clube"
                      className="h-10 w-10 rounded-full bg-background object-contain"
                    />
                    <div className="leading-tight">
                      <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                        Clube Náutico 1º de Agosto
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Recibo oficial de pagamento
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-muted-foreground">
                    <p className="font-medium text-foreground">
                      Recibo Nº {selectedPayment.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p>
                      Emitido em {new Date().toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Corpo do recibo */}
                <div className="space-y-3 px-4 py-3">
                  <div className="grid gap-2 text-xs sm:grid-cols-2">
                    <div>
                      <p className="font-semibold text-foreground">Dados do sócio</p>
                      <p className="text-muted-foreground">
                        {member?.full_name}
                      </p>
                      <p className="text-muted-foreground">
                        Sócio Nº {member?.member_number}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="font-semibold text-foreground">Dados do pagamento</p>
                      <p className="text-muted-foreground">
                        Data do pagamento: {""}
                        {new Date(selectedPayment.payment_date).toLocaleString()}
                      </p>
                      <p className="text-muted-foreground">
                        Tipo: {selectedPayment.payment_type}
                      </p>
                      <p className="text-muted-foreground">
                        Método: {selectedPayment.payment_method || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-1 rounded-md border border-border/70 bg-muted/40 px-4 py-3 text-xs">
                    <p className="font-semibold text-foreground">Valor pago</p>
                    <p className="text-lg font-bold text-success">
                      {selectedPayment.amount.toLocaleString("pt-PT", {
                        style: "currency",
                        currency: "AOA",
                      })}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Status: {" "}
                      {selectedPayment.payment_status === "completed"
                        ? "Pago"
                        : selectedPayment.payment_status === "pending"
                          ? "Pendente"
                          : "Cancelado"}
                    </p>
                  </div>

                  {selectedPayment.notes && (
                    <div className="rounded-md bg-muted/40 px-3 py-2 text-[11px]">
                      <p className="font-semibold text-foreground">Observações</p>
                      <p className="text-muted-foreground">{selectedPayment.notes}</p>
                    </div>
                  )}

                  <div className="pt-1 text-[10px] text-muted-foreground">
                    <p>
                      Este recibo comprova o pagamento registado no sistema em nome do sócio
                      acima identificado. Guarde este documento para eventuais conferências.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  window.print();
                }}
              >
                Imprimir / Guardar em PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>


        {/* Gestão de veículos do sócio (apenas administradores) */}
        {userRole === "admin" && (
          <section className="w-full">
            <Card className="mt-4">
              <CardContent className="pt-6 space-y-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      Veículos do sócio
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                      Registe e atualize os veículos deste sócio. A segurança usa
                      estas informações para associar corretamente as entradas e
                      saídas.
                    </p>
                  </div>
                  {vehiclesLoading && (
                    <span className="text-xs text-muted-foreground">
                      Carregando veículos...
                    </span>
                  )}
                </div>

                {vehiclesError && (
                  <p className="text-sm text-destructive">{vehiclesError}</p>
                )}

                <form
                  onSubmit={handleSubmitVehicle}
                  className="grid gap-3 md:grid-cols-[1.5fr_1.5fr_1.5fr_1.5fr_1fr] md:items-end"
                >
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-foreground">
                      Tipo de veículo
                    </label>
                    <Select
                      value={vehicleType || undefined}
                      onValueChange={(value) =>
                        setVehicleType(value as "jet_ski" | "boat")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jet_ski">Jet Ski</SelectItem>
                        <SelectItem value="boat">Embarcação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-foreground">
                      Matrícula / Registro
                    </label>
                    <Input
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      placeholder="Ex: ABC-1234"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-foreground">
                      Marca
                    </label>
                    <Input
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Ex: Yamaha"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-foreground">
                      Modelo
                    </label>
                    <Input
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="Modelo do veículo"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-foreground">
                      Cor
                    </label>
                    <Input
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="Ex: Azul"
                    />
                  </div>

                  <div className="md:col-span-5 flex flex-wrap items-center gap-2 pt-1">
                    {vehicleFormError && (
                      <span className="text-xs text-destructive flex-1">
                        {vehicleFormError}
                      </span>
                    )}
                    <div className="ml-auto flex gap-2">
                      {vehicleFormId && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={resetVehicleForm}
                        >
                          Cancelar edição
                        </Button>
                      )}
                      <Button type="submit" size="sm">
                        {vehicleFormId ? "Guardar alterações" : "Adicionar veículo"}
                      </Button>
                    </div>
                  </div>
                </form>

                <div className="mt-2">
                  {vehicles.length === 0 && !vehiclesLoading ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum veículo registado para este sócio.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/60 text-xs text-muted-foreground">
                            <th className="py-2 pr-3 text-left font-medium">Tipo</th>
                            <th className="py-2 px-3 text-left font-medium">
                              Matrícula / Registro
                            </th>
                            <th className="py-2 px-3 text-left font-medium">
                              Marca / Modelo
                            </th>
                            <th className="py-2 px-3 text-left font-medium">Cor</th>
                            <th className="py-2 pl-3 text-right font-medium">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vehicles.map((vehicle) => (
                            <tr
                              key={vehicle.id}
                              className="border-b border-border/40 last:border-0"
                            >
                              <td className="py-2 pr-3 align-top">
                                {vehicle.vehicle_type === "jet_ski"
                                  ? "Jet Ski"
                                  : "Embarcação"}
                              </td>
                              <td className="py-2 px-3 align-top font-medium">
                                {vehicle.registration_number}
                              </td>
                              <td className="py-2 px-3 align-top">
                                <span className="text-muted-foreground">
                                  {[vehicle.brand, vehicle.model]
                                    .filter(Boolean)
                                    .join(" • ") || "—"}
                                </span>
                              </td>
                              <td className="py-2 px-3 align-top">
                                <span className="text-muted-foreground">
                                  {vehicle.color || "—"}
                                </span>
                              </td>
                              <td className="py-2 pl-3 align-top text-right">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditVehicle(vehicle)}
                                >
                                  Editar
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Histórico de entradas e saídas */}
        <section className="w-full">
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-foreground">
                  Histórico de entradas e saídas
                </h2>
                {entriesLoading && (
                  <span className="text-xs text-muted-foreground">
                    Carregando...
                  </span>
                )}
              </div>

              {entriesError && (
                <p className="text-sm text-destructive mb-3">{entriesError}</p>
              )}

              {entries.length === 0 && !entriesLoading ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum registro de entrada ou saída encontrado para este sócio.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-xs text-muted-foreground">
                        <th className="py-2 pr-3 text-left font-medium">Entrada</th>
                        <th className="py-2 px-3 text-left font-medium">Saída</th>
                        <th className="py-2 px-3 text-left font-medium">Status</th>
                        <th className="py-2 pl-3 text-left font-medium">Observações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="border-b border-border/40 last:border-0"
                        >
                          <td className="py-2 pr-3 align-top">
                            {new Date(entry.entry_time).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 align-top">
                            {entry.exit_time
                              ? new Date(entry.exit_time).toLocaleString()
                              : "—"}
                          </td>
                          <td className="py-2 px-3 align-top">
                            <Badge
                              variant="outline"
                              className={
                                entry.status === "inside"
                                  ? "border-success/50 text-success"
                                  : "border-muted-foreground/40 text-muted-foreground"
                              }
                            >
                              {entry.status === "inside" ? "Dentro" : "Fora"}
                            </Badge>
                          </td>
                          <td className="py-2 pl-3 align-top max-w-xs">
                            <span className="line-clamp-2 text-muted-foreground">
                              {entry.notes || "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
        <Dialog open={accessModalOpen} onOpenChange={setAccessModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dados de acesso do sócio</DialogTitle>
              <DialogDescription>
                Copie os dados abaixo para entregar ao sócio. O login será feito com
                o <span className="font-semibold">número de sócio</span> e a senha
                definida para ele.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Número de sócio</span>
                <Input readOnly value={member.member_number} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Senha gerada</span>
                <Input
                  readOnly
                  value={accessPassword || "(sem senha gerada no momento)"}
                />
                {accessError && (
                  <span className="text-xs text-destructive">{accessError}</span>
                )}
                <div className="flex justify-end mt-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!accessPassword}
                    onClick={async () => {
                      if (!accessPassword) return;
                      try {
                        await navigator.clipboard.writeText(accessPassword);
                        console.log("Senha copiada para a área de transferência");
                      } catch (err) {
                        console.error("Falha ao copiar senha", err);
                      }
                    }}
                  >
                    Copiar senha
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default MemberProfile;
