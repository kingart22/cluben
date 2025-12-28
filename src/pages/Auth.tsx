import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Anchor, Waves } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      // Se o identificador não contém @, considera-se número de sócio e converte para email interno
      const loginEmail = identifier.includes("@")
        ? identifier
        : `${identifier}@clube.local`;

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
    <div className="min-h-screen flex items-center justify-center gradient-ocean relative overflow-hidden">
      {/* Animated waves background */}
      <div className="absolute inset-0 opacity-10">
        <Waves className="absolute top-10 left-10 w-32 h-32 animate-float" />
        <Waves className="absolute bottom-20 right-20 w-24 h-24 animate-float" style={{ animationDelay: "1s" }} />
        <Anchor className="absolute top-1/3 right-10 w-20 h-20 animate-wave" />
      </div>

      <div className="w-full max-w-md mx-4 relative z-10">
        <div className="bg-card shadow-float rounded-2xl p-8 border border-border/50">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-sunset mb-4 shadow-glow">
              <Anchor className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Clube Náutico</h1>
            <h2 className="text-xl font-semibold text-primary">1º de Agosto</h2>
            <p className="text-muted-foreground mt-2">Sistema de Gestão</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-sm font-medium">
                Email ou Número de Sócio
              </Label>
              <Input
                id="identifier"
                type="text"
                placeholder="email@exemplo.com ou 123"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
