import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Anchor } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type LoginMode = "staff" | "member";

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<LoginMode>("staff");
  const [email, setEmail] = useState("");
  const [memberNumber, setMemberNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/dashboard", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loginEmail = useMemo(() => {
    if (mode === "member") {
      return `${memberNumber.trim()}@clube.local`;
    }

    return email.trim().toLowerCase();
  }, [mode, email, memberNumber]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !loginEmail || (mode === "member" && !memberNumber.trim())) {
      toast.error("Preencha todos os campos.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error) throw error;
    } catch (err: any) {
      console.error("Erro ao fazer login:", err);
      toast.error(err?.message || "Erro ao fazer login. Verifique as credenciais.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Card className="border border-border/80 bg-card shadow-ocean">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Anchor className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl">Clube Náutico</CardTitle>
              <CardDescription>Acesse com segurança o seu painel</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-accent p-1">
              <Button
                type="button"
                variant={mode === "staff" ? "default" : "ghost"}
                size="sm"
                className="rounded-lg"
                onClick={() => setMode("staff")}
                disabled={loading}
              >
                Staff
              </Button>
              <Button
                type="button"
                variant={mode === "member" ? "default" : "ghost"}
                size="sm"
                className="rounded-lg"
                onClick={() => setMode("member")}
                disabled={loading}
              >
                Sócio
              </Button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {mode === "staff" ? (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="h-10 rounded-xl"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="memberNumber">Número de Sócio</Label>
                  <Input
                    id="memberNumber"
                    type="text"
                    placeholder="Ex: 123"
                    value={memberNumber}
                    onChange={(e) => setMemberNumber(e.target.value.replace(/\D/g, ""))}
                    disabled={loading}
                    className="h-10 rounded-xl"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-10 rounded-xl"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full rounded-xl">
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
