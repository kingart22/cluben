import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Anchor, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MemberProfile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) return null;

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
                  Clube Náutico 1º de Agosto
                </h1>
                <Badge variant="secondary" className="text-xs">
                  Perfil de Sócios
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex flex-col gap-6">
        <Card className="shadow-ocean max-w-xl mx-auto w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Perfil de Sócio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Aqui será exibido o cartão digital oficial do sócio, com foto, número
              de sócio, estado do cartão e QR Code. Na próxima etapa vamos ligar
              este layout aos dados reais dos membros.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MemberProfile;
