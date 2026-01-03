import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Anchor, LogOut, QrCode, Ship, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import RecentActivity from "./RecentActivity";

const SecurityDashboard = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [todayStats, setTodayStats] = useState<{
    todayEntries: number;
    todayExits: number;
    currentlyInside: number;
  } | null>(null);

  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const today = new Date().toISOString().split("T")[0];

      const [entriesResult, exitsResult, insideResult] = await Promise.all([
        supabase
          .from("entries")
          .select("id", { count: "exact", head: true })
          .gte("entry_time", today),
        supabase
          .from("entries")
          .select("id", { count: "exact", head: true })
          .gte("exit_time", today)
          .not("exit_time", "is", null),
        supabase
          .from("entries")
          .select("id", { count: "exact", head: true })
          .eq("status", "inside"),
      ]);

      setTodayStats({
        todayEntries: entriesResult.count || 0,
        todayExits: exitsResult.count || 0,
        currentlyInside: insideResult.count || 0,
      });

      const { data, error } = await supabase
        .from("entries")
        .select(`
          *,
          member:members(full_name, member_number),
          vehicle:vehicles(registration_number, vehicle_type)
        `)
        .order("entry_time", { ascending: false })
        .limit(8);

      if (!error && data) {
        setRecentEntries(data);
      }
    };

    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-ocean sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center shadow-glow">
              <Anchor className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Clube Náutico 1º de Agosto</h1>
              <Badge variant="secondary" className="text-xs uppercase tracking-wide">Segurança</Badge>
            </div>
          </div>
          <Button onClick={signOut} variant="secondary" size="sm" className="rounded-full px-4">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-ocean hover:shadow-float transition-all duration-300 border-l-4 border-l-success">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Entradas Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{todayStats?.todayEntries || 0}</div>
            </CardContent>
          </Card>

          <Card className="shadow-ocean hover:shadow-float transition-all duration-300 border-l-4 border-l-warning">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Saídas Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{todayStats?.todayExits || 0}</div>
            </CardContent>
          </Card>

          <Card className="shadow-ocean hover:shadow-float transition-all duration-300 border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Ship className="w-4 h-4" />
                Dentro do Clube
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{todayStats?.currentlyInside || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Scanner Action */}
        <Card className="shadow-float mb-8 border-t-4 border-t-accent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <QrCode className="w-6 h-6 text-accent" />
              Scanner QR Code
            </CardTitle>
            <CardDescription>Registrar entrada ou saída de veículo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                variant="ocean"
                size="lg"
                className="flex-1"
                onClick={() => navigate("/security/qr/scan")}
              >
                <QrCode className="w-5 h-5 mr-2" />
                Ler QR do Sócio
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <RecentActivity entries={recentEntries || []} />
      </main>
    </div>
  );
};

export default SecurityDashboard;
