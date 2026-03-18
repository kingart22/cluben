import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, Ship, Activity, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import RecentActivity from "./RecentActivity";
import DashboardShell from "./DashboardShell";

const SecurityDashboard = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [todayStats, setTodayStats] = useState<{
    departures: number;
    arrivals: number;
    inNavigation: number;
  } | null>(null);

  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const today = new Date().toISOString().split("T")[0];

      const [entriesResult, exitsResult, insideResult] = await Promise.all([
        supabase.from("entries").select("id", { count: "exact", head: true }).gte("entry_time", today),
        supabase
          .from("entries")
          .select("id", { count: "exact", head: true })
          .gte("exit_time", today)
          .not("exit_time", "is", null),
        supabase.from("entries").select("id", { count: "exact", head: true }).eq("status", "inside"),
      ]);

      setTodayStats({
        departures: entriesResult.count || 0,
        arrivals: exitsResult.count || 0,
        inNavigation: insideResult.count || 0,
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
    <DashboardShell
      roleLabel="Segurança"
      onSignOut={signOut}
      menuItems={[
        { label: "Dashboard", to: "/dashboard", icon: Activity },
        { label: "Scanner QR", to: "/security/qr/scan", icon: QrCode },
        { label: "Validação", to: "/security/qr/validate", icon: Ship },
      ]}
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <Card className="rounded-2xl border-border/70 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Saídas hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-foreground">{todayStats?.departures || 0}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/70 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Chegadas hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-foreground">{todayStats?.arrivals || 0}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/70 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Em navegação</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-foreground">{todayStats?.inNavigation || 0}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border-border/70 bg-card">
          <CardHeader>
            <CardTitle>Painel rápido da segurança</CardTitle>
            <CardDescription>Operação objetiva para saída e chegada</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Button size="lg" className="h-16 text-base" onClick={() => navigate("/security/qr/scan")}>
                <ArrowUpRight className="mr-2 h-5 w-5" />
                SAÍDA
              </Button>
              <Button variant="secondary" size="lg" className="h-16 text-base" onClick={() => navigate("/security/qr/validate")}>
                <ArrowDownLeft className="mr-2 h-5 w-5" />
                CHEGADA
              </Button>
              <Button variant="secondary" size="lg" className="h-16 text-base" onClick={() => navigate("/security/qr/scan")}>
                <QrCode className="mr-2 h-5 w-5" />
                SCANNER QR
              </Button>
            </div>
          </CardContent>
        </Card>

        <RecentActivity entries={recentEntries} />
      </div>
    </DashboardShell>
  );
};

export default SecurityDashboard;
