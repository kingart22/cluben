import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users } from "lucide-react";

interface MemberRow {
  id: string;
  full_name: string;
  member_number: string;
  membership_status: "active" | "overdue" | "inactive";
}

const MembersList = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const loadMembers = async () => {
      setListLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from("members")
          .select("id, full_name, member_number, membership_status")
          .order("full_name", { ascending: true });

        if (error) throw error;
        setMembers((data as MemberRow[]) || []);
      } catch (err) {
        console.error("Erro ao carregar sócios", err);
        setError("Erro ao carregar a lista de sócios.");
      } finally {
        setListLoading(false);
      }
    };

    if (!loading && user) {
      loadMembers();
    }
  }, [user, loading]);

  if (loading || listLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Carregando sócios...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col items-center justify-start py-10">
      <main className="w-full max-w-5xl px-4 flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => navigate(-1)}
            >
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-foreground" />
              <h1 className="text-xl font-bold text-foreground">
                Sócios cadastrados
              </h1>
            </div>
          </div>
          <Button
            variant="ocean"
            size="sm"
            onClick={() => navigate("/members/new")}
          >
            Cadastrar novo sócio
          </Button>
        </div>

        <Card className="w-full shadow-ocean rounded-2xl border-border/70 bg-card">
          <CardHeader>
            <CardTitle>Lista de sócios</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <p className="text-sm text-destructive mb-3">{error}</p>
            )}

            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum sócio cadastrado até o momento.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/70 bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground/90">
                      <th className="py-3 pr-4 pl-4 text-left font-medium">Nº</th>
                      <th className="py-3 px-4 text-left font-medium">Nome</th>
                      <th className="py-3 px-4 text-left font-medium">Status</th>
                      <th className="py-3 pl-4 pr-4 text-right font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member, index) => (
                      <tr
                        key={member.id}
                        className="border-b border-border/50 last:border-0 even:bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 pr-4 pl-4 align-top text-muted-foreground text-xs font-medium">
                          {member.member_number}
                        </td>
                        <td className="py-3 px-4 align-top text-sm font-medium text-foreground">
                          {member.full_name}
                        </td>
                        <td className="py-3 px-4 align-top text-sm">
                          {member.membership_status === "active"
                            ? "Ativo"
                            : member.membership_status === "overdue"
                              ? "Em atraso"
                              : "Bloqueado"}
                        </td>
                        <td className="py-3 pl-4 pr-4 align-top text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              navigate(`/members/profile?memberId=${member.id}`)
                            }
                            className="rounded-full px-4 text-xs"
                          >
                            Ver perfil
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MembersList;
