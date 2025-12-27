import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Anchor, Waves } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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

          <SupabaseAuth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: "hsl(208 85% 35%)",
                    brandAccent: "hsl(208 75% 55%)",
                    brandButtonText: "white",
                    inputBackground: "white",
                    inputBorder: "hsl(213 20% 88%)",
                    inputBorderFocus: "hsl(208 85% 35%)",
                    inputBorderHover: "hsl(208 75% 55%)",
                  },
                },
              },
              className: {
                container: "space-y-4",
                button: "!bg-primary hover:!bg-primary-light !transition-all !duration-300",
                input: "!rounded-md",
              },
            }}
            providers={[]}
            redirectTo={`${window.location.origin}/dashboard`}
            localization={{
              variables: {
                sign_in: {
                  email_label: "Email",
                  password_label: "Senha",
                  button_label: "Entrar",
                  loading_button_label: "Entrando...",
                  social_provider_text: "Entrar com {{provider}}",
                  link_text: "Já tem uma conta? Entre",
                },
                sign_up: {
                  email_label: "Email",
                  password_label: "Senha",
                  button_label: "Registrar",
                  loading_button_label: "Registrando...",
                  social_provider_text: "Registrar com {{provider}}",
                  link_text: "Não tem uma conta? Registre-se",
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Auth;
