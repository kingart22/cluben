import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Ship, DollarSign, AlertTriangle, Activity, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import NotificationsList from "./NotificationsList";
import RecentActivity from "./RecentActivity";
import { useNavigate } from "react-router-dom";
import DashboardShell from "./DashboardShell";

const AdminDashboard = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<{
    totalMembers: number;
    totalBoats: number;
    pendingPenalties: number;
    todayMovements: number;
  } | null>(null);

  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  useEffect(() => {
    const loadStatsAndEntries = async () => {
      const today = new Date().toISOString().split("T")[0];

      const [membersResult, vehiclesResult, pendingPenaltiesResult, todayEntriesResult] = await Promise.all([
        supabase.from("members").select("id", { count: "exact", head: true }),
        supabase.from("vehicles").select("id", { count: "exact", head: true }),
        supabase.from("penalties").select("id", { count: "exact", head: true }).eq("payment_status", "pending"),
        supabase.from("entries").select("id", { count: "exact", head: true }).gte("entry_time", today),
      ]);

      setStats({
        totalMembers: membersResult.count || 0,
        totalBoats: vehiclesResult.count || 0,
        pendingPenalties: pendingPenaltiesResult.count || 0,
        todayMovements: todayEntriesResult.count || 0,
      });

      const { data, error } = await supabase
        .from("entries")
        .select(`
          *,
          member:members(full_name, member_number),
          vehicle:vehicles(registration_number, vehicle_type)
        `)
        .order("entry_time", { ascending: false })
        .limit(10);

      if (!error && data) {
        setRecentEntries(data);
      }
    };

    loadStatsAndEntries();
  }, []);

  const summaryCards = [
    { title: "Total de Sócios", value: stats?.totalMembers || 0, icon: Users },
    { title: "Embarcações", value: stats?.totalBoats || 0, icon: Ship },
    { title: "Multas Pendentes", value: stats?.pendingPenalties || 0, icon: AlertTriangle },
    { title: "Movimentos Hoje", value: stats?.todayMovements || 0, icon: Activity },
  ];

  return (
    <DashboardShell
      roleLabel="Admin"
      onSignOut={signOut}
      menuItems={[
        { label: "Dashboard", to: "/dashboard", icon: Activity },
        { label: "Sócios", to: "/members", icon: Users },
        { label: "Novo Sócio", to: "/members/new", icon: Users },
        { label: "Scanner QR", to: "/security/qr/scan", icon: QrCode },
      ]}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <Card key={card.title} className="rounded-[14px] border-border bg-card shadow-ocean">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                  <span>{card.title}</span>
                  <card.icon className="h-4 w-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-foreground">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <RecentActivity entries={recentEntries} />
          </div>
          <NotificationsList />
        </div>

        <Card className="rounded-[14px] border-border bg-card shadow-ocean">
          <CardHeader>
            <CardTitle>Ações rápidas</CardTitle>
            <CardDescription>Operações administrativas mais usadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Button onClick={() => navigate("/members/new")}>Cadastrar Sócio</Button>
              <Button variant="secondary" onClick={() => navigate("/members")}>Ver Sócios</Button>
              <Button variant="secondary" onClick={() => navigate("/security/qr/scan")}>Scanner QR</Button>
              <Button variant="secondary">
                <DollarSign className="mr-2 h-4 w-4" />
                Financeiro
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
};

export default AdminDashboard;
