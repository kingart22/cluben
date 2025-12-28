import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";

const memberSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: "Nome muito curto" })
    .max(100, { message: "Nome muito longo" }),
});

const NewMember = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setAvatarFile(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setNameError(null);

    const parsed = memberSchema.safeParse({ fullName });
    if (!parsed.success) {
      setNameError(parsed.error.issues[0]?.message ?? "Nome inválido");
      return;
    }

    setSubmitting(true);

    try {
      // Buscar último número de sócio para gerar o próximo
      const { data: lastList, error: lastError } = await supabase
        .from("members")
        .select("member_number")
        .order("created_at", { ascending: false })
        .limit(1);

      if (lastError) throw lastError;

      let nextNumber = 1;
      const last = lastList?.[0]?.member_number as string | undefined;
      if (last) {
        const parsedNumber = parseInt(last, 10);
        if (!Number.isNaN(parsedNumber) && parsedNumber > 0) {
          nextNumber = parsedNumber + 1;
        }
      }

      const memberNumber = String(nextNumber);
      const qrCodeValue = `MEM-${memberNumber}-$${
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? (crypto as any).randomUUID()
          : Math.random().toString(36).slice(2)
      }`;

      // Inserir o membro primeiro (sem avatar)
      const { data: created, error: insertError } = await supabase
        .from("members")
        .insert({
          full_name: parsed.data.fullName,
          email: null,
          member_number: memberNumber,
          membership_status: "active",
          monthly_fee_amount: 0,
          qr_code: qrCodeValue,
        })
        .select("id, full_name, member_number, qr_code, avatar_url")
        .single();

      if (insertError || !created) throw insertError || new Error("Erro ao criar sócio");

      let avatarUrl = created.avatar_url as string | null;

      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${created.id}-${Date.now()}.${fileExt}`;
        const filePath = `${created.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(filePath);

        avatarUrl = publicUrl;

        const { error: updateError } = await supabase
          .from("members")
          .update({ avatar_url: publicUrl })
          .eq("id", created.id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Sócio cadastrado com sucesso",
        description: `Sócio ${parsed.data.fullName} criado com o número ${memberNumber}.`,
      });

      // Redirecionar para o perfil do sócio recém-criado se desejar, ou voltar ao dashboard
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Erro ao cadastrar sócio", error);
      toast({
        title: "Erro ao cadastrar sócio",
        description: error?.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start py-10">
      <main className="w-full max-w-3xl px-4 flex flex-col gap-6 items-center">
        <div className="w-full flex items-center gap-3 mb-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
          >
            Voltar
          </Button>
          <h1 className="text-xl font-bold text-foreground">
            Cadastro de novo sócio
          </h1>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Dados do sócio</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20 border-2 border-border">
                  <AvatarImage src={undefined} alt={fullName || "Novo sócio"} />
                  <AvatarFallback>{initials || "SC"}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground">
                    Foto do sócio (opcional)
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={submitting}
                    className="text-xs cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">
                  Nome completo
                </label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nome do sócio"
                  disabled={submitting}
                />
                {nameError && (
                  <span className="text-xs text-destructive">{nameError}</span>
                )}
              </div>

              <div className="flex justify-end mt-2">
                <Button type="submit" disabled={submitting || !fullName.trim()}>
                  {submitting ? "Cadastrando..." : "Cadastrar sócio"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default NewMember;
